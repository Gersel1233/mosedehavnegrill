-- ============================================================
--  KORTENES RETTELSER — DATABASEN FØLGER DE TRYKTE KORT
--  (27. september 2026)
-- ============================================================
--  Afvigelsesrapporten 27/9 holdt databasen (læst med anon-nøglen
--  27/9) op mod de syv trykte menukort og de to bestillingssedler i
--  Mosede_Havnecafe_ENDLIGE_PDF. Alle PRISER stemte allerede; det,
--  der ikke stemte, var navne, beskrivelser og varianter. Mikkels
--  afgørelse samme dag, ordret:
--
--    *"forbered de øvrige rettelser fra afvigelsesrapporten, så
--    hjemmesiden kommer til at stemme med de godkendte menukort.
--    Behold Sliders og de øvrige ekstra produkter indtil videre.
--    Ændr ikke Slushice-priserne endnu. Flæskesvær skal fremgå
--    under barens snacks til 35 kr."*
--
--  Filen gør derfor kun det her:
--    1) Beskrivelser som kortene (morgenbrød, morgen komplet, English
--       Breakfast, All in One, lun delle, tartar)
--    2) Navne som kortene (rejer, nuggets, brød, toppingbøtte,
--       pandekager, snaps, roastbeef, ostemad, ristet hotdog)
--    3) Sandwichen får alle 14 varianter fra bestillingssedlerne (og
--       loftet på varianter hæves fra 12 til 16, så de kan være der)
--    4) Rejemaden får valget rugbrød/franskbrød (sedlerne har to linjer)
--    5) (Flæskesvær under barens snacks klares på menukortsiden — ingen dublet)
--    6) "Smoothie eller milkshake" → "Dagens smoothie"; Milkshake får kortets tekst
--
--  ⚠️ ÉN REGEL ÆNDRES: loftet i vare_valg_ok (se 3a).
--
--  ⚠️ INGEN PRIS ÆNDRES OG INGEN RÆKKE OPRETTES — derfor ingen
--  ejer-blok. Navne, beskrivelser og valg er ikke penge.
--
--  ⚠️ Sliders, "Lun delle eller steg", "Ekstra tilbehør" og Slushice
--  røres IKKE (Mikkels afgørelse ovenfor).
--
--  ⚠️ MATCHER PÅ NAVN, ALDRIG PÅ ID, og kan køres igen: hver
--  opdatering rammer kun det GAMLE navn / den gamle tekst.
--
--  Kør den i Mosede-projektet (epwyjzakvvbxtpvnhvbn).
-- ============================================================

begin;


-- En hjælper, der kun lever i den her transaktion: omdøb/beskriv en
-- vare i Mosede, fundet på sit NUVÆRENDE navn.
create or replace function pg_temp.ret(gammel text, nyt_navn text, ny_beskrivelse text default null)
returns void language sql as $$
  update public.menu_varer mv
     set navn = coalesce(nyt_navn, mv.navn),
         beskrivelse = coalesce(ny_beskrivelse, mv.beskrivelse)
    from public.menu_kategorier mk
   where mk.id = mv.kategori_id
     and mk.lokation_id = 'mosede'
     and lower(btrim(mv.navn)) = lower(btrim(gammel));
$$;

-- ------------------------------------------------------------
--  1) BESKRIVELSER SOM KORTENE
-- ------------------------------------------------------------
select pg_temp.ret('Morgenbrød', null, 'Spørg ved bestilling');
select pg_temp.ret('Morgenkomplet', 'Morgen komplet',
  'Kaffe eller juice, rundstykke med pålæg, æg eller bacon & grønt');
select pg_temp.ret('English breakfast', 'English Breakfast',
  'Ristet toastbrød, spejlæg, bacon, bønner, grønt, ost, ½ pølse, stegte champignoner og ½ stegt tomat');
select pg_temp.ret('Havnens all in one', 'Havnens All in One', 'Brød, skinke & spejlæg · + ost 10,-');
select pg_temp.ret('Lun delle, steg eller leverpostej med brød og surt', null, 'Med brød og surt');
select pg_temp.ret('Tartarmad', null, 'Bestilles dagen før');

-- ------------------------------------------------------------
--  2) NAVNE SOM KORTENE
-- ------------------------------------------------------------
select pg_temp.ret('Indbagte rejer med pommes', '8 indbagte rejer med pommes');
select pg_temp.ret('Nuggets med pommes', '10 nuggets med pommes');
select pg_temp.ret('Pølsebrød', 'Brød');
select pg_temp.ret('Bøtte med topping', 'Toppingbøtte');
select pg_temp.ret('2 hjemmelavede pandekager med sukker', '2 hjemmelavede pandekager');
select pg_temp.ret('2 hjemmelavede pandekager med is', '2 hjemmelavede pandekager med 1 kugle is');
select pg_temp.ret('Snaps, sambuca og shots', 'Snaps, spiritus og shots');
select pg_temp.ret('Hjemmelavet Roastbeef med remoulade og løg', 'Roastbeef med remoulade og løg');
select pg_temp.ret('Hjemmelavet Roastbeef med remoulade og løg, håndmad', 'Roastbeef med remoulade og løg, håndmad');
select pg_temp.ret('Ostemad Mellem lageret', 'Ostemad');
select pg_temp.ret('Ostemad, mellem lageret  håndmad', 'Ostemad, håndmad');

