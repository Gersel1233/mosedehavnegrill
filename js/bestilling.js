/* ============================================================
   BESTIL SMØRREBRØD UD AF HUSET

   Det er den eneste formular på hele hjemmesiden, og den er den
   eneste ting en gæst skriver i databasen.

   ------------------------------------------------------------
   DET ER EN BESTILLING, IKKE EN WEBSHOP
   ------------------------------------------------------------
   Der betales ikke her. Det er ikke en mangel, det er det ærlige:
   forretningen har ikke oplyst hvordan man betaler på forhånd,
   hvor lang tid i forvejen der skal bestilles, om der er et
   mindsteantal, eller om der leveres. Fire ting vi ikke ved.

   Så gæsten sender hvad hun gerne vil have og hvornår, og
   forretningen ringer og bekræfter. Det er den samme aftale som
   før, bare uden at nogen skal fange nogen i telefonen midt i en
   frokost. Betaling sker ved afhentning – kontant, kort og
   MobilePay, som står på siden i forvejen.

   Varslet (24 timer) og mindsteantallet (1) står i indstillinger
   og kan rettes i admin. De er UDGANGSPUNKTER formularen skal have
   for at kunne regne en tidligste dag ud – ikke oplysninger vi har
   fået. Retter ejeren dem, følger teksten på siden med af sig selv.

   ------------------------------------------------------------
   TO SLAGS VALG, FORDI KORTET ER SKRUET SÅDAN SAMMEN
   ------------------------------------------------------------
   Kategorien "Smørrebrød" har fem slags MED pris. Kategorien
   "Vælg fyld til smørrebrødet" har 29 slags UDEN pris, for et fyld
   er ikke en vare man køber – det er hvad der skal ligge på
   stykket.

   Derfor: stykker med antal og pris øverst, fyld som ønsker
   nedenunder. Havde de ligget i samme kurv, ville fire stykker med
   tre slags fyld være blevet syv stykker, og personalet ville
   pakke forkert.
   ============================================================ */

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

  /* Kurven ligger i localStorage. Genindlæser man siden – eller
     trykker på et link og går tilbage – skal man ikke vælge otte
     stykker smørrebrød forfra. Kun valgene, ikke navn og telefon:
     personoplysninger skal ikke ligge i en browser længere end de
     skal. */
  var KURV_NOEGLE = 'mosede_kurv_v1';

  /* hvordan er MED fra fødslen — 'afhentning' er To-go, og spiis'
     form står med To-go forvalgt. Før manglede feltet, og så stod
     begge knapper umarkerede, til gæsten selv trykkede: et valg
     uden forvalg ligner et spørgsmål, man ikke kan springe over. */
  var kurv = { stk: {}, fyld: [], hvordan: 'afhentning' };
  var data = null;
  var valgtDag = null;

  function læsKurv() {
    try {
      var r = localStorage.getItem(KURV_NOEGLE);
      if (!r) return;
      var k = JSON.parse(r);
      if (k && typeof k === 'object') {
        kurv.stk = k.stk || {};
        kurv.fyld = Array.isArray(k.fyld) ? k.fyld : [];
      }
    } catch (e) { /* privat browsing – kurven starter bare tom */ }
  }

  function gemKurv() {
    try { localStorage.setItem(KURV_NOEGLE, JSON.stringify(kurv)); }
    catch (e) { /* se ovenfor */ }
  }

  // ----------------------------------------------------------
  //  VARERNE
  // ----------------------------------------------------------
  /* Udvælgelsen ligger i js/store.js som Butik.smoerrebroed, ikke
     her. Forsiden viser nu også de fem slags og tæller fyldene, og
     stod regexen "smørrebrød|fyld" to steder, ville den ene før eller
     siden blive rettet uden den anden. Stykkerne er dem MED pris,
     fyldene dem uden – se noten i store.js. */
  /* MODEL A: alt med en pris kan bestilles med en tæller — også
     fyldet. Se noten i store.js om hvorfor skellet gik fra pris
     til kategori. fyldene() er dem UDEN pris: dem kan gæsten
     ønske sig, men ikke købe. */
  /* HVILKET UDVALG? Formularen siger det selv med data-udvalg,
     så opmærkningen bestemmer og ikke koden:

       (intet)      alt, som bestillingssiden har gjort hele tiden
       uden-smoer   forsidens bestilling — dagens ret, grillen,
                    drikkevarerne. Smørrebrødet har sit eget afsnit
       kun-smoer    kun smørrebrødet, med fyldet

     Isen er ude af dem alle. Se erIs() i js/store.js. */
  function hvilketUdvalg() {
    var f = document.getElementById('bestil-form');
    return (f && f.getAttribute('data-udvalg')) || 'alt';
  }

  /* VED BORDET — formularens tredje sted. data-bord="7" siger
     BÅDE "det her er bordets formular" og "det er bord 7": de to
     følges altid ad. Nummeret sættes af js/ved-bordet.js, som
     har slået det op i bordlisten — ikke af adressen. */
  function vedBordet() {
    var f = document.getElementById('bestil-form');
    var v = f && f.getAttribute('data-bord');
    return v && String(v).trim() ? String(v).trim() : null;
  }

  /* Klokken nu, i DANSK tid. Browserens eget ur kan stå i en
     anden tidszone, og en bestilling stemplet 04.12 er ikke til
     at arbejde efter i et køkken. */
  function nuTid() {
    var m = Butik.nu().minutter;
    return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2);
  }

  function stykker(d) { return Butik.udvalg(d, hvilketUdvalg()).varer; }
  function fyldene(d) { return Butik.udvalg(d, hvilketUdvalg()).oenskefyld; }

  /* DAGENS RET ER EN VARE PÅ LINJE MED DE ANDRE.

     Den står ikke i menukortet — den er ét felt i admin — men
     gæsten bestiller den som enhver anden linje, og så skal
     resten af motoren kunne finde den.

     Første udgave lagde den kun ind i visStykker(), altså i
     TEGNINGEN. Så kendte hverken summen, kurvlinjen eller den
     afsendte bestilling dens pris: køkkenet fik "1 × Stegt flæsk"
     uden kroner, kurven skrev "pris følger" på en ret, der HAR en
     pris, og salgstallet ville tælle den som nul. Fundet af
     ??-prøven, som pludselig sagde "pris følger", hvor der skulle
     stå et tal.

     Retten gælder dagen i dag, som feltet i admin er skruet
     sammen — på alle andre dage findes den ikke. */
  function bestilbare() {
    var liste = stykker(data);
    var ret = (data.indstillinger || {}).dagens_ret || {};
    if (!ret.navn || valgtDag !== Butik.nu().dato) return liste;
    return [{
      navn: ret.navn,
      beskrivelse: ret.beskrivelse || '',
      pris: ret.pris,
      kategori_id: '__dagens',
    }].concat(liste);
  }

  // ----------------------------------------------------------
  //  HVILKE DAGE OG TIDER KAN MAN HENTE?
  //  ----------------------------------------------------------
  //  Reglerne selv bor i js/bestil-regler.js, fordi den nye
  //  forside har sin egen formular og skal have PRÆCIS de samme.
  //  To udgaver af "hvilke dage kan vælges?" er én for meget:
  //  rettes varslet det ene sted og glemmes det andet, kan gæsten
  //  bestille til om to timer på den ene side og ikke på den
  //  anden — og ingen af delene ser forkerte ud.
  //
  //  Navnene bliver her, så resten af filen er uændret.
  // ----------------------------------------------------------
  var R = window.MosedeRegler;

  var isoPlus = R.isoPlus;
  var ugedagFor = R.ugedagFor;
  var planFor = R.planFor;
  var varselTimer = R.varselTimer;
  var tidligst = R.tidligst;
  var tiderFor = R.tiderFor;
  var muligeDage = R.muligeDage;
  var dagNavn = R.dagNavn;
  var dagDato = R.dagDato;

  /* Den ENE regel, der ikke er forretningens, men formularens:
     mindsteantallet er smørrebrødets og giver ingen mening for
     én is ved bord 7. Undtagelsen står her, fordi tallet bruges
     både af knappen og af afsendelsen — en undtagelse ét af
     stederne ville give en spærret knap, ingen kan se grunden
     til. */
  function minStk(d) {
    if (vedBordet()) return 1;
    return R.minStk(d);
  }

  // ----------------------------------------------------------
  //  TEGN
  // ----------------------------------------------------------
  /* ---- UDVALGET, GRUPPE FOR GRUPPE ----

     29 fyld plus stykkerne i én lang liste er en mur på en telefon.
     Grupperne foldes derfor sammen som hos spiis: den første står
     åben, resten åbnes med et tryk. Det er den samme håndbevægelse
     som fyldfolden havde i forvejen — nu bare om HELE udvalget.

     Åbnes en gruppe, hvor der allerede er valgt noget, står den
     åben af sig selv: en lukket gruppe med tre stykker i ville
     skjule gæstens egen kurv for hende. */
  var aabneGrupper = {};

  /* SLAGS-FILTERET ER SLETTET.

     Her lå valgtSlags, fraAdressen (?slags= i adressen), visSlags()
     og opdaterSlagsTal(): en række chips over listen med "hvad skal
     det være?", og et filter, der skiftede listen ud.

     Kundens ord (23/8): formularen skal være PRÆCIS som spiis', og
     dér står alle kategorier som folde i én liste. To måder at vise
     det samme udvalg på er én for meget — og filteret gemte kurvens
     indhold bag en chip, man skulle huske at kigge på.

     Koden er slettet og ikke kommenteret ud. Den kunne stadig
     køre, men valgtSlags blev sat til null i visStykker(), så
     chip-rækken skjulte sig selv hver gang: hundrede linjer, der
     så levende ud og aldrig gjorde noget. Det er præcis den
     dobbelte pænDato, opdelingen af admin fandt — se README. */


  function visStykker() {
    var boks = $('bestil-stykker');
    tøm(boks);

    /* DAGENS RET STÅR ØVERST I LISTEN — den gælder dagen i dag,
       som feltet i admin er skruet sammen, og på alle andre dage
       forsvinder den af sig selv. Den bestilles som enhver anden
       linje; køkkenet ser navnet på kortet i admin. Se
       bestilbare() om hvorfor den ikke må lægges ind HER. */
    var liste = bestilbare();
    if (!liste.length) {
      boks.appendChild(lav('p', 'desc',
        'Vi kan ikke hente udvalget lige nu. Ring til os – vi tager den over telefonen.'));
      return;
    }

    var s = Butik.udvalg(data, hvilketUdvalg());

    /* Gruppen er kategoriens eget navn — undtagen for fyldet, som
       får sine læsegrupper. Så hedder grillens gruppe det, den
       hedder i menukortet, uden at nogen har fundet på et ord. */
    function gruppeNavnFor(v) {
      if (v.kategori_id === '__dagens') return 'Dagens ret';
      return s.erFyld(v) ? gruppeFor(v.navn) : s.kategoriNavn(v);
    }

    var iGruppe = {};
    liste.forEach(function (v) {
      var navn = gruppeNavnFor(v);
      if (!iGruppe[navn]) iGruppe[navn] = [];
      iGruppe[navn].push(v);
    });

    /* RÆKKEFØLGEN ER FAST, ikke den varerne tilfældigvis står i.
       Første udkast lod grupperne komme i den rækkefølge, deres
       første vare havde i sorteringen — og så stod "Andet godt"
       midt imellem de navngivne grupper. En rest-gruppe hører
       sidst, og gæsten skal finde de samme grupper det samme sted
       hver gang. Stykkerne først: de har deres egne priser og er
       det, forsiden lover. */
    /* Smørrebrødets egne grupper: stykkerne, fyldets læsegrupper
       og resten. De hører sammen som ÉN slags — det er ét bord,
       man dækker — mens hver af ejerens åbnede kategorier er sin
       egen. */
    var smoerGrupper = [s.stykkeGruppe]
      .concat(GRUPPER.map(function (g) { return g.navn; }))
      .concat(['Andet godt']);

    function harNoget(navne) {
      return navne.some(function (n) { return iGruppe[n] && iGruppe[n].length; });
    }

    var rækkefølge = ['Dagens ret'].concat(smoerGrupper).concat(s.ekstraGrupper)
      .filter(function (navn) { return iGruppe[navn] && iGruppe[navn].length; });

    /* ALTID FOLDE, OGSÅ MED ÉN GRUPPE — det er foldene, der gør
       spiis-formen kort nok til en telefon, og en liste, der
       skifter form efter antallet af grupper, er to formularer
       at teste og huske. Dagens ret-gruppen står ØVERST og ÅBEN:
       det er den, dagen byder på. */
    var brugFolde = true;

    rækkefølge.forEach(function (gruppeNavn, nr) {
      if (!brugFolde) { iGruppe[gruppeNavn].boks = boks; return; }
      var valgtIGruppen = iGruppe[gruppeNavn].some(function (v) {
        return (kurv.stk[v.navn] || 0) > 0;
      });
      // Den første gruppe er åben fra start — ellers møder gæsten
      // en side, hvor der ikke er noget at se.
      if (aabneGrupper[gruppeNavn] === undefined) aabneGrupper[gruppeNavn] = nr === 0;
      var åben = aabneGrupper[gruppeNavn] || valgtIGruppen;

      var gruppe = lav('div', 'vare-gruppe');
      var hoved = lav('button', 'fold-hoved');
      hoved.type = 'button';
      hoved.setAttribute('aria-expanded', åben ? 'true' : 'false');
      hoved.appendChild(lav('span', 'fold-navn', gruppeNavn));

      var antalValgt = iGruppe[gruppeNavn].reduce(function (n, v) {
        return n + (kurv.stk[v.navn] || 0);
      }, 0);
      var note = lav('span', antalValgt ? 'fold-note valgt' : 'fold-note',
        antalValgt ? antalValgt + ' valgt' : '+ tilføj');
      hoved.appendChild(note);
      hoved.appendChild(lav('span', 'fold-pil'));

      var krop = lav('div', 'fold-krop');
      if (!åben) krop.hidden = true;

      hoved.addEventListener('click', function () {
        aabneGrupper[gruppeNavn] = krop.hidden;
        krop.hidden = !krop.hidden;
        hoved.setAttribute('aria-expanded', krop.hidden ? 'false' : 'true');
      });

      gruppe.appendChild(hoved);
      gruppe.appendChild(krop);
      boks.appendChild(gruppe);
      iGruppe[gruppeNavn].boks = krop;
      iGruppe[gruppeNavn].note = note;
    });

    /* Tallet i gruppehovedet skal følge tælleren MED DET SAMME.
       Gjorde det ikke det, stod der "+ tilføj" på en gruppe med
       tre stykker i, så snart gæsten lukkede den — og så tæller
       hun forfra. Kun noten opdateres: en hel gentegning ville
       lukke folde og flytte fokus midt i et tryk. */
    function opdaterNote(gruppeNavn) {
      var g = iGruppe[gruppeNavn];
      if (!g || !g.note) return;
      var n = g.reduce(function (sum, v) { return sum + (kurv.stk[v.navn] || 0); }, 0);
      g.note.textContent = n ? n + ' valgt' : '+ tilføj';
      g.note.className = n ? 'fold-note valgt' : 'fold-note';
    }

    liste.forEach(function (v) {
      var gNavn = gruppeNavnFor(v);
      var boks = iGruppe[gNavn].boks;
      /* Varen hører til en anden slags end den valgte, og dens
         gruppe er derfor ikke tegnet. Uden det her linjestykke
         faldt hele siden fra hinanden med "Cannot read properties
         of undefined": grupperne blev filtreret, varerne blev
         ikke — og gæsten mødte "Vi kan ikke tage imod lige nu" på
         en side, hvor alt virkede. */
      if (!boks) return;
      var r = lav('div', 'stk-linje');

      var tekst = lav('div', 'stk-tekst');
      tekst.appendChild(lav('span', 'navn', v.navn));
      if (v.beskrivelse) tekst.appendChild(lav('p', 'desc', v.beskrivelse));
      r.appendChild(tekst);

      /* ?? og ikke et gæt: prisen er ikke sat i admin endnu, og
         et opdigtet tal er en skuffet kunde i telefonen. Noten
         under listen forklarer de to spørgsmålstegn — den tændes
         nedenfor, KUN når mindst én vare mangler pris. */
      r.appendChild(lav('span', 'stk-pris',
        v.pris === null || v.pris === undefined ? '??,-' : window.MosedePris(v.pris)));

      /* Tælleren. To knapper og et tal, ikke et talfelt: på en
         telefon åbner et talfelt tastaturet og dækker halvdelen af
         listen, og man skal alligevel kun én op eller ned. */
      var taeller = lav('div', 'taeller');
      var ned = lav('button', 'glass rund', '−');
      var tal = lav('span', 'taeller-tal', kurv.stk[v.navn] || 0);
      var op = lav('button', 'glass rund', '+');

      ned.type = op.type = 'button';
      ned.setAttribute('aria-label', 'Én færre ' + v.navn);
      op.setAttribute('aria-label', 'Én mere ' + v.navn);
      tal.setAttribute('aria-live', 'polite');
      tal.setAttribute('aria-label', 'Antal ' + v.navn);

      function saet(n) {
        n = Math.max(0, Math.min(200, n));
        if (n) kurv.stk[v.navn] = n; else delete kurv.stk[v.navn];
        tal.textContent = n;
        r.classList.toggle('valgt', n > 0);
        ned.disabled = n === 0;
        opdaterNote(gNavn);
        gemKurv();
        visSum();
      }

      ned.addEventListener('click', function () { saet((kurv.stk[v.navn] || 0) - 1); });
      op.addEventListener('click', function () { saet((kurv.stk[v.navn] || 0) + 1); });

      taeller.appendChild(ned);
      taeller.appendChild(tal);
      taeller.appendChild(op);
      r.appendChild(taeller);

      saet(kurv.stk[v.navn] || 0);
      boks.appendChild(r);
    });

    /* Udsolgte vises EFTER de bestilbare, gennemstreget og uden
       tæller. Se noten i store.js: en vare, der forsvinder, ligner
       en vare, der ikke findes.

       Også udsolgt FYLD med pris hører til her: i model A er det en
       vare på lige fod, og den skal savnes det sted, den plejer at
       stå. Udsolgt fyld UDEN pris bliver i ønskefolden nedenfor. */
    s.udsolgt.forEach(function (v) {
      // Samme regel som ovenfor: udsolgte varer fra en anden slags
      // hører ikke til på skærmen her.
      if (rækkefølge.indexOf(gruppeNavnFor(v)) === -1) return;
      var r = lav('div', 'stk-linje udsolgt');
      var tekst = lav('div', 'stk-tekst');
      tekst.appendChild(lav('span', 'navn', v.navn));
      r.appendChild(tekst);
      r.appendChild(lav('span', 'udsolgt-chip', 'Udsolgt i dag'));
      boks.appendChild(r);
    });
    /* Noten om ?? — tændes KUN når mindst én vare på listen
       faktisk mangler sin pris i admin. En fodnote om noget, der
       ikke er på siden, er støj. */
    var prisNote = $('bestil-pris-note');
    if (prisNote) {
      prisNote.classList.toggle('skjult', !liste.some(function (v) {
        return v.pris === null || v.pris === undefined;
      }));
    }

  }

  /* ---- FYLDET GRUPPERES ----

     29 slags i én bunke er en mur. Grupperne herunder er en
     LÆSEHJÆLP vi lægger ovenpå, ikke data: de findes som ordlister
     her og ikke som en kolonne i databasen, så personalet kan skrive
     et nyt fyld i admin uden først at skulle vælge en gruppe. Et
     fyld der ikke passer nogen steder, havner i "Andet godt" i
     stedet for at forsvinde.

     Rækkefølgen betyder noget. "Æggesalat med bacon" indeholder både
     "æg" og "bacon", og den hører under salater. Derfor prøves
     grupperne i rækkefølge, og den første der passer, vinder. */
  var GRUPPER = [
    { navn: 'Salater',
      ord: ['salat', 'wienersalat', 'skinkesalat', 'hønsesalat', 'makrelsalat'] },
    { navn: 'Fisk og skaldyr',
      /* "reje" og ikke "rejer": rejemad, rejesalat og rejer skal
         alle i fisken. Med det lange ord faldt "Rejemad med
         mayonnaise" i Andet godt — set på et skærmbillede, da
         grupperne blev til synlige folde. */
      ord: ['fisk', 'sild', 'reje', 'makrel', 'laks'] },
    { navn: 'Kød og pålæg',
      ord: ['flæskesteg', 'pølse', 'rullepølse', 'roastbeef', 'skinke', 'kylling',
            'spegepølse', 'leverpostej', 'dyrlægens', 'frikadelle', 'bacon', 'kød'] },
    { navn: 'Æg og kartoffel', ord: ['æg', 'kartoffel', 'spejlæg'] },
    { navn: 'Ost og grønt', ord: ['ost', 'tomat', 'agurk', 'peberfrugt'] }
  ];

  function gruppeFor(navn) {
    var lille = String(navn).toLowerCase();
    for (var i = 0; i < GRUPPER.length; i++) {
      for (var j = 0; j < GRUPPER[i].ord.length; j++) {
        if (lille.indexOf(GRUPPER[i].ord[j]) !== -1) return GRUPPER[i].navn;
      }
    }
    return 'Andet godt';
  }

  function visFyld() {
    var boks = $('bestil-fyld');
    /* Fyldfolden findes ikke ved bordet. Uden den her linje
       kastede tøm(null) EFTER at overskriften var skrevet: den
       rigtige side, ingen formular, ingen fejl på skærmen. */
    if (!boks) return;
    tøm(boks);

    var liste = fyldene(data);
    if (!liste.length) {
      var trin = $('bestil-fyld-trin');
      if (trin) trin.classList.add('skjult');
      return;
    }

    /* Udsolgt fyld står med i sin gruppe — gennemstreget og dødt.
       De bestilbare først i hver gruppe, de udsolgte efter. */
    var udsolgt = Butik.smoerrebroed(data).udsolgt.fyld.filter(function (v) {
      // Kun det udsolgte fyld UDEN pris hører til i ønskefolden;
      // resten står gennemstreget i sin egen gruppe ovenfor.
      return v.pris === null || v.pris === undefined || v.pris === '';
    });

    var efterGruppe = {};
    liste.forEach(function (v) {
      var g = gruppeFor(v.navn);
      (efterGruppe[g] = efterGruppe[g] || []).push(v);
    });
    udsolgt.forEach(function (v) {
      var g = gruppeFor(v.navn);
      (efterGruppe[g] = efterGruppe[g] || []).push(v);
    });

    // Grupperne i den rækkefølge de er defineret, "Andet godt" sidst
    var raekke = GRUPPER.map(function (g) { return g.navn; }).concat(['Andet godt']);
    var kasser = {};
    raekke.forEach(function (navn) {
      if (!efterGruppe[navn] || !efterGruppe[navn].length) return;
      var gr = lav('div', 'fyld-gruppe');
      gr.appendChild(lav('div', 'eyebrow', navn));
      var pilleboks = lav('div', 'fyld-valgene');
      gr.appendChild(pilleboks);
      boks.appendChild(gr);
      kasser[navn] = pilleboks;
    });

    liste.forEach(function (v) {
      /* Et rigtigt afkrydsningsfelt, skjult bag pillen. Så virker
         tastatur, oplæsning og "vælg alle" af sig selv – en div med
         en klik-lytter gør ingen af de tre ting. */
      var id = 'fyld-' + v.id;
      var etiket = lav('label', 'fyld-valg');
      etiket.setAttribute('for', id);

      var boksen = document.createElement('input');
      boksen.type = 'checkbox';
      boksen.id = id;
      boksen.value = v.navn;
      boksen.checked = kurv.fyld.indexOf(v.navn) !== -1;

      boksen.addEventListener('change', function () {
        var i = kurv.fyld.indexOf(v.navn);
        if (boksen.checked && i === -1) kurv.fyld.push(v.navn);
        if (!boksen.checked && i !== -1) kurv.fyld.splice(i, 1);
        etiket.classList.toggle('valgt', boksen.checked);
        gemKurv();
        visSum();
      });

      etiket.classList.toggle('valgt', boksen.checked);
      etiket.appendChild(boksen);
      etiket.appendChild(lav('span', null, v.navn));
      (kasser[gruppeFor(v.navn)] || boks).appendChild(etiket);
    });

    /* De udsolgte til sidst i hver gruppe — efter de bestilbare. */
    udsolgt.forEach(function (v) {
      var pille = lav('span', 'fyld-valg udsolgt');
      pille.appendChild(lav('span', null, v.navn));
      pille.appendChild(lav('span', 'udsolgt-chip', 'udsolgt'));
      var kasse = kasser[gruppeFor(v.navn)];
      if (kasse) kasse.appendChild(pille);
    });
  }

  function visDage() {
    /* DATOEN ER EN VÆLGER, SOM HOS SPIIS — øverst, altid synlig,
       med "· dagens ret" eller "· menukort" i hver linje, så man
       kan se hvad dagen byder på, FØR man vælger den. Noten under
       vælgeren forklarer de tomme tilstande: sæson, en dag der
       mangler, eller en dag uden dagens ret. */
    var boks = $('bestil-dag');
    var note = $('bestil-dag-note');
    if (!boks) return;
    tøm(boks);

    function sigNote(tekst) {
      if (!note) return;
      note.textContent = tekst || '';
      note.classList.toggle('skjult', !tekst);
    }

    /* SÆSONEN LUKKER OGSÅ FORMULAREN. lukketDen dækker kun
       kalenderens lukkedage, og sæsonlukningen bor i
       indstillinger — uden det her stod formularen og tilbød
       afhentningsdage midt i vinterlukningen, mens forsidens
       pille sagde lukket. Fundet ved at læse spiis-briefen (22/8),
       bevist ved at prøve: sæson til, og dagene stod der stadig. */
    var sæson = (data.indstillinger || {}).saeson || {};
    if (sæson.lukket) {
      sigNote('Vi er lukket for sæsonen'
        + (sæson.aabner_igen ? ' og åbner igen ' + sæson.aabner_igen : '')
        + '. Ring til os, hvis det ikke kan vente.');
      return;
    }

    var dage = muligeDage(data);
    if (!dage.length) {
      sigNote('Vi kan ikke se nogen åbne dage lige nu. Ring til os, så finder vi en tid.');
      return;
    }

    /* EN DAG, DER MANGLER, FORKLARER SIG — spiis' dyreste fejl:
       kl. 19 var tidslisten bare tom, og kunden troede siden var i
       stykker. Vores liste viser aldrig en tom dag, men SAVNET af
       "i dag" skal stadig forklares — ELLERS ser gæsten en række,
       der starter i morgen, og tror det samme.

       Kun når varslet faktisk lader dagen i dag være mulig
       (tidligst().dato er i dag): står varslet i vejen, forklarer
       #bestil-varsel det allerede, og to forklaringer om det
       samme fravær peger gæsten i hver sin retning. */
    var iDag = Butik.nu().dato;
    var iDagNote = null;
    if (tidligst(data).dato === iDag && dage.indexOf(iDag) === -1) {
      iDagNote = planFor(data, iDag)
        ? 'Ikke flere afhentningstider i dag — sidste afhentning ligger en '
          + 'halv time før lukketid. Vælg en af de næste dage, eller ring.'
        : 'Vi holder lukket i dag. Vælg en af de næste dage.';
    }

    if (dage.indexOf(valgtDag) === -1) valgtDag = dage[0];

    var ret = (data.indstillinger || {}).dagens_ret || {};
    dage.forEach(function (iso) {
      var o = document.createElement('option');
      o.value = iso;
      /* Dagens ret gælder DAGEN I DAG — det er sådan, feltet i
         admin er skruet sammen. Alle andre dage er menukortet. */
      o.textContent = dagNavn(data, iso) + ' d. ' + dagDato(iso)
        + (iso === iDag && ret.navn ? ' · dagens ret' : ' · menukort');
      if (iso === valgtDag) o.selected = true;
      boks.appendChild(o);
    });

    /* Én note ad gangen, den vigtigste først: hvorfor i dag
       mangler — og ellers spiis' egen linje om dagen uden ret. */
    sigNote(iDagNote
      || (valgtDag === iDag && ret.navn ? ''
        : 'Ingen dagens ret denne dag – vælg frit fra menukortet.'));

    boks.onchange = function () {
      valgtDag = boks.value;
      visDage();
      visStykker();
      visTider();
      visSum();
    };
  }

  /* ---- SPIS HER ELLER TAG MED ----

     Spiis lader gæsten vælge, og forskellen er ikke kosmetisk: den
     ene skal pakkes i en pose, den anden skal stå på et bord med
     bestik. Køkkenet skal kunne se det på kortet — ikke læse sig
     til det i en fritekst midt i en frokost.

     Valget er TIL som standard. Mikkel bad om det 20. august 2026:
     forretningen skal kunne begge dele — smørrebrød ud af huset OG
     mad til trædækket — og begge stod på ejerens egen bestilling
     (takeaway og "book spisning").

     Fluebenet på Bestillinger-fanen er derfor måden at slå det
     FRA på, ikke til: kan køkkenet en dag ikke nå at servere
     forudbestilt mad ved bordene, er det ét klik, og fra det
     sekund er hver bestilling afhentning igen. */
  /* TO SIDER, TO SPØRGSMÅL.

     Ved lugen er spørgsmålet "to-go eller spis her". På
     smørrebrødssiden er maden pr. definition ud af huset, og
     spørgsmålet er et andet: henter I den, eller kører vi med
     den? Kundens ord (23/8): siden skal være egnet til
     smørrebrød ud af huset, "det skal ik bare være det samme".

     Spørgsmålet følger data-udvalg på formularen og ikke
     adressen i browseren. Ellers ville en ny side med det samme
     udvalg få lugens spørgsmål, og det ville først blive
     opdaget af en gæst. */
  function hvordanValg() {
    return hvilketUdvalg() === 'kun-smoer'
      ? [['afhentning', '🥡 Vi henter selv'], ['levering', '🚗 I leverer']]
      : [['afhentning', '🥡 To-go'], ['spis_her', '🍽️ Spis her']];
  }

  /* Må det andet svar overhovedet vælges?

     Spis her kan ejeren lukke i admin, og standarden er TIL —
     de har trædækket, og det har de altid haft.

     LEVERING ER MODSAT: standarden er FRA. Vi ved ikke, om
     forretningen leverer, hvortil eller hvad det koster, og
     ingen af delene er bekræftet — se listen "Ejeren skal
     bekræfte" i README. En side, der tilbyder levering, fordi
     ingen har sagt nej, lover noget, forretningen ikke har
     lovet. Ejeren slår den til i admin, når han ved svaret. */
  function kanAndetSvar() {
    var ind = data.indstillinger || {};
    return hvilketUdvalg() === 'kun-smoer'
      ? ind.levering === true
      : ind.spis_her !== false;
  }

  function visHvordan() {
    var trin = $('bestil-hvordan-trin');
    if (!trin) return;

    var valg = hvordanValg();
    var kan = kanAndetSvar();
    trin.classList.toggle('skjult', !kan);

    /* Et valg med ét svar er ikke et valg — og kurven skal med
       tilbage. Lå der 'levering' fra i går, hvor ejeren havde
       den slået til, ville bestillingen ellers blive afvist af
       databasen med en fejl, gæsten ikke kan gøre noget ved. */
    if (!kan) { kurv.hvordan = 'afhentning'; visAdresse(); return; }

    var boks = $('bestil-hvordan');
    tøm(boks);

    /* Værdierne bagved hedder afhentning, spis_her og levering —
       det er databasens ord, og de skal ikke skifte, fordi
       skiltet gør. */
    valg.forEach(function (v) {
      var valgt = kurv.hvordan === v[0];
      var b = lav('button', 'type-knap' + (valgt ? ' valgt' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', valgt ? 'true' : 'false');
      b.appendChild(lav('span', 'type-navn', v[1]));
      b.addEventListener('click', function () {
        kurv.hvordan = v[0];
        gemKurv();
        visHvordan();
      });
      boks.appendChild(b);
    });

    visAdresse();
  }

  /* Adressefeltet følger valget. Det står skjult, til levering er
     valgt: et adressefelt på en bestilling, der skal hentes, er
     et felt, gæsten skal regne ud at hun ikke skal udfylde.

     Noten under feltet lover INGEN zone og ingen pris. Vi ved
     ikke, hvor langt de kører, og et gæt her bliver til et løfte
     på en kvittering. */
  function visAdresse() {
    var trin = $('bestil-adresse-trin');
    if (!trin) return;
    var skalLeveres = kurv.hvordan === 'levering';
    trin.classList.toggle('skjult', !skalLeveres);

    var felt = $('bestil-adresse');
    if (felt) felt.required = skalLeveres;

    var note = $('bestil-adresse-note');
    if (note) {
      note.textContent = skalLeveres
        ? 'Vi ringer og bekræfter, at vi kan køre til adressen.'
        : '';
    }
  }

  function visTider() {
    var vaelg = $('bestil-tid');
    // Ved bordet findes tidsvælgeren ikke: gæsten sidder der nu.
    if (!vaelg) return;
    var foer = vaelg.value;
    tøm(vaelg);

    var tider = tiderFor(data, valgtDag);
    tider.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t;
      o.textContent = 'kl. ' + t.replace(':', '.');
      vaelg.appendChild(o);
    });
    if (tider.indexOf(foer) !== -1) vaelg.value = foer;
  }

  function antalIKurv() {
    var n = 0;
    for (var k in kurv.stk) n += kurv.stk[k];
    return n;
  }

  function prisIKurv() {
    var sum = 0;
    var liste = bestilbare();
    for (var k in kurv.stk) {
      var v = liste.filter(function (x) { return x.navn === k; })[0];
      if (v) sum += Number(v.pris) * kurv.stk[k];
    }
    return sum;
  }

  function visSum() {
    var n = antalIKurv();
    var pris = prisIKurv();
    var min = minStk(data);

    /* KVITTERINGSLINJEN KOMMER FØRST NÅR DER ER NOGET I KURVEN.

       Den stod før og svævede hen over siden med "Vælg hvor mange
       stykker du vil have" fra det øjeblik man landede – en klæbende
       bjælke der irettesatte gæsten for ikke at have gjort noget
       endnu. Nu er siden ren indtil man vælger, og så glider linjen
       op og kvitterer for valget. */
    var kurvBar = $('bestil-kurv');
    if (kurvBar) kurvBar.classList.toggle('skjult', n === 0);

    /* KURVEN OG DEN FASTE BESTIL-PILLE MÅ IKKE STÅ OVEN I
       HINANDEN. Begge er position:fixed i bunden, og siden
       formularen flyttede ind på forsiden, findes de på den samme
       side. Pillen er vejen TIL bestillingen; er der noget i
       kurven, er man der allerede, og så er kurven den, der skal
       have pladsen. */
    var pille = document.querySelector('.bestil-fast');
    if (pille) pille.classList.toggle('skjult', n > 0);

    /* Er der en ??-vare i kurven, må summen ikke lyve: "70,-" for
       en kurv med en burger uden pris er et tal, gæsten vil holde
       os op på i telefonen. Så står der "+ det uden pris". */
    var udenPris = Object.keys(kurv.stk).some(function (k) {
      if (!(kurv.stk[k] > 0)) return false;
      var v = bestilbare().filter(function (x) { return x.navn === k; })[0];
      return v && (v.pris === null || v.pris === undefined);
    });

    var tekst = $('bestil-sum-tekst');
    if (n) {
      tekst.textContent = n + (n === 1 ? ' stykke' : ' stykker')
        + (pris ? ' · ' + window.MosedePris(pris) : '')
        + (udenPris ? (pris ? ' + det uden pris' : ' · pris følger') : '')
        + (kurv.fyld.length ? ' · ' + kurv.fyld.length + ' slags fyld' : '');
    }

    /* Noten på den foldede fyld-blok. Den er lukket til at begynde
       med, så uden et tal her ville man ikke kunne se om man havde
       valgt noget uden at åbne den igen. */
    var fyldTal = $('fyld-valgt');
    if (fyldTal) {
      fyldTal.textContent = kurv.fyld.length
        ? kurv.fyld.length + (kurv.fyld.length === 1 ? ' slags valgt' : ' slags valgt')
        : 'frivilligt';
      fyldTal.classList.toggle('valgt', kurv.fyld.length > 0);
    }

    /* Hele formularen er synlig fra start — spiis' form er det,
       og det er foldene på kategorierne, der holder siden kort.
       Gaten, der gemte hentetid og kontakt bag den første vare,
       er fjernet med kundens egen forlægsside i hånden (23/8). */

    var nok = n >= min;
    $('bestil-send').disabled = !nok;

    var advarsel = $('bestil-min');
    if (n && !nok) {
      advarsel.textContent = 'Der skal mindst være ' + min + ' stykker.';
      advarsel.classList.remove('skjult');
    } else {
      advarsel.classList.add('skjult');
    }
  }

  // ----------------------------------------------------------
  //  FEJL I FELTERNE
  // ----------------------------------------------------------
  function visFejl(feltId, besked) {
    var felt = $(feltId);
    var boks = $('fejl-' + feltId.replace('bestil-', ''));
    if (!boks) return;
    if (besked) {
      boks.textContent = besked;
      boks.classList.remove('skjult');
      felt.setAttribute('aria-invalid', 'true');
      felt.setAttribute('aria-describedby', boks.id);
    } else {
      boks.textContent = '';
      boks.classList.add('skjult');
      felt.removeAttribute('aria-invalid');
      felt.removeAttribute('aria-describedby');
    }
  }

  // ----------------------------------------------------------
  //  SEND
  // ----------------------------------------------------------
  function send(ev) {
    ev.preventDefault();

    var navn = $('bestil-navn').value;
    var telefon = $('bestil-telefon').value;
    /* E-mailfeltet er væk — spiis' form har navn, telefon og
       besked, og kunden bad om præcis den (23/8). Vi ringer
       alligevel og bekræfter hver bestilling; en e-mail var et
       felt mere at tvivle på. Databasen tager stadig imod en,
       hvis den en dag kommer tilbage. */
    var email = '';
    var besked = $('bestil-besked-felt').value;

    /* Adressen tælles kun med, når der SKAL leveres. Er feltet
       skjult, må det ikke kunne spærre for en afsendelse — det
       er den slags fejl, hvor knappen ikke gør noget, og gæsten
       ikke kan se hvorfor. */
    var adresseFelt = $('bestil-adresse');
    var adresse = adresseFelt ? adresseFelt.value : '';
    var skalLeveres = kurv.hvordan === 'levering';

    var fejl = {
      navn: Butik.tjek.navn(navn, 'navn', 80),
      telefon: Butik.tjek.telefon(telefon),
      adresse: skalLeveres && adresse.trim().length < 5
        ? 'Skriv vej, nummer, postnummer og by.' : '',
    };

    visFejl('bestil-navn', fejl.navn);
    visFejl('bestil-telefon', fejl.telefon);
    if (adresseFelt) visFejl('bestil-adresse', fejl.adresse);

    var foerste = ['navn', 'telefon', 'adresse'].filter(function (k) { return fejl[k]; })[0];
    if (foerste) {
      // Læg markøren dér hvor fejlen er, og rul den frem
      var felt = $('bestil-' + foerste);
      felt.focus();
      return;
    }

    var vedBord = vedBordet();
    var tid = vedBord ? nuTid() : $('bestil-tid').value;
    if (!valgtDag || !tid) {
      sigFejl('Vælg en dag og en tid.');
      return;
    }
    /* minStk() svarer 1 ved bordet — se noten der. Bestiller hun
       ingenting, siger vi stadig fra. */
    if (antalIKurv() < minStk(data)) {
      sigFejl(vedBord ? 'Vælg noget først.' : 'Vælg hvor mange stykker du vil have.');
      return;
    }

    var linjer = [];
    var liste = bestilbare();
    for (var k in kurv.stk) {
      var v = liste.filter(function (x) { return x.navn === k; })[0];
      linjer.push({ navn: k, antal: kurv.stk[k], pris: v ? v.pris : null });
    }

    sigFejl('');

    /* DET SIDSTE KIG — spiis' lærepenge (23/8): "den er for nem
       og hurtig". Formularen sender ikke selv; den viser hele
       bestillingen én gang til, og først kig-vinduets egen knap
       sender. Det er gæstens eget værn mod en forkert bestilling
       — og det bliver det eneste, den dag bestillinger bekræftes
       automatisk. */
    visKig({
      navn: navn, telefon: telefon, email: email, besked: besked,
      hent_dato: valgtDag, hent_tid: tid, hvordan: kurv.hvordan,
      leverings_adresse: skalLeveres ? adresse.trim() : null,
      bord_nummer: vedBord,
      linjer: linjer, fyld: kurv.fyld.slice(),
    });
  }

  function visKig(b) {
    var form = $('bestil-form');
    var kig = $('bestil-kig');
    var boks = $('kig-indhold');
    if (!kig || !boks) return sendNu(b);   // uden panelet sendes som før
    tøm(boks);

    function linje(navn, vaerdi) {
      var r = lav('div', 'kvit-linje');
      r.appendChild(lav('span', 'kvit-navn', navn));
      r.appendChild(lav('span', 'kvit-vaerdi', vaerdi));
      boks.appendChild(r);
    }

    b.linjer.forEach(function (l) {
      linje(l.antal + ' × ' + l.navn,
        l.pris === null || l.pris === undefined
          ? 'pris følger' : window.MosedePris(l.pris * l.antal));
    });
    if (b.fyld.length) linje('Fyld', b.fyld.join(', '));

    /* Etiketten skal passe til, hvad der SKER. Stod der "Hentes"
       på en bestilling, der køres ud, læser gæsten det sidste
       kig og bekræfter det modsatte af det, hun har valgt — og
       kigget findes netop for at fange dét. */
    var leveres = b.hvordan === 'levering';
    if (b.bord_nummer) {
      // Ingen hentetid at bekræfte — der er et BORD, og det er
      // den ene oplysning, der afgør, hvor maden havner.
      linje('Bord', b.bord_nummer);
      linje('Serveres', 'Nu — vi kommer med det');
    } else {
      linje(leveres ? 'Leveres' : 'Hentes',
        dagNavn(data, b.hent_dato) + ' d. ' + dagDato(b.hent_dato)
        + ' kl. ' + b.hent_tid.replace(':', '.'));
      linje('Hvordan', leveres ? 'Vi leverer'
        : b.hvordan === 'spis_her' ? 'Spis her' : 'To-go');
    }
    if (leveres && b.leverings_adresse) linje('Adresse', b.leverings_adresse);
    linje('Navn', b.navn);
    linje('Telefon', b.telefon);
    if (b.besked && b.besked.trim()) linje('Besked', b.besked.trim());

    var sum = prisIKurv();
    if (sum) linje('I alt', window.MosedePris(sum));

    /* Knappen nulstilles HVER gang kigget vises: efter en sendt
       bestilling og "Bestil noget mere" stod den ellers tilbage
       som "Sender …" og spærret — kigget så rigtigt ud, men
       kunne ikke sende. Fundet af dublet-prøven. */
    var sendKnap = $('kig-send');
    sendKnap.disabled = false;
    sendKnap.textContent = 'Send bestilling';

    form.classList.add('skjult');
    kig.classList.remove('skjult');
    kig.focus();
    kig.scrollIntoView({ block: 'start' });

    $('kig-ret').onclick = function () {
      kig.classList.add('skjult');
      form.classList.remove('skjult');
      form.scrollIntoView({ block: 'start' });
    };
    $('kig-send').onclick = function () { sendNu(b); };
  }

  function sendNu(b) {
    var knap = $('kig-send') || $('bestil-send');
    knap.disabled = true;
    knap.textContent = 'Sender …';
    var kigFejl = $('kig-fejl');
    if (kigFejl) { kigFejl.textContent = ''; kigFejl.classList.add('skjult'); }

    Butik.bestil(b).then(function (svar) {
      var kig = $('bestil-kig');
      if (kig) kig.classList.add('skjult');
      visTak(svar);
      /* Kurven er sendt. Den skal ikke stå og vente på næste
         besøg.

         ⚠️ MEN VED BORDET SKAL 'spis_her' BLIVE STÅENDE. Den
         sættes kun i start(), og et fast 'afhentning' her kostede
         bordnummeret på anden runde: selskabet ved bord 7 trykker
         "Bestil noget mere", bestiller is — og fordi kurven nu
         stod på afhentning, faldt bord_nummer ud i store.js (et
         bordnummer kræver spis her). Bestillingen landede som en
         helt almindelig afhentning med hentetid NU, og køkkenet
         havde ingen måde at vide, hvilket bord isen skulle hen
         til. Ingen fejl, ingen advarsel — maden ville bare stå
         ved lugen, mens gæsten sad og ventede.

         Fundet af en prøve, ikke ved at læse. */
      kurv = {
        stk: {}, fyld: [],
        hvordan: vedBordet() ? 'spis_her' : 'afhentning',
      };
      gemKurv();
    }).catch(function (e) {
      knap.disabled = false;
      knap.textContent = 'Send bestilling';
      if (e && e.netfejl && e.raekke) return visNoedudgang(e.raekke, kigFejl);
      var boks = kigFejl || $('bestil-fejl');
      boks.textContent = e.message || 'Bestillingen kunne ikke sendes. Ring til os i stedet.';
      boks.classList.remove('skjult');
      boks.scrollIntoView({ block: 'center' });
    });
  }

  function sigFejl(besked) {
    var boks = $('bestil-fejl');
    boks.textContent = besked || '';
    boks.classList.toggle('skjult', !besked);
    if (besked) boks.scrollIntoView({ block: 'center' });
  }

  /* Nettet er dødt efter tre forsøg. Så står valget mellem en
     fejlbesked og en vej videre — og vejen videre er den samme
     som før hjemmesiden fandtes: sms eller telefon. Teksten SIGER
     at bestillingen ikke er sendt; se noten ved noedudgangSms i
     js/store.js om hvorfor det ikke må pyntes. */
  function visNoedudgang(raekke, maalBoks) {
    var boks = maalBoks || $('bestil-fejl');

    /* VED BORDET ER DER INGEN NØDUDGANG AT TILBYDE: en sms for
       at få en is, mens personalet står tyve meter væk, er en
       omvej, ingen tager. (spiis-briefen, punkt 10.) */
    if (raekke && raekke.bord_nummer) {
      boks.textContent = 'Der er ingen forbindelse lige nu, og bestillingen er '
        + 'IKKE sendt. Gå op til lugen og sig det til os – så tager vi den dér.';
      boks.classList.remove('skjult');
      boks.scrollIntoView({ block: 'center' });
      return;
    }

    boks.textContent = 'Der er ingen forbindelse lige nu, og bestillingen er '
      + 'IKKE sendt endnu. Send den som sms med ét tryk — eller ring, så '
      + 'tager vi den over telefonen.';

    var udveje = noedudgang(raekke);
    var raekkeDiv = lav('div', 'noedudgang');
    raekkeDiv.appendChild(udveje.sms);
    raekkeDiv.appendChild(udveje.ring);
    boks.appendChild(raekkeDiv);

    boks.classList.remove('skjult');
    boks.scrollIntoView({ block: 'center' });
  }

  function noedudgang(raekke) {
    var n = Butik.noedudgangSms(raekke);
    var sms = lav('a', 'knap', 'Send som sms');
    sms.href = n.href;
    var ring = lav('a', 'glass sm', 'Ring til os');
    ring.href = n.ring;
    return { sms: sms, ring: ring };
  }

  function visTak(b) {
    var form = $('bestil-form');
    var tak = $('bestil-tak');

    form.classList.add('skjult');
    tøm(tak);

    tak.appendChild(lav('div', 'eyebrow', 'Vi har den'));
    tak.appendChild(lav('h3', null, 'Tak, ' + b.navn.split(' ')[0] + '.'));

    /* BESTILT ER BESTILT — det er standarden nu.

       Kundens ord (23/8): "fjern det med ring og bekræft. De skal
       nok ringe og afbekræfte, hvis de ikke kan. Alt skal kunne
       administreres — man får deres oplysninger til netop sådan
       noget."

       Det er den samme beslutning, spiis-briefen argumenterede
       for: telefonen er nødudgangen, aldrig vejen. En gæst, der
       bestiller én burger til kl. 18, skal ikke udløse et opkald
       fra en travl luge.

       Kontakten i admin står stadig — ejeren skal kunne skrue den
       tilbage, hvis en sæson bliver for travl — men den er slået
       TIL som standard nu, og derfor === false og ikke === true.
       Betalingslinjen er ens uanset hvad: der er ikke betalt
       noget. */
    /* EN LEVERING BEKRÆFTES ALDRIG AF SIG SELV.

       Vi kan love, at maden bliver lavet — det er køkkenets eget
       arbejde. Vi kan IKKE love, at den kan køres til en adresse,
       vi ikke kender: der er ingen bekræftet leveringszone og
       ingen pris, se listen "Ejeren skal bekræfte" i README.
       Skrev siden "Bestilt. Leveres lørdag kl. 12" til en adresse
       i Roskilde, ville den have lovet noget, ingen har lovet —
       og gæsten ville opdage det, når maden ikke kom.

       Derfor er auto slået fra her, uanset hvad kontakten i admin
       står på. Den dag ejeren melder en zone ind, kan reglen
       løsnes — men ikke før. */
    var leveres = b.hvordan === 'levering';
    var auto = (data.indstillinger || {}).auto_bekraeft !== false && !leveres;

    /* VED BORDET RINGER VI IKKE: et opkald til en telefon, der
       ligger på bordet foran gæsten, er ikke en bekræftelse.
       Står kontakten i admin på opkald, kommer personalet forbi
       bordet i stedet. */
    if (b.bord_nummer) {
      tak.appendChild(lav('p', null, auto
        ? 'Bestilt til bord ' + b.bord_nummer + '. Vi kommer med det. '
          + 'Der er ikke betalt noget – du betaler ved lugen.'
        : 'Vi kommer forbi bord ' + b.bord_nummer + ' og bekræfter. '
          + 'Der er ikke betalt noget – du betaler ved lugen.'));
    } else {
      tak.appendChild(lav('p', null, auto
        ? 'Bestilt. Hentes ' + dagNavn(data, b.hent_dato) + ' d. '
          + dagDato(b.hent_dato) + ' kl. ' + b.hent_tid.replace(':', '.') + '. '
          + 'Der er ikke betalt noget – du betaler når du henter. '
          + 'Kan køkkenet mod forventning ikke lave den, ringer vi til dig.'
        : leveres
          ? 'Vi ringer til dig på ' + b.telefon + ' og bekræfter, at vi kan '
            + 'køre til adressen. Der er ikke betalt noget, og der er ikke '
            + 'trukket noget.'
          : 'Vi ringer til dig på ' + b.telefon + ' og bekræfter. '
            + 'Der er ikke betalt noget, og der er ikke trukket noget – '
            + 'du betaler når du henter.'));
    }

    var kvit = lav('div', 'kvit');
    kvit.appendChild(kvitLinje('Reference', b.reference));
    if (b.bord_nummer) {
      kvit.appendChild(kvitLinje('Bord', b.bord_nummer));
    } else {
      kvit.appendChild(kvitLinje(leveres ? 'Leveres' : 'Hentes',
        dagNavn(data, b.hent_dato) + ' '
        + dagDato(b.hent_dato) + ' kl. ' + b.hent_tid.replace(':', '.')));
    }
    if (leveres && b.leverings_adresse) {
      kvit.appendChild(kvitLinje('Adresse', b.leverings_adresse));
    }
    b.linjer.forEach(function (l) {
      kvit.appendChild(kvitLinje(l.antal + ' × ' + l.navn,
        l.pris ? window.MosedePris(l.pris * l.antal) : ''));
    });
    if (b.fyld.length) kvit.appendChild(kvitLinje('Fyld', b.fyld.join(', ')));
    if (b.besked) kvit.appendChild(kvitLinje('Din besked', b.besked));
    tak.appendChild(kvit);

    var m = window.MOSEDE;
    var knapper = lav('div', 'tags luft');
    var ring = lav('a', 'glass solid', m ? m.telefonPent : 'Ring til os');
    ring.href = 'tel:' + (m ? m.telefon : '');
    knapper.appendChild(ring);
    var igen = lav('button', 'glass sm', 'Bestil noget mere');
    igen.type = 'button';
    igen.addEventListener('click', function () {
      tak.classList.add('skjult');
      form.classList.remove('skjult');
      $('bestil-send').disabled = false;
      $('bestil-send').textContent = 'Send bestilling';
      visStykker(); visFyld(); visSum();
      form.scrollIntoView({ block: 'start' });
    });
    knapper.appendChild(igen);
    tak.appendChild(knapper);

    tak.classList.remove('skjult');
    tak.scrollIntoView({ block: 'center' });
    tak.focus();
  }

  function kvitLinje(navn, vaerdi) {
    var r = lav('div', 'kvit-linje');
    r.appendChild(lav('span', 'kvit-navn', navn));
    if (vaerdi) r.appendChild(lav('span', 'kvit-vaerdi', vaerdi));
    return r;
  }

  // ----------------------------------------------------------
  //  START
  //  --------------------------------------------------------
  //  Data kommer FRA js/smoerrebroed.js, som allerede har hentet
  //  dem. To Butik.hent() på samme side ville være to gange samme
  //  syv tabeller over en mobilforbindelse.
  // ----------------------------------------------------------
  function start(d) {
    data = d;
    if (!$('bestil-form')) return;

    var aaben = (d.indstillinger || {}).bestilling_aaben;
    if (aaben === false) {
      $('bestil-form').classList.add('skjult');
      $('bestil-lukket').classList.remove('skjult');
      return;
    }
    $('bestil-lukket').classList.add('skjult');

    /* ER DER OVERHOVEDET NOGET AT BESTILLE HER?

       Forsidens formular sælger alt UNDTAGEN smørrebrødet (23/8),
       og på en forretning, hvor kun smørrebrødet er åbnet i admin,
       er dens liste derfor tom. Det er ikke en fejl — men den
       besked, en tom liste gav, ER fejlens: "Vi kan ikke hente
       udvalget lige nu. Ring til os." Den ville stå på forsiden
       hver eneste dag og sende gæster til telefonen uden grund.

       Afsnittet forsvinder i stedet, som resten af forsiden: er
       der ikke noget at gøre, findes afsnittet ikke. Reglen gælder
       kun, hvor formularen er ét afsnit blandt flere — på
       bestil/ ER formularen siden, og dér skal beskeden stå.

       Dagens ret tæller kun med, hvis den kan nås: er varslet et
       døgn, kan man ikke bestille dagen i dags ret, og så holder
       den ikke et tomt afsnit i live. */
    var ret = (d.indstillinger || {}).dagens_ret || {};
    var iDagKanVaelges = muligeDage(d).indexOf(Butik.nu().dato) !== -1;
    var noget = stykker(d).length || fyldene(d).length
      || (ret.navn && iDagKanVaelges);
    if (!noget && $('bestil-form').getAttribute('data-tom') === 'skjul') {
      var afsnit = $('bestil-form').parentNode;
      while (afsnit && afsnit.tagName !== 'SECTION') afsnit = afsnit.parentNode;
      if (afsnit) {
        afsnit.classList.add('skjult');
        /* PILLEN PEGEDE HERNED. Er afsnittet væk, skal den pege
           derhen, hvor der faktisk kan bestilles — smørrebrødets
           egen side. En rød knap, der ruller til ingenting, er
           værre end ingen knap; er der heller ikke smørrebrød,
           er der ikke noget at bestille nogen steder, og så
           forsvinder den. */
        var pille = document.querySelector('.bestil-fast');
        if (pille) {
          /* Spørgsmålet er, om der er noget at lave på DEN side,
             pillen peger over på — ikke om smørrebrødet har
             priser. Et fyld uden pris kan stadig ØNSKES på
             bestil/, og en pille, der forsvinder, mens siden bag
             den har noget at byde på, er en dør, ingen finder.
             Målt af "uden forsidens formular fører pillen til
             smørrebrødet" i tests/bestil-doeren.spec.js. */
          var smoer = Butik.udvalg(d, 'kun-smoer');
          if (smoer.varer.length || smoer.oenskefyld.length) pille.href = 'bestil/';
          else pille.classList.add('skjult');
        }
        return;
      }
    }

    var besked = (d.indstillinger || {}).bestilling_besked || '';
    var bel = $('bestil-besked');
    if (besked) { bel.textContent = besked; bel.classList.remove('skjult'); }
    else bel.classList.add('skjult');

    /* Varslet skrives ud som det ejeren har sat det. Står der 24,
       står der "et døgn i forvejen" – ikke "vi skal have god tid",
       som ikke betyder noget. */
    var timer = varselTimer(d);
    var vt = $('bestil-varsel');
    if (vt) {
      vt.textContent = timer >= 48
        ? 'Vi skal have bestillingen mindst ' + Math.round(timer / 24) + ' dage i forvejen.'
        : timer >= 24
          ? 'Vi skal have bestillingen mindst et døgn i forvejen.'
          : timer > 0
            ? 'Vi skal have bestillingen mindst ' + timer + ' timer i forvejen.'
            : '';
      vt.classList.toggle('skjult', !vt.textContent);
    }

    /* Manchetten følger den samme kontakt som kvitteringen. Har
       ejeren skruet tilbage til opkald, skal linjen sige det —
       ellers lover forsiden noget, kvitteringen tager tilbage. */
    var manchet = $('bestil-manchet');
    if (manchet) {
      /* Linjen sagde "Spis her på trædækket, eller tag den med"
         begge steder. Det passede, da formularen kun lå ét sted;
         nu står den også på siden, der hedder "Smørrebrød UD AF
         HUSET", og dér er den første halvdel en modsigelse.
         Valget stilles inde i formularen, efter maden — linjen
         her handler om aftalen, ikke om bordet. */
      manchet.textContent = (d.indstillinger || {}).auto_bekraeft === false
        ? 'Vi ringer og bekræfter, og du betaler ved lugen, når du henter.'
        : 'Bestilt er bestilt — du betaler ved lugen, når du henter. '
          + 'Skal noget laves om, ringer du bare.';
    }

    læsKurv();
    /* ?hvordan= i adressen forudvælger To go eller Spis her.

       Forsiden havde to kort, der bar valget med hertil. De er
       væk (kundens ord, 22/8: valget hører hjemme her i
       formularen, efter maden). Men reglen bliver stående: et
       link fra Facebook, en QR-kode på et bord eller en genvej
       fra en anden side kan stadig sige "spis her", og så skal
       feltet stå rigtigt fra start.

       Det lægges i kurven EFTER læsKurv og FØR visHvordan:
       adressen vejer tungere end et gammelt gemt valg. Har ejeren
       lukket for spis her i admin, tvinger visHvordan valget
       tilbage til afhentning — adressen kan aldrig love noget,
       admin har lukket for. */
    var hv = /[?&]hvordan=(spis-her|tag-med|levering)/.exec(location.search);
    if (hv) {
      var oensket = hv[1] === 'spis-her' ? 'spis_her'
        : hv[1] === 'levering' ? 'levering' : 'afhentning';
      /* MEN KUN HVIS SIDEN OVERHOVEDET SPØRGER OM DET.

         bestil/?hvordan=spis-her findes ude i verden — i links, i
         bogmærker, i det der er delt. Siden spørger ikke længere
         om spis her (den handler om smørrebrød ud af huset), og
         uden den her prøve ville kurven stå på 'spis_her', mens
         ingen af de to knapper var markeret: gæsten ser et valg,
         hvor intet er valgt, og kan ikke se hvorfor.

         Et ønske, siden ikke kan opfylde, ignoreres i stilhed —
         som da adressen aldrig kunne love noget, admin havde
         lukket for. */
      var muligt = hvordanValg().some(function (v) { return v[0] === oensket; });
      if (muligt) kurv.hvordan = oensket;
    }
    /* VED BORDET ER DER INTET AT VÆLGE: gæsten sidder der nu, og
       maden spises her. Sættes EFTER læsKurv og ?hvordan=, så en
       gammel kurv ikke kan gøre bordets bestilling til en
       afhentning — databasen ville afvise den, men først ved
       tryk på send. valgtDag sættes her, fordi visDage() ikke
       gør det uden sin vælger, og uden en dag falder dagens ret
       ud af listen. */
    if (vedBordet()) {
      kurv.hvordan = 'spis_her';
      valgtDag = Butik.nu().dato;

      /* Kurven er fælles for siderne, og ved bordet må den kun
         indeholde det, bordet kan sælge — se renser() i
         js/ved-bordet.js, som har ryddet den, før vi kom hertil. */
    }

    /* DAGENE FØRST: visStykker skal vide, hvilken dag der er
       valgt, for dagens ret står kun i listen på dagen i dag.
       Før byttet stod retten aldrig der ved første tegning —
       valgtDag var stadig null, da listen blev bygget. */
    visDage();
    visStykker();
    visFyld();
    visHvordan();
    visTider();
    visSum();

    $('bestil-form').addEventListener('submit', send);

    /* ---- KURVEN FØRER VIDERE ----
       Et tryk ruller ned til hentetid og kontaktoplysninger. Det er
       den samme bevægelse som i en takeaway-kurv: se hvad du har,
       tryk videre, udfyld. */
    var kurvBar = $('bestil-kurv');
    if (kurvBar) {
      kurvBar.addEventListener('click', function () {
        /* Uden tidsvælger (bordet) førte kurven ingen steder hen,
           og en klæbende bjælke, der ikke gør noget, ligner en
           side i stykker. */
        var maal = $('bestil-tid') || $('bestil-navn');
        if (maal) maal.scrollIntoView({ block: 'center' });
      });
    }

    /* Og den forsvinder når Send-knappen er i syne. Er man nået
       derned, har man ikke brug for en genvej dertil – og en
       klæbende bjælke oven på det sidste felt er i vejen. */
    if (kurvBar && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        kurvBar.classList.toggle('naaet-bunden', es[0].isIntersecting);
      }, { rootMargin: '0px 0px -20% 0px' }).observe($('bestil-send'));
    }

    /* ---- DE FOLDEDE BLOKKE ----

       Et rigtigt <button aria-expanded> og et rigtigt hidden på
       kroppen. Ikke max-height og overflow: en skærmlæser skal have
       at vide at der ER noget mere, og hvad tilstanden er – og et
       felt der er skjult med højde 0 kan stadig få fokus med
       tabulator, hvilket sender markøren et sted man ikke kan se. */
    [['fyld-knap', 'bestil-fyld']].forEach(function (par) {
      var knap = $(par[0]);
      var krop = $(par[1]);
      if (!knap || !krop) return;
      knap.addEventListener('click', function () {
        var aaben = knap.getAttribute('aria-expanded') === 'true';
        knap.setAttribute('aria-expanded', aaben ? 'false' : 'true');
        krop.hidden = aaben;
      });
    });

    // Fejlen forsvinder når man retter feltet – ikke først når man
    // trykker Send igen
    ['navn', 'telefon'].forEach(function (k) {
      $('bestil-' + k).addEventListener('input', function () {
        visFejl('bestil-' + k, null);
      });
    });
  }

  window.MosedeBestilling = { start: start };
})();
