/* ============================================================
   FORSIDEN – opførsel og data
   ------------------------------------------------------------
   Intet indhold står i HTML'en hvis personalet skal kunne rette
   det. Priser, åbningstider, adresse og dagens kugler kommer fra
   databasen.

   Solnedgangen REGNES ud for havnens position. Det er ægte data
   uden at spørge nogen om lov.

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

  var hd = $('hd');
  window.addEventListener('scroll', function () {
    hd.classList.toggle('stuck', window.scrollY > window.innerHeight * .72);
  }, { passive: true });

  // Indtoning. Uden IntersectionObserver vises alt med det samme –
  // indholdet må aldrig kunne blive usynligt for evigt.
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
    setTimeout(function () { if (!ark.classList.contains('aaben')) ark.hidden = true; }, 450);
    burger.focus();
  }
  function aabnArk() {
    ark.hidden = false;
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
  ark.addEventListener('click', function (e) { if (e.target.tagName === 'A') lukArk(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ark.classList.contains('aaben')) lukArk();
  });

  /* ----------------------------------------------------------
     Videoen i hero
     ----------------------------------------------------------
     Stillbilledet vises altid først, og videoen lægges ovenpå
     når den kan spille. Rækkefølgen betyder noget: går videoen
     galt – dårligt signal, en browser der nægter – bliver
     stillbilledet liggende, og gæsten ser aldrig et sort hul.

     Den hentes slet ikke hvis gæsten har slået reduceret
     bevægelse til, eller har bedt sin telefon om at spare data.
     ---------------------------------------------------------- */
  (function film() {
    var v = $('hero-film');
    if (!v || roligt) return;

    var forb = navigator.connection || navigator.webkitConnection;
    if (forb && (forb.saveData || /^(slow-)?2g$/.test(forb.effectiveType || ''))) return;

    v.addEventListener('canplay', function () {
      var p = v.play();
      // play() kan afvises. Kun hvis den faktisk kører, tones
      // videoen frem – ellers ville vi vise et frosset billede.
      if (p && p.then) p.then(function () { v.classList.add('vis'); }).catch(function () {});
      else v.classList.add('vis');
    }, { once: true });

    /* MP4 FØRST. Browseren tager den første kilde den kan spille,
       og H.264-udgaven er både mindre end VP9-udgaven her OG
       understøttet overalt. Lå WebM først, ville Chrome og Firefox
       hente den største fil helt unødigt.

       WebM'en er til de få browsere der er bygget uden H.264 –
       blandt andet den Chromium testene kører i, hvilket er
       grunden til at videoen overhovedet kan afprøves. */
    [['billeder/havnen.mp4', 'video/mp4'],
     ['billeder/havnen.webm', 'video/webm']].forEach(function (par) {
      var s = document.createElement('source');
      s.src = par[0];
      s.type = par[1];
      v.appendChild(s);
    });
    v.load();
  })();

  /* ----------------------------------------------------------
     FILMENE LÆNGERE NEDE
     ----------------------------------------------------------
     To videoer ligger nede på siden: montagen fra havnen og den
     tegnede isfilm. De opfører sig ens, så de deler kode.

     Ingen af dem hentes ved sideindlæsning. Godt to megabyte
     skal ikke koste data hos nogen der aldrig ruller så langt
     ned. Kilderne lægges først på når afsnittet nærmer sig
     skærmen.

     De standser når de ruller ud af syne. En video der kører
     videre i baggrunden æder batteri uden at nogen ser den.

     Vil browseren ikke starte af sig selv – eller har gæsten
     frabedt sig bevægelse – kommer der en knap i stedet. Så
     bestemmer gæsten selv, og posterbilledet står imens.
     ---------------------------------------------------------- */
  function rulleFilm(videoId, knapId, kilder) {
    var v = $(videoId);
    var knap = $(knapId);
    if (!v || !knap) return;

    var lagtPaa = false;
    var forb = navigator.connection || navigator.webkitConnection;
    var sparData = !!(forb && (forb.saveData || /^(slow-)?2g$/.test(forb.effectiveType || '')));

    function laegKilderPaa() {
      if (lagtPaa) return;
      lagtPaa = true;
      kilder.forEach(function (par) {
        var s = document.createElement('source');
        s.src = par[0]; s.type = par[1];
        v.appendChild(s);
      });
      v.load();
    }

    function visKnap() { knap.classList.remove('skjult'); }

    function proevAtSpille() {
      laegKilderPaa();
      var p = v.play();
      if (p && p.then) {
        p.then(function () { knap.classList.add('skjult'); }).catch(visKnap);
      }
    }

    knap.addEventListener('click', function () {
      v.controls = true;      // trykker man selv, skal man også kunne standse
      proevAtSpille();
    });

    // Frabedt bevægelse eller sparetilstand: hent ikke noget,
    // men lad gæsten selv vælge
    if (roligt || sparData) { visKnap(); return; }

    if (!('IntersectionObserver' in window)) { visKnap(); return; }

    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) proevAtSpille();
        else if (!v.paused && !v.controls) v.pause();
      });
    }, { rootMargin: '200px 0px', threshold: 0.35 });
    io2.observe(v);
  }

  // MP4 først i begge: mindre end VP9-udgaven for montagen, og
  // for isfilmen fordi H.264 kan afkodes i hardware på flere
  // apparater. Isfilmens WebM er faktisk den mindste af de to
  // (683 mod 959 kB), men en video der kører i ring skal helst
  // ikke belaste batteriet for 276 kB.
  rulleFilm('montage-film', 'film-knap', [
    ['billeder/montage.mp4', 'video/mp4'],
    ['billeder/montage.webm', 'video/webm'],
  ]);
  rulleFilm('isfilm', 'isfilm-knap', [
    ['billeder/isfilm.mp4', 'video/mp4'],
    ['billeder/isfilm.webm', 'video/webm'],
  ]);

  /* ==========================================================
     2) SOLNEDGANG
     ----------------------------------------------------------
     Standard-algoritmen fra Almanac for Computers. Mosede Havn
     ligger på 55,585° N, 12,283° Ø.

     Zenit 90,833° i stedet for 90°: det tager højde for solens
     egen bredde og for at lyset bøjes i atmosfæren, så tallet
     passer med hvad man ser fra molen.
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

    var M = (0.9856 * t) - 3.289;
    var L = normaliser(
      M + (1.916 * Math.sin(M * RAD)) + (0.020 * Math.sin(2 * M * RAD)) + 282.634, 360);

    var RA = normaliser(Math.atan(0.91764 * Math.tan(L * RAD)) / RAD, 360);
    RA += (Math.floor(L / 90) * 90) - (Math.floor(RA / 90) * 90);
    RA /= 15;

    var sinDec = 0.39782 * Math.sin(L * RAD);
    var cosDec = Math.cos(Math.asin(sinDec));

    var cosH = (Math.cos(ZENIT * RAD) - (sinDec * Math.sin(LAT * RAD)))
             / (cosDec * Math.cos(LAT * RAD));
    // Over polarkredsen går solen slet ikke ned. Sker ikke i Greve,
    // men så står der ingenting i stedet for noget forkert.
    if (cosH > 1 || cosH < -1) return null;

    var H = Math.acos(cosH) / RAD / 15;
    return normaliser(H + RA - (0.06571 * t) - 6.622 - lngTime, 24);
  }

  function solnedgangDansk(iso) {
    var d = iso.split('-').map(Number);
    var ut = solnedgangUT(d[0], d[1], d[2]);
    if (ut === null) return null;

    var ms = Date.UTC(d[0], d[1] - 1, d[2]) + ut * 3600000;
    // sv-SE fordi dansk skriver 21.05 med punktum, og her skal der
    // kolon. Tidszonen er stadig dansk, så sommertid passer.
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

  // "89 kr." → "89,-" som på et menukort
  function kortPris(p) {
    var s = Butik.pris(p);
    return s ? s.replace(' kr.', ',-') : '';
  }

  /* Datalaget svarer i hele sætninger ("Vi åbner i morgen kl.
     10:00"). I en lille etiket er der ikke plads til en sætning. */
  function kortForm(detalje) {
    return String(detalje || '')
      .replace(/^Åbent til kl\. /, 'til ')
      .replace(/^Vi lukker /, 'lukker ')
      .replace(/^Vi åbner igen /, 'åbner ')
      .replace(/^Vi åbner /, 'åbner ')
      .replace(/ kl\. /, ' ');
  }

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

  /* Ens dage i træk lægges sammen til "Mandag – torsdag", men i dag
     får altid sin egen linje. Ellers ligger dagens tid begravet
     midt i en gruppe, og det er den ene linje gæsten leder efter. */
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
      if (sidste && sidste.tekst === t && sidste.til === u - 1
          && u !== iDag && sidste.fra !== iDag) sidste.til = u;
      else grupper.push({ fra: u, til: u, tekst: t });
    }

    grupper.forEach(function (g) {
      var erIDag = g.fra === iDag && g.til === iDag;
      var navn = g.fra === g.til
        ? Butik.UGEDAGE[g.fra]
        : Butik.UGEDAGE[g.fra] + ' – ' + Butik.UGEDAGE[g.til].toLowerCase();

      var r = lav('div', erIDag ? 'now' : null);
      r.appendChild(lav('span', null, navn + (erIDag ? ' (i dag)' : '')));
      r.appendChild(lav('span', null, g.tekst));
      boks.appendChild(r);
    });
  }

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

  // ---- Mest bestilte ----
  function visFavoritter(d) {
    var boks = $('favoritter-liste');
    tøm(boks);

    var varer = (d.menu_varer || []).filter(function (v) {
      return v.aktiv !== false && v.fremhaevet;
    }).sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); }).slice(0, 8);

    if (!varer.length) { $('favoritter').classList.add('skjult'); return; }
    $('favoritter').classList.remove('skjult');

    varer.forEach(function (v) {
      var k = lav('article', 'fav' + (v.udsolgt ? ' udsolgt' : ''));
      k.appendChild(lav('h3', null, v.navn));
      if (v.beskrivelse) k.appendChild(lav('p', 'desc', v.beskrivelse));

      var bund = lav('div', 'fav-bund');
      var pris = kortPris(v.pris);
      if (pris) bund.appendChild(lav('span', 'fav-pris', pris));
      if (v.udsolgt) bund.appendChild(lav('span', 'maerke udsolgt', 'Udsolgt'));
      k.appendChild(bund);

      boks.appendChild(k);
    });
  }

  // ---- Hele menukortet, med tre afdelinger ----
  var AFDELINGER = ['mad', 'is', 'drikke'];
  var valgtAfdeling = 'mad';
  var data = null;

  function visMenu() {
    var boks = $('menu-liste');
    tøm(boks);

    var grupper = (data.menu_kategorier || [])
      .filter(function (k) {
        // Gamle kategorier kan stå med afdeling 'grill'. De hører
        // under mad, så de ikke bliver usynlige efter en halv
        // opgradering af databasen.
        var afd = k.afdeling === 'grill' ? 'mad' : k.afdeling;
        return k.aktiv !== false && afd === valgtAfdeling;
      })
      .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); })
      .map(function (k) {
        return {
          kategori: k,
          varer: (data.menu_varer || [])
            .filter(function (v) { return v.kategori_id === k.id && v.aktiv !== false; })
            .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); }),
        };
      })
      .filter(function (g) { return g.varer.length > 0; });

    if (!grupper.length) {
      boks.appendChild(lav('p', 'desc', 'Der er ikke lagt noget ind i denne afdeling endnu.'));
      return;
    }

    grupper.forEach(function (g) {
      var sek = lav('div', 'kat');
      sek.appendChild(lav('h3', null, g.kategori.navn));

      // Har INGEN vare i kategorien en pris, er det en liste at
      // vælge fra – fx fyldet til smørrebrødet. Så ville en søjle
      // med 29 tankestreger være støj. Den vises som små pastiller
      // i stedet.
      var harPris = g.varer.some(function (v) {
        return v.pris !== null && v.pris !== undefined && v.pris !== '';
      });

      if (!harPris) {
        var pille = lav('div', 'valg');
        g.varer.forEach(function (v) {
          pille.appendChild(lav('span', 'valg-en' + (v.udsolgt ? ' udsolgt' : ''), v.navn));
        });
        sek.appendChild(pille);
      } else {
        g.varer.forEach(function (v) {
          var r = lav('div', 'linje' + (v.udsolgt ? ' udsolgt' : ''));

          var venstre = lav('div', 'linje-navn');
          venstre.appendChild(lav('span', 'navn', v.navn));
          if (v.udsolgt) venstre.appendChild(lav('span', 'maerke udsolgt', 'Udsolgt'));
          if (v.beskrivelse) venstre.appendChild(lav('p', 'desc', v.beskrivelse));
          r.appendChild(venstre);

          // Tom pris giver ingen pris. Aldrig et gæt.
          var p = kortPris(v.pris);
          if (p) r.appendChild(lav('span', 'linje-pris', p));
          sek.appendChild(r);
        });
      }
      boks.appendChild(sek);
    });
  }

  function skiftAfdeling(ny) {
    valgtAfdeling = ny;
    AFDELINGER.forEach(function (a) {
      var b = $('afd-' + a);
      var valgt = a === ny;
      b.setAttribute('aria-selected', valgt ? 'true' : 'false');
      b.className = valgt ? 'glass sm valgt' : 'glass sm';
    });
    visMenu();
  }
  AFDELINGER.forEach(function (a) {
    $('afd-' + a).addEventListener('click', function () { skiftAfdeling(a); });
  });

  /* Linket fra isafsnittet ned til menukortet skal ikke bare
     hoppe – det skal også slå over på is-fanen. Ellers lander
     gæsten på madkortet efter at have trykket på et link der
     lovede is. */
  var tilIs = $('isen-til-menu');
  if (tilIs) {
    tilIs.addEventListener('click', function () { skiftAfdeling('is'); });
  }

  // ---- Kagepriserne, hentet fra menukortet ----
  function visKagePriser(d) {
    var boks = $('kage-priser');
    tøm(boks);
    var vil = ['Kage', 'Kaffe og kage', 'Kaffe og pandekage'];

    vil.forEach(function (navn) {
      var v = (d.menu_varer || []).filter(function (x) {
        return x.navn === navn && x.aktiv !== false && x.pris !== null;
      })[0];
      if (!v) return;
      boks.appendChild(lav('span', 'glass sm', v.navn + ' ' + kortPris(v.pris)));
    });
  }

  // ---- Dagens kugler ----
  function visKugler(d) {
    var kugler = (d.indstillinger || {}).dagens_kugler;
    if (!Array.isArray(kugler) || !kugler.length) return;   // afsnittet er skjult i forvejen

    $('kugler-dag').textContent =
      'Dagens kugler · ' + Butik.UGEDAGE[Butik.nu().ugedag].toLowerCase();
    $('kugler-overskrift').textContent = kugler.length + ' slags på tavlen i dag';

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
    $('is').classList.remove('skjult');
  }

  function visStribe(d) {
    var ind = d.indstillinger || {};
    var sol = solnedgangDansk(Butik.nu().dato);
    if (sol) $('solnedgang').textContent = sol;
    else $('celle-solnedgang').classList.add('skjult');

    [['vandtemp', 'celle-vandtemp'], ['vind', 'celle-vind'], ['landing', 'celle-landing']]
      .forEach(function (par) {
        if (ind[par[0]]) {
          $(par[0]).textContent = ind[par[0]];
          $(par[1]).classList.remove('skjult');
        }
      });
  }

  function visLokation(d) {
    var l = (d.lokationer || [])[0];
    if (!l) return;

    var adr = l.adresse + ', ' + l.postnr + ' ' + l.by;

    tøm($('adresse'));
    $('adresse').appendChild(document.createTextNode(l.navn));
    $('adresse').appendChild(document.createElement('br'));
    $('adresse').appendChild(document.createTextNode(l.adresse));
    $('adresse').appendChild(document.createElement('br'));
    $('adresse').appendChild(document.createTextNode(l.postnr + ' ' + l.by));

    $('footer-adresse').textContent = l.adresse + ' · ' + l.postnr + ' ' + l.by;
    $('find-under').textContent = adr + '. Nede på havnen, ud mod vandet.';
    if (l.beskrivelse) $('hero-tekst').textContent = l.beskrivelse;

    $('rute').href = 'https://www.google.com/maps/dir/?api=1&destination='
      + encodeURIComponent(l.navn + ', ' + adr);

    if (l.telefon) {
      var kun = String(l.telefon).replace(/\D/g, '');
      var pæn = pænTelefon(l.telefon);
      $('ring').textContent = 'Ring ' + pæn;
      ['ring', 'tel2', 'footer-tel', 'arr-ring'].forEach(function (id) {
        if ($(id)) $(id).href = 'tel:+45' + kun;
      });
      $('tel2').textContent = pæn;
      $('footer-tel').textContent = pæn;
    }

    var email = (d.indstillinger || {}).kontakt_email || l.email;
    if (email) {
      ['email', 'footer-email'].forEach(function (id) {
        $(id).textContent = email;
        $(id).href = 'mailto:' + email;
      });
      $('email-linje').classList.remove('skjult');
      $('footer-email-linje').classList.remove('skjult');
    }
  }

  function visBesked(d) {
    var b = (d.indstillinger || {}).dagens_besked;
    if (b && b.vis && b.tekst) {
      $('dagens-besked').textContent = b.tekst;
      $('dagens-besked').classList.remove('skjult');
    }
    var n = (d.indstillinger || {}).menu_note;
    if (n) {
      $('menu-note').textContent = n;
      $('menu-note').classList.remove('skjult');
    }
  }

  $('aar').textContent = new Date().getFullYear();

  Butik.hent().then(function (d) {
    data = d;
    if (d._offline) $('offline-advarsel').classList.remove('skjult');

    visLokation(d);
    visBesked(d);
    visStatus(d);
    visStribe(d);
    visTider(d);
    visLukkedage(d);
    visFavoritter(d);
    visKagePriser(d);
    visKugler(d);
    // skiftAfdeling frem for visMenu: den sætter også den valgte
    // fane visuelt. Kaldte vi kun visMenu, stod alle tre faner
    // hvide ved indlæsning, og gæsten kunne ikke se hvilken
    // afdeling hun så på.
    skiftAfdeling(valgtAfdeling);

    // Står siden åben i timevis – fx på en iPad i vinduet – skal
    // "Åbent nu" stadig passe. Regnes om hvert minut.
    setInterval(function () { visStatus(d); }, 60000);
  });
})();
