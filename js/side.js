/* ============================================================
   FORSIDEN – opførsel og data
   ------------------------------------------------------------
   Tre slags arbejde:

   1) Opførsel: fast topmenu der bliver til glas, mobilmenu,
      indtoning når man ruller.

   2) Data fra databasen: åbent-status, åbningstider, priser,
      dagens kugler, adresse. Intet af det står i HTML'en, for
      personalet skal kunne rette det i admin uden at røre kode.

   3) Solnedgangen REGNES ud for havnens position. Det er ægte
      data uden at spørge nogen om lov.

   Alt tekst fra databasen sættes ind med textContent, aldrig
   innerHTML. Personalet skriver varenavne, og et < i
   "burger <med> bacon" må ikke kunne blive kode.
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

  var roligt = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================
     1) OPFØRSEL
     ========================================================== */

  // Topmenuen bliver til glas når man er forbi 72% af første skærm
  var hd = $('hd');
  window.addEventListener('scroll', function () {
    hd.classList.toggle('stuck', window.scrollY > window.innerHeight * .72);
  }, { passive: true });

  // Indtoning. Uden IntersectionObserver (meget gamle browsere)
  // vises alt med det samme – indholdet må aldrig blive usynligt.
  var blokke = document.querySelectorAll('.rev');
  if (!roligt && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '-8% 0px -12%' });
    Array.prototype.forEach.call(blokke, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(blokke, function (el) { el.classList.add('in'); });
  }

  // ---- Mobilmenu ----
  var ark = $('ark'), burger = $('burger');

  function lukArk() {
    ark.classList.remove('aaben');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    // hidden sættes først når den er kørt ud, ellers ses ingen bevægelse
    setTimeout(function () { if (!ark.classList.contains('aaben')) ark.hidden = true; }, 450);
    burger.focus();
  }

  function aabnArk() {
    ark.hidden = false;
    // Ét billede frem, så browseren opdager at den ikke er hidden,
    // før overgangen sættes i gang
    requestAnimationFrame(function () {
      ark.classList.add('aaben');
      burger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      var f = ark.querySelector('a');
      if (f) f.focus();
    });
  }

  burger.addEventListener('click', aabnArk);
  $('ark-luk').addEventListener('click', lukArk);
  ark.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') lukArk();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ark.classList.contains('aaben')) lukArk();
  });

  /* ==========================================================
     2) SOLNEDGANG
     ----------------------------------------------------------
     Standard-algoritmen fra Almanac for Computers. Mosede Havn
     ligger på 55,585° N, 12,283° Ø.

     Zenit 90,833° i stedet for 90°: det tager højde for solens
     egen bredde og for at lyset bøjes i atmosfæren, så tallet
     passer med hvad man faktisk ser fra molen.
     ========================================================== */
  var LAT = 55.585, LNG = 12.283, ZENIT = 90.833;
  var RAD = Math.PI / 180;

  function normaliser(v, maks) {
    while (v < 0) v += maks;
    while (v >= maks) v -= maks;
    return v;
  }

  function solnedgangUT(aar, maaned, dag) {
    var N = Math.floor(275 * maaned / 9)
          - Math.floor((maaned + 9) / 12) * (1 + Math.floor((aar - 4 * Math.floor(aar / 4) + 2) / 3))
          + dag - 30;

    var lngTime = LNG / 15;
    var t = N + ((18 - lngTime) / 24);          // 18 = solnedgang

    var M = (0.9856 * t) - 3.289;               // solens middelanomali
    var L = normaliser(
      M + (1.916 * Math.sin(M * RAD)) + (0.020 * Math.sin(2 * M * RAD)) + 282.634, 360);

    var RA = normaliser(Math.atan(0.91764 * Math.tan(L * RAD)) / RAD, 360);
    // RA skal ligge i samme kvadrant som L
    RA += (Math.floor(L / 90) * 90) - (Math.floor(RA / 90) * 90);
    RA /= 15;

    var sinDec = 0.39782 * Math.sin(L * RAD);
    var cosDec = Math.cos(Math.asin(sinDec));

    var cosH = (Math.cos(ZENIT * RAD) - (sinDec * Math.sin(LAT * RAD)))
             / (cosDec * Math.cos(LAT * RAD));
    // Over polarkredsen kan solen slet ikke gå ned. Sker ikke i
    // Greve, men så står der ingenting i stedet for noget forkert.
    if (cosH > 1 || cosH < -1) return null;

    var H = Math.acos(cosH) / RAD / 15;
    return normaliser(H + RA - (0.06571 * t) - 6.622 - lngTime, 24);
  }

  // UT-timer → "21:14" i dansk tid. Vi bygger øjeblikket i UTC og
  // lader Intl klare sommertid, i stedet for at gætte på +1 eller +2.
  function solnedgangDansk(iso) {
    var d = iso.split('-').map(Number);
    var ut = solnedgangUT(d[0], d[1], d[2]);
    if (ut === null) return null;

    var ms = Date.UTC(d[0], d[1] - 1, d[2]) + ut * 3600000;
    // sv-SE i stedet for da-DK: dansk skriver 21.05 med punktum,
    // og designet bruger kolon. Tidszonen er stadig dansk.
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Copenhagen',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(ms));
  }

  /* ==========================================================
     3) DATA PÅ SIDEN
     ========================================================== */

  var MÅNEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli',
                 'august', 'september', 'oktober', 'november', 'december'];

  function pænDato(iso) {
    var d = new Date(iso + 'T00:00:00Z');
    if (isNaN(d.getTime())) return iso;
    return Butik.UGEDAGE[(d.getUTCDay() + 6) % 7].toLowerCase()
      + ' ' + d.getUTCDate() + '. ' + MÅNEDER[d.getUTCMonth()];
  }

  function pænTelefon(t) {
    var kun = String(t || '').replace(/\D/g, '');
    return kun.length === 8 ? kun.replace(/(\d\d)(?=\d)/g, '$1 ') : t;
  }

  /* Datalaget svarer i hele sætninger ("Vi åbner i morgen kl.
     10:00"). I en lille etiket under et stort tal er der ikke
     plads til en sætning, så den koges ned til "åbner i morgen
     10:00". Selve ordet Åbent/Lukket står altid for sig. */
  function kortForm(detalje) {
    return String(detalje || '')
      .replace(/^Åbent til kl\. /, 'til ')
      .replace(/^Vi lukker /, 'lukker ')
      .replace(/^Vi åbner igen /, 'åbner ')
      .replace(/^Vi åbner /, 'åbner ')
      .replace(/ kl\. /, ' ');
  }

  // ---- Åbent-status: pillen i hero og den første celle ----
  function visStatus(d) {
    var s = Butik.status(d);
    var nu = Butik.nu();

    // Prikken skifter farve, men der står ALTID også "Åbent" eller
    // "Lukket" – farven står aldrig alene.
    var prik = $('hero-status').querySelector('.dot');
    prik.className = 'dot' + (s.aaben ? '' : ' lukket');

    $('hero-status-tekst').textContent = s.aaben
      ? (s.snart_lukket ? 'Lukker om' + kortForm(s.detalje).replace('lukker om', '')
                        : 'Åbent nu ' + kortForm(s.detalje))
      : s.overskrift + (s.detalje ? ' · ' + s.detalje : '');

    $('status-k').textContent = 'Lige nu · ' + Butik.UGEDAGE[nu.ugedag].toLowerCase();
    var v = $('status-v');
    tøm(v);
    v.appendChild(document.createTextNode(s.aaben ? 'Åbent' : 'Lukket'));
    if (s.detalje) v.appendChild(lav('small', null, kortForm(s.detalje)));
  }

  // ---- Åbningstider ----
  /* Ens dage i træk lægges sammen til "Mandag – torsdag", men i
     dag får altid sin egen linje. Ellers ville dagens tid ligge
     begravet midt i en gruppe, og det er den ene linje gæsten
     leder efter. */
  function visTider(d) {
    var boks = $('hours');
    tøm(boks);

    var iDag = Butik.nu().ugedag;

    function tekstFor(u) {
      var p = (d.aabningstider || []).filter(function (a) { return a.ugedag === u; })[0];
      if (!p || p.lukket) return 'Lukket';
      return Butik.pænTid(p.aabner) + '–' + Butik.pænTid(p.lukker);
    }

    var grupper = [];
    for (var u = 0; u < 7; u++) {
      var t = tekstFor(u);
      var sidste = grupper[grupper.length - 1];
      var kanSamles = sidste && sidste.tekst === t
        && sidste.til === u - 1 && u !== iDag && sidste.fra !== iDag;
      if (kanSamles) sidste.til = u;
      else grupper.push({ fra: u, til: u, tekst: t });
    }

    grupper.forEach(function (g) {
      var navn = g.fra === g.til
        ? Butik.UGEDAGE[g.fra]
        : Butik.UGEDAGE[g.fra] + ' – ' + Butik.UGEDAGE[g.til].toLowerCase();

      var række = lav('div', g.fra === iDag && g.til === iDag ? 'now' : null);
      række.appendChild(lav('span', null, navn + (g.fra === iDag && g.til === iDag ? ' (i dag)' : '')));
      række.appendChild(lav('span', null, g.tekst));
      boks.appendChild(række);
    });
  }

  // ---- Lukkedage ----
  function visLukkedage(d) {
    var dage = (d.lukkedage || []).slice().sort(function (a, b) { return a.dato < b.dato ? -1 : 1; });
    if (!dage.length) return;

    var boks = $('lukkedage');
    tøm(boks);
    boks.appendChild(lav('div', 'eyebrow', 'Lukkedage'));

    var liste = lav('div', 'hours');
    dage.slice(0, 6).forEach(function (l) {
      var r = lav('div');
      r.appendChild(lav('span', null, (l.emoji ? l.emoji + ' ' : '') + pænDato(l.dato)));
      r.appendChild(lav('span', null, l.aarsag || 'Lukket'));
      liste.appendChild(r);
    });
    boks.appendChild(liste);
    boks.classList.remove('skjult');
  }

  // ---- Menukort: de fremhævede varer ----
  function visMenu(d) {
    var boks = $('menu-liste');
    tøm(boks);

    var varer = (d.menu_varer || []).filter(function (v) {
      return v.aktiv !== false && v.fremhaevet;
    });

    // Er ingen mærket som favorit, tages de første aktive – så
    // står sektionen aldrig tom
    if (!varer.length) {
      varer = (d.menu_varer || []).filter(function (v) { return v.aktiv !== false; });
    }
    varer = varer.sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); }).slice(0, 8);

    if (!varer.length) {
      boks.appendChild(lav('p', 'desc', 'Menukortet er ikke lagt ind endnu. Ring og hør hvad vi har i dag.'));
      return;
    }

    varer.forEach(function (v) {
      var kort = lav('div', 'card' + (v.udsolgt ? ' udsolgt' : ''));

      var top = lav('div', 'top');
      var ph = lav('div', 'ph');
      ph.appendChild(lav('span', null, v.navn));
      top.appendChild(ph);

      var pris = Butik.pris(v.pris);
      if (pris) top.appendChild(lav('span', 'glass sm price', pris.replace(' kr.', ',-')));
      if (v.udsolgt) top.appendChild(lav('span', 'udsolgt-maerke', 'Udsolgt'));
      kort.appendChild(top);

      var krop = lav('div', 'body');
      krop.appendChild(lav('h3', null, v.navn));
      if (v.beskrivelse) krop.appendChild(lav('p', 'desc', v.beskrivelse));
      kort.appendChild(krop);

      boks.appendChild(kort);
    });
  }

  // ---- Dagens kugler ----
  function visKugler(d) {
    var kugler = (d.indstillinger || {}).dagens_kugler;
    if (!Array.isArray(kugler) || !kugler.length) {
      // Ingen tavle udfyldt: skjul hele sektionen frem for at
      // vise en tom kasse
      $('is').classList.add('skjult');
      return;
    }

    $('kugler-dag').textContent =
      'Dagens kugler · ' + Butik.UGEDAGE[Butik.nu().ugedag].toLowerCase();

    var boks = $('kugler-liste');
    tøm(boks);
    kugler.forEach(function (k) {
      var c = lav('span', 'chip');
      var i = lav('i');
      // Kun rene hex-farver. Ellers kunne en tekst fra databasen
      // smugle CSS ind i style-attributten.
      i.style.background = /^#[0-9a-f]{3,8}$/i.test(String(k.farve || '')) ? k.farve : '#efe4d2';
      c.appendChild(i);
      c.appendChild(document.createTextNode(k.navn || ''));
      boks.appendChild(c);
    });

    $('kugler-overskrift').textContent =
      kugler.length + ' slags i dag —\nandre i morgen';
  }

  // ---- Nøgletal ----
  function visTal(d) {
    var tal = (d.indstillinger || {}).noegletal;
    var boks = $('stats');
    tøm(boks);
    if (!Array.isArray(tal) || !tal.length) return;

    tal.slice(0, 4).forEach(function (t) {
      var s = lav('div', 'stat');
      s.appendChild(lav('b', null, t.tal || ''));
      s.appendChild(lav('span', null, t.tekst || ''));
      boks.appendChild(s);
    });
  }

  // ---- Havnestriben: felter uden kilde vises ikke ----
  function visStribe(d) {
    var ind = d.indstillinger || {};
    var nu = Butik.nu();

    var sol = solnedgangDansk(nu.dato);
    if (sol) $('solnedgang').textContent = sol;
    else $('celle-solnedgang').classList.add('skjult');

    [['vandtemp', 'celle-vandtemp'], ['vind', 'celle-vind'], ['landing', 'celle-landing']]
      .forEach(function (par) {
        var v = ind[par[0]];
        if (v) {
          $(par[0]).textContent = v;
          $(par[1]).classList.remove('skjult');
        }
      });
  }

  // ---- Lokation ----
  function visLokation(d) {
    var l = (d.lokationer || [])[0];
    if (!l) return;

    var adr = l.adresse + ', ' + l.postnr + ' ' + l.by;
    $('kort-pin').textContent = l.adresse;
    $('footer-adresse').textContent = l.adresse + ' · ' + l.postnr + ' ' + l.by;
    $('find-under').textContent = adr +
      '. Nede på Mosede Havn, få minutters gang fra stranden.';

    if (l.beskrivelse) $('hero-tekst').textContent = l.beskrivelse;

    $('rute').href = 'https://www.google.com/maps/dir/?api=1&destination='
      + encodeURIComponent(l.navn + ', ' + adr);

    if (l.telefon) {
      var kun = String(l.telefon).replace(/\D/g, '');
      $('ring').textContent = 'Ring ' + pænTelefon(l.telefon);
      $('ring').href = 'tel:+45' + kun;
      $('footer-tel').textContent = pænTelefon(l.telefon);
      $('footer-tel').href = 'tel:+45' + kun;
    }

    var email = (d.indstillinger || {}).kontakt_email || l.email;
    if (email) {
      $('footer-email').textContent = email;
      $('footer-email').href = 'mailto:' + email;
      $('footer-email-linje').classList.remove('skjult');
    }
  }

  function visBesked(d) {
    var b = (d.indstillinger || {}).dagens_besked;
    if (b && b.vis && b.tekst) {
      $('dagens-besked').textContent = b.tekst;
      $('dagens-besked').classList.remove('skjult');
    }
  }

  $('aar').textContent = new Date().getFullYear();

  Butik.hent().then(function (d) {
    if (d._offline) $('offline-advarsel').classList.remove('skjult');
    visLokation(d);
    visBesked(d);
    visStatus(d);
    visStribe(d);
    visTider(d);
    visLukkedage(d);
    visMenu(d);
    visKugler(d);
    visTal(d);

    // Står siden åben i timevis – fx på en iPad i vinduet – skal
    // "Åbent nu" stadig passe. Regnes om hvert minut.
    setInterval(function () { visStatus(d); }, 60000);
  });
})();
