-- ============================================================
--  HVOR ER BESTILLINGEN KOMMET IND FRA?  (8. sep 2026)
--  ------------------------------------------------------------
--  Kør EFTER setup.sql. Kan køres igen uden at ødelægge noget.
--
--  ------------------------------------------------------------
--  HVORFOR DEN HER FIL FINDES
--  ------------------------------------------------------------
--  Kundens ord med et skud af et bestillingskort: *"det skal
--  være tydeligt, hvad det er, hvor det er bestilt fra osv."*
--
--  Den første halvdel — HVAD det er — blev besvaret uden SQL:
--  Admin.vareMaerke læser LINJERNE og sætter 🥪 Smørrebrød eller
--  🧀 Tapasfad på kortet. Det er et faktum om rækken, ikke et
--  gæt.
--
--  Den anden halvdel kunne IKKE besvares, og det blev målt:
--  `lavReference('SM')` bruges til AL mad, og der er ingen
--  kolonne, der siger, hvilken dør gæsten gik ind ad. Systemet
--  vidste kun *bord eller luge* (af bord_nummer). Om en
--  bestilling kom ind ad smørrebrødssiden eller ad forsiden var
--  ikke gemt nogen steder — og det er dét, den her kolonne
--  retter.
--
--  ------------------------------------------------------------
--  ⚠️ DEN MÅ ALDRIG KUNNE AFVISE EN BESTILLING
--  ------------------------------------------------------------
--  Det er kolonnens vigtigste egenskab, og den er derfor
--  `null`-bar UDEN en standardværdi.
--
--  · GAMLE RÆKKER FÅR IKKE ET GÆT. En bestilling fra 19. august
--    kom ind ad en side, vi ikke kan vide hvilken var — og et
--    'forside' skrevet på den ville være en påstand, ingen har
--    målt. null betyder "vi ved det ikke", og admin skriver
--    derfor ingen linje. Det er husets regel om ikke at finde på
--    tal, nu om en kanal.
--
--  · OG EN UKENDT VÆRDI BLIVER null, IKKE EN FEJL. Klienten
--    normaliserer i forvejen (KANALER i js/store.js), så en ny
--    side med et navn, listen ikke kender, sender null. CHECK'et
--    herunder er derfor kun det tredje lag — det, der gælder for
--    den, der POSTer direkte til API'et.
--
--    Havde vi i stedet ladet CHECK'et afvise, ville en tastefejl
--    i én sides data-attribut lukke bestilling på netop den side,
--    og gæsten ville få en rå databasefejl at se. En oplysning,
--    der kan spærre for en bestilling, er ikke en oplysning
--    værd at have.
--
--  ------------------------------------------------------------
--  ⚠️ OG DEN ER GÆSTENS EGET ORD, IKKE ET BEVIS
--  ------------------------------------------------------------
--  Feltet kommer fra browseren og kan ændres med to linjer i en
--  konsol. Det gør ikke noget: kolonnen afgør INTET — ikke
--  prisen, ikke varslet, ikke hvad køkkenet laver, ikke om
--  bestillingen bliver taget imod. Den er til for at ejeren kan
--  se, hvilken side der tjener penge.
--
--  Det, der ER et bevis, ligger andre steder og er urørt:
--  bord_nummer + bord_kode (supabase/bord-noegle.sql) siger, at
--  nogen har stået ved bordet, og hvordan/leverings_adresse
--  hænger sammen begge veje.
--
--  ------------------------------------------------------------
--  DE FEM ORD, OG HVORFOR DE ER FÅ
--  ------------------------------------------------------------
--    forside       forsidens bestillingsafsnit (index.html)
--    smoerrebroed  h-smorrebrod.html
--    tapas         m-tapas.html
--    bestil        bestil/ — smørrebrødets ældre side
--    bord          ved-bordet/ — QR-koden ved bordet
--
--  ⚠️ 'bord' ER MED, SELV OM bord_nummer SIGER DET SAMME. Uden
--  den skulle Salg-fanen særbehandle netop den ene kanal, og en
--  tælling med et hul i er en tælling, ingen stoler på. Kortet
--  viser den til gengæld IKKE — 🍽️ Bord 7 står der allerede, og
--  to udgaver af den samme oplysning er én for meget.
-- ============================================================

begin;

alter table public.bestillinger
  add column if not exists kanal text;

/* Lag 3, som altid: formularen kan omgås med to linjer i en
   browserkonsol, databasen kan ikke. Navnet står i fejlen med
   vilje — js/store.js oversætter det.

   ⚠️ null ER LOVLIGT, og det er hele pointen: gamle rækker har
   ingen kanal, og en ukendt værdi normaliseres til null af
   klienten, før den kommer hertil. */
alter table public.bestillinger
  drop constraint if exists bestilling_kanal_ok;

alter table public.bestillinger
  add constraint bestilling_kanal_ok
  check (kanal is null or kanal in
    ('forside', 'smoerrebroed', 'tapas', 'bestil', 'bord'));

comment on column public.bestillinger.kanal is
  'Hvilken side bestillingen kom ind ad. null = ukendt (rækker fra før 8. sep 2026, eller et navn klienten ikke kendte). Oplyser KUN — afgør intet.';

commit;

-- ------------------------------------------------------------
--  ER DEN LANDET?
--  Supabases SQL Editor viser kun den SIDSTE sætnings svar.
-- ------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'bestillinger'
      and column_name = 'kanal') as "kolonnen (skal være 1)",
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'bestillinger'
      and column_name = 'kanal' and is_nullable = 'YES')
    as "må være tom (skal være 1)",
  (select count(*) from pg_constraint
    where conname = 'bestilling_kanal_ok') as "reglen (skal være 1)",
  (select count(*) from public.bestillinger where kanal is null)
    as "gamle rækker uden kanal (får IKKE et gæt)";
