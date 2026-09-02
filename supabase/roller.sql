-- ============================================================
--  ROLLER I ADMIN: EJER OG MEDARBEJDER  (2. sep 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER flerlejer.sql. Filen kan køres igen uden at
--  ødelægge noget.
--
--  ------------------------------------------------------------
--  HVORFOR
--  ------------------------------------------------------------
--  Logbogen har registreret HVEM der ændrede hvad siden 20/8 —
--  men alle logger ind som den samme, så den kan ikke skelne.
--  Og der er ingen vej til at lukke en medarbejder ude, når hun
--  holder op: adgangen ligger i `admin_adgang`, som `authenticated`
--  slet ikke har rettigheder på, så ejeren skal ind i Supabases
--  dashboard for at slette en linje.
--
--  ⚠️ ALLE, DER HAR ADGANG I DAG, BLIVER EJERE.
--  `rolle` har `default 'ejer'`, og det er ikke en tilfældig
--  standard: en migrering, der gjorde nogen til medarbejder,
--  ville tage rettigheder fra et menneske, der havde dem i går —
--  midt i en frokost, uden en linje om hvorfor. Ejeren sætter
--  selv de andre ned bagefter.
--
--  ------------------------------------------------------------
--  HVAD MÅ EN MEDARBEJDER?
--  ------------------------------------------------------------
--  DAGEN: bestillinger, borde, køkken-køen, forespørgsler,
--  udlejninger, reservationer, kalenderen, dagens ret, og at
--  melde en vare UDSOLGT eller sætte antallet ned.
--
--  FORRETNINGEN er ejerens: priserne, åbningstiderne,
--  indstillingerne, hvem der har adgang — og logbogen, som er
--  hans redskab til at se, hvad der er sket.
--
--  ⚠️ SKELLET GÅR VED DET, DER KOSTER PENGE ELLER LOVER NOGET
--  UD AF HUSET. En medarbejder skal kunne holde dagen kørende
--  uden at kunne rette en pris, åbne en lukket dag eller give
--  sig selv adgang til mere.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) ROLLEN, NAVNET OG KONTAKTEN
-- ------------------------------------------------------------
alter table public.admin_adgang
  add column if not exists rolle text not null default 'ejer';
alter table public.admin_adgang
  add column if not exists aktiv boolean not null default true;
-- Så listen i admin kan sige "Lone" og ikke bare en e-mail.
alter table public.admin_adgang
  add column if not exists navn text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'adgang_rolle_ok') then
    alter table public.admin_adgang
      add constraint adgang_rolle_ok check (rolle in ('ejer', 'medarbejder'));
  end if;
end $$;

comment on column public.admin_adgang.rolle is
  'ejer = hele forretningen. medarbejder = dagen. Standard er ejer, så en migrering aldrig tager rettigheder fra nogen.';
comment on column public.admin_adgang.aktiv is
  'Slået fra = ingen adgang. Rækken bliver stående, så logbogens navne stadig kan slås op.';


-- ------------------------------------------------------------
-- 2) FUNKTIONERNE
--    ⚠️ is_admin_for KRÆVER NU `aktiv`. Det er dét, der gør
--    "deaktivér" til andet end en farve i en liste — og det
--    virker på ALLE 18 tabellers politikker på én gang, uden at
--    en eneste af dem skal skrives om.
-- ------------------------------------------------------------
create or replace function public.is_admin_for(lok text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_adgang a
    where a.lokation_id = lok
      and a.email = coalesce(auth.jwt() ->> 'email', '')
      and a.aktiv
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_adgang a
    where a.email = coalesce(auth.jwt() ->> 'email', '')
      and a.aktiv
  );
$$;

/* "Må du styre selve forretningen her?" Samme form som
   is_admin_for, så de to kan læses ved siden af hinanden. */
create or replace function public.er_ejer_for(lok text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_adgang a
    where a.lokation_id = lok
      and a.email = coalesce(auth.jwt() ->> 'email', '')
      and a.aktiv and a.rolle = 'ejer'
  );
$$;

create or replace function public.er_ejer() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_adgang a
    where a.email = coalesce(auth.jwt() ->> 'email', '')
      and a.aktiv and a.rolle = 'ejer'
  );
$$;

/* Skærmen skal kunne spørge "hvem er jeg?" uden at læse tabellen:
   admin skjuler de faner, en medarbejder ikke kan bruge. ⚠️ Det
   er PYNT og ikke et værn — værnet er politikkerne herunder. En
   skjult fane er stadig en fane, en nysgerrig kan kalde forbi. */
