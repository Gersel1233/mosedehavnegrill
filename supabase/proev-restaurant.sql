-- ============================================================
--  PRØVE AF RESTAURANT-MODE  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER restaurant.sql. Rapporten kommer til sidst som én
--  "fejl" — den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der rydder op.
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

create or replace function pg_temp.bord_bestilling(p_status text, p_bord text)
returns bigint language plpgsql as $$
declare n int := nextval('pg_temp.pnr'); id bigint;
begin
  insert into public.bestillinger
    (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
     linjer, antal, status, hvordan, bord_nummer)
  values ('SM-PROEV-' || lpad(n::text, 5, '0'), 'mosede', 'Prøve ' || n,
          '0000' || lpad(n::text, 4, '0'), current_date,
          ('11:00'::time + (n || ' minutes')::interval)::time,
          '[{"navn":"Havnens burger","antal":1,"pris":80}]'::jsonb, 1,
          p_status, 'spis_her', p_bord)
  returning bestillinger.id into id;
  return id;
end $$;

/* BORDET SKAL FINDES FØRST. bordkort.sql har en bremse,
   bestilling_ukendt_bord, der afviser en bestilling til et bord,
   ingen har oprettet — ellers kunne en gættet adresse sende mad
   til et bord, der ikke står der. Prøven ramte den med det samme,
   og det er dét, den er til for. */
insert into public.borde (lokation_id, nummer, zone, pladser)
values ('mosede', '7', 'Terrassen', 4);

-- ------------------------------------------------------------
--  KØKKENETS TRIN
-- ------------------------------------------------------------
select pg_temp.svar('1. En bordbestilling kan sættes i gang',
  pg_temp.bord_bestilling('tilberedes', '7') is not null);

select pg_temp.svar('2. Og den kan serveres',
  pg_temp.bord_bestilling('serveret', '7') is not null);

/* DE GAMLE TRIN SKAL STADIG VIRKE. Reglen erstattes af den her
   fil, og en erstatning, der glemmer et af de gamle navne, ville
   låse fanen Bestillinger uden en fejl, nogen kan se. */
select pg_temp.svar('3. Ud af huset kan stadig bekræftes og afhentes',
  pg_temp.bord_bestilling('bekraeftet', null) is not null
  and pg_temp.bord_bestilling('afhentet', null) is not null);

select pg_temp.svar('4. Afvist og udeblevet er der endnu',
  pg_temp.bord_bestilling('afvist', null) is not null
  and pg_temp.bord_bestilling('udeblevet', null) is not null);

/* Listen skal være LUKKET. En status, ingen skærm kender, ville
   lande i databasen og aldrig blive vist for nogen — bestillingen
   ville forsvinde fra køkkenets kø uden at være lavet. */
do $$
declare gik boolean := false;
begin
  begin
    perform pg_temp.bord_bestilling('paa_vej_ud', '7');
  exception when check_violation then gik := true;
  end;
  perform pg_temp.svar('5. En ukendt status bliver afvist', gik);
end $$;

-- ------------------------------------------------------------
--  BORDNUMMERET ER ADSKILLELSEN
-- ------------------------------------------------------------
/* ⚠️ DET ER DEN SAMME TABEL, OG SKÆRMEN FILTRERER. Køkkenet har
   ÉN kø; to tabeller ville være to lister, nogen skal huske at
   kigge i. Prøven måler, at de to kan skilles ad med ét udtryk. */
select pg_temp.svar('6. Bordbestillinger kan skilles fra webbestillinger',
  (select count(*) = 2 from public.bestillinger
    where bord_nummer is not null and reference like 'SM-PROEV-%')
  and (select count(*) = 4 from public.bestillinger
    where bord_nummer is null and reference like 'SM-PROEV-%'));

/* Databasen binder bordet til "spis her". En bestilling med et
   bordnummer og en afhentning er noget, køkkenet ikke kan udføre:
   maden står ved lugen, mens gæsten sidder ved bord 7. */
do $$
declare gik boolean := false;
begin
  begin
    insert into public.bestillinger
      (reference, lokation_id, navn, telefon, hent_dato, hent_tid,
       linjer, antal, hvordan, bord_nummer)
    values ('SM-PROEV-BORD-FEJL', 'mosede', 'Prøve', '00008888',
            current_date, '13:37', '[]'::jsonb, 1, 'afhentning', '7');
  exception when check_violation then gik := true;
  end;
  perform pg_temp.svar('7. Et bordnummer kræver stadig "spis her"', gik);
end $$;

-- ------------------------------------------------------------
--  ZONEN
-- ------------------------------------------------------------
insert into public.borde (lokation_id, nummer, zone, pladser)
values ('mosede', 'PROEV-1', 'Terrassen', 4);

select pg_temp.svar('8. Bordet kan få en zone',
  (select zone = 'Terrassen' from public.borde where nummer = 'PROEV-1'));

/* Fri tekst og ikke en liste: havnen hedder det, den hedder, og
   en check-regel med tre navne ville betyde en SQL-fil den dag,
   der kom et fjerde hjørne. */
insert into public.borde (lokation_id, nummer, zone)
values ('mosede', 'PROEV-2', 'Bag ved isbaren');

select pg_temp.svar('9. Zonen er fri tekst, ikke en fast liste',
  (select zone = 'Bag ved isbaren' from public.borde where nummer = 'PROEV-2'));

/* Zonen er FRIVILLIG. De borde, der allerede står i basen, har
   ingen — og de skal blive ved med at virke. */
insert into public.borde (lokation_id, nummer) values ('mosede', 'PROEV-3');

select pg_temp.svar('10. Et bord kan stå uden zone',
  (select zone is null from public.borde where nummer = 'PROEV-3'));

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
  raise exception E'\n====== RESULTATET AF RESTAURANT-PRØVEN ======\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '=============================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 10 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
