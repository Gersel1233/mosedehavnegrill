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
  function gem(løfte, besked) {
    return løfte
      .then(function () { return genindlæs(); })
      .then(function () { kvitter(besked); })
      .catch(function (e) { brøl(e.message || String(e)); });
  }

  /* Hver fanefil lægger sin tegnefunktion herind når den
     indlæses. genindlæs() kender dermed ingen faner ved navn, og
     en ny fane er én ny fil – ikke en rettelse tre steder. */
  var tegnere = [];

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
    Array.prototype.forEach.call(document.querySelectorAll('.faner button'), function (x) {
      x.setAttribute('aria-selected', x.dataset.panel === panelId ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.panel'), function (p) {
      p.classList.toggle('skjult', p.id !== panelId);
    });
    /* Først når panelet ER synligt: hentningerne tegner ind i
       felter, og en tegning i et skjult panel koster layout uden
       at nogen ser den. */
    if (vedFane[panelId] && !$('admin').classList.contains('skjult')) {
      vedFane[panelId].forEach(function (hent) { hent(); });
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('.faner button'), function (b) {
    b.addEventListener('click', function () { visFane(b.dataset.panel); });
  });

  window.Admin = {
    $: $,
    tøm: tøm,
    lav: lav,
    kvitter: kvitter,
    brøl: brøl,
    gem: gem,
    genindlæs: genindlæs,
    tegnere: tegnere,
    vedLogin: vedLogin,
    /* Hentninger, der skal gentages, når admin holder sig selv
       frisk (js/admin/frisk.js): kun LISTERNE — det, gæsterne
       skriver i. Åbningstider og menukort ændrer sig ikke af sig
       selv og skal ikke hentes hvert minut. */
    friske: [],
    hentVedFane: hentVedFane,
    hentet: hentet,
    visFane: visFane,
    meld: meld,
    lister: lister,
    efterHent: efterHent,
    pænDato: pænDato,
    data: null,
  };
})();
