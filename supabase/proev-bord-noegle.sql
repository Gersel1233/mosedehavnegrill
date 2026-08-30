-- ============================================================
--  PRØVE AF BORDETS NØGLE  (30. august 2026)
--  ------------------------------------------------------------
--  Kør EFTER bord-noegle.sql. Rapporten kommer til sidst som én
--  "fejl" — den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der rydder op.
--
--  DET, DEN MÅLER
--  ------------------------------------------------------------
--  Kundens spørgsmål: kan nogen taste adressen ind i stedet for
--  at scanne? Prøven svarer på den halvdel, der kan svares på i
--  en database:
--
--    · Et bord UDEN nøgle er som før       (ingen bliver låst ude)
--    · Et bord MED nøgle afviser en tom    (adressen alene dur ikke)
--      og en forkert nøgle
--    · Den rigtige nøgle slipper igennem
--    · Nøglen bliver ALDRIG gemt           (så den ikke kan læses
--                                           ud af en tabel bagefter)
--    · anon kan ikke læse kolonnen         (så listen ikke kan
--                                           hentes og bruges til at
--                                           bygge de 55 adresser)
--    · En ny nøgle dræber den gamle adresse
-- ============================================================

begin;

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

create sequence if not exists pg_temp.pnr;

/* Hver bestilling får sit eget nummer og sit eget klokkeslæt.
   bestilling_ikke_dobbelt fanger samme telefon + dag + tid, og
   uden det ville prøven falde over et ANDET værn end det, den
   måler. */
create or replace function pg_temp.bestil(p_bord text, p_kode text)
returns text language plpgsql as $$
declare n int := nextval('pg_temp.pnr');
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, antal, hvordan, bord_nummer, bord_kode)
  values ('SM-NOGL-' || lpad(n::text, 5, '0'), 'mosede', 'Prøve ' || n,
          '0000' || lpad(n::text, 4, '0'), current_date,
          ('11:00'::time + (n || ' minutes')::interval)::time,
          jsonb_build_array(jsonb_build_object('navn', 'Pommes frites', 'antal', 1, 'pris', 40)),
          1, 'spis_her', p_bord, p_kode);
  return 'OK';
exception when others then
  return sqlerrm;
end $$;

-- ------------------------------------------------------------
--  KULISSEN
-- ------------------------------------------------------------
insert into public.lokationer (id, navn, adresse, postnr, by)
values ('mosede', 'Mosede Havnecafe', 'Havnevej 20I', '2670', 'Greve')
on conflict (id) do nothing;

-- Et bord som i dag: ingen nøgle. Og et, ejeren har låst.
insert into public.borde (lokation_id, nummer, kode)
values ('mosede', 'PRØVE-FRI', null),
       ('mosede', 'PRØVE-LÅST', 'K3F9X2')
on conflict do nothing;

-- ------------------------------------------------------------
--  1-2) ET BORD UDEN NØGLE ER SOM FØR
-- ------------------------------------------------------------
/* ⚠️ DEN VIGTIGSTE AF DEM ALLE. Falder den, har filen låst alle
   55 skilte ude i det sekund, den blev kørt — midt i en frokost,
   uden at nogen har trykket på noget. */
select pg_temp.svar('1. Uden nøgle på bordet slipper en bestilling uden nøgle igennem',
  pg_temp.bestil('PRØVE-FRI', null) = 'OK');

select pg_temp.svar('2. Uden nøgle på bordet er en medsendt nøgle heller ikke i vejen',
  pg_temp.bestil('PRØVE-FRI', 'HVADSOMHELST') = 'OK');

-- ------------------------------------------------------------
--  3-5) MED NØGLE SKAL DEN PASSE
-- ------------------------------------------------------------
/* Det her ER kundens spørgsmål: den, der taster adressen ind
   uden at have scannet, har ikke nøglen. */
select pg_temp.svar('3. Med nøgle afvises en bestilling UDEN nøgle',
  pg_temp.bestil('PRØVE-LÅST', null) like '%bord_kode_mangler%');

select pg_temp.svar('4. Med nøgle afvises en FORKERT nøgle',
  pg_temp.bestil('PRØVE-LÅST', 'AAAAAA') like '%bord_kode_forkert%');

select pg_temp.svar('5. Den rigtige nøgle slipper igennem',
  pg_temp.bestil('PRØVE-LÅST', 'K3F9X2') = 'OK');

/* Et skilt læses med en telefon, men kan også tastes af med
   øjnene, hvis koden er kradset. Store og små bogstaver må ikke
   afgøre, om maden kommer. */
select pg_temp.svar('6. Store og små bogstaver er den samme nøgle',
  pg_temp.bestil('PRØVE-LÅST', ' k3f9x2 ') = 'OK');

