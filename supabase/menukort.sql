-- ============================================================
--  MENUKORTET
--  ------------------------------------------------------------
--  Skrevet af efter forretningens eget menukort.
--
--  TO REGLER ER FULGT SLAVISK:
--
--    Stod der "ca." ved en pris, er varen med, men prisen er
--    tom. En tom pris viser ingen pris på hjemmesiden. Et gæt
--    viser et forkert tal, og det er værre.
--
--    Var linjen ulæselig, er varen udeladt helt. Det gælder
--    croissant-linjen, "rist", "knækker med blød pølse",
--    børnemenuen, lemonaden og én ostemad hvor fyldet ikke
--    kunne læses.
--
--  Priserne mangler derfor på: Morgenkomplet, Fiskefilet med
--  pommes, Frankfurter og Belgisk vaffel. De udfyldes i admin.
--
--  Filen kan køres igen uden at duplikere noget.
-- ============================================================

-- Morgenmad (mad)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Morgenmad', 1
where not exists (select 1 from public.menu_kategorier where navn = 'Morgenmad' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Morgenkomplet', 'Kaffe eller juice, rundstykke med pålæg, æg og bacon samt frugt', null::numeric, false, 1),
  ('English breakfast', null, 99::numeric, false, 2),
  ('Rundstykke med pålæg', null, 35::numeric, false, 3),
  ('Havnens all in one', 'Brød, drikke og spejlæg', 40::numeric, false, 4),
  ('Frugtmix', null, 25::numeric, false, 5)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Morgenmad' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Retter (mad)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Retter', 2
where not exists (select 1 from public.menu_kategorier where navn = 'Retter' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Dagens ret', null, 85::numeric, true, 1),
  ('Smørrebrød', null, 55::numeric, true, 2),
  ('Planke', null, 179::numeric, false, 3),
  ('Lun delle eller steg', null, 25::numeric, false, 4),
  ('Lun delle eller steg med leverpostej', 'Med brød og smør', 55::numeric, false, 5),
  ('Rejemad', null, 80::numeric, false, 6),
  ('Tatarmad', null, 50::numeric, false, 7),
  ('Håndmadder', null, 24::numeric, false, 8),
  ('Stjerneskud', null, 85::numeric, true, 9),
  ('Fish’n’chips', null, 95::numeric, true, 10),
  ('Fiskefilet med pommes', null, null::numeric, false, 11),
  ('Pariserbøf', null, 90::numeric, false, 12),
  ('Pitabrød', 'Med kebab, kylling eller tun', 65::numeric, false, 13)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Retter' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Sandwich og retter fra pladen (mad)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Sandwich og retter fra pladen', 3
where not exists (select 1 from public.menu_kategorier where navn = 'Sandwich og retter fra pladen' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Sandwich, lille', 'Kebab, kylling, tun, frikadelle, æg med mere', 75::numeric, false, 1),
  ('Sandwich, stor', 'Samme udvalg', 85::numeric, false, 2),
  ('Mix med pommes og salat', 'Kebab, kylling, tun eller frikadelle', 90::numeric, false, 3),
  ('Hjemmelavet biksemad med spejlæg', 'Ekstra spejlæg 10 kr.', 85::numeric, false, 4),
  ('Blandet salat', 'Æg, tun, kebab, kylling eller pasta 10 kr. ekstra', 55::numeric, false, 5),
  ('Nachos med tilbehør og ost', 'Kylling, kebab eller oksekød 10 kr. ekstra', 85::numeric, false, 6),
  ('Gammeldags rejecocktail', 'Med brød og smør', 85::numeric, false, 7),
  ('Hjemmelavet hvidløgsbrød', 'Med smør og ost', 45::numeric, false, 8),
  ('Indbagte rejer med pommes', null, 90::numeric, false, 9),
  ('Nuggets med pommes', null, 85::numeric, false, 10),
  ('Hjemmelavet toast', 'Med ost og skinke', 35::numeric, false, 11),
  ('Hjemmelavet cowboytoast', null, 45::numeric, false, 12),
  ('Snackkurv', null, 60::numeric, false, 13),
  ('Pommes frites med dip', null, 40::numeric, false, 14)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Sandwich og retter fra pladen' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Burgere og sandwich (mad)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Burgere og sandwich', 4
where not exists (select 1 from public.menu_kategorier where navn = 'Burgere og sandwich' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Flæskestegssandwich', null, 80::numeric, true, 1),
  ('Frikadellesandwich', null, 80::numeric, false, 2),
  ('Kyllingeburger', null, 80::numeric, false, 3),
  ('Havnens burger', null, 80::numeric, true, 4),
  ('Bøfsandwich', null, 75::numeric, false, 5),
  ('Cheesebaconburger', null, 85::numeric, false, 6)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Burgere og sandwich' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Pølser (mad)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Pølser', 5
where not exists (select 1 from public.menu_kategorier where navn = 'Pølser' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Pistolpølse', null, 30::numeric, false, 1),
  ('Specialpølse med baconsvøb', null, 35::numeric, false, 2),
  ('Frankfurter eller specialpølse', 'Baconsvøb 5 kr. ekstra', null::numeric, false, 3),
  ('Hansen fransk vaffel, stor', null, 50::numeric, false, 4),
  ('Hansen fransk vaffel, lille', null, 40::numeric, false, 5),
  ('Dürümrulle', null, 80::numeric, false, 6)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Pølser' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Smørrebrød (mad)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Smørrebrød', 6
where not exists (select 1 from public.menu_kategorier where navn = 'Smørrebrød' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Håndmad', null, 24::numeric, false, 1),
  ('Smørrebrød', null, 55::numeric, true, 2),
  ('Rejemad med mayo og citron', null, 75::numeric, false, 3),
  ('Tartar', 'Kun efter forudbestilling', 95::numeric, false, 4),
  ('Æbleflæsk', 'Kun efter forudbestilling', 75::numeric, false, 5)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Smørrebrød' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Vælg fyld til smørrebrødet (mad)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'mad', 'Vælg fyld til smørrebrødet', 7
where not exists (select 1 from public.menu_kategorier where navn = 'Vælg fyld til smørrebrødet' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Flæskesteg med surt', null, null::numeric, false, 1),
  ('Fiskefilet med remoulade', null, null::numeric, false, 2),
  ('Fiskefilet med rejer og mayo', null, null::numeric, false, 3),
  ('Fiskedelle med surt', null, null::numeric, false, 4),
  ('Pølsemad med sennep og løg', null, null::numeric, false, 5),
  ('Hjemmelavet hønsesalat med bacon', null, null::numeric, false, 6),
  ('Æggesalat med bacon', null, null::numeric, false, 7),
  ('Wienersalat med tomat og løg', null, null::numeric, false, 8),
  ('Hjemmelavet skinkesalat med tomat og løg', null, null::numeric, false, 9),
  ('Leverpostej med baconsvøb', null, null::numeric, false, 10),
  ('Dyrlægens natmad', null, null::numeric, false, 11),
  ('Kartoffelmad med mayo, løg og bacon', null, null::numeric, false, 12),
  ('Tomat- eller agurkemad med mayo og løg', null, null::numeric, false, 13),
  ('Rullepølse med sky og løg', null, null::numeric, false, 14),
  ('Roastbeef med remoulade og løg', null, null::numeric, false, 15),
  ('Skinke med italiensk salat', null, null::numeric, false, 16),
  ('Skinke med spejlæg', null, null::numeric, false, 17),
  ('Kylling med bacon og karry', null, null::numeric, false, 18),
  ('Spegepølse med sky og løg', null, null::numeric, false, 19),
  ('Spegepølse med remoulade og ristede løg', null, null::numeric, false, 20),
  ('Makrelsalat', null, null::numeric, false, 21),
  ('Hvide sild', null, null::numeric, false, 22),
  ('Hvide sild med karry', null, null::numeric, false, 23),
  ('Æggemad med mayo og løg', null, null::numeric, false, 24),
  ('Æggemad med bacon og karry', null, null::numeric, false, 25),
  ('Æggemad med mayo og rejer', null, null::numeric, false, 26),
  ('Kartoffel med bløde løg og spejlæg', null, null::numeric, false, 27),
  ('Ostemad stærk med peberfrugt', null, null::numeric, false, 28),
  ('Lav din egen favorit', null, null::numeric, false, 29)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Vælg fyld til smørrebrødet' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Kugleis og ishorn (is)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'is', 'Kugleis og ishorn', 10
where not exists (select 1 from public.menu_kategorier where navn = 'Kugleis og ishorn' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('1 kugle', null, 30::numeric, false, 1),
  ('2 kugler', null, 40::numeric, false, 2),
  ('3 kugler', null, 50::numeric, false, 3),
  ('Ekstra kugle', null, 10::numeric, false, 4),
  ('Sauce, topping eller guf', null, 7::numeric, false, 5),
  ('Softice-top', null, 15::numeric, false, 6),
  ('Ishorn med ca. 6 kugler softice', null, 80::numeric, false, 7),
  ('Løs vaffel', null, 4::numeric, false, 8),
  ('Bøtte med topping', null, 20::numeric, false, 9)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Kugleis og ishorn' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Softice og vafler (is)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'is', 'Softice og vafler', 11
where not exists (select 1 from public.menu_kategorier where navn = 'Softice og vafler' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Softice, lille', null, 35::numeric, false, 1),
  ('Softice, stor', null, 45::numeric, true, 2),
  ('Sauce, topping eller guf', null, 7::numeric, false, 3),
  ('Sundae med frugt og sauce', null, 45::numeric, false, 4),
  ('Belgisk vaffel', null, null::numeric, false, 5),
  ('Boblevaffel med 1 kugle', null, 59::numeric, true, 6),
  ('Boblevaffel med 2 kugler eller softice', 'Inklusive drys og sovs', 67::numeric, false, 7),
  ('Churros med sukker og kanel', null, 42::numeric, false, 8),
  ('Churros med is og sauce', null, 65::numeric, false, 9),
  ('Hjemmelavede pandekager med sukker', null, 42::numeric, false, 10),
  ('Hjemmelavede pandekager med is', null, 60::numeric, false, 11)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Softice og vafler' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Kaffe og varme drikke (drikke)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'drikke', 'Kaffe og varme drikke', 20
where not exists (select 1 from public.menu_kategorier where navn = 'Kaffe og varme drikke' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Americano', null, 40::numeric, false, 1),
  ('Iced americano', null, 45::numeric, false, 2),
  ('Espresso', null, 35::numeric, false, 3),
  ('Cortado', null, 45::numeric, false, 4),
  ('Macchiato', null, 45::numeric, false, 5),
  ('Cappuccino', null, 45::numeric, false, 6),
  ('Flat white', null, 45::numeric, false, 7),
  ('Chai', null, 45::numeric, false, 8),
  ('Kakao', null, 40::numeric, false, 9),
  ('Latte', null, 45::numeric, false, 10),
  ('Iced latte', null, 50::numeric, false, 11),
  ('Ekstra shot kaffe', null, 25::numeric, false, 12),
  ('Irish coffee', null, 75::numeric, false, 13),
  ('Te', null, 25::numeric, false, 14),
  ('Kage', 'Spørg til dagens udvalg', 30::numeric, false, 15),
  ('Kaffe og kage', null, 65::numeric, false, 16),
  ('Kaffe og pandekage', null, 85::numeric, false, 17)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Kaffe og varme drikke' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Øl (drikke)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'drikke', 'Øl', 21
where not exists (select 1 from public.menu_kategorier where navn = 'Øl' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Fadøl, lille', null, 35::numeric, false, 1),
  ('Fadøl, stor', null, 55::numeric, false, 2),
  ('Fadøl lux, lille', null, 40::numeric, false, 3),
  ('Fadøl lux, stor', null, 60::numeric, false, 4),
  ('Flaskeøl', null, 30::numeric, false, 5),
  ('Flaskeøl lux', null, 40::numeric, false, 6),
  ('Alkoholfri øl', null, 30::numeric, false, 7)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Øl' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Vin, cava og champagne (drikke)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'drikke', 'Vin, cava og champagne', 22
where not exists (select 1 from public.menu_kategorier where navn = 'Vin, cava og champagne' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Alkoholfri vin, glas', null, 59::numeric, false, 1),
  ('Alkoholfri vin, flaske', null, 199::numeric, false, 2),
  ('Vin, glas', null, 59::numeric, false, 3),
  ('Vin, flaske', null, 199::numeric, false, 4),
  ('Cava, glas', null, 60::numeric, false, 5),
  ('Cava, flaske', null, 299::numeric, false, 6),
  ('Champagne, glas', null, 69::numeric, false, 7),
  ('Champagne, flaske', null, 299::numeric, false, 8)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Vin, cava og champagne' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Sodavand, juice og kakao (drikke)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'drikke', 'Sodavand, juice og kakao', 23
where not exists (select 1 from public.menu_kategorier where navn = 'Sodavand, juice og kakao' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Sodavand, juice, iste eller kakao – lille', null, 30::numeric, false, 1),
  ('Sodavand, juice, iste eller kakao – stor', null, 40::numeric, false, 2),
  ('Smoothie eller milkshake', null, 56::numeric, false, 3),
  ('Dåse eller flaske sodavand', null, 25::numeric, false, 4),
  ('Juice eller Capri-Sun', null, 20::numeric, false, 5),
  ('Mælk', null, 20::numeric, false, 6),
  ('Cocio', null, 35::numeric, false, 7),
  ('Kildevand', null, 20::numeric, false, 8),
  ('Isvand', null, 25::numeric, false, 9),
  ('Red Bull', null, 40::numeric, false, 10),
  ('RTD', null, 46::numeric, false, 11),
  ('Drinks', null, 75::numeric, false, 12),
  ('Cocktail', null, 85::numeric, false, 13),
  ('Snaps, sambuca og shots', null, 30::numeric, false, 14)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Sodavand, juice og kakao' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- Snacks og slik (drikke)
insert into public.menu_kategorier (lokation_id, afdeling, navn, sortering)
select 'mosede', 'drikke', 'Snacks og slik', 24
where not exists (select 1 from public.menu_kategorier where navn = 'Snacks og slik' and lokation_id = 'mosede');

insert into public.menu_varer (kategori_id, navn, beskrivelse, pris, fremhaevet, sortering)
select k.id, v.navn, v.beskrivelse, v.pris, v.fremhaevet, v.sortering from (values
  ('Slik, 1 stk.', null, 10::numeric, false, 1),
  ('Slik, 3 stk.', null, 25::numeric, false, 2),
  ('Chokolade', null, 20::numeric, false, 3),
  ('Peanuts, 1 pose', null, 25::numeric, false, 4),
  ('Peanuts, 2 poser', null, 45::numeric, false, 5),
  ('Chips eller svær, 1 pose', null, 35::numeric, false, 6),
  ('Chips eller svær, 2 poser', null, 50::numeric, false, 7)
) as v(navn, beskrivelse, pris, fremhaevet, sortering)
join public.menu_kategorier k on k.navn = 'Snacks og slik' and k.lokation_id = 'mosede'
where not exists (select 1 from public.menu_varer m where m.kategori_id = k.id and m.navn = v.navn);

-- 14 kategorier, 151 varer i alt.