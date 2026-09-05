/* ============================================================
   FORSIDENS BESTILLING — KOBLINGEN, IKKE SKALLEN

   Designet tegnede en formular med faste datoer, faste
   klokkeslæt og seks rækker mad skrevet i hånden. Her får den
   forretningens egne: dagene kommer fra åbningstiderne og
   kalenderen, tiderne fra den valgte dag, varerne fra det, der er
   åbnet for i admin — og "Send bestilling" skriver i databasen,
   så den står i køkkenets overblik med det samme.

   REGLERNE ER IKKE SKREVET HER. Hvilke dage og tider der kan
   vælges, står i js/bestil-regler.js, som bestil/ og ved-bordet/
   bruger i forvejen. To udgaver af "hvornår kan man hente?" er
   én for meget: rettes varslet det ene sted og glemmes det
   andet, kan gæsten bestille til om to timer på den ene side og
   ikke på den anden — og ingen af delene ser forkerte ud.

   OPMÆRKNINGEN LAVES IKKE OM. Rækkerne, der bygges, er designets
   egne: .item med h4, .tag og .step, og .item.hi til dagens ret.
   Der findes ikke en klasse i den her fil, som ikke allerede står
   i havnegrillen.css.

   TO SIDER, ÉN MOTOR. Forsiden og h-smorrebrod.html har hver sin
   formular med hver sine felt-id'er, men det er den SAMME
   bestilling, der bliver sendt. Forskellene står i SIDER nedenfor
   som opsætning; alt andet er fælles. Skrev vi den samme
   afsendelse to gange, ville den anden langsomt komme til at gøre
   noget andet end den første — og det ville ingen opdage, før en
   gæst fik forkert mad.
   ============================================================ */

