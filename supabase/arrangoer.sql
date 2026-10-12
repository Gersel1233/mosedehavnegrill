-- ============================================================
--  ARRANGØREN — EN ROLLE, DER KUN MÅ ARRANGEMENTERNE  (12. okt 2026)
--  ------------------------------------------------------------
--  Chefens ord: *"Er der lavet en gruppe på hjemmesiden, hvor vores
--  event-arrangør kan gå ind og lægge alle vores events ind på?"*
--  Mikkels svar på spørgsmålene 12/10: stederne er "de 4 der eller
--  alle sammen, sådan hele havnecaféen — men de kan lave navnene
--  om", "arrangøren må godt udgive selv", "venteliste ja".
--
--  Filen gør fem ting:
--    1) ROLLEN 'arrangoer' i admin_adgang. is_admin_for() og
--       is_admin() siger NEJ til den — og dermed alle 18 tabellers
--       politikker på én gang (bestillinger, salg, borde, gæster).
--       kan_arrangere_for() siger ja til alle aktive roller.
--    2) STEDERNE på havnen som en tabel, så navnene kan rettes, og
--       et arrangement følger med, når et sted skifter navn.
--    3) KALENDERENS NYE KOLONNER: sted, aflyst, venteliste, max pr.
--       tilmelding, frist, "book bord", serie, hvem der skrev.
--    4) BREMSEN for tilmeldinger kender dem alle — databasen skal
--       afvise alt det, siden afviser (LAERT-AF-SPIIS.md nr. 1).
--    5) ET ARRANGEMENT MED TILMELDTE KAN IKKE SLETTES. Før slettede
--       "Slet" hele gæstelisten med via `on delete cascade`, uden at
--       bekræftelsen nævnte den. Nu aflyses det i stedet.
--
--  ⚠️ KØRES EFTER gaestens-regler.sql (og alt andet). Den skriver
--  reservation_bremse() om; kører nogen gaestens-regler.sql eller
--  arrangement-sluttid.sql igen, skal DEN HER køres igen bagefter —
--  ellers forsvinder venteliste, frist, aflysning og max. Står i
--  docs/SQL-RAEKKEFOELGE.md.
--
--  Kan køres igen. Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
--  Prøven er supabase/proev-arrangoer.sql.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) ROLLEN
-- ------------------------------------------------------------
alter table public.admin_adgang drop constraint if exists adgang_rolle_ok;
alter table public.admin_adgang
  add constraint adgang_rolle_ok check (rolle in ('ejer', 'medarbejder', 'arrangoer'));

comment on column public.admin_adgang.rolle is
  'ejer = hele forretningen. medarbejder = dagen. arrangoer = kun arrangementerne og deres tilmeldinger. Standard er ejer, så en migrering aldrig tager rettigheder fra nogen.';

/* ⚠️ is_admin_for ER DØREN TIL ALT. Den bruges af hver eneste
   politik i de 18 tabeller (roller.sql). En arrangør, der slap
   igennem den, kunne læse hver bestilling, hvert telefonnummer og
   hvert salg — og skjulte faner i admin er pynt (personale.js).
   Derfor står udelukkelsen HER og ikke i fanerne. */
create or replace function public.is_admin_for(lok text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_adgang a
    where a.lokation_id = lok
      and a.email = coalesce(auth.jwt() ->> 'email', '')
      and a.aktiv
      and a.rolle <> 'arrangoer'
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_adgang a
    where a.email = coalesce(auth.jwt() ->> 'email', '')
      and a.aktiv
      and a.rolle <> 'arrangoer'
  );
$$;

/* "Må du lægge arrangementer ind her?" Ja for alle tre roller —
   chefen og personalet skal stadig kunne det, de kunne i går. */
create or replace function public.kan_arrangere_for(lok text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_adgang a
    where a.lokation_id = lok
      and a.email = coalesce(auth.jwt() ->> 'email', '')
      and a.aktiv
  );
$$;

create or replace function public.kan_arrangere() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_adgang a
    where a.email = coalesce(auth.jwt() ->> 'email', '')
      and a.aktiv
  );
$$;

