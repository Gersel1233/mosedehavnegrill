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
  var DRIKKE = ['Sodavand', 'Juice', 'Iste', 'Kakao'];
  var F = {
    // ---- Retter og pladen ----
    'lun delle eller steg': ['Frikadelle', 'Steg'],
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
    'lumumba': ['Kold', 'Varm'],
    'sodavand, juice, iste eller kakao – lille': DRIKKE,
    'sodavand, juice, iste eller kakao – stor': DRIKKE,
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
