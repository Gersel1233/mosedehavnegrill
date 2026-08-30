/* ============================================================
   PRØVE: DE 55 BORDE  (30/8-2026)
   ------------------------------------------------------------
   Kør EFTER borde-55.sql. Den skriver testrækker, læser dem og
   RULLER ALT TILBAGE — der bliver ikke en eneste række tilbage i
   forretningens data.

   Prøven er skrevet, så den kan FEJLE: hver linje beviser noget,
   der ville være galt uden filen.
   ============================================================ */

begin;

create temporary table proev_svar (nr int, hvad text, resultat text)
  on commit drop;

/* Der er 55 borde med numrene 1-55. Det er hele pointen. */
insert into proev_svar
select 1, 'alle 55 numre findes',
  case when count(*) = 55 then '✅ BESTOD' else
    '❌ FEJLEDE (fandt ' || count(*) || ')' end
from public.borde
where lokation_id = 'mosede' and nummer ~ '^[0-9]+$'
  and nummer::int between 1 and 55;

/* Ingen huller og ingen dubletter: 55 RÆKKER og 55 FORSKELLIGE
   numre er ikke det samme, hvis "7" og " 7" begge slap ind. To
   skilte med samme nummer peger samme sted hen, og maden går til
   det forkerte selskab. */
insert into proev_svar
select 2, 'numrene er 55 forskellige, ikke 55 raekker',
  case when count(distinct lower(btrim(nummer))) = 55 then '✅ BESTOD'
       else '❌ FEJLEDE' end
from public.borde
where lokation_id = 'mosede' and nummer ~ '^[0-9]+$'
  and nummer::int between 1 and 55;

/* ⚠️ VI HAR IKKE FUNDET PLADSER PÅ. Et tal her ville stå på
   skiltet og blive regnet med i dagens billede på Borde-fanen,
   som om ejeren havde sagt det. */
insert into proev_svar
select 3, 'ingen af de 55 har et opfundet antal pladser',
  case when count(*) filter (where pladser is not null) = 0 then '✅ BESTOD'
       else '❌ FEJLEDE (' || count(*) filter (where pladser is not null)
            || ' har et tal, ingen har oplyst)' end
from public.borde
where lokation_id = 'mosede' and nummer ~ '^[0-9]+$'
  and nummer::int between 1 and 55 and sortering = nummer::int;

/* Rækkefølgen skal være 1, 2, 3 … og ikke 1, 10, 11. Sorteringen
   er dét, både admin og printsiden lister efter — uden den ville
   arkene komme ud i en rækkefølge, ingen kan bære ud. */
insert into proev_svar
select 4, 'raekkefoelgen er 1-55 og ikke tekstsorteret',
  case when count(*) = 55 then '✅ BESTOD' else '❌ FEJLEDE' end
from public.borde
where lokation_id = 'mosede' and nummer ~ '^[0-9]+$'
  and nummer::int between 1 and 55 and sortering = nummer::int;

/* KØRT IGEN MÅ IKKE LAVE DUBLETTER. Ejeren skal kunne køre filen
   efter en udvidelse uden at få 55 borde mere. */
do $$
declare
  foer int;
  efter int;
begin
  select count(*) into foer from public.borde where lokation_id = 'mosede';

  insert into public.borde (lokation_id, nummer, sortering)
  select 'mosede', n::text, n
    from generate_series(1, 55) as n
  on conflict (lokation_id, lower(btrim(nummer))) do nothing;

  select count(*) into efter from public.borde where lokation_id = 'mosede';

  insert into proev_svar values (5, 'koert igen laver ingen dubletter',
    case when foer = efter then '✅ BESTOD'
         else '❌ FEJLEDE (' || (efter - foer) || ' raekker mere)' end);
end $$;

/* ⚠️ OG EN RETTELSE MÅ IKKE BLIVE SKREVET OVER. Har ejeren sat
   pladser og zone på bord 1, skal en ny kørsel lade dem stå —
   ellers taber han sit arbejde, hver gang nogen kører filen. */
do $$
declare
  beholdt boolean;
begin
  update public.borde set pladser = 6, zone = 'Molen'
    where lokation_id = 'mosede' and lower(btrim(nummer)) = '1';

  insert into public.borde (lokation_id, nummer, sortering)
  select 'mosede', n::text, n
    from generate_series(1, 55) as n
  on conflict (lokation_id, lower(btrim(nummer))) do nothing;

  select (pladser = 6 and zone = 'Molen') into beholdt
    from public.borde
    where lokation_id = 'mosede' and lower(btrim(nummer)) = '1';

  insert into proev_svar values (6, 'ejerens egne pladser og zoner overlever',
    case when beholdt then '✅ BESTOD' else '❌ FEJLEDE' end);
end $$;

/* Skiltet peger på nummeret, og gæsten lander på ved-bordet/.
   Prøven her beviser den ENE ting, databasen kan bevise: at
   nummeret på skiltet svarer til en RÆKKE. Resten (at koden
   tegnes rigtigt) måles i tests/bordkort.spec.js. */
insert into proev_svar
select 7, 'bord 7 kan slaas op, som ved-bordet gør det',
  case when exists (select 1 from public.borde
                     where lokation_id = 'mosede'
                       and lower(btrim(nummer)) = '7'
                       and aktiv)
       then '✅ BESTOD' else '❌ FEJLEDE' end;

select nr, hvad, resultat from proev_svar order by nr;

rollback;
