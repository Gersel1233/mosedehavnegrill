-- ============================================================
--  DAGSREGLER: DAGEN KAN VÆRE HALVT ÅBEN  (august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER: lukkedag-vaern.sql (den udvider dens værn)
--
--  ------------------------------------------------------------
--  HVORFOR DEN SKAL FINDES
--  ------------------------------------------------------------
--  Kalenderen kunne to ting: en dag var ÅBEN, eller den var
--  LUKKET. Plus en tidlig lukning.
--
--  Virkeligheden på havnen er ikke sådan. Kundens ord (26/8):
--  "hvis der er selskab en dag som en booking der er blevet
--  oprettet skal de kunne administrere at der ikke er åbent for
--  bestillinger den dag eller kun åbent for to go."
--
--  Det er præcis den dag, systemet ikke kunne beskrive: der ER
--  åbent, køkkenet laver mad — men trædækket er optaget af et
--  selskab, så der kan kun hentes ud af huset. Med kun
--  "åben/lukket" har personalet to lige dårlige valg: lukke HELE
--  dagen (og miste den take-away, de sagtens kunne have lavet),
--  eller lade stå åbent (og få en familie ind midt i et selskab).
--
--  Begge fejl opdages først, når nogen står der.
--
--  ------------------------------------------------------------
--  FORMEN: KUN DET, DER ER ANDERLEDES
--  ------------------------------------------------------------
--  En række pr. dag, der afviger. INGEN række = helt almindelig
--  dag efter åbningstiderne. Det er med vilje:
--
--   · En tabel med en række pr. dag i året skulle vedligeholdes,
--     og en dag uden en række ville betyde "ved ikke" i stedet for
--     "som den plejer".
--   · Tomme tider betyder "brug de almindelige". Skrev vi
--     åbningstiderne ind i hver dag, ville en ændring af
--     sommertiderne skulle skrives 90 steder — og de dage, nogen
--     glemte, ville stille køre videre på foråret.
--
--  ------------------------------------------------------------
--  ⚠️ VÆRNET ER DET VIGTIGE
--  ------------------------------------------------------------
--  Siden skjuler de lukkede muligheder — men det er BROWSEREN.
--  Går man uden om siden, eller sad fanen åben fra før personalet
--  lukkede for spis her, skal databasen sige nej. Det er samme
--  lære som lukkedag-vaern.sql: uden værnet står køkkenet med en
--  bestilling, de ikke kan holde.
--
--  Fejlteksterne oversættes i js/store.js — navnene her og dér
--  skal følges ad.
--
--  Filen kan køres igen.
-- ============================================================

create table if not exists public.dags_regler (
  id            bigserial primary key,
  lokation_id   text not null references public.lokationer(id) on delete cascade,
  dato          date not null,

  /* De to måder at få mad på. En dag kan være lukket for den ene
     og åben for den anden — det er hele grunden til tabellen.
     ⚠️ Et bord (QR) ER spis her, og lukkes spis her, kan der
     heller ikke bestilles fra bordene. Det er meningen: er
     trædækket optaget af et selskab, er der ingen borde at
     servere ved. */
  luk_takeaway    boolean not null default false,
  luk_spis_her    boolean not null default false,

  /* Tomme = de almindelige åbningstider gælder. Kun det, der er
     anderledes, skrives. */
  tidligst        time,
  senest_togo     time,
  senest_spis_her time,

  /* ⚠️ DEN HER LÆSES AF GÆSTEN. Det er ikke personalets note —
     den bor i kalenderen som en intern arrangement-række. Står
     der et telefonnummer eller et gæstenavn her, er det på
     hjemmesiden. Feltet hedder derfor besked_til_gaester og ikke
     "note", så ingen kommer til at bruge det som en huskeseddel. */
  besked_til_gaester text,

  oprettet      timestamptz not null default now(),
  aendret       timestamptz,

  -- Én dag, én række. Uden den kunne to rækker sige hver sit om
  -- den samme dag, og hvilken der vandt, ville afhænge af id.
  unique (lokation_id, dato)
);

create index if not exists dags_regler_dato_idx
  on public.dags_regler (lokation_id, dato);

alter table public.dags_regler enable row level security;

/* GÆSTEN MÅ LÆSE DEM ALLE.

   Reglerne afgør, om hun kan bestille, hvornår hun kan hente, og
   hvad der står om dagen — de skal kunne læses af den, der ikke
   er logget ind. Der er ingen personoplysninger i tabellen; det
   er dét, kolonnenavnet besked_til_gaester holder fast i.

   ⚠️ Tilføj ALDRIG en kolonne med et navn, et telefonnummer eller
   en intern bemærkning. Samme regel som optagne_dage og
   bord_travlhed: den her tabel er offentlig. */
drop policy if exists dags_regler_laes_alle on public.dags_regler;
create policy dags_regler_laes_alle
  on public.dags_regler for select
  using (true);

drop policy if exists dags_regler_skriv_admin on public.dags_regler;
create policy dags_regler_skriv_admin
  on public.dags_regler for all
  using (public.is_admin_for(lokation_id))
  with check (public.is_admin_for(lokation_id));


/* ============================================================
   VÆRNET
   ------------------------------------------------------------
   Udvider mosede_dag_aaben fra lukkedag-vaern.sql. Den fil skal
   være kørt først; den her erstatter funktionen med en, der kan
   det hele. Køres lukkedag-vaern.sql IGEN bagefter, skrives den
   her væk — og så kan gæsten bestille spis her på en dag, der er
   lukket for det. Tjek 100 i er-vi-klar.sql fanger det.

   ⚠️ OG DEN HER FIL ER SELV DEN, DER SKRIVER VÆK. Køres den efter
   dagsbesked-og-qr.sql, ryger QR-spærren. Tjek 107 fanger det.

   SECURITY DEFINER af samme grund som før: værnet kører, når
   GÆSTEN indsætter, og må ikke kunne narres af en strammet
   læseregel. Se den lange note i lukkedag-vaern.sql.
   ============================================================ */
create or replace function public.mosede_dag_aaben()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dato    date;
  v_tid     time;
  v_lukker  time;
  v_saeson  jsonb;
  v_spis_her boolean;
  v_regel   public.dags_regler%rowtype;
begin
  /* De to tabeller staver dato og tid forskelligt — det er
     kolonnenavnene fra deres egne skemaer, ikke en smag. */
  if tg_table_name = 'bestillinger' then
    v_dato := new.hent_dato;
    v_tid  := new.hent_tid;
    /* ⚠️ BORDENE ER DÆKKET AF DEN HER LINJE, og der stod et led
       mere: "or new.bord_nummer is not null". Det er FJERNET
       igen, fordi det var dødt.

       MÅLT på en rigtig Postgres: skemaet binder allerede de to
       sammen med bestilling_bord_hvordan_ok
       (bord_nummer is null or hvordan = 'spis_her'), så en række
       med et bordnummer HAR altid hvordan = 'spis_her'. Leddet
       kunne aldrig blive sandt alene, og prøven, der skulle
       bevise det, blev afvist af en helt anden regel
       (bestilling_ukendt_bord) og sagde BESTOD om noget, den
       ikke havde målt.

       Bindingen er dét, der bærer garantien — den prøves for sig
       i proev-dagsregler.sql. Fjernes den CHECK en dag, skal
       leddet her tilbage. */
    v_spis_her := (new.hvordan = 'spis_her');
  else
    v_dato := new.dato;
    v_tid  := new.tid;
    -- En bordbestilling er altid spis her.
    v_spis_her := true;
  end if;

  -- 1) Lukkedag, også som periode (slut_dato tom = én dag)
  if exists (
    select 1 from public.kalender k
     where k.lokation_id = new.lokation_id
       and k.type = 'lukkedag'
       and v_dato between k.dato and coalesce(k.slut_dato, k.dato)
  ) then
    raise exception 'bestilling_lukket_dag';
  end if;

  -- 2) Tidlig lukning: sidste afhentning en halv time før
  select min(k.lukker_kl) into v_lukker
    from public.kalender k
   where k.lokation_id = new.lokation_id
     and k.type = 'tidlig_lukning'
     and v_dato between k.dato and coalesce(k.slut_dato, k.dato)
     and k.lukker_kl is not null;
  if v_lukker is not null and v_tid is not null
     and v_tid > v_lukker - interval '30 minutes' then
    raise exception 'bestilling_efter_lukketid';
  end if;

  -- 3) Sæsonlukning
  select i.vaerdi into v_saeson
    from public.indstillinger i
   where i.lokation_id = new.lokation_id
     and i.noegle = 'saeson';
  if coalesce((v_saeson->>'lukket')::boolean, false) then
    raise exception 'bestilling_saeson_lukket';
  end if;

  -- 4) DAGENS EGNE REGLER. Ingen række = almindelig dag.
  select * into v_regel
    from public.dags_regler r
   where r.lokation_id = new.lokation_id
     and r.dato = v_dato;

  if found then
    if v_spis_her and v_regel.luk_spis_her then
      raise exception 'bestilling_spis_her_lukket';
    end if;
    if (not v_spis_her) and v_regel.luk_takeaway then
      raise exception 'bestilling_takeaway_lukket';
    end if;

    /* Tiderne. Tomme felter betyder "de almindelige gælder", så
       der prøves kun på dem, der er udfyldt. */
    if v_tid is not null then
      if v_regel.tidligst is not null and v_tid < v_regel.tidligst then
        raise exception 'bestilling_for_tidligt';
      end if;
      if v_spis_her then
        if v_regel.senest_spis_her is not null and v_tid > v_regel.senest_spis_her then
          raise exception 'bestilling_efter_lukketid';
        end if;
      else
        if v_regel.senest_togo is not null and v_tid > v_regel.senest_togo then
          raise exception 'bestilling_efter_lukketid';
        end if;
      end if;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists bestilling_dag_aaben on public.bestillinger;
create trigger bestilling_dag_aaben
  before insert on public.bestillinger
  for each row execute function public.mosede_dag_aaben();

drop trigger if exists bord_dag_aaben on public.bordbestillinger;
create trigger bord_dag_aaben
  before insert on public.bordbestillinger
  for each row execute function public.mosede_dag_aaben();


-- Rapport. Supabases SQL Editor viser kun den sidste sætnings
-- svar — se README-afsnittet "Supabases SQL Editor viser ikke
-- beskeder".
select
  case
    when not exists (select 1 from information_schema.tables
                      where table_schema = 'public' and table_name = 'dags_regler')
      then '❌ TABELLEN BLEV IKKE OPRETTET — læs fejlbeskeden ovenfor'
    when (select count(*) from pg_policies
           where schemaname = 'public' and tablename = 'dags_regler') < 2
      then '❌ ADGANGSREGLERNE MANGLER'
    when not exists (
      select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'mosede_dag_aaben'
         and pg_get_functiondef(p.oid) like '%luk_spis_her%')
      then '❌ VÆRNET KENDER IKKE DAGSREGLERNE — kør filen igen'
    else '✅ DAGSREGLERNE ER PÅ PLADS — kør supabase/proev-dagsregler.sql som efterprøvning'
  end as svar;