create or replace function public.min_rolle() returns text
language sql stable security definer set search_path = ''
as $$
  select a.rolle from public.admin_adgang a
   where a.email = coalesce(auth.jwt() ->> 'email', '') and a.aktiv
   order by case a.rolle when 'ejer' then 0 else 1 end
   limit 1;
$$;

revoke all on function public.er_ejer_for(text) from public;
revoke all on function public.er_ejer() from public;
revoke all on function public.min_rolle() from public;
grant execute on function public.er_ejer_for(text) to authenticated;
grant execute on function public.er_ejer() to authenticated;
grant execute on function public.min_rolle() to authenticated;


-- ------------------------------------------------------------
-- 3) FORRETNINGEN ER EJERENS
--    Politikkerne skrives om ét sted pr. tabel. Alt andet —
--    dagens fire tabeller, kalenderen, køkkenet — er URØRT.
-- ------------------------------------------------------------
/* ⚠️ POLITIKKER LÆGGES SAMMEN MED ELLER — OG NAVNE MÅ IKKE
   GÆTTES. Første udgave skrev `drop policy if exists
   indstillinger_skriv_admin`; den hed `_opret_admin`, så den
   overlevede, og en medarbejder kunne stadig INDSÆTTE. En
   `drop ... if exists` på et forkert navn siger ingenting — den
   er tavs af design.

   MÅLT, ikke læst: prøven fandt det, fordi den spurgte
   databasen om politikkernes rigtige navne i stedet for at
   stole på filen.

   Derfor findes de her: hver politik, der SKRIVER (insert,
   update, delete), fjernes ud fra pg_policies — og læsningen
   bliver stående, for åbningstider og indstillinger skal gæsten
   kunne læse. */
do $$
declare t text; pol record;
begin
  foreach t in array array['indstillinger', 'aabningstider'] loop
    for pol in select policyname, cmd from pg_policies
                where schemaname = 'public' and tablename = t
                  and cmd in ('INSERT', 'UPDATE', 'DELETE')
    loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format($f$create policy %I on public.%I for insert to authenticated
                      with check (public.er_ejer_for(lokation_id))$f$, t || '_skriv_ejer', t);
    execute format($f$create policy %I on public.%I for update to authenticated
                      using (public.er_ejer_for(lokation_id))
                      with check (public.er_ejer_for(lokation_id))$f$, t || '_ret_ejer', t);
    execute format($f$create policy %I on public.%I for delete to authenticated
                      using (public.er_ejer_for(lokation_id))$f$, t || '_slet_ejer', t);
  end loop;

  -- Selve forretningen: navn, adresse, telefon.
  for pol in select policyname from pg_policies
              where schemaname = 'public' and tablename = 'lokationer' and cmd = 'UPDATE'
  loop
    execute format('drop policy %I on public.lokationer', pol.policyname);
  end loop;

  /* ⚠️ LOGBOGEN ER EJERENS REDSKAB — OGSÅ SLETNINGEN. Den siger,
     hvem der rettede hvad, og en medarbejder, der kan RYDDE den,
     kan fjerne sporet efter sig selv. Skrivningen er alles: alle
     skal logges. */
  for pol in select policyname from pg_policies
              where schemaname = 'public' and tablename = 'logbog'
                and cmd in ('SELECT', 'DELETE')
  loop
    execute format('drop policy %I on public.logbog', pol.policyname);
  end loop;
end $$;

create policy lokationer_ret_ejer on public.lokationer
  for update to authenticated
  using (public.er_ejer_for(id)) with check (public.er_ejer_for(id));

create policy logbog_laes_ejer on public.logbog
  for select to authenticated using (public.er_ejer_for(lokation_id));
create policy logbog_slet_ejer on public.logbog
  for delete to authenticated using (public.er_ejer_for(lokation_id));


-- ------------------------------------------------------------
-- 4) PRISEN ER EJERENS — MEN UDSOLGT ER DAGENS
--    ----------------------------------------------------------
--    ⚠️ KOLONNERETTIGHEDER KAN IKKE BRUGES HER, og det er værd
--    at vide: de gælder pr. DATABASEROLLE, og både ejer og
--    medarbejder er `authenticated`. (Det er ellers netop dem,
--    borde.kode er beskyttet med — dér går skellet mellem gæst
--    og personale, og så virker de.)
--
--    Derfor en udløser: den ser på, hvad der FAKTISK ændrede
--    sig, og siger kun nej til prisen.
-- ------------------------------------------------------------
create or replace function public.mosede_pris_er_ejerens()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_lok text;
begin
  select k.lokation_id into v_lok
    from public.menu_kategorier k where k.id = new.kategori_id;

  if new.pris is distinct from old.pris
     and not public.er_ejer_for(coalesce(v_lok, 'mosede')) then
    raise exception 'kun_ejeren_saetter_priser';
  end if;
  return new;
