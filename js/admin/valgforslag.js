/* ============================================================
   FORSLAG TIL VALG PÅ EN VARE  (15/9)
   ------------------------------------------------------------
   Gennemgangen 15/9 talte ~30 af ejerens varer, hvor valget stod i
   navnet eller beskrivelsen: "Pitabrød — med kebab, kylling eller
   tun", "Lumumba — kold eller varm". Gæsten kunne ikke vælge, og
   køkkenet fik "2 × Pitabrød".

   ⚠️ DET ER FORSLAG, OG DE STÅR KUN I ADMIN — samme regel som
   beskrivelsesforslag.js. Et valg er noget, gæsten skal svare på,
   og listen er ejerens: han trykker "Brug forslaget", eller skriver
   sine egne under ⋯. Gæstesiden kender ikke filen.

   ⚠️ LISTERNE ER LÆST AF EJERENS EGNE ORD (produktionen, 15/9), ikke
   gættet. Hvor et "eller" er et TILLÆG med sin egen pris ("Nachos …
   kylling, kebab eller oksekød 10 kr. ekstra"), er der INTET forslag:
   tillægget er sin egen vare på kortet. Og "Chips eller svær, 2
   poser" står uden — om man må blande, ved kun ejeren.

   Nøglen er varens NAVN med små bogstaver. Har varen valg i
   forvejen, vises forslaget ikke.
   ============================================================ */
(function () {
  'use strict';
  window.Admin = window.Admin || {};
  var FYLD_SANDWICH = ['Æg', 'Pålæg', 'Hønsesalat', 'Æggesalat', 'Wienersalat',
    'Skinkesalat', 'Kebab', 'Kylling', 'Tun'];
  var BROED = ['Toastbrød', 'Rugbrød'];
  /* ⚠️ "Cacao" OG IKKE "Kakao" (30/9). Varerne hedder
     "…iste eller cacao" efter kortenes-tekster-30-9.sql, og et
     valg, der staver anderledes end varen selv, ligner en anden
     drik. Kategorien hedder stadig "Sodavand, juice og kakao" —
     begge stavemåder er ejerens, og varens egen vinder. */
  var DRIKKE = ['Sodavand', 'Juice', 'Iste', 'Cacao'];
  var F = {
    // ---- Retter og pladen ----
    'lun delle eller steg': ['Frikadelle', 'Steg'],
    /* ⚠️ DE TRE HER ER LÆST AF VARENS EGET NAVN (30/9) og ikke
       gættet: står der "steg eller leverpostej", er valgene Steg
       og Leverpostej, i navnets egen rækkefølge. Ejeren bad om
       netop dem: *"du må også oprette forslag til de varer, hvor
       valgene tydeligt fremgår af varenavnet."*

       ⚠️ "Ekstra kød eller tilbehør" STÅR IKKE HER. Hvad man kan
       vælge imellem, står ikke i navnet — ejerens ord: *"den må
       du ikke gætte på endnu."*

       ⚠️ Og "tomat- eller agurkemad" kan ikke bestilles i dag:
       kategorien "Vælg fyld til smørrebrødet" er slukket.
       Forslaget står her, så det er klar, hvis den tændes. */
    'lun delle, steg eller leverpostej med brød og surt':
      ['Frikadelle', 'Steg', 'Leverpostej'],
    // 7/10: kort 1 kalder den det korte navn (chefens-rettelser-7-10.sql)
    'lun delle, steg eller leverpostej': ['Frikadelle', 'Steg', 'Leverpostej'],
    'flaske eller dåse': ['Flaske', 'Dåse'],
    'tomat- eller agurkemad med mayo og løg': ['Tomat', 'Agurk'],
    'lun delle eller steg med leverpostej': ['Frikadelle', 'Steg'],
    'pitabrød': ['Kebab', 'Kylling', 'Tun'],
    'sandwich, lille': FYLD_SANDWICH,
    'sandwich, stor': FYLD_SANDWICH,
    'mix med pommes og salat': ['Kebab', 'Kylling', 'Tun', 'Frikadelle'],
    'ekstra æg, tun, kebab, kylling eller pasta': ['Æg', 'Tun', 'Kebab', 'Kylling', 'Pasta'],
    'ekstra kylling, kebab eller oksekød': ['Kylling', 'Kebab', 'Oksekød'],
    'dip eller dressing': ['Dip', 'Dressing'],
    'frankfurter eller specialpølse': ['Frankfurter', 'Specialpølse'],
    // ---- Morgenmad ----
    'morgenkomplet': ['Kaffe', 'Juice'],
    'havnens all in one': BROED,
    'brunchtallerken': ['Spejlæg', 'Røræg'],
    // ---- Isen ----
    'sauce, topping eller guf': ['Sauce', 'Topping', 'Guf'],
    'boblevaffel med 2 kugler eller softice': ['2 kugler', 'Softice'],
    // ---- Drikke og snacks ----
    /* ⚠️ BEGGE NAVNE, OG DET ER IKKE DOBBELTARBEJDE (30/9).
       kortenes-tekster-30-9.sql døber varen om til kortenes eget
       navn. Nøglen her ER varenavnet med små bogstaver, så i det
       sekund filen køres, ville forslaget holde op med at findes —
       tavst. Ejeren ser bare, at knappen ikke er der mere.

       Det gamle navn bliver stående: filen kan køres igen, og en
       browser kan være dage gammel. Samme greb som de to
       sodavandslinjer nedenfor, der har både kakao og cacao.
       tests/menukort-admin.spec.js læser omdøbningerne UD AF
       SQL-filen og fælder den næste, der bliver glemt. */
    'lumumba': ['Varm', 'Kold'],
    'lumumba, varm eller kold': ['Varm', 'Kold'],
    /* 7/10: chefens-rettelser-7-10.sql deler den i lille 3 cl og stor
       6 cl. Varm eller kold er stadig valget. */
    'lumumba, lille 3 cl': ['Varm', 'Kold'],
    'lumumba, stor 6 cl': ['Varm', 'Kold'],
    'sodavand, juice, iste eller kakao – lille': DRIKKE,
    'sodavand, juice, iste eller kakao – stor': DRIKKE,
    'sodavand, juice, iste eller cacao – lille': DRIKKE,
    'sodavand, juice, iste eller cacao – stor': DRIKKE,
    'smoothie eller milkshake': ['Smoothie', 'Milkshake'],
    'dåse eller flaske sodavand': ['Dåse', 'Flaske'],
    'juice eller capri-sun': ['Juice', 'Capri-Sun'],
    'brik juice eller cacao': ['Juice', 'Cacao'],
    'chips eller svær, 1 pose': ['Chips', 'Svær'],
    // ---- Pindemad (catering) ----
    'pindemad med skinke og ost': BROED,
    'pindemad med hønsesalat': BROED,
    'pindemad med æggesalat': BROED,
    'pindemad med wienersalat': BROED,
    'pindemad med frikadelle': BROED,
    'pindemad med flæskesteg': BROED,
    'pindemad med leverpostej': BROED,
    'pindemad med æg': BROED,
    'pindemad med æg og rejer': BROED,
    'pindemad med roastbeef': BROED,
    'pindemad med spegepølse': BROED,
    'pindemad med laks': BROED,
  };
  Admin.valgForslag = function (navn) {
    var l = F[String(navn || '').trim().toLowerCase()];
    return l ? l.slice() : null;
  };
})();
