/* ET ANSIGT PR. KATEGORI — ét sted.

   Kunden bad om emojier og farver (24/8), og det er samtidig den
   eneste måde at give tyve kategorier hver sit ansigt uden at
   tegne tyve ikoner.

   ⚠️ LISTEN LÅ I js/skal/menukort.js, OG DEN SKAL IKKE LIGGE TO
   STEDER. Bordsiden skal have de samme tegn som menukortet — det
   er det samme sortiment set fra to skærme, og en gæst, der
   kigger på kortet og derefter bestiller, skal møde den samme
   burger. To lister ville skride fra hinanden lige så stille:
   ejeren opretter "Vegansk", nogen føjer et 🌱 til den ene fil,
   og så har de to sider hver sit ansigt på den samme kategori,
   uden at nogen kan se det i koden.

   Det er den samme grund, js/bestil-regler.js blev klippet ud.

   RÆKKEFØLGEN BETYDER NOGET: det FØRSTE mønster, der passer,
   vinder. "Burgere og sandwich" skal have en burger og ikke en
   sandwich, så burgeren står øverst. Ændrer nogen rækkefølgen,
   skifter tegnene — og det ses med det samme på siden.

   ⚠️ KOLONNEN emoji PÅ KATEGORIEN VINDER, hvis den findes. Den er
   der ikke i databasen endnu, men koden er skrevet, så ejeren kan
   overtage tegnet med ét felt i admin den dag, den kommer. Indtil
   da er listen her et forslag, ikke en påstand: et forkert emoji
   er en skæv tegning, ikke en forkert oplysning om maden. Derfor
   må der ALDRIG stå noget her, der siger noget om indholdet — et
   🌱 på en kategori, vi ikke ved er vegansk, er et løfte.
*/
(function () {
  'use strict';

  var EMOJI = [
    [/burger|slider/i, '🍔'],
    [/p(ø|oe)lse|hotdog/i, '🌭'],
    [/fyld|pålæg|paalaeg/i, '🥓'],
    [/smørrebrød|smoerrebroed|rugbrød|håndmad/i, '🍞'],
    [/tapas/i, '🧀'],
    [/pindemad|reception/i, '🍢'],
    [/platte/i, '🍱'],
    [/morgenmad|brunch/i, '🍳'],
    [/sandwich|toast|panini|pita/i, '🥪'],
    [/salat/i, '🥗'],
    [/fisk|reje|sild/i, '🐟'],
    [/pommes|fritur|nugget/i, '🍟'],
    [/softice/i, '🍦'],
    [/pandekage|vaffel|vafler|boblevaffel/i, '🧇'],
    [/kage|dessert|æblekage/i, '🍰'],
    [/kugleis|ishorn|\bis\b/i, '🍨'],
    [/kaffe|varme drikke|the\b|kakao/i, '☕'],
    [/øl|oel|fadøl/i, '🍺'],
    [/vin|cava|champagne|bobler/i, '🍷'],
    [/sodavand|juice|vand|drikke/i, '🥤'],
    [/slik|snack|chips|popcorn/i, '🍬'],
    [/tilkøb|tilkoeb|ekstra/i, '➕'],
    [/selskab|fest|arrangement/i, '🎉'],
    [/b(ø|oe)rn/i, '🧒'],
  ];

  // Kender vi ingenting, siger afdelingen det — og den er sat af
  // ejeren, så den er sand.
  var AFDELING = { mad: '🍽️', is: '🍦', drikke: '🥤' };

  window.MosedeEmoji = {
    /* k er kategori-rækken. Den kan også være et bart navn, når
       kalderen kun har det — dagens ret er ikke en kategori. */
    forKategori: function (k) {
      if (!k) return '🍽️';
      if (typeof k === 'string') k = { navn: k };
      if (k.emoji) return k.emoji;
      var navn = String(k.navn || '');
      for (var i = 0; i < EMOJI.length; i++) {
        if (EMOJI[i][0].test(navn)) return EMOJI[i][1];
      }
      return AFDELING[k.afdeling] || '🍽️';
    },

    // Afdelingen bestemmer FARVEN bag tegnet. Tre sande farver
    // slår enogtyve gættede.
    afdelingFor: function (k) {
      var a = k && k.afdeling;
      return a === 'is' || a === 'drikke' ? a : 'mad';
    },
  };
}());
