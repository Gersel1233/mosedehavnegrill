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
  function stykker(d) { return Butik.udvalg(d).varer; }
  function fyldene(d) { return Butik.udvalg(d).oenskefyld; }

  // ----------------------------------------------------------
  //  HVILKE DAGE OG TIDER KAN MAN HENTE?
  //  --------------------------------------------------------
  //  Der findes ikke en fri dato. Dagene regnes ud af
  //  åbningstiderne, lukkedagene og vinterlukket, så gæsten ikke
  //  kan vælge en dag hvor lugen er lukket. En datovælger med
  //  alle årets dage ville lade hende bestille til 1. januar.
  // ----------------------------------------------------------
  var DAGE_FREM = 28;

  function isoPlus(iso, dage) {
    // Middag i UTC: så flytter et døgn ikke datoen ved sommertid
    var t = new Date(iso + 'T12:00:00Z');
    t.setUTCDate(t.getUTCDate() + dage);
    return t.toISOString().slice(0, 10);
  }

  function ugedagFor(iso) {
    // Butik.nu() giver 0 = mandag. Date giver 0 = søndag.
    var d = new Date(iso + 'T12:00:00Z').getUTCDay();
    return (d + 6) % 7;
  }

  function planFor(d, iso) {
    // Butik.lukketDen dækker også en lukkeperiode over flere dage.
    // Med den gamle sammenligning på ét dato-felt kunne gæsten
    // bestille midt i vinterlukningen.
    if (Butik.lukketDen(d, iso)) return null;
    var p = (d.aabningstider || []).filter(function (a) {
      return a.ugedag === ugedagFor(iso);
    })[0];
    if (!p || p.lukket) return null;
    if (!p.aabner || !p.lukker) return null;
    return p;
  }

  function varselTimer(d) {
    var v = Number((d.indstillinger || {}).bestilling_varsel_timer);
    return isFinite(v) && v >= 0 ? v : 24;
  }

  function minStk(d) {
    var v = Number((d.indstillinger || {}).bestilling_min_stk);
    return isFinite(v) && v >= 1 ? Math.round(v) : 1;
  }

  /* Det tidligste øjeblik der kan hentes, som {dato, minutter} i
     dansk tid. Butik.nu() er dansk tid – det er hele grunden til at
     den findes – så varslet lægges oveni derfra. */
  function tidligst(d) {
    var nu = Butik.nu();
    var minutter = nu.minutter + varselTimer(d) * 60;
    var dato = nu.dato;
    while (minutter >= 24 * 60) { minutter -= 24 * 60; dato = isoPlus(dato, 1); }
    return { dato: dato, minutter: minutter };
  }

  /* Tiderne på en dag: hver halve time, og sidste tid en halv time
     før der lukkes, så der er tid til at række posen ud af lugen.
     Er dagen den tidligst mulige, ryger tiderne før varslet. */
  function tiderFor(d, iso) {
    var p = planFor(d, iso);
    if (!p) return [];

    var fra = Butik.tilMinutter(p.aabner);
    var til = Butik.tilMinutter(p.lukker);

    /* En TIDLIG LUKNING fra kalenderen skærer aftenen af. Uden den
       her kunne gæsten bestille afhentning kl. 19 på en dag, hvor
       lugen lukker 15 — forsiden vidste det, formularen gjorde
       ikke. Fundet, da bordformularen fik samme regel. */
    var tidligt = Butik.tilMinutter(Butik.tidligLukning(d, iso));
    if (tidligt !== null && tidligt < til) til = tidligt;
    til -= 30;

    var t = tidligst(d);
    if (iso === t.dato) fra = Math.max(fra, Math.ceil(t.minutter / 30) * 30);

    var ud = [];
    for (var m = fra; m <= til; m += 30) {
      ud.push(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2));
    }
    return ud;
  }

  function muligeDage(d) {
    var t = tidligst(d);
    var ud = [];
    for (var i = 0; i < DAGE_FREM && ud.length < 14; i++) {
      var iso = isoPlus(t.dato, i);
      if (tiderFor(d, iso).length) ud.push(iso);
    }
    return ud;
  }

  var MAANED = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'juni',
    'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];

  function dagNavn(d, iso) {
    var i_dag = Butik.nu().dato;
    if (iso === i_dag) return 'I dag';
    if (iso === isoPlus(i_dag, 1)) return 'I morgen';
    return Butik.UGEDAGE[ugedagFor(iso)].slice(0, 3) + '.';
  }

  function dagDato(iso) {
    return Number(iso.slice(8, 10)) + '. ' + MAANED[Number(iso.slice(5, 7)) - 1];
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

  /* HVILKEN SLAGS ER VALGT? null betyder "der er ikke noget at
     vælge imellem" — altså at kun smørrebrødet kan bestilles, som
     det er i dag. Så tegnes rækken slet ikke, og listen ser ud
     præcis som før.

     Valget er et FILTER og ikke en tragt: kurven bliver, når man
     skifter, og tallet på chippen viser, hvad der ligger i den
     anden slags. Uden det tal kunne gæsten vælge en burger, skifte
     til smørrebrødet og glemme burgeren — den står stadig i
     kurven, og hun ser den først på kvitteringen. */
  var valgtSlags = null;

  /* Kommer gæsten fra et kort på forsiden, står slagsen i adressen:
     .../bestil/?slags=Softice%20og%20vafler. Uden det landede hun
     på smørrebrødet, uanset hvad hun havde trykket på — og så
     skulle hun vælge igen, lige efter at have valgt.

     En ukendt værdi vælger ingenting: så falder siden tilbage til
     den første slags, præcis som uden en adresse. En parameter fra
     en adresselinje er ikke data, man stoler på. */
  var fraAdressen = (function () {
    var m = /[?&]slags=([^&]*)/.exec(location.search || '');
    if (!m) return null;
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); }
    catch (e) { return null; }
  })();

  /* Rækken af "hvad skal det være?". Den tegnes ind i
     #bestil-slags, hvis siden har sådan et element — gør den ikke
     det, sker der ingenting, og listen står som før. */
  function visSlags(slags) {
    var boks = $('bestil-slags');
    if (!boks) return;
    tøm(boks);

    slagsNu = slags;
    if (!valgtSlags) { boks.classList.add('skjult'); return; }

    slags.forEach(function (x) {
      var erValgt = x.navn === valgtSlags;
      var b = lav('button', 'slags-knap' + (erValgt ? ' valgt' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', erValgt ? 'true' : 'false');
      b.appendChild(lav('span', 'slags-navn', x.navn));

      /* Tallet er hele grunden til, at man tør skifte: det viser,
         at burgeren stadig ligger i kurven, mens man kigger på
         smørrebrødet. */
      var n = 0;
      x.grupper.forEach(function (g) {
        (iGruppeNu[g] || []).forEach(function (v) { n += kurv.stk[v.navn] || 0; });
      });
      if (n) b.appendChild(lav('span', 'slags-tal', n));

      b.addEventListener('click', function () {
        if (valgtSlags === x.navn) return;
        valgtSlags = x.navn;
        visStykker();
      });
      boks.appendChild(b);
    });
    boks.classList.remove('skjult');
  }

  /* visSlags() skal kunne tælle i grupperne, og de bygges inde i
     visStykker(). Den her holder den seneste udgave, så tallet på
     chippen kan regnes uden at bygge alt op igen. */
  var iGruppeNu = {};
  var slagsNu = [];

  /* Kun tallene tegnes om, ikke hele rækken. En gentegning ville
     flytte fokus væk fra plusknappen midt i et tryk. */
  function opdaterSlagsTal() {
    var boks = $('bestil-slags');
    if (!boks || !valgtSlags) return;
    Array.prototype.forEach.call(boks.querySelectorAll('.slags-knap'),
      function (b, i) {
        var x = slagsNu[i];
        if (!x) return;
        var n = 0;
        x.grupper.forEach(function (g) {
          (iGruppeNu[g] || []).forEach(function (v) { n += kurv.stk[v.navn] || 0; });
        });
        var mrk = b.querySelector('.slags-tal');
        if (n && !mrk) b.appendChild(lav('span', 'slags-tal', n));
        else if (n) mrk.textContent = n;
        else if (mrk) b.removeChild(mrk);
      });
  }

  function visStykker() {
    var boks = $('bestil-stykker');
    tøm(boks);

    var liste = stykker(data);

    /* DAGENS RET STÅR ØVERST I LISTEN — den gælder dagen i dag,
       som feltet i admin er skruet sammen, og på alle andre dage
       forsvinder den af sig selv. Den bestilles som enhver anden
       linje; køkkenet ser navnet på kortet i admin. */
    var ret = (data.indstillinger || {}).dagens_ret || {};
    if (ret.navn && valgtDag === Butik.nu().dato) {
      liste = [{ navn: ret.navn, beskrivelse: ret.beskrivelse || '',
        pris: ret.pris, kategori_id: '__dagens' }].concat(liste);
    }
    if (!liste.length) {
      boks.appendChild(lav('p', 'desc',
        'Vi kan ikke hente udvalget lige nu. Ring til os – vi tager den over telefonen.'));
      return;
    }

    var s = Butik.udvalg(data);

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
    iGruppeNu = iGruppe;

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

    /* SLAGS-FILTERET ER VÆK — kundens ord (23/8): formularen skal
       være præcis som spiis', og dér står ALLE kategorier som
       folde i én liste. To måder at vise det samme udvalg på er
       én for meget, og filteret gemte kurvens indhold bag en
       chip, man skulle huske at kigge på. Kurven på tværs af
       kategorier virker som før — nøglen er varens navn. */
    valgtSlags = null;

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
        /* Tallet på slags-chippen skal følge med med det samme.
           Ellers står der "2" på Burgere, mens gæsten lige har
           fjernet dem — og et forkert tal på en chip er værre end
           ingen chip: det er hele grunden til, at hun tør skifte. */
        opdaterSlagsTal();
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
    tøm(boks);

    var liste = fyldene(data);
    if (!liste.length) { $('bestil-fyld-trin').classList.add('skjult'); return; }

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
  function visHvordan() {
    var trin = $('bestil-hvordan-trin');
    if (!trin) return;

    var kan = (data.indstillinger || {}).spis_her !== false;
    trin.classList.toggle('skjult', !kan);
    if (!kan) { kurv.hvordan = 'afhentning'; return; }

    var boks = $('bestil-hvordan');
    tøm(boks);

    /* Spiis' egne ord og én linje pr. knap: "To-go" og "Spis
       her". Værdien bagved hedder stadig afhentning — det er
       databasens ord, og det skal ikke skifte, fordi skiltet
       gør. */
    [['afhentning', '🥡 To-go'],
     ['spis_her', '🍽️ Spis her']].forEach(function (valg) {
      var valgt = kurv.hvordan === valg[0];
      var b = lav('button', 'type-knap' + (valgt ? ' valgt' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', valgt ? 'true' : 'false');
      b.appendChild(lav('span', 'type-navn', valg[1]));
      b.addEventListener('click', function () {
        kurv.hvordan = valg[0];
        gemKurv();
        visHvordan();
      });
      boks.appendChild(b);
    });
  }

  function visTider() {
    var vaelg = $('bestil-tid');
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
    var liste = stykker(data);
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

    /* Er der en ??-vare i kurven, må summen ikke lyve: "70,-" for
       en kurv med en burger uden pris er et tal, gæsten vil holde
       os op på i telefonen. Så står der "+ det uden pris". */
    var udenPris = Object.keys(kurv.stk).some(function (k) {
      if (!(kurv.stk[k] > 0)) return false;
      var v = stykker(data).filter(function (x) { return x.navn === k; })[0];
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

    var fejl = {
      navn: Butik.tjek.navn(navn, 'navn', 80),
      telefon: Butik.tjek.telefon(telefon),
    };

    visFejl('bestil-navn', fejl.navn);
    visFejl('bestil-telefon', fejl.telefon);

    var foerste = ['navn', 'telefon'].filter(function (k) { return fejl[k]; })[0];
    if (foerste) {
      // Læg markøren dér hvor fejlen er, og rul den frem
      var felt = $('bestil-' + foerste);
      felt.focus();
      return;
    }

    var tid = $('bestil-tid').value;
    if (!valgtDag || !tid) {
      sigFejl('Vælg en dag og en tid.');
      return;
    }
    if (antalIKurv() < minStk(data)) {
      sigFejl('Vælg hvor mange stykker du vil have.');
      return;
    }

    var linjer = [];
    var liste = stykker(data);
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
    linje('Hentes', dagNavn(data, b.hent_dato) + ' d. ' + dagDato(b.hent_dato)
      + ' kl. ' + b.hent_tid.replace(':', '.'));
    linje('Hvordan', b.hvordan === 'spis_her' ? 'Spis her' : 'To-go');
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
      // Kurven er sendt. Den skal ikke stå og vente på næste besøg.
      kurv = { stk: {}, fyld: [], hvordan: 'afhentning' };
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

    /* Præcis hvad der sker nu, og hvad der IKKE er sket. Med
       ejerens kontakt slået til ER bestillingen aftalen — "Bestilt.
       Hentes …" — og telefonen er nødudgangen. Slået fra ringer vi
       og bekræfter, som aftalt hele vejen. Betalingslinjen er ens:
       der er ikke betalt noget, uanset tilstand. */
    var auto = (data.indstillinger || {}).auto_bekraeft === true;
    tak.appendChild(lav('p', null, auto
      ? 'Bestilt. Hentes ' + dagNavn(data, b.hent_dato) + ' d. '
        + dagDato(b.hent_dato) + ' kl. ' + b.hent_tid.replace(':', '.') + '. '
        + 'Der er ikke betalt noget – du betaler når du henter. '
        + 'Kan køkkenet mod forventning ikke lave den, ringer vi til dig.'
      : 'Vi ringer til dig på ' + b.telefon + ' og bekræfter. '
        + 'Der er ikke betalt noget, og der er ikke trukket noget – '
        + 'du betaler når du henter.'));

    var kvit = lav('div', 'kvit');
    kvit.appendChild(kvitLinje('Reference', b.reference));
    kvit.appendChild(kvitLinje('Hentes', dagNavn(data, b.hent_dato) + ' '
      + dagDato(b.hent_dato) + ' kl. ' + b.hent_tid.replace(':', '.')));
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

    /* GRUNDPRINCIPPET følger ejerens kontakt i admin. FRA: alt
       siger "vi ringer og bekræfter", som aftalt hele vejen. TIL:
       bestillingen ER accepteret, og telefonen er nødudgangen —
       teksterne herunder og i kvitteringen skifter med. */
    if ((d.indstillinger || {}).auto_bekraeft === true) {
      var manchet = $('bestil-manchet');
      if (manchet) {
        manchet.textContent = 'Spis her på trædækket, eller tag den med. '
          + 'Bestil, hent, og betal ved lugen — skal noget laves om, '
          + 'ringer du bare.';
      }
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
    var hv = /[?&]hvordan=(spis-her|tag-med)/.exec(location.search);
    if (hv) kurv.hvordan = hv[1] === 'spis-her' ? 'spis_her' : 'afhentning';
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
        var maal = $('bestil-tid');
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
