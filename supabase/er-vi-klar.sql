-- ============================================================
--  ER VI KLAR?  — ét kald, der spørger databasen om det hele
--  ------------------------------------------------------------
--  Kør den, når du har kørt de andre filer. Kør den igen om et
--  halvt år. Den skriver INGENTING i dine tabeller: den kigger.
--
--  HVORFOR DEN FINDES
--  ------------------------------------------------------------
--  Opsætningen er efterhånden elleve filer, der skal køres i
--  rækkefølge, og prøverne (proev-*.sql) siger hver især kun
--  noget om deres egen del. Efter en flytning, en ny forretning
--  eller en fil, der blev kørt halvt, er spørgsmålet ikke "består
--  bordprøven" — det er "er der noget, der mangler". Det spørgsmål
--  havde vi ikke ét sted at stille.
--
--  Og manglerne er stille. En tabel uden row level security
--  fejler ikke; den svarer bare ja til alle. En bremse uden
--  security definer kaster ingen fejl; den tæller bare nul hver
--  gang. Begge dele ser ud som om alt virker — lige indtil det
--  ikke gør.
--
--  SÅDAN LÆSES SVARET
--  ------------------------------------------------------------
--  Én linje pr. tjek, ✅ eller ❌, og nederst en linje, der siger
--  ALT ER KLAR eller hvor mange ting der mangler. Står der ❌,
--  står der i sidste kolonne, hvad der skal gøres ved det.
--
--  Rapporten kommer som den SIDSTE sætning med vilje: Supabases
--  SQL Editor viser kun sidste sætnings svar, og notices ser man
--  aldrig. Se README-afsnittet "Supabases SQL Editor viser ikke
--  beskeder".
--
--  Fejler filen med "relation does not exist", er der ikke noget
--  i vejen med filen — så mangler tabellen. Alle tjek, der læser
--  DATA, går derfor gennem pg_temp.tal() nedenfor, netop så en
--  manglende tabel bliver til et ❌ i rapporten i stedet for en
--  fejl, der vælter hele arket.
-- ============================================================

