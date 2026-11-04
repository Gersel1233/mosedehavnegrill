/* ============================================================
   COOKIE-SAMTYKKE OG MÅLINGER  (4. nov 2026)
   ------------------------------------------------------------
   Mikkel: *"vi skal jo så lige have styr på det med cookies og
   persondatapolitik, så vi overholder alle regler"* — fordi
   marketingbureauet (Marketing Advisor) vil måle med Google
   Analytics, Tag Manager og Facebook/Instagram.

   SÅDAN VIRKER DEN
   - Målekoderne skrives i admin → Indstillinger → "Målinger og
     cookies" (indstillingerne maaling_ga4, maaling_gtm, maaling_meta).
   - ⚠️ ER INGEN SAT, GØR FILEN INGENTING. Intet banner, intet link,
     ingen cookies. Siden måler ingenting, og sådan står det også i
     persondatapolitikken. Et banner, ingen skal have, er en
     klikbarriere og en påstand om sporing, der ikke findes.
   - Er én sat, spørges gæsten FØRST. Intet fra Google eller Meta
     hentes, før der er sagt ja (cookiebekendtgørelsen § 4 og
     Datatilsynets vejledning) — heller ikke Googles "cookieløse"
     pings, som Consent Mode ellers sender i forvejen.
   - "Ja tak" og "Nej tak" er lige store og står ved siden af
     hinanden. Nej er lige så let som ja; siden virker lige godt.
   - Valget kan altid ændres under "Cookies" nederst på hver side
     (og på persondatapolitikken). Trækkes et ja tilbage, slettes
     målecookies, og siden genindlæses uden dem.
   - Valget huskes i browseren i 6 måneder, og der spørges igen,
     hvis der kommer et nyt måleværktøj til.
   - Valget logges anonymt i databasen (tabellen samtykke_log,
     supabase/samtykke-4-11.sql) — et tilfældigt id, valget, tid og
     side — så forretningen kan dokumentere samtykket (GDPR art.
     7, stk. 1). Findes tabellen ikke, sker der intet.
   ============================================================ */
