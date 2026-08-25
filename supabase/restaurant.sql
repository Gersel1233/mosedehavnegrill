-- ============================================================
--  RESTAURANT-MODE: KØKKENETS EGNE TRIN  (august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER setup.sql, bordkort.sql og udeblivelser.sql.
--  Filen kan køres igen uden at ødelægge noget.
--
--  HVAD DEN GØR
--  ------------------------------------------------------------
--  To ting, og de er begge små:
--
--  1) To nye statusser på bestillinger — 'tilberedes' og
--     'serveret' — så en bordbestilling kan følge køkkenets egen
--     vej: ny → tilberedes → klar → serveret.
--  2) En fri zone-tekst på bordene: Terrassen, Molen, Inde.
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
    as "zonen paa bordet (skal være 1)";
