-- ============================================================
--  FROKOSTORDNINGEN BLIVER EN FORESPØRGSEL  (august 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER forespoergsler.sql og forespoergsel-kalender.sql.
--  Filen kan køres igen uden at ødelægge noget.
--
--  HVAD DEN GØR
--  ------------------------------------------------------------
--  Én ting: den udvider den tilladte liste over slags
--  forespørgsler med 'frokost'. Ikke en tabel, ikke en regel,
--  ikke en bremse — alt det findes i forvejen.
--
--  HVORFOR DET ER EN FORESPØRGSEL OG IKKE ET ABONNEMENT
--  ------------------------------------------------------------
--  Frokostordningen stod som fase 6 med "tilbagevendende
--  levering, pauser, helligdage". Det var en misforståelse, og
--  Mikkel rettede den 20/8: den mad, man også kan bestille, skal
--  bare kunne bestilles senest dagen før — og det gør forsidens
--  bestilling allerede.
--
--  Men designet fra 23/8 tegnede siden som et B2B-tilbud: firma,
--  CVR, faste ugedage, fakturamail og knappen "Få et tilbud".
--  Og dét er ikke en bestilling — det er præcis en forespørgsel:
--  et menneske skriver, personalet ringer, og der aftales en
--  pris. Samme skelet som catering, selskab og baglokale.
--
--  DEN OPTAGER INGEN DAGE, og det er med vilje. Havnen er ét
--  sted (se forespoergsel-kalender.sql), men en frokostordning
--  er mad, der kører ud af huset — lokalet står frit.
--  mosede_optager_dagen() svarer allerede nej for alt andet end
--  baglokale og selskab hos jer, så der er ingenting at rette.
--
--  FIRMANAVN OG CVR ligger i kolonnen detaljer (jsonb), som
--  forespoergsel-kalender.sql lagde. En kolonne pr. felt ville
--  betyde en SQL-fil, hver gang designet fik et felt mere.
-- ============================================================

begin;

-- ------------------------------------------------------------
--  DEN TILLADTE LISTE
--  ------------------------------------------------------------
--  Constrainten hedder det samme som i forespoergsler.sql, så
--  den erstattes i stedet for at ligge dobbelt. Køres den fil
--  igen bagefter, snævres listen ind igen — og så skal den her
--  køres igen. er-vi-klar.sql har en linje, der fanger det.
-- ------------------------------------------------------------
alter table public.forespoergsler
  drop constraint if exists forespoergsel_type_ok;

alter table public.forespoergsler
  add constraint forespoergsel_type_ok
  check (type in ('catering', 'baglokale', 'selskab', 'frokost'));

comment on column public.forespoergsler.type is
  'catering | baglokale | selskab | frokost. Kun baglokale og selskab hos jer optager dagen — se mosede_optager_dagen().';

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from pg_constraint
    where conname = 'forespoergsel_type_ok'
      and pg_get_constraintdef(oid) like '%frokost%')
    as "frokost er tilladt (skal være 1)",
  (select public.mosede_optager_dagen(
     'frokost', 'aftalt', current_date, '{}'::jsonb, null)::int)
    as "frokost optager dagen (skal være 0)";
