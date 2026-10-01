-- ============================================================
--  MENUKORTET PÅ ENGELSK  (2. okt 2026)
--  ------------------------------------------------------------
--  Mikkel: *"bar lad menukortene kunne oversættes til engelsk"* —
--  kun engelsk, ikke tysk og fransk. Og fra hans første besked:
--  *"Produktdata og priser skal ikke kopieres til fire separate
--  datasæt. Sprogversionerne skal helst kun oversætte navn,
--  beskrivelse, kategorier og faste tekster, mens pris,
--  lager/tilgængelighed og produkt-ID fortsat kommer fra den
--  samme vare/database."*
--
--  Det er præcis, hvad den her kolonne gør:
--
--    menu_varer:  id, pris, aktiv, udsolgt, antal_tilbage, valg …
--                 ← RØRES IKKE. Én vare, ét ID, én pris.
--                 + oversaettelser jsonb
--                   {"en": {"navn": "…", "beskrivelse": "…"}}
--
--  ⚠️ INGEN NY TABEL OG INGEN DUBLETRÆKKER. En engelsk kopi af
--     hver vare ville betyde, at en prisændring skulle laves to
--     steder — og den dag kun det ene blev rettet, ville en
--     engelsktalende gæst se en anden pris end en dansk. Det er
--     den samme slags skred, hele prisværnet findes for at fange.
--
--  ⚠️ OG DANSK ER FALDSKÆRMEN. Mangler en oversættelse, står det
--     danske navn. Aldrig et tomt felt, aldrig et hul — en gæst,
--     der ser "Flæskesteg med surt" på en engelsk side, kan
--     stadig bestille den; en tom linje kan hun ikke.
--
--  Kan køres igen. Prøven står nederst.
-- ============================================================
begin;

alter table public.menu_varer      add column if not exists oversaettelser jsonb;
alter table public.menu_kategorier add column if not exists oversaettelser jsonb;

comment on column public.menu_varer.oversaettelser is
  'Kun navn og beskrivelse pr. sprog: {"en":{"navn","beskrivelse"}}. Pris og ID bliver i rækken (2/10).';
comment on column public.menu_kategorier.oversaettelser is
  'Kategoriens navn pr. sprog: {"en":{"navn"}} (2/10).';

/* ⚠️ FORMEN SKAL HOLDE, ELLERS FALDER SIDEN TILBAGE TAVST.
   Skriver nogen en streng i stedet for et objekt, svarer opslaget
   ingenting, og den engelske side viser dansk — uden at nogen får
   en fejl at lede efter. Værnet her gør det til en fejl med det
   samme, dér hvor den skrives.

   Underforespørgslen skal i en funktion: Postgres svarer "cannot
   use subquery in check constraint". Samme greb som
   mosede_tilvalg_gyldig 1/10 — den fælde fandt den lokale
   database dengang, og den gælder stadig. */
