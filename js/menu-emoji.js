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
    /* ⚠️ SODAVANDEN SKAL STÅ FØR KAFFEN, og den er derfor delt i
       to. MÅLT mod ejerens rigtige kort: "Sodavand, juice og
       kakao" ramte /kakao/ og fik ☕ — det SAMME tegn som "Kaffe
       og varme drikke". To kategorier med samme ansigt er ingen
       forskel, og det var oven i købet det forkerte.

       Men den generelle halvdel kan ikke bare flyttes med op:
       "Kaffe og varme drikke" indeholder ordet "drikke", så en
       samlet regel foran kaffen ville give kaffen en sodavand.
       Derfor det snævre mønster først og det brede sidst. */
    [/sodavand|juice|smoothie/i, '🥤'],
    [/kaffe|varme drikke|the\b|kakao/i, '☕'],
    [/øl|oel|fadøl/i, '🍺'],
    [/vin|cava|champagne|bobler/i, '🍷'],
    [/vand|drikke/i, '🥤'],
    [/slik|snack|chips|popcorn/i, '🍬'],
    [/tilkøb|tilkoeb|ekstra/i, '➕'],
    [/selskab|fest|arrangement/i, '🎉'],
    [/b(ø|oe)rn/i, '🧒'],
  ];


  /* ---- ET ANSIGT PR. RET  (1/9) ----------------------------
     Kundens ord: *"prop emojis derinde, så det ser lidt
     attraktivt ud at vælge nogle retter i stedet for det der."*

     ⚠️ SAMME LOV SOM KATEGORIERNE: tegnet må ALDRIG sige noget
     om maden, som navnet ikke selv siger. Hvert mønster herunder
     rammer et ord, der STÅR i varens navn — "Hvide sild" er
     fisk, fordi der står sild. Et 🌱 på noget, vi ikke ved er
     vegansk, ville være et løfte; derfor fyrer 🌱 kun på ordene
     "vegansk" og "vegetar".

     ⚠️ RÆKKEFØLGEN ER REGLEN, og den er MÅLT mod ejerens 264
     varer, ikke gættet:
       · æg FØR salat, ellers bliver "Æggesalat" til 🥗
       · kage FØR frugt, ellers bliver "Gammeldags æblekage" 🍎
       · flæsk FØR frugt, ellers bliver "Æbleflæsk" til 🍎
       · sodavand FØR kakao, ellers får "Sodavand, juice, iste
         eller kakao" en kop kakao
       · og der er INTET bart /pølse/: "Rullepølse" og
         "Spegepølse" er smørrebrød og ikke en hotdog

     Kender vi ikke retten, arver den kategoriens ansigt. Det er
     bedre end en ragget liste, hvor hver anden række har et tegn
     — og kategorien er ejerens egen. */
  var VARE = [
    /* ⚠️ RÆKKEFØLGEN ER MÅLT MOD EJERENS 264 VARER, ikke gættet.
       Fem fejl faldt ud af den måling, og de er værd at kende:

       · "Platte til 1 person" fik ☕, fordi PLATTE INDEHOLDER
         "LATTE". Derfor `\blatte\b` og ikke `latte`.
       · "Rundstykke med pålæg" fik 🥚, fordi PÅLÆG INDEHOLDER
         "ÆG". Æg kræver mellemrum eller start foran.
       · "Hansen fransk vaffel" er en PØLSE og fik 🧇. Den står
         nu før vaflerne.
       · "Isvand" fik 🍨, fordi jeg selv havde skrevet den ind
         blandt isen. Vand er vand.
       · "Råkost" ville få 🧀 af et bart /ost/ — derfor `\bost\b`.

       En ret uden et kendt ord arver kategoriens ansigt. */
    [/^ekstra|^tilk(ø|oe)b/i, '➕'],
    [/tapas/i, '🧀'],
    /* Hansens franske vaffel er en pølse i et brød — FØR vaflerne. */
    [/fransk vaffel/i, '🌭'],
    [/burger/i, '🍔'],
    [/hotdog|frankfurter|kradser|pistolp(ø|oe)lse|specialp(ø|oe)lse/i, '🌭'],
    [/ristet p(ø|oe)lse|p(ø|oe)lsebr(ø|oe)d|^p(ø|oe)lser$|d(ü|u)r(ü|u)m/i, '🌭'],
    [/nachos/i, '🌮'],
    /* Ordene står i navnet — det er ikke en påstand om indholdet. */
    [/vegansk|vegetar/i, '🌱'],
    [/glutenfri/i, '🌾'],
    [/laktosefri/i, '🥛'],
    /* Hovedordet vinder: en æggemad er æg, også når der er bacon på. */
    [/(æ|ae)gge(mad|salat)/i, '🥚'],
    [/kartoffel/i, '🥔'],
    [/reje/i, '🍤'],
    [/fisk|fish|sild|laks|makrel|stjerneskud|tun\b/i, '🐟'],
    [/kylling|h(ø|oe)ns/i, '🍗'],
    [/roastbeef|hakkeb(ø|oe)f|tartar|b(ø|oe)fsandwich|pariserb(ø|oe)f|oksek(ø|oe)d/i, '🥩'],
    [/fl(æ|ae)sk|bacon|skinke|rullep(ø|oe)lse|spegep(ø|oe)lse|leverpostej|p(å|aa)l(æ|ae)g/i, '🥓'],
    [/frikadelle|delle|biksemad|kebab|k(ø|oe)d/i, '🍖'],
    [/morgenbr(ø|oe)d|rundstykke|wienerbr(ø|oe)d|croissant/i, '🥐'],
    [/pandekage|vaffel|vafler|churros/i, '🧇'],
    [/kage|dessert/i, '🍰'],
    [/softice|isbar/i, '🍦'],
    [/kugle|ishorn|isbox|thermobox|sundae|b(ø|oe)tte/i, '🍨'],
    [/slush/i, '🧊'],
    [/frugt|(æ|ae)ble|jordb(æ|ae)r/i, '🍎'],
    [/salat|r(å|aa)kost|gr(ø|oe)nt/i, '🥗'],
    [/tomat/i, '🍅'],
    [/\bost\b|ostemad/i, '🧀'],
    [/pasta/i, '🍝'],
    [/pommes|fritter|nugget|chips|sv(æ|ae)r|snack/i, '🍟'],
    [/kaffe|espresso|americano|\blatte\b|cappuccino|cortado/i, '☕'],
    [/macchiato|flat white|coffee|lumumba|chai/i, '☕'],
    [/sodavand|cola|juice|capri|iste|smoothie|milkshake|red bull|rtd/i, '🥤'],
    [/m(æ|ae)lk|cocio/i, '🥛'],
    [/kakao|cacao|chokolade/i, '🍫'],
    [/\bte\b/i, '🍵'],
    [/vand/i, '💧'],
    [/(ø|oe)l\b|fad(ø|oe)l|flaske(ø|oe)l/i, '🍺'],
    [/vin|cava|champagne/i, '🍷'],
    [/snaps|shots|sambuca|drinks|cocktail|bitter/i, '🍸'],
    [/peanut/i, '🥜'],
    [/slik|popcorn/i, '🍬'],
    [/morgen|brunch|english breakfast|omelet|spejl(æ|ae)g/i, '🍳'],
    /* ⚠️ MELLEMRUM ELLER START FORAN ÆG. Uden det bliver
       "Rundstykke med pålæg" til 🥚 — målt. */
    [/(^|[\s(])(æ|ae)g\b/i, '🥚'],
    [/br(ø|oe)d|toast|sandwich|pita/i, '🥪'],
    [/platte|\bfad\b/i, '🍱'],
    [/slider|pindemad/i, '🍢'],
    [/marmelade|nutella|sm(ø|oe)r\b|sirup|creme|vanilje/i, '🍯'],
    [/dip|dressing|bearnaise|sauce|remoulade|topping|guf/i, '🥄'],
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

    /* ⚠️ VAREN FØRST, DEREFTER KATEGORIEN. En ret uden et
       kendt ord arver kategoriens ansigt — det er ejerens eget,
       og en liste, hvor hver anden række mangler et tegn, ser
       mere i stykker ud end en, hvor nogle deler. */
    forVare: function (v, k) {
      if (!v) return this.forKategori(k);
      if (typeof v === 'string') v = { navn: v };
      if (v.emoji) return v.emoji;
      var navn = String(v.navn || '');
      for (var i = 0; i < VARE.length; i++) {
        if (VARE[i][0].test(navn)) return VARE[i][1];
      }
      return this.forKategori(k);
    },

    // Afdelingen bestemmer FARVEN bag tegnet. Tre sande farver
    // slår enogtyve gættede.
    afdelingFor: function (k) {
      var a = k && k.afdeling;
      return a === 'is' || a === 'drikke' ? a : 'mad';
    },
  };
}());
