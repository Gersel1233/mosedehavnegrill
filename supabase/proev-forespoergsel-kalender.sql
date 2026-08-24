-- ============================================================
--  PRØVE AF FORESPØRGSLERNES KALENDER  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER forespoergsel-kalender.sql. Hver prøve skriver
--  BESTOD eller FEJLEDE, og rapporten kommer til sidst som én
--  "fejl" — det er den ene kanal, Supabases SQL Editor altid
--  viser, og afbrydelsen er samtidig det, der ruller prøvens
--  data tilbage.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  To ting kan gå galt, og begge er tavse.
--
--  Den ene: værnet slår op i tabeller, gæsten ikke må læse.
--  Uden security definer finder det ingenting, siger ja til hver
--  eneste dato — og der er hverken en fejl eller et spor.
--  Nøjagtig den fejl havde lukkedagsværnet.
--
--  Den anden: listen over optagne dage er en visning, der kører
--  med sin EJERS øjne. Tilføjer nogen "navn" til den, er hele
--  gæstelisten åben for internettet. Prøve 4 tæller kolonnerne.
--
--  KØRER DU DEN PÅ EN BAR POSTGRES? Kør først:
--    grant all on all tables in schema public to anon, authenticated;
--    grant usage, select on all sequences in schema public
--      to anon, authenticated;
-- ============================================================

begin;

insert into public.lokationer (id, navn, adresse, postnr, by, telefon)
values ('proev-k', 'Forretning K', 'Vej 1', '2670', 'Greve', '11111111')
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

/* HVERT KALD FÅR SIT EGET TELEFONNUMMER. Bremsen afviser to
   forespørgsler fra samme nummer inden for en time — og så ville
   halvdelen af prøverne herunder melde BESTOD, fordi rækken blev
   afvist af bremsen i stedet for af den regel, prøven handler
   om. Det er sket før, i leveringsprøven, og det kostede seks
   løgne ud af otte svar. */
create or replace function pg_temp.foresp(
  p_nr int, p_type text, p_dato date, p_status text, p_detaljer jsonb)
returns boolean
language plpgsql as $$
begin
  insert into public.forespoergsler
    (lokation_id, reference, type, navn, telefon, dato, detaljer, status)
  values ('proev-k', 'FO-K' || p_nr, p_type, 'Gæst ' || p_nr,
          '3040' || lpad(p_nr::text, 4, '0'), p_dato, p_detaljer,
          coalesce(p_status, 'ny'));
  return true;
exception when others then
  return false;
end $$;

create or replace function pg_temp.udlej(p_nr int, p_dato date, p_status text)
returns boolean
language plpgsql as $$
begin
  insert into public.udlejninger
    (lokation_id, reference, navn, telefon, dato, status)
  values ('proev-k', 'UD-K' || p_nr, 'Lejer ' || p_nr,
          '5060' || lpad(p_nr::text, 4, '0'), p_dato, coalesce(p_status, 'ny'));
  return true;
exception when others then
  return false;
end $$;

-- ------------------------------------------------------------
--  DETALJER
-- ------------------------------------------------------------
select pg_temp.svar('1. Et objekt i detaljer går igennem',
  pg_temp.foresp(1, 'catering', current_date + 30, 'ny',
    '{"type":"Privatfest","kuverter":35}'::jsonb));

select pg_temp.svar('2. En LISTE i detaljer afvises',
  not pg_temp.foresp(2, 'catering', current_date + 30, 'ny',
    '["Privatfest"]'::jsonb));

select pg_temp.svar('3. Fire tusind tegn er grænsen',
  not pg_temp.foresp(3, 'catering', current_date + 30, 'ny',
    jsonb_build_object('sludder', repeat('x', 5000))));

-- ------------------------------------------------------------
--  LISTEN OVER OPTAGNE DAGE
-- ------------------------------------------------------------
select pg_temp.svar('4. Visningen har KUN tre kolonner — ingen navne',
  (select count(*) = 3 and bool_and(column_name in ('lokation_id', 'dato', 'slags'))
     from information_schema.columns
    where table_schema = 'public' and table_name = 'optagne_dage'));

/* INDSÆTTELSEN SKAL VÆRE SIN EGEN SÆTNING.

   Første udgave skrev "select svar(..., indsæt() and exists(...))"
   — og prøve 5 og 7 meldte FEJLEDE om regler, der virkede fint.
   Grunden er Postgres' snapshot: en sætning ser databasen, som
   den så ud, da sætningen begyndte. Funktionen indsatte rækken,
   men EXISTS i den samme sætning kiggede på et billede fra før
   den fandtes. Prøverne herunder indsætter derfor først og
   spørger bagefter. */
select pg_temp.udlej(5, current_date + 40, 'bekraeftet');
select pg_temp.svar('5. En BEKRÆFTET udlejning gør dagen optaget',
  exists (select 1 from public.optagne_dage
           where lokation_id = 'proev-k' and dato = current_date + 40));

