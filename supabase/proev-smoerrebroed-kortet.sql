-- ============================================================
--  PRØVE AF SMØRREBRØDSKORTENE  (1. september 2026)
--  ------------------------------------------------------------
--  Kør EFTER smoerrebroed-kortet.sql. Rapporten kommer til sidst
--  som én "fejl" — den ene kanal, Supabases SQL Editor altid
--  viser, og afbrydelsen er samtidig det, der rydder op.
--
--  ⚠️ DEN VIGTIGSTE PRØVE ER NR. 5. De to kort sælger det SAMME
--  fyld til to priser, og både pris-værnet og udsolgt-værnet i
--  databasen slår op på `lower(btrim(navn))` PÅ TVÆRS af
--  kategorier. Hed de to rækker det samme, kunne køkkenet melde
--  den hele skive udsolgt, og gæsten kunne bestille den
--  alligevel — uden en fejl nogen steder. Prøve 5 og 6 måler
--  præcis dét, og prøve 6 gør det ved at SPØRGE værnets egen
--  betingelse, ikke ved at læse navnene.
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

create or replace function pg_temp.antal(p_kat text) returns int
language sql stable as $$
  select count(*)::int from public.menu_varer v
    join public.menu_kategorier k on k.id = v.kategori_id
   where k.lokation_id = 'mosede' and k.navn = p_kat and v.aktiv and k.aktiv;
$$;

-- ------------------------------------------------------------
--  DE TO KATEGORIER
-- ------------------------------------------------------------
select pg_temp.svar('1. Håndmadderne har fået deres egen kategori',
  exists (select 1 from public.menu_kategorier
           where lokation_id = 'mosede' and navn = 'Håndmadder' and aktiv));

select pg_temp.svar('2. Begge kategorier bærer kortets egen manchet',
  (select count(*) = 2 from public.menu_kategorier
    where lokation_id = 'mosede' and aktiv
      and navn in ('Smørrebrød', 'Håndmadder')
      and note is not null and note like '%rugbrød%'));

-- ------------------------------------------------------------
--  DE 48 (+ tomatmaden)
-- ------------------------------------------------------------
select pg_temp.svar('3. Alle 24 håndmadder står til 27 kr.',
  pg_temp.antal('Håndmadder') = 24
  and (select bool_and(v.pris = 27) from public.menu_varer v
         join public.menu_kategorier k on k.id = v.kategori_id
        where k.navn = 'Håndmadder' and k.lokation_id = 'mosede' and v.aktiv));

select pg_temp.svar('4. De 25 hele skiver står til 55 kr.',
  (select count(*) = 25 from public.menu_varer v
     join public.menu_kategorier k on k.id = v.kategori_id
    where k.navn = 'Smørrebrød' and k.lokation_id = 'mosede'
      and v.aktiv and v.pris = 55));

-- ------------------------------------------------------------
--  ⚠️ NAVNENE MÅ IKKE VÆRE ENS — hele fundamentet
-- ------------------------------------------------------------
select pg_temp.svar('5. Ingen håndmad hedder det samme som en hel skive',
  (select count(*) = 0 from (
     select lower(btrim(v.navn)) as n
       from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
      where k.lokation_id = 'mosede' and v.aktiv and k.aktiv
        and k.navn in ('Smørrebrød', 'Håndmadder')
      group by 1 having count(*) > 1) d));

/* ⚠️ PRØVE 6 SPØRGER VÆRNETS EGEN BETINGELSE og læser ikke
   navnene. Den melder den HELE skive udsolgt og spørger, om
   udsolgt-værnet så ville afvise navnet. Svarer det nej, kan
   gæsten bestille en udsolgt vare — og det er præcis det hul,
   suffikset lukker. Et spørgsmål til navnelisten ville bestå,
   også hvis værnet var skruet anderledes sammen. */
