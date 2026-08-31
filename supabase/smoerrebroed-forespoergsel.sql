-- ============================================================
--  SMØRREBRØD UD AF HUSET BLIVER EN FORESPØRGSEL  (31. aug 2026)
--  ------------------------------------------------------------
--  Kør i Mosede-projektet: epwyjzakvvbxtpvnhvbn
--  Tjek projekt-id'et i adresselinjen, FØR du trykker Run.
--
--  Kør EFTER forespoergsler.sql, forespoergsel-kalender.sql og
--  frokost.sql. Filen kan køres igen uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVAD DEN GØR
--  ------------------------------------------------------------
--  Én ting: den udvider den tilladte liste over slags
--  forespørgsler med 'smoerrebroed'. Ikke en tabel, ikke en
--  regel, ikke en bremse — alt det findes i forvejen.
--
--  ------------------------------------------------------------
--  HVORFOR SIDEN HOLDT OP MED AT VÆRE EN BESTILLING
--  ------------------------------------------------------------
--  Kundens ord 31/8 om "Smørrebrød ud af huset": *"fuck af med
--  kalenderen, det er ligegyldigt, og skriv en masse godt, men
--  så bare hav en knap, der hedder kontakt og få et tilbud."*
--  Adspurgt direkte valgte han, at bestillingsformularen skal
--  HELT væk fra siden.
--
--  Han har ret i formen: fyrre stykker til en reception er ikke
--  en kurv med en hentetid — det er en samtale om, hvad der skal
--  på, hvor mange der kommer, og hvad det koster.
--
--  ⚠️ MEN DET MÅ IKKE ENDE I EN INDBAKKE. Han sagde i samme
--  åndedrag, at "alt, der svares derinde, skal vi kunne se inde i
--  Forespørgsler i admin" — og 28/8 afviste han selv mail som vej
--  ind for bordbestilling: *"det skal foregå igennem systemet og
--  admin og ikke igennem mail."* En forespørgsel, der kun er en
--  mail, tæller ikke med nogen steder, står ikke på en fane, og
--  kan ikke lægges i kalenderen.
--
--  Derfor: siden får den SAMME motor som selskaber, catering,
--  frokost og baglokalet (js/skal/forespoergsel.js), rækken
--  lander i Forespørgsler med sin egen slags — og mailknappen
--  bliver stående som den anden vej for den, der hellere vil
--  skrive selv.
--
--  ------------------------------------------------------------
--  DEN OPTAGER INGEN DAGE, og det er med vilje. Smørrebrød ud af
--  huset er mad, der kører ud; lokalet står frit.
--  mosede_optager_dagen() svarer allerede nej for alt andet end
--  baglokale og selskab hos jer, så der er ingenting at rette.
-- ============================================================

begin;

-- ------------------------------------------------------------
--  DEN TILLADTE LISTE
--  ------------------------------------------------------------
--  Constrainten hedder det samme som i forespoergsler.sql og
--  frokost.sql, så den erstattes i stedet for at ligge dobbelt.
--  ⚠️ Køres forespoergsler.sql eller frokost.sql igen bagefter,
--  snævres listen ind — og så skal den her køres igen.
--  er-vi-klar.sql har en linje, der fanger det.
-- ------------------------------------------------------------
alter table public.forespoergsler
  drop constraint if exists forespoergsel_type_ok;

alter table public.forespoergsler
  add constraint forespoergsel_type_ok
  check (type in ('catering', 'baglokale', 'selskab', 'frokost', 'smoerrebroed'));

comment on column public.forespoergsler.type is
  'catering | baglokale | selskab | frokost | smoerrebroed. Kun baglokale '
  'og selskab hos jer optager dagen — se mosede_optager_dagen().';

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from pg_constraint
    where conname = 'forespoergsel_type_ok'
      and pg_get_constraintdef(oid) like '%smoerrebroed%')
    as "smoerrebroed er tilladt (skal vaere 1)",
  (select count(*) from pg_constraint
    where conname = 'forespoergsel_type_ok'
      and pg_get_constraintdef(oid) like '%frokost%')
    as "frokost er der stadig (skal vaere 1)",
  (select public.mosede_optager_dagen(
     'smoerrebroed', 'aftalt', current_date, '{}'::jsonb, null)::int)
    as "smoerrebroed optager dagen (skal vaere 0)";
