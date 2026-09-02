-- ============================================================
--  PRØVE AF ROLLERNE: EJER OG MEDARBEJDER  (2. sep 2026)
--  ------------------------------------------------------------
--  Kør EFTER roller.sql. Rapporten kommer til sidst som én
--  "fejl" — den ene kanal, Supabases SQL Editor altid viser, og
--  afbrydelsen er samtidig det, der rydder op.
--
--  ⚠️ DEN HER FIL PRØVER ADGANGSKONTROL, og så er den ene
--  halvdel af prøverne vigtigere end den anden: at ejeren KAN
--  noget, er rart. At medarbejderen IKKE kan, er værnet.
--  Derfor kommer de parvis — kan ejeren, kan medarbejderen ikke.
--
--  ⚠️ OG PRØVEN LAVER SIN EGEN FORRETNING. Den rører ikke
--  Mosedes rækker: tre fald 2/9 skyldtes prøver, der lånte
--  ejerens data og arvede alt, hvad der stod på dem.
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

/* Prøver noget og siger, om det gik — uden at vælte arket.
   ⚠️ Den svarer med BESKEDEN og ikke bare ja/nej: en prøve, der
   kun spørger "blev det afvist?", består af enhver grund. Det
   kostede tre runder 2/9. */
create or replace function pg_temp.proev(sql text) returns text
language plpgsql as $$
begin
  execute sql;
  return 'gik igennem';
exception when others then return coalesce(sqlerrm, '?');
end $$;

-- ------------------------------------------------------------
--  Prøvens egen forretning, egen menu og eget hold
-- ------------------------------------------------------------
insert into public.lokationer (id, navn, adresse, postnr, by, aktiv, sortering)
values ('proev-rolle', 'Prøveforretning', 'Prøvevej 1', '2670', 'Greve', true, 99);

insert into public.aabningstider (lokation_id, ugedag, lukket, aabner, lukker)
select 'proev-rolle', g, false, '11:00', '21:00' from generate_series(0,6) g;

insert into public.admin_adgang (email, lokation_id, rolle, aktiv, navn) values
  ('chef@proev.dk',  'proev-rolle', 'ejer',        true,  'Chefen'),
  ('lone@proev.dk',  'proev-rolle', 'medarbejder', true,  'Lone'),
  ('stop@proev.dk',  'proev-rolle', 'ejer',        false, 'Holdt op');

insert into public.menu_kategorier (lokation_id, navn, afdeling, aktiv, sortering)
values ('proev-rolle', 'Prøvemad', 'mad', true, 1);

insert into public.menu_varer (kategori_id, navn, pris, aktiv, udsolgt, sortering)
select id, 'Prøveret', 55, true, false, 1
  from public.menu_kategorier where lokation_id = 'proev-rolle';

insert into public.indstillinger (lokation_id, noegle, vaerdi)
values ('proev-rolle', 'proev_noegle', '"foer"'::jsonb);

/* ⚠️ `tabel` og `hvad` har hver sit check i logbog.sql — et gæt
   som 'menu_varer'/'ret' fælder hele arket. */
insert into public.logbog (lokation_id, tabel, raekke_id, hvad, hvem)
values ('proev-rolle', 'bestillinger', 1, 'rettet', 'chef@proev.dk');

set local role authenticated;


-- ============================================================
--  EJEREN KAN DET, HAN SKAL
-- ============================================================
set local request.jwt.claims = '{"email":"chef@proev.dk"}';

select pg_temp.svar('1. Ejeren er ejer, og admin ved det',
  public.er_ejer_for('proev-rolle') and public.min_rolle() = 'ejer');

select pg_temp.svar('2. Ejeren kan rette en pris',
  pg_temp.proev($$update public.menu_varer set pris = 60
                   where navn = 'Prøveret'$$) = 'gik igennem');

select pg_temp.svar('3. Ejeren kan rette en indstilling',
  pg_temp.proev($$update public.indstillinger set vaerdi = '"efter"'::jsonb
                   where lokation_id = 'proev-rolle'$$) = 'gik igennem');


-- ============================================================
--  ⚠️ OG MEDARBEJDEREN KAN DET IKKE — DET ER VÆRNET
-- ============================================================
set local request.jwt.claims = '{"email":"lone@proev.dk"}';