create or replace function public.mosede_oversaettelse_gyldig(o jsonb)
returns boolean language sql immutable set search_path = ''
as $$
  select o is null or (
    jsonb_typeof(o) = 'object'
    and not exists (
      select 1 from jsonb_each(o) s
       where jsonb_typeof(s.value) <> 'object'
          -- sproget er to bogstaver: en, de, fr. Ikke "english".
          or s.key !~ '^[a-z]{2}$'
          or exists (
            select 1 from jsonb_each(s.value) f
             where f.key not in ('navn', 'beskrivelse')
                or jsonb_typeof(f.value) <> 'string'
                or length(f.value #>> '{}') > 600)));
$$;

comment on function public.mosede_oversaettelse_gyldig(jsonb) is
  'Er oversættelserne {sprog: {navn, beskrivelse}} med to-bogstavs sprogkoder? (2/10)';

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'vare_oversaettelse_ok') then
    alter table public.menu_varer drop constraint vare_oversaettelse_ok;
  end if;
  alter table public.menu_varer add constraint vare_oversaettelse_ok
    check (public.mosede_oversaettelse_gyldig(oversaettelser));

  if exists (select 1 from pg_constraint where conname = 'kategori_oversaettelse_ok') then
    alter table public.menu_kategorier drop constraint kategori_oversaettelse_ok;
  end if;
  alter table public.menu_kategorier add constraint kategori_oversaettelse_ok
    check (public.mosede_oversaettelse_gyldig(oversaettelser));
end $$;

/* Oversættelsen af ÉT felt — ét sted.
   js/store.js har det samme i Butik.paaSprog. To udgaver af "hvad
   hedder den her vare på engelsk" ville før eller siden svare
   hver sit, og så står kortet og bestillingen med hvert sit navn
   på den samme ret. */
create or replace function public.mosede_paa_sprog(o jsonb, felt text, sprog text, dansk text)
returns text language sql immutable set search_path = ''
as $$
  select coalesce(nullif(btrim(coalesce(o -> lower(btrim(coalesce(sprog, ''))) ->> felt, '')), ''), dansk);
$$;

comment on function public.mosede_paa_sprog(jsonb, text, text, text) is
  'Feltet på det valgte sprog — dansk, hvis oversættelsen mangler (2/10).';


-- ------------------------------------------------------------
--  DE ENGELSKE NAVNE
--  ------------------------------------------------------------
--  ⚠️ LÆST AF DE GODKENDTE ENGELSKE KORT, IKKE OVERSAT HER.
--     Filerne ligger i "Mosede Havnecafe - Endelig/05 Menukort
--     engelsk/". Mikkel: *"Brug de allerede godkendte
--     oversættelser fra menukortprojektet som grundlag … Brug
--     turistvenligt, naturligt sprog — ikke rå maskinoversættelse."*
--     Den regel holdes ved IKKE at oversætte: teksterne er
--     afskrevet fra kortene.
--
--  ⚠️ DE DANSKE SPECIALITETER BEHOLDER DERES NAVN, med en kort
--     forklaring efter — nøjagtigt som kortene gør det:
--     "Flæskesteg – roast pork with pickles", "Dyrlægens natmad –
--     liver pâté, salt beef & aspic", "Rullepølse – Danish rolled
--     pork cold cut with aspic & onion". Det er hele pointen med
--     en engelsk menu på en dansk havn: gæsten skal kunne PEGE på
--     det, der står på det trykte kort.
--
--  ⚠️ HÅNDMADDERNE FÅR PÅLÆGGETS OVERSÆTTELSE. De hedder
--     "… , håndmad" i databasen, fordi køkkenets bon skal kunne
--     skelne dem fra smørrebrødet — men kortet skriver det samme
--     pålæg. Derfor det andet led i where-sætningen.
--
--  ⚠️ OG KUN navn OG beskrivelse. Pris, antal, udsolgt og id
--     røres ikke af en eneste linje herunder.
-- ------------------------------------------------------------
-- VARERNE: 170 · KATEGORIERNE: 17
update public.menu_varer v set oversaettelser =
       coalesce(v.oversaettelser, '{}'::jsonb) || jsonb_build_object('en',
         jsonb_strip_nulls(jsonb_build_object('navn', e.navn_en, 'beskrivelse', e.beskr_en)))
  from (values
    ('Morgen komplet', 'Full breakfast', 'Coffee or juice, bread roll with toppings, egg or bacon & salad'),
    ('English Breakfast', 'English Breakfast', 'Toast, fried egg, bacon, beans, salad, cheese, ½ sausage, fried mushrooms and ½ fried tomato'),
    ('Rundstykke med pålæg', 'Bread roll with toppings', null),
    ('Franskbrød med pålæg', 'Baguette with toppings', null),
    ('Havnens All in One', 'Havnens All in One', 'Bread, ham & fried egg · + cheese 10,-'),
    ('Wienerbrød', 'Danish pastry', 'Sold whole only'),
    ('Morgenbrød', 'Breakfast rolls / baked goods', 'Ask for an order form'),
    ('Rejemad', 'Prawn open sandwich', null),
    ('Tartarmad', 'Steak tartare open sandwich', null),
    ('Platte', 'Platter', 'Pre-order only'),
    ('Gammeldags rejecocktail med brød og smør', 'Classic prawn cocktail with bread and butter', null),
    ('Lun delle, steg eller leverpostej med brød og surt', 'Warm meatball, roast pork or liver pâté', 'With bread and pickles'),
    ('Hjemmelavet lun frikadelle', 'Frikadelle – homemade warm Danish meatball', null),
    ('Hjemmelavet toast, ost og skinke', 'Homemade toastie, ham & cheese', null),
    ('Hjemmelavet cowboytoast', 'Homemade cowboy toast', null),
    ('Hjemmelavet hvidløgsbrød med tomat & ost', 'Homemade garlic bread with tomato & cheese', null),
    ('Stjerneskud', 'Stjerneskud – fish fillets, prawns & mayo on bread', null),
    ('Fish’n’chips', 'Fish’n’chips', null),
    ('Fiskefilet med pommes', 'Fish fillet with fries', null),
    ('8 indbagte rejer med pommes', '8 battered prawns with fries', null),
    ('Pariserbøf', 'Pariserbøf – beef patty on toast with egg yolk', null),
    ('Hjemmelavet biksemad med spejlæg', 'Biksemad – homemade Danish hash with fried egg', null),
    ('Ekstra spejlæg', 'Extra fried egg', null),
    ('Pølsemix med pommes', 'Sausage mix with fries', null),
    ('Kebabmix med pommes', 'Kebab mix with fries', null),
    ('Kyllingmix med pommes', 'Chicken mix with fries', null),
    ('Bagt krydret kartoffel', 'Spiced baked potato', 'With mixed salad, tomato, cucumber, sweetcorn, asparagus, onion and dressing.'),
    ('Pitabrød', 'Pita bread', 'Kebab, chicken or tuna'),
    ('Blandet salat', 'Mixed salad', null),
    ('Nachos med tilbehør & ost', 'Nachos with toppings & cheese', null),
    ('Ekstra kød m.m.', 'Extra meat or side', null),
    ('10 nuggets med pommes', '10 nuggets with fries', null),
    ('Snackkurv', 'Snack basket', null),
    ('Pommes frites med dip', 'Fries with dip', null),
    ('Dobbelt burger', 'Double burger', null),
    ('Cheeseburger', 'Cheeseburger', null),
    ('Baconburger', 'Bacon burger', null),
    ('Bacon & Cheeseburger', 'Bacon & cheeseburger', null),
    ('Bearnaiseburger', 'Béarnaise burger', null),
    ('Chilinaiseburger', 'Chili mayo burger', null),
    ('Havnens burger', 'Havnens burger', null),
    ('Kyllingeburger', 'Chicken burger', null),
    ('Clubsandwich', 'Club sandwich', null),
    ('Sandwich', 'Sandwich', 'Kebab, chicken/bacon, tuna, frikadelle, egg, roast pork, roast beef, homemade spread of the day and more — see the order form for the full range'),
    ('Ekstra kød eller tilbehør', 'Extra meat or side', null),
    ('Dip eller dressing', 'Dip or dressing', null),
    ('Ristet pølse', 'Grilled sausage', null),
    ('Ristet pølse med bacon', 'Grilled sausage with bacon', null),
    ('Frankfurter', 'Frankfurter', null),
    ('Frankfurter med bacon', 'Frankfurter with bacon', null),
    ('Ostepølse', 'Cheese sausage', null),
    ('Krydderpølse', 'Spiced sausage', null),
    ('Brød', 'Bun', null),
    ('Kradser med det hele', 'Kradser med det hele – hot dog with all the toppings', null),
    ('Ristet hotdog, lille', 'Grilled hot dog, small', null),
    ('Ristet hotdog, stor', 'Grilled hot dog, large', null),
    ('Fransk hotdog, lille', 'French hot dog, small', null),
    ('Fransk hotdog, stor', 'French hot dog, large', null),
    ('Flæskesteg med surt', 'Flæskesteg – roast pork with pickles', null),
    ('Fiskefilet med remoulade', 'Fish fillet with remoulade', null),
    ('Fiskefilet med rejer og mayo', 'Fish fillet with prawns & mayo', null),
    ('Frikadelle med surt', 'Frikadelle – Danish meatball with pickles', null),
    ('Dagens hjemmelavede pålægssalater', 'Homemade spreads of the day', 'Ask when ordering'),
    ('Leverpostej med surt', 'Liver pâté with pickles', null),
    ('Dyrlægens natmad', 'Dyrlægens natmad – liver pâté, salt beef & aspic', null),
    ('Kartoffelmad med mayo, løg og bacon', 'Potato with mayo, onion & bacon', null),
    ('Rullepølse med sky og løg', 'Rullepølse – Danish rolled pork cold cut with aspic & onion', null),
    ('Roastbeef med remoulade og løg', 'Roast beef with remoulade & onion', null),
    ('Skinke med italiensk salat', 'Ham with Italian salad', null),
    ('Skinke med spejlæg', 'Ham with fried egg', null),
    ('Kylling med bacon og karry', 'Chicken with bacon & curry', null),
    ('Spegepølse med sky og løg', 'Salami with aspic & onion', null),
    ('Spegepølse med remoulade og ristet løg', 'Salami with remoulade & crispy onions', null),
    ('Hvide sild', 'Pickled herring', null),
    ('Hvide sild med karry', 'Pickled herring in curry', null),
    ('Æggemad med mayo og løg', 'Egg with mayo & onion', null),
    ('Æggemad med mayo og rejer', 'Egg with mayo & prawns', null),
    ('Hakkebøf med bløde løg og spejlæg', 'Beef patty with soft onions & fried egg', null),
    ('Ostemad', 'Cheese', null),
    ('Lun delle eller steg', 'Frikadelle – homemade warm Danish meatball', null),
    ('Hjemmelavet flæskesvær', 'Homemade flæskesvær – pork crackling', null),
    ('1 kugle', '1 scoop', null),
    ('2 kugler', '2 scoops', null),
    ('3 kugler', '3 scoops', null),
    ('4 kugler', '4 scoops', null),
    ('Havnens café-is', 'Havnens café ice cream', '3 scoops, soft-serve top, guf (Danish whipped ice-cream topping), whipped cream and jam'),
    ('Ekstra kugle', 'Extra scoop', null),
    ('Sauce, topping eller guf', 'Sauce, topping or guf', null),
    ('Softice-top', 'Soft-serve top', null),
    ('Løs vaffel, pr. stk.', 'Extra cone, each', null),
    ('Løs vaffel, glutenfri, pr. stk.', 'Extra cone, gluten-free, each', null),
    ('Isboks, ca. 6 kugler eller softice', 'Ice cream box, approx. 6 scoops or soft serve', 'Take it with you – 6 scoops of your choice'),
    ('Toppingbøtte', 'Topping tub', null),
    ('Softice, lille', 'Soft serve, small', null),
    ('Softice, stor', 'Soft serve, large', null),
    ('Bakke med vaffelknas, softice, sauce og topping', 'Tray with waffle crumble, soft serve, sauce & topping', null),
    ('Sundae med sauce og topping', 'Sundae with sauce and topping', null),
    ('Bubblewaffle, 1 kugle', 'Bubble waffle, 1 scoop', 'Incl. sprinkles and sauce'),
    ('Bubblewaffle, 2 kugler eller softice', 'Bubble waffle, 2 scoops or soft serve', 'Incl. sprinkles and sauce'),
    ('Bubblewaffle mix', 'Bubble waffle mix', 'Fresh fruit of the day, sauce & topping'),
    ('6 churros med sukker og kanel', '6 churros with sugar & cinnamon', null),
    ('6 churros med is og sauce', '6 churros with ice cream & sauce', null),
    ('2 hjemmelavede pandekager', '2 homemade pancakes', null),
    ('2 hjemmelavede pandekager med 1 kugle is', '2 homemade pancakes with 1 scoop', null),
    ('2 hjemmelavede pandekager med 2 kugler is', '2 homemade pancakes with 2 scoops', null),
    ('Affogato', 'Affogato', 'Espresso with vanilla ice cream and nuts'),
    ('Espresso', 'Espresso', null),
    ('Americano', 'Americano', null),
    ('Americano Ice', 'Iced Americano', null),
    ('Cortado', 'Cortado', null),
    ('Macchiato', 'Macchiato', null),
    ('Cappuccino', 'Cappuccino', null),
    ('Flat White', 'Flat White', null),
    ('Latte', 'Latte', null),
    ('Latte Ice', 'Iced Latte', null),
    ('Chai', 'Chai', null),
    ('Kakao', 'Hot chocolate', null),
    ('1 iskugle i kaffen', '1 scoop of ice cream in your coffee', null),
    ('Ekstra shot kaffe', 'Extra espresso shot', null),
    ('Sirup', 'Syrup', null),
    ('Te', 'Tea', null),
    ('Lumumba, varm eller kold', 'Lumumba – cocoa with rum, hot or cold', null),
    ('Irish coffee', 'Irish Coffee', null),
    ('Irish coffee, stor', 'Irish Coffee, large', null),
    ('Kage & desserter', 'Cakes & desserts', 'Ask for today''s selection'),
    ('Gammeldags æblekage', 'Old-fashioned Danish apple cake', null),
    ('Flødekager', 'Cream cakes', null),
    ('Kaffe og kage', 'Coffee and cake', null),
    ('Sodavand, juice, iste eller cacao – lille', 'Soft drink, juice, iced tea or chocolate milk – small', null),
    ('Sodavand, juice, iste eller cacao – stor', 'Soft drink, juice, iced tea or chocolate milk – large', null),
    ('Dagens smoothie', 'Smoothie of the day', null),
    ('Milkshake', 'Milkshake', 'Flavour of your choice, mix 2 scoops'),
    ('Slush Ice, lille', 'Slush ice, small', null),
    ('Slush Ice, stor', 'Slush ice, large', null),
    ('Capri Sun', 'Capri-Sun', null),
    ('Brik juice eller cacao', 'Juice or chocolate milk carton', null),
    ('Mælk', 'Milk', null),
    ('Cocio', 'Cocio – Danish chocolate milk', null),
    ('Kildevand', 'Still water', null),
    ('Isvand', 'Iced water', null),
    ('Red Bull', 'Red Bull', null),
    ('RTD', 'RTD', null),
    ('Fadøl, lille', 'Draught beer, small', null),
    ('Fadøl, stor', 'Draught beer, large', null),
    ('Fadøl lux, lille', 'Draught Lux, small', null),
    ('Fadøl lux, stor', 'Draught Lux, large', null),
    ('Flaske eller dåse', 'Bottle or can', null),
    ('Gylden Dame / Lux', 'Gylden Dame / Lux', null),
    ('Flaske øl, stor Lux 75 cl', 'Large bottle of Lux 75 cl', null),
    ('Specialøl, lille', 'Craft beer, small', null),
    ('Specialøl, stor', 'Craft beer, large', null),
    ('Alkoholfri øl', 'Alcohol-free beer', null),
    ('Vin, glas', 'Wine, glass', null),
    ('Vin, flaske', 'Wine, bottle', null),
    ('Alkoholfri vin, glas', 'Alcohol-free wine, glass', null),
    ('Alkoholfri vin, flaske', 'Alcohol-free wine, bottle', null),
    ('Cava, glas', 'Cava, glass', null),
    ('Cava, flaske', 'Cava, bottle', null),
    ('Champagne, glas', 'Champagne, glass', null),
    ('Champagne, flaske', 'Champagne, bottle', null),
    ('Drinks', 'Drinks', null),
    ('Cocktail', 'Cocktail', null),
    ('Snaps, spiritus og shots', 'Snaps, spirits and shots', null),
    ('Slik, 1 stk.', 'Sweets, 1 piece', null),
    ('Slik, 3 stk.', 'Sweets, 3 pieces', null),
    ('Chokolade', 'Chocolate', null),
    ('Peanuts', 'Peanuts', null),
    ('Chips, 1 pose', 'Crisps, 1 bag', null),
    ('2 slags chips på fad', '2 kinds of crisps on a plate', null),
    ('Popcorn', 'Popcorn', null)
  ) as e(navn_da, navn_en, beskr_en)
 where lower(btrim(v.navn)) = lower(btrim(e.navn_da))
    or lower(btrim(v.navn)) = lower(btrim(e.navn_da)) || ', håndmad';

update public.menu_kategorier k set oversaettelser =
       coalesce(k.oversaettelser, '{}'::jsonb) || jsonb_build_object('en',
         jsonb_build_object('navn', e.navn_en))
  from (values
    ('Morgenmad', 'Breakfast'),
    ('Retter', 'Lunch'),
    ('Andre retter', 'Other dishes'),
    ('Burgere', 'Burgers & sandwiches'),
    ('Sandwich', 'Sandwich'),
    ('Pølser', 'Hot dogs & sausages'),
    ('Smørrebrød', 'Smørrebrød'),
    ('Håndmadder', 'Håndmadder'),
    ('Kugleis', 'Ice cream'),
    ('Softice og vafler', 'Sweets'),
    ('Kaffe og varme drikke', 'Coffee'),
    ('Øl', 'Beer'),
    ('Vin, cava og champagne', 'Wine, cava & champagne'),
    ('Sodavand, juice og kakao', 'Cold drinks'),
    ('Snacks og slik', 'Sweets & snacks'),
    ('Platter', 'Platters'),
    ('Tilkøb morgenmad', 'Breakfast extras'),
    /* ⚠️ DE SEKS HER MANGLEDE I FØRSTE OMGANG, og det kunne SES:
       "Reception og pindemad" og "Tilkøb ud af huset" stod på
       dansk midt i den engelske side. Fundet på et skud, ikke i
       koden — afsnit, hvis overskrift ER kategoriens navn, henter
       oversættelsen fra kategorien, så en kategori uden
       oversættelse bliver synlig med det samme. */
    ('Reception og pindemad', 'Reception & canapés'),
    ('Tilkøb ud af huset', 'Takeaway extras'),
    ('Tapasfad', 'Tapas platters'),
    ('Tillæg: glutenfri, laktosefri og vegansk', 'Gluten-free, lactose-free and vegan'),
    ('Ispinde', 'Ice lollies'),
    ('Sliders', 'Sliders')
  ) as e(navn_da, navn_en)
 where lower(btrim(k.navn)) = lower(btrim(e.navn_da));


commit;


-- ============================================================
--  PRØVEN — alt skal sige JA.
-- ============================================================
create or replace function pg_temp.ja(b boolean) returns text language sql immutable
as $$ select case when b then 'JA' else '** NEJ **' end $$;

/* ⚠️ TRE-VÆRDIG SOM I kortene-endelige-1-10.sql. Den lokale
   database bygges af supabase/-mappens filer og bærer rækker,
   produktionen har pensioneret — fx Popcorn til 20, hvor kortet
   og produktionen siger 30. En prøve, der råber fejl på en
   kulisse, holder man op med at se på. */
create or replace function pg_temp.svar(findes boolean, ok boolean)
returns text language sql immutable as $$
  select case when not findes then 'kun i produktionen' when ok then 'JA' else '** NEJ **' end;
$$;

select '1. Kolonnerne findes på begge tabeller' as hvad,
       pg_temp.ja((select count(*) = 2 from information_schema.columns
                    where table_schema = 'public' and column_name = 'oversaettelser'
                      and table_name in ('menu_varer', 'menu_kategorier'))) as ok
union all
select '2. Dansk er faldskærmen, når oversættelsen mangler',
       pg_temp.ja(public.mosede_paa_sprog(null, 'navn', 'en', 'Flæskesteg med surt')
                  = 'Flæskesteg med surt'
                  and public.mosede_paa_sprog('{"de":{"navn":"X"}}'::jsonb, 'navn', 'en', 'Rullepølse')
                  = 'Rullepølse')
union all
select '3. … og en TOM oversættelse falder også tilbage',
       pg_temp.ja(public.mosede_paa_sprog('{"en":{"navn":"   "}}'::jsonb, 'navn', 'en', 'Ostemad')
                  = 'Ostemad')
union all
select '4. Engelsk svares, når den er der',
       pg_temp.ja(public.mosede_paa_sprog(
         '{"en":{"navn":"Roast pork with pickles"}}'::jsonb, 'navn', 'en', 'Flæskesteg med surt')
         = 'Roast pork with pickles')
union all
select '5. Værnet afviser en streng i stedet for et objekt',
       pg_temp.ja(not public.mosede_oversaettelse_gyldig('{"en":"Roast pork"}'::jsonb))
union all
select '6. … og en sprogkode, der ikke er to bogstaver',
       pg_temp.ja(not public.mosede_oversaettelse_gyldig('{"english":{"navn":"X"}}'::jsonb))
union all
select '7. … og et felt, der ikke er navn eller beskrivelse',
       pg_temp.ja(not public.mosede_oversaettelse_gyldig('{"en":{"pris":"99"}}'::jsonb))
union all
select '8. Modstykke: den rigtige form går igennem',
       pg_temp.ja(public.mosede_oversaettelse_gyldig(
         '{"en":{"navn":"Roast pork with pickles","beskrivelse":"On rye bread."}}'::jsonb))
union all
select '9. … og null går igennem (langt de fleste varer)',
       pg_temp.ja(public.mosede_oversaettelse_gyldig(null))
union all
/* ⚠️ DEN HER PRØVE VAR FORKERT FØRST. Den målte, at INGEN vare
   havde oversættelser — skrevet før frøene blev lagt i filen, og
   den faldt i samme sekund, de kom. Den målte altså, at filen
   ikke gjorde sit arbejde. Nu måler den det, der betyder noget:
   at PRISEN er urørt. Tallene er læst af de trykte kort. */
select '10. Ingen pris er rørt af den engelske fil',
       pg_temp.svar(
         (select pris = 30 from public.menu_varer where navn = 'Popcorn'),
         not exists (select 1 from (values
           ('Bearnaiseburger', 90), ('Chilinaiseburger', 90), ('Stjerneskud', 105),
           ('Dobbelt burger', 125), ('Sandwich', 75), ('Fadøl, lille', 35),
           ('Vin, flaske', 249), ('Popcorn', 30), ('Espresso', 35)
         ) as kort(navn, pris)
         join public.menu_varer v on v.navn = kort.navn
        where v.pris is distinct from kort.pris::numeric))
union all
select '11. Oversættelserne ligger KUN under "en" og kun i navn/beskrivelse',
       pg_temp.ja(not exists (
         select 1 from public.menu_varer v, jsonb_each(v.oversaettelser) s
          where v.oversaettelser is not null and s.key <> 'en')
       and (select bool_and(public.mosede_oversaettelse_gyldig(oversaettelser))
              from public.menu_varer))
union all
/* Tallet kommer udefra: frølisten i filen har 170 varer, og
   håndmadderne rammer et pålæg hver. Står der pludselig 12, er
   navnene skredet fra kortene — og så skal nogen kigge. */
select '12. Mindst 100 varer har fået et engelsk navn (nu: '
       || (select count(*) from public.menu_varer
            where oversaettelser -> 'en' ->> 'navn' is not null) || ')',
       pg_temp.ja((select count(*) from public.menu_varer
                    where oversaettelser -> 'en' ->> 'navn' is not null) >= 100)
union all
/* ⚠️ FINDES, IKKE TÆLLES. Første udgave krævede PRÆCIS tre
   rækker — og de samme navne står også i "Vælg fyld til
   smørrebrødet" uden pris, så der er to af hver. Et navn er ikke
   unikt; det er den samme fælde som i den danske fil. */
select '13. De DANSKE navne står urørt',
       pg_temp.svar(
         exists (select 1 from public.menu_varer where navn = 'Ostemad'),
         (select count(distinct navn) = 3 from public.menu_varer
           where navn in ('Flæskesteg med surt', 'Dyrlægens natmad', 'Ostemad')))
union all
/* ⚠️ DE DANSKE SPECIALITETER SKAL BEHOLDE DERES NAVN PÅ ENGELSK.
   Mikkel: "Danske specialiteter som Smørrebrød, Håndmadder,
   Stjerneskud, Frikadelle, Flæskesteg, Flæskesvær, Rullepølse osv.
   skal beholde det danske navn og have en kort naturlig
   forklaring." En maskinoversættelse ville skrive "Roast pork" —
   og så kan gæsten ikke pege på det, der står på det trykte kort. */
/* ⚠️ KUN PÅ PRODUKTIONSFORMET DATA. Den lokale kulisse bærer tre
   kategorier, produktionen har pensioneret ("Burgere og sandwich",
   "Kugleis og ishorn", "Sandwich og retter fra pladen") — de ville
   få prøven til at råbe fejl på noget, der ikke findes hos ejeren.
   Kendes de, er vi lokalt. */
select '14b. Hver AKTIV kategori har et engelsk navn',
       pg_temp.svar(
         not exists (select 1 from public.menu_kategorier where navn = 'Burgere og sandwich'),
         not exists (select 1 from public.menu_kategorier
                      where aktiv and oversaettelser -> 'en' ->> 'navn' is null))
union all
select '14. Specialiteterne beholder deres danske navn på engelsk',
       pg_temp.ja(not exists (select 1 from (values
           ('Flæskesteg med surt', 'Flæskesteg'), ('Stjerneskud', 'Stjerneskud'),
           ('Dyrlægens natmad', 'Dyrlægens natmad'), ('Frikadelle med surt', 'Frikadelle'),
           ('Rullepølse med sky og løg', 'Rullepølse'),
           ('Hjemmelavet flæskesvær', 'flæskesvær'), ('Pariserbøf', 'Pariserbøf')
         ) as krav(navn, skal_indeholde)
         join public.menu_varer v on v.navn = krav.navn
        where coalesce(v.oversaettelser -> 'en' ->> 'navn', '') not like '%' || krav.skal_indeholde || '%'));
