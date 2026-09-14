/* ============================================================
   HEROENS FILM ER ÅBNINGEN  (11/9)
   ------------------------------------------------------------
   Kundens ord: filmen skal bruges *"i stedet for animationen before
   landing, fade ind premium ligesom Apples hjemmeside og blive til
   den statiske end frame, hvor teksten så kommer"*. Bølge-introen er
   fjernet.

   Forløbet: heroen er mørk → filmen blændes ind, når den SPILLER →
   maden kommer frem på bordet → når filmen har spillet færdig, kommer
   kransen, overskriften og knapperne, og filmen bliver til
   slutbilledet i samme øjeblik.

   ⚠️ INTET LAG OVER SIDEN. Filmen ligger i heroen, og gæsten kan
   rulle og trykke fra første sekund. Et tryk, et rul eller en tast
   betyder "jeg vil videre": teksten og slutbilledet kommer med det
   samme. Den gamle intro dækkede siden; det her gør ikke.

   ⚠️ TEKSTEN MÅ ALDRIG BLIVE HÆNGENDE SKJULT. Klassen `film-aabner`
   sættes af et lille script i head (så teksten ikke blinker frem
   først). Herfra fjernes den: når filmen er færdig, ved et spring,
   ved en fejl, ved en afvist play() (iPhone på strømbesparelse) — og
   af et værn, hvis filmen går i stå. Og fejler DETTE script, viser
   stilarket det hele efter 8 s af sig selv.

   ⚠️ FORMATET AFGØRES ÉT STED — `data-hoej-naar` på rammen. Film,
   startbillede og slutbillede vælges af den samme regel.
   ============================================================ */
