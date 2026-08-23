/* ============================================================
   QR-KODER, TEGNET I BROWSEREN
   ------------------------------------------------------------
   Der lå i forvejen en QR-generator i repoet: vaerktoej/lav-qr.js
   kører npm-pakken "qrcode" på en maskine og skriver to SVG-filer,
   som print/bordskilte.html har indlejret. Det er fint til to faste
   koder — bestil/ og menu.html — som aldrig ændrer sig.

   Bordene er ikke faste. Hvert bord har sin EGEN kode, fordi
   koden bærer bordnummeret: scanner gæsten ved bord 7, skal
   maden til bord 7, og ingen skal bede hende vælge nummeret
   selv (så vælger nogen forkert, og maden går til det forkerte
   selskab). Så snart bordene kan oprettes og omdøbes i admin,
   kan koderne ikke laves på forhånd: en ommøblering på trædækket
   ville være en kodeændring hos os. Det er præcis det, en QR-kode
   ikke må være.

   Derfor tegnes koderne her, af siden selv, når skiltene printes.
   Ingen npm i browseren — det er husets regel, og den gælder også
   her: hele koderen står i filen.

   HVORDAN VI VED, AT DEN ER RIGTIG
   ------------------------------------------------------------
   En QR-kode, der er en smule forkert, ser fuldstændig rigtig ud.
   Man opdager det først, når en telefon står og gnider mod et
   skilt på en blæsende havn og ikke vil. Derfor måles den mod en
   kilde UDEFRA: tests/qr.spec.js sammenligner tern for tern med
   facitlisten i tests/facit/qr-facit.json, som er skrevet af
   npm-pakken "qrcode" (den, vaerktoej/lav-qr.js allerede bruger).
   Er ét tern forkert, falder prøven.

   HVAD DEN KAN, OG HVAD DEN IKKE KAN
   ------------------------------------------------------------
   · Byte-tilstand. En URL er ASCII, og byte-tilstand tager alt.
     Tal- og bogstavtilstand ville give en mindre kode og er
     mere kode at vedligeholde for en gevinst, ingen kan se på
     et skilt.
   · Version 1-12, altså op til 65×65 tern. Det rækker til en
     adresse på ca. 100 tegn med den hårdeste fejlkorrektion.
     Bliver adressen længere, kaster den en fejl med tallene i —
     den GÆTTER ikke og tegner ikke en kode, der ikke kan læses.
   · Fejlkorrektion L, M, Q og H. Skiltene bruger H: et bordskilt
     får fedtfingre og kaffepletter, og H tåler, at omkring en
     tredjedel af koden er dækket.
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     TALLENE FRA STANDARDEN (ISO/IEC 18004)
     ----------------------------------------------------------
     De kan ikke regnes ud — de ER standarden. Rækkefølgen er
     L, M, Q, H, og hvert tal-par er [fejlrettende tegn pr. blok,
     antal blokke]. Er ét tal forkert, kan koden ikke læses, og
     det er dét, facitlisten i prøven fanger.
     ---------------------------------------------------------- */
  var I_ALT = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466];

  var BLOKKE = {
    L: [0, [7,1], [10,1], [15,1], [20,1], [26,1], [18,2], [20,2], [24,2], [30,2], [18,4], [20,4], [24,4]],
    M: [0, [10,1], [16,1], [26,1], [18,2], [24,2], [16,4], [18,4], [22,4], [22,5], [26,5], [30,5], [22,8]],
    Q: [0, [13,1], [22,1], [18,2], [26,2], [18,4], [24,4], [18,6], [22,6], [20,8], [24,8], [28,8], [26,10]],
    H: [0, [17,1], [28,1], [22,2], [16,4], [22,4], [28,4], [26,5], [26,6], [24,8], [28,8], [24,11], [28,11]],
  };

  // Justeringsmønstrenes midterlinjer. Version 1 har ingen.
  var JUSTER = [null, [], [6,18], [6,22], [6,26], [6,30], [6,34],
    [6,22,38], [6,24,42], [6,26,46], [6,28,50], [6,30,54], [6,32,58]];

  // Bitmønsteret for niveauet i formatoplysningerne. Rækkefølgen
  // er standardens egen og IKKE L<M<Q<H — den fælde er nem at gå i.
  var NIVEAU_BIT = { L: 1, M: 0, Q: 3, H: 2 };

  /* ----------------------------------------------------------
     GALOIS-LEGEMET GF(256)
     ----------------------------------------------------------
     Reed-Solomon regner i et talrum med 256 tal, hvor gange og
     dividere er slå-op i to tabeller. 0x11d er standardens eget
     polynomium; et andet ville give andre tal, der ser lige så
     rigtige ud.
     ---------------------------------------------------------- */
  var EKS = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EKS[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    // Fordoblet, så EKS[a+b] aldrig løber ud over kanten.
    for (var j = 255; j < 512; j++) EKS[j] = EKS[j - 255];
  })();

  function gang(a, b) {
    if (a === 0 || b === 0) return 0;
    return EKS[LOG[a] + LOG[b]];
  }

  // Generatorpolynomiet: (x - α⁰)(x - α¹)…(x - αⁿ⁻¹).
  function generator(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var ny = [];
      for (var k = 0; k <= g.length; k++) ny[k] = 0;
      for (var j = 0; j < g.length; j++) {
        ny[j] ^= g[j];
        ny[j + 1] ^= gang(g[j], EKS[i]);
      }
      g = ny;
    }
    return g;
  }

  // Resten efter division. Det er de fejlrettende tegn.
  function fejlrettende(data, antal) {
    var g = generator(antal);
    var rest = data.slice();
    for (var f = 0; f < antal; f++) rest.push(0);
    for (var i = 0; i < data.length; i++) {
      var faktor = rest[i];
      if (faktor === 0) continue;
      for (var j = 0; j < g.length; j++) rest[i + j] ^= gang(g[j], faktor);
    }
    return rest.slice(data.length);
  }

  /* ----------------------------------------------------------
     TEKSTEN IND
     ---------------------------------------------------------- */
  function tilBytes(tekst) {
    // Adressen er ASCII, men et bordnavn kan være "Terrassen · 2".
    // UTF-8 tager begge dele, og det er dét, byte-tilstand er.
    var ud = [];
    var s = unescape(encodeURIComponent(String(tekst)));
    for (var i = 0; i < s.length; i++) ud.push(s.charCodeAt(i) & 0xff);
    return ud;
  }

  function dataTegn(version, niveau) {
    var b = BLOKKE[niveau][version];
    return I_ALT[version] - b[0] * b[1];
  }

  function vaelgVersion(bytes, niveau) {
    for (var v = 1; v <= 12; v++) {
      // 4 bit tilstand + 8 eller 16 bit længde, resten er tekst.
      var laengdeBit = v < 10 ? 8 : 16;
      var plads = dataTegn(v, niveau) * 8 - 4 - laengdeBit;
      if (bytes.length * 8 <= plads) return v;
    }
    throw new Error('QR: teksten er for lang (' + bytes.length
      + ' byte). Ved fejlkorrektion ' + niveau + ' er grænsen '
      + Math.floor((dataTegn(12, niveau) * 8 - 4 - 16) / 8) + ' byte.');
  }

  function byggeDatategn(bytes, version, niveau) {
    var bit = [];
    function skriv(vaerdi, antal) {
      for (var i = antal - 1; i >= 0; i--) bit.push((vaerdi >> i) & 1);
    }

    skriv(4, 4);                                   // byte-tilstand
    skriv(bytes.length, version < 10 ? 8 : 16);
    for (var i = 0; i < bytes.length; i++) skriv(bytes[i], 8);

    var maal = dataTegn(version, niveau) * 8;
    // Afslutningen er højst fire nuller — og færre, hvis der ikke
    // er fire tilbage.
    for (var t = 0; t < 4 && bit.length < maal; t++) bit.push(0);
    while (bit.length % 8 !== 0) bit.push(0);

    var tegn = [];
    for (var b = 0; b < bit.length; b += 8) {
      var v = 0;
      for (var k = 0; k < 8; k++) v = (v << 1) | bit[b + k];
      tegn.push(v);
    }
    // Fyldtegnene skifter mellem de to, standarden nævner.
    var fyld = [0xec, 0x11];
    var n = 0;
    while (tegn.length < maal / 8) tegn.push(fyld[n++ % 2]);
    return tegn;
  }

  /* Blokkene flettes: første tegn fra hver blok, så andet tegn
     fra hver blok. Det er dét, der gør, at en kaffeplet ét sted
     ikke ødelægger én blok helt, men rammer lidt af dem alle. */
  function fletTegn(datategn, version, niveau) {
    var b = BLOKKE[niveau][version];
    var ecPrBlok = b[0];
    var antalBlokke = b[1];

    var iAlt = datategn.length;
    var korte = Math.floor(iAlt / antalBlokke);
    var antalKorte = antalBlokke - (iAlt % antalBlokke);

    var data = [];
    var ec = [];
    var plads = 0;
    for (var i = 0; i < antalBlokke; i++) {
      var laengde = korte + (i < antalKorte ? 0 : 1);
      var blok = datategn.slice(plads, plads + laengde);
      plads += laengde;
      data.push(blok);
      ec.push(fejlrettende(blok, ecPrBlok));
    }

    var ud = [];
    var maks = korte + 1;
    for (var k = 0; k < maks; k++) {
      for (var j = 0; j < antalBlokke; j++) {
        if (k < data[j].length) ud.push(data[j][k]);
      }
    }
    for (var m = 0; m < ecPrBlok; m++) {
      for (var n = 0; n < antalBlokke; n++) ud.push(ec[n][m]);
    }
    return ud;
  }

  /* ----------------------------------------------------------
     TERNENE PÅ PLADS
     ---------------------------------------------------------- */
  function tomtNet(størrelse) {
    var net = [];
    for (var y = 0; y < størrelse; y++) {
      net.push([]);
      for (var x = 0; x < størrelse; x++) net[y].push(null);   // null = ledig
    }
    return net;
  }

  function saetFinder(net, x0, y0) {
    for (var y = -1; y <= 7; y++) {
      for (var x = -1; x <= 7; x++) {
        var px = x0 + x;
        var py = y0 + y;
        if (px < 0 || py < 0 || px >= net.length || py >= net.length) continue;
        var kant = (x >= 0 && x <= 6 && (y === 0 || y === 6))
                || (y >= 0 && y <= 6 && (x === 0 || x === 6));
        var midt = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        net[py][px] = (kant || midt) ? 1 : 0;
      }
    }
  }

  function saetJustering(net, version) {
    var linjer = JUSTER[version];
    for (var a = 0; a < linjer.length; a++) {
      for (var b = 0; b < linjer.length; b++) {
        var cx = linjer[a];
        var cy = linjer[b];
        // Hjørnerne er allerede taget af finder-mønstrene.
        if (net[cy][cx] !== null) continue;
        for (var y = -2; y <= 2; y++) {
          for (var x = -2; x <= 2; x++) {
            var yderst = Math.max(Math.abs(x), Math.abs(y));
            net[cy + y][cx + x] = (yderst === 1) ? 0 : 1;
          }
        }
      }
    }
  }

  function saetTiming(net) {
    var s = net.length;
    for (var i = 8; i < s - 8; i++) {
      var vaerdi = (i % 2 === 0) ? 1 : 0;
      if (net[6][i] === null) net[6][i] = vaerdi;
      if (net[i][6] === null) net[i][6] = vaerdi;
    }
  }

  // Pladserne til formatoplysningerne holdes fri, mens dataene
  // lægges — de skrives til sidst, når masken er valgt.
  function formatPladser(s) {
    var p = [];
    for (var i = 0; i <= 5; i++) p.push([8, i], [i, 8]);
    p.push([8, 7], [8, 8], [7, 8]);
    for (var j = 0; j <= 7; j++) p.push([s - 1 - j, 8]);
    /* KUN syv nedad, ikke otte. Det ottende tern (s-8, 8) er det
       ene, der ALTID er mørkt — reserverede vi det som en
       formatplads, blev det sat til 0 og aldrig skrevet tilbage,
       og koden kunne ikke læses. Fanget af facitlisten. */
    for (var k = 0; k <= 6; k++) p.push([8, s - 1 - k]);
    return p;
  }

  function bch(tal, generator, bit) {
    var v = tal << (bit - 1);
    var gLaengde = 0;
    for (var g = generator; g; g >>= 1) gLaengde++;
    while (true) {
      var vLaengde = 0;
      for (var t = v; t; t >>= 1) vLaengde++;
      if (vLaengde < gLaengde) break;
      v ^= generator << (vLaengde - gLaengde);
    }
    return v;
  }

  function formatBit(niveau, maske) {
    var tal = (NIVEAU_BIT[niveau] << 3) | maske;
    var kode = (tal << 10) | bch(tal, 0x537, 11);
    return kode ^ 0x5412;      // standardens maske på formatet selv
  }

  function versionBit(version) {
    return (version << 12) | bch(version, 0x1f25, 13);
  }

  var MASKER = [
    function (x, y) { return (x + y) % 2 === 0; },
    function (x, y) { return y % 2 === 0; },
    function (x, y) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; },
    function (x, y) { return ((x * y) % 2) + ((x * y) % 3) === 0; },
    function (x, y) { return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; },
    function (x, y) { return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; },
  ];

  /* Standardens fire strafpoint. Den maske, der giver færrest,
     vinder — den er den, der er nemmest for en telefon at læse,
     fordi den har færrest lange striber og færrest falske
     finder-mønstre i sig. */
  function straf(net) {
    var s = net.length;
    var i, j, k;
    var point = 0;

    // 1) Fem eller flere ens i træk, vandret og lodret
    for (i = 0; i < s; i++) {
      for (var retning = 0; retning < 2; retning++) {
        var forrige = -1;
        var antal = 0;
        for (j = 0; j < s; j++) {
          var v = retning === 0 ? net[i][j] : net[j][i];
          if (v === forrige) {
            antal++;
            if (antal === 5) point += 3;
            else if (antal > 5) point += 1;
          } else {
            forrige = v;
            antal = 1;
          }
        }
      }
    }

    // 2) Hver 2×2-firkant i én farve
    for (i = 0; i < s - 1; i++) {
      for (j = 0; j < s - 1; j++) {
        var a = net[i][j];
        if (a === net[i][j + 1] && a === net[i + 1][j] && a === net[i + 1][j + 1]) {
          point += 3;
        }
      }
    }

    // 3) Mønsteret 1:1:3:1:1 med fire hvide ved siden — det, en
    //    telefon tager for et finder-mønster
    var FALSK = [1,0,1,1,1,0,1,0,0,0,0];
    var FALSK2 = [0,0,0,0,1,0,1,1,1,0,1];
    for (i = 0; i < s; i++) {
      for (j = 0; j <= s - 11; j++) {
        var vandret = true, lodret = true, vandret2 = true, lodret2 = true;
        for (k = 0; k < 11; k++) {
          if (net[i][j + k] !== FALSK[k]) vandret = false;
          if (net[j + k][i] !== FALSK[k]) lodret = false;
          if (net[i][j + k] !== FALSK2[k]) vandret2 = false;
          if (net[j + k][i] !== FALSK2[k]) lodret2 = false;
        }
        if (vandret) point += 40;
        if (lodret) point += 40;
        if (vandret2) point += 40;
        if (lodret2) point += 40;
      }
    }

    /* 4) Skævheden mellem sort og hvidt, i trin af 5 procent.

       Formlen er npm-pakkens (ceil), ikke den gængse beskrivelse
       (floor). De er ens, når andelen ligger UNDER 50 %, og
       forskellige lige over — og en enkelt gang i en prøve gav
       det os maske 4, hvor facitlisten valgte maske 0.

       Begge koder kan læses: masken er en optimering, ikke en
       rigtighed, og formatbittene fortæller alligevel telefonen,
       hvilken maske der er brugt. Men vi følger facitlisten, for
       det er dét, der gør prøven skarp: to koder, der skal være
       tern for tern ens, siger noget. To, der "må gerne ligne
       hinanden", siger ingenting. */
    var moerke = 0;
    for (i = 0; i < s; i++) for (j = 0; j < s; j++) if (net[i][j]) moerke++;
    point += Math.abs(Math.ceil((moerke * 100 / (s * s)) / 5) - 10) * 10;

    return point;
  }

  /* fastMaske er KUN til prøven: den lader tests/qr.spec.js
     sammenligne den samme maske som facitlisten, så en forskel
     peger på ét sted i stedet for at forplante sig gennem
     maskevalget. Siden selv sender aldrig andet end undefined. */
  function tegnNet(tekst, niveau, fastMaske) {
    niveau = niveau || 'H';
    if (!BLOKKE[niveau]) throw new Error('QR: ukendt fejlkorrektion ' + niveau);

    var bytes = tilBytes(tekst);
    var version = vaelgVersion(bytes, niveau);
    var tegn = fletTegn(byggeDatategn(bytes, version, niveau), version, niveau);
    var s = 17 + 4 * version;

    var net = tomtNet(s);
    saetFinder(net, 0, 0);
    saetFinder(net, s - 7, 0);
    saetFinder(net, 0, s - 7);
    saetJustering(net, version);
    saetTiming(net);

    var pladser = formatPladser(s);
    var p;
    for (p = 0; p < pladser.length; p++) {
      net[pladser[p][1]][pladser[p][0]] = 0;        // holdes fri, skrives til sidst
    }
    net[s - 8][8] = 1;                              // det ene tern, der altid er mørkt
    if (version >= 7) {
      for (var v = 0; v < 18; v++) {
        var r = Math.floor(v / 3);
        var c = s - 11 + (v % 3);
        net[r][c] = 0;
        net[c][r] = 0;
      }
    }

    /* Dataene i sik-sak op og ned, to søjler ad gangen, fra
       nederste højre hjørne. Søjle 6 springes over: den er
       timing-linjen. */
    var laast = [];
    for (var y = 0; y < s; y++) {
      laast.push([]);
      for (var x = 0; x < s; x++) laast[y].push(net[y][x] !== null);
    }

    var bitNr = 0;
    var opad = true;
    for (var soejle = s - 1; soejle > 0; soejle -= 2) {
      if (soejle === 6) soejle--;
      for (var raekke = 0; raekke < s; raekke++) {
        var yy = opad ? s - 1 - raekke : raekke;
        for (var d = 0; d < 2; d++) {
          var xx = soejle - d;
          if (laast[yy][xx]) continue;
          var bit = 0;
          if (bitNr < tegn.length * 8) {
            bit = (tegn[bitNr >> 3] >> (7 - (bitNr & 7))) & 1;
          }
          net[yy][xx] = bit;
          bitNr++;
        }
      }
      opad = !opad;
    }

    // Den bedste af de otte masker
    var bedst = null;
    var bedstPoint = Infinity;
    for (var m = 0; m < 8; m++) {
      if (fastMaske !== undefined && fastMaske !== null && m !== fastMaske) continue;
      var forsoeg = [];
      for (var ry = 0; ry < s; ry++) forsoeg.push(net[ry].slice());
      for (var my = 0; my < s; my++) {
        for (var mx = 0; mx < s; mx++) {
          if (laast[my][mx]) continue;
          if (MASKER[m](mx, my)) forsoeg[my][mx] ^= 1;
        }
      }
      skrivFormat(forsoeg, niveau, m, version);
      var point = straf(forsoeg);
      if (point < bedstPoint) { bedstPoint = point; bedst = forsoeg; }
    }
    return bedst;
  }

  /* Formatoplysningerne står TO steder i koden — en kaffeplet på
     det ene hjørne må ikke gøre resten ulæselig. De 15 bit er de
     samme; kun placeringen er forskellig. */
  function skrivFormat(net, niveau, maske, version) {
    var s = net.length;
    var f = formatBit(niveau, maske);

    /* DEN MEST BETYDENDE BIT FØRST. Første udgave skrev dem den
       anden vej, og resultatet var en kode, hvis 15 formatbit
       stod SPEJLVENDT: alle 208 datatern var rigtige, og en
       telefon kunne stadig ikke læse den, fordi den ikke fik at
       vide, hvilken maske der var brugt. Facitlisten fandt den
       med det samme; øjet ville aldrig have gjort det. */
    function bitAf(i) { return (f >> (14 - i)) & 1; }

    // Kopi 1: rundt om finder-mønsteret øverst til venstre
    for (var i = 0; i <= 5; i++) net[8][i] = bitAf(i);
    net[8][7] = bitAf(6);
    net[8][8] = bitAf(7);
    net[7][8] = bitAf(8);
    for (var j = 9; j <= 14; j++) net[14 - j][8] = bitAf(j);

    /* Kopi 2, delt mellem nederste venstre og øverste højre.
       De 15 bit er de samme og står i samme rækkefølge — det er
       kun vejen gennem koden, der er en anden. */
    for (var k = 0; k <= 6; k++) net[s - 1 - k][8] = bitAf(k);
    for (var m = 7; m <= 14; m++) net[8][s - 15 + m] = bitAf(m);

    if (version >= 7) {
      var vb = versionBit(version);
      for (var v = 0; v < 18; v++) {
        var bit = (vb >> v) & 1;
        var r = Math.floor(v / 3);
        var c = s - 11 + (v % 3);
        net[r][c] = bit;
        net[c][r] = bit;
      }
    }
  }

  /* ----------------------------------------------------------
     UD SOM SVG
     ----------------------------------------------------------
     Én sti med ét lille kvadrat pr. mørkt tern. Printeren skalerer
     den uden at den bliver grynet, og filen kan lægges direkte i
     siden — ingen billedfil at glemme.
     ---------------------------------------------------------- */
  function svg(tekst, valg) {
    valg = valg || {};
    var net = tegnNet(tekst, valg.niveau || 'H');
    var s = net.length;
    // Den hvide kant er ikke pynt: uden den kan en telefon ikke
    // se, hvor koden slutter. Standarden siger fire tern.
    var kant = valg.kant === undefined ? 4 : valg.kant;
    var side = s + kant * 2;

    var sti = '';
    for (var y = 0; y < s; y++) {
      for (var x = 0; x < s; x++) {
        if (net[y][x]) sti += 'M' + (x + kant) + ' ' + (y + kant) + 'h1v1h-1z';
      }
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + side + ' ' + side
      + '" shape-rendering="crispEdges" role="img" aria-label="'
      + String(valg.beskrivelse || 'QR-kode').replace(/[<>&"]/g, '') + '">'
      + (valg.lys === 'ingen' ? ''
        : '<rect width="' + side + '" height="' + side + '" fill="'
          + (valg.lys || '#ffffff') + '"/>')
      + '<path d="' + sti + '" fill="' + (valg.moerk || '#0f2c44') + '"/>'
      + '</svg>';
  }

  window.MosedeQR = { net: tegnNet, svg: svg };
})();
