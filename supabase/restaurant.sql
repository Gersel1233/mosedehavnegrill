-- ============================================================
--  RESTAURANT-MODE: KØKKENETS EGNE TRIN  (august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER setup.sql, bordkort.sql, udeblivelser.sql OG
--  skraldespand.sql. Filen kan køres igen uden at ødelægge noget.
--
--  ⚠️ KØRES skraldespand.sql IGEN BAGEFTER, skriver den
--  bestilling_ikke_dobbelt tilbage til den gamle udgave — og så
--  kan et bord ikke bestille to gange mere (punkt 3 herunder).
--  er-vi-klar.sql har en linje, der fanger det.
--
--  HVAD DEN GØR
--  ------------------------------------------------------------
--  Tre ting:
--
--  1) To nye statusser på bestillinger — 'tilberedes' og
--     'serveret' — så en bordbestilling kan følge køkkenets egen
--     vej: ny → tilberedes → klar → serveret.
--  2) En fri zone-tekst på bordene: Terrassen, Molen, Inde.
--  3) Dubletvagten gælder ikke længere bordene — "Bestil noget
--     mere" skal kunne lægge en NY ordre på det samme bord.
--
--  ⚠️ DET ER DEN SAMME TABEL SOM ALT ANDET MAD, OG DET ER MED
--  VILJE. Briefen bad om, at bordbestillinger ikke måtte blandes
--  ind i den eksisterende admin. Det er løst med en egen SKÆRM,
--  ikke med en egen tabel:
--
--    · Køkkenet har ÉN kø. To tabeller ville være to lister, nogen
--      skal huske at kigge i — og den dag begge har travlt, er det
--      den ene, der bliver glemt.
--    · Dagens omsætning, salgstallene og udeblivelserne regner
--      allerede på bestillinger. En anden tabel ville skulle
--      regnes med i hver eneste af dem, hver gang.
--    · Bordnummeret ER adskillelsen: en bestilling med
--      bord_nummer er fra et bord, en uden er fra hjemmesiden.
--      Skærmen filtrerer; dataene deler sig ikke.
--
--  'klar' fandtes i forvejen (setup.sql) og bruges af begge veje.
--  En bestilling ud af huset går ny → bekraeftet → klar →
--  afhentet; en fra bordet går ny → tilberedes → klar → serveret.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) KØKKENETS TRIN
--    ---------------------------------------------------------
--    Reglen hedder det samme som i setup.sql og udeblivelser.sql,
--    så den erstattes i stedet for at ligge dobbelt. ⚠️ Køres en
--    af DE filer igen bagefter, snævres listen ind igen — og så
--    kan køkkenet ikke trykke "Tilberedes" mere. er-vi-klar.sql
--    har en linje, der fanger det.
-- ------------------------------------------------------------
alter table public.bestillinger
  drop constraint if exists bestilling_status_ok;

alter table public.bestillinger
  add constraint bestilling_status_ok
  check (status in ('ny', 'bekraeftet', 'tilberedes', 'klar',
                    'afhentet', 'serveret', 'afvist', 'udeblevet'));

comment on column public.bestillinger.status is
  'Ud af huset: ny → bekraeftet → klar → afhentet. Fra bordet: ny → tilberedes → klar → serveret. Plus afvist og udeblevet.';

-- ------------------------------------------------------------
-- 2) ZONEN PÅ BORDET
--    ---------------------------------------------------------
--    Fri tekst og ikke en liste: havnen hedder det, den hedder.
--    "Terrassen", "Molen", "Inde" er ejerens ord, ikke vores, og
--    en check-regel med tre navne ville betyde en SQL-fil den dag,
--    der kom et fjerde hjørne.
--
--    Kolonnen placering (inde/ude) bliver: den siger, om bordet
--    står i vejret, og det er noget andet end hvor det står.
-- ------------------------------------------------------------
alter table public.borde
  add column if not exists zone text;

alter table public.borde
  drop constraint if exists bord_zone_ok;

alter table public.borde
  add constraint bord_zone_ok
  check (zone is null or char_length(btrim(zone)) between 1 and 40);

comment on column public.borde.zone is
  'Hvor bordet står — Terrassen, Molen, Inde. Fri tekst: havnen hedder det, den hedder.';

create index if not exists borde_zone_idx
  on public.borde (lokation_id, zone, sortering);

-- ------------------------------------------------------------
-- 3) "BESTIL NOGET MERE" VED BORDET
--    ---------------------------------------------------------
--    Dubletvagten hedder bestilling_ikke_dobbelt og siger: samme
--    telefon, samme dag, samme TID er én bestilling, ikke to. Den
--    fanger den almindelige fejl, hvor gæsten trykker "Send" to
--    gange, fordi der ikke skete noget med det samme.
--
--    Ved et bord er den forkert, og fejlen var tavs:
--
--      En bordbestilling vælger ingen hentetid — hent_tid er
--      klokken NU. Selskabet ved bord 7 bestiller is efter maden,
--      trykker "Bestil noget mere", og rammer det samme minut. De
--      fik "Du har allerede sendt en bestilling til det
--      tidspunkt", som om de havde dobbeltklikket — og isen blev
--      aldrig bestilt. Fundet af en prøve, ikke ved at læse.
--
--    Vagten gælder derfor kun rækker UDEN bordnummer nu. Et bord
--    beskyttes af skærmen i stedet: knappen slås fra, mens der
--    sendes, og kvitteringen dækker formularen bagefter — man
--    skal aktivt trykke "Bestil noget mere" for at komme videre.
--
--    ⚠️ where-betingelsen skal have "slettet is null" med.
--    skraldespand.sql gjorde nøglen DELVIS, så en bestilling i
--    skraldespanden ikke spærrer for en ny. Fjernes den halvdel
--    her, får en gæst, hvis bestilling personalet lige har smidt
--    ud, "du har allerede sendt den her" på grund af noget, ingen
--    af dem kan se.
-- ------------------------------------------------------------
alter table public.bestillinger
  drop constraint if exists bestilling_ikke_dobbelt;

drop index if exists public.bestilling_ikke_dobbelt;

create unique index bestilling_ikke_dobbelt
  on public.bestillinger (telefon, hent_dato, hent_tid)
  where slettet is null and bord_nummer is null;

comment on index public.bestilling_ikke_dobbelt is
  'Dobbelttryk ud af huset. Gælder IKKE borde: "Bestil noget mere" er en ny ordre på det samme bord i det samme minut.';

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from pg_constraint
    where conname = 'bestilling_status_ok'
      and pg_get_constraintdef(oid) like '%tilberedes%'
      and pg_get_constraintdef(oid) like '%serveret%')
    as "koekkenets trin (skal være 1)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'borde'
      and column_name = 'zone')
    as "zonen paa bordet (skal være 1)",
  -- Postgres skriver indexdef med STORE bogstaver i nøgleordene
  -- ("bord_nummer IS NULL"), uanset hvordan filen er skrevet.
  -- Første udgave søgte med små og svarede 0 på et index, der var
  -- helt rigtigt. lower() gør linjen uafhængig af det.
  (select count(*) from pg_indexes
    where schemaname = 'public' and indexname = 'bestilling_ikke_dobbelt'
      and lower(indexdef) like '%bord_nummer is null%'
      and lower(indexdef) like '%slettet is null%')
    as "bestil mere ved bordet (skal være 1)";