-- ------------------------------------------------------------
--  7) NØGLEN GEMMES ALDRIG
-- ------------------------------------------------------------
/* Stod den i rækken, ville den stå på personalets skærm, i
   sikkerhedskopien fra Historik og i enhver eksport — og så var
   den ikke længere en nøgle. */
select pg_temp.svar('7. Nøglen står ikke i bestillingen bagefter',
  not exists (select 1 from public.bestillinger
               where reference like 'SM-NOGL-%' and bord_kode is not null));

-- ------------------------------------------------------------
--  8-9) GÆSTEN MÅ IKKE LÆSE NØGLEN
-- ------------------------------------------------------------
/* ⚠️ HELE VÆRNETS FUNDAMENT. Kunne gæsten hente listen med
   koderne i, kunne hun selv bygge alle 55 adresser, og nøglen
   var en dekoration. */
select pg_temp.svar('8. Gæsten må IKKE læse kolonnen kode',
  not has_column_privilege('anon', 'public.borde', 'kode', 'select'));

select pg_temp.svar('9. Gæsten må stadig læse bordets nummer',
  has_column_privilege('anon', 'public.borde', 'nummer', 'select'));

/* Siden skal kunne sige "scan koden igen", FØR gæsten har fyldt
   en hel kurv. Den afledte kolonne siger ja/nej og intet andet. */
select pg_temp.svar('10. Gæsten må læse, OM bordet kræver en nøgle',
  has_column_privilege('anon', 'public.borde', 'har_kode', 'select'));

select pg_temp.svar('11. har_kode følger nøglen af sig selv',
  (select har_kode from public.borde where nummer = 'PRØVE-LÅST' and lokation_id = 'mosede')
  and not (select har_kode from public.borde where nummer = 'PRØVE-FRI' and lokation_id = 'mosede'));

-- ------------------------------------------------------------
--  12) EN NY NØGLE DRÆBER DEN GAMLE ADRESSE
-- ------------------------------------------------------------
/* Det er svaret på "nogen har gemt url'en": ejeren giver bordet
   en ny nøgle, og linket i sofaen holder op med at virke i samme
   sekund. Ét skilt printes om, ikke 55. */
update public.borde set kode = 'M7PQR4'
 where lokation_id = 'mosede' and nummer = 'PRØVE-LÅST';

select pg_temp.svar('12. Den gamle nøgle virker ikke mere',
  pg_temp.bestil('PRØVE-LÅST', 'K3F9X2') like '%bord_kode_forkert%');

select pg_temp.svar('13. Den nye nøgle virker',
  pg_temp.bestil('PRØVE-LÅST', 'M7PQR4') = 'OK');

-- ------------------------------------------------------------
--  14-15) FORMEN OG DET ENTYDIGE
-- ------------------------------------------------------------
/* 0/O og 1/I/L er de tegn, folk skriver forkert af, når koden er
   kradset og de taster den i hånden. */
create or replace function pg_temp.saetKode(p_kode text)
returns text language plpgsql as $$
begin
  update public.borde set kode = p_kode
   where lokation_id = 'mosede' and nummer = 'PRØVE-LÅST';
  return 'OK';
exception when others then
  return sqlerrm;
end $$;

select pg_temp.svar('14. En nøgle med 0 eller 1 i afvises af databasen',
  pg_temp.saetKode('K3F9X0') like '%borde_kode_form_ok%'
  and pg_temp.saetKode('K3F9XI') like '%borde_kode_form_ok%');

/* To borde med samme nøgle ville betyde, at ét skilt åbnede to
   borde — og maden ville blive båret hen til det forkerte. */
select pg_temp.svar('15. To borde kan ikke få den samme nøgle',
  (select count(*) from pg_indexes
    where schemaname = 'public' and indexname = 'borde_kode_unik') = 1);

-- ------------------------------------------------------------
--  16) MAD UD AF HUSET RØRES IKKE
-- ------------------------------------------------------------
/* En frokost bestilt hjemmefra har intet bord. Ramte værnet den,
   ville hele hjemmesidens bestilling gå ned. */
select pg_temp.svar('16. En bestilling uden bord går stadig igennem',
  pg_temp.bestil(null, null) = 'OK');

-- ------------------------------------------------------------
--  RAPPORTEN — afbrydelsen ER oprydningen.
-- ------------------------------------------------------------
do $$
declare
  rapport text := rtrim(coalesce(current_setting('proev.rapport', true), ''), E'\n');
  linjer  text[] := case when rapport = '' then '{}'::text[]
                         else string_to_array(rapport, E'\n') end;
  antal   int := coalesce(array_length(linjer, 1), 0);
  fejl    int;
begin
  select count(*) into fejl from unnest(linjer) as l where l like 'FEJLEDE%';
  raise exception E'\n====== RESULTATET AF NØGLE-PRØVEN ======\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '========================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 16 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
