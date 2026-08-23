-- ============================================================
--  PRØVE AF LEVERINGEN  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER levering.sql. Hver prøve skriver BESTOD eller
--  FEJLEDE, og rapporten kommer til sidst som én "fejl" — det er
--  den ene kanal Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der ruller prøvens data tilbage.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Den halvdel, der er værd at prøve, er ikke "kan man levere".
--  Det er den anden: en adresse må IKKE kunne blive stående på
--  en bestilling, der er skiftet til afhentning. Sker det, kører
--  køkkenet ud med mad, som nogen står og venter på ved lugen —
--  og det opdager ingen, før begge dele er gået galt.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES? Kør først:
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
-- ============================================================

begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-l', 'Forretning L', 'Vej 1', '2670', 'Greve', '11111111')
on conflict (id) do nothing;

create or replace function pg_temp.svar(navn text, ok boolean) returns text
language plpgsql as $$
declare linje text := case when ok then 'BESTOD   ' else 'FEJLEDE  ' end || navn;
begin
  perform set_config('proev.rapport',
    coalesce(current_setting('proev.rapport', true), '') || linje || E'\n', true);
  raise notice '%', linje;
  return linje;
end $$;

/* Én indsættelse, ét svar. Prøverne herunder er den samme
   bevægelse otte gange, og otte gentagne do-blokke ville skjule,
   hvad der faktisk er forskelligt fra gang til gang.

   HVERT KALD FÅR SIT EGET TELEFONNUMMER, og det er ikke
   pedanteri. Første udgave brugte det samme nummer hele vejen,
   og så slog BREMSEN til fra prøve 2 og frem: to bestillinger
   fra samme nummer inden for en time afvises. Prøve 2 og 3
   meldte FEJLEDE om regler, der virkede fint — og værre: prøve
   4 til 8 meldte BESTOD, fordi indsættelsen blev afvist af
   bremsen i stedet for af den regel, prøven handler om. Otte
   svar, hvoraf seks var løgn. Nummeret tælles derfor op med
   p_nr, så hver prøve står alene. */
create or replace function pg_temp.proev(
  p_ref text, p_nr int, p_hvordan text, p_adresse text) returns boolean
language plpgsql as $$
begin
  insert into public.bestillinger
    (lokation_id, reference, navn, telefon, hent_dato, hent_tid,
     linjer, antal, hvordan, leverings_adresse)
  values ('proev-l', p_ref, 'Gæst', '2030' || lpad(p_nr::text, 4, '0'),
          current_date + 1, '12:00',
          '[{"navn":"Smørrebrød","antal":1,"pris":45}]'::jsonb, 1,
          p_hvordan, p_adresse);
  return true;
exception when others then
  return false;
end $$;

set local role anon;
set local request.jwt.claims = '{}';

-- =============== DET DER SKAL VIRKE =========================

select pg_temp.svar('1. Levering med en adresse tages imod',
  pg_temp.proev('PROEV-L1', 1, 'levering', 'Havnevej 20I, 2670 Greve'));

select pg_temp.svar('2. Afhentning uden adresse virker som før',
  pg_temp.proev('PROEV-L2', 2, 'afhentning', null));

select pg_temp.svar('3. Spis her uden adresse virker som før',
  pg_temp.proev('PROEV-L3', 3, 'spis_her', null));

-- =============== DET DER SKAL AFVISES =======================

select pg_temp.svar('4. Levering UDEN adresse afvises',
  not pg_temp.proev('PROEV-L4', 4, 'levering', null));

select pg_temp.svar('5. Levering med tre mellemrum som adresse afvises',
  not pg_temp.proev('PROEV-L5', 5, 'levering', '   '));

/* DEN VIGTIGE. Se noten øverst. */
select pg_temp.svar('6. Afhentning MED en adresse afvises',
  not pg_temp.proev('PROEV-L6', 6, 'afhentning', 'Havnevej 20I, 2670 Greve'));

select pg_temp.svar('7. Spis her MED en adresse afvises',
  not pg_temp.proev('PROEV-L7', 7, 'spis_her', 'Havnevej 20I, 2670 Greve'));

/* Det fjerde svar må stadig ikke findes: reglen blev droppet og
   sat igen i levering.sql, og en regel, der forsvandt undervejs,
   ville ikke kunne ses på nogen af prøverne ovenfor. */
select pg_temp.svar('8. Et fjerde svar findes ikke',
  not pg_temp.proev('PROEV-L8', 8, 'levering_med_drone', null));

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

  raise exception E'\n============ RESULTATET AF LEVERINGS-PRØVEN ================\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alle dens prøvedata rulles tilbage.\n'
    'Databasen er som før.\n\n'
    '%\n\n%\n'
    '============================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 8 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
