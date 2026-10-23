/* Mosede /ny/: undersiderne (bord, smørrebrød, baglokale …) ligger som kopier
   under /ny/ med <base>, så deres egne filer hentes fra roden. Links, der peger
   på den rigtige forside — også dem, sidernes egne scripts bygger bagefter
   (fx "Til forsiden" efter en booking) — sendes til /ny/ i stedet, og links til
   de undersider, der har en /ny/-udgave, til den. */
(function () {
  'use strict';
  var NY = {
    '/': '/ny/', '/index.html': '/ny/', '/bord/': '/ny/bord/', '/historien.html': '/ny/historien.html',
    '/h-smorrebrod.html': '/ny/h-smorrebrod.html', '/smoerrebroed-ud-af-huset/': '/ny/h-smorrebrod.html',
    '/h-baglokale.html': '/ny/h-baglokale.html', '/baglokale/': '/ny/h-baglokale.html',
    '/h-catering.html': '/ny/h-catering.html', '/catering/': '/ny/h-catering.html',
    '/h-frokost.html': '/ny/h-frokost.html',
    '/h-kalender.html': '/ny/h-kalender.html', '/arrangementer/': '/ny/h-kalender.html'
  };
  function ret(a) {
    var href = a.getAttribute('href');
    if (!href || /^(tel:|mailto:|#|https?:\/\/(?!mosedehavnecafe\.dk))/.test(href)) return;
    var u;
    try { u = new URL(a.href); } catch (e) { return; }
    if (u.origin !== location.origin) return;
    var mål = NY[u.pathname];
    if (mål && u.pathname !== location.pathname) a.href = mål + u.search + u.hash;
  }
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
  function alle(rod) { (rod.querySelectorAll ? rod : document).querySelectorAll('a[href]').forEach(ret); }
  alle(document);
  new MutationObserver(function (poster) {
    poster.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches('a[href]')) ret(n); alle(n); } }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
