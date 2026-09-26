/* ============================================================
   TILBAGE LANDER, HVOR MAN VAR  (26/9)
   ------------------------------------------------------------
   Mikkels spørgsmål: *"hvad med når man trykker tilbage for hver
   enkelte side, skal man så bare ryge til toppen eller hvad"*.
   Nej. En gæst, der går fra menukortet ind på tapas og tilbage,
   skal stå ved tapasfadet igen — sådan gør enhver app og enhver
   browser på en side, der ikke tegnes af JavaScript.

   ⚠️ BROWSEREN KAN DET SELV — MEN FOR TIDLIGT. Den gendanner
   rullepositionen, når HTML'en er læst. Menukortet, ugens retter og
   forsidens bestilling tegnes bagefter af JavaScript, når
   databasen har svaret; på det tidspunkt er siden kun en skærm
   høj, så browseren lander i toppen og giver op. Derfor gør vi det
   selv: vi venter, til siden er høj nok, og ruller så.

   ⚠️ INTET GEMMES I BROWSEREN. Positionen står i historikkens egen
   post (history.state) — det sted, browseren selv bruger til det
   samme. Ingen cookie, ingen localStorage: persondatapolitikken
   siger, at vi ikke gemmer noget, og det skal blive sandt.

   ⚠️ KUN VED TILBAGE/FREM OG GENINDLÆSNING. Et nyt klik ind på en
   side starter i toppen (eller ved sit #anker), som det skal.

   ⚠️ GÆSTEN VINDER. Ruller, trykker eller taster nogen, før siden
   er klar, holder vi op — et hop under fingeren er værre end at
   lande et forkert sted.

   ⚠️ SIDEN FRA BROWSERENS HUKOMMELSE (bfcache) RØRES IKKE. Den
   kommer tilbage præcis, som den var, rulning og alt.
   ============================================================ */
(function () {
  if (!('scrollRestoration' in history) || !window.requestAnimationFrame) return;
  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
  var type = nav ? nav.type : (performance.navigation && performance.navigation.type === 2 ? 'back_forward' : 'navigate');

  history.scrollRestoration = 'manual';

  function y() { return window.scrollY || document.documentElement.scrollTop || 0; }
  function gem() {
    try {
      var s = history.state;
      s = (s && typeof s === 'object') ? Object.assign({}, s) : {};
      s.mosedeY = Math.round(y());
      history.replaceState(s, '');
    } catch (e) { /* en fyldt historik må ikke vælte siden */ }
  }
  var t = 0;
  window.addEventListener('scroll', function () {
    clearTimeout(t); t = setTimeout(gem, 120);
  }, { passive: true });
  window.addEventListener('pagehide', gem);

  /* ⚠️ TILBAGE-PILEN ER "TILBAGE", IKKE "TIL FORSIDEN" (26/9). Pilen
     øverst til venstre var et link til index.html. Kom gæsten fra
     menukortet, landede hun på forsiden — i toppen, med filmen
     forfra — og historikken fik en post mere. Kom man fra en side i
     huset, går pilen nu det samme skridt tilbage som browserens
     egen knap. Kom man udefra (et link fra Google), er der intet
     "tilbage" i huset, og så er forsiden det rigtige sted. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[data-tilbage]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var fra = document.referrer;
    if (!fra || fra.indexOf(location.origin + '/') !== 0 || history.length < 2) return;
    e.preventDefault();
    history.back();
  });

  if (type !== 'back_forward' && type !== 'reload') return;
  var maal = history.state && history.state.mosedeY;
  if (!maal || maal < 1) return;

  var afbrudt = false;
  function afbryd() { afbrudt = true; }
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (h) {
    window.addEventListener(h, afbryd, { passive: true, once: true });
  });

  /* Højst fire sekunder: kommer databasen aldrig, står gæsten så
     langt nede, som siden rækker, i stedet for at vente for evigt. */
  var slut = Date.now() + 4000;
  (function prøv() {
    if (afbrudt) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max >= maal - 2) { window.scrollTo(0, maal); return; }
    if (Date.now() > slut) { window.scrollTo(0, Math.max(0, max)); return; }
    requestAnimationFrame(prøv);
  })();
})();
