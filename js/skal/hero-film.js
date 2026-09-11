/* ============================================================
   HEROENS FILM ER ÅBNINGEN  (11/9)
   ------------------------------------------------------------
   Kundens ord: filmen skal bruges *"i stedet for animationen before
   landing, fade ind premium ligesom Apples hjemmeside og blive til
   den statiske end frame, hvor teksten så kommer"*. Bølge-introen er
   fjernet.

   Forløbet: heroen er mørk → filmen blændes ind, når den SPILLER →
   maden kommer frem på bordet → i det sidste sekund kommer kransen,
   overskriften og knapperne → filmen bliver til slutbilledet.

   ⚠️ INTET LAG OVER SIDEN. Filmen ligger i heroen, og gæsten kan
   rulle og trykke fra første sekund. Et tryk, et rul eller en tast
   betyder "jeg vil videre": teksten og slutbilledet kommer med det
   samme. Den gamle intro dækkede siden; det her gør ikke.

   ⚠️ TEKSTEN MÅ ALDRIG BLIVE HÆNGENDE SKJULT. Klassen `film-aabner`
   sættes af et lille script i head (så teksten ikke blinker frem
   først). Herfra fjernes den: når filmen er ved at være slut, ved et
   spring, ved en fejl, ved en afvist play() (iPhone på
   strømbesparelse) — og af et værn efter 7 s. Og fejler DETTE script,
   viser stilarket det hele efter 8 s af sig selv.

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

  var v = film.getAttribute('data-v');
  var stempel = v && v.indexOf('__') !== 0 ? '?v=' + v : '';
  var hoej = window.matchMedia
    && window.matchMedia(film.getAttribute('data-hoej-naar') || '(orientation: portrait)').matches;
  var base = film.getAttribute(hoej ? 'data-hoej' : 'data-bred');
  film.setAttribute('data-format', hoej ? '9x16' : '16x9');

  /* Teksten kommer det sidste stykke af filmen — ikke først bagefter.
     Et helt sekunds stilhed efter filmen læses som ventetid. */
  var AFSLOER_FOER = 1.1;

  function visSlut() {
    if (film.classList.contains('slut')) return;
    film.classList.add('slut');
    if (!still) return;
    still.addEventListener('load', function () { still.classList.add('vis'); }, { once: true });
    still.src = base + '-slut.jpg' + stempel;
    if (still.complete && still.naturalWidth > 0) still.classList.add('vis');
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

  /* Gæsten vil videre: teksten og slutbilledet med det samme. */
  function spring() {
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
  video.addEventListener('playing', function () { film.classList.add('spiller'); }, { once: true });
  video.addEventListener('timeupdate', function () {
    if (video.duration && video.currentTime >= video.duration - AFSLOER_FOER) afsloer();
  });
  video.addEventListener('ended', function () { afsloer(); visSlut(); fjernLyttere(); });
  video.addEventListener('error', spring);
  video.src = base + '.mp4' + stempel;

  var p = video.play();
  if (p && typeof p.catch === 'function') p.catch(spring);

  /* ⚠️ PASSIVE LYTTERE. En ikke-passiv wheel/touchmove tvinger
     browseren til at vente på JavaScript, før den må rulle
     (gennemgangens prøve, 31/8). */
  LYTTERE.forEach(function (t) { window.addEventListener(t, spring, { capture: true, passive: true }); });
  document.addEventListener('scroll', rullet, { capture: true, passive: true });

  /* Værnet: går filmen i stå, kommer teksten alligevel. */
  setTimeout(afsloer, 7000);
}());
