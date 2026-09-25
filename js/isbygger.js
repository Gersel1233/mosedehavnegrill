/* ============================================================
   ISBAREN — ET FORLØB PR. SLAGS IS  (25.–26. sep 2026)
   ------------------------------------------------------------
   Kundens ord 25/9: *"når jeg bestiller 1 vaffel med 1 kugle, så
   kan jeg ikke vælge kuglen — det er jo forkert ... start med
   vaffel, hvor mange kugler du vil have, +1 okay hvad smag, bam +2
   hvad smag, skal du have andet."*

   Og 26/9: *"kig is-menukortene igennem og dimensionér — hvis jeg
   vil vælge en isboks, skal det være et andet bestillingsflow ...
   tænk: okay, bestillingsflowet er typisk sådan her andre
   is-steder, den her skal have noget anderledes, og de her skal
   også have noget anderledes ... et bulletproof, dygtigt og
   intelligent bestillingssystem, også på telefonen."*

   ⚠️ DET, DER VAR GALT 25/9: ALT, DER IKKE VAR EN STØRRELSE, VAR
   "NOGET MERE". Isboksen til 90, pandekagerne, churros og
   bubblewafflerne stod som tilbehør til en vaffel — en gæst kunne
   lægge en isboks OVENI sin kugle-is og aldrig blive spurgt, hvilke
   seks kugler der skulle i den. Kort 05 har fem slags ting, og de
   bestilles på fem måder:

     stoerrelse  Is i vaffel eller bæger: 1-4 kugler, softice
                 → vaffel/bæger · antal · smag pr. kugle · tilbehør
     tilbehoer   Til isen: ekstra kugle, guf, softice-top
                 → trin 4 i forløbet ovenfor; en ekstra kugle
                   spørger om SIN smag i trin 3
     boks        Isboks: "6 kugler efter eget valg — eller fyldt
                 med softice"
                 → kugler ELLER softice · fordel kuglerne på smagene
     dessert     Bubblewaffle, pandekager, churros, café-is, sundae,
                 affogato: en ret med sit eget indhold
                 → har den kugler, vælges deres smage; ellers ét tryk
     loes        Løs vaffel, toppingbøtte: købes, som de er

   ⚠️ HVOR EN VARE HØRER TIL, ER EJERENS. Indstillingen
   `is_opsaetning` (admin → Menukort → 🍦 Isbaren) siger det pr.
   vare: {"<id>": {"rolle": "dessert", "kugler": 3, "softice": false}}.
   Har ejeren ikke sagt noget, læses svaret af varens EGET navn, så
   forsigtigt som muligt — en vare, reglen ikke kan læse, opfører sig
   som 25/9 (tilbehør). Det er den samme ufarlige vej som kuglerI.

   ⚠️ OG DEN FINDER INGENTING PÅ. Smagene er ejerens liste, varerne
   og priserne er hans rækker. Står der ikke noget, står der ikke
   noget.

   BRUG:
     MosedeIsbygger.byg(rod, {
       data:    hele datasættet   (smagene og opsætningen)
       varer:   varerne i afdelingen 'is'
       laeg:    function (is) {...}   kaldes, når gæsten er færdig
     })
   `is` er { vare, variant, kugler, smage[], ekstra[] } — hvad der
   skal i kurven, afgør siden selv. Filen her rører ingen kurv:
   forsiden og bordet har hver sin.
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
  function kr(p) { return window.Butik && Butik.kroner ? Butik.kroner(p) : String(p); }

  /* ------------------------------------------------------------
     HVOR MANGE KUGLER ER DER I DEN HER VARE?
     Læst af ejerens EGET navn ("2 kugler", "Isboks, ca. 6
     kugler"). Et navn uden et tal siger ingenting, og så spørges
     der ikke.
     ------------------------------------------------------------ */
  function kuglerI(v) {
    var m = String((v && v.navn) || '').match(/(^|[^\d])(\d+)\s*kugle/i);
    var n = m ? Number(m[2]) : 0;
    return n > 0 && n <= 6 ? n : 0;
  }

  function erSoftice(v) {
    return /^softice\b/i.test(String((v && v.navn) || ''));
  }

  function harBaegerValg(v) {
    return !!(window.Butik && Butik.vareValg && (Butik.vareValg(v) || []).length);
  }

  /* Reglen for en størrelse, når ejeren ikke har sagt andet: et valg
     (vaffel/bæger) og kugler i navnet eller softice. */
  function erStørrelse(v) {
    return harBaegerValg(v) && (kuglerI(v) > 0 || erSoftice(v));
  }

  function kategorienHarStørrelser(v, data) {
    return ((data && data.menu_varer) || []).some(function (x) {
      return x && x.kategori_id === v.kategori_id && x.aktiv !== false && erStørrelse(x);
    });
  }

  /* ============================================================
     ROLLEN — HVOR I BESTILLINGEN EN VARE STÅR
     ============================================================ */
  var ROLLER = ['stoerrelse', 'tilbehoer', 'boks', 'dessert', 'loes'];

  /* Navnene er gæstens, ikke systemets. Admin bruger de samme, så
     ejeren læser præcis de ord, gæsten ser på siden. */
  var ROLLE_NAVN = {
    stoerrelse: 'Is i vaffel eller bæger',
    tilbehoer: 'Tilbehør til isen',
    boks: 'Isboks',
    dessert: 'Desserter',
    loes: 'Løst',
  };

  /* ⚠️ INDSTILLINGEN KAN VÆRE EN TEKST. indstillinger.vaerdi er jsonb,
     men et gammelt admin-faneblad eller en SQL-fil kan have skrevet
     den som en streng med JSON i. Begge former læses; alt andet er
     "intet sagt". */
  function opsaetning(data) {
    var r = data && data.indstillinger && data.indstillinger.is_opsaetning;
    if (typeof r === 'string') {
      try { r = JSON.parse(r); } catch (e) { r = null; }
    }
    return (r && typeof r === 'object' && !Array.isArray(r)) ? r : {};
  }

  function heltal(x, min, maks) {
    var n = Math.round(Number(x));
    if (!isFinite(n)) return null;
    return Math.max(min, Math.min(maks, n));
  }

  /* Svaret for ÉN vare: { rolle, kugler, softice, sagt }.
     `sagt` er sandt, når ejeren har valgt rollen selv — admin viser
     forskel på "ejeren har sagt" og "læst af navnet". */
  function rolle(v, data) {
    var navn = String((v && v.navn) || '');
    var tekst = navn + ' ' + String((v && v.beskrivelse) || '');
    var o = opsaetning(data)[String(v && v.id)] || null;

    var gæt;
    if (erStørrelse(v)) gæt = 'stoerrelse';
    else if (/isboks/i.test(navn)) gæt = 'boks';
    else if (kuglerI(v) > 0 || /eller\s+softice/i.test(navn)) gæt = 'dessert';
    /* ⚠️ TILBEHØR KRÆVER EN IS AT LÆGGE DET PÅ. MÅLT 26/9 med
       produktionens varer: ispindene (Maxibon, Excellence …) stod i
       "Noget mere?" som noget, man kunne lægge oven på en kugle-is,
       fordi reglen gættede "tilbehør" om alt, den ikke kendte. En
       vare fra en kategori UDEN en eneste is i vaffel eller bæger
       sælges, som den er. Svaret hænger på ejerens egen inddeling. */
    else gæt = kategorienHarStørrelser(v, data) ? 'tilbehoer' : 'loes';

    var sagt = !!(o && ROLLER.indexOf(o.rolle) !== -1);
    var r = sagt ? o.rolle : gæt;

    /* ⚠️ EN STØRRELSE UDEN VAFFEL OG BÆGER HAR INTET TRIN 1. Sætter
       ejeren rollen på en vare uden det valg, ville forløbet stå med
       et tomt første spørgsmål og en knap, der aldrig tændes. Så er
       den en dessert — en ret, der bestilles, som den er. */
    if (r === 'stoerrelse' && !harBaegerValg(v)) r = 'dessert';

    var kugler;
    if (o && o.kugler !== undefined && o.kugler !== null && o.kugler !== '') {
      kugler = heltal(o.kugler, 0, 12);
    }
    if (kugler === null || kugler === undefined) {
      /* "Ekstra kugle" siger selv, at den er én kugle — og en kugle
         har en smag. Det er varens eget navn, ikke et gæt. */
      kugler = kuglerI(v) || (/^ekstra\s+kugle/i.test(navn) ? 1 : 0);
    }
    /* Softice har ingen kugler at vælge smag til. */
    if (r === 'stoerrelse' && erSoftice(v)) kugler = 0;

    var softice;
    if (o && typeof o.softice === 'boolean') softice = o.softice;
    else softice = /eller\s+[^,.;]*softice/i.test(tekst);
    if (r !== 'boks' && r !== 'dessert') softice = false;

    return { rolle: r, kugler: kugler, softice: softice, sagt: sagt };
  }

  function bestilbar(v) {
    return !!v && !v.udsolgt && v.pris !== null && v.pris !== undefined;
  }

  /* Varerne delt ud på de fem roller — kun dem, der kan bestilles. */
  /* ⚠️ SAMME RÆKKEFØLGE PÅ SIDEN OG I ADMIN. Første udgave sorterede
     desserterne på varens egen `sortering` alene — på tværs af
     kategorier. "Havnens café-is" (Kugleis, sortering 21) røg derfor
     ned under alt fra "Softice og vafler" (sortering 4-10) på siden,
     mens admin viste den øverst. Ejeren så én rækkefølge og gæsten
     en anden. Nu gælder kortets orden: kategorien først, så varen —
     og admin kalder den samme funktion. */
  function ordn(liste, rolleNavn, data) {
    var katOrden = {};
    ((data && data.menu_kategorier) || []).forEach(function (k) {
      if (k) katOrden[k.id] = Number(k.sortering) || 0;
    });
    function efterKort(a, b) {
      return ((katOrden[a.kategori_id] || 0) - (katOrden[b.kategori_id] || 0))
        || ((a.sortering || 0) - (b.sortering || 0))
        || ((a.pris || 0) - (b.pris || 0));
    }
    var kopi = (liste || []).slice();
    if (rolleNavn !== 'stoerrelse') return kopi.sort(efterKort);
    return kopi.sort(function (a, b) {
      /* Kuglerne først, i stigende antal; softice bagefter. */
      var ka = rolle(a, data).kugler, kb = rolle(b, data).kugler;
      if (ka && kb) return ka - kb;
      if (ka) return -1;
      if (kb) return 1;
      return (a.pris || 0) - (b.pris || 0);
    });
  }

  function grupper(varer, data) {
    var g = { stoerrelse: [], tilbehoer: [], boks: [], dessert: [], loes: [] };
    (varer || []).forEach(function (v) {
      if (!bestilbar(v)) return;
      g[rolle(v, data).rolle].push(v);
    });
    Object.keys(g).forEach(function (n) { g[n] = ordn(g[n], n, data); });
    /* ⚠️ TILBEHØR UDEN EN IS AT LÆGGE DET PÅ, FINDES IKKE. Er der
       ingen størrelser, tegnes forløbet med trin 4 ikke — og så må
       tilbehøret heller ikke regnes som "i byggeren", ellers ville
       siden tage det ud af sine grupper, og det forsvandt. */
    if (!g.stoerrelse.length) g.tilbehoer = [];
    return g;
  }

  function stoerrelser(varer, data) { return grupper(varer, data).stoerrelse; }

  /* ⚠️ HVAD BYGGEREN FAKTISK TEGNER — og dermed præcis det, siden
     må tage ud af sine egne grupper. Det udsolgte og det prisløse
     tegner byggeren ikke (det kan ikke bestilles), så det bliver i
     sidens grupper med sit "Udsolgt" (aftalt 2/9, målt 25/9). */
  function iBrug(varer, data) {
    if (!kanBygges(varer, data)) return [];
    var g = grupper(varer, data);
    return [].concat(g.stoerrelse, g.tilbehoer, g.boks, g.dessert, g.loes);
  }

  /* ⚠️ ISBAREN OVERTAGER KUN, NÅR DER ER NOGET AT SPØRGE OM.
     Husets beslutning 25/9: *"kan isen ikke bygges, skal
     is-kategorierne stå på deres egen plads i rækkefølgen, præcis
     som før."* Første udgave af 26/9 lod en forretning med én
     softice uden valg få en hel isbar med én flise — og så forsvandt
     dens almindelige række med tælleren (MÅLT: prøven "is-rækken
     har en anden flade" faldt). Isbaren har sin berettigelse, når
     der er en størrelse at bygge, en isboks at fylde eller en
     dessert med kugler at vælge smag til. */
  function kanBygges(varer, data) {
    var g = grupper(varer, data);
    return !!(g.stoerrelse.length || g.boks.length
      || g.dessert.some(function (v) {
        var r = rolle(v, data);
        return r.kugler > 0 || r.softice;
      }));
  }

  /* ============================================================
     BYG
     ============================================================ */
  function byg(rod, valg) {
    if (!rod || !window.Butik) return null;
    var data = valg.data;
    if (!kanBygges(valg.varer || [], data)) return null;
    var g = grupper(valg.varer || [], data);
    var smageListe = Butik.isSmage ? Butik.isSmage(data) : [];

    /* Slagsene i den rækkefølge, en gæst tænker dem: det, de fleste
       kommer efter, først. En slags uden varer står der ikke. */
    var SLAGS = [
      { id: 'vaffel', tegn: '🍦', titel: 'Is i vaffel eller bæger', varer: g.stoerrelse, tegnFlow: flowVaffel },
      { id: 'boks', tegn: '📦', titel: 'Isboks', varer: g.boks, tegnFlow: flowBoks },
      { id: 'dessert', tegn: '🧇', titel: 'Desserter', varer: g.dessert, tegnFlow: flowDesserter },
      { id: 'loes', tegn: '🥄', titel: 'Løst', varer: g.loes, tegnFlow: flowLoes },
    ].filter(function (s) { return s.varer.length; });
    if (!SLAGS.length) return null;

    var ud = lav('div', 'isbyg');
    var flade = lav('div', 'isbyg-flow');
    var aktiv = null;

    /* ---------- TRIN 0: hvad skal det være? ----------
       ⚠️ KUN NÅR DER ER NOGET AT VÆLGE IMELLEM. En forretning med
       bare kugleis skal ikke svare på et spørgsmål med ét svar —
       og byggeren ser da præcis ud, som den gjorde 25/9. */
    if (SLAGS.length > 1) {
      var vælger = lav('div', 'isbyg-slags');
      vælger.setAttribute('role', 'group');
      vælger.setAttribute('aria-label', 'Hvad skal det være?');
      SLAGS.forEach(function (s) {
        var k = lav('button', 'isbyg-slag');
        k.type = 'button';
        k.setAttribute('data-slag', s.id);
        k.appendChild(lav('span', 'isbyg-slag-tegn', s.tegn));
        k.appendChild(lav('span', 'isbyg-slag-navn', s.titel));
        k.appendChild(lav('span', 'isbyg-slag-bi', underTekst(s)));
        k.addEventListener('click', function () { vis(s.id); });
        vælger.appendChild(k);
      });
      ud.appendChild(vælger);
    }
    ud.appendChild(flade);

    var kvit = lav('p', 'isbyg-kvit');
    kvit.setAttribute('aria-live', 'polite');
    ud.appendChild(kvit);
    var kvitUr = null;
    function kvitter(hvad) {
      kvit.textContent = '✓ Lagt i kurven: ' + hvad + ' — vælg mere, eller rul ned og send';
      kvit.classList.add('vis');
      clearTimeout(kvitUr);
      kvitUr = setTimeout(function () { kvit.classList.remove('vis'); }, 4000);
    }

    /* Én vej ud for alle fire forløb, så kvitteringen og kurven
       aldrig kan komme til at sige hver sit. */
    function læg(is) {
      valg.laeg(is);
      kvitter(Butik.linjeNavn
        ? Butik.linjeNavn({ navn: is.vare.navn, variant: is.variant, smage: is.smage })
        : is.vare.navn);
    }

    /* Den billigste pris i slagsen, som undertekst på flisen: gæsten
       skal kunne se, hvad det koster, før hun trykker. */
    function underTekst(s) {
      var p = s.varer.map(function (v) { return Number(v.pris || 0); });
      var min = Math.min.apply(null, p);
      return (s.varer.length > 1 ? 'fra ' : '') + kr(min);
    }

    function vis(id) {
      aktiv = id;
      Array.prototype.forEach.call(ud.querySelectorAll('.isbyg-slag'), function (k) {
        var på = k.getAttribute('data-slag') === id;
        k.classList.toggle('valgt', på);
        k.setAttribute('aria-pressed', på ? 'true' : 'false');
      });
      tøm(flade);
      flade.setAttribute('data-slag', id);
      SLAGS.filter(function (s) { return s.id === id; })[0].tegnFlow(flade);
    }

    /* ============================================================
       FÆLLES BYGGESTEN
       ============================================================ */
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
      Array.prototype.forEach.call(t.boks.querySelectorAll('button, select, input'),
        function (e) { e.disabled = !aaben; });
    }

    /* Én smagsvælger. `holder` er et array og `plads` dets indeks —
       så de samme rækker kan bruges af kugle-isen og desserterne. */
    function smagsVælger(etiket, holder, plads, efter) {
      var r = lav('div', 'isbyg-kugle');
      r.appendChild(lav('span', 'isbyg-kugle-nr', etiket));
      var vælg = document.createElement('select');
      vælg.className = 'inp isbyg-smag';
      vælg.setAttribute('data-kugle', String(plads));
      vælg.setAttribute('aria-label', 'Smag — ' + etiket.toLowerCase());
      var tom = lav('option', null, 'Vælg smag');
      tom.value = '';
      vælg.appendChild(tom);
      smageListe.forEach(function (s) {
        var o = lav('option', null, s);
        o.value = s;
        vælg.appendChild(o);
      });
      vælg.value = holder[plads] || '';
      vælg.classList.toggle('mangler', !vælg.value);
      vælg.addEventListener('change', function () {
        holder[plads] = vælg.value;
        vælg.classList.toggle('mangler', !vælg.value);
        efter();
      });
      r.appendChild(vælg);
      return r;
    }

    /* ⚠️ ET ØNSKE, IKKE ET TOMT TRIN (25/9, Mikkels valg). Har ejeren
       ikke skrevet sin liste, spørger vi alligevel — bare åbent. Og
       ønsket rejser som en smag, så bonen, køen og kvitteringen kun
       kender ét spor. */
    var ønskeNr = 0;
    function ønskeFelt(tilstand) {
      var r = lav('div', 'isbyg-oenske');
      var id = 'isbyg-oenske-felt' + (ønskeNr++ ? '-' + ønskeNr : '');
      var m = lav('label', 'isbyg-oenske-tekst',
        'Har I en yndlingssmag? Skriv den — ellers vælger vi noget godt.');
      m.setAttribute('for', id);
      var felt = document.createElement('input');
      felt.type = 'text';
      felt.id = id;
      felt.className = 'inp isbyg-oenske-felt';
      felt.placeholder = 'Fx vanilje og jordbær';
      /* 60 tegn, samme loft som Butik.smageI klipper ved. */
      felt.maxLength = 60;
      felt.value = tilstand.ønske || '';
      felt.addEventListener('input', function () { tilstand.ønske = felt.value; });
      r.appendChild(m);
      r.appendChild(felt);
      return r;
    }

    function ønsket(tilstand) {
      var t = String(tilstand.ønske || '').trim();
      return t ? [t] : [];
    }

    function bund(etiketter) {
      var b = lav('div', 'isbyg-bund');
      var sum = lav('div', 'isbyg-sum');
      /* ⚠️ IKKE `g solid blk`. MÅLT 25/9: forsidens visKnap() finder
         sendeknappen med `find('button.g.solid.blk', panel)` — den
         FØRSTE i panelet — og byggerens knap stod før den. Så kunne
         der slet ikke bestilles. Knappen har sin egen klasse. */
      var k = lav('button', 'isbyg-laeg');
      k.type = 'button';
      b.appendChild(sum);
      b.appendChild(k);
      if (etiketter) b.setAttribute('data-for', etiketter);
      return { boks: b, sum: sum, knap: k };
    }

    /* ============================================================
       1) IS I VAFFEL ELLER BÆGER
       ============================================================ */
    function flowVaffel(flade) {
      var størrelser = g.stoerrelse;
      var valgNavne = Butik.vareValg(størrelser[0]) || [];
      var valgtVariant = null;
      var valgtVare = null;
      var smage = [];
      var tilstand = { ønske: '' };
      var ekstra = [];

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
      flade.appendChild(t1.boks);

      /* ---------- TRIN 2: hvor mange kugler ---------- */
      var t2 = trin('2', 'Hvor mange kugler?');
      var v2 = lav('div', 'isbyg-valg');
      størrelser.forEach(function (v) {
        var n = rolle(v, data).kugler;
        var k = knap(n ? String(n) + (n === 1 ? ' kugle' : ' kugler') : v.navn, kr(v.pris));
        k.setAttribute('data-vare', v.navn);
        k.addEventListener('click', function () {
          valgtVare = v;
          /* ⚠️ SMAGENE NULSTILLES, NÅR ANTALLET SKIFTER. Går man fra
             3 til 2 kugler, må den tredje smag ikke blive hængende. */
          smage = [];
          /* ⚠️ OG TILBEHØR FRA DEN ANDEN SLAGS FALDER AF. Guf til
             softicen er ikke strøssel til kugle-isen — skifter gæsten
             størrelse, må et tilvalg fra den anden liste ikke følge
             usynligt med i prisen. */
          var lovlige = ekstraFor(v);
          ekstra = ekstra.filter(function (x) { return lovlige.indexOf(x) !== -1; });
          marker(v2, k);
          tegnOm();
        });
        v2.appendChild(k);
      });
      t2.krop.appendChild(v2);
      flade.appendChild(t2.boks);

      var t3 = trin('3', 'Hvilke smage?');
      flade.appendChild(t3.boks);
      var t4 = trin('4', 'Noget mere?');
      flade.appendChild(t4.boks);

      var b = bund();
      flade.appendChild(b.boks);

      b.knap.addEventListener('click', function () {
        if (!klar()) return;
        var smagene = smageListe.length && antalKugler()
          ? smage.slice(0, antalKugler()) : ønsket(tilstand);
        læg({
          vare: valgtVare,
          variant: valgtVariant,
          kugler: rolle(valgtVare, data).kugler,
          smage: smagene,
          ekstra: ekstra.slice(),
        });
        /* Klar til den næste is — man bestiller sjældent kun én.
           Ønsket ryddes MED: to is i træk med den samme tekst ville
           være et ønske, gæsten kun har skrevet én gang. */
        valgtVare = null; smage = []; tilstand.ønske = ''; ekstra = [];
        marker(v2, null);
        tegnOm();
      });

      /* ⚠️ TILBEHØRET FØLGER ISENS EGEN KATEGORI. Kort 05 har "Strøssel,
         topping eller guf" under kugleisen og "Sauce, topping eller
         guf" under softicen — to varer til 8 kr., der ville stå side
         om side og ligne en fejl. Ejerens egen inddeling afgør, hvad
         der passer til hvad. Har kategorien intet tilbehør, vises det
         hele. */
      function ekstraFor(v) {
        if (!v) return g.tilbehoer;
        var egne = g.tilbehoer.filter(function (x) { return x.kategori_id === v.kategori_id; });
        return egne.length ? egne : g.tilbehoer;
      }

      /* Kuglerne i isen PLUS en ekstra kugle, der er valgt til —
         en ekstra kugle har også en smag, og den skal køkkenet vide. */
      function ekstraKugler() {
        return ekstra.reduce(function (n, v) { return n + rolle(v, data).kugler; }, 0);
      }
      function antalKugler() {
        return valgtVare ? rolle(valgtVare, data).kugler + ekstraKugler() : 0;
      }

      function klar() {
        if (!valgtVariant || !valgtVare) return false;
        var n = antalKugler();
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

      /* ⚠️ KNAPPEN SIGER, HVAD DER MANGLER — en slukket knap uden en
         grund er en gæst, der trykker tre gange og går. */
      function næsteSkridt() {
        if (!valgtVariant) return 'Vælg vaffel eller bæger';
        if (!valgtVare) return 'Vælg hvor mange kugler';
        return antalKugler() > 1 ? 'Vælg smag til alle kuglerne' : 'Vælg smagen';
      }

      function tegnOm() {
        laas(t2, !!valgtVariant);

        var egne = valgtVare ? rolle(valgtVare, data).kugler : 0;
        var n = antalKugler();
        laas(t3, !!valgtVare);
        tøm(t3.krop);
        if (!valgtVare) {
          t3.krop.appendChild(lav('p', 'isbyg-hint', 'Vælg først en størrelse.'));
        } else if (!n) {
          t3.krop.appendChild(lav('p', 'isbyg-hint',
            'Softice kommer, som den er — der er ingen smag at vælge.'));
        } else if (!smageListe.length) {
          t3.krop.appendChild(ønskeFelt(tilstand));
        } else {
          for (var i = 0; i < n; i++) {
            var etiket = i < egne
              ? (egne > 1 ? 'Kugle ' + (i + 1) : 'Smagen')
              : (n - egne > 1 ? 'Ekstra kugle ' + (i - egne + 1) : 'Ekstra kugle');
            t3.krop.appendChild(smagsVælger(etiket, smage, i, tegnOm));
          }
        }

        laas(t4, !!valgtVare);
        tøm(t4.krop);
        /* ⚠️ FØR STØRRELSEN ER VALGT, VED VI IKKE, HVAD DER PASSER.
           Første udgave viste hele tilbehørslisten låst — kugleisens
           strøssel og softicens sauce side om side, to varer til 8 kr.,
           der lignede en dublet. Tilbehøret afhænger af, om det er
           kugler eller softice, så trinnet venter, som trin 3 gør. */
        var liste = valgtVare ? ekstraFor(valgtVare) : [];
        if (!valgtVare) {
          t4.krop.appendChild(lav('p', 'isbyg-hint', 'Vælg først en størrelse.'));
        } else if (liste.length) {
          var gr = lav('div', 'isbyg-ekstra');
          liste.forEach(function (v) {
            var k = knap(v.navn, kr(v.pris));
            k.classList.add('isbyg-ekstra-knap');
            var på = ekstra.indexOf(v) !== -1;
            k.classList.toggle('valgt', på);
            k.setAttribute('aria-pressed', på ? 'true' : 'false');
            k.addEventListener('click', function () {
              var j = ekstra.indexOf(v);
              if (j === -1) ekstra.push(v); else ekstra.splice(j, 1);
              /* Tages en ekstra kugle fra igen, må dens smag ikke
                 blive hængende i en plads, der ikke findes. */
              smage.length = Math.min(smage.length, antalKugler());
              tegnOm();
            });
            gr.appendChild(k);
          });
          t4.krop.appendChild(gr);
        } else {
          t4.krop.appendChild(lav('p', 'isbyg-hint', 'Der er ikke mere at lægge til.'));
        }

        var p = pris();
        b.sum.textContent = valgtVare ? 'I alt ' + kr(p) : '';
        b.knap.textContent = klar() ? 'Læg i kurven · ' + kr(p) : næsteSkridt();
        b.knap.disabled = !klar();
      }

      tegnOm();
    }

    /* ============================================================
       2) ISBOKSEN
       ------------------------------------------------------------
       Kort 05: *"Isboks, ca. 6 kugler eller softice — 6 kugler efter
       eget valg, eller fyldt med softice. Tag med på turen."*

       Det er IKKE en vaffel med seks smagsvælgere. Et is-sted
       spørger: kugler eller softice? Og så: hvor mange af hver?
       Seks rullelister efter hinanden på en telefon er seks tryk
       og seks lister at læse; tællere pr. smag er ét blik.
       ============================================================ */
    function flowBoks(flade) {
      var bokse = g.boks;
      var vare = bokse.length === 1 ? bokse[0] : null;
      var form = null;      // 'kugler' | 'softice'
      var tal = {};         // smag -> antal
      var tilstand = { ønske: '' };

      var nr = 0;
      var tVare = null;
      if (bokse.length > 1) {
        tVare = trin(String(++nr), 'Hvilken isboks?');
        var vv = lav('div', 'isbyg-valg');
        bokse.forEach(function (v) {
          var k = knap(v.navn, kr(v.pris));
          k.setAttribute('data-vare', v.navn);
          k.addEventListener('click', function () {
            vare = v; form = null; tal = {};
            marker(vv, k);
            tegnOm();
          });
          vv.appendChild(k);
        });
        tVare.krop.appendChild(vv);
        flade.appendChild(tVare.boks);
      }

      /* Kortets egen tekst om boksen — hvad der er i den, og at den
         er til at tage med. */
      var beskriv = lav('p', 'isbyg-beskriv');
      flade.appendChild(beskriv);

      /* ⚠️ SPØRGSMÅLET STILLES KUN, NÅR DET HAR TO SVAR. En boks uden
         softice-alternativ springer trinnet over — også i
         nummereringen, så gæsten ikke ser "2" uden at have set "1". */
      var nogenSoftice = bokse.some(function (v) { return rolle(v, data).softice; });
      var tForm = nogenSoftice ? trin(String(++nr), 'Kugler eller softice?') : null;
      var vf = lav('div', 'isbyg-valg');
      if (tForm) {
        tForm.krop.appendChild(vf);
        flade.appendChild(tForm.boks);
      }

      var tSmag = trin(String(++nr), 'Hvilke smage?');
      flade.appendChild(tSmag.boks);

      var b = bund();
      flade.appendChild(b.boks);

      b.knap.addEventListener('click', function () {
        if (!klar()) return;
        læg({ vare: vare, variant: null, kugler: r().kugler, smage: smagene(), ekstra: [] });
        form = null; tal = {}; tilstand.ønske = '';
        if (bokse.length > 1) { vare = null; marker(tVare.krop.firstChild, null); }
        tegnOm();
      });

      function r() { return vare ? rolle(vare, data) : { kugler: 0, softice: false }; }
      /* Uden et softice-alternativ er der kun kugler — spørgsmålet
         stilles ikke. */
      function formNu() { return r().softice ? form : 'kugler'; }
      function valgte() {
        return Object.keys(tal).reduce(function (n, k) { return n + tal[k]; }, 0);
      }
      function smagene() {
        if (formNu() === 'softice') return ['Softice'];
        if (!smageListe.length) return ønsket(tilstand);
        var ud = [];
        smageListe.forEach(function (s) {
          for (var i = 0; i < (tal[s] || 0); i++) ud.push(s);
        });
        return ud;
      }
      function klar() {
        if (!vare) return false;
        var f = formNu();
        if (!f) return false;
        if (f === 'softice') return true;
        var n = r().kugler;
        if (!n || !smageListe.length) return true;
        return valgte() === n;
      }
      function næsteSkridt() {
        if (!vare) return 'Vælg en isboks';
        if (!formNu()) return 'Vælg kugler eller softice';
        return 'Fordel ' + r().kugler + ' kugler på smagene';
      }

      function tælleRække(s, n) {
        var række = lav('div', 'isbyg-tael');
        række.setAttribute('data-smag', s);
        række.appendChild(lav('span', 'isbyg-tael-navn', s));
        var ned = lav('button', 'isbyg-tael-knap', '−');
        var tl = lav('span', 'isbyg-tael-tal', String(tal[s] || 0));
        var op = lav('button', 'isbyg-tael-knap', '+');
        ned.type = op.type = 'button';
        ned.setAttribute('aria-label', 'Én kugle mindre ' + s);
        op.setAttribute('aria-label', 'Én kugle mere ' + s);
        ned.disabled = !(tal[s] > 0);
        /* ⚠️ BOKSEN KAN IKKE BLIVE FULDERE END FULD. Kan man trykke
           en syvende kugle ind i en boks til seks, skal køkkenet
           vælge, hvilken der ikke kommer med. */
        op.disabled = valgte() >= n;
        ned.addEventListener('click', function () { tal[s] = Math.max(0, (tal[s] || 0) - 1); tegnOm(); });
        op.addEventListener('click', function () { if (valgte() < n) { tal[s] = (tal[s] || 0) + 1; tegnOm(); } });
        række.appendChild(ned);
        række.appendChild(tl);
        række.appendChild(op);
        return række;
      }

      function tegnOm() {
        beskriv.textContent = vare && vare.beskrivelse ? vare.beskrivelse : '';
        beskriv.hidden = !beskriv.textContent;

        /* Formen: kun når boksen har et softice-alternativ. */
        tøm(vf);
        var harValg = !!(vare && r().softice);
        if (tForm) tForm.boks.hidden = vare ? !harValg : false;
        if (tForm && (!vare || harValg)) {
          laas(tForm, !!vare);
          var n0 = r().kugler || 6;
          [['kugler', n0 + ' kugler', 'efter eget valg'], ['softice', 'Softice', 'fyldt med softice']]
            .forEach(function (x) {
              var k = knap(x[1], x[2]);
              k.setAttribute('data-form', x[0]);
              k.classList.toggle('valgt', form === x[0]);
              k.setAttribute('aria-pressed', form === x[0] ? 'true' : 'false');
              k.addEventListener('click', function () { form = x[0]; tegnOm(); });
              k.disabled = !vare;
              vf.appendChild(k);
            });
        }

        var f = formNu();
        var n = r().kugler;
        tøm(tSmag.krop);
        tSmag.boks.hidden = f === 'softice';
        laas(tSmag, !!vare && f === 'kugler');
        if (!vare || !f) {
          tSmag.krop.appendChild(lav('p', 'isbyg-hint',
            harValg || !vare ? 'Vælg først kugler eller softice.' : 'Vælg først en isboks.'));
        } else if (f === 'kugler' && n && smageListe.length) {
          var status = lav('p', 'isbyg-status');
          status.textContent = valgte() + ' af ' + n + ' kugler valgt';
          status.classList.toggle('fuld', valgte() === n);
          tSmag.krop.appendChild(status);
          smageListe.forEach(function (s) { tSmag.krop.appendChild(tælleRække(s, n)); });
        } else if (f === 'kugler') {
          tSmag.krop.appendChild(ønskeFelt(tilstand));
        }

        b.sum.textContent = vare ? 'I alt ' + kr(vare.pris) : '';
        b.knap.textContent = klar() ? 'Læg i kurven · ' + kr(vare.pris) : næsteSkridt();
        b.knap.disabled = !klar();
      }

      tegnOm();
    }

    /* ============================================================
       3) DESSERTERNE
       ------------------------------------------------------------
       En bubblewaffle, et par pandekager, churros: en ret med sit
       eget indhold. Et is-sted viser dem som et kort pr. ret. Står
       der kugler i retten, spørges der om deres smag — og kun dér;
       resten lægges i kurven med ét tryk.
       ============================================================ */
    function flowDesserter(flade) {
      var liste = lav('div', 'isbyg-desserter');
      flade.appendChild(liste);
      var åben = null;

      g.dessert.forEach(function (v) {
        var r = rolle(v, data);
        var kort = lav('div', 'isbyg-dessert');
        kort.setAttribute('data-vare', v.navn);
        var top = lav('div', 'isbyg-dessert-top');
        var tekst = lav('div', 'isbyg-dessert-tekst');
        tekst.appendChild(lav('span', 'isbyg-dessert-navn', v.navn));
        if (v.beskrivelse) tekst.appendChild(lav('span', 'isbyg-dessert-beskriv', v.beskrivelse));
        top.appendChild(tekst);
        top.appendChild(lav('span', 'isbyg-dessert-pris', kr(v.pris)));
        kort.appendChild(top);

        var spørg = r.kugler > 0 || r.softice;
        var tag = lav('button', 'isbyg-tag');
        tag.type = 'button';
        tag.textContent = spørg ? 'Vælg' : 'Læg i kurven';
        kort.appendChild(tag);

        var detaljer = lav('div', 'isbyg-dessert-valg');
        detaljer.hidden = true;
        kort.appendChild(detaljer);

        if (!spørg) {
          tag.addEventListener('click', function () {
            læg({ vare: v, variant: null, kugler: 0, smage: [], ekstra: [] });
          });
        } else {
          tag.addEventListener('click', function () {
            if (åben && åben !== kort) {
              åben.querySelector('.isbyg-dessert-valg').hidden = true;
              åben.querySelector('.isbyg-tag').hidden = false;
              åben.classList.remove('aaben');
            }
            åben = kort;
            kort.classList.add('aaben');
            tag.hidden = true;
            detaljer.hidden = false;
            tegnDetaljer();
          });
        }

        var form = r.softice ? null : 'kugler';
        var smage = [];
        var tilstand = { ønske: '' };

        function klar() {
          if (!form) return false;
          if (form === 'softice' || !r.kugler || !smageListe.length) return true;
          for (var i = 0; i < r.kugler; i++) if (!String(smage[i] || '').trim()) return false;
          return true;
        }

        function tegnDetaljer() {
          tøm(detaljer);
          if (r.softice) {
            var vf = lav('div', 'isbyg-valg');
            [['kugler', r.kugler + (r.kugler === 1 ? ' kugle' : ' kugler')], ['softice', 'Softice']]
              .forEach(function (x) {
                var k = knap(x[1]);
                k.setAttribute('data-form', x[0]);
                k.classList.toggle('valgt', form === x[0]);
                k.setAttribute('aria-pressed', form === x[0] ? 'true' : 'false');
                k.addEventListener('click', function () { form = x[0]; smage = []; tegnDetaljer(); });
                vf.appendChild(k);
              });
            detaljer.appendChild(vf);
          }
          if (form === 'kugler' && r.kugler) {
            if (smageListe.length) {
              for (var i = 0; i < r.kugler; i++) {
                detaljer.appendChild(smagsVælger(
                  r.kugler > 1 ? 'Kugle ' + (i + 1) : 'Smagen', smage, i, tegnDetaljer));
              }
            } else {
              detaljer.appendChild(ønskeFelt(tilstand));
            }
          }
          var b = bund(v.navn);
          b.knap.className = 'isbyg-laeg isbyg-laeg-dessert';
          b.sum.textContent = 'I alt ' + kr(v.pris);
          b.knap.textContent = klar() ? 'Læg i kurven · ' + kr(v.pris)
            : (!form ? 'Vælg kugler eller softice'
              : (r.kugler > 1 ? 'Vælg smag til alle kuglerne' : 'Vælg smagen'));
          b.knap.disabled = !klar();
          b.knap.addEventListener('click', function () {
            if (!klar()) return;
            var smagene = form === 'softice' ? ['Softice']
              : (smageListe.length ? smage.slice(0, r.kugler) : ønsket(tilstand));
            læg({ vare: v, variant: null, kugler: r.kugler, smage: smagene, ekstra: [] });
            smage = []; tilstand.ønske = ''; form = r.softice ? null : 'kugler';
            detaljer.hidden = true; tag.hidden = false; kort.classList.remove('aaben');
            åben = null;
          });
          detaljer.appendChild(b.boks);
        }

        liste.appendChild(kort);
      });
    }

    /* ============================================================
       4) DET LØSE — købes, som det er
       ============================================================ */
    function flowLoes(flade) {
      var liste = lav('div', 'isbyg-desserter');
      g.loes.forEach(function (v) {
        var kort = lav('div', 'isbyg-dessert isbyg-loes');
        kort.setAttribute('data-vare', v.navn);
        var top = lav('div', 'isbyg-dessert-top');
        var tekst = lav('div', 'isbyg-dessert-tekst');
        tekst.appendChild(lav('span', 'isbyg-dessert-navn', v.navn));
        if (v.beskrivelse) tekst.appendChild(lav('span', 'isbyg-dessert-beskriv', v.beskrivelse));
        top.appendChild(tekst);
        top.appendChild(lav('span', 'isbyg-dessert-pris', kr(v.pris)));
        kort.appendChild(top);
        var tag = lav('button', 'isbyg-tag', 'Læg i kurven');
        tag.type = 'button';
        tag.addEventListener('click', function () {
          læg({ vare: v, variant: null, kugler: 0, smage: [], ekstra: [] });
        });
        kort.appendChild(tag);
        liste.appendChild(kort);
      });
      flade.appendChild(liste);
    }

    rod.appendChild(ud);
    vis(SLAGS[0].id);
    return { rod: ud, vis: vis };
  }

  return {
    byg: byg,
    kuglerI: kuglerI,
    erSoftice: erSoftice,
    rolle: rolle,
    grupper: grupper,
    ordn: ordn,
    opsaetning: opsaetning,
    stoerrelser: stoerrelser,
    iBrug: iBrug,
    kanBygges: kanBygges,
    ROLLER: ROLLER,
    ROLLE_NAVN: ROLLE_NAVN,
  };
}());
