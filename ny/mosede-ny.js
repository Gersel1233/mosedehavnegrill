/* Mosede /ny/: det, prøven skal bruge ud over forsidens egne scripts.
   Siden ligger én mappe nede, men alle adresser regnes fra roden
   (<base href="../"> i head) — så billeder, scripts og menukortet virker
   uden at én fil er kopieret. To ting bryder base-tricket, og dem
   samler vi op her. */
(function () {
  'use strict';
  var her = function () { return location.href.split('#')[0]; };

  /* ⚠️ SVG'ens egne #-henvisninger (kransens ringtekst og ankre) ville
     ellers pege på roden og ikke på den side, de står i. */
  function svgRet(rod) {
    (rod || document).querySelectorAll('svg [href^="#"]').forEach(function (el) {
      el.setAttribute('href', her() + el.getAttribute('href'));
    });
  }
  svgRet();

  /* ⚠️ Et link til #bestil ville gå til ROD-forsiden. havnegrillen.js tager
     de links, der fandtes ved indlæsning; dem, der bygges bagefter, tager vi. */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (!a || ev.defaultPrevented) return;
    var h = a.getAttribute('href');
    if (!h || h.charAt(0) !== '#') return;
    ev.preventDefault();
    if (h.length < 2) return;
    var mål = document.getElementById(decodeURIComponent(h.slice(1)));
    if (!mål) return;
    var bar = document.querySelector('.topbar');
    var y = mål.getBoundingClientRect().top + scrollY - (bar ? bar.offsetHeight : 0) - 8;
    scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    try { history.replaceState(null, '', her() + h); } catch (e) {}
  });
  /* Dagens ret på heroens billede: et glaskort, der peger ned på tavlen.
     Kortet LÆSER tavlen og ugen, som forside.js har skrevet — det finder
     intet på selv. Er der ingen ret i dag, viser det den næste i ugen;
     er der heller ingen, findes kortet ikke. */
  var cta = document.querySelector('.hero-cta');
  if (cta) {
    var kort = document.createElement('a');
    kort.className = 'ny-idag'; kort.hidden = true;
    kort.innerHTML = '<span class="k"><span>I dag</span></span><span class="t"><small></small><b></b></span><em></em><i aria-hidden="true">→</i>';
    cta.insertAdjacentElement('afterend', kort);
    var tegn = function () {
      var afsnit = document.getElementById('idag');
      var h3 = afsnit && afsnit.querySelector('.today h3');
      var ret = h3 && h3.textContent.trim();
      var synlig = afsnit && !afsnit.hidden && afsnit.style.display !== 'none' && ret && !/^Henter/.test(ret);
      var k = kort.querySelector('.k span'), sm = kort.querySelector('small'), b = kort.querySelector('b'), em = kort.querySelector('em');
      if (synlig) {
        var pris = afsnit.querySelector('.today .price');
        k.textContent = 'I dag'; sm.textContent = 'Dagens ret'; b.textContent = ret;
        em.textContent = pris && pris.style.display !== 'none' && !pris.hidden ? pris.textContent.trim() : '';
        kort.setAttribute('href', '#idag'); kort.hidden = false; return;
      }
      var dag = [].slice.call(document.querySelectorAll('#ugen .week .day:not(.closed)')).filter(function (d) {
        var h = d.querySelector('h4'); return h && !/^Henter/.test(h.textContent);
      })[0];
      if (dag) {
        var dw = (dag.querySelector('.dw') || {}).textContent || '';
        var pr = dag.querySelector('.pr');
        k.textContent = 'Snart'; sm.textContent = 'Dagens ret · ' + dw.trim().toLowerCase();
        b.textContent = dag.querySelector('h4').textContent.trim(); em.textContent = pr ? pr.textContent.trim() : '';
        kort.setAttribute('href', '#ugen'); kort.hidden = false; return;
      }
      kort.hidden = true;
    };
    var vent;
    var mo = new MutationObserver(function () { clearTimeout(vent); vent = setTimeout(tegn, 120); });
    ['idag', 'ugen'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'style'] });
    });
    tegn();
  }
})();