-- ------------------------------------------------------------
--  HJÆLPEREN
--  ------------------------------------------------------------
--  Postgres slår tabelnavne op, når sætningen læses — ikke når
--  den køres. Et "select count(*) from public.menu_varer" direkte
--  i rapporten ville altså vælte HELE filen, hvis menu_varer ikke
--  fandtes. Det er præcis den situation, filen er lavet til at
--  beskrive. Derfor dynamisk SQL med en fælde omkring: findes
--  tabellen ikke, kommer der -1 tilbage, og linjen bliver et ❌.
--
--  pg_temp betyder, at funktionen kun findes i den her forbindelse
--  og forsvinder af sig selv. Der bliver ikke lagt noget i
--  databasen.
-- ------------------------------------------------------------
create or replace function pg_temp.tal(sql text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute sql into n;
  return coalesce(n, -1);
exception when others then
  return -1;
end $$;

create or replace function pg_temp.tekst(sql text) returns text
language plpgsql as $$
declare t text;
begin
  execute sql into t;
  return t;
exception when others then
  return null;
end $$;


-- ------------------------------------------------------------
--  RAPPORTEN
-- ------------------------------------------------------------
with tjek(nr, del, hvad, ok, retning) as (values

  -- ===== FUNDAMENTET =======================================
  /* ⚠️ dagens_retter OG borde KOM SENT TIL LISTEN, og det kostede
     en produktionsfejl 26/8: dagens_retter var aldrig oprettet,
     denne linje kendte den ikke, og filen skrev ALT ER KLAR —
     mens gæstesiden viste nødmenuen med to varer i stedet for
     242. En tjekliste, der ikke kender en tabel, siger god for
     dens fravær.

     Står der en tabel i js/store.js' hent(), SKAL den stå her. */
  (11, 'Fundament', 'Alle 17 tabeller findes',
   (select count(*) = 17 from pg_tables
     where schemaname = 'public' and tablename in (
       'lokationer', 'admin_adgang', 'aabningstider', 'lukkedage', 'kalender',
       'menu_kategorier', 'menu_varer', 'nyheder', 'indstillinger',
       'bestillinger', 'forespoergsler', 'bordbestillinger', 'udlejninger',
       'push_abonnementer', 'logbog', 'dagens_retter', 'borde')),
   'Mangler: ' || coalesce((select string_agg(t, ', ') from unnest(array[
       'lokationer', 'admin_adgang', 'aabningstider', 'lukkedage', 'kalender',
       'menu_kategorier', 'menu_varer', 'nyheder', 'indstillinger',
       'bestillinger', 'forespoergsler', 'bordbestillinger', 'udlejninger',
       'push_abonnementer', 'logbog', 'dagens_retter', 'borde']) t
     where not exists (select 1 from pg_tables
        where schemaname = 'public' and tablename = t)), 'ingen')
     || '. Kør filen, der laver dem — rækkefølgen står i README.'),

  /* En tabel uden RLS er en tabel, hvor anon-nøglen svarer ja til
     alt. Nøglen ligger offentligt i js/config.js, så det er ikke
     en teoretisk risiko — det er hele kundelisten. */
  (12, 'Fundament', 'Row level security er tændt på hver eneste tabel',
   (select count(*) = 0 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
   'Uden RLS: ' || coalesce((select string_agg(c.relname, ', ') from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), '')
     || '. Kør "alter table public.NAVN enable row level security;".'),

  (13, 'Fundament', 'is_admin() findes',
   (select to_regprocedure('public.is_admin()') is not null),
   'Kør supabase/setup.sql.'),

  /* Den her har kostet en dag. 18/8 blev kun halvdelen af
     pladsholderen erstattet, så der stod en adresse, ingen kunne
     logge ind med — og fejlen så ud som et loginproblem. */
  (14, 'Fundament', 'E-mailen i is_admin() er rettet helt færdig',
   (select coalesce(prosrc, 'UDFYLD') !~* 'UDFYLD'
       and coalesce(prosrc, 'eksempel.dk') !~* 'eksempel\.dk'
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'is_admin' limit 1),
   'Der står stadig "UDFYLD" eller "eksempel.dk" i funktionen. '
   || 'Ret HELE teksten mellem apostrofferne i punkt 1 i setup.sql og kør den igen.'),

  (15, 'Fundament', 'is_admin_for() findes — adgang pr. forretning',
   (select to_regprocedure('public.is_admin_for(text)') is not null),
   'Kør supabase/flerlejer.sql.'),

  (16, 'Fundament', 'Mindst én rigtig e-mail kan logge ind i admin',
   (pg_temp.tal($$select count(*) from public.admin_adgang
      where email !~* 'UDFYLD' and email !~* 'eksempel\.dk'$$) > 0),
   'Ingen kan logge ind i admin. Sæt chefens e-mail i punkt 1 i flerlejer.sql.'),

  (17, 'Fundament', 'Forretningen "mosede" findes i lokationer',
   (pg_temp.tal($$select count(*) from public.lokationer where id = 'mosede'$$) = 1),
   'Uden rækken har hverken bestillinger eller menukort et sted at høre til.'),

  -- ===== GÆSTEN MÅ SKRIVE, MEN IKKE LÆSE ====================
  (21, 'Gæsten', 'De fire gæstetabeller har fire adgangsregler hver',
   (select count(*) = 4 from (
      select tablename from pg_policies
       where schemaname = 'public'
         and tablename in ('bestillinger', 'forespoergsler',
                           'bordbestillinger', 'udlejninger')
       group by tablename having count(*) = 4) x),
   'En tabel mangler regler. Kør dens fil igen — de er lavet til at køres to gange.'),

  /* DET VIGTIGSTE TJEK I FILEN. En læseregel uden is_admin på en
     af de fire tabeller betyder, at enhver med anon-nøglen kan
     hente navn, telefonnummer og festdato på hver eneste kunde
     med én linje i en browserkonsol. */
  (22, 'Gæsten', 'Ingen gæst kan LÆSE bestillinger, forespørgsler, borde eller udlejninger',
   (select count(*) = 0 from pg_policies
     where schemaname = 'public'
       and tablename in ('bestillinger', 'forespoergsler',
                         'bordbestillinger', 'udlejninger')
       and cmd in ('SELECT', 'ALL')
       and coalesce(qual, 'true') !~ 'is_admin'),
   'HUL I ADGANGEN: ' || coalesce((select string_agg(tablename || '.' || policyname, ', ')
      from pg_policies where schemaname = 'public'
        and tablename in ('bestillinger', 'forespoergsler',
                          'bordbestillinger', 'udlejninger')
        and cmd in ('SELECT', 'ALL')
        and coalesce(qual, 'true') !~ 'is_admin'), '')
     || ' kan læses uden at være personale. Slet reglen NU.'),

  (23, 'Gæsten', 'Gæsten KAN sende alle fire slags af sted',
   (select count(*) = 4 from (
      select distinct tablename from pg_policies
       where schemaname = 'public'
         and tablename in ('bestillinger', 'forespoergsler',
                           'bordbestillinger', 'udlejninger')
         and cmd = 'INSERT' and 'anon' = any (roles)) x),
   'En formular på siden svarer 401 og siger "kunne ikke sendes". '
   || 'Insert-reglen for anon mangler på en af de fire tabeller.'),

  /* Push-tabellen ER retten til at sende beskeder til køkkenets
     telefoner. Der må ikke være så meget som én gæsteregel. */
  (24, 'Gæsten', 'Push-tabellen har ingen gæsteregel overhovedet',
   (select count(*) = 0 from pg_policies
     where schemaname = 'public' and tablename = 'push_abonnementer'
       and coalesce(qual, '') || coalesce(with_check, '') !~ 'is_admin'),
   'En regel på push_abonnementer nævner ikke is_admin_for. '
   || 'Så kan en fremmed enten læse køkkenets enheder eller tilmelde sin egen.'),

  -- ===== BREMSERNE ==========================================
  (31, 'Bremser', 'Alle fire bremser er sat på',
   (select count(*) = 4 from pg_trigger
     where not tgisinternal and tgname in ('bestilling_bremse',
       'forespoergsel_bremse', 'bord_bremse', 'udlejning_bremse')),
   'Mangler: ' || coalesce((select string_agg(t, ', ') from unnest(array[
       'bestilling_bremse', 'forespoergsel_bremse',
       'bord_bremse', 'udlejning_bremse']) t
     where not exists (select 1 from pg_trigger
        where not tgisinternal and tgname = t)), '')
     || '. Et script kan sende ti tusind af sted på et minut.'),

  /* Uden security definer kører bremsen som gæsten selv — og
     gæsten må ikke læse tabellen. Så tæller den nul hver gang og
     lukker alt igennem, uden at fejle. */
  (32, 'Bremser', 'Bremserne kører som security definer',
   (select count(*) = 4 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef
       and p.proname in ('bestilling_bremse', 'forespoergsel_bremse',
                         'bord_bremse', 'udlejning_bremse')),
   'En bremse tæller nul hver gang og slipper alt igennem uden at fejle. '
   || 'Kør filen igen — "security definer" står i den.'),

  (33, 'Bremser', 'Bremserne har search_path låst',
   (select count(*) = 4 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path%'
       and p.proname in ('bestilling_bremse', 'forespoergsel_bremse',
                         'bord_bremse', 'udlejning_bremse')),
   'En security definer-funktion uden låst search_path kan narres '
   || 'til at køre en fremmed tabel. Kør filen igen.'),

  -- ===== LUKKEDE DAGE =======================================
  /* Indtil 23/8 var det KUN browseren, der holdt øje med lukkede
     dage: datovælgeren sprang dem over, men to linjer i en konsol
     gik uden om siden, og køkkenet opdagede det først, når gæsten
     stod der juleaftensdag. Værnet er to udløsere — én pr. tabel,
     gæsten kan skrive en dato i. */
  (34, 'Lukket', 'Lukkede dage afvises af databasen',
   (select count(*) = 2 from pg_trigger
     where not tgisinternal
       and tgname in ('bestilling_dag_aaben', 'bord_dag_aaben')),
   'Mangler: ' || coalesce((select string_agg(t, ', ') from unnest(array[
       'bestilling_dag_aaben', 'bord_dag_aaben']) t
     where not exists (select 1 from pg_trigger
        where not tgisinternal and tgname = t)), '')
     || '. Kør supabase/lukkedag-vaern.sql. Uden den kan man bestille '
     || 'mad — eller et bord — på en dag, forretningen har lukket.'),

  /* Den stille af de to. Værnet slår kalenderen op, mens GÆSTEN
     indsætter, og uden security definer er de opslag underlagt
     hendes læseregler. I dag må hun se lukkedage; strammes den
     regel en dag, ser værnet en tom kalender og siger ja til hver
     eneste lukkede dag — uden en fejl og uden et spor. Målt på en
     rigtig Postgres 23/8, og prøve 9 i proev-lukkedag-vaern.sql
     står vagt om det. */
  (35, 'Lukket', 'Værnet kører som security definer',
   (select count(*) = 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef
       and p.proname = 'mosede_dag_aaben'),
   'Værnet ser kalenderen med gæstens øjne. Bliver kalenderens '
   || 'læseregel strammet, holder det op med at fælde noget som helst. '
   || 'Kør supabase/lukkedag-vaern.sql igen.'),

  (36, 'Lukket', 'Værnet har search_path låst',
   (select count(*) = 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path%'
       and p.proname = 'mosede_dag_aaben'),
   'En security definer-funktion uden låst søgesti kan narres til at '
   || 'køre en fremmed tabel som ejeren. Kør filen igen.'),

  -- ===== BORDENE OG DERES QR-KODER ==========================
  /* Bordene er den eneste tabel, en gæst må LÆSE — telefonen ved
     bordet skal kunne slå nummeret op, før den viser en formular.
     Mangler tabellen, virker ingen QR-kode; og siden siger det
     selv, så fejlen ligner "ejeren har ikke oprettet bordene
     endnu". Derfor står den her. */
  (37, 'Borde', 'Tabellen borde findes',
   (select to_regclass('public.borde') is not null),
   'Kør supabase/bordkort.sql. Uden den kan ingen QR-kode på et bord '
   || 'bestille noget.'),

  (38, 'Borde', 'Værnet om bordnummeret er sat på',
   (select count(*) = 1 from pg_trigger
     where not tgisinternal and tgname = 'bestilling_bord_findes'),
   'Kør supabase/bordkort.sql. Uden værnet kan en hvilken som helst '
   || 'adresse med ?bord=hvadsomhelst sende en bestilling ind, og køkkenet '
   || 'står med mad til et bord, der ikke findes.'),

  /* Modsat lukkedagsværnet fejler det her ved at afvise ALT: ser
     det bordlisten med gæstens øjne, og bliver læsereglen strammet,
     finder det ingen borde og siger nej til hver eneste bestilling
     fra hvert eneste bord. Se prøve 14 i proev-bordkort.sql. */
  (39, 'Borde', 'Bordværnet kører som security definer med låst søgesti',
   (select count(*) = 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef
       and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path%'
       and p.proname = 'mosede_bord_findes'),
   'Værnet ser bordlisten med gæstens øjne. Bliver læsereglen på borde '
   || 'strammet, afviser det hver eneste bestilling fra hvert eneste bord. '
   || 'Kør supabase/bordkort.sql igen.'),

  /* ⚠️ SPØRGSMÅLET GÅR PÅ KOLONNEN, IKKE PÅ TABELLEN (30/8).

     Det stod som "grant select on borde til anon" og gjorde
     nøjagtig det, filen her er bygget for at forhindre: linjen
     blev ❌, i det sekund bord-noegle.sql tog anons læsning af
     kolonnen kode væk — og retningen sagde "kør bordkort.sql
     igen", altså KØR VÆRNET AF. En tjeklinje, der beder om det
     modsatte af det, den skal beskytte, er værre end ingen
     tjeklinje.

     Det, gæsten skal kunne, er at slå NUMMERET op. Det er dét,
     der spørges om nu. */
  (40, 'Borde', 'Gæsten må læse bordets nummer',
   (select to_regclass('public.borde') is not null
       and has_column_privilege('anon', 'public.borde', 'nummer', 'select')),
   'Telefonen ved bordet kan ikke slå nummeret op, og siden siger '
   || '"vi kender ikke bord 7" til alle. Kør supabase/bordkort.sql og '
   || 'derefter supabase/bord-noegle.sql — rettighederne står i dem.'),

  -- ===== INGEN DOBBELTBOOKING ===============================
  (41, 'Dobbelt', 'Baglokalet kan kun udlejes én gang pr. dag',
   (select count(*) = 1 from pg_indexes
     where schemaname = 'public' and indexname = 'udlejning_dagen_er_taget'
       and indexdef like '%UNIQUE%' and indexdef like '%bekraeftet%'),
   'To selskaber kan få ja til det samme lokale samme dag. Kør supabase/udlejning.sql.'),

  (42, 'Dobbelt', 'Samme nummer kan ikke sende det samme to gange',
   (select count(*) = 3 from pg_indexes
     where schemaname = 'public' and indexname in ('bestilling_ikke_dobbelt',
       'bord_ikke_dobbelt', 'udlejning_ikke_dobbelt')),
   'Et dobbelttryk på Send bliver til to bestillinger. '
   || 'Kør setup.sql, borde.sql eller udlejning.sql igen.'),

  -- ===== DET SIDEN VISER ====================================
  (51, 'Siden', 'Spis her og afhentning kan skelnes',
   (pg_temp.tal($$select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'bestillinger'
        and column_name = 'hvordan'$$) = 1
    and (select count(*) = 1 from pg_constraint
          where conrelid = to_regclass('public.bestillinger')
            and conname = 'bestilling_hvordan_ok')),
   'Kør supabase/spis-her.sql. Uden den ryger alle bestillinger '
   || 'i køkkenet som afhentning.'),

  /* Kalenderen er både drift og gæsteside. Havde læsereglen stået
     til true, kunne enhver hente personalets interne noter om
     lukkedage og arrangementer, der ikke er offentlige endnu. */
  (52, 'Siden', 'Kalenderen røber ikke det, der ikke er offentligt',
   (select count(*) = 0 from pg_policies
     where schemaname = 'public' and tablename = 'kalender'
       and cmd in ('SELECT', 'ALL') and coalesce(qual, 'true') ~ '^\s*true\s*$'),
   'En læseregel på kalender står til "true". Så kan alle se alt i den.'),

  (53, 'Siden', 'Der er varer i menukortet',
   (pg_temp.tal($$select count(*) from public.menu_varer$$) > 0),
   'Forsiden viser nødmenuen fra js/store.js i stedet for det rigtige kort. '
   || 'Kør supabase/menukort.sql.'),

  (54, 'Siden', 'Der er åbningstider for alle syv dage',
   (pg_temp.tal($$select count(distinct ugedag) from public.aabningstider
      where lokation_id = 'mosede'$$) = 7),
   'En dag uden række viser "lukket" på forsiden, uanset hvad der er sandt.'),

  (55, 'Siden', 'Nødbremsen findes — bestillinger kan lukkes fra admin',
   (pg_temp.tal($$select count(*) from public.indstillinger
      where noegle = 'bestilling_aaben'$$) = 1),
   'Fluebenet "Tag imod bestillinger" i admin har ingen række at skrive i. '
   || 'Kør supabase/setup.sql.'),

  -- ===== LIVE OG PUSH =======================================
  (61, 'Live', 'De fire gæstetabeller sender live til admin',
   (pg_temp.tal($$select count(*) from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename in ('bestillinger', 'forespoergsler',
                          'bordbestillinger', 'udlejninger')$$) = 4),
   /* Teksten sagde "personalet skal trykke Hent på ny". Den knap
      findes ikke længere — kunden bad om at få alle seks væk
      (22/8), og skærmen henter selv. Uden realtime er den bare
      op til et minut bagud (takten i js/admin/frisk.js), og det
      er dét, linjen skal sige nu. */
   'Nye bestillinger kan være op til et minut om at nå skærmen. '
   || 'Kør supabase/realtime.sql, så kommer de i samme sekund.'),

  /* Nøglen laves i supabase/lav-vapid.html og sættes i admin.
     Den offentlige halvdel står her; den private må KUN ligge som
     hemmelighed på Edge Function'en. */
  (62, 'Live', 'VAPID-nøglen er sat, så push kan sendes',
   (char_length(coalesce(pg_temp.tekst($$select vaerdi::text
      from public.indstillinger where noegle = 'vapid_offentlig'$$), '')) > 40),
   'Push virker ikke endnu. Lav nøglerne med supabase/lav-vapid.html, '
   || 'sæt den offentlige i admin under Push, og den private som '
   || 'hemmelighed på Edge Function''en send-push.'),
  -- ===== SKRALDESPANDEN =====================================
  /* Uden kolonnen er "Slet" endeligt igen — og et fejltryk på en
     iPad ved lugen koster en kundes navn og telefonnummer. */
  /* FROKOSTORDNINGEN ER DEN FJERDE SLAGS FORESPØRGSEL.

     Køres forespoergsler.sql igen bagefter, skriver den sin egen
     udgave af check-reglen tilbage — og så er listen tre navne
     igen. Det opdager ingen: siden ser ud som før, men et firma,
     der trykker "Få et tilbud", får en fejl, personalet aldrig
     hører om. */
  (70, 'Frokost', 'Frokostordningen er en tilladt forespørgsel',
   (select count(*) = 1 from pg_constraint
     where conname = 'forespoergsel_type_ok'
       and pg_get_constraintdef(oid) like '%frokost%'),
   'h-frokost.html sender type "frokost", og databasen afviser den. '
   || 'Kør supabase/frokost.sql — den udvider kun den tilladte liste.'),

  (71, 'Skrald', 'Kolonnen "slettet" findes på alle fire',
   (select count(*) = 4 from information_schema.columns
     where table_schema = 'public' and column_name = 'slettet'
       and table_name in ('bestillinger', 'forespoergsler',
                          'bordbestillinger', 'udlejninger')),
   'Kør supabase/skraldespand.sql. Uden den er "Slet" i admin endeligt.'),

  /* DEN VIGTIGSTE AF DE FIRE. En række i spanden må ikke blive
     ved med at spærre: er en bestilling smidt ud, skal gæsten
     kunne sende den samme igen, og er en bekræftet udlejning smidt
     ud, SKAL dagen være ledig igen. Ellers har vi byttet et
     fejltryk, man kan se, ud med en spærring, ingen kan forklare. */
  (72, 'Skrald', 'Nøglerne ser bort fra skraldespanden',
   (select count(*) = 4 from pg_indexes
     where schemaname = 'public'
       and indexname in ('bestilling_ikke_dobbelt', 'bord_ikke_dobbelt',
                         'udlejning_ikke_dobbelt', 'udlejning_dagen_er_taget')
       and indexdef ilike '%slettet is null%'),
   'Noget usynligt spærrer: en smidt-ud bestilling blokerer for den samme '
   || 'igen, og en smidt-ud udlejning holder dagen optaget for evigt. '
   || 'Kør supabase/skraldespand.sql.'),

  /* Køres bremse.sql, borde.sql, udlejning.sql eller
     forespoergsler.sql igen, skriver de deres egen udgave tilbage,
     og rettelsen er væk. Derfor står linjen her. */
  (73, 'Skrald', 'Bremserne tæller ikke det, der ligger i spanden',
   (select count(*) = 4 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosrc like '%slettet is null%'
       and p.proname in ('bestilling_bremse', 'forespoergsel_bremse',
                         'bord_bremse', 'udlejning_bremse')),
   'En gæst, hvis bestilling personalet lige har smidt ud, får "du har sendt '
   || 'for mange i dag". Kør supabase/skraldespand.sql igen — en af '
   || 'bremsefilerne har skrevet sin egen udgave tilbage.'),

  (74, 'Skrald', 'Gæsten kan ikke sende noget, der allerede er slettet',
   (select count(*) = 4 from pg_policies
     where schemaname = 'public' and cmd = 'INSERT'
       and tablename in ('bestillinger', 'forespoergsler',
                         'bordbestillinger', 'udlejninger')
       and coalesce(with_check, '') like '%slettet IS NULL%'),
   'En gæst kan sende en række, der er usynlig i admin OG tæller med i '
   || 'bremsen. Kør supabase/skraldespand.sql.'),
  -- ===== LOGBOGEN ===========================================
  (81, 'Logbog', 'Logbogen findes',
   (select to_regclass('public.logbog') is not null),
   'Kør supabase/logbog.sql. Uden den kan ingen svare på, hvem der '
   || 'ændrede en bestilling.'),

  (82, 'Logbog', 'Skriveren sidder på alle fire tabeller',
   (select count(*) = 4 from pg_trigger
     where tgname = 'logbog' and not tgisinternal),
   'En af de fire tabeller skriver ikke i logbogen. Så er svaret på '
   || '"hvem gjorde det" tomt, og det ligner, at der ikke skete noget. '
   || 'Kør supabase/logbog.sql.'),

  /* En logbog, man kan skrive i, svarer ikke længere på det
     spørgsmål, den findes for. Der skal hverken være en insert-
     eller en update-regel — heller ikke for chefen. Linjerne
     kommer fra trigger'en, der kører security definer. */
  (83, 'Logbog', 'Ingen kan skrive eller rette i logbogen',
   (select count(*) = 0 from pg_policies
     where schemaname = 'public' and tablename = 'logbog'
       and cmd in ('INSERT', 'UPDATE', 'ALL')),
   'Der er en skrive- eller retteregel på logbog. Så kan historikken '
   || 'laves om, og så er den ikke en historik. Slet reglen.'),

  (84, 'Logbog', 'Kun personalet kan læse logbogen',
   (select count(*) = 0 from pg_policies
     where schemaname = 'public' and tablename = 'logbog'
       and cmd in ('SELECT', 'ALL')
       and coalesce(qual, 'true') !~ 'is_admin'),
   'Logbogen indeholder gæsternes navne og referencer. En læseregel '
   || 'uden is_admin_for gør dem offentlige.'),

  /* ---------- FORESPØRGSLERNES KALENDER ---------- */
  (85, 'Kalender', 'Kolonnen detaljer findes på forespørgslerne',
   (select count(*) = 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'forespoergsler'
       and column_name = 'detaljer'),
   'Kør supabase/forespoergsel-kalender.sql. Uden den ryger formularernes '
   || 'valg — anledning, tidsrum, kuverter — ned i beskeden som fri tekst.'),

  (86, 'Kalender', 'Listen over optagne dage findes',
   (select count(*) = 1 from pg_views
     where schemaname = 'public' and viewname = 'optagne_dage'),
   'Kør supabase/forespoergsel-kalender.sql. Uden den kan gæsten ikke se, '
   || 'at datoen er væk — og to selskaber kan lande på den samme dag.'),

  (87, 'Kalender', 'Listen viser KUN datoer — ingen navne',
   (select count(*) = 3 and bool_and(column_name in ('lokation_id', 'dato', 'slags'))
      from information_schema.columns
     where table_schema = 'public' and table_name = 'optagne_dage'),
   'Visningen optagne_dage kører med sin EJERS øjne og springer '
   || 'adgangsreglerne over. Er der kommet en kolonne mere, er gæsternes '
   || 'navne offentlige. Ret visningen tilbage til tre kolonner NU.'),

  (88, 'Kalender', 'Værnet mod dobbeltbooking sidder på begge tabeller',
   (select count(*) = 2 from pg_trigger
     where tgname in ('forespoergsel_dagen_optaget', 'udlejning_dagen_optaget')
       and not tgisinternal),
   'Kør supabase/forespoergsel-kalender.sql igen. Uden begge kan et '
   || 'selskab og en udlejning lande på den samme dag.'),

  (89, 'Kalender', 'Værnet kører som security definer',
   (select coalesce(bool_and(p.prosecdef), false) from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'mosede_dagen_er_optaget'),
   'Uden security definer slår værnet op med GÆSTENS øjne, finder '
   || 'ingenting og siger ja til hver eneste dato — uden fejl og uden spor. '
   || 'Kør supabase/forespoergsel-kalender.sql igen.'),

  -- ===== RESTAURANT: KØKKENETS EGNE TRIN ====================
  /* Køres setup.sql eller udeblivelser.sql igen, snævrer de
     statuslisten ind igen — og så kan køkkenet ikke trykke
     "Tilberedes" mere. Fejlen ser ud som en knap, der ikke
     virker, og ingen ville gætte på en SQL-fil. */
  (91, 'Restaurant', 'Køkkenet kan komme videre fra "Modtaget"',
   (select count(*) = 1 from pg_constraint
     where conname = 'bestilling_status_ok'
       and pg_get_constraintdef(oid) like '%tilberedes%'
       and pg_get_constraintdef(oid) like '%serveret%'),
   'Køkken-køen kan ikke sætte en bordbestilling i gang. '
   || 'Kør supabase/restaurant.sql — igen, hvis setup.sql eller '
   || 'udeblivelser.sql er kørt bagefter.'),

  (92, 'Restaurant', 'Bordene kan have en zone',
   (pg_temp.tal($$select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'borde'
        and column_name = 'zone'$$) = 1),
   'Skiltene kan ikke printes i én bunke pr. zone. '
   || 'Kør supabase/restaurant.sql.'),

  /* ⚠️ Køres skraldespand.sql igen bagefter, skriver den nøglen
     tilbage til den gamle udgave — og så kan et bord ikke
     bestille to gange. Gæsten får "du har allerede sendt en
     bestilling til det tidspunkt", som om hun havde
     dobbeltklikket, og anden runde bliver aldrig bestilt. */
  (93, 'Restaurant', 'Et bord kan bestille mere end én gang',
   (select count(*) = 1 from pg_indexes
     where schemaname = 'public' and indexname = 'bestilling_ikke_dobbelt'
       and lower(indexdef) like '%bord_nummer is null%'
       and lower(indexdef) like '%slettet is null%'),
   'Selskabet ved bordet kan ikke bestille is efter maden — de får '
   || '"du har allerede sendt en bestilling til det tidspunkt". '
   || 'Kør supabase/restaurant.sql (efter skraldespand.sql).'),

  /* UDSOLGT ER EN BESLUTNING, DER SKAL LIGGE HER. Gæsten, der
     åbnede kortet for fem minutter siden, har varen på skærmen
     endnu. Browseren må gerne skjule den for at være pæn — den
     må bare ikke være den eneste, der ved det. */
  (94, 'Restaurant', 'Udsolgt afvises af databasen, ikke kun af browseren',
   (select count(*) = 1 from pg_trigger
     where tgrelid = to_regclass('public.bestillinger')
       and tgname = 'bestilling_udsolgt_vaern'),
   'En gæst med kortet åbent kan bestille noget, I lige har meldt udsolgt — '
   || 'og køkkenet får en ordre på noget, de ikke har. '
   || 'Kør supabase/bord-loft.sql.'),

  (95, 'Restaurant', 'Værnet slår op med sine egne øjne',
   (select coalesce(bool_and(p.prosecdef), false) from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'mosede_udsolgt_vaern'),
   'Uden security definer slår værnet op med GÆSTENS øjne og finder '
   || 'ingenting — så siger det ja til alt, uden fejl og uden spor. '
   || 'Kør supabase/bord-loft.sql igen.'),

  (96, 'Restaurant', 'Køkkenet kan sætte et loft pr. kvarter',
   (select count(*) = 1 from pg_trigger
     where tgrelid = to_regclass('public.bestillinger')
       and tgname = 'bestilling_bord_loft'),
   'Ved run på bordene er eneste udvej at lukke HELT — også for de borde, '
   || 'der ikke har bestilt endnu. Kør supabase/bord-loft.sql.'),

  /* ⚠️ SAMME REGEL SOM PÅ optagne_dage. Visningen kører med sin
     ejers øjne og springer adgangsreglerne over. Kommer der et
     navn, et nummer eller en varelinje med, er køkkenets liste
     åben for internettet — og siden ville se helt rigtig ud
     imens. */
  (97, 'Restaurant', 'Travlheden viser KUN tal — ingen navne, ingen numre',
   (select count(*) = 4 from information_schema.columns
     where table_schema = 'public' and table_name = 'bord_travlhed')
   and not exists (
     select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'bord_travlhed'
        and column_name in ('navn', 'telefon', 'email', 'besked', 'linjer',
                            'reference', 'intern_note', 'bord_nummer')),
   'ALARM: visningen bord_travlhed har fået en kolonne, den ikke må have. '
   || 'Den springer adgangsreglerne over — en kolonne med navne eller numre '
   || 'er køkkenets liste åben for internettet. Kør supabase/bord-loft.sql igen.'),

  /* EN VARE UDEN PRIS MÅ IKKE KUNNE BESTILLES. Ingen ringer og
     siger prisen (auto_bekraeft), gæsten hører den først ved
     lugen, og i salgstallene tæller varen som 0 kr. — et tal, der
     er for lavt, uden at nogen kan se det. Fire dage i spiis'
     produktionsdatabase, før nogen så den. */
  (98, 'Menukort', 'En vare uden pris afvises af databasen',
   (select count(*) = 1 from pg_trigger
     where tgrelid = to_regclass('public.bestillinger')
       and tgname = 'bestilling_pris_vaern')
   and (select coalesce(bool_and(p.prosecdef), false)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mosede_pris_vaern'),
   'En gammel fane kan bestille en vare uden pris — den tæller som 0 kr. i '
   || 'salget, og ingen siger prisen til gæsten. Kør supabase/pris-vaern.sql.'),

  /* DAGSREGLERNE: DAGEN KAN VÆRE HALVT ÅBEN.
     Uden tabellen kan personalet kun vælge mellem at lukke HELE
     dagen og lade alt stå åbent — og på en dag med selskab er
     begge dele forkerte. */
  (99, 'Kalender', 'En dag kan lukkes for kun take-away eller kun spis her',
   (select to_regclass('public.dags_regler') is not null),
   'Kalenderens dagsregler mangler. Kør supabase/dagsregler.sql.'),

  /* ⚠️ DEN HER FANGER EN STILLE FORTRYDELSE.
     dagsregler.sql ERSTATTER mosede_dag_aaben med en udgave, der
     også kender dagsreglerne. Køres lukkedag-vaern.sql igen
     bagefter, skrives den væk — og så kan gæsten bestille spis
     her på en dag, der er lukket for det. Ingen fejl, intet spor.
     Samme slags fælde som skraldespand.sql og restaurant.sql. */
  (100, 'Kalender', 'Værnet kender dagsreglerne (ikke skrevet væk igen)',
   (select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'mosede_dag_aaben'
         and pg_get_functiondef(p.oid) like '%luk_spis_her%')),
   'mosede_dag_aaben kender ikke dagsreglerne — lukkedag-vaern.sql er kørt '
   || 'oveni. Kør supabase/dagsregler.sql igen.'),

  /* Tabellen er OFFENTLIG med vilje: gæsten skal kunne læse
     dagens regler. Derfor må den aldrig bære persondata. */
  (101, 'Kalender', 'Dagsreglerne bærer ingen persondata',
   (select count(*) = 0 from information_schema.columns
     where table_schema = 'public' and table_name = 'dags_regler'
       and column_name in ('navn', 'telefon', 'email', 'note', 'intern_note')),
   'Der er kommet en kolonne med persondata i dags_regler, og tabellen kan '
   || 'læses af alle. Fjern den — se noten i supabase/dagsregler.sql.'),

  /* ANTALLET TÆLLES AF DATABASEN OG IKKE AF ET MENNESKE.
     Mangler bremsen, står tallet i admin og bevæger sig ikke —
     personalet tror, der er ti kager tilbage hele dagen. */
  (102, 'Menukort', 'Antal tilbage tælles ned af databasen',
   (select count(*) = 1 from pg_trigger
     where tgrelid = to_regclass('public.bestillinger')
       and tgname = 'bestilling_taeller_vare'),
   'Tallet "Få tilbage" i admin tæller ikke ned. '
   || 'Kør supabase/menukort-antal-og-dage.sql.'),

  /* ⚠️ VÆRNET ER BEFORE OG TÆLLINGEN AFTER. Byttede de plads,
     ville en afvist bestilling have trukket fra alligevel, og
     køkkenet ville mangle mad, ingen havde bestilt. */
  (103, 'Menukort', 'Der kan ikke bestilles flere, end der er tilbage',
   (select count(*) = 1 from pg_trigger t
     where t.tgrelid = to_regclass('public.bestillinger')
       and t.tgname = 'bestilling_vare_antal_vaern'
       and (t.tgtype & 2) = 2)          -- 2 = BEFORE
   and (select coalesce(bool_and(p.prosecdef), false)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mosede_vare_antal_vaern'),
   'En gæst kan bestille tolv kager, hvor der er ti — eller værnet slår op '
   || 'med gæstens øjne og finder ingenting. Kør supabase/menukort-antal-og-dage.sql.'),

  (104, 'Menukort', 'En kategori kan sættes til kun hverdage',
   (select to_regclass('public.menu_kategorier') is not null)
   and (select count(*) = 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'menu_kategorier'
       and column_name = 'dage')
   and (select count(*) = 1 from pg_trigger
     where tgrelid = to_regclass('public.bestillinger')
       and tgname = 'bestilling_kategori_dag'),
   'Kategorierne kan ikke begrænses til hverdage, eller værnet mangler — '
   || 'så kan der bestilles burgere til lørdag. '
   || 'Kør supabase/menukort-antal-og-dage.sql.'),

  /* ⚠️ DEN HER FANGER EN STILLE FORTRYDELSE.
     Var standardværdien 'hverdage', ville hver eneste kategori,
     ingen har rørt, forsvinde fra kortet om lørdagen — 21 af dem,
     uden en fejl og uden et spor. Præcis den fejl bestod prøven
     med, indtil prøve 3 blev skrevet om. */
  (105, 'Menukort', 'En kategori, ingen har rørt, gælder ALLE dage',
   (select coalesce(column_default, '') like '%alle%'
      from information_schema.columns
     where table_schema = 'public' and table_name = 'menu_kategorier'
       and column_name = 'dage'),
   'ALARM: standardværdien på menu_kategorier.dage er ikke ''alle''. Hver '
   || 'kategori, ingen har rørt, tømmer sig selv om lørdagen. '
   || 'Kør supabase/menukort-antal-og-dage.sql igen.'),

  /* DAGSBESKEDEN HAR EN OVERSKRIFT.
     Uden kolonnen står beskeden på forsiden uden hoved, og
     admin-feltet gemmer i ingenting. */
  (106, 'Kalender', 'Dagsbeskeden kan have en overskrift',
   (select count(*) = 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'dags_regler'
       and column_name = 'besked_titel'),
   'Dagens besked har ingen overskrift-kolonne. '
   || 'Kør supabase/dagsbesked-og-qr.sql.'),

  /* ⚠️ DEN HER FANGER EN STILLE FORTRYDELSE — den TREDJE af
     slagsen på mosede_dag_aaben. dagsbesked-og-qr.sql lægger
     QR-spærren oveni funktionen; køres dagsregler.sql eller
     lukkedag-vaern.sql IGEN bagefter, skrives den væk.

     Så står fluebenet "Tag ikke imod fra bordene" slået fra på
     Køkken-kø-fanen, mens databasen tager imod alligevel. Gæsten
     ved bord 7 sender videre, køkkenet får ordrer, de troede var
     lukket — ingen fejl, intet spor.

     ⚠️ FILEN PÅSTOD SELV, AT DEN HER LINJE FANDTES ("er-vi-klar.sql
     fanger det"), FRA 26/8 TIL 27/8. Det gjorde den ikke. En
     kommentar er ikke en prøve — og heller ikke et tjek. */
  (107, 'Restaurant', 'QR-bestilling kan spærres af databasen',
   (select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'mosede_dag_aaben'
         and pg_get_functiondef(p.oid) like '%bestilling_qr_lukket%')),
   'mosede_dag_aaben kender ikke QR-spærren — dagsregler.sql eller '
   || 'lukkedag-vaern.sql er kørt oveni. Kør supabase/dagsbesked-og-qr.sql igen.'),

  /* ⚠️ SAMME SLAGS FÆLDE SOM 105. Var standardværdien 'musik',
     ville hver eneste nyhed, ingen har rørt, blive tegnet som et
     musikarrangement med tid og sted, den ikke har. */
  (108, 'Nyheder', 'En nyhed uden slags er "andet"',
   (select count(*) = 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'nyheder'
       and column_name = 'slags')
   and (select coalesce(column_default, '') like '%andet%'
      from information_schema.columns
     where table_schema = 'public' and table_name = 'nyheder'
       and column_name = 'slags')
   and (select exists (select 1 from pg_constraint
                        where conname = 'nyhed_slags_ok')),
   'Nyhederne har ingen slags, eller standardværdien er ikke ''andet''. '
   || 'Kør supabase/nyheder-slags-og-billede.sql.'),

  /* ⚠️ ET BILLEDE MÅ KUN PEGE PÅ VORES EGEN SPAND. Uden reglen
     kan billede sættes til en hvilken som helst adresse på
     internettet, og forsiden henter et foto fra en server, vi
     ikke kender — hos hver eneste gæst. Værnet i browseren er
     to linjer i konsollen fra at være væk; det her er det andet
     lag. */
  (109, 'Nyheder', 'Et nyhedsfoto kan kun ligge i vores egen spand',
   (select exists (
      select 1 from pg_constraint c
       where c.conname = 'nyhed_billede_ok'
         and pg_get_constraintdef(c.oid)
             like '%storage/v1/object/public/nyheder/%')),
   'Kolonnen billede tager imod en hvilken som helst adresse. '
   || 'Kør supabase/nyheder-slags-og-billede.sql.'),

  /* ⚠️ SPANDEN SKAL FINDES, FØR FILEN KØRES.
     SQL må ikke oprette en storage-spand (fejl 42501), så
     nyheder-slags-og-billede.sql springer sine fire adgangsregler
     over, hvis storage.objects ikke er der endnu — i stilhed, med
     vilje, så filen kan køres på en tom database.

     Køres den FØR spanden er oprettet i dashboardet, står
     kolonnerne der, mens ingen kan lægge et foto op. Admin siger
     bare "kunne ikke gemme billedet". Derfor tælles reglerne her.

     Tælles på pg_policy og ikke på storage.objects: en fil, der
     NÆVNER en tabel, som ikke findes, fælder hele arket ved
     parsningen — også de 108 linjer, der intet har med storage
     at gøre. */
  (110, 'Nyheder', 'Adgangen til billedspanden er sat',
   (select count(*) = 4 from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'storage' and c.relname = 'objects'
       and p.polname like 'nyheder\_billeder\_%'),
   'Spanden "nyheder" mangler sine fire adgangsregler. Opret spanden i '
   || 'dashboardet (Storage → New bucket → navn "nyheder", Public), og kør '
   || 'derefter supabase/nyheder-slags-og-billede.sql IGEN.'),

  /* ⚠️ DEN HER FANGER EN STILLE FORTRYDELSE — den fjerde af
     slagsen. borde.sql sætter bord_status_ok til de TRE gamle ord,
     og bord-udeblev.sql udvider den med 'udeblevet'. Køres
     borde.sql igen bagefter, snævres listen ind, og så gør
     knappen Udeblev i admin ingenting.

     Fejlen ser ud som en knap, der ikke virker — og alternativet
     er, at personalet trykker Afvis i stedet. Så kan man bagefter
     ikke se forskel på "vi kunne ikke skaffe bordet" og "de kom
     ikke", og det nummer, der udebliver hver lørdag, forsvinder i
     bunken. Samme fælde som statuslisten i restaurant.sql. */
  (111, 'Borde', 'Et tomt bord kan skrives som udeblevet',
   (select coalesce((select pg_get_constraintdef(oid) from pg_constraint
                      where conname = 'bord_status_ok'
                        and conrelid = to_regclass('public.bordbestillinger')),
                    '') like '%udeblevet%'),
   'Bordene kender ikke ''udeblevet'' — knappen Udeblev gør ingenting, og '
   || 'en udeblivelse må skrives som et afslag. Kør supabase/bord-udeblev.sql.'),

  /* ⚠️ DEN HER STOD IKKE PÅ LISTEN, OG DET KOSTEDE EN NYHED (28/8).

     nyheder-fra-til.sql har stået i papirerne siden 24/8, men
     ikke her — og en tjekliste, der ikke kender en kolonne, siger
     god for dens fravær. Præcis den fejl er beskrevet i noten
     ved linje 83 om dagens_retter, og den gentog sig.

     MÅLT i produktionen: ejeren kunne ikke lægge en nyhed op.
     Databasen svarede 400 med "Could not find the 'vis_fra'
     column of 'nyheder' in the schema cache", og er-vi-klar.sql
     havde skrevet ALT ER KLAR få dage før.

     Koden er hærdet, så fanen nu virker uden kolonnerne — men
     tænd/sluk-datoerne findes ikke, før filen er kørt. */
  (112, 'Nyheder', 'Nyheder kan tænde og slukke sig selv',
   (select count(*) = 2 from information_schema.columns
     where table_schema = 'public' and table_name = 'nyheder'
       and column_name in ('vis_fra', 'vis_til')),
   'Nyhederne har ingen vis_fra/vis_til. Datofelterne findes ikke i admin, '
   || 'og en nyhed om lørdagens musik bliver stående om søndagen. '
   || 'Kør supabase/nyheder-fra-til.sql.'),

  /* Og værnet, der holder de to i den rigtige rækkefølge. En
     nyhed, der slutter før den begynder, er ikke farlig — den er
     bare usynlig, og så leder nogen efter en fejl i koden. */
  (113, 'Nyheder', 'Et baglæns vindue afvises af databasen',
   (select exists (select 1 from pg_constraint
                    where conname = 'nyhed_vindue_ok'
                      and conrelid = to_regclass('public.nyheder'))),
   'Værnet nyhed_vindue_ok mangler. Kør supabase/nyheder-fra-til.sql.'),

  /* ⚠️ MAIL ELLER NUMMER (29/8). Baglokalesiden tager imod en
     gæst, der kun skriver sin mail — kundens ord: "lade email
     eller nummer være som en option". Databasens gamle krav var
     telefon 8-15 cifre, punktum, og så blev hun afvist med en
     fejl, hun ikke kunne gøre noget ved.

     ⚠️ OG KØRES forespoergsler.sql IGEN, SKRIVES DET GAMLE KRAV
     TILBAGE. Så står forespoergsel_telefon_ok der igen, og fejlen
     er tilbage uden at nogen har rørt koden. Linjen her fanger
     begge dele: den nye regel skal FINDES, og den gamle skal være
     VÆK. */
  (114, 'Forespørgsler', 'Mail eller nummer er nok — og et halvt nummer er ikke',
   (select (select count(*) from pg_constraint
             where conrelid = to_regclass('public.forespoergsler')
               and conname in ('forespoergsel_kontakt_ok',
                               'forespoergsel_telefon_form_ok')) = 2
       and not exists (select 1 from pg_constraint
                        where conrelid = to_regclass('public.forespoergsler')
                          and conname = 'forespoergsel_telefon_ok')),
   'Baglokalesiden lader gæsten nøjes med en e-mail, men databasen kræver '
   || 'stadig et telefonnummer — hun bliver afvist uden at kunne gøre noget. '
   || 'Kør supabase/foresp-kontakt.sql (igen, hvis forespoergsler.sql er '
   || 'kørt bagefter).'),

  /* ⚠️ ARRANGEMENTERNE KUNNE IKKE RESERVERES (30/8). Knappen
     "Reservér plads" har stået på kalendersiden siden 23/8 uden en
     tabel bag sig. Uden de tre linjer her ville tjeklisten sige
     god for, at den stadig ikke virker — præcis fejlen fra
     dagens_retter 26/8 og nyheder-fra-til 28/8, som begge gentog
     sig, fordi en tabel manglede på listen. */
  (115, 'Arrangementer', 'Et arrangement kan tage imod tilmeldinger',
   (select count(*) = 4 from information_schema.columns
     where table_schema = 'public' and table_name = 'kalender'
       and column_name in ('tilmelding', 'pladser', 'pris_tekst', 'start_kl')),
   'Kalenderen kender ikke tilmelding/pladser/pris. Knappen "Reservér plads" '
   || 'på kalendersiden kan ikke bruges. Kør supabase/arrangementer.sql.'),

  (116, 'Arrangementer', 'Gæstelisten kan kun læses af personalet',
   (select count(*) = 4 from pg_policies
     where schemaname = 'public' and tablename = 'reservationer'),
   'Tabellen reservationer mangler sine fire adgangsregler. Uden dem kan '
   || 'enhver hente gæstelisten til fredagens koncert. Kør supabase/arrangementer.sql.'),

  /* Bremsen ER pladstællingen: uden den kan to gæster tage den
     samme sidste plads, og ingen opdager det før aftenen. */
  (117, 'Arrangementer', 'Pladserne tælles af databasen',
   (select exists (select 1 from pg_trigger where tgname = 'reservation_bremse')
       and to_regclass('public.arrangement_pladser') is not null),
   'Pladstællingen mangler. To gæster kan tage den sidste plads samtidig, og '
   || 'siden kan ikke vise, hvor mange der er tilbage. Kør supabase/arrangementer.sql.'),

  /* ⚠️ NØGLEN I QR-KODEN — OG DEN KAN FORSVINDE IGEN.
     Køres bordkort.sql eller borde.sql igen bagefter, giver de
     anon hele borde-tabellen tilbage med "grant select on
     public.borde to anon", og så kan enhver hente de 55 nøgler og
     selv bygge adresserne. Siden ville se helt rigtig ud imens.
     Det er den samme slags fælde som skraldespanden og
     lukkedag-værnet — derfor står den her og ikke i en note. */
  (118, 'Bordene', 'Værnet på QR-koderne står',
   (select exists (select 1 from pg_trigger where tgname = 'bestilling_bord_noegle')
       and exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'borde'
                      and column_name = 'kode')),
   'Nøglen på bordene mangler. Uden den er ?bord=7 et tal mellem 1 og 55, '
   || 'som enhver kan taste ind hjemmefra. Kør supabase/bord-noegle.sql.'),

  (119, 'Bordene', 'Gæsten kan IKKE læse nøglerne',
   (select to_regclass('public.borde') is null
        or not has_column_privilege('anon', 'public.borde', 'kode', 'select')),
   'anon kan læse kolonnen borde.kode — så kan enhver med anon-nøglen hente '
   || 'alle nøglerne og bygge adresserne selv. Det sker, hvis bordkort.sql er '
   || 'kørt igen bagefter. Kør supabase/bord-noegle.sql igen.'),

  /* Bestillingsnummeret (31/8): tælleren giver hvert kort et tal,
     man kan sige højt, og kvitteringen slår sit eget op på
     referencen. Mangler triggeren, står de nye kort uden nummer —
     og ingen fejler, det ser bare tomt ud. */
  (120, 'Bestillinger', 'Bestillingsnummeret tælles op',
   (select exists (select 1 from pg_trigger where tgname = 'bestilling_nummer')
       and exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'bestillinger'
                      and column_name = 'nummer')),
   'Nummereringen mangler — kortene viser kun den lange reference. '
   || 'Kør supabase/bestillingsnummer.sql.'),

  (121, 'Bestillinger', 'Kvitteringen kan hente sit nummer',
   (select exists (select 1 from pg_proc p
                    join pg_namespace ns on ns.oid = p.pronamespace
                    where ns.nspname = 'public'
                      and p.proname = 'mosede_bestillingsnummer'
                      and p.prosecdef)),
   'Gæstens opslag mangler (eller er ikke security definer) — kvitteringen '
   || 'kan ikke vise nummeret. Kør supabase/bestillingsnummer.sql.'),

  /* Arrangementets kategori (31/8): null = ikke valgt, og så
     gætter siden som før — men uden værnet kunne der stå en
     fjerde slags, som filterknapperne ikke kender. */
  (122, 'Kalenderen', 'Arrangementet kan bære en kategori',
   (select exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'kalender'
                      and column_name = 'kategori')
       and exists (select 1 from pg_constraint
                    where conname = 'kalender_kategori_ok')),
   'Kategorien mangler (eller dens værn gør) — admin kan ikke vælge '
   || 'Musik/Spisning/Fest, og siden gætter ud fra titlen. '
   || 'Kør supabase/arrangement-kategori.sql.'),

  /* ⚠️ SMØRREBRØD SOM SLAGS FORESPØRGSEL (31/8). Køres
     forespoergsler.sql eller frokost.sql igen bagefter, snævres
     listen ind — og så får en gæst, der trykker "Send
     forespørgsel" på smørrebrødssiden, en fejl, personalet aldrig
     hører om. Samme fælde som frokost.sql (tjek 70). */
  (123, 'Forespørgsler', 'Smørrebrød ud af huset er en lovlig slags',
   (select exists (select 1 from pg_constraint
                    where conname = 'forespoergsel_type_ok'
                      and pg_get_constraintdef(oid) like '%smoerrebroed%')),
   'Slagsen mangler — h-smorrebrod.html kan ikke sende. '
   || 'Kør supabase/smoerrebroed-forespoergsel.sql.'),

  /* ⚠️ VED BORDET ER NAVNET NOK (31/8) — men KUN ved bordet.
     Tjekket spørger efter bord_nummer i værnet: en check, der
     bare tillod en tom telefon overalt, ville fjerne den eneste
     vej tilbage til en gæst, der bestiller hjemmefra. */
  (124, 'Bestillinger', 'Telefonen er frivillig ved bordet — og kun dér',
   (select exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'bestillinger'
                      and column_name = 'telefon' and is_nullable = 'YES')
       and exists (select 1 from pg_constraint
                    where conname = 'bestilling_telefon_ok'
                      and pg_get_constraintdef(oid) like '%bord_nummer%')),
   'Gæsten ved bordet skal skrive et telefonnummer, hun ikke har brug '
   || 'for. Kør supabase/bord-uden-telefon.sql.'),

  /* Billedet pr. vare (31/8). Uden kolonnen SKJULER admin feltet
     (maaBillede) i stedet for at fejle — så det her er ikke en
     fejl, det er en oplysning om, at ejeren ikke kan lægge fotos
     op endnu. */
  (125, 'Menukortet', 'Hver vare kan bære et billede',
   (select exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'menu_varer'
                      and column_name = 'billede')),
   'Kolonnen mangler — billedfliserne er skjult i admin, og gæsten '
   || 'ser listen uden fotos. Kør supabase/vare-billede.sql.')
),

