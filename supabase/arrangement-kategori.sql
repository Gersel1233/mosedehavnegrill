-- ============================================================
--  ARRANGEMENTET FÅR EN KATEGORI  (31. august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER arrangementer.sql. Filen kan køres igen uden at
--  ødelægge noget.
--
--  ------------------------------------------------------------
--  HVOR DEN KOMMER FRA
--  ------------------------------------------------------------
--  Kundens ord 31/8: "når man opretter et arrangement skal man
--  jo også vælge kategorien, som så skal opdateres og virke
--  korrekt på siden."
--
--  Kalendersiden GÆTTEDE kategorien ud fra ordene i titlen og
--  beskrivelsen — og alt, gættet ikke kendte, blev til "Musik".
--  Kunden så det selv: et arrangement stod som "MUSIK · 145",
--  fordi intet ord i titlen matchede. Et gæt er ikke et valg.
--
--  ------------------------------------------------------------
--  ⚠️ NULL BETYDER "IKKE VALGT" — OG SÅ GÆTTER SIDEN SOM FØR
--  ------------------------------------------------------------
--  Kolonnen er frivillig med vilje. De arrangementer, der
--  allerede ligger i kalenderen, har ingen kategori, og de skal
--  blive stående på siden præcis som i går — gættet i
--  js/skal/kalender.js er deres reserve. Ejeren vælger på de
--  nye, og kan rette de gamle med to tryk (Ret → kategori →
--  Gem ændringer).
--
--  De tre lovlige værdier er FILTRETS egne knapper på
--  h-kalender.html: Musik · Spisning · Fest. En fjerde slags er
--  en designbeslutning (en knap mere på siden), ikke bare en
--  værdi — derfor et check og ikke fri tekst.
-- ============================================================

alter table public.kalender
  add column if not exists kategori text;

-- Kan køres igen: smid det gamle værn væk og sæt det på ny.
alter table public.kalender
  drop constraint if exists kalender_kategori_ok;

alter table public.kalender
  add constraint kalender_kategori_ok
  check (kategori is null or kategori in ('musik', 'spisning', 'fest'));

-- Editoren viser kun den sidste sætnings svar — derfor en select.
select
  'kalender.kategori er på plads — null = ikke valgt, siden gætter som før'
    as resultat,
  count(*) filter (where kategori is not null) as raekker_med_kategori
from public.kalender;
