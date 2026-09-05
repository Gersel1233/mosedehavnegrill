-- ============================================================
--  PRØVE AF EJERENS LISTE  (august 2026)
--  ------------------------------------------------------------
--  Kør EFTER menukort-ejerens-liste.sql. Hver prøve skriver
--  BESTOD eller FEJLEDE, og rapporten kommer til sidst som én
--  "fejl" — det er den ene kanal, Supabases SQL Editor altid
--  viser, og afbrydelsen er samtidig det, der ruller prøvens
--  data tilbage.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Et menukort fejler ikke med en fejlmeddelelse. Det fejler ved
--  at have to rækker, der hedder næsten det samme, med hver sin
--  pris — og det opdager ingen, før en gæst betaler det forkerte.
--
--  Prøverne måler derfor tre ting, som ikke kan ses ved at kigge
--  på kortet: at hullerne er lukket, at der ikke er kommet
--  dubletter, og at ingen ny vare har fået en pris, ejeren ikke
--  har oplyst.
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

-- Findes varen i den kategori, den skal ligge i?
create or replace function pg_temp.har(p_kategori text, p_vare text) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.menu_varer m
      join public.menu_kategorier k on k.id = m.kategori_id
     where k.lokation_id = 'mosede'
       and k.navn = p_kategori
       and lower(btrim(m.navn)) = lower(btrim(p_vare)));
$$;

-- ------------------------------------------------------------
--  DEN NYE KATEGORI
-- ------------------------------------------------------------
/* ⚠️ NAVNET BLEV LAVET OM 1/9, OG PRØVEN VIDSTE DET IKKE.
   supabase/tillaeg-hensyn.sql døbte kategorien om til
   "Tillæg: glutenfri, laktosefri og vegansk", fordi ejeren
   svarede, at det ER et tillæg på 10 kr. og ikke en ret. Prøven
   her ledte stadig efter det gamle navn — og ville altså give
   TRE røde i en produktion, hvor alt er, som det skal være.
   Det er værre end ingen prøve: en rød linje på et sundt system
   sender nogen ud at "rette" noget, der er rigtigt.

   Den slår kategorien op på de tre ORD nu, ikke på hele navnet,
   så en ny forstavelse ikke fælder den igen. */
select pg_temp.svar('1. Kategorien til glutenfri, laktosefri og vegansk findes',
  exists (select 1 from public.menu_kategorier
           where lokation_id = 'mosede'
             and navn ilike '%glutenfri%'
             and navn ilike '%laktosefri%'
             and navn ilike '%vegansk%'));

select pg_temp.svar('2. Alle fem hensyn står i den',
  (select count(*) = 5 from public.menu_varer m
     join public.menu_kategorier k on k.id = m.kategori_id
    where k.lokation_id = 'mosede'
      and k.navn ilike '%glutenfri%'
      and k.navn ilike '%laktosefri%'
      and k.navn ilike '%vegansk%'));

-- ------------------------------------------------------------
--  DE SYV, DER MANGLEDE
-- ------------------------------------------------------------
select pg_temp.svar('3. Fransk hotdog står i to størrelser',
  pg_temp.har('Pølser', 'Fransk hotdog, alm.')
  and pg_temp.har('Pølser', 'Fransk hotdog, stor'));

select pg_temp.svar('4. Pølsemix og den lune frikadelle er på pladen',
  pg_temp.har('Sandwich og retter fra pladen', 'Pølsemix')
  and pg_temp.har('Sandwich og retter fra pladen', 'Hjemmelavet lun frikadelle'));

select pg_temp.svar('5. Frikadelle med surt er kommet i fyldet',
  pg_temp.har('Vælg fyld til smørrebrødet', 'Frikadelle med surt'));

select pg_temp.svar('6. Bægeret med vaffelknas står under isen',
  pg_temp.har('Softice og vafler', 'Bæger med vaffelknas, softice og topping'));

select pg_temp.svar('7. Isbaren står under tilkøb',
  pg_temp.har('Tilkøb ud af huset', 'Isbar med eller uden betjening'));

-- ------------------------------------------------------------
--  INDHOLDET, EJEREN HAR SKREVET
-- ------------------------------------------------------------
select pg_temp.svar('8. Tapasfadet siger, hvad der er på det',
  (select beskrivelse like '%serranoskinke%' and beskrivelse like '%tzatziki%'
     from public.menu_varer where navn = 'Tapasfad' limit 1));

select pg_temp.svar('9. Brunchtallerkenen og den engelske morgenmad er skrevet ud',
  (select beskrivelse like '%skyr med knas%' from public.menu_varer
    where navn = 'Brunchtallerken' limit 1)
  and (select beskrivelse like '%stegte champignon%' from public.menu_varer
        where navn = 'English breakfast' limit 1));

