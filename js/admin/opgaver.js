/* ============================================================
   ARBEJDSOPGAVER MED INITIALER  (3/11, supabase/opgaver-3-11.sql)
   ------------------------------------------------------------
   Chefen: lister, de har på en fil, skal lægges ind, så personalet
   hver dag kan sætte initialer ved det, de har gjort. Mikkel: *"de
   lægger filerne ind i admin, som de selv har et andet sted, og
   dermed bliver de gjort til arbejdsopgaver, personalet skal
   udføre."*

   - Cheferne lægger en fil ind (Word, Excel, PDF, tekst) eller
     sætter teksten ind. Hver linje bliver en opgave — de ser listen,
     før den gemmes, og kan rette den.
   - Hver dag står listerne friske. Personalet trykker "Udført" og
     skriver sine initialer; klokkeslættet kommer af sig selv.
   - Dagen kan printes som et dokument (fx til egenkontrollen).

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
  var aabenIni = null;       // opgaven, der står med initialfeltet åbent
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
  //  DAGEN
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
    $('opg-dag-tal').textContent = t.alle
      ? t.gjort + ' af ' + t.alle + ' opgaver udført' + (t.gjort === t.alle ? ' ✓' : '')
      : '';

    Admin.tøm(boks);
    var lister = listerFor(dag);
    if (!lister.length) {
      boks.appendChild(lav('p', 'hjaelp', data.lister.length
        ? 'Ingen lister gælder for denne dag.'
        : (ejer() ? 'Der er ingen lister endnu. Læg en fil ind herunder — så bliver den til opgaver.'
          : 'Der er ingen opgavelister endnu. Cheferne lægger dem ind.')));
    }
    var fremtid = dag > iDag();
    lister.forEach(function (l) {
      var kort = lav('div', 'opg-liste');
      var opg = opgaverI(l.id);
      var gjort = opg.filter(function (o) { return udfoertFor(o.id, dag); }).length;
      var hoved = lav('div', 'opg-liste-hoved');
      hoved.appendChild(lav('h3', null, l.navn));
      hoved.appendChild(lav('span', 'opg-liste-tal' + (gjort === opg.length && opg.length ? ' faerdig' : ''),
        gjort + '/' + opg.length));
      kort.appendChild(hoved);
      opg.forEach(function (o) { kort.appendChild(raekke(l, o, fremtid)); });
      boks.appendChild(kort);
    });
    tegnLister();
  }

  function raekke(l, o, fremtid) {
    var u = udfoertFor(o.id, dag);
    var r = lav('div', 'opg-raekke' + (u ? ' gjort' : ''));
    r.setAttribute('data-opgave', String(o.id));
    var tekst = lav('div', 'opg-tekst', o.tekst);
    r.appendChild(tekst);

    if (u) {
      var m = lav('div', 'opg-gjort');
      var hvornaar = datoFor(u.udfoert) !== u.dato
        ? Admin.pænDato(datoFor(u.udfoert)).replace('I DAG · ', '') + ' kl. ' + kl(u.udfoert)
        : 'kl. ' + kl(u.udfoert);
      m.appendChild(lav('span', 'opg-ini', '✓ ' + u.initialer));
      m.appendChild(lav('span', 'opg-tid', hvornaar));
      var fortryd = lav('button', 'knap-link', 'Fortryd');
      fortryd.type = 'button';
      fortryd.addEventListener('click', function () {
        if (!window.confirm('Fjern ' + u.initialer + ' fra "' + o.tekst + '"?')) return;
        gem(Butik.skrive.fortrydOpgave(u.id), 'Fjernet.');
      });
      m.appendChild(fortryd);
      r.appendChild(m);
      return r;
    }
    if (fremtid) {
      r.appendChild(lav('span', 'opg-tid', 'kan udfyldes på dagen'));
      return r;
    }
    if (String(aabenIni) === String(o.id)) {
      var form = lav('div', 'opg-ini-form');
      var felt = document.createElement('input');
      felt.type = 'text';
      felt.maxLength = 4;
      felt.autocapitalize = 'characters';
      felt.autocomplete = 'off';
      felt.placeholder = 'Initialer';
      felt.value = sidsteIni();
      felt.setAttribute('aria-label', 'Dine initialer');
      var ok = lav('button', 'knap primaer gron', '✓ Udført');
      ok.type = 'button';
      var annuller = lav('button', 'knap-link', 'Annullér');
      annuller.type = 'button';
      function send() {
        var ini = felt.value.trim().toUpperCase();
        ok.disabled = true;
        huskIni(ini);
        aabenIni = null;
        gem(Butik.skrive.udfoerOpgave({ opgave_id: o.id, liste_id: l.id, dato: dag, tekst: o.tekst,
          liste_navn: l.navn, initialer: ini }), null).then(function () { ok.disabled = false; });
      }
      ok.addEventListener('click', send);
      felt.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); send(); }
        if (e.key === 'Escape') { aabenIni = null; tegn(); }
      });
      annuller.addEventListener('click', function () { aabenIni = null; tegn(); });
      form.appendChild(felt);
      form.appendChild(ok);
      form.appendChild(annuller);
      r.appendChild(form);
      setTimeout(function () { felt.focus(); felt.select(); }, 0);
      return r;
    }
    var knap = lav('button', 'knap sekundaer opg-udfoer', 'Udført');
    knap.type = 'button';
    knap.setAttribute('aria-label', 'Marker "' + o.tekst + '" som udført');
    knap.addEventListener('click', function () { aabenIni = o.id; tegn(); });
    r.appendChild(knap);
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
      + esc(dag) + '</title><style>body{font:14px/1.4 -apple-system,Segoe UI,Arial,sans-serif;margin:32px;color:#222}'
      + 'h1{font-size:20px;margin:0 0 4px}p{margin:0 0 18px;color:#555}h2{font-size:16px;margin:22px 0 6px}'
      + 'table{width:100%;border-collapse:collapse}td,th{border:1px solid #bbb;padding:6px 8px;text-align:left}'
      + 'th{background:#f3eee8}td.i{width:90px;font-weight:700}td.t{width:150px}</style></head><body>'
      + '<h1>Arbejdsopgaver — Mosede Havnecafe</h1><p>' + esc(Admin.pænDato(dag).replace('I DAG · ', ''))
      + ' ' + dag.slice(0, 4) + ' · printet ' + esc(new Date().toLocaleString('da-DK')) + '</p>';
    // Det, der faktisk blev gjort den dag — også fra lister, der er rettet eller slettet siden.
    var vist = {};
    listerFor(dag).forEach(function (l) {
      html += '<h2>' + esc(l.navn) + '</h2><table><tr><th>Opgave</th><th>Initialer</th><th>Tidspunkt</th></tr>';
      opgaverI(l.id).forEach(function (o) {
        var u = udfoertFor(o.id, dag);
        if (u) vist[u.id] = true;
        html += '<tr><td>' + esc(o.tekst) + '</td><td class="i">' + esc(u ? u.initialer : '')
          + '</td><td class="t">' + esc(u ? kl(u.udfoert) : '') + '</td></tr>';
      });
      html += '</table>';
    });
    var andre = data.udfoert.filter(function (u) { return u.dato === dag && !vist[u.id]; });
    if (andre.length) {
      html += '<h2>Andet udført</h2><table><tr><th>Opgave</th><th>Initialer</th><th>Tidspunkt</th></tr>';
      andre.forEach(function (u) {
        html += '<tr><td>' + esc((u.liste_navn ? u.liste_navn + ': ' : '') + u.tekst) + '</td><td class="i">'
          + esc(u.initialer) + '</td><td class="t">' + esc(kl(u.udfoert)) + '</td></tr>';
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
  //  CHEFERNES DEL: LÆG EN FIL IND → OPGAVER
  // ----------------------------------------------------------
  /* Værktøjerne til at læse filerne ligger på siden selv (js/vendor/,
     licenserne ved siden af) og hentes først, når en fil vælges. */
  var CDN = {
    jszip: 'js/vendor/jszip.min.js',
    xlsx: 'js/vendor/xlsx.core.min.js',
    pdf: 'js/vendor/pdf.min.js',
    pdfWorker: 'js/vendor/pdf.worker.min.js',
  };
  var hentede = {};
  function script(url) {
    if (hentede[url]) return hentede[url];
    hentede[url] = new Promise(function (ja, nej) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = ja;
      s.onerror = function () { delete hentede[url]; nej(new Error('Værktøjet til at læse filen kunne ikke hentes. Tjek nettet.')); };
      document.head.appendChild(s);
    });
    return hentede[url];
  }
  function som(fil, hvordan) {
    return new Promise(function (ja, nej) {
      var r = new FileReader();
      r.onload = function () { ja(r.result); };
      r.onerror = function () { nej(new Error('Filen kunne ikke læses.')); };
      if (hvordan === 'tekst') r.readAsText(fil); else r.readAsArrayBuffer(fil);
    });
  }

  /* Linjerne fra en fil → opgaver. Punkttegn, tal og afkrydsningsfelter
     foran fjernes; tomme linjer og gentagelser springes over. */
  function rens(linjer) {
    var ud = [];
    linjer.forEach(function (x) {
      var t = String(x || '').replace(/\s+/g, ' ').trim()
        .replace(/^([•·\-–—*▪◦►☐□■✓✔❑❒]|\[\s?[xX]?\s?\]|\(\s?\)|\d{1,3}[.)]|[a-zA-Z][.)])\s+/, '')
        .replace(/^[☐□❑❒]\s*/, '').trim();
      if (!t || t.length < 2) return;
      if (ud.length && ud[ud.length - 1] === t) return;
      ud.push(t.slice(0, 300));
    });
    return ud;
  }

  function læsFil(fil) {
    var navn = (fil.name || '').toLowerCase();
    if (/\.(txt|csv|md|text)$/.test(navn) || /^text\//.test(fil.type)) {
      return som(fil, 'tekst').then(function (t) {
        var linjer = String(t).split(/\r?\n/);
        if (/\.csv$/.test(navn)) {
          linjer = linjer.map(function (l) {
            return l.split(/[;,\t]/).map(function (c) { return c.replace(/^"|"$/g, '').trim(); })
              .filter(Boolean).join(' – ');
          });
        }
        return rens(linjer);
      });
    }
    if (/\.docx$/.test(navn)) {
      return script(CDN.jszip).then(function () { return som(fil); }).then(function (buf) {
        return window.JSZip.loadAsync(buf);
      }).then(function (zip) {
        var f = zip.file('word/document.xml');
        if (!f) throw new Error('Word-filen kunne ikke læses.');
        return f.async('string');
      }).then(function (xml) {
        var doc = new DOMParser().parseFromString(xml, 'application/xml');
        var W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
        var ps = doc.getElementsByTagNameNS(W, 'p');
        var linjer = [];
        for (var i = 0; i < ps.length; i++) {
          var ts = ps[i].getElementsByTagNameNS(W, 't');
          var s = '';
          for (var j = 0; j < ts.length; j++) s += ts[j].textContent;
          linjer.push(s);
        }
        return rens(linjer);
      });
    }
    if (/\.(xlsx|xls|ods)$/.test(navn)) {
      return script(CDN.xlsx).then(function () { return som(fil); }).then(function (buf) {
        var bog = window.XLSX.read(buf, { type: 'array' });
        var linjer = [];
        bog.SheetNames.forEach(function (n) {
          window.XLSX.utils.sheet_to_json(bog.Sheets[n], { header: 1, blankrows: false }).forEach(function (r) {
            var celler = (r || []).map(function (c) { return String(c == null ? '' : c).trim(); }).filter(Boolean);
            if (celler.length) linjer.push(celler.join(' – '));
          });
        });
        return rens(linjer);
      });
    }
    if (/\.pdf$/.test(navn) || fil.type === 'application/pdf') {
      return script(CDN.pdf).then(function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfWorker;
        return som(fil);
      }).then(function (buf) {
        return window.pdfjsLib.getDocument({ data: buf }).promise;
      }).then(function (pdf) {
        var sider = [];
        for (var i = 1; i <= pdf.numPages; i++) sider.push(pdf.getPage(i).then(function (p) { return p.getTextContent(); }));
        return Promise.all(sider);
      }).then(function (indhold) {
        var linjer = [];
        indhold.forEach(function (c) {
          var y = null, s = '';
          c.items.forEach(function (it) {
            var ny = Math.round(it.transform[5]);
            if (y !== null && Math.abs(ny - y) > 2) { linjer.push(s); s = ''; }
            s += (s && !/\s$/.test(s) ? ' ' : '') + it.str;
            y = ny;
          });
          if (s) linjer.push(s);
        });
        return rens(linjer);
      });
    }
    if (/^image\//.test(fil.type)) {
      return Promise.reject(new Error('Et billede kan ikke læses automatisk. På iPad\'en: åbn billedet, '
        + 'hold fingeren på teksten, vælg "Vælg alt" → "Kopiér", og sæt det ind i feltet "Opgaverne".'));
    }
    if (/\.doc$/.test(navn)) {
      return Promise.reject(new Error('Den gamle Word-type (.doc) kan ikke læses. Gem den som .docx eller PDF, '
        + 'eller kopiér teksten og sæt den ind i feltet.'));
    }
    return Promise.reject(new Error('Den filtype kan ikke læses. Brug Word (.docx), Excel, PDF eller tekst — '
      + 'eller kopiér teksten og sæt den ind i feltet.'));
  }

  function ugedageVaelger(boks, valgte) {
    Admin.tøm(boks);
    UGEDAGE.forEach(function (n, i) {
      var b = lav('button', null, n);
      b.type = 'button';
      b.setAttribute('data-dag', String(i + 1));
      var paa = !valgte || !valgte.length || valgte.map(Number).indexOf(i + 1) !== -1;
      b.setAttribute('aria-pressed', paa ? 'true' : 'false');
      b.addEventListener('click', function () {
        b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      });
      boks.appendChild(b);
    });
  }
  function valgteDage(boks) {
    return Array.prototype.filter.call(boks.querySelectorAll('[data-dag]'), function (b) {
      return b.getAttribute('aria-pressed') === 'true';
    }).map(function (b) { return Number(b.getAttribute('data-dag')); });
  }

  function opsaetNy() {
    if (!$('opg-fil')) return;
    ugedageVaelger($('opg-ny-dage'), null);
    $('opg-fil').addEventListener('change', function () {
      var fil = this.files && this.files[0];
      if (!fil) return;
      var status = $('opg-fil-status');
      status.textContent = 'Læser ' + fil.name + ' …';
      læsFil(fil).then(function (linjer) {
        $('opg-ny-tekst').value = linjer.join('\n');
        if (!$('opg-ny-navn').value) $('opg-ny-navn').value = fil.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 80);
        $('opg-ny-tekst').setAttribute('data-kilde', fil.name);
        status.textContent = linjer.length
          ? linjer.length + ' opgaver fundet i ' + fil.name + '. Ret dem herunder, og tryk "Opret listen".'
          : 'Der blev ikke fundet nogen tekst i ' + fil.name + '.';
        visAntal();
      }).catch(function (e) {
        status.textContent = e && e.message || String(e);
      });
      this.value = '';
    });
    $('opg-ny-tekst').addEventListener('input', visAntal);
    $('opg-opret').addEventListener('click', function () {
      var linjer = rens($('opg-ny-tekst').value.split(/\r?\n/));
      var knap = this;
      knap.disabled = true;
      Butik.skrive.opretOpgaveliste({
        navn: $('opg-ny-navn').value, opgaver: linjer, ugedage: valgteDage($('opg-ny-dage')),
        kilde: $('opg-ny-tekst').getAttribute('data-kilde') || null,
        raekkefoelge: data.lister.length,
      }).then(function () {
        $('opg-ny-navn').value = '';
        $('opg-ny-tekst').value = '';
        $('opg-ny-tekst').removeAttribute('data-kilde');
        $('opg-fil-status').textContent = '';
        ugedageVaelger($('opg-ny-dage'), null);
        visAntal();
        if ($('opg-ny-fold')) $('opg-ny-fold').open = false;
        return hent();
      }).then(function () {
        Admin.kvitter('Listen er oprettet — den står på dagens opgaver.');
      }).catch(function (e) {
        Admin.brøl(e && e.message || String(e));
      }).then(function () { knap.disabled = false; });
    });
    visAntal();
  }
  function visAntal() {
    var n = rens(($('opg-ny-tekst').value || '').split(/\r?\n/)).length;
    $('opg-opret').textContent = n ? 'Opret listen (' + n + (n === 1 ? ' opgave)' : ' opgaver)') : 'Opret listen';
  }

  // De lister, der findes — rettes her (kun cheferne).
  function tegnLister() {
    var boks = $('opg-lister');
    var kort = $('opg-ret-kort');
    if (!boks || !kort) return;
    kort.hidden = !ejer();
    if (!ejer()) return;
    Admin.tøm(boks);
    if (!data.lister.length) {
      boks.appendChild(lav('p', 'hjaelp', 'Ingen lister endnu.'));
      return;
    }
    data.lister.slice().sort(function (a, b) { return (a.raekkefoelge || 0) - (b.raekkefoelge || 0) || a.id - b.id; })
      .forEach(function (l) {
        var fold = lav('details', 'opg-ret-liste');
        var sum = lav('summary', null, l.navn + ' · ' + opgaverI(l.id).length + ' opgaver'
          + (l.ugedage && l.ugedage.length ? ' · ' + l.ugedage.map(function (n) { return UGEDAGE[n - 1]; }).join(', ') : ' · hver dag'));
        fold.appendChild(sum);

        var navn = document.createElement('input');
        navn.type = 'text';
        navn.value = l.navn;
        navn.maxLength = 80;
        navn.setAttribute('aria-label', 'Listens navn');
        navn.addEventListener('change', function () {
          gem(Butik.skrive.retOpgaveliste(l.id, { navn: navn.value }), 'Navnet er gemt.');
        });
        var f1 = lav('div', 'felt');
        f1.appendChild(lav('label', null, 'Navn'));
        f1.appendChild(navn);
        fold.appendChild(f1);

        var dage = lav('div', 'adm-seg opg-dage');
        ugedageVaelger(dage, l.ugedage);
        dage.addEventListener('click', function () {
          gem(Butik.skrive.retOpgaveliste(l.id, { ugedage: valgteDage(dage) }), 'Dagene er gemt.');
        });
        var f2 = lav('div', 'felt');
        f2.appendChild(lav('label', null, 'Hvilke dage'));
        f2.appendChild(dage);
        fold.appendChild(f2);

        opgaverI(l.id).forEach(function (o) {
          var r = lav('div', 'opg-ret-raekke');
          var t = document.createElement('input');
          t.type = 'text';
          t.value = o.tekst;
          t.maxLength = 300;
          t.setAttribute('aria-label', 'Opgave');
          t.addEventListener('change', function () { gem(Butik.skrive.retOpgave(o.id, t.value), 'Opgaven er gemt.'); });
          var x = lav('button', 'knap-link fare-tekst', '✕');
          x.type = 'button';
          x.setAttribute('aria-label', 'Slet opgaven ' + o.tekst);
          x.addEventListener('click', function () {
            if (!window.confirm('Slet opgaven "' + o.tekst + '"? Det, der allerede er udført, står stadig i historikken.')) return;
            gem(Butik.skrive.sletOpgave(o.id), 'Opgaven er slettet.');
          });
          r.appendChild(t);
          r.appendChild(x);
          fold.appendChild(r);
        });

        var ny = lav('div', 'opg-ret-raekke');
        var nyt = document.createElement('input');
        nyt.type = 'text';
        nyt.placeholder = 'Ny opgave …';
        nyt.maxLength = 300;
        var tilfoej = lav('button', 'knap sekundaer lille', '+ Tilføj');
        tilfoej.type = 'button';
        tilfoej.addEventListener('click', function () {
          gem(Butik.skrive.tilfoejOpgave(l.id, nyt.value, opgaverI(l.id).length), 'Opgaven er tilføjet.');
        });
        nyt.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); tilfoej.click(); } });
        ny.appendChild(nyt);
        ny.appendChild(tilfoej);
        fold.appendChild(ny);

        var slet = lav('button', 'knap fare lille', 'Slet listen');
        slet.type = 'button';
        slet.addEventListener('click', function () {
          if (!window.confirm('Slet listen "' + l.navn + '"?\n\nDet, der allerede er udført, står stadig i historikken.')) return;
          gem(Butik.skrive.sletOpgaveliste(l.id), 'Listen er slettet.');
        });
        var bund = lav('div', 'knap-raekke luft-top');
        bund.appendChild(slet);
        fold.appendChild(bund);
        boks.appendChild(fold);
      });
  }

  // ----------------------------------------------------------
  //  OPSÆTNING
  // ----------------------------------------------------------
  if ($('opg-dag')) {
    $('opg-dag-forrige').addEventListener('click', function () { dag = plusDag(dag || iDag(), -1); aabenIni = null; tegn(); });
    $('opg-dag-naeste').addEventListener('click', function () { dag = plusDag(dag || iDag(), 1); aabenIni = null; tegn(); });
    $('opg-dag-idag').addEventListener('click', function () { dag = iDag(); aabenIni = null; tegn(); });
    $('opg-dag-vaelg').addEventListener('change', function () {
      if (/^\d{4}-\d{2}-\d{2}$/.test(this.value)) { dag = this.value; aabenIni = null; tegn(); }
    });
    $('opg-print').addEventListener('click', printDagen);
    opsaetNy();
  }
  if ($('ob-opgaver-aabn')) {
    $('ob-opgaver-aabn').addEventListener('click', function () { dag = iDag(); Admin.visFane('p-opgaver'); });
  }

  Admin.hentVedFane('p-opgaver', hent);
  Admin.vedLogin.push(function () { return hent(); });
  Admin.tegnere.push(function () { if (hentet) tegn(); });
}());
