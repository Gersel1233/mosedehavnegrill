/* Mosede /ny/: undersiderne (bord, smørrebrød, baglokale …) ligger som kopier
   under /ny/ med <base>, så deres egne filer hentes fra roden. Links, der peger
   på den rigtige forside — også dem, sidernes egne scripts bygger bagefter
   (fx "Til forsiden" efter en booking) — sendes til /ny/ i stedet, og links til
   de undersider, der har en /ny/-udgave, til den. */
(function () {
  'use strict';
  var NY = { '/': '/ny/', '/index.html': '/ny/', '/bord/': '/ny/bord/' };
  function ret(a) {
    var href = a.getAttribute('href');
    if (!href || /^(tel:|mailto:|#|https?:\/\/(?!mosedehavnecafe\.dk))/.test(href)) return;
    var u;
    try { u = new URL(a.href); } catch (e) { return; }
    if (u.origin !== location.origin) return;
    var mål = NY[u.pathname];
    if (mål && u.pathname !== location.pathname) a.href = mål + u.search + u.hash;
  }
  function alle(rod) { (rod.querySelectorAll ? rod : document).querySelectorAll('a[href]').forEach(ret); }
  alle(document);
  new MutationObserver(function (poster) {
    poster.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches('a[href]')) ret(n); alle(n); } }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
