/* Fanen Bestillinger: smørrebrød ud af huset, og reglerne for
   bestilling. Se js/admin/kerne.js for de to principper der
   gælder i alle admin-filerne.

   Bestillingerne hentes for sig og ikke i Admin.genindlæs(). Kun
   chefen må læse dem, så kaldet svarer 401 for alle andre – og en
   fejl der væltede hele genindlæsningen ville tage åbningstider
   og menukort med sig.

   Rækkefølgen på skærmen er HENTETIDEN, ikke hvornår de kom ind.
   Personalet pakker i den rækkefølge poserne skal ud ad lugen. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  /* ⚠️ DET SIDSTE TRIN HEDDER "FÆRDIG" (31/8).

     Kundens ord med to skærmbilleder af fanen: *"der skal stå
     færdig, og når de er kørt skal det tydeligt ses."*

     Ordet hed "Afhentet", og det var præcist — men det var ikke
     det samme ord som den bunke, kortet lander i ("✅ Færdige"),
     og heller ikke det samme som tælleren øverst ("0 færdige").
     Tre ord for den samme tilstand er ét at holde styr på for
     meget, når man står med en frokost.

     ⚠️ DET ER KUN ORDET PÅ SKÆRMEN. Databasens status hedder
     stadig `afhentet` (og `serveret` ved bordene) — de to er
     bundet af check-reglen i setup.sql og af salgstallene, som
     tæller på netop de ord. Skiftede vi VÆRDIEN, ville
     omsætningen holde op med at tælle uden en eneste fejl. */
  /* ⚠️ ORDBOGEN BOR HER, OG ANDRE FANER LÅNER DEN.
     Overblik havde sin egen kopi med "Afhentet"/"Serveret" — så
     i det sekund det her ord blev til "Færdig", ville de to
     skærme sige hver sit om den SAMME bestilling. Den slags
     opdages ikke ved at læse én fil. */
  var STATUS_NAVNE = {
    ny: 'Ny', bekraeftet: 'Bekræftet', klar: 'Klar',
    afhentet: 'Færdig', serveret: 'Færdig',
    afvist: 'Afvist', udeblevet: 'Udeblevet',
  };
  Admin.statusNavn = function (status) {
    return STATUS_NAVNE[status] || status;
  };

  /* KÆDEN: hvad kan en bestilling blive til efter den her.
     Den bruges stadig — men den er ikke længere den knap,
     personalet møder først. Se FAERDIG nedenfor. */
  var NAESTE = {
    ny: ['bekraeftet', 'Bekræft'],
    bekraeftet: ['klar', 'Sæt som klar'],
    klar: ['afhentet', 'Færdig'],
  };

  /* ⚠️ ÉT TRYK, IKKE TRE  (31/8).

     Kundens ord: *"man skal bare trykke færdig, ikke det der
     dobbeltknap-noget, når man afstemmer bestillingerne."*

     Kæden var ny → bekræftet → klar → færdig, og personalet
     skulle altså trykke TRE gange på en bestilling, der bare var
     hentet. Ved lugen, med gæsten stående foran sig, er de to
     mellemtrin arbejde uden modydelse: maden er lavet, den er
     hentet, og det er dét, der skal skrives ned.

     ⚠️ MELLEMTRINNENE ER IKKE FJERNET — de ligger bag "···" på
     kortet. Den, der VIL markere "maden er lavet, den venter",
     kan stadig; det er bare ikke det, man møder først.

     ⚠️ OG DE ÅBNE STATUSSER ER SKREVET UD, ikke udledt af "alt
     der ikke er færdigt". Et nyt ord i databasen (der har været
     tre af dem) ville ellers tavst få en Færdig-knap, uden at
     nogen havde taget stilling til, om det giver mening. */
  var AABNE = ['ny', 'bekraeftet', 'klar'];
  var FAERDIG = ['afhentet', 'Færdig'];

  /* ⚠️ KÆDEN BOR HER, OG KUN HER.

     Overblik har den samme knap på hver række i Dagens forløb —
     kundens ord (26/8): "på overblik skal man trykke færdig på
     online bestillinger?" Man skulle skifte fane, og det er
     forkert midt i en frokost.

     Men kæden må ikke skrives af. To udgaver af "hvad sker der
     efter klar?" ville langsomt komme til at sige noget
     forskelligt, og så ville den samme bestilling have to
     forskellige næste trin, alt efter hvilken fane man stod på.
     Overblik spørger den her funktion. */
  Admin.naesteTrin = function (status) {
    /* Ét tryk fra hvor som helst i kæden — se noten ved FAERDIG.
       Overblik spørger den her funktion, så de to skærme aldrig
       kan komme til at sige hver sit om den samme bestilling. */
    if (AABNE.indexOf(status) === -1) return null;
    return { status: FAERDIG[0], navn: FAERDIG[1],
             efter: STATUS_NAVNE[FAERDIG[0]] };
  };

  /* ⚠️ EN LEVERING ER LOVET ET OPKALD — OG FREM-KNAPPEN SAGDE
     INGENTING OM DET (3/9).

     MÅLT på begge sider: kvitteringen siger ordret *"Vi ringer til
     dig på [nr] og bekræfter, at vi kan køre til adressen"*, fordi
     en levering ALDRIG bekræftes automatisk (23/8 — vi kender
     hverken zone eller pris). Men admins ✓ Færdig, den knap
     personalet trykker ni gange ud af ti, spurgte om ingenting.
     Kun Afvis nævnte opkaldet.

     Altså kunne maden gå ud ad døren mod en adresse, ingen havde
     aftalt — mens gæsten sad hjemme og ventede på et opkald, hun
     var blevet lovet.

     ⚠️ REGLEN BOR HER, FORDI TO SKÆRME SPØRGER DEN. Overblik og
     Bestillinger har hver sin frem-knap, og de spørger begge
     Admin.naesteTrin; skrev de spørgsmålet hver for sig, ville de
     langsomt komme til at sige noget forskelligt om den SAMME
     bestilling — og personalet skifter mellem dem hele dagen.

     Null = spørg ikke. Et spørgsmål på hver bestilling er et
     spørgsmål, man klikker væk uden at læse. */
  Admin.spoergFoerst = function (b) {
    if (!b || b.hvordan !== 'levering') return null;
    var nr = String(b.telefon || '').trim();
    return '\ud83d\ude97 ' + String(b.navn || 'Gæsten')
      + ' skal have maden LEVERET.\n\n'
      + (nr ? 'Har I ringet til ' + nr + ' og aftalt adresse og tid? '
            : 'Har I aftalt adresse og tid med gæsten? ')
      + 'Kvitteringen lover hende et opkald — en levering bekræftes '
      + 'aldrig af sig selv.';
  };

  /* Mellemtrinnet — det, der ligger bag "···". Null, når der ikke
     er noget imellem (en KLAR bestilling har kun færdig tilbage). */
  Admin.mellemTrin = function (status) {
    var n = NAESTE[status];
    if (!n || n[0] === FAERDIG[0]) return null;
    return { status: n[0], navn: n[1], efter: STATUS_NAVNE[n[0]] };
  };

  var bestillinger = [];

  /* Udeblivelser pr. telefonnummer, 180 dage tilbage. Nummeret
     normaliseres til de sidste otte cifre — det er dem, der er
     nummeret; +45 og mellemrum er indpakning, og en gænger skal
     ikke kunne nulstille sig selv med et landekode-præfiks. */
  var udeblivelser = {};

  function nummerNoegle(t) {
    var cifre = String(t || '').replace(/\D/g, '');
    return cifre.slice(-8);
  }

  function hentUdeblivelser() {
    return Butik.hentUdeblivelser().then(function (liste) {
      udeblivelser = {};
      (liste || []).forEach(function (u) {
        var n = nummerNoegle(u.telefon);
        if (n) udeblivelser[n] = (udeblivelser[n] || 0) + 1;
      });
    }).catch(function () { udeblivelser = {}; });
  }

  /* Listen tegnes med Admin.tegnRaekker: kortene, der ikke har
     ændret sig, bliver stående. Se den lange note i kerne.js —
     kort fortalt gemmes personalets note, når feltet forlades, og
     rives kortet ned, mens nogen skriver i det, mister markøren
     sit felt midt i en sætning. */
  /* ============================================================
     DAGENS STYREPULT
     ------------------------------------------------------------
     Kundens billeder (26/8). Listen var én lang stribe fra i går
     og frem med en overskrift pr. dato, og på en travl uge skulle
     man rulle forbi tre dage for at finde i morgen.

     Nu ses ÉN dag ad gangen. ⚠️ Men den lange liste var god til
     én ting, og den skal beholdes: en bestilling til på fredag må
     ikke ligge uset, til fredag kommer. Derfor linjen "der er
     også nye bestillinger til andre dage" — den peger på dagen og
     fører derhen.

     Admin er computer- og iPad-først (se CLAUDE.md), så knapperne
     står som en række og ikke som en rulleliste: på en skærm er
     et valg, man kan SE, bedre end et, man skal åbne.
     ============================================================ */

  /* ⚠️ DAGEN ER STANDARDEN, IKKE "ALLE DAGE"  (6/9)
     Kundens ord: *"when you've pressed done, you need to go into
     like a done bucket FOR THE DAY, and it needs to be
     remembered."*

     Her stod `null`, altså alle dage. Så var "✅ Færdige" ikke
     dagens spand — den var et livstidsarkiv over hver eneste
     bestilling, forretningen nogensinde har lukket. Efter en
     måned er den ubrugelig, og personalet kan ikke se, om DAGEN
     er kørt igennem.

     Forlægget (to skærmbilleder af spiis' fane, ikke deres kode)
     står på én dato med pile til side og en "Alle dage" ved
     siden af. Det er den samme vælger, vi har — den åbnede bare
     det forkerte sted. */
  var visDato = null;   // sættes ved første tegning, se foersteTegning
  // 'alle' | 'lugen' | 'bordene'
  var visKilde = 'alle';
  var foersteTegning = true;

  function iDag() { return Butik.nu().dato; }

  /* ---- DAGEN HUSKES — MEN KUN RESTEN AF DAGEN  (6/9) -------
     Anden halvdel af hans sætning: valget skal overleve et
     faneskift. Det gemtes ingen steder.

     ⚠️ MEN DET GEMMES MED SIN EGEN DATO, og det er ikke pynt.
     Uden den ville en medarbejder, der torsdag eftermiddag
     bladrede tilbage til onsdag, møde ONSDAG fredag morgen — og
     tro, at dagen var tom. Samme greb som `dagens_ret_ingen`
     (31/8): trykket gemmer dagens dato og nulstiller sig selv i
     morgen.

     Det er localStorage og ikke databasen med vilje: hvilken dag
     DENNE skærm står på, er en egenskab ved skærmen, ikke ved
     forretningen. To iPads i køkkenet skal kunne stå på hver sin
     dag. */
  var HUSK = 'mosede_admin_bestil_dag';

  function huskDag() {
    try {
      localStorage.setItem(HUSK, JSON.stringify({ dato: visDato, gemt: iDag() }));
    } catch (e) { /* privat vindue: så huskes den bare ikke */ }
  }

  /* Svarer med den huskede dag, eller undefined hvis der ikke er
     nogen — så bestemmer den gamle logik nedenfor. `dato: null`
     ER et gyldigt valg (Alle dage), så der spørges til NØGLEN og
     ikke til værdien. */
  function husketDag() {
    try {
      var g = JSON.parse(localStorage.getItem(HUSK) || 'null');
      if (g && g.gemt === iDag() && Object.prototype.hasOwnProperty.call(g, 'dato')) {
        return { dato: g.dato };
      }
    } catch (e) { /* ubrugelig værdi: så bestemmer den gamle logik */ }
    return null;
  }

  function datoPlus(iso, dage) {
    var t = iso.split('-');
    var d = new Date(Date.UTC(+t[0], +t[1] - 1, +t[2] + dage));
    return d.toISOString().slice(0, 10);
  }

  function erBord(b) { return !!b.bord_nummer; }

  /* Indeholder bestillingen smørrebrød?

     Navnene sammenlignes med menukortet, og kategorierne kommer
     fra Butik.smoerrebroed — den SAMME kilde, gæstesiden bruger
     til at afgøre, hvad der er et stykke og hvad der er fyld. En
     regex mere her ville være en anden mening om det samme.

     ⚠️ DER SPØRGES PÅ menu_varer OG IKKE PÅ .stykker: den liste
     har sorteret de udsolgte fra, og en bestilling, der blev
     lagt før varen slap op, ville så holde op med at vise sit
     fyld.

     ⚠️ UDEN MENUKORTET SVARER DEN JA. Admin.data kan være null,
     når fanen tegnes (se noten i js/admin/kalender.js). At tabe
     "blandet udvalg" på et rigtigt smørrebrød er værre end en
     linje for meget. */
  function harSmoerrebroed(b) {
    var d = Admin.data;
    if (!d || !(d.menu_varer || []).length) return true;
    var ids = Butik.smoerrebroed(d).kategoriIds || [];
    var navne = {};
    d.menu_varer.forEach(function (v) {
      if (ids.indexOf(v.kategori_id) === -1) return;
      navne[String(v.navn || '').trim().toLowerCase()] = true;
    });
    return (b.linjer || []).some(function (l) {
      return !!navne[String(l && l.navn || '').trim().toLowerCase()];
    });
  }

  /* Alle dage, der HAR noget — så pilene springer tomme dage
     over. Uden det kunne man trykke frem fem gange gennem en
     stille uge og tro, at knappen ikke virkede. */
  function dageMedNoget() {
    var sæt = {};
    bestillinger.forEach(function (b) { if (!b.slettet) sæt[b.hent_dato] = true; });
    sæt[iDag()] = true;   // i dag står altid i listen, også når den er tom
    return Object.keys(sæt).sort();
  }

  function iUdvalg(b) {
    if (visDato && b.hent_dato !== visDato) return false;
    if (visKilde === 'lugen' && erBord(b)) return false;
    if (visKilde === 'bordene' && !erBord(b)) return false;
    return true;
  }

  function tegnDagvaelger() {
    var boks = $('bestil-dage');
    if (!boks) return;
    Admin.tøm(boks);

    var dage = dageMedNoget();
    var nu = visDato || iDag();
    var plads = dage.indexOf(nu);

    function pil(tekst, virk, slukket) {
      var k = lav('button', 'knap lille bestil-pil', tekst);
      k.type = 'button';
      if (slukket) k.disabled = true;
      else k.addEventListener('click', virk);
      return k;
    }

    /* ⚠️ TO FILTRE, TO GRUPPER — OG DE SÅ ENS UD FØR (31/8).

       Fem løse piller stod i tre rækker: "I dag", "Alle dage",
       "Alle", "Lugen", "Bordene". De hører til hvert sit
       spørgsmål — HVILKEN DAG og HVOR FRA — men man kunne ikke se
       det, for de havde samme form og samme farve. Kundens ord om
       admins knapper: "ligner noget for 1850'erne".

       En segmenteret gruppe siger tre ting på én gang: her er et
       valg, det er ét af dem, og de her hører sammen. */
    function segment(navn, valg) {
      var linje = lav('div', 'adm-filter');
      linje.appendChild(lav('span', 'adm-seg-navn', navn));
      var gruppe = lav('div', 'adm-seg');
      gruppe.setAttribute('role', 'group');
      gruppe.setAttribute('aria-label', navn);
      valg.forEach(function (v) {
        var k = lav('button', null, v.navn);
        k.type = 'button';
        /* ⚠️ aria-pressed OG IKKE EN KLASSE. Stilen hænger på
           attributten, så en skærmlæser og øjet får det samme at
           vide — og en prøve kan måle DET, der styrer udseendet,
           i stedet for en klasse ved siden af. */
        k.setAttribute('aria-pressed', v.valgt ? 'true' : 'false');
        k.dataset.valg = v.id;
        k.addEventListener('click', v.virk);
        gruppe.appendChild(k);
      });
      linje.appendChild(gruppe);
      return linje;
    }

    /* Dagen: pilene og navnet i én linje, der ikke ombrydes. */
    var dagLinje = lav('div', 'adm-filter');
    dagLinje.appendChild(lav('span', 'adm-seg-navn', 'Dag'));
    var vaelger = lav('div', 'adm-dagvaelger');
    vaelger.appendChild(pil('←', function () {
      visDato = plads > 0 ? dage[plads - 1] : datoPlus(nu, -1);
      huskDag(); tegnAlt();
    }, visDato === null));
    /* ⚠️ UDEN EMOJI. 📅 og 📚 brød linjen på en telefon og gjorde
       navnet bredere end pladsen — og de sagde ikke noget, ordet
       ikke allerede sagde. */
    vaelger.appendChild(lav('span', 'bestil-dagnavn',
      visDato ? Admin.pænDato(visDato) : 'Alle dage'));
    vaelger.appendChild(pil('→', function () {
      visDato = plads >= 0 && plads < dage.length - 1
        ? dage[plads + 1] : datoPlus(nu, 1);
      huskDag(); tegnAlt();
    }, visDato === null));
    dagLinje.appendChild(vaelger);

    dagLinje.appendChild(segment('', [
      { id: 'idag', navn: 'I dag', valgt: visDato === iDag(),
        virk: function () { visDato = iDag(); huskDag(); tegnAlt(); } },
      { id: 'alle-dage', navn: 'Alle dage', valgt: visDato === null,
        virk: function () { visDato = null; huskDag(); tegnAlt(); } },
    ]).lastChild);
    boks.appendChild(dagLinje);

    /* ⚠️ KILDEFILTERET, IKKE TO LISTER. Bordene har deres egen
       SKÆRM (Køkken-kø) til det, der skal laves NU. Her er de
       med, fordi den her fane er dagens REGNSKAB: hvor meget er
       der solgt, og hvad skal der laves. Filteret gør, at man kan
       skille dem ad, når man vil — uden at der bliver to lister
       over den samme dag. */
    boks.appendChild(segment('Hvor fra', [
      { id: 'alle', navn: 'Alle', valgt: visKilde === 'alle',
        virk: function () { visKilde = 'alle'; tegnAlt(); } },
      { id: 'lugen', navn: 'Lugen', valgt: visKilde === 'lugen',
        virk: function () { visKilde = 'lugen'; tegnAlt(); } },
      { id: 'bordene', navn: 'Bordene', valgt: visKilde === 'bordene',
        virk: function () { visKilde = 'bordene'; tegnAlt(); } },
    ]));
  }

  function udvalg() {
    return bestillinger.filter(function (b) { return !b.slettet && iUdvalg(b); });
  }

  function tegnSum() {
    var linje = $('bestil-sum');
    if (!linje) return;

    var liste = udvalg();
    /* ⚠️ EMBALLAGEN ER IKKE EN RET. Målt 1/9: en bestilling på
       fire portioner med tillæg sagde "9 retter" — fire poser
       talte som mad. Tællingen bor i Admin.retterI, fordi
       månedsnettet på Kalender-fanen viser det SAMME tal: to
       kopier ville skride fra hinanden, uden at nogen af de to
       skærme så forkerte ud for sig selv. */
    var retter = Admin.retterI(liste);
    var udAfHuset = 0, spiserHer = 0;
    liste.forEach(function (b) {
      if (b.status === 'afvist') return;
      if (erBord(b) || b.hvordan === 'spis_her') spiserHer++; else udAfHuset++;
    });

    var dele = [visDato ? Admin.pænDato(visDato) : 'Alle dage'];

    /* Dagens ret står med, fordi den er dét, køkkenet har lovet
       netop den dag — og fordi et navn er hurtigere at genkende i
       listen end i en anden fane. */
    if (visDato) {
      var ret = (Butik.dagensRetter(Admin.data || {}, visDato) || [])[0];
      if (ret && ret.navn) dele.push('Dagens ret: ' + ret.navn);
    }

    dele.push(liste.length + (liste.length === 1 ? ' bestilling' : ' bestillinger'));
    dele.push(retter + (retter === 1 ? ' ret' : ' retter'));
    dele.push('🥡 ' + udAfHuset + ' · 🍽️ ' + spiserHer);
    linje.textContent = dele.join(' · ');
  }

  /* ⚠️ DEN HER LINJE ER GRUNDEN TIL, AT DAGSVISNINGEN ER
     FORSVARLIG. Uden den ville en bestilling til på fredag ligge
     uset, til fredag kom. */
  function tegnAndreDage() {
    var boks = $('bestil-andre');
    if (!boks) return;
    Admin.tøm(boks);

    /* ⚠️ DER TÆLLES DET, DER IKKE ER NÅET IGENNEM — ikke kun det
       NYE. Første udgave talte status === 'ny', og så var en
       BEKRÆFTET bestilling til på fredag usynlig, til fredag kom.
       Det er præcis den fejl, linjen findes for at forhindre.

       Fundet, da en bestilling hentet op af skraldespanden
       forsvandt: den kom tilbage som bekræftet, og der stod
       ingenting nogen steder. */
    var nu = visDato;
    var pr = {}, nye = {};
    bestillinger.forEach(function (b) {
      if (b.slettet || erFaerdig(b)) return;
      if (nu && b.hent_dato === nu) return;
      pr[b.hent_dato] = (pr[b.hent_dato] || 0) + 1;
      if (b.status === 'ny') nye[b.hent_dato] = (nye[b.hent_dato] || 0) + 1;
    });

    var dage = Object.keys(pr).sort();
    boks.classList.toggle('skjult', !dage.length || !visDato);
    if (!dage.length || !visDato) return;

    boks.appendChild(lav('span', 'bestil-andre-navn',
      '🔔 Der venter også bestillinger på andre dage:'));
    dage.forEach(function (dato) {
      var k = lav('button', 'knap lille',
        Admin.pænDato(dato) + ' · ' + pr[dato]
        + (nye[dato] ? ' (' + nye[dato] + ' ny)' : ''));
      k.type = 'button';
      k.addEventListener('click', function () { visDato = dato; tegnAlt(); });
      boks.appendChild(k);
    });
  }

  /* Produktionen: samme form som på Overblik. Køkkenet skal ikke
     lægge "2 × pasta" og "3 × pasta" sammen i hovedet. */
  function tegnProduktion() {
    var boks = $('bestil-produktion');
    if (!boks) return;
    Admin.tøm(boks);

    var kurv = {};
    udvalg().forEach(function (b) {
      if (b.status === 'afvist') return;
      (b.linjer || []).forEach(function (l) {
        /* ⚠️ ET TILLÆG SKAL IKKE LAVES. Produktionslisten er dét,
           køkkenet arbejder efter — stod der "4 Emballage" mellem
           retterne, ville nogen lede efter en ret, der ikke
           findes. Pengene tælles stadig med alle andre steder. */
        if (Butik.erEmballage(Admin.data, l)) return;
        var navn = String(l.navn || '').trim();
        if (!navn) return;
        kurv[navn] = (kurv[navn] || 0) + (Number(l.antal) || 0);
      });
    });

    Object.keys(kurv).sort(function (a, b) {
      return kurv[b] - kurv[a] || a.localeCompare(b, 'da');
    }).forEach(function (navn) {
      var p = lav('div', 'prod-pille');
      p.appendChild(lav('b', 'prod-antal', kurv[navn]));
      p.appendChild(lav('span', 'prod-navn', navn));
      boks.appendChild(p);
    });
  }

  /* "Færdig" i betydningen INTET MERE ARBEJDE — den bruges til at
     dele listen i to bunker og til tællerne. Et afvist bord er
     færdigt i den forstand. */
  function erFaerdig(b) {
    return b.status === 'afhentet' || b.status === 'serveret'
      || b.status === 'afvist' || b.status === 'udeblevet';
  }

  /* ⚠️ OG "GENNEMFØRT" ER NOGET ANDET — maden kom ud ad døren.
     De to må ikke blandes sammen: erFaerdig() er sand for en
     AFVIST bestilling, så en grøn "det gik godt"-stil hængt på
     den ville farve et afslag grønt. Det er den forskel, kunden
     bad om at kunne se: "når de er kørt skal det tydeligt ses". */
  function erGennemfoert(b) {
    return b.status === 'afhentet' || b.status === 'serveret';
  }

  function tegnTal() {
    var boks = $('bestil-tal');
    if (!boks) return;
    Admin.tøm(boks);

    var liste = udvalg();
    var mangler = liste.filter(function (b) { return !erFaerdig(b); }).length;
    var faerdige = liste.length - mangler;

    var a = lav('span', 'bestil-tal-pille' + (mangler ? ' haster' : ''),
      '🔥 ' + mangler + (mangler === 1 ? ' mangler' : ' mangler'));
    var b2 = lav('span', 'bestil-tal-pille klar', '✅ ' + faerdige + ' færdige');
    boks.appendChild(a);
    boks.appendChild(b2);
  }

  function tegnBestillinger() {
    var boks = $('bestillinger-liste');
    if (!boks) return;

    // Tallet på fanen: hvor mange der endnu ikke er ringet om
    var nye = bestillinger.filter(function (b) { return b.status === 'ny'; }).length;
    var maerke = $('bestil-antal');
    if (nye) { maerke.textContent = nye; maerke.classList.remove('skjult'); }
    else maerke.classList.add('skjult');

    var raekker = [];

    if (!udvalg().length) {
      raekker.push({
        noegle: 'tom', aftryk: 'tom-' + (visDato || 'alle') + '-' + visKilde,
        byg: function () {
          return lav('p', 'plan-tom', visDato
            ? 'Ingen bestillinger ' + (visDato === iDag() ? 'i dag' : 'den dag')
              + (visKilde === 'lugen' ? ' til lugen'
                : visKilde === 'bordene' ? ' fra bordene' : '') + '.'
            : 'Der er ingen bestillinger fra i går og frem.');
        },
      });
    }

    /* ---- MANGLER FØRST, FÆRDIGE UNDER ----
       Kundens billeder (26/8). Den gamle liste stod i én stribe
       sorteret efter hentetid, med det afhentede blandet ind
       imellem — og hen over en dag voksede det færdige, mens det,
       der skulle laves, blev skubbet ned.

       ⚠️ Det færdige er IKKE væk. Trykker nogen forkert i en
       frokost, skal bestillingen kunne findes igen. Samme regel
       som Færdige på Overblik. */
    var liste = udvalg();
    var mangler = liste.filter(function (b) { return !erFaerdig(b); });
    var faerdige = liste.filter(erFaerdig);

    /* Inden for hver gruppe: hentetiden. Personalet pakker i den
       rækkefølge, poserne skal ud ad lugen. */
    function efterTid(a, b) {
      return String(a.hent_dato + a.hent_tid).localeCompare(
        String(b.hent_dato + b.hent_tid));
    }
    mangler.sort(efterTid);
    faerdige.sort(efterTid);

    function kortRaekke(b) {
      /* ALT, KORTET VISER, SKAL VÆRE I AFTRYKKET — ellers ændrer
         noget sig i dataene, uden at skærmen følger med. Rækken
         selv dækker det meste; gængerens antal udeblivelser
         hentes for sig og skal derfor med i hånden. */
      return {
        noegle: 'b-' + b.id,
        aftryk: JSON.stringify([b, udeblivelser[nummerNoegle(b.telefon)] || 0]),
        byg: function () { return bestillingKort(b); },
      };
    }

    if (mangler.length) {
      raekker.push({
        noegle: 'h-mangler', aftryk: 'mangler-' + mangler.length,
        byg: function () {
          var h = lav('h3', 'bestil-gruppe haster', '🔥 Mangler');
          h.appendChild(lav('span', 'bestil-gruppe-note',
            'tryk knappen, når den er nået videre'));
          return h;
        },
      });
      mangler.forEach(function (b) { raekker.push(kortRaekke(b)); });
    } else if (liste.length) {
      raekker.push({
        noegle: 'alt-klart', aftryk: 'alt-klart',
        byg: function () {
          return lav('p', 'plan-tom',
            'Alle bestillinger er nået igennem – flot! 🎉');
        },
      });
    }

    if (faerdige.length) {
      raekker.push({
        noegle: 'h-faerdige', aftryk: 'faerdige-' + faerdige.length,
        byg: function () {
          var h = lav('h3', 'bestil-gruppe klar',
            '✅ Færdige (' + faerdige.length + ')');
          /* ⚠️ SÆTNINGEN SKAL NÆVNE KNAPPEN VED NAVN. Der stod
             "tryk … hvis noget var en fejl" — de tre prikker var
             ment som "···"-knappen, men de læses som en
             afbrudt sætning, og knappen kunne ikke ses på kortet.
             Nu står ↩ Gendan fremme, og linjen siger det. */
          h.appendChild(lav('span', 'bestil-gruppe-note',
            'tryk ↩ Gendan hvis noget var en fejl'));
          return h;
        },
      });
      faerdige.forEach(function (b) { raekker.push(kortRaekke(b)); });
    }

    Admin.tegnRaekker(boks, raekker);
  }

  /* Alt, styrepulten viser, tegnes af det her ene kald. Fem
     funktioner, der skal huskes hver gang, er fire, der bliver
     glemt. */
  function tegnAlt() {
    tegnDagvaelger();
    tegnSum();
    tegnAndreDage();
    tegnProduktion();
    tegnTal();
    tegnBestillinger();
  }

  function bestillingKort(b) {
    /* ⚠️ EN FÆRDIG SKAL KUNNE SES SOM FÆRDIG. Klassen b-afhentet
       gjorde kortet gråt og halvgennemsigtigt — nøjagtig som
       b-afvist og b-udeblevet. Altså lignede "det gik godt" og
       "det gik galt" hinanden. .b-faerdig er den, stilen hænger
       på, og den sættes for BEGGE de to ord, databasen bruger for
       en gennemført bestilling. */
    var k = lav('div', 'bestil-kort b-' + b.status
      + (erGennemfoert(b) ? ' b-faerdig' : ''));
    k.setAttribute('data-id', String(b.id));

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'bestil-tid',
      String(b.hent_tid || '').slice(0, 5).replace(':', '.')));
    top.appendChild(lav('span', 'maerke m-' + b.status,
      STATUS_NAVNE[b.status] || b.status));
    /* TAPASFADET SES FØRST. Det er ikke en pose, der rækkes ud af
       lugen — det er et fad, der skal bygges, og gæsten er bedt om
       at ringe om indholdet. Mærket står før alle andre, fordi det
       ændrer, hvornår køkkenet skal gå i gang: to dages varsel er
       til for at blive brugt. */
    if (Admin.erTapas(b)) {
      top.appendChild(lav('span', 'maerke m-tapas', '🧀 Tapasfad'));
    }
    /* Spis her skal kunne SES på kortet, ikke læses ud af en
       fritekst midt i en frokost: den ene skal i en pose, den
       anden på et bord med bestik.

       ⚠️ VENDT 6/9 — HER STOD, AT AFHENTNING FÅR INTET MÆRKE.
       Grunden var, at et mærke på hver eneste bestilling ikke
       siger noget. Kunden bad om det modsatte: *"in the order tab
       it's not clear what type of order it is"* — og forlægget
       (to skærmbilleder af spiis' fane) sætter "To-go" på hvert
       eneste kort.

       Han har ret, og grunden er, at der er FIRE typer. Med fire
       muligheder er fraværet af et mærke tvetydigt: personalet kan
       ikke se forskel på "det er to-go" og "mærket blev ikke
       tegnet". Det er kun entydigt med to. */
    if (b.hvordan === 'spis_her' && !b.bord_nummer) {
      top.appendChild(lav('span', 'maerke favorit', '🍽️ Spis her'));
    }
    /* ⚠️ OG DEN FALDER TILBAGE PÅ TO-GO, IKKE PÅ INGENTING.
       Rækker fra før spis-her.sql har `hvordan` som null, og de
       VAR afhentning — det var den eneste måde dengang. Et kort
       uden mærke ville se ud som en fejl på netop de gamle. */
    if (!b.bord_nummer && b.hvordan !== 'spis_her' && b.hvordan !== 'levering') {
      top.appendChild(lav('span', 'maerke m-togo', '🥡 To-go'));
    }
    /* BORDET STÅR I STEDET FOR "SPIS HER", ikke ved siden af.
       En bestilling fra QR-koden på bordet ER spis her — det er
       en regel i databasen (bestilling_bord_hvordan_ok) — så to
       mærker ville sige det samme to gange. Bordet siger mere:
       det siger, hvor maden skal hen. Uden det står personalet
       med en bakke og kigger ud over trædækket. */
    if (b.bord_nummer) {
      top.appendChild(lav('span', 'maerke m-bord', '🍽️ Bord ' + b.bord_nummer));
    }
    /* LEVERING SKAL SES FØRST AF ALT. En bestilling, der skal
       køres ud, har en afgang og ikke bare et afhentningstidspunkt
       — ser personalet den som en almindelig afhentning, står
       maden klar ved lugen, mens gæsten venter derhjemme.
       Mærket er rødt (m-ny) og ikke sandfarvet: det er det
       eneste på kortet, der ændrer, hvad der skal SKE. */
    if (b.hvordan === 'levering') {
      top.appendChild(lav('span', 'maerke m-ny', '🚗 Leveres'));
    }
    /* GÆNGEREN SES FØR MADEN LAVES — spiis' brief (22/8), betalt
       med rigtige middage i skraldespanden. Mærket står KUN på
       bestillinger, der stadig er i arbejde: på en afhentet er
       det bagklogskab, og på en afvist er det ligegyldigt. Tallet
       er antal udeblivelser fra samme nummer de sidste 180 dage.
       Det er en oplysning, ikke en dom — personalet ringer
       alligevel og bekræfter hver eneste bestilling. */
    var udeblev = udeblivelser[nummerNoegle(b.telefon)] || 0;
    if (udeblev > 0 && (b.status === 'ny' || b.status === 'bekraeftet' || b.status === 'klar')) {
      top.appendChild(lav('span', 'maerke gaenger',
        'Udeblevet ' + udeblev + (udeblev === 1 ? ' gang' : ' gange')));
    }
    /* Nummeret, man kan SIGE (31/8) — kundens ord: "kan
       bestillings-ordrenummeret ikke være fra #0000 af, lidt
       pænere end det der." Referencen er stadig rækkens nøgle
       (kvitteringer og mails peger på den) og står som title, så
       den kan slås op — den er flyttet, ikke fjernet. Gamle
       rækker uden nummer viser referencen som før. */
    var refM = lav('span', 'bestil-ref',
      (Butik.pæntNummer && Butik.pæntNummer(b.nummer)) || b.reference);
    refM.title = b.reference;
    top.appendChild(refM);
    k.appendChild(top);

    var hvem = lav('div', 'bestil-hvem');
    /* ⚠️ NAVNET MED STORT FORBOGSTAV (6/9). Admin.pæntNavn har
       ligget i kerne.js siden 1/9, og OVERBLIK var den eneste
       fane, der spurgte den — nøjagtig som Admin.kontakt indtil
       3/9. Målt på et skud: seks kort i træk med "anna vind",
       "bettina holm larsen", "klaus valentiner". Det er navnet,
       personalet råber ud over en kø. */
    hvem.appendChild(lav('span', 'vare-navn',
      Admin.pæntNavn ? Admin.pæntNavn(b.navn) : b.navn));
    /* Telefonnummeret og mailen som LINKS i samme vægt (31/8,
       kundens ord: "nummer og email skal stå tydelig"). Personalet
       SKAL ringe, og en tablet ved lugen kan ringe direkte.
⚠️ KONTAKTLINJEN BOR ÉT STED: Admin.kontakt (kerne.js).
       Kortet skrev nummeret ubetinget, og MÅLT på et skud stod der
       "📞 null" på en QR-bestilling uden nummer — kundens egen
       beslutning 31/8 ("bare navn er ok, fordi de sidder der") og
       bord-uden-telefon.sql tillader netop det. Reglen fandtes
       allerede med en note om præcis den sag; kortet spurgte den
       bare aldrig. To udgaver af den samme regel skrider fra
       hinanden — og her havde den ene stået forkert siden 31/8. */
    Admin.kontakt(b).forEach(function (e) { hvem.appendChild(e); });
    k.appendChild(hvem);

    /* ⚠️ HVAD OG HVOR MANGE ER DET, KØKKENET LÆSER (29/8).

       Kundens ord: "det er utydeligt hvad for noget mad der er
       bestilt hvor mange hvornår." Linjerne stod i brødtekst med
       antallet i samme størrelse som varenavnet og prisen ude i
       højre kant — og på en bred skærm er der 500 px imellem, så
       øjet skal rejse for hver linje.

       Antallet er nu tallet, man ser først, og prisen er dæmpet:
       køkkenet skal lave maden, ikke regne. Summen står til sidst,
       fordi det er DEN, der skal siges ved lugen. */
    var linjer = lav('div', 'bestil-linjer');
    var sum = 0;
    (b.linjer || []).forEach(function (l) {
      /* ⚠️ EMBALLAGEN STÅR FOR SIG, UNDER MADEN. Forlæggets kort
         har den som sin egen linje uden for varelisten — og det
         er ikke pynt: står den mellem retterne, læses den som en
         ret, og det var præcis dét, der fik dagen til at sige
         "9 retter" på fem. Beløbet tæller stadig med i I ALT. */
      if (Butik.erEmballage(Admin.data, l)) {
        sum += (Number(l.pris) || 0) * (Number(l.antal) || 0);
        return;
      }
      var r = lav('div', 'bestil-linje');
      r.appendChild(lav('span', 'bestil-antal-tal', (l.antal || 1) + ' ×'));
      /* Varianten står i SAMME element som navnet og ikke som en
         linje mere: "3 × Smørrebrød" og "Leverpostej" på hver sin
         række læses som to stykker mad. */
      r.appendChild(lav('span', 'bestil-vare',
        l.navn + (l.variant ? ' · ' + l.variant : '')));
      if (l.pris) {
        sum += (Number(l.pris) || 0) * (Number(l.antal) || 0);
        r.appendChild(lav('span', 'bestil-linjepris', Butik.pris(l.pris * l.antal)));
      }
      linjer.appendChild(r);
    });

    /* ⚠️ SUMMEN STÅR KUN, NÅR DER ER MERE END ÉN LINJE MED PRIS.
       På en bestilling med ét stykke ville totalen være den samme
       tekst to gange lige under hinanden. */
    var medPris = (b.linjer || []).filter(function (l) { return l.pris; });
    if (sum && medPris.length > 1) {
      var t = lav('div', 'bestil-linje bestil-sum');
      t.appendChild(lav('span', 'bestil-antal-tal', ''));
      t.appendChild(lav('span', 'bestil-vare', 'I alt'));
      t.appendChild(lav('span', 'bestil-linjepris', Butik.pris(sum)));
      linjer.appendChild(t);
    }
    k.appendChild(linjer);

    /* Emballagen som forlæggets egen chip: "📦 Emballage: 4 stk.
       (40 kr.)". Den siger, hvad totalen består af — uden at
       lade som om der skal laves fire af noget. Navnet er
       ejerens eget, hvis han har skrevet et. */
    var emb = (b.linjer || []).filter(function (l) {
      return Butik.erEmballage(Admin.data, l);
    })[0];
    if (emb) {
      var eNavn = String(emb.navn || '').trim() || 'Emballage';
      var eAntal = Number(emb.antal) || 0;
      k.appendChild(lav('p', 'bestil-emballage',
        '📦 ' + eNavn + ': ' + eAntal + ' stk. ('
        + Butik.pris((Number(emb.pris) || 0) * eAntal) + ')'));
    }

    /* ⚠️ FYLDLINJEN HØRER TIL SMØRREBRØDET, IKKE TIL ALT.

       Den stod på HVERT kort — også på en flæskestegssandwich og
       en fiskefilet — og sagde "gæsten har ikke valgt – blandet
       udvalg". Det er ikke bare støj: det er en instruks til
       køkkenet om noget, bestillingen slet ikke indeholder.

       Fyld findes kun på bestil/ (model A). Har gæsten valgt
       noget, står det. Har hun ikke, står linjen kun, hvis der
       ER smørrebrød på bestillingen — for dér BETYDER tomt
       "blandet". */
    var fyld = b.fyld || [];
    if (fyld.length || harSmoerrebroed(b)) {
      var f = lav('p', 'vare-tekst');
      f.appendChild(lav('strong', null, 'Fyld: '));
      f.appendChild(document.createTextNode(fyld.length
        ? fyld.join(', ')
        : 'gæsten har ikke valgt – blandet udvalg'));
      k.appendChild(f);
    }

    /* ⚠️ EN ALLERGI ER IKKE EN BESKED. Køkken-køen har haft den
       røde ramme siden 25/8; her stod den som en fodnote i samme
       farve som "vi sidder ude bagved" — og det er de SAMME
       bestillinger, bare pakket ved lugen i stedet for serveret
       ved bordet. Kendingen er Admin.erAllergi, så de to skærme
       ikke kan komme til at advare om hver sit. */
    if (b.besked) {
      var allergi = Admin.erAllergi(b);
      var m = lav('p', 'bestil-gaestebesked' + (allergi ? ' allergi' : ''));
      m.appendChild(lav('strong', null,
        allergi ? '⚠️ Gæsten skriver: ' : 'Gæsten skriver: '));
      m.appendChild(document.createTextNode(b.besked));
      k.appendChild(m);
      if (allergi) k.classList.add('har-allergi');
    }

    /* ⚠️ DEN SAMME GÆST SIDDER MÅSKE VED ET BORD LIGE NU.

       Lone bestiller to burgere til kl. 14 på hjemmesiden. Så
       kommer hun ned, får et bord og bestiller fra QR-koden.
       Bestillingen ved lugen står her og venter på en, der aldrig
       kommer op og henter — hun sidder tyve meter væk og tror,
       hun har bestilt én gang.

       Systemet kan ikke vide, om de to er den samme mad eller to
       runder, og et gæt ville enten lave maden to gange eller
       slette en rigtig bestilling. Men det KAN se, at det er det
       samme nummer, og sige det, mens personalet står med
       skærmen. Se noten ved Admin.sammeGaest. */
    var ogsaa = Admin.sammeGaest ? Admin.sammeGaest(b) : [];
    var vedBord = ogsaa.filter(function (x) { return x.bord_nummer; });
    if (vedBord.length && !b.bord_nummer) {
      var v = lav('p', 'fejl');
      v.textContent = 'Samme nummer har også bestilt fra bord '
        + vedBord.map(function (x) { return x.bord_nummer; }).join(' og ')
        + '. Er det den samme mad to gange, eller sidder de og har '
        + 'bestilt mere? Spørg dem, før I laver begge dele.';
      k.appendChild(v);
    }

    /* Personalets egen note. Den gemmes når feltet forlades og
       ikke ved hvert tastetryk: et kald pr. bogstav ville være
       hundrede kald for én sætning. */
    var note = lav('div', 'felt');
    var etiket = lav('label', null, 'Din note');
    etiket.setAttribute('for', 'note-' + b.id);
    var felt = document.createElement('input');
    felt.type = 'text';
    felt.id = 'note-' + b.id;
    felt.maxLength = 1000;
    felt.value = b.intern_note || '';
    felt.placeholder = 'Fx: ringet, hun kommer 12.30';
    felt.addEventListener('change', function () {
      if (felt.value === (b.intern_note || '')) return;
      gemBestilling(Butik.skrive.bestillingStatus(b.id, b.status, felt.value),
        'Noten er gemt.');
    });
    /* ⚠️ DEN TOMME NOTE FOLDES VÆK.

       MÅLT: fanen viser en dag ad gangen, og på en travl fredag
       er det ti kort. Ti åbne notefelter med den samme grå
       pladsholder fylder lige så meget som ti gange navn, tid og
       mad tilsammen — og det er ikke arbejde, det er et sted at
       skrive noget, hvis man vil.

       Har noten indhold, står den åben: så ER den en oplysning om
       bestillingen. Samme greb som på Baglokalet. */
    note.appendChild(etiket);
    note.appendChild(felt);
    if (b.intern_note) {
      k.appendChild(note);
    } else {
      var fold = lav('details', 'note-fold');
      fold.appendChild(lav('summary', null, '📝 Skriv en note'));
      fold.appendChild(note);
      fold.addEventListener('toggle', function () {
        if (fold.open) felt.focus();
      });
      k.appendChild(fold);
    }

    /* ⚠️ ÉN HANDLING FREM, RESTEN BAG "···"  (31/8).

       Kundens forlæg (et skærmbillede, ikke deres kode): kortet er
       tre linjer med ÉN grøn knap til højre og alt andet gemt.

       Vores kort havde tre knapper i fuld bredde under maden —
       Bekræft, Udeblev, Afvis — så hvert kort blev en halv skærm,
       og den ene knap, personalet skal trykke på ni gange ud af
       ti, stod side om side med to, de næsten aldrig bruger.
       Nu er der én vej frem og en dør til resten.

       ⚠️ INGENTING ER FJERNET. Udeblev, Afvis, Slet og Gendan
       findes alle sammen — de ligger bag "···". En knap, der er
       væk, er en sag, personalet ikke kan lukke. */
    var raekke = lav('div', 'knap-raekke bestil-handling');
    var mere = lav('div', 'bestil-mere');
    var merKnap = lav('button', 'knap-mere', '\u00B7\u00B7\u00B7');
    merKnap.type = 'button';
    merKnap.setAttribute('aria-expanded', 'false');
    merKnap.setAttribute('aria-label', 'Flere handlinger for ' + b.navn);
    merKnap.addEventListener('click', function () {
      var aaben = mere.classList.toggle('aaben');
      merKnap.setAttribute('aria-expanded', aaben ? 'true' : 'false');
    });

    /* ⚠️ ÉT TRYK: knappen er ALTID "✓ Færdig", uanset hvor i
       kæden bestillingen står. Se noten ved FAERDIG. */
    var n = Admin.naesteTrin(b.status);
    if (n) {
      var frem = lav('button', 'knap primaer gron', '\u2713 ' + n.navn);
      frem.addEventListener('click', function () {
        var spg = Admin.spoergFoerst(b);
        if (spg && !confirm(spg)) return;
        gemBestilling(Butik.skrive.bestillingStatus(b.id, n.status, felt.value),
          'Bestillingen er sat til "' + n.efter + '".');
      });
      raekke.appendChild(frem);
    }

    /* Mellemtrinnet — "Bekræft" eller "Sæt som klar" — ligger bag
       døren. Den, der VIL markere, at maden er lavet og venter,
       kan stadig; det er bare ikke det, man møder først. */
    var mel = Admin.mellemTrin(b.status);
    if (mel) {
      var mk = lav('button', 'knap sekundaer', mel.navn);
      mk.type = 'button';
      mk.addEventListener('click', function () {
        gemBestilling(Butik.skrive.bestillingStatus(b.id, mel.status, felt.value),
          'Bestillingen er sat til "' + mel.efter + '".');
      });
      mere.appendChild(mk);
    }

    /* UDEBLEV: maden blev lavet, gæsten kom aldrig. Kun fra
       'bekraeftet' og 'klar' — en NY bestilling, ingen har ringet
       om, kan ikke "udeblive"; den afvises eller bekræftes.
       Tæller aldrig som omsætning: salgsfanen tæller kun
       'afhentet', og det er netop pointen med at skille de to. */
    if (b.status === 'bekraeftet' || b.status === 'klar') {
      var ude = lav('button', 'knap sekundaer', 'Udeblev');
      ude.addEventListener('click', function () {
        if (!confirm('Sæt bestillingen fra ' + b.navn + ' som udeblevet?\n\n'
          + 'Brug den, når maden var klar, men ingen kom. Den tæller '
          + 'ikke som salg.')) return;
        gemBestilling(
          Butik.skrive.bestillingStatus(b.id, 'udeblevet', felt.value)
            .catch(function (e) {
              /* Indtil supabase/udeblivelser.sql er kørt, kender
                 databasen ikke ordet — og så skal der stå HVAD man
                 gør, ikke en rå constraint-fejl. */
              if (/bestilling_status_ok/.test(e.message || '')) {
                throw new Error('Databasen kender ikke "udeblevet" endnu. '
                  + 'Kør supabase/udeblivelser.sql i Supabase først.');
              }
              throw e;
            }),
          'Bestillingen er sat som udeblevet. Den tæller ikke som salg.');
      });
      mere.appendChild(ude);
    }

    if (b.status !== 'afvist' && b.status !== 'afhentet' && b.status !== 'udeblevet') {
      var afvis = lav('button', 'knap fare', 'Afvis');
      afvis.addEventListener('click', function () {
        /* Opringningen står i spørgsmålet. En afvisning uden en
           opringning er en kunde der møder op til en pose der ikke
           findes – og gæsten har fået at vide at vi ringer. */
        if (!confirm('Afvis bestillingen fra ' + b.navn + '?\n\n'
          + 'Husk at ringe til ' + b.telefon + ' – gæsten har fået at vide '
          + 'at vi ringer og bekræfter.')) return;
        gemBestilling(Butik.skrive.bestillingStatus(b.id, 'afvist', felt.value),
          'Bestillingen er afvist.');
      });
      mere.appendChild(afvis);
    }

    /* ⚠️ FORTRYD SKAL ALTID KUNNE LADE SIG GØRE (31/8). Kundens
       ord: "gendannelse af bestillinger det skal man kunne, hvis
       man klikker forkert." Overblik har haft ↩ Gendan i sin
       Færdige-fold siden 26/8 — men på selve Bestillinger-fanen
       kunne et fejltryk på Færdig, Afvis eller Udeblev ikke
       fortrydes, uden at skifte fane og lede. Gendan fører til
       'bekraeftet', ikke 'ny' — rækken HAR været set, det var
       derfor, nogen trykkede. Samme regel som Overblik. */
    if (erFaerdig(b)) {
      var gendan = lav('button', 'knap sekundaer', '↩ Gendan');
      gendan.type = 'button';
      gendan.addEventListener('click', function () {
        gemBestilling(Butik.skrive.bestillingStatus(b.id, 'bekraeftet', felt.value),
          'Bestillingen er tilbage som bekræftet.');
      });
      /* ⚠️ PÅ ET FÆRDIGT KORT ER GENDAN DEN ENE HANDLING FREM.
         Reglen er den samme som 31/8 — ét skridt frem på kortet,
         resten bag "···" — men et færdigt kort HAR ikke et skridt
         frem, og så stod der ingen knap: bunkens egen overskrift
         sagde "tryk … hvis noget var en fejl" og pegede på noget,
         en finger ikke kunne se. Kundens forlæg har den fremme,
         og det er den rigtige læsning: den ene ting, der er
         tilbage at gøre ved en færdig bestilling, er at fortryde
         den.

         ⚠️ OG DEN ER HVID, IKKE GRØN. Grøn betyder "det gik
         godt/færdig" i hele admin; et skridt TILBAGE må ikke bære
         den farve. Døren har stadig noget bag sig (Slet), så den
         er ikke blevet en knap, der åbner ingenting. */
      if (Admin.naesteTrin(b.status)) mere.appendChild(gendan);
      else raekke.appendChild(gendan);
    }

    if (b.status === 'afhentet' || b.status === 'afvist' || b.status === 'udeblevet') {
      /* "Slet" er ikke længere endeligt. Bestillingen flyttes til
         fanen Skraldespand og kan hentes tilbage i 30 dage — se
         supabase/skraldespand.sql. Spørgsmålet siger det, for der
         stod "for altid" før, og et fejltryk på en iPad ved lugen
         kostede en kundes navn og nummer. */
      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!confirm('Flyt bestillingen fra ' + b.navn + ' til skraldespanden?\n\n'
          + 'Den kan hentes tilbage i 30 dage.')) return;
        gemBestilling(Butik.skrive.tilSkraldespand('bestilling', b.id),
          'Bestillingen ligger i skraldespanden.');
      });
      mere.appendChild(slet);
    }

    /* Døren findes kun, når der er noget bag den. En "···", der
       åbner ingenting, er en knap, personalet trykker på én gang
       og aldrig igen. */
    if (mere.children.length) {
      raekke.appendChild(merKnap);
      raekke.appendChild(mere);
    }
    k.appendChild(raekke);
    return k;
  }

  /* Som Admin.gem(), men henter BESTILLINGERNE igen og ikke alt
     det andet. genindlæs() henter syv tabeller; en statusknap skal
     ikke hente hele menukortet forfra. */
  function gemBestilling(løfte, besked) {
    return løfte
      .then(hentUdeblivelser)
      .then(hentBestillinger)
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e.message || String(e)); });
  }

  /* Samme fingeraftryk som i kerne.js, plus ét mere: de id'er,
     der er NYE siden sidst, får kortet til at lyse op i to
     sekunder. Det kan kun lade sig gøre, fordi der ikke længere
     tegnes om i tomgang — tegnede vi alt om hvert minut, var
     alting "nyt". Aftrykket tager status og noten med, så et
     statusskifte fra en anden enhed også slår igennem. */
  var sidsteListeAftryk = '';
  var kendteIder = null;

  function hentBestillinger() {
    return Butik.hentBestillinger().then(function (liste) {
      bestillinger = liste || [];
      Admin.meld('bestillinger', bestillinger);

      var aftryk = JSON.stringify(bestillinger.map(function (b) {
        return [b.id, b.status, b.aendret || '', b.intern_note || ''];
      }));
      if (aftryk === sidsteListeAftryk) return;
      sidsteListeAftryk = aftryk;

      var nyeIder = [];
      if (kendteIder) {
        bestillinger.forEach(function (b) {
          if (kendteIder.indexOf(String(b.id)) === -1) nyeIder.push(String(b.id));
        });
      }
      kendteIder = bestillinger.map(function (b) { return String(b.id); });

      /* ⚠️ FØRSTE GANG LANDER MAN PÅ I DAG. Står man på "alle
         dage", når man logger ind, er det første, man ser, en
         liste med i går og i overmorgen imellem — og så skal
         man selv finde dagen. Kun første gang: skifter
         personalet dag, skal takten ikke rive dem tilbage. */
      if (foersteTegning) {
        foersteTegning = false;
        /* I dag — medmindre der ikke ER noget i dag, og der ligger
           noget forude. Så lander man på den nærmeste dag med
           noget på. En tom skærm på en stille tirsdag, hvor der
           venter fire bestillinger til lørdag, er et forkert
           førstehåndsindtryk — og banneret om de andre dage står
           der stadig, så man kan se hvorfor. */
        /* ⚠️ DET HUSKEDE VALG SLÅR BEGGE DELE (6/9). Kundens ord:
           *"it needs to be remembered."* Har personalet bladret
           tilbage til i går for at rette noget, og genindlæses
           siden, skal de lande dér igen — ikke rives tilbage til
           i dag. Kun resten af dagen; se husketDag(). */
        var husket = husketDag();
        if (husket) {
          visDato = husket.dato;
        } else {
          var idag = iDag();
          var harIDag = bestillinger.some(function (b) {
            return !b.slettet && b.hent_dato === idag;
          });
          var frem = bestillinger.filter(function (b) {
            return !b.slettet && b.hent_dato > idag;
          }).map(function (b) { return b.hent_dato; }).sort()[0];
          visDato = harIDag || !frem ? idag : frem;
        }
      }
      tegnAlt();

      /* Markeringen af det nye — briefens punkt 3. Det er dét,
         der gør, at man SER bestillingen lande, i stedet for at
         hele skærmen bare har hoppet. */
      nyeIder.forEach(function (id) {
        var kort = document.querySelector('.bestil-kort[data-id="' + id + '"]');
        if (kort) kort.classList.add('linje-ny');
      });
      Admin.hentet('bestil-hentet');
    }).catch(function (e) {
      /* Fejlen skjules IKKE. Står der ingenting, tror medarbejderen
         at der ikke er nogen bestillinger – og så møder en kunde op
         til en pose der ikke findes. */
      var boks = $('bestillinger-liste');
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Bestillingerne kunne ikke hentes: ' + (e.message || e)
        + ' Skærmen prøver igen af sig selv om et øjeblik — bliver den'
        + ' ved, så log ud og ind igen.'));
      if (window.console) console.warn('bestillinger:', e);
    });
  }

  // ---- Reglerne for bestilling ----
  function tegnBestilRegler() {
    var i = Admin.data.indstillinger || {};
    // Standard er ÅBEN. Er nøglen slet ikke i databasen – fordi
    // setup.sql ikke er kørt igen – skal formularen virke.
    $('bestil-aaben').checked = i.bestilling_aaben !== false;
    $('bestil-varsel-timer').value =
      i.bestilling_varsel_timer === undefined ? 24 : i.bestilling_varsel_timer;
    $('bestil-min-stk').value =
      i.bestilling_min_stk === undefined ? 1 : i.bestilling_min_stk;
    $('bestil-besked-tekst').value = i.bestilling_besked || '';
    /* ⚠️ TOM ER IKKE NUL. Skrev vi 0 i feltet, når nøglen mangler,
       ville et gem sende et nul videre — og nul betyder ganske vist
       "ingen grænse" i værnet, men feltet ville påstå, at ejeren
       havde truffet en beslutning, han aldrig traf. */
    $('bestil-luge-loft').value =
      i.luge_loft_pr_tid === undefined || i.luge_loft_pr_tid === null
        ? '' : i.luge_loft_pr_tid;
    visReglerNote(i);
  }

  /* ⚠️ ET LUKKET KORT SKAL STADIG SIGE DET VIGTIGSTE (30/8).

     Kortet foldes sammen nu, fordi det fylder en hel skærm med
     indstillinger, man rører et par gange om året. Men ÉN af dem
     er ikke sjælden: om der overhovedet tages imod bestillinger.
     Stod der bare "gælder på hjemmesiden med det samme", ville en
     lukket forretning se præcis ud som en åben — og det er dét,
     man skal kunne se på afstand, når man møder ind.

     Derfor siger noten tilstanden, og den siger LUKKET først:
     rækkefølgen er ikke tilfældig, for det er den ene tilstand,
     der koster penge. */
  function visReglerNote(i) {
    var note = $('bestil-regler-note');
    if (!note) return;
    i = i || (Admin.data && Admin.data.indstillinger) || {};

    if (i.bestilling_aaben === false) {
      note.textContent = '⛔ LUKKET for bestillinger';
      note.classList.add('note-lukket');
      return;
    }
    note.classList.remove('note-lukket');

    /* ⚠️ "Åben" ALENE ER FOR LIDT. Prøven fra 26/8 kræver, at et
       korthoveds note siger en KONSEKVENS — hvad kortet styrer ude
       på siden — og fire tegn siger ingenting til den, der skimmer
       en fane med fjorten kort. */
    var dele = ['Åben for bestillinger'];
    var t = i.bestilling_varsel_timer;
    if (t !== undefined && t !== null && Number(t) > 0) {
      dele.push(Number(t) === 24 ? 'et døgns varsel' : t + ' timers varsel');
    }
    var m = Number(i.bestilling_min_stk);
    if (isFinite(m) && m > 1) dele.push('mindst ' + m + ' stk. smørrebrød');
    /* ⚠️ KUN NÅR DEN ER SAT. Et "ingen grænse pr. tidsrum" på hvert
       eneste korthoved er støj — og så læses noten heller ikke den
       dag, den siger noget. Samme regel som baglokalets ⚠️-kort. */
    var l = Number(i.luge_loft_pr_tid);
    if (isFinite(l) && l > 0) dele.push('højst ' + l + ' pr. tidsrum');
    if (i.levering) dele.push('leverer');

    note.textContent = dele.join(' · ');
  }

  /* Tjek og skrivning ét sted, så knappen og autogem ikke kan
     komme til at gøre to forskellige ting. En TEKST betyder
     "ikke færdig endnu". */
  function samlRegler() {
    var timer = Number($('bestil-varsel-timer').value);
    var min = Number($('bestil-min-stk').value);
    /* ⚠️ TOMT FELT SENDES SOM TOM STRENG, ikke som 0. Værnet læser
       nøglen med nullif(btrim(...), '') — tom, nul og negativ er
       alle "intet loft", men KUN den tomme siger "ejeren har ikke
       taget stilling". */
    var loftTekst = String($('bestil-luge-loft').value).trim();
    var loft = Number(loftTekst);

    if (!isFinite(timer) || timer < 0 || timer > 720) {
      return 'Varslet skal være mellem 0 og 720 timer.';
    }
    if (!isFinite(min) || min < 1 || min > 500) {
      return 'Mindste antal skal være mellem 1 og 500.';
    }
    if (loftTekst !== '' && (!isFinite(loft) || loft < 0 || loft > 500)) {
      return 'Antallet pr. tidsrum skal være mellem 0 og 500 — eller tomt.';
    }

    return Butik.skrive.indstilling('bestilling_aaben', $('bestil-aaben').checked)
      .then(function () {
        return Butik.skrive.indstilling('bestilling_varsel_timer', Math.round(timer));
      })
      .then(function () {
        return Butik.skrive.indstilling('bestilling_min_stk', Math.round(min));
      })
      .then(function () {
        return Butik.skrive.indstilling('luge_loft_pr_tid',
          loftTekst === '' ? '' : Math.round(loft));
      })
      .then(function () {
        return Butik.skrive.indstilling('bestilling_besked',
          $('bestil-besked-tekst').value.trim());
      });
  }

  $('gem-bestil-regler').addEventListener('click', function () {
    var svar = samlRegler();
    if (typeof svar === 'string') return Admin.brøl(svar);
    Admin.gem(svar, 'Reglerne for bestilling er gemt.');
  });

  /* ⚠️ "Tag imod bestillinger" er et flueben, der lukker
     forretningens dør. Sat uden et tryk på Gem ville lugen tro,
     der var lukket for bestillinger — og siden tage imod. */
  Admin.autogem($('gem-bestil-regler').closest('.kort'), samlRegler);

  Admin.tegnere.push(tegnBestilRegler);
  /* Om gæsten kan vælge "spis her". TIL som standard — se noten
     ved visHvordan() i js/bestilling.js: forretningen skal kunne
     begge dele. Fluebenet er måden at slå det FRA på, den dag
     køkkenet ikke kan nå at servere forudbestilt mad ved bordene. */
  function tegnSpisHer() {
    var felt = $('spis-her');
    if (!felt) return;
    felt.checked = (Admin.data.indstillinger || {}).spis_her !== false;
  }

  $('spis-her').addEventListener('change', function () {
    var til = $('spis-her').checked;
    Admin.gem(Butik.skrive.indstilling('spis_her', til),
      til ? 'Gæsten kan nu vælge at spise her.'
          : 'Gæsten kan ikke længere vælge at spise her — alt er afhentning.');
  });

  Admin.tegnere.push(tegnSpisHer);

  /* Om gæsten kan vælge levering på smørrebrødssiden.
     FRA som standard — og det er med vilje modsat spis_her.

     Vi ved ikke, om forretningen leverer, hvor langt de kører,
     eller hvad det koster. Ingen af delene er bekræftet, se
     listen "Ejeren skal bekræfte" i README. En side, der
     tilbyder levering, fordi ingen har sagt nej, lover noget på
     forretningens vegne. Derfor === true: en database uden
     nøglen viser hakket TOMT. */
  function tegnLevering() {
    var felt = $('levering');
    if (!felt) return;
    var ind = Admin.data.indstillinger || {};
    felt.checked = ind.levering === true;

    /* ⚠️ OMRÅDET ER EJERENS FAKTA, IKKE EN LINJE I KODEN.
       Mikkel oplyste 27/8: Karslunde, Greve, Tune, Solrød og
       omegn. Skrevet i koden ville hver ny by være en udgivelse
       hos os. Samme princip som fluebenet ved siden af:
       beslutningen bor i indstillinger.

       Feltet røres ikke, mens nogen skriver i det — takten
       tegner om hvert minut, og en optegning midt i en sætning
       river teksten ud under fingeren. Samme greb som noten på
       køreplanen. */
    [['leverings-omraade', 'leverings_omraade'],
     ['leverings-pris', 'leverings_pris']].forEach(function (p) {
      var f = $(p[0]);
      if (f && document.activeElement !== f) f.value = ind[p[1]] || '';
    });
  }

  if ($('levering')) {
    $('levering').addEventListener('change', function () {
      var til = $('levering').checked;
      Admin.gem(Butik.skrive.indstilling('levering', til),
        til ? 'Gæsten kan nu bede om levering af smørrebrød ud af huset. '
            + 'I ringer og bekræfter hver gang — siden lover ingen pris.'
            : 'Levering er slået fra. Alt smørrebrød ud af huset hentes.');
    });
  }

  /* ⚠️ HVERT FELT HAR SIN EGEN AUTOGEM. Ét mærke på den fælles
     .felt-par ville sige "Gemt", når man forlod det ENE felt, og
     så ville man tro, at begge var gemt. */
  [['leverings-omraade', 'leverings_omraade'],
   ['leverings-pris', 'leverings_pris']].forEach(function (p) {
    var felt = $(p[0]);
    if (!felt) return;
    Admin.autogem(felt.closest('.felt'), function () {
      var v = felt.value;
      if ((Admin.data.indstillinger || {})[p[1]] === v) return null;
      return Butik.skrive.indstilling(p[1], v);
    });
  });

  Admin.tegnere.push(tegnLevering);

  /* Grundprincippet — "bestillingen er accepteret; kan køkkenet
     ikke lave den, ringer de" — er ejerens valg, ikke vores.
     TIL som standard. Se noten i admin.html. */
  function tegnAutoBekraeft() {
    var felt = $('auto-bekraeft');
    if (!felt) return;
    /* !== false og ikke === true: kontakten er slået TIL som
       standard (kundens ord 23/8), så en database uden nøglen
       skal vise hakket sat. Se noten i js/bestilling.js. */
    felt.checked = (Admin.data.indstillinger || {}).auto_bekraeft !== false;
  }

  if ($('auto-bekraeft')) {
    $('auto-bekraeft').addEventListener('change', function () {
      var til = $('auto-bekraeft').checked;
      Admin.gem(Butik.skrive.indstilling('auto_bekraeft', til),
        til ? 'Bestillinger bekræftes automatisk nu. Kan I ikke lave en, ringer I.'
            : 'Bestillinger bekræftes med et opkald igen.');
    });
  }

  Admin.tegnere.push(tegnAutoBekraeft);
  Admin.vedLogin.push(function () { return hentUdeblivelser().then(hentBestillinger); });
  Admin.friske.push(hentBestillinger);
})();
