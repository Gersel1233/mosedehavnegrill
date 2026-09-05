/* ============================================================
   Mosede Havnecafe – datalaget.

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

  /* ============================================================
     HVOR LIGGER RODEN?  (4/9)
     ------------------------------------------------------------
     `min-bestilling/` skal kunne linkes til både fra roden
     (index.html, h-smorrebrod.html) og fra en undermappe
     (bestil/, ved-bordet/), og de to har hver sin relative vej.

     ⚠️ VEJEN SKRIVES IKKE TO STEDER, OG DEN GÆTTES IKKE PÅ
     MAPPENAVNE. En liste over "hvilke sider ligger i en
     undermappe" ville skride fra hinanden den dag, der kom en
     ny — tavst, og linket ville pege ingen steder hen.

     Den udledes af det, siden ALLEREDE har gjort rigtigt: sin
     egen sti til filen her. `ved-bordet/index.html` skriver
     `../js/store.js`, forsiden skriver `js/store.js`. Ét af
     tallene kommer altså udefra, og det kan ikke blive uenigt
     med sig selv. */
  var ROD = (function () {
    var s = document.currentScript;
    var src = s ? String(s.getAttribute('src') || '') : '';
    var m = /^(.*?)js\/store\.js/.exec(src);
    return m ? m[1] : '';
  }());

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

  /* ---- NÅR NØGLEN I QR-KODEN IKKE PASSER ------------------
     Beskeden står ÉT sted, fordi den siges to steder: af
     øvetilstandens efterligning og af oversættelsen af
     databasens fejl. To udgaver ville langsomt komme til at
     sige hver sit — og den ene ville være den, gæsten møder. */
  var FEJL_KODE_MANGLER = 'Scan QR-koden på jeres bord igen — '
    + 'adressen alene er ikke nok. Sidder I ved bordet, og virker '
    + 'koden ikke, så sig det til os ved lugen.';
  var FEJL_KODE_FORKERT = 'Koden passer ikke til det bord. '
    + 'Scan mærkatet på bordet igen, eller sig det til os ved lugen.';

  /* Det, personalet SKAL se. Rækker med en dato i "slettet" ligger
     i skraldespanden og hører kun hjemme dér — se
     supabase/skraldespand.sql. Filteret står ét sted af samme
     grund som MIT: glemmes det på én liste, dukker slettede
     bestillinger op igen på præcis den ene skærm. */
  var LEVENDE = '&slettet=is.null';

  /* 30 dage. Kort nok til at spanden ikke bliver et arkiv over
     kunders telefonnumre, langt nok til at en fejl, der opdages
     efter en ferie, stadig kan fortrydes. */
  var SKRALD_DAGE = 30;

  /* De fire tabeller, der har en skraldespand: alt det, et
     MENNESKE har skrevet, og som ikke kan laves om igen. En
     slettet menuvare skriver man ind på ti sekunder; en slettet
     bestilling er en kunde, der møder op efter mad, ingen har
     lavet.

     "slags" er nøglen, admin bruger — den står også i
     js/admin/skraldespand.js. Kommer der en femte til, skal begge
     rettes. */
  var SKRALD_TABELLER = [
    { slags: 'bestilling',    tabel: 'bestillinger',     navn: 'Bestilling' },
    { slags: 'forespoergsel', tabel: 'forespoergsler',   navn: 'Forespørgsel' },
    { slags: 'bord',          tabel: 'bordbestillinger', navn: 'Bordbooking' },
    { slags: 'udlejning',     tabel: 'udlejninger',      navn: 'Baglokalet' },
  ];

  // Bruges af øvetilstanden, hvor der ikke er en database til at
  // filtrere. Skal svare til LEVENDE ovenfor, ellers opfører
  // øvelsen sig anderledes end det rigtige.
  function levende(r) { return !r.slettet; }

  /* Findes der en LEVENDE række, der ville støde sammen med den,
     man vil hente tilbage? Svarer til de delvise unikke nøgler i
     supabase/skraldespand.sql — og de to skal svare ens, ellers
     siger øvetilstanden ja til noget, databasen siger nej til.

     Forespørgsler har ingen nøgle: to ens er ikke en fejl dér,
     man kan godt spørge om det samme selskab to gange. */
  var TVILLING_NOEGLER = {
    bestillinger:     ['telefon', 'hent_dato', 'hent_tid'],
    bordbestillinger: ['telefon', 'dato', 'tid'],
    udlejninger:      ['telefon', 'dato'],
  };

  function tvilling(liste, r, tabel) {
    var felter = TVILLING_NOEGLER[tabel];
    if (!felter) return false;
    return (liste || []).some(function (a) {
      if (String(a.id) === String(r.id) || a.slettet) return false;
      return felter.every(function (f) { return a[f] === r[f]; });
    });
  }

  /* ---------- LOGBOGENS SPEJL I ØVETILSTANDEN ----------
     I skyen skrives logbogen af en trigger (supabase/logbog.sql).
     Her er der ingen database til at gøre det, og en øvetilstand,
     hvor logbogen altid er tom, er ikke en øvelse — så ville
     fanen se ud til at virke, indtil den mødte rigtige data.

     De tre spring-over-felter er de samme som i trigger'en:
     aendret ændrer sig hver gang og fortæller ingenting, og
     linjer og besked er gæstens egne ord — logbogen skal ikke
     være en skyggekopi af tabellen ved siden af. */
  var LOG_SPRING_OVER = ['aendret', 'linjer', 'besked'];

  function logLokalt(d, tabel, foer, efter) {
    var f = {};
    var e = {};
    var hvad;

    Object.keys(efter).forEach(function (n) {
      if (LOG_SPRING_OVER.indexOf(n) !== -1) return;
      if (JSON.stringify(foer[n]) === JSON.stringify(efter[n])) return;
      f[n] = foer[n] === undefined ? null : foer[n];
      e[n] = efter[n];
    });
    if (!Object.keys(e).length) return;

    if (!foer.slettet && efter.slettet) hvad = 'i skraldespanden';
    else if (foer.slettet && !efter.slettet) hvad = 'hentet tilbage';
    else hvad = 'rettet';

    læg(d, tabel, foer, hvad, f, e);
  }

  function logSletLokalt(d, tabel, r) {
    læg(d, tabel, r, 'slettet for altid', null, null);
  }

  function læg(d, tabel, r, hvad, foer, efter) {
    d.logbog = d.logbog || [];
    d.logbog.unshift({
      id: næsteId(d.logbog),
      lokation_id: r.lokation_id || LOKATION,
      tabel: tabel,
      raekke_id: r.id,
      reference: r.reference || null,
      navn: r.navn || null,
      hvad: hvad,
      hvem: auth.email() || null,
      foer: foer,
      efter: efter,
      hvornaar: new Date().toISOString(),
    });
  }

  // 180 dage. Længere, og logbogen er blevet et arkiv over
  // kunders navne; kortere, og "hvem lukkede sæsonen ned i
  // efteråret" kan ikke besvares.
  var LOG_DAGE = 180;

  function skraldTabel(slags) {
    for (var i = 0; i < SKRALD_TABELLER.length; i++) {
      if (SKRALD_TABELLER[i].slags === slags) return SKRALD_TABELLER[i];
    }
    throw new Error('Ukendt slags: ' + slags);
  }

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

  // Datoen for N dage siden, i dansk tid.
  function førDato(dage) {
    var d = new Date(nu().dato + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - dage);
    return d.toISOString().slice(0, 10);
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
        navn: 'Mosede Havnecafe',
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
      dagens_retter: [],
      dags_regler: [],
      indstillinger: {
        dagens_besked: { vis: false, tekst: '' },
        saeson: { lukket: false, aabner_igen: '', besked: '' },
        kontakt_email: '',

        // Tavlen ved luge 2. Skiftes hver morgen i admin.
        // Tom liste = sektionen skjules helt.
        dagens_kugler: [],
        /* Dagens ret. Tom betyder "der er ikke skrevet noget i
           dag", og så findes blokken ikke på forsiden — se
           visIDag() i js/side.js. */
        dagens_ret: { navn: '', beskrivelse: '', pris: null },

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
        /* ⚠️ FIRE, IKKE ÉN (3/9). Kundens ord: "man skal minimum
           bestille 4 smørrebrød, så det skal stå som default".
           Øvetilstanden skal ikke være mildere end skyen — en
           efterligning, der tager imod mere end produktionen,
           beviser ingenting. */
        bestilling_min_stk: 4,
        bestilling_besked: '',
      },

      /* Bestillinger og forespørgsler findes KUN i øvetilstand.
         Mod skyen kan en gæst hverken læse eller skrive dem her –
         de går direkte i databasen, og kun personalet kan læse
         dem. */
      bestillinger: [],
      forespoergsler: [],
      /* Tom med vilje: der findes ikke et "standardbord". En
         opfundet liste ville give skilte til borde, der ikke
         er der. */
      borde: [],
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

    var lukkedag = lukketDen(d, t.dato);
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

    /* En tidlig lukning slår ugeplanen for netop den dag.

       Den må kun lukke TIDLIGERE, aldrig senere: står der i
       kalenderen, at der lukkes kl. 22 på en dag, hvor ugeplanen
       siger 20, er det en tastefejl eller en aftale, ingen har
       bekræftet — og forsiden ville love en åben luge to timer
       efter, personalet er gået hjem. Vi tager derfor det
       tidligste af de to. */
    var tidligt = tilMinutter(tidligLukning(d, t.dato));
    if (tidligt !== null && tidligt < lukker) {
      lukker = tidligt;
      i_dag = { ugedag: i_dag.ugedag, lukket: false,
        aabner: i_dag.aabner, lukker: pænTid(tidligLukning(d, t.dato)) };
    }

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

  /* ÉT sted der svarer på "er der lukket den dag".

     Det er ikke pedanteri: en lukkedag var før én dato, og tre
     steder i koden sammenlignede derfor bare `l.dato === iso`.
     Kalenderen kan lukke en PERIODE — en vinterlukning er én
     række med en slutdato, ikke halvfems rækker — og med den
     gamle sammenligning ville kun periodens første dag tælle som
     lukket. Resten af vinteren ville stå som åben på forsiden.

     Rækker uden slut_dato opfører sig præcis som før. */
  function lukketDen(d, iso) {
    return (d.lukkedage || []).filter(function (l) {
      return iso >= l.dato && iso <= (l.slut_dato || l.dato);
    })[0];
  }

  /* Kalenderen er kilden; lukkedage er en UDGAVE af den.

     Resten af koden — forsiden, bestillingsformularen, admin —
     spørger stadig til d.lukkedage, som den altid har gjort. Det
     er med vilje: de "er der åbent"-tests, der har kørt hele
     vejen igennem, er dermed sikkerhedsnettet under migrationen.
     Skiftede vi alle opslag på én gang, ville vi have ombygget
     både kilden og alle læserne i samme skridt og ikke kunne se,
     hvilken af delene der gik galt. */
  function afledLukkedage(d) {
    if (!Array.isArray(d.kalender)) return d;

    d.lukkedage = d.kalender
      .filter(function (k) { return k.type === 'lukkedag'; })
      .map(function (k) {
        return {
          id: k.id,
          lokation_id: k.lokation_id,
          dato: k.dato,
          slut_dato: k.slut_dato || null,
          // Kalenderen kalder det en titel; den gamle tabel kaldte
          // det en årsag. Læserne kender kun det sidste.
          aarsag: k.titel,
          emoji: k.emoji || null,
        };
      });
    return d;
  }

  /* Lukker vi tidligere end sædvanligt den dag? Returnerer
     klokkeslættet eller null. En tidlig lukning er ikke en
     lukkedag: der ER åbent, bare kortere, og en gæst der kommer
     kl. 19 til en luge, der lukkede 15, er lige så skuffet som en,
     der kom på en lukkedag. */
  /* ============================================================
     DE OFFENTLIGE ARRANGEMENTER  (30/8)
     ------------------------------------------------------------
     Reglen bor ét sted, så forsidens musikbanner, arrangementsiden
     og kalendersiden ikke kan komme til at vise tre forskellige
     lister. Kun det, der er markeret offentligt, og kun det, der
     ikke er overstået: en koncert i går hjælper ingen.

     ⚠️ FILTERET PÅ offentlig ER ET VÆRN, IKKE EN VISNING. I
     produktionen sorterer adgangsreglen dem fra, så gæsten aldrig
     får dem. I øvetilstand ligger ALT i den samme localStorage —
     og uden linjen her ville "Bent har ferie" stå på hjemmesiden,
     hver gang nogen åbnede siden lokalt.
     ============================================================ */
  function arrangementer(d) {
    var iDag = nu().dato;
    return ((d && d.kalender) || []).filter(function (k) {
      return k.type === 'arrangement'
        && k.offentlig
        && (k.slut_dato || k.dato) >= iDag;
    }).sort(function (a, b) {
      if (a.dato !== b.dato) return a.dato < b.dato ? -1 : 1;
      return String(a.start_kl || '') < String(b.start_kl || '') ? -1 : 1;
    });
  }

  /* Hvor mange pladser er der tilbage? Visningen kører med sin
     ejers øjne, så gæsten kan se TALLET uden at kunne se, HVEM der
     har taget de andre — se noten ved arrangement_pladser i
     supabase/arrangementer.sql.

     ⚠️ FEJLER DEN, ER DET IKKE EN FEJL PÅ SIDEN. Så står der bare
     ikke noget om pladser; arrangementet kan stadig ses og
     reserveres, og databasen dømmer alligevel ved afsendelsen. En
     side, der gik ned, fordi en tælling ikke kunne hentes, ville
     være værre end en side uden tallet. */
  function hentPladser() {
    if (!SKY) {
      var d = læsLokalt();
      var ud = {};
      (d.kalender || []).forEach(function (k) {
        if (k.type !== 'arrangement' || !k.offentlig || !k.tilmelding) return;
        var optaget = (d.reservationer || []).reduce(function (sum, r) {
          if (r.slettet || r.status === 'afvist') return sum;
          if (String(r.kalender_id) !== String(k.id)) return sum;
          return sum + (Number(r.antal_personer) || 0);
        }, 0);
        ud[k.id] = { pladser: k.pladser || null, optaget: optaget };
      });
      return Promise.resolve(ud);
    }
    return fetch(cfg.url + '/rest/v1/arrangement_pladser?select=*' + MIT, {
      headers: hoveder(),
    }).then(function (r) {
      if (!r.ok) return {};
      return r.json();
    }).then(function (liste) {
      var ud = {};
      (liste || []).forEach(function (r) {
        ud[r.kalender_id] = { pladser: r.pladser, optaget: r.optaget };
      });
      return ud;
    }).catch(function () { return {}; });
  }

  function tidligLukning(d, iso) {
    var k = (d.kalender || []).filter(function (x) {
      return x.type === 'tidlig_lukning'
        && iso >= x.dato && iso <= (x.slut_dato || x.dato);
    })[0];
    return k ? k.lukker_kl : null;
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

      if (lukketDen(d, iso)) continue;

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
  /* Har varen en pris? Bruges af både smoerrebroed() og udvalg(),
     og derfor ét sted: en vare uden pris kan ikke bestilles, og
     den regel må ikke kunne skride fra hinanden. */
  function harPris(v) {
    return v.pris !== null && v.pris !== undefined && v.pris !== '';
  }

  /* ---- LAVES KATEGORIEN DEN DAG? ----

     Kolonnen dage kom til med
     supabase/menukort-antal-og-dage.sql: alle | hverdage |
     weekend. Burgerne laves ikke i weekenden, og stod de på kortet
     alligevel, ville en gæst bestille en burger til lørdag, og
     køkkenet ville opdage det lørdag morgen.

     ⚠️ DEN SPØRGER PÅ BESTILLINGENS DATO, IKKE PÅ I DAG. En gæst,
     der på en onsdag bestiller til lørdag, skal se lørdagens kort.
     Filtrerede vi på "i dag", kunne hun bestille burgere til
     lørdag hver eneste hverdag — og databasens værn ville afvise
     det bagefter med en fejl, hun ikke kunne gøre noget ved.

     ⚠️ UDEN EN DATO ER SVARET JA. udvalg() kaldes også dér, hvor
     der ikke er valgt en dag endnu (menukortet, det første
     tegn af formularen). At skjule halvdelen af kortet, fordi
     ingen har valgt en dato, ville være værre end at vise for
     meget: databasen siger nej til sidst, og siden klipper
     listen, så snart dagen er valgt.

     ⚠️ OG UDEN KOLONNEN ER SVARET OGSÅ JA. SQL-filen er ejerens at
     køre; indtil da har ingen kategori et dage-felt, og hele
     kortet skal stå som før.

     isodow: 1 = mandag … 7 = søndag. getUTCDay() giver søndag = 0
     og gør weekend til et opdelt interval — samme valg som i
     mosede_kategori_paa_dagen(). De to skal svare ens. */
  function kategoriPaaDag(k, iso) {
    var dage = k && k.dage;
    if (!dage || dage === 'alle' || !iso) return true;
    var t = String(iso).split('-');
    var dag = new Date(Date.UTC(+t[0], +t[1] - 1, +t[2])).getUTCDay();
    var isodow = dag === 0 ? 7 : dag;
    if (dage === 'hverdage') return isodow >= 1 && isodow <= 5;
    if (dage === 'weekend') return isodow >= 6;
    return true;
  }

  /* ⚠️ "SKIVER"-MODELLEN ER VÆK  (31/8) — OG DET ER EN
     BESLUTNING, IKKE EN OPRYDNING.

     Her stod stoerrelserne(): ejeren havde ét kort, der hed
     SMØRREBRØD, og ét, der hed HÅNDMADDER, med det SAMME fyld
     til hver sin pris, så gæsten valgte først en størrelse og
     derefter et fyld.

     Kundens ord 31/8: *"alle smørbrødne sælges som de er, ikke
     noget med valg af brød og derefter pålæg — nej, 1 mad er som
     1 mad, og de skal allesammen kunne vælges i smørbrød ud af
     huset, normale bestillinger og QR-kode-bestillinger."*

     Altså: ÉN vare, ét navn, én pris, ét sted at rette. Det
     fjerner tre ting på én gang — størrelsesvælgeren, fyldet som
     ønske uden pris, og forsidens filter, der holdt de 29 fyld
     ude. Prisen sidder på varen, som den gør på alt andet på
     kortet, og ejeren styrer udvalget med de flueben, han
     allerede har (aktiv og udsolgt).

     ⚠️ REGLEN BOR HER OG KUN HER. Tre sider spørger det samme
     udvalg — forsiden, bestil/ og ved-bordet/ — og det er hele
     grunden til, at ændringen er tre linjer og ikke tre
     formularer. */
  function smoerrebroed(d) {
    /* ⚠️ "håndmad" ER MED I REGEXEN  (1/9). Ejerens to kort
       sælger det SAMME 24 slags som hel skive (55) og som
       håndmad (27), og håndmadderne fik derfor deres egen
       kategori. Uden ordet her ville "Håndmadder" være en
       almindelig kategori: den ville falde ud af smørrebrødets
       lister, ud af mindsteantallet — og HELT væk fra bestil/,
       som kun viser smørrebrødets kategorier. Målt: 24 varer
       usynlige uden en eneste fejl. */
    var kat = (d.menu_kategorier || []).filter(function (k) {
      return k.aktiv !== false && /smørrebrød|håndmad|fyld/i.test(k.navn || '');
    });
    var ids = kat.map(function (k) { return k.id; });

    /* SKELLET GÅR PÅ KATEGORIEN, IKKE PÅ PRISEN.

       Før stod der: har varen en pris, er det et stykke; har den
       ingen, er det fyld. Det holdt, så længe fyldet var gratis
       tilbehør — men i det øjeblik ejeren giver de 29 fyld hver
       sin pris, ville ALLE fyld blive til stykker, og forsiden
       ville love 34 slags smørrebrød i stedet for 5.

       Kategorien er det stabile signal: "Vælg fyld til
       smørrebrødet" er fyld, uanset hvad der står i priskolonnen. */
    var fyldIds = kat.filter(function (k) { return /fyld/i.test(k.navn || ''); })
      .map(function (k) { return k.id; });

    var varer = (d.menu_varer || []).filter(function (v) {
      return v.aktiv !== false && ids.indexOf(v.kategori_id) !== -1;
    });

    function erFyld(v) { return fyldIds.indexOf(v.kategori_id) !== -1; }
    function efterSortering(a, b) {
      return (a.sortering || 0) - (b.sortering || 0);
    }

    var stykker = varer.filter(function (v) { return !erFyld(v) && !v.udsolgt; })
      .sort(efterSortering);
    var fyld = varer.filter(function (v) { return erFyld(v) && !v.udsolgt; })
      .sort(efterSortering);

    return {
      // Udsolgte er ude af de bestilbare lister: man skal ikke
      // kunne bestille dem …
      stykker: stykker,
      fyld: fyld,

      /* ⚠️ 1 MAD ER 1 MAD  (31/8) — MODEL A ER AFLØST.

         Model A delte smørrebrødet i to: et fyld MED pris var en
         vare, et fyld UDEN pris var et ØNSKE, gæsten satte et hak
         ved. Kunden lukkede den 31/8: *"alle smørbrødne sælges
         som de er ... 1 mad er som 1 mad, og de skal allesammen
         kunne vælges."*

         Derfor er der ÉN liste nu. Et stykke uden pris er ikke et
         ønske — det er en vare, ejeren ikke har prissat endnu, og
         den følger husets almindelige regel fra 26/8: den VISES
         med "Ring og hør prisen" og kan ikke lægges i kurven. Det
         er den samme regel, resten af de 242 varer kører på, og
         det er hele pointen: smørrebrødet er ikke længere en
         undtagelse.

         ⚠️ oenskefyld ER TOM MED VILJE og ikke slettet. Tre
         formularer spørger efter den (bestil/ har en fyldvælger,
         der skjuler sig selv, når listen er tom), og en nøgle,
         der forsvinder, giver `undefined.length` i stedet for en
         pænt skjult fold. */
      bestilbare: stykker.concat(fyld).filter(harPris).sort(efterSortering),
      oenskefyld: [],

      /* Alt smørrebrød UDEN pris — stykker og fyld under ét.
         Vises, kan ringes om, kan ikke købes. */
      spoerg: stykker.concat(fyld).filter(function (v) { return !harPris(v); })
        .sort(efterSortering),

      /* Til grupperingen på bestillingssiden: hvad hedder den
         kategori, stykkerne kommer fra? Navnet er data fra
         menukortet, ikke et ord, jeg har fundet på. */
      /* ⚠️ EN LISTE OG IKKE ÉT NAVN  (1/9). Der er to
         smørrebrødskategorier nu — hel skive og håndmadder — og
         bestillingssiden bygger sin faste rækkefølge af DEN her.
         Var den stadig ét navn, ville den ene af de to
         kategorier ikke stå i rækkefølgen, og dens 24 varer
         ville aldrig blive tegnet: de er i `liste`, men ingen
         gruppe henter dem. `stykkeGruppe` bliver stående for
         det, der stadig spørger om ét navn. */
      stykkeGrupper: kat.filter(function (k) {
        return !/fyld/i.test(k.navn || '');
      }).sort(efterSortering).map(function (k) { return k.navn; }),
      stykkeGruppe: (kat.filter(function (k) {
        return !/fyld/i.test(k.navn || '');
      })[0] || {}).navn || 'Smørrebrød',

      /* Bestillingssiden grupperer stykker og fyld hver for sig og
         skal kunne spørge, hvad den har i hånden. Svaret bor her,
         hvor kategorierne bliver læst — ikke som en regex mere. */
      erFyld: erFyld,
      kategoriIds: ids,
      /* … men de skal VISES. En vare, der bare forsvinder, ligner
         en vare, der ikke findes — og så tror gæsten, at kortet er
         blevet mindre. Gennemstreget med "udsolgt i dag" siger
         sandheden: den findes, bare ikke lige nu. Som hos spiis. */
      udsolgt: {
        stykker: varer.filter(function (v) { return !erFyld(v) && v.udsolgt; })
          .sort(efterSortering),
        fyld: varer.filter(function (v) { return erFyld(v) && v.udsolgt; })
          .sort(efterSortering),
      },
    };
  }

  /* ----------------------------------------------------------
     HVAD KAN BESTILLES UD AF HUSET?
     ----------------------------------------------------------
     Smørrebrødet altid — det er dét, siden er bygget om. Grill,
     is og resten af kortet KUN hvis personalet har sat flueben
     ved kategorien i admin.

     Beslutningen er ejerens og bor i indstillinger, ikke i koden.
     Den dag køkkenet kan nå at lave pølser ud af huset, er det ét
     flueben på Menukort-fanen — ikke en ny side, ikke en ny
     udgivelse. Og lige så vigtigt den anden vej: er fluebenet
     ikke sat, står der ikke ét ord om det på siden.

     Kun varer MED pris kommer med, af samme grund som ved fyldet:
     en kurv kan ikke lægge en pris sammen, ingen har givet os.
     ---------------------------------------------------------- */
  /* ISEN KAN IKKE BESTILLES, og det er ejerens ord (23/8): "det
     skal man ikke kunne bestille, det er altid til rådighed."

     Isafsnittet nederst på forsiden er en fremvisning — filmen,
     udsigten og kuglerne på tavlen — og en softice, man skal
     bestille et døgn i forvejen, er ikke en softice.

     Reglen står HER og ikke i opmærkningen, fordi den ellers
     ville skride fra hinanden den dag, nogen sætter et flueben
     mere i admin. Admin viser af samme grund ikke isens
     kategorier i "kan bestilles ud af huset". */
  function erIs(k) { return k && k.afdeling === 'is'; }

  /* ---- HVOR OG HVAD KOSTER LEVERING? ----------------------

     Mikkel oplyste området 27/8: Karslunde, Greve, Tune, Solrød
     og omegn. Det står som en INDSTILLING og ikke i koden — hver
     ny by ville ellers være en udgivelse hos os.

     ⚠️ TOM ER IKKE NUL. Et tomt prisfelt betyder "vi har ikke sat
     en pris", og så siger siden, at I ringer og aftaler den.
     Skrev vi "0 kr.", ville gæsten regne med gratis levering.
     Designets "150 kr. inden for 10 km af havnen" var et opdigtet
     tal og er væk fra siden.

     ⚠️ REGLEN BOR HER, FORDI TO SIDER SPØRGER DEN (31/8).
     Forsidens bestilling (js/skal/bestil.js) og smørrebrødets
     forespørgsel (js/skal/forespoergsel.js) skriver den samme
     sætning. Da smørrebrødssiden blev en forespørgsel, fulgte
     koden ikke med, og fire prøver holdt op med at måle noget —
     dét er husets egen lære om, at dækning forsvinder, når en
     fil holder op med at blive kørt. To kopier af sætningen ville
     langsomt sige hver sit om det samme område. */
  function leveringsTekst(ind, ogsaaAfhentning) {
    var i = ind || {};
    var omr = String(i.leverings_omraade || '').trim();
    var pris = String(i.leverings_pris || '').trim();
    return {
      omraade: omr,
      pris: pris,
      faktaFed: omr ? 'Vi leverer i ' + omr : 'Levering',
      faktaResten: (pris ? ' for ' + pris : '')
        + (ogsaaAfhentning ? ' — eller hent selv ved lugen.' : ' — hent selv ved lugen.'),
      hint: (omr ? 'Vi leverer i ' + omr + '. ' : '')
        + (pris ? 'Levering koster ' + pris + '.'
          : 'Vi ringer og aftaler prisen med jer.'),
    };
  }

  /* HVAD SKAL MED I LISTEN?
     ----------------------------------------------------------
     Forsiden har to bestillinger, og de er to forskellige
     handler:

       'uden-smoer'  dagens ret, grillen, drikkevarerne — det man
                     henter i eftermiddag
       'kun-smoer'   smørrebrødet, som har varsel og mindsteantal,
                     og som er en af forretningens hovedting.
                     ⚠️ 'uden-fyld' og 'skiver' er det SAMME som
                     den siden 31/8 — se noten længere nede

     Kundens ord (23/8): smørrebrødet "fortjener deres eget
     bestillings ting". Uden det stod de fem stykker som én fold
     blandt drikkevarerne.

     Standarden er 'alt', så et kald uden argument opfører sig
     som før. */
  /* ⚠️ TIDSPUNKTET ER ET ARGUMENT NU (30/8). Kundens ord:
     "morgenmad kun 10-12.30 og derefter alt andet ... man skal
     ikke kunne bestille en dagensret eller en burger klokken
     10.00, det er først efter 12.30."

     Kategorien har et vindue og et varsel (se kategoriPaaTid i
     js/bestil-regler.js), og listen deler sig derfor i to: det,
     der kan bestilles til det valgte klokkeslæt, og det, der ikke
     kan — MED grunden. En kategori, der bare forsvandt, ville
     ligne en fejl på siden. */
  function udvalg(d, hvad, iso, tid, hvordan) {
    var sm = smoerrebroed(d);
    var valgte = ((d.indstillinger || {}).bestilbare_kategorier || [])
      .map(Number);

    var kunSmoer = hvad === 'kun-smoer';
    /* ⚠️ 'skiver' OG 'uden-fyld' ER DET SAMME SOM 'kun-smoer' NU
       (31/8). Ordene bliver stående, fordi de står i
       data-udvalg på tre formularer og i prøver — men de deler
       én liste: alt smørrebrød, ét navn pr. vare, én pris.

       'skiver' var størrelsesmodellen (hel skive / håndmad med
       fyld ovenpå). 'uden-fyld' var forsidens filter, der holdt
       de 29 fyld ude, fordi de dengang var byggeri og ikke mad.
       Begge dele faldt med kundens ord 31/8: *"de skal
       allesammen kunne vælges i smørbrød ud af huset, normale
       bestillinger og QR-kode-bestillinger."*

       'uden-smoer' består: det er forsidens gamle mulighed for
       at sælge grill og drikkevarer UDEN smørrebrød, og den
       handler om noget andet. */
    var udenSmoer = hvad === 'uden-smoer';

    var navne = {};
    var raekker = {};
    (d.menu_kategorier || []).forEach(function (k) {
      navne[k.id] = k.navn;
      raekker[k.id] = k;
    });

    function efterSortering(a, b) {
      return (a.sortering || 0) - (b.sortering || 0);
    }

    var R = window.MosedeRegler;
    var lukkede = [];
    function paaTid(k) {
      if (!R || !R.kategoriPaaTid) return true;
      var svar = R.kategoriPaaTid(d, k.id, iso, tid, hvordan);
      if (!svar.aaben) lukkede.push({ navn: k.navn, grund: svar.grund, id: k.id });
      return svar.aaben;
    }

    var ekstraKat = kunSmoer ? [] : (d.menu_kategorier || []).filter(function (k) {
      return k.aktiv !== false
        && !erIs(k)
        && kategoriPaaDag(k, iso)
        && valgte.indexOf(Number(k.id)) !== -1
        && sm.kategoriIds.indexOf(k.id) === -1;
    }).sort(efterSortering).filter(paaTid);

    var ekstraVarer = [];
    var ekstraUdsolgt = [];
    var ekstraSpoerg = [];
    ekstraKat.forEach(function (k) {
      (d.menu_varer || [])
        .filter(function (v) { return v.kategori_id === k.id && v.aktiv !== false; })
        .sort(efterSortering)
        .forEach(function (v) {
          /* EN VARE UDEN PRIS KAN SES, MEN IKKE BESTILLES.

             Den kunne bestilles før — "??" på listen, og gæsten
             fik prisen, "når vi ringer og bekræfter" (kundens ord
             23/8). Men opkaldet forsvandt SAMME dag: auto_bekraeft
             blev slået til, og "bestilt er bestilt". Så var der
             ingen tilbage til at sige prisen — bestillingen gik
             bare igennem, gæsten anede ikke, hvad den kostede, og
             i salgstallene talte varen som 0 kr. Præcis den fejl
             stod fire dage i spiis' produktionsdatabase, før
             nogen så den (25/8).

             Reglen er nu den samme som fyldets har været hele
             tiden (model A): kan vi prissætte det, kan det
             bestilles — kan vi ikke, kan der ringes. Listen
             spoergPris VISES stadig: en vare, der forsvinder,
             ligner en vare, der ikke findes. */
          if (v.udsolgt) ekstraUdsolgt.push(v);
          else if (harPris(v)) ekstraVarer.push(v);
          else ekstraSpoerg.push(v);
        });
    });

    /* FORSIDEN SÆLGER STYKKERNE, MEN IKKE FYLDET.

       Første forsøg tog HELE smørrebrødet ud af forsiden
       (uden-smoer). Det var rigtigt tænkt og forkert i praksis:
       forretningen har i dag ikke åbnet for andet end
       smørrebrødet i admin, så forsidens liste blev TOM — og så
       skjulte afsnittet sig selv. Netop det afsnit, gæsten
       primært skal bestille i. Kunden så det med det samme:
       "nu er bestillings tingen væk fra sectionen nummer 2."

       uden-fyld var svaret: et stykke smørrebrød til 55 kr. er
       mad og hører hjemme i listen sammen med grillen og
       drikkevarerne, mens BYGGERIET — de 29 slags fyld — blev på
       bestil/.

       ⚠️ OG DEN HALVDEL ER VÆK (31/8). Kunden lukkede modellen:
       *"1 mad er som 1 mad, og de skal allesammen kunne vælges."*
       Der er ikke noget byggeri længere, og 'uden-fyld' filtrerer
       derfor ingenting. Ordet bliver stående, fordi det står i
       data-udvalg på to formularer og i prøver.

       uden-smoer beholdes, for reglen kan blive rigtig igen den
       dag, køkkenet har åbnet for nok andet. */
    /* Smørrebrødets egne kategorier følger den samme regel. Er
       de lukkede på det valgte tidspunkt, står de i lukkede[] med
       en grund — og listen bliver tom i stedet for at love noget,
       køkkenet ikke kan nå. */
    var smoerLukket = false;
    if (!udenSmoer && R && R.kategoriPaaTid) {
      var smKat = (d.menu_kategorier || []).filter(function (k) {
        return k.aktiv !== false && sm.kategoriIds.indexOf(k.id) !== -1;
      });
      /* Lukket først, når ALLE smørrebrødets kategorier er det.
         Er kun fyldet uden for sit vindue, er stykkerne der
         stadig — og omvendt. */
      var aabne = smKat.filter(paaTid);
      smoerLukket = smKat.length > 0 && aabne.length === 0;
    }

    /* ⚠️ ÉN LISTE, ÉT NAVN, ÉN PRIS  (31/8).

       Her stod størrelsesmodellen: hvad brødet skulle være, og
       derefter hvilket fyld der skulle på. Den er væk med
       kundens ord — se noten i smoerrebroed() ovenfor.

       Tilbage står den enkleste regel i huset: har varen en
       pris, kan den bestilles; har den ikke, kan der ringes;
       er den udsolgt, står den gennemstreget. Nøjagtig som de
       øvrige 200 varer på kortet. */
    var smoerVarer = (udenSmoer || smoerLukket) ? [] : sm.bestilbare;
    var smoerFyld = [];
    var smoerUdsolgt = udenSmoer ? []
      : sm.udsolgt.stykker.concat(sm.udsolgt.fyld);

    /* Smørrebrødets egne stykker uden pris. De forsvandt bare før
       (filter(harPris) og så ikke mere) — og en vare, der
       forsvinder, ligner en vare, der ikke findes. Fyld uden pris
       hører IKKE til her: det er ønskefyldet, og det har sin egen
       fold (model A). */
    var smoerSpoerg = udenSmoer ? [] : sm.spoerg;

    return {
      varer: smoerVarer.concat(ekstraVarer),
      oenskefyld: smoerFyld,
      /* ⚠️ TOMME MED VILJE, IKKE SLETTEDE. Størrelses- og
         variantmodellen er væk (31/8), men tre formularer
         spørger stadig efter nøglerne, og deres afsnit skjuler
         sig selv, når listen er tom. En nøgle, der forsvinder,
         giver `undefined.length` midt i en optegning i stedet
         for en pænt skjult fold. */
      varianter: [],
      stoerrelser: [],
      /* Kan ses, kan ringes om — kan ikke lægges i kurven.
         Se noten ved ekstraSpoerg ovenfor. */
      spoergPris: smoerSpoerg.concat(ekstraSpoerg),
      udsolgt: smoerUdsolgt.concat(ekstraUdsolgt),
      erFyld: sm.erFyld,
      /* ⚠️ MINDSTEANTALLET SKAL KUNNE SPØRGE, HVAD DER ER
         SMØRREBRØD (30/8). Reglen er smørrebrødets alene, og
         formularen kan kun håndhæve den, hvis den kan se, hvilke
         kategorier der tæller med. Skellet bor HER, hvor
         kategorierne bliver læst — ikke som en regex i hver
         formular. */
      smoerKategorier: sm.kategoriIds,
      /* ⚠️ HVILKE KATEGORIER SÆLGER DEN HER SIDE? (30/8)

         Tidsvælgeren skal kende det mindste varsel blandt DEM —
         ikke forretningens ene tal. Forsiden sælger grill og
         smørrebrød og kan derfor tilbyde i dag; bestil/ sælger kun
         smørrebrød og begynder i morgen. Se R.mindsteVarsel. */
      /* Det, der IKKE kan bestilles til det valgte klokkeslæt, og
         hvorfor. Siden siger det; den skjuler det ikke. */
      lukkede: lukkede,
      katIds: (function () {
        var set = {};
        smoerVarer.concat(ekstraVarer).forEach(function (v) {
          if (v && v.kategori_id !== undefined) set[v.kategori_id] = true;
        });
        return Object.keys(set).map(Number);
      }()),
      stykkeGruppe: sm.stykkeGruppe,
      stykkeGrupper: sm.stykkeGrupper,
      kategoriNavn: function (v) { return navne[v.kategori_id] || ''; },
      /* ⚠️ HELE KATEGORIRÆKKEN OG IKKE KUN NAVNET. Varens emoji
         falder tilbage på kategoriens, og den kender både et
         `emoji`-felt (den dag ejeren får det i admin) og
         `afdeling`. Med kun navnet ville reserven være et gæt på
         et gæt. */
      katFor: function (v) { return raekker[v && v.kategori_id] || null; },
      // Rækkefølgen de ekstra grupper skal stå i — efter smørrebrødet
      ekstraGrupper: ekstraKat.map(function (k) { return k.navn; }),
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
    if (/udlejning_dagen_er_taget/.test(t)) {
      return new Error('Dagen er allerede lejet ud – der kan kun være ét ja pr. dag. '
        + 'Afvis det gamle først, hvis det er aflyst.');
    }
    /* Sker kun ved FORTRYD fra skraldespanden: gæsten har sendt
       præcis den samme igen, mens den lå i spanden. Kom den gamle
       tilbage, ville der stå to ens på listen, og køkkenet ville
       lave maden to gange. Uden den her tekst ville personalet få
       "Den findes allerede" og ikke vide hvad der fandtes. */
    if (/_ikke_dobbelt/.test(t)) {
      return new Error('Den kan ikke hentes tilbage: gæsten har sendt præcis '
        + 'den samme igen, mens den lå i skraldespanden. Den nye står på listen.');
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

  /* Ét sted, der afgør hvad 'hvordan' er. Stod prøven to steder
     — i rækken og i adressens nulstilling — kunne de skride fra
     hinanden, og så ville en adresse følge med en afhentning. */
  function hvordanEt(v) {
    return (v === 'spis_her' || v === 'levering') ? v : 'afhentning';
  }

  function bestil(b) {
    var linjer = (b.linjer || []).map(function (l) {
      var ud = {
        navn: String(l.navn || '').slice(0, 120),
        antal: Math.round(Number(l.antal) || 0),
        pris: talEllerNull(l.pris),
      };
      /* ⚠️ VARIANTEN ER EN EKSTRA OPLYSNING, IKKE ET NYT NAVN.

         Et stykke smørrebrød hedder "Smørrebrød" og koster 55,
         uanset om der ligger leverpostej eller ost på. Skrev vi
         "Smørrebrød med leverpostej" i navnet, ville databasens
         pris-værn og udsolgt-værn ikke længere kunne finde varen
         på kortet — begge slår op på NAVNET — og så ville de to
         værn tie på præcis den bestilling, de er sat til at
         fange. Køkkenet får varianten at se; værnene får det navn,
         der står på menukortet.

         Feltet må kun med, når det ER der: en tom streng på hver
         eneste linje ville stå som en tom parentes i admin. */
      if (l.variant) ud.variant = String(l.variant).slice(0, 120);
      /* ⚠️ FLAGET SKAL MED IND I DATABASEN (4/9). Her stod kun
         navn, antal, pris og variant — så `emballage: true` blev
         tavst tørret af på vejen ind, og Butik.erEmballage måtte
         falde tilbage på NAVNET, som kun er reserven for rækker
         fra før 1/9.

         Det gik godt for emballagen, fordi den hedder
         "Emballage". Det gik IKKE godt for fragten: en linje, der
         hedder "Levering", matcher intet navn — så køkkenet fik
         "lav 1 Levering" i sin produktionsliste, og dagens tal
         sagde én ret for meget. Fundet af den prøve, der læser
         den GEMTE række og ikke kurven på skærmen.

         Kun `true` sendes: `emballage: false` på hver eneste
         madlinje ville være en kolonne fuld af støj i en jsonb,
         personalet også kigger i. */
      if (l.emballage === true) ud.emballage = true;
      return ud;
    }).filter(function (l) { return l.navn && l.antal > 0; });

    var antal = linjer.reduce(function (s, l) { return s + l.antal; }, 0);

    var raekke = {
      reference: lavReference('SM'),
      lokation_id: b.lokation_id || LOKATION,
      navn: String(b.navn || '').trim().slice(0, 80),
      /* ⚠️ TOM BLIVER null, IKKE ''  (31/8). Ved bordet er
         telefonen frivillig (se supabase/bord-uden-telefon.sql),
         og en tom streng i kolonnen ville stå som et blankt
         telefonlink på personalets kort — en knap, der ringer
         ingen steder hen. null betyder "ingen oplyste et", og
         kortet lader linjen falde ud af sig selv. */
      telefon: String(b.telefon || '').trim()
        ? String(b.telefon).trim().slice(0, 30) : null,
      email: String(b.email || '').trim() ? String(b.email).trim().slice(0, 160) : null,
      hent_dato: b.hent_dato,
      hent_tid: String(b.hent_tid || '').slice(0, 5),
      /* Spis her, tag med eller levering. Alt andet bliver
         afhentning: det er den form, siden har kunnet altid, og
         databasen afviser resten (bestilling_hvordan_ok). */
      hvordan: hvordanEt(b.hvordan),
      /* Adressen hænger sammen med svaret, og databasen håndhæver
         BEGGE veje (bestilling_levering_adresse_ok): den skal
         være der ved levering, og den skal være tom ellers.
         Derfor nulstilles den her ud fra hvordan og ikke ud fra,
         om feltet tilfældigvis har noget i sig — skiftede gæsten
         fra levering til afhentning, ville en adresse, der blev
         hængende, sende køkkenet ud med mad, nogen står og venter
         på ved lugen. */
      leverings_adresse: hvordanEt(b.hvordan) === 'levering'
        ? String(b.leverings_adresse || '').trim().slice(0, 300)
        : null,
      linjer: linjer,
      /* Fyldet er ØNSKER, ikke varer med antal – se noten i
         setup.sql. Højst 40, samme grænse som databasens. */
      fyld: (b.fyld || []).slice(0, 40).map(function (f) {
        return String(f).slice(0, 120);
      }),
      antal: antal,
      /* BORDET, og kun ved spis her: et bordnummer på en
         afhentning er to ting på én gang, og køkkenet kan ikke
         gøre begge. Databasen håndhæver det samme
         (bestilling_bord_hvordan_ok). Nulstilles ud fra hvordan
         og ikke ud fra feltet — som leveringsadressen. */
      bord_nummer: hvordanEt(b.hvordan) === 'spis_her'
        && String(b.bord_nummer || '').trim()
        ? String(b.bord_nummer).trim().slice(0, 40)
        : null,

      /* NØGLEN FRA QR-KODEN (?n=…). Databasen læser den og
         NULSTILLER den samme sted (supabase/bord-noegle.sql), så
         den aldrig bliver liggende i en tabel, personalet læser.
         Sendes kun ved et bord — en frokost hjemmefra har ingen. */
      bord_kode: hvordanEt(b.hvordan) === 'spis_her'
        && String(b.bord_nummer || '').trim()
        && String(b.bord_kode || '').trim()
        ? String(b.bord_kode).trim().slice(0, 32)
        : null,
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
         anderledes end det rigtige – og så er det ikke en øvelse.

         !x.slettet står her og i de syv andre tællinger på
         gæstesiden, fordi nøglerne og bremserne i databasen er
         DELVISE: de ser bort fra skraldespanden. Uden det ville
         en gæst, hvis bestilling personalet lige har smidt ud,
         få "du har allerede sendt den her" på grund af noget,
         ingen af dem kan se. Se supabase/skraldespand.sql. */
      /* ⚠️ OG DEN GÆLDER IKKE BORDENE. En bordbestilling vælger
         ingen hentetid — hent_tid er klokken NU. Selskabet ved
         bord 7 bestiller is efter maden, trykker "Bestil noget
         mere" og rammer det samme minut; fangede vagten dem, fik
         de "du har allerede sendt en bestilling til det
         tidspunkt", som om de havde dobbeltklikket, og isen blev
         aldrig bestilt. Se supabase/restaurant.sql punkt 3 —
         indekset dér har den samme betingelse.

         Dobbelttrykket ved bordet fanges af skærmen i stedet:
         knappen slås fra, mens der sendes, og kvitteringen dækker
         formularen bagefter. */
      var dobbelt = !raekke.bord_nummer && d.bestillinger.some(function (x) {
        return !x.slettet
            && !x.bord_nummer
            && x.telefon === raekke.telefon
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
        return !x.slettet
          && x.telefon === raekke.telefon
          && Date.parse(x.oprettet || 0) > etDoegnSiden;
      }).length;
      if (fraNummeret >= 5) {
        return Promise.reject(new Error(
          'Der er allerede sendt flere bestillinger fra det nummer i dag. '
          + 'Ring til os, så tager vi den over telefonen.'));
      }

      /* UDSOLGT-VÆRNET — samme regel som mosede_udsolgt_vaern i
         supabase/bord-loft.sql.

         ⚠️ ET NAVN, DER IKKE STÅR PÅ KORTET, RØRES IKKE. Dagens
         ret bor i sin egen tabel og har sin egen nedtælling;
         afviste værnet alt, det ikke kunne finde, ville en ret,
         ejeren skrev i hånden i morges, blive umulig at bestille.
         Den fælde er der en SQL-prøve på (nr. 5). */
      var kanKoebes = {};
      var findesPaaKortet = {};
      var prisPaaKortet = {};
      (d.menu_varer || []).forEach(function (v) {
        var k = (d.menu_kategorier || []).filter(function (x) {
          return String(x.id) === String(v.kategori_id);
        })[0];
        if (!k) return;
        var n = String(v.navn || '').trim().toLowerCase();
        if (!n) return;
        findesPaaKortet[n] = true;
        if (v.aktiv !== false && k.aktiv !== false && !v.udsolgt) {
          kanKoebes[n] = true;
          if (v.pris !== null && v.pris !== undefined && v.pris !== '') {
            prisPaaKortet[n] = true;
          }
        }
      });

      var vaek = (raekke.linjer || []).map(function (l) { return l.navn; })
        .concat(raekke.fyld || [])
        .filter(function (navn) {
          var n = String(navn || '').trim().toLowerCase();
          return n && findesPaaKortet[n] && !kanKoebes[n];
        })[0];
      if (vaek) {
        return Promise.reject(new Error(
          '"' + vaek + '" er lige blevet udsolgt. Tag den af, så sender vi resten.'));
      }

      /* PRIS-VÆRNET — samme regel som mosede_pris_vaern i
         supabase/pris-vaern.sql. En vare, der står på kortet uden
         pris, kan ikke bestilles: der er ingen at ringe og sige
         prisen (auto_bekraeft), så gæsten ville først høre den
         ved lugen, og i salgstallene talte den som 0 kr.

         KUN linjerne — fyldet er ØNSKER uden pris pr. model A og
         skal kunne sendes. Og kun navne, der FINDES på kortet:
         dagens ret bor i sin egen tabel og har sit eget værn
         (retKanBestilles). */
      var udenPris = (raekke.linjer || []).map(function (l) { return l.navn; })
        .filter(function (navn) {
          var n = String(navn || '').trim().toLowerCase();
          return n && findesPaaKortet[n] && kanKoebes[n] && !prisPaaKortet[n];
        })[0];
      if (udenPris) {
        return Promise.reject(new Error(
          '"' + udenPris + '" har ikke fået en pris endnu og kan ikke bestilles '
          + 'her. Ring til os, så tager vi den over telefonen.'));
      }

      /* LOFTET PR. KVARTER — samme regel som mosede_bord_loft.
         Kun bordene, og kun når ejeren har sat et tal: en
         indstilling, ingen har rørt, må ikke kunne lukke for
         noget, der virkede i går. Nul og negativ er også "intet
         loft" — skrev nogen 0 for at slå det fra, må det ikke
         betyde "ingen ordrer overhovedet". */
      var loft = Number((d.indstillinger || {}).bord_loft_pr_kvarter);
      if (raekke.bord_nummer && isFinite(loft) && loft > 0) {
        var kvarterSiden = Date.now() - 15 * 60 * 1000;
        var iKvarteret = d.bestillinger.filter(function (x) {
          return !x.slettet && x.bord_nummer
            && Date.parse(x.oprettet || 0) > kvarterSiden;
        }).length;
        if (iKvarteret >= loft) {
          return Promise.reject(new Error(
            'Der er run på lige nu, og køkkenet kan ikke tage flere '
            + 'bestillinger fra bordene i øjeblikket. Prøv igen om lidt '
            + '— eller kom op til lugen, hvis det haster.'));
        }
      }

      /* LOFTET PR. TIDSRUM — samme regel som mosede_luge_loft.
         ⚠️ Øvetilstanden skal fejle som skyen: en efterligning,
         der tager imod mere end produktionen, beviser ingenting.
         Bordene springes over, de afviste og de slettede tæller
         ikke med, og tom/nul/negativ er intet loft. */
      var lugeLoft = window.MosedeRegler && MosedeRegler.lugeLoft
        ? MosedeRegler.lugeLoft(d) : null;
      if (!raekke.bord_nummer && lugeLoft) {
        var iTiden = d.bestillinger.filter(function (x) {
          return !x.slettet && !x.bord_nummer && x.status !== 'afvist'
            && x.hent_dato === raekke.hent_dato
            && String(x.hent_tid || '').slice(0, 5)
               === String(raekke.hent_tid || '').slice(0, 5);
        }).length;
        if (iTiden >= lugeLoft) {
          var fejlFuld = new Error('Kl. '
            + String(raekke.hent_tid || '').slice(0, 5).replace(':', '.')
            + ' er lige blevet fyldt op. Vælg et andet tidspunkt — '
            + 'listen er opdateret nu.');
          fejlFuld.tidFuld = true;
          return Promise.reject(fejlFuld);
        }
      }

      /* Samme værn som mosede_bord_findes i databasen: en kode
         med et forkert bordnummer skal fælde begge steder. */
      if (raekke.bord_nummer) {
        var kendt = (d.borde || []).some(function (b) {
          return b.aktiv !== false
            && String(b.nummer).trim().toLowerCase()
               === raekke.bord_nummer.trim().toLowerCase();
        });
        if (!kendt) {
          return Promise.reject(new Error('Vi kan ikke finde det bord. '
            + 'Sig det til os ved lugen, så tager vi bestillingen dér.'));
        }

        /* ⚠️ SAMME VÆRN SOM mosede_bord_noegle. Øvetilstanden skal
           fejle som skyen: en efterligning, der tager imod mere end
           produktionen, beviser ingenting. Har bordet en nøgle, skal
           den passe — og uden nøgle på bordet er alt som før, så
           filen ikke låser 55 skilte ude, den dag den køres. */
        var bordet = (d.borde || []).filter(function (b) {
          return String(b.nummer).trim().toLowerCase()
                 === raekke.bord_nummer.trim().toLowerCase();
        })[0];
        var kræver = bordet && String(bordet.kode || '').trim();
        if (kræver) {
          var sendt = String(raekke.bord_kode || '').trim().toUpperCase();
          if (!sendt) return Promise.reject(new Error(FEJL_KODE_MANGLER));
          if (sendt !== kræver.toUpperCase()) {
            return Promise.reject(new Error(FEJL_KODE_FORKERT));
          }
        }
      }

      var gemt = { id: næsteId(d.bestillinger), status: 'ny', intern_note: null,
        oprettet: new Date().toISOString() };
      for (var n in raekke) gemt[n] = raekke[n];
      // Som databasens trigger: nøglen står aldrig i rækken bagefter.
      gemt.bord_kode = null;
      /* Nummeret, som databasen giver det (bestillingsnummer.sql):
         ét pr. forretning, talt op af tælleren. Øvetilstanden
         skal ligne skyen — også her. */
      gemt.nummer = d.bestillinger.reduce(function (m, x) {
        return x.lokation_id === gemt.lokation_id && Number(x.nummer) > m
          ? Number(x.nummer) : m;
      }, 0) + 1;
      d.bestillinger.unshift(gemt);
      gemLokalt(d);
      return Promise.resolve(raekke);
    }

    /* ---- TRE FORSØG, SAMME KVITTERINGSNUMMER ----------------

       Lært af spiis' lærepenge (briefen 22/8): på havnens net med
       to streger dør et kald tit, uden at det er gæstens skyld,
       og gæsten skal ikke selv stå og trykke igen på det
       vigtigste tryk på hele siden.

       Reglerne:

       · Der prøves HØJST tre gange, med voksende pause (0,7 s og
         1,8 s) — kun ved netfejl og svar på 500 og derover. Et
         svar UNDER 500 er en rigtig afvisning (bremsen, dobbelt,
         valideringen), og en afvisning bliver ikke rigtigere af
         at blive gentaget.

       · Referencen genereres ÉN gang og sendes med i hvert
         forsøg. Det er dét, der gør gensendelse ufarlig: kolonnen
         er unik i databasen, så landede et forsøg, uden at svaret
         nåede frem, svarer databasen "duplicate key" på
         reference-indekset — og DET svar betyder "den ER inde",
         ikke "prøv igen". Før stod her 'Prøv at sende igen.' på
         netop det svar, og det var opskriften på en dublet.

       · Samme sammenstød i FØRSTE forsøg er noget andet: så har
         to bestillinger trukket samme tilfældige kode (én ud af
         ~24 mio. pr. dag). Ét nyt nummer, ét nyt forsøg.

       · Løber alle forsøg tørt, kastes fejlen med netfejl-mærket
         og hele rækken på — formularerne bygger sms-nødudgangen
         af den. Og der må ALDRIG stå "modtaget" om noget, der
         ikke er det. */
    var forsøg = 0;

    function oversætAfvisning(t, status) {
      /* Databasens svar oversat til noget en gæst kan bruge. Alt
         der ikke er genkendt, får en besked med telefonnummeret
         i: der er altid en vej videre, og det er den samme vej
         som før hjemmesiden fandtes. */
      if (/bestilling_ikke_dobbelt|duplicate key.*ikke_dobbelt/.test(t)) {
        return new Error('Du har allerede sendt en bestilling til det tidspunkt. '
          + 'Ring til os hvis du vil ændre den.');
      }
      /* Bremsen fra supabase/bremse.sql. Den er bygget mod
         scripts, ikke mod gæster, så beskederne peger begge på
         telefonen: rammer et rigtigt menneske en grænse, skal
         der stå hvad man gør, ikke at man er afvist. */
      if (/bestilling_bremse_nummer/.test(t)) {
        return new Error('Der er allerede sendt flere bestillinger fra det '
          + 'nummer i dag. Ring til os, så tager vi den over telefonen.');
      }
      if (/bestilling_bremse_travlt/.test(t)) {
        return new Error('Der er meget travlt lige nu. Prøv igen om et par '
          + 'minutter, eller ring til os.');
      }
      if (/bestilling_hvordan_ok/.test(t)) {
        return new Error('Vælg om maden skal spises her, tages med eller leveres.');
      }
      /* Databasens regel om adressen. Rammer man den fra siden,
         er formularen og databasen kommet ud af trit — men gæsten
         skal have en vej videre, ikke et kodenavn. */
      if (/bestilling_levering_adresse_ok/.test(t)) {
        return new Error('Skriv adressen, maden skal leveres til '
          + '— eller vælg, at I henter den selv.');
      }
      /* Lukkedags-værnet i databasen (supabase/lukkedag-vaern.sql).
         Rammer man det fra siden, er tidsvælgeren og databasen
         kommet ud af trit — men gæsten skal have en vej videre,
         ikke et kodenavn. */
      if (/bestilling_lukket_dag/.test(t)) {
        return new Error('Vi holder lukket den dag. Vælg en anden dag, eller ring til os.');
      }
      if (/bestilling_efter_lukketid/.test(t)) {
        return new Error('Vi lukker tidligere den dag, end tiden du har valgt. '
          + 'Vælg en tidligere tid, eller ring til os.');
      }
      if (/bestilling_saeson_lukket/.test(t)) {
        return new Error('Vi er lukket for sæsonen. Ring til os, hvis det ikke kan vente.');
      }
      /* DAGSREGLERNE (supabase/dagsregler.sql). Den halvt åbne
         dag: der ER åbent, men kun på den ene måde. Beskeden
         siger derfor, hvad man KAN — ikke bare hvad man ikke
         kan. En gæst, der får "det går ikke", går et andet sted
         hen; en, der får "du kan hente den", henter den. */
      if (/bestilling_spis_her_lukket/.test(t)) {
        return new Error('Vi har desværre ikke plads til at spise her den dag — '
          + 'men du kan bestille den med hjem.');
      }
      if (/bestilling_takeaway_lukket/.test(t)) {
        return new Error('Vi laver ikke mad ud af huset den dag — '
          + 'men du er velkommen til at spise her.');
      }
      if (/bestilling_for_tidligt/.test(t)) {
        return new Error('Vi åbner senere den dag, end tiden du har valgt. '
          + 'Vælg en senere tid, eller ring til os.');
      }
      /* QR-spærren (supabase/dagsbesked-og-qr.sql). Gæsten SIDDER
         ved bordet, så beskeden peger på lugen — den er tyve
         meter væk, og der er et menneske. */
      if (/bestilling_qr_lukket/.test(t)) {
        return new Error('Vi tager ikke imod bestillinger fra bordene lige nu. '
          + 'Kom op til lugen, så hjælper vi dig.');
      }
      /* Bordværnet (supabase/bordkort.sql): mærkatet peger på et
         bord, der er slettet eller slukket, mens skiltet blev
         stående. Gæsten skal have en vej videre, ikke et
         kodenavn — personalet er tyve meter væk. */
      if (/bestilling_ukendt_bord/.test(t)) {
        return new Error('Vi kan ikke finde det bord. Sig det til os ved lugen, '
          + 'så tager vi bestillingen dér.');
      }
      if (/bestilling_bord_hvordan_ok/.test(t)) {
        return new Error('En bestilling til et bord skal spises her. '
          + 'Sig det til os ved lugen, hvis den skal med.');
      }
      /* UDSOLGT-VÆRNET (supabase/bord-loft.sql).

         Gæsten, der åbnede kortet for fem minutter siden, har
         varen på skærmen endnu — browseren skjuler kun det, den
         VED er udsolgt, da siden blev hentet. Beskeden siger
         hvilken vare, for ellers skal hun gætte, hvad af otte
         ting hun skal tage af. */
      var udsolgt = /bestilling_udsolgt_vare:\s*(.*)$/m.exec(t);
      if (udsolgt) {
        var hvad = String(udsolgt[1] || '').trim().replace(/["'\\]/g, '');
        return new Error(hvad
          ? '"' + hvad + '" er lige blevet udsolgt. Tag den af, så sender vi resten.'
          : 'En af varerne er lige blevet udsolgt. Se listen igennem igen.');
      }
      /* PRIS-VÆRNET (supabase/pris-vaern.sql). En gammel fane kan
         have varen liggende i kurven fra før — beskeden siger
         hvilken, så gæsten ikke skal gætte. */
      var udenPris = /bestilling_vare_uden_pris:\s*(.*)$/m.exec(t);
      if (udenPris) {
        var hvem = String(udenPris[1] || '').trim().replace(/["'\\]/g, '');
        return new Error((hvem ? '"' + hvem + '"' : 'En af varerne')
          + ' har ikke fået en pris endnu og kan ikke bestilles her. '
          + 'Ring til os, så tager vi den over telefonen.');
      }
      /* LOFTET PR. KVARTER (supabase/bord-loft.sql). Køkkenet kan
         ikke nå mere lige nu — og det er noget ANDET end lukket.
         Derfor står der en grund og en vej videre: lugen er tyve
         meter væk. */
      if (/bestilling_bord_loft/.test(t)) {
        return new Error('Der er run på lige nu, og køkkenet kan ikke tage '
          + 'flere bestillinger fra bordene i øjeblikket. Prøv igen om lidt '
          + '— eller kom op til lugen, hvis det haster.');
      }
      /* LOFTET PR. TIDSRUM (supabase/luge-loft.sql).

         ⚠️ BESKEDEN SIGER KLOKKESLÆTTET. Uden det ved gæsten
         ikke, om hun skal lave DAGEN eller TIDEN om — og hun har
         valgt begge dele. Vælgeren burde have fanget det, men en
         fane, der har stået åben siden i formiddag, kender ikke
         de tider, der er blevet fyldt imens; derfor henter
         formularen listen igen, når den her fejl kommer. */
      var fuldt = /bestilling_luge_fuldt(?::\s*(.*))?$/m.exec(t);
      if (fuldt) {
        var kl = String(fuldt[1] || '').trim().replace(':', '.');
        var e = new Error((kl ? 'Kl. ' + kl + ' er' : 'Det tidspunkt er')
          + ' lige blevet fyldt op. Vælg et andet tidspunkt — listen er '
          + 'opdateret nu.');
        e.tidFuld = true;
        return e;
      }
      /* NØGLEN (supabase/bord-noegle.sql). Beskeden skal sige, hvad
         man GØR: scan koden på bordet igen. Den må ikke lyde som en
         fejl i systemet — så går gæsten op til lugen og brokker sig
         over en side, der virker fint. */
      if (/bord_kode_mangler/.test(t)) return new Error(FEJL_KODE_MANGLER);
      if (/bord_kode_forkert/.test(t)) return new Error(FEJL_KODE_FORKERT);
      if (/bestilling_dato_ok/.test(t)) return new Error('Vælg en dag der ikke er gået endnu.');
      if (/bestilling_telefon_ok/.test(t)) return new Error('Telefonnummeret blev afvist. Otte cifre.');
      if (/bestilling_navn_ok/.test(t)) return new Error('Skriv dit navn.');
      if (/bestilling_email_ok/.test(t)) return new Error('E-mailen ser ikke rigtig ud.');
      if (/bestilling_linjer_ok/.test(t)) return new Error('Vælg mindst ét stykke smørrebrød.');
      if (/bestilling_antal_ok/.test(t)) return new Error('Antallet ser forkert ud. Ring til os for meget store ordrer.');
      if (status === 401 || status === 403) {
        return new Error('Bestillingen kunne ikke sendes. Ring til os i stedet.');
      }
      return new Error('Bestillingen kunne ikke sendes (' + status + '). Ring til os i stedet.');
    }

    function netfejl() {
      var e = new Error('Der er ingen forbindelse lige nu, og bestillingen '
        + 'er IKKE sendt endnu.');
      e.netfejl = true;
      e.raekke = raekke;
      return e;
    }

    function ventOgIgen() {
      return new Promise(function (løs) {
        setTimeout(løs, forsøg === 1 ? 700 : 1800);
      }).then(sendes);
    }

    function sendes() {
      forsøg += 1;
      return fetch(cfg.url + '/rest/v1/bestillinger', {
        method: 'POST',
        headers: hoveder({ Prefer: 'return=minimal' }),
        body: JSON.stringify(raekke),
      }).then(function (r) {
        if (r.ok) return raekke;
        return r.text().then(function (t) {
          if (/bestillinger_reference_key/.test(t)) {
            // Efter et gensendt forsøg: den ER landet første gang.
            if (forsøg > 1) return raekke;
            // I første forsøg: ægte kode-sammenstød. Nyt nummer, én gang.
            raekke.reference = lavReference('SM');
            return sendes();
          }
          if (r.status >= 500) {
            if (forsøg < 3) return ventOgIgen();
            throw netfejl();
          }
          throw oversætAfvisning(t, r.status);
        });
      }, function () {
        // Ingen forbindelse. Ikke en fejl gæsten har lavet.
        if (forsøg < 3) return ventOgIgen();
        throw netfejl();
      });
    }

    return sendes();
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
     type til, er det de to steder — og prøven i
     supabase/proev-forespoergsler.sql fanger, hvis kun det ene
     bliver rettet.

     Den fjerde KOM til 24/8: frokostordningen. Den er tegnet som
     et B2B-tilbud — firma, CVR, faste ugedage, fakturamail og
     knappen "Få et tilbud" — og dét er et spørgsmål, ikke en
     bestilling. Der bygges ingen abonnementsmotor.

     ⚠️ Kræver supabase/frokost.sql kørt. Uden den tager
     øvetilstanden imod, hvad den rigtige database afviser — og
     så er det ikke en øvelse. */
  /* ⚠️ LISTEN STÅR TO STEDER: her og i forespoergsel_type_ok i
     databasen. Rettes kun det ene, tager øvetilstanden imod,
     hvad den rigtige database afviser — og fejlen opdages først
     hos en gæst. 'smoerrebroed' kom til 31/8; kør
     supabase/smoerrebroed-forespoergsel.sql. */
  var FORESPOERGSEL_TYPER = ['catering', 'baglokale', 'selskab', 'frokost',
    'smoerrebroed'];

  /* ---- HVORNÅR ER HAVNEN OPTAGET? ----

     Havnen er ÉT sted. Er baglokalet lejet ud den 12., kan der
     ikke også holdes selskab hos jer den 12. — det er de samme
     lokaler, det samme køkken og de samme hænder.

     Et selskab UD AF HUSET optager derimod ingenting: så laver
     køkkenet mad, der kører ud. Catering er slet ikke med, den
     er pr. definition ud af huset.

     KUN AFTALTE DAGE ER OPTAGET. En forespørgsel, der er kommet
     ind, er et spørgsmål — ikke en booking. Spærrede en ny
     forespørgsel dagen, kunne én person med et telefonnummer
     lukke hele efteråret på ti minutter.

     Reglen står også i databasen som public.mosede_optager_dagen,
     og de to SKAL sige det samme. Rettes den ene, skal den anden
     med — proev-forespoergsel-kalender.sql måler databasens
     halvdel, og tests/skal-forespoergsel.spec.js måler denne. */
  function optagerDagen(f) {
    if (!f || !f.dato || f.slettet || f.status !== 'aftalt') return false;
    if (f.type === 'baglokale') return true;
    if (f.type !== 'selskab') return false;
    var hvor = (f.detaljer && f.detaljer.hvor) || 'hos-jer';
    return hvor !== 'ud-af-huset';
  }

  var DAGEN_ER_TAGET = 'Den dato er desværre optaget. Vælg en anden — '
    + 'eller ring til os, så finder vi ud af det.';

  function optagneDageLokalt(d) {
    var ud = [];
    (d.udlejninger || []).forEach(function (u) {
      if (u.status === 'bekraeftet' && !u.slettet && u.dato) {
        ud.push({ lokation_id: u.lokation_id || LOKATION, dato: u.dato, slags: 'udlejning' });
      }
    });
    (d.forespoergsler || []).forEach(function (f) {
      if (optagerDagen(f)) {
        ud.push({ lokation_id: f.lokation_id || LOKATION, dato: f.dato, slags: f.type });
      }
    });
    return ud;
  }

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
      /* Formularens egne valg — anledning, tidsrum, kuverter, hvad
         der skal serveres. Ét objekt, aldrig en liste: databasen
         håndhæver det samme (forespoergsel_detaljer_ok), og uden
         det ville de valg ende som fri tekst i beskeden, hvor
         personalet hverken kan sortere eller søge på dem. */
      detaljer: (f.detaljer && typeof f.detaljer === 'object'
        && !Array.isArray(f.detaljer)
        && JSON.stringify(f.detaljer).length <= 4000) ? f.detaljer : null,
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

      /* Samme regel som forespoergsel_kontakt_ok (29/8): mindst
         ÉN vej tilbage. En øvetilstand, der er mildere end
         databasen, tager imod det, produktionen afviser — og så
         opdages fejlen først hos en rigtig gæst. */
      var cifre = String(raekke.telefon || '').replace(/[^0-9]/g, '').length;
      var mailOk = raekke.email
        && /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(raekke.email);
      if (!(cifre >= 8 && cifre <= 15) && !mailOk) {
        return Promise.reject(new Error('Skriv et telefonnummer eller en e-mail, '
          + 'så vi kan vende tilbage til jer.'));
      }
      if (cifre && (cifre < 8 || cifre > 15)) {
        return Promise.reject(new Error('Telefonnummeret blev afvist. Otte cifre.'));
      }

      /* Samme regel som forespoergsel_antal_ok (1-500). Uden den
         her tog øvetilstanden imod et antal, den rigtige database
         afviser — og så er øvelsen mildere end skyen, præcis dét
         den ikke må være. Formularen siger det pænt i forvejen;
         det her er værnet under den. */
      if (raekke.antal_personer !== null
        && (raekke.antal_personer < 1 || raekke.antal_personer > 500)) {
        return Promise.reject(new Error(
          'Antallet blev afvist. Skriv et tal mellem 1 og 500.'));
      }

      var titiSiden = Date.now() - 10 * 60 * 1000;
      var dobbelt = d.forespoergsler.some(function (x) {
        return !x.slettet
            && x.telefon === raekke.telefon
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
        return !x.slettet
          && x.telefon === raekke.telefon
          && Date.parse(x.oprettet || 0) > etDoegnSiden;
      }).length;
      if (fraNummeret >= 3) {
        return Promise.reject(new Error(
          'Der er allerede sendt flere forespørgsler fra det nummer i dag. '
          + 'Ring til os, så tager vi den over telefonen.'));
      }

      /* Samme værn som databasens mosede_dagen_er_optaget. Uden
         det ville øvetilstanden sige ja til en dag, den rigtige
         database afviser — og så er øvelsen det modsatte af en
         øvelse. */
      if (optagerDagen({ type: raekke.type, status: 'aftalt', dato: raekke.dato,
        detaljer: raekke.detaljer, slettet: null })
        && optagneDageLokalt(d).some(function (o) { return o.dato === raekke.dato; })) {
        return Promise.reject(new Error(DAGEN_ER_TAGET));
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
        if (/mosede_dagen_er_optaget/.test(t)) throw new Error(DAGEN_ER_TAGET);
        if (/forespoergsel_detaljer_ok/.test(t)) {
          throw new Error('Der er for meget med i forespørgslen. Skriv det korte af det i beskeden.');
        }
        if (/forespoergsel_type_ok/.test(t)) throw new Error('Vælg hvad det handler om.');
        if (/forespoergsel_dato_ok/.test(t)) throw new Error('Vælg en dato der ikke er gået endnu.');
        /* ⚠️ TO NAVNE, TO BETYDNINGER (29/8).

           forespoergsel_telefon_ok er det GAMLE krav: telefonen
           SKAL være der. Rammer vi det, er supabase/
           foresp-kontakt.sql ikke kørt endnu, og gæsten, der kun
           skrev sin mail, skal have at vide, hvad hun gør NU —
           ikke en besked om en fil, hun ikke kan køre.

           forespoergsel_kontakt_ok er det nye: mindst én vej
           tilbage. Rammer vi DET, har hun hverken skrevet nummer
           eller mail, og beskeden er en anden. */
        if (/forespoergsel_telefon_ok/.test(t)) {
          throw new Error('Vi mangler et telefonnummer — skriv det, '
            + 'så vender vi tilbage til jer.');
        }
        if (/forespoergsel_telefon_form_ok/.test(t)) {
          throw new Error('Telefonnummeret blev afvist. Otte cifre.');
        }
        if (/forespoergsel_kontakt_ok/.test(t)) {
          throw new Error('Skriv et telefonnummer eller en e-mail, '
            + 'så vi kan vende tilbage til jer.');
        }
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

  /* ==========================================================
     BORDBESTILLING (fase 4)
     ----------------------------------------------------------
     Et ØNSKE om et bord, ikke et bord. Ja'et gives kun i admin,
     hvor personalet ser hele dagens billede. Derfor samme form
     som bestil() og forespoerg(): gæsten skriver, må ikke læse,
     og databasen er den, der siger nej — se supabase/borde.sql.

     Dato, tid og antal er PÅKRÆVEDE, hvor forespørgslerne har dem
     frivillige: et bord ER en dato, et klokkeslæt og et antal
     stole. Formularen i js/bord.js afviser før vi når hertil, men
     rækken bygges defensivt alligevel. */
  /* Øvetilstandens udgave af bord_fyldte_dage. ⚠️ Den skal
     efterligne databasen, ikke være mildere: en efterligning, der
     tager imod mere end produktionen, beviser ingenting. Derfor
     tælles afviste IKKE med, og loftet slås op i samme
     rækkefølge — dagens eget, ejerens almindelige, bordene. */
  function bordLoftLokalt(d, iso) {
    var regel = (d.dags_regler || []).filter(function (r) {
      return r.dato === iso;
    })[0];
    if (regel && regel.bord_loft !== null && regel.bord_loft !== undefined
        && String(regel.bord_loft) !== '') {
      var n1 = Number(regel.bord_loft);
      if (isFinite(n1)) return n1;
    }
    var sat = (d.indstillinger || {}).bord_loft_pr_dag;
    if (sat !== null && sat !== undefined && String(sat).trim() !== '') {
      var n2 = Number(sat);
      /* En tastefejl ("otte borde") må ikke lukke bookingsiden —
         samme gren som i mosede_bord_loft. */
      if (isFinite(n2)) return n2;
    }
    /* ⚠️ INGEN BORDE OPRETTET = INTET LOFT, IKKE NUL. bord/ har
       taget imod bookinger, længe før tabellen `borde` fandtes,
       og en forretning, der ikke har tastet sine borde ind, har
       ikke sagt, at der er lukket. Nul her ville lukke hele
       bookingsiden. Ejerens EGNE nul lukker stadig — det er en
       beslutning, han har truffet. Samme gren som nullif(...,0)
       i mosede_bord_loft. */
    var antal = (d.borde || []).filter(function (x) {
      return x.aktiv !== false;
    }).length;
    return antal || null;
  }

  /* Øvetilstandens udgave af luge_fyldte_tider.

     ⚠️ SAMME BETINGELSER SOM VISNINGEN — bordene ude (de vælger
     ingen hentetid), de afviste ude (et afslag frigiver tiden
     igen) og de slettede ude. En efterligning, der er mildere end
     databasen, lader fejlen bestå lokalt og fælde i produktionen;
     det er sket fire gange i det her projekt. */
  function fyldteTiderLokalt(d) {
    var pr = {};
    var iDag = nu().dato;
    (d.bestillinger || []).forEach(function (b) {
      if (b.slettet || b.bord_nummer || b.status === 'afvist') return;
      if (!b.hent_dato || b.hent_dato < iDag) return;
      var t = String(b.hent_tid || '').slice(0, 5);
      if (!t) return;
      var n = b.hent_dato + ' ' + t;
      pr[n] = (pr[n] || 0) + 1;
    });
    return Object.keys(pr).map(function (n) {
      return { dato: n.slice(0, 10), tid: n.slice(11), taget: pr[n] };
    });
  }

  function fyldteDageLokalt(d) {
    var pr = {};
    (d.bordbestillinger || []).forEach(function (b) {
      if (b.slettet || b.status === 'afvist') return;
      pr[b.dato] = (pr[b.dato] || 0) + 1;
    });
    /* ⚠️ EN RÆKKE PR. DAG, OGSÅ DE TOMME. Første udgave lavede
       kun rækker for de dage, der HAVDE en booking — og så kunne
       et loft på nul aldrig ses: dagen manglede i listen, siden
       tilbød den, og gæsten fik først nej ved afsendelsen. Det er
       netop den lukkede lørdag, ejeren bad om. Visningen
       bord_fyldte_dage gør det samme (generate_series). */
    var ud = [];
    var start = new Date(nu().dato + 'T12:00:00Z');
    start.setUTCDate(start.getUTCDate() - 1);
    for (var i = 0; i <= 61; i++) {
      var iso = start.toISOString().slice(0, 10);
      ud.push({ dato: iso, taget: pr[iso] || 0, loft: bordLoftLokalt(d, iso) });
      start.setUTCDate(start.getUTCDate() + 1);
    }
    return ud;
  }

  function bookBord(b) {
    var raekke = {
      reference: lavReference('BO'),
      lokation_id: b.lokation_id || LOKATION,
      navn: String(b.navn || '').trim().slice(0, 80),
      telefon: String(b.telefon || '').trim().slice(0, 30),
      email: String(b.email || '').trim() ? String(b.email).trim().slice(0, 160) : null,
      dato: String(b.dato || '').slice(0, 10),
      tid: String(b.tid || '').slice(0, 5),
      antal_personer: Math.round(Number(b.antal_personer)),
      besked: String(b.besked || '').trim() ? String(b.besked).trim().slice(0, 500) : null,
      // status og intern_note sættes IKKE her – se noten i bestil().
    };

    // Øvetilstand: samme regler efterlignet, ellers er det ikke
    // en øvelse. Se den samme blok i bestil().
    if (!SKY) {
      var d = læsLokalt();
      d.bordbestillinger = d.bordbestillinger || [];

      /* Samme regel som bord_ikke_dobbelt i databasen: samme
         telefon, samme dag, samme tid er ét ønske — ikke to. */
      var dobbelt = d.bordbestillinger.some(function (x) {
        return !x.slettet
            && x.telefon === raekke.telefon
            && x.dato === raekke.dato
            && x.tid === raekke.tid;
      });
      if (dobbelt) {
        return Promise.reject(new Error(
          'Du har allerede spurgt om et bord på det tidspunkt. '
          + 'Ring til os hvis du vil ændre det.'));
      }

      // Samme grænse som bord_bremse i supabase/borde.sql.
      var etDoegnSiden = Date.now() - 24 * 60 * 60 * 1000;
      var fraNummeret = d.bordbestillinger.filter(function (x) {
        return !x.slettet
          && x.telefon === raekke.telefon
          && Date.parse(x.oprettet || 0) > etDoegnSiden;
      }).length;
      if (fraNummeret >= 3) {
        return Promise.reject(new Error(
          'Der er allerede spurgt om flere borde fra det nummer i dag. '
          + 'Ring til os, så tager vi den over telefonen.'));
      }

      /* Samme værn som bord_loft_vaern i
         supabase/bord-loft-pr-dag.sql. ⚠️ Ordene er de SAMME som
         databasens: mødte gæsten to forskellige sætninger for det
         samme nej, ville hun tro, det var to forskellige fejl. */
      var loft = bordLoftLokalt(d, raekke.dato);
      var taget = d.bordbestillinger.filter(function (x) {
        return !x.slettet && x.status !== 'afvist' && x.dato === raekke.dato;
      }).length;
      /* ⚠️ isFinite(null) ER SANDT — Number(null) er 0. Uden det
         første led ville "intet loft" blive læst som "nul borde",
         og hver eneste booking blive afvist. */
      if (loft !== null && loft !== undefined && isFinite(loft) && taget >= loft) {
        return Promise.reject(new Error(
          'Der er ikke flere borde den dag. Prøv en anden dag, '
          + 'eller ring til os — vi kan nogle gange finde plads alligevel.'));
      }

      var gemt = { id: næsteId(d.bordbestillinger), status: 'ny', intern_note: null,
        oprettet: new Date().toISOString() };
      for (var n in raekke) gemt[n] = raekke[n];
      /* Nummeret, som databasen giver det (bordnummer.sql): ét pr.
         forretning, talt op af tælleren. ⚠️ Øvetilstanden skal
         ligne skyen — også her; en efterligning, der er mildere
         end databasen, lader fejlen bestå lokalt og fælde i
         produktionen. */
      gemt.nummer = d.bordbestillinger.reduce(function (m, x) {
        return x.lokation_id === gemt.lokation_id && Number(x.nummer) > m
          ? Number(x.nummer) : m;
      }, 0) + 1;
      d.bordbestillinger.unshift(gemt);
      gemLokalt(d);
      return Promise.resolve(raekke);
    }

    return fetch(cfg.url + '/rest/v1/bordbestillinger', {
      method: 'POST',
      headers: hoveder({ Prefer: 'return=minimal' }),
      body: JSON.stringify(raekke),
    }).then(function (r) {
      if (r.ok) return raekke;
      return r.text().then(function (t) {
        /* Som ved bestillingen: alt der ikke er genkendt, ender med
           telefonnummeret. Der er altid en vej videre, og det er
           den samme vej som før hjemmesiden fandtes. */
        if (/bord_ikke_dobbelt|duplicate key.*ikke_dobbelt/.test(t)) {
          throw new Error('Du har allerede spurgt om et bord på det tidspunkt. '
            + 'Ring til os hvis du vil ændre det.');
        }
        if (/bord_bremse_nummer/.test(t)) {
          throw new Error('Der er allerede spurgt om flere borde fra det '
            + 'nummer i dag. Ring til os, så tager vi den over telefonen.');
        }
        if (/bord_bremse_travlt/.test(t)) {
          throw new Error('Der er meget travlt lige nu. Prøv igen om et par '
            + 'minutter, eller ring til os.');
        }
        /* Lukkedags-værnet gælder også bordene — se noten ved
           bestillingens oversættelser. */
        if (/bestilling_lukket_dag/.test(t)) {
          throw new Error('Vi holder lukket den dag. Vælg en anden dag, eller ring til os.');
        }
        if (/bestilling_efter_lukketid/.test(t)) {
          throw new Error('Vi lukker tidligere den dag. Vælg en tidligere tid, eller ring til os.');
        }
        if (/bestilling_saeson_lukket/.test(t)) {
          throw new Error('Vi er lukket for sæsonen. Ring til os, hvis det ikke kan vente.');
        }
        /* Dagsreglerne rammer også bordbookingen: et bord ER spis
           her. Er dagen lukket for spis her — fx fordi der er
           selskab — kan der ikke bookes bord, og gæsten skal have
           at vide, at maden stadig kan hentes. */
        if (/bestilling_spis_her_lukket/.test(t)) {
          throw new Error('Vi har desværre ikke plads til gæster den dag. '
            + 'Maden kan stadig bestilles med hjem.');
        }
        if (/bestilling_for_tidligt/.test(t)) {
          throw new Error('Vi åbner senere den dag. Vælg en senere tid, eller ring til os.');
        }
        if (/bord_dato_ok/.test(t)) throw new Error('Vælg en dag der ikke er gået endnu.');
        if (/bord_telefon_ok/.test(t)) throw new Error('Telefonnummeret blev afvist. Otte cifre.');
        if (/bord_navn_ok/.test(t)) throw new Error('Skriv dit navn.');
        if (/bord_email_ok/.test(t)) throw new Error('E-mailen ser ikke rigtig ud.');
        if (/bord_antal_ok/.test(t)) throw new Error('Antallet ser forkert ud. Er I over 100, er det et selskab — skriv til os om det i stedet.');
        if (/duplicate key/.test(t)) throw new Error('Prøv at sende igen.');
        if (r.status === 401 || r.status === 403) {
          throw new Error('Ønsket kunne ikke sendes. Ring til os i stedet.');
        }
        throw new Error('Ønsket kunne ikke sendes (' + r.status + '). Ring til os i stedet.');
      });
    }, function () {
      // Ingen forbindelse. Ikke en fejl gæsten har lavet.
      throw new Error('Der er ingen forbindelse lige nu. Ring til os, '
        + 'eller prøv igen om et øjeblik.');
    });
  }

  /* ==========================================================
     UDLEJNING AF BAGLOKALET (fase 5)
     ----------------------------------------------------------
     Som bordene — men lokalet er ET lokale. Ønsket her er frit;
     ja'et i admin er det eksklusive, og DET håndhæves af
     databasen selv (udlejning_dagen_er_taget i udlejning.sql).
     Datoen er påkrævet: lokalet lejes pr. dag, og "engang" er en
     forespørgsel — den indgang findes på selskabssiden. */
  function lejLokale(u) {
    var raekke = {
      reference: lavReference('BL'),
      lokation_id: u.lokation_id || LOKATION,
      navn: String(u.navn || '').trim().slice(0, 80),
      telefon: String(u.telefon || '').trim().slice(0, 30),
      email: String(u.email || '').trim() ? String(u.email).trim().slice(0, 160) : null,
      dato: String(u.dato || '').slice(0, 10),
      antal_personer: (u.antal_personer === '' || u.antal_personer === null
        || u.antal_personer === undefined) ? null : Math.round(Number(u.antal_personer)),
      besked: String(u.besked || '').trim() ? String(u.besked).trim().slice(0, 1000) : null,
      // status og intern_note sættes IKKE her – se noten i bestil().
    };

    if (raekke.antal_personer !== null && !isFinite(raekke.antal_personer)) {
      raekke.antal_personer = null;
    }

    // Øvetilstand: samme regler efterlignet, ellers er det ikke
    // en øvelse. Se den samme blok i bestil().
    if (!SKY) {
      var d = læsLokalt();
      d.udlejninger = d.udlejninger || [];

      // Samme regel som udlejning_ikke_dobbelt i databasen.
      var dobbelt = d.udlejninger.some(function (x) {
        return !x.slettet && x.telefon === raekke.telefon && x.dato === raekke.dato;
      });
      if (dobbelt) {
        return Promise.reject(new Error(
          'Du har allerede spurgt om lokalet den dag. '
          + 'Ring til os hvis du vil ændre noget.'));
      }

      // Samme grænse som udlejning_bremse: 2 pr. nummer i døgnet.
      var etDoegnSiden = Date.now() - 24 * 60 * 60 * 1000;
      var fraNummeret = d.udlejninger.filter(function (x) {
        return !x.slettet
          && x.telefon === raekke.telefon
          && Date.parse(x.oprettet || 0) > etDoegnSiden;
      }).length;
      if (fraNummeret >= 2) {
        return Promise.reject(new Error(
          'Der er allerede spurgt om lokalet fra det nummer i dag. '
          + 'Ring til os, så tager vi den over telefonen.'));
      }

      var gemt = { id: næsteId(d.udlejninger), status: 'ny', intern_note: null,
        oprettet: new Date().toISOString() };
      for (var n in raekke) gemt[n] = raekke[n];
      d.udlejninger.unshift(gemt);
      gemLokalt(d);
      return Promise.resolve(raekke);
    }

    return fetch(cfg.url + '/rest/v1/udlejninger', {
      method: 'POST',
      headers: hoveder({ Prefer: 'return=minimal' }),
      body: JSON.stringify(raekke),
    }).then(function (r) {
      if (r.ok) return raekke;
      return r.text().then(function (t) {
        if (/udlejning_ikke_dobbelt|duplicate key.*ikke_dobbelt/.test(t)) {
          throw new Error('Du har allerede spurgt om lokalet den dag. '
            + 'Ring til os hvis du vil ændre noget.');
        }
        if (/udlejning_bremse_nummer/.test(t)) {
          throw new Error('Der er allerede spurgt om lokalet fra det '
            + 'nummer i dag. Ring til os, så tager vi den over telefonen.');
        }
        if (/udlejning_bremse_travlt/.test(t)) {
          throw new Error('Der er meget travlt lige nu. Prøv igen om et par '
            + 'minutter, eller ring til os.');
        }
        if (/udlejning_dato_ok/.test(t)) throw new Error('Vælg en dag der ikke er gået endnu.');
        if (/udlejning_telefon_ok/.test(t)) throw new Error('Telefonnummeret blev afvist. Otte cifre.');
        if (/udlejning_navn_ok/.test(t)) throw new Error('Skriv dit navn.');
        if (/udlejning_email_ok/.test(t)) throw new Error('E-mailen ser ikke rigtig ud.');
        if (/udlejning_antal_ok/.test(t)) throw new Error('Antallet ser forkert ud – eller lad feltet stå tomt.');
        if (/duplicate key/.test(t)) throw new Error('Prøv at sende igen.');
        if (r.status === 401 || r.status === 403) {
          throw new Error('Ønsket kunne ikke sendes. Ring til os i stedet.');
        }
        throw new Error('Ønsket kunne ikke sendes (' + r.status + '). Ring til os i stedet.');
      });
    }, function () {
      throw new Error('Der er ingen forbindelse lige nu. Ring til os, '
        + 'eller prøv igen om et øjeblik.');
    });
  }

  /* ============================================================
     RESERVATION TIL ET ARRANGEMENT  (30/8)
     ------------------------------------------------------------
     Kundens spørgsmål: "hvor kommer reservationerne hen?" De kom
     ingen steder — knappen på h-kalender.html har siddet der
     siden 23/8 uden en tabel bag sig.

     ⚠️ DEN LIGGER I store.js OG IKKE I store-skriv.js. Skrivelaget
     er admins og indlæses kun af admin.html; en gæsteside, der
     kaldte Butik.skrive her, ville ramme undefined. Samme sted som
     bookBord og lejLokale, af samme grund.

     ⚠️ OG PLADSERNE TÆLLES I DATABASEN. Øvetilstanden herunder
     efterligner det, men den er en ØVELSE: to gæster på den
     sidste plads samtidig findes ikke i én browser. Det rigtige
     værn er reservation_bremse i supabase/arrangementer.sql.
     ============================================================ */
  function reserverPlads(r) {
    var raekke = {
      reference: lavReference('RE'),
      lokation_id: r.lokation_id || LOKATION,
      kalender_id: Number(r.kalender_id),
      navn: String(r.navn || '').trim().slice(0, 80),
      telefon: String(r.telefon || '').trim().slice(0, 30),
      email: String(r.email || '').trim() ? String(r.email).trim().slice(0, 160) : null,
      antal_personer: Math.max(1, Math.round(Number(r.antal_personer) || 1)),
      besked: String(r.besked || '').trim() ? String(r.besked).trim().slice(0, 1000) : null,
      // status og intern_note sættes IKKE her – se noten i bestil().
    };

    if (!isFinite(raekke.kalender_id) || raekke.kalender_id <= 0) {
      return Promise.reject(new Error('Vælg hvilket arrangement du vil med til.'));
    }

    if (!SKY) {
      var d = læsLokalt();
      d.reservationer = d.reservationer || [];
      var arr = (d.kalender || []).filter(function (k) {
        return String(k.id) === String(raekke.kalender_id);
      })[0];

      /* Samme fire nej som reservation_bremse, i samme rækkefølge.
         En øvetilstand, der er mildere end databasen, tager imod
         det, produktionen afviser — og så opdages fejlen først
         hos en rigtig gæst. */
      if (!arr || !arr.offentlig) {
        return Promise.reject(new Error('Arrangementet findes ikke længere.'));
      }
      if (!arr.tilmelding) {
        return Promise.reject(new Error('Der er ikke tilmelding til det arrangement — kig bare forbi.'));
      }
      if ((arr.slut_dato || arr.dato) < nu().dato) {
        return Promise.reject(new Error('Det arrangement er overstået.'));
      }

      var dobbelt = d.reservationer.some(function (x) {
        return !x.slettet && x.status !== 'afvist'
          && String(x.kalender_id) === String(raekke.kalender_id)
          && x.telefon === raekke.telefon;
      });
      if (dobbelt) {
        return Promise.reject(new Error(
          'Du er allerede tilmeldt det arrangement. Ring til os, hvis du vil ændre antallet.'));
      }

      if (arr.pladser) {
        var optaget = d.reservationer.reduce(function (sum, x) {
          if (x.slettet || x.status === 'afvist') return sum;
          if (String(x.kalender_id) !== String(raekke.kalender_id)) return sum;
          return sum + (Number(x.antal_personer) || 0);
        }, 0);
        if (optaget + raekke.antal_personer > arr.pladser) {
          return Promise.reject(new Error(
            'Der er ikke flere pladser. Ring til os — nogle gange kan vi finde en stol.'));
        }
      }

      var gemt = { id: næsteId(d.reservationer), status: 'ny', intern_note: null,
        slettet: null, oprettet: new Date().toISOString() };
      for (var n in raekke) gemt[n] = raekke[n];
      d.reservationer.unshift(gemt);
      gemLokalt(d);
      return Promise.resolve(raekke);
    }

    return fetch(cfg.url + '/rest/v1/reservationer', {
      method: 'POST',
      headers: hoveder({ Prefer: 'return=minimal' }),
      body: JSON.stringify(raekke),
    }).then(function (r2) {
      if (r2.ok) return raekke;
      return r2.text().then(function (t) {
        if (/reservation_udsolgt/.test(t)) {
          throw new Error('Der er ikke flere pladser. Ring til os — nogle '
            + 'gange kan vi finde en stol.');
        }
        if (/reservation_lukket/.test(t)) {
          throw new Error('Der er ikke tilmelding til det arrangement — kig bare forbi.');
        }
        if (/reservation_overstaaet/.test(t)) throw new Error('Det arrangement er overstået.');
        if (/reservation_findes_ikke/.test(t)) throw new Error('Arrangementet findes ikke længere.');
        if (/reservation_dublet|duplicate key.*reservation_dublet/.test(t)) {
          throw new Error('Du er allerede tilmeldt det arrangement. Ring til '
            + 'os, hvis du vil ændre antallet.');
        }
        if (/reservation_bremse_nummer/.test(t)) {
          throw new Error('Der er allerede tilmeldt flere fra det nummer i dag. '
            + 'Ring til os, så tager vi den over telefonen.');
        }
        if (/reservation_bremse_travlt/.test(t)) {
          throw new Error('Der er meget travlt lige nu. Prøv igen om et par '
            + 'minutter, eller ring til os.');
        }
        if (/reservation_antal_ok/.test(t)) {
          throw new Error('Er I flere end tyve, så ring — så finder vi ud af det sammen.');
        }
        if (/reservation_navn_ok/.test(t)) throw new Error('Skriv dit navn.');
        if (/reservation_telefon_ok/.test(t)) throw new Error('Telefonnummeret blev afvist. Otte cifre.');
        if (/reservation_email_ok/.test(t)) throw new Error('E-mailen ser ikke rigtig ud.');
        if (/duplicate key/.test(t)) throw new Error('Prøv at sende igen.');
        if (r2.status === 401 || r2.status === 403) {
          throw new Error('Reservationen kunne ikke sendes. Ring til os i stedet.');
        }
        throw new Error('Reservationen kunne ikke sendes (' + r2.status + '). Ring til os i stedet.');
      });
    }, function () {
      throw new Error('Der er ingen forbindelse lige nu. Ring til os, '
        + 'eller prøv igen om et øjeblik.');
    });
  }

  // I lokal tilstand ændres localStorage direkte. Samme
  // funktionsnavne som mod skyen, så admin-siden ikke skal vide
  // hvilken tilstand den kører i.
  function lokalt(ændre) {
    var d = læsLokalt();
    /* ⚠️ EN FEJL FRA ÆNDRE() SKAL BLIVE ET AFVIST LØFTE.

       Skrivelaget efterligner databasens regler i øvetilstand ved
       at KASTE — "Der er allerede et bord, der hedder 7", "Stegt
       flæsk står allerede på den dag". Uden det her fangst kom
       fejlen aldrig frem: den røg synkront ud af
       Butik.skrive.…() FØR Admin.gem nåede at få et løfte at
       hænge sin catch på, og skærmen stod uændret uden en linje
       om hvorfor.

       Og gemLokalt må IKKE køre bagefter: så ville den halve
       ændring, der nåede at ske før kastet, blive gemt. */
    try { ændre(d); } catch (e) { return Promise.reject(e); }
    gemLokalt(d);
    return Promise.resolve(true);
  }

  /* ---- SKRIVELAGET LIGGER I js/store-skriv.js ----

     22 kB, som KUN personalesiden bruger: ingen gæsteside rører
     Butik.skrive. De blev hentet på hver eneste sidevisning
     alligevel, og vægtprøven i tests/vaegt.spec.js fældede
     forsiden på syv kilobyte. Testens egen note sagde, hvad
     svaret skulle være: "se på, om hele store.js hører til på
     forsiden, eller om den kan deles, så gæstens halvdel kommer
     alene."

     Gæsten skriver stadig sin egen bestilling herfra —
     Butik.bestil(), forespoergsel(), bordbestilling() og
     udlejning() ligger i den her fil. Det er RETTELSERNE i
     admin, der er flyttet ud.

     admin.html indlæser js/store-skriv.js lige efter store.js.
     Glemmes den, findes Butik.skrive ikke, og første gem giver
     en tydelig fejl i stedet for et stille no-op. */

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
    /* Til den direkte forbindelse (js/admin/live.js): realtime
       skal bruge selve nøglen for at få lov at lytte med — samme
       nøgle, som hoveder() sender på hvert kald. */
    token: gemtToken,

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
  /* ==========================================================
     SMS-NØDUDGANGEN
     ----------------------------------------------------------
     Når alle tre forsøg er løbet tørt, skal gæsten ikke stå med
     en fejlbesked og en kold grill. Hele bestillingen pakkes som
     en færdig sms til forretningens nummer, så ét tryk sender
     den ad den vej, der virkede før hjemmesiden fandtes.

     To ting er ikke til forhandling (spiis' lærepenge, briefen
     22/8):

     · Teksten SIGER, at bestillingen ikke er sendt endnu. At
       skrive "modtaget" om noget, der ligger i en sms-kladde,
       er at lyve om en kundes aftensmad.

     · Referencen er med. Ringer gæsten i stedet, eller kommer
       sms'en frem samtidig med at et forsøg alligevel landede,
       kan personalet se, at det er DEN SAMME bestilling.

     '?&body=' er ikke en slåfejl: iOS vil have '&' og Android
     '?', og netop den kombination læser begge rigtigt.
     ========================================================== */
  function noedudgangSms(raekke) {
    var m = window.MOSEDE || {};
    var til = (m.telefon || '+4528871343').replace(/\s/g, '');
    var linjer = (raekke.linjer || [])
      .map(function (l) { return l.antal + ' x ' + l.navn; }).join(', ');
    var tekst = 'BESTILLING (ikke sendt fra siden): '
      + linjer
      + (raekke.fyld && raekke.fyld.length ? '. Fyld: ' + raekke.fyld.join(', ') : '')
      + '. ' + raekke.hent_dato + ' kl. ' + raekke.hent_tid
      + (raekke.hvordan === 'spis_her' ? ' (spis her)'
         : raekke.hvordan === 'levering'
           ? ' (LEVERES til ' + (raekke.leverings_adresse || 'adresse mangler') + ')'
           : ' (tag med)')
      + '. Navn: ' + raekke.navn
      + '. Tlf: ' + raekke.telefon
      + (raekke.besked ? '. Besked: ' + raekke.besked : '')
      + '. Ref: ' + raekke.reference;

    return {
      href: 'sms:' + til + '?&body=' + encodeURIComponent(tekst),
      ring: 'tel:' + til,
      tekst: tekst,
    };
  }

  /* KUN til js/store-skriv.js. Navnet siger det: det er husets
     indre, ikke en offentlig indgang. En gæsteside, der begynder
     at bruge noget herfra, er en gæsteside, der er ved at skrive
     i databasen — og så skal det opdages i en gennemlæsning. */
  window.ButikIndre = {
    LOKATION: LOKATION, MIT: MIT, SKY: SKY,
    LOG_DAGE: LOG_DAGE, SKRALD_DAGE: SKRALD_DAGE, SKRALD_TABELLER: SKRALD_TABELLER,
    auth: auth, logLokalt: logLokalt, logSletLokalt: logSletLokalt,
    lokalt: lokalt, læsLokalt: læsLokalt, nu: nu, næsteId: næsteId,
    pris: pris, skraldTabel: skraldTabel, skriv: skriv, status: status,
    talEllerNull: talEllerNull, tvilling: tvilling,
    cfg: cfg, hoveder: hoveder,
  };

  /* ============================================================
     HVORNÅR STÅR EN NYHED PÅ SIDEN?
     ------------------------------------------------------------
     "Live musik på molen · lørdag 22. august" skal væk om
     søndagen. Uden datoer skal NOGEN huske det — og det er den
     slags, ingen husker, når der er travlt. En nyhed om en
     fredag, der stadig står i november, får gæsten til at holde
     op med at læse nyhederne overhovedet.

     TOM BETYDER ALTID. En nyhed uden datoer opfører sig præcis
     som før, så alt det, der allerede står, bliver stående.

     REGLEN STÅR HER OG IKKE I DATABASEN. Rækkerne hentes alle
     sammen, og browseren afgør — ellers kunne personalet ikke SE
     i admin, at en nyhed venter eller er udløbet. Og den står ÉT
     sted: forsiden, nyhedssiden og admin spørger den samme
     funktion, så de tre ikke kan komme til at være uenige om,
     hvad gæsten ser.
     ============================================================ */
  function nyhedSynlig(n, iDag) {
    if (!n || n.aktiv === false) return false;
    var d = iDag || nu().dato;
    if (n.vis_fra && d < n.vis_fra) return false;
    if (n.vis_til && d > n.vis_til) return false;
    return true;
  }

  /* Det, personalet skal kunne se på listen: står den på siden
     lige nu — og hvis ikke, hvorfor. Uden det ord skal ejeren
     åbne hjemmesiden for at finde ud af, om nyheden virker. */
  function nyhedStatus(n, iDag) {
    var d = iDag || nu().dato;
    if (!n) return 'slukket';
    if (n.aktiv === false) return 'slukket';
    if (n.vis_fra && d < n.vis_fra) return 'venter';
    if (n.vis_til && d > n.vis_til) return 'udloebet';
    return 'vises';
  }

  /* ============================================================
     DAGENS RETTER PÅ EN BESTEMT DAG
     ------------------------------------------------------------
     Tabellen dagens_retter erstatter indstillingen dagens_ret,
     som kun kunne rumme ÉN ret på ÉN dag. Menukortets ugeplan
     stod halvt tom af netop den grund.

     DEN GAMLE INDSTILLING LEVER VIDERE FOR I DAG. Er der ikke
     lagt noget i tabellen, men står der en ret i indstillingen,
     vises DEN — ellers ville dagens ret forsvinde fra forsiden i
     det sekund, filen blev kørt, og det, ejeren har skrevet,
     ville se ud til at være væk.

     UDSOLGT OG SLUKKET ER TO TING. En udsolgt ret bliver stående
     på kortet (gæsten skal kunne se, hvad der VAR), men kan ikke
     bestilles. En slukket findes ikke.
     ============================================================ */
  function dagensRetter(d, dato) {
    var dag = dato || nu().dato;
    var liste = ((d || {}).dagens_retter || [])
      .filter(function (r) { return r.dato === dag && r.aktiv !== false; })
      .sort(function (a, b) {
        return (a.sortering || 0) - (b.sortering || 0) || (a.id || 0) - (b.id || 0);
      });

    if (liste.length) return liste;

    // Faldet tilbage: den gamle indstilling, og kun for i dag.
    var gammel = ((d || {}).indstillinger || {}).dagens_ret || {};
    if (dag === nu().dato && String(gammel.navn || '').trim()) {
      return [{
        id: null, dato: dag, navn: gammel.navn,
        beskrivelse: gammel.beskrivelse || null,
        pris: gammel.pris === undefined ? null : gammel.pris,
        antal_tilbage: null, udsolgt: false, aktiv: true, sortering: 0,
      }];
    }
    return [];
  }

  /* ⚠️ "INGEN DAGENS RET" ER ET SVAR, IKKE ET FRAVÆR (31/8).
     Kundens ord: "gør så man kan trykke ingen dagens ret i dag …
     og ikke bare at der står 'dagens ret følger snart'."

     En tom dag kan betyde to ting: køkkenet har ikke skrevet
     endnu (så er "Følger snart…" sandt), eller køkkenet har
     BESLUTTET, at der ingen er (så er "følger snart" et løfte,
     ingen har givet). Ejeren siger det med ét tryk i admin →
     Dagens ret; svaret gemmes som datoen i indstillingen
     dagens_ret_ingen og gælder KUN den dato — i morgen er dagen
     tom igen, og ingen skal huske at trykke den fra.

     En SKREVET ret vinder altid over trykket: står der en ret på
     dagen, er den det nyeste, nogen har sagt. */
  function ingenDagensRet(d, dato) {
    var dag = dato || nu().dato;
    if (dagensRetter(d, dag).length) return false;
    return String(((d || {}).indstillinger || {}).dagens_ret_ingen || '') === dag;
  }

  /* ⚠️ GÆSTEN MÅ IKKE LÆSE BESTILLINGER — men hun skal kunne se
     SIT eget nummer på kvitteringen (31/8, kundens ord: "det er
     professionelt"). Svaret er en security definer-funktion, der
     kun svarer på en reference, man HAR
     (supabase/bestillingsnummer.sql), og kun en time frem.
     Svarer den ingenting — filen ikke kørt, nettet væk — viser
     kvitteringen referencen alene, som hidtil. Nummeret er en
     oplysning; det må aldrig kunne vælte en kvittering. */
  function bestillingsnummer(ref) {
    if (!SKY) {
      var d = læsLokalt();
      var fundet = (d.bestillinger || []).filter(function (x) {
        return x.reference === ref;
      })[0];
      return Promise.resolve(fundet && fundet.nummer
        ? Number(fundet.nummer) : null);
    }
    return fetch(cfg.url + '/rest/v1/rpc/mosede_bestillingsnummer', {
      method: 'POST',
      headers: hoveder(),
      body: JSON.stringify({ ref: ref }),
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (n) {
        n = Number(n);
        return isFinite(n) && n > 0 ? n : null;
      })
      .catch(function () { return null; });
  }

  /* ============================================================
     GÆSTEN KAN FØLGE SIN BESTILLING  (4/9)
     ------------------------------------------------------------
     MÅLT, før det blev bygget: gæsten hører ikke ét ord, efter
     hun har trykket send. Kvitteringen lever kun i den fane, hun
     står i — lukker hun den, er den væk. Og kan køkkenet ikke
     lave maden, står beskeden KUN på personalets skærm; opkaldet
     er noget, nogen skal huske.

     ⚠️ SAMME LOV SOM NUMMERET OVENFOR: gæsten må stadig ikke læse
     tabellen. Det er et security definer-opslag, der kun svarer
     på en reference, man HAR, og aldrig med navn, telefon, mail
     eller leveringsadresse (supabase/bestilling-status.sql).

     ⚠️ ET FEJLET OPSLAG ER `null`, IKKE EN EXCEPTION. Siden skal
     kunne sige "vi kan ikke få fat i den lige nu — ring til os"
     i stedet for at gå i sort. En status er en oplysning; den må
     aldrig kunne vælte den side, gæsten står med i hånden.

     ⚠️ OG ØVETILSTANDEN SKAL FEJLE SOM SKYEN. Efterligningen her
     håndhæver DE SAMME tre gard som funktionen: slettet, vinduet
     og "findes ikke". En mock, der er mildere end databasen,
     lader fejlen bestå lokalt og fælde i produktionen — det er
     sket fire gange i det her projekt. */
  /* ⚠️ ADRESSEN BOR ÉT STED. Kvitteringen bygges af to filer
     (js/skal/bestil.js for forsiden og smørrebrødet,
     js/bestilling.js for bestil/ og ved-bordet/), og skrev de
     hver sin vej, ville den ene holde op med at virke den dag,
     mappen flyttede — uden at nogen så det. */
  function foelgAdresse(ref) {
    return ROD + 'min-bestilling/?ref=' + encodeURIComponent(ref || '');
  }

  function bestillingStatus(ref) {
    if (!ref) return Promise.resolve(null);

    if (!SKY) {
      var d = læsLokalt();
      /* ⚠️ I GÅR REGNES HER, IKKE MED EN isoPlus(). Den findes i
         js/bestil-regler.js, ikke i store.js — og et kald til en
         funktion, der ikke er der, ville kaste inde i en
         Promise-kæde og se ud som "ingen bestilling fundet".
         Fanget af node --check, ikke af øjnene. */
      var g = new Date(nu().dato + 'T12:00:00');
      g.setDate(g.getDate() - 1);
      var iGaar = g.toISOString().slice(0, 10);
      var fundet = (d.bestillinger || []).filter(function (x) {
        if (x.reference !== ref) return false;
        if (x.slettet) return false;
        // Vinduet er hentedagen plus dagen efter — som i SQL'en.
        // Tekstsammenligning duer på ISO-datoer.
        return String(x.hent_dato || '') >= iGaar;
      })[0];
      if (!fundet) return Promise.resolve(null);
      return Promise.resolve({
        nummer: fundet.nummer === undefined ? null : fundet.nummer,
        status: fundet.status || 'ny',
        hent_dato: fundet.hent_dato,
        hent_tid: fundet.hent_tid,
        bord_nummer: fundet.bord_nummer || null,
        hvordan: fundet.hvordan || 'afhentning',
        antal: fundet.antal,
        linjer: fundet.linjer || [],
      });
    }

    return fetch(cfg.url + '/rest/v1/rpc/mosede_bestilling_status', {
      method: 'POST',
      headers: hoveder(),
      body: JSON.stringify({ ref: ref }),
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (raekker) {
        /* Funktionen returnerer en TABEL, så svaret er en liste.
           Ingen række = ukendt, slettet eller for gammel — og de
           tre skal ligne hinanden udadtil: siden må ikke kunne
           afgøre, OM en reference findes, ud fra svaret. */
        if (!Array.isArray(raekker) || !raekker.length) return null;
        return raekker[0];
      })
      .catch(function () { return null; });
  }

  /* ⚠️ OG DET SAMME FOR EN BORDBOOKING  (4/9). Kundens ord med
     et skærmbillede af Borde-fanen: *"og det her reffereance
     nummer ka vi ik fix det"* — det der var BO260904-658KG.

     Samme funktion, samme lov, anden tabel
     (supabase/bordnummer.sql). Skrev vi ét fælles opslag med et
     tabelnavn som argument, ville en tastefejl kunne hente et
     MADnummer til en booking — og de to tællere er med vilje
     hver sin, netop for at tallene kan siges højt hver for sig. */
  function bordnummer(ref) {
    if (!SKY) {
      var d = læsLokalt();
      var fundet = (d.bordbestillinger || []).filter(function (x) {
        return x.reference === ref;
      })[0];
      return Promise.resolve(fundet && fundet.nummer
        ? Number(fundet.nummer) : null);
    }
    return fetch(cfg.url + '/rest/v1/rpc/mosede_bordnummer', {
      method: 'POST',
      headers: hoveder(),
      body: JSON.stringify({ ref: ref }),
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (n) {
        n = Number(n);
        return isFinite(n) && n > 0 ? n : null;
      })
      .catch(function () { return null; });
  }

  /* "#0047" — som det siges ved lugen og står på kortet i admin.
     Fire cifre, til tallet vokser forbi dem; et loft ville
     klippe nummer 10000 om et par sæsoner. */
  function pæntNummer(n) {
    var t = Number(n);
    if (!isFinite(t) || t <= 0) return '';
    var s = String(Math.round(t));
    while (s.length < 4) s = '0' + s;
    return '#' + s;
  }

  /* ---- DAGENS EGNE REGLER ----

     Ingen række = en helt almindelig dag. Det er hele formen på
     tabellen: kun det, der er ANDERLEDES, står skrevet. Svaret
     her er derfor null og ikke et objekt med lutter standarder —
     en kalder, der får null, ved, at der ikke er noget særligt,
     og kan bruge de almindelige åbningstider uden at spørge
     hvilke felter der var udfyldt. */
  function dagsregel(d, dato) {
    var dag = dato || nu().dato;
    var fundet = null;
    ((d || {}).dags_regler || []).forEach(function (r) {
      if (r.dato === dag) fundet = r;
    });
    return fundet;
  }

  /* Må man bestille på den her måde den her dag?

     ⚠️ ET BORD ER SPIS HER. Databasen binder de to sammen
     (bestilling_bord_hvordan_ok), og browseren skal svare det
     samme — ellers viser siden en mulighed, databasen afviser,
     og gæsten møder en fejl efter at have valgt hele sin mad. */
  function maaBestille(d, dato, hvordan) {
    var r = dagsregel(d, dato);
    if (!r) return true;
    return hvordan === 'spis_her' ? !r.luk_spis_her : !r.luk_takeaway;
  }

  /* Må der bestilles fra bordene?

     ⚠️ NAVNET ER bordbestilling_aaben, og det er kontakten, der
     FINDES i admin på Køkken-kø-fanen. Databasens værn læser den
     samme (supabase/dagsbesked-og-qr.sql). En ny nøgle ville give
     fluebenet og værnet hver sin sandhed: personalet slår fra,
     skærmen siger fra, og databasen tager glad imod.

     ⚠️ MANGLER INDSTILLINGEN, ER DEN ÅBEN. En forretning, der
     aldrig har rørt fluebenet, skal ikke opdage, at QR-koderne
     holdt op med at virke — og værnet i databasen svarer det
     samme. */
  function qrAaben(d) {
    return (d && d.indstillinger || {}).bordbestilling_aaben !== false;
  }

  /* Er dagen helt lukket for bestillinger? Begge veje spærret er
     i praksis en lukkedag — og så skal dagen slet ikke stå i
     dagvælgeren. */
  function dagenHeltLukket(d, dato) {
    var r = dagsregel(d, dato);
    return !!r && r.luk_takeaway && r.luk_spis_her;
  }

  /* Kan retten bestilles? Uden en pris kan den ses, men ikke
     købes — samme regel som på menukortet, hvor et fyld uden pris
     kan ønskes og ikke bestilles. */
  function retKanBestilles(r) {
    return !!r && r.aktiv !== false && !r.udsolgt
      && r.pris !== null && r.pris !== undefined && r.pris !== '';
  }

  window.Butik = {
    tjek: tjek,
    bestil: bestil,
    noedudgangSms: noedudgangSms,
    forespoerg: forespoerg,
    bookBord: bookBord,
    lejLokale: lejLokale,
    reserverPlads: reserverPlads,
    arrangementer: arrangementer,
    hentPladser: hentPladser,
    FORESPOERGSEL_TYPER: FORESPOERGSEL_TYPER,
    nyhedSynlig: nyhedSynlig,
    nyhedStatus: nyhedStatus,
    dagensRetter: dagensRetter,
    ingenDagensRet: ingenDagensRet,
    bestillingsnummer: bestillingsnummer,
    bordnummer: bordnummer,
    pæntNummer: pæntNummer,
    dagsregel: dagsregel,
    maaBestille: maaBestille,
    dagenHeltLukket: dagenHeltLukket,
    qrAaben: qrAaben,
    retKanBestilles: retKanBestilles,
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
    leveringsTekst: leveringsTekst,
    bestillingStatus: bestillingStatus,
    foelgAdresse: foelgAdresse,
    udvalg: udvalg,
    kategoriPaaDag: kategoriPaaDag,
    tilMinutter: tilMinutter,
    lukketDen: lukketDen,
    tidligLukning: tidligLukning,

    // Henter alt. Fejler skyen, falder vi tilbage på det lokale
    // i stedet for at vise en tom side.
    hent: function () {
      if (!SKY) return Promise.resolve(afledLukkedage(læsLokalt()));

      return Promise.all([
        /* lokationer har ingen lokation_id – dens egen id ER den.
           "aktiv=eq.true" er væk med vilje: den hørte til dengang
           listen var flere luger i samme forretning. Nu er rækken
           HELE sidens adresse og telefonnummer, og et flueben
           taget i admin må ikke kunne tømme kontaktafsnittet. */
        hentTabel('lokationer', 'select=*&id=eq.' + encodeURIComponent(LOKATION)),
        hentTabel('aabningstider', 'select=*' + MIT + '&order=ugedag'),
        /* Kalenderen erstatter lukkedage. Der hentes 120 dage
           TILBAGE og ikke fra i dag: en vinterlukning er én række,
           der begyndte i november, og med et filter på startdatoen
           ville den forsvinde fra forsiden den 1. december — midt i
           lukningen. Resten sorteres fra i browseren. */
        hentTabel('kalender', 'select=*' + MIT + '&dato=gte.' + førDato(120) + '&order=dato'),
        hentTabel('menu_kategorier', 'select=*' + MIT + '&order=sortering'),
        hentTabel('menu_varer', 'select=*' + MIT + '&order=sortering'),
        hentTabel('nyheder', 'select=*' + MIT + '&aktiv=eq.true&order=dato.desc'),
        hentTabel('indstillinger', 'select=*' + MIT),
        /* Dagens retter for de næste to uger. TILBAGE i tiden
           hentes der ikke: gårsdagens ret er ikke noget, nogen
           skal se — og admin henter selv sin uge, når fanen
           åbnes.

           ⚠️ .catch OG IKKE ET LØFTE OM DET. Der stod skrevet her,
           at "hentTabel giver en tom liste, hvis tabellen ikke
           findes". Det gjorde den ikke — hentTabel kaster på alt
           andet end 200, og Promise.all falder med den første, der
           kaster. MÅLT i produktionen 26/8: dagens-retter.sql var
           ikke kørt, tabellen svarede 404, og HELE hentningen
           væltede. Gæsten så nødmenuen med to varer, mens der stod
           242 i databasen — og siden så helt normal ud imens.

           TO tabeller får lov: dagens_retter og dags_regler.
           Kriteriet er ikke antallet, det er DETTE — de kom til,
           efter siden var i luften, og deres fravær har et
           rigtigt svar. Uden dagens_retter falder dagens ret
           tilbage på indstillingen dagens_ret som før; uden
           dags_regler er hver dag bare en almindelig dag, og
           værnet, der håndhæver reglerne, findes heller ikke
           (de kommer fra den samme SQL-fil), så de to kan ikke nå
           at være uenige.

           De syv andre er sidens fundament — svarer menu_varer
           404, ER nødmenuen det rigtige svar.

           Fejlen skjules ikke, den skrives i konsollen med
           tabelnavn og kode. En tavs catch ville bare flytte det
           samme mørke et andet sted hen. */
        hentTabel('dagens_retter',
          'select=*' + MIT + '&dato=gte.' + nu().dato + '&order=dato,sortering')
          .catch(function (fejl) {
            console.warn('dagens_retter kunne ikke hentes — siden bruger '
              + 'indstillingen dagens_ret i stedet. Kør supabase/dagens-retter.sql:',
              fejl && fejl.message || fejl);
            return [];
          }),
        /* Dagsreglerne: de dage, der IKKE er almindelige. Der
           hentes 30 dage tilbage og frem — tilbage, fordi admin
           skal kunne se en måned, der er begyndt, og frem, fordi
           gæsten skal kunne bestille ind i næste måned.

           Se noten ovenfor om hvorfor netop den her må mangle. */
        hentTabel('dags_regler',
          'select=*' + MIT + '&dato=gte.' + førDato(30) + '&order=dato')
          .catch(function (fejl) {
            console.warn('dags_regler kunne ikke hentes — hver dag behandles '
              + 'som en almindelig dag. Kør supabase/dagsregler.sql:',
              fejl && fejl.message || fejl);
            return [];
          }),
      ]).then(function (svar) {
        var ind = {};
        (svar[6] || []).forEach(function (r) { ind[r.noegle] = r.vaerdi; });
        var i_dag = nu().dato;
        return afledLukkedage({
          lokationer: svar[0],
          aabningstider: svar[1],
          // Kun det, der ikke er overstået: en lukkedag i marts
          // hører ikke hjemme på forsiden i august.
          kalender: (svar[2] || []).filter(function (k) {
            return (k.slut_dato || k.dato) >= i_dag;
          }),
          menu_kategorier: svar[3],
          menu_varer: svar[4],
          nyheder: svar[5],
          indstillinger: ind,
          dagens_retter: svar[7] || [],
          dags_regler: svar[8] || [],
        });
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
        return Promise.resolve((d.bestillinger || []).filter(levende));
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
        'select=*' + MIT + LEVENDE + '&hent_dato=gte.' + i_gaar.toISOString().slice(0, 10)
        + '&order=hent_dato,hent_tid');
    },

    /* ---- DE OPTAGNE DAGE ----
       Den anden liste, gæsten må læse — og den siger KUN datoer.
       Visningen public.optagne_dage har tre kolonner: forretning,
       dato og hvad slags. Der er ikke ét navn, ét telefonnummer
       eller én besked i den; gæsten må se, at den 12. er væk, men
       ikke hvem der har den.

       Hentes for sig og ikke i hent(): kun de tre
       forespørgselssider har brug for den. */
    hentOptagneDage: function () {
      if (!SKY) return Promise.resolve(optagneDageLokalt(læsLokalt()));
      return hentTabel('optagne_dage',
        'select=dato,slags' + MIT + '&dato=gte.' + nu().dato + '&order=dato')
        .catch(function (fejl) {
          /* En tom liste og ikke en fejl: kan vi ikke se de
             optagne dage, skal gæsten stadig kunne spørge. Værnet
             i databasen fanger dagen, hvis den er væk. */
          console.warn('Kunne ikke hente de optagne dage:', fejl);
          return [];
        });
    },

    optagerDagen: optagerDagen,

    /* ---- ER LINJEN EMBALLAGE OG IKKE MAD?  (1/9) ----

       Kundens skærmbillede af forlægget viste emballagen som sin
       EGEN linje uden for maden. Vores stod som en varelinje — og
       **målt** på Bestillinger-fanen betød det, at dagen sagde
       "9 retter", hvor der var bestilt 5, og at køkkenets
       produktionsliste bad om at lave "4 Emballage".

       ⚠️ ET TILLÆG ER PENGE, IKKE ARBEJDE. Den skal tælle med i
       kroner alle steder og ALDRIG i det, der skal laves.

       To kendetegn, og rækkefølgen er med vilje:
         1) `emballage: true` på linjen — nye bestillinger bærer
            det, og det kan ikke forveksles med noget
         2) NAVNET, hvis flaget mangler. Rækker fra før 1/9 ligger
            i databasen uden det, og de skal opføre sig rigtigt
            uden en migrering. Navnet er ejerens eget
            (emballage_navn), ellers husets standard — samme greb
            som Admin.erTapas, der kender fadet på navnet. */
    erEmballage: function (d, linje) {
      if (!linje) return false;
      if (linje.emballage === true) return true;
      var navn = String(linje.navn || '').trim().toLowerCase();
      if (!navn) return false;
      var eget = String(((d || {}).indstillinger || {}).emballage_navn || '')
        .trim().toLowerCase();
      return navn === (eget || 'emballage');
    },

    /* ---- HVOR MANGE BORDE ER DER TILBAGE DEN DAG? ----

       Kundens ord 31/8: *"man skal bare kunne booke bord til den
       og den dag, og måske som det eneste administrere, hvor
       mange borde man kan bestille ud af de 55 på i dag eller
       dit og dat dag."*

       ⚠️ GÆSTEN MÅ IKKE LÆSE BOOKINGERNE — kun TALLENE. Visningen
       bord_fyldte_dage kører med sin ejers øjne og har KUN
       lokation, dato, antal taget og loftet; se noten i
       supabase/bord-loft-pr-dag.sql. Kommer der et navn med, er
       gæstelisten åben for internettet.

       Fejler kaldet, svarer den med en TOM liste og ikke med en
       fejl: kan vi ikke se, hvor mange der er taget, skal gæsten
       stadig kunne booke. Værnet i databasen siger fra, hvis
       dagen er fuld. */
    hentFyldteDage: function () {
      if (!SKY) return Promise.resolve(fyldteDageLokalt(læsLokalt()));
      return hentTabel('bord_fyldte_dage',
        'select=dato,taget,loft' + MIT + '&dato=gte.' + nu().dato + '&order=dato')
        .catch(function (fejl) {
          console.warn('Kunne ikke hente de fyldte bord-dage:', fejl);
          return [];
        });
    },

    /* ---- HVILKE TIDER ER FYLDT VED LUGEN?  (4/9) ----

       Der var INTET loft pr. hentetid, før luge-loft.sql: fyrre
       bestillinger kunne lande på kl. 12.00, og systemet sagde ja
       til dem alle sammen.

       ⚠️ GÆSTEN MÅ IKKE LÆSE BESTILLINGERNE — kun TALLENE.
       Visningen luge_fyldte_tider kører med sin ejers øjne og har
       KUN lokation, dato, tid og antal; se noten i
       supabase/luge-loft.sql. Kommer der et navn med, er dagens
       bestillingsliste åben for internettet.

       ⚠️ OG LOFTET STÅR IKKE I VISNINGEN. Det er ÉN indstilling,
       siden allerede har hentet. To udgaver af det samme tal
       skrider fra hinanden, første gang ejeren retter sit eget.

       Fejler kaldet, svarer den med en TOM liste og ikke med en
       fejl: kan vi ikke se, hvad der er taget, skal gæsten stadig
       kunne bestille. Værnet i databasen siger fra. */
    hentFyldteTider: function () {
      if (!SKY) return Promise.resolve(fyldteTiderLokalt(læsLokalt()));
      return hentTabel('luge_fyldte_tider',
        'select=dato,tid,taget' + MIT + '&dato=gte.' + nu().dato + '&order=dato,tid')
        .catch(function (fejl) {
          console.warn('Kunne ikke hente de fyldte tider:', fejl);
          return [];
        });
    },

    /* Er dagen fuld? Reglen bor ÉT sted, så bordsiden og
       personalets skærm ikke kan komme til at sige hver sit. */
    /* Loftet for én dag, regnet frem af de tre lag. Personalets
       skærm spørger den samme funktion som gæstens, så de to
       aldrig kan komme til at sige hvert sit om den samme
       lørdag. ⚠️ d.borde skal være med — i admin ligger bordene i
       Admin.lister.bordliste og ikke i Admin.data. */
    bordLoft: function (d, iso) { return bordLoftLokalt(d || {}, iso); },

    dagenErFuld: function (liste, iso) {
      var r = (liste || []).filter(function (x) { return x.dato === iso; })[0];
      if (!r) return false;
      /* ⚠️ TOM ER IKKE NUL. isFinite(null) er sandt, fordi
         Number(null) er 0 — så uden det første led ville en dag
         uden loft stå som fuld, og hele bookingsiden ville lukke
         sig selv den dag, ejeren ikke har oprettet sine borde. */
      if (r.loft === null || r.loft === undefined || String(r.loft) === '') return false;
      var loft = Number(r.loft);
      if (!isFinite(loft)) return false;
      return Number(r.taget) >= loft;
    },

    /* ---- Bordene ----
       Den ENESTE liste, gæsten må læse: telefonen ved bordet skal
       kunne slå bord 7 op, før den viser en formular. Der står
       ikke noget om nogen i den. Hentes for sig og ikke i hent():
       de andre sider har ikke brug for den. */
    /* ---- BORDENE ----
       medKode er PERSONALETS udgave. Gæsten må ikke læse nøglen:
       kunne hun hente listen med koderne i, kunne hun selv bygge
       alle 55 adresser, og nøglen var en dekoration. Databasen
       håndhæver det med kolonnerettigheder (bord-noegle.sql), så
       "select=*" svarer 42501 for en gæst — derfor står
       kolonnerne ved navn her.

       ⚠️ OG ØVETILSTANDEN SKAL SKJULE DEN LIGE SÅ HÅRDT. En
       efterligning, der er mildere end databasen, lader en fejl
       bestå lokalt og fælde i produktionen. */
    /* ---- HOLDET OG MIN EGEN ROLLE  (2/9) ----
       Kræver supabase/roller.sql.

       ⚠️ SKÆRMEN ER PYNT, POLITIKKERNE ER VÆRNET. Admin skjuler
       de faner, en medarbejder ikke kan bruge — men en skjult
       fane er stadig en fane, en nysgerrig kan kalde forbi.
       Det, der faktisk siger nej, er RLS og udløserne i
       roller.sql (18 × BESTOD).

       ⚠️ OG DEN VÆLTER IKKE, FØR FILEN ER KØRT. Uden kolonnen
       `rolle` svarer PostgREST 400, og så ville hele
       personalefanen — og med den optegningen af alle de andre —
       gå ned. Samme greb som har_kode på bordene. */
    minRolle: function () {
      if (!SKY) {
        var d = læsLokalt();
        var mig = '';
        try { mig = sessionStorage.getItem('mosede_email') || ''; } catch (e) { /* privat vindue */ }
        var r = (d.personale || []).filter(function (p) {
          return p.aktiv !== false
            && String(p.email || '').toLowerCase() === String(mig).toLowerCase();
        })[0];
        /* Ingen liste = som i dag: den, der er logget ind, er
           ejer. En øvetilstand, der gjorde ham til medarbejder,
           ville skjule halvdelen af admin for den, der prøver
           systemet af. */
        return Promise.resolve(r ? r.rolle : ((d.personale || []).length ? null : 'ejer'));
      }
      return fetch(cfg.url + '/rest/v1/rpc/min_rolle', {
        method: 'POST', headers: hoveder(), body: '{}',
      }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (v) { return v || null; })
        .catch(function () { return null; });
    },

    hentPersonale: function () {
      if (!SKY) {
        var d = læsLokalt();
        return Promise.resolve((d.personale || []).slice().sort(function (a, b) {
          return String(a.email).localeCompare(String(b.email), 'da');
        }));
      }
      /* Fejler den, er det som regel fordi roller.sql ikke er
         kørt endnu — fanen siger det selv i stedet for at stå
         tom. En tom liste og en fejlet hentning ser ens ud. */
      return hentTabel('admin_adgang',
        'select=email,lokation_id,rolle,aktiv,navn' + MIT + '&order=email');
    },

    hentBorde: function (medKode) {
      if (!SKY) {
        var d = læsLokalt();
        return Promise.resolve((d.borde || []).slice().sort(function (a, b) {
          return (a.sortering - b.sortering) || (a.id - b.id);
        }).map(function (b) {
          var kopi = {};
          for (var n in b) if (n !== 'kode') kopi[n] = b[n];
          // Afledt af nøglen, som den genererede kolonne i databasen.
          kopi.har_kode = !!String(b.kode || '').trim();
          if (medKode) kopi.kode = b.kode || null;
          return kopi;
        }));
      }
      if (medKode) return hentTabel('borde', 'select=*' + MIT + '&order=sortering,id');

      /* ⚠️ KOLONNERNE FINDES FØRST, NÅR FILEN ER KØRT.

         Det her er `vis_fra`-fejlen igen, bare den anden vej rundt.
         Beder vi ubetinget om har_kode, svarer PostgREST 400 i hele
         det vindue, hvor koden er udgivet og supabase/bord-noegle.sql
         ikke er kørt endnu — og så kan INGEN bestille fra et bord,
         på grund af en fil, ejeren ikke ved eksisterer.

         Og "select=*" kan ikke bruges som standard: EFTER filen er
         kørt, svarer den 42501 for en gæst, fordi anon ikke må læse
         kode. De to tilstande udelukker altså hinanden, og derfor
         prøves den rigtige først og den gamle bagefter. Én ekstra
         forespørgsel, og kun i det vindue. */
      var NAVNE = 'id,lokation_id,nummer,pladser,placering,aktiv,'
        + 'sortering,zone,har_kode,oprettet,aendret';
      return hentTabel('borde', 'select=' + NAVNE + MIT + '&order=sortering,id')
        .catch(function () {
          return hentTabel('borde', 'select=*' + MIT + '&order=sortering,id')
            .then(function (liste) {
              /* Uden kolonnen er der ingen nøgler, og så kræver
                 intet bord en. Siden opfører sig som før filen. */
              return (liste || []).map(function (b) {
                if (b.har_kode === undefined) b.har_kode = false;
                return b;
              });
            });
        });
    },

    /* ---- Hvor travlt er der ved lugen? ----
       Visningen bord_travlhed (supabase/bord-loft.sql) svarer med
       TAL og intet andet: hvor mange bordordrer er i køen, hvor
       mange kom i sidste kvarter, og hvor gammel den ældste af
       dem er.

       ⚠️ DEN MÅ ALDRIG FÅ EN KOLONNE MERE. Visningen kører med
       sin ejers øjne og springer adgangsreglerne over, præcis som
       optagne_dage. Kommer der et navn eller et telefonnummer
       med, er køkkenets liste åben for internettet — og siden
       ville se helt rigtig ud imens. Et TAL er ikke
       personoplysninger; det er det samme, gæsten kan se ved at
       kigge hen mod lugen.

       Den fejler i stilhed. Er filen ikke kørt endnu, skal
       bordsiden virke som før — en ventetid, vi ikke kender, er
       ikke en grund til at nægte gæsten at bestille. */
    hentTravlhed: function () {
      var tom = { i_koeen: 0, seneste_kvarter: 0, aeldste_min: 0 };

      if (!SKY) {
        var d = læsLokalt();
        var kvarterSiden = Date.now() - 15 * 60 * 1000;
        var bord = (d.bestillinger || []).filter(function (b) {
          return b.bord_nummer && !b.slettet;
        });
        var friske = bord.filter(function (b) {
          return Date.parse(b.oprettet || 0) > kvarterSiden;
        });
        var aeldste = 0;
        friske.forEach(function (b) {
          var m = Math.floor((Date.now() - Date.parse(b.oprettet || 0)) / 60000);
          if (m > aeldste) aeldste = m;
        });
        return Promise.resolve({
          i_koeen: bord.filter(function (b) {
            return ['ny', 'bekraeftet', 'tilberedes', 'klar'].indexOf(b.status) !== -1;
          }).length,
          seneste_kvarter: friske.length,
          /* Den ÆLDSTE i vinduet, altså den, der falder ud først.
             Visningen i databasen bruger min() på alderen — det er
             det samme tal set fra den anden side. */
          aeldste_min: aeldste,
        });
      }

      return hentTabel('bord_travlhed', 'select=*' + MIT)
        .then(function (r) { return (r && r[0]) || tom; })
        .catch(function () { return tom; });
    },

    /* ---- Udeblivelserne, kun til personalesiden ----
       Samles pr. telefonnummer, så køkkenet kan se en gænger, FØR
       maden bliver lavet — spiis' brief (22/8) betalte for idéen
       med rigtige middage i skraldespanden. 180 dage tilbage: kort
       nok til at en enkelt glemt søndag i fjor ikke hænger ved,
       langt nok til at et mønster kan ses. Kun tre kolonner med
       hjem — det er en optælling, ikke en liste at bladre i. */
    hentUdeblivelser: function () {
      var graense = new Date(nu().dato + 'T12:00:00Z');
      graense.setUTCDate(graense.getUTCDate() - 180);
      var fra = graense.toISOString().slice(0, 10);

      if (!SKY) {
        var d = læsLokalt();
        return Promise.resolve((d.bestillinger || []).filter(function (b) {
          return b.status === 'udeblevet' && b.hent_dato >= fra;
        }));
      }
      return hentTabel('bestillinger',
        'select=telefon,hent_dato,navn' + MIT
        + '&status=eq.udeblevet&hent_dato=gte.' + fra);
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
        return Promise.resolve((d.forespoergsler || []).filter(levende));
      }
      var graense = new Date(nu().dato + 'T12:00:00Z');
      graense.setUTCDate(graense.getUTCDate() - 180);
      return hentTabel('forespoergsler',
        'select=*' + MIT + LEVENDE + '&oprettet=gte.' + graense.toISOString().slice(0, 10)
        + '&order=oprettet.desc');
    },

    /* Bordbookinger fra i går og frem. Gårsdagen er med af samme
       grund som ved bestillingerne: personalet skal kunne se, hvad
       der lige er sket — ikke kun hvad der kommer. */
    /* Hed hentBorde, indtil bordene SELV blev en tabel. Så havde
       to funktioner samme navn, og den sidste i objektet vandt i
       stilhed: bordsiden bad om borde og fik bookinger, uden en
       fejl i konsollen. */
    hentBordbestillinger: function () {
      if (!SKY) {
        var d = læsLokalt();
        return Promise.resolve((d.bordbestillinger || []).filter(levende));
      }
      return hentTabel('bordbestillinger',
        'select=*' + MIT + LEVENDE + '&dato=gte.' + førDato(1)
        + '&order=dato.asc,tid.asc');
    },

    /* ⚠️ HELE HISTORIKKEN, IKKE KUN FREMTIDEN (30/8). De andre
       lister klipper med dato.gte, fordi en bordbestilling fra i
       fjor er død vægt. En tilmelding hører til sit ARRANGEMENT,
       og fanen viser dem pr. arrangement — klippede vi på en dato
       her, ville listen til gårsdagens koncert være tom, netop
       når nogen skal gøre op, hvem der udeblev.

       Fejler kaldet, fordi supabase/arrangementer.sql ikke er
       kørt endnu, svarer den med en TOM liste og ikke med en
       fejl: fanen skal kunne stå og sige, hvad der mangler, i
       stedet for at vælte resten af admin. */
    hentReservationer: function () {
      if (!SKY) {
        var d = læsLokalt();
        return Promise.resolve((d.reservationer || []).filter(levende));
      }
      return hentTabel('reservationer',
        'select=*' + MIT + LEVENDE + '&order=oprettet.desc')
        .catch(function () { return []; });
    },

    hentUdlejninger: function () {
      if (!SKY) {
        var d = læsLokalt();
        return Promise.resolve((d.udlejninger || []).filter(levende));
      }
      return hentTabel('udlejninger',
        'select=*' + MIT + LEVENDE + '&dato=gte.' + førDato(1)
        + '&order=dato.asc');
    },

    /* ---- Skraldespanden ----
       Rækker fra alle fire tabeller i én liste, nyest smidt ud
       først. Fire kald og ikke ét: der er ingen fælles tabel at
       spørge, og fire små kald på en fane, der åbnes sjældent, er
       billigere end en tabel mere at holde adgangsregler på.

       Et kald, der fejler, må ikke tage de tre andre med sig. Så
       ville en enkelt fejl få spanden til at se tom ud — og tom
       betyder "der er ikke noget at fortryde". */
    hentSkraldespand: function () {
      if (!SKY) {
        var d = læsLokalt();
        var ud = [];
        SKRALD_TABELLER.forEach(function (t) {
          (d[t.tabel] || []).forEach(function (r) {
            if (r.slettet) ud.push(Object.assign({}, r, { slags: t.slags }));
          });
        });
        return Promise.resolve(ud.sort(function (a, b) {
          return a.slettet < b.slettet ? 1 : -1;
        }));
      }

      return Promise.all(SKRALD_TABELLER.map(function (t) {
        return hentTabel(t.tabel,
          'select=*' + MIT + '&slettet=not.is.null&order=slettet.desc')
          .then(function (liste) {
            return (liste || []).map(function (r) {
              return Object.assign({}, r, { slags: t.slags });
            });
          })
          .catch(function (e) {
            if (window.console) console.warn('skraldespand ' + t.tabel + ':', e);
            return [];
          });
      })).then(function (dele) {
        var ud = [];
        dele.forEach(function (del) { ud = ud.concat(del); });
        return ud.sort(function (a, b) { return a.slettet < b.slettet ? 1 : -1; });
      });
    },

    /* ---- Logbogen ----
       Hvem ændrede hvad hvornår. Skrives af en trigger i
       databasen (supabase/logbog.sql) og kan ikke rettes af
       nogen — heller ikke af personalet.

       Der hentes 200 linjer. Fanen er til at slå op i, ikke til
       at læse igennem, og et halvt års historik over en
       mobilforbindelse er et halvt år, ingen scroller ned
       igennem. */
    hentLogbog: function () {
      if (!SKY) {
        var d = læsLokalt();
        return Promise.resolve((d.logbog || []).slice(0, 200));
      }
      return hentTabel('logbog',
        'select=*' + MIT + '&order=hvornaar.desc&limit=200');
    },

    hentPushEnheder: function () {
      if (!SKY) {
        var d = læsLokalt();
        return Promise.resolve((d.push_abonnementer || []).slice());
      }
      return hentTabel('push_abonnementer',
        'select=id,email,enhed,endpoint,oprettet' + MIT + '&order=oprettet.desc');
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