select pg_temp.svar('4. Medarbejderen er medarbejder, og admin ved det',
  public.is_admin_for('proev-rolle') and not public.er_ejer_for('proev-rolle')
  and public.min_rolle() = 'medarbejder');

/* ⚠️ DEN HER ER DAGEN, og den skal blive ved med at virke. En
   rolle, der spærrer for at melde udsolgt, ville betyde, at
   køkkenet skal ringe efter chefen midt i en frokost. */
select pg_temp.svar('5. Medarbejderen KAN melde en vare udsolgt',
  pg_temp.proev($$update public.menu_varer set udsolgt = true
                   where navn = 'Prøveret'$$) = 'gik igennem');

select pg_temp.svar('6. Medarbejderen kan IKKE rette prisen',
  pg_temp.proev($$update public.menu_varer set pris = 1
                   where navn = 'Prøveret'$$) like '%kun_ejeren_saetter_priser%');

/* ⚠️ RLS SVARER IKKE MED EN FEJL — den lader bare være med at
   ramme nogen rækker. Derfor måles VÆRDIEN og ikke beskeden.

   ⚠️ OG FORSØGET SKAL VÆRE SIN EGEN SÆTNING. Første udgave gjorde
   begge dele i ÉN select — og et statement ser sit eget
   øjebliksbillede fra FØR det begyndte, så aflæsningen gav altid
   det gamle tal. Prøven bestod med værnet slået fra; MÅLT, ikke
   gættet. Det er husets regel om, at ét af tallene skal komme
   udefra, i en ny forklædning: her skal det komme fra en anden
   SÆTNING. */
select pg_temp.proev($$update public.indstillinger set vaerdi = '"lone"'::jsonb
                        where lokation_id = 'proev-rolle'$$);

select pg_temp.svar('7. Medarbejderen kan IKKE rette en indstilling',
  (select vaerdi from public.indstillinger
    where lokation_id = 'proev-rolle' and noegle = 'proev_noegle') = '"efter"'::jsonb);

select pg_temp.proev($$update public.aabningstider set aabner = '06:00'
                        where lokation_id = 'proev-rolle'$$);

select pg_temp.svar('8. Medarbejderen kan IKKE rette åbningstiderne',
  (select count(*) = 0 from public.aabningstider a
    where a.lokation_id = 'proev-rolle' and a.aabner = '06:00'::time));

/* ⚠️ OG DER SKAL STÅ NOGET I LOGBOGEN. Første udgave talte til
   nul på en TOM tabel — den bestod, uanset om Lone måtte læse
   den. Rækken lægges ind ovenfor, og chefen tæller den med sine
   egne øjne til sidst (prøve 9b). */
select pg_temp.svar('9. Medarbejderen kan IKKE læse logbogen',
  (select count(*) = 0 from public.logbog where lokation_id = 'proev-rolle'));

/* ⚠️ DEN FARLIGSTE: kan hun give sig selv mere, er alt det
   andet ligegyldigt. */
select pg_temp.proev($$update public.admin_adgang set rolle = 'ejer'
                        where email = 'lone@proev.dk'$$);

select pg_temp.svar('10. Medarbejderen kan IKKE gøre sig selv til ejer',
  (select rolle from public.admin_adgang where email = 'lone@proev.dk') = 'medarbejder');

/* ⚠️ OG SVARET SKAL HENTES UDEFRA. Første udgave slettede som
   Lone og talte rækkerne SOM LONE bagefter — men hun kan slet
   ikke SE chefens række, så tallet var 0, uanset om sletningen
   virkede. Prøven bestod med værnet fjernet.

   Husets egen regel: ét af tallene skal komme udefra. Her er
   det chefen, der kigger efter. */
select pg_temp.proev($$delete from public.admin_adgang
                        where email = 'chef@proev.dk'$$);

-- Chefens øjne: det er ham, der kan se, om rækken er der.
set local request.jwt.claims = '{"email":"chef@proev.dk"}';
select pg_temp.svar('11. Medarbejderen kan IKKE lukke ejeren ude',
  (select count(*) = 1 from public.admin_adgang
    where email = 'chef@proev.dk' and aktiv and rolle = 'ejer'));