end $$;

comment on function public.mosede_pris_er_ejerens() is
  'En medarbejder må melde udsolgt og sætte antallet ned — ikke rette prisen. Kolonnerettigheder duer ikke: begge roller er authenticated.';

drop trigger if exists menu_vare_pris_ejer on public.menu_varer;
create trigger menu_vare_pris_ejer
  before update on public.menu_varer
  for each row execute function public.mosede_pris_er_ejerens();


-- ------------------------------------------------------------
-- 5) ADGANGEN KAN STYRES FRA ADMIN
--    ----------------------------------------------------------
--    ⚠️ DEN HER BLOK ER DEN MEST FØLSOMME I HELE PROJEKTET.
--    Indtil nu har `authenticated` slet ingen rettigheder haft på
--    admin_adgang — ejeren skulle ind i Supabases dashboard for
--    at tilføje en medarbejder. Det er sikkert, og det er
--    ubrugeligt: han holder op med at gøre det.
--
--    Adgangen gives derfor, men KUN til en ejer, og med en
--    spærre mod at lukke sig selv ude.
-- ------------------------------------------------------------
grant select, insert, update, delete on public.admin_adgang to authenticated;

/* ⚠️ ALLE politikker fjernes ved OPSLAG, ikke ved gæt — se
   noten i punkt 3. Den overlevende her hed `admin_adgang_laes`,
   og på den her tabel er en overlevende permissiv politik det
   værst tænkelige: den lægges sammen med ELLER. */
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies
              where schemaname = 'public' and tablename = 'admin_adgang'
  loop
    execute format('drop policy %I on public.admin_adgang', pol.policyname);
  end loop;
end $$;

/* Ejeren ser holdet på sin egen forretning. */
create policy adgang_laes_ejer on public.admin_adgang
  for select to authenticated using (public.er_ejer_for(lokation_id));

/* ⚠️ OG ALLE SER DERES EGEN RÆKKE. Uden den kan admin ikke sige
   "du er medarbejder" til den, der er det — og så ved hun ikke,
   hvorfor en knap mangler. */
create policy adgang_egen_raekke on public.admin_adgang
  for select to authenticated
  using (email = coalesce(auth.jwt() ->> 'email', ''));

create policy adgang_skriv_ejer on public.admin_adgang
  for insert to authenticated with check (public.er_ejer_for(lokation_id));
create policy adgang_ret_ejer on public.admin_adgang
  for update to authenticated
  using (public.er_ejer_for(lokation_id))
  with check (public.er_ejer_for(lokation_id));
create policy adgang_slet_ejer on public.admin_adgang
  for delete to authenticated using (public.er_ejer_for(lokation_id));

/* ⚠️ DEN SIDSTE EJER KAN IKKE FJERNES — heller ikke af sig selv.
   Uden den her spærre kunne ét fejltryk efterlade en forretning,
   hvor INGEN kan rette en pris, og hvor vejen tilbage går
   gennem Supabases dashboard. Det er ikke et sted, en cafe skal
   ende klokken 12 om lørdagen.

   Den tæller EFTER ændringen, i den samme transaktion, så den
   fanger både sletning, deaktivering og en degradering til
   medarbejder. */
create or replace function public.mosede_sidste_ejer()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_lok text := coalesce(old.lokation_id, new.lokation_id);
begin
  if not exists (
    select 1 from public.admin_adgang a
     where a.lokation_id = v_lok and a.aktiv and a.rolle = 'ejer'
  ) then
    raise exception 'sidste_ejer_kan_ikke_fjernes';
  end if;
  return null;
end $$;

comment on function public.mosede_sidste_ejer() is
  'Der skal altid være mindst én aktiv ejer pr. forretning. Fanger sletning, deaktivering OG degradering — den tæller efter ændringen.';

drop trigger if exists adgang_sidste_ejer on public.admin_adgang;
create constraint trigger adgang_sidste_ejer
  after update or delete on public.admin_adgang
  deferrable initially immediate
  for each row execute function public.mosede_sidste_ejer();

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_name = 'admin_adgang' and column_name in ('rolle','aktiv','navn'))
    as "tre nye kolonner (skal være 3)",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('er_ejer','er_ejer_for','min_rolle'))
    as "tre nye funktioner (skal være 3)",
  (select count(*) from pg_trigger
    where tgrelid = to_regclass('public.admin_adgang') and tgname = 'adgang_sidste_ejer')
    as "spaerren mod at lukke sig selv ude (skal være 1)",
  (select count(*) from public.admin_adgang where rolle = 'ejer' and aktiv)
    as "aktive ejere (skal være mindst 1)";
