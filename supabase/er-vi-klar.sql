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
  (11, 'Fundament', 'Alle 15 tabeller findes',
   (select count(*) = 15 from pg_tables
     where schemaname = 'public' and tablename in (
       'lokationer', 'admin_adgang', 'aabningstider', 'lukkedage', 'kalender',
       'menu_kategorier', 'menu_varer', 'nyheder', 'indstillinger',
       'bestillinger', 'forespoergsler', 'bordbestillinger', 'udlejninger',
       'push_abonnementer', 'logbog')),
   'Mangler: ' || coalesce((select string_agg(t, ', ') from unnest(array[
       'lokationer', 'admin_adgang', 'aabningstider', 'lukkedage', 'kalender',
       'menu_kategorier', 'menu_varer', 'nyheder', 'indstillinger',
       'bestillinger', 'forespoergsler', 'bordbestillinger', 'udlejninger',
       'push_abonnementer', 'logbog']) t
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

  (40, 'Borde', 'Gæsten må læse bordlisten',
   (select count(*) > 0 from information_schema.role_table_grants
     where table_schema = 'public' and table_name = 'borde'
       and grantee = 'anon' and privilege_type = 'SELECT'),
   'Telefonen ved bordet kan ikke slå nummeret op, og siden siger '
   || '"vi kender ikke bord 7" til alle. Kør supabase/bordkort.sql — '
   || 'rettighederne står i den.'),

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
   || 'Kør supabase/forespoergsel-kalender.sql igen.')
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
