/* ============================================================
   BESTIL SMØRREBRØD UD AF HUSET

   Det er den eneste formular på hele hjemmesiden, og den er den
   eneste ting en gæst skriver i databasen.

   ------------------------------------------------------------
   DET ER EN BESTILLING, IKKE EN WEBSHOP
   ------------------------------------------------------------
   Der betales ikke her. Det er ikke en mangel, det er det ærlige:
   forretningen har ikke oplyst hvordan man betaler på forhånd,
   hvor lang tid i forvejen der skal bestilles, om der er et
   mindsteantal, eller om der leveres. Fire ting vi ikke ved.

   Så gæsten sender hvad hun gerne vil have og hvornår, og
   forretningen ringer og bekræfter. Det er den samme aftale som
   før, bare uden at nogen skal fange nogen i telefonen midt i en
   frokost. Betaling sker ved afhentning – kontant, kort og
   MobilePay, som står på siden i forvejen.

   Varslet (24 timer) og mindsteantallet (1) står i indstillinger
   og kan rettes i admin. De er UDGANGSPUNKTER formularen skal have
   for at kunne regne en tidligste dag ud – ikke oplysninger vi har
   fået. Retter ejeren dem, følger teksten på siden med af sig selv.

   ------------------------------------------------------------
   TO SLAGS VALG, FORDI KORTET ER SKRUET SÅDAN SAMMEN
   ------------------------------------------------------------
   Kategorien "Smørrebrød" har fem slags MED pris. Kategorien
   "Vælg fyld til smørrebrødet" har 29 slags UDEN pris, for et fyld
   er ikke en vare man køber – det er hvad der skal ligge på
   stykket.

   Derfor: stykker med antal og pris øverst, fyld som ønsker
   nedenunder. Havde de ligget i samme kurv, ville fire stykker med
   tre slags fyld være blevet syv stykker, og personalet ville
   pakke forkert.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function tøm(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = String(tekst);
    return e;
  }

  /* Kurven ligger i localStorage. Genindlæser man siden – eller
     trykker på et link og går tilbage – skal man ikke vælge otte
     stykker smørrebrød forfra. Kun valgene, ikke navn og telefon:
     personoplysninger skal ikke ligge i en browser længere end de
     skal. */
  var KURV_NOEGLE = 'mosede_kurv_v1';

  var kurv = { stk: {}, fyld: [] };
  var data = null;
  var valgtDag = null;

  function læsKurv() {
    try {
      var r = localStorage.getItem(KURV_NOEGLE);
      if (!r) return;
      var k = JSON.parse(r);
      if (k && typeof k === 'object') {
        kurv.stk = k.stk || {};
        kurv.fyld = Array.isArray(k.fyld) ? k.fyld : [];
      }
    } catch (e) { /* privat browsing – kurven starter bare tom */ }
  }

  function gemKurv() {
    try { localStorage.setItem(KURV_NOEGLE, JSON.stringify(kurv)); }
    catch (e) { /* se ovenfor */ }
  }

  // ----------------------------------------------------------
  //  VARERNE
  // ----------------------------------------------------------
  /* Udvælgelsen ligger i js/store.js som Butik.smoerrebroed, ikke
     her. Forsiden viser nu også de fem slags og tæller fyldene, og
     stod regexen "smørrebrød|fyld" to steder, ville den ene før eller
     siden blive rettet uden den anden. Stykkerne er dem MED pris,
     fyldene dem uden – se noten i store.js. */
  function stykker(d) { return Butik.smoerrebroed(d).stykker; }
  function fyldene(d) { return Butik.smoerrebroed(d).fyld; }

  // ----------------------------------------------------------
  //  HVILKE DAGE OG TIDER KAN MAN HENTE?
  //  --------------------------------------------------------
  //  Der findes ikke en fri dato. Dagene regnes ud af
  //  åbningstiderne, lukkedagene og vinterlukket, så gæsten ikke
  //  kan vælge en dag hvor lugen er lukket. En datovælger med
  //  alle årets dage ville lade hende bestille til 1. januar.
  // ----------------------------------------------------------
  var DAGE_FREM = 28;

  function isoPlus(iso, dage) {
    // Middag i UTC: så flytter et døgn ikke datoen ved sommertid
    var t = new Date(iso + 'T12:00:00Z');
    t.setUTCDate(t.getUTCDate() + dage);
    return t.toISOString().slice(0, 10);
  }

  function ugedagFor(iso) {
    // Butik.nu() giver 0 = mandag. Date giver 0 = søndag.
    var d = new Date(iso + 'T12:00:00Z').getUTCDay();
    return (d + 6) % 7;
  }

  function planFor(d, iso) {
    // Butik.lukketDen dækker også en lukkeperiode over flere dage.
    // Med den gamle sammenligning på ét dato-felt kunne gæsten
    // bestille midt i vinterlukningen.
    if (Butik.lukketDen(d, iso)) return null;
    var p = (d.aabningstider || []).filter(function (a) {
      return a.ugedag === ugedagFor(iso);
    })[0];
    if (!p || p.lukket) return null;
    if (!p.aabner || !p.lukker) return null;
    return p;
  }

  function varselTimer(d) {
    var v = Number((d.indstillinger || {}).bestilling_varsel_timer);
    return isFinite(v) && v >= 0 ? v : 24;
  }

  function minStk(d) {
    var v = Number((d.indstillinger || {}).bestilling_min_stk);
    return isFinite(v) && v >= 1 ? Math.round(v) : 1;
  }

  /* Det tidligste øjeblik der kan hentes, som {dato, minutter} i
     dansk tid. Butik.nu() er dansk tid – det er hele grunden til at
     den findes – så varslet lægges oveni derfra. */
  function tidligst(d) {
    var nu = Butik.nu();
    var minutter = nu.minutter + varselTimer(d) * 60;
    var dato = nu.dato;
    while (minutter >= 24 * 60) { minutter -= 24 * 60; dato = isoPlus(dato, 1); }
    return { dato: dato, minutter: minutter };
  }

  /* Tiderne på en dag: hver halve time, og sidste tid en halv time
     før der lukkes, så der er tid til at række posen ud af lugen.
     Er dagen den tidligst mulige, ryger tiderne før varslet. */
  function tiderFor(d, iso) {
    var p = planFor(d, iso);
    if (!p) return [];

    var fra = Butik.tilMinutter(p.aabner);
    var til = Butik.tilMinutter(p.lukker) - 30;
    var t = tidligst(d);
    if (iso === t.dato) fra = Math.max(fra, Math.ceil(t.minutter / 30) * 30);

    var ud = [];
    for (var m = fra; m <= til; m += 30) {
      ud.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2));
    }
    return ud;
  }

  function muligeDage(d) {
    var t = tidligst(d);
    var ud = [];
    for (var i = 0; i < DAGE_FREM && ud.length < 14; i++) {
      var iso = isoPlus(t.dato, i);
      if (tiderFor(d, iso).length) ud.push(iso);
    }
    return ud;
  }

  var MAANED = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'juni',
    'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];

  function dagNavn(d, iso) {
    var i_dag = Butik.nu().dato;
    if (iso === i_dag) return 'I dag';
    if (iso === isoPlus(i_dag, 1)) return 'I morgen';
    return Butik.UGEDAGE[ugedagFor(iso)].slice(0, 3) + '.';
  }

  function dagDato(iso) {
    return Number(iso.slice(8, 10)) + '. ' + MAANED[Number(iso.slice(5, 7)) - 1];
  }

  // ----------------------------------------------------------
  //  TEGN
  // ----------------------------------------------------------
  function visStykker() {
    var boks = $('bestil-stykker');
    tøm(boks);

    var liste = stykker(data);
    if (!liste.length) {
      boks.appendChild(lav('p', 'desc',
        'Vi kan ikke hente udvalget lige nu. Ring til os – vi tager den over telefonen.'));
      return;
    }

    liste.forEach(function (v) {
      var r = lav('div', 'stk-linje');

      var tekst = lav('div', 'stk-tekst');
      tekst.appendChild(lav('span', 'navn', v.navn));
      if (v.beskrivelse) tekst.appendChild(lav('p', 'desc', v.beskrivelse));
      r.appendChild(tekst);

      r.appendChild(lav('span', 'stk-pris', window.MosedePris(v.pris)));

      /* Tælleren. To knapper og et tal, ikke et talfelt: på en
         telefon åbner et talfelt tastaturet og dækker halvdelen af
         listen, og man skal alligevel kun én op eller ned. */
      var taeller = lav('div', 'taeller');
      var ned = lav('button', 'glass rund', '−');
      var tal = lav('span', 'taeller-tal', kurv.stk[v.navn] || 0);
      var op = lav('button', 'glass rund', '+');

      ned.type = op.type = 'button';
      ned.setAttribute('aria-label', 'Én færre ' + v.navn);
      op.setAttribute('aria-label', 'Én mere ' + v.navn);
      tal.setAttribute('aria-live', 'polite');
      tal.setAttribute('aria-label', 'Antal ' + v.navn);

      function saet(n) {
        n = Math.max(0, Math.min(200, n));
        if (n) kurv.stk[v.navn] = n; else delete kurv.stk[v.navn];
        tal.textContent = n;
        r.classList.toggle('valgt', n > 0);
        ned.disabled = n === 0;
        gemKurv();
        visSum();
      }

      ned.addEventListener('click', function () { saet((kurv.stk[v.navn] || 0) - 1); });
      op.addEventListener('click', function () { saet((kurv.stk[v.navn] || 0) + 1); });

      taeller.appendChild(ned);
      taeller.appendChild(tal);
      taeller.appendChild(op);
      r.appendChild(taeller);

      saet(kurv.stk[v.navn] || 0);
      boks.appendChild(r);
    });
  }

  /* ---- FYLDET GRUPPERES ----

     29 slags i én bunke er en mur. Grupperne herunder er en
     LÆSEHJÆLP vi lægger ovenpå, ikke data: de findes som ordlister
     her og ikke som en kolonne i databasen, så personalet kan skrive
     et nyt fyld i admin uden først at skulle vælge en gruppe. Et
     fyld der ikke passer nogen steder, havner i "Andet godt" i
     stedet for at forsvinde.

     Rækkefølgen betyder noget. "Æggesalat med bacon" indeholder både
     "æg" og "bacon", og den hører under salater. Derfor prøves
     grupperne i rækkefølge, og den første der passer, vinder. */
  var GRUPPER = [
    { navn: 'Salater',
      ord: ['salat', 'wienersalat', 'skinkesalat', 'hønsesalat', 'makrelsalat'] },
    { navn: 'Fisk og skaldyr',
      ord: ['fisk', 'sild', 'rejer', 'makrel', 'laks'] },
    { navn: 'Kød og pålæg',
      ord: ['flæskesteg', 'pølse', 'rullepølse', 'roastbeef', 'skinke', 'kylling',
            'spegepølse', 'leverpostej', 'dyrlægens', 'frikadelle', 'bacon', 'kød'] },
    { navn: 'Æg og kartoffel', ord: ['æg', 'kartoffel', 'spejlæg'] },
    { navn: 'Ost og grønt', ord: ['ost', 'tomat', 'agurk', 'peberfrugt'] }
  ];

  function gruppeFor(navn) {
    var lille = String(navn).toLowerCase();
    for (var i = 0; i < GRUPPER.length; i++) {
      for (var j = 0; j < GRUPPER[i].ord.length; j++) {
        if (lille.indexOf(GRUPPER[i].ord[j]) !== -1) return GRUPPER[i].navn;
      }
    }
    return 'Andet godt';
  }

  function visFyld() {
    var boks = $('bestil-fyld');
    tøm(boks);

    var liste = fyldene(data);
    if (!liste.length) { $('bestil-fyld-trin').classList.add('skjult'); return; }

    var efterGruppe = {};
    liste.forEach(function (v) {
      var g = gruppeFor(v.navn);
      (efterGruppe[g] = efterGruppe[g] || []).push(v);
    });

    // Grupperne i den rækkefølge de er defineret, "Andet godt" sidst
    var raekke = GRUPPER.map(function (g) { return g.navn; }).concat(['Andet godt']);
    var kasser = {};
    raekke.forEach(function (navn) {
      if (!efterGruppe[navn] || !efterGruppe[navn].length) return;
      var gr = lav('div', 'fyld-gruppe');
      gr.appendChild(lav('div', 'eyebrow', navn));
      var pilleboks = lav('div', 'fyld-valgene');
      gr.appendChild(pilleboks);
      boks.appendChild(gr);
      kasser[navn] = pilleboks;
    });

    liste.forEach(function (v) {
      /* Et rigtigt afkrydsningsfelt, skjult bag pillen. Så virker
         tastatur, oplæsning og "vælg alle" af sig selv – en div med
         en klik-lytter gør ingen af de tre ting. */
      var id = 'fyld-' + v.id;
      var etiket = lav('label', 'fyld-valg');
      etiket.setAttribute('for', id);

      var boksen = document.createElement('input');
      boksen.type = 'checkbox';
      boksen.id = id;
      boksen.value = v.navn;
      boksen.checked = kurv.fyld.indexOf(v.navn) !== -1;

      boksen.addEventListener('change', function () {
        var i = kurv.fyld.indexOf(v.navn);
        if (boksen.checked && i === -1) kurv.fyld.push(v.navn);
        if (!boksen.checked && i !== -1) kurv.fyld.splice(i, 1);
        etiket.classList.toggle('valgt', boksen.checked);
        gemKurv();
        visSum();
      });

      etiket.classList.toggle('valgt', boksen.checked);
      etiket.appendChild(boksen);
      etiket.appendChild(lav('span', null, v.navn));
      (kasser[gruppeFor(v.navn)] || boks).appendChild(etiket);
    });
  }

  function visDage() {
    var boks = $('bestil-dage');
    tøm(boks);

    var dage = muligeDage(data);
    if (!dage.length) {
      boks.appendChild(lav('p', 'desc',
        'Vi kan ikke se nogen åbne dage lige nu. Ring til os, så finder vi en tid.'));
      return;
    }

    if (dage.indexOf(valgtDag) === -1) valgtDag = dage[0];

    dage.forEach(function (iso) {
      var b = lav('button', 'dag' + (iso === valgtDag ? ' valgt' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', iso === valgtDag ? 'true' : 'false');
      b.appendChild(lav('span', 'dag-navn', dagNavn(data, iso)));
      b.appendChild(lav('span', 'dag-dato', dagDato(iso)));
      b.addEventListener('click', function () {
        valgtDag = iso;
        visDage();
        visTider();
        visSum();
      });
      boks.appendChild(b);
    });
  }

  function visTider() {
    var vaelg = $('bestil-tid');
    var foer = vaelg.value;
    tøm(vaelg);

    var tider = tiderFor(data, valgtDag);
    tider.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t;
      o.textContent = 'kl. ' + t.replace(':', '.');
      vaelg.appendChild(o);
    });
    if (tider.indexOf(foer) !== -1) vaelg.value = foer;
  }

  function antalIKurv() {
    var n = 0;
    for (var k in kurv.stk) n += kurv.stk[k];
    return n;
  }

  function prisIKurv() {
    var sum = 0;
    var liste = stykker(data);
    for (var k in kurv.stk) {
      var v = liste.filter(function (x) { return x.navn === k; })[0];
      if (v) sum += Number(v.pris) * kurv.stk[k];
    }
    return sum;
  }

  function visSum() {
    var n = antalIKurv();
    var pris = prisIKurv();
    var min = minStk(data);

    /* KVITTERINGSLINJEN KOMMER FØRST NÅR DER ER NOGET I KURVEN.

       Den stod før og svævede hen over siden med "Vælg hvor mange
       stykker du vil have" fra det øjeblik man landede – en klæbende
       bjælke der irettesatte gæsten for ikke at have gjort noget
       endnu. Nu er siden ren indtil man vælger, og så glider linjen
       op og kvitterer for valget. */
    var kurvBar = $('bestil-kurv');
    if (kurvBar) kurvBar.classList.toggle('skjult', n === 0);

    var tekst = $('bestil-sum-tekst');
    if (n) {
      tekst.textContent = n + (n === 1 ? ' stykke' : ' stykker')
        + (pris ? ' · ' + window.MosedePris(pris) : '')
        + (kurv.fyld.length ? ' · ' + kurv.fyld.length + ' slags fyld' : '');
    }

    /* Noten på den foldede fyld-blok. Den er lukket til at begynde
       med, så uden et tal her ville man ikke kunne se om man havde
       valgt noget uden at åbne den igen. */
    var fyldTal = $('fyld-valgt');
    if (fyldTal) {
      fyldTal.textContent = kurv.fyld.length
        ? kurv.fyld.length + (kurv.fyld.length === 1 ? ' slags valgt' : ' slags valgt')
        : 'frivilligt';
      fyldTal.classList.toggle('valgt', kurv.fyld.length > 0);
    }

    /* HENTETID OG KONTAKTOPLYSNINGER FINDES IKKE FØR DER ER NOGET I
       KURVEN. En hentetid til ingen mad er ikke et spørgsmål, og de
       to blokke er det der får siden til at se lang og krævende ud.
       Nu møder man én liste; resten kommer når man har valgt. */
    var detaljer = $('bestil-detaljer');
    if (detaljer) {
      var skalVises = n > 0;
      if (skalVises && detaljer.hidden) {
        detaljer.hidden = false;
        detaljer.classList.add('folder-ud');
      } else if (!skalVises) {
        detaljer.hidden = true;
        detaljer.classList.remove('folder-ud');
      }
    }

    var nok = n >= min;
    $('bestil-send').disabled = !nok;

    var advarsel = $('bestil-min');
    if (n && !nok) {
      advarsel.textContent = 'Der skal mindst være ' + min + ' stykker.';
      advarsel.classList.remove('skjult');
    } else {
      advarsel.classList.add('skjult');
    }
  }

  // ----------------------------------------------------------
  //  FEJL I FELTERNE
  // ----------------------------------------------------------
  function visFejl(feltId, besked) {
    var felt = $(feltId);
    var boks = $('fejl-' + feltId.replace('bestil-', ''));
    if (!boks) return;
    if (besked) {
      boks.textContent = besked;
      boks.classList.remove('skjult');
      felt.setAttribute('aria-invalid', 'true');
      felt.setAttribute('aria-describedby', boks.id);
    } else {
      boks.textContent = '';
      boks.classList.add('skjult');
      felt.removeAttribute('aria-invalid');
      felt.removeAttribute('aria-describedby');
    }
  }

  // ----------------------------------------------------------
  //  SEND
  // ----------------------------------------------------------
  function send(ev) {
    ev.preventDefault();

    var navn = $('bestil-navn').value;
    var telefon = $('bestil-telefon').value;
    var email = $('bestil-email').value;
    var besked = $('bestil-besked-felt').value;

    var fejl = {
      navn: Butik.tjek.navn(navn, 'navn', 80),
      telefon: Butik.tjek.telefon(telefon),
      email: Butik.tjek.epost(email),
    };

    visFejl('bestil-navn', fejl.navn);
    visFejl('bestil-telefon', fejl.telefon);
    visFejl('bestil-email', fejl.email);

    /* Er fejlen i et foldet felt, skal folden åbnes. Ellers står
       beskeden i en blok der er hidden, og gæsten får en formular
       der nægter at sende uden at sige hvorfor. */
    if (fejl.email) {
      var mere = $('mere-knap');
      if (mere && mere.getAttribute('aria-expanded') !== 'true') mere.click();
    }

    var foerste = ['navn', 'telefon', 'email'].filter(function (k) { return fejl[k]; })[0];
    if (foerste) {
      // Læg markøren dér hvor fejlen er, og rul den frem
      var felt = $('bestil-' + foerste);
      felt.focus();
      return;
    }

    var tid = $('bestil-tid').value;
    if (!valgtDag || !tid) {
      sigFejl('Vælg en dag og en tid.');
      return;
    }
    if (antalIKurv() < minStk(data)) {
      sigFejl('Vælg hvor mange stykker du vil have.');
      return;
    }

    var linjer = [];
    var liste = stykker(data);
    for (var k in kurv.stk) {
      var v = liste.filter(function (x) { return x.navn === k; })[0];
      linjer.push({ navn: k, antal: kurv.stk[k], pris: v ? v.pris : null });
    }

    var knap = $('bestil-send');
    knap.disabled = true;
    knap.textContent = 'Sender …';
    sigFejl('');

    Butik.bestil({
      navn: navn, telefon: telefon, email: email, besked: besked,
      hent_dato: valgtDag, hent_tid: tid,
      linjer: linjer, fyld: kurv.fyld.slice(),
    }).then(function (b) {
      visTak(b);
      // Kurven er sendt. Den skal ikke stå og vente på næste besøg.
      kurv = { stk: {}, fyld: [] };
      gemKurv();
    }).catch(function (e) {
      knap.disabled = false;
      knap.textContent = 'Send';
      sigFejl(e.message || 'Bestillingen kunne ikke sendes. Ring til os i stedet.');
    });
  }

  function sigFejl(besked) {
    var boks = $('bestil-fejl');
    boks.textContent = besked || '';
    boks.classList.toggle('skjult', !besked);
    if (besked) boks.scrollIntoView({ block: 'center' });
  }

  function visTak(b) {
    var form = $('bestil-form');
    var tak = $('bestil-tak');

    form.classList.add('skjult');
    tøm(tak);

    tak.appendChild(lav('div', 'eyebrow', 'Vi har den'));
    tak.appendChild(lav('h3', null, 'Tak, ' + b.navn.split(' ')[0] + '.'));

    /* Præcis hvad der sker nu, og hvad der IKKE er sket. Der er
       ikke betalt, og bestillingen er ikke bekræftet af nogen
       endnu – det skal stå med det samme, ikke i småt. */
    tak.appendChild(lav('p', null,
      'Vi ringer til dig på ' + b.telefon + ' og bekræfter. '
      + 'Der er ikke betalt noget, og der er ikke trukket noget – '
      + 'du betaler når du henter.'));

    var kvit = lav('div', 'kvit');
    kvit.appendChild(kvitLinje('Reference', b.reference));
    kvit.appendChild(kvitLinje('Hentes', dagNavn(data, b.hent_dato) + ' '
      + dagDato(b.hent_dato) + ' kl. ' + b.hent_tid.replace(':', '.')));
    b.linjer.forEach(function (l) {
      kvit.appendChild(kvitLinje(l.antal + ' × ' + l.navn,
        l.pris ? window.MosedePris(l.pris * l.antal) : ''));
    });
    if (b.fyld.length) kvit.appendChild(kvitLinje('Fyld', b.fyld.join(', ')));
    if (b.besked) kvit.appendChild(kvitLinje('Din besked', b.besked));
    tak.appendChild(kvit);

    var m = window.MOSEDE;
    var knapper = lav('div', 'tags luft');
    var ring = lav('a', 'glass solid', m ? m.telefonPent : 'Ring til os');
    ring.href = 'tel:' + (m ? m.telefon : '');
    knapper.appendChild(ring);
    var igen = lav('button', 'glass sm', 'Bestil noget mere');
    igen.type = 'button';
    igen.addEventListener('click', function () {
      tak.classList.add('skjult');
      form.classList.remove('skjult');
      $('bestil-send').disabled = false;
      $('bestil-send').textContent = 'Send';
      visStykker(); visFyld(); visSum();
      form.scrollIntoView({ block: 'start' });
    });
    knapper.appendChild(igen);
    tak.appendChild(knapper);

    tak.classList.remove('skjult');
    tak.scrollIntoView({ block: 'center' });
    tak.focus();
  }

  function kvitLinje(navn, vaerdi) {
    var r = lav('div', 'kvit-linje');
    r.appendChild(lav('span', 'kvit-navn', navn));
    if (vaerdi) r.appendChild(lav('span', 'kvit-vaerdi', vaerdi));
    return r;
  }

  // ----------------------------------------------------------
  //  START
  //  --------------------------------------------------------
  //  Data kommer FRA js/smoerrebroed.js, som allerede har hentet
  //  dem. To Butik.hent() på samme side ville være to gange samme
  //  syv tabeller over en mobilforbindelse.
  // ----------------------------------------------------------
  function start(d) {
    data = d;
    if (!$('bestil-form')) return;

    var aaben = (d.indstillinger || {}).bestilling_aaben;
    if (aaben === false) {
      $('bestil-form').classList.add('skjult');
      $('bestil-lukket').classList.remove('skjult');
      return;
    }
    $('bestil-lukket').classList.add('skjult');

    var besked = (d.indstillinger || {}).bestilling_besked || '';
    var bel = $('bestil-besked');
    if (besked) { bel.textContent = besked; bel.classList.remove('skjult'); }
    else bel.classList.add('skjult');

    /* Varslet skrives ud som det ejeren har sat det. Står der 24,
       står der "et døgn i forvejen" – ikke "vi skal have god tid",
       som ikke betyder noget. */
    var timer = varselTimer(d);
    var vt = $('bestil-varsel');
    if (vt) {
      vt.textContent = timer >= 48
        ? 'Vi skal have bestillingen mindst ' + Math.round(timer / 24) + ' dage i forvejen.'
        : timer >= 24
          ? 'Vi skal have bestillingen mindst et døgn i forvejen.'
          : timer > 0
            ? 'Vi skal have bestillingen mindst ' + timer + ' timer i forvejen.'
            : '';
      vt.classList.toggle('skjult', !vt.textContent);
    }

    læsKurv();
    visStykker();
    visFyld();
    visDage();
    visTider();
    visSum();

    $('bestil-form').addEventListener('submit', send);

    /* ---- KURVEN FØRER VIDERE ----
       Et tryk ruller ned til hentetid og kontaktoplysninger. Det er
       den samme bevægelse som i en takeaway-kurv: se hvad du har,
       tryk videre, udfyld. */
    var kurvBar = $('bestil-kurv');
    if (kurvBar) {
      kurvBar.addEventListener('click', function () {
        var maal = $('bestil-detaljer');
        if (maal && !maal.hidden) maal.scrollIntoView({ block: 'start' });
      });
    }

    /* Og den forsvinder når Send-knappen er i syne. Er man nået
       derned, har man ikke brug for en genvej dertil – og en
       klæbende bjælke oven på det sidste felt er i vejen. */
    if (kurvBar && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        kurvBar.classList.toggle('naaet-bunden', es[0].isIntersecting);
      }, { rootMargin: '0px 0px -20% 0px' }).observe($('bestil-send'));
    }

    /* ---- DE FOLDEDE BLOKKE ----

       Et rigtigt <button aria-expanded> og et rigtigt hidden på
       kroppen. Ikke max-height og overflow: en skærmlæser skal have
       at vide at der ER noget mere, og hvad tilstanden er – og et
       felt der er skjult med højde 0 kan stadig få fokus med
       tabulator, hvilket sender markøren et sted man ikke kan se. */
    [['fyld-knap', 'bestil-fyld'], ['mere-knap', 'bestil-mere']].forEach(function (par) {
      var knap = $(par[0]);
      var krop = $(par[1]);
      if (!knap || !krop) return;
      knap.addEventListener('click', function () {
        var aaben = knap.getAttribute('aria-expanded') === 'true';
        knap.setAttribute('aria-expanded', aaben ? 'false' : 'true');
        krop.hidden = aaben;
      });
    });

    // Fejlen forsvinder når man retter feltet – ikke først når man
    // trykker Send igen
    ['navn', 'telefon', 'email'].forEach(function (k) {
      $('bestil-' + k).addEventListener('input', function () {
        visFejl('bestil-' + k, null);
      });
    });
  }

  window.MosedeBestilling = { start: start };
})();