(function () {
  'use strict';

  var html = document.documentElement;
  var film = document.querySelector('.hero-film');
  if (!film) { html.classList.remove('film-aabner'); return; }
  var video = film.querySelector('video');
  var still = film.querySelector('.hero-slut');
  var knap = document.querySelector('.hero-spring');

  var v = film.getAttribute('data-v');
  var stempel = v && v.indexOf('__') !== 0 ? '?v=' + v : '';
  var hoej = window.matchMedia
    && window.matchMedia(film.getAttribute('data-hoej-naar') || '(orientation: portrait)').matches;
  var base = film.getAttribute(hoej ? 'data-hoej' : 'data-bred');
  film.setAttribute('data-format', hoej ? '9x16' : '16x9');

  /* Slutbilledet hentes, MENS filmen spiller (11/9), så overgangen kan
     begynde i samme øjeblik som teksten — i stedet for først at blive
     hentet, når filmen er slut, og så komme et halvt sekund bagefter. */
  function hentSlut() {
    if (!still || still.getAttribute('src')) return;
    still.src = base + '-slut.jpg' + stempel;
  }
  function visSlut() {
    if (film.classList.contains('slut')) return;
    film.classList.add('slut');
    if (!still) return;
    hentSlut();
    if (still.complete && still.naturalWidth > 0) still.classList.add('vis');
    else still.addEventListener('load', function () { still.classList.add('vis'); }, { once: true });
  }

  var afsloeret = false;
  function afsloer() {
    if (afsloeret) return;
    afsloeret = true;
    film.classList.add('spiller');
    html.classList.remove('film-aabner');
  }

  var LYTTERE = ['pointerdown', 'keydown', 'wheel', 'touchmove'];
  function fjernLyttere() {
    LYTTERE.forEach(function (t) { window.removeEventListener(t, spring, true); });
    document.removeEventListener('scroll', rullet, true);
  }

  /* ⚠️ ET TRYK, DER SPRINGER OVER, TRYKKER IKKE OGSÅ PÅ NOGET (11/9).
     Under åbningen står heroens knapper usynlige på deres pladser, og
     "tryk for at springe over" slipper, i samme øjeblik den springer.
     Uden vagten fulgte det SAMME tryk linket under fingeren — målt: et
     tryk på knappen landede på "Selskab & catering", og et tryk midt i
     filmen kunne sende gæsten ned til bestillingen. Det ene klik, der
     hører til trykket, sluges; kom der intet (trykket blev til et rul),
     slippes vagten igen. Kun mens teksten er skjult — bagefter er et
     tryk et tryk. */
  function slugKlik() {
    function fri() { window.removeEventListener('click', sluge, true); }
    function sluge(e) { e.preventDefault(); e.stopImmediatePropagation(); fri(); }
    window.addEventListener('click', sluge, true);
    setTimeout(fri, 700);
  }

  /* Gæsten vil videre: teksten og slutbilledet med det samme. */
  function spring(e) {
    /* ⚠️ KUN ET TRYK PÅ HEROEN SLUGES (12/9). Det er dér, de usynlige
       knapper står under filmen. Første udgave slugte det første
       tryk HVOR SOM HELST, og den fulde runde fandt det: et tryk på
       "+ tilføj" nede i bestillingen blev spist, fordi Playwright
       ruller og trykker i samme øjeblik, som rul-lytteren først
       når at springe filmen over bagefter. En finger kan gøre det
       samme med et hurtigt stryg og tryk. */
    if (e && e.type === 'pointerdown' && !afsloeret &&
        e.target && e.target.closest && e.target.closest('.hero')) slugKlik();
    afsloer();
    visSlut();
    if (video && !video.paused) video.pause();
    fjernLyttere();
  }
  function rullet() {
    var sc = document.getElementById('sc');
    var y = Math.max(window.scrollY || 0, sc ? sc.scrollTop : 0);
    if (y > 40) spring();
  }
  window.MosedeFilm = { spring: spring };
  /* Knappen "tryk for at springe over" gør det samme som et tryk hvor
     som helst — den er her for tastaturet og skærmlæseren. */
  if (knap) knap.addEventListener('click', spring);

  var ro = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Uden klassen er der ingen åbning: et direkte link (#menu) eller
     reduceret bevægelse. Slutbilledet står, og teksten er fremme. */
  if (ro || !html.classList.contains('film-aabner') || !video || typeof video.play !== 'function') {
    spring();
    return;
  }

  /* iOS kræver egenskaben, ikke kun attributten, før en film uden
     lyd må spille af sig selv. */
  video.muted = true;
  video.setAttribute('playsinline', '');
  video.poster = base + '-start.jpg' + stempel;
  /* ⚠️ VÆRNET TÆLLES FRA DET ØJEBLIK, FILMEN SPILLER — IKKE FRA
     SIDENS INDLÆSNING (11/9). Kundens ord på sin egen telefon: "it
     too quick onto the website, it doesn't let the video complete".
     På et mobilnet begynder filmen først efter nogle sekunder, og et
     fast værn på 7 s fra indlæsningen skar dens slutning af. Før
     filmen spiller, gælder de 7 s (går den aldrig i gang, kommer
     teksten alligevel); når den spiller, flyttes værnet til filmens
     egen resttid plus luft, så det kun slår til, hvis den går i stå. */
  var vaern = null;
  /* ⚠️ FØR FILMEN VISES, ER VÆRNET ET SPRING (14/9): teksten OG
     slutbilledet. En film, der begynder, efter teksten er kommet,
     ville spille bag den — og et startbillede med tekst oven på er et
     halvt stillbillede. Når filmen først vises, er værnet teksten som
     før. */
  function vaernOm(ms) {
    clearTimeout(vaern);
    vaern = setTimeout(function () { if (vist) afsloer(); else spring(); }, ms);
  }
  /* `afspiller` er kun den RIGTIGE afspilning — `spiller` sættes også
     ved et spring, og startbilledet må ikke gå væk, før der er en film
     under det (havnegrillen.css). Resttiden sættes på knappen FØR
     klassen, så linjen begynder med den rigtige længde. */
  /* ⚠️ GLAT ELLER SLET IKKE  (14/9). Kundens ord: "animationen starter
     sådan i pause … den skal ikke hakke". MÅLT på den udgivne
     historieside på et langsomt mobilnet (1,6 Mbit/s): filmen begyndte
     på en lille buffer og gik så i stå FEM gange (0,21 · 0,55 · 0,81 ·
     2,59 · 6,10 s), op til 534 ms hver. På wifi og 4G spillede den glat.
     Filerne er også gjort halvt så tunge (samme dag), men alene hjalp
     det ikke: resten af siden henter samtidig, og den lette fil gik
     stadig i stå fire gange.

     Tre regler, og de hører sammen:
     · play() kaldes stadig med det samme — iOS henter først filmen, når
       den bliver bedt om at spille
     · men den VISES først, når den kan spille til ende (canplaythrough,
       eller filen er hentet helt). Indtil da står startbilledet, som ER
       filmens første billede: et stille billede, ikke et hak
     · og går den alligevel i stå i mere end STOP_MS, går den til
       slutbilledet med teksten i stedet for at stå frosset midt i */
  var STOP_MS = 400;
  var kanTilEnde = false;
  var vist = false;
  function hentetHelt() {
    try {
      var b = video.buffered;
      return b.length > 0 && isFinite(video.duration)
        && b.end(b.length - 1) >= video.duration - 0.25;
    } catch (e) { return false; }
  }
  function klarNu() {
    if (!kanTilEnde && hentetHelt()) kanTilEnde = true;
    if (kanTilEnde && !vist && !afsloeret && video.paused) {
      try { video.currentTime = 0; } catch (e) { /* intet at spole */ }
      var igen = video.play();
      if (igen && typeof igen.catch === 'function') igen.catch(spring);
    }
  }
  video.addEventListener('canplaythrough', function () { kanTilEnde = true; klarNu(); });
  video.addEventListener('progress', klarNu);
  video.addEventListener('playing', function () {
    if (vist) return;
    if (!kanTilEnde && !hentetHelt()) {
      /* Den spiller, men kan ikke nå til ende: stands den på første
         billede, bag startbilledet, og vent på resten (klarNu). */
      video.pause();
      return;
    }
    kanTilEnde = true;
    vist = true;
    var rest = isFinite(video.duration) ? video.duration - video.currentTime : 5;
    if (knap) knap.style.setProperty('--film-rest', rest.toFixed(2) + 's');
    film.classList.add('spiller', 'afspiller');
    hentSlut();
    vaernOm((rest + 3) * 1000);
  });
  var stopUr = null;
  video.addEventListener('waiting', function () {
    if (!vist || afsloeret) return;
    clearTimeout(stopUr);
    stopUr = setTimeout(function () { if (!afsloeret) spring(); }, STOP_MS);
  });
  video.addEventListener('playing', function () { clearTimeout(stopUr); });
  /* ⚠️ TEKSTEN KOMMER, NÅR FILMEN ER FÆRDIG — og overgangen til
     slutbilledet med den (11/9). Før begyndte begge 1,1 s før slut, og
     slutbilledet blev blændet ind hen over filmens sidste sekund: den
     fik aldrig lov at spille færdig. Kundens ord om overgangen står
     stadig — tekst og slutbillede kommer i SAMME øjeblik — det øjeblik
     er bare filmens sidste billede nu. */
  video.addEventListener('ended', function () { afsloer(); visSlut(); fjernLyttere(); });
  video.addEventListener('error', spring);
  /* ⚠️ HEVC, HVOR BROWSEREN KAN  (14/9). Kundens ord: "jeg oploadede den
     i 4k, men kvaliteten er ikke 4k-agtig". MÅLT mod 4K-filen ved
     skærmens egen opløsning (SSIM): H.264 1080p 0,986 — HEVC 1440p
     0,989 på 12 % færre bytes (telefonen). iPhone, Mac og de fleste
     Android afspiller HEVC i hardware; resten (fx Firefox) får H.264.

     ⚠️ KUN SIDER, DER HAR EN HEVC-FIL, BEDER OM DEN (data-hevc).
     Historiens film er 720p fra kilden, og en fil, der ikke findes, er
     en 404 — og så ingen film, bare slutbilledet. */
  function kanHevc() {
    try {
      return /probably|maybe/.test(video.canPlayType('video/mp4; codecs="hvc1.1.6.L150.B0"'))
        || /probably|maybe/.test(video.canPlayType('video/mp4; codecs="hvc1"'));
    } catch (e) { return false; }
  }
  var hevc = film.hasAttribute('data-hevc') && typeof video.canPlayType === 'function' && kanHevc();
  film.setAttribute('data-codec', hevc ? 'hevc' : 'h264');
  video.src = base + (hevc ? '-hevc' : '') + '.mp4' + stempel;

  var p = video.play();
  if (p && typeof p.catch === 'function') p.catch(spring);

  /* ⚠️ PASSIVE LYTTERE. En ikke-passiv wheel/touchmove tvinger
     browseren til at vente på JavaScript, før den må rulle
     (gennemgangens prøve, 31/8). */
  LYTTERE.forEach(function (t) { window.addEventListener(t, spring, { capture: true, passive: true }); });
  document.addEventListener('scroll', rullet, { capture: true, passive: true });

  /* Værnet: går filmen i stå, kommer teksten alligevel. Og herfra er
     det SCRIPTETS værn, der gælder — stilarkets faste 8 s er kun til,
     hvis det her script aldrig nåede så langt (`film-styret`). */
  vaernOm(7000);
  html.classList.add('film-styret');
}());