set local request.jwt.claims = '{"email":"lone@proev.dk"}';

/* ⚠️ MEN HUN SKAL SE SIN EGEN RÆKKE. Uden den kan admin ikke
   sige "du er medarbejder", og så ved hun ikke, hvorfor en knap
   mangler. */
select pg_temp.svar('12. Medarbejderen ser sin EGEN række — men ikke holdets',
  (select count(*) = 1 from public.admin_adgang where lokation_id = 'proev-rolle'));


-- ============================================================
--  ⚠️ EN DEAKTIVERET HAR INGEN ADGANG — HELLER IKKE SOM EJER
-- ============================================================
set local request.jwt.claims = '{"email":"stop@proev.dk"}';

select pg_temp.svar('13. En slukket ejer er hverken ejer eller admin',
  not public.is_admin_for('proev-rolle') and not public.er_ejer_for('proev-rolle')
  and public.min_rolle() is null);

/* ⚠️ OG HER SIGER RLS NEJ FØR UDLØSEREN. En slukket bruger er
   slet ikke admin, så opdateringen rammer nul rækker og kaster
   ingenting — beskeden `kun_ejeren_saetter_priser` kommer aldrig.
   Første udgave ledte efter den og faldt.

   Derfor måles PRISEN og ikke beskeden — og den læses med
   chefens øjne, for den slukkede kan heller ikke se rækken. */
select pg_temp.proev($$update public.menu_varer set pris = 5
                        where navn = 'Prøveret'$$);

set local request.jwt.claims = '{"email":"chef@proev.dk"}';
select pg_temp.svar('14. En slukket ejer kan ikke rette en pris',
  (select pris = 60 from public.menu_varer where navn = 'Prøveret'));


-- ============================================================
--  ⚠️ DEN SIDSTE EJER KAN IKKE FJERNES — HELLER IKKE AF SIG SELV
--  Uden den spærre kunne ét fejltryk efterlade en forretning,
--  hvor INGEN kan rette en pris, og vejen tilbage går gennem
--  Supabases dashboard. Det er ikke et sted, en cafe skal ende
--  klokken 12 om lørdagen.
-- ============================================================
set local request.jwt.claims = '{"email":"chef@proev.dk"}';

select pg_temp.svar('15. Den sidste ejer kan ikke slettes',
  pg_temp.proev($$delete from public.admin_adgang
                   where email = 'chef@proev.dk'$$) like '%sidste_ejer%');

select pg_temp.svar('16. Den sidste ejer kan ikke slukkes',
  pg_temp.proev($$update public.admin_adgang set aktiv = false
                   where email = 'chef@proev.dk'$$) like '%sidste_ejer%');

select pg_temp.svar('17. Den sidste ejer kan ikke sætte sig selv ned',
  pg_temp.proev($$update public.admin_adgang set rolle = 'medarbejder'
                   where email = 'chef@proev.dk'$$) like '%sidste_ejer%');

/* ⚠️ MEN NÅR DER ER TO, MÅ DEN ENE GERNE GÅ. Uden den her prøve
   ville en spærre, der bare sagde nej til ALT, bestå de tre
   ovenfor — og gøre det umuligt at fjerne nogen som helst. */
select pg_temp.svar('18. Er der to ejere, kan den ene godt fjernes',
  (pg_temp.proev($$insert into public.admin_adgang (email, lokation_id, rolle, navn)
                   values ('nr2@proev.dk', 'proev-rolle', 'ejer', 'Nummer to')$$) = 'gik igennem')
  and pg_temp.proev($$delete from public.admin_adgang
                       where email = 'nr2@proev.dk'$$) = 'gik igennem');


-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
reset role;
do $$
declare r text := coalesce(current_setting('proev.rapport', true), '(ingen)');
begin
  raise exception E'\n\n===== PRØVE: ROLLER I ADMIN =====\n\n%\n%\n',
    r,
    case when position('FEJLEDE' in r) = 0
      then 'ALLE 18 AF 18 BESTOD.'
      else '⚠️ NOGET FEJLEDE — se linjerne ovenfor.' end;
end $$;

rollback;
