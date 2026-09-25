# -*- coding: utf-8 -*-
"""Mikkels trykte kort, skrevet af fra PDF'erne.

   ⚠️ UDGAVEN HER ER FRA 25/9 2026 — ti nye kort (01-10), afleveret
   sammen med `00_Kontrolrapport.md`. Den forrige udgave (3/9, syv
   kort) ligger i git-historikken.

   ⚠️ KORT 06 (Kaffe, koldt og knas) OG 07 (Øl, vin og bar) ER IKKE
   MODTAGET. Kontrolrapporten nævner dem som to af de ti filer, men
   de var ikke vedhæftet. De to afsnit nedenfor står derfor som de
   var 3/9, og de er MÆRKET. En sammenligning, der lader som om den
   har målt dem, er værre end ingen sammenligning.

   Hver post er (navn på kortet, pris, note på kortet, db-navn eller None).
   db-navn er den række i menu_varer, posten svarer til; None = står ikke
   i databasen som en enkelt række (fx en samlelinje)."""

# ⚠️ KORTENE ER IKKE TRYKGODKENDT ENDNU. Kontrolrapporten skriver
# ordret "Til uafhængig slutkontrol – IKKE trykgodkendt", og chefens
# sms med godkendelsen er ikke kommet. Retter du databasen efter dem,
# så skriv hvilke rettelser der hviler på et kort, der kan nå at ændre
# sig.

