/* ============================================================
   BYG DIN IS — ET RIGTIGT BESTILLINGSFORLØB  (25. sep 2026)
   ------------------------------------------------------------
   Kundens ord: *"når jeg bestiller 1 vaffel med 1 kugle, så kan
   jeg ikke vælge kuglen — det er jo forkert, det er et lorte
   bestillingssystem og slet ikke eksklusivt eller dygtigt nok.
   Lad hele is-blokken ryge ned og stå som en eksklusiv ting ...
   start med vaffel, hvor mange kugler du vil have, +1 okay hvad
   smag, bam +2 hvad smag, skal du have andet — du ved, et
   ordentligt bestillingssystem, der er dygtigt."*

   ⚠️ DEN GAMLE MODEL VAR FORKERT FRA BUNDEN. Kugletallet blev
   LÆST af varens navn, og smagene hang på en tæller ude i en
   almindelig række. Det virkede — MÅLT: "1 kugle" fik faktisk sin
   vælger — men kun når ejeren havde skrevet smagene i admin, og
   det havde han ikke (indstillingen `is_smage` fandtes slet ikke
   i produktionen 25/9). Så forsvandt husets vigtigste spørgsmål
   TAVST, fordi et felt et andet sted stod tomt. Et system, hvor
   det sker, er ikke dygtigt, og det er designets fejl og ikke
   ejerens.

   Her spørges der i stedet ÉT trin ad gangen, og mangler
   smagene, siger trinnet det HØJT i stedet for at forsvinde.

   ⚠️ KUGLETALLET LÆSES IKKE LÆNGERE — DET VÆLGES. Ejeren har
   "1 kugle 35", "2 kugler 45", "3 kugler 55", "4 kugler 65" som
   fire varer, hver med valget Vaffel/Bæger/Glutenfri vaffel. Trin
   2 ER altså valget af hvilken vare; prisen kommer fra hans egen
   række, ikke fra et regnestykke her.

   ⚠️ OG DEN FINDER INGENTING PÅ. Smagene er ejerens liste fra
   admin, størrelserne er hans varer, og "noget mere" er resten af
   hans is-afdeling. Står der ikke noget, står der ikke noget.

   BRUG:
     MosedeIsbygger.byg(rod, {
       data:    hele datasættet   (til Butik.isSmage)
       varer:   varerne i afdelingen 'is'
       laeg:    function (is) {...}   kaldes, når gæsten er færdig
       luk:     function () {...}     valgfri
     })
   `is` er { vare, variant, kugler, smage[], ekstra[] } — hvad
   der skal i kurven, afgør siden selv. Filen her rører ingen kurv:
   forsiden og bordet har hver sin, og en fil, der kendte dem
   begge, ville være to steder at rette den samme regel.
   ============================================================ */
