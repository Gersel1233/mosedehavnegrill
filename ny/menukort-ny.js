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

/* FORHÅNDSVISNINGEN FRA ADMIN (23/10). Mikkel: "hvis de tilføjer ting til menukortet — kommer
   det automatisk til at følge præcis, hvordan kortene ser ud, og hvorhenne, og et preview".
   Admin åbner den RIGTIGE side i et ark (ny/admin-forhaand.js) med ?vis=<varens navn>: når
   kortet er tegnet, rulles der hen til varen, den markeres, og en linje siger, hvilket
   kapitel og afsnit den står i. Det er siden selv, ikke en efterligning — så det, ejeren
   ser, er det, gæsten ser. */
(function () {
  'use strict';
  var p = new URLSearchParams(location.search);
  if (!p.has('forhaand')) return;
  document.documentElement.classList.add('mk-forhaand');
  var navn = (p.get('vis') || '').trim();
  if (!navn) return;
  var ren = function (s) { return String(s || '').trim().toLowerCase(); };
  var slut = Date.now() + 9000;
  function skilt(tekst, fundet) {
    var s = document.createElement('div');
    s.className = 'mk-forhaand-skilt' + (fundet ? '' : ' mk-forhaand-skilt--mangler');
    s.setAttribute('role', 'status');
    s.textContent = tekst;
    document.body.appendChild(s);
  }
  (function led() {
    var linjer = [].slice.call(document.querySelectorAll('#mk-kat .mk-linje[data-vare]'));
    var hit = linjer.filter(function (l) { return ren(l.getAttribute('data-vare')) === ren(navn); })[0]
      || linjer.filter(function (l) { return ren(l.getAttribute('data-vare')).split(' · ').indexOf(ren(navn)) > -1; })[0];
    if (!hit && (!linjer.length || Date.now() < slut)) {
      if (Date.now() < slut) return void setTimeout(led, 250);
    }
    if (!hit) {
      skilt('«' + navn + '» står ikke på kortet. Er «Vis» slået fra, mangler den en pris, eller er den ikke gemt endnu?', false);
      return;
    }
    var kap = hit.closest('.mk-kapitel');
    var sek = hit.closest('.mk-sek');
    var kapH = kap && kap.querySelector('h2');
    var kapNavn = kapH ? kapH.textContent.replace(/\s+/g, ' ').trim() : (kap ? (kap.getAttribute('data-hop-navn') || '') : '');
    var h = sek && sek.querySelector('h3');
    var sekNavn = h ? h.textContent.replace(/^[◆\s]+/, '').trim() : '';
    hit.classList.add('mk-fremhaevet');
    hit.scrollIntoView({ block: 'center' });
    skilt('«' + navn + '» står i ' + (kapNavn ? 'kapitlet «' + kapNavn + '»' : 'kortet')
      + (sekNavn && ren(sekNavn) !== ren(kapNavn) ? ' under «' + sekNavn + '»' : '') + '.', true);
  })();
})();
