# -*- coding: utf-8 -*-
"""Mikkels syv trykte kort, skrevet af fra billederne 3/9.
   Hver post er (navn på kortet, pris, note på kortet, db-navn eller None).
   db-navn er den række i menu_varer, posten svarer til; None = står ikke
   i databasen som en enkelt række (fx en samlelinje)."""

KORT = [
 ("MENUKORT FRA GRILLEN", "Morgenmad fra tidligt, klassikerne fra pladen og burgere lavet på bestilling - alt sammen ved lugen.", [
   ("MORGENMAD", [
     ("Morgen komplet", 99, "Kaffe eller juice, rundstykke med pålæg, æg eller bacon & frugt", "Morgenkomplet"),
     ("English Breakfast", 99, "", "English breakfast"),
     ("Rundstykke med pålæg", 35, "", "Rundstykke med pålæg"),
     ("Havnens All in One", 40, "Brød, skinke & spejlæg", "Havnens all in one"),
     ("Frugt Mix", 25, "", "Frugtmix"),
     ("Morgenbrød", None, "Kan bestilles", "Morgenbrød"),
     ("Æg, bacon, pålæg, marmelade, Nutella, baked beans m.m.", 10, "", "SAMLELINJE: Tilkøb morgenmad"),
   ]),
   ("FISK & KLASSIKERE", [
     ("Stjerneskud", 105, "", "Stjerneskud"),
     ("Fish'n'chips", 110, "", "Fish’n’chips"),
     ("Fiskefilet med pommes", 95, "", "Fiskefilet med pommes"),
     ("Tartarmad", 99, "Bestilles dagen før", "Tartar"),
     ("Rejemad", 85, "", "Rejemad med mayo og citron"),
     ("Platte", 179, "Skal bestilles", "Platte til 1 person"),
     ("Smørrebrød", 55, "Se smørrebrødskortet", "SAMLELINJE: Smørrebrød"),
     ("Håndmadder", 27, "Se håndmadskortet", "SAMLELINJE: Håndmadder"),
     ("Pariserbøf", 110, "", "Pariserbøf"),
   ]),
   ("EKSTRA", [
     ("Dip eller dressing", 10, "", "Dip eller dressing"),
     ("Ekstra kød m.m.", 10, "", "Ekstra kød m.m."),
   ]),
 ]),

 ("BURGERE, PØLSER & PLADE", "stegt på bestilling", [
   ("ANDRE RETTER", [
     ("Mix med pommes & salat", 90, "Kebab, kylling, tun eller pølse", "Mix med pommes og salat"),
     ("Lun frikadelle med brød", 25, "", "Hjemmelavet lun frikadelle"),
     ("Hjemmelavet biksemad med spejlæg", 85, "", "Hjemmelavet biksemad med spejlæg"),
     ("Ekstra spejlæg", 10, "", "Ekstra spejlæg"),
     ("Blandet salat", 55, "", "Blandet salat"),
     ("Ekstra æg, tun, kebab, kylling eller pasta", 10, "", "Ekstra æg, tun, kebab, kylling eller pasta"),
     ("Nachos med tilbehør & ost", 85, "", "Nachos med tilbehør og ost"),
     ("Ekstra kylling, kebab eller oksekød", 10, "", "Ekstra kylling, kebab eller oksekød"),
     ("Gammeldags rejecocktail med brød og smør", 90, "", "Gammeldags rejecocktail"),
     ("Hjemmelavet hvidløgsbrød med tomat & ost", 45, "", "Hjemmelavet hvidløgsbrød"),
     ("Indbagte rejer med pommes", 95, "", "Indbagte rejer med pommes"),
     ("Nuggets med pommes", 85, "", "Nuggets med pommes"),
     ("Hjemmelavet toast, ost eller skinke", 35, "", "Hjemmelavet toast"),
     ("Hjemmelavet cowboytoast", 45, "", "Hjemmelavet cowboytoast"),
     ("Snackkurv", 85, "", "Snackkurv"),
     ("Pommes frites med dip", 40, "", "Pommes frites med dip"),
   ]),
   ("BURGERE & SANDWICHES", [
     ("Dobbelt burger", 125, "", "Dobbeltburger"),
     ("Cheeseburger", 85, "", "Cheeseburger"),
     ("Baconburger", 85, "", "Cheesebaconburger"),
     ("Havnens burger", 80, "", "Havnens burger"),
     ("Kyllingeburger", 80, "", "Kyllingeburger"),
     ("Flæskestegssandwich", 80, "", "Flæskestegssandwich"),
     ("Frikadellesandwich", 80, "", "Frikadellesandwich"),
     ("Bøfsandwich", 75, "", "Bøfsandwich"),
     ("Sandwich", 75, "Kebab, kylling, tun, frikadelle eller æg", "Sandwich, lille"),
     ("Ekstra tilbehør", 10, "", "Ekstra tilbehør"),
     ("Bearnaise", 10, "", "Bearnaise"),
   ]),
   ("PØLSER", [
     ("Ristet pølse", 30, "", "Ristet pølse"),
     ("Specialpølse eller bacon-svøb", 35, "", "Specialpølse med baconsvøb"),
     ("Frankfurter eller stor specialpølse", 40, "", "Frankfurter eller specialpølse"),
     ("Bacon-svøb", 5, "tillæg", None),
     ("Brød", 10, "", "Pølsebrød"),
     ("Kradser med det hele", 15, "", "Kradser med det hele"),
     ("Hotdog, lille", 40, "Fransk eller ristet", "Ristet hotdog, lille"),
     ("Hotdog, stor", 50, "Fransk eller ristet", "Ristet hotdog, stor"),
   ]),
 ]),

 ("SMØRREBRØD — hel skive rugbrød", "Hel skive hjemmebagt rugbrød med smør, smurt når du bestiller. Glutenfrit brød eller uden smør — bare sig til. Tartar bestilles dagen før.", [
   ("VARIANTER - alle 55,-", [(n, 55, "", n) for n in [
     "Flæskesteg med surt", "Fiskefilet med remoulade", "Fiskefilet med rejer og mayo",
     "Frikadelle med surt", "Hjemmelavet hønsesalat", "Æggesalat",
     "Wienersalat med tomat og løg", "Hjemmelavet skinkesalat med tomat og løg",
     "Leverpostej med surt", "Dyrlægens natmad", "Kartoffelmad med mayo, løg og bacon",
     "Rullepølse med sky og løg", "Roastbeef med remoulade og løg",
     "Skinke med italiensk salat", "Skinke med spejlæg", "Kylling med bacon og karry",
     "Spegepølse med sky og løg", "Spegepølse med remoulade og ristet løg",
     "Hvide sild", "Hvide sild med karry", "Æggemad med mayo og løg",
     "Æggemad med bacon og karry", "Hakkebøf med bløde løg og spejlæg", "Ostemad, mild",
   ]]),
   ("EGEN PRIS", [
     ("Rejemad", 85, "Med mayo og citron — hel skive", "Rejemad med mayo og citron"),
     ("Tartar", 99, "Bestilles dagen før — ring til lugen", "Tartar"),
   ]),
 ]),

 ("HÅNDMADDER — halv skive ved lugen", "Halv skive hjemmebagt rugbrød med smør — den lille sultne udgave. Glutenfrit brød eller uden smør, bare sig til.", [
   ("VARIANTER - alle 27,-", [(n, 27, "", n + ", håndmad") for n in [
     "Flæskesteg med surt", "Fiskefilet med remoulade", "Fiskefilet med rejer og mayo",
     "Frikadelle med surt", "Hjemmelavet hønsesalat", "Æggesalat",
     "Wienersalat med tomat og løg", "Hjemmelavet skinkesalat med tomat og løg",
     "Leverpostej med surt", "Dyrlægens natmad", "Kartoffelmad med mayo, løg og bacon",
     "Rullepølse med sky og løg", "Roastbeef med remoulade og løg",
     "Skinke med italiensk salat", "Skinke med spejlæg", "Kylling med bacon og karry",
     "Spegepølse med sky og løg", "Spegepølse med remoulade og ristet løg",
     "Hvide sild", "Hvide sild med karry", "Æggemad med mayo og løg",
     "Æggemad med bacon og karry", "Hakkebøf med bløde løg og spejlæg", "Ostemad, mild",
   ]]),
   ("KUN SOM SMØRREBRØD", [
     ("Rejemad & Tartar", None, "De to laves kun på hel skive — se smørrebrødskortet", None),
   ]),
   ("SIG TIL VED LUGEN", [
     ("Glutenfrit brød", 0, "SAMME PRIS — eller uden smør", "Glutenfrit brød (tillæg)"),
   ]),
 ]),

 ("IS & DRIKKEVARER", "Kugleis og softice fra lugen, bubblewaffles, churros og pandekager — og kaffen der hører til.", [
   ("IS", [
     ("1 kugle", 35, "", "1 kugle"),
     ("2 kugler", 45, "", "2 kugler"),
     ("3 kugler", 55, "", "3 kugler"),
     ("Ekstra kugle", 10, "", "Ekstra kugle"),
     ("Strøssel, topping eller guf", 7, "", "Sauce, topping eller guf"),
     ("Softice-top", 18, "", "Softice-top"),
     ("Løs vaffel", 4, "", "Løs vaffel"),
     ("Isbox, ca. 6 kugler eller softice", 80, "", "Ishorn med ca. 6 kugler softice"),
     ("Bøtte med topping", 20, "", "Bøtte med topping"),
   ]),
   ("SOFTICE", [
     ("Lille", 37, "", "Softice, lille"),
     ("Stor", 47, "", "Softice, stor"),
     ("Sauce, topping eller guf", 7, "", "Sauce, topping eller guf"),
   ]),
   ("SØDT", [
     ("Sundae med frugt og sauce", 45, "", "Sundae med frugt og sauce"),
     ("Bubblewaffle, 1 kugle", 59, "Inkl. drys og sovs", "Boblevaffel med 1 kugle"),
     ("Bubblewaffle, 2 kugler eller softice", 67, "Inkl. drys og sovs", "Boblevaffel med 2 kugler eller softice"),
     ("Churros med sukker og kanel", 45, "", "Churros med sukker og kanel"),
     ("Churros med is og sauce", 67, "", "Churros med is og sauce"),
     ("Hjemmelavede pandekager med sukker", 42, "", "Hjemmelavede pandekager med sukker"),
     ("Hjemmelavede pandekager med is", 65, "", "Hjemmelavede pandekager med is"),
   ]),
   ("KAGE", [
     ("Kage & desserter", 30, "Spørg for dagens udvalg", "Kage"),
     ("Flødekager", 40, "", "Flødekager"),
     ("Kaffe & kage", 65, "", "Kaffe og kage"),
     ("Kaffe & pandekage", 65, "", "Kaffe og pandekage"),
   ]),
 ]),

 ("KAFFE, KOLDT & KNAS", "stemplet, rystet og hældt op", [
   ("KAFFE & VARME DRIKKE", [
     ("Espresso", 35, "", "Espresso"),
     ("Americano", 40, "", "Americano"),
     ("Americano Ice", 45, "", "Iced americano"),
     ("Cortado", 45, "", "Cortado"),
     ("Macchiato", 45, "", "Macchiato"),
     ("Cappuccino", 45, "", "Cappuccino"),
     ("Flat White", 45, "", "Flat white"),
     ("Latte", 45, "", "Latte"),
     ("Latte Ice", 50, "", "Iced latte"),
     ("Chai", 45, "", "Chai"),
     ("Kakao", 40, "", "Kakao"),
     ("Te", 25, "", "Te"),
     ("Ekstra shot kaffe", 25, "", "Ekstra shot kaffe"),
     ("Sirup", 5, "", "Sirup"),
     ("Lumumba, varm eller kold", 75, "", "Lumumba"),
     ("Irish Coffee", 75, "", "Irish coffee"),
   ]),
   ("KOLDE DRIKKE", [
     ("Sodavand, juice, iste eller cacao - lille", 30, "", "Sodavand, juice, iste eller kakao – lille"),
     ("Sodavand, juice, iste eller cacao - stor", 40, "", "Sodavand, juice, iste eller kakao – stor"),
     ("Smoothie eller milkshake", 59, "", "Smoothie eller milkshake"),
     ("Slush Ice, lille", 25, "", "Slush Ice, lille"),
     ("Slush Ice, stor", 35, "", "Slush Ice, stor"),
     ("Capri-Sun", 15, "", "Juice eller Capri-Sun"),
     ("Brik juice eller cacao", 15, "", "Brik juice eller cacao"),
     ("Mælk", 20, "", "Mælk"),
     ("Cocio", 35, "", "Cocio"),
     ("Kildevand", 20, "", "Kildevand"),
     ("Isvand", 25, "", "Isvand"),
     ("Red Bull", 40, "", "Red Bull"),
     ("RTD", 40, "", "RTD"),
   ]),
   ("PAUSEN — kaffe & kage", [
     ("En kop kaffe og et stykke af dagens kage — eller en pandekage", 65, "", "Kaffe og kage"),
   ]),
 ]),

 ("ØL, VIN & BAR", "fadøl fra hanen og bobler til fest", [
   ("ØL", [
     ("Fadøl, lille", 35, "", "Fadøl, lille"),
     ("Fadøl, stor", 55, "", "Fadøl, stor"),
     ("Fadøl Lux, lille", 40, "", "Fadøl lux, lille"),
     ("Fadøl Lux, stor", 60, "", "Fadøl lux, stor"),
     ("Flaske eller dåse", 30, "", "Flaskeøl"),
     ("Flaske eller dåse, Lux", 40, "", "Flaskeøl lux"),
     ("Specialøl", 50, "", "Specialøl"),
     ("Specialøl, stor", 70, "", "Specialøl, stor"),
     ("Alkoholfri øl", 30, "", "Alkoholfri øl"),
   ]),
   ("BAR", [
     ("Drinks", 75, "", "Drinks"),
     ("Cocktail", 85, "", "Cocktail"),
     ("Snaps, spiritus og shots", 30, "", "Snaps, sambuca og shots"),
   ]),
   ("SLIK & SNACKS", [
     ("Slik, 1 stk.", 10, "", "Slik, 1 stk."),
     ("Slik, 3 stk.", 25, "", "Slik, 3 stk."),
     ("Chokolade", 20, "", "Chokolade"),
     ("Peanuts", 25, "", "Peanuts, 1 pose"),
     ("Chips eller svær", 35, "", "Chips eller svær, 1 pose"),
   ]),
   ("VIN, CAVA & CHAMPAGNE", [
     ("Vin, glas", 59, "", "Vin, glas"),
     ("Vin, flaske", 249, "", "Vin, flaske"),
     ("Alkoholfri vin, glas", 59, "", "Alkoholfri vin, glas"),
     ("Alkoholfri vin, flaske", 249, "", "Alkoholfri vin, flaske"),
     ("Cava, glas", 69, "", "Cava, glas"),
     ("Cava, flaske", 299, "", "Cava, flaske"),
     ("Champagne, glas", 69, "", "Champagne, glas"),
     ("Champagne, flaske", 299, "", "Champagne, flaske"),
   ]),
 ]),
]

# Påstande på kortene, der IKKE er varer — de skal efterprøves for sig.
PAASTANDE = [
  ("ØL, VIN & BAR", "ISBAR & BAR: \"Vi rykker fadøl, drinks og isbar ud i baglokalet — "
   "op til 40 personer.\""),
  ("ØL, VIN & BAR", "\"Giv os en vurdering på Google eller Facebook — vis den ved lugen, "
   "så følger der en gratis sodavand med til maden.\""),
  ("HÅNDMADDER", "\"Glutenfrit brød — SAMME PRIS\""),
  ("SMØRREBRØD", "\"Glutenfrit brød eller uden smør — bare sig til\""),
]
