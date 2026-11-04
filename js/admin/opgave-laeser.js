/* ============================================================
   FRA FIL TIL OPGAVER  (4/11)
   ------------------------------------------------------------
   Mikkel: *"det skal være, så han kan uploade en PDF-fil, og så er
   vores system dygtigt nok til at gøre det til et sæt opgaver, man
   kan markere med initialer — og det skal fremstå flot og pænt."*

   Cheferne har deres lister i forvejen: rengøringsplaner, åbne- og
   lukkelister, egenkontrol-skemaer. De er lavet til papir — med
   titel, overskrifter, tabeller med ugedage og "Sign.", felter til
   "Uge: ____" og "Side 1 af 2". Læseren her finder opgaverne i det:

   - TITLEN (den største tekst øverst) bliver listens navn.
   - OVERSKRIFTER (større/fed tekst, "Lukning:", VERSALER) bliver
     afsnit i listen.
   - TABELLER: første kolonne er opgaven; kolonner med ugedage,
     afkrydsningsfelter, "Sign.", "Initialer" og "Dato" er papirets
     egne felter og springes over — det er dem, systemet nu laver.
   - STØJ: sidetal, gentagne sidehoveder, "Uge: ____", "Kontrolleret
     af: ____", tabelhoveder og tomme linjer forsvinder.
   - En opgave, der fortsætter på næste linje, bliver én opgave.

   Ud kommer { titel, afsnit: [{ navn, opgaver: [{ tekst, vaerdi }] }] } — og
   (vaerdi = "Temp. °C", når opgaven stod i en tabel med en måling)
   cheferne ser det, før det gemmes, og kan rette alt.

   Værktøjerne ligger i js/vendor/ (licenserne ved siden af) og
   hentes først, når en fil vælges.
   ============================================================ */
