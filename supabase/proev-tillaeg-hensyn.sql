-- ============================================================
--  PRØVE AF TILLÆGGET  (1. september 2026)
--  ------------------------------------------------------------
--  Kør EFTER tillaeg-hensyn.sql. Rapporten kommer til sidst som
--  én "fejl" — den ene kanal, Supabases SQL Editor altid viser,
--  og afbrydelsen er samtidig det, der rydder op.
--
--  ⚠️ DEN VIGTIGSTE ER PRØVE 5. Efter den her fil har HELE
--  menuen en pris på nær to varer, og de to har hver sin kendte
--  grund. Kommer der en tredje, er der en vare, gæsten kan se
--  men ikke bestille — og ingen ville opdage det, før nogen
--  spurgte efter den.
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

create or replace function pg_temp.pris(p_vare text) returns numeric
language sql stable as $$
  select v.pris from public.menu_varer v
    join public.menu_kategorier k on k.id = v.kategori_id
   where k.lokation_id = 'mosede' and v.navn = p_vare and v.aktiv and k.aktiv
   limit 1;
$$;

-- ------------------------------------------------------------
select pg_temp.svar('1. Kategorien siger, at det er et tillæg',
  exists (select 1 from public.menu_kategorier
           where lokation_id = 'mosede' and aktiv
             and navn = 'Tillæg: glutenfri, laktosefri og vegansk'
             and note like '%10 kr. pr. stk.%'));

select pg_temp.svar('2. De tre tillæg koster 10 kr.',
  pg_temp.pris('Glutenfrit brød (tillæg)') = 10
  and pg_temp.pris('Laktosefri (tillæg)') = 10
  and pg_temp.pris('Vegansk (tillæg)') = 10);

/* ⚠️ NAVNET SKAL SIGE DET. "Vegansk mad 10 kr." på et menukort
   læses som vegansk mad TIL ti kroner — og det er præcis den
   slags, huset ellers kalder en opdigtet pris. */
select pg_temp.svar('3. Navnene siger, at det er et tillæg',
  (select bool_and(v.navn like '%(tillæg)%')
     from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
    where k.navn = 'Tillæg: glutenfri, laktosefri og vegansk'
      and k.lokation_id = 'mosede' and v.aktiv));

/* De to, der ikke er et tillæg: ejeren stregede "Glutenfri mad"
   ud selv, og "Vegansk smørrebrød" var en vejviser til tre
   retter, der nu står som rigtige varer med hver sin pris. */
select pg_temp.svar('4. De to, der ikke er et tillæg, er slukket — men findes',
  pg_temp.pris('Glutenfri mad') is null
  and pg_temp.pris('Vegansk smørrebrød') is null
  and (select count(*) = 2 from public.menu_varer v
         join public.menu_kategorier k on k.id = v.kategori_id
        where k.lokation_id = 'mosede' and not v.aktiv
          and v.navn in ('Glutenfri mad', 'Vegansk smørrebrød')));

-- ------------------------------------------------------------
--  ⚠️ HELE MENUEN — kun to må stå uden pris, og vi ved hvorfor
-- ------------------------------------------------------------
select pg_temp.svar('5. Kun isbaren og morgenbrødet står uden pris',
  (select count(*) = 0
     from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
    where k.lokation_id = 'mosede' and v.aktiv and k.aktiv and v.pris is null
      and v.navn not like 'Isbar%' and v.navn <> 'Morgenbrød'));

/* Og de to SKAL stadig stå uden pris. Et tal på dem ville være
   et, vi selv havde fundet på: ejeren skrev "alt efter type og
   størrelse af event" og "SPØRG". */
select pg_temp.svar('6. …og de to har stadig ingen opdigtet pris',
  (select bool_and(v.pris is null)
     from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
    where k.lokation_id = 'mosede' and v.aktiv and k.aktiv
      and (v.navn like 'Isbar%' or v.navn = 'Morgenbrød')));

select pg_temp.svar('7. Ingen NYE dubletter er kommet til',
  (select count(*) <= 1 from (
     select lower(btrim(v.navn))
       from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
      where k.lokation_id = 'mosede' and v.aktiv and k.aktiv
      group by 1 having count(*) > 1) d));

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
  raise exception E'\n======= RESULTATET AF TILLÆGGETS PRØVE =======\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '=============================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 7 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end, rapport;
end $$;

rollback;
