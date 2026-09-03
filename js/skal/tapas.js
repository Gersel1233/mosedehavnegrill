/* ============================================================
   TAPASFADET — KOBLINGEN, IKKE SKALLEN

   Formularen er en anden slags end de to andre: man vælger ANTAL
   PERSONER, ikke rækker af retter. Prisen er pr. person, og
   fadets indhold aftales i telefonen — derfor står ring-kortet i
   designet, og det bliver stående.

   TO DAGES VARSEL. Ejerens ord (23/8): tapas skal bestilles to
   dage i forvejen. Det er ikke forretningens almindelige varsel —
   det er fadets eget — så det ligger som et "mindst" oveni.
   Forretningens eget varsel vinder, hvis det er længere; det kan
   aldrig sætte fadets ned.

   PRISEN ER IKKE SKREVET HER. Designet regner med 199 kr. pr.
   person og 150 kr. for cavaen. Begge tal er pladsholdere:
   ejerens liste kom uden ét eneste tal. Prisen hentes fra
   menukortet i admin, og er den ikke sat, står der "pris følger"
   i stedet for et tal, gæsten kommer til at regne med.
   ============================================================ */

(function () {
  'use strict';

  if (!window.Butik || !window.MosedeRegler || !window.MosedeSkal) return;

  var R = window.MosedeRegler;
  var S = window.MosedeSkal;

  /* Fadets eget varsel i timer. Ejeren kan sætte sit eget i
     indstillingerne (tapas_varsel_timer); ellers er det to dage,
     som aftalt. */
  var TO_DAGE = 48;

  var panel = document.getElementById('bestil-tapas');
  if (!panel) return;

  var data = null;
  var valgtDag = null;
  var fad = null;      // varen fra menukortet
  var bobler = null;   // tilkøbet, hvis det findes i menukortet

  /* ⚠️ EN KNAP, DER PEGER PÅ ET SKJULT PANEL, GØR INGENTING — OG
     DET STOD LIVE HER (3/9).

     MÅLT på et skud, ikke læst: uden tapasfadet i menukortet
     skjuler #bestil-tapas sig med vilje — men sidens ENESTE
     handling, den store røde "Bestil tapas", blev stående og
     pegede på det. Et tryk gjorde absolut ingenting: browseren
     hopper ikke til noget, den ikke kan se. Ingen fejl, ingen
     bevægelse, og ingen linje om hvorfor.

     Det er nøjagtig den fejl, kalenderens "Reservér plads" havde
     31/8, og rettelsen er den samme (pegVidere i
     js/skal/kalender.js): knapperne følger virkeligheden.

     ⚠️ OG NOTEN VED SELVE SKJULNINGEN PÅSTOD, AT DET VAR DÆKKET
     — "ring-kortet har et telefonnummer, der virker". Kortet
     ligger langt nede; knappen står lige for øjnene. En
     kommentar er ikke et værn.

     ⚠️ OG FADET KAN FORSVINDE MED ÉT TRYK I ADMIN. Melder
     køkkenet det udsolgt, eller slukker ejeren kategorien, står
     siden med en død knap. Det er ikke en teoretisk tilstand. */
  function pegVidere(kanBestille) {
    /* ⚠️ NUMMERET LÆSES AF SIDEN, IKKE AF window.MOSEDE.
       js/oplysninger.js indlæses IKKE af m-tapas.html — MÅLT: min
       første udgave af funktionen her gjorde derfor ingenting,
       fordi dens egen gard mod et tomt nummer slog til. Det er
       samme regel som forespørgselssiderne følger med mailen:
       kontaktvejen står ÉT sted, i opmærkningen, og
       js/skal/kontakt.js har allerede byttet den, hvis ejeren har
       skrevet et andet nummer i admin. */
    var link = document.querySelector('a[href^="tel:"]');
    var nr = link ? (link.getAttribute('href') || '').slice(4) : '';
    /* Uden et nummer er et tomt tel:-link en blindgyde — så
       bliver knappen, som den er, og siden er som før. */
    if (!kanBestille && !nr) return;
    var mål = kanBestille ? '#bestil-tapas' : 'tel:' + nr;
    var ord = kanBestille ? 'Bestil tapas' : 'Ring og hør om et fad';

    [document.getElementById('bestil-pill'),
      document.querySelector('.sheet-cta a[href="#bestil-tapas"]'),
      document.querySelector('.sheet-cta a[href^="tel:"]')]
      .forEach(function (a) {
        if (!a) return;
        a.setAttribute('href', mål);
        /* Teksten står i en tekstknude ved siden af ikonet og
           glansen — hele indholdet må ikke skrives over, ellers
           forsvinder designets svg og .sheen. */
        Array.prototype.forEach.call(a.childNodes, function (n) {
          if (n.nodeType === 3 && n.nodeValue.trim()) n.nodeValue = ord;
        });
      });
  }

  function find(v, rod) {
    try { return (rod || panel).querySelector(v); } catch (e) { return null; }
  }
  function tøm(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst !== undefined && tekst !== null) el.textContent = tekst;
    return el;
  }

  function varsel() {
    var v = Number((data.indstillinger || {}).tapas_varsel_timer);
    return isFinite(v) && v > 0 ? v : TO_DAGE;
  }

  /* ⚠️ SIDEN LOVEDE ET VARSEL, DEN IKKE HOLDT (fundet 1/9).
     Designets tekst stod to steder — i manchetten øverst og i
     faktalinjen — og sagde begge "senest dagen før", mens fadets
     regel er 48 timer. Gæsten læste ét døgn, valgte i morgen, og
     dagvælgeren tilbød den ikke.

     Det er tredje gang: cateringens faktakort 30/8 og
     smørrebrødets hero 31/8. Rettelsen er den samme —
     [data-varsel] fyldes af REGLEN, og designets tekst er
     reserven, hvis noget går galt.

     ⚠️ ORDET SKAL VÆRE DAGE, NÅR DER ER DAGE: "senest 48 timer
     før" er sandt og ubrugeligt, når man planlægger en aften. */
  function skrivVarsel() {
    var el = document.querySelectorAll('[data-varsel]');
    if (!el.length) return;
    var timer = varsel();
    if (!timer || timer <= 0) return;
    var dage = Math.floor(timer / 24);
    var ord = dage >= 2 ? 'bestilles senest ' + dage + ' dage før'
      : dage === 1 ? 'bestilles senest dagen før'
        : 'bestilles senest ' + timer + (timer === 1 ? ' time' : ' timer') + ' før';
    el.forEach(function (e) { e.textContent = ord; });
  }

  /* Fadet SKAL findes i menukortet, før det kan bestilles.
     Ellers ville siden sende en vare, ingen har oprettet, og
     køkkenet fik en bestilling på noget, der ikke står på deres
     eget kort. Prisen må godt mangle — så står der "pris følger",
     og det er den samme regel som resten af kortet. */
  function findVarer() {
    var varer = (data.menu_varer || []).filter(function (v) {
      return v.aktiv !== false && !v.udsolgt;
    });
    fad = varer.filter(function (v) { return /tapas/i.test(v.navn); })[0] || null;
    bobler = varer.filter(function (v) {
      return /cava|champagne|bobler/i.test(v.navn);
    })[0] || null;
  }

  function antalPersoner() {
    var f = find('#tpers');
    return Math.max(0, Math.round(Number(f && f.value) || 0));
  }

  function antalBobler() {
    var t = find('.addon [data-step] b');
    return Math.max(0, Math.round(Number(t && t.textContent) || 0));
  }

  function pris(v) {
    return (v && typeof v.pris === 'number' && isFinite(v.pris)) ? v.pris : null;
  }

  // ----------------------------------------------------------
  //  DAGE OG TIDER
  // ----------------------------------------------------------
  function visDage() {
    var vælger = find('#tdato');
    if (!vælger) return;
    var dage = R.muligeDage(data, varsel());
    tøm(vælger);
    dage.forEach(function (iso) {
      var m = lav('option', null, S.dagTekst(iso));
      m.value = iso;
      vælger.appendChild(m);
    });
    valgtDag = dage.indexOf(valgtDag) === -1 ? dage[0] : valgtDag;
    if (valgtDag) vælger.value = valgtDag;
    return dage.length;
  }

  function visTider() {
    var vælger = find('#ttid');
    if (!vælger) return;
    var før = vælger.value;
    var tider = R.tiderFor(data, valgtDag, varsel());
    tøm(vælger);
    tider.forEach(function (t) {
      var m = lav('option', null, 'kl. ' + t);
      m.value = t;
      vælger.appendChild(m);
    });
    if (tider.indexOf(før) !== -1) vælger.value = før;
  }

  /* Etiketten siger "(tidligst i morgen)" i designet. Fadet
     kræver to dage, og tallet står i indstillingerne — så teksten
     skal komme derfra og ikke fra filen. */
  function visVarselTekst() {
    var lille = find('label[for="tdato"] span');
    if (!lille) return;
    var dage = Math.round(varsel() / 24);
    lille.textContent = dage >= 2
      ? '(mindst ' + dage + ' dage før)'
      : '(mindst 1 dag før)';
  }

  /* "Hvordan?" er lugens spørgsmål, og spis her er et flueben i
     admin. Er det ikke slået til, står der kun To-go — samme
     fremgangsmåde som dato- og tidsvælgeren, så feltet beholder
     sin plads i rækken af to. */
  function visHvordan() {
    var vælger = find('#thow');
    if (!vælger) return;
    var spisHer = (data.indstillinger || {}).spis_her === true;
    tøm(vælger);
    var togo = lav('option', null, 'To-go');
    togo.value = 'afhentning';
    vælger.appendChild(togo);
    if (spisHer) {
      var her = lav('option', null, 'Spis her');
      her.value = 'spis_her';
      vælger.appendChild(her);
    }
  }

  /* Cavaen står i designet med navn og pris. Findes den ikke i
     menukortet, kan den ikke bestilles — og så er rækken ude.
     At sende en vare, ingen har oprettet, er at finde på et
     produkt på forretningens vegne. */
  function visTilkøb() {
    var række = find('.addon');
    if (!række) return;
    if (!bobler) return void (række.style.display = 'none');

    var navn = find('.addon h4');
    var tekst = find('.addon p');
    if (navn) navn.textContent = bobler.navn;
    if (tekst) {
      tekst.textContent = bobler.beskrivelse
        || (pris(bobler) === null ? 'Pris følger' : S.kroner(bobler.pris) + ' pr. stk.');
    }
  }

  // ----------------------------------------------------------
  //  SUMMEN
  //  ----------------------------------------------------------
  //  Designets egen sumboks. Den inline-udregning, siden kom med,
  //  regner med 199 og 150 — vores lytter står efter dens og
  //  skriver det rigtige oveni.
  // ----------------------------------------------------------
  var fejlVises = false;

  function visSum() {
    var boks = find('#tsum');
    if (!boks) return;
    fejlVises = false;

    var n = antalPersoner();
    if (!n) {
      boks.textContent = 'Vælg antal personer, så regner vi prisen ud her';
      return;
    }

    var b = bobler ? antalBobler() : 0;
    var tid = find('#ttid');
    var hvordan = find('#thow');
    var dele = [n + ' × tapas' + (pris(fad) === null ? '' : ' à ' + S.kroner(fad.pris))];
    if (b) {
      dele.push(b + ' × ' + bobler.navn
        + (pris(bobler) === null ? '' : ' à ' + S.kroner(bobler.pris)));
    }
    if (hvordan) dele.push(hvordan.options[hvordan.selectedIndex].textContent);
    if (tid && tid.value) dele.push('kl. ' + tid.value);

    tøm(boks);
    /* Er prisen ikke sat i admin, står der "Pris følger" med fed
       i stedet for et tal. Et beløb, vi selv har fundet på, er
       værre end ingen pris: gæsten regner med det. */
    if (pris(fad) === null || (b && pris(bobler) === null)) {
      boks.appendChild(lav('b', null, 'Pris følger'));
    } else {
      /* b er nul, når der ikke er noget tilkøb — men bobler kan
         være null, og så kaster b * bobler.pris. Fejlen var tavs
         på skærmen: sumboksen beholdt bare designets pladsholder,
         og formularen så helt rigtig ud. */
      var total = n * fad.pris + (b && bobler ? b * bobler.pris : 0);
      boks.appendChild(lav('b', null, total.toLocaleString('da-DK') + ' kr.'));
    }
    boks.appendChild(document.createTextNode(dele.join(' · ')));
  }

  function brøl(besked, feltId) {
    var boks = find('#tsum');
    if (boks) boks.textContent = '⚠ ' + besked;
    fejlVises = true;
    var f = feltId ? find('#' + feltId) : null;
    if (f) f.focus();
  }

  // ----------------------------------------------------------
  //  AFSENDELSEN
  // ----------------------------------------------------------
  function send() {
    var navn = (find('#tnavn') || {}).value || '';
    var tlf = (find('#ttlf') || {}).value || '';
    var besked = (find('#tbesked') || {}).value || '';
    var tid = find('#ttid');
    var hvordan = find('#thow');
    var n = antalPersoner();
    var b = bobler ? antalBobler() : 0;

    if (n < 1) return brøl('Skriv hvor mange I er.', 'tpers');
    if (navn.trim().length < 2) return brøl('Skriv dit navn.', 'tnavn');
    if (tlf.replace(/[^0-9]/g, '').length < 8) {
      return brøl('Skriv et telefonnummer, vi kan få fat i dig på.', 'ttlf');
    }
    if (!valgtDag || !tid || !tid.value) return brøl('Vælg en dag og et tidspunkt.');

    var linjer = [{ navn: fad.navn, antal: n, pris: fad.pris }];
    if (b) linjer.push({ navn: bobler.navn, antal: b, pris: bobler.pris });

    var knap = find('button.g.solid.blk');
    if (knap) knap.disabled = true;

    Butik.bestil({
      navn: navn,
      telefon: tlf,
      hent_dato: valgtDag,
      hent_tid: tid.value,
      hvordan: hvordan ? hvordan.value : 'afhentning',
      besked: besked,
      linjer: linjer,
    }).then(function (raekke) {
      S.kvittering(panel, raekke, data.indstillinger || {});
    }).catch(function (fejl) {
      if (knap) knap.disabled = false;
      console.warn('Tapasbestillingen kunne ikke sendes:', fejl);
      brøl('Bestillingen kunne ikke sendes. Prøv igen — eller ring til os.');
    });
  }

  /* .getlist er designets liste af punkter med et hjerte-ikon pr.
     linje. Det FØRSTE span klones som skabelon, så ikonet er
     designets eget og ikke en kopi her i koden — flytter designet
     sig, følger listen med. */
  function visIndhold() {
    /* ⚠️ DOKUMENTET, IKKE PANELET. Filens find() søger i
       bestillingspanelet som standard, og "Det får I" står OVER
       panelet — med standard-roden fandtes listen aldrig, og
       designets punkter blev stående, mens alt andet så rigtigt
       ud. Fundet ved at måle i øvetilstand, ikke ved at læse. */
    var liste = find('.getlist', document);
    if (!liste || !fad) return;

    var punkter = String(fad.beskrivelse || '').split('·')
      .map(function (l) { return l.trim(); })
      .filter(Boolean);
    if (!punkter.length) return;

    var skabelon = liste.querySelector('span');
    if (!skabelon) return;

    liste.textContent = '';
    punkter.forEach(function (p) {
      var s = skabelon.cloneNode(true);
      /* Klonens tekstknuder fjernes, og punktet sættes ind — svg'et
         bliver stående. textContent på spannet ville slette ikonet. */
      Array.prototype.slice.call(s.childNodes).forEach(function (k) {
        if (k.nodeType === 3) s.removeChild(k);
      });
      s.appendChild(document.createTextNode(p));
      liste.appendChild(s);
    });
  }

  // ----------------------------------------------------------
  //  START
  // ----------------------------------------------------------
  function byg(d) {
    data = d;
    findVarer();

    /* "Det får I" er EJERENS liste, når han har skrevet den —
       fadets beskrivelse fra menukortet (admin → Menukort →
       Havnens tapas), "·"-adskilt som ejerens liste skrev den.
       Uden en beskrivelse står designets egen liste: vi
       overskriver kun, når databasen har noget at sige. Kaldes
       FØR lukket-værnet nedenfor — listen sælger fadet, også når
       der ikke kan bestilles. */
    visIndhold();

    var lukket = ((d.indstillinger || {}).saeson || {}).lukket
      || (d.indstillinger || {}).bestilling_aaben === false;

    /* Uden fadet i menukortet kan der ikke bestilles. Panelet
       ryger, men resten af siden bliver: den sælger stadig fadet,
       og ring-kortet har et telefonnummer, der virker. */
    if (lukket || !fad) {
      panel.style.display = 'none';
      pegVidere(false);
      return;
    }
    pegVidere(true);

    visVarselTekst();
    visHvordan();
    visTilkøb();
    if (!visDage()) {
      panel.style.display = 'none';
      pegVidere(false);
      return;
    }
    visTider();
    visSum();

    var dato = find('#tdato');
    if (dato) {
      dato.addEventListener('change', function () {
        valgtDag = dato.value;
        visTider();
        visSum();
      });
    }
    ['#ttid', '#thow'].forEach(function (v) {
      var el = find(v);
      if (el) el.addEventListener('change', visSum);
    });
    var pers = find('#tpers');
    if (pers) pers.addEventListener('input', visSum);

    var trin = find('.addon [data-step]');
    // Designets egen lytter tæller op; vores skal regne BAGEFTER.
    if (trin) trin.addEventListener('click', function () { setTimeout(visSum, 0); });

    ['#tnavn', '#ttlf'].forEach(function (v) {
      var el = find(v);
      if (el) el.addEventListener('input', function () { if (fejlVises) visSum(); });
    });

    var knap = find('button.g.solid.blk');
    if (knap) {
      knap.type = 'button';
      knap.addEventListener('click', send);
    }
  }

  /* Den tomme billedplads øverst. Reglen bor i
     js/skal/billedplads.js — forsiden og baglokalets side har den
     samme kasse, og tre kopier ville tegne tre forskellige flader.

     ⚠️ OG DEN SKAL OP, OGSÅ NÅR HENTNINGEN FEJLER. Fladen har
     ingen data bag sig; tegnet står i HTML'en. Lod vi den stå i
     .catch, ville en side, hvor databasen er nede, være den side
     med en stiplet grå kasse øverst — og det er lige præcis den
     dag, den skal se hel ud. */
  function fyldPladser(d) {
    if (!window.MosedeBilledplads) return;
    try {
      window.MosedeBilledplads.fyld((d && d.indstillinger) || {});
    } catch (e) {
      console.warn('Billedpladsen på tapassiden fejlede:', e);
    }
  }

  Butik.hent().then(function (d) {
    byg(d);
    skrivVarsel();
    fyldPladser(d);
  }).catch(function (fejl) {
    console.warn('Tapaskoblingen fejlede, skallen står som designet:', fejl);
    fyldPladser(null);
  });
}());
