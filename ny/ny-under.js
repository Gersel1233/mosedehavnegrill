/* Mosede: småhjælp til undersiderne i det nye design (bord/, h-*.html).
   Designet lå som prøve under /ny/ og blev lanceret på de rigtige adresser 23/10.
   Dengang sendte filen her links videre til /ny/-kopierne; det gør den ikke mere.
   Tilbage er de to ting, en side med <base> har brug for (bord/ står med
   <base href="../">). */
(function () {
  'use strict';
  /* Med <base> peger "#bestil" på roden. Sidens egne scripts ruller selv, når de
     kan (havnegrillen.js); ellers ruller vi her i stedet for at forlade siden. */
  if (document.querySelector('base')) {
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href^="#"]');
      if (!a || ev.defaultPrevented) return;
      var h = a.getAttribute('href');
      var el = h.length > 1 && document.getElementById(decodeURIComponent(h.slice(1)));
      ev.preventDefault();
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(null, '', h); }
    });
  }
  /* ANKERHOPPET RETTER SIG SELV (23/10). havnegrillen.js regner målet ud, når der trykkes —
     men på undersiderne fylder databasen tekster ind over målet, MENS siden ruller
     (smørrebrødssidens leveringsfakta voksede 107 px), og afsnittet landede et godt stykke
     under bjælken. Når rulningen står stille, måles der igen, og det sidste stykke tages.
     Samme udregning som motoren: offsetTop minus bjælkens højde plus 14 px luft. */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (!a || !ev.defaultPrevented) return;
    var h = a.getAttribute('href');
    var el = h.length > 1 && document.getElementById(decodeURIComponent(h.slice(1)));
    if (!el) return;
    var sc = document.getElementById('sc');
    var rod = sc && getComputedStyle(sc).overflowY !== 'visible' ? sc : document.scrollingElement;
    var lytter = rod === document.scrollingElement ? window : rod;
    var bar = document.querySelector('.topbar');
    var tid = 0, gange = 0;
    function tjek() {
      var luft = (bar ? bar.getBoundingClientRect().height : 0) + 14;
      var maal = Math.max(0, el.offsetTop - luft);
      if (Math.abs(rod.scrollTop - maal) > 8 && gange++ < 3) rod.scrollTo({ top: maal, behavior: 'auto' });
    }
    function stille() {
      clearTimeout(tid);
      tid = setTimeout(function () { lytter.removeEventListener('scroll', stille); tjek(); }, 220);
    }
    lytter.addEventListener('scroll', stille, { passive: true });
    stille();
  });

  /* SVG'ens egne #-henvisninger (kransens ringtekst) peger med <base> på roden i
     nogle browsere — de får sidens egen adresse foran, som på forsiden. */
  document.querySelectorAll('svg [href^="#"]').forEach(function (el) {
    el.setAttribute('href', location.href.split('#')[0] + el.getAttribute('href'));
  });
})();
