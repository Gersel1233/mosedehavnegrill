/* ============================================================
   MENUKORTET SOM DE TRYKTE KORT  (26/9)
   ------------------------------------------------------------
   Mikkels ord med billederne af de trykte kort: *"de skal
   naturligvis matche 1:1 med de her"* — og 26/9: *"Brug så vidt muligt
   de samme kategorinavne som på de trykte kort, herunder »À la carte,
   burgere & pølser« og »Is & sødt«. Bevar »Til selskabet«."*

   ⚠️ KORTUDGAVEN ER DEN GODKENDTE FRA 25/9 — den samme, der står i
   vaerktoej/kortene.py (PDF'erne). Billederne, Mikkel sendte 26/9, er
   en ældre udgave (de har "Strøssel", "Kun take away" og de tre
   slukkede sandwich); deres opbygning er brugt, men overskrifter og
   tekster er PDF'ernes. Derfor:

   · OPBYGNINGEN ER KORTENES: kapitlerne, overskrifterne, de kursive
     tekster, afsnittene og boksene står her ordret af billederne.
   · VARERNE OG PRISERNE ER DATABASENS: et afsnit peger på ejerens
     kategorier og varenavne, aldrig på et tal. Står der en pris i en
     boks, er den regnet ud af varerne (fx "alle varianter 55,-" er
     55, fordi ALLE rækkerne i kategorien koster 55). Ingen pris her
     er skrevet i hånden.

   ⚠️ INGEN VARE MÅ FORSVINDE. Lægger ejeren en ny vare ind i admin,
   står den i sin kategoris "rest"-afsnit; har kategorien intet
   afsnit her, står den i kapitlet "Mere fra lugen" til sidst.
   Reglen bor i js/skal/menukort.js (fordel()).

   Formen:
     kilder: [{ kat: 'Navn' }]              alle kategoriens varer, der
                                            ikke er taget af et andet afsnit
     kilder: [{ kat: '*', navne: [...] }]   præcis disse varer, uanset
                                            kategori (kortet flytter dem)
     samle: true      alle varerne i ÉN linje ("Æg, bacon, … 10,-")
     tabel: 'stor'    kaffens LILLE/STOR — Stor er valget "Stor" med
                      dets tillæg (Butik.valgTillaeg)
     henvis: 'id'     en linje, der peger på et andet kapitel
     udenPris: true   ingen pris pr. linje, NÅR alle koster det samme
                      (prisen står så i boksen) — ellers står de
   Navne sammenlignes uden store/små bogstaver og mellemrum i enderne.

   ⚠️ EN VARE KAN KUN STÅ ÉT STED. Kortene har fx Wienerbrød både ved
   morgenmaden og ved kagen; her står den ved morgenmaden. To steder
   ville være to linjer at holde ens.
   ============================================================ */
