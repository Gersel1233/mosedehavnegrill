-- ============================================================
--  UDEBLIVELSER: EN SJETTE STATUS  (august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  HVAD DEN GØR
--  ------------------------------------------------------------
--  Udvider status-reglen på bestillinger med værdien 'udeblevet':
--  maden blev lavet, men gæsten kom aldrig. Det er noget andet end
--  'afvist' (personalet sagde nej, før der blev lavet noget), og
--  det er vigtigt at kunne se forskel:
--
--    · En udeblivelse tæller ALDRIG som omsætning. Salgsfanen
--      tæller kun 'afhentet' — det var den bygget til, så dén
--      regel kræver ingen ændring her.
--
--    · Udeblivelser samles pr. telefonnummer på salgsfanen, og
--      en ny bestilling fra et nummer med udeblivelser får et
--      mærke på personalesiden — så køkkenet kan se en gænger,
--      FØR de laver maden. Idéen er lånt fra spiis' brief (22/8),
--      hvor den var betalt med rigtige middage i skraldespanden.
--
--  Filen kan køres igen — reglen bygges om til det samme.
--
--  Gæstesiden rører aldrig status: adgangsreglen tvinger stadig
--  hver ny bestilling til at starte som 'ny', og kun chefen kan
--  flytte den. Se supabase/proev-udeblivelser.sql.
-- ============================================================

alter table public.bestillinger
  drop constraint if exists bestilling_status_ok;

alter table public.bestillinger
  add constraint bestilling_status_ok
  check (status in ('ny', 'bekraeftet', 'klar', 'afhentet', 'afvist', 'udeblevet'));


-- Rapport. Supabases SQL Editor viser kun den sidste sætnings
-- svar — se README-afsnittet "Supabases SQL Editor viser ikke
-- beskeder".
select
  case when exists (
    select 1 from information_schema.check_constraints
    where constraint_schema = 'public'
      and constraint_name = 'bestilling_status_ok'
      and check_clause like '%udeblevet%')
    then '✅ UDEBLEVET ER MED — kør supabase/proev-udeblivelser.sql som efterprøvning'
    else '❌ REGLEN MANGLER — kør filen igen, og læs fejlbeskeden ovenfor'
  end as svar;
