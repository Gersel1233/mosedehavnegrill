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

  /* Kransen fra heroen går igen i de trykte korts hjørne, som på papiret */
  (function () {
    var krans = document.querySelector('.hero-badge svg');
    if (!krans) return;
    document.querySelectorAll('.nk-logo').forEach(function (plads) {
      var kopi = krans.cloneNode(true);
      kopi.removeAttribute('role'); kopi.removeAttribute('aria-label');
      plads.appendChild(kopi);
    });
  })();

  /* "Bestil smørrebrød" o.l.: åbner kategorien i bestillingen og hopper derned */
  var vælgKategori = null;
  document.addEventListener('click', function (ev) {
    var k = ev.target.closest && ev.target.closest('[data-ny-kat]');
    if (!k) return;
    var navn = k.getAttribute('data-ny-kat');
    if (vælgKategori) vælgKategori(navn);
    else rulTil(document.querySelector('#bestil .panel'), 16);
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

  /* Hver dag er et lille trykt menukort: rødt hoved med dagen, den ternede
     kant og retten på papiret. Er der ingen retter lagt op i hele ugen, står
     der ét kort, der siger det — ikke syv ens "kommer snart". */
  function tegnUge(d) {
    var række = document.getElementById('nyUge');
    var prikker = document.getElementById('nyUgePrik');
    if (!række || !window.Butik || !Butik.nu || !R.ugedagFor) return;
    var iDag = Butik.nu().dato;
    var husk = række.scrollLeft;
    var dage = [];
    for (var n = 0; n < 7; n++) dage.push(dagenI(d, Butik.isoPlus(iDag, n)));
    række.textContent = '';
    if (prikker) prikker.textContent = '';
    var nogen = dage.some(function (x) { return x.retter.length; });
    række.classList.toggle('er-tom', !nogen);
    var linje = document.querySelector('#dagens .nk-afsnit-linje');
    if (linje) linje.textContent = nogen ? 'En ret fra køkkenet hver dag — swipe og se ugen.' : 'En ret fra køkkenet hver dag.';
    if (!nogen) {
      var tom = lav('article', 'nk-dag nk-dag--tom');
      var th = lav('header', 'nk-dag-hoved');
      th.appendChild(lav('b', null, 'Ugens retter'));
      tom.appendChild(th);
      tom.appendChild(lav('div', 'nk-dag-kant'));
      var tk = lav('div', 'nk-dag-krop');
      tk.appendChild(lav('h3', null, 'Køkkenet har ikke skrevet ugens retter endnu'));
      tk.appendChild(lav('p', 'nk-kursiv', 'De står her, så snart de er lagt op. Indtil da: smørrebrødet og hele menukortet.'));
      var mk = lav('a', 'nk-knap nk-knap--lys', 'Se hele menukortet →');
      mk.setAttribute('href', 'm-menukort.html');
      tk.appendChild(mk);
      tom.appendChild(tk);
      række.appendChild(tom);
      return;
    }
    dage.forEach(function (dag, i) {
      var iso = dag.iso, ret = dag.retter[0];
      var kort = lav('article', 'nk-dag' + (i === 0 ? ' er-idag' : '') + (dag.lukket ? ' er-lukket' : '') + (!ret ? ' er-tom' : ''));
      var hoved = lav('header', 'nk-dag-hoved');
      hoved.appendChild(lav('b', null, i === 0 ? 'I dag' : i === 1 ? 'I morgen' : ugedag(iso)));
      hoved.appendChild(lav('span', null, (i < 2 ? ugedag(iso) + ' · ' : '') + kortDato(iso)));
      kort.appendChild(hoved);
      kort.appendChild(lav('div', 'nk-dag-kant'));
      var krop = lav('div', 'nk-dag-krop');
      if (ret) {
        krop.appendChild(lav('h3', null, ret.navn));
        var linjer = [];
        if (ret.beskrivelse) linjer.push(ret.beskrivelse);
        dag.retter.slice(1).forEach(function (r) { linjer.push('Eller: ' + r.navn); });
        if (linjer.length) krop.appendChild(lav('p', 'nk-kursiv', linjer.join(' ')));
      } else if (dag.lukket) {
        krop.appendChild(lav('h3', null, 'Lukket'));
        krop.appendChild(lav('p', 'nk-kursiv', 'Vi holder lukket den dag.'));
      } else if (dag.ingen) {
        krop.appendChild(lav('h3', null, 'Ingen dagens ret'));
        krop.appendChild(lav('p', 'nk-kursiv', 'Vælg frit fra menukortet.'));
      } else {
        krop.appendChild(lav('h3', null, 'Kommer snart'));
        krop.appendChild(lav('p', 'nk-kursiv', 'Retten skrives her, når køkkenet har lagt den op.'));
      }
      var fod = lav('div', 'nk-dag-fod');
      if (ret && ret.pris !== null && ret.pris !== undefined) fod.appendChild(lav('span', 'nk-pris', Butik.kroner(ret.pris)));
      if (ret && ret.udsolgt) fod.appendChild(lav('span', 'nk-maerke er-udsolgt', 'Udsolgt'));
      else if (ret && typeof ret.antal_tilbage === 'number') fod.appendChild(lav('span', 'nk-maerke', ret.antal_tilbage + ' tilbage'));
      if (ret && !ret.udsolgt && kanVælges(iso)) {
        var knap = lav('button', 'nk-knap nk-knap--lille', 'Bestil');
        knap.type = 'button';
        knap.setAttribute('aria-label', 'Bestil ' + ret.navn + ' til ' + ugedag(iso).toLowerCase());
        knap.addEventListener('click', vælgDato.bind(null, iso));
        fod.appendChild(knap);
      }
      if (dag.plan) {
        var tid = lav('p', 'nk-dag-tid', 'Åbent ' + kl(dag.plan.aabner) + '–' + kl(dag.plan.lukker));
        krop.appendChild(tid);
      }
      if (fod.children.length) krop.appendChild(fod);
      kort.appendChild(krop);
      række.appendChild(kort);
      if (prikker) prikker.appendChild(lav('i', i === 0 ? 'on' : ''));
    });
    række.scrollLeft = husk;
    prikPå();
  }

  /* ============================================================
     SMØRREBRØDET — listen og priserne fra menukortet i databasen
     ------------------------------------------------------------
     Som på det trykte kort: varianterne som en liste, og priserne i
     bokse. "Alle varianter" er den pris, de fleste står til; en
     variant med sin egen, højere pris (rejemad, tartar) får sin egen
     boks. Intet tal står i HTML'en.
     ============================================================ */
  function aktive(d, kat) {
    return (d.menu_varer || []).filter(function (v) { return v.kategori_id === kat.id && v.aktiv !== false; })
      .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0) || a.id - b.id; });
  }
  function tegnSmoer(d) {
    var liste = document.getElementById('nySmoerListe');
    var bokse = document.getElementById('nySmoerBokse');
    var flere = document.getElementById('nySmoerFlere');
    if (!liste) return;
    var kats = (d.menu_kategorier || []).filter(function (k) { return k.aktiv !== false; });
    var smoer = kats.filter(function (k) { return /^smørrebrød$/i.test(String(k.navn).trim()); })[0];
    var hånd = kats.filter(function (k) { return /^håndmad/i.test(String(k.navn).trim()); })[0];
    var varer = smoer ? aktive(d, smoer) : [];
    if (!varer.length) { var afs = document.getElementById('smoerrebroed'); if (afs) afs.hidden = true; return; }
    var tæl = {};
    varer.forEach(function (v) { if (v.pris != null) tæl[v.pris] = (tæl[v.pris] || 0) + 1; });
    var basis = Object.keys(tæl).sort(function (a, b) { return tæl[b] - tæl[a]; })[0];
    basis = basis === undefined ? null : Number(basis);
    var egne = varer.filter(function (v) { return v.pris != null && basis != null && v.pris >= basis + 25; }).slice(0, 2);
    liste.textContent = '';
    varer.filter(function (v) { return egne.indexOf(v) === -1; }).forEach(function (v, i) {
      var li = lav('li', i >= 10 ? 'nk-skjult' : '');
      li.appendChild(lav('span', 'nk-navn', v.navn));
      if (v.pris != null && v.pris !== basis) {
        li.appendChild(lav('i', 'nk-prik'));
        li.appendChild(lav('span', 'nk-pris nk-pris--lille', Butik.kroner(v.pris)));
      }
      if (v.beskrivelse && v.pris === basis) li.appendChild(lav('small', 'nk-kursiv', v.beskrivelse));
      liste.appendChild(li);
    });
    var skjulte = liste.querySelectorAll('.nk-skjult').length;
    if (flere) {
      flere.hidden = !skjulte;
      flere.textContent = 'Se alle ' + liste.children.length + ' varianter';
      flere.onclick = function () { liste.classList.add('vis-alle'); flere.hidden = true; };
    }
    if (bokse) {
      bokse.textContent = '';
      var boks = function (over, navn, pris, under) {
        var b = lav('div', 'nk-boks');
        b.appendChild(lav('small', null, over));
        b.appendChild(lav('b', null, navn));
        if (pris) b.appendChild(lav('span', 'nk-pris', pris));
        if (under) b.appendChild(lav('p', 'nk-kursiv', under));
        bokse.appendChild(b);
      };
      if (basis != null) boks('Smørrebrød', 'Alle varianter', Butik.kroner(basis), 'Gælder alle almindelige smørrebrød på listen.');
      egne.forEach(function (v) { boks('Egen pris', v.navn, Butik.kroner(v.pris), v.beskrivelse || ''); });
      var hv = hånd ? aktive(d, hånd).filter(function (v) { return v.pris != null; }) : [];
      if (hv.length) {
        var min = Math.min.apply(null, hv.map(function (v) { return v.pris; }));
        boks('Den lille', 'Håndmadder', 'fra ' + Butik.kroner(min), hv.length + ' slags at vælge imellem.');
      }
    }
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
    try { tegnSmoer(d); } catch (e) { console.error(e); }
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
  /* Kategoriernes fotos — husets egne, de samme som menukortet viser.
     ⚠️ En kopi af FOTOS i js/skal/menukort.js (den er lukket inde i sin fil).
     Går /ny/ live, skal de to samles ét sted. Ingen match = intet foto. */
  var FOTOS = [
    [/håndmad/, 'billeder/smoer-havn.jpg'],
    [/fyld/, null],
    [/smørrebrød/, 'billeder/smoer-bakke.jpg'],
    [/fra pladen/, 'billeder/menu-pladen.jpg'],
    [/burger/, 'billeder/havn-burgere.jpg'],
    [/pølse/, 'billeder/havn-poelser.jpg'],
    [/^retter$/, 'billeder/havn-retter.jpg'],
    [/tapas/, 'billeder/tapas-1.jpg'],
    [/platte/, 'billeder/havn-platter.jpg'],
    [/slider/, 'billeder/havn-sliders.jpg'],
    [/kugle|ishorn/, 'billeder/havn-kugleis.jpg'],
    [/softice/, 'billeder/havn-softice.jpg'],
    [/^morgenmad$/, 'billeder/havn-morgenmad.jpg'],
    [/kaffe/, 'billeder/havn-kaffe.jpg'],
    [/^øl$/, 'billeder/havn-oel.jpg'],
    [/^vin\b|cava|champagne/, 'billeder/havn-vin.jpg'],
    [/sodavand/, 'billeder/havn-sodavand.jpg'],
    [/^andre retter$/, 'billeder/menu-andre-retter.jpg'],
    [/^sandwich$/, 'billeder/menu-sandwich.jpg'],
    [/snacks/, 'billeder/menu-snacks.jpg'],
    [/pindemad/, 'billeder/menu-pindemad.jpg'],
  ];
  function fotoFor(navn) {
    var n = String(navn || '').toLowerCase().trim();
    for (var i = 0; i < FOTOS.length; i++) if (FOTOS[i][0].test(n)) return FOTOS[i][1];
    return null;
  }

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
    isFlise.innerHTML = '<span class="ny-katfoto" aria-hidden="true" style="background-image:url(&quot;billeder/havn-kugleis.jpg&quot;)"></span><h4>Is &amp; sødt</h4><span class="add">Byg din is</span>';
    isFlise.classList.add('har-foto');
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
    vælgKategori = function (navn) {
      var r = rækker().filter(function (x) { return x.getAttribute('data-kategori').toLowerCase() === String(navn).toLowerCase(); })[0];
      if (r) vælg(r.getAttribute('data-kategori'));
      else rulTil(panel, 16);
    };
    function opdater() {
      var is = liste.querySelector(':scope > .isbyg-blok');
      if (is && isFlise.nextSibling !== is) liste.insertBefore(isFlise, is);
      if (!is && isFlise.parentNode) isFlise.parentNode.removeChild(isFlise);
      var valgt = null;
      rækker().forEach(function (r) {
        var foto = fotoFor(r.getAttribute('data-kategori'));
        if (foto && !r.querySelector(':scope > .ny-katfoto')) {
          var f = lav('span', 'ny-katfoto');
          f.setAttribute('aria-hidden', 'true');
          f.style.backgroundImage = 'url("' + foto + '")';
          r.insertBefore(f, r.firstChild);
          r.classList.add('har-foto');
        }
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
      function chip(navn, tegn, tal, på, nøgle, foto) {
        var k = lav('button', 'ny-katchip' + (på ? ' on' : ''));
        k.type = 'button';
        k.setAttribute('role', 'tab');
        k.setAttribute('aria-selected', på ? 'true' : 'false');
        if (foto) {
          var fi = lav('span', 'ny-katchip-foto');
          fi.setAttribute('aria-hidden', 'true');
          fi.style.backgroundImage = 'url("' + foto + '")';
          k.appendChild(fi);
        } else if (tegn) k.appendChild(lav('span', 'ny-katchip-tegn', tegn)).setAttribute('aria-hidden', 'true');
        k.appendChild(lav('span', null, navn));
        if (tal) k.appendChild(lav('b', null, tal));
        k.addEventListener('click', function () { vælg(nøgle); });
        bar.appendChild(k);
        return k;
      }
      var på = chip('Alle', null, '', !valgt && !isVist, null);
      [].forEach.call(liste.children, function (el) {
        if (el === isFlise) { var k = chip('Is & sødt', '🍦', '', isVist, 'is', 'billeder/havn-kugleis.jpg'); if (isVist) på = k; return; }
        if (!el.matches || !el.matches('.item[data-kategori]')) return;
        var navn = el.getAttribute('data-kategori');
        var tegn = el.querySelector('.kat-tegn');
        var tal = el.querySelector('[data-kat-valgt]');
        var talTekst = tal && !tal.classList.contains('skjul') ? tal.textContent.replace(/\D+/g, '') : '';
        var c = chip(navn, tegn ? tegn.textContent : null, talTekst, navn === valgt, navn, fotoFor(navn));
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