/* Admin spørger "hvem er jeg?" og viser fanerne derefter. Har en
   person flere rækker, vinder den største rolle. */
create or replace function public.min_rolle() returns text
language sql stable security definer set search_path = ''
as $$
  select a.rolle from public.admin_adgang a
   where a.email = coalesce(auth.jwt() ->> 'email', '') and a.aktiv
   order by case a.rolle when 'ejer' then 0 when 'medarbejder' then 1 else 2 end
   limit 1;
$$;

revoke all on function public.kan_arrangere_for(text) from public;
revoke all on function public.kan_arrangere() from public;
grant execute on function public.kan_arrangere_for(text) to authenticated;
grant execute on function public.kan_arrangere() to authenticated;


-- ------------------------------------------------------------
-- 2) STEDERNE PÅ HAVNEN
--    En tabel og ikke en tekst på arrangementet: Mikkel 12/10, "de
--    kan lave navnene om". Retter man "Terrassen" til "Træterrassen",
--    følger hvert arrangement på den med — også dem, der allerede er
--    udgivet. Et sted slettes ikke; det skjules (aktiv), så et
--    arrangement fra sidste år stadig kan sige, hvor det var.
-- ------------------------------------------------------------
create table if not exists public.arrangement_steder (
  id          bigint generated always as identity primary key,
  lokation_id text not null default 'mosede' references public.lokationer(id),
  navn        text not null,
  /* Konflikttjekket i admin: et arrangement i baglokalet på en dag,
     hvor baglokalet er udlejet, skal sige fra. Et flag og ikke et
     navn — navnet kan rettes. */
  baglokale   boolean not null default false,
  /* "Hele havnecaféen" rammer alle de andre steder på én gang. */
  hele_stedet boolean not null default false,
  sortering   int not null default 0,
  aktiv       boolean not null default true,
  oprettet    timestamptz not null default now(),
  constraint sted_navn_ok check (char_length(btrim(navn)) between 1 and 60)
);

create unique index if not exists arrangement_steder_navn_unik
  on public.arrangement_steder (lokation_id, lower(btrim(navn)));

alter table public.arrangement_steder enable row level security;

/* Navnene er offentlige — de står på hjemmesiden ved hvert
   arrangement. Også de skjulte: et gammelt arrangement viser stadig,
   hvor det var. */
drop policy if exists steder_laes_alle on public.arrangement_steder;
create policy steder_laes_alle on public.arrangement_steder
  for select using (true);

drop policy if exists steder_opret on public.arrangement_steder;
create policy steder_opret on public.arrangement_steder
  for insert to authenticated with check (public.kan_arrangere_for(lokation_id));

drop policy if exists steder_ret on public.arrangement_steder;
create policy steder_ret on public.arrangement_steder
  for update to authenticated
  using (public.kan_arrangere_for(lokation_id))
  with check (public.kan_arrangere_for(lokation_id));

/* Ingen slet-politik: et sted skjules. */

grant select on public.arrangement_steder to anon, authenticated;
grant insert, update on public.arrangement_steder to authenticated;

/* De fem fra 12/10 — kun hvis forretningen ingen steder har endnu, så
   en ny kørsel ikke lægger dem ind igen oven i ejerens rettelser. */
insert into public.arrangement_steder (lokation_id, navn, baglokale, hele_stedet, sortering)
select 'mosede', s.navn, s.bag, s.hele, s.nr
  from (values ('Hele havnecaféen', false, true, 1),
               ('Terrassen',        false, false, 2),
               ('Indenfor',         false, false, 3),
               ('Baglokalet',       true,  false, 4),
               ('Molen',            false, false, 5)) as s(navn, bag, hele, nr)
 where exists (select 1 from public.lokationer where id = 'mosede')
   and not exists (select 1 from public.arrangement_steder where lokation_id = 'mosede');


-- ------------------------------------------------------------
-- 3) KALENDERENS NYE KOLONNER
-- ------------------------------------------------------------
alter table public.kalender add column if not exists sted_id bigint
  references public.arrangement_steder(id) on delete restrict;