KORT = [
 ("01 MENUKORT FRA GRILLEN", "Morgenmad fra tidligt, klassikerne fra pladen og burgere lavet på bestilling — alt sammen ved lugen.", [
   ("MORGENMAD", [
     ("Morgen komplet", 99, "Kaffe eller juice, rundstykke med pålæg, æg eller bacon & grønt", "Morgenkomplet"),
     ("English Breakfast", 99, "Ristet toastbrød, spejlæg, bacon, bønner, grønt, ost, ½ pølse, stegte champignoner og ½ stegt tomat", "English breakfast"),
     ("Rundstykke med pålæg", 35, "", "Rundstykke med pålæg"),
     ("Franskbrød med pålæg", 35, "", "Franskbrød med pålæg"),
     ("Havnens All in One", 40, "Brød, skinke & spejlæg · + ost 10,-", "Havnens all in one"),
     ("Wienerbrød", 30, "Sælges kun helt", "Wienerbrød"),
     ("Morgenbrød", None, "Spørg ved bestilling", "Morgenbrød"),
     ("Æg, bacon, pålæg, marmelade, Nutella, baked beans m.m.", 10, "", "SAMLELINJE: Tilkøb morgenmad"),
   ]),
   ("FISK & KLASSIKERE", [
     ("Stjerneskud", 105, "", "Stjerneskud"),
     ("Fish'n'chips", 105, "", "Fish’n’chips"),
     ("Fiskefilet med pommes", 95, "", "Fiskefilet med pommes"),
     ("Tartarmad", 95, "", "Tartarmad"),
     ("Rejemad", 95, "", "Rejemad"),
     ("Platte", 179, "Skal bestilles", "Platte"),
     ("Smørrebrød", 55, "Se smørrebrødskortet", "SAMLELINJE: Smørrebrød"),
     ("Håndmadder", 27, "Se håndmadskortet", "SAMLELINJE: Håndmadder"),
     ("Pariserbøf", 105, "", "Pariserbøf"),
     ("Clubsandwich", 105, "", "Clubsandwich"),
   ]),
   ("EKSTRA", [
     ("Dip eller dressing", 10, "", "Dip eller dressing"),
     ("Ekstra kød m.m.", 10, "", "Ekstra kød m.m."),
   ]),
 ]),

 ("02 À LA CARTE, BURGERE & PØLSER", "stegt på bestilling", [
   ("ANDRE RETTER", [
     ("Pølsemix med pommes", 90, "", "Pølsemix med pommes"),
     ("Kebabmix med pommes", 90, "", "Kebabmix med pommes"),
     ("Kyllingmix med pommes", 90, "", "Kyllingmix med pommes"),
     ("Lun delle, steg eller leverpostej", 65, "Med brød og surt", "Lun delle, steg eller leverpostej med brød og surt"),
     ("Hjemmelavet lun frikadelle", 25, "", "Hjemmelavet lun frikadelle"),
     ("Pitabrød", 65, "Kebab, kylling eller tun", "Pitabrød"),
     ("Hjemmelavet biksemad med spejlæg", 85, "", "Hjemmelavet biksemad med spejlæg"),
     ("Ekstra spejlæg", 10, "", "Ekstra spejlæg"),
     ("Blandet salat", 55, "", "Blandet salat"),
     ("Nachos med tilbehør & ost", 85, "", "Nachos med tilbehør & ost"),
     ("Ekstra kød eller tilbehør", 10, "", "Ekstra tilbehør"),
     ("Gammeldags rejecocktail med brød og smør", 90, "", "Gammeldags rejecocktail med brød og smør"),
     ("Hjemmelavet hvidløgsbrød med tomat & ost", 45, "", "Hjemmelavet hvidløgsbrød med tomat & ost"),
     ("8 indbagte rejer med pommes", 95, "", "Indbagte rejer med pommes"),
     ("10 nuggets med pommes", 85, "", "Nuggets med pommes"),
     ("Hjemmelavet toast, ost og skinke", 35, "", "Hjemmelavet toast, ost og skinke"),
     ("Hjemmelavet cowboytoast", 45, "", "Hjemmelavet cowboytoast"),
     ("Snackkurv", 85, "", "Snackkurv"),
     ("Pommes frites med dip", 40, "", "Pommes frites med dip"),
   ]),
   ("BURGERE & SANDWICHES", [
     ("Dobbelt burger", 125, "", "Dobbelt burger"),
     ("Cheeseburger", 85, "", "Cheeseburger"),
     ("Baconburger", 85, "", "Baconburger"),
     ("Bacon & Cheeseburger", 95, "", "Bacon & Cheeseburger"),
     ("Havnens burger", 80, "", "Havnens burger"),
     ("Kyllingeburger", 80, "", "Kyllingeburger"),
     ("Sandwich", 75, "Kebab, kylling/bacon, tun, frikadelle, æg, flæskesteg, roastbeef m.fl. — se bestillingslisten for hele udvalget", "Sandwich"),
   ]),
   ("PØLSER", [
     ("Ristet pølse", 30, "", "Ristet pølse"),
     ("Ristet pølse med bacon", 35, "", "Ristet pølse med bacon"),
     ("Frankfurter", 40, "", "Frankfurter"),
     ("Frankfurter med bacon", 45, "", "Frankfurter med bacon"),
     ("Ostepølse", 35, "", "Ostepølse"),
     ("Krydderpølse", 35, "", "Krydderpølse"),
     ("Brød", 10, "", "Pølsebrød"),
     ("Kradser med det hele", 15, "", "Kradser med det hele"),
     ("Ristet hotdog, lille", 40, "", "Hotdog, lille"),
     ("Ristet hotdog, stor", 50, "", "Hotdog, stor"),
     ("Fransk hotdog, lille", 40, "", "Fransk hotdog, alm."),
     ("Fransk hotdog, stor", 50, "", "Fransk hotdog, stor"),
   ]),
 ]),

 ("03 SMØRREBRØD", "Friskbagt rugbrød, smurt når du bestiller. Glutenfrit brød, med eller uden smør — bare sig til.", [
   ("VARIANTER - alle 55,-", [
     ("Flæskesteg med surt", 55, "", "Flæskesteg med surt"),
     ("Fiskefilet med remoulade", 55, "", "Fiskefilet med remoulade"),
     ("Fiskefilet med rejer & mayo", 55, "", "Fiskefilet med rejer og mayo"),
     ("Frikadelle med surt", 55, "", "Frikadelle med surt"),
     ("Dagens hjemmelavede pålægssalater", 55, "Spørg ved bestilling", "Dagens hjemmelavede pålægssalater"),
     ("Leverpostej med surt", 55, "", "Leverpostej med surt"),
     ("Dyrlægens natmad", 55, "", "Dyrlægens natmad"),
     ("Kartoffelmad med mayo, løg & bacon", 55, "", "Kartoffelmad med mayo, løg og bacon"),
     ("Rullepølse med sky & løg", 55, "", "Rullepølse med sky og løg"),
     ("Roastbeef med remoulade & løg", 55, "", "Hjemmelavet Roastbeef med remoulade og løg"),
     ("Skinke med italiensk salat", 55, "", "Skinke med italiensk salat"),
     ("Skinke med spejlæg", 55, "", "Skinke med spejlæg"),
     ("Kylling med bacon & karry", 55, "", "Kylling med bacon og karry"),
     ("Spegepølse med sky & løg", 55, "", "Spegepølse med sky og løg"),
     ("Spegepølse med remoulade & ristet løg", 55, "", "Spegepølse med remoulade og ristet løg"),
     ("Hvide sild", 55, "", "Hvide sild"),
     ("Hvide sild med karry", 55, "", "Hvide sild med karry"),
     ("Æggemad med mayo & løg", 55, "", "Æggemad med mayo og løg"),
     ("Æggemad med mayo & rejer", 55, "", "Æggemad med mayo og rejer"),
     ("Hakkebøf med bløde løg & spejlæg", 55, "", "Hakkebøf med bløde løg og spejlæg"),
     ("Ostemad", 55, "", "Ostemad Mellem lageret"),
   ]),
   ("EGEN PRIS", [
     ("Hjemmelavet lun delle", 25, "", "Lun delle eller steg"),
     ("Hjemmelavet flæskesvær", 35, "", "Hjemmelavet flæskesvær"),
     ("Rejemad", 95, "Fås både på rugbrød og franskbrød", "Rejemad"),
     ("Tartar", 95, "Bestilles dagen før", "Tartarmad"),
   ]),
   ("SIG TIL VED LUGEN", [
     ("Glutenfrit brød", 5, "Med eller uden smør — bare sig til", "Glutenfrit brød (tillæg)"),
   ]),
 ]),

 ("04 HÅNDMADDER", "Friskbagt rugbrød, smurt når du bestiller. Glutenfrit brød, med eller uden smør — bare sig til.", [
   # ⚠️ KORTET SIGER 27, DATABASEN SIGER 24 — OG DET ER EN KONFLIKT,
   # IKKE EN FEJL. Ejeren sagde 21/9 ordret "kig altid på ny trykte
   # menukort, håndmadder er 24", og databasen blev rettet 27 -> 24
   # samme dag. De nye kort (01, 04, 09 og flyeren) siger alle fire
   # 27. Se docs/HISTORIK.md.
   ("VARIANTER - alle 27,-", [(n, 27, "", db) for n, db in [
     ("Flæskesteg med surt", "Flæskesteg med surt, håndmad"),
     ("Fiskefilet med remoulade", "Fiskefilet med remoulade, håndmad"),
     ("Frikadelle med surt", "Frikadelle med surt, håndmad"),
     ("Dagens hjemmelavede pålægssalater", "Dagens hjemmelavede pålægssalater, håndmad"),
     ("Leverpostej med surt", "Leverpostej med surt, håndmad"),
     ("Dyrlægens natmad", "Dyrlægens natmad, håndmad"),
     ("Kartoffelmad med mayo, løg & bacon", "Kartoffelmad med mayo, løg og bacon, håndmad"),
     ("Rullepølse med sky & løg", "Rullepølse med sky og løg, håndmad"),
     ("Roastbeef med remoulade & løg", "Hjemmelavet Roastbeef med remoulade og løg, håndmad"),
     ("Skinke med italiensk salat", "Skinke med italiensk salat, håndmad"),
     ("Skinke med spejlæg", "Skinke med spejlæg, håndmad"),
     ("Kylling med bacon & karry", "Kylling med bacon og karry, håndmad"),
     ("Spegepølse med sky & løg", "Spegepølse med sky og løg, håndmad"),
     ("Spegepølse med remoulade & ristet løg", "Spegepølse med remoulade og ristet løg, håndmad"),
     ("Hvide sild", "Hvide sild, håndmad"),
     ("Hvide sild med karry", "Hvide sild med karry, håndmad"),
     ("Æggemad med mayo & løg", "Æggemad med mayo og løg, håndmad"),
     ("Hakkebøf med bløde løg & spejlæg", "Hakkebøf med bløde løg og spejlæg, håndmad"),
     ("Ostemad", "Ostemad, mellem lageret  håndmad"),
   ]]),
   ("EGEN PRIS", [
     ("Hjemmelavet lun delle", 25, "", "Lun delle eller steg"),
     ("Hjemmelavet flæskesvær", 35, "", "Hjemmelavet flæskesvær"),
   ]),
   ("IKKE SOM HÅNDMAD", [
     ("Rejemad & Tartar", None, "Rejemad fås både på rugbrød og franskbrød. Tartar fås som smørrebrød.", None),
   ]),
   ("SIG TIL VED LUGEN", [
     ("Glutenfrit brød", 5, "Med eller uden smør — bare sig til", "Glutenfrit brød (tillæg)"),
   ]),
 ]),

 ("05 IS & SØDT", "Kugleis og cremet softice, sprøde bubblewaffles, churros og hjemmelavede pandekager — til en tur langs vandet.", [
   ("IS", [
     ("1 kugle", 35, "", "1 kugle"),
     ("2 kugler", 45, "", "2 kugler"),
     ("3 kugler", 55, "", "3 kugler"),
     ("4 kugler", 65, "", "4 kugler"),
     ("Havnens café-is", 79, "3 kugler, softice-top, guf, flødeskum og syltetøj", "Havnens café-is"),
     ("Ekstra kugle", 12, "", "Ekstra kugle"),
     ("Sauce, topping eller guf", 8, "", "Strøssel, topping eller guf"),
     ("Softice-top", 15, "", "Softice-top"),
     ("Løs vaffel, pr. stk.", 7, "", "Løs vaffel"),
     ("Løs vaffel, glutenfri, pr. stk.", 7, "", "Løs vaffel, glutenfri"),
     ("Isboks, ca. 6 kugler eller softice", 90, "Tag med på turen — 6 valgfrie kugler", "Isboks, ca. 6 kugler eller softice"),
     ("Toppingbøtte", 20, "", "Bøtte med topping"),
   ]),
   ("SOFTICE", [
     ("Lille", 37, "", "Softice, lille"),
     ("Stor", 47, "", "Softice, stor"),
     ("Bakke med vaffelknas, softice, sauce & topping", 55, "", "Bakke med vaffelknas, softice, sauce og topping"),
     ("Sauce, topping eller guf", 8, "", "Sauce, topping eller guf"),
   ]),
   ("SØDT", [
     ("Sundae med sauce og topping", 45, "", "Sundae med sauce og topping"),
     ("Bubblewaffle, 1 kugle", 59, "Inkl. drys og sovs", "Bubblewaffle, 1 kugle"),
     ("Bubblewaffle, 2 kugler eller softice", 67, "Inkl. drys og sovs", "Bubblewaffle, 2 kugler eller softice"),
     ("Bubblewaffle mix", 67, "Frisk frugt efter dagen, sauce & topping", "Bubblewaffle mix"),
     ("Churros med sukker og kanel", 45, "", "Churros med sukker og kanel"),
     ("Churros med is og sauce", 67, "", "Churros med is og sauce"),
     ("2 hjemmelavede pandekager", 45, "", "2 hjemmelavede pandekager med sukker"),
     ("2 hjemmelavede pandekager med 1 kugle is", 65, "", "2 hjemmelavede pandekager med is"),
     ("2 hjemmelavede pandekager med 2 kugler is", 77, "", "2 hjemmelavede pandekager med 2 kugler is"),
     ("Affogato", 65, "Espresso med vaniljeis og nødder", "Affogato"),
   ]),
 ]),

 ("08+09 BESTILLINGSLISTE — SANDWICH", "udfyld og aflever ved lugen — alle sandwich 75,-", [
   ("SANDWICH", [(n, 75, "", db) for n, db in [
     ("Sandwich · kebab", "Sandwich"),
     ("Sandwich · flæskesteg", "Flæskestegssandwich"),
     ("Sandwich · frikadelle", "Frikadellesandwich"),
   ]]),
   ("MERE FRA KØKKENET", [
     ("Hjemmelavet lun delle", 25, "", "Lun delle eller steg"),
     ("Hjemmelavet flæskesvær", 35, "", "Hjemmelavet flæskesvær"),
   ]),
 ]),

 ("06 KAFFE, KOLDT & KNAS  ⚠️ IKKE MODTAGET — udgaven fra 3/9", "stemplet, rystet og hældt op", [
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

 ("07 ØL, VIN & BAR  ⚠️ IKKE MODTAGET — udgaven fra 3/9", "fadøl fra hanen og bobler til fest", [
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
  ("01 MENUKORT FRA GRILLEN", "\"Morgenbrød – spørg ved bestilling.\" — ingen bestillingsliste til morgenbrød"),
  ("03 SMØRREBRØD", "\"Alle varianter 55,- · gælder alle almindelige smørrebrød på listen\""),
  ("04 HÅNDMADDER", "\"Alle varianter 27,- · gælder alle almindelige håndmadder på listen\""),
  ("05 IS & SØDT", "\"Alle kugler og al softice kan fås i glutenfri vaffel — samme pris som almindelig vaffel\""),
  ("08+09 BESTILLINGSLISTE", "\"Vi leverer også gerne mad til arrangementer, selskaber og andre "
   "begivenheder\" — afhentning OG levering"),
  ("08+09 BESTILLINGSLISTE", "\"I kan leje vores isfryser til selvbetjening eller booke vores isvogn "
   "med betjening. Udvalg aftales efter ønske.\""),
  ("10 FLYER", "\"Bestillingsliste fås i caféen\""),
]
