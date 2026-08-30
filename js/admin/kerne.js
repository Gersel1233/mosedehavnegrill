/* ------------------------------------------------------------
   Personalets side: grundstammen.

   Admin lå før som 800 linjer i ét <script> i admin.html. Det er
   delt op i js/admin/ med én fil pr. fane, så fase 2 kan lægge en
   ny fane til som en ny fil i stedet for at gøre én blok længere.

   To principper gælder i ALLE filerne herinde:

   1) Intet gemmes uden at være tjekket først. Formularen tjekker,
      JavaScript tjekker, og databasen tjekker. Det sidste lag kan
      ikke omgås – men de to første findes for at give et svar på
      dansk i stedet for en rå SQL-fejl.

   2) Alt der kommer fra databasen sættes ind med textContent.
      Aldrig innerHTML.

   Filerne deler navnerummet Admin og indlæses i rækkefølge:
   kerne.js først, login.js sidst. Rækkefølgen står i admin.html,
   og den er ikke valgfri – fanefilerne skriver sig ind i
   Admin.tegnere, og login.js er den der trykker på startknappen.
   ------------------------------------------------------------ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function tøm(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = String(tekst);
    return e;
  }

  // ----------------------------------------------------------
  //  Beskeder til brugeren
  // ----------------------------------------------------------
  function kvitter(t) {
    $('fejl').classList.add('skjult');
    var k = $('kvittering');
    k.textContent = t;
    k.classList.remove('skjult');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    clearTimeout(kvitter._t);
    kvitter._t = setTimeout(function () { k.classList.add('skjult'); }, 4000);
  }

  function brøl(t) {
    $('kvittering').classList.add('skjult');
    var f = $('fejl');
    f.textContent = t;
    f.classList.remove('skjult');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Gemmer, kvitterer, henter data igen. Fejler det, siger vi
  // hvorfor i stedet for at lade som om det gik godt.
  /* ============================================================
     EN FEJL, PERSONALET KAN GØRE NOGET VED  (28/8)
     ------------------------------------------------------------
     MÅLT i produktionen: en nyhed kunne ikke lægges op, og
     skærmen viste

       Kunne ikke gemme (400). {"code":"PGRST204","details":null,
       "hint":null,"message":"Could not find the 'vis_fra' column
       of 'nyheder' in the schema cache"}

     Det er en rå JSON-blok til en udvikler. Ejeren står med en
     iPad og skal lægge en nyhed op, og der er ikke ét ord om, at
     svaret er en SQL-fil, han selv skal køre.

     ⚠️ OVERSÆTTELSEN GÆTTER IKKE. Databasen skriver selv, HVILKEN
     kolonne og hvilken tabel der mangler; vi slår kun op, hvilken
     fil der lægger den kolonne ind. Kender vi ikke kolonnen,
     siger vi tabellen og lader den rå besked stå — en opfundet
     filnavn ville sende nogen ud at lede efter en fil, der ikke
     findes.

     Samme greb som i js/admin/koekken.js, hvor
     bestilling_status_ok oversættes til "Kør
     supabase/restaurant.sql". Det står ét sted nu, så alle faner
     får det samme svar. */
  var KOLONNE_FIL = {
    'nyheder.vis_fra': 'nyheder-fra-til.sql',
    'nyheder.vis_til': 'nyheder-fra-til.sql',
    'nyheder.slags': 'nyheder-slags-og-billede.sql',
    'nyheder.detaljer': 'nyheder-slags-og-billede.sql',
    'nyheder.billede': 'nyheder-slags-og-billede.sql',
    'menu_varer.antal_tilbage': 'menukort-antal-og-dage.sql',
    'menu_kategorier.dage': 'menukort-antal-og-dage.sql',
    'menu_kategorier.note': 'menukort-ejerens-liste.sql',
    'bestillinger.hvordan': 'spis-her.sql',
    'bestillinger.bord_nummer': 'bordkort.sql',
    'bestillinger.adresse': 'levering.sql',
    'forespoergsler.detaljer': 'forespoergsel-kalender.sql',
  };

  function forklarFejl(e) {
    var raa = (e && e.message) || String(e);
    /* Databasens egen ordlyd: Could not find the 'X' column of
       'Y' in the schema cache. Den kommer fra PostgREST og er
       stabil på tværs af versioner. */
    var m = /Could not find the '([^']+)' column of '([^']+)'/.exec(raa);
    if (!m) return raa;

    var kolonne = m[1];
    var tabel = m[2];
    var fil = KOLONNE_FIL[tabel + '.' + kolonne];

    return 'Databasen kender ikke feltet "' + kolonne + '" på ' + tabel + ' endnu.'
      + (fil
        ? ' Kør supabase/' + fil + ' i Supabase — så virker det.'
        : ' Der mangler en SQL-fil, som ikke er kørt i Supabase endnu.')
      + ' Indtil da kan resten af fanen bruges som før.';
  }

  function gem(løfte, besked) {
    return løfte
      .then(function () { return genindlæs(); })
      .then(function () { kvitter(besked); })
      .catch(function (e) { brøl(forklarFejl(e)); });
  }

  /* ============================================================
     AUTOGEM: DET SKREVNE MÅ IKKE KUNNE GÅ TABT
     ------------------------------------------------------------
     Der var otte Gem-knapper i admin — åbningstider, tavlen,
     sæsonen, reglerne, pladserne, nøglen, kontakten, dagens ret.
     En travl medarbejder, der retter tavlen kl. 11.55 og går uden
     at trykke, har rettet INGENTING. Det opdages om onsdagen.

     TO LYTTERE, OG DEN ANDEN ER DEN VIGTIGE:

     · 'change' gemmer STRAKS. Den fyrer, når feltet forlades
       eller der vælges i en liste — og det er dét, der fanger
       den, der taster og går.
     · 'input' gemmer 1,2 sekund efter sidste tastetryk. Den er
       ekstraen, for den, der skriver og bliver stående.

     ⚠️ DEN GEMMER STILLE. Admin.gem henter data igen og tegner
     ALLE faner om — og en optegning midt i en sætning river
     feltet ud af siden under fingeren. Præcis den fejl kostede en
     halv sætning og en uønsket kvittering, da noten på et
     bestillingskort gemte ved 'change' (se tegnRaekker ovenfor).
     Autogem skriver derfor kun til databasen. Skærmen viser
     allerede det, der blev skrevet, og næste rigtige gem eller
     genindlæsning henter det hjem.

     Knapperne bliver stående. De skal bare ikke være det eneste,
     der virker — og trykker man på dem, får man den fulde
     kvittering og en optegning som før.

     gem() returnerer:
       · et løfte  → der gemmes
       · en tekst  → feltet er ikke færdigt endnu; teksten vises
       · falsk     → der er ikke noget at gemme
     ============================================================ */
  function autogem(rod, gem) {
    if (!rod) return;

    var maerke = lav('span', 'gemt-maerke');
    maerke.setAttribute('aria-live', 'polite');
    rod.appendChild(maerke);

    var timer = null;
    var sidst = 0;

    function sig(tekst, fejl) {
      maerke.textContent = tekst;
      maerke.classList.toggle('gemt-fejl', !!fejl);
    }

    function skriv() {
      var svar;
      try { svar = gem(); } catch (e) { return sig('⚠ ' + (e.message || e), true); }
      if (!svar) return;
      if (typeof svar === 'string') return sig('⚠ ' + svar, true);

      svar.then(function () {
        /* Spærre på kvitteringen: uden den blinker "Gemt" ved
           hvert eneste tastetryk, og så holder man op med at se
           den — også den dag, den ikke kommer. */
        var nu = Date.now();
        if (nu - sidst < 2000) return;
        sidst = nu;
        sig('✓ Gemt');
      }).catch(function (e) {
        sig('⚠ Ikke gemt: ' + (e.message || e), true);
      });
    }

    function relevant(el) {
      return el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
    }

    rod.addEventListener('change', function (e) {
      if (!relevant(e.target)) return;
      clearTimeout(timer);
      skriv();
    });
    rod.addEventListener('input', function (e) {
      if (!relevant(e.target)) return;
      clearTimeout(timer);
      timer = setTimeout(skriv, 1200);
    });
  }

  /* Hver fanefil lægger sin tegnefunktion herind når den
     indlæses. genindlæs() kender dermed ingen faner ved navn, og
     en ny fane er én ny fil – ikke en rettelse tre steder. */
  var tegnere = [];

  /* Kaldes EFTER et faneskift med panelets id. Bundbjælken på
     telefonen hænger på den: dens knapper er genveje og ikke
     fanerne selv, så den kan ikke se skiftet af sig selv. */
  var efterFane = [];

  /* Det samme for de faner, der henter deres egne data ved login.
     Bestillinger og forespørgsler hentes for sig, fordi kun chefen
     må læse dem, og et 401 dér ikke må vælte åbningstider og
     menukort med sig.

     Listen kom til, da fane nummer to skulle med: login.js kaldte
     hentBestillinger() ved navn, og så ville hver ny fane kræve en
     rettelse dér. Det er præcis den kobling, opdelingen skulle af
     med — den flyttede bare fra admin.html til login.js. */
  var vedLogin = [];

  /* FINGERAFTRYKKET — briefens punkt 1 (23/8), og det var målbart
     her: frisk.js henter hvert minut, og hver hentning tegnede
     ALLE faner om, uanset om noget var ændret. Skærmen hoppede 59
     gange i timen med ingenting. Nu sammenlignes de hentede data
     med sidste hentning, og er de ens, tegnes der INGENTING — så
     står skærmen bomstille en hel vagt, indtil noget faktisk sker.

     Efter et GEM tegnes der altid: Admin.gem går gennem genindlæs,
     og dér HAR data ændret sig, så aftrykket er nyt af sig selv. */
  var sidsteAftryk = '';

  function genindlæs() {
    return Butik.hent().then(function (d) {
      Admin.data = d;
      var aftryk = JSON.stringify(d);
      if (aftryk === sidsteAftryk) return;
      sidsteAftryk = aftryk;
      tegnere.forEach(function (tegn) { tegn(); });
    });
  }

  /* TEGN EN LISTE UDEN AT RIVE DE RÆKKER NED, DER IKKE HAR
     ÆNDRET SIG — briefens punkt 1, delpunkt 2 (23/8).

     Fingeraftrykket ovenfor stoppede tegningen, når INTET var
     ændret. Men når ét kort ændrer sig — og på en travl vagt gør
     der ét hvert andet minut — blev hele listen revet ned og
     bygget op igen. Det koster mere end et hop på skærmen:

     Noten på hvert kort gemmes ved 'change', altså når feltet
     FORLADES. Rives feltet ud af siden, mens nogen skriver i det,
     mister markøren sit felt, og de næste bogstaver lander
     ingen steder. MÅLT i Chromium: browseren fyrer et 'change'
     på vejen ud, så den halve sætning bliver gemt af sig selv —
     med en kvittering, ingen bad om, og en linje i logbogen.
     Andre browsere fyrer det ikke, og så er sætningen bare væk.
     Personalet står med en iPad i køkkenet; vi ved ikke, hvilken
     af de to fejl de får.

     Derfor: hver række har en nøgle og et aftryk. Er aftrykket
     det samme som sidst, bliver knuden STÅENDE — den røres
     ikke, og så kan hverken markør, tekst eller rullehøjde gå
     tabt. Kun det, der faktisk har ændret sig, bygges om.

     Rækkefølgen holdes med en markør ned gennem de knuder, der
     allerede står der: en ny række skydes ind foran markøren,
     og de gamle bagved bliver liggende, hvor de er. En knude
     flyttes derfor kun, hvis rækkefølgen SELV har ændret sig.

     raekker: [{ noegle, aftryk, byg }] — byg() kaldes kun, når
     rækken faktisk skal tegnes. */
  function tegnRaekker(boks, raekker) {
    if (!boks) return;

    var haves = {};
    Array.prototype.forEach.call(boks.children, function (n) {
      var noegle = n.getAttribute('data-raekke');
      if (noegle) haves[noegle] = n;
    });

    var plads = boks.firstChild;

    raekker.forEach(function (r) {
      var gammel = haves[r.noegle];
      var uændret = !!gammel && gammel.getAttribute('data-aftryk') === r.aftryk;
      var knude = gammel;

      if (!uændret) {
        knude = r.byg();
        knude.setAttribute('data-raekke', r.noegle);
        knude.setAttribute('data-aftryk', r.aftryk);
        /* Markøren skal videre FØR den gamle knude fjernes –
           ellers peger den på noget, der ikke er i siden mere,
           og insertBefore kaster. */
        if (plads === gammel) plads = plads.nextSibling;
        if (gammel && gammel.parentNode === boks) boks.removeChild(gammel);
      }

      if (knude === plads) plads = plads.nextSibling;
      else boks.insertBefore(knude, plads);      // plads = null: bagerst
    });

    /* Alt fra markøren og frem hørte til den gamle liste og er
       ikke med i den nye. */
    while (plads) {
      var næste = plads.nextSibling;
      boks.removeChild(plads);
      plads = næste;
    }
  }

  var MAANEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

  /* Datoformatet for hele admin: "I DAG · Fredag 7. august".

     Der VAR to pænDato i den gamle inline-udgave – én til
     lukkedage med årstal, én til bestillinger uden. De lå i samme
     scope, så den sidste vandt ved hoisting, og det var altid
     denne udgave der kørte. Den anden var død kode og er ikke
     flyttet med: to næsten ens datofunktioner er præcis den slags
     dubletter der skrider fra hinanden. */
  function pænDato(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    var ugedag = (d.getUTCDay() + 6) % 7;          // 0 = mandag, som Butik
    var foran = iso === Butik.nu().dato ? 'I DAG · ' : '';
    return foran + Butik.UGEDAGE[ugedag] + ' ' + Number(iso.slice(8, 10))
      + '. ' + MAANEDER[Number(iso.slice(5, 7)) - 1];
  }

  /* Fanernes egne lister, meldt ind af hver fanefil.

     Overblik skal vise, hvad der er tikket ind på tværs af
     bestillinger og forespørgsler, og det må ikke koste et kald
     mere: fanerne har allerede hentet det. De melder derfor deres
     liste ind her, og alle, der er interesserede, får besked.

     Det holder ejerskabet, hvor det hører hjemme — ingen fane
     læser en andens variabler — og Overblik kender stadig ingen
     fane ved navn. Den spørger til lister, ikke til faner. */
  var lister = {};
  var efterHent = [];

  function meld(navn, liste) {
    lister[navn] = liste || [];
    efterHent.forEach(function (f) { f(); });
  }

  /* "HENTET KL. 14.32" — den lille linje under hver liste.

     Den stod som en kvittering ved siden af knappen "Hent på ny".
     Knappen er væk (se noten ved vedFane herunder), og så er
     linjen ikke længere en kvittering for et tryk: den er svaret
     på "står jeg og kigger på noget gammelt?". Derfor er den
     flyttet ind i ét sted, så alle fanerne skriver den ens. */
  function hentet(id) {
    var felt = $(id);
    if (!felt) return;
    var t = Butik.nu();
    felt.textContent = 'Opdateret kl. '
      + ('0' + Math.floor(t.minutter / 60)).slice(-2) + '.'
      + ('0' + (t.minutter % 60)).slice(-2);
  }

  /* HENTNINGER, DER HØRER TIL ÉN FANE.

     "Hent på ny" stod seks steder i admin, og kunden bad om at få
     dem væk: skærmen skal opdatere sig selv. De fire lister,
     gæsterne skriver i, hentes allerede af sig selv (Admin.friske
     + js/admin/frisk.js + den direkte forbindelse i live.js).

     Tilbage stod skraldespanden, logbogen og salget. De skal IKKE
     hentes hvert minut i baggrunden — de ændrer sig kun, når
     personalet selv gør noget, og en logbog, der hentes 480 gange
     på en vagt, er trafik uden et øje på skærmen. Til gengæld skal
     de være friske i det sekund, fanen åbnes. Derfor: fanen melder
     sin hentning ind her, og visFane trykker på den.

     Det er samtidig dét, der gør knappen overflødig — man skiftede
     jo alligevel til fanen for at trykke på den.

     En LISTE pr. fane og ikke én funktion: skraldespanden og
     logbogen deler panelet p-historik, og med ét felt pr. fane
     ville den ene fil overskrive den anden — den, der blev
     indlæst sidst, ville vinde, og den anden ville aldrig hente.
     Det er den slags, der kun opdages, når nogen undrer sig over
     en logbog, der står stille. */
  var vedFane = {};

  function hentVedFane(panelId, hent) {
    if (!vedFane[panelId]) vedFane[panelId] = [];
    vedFane[panelId].push(hent);
  }

  // ----------------------------------------------------------
  //  Faner
  // ----------------------------------------------------------
  function visFane(panelId) {
    var valgt = null;
    Array.prototype.forEach.call(document.querySelectorAll('.faner button'), function (x) {
      var erValgt = x.dataset.panel === panelId;
      x.setAttribute('aria-selected', erValgt ? 'true' : 'false');
      if (erValgt) valgt = x;
    });

    /* DEN VALGTE SKAL KUNNE SES.

       På en telefon ligger fanerne i en stribe, der ruller
       sidelæns i bunden (se css/style.css) — fjorten punkter kan
       ikke stå på 390 px. Skiftes fane fra et kort i overblikket,
       kan den, der bliver valgt, ligge uden for kanten: skærmen
       skifter, men striben viser stadig Overblik som markeret, og
       personalet kan ikke se hvor de er.

       scrollIntoView med inline: 'nearest' flytter KUN, hvis den
       faktisk ligger uden for — ellers ville striben hoppe ved
       hvert eneste faneskift. block: 'nearest' er lige så vigtig:
       uden den ruller hele SIDEN ned til den faste stribe. */
    if (valgt && valgt.scrollIntoView) {
      try {
        valgt.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      } catch (e) { /* ældre browsere: striben står bare som den gjorde */ }
    }
    Array.prototype.forEach.call(document.querySelectorAll('.panel'), function (p) {
      p.classList.toggle('skjult', p.id !== panelId);
    });

    /* HVILKEN FANE ER FREMME? Skrevet på <body>, så et stilark kan
       give ÉN fane mere plads end de andre.

       Menukortet er en tabel med ti kolonner og 242 rækker; en
       indstillingsside er fire felter. 1180 px er rigtigt for den
       ene og for lidt for den anden — målt: varerækken blev 1012
       px, indholdet krævede 1136, og hver eneste række brød om til
       to linjer.

       ⚠️ EN KLASSE OG IKKE :has() I STILARKET. Den skal kunne ses
       i opmærkningen — både af en prøve og af den, der fejlsøger i
       en konsol. Samme grund som udsolgt-vare på varerækken. */
    document.body.className = document.body.className
      .split(/\s+/).filter(function (c) { return c && c.indexOf('fane-') !== 0; })
      .concat('fane-' + panelId).join(' ');

    /* SIDENS NAVN ER DEN VALGTE FANES NAVN.

       Overskriften står ét sted og skrives herfra, så en ny fane
       ikke skal huskes to gange. Teksten tages af knappen selv og
       ikke af en liste over panelnavne: en liste ville skride fra
       fanerne den dag, en fane bliver omdøbt, og så ville
       overskriften sige noget andet end det, man trykkede på.

       Ikonet og et eventuelt tal skal IKKE med — "🥪 Bestillinger
       4" er ikke en overskrift. */
    var titel = $('fane-titel');
    var navn = '';
    if (valgt) {
      Array.prototype.forEach.call(valgt.childNodes, function (n) {
        if (n.nodeType === 3) navn += n.nodeValue;
      });
      navn = navn.trim() || valgt.textContent.trim();
      if (titel) titel.textContent = navn;
    }

    /* PANELETS FØRSTE OVERSKRIFT SAGDE DET SAMME IGEN.

       "MENUKORT" i hovedet og "MENUKORT" i kortet lige nedenunder
       — to gange det samme ord, hver gang man skifter fane.

       Den skjules kun fra 900 px og op (se .dobbelt-titel i
       css/style.css): på en telefon er der ikke noget hoved, og
       dér er h2'en panelets eneste titel. Derfor SKJULES den og
       fjernes ikke — og derfor slås klassen fra igen, når den
       ikke passer. */
    var panel = $(panelId);
    var foerste = panel && panel.querySelector('.h-panel');
    if (foerste) {
      foerste.classList.toggle('dobbelt-titel',
        foerste.textContent.trim().toLowerCase() === navn.toLowerCase());
    }
    /* Først når panelet ER synligt: hentningerne tegner ind i
       felter, og en tegning i et skjult panel koster layout uden
       at nogen ser den. */
    if (vedFane[panelId] && !$('admin').classList.contains('skjult')) {
      vedFane[panelId].forEach(function (hent) { hent(); });
    }

    /* ⚠️ DEM, DER SKAL VIDE, HVILKEN FANE DER ER FREMME.

       Bundbjælken på telefonen markerer den valgte fane, og den
       kan ikke selv se, at der blev skiftet — knapperne i baren
       er genveje, ikke fanerne selv. Listen er tom på computer;
       dér findes bjælken ikke. */
    Admin.efterFane.forEach(function (f) {
      try { f(panelId); } catch (e) { if (window.console) console.warn(e); }
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.faner button'), function (b) {
    b.addEventListener('click', function () { visFane(b.dataset.panel); });
  });

  /* Datoen under overskriften. Den skrives ÉN gang: en dato, der
     ikke ændrer sig i løbet af en vagt, skal ikke tegnes om ved
     hvert faneskift. */
  (function () {
    var felt = $('fane-dato');
    if (!felt) return;
    var iso = Butik.nu().dato;
    var ugedag = Butik.UGEDAGE[(new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7];
    felt.textContent = ugedag + ' d. ' + Number(iso.slice(8, 10)) + '. '
      + MAANEDER[Number(iso.slice(5, 7)) - 1] + ' ' + iso.slice(0, 4);
  }());

  /* ER DET EN TAPASBESTILLING?

     Tapasfadet skal ses med det samme: det er ikke en pose, der
     rækkes ud af lugen, men et fad, der skal bygges — og ejeren
     har sagt, at gæsten skal ringe om indholdet. Står den som en
     almindelig bestilling mellem tredive andre, opdager køkkenet
     den, når der er to timer til.

     Kendingen er varens NAVN og ikke en ny kolonne: fadet er en
     vare på menukortet som alt andet, og en kolonne mere i
     databasen ville skulle vedligeholdes af nogen. Hedder varen
     noget med tapas, ER det tapas — sådan hedder den i ejerens
     eget kort. */
  function erTapas(b) {
    return (b && b.linjer || []).some(function (l) {
      return /tapas/i.test(String(l && l.navn || ''));
    });
  }

  /* ER DER EN ALLERGI PÅ BESTILLINGEN?

     Gæsten skriver den i sit eget felt, og js/bestilling.js
     sætter ordet ALLERGI: foran beskeden. Kendingen er DET ord.

     ⚠️ DEN BOR HER, FORDI DEN BRUGES TO STEDER. Køkken-køen har
     haft den røde ramme siden 25/8; Bestillinger og Overblik
     havde ingenting — og det er den SAMME oplysning om den samme
     gæst. To udgaver af "er det en allergi?" er én for meget:
     rettes ordet det ene sted og glemmes det andet, holder én
     skærm op med at advare, og det ses ikke, før nogen bliver
     syg. */
  function erAllergi(b) {
    return /^\s*ALLERGI:/i.test(String(b && b.besked || ''));
  }

  /* ============================================================
     DEN SAMME GÆST TO STEDER  (29/8)
     ------------------------------------------------------------
     Kundens spørgsmål: Lone bestiller to burgere til kl. 14 på
     hjemmesiden — den står i Bestillinger, personalet ser den.
     Så kommer hun ned, får et bord, scanner QR-koden og bestiller
     dér. Nu ligger hun BÅDE i Bestillinger og i Køkken-køen.
     "Hvad gør man der, og er det personalet eller systemet?"

     ⚠️ SVARET ER BEGGE DELE, OG SYSTEMET HAR DEN LETTE HALVDEL.

     Systemet kan IKKE vide, om de to er den samme mad bestilt to
     gange (hun var i tvivl, om den første gik igennem) eller to
     runder (frokost nu, is bagefter). At slå dem sammen ville
     slette en rigtig anden bestilling; at afvise den anden ville
     spærre for et bord, der bare vil have mere.

     Men systemet KAN se, at det er den samme gæst — telefonen er
     påkrævet på begge — og sige det, mens personalet står med
     begge skærme. Det er den samme beslutning som "2 vil have
     lørdag den 12." på Baglokalet: vi peger, mennesket dømmer.

     ⚠️ NUMMERET SAMMENLIGNES PÅ CIFRENE. "+45 41 31 41 60" og
     "41314160" er den samme telefon, og en sammenligning på
     teksten ville aldrig finde noget. De sidste otte cifre er
     nøglen: landekoden skrives med og uden. */
  function tlfNoegle(t) {
    var cifre = String(t || '').replace(/\D/g, '');
    return cifre.length > 8 ? cifre.slice(-8) : cifre;
  }

  /* Andre ÅBNE bestillinger fra det samme nummer den samme dag.
     Kun det åbne: en afhentet frokost er ikke en dublet, den er
     en frokost, gæsten har fået. */
  var FAERDIGE = {
    afhentet: true, afvist: true, udeblevet: true, serveret: true,
  };

  function sammeGaest(b) {
    var noegle = tlfNoegle(b && b.telefon);
    if (!noegle || noegle.length < 6) return [];
    return (lister.bestillinger || []).filter(function (x) {
      return String(x.id) !== String(b.id)
        && !x.slettet
        && !FAERDIGE[x.status]
        && x.hent_dato === b.hent_dato
        && tlfNoegle(x.telefon) === noegle;
    });
  }

  window.Admin = {
    $: $,
    tøm: tøm,
    lav: lav,
    kvitter: kvitter,
    brøl: brøl,
    forklarFejl: forklarFejl,
    gem: gem,
    genindlæs: genindlæs,
    tegnere: tegnere,
    efterFane: efterFane,
    tegnRaekker: tegnRaekker,
    vedLogin: vedLogin,
    /* Hentninger, der skal gentages, når admin holder sig selv
       frisk (js/admin/frisk.js): kun LISTERNE — det, gæsterne
       skriver i. Åbningstider og menukort ændrer sig ikke af sig
       selv og skal ikke hentes hvert minut. */
    friske: [],
    hentVedFane: hentVedFane,
    autogem: autogem,
    hentet: hentet,
    visFane: visFane,
    meld: meld,
    lister: lister,
    efterHent: efterHent,
    pænDato: pænDato,
    erTapas: erTapas,
    erAllergi: erAllergi,
    sammeGaest: sammeGaest,
    tlfNoegle: tlfNoegle,
    data: null,
  };
})();