alter table public.kalender add column if not exists aflyst boolean not null default false;
alter table public.kalender add column if not exists aflyst_tekst text;
alter table public.kalender add column if not exists venteliste boolean not null default false;
alter table public.kalender add column if not exists max_pr_tilmelding int;
alter table public.kalender add column if not exists tilmelding_lukker_timer int;
alter table public.kalender add column if not exists bord_booking boolean not null default false;
alter table public.kalender add column if not exists serie uuid;
alter table public.kalender add column if not exists oprettet_af text;
alter table public.kalender add column if not exists aendret_af text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'kalender_aflyst_tekst_ok') then
    alter table public.kalender add constraint kalender_aflyst_tekst_ok
      check (aflyst_tekst is null or char_length(aflyst_tekst) <= 300);
  end if;
  /* 100 er telefonfeltets loft i admin og tilmeldingens loft nedenfor —
     to tal for det samme var en af fejlene, kortlægningen fandt 12/10. */
  if not exists (select 1 from pg_constraint where conname = 'kalender_max_pr_tilmelding_ok') then
    alter table public.kalender add constraint kalender_max_pr_tilmelding_ok
      check (max_pr_tilmelding is null or max_pr_tilmelding between 1 and 100);
  end if;
  /* Fra "ved start" (0) til en uge før. */
  if not exists (select 1 from pg_constraint where conname = 'kalender_frist_ok') then
    alter table public.kalender add constraint kalender_frist_ok
      check (tilmelding_lukker_timer is null or tilmelding_lukker_timer between 0 and 168);
  end if;
  /* "Book bord" ER svaret på "hvordan kommer jeg med" — sammen med
     en tilmelding ville gæsten få to knapper, der siger hver sit. */
  if not exists (select 1 from pg_constraint where conname = 'kalender_bord_eller_tilmelding') then
    alter table public.kalender add constraint kalender_bord_eller_tilmelding
      check (not (bord_booking and tilmelding));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'kalender_venteliste_kraever_tilmelding') then
    alter table public.kalender add constraint kalender_venteliste_kraever_tilmelding
      check (not venteliste or tilmelding);
  end if;
end $$;

comment on column public.kalender.sted_id is 'Hvor på havnen. Tom = ikke sagt.';
comment on column public.kalender.aflyst is 'Aflyst står stadig på siden — med ordet Aflyst — og listen over tilmeldte bliver stående, så nogen kan ringe rundt.';
comment on column public.kalender.venteliste is 'Er der udsolgt, kommer gæsten på venteliste i stedet for et nej. Personalet ringer, når en plads bliver ledig.';
comment on column public.kalender.max_pr_tilmelding is 'Flest personer på én tilmelding. Tom = 20, som før 12/10.';
comment on column public.kalender.tilmelding_lukker_timer is 'Tilmeldingen lukker så mange timer før start. Tom = åben til arrangementet slutter, som før.';
comment on column public.kalender.bord_booking is 'Knappen er "Book bord" (bord/ med dagen valgt) i stedet for en tilmelding.';
comment on column public.kalender.serie is 'Arrangementer lavet med "Gentag" deler et id. Hvert kan rettes for sig.';

/* HVEM SKREV DET — sat af serveren, ikke af browseren. Og stedet
   skal høre til samme forretning: et id fra en anden lokation ville
   vise en fremmed adresse ved arrangementet. */
create or replace function public.kalender_arrangoer_vaern()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  hvem text := nullif(auth.jwt() ->> 'email', '');
begin
  if tg_op = 'INSERT' then
    new.oprettet_af := coalesce(hvem, new.oprettet_af);
    new.aendret_af  := coalesce(hvem, new.aendret_af);
  else
    new.oprettet_af := old.oprettet_af;
    new.aendret_af  := coalesce(hvem, new.aendret_af);
    new.aendret     := now();
  end if;

  if new.sted_id is not null and not exists (
       select 1 from public.arrangement_steder s
        where s.id = new.sted_id and s.lokation_id = new.lokation_id) then
    raise exception 'sted_findes_ikke';
  end if;

  /* Aflyst uden tilmelding: et aflyst arrangement tager ikke imod
     nogen. Bremsen siger det også, men en aflyst række med en åben
     tilmelding ville stå forkert i admin. */
  return new;
end $function$;

