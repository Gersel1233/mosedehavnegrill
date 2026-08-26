-- ============================================================
--  FJERN DEMO-INDHOLDET IGEN
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Fjerner præcis det, supabase/demo-indhold.sql lagde ind —
--  hverken mere eller mindre. Har personalet skrevet en RIGTIG
--  dagens ret, rigtige nyheder eller rigtige kugler oveni,
--  bliver de stående: filen rammer kun på det nøjagtige indhold,
--  demo-filen skrev.
--
--  Det er en bevidst forskel fra "slet alt". En oprydning, der
--  også tager personalets eget arbejde med, bliver kørt én gang
--  og aldrig igen — og så bliver demo-indholdet stående for evigt
--  i stedet.
--
--  ⚠️  RIGTIGE BESTILLINGER RØRES IKKE. Demo-rækkerne kendes på
--  referencen: SM-DEMO-01, FO-DEMO-01, BO-DEMO-01, UD-DEMO-01.
--  Gæsternes egne referencer laves i browseren og ser ud som
--  SM260807-K3M9Q — de kan ikke ramme mønsteret her.
--
--  Bagefter skjuler forsiden de blokke, der ikke har noget at
--  vise. Det er ikke en fejl; det er reglen: en overskrift over
--  ingenting fortæller gæsten, at der aldrig sker noget her.
-- ============================================================

begin;

-- ------------------------------------------------------------
--  GÆSTESIDEN
-- ------------------------------------------------------------

-- Dagens ret — kun hvis den stadig er DEN, demo-filen skrev.
update public.indstillinger
   set vaerdi = jsonb_build_object('navn', '', 'beskrivelse', '', 'pris', null),
       aendret = now()
 where lokation_id = 'mosede'
   and noegle = 'dagens_ret'
   and vaerdi->>'navn' = 'Stegt flæsk med persillesovs';

/* Dagens besked stod i demo-filen indtil 23. august. Banneret
   "Fra lugen" er væk fra forsiden — der er kun to bannere nu,
   musikken og Facebook — så feltet fyldes ikke længere ud. Den
   her linje bliver stående, så en database, der HAR fået den
   gamle demo-besked, også bliver ryddet. Teksten slettes ikke,
   kun visningen slås fra: et tomt felt fortæller ingenting
   bagefter om, hvad der stod. */
update public.indstillinger
   set vaerdi = jsonb_set(vaerdi, '{vis}', 'false'::jsonb),
       aendret = now()
 where lokation_id = 'mosede'
   and noegle = 'dagens_besked'
   and vaerdi->>'tekst' = 'Vi holder åbent hele weekenden — kom ned og få en is på trædækket.';

-- Kalenderen: de to livemusik-datoer, den interne note og den
-- tidlige lukning. 'Live musik på molen' stod også i den gamle
-- udgave af demo-filen og bliver ryddet med.
delete from public.kalender
 where lokation_id = 'mosede'
   and titel in ('Live musik på molen',
                 'Livemusik på trædækket',
                 'Leverandør kommer med varer',
                 'Vi lukker tidligt (personalefest)');

-- Nyhederne. De to første titler stod også i den gamle udgave.
delete from public.nyheder
 where lokation_id = 'mosede'
   and titel in (
     'Længere åbent i weekenden',
     'Livemusik på molen igen',
     'Nyt i køledisken',
     'Smørrebrød ud af huset',
     'Trædækket er klar til sæsonen'
   );

/* Kuglerne på tavlen. Rækken SLETTES og sættes ikke til en tom
   liste: js/side.js skjuler blokken, når nøglen mangler ELLER
   listen er tom, men en tom liste i admin ser ud som om nogen
   har tømt tavlen med vilje. Væk er væk.

   Kun hvis de fem stadig er vores. Har personalet skiftet én
   smag ud, er tavlen deres nu. */
delete from public.indstillinger
 where lokation_id = 'mosede'
   and noegle = 'dagens_kugler'
   and vaerdi = jsonb_build_array(
     jsonb_build_object('navn', 'Vanilje',    'farve', '#f4e6c8'),
     jsonb_build_object('navn', 'Chokolade',  'farve', '#6b4326'),
     jsonb_build_object('navn', 'Jordbær',    'farve', '#e5776f'),
     jsonb_build_object('navn', 'Lakrids',    'farve', '#3a3a3a'),
     jsonb_build_object('navn', 'Hindbær',    'farve', '#c94f6d'));

-- Noten under menukortet — kun hvis den stadig er vores ord.
delete from public.indstillinger
 where lokation_id = 'mosede'
   and noegle = 'menu_note'
   and vaerdi = to_jsonb('Smørrebrød kan leveres glutenfrit eller uden smør. Spørg os, vi hjælper gerne.'::text);

/* Fluebenene ved kategorierne og det korte varsel. Demo-filen
   satte dem, så forsidens bestilling havde noget at sælge; her
   ryddes de igen.

   bestilbare_kategorier SLETTES helt — nøglen findes ikke i en
   frisk database, og en tom liste er det samme som ingen nøgle.
   Varslet sættes tilbage til de 24 timer, der er standarden
   ("bestil senest dagen før"), og ikke slettet: står nøglen der
   med et andet tal, er det ejerens eget, og det skal ryd-demo
   ikke pille ved. Derfor kun når tallet stadig er demoens 2. */
delete from public.indstillinger
 where lokation_id = 'mosede'
   and noegle = 'bestilbare_kategorier';

