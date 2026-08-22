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

  /* INDTONINGEN BOR I js/faelles.js NU — den lå her, og det var en
     rigtig fejl i luften: bestil/ og smørrebrødssiden havde
     .rev-sektioner, men indlæser ikke side.js. Fem sektioner stod
     med opacity 0 FOR EVIGT — hele smørrebrødssidens indhold var
     usynligt. Fundet ved at måle, ikke ved at læse: opacity '0'
     på alle .rev-elementer på begge sider.

     Motoren skal bo dér, hvor alle sider er — og det er præcis
     grunden til, at faelles.js findes. */

  /* ----------------------------------------------------------
     DEN KLÆBENDE BESTIL-KNAP: kontrakten har skiftet TO gange
     ----------------------------------------------------------
     Første udgave gemte pillen for både heroens knap og
     formularen. Kunden bad om spiis' faste selskab — synlig hele
     tiden — og lytteren røg ud herfra. Så så kunden sin telefon:
     heroens røde knap og pillen stod oven i hinanden med samme
     tekst, og det lignede en fejl.

     Kontrakten NU: pillen viger kun for heroens knaprække og er
     der resten af siden. Lytteren bor NEDERST i den her fil —
     ret den dér, ikke her, og ret prøverne i telefon.spec.js og
     bestil-doeren.spec.js med, for de måler begge veje. */

  /* ----------------------------------------------------------
     Billeder der først må hentes når de er tæt på
     ----------------------------------------------------------
     loading="lazy" var der før, og det holdt ikke. Kagefotoet
     står tre skærme nede og blev alligevel hentet – 241 kB på en
     telefon – mens introen kørte. Browseren bestemmer selv hvor
     tidligt "lazy" slår til, og på en hurtig forbindelse henter
     Chromium langt ned ad siden.

     400 px er valgt så billedet er hentet FØR gæsten ser
     pladsen, ikke bagefter. Det er hele forskellen på at spare
     data og på at gæsten kigger på et hul.

     Uden IntersectionObserver lægges adressen på med det samme.
     Et billede må aldrig kunne blive væk, fordi en browser er for
     gammel.
     ---------------------------------------------------------- */
  (function senereBilleder() {
    var sene = document.querySelectorAll('img[data-src]');
    if (!sene.length) return;

    function hent(img) {
      if (img.getAttribute('data-srcset')) {
        img.srcset = img.getAttribute('data-srcset');
        img.removeAttribute('data-srcset');
      }
      img.src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
    }

    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(sene, hent);
      return;
    }

    var iob = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        iob.unobserve(e.target);
        hent(e.target);
      });
    }, { rootMargin: '400px 0px' });

    Array.prototype.forEach.call(sene, function (img) { iob.observe(img); });
  })();

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

    /* ----------------------------------------------------------
       VIDEOEN MÅ IKKE HENTES I SAMME BILLEDE SOM HEROEN LANDER
       ----------------------------------------------------------
       Kunden skrev at overgangen fra introen til landingen hakkede.
       Målt på en computer, tabte billeder i de 2,6 sekunder overgangen
       varer:

         med alt                    23 tabte, værste billede 68 ms
         uden bogstavernes sammentr. 17 tabte
         UDEN VIDEOEN                 2 tabte

       Videoen stod altså for 21 af de 23. Ikke fordi den er stor —
       download er netværk og ikke hovedtråd — men fordi load() plus
       afkodningen af de første billeder faldt i præcis det øjeblik
       heroens indflyvning skulle bruge hovedtråden.

       DER VENTES PÅ AT HOVEDTRÅDEN ER LEDIG, ikke på et tal.

       Første forsøg var 400 ms. Det halverede problemet — 23 tabte
       billeder blev til 15 — og standsede der, fordi heroens
       koreografi ikke er færdig efter 400 ms. Linjerne stiger over
       0,85 s med op til 0,30 s forsinkelse, og "Rul ned" toner ind med
       0,8 s forsinkelse og 0,8 s varighed. Der går altså 1,6 sekunder
       før heroen står stille, og et hvilket som helst fast tal under
       det rammer stadig midt i noget.

       requestIdleCallback blev prøvet — "gør det når der er plads, dog
       senest om X" — og kastet ud igen. Den kan STARVES: er der en
       rAF-løkke i gang, finder den aldrig ledig tid og udløser først på
       sin timeout. Heroens parallakse er sådan en løkke. Så ville
       hentningen falde på et tilfældigt tidspunkt i stedet for et
       valgt, og det er dårligere end et tal man selv har sat.

       1700 ms er ikke gættet: det er de 1,6 sekunder koreografien
       varer, plus lidt slæk.

       Det koster ingenting at se på: videoen ligger på opacity: 0
       indtil den kan spille, og under den ligger facadefotoet, som er
       det SAMME motiv som videoens første sekund. Man kan ikke se de
       halvandet sekund — man kan kun mærke dem, hvis de ikke er der.

       requestAnimationFrame oveni, så hentningen aldrig lander midt i
       det billede hvor timeren udløber.
       ---------------------------------------------------------- */
    function hentSenere() {
      setTimeout(function () {
        if (window.requestAnimationFrame) requestAnimationFrame(hent);
        else hent();
      }, 1700);
    }

    if (document.getElementById('intro')) {
      // intro.js sender denne når fadet begynder. Vent aldrig i det
      // uendelige: er der gået 10 sekunder, er der noget galt med
      // introen, og videoen skal frem alligevel.
      window.addEventListener('mosede-intro-slut', hentSenere, { once: true });
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
  function rulleFilm(videoId, knapId, kilder, smeltIndtil) {
    var v = $(videoId);
    var knap = $(knapId);
    if (!v || !knap) return;

    /* Isen skal stå PÅ sandet, ikke i en kasse — se .smelter i
       CSS'en. Rammen smelter kun ind i siden mens filmen faktisk
       SPILLER sin sand-del: plakat, pause og afspil-knap får den
       fulde ramme, for en feathret solnedgang ser forkert ud.
       timeupdate er nok som puls (4-5 gange i sekundet): filmens
       egen overtoning tager et helt sekund. */
    var ramme = v.parentNode;
    function opdaterSmelt() {
      if (!smeltIndtil || !ramme.classList) return;
      ramme.classList.toggle('smelter', !v.paused && v.currentTime < smeltIndtil);
    }
    ['timeupdate', 'play', 'pause', 'ended'].forEach(function (h) {
      v.addEventListener(h, opdaterSmelt);
    });

    var lagtPaa = false;
    // Om rammen er i syne lige nu. Bruges når et afvist play() prøves
    // igen ved en berøring: er man rullet videre, skal et tryk et
    // andet sted ikke sætte filmen i gang.
    var iSyne = false;
    var forb = navigator.connection || navigator.webkitConnection;
    var sparData = !!(forb && (forb.saveData || /^(slow-)?2g$/.test(forb.effectiveType || '')));

    function laegKilderPaa() {
      if (lagtPaa) return;
      lagtPaa = true;
      /* preload="none" står på elementet for at attributterne ikke
         skal koste noget før kilderne findes — men den BLIVER
         stående efter load(), og så henter browseren kun metadata,
         til der bliver kaldt play(). Det åd hele forspringet på
         900 px: filmen begyndte med tom buffer og hakkede på en
         telefon. Når vi selv har besluttet at hente, skal der
         hentes. */
      v.preload = 'auto';
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

    /* ET AFVIST play() ER IKKE ET ENDELIGT SVAR.

       Før stod der .catch(visKnap): blev play() afvist én gang, kom
       "Afspil filmen" frem og blev der. Kunden skrev at filmen ikke
       startede af sig selv på telefonen, og at knappen ikke var et
       svar hun ville acceptere.

       iOS Safari afviser play() i flere tilfælde der IKKE er varige:
       strømsparetilstand, en video der endnu ikke har data nok, og et
       kald der ligger for langt fra en berøring. Alle tre kan være
       forbi et sekund senere.

       Derfor: knappen kommer frem som nødudgang, OG der prøves igen
       ved den første berøring gæsten laver et vilkårligt sted på
       siden. Lykkes det, gemmer knappen sig selv igen, og gæsten har
       ikke skullet gøre noget bevidst.

       Berøringen er nøglen. På iOS åbner den FØRSTE brugerhandling en
       dør for medieafspilning på hele siden, og den dør bliver ved med
       at være åben. Introen lukkes nu ved et tryk hvor som helst, så
       de fleste besøg HAR en berøring inden man er rullet ned til
       filmen. */
    var venterPaaBeroering = false;

    function proevIgenVedBeroering() {
      if (venterPaaBeroering) return;
      venterPaaBeroering = true;

      function paaBeroering() {
        // Kun hvis filmen stadig er i syne. Er man rullet videre,
        // skal et tryk et andet sted ikke sætte den i gang.
        if (v.paused && iSyne) spilNu();
      }
      ['pointerdown', 'touchstart', 'click'].forEach(function (h) {
        document.addEventListener(h, paaBeroering, { once: true, passive: true });
      });
    }

    function spilNu() {
      var p = v.play();
      if (p && p.then) {
        p.then(function () { knap.classList.add('skjult'); })
          .catch(function () { visKnap(); proevIgenVedBeroering(); });
      }
    }

    /* ---- DEN SKAL IKKE GÅ I GANG FØR DEN KAN KØRE IGENNEM ----

       Filmen hakkede, og værst i starten. Grunden var her: play()
       blev kaldt i samme åndedrag som load(), altså mens filen
       stadig blev hentet. På en telefon nede ved havnen med to
       streger betyder det at browseren spiller de første par
       billeder, løber tør, står stille, spiller videre – og det er
       præcis den hakken man ser.

       Der ventes derfor på at browseren selv siger at den kan spille.
       Posterbilledet står imens, så rammen aldrig er tom.

       MEN DER VENTES PÅ readyState 3 OG IKKE 4.

       4 er HAVE_ENOUGH_DATA, altså "jeg kan køre den igennem uden at
       standse". Det er det rigtige svar at ønske sig, og det er også
       et svar Safari på iOS ofte aldrig giver for en video der kører i
       ring. Loftet var derfor 6 sekunder — og seks sekunder er en
       evighed: man ruller til afsnittet, ser et stillbillede, og er
       videre længe før filmen begynder. Var play() så også afvist,
       stod der en afspil-knap i et afsnit man havde forlangt en
       animation i.

       3 er HAVE_FUTURE_DATA: nok til at begynde. Filmen er 800 kB og
       kører i ring, så resten når at komme mens de første sekunder
       spiller. Loftet er skåret til 1,8 sekunder, som er den tid
       afsnittet er på vej ind i skærmen. */
    var venteUr = 0;
    function proevAtSpille() {
      laegPosterPaa();
      laegKilderPaa();

      if (v.readyState >= 3) { spilNu(); return; }
      if (venteUr) return;              // der ventes allerede

      function naarKlar() {
        clearTimeout(venteUr);
        venteUr = 0;
        v.removeEventListener('canplay', naarKlar);
        v.removeEventListener('loadeddata', naarKlar);
        spilNu();
      }
      v.addEventListener('canplay', naarKlar);
      v.addEventListener('loadeddata', naarKlar);
      venteUr = setTimeout(naarKlar, 1800);
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
        iSyne = e.isIntersecting;
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
  /* 5,6: målt på filmens billeder — dér begynder havnen at tone
     frem bag isen, og rammen skal stå frem sammen med den. */
  rulleFilm('isfilm', 'isfilm-knap', [
    ['billeder/' + filmNavn + '.mp4', 'video/mp4'],
    ['billeder/' + filmNavn + '.webm', 'video/webm'],
  ], 5.6);

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

    visFrister(d, boks);
  }

  /* ----------------------------------------------------------
     FRISTERNE: HVAD KAN MAN STADIG NÅ I DAG?
     ----------------------------------------------------------
     Spiis skriver "Bestil til i dag: frem til kl. 18.40" under
     tiderne, og det er den ene linje, en gæst med aftensmadplaner
     faktisk leder efter. Tallene her er AFLEDT, aldrig skrevet i
     hånden: bordets frist er sidste bordtid (en halv time før luk,
     også en TIDLIG lukning fra kalenderen) minus varslet — præcis
     samme regnestykke som formularen på bord/ bruger til at vise
     tider. Skriver vi kl. 18.30 her, kan kl. 18.30 også vælges
     derinde. Smørrebrødets varsel er typisk et døgn, så dét står
     som en regel, ikke et klokkeslæt.
     ---------------------------------------------------------- */
  function visFrister(d, boks) {
    var nu = Butik.nu();
    var frister = lav('div', 'frister');

    /* Som NABO til #hours, ikke inde i den: tider-tabellen tælles
       af en test (tre rækker), og fristerne er en hjælp, ikke en
       række til. Fjern en gammel først, så en gentegning ikke
       stabler dem. */
    var gammel = boks.parentNode.querySelector('.frister');
    if (gammel) gammel.parentNode.removeChild(gammel);

    // Smørrebrødet: varslet bestemmer, om "i dag" overhovedet findes
    var smVarsel = Number((d.indstillinger || {}).bestilling_varsel_timer);
    if (!isFinite(smVarsel) || smVarsel < 0) smVarsel = 24;

    var p = (d.aabningstider || []).filter(function (a) { return a.ugedag === nu.ugedag; })[0];
    var aabenIDag = p && !p.lukket && !Butik.lukketDen(d, nu.dato);

    if (aabenIDag) {
      var luk = Butik.tilMinutter(p.lukker);
      var tidligt = Butik.tilMinutter(Butik.tidligLukning(d, nu.dato));
      if (tidligt !== null && tidligt < luk) luk = tidligt;

      var bordVarsel = Number((d.indstillinger || {}).bord_varsel_timer);
      if (!isFinite(bordVarsel) || bordVarsel < 0) bordVarsel = 2;

      var bordFrist = luk - 30 - bordVarsel * 60;
      if (nu.minutter < bordFrist) {
        var r1 = lav('div');
        r1.appendChild(lav('span', null, 'Bord i dag?'));
        var h1 = lav('span');
        var lnk = lav('a', null, 'Spørg her');
        lnk.href = 'bord/';
        h1.appendChild(lnk);
        h1.appendChild(document.createTextNode(' senest kl. ' + pænMinut(bordFrist)));
        r1.appendChild(h1);
        frister.appendChild(r1);
      }

      var smFrist = luk - 30 - smVarsel * 60;
      if (nu.minutter < smFrist) {
        var r2 = lav('div');
        r2.appendChild(lav('span', null, 'Smørrebrød til i dag?'));
        r2.appendChild(lav('span', null, 'Bestil senest kl. ' + pænMinut(smFrist)));
        frister.appendChild(r2);
      }
    }

    if (smVarsel >= 3) {
      var r3 = lav('div');
      r3.appendChild(lav('span', null, 'Smørrebrød ud af huset'));
      r3.appendChild(lav('span', null, 'Bestilles mindst ' + Math.round(smVarsel) + ' timer før'));
      frister.appendChild(r3);
    }

    if (frister.firstChild) boks.parentNode.insertBefore(frister, boks.nextSibling);
  }

  function pænMinut(m) {
    return ('0' + Math.floor(m / 60)).slice(-2) + '.' + ('0' + (m % 60)).slice(-2);
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
  /* ---- BESTIL MAD-AFSNITTET ER BLEVET TIL DAGENS RET ----

     Her stod fire funktioner: visBestil, visDagensRet,
     visSlagsKort og visVarsel. De byggede et kort med dagens ret
     og et net af "slags"-kort, der alle LINKEDE videre til
     bestil/.

     Kunden så det op mod designbundtet og sagde det rent ud:
     siden skal se ud som filerne. I bundtet ligger hele
     bestillingsformularen på forsiden — gæsten lander, ser hvad
     der er i dag, og trykker send uden at skifte side. Et link
     til en anden side er et sted, halvdelen falder fra.

     Afsnittet bygges nu af js/dagens.js, som også sender
     bestillingen. Slags-kortene er blevet til de fem rækker med
     "+ tilføj" inde i panelet, og de fører stadig til bestil/ og
     menu.html — smørrebrødet har fyld, varsler og mindsteantal,
     og den formular skal der ikke findes to af.

     Varslet står ikke længere på forsiden. Panelet her bestiller
     dagens ret TIL I DAG, og et varsel på 24 timer hører til
     smørrebrødet, hvor det stadig står. */

  /* ---- Kuglerne på tavlen ----
     De hører til ved isen, ikke i deres eget afsnit: et helt
     afsnit for en række piller er et afsnit for meget. */
  function visKugler(d) {
    var blok = $('kugler-blok');
    if (!blok) return;

    var kugler = (d.indstillinger || {}).dagens_kugler;
    if (!Array.isArray(kugler) || !kugler.length) {
      blok.classList.add('skjult');
      return;
    }

    $('kugler-dag').textContent = kugler.length + ' slags på tavlen i dag';

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

    blok.classList.remove('skjult');
  }

  function kategoriNavn(d, id) {
    var k = (d.menu_kategorier || []).filter(function (x) { return x.id === id; })[0];
    return k ? k.navn : '';
  }

  /* KATEGORI-OVERSIGTEN LÅ HER.

     Tre kort med afdelingernes navne og tal, midt på forsiden.
     Den er væk med afsnittet: forsiden har fire koncepter nu, og
     en indholdsfortegnelse over menukortet er ikke et af dem.
     Der er et link til menukortet under Bestil mad, og
     js/menuside.js tegner det rigtige kort på menu.html. */


  // ---- Dagens kugler ----
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

  /* ============================================================
     BANNERNE
     ------------------------------------------------------------
     Dagens besked stod før som en flad stribe midt i siden
     (#dagens-besked). Designbundtet gør den til et banner lige
     under heroen, sammen med det næste arrangement — altså dér
     hvor gæsten er, og med noget hun kan trykke på.

     TRE TING DER IKKE ER PYNT:

     1) LUKNINGEN HUSKES. En besked, man ikke kan komme af med,
        holder op med at være en besked og bliver til en ting, der
        er i vejen. Nøglen indeholder selve teksten, så en NY
        besked dukker op igen — havde vi gemt "besked lukket",
        ville personalet aldrig kunne råbe gæsten op igen.

     2) HØJDEN MÅLES FØR LUKNINGEN. max-height kan animeres,
        height: auto kan ikke. Derfor sættes den målte højde som
        udgangspunkt lige før klassen .ud lægges på — ellers
        springer banneret fra 320px (CSS-loftet) og ikke fra sin
        egen højde, og de første 200 pixel af animationen sker
        uden at man ser noget.

     3) FACEBOOK-BANNERET ER BETINGET. Designbundtet har det med
        et fast link. Vi har ingen Facebook-adresse — feltet i
        js/oplysninger.js står tomt — og et "Følg os" der fører
        til # er en blindgyde. Kommer adressen, dukker banneret op
        af sig selv.
     ============================================================ */
  var BANNER_NØGLE = 'mosede_bannere_lukket';

  function lukkede() {
    try {
      var r = localStorage.getItem(BANNER_NØGLE);
      return r ? JSON.parse(r) : [];
    } catch (e) { return []; }
  }

  function husLukket(id) {
    try {
      var l = lukkede();
      if (l.indexOf(id) === -1) l.push(id);
      /* Kun de tyve nyeste. Uden loftet vokser listen med hver
         besked personalet nogensinde har skrevet, og den ligger i
         gæstens browser for evigt. */
      localStorage.setItem(BANNER_NØGLE, JSON.stringify(l.slice(-20)));
    } catch (e) { /* privat browsing – så huskes det ikke, og det er ok */ }
  }

  function byg(b) {
    var el = lav('div', 'bn ' + b.slags);

    var ikon = lav('span', 'bn-ikon');
    ikon.setAttribute('aria-hidden', 'true');
    ikon.innerHTML = b.ikon;
    el.appendChild(ikon);

    var ind = lav('div', 'bn-ind');
    ind.appendChild(lav('h3', null, b.titel));
    if (b.tekst) ind.appendChild(lav('p', null, b.tekst));
    if (b.knap && b.href) {
      var a = lav('a', 'bn-cta', b.knap);
      a.href = b.href;
      ind.appendChild(a);
    }
    el.appendChild(ind);

    var luk = lav('button', 'bn-luk', '✕');
    luk.type = 'button';
    luk.setAttribute('aria-label', 'Luk beskeden');
    luk.addEventListener('click', function () {
      husLukket(b.id);
      // Se note 2: højden måles, så animationen starter et rigtigt sted.
      el.style.maxHeight = el.offsetHeight + 'px';
      requestAnimationFrame(function () { el.classList.add('ud'); });
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 620);
    });
    el.appendChild(luk);

    return el;
  }

  var EQ = '<span class="eq"><i></i><i></i><i></i><i></i></span>';
  var TALE = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"'
    + ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M20 12a7 7 0 01-7 7H8l-4 3v-4.6A7 7 0 018 5h5a7 7 0 017 7z"/></svg>';

  function visBannere(d) {
    var boks = $('bannere');
    if (!boks) return;

    var skjul = lukkede();
    var liste = [];

    /* Det næste offentlige arrangement. Kalenderen er én tabel med
       tre typer, så filteret på type er ikke pynt: en lukkedag er
       også en kalenderrække, og den skal ikke stå som en
       begivenhed man kan glæde sig til. */
    var iDag = Butik.nu().dato;
    var næste = (d.kalender || [])
      .filter(function (k) {
        return k.type === 'arrangement'
          && k.offentlig !== false
          && (k.slut_dato || k.dato) >= iDag;
      })
      .sort(function (a, b) { return a.dato < b.dato ? -1 : 1; })[0];

    if (næste) {
      liste.push({
        id: 'arr:' + næste.dato + ':' + næste.titel,
        slags: 'musik',
        ikon: EQ,
        titel: (næste.emoji ? næste.emoji + ' ' : '') + næste.titel
             + ' · ' + pænDato(næste.dato),
        tekst: næste.beskrivelse || '',
        /* "Få en plads →" og ikke "Se arrangementet". Filerne har
           den knap, og den er bedre: gæsten skal ikke læse om
           arrangementet, hun skal sikre sig en plads. Den fører
           til bordsiden, ikke til kalenderen — kalenderen er et
           opslagsværk, bordet er en handling. */
        knap: 'Få en plads →',
        href: 'bord/',
      });
    }

    var b = (d.indstillinger || {}).dagens_besked;
    if (b && b.vis && b.tekst) {
      liste.push({
        id: 'besked:' + b.tekst,
        slags: 'besked',
        ikon: TALE,
        titel: 'Fra lugen',
        tekst: b.tekst,
      });
    }

    /* FACEBOOK-BANNERET STÅR DER, SOM I FILERNE.

       Det var betinget af, at adressen var udfyldt — og da feltet
       står tomt, betød det i praksis, at banneret aldrig kom.
       Kunden har set filerne og bedt om, at siden ser ud som dem:
       banneret er en af de to ting, gæsten møder under heroen.

       LINKET ER STADIG IKKE OPFUNDET. Er adressen skrevet ind i
       js/oplysninger.js, bruges den. Er den ikke, peger knappen på
       en SØGNING efter forretningen på Facebook — et link der
       virker, og som finder siden hvis den findes. Det er ikke det
       samme som at påstå en adresse, vi ikke har.

       Ejeren skal bekræfte adressen; den står øverst på listen i
       README under "Ejeren skal bekræfte". */
    var m = window.MOSEDE || {};
    var fb = (m.social || {}).facebook
      || ('https://www.facebook.com/search/top?q='
          + encodeURIComponent(m.navn || 'Mosede Havnegrill og Ishus'));
    if (fb) {
      liste.push({
        id: 'facebook',
        slags: 'fb',
        ikon: '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">'
          + '<path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6c-.3 0-1.35-.1-2.55-.1'
          + '-2.5 0-4.15 1.5-4.15 4.3v2.1H7.3V13h2.7v8z"/></svg>',
        titel: 'Følg havnegrillen på Facebook',
        tekst: 'Dagens ret, musik og små beskeder fra lugen — vi lægger det op hver morgen.',
        knap: 'Følg os →',
        href: fb,
      });
    }

    liste.filter(function (x) { return skjul.indexOf(x.id) === -1; })
      .forEach(function (x) { boks.appendChild(byg(x)); });
  }

  /* ============================================================
     NYHEDERNE
     ------------------------------------------------------------
     Tabellen og fanen i admin har været her hele tiden. Gæsten
     kunne bare ikke se dem NOGEN steder — personalet skrev ind i
     en skuffe, ingen åbnede.

     Tre på forsiden, resten på nyheder/. Tre er ikke et
     tilfældigt tal: det er en række på en computer og tre skærme
     at rulle forbi på en telefon, og en forside der bliver ved
     med at være nyheder, holder op med at være en forside.

     Er der ingen, findes afsnittet ikke. En overskrift med
     "Sidste nyt" over ingenting fortæller gæsten, at der aldrig
     sker noget her.
     ============================================================ */
  function nyhedsListe(d) {
    return (d.nyheder || [])
      .filter(function (n) { return n.aktiv !== false && n.titel; })
      .sort(function (a, b) { return (b.dato || '') < (a.dato || '') ? -1 : 1; });
  }

  function nyhedsKort(n) {
    var kort = lav('article', 'nw');
    if (n.dato) kort.appendChild(lav('div', 'nw-naar', pænDato(n.dato)));
    kort.appendChild(lav('h3', null, n.titel));
    if (n.tekst) kort.appendChild(lav('p', null, n.tekst));
    return kort;
  }

  function visNyheder(d) {
    var net = $('nyhedsnet');
    if (!net) return;
    var alle = nyhedsListe(d);
    if (!alle.length) return;

    alle.slice(0, 3).forEach(function (n) { net.appendChild(nyhedsKort(n)); });
    $('nyheder').classList.remove('skjult');
  }

  /* ============================================================
     AFDELINGSKORTENE
     ------------------------------------------------------------
     Mad, is og drikkevarer med to tal hver. Tallene TÆLLES på det
     rigtige menukort — der står ikke et rundt tal, nogen har
     skrevet i hånden, og skriver personalet en vare ind, går
     tallet op af sig selv.

     Kategorier UDEN varer tælles ikke med. En tom kategori er
     ikke en afdeling af menukortet; det er en overskrift nogen
     har oprettet og ikke fyldt endnu, og den skal ikke gøre
     kortet større end det er.

     'grill' er en gammel afdelingsværdi fra før kortet blev delt
     i tre. Den hører under mad, ellers bliver de kategorier
     usynlige efter en halv opgradering af databasen — samme regel
     som i js/menuside.js.
     ============================================================ */
  /* Emojierne er midlertidige madbilleder: der findes ingen fotos
     endnu, og tre kort med ren tekst ligner en indholdsfortegnelse.
     De står i deres EGET span, ikke inde i h3 — prøverne læser
     h3'ens tekst, og "🍔 Mad" er ikke "Mad". */
  var AFDELINGER = [
    { id: 'mad', navn: 'Mad', emoji: '🍔' },
    { id: 'is', navn: 'Is og desserter', emoji: '🍦' },
    { id: 'drikke', navn: 'Drikkevarer', emoji: '🥤' },
  ];

  function visAfdelinger(d) {
    var net = $('afd-net');
    if (!net) return;

    var nogen = false;

    AFDELINGER.forEach(function (a) {
      var grupper = Butik.menu(d).filter(function (g) {
        var afd = g.kategori.afdeling === 'grill' ? 'mad' : g.kategori.afdeling;
        return afd === a.id;
      });
      if (!grupper.length) return;
      nogen = true;

      var antalVarer = grupper.reduce(function (n, g) { return n + g.varer.length; }, 0);

      var kort = lav('a', 'afd-kort');
      kort.href = 'menu.html?afd=' + a.id;

      var pil = lav('span', 'afd-pil', '→');
      pil.setAttribute('aria-hidden', 'true');
      kort.appendChild(pil);

      var emoji = lav('span', 'afd-emoji', a.emoji);
      emoji.setAttribute('aria-hidden', 'true');
      kort.appendChild(emoji);

      kort.appendChild(lav('h3', null, a.navn));
      kort.appendChild(lav('p', 'afd-tal',
        grupper.length + (grupper.length === 1 ? ' kategori' : ' kategorier')
        + ' · ' + antalVarer + (antalVarer === 1 ? ' vare' : ' varer')));

      /* Højst fem navne. Mad har syv kategorier og drikkevarer
         fem, og syv navne på et kort ved siden af et med tre gav
         tre kort i vidt forskellig højde — det var derfor
         kategoripillerne blev fjernet fra forsiden i sin tid. */
      kort.appendChild(lav('p', 'afd-liste',
        grupper.slice(0, 5).map(function (g) { return g.kategori.navn; }).join(' · ')
        + (grupper.length > 5 ? ' …' : '')));

      net.appendChild(kort);
    });

    if (nogen) $('menu').classList.remove('skjult');
  }


  Butik.hent().then(function (d) {
    if (d._offline) $('offline-advarsel').classList.remove('skjult');

    visLokation(d);
    visBannere(d);
    visStatus(d);
    visTider(d);
    visLukkedage(d);
    visNyheder(d);
    visAfdelinger(d);
    visKugler(d);

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

  /* ============================================================
     HERO-PARALLAKSEN
     ------------------------------------------------------------
     Baggrunden glider langsommere end siden. Det er den ene
     bevægelse på forsiden, der ikke er en overgang — den følger
     fingeren, og det er derfor den skal være billig.

     FIRE TING, OG DE ER ALLE SAMMEN MÅLTE ERFARINGER:

     1) KUN transform. top, margin eller background-position gør
        det samme visuelt og tvinger browseren til at regne hele
        sidens layout om ved hvert billede. Det er forskellen på
        120 billeder i sekundet og 30.

     2) rAF-STRUBET. En scroll-handler kan fyre snesevis af gange
        pr. billede. Uden strubningen regner vi den samme
        transform ud fyrre gange og sætter den fyrre gange, og
        browseren tegner stadig kun én gang.

     3) LOFT PÅ 640 PX. Længere nede er heroen ude af syne, og en
        transform der bliver ved med at vokse, holder laget i live
        og flytter noget ingen kan se. .hero .bg har 20% ekstra i
        toppen at trække ned fra — det er cirka 140 px på en
        almindelig telefon, og 640 × 0,16 er 102. Der er altså
        margin, og fotoets øverste kant kan ikke komme ind på
        skærmen.

     4) IKKE VED REDUCERET BEVÆGELSE. Har gæsten bedt om ro, får
        hun ro. CSS'en nulstiller transform med !important, men
        lytteren skal alligevel ikke sidde og regne.
     ============================================================ */
  (function () {
    if (roligt) return;

    var bg = document.querySelector('.hero .bg');
    if (!bg) return;

    var venter = 0;

    function flyt() {
      venter = 0;
      var y = Math.min(window.scrollY || window.pageYOffset || 0, 640);
      bg.style.transform = 'translate3d(0,' + (y * 0.16).toFixed(1) + 'px,0)';
    }

    window.addEventListener('scroll', function () {
      if (venter) return;
      venter = requestAnimationFrame(flyt);
    }, { passive: true });

    flyt();
  })();

  /* ============================================================
     PILLEN VENTER, TIL HEROENS KNAPPER ER RULLET FORBI
     ------------------------------------------------------------
     Den flydende bestil-pille og heroens egen røde knap er den
     samme handling. På kundens telefon stod de lige oven i
     hinanden — to røde knapper med samme tekst på samme skærm —
     og det lignede en fejl. Så pillen holder sig væk, mens
     heroens knaprække kan ses, og dukker op i samme øjeblik den
     er ude af billedet.

     KUN på forsiden: undersiderne har ingen .hero-cta, og dér
     rører lytteren ingenting — pillen står fast fra første pixel.

     Uden IntersectionObserver sættes klassen aldrig, og pillen er
     der hele tiden. En ekstra knap er støj; en manglende er en
     lukket dør — fejl den vej, der stadig kan bestilles fra.
     ============================================================ */
  (function () {
    var pille = document.querySelector('.bestil-fast');
    var knapper = document.querySelector('.hero-cta');
    if (!pille || !knapper || !('IntersectionObserver' in window)) return;

    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        pille.classList.toggle('dukket', e.isIntersecting);
      });
    }).observe(knapper);
  })();
})();
