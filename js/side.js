/* ============================================================
   FORSIDEN – opførsel og data
   ------------------------------------------------------------
   Intet indhold står i HTML'en hvis personalet skal kunne rette
   det. Priser, åbningstider, adresse og dagens kugler kommer fra
   databasen.

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

  /* ----------------------------------------------------------
     HERO-PARALLAKSE
     ----------------------------------------------------------
     Baggrunden flytter sig med en tredjedel af rulningen, så der
     er dybde mellem billedet og teksten. Kun transform, sat som en
     CSS-variabel, og kun mens heroen er i syne – over den højde
     regner vi ikke længere.

     rAF-strubet: scroll kan fyre hundrede gange i sekundet, og vi
     skal skrive én gang pr. billede. Uden det bliver netop den
     slags effekt grunden til at en side føles tung.
     ---------------------------------------------------------- */
  (function parallakse() {
    var hero = document.querySelector('.hero');
    if (!hero || roligt) return;
    var bg = hero.querySelector('.bg');
    if (!bg) return;

    var venter = false;
    var GRAD = 0.32;

    function tegn() {
      venter = false;
      var y = window.scrollY;
      var h = hero.offsetHeight;
      if (y > h) return;                  // heroen er ude af syne
      bg.style.setProperty('--parallakse', (y * GRAD).toFixed(1) + 'px');
    }

    window.addEventListener('scroll', function () {
      if (venter) return;
      venter = true;
      requestAnimationFrame(tegn);
    }, { passive: true });
    tegn();
  })();

  /* ----------------------------------------------------------
     HEROEN LANDER NÅR INTROEN SLIPPER
     ----------------------------------------------------------
     Alt andet på siden toner ind når man ruller til det. Heroen
     kunne ikke: den ER der når introen letter, og stod derfor helt
     færdig i netop det øjeblik hvor gæsten kigger mest.

     body.klar sætter den i gang. Den sættes STRAKS hvis der ikke er
     nogen intro – sprunget over, reduceret bevægelse, ingen canvas –
     og der er et loft på 10 sekunder, for en hero der aldrig lander
     er en tom skærm. CSS'en lader desuden alt stå synligt under
     reduceret bevægelse, så klassen kun er en tilføjelse.
     ---------------------------------------------------------- */
  (function heroLander() {
    function klar() { document.body.classList.add('klar'); }
    if (roligt || !document.getElementById('intro')) { klar(); return; }
    window.addEventListener('mosede-intro-slut', klar, { once: true });
    setTimeout(klar, 10000);
  })();

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

    function spil() {
      var p = v.play();
      // play() kan afvises. Kun hvis den faktisk kører, tones
      // videoen frem – ellers ville vi vise et frosset billede.
      if (p && p.then) p.then(function () { v.classList.add('vis'); }).catch(function () {});
      else v.classList.add('vis');
    }
    v.addEventListener('canplay', spil, { once: true });

    /* ----------------------------------------------------------
       DEN STANDSER NÅR HEROEN ER UDE AF SYNE
       ----------------------------------------------------------
       Den kørte i ring hele tiden. Er man 4000 px nede på siden,
       afkoder browseren stadig 1280×720 tredive gange i sekundet
       for et billede ingen kan se.

       Målt på forsiden: rulningen kørte 33 billeder i sekundet på
       en computer, og fjernede man hero-videoen helt, sprang den til
       44. Elleve billeder for noget der er ude af skærmen.

       Isfilmen længere nede havde allerede den her observatør – se
       rulleFilm nedenfor. Heroen havde den ikke, fordi den ligger
       øverst og "altid er der". Den er den ikke.
       ---------------------------------------------------------- */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          // Kun hvis der er noget at spille: uden kilder er play()
          // en fejl i konsollen og intet andet.
          if (e.isIntersecting) { if (v.querySelector('source')) spil(); }
          else if (!v.paused) v.pause();
        });
      }, { threshold: 0.05 }).observe(v);
    }

    /* ----------------------------------------------------------
       LODRET UDGAVE TIL TELEFONER
       ----------------------------------------------------------
       Kunden skrev at videoen hakkede på telefonen. Årsagen er
       geometri og ikke kode.

       Videoen er 1280×720 i landskab. Heroen er 100svh, så rammen
       på en iPhone er omkring 390×844 — altså lodret — og
       object-fit: cover gør så dette: browseren skalerer hele
       1280×720 op til højde 844, får 1500×844, og klipper 390 ud af
       de 1500. Den afkoder 921.600 pixels for at vise en strimmel
       der svarer til cirka 333 pixels kilde. Tredive gange i
       sekundet, på det apparat der har mindst at give.

       hero-hoej.mp4 er midten klippet ud i 9:16: 406×720, altså
       292.000 pixels. Det ser ens ud — browseren viste allerede kun
       midten — og det er en tredjedel af arbejdet og under
       halvdelen af vægten (606 mod 1352 kB).

       Grænsen er 700 px og ikke en apparattest, samme grænse som
       isfilmen bruger: en smal browser på en computer har præcis det
       samme problem, og en telefon på tværs har det ikke.

       Der er INGEN lodret råfil. Begge filer i original/ er 1280×720
       i landskab, så billedet kan ikke blive skarpere end det er nu.
       Det kan blive billigere, og det er hvad der sker her.
       Se vaerktoej/lav-hero-telefon.sh.
       ---------------------------------------------------------- */
    function hent() {
      if (v.querySelector('source')) return;   // kun én gang

      var lodret = window.matchMedia
        && window.matchMedia('(max-width: 700px)').matches;
      var navn = lodret ? 'hero-hoej' : 'hero';

      /* MP4 FØRST. Browseren tager den første kilde den kan spille,
         og H.264-udgaven er både mindre end VP9-udgaven OG
         understøttet overalt. Lå WebM først, ville Chrome og Firefox
         hente den største fil helt unødigt.

         WebM'en er til de få browsere der er bygget uden H.264 –
         blandt andet den Chromium testene kører i, hvilket er
         grunden til at videoen overhovedet kan afprøves. */
      [['billeder/' + navn + '.mp4', 'video/mp4'],
       ['billeder/' + navn + '.webm', 'video/webm']].forEach(function (par) {
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

    function spilNu() {
      var p = v.play();
      if (p && p.then) {
        p.then(function () { knap.classList.add('skjult'); }).catch(visKnap);
      }
    }

    /* ---- DEN SKAL IKKE GÅ I GANG FØR DEN KAN KØRE IGENNEM ----

       Filmen hakkede, og værst i starten. Grunden var her: play()
       blev kaldt i samme åndedrag som load(), altså mens filen
       stadig blev hentet. På en telefon nede ved havnen med to
       streger betyder det at browseren spiller de første par
       billeder, løber tør, står stille, spiller videre – og det er
       præcis den hakken man ser.

       Nu ventes der på readyState 4 (HAVE_ENOUGH_DATA), som er
       browserens eget svar på "jeg kan køre den igennem uden at
       standse". Posterbilledet står imens, så rammen aldrig er tom.

       LOFTET PÅ 6 SEKUNDER ER NØDVENDIGT. readyState 4 er et skøn,
       og nogle browsere – Safari på iOS er den kendte – når aldrig
       højere end 3 for en video der kører i ring. Uden loftet ville
       filmen aldrig starte dér. Efter 6 sekunder spilles der
       alligevel: en film der hakker lidt er bedre end en der
       udebliver. */
    var venteUr = 0;
    function proevAtSpille() {
      laegPosterPaa();
      laegKilderPaa();

      if (v.readyState >= 4) { spilNu(); return; }
      if (venteUr) return;              // der ventes allerede

      function naarKlar() {
        clearTimeout(venteUr);
        venteUr = 0;
        v.removeEventListener('canplaythrough', naarKlar);
        spilNu();
      }
      v.addEventListener('canplaythrough', naarKlar);
      venteUr = setTimeout(naarKlar, 6000);
    }

    knap.addEventListener('click', function () {
      v.controls = true;      // trykker man selv, skal man også kunne standse
      /* Trykker gæsten selv, skal der ske noget MED DET SAMME. Så
         venter vi ikke på buffer – browseren viser sin egen
         indlæsning i kontrollerne, og gæsten har allerede sagt ja. */
      laegPosterPaa();
      laegKilderPaa();
      spilNu();
    });

    // Frabedt bevægelse eller sparetilstand: hent ikke noget,
    // men lad gæsten selv vælge
    if (roligt || sparData) { visKnap(); return; }

    if (!('IntersectionObserver' in window)) { visKnap(); return; }

    /* To observatører med hvert sit formål:

       Den første lægger posterbilledet på OG begynder at hente
       filmen – 900 px før rammen kommer i syne. Det er dét der
       giver browseren tid til at fylde bufferen op, så filmen kan
       køre igennem i stedet for at hakke.

       900 px og ikke 600: ved almindelig rullehastighed på en
       telefon er 600 px omkring et halvt sekund, og et halvt sekund
       er ikke nok til at hente 800 kB. Det bliver stadig ikke
       hentet hos dem der aldrig ruller derned, og det er hele
       pointen med at vente.

       Den anden starter og standser filmen. Den venter til en
       tredjedel af rammen faktisk er inde i skærmen: en video der
       går i gang mens den kun lige er på vej ind, når ikke at blive
       set, men bruger både data og batteri. */
    new IntersectionObserver(function (es, obs) {
      if (es[0].isIntersecting) {
        laegPosterPaa();
        laegKilderPaa();
        obs.disconnect();
      }
    }, { rootMargin: '900px 0px' }).observe(v);

    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) proevAtSpille();
        else if (!v.paused && !v.controls) v.pause();
      });
    }, { rootMargin: '200px 0px', threshold: 0.35 });
    io2.observe(v);
  }

  /* ---- HVILKEN AF DE TO ISFILM ----

     Filmen findes i to formater. Den brede er 1920×1080, og i en
     ramme på 350 px – som er hvad afsnittet får på en telefon –
     bliver den 197 px høj: navnet i 96 px ender som 17 px på
     skærmen, og åbningslinjen kan slet ikke læses. Filmen var ikke
     for lille, den var i det forkerte format.

     Den høje er 1080×1350: keglen er 35% større i forhold til
     rammen, kameraet ender oppe i stedet for til siden, og titlen
     står under keglen. Den vejer samtidig mindre (818 mod 1085 kB),
     så telefonen får både den rigtige og den lette.

     Grænsen er 700 px og ikke en apparattest. En smal browser på en
     computer har det samme problem som en telefon, og en telefon på
     tværs har det ikke.

     CSS'en har SAMME grænse (se .film-ramme). Passer de to ikke,
     får man en høj film i en bred ramme, og object-fit: cover
     klipper så titlen af. */
  var hoejFilm = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
  var filmNavn = hoejFilm ? 'isfilm-hoej' : 'isfilm';

  var filmEl = $('isfilm');
  if (filmEl) filmEl.setAttribute('data-poster', 'billeder/' + filmNavn + '-poster.jpg');

  // MP4 først, selv om WebM faktisk er den mindste af de to:
  // H.264 kan afkodes i hardware på flere apparater, og en video
  // der kører i ring skal helst ikke koste batteri for 200 kB.
  rulleFilm('isfilm', 'isfilm-knap', [
    ['billeder/' + filmNavn + '.mp4', 'video/mp4'],
    ['billeder/' + filmNavn + '.webm', 'video/webm'],
  ]);

  /* ==========================================================
     2) SOLNEDGANGEN ER VÆK, OG DET ER BEREGNINGEN OGSÅ
     ----------------------------------------------------------
     Her stod hele solnedgangsalgoritmen fra Almanac for
     Computers – fyrre linjer astronomi – fordi havnestriben viste
     "Solnedgang over havnen 21:05".

     Striben er fjernet. Den havde fire celler: solnedgangen, som
     blev regnet, og vandtemperatur, vind og "dagens ret", som
     personalet skulle skrive i hånden i admin og som derfor stod
     tomme. En stribe hvor tre af fire felter er usynlige, er ikke
     en stribe – det er et sted hvor der plejede at stå noget.

     Beregningen er slettet med den. Kode uden en modtager er kode
     den næste skal læse og finde ud af ikke bliver brugt.
     ========================================================== */
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

  /* Forkortelsen fra hele sætninger til én pillelinje stod HER, og
     kun her. Menukortet og bestillingssiden havde derfor deres egen
     udgave — s.overskrift + ' · ' + s.detalje — som skrev "Åbent nu ·
     Åbent til kl. 21:00". Nu står den i js/store.js som
     Butik.pilleTekst, så alle tre sider siger det samme. */

  function visStatus(d) {
    var s = Butik.status(d);
    var nu = Butik.nu();

    // Prikken skifter farve, men der står ALTID også "Åbent" eller
    // "Lukket" – farven står aldrig alene.
    var prik = $('hero-status').querySelector('.dot');
    prik.className = 'dot' + (s.aaben ? '' : ' lukket');

    var tekst = Butik.pilleTekst(s);

    /* Pillen tegnes om hvert minut (se setInterval nedenfor). De 59
       af de 60 gange står der præcis det samme, og en animation
       hver gang ville blinke uden grund. Derfor sammenlignes der
       med det der stod før, og kun den ene gang teksten FALDER –
       "Åbent nu" bliver "Lukker om 20 min" – blinker pillen.

       Klassen fjernes og sættes igen med et layout imellem, ellers
       genstarter animationen ikke. */
    var felt = $('hero-status-tekst');
    if (felt.textContent && felt.textContent !== tekst) {
      var pille = $('hero-status');
      pille.classList.remove('status-skift');
      void pille.offsetWidth;
      pille.classList.add('status-skift');
    }
    felt.textContent = tekst;

    /* Havnestribens "Lige nu"-celle er væk. Den sagde det samme som
       åbent-pillen 200 px længere op, med de samme ord. nu bruges
       stadig længere nede – lad den blive stående. */
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

  /* ---- SMØRREBRØD UD AF HUSET ----

     Her stod visFavoritter: fem kort med et udvalg der roterede
     hver time, valgt blandt de varer personalet havde markeret som
     fremhævet. Se noten i index.html om hvorfor den er væk.

     Det her afsnit viser i stedet det forretningen sælger på
     hjemmesiden. Alt i det kommer fra menukortet:

       stykkerne  kategorien "Smørrebrød", dem med en pris
       fyldene    kategorien "Vælg fyld", dem uden pris — TÆLLES

     Antallet af slags fyld står altså ikke skrevet i hånden nogen
     steder. Sætter personalet en slags udsolgt, falder tallet af sig
     selv, og der kan ikke komme til at stå "29 slags" den dag der er
     27. Se Butik.smoerrebroed i js/store.js.

     Er kategorien tom — en halvt opsat database, eller alt sat
     udsolgt — skjuler blokken sig selv. En tom ramme med en
     bestil-knap er værre end ingen blok: man trykker, og så er der
     ingenting at vælge. */
  function visSmoerrebroed(d) {
    var afsnit = $('smoerrebroed');
    var liste = $('smoer-liste');
    if (!afsnit || !liste) return;

    var s = Butik.smoerrebroed(d);
    if (!s.stykker.length) { afsnit.classList.add('skjult'); return; }
    afsnit.classList.remove('skjult');

    tøm(liste);
    s.stykker.forEach(function (v) {
      var li = lav('li', 'smoer-raekke');
      var navn = lav('span', 'smoer-navn', v.navn);
      if (v.beskrivelse) {
        navn.appendChild(lav('span', 'smoer-desc', v.beskrivelse));
      }
      li.appendChild(navn);

      var pris = kortPris(v.pris);
      if (pris) li.appendChild(lav('span', 'smoer-pris', pris));
      liste.appendChild(li);
    });

    /* "og 29 slags fyld at vælge imellem" – tallet tælles.
       Er der ingen fyld i kortet, står linjen ikke. */
    var fyld = $('smoer-fyld');
    if (fyld) {
      fyld.textContent = s.fyld.length
        ? s.fyld.length + ' slags fyld at vælge imellem'
        : '';
      fyld.classList.toggle('skjult', !s.fyld.length);
    }
  }

  function kategoriNavn(d, id) {
    var k = (d.menu_kategorier || []).filter(function (x) { return x.id === id; })[0];
    return k ? k.navn : '';
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

  /* tilId er væk. Den lavede et kategorinavn til et anker
     ("Vælg fyld til smørrebrødet" → "vaelg-fyld-til-smoerrebroedet")
     til de dybe links på kategoripillerne. Pillerne er fjernet — se
     noten i visMenuOversigt — og js/menuside.js har sin egen udgave
     til de ankre den selv sætter på kategorierne. */

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

      /* ---- Tal i stedet for løfter ----

         Kortet stod før med afdelingens navn i småt og en stak
         kategorinavne under. Det var en indholdsfortegnelse, og en
         indholdsfortegnelse sælger ingenting: den siger ikke hvor
         stort udvalget er, og den er ikke til at ramme med en
         tomme.

         Nu står der hvor mange kategorier og hvor mange varer der
         er. Begge tal REGNES ud af menukortet, så de ikke kan blive
         forældede – og de er sande, hvilket "stort udvalg" ikke
         ville være.

         DER STÅR IKKE "fra 25,-".
         Det var det første forsøg, og det ville have været sandt og
         alligevel vildledende: den billigste vare under Is og
         desserter er en løs vaffel til 4 kr., så kortet ville have
         lovet "fra 4,-" om en afdeling hvor en is koster 30. Et tal
         der er rigtigt og giver et forkert indtryk, er værre end
         intet tal. */
      var ider = kategorier.map(function (k) { return k.id; });
      var varer = (d.menu_varer || []).filter(function (v) {
        return v.aktiv !== false && ider.indexOf(v.kategori_id) >= 0;
      });

      /* KATEGORIPILLERNE ER BLEVET ÉN TEKSTLINJE, OG KORTET ÉT LINK.

         Hver kategori stod som en rund pille med et dybt link. Det
         lød rigtigt, og det så forkert ud: en pille har den bredde
         dens navn har, så "Øl" blev 44 px og "Vælg fyld til
         smørrebrødet" 190. På det rigtige kort har Mad syv
         kategorier mod Drikkevarers tre, og det gav tre kort i vidt
         forskellig højde med ragged klumper i. Kunden kaldte
         knapperne sjuskede, og det var de.

         Første rettelse var at fjerne navnene helt. Det var for
         meget: "Mad · 2 kategorier · 3 varer" siger ikke om der er
         smørrebrød eller burgere, og det er netop det man vil vide.

         Navnene står derfor stadig — som ÉN linje almindelig tekst
         med prikker imellem. En tekstlinje ombrydes jævnt, den kan
         ikke få ujævne bredder, og den kan ikke gøre to kort
         forskellig høje af andre grunde end deres længde.

         Hele kortet er linket i stedet, og det er en større
         trykflade end en pille nogensinde bliver. De dybe links til
         hver kategori er ikke tabt: menukortet har sin egen række
         genveje (.kat-stier), som gør præcis det samme og ligger dér
         hvor kategorierne står. */
      var kort = lav('a', 'oversigt-kort');
      kort.href = 'menu.html?afd=' + afd.id;
      kort.appendChild(lav('h3', 'oversigt-navn', afd.navn));
      kort.appendChild(lav('p', 'oversigt-tal',
        kategorier.length + (kategorier.length === 1 ? ' kategori' : ' kategorier')
        + ' · ' + varer.length + (varer.length === 1 ? ' vare' : ' varer')));
      kort.appendChild(lav('p', 'oversigt-kat',
        kategorier.map(function (k) { return k.navn; }).join(' · ')));
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
    /* Adressen står i kortet nedenunder, i tre linjer, som en
       adresse skal. Den stod HER OGSÅ, 80 px derfra, og to steder
       med den samme vej og det samme postnummer gør ikke adressen
       mere sikker – det gør afsnittet til noget man skimmer. */
    $('find-under').textContent = 'Nede på havnen, ud mod vandet.';
    if (l.beskrivelse) $('hero-tekst').textContent = l.beskrivelse;

    /* ALLE rutelinks, ikke kun det i "Find os". Der er to på
       forsiden: i hero og ved adressen, og et i skuffemenuen.

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
      /* tel2 er væk: nummeret stod under et TELEFON-mærkat lige ved
         siden af den knap hvor det også står. Knappen er den der
         bliver trykket på. */
      ['ring', 'footer-tel', 'arr-ring'].forEach(function (id) {
        if ($(id)) $(id).href = 'tel:+45' + kun;
      });
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
    visTider(d);
    visLukkedage(d);
    visSmoerrebroed(d);
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
