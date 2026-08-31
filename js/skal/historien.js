/* ============================================================
   HISTORIEN OM MOSEDE HAVN — koblingen  (31. august 2026)
   ------------------------------------------------------------
   Siden er tekst, og teksten står i HTML'en. Filen her gør kun
   to ting:

     1. fylder billedpladserne med det, ejeren har lagt op
     2. toner kapitlerne frem, når de er i syne

   ⚠️ TEKSTEN BOR IKKE HER. En historie, der bygges af
   JavaScript, forsvinder for den, der har slået det fra — og
   Google ser en tom side. Det eneste, koden rører, er billeder
   og billedtekster.
   ============================================================ */
(function () {
  'use strict';

  /* ---- 1) BILLEDERNE ---------------------------------------
     Samme regel som resten af huset: admin slår repoet, og uden
     et foto står en flade med et tegn — aldrig en stiplet grå
     kasse og aldrig et opdigtet motiv. Se js/skal/billedplads.js.

     ⚠️ OG PLADSERNE SKAL FYLDES, OGSÅ NÅR HENTNINGEN FEJLER.
     Blev de stående som <image-slot>, ville en side med en nede
     database være den side, der har FLEST grå kasser — og det er
     lige præcis den dag, den skal se hel ud. */
  function billeder(indstillinger) {
    if (window.MosedeBilledplads) window.MosedeBilledplads.fyld(indstillinger || {});

    /* Billedteksten hører til FOTOET, ikke til pladsen. Har
       ejeren skrevet en tekst i admin, står den; ellers står
       sidens egen. En tekst, der beskriver et billede, der ikke
       er lagt op endnu, ville oplyse forkert. */
    var i = indstillinger || {};
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-billedtekst]'), function (p) {
        var nr = p.getAttribute('data-billedtekst');
        var egen = String(i['foto_historie_' + nr + '_tekst'] || '').trim();
        if (egen) p.textContent = egen;
      });
  }

  /* ---- 2) BEVÆGELSEN ---------------------------------------
     ⚠️ IntersectionObserver OG IKKE EN RULLELYTTER. En lytter på
     scroll koster et kald pr. billede for noget, browseren kan
     svare på selv — og huset har allerede betalt for den slags
     én gang (de tre wheel-lyttere på forsiden, 31/8).

     Klassen skiftes ÉN gang pr. element og fjernes aldrig igen:
     tekst, der toner ud, når man ruller tilbage, er ikke
     filmisk — det er en side, der blinker. */
  function toning() {
    var emner = document.querySelectorAll('.ton');
    if (!emner.length) return;

    if (!('IntersectionObserver' in window)) {
      /* Ingen iagttager = alt står frem med det samme. En
         historie, man ikke kan læse, fordi en browser er gammel,
         er værre end en historie uden overgange. */
      Array.prototype.forEach.call(emner, function (e) { e.classList.add('inde'); });
      return;
    }

    var vagt = new IntersectionObserver(function (poster) {
      poster.forEach(function (p) {
        if (!p.isIntersecting) return;
        p.target.classList.add('inde');
        vagt.unobserve(p.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(emner, function (e) { vagt.observe(e); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    toning();

    if (!window.Butik || !Butik.hent) return billeder({});
    Butik.hent().then(function (d) {
      billeder((d || {}).indstillinger || {});
      /* Pladserne er skiftet ud med billeder nu — de nye
         elementer skal også tone frem. */
      toning();
    }).catch(function () {
      billeder({});
      toning();
    });
  });
}());
