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

   Ud kommer { titel, periode: { fra, til }, afsnit: [{ navn, ugedag, dato,
   opgaver: [{ tekst, vaerdi, ugedag, dato }] }] } — og
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
     PERIODER OG UGEDAGE (4/11). Mikkel: *"og hvad hvis det er en uge
     frem, han laver dem, eller 5 dage frem eller 2 uger?"* Står der
     "uge 46-47", "10/11 - 23/11" eller "10.-14. november", gælder
     listen kun de dage. En overskrift som "Mandag" eller "Fredag 13/11"
     — eller en tabelcelle med en ugedag — giver opgaver, der kun står
     den dag.
     ---------------------------------------------------------- */
  var MDR = { jan: 1, januar: 1, feb: 2, februar: 2, mar: 3, marts: 3, apr: 4, april: 4, maj: 5, jun: 6, juni: 6,
    jul: 7, juli: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11,
    dec: 12, december: 12 };
  var MDR_RE = '(jan(?:uar)?|feb(?:ruar)?|mar(?:ts)?|apr(?:il)?|maj|juni?|juli?|aug(?:ust)?|sep(?:t(?:ember)?)?|okt(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  var UGEDAG = { mandag: 1, man: 1, tirsdag: 2, tir: 2, onsdag: 3, ons: 3, torsdag: 4, tor: 4, fredag: 5, fre: 5,
    lørdag: 6, lør: 6, søndag: 7, søn: 7 };
  function dagsDato() { try { return Butik.nu().dato; } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function plus(d, n) { var x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function iso(y, m, d) { return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d; }
  function gyldig(y, m, d) { var x = new Date(Date.UTC(y, m - 1, d)); return x.getUTCMonth() === m - 1 && x.getUTCDate() === d; }
  // Uden årstal: det nærmeste år, så datoen ikke ligger langt tilbage.
  function aarFor(m, d) {
    var nu = dagsDato(); var y = Number(nu.slice(0, 4));
    return iso(y, m, d) < plus(nu, -60) ? y + 1 : y;
  }
  function fuldtAar(a) { a = Number(a); return a < 100 ? 2000 + a : a; }
  function ugeMandag(uge, aar) {
    var jan4 = new Date(Date.UTC(aar, 0, 4));
    var dow = (jan4.getUTCDay() + 6) % 7;
    jan4.setUTCDate(jan4.getUTCDate() - dow + (uge - 1) * 7);
    return jan4.toISOString().slice(0, 10);
  }
  function ugeNr(d) {
    var x = new Date(d + 'T12:00:00Z');
    var t = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    var aar = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - aar) / 864e5 + 1) / 7);
  }
  function findPeriode(tekst) {
    var s = lille(tekst);
    var m = /(?:^|[^a-zæøå])uge(?:rne|r|n)?\s*(\d{1,2})(?:\s*(?:-|–|og|til|\+|&)\s*(?:uge\s*)?(\d{1,2}))?(?![\d])/.exec(s);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= 53) {
      var u1 = Number(m[1]), u2 = m[2] ? Number(m[2]) : u1;
      var nu = dagsDato(), aar = Number(nu.slice(0, 4));
      if (u1 < ugeNr(nu) - 8) aar += 1;
      var fra = ugeMandag(u1, aar);
      var til = plus(ugeMandag(u2 >= u1 ? u2 : u1, aar), 6);
      return { fra: fra, til: til, match: m[0] };
    }
    m = /(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\s*(?:-|–|til)\s*(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/.exec(s);
    if (m) {
      var y1 = m[3] ? fuldtAar(m[3]) : aarFor(+m[2], +m[1]);
      var y2 = m[6] ? fuldtAar(m[6]) : (+m[5] < +m[2] ? y1 + 1 : y1);
      if (gyldig(y1, +m[2], +m[1]) && gyldig(y2, +m[5], +m[4])) {
        return { fra: iso(y1, +m[2], +m[1]), til: iso(y2, +m[5], +m[4]), match: m[0] };
      }
    }
    m = new RegExp('(\\d{1,2})\\.?\\s*(?:' + MDR_RE + '\\.?\\s*)?(?:-|–|til)\\s*(\\d{1,2})\\.?\\s*' + MDR_RE).exec(s);
    if (m) {
      var m2 = MDR[m[4]] || MDR[m[4].slice(0, 3)], m1 = m[2] ? (MDR[m[2]] || MDR[m[2].slice(0, 3)]) : m2;
      var a1 = aarFor(m1, +m[1]), a2 = m2 < m1 ? a1 + 1 : a1;
      if (gyldig(a1, m1, +m[1]) && gyldig(a2, m2, +m[3])) {
        return { fra: iso(a1, m1, +m[1]), til: iso(a2, m2, +m[3]), match: m[0] };
      }
    }
    return null;
  }
  // "Mandag", "Fredag 13/11", "tirsdag d. 10. november" — hele teksten er en dag.
  function findDag(tekst) {
    var s = lille(tekst).replace(/[:.!]+$/, '').trim();
    var m = new RegExp('^(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag|man|tir|ons|tor|fre|lør|søn)\\.?'
      + '(?:\\s*(?:den\\s+|d\\.\\s*)?(?:(\\d{1,2})[./](\\d{1,2})(?:[./](\\d{2,4}))?|(\\d{1,2})\\.?\\s*' + MDR_RE + '))?$').exec(s);
    if (!m) return null;
    var ud = { ugedag: UGEDAG[m[1]] };
    var d = m[2] ? +m[2] : (m[5] ? +m[5] : null);
    var mm = m[3] ? +m[3] : (m[6] ? (MDR[m[6]] || MDR[m[6].slice(0, 3)]) : null);
    if (d && mm) {
      var y = m[4] ? fuldtAar(m[4]) : aarFor(mm, d);
      if (gyldig(y, mm, d)) ud.dato = iso(y, mm, d);
    }
    return ud;
  }
  function stort(t) { t = norm(t); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

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

    var periode = null;

    linjer.forEach(function (l, i) {
      var celler = (l.celler && l.celler.length ? l.celler : [l.tekst]).map(norm).filter(Boolean);
      var forrigeLinje = linjer[i - 1];
      // Luft over linjen: en tom linje i Word, et hul i en PDF.
      var luft = l.efterTom || i === 0 || (forrigeLinje && l.y && forrigeLinje.y && (l.side || 1) === (forrigeLinje.side || 1)
        && forrigeLinje.y - l.y > (l.str || 11) * 1.9);

      // Perioden ("gælder uge 46-47", "10/11 - 23/11") — kun øverst i dokumentet.
      if (!periode && !afsnit.some(function (a) { return a.opgaver.length; })) {
        var p = findPeriode(l.tekst);
        if (p) {
          periode = { fra: p.fra, til: p.til, tekst: norm(l.tekst) };
          var rest = lille(l.tekst).replace(p.match, '').replace(/\b(gælder|gaelder|for|fra|periode|perioden|i|plan|uge|ugerne)\b/g, '')
            .replace(/[^a-zæøå]/g, '');
          if (rest.length < 4 && titel) return;          // linjen ER perioden
          if (rest.length < 4 && !titel && !l.titel && !(brød && l.str >= brød * 1.15)) return;
        }
      }
      // En dag som overskrift: "Mandag", "Fredag 13/11:".
      var dagHoved = celler.length === 1 && findDag(celler[0]);
      if (dagHoved) {
        nu = { navn: stort(celler[0].replace(/:$/, '')), opgaver: [], ugedag: dagHoved.ugedag, dato: dagHoved.dato || null };
        aktivMaaling = null;
        afsnit.push(nu);
        forrige = null;
        return;
      }
      // Hilsner og "ring til mig": noter, ikke opgaver.
      if (/^(mvh|vh|med venlig hilsen|hilsen|kh)\b/.test(lille(l.tekst))
          || /\bring\b.*\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/.test(lille(l.tekst))) return;
      // "Temp køleskab: ______   fryser: ______" → én opgave pr. felt, med et felt til tallet.
      if (/_{3,}|\.{5,}/.test(l.tekst)) {
        var maal = /temp|grad|°/i.test(l.tekst) ? 'Temp. °C' : 'Værdi';
        var dele = l.tekst.split(/_{3,}|\.{5,}/).map(function (x) { return rensPunkt(x).replace(/[:\s]+$/, '').trim(); })
          .filter(function (x) {
            return x.replace(/[^A-Za-zÆØÅæøå]/g, '').length >= 3
              && !/^(dato|uge|ugenr|uge nr|initialer|underskrift|sign|signatur|kontrolleret af|ansvarlig|udfyldt af|godkendt af|navn|kl)\b/i.test(x);
          });
        if (dele.length && !/^(dato|uge|initialer|underskrift|sign|kontrolleret|ansvarlig|udfyldt|godkendt)/i.test(lille(l.tekst))) {
          dele.forEach(function (x) {
            nu.opgaver.push({ tekst: stort(x).slice(0, 300), vaerdi: maal, ugedag: nu.ugedag || null, dato: nu.dato || null });
          });
          forrige = null;
          return;
        }
      }
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
      // "Rengør fritureolie | Mandag" → opgaven står kun om mandagen.
      var raekkeDag = null;
      if (meningsfulde.length > 1) {
        var dagCelle = meningsfulde.filter(function (c) { return findDag(c); })[0];
        if (dagCelle) {
          raekkeDag = findDag(dagCelle);
          meningsfulde = meningsfulde.filter(function (c) { return c !== dagCelle; });
        }
      }

      var tekst = rensPunkt(meningsfulde[0]);
      if (meningsfulde.length > 1 && meningsfulde.length <= 3) {
        // "Rengør fritureolie | Mandag" → "Rengør fritureolie – Mandag"
        tekst = rensPunkt(meningsfulde.join(' – '));
      }
      if (!tekst || tekst.length < 2) return;

      var kort = tekst.length <= 60 && tekst.split(' ').length <= 9 && !/[.!?]$/.test(tekst);
      var stor = brød && l.str && l.str >= brød * 1.15;
      // Fed alene er ikke nok — Jim fremhæver også en vigtig opgave. Der skal være luft over.
      var erOverskrift = l.overskrift === true
        || (kort && celler.length === 1 && (stor || (l.fed && luft) || versaler(tekst) || /:$/.test(tekst)));
      if (l.overskrift === false) erOverskrift = false;

      // Den første korte linje er titlen, når den hedder som filen, eller
      // når det, der følger, er punkter ("Lukning" · "- Sluk grillen" …).
      if (!erOverskrift && !titel && kort && celler.length === 1 && !punkt(l.tekst)
          && !afsnit.some(function (a) { return a.opgaver.length; })) {
        // Perioden ("gælder uge 46-47") og en overskrift ("ÅBNING") må stå imellem.
        var naeste = linjer.slice(i + 1, i + 5).filter(function (x) {
          return norm(x.tekst) && !erStoej(x.tekst) && !findPeriode(x.tekst);
        }).slice(0, 3);
        var hoved = function (x) { var t = norm(x.tekst); return t.length <= 40 && (versaler(t) || /:$/.test(t) || !!findDag(t)); };
        if ((kilde && ligner(tekst, kilde.replace(/\.[^.]+$/, '')))
            || (naeste.length >= 2 && naeste.every(function (x) { return punkt(x.tekst) || hoved(x); })
                && naeste.some(function (x) { return punkt(x.tekst); }))) {
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
        && l.y && forrige.y && Math.abs(forrige.y - l.y) <= (l.str || 12) * 2.2;   // kun i en PDF
      if (fortsætter) {
        var sidste = nu.opgaver.length - 1;
        nu.opgaver[sidste].tekst = (nu.opgaver[sidste].tekst + ' ' + tekst).slice(0, 300);
        forrige = { tekst: nu.opgaver[sidste].tekst, side: l.side, y: l.y };
        return;
      }

      if (nu.opgaver.length && nu.opgaver[nu.opgaver.length - 1].tekst === tekst) return;
      nu.opgaver.push({ tekst: tekst.slice(0, 300), vaerdi: aktivMaaling,
        ugedag: raekkeDag ? raekkeDag.ugedag : (nu.ugedag || null),
        dato: raekkeDag ? (raekkeDag.dato || null) : (nu.dato || null) });
      forrige = { tekst: tekst, side: l.side, y: l.y };
    });

    afsnit = afsnit.filter(function (a) { return a.opgaver.length; });
    // Én afsnit uden navn + intet andet = bare en liste.
    if (!titel && kilde) titel = kilde.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    // Datoer i dag-afsnittene uden en periode: perioden er fra første til sidste dato.
    var datoer = [];
    afsnit.forEach(function (a) { a.opgaver.forEach(function (o) { if (o.dato) datoer.push(o.dato); }); });
    if (!periode && datoer.length) {
      datoer.sort();
      periode = { fra: datoer[0], til: datoer[datoer.length - 1], tekst: '' };
    }
    return { titel: (titel || '').slice(0, 80), afsnit: afsnit, periode: periode };
  }

  // ----------------------------------------------------------
  //  FORMATERNE → LINJER
  // ----------------------------------------------------------
  function fraTekst(tekst) {
    var tom = true;
    return String(tekst || '').split(/\r?\n/).map(function (t) {
      var md = /^#{1,6}\s+(.*)$/.exec(t.trim());
      var l = md ? { tekst: md[1], overskrift: true } : { tekst: t };
      l.efterTom = tom;
      tom = !norm(t);
      return l;
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
      var tom = true;
      Array.prototype.forEach.call(krop ? krop.childNodes : [], function (n) {
        if (n.localName === 'p') {
          var l = afsnitLinje(n);
          l.efterTom = tom;
          tom = !norm(l.tekst);
          linjer.push(l);
        }
        if (n.localName === 'tbl') {
          Array.prototype.forEach.call(n.getElementsByTagNameNS(W, 'tr'), function (tr) {
            var celler = Array.prototype.map.call(tr.getElementsByTagNameNS(W, 'tc'), tekstAf);
            linjer.push({ tekst: celler.join(' '), celler: celler, str: 11, overskrift: false });
          });
          tom = false;
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

  /* ----------------------------------------------------------
     HJERNEN (4/11, supabase/funktioner/laes-opgaver.ts). Mikkel: *"det
     skal være en hjerne, der læser dokumentet, og hvad Jim sådan vil
     med det, og laver lister ud fra det"*. PDF og billeder sendes, som
     de er (Claude ser siderne); Word/Excel/tekst sendes som tekst med
     overskrifter (##), fed (**) og tabelceller ( | ), så formen følger med.
     Svarer hjernen ikke (ikke sat op, ingen net), bruger admin den
     enkle læser ovenfor — se js/admin/opgaver.js.
     ---------------------------------------------------------- */
  function base64(buf) {
    var b = new Uint8Array(buf), s = '', bid = 0x8000;
    for (var i = 0; i < b.length; i += bid) s += String.fromCharCode.apply(null, b.subarray(i, i + bid));
    return btoa(s);
  }
  // Et foto fra iPad'en er 3–5 MB; 2000 px på den lange led er nok til at læse det.
  function mindreBillede(fil) {
    return new Promise(function (ja, nej) {
      var url = URL.createObjectURL(fil);
      var img = new Image();
      img.onload = function () {
        var f = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * f);
        c.height = Math.round(img.naturalHeight * f);
        var g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ja(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.onerror = function () { URL.revokeObjectURL(url); nej(new Error('Billedet kunne ikke åbnes.')); };
      img.src = url;
    });
  }
  function somTekst(linjer) {
    return linjer.map(function (l) {
      var t = l.celler && l.celler.length > 1 ? l.celler.map(norm).join(' | ') : norm(l.tekst);
      if (!t) return '';
      if (l.overskrift) return '## ' + t;
      if (l.fed) return '**' + t + '**';
      return t;
    }).join('\n').replace(/\n{3,}/g, '\n\n');
  }
  function tilHjernen(fil) {
    var navn = (fil.name || '').toLowerCase();
    var ud = { navn: fil.name || 'dokument' };
    if (/\.pdf$/.test(navn) || fil.type === 'application/pdf') {
      return som(fil).then(function (b) { ud.mime = 'application/pdf'; ud.data = base64(b); return ud; });
    }
    if (/^image\//.test(fil.type) || /\.(jpe?g|png|heic|heif|webp|gif)$/.test(navn)) {
      return mindreBillede(fil).then(function (d) { ud.mime = 'image/jpeg'; ud.data = d; return ud; });
    }
    var linjer = /\.docx$/.test(navn) ? som(fil).then(fraDocx)
      : /\.(xlsx|xls|ods)$/.test(navn) ? som(fil).then(fraExcel)
      : /\.csv$/.test(navn) ? som(fil, 'tekst').then(fraCsv)
      : (/\.(txt|md|text)$/.test(navn) || /^text\//.test(fil.type)) ? som(fil, 'tekst').then(fraTekst)
      : null;
    if (!linjer) return Promise.reject(new Error('Den filtype kan ikke læses. Brug PDF, Word (.docx), Excel, tekst eller et billede.'));
    return linjer.then(function (l) { ud.tekst = somTekst(l); return ud; });
  }

  /* Hjernens svar → samme form som strukturer(): én pr. liste. */
  function fraHjernen(svar) {
    var gyldigDato = function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : null; };
    var gyldigDag = function (n) { n = Number(n); return n >= 1 && n <= 7 ? n : null; };
    var lister = ((svar && svar.lister) || []).map(function (l) {
      var afsnit = (l.afsnit || []).map(function (a) {
        return {
          navn: norm(a.navn).slice(0, 80), ugedag: gyldigDag(a.ugedag), dato: gyldigDato(a.dato),
          opgaver: (a.opgaver || []).map(function (o) {
            return { tekst: norm(o.tekst).slice(0, 300), vaerdi: norm(o.vaerdi).slice(0, 40) || null,
              ugedag: gyldigDag(o.ugedag), dato: gyldigDato(o.dato) };
          }).filter(function (o) { return o.tekst; }),
        };
      }).filter(function (a) { return a.opgaver.length; });
      var fra = gyldigDato(l.gyldig_fra), til = gyldigDato(l.gyldig_til);
      var dage = (l.ugedage || []).map(gyldigDag).filter(Boolean);
      return {
        titel: norm(l.titel).slice(0, 80),
        afsnit: afsnit,
        periode: fra || til ? { fra: fra, til: til, tekst: norm(l.periode_tekst) } : null,
        ugedage: dage.length && dage.length < 7 ? dage : null,
        ansvarlig: norm(l.ansvarlig_initialer).toUpperCase() || null,
      };
    }).filter(function (l) { return l.afsnit.length; });
    return { forklaring: norm(svar && svar.forklaring), lister: lister };
  }

  // fil → { forklaring, lister } via hjernen. Fejler med e.kode, hvis den ikke svarer.
  function forstaa(fil, ekstra) {
    if (!Butik.skrive || !Butik.skrive.hjerneLaes) {
      var e = new Error('hjerne_slukket'); e.kode = 'hjerne_slukket';
      return Promise.reject(e);
    }
    return tilHjernen(fil).then(function (krop) {
      krop.idag = dagsDato();
      krop.hold = (ekstra && ekstra.hold) || [];
      return Butik.skrive.hjerneLaes(krop);
    }).then(fraHjernen);
  }

  Admin.opgaveLaeser = {
    forstaa: forstaa,
    fraHjernen: fraHjernen,
    laesFil: laesFil,
    fraTekst: function (t, kilde) { return strukturer(fraTekst(t), kilde); },
    strukturer: strukturer,
  };
}());
