-- ============================================================
--  RET DET, MÅLINGEN FANDT I PRODUKTIONEN  (9. september 2026)
--  ------------------------------------------------------------
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn) →
--  SQL Editor → Run. Den kan køres igen: hver sætning rører kun
--  det, der IKKE står rigtigt endnu, og svarer "stod rigtigt",
--  når den ikke havde noget at lave.
--
--  ⚠️ HVORFOR DEN FINDES SOM EN FIL OG IKKE SOM FIRE TRYK I
--  ADMIN. De tre rettelser ligger på tre forskellige faner
--  (Kontakt, Nyheder, Dagens ret), og en oprydning, der er fire
--  steder, bliver til tre. Her er den ét indsæt.
--
--  ⚠️ OG HVORFOR DEN IKKE KUNNE LAVES HERFRA. Rettelserne blev
--  forsøgt med anon-nøglen fra js/config.js, og RLS svarede
--  HTTP 200 med en TOM liste — altså ser et blokeret skriv ud
--  som et vellykket kald. Det er husets ældste ar i en ny
--  forklædning: en handling, der ikke rammer noget, siger
--  "det gik godt". Skriv aldrig "rettet" om et PATCH-svar uden
--  at læse rækken bagefter.
--
--  Filen rører TRE ting og ikke andet. Menukortet, priserne,
--  åbningstiderne, de 55 borde, deres QR-nøgler, bestillingerne
--  og forespørgslerne er urørte.
-- ============================================================

begin;

create temporary table ret_rapport (nr int, hvad text, resultat text);
truncate ret_rapport;

-- ------------------------------------------------------------
--  1) ADRESSEN — databasen sagde stadig 20L
--
--  ⚠️ DET ER DEN VIGTIGSTE AF DE TRE, og grunden er, at
--  DATABASEN SLÅR KODEN på netop det felt. Footeren,
--  adressekortet, persondatasiden og JSON-LD'en er statiske og
--  siger 20I — men "Vis rute" læser lokationer.adresse
--  (js/skal/kontakt.js linje 199-204). Altså LÆSTE gæsten 20I
--  og blev sendt til 20L, når hun trykkede på knappen.
--
--  Historikken står i CLAUDE.md under "Husnummeret er 20I":
--  23/8 20I (designets handoff) · 1/9 20L (ejerens håndskrevne
--  ark) · 9/9 20I (årsrapporten til Erhvervsstyrelsen). Et
--  dokument slår et håndskrevet ark.
--
--  Det er den SAMME sætning som i ejerens-oplysninger.sql. Den
--  står her, så de tre rettelser kan køres på én gang — og
--  begge filer kan køres igen uden at skændes.
-- ------------------------------------------------------------
with r as (
  update public.lokationer
     set adresse = 'Havnevej 20I'
   where id = 'mosede'
     and adresse is distinct from 'Havnevej 20I'
  returning id)
insert into ret_rapport select 1, 'Adressen -> Havnevej 20I',
  case when exists (select 1 from r)
       then '✅ rettet — "Vis rute" peger rigtigt nu'
       else '· stod rigtigt i forvejen' end;

-- ------------------------------------------------------------
--  2) NYHEDEN — tre stavefejl i den tekst, gæsten læser
--
--  Live-teksten: "her ebstiller i mad, forspørger på
--  arregementer, catering, baglokalet …"
--
--  ⚠️ DER MATCHES PÅ SELVE STAVEFEJLEN, ikke på rækkens id.
--  Et id er rigtigt lige nu og forkert i morgen, hvis nyheden
--  bliver slettet og skrevet igen — og en opdatering på et
--  forkert id rammer en ANDEN nyhed uden at sige det.
--  Fejlordene kan kun stå ét sted.
--
--  ⚠️ OG DEN KAN KØRES IGEN. replace() på et ord, der allerede
--  er rettet, gør ingenting, og WHERE-linjen holder rækker
--  uden fejl helt uden for opdateringen.
--
--  "ebstiller i" rettes i ÉT hug til "bestiller I", fordi det
--  er Mikkels egen ordlyd: "her bestiller I mad, forespørger på
--  arrangementer". Et bart ' i mad' -> ' I mad' ville kunne
--  ramme en sætning i en fremtidig nyhed, hvor det lille i er
--  det rigtige.
-- ------------------------------------------------------------
with r as (
  update public.nyheder
     set tekst = replace(replace(replace(tekst,
           'ebstiller i',  'bestiller I'),
           'forspørger',   'forespørger'),
           'arregementer', 'arrangementer')
   where lokation_id = 'mosede'
     and (tekst like '%ebstiller%'
       or tekst like '%forspørger%'
       or tekst like '%arregementer%')
  returning id)
insert into ret_rapport select 2, 'Nyhedens tre stavefejl',
  case when exists (select 1 from r)
       then '✅ rettet i ' || (select count(*) from r) || ' nyhed(er)'
       else '· ingen nyhed havde dem' end;