drop trigger if exists kalender_arrangoer_vaern on public.kalender;
create trigger kalender_arrangoer_vaern
  before insert or update on public.kalender
  for each row execute function public.kalender_arrangoer_vaern();

/* ⚠️ ET ARRANGEMENT MED TILMELDTE SLETTES IKKE (12/10). Det gælder
   også chefen: "Slet" tog gæstelisten med i stilhed. Aflys det, eller
   afvis de tilmeldte først — så er der et spor af, hvem der skulle
   have været der. */
create or replace function public.kalender_slet_vaern()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if old.type = 'arrangement' and exists (
       select 1 from public.reservationer r
        where r.kalender_id = old.id
          and r.slettet is null
          and r.status <> 'afvist') then
    raise exception 'arrangement_har_tilmeldte';
  end if;
  return old;
end $function$;

drop trigger if exists kalender_slet_vaern on public.kalender;
create trigger kalender_slet_vaern
  before delete on public.kalender
  for each row execute function public.kalender_slet_vaern();


-- ------------------------------------------------------------
-- 3b) KALENDERENS ADGANG: ARRANGØREN MÅ ARRANGEMENTERNE — IKKE
--     LUKKEDAGENE. En arrangør, der kunne lukke caféen, ville kunne
--     lukke køkkenet en lørdag. `with check` på type, så et
--     arrangement heller ikke kan rettes OM til en lukkedag.
-- ------------------------------------------------------------
drop policy if exists kalender_laes_admin on public.kalender;
create policy kalender_laes_admin on public.kalender
  for select using (public.is_admin_for(lokation_id)
                    or (type = 'arrangement' and public.kan_arrangere_for(lokation_id)));

drop policy if exists kalender_opret_admin on public.kalender;
create policy kalender_opret_admin on public.kalender
  for insert with check (public.is_admin_for(lokation_id)
                         or (type = 'arrangement' and public.kan_arrangere_for(lokation_id)));

drop policy if exists kalender_ret_admin on public.kalender;
create policy kalender_ret_admin on public.kalender
  for update using (public.is_admin_for(lokation_id)
                    or (type = 'arrangement' and public.kan_arrangere_for(lokation_id)))
  with check (public.is_admin_for(lokation_id)
              or (type = 'arrangement' and public.kan_arrangere_for(lokation_id)));

drop policy if exists kalender_slet_admin on public.kalender;
create policy kalender_slet_admin on public.kalender
  for delete using (public.is_admin_for(lokation_id)
                    or (type = 'arrangement' and public.kan_arrangere_for(lokation_id)));


-- ------------------------------------------------------------
-- 4) TILMELDINGERNE
-- ------------------------------------------------------------
/* Ventelisten er en status. Den tæller ikke som en plads. */
alter table public.reservationer drop constraint if exists reservation_status_ok;
alter table public.reservationer add constraint reservation_status_ok
  check (status in ('ny', 'bekraeftet', 'afvist', 'udeblevet', 'venteliste'));

/* Loftet på én tilmelding er arrangementets eget nu (max_pr_tilmelding,
   tom = 20 som før) — bremsen håndhæver det. Kolonnens loft er 100,
   det samme som telefonfeltet i admin. */
alter table public.reservationer drop constraint if exists reservation_antal_ok;
alter table public.reservationer add constraint reservation_antal_ok
  check (antal_personer between 1 and 100);

/* Gæsten må sende 'ny' eller 'venteliste' — bremsen bestemmer, hvad
   det BLIVER (en ledig plads giver 'ny', uanset hvad der blev sendt).
   ⚠️ with check måles EFTER before-udløseren: uden 'venteliste' her
   ville bremsens egen venteliste-række blive afvist af politikken. */
drop policy if exists reservationer_opret_gaest on public.reservationer;
create policy reservationer_opret_gaest on public.reservationer
  for insert to anon, authenticated
  with check (status in ('ny', 'venteliste') and intern_note is null and slettet is null);

drop policy if exists reservationer_laes_admin on public.reservationer;
create policy reservationer_laes_admin on public.reservationer
  for select using (public.kan_arrangere_for(lokation_id));

