/* Admin: forhåndsvisning af menukortet (23/10).
   Mikkel: "hvis de tilføjer ting til menukortet — bliver det så længere, og følger skriften,
   kortet og tilføjelserne automatisk præcis, hvordan menukortene ser ud nu — og hvorhenne de
   vil have det, og et preview af, hvordan det ser ud".
   Svaret er ja — m-menukort.html tegner alt af databasen i de trykte korts form — og her kan
   ejeren SE det: arket viser den rigtige side (ikke en efterligning), og "Se på menukortet"
   ved en vare hopper hen til den og siger, hvilket kapitel den står i (ny/menukort-ny.js). */
(function () {
  'use strict';
  var panel = document.getElementById('p-menu');
  if (!panel) return;

  var ark = null, ramme = null;
  function åbn(vis) {
    if (!ark) {
      ark = document.createElement('div');
      ark.className = 'forhaand-ark';
      ark.setAttribute('role', 'dialog');
      ark.setAttribute('aria-modal', 'true');
      ark.setAttribute('aria-label', 'Menukortet, som gæsten ser det');
      var top = document.createElement('div');
      top.className = 'forhaand-top';
      var titel = document.createElement('div');
      titel.innerHTML = '<b>Menukortet, som gæsten ser det</b><span>Det, der er gemt, står med. Priser står først med, når du har trykket Gem priserne.</span>';
      var opd = document.createElement('button');
      opd.type = 'button'; opd.className = 'knap'; opd.textContent = 'Opdater';
      opd.addEventListener('click', function () { if (ramme) ramme.src = adresse(ark.getAttribute('data-vis') || ''); });
      var luk = document.createElement('button');
      luk.type = 'button'; luk.className = 'knap forhaand-luk'; luk.textContent = 'Luk';
      luk.addEventListener('click', lukArk);
      top.appendChild(titel); top.appendChild(opd); top.appendChild(luk);
      ramme = document.createElement('iframe');
      ramme.className = 'forhaand-ramme';
      ramme.title = 'Menukortet, som gæsten ser det';
      ark.appendChild(top); ark.appendChild(ramme);
      document.body.appendChild(ark);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ark && !ark.hidden) lukArk(); });
    }
    ark.setAttribute('data-vis', vis || '');
    ramme.src = adresse(vis);
    ark.hidden = false;
    document.documentElement.classList.add('forhaand-aaben');
    var l = ark.querySelector('.forhaand-luk'); if (l) l.focus();
  }
  function lukArk() {
    if (!ark) return;
    ark.hidden = true;
    document.documentElement.classList.remove('forhaand-aaben');
  }
  function adresse(vis) {
    return 'm-menukort.html?forhaand=1' + (vis ? '&vis=' + encodeURIComponent(vis) : '') + '&t=' + Date.now();
  }

  panel.addEventListener('click', function (e) {
    var k = e.target.closest && e.target.closest('[data-forhaand]');
    if (!k) return;
    e.preventDefault();
    åbn(k.getAttribute('data-forhaand-vis') || '');
  });

  /* "Se på menukortet" under ⋯ ved hver vare. Rækkerne tegnes af js/admin/menukort.js og
     tegnes om ved hver ændring, så knappen sættes på, når en række dukker op. Navnet læses,
     når der trykkes — så et navn, der lige er rettet, er det, der vises. */
  function påsæt(rod) {
    [].forEach.call(rod.querySelectorAll('.vare-raekke .vare-bag'), function (bag) {
      if (bag.querySelector('.forhaand-vare')) return;
      var række = bag.closest('.vare-raekke');
      var k = document.createElement('button');
      k.type = 'button';
      k.className = 'knap lille forhaand-vare';
      k.textContent = 'Se på menukortet →';
      k.addEventListener('click', function (e) {
        e.preventDefault();
        var felt = række && række.querySelector('input.navn');
        åbn(felt ? felt.value.trim() : '');
      });
      bag.appendChild(k);
    });
  }
  var red = document.getElementById('menu-redigering');
  if (red) {
    påsæt(red);
    new MutationObserver(function () { påsæt(red); }).observe(red, { childList: true, subtree: true });
  }
})();