samlet as (
  select nr, del, hvad, ok, retning from tjek
  union all
  select 999, '', case
      when (select bool_and(coalesce(ok, false)) from tjek) then 'ALT ER KLAR'
      else (select count(*) from tjek where ok is not true)::text
           || ' TING MANGLER — se linjerne med ❌ ovenfor'
    end,
    (select bool_and(coalesce(ok, false)) from tjek), ''
)

select
  case when ok then '✅' else '❌' end as " ",
  del                                 as "Del",
  hvad                                as "Tjek",
  case when ok then '' else retning end as "Sådan retter du det"
from samlet
order by nr;

-- ------------------------------------------------------------
--  DET, DEN IKKE KAN SE
--  ------------------------------------------------------------
--  Filen spørger databasen, og databasen ved ikke alt. Den kan
--  ikke se, om Edge Function'en send-push er udgivet, om de seks
--  Database Webhooks er sat op i dashboardet, om HTTPS er tvunget
--  på GitHub Pages, eller om anon-nøglen i js/config.js hører til
--  det RIGTIGE projekt. De fire står på tjeklisten i README.
--
--  Og den siger ikke, om reglerne VIRKER — kun at de er der. Det
--  er prøvernes arbejde: proev-flerlejer.sql, proev-forespoergsler.sql,
--  proev-kalender.sql, proev-borde.sql, proev-udlejning.sql og
--  proev-push.sql prøver at bryde ind og skal alle skrive BESTOD.
-- ------------------------------------------------------------