drop policy if exists reservationer_ret_admin on public.reservationer;
create policy reservationer_ret_admin on public.reservationer
  for update using (public.kan_arrangere_for(lokation_id))
  with check (public.kan_arrangere_for(lokation_id));

/* Sletning er stadig kun personalets — admin sletter ikke
   tilmeldinger, den afviser dem. */
drop policy if exists reservationer_slet_admin on public.reservationer;
create policy reservationer_slet_admin on public.reservationer
  for delete using (public.is_admin_for(lokation_id));

/* Pladserne, gæsten ser: ventelisten tæller ikke. STADIG fire
   kolonner — prøve 8 i proev-arrangementer.sql tæller dem. */
create or replace view public.arrangement_pladser
with (security_invoker = false) as
  select k.id            as kalender_id,
         k.lokation_id,
         k.pladser,
         coalesce(sum(r.antal_personer) filter (
           where r.slettet is null and r.status not in ('afvist', 'venteliste')), 0)::int as optaget
    from public.kalender k
    left join public.reservationer r on r.kalender_id = k.id
   where k.type = 'arrangement'
     and k.offentlig
     and k.tilmelding
   group by k.id, k.lokation_id, k.pladser;

grant select on public.arrangement_pladser to anon, authenticated;

/* BREMSEN. Rækkefølgen er gæstens: findes det → er det aflyst → tager
   det imod → er det forbi → er fristen gået → for mange på én →
   er der plads (ellers venteliste) → spam.
   ⚠️ FOR UPDATE først (15/9): to på den sidste plads i samme sekund. */
create or replace function public.reservation_bremse()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  arr        public.kalender%rowtype;
  optaget    int;
  fra_nummer int;
  paa_stedet int;
  start_ts   timestamptz;
  i_dag      date := (now() at time zone 'Europe/Copenhagen')::date;
  personale  boolean := public.kan_arrangere_for(new.lokation_id);
begin
  select * into arr from public.kalender k where k.id = new.kalender_id for update;

  if arr.id is null or not arr.offentlig then
    raise exception 'reservation_findes_ikke';
  end if;

  /* Aflyst er aflyst — også en formular, der har stået åben siden i
     går. */
  if arr.aflyst then
    raise exception 'reservation_aflyst';
  end if;

  if not arr.tilmelding then
    raise exception 'reservation_lukket';
  end if;

  /* ⚠️ DANSK DATO (12/10). current_date er UTC: mellem midnat og kl. 2
     om sommeren var "i dag" stadig i går, og gårsdagens arrangement
     tog imod. */
  if coalesce(arr.slut_dato, arr.dato) < i_dag then
    raise exception 'reservation_overstaaet';
  end if;

  if arr.slut_kl is not null
     and coalesce(arr.slut_dato, arr.dato) = i_dag
     and (now() at time zone 'Europe/Copenhagen')::time > arr.slut_kl then
    raise exception 'reservation_overstaaet';
  end if;

  /* FRISTEN: "tilmelding lukker 3 timer før". Regnet fra starten i
     dansk tid; uden et klokkeslæt fra dagens begyndelse. */
  if arr.tilmelding_lukker_timer is not null then
    start_ts := (arr.dato + coalesce(arr.start_kl, time '00:00')) at time zone 'Europe/Copenhagen';
    if now() > start_ts - make_interval(hours => arr.tilmelding_lukker_timer) then
      raise exception 'reservation_frist';
    end if;
  end if;

  /* Et selskab på tredive til en koncert er en aftale, ikke en
     tilmelding (30/8). Loftet er arrangementets eget nu; tomt = 20.
     Personalet, der tager en aftale i telefonen, må gerne skrive
     flere — det er dem, der har sagt ja til den. */
  if not personale and new.antal_personer > coalesce(arr.max_pr_tilmelding, 20) then
    raise exception 'reservation_for_mange';
  end if;

  /* PLADSERNE. Kun det, der ikke er afvist, slettet eller på
     venteliste, tæller. Udeblevne tæller med. Er der fuldt, og har
     arrangementet venteliste, kommer gæsten på den i stedet for et
     nej — og en ledig plads giver en plads, uanset hvad browseren
     sendte. */
  new.status := 'ny';
  if arr.pladser is not null then
    select coalesce(sum(r.antal_personer), 0) into optaget
      from public.reservationer r
     where r.kalender_id = new.kalender_id
       and r.slettet is null
       and r.status not in ('afvist', 'venteliste');

    if optaget + new.antal_personer > arr.pladser then
      if arr.venteliste then
        new.status := 'venteliste';
      else
        raise exception 'reservation_udsolgt';
      end if;
    end if;
  end if;

  /* Hvad en browser kan gøre én gang, kan et script gøre ti tusind
     gange. Personalet er ikke et script — en aften med telefonen i
     hånden er ikke spam. */
  if not personale then
    select count(*) into fra_nummer
      from public.reservationer r
     where r.telefon = new.telefon
       and r.oprettet > now() - interval '24 hours';
    if fra_nummer >= 5 then
      raise exception 'reservation_bremse_nummer';
    end if;

    select count(*) into paa_stedet
      from public.reservationer r
     where r.lokation_id = new.lokation_id
       and r.oprettet > now() - interval '1 hour';
    if paa_stedet >= 60 then
      raise exception 'reservation_bremse_travlt';
    end if;
  end if;

  return new;
