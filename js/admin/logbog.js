/* Logbogen: hvem ændrede hvad, og hvornår. Se js/admin/kerne.js
   for de to principper, der gælder i alle admin-filerne.

   HVORFOR DEN FINDES
   ------------------------------------------------------------
   Der er flere om skærmen. Én står ved lugen, én sidder med
   iPaden, chefen kigger hjemmefra. Når en bestilling pludselig
   står som afvist, er spørgsmålet ikke "hvad står der" — det er
   "hvem gjorde det, og hvornår".

   DEN ER SKRIVEBESKYTTET, OG DET ER HELE POINTEN
   ------------------------------------------------------------
   Der er ingen knapper på et kort her. Linjerne skrives af en
   trigger i databasen (supabase/logbog.sql), og der er hverken
   en insert- eller en update-regel — heller ikke for chefen. En
   logbog, man kan skrive i, svarer ikke længere på det spørgsmål,
   den findes for.

   OPRETTELSER STÅR IKKE HER
   ------------------------------------------------------------
   En ny bestilling er sit eget bevis: rækken ligger der, med navn
   og tidspunkt. En logbogslinje oveni ville være den samme
   oplysning gemt to gange — altså dobbelt så mange steder, hvor
   en gæsts telefonnummer står. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var TABEL_NAVNE = {
    bestillinger:     'Bestilling',
    forespoergsler:   'Forespørgsel',
    bordbestillinger: 'Bordønske',
    udlejninger:      'Baglokalet',
  };

  /* Feltnavnene, som personalet kender dem. Står der et navn, der
     ikke er herinde — fordi en kolonne er kommet til — vises det
     rå navn i stedet for at forsvinde. En ændring, man ikke kan
     se, er værre end en, der ser teknisk ud. */
  var FELT_NAVNE = {
    status: 'Status', intern_note: 'Note', slettet: 'Skraldespand',
    hent_dato: 'Hentedag', hent_tid: 'Hentetid', dato: 'Dato', tid: 'Tid',
    antal: 'Antal', antal_personer: 'Antal personer', navn: 'Navn',
    telefon: 'Telefon', email: 'E-mail', type: 'Type', hvordan: 'Spis her',
  };

  var STATUS_NAVNE = {
    ny: 'Ny', bekraeftet: 'Bekræftet', afhentet: 'Afhentet', afvist: 'Afvist',
    kontaktet: 'Kontaktet', aftalt: 'Aftalt',
  };

  var linjer = [];
  var ryddet = false;

  function vaerdi(navn, v) {
    if (v === null || v === undefined || v === '') return 'tomt';
    if (navn === 'status') return STATUS_NAVNE[v] || String(v);
    if (navn === 'slettet') return 'ja';
    if (navn === 'hvordan') return v === 'spis_her' ? 'spis her' : 'afhentning';
    return String(v);
  }

  /* Klokkeslæt OG dato. "kl. 14.32" alene er ubrugeligt dagen
     efter, og en dato alene svarer ikke på "var det før eller
     efter, jeg ringede". */
  function naar(iso) {
    var t = Date.parse(iso || '');
    if (!isFinite(t)) return '';
    var d = new Date(t);
    return Admin.pænDato(d.toISOString().slice(0, 10)) + ' kl. '
      + ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2);
  }

  function tegnLogbog() {
    var boks = $('logbog-liste');
    if (!boks) return;
    Admin.tøm(boks);

    if (!linjer.length) {
      /* Tomt er et SVAR. Står der ingenting, tror man, fanen ikke
         virker — og så leder nogen efter en ændring, der aldrig
         er sket. */
      boks.appendChild(lav('p', 'vare-tekst',
        'Der er ikke rettet eller slettet noget endnu. '
        + 'Nye bestillinger står ikke her — de står på deres egen fane.'));
      return;
    }

    linjer.forEach(function (l) { boks.appendChild(kort(l)); });
  }

  function kort(l) {
    var k = lav('div', 'log-linje');

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'maerke favorit', TABEL_NAVNE[l.tabel] || l.tabel));
    top.appendChild(lav('span', 'maerke', l.hvad));
    if (l.reference) top.appendChild(lav('span', 'bestil-ref', l.reference));
    k.appendChild(top);

    var hvem = lav('div', 'log-hvem');
    hvem.appendChild(lav('strong', null, l.hvem || 'Ukendt'));
    hvem.appendChild(document.createTextNode(' · ' + naar(l.hvornaar)));
    if (l.navn) hvem.appendChild(document.createTextNode(' · ' + l.navn));
    k.appendChild(hvem);

    /* Hvad blev anderledes. Der står FØR → EFTER og ikke bare
       den nye værdi: "Status: Afvist" fortæller ikke, om der blev
       sagt nej til noget nyt eller lavet et ja om. */
    var e = l.efter || {};
    var f = l.foer || {};
    var navne = Object.keys(e);
    if (navne.length) {
      var ud = lav('div', 'log-hvad');
      navne.forEach(function (n) {
        var r = lav('div', 'log-felt');
        r.appendChild(lav('span', 'log-navn', (FELT_NAVNE[n] || n) + ': '));
        r.appendChild(lav('span', 'log-foer', vaerdi(n, f[n])));
        r.appendChild(lav('span', 'log-pil', ' → '));
        r.appendChild(lav('span', 'log-efter', vaerdi(n, e[n])));
        ud.appendChild(r);
      });
      k.appendChild(ud);
    }

    return k;
  }

  function hentLogbog() {
    return Butik.hentLogbog().then(function (liste) {
      linjer = liste || [];
      tegnLogbog();
      Admin.hentet('logbog-hentet');
    }).catch(function (e) {
      /* Fejlen skjules IKKE. En tom logbog betyder "der er ikke
         sket noget", og det er det værst tænkelige svar at give
         forkert. */
      var boks = $('logbog-liste');
      if (!boks) return;
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Logbogen kunne ikke hentes: ' + (e.message || e)
        + ' Skift fane og tilbage — så hentes den igen. Bliver den ved,'
        + ' så log ud og ind igen.'));
      if (window.console) console.warn('logbog:', e);
    });
  }

  // Én gang pr. login, som skraldespanden — se js/admin/skraldespand.js.
  function rydGamle() {
    if (ryddet) return Promise.resolve();
    ryddet = true;
    return Butik.skrive.ryddLogbog().catch(function (e) {
      if (window.console) console.warn('oprydning i logbogen:', e);
    });
  }

  /* Skraldespanden ligger i det samme panel og skriver i
     logbogen, hver gang der trykkes. Den henter den her, når den
     er færdig — se js/admin/skraldespand.js. */
  Admin.hentLogbog = hentLogbog;

  // Samme panel som skraldespanden — derfor en LISTE pr. fane i
  // kerne.js, ikke ét felt.
  Admin.hentVedFane('p-historik', hentLogbog);

  Admin.vedLogin.push(function () {
    return rydGamle().then(hentLogbog);
  });
})();