(function () {
  'use strict';

  var VAERKTOEJ = {
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
      s.onerror = function () {
        delete hentede[url];
        nej(new Error('Værktøjet til at læse filen kunne ikke hentes. Tjek nettet, og prøv igen.'));
      };
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

  // ----------------------------------------------------------
  //  ORDENE, DER HØRER PAPIRET TIL — IKKE OPGAVEN
  // ----------------------------------------------------------
  var DAGE = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn', 'mandag', 'tirsdag', 'onsdag', 'torsdag',
    'fredag', 'lørdag', 'søndag', 'ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'];
  var FELTORD = ['opgave', 'opgaver', 'sign', 'sign.', 'signatur', 'initialer', 'init', 'init.', 'dato', 'uge',
    'ugenr', 'uge nr', 'udført', 'ok', 'ja', 'nej', 'tid', 'kl', 'kl.', 'klokken', 'ansvarlig', 'bemærkning',
    'bemærkninger', 'note', 'noter', 'frekvens', 'hvornår', 'hvem', 'nr', 'nr.', '#', 'x', '✓', '✔', 'status',
    'underskrift', 'kontrol', 'kontrolleret', 'temp', 'temp.', 'temperatur', '°c', 'c'].concat(DAGE);
  var BOKS = /^[\s☐□■▢❑❒◻◼○●□✓✔✗✘xX\[\]()_.\-–—|]*$/;

  function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  function lille(t) { return norm(t).toLowerCase(); }
  function erFeltord(t) {
    var s = lille(t).replace(/[:.]$/, '');
    if (!s || BOKS.test(s) || FELTORD.indexOf(s) !== -1 || /^\d{1,2}$/.test(s)) return true;
    // "Man Tir" / "Ons Tor Fre Lør Søn" — flere kolonnehoveder i én celle.
    var ord = s.split(/[\s\/|]+/).map(function (o) { return o.replace(/[:.]$/, ''); }).filter(Boolean);
    return ord.length > 1 && ord.every(function (o) { return FELTORD.indexOf(o) !== -1 || /^\d{1,2}$/.test(o); });
  }
  var FULDE_DAGE = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag', 'dagligt',
    'ugentligt', 'månedligt', 'hver dag', 'hver uge'];
  // I en opgavelinje er "Mandag" en oplysning (hvornår) — i et tabelhoved er det en kolonne.
  function erOplysning(t) { return FULDE_DAGE.indexOf(lille(t).replace(/[:.]$/, '')) !== -1; }
  function ligner(a, b) {
    var f = function (x) {
      return lille(x).replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/[^a-z0-9]/g, '');
    };
    return f(a) && f(a) === f(b);
  }
  function punkt(t) { return /^\s*([•·\-–—*▪◦►‣⁃☐□▢❑❒◻]|\d{1,3}[.)])\s+/.test(String(t || '')); }
  function erStoej(t) {
    var s = lille(t);
    if (!s || s.length < 2) return true;
    if (BOKS.test(s)) return true;
    if (/^side\s*\d+(\s*(af|\/|of)\s*\d+)?$/.test(s)) return true;          // Side 1 af 2
    if (/^\d+(\s*[\/|]\s*\d+)?$/.test(s)) return true;                     // 1 / 2
    if (/_{3,}|\.{5,}/.test(s)) return true;                               // Uge: ______
    if (/^(dato|uge|ugenr|uge nr|initialer|underskrift|sign|kontrolleret af|ansvarlig|udfyldt af|godkendt af)\b[^a-zæøå]*$/.test(s)) return true;
    if (/^(revideret|version|udskrevet|printet|opdateret)\b/.test(s)) return true;
    if (/\b(revideret|version|udskrevet|printet|opdateret)\b.*\d/.test(s)) return true;  // "… · Revideret 01.10.2026"
    if (/^\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}$/.test(s)) return true;       // 03.11.2026
    return false;
  }
  function rensPunkt(t) {
    return norm(t)
      .replace(/^([•·\-–—*▪◦►‣⁃☐□■▢❑❒◻✓✔]|\[\s?[xX]?\s?\]|\(\s?\)|\d{1,3}[.)]|[a-zA-Z][.)])\s+/, '')
      .replace(/^[☐□▢❑❒◻]\s*/, '')
      .replace(/[\s☐□▢❑❒◻_]+$/, '')
      .trim();
  }
  function versaler(t) {
    var b = t.replace(/[^A-Za-zÆØÅæøå]/g, '');
    return b.length >= 3 && b === b.toUpperCase();
  }

  /* ----------------------------------------------------------
     STRUKTUREN: linjer → { titel, afsnit }
     En linje er { tekst, celler, str, fed, side, y, x, overskrift? }.
     ---------------------------------------------------------- */
  function strukturer(linjer, kilde) {
    linjer = linjer.filter(function (l) { return norm(l.tekst); });

    // Gentagne sidehoveder og -fødder: samme tekst på flere sider.
    var sider = {};
    linjer.forEach(function (l) { sider[l.side || 1] = true; });
    var antalSider = Object.keys(sider).length;
    var set = {};
    linjer.forEach(function (l) {
      var k = lille(l.tekst);
      set[k] = set[k] || {};
      set[k][l.side || 1] = true;
    });
    var førsteGang = {};
    linjer = linjer.filter(function (l) {
      var k = lille(l.tekst);
      if (antalSider > 1 && Object.keys(set[k]).length > 1) {
        if (førsteGang[k]) return false;   // kun første gang
        førsteGang[k] = true;
      }
      return true;
    });

    // Brødtekstens størrelse (median), så overskrifter kan kendes.
    var str = linjer.map(function (l) { return l.str; }).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
    var brød = str.length ? str[Math.floor(str.length / 2)] : 0;
    var størst = str.length ? str[str.length - 1] : 0;

    var titel = null;
    var afsnit = [];
    var nu = { navn: '', opgaver: [] };
    afsnit.push(nu);
    var forrige = null;   // forrige opgave-linje (til fortsættelser)
    var aktivMaaling = null;  // "Temp. °C", mens vi er i en tabel med en måling
    var HOVEDORD = ['enhed', 'beskrivelse', 'område', 'emne', 'punkt', 'aktivitet', 'handling', 'hvad',
      'udstyr', 'sted', 'vare', 'produkt', 'kontrolpunkt'];

    linjer.forEach(function (l, i) {
      var celler = (l.celler && l.celler.length ? l.celler : [l.tekst]).map(norm).filter(Boolean);
      // Tabelhoved: kun papirets egne ord ("Opgave | Man | Tir | … | Sign.").
      // Et tabelhoved med en måling ("Temp. °C"): rækkerne under får et felt til tallet.
      var maaling = celler.length > 1 && celler.slice(1).some(function (c) { return /temp|°\s?c|grader|måling|værdi/i.test(c); })
        ? norm(celler.slice(1).filter(function (c) { return /temp|°\s?c|grader|måling|værdi/i.test(c); })[0]) : null;
      if (celler.length > 1 && (celler.every(erFeltord)
          || (celler.slice(1).every(erFeltord) && (l.fed || HOVEDORD.indexOf(lille(celler[0]).replace(/[:.]$/, '')) !== -1)))) {
        aktivMaaling = maaling;
        return;
      }
      // Undertitlen lige under titlen (mindre end brødteksten, før første afsnit).
      if (titel && brød && l.str && l.str < brød * 0.95 && afsnit.length === 1 && !nu.opgaver.length) return;
      // Papirets felter ("Uge: ____") og sidetal.
      if (erStoej(l.tekst)) return;
      var meningsfulde = celler.filter(function (c) { return erOplysning(c) || (!erFeltord(c) && !erStoej(c)); });
      if (!meningsfulde.length) return;

      var tekst = rensPunkt(meningsfulde[0]);
      if (meningsfulde.length > 1 && meningsfulde.length <= 3) {
        // "Rengør fritureolie | Mandag" → "Rengør fritureolie – Mandag"
        tekst = rensPunkt(meningsfulde.join(' – '));
      }
      if (!tekst || tekst.length < 2) return;

      var kort = tekst.length <= 60 && tekst.split(' ').length <= 9 && !/[.!?]$/.test(tekst);
      var stor = brød && l.str && l.str >= brød * 1.15;
      var erOverskrift = l.overskrift === true
        || (kort && celler.length === 1 && (stor || l.fed || versaler(tekst) || /:$/.test(tekst)));
      if (l.overskrift === false) erOverskrift = false;

      // Den første korte linje er titlen, når den hedder som filen, eller
      // når det, der følger, er punkter ("Lukning" · "- Sluk grillen" …).
      if (!erOverskrift && !titel && kort && celler.length === 1 && !punkt(l.tekst)
          && !afsnit.some(function (a) { return a.opgaver.length; })) {
        var naeste = linjer.slice(i + 1, i + 4).filter(function (x) { return norm(x.tekst) && !erStoej(x.tekst); });
        if ((kilde && ligner(tekst, kilde.replace(/\.[^.]+$/, '')))
            || (naeste.length >= 2 && naeste.every(function (x) { return punkt(x.tekst); }))) {
          titel = tekst.replace(/:$/, '');
          return;
        }
      }

      if (erOverskrift) {
        var navn = tekst.replace(/:$/, '').trim();
        // Titlen: den største tekst, før der er kommet nogen opgaver.
        if (!titel && (l.titel || (stor && l.str >= størst * 0.98)) && !afsnit.some(function (a) { return a.opgaver.length; })) {
          titel = navn;
          forrige = null;
          return;
        }
        nu = { navn: navn, opgaver: [] };
        aktivMaaling = null;
        afsnit.push(nu);
        forrige = null;
        return;
      }

      // Fortsættelse af forrige opgave: starter med lille bogstav, og
      // linjen før sluttede ikke en sætning.
      var fortsætter = forrige && /^[a-zæøå(]/.test(tekst) && !/^[•·\-–—*]/.test(norm(meningsfulde[0]))
        && !/[.!?:]$/.test(forrige.tekst)
        && (l.side || 1) === (forrige.side || 1)
        && (!l.y || !forrige.y || Math.abs(forrige.y - l.y) <= (l.str || 12) * 2.2);
      if (fortsætter) {
        var sidste = nu.opgaver.length - 1;
        nu.opgaver[sidste].tekst = (nu.opgaver[sidste].tekst + ' ' + tekst).slice(0, 300);
        forrige = { tekst: nu.opgaver[sidste].tekst, side: l.side, y: l.y };
        return;
      }

      if (nu.opgaver.length && nu.opgaver[nu.opgaver.length - 1].tekst === tekst) return;
      nu.opgaver.push({ tekst: tekst.slice(0, 300), vaerdi: aktivMaaling });
      forrige = { tekst: tekst, side: l.side, y: l.y };
    });

    afsnit = afsnit.filter(function (a) { return a.opgaver.length; });
    // Én afsnit uden navn + intet andet = bare en liste.
    if (!titel && kilde) titel = kilde.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    return { titel: (titel || '').slice(0, 80), afsnit: afsnit };
  }

  // ----------------------------------------------------------
  //  FORMATERNE → LINJER
  // ----------------------------------------------------------
  function fraTekst(tekst) {
    return String(tekst || '').split(/\r?\n/).map(function (t) {
      var md = /^#{1,6}\s+(.*)$/.exec(t.trim());
      return md ? { tekst: md[1], overskrift: true } : { tekst: t };
    });
  }

  function fraCsv(tekst) {
    return String(tekst || '').split(/\r?\n/).map(function (l) {
      var celler = l.split(/[;\t]|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(function (c) {
        return c.replace(/^"|"$/g, '').trim();
      });
      return { tekst: celler.filter(Boolean).join(' '), celler: celler.filter(Boolean) };
    });
  }

  function fraDocx(buf) {
    return script(VAERKTOEJ.jszip).then(function () {
      return window.JSZip.loadAsync(buf);
    }).then(function (zip) {
      var f = zip.file('word/document.xml');
      if (!f) throw new Error('Word-filen kunne ikke læses.');
      return f.async('string');
    }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, 'application/xml');
      var W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
      var krop = doc.getElementsByTagNameNS(W, 'body')[0];
      var linjer = [];
      function tekstAf(el) {
        var ts = el.getElementsByTagNameNS(W, 't');
        var s = '';
        for (var j = 0; j < ts.length; j++) s += ts[j].textContent;
        return s;
      }
      function afsnitLinje(p) {
        var stil = p.getElementsByTagNameNS(W, 'pStyle')[0];
        var navn = stil ? String(stil.getAttributeNS(W, 'val') || stil.getAttribute('w:val') || '') : '';
        var runs = p.getElementsByTagNameNS(W, 'r');
        var fed = runs.length > 0;
        var sz = 0;
        for (var i = 0; i < runs.length; i++) {
          if (!norm(tekstAf(runs[i]))) continue;
          if (!runs[i].getElementsByTagNameNS(W, 'b').length) fed = false;
          var s = runs[i].getElementsByTagNameNS(W, 'sz')[0];
          if (s) sz = Math.max(sz, Number(s.getAttributeNS(W, 'val') || s.getAttribute('w:val')) / 2 || 0);
        }
        var l = { tekst: tekstAf(p), fed: fed, str: sz || 11 };
        if (/^(title|titel)/i.test(navn)) { l.overskrift = true; l.titel = true; }
        else if (/heading|overskrift/i.test(navn)) l.overskrift = true;
        return l;
      }
      Array.prototype.forEach.call(krop ? krop.childNodes : [], function (n) {
        if (n.localName === 'p') linjer.push(afsnitLinje(n));
        if (n.localName === 'tbl') {
          Array.prototype.forEach.call(n.getElementsByTagNameNS(W, 'tr'), function (tr) {
            var celler = Array.prototype.map.call(tr.getElementsByTagNameNS(W, 'tc'), tekstAf);
            linjer.push({ tekst: celler.join(' '), celler: celler, str: 11, overskrift: false });
          });
        }
      });
      return linjer;
    });
  }

  function fraExcel(buf) {
    return script(VAERKTOEJ.xlsx).then(function () {
      var bog = window.XLSX.read(buf, { type: 'array' });
      var linjer = [];
      bog.SheetNames.forEach(function (n, i) {
        // Flere ark = flere afsnit (arkets navn).
        if (bog.SheetNames.length > 1) linjer.push({ tekst: n, overskrift: true });
        window.XLSX.utils.sheet_to_json(bog.Sheets[n], { header: 1, blankrows: false }).forEach(function (r) {
          var celler = (r || []).map(function (c) { return norm(c == null ? '' : c); });
          if (celler.some(Boolean)) linjer.push({ tekst: celler.filter(Boolean).join(' '), celler: celler.filter(Boolean), side: i + 1 });
        });
      });
      return linjer;
    });
  }

  function fraPdf(buf) {
    return script(VAERKTOEJ.pdf).then(function () {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = VAERKTOEJ.pdfWorker;
      return window.pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (pdf) {
      var sider = [];
      for (var i = 1; i <= pdf.numPages; i++) sider.push(side(pdf, i));
      return Promise.all(sider).then(function (alle) {
        return [].concat.apply([], alle);
      });
    });
  }
  function side(pdf, nr) {
    return pdf.getPage(nr).then(function (p) {
      // Skrifttypernes navne (for at se "Bold"), når de kan nås.
      return p.getOperatorList().catch(function () { return null; }).then(function () {
        return p.getTextContent();
      }).then(function (indhold) {
        function fedSkrift(fn) {
          try {
            var f = p.commonObjs.get(fn);
            return /bold|black|heavy|semibold|demi/i.test(String((f && (f.name || f.loadedName)) || ''));
          } catch (e) { return false; }
        }
        var stykker = indhold.items.filter(function (it) { return norm(it.str); }).map(function (it) {
          var t = it.transform;
          return { s: it.str, x: t[4], y: t[5], w: it.width || 0, str: Math.hypot(t[2], t[3]) || Math.abs(t[3]) || 10,
            fed: fedSkrift(it.fontName) };
        });
        // Rækker: samme højde (inden for en halv skriftstørrelse).
        stykker.sort(function (a, b) { return b.y - a.y || a.x - b.x; });
        var rækker = [];
        stykker.forEach(function (s) {
          var r = rækker[rækker.length - 1];
          if (r && Math.abs(r.y - s.y) <= Math.max(2, s.str * 0.5)) r.dele.push(s);
          else rækker.push({ y: s.y, dele: [s] });
        });
        return rækker.map(function (r) {
          r.dele.sort(function (a, b) { return a.x - b.x; });
          // Celler: et tydeligt hul mellem to stykker tekst.
          var celler = [];
          var cur = null;
          r.dele.forEach(function (d) {
            if (cur && d.x - (cur.slut) <= d.str * 1.2) {
              cur.tekst += (/\s$/.test(cur.tekst) || /^\s/.test(d.s) ? '' : (d.x - cur.slut > d.str * 0.15 ? ' ' : '')) + d.s;
              cur.slut = d.x + d.w;
            } else {
              cur = { tekst: d.s, slut: d.x + d.w, x: d.x };
              celler.push(cur);
            }
          });
          var maks = Math.max.apply(null, r.dele.map(function (d) { return d.str; }));
          return {
            tekst: celler.map(function (c) { return c.tekst; }).join(' '),
            celler: celler.map(function (c) { return c.tekst; }),
            str: Math.round(maks * 10) / 10,
            fed: r.dele.every(function (d) { return d.fed; }),
            side: nr, y: r.y, x: celler.length ? celler[0].x : 0,
          };
        });
      });
    });
  }

  function laesFil(fil) {
    var navn = (fil.name || '').toLowerCase();
    var kilde = fil.name || '';
    if (/\.pdf$/.test(navn) || fil.type === 'application/pdf') {
      return som(fil).then(fraPdf).then(function (l) { return strukturer(l, kilde); });
    }
    if (/\.docx$/.test(navn)) {
      return som(fil).then(fraDocx).then(function (l) { return strukturer(l, kilde); });
    }
    if (/\.(xlsx|xls|ods)$/.test(navn)) {
      return som(fil).then(fraExcel).then(function (l) { return strukturer(l, kilde); });
    }
    if (/\.csv$/.test(navn)) {
      return som(fil, 'tekst').then(fraCsv).then(function (l) { return strukturer(l, kilde); });
    }
    if (/\.(txt|md|text)$/.test(navn) || /^text\//.test(fil.type)) {
      return som(fil, 'tekst').then(fraTekst).then(function (l) { return strukturer(l, kilde); });
    }
    if (/^image\//.test(fil.type)) {
      return Promise.reject(new Error('Et billede kan ikke læses automatisk. På iPad\'en: åbn billedet, '
        + 'hold fingeren på teksten → "Vælg alt" → "Kopiér", og sæt det ind under "Skriv selv".'));
    }
    if (/\.doc$/.test(navn)) {
      return Promise.reject(new Error('Den gamle Word-type (.doc) kan ikke læses. Gem den som PDF eller .docx '
        + '(Arkiv → Gem som), eller kopiér teksten ind under "Skriv selv".'));
    }
    return Promise.reject(new Error('Den filtype kan ikke læses. Brug PDF, Word (.docx), Excel eller tekst.'));
  }

  Admin.opgaveLaeser = {
    laesFil: laesFil,
    fraTekst: function (t, kilde) { return strukturer(fraTekst(t), kilde); },
    strukturer: strukturer,
  };
}());