(function () {
  'use strict';

  if (!window.Butik || typeof Butik.hent !== 'function') return;

  var NOEGLE = 'mosede_samtykke_v1';
  var TEKST_UDGAVE = 1;            // ret, når bannerets ordlyd ændres væsentligt
  var GYLDIG_DAGE = 182;           // ca. 6 måneder
  var POLITIK = (/\/(bestil|bord|min-bestilling|ved-bordet)\//.test(location.pathname) ? '../' : '')
    + 'persondatapolitik.html#cookies';

  /* Værktøjerne, siden kan bruge. Teksterne står også på
     persondatapolitikken, som filen her fylder ud. */
  var VAERKTOEJ = {
    ga4: {
      noegle: 'maaling_ga4', moenster: /^G-[A-Z0-9]{4,15}$/, kat: 'statistik',
      navn: 'Google Analytics', firma: 'Google Ireland Ltd.',
      formaal: 'Tæller besøg og viser, hvilke sider der bliver brugt, så vi kan gøre siden bedre.',
      cookies: '_ga og _ga_… — op til 2 år',
    },
    gtm: {
      noegle: 'maaling_gtm', moenster: /^GTM-[A-Z0-9]{4,12}$/, kat: 'statistik',
      navn: 'Google Tag Manager', firma: 'Google Ireland Ltd.',
      formaal: 'Henter de måleværktøjer, du har sagt ja til. Sætter ikke selv cookies.',
      cookies: 'ingen egne',
    },
    meta: {
      noegle: 'maaling_meta', moenster: /^[0-9]{10,20}$/, kat: 'marketing',
      navn: 'Meta Pixel (Facebook og Instagram)', firma: 'Meta Platforms Ireland Ltd.',
      formaal: 'Måler, om vores opslag og annoncer på Facebook og Instagram får folk til at besøge siden og bestille.',
      cookies: '_fbp og _fbc — op til 3 måneder',
    },
  };
  var KATEGORI = {
    statistik: { navn: 'Statistik', tekst: 'Hjælper os med at se, hvordan siden bliver brugt.' },
    marketing: { navn: 'Markedsføring', tekst: 'Måler vores opslag og annoncer på Facebook og Instagram.' },
  };

  var aktive = [];      // [{ id, kode, ...VAERKTOEJ[id] }]
  var version = '';
  var hentet = false;

  function laes() {
    try {
      var v = JSON.parse(localStorage.getItem(NOEGLE) || 'null');
      if (!v || v.version !== version) return null;
      if (Date.now() - Date.parse(v.dato) > GYLDIG_DAGE * 864e5) return null;
      return v;
    } catch (e) { return null; }
  }
  function nytId() {
    var a = new Uint8Array(8);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  function kategorier() {
    var k = [];
    aktive.forEach(function (v) { if (k.indexOf(v.kat) === -1) k.push(v.kat); });
    return k;
  }

  // ---------------------------------------------------------
  //  GEM OG LOG
  // ---------------------------------------------------------
  function gem(valg) {
    var tidl = laes();
    var ud = { version: version, dato: new Date().toISOString(), statistik: !!valg.statistik,
      marketing: !!valg.marketing, id: (tidl && tidl.id) || nytId() };
    try { localStorage.setItem(NOEGLE, JSON.stringify(ud)); } catch (e) { /* privat vindue */ }
    log(ud);
    return ud;
  }
  function log(v) {
    var c = window.MOSEDE_CLOUD || {};
    if (!c.url || !c.anonKey || !window.fetch) return;
    try {
      fetch(c.url + '/rest/v1/samtykke_log', {
        method: 'POST', keepalive: true,
        headers: { apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey,
          'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ lokation_id: c.lokation || 'mosede', samtykke_id: v.id, version: v.version,
          statistik: v.statistik, marketing: v.marketing, side: location.pathname.slice(0, 200) }),
      }).catch(function () { /* tabellen findes ikke endnu — samtykket virker alligevel */ });
    } catch (e) { /* ingen */ }
  }

  // ---------------------------------------------------------
  //  HENT VÆRKTØJERNE — KUN EFTER ET JA
  // ---------------------------------------------------------
  var indlaest = {};
  function script(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }
  function gtagKlar(valg) {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) window.gtag = function () { window.dataLayer.push(arguments); };
    var g = valg.statistik ? 'granted' : 'denied', m = valg.marketing ? 'granted' : 'denied';
    window.gtag('consent', 'default', { analytics_storage: g, ad_storage: m, ad_user_data: m,
      ad_personalization: m, functionality_storage: 'denied', personalization_storage: 'denied',
      security_storage: 'granted' });
  }
  function anvend(valg) {
    aktive.forEach(function (v) {
      if (indlaest[v.id]) return;
      if (v.id === 'ga4' && valg.statistik) {
        gtagKlar(valg);
        window.gtag('js', new Date());
        window.gtag('config', v.kode);
        script('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(v.kode));
        indlaest.ga4 = true;
      }
      // Tag Manager kan hente begge slags — den får besked om, hvad der er sagt ja til.
      if (v.id === 'gtm' && (valg.statistik || valg.marketing)) {
        gtagKlar(valg);
        window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
        script('https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(v.kode));
        indlaest.gtm = true;
      }
      if (v.id === 'meta' && valg.marketing) {
        /* Metas egen indlæser, skrevet ud. */
        if (!window.fbq) {
          var f = window.fbq = function () {
            f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments);
          };
          if (!window._fbq) window._fbq = f;
          f.push = f; f.loaded = true; f.version = '2.0'; f.queue = [];
          script('https://connect.facebook.net/en_US/fbevents.js');
        }
        window.fbq('consent', 'grant');
        window.fbq('init', v.kode);
        window.fbq('track', 'PageView');
        indlaest.meta = true;
      }
    });
  }
  // Et ja, der trækkes tilbage: målecookies væk, og siden genindlæses uden værktøjerne.
  function ryd() {
    var navne = document.cookie.split(';').map(function (c) { return c.split('=')[0].trim(); })
      .filter(function (n) { return /^(_ga|_gid|_gat|_gcl_|_fbp|_fbc)/.test(n); });
    var dele = location.hostname.split('.');
    var domaener = [''];
    for (var i = 0; i < dele.length - 1; i++) domaener.push('; domain=.' + dele.slice(i).join('.'));
    navne.forEach(function (n) {
      domaener.forEach(function (d) {
        document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
      });
    });
  }

  // ---------------------------------------------------------
  //  BANNERET
  // ---------------------------------------------------------
  function stil() {
    if (document.getElementById('samtykke-stil')) return;
    var s = document.createElement('style');
    s.id = 'samtykke-stil';
    s.textContent = ''
      + '.samtykke{position:fixed;z-index:2147483000;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));'
      + 'max-width:560px;margin:0 auto;background:#fdf7ef;color:#241a17;border-radius:18px;padding:18px 18px 16px;'
      + 'box-shadow:0 18px 46px rgba(36,26,23,.28),inset 0 0 0 1px rgba(36,26,23,.08);font:15px/1.45 inherit;'
      + 'font-family:inherit;max-height:calc(100vh - 24px);overflow:auto}'
      + '.samtykke h2{margin:0 0 6px;font-size:1.08rem;line-height:1.25}'
      + '.samtykke p{margin:0 0 12px}.samtykke a{color:#b41f2e}'
      + '.samtykke-knapper{display:flex;gap:10px;flex-wrap:wrap}'
      + '.samtykke-knapper button{flex:1 1 140px;min-height:46px;border-radius:99px;font:inherit;font-weight:700;'
      + 'cursor:pointer;border:2px solid #241a17;background:#241a17;color:#fff;padding:8px 16px}'
      + '.samtykke-knapper button.lys{background:#fff;color:#241a17}'
      + '.samtykke-vaelg{background:none;border:0;padding:8px 0 0;font:inherit;color:#5c4a45;text-decoration:underline;cursor:pointer}'
      + '.samtykke-kat{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid rgba(36,26,23,.1)}'
      + '.samtykke-kat input{width:22px;height:22px;margin:2px 0 0;flex:0 0 auto;accent-color:#241a17}'
      + '.samtykke-kat span{display:block;font-size:.88rem;color:#5c4a45}'
      + '.samtykke :focus-visible{outline:3px solid #d62a3a;outline-offset:2px}';
    document.head.appendChild(s);
  }

  function lukBanner() {
    var b = document.getElementById('samtykke');
    if (b) b.parentNode.removeChild(b);
  }

  function visBanner(udvidet) {
    lukBanner();
    stil();
    var tidl = laes();
    var kat = kategorier();
    var b = document.createElement('section');
    b.id = 'samtykke';
    b.className = 'samtykke';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-labelledby', 'samtykke-titel');
    b.setAttribute('aria-describedby', 'samtykke-tekst');

    var h = document.createElement('h2');
    h.id = 'samtykke-titel';
    h.textContent = 'Må vi bruge cookies?';
    b.appendChild(h);

    var p = document.createElement('p');
    p.id = 'samtykke-tekst';
    var hvad = kat.map(function (k) { return KATEGORI[k].navn.toLowerCase(); }).join(' og ');
    p.appendChild(document.createTextNode('Vi vil gerne bruge cookies til ' + hvad + ' ('
      + aktive.map(function (v) { return v.navn; }).join(', ')
      + '). Det er helt frivilligt — siden virker lige godt, uanset hvad du vælger, og du kan altid ændre dit valg under "Cookies" nederst på siden. '));
    var a = document.createElement('a');
    a.href = POLITIK;
    a.textContent = 'Læs mere';
    p.appendChild(a);
    b.appendChild(p);

    var felter = {};
    if (udvidet) {
      kat.forEach(function (k) {
        var l = document.createElement('label');
        l.className = 'samtykke-kat';
        var i = document.createElement('input');
        i.type = 'checkbox';
        i.name = k;
        i.checked = !!(tidl && tidl[k]);       // aldrig sat på forhånd
        felter[k] = i;
        var t = document.createElement('div');
        var s = document.createElement('strong');
        s.textContent = KATEGORI[k].navn;
        var u = document.createElement('span');
        u.textContent = KATEGORI[k].tekst;
        t.appendChild(s); t.appendChild(u);
        l.appendChild(i); l.appendChild(t);
        b.appendChild(l);
      });
    }

    var knapper = document.createElement('div');
    knapper.className = 'samtykke-knapper';
    function knap(tekst, lys, valg) {
      var k = document.createElement('button');
      k.type = 'button';
      k.textContent = tekst;
      if (lys) k.className = 'lys';
      k.addEventListener('click', function () { vaelg(valg()); });
      knapper.appendChild(k);
      return k;
    }
    var nej = knap('Nej tak', true, function () { return { statistik: false, marketing: false }; });
    if (udvidet) {
      knap('Gem mit valg', true, function () {
        return { statistik: !!(felter.statistik && felter.statistik.checked),
          marketing: !!(felter.marketing && felter.marketing.checked) };
      });
    }
    knap('Ja tak', false, function () { return { statistik: kat.indexOf('statistik') !== -1, marketing: kat.indexOf('marketing') !== -1 }; });
    b.appendChild(knapper);

    if (!udvidet && kat.length) {
      var v = document.createElement('button');
      v.type = 'button';
      v.className = 'samtykke-vaelg';
      v.textContent = 'Vælg selv';
      v.addEventListener('click', function () { visBanner(true); });
      b.appendChild(v);
    }
    document.body.appendChild(b);
    if (udvidet) { var f = b.querySelector('input'); if (f) f.focus(); } else nej.focus({ preventScroll: true });
  }

  function vaelg(valg) {
    var foer = laes();
    var ny = gem(valg);
    lukBanner();
    var trukketTilbage = foer && ((foer.statistik && !ny.statistik) || (foer.marketing && !ny.marketing));
    if (trukketTilbage && (indlaest.ga4 || indlaest.gtm || indlaest.meta || /(_ga|_fbp)/.test(document.cookie))) {
      ryd();
      location.reload();
      return;
    }
    ryd();
    anvend(ny);
    tegnPolitik();
  }

  // ---------------------------------------------------------
  //  "COOKIES" NEDERST PÅ SIDEN + PERSONDATAPOLITIKKEN
  // ---------------------------------------------------------
  function links() {
    Array.prototype.forEach.call(document.querySelectorAll('.legal'), function (l) {
      if (l.querySelector('[data-cookie-valg]')) return;
      var a = document.createElement('a');
      a.className = 'jura-link';
      a.href = POLITIK;
      a.setAttribute('data-cookie-valg', '');
      a.textContent = 'Cookies';
      var skel = document.createElement('span');
      skel.className = 'jura-skel';
      skel.setAttribute('aria-hidden', 'true');
      skel.textContent = ' · ';
      // Efter det sidste jura-link på linjen ("Persondata · Handelsbetingelser · Cookies").
      var jura = l.querySelectorAll('.jura-link');
      if (jura.length) {
        var sidste = jura[jura.length - 1];
        sidste.parentNode.insertBefore(a, sidste.nextSibling);
        sidste.parentNode.insertBefore(skel, a);
      } else {
        l.appendChild(document.createElement('br'));
        l.appendChild(a);
      }
    });
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('[data-cookie-valg]');
      if (!a || !aktive.length) return;
      e.preventDefault();
      visBanner(true);
    });
  }

  function tegnPolitik() {
    var ingen = document.querySelectorAll('[data-maaling="ingen"]');
    var aktiv = document.querySelectorAll('[data-maaling="aktiv"]');
    if (!ingen.length && !aktiv.length) return;
    Array.prototype.forEach.call(ingen, function (e) { e.hidden = !!aktive.length; });
    Array.prototype.forEach.call(aktiv, function (e) { e.hidden = !aktive.length; });
    var liste = document.getElementById('maaling-liste');
    if (liste) {
      while (liste.firstChild) liste.removeChild(liste.firstChild);
      aktive.forEach(function (v) {
        var d = document.createElement('div');
        d.className = 'jura-blok';
        var h = document.createElement('h3');
        h.textContent = v.navn + ' — ' + KATEGORI[v.kat].navn.toLowerCase();
        d.appendChild(h);
        [['Hvorfor', v.formaal], ['Hvem', v.firma], ['Cookies', v.cookies]].forEach(function (r) {
          var p = document.createElement('p');
          var b = document.createElement('b');
          b.textContent = r[0] + ': ';
          p.appendChild(b);
          p.appendChild(document.createTextNode(r[1]));
          d.appendChild(p);
        });
        liste.appendChild(d);
      });
    }
    var status = document.getElementById('samtykke-status');
    if (status) {
      var v = laes();
      status.textContent = !v ? 'Du har ikke valgt endnu.'
        : 'Dit valg: ' + kategorier().map(function (k) {
          return KATEGORI[k].navn.toLowerCase() + ' ' + (v[k] ? 'ja' : 'nej');
        }).join(', ') + ' (' + new Date(v.dato).toLocaleDateString('da-DK') + ').';
    }
  }

  // ---------------------------------------------------------
  //  HÆNDELSERNE — det, bureauet skal kunne følge
  //  js/store.js siger "mosede:maal", når en gæst har sendt en
  //  bestilling, en booking, en tilmelding eller en forespørgsel.
  //  Et klik på telefonnummer, mail eller rutevejledning tælles her.
  //  Kun videre, hvis der er sagt ja til det pågældende værktøj.
  // ---------------------------------------------------------
  var GA_NAVN = { bestilling: 'purchase', bordbooking: 'bordbooking', tilmelding: 'tilmelding',
    forespoergsel: 'generate_lead', baglokale: 'generate_lead', ring: 'ring_op', mail: 'skriv_mail', rute: 'rutevejledning' };
  var META_NAVN = { bestilling: 'Purchase', bordbooking: 'Schedule', tilmelding: 'CompleteRegistration',
    forespoergsel: 'Lead', baglokale: 'Lead', ring: 'Contact', mail: 'Contact' };
  function send(d) {
    var v = laes();
    if (!v) return;
    var p = {};
    if (d.vaerdi) { p.value = d.vaerdi; p.currency = 'DKK'; }
    if (d.antal) p.antal_personer = d.antal;
    if (d.slags) p.slags = d.slags;
    if (v.statistik && (indlaest.ga4 || indlaest.gtm) && window.gtag) {
      window.gtag('event', GA_NAVN[d.type] || d.type, p);
    }
    if (v.marketing && indlaest.meta && window.fbq && META_NAVN[d.type]) {
      window.fbq('track', META_NAVN[d.type], d.vaerdi ? { value: d.vaerdi, currency: 'DKK' } : {});
    }
  }
  window.addEventListener('mosede:maal', function (e) { if (aktive.length) send(e.detail || {}); });
  document.addEventListener('click', function (e) {
    if (!aktive.length) return;
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/^tel:/.test(h)) send({ type: 'ring' });
    else if (/^mailto:/.test(h)) send({ type: 'mail' });
    else if (/google\.[a-z.]+\/maps|maps\.apple\.com|maps\.google/.test(h)) send({ type: 'rute' });
  }, true);

  // ---------------------------------------------------------
  //  START
  // ---------------------------------------------------------
  Butik.hent().then(function (d) {
    var ind = (d && d.indstillinger) || {};
    aktive = Object.keys(VAERKTOEJ).map(function (id) {
      var kode = String(ind[VAERKTOEJ[id].noegle] || '').trim().toUpperCase();
      return VAERKTOEJ[id].moenster.test(kode) ? Object.assign({ id: id, kode: kode }, VAERKTOEJ[id]) : null;
    }).filter(Boolean);
    version = TEKST_UDGAVE + ':' + aktive.map(function (v) { return v.id; }).sort().join(',');
    hentet = true;
    tegnPolitik();
    if (!aktive.length) return;        // intet at spørge om
    links();
    var v = laes();
    if (v) anvend(v); else visBanner(false);
  }).catch(function () { /* uden indstillinger: ingen målinger */ });

  window.MosedeSamtykke = {
    aabn: function () { if (hentet && aktive.length) visBanner(true); },
    aktive: function () { return aktive.map(function (v) { return v.id; }); },
  };
}());
