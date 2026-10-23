/* Mosede /ny/: det, prøven skal bruge ud over forsidens egne scripts.
   Siden ligger én mappe nede, men alle adresser regnes fra roden
   (<base href="../"> i head) — så billeder, scripts og menukortet virker
   uden at én fil er kopieret.

   ⚠️ BESTILLINGENS MOTOR ER URØRT. js/skal/bestil.js ejer kurven, datoen,
   tiden og reglerne. Alt her er et lag ovenpå: ugens knapper sætter den samme
   <select> og sender den samme "change", og søgningen og harmonikaen trykker
   på de samme rækker, en gæst ville trykke på. Intet her bestemmer, hvad der kan
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
    var ab = document.getElementById('nyAfsnitbar');
    var abH = ab && getComputedStyle(ab).display !== 'none' ? ab.offsetHeight : 0;
    var y = el.getBoundingClientRect().top + scrollY - (bar ? bar.offsetHeight : 0) - abH - (luft || 8);
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

  /* AFSNITSBJÆLKEN: hvor er jeg? Det afsnit, der står midt på skærmen,
     lyser i bjælken (og i topbjælkens genveje på en computer), og bjælken
     ruller selv, så det aktive navn kan ses. */
  (function () {
    var bar = document.getElementById('nyAfsnitbar');
    var links = [].slice.call(document.querySelectorAll('#nyAfsnitbar a, .ny-nav a'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    var aktiv = null;
    function sæt(id) {
      if (id === aktiv) return;
      aktiv = id;
      links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + id); });
      var på = bar && bar.querySelector('a.on');
      if (på && bar.scrollWidth > bar.clientWidth) {
        var r = bar.getBoundingClientRect(), v = på.getBoundingClientRect();
        bar.scrollTo({ left: bar.scrollLeft + v.left - r.left - (r.width - v.width) / 2, behavior: roligt() ? 'auto' : 'smooth' });
      }
    }
    var ids = [];
    links.forEach(function (a) { var id = a.getAttribute('href').slice(1); if (id && ids.indexOf(id) === -1) ids.push(id); });
    var io = new IntersectionObserver(function (poster) {
      poster.forEach(function (p) { if (p.isIntersecting) sæt(p.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  })();

  /* ⚠️ SVG'ens egne #-henvisninger (kransens ringtekst og ankre) ville
     ellers pege på roden og ikke på den side, de står i. */
  document.querySelectorAll('svg [href^="#"]').forEach(function (el) {
    el.setAttribute('href', her() + el.getAttribute('href'));
  });

  /* VEJVISERENS SKILTE KOMMER FREM ÉT AD GANGEN (23/10). Mikkel: "den nederste pæl med de seks ting —
     når man scroller ned, kommer de frem 1 by 1, og scroll op er de væk 1 by 1". Hvert skilt har sin
     egen vagt: det foldes ud fra pælen, når det kommer ind i billedet, og går ind igen, når man ruller
     op forbi det (kun når det ligger UNDER skærmen — skilte, man har læst, bliver stående). Uden
     IntersectionObserver eller med "reducér bevægelse" står de bare fremme. */
  (function () {
    var ul = document.querySelector('.ny-vejviser');
    if (!ul || !('IntersectionObserver' in window) || roligt()) return;
    ul.classList.add('ny-skilt-anim');
    var io = new IntersectionObserver(function (poster) {
      poster.forEach(function (p) {
        if (p.isIntersecting) p.target.classList.add('ude');
        else if (p.boundingClientRect.top > 0) p.target.classList.remove('ude');
      });
    }, { rootMargin: '0px 0px -14% 0px', threshold: 0.35 });
    ul.querySelectorAll(':scope > li').forEach(function (li) { io.observe(li); });
  })();

  /* Find os: det rigtige Google-kort kommer først, når gæsten trykker. Persondatapolitikken
     lover, at intet hentes fra Google af sig selv, og Google sætter cookies — så trykket ER
     samtykket, og det huskes IKKE: næste besøg starter forfra uden Google. */
  (function () {
    var boks = document.querySelector('[data-ny-kort]');
    if (!boks) return;
    var URL_ = 'https://maps.google.com/maps?q=' + encodeURIComponent('Mosede Havnecafe, Havnevej 20I, 2670 Greve') + '&z=15&hl=da&output=embed';
    function vis() {
      var f = document.createElement('iframe');
      f.src = URL_;
      f.title = 'Kort: Mosede Havnecafe, Havnevej 20I, 2670 Greve';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.setAttribute('allowfullscreen', '');
      boks.innerHTML = '';
      boks.appendChild(f);
      boks.classList.add('vist');
    }
    var knap = boks.querySelector('.ny-kort-vis');
    if (knap) knap.addEventListener('click', function () {
      vis();
    });
  })();

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
     kant og retten på papiret.
     ⚠️ KUN DAGE MED EN RET (23/10). Mikkel: *"der skal ikke stå henter
     dagens retter, hvis der ikke er nogen"*. En dag uden ret er ikke en
     nyhed; er der ingen retter i hele ugen, findes afsnittet ikke — heller
     ikke i bjælken. Afsnittet står skjult i HTML'en, til dataen siger andet,
     så der aldrig står "Henter …". */
  function tegnUge(d) {
    var række = document.getElementById('nyUge');
    var prikker = document.getElementById('nyUgePrik');
    var afsnit = document.getElementById('dagens');
    if (!række || !window.Butik || !Butik.nu || !R.ugedagFor) return;
    var iDag = Butik.nu().dato;
    var husk = række.scrollLeft;
    var dage = [];
    for (var n = 0; n < 7; n++) {
      var dg = dagenI(d, Butik.isoPlus(iDag, n));
      dg.nr = n;
      if (dg.retter.length) dage.push(dg);
    }
    række.textContent = '';
    if (prikker) prikker.textContent = '';
    var nogen = dage.length > 0;
    if (afsnit) afsnit.hidden = !nogen;
    document.querySelectorAll('a[href="#dagens"]').forEach(function (a) { a.hidden = !nogen; });
    if (!nogen) return;
    var linje = document.querySelector('#dagens .nk-afsnit-linje');
    if (linje) linje.textContent = dage.length > 1 ? 'En ret fra køkkenet hver dag — swipe og se de næste.' : 'En ret fra køkkenet hver dag.';
    if (prikker) prikker.hidden = dage.length < 2;
    var pile = document.querySelector('#dagens .ny-uge-pile');
    if (pile) pile.hidden = dage.length < 3;
    dage.forEach(function (dag, plads) {
      var i = dag.nr, iso = dag.iso, ret = dag.retter[0];
      var kort = lav('article', 'nk-dag' + (i === 0 ? ' er-idag' : '') + (ret.udsolgt ? ' er-udsolgt' : ''));
      var hoved = lav('header', 'nk-dag-hoved');
      hoved.appendChild(lav('b', null, i === 0 ? 'I dag' : i === 1 ? 'I morgen' : ugedag(iso)));
      hoved.appendChild(lav('span', null, (i < 2 ? ugedag(iso) + ' · ' : '') + kortDato(iso)));
      kort.appendChild(hoved);
      kort.appendChild(lav('div', 'nk-dag-kant'));
      var krop = lav('div', 'nk-dag-krop');
      {
        krop.appendChild(lav('h3', null, ret.navn));
        var linjer = [];
        if (ret.beskrivelse) linjer.push(ret.beskrivelse);
        dag.retter.slice(1).forEach(function (r) { linjer.push('Eller: ' + r.navn); });
        if (linjer.length) krop.appendChild(lav('p', 'nk-kursiv', linjer.join(' ')));
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
      if (prikker) prikker.appendChild(lav('i', plads === 0 ? 'on' : ''));
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
    liste.removeAttribute('aria-busy');
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

  /* ============================================================
     MENUKORTETS KAPITLER — fra databasen, med husets fotos
     ------------------------------------------------------------
     Kategorierne i ejerens egen rækkefølge, kun dem med mindst én
     aktiv vare, og antallet af retter. Hver peger ind på sin plads i
     menukortet (#kat-ID, som js/skal/menukort.js sætter). Findes
     pladsen ikke, lander man øverst på kortet — aldrig på en fejl.
     ============================================================ */
  /* "PÅ KORTET" ER CHEFENS KORT (23/10). Mikkel: "rækkefølgen på kortene skal give mening og være
     rigtig efter chefens ønske". Her stod databasens 19 kategorier i deres egen sortering ("Retter",
     "Tilkøb", "Sandwich 1 ret" …). Nu står menukortets otte kapitler — de trykte kort fra chefens
     korrektur 7/10 (js/skal/menukort-kort.js, KAPITLER) — i samme rækkefølge, og hvert link lander på
     sit kapitel (#kapitel-<id>, som menukort.js sætter). Antallet af retter tælles ikke: et kapitel
     samler flere kategorier, og et forkert tal er værre end intet. */
  var KORT_KAPITLER = [
    { id: 'grillen', navn: 'Morgenmad & frokost', foto: 'billeder/havn-morgenmad.jpg' },
    { id: 'burgere', navn: 'À la carte, burgere & pølser', foto: 'billeder/havn-burgere.jpg' },
    { id: 'smoerrebroed', navn: 'Smørrebrød', foto: 'billeder/smoer-bakke.jpg' },
    { id: 'haandmadder', navn: 'Håndmadder', foto: 'billeder/smoer-havn.jpg' },
    { id: 'is', navn: 'Is & sødt', foto: 'billeder/havn-kugleis.jpg', anker: 'afsnit-is' },
    { id: 'kaffe', navn: 'Kaffe, koldt & knas', foto: 'billeder/havn-kaffe.jpg' },
    { id: 'bar', navn: 'Øl, vin & bar', foto: 'billeder/havn-oel.jpg' },
    { id: 'selskab', navn: 'Til selskabet', foto: 'billeder/havn-platter.jpg' }
  ];
  function tegnKapitler() {
    var liste = document.getElementById('nyKapitler');
    if (!liste) return;
    liste.textContent = '';
    liste.removeAttribute('aria-busy');
    KORT_KAPITLER.forEach(function (x) {
      var li = lav('li', '');
      var a = lav('a', 'nk-kapitel');
      a.setAttribute('href', 'm-menukort.html#' + (x.anker || ('kapitel-' + x.id)));
      var f = lav('span', 'nk-kapitel-foto');
      f.setAttribute('aria-hidden', 'true');
      f.style.backgroundImage = 'url("' + x.foto + '")';
      a.appendChild(f);
      a.appendChild(lav('span', 'nk-kapitel-navn', x.navn));
      a.appendChild(lav('span', 'nk-kapitel-tal', 'Se kortet →'));
      li.appendChild(a);
      liste.appendChild(li);
    });
  }

  /* ============================================================
     VORES IS — hele sortimentet, som ejeren har det i menukortet
     ------------------------------------------------------------
     Mikkel: *"den skal hedde Vores is — man skal kunne se alle deres
     gode kendte is"*. Én fane pr. is-kategori (afdeling "is", aktiv,
     med mindst én vare med pris), og i fanen hver vare med pris og
     ejerens egen beskrivelse. Smagene er indstillingen is_smage
     (Butik.isSmage) — den samme, bestillingen spørger. Slukkede varer
     og varer uden pris står ikke (ispindene er slukket i dag).
     ============================================================ */
  function tegnIs(d) {
    var liste = document.getElementById('nyIsAlt');
    var faner = document.getElementById('nyIsFaner');
    var smage = document.getElementById('nyIsSmage');
    if (!liste) return;
    var varer = d.menu_varer || [];
    var kat = (d.menu_kategorier || []).filter(function (k) { return k.afdeling === 'is' && k.aktiv !== false; })
      .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); })
      .map(function (k) {
        return { k: k, v: varer.filter(function (v) {
          return v.kategori_id === k.id && v.aktiv !== false && v.pris !== null && v.pris !== undefined && v.pris !== '';
        }).sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0) || a.id - b.id; }) };
      })
      .filter(function (x) { return x.v.length; });
    liste.removeAttribute('aria-busy');
    if (smage && Butik.isSmage) {
      var s = Butik.isSmage(d);
      smage.textContent = '';
      if (s.length) {
        smage.appendChild(lav('b', null, 'Smagene ved lugen'));
        s.forEach(function (n) { smage.appendChild(lav('span', null, n)); });
      }
      smage.hidden = !s.length;
    }
    if (!kat.length) { liste.hidden = true; if (faner) faner.hidden = true; return; }
    function vis(nr) {
      liste.textContent = '';
      kat[nr].v.forEach(function (v) {
        var li = lav('li');
        var top = lav('div', 'nk-is-linje');
        top.appendChild(lav('span', 'nk-navn', v.navn));
        top.appendChild(lav('i', 'nk-prik'));
        top.appendChild(lav('span', 'nk-pris', Butik.varePris ? Butik.varePris(v.pris) : Butik.kroner(v.pris)));
        li.appendChild(top);
        if (v.beskrivelse) li.appendChild(lav('small', 'nk-kursiv', v.beskrivelse));
        if (v.udsolgt) li.classList.add('er-udsolgt');
        liste.appendChild(li);
      });
      if (faner) [].forEach.call(faner.children, function (f, i) {
        f.classList.toggle('on', i === nr);
        f.setAttribute('aria-selected', i === nr ? 'true' : 'false');
      });
    }
    if (faner) {
      faner.textContent = '';
      kat.forEach(function (x, i) {
        var f = lav('button', 'nk-is-fane');
        f.type = 'button';
        f.setAttribute('role', 'tab');
        f.appendChild(lav('span', null, x.k.navn));
        f.appendChild(lav('small', null, String(x.v.length)));
        f.addEventListener('click', function () { vis(i); });
        faner.appendChild(f);
      });
      faner.hidden = kat.length < 2;
    }
    vis(0);
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

  setTimeout(function () {
    ['nySmoerListe', 'nyKapitler', 'nyIsAlt'].forEach(function (id) {
      var l = document.getElementById(id);
      if (l && l.getAttribute('aria-busy') === 'true') l.hidden = true;
    });
  }, 9000);

  function tegnAlt(d) {
    if (!d || !window.Butik) return;
    try { tegnUge(d); } catch (e) { console.error(e); }
    try { tegnSmoer(d); } catch (e) { console.error(e); }
    try { tegnKapitler(d); } catch (e) { console.error(e); }
    try { tegnIs(d); } catch (e) { console.error(e); }
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
     BESTILLINGEN — tidspunktets overskrift følger måden
     ------------------------------------------------------------
     Dag og tid er rullelisterne igen (Mikkel: *"som før, så når man
     trykker, folder de ned"*). Vælger gæsten levering, spørger
     overskriften om, hvornår maden skal være der — ikke hvornår hun
     henter den.
     ============================================================ */
  (function () {
    var seg = document.querySelector('#bestil [data-seg="how"]');
    var tid = document.getElementById('tid');
    var mærkat = tid && tid.closest('.field') ? tid.closest('.field').querySelector('label') : null;
    if (!seg || !mærkat) return;
    function sæt() {
      var på = seg.querySelector('button.on');
      var t = på ? på.textContent.trim() : '';
      mærkat.textContent = t === 'Levering' ? 'Hvornår skal maden være der?' : t === 'Spis her' ? 'Hvornår vil I spise?' : 'Hvornår henter I?';
    }
    seg.addEventListener('click', function () { setTimeout(sæt, 0); });
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-vaelg-levering]')) setTimeout(sæt, 60); });
    sæt();
  })();

  /* ============================================================
     BESTILLINGEN — den originale liste, med husets fotos
     ------------------------------------------------------------
     Mikkels ord: *"selve bestil mad konceptet skal være det originale
     gamle men med nye design og smartere"*. Kategorierne folder sig ud
     på stedet, som de altid har gjort (bestil.js); det, der kommer til,
     er fotoet på rækken og knapperne "Bestil smørrebrød" o.l., der åbner
     den rigtige kategori og ruller hen til den.
     ============================================================ */
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
    if (!FOTOS) return null;   /* kan spørges, før listen nedenfor er sat */
    var n = String(navn || '').toLowerCase().trim();
    for (var i = 0; i < FOTOS.length; i++) if (FOTOS[i][0].test(n)) return FOTOS[i][1];
    return null;
  }

  var vælgKategori = null;
  /* ⚠️ [data-liste] sættes af bestil.js, først når dataen er landet */
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
    function rækker() { return [].slice.call(liste.querySelectorAll(':scope > .item[data-kategori]')); }
    function åben(r) { var a = r.querySelector('[data-add]'); return !!a && /^–/.test(a.textContent.trim()); }
    function række(navn) { return rækker().filter(function (x) { return x.getAttribute('data-kategori').toLowerCase() === String(navn).toLowerCase(); })[0]; }
    var selv = false;   /* vores egne tryk må ikke udløse harmonikaen */
    function tryk(r) { selv = true; try { r.click(); } finally { selv = false; } }

    /* ---------- SØG: hele menuen på én gang ----------
       Reglen er husets egen (Butik.soegPasser: æ/ø/å foldet og én
       tastefejl tilgivet) — den samme, menukortet søger med. Mens der
       søges, er alle kategorier foldet ud og kun de retter, der passer,
       vises; tømmes feltet, lukkes de, der var lukkede før. */
    var søgFelt = lav('div', 'ny-soeg');
    søgFelt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    var søg = lav('input', 'inp');
    søg.type = 'search';
    søg.placeholder = 'Søg i menuen — fx rejer, burger, softice';
    søg.setAttribute('aria-label', 'Søg i menuen');
    søg.setAttribute('enterkeyhint', 'search');
    søgFelt.appendChild(søg);
    var ryd = lav('button', 'ny-soeg-ryd', '×');
    ryd.type = 'button';
    ryd.setAttribute('aria-label', 'Ryd søgningen');
    søgFelt.appendChild(ryd);
    var mærkat = liste.querySelector(':scope > label');
    liste.insertBefore(søgFelt, mærkat ? mærkat.nextSibling : liste.firstChild);
    var ingen = lav('p', 'ny-soeg-ingen');
    ingen.hidden = true;
    liste.appendChild(ingen);

    var q = '', varÅbne = null;
    function passer(el) { return window.Butik && Butik.soegPasser ? Butik.soegPasser(el.textContent, q) : el.textContent.toLowerCase().indexOf(q.toLowerCase()) !== -1; }
    function filtrer() {
      var søger = q.length >= 2;
      liste.classList.toggle('ny-soeger', søger);
      var fundet = 0;
      [].forEach.call(liste.children, function (el) {
        el.classList.remove('ny-match');
        if (!søger || el === søgFelt || el === ingen || el.tagName === 'LABEL') return;
        if (el.matches('.item[data-kategori], .venter-note')) return;
        var ja = passer(el);
        if (el.classList.contains('isbyg-blok')) ja = ja || Butik.soegPasser('is softice vaffel kugle bæger isboks dessert pandekage churros sødt', q);
        if (ja) { el.classList.add('ny-match'); fundet++; }
      });
      ingen.hidden = !søger || fundet > 0;
      ingen.textContent = 'Intet på menuen hedder "' + q + '". Prøv et andet ord — eller ring til os.';
      if (ingen.parentNode !== liste || liste.lastElementChild !== ingen) liste.appendChild(ingen);
    }
    function nySøgning() {
      var før = q.length >= 2;
      q = søg.value.trim();
      var nu = q.length >= 2;
      ryd.hidden = !søg.value;
      if (nu && !før) {
        varÅbne = rækker().filter(åben).map(function (r) { return r.getAttribute('data-kategori'); });
        rækker().map(function (r) { return r.getAttribute('data-kategori'); }).forEach(function (navn) {
          var r = række(navn);
          if (r && !åben(r)) tryk(r);
        });
      } else if (!nu && før && varÅbne) {
        rækker().map(function (r) { return r.getAttribute('data-kategori'); }).forEach(function (navn) {
          var r = række(navn);
          if (r && åben(r) && varÅbne.indexOf(navn) === -1) tryk(r);
        });
        varÅbne = null;
      }
      filtrer();
    }
    var vent;
    søg.addEventListener('input', function () { clearTimeout(vent); vent = setTimeout(nySøgning, 180); });
    søg.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); søg.blur(); } });
    ryd.hidden = true;
    ryd.addEventListener('click', function () { søg.value = ''; nySøgning(); søg.focus(); });

    /* ---------- HARMONIKA: én kategori åben ad gangen ----------
       På en telefon blev listen meterlang, når tre kategorier stod åbne.
       Åbner gæsten en, lukker de andre — det, der er lagt i kurven,
       bliver liggende og står som "N valgt" på rækken — og siden ruller,
       så den åbne kategori står øverst. */
    liste.addEventListener('click', function (e) {
      if (selv || q.length >= 2) return;
      var r = e.target.closest && e.target.closest('.item[data-kategori]');
      /* ⚠️ bestil.js har allerede tegnet listen om, når trykket når hertil —
         rækken er taget ud af DOM'en, så vi spørger om navnet, ikke om forælderen */
      if (!r) return;
      var navn = r.getAttribute('data-kategori');
      setTimeout(function () {
        var nu = række(navn);
        if (!nu || !åben(nu)) return;
        rækker().filter(function (x) { return åben(x) && x.getAttribute('data-kategori') !== navn; }).forEach(function (x) {
          var y = række(x.getAttribute('data-kategori'));
          if (y && åben(y)) tryk(y);
        });
        rulTil(række(navn), 12);
      }, 0);
    });

    function fotos() {
      rækker().forEach(function (r) {
        r.classList.toggle('ny-aaben', åben(r));
        var foto = fotoFor(r.getAttribute('data-kategori'));
        if (!foto || r.querySelector(':scope > .ny-katfoto')) return;
        var f = lav('span', 'ny-katfoto');
        f.setAttribute('aria-hidden', 'true');
        f.style.backgroundImage = 'url("' + foto + '")';
        r.insertBefore(f, r.firstChild);
        r.classList.add('har-foto');
      });
      var is = liste.querySelector(':scope > .isbyg-blok');
      if (is && !is.classList.contains('har-foto')) {
        is.classList.add('har-foto');
        var hoved = is.querySelector('.isbyg-blok-hoved');
        var f2 = lav('span', 'ny-katfoto ny-katfoto--is');
        f2.setAttribute('aria-hidden', 'true');
        f2.style.backgroundImage = 'url("billeder/havn-kugleis.jpg")';
        if (hoved) hoved.insertBefore(f2, hoved.firstChild);
      }
      if (q.length >= 2) filtrer();
    }
    var ramme = 0;
    new MutationObserver(function (poster) {
      var andet = poster.some(function (m) { return !søgFelt.contains(m.target) && m.target !== ingen; });
      if (!andet) return;
      cancelAnimationFrame(ramme); ramme = requestAnimationFrame(fotos);
    }).observe(liste, { childList: true, subtree: true, characterData: true });
    fotos();
    vælgKategori = function (navn) {
      if (søg.value) { søg.value = ''; nySøgning(); }
      var r = række(navn);
      if (r && !åben(r)) {
        tryk(r);
        rækker().filter(function (x) { return åben(x) && x.getAttribute('data-kategori').toLowerCase() !== String(navn).toLowerCase(); })
          .forEach(function (x) { var y = række(x.getAttribute('data-kategori')); if (y && åben(y)) tryk(y); });
      }
      rulTil(række(navn) || panel, 12);
    };
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