select pg_temp.svar('10. Sandwichens fyld står på begge størrelser',
  (select count(*) = 2 from public.menu_varer
    where navn in ('Sandwich, lille', 'Sandwich, stor')
      and beskrivelse like '%wienersalat%'));

-- ------------------------------------------------------------
--  NOTEN PÅ KATEGORIEN
-- ------------------------------------------------------------
select pg_temp.svar('11. Kategorien kan bære en note',
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'menu_kategorier'
             and column_name = 'note'));

select pg_temp.svar('12. Pindemaden siger, hvad den er lavet på',
  (select note = 'På toastbrød eller rugbrød' from public.menu_kategorier
    where lokation_id = 'mosede' and navn = 'Reception og pindemad'));

select pg_temp.svar('13. En note kan ikke blive en hel roman',
  (select not exists (
     select 1 from public.menu_kategorier
      where note is not null and char_length(note) > 200)));

-- ------------------------------------------------------------
--  DE TO REGLER, DER BÆRER HELE KORTET
-- ------------------------------------------------------------
/* EN DUBLET ER VÆRRE END EN MANGLENDE VARE. To rækker med samme
   navn i samme kategori får hver sin pris, og så er det
   tilfældigt, hvad gæsten betaler. */
select pg_temp.svar('14. Ingen kategori har to varer med samme navn',
  not exists (
    select 1 from public.menu_varer m
      join public.menu_kategorier k on k.id = m.kategori_id
     where k.lokation_id = 'mosede'
     group by m.kategori_id, lower(btrim(m.navn))
    having count(*) > 1));

select pg_temp.svar('15. Ingen forretning har to kategorier med samme navn',
  not exists (
    select 1 from public.menu_kategorier
     where lokation_id = 'mosede'
     group by lokation_id, lower(btrim(navn))
    having count(*) > 1));

/* ⚠️ HER STOD PRØVE 16: "Ingen af de nye varer har fået en
   opfundet pris" — og den er FJERNET med vilje (5/9).

   Reglen var rigtig den 24/8: ejerens liste havde ikke ét tal i
   sig, så de tolv nye varer skulle stå uden pris. Men 1/9 kom
   hans EGNE prislister (kortets-priser-3.sql), og fem af dem fik
   et rigtigt tal — Fransk hotdog 40/50, Pølsemix, Frikadelle med
   surt 55, bægeret 40. Samme dag satte tillaeg-hensyn.sql de
   fire hensyn til ejerens 10 kr.

   En prøve, der kræver "ingen pris", kan altså ikke overleve, at
   ejeren prissætter — og MÅLT gav den TRE røde linjer i en
   produktion, hvor alt var, som det skulle være. Det er værre
   end ingen prøve: en rød linje på et sundt system sender nogen
   ud at "rette" noget, der er rigtigt.

   ⚠️ DÆKNINGEN FORSVINDER IKKE, DEN FLYTTER. Spørgsmålet "har en
   vare fået en pris, ingen har sagt?" stilles nu ét sted, hvor
   det kan besvares sandt: proev-kortets-priser-3.sql prøve 12 —
   "Hver eneste vare uden pris har en kendt grund" — og
   proev-tillaeg-hensyn.sql, der måler ejerens 10 kr. */

/* DER ER IKKE SLETTET NOGET. Var der en vare i databasen, som
   ikke stod på ejerens liste, kan den være lagt ind med vilje —
   den står som et spørgsmål i rapporten, ikke i skraldespanden. */
select pg_temp.svar('17. De varer, der var der i forvejen, står der endnu',
  pg_temp.har('Pølser', 'Hansen fransk vaffel, stor')
  and pg_temp.har('Vælg fyld til smørrebrødet', 'Fiskedelle med surt')
  and pg_temp.har('Sandwich og retter fra pladen', 'Indbagte rejer med pommes'));

select pg_temp.svar('18. Kortet er vokset, ikke skrumpet',
  (select count(*) >= 242 from public.menu_varer m
     join public.menu_kategorier k on k.id = m.kategori_id
    where k.lokation_id = 'mosede'));

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

  raise exception E'\n========= RESULTATET AF MENUKORTETS PRØVE =========\n'
    'Den røde farve er IKKE en fejl i databasen: prøven standser\n'
    'sig selv her, så alt er som før.\n\n'
    '%\n\n%\n'
    '===================================================',
    case when fejl = 0
      /* ⚠️ TALLET LÆSES AF PRØVERNE, IKKE SKREVET AF I HÅNDEN.
         Der stod 18 fast, mens der er 17 prøver tilbage (16 er
         flyttet, se noten) — og rapporten sagde derfor "ALLE 17
         AF 18 BESTOD", som er en sætning, ingen kan bruge til
         noget. Nu kan de to tal ikke komme i uenighed. */
      then 'ALLE ' || antal || ' AF ' || antal || ' BESTOD.'
      else fejl || ' AF ' || antal || ' FEJLEDE — se linjerne herunder.'
    end,
    rapport;
end $$;

rollback;
