/* ============================================================
   FILMEN BAG DAGENS RET OG UGENS RETTER  (12/9)
   ------------------------------------------------------------
   Kundens ord: "når de lægger en dagens ret ud skal den her video
   være, og den skal være loop i baggrunden, ligesom ned ved find
   os — her er det bare video". Filmen er hans egen fra Desktop:
   en tallerken på et ternet bord ved havnen i solnedgang.

   ⚠️ DEN HENTES FØRST, NÅR GÆSTEN NÆRMER SIG — og ikke før.
   preload="none" og ingen src i opmærkningen: 0,8-1 MB film midt
   på forsiden er ikke noget, en gæst på et mobilnet skal betale
   for, før hun ruller derned. Samme regel som fotoerne i
   forsidens fartprøve.

   ⚠️ OG DEN STÅR STILLE, NÅR DEN IKKE KAN SES. En film, der kører
   videre fire skærme længere oppe, bruger strøm på en telefon og
   billeder på alt andet. Iagttageren pauser den uden for synet.

   ⚠️ ÉN REGEL AFGØR FORMATET, som heroens: (orientation: portrait)
   → den høje udgave, ellers den brede. Film og stillbillede
   vælges af den samme, så de aldrig er hver sit format.

   ⚠️ REDUCERET BEVÆGELSE FÅR STILLBILLEDET, IKKE FILMEN.
   Filmens første billede står i stedet — samme svar som heroen.

   Løkken er filmen spillet frem og så baglæns (8 s), så den ender,
   hvor den begyndte: den oprindelige ende lå ~55 fra starten pr.
   kanal, og et spring hvert fjerde sekund er dét, man ser.
   ============================================================ */
(function () {
  'use strict';
  var baand = document.getElementById('dag-baand');
  var video = baand && baand.querySelector('video');
  if (!video) return;

  function passer(q) {
    try { return window.matchMedia && window.matchMedia(q).matches; } catch (e) { return false; }
  }
  var hoej = passer('(orientation: portrait)');
  var stille = passer('(prefers-reduced-motion: reduce)');
  var kilde = video.getAttribute(hoej ? 'data-hoej' : 'data-bred');
  var still = video.getAttribute(hoej ? 'data-hoej-still' : 'data-bred-still');
  var hentet = false;

  function hent() {
    if (hentet) return;
    hentet = true;
    if (still) video.poster = still;
    if (!stille && kilde) video.src = kilde;
  }
  function spil() {
    if (stille || !video.src) return;
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* strømbesparelse: stillbilledet står */ });
  }

  if (!('IntersectionObserver' in window)) { hent(); spil(); return; }
  new IntersectionObserver(function (poster) {
    var inde = poster[poster.length - 1].isIntersecting;
    if (inde) { hent(); spil(); }
    else if (!video.paused) video.pause();
  /* ⚠️ INGEN MARGEN (12/9). Med 300 px blev filmen hentet, FØR gæsten
     havde rullet — på en telefon ligger båndet lige under heroen.
     Den mørke grund står det øjeblik, stillbilledet er om at komme. */
  }, { rootMargin: '0px' }).observe(baand);
}());
