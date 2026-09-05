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
    [/burger|slider/i, 'burger'],
    [/p(ø|oe)lse|hotdog/i, 'hotdog'],
    [/fyld|pålæg|paalaeg/i, 'paalaeg'],
    [/smørrebrød|smoerrebroed|rugbrød|håndmad/i, 'broed'],
    [/tapas/i, 'tapas'],
    [/pindemad|reception/i, 'pindemad'],
    [/platte/i, 'platte'],
    [/morgenmad|brunch/i, 'morgenmad'],
    [/sandwich|toast|panini|pita/i, 'sandwich'],
    [/salat/i, 'salat'],
    [/fisk|reje|sild/i, 'fisk'],
    [/pommes|fritur|nugget/i, 'pommes'],
    [/softice/i, 'softice'],
    [/pandekage|vaffel|vafler|boblevaffel/i, 'vaffel'],
    [/kage|dessert|æblekage/i, 'kage'],
    [/kugleis|ishorn|\bis\b/i, 'kugleis'],
    /* ⚠️ SODAVANDEN SKAL STÅ FØR KAFFEN, og den er derfor delt i
       to. MÅLT mod ejerens rigtige kort: "Sodavand, juice og
       kakao" ramte /kakao/ og fik ☕ — det SAMME tegn som "Kaffe
       og varme drikke". To kategorier med samme ansigt er ingen
       forskel, og det var oven i købet det forkerte.

       Men den generelle halvdel kan ikke bare flyttes med op:
       "Kaffe og varme drikke" indeholder ordet "drikke", så en
       samlet regel foran kaffen ville give kaffen en sodavand.
       Derfor det snævre mønster først og det brede sidst. */
    [/sodavand|juice|smoothie/i, 'sodavand'],
    [/kaffe|varme drikke|the\b|kakao/i, 'kaffe'],
    [/øl|oel|fadøl/i, 'oel'],
    [/vin|cava|champagne|bobler/i, 'vin'],
    [/vand|drikke/i, 'sodavand'],
    [/slik|snack|chips|popcorn/i, 'slik'],
    [/tilkøb|tilkoeb|ekstra/i, 'plus'],
    [/selskab|fest|arrangement/i, 'fest'],
    [/b(ø|oe)rn/i, 'baad'],
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
    [/^ekstra|^tilk(ø|oe)b/i, 'plus'],
    [/tapas/i, 'tapas'],
    /* Hansens franske vaffel er en pølse i et brød — FØR vaflerne. */
    [/fransk vaffel/i, 'hotdog'],
    [/burger/i, 'burger'],
    [/hotdog|frankfurter|kradser|pistolp(ø|oe)lse|specialp(ø|oe)lse/i, 'hotdog'],
    [/ristet p(ø|oe)lse|p(ø|oe)lsebr(ø|oe)d|^p(ø|oe)lser$|d(ü|u)r(ü|u)m/i, 'hotdog'],
    [/nachos/i, 'nachos'],
    /* Ordene står i navnet — det er ikke en påstand om indholdet. */
    [/vegansk|vegetar/i, 'plante'],
    [/glutenfri/i, 'aks'],
    [/laktosefri/i, 'maelk'],
    /* Hovedordet vinder: en æggemad er æg, også når der er bacon på. */
    [/(æ|ae)gge(mad|salat)/i, 'aeg'],
    [/kartoffel/i, 'kartoffel'],
    [/reje/i, 'reje'],
    /* Rødspætten og torsken er Køge Bugts egne — målt på et skud
       5/9: "Stegt rødspætte" stod med en tallerken. */
    [/fisk|fish|sild|laks|makrel|stjerneskud|tun\b|sp(æ|ae)tte|torsk/i, 'fisk'],
    [/kylling|h(ø|oe)ns/i, 'kylling'],
    [/roastbeef|hakkeb(ø|oe)f|tartar|b(ø|oe)fsandwich|pariserb(ø|oe)f|oksek(ø|oe)d/i, 'boef'],
    [/fl(æ|ae)sk|bacon|skinke|rullep(ø|oe)lse|spegep(ø|oe)lse|leverpostej|p(å|aa)l(æ|ae)g/i, 'paalaeg'],
    [/frikadelle|delle|biksemad|kebab|k(ø|oe)d/i, 'koed'],
    [/morgenbr(ø|oe)d|rundstykke|wienerbr(ø|oe)d|croissant/i, 'rundstykke'],
    [/pandekage|vaffel|vafler|churros/i, 'vaffel'],
    [/kage|dessert/i, 'kage'],
    [/softice|isbar/i, 'softice'],
    [/kugle|ishorn|isbox|thermobox|sundae|b(ø|oe)tte/i, 'kugleis'],
    [/slush/i, 'slush'],
    [/frugt|(æ|ae)ble|jordb(æ|ae)r/i, 'aeble'],
    [/salat|r(å|aa)kost|gr(ø|oe)nt/i, 'salat'],
    [/tomat/i, 'tomat'],
    [/\bost\b|ostemad/i, 'ost'],
    [/pasta/i, 'pasta'],
    [/pommes|fritter|nugget|chips|sv(æ|ae)r|snack/i, 'pommes'],
    [/kaffe|espresso|americano|\blatte\b|cappuccino|cortado/i, 'kaffe'],
    [/macchiato|flat white|coffee|lumumba|chai/i, 'kaffe'],
    [/sodavand|cola|juice|capri|iste|smoothie|milkshake|red bull|rtd/i, 'sodavand'],
    [/m(æ|ae)lk|cocio/i, 'maelk'],
    [/kakao|cacao/i, 'kakao'],
    [/chokolade/i, 'chokolade'],
    [/\bte\b/i, 'te'],
    [/vand/i, 'vand'],
    [/(ø|oe)l\b|fad(ø|oe)l|flaske(ø|oe)l/i, 'oel'],
    [/vin|cava|champagne/i, 'vin'],
    [/snaps|shots|sambuca|drinks|cocktail|bitter/i, 'cocktail'],
    [/peanut/i, 'peanut'],
    [/slik|popcorn/i, 'slik'],
    [/morgen|brunch|english breakfast|omelet|spejl(æ|ae)g/i, 'morgenmad'],
    /* ⚠️ MELLEMRUM ELLER START FORAN ÆG. Uden det bliver
       "Rundstykke med pålæg" til 🥚 — målt. */
    [/(^|[\s(])(æ|ae)g\b/i, 'aeg'],
    [/br(ø|oe)d|toast|sandwich|pita/i, 'sandwich'],
    [/platte|\bfad\b/i, 'platte'],
    [/slider|pindemad/i, 'pindemad'],
    [/marmelade|nutella|sm(ø|oe)r\b|sirup|creme|vanilje/i, 'honning'],
    [/dip|dressing|bearnaise|sauce|remoulade|topping|guf/i, 'ske'],
  ];


  // Kender vi ingenting, siger afdelingen det — og den er sat af
  // ejeren, så den er sand.
  var AFDELING = { mad: 'tallerken', is: 'softice', drikke: 'sodavand' };

  /* ---- NØGLE → EMOJI  (5/9) ------------------------------
     Tabellerne ovenfor svarer med en NØGLE ("burger"), og
     js/ikoner.js tegner den. Emojiet er reserven — det, der står
     på siden, hvis ikonfilen ikke er indlæst, og det, forKategori/
     forVare stadig svarer med, så ingen gammel kalder knækker.

     ⚠️ HVER NØGLE HER SKAL FINDES I js/ikoner.js. En prøve holder
     de to lister op mod hinanden; en tastefejl her ville ellers
     give en tom plads i listen, og den ser ud som en fejl. */
  var EMOJI_AF = {
    burger: '🍔', hotdog: '🌭', paalaeg: '🥓', broed: '🍞', tapas: '🧀',
    pindemad: '🍢', platte: '🍱', morgenmad: '🍳', sandwich: '🥪',
    salat: '🥗', fisk: '🐟', pommes: '🍟', softice: '🍦', vaffel: '🧇',
    kage: '🍰', kugleis: '🍨', sodavand: '🥤', kaffe: '☕', oel: '🍺',
    vin: '🍷', slik: '🍬', plus: '➕', fest: '🎉', baad: '🧒',
    tallerken: '🍽️', nachos: '🌮', plante: '🌱', aks: '🌾', maelk: '🥛',
    aeg: '🥚', kartoffel: '🥔', reje: '🍤', kylling: '🍗', boef: '🥩',
    koed: '🍖', rundstykke: '🥐', slush: '🧊', aeble: '🍎', tomat: '🍅',
    ost: '🧀', pasta: '🍝', chokolade: '🍫', kakao: '🍫', te: '🍵',
    vand: '💧', cocktail: '🍸', peanut: '🥜', honning: '🍯', ske: '🥄',
    gryde: '🍲', bog: '📖', musik: '🎵', ur: '🕐', megafon: '📣',
    anker: '⚓', noegle: '🔑', pose: '🥡', bil: '🚗',
  };

  function noegleForKategori(k) {
    if (!k) return 'tallerken';
    if (typeof k === 'string') k = { navn: k };
    var navn = String(k.navn || '');
    for (var i = 0; i < EMOJI.length; i++) {
      if (EMOJI[i][0].test(navn)) return EMOJI[i][1];
    }
    return AFDELING[k.afdeling] || 'tallerken';
  }

  function noegleForVare(v, k) {
    if (!v) return noegleForKategori(k);
    if (typeof v === 'string') v = { navn: v };
    var navn = String(v.navn || '');
    for (var i = 0; i < VARE.length; i++) {
      if (VARE[i][0].test(navn)) return VARE[i][1];
    }
    return noegleForKategori(k);
  }

  /* Ansigtet som DOM-knude: ejerens eget emoji, hvis han har
     sat et; ellers havnens tegnede ikon; ellers emojiet fra
     listen, hvis js/ikoner.js ikke er med. Kalderen SÆTTER
     knuden ind — den bygger aldrig en streng af den. */
  function knude(noegle, ejerensEmoji) {
    if (ejerensEmoji) return document.createTextNode(ejerensEmoji);
    var I = window.MosedeIkoner;
    var svg = I && I.tegn ? I.tegn(noegle) : null;
    return svg || document.createTextNode(EMOJI_AF[noegle] || EMOJI_AF.tallerken);
  }

  window.MosedeEmoji = {
    /* k er kategori-rækken. Den kan også være et bart navn, når
       kalderen kun har det — dagens ret er ikke en kategori. */
    forKategori: function (k) {
      if (k && typeof k !== 'string' && k.emoji) return k.emoji;
      return EMOJI_AF[noegleForKategori(k)];
    },

    /* ⚠️ VAREN FØRST, DEREFTER KATEGORIEN. En ret uden et
       kendt ord arver kategoriens ansigt — det er ejerens eget,
       og en liste, hvor hver anden række mangler et tegn, ser
       mere i stykker ud end en, hvor nogle deler. */
    forVare: function (v, k) {
      if (v && typeof v !== 'string' && v.emoji) return v.emoji;
      return EMOJI_AF[noegleForVare(v, k)];
    },

    noegleForKategori: noegleForKategori,
    noegleForVare: noegleForVare,

    /* Det, siderne sætter ind. Ejerens eget emoji vinder stadig. */
    tegnKategori: function (k) {
      var eget = k && typeof k !== 'string' && k.emoji;
      return knude(noegleForKategori(k), eget);
    },
    tegnVare: function (v, k) {
      var eget = v && typeof v !== 'string' && v.emoji;
      return knude(noegleForVare(v, k), eget);
    },
    /* Til de faste pladser (dagens ret, nyhedernes slags). */
    tegn: function (noegle) { return knude(noegle, null); },

    // Afdelingen bestemmer FARVEN bag tegnet. Tre sande farver
    // slår enogtyve gættede.
    afdelingFor: function (k) {
      var a = k && k.afdeling;
      return a === 'is' || a === 'drikke' ? a : 'mad';
    },

    /* Til prøven, der holder nøglerne op mod js/ikoner.js. */
    ALLE_NOEGLER: Object.keys(EMOJI_AF),
  };
}());
