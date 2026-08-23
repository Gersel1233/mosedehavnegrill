-- ============================================================
--  LEVERING AF SMØRREBRØD UD AF HUSET
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør spis-her.sql FØRST — filen her udvider dens regel.
--
--  HVAD DEN GØR
--  ------------------------------------------------------------
--  spis-her.sql gav bestillinger kolonnen 'hvordan' med to
--  svar: afhentning og spis_her. Kunden bad 23/8 om det tredje:
--  smørrebrød ud af huset skal kunne LEVERES, ikke kun hentes.
--
--  Derfor: 'levering' som tredje svar, og en adresse at levere
--  til. Adressen er ikke et frit felt ved siden af — den hænger
--  sammen med svaret, og databasen håndhæver begge veje:
--
--    hvordan = 'levering'  →  adressen SKAL være der
--    hvordan ≠ 'levering'  →  adressen SKAL være tom
--
--  Den anden halvdel er den, der betyder noget. Uden den kunne
--  en adresse blive stående, efter gæsten skiftede fra levering
--  til afhentning, og så ville køkkenet køre ud med mad, nogen
--  stod og ventede på ved lugen.
--
--  DET, FILEN IKKE GØR
--  ------------------------------------------------------------
--  Den lover ingen leveringszone og ingen pris. Ingen af delene
--  er bekræftet af forretningen — se listen "Ejeren skal
--  bekræfte" i README. Databasen tager imod en adresse; om der
--  kan køres dertil, afgør forretningen. Derfor bliver en
--  levering heller ALDRIG bekræftet automatisk på siden, selv
--  når auto_bekraeft er slået til: vi kan love, at maden bliver
--  lavet, men ikke at den kan køres til en adresse, vi ikke
--  kender. Den regel bor i js/bestilling.js.
--
--  Filen kan køres igen.
-- ============================================================

-- ------------------------------------------------------------
--  1) Adressen
-- ------------------------------------------------------------
alter table public.bestillinger
  add column if not exists leverings_adresse text;

comment on column public.bestillinger.leverings_adresse is
  'Hvor maden skal køres hen. Kun udfyldt når hvordan = levering.';

-- ------------------------------------------------------------
--  2) Det tredje svar
--  Reglen droppes og sættes igen, så filen kan køres igen — og
--  så en database, der allerede har spis-her.sql, får den nye
--  udgave i stedet for at støde sammen med den gamle.
-- ------------------------------------------------------------
alter table public.bestillinger
  drop constraint if exists bestilling_hvordan_ok;

alter table public.bestillinger
  add constraint bestilling_hvordan_ok
  check (hvordan in ('afhentning', 'spis_her', 'levering'));

-- ------------------------------------------------------------
--  3) Adressen og svaret skal passe sammen
--  Begge veje. Se noten øverst om hvorfor den anden halvdel er
--  den vigtige.
--
--  btrim, så et felt med tre mellemrum i ikke tæller som en
--  adresse: gæsten kan trykke sig igennem med mellemrumstasten,
--  og '   ' er ikke et sted, nogen kan køre hen.
-- ------------------------------------------------------------
alter table public.bestillinger
  drop constraint if exists bestilling_levering_adresse_ok;

alter table public.bestillinger
  add constraint bestilling_levering_adresse_ok
  check (
    (hvordan = 'levering'
       and leverings_adresse is not null
       and char_length(btrim(leverings_adresse)) between 5 and 300)
    or
    (hvordan <> 'levering' and leverings_adresse is null)
  );

-- ============================================================
--  OPTÆLLING
--  SQL-editoren viser kun den sidste sætnings svar.
-- ============================================================
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'bestillinger'
      and column_name = 'leverings_adresse')                    as "adresse-kolonnen (1)",
  (select count(*) from pg_constraint
    where conname = 'bestilling_hvordan_ok')                    as "de tre svar (1)",
  (select count(*) from pg_constraint
    where conname = 'bestilling_levering_adresse_ok')           as "adresse-reglen (1)",
  (select count(*) from public.bestillinger
    where hvordan = 'levering')                                 as "leveringer i dag";
