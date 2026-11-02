-- ============================================================
--  ET ARRANGEMENT KAN VÆRE BÅDE MUSIK OG SPISNING  (2. november 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER arrangement-kategori.sql. Kan køres igen uden at
--  ødelægge noget.
--
--  Chefens ord 2/11: "man kan ikke lave et blandet event, som både
--  er musik og spisning." Admin har nu knappen "Musik & spisning"
--  (værdien 'musik_spisning'), og kalendersiden viser det under
--  BÅDE Musik- og Spisning-filteret. Værnet herunder skal bare
--  kende den nye værdi — ellers afviser databasen gemmet.
--
--  (Kl. 02.00-problemet kræver ingen SQL: admin sætter selv
--  slut_dato til dagen efter, når sluttiden er før starttiden.)
-- ============================================================

alter table public.kalender
  drop constraint if exists kalender_kategori_ok;

alter table public.kalender
  add constraint kalender_kategori_ok
  check (kategori is null
         or kategori in ('musik', 'spisning', 'fest', 'andet', 'musik_spisning'));

select 'Musik & spisning kan nu gemmes på et arrangement' as resultat;