-- Hotdog: kort 02 har RISTET og FRANSK hotdog som hver sin linje.
-- Fransk findes allerede for sig — valget Fransk/Ristet på de to
-- "Hotdog"-rækker gav fransk hotdog to gange.
update public.menu_varer mv
   set navn = case lower(btrim(mv.navn)) when 'hotdog, lille' then 'Ristet hotdog, lille'
                                          else 'Ristet hotdog, stor' end,
       valg = null
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id and mk.lokation_id = 'mosede'
   and lower(btrim(mv.navn)) in ('hotdog, lille', 'hotdog, stor');

-- ------------------------------------------------------------
--  3a) LOFTET PÅ VARIANTER: 12 → 16
--      vare_valg_ok (vare-valg.sql) tillod 2-12. Sedlerne har 14
--      sandwichvarianter, så loftet hæves til 16 — ellers intet.
--      Samme tal står i js/store.js (vareValg) og js/store-skriv.js.
-- ------------------------------------------------------------
alter table public.menu_varer drop constraint if exists vare_valg_ok;
alter table public.menu_varer add constraint vare_valg_ok check (
    valg is null
    or (jsonb_typeof(valg) = 'array'
        and jsonb_array_length(valg) between 2 and 16
        and length(valg::text) <= 1200
        and public.mosede_valg_gyldig(valg)));

-- ------------------------------------------------------------
--  3) SANDWICHEN: ALLE 14 FRA BESTILLINGSSEDLERNE (08 og 09, s. 2)
--     ⚠️ Et valg gør fyldet obligatorisk (bestilling_mangler_valg) —
--     meningen, som i chefens-rettelser-25-9.sql.
-- ------------------------------------------------------------
update public.menu_varer mv
   set valg = '["Kebab", "Kylling/bacon", "Tun", "Frikadelle", "Æg", "Flæskesteg", "Ost & skinke", "Roastbeef", "Leverpostej", "Æg-karry", "Æg-rejer", "Rullepølse", "Fiskefilet", "Spørg gerne"]'::jsonb
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id and mk.lokation_id = 'mosede'
   and lower(btrim(mk.navn)) = 'sandwich'
   and lower(btrim(mv.navn)) = 'sandwich'
   and jsonb_array_length(coalesce(mv.valg, '[]'::jsonb)) < 14;

-- ------------------------------------------------------------
--  4) REJEMADEN: RUGBRØD ELLER FRANSKBRØD (samme pris, 95)
-- ------------------------------------------------------------
update public.menu_varer mv
   set valg = '["Rugbrød", "Franskbrød"]'::jsonb
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id and mk.lokation_id = 'mosede'
   and lower(btrim(mk.navn)) = 'smørrebrød'
   and lower(btrim(mv.navn)) = 'rejemad'
   and mv.valg is null;

-- ------------------------------------------------------------
--  5) FLÆSKESVÆR UNDER BARENS SNACKS — INGEN DATABASEÆNDRING
--     "Hjemmelavet flæskesvær" (35) står i "Tilkøb ud af huset".
--     Menukortsiden henter den ved navn ind sidst under Slik & snacks
--     (js/skal/menukort-kort.js). En anden, tændt række med samme navn
--     ville være en dublet — to priser at holde ens (proev-*: "Ingen
--     NYE dubletter"). Den slukkede pose "Flæskesvær, 1 pose" røres ikke.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
--  6) DAGENS SMOOTHIE OG MILKSHAKE — TO LINJER, SOM KORT 06
--     "Milkshake" (59) findes allerede under "Tilkøb ud af huset" og
--     får kortets beskrivelse; menukortsiden henter den ind under
--     Kolde drikke. "Smoothie eller milkshake" bliver "Dagens
--     smoothie" uden valg. Ingen ny række, ingen pris ændres.
-- ------------------------------------------------------------
select pg_temp.ret('Smoothie eller milkshake', 'Dagens smoothie');
update public.menu_varer mv
   set valg = null
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id and mk.lokation_id = 'mosede'
   and lower(btrim(mv.navn)) = 'dagens smoothie' and mv.valg is not null;
update public.menu_varer mv
   set beskrivelse = 'Valgfri smag, mix 2 kugler'
  from public.menu_kategorier mk
 where mk.id = mv.kategori_id and mk.lokation_id = 'mosede'
   and lower(btrim(mv.navn)) = 'milkshake'
   and mv.beskrivelse is distinct from 'Valgfri smag, mix 2 kugler';

commit;

-- ------------------------------------------------------------
--  RAPPORT. Hver kolonne skal stå, som navnet siger.
-- ------------------------------------------------------------
with v as (
  select mv.*, mk.navn as kat from public.menu_varer mv
    join public.menu_kategorier mk on mk.id = mv.kategori_id
   where mk.lokation_id = 'mosede')
select
  (select count(*) from v where navn in ('Morgenkomplet','English breakfast','Havnens all in one',
     'Indbagte rejer med pommes','Nuggets med pommes','Pølsebrød','Bøtte med topping',
     '2 hjemmelavede pandekager med sukker','2 hjemmelavede pandekager med is',
     'Snaps, sambuca og shots','Hotdog, lille','Hotdog, stor','Smoothie eller milkshake'))                                              as gamle_navn_skal_vaere_0,
  (select jsonb_array_length(valg) from v where kat = 'Sandwich' and navn = 'Sandwich' limit 1)
                                                                          as sandwich_varianter_skal_vaere_14,
  (select valg from v where kat = 'Smørrebrød' and navn = 'Rejemad' limit 1) as rejemad_valg,
  (select string_agg(navn || ' ' || pris || coalesce(' «' || beskrivelse || '»', ''), ', ' order by navn) from v
    where navn in ('Dagens smoothie','Milkshake','Hjemmelavet flæskesvær') and aktiv)
                                                                          as smoothie_milkshake_59_flaeskesvaer_35;
