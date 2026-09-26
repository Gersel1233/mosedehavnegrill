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
      id: 'grillen',
      over: 'Mosede Havnecafe',
      titel: ['Menukort'],
      under: 'Fra grillen',
      tekst: 'Morgenmad fra tidligt, klassikerne fra pladen og burgere lavet på bestilling — alt sammen ved lugen.',
      hop: 'Grillen',
      venstre: [
        { titel: 'Morgenmad', kilder: [{ kat: 'Morgenmad' }] },
        { titel: 'Tilkøb til morgenmaden', samle: true, kilder: [{ kat: 'Tilkøb morgenmad' }] },
        { boks: 'flokken', over: 'Til flokken', titel: 'Morgenbrød',
          tekst: 'Rundstykker og morgenbrød til flokken — få en bestillingsliste.', bund: 'Spørg ved lugen' },
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
        /* Slukket hos ejeren i dag — men tænder han den i admin, står
           fyldet her ved smørrebrødet og ikke i "Mere fra lugen". */
        { titel: 'Vælg fyld', kilder: [{ kat: 'Vælg fyld til smørrebrødet' }] },
        { boks: 'raekke', felter: [
          { over: 'Varianter', titel: 'Alle varianter', pris: { ens: 'Smørrebrød' }, tekst: 'Gælder alle almindelige smørrebrød på listen.' },
          { over: 'Egen pris', titel: 'Rejemad', pris: { vare: 'Rejemad' }, tekst: 'Fås både på rugbrød og franskbrød.' },
          { over: 'Egen pris', titel: 'Tartar', pris: { vare: 'Tartarmad' }, tekst: 'Bestilles dagen før.' },
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
        { boks: 'raekke', felter: [
          { over: 'Varianter', titel: 'Alle varianter', pris: { ens: 'Håndmadder' }, tekst: 'Gælder alle almindelige håndmadder på listen.' },
          { over: 'Egen pris', titel: 'Hjemmelavet lun delle', pris: { vare: 'Lun delle eller steg' } },
          { over: 'Egen pris', titel: 'Hjemmelavet flæskesvær', pris: { vare: 'Hjemmelavet flæskesvær' } },
          { over: 'Ikke som håndmad', titel: 'Rejemad & tartar', tekst: 'Rejemad fås både på rugbrød og franskbrød. Tartar fås som smørrebrød.' },
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
        { titel: 'Varmt & ekstra', kilder: [
          { kat: '*', navne: ['1 iskugle i kaffen', 'Ekstra shot kaffe', 'Sirup', 'Te', 'Lumumba', 'Irish coffee', 'Irish coffee, stor'] },
        ] },
        { titel: 'Kage', kilder: [
          { kat: '*', navne: ['Kage & desserter', 'Gammeldags æblekage', 'Flødekager'] },
          { kat: 'Kaffe og varme drikke' },
        ] },
      ],
      hoejre: [
        { titel: 'Kolde drikke', kilder: [{ kat: 'Sodavand, juice og kakao' }] },
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
        { titel: 'Bar', kilder: [{ kat: '*', navne: ['Drinks', 'Cocktail', 'Snaps, sambuca og shots'] }] },
        { titel: 'Slik & snacks', kilder: [{ kat: 'Snacks og slik' }] },
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

  window.MosedeMenukort = { KAPITLER: KAPITLER };
}());
