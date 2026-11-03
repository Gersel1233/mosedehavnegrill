/* ============================================================
   NY UDGAVE AF ADMIN  (3/11)
   ------------------------------------------------------------
   Chefen 3/11, efter "Rediger booking" var lagt op: *"Når man
   trykker på de 3 … kan man kun vælge, om gæsten er kommet eller
   ej."* Siden var live — men hans admin var åbnet, før den kom, og
   admin henter aldrig sig selv igen. En iPad i køkkenet står åben i
   dagevis.

   Hvert femte minut (og når fanen kommer frem igen) spørger den,
   hvilken udgave der ligger på nettet. Er den nyere end den, der
   kører, kommer en knap: "Admin er opdateret — tryk her". Den
   genindlæser IKKE af sig selv: nogen kan sidde midt i en note.
   ============================================================ */
(function () {
  'use strict';

  function minUdgave() {
    var s = document.querySelector('script[src*="js/admin/kerne.js"]');
    var m = s && /[?&]v=([^&"']+)/.exec(s.getAttribute('src') || '');
    return m ? m[1] : null;
  }
  var mig = minUdgave();
  // Lokalt (og i prøverne) er stemplet ikke sat — så er der intet at sammenligne.
  if (!mig || mig === '__V__') return;

  var vist = false;
  function tjek() {
    if (vist || document.hidden || !window.fetch) return;
    fetch('admin.html?udgave=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) {
        var m = /js\/admin\/kerne\.js\?v=([^"'&]+)/.exec(t || '');
        if (m && m[1] !== '__V__' && m[1] !== mig) vis();
      })
      .catch(function () { /* intet net — prøv igen næste gang */ });
  }
  function vis() {
    vist = true;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ny-udgave';
    b.textContent = '🔄 Admin er opdateret — tryk her for at hente det nye';
    b.addEventListener('click', function () { location.reload(); });
    document.body.appendChild(b);
  }

  setTimeout(tjek, 20000);
  setInterval(tjek, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tjek(); });
})();
