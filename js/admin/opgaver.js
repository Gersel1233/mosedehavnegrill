/* ============================================================
   ARBEJDSOPGAVER MED INITIALER  (3/11 · 4/11, supabase/opgaver-3-11.sql)
   ------------------------------------------------------------
   Chefen: lister, de har på en fil, skal lægges ind, så personalet
   hver dag kan sætte initialer ved det, de har gjort. Mikkel 4/11:
   *"så han kan uploade en PDF-fil, og så er vores system dygtigt nok
   til at gøre det til et sæt opgaver, man kan markere med initialer
   — og det skal fremstå flot og pænt og være nemt for kollegaer og
   personale."*

   - CHEFERNE vælger en fil. js/admin/opgave-laeser.js finder titel,
     afsnit og opgaver (og temperatur-kolonner) og springer papirets
     egne felter over. De ser det hele, før det gemmes, og kan rette.
   - PERSONALET ser dagens lister: tryk på opgaven, skriv initialer
     (og temperaturen, hvis den skal måles) → ✓. Klokkeslættet kommer
     af sig selv. Initialerne huskes på iPad'en til næste gang.
   - DAGEN kan printes som et dokument (fx til egenkontrollen).

   ⚠️ INITIALER, IKKE LOGIN: personalet deler booking@, så det er
   initialerne, der siger hvem. Login gemmes også i databasen.
   ============================================================ */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var data = { lister: [], opgaver: [], udfoert: [] };
  var hentet = false;
  var dag = null;            // den viste dag (iso)
  var aaben = null;          // opgaven, der står åben til initialer
  var udkast = null;         // listen, cheferne er ved at lægge ind
  var UGEDAGE = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

  function ejer() { return Admin.rolle !== 'medarbejder' && Admin.rolle !== 'arrangoer'; }
  function iDag() { return Butik.nu().dato; }
  // Én regel ét sted: Butik.isoPlus (js/store.js).
  function plusDag(iso, n) { return Butik.isoPlus(iso, n); }
  function ugedag(iso) { return ((new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7) + 1; } // 1 = man
  function kl(ts) {
    var d = new Date(ts);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Copenhagen' })
      .replace(':', '.');
  }
  function datoFor(ts) {
    var d = new Date(ts);
    return isNaN(d) ? '' : d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Copenhagen' });
  }
  function huskIni(v) { try { if (v) localStorage.setItem('mosede_initialer', v); } catch (e) { /* ingen lagring */ } }
  function sidsteIni() { try { return localStorage.getItem('mosede_initialer') || ''; } catch (e) { return ''; } }
  function knap(klasse, tekst, klik) {
    var b = lav('button', klasse, tekst);
    b.type = 'button';
    if (klik) b.addEventListener('click', klik);
    return b;
  }
  function felt(type, vaerdi, ekstra) {
    var i = document.createElement('input');
    i.type = type;
    if (vaerdi != null) i.value = vaerdi;
    Object.keys(ekstra || {}).forEach(function (k) { i.setAttribute(k, ekstra[k]); });
    return i;
  }
  function bjaelke(gjort, alle) {
    var b = lav('div', 'opg-bjaelke' + (alle && gjort === alle ? ' faerdig' : ''));
    var f = lav('span');
    f.style.width = (alle ? Math.round(gjort / alle * 100) : 0) + '%';
    b.appendChild(f);
    b.setAttribute('role', 'progressbar');
    b.setAttribute('aria-valuemin', '0');
    b.setAttribute('aria-valuemax', String(alle));
    b.setAttribute('aria-valuenow', String(gjort));
    return b;
  }

  function listerFor(iso) {
    var u = ugedag(iso);
    return data.lister.filter(function (l) {
      if (l.aktiv === false) return false;
      if (l.oprettet && datoFor(l.oprettet) > iso) return false;
      return !l.ugedage || !l.ugedage.length || l.ugedage.map(Number).indexOf(u) !== -1;
    }).sort(function (a, b) { return (a.raekkefoelge || 0) - (b.raekkefoelge || 0) || a.id - b.id; });
  }
  function opgaverI(listeId) {
    return data.opgaver.filter(function (o) { return String(o.liste_id) === String(listeId) && o.aktiv !== false; })
      .sort(function (a, b) { return (a.raekkefoelge || 0) - (b.raekkefoelge || 0) || a.id - b.id; });
  }
  // Opgaverne i afsnit, i den rækkefølge de står.
  function afsnitI(listeId) {
    var ud = [];
    opgaverI(listeId).forEach(function (o) {
      var navn = o.afsnit || '';
      var a = ud[ud.length - 1];
      if (!a || a.navn !== navn) { a = { navn: navn, opgaver: [] }; ud.push(a); }
      a.opgaver.push(o);
    });
    return ud;
  }
  function udfoertFor(opgaveId, iso) {
    return data.udfoert.filter(function (u) { return String(u.opgave_id) === String(opgaveId) && u.dato === iso; })[0];
  }
  function tal(iso) {
    var alle = 0, gjort = 0;
    listerFor(iso).forEach(function (l) {
      opgaverI(l.id).forEach(function (o) { alle++; if (udfoertFor(o.id, iso)) gjort++; });
    });
    return { alle: alle, gjort: gjort };
  }

  // ----------------------------------------------------------
  //  HENT
  // ----------------------------------------------------------
  function hent() {
    if (!Butik.hentOpgaver) return Promise.resolve();
    return Butik.hentOpgaver(plusDag(iDag(), -60)).then(function (d) {
      data = d || data;
      hentet = true;
      tegn();
    }).catch(function (e) {
      var boks = $('opg-dag');
      if (boks && !hentet) {
        Admin.tøm(boks);
        boks.appendChild(lav('p', 'hjaelp', /does not exist|404|opgave/i.test(String(e && e.message))
          ? 'Opgaverne er ikke slået til i databasen endnu. Bed Mikkel køre opgaver-3-11.sql.'
          : 'Opgaverne kunne ikke hentes: ' + (e && e.message || e)));
      }
      if (window.console) console.warn('opgaver:', e);
    });
  }
  function gem(loefte, besked) {
    return loefte.then(hent).then(function () { if (besked) Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e && e.message || String(e)); return hent(); });
  }

  // ----------------------------------------------------------
  //  DAGEN — det personalet ser
  // ----------------------------------------------------------
  function tegn() {
    tegnOverblik();
    var boks = $('opg-dag');
    if (!boks) return;
    if (!dag) dag = iDag();
    var forskel = Math.round((new Date(dag + 'T12:00:00Z') - new Date(iDag() + 'T12:00:00Z')) / 864e5);
    $('opg-dag-navn').textContent = (forskel === 1 ? 'I MORGEN · ' : forskel === -1 ? 'I GÅR · ' : '')
      + Admin.pænDato(dag);
    $('opg-dag-idag').hidden = forskel === 0;
    $('opg-dag-vaelg').value = dag;
    var t = tal(dag);
    var talBoks = $('opg-dag-tal');
    Admin.tøm(talBoks);
    if (t.alle) {
      talBoks.appendChild(lav('span', null, t.gjort === t.alle
        ? 'Alle ' + t.alle + ' opgaver er udført ✓'
        : t.gjort + ' af ' + t.alle + ' opgaver udført'));
      talBoks.appendChild(bjaelke(t.gjort, t.alle));
    }

    Admin.tøm(boks);
    var lister = listerFor(dag);
    if (!lister.length) {
      var tom = lav('div', 'opg-tom');
      tom.appendChild(lav('div', 'opg-tom-tegn', '✅'));
      tom.appendChild(lav('p', null, data.lister.length
        ? 'Ingen lister gælder for denne dag.'
        : (ejer() ? 'Der er ingen lister endnu. Læg jeres første ind herunder — en PDF, et Word- eller Excel-dokument.'
          : 'Der er ingen opgavelister endnu. Cheferne lægger dem ind.')));
      boks.appendChild(tom);
    }
    var fremtid = dag > iDag();
    lister.forEach(function (l) {
      var opg = opgaverI(l.id);
      var gjort = opg.filter(function (o) { return udfoertFor(o.id, dag); }).length;
      var kort = lav('section', 'opg-liste' + (opg.length && gjort === opg.length ? ' faerdig' : ''));
      var hoved = lav('div', 'opg-liste-hoved');
      hoved.appendChild(lav('h3', null, l.navn));
      hoved.appendChild(lav('span', 'opg-liste-tal', gjort + '/' + opg.length));
      kort.appendChild(hoved);
      kort.appendChild(bjaelke(gjort, opg.length));
      afsnitI(l.id).forEach(function (a) {
        if (a.navn) {
          var g = a.opgaver.filter(function (o) { return udfoertFor(o.id, dag); }).length;
          var h = lav('h4', 'opg-afsnit');
          h.appendChild(lav('span', null, a.navn));
          h.appendChild(lav('span', 'opg-afsnit-tal', g + '/' + a.opgaver.length));
          kort.appendChild(h);
        }
        a.opgaver.forEach(function (o) { kort.appendChild(raekke(l, o, fremtid)); });
      });
      boks.appendChild(kort);
    });
    tegnLister();
  }

  function raekke(l, o, fremtid) {
    var u = udfoertFor(o.id, dag);
    var r = lav('div', 'opg-raekke' + (u ? ' gjort' : '') + (String(aaben) === String(o.id) ? ' aaben' : ''));
    r.setAttribute('data-opgave', String(o.id));

    var cirkel = lav('span', 'opg-cirkel', u ? '✓' : '');
    cirkel.setAttribute('aria-hidden', 'true');
    var tekst = lav('div', 'opg-tekst');
    tekst.appendChild(lav('span', 'opg-navn', o.tekst));
    if (o.vaerdi_navn && !u) tekst.appendChild(lav('span', 'opg-maal', '📏 ' + o.vaerdi_navn));

    if (u) {
      r.appendChild(cirkel);
      r.appendChild(tekst);
      var m = lav('div', 'opg-gjort');
      var hvornaar = datoFor(u.udfoert) !== u.dato
        ? Admin.pænDato(datoFor(u.udfoert)).replace('I DAG · ', '') + ' kl. ' + kl(u.udfoert)
        : kl(u.udfoert);
      if (u.vaerdi) m.appendChild(lav('span', 'opg-vaerdi', u.vaerdi + (/°/.test(o.vaerdi_navn || '') ? ' °C' : '')));
      m.appendChild(lav('span', 'opg-ini', u.initialer));
      m.appendChild(lav('span', 'opg-tid', hvornaar));
      m.appendChild(knap('knap-link', 'Fortryd', function () {
        if (!window.confirm('Fjern ' + u.initialer + ' fra "' + o.tekst + '"?')) return;
        gem(Butik.skrive.fortrydOpgave(u.id), 'Fjernet.');
      }));
      r.appendChild(m);
      return r;
    }
    if (fremtid) {
      r.appendChild(cirkel);
      r.appendChild(tekst);
      r.appendChild(lav('span', 'opg-tid', 'kan udfyldes på dagen'));
      r.classList.add('fremtid');
      return r;
    }

    if (String(aaben) === String(o.id)) {
      r.appendChild(cirkel);
      r.appendChild(tekst);
      var form = lav('div', 'opg-form');
      var vaerdi = null;
      if (o.vaerdi_navn) {
        vaerdi = felt('text', '', { inputmode: 'decimal', maxlength: '12', placeholder: o.vaerdi_navn,
          'aria-label': o.vaerdi_navn, class: 'opg-vaerdi-felt' });
        form.appendChild(vaerdi);
      }
      var ini = felt('text', sidsteIni(), { maxlength: '4', autocapitalize: 'characters', autocomplete: 'off',
        placeholder: 'Initialer', 'aria-label': 'Dine initialer', class: 'opg-ini-felt' });
      form.appendChild(ini);
      var ok = knap('knap primaer gron', '✓ Udført');
      form.appendChild(ok);
      form.appendChild(knap('knap-link', 'Annullér', function () { aaben = null; tegn(); }));
      var send = function () {
        var v = ini.value.trim().toUpperCase();
        ok.disabled = true;
        huskIni(v);
        Butik.skrive.udfoerOpgave({ opgave_id: o.id, liste_id: l.id, dato: dag, tekst: o.tekst,
          liste_navn: l.navn, initialer: v, vaerdi_navn: o.vaerdi_navn, vaerdi: vaerdi ? vaerdi.value : null })
          .then(function () { aaben = null; return hent(); })
          .catch(function (e) { ok.disabled = false; Admin.brøl(e && e.message || String(e)); });
      };
      ok.addEventListener('click', send);
      [ini, vaerdi].forEach(function (f) {
        if (!f) return;
        f.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); send(); }
          if (e.key === 'Escape') { aaben = null; tegn(); }
        });
      });
      r.appendChild(form);
      setTimeout(function () {
        var f = vaerdi || ini;
        try { f.focus({ preventScroll: true }); f.select(); } catch (e) { f.focus(); }
      }, 0);
      return r;
    }

    // Lukket: hele rækken er knappen — et stort mål på en iPad.
    var b = lav('button', 'opg-tryk');
    b.type = 'button';
    b.setAttribute('aria-label', 'Marker "' + o.tekst + '" som udført');
    b.appendChild(cirkel);
    b.appendChild(tekst);
    b.appendChild(lav('span', 'opg-udfoer', 'Udført'));
    b.addEventListener('click', function () { aaben = o.id; tegn(); });
    r.appendChild(b);
    return r;
  }

  // ----------------------------------------------------------
  //  PRINT DAGEN — dagens dokument
  // ----------------------------------------------------------
  function printDagen() {
    var esc = function (s) {
      return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    };
    var html = '<!doctype html><html lang="da"><head><meta charset="utf-8"><title>Arbejdsopgaver '
      + esc(dag) + '</title><style>body{font:13px/1.45 -apple-system,Segoe UI,Arial,sans-serif;margin:32px;color:#222}'
      + 'h1{font-size:20px;margin:0 0 2px}p.u{margin:0 0 18px;color:#666}h2{font-size:16px;margin:24px 0 6px}'
      + 'h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#7a5a3a;margin:12px 0 4px}'
      + 'table{width:100%;border-collapse:collapse;margin-bottom:6px}td,th{border:1px solid #c9bfb3;padding:6px 8px;text-align:left}'
      + 'th{background:#f3eee8;font-size:12px}td.i{width:80px;font-weight:700}td.t{width:70px}td.v{width:80px}</style></head><body>'
      + '<h1>Arbejdsopgaver — Mosede Havnecafe</h1><p class="u">' + esc(Admin.pænDato(dag).replace('I DAG · ', ''))
      + ' ' + dag.slice(0, 4) + ' · printet ' + esc(new Date().toLocaleString('da-DK')) + '</p>';
    var vist = {};
    listerFor(dag).forEach(function (l) {
      var medVaerdi = opgaverI(l.id).some(function (o) { return o.vaerdi_navn; });
      html += '<h2>' + esc(l.navn) + '</h2>';
      afsnitI(l.id).forEach(function (a) {
        if (a.navn) html += '<h3>' + esc(a.navn) + '</h3>';
        html += '<table><tr><th>Opgave</th>' + (medVaerdi ? '<th>Værdi</th>' : '')
          + '<th>Initialer</th><th>Kl.</th></tr>';
        a.opgaver.forEach(function (o) {
          var u = udfoertFor(o.id, dag);
          if (u) vist[u.id] = true;
          html += '<tr><td>' + esc(o.tekst) + '</td>'
            + (medVaerdi ? '<td class="v">' + esc(u && u.vaerdi ? u.vaerdi : (o.vaerdi_navn ? '' : '—')) + '</td>' : '')
            + '<td class="i">' + esc(u ? u.initialer : '') + '</td><td class="t">' + esc(u ? kl(u.udfoert) : '') + '</td></tr>';
        });
        html += '</table>';
      });
    });
    var andre = data.udfoert.filter(function (u) { return u.dato === dag && !vist[u.id]; });
    if (andre.length) {
      html += '<h2>Andet udført</h2><table><tr><th>Opgave</th><th>Værdi</th><th>Initialer</th><th>Kl.</th></tr>';
      andre.forEach(function (u) {
        html += '<tr><td>' + esc((u.liste_navn ? u.liste_navn + ': ' : '') + u.tekst) + '</td><td class="v">'
          + esc(u.vaerdi || '') + '</td><td class="i">' + esc(u.initialer) + '</td><td class="t">' + esc(kl(u.udfoert)) + '</td></tr>';
      });
      html += '</table>';
    }
    html += '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { Admin.brøl('Tillad pop-up-vinduer for at printe dagen.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) { /* brugeren printer selv */ } }, 300);
  }

  // ----------------------------------------------------------
  //  OVERBLIK — et lille kort: "5 af 12 udført i dag"
  // ----------------------------------------------------------
  function tegnOverblik() {
    var kort = $('ob-opgaver-kort');
    if (!kort) return;
    var t = tal(iDag());
    kort.hidden = !hentet || !t.alle || Admin.rolle === 'arrangoer';
    if (kort.hidden) return;
    $('ob-opgaver-tal').textContent = t.gjort === t.alle
      ? 'Alle ' + t.alle + ' opgaver er udført i dag ✓'
      : t.gjort + ' af ' + t.alle + ' opgaver udført i dag';
    kort.classList.toggle('faerdig', t.gjort === t.alle);
  }

  // ----------------------------------------------------------
  //  CHEFERNES DEL: FIL → UDKAST → LISTE
  // ----------------------------------------------------------
  function ugedageVaelger(boks, valgte, ændret) {
    Admin.tøm(boks);
    UGEDAGE.forEach(function (n, i) {
      var b = lav('button', null, n);
      b.type = 'button';
      b.setAttribute('data-dag', String(i + 1));
      var paa = !valgte || !valgte.length || valgte.map(Number).indexOf(i + 1) !== -1;
      b.setAttribute('aria-pressed', paa ? 'true' : 'false');
      b.addEventListener('click', function () {
        b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        if (ændret) ændret();
      });
      boks.appendChild(b);
    });
  }
  function valgteDage(boks) {
    return Array.prototype.filter.call(boks.querySelectorAll('[data-dag]'), function (b) {
      return b.getAttribute('aria-pressed') === 'true';
    }).map(function (b) { return Number(b.getAttribute('data-dag')); });
  }

  function antalIUdkast() {
    return udkast ? udkast.afsnit.reduce(function (s, a) {
      return s + a.opgaver.filter(function (o) { return String(o.tekst || '').trim(); }).length;
    }, 0) : 0;
  }

  function visUdkast(res, kilde) {
    udkast = {
      navn: res.titel || '',
      kilde: kilde || null,
      afsnit: (res.afsnit && res.afsnit.length ? res.afsnit : [{ navn: '', opgaver: [] }]).map(function (a) {
        return { navn: a.navn || '', opgaver: a.opgaver.map(function (o) {
          return typeof o === 'string' ? { tekst: o, vaerdi: null } : { tekst: o.tekst, vaerdi: o.vaerdi || null };
        }) };
      }),
    };
    tegnUdkast();
  }

  function tegnUdkast() {
    var boks = $('opg-udkast');
    if (!boks) return;
    Admin.tøm(boks);
    boks.hidden = !udkast;
    $('opg-upload').hidden = !!udkast;
    if (!udkast) return;

    var navnF = lav('div', 'felt');
    navnF.appendChild(lav('label', null, 'Listens navn'));
    var navn = felt('text', udkast.navn, { maxlength: '80', placeholder: 'Fx Lukning, Åbning, Rengøring', id: 'opg-ny-navn' });
    navn.addEventListener('input', function () { udkast.navn = navn.value; });
    navnF.appendChild(navn);
    boks.appendChild(navnF);

    var dageF = lav('div', 'felt');
    dageF.appendChild(lav('span', 'felt-etiket', 'Hvilke dage skal den udfyldes'));
    var dage = lav('div', 'adm-seg opg-dage');
    dage.id = 'opg-ny-dage';
    ugedageVaelger(dage, udkast.dage, function () { udkast.dage = valgteDage(dage); });
    dageF.appendChild(dage);
    boks.appendChild(dageF);

    boks.appendChild(lav('p', 'hjaelp', 'Sådan bliver listen. Ret, slet eller tilføj — 📏 betyder, at personalet '
      + 'skal skrive en værdi (fx temperaturen) ved opgaven.'));

    var forh = lav('div', 'opg-forhaand');
    udkast.afsnit.forEach(function (a, ai) {
      var blok = lav('div', 'opg-forh-afsnit');
      var h = lav('div', 'opg-forh-hoved');
      var an = felt('text', a.navn, { maxlength: '80', placeholder: udkast.afsnit.length > 1 ? 'Afsnittets overskrift' : 'Overskrift (valgfri)',
        'aria-label': 'Afsnittets overskrift' });
      an.addEventListener('input', function () { a.navn = an.value; });
      h.appendChild(an);
      if (udkast.afsnit.length > 1) {
        h.appendChild(knap('knap-link fare-tekst', '✕', function () {
          udkast.afsnit.splice(ai, 1);
          tegnUdkast();
        })).setAttribute('aria-label', 'Fjern afsnittet');
      }
      blok.appendChild(h);
      a.opgaver.forEach(function (o, oi) {
        var r = lav('div', 'opg-forh-raekke');
        r.appendChild(lav('span', 'opg-cirkel lille'));
        var t = felt('text', o.tekst, { maxlength: '300', 'aria-label': 'Opgave' });
        t.addEventListener('input', function () { o.tekst = t.value; opdaterOpret(); });
        r.appendChild(t);
        var maal = knap('opg-maal-knap', '📏', function () {
          o.vaerdi = o.vaerdi ? null : 'Temp. °C';
          maal.setAttribute('aria-pressed', o.vaerdi ? 'true' : 'false');
          maal.title = o.vaerdi ? 'Personalet skriver ' + o.vaerdi : 'Skal personalet skrive en værdi (fx temperatur)?';
        });
        maal.setAttribute('aria-pressed', o.vaerdi ? 'true' : 'false');
        maal.setAttribute('aria-label', 'Skal der skrives en værdi, fx temperatur');
        maal.title = o.vaerdi ? 'Personalet skriver ' + o.vaerdi : 'Skal personalet skrive en værdi (fx temperatur)?';
        r.appendChild(maal);
        r.appendChild(knap('knap-link fare-tekst', '✕', function () {
          a.opgaver.splice(oi, 1);
          tegnUdkast();
        })).setAttribute('aria-label', 'Fjern opgaven');
        blok.appendChild(r);
      });
      blok.appendChild(knap('knap-link opg-tilfoej', '+ Tilføj opgave', function () {
        a.opgaver.push({ tekst: '', vaerdi: null });
        tegnUdkast();
        var felter = $('opg-udkast').querySelectorAll('.opg-forh-afsnit')[ai].querySelectorAll('.opg-forh-raekke input');
        if (felter.length) felter[felter.length - 1].focus();
      }));
      forh.appendChild(blok);
    });
    forh.appendChild(knap('knap sekundaer lille', '+ Nyt afsnit', function () {
      udkast.afsnit.push({ navn: '', opgaver: [{ tekst: '', vaerdi: null }] });
      tegnUdkast();
    }));
    boks.appendChild(forh);

    var bund = lav('div', 'knap-raekke luft-top');
    var opret = knap('knap', '', opretListen);
    opret.id = 'opg-opret';
    bund.appendChild(opret);
    bund.appendChild(knap('knap sekundaer', 'Fortryd', function () { udkast = null; tegnUdkast(); }));
    boks.appendChild(bund);
    opdaterOpret();
  }
  function opdaterOpret() {
    var b = $('opg-opret');
    if (!b) return;
    var n = antalIUdkast();
    b.textContent = n ? '✓ Opret listen (' + n + (n === 1 ? ' opgave)' : ' opgaver)') : 'Opret listen';
    b.disabled = !n;
  }

  function opretListen() {
    var b = $('opg-opret');
    var opgaver = [];
    udkast.afsnit.forEach(function (a) {
      a.opgaver.forEach(function (o) {
        if (String(o.tekst || '').trim()) opgaver.push({ tekst: o.tekst, afsnit: a.navn, vaerdi_navn: o.vaerdi });
      });
    });
    if (b) b.disabled = true;
    Butik.skrive.opretOpgaveliste({
      navn: udkast.navn, opgaver: opgaver, ugedage: udkast.dage || null,
      kilde: udkast.kilde, raekkefoelge: data.lister.length,
    }).then(function () {
      udkast = null;
      tegnUdkast();
      $('opg-fil-status').textContent = '';
      if ($('opg-ny-fold')) $('opg-ny-fold').open = false;
      return hent();
    }).then(function () {
      Admin.kvitter('Listen er oprettet — den står på dagens opgaver.');
    }).catch(function (e) {
      if (b) b.disabled = false;
      Admin.brøl(e && e.message || String(e));
    });
  }

  function opsaetNy() {
    if (!$('opg-fil')) return;
    function laes(fil) {
      if (!fil || !Admin.opgaveLaeser) return;
      var status = $('opg-fil-status');
      status.textContent = 'Læser ' + fil.name + ' …';
      status.className = 'opg-status';
      Admin.opgaveLaeser.laesFil(fil).then(function (res) {
        var n = res.afsnit.reduce(function (s, a) { return s + a.opgaver.length; }, 0);
        if (!n) {
          status.textContent = 'Der blev ikke fundet nogen opgaver i ' + fil.name + '. Er det et billede eller en scannet side? '
            + 'Så skriv opgaverne under "Skriv selv".';
          status.className = 'opg-status fejl';
          return;
        }
        var navngivne = res.afsnit.filter(function (a) { return a.navn; }).length;
        status.textContent = '✓ ' + n + (n === 1 ? ' opgave' : ' opgaver') + ' fundet'
          + (navngivne ? ' i ' + navngivne + (navngivne === 1 ? ' afsnit' : ' afsnit') : '')
          + ' — ret dem herunder, og tryk "Opret listen".';
        status.className = 'opg-status ok';
        visUdkast(res, fil.name);
      }).catch(function (e) {
        status.textContent = e && e.message || String(e);
        status.className = 'opg-status fejl';
      });
    }
    $('opg-fil').addEventListener('change', function () {
      laes(this.files && this.files[0]);
      this.value = '';
    });
    // Træk og slip filen på feltet (på en computer).
    var zone = $('opg-upload-zone');
    if (zone) {
      ['dragenter', 'dragover'].forEach(function (t) {
        zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.add('over'); });
      });
      ['dragleave', 'drop'].forEach(function (t) {
        zone.addEventListener(t, function () { zone.classList.remove('over'); });
      });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        laes(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
      });
    }
    $('opg-skriv-selv').addEventListener('click', function () {
      var t = $('opg-ny-tekst').value;
      if (!String(t).trim()) { visUdkast({ titel: '', afsnit: [{ navn: '', opgaver: [{ tekst: '', vaerdi: null }] }] }); return; }
      visUdkast(Admin.opgaveLaeser.fraTekst(t), null);
    });
  }

  // ----------------------------------------------------------
  //  DE LISTER, DER FINDES — rettes her (kun cheferne)
  // ----------------------------------------------------------
  function tegnLister() {
    var boks = $('opg-lister');
    var kort = $('opg-ret-kort');
    if (!boks || !kort) return;
    kort.hidden = !ejer();
    if (!ejer()) return;
    Admin.tøm(boks);
    if (!data.lister.length) return;
    boks.appendChild(lav('h3', 'opg-lister-titel', 'Jeres lister'));
    data.lister.slice().sort(function (a, b) { return (a.raekkefoelge || 0) - (b.raekkefoelge || 0) || a.id - b.id; })
      .forEach(function (l) {
        var fold = lav('details', 'opg-ret-liste');
        fold.setAttribute('data-liste', String(l.id));
        var sum = lav('summary');
        sum.appendChild(lav('strong', null, l.navn));
        sum.appendChild(lav('span', 'hjaelp', ' · ' + opgaverI(l.id).length + ' opgaver · '
          + (l.ugedage && l.ugedage.length ? l.ugedage.map(function (n) { return UGEDAGE[n - 1]; }).join(', ') : 'hver dag')
          + (l.kilde ? ' · fra ' + l.kilde : '')));
        fold.appendChild(sum);

        var f1 = lav('div', 'felt');
        f1.appendChild(lav('label', null, 'Navn'));
        var navn = felt('text', l.navn, { maxlength: '80', 'aria-label': 'Listens navn' });
        navn.addEventListener('change', function () {
          gem(Butik.skrive.retOpgaveliste(l.id, { navn: navn.value }), 'Navnet er gemt.');
        });
        f1.appendChild(navn);
        fold.appendChild(f1);

        var f2 = lav('div', 'felt');
        f2.appendChild(lav('span', 'felt-etiket', 'Hvilke dage'));
        var dage = lav('div', 'adm-seg opg-dage');
        ugedageVaelger(dage, l.ugedage, function () {
          gem(Butik.skrive.retOpgaveliste(l.id, { ugedage: valgteDage(dage) }), 'Dagene er gemt.');
        });
        f2.appendChild(dage);
        fold.appendChild(f2);

        afsnitI(l.id).forEach(function (a) {
          var blok = lav('div', 'opg-forh-afsnit');
          var h = lav('div', 'opg-forh-hoved');
          var an = felt('text', a.navn, { maxlength: '80', placeholder: 'Overskrift (valgfri)', 'aria-label': 'Afsnittets overskrift' });
          an.addEventListener('change', function () {
            gem(Butik.skrive.retAfsnit(l.id, a.navn || null, an.value), 'Overskriften er gemt.');
          });
          h.appendChild(an);
          blok.appendChild(h);
          a.opgaver.forEach(function (o) {
            var r = lav('div', 'opg-forh-raekke');
            r.appendChild(lav('span', 'opg-cirkel lille'));
            var t = felt('text', o.tekst, { maxlength: '300', 'aria-label': 'Opgave' });
            t.addEventListener('change', function () { gem(Butik.skrive.retOpgave(o.id, t.value), 'Opgaven er gemt.'); });
            r.appendChild(t);
            var maal = knap('opg-maal-knap', '📏', function () {
              gem(Butik.skrive.retOpgaveVaerdi(o.id, o.vaerdi_navn ? null : 'Temp. °C'),
                o.vaerdi_navn ? 'Der skal ikke længere skrives en værdi.' : 'Personalet skriver nu en værdi ved opgaven.');
            });
            maal.setAttribute('aria-pressed', o.vaerdi_navn ? 'true' : 'false');
            maal.setAttribute('aria-label', 'Skal der skrives en værdi, fx temperatur');
            maal.title = o.vaerdi_navn ? 'Personalet skriver ' + o.vaerdi_navn : 'Skal personalet skrive en værdi (fx temperatur)?';
            r.appendChild(maal);
            r.appendChild(knap('knap-link fare-tekst', '✕', function () {
              if (!window.confirm('Slet opgaven "' + o.tekst + '"? Det, der allerede er udført, står stadig i historikken.')) return;
              gem(Butik.skrive.sletOpgave(o.id), 'Opgaven er slettet.');
            })).setAttribute('aria-label', 'Slet opgaven ' + o.tekst);
            blok.appendChild(r);
          });
          var ny = lav('div', 'opg-forh-raekke');
          var nyt = felt('text', '', { maxlength: '300', placeholder: 'Ny opgave' + (a.navn ? ' under ' + a.navn : '') + ' …' });
          var tilfoej = knap('knap sekundaer lille', '+ Tilføj', function () {
            gem(Butik.skrive.tilfoejOpgave(l.id, nyt.value, opgaverI(l.id).length, a.navn || null), 'Opgaven er tilføjet.');
          });
          nyt.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); tilfoej.click(); } });
          ny.appendChild(nyt);
          ny.appendChild(tilfoej);
          blok.appendChild(ny);
          fold.appendChild(blok);
        });

        var bund = lav('div', 'knap-raekke luft-top');
        bund.appendChild(knap('knap fare lille', 'Slet listen', function () {
          if (!window.confirm('Slet listen "' + l.navn + '"?\n\nDet, der allerede er udført, står stadig i historikken.')) return;
          gem(Butik.skrive.sletOpgaveliste(l.id), 'Listen er slettet.');
        }));
        fold.appendChild(bund);
        // Den åbne liste bliver åben, når skærmen tegnes om.
        if (åbneLister[l.id]) fold.open = true;
        fold.addEventListener('toggle', function () { åbneLister[l.id] = fold.open; });
        boks.appendChild(fold);
      });
  }
  var åbneLister = {};

  // ----------------------------------------------------------
  //  OPSÆTNING
  // ----------------------------------------------------------
  if ($('opg-dag')) {
    $('opg-dag-forrige').addEventListener('click', function () { dag = plusDag(dag || iDag(), -1); aaben = null; tegn(); });
    $('opg-dag-naeste').addEventListener('click', function () { dag = plusDag(dag || iDag(), 1); aaben = null; tegn(); });
    $('opg-dag-idag').addEventListener('click', function () { dag = iDag(); aaben = null; tegn(); });
    $('opg-dag-vaelg').addEventListener('change', function () {
      if (/^\d{4}-\d{2}-\d{2}$/.test(this.value)) { dag = this.value; aaben = null; tegn(); }
    });
    $('opg-print').addEventListener('click', printDagen);
    opsaetNy();
  }
  if ($('ob-opgaver-aabn')) {
    $('ob-opgaver-aabn').addEventListener('click', function () { dag = iDag(); Admin.visFane('p-opgaver'); });
  }

  Admin.hentVedFane('p-opgaver', hent);
  Admin.vedLogin.push(function () { return hent(); });
  // ⚠️ IKKE OM, MENS NOGEN SKRIVER: står initialfeltet åbent, tegnes der
  // ikke om udefra — ellers forsvinder det, man er ved at skrive.
  Admin.tegnere.push(function () { if (hentet && !aaben) tegn(); });
}());