window.MosedeIsbygger = (function () {
  'use strict';

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = tekst;
    return e;
  }
  function tøm(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }

  /* ------------------------------------------------------------
     HVOR MANGE KUGLER ER DER I DEN HER VARE?
     ⚠️ Svaret læses af ejerens EGET navn — men kun for at stille
     hans varer op i rækkefølge, ikke for at afgøre om der skal
     spørges om smag. Det afgør trin 3 selv.
     ------------------------------------------------------------ */
  function kuglerI(v) {
    var m = String((v && v.navn) || '').match(/(^|[^\d])(\d+)\s*kugle/i);
    var n = m ? Number(m[2]) : 0;
    return n > 0 && n <= 6 ? n : 0;
  }

  function erSoftice(v) {
    return /^softice\b/i.test(String((v && v.navn) || ''));
  }

  /* De varer, forløbet kan bygge en is af: dem med et valg
     (vaffel/bæger) OG enten kugler i navnet eller softice.
     Alt andet i afdelingen er "noget mere". */
  function stoerrelser(varer) {
    return (varer || []).filter(function (v) {
      if (!v || v.udsolgt || v.pris === null || v.pris === undefined) return false;
      if (!(Butik.vareValg && Butik.vareValg(v))) return false;
      return kuglerI(v) > 0 || erSoftice(v);
    }).sort(function (a, b) {
      /* Kuglerne først, i stigende antal; softice bagefter. */
      var ka = kuglerI(a), kb = kuglerI(b);
      if (ka && kb) return ka - kb;
      if (ka) return -1;
      if (kb) return 1;
      return (a.pris || 0) - (b.pris || 0);
    });
  }

  function resten(varer, valgte) {
    var i = {};
    valgte.forEach(function (v) { i[v.navn] = true; });
    return (varer || []).filter(function (v) {
      return v && !i[v.navn] && !v.udsolgt
        && v.pris !== null && v.pris !== undefined;
    });
  }

  function kr(p) { return Butik.kroner ? Butik.kroner(p) : String(p); }

  /* ============================================================ */
  function byg(rod, valg) {
    if (!rod || !window.Butik) return null;
    var data = valg.data;
    var alle = valg.varer || [];
    var størrelser = stoerrelser(alle);
    if (!størrelser.length) return null;

    var smageListe = Butik.isSmage ? Butik.isSmage(data) : [];
    var ekstraListe = resten(alle, størrelser);

    /* Valgmulighederne (Vaffel/Bæger/Glutenfri) er ejerens og
       ligger på varen. Alle hans is-varer har den samme liste; vi
       tager den fra den første og lader hver vare selv bestemme
       sit tillæg, så en dag med forskellige lister ikke går galt. */
    /* Butik.vareValg svarer allerede med NAVNENE — den piller selv
       objektformen {"navn":"Glutenfri vaffel","tillaeg":3} fra
       hinanden (se noten ved valgNavnet i store.js). En oversættelse
       til ville være den samme regel et sted mere. */
    var valgNavne = Butik.vareValg(størrelser[0]) || [];

    var valgtVariant = null;
    var valgtVare = null;
    var smage = [];
    var ønsket = '';
    var ekstra = [];

    var ud = lav('div', 'isbyg');

    /* ---------- TRIN 1: vaffel eller bæger ---------- */
    var t1 = trin('1', 'Vaffel eller bæger?');
    var v1 = lav('div', 'isbyg-valg');
    valgNavne.forEach(function (navn) {
      var t = Butik.valgTillaeg ? Butik.valgTillaeg(størrelser[0], navn) : 0;
      var k = knap(navn, t ? '+' + kr(t) : '');
      k.addEventListener('click', function () {
        valgtVariant = navn;
        marker(v1, k);
        tegnOm();
      });
      v1.appendChild(k);
    });
    t1.krop.appendChild(v1);
    ud.appendChild(t1.boks);

    /* ---------- TRIN 2: hvor mange kugler ---------- */
    var t2 = trin('2', 'Hvor mange kugler?');
    var v2 = lav('div', 'isbyg-valg');
    størrelser.forEach(function (v) {
      var n = kuglerI(v);
      var k = knap(n ? String(n) + (n === 1 ? ' kugle' : ' kugler') : v.navn,
                   kr(v.pris));
      k.setAttribute('data-vare', v.navn);
      k.addEventListener('click', function () {
        valgtVare = v;
        /* ⚠️ SMAGENE NULSTILLES, NÅR ANTALLET SKIFTER. Går man fra
           3 til 2 kugler, må den tredje smag ikke blive hængende i
           kurven — den er ikke bestilt. */
        smage = [];
        marker(v2, k);
        tegnOm();
      });
      v2.appendChild(k);
    });
    t2.krop.appendChild(v2);
    ud.appendChild(t2.boks);

    /* ---------- TRIN 3: smagene, én ad gangen ---------- */
    var t3 = trin('3', 'Hvilke smage?');
    ud.appendChild(t3.boks);

    /* ---------- TRIN 4: noget mere ---------- */
    var t4 = trin('4', 'Noget mere?');
    ud.appendChild(t4.boks);

    /* ---------- BUNDEN ---------- */
    var bund = lav('div', 'isbyg-bund');
    var sum = lav('div', 'isbyg-sum');
    /* ⚠️ IKKE `g solid blk`. MÅLT 25/9: forsidens visKnap() finder
       sendeknappen med `find('button.g.solid.blk', panel)` — altså
       den FØRSTE i panelet — og byggerens knap står før den i
       listen. Så skrev siden sin egen tekst oven i min ("Vælg noget
       først"), og sendeknappen blev aldrig fundet: der kunne slet
       ikke bestilles. Knappen her har sin egen klasse og sin egen
       stil. */
    var knapLæg = lav('button', 'isbyg-laeg');
    knapLæg.type = 'button';
    bund.appendChild(sum);
    bund.appendChild(knapLæg);
    ud.appendChild(bund);

    knapLæg.addEventListener('click', function () {
      if (!klar()) return;
      /* Ejerens liste ELLER gæstens eget ønske — aldrig begge, for
         de to kan ikke findes på samme tid. */
      var n = kuglerI(valgtVare);
      var smagene = (n && smageListe.length) ? smage.slice()
        : (String(ønsket).trim() ? [String(ønsket).trim()] : []);
      valg.laeg({
        vare: valgtVare,
        variant: valgtVariant,
        kugler: n,
        smage: smagene,
        ekstra: ekstra.slice(),
      });
      /* Klar til den næste is — man bestiller sjældent kun én.
         ⚠️ Ønsket ryddes MED: to is i træk med den samme tekst
         ville være et ønske, gæsten kun har skrevet én gang. */
      valgtVare = null; smage = []; ønsket = ''; ekstra = [];
      marker(v2, null);
      tegnOm();
      kvitter();
    });

    var kvit = lav('p', 'isbyg-kvit');
    kvit.setAttribute('aria-live', 'polite');
    ud.appendChild(kvit);
    var kvitUr = null;
    function kvitter() {
      kvit.textContent = '✓ Lagt i kurven — byg en til, eller rul ned og send';
      kvit.classList.add('vis');
      clearTimeout(kvitUr);
      kvitUr = setTimeout(function () { kvit.classList.remove('vis'); }, 4000);
    }

    /* ------------------------------------------------------------
       HJÆLPERNE
       ------------------------------------------------------------ */
    function trin(nr, titel) {
      var boks = lav('div', 'isbyg-trin');
      boks.setAttribute('data-trin', nr);
      var hoved = lav('div', 'isbyg-hoved');
      hoved.appendChild(lav('span', 'isbyg-nr', nr));
      hoved.appendChild(lav('h4', 'isbyg-titel', titel));
      boks.appendChild(hoved);
      var krop = lav('div', 'isbyg-krop');
      boks.appendChild(krop);
      return { boks: boks, krop: krop, hoved: hoved };
    }

    function knap(navn, bi) {
      var k = lav('button', 'isbyg-knap');
      k.type = 'button';
      k.appendChild(lav('span', 'isbyg-knap-navn', navn));
      if (bi) k.appendChild(lav('span', 'isbyg-knap-bi', bi));
      return k;
    }

    function marker(boks, valgt) {
      Array.prototype.forEach.call(boks.children, function (k) {
        k.classList.toggle('valgt', k === valgt);
        k.setAttribute('aria-pressed', k === valgt ? 'true' : 'false');
      });
    }

    /* ⚠️ ET TRIN, MAN IKKE KAN SVARE PÅ ENDNU, ER DÆMPET — IKKE
       SKJULT. Gæsten skal kunne se, hvor mange skridt der er
       tilbage; et trin, der dukker op af ingenting, føles som en
       side, der skifter under fingeren. */
    function laas(t, aaben) {
      t.boks.classList.toggle('laast', !aaben);
      Array.prototype.forEach.call(t.boks.querySelectorAll('button, select'),
        function (e) { e.disabled = !aaben; });
    }

    function klar() {
      if (!valgtVariant || !valgtVare) return false;
      var n = kuglerI(valgtVare);
      if (!n || !smageListe.length) return true;
      for (var i = 0; i < n; i++) {
        if (!String(smage[i] || '').trim()) return false;
      }
      return true;
    }

    function pris() {
      if (!valgtVare) return 0;
      var p = Butik.prisMedValg
        ? Number(Butik.prisMedValg(valgtVare, valgtVariant) || 0)
        : Number(valgtVare.pris || 0);
      ekstra.forEach(function (v) { p += Number(v.pris || 0); });
      return p;
    }

    /* ------------------------------------------------------------
       OPTEGNINGEN — kun trin 3 og 4 bygges om, fordi de afhænger
       af de to første. 1 og 2 står fast, så knapperne ikke hopper
       under fingeren.
       ------------------------------------------------------------ */
    function tegnOm() {
      laas(t2, !!valgtVariant);

      var n = valgtVare ? kuglerI(valgtVare) : 0;
      laas(t3, !!valgtVare);
      tøm(t3.krop);

      if (!valgtVare) {
        t3.krop.appendChild(lav('p', 'isbyg-hint', 'Vælg først en størrelse.'));
      } else if (!n) {
        /* Softice har ingen kugler — så er der ingen smag at vælge,
           og trinnet siger det i stedet for at stå tomt. */
        t3.krop.appendChild(lav('p', 'isbyg-hint',
          'Softice kommer, som den er — der er ingen smag at vælge.'));
      } else if (!smageListe.length) {
        /* ⚠️ ET ØNSKE, IKKE ET TOMT TRIN  (25/9, Mikkels valg: "lav
           det som en option ... måske et skrivefelt, som ikke er
           obligatorisk — du vælger selv hvad der giver mest mening").

           Har ejeren ikke skrevet sin liste, spørger vi alligevel —
           bare åbent. Gæsten kan skrive "vanilje og lakrids", og
           køkkenet får det at se; hun kan også lade være.

           ⚠️ OG ØNSKET REJSER SOM EN SMAG. Så behøver hverken bonen,
           køkken-køen, Overblik eller kvitteringen at kende to slags:
           Butik.linjeNavn sætter det efter navnet, præcis som en
           valgt smag. Ét spor, ikke to. */
        t3.krop.appendChild(oenskeRække());
      } else {
        for (var i = 0; i < n; i++) {
          t3.krop.appendChild(kugleRække(i, n));
        }
      }

      laas(t4, !!valgtVare);
      tøm(t4.krop);
      if (ekstraListe.length) {
        var g = lav('div', 'isbyg-ekstra');
        ekstraListe.forEach(function (v) {
          var k = knap(v.navn, kr(v.pris));
          k.classList.add('isbyg-ekstra-knap');
          var på = ekstra.indexOf(v) !== -1;
          k.classList.toggle('valgt', på);
          k.setAttribute('aria-pressed', på ? 'true' : 'false');
          k.addEventListener('click', function () {
            var j = ekstra.indexOf(v);
            if (j === -1) ekstra.push(v); else ekstra.splice(j, 1);
            tegnOm();
          });
          g.appendChild(k);
        });
        t4.krop.appendChild(g);
      } else {
        t4.krop.appendChild(lav('p', 'isbyg-hint', 'Der er ikke mere at lægge til.'));
      }

      /* Bunden */
      var p = pris();
      sum.textContent = valgtVare ? 'I alt ' + kr(p) : '';
      knapLæg.textContent = klar() ? 'Læg i kurven · ' + kr(p) : næsteSkridt();
      knapLæg.disabled = !klar();
    }

    /* ⚠️ KNAPPEN SIGER, HVAD DER MANGLER — ikke bare "Læg i
       kurven" i grå. En slukket knap uden en grund er en gæst, der
       trykker tre gange og går. */
    function næsteSkridt() {
      if (!valgtVariant) return 'Vælg vaffel eller bæger';
      if (!valgtVare) return 'Vælg hvor mange kugler';
      return 'Vælg smag til alle kuglerne';
    }

    function oenskeRække() {
      var r = lav('div', 'isbyg-oenske');
      var m = lav('label', 'isbyg-oenske-tekst',
        'Har I en yndlingssmag? Skriv den — ellers vælger vi noget godt.');
      m.setAttribute('for', 'isbyg-oenske-felt');
      var felt = document.createElement('input');
      felt.type = 'text';
      felt.id = 'isbyg-oenske-felt';
      felt.className = 'inp isbyg-oenske-felt';
      felt.placeholder = 'Fx vanilje og jordbær';
      /* ⚠️ 60 TEGN, samme loft som Butik.smageI klipper ved. Et felt,
         der tager imod mere, end linjen kan bære, er en gæst, der
         skriver noget, køkkenet aldrig ser. */
      felt.maxLength = 60;
      felt.value = ønsket;
      felt.addEventListener('input', function () { ønsket = felt.value; });
      r.appendChild(m);
      r.appendChild(felt);
      return r;
    }

    function kugleRække(nr, ialt) {
      var r = lav('div', 'isbyg-kugle');
      r.appendChild(lav('span', 'isbyg-kugle-nr',
        ialt > 1 ? 'Kugle ' + (nr + 1) : 'Smagen'));
      var vælg = document.createElement('select');
      vælg.className = 'inp isbyg-smag';
      vælg.setAttribute('data-kugle', String(nr));
      vælg.setAttribute('aria-label',
        ialt > 1 ? 'Smag til kugle ' + (nr + 1) : 'Smag');
      var tom = lav('option', null, 'Vælg smag');
      tom.value = '';
      vælg.appendChild(tom);
      smageListe.forEach(function (s) {
        var o = lav('option', null, s);
        o.value = s;
        vælg.appendChild(o);
      });
      vælg.value = smage[nr] || '';
      vælg.classList.toggle('mangler', !vælg.value);
      vælg.addEventListener('change', function () {
        smage[nr] = vælg.value;
        vælg.classList.toggle('mangler', !vælg.value);
        tegnOm();
      });
      r.appendChild(vælg);
      return r;
    }

    rod.appendChild(ud);
    tegnOm();
    return { rod: ud, tegnOm: tegnOm };
  }

  return { byg: byg, kuglerI: kuglerI, erSoftice: erSoftice,
           stoerrelser: stoerrelser };
}());