update public.indstillinger
   set vaerdi = to_jsonb(24), aendret = now()
 where lokation_id = 'mosede'
   and noegle = 'bestilling_varsel_timer'
   and vaerdi = to_jsonb(2);

/* Pladserne på trædækket — kun hvis tallet stadig er de 40,
   demo-filen gættede. Har ejeren bekræftet et andet tal, er det
   hans, og det skal ikke forsvinde med en oprydning. Er det
   stadig 40, fordi han bekræftede netop 40, koster det ham ét
   felt at skrive igen — og det er den rigtige vej at fejle: en
   demo-oprydning må hellere fjerne for meget af sit eget end
   for lidt. */
delete from public.indstillinger
 where lokation_id = 'mosede'
   and noegle = 'bord_pladser'
   and vaerdi = to_jsonb(40);

/* Restaurant-felterne på Køkken-kø. Samme regel som pladserne:
   KUN hvis tallet stadig er demoens. Ventetiden og loftet er
   ejerens egne — hvor lang tid køkkenet er om en portion, og
   hvor mange ordrer lugen kan nå, ved de.

   ⚠️ Loftet er den vigtigste af de tre at få væk igen. Bliver
   demoens 8 stående, siger bordene "der er run på lige nu" på en
   rigtig travl lørdag, hvor der ikke er noget i vejen — og ingen
   ville lede efter årsagen i en demo, der blev kørt i august. */
delete from public.indstillinger
 where lokation_id = 'mosede'
   and (noegle, vaerdi) in (
     ('bord_ventetid_min',          to_jsonb(15)),
     ('bord_ventetid_pr_ordre_min', to_jsonb(3)),
     ('bord_loft_pr_kvarter',       to_jsonb(8)));


-- ------------------------------------------------------------
--  PERSONALESIDEN
--  ----------------------------------------------------------
--  Rækkerne slettes FOR ALVOR og lander ikke i skraldespanden.
--  Skraldespanden er personalets fortrydelse af deres egne
--  handlinger; demo-rækker, der lå der i tredive dage bagefter,
--  ville være det stik modsatte af en oprydning.
-- ------------------------------------------------------------
/* Bordene kendes på navnet og ikke på en reference — tabellen
   har ingen. "DEMO 7" kan ikke forveksles med et bord, ejeren
   selv har oprettet, og det er hele pointen: en oprydning må
   aldrig kunne fjerne et rigtigt bord, hvis mærkat ligger
   derude. */
delete from public.borde            where nummer like 'DEMO %';
delete from public.bestillinger     where reference like 'SM-DEMO-%';
delete from public.forespoergsler   where reference like 'FO-DEMO-%';
delete from public.bordbestillinger where reference like 'BO-DEMO-%';
delete from public.udlejninger      where reference like 'UD-DEMO-%';

commit;


-- Rapport. Se noten i demo-indhold.sql om hvorfor det skal være
-- en select til sidst.
with t as (
  select
    (select count(*) from public.indstillinger
      where lokation_id = 'mosede' and noegle = 'dagens_ret'
        and vaerdi->>'navn' = 'Stegt flæsk med persillesovs')      as ret,
    (select count(*) from public.kalender
      where lokation_id = 'mosede'
        and titel in ('Live musik på molen', 'Livemusik på trædækket',
                      'Leverandør kommer med varer',
                      'Vi lukker tidligt (personalefest)'))        as kalender,
    (select count(*) from public.nyheder
      where lokation_id = 'mosede'
        and titel in ('Længere åbent i weekenden', 'Livemusik på molen igen',
                      'Nyt i køledisken', 'Smørrebrød ud af huset',
                      'Trædækket er klar til sæsonen'))            as nyheder,
    (select count(*) from public.bestillinger
      where reference like 'SM-DEMO-%')                            as b,
    (select count(*) from public.forespoergsler
      where reference like 'FO-DEMO-%')                            as f,
    (select count(*) from public.bordbestillinger
      where reference like 'BO-DEMO-%')                            as bo,
    (select count(*) from public.udlejninger
      where reference like 'UD-DEMO-%')                            as u,
    (select count(*) from public.nyheder
      where lokation_id = 'mosede' and aktiv)                      as nyheder_tilbage,
    (select count(*) from public.kalender
      where lokation_id = 'mosede' and type = 'arrangement'
        and offentlig and coalesce(slut_dato, dato) >= current_date) as arr_tilbage
)
select
  case when ret + kalender + nyheder + b + f + bo + u = 0
       then '✅ DEMO-INDHOLDET ER VÆK — det personalet selv har skrevet, står der stadig'
       else '❌ NOGET STÅR TILBAGE — se tallene herunder'
  end                                                              as svar,
  /* Demo-filen kan have ÅBNET sæsonen eller slået "tag imod
     bestillinger" til for at kunne køre igennem. Dem sætter den
     her fil IKKE tilbage: om forretningen er åben, er ejerens
     beslutning, og at gætte den to gange er værre end at spørge
     én gang. Linjen står der, så ingen tror, alt er som før. */
  'Sæson og "tag imod bestillinger" er IKKE rørt — tjek dem i admin, '
  || 'hvis demo-filen skrev at den slog dem til'                     as husk_ogsaa,
  ret as dagens_ret_tilbage, kalender as kalender_tilbage,
  nyheder as nyheder_demo_tilbage,
  b as bestillinger_tilbage, f as foresp_tilbage,
  bo as borde_tilbage, u as udlejninger_tilbage,
  nyheder_tilbage as rigtige_nyheder, arr_tilbage as rigtige_arrangementer
from t;
