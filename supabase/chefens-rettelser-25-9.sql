-- ============================================================
--  CHEFENS RETTELSER, SOM KORTENE HAR — OG SIDEN IKKE HAVDE
--  (25. september 2026)
-- ============================================================
--  Chefens besked til Mikkel, holdt op mod de trykte kort fra 25/9
--  og mod databasen (læst med anon-nøglen 25/9 kl. 18.57). Mikkels
--  afgørelse samme aften, ordret:
--
--    *"Flaske/dåse til 30 kr. og Gylden Dame/Lux til 40 kr. skal
--    IKKE fjernes. Chefen skrev udtrykkeligt, at teksten »Kun take
--    away« skulle fjernes under begge produkter."*
--
--    *"Fjern de selvstændige produkter flæskestegssandwich,
--    frikadellesandwich og bøfsandwich. Bevar flæskesteg og
--    frikadelle som varianter af den almindelige sandwich til 75 kr."*
--
--    *"Hjemmesiden skal derfor vise: Sauce, topping eller guf – 8 kr."*
--
--  Filen gør tre ting og ingen andre:
--    1) "Kun take away" væk fra de to øl — varen og prisen bliver
--    2) "Strøssel, topping eller guf" hedder "Sauce, topping eller
--       guf", som på kort 05. Prisen (8) røres ikke
--    3) Den almindelige sandwich får fyldet som et VALG, så bonen
--       siger "Sandwich · Flæskesteg" og ikke bare "Sandwich"
--
--  De tre selvstændige sandwich SLUKKES i
--  `sluk-det-kortene-ikke-viser.sql` — ét sted, ikke to.
--
--  ⚠️ INGEN PRIS ÆNDRES, og derfor ingen ejer-blok. Et valg uden
--  tillæg er ikke penge (`mosede_valg_tillaeg_aftryk` tæller kun
--  tillæg over 0), og et navn og en beskrivelse er ikke en pris.
--
--  ⚠️ TO VARER MED SAMME NAVN ER I ORDEN HER. Efter omdøbningen står
--  "Sauce, topping eller guf" både under Kugleis og under Softice og
--  vafler — begge til 8 kr., som kortet. Prisværnet
--  (gaestens-regler.sql) samler ALLE priser for navnet og godtager
--  linjen, hvis den rammer én af dem, så en bestilling afvises ikke.
--
--  ⚠️ MATCHER PÅ NAVN, ALDRIG PÅ ID, og kan køres igen: hver
--  opdatering har `is distinct from`.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;

-- ------------------------------------------------------------
--  1) "KUN TAKE AWAY" VÆK — VARERNE BLIVER
--     Kun beskrivelsen ryddes, og kun hvis den er præcis den
--     tekst. Har nogen skrevet noget andet i den siden, står det.
-- ------------------------------------------------------------
update public.menu_varer mv
   set beskrivelse = null
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and mk.lokation_id = 'mosede'
   and lower(btrim(mv.navn)) in ('flaske eller dåse', 'gylden dame / lux')
   and lower(btrim(coalesce(mv.beskrivelse, ''))) = 'kun take away';

-- ------------------------------------------------------------
--  2) STRØSSEL → SAUCE
-- ------------------------------------------------------------
update public.menu_varer mv
   set navn = 'Sauce, topping eller guf'
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and mk.lokation_id = 'mosede'
   and mk.afdeling = 'is'
   and lower(btrim(mv.navn)) = 'strøssel, topping eller guf';

-- ------------------------------------------------------------
--  3) SANDWICHENS FYLD SOM ET VALG
--     ---------------------------------------------------------
--     Kort 02 BURGERE & SANDWICHES, ordret: *"Kebab, kylling/bacon,
--     tun, frikadelle, æg, flæskesteg, roastbeef m.fl."* De syv er
--     valget — hverken flere eller færre, for det er dem, kortet
--     nævner. "m.fl." er ejerens: resten fra bestillingssedlen
--     skrives ind i admin → Menukort under varen, når de er kendt.
--
--     ⚠️ Et valg gør fyldet OBLIGATORISK (gaestens-regler.sql:
--     bestilling_mangler_valg). Det er meningen — "Sandwich" alene
--     på bonen er køkkenet, der ringer op og spørger.
--
--     Beskrivelsen følger kortet. Den gamle ("Kebab, kylling, tun,
--     frikadelle eller æg") manglede flæskesteg og roastbeef.
-- ------------------------------------------------------------
update public.menu_varer mv
   set valg = '["Kebab", "Kylling/bacon", "Tun", "Frikadelle", "Æg", "Flæskesteg", "Roastbeef"]'::jsonb,
       beskrivelse = 'Kebab, kylling/bacon, tun, frikadelle, æg, flæskesteg, roastbeef m.fl.'
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id
   and mk.lokation_id = 'mosede'
   and lower(btrim(mk.navn)) = 'sandwich'
   and lower(btrim(mv.navn)) = 'sandwich'
   and (mv.valg is distinct from '["Kebab", "Kylling/bacon", "Tun", "Frikadelle", "Æg", "Flæskesteg", "Roastbeef"]'::jsonb
        or mv.beskrivelse is distinct from 'Kebab, kylling/bacon, tun, frikadelle, æg, flæskesteg, roastbeef m.fl.');

commit;


-- ------------------------------------------------------------
--  RAPPORT. SQL Editoren viser kun den SIDSTE sætnings svar.
--  Alle tre tal skal stå, som navnet siger.
-- ------------------------------------------------------------
select
  (select count(*) from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede'
      and lower(btrim(mv.navn)) in ('flaske eller dåse', 'gylden dame / lux')
      and mv.aktiv and mk.aktiv
      and mv.beskrivelse is null)                         as oel_uden_take_away_skal_vaere_2,
  (select count(*) from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede'
      and lower(btrim(mv.navn)) = 'strøssel, topping eller guf')
                                                          as stroessel_skal_vaere_0,
  (select valg from public.menu_varer mv
     join public.menu_kategorier mk on mk.id = mv.kategori_id
    where mk.lokation_id = 'mosede'
      and lower(btrim(mk.navn)) = 'sandwich'
      and lower(btrim(mv.navn)) = 'sandwich'
    limit 1)                                              as sandwichens_fyld;
