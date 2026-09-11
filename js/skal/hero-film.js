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
  /* ⚠️ VÆRNET TÆLLES FRA DET ØJEBLIK, FILMEN SPILLER — IKKE FRA
     SIDENS INDLÆSNING (11/9). Kundens ord på sin egen telefon: "it
     too quick onto the website, it doesn't let the video complete".
     På et mobilnet begynder filmen først efter nogle sekunder, og et
     fast værn på 7 s fra indlæsningen skar dens slutning af. Før
     filmen spiller, gælder de 7 s (går den aldrig i gang, kommer
     teksten alligevel); når den spiller, flyttes værnet til filmens
     egen resttid plus luft, så det kun slår til, hvis den går i stå. */
  var vaern = null;
  function vaernOm(ms) {
    clearTimeout(vaern);
    vaern = setTimeout(afsloer, ms);
  }
  video.addEventListener('playing', function () {
    film.classList.add('spiller');
    hentSlut();
    var rest = isFinite(video.duration) ? video.duration - video.currentTime : 5;
    vaernOm((rest + 3) * 1000);
  }, { once: true });
  /* ⚠️ TEKSTEN KOMMER, NÅR FILMEN ER FÆRDIG — og overgangen til
     slutbilledet med den (11/9). Før begyndte begge 1,1 s før slut, og
     slutbilledet blev blændet ind hen over filmens sidste sekund: den
     fik aldrig lov at spille færdig. Kundens ord om overgangen står
     stadig — tekst og slutbillede kommer i SAMME øjeblik — det øjeblik
     er bare filmens sidste billede nu. */
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

  /* Værnet: går filmen i stå, kommer teksten alligevel. Og herfra er
     det SCRIPTETS værn, der gælder — stilarkets faste 8 s er kun til,
     hvis det her script aldrig nåede så langt (`film-styret`). */
  vaernOm(7000);
  html.classList.add('film-styret');
}());
