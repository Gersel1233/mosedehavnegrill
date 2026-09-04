-- ============================================================
--  DATOREGLEN FLYTTER — OGSÅ PÅ DE TRE ANDRE  (4. sep 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER borde.sql, forespoergsler.sql og udlejning.sql —
--  og FØR bordnummer.sql. Skriver ingen data. Kan køres igen.
--
--  ------------------------------------------------------------
--  DEN SAMME FEJL, TRE TABELLER MERE
--  ------------------------------------------------------------
--  3/9 faldt bestillingsnummer.sql hos kunden med
--
--      ERROR 23514: new row for relation "bestillinger" violates
--      check constraint "bestilling_dato_ok"
--
--  på en RIGTIG bestilling fra 19. august. Grunden står i
--  bestilling-dato-vaern.sql: `current_date` er ikke en fast
--  værdi, og Postgres efterprøver HVERT CHECK på hele den nye
--  række ved enhver opdatering — også når man kun rører én
--  kolonne. En række, der var gyldig i august, holder op med at
--  være det, når kalenderen går videre.
--
--  ⚠️ DEN FIL RETTEDE KUN BESTILLINGERNE. De tre andre
--     gæstetabeller har nøjagtig det samme CHECK:
--
--      borde.sql        98: bord_dato_ok         (current_date + 120)
--      forespoergsler.sql 111: forespoergsel_dato_ok (+ 730)
--      udlejning.sql     95: udlejning_dato_ok    (+ 730)
--
--  ⚠️ OG DET ER IKKE KUN EN MIGRERING, DER RAMMES. Det er
--     personalets hverdag, og det holdt "intet må gå tabt" for
--     nar bagud:
--
--      · en booking fra i forgårs, ingen fik hakket af, kan
--        IKKE sættes til Ankommet, Udeblev eller Afvist
--      · en forespørgsel om et selskab, datoen er passeret på,
--        kan IKKE lukkes — hverken aftales eller afvises
--      · en udlejning, der er overstået, kan IKKE bekræftes
--        eller gendannes
--
--     Alle fire er statusskift, altså opdateringer, og hver af
--     dem efterprøver datoreglen igen. Sagen bliver stående i
--     bunken for evigt, og fejlen på skærmen siger "Vælg en dag
--     der ikke er gået endnu" om en dag, ingen har rørt.
--
--  ⚠️ REGLEN FORSVINDER IKKE, DEN FLYTTER. En gæst kan stadig
--     ikke booke eller spørge til en dag, der er gået — det er
--     nu en udløser, og den dømmer ved INDSÆTTELSE og når datoen
--     FAKTISK ændres. En gammel række, hvis dato ingen rører,
--     går fri.
--
--  ⚠️ OG BESKEDERNE HEDDER DET SAMME SOM FØR. js/store.js
--     oversætter netop de tre ord til dansk (linje 2069, 2293 og
--     2393). Skiftede navnet, ville gæsten få den rå SQL-fejl at
--     se — samme grund som bestilling_dato_ok beholdt sit navn.
-- ============================================================

-- ------------------------------------------------------------
--  1) BORDBESTILLINGER
-- ------------------------------------------------------------
alter table public.bordbestillinger
  drop constraint if exists bord_dato_ok;

create or replace function public.mosede_bord_dato_vaern()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.dato is not distinct from old.dato then
    return new;
  end if;
  /* Samme tal som CHECK'et havde. Det ene døgns slæk dækker, at
     current_date er serverens UTC-dato, og Danmark er en time
     foran. */
  if new.dato < current_date - 1 or new.dato > current_date + 120 then
    raise exception 'bord_dato_ok: %', new.dato;
  end if;
  return new;
end $$;

drop trigger if exists bord_dato on public.bordbestillinger;
create trigger bord_dato
  before insert or update on public.bordbestillinger
  for each row execute function public.mosede_bord_dato_vaern();

-- ------------------------------------------------------------
--  2) FORESPØRGSLER
--     ⚠️ DATOEN ER FRIVILLIG HER. "Sølvbryllup engang til
--     foråret" er den forespørgsel, der er mest værd, og et krav
--     om en dato ville sende netop den gæst væk. null slipper
--     igennem, præcis som CHECK'et lod den.
-- ------------------------------------------------------------
alter table public.forespoergsler
  drop constraint if exists forespoergsel_dato_ok;

create or replace function public.mosede_foresp_dato_vaern()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.dato is not distinct from old.dato then
    return new;
  end if;
  if new.dato is null then return new; end if;
  if new.dato < current_date - 1 or new.dato > current_date + 730 then
    raise exception 'forespoergsel_dato_ok: %', new.dato;
  end if;
  return new;
end $$;

drop trigger if exists forespoergsel_dato on public.forespoergsler;
create trigger forespoergsel_dato
  before insert or update on public.forespoergsler
  for each row execute function public.mosede_foresp_dato_vaern();

-- ------------------------------------------------------------
--  3) UDLEJNINGER
-- ------------------------------------------------------------
alter table public.udlejninger
  drop constraint if exists udlejning_dato_ok;

create or replace function public.mosede_udlejning_dato_vaern()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.dato is not distinct from old.dato then
    return new;
  end if;
  if new.dato < current_date - 1 or new.dato > current_date + 730 then
    raise exception 'udlejning_dato_ok: %', new.dato;
  end if;
  return new;
end $$;

drop trigger if exists udlejning_dato on public.udlejninger;
create trigger udlejning_dato
  before insert or update on public.udlejninger
  for each row execute function public.mosede_udlejning_dato_vaern();

-- ------------------------------------------------------------
--  Editoren viser kun den sidste sætnings svar.
-- ------------------------------------------------------------
select
  'datoreglen er udloesere paa alle fire tabeller nu' as resultat,
  (select count(*) = 0 from pg_constraint
    where conname in ('bord_dato_ok', 'forespoergsel_dato_ok',
                      'udlejning_dato_ok')) as checks_er_vaek,
  (select count(*) from pg_trigger
    where tgname in ('bord_dato', 'forespoergsel_dato', 'udlejning_dato')
      and not tgisinternal) as udloesere_der_staar,
  (select count(*) from public.bordbestillinger
    where dato < current_date - 1) as gamle_bookinger_der_nu_kan_lukkes,
  (select count(*) from public.forespoergsler
    where dato < current_date - 1) as gamle_foresp_der_nu_kan_lukkes,
  (select count(*) from public.udlejninger
    where dato < current_date - 1) as gamle_udlejninger_der_nu_kan_lukkes;
