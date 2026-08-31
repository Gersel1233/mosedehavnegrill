-- ============================================================
--  VED BORDET ER NAVNET NOK  (31. aug 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER bordkort.sql (som gav bestillinger kolonnen
--  bord_nummer) og efter restaurant.sql. Filen kan køres igen.
--
--  ------------------------------------------------------------
--  HVORFOR
--  ------------------------------------------------------------
--  Kundens ord 31/8 om QR-siden: *"når jeg vil bestille skal jeg
--  skrive nummer og alt muligt shit — bare navn er ok, fordi de
--  sidder der, og admin kan jo se hvilket bord."*
--
--  Han har ret, og det er ikke bare bekvemmelighed. Telefonen har
--  ÉT formål på en bestilling: at personalet kan ringe, hvis noget
--  går galt. Ved et bord går man DERHEN — det er tyve meter, og
--  hele skærmen i køkkenet er bygget om, at man går ud og siger
--  det (se "Gå ud og sig noget"-kortet i js/admin/koekken.js).
--  Et telefonnummer, der aldrig bliver ringet til, er en
--  oplysning, vi opbevarer uden grund.
--
--  ⚠️ OG KRAVET FORSVINDER IKKE — DET FLYTTER.
--  En bestilling UDEN bordnummer (hjemmefra, til lugen) skal
--  stadig have et gyldigt nummer: dér ER opkaldet den eneste vej
--  tilbage til gæsten. Det er derfor betingelsen står på
--  bord_nummer og ikke som "telefon må være tom".
--
--  ⚠️ ET SKREVET NUMMER SKAL STADIG VÆRE ET NUMMER. Skriver
--  gæsten ved bordet alligevel sit nummer, må "12" ikke slippe
--  igennem i ly af undtagelsen — så ville personalet ringe
--  forgæves. Samme greb som forespoergsel_telefon_form_ok (28/8).
--
--  ⚠️ DUBLETVAGTEN ER IKKE BERØRT. bestilling_ikke_dobbelt blev
--  gjort til et delvist indeks i restaurant.sql med
--  "where slettet is null and bord_nummer is null" — altså tæller
--  den kun bestillinger til lugen, og en tom telefon ved bordet
--  kan ikke spærre for den næste.
-- ============================================================

begin;

-- ------------------------------------------------------------
--  1) KOLONNEN MÅ VÆRE TOM
-- ------------------------------------------------------------
alter table public.bestillinger
  alter column telefon drop not null;

-- ------------------------------------------------------------
--  2) MEN KUN VED ET BORD
-- ------------------------------------------------------------
alter table public.bestillinger
  drop constraint if exists bestilling_telefon_ok;

alter table public.bestillinger
  add constraint bestilling_telefon_ok
  check (
    -- Ved bordet: enten intet nummer, eller et rigtigt et
    (bord_nummer is not null and (
       telefon is null
       or btrim(telefon) = ''
       or char_length(regexp_replace(telefon, '[^0-9]', '', 'g')) between 8 and 15))
    -- Alle andre: som før — nummeret er den eneste vej tilbage
    or (bord_nummer is null
        and telefon is not null
        and char_length(regexp_replace(telefon, '[^0-9]', '', 'g')) between 8 and 15)
  );

comment on column public.bestillinger.telefon is
  'Påkrævet på alt UDEN et bordnummer — dér er opkaldet den eneste '
  'vej tilbage til gæsten. Ved et bord må den være tom: personalet '
  'går derhen. Se bestilling_telefon_ok.';

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'bestillinger'
      and column_name = 'telefon' and is_nullable = 'YES')
    as "telefon maa vaere tom (skal vaere 1)",
  (select count(*) from pg_constraint
    where conname = 'bestilling_telefon_ok'
      and pg_get_constraintdef(oid) like '%bord_nummer%')
    as "kravet haenger paa bordnummeret (skal vaere 1)";
