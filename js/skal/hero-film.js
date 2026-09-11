/* ============================================================
   HEROENS FILM  (11/9)
   ------------------------------------------------------------
   Kundens ord: headerens baggrund "som lige nu er det ternede" skal
   være filmen fra Desktop/header — én til computer og én i 9:16 til
   iPhone — logoet skal stadig falde på plads derinde, og bagefter
   skal slutbilledet stå.

   Tre regler bærer filen:

   · FORMATET AFGØRES ÉT STED — `data-hoej-naar` på rammen. Filmen,
     dens første billede og slutbilledet vælges af den samme regel,
     så de aldrig kan være hver sit format.

   · FILMEN STARTER, NÅR GÆSTEN KAN SE DEN — i det sekund logoet
     begynder at lande (`html.intro-lander`), eller med det samme,
     hvis introen er sprunget over (et direkte link). Startede den ved
     indlæsning, ville de fire sekunder, maden kommer frem på bordet,
     gå tabt bag introens creme.

   · SLUTBILLEDET ER SVARET PÅ ALT, DER IKKE ER EN FILM: reduceret
     bevægelse, en afspilningsfejl, og en iPhone på strømbesparelse,
     hvor play() afvises. Siden står aldrig med en tom, mørk hero.

   ⚠️ SLUTBILLEDET HENTES FØRST, NÅR DET SKAL BRUGES. Det er 330 kB,
   og filmens eget sidste billede står nedenunder, til det er hentet
   — så blændes det ind. Et billede, der hentes ved indlæsning for at
   blive vist fem sekunder senere, er vægt, gæsten betaler for på en
   havn med dårlig dækning.
   ============================================================ */
(function () {
  'use strict';

  var film = document.querySelector('.hero-film');
  if (!film) return;
  var video = film.querySelector('video');
  var still = film.querySelector('.hero-slut');

  var v = film.getAttribute('data-v');
  var stempel = v && v.indexOf('__') !== 0 ? '?v=' + v : '';
  var hoej = window.matchMedia
    && window.matchMedia(film.getAttribute('data-hoej-naar') || '(orientation: portrait)').matches;
  var base = film.getAttribute(hoej ? 'data-hoej' : 'data-bred');
  film.setAttribute('data-format', hoej ? '9x16' : '16x9');

  function slut() {
    if (film.classList.contains('slut')) return;
    film.classList.add('slut');
    if (!still) return;
    still.addEventListener('load', function () { still.classList.add('vis'); }, { once: true });
    still.src = base + '-slut.jpg' + stempel;
    if (still.complete && still.naturalWidth > 0) still.classList.add('vis');
  }

  var ro = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (ro || !video || typeof video.play !== 'function') { slut(); return; }

  /* iOS kræver egenskaben, ikke kun attributten, før en film uden
     lyd må spille af sig selv. */
  video.muted = true;
  video.setAttribute('playsinline', '');
  video.poster = base + '-start.jpg' + stempel;
  video.addEventListener('ended', slut);
  video.addEventListener('error', slut);
  video.src = base + '.mp4' + stempel;

  var startet = false;
  function spil() {
    if (startet) return;
    startet = true;
    var p = video.play();
    if (p && typeof p.catch === 'function') p.catch(slut);
  }

  /* Er introen der ikke (direkte link, reduceret bevægelse, eller
     den er allerede væk), spiller filmen med det samme. */
  if (!document.getElementById('intro')) { spil(); return; }

  var vagt = new MutationObserver(function () {
    if (document.documentElement.classList.contains('intro-lander')
        || !document.getElementById('intro')) {
      vagt.disconnect();
      spil();
    }
  });
  vagt.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  vagt.observe(document.body, { childList: true });

  /* Et værn: går introen i stå, må filmen ikke vente for evigt. */
  setTimeout(function () { vagt.disconnect(); spil(); }, 9000);
}());
