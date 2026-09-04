/* ============================================================
   DE TRE FORESPØRGSELSSIDER — KOBLINGEN, IKKE SKALLEN

   Selskaber, catering og baglokalet er den SAMME tabel med tre
   indgange (fase 2). De tre formularer i designet spørger om
   forskellige ting — anledning, tidsrum, kuverter, fade — og alt
   det ekstra lægges i kolonnen detaljer, så personalet kan se
   det som felter og ikke som fritekst midt i en besked.

   ÉT MODUL, TRE FORMULARER. Forskellene står som opsætning i
   SIDER; alt andet er fælles. Tre kopier af den samme afsendelse
   ville langsomt komme til at gøre tre forskellige ting.

   KALENDEREN. Havnen er ét sted: er baglokalet lejet ud den 12.,
   kan der ikke også holdes selskab hos jer den 12. De optagne
   dage hentes fra listen, gæsten må læse (KUN datoer), og
   databasen siger nej igen, hvis nogen omgår formularen.
   Catering optager ingenting — den er pr. definition ud af
   huset — og et selskab UD AF HUSET gør heller ikke.
   ============================================================ */

(function () {
  'use strict';

  if (!window.Butik) return;

  /* PANELET HEDDER IKKE DET SAMME PÅ ALLE FIRE SIDER.

     De tre første har id'et "forespoerg"; frokostsiden hedder
     "tilbud", fordi designets egen pille og skuffemenu peger på
     #tilbud. At omdøbe det ville brække to links i skallen — og
     skallen er facitlisten. Derfor står panelets id i SIDER
     nedenfor, og siden findes på DATOFELTET, som ligger inde i
     panelet men kan slås op på hele siden. */
  var panel = null;

  function find(v, rod) {
    try { return (rod || panel).querySelector(v); } catch (e) { return null; }
  }
  function alle(v, rod) {
    return Array.prototype.slice.call((rod || panel).querySelectorAll(v));
  }
  function tøm(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst !== undefined && tekst !== null) el.textContent = tekst;
    return el;
  }
  function tekst(el) { return el ? el.textContent.trim() : ''; }

  /* ---- DE TRE FORMULARER ----
     chips: rækkefølgen af [data-chips] i panelet. Der er ingen
     id'er på dem i designet, og at give dem nogen ville være at
     lave om på skallen — så de tælles, og opsætningen siger,
     hvad nummer nul og nummer ét hedder. */
  var SIDER = {
    pdato: {
      type: 'selskab',
      felter: { dato: 'pdato', antal: 'pantal', navn: 'pnavn',
        tlf: 'ptlf', mail: 'pmail', besked: 'pbesked' },
      /* ⚠️ ANLEDNINGEN ER FRITEKST NU (29/8) — den stod som seks
         chips, og en gæst, der ikke kunne se sin anledning,
         trykkede "Andet", som ikke fortæller personalet noget.
         De to nye grupper er stedvalget: hvor på havnen, og skal
         dækket med. */
      chips: ['sted', 'daekket'],
      ekstra: { anledning: 'panledning', mad: 'pmad' },
      /* Mailen er påkrævet her: vi lover svar inden for et døgn,
         og et løfte kræver en vej tilbage. */
      krav: { mail: true },
      /* Fire dages varsel — ejerens eget tal: et selskab kan
         ikke skaffes på 1-3 dage. Bordbooking (to timer) og mad
         (et døgn) er noget andet; det her er en KØKKENPLAN. */
      varselDage: 4,
      seg: { vælger: '.seg2', navn: 'hvor', svar: ['hos-jer', 'ud-af-huset'] },
      optagerDagen: function (d) { return d.hvor !== 'ud-af-huset'; },
    },
    bdato: {
      type: 'baglokale',
      felter: { dato: 'bdato', antal: 'bantal', navn: 'bnavn',
        tlf: 'btlf', mail: 'bmail', besked: 'bbesked' },
      /* Anledningen og maden er fritekst (29/8) — samme koncept
         som selskabssiden.

         ⚠️ OG TIDSRUMMET ER DET OGSÅ NU  (4/9). Det var fire
         kasser (Formiddag 10–14, Eftermiddag 14–18, Aften 17–23,
         Hele dagen), og kundens ord var: *"ændrer tidsrum til
         selv at kunne styrer det istedet for de der
         intervaller."* En konfirmation, der slutter kl. 16, og
         en generalforsamling fra 19 til 21 måtte begge trykke på
         noget, der ikke passede — og så blev det alligevel
         aftalt i telefonen bagefter.

         Der er ingen chipgrupper tilbage på siden. */
      chips: [],
      /* ⚠️ TIDSRUMMET SENDES SOM ÉN TEKST, præcis som chippen
         gjorde: detaljer.tidsrum = "17.00–21.00". Admin har
         allerede etiketten, og der skal ingen SQL til. */
      tidsrum: { fra: 'btid-fra', til: 'btid-til' },
      ekstra: { anledning: 'banledning', mad: 'bmad' },
      seg: { vælger: '[data-toggles="#madfelt"]', navn: 'servering', svar: ['med-mad', 'kun-lokalet'] },
      /* ⚠️ MINDST ÉN VEJ TILBAGE — ikke begge (kundens ord:
         "lade email eller nummer være som en option"). Vi lover
         svar inden for et døgn; hvilken vej, bestemmer gæsten. */
      krav: { mailEllerTlf: true },
      /* Fire dage, som selskaber: et lokale skal gøres klar, og
         køkkenet skal kunne nå maden. */
      varselDage: 4,
      optagerDagen: function () { return true; },
    },
    /* ============================================================
       SMØRREBRØD UD AF HUSET  (31/8)
       ------------------------------------------------------------
       Siden var en BESTILLING med kurv, dagvælger og fyld, der
       skrev direkte i `bestillinger`. Kundens ord: "fuck af med
       kalenderen, det er ligegyldigt ... bare hav en knap, der
       hedder kontakt og få et tilbud" — og adspurgt direkte:
       formularen skal HELT væk.

       Den er nu den samme forespørgsel som catering og selskaber,
       fordi han i samme besked sagde, at alt skal kunne ses i
       Forespørgsler i admin. En mailto lander i en indbakke; en
       forespørgsel lander på en fane, kan tælles, kan lægges i
       kalenderen og kan ikke blive væk.

       ⚠️ INGEN LEDIGHEDSKALENDER OG INGEN VARSEL. Smørrebrød ud
       af huset optager ingen dage (maden kører ud, havnen står
       fri), og datoen er FRIVILLIG: "engang i oktober" er en
       rimelig forespørgsel. Et varsel ville afvise den. */
    sdato: {
      type: 'smoerrebroed',
      felter: { dato: 'sdato', antal: 'santal', navn: 'snavn',
        tlf: 'stlf', mail: 'smail', besked: 'sbesked' },
      /* ⚠️ RÆKKEFØLGEN ER OPMÆRKNINGENS. Chipgrupperne læses
         efter, hvor de står i HTML'en — bytter nogen om på de to
         grupper uden at rette her, lander maden under
         "anledning", tavst, og admin viser det pænt formateret. */
      chips: ['anledning', 'mad'],
      ekstra: { anledning: 'sanledning', adresse: 'sadr' },
      /* Anledningen ERSTATTER (gæstens egne ord vinder over den
         chip, der var valgt på forhånd); maden LÆGGES TIL. Se
         den lange note ved cateringen nedenfor. */
      chipsTillæg: { mad: 'smad' },
      /* ⚠️ MINDST ÉN VEJ TILBAGE, ikke begge. Den, der spørger om
         tyve håndmadder fra et arbejde, har måske kun en mail —
         samme regel som baglokalet (29/8). */
      krav: { mailEllerTlf: true },
      seg: { vælger: '[data-toggles="#sadrfelt"]', navn: 'levering',
        svar: ['afhentning', 'levering'] },
      optagerDagen: function () { return false; },
    },
    /* ============================================================
       ⚠️ CATERINGEN HAR INGEN OPSÆTNING HER MERE  (4/9)
       ------------------------------------------------------------
       Kundens ord: *"hele catering fanen skal altså bare være en
       knap til mailen booking."*

       h-catering.html har ikke længere en formular, og derfor
       ikke et #cdato at genkende siden på. Opsætningen er
       SLETTET og ikke bare efterladt: otte JavaScript-filer i
       repoet indlæses ikke af én eneste side (30/8), og de er en
       fælde for den, der læser koden om et halvt år og tror, de
       kører. En død SIDER-nøgle er den samme fælde i lille.

       ⚠️ MEN TYPEN 'catering' LEVER VIDERE i databasen
       (forespoergsel_type_ok), i FORESPOERGSEL_TYPER i store.js og
       på Forespørgsler-fanen. Gamle cateringforespørgsler står
       stadig i admin, og de skal kunne åbnes, aftales og afvises
       som før. Fjern den aldrig fra de tre lister.

       Reglerne, opsætningen bar, er ikke væk med den — de har
       hver deres hjem på en side, der stadig kører:
         · [data-toggles] flytter .on ...... h-frokost, h-baglokale
         · adressen ryger ved afhentning ... h-frokost (#fadrfelt)
         · fritekst LÆGGES TIL chippen ..... h-frokost (chipsTillæg)
         · varslet skrives af reglen ....... h-frokost (tre dage)
         · nettet er datovælger ............ alle fire
         · ud af huset optager ingenting ... h-selskaber, h-frokost
       ============================================================ */

    /* ---- FROKOSTORDNINGEN ----

       Den stod som fase 6 med "tilbagevendende levering, pauser,
       helligdage". Det var en misforståelse, og Mikkel rettede
       den 20/8: den mad, man også kan bestille, skal bare kunne
       bestilles senest dagen før — og det gør forsidens
       bestilling allerede.

       Men designet fra 23/8 tegnede siden som et B2B-tilbud:
       firma, CVR, faste ugedage, fakturamail og knappen "Få et
       tilbud". Og dét er ikke en bestilling. Det er præcis en
       forespørgsel: et menneske skriver, personalet ringer, og
       der aftales en pris. Samme skelet som de tre ovenfor.

       DER BYGGES ALTSÅ INGEN ABONNEMENTSMOTOR. Der er ingen
       tabel til tilbagevendende leveringer, ingen pauser og
       ingen helligdage — kun det spørgsmål, firmaet stiller.

       Datoen er ØNSKET START og ikke en enkelt dag, så
       optagerDagen er falsk: en frokostordning er mad, der kører
       ud af huset, og lokalet står frit. Optog den dagen, kunne
       ét firma med en fast onsdag lukke hver eneste onsdag for
       selskaber og udlejning. */
    fstart: {
      type: 'frokost',
      panel: 'tilbud',
      felter: { dato: 'fstart', antal: 'fantal', navn: 'fnavn',
        tlf: 'ftlf', mail: 'fmail', besked: 'fbesked' },
      /* ⚠️ HVOR OFTE STÅR FØRST, fordi chipsene læses efter
         RÆKKEFØLGEN i opmærkningen: første [data-chips] på siden
         er "Hvor tit?", så "Hvilke dage?", så indholdet. Bytter
         nogen om på to grupper i HTML'en uden at rette her,
         lander ugedagene under "hvor ofte" — tavst, og admin
         viser det pænt formateret. */
      chips: ['hvor_ofte', 'dage', 'indhold'],
      seg: { vælger: '[data-toggles="#fadrfelt"]', navn: 'levering', svar: ['levering', 'afhentning'] },
      ekstra: { adresse: 'fadr', firma: 'ffirma', cvr: 'fcvr' },
      chipsTillæg: { indhold: 'fandet' },
      /* Tre dage (30/8, kundens ord: "minimum 2-3 dage"). En
         frokostordning er ikke ét måltid — der skal regnes en
         pris, købes ind til en hel uge og lægges en rute. Datoen
         er ØNSKET START, så tallet er, hvor hurtigt vi kan være
         klar, ikke hvor længe et firma skal vente på et svar:
         svaret kommer inden for et døgn. */
      varselDage: 3,
      /* ⚠️ FROKOSTEN OPTAGER INGEN DAGE. Maden kører ud af huset,
         og optog den dagen, kunne ét firma med en fast onsdag
         lukke hver eneste onsdag for selskaber og udlejning. */
      optagerDagen: function () { return false; },
    },
  };

  var side = null;
  Object.keys(SIDER).forEach(function (n) {
    if (!side && document.getElementById(n)) side = SIDER[n];
  });
  if (!side) return;

  panel = document.getElementById(side.panel || 'forespoerg');
  if (!panel) return;

  var data = null;
  var optagne = [];
  var oprindeligFine = '';

  function felt(navn) {
    var id = side.felter[navn] || (side.ekstra || {})[navn];
    return id ? document.getElementById(id) : null;
  }
  function værdi(navn) {
    var f = felt(navn);
    return f ? String(f.value || '').trim() : '';
  }

  // ----------------------------------------------------------
  //  BESKEDER
  //  ----------------------------------------------------------
  //  Designet har ikke tegnet et fejlfelt, og et opfundet ét
  //  ville være en ændring af skallen. Den lille linje under
  //  knappen er der i forvejen — den låner vi, og designets egen
  //  tekst kommer igen, så snart fejlen er rettet.
  // ----------------------------------------------------------
  /* ⚠️ DEN FØRSTE .fine I PANELET — OG DEN MÆRKES  (31/8).

     Der kom en .fine mere ind i panelet, da "Kontakt og få et
     tilbud"-kortet blev bygget, og seks prøver faldt med "strict
     mode violation: resolved to 2 elements". Prøverne målte
     `.fine` og ramte pludselig to.

     Elementet får derfor `data-fejllinje` på sig, første gang det
     slås op: koden og prøverne peger nu på NØJAGTIG det samme
     element, i stedet for begge at gætte på en klasse, designet
     bruger til flere ting. */
  function fineFelt() {
    var f = find('[data-fejllinje]') || find('.fine');
    if (f && !f.hasAttribute('data-fejllinje')) f.setAttribute('data-fejllinje', '');
    return f;
  }

  function sigFejl(besked, feltNavn) {
    var f = fineFelt();
    if (f) f.textContent = '⚠ ' + besked;
    var el = feltNavn ? felt(feltNavn) : null;
    if (el) el.focus();
    return false;
  }

  function rydFejl() {
    var f = fineFelt();
    if (f && oprindeligFine) f.textContent = oprindeligFine;
  }

  // ----------------------------------------------------------
  //  DETALJERNE
  // ----------------------------------------------------------
  function valgteChips(gruppe) {
    return alle('button.on', gruppe).map(tekst).filter(Boolean);
  }

  /* TO SLAGS SEGMENTER, OG DE HOLDER STYR PÅ SIG SELV HVER SIN
     MÅDE.

     [data-seg] flytter .on, når man trykker — det er den, der ser
     ud som et valg. [data-toggles] gør IKKE: designets egen kode
     skjuler eller viser bare feltet nedenunder, og den fremhævede
     knap bliver stående, hvor den startede.

     MÅLT: første udgave læste .on begge steder, og en catering,
     hvor gæsten havde trykket Afhentning, blev sendt som en
     LEVERING — med adressen på. Køkkenet ville køre ud med mad,
     nogen stod og ventede på ved lugen.

     Derfor spørges der om det, designet FAKTISK holder styr på:
     er feltet nedenunder synligt? */
  function segSvar() {
    var g = find(side.seg.vælger);
    if (!g) return side.seg.svar[0];

    var mål = g.getAttribute('data-toggles');
    if (mål) {
      var boks = document.querySelector(mål);
      return (boks && !boks.hidden) ? side.seg.svar[0] : side.seg.svar[1];
    }

    var knapper = alle('button', g);
    var på = find('button.on', g);
    var i = på ? knapper.indexOf(på) : 0;
    return side.seg.svar[i] || side.seg.svar[0];
  }

  /* ============================================================
     TIDSRUMMET OG DET, DET KOSTER  (4/9)
     ------------------------------------------------------------
     Kundens ord: *"gør det tydeligt med pricesen og ændrer
     tidsrum til selv at kunne styrer det."*

     De to ting hænger sammen: "en aften" ER op til fire timer,
     og alt derover er dagsprisen. Så snart gæsten selv vælger
     spændet, skal siden sige, hvad hendes valg koster — MENS hun
     vælger. Et krav, man først møder som et beløb i telefonen,
     er skrevet det forkerte sted (samme lære som
     mindsteantallet på smørrebrødssiden, 4/9).

     ⚠️ PRISEN LÆSES AF DET, DER STÅR PÅ SKÆRMEN, ikke af en
     kopi i koden. Tallene bor i data-vilk-spanene, som
     visVilkaar() fylder fra ejerens felter i admin, og designets
     tal er reserven. Skrev vi 1.200 og 2.000 her OG i HTML'en,
     ville de skride fra hinanden første gang ejeren rettede sit
     eget tal. Samme greb som nummeret på m-tapas.html, der
     læses af sidens eget tel:-link.
     ============================================================ */
  var AFTEN_TIMER = 4;

  function minutter(v) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '').trim());
    if (!m) return null;
    var t = Number(m[1]);
    var i = Number(m[2]);
    if (t > 23 || i > 59) return null;
    return t * 60 + i;
  }

  /* "17:00" → "17.00". Husets format; se noten i js/bord.js. */
  function kl(v) { return String(v || '').slice(0, 5).replace(':', '.'); }

  function tidsSpaend() {
    if (!side.tidsrum) return null;
    var a = document.getElementById(side.tidsrum.fra);
    var b = document.getElementById(side.tidsrum.til);
    if (!a || !b) return null;
    var fra = minutter(a.value);
    var til = minutter(b.value);
    if (fra === null || til === null) return null;
    /* ⚠️ ET SPÆND OVER MIDNAT ER IKKE EN FEJL, DET ER EN FEST.
       22–01 er tre timer, ikke minus nitten. Uden det her ville
       en nytårsaften blive afvist af sin egen formular. */
    var min = til - fra;
    if (min <= 0) min += 24 * 60;
    return { fra: fra, til: til, minutter: min,
      tekst: kl(a.value) + '–' + kl(b.value) };
  }

  /* Tallet, som det STÅR på skærmen: "1.200" → 1200. */
  function vilkaarTal(navn) {
    var el = document.querySelector('[data-vilk="' + navn + '"]');
    if (!el) return null;
    var n = Number(String(el.textContent || '').replace(/[^0-9]/g, ''));
    return isFinite(n) && n > 0 ? n : null;
  }

  function kroner(n) { return n.toLocaleString('da-DK') + ' kr.'; }

  /* Svarlinjen under de to felter. Den siger tre ting og ikke
     mere: hvor lang tid, hvilken pris — og om maden gør lejen
     gratis. */
  function visTidSvar() {
    var linje = document.getElementById('tid-svar');
    if (!linje || !side.tidsrum) return;
    linje.className = 'hint';

    var t = tidsSpaend();
    if (!t) { linje.textContent = 'Vælg et tidsrum.'; return; }
    if (t.minutter < 30) {
      linje.className = 'hint tid-fejl';
      linje.textContent = '⚠ Tidsrummet skal være mindst en halv time.';
      return;
    }

    var timer = t.minutter / 60;
    var pænt = (Math.round(timer * 10) / 10).toString().replace('.', ',');
    var dele = ['I har lokalet i ' + pænt + (timer === 1 ? ' time' : ' timer')];

    /* ⚠️ GRATIS SLÅR PRISEN, og rækkefølgen er hele pointen: står
       beløbet først og "men gratis" bagefter, læser gæsten
       beløbet. Kun MED mad — "kun lokalet" kan aldrig komme op
       på kuverter. */
    var gratisFra = vilkaarTal('gratis_fra');
    var antal = Number(værdi('antal'));
    var medMad = segSvar() === 'med-mad';
    if (medMad && gratisFra && isFinite(antal) && antal >= gratisFra) {
      linje.className = 'hint tid-gratis';
      linje.textContent = dele[0] + ' — og med ' + antal
        + ' kuverter mad er lokalelejen gratis.';
      return;
    }

    var pris = timer <= AFTEN_TIMER
      ? vilkaarTal('pris_aften') : vilkaarTal('pris_dag');
    if (pris) {
      dele.push(timer <= AFTEN_TIMER
        ? 'aftenpris ' + kroner(pris)
        : 'dagspris ' + kroner(pris));
      if (medMad && gratisFra) {
        dele.push('fra ' + gratisFra + ' kuverter mad er den gratis');
      }
    }
    linje.textContent = dele.join(' · ') + '.';
  }

  function detaljer() {
    var ud = {};
    var grupper = alle('[data-chips]');
    side.chips.forEach(function (navn, i) {
      if (!grupper[i]) return;
      var valgt = valgteChips(grupper[i]);
      if (!valgt.length) return;
      /* Enkeltvalg gemmes som tekst, flervalg som liste. Så
         slipper admin for at skulle kende forskel på "en liste
         med ét element" og "et valg". */
      ud[navn] = grupper[i].getAttribute('data-chips') === 'single' ? valgt[0] : valgt;
    });
    ud[side.seg.navn] = segSvar();

    /* ⚠️ TIDSRUMMET ER TO FELTER, ÉN OPLYSNING  (4/9). Personalet
       skal læse ét spænd på kortet, ikke to rækker, de selv skal
       lægge sammen — og den gamle chip sendte netop én tekst. */
    if (side.tidsrum) {
      var t = tidsSpaend();
      if (t) ud.tidsrum = t.tekst;
    }

    /* ⚠️ FRITEKST, DER LÆGGES TIL EN CHIPLISTE (30/8). Kundens
       ord: "hvad skal vi levere også fint med valgmuligheder men
       igen skriv selv også."

       Den skal LÆGGES TIL og ikke erstatte, modsat anledningen
       nedenfor: gæsten vælger smørrebrød og tapas OG skriver "og
       noget vegetarisk". Erstattede teksten listen, ville hendes
       to valg forsvinde i det sekund, hun uddybede dem — og
       køkkenet ville lave det halve. */
    Object.keys(side.chipsTillæg || {}).forEach(function (navn) {
      /* ⚠️ ID'ET DIREKTE, IKKE værdi(). felt() slår op i
         side.felter og side.ekstra på NAVN — et id, der ikke står
         i nogen af dem, giver null, og tillægget ville tavst være
         tomt hver gang. */
      var el = document.getElementById(side.chipsTillæg[navn]);
      var v = el ? String(el.value || '').trim() : '';
      if (!v) return;
      var liste = ud[navn];
      if (!liste) ud[navn] = [v];
      else if (Array.isArray(liste)) ud[navn] = liste.concat([v]);
      else ud[navn] = [liste, v];
    });

    /* Og ekstra-felterne til sidst: står et af dem med samme navn
       som en chipgruppe, VINDER gæstens egne ord. Rækkefølgen ER
       reglen: chipsene læses ovenfor, ekstra herunder, så det, hun
       selv har skrevet, overskriver den chip, der stod markeret på
       forhånd. Hun trykkede jo ikke på "Privatfest".
       ⚠️ Modsat chipsTillæg lige ovenfor, hvor teksten LÆGGES TIL:
       man vælger smørrebrød OG skriver "og noget vegetarisk". */
    Object.keys(side.ekstra || {}).forEach(function (navn) {
      var v = værdi(navn);
      if (v) ud[navn] = v;
    });
    /* Adressen hører kun til en levering. Blev den hængende,
       efter gæsten skiftede til afhentning, ville personalet
       ringe om en levering, ingen har bedt om. */
    if (ud.levering === 'afhentning') delete ud.adresse;
    return ud;
  }

  // ----------------------------------------------------------
  //  DATOEN
  //  ----------------------------------------------------------
  //  Designet har en fast dato i feltet ("2026-09-19"). Den
  //  ryger: en pladsholder, ingen har valgt, ville blive sendt
  //  som gæstens ønskede dato, den dag hun glemmer at røre
  //  feltet. Til gengæld sættes min og max, så feltet ikke kan
  //  give en dato, databasen alligevel afviser.
  // ----------------------------------------------------------
  function iso(dage) {
    var t = new Date(Butik.nu().dato + 'T12:00:00Z');
    t.setUTCDate(t.getUTCDate() + dage);
    return t.toISOString().slice(0, 10);
  }

  function erOptaget(dato) {
    if (!dato || !side.optagerDagen(detaljer())) return false;
    return optagne.some(function (o) { return o.dato === dato; });
  }

  /* ⚠️ VARSLET ER EJERENS, IKKE SIDENS. Fire dage på selskaber
     (kundens ord 29/8: "man skal tidligst booke 4 dage in
     advance, ellers cooker det havnecafeen — de kan ikke nå det
     på 1-3 dage"). De andre forespørgsler har intet varsel: et
     spørgsmål om catering til november er ikke for tidligt. */
  function varselDage() {
    return Number(side.varselDage) || 0;
  }

  function tjekDato() {
    var d = værdi('dato');
    /* ⚠️ EN TOM DATO ER ET JA, IKKE ET NEJ (30/8).

       Her stod "return rydFejl()", og rydFejl() returnerer
       ingenting. send() gør "if (!tjekDato()) return false", så en
       gæst UDEN dato trykkede Send og fik... intet. Ingen
       kvittering, ingen fejl, ingen linje i konsollen — knappen
       så bare ud, som om den ikke virkede.

       Og det ramte netop den gæst, fase 2 blev bygget for:
       "sølvbryllup engang til foråret, hvad koster det?" er den
       forespørgsel, der er mest værd. Dato og antal er frivillige
       med vilje — også i databasen, hvor kolonnen er nullable.

       Fundet af et værn, der fulgte med fra den gamle
       selskabsside, da den blev en vejviser. */
    if (!d) { rydFejl(); return true; }
    if (varselDage() && d < iso(varselDage())) {
      sigFejl('Vi skal bruge mindst ' + varselDage() + ' dage til at planlægge '
        + 'et selskab. Skal det være før, så ring til os — så finder vi ud af det.', 'dato');
      return false;
    }
    if (erOptaget(d)) {
      sigFejl('Den dato er desværre optaget. Vælg en anden — '
        + 'eller ring til os, så finder vi ud af det.');
      return false;
    }
    rydFejl();
    return true;
  }

  // ----------------------------------------------------------
  //  LEDIGHEDSKALENDEREN  (29/8)
  //  ----------------------------------------------------------
  //  Kundens ord: "en kalender som admin styrer men kunderne kan
  //  se ift hvis der allerede er booket eller reserveret den
  //  dag." Nettet viser optagne_dage — KUN datoer, aldrig navne —
  //  og admin styrer den derved, at en dag først optages, når
  //  personalet har sagt ja OG låst den (eller en udlejning står
  //  bekræftet). En ny forespørgsel spærrer ingenting: ellers
  //  kunne én person med et telefonnummer lukke hele efteråret.
  //
  //  En optaget dag STÅR i nettet, streget — en dag, der mangler,
  //  ligner en fejl i kalenderen. Klik på en ledig dag sætter
  //  datofeltet; klik på en optaget gør ingenting, og databasens
  //  værn dømmer stadig ved afsendelsen.
  //
  //  På selskabssiden skjuler nettet sig, når "ud af huset" er
  //  valgt: dér optages ingen dage, og en kalender, hvor alt er
  //  ledigt, ville bare fylde. Samme regel som datospærren
  //  (side.optagerDagen).
  // ----------------------------------------------------------
  var KAL_MDR = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];
  var kalAar = null;
  var kalMd = null;    // 0-11

  function kalStart() {
    var rod = document.getElementById('ledigkal');
    if (!rod) return;

    /* ⚠️ NETTET BEGYNDER DÉR, HVOR DER FAKTISK ER EN DAG AT VÆLGE
       (30/8). Kundens ord: "kalender tingen er ik klog nok — hvis
       måneden er ved at være færdig, ja så skal den jo nok ik
       være der, og også ift hvis man skal bestille in advance."

       MÅLT på hans egen skærm den 30. august: selskabssiden har
       fire dages varsel, så hver eneste dag i august var
       gennemstreget. Gæsten mødte en kalender, hvor ingenting
       kunne trykkes — det ligner en side, der er gået i stykker,
       ikke en måned, der er brugt op.

       Nettet åbner på den første måned, der HAR en dag, gæsten må
       vælge. Man kan stadig bladre tilbage; man lander bare ikke
       på en blind måned. */
    var iDag = Butik.nu().dato;
    if (kalAar === null) {
      var foerste = iso(varselDage());
      kalAar = Number(foerste.slice(0, 4));
      kalMd = Number(foerste.slice(5, 7)) - 1;

      /* Er der ingen dage tilbage i den måned — den 30. med fire
         dages varsel — så videre til den næste. Højst tolv
         skridt: en side, der ikke kan bookes i et år, er en
         indstilling, ingen har sat, og ikke en løkke. */
      for (var skridt = 0; skridt < 12; skridt++) {
        var sidsteIMd = new Date(Date.UTC(kalAar, kalMd + 1, 0)).getUTCDate();
        var sidsteDag = kalAar + '-' + ('0' + (kalMd + 1)).slice(-2)
          + '-' + ('0' + sidsteIMd).slice(-2);
        if (sidsteDag >= foerste) break;
        kalMd++;
        if (kalMd > 11) { kalMd = 0; kalAar++; }
      }
    }

    var forrige = document.getElementById('lk-forrige');
    var naeste = document.getElementById('lk-naeste');
    if (forrige && !forrige.getAttribute('data-klar')) {
      forrige.setAttribute('data-klar', '1');
      forrige.addEventListener('click', function () { kalFlyt(-1); });
      naeste.addEventListener('click', function () { kalFlyt(1); });
      /* ⚠️ EN OVERSKRIFT, DER STÅR TO GANGE, ER STØJ (30/8). MÅLT på
     kundens skud: panelets h3 sagde "Hvad handler det om?", og
     feltets label sagde det samme 40 px under. Etiketten er
     feltets — den skal blive, for skærmlæsere og for et felt, der
     flytter sig — men den skjules, når den siger præcis det
     samme som overskriften lige over.

     ⚠️ SAMMENLIGNINGEN ER TEKSTEN, IKKE EN LISTE OVER SIDER. En
     liste ville skride, den dag en overskrift blev rettet. */
  (function dobbeltOverskrift() {
    alle('.panel > h3', document).forEach(function (h) {
      var naeste = h.nextElementSibling;
      if (!naeste || !naeste.classList.contains('field')) return;
      var l = naeste.querySelector('label');
      if (!l) return;
      var a = h.textContent.trim().toLowerCase();
      var b = l.textContent.trim().toLowerCase();
      if (a && a === b) l.classList.add('samme-som-hoved');
    });
  }());

  var datoFelt = felt('dato');
      if (datoFelt) datoFelt.addEventListener('change', kalTegn);
      /* Selskabssidens hos-jer/ud-af-huset-knapper: nettet skal
         følge med valget. Designets segmenter flytter ikke .on,
         så der lyttes på klikket og tegnes efter (mikro-pause,
         til designets egen kode har vist/skjult felterne). */
      if (side.seg) {
        Array.prototype.forEach.call(
          document.querySelectorAll(side.seg.vælger + ' button'),
          function (knap) {
            knap.addEventListener('click', function () {
              setTimeout(kalTegn, 60);
            });
          });
      }
    }
    kalTegn();
  }

  function kalFlyt(retning) {
    kalMd += retning;
    if (kalMd < 0) { kalMd = 11; kalAar--; }
    if (kalMd > 11) { kalMd = 0; kalAar++; }
    kalTegn();
  }

  function kalTegn() {
    var rod = document.getElementById('ledigkal');
    var net = document.getElementById('lk-net');
    var titel = document.getElementById('lk-titel');
    if (!rod || !net || !titel) return;

    /* ⚠️ NETTET ER DATOVÆLGEREN NU, IKKE KUN LEDIGHEDEN (30/8).

       Det stod før: "optager valget ingen dage, er nettet støj",
       og så skjulte det sig på catering, frokost og selskab ud af
       huset. Det var rigtigt, dengang nettet KUN kunne fortælle,
       hvilke dage der var taget.

       Kundens ord om catering: "valg af datoen er forældet
       udseende og navigations ting fix". Tilbage stod nemlig
       browserens egen <input type=date> — på en telefon et hjul
       fra et andet årti, hvor man hverken kan se ugedagene eller
       hvilke dage der er for tidlige. Nettet er indgangen alle
       fire steder nu, og det er ikke fyld: det ER feltet.

       Det, der stadig følger optagerDagen, er de to ting, der
       handler om at holde festen HOS OS — markeringen af optagne
       dage og stedvalget. Spørger vi om lokalevalg til en fest ud
       af huset, giver vi et løfte om at holde den for dem. */
    var hosOs = side.optagerDagen(detaljer());
    var sted = document.getElementById('stedfelt');
    if (sted) sted.hidden = !hosOs;
    /* Forklaringen "Ledig / Optaget" hører til markeringen. Står
       den på en side, hvor ingen dag kan være optaget, lover den
       en oplysning, nettet ikke giver. */
    var tegn = rod.querySelector('.lk-tegn');
    if (tegn) tegn.hidden = !hosOs;
    rod.hidden = false;

    var iDag = Butik.nu().dato;
    var iAar = Number(iDag.slice(0, 4));
    var iMd = Number(iDag.slice(5, 7)) - 1;

    /* Ikke bagud for indeværende måned, og højst halvandet år
       frem — længere ude er svaret alligevel et telefonopkald. */
    if (kalAar * 12 + kalMd < iAar * 12 + iMd) { kalAar = iAar; kalMd = iMd; }
    var frem = (kalAar * 12 + kalMd) - (iAar * 12 + iMd);
    var forrige = document.getElementById('lk-forrige');
    var naeste = document.getElementById('lk-naeste');
    if (forrige) forrige.disabled = frem <= 0;
    if (naeste) naeste.disabled = frem >= 18;

    titel.textContent = KAL_MDR[kalMd] + ' ' + kalAar;

    var valgt = værdi('dato');
    var dage = new Date(Date.UTC(kalAar, kalMd + 1, 0)).getUTCDate();
    var foerste = (new Date(Date.UTC(kalAar, kalMd, 1)).getUTCDay() + 6) % 7;

    net.textContent = '';
    for (var b = 0; b < foerste; b++) {
      net.appendChild(document.createElement('span')).className = 'lk-tom';
    }
    for (var d = 1; d <= dage; d++) {
      var dato = kalAar + '-' + String(kalMd + 1).padStart(2, '0')
        + '-' + String(d).padStart(2, '0');
      var celle = document.createElement('button');
      celle.type = 'button';
      celle.className = 'lk-dag';
      celle.setAttribute('data-dato', dato);
      celle.textContent = d;

      /* ⚠️ KUN NÅR DAGEN KAN VÆRE OPTAGET. Catering og frokost
         kører maden UD — havnen står fri, og en dag, der er
         streget her, ville sige nej til en bestilling, databasen
         gerne tager imod. Samme skel som datospærren i
         tjekDato(): side.optagerDagen afgør det ét sted. */
      var taget = hosOs && optagne.some(function (o) { return o.dato === dato; });
      if (dato < iDag || dato < iso(varselDage())) {
        celle.className += ' fortid';
        celle.disabled = true;
      } else if (taget) {
        celle.className += ' taget';
        celle.disabled = true;
        celle.setAttribute('aria-label', d + '. ' + KAL_MDR[kalMd] + ' — optaget');
      } else {
        celle.addEventListener('click', kalVaelg);
      }
      if (dato === valgt) celle.className += ' valgt';
      net.appendChild(celle);
    }
  }

  function kalVaelg(h) {
    var dato = h.currentTarget.getAttribute('data-dato');
    var datoFelt = felt('dato');
    if (!datoFelt) return;
    datoFelt.value = dato;
    /* Samme vej som et håndskrevet valg: change-lytterne (tjekDato
       og nettets egen optegning) skal se det. */
    datoFelt.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ----------------------------------------------------------
  //  AFSENDELSEN
  // ----------------------------------------------------------
  function send() {
    var navn = værdi('navn');
    var tlf = værdi('tlf');
    var mail = værdi('mail');

    if (navn.length < 2) return sigFejl('Skriv dit navn.', 'navn');

    /* ⚠️ TO SLAGS KRAV, OG DE ER IKKE DET SAMME.

       De fleste sider skal have et NUMMER: personalet ringer, og
       et spørgsmål uden en vej tilbage er et menneske, der aldrig
       hører fra os.

       Baglokalet (29/8) tager mail ELLER nummer — kundens ord:
       "lade email eller nummer være som en option ... aftalen
       afstemt via enten mail eller nummer". Løftet er det samme:
       svar inden for et døgn. Vejen vælger gæsten. */
    if (side.krav && side.krav.mailEllerTlf) {
      if (tlf.replace(/[^0-9]/g, '').length < 8 && !mail) {
        return sigFejl('Skriv et telefonnummer eller en e-mail, '
          + 'så vi kan vende tilbage til jer.', 'tlf');
      }
      if (tlf && tlf.replace(/[^0-9]/g, '').length < 8) {
        return sigFejl('Telefonnummeret ser for kort ud — eller lad det stå tomt '
          + 'og skriv en e-mail i stedet.', 'tlf');
      }
    } else if (tlf.replace(/[^0-9]/g, '').length < 8) {
      return sigFejl('Skriv et telefonnummer, vi kan få fat i dig på.', 'tlf');
    }
    if (side.krav && side.krav.mail && !mail) {
      /* ⚠️ EN PÅKRÆVET MAIL ER ET LØFTE, IKKE ET FELT. Siden
         siger, vi vender tilbage inden for et døgn — og en gæst,
         der ikke tager telefonen, skal kunne nås på skrift. */
      return sigFejl('Skriv en e-mail, så vi kan sende jer et tilbud.', 'mail');
    }
    if (mail && !/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(mail)) {
      return sigFejl('E-mailen ser ikke rigtig ud.', 'mail');
    }

    /* ⚠️ ET UMULIGT ANTAL SKAL SIGES HER, IKKE AF DATABASEN (30/8).

       forespoergsel_antal_ok holder 1-500, og uden den her linje
       fik gæsten databasens egen afvisning — en sætning, hun
       hverken forstår eller kan gøre noget ved. Den gamle
       selskabsside havde tjekket (#fejl-antal); det fulgte ikke
       med, da siderne blev designets, og hullet stod åbent, til
       en prøve fandt det. Tallet er databasens, ikke et nyt: to
       udgaver af "hvor mange kan der være" ville skride fra
       hinanden. */
    var antal = værdi('antal');
    if (antal !== '' && antal !== null && antal !== undefined) {
      var n = Number(antal);
      if (!isFinite(n) || n < 1 || n > 500) {
        return sigFejl('Skriv et antal mellem 1 og 500 — eller lad feltet '
          + 'stå tomt, hvis I ikke ved det endnu.', 'antal');
      }
    }

    if (!tjekDato()) return false;

    /* ⚠️ OG TIDSRUMMET SKAL VÆRE ET TIDSRUM. Da det var fire
       chips, kunne gæsten ikke vælge forkert; med to felter kan
       hun. Beskeden siger, hvad hun skal gøre — ikke bare at
       noget er galt. */
    if (side.tidsrum) {
      var spaend = tidsSpaend();
      if (!spaend) {
        return sigFejl('Skriv, hvornår I skal bruge lokalet — fra og til.');
      }
      if (spaend.minutter < 30) {
        return sigFejl('Tidsrummet skal være mindst en halv time. '
          + 'Ret "Til", så det ligger efter "Fra".');
      }
    }

    var knap = find('button.g.solid.blk');
    if (knap) knap.disabled = true;

    return Butik.forespoerg({
      type: side.type,
      navn: navn,
      telefon: tlf,
      email: mail,
      dato: værdi('dato') || null,
      antal_personer: værdi('antal') || null,
      besked: værdi('besked'),
      detaljer: detaljer(),
    }).then(function (raekke) {
      visTak(raekke);
    }).catch(function (fejl) {
      if (knap) knap.disabled = false;
      sigFejl(fejl && fejl.message ? fejl.message
        : 'Forespørgslen kunne ikke sendes. Ring til os i stedet.');
    });
  }

  /* Adressen til den slags, systemet ikke gør: et tilbud, en
     ændring, et spørgsmål der skal skrives ned.

     ⚠️ DEN LÆSES AF LINKET I BUNDEN AF SIDEN og ikke af
     indstillingerne. Adressen står ÉT sted — i sidens egen HTML —
     og js/skal/kontakt.js har allerede byttet den ud, hvis
     personalet har skrevet en anden i admin. Læste vi
     indstillingen her også, ville der være to steder, der kunne
     komme til at sige hver sit, og reserven skulle stå i koden.

     Er linket taget af siden (adressen er nedlagt), er der ingen
     adresse — og så står linjen der ikke. En mailto til ingenting
     er en blindgyde. */
  function postadresse() {
    var a = document.querySelector('a[data-post="selskab"]');
    var href = a ? String(a.getAttribute('href') || '') : '';
    if (href.indexOf('mailto:') !== 0) return '';
    /* ⚠️ ET EMNE SKAL SKÆRES AF. Knapperne på siderne bærer et
       ?subject= i forvejen ("Selskab hos Mosede Havnecafe"), og
       kvitteringen sætter SIT eget på med referencen. Uden det
       her blev adressen til
         mailto:…?subject=Selskab…?subject=Forespørgsel FO…
       og mailprogrammet fik et emne, der hed hele den anden
       halvdel af adressen. Prøven fældede det. */
    return href.slice(7).split('?')[0];
  }

  /* ⚠️ FORNAVNET MED STORT FORBOGSTAV (4/9) — se noten i
     js/bord.js. Gæsten skriver "mikkel" på sin telefon. */
  function fornavn(navn) {
    var f = String(navn || '').trim().split(/\s+/)[0] || '';
    return f ? f.charAt(0).toUpperCase() + f.slice(1) : 'for beskeden';
  }

  function visTak(f) {
    /* ⚠️ KVITTERINGEN ER HUSETS FÆLLES NU  (4/9). Kundens ord:
       *"få den slags animation og kvittering alle steder man
       bestiller."* Formen bor i js/skal/kvittering.js; her står
       kun det, en FORESPØRGSEL ved. */
    var K = window.MosedeKvittering;

    /* Der loves ikke et tidspunkt. Vi ved ikke, hvornår
       personalet har hænder fri, og et "svar inden for en time"
       er et løfte, siden ikke kan holde. */
    var besked = 'Vi har fået jeres forespørgsel og vender tilbage '
      + 'med et svar. Haster det, så ring til os.';

    /* ⚠️ EN VEJ TILBAGE, DER IKKE ER ET OPKALD.

       Et tilbud på et selskab er tal, datoer og forbehold, og
       halvdelen af dem, der spørger, sidder på et arbejde, hvor
       de ikke kan ringe. Referencen står i kodeboksen, så de kan
       skrive den med — og så ved personalet, hvilken sag mailen
       hører til.

       Adressen kommer fra databasen, hvis nogen har rettet den i
       admin; ellers fra oplysningerne. Er der ingen, står linjen
       der ikke: en mailto til ingenting er en blindgyde. */
    var post = postadresse();
    var skriv = null;
    if (post) {
      skriv = lav('p', 'hint');
      skriv.appendChild(document.createTextNode('Vil I hellere skrive? '));
      var a2 = lav('a', null, post);
      a2.href = 'mailto:' + post + '?subject='
        + encodeURIComponent('Forespørgsel ' + f.reference);
      skriv.appendChild(a2);
      skriv.appendChild(document.createTextNode(' — tag referencen med.'));
    }

    if (!K) {
      tøm(panel);
      panel.appendChild(lav('h3', null, 'Tak, ' + fornavn(f.navn) + '.'));
      panel.appendChild(lav('p', 'hint', besked));
      if (skriv) panel.appendChild(skriv);
      panel.appendChild(lav('div', 'note', 'Reference: ' + f.reference));
      return;
    }

    /* ⚠️ HER ER REFERENCEN DET STORE, og det er ikke en anden
       regel — det er den samme. En forespørgsel har INTET
       nummer: der er ikke bestilt noget, der skal laves. Så er
       referencen dét, gæsten skal sige og skrive, og kodeboksen
       viser den som det store af sig selv (kvit-nr-tom). Der er
       altid ÉN ting at sige, aldrig to og aldrig nul. */
    K.byg(panel, {
      titel: 'Tak, ' + fornavn(f.navn) + '.',
      besked: besked,
      kode: { reference: f.reference, refNavn: 'Jeres reference' },
      ekstra: skriv ? [skriv] : [],
    });
  }

  // ----------------------------------------------------------
  //  START
  // ----------------------------------------------------------
  /* ⚠️ VARSLET STÅR ÉT STED, OG SIDEN LÅNER DET (30/8).

     Faktakortet på catering sagde "mindst en uge før ved mere end
     30 kuverter", mens formularen holdt to dage. To tal om det
     samme, og gæsten møder dem i den rækkefølge: hun læser ugen,
     regner med den, og finder så ud af, at hun kunne have
     bestilt i forgårs. Det er præcis mønstret fra CLAUDE.md om,
     at to udgaver af samme regel skrider fra hinanden.

     Nu skriver varselDage() teksten, og designets egen tekst er
     reserven — så et ændret varsel slår igennem begge steder. */
  (function skrivVarsel() {
    var n = varselDage();
    if (!n) return;
    var ord = n === 1 ? 'mindst én dag'
      : (n === 2 ? 'mindst to dage'
        : (n === 3 ? 'mindst tre dage' : 'mindst ' + n + ' dage'));
    alle('[data-varsel]', document).forEach(function (el) {
      el.textContent = ord;
    });
  }());

  var datoFelt = felt('dato');
  if (datoFelt) {
    datoFelt.value = '';
    datoFelt.min = iso(varselDage());
    // Samme grænse som databasens forespoergsel_dato_ok: to år.
    datoFelt.max = iso(730);
    datoFelt.addEventListener('change', tjekDato);
  }

  var fine = fineFelt();
  oprindeligFine = fine ? fine.textContent : '';

  var knap = find('button.g.solid.blk');
  if (knap) {
    knap.type = 'button';
    knap.addEventListener('click', send);
  }

  ['navn', 'tlf', 'mail'].forEach(function (n) {
    var el = felt(n);
    if (el) el.addEventListener('input', rydFejl);
  });

  /* Skifter gæsten til "ud af huset", er dagen ikke længere
     optaget for hende — og omvendt. Segmentet skal derfor kunne
     tage fejlen væk igen. */
  var seg = find(side.seg.vælger);
  if (seg) seg.addEventListener('click', function () { setTimeout(tjekDato, 0); });

  /* ⚠️ SVARLINJEN SKAL FØLGE ALT, DER KAN ÆNDRE DEN  (4/9): de to
     klokkeslæt, antallet af gæster OG med/uden mad. Hang den kun
     på tiden, ville prisen stå og lyve, i det sekund gæsten
     rettede antallet fra 12 til 30 og lejen dermed blev gratis.

     Segmentet er designets eget og flytter ikke .on — derfor
     setTimeout(0), som tjekDato lige ovenfor: vi aflæser, EFTER
     havnegrillen.js har foldet madfeltet. */
  if (side.tidsrum) {
    [side.tidsrum.fra, side.tidsrum.til].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', visTidSvar);
        el.addEventListener('change', visTidSvar);
      }
    });
    var antalFelt = felt('antal');
    if (antalFelt) antalFelt.addEventListener('input', visTidSvar);
    if (seg) seg.addEventListener('click', function () {
      setTimeout(visTidSvar, 0);
    });
    visTidSvar();
  }

  /* ============================================================
     BAGLOKALETS VILKÅR — EJERENS TAL, IKKE DESIGNETS  (28/8)
     ------------------------------------------------------------
     Siden blev leveret med designets pladsholdere: 40 siddende,
     60 stående, 1.200 kr. for en aften, 2.000 for dagen, gratis
     fra 20 kuverter. De har stået i luften siden 23/8, fordi
     Mikkel bad om det — men indtil nu kunne de kun rettes ved at
     redigere HTML, og det kan en cafe ikke.

     Nu er hvert tal pakket i sit eget <span data-vilk>, og
     personalet skriver deres egne i admin → Baglokalet → Vilkår.

     ⚠️ VI OVERSKRIVER KUN, NÅR DATABASEN HAR NOGET AT SIGE. Er
     feltet tomt i admin, bliver designets tal stående. En kobling,
     der skriver "0 siddende" hen over designet, er værre end
     ingen kobling — og et tal, VI fandt på som reserve, ville se
     ud som noget forretningen havde sagt.

     ⚠️ OG TALLET BYTTES DÉR, HVOR DET STÅR. Byggede vi hele
     sætningen om i JavaScript, skulle designets egne tal stå her
     som reserve — og så var der to steder, den samme pladsholder
     skulle rettes. Reserven er den tekst, der allerede står i
     filen.
     ============================================================ */
  function visVilkaar(d) {
    if (side.type !== 'baglokale') return;
    var i = (d && d.indstillinger) || {};

    function tal(n) {
      var x = Number(n);
      if (!isFinite(x) || x <= 0) return null;
      // Tusindtalsskilletegn som i designet: 1.200, ikke 1200.
      return x.toLocaleString('da-DK');
    }

    ['pladser', 'staaende', 'pris_aften', 'pris_dag', 'gratis_fra']
      .forEach(function (navn) {
        var v = tal(i['lokale_' + navn]);
        if (v === null) return;
        alle('[data-vilk="' + navn + '"]', document).forEach(function (el) {
          el.textContent = v;
        });
      });

    /* Depositum og "hvad er med i prisen" har ingen plads i
       designet, så de står i et tomt felt, der er skjult, til
       ejeren skriver noget. At tilføje en linje, der altid er
       der, ville være at lave om på skallen. */
    var ekstra = document.querySelector('[data-vilk-ekstra]');
    if (ekstra) {
      var dele = [];
      var dep = tal(i.lokale_depositum);
      if (dep) dele.push('Depositum ' + dep + ' kr.');
      var tekst = String(i.lokale_vilkaar || '').trim();
      if (tekst) dele.push(tekst);
      if (dele.length) {
        ekstra.textContent = ' ' + dele.join(' · ')
          + (/[.!?]$/.test(dele[dele.length - 1]) ? '' : '.');
        ekstra.hidden = false;
      } else {
        ekstra.textContent = '';
        ekstra.hidden = true;
      }
    }
  }

  /* Baglokalets tomme billedplads. Reglen bor i
     js/skal/billedplads.js — forsiden og tapassiden har den samme
     kasse, og tre kopier ville tegne tre forskellige flader.

     ⚠️ OG DEN SKAL OP, OGSÅ NÅR HENTNINGEN FEJLER. Fladen har
     ingen data bag sig; tegnet står i HTML'en. Lod vi den stå i
     .catch, ville en side, hvor databasen er nede, være den side
     med en stiplet grå kasse øverst. */
  function fyldPladser(d) {
    if (!window.MosedeBilledplads) return;
    try {
      window.MosedeBilledplads.fyld((d && d.indstillinger) || {});
    } catch (e) {
      console.warn('Billedpladsen fejlede:', e);
    }
  }

  /* ============================================================
     SMØRREBRØDET ER EJERENS EGET — IKKE FEM ORD I HTML'EN  (31/8)
     ------------------------------------------------------------
     Kundens ord: *"alle smørbrødene sælges som de er ... 1 mad er
     som 1 mad, og de skal allesammen kunne vælges i smørbrød ud af
     huset, normale bestillinger og QR-kode-bestillinger."*

     Designet leverede fem faste chips (Håndmadder, Hele skiver,
     Platte, Luksus-stykker, Tilbehør). Ejeren har over tredive
     slags i admin, og han skifter dem — så de fem var en liste,
     der ville skride fra kortet med det samme.

     ⚠️ MEN VI OVERSKRIVER KUN, NÅR DATABASEN HAR NOGET AT SIGE.
     Er der intet smørrebrød på kortet (eller er hentningen
     fejlet), bliver designets egne chips stående. En side, der
     tømmer sin egen vælger, fordi et kald ikke kom igennem, er
     værre end en side med fem generelle ord.

     ⚠️ UDSOLGTE ER IKKE MED. Det er hele ejerens greb: han
     styrer udvalget med fluebenet Udsolgt i admin, og en
     forespørgsel på noget, køkkenet ikke har, er et tilbud, der
     skal laves om.

     ⚠️ OG PRISERNE STÅR IKKE PÅ CHIPPEN. Det her er en
     forespørgsel, ikke en kurv — der lægges intet sammen, og et
     beløb på en chip ville se ud som et tilbud, ingen har givet. */
  function fyldSmoerrebroed(d) {
    if (side.type !== 'smoerrebroed') return;
    var gruppe = document.getElementById('smad-valg');
    if (!gruppe || !Butik.smoerrebroed) return;

    var sm = Butik.smoerrebroed(d) || {};
    var liste = (sm.bestilbare || []).concat(sm.spoerg || []);
    if (!liste.length) return;             // designets egne bliver stående

    /* Samme navn kan stå to gange, hvis ejeren har oprettet det i
       to kategorier. Én chip pr. navn — to ens ville se ud som en
       fejl i vælgeren. */
    var set = {}, navne = [];
    liste.forEach(function (v) {
      var n = String(v.navn || '').trim();
      if (!n || set[n]) return;
      set[n] = true; navne.push(n);
    });
    if (!navne.length) return;

    while (gruppe.firstChild) gruppe.removeChild(gruppe.firstChild);
    navne.forEach(function (n) {
      var k = document.createElement('button');
      k.type = 'button';
      k.textContent = n;
      gruppe.appendChild(k);
    });
    /* ⚠️ DESIGNET EJER MARKERINGEN — VI LÆSER DEN.
       havnegrillen.js binder sin lytter på [data-chips] ved
       indlæsning, og den hænger på GRUPPEN, ikke på knapperne.
       Nye knapper i den samme gruppe arver derfor lytteren, og
       vi må IKKE slå .on til selv: to lyttere ophævede hinanden
       sidst (fyldvælgeren 30/8), så tælleren sagde "2 valgt",
       mens begge piller så uvalgte ud. */
  }

  /* ⚠️ LEVERINGSOMRÅDET FULGTE IKKE MED, DA SIDEN BLEV EN
     FORESPØRGSEL  (31/8), og fire prøver holdt op med at måle
     noget uden at fejle. Reglen er ejerens egne felter — området
     og prisen fra admin, aldrig designets opdigtede "150 kr.
     inden for 10 km" — og den bor i Butik.leveringsTekst, som
     forsidens bestilling også spørger.

     Den gælder KUN smørrebrødssiden: catering og frokost har
     deres egne leveringssætninger med deres egne vilkår, og
     baglokalet leverer ingenting. */
  function visLevering(d) {
    if (side.type !== 'smoerrebroed' || !Butik.leveringsTekst) return;
    var t = Butik.leveringsTekst((d || {}).indstillinger, true);
    var fakta = document.getElementById('lev-fakta');
    var hint = document.getElementById('lev-hint');
    if (fakta) {
      while (fakta.firstChild) fakta.removeChild(fakta.firstChild);
      var b = document.createElement('b');
      b.textContent = t.faktaFed;
      fakta.appendChild(b);
      fakta.appendChild(document.createTextNode(t.faktaResten));
    }
    if (hint) hint.textContent = t.hint;
  }

  Butik.hent().then(function (d) {
    data = d;
    visVilkaar(d);
    /* ⚠️ SVARLINJEN SKAL TEGNES OM EFTER VILKÅRENE  (4/9).
       visTidSvar() læser tallene af data-vilk-spanene, og de er
       først ejerens, når visVilkaar har fyldt dem. Uden den her
       linje stod prisen på designets pladsholder, indtil gæsten
       rørte et felt — og hun ville se ét tal og få et andet. */
    visTidSvar();
    fyldSmoerrebroed(d);
    visLevering(d);
    fyldPladser(d);
    return Butik.hentOptagneDage();
  }).then(function (liste) {
    optagne = liste || [];
    tjekDato();
    kalStart();
  }).catch(function (fejl) {
    console.warn('Forespørgselssidens kobling fejlede, skallen står:', fejl);
    fyldPladser(null);
  });
}());