-- ------------------------------------------------------------
--  3) PRØVERÆKKEN «Bæ» I dagens_retter — fra 7/9, uden pris
--
--  ⚠️ SKJUL ER IKKE SLET, og her er der ikke noget valg: tabellen
--  dagens_retter har INGEN slettet-kolonne, altså ingen
--  skraldespand og ingen fortrydelse. aktiv = false er den vej,
--  der kan gøres om — og den virker: Butik.dagensRetter
--  filtrerer på `r.aktiv !== false` (js/store.js linje 3325).
--  Den hårde sletning står kommenteret ud nederst, som i
--  ryd-proevedata.sql: en sletning, der ikke kan fortrydes, må
--  ikke ske i det samme tryk som en, der kan.
--
--  ⚠️ OG DEN KAN IKKE RAMME EN RIGTIG RET. Tre krav skal være
--  opfyldt på én gang: forretningen er 'mosede', navnet er
--  præcis «bæ» (samme sammenligning som tabellens egen nøgle,
--  lower+btrim), og der er INGEN pris. En ret, køkkenet mener
--  noget med, har en pris — det er hele reglen fra 7/9.
--
--  ⚠️ RETTELSEN HER ER KOSMETISK, og det skal siges rent ud:
--  rækken er dateret 7/9 og er dermed usynlig i forvejen
--  (ugeplanen viser syv dage FREM), og Salg regner på
--  bestillinger og rører slet ikke dagens_retter — målt i
--  js/admin/salg.js: nul træffere på "dagens". Det er
--  oprydning i en driftstabel, ikke en fejl, gæsten kan se.
-- ------------------------------------------------------------
with r as (
  update public.dagens_retter
     set aktiv = false
   where lokation_id = 'mosede'
     and lower(btrim(navn)) = 'bæ'
     and pris is null
     and aktiv
  returning id)
insert into ret_rapport select 3, 'Prøverækken «Bæ» skjult',
  case when exists (select 1 from r)
       then '✅ skjult (aktiv = false — kan slås til igen)'
       else '· der lå ingen aktiv prøverække' end;

-- ------------------------------------------------------------
--  4) ARRANGEMENTET DEN 17/9 — filen RETTER det ikke med vilje
--
--  ⚠️ DET ER DIN BESLUTNING, IKKE KODENS. Rækken har titlen
--  «havne», 40 pladser, prisen 145 og ÅBEN tilmelding — men
--  ingen tid, ingen beskrivelse og ingen kategori. Den står på
--  forsidens musikbanner, og en gæst kan reservere en plads.
--
--  Et opfundet navn eller et gættet klokkeslæt ville være
--  præcis dét, huset har en regel imod: "et opdigtet
--  ARRANGEMENT er en aften, folk møder op til". Så filen siger,
--  hvad der mangler, og lader dig vælge.
--
--  Fra 9/9 kan admin i øvrigt ikke længere GEMME et arrangement
--  med åben tilmelding uden et klokkeslæt — se værnet i
--  js/admin/kalender.js. Rækken her er fra før det.
-- ------------------------------------------------------------
insert into ret_rapport
select 4, '❓ Arrangementet ' || to_char(dato, 'DD/MM') || ': «' || titel || '»',
       'tager imod ' || coalesce(pladser, 0) || ' tilmeldinger, men mangler: '
       || concat_ws(', ',
            case when start_kl    is null then 'klokkeslæt'   end,
            case when beskrivelse is null or btrim(beskrivelse) = ''
                 then 'beskrivelse' end,
            case when kategori    is null then 'kategori'     end)
  from public.kalender
 where lokation_id = 'mosede' and type = 'arrangement'
   and offentlig and tilmelding and dato >= current_date
   and (start_kl is null or beskrivelse is null or kategori is null);

insert into ret_rapport
select 5, '✅ Ingen arrangementer med åben tilmelding mangler noget', 'intet at gøre'
 where not exists (
   select 1 from public.kalender
    where lokation_id = 'mosede' and type = 'arrangement'
      and offentlig and tilmelding and dato >= current_date
      and (start_kl is null or beskrivelse is null or kategori is null));

-- ------------------------------------------------------------
--  RAPPORTEN — hvordan de tre felter står nu
-- ------------------------------------------------------------
insert into ret_rapport
select 10, 'Adressen står nu', adresse || ' · ' || postnr || ' ' || by
  from public.lokationer where id = 'mosede';

insert into ret_rapport
select 11, 'Nyheden står nu', left(tekst, 90) || '…'
  from public.nyheder
 where lokation_id = 'mosede' and aktiv
 order by dato desc, id desc limit 1;

commit;

select nr, hvad, resultat from ret_rapport order by nr;

-- ============================================================
--  DE TO TING, FILEN MED VILJE IKKE GØR
--  ------------------------------------------------------------
--  A) ARRANGEMENTET. Vælg selv, og kør ÉN af de to:
--
--     -- fyld det ud (skriv dit eget navn, din egen tid):
--     -- update public.kalender
--     --    set titel = 'SKRIV NAVNET HER',
--     --        start_kl = '18:00',
--     --        beskrivelse = 'SKRIV HVAD DER SKER'
--     --  where lokation_id = 'mosede' and dato = '2026-09-17';
--
--     -- eller luk for tilmeldinger, til det er klar:
--     -- update public.kalender set tilmelding = false
--     --  where lokation_id = 'mosede' and dato = '2026-09-17';
--
--  B) DEN HÅRDE SLETNING af prøverækken. Den kan ikke fortrydes,
--     og punkt 3 ovenfor har allerede taget rækken af skærmen:
--
--     -- delete from public.dagens_retter
--     --  where lokation_id = 'mosede'
--     --    and lower(btrim(navn)) = 'bæ' and pris is null;
-- ============================================================
