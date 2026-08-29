/* Fanen Baglokalet. Se js/admin/kerne.js for de to principper,
   der gælder i alle admin-filerne.

   ============================================================
   ⚠️ ÉN FANE TIL LOKALET, IKKE TO  (27/8)
   ============================================================
   Kundens ord: "baglokale skal ikke [i forespørgsler], da det har
   sin egen fane."

   Han har ret, og skellet var formularens og ikke personalets:

     baglokale/     →  en UDLEJNING    (tabellen udlejninger)
     h-baglokale    →  en FORESPØRGSEL (tabellen forespoergsler)

   To veje ind, ét lokale, den samme lørdag. Stod de to slags på
   hver sin fane, skulle nogen huske at kigge begge steder, før de
   sagde ja — og det er præcis sådan, en dag bliver lovet væk to
   gange. Begge står her nu, i den samme kø.

   ============================================================
   FANEN ER ET FORLØB, IKKE TRE LISTER  (28/8)
   ============================================================
   Den havde tre kasser: Venter på svar, I hus, Færdige. Det er
   tre steder at kigge for at vide, hvad der foregår med et lokale,
   der lejes ud nogle gange om måneden — og den, der har travlt,
   kigger i den øverste.

   Nu er fanen fem kort, og de svarer på hvert sit spørgsmål:

     1. Hvad går galt, hvis ingen gør noget?   ⚠️-kortet
     2. Hvor langt er sagerne?                 forløbet
     3. Har vi lokalet den 12.?                månedsnettet
     4. Hvad skal jeg lave nu?                 ÉN liste, hastet først
     5. Hvad koster det?                       vilkårene

   ------------------------------------------------------------
   ⚠️ ET "AFTALT" JA ER IKKE ET LÅST JA
   ------------------------------------------------------------
   Det er fanens vigtigste nye oplysning, og den var usynlig før.

   Der kan kun være ét ja pr. dag, og det er ikke en regel i den
   her fil: databasen selv afviser ja nummer to (indekset
   udlejning_dagen_er_taget i supabase/udlejning.sql). MEN det
   indeks tæller kun UDLEJNINGER. En forespørgsel sat til "aftalt"
   ser ud som et ja på skærmen — og så længe der ikke står en
   udlejning bag den, kan en gæst på hjemmesiden stadig tage
   dagen. Ingen ville opdage det, før nummer to ringede.

   Derfor har hver sag et felt "laast", derfor har trin 3 i
   forløbet sit eget tal, og derfor står dagen anderledes i nettet.
   Knappen "Lås dagen" laver den manglende udlejning. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var STATUS_NAVNE = { ny: 'Ny', bekraeftet: 'Lejet ud', afvist: 'Afvist' };

  var MDR = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli',
    'august', 'september', 'oktober', 'november', 'december'];
  var UGEDAGE = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];

  /* Standarden for "nogen har ventet for længe". Ejeren kan sætte
     sin egen i Vilkår; to dage er det, fanen råber op efter,
     indtil nogen siger noget andet. Det er ikke et løfte til
     gæsten — tallet står ingen steder på hjemmesiden. */
  var FRIST_STANDARD = 2;

  var udlejninger = [];
  var visAar = null;
  var visMdr = null;
  var valgtDag = null;
  var filter = 'alle';

  // ----------------------------------------------------------
  //  DE TO SLAGS, SET SOM ÉN
  // ----------------------------------------------------------
  /* ⚠️ ÉT SKELET, TO KILDER. Resten af filen spørger aldrig
     "hvilken tabel kom den fra" — den spørger sag.slags. Uden det
     ville hver eneste optælling, sortering og advarsel skulle
     skrives to gange, og den dag de to kom til at sige noget
     forskelligt, ville ingen opdage det.

     Statusordene er de to tabellers egne og skal IKKE laves om:
     udlejninger har ny/bekraeftet/afvist, forespørgsler har
     ny/kontaktet/aftalt/afvist. Begge har værn i databasen, og et
     nyt ord ville være en SQL-fil, ejeren skal køre, for noget
     ingen ser. Derfor oversættes de kun HER. */
  function alleSager() {
    var ud = udlejninger.map(function (u) {
      return {
        slags: 'udlejning',
        id: u.id,
        raa: u,
        dato: u.dato,
        navn: u.navn,
        antal: u.antal_personer,
        oprettet: u.oprettet,
        // Tre tilstande, som fanen tænker i.
        stand: u.status === 'bekraeftet' ? 'i-hus'
          : (u.status === 'afvist' ? 'faerdig' : 'venter'),
        // Lukker den dagen for alle andre?
        lukker: u.status === 'bekraeftet',
        /* ⚠️ OG HOLDER DATABASEN DEN LUKKET? Kun en udlejning
           tælles af indekset udlejning_dagen_er_taget. Se noten
           øverst i filen. */
        laast: u.status === 'bekraeftet',
        trin: u.status === 'bekraeftet' ? 4 : (u.status === 'afvist' ? 0 : 1),
      };
    });

    /* ⚠️ EN FORESPØRGSEL, DER ER BLEVET TIL EN BOOKING, ER ÉN
       SAG — IKKE TO.

       "Book lokalet til dem" opretter en udlejning ud fra
       forespørgslen og sætter forespørgslen til aftalt. Uden det
       her filter stod BEGGE på skærmen bagefter: "Mette Lund" som
       udlejning og "Mette Lund" som forespørgsel, side om side i
       I hus. To kort, ét selskab — og den, der så dem, ville tro,
       der var booket to gange.

       Kendingen er dato + telefon, de samme to felter som
       udlejningernes egen dubletnøgle. */
    var lukkede = udlejninger.filter(function (u) { return u.status !== 'afvist'; });

    (Admin.lister.forespoergsler || []).forEach(function (f) {
      if (f.type !== 'baglokale') return;
      var blevBooket = f.dato && lukkede.some(function (u) {
        return u.dato === f.dato && String(u.telefon) === String(f.telefon);
      });
      if (blevBooket) return;
      ud.push({
        slags: 'forespoergsel',
        id: f.id,
        raa: f,
        dato: f.dato || null,
        navn: f.navn,
        antal: f.antal_personer,
        oprettet: f.oprettet,
        stand: f.status === 'aftalt' ? 'i-hus'
          : (f.status === 'afvist' ? 'faerdig' : 'venter'),
        lukker: f.status === 'aftalt',
        /* Et "aftalt" uden en udlejning bag sig er netop det, der
           IKKE er låst — dubletfilteret ovenfor har allerede
           fjernet dem, der har en. */
        laast: false,
        trin: f.status === 'aftalt' ? 3
          : (f.status === 'kontaktet' ? 2 : (f.status === 'afvist' ? 0 : 1)),
      });
    });

    return ud;
  }

  /* Det, der er overstået, er heller ikke arbejde — uanset hvad
     der står i status. En lørdag i marts kan ingen nå at svare
     på i august. */
  function faerdig(s) {
    if (s.stand === 'faerdig') return true;
    return !!(s.dato && s.dato < Butik.nu().dato);
  }

  // ----------------------------------------------------------
  //  TID
  // ----------------------------------------------------------
  function dagsTal(iso) {
    return Math.floor(Date.parse(String(iso).slice(0, 10) + 'T12:00:00Z') / 86400000);
  }

  /* Dage fra i dag til sagens dato. Negativ = overstået, null =
     ingen dato oplyst. */
  function dageTil(dato) {
    if (!dato) return null;
    return dagsTal(dato) - dagsTal(Butik.nu().dato);
  }

  /* Hvor længe har de ventet? Regnes på DATOEN og ikke på
     klokkeslættet: "ventet 0 dage" om en, der skrev i morges, er
     rigtigere end "ventet 1 dag", fordi der er gået 14 timer. */
  function ventetDage(s) {
    if (!s.oprettet) return 0;
    var d = dagsTal(Butik.nu().dato) - dagsTal(String(s.oprettet).slice(0, 10));
    return d > 0 ? d : 0;
  }

  function svarfrist() {
    var i = (Admin.data && Admin.data.indstillinger) || {};
    var n = Number(i.lokale_svarfrist_dage);
    return isFinite(n) && n > 0 ? n : FRIST_STANDARD;
  }

  function pladser() {
    var i = (Admin.data && Admin.data.indstillinger) || {};
    var n = Number(i.lokale_pladser);
    return isFinite(n) && n > 0 ? n : null;
  }

  // ----------------------------------------------------------
  //  HASTET FØRST
  // ----------------------------------------------------------
  /* ⚠️ "ÆLDST FØRST" VAR IKKE GODT NOK.

     Køen var sorteret efter hvornår folk skrev, og det lyder
     retfærdigt. Men en forespørgsel om en fest på LØRDAG er noget
     andet end en om en fest til maj, også selv om maj-manden
     skrev først: den ene skal have et svar i dag, den anden kan
     vente til på tirsdag.

     Lavest tal øverst. Tallene er trin, ikke point — de siger
     hvilken SLAGS hast, og inden for hver slags sorteres på dato.

     ⚠️ 5 ER MED VILJE HØJT OPPE. En sag, personalet har sagt ja
     til uden at låse dagen, er en dobbeltbooking på vej: en gæst
     på hjemmesiden kan stadig tage dagen, og det tager to klik at
     lukke hullet. Det er hastigere end en forespørgsel, der har
     ligget en dag. */
  function haster(s) {
    if (faerdig(s)) return 90;
    if (s.stand === 'venter') {
      var d = dageTil(s.dato);
      if (d !== null && d <= 7) return 0;      // festen er i denne uge
      if (ventetDage(s) >= svarfrist()) return 10;
      return 20;
    }
    if (!s.laast) return 5;                    // aftalt, men dagen er ikke låst
    return 50;                                 // i hus, og dagen er låst
  }

  function sorter(a, b) {
    var h = haster(a) - haster(b);
    if (h) return h;
    /* Inden for samme hast: nærmeste dato først, og dem uden dato
       sidst. En forespørgsel uden dato kan ingen sige ja til
       endnu — den skal besvares, ikke bookes. */
    if (!a.dato !== !b.dato) return a.dato ? -1 : 1;
    if (a.dato && b.dato && a.dato !== b.dato) return a.dato < b.dato ? -1 : 1;
    return a.oprettet < b.oprettet ? -1 : 1;
  }

  // ----------------------------------------------------------
  //  DE ANDRE PÅ DAGEN
  // ----------------------------------------------------------
  /* ⚠️ HVEM ELLERS VIL HAVE DEN DAG?

     Advarslen fandtes før, men kun når dagen ALLEREDE var lejet
     ud. To ønsker om den samme lørdag, begge nye, stod som to
     kort uden et ord om hinanden — og den, der svarede på det
     øverste, anede ikke, at det andet fandtes.

     Det er den dyre af de to: et ja til den ene er et nej til den
     anden, og det nej skal gives af et menneske, ikke opdages af
     en fejl fra databasen bagefter. */
  function ogsaaPaaDagen(s, sager) {
    if (!s.dato) return [];
    return sager.filter(function (x) {
      return (x.slags !== s.slags || String(x.id) !== String(s.id))
        && x.dato === s.dato && !faerdig(x);
    });
  }

  /* Hvor mange gæster har cafeen ALLEREDE booket den dag?

     ⚠️ DET ER ET TAL, IKKE EN DOM. Forlægget havde et felt, der
     hed "travl i cafeen", og der findes ikke noget mål for
     travlhed i systemet — vi ved ikke, hvor mange gæster der skal
     til, før en lørdag er hård. Antallet af bordbestilte pladser
     ved vi derimod, og det er den oplysning, der faktisk skal
     bruges: skal der laves mad til 40 i baglokalet OG serveres
     for 30 i cafeen, er det et bemandingsspørgsmål. */
  function cafeenPaa(dato) {
    var n = 0;
    (Admin.lister.borde || []).forEach(function (b) {
      if (b.dato !== dato) return;
      if (b.status === 'afvist' || b.status === 'udeblevet') return;
      n += Number(b.antal_personer) || 0;
    });
    return n;
  }

  /* ⚠️ TO KILDER TIL "DER ER LUKKET", OG BEGGE SKAL MED.

     En lukkedag er en RÆKKE I KALENDEREN (Butik.lukketDen, som
     også dækker en hel vinterlukning), mens dagsreglerne kan
     lukke den ene eller begge veje for en enkelt dag. Er begge
     veje spærret, ER det en lukkedag — også for gæsten.

     Spurgte vi kun dagsreglerne, ville en almindelig lukkedag
     stå som en åben dag her, og advarslen "cafeen er lukket, og
     nogen har lokalet" ville aldrig komme. */
  function lukketDag(dato) {
    var d = Admin.data || {};
    if (Butik.lukketDen && Butik.lukketDen(d, dato)) return true;
    return !!(Butik.dagenHeltLukket && Butik.dagenHeltLukket(d, dato));
  }

  // ----------------------------------------------------------
  //  KORTET ØVERST: DET, DER GÅR GALT AF SIG SELV
  // ----------------------------------------------------------
  /* Hver linje er et FAKTUM, regnet ud af data vi har, plus en
     vej hen til arbejdet. Der er ingen linjer, man kan kvittere
     for: en påmindelse, der kan slås fra, bliver slået fra af
     den, der har travlt — og så står den på gjort, mens hullet er
     der endnu. De forsvinder kun ved, at arbejdet bliver gjort. */
  function obsLinjer(sager) {
    var ud = [];
    var frist = svarfrist();
    var maks = pladser();

    // 1. Nogen venter stadig.
    var ventet = sager.filter(function (s) {
      return s.stand === 'venter' && !faerdig(s) && ventetDage(s) >= frist;
    }).sort(function (a, b) { return ventetDage(b) - ventetDage(a); });
    if (ventet.length) {
      ud.push({
        haster: true,
        titel: ventet.length === 1
          ? ventet[0].navn + ' har ventet i ' + ventetDage(ventet[0]) + ' dage'
          : ventet.length + ' venter stadig på svar',
        tekst: 'Gæsten har fået at vide, at I ringer. Et ønske, der ligger'
          + ' urørt, er et selskab, der bliver holdt et andet sted.',
        knap: ['Vis dem', function () { saetFilter('venter'); }],
      });
    }

    // 2. Sagt ja, men dagen er ikke låst.
    var loese = sager.filter(function (s) {
      return s.stand === 'i-hus' && !s.laast && !faerdig(s);
    });
    if (loese.length) {
      ud.push({
        haster: true,
        titel: loese.length === 1
          ? 'Dagen med ' + loese[0].navn + ' er ikke låst'
          : loese.length + ' aftaler er ikke låst',
        tekst: 'I har sagt ja, men der står ingen udlejning bag. Databasen'
          + ' spærrer først dagen, når den gør — indtil da kan en gæst'
          + ' på hjemmesiden tage den.',
        knap: ['Vis dem', function () { saetFilter('aftalt'); }],
      });
    }

    // 3. To om den samme dag.
    var dage = {};
    sager.forEach(function (s) {
      if (!s.dato || faerdig(s)) return;
      (dage[s.dato] = dage[s.dato] || []).push(s);
    });
    Object.keys(dage).sort().forEach(function (d) {
      if (dage[d].length < 2) return;
      ud.push({
        haster: true,
        titel: dage[d].length + ' vil have ' + Admin.pænDato(d).toLowerCase(),
        tekst: dage[d].map(function (s) { return s.navn; }).join(' og ')
          + '. Der kan kun være ét ja — og nej\'et skal gives af et menneske,'
          + ' ikke opdages af en fejl fra databasen.',
        knap: ['Åbn dagen', function () { vælgDag(d); }],
      });
    });

    // 4. Flere end lokalet kan rumme.
    if (maks) {
      sager.filter(function (s) {
        return !faerdig(s) && Number(s.antal) > maks;
      }).forEach(function (s) {
        ud.push({
          haster: true,
          titel: s.navn + ' er ' + s.antal + ' personer',
          tekst: 'Der er plads til ' + maks + ' siddende i lokalet. Enten'
            + ' skal de sidde et andet sted, eller også skal tallet i'
            + ' Vilkår rettes.',
          knap: ['Vis sagen', function () { vælgDag(s.dato); }],
        });
      });
    }

    // 5. Lejet ud på en dag, hvor cafeen er lukket.
    sager.filter(function (s) {
      return s.stand === 'i-hus' && !faerdig(s) && s.dato && lukketDag(s.dato);
    }).forEach(function (s) {
      ud.push({
        haster: true,
        titel: 'Cafeen er lukket ' + Admin.pænDato(s.dato).toLowerCase(),
        tekst: s.navn + ' har lokalet den dag. Enten skal nogen møde ind,'
          + ' eller også er lukkedagen sat forkert.',
        knap: ['Åbn dagen i kalenderen', function () { Admin.aabnDag(s.dato); }],
      });
    });

    // 6. Det, der sker i den kommende uge.
    var snart = sager.filter(function (s) {
      if (s.stand !== 'i-hus' || faerdig(s)) return false;
      var d = dageTil(s.dato);
      return d !== null && d >= 0 && d <= 7;
    }).sort(function (a, b) { return a.dato < b.dato ? -1 : 1; });
    snart.forEach(function (s) {
      var d = dageTil(s.dato);
      ud.push({
        titel: s.navn + (d === 0 ? ' har lokalet I DAG'
          : (d === 1 ? ' har lokalet i morgen'
            : ' har lokalet om ' + d + ' dage')),
        tekst: (s.antal ? s.antal + ' personer · ' : '')
          + Admin.pænDato(s.dato)
          + (cafeenPaa(s.dato) ? ' · ' + cafeenPaa(s.dato)
            + ' gæster booket i cafeen samme dag' : ''),
        knap: ['Åbn dagen i kalenderen', function () { Admin.aabnDag(s.dato); }],
      });
    });

    return ud;
  }

  function tegnObs(sager) {
    var boks = $('lokale-obs');
    var kort = $('lokale-obs-kort');
    if (!boks || !kort) return;

    var linjer = obsLinjer(sager);
    kort.classList.toggle('skjult', !linjer.length);
    if (!linjer.length) { Admin.tøm(boks); return; }

    Admin.tegnRaekker(boks, linjer.map(function (l, i) {
      return {
        noegle: 'obs-' + i,
        aftryk: l.titel + '|' + l.tekst,
        byg: function () {
          var r = lav('div', 'obs-linje' + (l.haster ? ' obs-haster' : ''));
          var t = lav('div', 'obs-tekst');
          t.appendChild(lav('strong', null, (l.haster ? '⚠️ ' : '🕒 ') + l.titel));
          t.appendChild(lav('span', 'vare-tekst', l.tekst));
          r.appendChild(t);
          var k = lav('button', 'knap sekundaer lille', l.knap[0]);
          k.type = 'button';
          k.addEventListener('click', l.knap[1]);
          r.appendChild(k);
          return r;
        },
      };
    }));
  }

  // ----------------------------------------------------------
  //  TALLENE
  // ----------------------------------------------------------
  var MDR_KORT = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  function kortDato(iso) {
    var d = String(iso).split('-');
    if (d.length !== 3) return String(iso);
    return Number(d[2]) + '. ' + MDR_KORT[Number(d[1]) - 1];
  }

  function tegnTal(sager) {
    var boks = $('lokale-tal');
    if (!boks) return;
    Admin.tøm(boks);

    var venter = sager.filter(function (s) {
      return s.stand === 'venter' && !faerdig(s);
    });
    var iHus = sager.filter(function (s) {
      return s.stand === 'i-hus' && !faerdig(s);
    }).sort(function (a, b) { return (a.dato || '') < (b.dato || '') ? -1 : 1; });

    var naeste = iHus[0];

    [
      ['Venter på svar', venter.length,
        venter.length ? 'nogen sidder og venter' : 'ingenting i kø'],
      ['Lejet ud fremover', iHus.length, 'dage der er væk'],
      /* ⚠️ KORT DATO I FELTET, HELE DATOEN UNDER.
         Admin.pænDato giver "Lørdag 5. september" — 22 tegn i den
         store serif, som brækker over to linjer og skubber de to
         nabofelter skævt. Tallet er "hvornår", navnet er "hvem",
         og ugedagen hører til på kortet længere nede. */
      ['Næste udlejning', naeste ? kortDato(naeste.dato) : '—',
        naeste ? naeste.navn : 'ingen aftaler'],
    ].forEach(function (t) {
      var f = lav('div', 'tal-felt');
      f.appendChild(lav('div', 'tal-navn', t[0]));
      f.appendChild(lav('div', 'tal-tal', String(t[1])));
      f.appendChild(lav('div', 'tal-note', t[2]));
      boks.appendChild(f);
    });
  }

  // ----------------------------------------------------------
  //  FORLØBET
  // ----------------------------------------------------------
  /* Fire trin, fire tal, fire knapper. Tallene er ikke pynt: et
     tryk sætter filteret på listen nedenfor, så trinet også er
     vejen hen til arbejdet.

     Trinene er de to tabellers egne status-ord oversat ÉT sted
     (feltet "trin" i alleSager), og de er med vilje ikke fire
     lister: en sag hører til ét sted ad gangen. */
  var TRIN = [
    { nr: 1, navn: 'Ny', note: 'ingen har rørt den', filter: 'ny' },
    { nr: 2, navn: 'Ringet på', note: 'vi har talt med dem', filter: 'ringet' },
    { nr: 3, navn: 'Aftalt', note: 'men dagen er ikke låst', filter: 'aftalt' },
    { nr: 4, navn: 'Lejet ud', note: 'dagen er låst', filter: 'lejet' },
  ];

  function tegnForloeb(sager) {
    var boks = $('lokale-forloeb');
    if (!boks) return;
    Admin.tøm(boks);

    var aabne = sager.filter(function (s) { return !faerdig(s); });

    TRIN.forEach(function (t) {
      var n = aabne.filter(function (s) { return s.trin === t.nr; }).length;
      var k = lav('button', 'trinkort trin-' + t.nr
        + (n ? '' : ' trinkort-tom')
        + (filter === t.filter ? ' valgt' : ''));
      k.type = 'button';
      k.setAttribute('data-trin', String(t.nr));
      k.setAttribute('aria-pressed', filter === t.filter ? 'true' : 'false');
      k.appendChild(lav('span', 'trinkort-nr', String(t.nr)));
      k.appendChild(lav('span', 'trinkort-tal', String(n)));
      k.appendChild(lav('span', 'trinkort-navn', t.navn));
      k.appendChild(lav('span', 'trinkort-note',
        t.nr === 3 && n ? '⚠️ ' + t.note : t.note));
      if (t.nr === 3 && n) k.className += ' trinkort-advar';
      k.addEventListener('click', function () {
        saetFilter(filter === t.filter ? 'alle' : t.filter);
      });
      boks.appendChild(k);
    });
  }

  // ----------------------------------------------------------
  //  MÅNEDSNETTET
  // ----------------------------------------------------------
  /* ⚠️ EN LISTE OVER DATOER ER IKKE EN KALENDER.

     Fanen havde tre løse linjer — "Lørdag 22. august · 2 ønsker
     venter" — og de kunne kun svare på de dage, nogen HAVDE
     spurgt om. Spørgsmålet ved telefonen er det modsatte: "har I
     lokalet den 12.?" Det svar krævede, at man læste tre linjer
     og selv regnede ud, at den 12. ikke stod der.

     Nettet svarer på et blik, og de tomme felter er halvdelen af
     svaret. */
  function iso(aar, mdr, dag) {
    return aar + '-' + String(mdr + 1).padStart(2, '0')
      + '-' + String(dag).padStart(2, '0');
  }

  function saetMaaned() {
    if (visAar !== null) return;
    var nu = Butik.nu().dato.split('-');
    visAar = Number(nu[0]);
    visMdr = Number(nu[1]) - 1;
  }

  /* Tegnforklaringen bygges af den SAMME liste, nettet farver
     efter. To lister over de samme fire tilstande ville skride
     fra hinanden, og en forklaring, der lyver, er værre end
     ingen. */
  var TEGN = [
    { klasse: 'laast', tegn: '🔑', navn: 'Lejet ud',
      note: 'dagen er låst i databasen' },
    { klasse: 'aftalt', tegn: '🤝', navn: 'Aftalt',
      note: 'sagt ja — men ikke låst endnu' },
    { klasse: 'venter', tegn: '⏳', navn: 'Venter svar',
      note: 'nogen har spurgt' },
    { klasse: 'cafe', tegn: '🍽️', navn: 'Gæster i cafeen',
      note: 'bordbestilte pladser samme dag' },
    { klasse: 'lukket', tegn: '🚫', navn: 'Cafeen er lukket',
      note: 'fra kalenderen' },
  ];

  function tegnForklaring() {
    var boks = $('lokale-tegn');
    if (!boks) return;
    Admin.tøm(boks);
    TEGN.forEach(function (t) {
      var e = lav('span', 'tegn tegn-' + t.klasse);
      e.appendChild(lav('span', 'tegn-tegn', t.tegn));
      e.appendChild(lav('strong', null, t.navn));
      e.appendChild(lav('span', 'tegn-note', t.note));
      boks.appendChild(e);
    });
  }

  function tegnNet(sager) {
    var net = $('lokale-net');
    if (!net) return;
    saetMaaned();
    Admin.tøm(net);

    var navn = $('lokale-maaned');
    if (navn) {
      navn.textContent = MDR[visMdr].charAt(0).toUpperCase()
        + MDR[visMdr].slice(1) + ' ' + visAar;
    }

    UGEDAGE.forEach(function (d) {
      net.appendChild(lav('div', 'maaned-ugedag', d));
    });

    var foerste = new Date(Date.UTC(visAar, visMdr, 1));
    /* Mandag først. getUTCDay() giver 0 for søndag, og en uge,
       der begynder om søndagen, er ikke den, personalet kigger
       på i en dansk kalender. */
    var spring = (foerste.getUTCDay() + 6) % 7;
    for (var t = 0; t < spring; t++) net.appendChild(lav('div', 'maaned-tom'));

    var dage = new Date(Date.UTC(visAar, visMdr + 1, 0)).getUTCDate();
    var iDag = Butik.nu().dato;

    for (var n = 1; n <= dage; n++) {
      var dato = iso(visAar, visMdr, n);
      var paaDagen = sager.filter(function (s) { return s.dato === dato; });
      var lejet = paaDagen.filter(function (s) { return s.lukker; })[0];
      var venter = paaDagen.filter(function (s) {
        return s.stand === 'venter' && !faerdig(s);
      }).length;
      var cafe = cafeenPaa(dato);
      var lukket = lukketDag(dato);

      var felt = lav('button', 'maaned-dag');
      felt.type = 'button';
      /* ⚠️ IKKE data-dag. Kalenderfanen har sit eget månedsnet med
         den samme klasse OG det navn, og js/admin/kalender.js slår
         op i HELE dokumentet:
           querySelector('.maaned-dag[data-dag="…"]')
         Med to net matcher den, hvad der nu kommer først i siden —
         og den dag panelernes rækkefølge blev lavet om, ville
         "tryk på en note for at åbne dagen" rulle ned til
         baglokalet i stedet. Ingen fejl, bare en forkert dag.

         Målt: 31 prøver på kalenderfanen faldt på "strict mode
         violation", da nettet her fik data-dag. Fejlen var
         prøvernes at fange, men den var kodens. */
      felt.setAttribute('data-lokale-dag', dato);
      if (dato === iDag) felt.className += ' er-idag';
      if (dato === valgtDag) felt.className += ' valgt';
      if (lejet) felt.className += lejet.laast ? ' er-lukket' : ' er-halv';

      felt.appendChild(lav('span', 'maaned-nr', String(n)));

      if (lejet && lejet.laast) {
        felt.appendChild(lav('span', 'maaned-stand lukket', '🔑 ' + lejet.navn));
      } else if (lejet) {
        /* ⚠️ ANDET TEGN, FORDI DET ER EN ANDEN TILSTAND. Dagen er
           lovet væk, men databasen holder den ikke — se noten
           øverst i filen. Stod den som "lejet ud", ville hullet
           være usynligt præcis dér, hvor man kigger efter det. */
        felt.appendChild(lav('span', 'maaned-stand halv', '🤝 ' + lejet.navn));
      } else if (venter) {
        felt.appendChild(lav('span', 'maaned-stand halv', '⏳ ' + venter + ' venter'));
      }

      if (lukket) felt.appendChild(lav('span', 'maaned-stand tider', '🚫 lukket'));
      else if (cafe) {
        felt.appendChild(lav('span', 'maaned-stand tider', '🍽️ ' + cafe));
      }

      /* Skærmlæseren får hele sætningen. Et tal og et nøgletegn
         er et billede, ikke en oplysning. */
      felt.setAttribute('aria-label', Admin.pænDato(dato) + ': '
        + (lejet ? (lejet.laast ? 'lejet ud til ' : 'aftalt med ') + lejet.navn
          : (venter ? venter + ' venter på svar' : 'ledigt'))
        + (cafe ? ', ' + cafe + ' gæster booket i cafeen' : '')
        + (lukket ? ', cafeen er lukket' : ''));

      felt.addEventListener('click', (function (d) {
        return function () { vælgDag(valgtDag === d ? null : d); };
      })(dato));

      net.appendChild(felt);
    }
  }

  function skift(n) {
    saetMaaned();
    visMdr += n;
    while (visMdr < 0) { visMdr += 12; visAar -= 1; }
    while (visMdr > 11) { visMdr -= 12; visAar += 1; }
    tegnAlt();
  }

  /* Vælger man en dag, må filteret ikke kunne skjule den. Det er
     sket: man trykkede på en dag med to ønsker, mens filteret stod
     på "Lejet ud", og listen sagde "ingen på den dag". */
  function vælgDag(d) {
    valgtDag = d;
    if (d) filter = 'alle';
    tegnAlt();
  }

  function saetFilter(f) {
    filter = f;
    tegnAlt();
  }

  // ----------------------------------------------------------
  //  FILTRENE
  // ----------------------------------------------------------
  /* ⚠️ "ALLE" VISER IKKE DE FÆRDIGE.

     Det færdige er ikke arbejde, og en liste, hvor sommerens
     afviste ønsker ligger mellem næste lørdags fest, er en liste,
     man holder op med at læse. De har deres egen chip, og de
     forsvinder ikke: trykker nogen forkert, skal rækken kunne
     findes igen. */
  var FILTRE = [
    { id: 'alle', navn: 'Alle', tael: function (s) { return !faerdig(s); } },
    { id: 'venter', navn: 'Venter på svar',
      tael: function (s) { return s.stand === 'venter' && !faerdig(s); } },
    { id: 'ny', navn: 'Nye', tael: function (s) { return !faerdig(s) && s.trin === 1; } },
    { id: 'ringet', navn: 'Ringet på',
      tael: function (s) { return !faerdig(s) && s.trin === 2; } },
    { id: 'aftalt', navn: 'Aftalt, ikke låst',
      tael: function (s) { return !faerdig(s) && s.trin === 3; } },
    { id: 'lejet', navn: 'Lejet ud',
      tael: function (s) { return !faerdig(s) && s.trin === 4; } },
    { id: 'faerdige', navn: 'Færdige', tael: faerdig },
  ];

  function udvalg(sager) {
    var f = FILTRE.filter(function (x) { return x.id === filter; })[0] || FILTRE[0];
    var ud = sager.filter(f.tael);
    if (valgtDag) ud = ud.filter(function (s) { return s.dato === valgtDag; });
    return ud.sort(sorter);
  }

  function tegnFiltre(sager) {
    var boks = $('lokale-filtre');
    if (!boks) return;
    Admin.tøm(boks);

    FILTRE.forEach(function (f) {
      var n = sager.filter(f.tael).length;
      /* Tomme chips står der stadig — undtagen Færdige, som er
         arkivet og ikke en tilstand. Forsvandt "Venter på svar",
         fordi køen var tom, ville rækken hoppe rundt, hver gang
         der kom en ind. */
      if (!n && f.id === 'faerdige' && filter !== 'faerdige') return;
      var k = lav('button', 'sag-chip' + (filter === f.id ? ' valgt' : ''));
      k.type = 'button';
      k.setAttribute('data-filter', f.id);
      k.setAttribute('aria-pressed', filter === f.id ? 'true' : 'false');
      k.appendChild(document.createTextNode(f.navn + ' '));
      k.appendChild(lav('span', 'sag-chip-tal', String(n)));
      k.addEventListener('click', function () { saetFilter(f.id); });
      boks.appendChild(k);
    });

    if (valgtDag) {
      var d = lav('button', 'sag-chip valgt dag-chip');
      d.type = 'button';
      d.setAttribute('data-filter', 'dag');
      d.textContent = 'Kun ' + Admin.pænDato(valgtDag).toLowerCase() + ' ✕';
      d.addEventListener('click', function () { vælgDag(null); });
      boks.appendChild(d);
    }
  }

  // ----------------------------------------------------------
  //  LISTEN
  // ----------------------------------------------------------
  function tegnSager(sager) {
    var boks = $('lokale-sager');
    if (!boks) return;

    var vist = udvalg(sager);

    if (!vist.length) {
      Admin.tegnRaekker(boks, [{
        noegle: 'tom', aftryk: 'tom-' + filter + '-' + (valgtDag || ''),
        byg: function () {
          return lav('p', 'vare-tekst', valgtDag
            ? 'Ingenting ' + Admin.pænDato(valgtDag).toLowerCase() + '.'
            : (filter === 'alle'
              ? 'Ingen sager på lokalet lige nu.'
              : 'Ingen sager i den gruppe.'));
        },
      }]);
      return;
    }

    Admin.tegnRaekker(boks, vist.map(function (s) {
      var andre = ogsaaPaaDagen(s, sager);
      return {
        noegle: s.slags + '-' + s.id,
        /* Naboerne skal med i aftrykket: ændrer et NABOKORT sig,
           skal advarslen her følge med. Uden det blev "dagen er
           også ønsket af Mads" stående, efter Mads var afvist.

           Og pladserne skal med: rettes tallet i Vilkår, skal
           "flere end lokalet kan rumme" komme og gå med det. */
        aftryk: JSON.stringify([s.raa, pladser(), andre.map(function (x) {
          return [x.slags, x.id, x.stand, x.navn, x.laast];
        })]),
        byg: function () { return sagKort(s, andre); },
      };
    }));
  }

  function tegnAlt() {
    var sager = alleSager();

    tegnObs(sager);
    tegnTal(sager);
    tegnForloeb(sager);
    tegnForklaring();
    tegnNet(sager);
    tegnFiltre(sager);
    tegnSager(sager);

    var nye = sager.filter(function (s) {
      return s.stand === 'venter' && !faerdig(s);
    }).length;
    var maerke = $('lokale-antal-maerke');
    if (maerke) {
      if (nye) { maerke.textContent = nye; maerke.classList.remove('skjult'); }
      else maerke.classList.add('skjult');
    }
  }

  // ----------------------------------------------------------
  //  KORTENE
  // ----------------------------------------------------------
  /* En forespørgsel tegnes af Forespørgsler-fanens egen
     kortbygger. To byggere for den samme række ville komme til at
     vise to forskellige ting — se noten ved Admin.forespoergselKort.

     Fanens EGET lag lægges uden om begge slags af sagLag(): den
     ventede tid, advarslerne og den ene linje om, hvad der skal
     ske nu. Det er de oplysninger, der gælder LOKALET og ikke
     rækken, og de skal se ens ud, uanset hvilken formular gæsten
     brugte. */
  function sagKort(s, andre) {
    var k;
    if (s.slags === 'forespoergsel') {
      k = Admin.forespoergselKort
        ? Admin.forespoergselKort(s.raa, 'Forespørgsel')
        : lav('p', 'fejl', 'Forespørgslen kan ikke vises.');
      bookKnap(k, s);
    } else {
      k = udlejningKort(s.raa);
    }
    sagLag(k, s, andre);
    return k;
  }

  /* ---- FANENS EGET LAG ---- */
  function sagLag(kort, s, andre) {
    if (!kort || !kort.querySelector) return;
    kort.setAttribute('data-sag', s.slags + '-' + s.id);

    /* Ventetiden i toppen, ved siden af status. "Ny" siger ikke,
       om den kom for en time eller fire dage siden — og det er
       den eneste oplysning, der afgør, om man skal ringe NU. */
    var top = kort.querySelector('.bestil-top');
    if (top && s.stand === 'venter' && !faerdig(s)) {
      var d = ventetDage(s);
      var sen = d >= svarfrist();
      var v = lav('span', 'ventet' + (sen ? ' ventet-sen' : ''),
        d === 0 ? 'kom i dag' : (d === 1 ? 'ventet 1 dag' : 'ventet ' + d + ' dage'));
      top.insertBefore(v, top.querySelector('.bestil-ref') || null);
    }

    /* ⚠️ INGEN ⚠️ FORAN EN .fejl. Klassen har sit eget
       ::before { content: "⚠ " } i css/style.css, og en linje,
       der selv skriver tegnet, kommer på skærmen som "⚠ ⚠️ Dagen
       er ikke låst". Det så ud som en fejl i systemet, ikke som
       en advarsel om noget. Fundet med øjnene på et skud —
       ingen prøve læser et tegn foran en sætning. */
    var advarsler = lav('div', 'sag-varsler');

    if (andre && andre.length) advarsler.appendChild(nabovarsel(s, andre));

    var maks = pladser();
    if (maks && Number(s.antal) > maks && !faerdig(s)) {
      advarsler.appendChild(lav('p', 'fejl',
        s.antal + ' personer — der er plads til ' + maks
        + ' siddende i lokalet.'));
    }

    if (s.stand === 'i-hus' && !s.laast && !faerdig(s)) {
      advarsler.appendChild(lav('p', 'fejl',
        'Dagen er ikke låst. I har sagt ja, men der står ingen udlejning'
        + ' bag — en gæst på hjemmesiden kan stadig tage den.'));
    }

    if (s.dato && lukketDag(s.dato) && s.stand !== 'faerdig') {
      advarsler.appendChild(lav('p', 'fejl',
        'Cafeen er lukket den dag ifølge kalenderen.'));
    }

    var cafe = s.dato ? cafeenPaa(s.dato) : 0;
    if (cafe && !faerdig(s)) {
      advarsler.appendChild(lav('p', 'hjaelp',
        '🍽️ ' + cafe + ' gæster er også booket i cafeen samme dag.'));
    }

    if (advarsler.childNodes.length) {
      var efter = kort.querySelector('.trin-stribe') || kort.querySelector('.bestil-top');
      if (efter && efter.nextSibling) kort.insertBefore(advarsler, efter.nextSibling);
      else kort.appendChild(advarsler);
    }

    /* ⚠️ ÉN LINJE OM, HVAD DER SKAL SKE NU — OG KUN ÉN.
       Kortet har allerede status, trin, dato, antal og knapper.
       Det, der mangler, er sætningen mellem dem: hvad gør JEG med
       den her? To linjer ville være to meninger om det samme, og
       så læses ingen af dem. */
    var skridt = naesteSkridt(s);
    if (skridt) {
      /* ⚠️ ':scope >' — KUN ET DIREKTE BARN. querySelector leder i
         HELE undertræet, og kortet er forespørgselskortets (se
         forespoergselKort i js/admin/forespoergsler.js, som den
         her fane genbruger). Da kalenderfelterne 29/8 fik deres
         egen .knap-raekke INDE i advarslen, fandt linjen her den
         først — og insertBefore kastede, fordi den ikke er barn
         af kortet.

         Værre: alle tegnere kører i den SAMME løkke
         (Admin.tegnere), så fejlen tog Forespørgsler og Borde med
         sig ned — to faner stod tomme med en fejl, der pegede et
         helt tredje sted hen. Præcis mønstret i CLAUDE.md: én
         fejlende del må ikke vælte resten. Fundet ved at måle en
         JS-fejl, ikke ved at læse. */
      var raekke = kort.querySelector(':scope > .knap-raekke');
      var p = lav('p', 'naeste-skridt', '👉 ' + skridt);
      if (raekke) kort.insertBefore(p, raekke);
      else kort.appendChild(p);
    }
  }

  function naesteSkridt(s) {
    if (faerdig(s)) return null;
    if (s.stand === 'venter') {
      if (!s.dato) return 'Ring og få en dato — der er ikke noget at booke endnu.';
      var d = dageTil(s.dato);
      if (d !== null && d < 0) return 'Dagen er overstået. Luk sagen.';
      return 'Ring til dem, og book lokalet, hvis I siger ja.'
        + (d !== null && d <= 7 ? ' Det er om ' + (d === 0 ? 'i dag'
          : (d === 1 ? 'en dag' : d + ' dage')) + '.' : '');
    }
    if (s.stand === 'i-hus' && !s.laast) {
      return 'Lås dagen — så kan hjemmesiden ikke give den væk.';
    }
    if (s.stand === 'i-hus') {
      return 'Skriv den i kalenderen, hvis den ikke står der.';
    }
    return null;
  }

  /* ---- FRA SPØRGSMÅL TIL BOOKING ----

     Kundens ord (27/8): folk lægger forespørgsler på hjemmesiden,
     personalet ringer, og så skal de "acceptere datoen eller
     manuelt skrive den ind".

     Knappen her er det første. Uden den var vejen: læs
     forespørgslen, åbn telefonbooking-folden, tast navn, nummer,
     dato og antal af igen, og husk så at lukke forespørgslen
     bagefter. Fire felter tastet af fra en skærm, hvor de allerede
     står, er fire steder at ramme forkert — og den, der bliver
     glemt, er den sidste: forespørgslen bliver stående som "ny",
     og næste medarbejder ringer til den samme gæst.

     ⚠️ DEN OPRETTER EN RIGTIG UDLEJNING og lukker forespørgslen
     bagefter. Begge dele skal ske: udlejningen er den, databasens
     eget indeks tæller, når nummer to vil have dagen. En
     forespørgsel sat til "aftalt" spærrer dagen i visningen
     optagne_dage, men den giver ikke det hårde værn.

     ⚠️ OG DEN KRÆVER EN DATO. En forespørgsel må gerne være uden
     ("engang til foråret"), og der er ikke noget at booke endnu.
     Så står knappen der ikke — en knap, der siger nej, når man
     trykker, er værre end ingen knap.

     ⚠️ DEN STÅR OGSÅ PÅ DE "AFTALTE". Det var den halvdel, der
     manglede: en forespørgsel, personalet havde sagt ja til, havde
     ingen vej videre, og dagen stod ulåst uden en knap til at
     lukke den. Dér hedder knappen "Lås dagen". */
  function bookKnap(kort, s) {
    var laas = s.stand === 'i-hus' && !s.laast;
    if (!laas && s.stand !== 'venter') return;
    if (!s.dato || faerdig(s)) return;
    var raekke = kort.querySelector('.knap-raekke');
    if (!raekke) return;

    var f = s.raa;
    var knap = lav('button', 'knap', laas ? '🔒 Lås dagen' : 'Book lokalet til dem');
    knap.type = 'button';
    knap.addEventListener('click', function () {
      if (!confirm('Book baglokalet til ' + f.navn + ' '
        + Admin.pænDato(f.dato) + '?\n\n'
        + 'Der oprettes en udlejning, dagen lukkes for alle andre, '
        + 'og forespørgslen sættes til aftalt.')) return;
      knap.disabled = true;
      Butik.lejLokale({
        navn: f.navn, telefon: f.telefon, email: f.email || null,
        dato: f.dato, antal_personer: f.antal_personer,
        besked: f.besked || null,
      }).then(function (svar) {
        return hentUdlejninger().then(function () {
          var ny = udlejninger.filter(function (u) {
            return u.reference === svar.reference;
          })[0];
          if (!ny) return null;
          /* Noten siger, hvor bookingen kom fra. Uden den ligner
             den en, gæsten selv har lavet — og så leder nogen
             efter en kvittering, der aldrig er sendt. */
          return Butik.skrive.udlejningStatus(ny.id, 'bekraeftet',
            'Aftalt i telefonen ud fra ' + f.reference + '.');
        });
      }).then(function () {
        /* Og forespørgslen lukkes. Rækkefølgen er med vilje:
           bliver udlejningen afvist af databasen (dagen er taget),
           står forespørgslen stadig åben, og personalet kan ringe
           tilbage. Lukkede vi den først, ville et nej efterlade en
           "aftalt" forespørgsel uden en booking bag sig. */
        return Butik.skrive.forespoergselStatus(f.id, 'aftalt', f.intern_note || null);
      }).then(function () {
        return Admin.friskOp ? Admin.friskOp() : null;
      }).then(function () {
        Admin.kvitter('Lokalet er lejet ud til ' + f.navn + ' '
          + Admin.pænDato(f.dato) + '.');
      }).catch(function (e) {
        Admin.brøl(e.message || String(e));
      }).then(function () {
        knap.disabled = false;
      });
    });
    raekke.insertBefore(knap, raekke.firstChild);
  }

  function nabovarsel(s, andre) {
    var lejet = andre.filter(function (x) { return x.lukker; })[0];
    var p = lav('p', lejet ? 'fejl' : 'hjaelp');
    if (lejet) {
      p.textContent = 'Dagen er allerede ' + (lejet.laast ? 'lejet ud til '
        : 'aftalt med ') + lejet.navn + '. Der kan kun være ét ja pr. dag.';
    } else {
      p.textContent = '⚠️ ' + andre.map(function (x) { return x.navn; }).join(' og ')
        + ' vil også have den dag. Et ja her er et nej til '
        + (andre.length === 1 ? 'dem' : 'de andre') + '.';
    }
    return p;
  }

  function udlejningKort(u) {
    var k = lav('div', 'bestil-kort b-' + u.status);

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'maerke favorit', 'Ønske'));
    top.appendChild(lav('span', 'maerke m-' + u.status,
      STATUS_NAVNE[u.status] || u.status));
    top.appendChild(lav('span', 'bestil-ref', u.reference));
    k.appendChild(top);

    var hvem = lav('div', 'bestil-hvem');
    hvem.appendChild(lav('span', 'vare-navn', u.navn));
    var tlf = lav('a', 'bestil-tlf', u.telefon);
    tlf.href = 'tel:' + String(u.telefon).replace(/[^0-9+]/g, '');
    hvem.appendChild(tlf);
    if (u.email) {
      var mail = lav('a', 'bestil-tlf', u.email);
      mail.href = 'mailto:' + u.email;
      hvem.appendChild(mail);
    }
    k.appendChild(hvem);

    var detaljer = lav('div', 'bestil-linjer');
    var r1 = lav('div', 'bestil-linje');
    r1.appendChild(lav('span', 'bestil-vare', Admin.pænDato(u.dato)));
    r1.appendChild(lav('span', 'bestil-linjepris',
      u.antal_personer ? u.antal_personer + ' personer' : 'Antal ikke oplyst'));
    detaljer.appendChild(r1);
    k.appendChild(detaljer);

    if (u.besked) {
      var m = lav('p', 'bestil-gaestebesked');
      m.appendChild(lav('strong', null, 'Gæsten skriver: '));
      m.appendChild(document.createTextNode(u.besked));
      k.appendChild(m);
    }

    /* ⚠️ NOTEN FOLDES VÆK, NÅR DEN ER TOM.

       MÅLT på fanen som den var: fire kort på skærmen gav fire
       åbne notefelter, tre af dem tomme og med den samme grå
       pladsholdertekst. Feltet fyldte lige så meget som gæstens
       navn, dato og antal tilsammen — og det er ikke arbejde, det
       er et sted at skrive noget, hvis man vil.

       Har noten indhold, står den åben: så ER den en oplysning
       om sagen, og den skal kunne læses uden et tryk. */
    var felt = document.createElement('input');
    felt.type = 'text';
    felt.id = 'lokale-note-' + u.id;
    felt.maxLength = 1000;
    felt.value = u.intern_note || '';
    felt.placeholder = 'Fx: depositum aftalt, de kommer kl. 12';
    felt.addEventListener('change', function () {
      if (felt.value === (u.intern_note || '')) return;
      gemUdlejning(Butik.skrive.udlejningStatus(u.id, u.status, felt.value),
        'Noten er gemt.');
    });

    if (u.intern_note) {
      var note = lav('div', 'felt');
      var etiket = lav('label', null, 'Din note');
      etiket.setAttribute('for', felt.id);
      note.appendChild(etiket);
      note.appendChild(felt);
      k.appendChild(note);
    } else {
      var fold = lav('details', 'note-fold');
      fold.appendChild(lav('summary', null, '📝 Skriv en note'));
      var boks2 = lav('div', 'felt');
      boks2.appendChild(felt);
      fold.appendChild(boks2);
      /* Feltet skal have fokus, når folden åbnes — ellers er der
         to tryk til at skrive ét ord. */
      fold.addEventListener('toggle', function () {
        if (fold.open) felt.focus();
      });
      k.appendChild(fold);
    }

    var raekke = lav('div', 'knap-raekke');

    if (u.status === 'ny') {
      var frem = lav('button', 'knap', 'Lej lokalet ud');
      frem.addEventListener('click', function () {
        if (!confirm('Lej lokalet ud til ' + u.navn + ' '
          + Admin.pænDato(u.dato) + '?\n\n'
          + 'Der kan kun være ét ja pr. dag. Husk at ringe til '
          + u.telefon + ' — gæsten venter på opkaldet.')) return;
        gemUdlejning(Butik.skrive.udlejningStatus(u.id, 'bekraeftet', felt.value),
          'Lokalet er lejet ud ' + Admin.pænDato(u.dato) + '. Ring til ' + u.telefon + '.');
      });
      raekke.appendChild(frem);
    }

    /* Vejen til kalenderen. Selskabet skal stå dér, hvor resten af
       huset kigger — ellers ser lørdagen fri ud for den, der
       åbner Overblik. Knappen OPRETTER ikke selv: vi ved ikke, om
       festen skal stå offentligt på hjemmesiden. */
    if (u.status === 'bekraeftet' && u.dato) {
      var kal = lav('button', 'knap sekundaer', '📅 Åbn dagen i kalenderen');
      kal.type = 'button';
      kal.addEventListener('click', function () { Admin.aabnDag(u.dato); });
      raekke.appendChild(kal);
    }

    if (u.status !== 'afvist') {
      var afvis = lav('button', 'knap fare', 'Afvis');
      afvis.addEventListener('click', function () {
        if (!confirm('Afvis ønsket fra ' + u.navn + '?\n\n'
          + 'Husk at ringe til ' + u.telefon + ' — gæsten har fået at vide, '
          + 'at vi ringer.')) return;
        gemUdlejning(Butik.skrive.udlejningStatus(u.id, 'afvist', felt.value),
          'Ønsket er afvist.');
      });
      raekke.appendChild(afvis);
    }

    /* ⚠️ ET AFVIST ØNSKE KAN FORTRYDES.

       Før kunne et afvist kun slettes. Trykkede nogen forkert
       midt i en frokost, var ønsket væk, og gæsten stod uden et
       svar, ingen kunne finde igen. Samme rettelse som Gendan på
       Overblik — og af samme grund: rækken HAR været set, det var
       derfor, nogen trykkede. */
    if (u.status === 'afvist') {
      var gendan = lav('button', 'knap', 'Gendan');
      gendan.addEventListener('click', function () {
        gemUdlejning(Butik.skrive.udlejningStatus(u.id, 'ny', felt.value),
          'Ønsket er tilbage i køen.');
      });
      raekke.appendChild(gendan);

      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!confirm('Flyt ønsket fra ' + u.navn + ' til skraldespanden?\n\n'
          + 'Det kan hentes tilbage i 30 dage.')) return;
        gemUdlejning(Butik.skrive.tilSkraldespand('udlejning', u.id),
          'Ønsket ligger i skraldespanden.');
      });
      raekke.appendChild(slet);
    }

    k.appendChild(raekke);
    return k;
  }

  // ----------------------------------------------------------
  //  VILKÅRENE
  // ----------------------------------------------------------
  /* ⚠️ TALLENE PÅ HJEMMESIDEN BOR HER NU.

     h-baglokale.html blev leveret med designets pladsholdere — 40
     siddende, 1.200 kr. for en aften, gratis fra 20 kuverter — og
     de har stået i luften siden 23/8, fordi Mikkel bad om det.
     Indtil nu kunne de kun rettes ved at redigere HTML, og det er
     ikke noget, en cafe kan gøre.

     ⚠️ FELTERNE ER TOMME, TIL EJEREN SKRIVER I DEM. Der står ikke
     et foreslået tal nogen steder — heller ikke designets. Et tal,
     vi selv fandt på, ser ud som noget forretningen har sagt, og
     det er den fejl, hele projektet er skrevet for at undgå. Er
     feltet tomt, bliver designets linje stående på siden. */
  var VILKAAR = [
    ['vilk-pladser', 'lokale_pladser', 1, 500],
    ['vilk-staaende', 'lokale_staaende', 1, 500],
    ['vilk-pris-aften', 'lokale_pris_aften', 0, 100000],
    ['vilk-pris-dag', 'lokale_pris_dag', 0, 100000],
    ['vilk-gratis-fra', 'lokale_gratis_fra', 0, 500],
    ['vilk-depositum', 'lokale_depositum', 0, 100000],
    ['vilk-frist', 'lokale_svarfrist_dage', 1, 30],
  ];

  function tegnVilkaar() {
    var i = (Admin.data && Admin.data.indstillinger) || {};
    VILKAAR.forEach(function (v) {
      var f = $(v[0]);
      if (!f) return;
      /* ⚠️ RØR IKKE ET FELT, DER HAR FOKUS. Tegnerne kaldes efter
         hvert gem, og et felt, der bliver skrevet i, ville få sin
         gamle værdi tilbage midt i tastningen. Samme regel som
         køreplanens notefelt. */
      if (document.activeElement === f) return;
      var vaerdi = i[v[1]];
      f.value = (vaerdi === undefined || vaerdi === null) ? '' : vaerdi;
    });
    var t = $('vilk-tekst');
    if (t && document.activeElement !== t) t.value = i.lokale_vilkaar || '';
  }

  function samlVilkaar() {
    var kaeder = [];
    for (var n = 0; n < VILKAAR.length; n++) {
      var v = VILKAAR[n];
      var f = $(v[0]);
      if (!f) continue;
      var raa = String(f.value || '').trim();
      var tal = null;
      if (raa !== '') {
        var x = Number(raa);
        if (!isFinite(x) || x < v[2] || x > v[3]) {
          return f.previousElementSibling && f.previousElementSibling.textContent
            ? '"' + f.previousElementSibling.textContent.trim()
              + '" skal være mellem ' + v[2] + ' og ' + v[3] + '.'
            : 'Tallet skal være mellem ' + v[2] + ' og ' + v[3] + '.';
        }
        tal = Math.round(x);
      }
      kaeder.push([v[1], tal]);
    }
    kaeder.push(['lokale_vilkaar', ($('vilk-tekst')
      ? String($('vilk-tekst').value || '').trim() : '') || null]);

    /* Én ad gangen og i rækkefølge. Skrev vi dem parallelt, kunne
       to af dem ramme den samme række i indstillinger på én gang,
       og den sidste ville vinde uden en fejl. */
    return kaeder.reduce(function (kaede, par) {
      return kaede.then(function () {
        return Butik.skrive.indstilling(par[0], par[1]);
      });
    }, Promise.resolve());
  }

  if ($('gem-vilkaar')) {
    $('gem-vilkaar').addEventListener('click', function () {
      var svar = samlVilkaar();
      if (typeof svar === 'string') { Admin.brøl(svar); return; }
      Admin.gem(svar, 'Vilkårene er gemt. Hjemmesiden følger med.');
    });
    /* Felterne gemmer også sig selv. En travl medarbejder, der
       retter prisen og går, havde ellers rettet ingenting. */
    Admin.autogem($('gem-vilkaar').closest('.kort'), samlVilkaar);
  }

  // ----------------------------------------------------------
  //  HENT
  // ----------------------------------------------------------
  function gemUdlejning(løfte, besked) {
    return løfte
      .then(hentUdlejninger)
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e.message || String(e)); });
  }

  function hentUdlejninger() {
    return Butik.hentUdlejninger().then(function (liste) {
      udlejninger = liste || [];
      Admin.meld('udlejninger', udlejninger);
      tegnAlt();
      Admin.hentet('lokale-hentet');
    }).catch(function (e) {
      var boks = $('lokale-sager');
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Udlejningerne kunne ikke hentes: ' + (e.message || e)
        + ' Skærmen prøver igen af sig selv om et øjeblik — bliver den'
        + ' ved, så log ud og ind igen.'));
      if (window.console) console.warn('udlejninger:', e);
    });
  }

  // ----------------------------------------------------------
  //  TAG EN UDLEJNING I TELEFONEN
  // ----------------------------------------------------------
  /* ⚠️ HALVDELEN AF BOOKINGERNE KOMMER I RØRET.

     Ringer nogen og lejer lokalet, fandtes der ingen vej ind: så
     stod halvdelen af efteråret i systemet og halvdelen på en
     seddel ved lugen, og månedsnettet løj om, hvilke dage der var
     ledige. Det er det værste, et overblik kan gøre.

     ⚠️ DEN BRUGER GÆSTENS EGEN MOTOR. Butik.lejLokale er den
     samme funktion, baglokale/ kalder, og dermed de samme værn —
     heriblandt det, der siger nej, hvis dagen er taget. En anden
     vej ind i den samme tabel ville være to regelsæt, der
     langsomt kommer til at sige noget forskelligt, og ingen ville
     opdage det, før to selskaber stod i det samme lokale. Samme
     beslutning som telefonbookingen på Borde-fanen (24/8). */
  function opretUdlejning() {
    var navn = $('nyl-navn').value.trim();
    var telefon = $('nyl-telefon').value.trim();
    var dato = $('nyl-dato').value;
    var antal = $('nyl-antal').value;

    if (!navn || !telefon || !dato) {
      Admin.brøl('Navn, telefon og dato skal udfyldes.');
      return;
    }

    var knap = $('opret-udlejning');
    knap.disabled = true;

    Butik.lejLokale({
      navn: navn, telefon: telefon, dato: dato,
      antal_personer: antal === '' ? null : antal,
      besked: $('nyl-besked').value.trim() || null,
    }).then(function (svar) {
      return hentUdlejninger().then(function () {
        var ny = udlejninger.filter(function (u) {
          return u.reference === svar.reference;
        })[0];
        if (!ny) return null;
        return Butik.skrive.udlejningStatus(ny.id, 'bekraeftet',
          'Taget i telefonen.').then(hentUdlejninger);
      });
    }).then(function () {
      ['nyl-navn', 'nyl-telefon', 'nyl-dato', 'nyl-antal', 'nyl-besked']
        .forEach(function (id) { $(id).value = ''; });
      Admin.kvitter('Lokalet er lejet ud ' + Admin.pænDato(dato) + '.');
    }).catch(function (e) {
      Admin.brøl(e.message || String(e));
    }).then(function () {
      knap.disabled = false;
    });
  }

  if ($('opret-udlejning')) {
    $('opret-udlejning').addEventListener('click', opretUdlejning);
  }

  if ($('lokale-forrige')) {
    $('lokale-forrige').addEventListener('click', function () { skift(-1); });
    $('lokale-naeste').addEventListener('click', function () { skift(1); });
    $('lokale-idag').addEventListener('click', function () {
      visAar = null;
      valgtDag = null;
      saetMaaned();
      tegnAlt();
    });
  }

  /* Forespørgslerne hentes af deres egen fane og kan komme EFTER
     udlejningerne — så der tegnes igen, når en anden fane melder
     nye data ind. Uden den her linje stod baglokale-forespørgslen
     ikke på fanen, før nogen loggede ud og ind. */
  Admin.efterHent.push(tegnAlt);
  /* Og vilkårene kommer fra indstillingerne, som Butik.hent()
     henter — altså fra Admin.tegnere, ikke fra fanens egen
     hentning. */
  Admin.tegnere.push(function () { tegnVilkaar(); tegnAlt(); });
  Admin.vedLogin.push(hentUdlejninger);
  Admin.friske.push(hentUdlejninger);
})();
