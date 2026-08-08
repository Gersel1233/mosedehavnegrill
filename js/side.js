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

  /* Topmenuens glas, burgermenuen, årstallet og rutelinket ligger
     i js/faelles.js. De skal virke ens på forsiden, menukortet og
     smørrebrødssiden, og tre kopier bliver før eller siden tre
     forskellige. */

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

  /* ----------------------------------------------------------
     Videoen i hero
     ----------------------------------------------------------
     Stillbilledet vises altid først, og videoen lægges ovenpå
     når den kan spille. Rækkefølgen betyder noget: går videoen
     galt – dårligt signal, en browser der nægter – bliver
     stillbilledet liggende, og gæsten ser aldrig et sort hul.

     Den hentes slet ikke hvis gæsten har slået reduceret
     bevægelse til, eller har bedt sin telefon om at spare data.

     OG DEN VENTER. Introen kører nu ved hvert besøg, og de to må
     ikke slås om linjen: introen skal være glat, og videoen kan
     ikke ses alligevel mens den kører. Derfor hentes den først
     når introen er færdig – eller straks, hvis der ikke er nogen
     intro (springet over, reduceret bevægelse, ingen canvas).
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

    function hent() {
      if (v.querySelector('source')) return;   // kun én gang
      /* MP4 FØRST. Browseren tager den første kilde den kan
         spille, og H.264-udgaven er både mindre end VP9-udgaven
         (1,3 mod 1,8 MB) OG understøttet overalt. Lå WebM først,
         ville Chrome og Firefox hente den største fil helt
         unødigt.

         WebM'en er til de få browsere der er bygget uden H.264 –
         blandt andet den Chromium testene kører i, hvilket er
         grunden til at videoen overhovedet kan afprøves. */
      [['billeder/hero.mp4', 'video/mp4'],
       ['billeder/hero.webm', 'video/webm']].forEach(function (par) {
        var s = document.createElement('source');
        s.src = par[0];
        s.type = par[1];
        v.appendChild(s);
      });
      v.load();
    }

    if (document.getElementById('intro')) {
      // intro.js sender denne når den er ude af vejen. Vent
      // aldrig i det uendelige: er der gået 10 sekunder, er der
      // noget galt med introen, og videoen skal frem alligevel.
      window.addEventListener('mosede-intro-slut', hent, { once: true });
      setTimeout(hent, 10000);
    } else {
      hent();
    }
  })();

  /* ----------------------------------------------------------
     ISFILMEN LÆNGERE NEDE
     ----------------------------------------------------------
     Den hentes IKKE ved sideindlæsning. En megabyte skal ikke
     koste data hos nogen der aldrig ruller så langt ned.
     Kilderne lægges først på når afsnittet nærmer sig skærmen.

     Den standser når den ruller ud af syne. En video der kører
     videre i baggrunden æder batteri uden at nogen ser den.

     Vil browseren ikke starte af sig selv – eller har gæsten
     frabedt sig bevægelse – kommer der en knap i stedet. Så
     bestemmer gæsten selv, og posterbilledet står imens.

     Funktionen er skrevet som en funktion og ikke bare lagt
     lige ud, fordi der var to film her før. Den bliver stående:
     næste film skal kunne opføre sig ens uden at koden bliver
     skrevet af.
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

    /* Posterbilledet lægges på når afsnittet nærmer sig – eller
       med det samme hvis gæsten selv skal vælge, for så er det
       det eneste der er at se i rammen. */
    function laegPosterPaa() {
      var p = v.getAttribute('data-poster');
      if (p && !v.getAttribute('poster')) v.setAttribute('poster', p);
    }

    function visKnap() {
      laegPosterPaa();
      knap.classList.remove('skjult');
    }

    function proevAtSpille() {
      laegPosterPaa();
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

    /* To observatører med hvert sit formål:

       Den første lægger posterbilledet på i god tid – 600 px før
       rammen kommer i syne – så stillbilledet er der før man ser
       rammen, uden at det bliver hentet hos dem der aldrig ruller
       derned.

       Den anden starter og standser filmen. Den venter til en
       tredjedel af rammen faktisk er inde i skærmen: en video der
       går i gang mens den kun lige er på vej ind, når ikke at blive
       set, men bruger både data og batteri. */
    new IntersectionObserver(function (es, obs) {
      if (es[0].isIntersecting) { laegPosterPaa(); obs.disconnect(); }
    }, { rootMargin: '600px 0px' }).observe(v);

    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) proevAtSpille();
        else if (!v.paused && !v.controls) v.pause();
      });
    }, { rootMargin: '200px 0px', threshold: 0.35 });
    io2.observe(v);
  }

  // MP4 først, selv om isfilmens WebM faktisk er den mindste af
  // de to (683 mod 959 kB): H.264 kan afkodes i hardware på flere
  // apparater, og en video der kører i ring skal helst ikke koste
  // batteri for 276 kB.
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

  // "89 kr." → "89,-" som på et menukort. Ligger i js/faelles.js,
  // så forsiden, menukortet og smørrebrødssiden skriver den samme
  // pris på samme måde.
  var kortPris = window.MosedePris;

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

  /* ---- Kategori-oversigt, ikke hele menukortet ----

     Hele menukortet lå her før: 14 kategorier, 151 varer og 29
     slags smørrebrødsfyld midt på forsiden. Det gjorde siden 5600
     pixel lang på en telefon, og alt det der SÆLGER stedet – isen,
     havnen, smørrebrød ud af huset – lå nedenunder hvor ingen kom
     hen.

     Forsiden viser nu kun hvilke kategorier der findes, og sender
     videre til menu.html. Kategorinavnene hentes fra databasen, så
     der ikke står "Grillretter" på forsiden hvis personalet har
     kaldt kategorien noget andet.

     Afdelingerne står i den rækkefølge man spiser i: mad, is,
     drikkevarer. */
  var AFDELINGER = [
    { id: 'mad', navn: 'Mad' },
    { id: 'is', navn: 'Is og desserter' },
    { id: 'drikke', navn: 'Drikkevarer' },
  ];

  function afdelingFor(k) {
    // Gamle kategorier kan stå med afdeling 'grill'. De hører under
    // mad, så de ikke bliver usynlige efter en halv opgradering.
    return k.afdeling === 'grill' ? 'mad' : k.afdeling;
  }

  function tilId(navn) {
    return String(navn).toLowerCase()
      .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function visMenuOversigt(d) {
    var boks = $('menu-oversigt');
    if (!boks) return;
    tøm(boks);

    AFDELINGER.forEach(function (afd) {
      var kategorier = (d.menu_kategorier || [])
        .filter(function (k) { return k.aktiv !== false && afdelingFor(k) === afd.id; })
        .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); })
        // En kategori uden varer skal ikke stå på forsiden og love
        // noget der ikke findes
        .filter(function (k) {
          return (d.menu_varer || []).some(function (v) {
            return v.kategori_id === k.id && v.aktiv !== false;
          });
        });
      if (!kategorier.length) return;

      var kort = lav('div', 'oversigt-kort');
      kort.appendChild(lav('div', 'eyebrow', afd.navn));

      var liste = lav('div', 'oversigt-liste');
      kategorier.forEach(function (k) {
        var a = lav('a', 'oversigt-kat', k.navn);
        a.href = 'menu.html?afd=' + afd.id + '#kat-' + tilId(k.navn);
        liste.appendChild(a);
      });
      kort.appendChild(liste);
      boks.appendChild(kort);
    });
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

    /* ALLE rutelinks, ikke kun det i "Find os". Der er tre på
       forsiden: i hero, i kontaktkortet og i mobilbjælken.

       js/faelles.js har allerede sat dem alle ud fra
       js/oplysninger.js, så de virker før databasen svarer. Her
       bliver de opdateret med adressen som personalet har skrevet
       i admin – den er nyere end den i koden. */
    var rute = 'https://www.google.com/maps/dir/?api=1&destination='
      + encodeURIComponent(l.navn + ', ' + adr);
    Array.prototype.forEach.call(
      document.querySelectorAll('#rute, #mobil-rute, [data-rute]'),
      function (a) { a.href = rute; }
    );

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
    /* Noten om glutenfri og levering hører til menukortet, og
       menukortet har sin egen side nu. Den står derfor kun der –
       på forsiden ville den love noget om et kort man ikke kan se. */
  }


  Butik.hent().then(function (d) {
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
    visMenuOversigt(d);

    /* ---- Direkte links skal ramme rigtigt ----

       Browseren ruller til #find i det øjeblik HTML'en er læst. Men
       åbningstiderne, menuoversigten og de mest bestilte varer
       kommer FRA DATABASEN og bliver først sat ind bagefter – og så
       er #find skubbet flere hundrede pixel længere ned, mens
       gæsten stadig står, hvor afsnittet lå før.

       Derfor rulles der igen når indholdet er på plads – men KUN
       hvis målet ikke allerede er i syne.

       Første udgave sammenlignede rullepositionen før og efter for
       at se om gæsten selv havde rullet. Det var et kapløb: nogle
       gange havde browseren ikke udført sit eget ankerhop endnu, og
       så så koden en stor forskel og lod være. Spørgsmålet "kan man
       se afsnittet?" har et entydigt svar, og det er det der bliver
       spurgt om nu. */
    if (location.hash && location.hash.length > 1) {
      requestAnimationFrame(function () {
        var maal = document.getElementById(location.hash.slice(1));
        if (!maal) return;
        var r = maal.getBoundingClientRect();
        var iSyne = r.top >= 0 && r.top < window.innerHeight * 0.5;
        if (iSyne) return;

        /* SMOOTH SLÅS FRA FOR NETOP DETTE HOP.

           Arket har scroll-behavior: smooth, og den vinder over
           behavior: 'auto' i scrollIntoView. Resultatet var at en
           gæst der kom ind på .../#find blev slæbt gennem 5000
           pixel side i et sekund, før hun landede. Et direkte link
           skal lande med det samme – man har allerede sagt hvor man
           vil hen.

           Stilen sættes direkte på elementet og fjernes igen, så
           al anden rulning på siden bliver ved med at være blød. */
        var rod = document.documentElement;
        var foer = rod.style.scrollBehavior;
        rod.style.scrollBehavior = 'auto';
        maal.scrollIntoView({ block: 'start' });
        rod.style.scrollBehavior = foer;
      });
    }

    // Står siden åben i timevis – fx på en iPad i vinduet – skal
    // "Åbent nu" stadig passe. Regnes om hvert minut.
    setInterval(function () { visStatus(d); }, 60000);
  });
})();
