/* ============================================================
   LOADEREN — isvaflen, der fyldes, mens siden kommer  (12/9)
   ------------------------------------------------------------
   Kundens ord: "den nye loader ift hver gang siden skal loade og
   den ik afspillet videoen ved headeren så bruges den her".
   Designet er hans egen fil (Desktop/CLAUDE - Loader.md), og
   opmærkningen og stilen er kopieret 1:1 — kun indpakningen er
   vores, fordi huset er ren HTML og ikke React.

   Den vises, når gæsten KOMMER til siden udefra:
   - ⚠️ IKKE når forsidens film spiller. Filmen ER åbningen, og to
     åbninger oven i hinanden er én for meget. Klassen film-aabner
     sættes i forsidens <head>, FØR det her script kører — et link
     med #anker eller reduceret bevægelse får ingen film, og så
     får de loaderen i stedet
   - ⚠️ IKKE ved et klik rundt på siden. Filen siger "ikke ved
     klik-navigation internt": en gæst, der går fra menukortet til
     smørrebrødet, skal ikke vente et sekund på hver side. Det
     afgøres af document.referrer og IKKE af en nøgle i browseren —
     persondatapolitikken siger, at intet gemmes
   - ⚠️ IKKE i en automatiseret browser (navigator.webdriver).
     Ellers ville hver af husets ~3.600 prøver vente 1,7 sekund på
     en isvaffel, og alt, der måler det, øjet ser
     (elementFromPoint), ville ramme loaderen. Loaderens egne
     prøver slår webdriver fra (tests/loader.spec.js), så vejen,
     gæsten går, stadig er målt

   ⚠️ SCRIPTET STÅR SOM DET FØRSTE I <body> OG ER SYNKRONT. Det
   skal dække fra første billede; kom det nederst som de andre,
   ville siden stå et øjeblik, før isen lagde sig over den.

   ⚠️ STILEN LIGGER HER OG IKKE I ET ARK. Et ark i <head> er en
   forespørgsel mere, der blokerer HVER side — også de mange
   besøg, hvor loaderen slet ikke vises. Her koster den kun, når
   den bruges, og den tages med ud igen.

   ⚠️ DEN MÅ ALDRIG BLIVE HÆNGENDE. Mindst 1,2 sekund (filens krav,
   så den ikke blinker) og højst 5: et billede, der aldrig bliver
   hentet, må ikke holde gæsten ude af siden. Samme regel som
   filmens tekst, der aldrig må blive hængende skjult (11/9).
   ============================================================ */
(function () {
  'use strict';

  try {
    if (navigator.webdriver) return;
    if (document.documentElement.classList.contains('film-aabner')) return;
    var fra = document.referrer;
    if (fra && fra.indexOf(location.origin + '/') === 0) return;
  } catch (e) { return; }
  if (!document.body) return;

  /* Filens CSS, 1:1. */
  var CSS = [
    '.hc-load{position:fixed;inset:0;z-index:9999;background:#faf3e8;display:grid;place-content:center;justify-items:center;gap:24px;transition:opacity .5s ease}',
    '.hc-load[data-hidden="true"]{opacity:0;pointer-events:none}',
    '.hc-cone{width:84px;height:112px;overflow:visible}',
    '.hc-cone .hc-line{fill:none;stroke:#d62a3a;stroke-width:3.6;stroke-linejoin:round;stroke-linecap:round}',
    '.hc-cone .hc-body{fill:#fff}',
    '.hc-cone .hc-rise{fill:#d62a3a;animation:hcRise 2.5s cubic-bezier(.4,.05,.3,1) .45s forwards}',
    '/* rillerne i cremefarve OVENPÅ isen — ellers forsvinder vaflen i det røde */',
    '.hc-cone .hc-wafer{fill:none;stroke:#faf3e8;stroke-width:2.4;stroke-linecap:round;opacity:.85}',
    '.hc-scoop{opacity:0;animation:hcPop .52s cubic-bezier(.2,1.6,.35,1) forwards}',
    '.hc-s1{animation-delay:.14s}.hc-s2{animation-delay:.48s}.hc-s3{animation-delay:.82s}',
    '@keyframes hcPop{from{opacity:0;transform:translateY(6px) scale(.8)}to{opacity:1;transform:none}}',
    '@keyframes hcRise{from{transform:translateY(62px)}to{transform:translateY(0)}}',
    '.hc-track{position:relative;width:132px;height:3px;border-radius:3px;background:rgba(36,26,23,.12);overflow:hidden}',
    '.hc-track i{position:absolute;inset:0;width:0;border-radius:3px;background:#d62a3a;animation:hcFill 3s cubic-bezier(.35,.03,.25,1) .3s forwards}',
    '@keyframes hcFill{to{width:100%}}',
    /* ⚠️ ÉN AFVIGELSE FRA 1:1, OG DEN ER FILENS EGEN: den siger "vis
       is-kuglerne og en fyldt streg statisk, ingen animation", men
       dens CSS korter kun VARIGHEDEN ned — forsinkelserne står, så
       kuglerne kom stadig én ad gangen. Forsinkelsen nulstilles her. */
    '@media (prefers-reduced-motion:reduce){.hc-scoop,.hc-cone .hc-rise,.hc-track i{animation-duration:.01s;animation-delay:0s}}'
  ].join('\n');

  /* Filens opmærkning, 1:1. ⚠️ clipPath-id'et hcCup skal være
     unikt på siden — det klipper isen, så den kun fylder vaflen. */
  var INDHOLD =
    '<svg class="hc-cone" viewBox="0 0 84 112" aria-hidden="true">' +
      '<defs><clipPath id="hcCup"><path d="M17 50h50l-25 56z"/></clipPath></defs>' +
      '<g class="hc-scoop hc-s1"><circle class="hc-body" cx="42" cy="22" r="13.4"/><circle class="hc-line" cx="42" cy="22" r="13.4"/></g>' +
      '<g class="hc-scoop hc-s2"><circle class="hc-body" cx="29" cy="40" r="13.4"/><circle class="hc-line" cx="29" cy="40" r="13.4"/></g>' +
      '<g class="hc-scoop hc-s3"><circle class="hc-body" cx="55" cy="40" r="13.4"/><circle class="hc-line" cx="55" cy="40" r="13.4"/></g>' +
      '<path class="hc-body" d="M17 50h50l-25 56z"/>' +
      '<g clip-path="url(#hcCup)"><rect class="hc-rise" x="17" y="50" width="50" height="58"/></g>' +
      '<g class="hc-wafer" clip-path="url(#hcCup)"><path d="M24 61h36M29 76h26M34 90h16"/></g>' +
      '<path class="hc-line" d="M17 50h50l-25 56z"/>' +
    '</svg>' +
    '<div class="hc-track"><i></i></div>';

  var stil = document.createElement('style');
  stil.textContent = CSS;
  document.head.appendChild(stil);

  var el = document.createElement('div');
  el.className = 'hc-load';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Indlæser');
  el.innerHTML = INDHOLD;
  document.body.insertBefore(el, document.body.firstChild);

  var start = Date.now();
  var sket = false;
  function skjul() {
    if (sket) return;
    sket = true;
    setTimeout(function () {
      el.setAttribute('data-hidden', 'true');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        if (stil.parentNode) stil.parentNode.removeChild(stil);
      }, 520);
    }, Math.max(0, 1200 - (Date.now() - start)));
  }
  if (document.readyState === 'complete') skjul();
  else window.addEventListener('load', skjul, { once: true });
  setTimeout(skjul, 5000);
}());
