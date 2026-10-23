/* Menukortet: et sprogskift må ikke flytte skærmen (23/10).
   Mikkel: "når jeg skifter fra dansk til engelsk, ryger det ned i kappen
   nedenunder det røde". js/skal/menukort.js bygger hele kortet om ved et
   skift; i det øjeblik er kortet tomt, og Safari (som ikke holder pladsen
   selv, som Chromium gør) lader skærmen glide. Her holdes kortets højde fast
   under skiftet, og sprogknapperne bliver stående, hvor fingeren var.
   Lytteren står i "capture", så den måler FØR menukort.js bygger om. */
(function () {
  'use strict';
  var boks = document.getElementById('mk-sprog');
  var kat = document.getElementById('mk-kat');
  if (!boks) return;
  boks.addEventListener('click', function (ev) {
    if (!ev.target.closest || !ev.target.closest('[data-sprog]')) return;
    var før = boks.getBoundingClientRect().top;
    if (kat) kat.style.minHeight = kat.offsetHeight + 'px';
    var slut = Date.now() + 700;
    (function hold() {
      var d = boks.getBoundingClientRect().top - før;
      if (Math.abs(d) > 1) window.scrollBy(0, d);
      if (Date.now() < slut) requestAnimationFrame(hold);
      else if (kat) kat.style.minHeight = '';
    })();
  }, true);
})();
