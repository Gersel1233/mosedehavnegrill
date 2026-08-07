/* ============================================================
   Mosede Havnegrill & Ishus – datalaget.

   Ét sted der henter data, uanset hvor de kommer fra:

     Er der en anon-nøgle i config.js  →  hent fra Supabase
     Er der ingen nøgle                →  kør videre i browserens
                                          eget lager (localStorage)

   Det andet tilfælde er ikke kun til udvikling. Er databasen nede,
   viser siden stadig noget fornuftigt i stedet for en fejlside.

   Der bruges ingen Supabase-SDK. Almindelig fetch mod deres
   REST-API er nok, og så er der ingen tredjeparts-JavaScript at
   holde opdateret eller stole på.
   ============================================================ */

(function () {
  'use strict';

  var cfg = window.MOSEDE_CLOUD || {};
  var SKY = !!(cfg.url && cfg.anonKey);

  // ----------------------------------------------------------
  //  Tid – altid dansk tid, uanset hvor brugerens telefon står
  //  ----------------------------------------------------------
  //  En turist med telefonen sat til New York skal stadig se om
  //  der er åbent i Greve lige nu. Derfor regnes der aldrig med
  //  browserens egen tidszone.
  // ----------------------------------------------------------
  function nu() {
    var f = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Copenhagen',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    // sv-SE giver "2026-08-07 14:56" – nemt at dele op
    var dele = f.format(new Date()).split(' ');
    var dato = dele[0];
    var tid = dele[1];

    // 0 = mandag ... 6 = søndag (JS regner søndag som 0, vi flytter)
    var ugedag = (new Date(dato + 'T00:00:00Z').getUTCDay() + 6) % 7;

    return {
      dato: dato,
      tid: tid,
      ugedag: ugedag,
      minutter: parseInt(tid.slice(0, 2), 10) * 60 + parseInt(tid.slice(3, 5), 10),
    };
  }

  var UGEDAGE = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

  // "21:00:00" og "21:00" skal begge virke – Postgres sender det
  // ene, admin-formularen det andet.
  function tilMinutter(t) {
    if (!t) return null;
    var d = String(t).split(':');
    return parseInt(d[0], 10) * 60 + parseInt(d[1] || '0', 10);
  }

  function pænTid(t) {
    return t ? String(t).slice(0, 5) : '';
  }

  // ----------------------------------------------------------
  //  STARTDATA – bruges når der ikke er nogen database.
  //  Holdt i samme form som tabellerne, så resten af koden
  //  ikke kan mærke forskel.
  //  ----------------------------------------------------------
  //  OBS: åbningstiderne er de samme gæt som i setup.sql og skal
  //  bekræftes af kunden. Priser står tomme med vilje.
  // ----------------------------------------------------------
  function startdata() {
    var kat = [
      { id: 1, afdeling: 'grill', navn: 'Sandwich', sortering: 1, aktiv: true },
      { id: 2, afdeling: 'grill', navn: 'Burgere', sortering: 2, aktiv: true },
      { id: 3, afdeling: 'grill', navn: 'Fisk', sortering: 3, aktiv: true },
      { id: 4, afdeling: 'grill', navn: 'Klassikere', sortering: 4, aktiv: true },
      { id: 5, afdeling: 'grill', navn: 'Tilbehør', sortering: 5, aktiv: true },
      { id: 6, afdeling: 'is', navn: 'Softice', sortering: 6, aktiv: true },
      { id: 7, afdeling: 'is', navn: 'Kugleis', sortering: 7, aktiv: true },
    ];

    var tider = [];
    for (var i = 0; i < 7; i++) {
      tider.push({ lokation_id: 'mosede', ugedag: i, lukket: false, aabner: '11:00', lukker: '21:00' });
    }

    return {
      lokationer: [{
        id: 'mosede',
        navn: 'Mosede Havnegrill & Ishus',
        adresse: 'Havnevej 20',
        postnr: '2670',
        by: 'Greve',
        telefon: '28871343',
        beskrivelse: 'Grillbar og ishus midt på Mosede Havn – med udsigt over vandet og bådene.',
        aktiv: true,
        sortering: 1,
      }],
      aabningstider: tider,
      lukkedage: [],
      menu_kategorier: kat,
      menu_varer: [
        {
          id: 1, kategori_id: 1, navn: 'Flæskestegssandwich',
          beskrivelse: 'Husets mest omtalte. Sprød flæskesteg, rødkål og agurkesalat.',
          pris: null, fremhaevet: true, udsolgt: false, sortering: 1, aktiv: true,
        },
        {
          id: 2, kategori_id: 1, navn: 'Bøfsandwich',
          beskrivelse: 'Klassisk bøfsandwich med det hele.',
          pris: null, fremhaevet: false, udsolgt: false, sortering: 2, aktiv: true,
        },
      ],
      nyheder: [],
      indstillinger: {
        dagens_besked: { vis: false, tekst: '' },
        saeson: { lukket: false, aabner_igen: '', besked: '' },
        forside_overskrift: 'Grill og is på Mosede Havn',
        kontakt_email: '',
      },
    };
  }

  var NØGLE = 'mosede_data_v1';

  function læsLokalt() {
    try {
      var r = localStorage.getItem(NØGLE);
      if (r) return JSON.parse(r);
    } catch (e) {
      // Privat browsing kan blokere localStorage. Så kører vi
      // videre på startdata i hukommelsen – siden må ikke gå ned.
    }
    return startdata();
  }

  function gemLokalt(d) {
    try {
      localStorage.setItem(NØGLE, JSON.stringify(d));
    } catch (e) { /* se ovenfor */ }
  }

  // ----------------------------------------------------------
  //  Supabase over almindelig fetch
  // ----------------------------------------------------------
  function hoveder(ekstra) {
    var h = {
      apikey: cfg.anonKey,
      Authorization: 'Bearer ' + (sessionStorage.getItem('mosede_token') || cfg.anonKey),
      'Content-Type': 'application/json',
    };
    for (var k in (ekstra || {})) h[k] = ekstra[k];
    return h;
  }

  function hentTabel(navn, forespørgsel) {
    var url = cfg.url + '/rest/v1/' + navn + '?' + (forespørgsel || 'select=*');
    return fetch(url, { headers: hoveder() }).then(function (r) {
      if (!r.ok) throw new Error(navn + ': ' + r.status);
      return r.json();
    });
  }

  // ----------------------------------------------------------
  //  ER DER ÅBENT LIGE NU?
  //  ----------------------------------------------------------
  //  Rækkefølgen betyder noget. Vinterlukket slår alt andet,
  //  en lukkedag slår ugeplanen, og først derefter ser vi på
  //  klokken. Ellers ville en helligdag med "11-21" i ugeplanen
  //  fejlagtigt vise åbent.
  // ----------------------------------------------------------
  function status(d) {
    var t = nu();
    var sæson = (d.indstillinger && d.indstillinger.saeson) || {};

    if (sæson.lukket) {
      return {
        aaben: false,
        overskrift: 'Lukket for sæsonen',
        detalje: sæson.besked || (sæson.aabner_igen ? 'Vi åbner igen ' + sæson.aabner_igen : ''),
      };
    }

    var lukkedag = (d.lukkedage || []).filter(function (l) { return l.dato === t.dato; })[0];
    if (lukkedag) {
      return {
        aaben: false,
        overskrift: 'Lukket i dag',
        detalje: lukkedag.aarsag || '',
        emoji: lukkedag.emoji || '',
      };
    }

    var i_dag = (d.aabningstider || []).filter(function (a) { return a.ugedag === t.ugedag; })[0];
    if (!i_dag || i_dag.lukket) {
      return { aaben: false, overskrift: 'Lukket i dag', detalje: næsteÅbning(d, t) };
    }

    var åbner = tilMinutter(i_dag.aabner);
    var lukker = tilMinutter(i_dag.lukker);

    if (t.minutter < åbner) {
      return {
        aaben: false,
        overskrift: 'Lukket lige nu',
        detalje: 'Vi åbner kl. ' + pænTid(i_dag.aabner),
      };
    }
    if (t.minutter >= lukker) {
      return {
        aaben: false,
        overskrift: 'Lukket for i dag',
        detalje: næsteÅbning(d, t),
      };
    }

    // Sidste halve time skal siges tydeligt – ingen skal cykle
    // ned til havnen forgæves.
    var tilbage = lukker - t.minutter;
    return {
      aaben: true,
      overskrift: 'Åbent nu',
      detalje: tilbage <= 30
        ? 'Vi lukker om ' + tilbage + ' min.'
        : 'Åbent til kl. ' + pænTid(i_dag.lukker),
      snart_lukket: tilbage <= 30,
    };
  }

  // Leder fremad indtil den finder en dag med åbent. Springer
  // lukkedage over. Kigger 8 dage frem – så er hele ugen dækket,
  // og vi undgår en uendelig løkke hvis alt er lukket.
  function næsteÅbning(d, t) {
    for (var n = 1; n <= 8; n++) {
      var dag = new Date(t.dato + 'T00:00:00Z');
      dag.setUTCDate(dag.getUTCDate() + n);
      var iso = dag.toISOString().slice(0, 10);
      var ugedag = (dag.getUTCDay() + 6) % 7;

      var lukket = (d.lukkedage || []).some(function (l) { return l.dato === iso; });
      if (lukket) continue;

      var plan = (d.aabningstider || []).filter(function (a) { return a.ugedag === ugedag; })[0];
      if (!plan || plan.lukket) continue;

      var navn = n === 1 ? 'i morgen' : UGEDAGE[ugedag].toLowerCase();
      return 'Vi åbner ' + navn + ' kl. ' + pænTid(plan.aabner);
    }
    return '';
  }

  // ----------------------------------------------------------
  //  Menukort samlet, klar til visning
  // ----------------------------------------------------------
  function menu(d, afdeling) {
    return (d.menu_kategorier || [])
      .filter(function (k) {
        return k.aktiv !== false && (!afdeling || k.afdeling === afdeling);
      })
      .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); })
      .map(function (k) {
        var varer = (d.menu_varer || [])
          .filter(function (v) { return v.kategori_id === k.id && v.aktiv !== false; })
          .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); });
        return { kategori: k, varer: varer };
      })
      .filter(function (g) { return g.varer.length > 0; });
  }

  function pris(p) {
    if (p === null || p === undefined || p === '') return '';
    var n = Number(p);
    if (!isFinite(n)) return '';
    // 89 → "89 kr."   89.5 → "89,50 kr."
    return (n % 1 === 0 ? String(n) : n.toFixed(2).replace('.', ',')) + ' kr.';
  }

  // ============================================================
  //  AT SKRIVE – kun personalet kommer hertil
  // ============================================================

  // ----------------------------------------------------------
  //  Lag 2 af valideringen.
  //  ----------------------------------------------------------
  //  Lag 1 er formularen (required, min, max). Lag 3 er
  //  databasen, som ikke kan omgås. Dette lag findes for at give
  //  et forståeligt dansk svar i stedet for en rå SQL-fejl.
  //
  //  Reglerne her SKAL svare til dem i setup.sql. Er de mildere,
  //  får personalet en uforståelig fejl fra databasen i stedet.
  // ----------------------------------------------------------
  var tjek = {
    tid: function (t) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t || '').slice(0, 5)); },

    dagensTider: function (r) {
      if (r.lukket) return null;
      if (!tjek.tid(r.aabner) || !tjek.tid(r.lukker)) return 'Udfyld både åbne- og lukketid.';
      if (tilMinutter(r.lukker) <= tilMinutter(r.aabner)) return 'Der skal lukkes efter der er åbnet.';
      return null;
    },

    pris: function (p) {
      if (p === '' || p === null || p === undefined) return null;   // tom pris er tilladt
      var n = Number(String(p).replace(',', '.'));
      if (!isFinite(n)) return 'Prisen skal være et tal.';
      if (n < 0) return 'Prisen kan ikke være negativ.';
      if (n >= 10000) return 'Prisen ser forkert ud – over 10.000 kr.';
      return null;
    },

    navn: function (v, hvad, maks) {
      var s = String(v || '').trim();
      if (!s) return 'Skriv et ' + (hvad || 'navn') + '.';
      if (s.length > (maks || 120)) return 'Højst ' + (maks || 120) + ' tegn.';
      return null;
    },

    dato: function (d) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) return 'Vælg en dato.';
      return null;
    },
  };

  // Prisen kan skrives med komma i formularen, men databasen vil
  // have et punktum. Tom pris skal blive null, ikke 0.
  function talEllerNull(p) {
    if (p === '' || p === null || p === undefined) return null;
    var n = Number(String(p).replace(',', '.'));
    return isFinite(n) ? n : null;
  }

  function skriv(metode, tabel, forespørgsel, krop, flet) {
    var url = cfg.url + '/rest/v1/' + tabel + (forespørgsel ? '?' + forespørgsel : '');
    var ekstra = { Prefer: flet ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal' };

    return fetch(url, {
      method: metode,
      headers: hoveder(ekstra),
      body: krop ? JSON.stringify(krop) : undefined,
    }).then(function (r) {
      if (r.ok) return true;
      return r.text().then(function (t) {
        // Databasens egne afvisninger oversættes til noget en
        // travl medarbejder kan handle på.
        if (r.status === 401 || r.status === 403) {
          throw new Error('Du har ikke adgang til at ændre det. Prøv at logge ud og ind igen.');
        }
        if (/pris_realistisk/.test(t))   throw new Error('Prisen blev afvist – den skal være mellem 0 og 10.000 kr.');
        if (/tider_haenger_sammen/.test(t)) throw new Error('Tiderne blev afvist – der skal lukkes efter der er åbnet.');
        if (/vare_navn_ok|kategori_navn_ok/.test(t)) throw new Error('Navnet blev afvist – det må ikke være tomt.');
        if (/lokation_postnr_gyldigt/.test(t)) throw new Error('Postnummeret skal være fire cifre.');
        if (/duplicate key/.test(t)) throw new Error('Den findes allerede.');
        throw new Error('Kunne ikke gemme (' + r.status + '). ' + t.slice(0, 160));
      });
    });
  }

  function næsteId(liste) {
    return (liste || []).reduce(function (m, r) {
      return Math.max(m, Number(r.id) || 0);
    }, 0) + 1;
  }

  // I lokal tilstand ændres localStorage direkte. Samme
  // funktionsnavne som mod skyen, så admin-siden ikke skal vide
  // hvilken tilstand den kører i.
  function lokalt(ændre) {
    var d = læsLokalt();
    ændre(d);
    gemLokalt(d);
    return Promise.resolve(true);
  }

  var skrive = {
    // Alle syv dage på én gang. Upsert på (lokation_id, ugedag).
    tider: function (lokationId, rækker) {
      var rene = rækker.map(function (r) {
        return {
          lokation_id: lokationId,
          ugedag: Number(r.ugedag),
          lukket: !!r.lukket,
          aabner: r.lukket ? null : String(r.aabner).slice(0, 5),
          lukker: r.lukket ? null : String(r.lukker).slice(0, 5),
        };
      });

      if (!SKY) return lokalt(function (d) { d.aabningstider = rene; });
      return skriv('POST', 'aabningstider', 'on_conflict=lokation_id,ugedag', rene, true);
    },

    lukkedag: function (r) {
      if (!SKY) {
        return lokalt(function (d) {
          d.lukkedage = (d.lukkedage || []).filter(function (l) { return l.dato !== r.dato; });
          d.lukkedage.push({ id: næsteId(d.lukkedage), lokation_id: r.lokation_id, dato: r.dato, aarsag: r.aarsag || null, emoji: r.emoji || null });
        });
      }
      return skriv('POST', 'lukkedage', 'on_conflict=lokation_id,dato', [{
        lokation_id: r.lokation_id, dato: r.dato,
        aarsag: r.aarsag || null, emoji: r.emoji || null,
      }], true);
    },

    sletLukkedag: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.lukkedage = (d.lukkedage || []).filter(function (l) { return String(l.id) !== String(id); });
      });
      return skriv('DELETE', 'lukkedage', 'id=eq.' + encodeURIComponent(id));
    },

    vare: function (v) {
      var ren = {
        kategori_id: Number(v.kategori_id),
        navn: String(v.navn).trim(),
        beskrivelse: v.beskrivelse ? String(v.beskrivelse).trim() : null,
        pris: talEllerNull(v.pris),
        fremhaevet: !!v.fremhaevet,
        udsolgt: !!v.udsolgt,
        sortering: Number(v.sortering) || 0,
        aktiv: v.aktiv !== false,
      };

      if (!SKY) {
        return lokalt(function (d) {
          d.menu_varer = d.menu_varer || [];
          if (v.id) {
            d.menu_varer = d.menu_varer.map(function (x) {
              return String(x.id) === String(v.id) ? Object.assign({}, x, ren, { id: x.id }) : x;
            });
          } else {
            ren.id = næsteId(d.menu_varer);
            d.menu_varer.push(ren);
          }
        });
      }

      return v.id
        ? skriv('PATCH', 'menu_varer', 'id=eq.' + encodeURIComponent(v.id), ren)
        : skriv('POST', 'menu_varer', '', [ren]);
    },

    sletVare: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.menu_varer = (d.menu_varer || []).filter(function (x) { return String(x.id) !== String(id); });
      });
      return skriv('DELETE', 'menu_varer', 'id=eq.' + encodeURIComponent(id));
    },

    nyhed: function (n) {
      var ren = {
        titel: String(n.titel).trim(),
        tekst: String(n.tekst).trim(),
        dato: n.dato || nu().dato,
        aktiv: n.aktiv !== false,
      };

      if (!SKY) {
        return lokalt(function (d) {
          d.nyheder = d.nyheder || [];
          if (n.id) {
            d.nyheder = d.nyheder.map(function (x) {
              return String(x.id) === String(n.id) ? Object.assign({}, x, ren, { id: x.id }) : x;
            });
          } else {
            ren.id = næsteId(d.nyheder);
            d.nyheder.unshift(ren);
          }
        });
      }

      return n.id
        ? skriv('PATCH', 'nyheder', 'id=eq.' + encodeURIComponent(n.id), ren)
        : skriv('POST', 'nyheder', '', [ren]);
    },

    sletNyhed: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.nyheder = (d.nyheder || []).filter(function (x) { return String(x.id) !== String(id); });
      });
      return skriv('DELETE', 'nyheder', 'id=eq.' + encodeURIComponent(id));
    },

    indstilling: function (nøgle, værdi) {
      if (!SKY) return lokalt(function (d) {
        d.indstillinger = d.indstillinger || {};
        d.indstillinger[nøgle] = værdi;
      });
      return skriv('POST', 'indstillinger', 'on_conflict=noegle',
        [{ noegle: nøgle, vaerdi: værdi, aendret: new Date().toISOString() }], true);
    },

    lokation: function (l) {
      var ren = {
        navn: String(l.navn).trim(),
        adresse: String(l.adresse).trim(),
        postnr: String(l.postnr).trim(),
        by: String(l.by).trim(),
        telefon: l.telefon ? String(l.telefon).trim() : null,
        beskrivelse: l.beskrivelse ? String(l.beskrivelse).trim() : null,
      };

      if (!SKY) return lokalt(function (d) {
        d.lokationer = (d.lokationer || []).map(function (x) {
          return x.id === l.id ? Object.assign({}, x, ren) : x;
        });
      });
      return skriv('PATCH', 'lokationer', 'id=eq.' + encodeURIComponent(l.id), ren);
    },
  };

  // ----------------------------------------------------------
  //  Log ind
  //  ----------------------------------------------------------
  //  Nøglen gemmes i sessionStorage, ikke localStorage. Så er
  //  man logget ud når fanen lukkes – vigtigt på en iPad der
  //  står i køkkenet og bruges af flere.
  // ----------------------------------------------------------
  var auth = {
    login: function (email, kode) {
      if (!SKY) {
        // Uden database er der ingen at spørge. Admin kører i
        // øvetilstand, hvor intet går videre til nettet.
        sessionStorage.setItem('mosede_token', 'lokal');
        sessionStorage.setItem('mosede_email', email || 'øvetilstand');
        return Promise.resolve({ lokal: true });
      }

      return fetch(cfg.url + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: kode }),
      }).then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok || !j.access_token) {
            throw new Error(
              r.status === 400
                ? 'E-mail eller adgangskode passer ikke.'
                : (j.error_description || j.msg || 'Kunne ikke logge ind.'));
          }
          sessionStorage.setItem('mosede_token', j.access_token);
          sessionStorage.setItem('mosede_email', email);
          return j;
        });
      });
    },

    logout: function () {
      sessionStorage.removeItem('mosede_token');
      sessionStorage.removeItem('mosede_email');
    },

    loggetInd: function () { return !!sessionStorage.getItem('mosede_token'); },
    email: function () { return sessionStorage.getItem('mosede_email') || ''; },
  };

  // ----------------------------------------------------------
  //  Det udadvendte
  // ----------------------------------------------------------
  window.Butik = {
    tjek: tjek,
    skrive: skrive,
    auth: auth,
    talEllerNull: talEllerNull,
    sky: SKY,
    nu: nu,
    UGEDAGE: UGEDAGE,
    pænTid: pænTid,
    pris: pris,
    status: status,
    menu: menu,
    tilMinutter: tilMinutter,

    // Henter alt. Fejler skyen, falder vi tilbage på det lokale
    // i stedet for at vise en tom side.
    hent: function () {
      if (!SKY) return Promise.resolve(læsLokalt());

      return Promise.all([
        hentTabel('lokationer', 'select=*&aktiv=eq.true&order=sortering'),
        hentTabel('aabningstider', 'select=*&order=ugedag'),
        hentTabel('lukkedage', 'select=*&dato=gte.' + nu().dato + '&order=dato'),
        hentTabel('menu_kategorier', 'select=*&order=sortering'),
        hentTabel('menu_varer', 'select=*&order=sortering'),
        hentTabel('nyheder', 'select=*&aktiv=eq.true&order=dato.desc'),
        hentTabel('indstillinger', 'select=*'),
      ]).then(function (svar) {
        var ind = {};
        (svar[6] || []).forEach(function (r) { ind[r.noegle] = r.vaerdi; });
        return {
          lokationer: svar[0],
          aabningstider: svar[1],
          lukkedage: svar[2],
          menu_kategorier: svar[3],
          menu_varer: svar[4],
          nyheder: svar[5],
          indstillinger: ind,
        };
      }).catch(function (fejl) {
        console.warn('Kunne ikke hente fra databasen, viser lokale data:', fejl);
        var d = læsLokalt();
        d._offline = true;
        return d;
      });
    },

    gemLokalt: gemLokalt,
    læsLokalt: læsLokalt,
    startdata: startdata,
    hentTabel: hentTabel,
    hoveder: hoveder,
  };
})();
