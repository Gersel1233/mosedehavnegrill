/* ============================================================
   FEJLEN STÅR VED FELTET  (28/9)
   ------------------------------------------------------------
   Mikkels ord: *"alle steder, hvis telefonnummeret der er angivet
   er ugyldigt den ene eller anden måde, skal det også være
   tydeligt"* og *"jeg kan ikke få et tilbud, den går bare op og
   siger, jeg skal vælge en dato, jeg allerede har gjort"*.

   Det var den samme fejl to steder. Designsiderne skrev fejlen i
   ÉN linje — under knappen (forespørgslerne og kalenderen) eller
   i summen (forsiden, smørrebrød, tapas) — og flyttede fokus op
   til feltet. På en telefon hoppede siden altså op til et felt,
   der så helt i orden ud, mens forklaringen stod et andet sted,
   ofte bag tastaturet. Intet felt blev rødt nogen steder.

   Nu får feltet en rød kant og sætningen lige under sig, og den
   forsvinder, så snart gæsten retter i feltet. Linjen ved knappen
   bliver stående som den anden halvdel: den, der har trykket
   Send og kigger på knappen, skal også kunne se, at der mangler
   noget.

   ⚠️ REGLEN BOR HER, ÉN GANG. Fem skærme viser feltfejl, og fem
   kopier ville tegne fem forskellige røde. bestil/ og bord/ har
   deres egen (js/bestilling.js, js/bord.js) med felter i
   opmærkningen; den her er til designsiderne, hvor felterne ikke
   har en plads til en fejl.
   ============================================================ */
(function () {
  'use strict';

  var tæller = 0;

  /* Hvor beskeden skal stå: lige efter feltet. Et felt i en
     .two-col står i sin egen <div>, og så lander linjen under det
     rigtige felt og ikke under naboen. */
  function vis(el, besked) {
    if (!el) return null;
    var linje = el._feltfejl;
    if (!linje || !linje.parentNode) {
      linje = document.createElement('p');
      linje.className = 'felt-fejl';
      linje.id = 'felt-fejl-' + (++tæller);
      el.insertAdjacentElement('afterend', linje);
      el._feltfejl = linje;
    }
    linje.textContent = besked;
    /* role=alert: en skærmlæser siger den højt — den kommer til
       uden, at gæsten har flyttet sig. */
    linje.setAttribute('role', 'alert');
    el.setAttribute('aria-invalid', 'true');
    var beskrevet = (el.getAttribute('aria-describedby') || '').split(/\s+/);
    if (beskrevet.indexOf(linje.id) === -1) {
      beskrevet.push(linje.id);
      el.setAttribute('aria-describedby', beskrevet.join(' ').trim());
    }
    /* Den forsvinder, når gæsten retter — ikke før næste Send. En
       rød kant, der bliver stående på et rettet felt, siger, at
       rettelsen ikke virkede. */
    if (!el._feltfejlLytter) {
      el._feltfejlLytter = function () { ryd(el); };
      el.addEventListener('input', el._feltfejlLytter);
      el.addEventListener('change', el._feltfejlLytter);
    }
    return linje;
  }

  function ryd(el) {
    if (!el) return;
    if (el._feltfejl && el._feltfejl.parentNode) {
      el._feltfejl.parentNode.removeChild(el._feltfejl);
    }
    el._feltfejl = null;
    if (el.getAttribute('aria-invalid') === 'true') el.removeAttribute('aria-invalid');
  }

  function rydAlle(rod) {
    var liste = (rod || document).querySelectorAll('[aria-invalid="true"]');
    Array.prototype.forEach.call(liste, ryd);
  }

  /* Rul feltet frem, så det står midt på skærmen og ikke gemmer
     sig under topbjælken. Fokus alene lagde feltet helt oppe i
     kanten — eller slet ikke, når feltet er nettet i kalenderen. */
  function frem(el) {
    if (!el || !el.scrollIntoView) return;
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    catch (e) { el.scrollIntoView(); }
  }

  window.MosedeFeltfejl = { vis: vis, ryd: ryd, rydAlle: rydAlle, frem: frem };
}());
