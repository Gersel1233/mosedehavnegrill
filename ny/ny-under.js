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
  /* SVG'ens egne #-henvisninger (kransens ringtekst) peger med <base> på roden i
     nogle browsere — de får sidens egen adresse foran, som på forsiden. */
  document.querySelectorAll('svg [href^="#"]').forEach(function (el) {
    el.setAttribute('href', location.href.split('#')[0] + el.getAttribute('href'));
  });
})();