(function () {
  'use strict';

  var KAPITLER = [
    {
      /* ⚠️ ID'ET BLIVER 'grillen'  (30/9). Kortet hedder "Morgenmad
         & frokost" nu, men id'et er ANKERET (#kapitel-grillen) og
         ikke en overskrift: skiftede vi det, ville links og
         prøver brække, uden at gæsten så en eneste forskel. */
      id: 'grillen',
      over: 'Mosede Havnecafe',
      /* ⚠️ KORTET HEDDER DET, DET TRYKTE KORT HEDDER  (30/9).
         De trykte grillkort er rokeret om — ingen vare og ingen
         pris ændret, men kort 1 er nu "Morgenmad og frokost" og
         kort 2 "À la carte, burgere og pølser".

         Her stod ['Menukort']. To ting var galt med det: en gæst
         med det trykte kort i hånden ledte efter et kapitel,
         skærmen ikke havde — og ordet stod i forvejen TO gange,
         fordi m-menukort.html har sin egen <h1>Menukort</h1> lige
         over. Navnet gik altså ikke tabt ved at flytte. */
      titel: ['Morgenmad', '& frokost'],
      under: 'Fra grillen',
      /* ⚠️ INGEN BURGERE I INDLEDNINGEN MERE. Sætningen er fra
         dengang kort 1 var hele grillens kort; burgerne ligger på
         kort 2, og et kort, der lover noget, det ikke har, sender
         gæsten det forkerte sted hen. */
      tekst: 'Morgenmad fra tidligt og klassikerne fra pladen — alt sammen ved lugen.',
      hop: 'Morgenmad & frokost',
      venstre: [
        { titel: 'Morgenmad', kilder: [{ kat: 'Morgenmad' }] },
        { titel: 'Tilkøb til morgenmaden', samle: true, kilder: [{ kat: 'Tilkøb morgenmad' }] },
        { boks: 'flokken', over: 'Til flokken', titel: 'Morgenbrød',
          /* Kort 01, ordret (27/9): ingen henvisning til en bestillingsliste
             til morgenbrød — der findes ingen. */
          tekst: 'Morgenbrød – spørg ved bestilling.', bund: 'Spørg ved lugen' },
      ],
      hoejre: [
        { titel: 'Fisk & klassikere', kilder: [
          { kat: '*', navne: ['Stjerneskud', 'Fish’n’chips', "Fish'n'chips", 'Fiskefilet med pommes', 'Tartarmad', 'Rejemad'] },
          { kat: 'Platter' },
          { kat: 'Retter' },
        ], henvis: [
          { navn: 'Smørrebrød', note: 'Se smørrebrødskortet', til: 'smoerrebroed' },
          { navn: 'Håndmadder', note: 'Se håndmadskortet', til: 'haandmadder' },
        ] },
        { titel: 'Ekstra', kilder: [{ kat: '*', navne: ['Dip eller dressing', 'Ekstra kød m.m.'] }] },
      ],
    },
    {
      id: 'burgere',
      titel: ['À la carte,', 'burgere & pølser'],
      slogan: 'stegt på bestilling',
      hop: 'À la carte & burgere',
      venstre: [
        { titel: 'Andre retter', kilder: [
          { kat: '*', navne: ['Lun delle, steg eller leverpostej med brød og surt', 'Lun delle eller steg', 'Pitabrød'] },
          { kat: 'Andre retter' },
        ] },
        { titel: 'Sliders', kilder: [{ kat: 'Sliders' }] },
      ],
      hoejre: [
        { titel: 'Burgere & sandwiches', kilder: [{ kat: 'Burgere' }, { kat: 'Sandwich' }] },
        { titel: 'Pølser', kilder: [{ kat: 'Pølser' }] },
      ],
    },
    {
      id: 'smoerrebroed',
      over: 'Mosede Havnecafe',
      titel: ['Smørrebrød'],
      tekst: 'Friskbagt rugbrød, smurt når du bestiller. Glutenfrit brød, med eller uden smør — bare sig til.',
      hop: 'Smørrebrød',
      hel: [
        { titel: 'Varianter', udenPris: true, kolonner: 2, kilder: [{ kat: 'Smørrebrød' }] },
        /* ⚠️ DE TO MED EGEN PRIS STÅR SIDST I VARIANTERNE  (2/10).
           De endelige kort 3 og 4 slutter variantlisten med
           "Hjemmelavet lun delle 25,-" og "Hjemmelavet flæskesvær
           35,-" — MED pris, modsat resten af listen, hvor alt
           koster det samme.

           Mikkel 2/10, efter at jeg havde spurgt i stedet for at
           gætte: *"Brug varen 'Hjemmelavet lun frikadelle' til 25,-
           på både smørrebrød og håndmadder. 'Lun delle eller steg'
           er en anden vare og skal ikke bruges som erstatning."*

           ⚠️ EGET AFSNIT UDEN OVERSKRIFT. `udenPris` gælder hele
           afsnittet og virker kun, når alle priser er ens — lagde
           vi de to ind i variantlisten, ville ALLE priser komme
           frem, og den rene liste ville blive til en priskolonne.
           ⚠️ Og `genbrug`, fordi de samme to varer også står på
           deres egne kort. Se noten ved frit() i menukort.js. */
        /* ⚠️ FISKEFILET MED REJER HAR SIN EGEN PRIS  (7/10). Chefen:
           *"Fiskefilet med Rejer og Mayo +10,-kr."* — 65, hvor resten
           koster 55. Den står her, i fortsættelsen med prisvarerne, og
           IKKE i variantlisten: én anden pris dér, og `udenPris` slår
           fra og viser ALLE priserne. Den tages ved navn (trin 1), før
           kategoriens rest fordeles, så den kun står ét sted. */
        { kilder: [{ kat: 'Smørrebrød', navne: ['Fiskefilet med rejer og mayo'] },
          { kat: '*', genbrug: true,
            navne: ['Hjemmelavet lun frikadelle', 'Hjemmelavet flæskesvær'] }] },
        /* Slukket hos ejeren i dag — men tænder han den i admin, står
           fyldet her ved smørrebrødet og ikke i "Mere fra lugen". */
        { titel: 'Vælg fyld', kilder: [{ kat: 'Vælg fyld til smørrebrødet' }] },
        /* ⚠️ "EGEN PRIS" OG "BESTILLES DAGEN FØR" ER VÆK  (7/10). Chefen,
           ordret: *"Rejemad og Tartar Fjern Egen pris begge steder"* og
           *"Tartar skal IKKE bestilles dagen før."* Felterne står —
           titel, pris og rejemadens brød — kun mærkatet og sætningen
           er taget ud. */
        { boks: 'raekke', felter: [
          { over: 'Smørrebrød', titel: 'Alle varianter', pris: { ens: 'Smørrebrød' }, tekst: 'Gælder alle almindelige smørrebrød på listen.' },
          { titel: 'Rejemad', pris: { vare: 'Rejemad' }, tekst: 'Fås både på rugbrød og franskbrød.' },
          { titel: 'Tartar', pris: { vare: 'Tartarmad' } },
          { over: 'Sig til ved lugen', titel: 'Glutenfrit brød', pris: { vare: 'Glutenfrit brød (tillæg)', plus: true }, tekst: 'Med eller uden smør — bare sig til.' },
        ] },
      ],
    },
    {
      id: 'haandmadder',
      over: 'Mosede Havnecafe',
      titel: ['Håndmadder'],
      tekst: 'Friskbagt rugbrød, smurt når du bestiller. Glutenfrit brød, med eller uden smør — bare sig til.',
      hop: 'Håndmadder',
      hel: [
        { titel: 'Varianter', udenPris: true, kolonner: 2, kilder: [{ kat: 'Håndmadder' }] },
        /* ⚠️ DE TO MED EGEN PRIS STÅR SIDST I VARIANTERNE  (2/10).
           Se den lange note på smørrebrødskortet. Kortene 3 og 4 slutter variantlisten med
           "Hjemmelavet lun delle 25,-" og "Hjemmelavet flæskesvær
           35,-" — MED pris, modsat resten af listen, hvor alt
           koster det samme.

           Mikkel 2/10, efter at jeg havde spurgt i stedet for at
           gætte: *"Brug varen 'Hjemmelavet lun frikadelle' til 25,-
           på både smørrebrød og håndmadder. 'Lun delle eller steg'
           er en anden vare og skal ikke bruges som erstatning."*

           ⚠️ EGET AFSNIT UDEN OVERSKRIFT. `udenPris` gælder hele
           afsnittet og virker kun, når alle priser er ens — lagde
           vi de to ind i variantlisten, ville ALLE priser komme
           frem, og den rene liste ville blive til en priskolonne.
           ⚠️ Og `genbrug`, fordi de samme to varer også står på
           deres egne kort. Se noten ved frit() i menukort.js. */
        { kilder: [{ kat: '*', genbrug: true,
          navne: ['Hjemmelavet lun frikadelle', 'Hjemmelavet flæskesvær'] }] },
        /* ⚠️ MAGEN TIL SMØRREBRØDETS BOKS (29/9, chefens ord: "Den store
           boks i bunden skal være magen til den der er på Smørrebrøds
           kortet"). Fire felter med hver sin pris i samme form; boksen
           "Ikke som håndmad" (rejemad og tartar) er taget ud. */
        { boks: 'raekke', felter: [
          { over: 'Håndmadder', titel: 'Alle varianter', pris: { ens: 'Håndmadder' }, tekst: 'Gælder alle almindelige håndmadder på listen.' },
          /* ⚠️ VENDT 7/10: "KUN SMØRREBRØD" ER TAGET AF IGEN. Chefen,
             ordret: *"Rejemad & Tartarmad Fjern Kun Smørrebrød Begge
             steder"* — og Mikkel: *"præcis som chefen skrev"*. Noten
             herunder er grunden til, at mærkatet kom på; den står, så
             den næste ved, hvad der blev vejet.

             ⚠️ DET ENDELIGE KORT FLYTTEDE BOKSENS INDHOLD  (2/10).
             Den havde lun delle og flæskesvær; på det godkendte
             kort 4 er de to rykket op i variantlisten, og boksen
             siger nu rejemad og tartar med mærket "Kun smørrebrød"
             — altså hvad man IKKE kan få som håndmad. Det er en
             oplysning, ikke en vare: står den ikke, bestiller nogen
             en rejemad som håndmad og får nej ved lugen. */
          { titel: 'Rejemad', pris: { vare: 'Rejemad' }, tekst: 'Fås både på rugbrød og franskbrød.' },
          { titel: 'Tartar', pris: { vare: 'Tartarmad' } },
          { over: 'Sig til ved lugen', titel: 'Glutenfrit brød', pris: { vare: 'Glutenfrit brød (tillæg)', plus: true }, tekst: 'Med eller uden smør — bare sig til.' },
        ] },
      ],
    },
    {
      id: 'is',
      /* ⚠️ #afsnit-is ER FORSIDENS GENVEJ ("Se hele is-menukortet").
         Kapitlet bærer det id; flyttes isen, skal id'et med. */
      anker: 'afsnit-is',
      over: 'Mosede Havnecafe',
      titel: ['Is & sødt'],
      tekst: 'Kugleis og cremet softice, sprøde bubblewaffles, churros og hjemmelavede pandekager — til en tur langs vandet.',
      hop: 'Is & sødt',
      venstre: [
        { titel: 'Is', kilder: [{ kat: 'Kugleis' }] },
        { titel: 'Softice', kilder: [{ kat: '*', navne: ['Softice, lille', 'Softice, stor', 'Bakke med vaffelknas, softice, sauce og topping'] }] },
      ],
      hoejre: [
        { titel: 'Sødt', kilder: [{ kat: 'Softice og vafler' }, { kat: 'Ispinde' }] },
        { boks: 'vaffel', over: 'Sig til ved lugen', titel: 'Glutenfri vaffel', vaffel: true },
      ],
    },
    {
      id: 'kaffe',
      titel: ['Kaffe,', 'koldt & knas'],
      slogan: 'stemplet, rystet og hældt op',
      hop: 'Kaffe & koldt',
      venstre: [
        { titel: 'Kaffe', tabel: 'stor', kilder: [{ kat: 'Kaffe og varme drikke', medValg: 'Stor' },
          { kat: '*', navne: ['Espresso'] }] },
        /* ⚠️ LILLE 3 CL OG STOR 6 CL ER TO VARER  (7/10). Chefen:
           *"Lumumba varm el. Kold Lille 3 Cl. 75,-, Stor 6 Cl. 145,-"* og
           det samme for Irish coffee. De står ved NAVN her — ellers
           tager Kage-afsnittets kategori-rest dem. De gamle navne
           bliver stående: siden går i luften, før eller efter SQL'en
           er kørt, og begge dele skal se rigtige ud. */
        { titel: 'Varmt & ekstra', kilder: [
          { kat: '*', navne: ['1 iskugle i kaffen', 'Ekstra shot kaffe', 'Sirup', 'Te',
            'Lumumba, lille 3 cl', 'Lumumba, stor 6 cl', 'Lumumba, varm eller kold', 'Lumumba',
            'Irish coffee, lille 3 cl', 'Irish coffee, stor 6 cl', 'Irish coffee', 'Irish coffee, stor'] },
        ] },
        { titel: 'Kage', kilder: [
          { kat: '*', navne: ['Kage & desserter', 'Gammeldags æblekage', 'Flødekager'] },
          { kat: 'Kaffe og varme drikke' },
        ] },
      ],
      hoejre: [
        /* Milkshake står i "Tilkøb ud af huset" (én vare, én pris) — kort 06
           har den lige under Dagens smoothie (27/9). */
        { titel: 'Kolde drikke', kilder: [{ kat: 'Sodavand, juice og kakao' },
          { kat: '*', navne: ['Milkshake'], efter: 'Dagens smoothie' }] },
        { boks: 'pausen', over: 'Kaffe & kage', titel: 'Pausen', pris: { vare: 'Kaffe og kage' }, tag: true,
          tekst: 'En kop kaffe og et stykke af dagens kage — eller en pandekage.' },
      ],
    },
    {
      id: 'bar',
      titel: ['Øl, vin', '& bar'],
      slogan: 'fadøl fra hanen og bobler til fest',
      hop: 'Øl, vin & bar',
      venstre: [
        { titel: 'Øl', kilder: [{ kat: 'Øl' }] },
        /* ⚠️ RTD STÅR OGSÅ HER  (7/10). Chefen skriver RTD under både
           "Kolde drikke" og "Bar". Varen bor i Kolde drikke (sin
           kategori); her er den `genbrug`, så den ikke forsvinder
           derfra. Samme vare, samme pris, to steder — som kortet. */
        { titel: 'Bar', kilder: [{ kat: '*', navne: ['Drinks', 'Cocktail', 'Snaps, spiritus og shots', 'Snaps, sambuca og shots'] },
          { kat: '*', genbrug: true,
            navne: ['RTD, 1 stk. Breezer eller Smirnoff', 'RTD, 3 stk. Breezer eller Smirnoff'] }] },
        /* Hjemmelavet flæskesvær står i "Tilkøb ud af huset" — kort 07 har
           den sidst under Slik & snacks, til 35 (Mikkels ønske 27/9). */
        /* Dagens frugtfad bor under Sødt (Softice og vafler); chefen
           skriver den også her, lige efter "1 stk. frugt" (7/10). */
        { titel: 'Slik & snacks', kilder: [{ kat: 'Snacks og slik' },
          { kat: '*', navne: ['Hjemmelavet flæskesvær'], efter: true },
          { kat: '*', genbrug: true, navne: ['Dagens frugtfad'], efter: '1 stk. frugt' }] },
      ],
      hoejre: [
        { titel: 'Vin, cava & champagne', kilder: [{ kat: 'Vin, cava og champagne' }] },
      ],
    },
    {
      id: 'selskab',
      over: 'Mosede Havnecafe',
      titel: ['Til selskabet'],
      tekst: 'Tapasfad, pindemad og tilkøb ud af huset — bestilles i forvejen.',
      hop: 'Til selskabet',
      venstre: [
        { titel: 'Havnens tapas', kilder: [{ kat: 'Tapasfad' }] },
        { titel: 'Reception og pindemad', kilder: [{ kat: 'Reception og pindemad' }] },
      ],
      hoejre: [
        { titel: 'Tilkøb ud af huset', kilder: [{ kat: 'Tilkøb ud af huset' }] },
        { titel: 'Glutenfri, laktosefri og vegansk', kilder: [{ kat: 'Tillæg: glutenfri, laktosefri og vegansk' }] },
      ],
    },
  ];

  /* ============================================================
     KORTETS FASTE TEKSTER PÅ ENGELSK  (2/10)
     ------------------------------------------------------------
     ⚠️ ÉN ORDBOG, IKKE ET `titelEn` VED HVER STRENG. Kapitlerne
        ovenfor har omkring fyrre faste tekster — overskrifter,
        slogans, boksenes mærkater. Et engelsk felt ved hver af
        dem ville betyde fyrre steder at glemme, og den dag en ny
        overskrift kom til, ville den stå på dansk midt i den
        engelske side uden at nogen opdagede det. Her er det ÉN
        liste, og det, der mangler, falder tilbage på dansk.

     ⚠️ TEKSTERNE ER LÆST AF DE GODKENDTE ENGELSKE KORT
        ("Mosede Havnecafe - Endelig/05 Menukort engelsk/"), ikke
        oversat her. Mikkel: *"Brug turistvenligt, naturligt sprog
        — ikke rå maskinoversættelse."*

     ⚠️ NØGLEN ER DEN DANSKE STRENG. Rettes en dansk overskrift
        uden at nøglen følger med, falder den tilbage på dansk —
        synligt, ikke tavst. Det er med vilje det mindst
        skadelige: en dansk overskrift på en engelsk side kan
        læses; en tom kan ikke.
     ============================================================ */
  var ORDBOG = {
    en: {
      // Kapitlernes hoveder
      'Morgenmad': 'Breakfast',
      '& frokost': '& lunch',
      'Fra grillen': 'From the grill',
      'Morgenmad fra tidligt og klassikerne fra pladen — alt sammen ved lugen.':
        'Breakfast and lunch – smørrebrød, håndmadder and classics all day.',
      'À la carte,': 'À la carte,',
      'burgere & pølser': 'burgers & hot dogs',
      'stegt på bestilling': 'cooked to order',
      'Smørrebrød': 'Smørrebrød',
      'Håndmadder': 'Håndmadder',
      'Friskbagt rugbrød, smurt når du bestiller. Glutenfrit brød, med eller uden smør — bare sig til.':
        'Freshly baked rye bread, buttered when you order. Gluten-free bread, with or without butter – just ask.',
      'Is & sødt': 'Ice cream & sweets',
      'Kugleis og cremet softice, sprøde bubblewaffles, churros og hjemmelavede pandekager — til en tur langs vandet.':
        'Scoops and creamy soft serve, crispy bubble waffles, churros and homemade pancakes — for a stroll by the water.',
      'Kaffe,': 'Coffee,',
      'koldt & knas': 'cold drinks & snacks',
      'stemplet, rystet og hældt op': 'freshly brewed, shaken and poured',
      'Øl, vin': 'Beer, wine',
      '& bar': '& bar',
      'fadøl fra hanen og bobler til fest': 'draught beer and bubbles to celebrate',
      'Mosede Havnecafe': 'Mosede Havnecafe',
      // Glasbåndets genveje (`hop`) — se noten i menukort.js
      'Morgenmad & frokost': 'Breakfast & lunch',
      'À la carte & burgere': 'À la carte & burgers',
      'Is & sødt': 'Ice cream & sweets',
      'Kaffe & koldt': 'Coffee & cold drinks',
      'Øl, vin & bar': 'Beer, wine & bar',
      // Afsnittenes overskrifter
      'Tilkøb til morgenmaden': 'Breakfast extras',
      'Fisk & klassikere': 'Fish & classics',
      'Ekstra': 'Extras',
      'Andre retter': 'Other dishes',
      'Sliders': 'Sliders',
      'Burgere & sandwiches': 'Burgers & sandwiches',
      'Pølser': 'Hot dogs & sausages',
      'Varianter': 'Toppings',
      'Vælg fyld': 'Choose a topping',
      'Is': 'Ice cream',
      'Softice': 'Soft serve',
      'Sødt': 'Sweets',
      'Kaffe': 'Coffee',
      'Varmt & ekstra': 'Hot drinks & extras',
      'Kage': 'Cake',
      'Kolde drikke': 'Cold drinks',
      'Øl': 'Beer',
      'Bar': 'Bar',
      'Slik & snacks': 'Sweets & snacks',
      'Vin, cava & champagne': 'Wine, cava & champagne',
      // Boksene
      'Til flokken': 'For the group',
      'Morgenbrød': 'Breakfast rolls / baked goods',
      'Morgenbrød – spørg ved bestilling.': 'Breakfast rolls / baked goods – ask for an order form.',
      'Spørg ved lugen': 'Ask at the counter',
      'Alle varianter': 'All toppings',
      'Gælder alle almindelige smørrebrød på listen.': 'Applies to all regular smørrebrød on the list.',
      'Gælder alle almindelige håndmadder på listen.': 'Applies to all regular håndmadder on the list.',
      'Hjemmelavet lun frikadelle': 'Frikadelle – homemade warm Danish meatball',
      'Rejemad': 'Prawn open sandwich',
      'Fås både på rugbrød og franskbrød.': 'Available on rye bread or white bread.',
      'Tartar': 'Steak tartare',
      'Sig til ved lugen': 'Just ask at the counter',
      'Glutenfrit brød': 'Gluten-free bread',
      'Med eller uden smør — bare sig til.': 'With or without butter — just ask.',
      'Hjemmelavet lun delle': 'Frikadelle – homemade warm Danish meatball',
      'Hjemmelavet flæskesvær': 'Homemade flæskesvær – pork crackling',
      'Glutenfri vaffel': 'Gluten-free cone',
      'Alle kugler og al softice kan fås i glutenfri vaffel — ':
        'All scoops and soft serve are available in a gluten-free cone — ',
      ' pr. vaffel.': ' per cone.',
      'samme pris som almindelig vaffel.': 'same price as a regular cone.',
      'Kaffe & kage': 'Coffee & cake',
      'Pausen': 'Take a break',
      'En kop kaffe og et stykke af dagens kage — eller en pandekage.':
        'A cup of coffee and a slice of today\u2019s cake — or a pancake.',
      // Til selskabet
      'Til selskabet': 'For your party',
      'Tapasfad, pindemad og tilkøb ud af huset — bestilles i forvejen.':
        'Tapas platters, canapés and takeaway extras — order in advance.',
      'Havnens tapas': 'Havnens tapas',
      'Reception og pindemad': 'Reception & canapés',
      'Tilkøb ud af huset': 'Takeaway extras',
      'Glutenfri, laktosefri og vegansk': 'Gluten-free, lactose-free and vegan',
    },
  };

  /* Den faste tekst på det valgte sprog. Mangler den, står dansk. */
  function tekst(s) {
    if (s === null || s === undefined) return s;
    var sp = (window.Butik && Butik.sprog) ? Butik.sprog() : 'da';
    var o = ORDBOG[sp];
    return (o && o[s]) || s;
  }

  window.MosedeMenukort = { KAPITLER: KAPITLER, ORDBOG: ORDBOG, tekst: tekst };
}());
