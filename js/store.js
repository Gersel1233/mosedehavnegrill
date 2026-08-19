/* ============================================================
   Mosede Havnegrill og Ishus – datalaget.

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

  /* ----------------------------------------------------------
     HVILKEN FORRETNING HENTER VI?
     ----------------------------------------------------------
     Databasen deles af flere. Hver eneste hentning herunder
     filtrerer på lokation_id, så en side aldrig kan komme til at
     vise en anden forretnings menukort eller åbningstider.

     Filteret er IKKE sikkerheden. En gæst kan skrive hvad som
     helst i adressefeltet, og menukort og åbningstider er
     offentlige for alle alligevel. Det der ikke må lækkes –
     bestillinger med navn og telefonnummer – er lukket af
     adgangsreglerne i databasen, som er bundet til lokationen.
     Filteret her sørger for at siden viser det RIGTIGE, ikke for
     at den skjuler noget.

     Falder værdien tilbage til 'mosede', er det fordi det er den
     eneste lokation der findes lige nu, og en tom config må ikke
     give en tom side. ---------------------------------------- */
  var LOKATION = cfg.lokation || 'mosede';

  // "&lokation_id=eq.mosede" – ét sted, så et filter ikke kan
  // blive glemt på én tabel og stå på alle de andre.
  var MIT = '&lokation_id=eq.' + encodeURIComponent(LOKATION);

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
  //  Samme tider som i setup.sql: 10-20, bekræftet af kunden.
  //  Priser står tomme med vilje.
  // ----------------------------------------------------------
  function startdata() {
    // Kun nok til at siden ikke står tom hvis databasen er nede.
    // Det rigtige menukort ligger i supabase/menukort.sql – 14
    // kategorier og 151 varer – og hentes derfra.
    var kat = [
      { id: 1, afdeling: 'mad', navn: 'Smørrebrød', sortering: 6, aktiv: true },
      { id: 2, afdeling: 'is', navn: 'Softice og vafler', sortering: 11, aktiv: true },
    ];

    var tider = [];
    for (var i = 0; i < 7; i++) {
      tider.push({ lokation_id: LOKATION, ugedag: i, lukket: false, aabner: '10:00', lukker: '20:00' });
    }

    return {
      lokationer: [{
        id: LOKATION,
        navn: 'Mosede Havnegrill og Ishus',
        adresse: 'Havnevej 20I',
        postnr: '2670',
        by: 'Greve',
        telefon: '28871343',
        beskrivelse: 'Spis på trædækket med udsigt over bådene.',
        aktiv: true,
        sortering: 1,
      }],
      aabningstider: tider,
      lukkedage: [],
      menu_kategorier: kat,
      menu_varer: [
        { id: 1, kategori_id: 1, navn: 'Smørrebrød', beskrivelse: null,
          pris: 55, fremhaevet: true, udsolgt: false, sortering: 1, aktiv: true },
        { id: 2, kategori_id: 1, navn: 'Håndmad', beskrivelse: null,
          pris: 24, fremhaevet: false, udsolgt: false, sortering: 2, aktiv: true },
        { id: 3, kategori_id: 2, navn: 'Softice, stor', beskrivelse: null,
          pris: 45, fremhaevet: true, udsolgt: false, sortering: 1, aktiv: true },
      ],
      nyheder: [],
      indstillinger: {
        dagens_besked: { vis: false, tekst: '' },
        saeson: { lukket: false, aabner_igen: '', besked: '' },
        kontakt_email: '',

        // Tavlen ved luge 2. Skiftes hver morgen i admin.
        // Tom liste = sektionen skjules helt.
        dagens_kugler: [],

        /* vandtemp, vind og landing er væk. De hørte til havnestriben
           under heroen, og de skulle skrives i hånden i admin. Ingen
           ringer til DMI før lugen åbner, så de stod tomme, og striben
           er fjernet. Ligger rækkerne stadig i databasen, bliver de
           bare ikke læst. */
        menu_note: 'Smørrebrød kan leveres glutenfri eller uden smør. Vi leverer smørrebrød og platter til alle arrangementer, store som små – ring og hør nærmere.',

        /* Bestilling af smørrebrød ud af huset. Se noten i
           supabase/setup.sql: varsel og mindsteantal er ikke
           oplysninger vi HAR fået, det er udgangspunkter formularen
           skal have for at kunne regne en tidligste dato ud. Ejeren
           retter dem i admin. */
        bestilling_aaben: true,
        bestilling_varsel_timer: 24,
        bestilling_min_stk: 1,
        bestilling_besked: '',
      },

      /* Bestillinger og forespørgsler findes KUN i øvetilstand.
         Mod skyen kan en gæst hverken læse eller skrive dem her –
         de går direkte i databasen, og kun personalet kan læse
         dem. */
      bestillinger: [],
      forespoergsler: [],
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
      Authorization: 'Bearer ' + (gemtToken() || cfg.anonKey),
      'Content-Type': 'application/json',
    };
    for (var k in (ekstra || {})) h[k] = ekstra[k];
    return h;
  }

  /* Samme fornyelse som ved skrivning: er nøglen udløbet, hentes en
     ny og kaldet gentages én gang. Uden det ville personalesiden
     begynde at svare tomt en time inde i en vagt. */
  function hentTabel(navn, forespørgsel, harFornyet) {
    var url = cfg.url + '/rest/v1/' + navn + '?' + (forespørgsel || 'select=*');
    return fetch(url, { headers: hoveder() }).then(function (r) {
      if (r.ok) return r.json();

      if (r.status === 401 && !harFornyet) {
        return auth.forny().then(function (gik) {
          if (gik) return hentTabel(navn, forespørgsel, true);
          throw new Error(navn + ': ' + r.status);
        });
      }
      throw new Error(navn + ': ' + r.status);
    });
  }

  // ----------------------------------------------------------
  //  ER DER ÅBENT LIGE NU?
  //  ----------------------------------------------------------
  //  Rækkefølgen betyder noget. Vinterlukket slår alt andet,
  //  en lukkedag slår ugeplanen, og først derefter ser vi på
  //  klokken. Ellers ville en helligdag med faste tider i
  //  ugeplanen fejlagtigt vise åbent.
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

  /* ----------------------------------------------------------
     ÉN LINJE TIL EN PILLE
     ----------------------------------------------------------
     status() svarer i hele sætninger, fordi personalesiden skal
     kunne vise dem sådan: "Åbent nu" + "Åbent til kl. 21:00".

     I en pille på 44 px er der ikke plads til en sætning, og de to
     stykker sat sammen med et punktum imellem gav
     "Åbent nu · Åbent til kl. 21:00" — ordet "åbent" to gange i den
     samme etiket. Sådan stod det på både menukortet og
     bestillingssiden, og de to pillelinjer brød om til to rækker på
     en telefon og skubbede indholdet 54 px ned.

     Forsiden havde sin egen forkortelse liggende i js/side.js.
     Nu står den her, så alle tre sider skriver det samme.
     ---------------------------------------------------------- */
  function pilleTekst(s) {
    if (!s) return '';
    if (!s.aaben) return s.overskrift + (s.detalje ? ' · ' + s.detalje : '');

    var kort = String(s.detalje || '')
      .replace(/^Åbent til kl\. /, 'til ')
      .replace(/^Vi lukker /, 'lukker ')
      .replace(/^Vi åbner igen /, 'åbner ')
      .replace(/^Vi åbner /, 'åbner ')
      .replace(/ kl\. /, ' ');

    // "Vi lukker om 20 min." bliver "Lukker om 20 min." – og så skal
    // "Åbent nu" ikke stå foran, for det er ikke det man skal vide.
    if (s.snart_lukket) return kort.charAt(0).toUpperCase() + kort.slice(1);
    return kort ? s.overskrift + ' ' + kort : s.overskrift;
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

  /* ----------------------------------------------------------
     HVAD ER SMØRREBRØD?
     ----------------------------------------------------------
     Kortet er skruet sådan sammen at der er TO kategorier:
     "Smørrebrød" med fem slags MED pris, og "Vælg fyld til
     smørrebrødet" med 29 slags UDEN pris. Et fyld er ikke en vare
     man køber – det er hvad der skal ligge på stykket – og derfor
     er prisen det der skiller de to fra hinanden.

     Udvælgelsen lå i js/bestilling.js, som kun hentes på
     bestillingssiden. Da forsiden også skulle vise de fem slags og
     tælle fyldene, ville den samme regex have stået to steder – og
     så er det et spørgsmål om tid før den ene bliver rettet.
     ---------------------------------------------------------- */
  function smoerrebroed(d) {
    var ids = (d.menu_kategorier || []).filter(function (k) {
      return k.aktiv !== false && /smørrebrød|fyld/i.test(k.navn || '');
    }).map(function (k) { return k.id; });

    var varer = (d.menu_varer || []).filter(function (v) {
      return v.aktiv !== false && ids.indexOf(v.kategori_id) !== -1;
    });

    function harPris(v) {
      return v.pris !== null && v.pris !== undefined && v.pris !== '';
    }
    function efterSortering(a, b) {
      return (a.sortering || 0) - (b.sortering || 0);
    }

    return {
      // Udsolgte er ude: man skal ikke kunne bestille dem
      stykker: varer.filter(function (v) { return harPris(v) && !v.udsolgt; })
        .sort(efterSortering),
      fyld: varer.filter(function (v) { return !harPris(v) && !v.udsolgt; })
        .sort(efterSortering),
    };
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

    /* Gæstens telefonnummer. Otte cifre er et dansk nummer, og der
       gives plads til +45 og landekoder på op til femten cifre i
       alt – der kommer gæster fra Sverige og Tyskland til havnen.
       Mellemrum, bindestreger og parenteser tælles ikke med.

       Grænserne er de SAMME som bestilling_telefon_ok i setup.sql.
       Var de mildere her, ville gæsten trykke Send og få en rå
       SQL-fejl i stedet for at få det at vide i feltet. */
    telefon: function (t) {
      var cifre = String(t || '').replace(/[^0-9]/g, '');
      if (!cifre) return 'Skriv dit telefonnummer – vi ringer og bekræfter.';
      if (cifre.length < 8) return 'Telefonnummeret er for kort. Otte cifre.';
      if (cifre.length > 15) return 'Telefonnummeret er for langt.';
      return null;
    },

    epost: function (e) {
      var s = String(e || '').trim();
      if (!s) return null;                    // e-mail er frivillig
      if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(s)) return 'E-mailen ser ikke rigtig ud.';
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

  /* ÉN GENOPFRISKNING, ÉT FORSØG MERE.

     Access_token holder omkring en time. Før betød det at personalet
     fik "du har ikke adgang" midt i en arbejdsdag uden at have gjort
     noget forkert, og den eneste udvej var at logge ud og ind.

     Nu prøves der én gang: kommer der 401, fornys nøglen med
     refresh_token, og kaldet sendes igen. ÉN gang og ikke i en løkke —
     er nøglen død og fornyelsen fejler, skal man se loginskærmen og
     ikke sidde i et forsøg der aldrig stopper. */
  function skriv(metode, tabel, forespørgsel, krop, flet, harFornyet) {
    var url = cfg.url + '/rest/v1/' + tabel + (forespørgsel ? '?' + forespørgsel : '');
    var ekstra = { Prefer: flet ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal' };

    return fetch(url, {
      method: metode,
      headers: hoveder(ekstra),
      body: krop ? JSON.stringify(krop) : undefined,
    }).then(function (r) {
      if (r.ok) return true;

      if (r.status === 401 && !harFornyet) {
        return auth.forny().then(function (gik) {
          if (gik) return skriv(metode, tabel, forespørgsel, krop, flet, true);
          return r.text().then(function (t) { throw skrivefejl(r, t); });
        });
      }
      return r.text().then(function (t) { throw skrivefejl(r, t); });
    });
  }

  /* Databasens egne afvisninger oversættes til noget en travl
     medarbejder kan handle på. Ligger for sig, så skriv() kan kalde
     den fra to steder uden at teksterne står to gange. */
  function skrivefejl(r, t) {
    if (r.status === 401 || r.status === 403) {
      return new Error('Du har ikke adgang til at ændre det. Prøv at logge ud og ind igen.');
    }
    if (/pris_realistisk/.test(t)) return new Error('Prisen blev afvist – den skal være mellem 0 og 10.000 kr.');
    if (/tider_haenger_sammen/.test(t)) return new Error('Tiderne blev afvist – der skal lukkes efter der er åbnet.');
    if (/vare_navn_ok|kategori_navn_ok/.test(t)) return new Error('Navnet blev afvist – det må ikke være tomt.');
    if (/lokation_postnr_gyldigt/.test(t)) return new Error('Postnummeret skal være fire cifre.');
    if (/duplicate key/.test(t)) return new Error('Den findes allerede.');
    return new Error('Kunne ikke gemme (' + r.status + '). ' + t.slice(0, 160));
  }

  function næsteId(liste) {
    return (liste || []).reduce(function (m, r) {
      return Math.max(m, Number(r.id) || 0);
    }, 0) + 1;
  }

  /* ==========================================================
     BESTILLING AF SMØRREBRØD UD AF HUSET
     ----------------------------------------------------------
     Den ENESTE ting en gæst skriver i databasen. Den har sin egen
     funktion og bruger ikke skriv() ovenfor, af to grunde:

     1) FEJLBESKEDERNE. skriv() svarer personalet ("Prøv at logge
        ud og ind igen"). En gæst der vil have smørrebrød til sin
        mors fødselsdag skal have noget andet at vide.

     2) REFERENCEN LAVES HER I BROWSEREN. Gæsten kan ikke læse
        tabellen – det er med vilje, for anon-nøglen ligger
        offentligt og må ikke kunne hente en liste over kunders
        telefonnumre. Men PostgREST skal kunne LÆSE en række for at
        svare med den, så "return=representation" er udelukket.
        Derfor kender vi koden før vi sender, og gæsten får den at
        vide uanset hvad databasen svarer.
     ========================================================== */

  /* Koden gæsten læser op i telefonen. Ingen I, O, 0 og 1: de
     bliver hørt og skrevet forkert, og en medarbejder der leder
     efter "SM-B1OI" i en liste finder ingenting. */
  var KODETEGN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  /* Præfikset siger hvad koden hører til: SM for smørrebrød ud af
     huset, FO for en forespørgsel. Personalet har de to lister ved
     siden af hinanden i admin, og en gæst der læser "FO260819-KTPQR"
     op i telefonen, skal ikke lede i den forkerte. */
  function lavReference(praefiks) {
    var t = nu();                       // dansk dato, ikke browserens
    var kode = '';
    /* crypto er der i alle browsere der kan andet på siden alligevel;
       Math.random er nødet, og en kollision afvises af databasen. */
    var tal = new Uint8Array(5);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(tal);
    } else {
      for (var j = 0; j < 5; j++) tal[j] = Math.floor(Math.random() * 256);
    }
    for (var i = 0; i < 5; i++) kode += KODETEGN[tal[i] % KODETEGN.length];
    return praefiks + t.dato.slice(2, 4) + t.dato.slice(5, 7) + t.dato.slice(8, 10) + '-' + kode;
  }

  function bestil(b) {
    var linjer = (b.linjer || []).map(function (l) {
      return {
        navn: String(l.navn || '').slice(0, 120),
        antal: Math.round(Number(l.antal) || 0),
        pris: talEllerNull(l.pris),
      };
    }).filter(function (l) { return l.navn && l.antal > 0; });

    var antal = linjer.reduce(function (s, l) { return s + l.antal; }, 0);

    var raekke = {
      reference: lavReference('SM'),
      lokation_id: b.lokation_id || LOKATION,
      navn: String(b.navn || '').trim().slice(0, 80),
      telefon: String(b.telefon || '').trim().slice(0, 30),
      email: String(b.email || '').trim() ? String(b.email).trim().slice(0, 160) : null,
      hent_dato: b.hent_dato,
      hent_tid: String(b.hent_tid || '').slice(0, 5),
      linjer: linjer,
      /* Fyldet er ØNSKER, ikke varer med antal – se noten i
         setup.sql. Højst 40, samme grænse som databasens. */
      fyld: (b.fyld || []).slice(0, 40).map(function (f) {
        return String(f).slice(0, 120);
      }),
      antal: antal,
      besked: String(b.besked || '').trim() ? String(b.besked).trim().slice(0, 1000) : null,
      // status og intern_note sættes IKKE her. Adgangsreglen kræver
      // status = 'ny' og intern_note = null, og standardværdien i
      // databasen giver netop det. Sendte vi dem med, ville en
      // stavefejl blive en afvisning gæsten ikke kan gøre noget ved.
    };

    // Øvetilstand: der er ingen database, så bestillingen lægges
    // lokalt. Så kan flowet prøves igennem uden nøgle.
    if (!SKY) {
      var d = læsLokalt();
      d.bestillinger = d.bestillinger || [];

      /* Samme regel som bestilling_ikke_dobbelt i databasen. Den
         skal også gælde her, ellers opfører øvetilstanden sig
         anderledes end det rigtige – og så er det ikke en øvelse. */
      var dobbelt = d.bestillinger.some(function (x) {
        return x.telefon === raekke.telefon
            && x.hent_dato === raekke.hent_dato
            && x.hent_tid === raekke.hent_tid;
      });
      if (dobbelt) {
        return Promise.reject(new Error(
          'Du har allerede sendt en bestilling til det tidspunkt. '
          + 'Ring til os hvis du vil ændre den.'));
      }

      // Samme grænse som bestilling_bremse i supabase/bremse.sql.
      // Øvetilstanden skal opføre sig som det rigtige, ellers er
      // det ikke en øvelse.
      var etDoegnSiden = Date.now() - 24 * 60 * 60 * 1000;
      var fraNummeret = d.bestillinger.filter(function (x) {
        return x.telefon === raekke.telefon
          && Date.parse(x.oprettet || 0) > etDoegnSiden;
      }).length;
      if (fraNummeret >= 5) {
        return Promise.reject(new Error(
          'Der er allerede sendt flere bestillinger fra det nummer i dag. '
          + 'Ring til os, så tager vi den over telefonen.'));
      }

      var gemt = { id: næsteId(d.bestillinger), status: 'ny', intern_note: null,
        oprettet: new Date().toISOString() };
      for (var n in raekke) gemt[n] = raekke[n];
      d.bestillinger.unshift(gemt);
      gemLokalt(d);
      return Promise.resolve(raekke);
    }

    return fetch(cfg.url + '/rest/v1/bestillinger', {
      method: 'POST',
      headers: hoveder({ Prefer: 'return=minimal' }),
      body: JSON.stringify(raekke),
    }).then(function (r) {
      if (r.ok) return raekke;
      return r.text().then(function (t) {
        /* Databasens svar oversat til noget en gæst kan bruge. Alt
           der ikke er genkendt, får en besked med telefonnummeret
           i: der er altid en vej videre, og det er den samme vej
           som før hjemmesiden fandtes. */
        if (/bestilling_ikke_dobbelt|duplicate key.*ikke_dobbelt/.test(t)) {
          throw new Error('Du har allerede sendt en bestilling til det tidspunkt. '
            + 'Ring til os hvis du vil ændre den.');
        }
        /* Bremsen fra supabase/bremse.sql. Den er bygget mod
           scripts, ikke mod gæster, så beskederne peger begge på
           telefonen: rammer et rigtigt menneske en grænse, skal
           der stå hvad man gør, ikke at man er afvist. */
        if (/bestilling_bremse_nummer/.test(t)) {
          throw new Error('Der er allerede sendt flere bestillinger fra det '
            + 'nummer i dag. Ring til os, så tager vi den over telefonen.');
        }
        if (/bestilling_bremse_travlt/.test(t)) {
          throw new Error('Der er meget travlt lige nu. Prøv igen om et par '
            + 'minutter, eller ring til os.');
        }
        if (/bestilling_dato_ok/.test(t)) throw new Error('Vælg en dag der ikke er gået endnu.');
        if (/bestilling_telefon_ok/.test(t)) throw new Error('Telefonnummeret blev afvist. Otte cifre.');
        if (/bestilling_navn_ok/.test(t)) throw new Error('Skriv dit navn.');
        if (/bestilling_email_ok/.test(t)) throw new Error('E-mailen ser ikke rigtig ud.');
        if (/bestilling_linjer_ok/.test(t)) throw new Error('Vælg mindst ét stykke smørrebrød.');
        if (/bestilling_antal_ok/.test(t)) throw new Error('Antallet ser forkert ud. Ring til os for meget store ordrer.');
        if (/duplicate key/.test(t)) throw new Error('Prøv at sende igen.');
        if (r.status === 401 || r.status === 403) {
          throw new Error('Bestillingen kunne ikke sendes. Ring til os i stedet.');
        }
        throw new Error('Bestillingen kunne ikke sendes (' + r.status + '). Ring til os i stedet.');
      });
    }, function () {
      // Ingen forbindelse. Ikke en fejl gæsten har lavet.
      throw new Error('Der er ingen forbindelse lige nu. Ring til os, '
        + 'eller prøv igen om et øjeblik.');
    });
  }

  /* ==========================================================
     FORESPØRGSLER: CATERING, BAGLOKALE OG SELSKAB
     ----------------------------------------------------------
     Den anden ting en gæst skriver i databasen, og den er bygget
     som bestillingen med vilje: gæsten må skrive, men ikke læse.
     En forespørgsel er navn og telefonnummer på et menneske, der
     har fortalt hvornår de holder fest — altså også hvornår de
     ikke er hjemme.

     ÉN TABEL OG IKKE TRE. De tre indgange spørger om hver sit,
     men personalet gør det samme ved dem alle: ringer, aftaler
     eller afviser. Tre tabeller ville være tre sæt adgangsregler
     at holde ens, tre faner at rette, og tre steder at huske,
     når der skal et felt mere på. Forskellen er ét ord i en
     kolonne, ikke tre systemer.
     ========================================================== */

  /* Listen står ÉT sted. Formularen bygger sine knapper af den,
     og databasen har den samme i sin check-regel. Kommer der en
     fjerde type til, er det de to steder — og prøven i
     supabase/proev-forespoergsler.sql fanger, hvis kun det ene
     bliver rettet. */
  var FORESPOERGSEL_TYPER = ['catering', 'baglokale', 'selskab'];

  function forespoerg(f) {
    var type = String(f.type || '').trim();

    var raekke = {
      reference: lavReference('FO'),
      lokation_id: f.lokation_id || LOKATION,
      type: type,
      navn: String(f.navn || '').trim().slice(0, 80),
      telefon: String(f.telefon || '').trim().slice(0, 30),
      email: String(f.email || '').trim() ? String(f.email).trim().slice(0, 160) : null,
      /* Dato og antal er FRIVILLIGE. "Vi skal holde sølvbryllup
         engang til foråret, hvad koster det?" er en helt rigtig
         forespørgsel, og et krav om en dato ville sende netop den
         gæst væk igen. Personalet ser "ikke oplyst" på kortet og
         spørger i telefonen. */
      dato: f.dato ? String(f.dato).slice(0, 10) : null,
      antal_personer: (f.antal_personer === '' || f.antal_personer === null
        || f.antal_personer === undefined) ? null : Math.round(Number(f.antal_personer)),
      besked: String(f.besked || '').trim() ? String(f.besked).trim().slice(0, 1000) : null,
      // status og intern_note sættes IKKE her – se noten i bestil().
    };

    if (raekke.antal_personer !== null && !isFinite(raekke.antal_personer)) {
      raekke.antal_personer = null;
    }

    // Øvetilstand: samme regler efterlignet, ellers er det ikke
    // en øvelse. Se den samme blok i bestil().
    if (!SKY) {
      var d = læsLokalt();
      d.forespoergsler = d.forespoergsler || [];

      /* Samme check-regel som forespoergsel_type_ok i databasen.
         Uden den ville en type, ingen kender, glide igennem i
         øvetilstand og først blive afvist mod den rigtige
         database — altså det stik modsatte af, hvad en øvelse er
         til for. */
      if (FORESPOERGSEL_TYPER.indexOf(raekke.type) === -1) {
        return Promise.reject(new Error('Vælg hvad det handler om.'));
      }

      var titiSiden = Date.now() - 10 * 60 * 1000;
      var dobbelt = d.forespoergsler.some(function (x) {
        return x.telefon === raekke.telefon
            && x.type === raekke.type
            && (x.dato || null) === raekke.dato
            && Date.parse(x.oprettet || 0) > titiSiden;
      });
      if (dobbelt) {
        return Promise.reject(new Error(
          'Vi har lige fået den samme forespørgsel fra dig. '
          + 'Vi ringer så hurtigt vi kan.'));
      }

      var etDoegnSiden = Date.now() - 24 * 60 * 60 * 1000;
      var fraNummeret = d.forespoergsler.filter(function (x) {
        return x.telefon === raekke.telefon
          && Date.parse(x.oprettet || 0) > etDoegnSiden;
      }).length;
      if (fraNummeret >= 3) {
        return Promise.reject(new Error(
          'Der er allerede sendt flere forespørgsler fra det nummer i dag. '
          + 'Ring til os, så tager vi den over telefonen.'));
      }

      var gemt = { id: næsteId(d.forespoergsler), status: 'ny', intern_note: null,
        oprettet: new Date().toISOString() };
      for (var n in raekke) gemt[n] = raekke[n];
      d.forespoergsler.unshift(gemt);
      gemLokalt(d);
      return Promise.resolve(raekke);
    }

    return fetch(cfg.url + '/rest/v1/forespoergsler', {
      method: 'POST',
      headers: hoveder({ Prefer: 'return=minimal' }),
      body: JSON.stringify(raekke),
    }).then(function (r) {
      if (r.ok) return raekke;
      return r.text().then(function (t) {
        /* Som ved bestillingen: alt der ikke er genkendt, ender med
           telefonnummeret. Der er altid en vej videre, og det er
           den samme vej som før hjemmesiden fandtes. */
        if (/forespoergsel_dobbelt/.test(t)) {
          throw new Error('Vi har lige fået den samme forespørgsel fra dig. '
            + 'Vi ringer så hurtigt vi kan.');
        }
        if (/forespoergsel_bremse_nummer/.test(t)) {
          throw new Error('Der er allerede sendt flere forespørgsler fra det '
            + 'nummer i dag. Ring til os, så tager vi den over telefonen.');
        }
        if (/forespoergsel_bremse_travlt/.test(t)) {
          throw new Error('Der er meget travlt lige nu. Prøv igen om et par '
            + 'minutter, eller ring til os.');
        }
        if (/forespoergsel_type_ok/.test(t)) throw new Error('Vælg hvad det handler om.');
        if (/forespoergsel_dato_ok/.test(t)) throw new Error('Vælg en dato der ikke er gået endnu.');
        if (/forespoergsel_telefon_ok/.test(t)) throw new Error('Telefonnummeret blev afvist. Otte cifre.');
        if (/forespoergsel_navn_ok/.test(t)) throw new Error('Skriv dit navn.');
        if (/forespoergsel_email_ok/.test(t)) throw new Error('E-mailen ser ikke rigtig ud.');
        if (/forespoergsel_antal_ok/.test(t)) throw new Error('Antallet ser forkert ud. Ring til os for meget store selskaber.');
        if (/duplicate key/.test(t)) throw new Error('Prøv at sende igen.');
        if (r.status === 401 || r.status === 403) {
          throw new Error('Forespørgslen kunne ikke sendes. Ring til os i stedet.');
        }
        throw new Error('Forespørgslen kunne ikke sendes (' + r.status + '). Ring til os i stedet.');
      });
    }, function () {
      // Ingen forbindelse. Ikke en fejl gæsten har lavet.
      throw new Error('Der er ingen forbindelse lige nu. Ring til os, '
        + 'eller prøv igen om et øjeblik.');
    });
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

      /* Lokationen sættes kun ved oprettelse. En nyhed skal ikke
         kunne flytte forretning, fordi nogen retter en stavefejl
         i overskriften. */
      if (n.id) return skriv('PATCH', 'nyheder', 'id=eq.' + encodeURIComponent(n.id), ren);
      ren.lokation_id = LOKATION;
      return skriv('POST', 'nyheder', '', [ren]);
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
      /* on_conflict SKAL nævne lokationen. Primærnøglen er
         (lokation_id, noegle) nu, og "on_conflict=noegle" alene
         ville få databasen til at afvise hele kaldet – ikke
         overskrive den forkerte række, men det er en fejl man
         først ser når man trykker Gem. */
      return skriv('POST', 'indstillinger', 'on_conflict=lokation_id,noegle',
        [{ lokation_id: LOKATION, noegle: nøgle, vaerdi: værdi,
           aendret: new Date().toISOString() }], true);
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

    /* ---- Bestillinger, set fra personalets side ----
       Kun status og den interne note kan rettes. Gæstens navn,
       telefon, dato og linjer bliver stående som de blev sendt:
       en bestilling personalet kan skrive om, er ikke længere et
       bevis på hvad gæsten bad om. Skal noget ændres, ringer man
       og laver en ny. */
    bestillingStatus: function (id, status, note) {
      var ren = { status: status, aendret: new Date().toISOString() };
      if (note !== undefined) ren.intern_note = note ? String(note).slice(0, 1000) : null;

      if (!SKY) return lokalt(function (d) {
        d.bestillinger = (d.bestillinger || []).map(function (b) {
          if (String(b.id) !== String(id)) return b;
          var ny = Object.assign({}, b, ren);
          return ny;
        });
      });
      return skriv('PATCH', 'bestillinger', 'id=eq.' + encodeURIComponent(id), ren);
    },

    sletBestilling: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.bestillinger = (d.bestillinger || []).filter(function (b) {
          return String(b.id) !== String(id);
        });
      });
      return skriv('DELETE', 'bestillinger', 'id=eq.' + encodeURIComponent(id));
    },

    /* ---- Forespørgsler, set fra personalets side ----
       Nøjagtig samme regel som ved bestillingerne: kun status og
       den interne note kan rettes. Gæstens egne ord er et referat
       af, hvad der blev spurgt om, og et referat man kan skrive om,
       er ikke længere et bevis. */
    forespoergselStatus: function (id, status, note) {
      var ren = { status: status, aendret: new Date().toISOString() };
      if (note !== undefined) ren.intern_note = note ? String(note).slice(0, 1000) : null;

      if (!SKY) return lokalt(function (d) {
        d.forespoergsler = (d.forespoergsler || []).map(function (f) {
          if (String(f.id) !== String(id)) return f;
          return Object.assign({}, f, ren);
        });
      });
      return skriv('PATCH', 'forespoergsler', 'id=eq.' + encodeURIComponent(id), ren);
    },

    sletForespoergsel: function (id) {
      if (!SKY) return lokalt(function (d) {
        d.forespoergsler = (d.forespoergsler || []).filter(function (f) {
          return String(f.id) !== String(id);
        });
      });
      return skriv('DELETE', 'forespoergsler', 'id=eq.' + encodeURIComponent(id));
    },
  };

  /* ==========================================================
     LOG IND
     ----------------------------------------------------------
     TO STEDER AT GEMME, OG DE ER VALGT MED VILJE.

     sessionStorage er standard: man er logget ud når fanen
     lukkes. Det er rigtigt for den iPad der står i køkkenet og
     bruges af skiftende personale.

     localStorage bruges kun hvis man selv sætter flueben i "husk
     mig på denne enhed". Det er til den der bygger og retter, og
     som ellers skal taste e-mail og kode ved hver eneste fane.

     Valget skal træffes af den der står ved skærmen, ikke af os:
     vi kan ikke se, om det er et køkken eller en kontorstol.

     ----------------------------------------------------------
     OG NØGLEN FORNYES.

     Supabase' access_token holder omkring en time. Før gemte vi
     kun den — så efter en time begyndte alt at svare 401 midt i en
     arbejdsdag, uden at nogen havde gjort noget forkert.
     refresh_token gemmes nu med, og fornys automatisk når kaldet
     afvises. Det er lige så meget en fejlrettelse for personalet
     som en bekvemmelighed for os.
     ========================================================== */
  var NOEGLE = 'mosede_token';
  var NOEGLE_MAIL = 'mosede_email';
  var NOEGLE_FORNY = 'mosede_refresh';

  /* Nøglen, uanset hvor den ligger. Funktionserklæring og ikke en
     var, så hoveder() længere oppe i filen kan bruge den — den bliver
     hejst til toppen af modulet. */
  function gemtToken() { return gemtVaerdi('mosede_token'); }

  // Læser fra begge, skriver kun ét af stederne
  function gemtVaerdi(navn) {
    try {
      return sessionStorage.getItem(navn) || localStorage.getItem(navn) || '';
    } catch (e) { return ''; }
  }

  function gem(navn, vaerdi, husk) {
    try {
      if (husk) localStorage.setItem(navn, vaerdi);
      else sessionStorage.setItem(navn, vaerdi);
    } catch (e) { /* privat browsing */ }
  }

  function ryd(navn) {
    try { sessionStorage.removeItem(navn); localStorage.removeItem(navn); }
    catch (e) { /* ignoreres */ }
  }

  /* ----------------------------------------------------------
     LOGINSKÆRMEN KAN SPRINGES OVER UNDER BYGGERIET
     ----------------------------------------------------------
     Tre betingelser skal ALLE være opfyldt:

       1) localhost — adressen kan ikke nås fra internettet
       2) ingen database — der er ingen rigtige data at åbne
       3) ?fri=1 står i adressen — man har selv bedt om det

     Den tredje er ikke pynt. Første udgave sprang bare over på
     localhost, og så slog den de tests ihjel, der beviser at låsen
     virker — testene kører netop på 127.0.0.1 i øvetilstand. At
     omgåelsen og testmiljøet ikke kan skelnes fra hinanden, er et
     tegn på at mekanismen er for grov.

     Med ?fri=1 er det et valg man træffer: sæt et bogmærke til
     admin.html?fri=1, og der er nul friktion. Testene sætter den
     ikke, så de måler stadig den rigtige dør.

     Og den kan aldrig åbne den udgivne side: dér er både betingelse
     1 og 2 falske. Bestillinger indeholder gæsters navne og
     telefonnumre, og en åben admin lader hvem som helst ændre priser
     eller lukke butikken.
     ---------------------------------------------------------- */
  function paaEgenMaskine() {
    var v = location.hostname;
    return v === 'localhost' || v === '127.0.0.1' || v === '::1'
      || v === '' || location.protocol === 'file:';
  }

  var auth = {
    // Til admin.html, så den kan springe loginskærmen over
    fri: function () {
      return paaEgenMaskine()
        && !SKY
        && /(?:^|[?&])fri=1(?:&|$)/.test(location.search);
    },

    login: function (email, kode, husk) {
      if (!SKY) {
        // Uden database er der ingen at spørge. Admin kører i
        // øvetilstand, hvor intet går videre til nettet.
        gem(NOEGLE, 'lokal', husk);
        gem(NOEGLE_MAIL, email || 'øvetilstand', husk);
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
          gem(NOEGLE, j.access_token, husk);
          gem(NOEGLE_MAIL, email, husk);
          if (j.refresh_token) gem(NOEGLE_FORNY, j.refresh_token, husk);
          return j;
        });
      });
    },

    /* Fornyer nøglen med refresh_token. Kaldes af hentTabel og
       skriv når et kald svarer 401 — se dér. Fejler den, er man
       reelt logget ud, og så skal man se loginskærmen frem for en
       uforståelig fejl. */
    forny: function () {
      var r = gemtVaerdi(NOEGLE_FORNY);
      if (!SKY || !r) return Promise.resolve(false);

      // Samme sted som nøglen lå i forvejen
      var husk = false;
      try { husk = !!localStorage.getItem(NOEGLE); } catch (e) { /* */ }

      return fetch(cfg.url + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: r }),
      }).then(function (svar) {
        if (!svar.ok) return false;
        return svar.json().then(function (j) {
          if (!j.access_token) return false;
          gem(NOEGLE, j.access_token, husk);
          if (j.refresh_token) gem(NOEGLE_FORNY, j.refresh_token, husk);
          return true;
        });
      }).catch(function () { return false; });
    },

    logout: function () {
      ryd(NOEGLE);
      ryd(NOEGLE_MAIL);
      ryd(NOEGLE_FORNY);
    },

    loggetInd: function () { return !!gemtVaerdi(NOEGLE); },
    email: function () { return gemtVaerdi(NOEGLE_MAIL) || ''; },
  };

  // ----------------------------------------------------------
  //  Det udadvendte
  // ----------------------------------------------------------
  window.Butik = {
    tjek: tjek,
    skrive: skrive,
    bestil: bestil,
    forespoerg: forespoerg,
    FORESPOERGSEL_TYPER: FORESPOERGSEL_TYPER,
    auth: auth,
    talEllerNull: talEllerNull,
    sky: SKY,
    nu: nu,
    LOKATION: LOKATION,
    UGEDAGE: UGEDAGE,
    pænTid: pænTid,
    pris: pris,
    status: status,
    pilleTekst: pilleTekst,
    menu: menu,
    smoerrebroed: smoerrebroed,
    tilMinutter: tilMinutter,

    // Henter alt. Fejler skyen, falder vi tilbage på det lokale
    // i stedet for at vise en tom side.
    hent: function () {
      if (!SKY) return Promise.resolve(læsLokalt());

      return Promise.all([
        /* lokationer har ingen lokation_id – dens egen id ER den.
           "aktiv=eq.true" er væk med vilje: den hørte til dengang
           listen var flere luger i samme forretning. Nu er rækken
           HELE sidens adresse og telefonnummer, og et flueben
           taget i admin må ikke kunne tømme kontaktafsnittet. */
        hentTabel('lokationer', 'select=*&id=eq.' + encodeURIComponent(LOKATION)),
        hentTabel('aabningstider', 'select=*' + MIT + '&order=ugedag'),
        hentTabel('lukkedage', 'select=*' + MIT + '&dato=gte.' + nu().dato + '&order=dato'),
        hentTabel('menu_kategorier', 'select=*' + MIT + '&order=sortering'),
        hentTabel('menu_varer', 'select=*' + MIT + '&order=sortering'),
        hentTabel('nyheder', 'select=*' + MIT + '&aktiv=eq.true&order=dato.desc'),
        hentTabel('indstillinger', 'select=*' + MIT),
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

    /* ---- Bestillingerne, kun til personalesiden ----
       Adgangsreglen giver kun chefen læseadgang, så dette kald
       svarer 401 for alle andre. Det er ikke en fejl der skal
       skjules: kan admin ikke læse dem, skal medarbejderen vide
       det, i stedet for at tro at der ingen bestillinger er.

       Der hentes fra i går og frem. Gårsdagen er med, fordi en
       bestilling til kl. 19 i går godt kan blive hentet i morgen
       tidlig, og fordi personalet skal kunne se hvad de lige har
       lavet. Alt ældre er historik og hører ikke på en skærm ved
       lugen. */
    hentBestillinger: function () {
      if (!SKY) {
        var d = læsLokalt();
        return Promise.resolve((d.bestillinger || []).slice());
      }
      var i_dag = nu().dato;
      var i_gaar = new Date(i_dag + 'T12:00:00Z');
      i_gaar.setUTCDate(i_gaar.getUTCDate() - 1);
      /* Filteret på lokationen er ikke det der beskytter noget –
         adgangsreglen gør allerede, at man kun får sine egne
         rækker med hjem. Det står her, fordi den dag en person
         står som chef to steder, skal skærmen ved lugen i Mosede
         ikke begynde at vise en anden forretnings bestillinger. */
      return hentTabel('bestillinger',
        'select=*' + MIT + '&hent_dato=gte.' + i_gaar.toISOString().slice(0, 10)
        + '&order=hent_dato,hent_tid');
    },

    /* ---- Forespørgslerne, kun til personalesiden ----
       Samme adgangsregel som bestillingerne: 401 for alle andre
       end chefen, og fejlen skjules ikke i admin.

       Der hentes på OPRETTELSESDATO og ikke på arrangementets
       dato, og de to er ikke det samme. En forespørgsel om et
       sølvbryllup til næste sommer skal ligge på skærmen NU — det
       er nu, der skal ringes — mens en, der er et halvt år gammel,
       er afsluttet eller opgivet. Filtrerede vi på arrangementets
       dato, ville de forespørgsler, hvor gæsten ikke har oplyst en
       dato, falde helt ud af listen. */
    hentForespoergsler: function () {
      if (!SKY) {
        var d = læsLokalt();
        return Promise.resolve((d.forespoergsler || []).slice());
      }
      var graense = new Date(nu().dato + 'T12:00:00Z');
      graense.setUTCDate(graense.getUTCDate() - 180);
      return hentTabel('forespoergsler',
        'select=*' + MIT + '&oprettet=gte.' + graense.toISOString().slice(0, 10)
        + '&order=oprettet.desc');
    },

    /* ---- Salg, kun til personalesiden ----
       Der hentes LÆNGERE TILBAGE end bestillingsfanen, som kun tager
       fra i går og frem. Et salgstal skal kunne se en måned tilbage,
       og de to kald har derfor hver sit vindue — ikke fordi det er
       pænt, men fordi et regnskab og en pakkeliste er to forskellige
       spørgsmål.

       62 dage dækker både "denne måned" og "denne uge", uanset hvilken
       dag i måneden man står på. Resten regnes i browseren, så et
       skift mellem i dag og denne måned ikke koster et kald. */
    hentSalg: function () {
      var graense = new Date(nu().dato + 'T12:00:00Z');
      graense.setUTCDate(graense.getUTCDate() - 62);
      var fra = graense.toISOString().slice(0, 10);

      if (!SKY) {
        var d = læsLokalt();
        return Promise.resolve((d.bestillinger || []).filter(function (b) {
          return b.hent_dato >= fra;
        }));
      }
      return hentTabel('bestillinger',
        'select=*' + MIT + '&hent_dato=gte.' + fra + '&order=hent_dato');
    },

    gemLokalt: gemLokalt,
    læsLokalt: læsLokalt,
    startdata: startdata,
    hentTabel: hentTabel,
    hoveder: hoveder,
  };
})();
