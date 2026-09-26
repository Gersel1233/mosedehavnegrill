/* ============================================================
   MENUKORTET SOM DE TRYKTE KORT  (26/9)
   ------------------------------------------------------------
   Mikkels ord med billederne af de trykte kort: *"de skal
   naturligvis matche 1:1 med de her"* — og ved uenighed: *"chefens
   rettelser"*. Derfor:

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
      titel: ['Burgere,', 'pølser & plade'],
      slogan: 'stegt på bestilling',
      hop: 'Burgere & pølser',
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
      under: 'Hel skive rugbrød',
      tekst: 'Hel skive hjemmebagt rugbrød med smør, smurt når du bestiller. Glutenfrit brød eller uden smør — bare sig til.',
      hop: 'Smørrebrød',
      hel: [
        { titel: 'Varianter', udenPris: true, kolonner: 2, kilder: [{ kat: 'Smørrebrød' }] },
        { boks: 'raekke', felter: [
          { over: 'Smørrebrød', titel: 'Alle varianter', pris: { ens: 'Smørrebrød' }, tekst: 'Hel skive hjemmebagt rugbrød med smør.' },
          { over: 'Egen pris', titel: 'Rejemad', pris: { vare: 'Rejemad' }, tekst: 'Med mayo og citron — hel skive.' },
          { over: 'Egen pris', titel: 'Tartar', pris: { vare: 'Tartarmad' }, tekst: 'Bestilles dagen før.' },
          { over: 'Sig til ved lugen', titel: 'Glutenfrit brød', pris: { vare: 'Glutenfrit brød (tillæg)', plus: true }, tekst: 'Med eller uden smør — bare sig til.' },
        ] },
      ],
    },
    {
      id: 'haandmadder',
      over: 'Mosede Havnecafe',
      titel: ['Håndmadder'],
      tekst: 'Hel skive hjemmebagt rugbrød med smør — den lille sultne udgave, smurt når du bestiller. Glutenfrit brød eller uden smør, bare sig til.',
      hop: 'Håndmadder',
      hel: [
        { titel: 'Varianter', udenPris: true, kolonner: 2, kilder: [{ kat: 'Håndmadder' }] },
        { boks: 'raekke', felter: [
          { over: 'Håndmad', titel: 'Alle varianter', pris: { ens: 'Håndmadder' }, tekst: 'Hel skive hjemmebagt rugbrød med smør.' },
          { over: 'Kun som smørrebrød', titel: 'Rejemad & tartar', pris: { vare: 'Rejemad' }, tekst: 'Rejemad og tartar fås kun som smørrebrød.' },
          { over: 'Sig til ved lugen', titel: 'Glutenfrit brød', pris: { vare: 'Glutenfrit brød (tillæg)', plus: true }, tekst: 'Uden smør? Bare sig til.' },
        ] },
      ],
    },
    {
      id: 'is',
      /* ⚠️ #afsnit-is ER FORSIDENS GENVEJ ("Se hele is-menukortet").
         Kapitlet bærer det id; flyttes isen, skal id'et med. */
      anker: 'afsnit-is',
      over: 'Mosede Havnecafe',
      titel: ['Is'],
      under: '& drikkevarer',
      tekst: 'Kugleis og softice fra lugen, bubblewaffles, churros og pandekager — og kaffen der hører til.',
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
        { boks: 'pausen', over: 'Kaffe & kage', titel: 'Pausen', pris: { vare: 'Kaffe og kage' },
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
