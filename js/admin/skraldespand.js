/* Fanen Skraldespand: det, der er slettet, og som stadig kan
   hentes tilbage. Se js/admin/kerne.js for de to principper, der
   gælder i alle admin-filerne.

   HVORFOR DEN FINDES
   ------------------------------------------------------------
   "Slet" var endeligt indtil nu. Et fejltryk på en iPad ved lugen
   — og en gæsts navn, telefonnummer og bestilling var væk. Der er
   ingen kopi, og gæsten kan ikke bare sende den igen: personalet
   kan ikke se rækken, men nøglerne og bremserne kunne. Derfor er
   "Slet" nu en dato i en kolonne, og rækken ligger her i 30 dage.

   FANEN HAR IKKE ET TAL PÅ
   ------------------------------------------------------------
   Med vilje. Et mærke med et tal betyder "her venter noget, du
   skal handle på", og det gør der ikke: spanden er et sted, man
   går hen, når man har lavet en fejl. Et tal ville gøre den til
   endnu en liste, personalet skal huske at kigge i.

   OPRYDNINGEN SKER HER
   ------------------------------------------------------------
   Der er ingen cron i det her projekt, så det, der er ældre end
   30 dage, slettes for alvor, når fanen åbnes. En knap, nogen
   skal huske at trykke på, er ikke en oprydning — og en spand,
   der aldrig tømmes, er et arkiv over kunders telefonnumre. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var DAGE = 30;

  /* Navnene på de fire slags. Nøglerne står også i js/store.js
     som SKRALD_TABELLER — kommer der en femte til, skal begge
     rettes, og listen her er den, personalet læser. */
  var SLAGS = {
    bestilling:    'Bestilling',
    forespoergsel: 'Forespørgsel',
    bord:          'Bordønske',
    udlejning:     'Baglokalet',
  };

  var spand = [];
  var toemt = false;

  function dageTilbage(iso) {
    var t = Date.parse(iso || '');
    if (!isFinite(t)) return null;
    var gaaet = (Date.now() - t) / 86400000;
    return Math.max(0, Math.ceil(DAGE - gaaet));
  }

  /* Hvad var det, der blev slettet? Kortet skal kunne læses uden
     at åbne noget: det er hele grunden til, at man er her. */
  function hvad(r) {
    if (r.slags === 'bestilling') {
      return (r.linjer || []).map(function (l) {
        return l.antal + ' × ' + l.navn;
      }).join(' · ') || (r.antal + ' stk.');
    }
    if (r.slags === 'bord') {
      return r.antal_personer + ' personer';
    }
    if (r.slags === 'udlejning') {
      return r.antal_personer ? r.antal_personer + ' personer' : 'Antal ikke oplyst';
    }
    var navne = { catering: 'Catering', baglokale: 'Baglokale', selskab: 'Selskab' };
    return navne[r.type] || r.type || '';
  }

  function naar(r) {
    if (r.slags === 'bestilling') {
      return Admin.pænDato(r.hent_dato) + ' kl. '
        + String(r.hent_tid || '').slice(0, 5).replace(':', '.');
    }
    if (r.slags === 'bord') {
      return Admin.pænDato(r.dato) + ' kl. '
        + String(r.tid || '').slice(0, 5).replace(':', '.');
    }
    if (!r.dato) return 'Dato ikke oplyst';
    return Admin.pænDato(r.dato);
  }

  function tegnSpand() {
    var boks = $('skrald-liste');
    if (!boks) return;
    Admin.tøm(boks);

    if (!spand.length) {
      /* Tomt er et SVAR. Står der ingenting, tror man, fanen ikke
         virker — og så leder nogen efter en bestilling, der aldrig
         har ligget her. */
      boks.appendChild(lav('p', 'vare-tekst',
        'Skraldespanden er tom. Alt, der bliver slettet, lander her '
        + 'og kan hentes tilbage i ' + DAGE + ' dage.'));
      return;
    }

    spand.forEach(function (r) { boks.appendChild(kort(r)); });
  }

  function kort(r) {
    var k = lav('div', 'bestil-kort b-afvist');

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'maerke favorit', SLAGS[r.slags] || r.slags));
    var dage = dageTilbage(r.slettet);
    top.appendChild(lav('span', 'maerke',
      dage === 0 ? 'Slettes i dag'
        : dage === 1 ? 'Slettes i morgen'
          : 'Slettes om ' + dage + ' dage'));
    if (r.reference) top.appendChild(lav('span', 'bestil-ref', r.reference));
    k.appendChild(top);

    var hvem = lav('div', 'bestil-hvem');
    hvem.appendChild(lav('span', 'vare-navn', r.navn));
    var tlf = lav('a', 'bestil-tlf', r.telefon);
    tlf.href = 'tel:' + String(r.telefon).replace(/[^0-9+]/g, '');
    hvem.appendChild(tlf);
    k.appendChild(hvem);

    var linjer = lav('div', 'bestil-linjer');
    var l1 = lav('div', 'bestil-linje');
    l1.appendChild(lav('span', 'bestil-vare', naar(r)));
    l1.appendChild(lav('span', 'bestil-linjepris', hvad(r)));
    linjer.appendChild(l1);
    k.appendChild(linjer);

    var raekke = lav('div', 'knap-raekke');

    var tilbage = lav('button', 'knap', 'Hent tilbage');
    tilbage.addEventListener('click', function () {
      gem(Butik.skrive.fortryd(r.slags, r.id),
        (SLAGS[r.slags] || 'Rækken') + ' står på listen igen.');
    });
    raekke.appendChild(tilbage);

    /* "For altid" står i teksten, fordi det ER for altid. Der er
       ikke en spand mere bagved den her. */
    var vaek = lav('button', 'knap fare', 'Slet for altid');
    vaek.addEventListener('click', function () {
      if (!confirm('Slet ' + (SLAGS[r.slags] || '').toLowerCase() + ' fra '
        + r.navn + ' for altid?\n\nDen kan ikke hentes tilbage bagefter.')) return;
      gem(Butik.skrive.sletForAltid(r.slags, r.id), 'Den er slettet for altid.');
    });
    raekke.appendChild(vaek);

    k.appendChild(raekke);
    return k;
  }

  /* Som Admin.gem(), men henter kun spanden OG de fire lister —
     en række, der hentes tilbage, skal stå på sin egen fane med
     det samme, og en, der smides væk for altid, skal forsvinde
     herfra. Admin.friske er præcis de fire hentninger. */
  function gem(løfte, besked) {
    return løfte
      .then(hentSpand)
      .then(function () {
        return Promise.all(Admin.friske.map(function (f) { return f(); }));
      })
      /* Logbogen står i det samme panel, og handlingen lige her er
         netop en, den skriver om. Blev den ikke hentet igen, ville
         personalet se en spand, der havde ændret sig, ved siden af
         en logbog, der ikke havde — på den samme skærm. */
      .then(function () {
        return Admin.hentLogbog ? Admin.hentLogbog() : null;
      })
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e.message || String(e)); });
  }

  function hentSpand() {
    return Butik.hentSkraldespand().then(function (liste) {
      spand = liste || [];
      tegnSpand();
      Admin.hentet('skrald-hentet');
    }).catch(function (e) {
      /* Fejlen skjules IKKE. En tom spand betyder "der er ikke
         noget at fortryde", og det er det værst tænkelige svar at
         give forkert. */
      var boks = $('skrald-liste');
      if (!boks) return;
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Skraldespanden kunne ikke hentes: ' + (e.message || e)
        + ' Skift fane og tilbage — så hentes den igen. Bliver den ved,'
        + ' så log ud og ind igen.'));
      if (window.console) console.warn('skraldespand:', e);
    });
  }

  /* Tømningen kører ÉN gang pr. login og ikke hver gang fanen
     åbnes. Fire DELETE-kald, hver gang nogen klikker rundt, er
     fire kald for meget — og det, der er 31 dage gammelt, bliver
     ikke mere slettet af at blive slettet igen. */
  function toemGamle() {
    if (toemt) return Promise.resolve();
    toemt = true;
    return Butik.skrive.toemGamle().catch(function (e) {
      /* En oprydning, der fejler, må ikke skjule spanden. Det
         værste, der sker, er, at noget gammelt bliver liggende til
         næste login. */
      if (window.console) console.warn('tømning af skraldespand:', e);
    });
  }

  /* Spanden hentes, HVER GANG fanen åbnes, og ikke kun ved login.
     Uden det stod en bestilling, man lige havde slettet på
     nabofanen, ikke i spanden, før siden blev genindlæst — og så
     ville personalet tro, den var væk for alvor.

     Den står ikke i Admin.friske: friske er de fire lister, der
     hentes hvert minut og ved hver live-besked. Spanden ændrer sig
     kun, når personalet selv gør noget, og et kald i minuttet for
     en fane, ingen kigger på, er et kald for meget.

     Det lå før som en click-lytter på selve faneknappen. Den
     ramte kun musen: åbnede noget andet fanen — tastaturet, et
     link, Admin.visFane fra en anden fil — blev der ikke hentet.
     Admin.vedFane hænger på faneskiftet i stedet for på klikket. */
  Admin.hentVedFane('p-historik', hentSpand);

  Admin.vedLogin.push(function () {
    return toemGamle().then(hentSpand);
  });
})();