(function () {
  'use strict';

  if (!window.Butik || !window.MosedeRegler) return;

  var R = window.MosedeRegler;

  /* ---- DE TO FORMULARER ----

     udvalg: ⚠️ FILTERET ER UDEN VIRKNING SIDEN 31/8. Her stod, at
     forsiden sælger stykkerne, men ikke de 29 slags fyld. Kunden
     lukkede den model ("1 mad er som 1 mad"), og 'uden-fyld' er
     nu det samme som 'kun-smoer' — se Butik.udvalg. Ordet bliver
     stående, fordi det står i data-udvalg og i prøver
     (dét er byggeriet, og det har sin egen side). Smørrebrødssiden
     sælger KUN smørrebrød — den er blevet smørrebrødets side.

     hvordan: forsiden spørger "spis her eller tag med", som lugen
     gør. Smørrebrødssiden spørger "hentes eller leveres", fordi
     smørrebrød pr. definition er ud af huset. Ét modul, to
     spørgsmål — ikke to moduler. */
  var SIDER = [
    {
      navn: 'forsiden',
      udvalg: 'uden-fyld',
      felter: { dato: 'dato', tid: 'tid', navn: 'navn', tlf: 'tlf', besked: 'besked' },
      seg: '[data-seg="how"]',
      segSvar: ['afhentning', 'spis_her'],
      segKraever: 'spis_her',
      dagensRet: true,
      folder: true,
      dagensHint: true,
      skjulHele: true,
      pilleTil: 'h-smorrebrod.html',
    },
    {
      navn: 'smørrebrødet',
      /* ⚠️ 'kun-smoer' OG IKKE 'skiver' (4/9). Her stod
         størrelsesmodellen — hel skive 55 / håndmad 27 med det
         samme fyld til begge — og en note om, at INGEN side
         brugte opsætningen. Begge dele er overhalet: kunden
         lukkede modellen 31/8 ("1 mad er som 1 mad"), og siden
         er en bestillingsside igen 4/9.

         Butik.udvalg har ÉN liste nu, så 'skiver', 'uden-fyld' og
         'kun-smoer' peger på det samme filter. Ordet står som
         'kun-smoer', fordi det er dét, siden faktisk sælger — en
         fælde for den, der læser koden om et halvt år, koster
         mere end de tre bogstaver, den sparer. */
      udvalg: 'kun-smoer',
      felter: {
        dato: 'sdato', tid: 'stid', navn: 'snavn',
        tlf: 'stlf', besked: 'sbesked', adresse: 'sadr',
      },
      seg: '[data-toggles="#levfelt"]',
      /* ⚠️ RÆKKEFØLGEN ER OPMÆRKNINGENS, IKKE EN SMAG. hvordan()
         slår knappens PLADS op her, og på smørrebrødssiden står
         "Vi henter" først, fordi levering koster 79 kr. og ikke
         må være forvalgt. Stod ['levering','afhentning'] her,
         ville et tryk på "Vi henter" blive sendt som en LEVERING
         — og gæsten få "Skriv adressen" på et felt, der er
         foldet væk. MÅLT 4/9, ikke læst. */
      segSvar: ['afhentning', 'levering'],
      segKraever: 'levering',
      adresseFelt: '#levfelt',
      dagensRet: false,
      /* ⚠️ FOLDER, FORDI DER ER TO KATEGORIER OG 48 VARER.
         Kundens ord 4/9: "opdelingen imellem smørbrødne skal
         være bedre" og "telefon opdelt sortiemtn valg". Ejerens
         kort er SMØRREBRØD (24 hele skiver) og HÅNDMADDER (de
         samme 24, halve) — MÅLT: 48 rækker i én liste er over
         3000 px på en telefon, og de to halvdele ligner
         hinanden på en prik. Folden er husets egen fra forsiden
         og bestil/; vi opfinder ikke en ny form. */
      folder: true,
      varselHint: true,
      skjulHele: false,
      /* ⚠️ INGEN STØRRELSESVÆLGER OG INTET ØNSKEFYLD. Begge dele
         døde med "1 mad er 1 mad" 31/8: hvert stykke er sin egen
         vare med sin egen pris, og et stykke uden pris er ikke et
         ønske — det er "Ring og hør prisen", husets regel for
         hver anden vare siden 26/8. */
      fyld: false,
      stoerrelser: false,
    },
  ];

  var side = null;

  var MÅNEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

  var data = null;
  var valgtDag = null;
  /* Hvor mange bestillinger der allerede skal hentes pr.
     klokkeslæt. Hentes for sig, fordi den kommer fra en visning
     gæsten må læse — se Butik.hentFyldteTider. Tom liste = vi
     kunne ikke se det, og så bestilles der som før; værnet i
     databasen siger fra, hvis tidsrummet er fyldt. */
  var fyldteTider = [];
  var kurv = {};              // nøgle → { navn, pris, antal }
  var valgtFyld = [];         // navnene på det fyld, gæsten ønsker
  var valgtStoerrelse = null; // hel skive eller håndmad — vare-rækken selv
  var aabne = {};             // kategori-id → foldet ud?
  var panel = null;

  /* ⚠️ FORNAVNET MED STORT FORBOGSTAV  (4/9). MÅLT på kundens
     eget skud: han skrev "mikkel" i feltet, og kvitteringen sagde
     *"Tak, mikkel."* Gæsten skriver småt på en telefon, hvor
     autokorrekturen ikke er slået til i et navnefelt — og en
     kvittering, der siger navnet forkert tilbage, er det første,
     hun læser. Samme regel som Admin.pæntNavn på personalesiden;
     dén kan ikke lånes her, for admin-filerne indlæses ikke af
     en gæsteside. */
  function pæntFornavn(navn) {
    var f = String(navn || '').trim().split(/\s+/)[0] || '';
    return f ? f.charAt(0).toUpperCase() + f.slice(1) : 'for bestillingen';
  }

  function find(vælger, rod) {
    try { return (rod || document).querySelector(vælger); } catch (e) { return null; }
  }
  function alle(vælger, rod) {
    return Array.prototype.slice.call((rod || document).querySelectorAll(vælger));
  }
  function tøm(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }

  function felt(navn) {
    var id = side.felter[navn];
    return id ? find('#' + id, panel) : null;
  }

  function værdi(navn) {
    var f = felt(navn);
    return f ? f.value : '';
  }

  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst !== undefined && tekst !== null) el.textContent = tekst;
    return el;
  }

  /* "89" → "89,-", tom pris → tom streng. Samme format som
     designets egne prislapper. */
  function kroner(p) {
    if (p === null || p === undefined || p === '') return '';
    var n = Number(p);
    if (!isFinite(n)) return '';
    return (n % 1 === 0 ? String(n) : n.toFixed(2).replace('.', ',')) + ',-';
  }

  function langDato(iso) {
    var t = new Date(iso + 'T12:00:00Z');
    var uge = Butik.UGEDAGE[(t.getUTCDay() + 6) % 7].toLowerCase();
    return uge + ' d. ' + t.getUTCDate() + '. ' + MÅNEDER[t.getUTCMonth()];
  }

  /* Designets egen ordlyd i datovælgeren: "I dag – søndag d. 23.
     august". Den er værd at holde fast i — "I dag" alene siger
     ikke, hvilken dag maden bliver lavet, og datoen alene siger
     ikke, om det er i dag. */
  function dagTekst(iso) {
    var i_dag = Butik.nu().dato;
    if (iso === i_dag) return 'I dag – ' + langDato(iso);
    if (iso === R.isoPlus(i_dag, 1)) return 'I morgen – ' + langDato(iso);
    var t = langDato(iso);
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // ----------------------------------------------------------
  //  HVAD KAN BESTILLES
  //  ----------------------------------------------------------
  //  Dagens ret er en vare på linje med de andre — den står bare
  //  ikke i menukortet, men i ét felt i admin. Lå den kun i
  //  TEGNINGEN af listen, ville hverken summen eller den afsendte
  //  bestilling kende dens pris, og køkkenet fik retten uden
  //  kroner. Det er sket før, og det er derfor, den ligger her.
  // ----------------------------------------------------------
  /* DAGENS RETTER FØLGER DEN VALGTE DAG NU. Før var det kun i
     dag, fordi der kun fandtes ét felt — og bestilte man til på
     torsdag, kunne torsdagens ret ikke vælges. Tabellen
     dagens_retter gav hver dag sine egne.

     UDSOLGT OG UDEN PRIS KOMMER IKKE MED. Butik.retKanBestilles
     er den samme regel, menukortet viser efter: en udsolgt ret
     bliver stående på kortet, men kan ikke lægges i kurven. */
  function dagensRetter() {
    if (!side.dagensRet || !valgtDag) return [];
    return Butik.dagensRetter(data, valgtDag).filter(Butik.retKanBestilles);
  }

  function dagensRet() {
    return dagensRetter()[0] || null;
  }

  /* ⚠️ DEN VALGTE DAG SENDES MED — se den samme note i
     js/bestilling.js. Kategorierne kan sættes til kun hverdage,
     og listen klippes efter DEN dag, gæsten har valgt. */
  /* ⚠️ UDVALGET AFHÆNGER AF KLOKKESLÆTTET NU (30/8). Kundens ord:
     "man skal ikke kunne bestille en dagensret eller en burger
     klokken 10.00, det er først efter 12.30." Kategorien har et
     vindue, og listen skifter, når gæsten vælger et andet
     tidspunkt. */
  function valgtTid() {
    var t = felt('tid');
    return t && t.value ? t.value : '';
  }

  function udvalgNu() {
    return Butik.udvalg(data, side.udvalg, valgtDag, valgtTid(), hvordan()) || {};
  }

  function varerne() {
    return udvalgNu().varer || [];
  }

  /* ⚠️ VARER UDEN PRIS ER MED I GRUPPERINGEN  (31/8).

     `bestil/` og `ved-bordet/` har vist dem siden 26/8: rækken
     står med "Ring og hør prisen" i stedet for en tæller — en
     vare, der forsvinder, ligner en vare, der ikke findes.
     Designsiderne gjorde det ikke, og det gik an, så længe kun
     en håndfuld stykker manglede en pris.

     Med "1 mad er 1 mad" (31/8) er ejerens 29 fyld pludselig
     varer på lige fod — og de har ingen priser endnu. Uden det
     her ville de stå på bestil/ og være usynlige på forsiden:
     to lister over det SAMME sortiment, der siger hver sit. Det
     er præcis den slags skred, huset er fuldt af ar efter.

     ⚠️ DE KOMMER IKKE I KURVEN. varerne() er uændret, og kun den
     fylder kurv og sum. Rækkerne herunder har ingen tæller. */
  function spoergVarerne() {
    return (udvalgNu() || {}).spoergPris || [];
  }

  /* ⚠️ OG DET UDSOLGTE ER MED PÅ SAMME GRUND  (2/9).

     MÅLT af tests/tre-veje.spec.js, ikke læst: meldte personalet
     burgeren udsolgt, forsvandt den HELT fra forsiden — mens den
     stod gennemstreget på bestil/ og ved bordet. Altså tre lister
     over det samme sortiment, hvor den ene sagde, at retten ikke
     fandtes.

     Det er nøjagtig den samme fejl som prisløse varer havde
     indtil 31/8, og svaret er det samme: en vare, der
     forsvinder, ligner en vare, der ikke findes — og så tror
     gæsten, at kortet er blevet mindre, eller leder efter
     burgeren, hun lige så på menukortet.

     ⚠️ DEN ER GENNEMSTREGET, IKKE BARE DÆMPET. Dæmpet betyder
     "vi kender ikke prisen" (.spoerg-pris); gennemstreget
     betyder "den findes ikke i dag". De to må ikke se ens ud. */
  function udsolgteVarer() {
    return (udvalgNu() || {}).udsolgt || [];
  }

  function grupper() {
    var navne = {};
    (data.menu_kategorier || []).forEach(function (k) { navne[k.id] = k.navn; });

    var rækkefølge = [];
    var kasser = {};
    function iKasse(v, slags) {
      var id = String(v.kategori_id);
      if (!kasser[id]) {
        kasser[id] = { id: id, navn: navne[v.kategori_id] || 'Andet', varer: [] };
        rækkefølge.push(kasser[id]);
      }
      kasser[id].varer.push(slags ? { vare: v, slags: slags } : v);
    }
    /* De bestilbare FØRST i hver kategori: det er dem, gæsten kan
       gøre noget ved. De prisløse står efter, som på bestil/, og
       det udsolgte til sidst — det er dét, man ikke kan få. */
    varerne().forEach(function (v) { iKasse(v, null); });
    spoergVarerne().forEach(function (v) { iKasse(v, 'spoerg'); });
    udsolgteVarer().forEach(function (v) { iKasse(v, 'udsolgt'); });
    return rækkefølge;
  }

  function antalIKurv() {
    var n = 0;
    Object.keys(kurv).forEach(function (k) { n += kurv[k].antal; });
    return n;
  }

  /* ⚠️ MINDSTEANTALLET TÆLLER KUN SMØRREBRØDET (30/8). Kundens
     ord: han havde sat det til 5, "men det gælder på alt — det er
     en fejl, det er kun smørrebrød". Hvilke kategorier der er
     smørrebrødets, kommer fra Butik.udvalg og ikke fra en regex
     her: skellet bor ét sted. */
  function smoerIKurv() {
    var ids = (udvalgNu() || {}).smoerKategorier || [];
    var n = 0;
    Object.keys(kurv).forEach(function (k) {
      if (ids.indexOf(kurv[k].kat) !== -1) n += kurv[k].antal;
    });
    return n;
  }

  function sumIKurv() {
    var s = 0;
    Object.keys(kurv).forEach(function (k) {
      var l = kurv[k];
      if (typeof l.pris === 'number' && isFinite(l.pris)) s += l.pris * l.antal;
    });
    return s + emballagen().ialt + fragten().ialt;
  }

  /* ⚠️ EMBALLAGE ER IKKE EN VARE, MEN DEN ER EN PRIS (30/8).
     Kundens ord: "emballage tillæg ved to-go skal vi have."
     Den lægges til summen og står som sin egen linje i
     kvitteringen — gæsten skal kunne se, hvad hun betaler for.
     Ved spis her er den nul; maden bæres ud på en tallerken. */
  /* ⚠️ FRAGTEN SKAL MED I DET TAL, GÆSTEN SER — ikke først på
     bonen. Et tillæg, hun møder efter at have trykket send, er
     præcis det, emballagen blev en synlig linje for (1/9). */
  function fragten() {
    if (!R.levering) return { antal: 0, pris: 0, ialt: 0 };
    return R.levering(data, hvordan());
  }

  function emballagen() {
    if (!R.emballage) return { antal: 0, pris: 0, ialt: 0 };
    var linjer = Object.keys(kurv).map(function (k) {
      return { kat: kurv[k].kat, antal: kurv[k].antal };
    });
    return R.emballage(data, linjer, hvordan());
  }

  // ----------------------------------------------------------
  //  RÆKKERNE
  //  ----------------------------------------------------------
  //  Designet har to slags rækker, og begge bliver brugt, som de
  //  er tegnet: én med tæller og én med "+ tilføj". På forsiden er
  //  udvalget hele kortet, og så folder "+ tilføj" kategorien ud —
  //  ellers ville listen være hundrede rækker lang. På
  //  smørrebrødssiden er der kun smørrebrød, og så står stykkerne
  //  direkte med tæller, som designet tegnede dem.
  // ----------------------------------------------------------
  function tællerFor(nøgle, navn, pris, variant, kat) {
    var boks = lav('div', 'step');
    boks.setAttribute('data-step', '');
    var ned = lav('button', null, '–');
    ned.setAttribute('data-d', '-');
    ned.type = 'button';
    var tal = lav('b', null, String((kurv[nøgle] || {}).antal || 0));
    var op = lav('button', null, '+');
    op.setAttribute('data-d', '+');
    op.type = 'button';

    /* ⚠️ FARVERNE VAR FOR ENS (30/8). Kundens ord: "farverne er
       for ens ift når man bestiller med +'et". MÅLT: knappen var
       --cream2 i en pille på hvid, oven på en --cream2 række —
       tre nuancer af den samme creme, og på en telefon i sollys
       kunne man ikke se, hvad der var en knap.

       Minus er SLUKKET ved nul. Det er både rigtigt (man kan ikke
       tælle under nul) og en oplysning: knappen siger selv, at
       der ikke er valgt noget endnu. */
    function tegnTal(ny) {
      tal.textContent = String(ny);
      ned.disabled = ny < 1;
      boks.classList.toggle('valgt', ny > 0);
      var raekke = boks.parentNode;
      if (raekke && raekke.classList) raekke.classList.toggle('valgt', ny > 0);
    }

    function skift(retning) {
      var nu = (kurv[nøgle] || {}).antal || 0;
      var ny = Math.max(0, nu + retning);
      if (ny === 0) delete kurv[nøgle];
      /* kat følger med, fordi mindsteantallet KUN gælder
         smørrebrødet (se R.minStkMangler). Uden den kunne
         formularen ikke se forskel på fem stykker og fem øl. */
      else kurv[nøgle] = { navn: navn, pris: pris, antal: ny, variant: variant || null, kat: kat };
      tegnTal(ny);
      visSum();
      visKategoriTal();
    }
    ned.addEventListener('click', function () { skift(-1); });
    op.addEventListener('click', function () { skift(1); });

    boks.appendChild(ned);
    boks.appendChild(tal);
    boks.appendChild(op);
    tegnTal((kurv[nøgle] || {}).antal || 0);
    return boks;
  }

  /* ============================================================
     FYLDET: 29 ØNSKER, IKKE 29 VARER  (30/8)
     ------------------------------------------------------------
     Model A siger, at hvert fyld ER en vare med sin egen pris —
     men indtil ejeren har sat priserne, står de uden, og et fyld
     uden pris kan ØNSKES, ikke købes (se README: "En vare uden
     pris kan ses, men ikke bestilles"). Butik.udvalg deler dem
     derfor i to: de prissatte står som almindelige varer i
     listen ovenfor, og oenskefyld er dem, gæsten sætter et hak
     ved.

     ⚠️ DE LÆGGES IKKE TIL SUMMEN. Et ønske uden pris, der talte
     med, ville give gæsten et beløb, hun ikke skal betale — og
     køkkenet et stykke, ingen har bestilt.

     ⚠️ OG DE ER IKKE LINJER. De sendes i kolonnen fyld, som
     bestil/ har brugt siden 20/8, så admin viser dem som ønsker
     og ikke som mad, der skal laves.

     Formen er designets egen .chipset — den samme pillevælger som
     tidsrummet på baglokalet. Vi opfinder ikke en ny. */
  function tegnFyld() {
    if (!side.fyld) return;
    var boks = find('#fyldvalg');
    if (!boks) return;

    var liste = (udvalgNu() || {}).oenskefyld || [];
    var afsnit = find('#fyldfelt');

    /* Et afsnit uden noget at vise findes ikke — samme regel som
       resten af huset. Har ejeren ikke oprettet fyld, eller har
       han sat pris på dem alle, er der ikke noget at vælge. */
    if (!liste.length) {
      if (afsnit) afsnit.hidden = true;
      valgtFyld = [];
      return;
    }
    if (afsnit) afsnit.hidden = false;

    /* ⚠️ TEGN KUN OM, NÅR LISTEN HAR ÆNDRET SIG. Ellers ville et
       tryk på en pille tegne hele gruppen om under fingeren, og
       det valgte ville hoppe. */
    var aftryk = liste.map(function (v) { return v.navn; }).join('|');
    if (boks.getAttribute('data-aftryk') === aftryk) return;
    boks.setAttribute('data-aftryk', aftryk);

    tøm(boks);
    liste.forEach(function (v) {
      var knap = lav('button', valgtFyld.indexOf(v.navn) !== -1 ? 'on' : null, v.navn);
      knap.type = 'button';
      knap.setAttribute('data-fyld', v.navn);
      /* ⚠️ DESIGNET EJER MARKERINGEN, VI LÆSER DEN (30/8).
         havnegrillen.js binder sin egen lytter på hver [data-chips]
         ved indlæsningen, og for "multi" gør den
         b.classList.toggle('on'). Første udgave her togglede
         OGSÅ — og de to ophævede hinanden: MÅLT på en iPhone 13
         stod tælleren på "2 slags valgt", mens begge piller så
         uvalgte ud.

         Det er nøjagtig samme fælde som segmenterne (se segSvar i
         js/skal/forespoergsel.js): aflæs det, designet faktisk
         styrer, i stedet for at styre det selv. setTimeout, fordi
         designets lytter er bundet FØR vores og skal nå at køre. */
      knap.addEventListener('click', function () {
        setTimeout(function () {
          var valgt = knap.classList.contains('on');
          var i = valgtFyld.indexOf(v.navn);
          if (valgt && i === -1) valgtFyld.push(v.navn);
          if (!valgt && i !== -1) valgtFyld.splice(i, 1);
          visFyldTal();
        }, 0);
      });
      boks.appendChild(knap);
    });
    visFyldTal();
  }

  /* ============================================================
     FØRST BRØDET, SÅ FYLDET  (30/8)
     ------------------------------------------------------------
     Kundens spørgsmål, da ejerens trykte kort kom: "smørbrød
     bestillingen — skal de først vælge basen altså brødet og
     derefter fyld eller hvordan?" Ja. Kortene har ét, der hedder
     SMØRREBRØD, og ét, der hedder HÅNDMADDER, og de lister det
     SAMME fyld til hver sin pris.

     ⚠️ INTET ER VALGT FRA START, og det er med vilje. Vælger
     siden den ene for gæsten, bestiller den, der ikke læser
     etiketten, en hel skive til 55, når hun troede, hun bad om
     en håndmad til 27 — og det opdages ved lugen. Fyldlisten
     findes derfor ikke, før hun har svaret.

     ⚠️ OG DESIGNET EJER MARKERINGEN — VI LÆSER DEN.
     havnegrillen.js binder sin egen lytter på hver [data-chips]
     og flytter .on for enkeltvalg. Toggler vi OGSÅ, ophæver de
     to hinanden: MÅLT på fyldpillerne 30/8 stod tælleren på
     "2 slags valgt", mens begge piller så uvalgte ud. Samme
     fælde som segmentknapperne. */
  function tegnStoerrelser() {
    if (!side.stoerrelser) return;
    var boks = find('#stoerrelsevalg', panel);
    var afsnit = find('#stoerrelsefelt', panel);
    if (!boks) return;

    var liste = (udvalgNu() || {}).stoerrelser || [];

    /* Et afsnit uden noget at vise findes ikke. Er der ingen
       størrelser, kører udvalget som før (se Butik.udvalg), og
       spørgsmålet ville være et valg uden svarmuligheder. */
    if (liste.length < 1) {
      if (afsnit) afsnit.hidden = true;
      valgtStoerrelse = null;
      return;
    }
    if (afsnit) afsnit.hidden = false;

    /* Tegn kun om, når listen har ændret sig — ellers hopper det
       valgte under fingeren. Prisen er med i aftrykket: retter
       ejeren 55 til 58, skal pillen sige det. */
    var aftryk = liste.map(function (v) { return v.navn + ':' + v.pris; }).join('|');
    if (boks.getAttribute('data-aftryk') === aftryk) return;
    boks.setAttribute('data-aftryk', aftryk);

    tøm(boks);
    liste.forEach(function (v) {
      var valgt = !!(valgtStoerrelse && valgtStoerrelse.navn === v.navn);
      var knap = lav('button', valgt ? 'on' : null, v.navn + ' · ' + kroner(v.pris));
      knap.type = 'button';
      knap.setAttribute('data-stoerrelse', v.navn);
      knap.addEventListener('click', function () {
        setTimeout(function () {
          valgtStoerrelse = knap.classList.contains('on') ? v : null;
          /* "Så kommer fyldet frem" er et løfte, siden skal holde:
             skulle gæsten trykke på pillen OG derefter på
             "+ tilføj", ville hun stå med en liste, der ser
             uændret ud efter det første tryk. */
          if (valgtStoerrelse) aabne['varianter|' + valgtStoerrelse.navn] = true;
          visVarer();
          visStoerrelseTal();
        }, 0);
      });
      boks.appendChild(knap);
    });
    visStoerrelseTal();
  }

  function visStoerrelseTal() {
    var t = find('#stoerrelsetal', panel);
    if (!t) return;
    t.textContent = valgtStoerrelse
      ? 'Vælg nu fyldet — hvert stykke koster ' + kroner(valgtStoerrelse.pris) + '.'
      : 'Vælg først, hvad brødet skal være. Så kommer fyldet frem.';
  }

  /* Varianterne er ikke varer i menukortet med hver sin pris —
     de er det samme stykke med noget andet på. Derfor får de
     størrelsens pris her, og linjen sendes med størrelsens navn
     og fyldet som variant (se vareRække og Butik.bestil). */
  function varianterne(stoerrelse) {
    if (!stoerrelse) return [];
    return ((udvalgNu() || {}).varianter || [])
      .map(function (v) {
        return {
          kategori_id: v.kategori_id,
          navn: v.navn,
          pris: stoerrelse.pris,
          variantAf: stoerrelse.navn,
        };
      });
  }

  /* ⚠️ EN STØRRELSE, GÆSTEN HAR TALT OP I, MÅ IKKE FORSVINDE FRA
     SKÆRMEN, NÅR HUN SKIFTER TIL DEN ANDEN.

     Første udgave viste kun den valgte størrelses fyld. Vælger man
     to smørrebrød med leverpostej og skifter derefter til
     Håndmad, stod de to stadig i kurven og i summen — men rækken
     var væk, så de kunne hverken ses eller tælles ned. Gæsten
     ville betale for mad, hun ikke kunne finde på sin egen skærm.

     Listen her er derfor: den valgte størrelse PLUS enhver
     størrelse, der allerede er noget i kurven fra. */
  function brugteStoerrelser() {
    var alleSt = (udvalgNu() || {}).stoerrelser || [];
    var navne = {};
    Object.keys(kurv).forEach(function (k) {
      if (k.indexOf('v|') === 0 && kurv[k].antal > 0) navne[kurv[k].navn] = true;
    });
    if (valgtStoerrelse) navne[valgtStoerrelse.navn] = true;
    // Rækkefølgen er menukortets, ikke den rækkefølge de blev valgt i.
    return alleSt.filter(function (v) { return navne[v.navn]; });
  }

  function visFyldTal() {
    var t = find('#fyldtal');
    if (!t) return;
    t.textContent = valgtFyld.length
      ? valgtFyld.length + (valgtFyld.length === 1 ? ' slags valgt' : ' slags valgt')
      : 'Vælg det fyld, I gerne vil have';
  }

  /* Kategorirækken til en vare — tegnet falder tilbage på
     kategoriens ansigt, og det kender både ejerens `emoji`-felt
     og afdelingen. */
  function katFor(v) {
    if (!v || v.kategori_id === undefined) return null;
    return (data.menu_kategorier || []).filter(function (k) {
      return k.id === v.kategori_id;
    })[0] || null;
  }

  function vareRække(v, fremhævet) {
    /* ⚠️ EN VARIANT ER SIN EGEN LINJE I KURVEN, OG NØGLEN BÆRER
       STØRRELSEN MED (30/8). To smørrebrød med leverpostej og én
       håndmad med leverpostej er to forskellige ting til to
       forskellige priser; delte de nøgle, ville den ene tælle den
       anden ned. */
    var nøgle = v.variantAf
      ? 'v|' + v.variantAf + '|' + v.navn
      : (v.kategori_id === undefined ? 'dagens' : v.kategori_id) + '|' + v.navn;
    var række = lav('div', 'item' + (fremhævet ? ' hi' : ''));
    række.setAttribute('data-vare', v.navn);
    if (v.variantAf) række.setAttribute('data-variant-af', v.variantAf);

    /* ⚠️ BILLEDET, NÅR EJEREN HAR LAGT ET OP (31/8). Ingen
       pladsholder: har varen intet foto, ser rækken ud som i dag.
       Samme regel som js/bestilling.js og billedplads.js — en tom
       grå kasse er værre end ingen plads. */
    if (v.billede) {
      var foto = document.createElement('img');
      foto.className = 'item-foto';
      foto.src = v.billede;
      foto.loading = 'lazy';
      foto.decoding = 'async';
      foto.alt = v.navn;
      række.appendChild(foto);
    }

    /* ⚠️ ET ANSIGT PR. RET OGSÅ HER (1/9). Samme regel som
       kategorirækken fik 29/8, og tegnet kommer fra den samme
       ene liste — en kopi ville betyde, at den samme burger fik
       to ansigter på forsiden og på bestil/.

       ⚠️ SIT EGET ELEMENT OG IKKE INDE I <h4>. Overskriftens
       tekst ville ellers hedde "🍔Havnens burger", og både
       prøverne, kurven og en skærmlæser læser netop den tekst.
       Ikke på en række med foto: to ansigter er rod. */
    if (!v.billede && window.MosedeEmoji && window.MosedeEmoji.forVare) {
      var tegn = lav('span', 'item-tegn',
        window.MosedeEmoji.forVare(v, katFor(v)));
      tegn.setAttribute('aria-hidden', 'true');
      række.appendChild(tegn);
    }

    var venstre = lav('div');
    venstre.appendChild(lav('h4', null, v.navn));
    /* Mærkatet er designets .tag. Uden pris står der "pris følger"
       og ikke et nul: 79 af forretningens varer har ikke fået en
       pris endnu, og et 0 ville stå som gratis. */
    var mærkat = (fremhævet ? 'Dagens ret' : '')
      + (fremhævet && kroner(v.pris) ? ' · ' : '')
      + (kroner(v.pris) || (fremhævet ? '' : 'pris følger'));
    if (mærkat) venstre.appendChild(lav('span', 'tag', mærkat));

    /* ⚠️ BESKRIVELSEN STÅR, HVOR MADEN BESTILLES  (31/8).

       Kundens ord: *"så skal vi have lavet en beskrivelse til,
       når folk bestiller dagens ret, som de kan styre og
       administrere."*

       Feltet fandtes hele vejen — `dagens_retter.beskrivelse`,
       et felt i admin → Dagens ret, og teksten står på forsidens
       dagens ret-afsnit og på menukortet. Det ENESTE sted, den
       ikke stod, var i den liste, gæsten faktisk bestiller i: her
       stod navn og pris og ikke andet. Altså læste hun "Stegt
       flæsk · 95,-" og skulle rulle op igen for at finde ud af,
       hvad der var i den.

       ⚠️ OG DEN GÆLDER ALLE VARER, ikke kun dagens ret.
       js/bestilling.js (bestil/ og ved-bordet/) har vist
       beskrivelsen på hver række siden foråret; en regel, der kun
       gjaldt den fremhævede, ville betyde, at de samme varer
       står med tekst på den ene side og uden på den anden — og
       det er præcis den slags skred, huset er fuldt af ar efter.
       Ejeren skriver kun en beskrivelse, hvor den hjælper. */
    if (v.beskrivelse) venstre.appendChild(lav('p', 'vare-desc', v.beskrivelse));

    række.appendChild(venstre);
    /* ⚠️ LINJENS NAVN ER STØRRELSEN, IKKE FYLDET. Databasens
       pris- og udsolgt-værn slår begge op på navnet i menukortet;
       "Leverpostej med baconsvøb" står der uden en pris, og så
       ville pris-værnet afvise hele bestillingen. Se noten i
       Butik.bestil. */
    række.appendChild(v.variantAf
      ? tællerFor(nøgle, v.variantAf, v.pris, v.navn, v.kategori_id)
      : tællerFor(nøgle, v.navn, v.pris, null, v.kategori_id));
    return række;
  }

  /* En vare, ejeren ikke har prissat endnu. Den kan SES og der
     kan ringes om den — den kan ikke lægges i kurven. Reglen er
     husets fra 26/8, og formen er designets egen .item, så
     rækken står i listen som alt andet. */
  function spoergRække(v) {
    var række = lav('div', 'item spoerg-pris');
    række.setAttribute('data-vare', v.navn);

    if (v.billede) {
      var foto = document.createElement('img');
      foto.className = 'item-foto';
      foto.src = v.billede;
      foto.loading = 'lazy';
      foto.decoding = 'async';
      foto.alt = v.navn;
      række.appendChild(foto);
    }

    /* ⚠️ ET ANSIGT HER OGSÅ  (2/9). Rækken fik ingen, da tegnene
       kom 1/9 — og på et skud stod "Morgenbrød" nøgen mellem to
       naboer med hver sit tegn, som om den var noget andet end
       mad. js/bestilling.js har haft det på alle tre rækketyper
       hele tiden; det var forsiden, der manglede. */
    if (!v.billede && window.MosedeEmoji && window.MosedeEmoji.forVare) {
      var tegn = lav('span', 'item-tegn',
        window.MosedeEmoji.forVare(v, katFor(v)));
      tegn.setAttribute('aria-hidden', 'true');
      række.appendChild(tegn);
    }

    var venstre = lav('div');
    venstre.appendChild(lav('h4', null, v.navn));
    if (v.beskrivelse) venstre.appendChild(lav('p', 'vare-desc', v.beskrivelse));
    række.appendChild(venstre);

    /* ⚠️ ET RIGTIGT LINK, IKKE EN KNAP DER SER UD SOM ÉN. Det er
       et telefonnummer — det skal kunne trykkes, holdes nede og
       kopieres, som ethvert andet nummer på siden. */
    /* ⚠️ NUMMERET LÆSES AF SIDEN, IKKE AF js/oplysninger.js.
       Designsiderne indlæser ikke den fil — de har numrene i
       opmærkningen (footeren og heroens "ring til os"), og
       js/skal/kontakt.js retter dem, hvis ejeren skifter det i
       admin. Slog vi det op i MOSEDE her, ville chippen stå med
       "tel:" og ingenting bag: en knap, der ringer ingen steder
       hen. MÅLT af prøven, ikke gættet. */
    var telLink = document.querySelector('a[href^="tel:"]');
    var nummer = telLink ? telLink.getAttribute('href')
      : (window.MOSEDE ? 'tel:' + window.MOSEDE.telefon : '');
    var ring = lav('a', 'spoerg-chip', 'Ring og hør prisen');
    if (nummer) ring.href = nummer;
    ring.setAttribute('aria-label', 'Ring og hør prisen på ' + v.navn);
    række.appendChild(ring);
    return række;
  }

  /* Det, køkkenet er løbet tør for. Rækken står — den kan bare
     ikke bestilles, og den ser anderledes ud end en vare uden
     pris. Se noten ved udsolgteVarer(). */
  function udsolgtRække(v) {
    var række = lav('div', 'item udsolgt');
    række.setAttribute('data-vare', v.navn);

    if (!v.billede && window.MosedeEmoji && window.MosedeEmoji.forVare) {
      var tegn = lav('span', 'item-tegn',
        window.MosedeEmoji.forVare(v, katFor(v)));
      tegn.setAttribute('aria-hidden', 'true');
      række.appendChild(tegn);
    }

    var venstre = lav('div');
    venstre.appendChild(lav('h4', null, v.navn));
    række.appendChild(venstre);
    /* Samme ord som bestil/ og ved-bordet/ (js/bestilling.js).
       To sider, der siger "Udsolgt i dag" og "Udsolgt", er to
       udgaver af den samme oplysning. */
    række.appendChild(lav('span', 'udsolgt-chip', 'Udsolgt i dag'));
    return række;
  }

  function kategoriRække(g, liste) {
    var række = lav('div', 'item');
    række.setAttribute('data-kategori', g.navn);

    /* ⚠️ ET ANSIGT PR. KATEGORI (29/8). Kundens ord om forsiden:
       "mangler også emojis … får kunderne det kedeligt hele vejen
       ned". MÅLT: fem rækker ren tekst — Grill fra pladen,
       Smørrebrød, Is og desserter, Drikkevarer, Tilbehør — hvor
       menukortet og bordsiden for længst havde tegn på de samme
       kategorier. Den, der læser kortet og derefter bestiller,
       mødte to forskellige lister over det samme sortiment.

       Tegnet kommer fra MosedeEmoji — den ENE liste, som
       menukortet og ved-bordet også spørger. En kopi her ville
       skride: ejeren opretter "Vegansk", ét sted får den et tegn,
       og så har de tre sider hver sit ansigt på den samme
       kategori, uden at det kan ses i koden.

       Findes filen ikke på siden, står navnet alene som før —
       h-smorrebrod.html lister stykkerne direkte og har slet
       ingen kategorirækker. */
    /* ⚠️ TEGNET ER SIT EGET ELEMENT VED SIDEN AF <h4>, ikke inde
       i den. Lagde vi det ind i overskriften, ville dens tekst
       hedde "🍔Grill fra pladen", og både prøverne og en
       skærmlæser læser den tekst. Samme greb som kortTegn() i
       js/bestilling.js. */
    if (window.MosedeEmoji) {
      var tegn = lav('span',
        'kat-tegn kat-tegn-' + window.MosedeEmoji.afdelingFor(g),
        window.MosedeEmoji.forKategori(g));
      tegn.setAttribute('aria-hidden', 'true');
      række.appendChild(tegn);
    }
    række.appendChild(lav('h4', null, g.navn));

    /* ⚠️ "N VALGT" PÅ KATEGORIEN (30/8). Kundens forlæg viser det,
       og grunden er god: med syv foldede kategorier kan gæsten
       ikke se, HVOR hun har lagt noget — hun ville skulle folde
       dem ud én ad gangen for at finde de to pommes frites igen.
       Tallet står, uanset om folden er åben eller lukket: det er
       en oplysning om indholdet, ikke om folden. */
    var knap = lav('span', 'add', aabne[g.id] ? '– luk' : '+ tilføj');
    knap.setAttribute('data-add', '');
    række.appendChild(knap);
    var maerke = lav('span', 'kat-valgt');
    maerke.setAttribute('data-kat-valgt', String(g.id));
    række.appendChild(maerke);
    række.addEventListener('click', function () {
      aabne[g.id] = !aabne[g.id];
      visVarer();
      tegnFyld();
      tegnStoerrelser();
    });

    liste.appendChild(række);
    if (aabne[g.id]) {
      g.varer.forEach(function (v) {
        if (v && v.slags === 'spoerg') liste.appendChild(spoergRække(v.vare));
        else if (v && v.slags === 'udsolgt') liste.appendChild(udsolgtRække(v.vare));
        else liste.appendChild(vareRække(v, false));
      });
    }
  }

  /* Tallet regnes af KURVEN og ikke af rækkerne: en foldet
     kategoris rækker findes ikke i DOM'en, og et tal, der kun
     kunne tælle det synlige, ville sige 0 præcis når det betød
     noget. */
  function visKategoriTal() {
    alle('[data-kat-valgt]', panel).forEach(function (m) {
      var id = m.getAttribute('data-kat-valgt');
      /* Varianternes fold hedder "varianter|<størrelse>", og
         deres kurvnøgler begynder med "v|<størrelse>|". De andre
         folde er kategori-id'er, og der er kurvens kat svaret. */
      var præfiks = id.indexOf('varianter|') === 0
        ? 'v|' + id.slice('varianter|'.length) + '|' : null;
      var n = 0;
      Object.keys(kurv).forEach(function (k) {
        var hører = præfiks ? k.indexOf(præfiks) === 0 : String(kurv[k].kat) === id;
        if (hører) n += kurv[k].antal;
      });
      m.textContent = n ? n + ' valgt' : '';
      m.classList.toggle('skjul', !n);
      var add = m.parentNode && m.parentNode.querySelector('[data-add]');
      if (add) add.classList.toggle('skjul', !!n);
    });
  }

  /* Det, der ikke længere kan bestilles, ryger ud af kurven — og
     sumlinjen siger det ved næste optegning. En vare, der bliver
     liggende usynligt, er mad, gæsten betaler for og ikke får. */
  function ryddedeKurven() {
    var u = udvalgNu();
    var lovlige = {};
    (u.varer || []).forEach(function (v) { lovlige[v.kategori_id + '|' + v.navn] = true; });
    (u.varianter || []).forEach(function (v) { lovlige['variant|' + v.navn] = true; });
    var ret = dagensRet();
    if (ret) lovlige['dagens|' + ret.navn] = true;

    Object.keys(kurv).forEach(function (k) {
      var ok = k.indexOf('v|') === 0
        ? lovlige['variant|' + k.slice(k.lastIndexOf('|') + 1)]
        : lovlige[k];
      if (!ok) delete kurv[k];
    });
  }

  /* ⚠️ EN LUKKET KATEGORI SKAL SIGE HVORFOR. En kategori, der
     bare forsvinder, ligner en fejl på siden — og gæsten leder
     efter morgenmaden i stedet for at vælge et andet tidspunkt. */
  /* ⚠️ GUL OG RØD, NÅR DER ER TRAVLT MED AT NÅ DET  (30/8).
     Kundens ord: "hvis de er tæt på, blinker en gul eller rød."

     Det, der er tæt på, er SIDSTE BESTILLING — køkkenet lukker
     20.00, og sidste ordre er 19.30. En gæst, der står med
     kurven kl. 19.15, skal vide det, før hun skriver sit navn.

     ⚠️ DEN TÆLLER MOD URET, IKKE MOD DET VALGTE TIDSPUNKT. Hun
     kan sagtens vælge kl. 19.30 kl. 12 om formiddagen; det er
     først et problem, når klokken nærmer sig. */
  function visSidsteKald() {
    var boks = find('#sidste-kald', panel);
    if (!boks) return;
    boks.hidden = true;
    boks.className = 'hint';

    /* ⚠️ DEN MÅLER MOD I DAG, IKKE MOD DEN VALGTE DAG. Kl. 19.10
       er i dag faldet UD af dagvælgeren — der er ikke tid til en
       bestilling mere — og så stod gæsten med en dag, der var
       hoppet til i morgen uden en forklaring. Det er netop dét
       øjeblik, linjen er til for. */
    var iDag = Butik.nu().dato;
    var sidste = R.sidsteTid ? R.sidsteTid(data, iDag, hvordan()) : null;
    if (sidste === null || sidste === undefined) return;

    /* ⚠️ KAN DER SLET IKKE BESTILLES TIL I DAG, HAR LINJEN
       INGENTING AT SIGE  (4/9). Kundens spørgsmål med et skud af
       linjen: *"de kan jo også bestille til andre dage og man kan
       da ikke bestille smørbrød på dagen?"*

       Han har ret, og MÅLT er det værre end det ser ud:
       `bestilling_varsel_timer` står på **24** i produktionen, så
       i dag er slet ikke en mulig dag NOGEN steder — dagvælgeren
       på h-smorrebrod.html tilbød fjorten dage fredag kl. 19.45,
       og den FØRSTE var i morgen. Linjen talte alligevel ned:
       *"sidste bestilling i dag er kl. 20.30 · 45 min. tilbage"*.
       En hastende frist for noget, gæsten ikke kan bestille — og
       bagefter *"I kan bestille til i morgen"*, som oven i købet
       er for snævert: hun kan vælge alle fjorten dage.

       Grunden er, at `sidsteTid` kun ved, hvornår KØKKENET lukker
       for ordrer. Den ved intet om varslet.

       ⚠️ MEN LINJEN SKAL BLIVE, HVOR DEN GØR NYTTE. Den blev
       bygget til det øjeblik, hvor i dag FALDER UD af vælgeren,
       fordi klokken løb — se noten ovenfor. Forskellen på de to
       er, om i dag nogensinde kunne nås: varslet ALENE måles mod
       dagens sidste ordre. 24 timer (1440 min) er mere end en dag,
       der lukker 20.30 (1230 min), så i dag har aldrig været med;
       grillens halve time er mindre, så den dag ejeren sætter
       varslet ned, kommer linjen igen af sig selv.

       ⚠️ OG DET ER `mindsteVarsel`, IKKE `varselTimer`. Første
       udgave brugte den sidste — og den er FORKERT her: den er
       kanalens døgn, ikke det, dagvælgeren gatede på. Reglens
       egen note siger det ordret: *"bestilling_varsel_timer er et
       DØGN, og den gatede hele formularen ... Vælgeren tilbyder
       nu det, NOGET kan bestilles til."* Med `varselTimer` ville
       linjen forsvinde fra FORSIDEN også, hvor den gør nytte —
       fanget af prøven "tæt på sidste bestilling bliver linjen gul
       og så rød", som faldt med det samme.

       `mindsteVarsel(data, katIds, hvordan)` er det MINDSTE varsel
       blandt de kategorier, siden faktisk sælger — grillens halve
       time på forsiden, smørrebrødets døgn på h-smorrebrod.html.
       Det er den samme funktion, `tiderFor` gater dagene med, så
       de to kan ikke komme til at sige hver sit. */
    var u = Butik.udvalg(data, side.udvalg, iDag, '', hvordan()) || {};
    if (R.mindsteVarsel(data, u.katIds, hvordan()) >= sidste) return;

    var igen = sidste - Butik.nu().minutter;
    if (igen > 90) return;

    var kl = ('0' + Math.floor(sidste / 60)).slice(-2) + '.'
      + ('0' + (sidste % 60)).slice(-2);
    boks.hidden = false;
    boks.className = 'hint sidste-kald ' + (igen <= 30 ? 'roed' : 'gul');
    boks.textContent = igen <= 0
      /* ⚠️ IKKE "til i morgen" — der er fjorten dage i vælgeren, og
         en gæst, der skal bruge smørrebrød til på lørdag, skal ikke
         læse, at i morgen er det eneste, der er tilbage. */
      ? '⏰ Sidste bestilling i dag var kl. ' + kl
        + ' — vælg en anden dag herunder.'
      : (igen <= 30 ? '⏰ Skynd jer — ' : '⏳ ')
        + 'sidste bestilling i dag er kl. ' + kl
        + ' · ' + igen + ' min. tilbage.';
  }

  function visLukkede() {
    var boks = find('#lukkede', panel);
    if (!boks) return;
    var liste = (udvalgNu().lukkede || []);
    tøm(boks);
    boks.hidden = !liste.length;
    if (!liste.length) return;
    boks.appendChild(lav('b', null, 'Ikke lige nu: '));
    liste.forEach(function (l, i) {
      boks.appendChild(lav('span', null,
        (i ? ' · ' : '') + l.navn + (l.grund ? ' (' + l.grund + ')' : '')));
    });
  }

  function visVarer() {
    var liste = panel && panel.querySelector('[data-liste]');
    if (!liste) return;
    /* KUN rækkerne ryddes — ikke hele feltet. Første udgave tømte
       .field'en og tog designets <label>"Vælg jeres retter" med
       sig; overskriften var væk, og prøven på feltrækkefølgen
       fangede det. */
    alle('.item', liste).forEach(function (r) { liste.removeChild(r); });

    var ret = dagensRet();
    if (ret) liste.appendChild(vareRække(ret, true));

    if (side.folder) {
      grupper().forEach(function (g) { kategoriRække(g, liste); });
    } else {
      /* ⚠️ FYLDET STÅR ØVERST, IKKE UNDER DE FÆRDIGE RETTER.
         Det er dét, gæsten kommer efter; rejemad, tartar og
         æbleflæsk er undtagelserne med deres egen pris.

         ⚠️ OG DET STÅR I EN FOLD, IKKE SOM 32 RÆKKER. MÅLT:
         ejeren har 32 slags fyld, og 32 .item-rækker er omkring
         1900 px — fem skærme på en telefon, før man er forbi
         listen. Folden er designets egen "+ tilføj", den samme
         som forsidens kategorier. */
      brugteStoerrelser().forEach(function (st) {
        var vari = varianterne(st);
        if (!vari.length) return;
        kategoriRække({
          id: 'varianter|' + st.navn,
          navn: st.navn + ' · vælg fyld',
          varer: vari,
        }, liste);
      });
      varerne().forEach(function (v) { liste.appendChild(vareRække(v, false)); });
      /* De prisløse EFTER de bestilbare, som i folden ovenfor og
         som på bestil/. Kun index.html bruger folde i dag, men
         den flade vej skal ikke tabe dem, hvis en side vælger
         den igen. */
      spoergVarerne().forEach(function (v) { liste.appendChild(spoergRække(v)); });
      udsolgteVarer().forEach(function (v) { liste.appendChild(udsolgtRække(v)); });
    }
    visSum();
    visKategoriTal();
    visLukkede();
    visSidsteKald();
  }

  // ----------------------------------------------------------
  //  DAGE OG TIDER
  // ----------------------------------------------------------
  function visDage() {
    var vælger = felt('dato');
    if (!vælger) return;
    var u = Butik.udvalg(data, side.udvalg, Butik.nu().dato, '', hvordan()) || {};
    var dage = R.muligeDage(data, null, hvordan(), u.katIds);
    tøm(vælger);

    dage.forEach(function (iso) {
      /* Dagens ret står i dagvælgeren, så gæsten kan se, hvad der
         er hvornår, uden at skifte frem og tilbage. Er der flere,
         står den første og et "m.fl." — hele listen ville gøre
         hver linje til to. */
      var retter = side.dagensRet ? Butik.dagensRetter(data, iso) : [];
      var navne = retter.length
        ? ' · ' + retter[0].navn + (retter.length > 1 ? ' m.fl.' : '')
        : '';
      /* ⚠️ EN FYLDT DAG BLIVER STÅENDE, den fjernes ikke. En dag,
         der MANGLER i listen, ligner en fejl, og gæsten leder
         efter den i stedet for at vælge en anden — samme regel
         som den fulde lørdag i bordstriben. */
      var fuld = R.dagFuld
        ? R.dagFuld(data, fyldteTider, iso, null, hvordan(), u.katIds) : false;
      var mulighed = lav('option', null,
        dagTekst(iso) + navne + (fuld ? ' — fyldt op' : ''));
      mulighed.value = iso;
      mulighed.disabled = fuld;
      vælger.appendChild(mulighed);
    });

    var ledigeDage = dage.filter(function (iso) {
      return !(R.dagFuld
        && R.dagFuld(data, fyldteTider, iso, null, hvordan(), u.katIds));
    });
    /* ⚠️ VALGET MÅ IKKE LANDE PÅ EN FYLDT DAG. Ellers fylder
       gæsten hele formularen ud og får først nej ved
       afsendelsen — præcis dét, tallene her findes for. Er ALLE
       dage fyldte, står den første alligevel: en tom vælger
       siger ingenting om hvorfor. */
    if (ledigeDage.indexOf(valgtDag) === -1) valgtDag = ledigeDage[0] || dage[0];
    if (valgtDag) vælger.value = valgtDag;
  }

  function visTider() {
    var vælger = felt('tid');
    if (!vælger) return;
    var før = vælger.value;
    var u2 = Butik.udvalg(data, side.udvalg, valgtDag, '', hvordan()) || {};
    var tider = R.tiderFor(data, valgtDag, null, hvordan(), u2.katIds);
    tøm(vælger);
    var ledige = [];
    tider.forEach(function (t) {
      /* ⚠️ EN FYLDT TID BLIVER STÅENDE OG SIGER HVORFOR. Samme
         regel som dagen ovenfor og som bordstribens FULDT. */
      var fuld = R.tidFuld ? R.tidFuld(data, fyldteTider, valgtDag, t) : false;
      var mulighed = lav('option', null,
        'kl. ' + t.replace(':', '.') + (fuld ? ' — fyldt op' : ''));
      mulighed.value = t;
      mulighed.disabled = fuld;
      if (!fuld) ledige.push(t);
      vælger.appendChild(mulighed);
    });
    /* ⚠️ KUN EN LEDIG TID GENVÆLGES. Målt i Chromium: en <select>
       vælger SELV den første mulighed, der ikke er slået fra — men
       kode kan tvinge en slået-fra igennem. Stod der bare
       `tider.indexOf(før)`, ville en tid, gæsten havde valgt FØR
       den blev fyldt op, blive sat tilbage af os efter en
       optegning — og så fylder hun formularen ud og får først nej
       ved afsendelsen.

       Der er med vilje ingen "ellers tag den første": browseren
       har allerede gjort det, og en linje, der ikke kan fejle,
       måler ingenting. */
    if (ledige.indexOf(før) !== -1) vælger.value = før;
  }

  /* Tiderne kan være blevet fyldt op, mens formularen stod åben.
     Hentes igen, når databasen har sagt fra — ellers vælger
     gæsten det samme fyldte klokkeslæt en gang til. */
  function friskTider() {
    if (!Butik.hentFyldteTider) return;
    Butik.hentFyldteTider().then(function (liste) {
      fyldteTider = liste || [];
      visDage();
      visTider();
    }).catch(function () { /* så står listen som den var */ });
  }

  /* Linjen under datoen. På forsiden siger den, hvad dagens ret
     er; på smørrebrødssiden siger den, hvor lang tid i forvejen
     der skal bestilles. Begge steder stod der et fast tal i
     designet — "2 dage" — og varslet sættes i admin. */
  /* Hvilken .hint? Panelet har flere. Vi tager den, der HØRER TIL
     datoen: enten inde i datofeltet (forsiden) eller lige efter
     det (smørrebrødssiden). Første udgave tog bare den første i
     panelet og skrev varslet hen over manchetten under
     overskriften — den så rigtig ud, og datolinjen stod stadig
     med designets faste "inden for 2 dage". */
  function datoHint() {
    var d = felt('dato');
    var boks = d && d.closest ? d.closest('.field') : null;
    if (!boks) return null;
    var inde = find('.hint', boks);
    if (inde) return inde;
    var efter = boks.nextElementSibling;
    return efter && efter.classList.contains('hint') ? efter : null;
  }

  /* ⚠️ VARSLET SKRIVES AF REGLEN, IKKE AF DESIGNET  (30/8).

     MÅLT på den udgivne side: heroens manchet og faktakortet
     sagde begge "Bestil senest 2 dage før", mens formularen holdt
     ejerens eget tal fra admin (24 timer som standard) — så
     gæsten læste to dage, valgte i morgen, og fik lov. To udgaver
     af den samme regel, og den, gæsten møder først, er den, der
     ikke gælder. Nøjagtig samme fejl som cateringens faktakort
     30/8, og rettelsen er den samme: [data-varsel] fyldes af
     reglen, og designets egen tekst er reserven.

     ⚠️ ORDET SKAL VÆRE DAGE, NÅR DER ER DAGE. "Bestil senest 24
     timer før" er sandt og ubrugeligt — man planlægger en
     fødselsdag i dage. */
  function skrivVarselTekst() {
    var el = alle('[data-varsel]', document);
    if (!el.length) return;
    var timer = R.varselTimer(data);
    if (!timer || timer <= 0) return;   // designets tekst bliver stående
    var dage = Math.floor(timer / 24);
    var ord = dage >= 2 ? 'senest ' + dage + ' dage før'
      : dage === 1 ? 'senest dagen før'
        : 'senest ' + timer + (timer === 1 ? ' time' : ' timer') + ' før';
    el.forEach(function (e) { e.textContent = ord; });
  }

  /* ⚠️ MINDSTEANTALLET SKAL STÅ, FØR HUN FYLDER KURVEN  (4/9).

     Kundens ord: *"man skal minimum bestille 4 smørrebrød, så det
     skal stå som default og ikke må kunne gå under."* Reglen
     (R.minStkMangler) har holdt siden 30/8 — men den svarede
     først på Send-knappen, altså efter at gæsten havde valgt dag,
     tid, navn og nummer. Et krav, man møder som et afslag, er et
     krav, der er skrevet det forkerte sted.

     ⚠️ TALLET ER REGLENS, IKKE DESIGNETS. Ejeren kan rette det i
     admin, og en fast "4" i HTML'en ville sige ét, mens
     afsendelsen holdt et andet — varslets ar fra 30/8, en gang
     mere. Designets tekst er reserven.

     ⚠️ OG LINJEN SIGER, HVOR LANGT DER ER. Har hun to, står der,
     at der mangler to — ikke bare at der skal være fire. */
  function visMinStk() {
    var el = find('#min-stk', panel);
    if (!el || !R.minStk) return;
    var min = R.minStk(data);
    if (min <= 1) { el.hidden = true; return; }
    el.hidden = false;
    var har = smoerIKurv();
    var mangler = R.minStkMangler(data, har);
    el.classList.toggle('min-mangler', !!mangler);
    el.textContent = mangler
      ? 'I mangler ' + (min - har) + ' — vi laver mindst ' + min
        + ' stykker ad gangen.'
      : 'Vi laver mindst ' + min + ' stykker ad gangen.';
  }

  function visHint() {
    skrivVarselTekst();
    visMinStk();
    var linje = datoHint();
    if (!linje) return;

    if (side.varselHint) {
      var timer = R.varselTimer(data);
      var dage = Math.floor(timer / 24);
      linje.textContent = timer <= 0
        ? 'Bestil gerne i god tid — ring hvis det haster.'
        : 'Bestilles mindst ' + (dage >= 1
          ? dage + (dage === 1 ? ' dag' : ' dage')
          : timer + (timer === 1 ? ' time' : ' timer'))
          + ' i forvejen — ring hvis det haster.';
      return;
    }

    if (!side.dagensHint) return;
    var ret = dagensRet();
    if (!ret) return void (linje.style.display = 'none');
    linje.style.display = '';
    linje.textContent = 'Dagens ret: ' + ret.navn
      + (kroner(ret.pris) ? ' · ' + kroner(ret.pris) : '');
  }

  // ----------------------------------------------------------
  //  SPIS HER / LEVERING
  //  ----------------------------------------------------------
  //  Begge er flueben i admin, og begge er slået FRA som standard.
  //  Er de ikke slået til, er spørgsmålet ikke et spørgsmål:
  //  feltet forsvinder i stedet for at tilbyde noget, forretningen
  //  ikke har sagt ja til. Levering er den vigtigste af de to — vi
  //  ved hverken hvad de kører ud med, hvor langt eller hvad det
  //  koster, og en side, der tilbyder levering, fordi ingen har
  //  sagt nej, lover noget på forretningens vegne.
  // ----------------------------------------------------------
  function segÅben() {
    return (data.indstillinger || {})[side.segKraever] === true;
  }

  /* ---- HVOR LEVERER DE? ----

     Mikkel oplyste området 27/8: Karslunde, Greve, Tune, Solrød
     og omegn. Det står som en INDSTILLING og ikke i koden —
     hver ny by ville ellers være en udgivelse hos os. Samme
     princip som fluebenet: beslutningen er ejerens.

     Det samme gælder PRISEN (leverings_pris). Designets
     "150 kr. inden for 10 km af havnen" var et opdigtet tal og er
     væk fra siden — et beløb, vi finder på, er værre end ingen
     pris, for gæsten regner med det. Nu skriver ejeren den selv.

     ⚠️ TOM ER IKKE NUL. Et tomt felt betyder "vi har ikke sat en
     pris", og så siger siden, at I ringer og aftaler den. Skrev
     vi "0 kr." i stedet, ville gæsten regne med gratis levering.

     Begge felter tomme = siden er tilbage ved det, der ikke lover
     noget som helst. */
  /* ⚠️ SÆTNINGEN BOR I Butik.leveringsTekst (31/8). Den skrives
     også af smørrebrødets forespørgselsside, og to kopier ville
     langsomt sige hver sit om det samme område. */
  function visLeveringsOmraade() {
    if (!side.segKraever) return;
    var t = Butik.leveringsTekst(data.indstillinger, segÅben());
    var fakta = document.getElementById('lev-fakta');
    var hint = document.getElementById('lev-hint');

    if (fakta) {
      fakta.textContent = '';
      fakta.appendChild(lav('b', null, t.faktaFed));
      fakta.appendChild(document.createTextNode(t.faktaResten));
    }
    if (hint) hint.textContent = t.hint;
  }

  /* ⚠️ NUMMERET LÆSES AF SIDEN, IKKE AF window.MOSEDE.
     js/oplysninger.js indlæses IKKE af h-smorrebrod.html — det
     var præcis dét, der fik tapassidens pegVidere til at gøre
     ingenting 3/9. Sidens eget tel:-link er kontaktvejen, og
     js/skal/kontakt.js har allerede byttet det, hvis ejeren har
     skrevet et andet nummer i admin. */
  function nummeret() {
    var a = document.querySelector('a[href^="tel:"]');
    var t = a ? String(a.textContent || '').trim() : '';
    return t || '28 87 13 43';
  }

  /* ---- SVARER ADRESSEN "JA, VI KØRER DERUD"? ----

     Kundens ord 4/9: siden "skal tjekke at det er en rigtig
     addresse it omegnen de levere i".

     ⚠️ DET ER ET SVAR, IKKE ET VÆRN — og det er med vilje.
     R.leveringSvar giver tre udfald, fordi ejeren selv skrev
     "og længere ude efter aftale": et postnummer uden for
     listen er et SPØRGSMÅL, ikke et nej. Et hårdt afslag her
     ville sende en kunde væk, forretningen gerne ville have
     haft — samme afvejning som mindstebeløbet på 200 kr. fik
     1/9. Afsendelsen kræver stadig kun, at der STÅR en adresse.

     ⚠️ OG OMRÅDET ER EJERENS EGET FELT. Reglen bor i
     bestil-regler.js, som forsiden og bestil/ også spørger —
     to kopier af "kører vi derud?" ville betyde, at gæsten fik
     ja på den ene side og spørgsmål på den anden. */
  /* ⚠️ ETIKETTEN SKAL FØLGE VALGET (4/9). MÅLT på et skud: gæsten
     havde trykket "Leveres" og skrevet sin adresse, og feltet
     lige nedenunder spurgte stadig "Hvornår henter I?". Et
     spørgsmål, der modsiger det, hun lige har valgt, læses som en
     side, der ikke har opfattet trykket — og så trykker hun igen.

     Reserven er designets egen tekst; findes etiketten ikke,
     sker der ingenting. */
  function visTidLabel() {
    var el = find('#stid-label', panel);
    if (!el) return;
    el.textContent = hvordan() === 'levering'
      ? 'Hvornår skal det leveres?'
      : 'Hvornår henter I?';
  }

  function visLeveringsSvar() {
    var linje = find('#lev-svar', panel);
    if (!linje) return;
    var adr = værdi('adresse');
    if (hvordan() !== 'levering' || !adr.trim()) {
      linje.textContent = '';
      linje.classList.remove('lev-ja', 'lev-spoerg');
      return;
    }
    /* ⚠️ HELE `data`, IKKE `data.indstillinger`. Reglen slår selv
       ned i indstillingerne, så et niveau for meget giver
       `undefined` — og så falder den tilbage på husets standard
       postnumre i stedet for EJERENS liste. Fejlen er tavs:
       Greve står i begge lister, så siden svarede rigtigt på det,
       jeg selv prøvede. Fanget af den prøve, der sætter ejerens
       liste til noget ANDET end standarden — husets regel om, at
       ét af tallene skal komme udefra. */
    var svar = R.leveringSvar(data, adr);
    linje.classList.toggle('lev-ja', svar === 'ja');
    linje.classList.toggle('lev-spoerg', svar === 'spoerg');
    linje.textContent =
      svar === 'ja'
        ? '\u2713 Vi k\u00f8rer derud.'
        : svar === 'spoerg'
          ? 'Vi k\u00f8rer ikke fast derud. Ring til os, s\u00e5 aftaler vi det '
            + '\u2014 eller v\u00e6lg "Vi henter".'
          : 'Skriv postnummeret med, s\u00e5 kan vi sige med det samme, om vi k\u00f8rer derud.';
  }

  function hvordan() {
    if (!segÅben()) {
      // Det svar, der ikke lover noget: hentes ved lugen.
      return 'afhentning';
    }
    var på = find(side.seg + ' button.on', panel);
    var knapper = alle(side.seg + ' button', panel);
    var i = på ? knapper.indexOf(på) : 0;
    return side.segSvar[i] || 'afhentning';
  }

  function hvordanTekst() {
    var på = find(side.seg + ' button.on', panel);
    return på && segÅben() ? på.textContent.trim() : 'Afhentning';
  }

  // ----------------------------------------------------------
  //  SUMLINJEN
  //  ----------------------------------------------------------
  //  Designets note over knappen. Den beholder sin form; kun
  //  tallene er ægte. Den er samtidig stedet, fejl står — der er
  //  ikke tegnet et fejlfelt i designet, og et opfundet ét ville
  //  være en ændring af skallen.
  // ----------------------------------------------------------
  var fejlVises = false;

  function sumFelt() {
    return find('#sumline', panel) || find('.note', panel);
  }

  /* ============================================================
     JERES BESTILLING — LINJE FOR LINJE  (30/8)
     ------------------------------------------------------------
     Kundens ord med sit eget forlæg i hånden: bestillingen skal
     føles "lige så let og nem", man skal "kunne se hvad man har
     bestilt", og "det samler sig og giver overblik og regner ud".

     Linjen sagde før "3 stk. · 205 kr." Det er et tal, ikke et
     overblik: har man valgt i fire foldede kategorier, kan man
     ikke se HVAD de tre er uden at folde dem ud igen. Nu står
     hver linje med sit antal og sit navn, og totalen står for
     sig — som en kvittering, før man sender.

     ⚠️ EN VARE UDEN PRIS MÅ IKKE FORSVINDE UD AF SUMMEN. Over
     halvdelen af kortet står uden pris endnu; talte de med som
     nul, ville gæsten se et beløb, der er for lavt, og det
     opdages først ved lugen. Derfor siger linjen "+ det uden
     pris". */
  function visSum() {
    /* ⚠️ MINDSTEANTALLET FØLGER KURVEN, ikke kun indlæsningen.
       Den skal sige "I mangler to", MENS hun tæller op. */
    visMinStk();
    visKnap();
    var note = sumFelt();
    if (!note) return;
    fejlVises = false;
    tøm(note);
    note.classList.remove('sumbar');

    var n = antalIKurv();
    var tid = felt('tid');
    var klokken = tid && tid.value ? 'kl. ' + tid.value : '';
    var nøgler = Object.keys(kurv);

    if (!n) {
      /* ⚠️ EN TOM KURV SKAL SIGE, HVAD DER SKAL TIL — IKKE ET
         KLOKKESLÆT  (4/9). Kundens ord med et skærmbillede af
         linjen: *"Vælg mindst én ting · kl. 12:00 — hvad skal
         det der betyde?"* Han har ret: tidspunktet er valgt i
         feltet lige ovenover, og gentaget her, FØR der er noget
         at hente, læses det som en oplysning, der hører til
         noget andet. Og "mindst én ting" er direkte forkert på
         en side, der kræver fire.

         Reglen skriver sætningen: er der et mindsteantal, siger
         linjen tallet. Så møder gæsten kravet, FØR hun fylder
         kurven — ikke som et afslag på Send-knappen. */
      /* ⚠️ KUN PÅ EN SIDE, DER SÆLGER SMØRREBRØD ALENE. På
         forsiden kan man bestille ÉN burger — mindsteantallet
         tæller kun smørrebrødet (R.minStkMangler), og en linje,
         der krævede fire, ville afvise noget, siden tager imod. */
      var min = side.udvalg === 'kun-smoer' && R.minStk ? R.minStk(data) : 1;
      note.textContent = min > 1
        ? 'Vælg mindst ' + min + ' stykker smørrebrød — så regner vi prisen ud.'
        : 'Vælg det, I skal have — så regner vi prisen ud.';
      return;
    }

    note.classList.add('sumbar');

    var linjer = lav('div', 'sum-linjer');
    linjer.appendChild(lav('b', 'sum-hoved', 'Jeres bestilling:'));
    nøgler.forEach(function (k, i) {
      var e = kurv[k];
      var t = e.antal + ' × ' + e.navn + (e.variant ? ' (' + e.variant + ')' : '');
      linjer.appendChild(lav('span', 'sum-vare', (i ? ' · ' : ' ') + t));
    });

    /* ⚠️ DER ER IKKE EN "+ DET UDEN PRIS"-LINJE HER, OG DET ER
       IKKE EN FORGLEMMELSE. En vare uden pris kan ses, men ikke
       lægges i kurven (reglen fra 26/8: Butik.udvalg lægger den i
       spoergPris, og dagens ret uden pris filtreres af
       Butik.retKanBestilles). Skrev vi grenen alligevel, ville
       den være død kode, der LIGNER et værn — og den næste, der
       læser filen, ville tro, at tilfældet var dækket. */
    var emb = emballagen();
    if (emb.antal) {
      linjer.appendChild(lav('span', 'sum-emb',
        '  + emballage ' + emb.antal + ' × ' + kroner(emb.pris)));
    }
    /* ⚠️ FRAGTEN SKAL STÅ, IKKE BARE TÆLLE MED (4/9). MÅLT på
       smørrebrødssiden: fire stykker à 55 med emballage sagde
       "i alt 339,-", mens linjerne kun forklarede 260 af dem —
       de 79 var rigtige og usynlige. Et beløb, gæsten ikke kan
       regne efter, er et spørgsmål ved lugen. Samme rettelse som
       emballagen fik 1/9. */
    var lev = fragten();
    if (lev.ialt) {
      linjer.appendChild(lav('span', 'sum-emb',
        '  + levering ' + kroner(lev.pris)));
    }
    note.appendChild(linjer);

    var sum = sumIKurv();
    note.appendChild(lav('div', 'sum-total',
      n + ' stk.'
      + (sum ? ' · i alt ' + kroner(sum) : '')
      + ' · ' + hvordanTekst() + (klokken ? ' · ' + klokken : '')));
  }

  /* ---- KNAPPEN SIGER, HVAD DER MANGLER  (4/9) ----

     Kundens ord: mindsteantallet *"skal stå som default, og den
     ikke godkender købet ellers"*. Afsendelsen HAR spærret siden
     30/8 — men først på klikket, og det er den forkerte vej rundt:
     gæsten fylder dag, tid, navn og nummer ud og møder så et nej.

     ⚠️ SAMME GREB SOM bestil/ HAR HAFT HELE TIDEN: knappen er
     slået fra, og den siger HVORFOR. To skærme, der spærrer på
     hver sin måde for den samme regel, er én for meget.

     ⚠️ OG TEKSTEN SKIFTES I TEKSTKNUDEN. Designets <span
     class="sheen"> ligger inde i knappen; et textContent ville
     tage glansen med — arret fra 31/8 (pegVidere). */
  function knapTekst(knap, ord) {
    var k = knap.firstChild;
    if (k && k.nodeType === 3) k.nodeValue = ord;
    else knap.insertBefore(document.createTextNode(ord), knap.firstChild);
  }

  function visKnap() {
    var knap = find('#ssend', panel) || find('button.g.solid.blk', panel);
    if (!knap) return;
    var n = antalIKurv();
    var mangler = R.minStkMangler ? R.minStkMangler(data, smoerIKurv()) : 0;
    var i_alt = sumIKurv();

    if (!n) {
      knap.disabled = true;
      knapTekst(knap, 'Vælg noget først');
      return;
    }
    if (mangler) {
      knap.disabled = true;
      knapTekst(knap, 'Mangler ' + (mangler - smoerIKurv()) + ' stykker');
      return;
    }
    knap.disabled = false;
    /* Beløbet på knappen, som ved bordet: gæsten skal kunne se,
       hvad hun siger ja til, uden at kigge et andet sted hen. */
    knapTekst(knap, 'Send bestilling' + (i_alt ? ' · ' + kroner(i_alt) : ''));
  }

  function brøl(besked, feltNavn) {
    var note = sumFelt();
    /* ⚠️ FEJLEN STÅR IKKE I DEN MØRKE BJÆLKE. Den er kvitteringen
       — "sådan ser jeres bestilling ud" — og en rød advarsel
       skrevet hen over den ligner, at bestillingen er væk. */
    if (note) { note.classList.remove('sumbar'); note.textContent = '⚠ ' + besked; }
    fejlVises = true;
    var f = feltNavn ? felt(feltNavn) : null;
    if (f) f.focus();
  }

  // ----------------------------------------------------------
  //  AFSENDELSEN
  // ----------------------------------------------------------
  /* ⚠️ EMBALLAGEN ER EN LINJE I BESTILLINGEN, IKKE ET SKJULT
     TILLÆG. Køkkenet skal kunne se, at der skal pakkes tre
     portioner, og kassen skal kunne se, hvad totalen består af.
     Navnet er ejerens eget, hvis han har skrevet et. */
  function emballageLinje(linjer) {
    var e = emballagen();
    if (!e.antal) return linjer;
    var navn = String((data.indstillinger || {}).emballage_navn || '').trim()
      || 'Emballage';
    /* ⚠️ FLAGET SKAL MED — se noten i js/bestilling.js. Uden det
       kender personalesiden emballagen kun på NAVNET, og et
       tillæg, der læses som mad, ender i køkkenets
       produktionsliste. */
    return linjer.concat([
      { navn: navn, antal: e.antal, pris: e.pris, emballage: true }]);
  }

  /* ⚠️ FRAGTEN ER OGSÅ EN LINJE, IKKE ET SKJULT TILLÆG (3/9).

     Kundens ord: *"regner fragten oveni plus maden som står og
     eventuelt emballage ligesom de gør på normal
     bestillingssiden."* Emballagens form, én gang mere: køkkenet
     og kassen skal kunne se, hvad totalen består af, og et tillæg,
     gæsten først møder på totalen, er et tal, hun spørger til ved
     lugen.

     ⚠️ FLAGET emballage: true SÆTTES OGSÅ HER, og det er ikke en
     fejl: Butik.erEmballage er husets ENE regel for "det her er
     penge, ikke arbejde". Uden flaget ville køkkenet få
     "lav 1 Levering" i produktionslisten, og dagens tal ville
     sige én ret for meget. Navnet skiller dem på skærmen. */
  /* ⚠️ ÉN INDGANG TIL BEGGE TILLÆG. Kaldes de hver for sig, er
     der to steder, det næste tillæg kan blive glemt — og det er
     præcis, hvad der skete med emballagen, som kun forsiden
     regnede med i et døgn (31/8). */
  function medTillaeg(linjer) {
    return leveringsLinje(emballageLinje(linjer));
  }

  function leveringsLinje(linjer) {
    if (!R.levering) return linjer;
    var l = R.levering(data, hvordan());
    if (!l.ialt) return linjer;
    return linjer.concat([
      { navn: 'Levering', antal: 1, pris: l.pris, emballage: true }]);
  }

  function send() {
    var navn = værdi('navn');
    var tlf = værdi('tlf');
    var besked = værdi('besked');
    var adresse = værdi('adresse');
    var tid = felt('tid');
    var svar = hvordan();

    if (antalIKurv() < 1) return brøl('Vælg mindst én ting, før du sender.');
    /* ⚠️ KUN SMØRREBRØDET TÆLLER MED. Og beskeden SIGER det —
       "der skal mindst bestilles 5 stk." fik en gæst med én
       burger til at lede efter fire mere. */
    var mangler = R.minStkMangler(data, smoerIKurv());
    if (mangler) {
      return brøl('Der skal mindst bestilles ' + mangler + ' stk. smørrebrød.');
    }
    if (navn.trim().length < 2) return brøl('Skriv dit navn.', 'navn');
    if (tlf.replace(/[^0-9]/g, '').length < 8) {
      return brøl('Skriv et telefonnummer, vi kan få fat i dig på.', 'tlf');
    }
    if (svar === 'levering' && adresse.trim().length < 5) {
      return brøl('Skriv adressen, maden skal køres til.', 'adresse');
    }
    /* ⚠️ EN LEVERING UDEN FOR OMRÅDET MÅ IKKE SENDES  (4/9).

       Kundens ord: *"man kan godt bestille til Frederiksberg, som
       ligger i Kbh, som de ikke leverer til — det skal også
       fixes."* Han har ret, og det vender en beslutning fra i
       morges: linjen sagde "send den endelig, så ringer vi", og
       så lå der en levering til Frederiksberg i køkkenets liste
       med en hentetid, ingen kan holde.

       ⚠️ MEN DET ER IKKE ET BLANKT AFSLAG. Ejeren skriver selv
       "længere ude efter aftale", så beskeden peger to steder
       hen: telefonen, hvor aftalen KAN laves, og "Vi henter",
       som altid kan lade sig gøre. En formular, der siger nej
       uden en vej videre, sender en kunde væk.

       ⚠️ OG 'ukendt' SPÆRRER IKKE. Gæsten kan have skrevet
       "Strandvejen 4, Greve" uden postnummer, og et nej dér
       ville afvise en adresse, forretningen kører til hver dag.
       Kun et postnummer, vi HAR set og IKKE kører til. */
    if (svar === 'levering' && R.leveringSvar
        && R.leveringSvar(data, adresse) === 'spoerg') {
      return brøl('Vi kører ikke fast til den adresse. Ring til os på '
        + nummeret()
        + ', så aftaler vi det — eller vælg "Vi henter".', 'adresse');
    }
    if (!valgtDag || !tid || !tid.value) return brøl('Vælg en dag og et tidspunkt.');

    var knap = find('button.g.solid.blk', panel);
    if (knap) knap.disabled = true;

    Butik.bestil({
      navn: navn,
      telefon: tlf,
      hent_dato: valgtDag,
      hent_tid: tid.value,
      hvordan: svar,
      leverings_adresse: adresse,
      besked: besked,
      linjer: medTillaeg(Object.keys(kurv).map(function (k) {
        return {
          navn: kurv[k].navn,
          antal: kurv[k].antal,
          pris: kurv[k].pris,
          /* ⚠️ FYLDET FØLGER LINJEN, DET ER IKKE EN LINJE FOR SIG.
             Stod det i kolonnen fyld sammen med ønskerne, ville
             køkkenet få "2 × Smørrebrød" og et løsrevet ønske om
             leverpostej — og ikke vide, at de to hører sammen.
             Se noten i Butik.bestil om hvorfor navnet forbliver
             størrelsens. */
          variant: kurv[k].variant || null,
        };
      })),
      /* ⚠️ FYLDET ER SIT EGET FELT, IKKE EN LINJE. De 29 slags er
         ØNSKER uden pris (se model A i README): de må ikke lægges
         til summen, og de må ikke stå som varer, køkkenet skal
         lave et stykke af. Kolonnen fyld findes i forvejen —
         bestil/ har sendt den siden 20/8. */
      fyld: valgtFyld.slice(),
    }).then(function (raekke) {
      visTak(raekke);
    }).catch(function (fejl) {
      if (knap) knap.disabled = false;
      console.warn('Bestillingen kunne ikke sendes:', fejl);
      /* ⚠️ GRUNDEN SKAL MED (4/9). Her stod ÉN sætning for alle
         fejl — så en gæst, hvis rejemad lige var blevet udsolgt,
         fik "Bestillingen kunne ikke sendes" og havde ingen måde
         at komme videre på. Butik.bestil oversætter hver eneste
         afvisning til dansk MED en handling i; bestil/ har vist
         den siden foråret, og de her to sider smed den væk.
         Reserven bliver: en rå teknisk streng må ikke stå på
         skærmen. */
      if (fejl && fejl.tidFuld) friskTider();
      brøl((fejl && fejl.message)
        || 'Bestillingen kunne ikke sendes. Prøv igen — eller ring til os.');
    });
  }

  /* Kvitteringen bygges af designets egne dele: h3, .hint og
     .note, som de står i panelet på de andre sider. */
  function visTak(b) {
    /* ============================================================
       KVITTERINGEN BYGGES ÉT STED  (4/9)
       ------------------------------------------------------------
       Kundens ord: *"få den slags animation og kvittering alle
       steder man bestiller."* Formen bor i
       js/skal/kvittering.js og css/kvittering.css; her står kun
       det, DEN HER bestilling ved: hvad der blev bestilt, og
       hvad der er lovet.

       ⚠️ MosedeKvittering ER PÅKRÆVET. Uden filen ville en gæst
       stå uden kvittering på en bestilling, der ER gemt — så
       kaster vi ikke, vi skriver den simple udgave. */
    var K = window.MosedeKvittering;

    /* BESTILT ER BESTILT. Kontakten i admin står stadig, men den
       er slået TIL som standard — derfor === false og ikke
       === true.

       EN LEVERING BEKRÆFTES ALDRIG AF SIG SELV. Vi kan love, at
       maden bliver lavet — det er køkkenets eget arbejde. Vi kan
       IKKE love, at den kan køres til en adresse, vi ikke kender. */
    var leveres = b.hvordan === 'levering';
    var auto = (data.indstillinger || {}).auto_bekraeft !== false && !leveres;
    /* ⚠️ PUNKTUM, IKKE KOLON. Hele huset skriver "kl. 13.00"
       (js/bestilling.js, js/bord.js, bestil-regler.js); kun den
       her kvittering skrev 13:00 — MÅLT på et skud 4/9. To
       skrivemåder for det samme klokkeslæt er dét, gæsten
       standser ved. */
    var hvornår = langDato(b.hent_dato) + ' kl. '
      + String(b.hent_tid).slice(0, 5).replace(':', '.');

    var besked = auto
      ? 'Bestilt. ' + (b.hvordan === 'spis_her' ? 'Spis her ' : 'Hentes ') + hvornår + '. '
        + 'Der er ikke betalt noget – du betaler ved lugen.'
      : leveres
        ? 'Vi ringer og bekræfter leveringen — vi skal lige se på adressen først. '
          + hvornår + '. Der er ikke betalt noget.'
        : 'Vi ringer og bekræfter. ' + hvornår + '. '
          + 'Der er ikke betalt noget – du betaler ved lugen.';

    if (!K) {
      tøm(panel);
      panel.appendChild(lav('h3', null, 'Tak.'));
      panel.appendChild(lav('p', 'hint', besked));
      panel.appendChild(lav('div', 'note', 'Reference: ' + b.reference));
      return;
    }

    /* Linjerne, som sumbjælken viste dem, før hun trykkede. En
       kvittering, der kun siger "tak", er en, man ikke kan
       tjekke efter. */
    var linjer = (b.linjer || []).map(function (l) {
      return {
        navn: l.antal + ' × ' + l.navn + (l.variant ? ' (' + l.variant + ')' : ''),
        vaerdi: l.pris ? kroner(l.pris * l.antal) : '',
      };
    });
    var i_alt = (b.linjer || []).reduce(function (m, l) {
      return m + (Number(l.pris) || 0) * (Number(l.antal) || 0);
    }, 0);
    if (i_alt) linjer.push({ navn: 'I alt', vaerdi: kroner(i_alt), fed: true });
    if (leveres && b.leverings_adresse) {
      linjer.push({ navn: 'Leveres til', vaerdi: b.leverings_adresse });
    }

    K.byg(panel, {
      titel: 'Tak, ' + pæntFornavn(b.navn) + '.',
      besked: besked,
      kode: {
        navn: 'Bestillingsnummer',
        reference: b.reference,
        nummer: function () {
          if (!Butik.bestillingsnummer || !Butik.pæntNummer) return null;
          return Butik.bestillingsnummer(b.reference).then(function (n) {
            return n ? Butik.pæntNummer(n) : null;
          });
        },
      },
      linjer: linjer,
      /* ⚠️ VEJEN TIL KVITTERINGEN, DER LEVER  (4/9). Uden det her
         link findes siden ikke for nogen — den er kun en adresse,
         ingen kender. Kvitteringen i fanen er væk, når fanen er
         væk; den her kan bogmærkes, deles og åbnes igen, mens
         hun venter. */
      ekstra: [(function () {
        if (!Butik.foelgAdresse) return null;
        var a = document.createElement('a');
        a.className = 'kvit-foelg';
        a.href = Butik.foelgAdresse(b.reference);
        a.textContent = 'Følg din bestilling →';
        return a;
      }())],
      fine: 'Gem linket, eller tag et billede af nummeret. Har du glemt '
        + 'noget, så ring — vi kan nå det, indtil maden er lavet.',
    });
    /* ⚠️ 'start' OG IKKE 'center'. MÅLT på et skud: med center
       lå hakket — det første, gæsten skal se — halvt bag den
       faste topbjælke, fordi kvitteringen er høj. 'start'
       respekterer #sc's scroll-padding-top (128 px, sat 31/8),
       så hakket lander lige under bjælken. */
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ----------------------------------------------------------
  //  START
  // ----------------------------------------------------------
  function byg(d) {
    data = d;

    /* Er der lukket for bestillinger — sæsonen eller kontakten i
       admin — findes formularen ikke. På forsiden ryger hele
       afsnittet, og den flydende pille peger på smørrebrødssiden
       i stedet for ned i ingenting. På smørrebrødssiden ryger kun
       panelet: resten af siden sælger stadig smørrebrødet, og der
       står et telefonnummer. */
    var lukket = ((d.indstillinger || {}).saeson || {}).lukket
      || (d.indstillinger || {}).bestilling_aaben === false;
    var kanBestilles = varerne().length > 0 || dagensRet();

    if (lukket || !kanBestilles || !R.muligeDage(d).length) {
      var skjules = side.skjulHele
        ? (panel.closest ? panel.closest('section') : null) || panel
        : panel;
      skjules.style.display = 'none';
      var pille = document.getElementById('bestil-pill');
      if (pille && side.pilleTil) pille.setAttribute('href', side.pilleTil);
      return;
    }

    /* Listen mærkes, så tegningen kan finde den igen. Designet
       har ingen id på den, og at tælle .field'er ville gå i
       stykker, første gang nogen flyttede et felt. */
    var liste = null;
    alle('.field', panel).forEach(function (f) {
      if (!liste && f.querySelector('.item')) liste = f;
    });
    if (!liste) return;
    liste.setAttribute('data-liste', '');

    visDage();
    visTider();
    visHint();
    visVarer();
    tegnFyld();
    tegnStoerrelser();

    var dato = felt('dato');
    if (dato) {
      dato.addEventListener('change', function () {
        valgtDag = dato.value;
        visTider();
        visHint();
        /* Dagens ret findes kun i dag. Skifter gæsten dag, skal
           den ud af kurven igen — ellers bestiller hun en ret,
           køkkenet ikke laver den dag. */
        Object.keys(kurv).forEach(function (k) {
          if (k.indexOf('dagens|') === 0) delete kurv[k];
        });
        visVarer();
        tegnFyld();
        tegnStoerrelser();
      });
    }

    /* ⚠️ ET ANDET KLOKKESLÆT ER ET ANDET UDVALG (30/8). Vælger
       gæsten kl. 10.00, forsvinder grillen; vælger hun 13.00,
       forsvinder morgenmaden. Og det, der allerede er talt op,
       må ikke blive hængende usynligt i kurven — hun ville betale
       for mad, køkkenet ikke laver på det tidspunkt. */
    var tid = felt('tid');
    if (tid) {
      tid.addEventListener('change', function () {
        ryddedeKurven();
        visVarer();
        tegnFyld();
        tegnStoerrelser();
        visSum();
      });
    }

    visLeveringsOmraade();

    var seg = find(side.seg, panel);
    if (seg) {
      if (!segÅben()) {
        /* Feltet er hele .field'en omkring segmentet — etiketten
           skal væk sammen med knapperne. Og det felt, segmentet
           folder ud (leveringsadressen), skal med. */
        var felten = seg.closest ? seg.closest('.field') : null;
        (felten || seg).style.display = 'none';
        var ekstra = side.adresseFelt ? find(side.adresseFelt, panel) : null;
        if (ekstra) ekstra.style.display = 'none';
      } else {
        // EFTER havnegrillen.js' egen lytter, så vores sumlinje
        // står sidst — ellers skriver designets sum() hen over.
        seg.addEventListener('click', function () {
          visSum();
          visLeveringsSvar();
          visTidLabel();
        });
      }
    }

    /* ⚠️ SVARET SKRIVES, MENS HUN TASTER — ikke ved afsendelsen.
       Får hun først at vide ved Send, at postnummeret ligger
       uden for området, har hun fyldt hele formularen ud
       forgæves. Samme grund som den fulde dag STÅR i
       dagstriben i stedet for at mangle (1/9). */
    var adr = felt('adresse');
    if (adr) adr.addEventListener('input', visLeveringsSvar);
    visLeveringsSvar();
    visTidLabel();

    ['navn', 'tlf'].forEach(function (n) {
      var f = felt(n);
      if (f) f.addEventListener('input', function () { if (fejlVises) visSum(); });
    });

    var knap = find('button.g.solid.blk', panel);
    if (knap) {
      knap.type = 'button';
      knap.addEventListener('click', send);
    }
  }

  /* Hvilken af de to formularer står vi på? Panelet hedder
     #bestil begge steder — på forsiden er det inde i afsnittet,
     på smørrebrødssiden ER det panelet. */
  /* ---- DELT MED TAPASSIDEN ----
     m-tapas.html har en helt anden formular — antal personer i
     stedet for rækker — men den samme kvittering, det samme
     prisformat og den samme datotekst. De tre ting eksporteres,
     så tapassiden ikke skriver dem af. En kvittering, der siger
     noget andet på to sider af samme forretning, er to
     kvitteringer. */
  window.MosedeSkal = {
    kroner: kroner,
    langDato: langDato,
    dagTekst: dagTekst,
    kvittering: function (boks, b, ind) {
      var gemt = data;
      data = { indstillinger: ind || {} };
      panel = boks;
      visTak(b);
      data = gemt;
    },
  };

  var rod = document.getElementById('bestil');
  if (!rod) return;
  panel = rod.classList.contains('panel') ? rod : find('.panel', rod);
  if (!panel) return;

  /* #sdato findes kun på smørrebrødssiden. Vi kender siden på et
     af dens EGNE felter og ikke på filnavnet: adresserne kan
     flytte, felterne flytter ikke. */
  side = find('#sdato', panel) ? SIDER[1] : SIDER[0];

  /* Smørrebrødssidens billedstribe. Reglen bor i
     js/skal/billedplads.js — forsiden, tapassiden og baglokalets
     side har den samme, og fire kopier ville tegne fire
     forskellige flader.

     ⚠️ OG DEN SKAL OP, OGSÅ NÅR HENTNINGEN FEJLER. Fotoet ligger
     i repoet, og tegnet står i HTML'en; ingen af delene venter på
     databasen. Lod vi pladsen stå i .catch, ville en side, hvor
     databasen er nede, møde gæsten med en stiplet grå kasse
     øverst — og det er lige præcis den dag, den skal se hel ud. */
  function fyldPladser(d) {
    if (!window.MosedeBilledplads) return;
    try {
      window.MosedeBilledplads.fyld((d && d.indstillinger) || {});
    } catch (e) {
      console.warn('Billedpladsen fejlede:', e);
    }
  }

  Butik.hent().then(function (d) {
    /* ⚠️ TIDERNE HENTES FØR byg(). Kom de bagefter, ville
       vælgeren stå tegnet uden dem i det sekund, gæsten ser
       den — og et fyldt kl. 12.00 ville se ledigt ud, lige
       indtil noget andet tegnede listen om. */
    return (Butik.hentFyldteTider ? Butik.hentFyldteTider() : Promise.resolve([]))
      .catch(function () { return []; })
      .then(function (liste) {
        fyldteTider = liste || [];
        return d;
      });
  }).then(function (d) {
    byg(d);
    fyldPladser(d);
  }).catch(function (fejl) {
    console.warn('Bestillingens kobling fejlede, skallen står som designet:', fejl);
    fyldPladser(null);
  });
}());