select pg_temp.foresp(6, 'selskab', current_date + 41, 'ny', null);
select pg_temp.svar('6. En NY forespørgsel optager INGENTING',
  exists (select 1 from public.forespoergsler where reference = 'FO-K6')
  and not exists (select 1 from public.optagne_dage
                   where lokation_id = 'proev-k' and dato = current_date + 41));

select pg_temp.foresp(7, 'selskab', current_date + 42, 'aftalt', '{"hvor":"hos-jer"}'::jsonb);
select pg_temp.svar('7. Et AFTALT selskab hos jer optager dagen',
  exists (select 1 from public.optagne_dage
           where lokation_id = 'proev-k' and dato = current_date + 42));

/* De to herunder er NEGATIVE prøver, og der skal begge dele
   tjekkes: rækken skal være oprettet, OG dagen skal stadig være
   fri. Uden det første ville prøven bestå, hvis indsættelsen
   fejlede af en helt anden grund. */
select pg_temp.foresp(8, 'selskab', current_date + 43, 'aftalt', '{"hvor":"ud-af-huset"}'::jsonb);
select pg_temp.svar('8. Et aftalt selskab UD AF HUSET optager ingenting',
  exists (select 1 from public.forespoergsler where reference = 'FO-K8')
  and not exists (select 1 from public.optagne_dage
                   where lokation_id = 'proev-k' and dato = current_date + 43));

select pg_temp.foresp(9, 'catering', current_date + 44, 'aftalt', null);
select pg_temp.svar('9. En aftalt CATERING optager ingenting',
  exists (select 1 from public.forespoergsler where reference = 'FO-K9')
  and not exists (select 1 from public.optagne_dage
                   where lokation_id = 'proev-k' and dato = current_date + 44));

do $$ begin
  update public.forespoergsler set slettet = now()
   where reference = 'FO-K7';
end $$;
select pg_temp.svar('10. En slettet aftale frigiver dagen igen',
  not exists (select 1 from public.optagne_dage
               where lokation_id = 'proev-k' and dato = current_date + 42));
do $$ begin
  update public.forespoergsler set slettet = null where reference = 'FO-K7';
end $$;

-- ------------------------------------------------------------
--  VÆRNET
-- ------------------------------------------------------------
select pg_temp.svar('11. Nummer to kan ikke få den optagne dag',
  not pg_temp.foresp(11, 'selskab', current_date + 40, 'ny', '{"hvor":"hos-jer"}'::jsonb));

select pg_temp.svar('12. Catering må gerne på den samme dag',
  pg_temp.foresp(12, 'catering', current_date + 40, 'ny', null));

select pg_temp.svar('13. Et selskab UD AF HUSET må gerne på den samme dag',
  pg_temp.foresp(13, 'selskab', current_date + 40, 'ny', '{"hvor":"ud-af-huset"}'::jsonb));

select pg_temp.svar('14. Baglokalet kan ikke lejes, når selskabet har dagen',
  not pg_temp.udlej(14, current_date + 42, 'ny'));

select pg_temp.svar('15. Uden en dato spærrer ingenting',
  pg_temp.foresp(15, 'selskab', null, 'ny', '{"hvor":"hos-jer"}'::jsonb));

select pg_temp.svar('16. To AFTALTE selskaber kan ikke stå på samme dag',
  pg_temp.foresp(16, 'selskab', current_date + 60, 'aftalt', '{"hvor":"hos-jer"}'::jsonb)
  and not pg_temp.foresp(17, 'selskab', current_date + 60, 'aftalt', '{"hvor":"hos-jer"}'::jsonb));

-- ------------------------------------------------------------
--  HÆRDNINGEN — de to ting, der gør værnet tavst, hvis de mangler
-- ------------------------------------------------------------
select pg_temp.svar('17. Værnet er security definer',
  (select p.prosecdef from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mosede_dagen_er_optaget'));

select pg_temp.svar('18. Værnets søgesti er låst',
  (select coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%'
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mosede_dagen_er_optaget'));

/* GÆSTEN MÅ SE DAGENE — OG KUN DAGENE. Prøven skifter til anon,
   præcis som en telefon på havnen, og prøver begge dele. Uden
   den her kunne visningen være rigtig og rettigheden glemt: så
   ville datovælgeren stå tom, og gæsten kunne bestille en dag,
   der var væk. */
set local role anon;
select pg_temp.svar('19. Gæsten må læse listen over optagne dage',
  (select count(*) >= 0 from public.optagne_dage where lokation_id = 'proev-k'));

do $$
declare kan boolean := true;
begin
  begin
    perform 1 from public.forespoergsler limit 1;
    kan := found;
  exception when insufficient_privilege then
    kan := false;
  end;
  perform pg_temp.svar('20. Gæsten må STADIG ikke læse forespørgslerne', not kan);
end $$;
reset role;

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

  raise exception E'\n====== RESULTATET AF FORESPØRGSELS-KALENDERENS PRØVE ======\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alle dens prøvedata rulles tilbage.\n'
    'Databasen er som før.\n\n'
    '%\n\n%\n'
    '============================================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 20 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