select pg_temp.svar('6. Meldes den hele skive udsolgt, er den også væk for gæsten',
  (with maal as (
     select v.id, lower(btrim(v.navn)) as n
       from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
      where k.navn = 'Smørrebrød' and k.lokation_id = 'mosede'
        and v.aktiv and v.pris = 55 limit 1),
   som_udsolgt as (
     select m.n,
            /* værnets egen betingelse: findes navnet, men er
               HVER eneste række med det navn væk? */
            not exists (
              select 1 from public.menu_varer v2
                join public.menu_kategorier k2 on k2.id = v2.kategori_id
               where lower(btrim(v2.navn)) = m.n
                 and (k2.lokation_id is null or k2.lokation_id = 'mosede')
                 and v2.aktiv and k2.aktiv and not v2.udsolgt
                 and v2.id <> m.id) as afvises
       from maal m)
   select afvises from som_udsolgt));

-- ------------------------------------------------------------
--  DEN GAMLE MODEL
-- ------------------------------------------------------------
select pg_temp.svar('7. Fyldlisten er slukket',
  not exists (select 1 from public.menu_kategorier
               where lokation_id = 'mosede'
                 and navn = 'Vælg fyld til smørrebrødet' and aktiv));

/* ⚠️ SLUKKET, IKKE SLETTET. De 32 rækker bærer ejerens egne
   navne, og fjorten af dem står ikke på det trykte kort —
   forsvandt de helt, ville de skulle skrives ind igen i hånden. */
select pg_temp.svar('8. …men de 32 fyldrækker findes stadig',
  (select count(*) >= 32 from public.menu_varer v
     join public.menu_kategorier k on k.id = v.kategori_id
    where k.lokation_id = 'mosede' and k.navn = 'Vælg fyld til smørrebrødet'));

select pg_temp.svar('9. De generiske "Smørrebrød" og "Håndmad" er væk',
  not exists (
    select 1 from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
     where k.lokation_id = 'mosede' and v.aktiv and k.aktiv
       and lower(btrim(v.navn)) in ('smørrebrød', 'håndmad', 'håndmadder')));

-- ------------------------------------------------------------
--  DE TRE MED EGEN PRIS — kortenes nederste kasse
-- ------------------------------------------------------------
select pg_temp.svar('10. Rejemad 85 og tartar 99 findes KUN som hel skive',
  (select count(*) = 2 from public.menu_varer v
     join public.menu_kategorier k on k.id = v.kategori_id
    where k.navn = 'Smørrebrød' and k.lokation_id = 'mosede' and v.aktiv
      and (v.navn = 'Rejemad med mayo og citron' and v.pris = 85
        or v.navn = 'Tartar' and v.pris = 99))
  and not exists (
    select 1 from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
     where k.navn = 'Håndmadder' and k.lokation_id = 'mosede' and v.aktiv
       and (v.navn ilike 'Rejemad%' or v.navn ilike 'Tartar%')));

/* Ejeren gav ÉN pris på tomatmaden (55). En håndmad til 27 ville
   være et tal, vi selv havde fundet på. */
select pg_temp.svar('11. Tomatmaden er hel skive til 55 og har ingen håndmad',
  (select pris = 55 from public.menu_varer v
     join public.menu_kategorier k on k.id = v.kategori_id
    where k.navn = 'Smørrebrød' and k.lokation_id = 'mosede' and v.navn = 'Tomatmad')
  and not exists (
    select 1 from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
     where k.navn = 'Håndmadder' and k.lokation_id = 'mosede' and v.navn ilike 'Tomatmad%'));

-- ------------------------------------------------------------
--  HELE MENUEN — kun de fire kendte grunde må stå uden pris
-- ------------------------------------------------------------
select pg_temp.svar('12. Alt andet end de syv kendte har en pris',
  (select count(*) = 0
     from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
    where k.lokation_id = 'mosede' and v.aktiv and k.aktiv and v.pris is null
      and k.navn <> 'Glutenfri, laktosefri og vegansk'
      and v.navn not like 'Isbar%' and v.navn <> 'Morgenbrød'));

select pg_temp.svar('13. Ingen NYE dubletter er kommet til',
  (select count(*) <= 1 from (
     select lower(btrim(v.navn))
       from public.menu_varer v join public.menu_kategorier k on k.id = v.kategori_id
      where k.lokation_id = 'mosede' and v.aktiv and k.aktiv
      group by 1 having count(*) > 1) d));

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

  raise exception E'\n===== RESULTATET AF SMØRREBRØDETS PRØVE =====\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '=============================================',
    case when fejl = 0
      then 'ALLE ' || antal || ' AF 13 BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