end $function$;

/* RYK OP FRA VENTELISTEN — og ret antallet — uden at gå over loftet.
   Bremsen ovenfor ser kun nye tilmeldinger; en rettelse, der får en
   række til at tælle (eller tælle mere), skal under den samme lås og
   den samme regel. */
create or replace function public.reservation_ret_vaern()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  arr        public.kalender%rowtype;
  optaget    int;
  taeller_nu  boolean := new.slettet is null and new.status not in ('afvist', 'venteliste');
  taelte_foer boolean := old.slettet is null and old.status not in ('afvist', 'venteliste');
begin
  if not taeller_nu then
    return new;
  end if;
  if taelte_foer and new.antal_personer <= old.antal_personer then
    return new;
  end if;

  select * into arr from public.kalender k where k.id = new.kalender_id for update;
  if arr.pladser is null then
    return new;
  end if;

  select coalesce(sum(r.antal_personer), 0) into optaget
    from public.reservationer r
   where r.kalender_id = new.kalender_id
     and r.id <> new.id
     and r.slettet is null
     and r.status not in ('afvist', 'venteliste');

  if optaget + new.antal_personer > arr.pladser then
    raise exception 'reservation_udsolgt';
  end if;
  return new;
end $function$;

drop trigger if exists reservation_ret_vaern on public.reservationer;
create trigger reservation_ret_vaern
  before update on public.reservationer
  for each row execute function public.reservation_ret_vaern();


-- ------------------------------------------------------------
-- 5) BILLEDERNE — arrangøren må lægge arrangementets billede op.
--    is_admin() siger nej til hende nu (punkt 1), og billederne
--    ligger i spanden 'nyheder' (nyheder-slags-og-billede.sql). Kun
--    hvis storage findes — en lokal Postgres har det ikke.
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'storage.objects findes ikke her — billedreglerne springes over.';
    return;
  end if;

  execute $r$drop policy if exists "arrangoer_billeder_skriv" on storage.objects$r$;
  execute $r$
    create policy "arrangoer_billeder_skriv" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'nyheder' and public.kan_arrangere())
  $r$;

  execute $r$drop policy if exists "arrangoer_billeder_ret" on storage.objects$r$;
  execute $r$
    create policy "arrangoer_billeder_ret" on storage.objects
      for update to authenticated
      using (bucket_id = 'nyheder' and public.kan_arrangere())
  $r$;
end $$;

commit;

/* Supabases SQL Editor viser kun den SIDSTE sætnings svar. */
select
  (select count(*) from public.arrangement_steder where lokation_id = 'mosede') as steder_hos_mosede,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'kalender'
      and column_name in ('sted_id', 'aflyst', 'aflyst_tekst', 'venteliste', 'max_pr_tilmelding',
                          'tilmelding_lukker_timer', 'bord_booking', 'serie', 'oprettet_af', 'aendret_af'))
    as nye_kolonner_skal_vaere_10,
  (select count(*) from public.admin_adgang where rolle = 'arrangoer') as arrangoerer;
