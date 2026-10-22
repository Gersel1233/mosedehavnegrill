/* Mosede /ny/: det, prøven skal bruge ud over forsidens egne scripts.
   Siden ligger én mappe nede, men alle adresser regnes fra roden
   (<base href="../"> i head) — så billeder, scripts og menukortet virker
   uden at én fil er kopieret.

   ⚠️ BESTILLINGENS MOTOR ER URØRT. js/skal/bestil.js ejer kurven, datoen,
   tiden og reglerne. Alt her er et lag ovenpå: chipsene sætter den samme
   <select> og sender den samme "change", og kategori-baren trykker på de
   samme rækker, en gæst ville trykke på. Intet her bestemmer, hvad der kan
   bestilles. */
(function () {
  'use strict';
  var her = function () { return location.href.split('#')[0]; };
  var roligt = function () { return matchMedia('(prefers-reduced-motion: reduce)').matches; };
  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst !== undefined && tekst !== null) el.textContent = tekst;
    return el;
  }
  function rulTil(el, luft) {
    if (!el) return;
    var bar = document.querySelector('.topbar');
    var y = el.getBoundingClientRect().top + scrollY - (bar ? bar.offsetHeight : 0) - (luft || 8);
    scrollTo({ top: y, behavior: roligt() ? 'auto' : 'smooth' });
  }

  /* Bjælkens højde skifter, når den sætter sig fast; kategori-baren skal
     klæbe lige under den, så højden læses i stedet for at stå som et tal. */
  (function () {
    var tb = document.querySelector('.topbar');
    if (!tb) return;
    var sæt = function () { document.documentElement.style.setProperty('--ny-top', tb.offsetHeight + 'px'); };
    sæt();
    if (window.ResizeObserver) new ResizeObserver(sæt).observe(tb);
  })();

  /* ⚠️ SVG'ens egne #-henvisninger (kransens ringtekst og ankre) ville
     ellers pege på roden og ikke på den side, de står i. */
  document.querySelectorAll('svg [href^="#"]').forEach(function (el) {
    el.setAttribute('href', her() + el.getAttribute('href'));
  });

  /* ⚠️ Et link til #bestil ville gå til ROD-forsiden. havnegrillen.js tager
     de links, der fandtes ved indlæsning; dem, der bygges bagefter, tager vi. */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (!a || ev.defaultPrevented) return;
    var h = a.getAttribute('href');
    if (!h || h.charAt(0) !== '#') return;
    ev.preventDefault();
    if (h.length < 2) return;
    rulTil(document.getElementById(decodeURIComponent(h.slice(1))));
    try { history.replaceState(null, '', her() + h); } catch (e) {}
  });

  /* ============================================================
     UGEN — syv kort fra i dag, man swiper til højre
     ============================================================ */
  var MDR = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];
  function kortDato(iso) { return Number(iso.slice(8, 10)) + '. ' + MDR[Number(iso.slice(5, 7)) - 1]; }
  function kl(t) { t = String(t || '').slice(0, 5); return t.slice(3) === '00' ? String(Number(t.slice(0, 2))) : t.replace(':', '.'); }
  var R = window.MosedeRegler || {};
  function ugedag(iso) { return Butik.UGEDAGE[R.ugedagFor(iso)]; }

  function dagenI(d, iso) {
    var plan = R.planFor ? R.planFor(d, iso) : null;
    var lukket = (Butik.lukketDen && Butik.lukketDen(d, iso)) || !plan;
    var retter = lukket ? [] : (Butik.dagensRetter(d, iso) || []);
    return {
      iso: iso, plan: plan, lukket: lukket, retter: retter,
      ingen: !lukket && !retter.length && Butik.ingenDagensRet && Butik.ingenDagensRet(d, iso),
    };
  }

  /* Kan datoen vælges i bestillingen? Svaret står i <select id="dato">,
     som bestil.js bygger af reglerne — vi spørger den, vi regner ikke selv. */
  function kanVælges(iso) {
    var sel = document.getElementById('dato');
    if (!sel) return false;
    return [].some.call(sel.options, function (o) { return o.value === iso && !o.disabled; });
  }
  function vælgDato(iso) {
    var sel = document.getElementById('dato');
    if (sel && sel.value !== iso && kanVælges(iso)) {
      sel.value = iso;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    rulTil(document.querySelector('#bestil .panel'), 16);
  }

  function tegnUge(d) {
    var række = document.getElementById('nyUge');
    var prikker = document.getElementById('nyUgePrik');
    if (!række || !window.Butik || !Butik.nu || !R.ugedagFor) return;
    var iDag = Butik.nu().dato;
    var husk = række.scrollLeft;
    række.textContent = '';
    if (prikker) prikker.textContent = '';
    for (var i = 0; i < 7; i++) {
      var iso = Butik.isoPlus(iDag, i);
      var dag = dagenI(d, iso);
      var ret = dag.retter[0];
      var kort = lav('article', 'ny-dag' + (i === 0 ? ' er-idag' : '') + (dag.lukket ? ' er-lukket' : '') + (!ret ? ' er-tom' : ''));
      var top = lav('div', 'ny-dag-top');
      top.appendChild(lav('span', 'ny-dag-navn', i === 0 ? 'I dag' : i === 1 ? 'I morgen' : ugedag(iso)));
      top.appendChild(lav('span', 'ny-dag-dato', (i < 2 ? ugedag(iso).toLowerCase() + ' ' : '') + kortDato(iso)));
      kort.appendChild(top);

      var midt = lav('div', 'ny-dag-midt');
      if (ret) {
        midt.appendChild(lav('h3', null, ret.navn));
        var linjer = [];
        if (ret.beskrivelse) linjer.push(ret.beskrivelse);
        dag.retter.slice(1).forEach(function (r) { linjer.push('Eller: ' + r.navn); });
        if (linjer.length) midt.appendChild(lav('p', null, linjer.join(' ')));
      } else if (dag.lukket) {
        midt.appendChild(lav('h3', null, 'Lukket'));
        midt.appendChild(lav('p', null, 'Vi holder lukket den dag.'));
      } else if (dag.ingen) {
        midt.appendChild(lav('h3', null, 'Ingen dagens ret'));
        midt.appendChild(lav('p', null, 'Vælg frit fra menukortet.'));
      } else {
        midt.appendChild(lav('h3', null, 'Kommer snart'));
        midt.appendChild(lav('p', null, 'Køkkenet skriver retten her, så snart den er klar.'));
      }
      kort.appendChild(midt);

      var bund = lav('div', 'ny-dag-bund');
      var info = lav('div', 'ny-dag-info');
      if (ret && ret.pris !== null && ret.pris !== undefined) info.appendChild(lav('span', 'ny-dag-pris', Butik.kroner(ret.pris)));
      if (ret && ret.udsolgt) info.appendChild(lav('span', 'ny-dag-maerke er-udsolgt', 'Udsolgt'));
      else if (ret && typeof ret.antal_tilbage === 'number') info.appendChild(lav('span', 'ny-dag-maerke', ret.antal_tilbage + ' tilbage'));
      if (dag.plan) info.appendChild(lav('span', 'ny-dag-tid', 'Åbent ' + kl(dag.plan.aabner) + '–' + kl(dag.plan.lukker)));
      bund.appendChild(info);
      if (ret && !ret.udsolgt && kanVælges(iso)) {
        var knap = lav('button', 'ny-dag-knap', i === 0 ? 'Bestil dagens ret' : 'Bestil til ' + ugedag(iso).toLowerCase());
        knap.type = 'button';
        knap.addEventListener('click', vælgDato.bind(null, iso));
        bund.appendChild(knap);
      }
      kort.appendChild(bund);
      række.appendChild(kort);
      if (prikker) prikker.appendChild(lav('i', i === 0 ? 'on' : ''));
    }
    række.scrollLeft = husk;
    prikPå();
  }

  function prikPå() {
    var række = document.getElementById('nyUge');
    var prikker = document.querySelectorAll('#nyUgePrik i');
    var kort = række ? række.querySelectorAll('.ny-dag') : [];
    if (!kort.length || !prikker.length) return;
    var bredde = kort[0].getBoundingClientRect().width + 12;
    var nr = Math.round(række.scrollLeft / bredde);
    if (række.scrollLeft + række.clientWidth >= række.scrollWidth - 4) nr = kort.length - 1;
    prikker.forEach(function (p, i) { p.className = i === nr ? 'on' : ''; });
  }
  (function () {
    var række = document.getElementById('nyUge');
    if (!række) return;
    var ramme = 0;
    række.addEventListener('scroll', function () { cancelAnimationFrame(ramme); ramme = requestAnimationFrame(prikPå); }, { passive: true });
    document.querySelectorAll('.ny-uge-pile [data-pil]').forEach(function (b) {
      b.addEventListener('click', function () {
        var kort = række.querySelector('.ny-dag');
        var bredde = kort ? kort.getBoundingClientRect().width + 16 : 300;
        række.scrollBy({ left: Number(b.getAttribute('data-pil')) * bredde, behavior: roligt() ? 'auto' : 'smooth' });
      });
    });
  })();

  /* ============================================================
     HEROEN — dagens ret som et glaskort på filmen
     ============================================================ */
  var heroKort = null;
  (function () {
    var cta = document.querySelector('.hero-cta');
    if (!cta) return;
    heroKort = lav('a', 'ny-idag');
    heroKort.hidden = true;
    heroKort.setAttribute('href', '#dagens');
    heroKort.innerHTML = '<span class="k"><span>I dag</span></span><span class="t"><small></small><b></b></span><em></em><i aria-hidden="true">→</i>';
    cta.insertAdjacentElement('afterend', heroKort);
  })();
  function tegnHero(d) {
    if (!heroKort) return;
    var iDag = Butik.nu().dato;
    for (var i = 0; i < 7; i++) {
      var dag = dagenI(d, Butik.isoPlus(iDag, i));
      var ret = dag.retter[0];
      if (!ret) continue;
      heroKort.querySelector('.k span').textContent = i === 0 ? 'I dag' : i === 1 ? 'I morgen' : 'Snart';
      heroKort.querySelector('small').textContent = i === 0 ? 'Dagens ret' : 'Dagens ret · ' + ugedag(dag.iso).toLowerCase();
      heroKort.querySelector('b').textContent = ret.navn + (ret.udsolgt ? ' · udsolgt' : '');
      heroKort.querySelector('em').textContent = ret.pris !== null && ret.pris !== undefined ? Butik.kroner(ret.pris) : '';
      heroKort.hidden = false;
      return;
    }
    heroKort.hidden = true;
  }

  function tegnAlt(d) {
    if (!d || !window.Butik) return;
    try { tegnUge(d); } catch (e) { console.error(e); }
    try { tegnHero(d); } catch (e) { console.error(e); }
  }
  document.addEventListener('ny-data', function (e) { tegnAlt(e.detail); });
  if (window.nyData) tegnAlt(window.nyData);
  /* Datoerne i bestillingen kommer lidt efter dataen; knapperne "Bestil til …"
     spørger dem, så ugen tegnes igen, når listen er bygget. */
  (function () {
    var sel = document.getElementById('dato');
    if (!sel) return;
    var vent;
    new MutationObserver(function () {
      clearTimeout(vent);
      vent = setTimeout(function () { if (window.nyData) tegnUge(window.nyData); }, 80);
    }).observe(sel, { childList: true });
  })();

  /* ============================================================
     BESTILLINGEN — dato og tid som chips
     ============================================================ */
  function chips(sel, slags) {
    if (!sel) return;
    var felt = sel.closest('.field');
    if (felt) felt.classList.add('ny-chipfelt');
    var række = lav('div', 'ny-chips ny-chips--' + slags);
    række.setAttribute('role', 'radiogroup');
    var label = felt && felt.querySelector('label');
    if (label) række.setAttribute('aria-label', label.textContent.trim());
    sel.insertAdjacentElement('afterend', række);

    function tekst(o) {
      if (slags === 'tid') return [String(o.textContent).replace(/^kl\.?\s*/i, '').trim()];
      var iso = o.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !R.ugedagFor) return [o.textContent.trim()];
      var iDag = Butik.nu().dato;
      var navn = iso === iDag ? 'I dag' : iso === Butik.isoPlus(iDag, 1) ? 'I morgen' : ugedag(iso).slice(0, 3) + '.';
      return [navn, kortDato(iso)];
    }
    function tegn() {
      række.textContent = '';
      var valgt = null;
      [].forEach.call(sel.options, function (o) {
        var k = lav('button', 'ny-chip');
        k.type = 'button';
        k.setAttribute('role', 'radio');
        var t = tekst(o);
        k.appendChild(lav('b', null, t[0]));
        if (t[1]) k.appendChild(lav('small', null, t[1]));
        k.disabled = o.disabled;
        var på = o.value === sel.value;
        k.setAttribute('aria-checked', på ? 'true' : 'false');
        if (på) { k.classList.add('on'); valgt = k; }
        k.addEventListener('click', function () {
          if (sel.value === o.value) return;
          sel.value = o.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          tegn();
        });
        række.appendChild(k);
      });
      if (valgt) {
        var r = række.getBoundingClientRect(), v = valgt.getBoundingClientRect();
        if (v.left < r.left || v.right > r.right) række.scrollLeft += v.left - r.left - 16;
      }
    }
    var vent;
    new MutationObserver(function () { clearTimeout(vent); vent = setTimeout(tegn, 30); })
      .observe(sel, { childList: true, subtree: true, attributes: true });
    sel.addEventListener('change', function () { setTimeout(tegn, 0); });
    tegn();
  }
  chips(document.getElementById('dato'), 'dato');
  chips(document.getElementById('tid'), 'tid');

  /* ============================================================
     BESTILLINGEN — én kategori ad gangen
     ------------------------------------------------------------
     Listen var sytten rækker høj, før man nåede navnet. Nu: en bar med
     kategorierne øverst, og listen viser enten alle kategorier som fliser
     (intet valgt) eller kun den valgte med dens retter. Baren TRYKKER på
     rækkerne — bestil.js åbner og lukker, som den altid har gjort.
     ============================================================ */
  /* ⚠️ [data-liste] sættes af bestil.js, først når dataen er landet —
     derfor venter vi på den i stedet for at lede én gang. */
  (function () {
    var panel = document.querySelector('#bestil .panel');
    if (!panel) return;
    if (panel.querySelector('[data-liste]')) return kategorier(panel);
    var vagt = new MutationObserver(function () {
      if (!panel.querySelector('[data-liste]')) return;
      vagt.disconnect();
      kategorier(panel);
    });
    vagt.observe(panel, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-liste'] });
  })();
  function kategorier(panel) {
    var liste = panel.querySelector('[data-liste]');
    var bar = lav('div', 'ny-katbar');
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'Kategorier');
    var mærkat = liste.querySelector(':scope > label');
    liste.insertBefore(bar, mærkat ? mærkat.nextSibling : liste.firstChild);
    var isFokus = false;
    var isFlise = lav('button', 'ny-isflise');
    isFlise.type = 'button';
    isFlise.innerHTML = '<span class="kat-tegn" aria-hidden="true">🍦</span><h4>Is &amp; sødt</h4><span class="add">Byg din is</span>';
    isFlise.addEventListener('click', function () { vælg('is'); });

    function rækker() { return [].slice.call(liste.querySelectorAll(':scope > .item[data-kategori]')); }
    function åben(r) { var a = r.querySelector('[data-add]'); return !!a && /^–/.test(a.textContent.trim()); }
    function række(navn) { return rækker().filter(function (r) { return r.getAttribute('data-kategori') === navn; })[0]; }
    function lukAlle(undtagen) {
      for (var n = 0; n < 20; n++) {
        var å = rækker().filter(function (r) { return åben(r) && r.getAttribute('data-kategori') !== undtagen; })[0];
        if (!å) return;
        å.click();
      }
    }
    function vælg(navn) {
      if (navn === 'is') { lukAlle(null); isFokus = true; }
      else if (!navn) { lukAlle(null); isFokus = false; }
      else {
        isFokus = false;
        lukAlle(navn);
        var r = række(navn);
        if (r && !åben(r)) r.click();
      }
      opdater();
      rulTil(bar, 6);
    }
    function opdater() {
      var is = liste.querySelector(':scope > .isbyg-blok');
      if (is && isFlise.nextSibling !== is) liste.insertBefore(isFlise, is);
      if (!is && isFlise.parentNode) isFlise.parentNode.removeChild(isFlise);
      var valgt = null;
      rækker().forEach(function (r) {
        var å = åben(r);
        r.classList.toggle('ny-aaben', å);
        if (å) valgt = r.getAttribute('data-kategori');
      });
      if (valgt) isFokus = false;
      var isVist = isFokus && !!is;
      liste.classList.toggle('ny-fokus', !!valgt);
      liste.classList.toggle('ny-isfokus', isVist);
      liste.classList.toggle('ny-oversigt', !valgt && !isVist);

      /* baren: "Alle" + kategorierne i listens egen rækkefølge, isen på sin plads.
         Den tegnes kun om, når der er sket noget, den viser. */
      var spor = [valgt, isVist].concat([].map.call(liste.querySelectorAll(':scope > .item[data-kategori], :scope > .ny-isflise'), function (el) {
        var t = el.querySelector('[data-kat-valgt]');
        return (el.getAttribute('data-kategori') || 'is') + ':' + (t && !t.classList.contains('skjul') ? t.textContent : '');
      })).join('|');
      if (spor === bar.getAttribute('data-spor')) return;
      bar.setAttribute('data-spor', spor);
      bar.textContent = '';
      function chip(navn, tegn, tal, på, nøgle) {
        var k = lav('button', 'ny-katchip' + (på ? ' on' : ''));
        k.type = 'button';
        k.setAttribute('role', 'tab');
        k.setAttribute('aria-selected', på ? 'true' : 'false');
        if (tegn) k.appendChild(lav('span', 'ny-katchip-tegn', tegn)).setAttribute('aria-hidden', 'true');
        k.appendChild(lav('span', null, navn));
        if (tal) k.appendChild(lav('b', null, tal));
        k.addEventListener('click', function () { vælg(nøgle); });
        bar.appendChild(k);
        return k;
      }
      var på = chip('Alle', null, '', !valgt && !isVist, null);
      [].forEach.call(liste.children, function (el) {
        if (el === isFlise) { var k = chip('Is & sødt', '🍦', '', isVist, 'is'); if (isVist) på = k; return; }
        if (!el.matches || !el.matches('.item[data-kategori]')) return;
        var navn = el.getAttribute('data-kategori');
        var tegn = el.querySelector('.kat-tegn');
        var tal = el.querySelector('[data-kat-valgt]');
        var talTekst = tal && !tal.classList.contains('skjul') ? tal.textContent.replace(/\D+/g, '') : '';
        var c = chip(navn, tegn ? tegn.textContent : null, talTekst, navn === valgt, navn);
        if (navn === valgt) på = c;
      });
      var r = bar.getBoundingClientRect(), v = på.getBoundingClientRect();
      if (v.left < r.left || v.right > r.right) bar.scrollLeft += v.left - r.left - 16;
    }
    var ramme = 0;
    /* ⚠️ baren står selv i listen — dens egne ændringer må ikke vække den igen */
    new MutationObserver(function (poster) {
      var andet = poster.some(function (m) { return m.target !== bar && !bar.contains(m.target); });
      if (!andet) return;
      cancelAnimationFrame(ramme); ramme = requestAnimationFrame(opdater);
    }).observe(liste, { childList: true, subtree: true, characterData: true });
    opdater();
  }

  /* ============================================================
     BESTILLINGEN — beskeden foldes ind, til man vil skrive en
     ============================================================ */
  (function () {
    var besked = document.getElementById('besked');
    var felt = besked && besked.closest('.field');
    if (!felt) return;
    var knap = lav('button', 'ny-beskedknap', '+ Skriv en besked til køkkenet');
    knap.type = 'button';
    felt.parentNode.insertBefore(knap, felt);
    function vis(ja) { felt.classList.toggle('ny-foldet', !ja); knap.hidden = !!ja; }
    knap.addEventListener('click', function () { vis(true); besked.focus(); });
    vis(!!besked.value);
    besked.addEventListener('input', function () { if (besked.value) vis(true); });
  })();
})();
