/* Fanen Overblik: vagtskærmen. Se js/admin/kerne.js for de to
   principper, der gælder i alle admin-filerne.

   ============================================================
   ⚠️ LUGEN OG BORDENE ER TO FORSKELLIGE STRØMME
   ============================================================
   Kundens ord (26/8): "det er rodet at både qr bestillinger er
   der og online bestillinger — du skal huske online bestillinger
   er bare bestillinger til lugen dernede, hvor at selve
   qr bestillinger skal i en separat ting."

   Han har ret, og det er ikke smag. De to har forskelligt
   ARBEJDE bag sig:

   - En bestilling fra hjemmesiden har en HENTETID. Den skal være
     klar, når gæsten står ved lugen, og den kan ligge timer ude i
     fremtiden. Arbejdet er at ramme et klokkeslæt.
   - En bestilling fra en QR-kode på bord 7 har ingen hentetid.
     Den skal laves NU og bæres ud til et bord. Arbejdet er at
     komme af sted.

   Stod de i den samme liste sorteret efter tid, ville bord 7 —
   hentetid = nu — altid ligge øverst og skubbe den frokost, der
   skal være klar kl. 12.30, ned. Og omvendt ville et bord, der
   har ventet, forsvinde blandt ti afhentninger.

   Bordene har derfor deres egen skærm (fanen Køkken-kø), og
   Overblik LISTER dem ikke. Den siger, at de findes, og hvor
   mange — og fører derhen. En kø, man skal kigge to steder efter,
   er en kø, der bliver glemt det ene sted.

   ============================================================
   HVORFOR TIDSRÆKKEFØLGE
   ============================================================
   Fanen var engang bygget om "hvad er tikket ind, mens jeg ikke
   kiggede", sorteret efter hvornår bestillingen KOM IND — fordi
   der skulle ringes og bekræftes. Den begrundelse faldt bort
   23/8: auto_bekraeft er slået til, bestilt er bestilt.

   MÅLT PÅ EN TRAVL DAG: klokken 13.00, fem bestillinger. Sara,
   der henter kl. 18.00, stod som nummer to — fordi hun havde
   bestilt ni minutter før. Køkkenet skulle læse fem kort igennem
   for at finde ud af, hvad der skulle laves først.

   Spørgsmålet under en vagt er: HVAD SKAL UD AF DØREN, OG HVORNÅR.

   Fanen henter ingenting selv. Bestillinger og forespørgsler er
   allerede hentet af deres egne faner, og de melder deres lister
   ind i Admin.lister. Et kald mere for de samme rækker ville være
   et kald for meget — og to kilder, der kan nå at være uenige. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  /* Tre timer. Kortere, og en medarbejder, der har haft travlt ved
     lugen i en frokost, går glip af det, der kom imens. Længere, og
     listen bliver til endnu en liste over alt — og så er der ikke
     noget "lige" tilbage i "lige modtaget". */
  var VINDUE_MS = 3 * 60 * 60 * 1000;

  /* To timer frem. Kortere, og listen tømmer sig midt i en
     frokost. Længere, og "nu" holder op med at betyde noget:
     hele dagen står i den ene boks igen. */
  var SNART_MIN = 120;

  var FAERDIG = { afhentet: true, serveret: true, afvist: true, udeblevet: true };

  function minutterSiden(iso) {
    var t = Date.parse(iso || '');
    if (!isFinite(t)) return null;
    return Math.floor((Date.now() - t) / 60000);
  }

  function hvornårTekst(min) {
    if (min < 1) return 'LIGE NU';
    if (min < 60) return 'FOR ' + min + ' MINUTTER SIDEN';
    var timer = Math.floor(min / 60);
    return 'FOR ' + timer + (timer === 1 ? ' TIME SIDEN' : ' TIMER SIDEN');
  }

  function tilMinutter(tid) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(tid || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }

  function klokken(min) {
    return Math.floor(min / 60) + '.' + String(min % 60).padStart(2, '0');
  }

  /* ⚠️ ÉN KENDING PÅ "DEN HER HØRER TIL BORDENE", og alle bruger
     den. Skrives testen b.bord_nummer ud ti steder, er der ti
     steder at glemme den den dag, en bordbestilling får en ny
     form — og en glemt ét sted betyder, at bord 7 dukker op i
     lugens liste igen. */
  function erBord(b) { return !!b.bord_nummer; }

  function iDagsBestillinger() {
    var dato = Butik.nu().dato;
    return (Admin.lister.bestillinger || []).filter(function (b) {
      return !b.slettet && b.hent_dato === dato;
    });
  }

  function linjeTekst(b) {
    return (b.linjer || []).map(function (l) {
      return l.antal + ' × ' + l.navn;
    }).join(' · ') || (b.antal || 0) + ' stk.';
  }

  // ----------------------------------------------------------
  //  DAGENS FORLØB — kun det, der skal ud ad LUGEN
  //  --------------------------------------------------------
  //  Bordene er ikke med (se noten øverst). Bordbookinger ER:
  //  køkkenet skal vide, at der kommer seks personer kl. 18, på
  //  samme skærm som maden — det er en aftale med en tid, præcis
  //  som en afhentning.
  //
  //  DET FÆRDIGE ER IKKE MED I FORLØBET. En afhentet bestilling
  //  er ikke arbejde længere. Den er ikke VÆK — den ligger i
  //  "Færdige" nedenfor, så en fejl kan gøres om.
  // ----------------------------------------------------------
  function dagensArbejde() {
    var ud = [];

    iDagsBestillinger().forEach(function (b) {
      if (FAERDIG[b.status] || erBord(b)) return;
      ud.push({
        min: tilMinutter(b.hent_tid),
        tid: String(b.hent_tid || '').slice(0, 5).replace(':', '.'),
        navn: b.navn,
        hvad: linjeTekst(b),
        /* Leveringen skal ses her OGSÅ. En bestilling, der skal
           køres ud, har en afgang og ikke et afhentningstidspunkt
           — ser køkkenet den som en almindelig afhentning, står
           maden klar ved lugen, mens gæsten venter derhjemme.

           TAPASFADET SLÅR RESTEN. Et fad til tolv er dagens
           største stykke arbejde, og det skal ses på vagtskærmen,
           før nogen begynder på en pølse. */
        maerke: Admin.erTapas(b) ? '🧀 Tapasfad'
          : b.hvordan === 'levering' ? '🚗 Leveres'
            : b.hvordan === 'spis_her' ? '🍽️ Spis her' : '',
        ny: b.status === 'ny',
        // Selve bestillingen med, så knappen på rækken kan flytte
        // den videre uden et faneskift.
        b: b,
        fane: 'p-bestillinger', faneNavn: 'Bestillinger',
      });
    });

    var dato = Butik.nu().dato;
    (Admin.lister.borde || []).forEach(function (b) {
      if (b.slettet || b.status === 'afvist' || b.status === 'udeblevet') return;
      if (b.dato !== dato) return;
      ud.push({
        min: tilMinutter(b.tid),
        tid: String(b.tid || '').slice(0, 5).replace(':', '.'),
        navn: b.navn,
        hvad: (b.antal_personer || '?') + ' personer',
        maerke: '📅 Booket bord',
        ny: b.status === 'ny',
        fane: 'p-borde', faneNavn: 'Borde',
      });
    });

    /* Uden et klokkeslæt kan rækken ikke placeres i en tidslinje.
       Den skal ikke forsvinde — den skal stå ØVERST, så nogen
       kigger på den. */
    return ud.sort(function (a, b) {
      if (a.min === null) return -1;
      if (b.min === null) return 1;
      return a.min - b.min;
    });
  }

  function vagtRaekke(r, nu) {
    var overskredet = r.min !== null && r.min < nu.minutter;
    var k = lav('div', 'vagt-raekke' + (overskredet ? ' overskredet' : ''));

    k.appendChild(lav('div', 'vagt-tid', r.tid || '—'));

    var midt = lav('div', 'vagt-midt');
    var linje = lav('div', 'bestil-hvem');
    linje.appendChild(lav('span', 'vare-navn', r.navn));
    if (r.ny) linje.appendChild(lav('span', 'maerke m-ny', 'Ny'));
    if (r.maerke) linje.appendChild(lav('span', 'maerke favorit', r.maerke));
    if (overskredet) linje.appendChild(lav('span', 'maerke m-ny', 'Overskredet'));
    midt.appendChild(linje);
    midt.appendChild(lav('div', 'vare-tekst', r.hvad));
    k.appendChild(midt);

    /* ---- HANDLINGEN PÅ RÆKKEN ----
       Kundens ord (26/8): "på overblik skal man trykke færdig på
       online bestillinger?" Man skulle skifte fane for at flytte
       en bestilling videre — og midt i en frokost, med gæsten
       stående ved lugen, er et faneskift ét skridt for meget.

       ⚠️ TRINNET KOMMER FRA BESTILLINGER-FANEN (Admin.naesteTrin)
       og er ikke skrevet af. To udgaver af "hvad sker der efter
       klar?" ville langsomt sige noget forskelligt, og så havde
       den samme bestilling to forskellige næste trin, alt efter
       hvilken fane man stod på.

       Bookinger har ingen knap: et bord flyttes videre på sin
       egen fane, hvor pladserne og dagens billede står. */
    var trin = r.b && Admin.naesteTrin && Admin.naesteTrin(r.b.status);
    if (trin) {
      var frem = lav('button', 'knap lille', '✓ ' + trin.navn);
      frem.type = 'button';
      frem.addEventListener('click', function () {
        frem.disabled = true;
        /* friskOp og ikke Admin.gem: Admin.gem henter
           indstillinger og menukort — ikke bestillingerne. Se
           noten ved Gendan nedenfor. */
        Butik.skrive.bestillingStatus(r.b.id, trin.status)
          .then(function () { return Admin.friskOp(); })
          .then(function () {
            Admin.kvitter(r.navn + ' er sat til "' + trin.efter + '".');
          })
          .catch(function (e) {
            frem.disabled = false;
            Admin.brøl(e && e.message || String(e));
          });
      });
      k.appendChild(frem);
    }

    /* En knap og ikke et link: der skiftes fane på siden, der
       hoppes ikke til en adresse. Et <a href="#"> ville se ens ud
       og opføre sig forkert med tastaturet. */
    k.appendChild(faneKnap(r.fane, r.faneNavn + ' →'));
    return k;
  }

  function faneKnap(fane, tekst) {
    var knap = lav('button', 'nyt-aabn', tekst);
    knap.type = 'button';
    knap.addEventListener('click', function () {
      Admin.visFane(fane);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return knap;
  }

  function tegnForloeb() {
    var boks = $('overblik-vagt');
    if (!boks) return;
    Admin.tøm(boks);

    var nu = Butik.nu();
    var alle = dagensArbejde();

    /* "Snart" er alt, der ikke er overstået, indtil to timer frem.
       DET OVERSKREDNE BLIVER I DEN ØVERSTE GRUPPE: en gæst, der
       skulle have hentet kl. 13.15, og som ikke har, er ikke
       mindre vigtig kl. 13.20 — hun er mere. */
    var snart = [], senere = [];
    alle.forEach(function (r) {
      if (r.min === null || r.min <= nu.minutter + SNART_MIN) snart.push(r);
      else senere.push(r);
    });

    if (!alle.length) {
      /* Tomt er et SVAR, ikke en tom skærm. Står der ingenting,
         tror man, siden ikke virker — og så begynder nogen at
         genindlæse i stedet for at passe forretningen. */
      boks.appendChild(lav('p', 'plan-tom',
        'Ingen bestillinger eller aftaler endnu i dag.'));
      return;
    }

    if (snart.length) {
      boks.appendChild(lav('div', 'forloeb-hoved',
        'Nu og de næste to timer · kl. ' + klokken(nu.minutter)));
      snart.forEach(function (r) { boks.appendChild(vagtRaekke(r, nu)); });
    }
    if (senere.length) {
      boks.appendChild(lav('div', 'forloeb-hoved', 'Senere i dag'));
      senere.forEach(function (r) { boks.appendChild(vagtRaekke(r, nu)); });
    }
  }

  // ----------------------------------------------------------
  //  PRODUKTION I ALT
  //  --------------------------------------------------------
  //  Hvor meget af hver ret skal der laves i dag — lagt sammen på
  //  tværs af bestillingerne. Uden den skal køkkenet selv lægge
  //  "2 × pasta" og "3 × pasta" og "1 × pasta" sammen i hovedet,
  //  midt i en frokost, hver gang de vil vide, hvor mange der
  //  skal på panden.
  //
  //  ⚠️ HER ER BORDENE MED, og det modsiger ikke adskillelsen
  //  ovenfor. Forløbet handler om HVORNÅR noget skal ud, og der
  //  hører bordene ikke til. Produktionen handler om HVOR MEGET
  //  der skal laves, og der skal ALT tælle med — ellers laver
  //  køkkenet for lidt. Derfor står tallet delt: 🥡 ud af huset
  //  og 🍽️ spist her, så adskillelsen kan ses i tallet.
  //
  //  Det AFVISTE tæller ikke med: det bliver aldrig lavet. Det
  //  afhentede og det udeblevne gør — de ER lavet, og "i alt"
  //  skal blive ved med at være dagens tal, også kl. 21.
  // ----------------------------------------------------------
  function produktion() {
    var kurv = {};
    iDagsBestillinger().forEach(function (b) {
      if (b.status === 'afvist') return;
      var udAfHuset = !erBord(b) && b.hvordan !== 'spis_her';
      (b.linjer || []).forEach(function (l) {
        var navn = String(l.navn || '').trim();
        if (!navn) return;
        var r = kurv[navn] || (kurv[navn] = { navn: navn, ialt: 0, ud: 0, her: 0 });
        var n = Number(l.antal) || 0;
        r.ialt += n;
        if (udAfHuset) r.ud += n; else r.her += n;
      });
    });

    return Object.keys(kurv).map(function (k) { return kurv[k]; })
      .sort(function (a, b) { return b.ialt - a.ialt || a.navn.localeCompare(b.navn, 'da'); });
  }

  function tegnProduktion() {
    var boks = $('overblik-produktion');
    var kort = $('produktion-kort');
    if (!boks || !kort) return;
    Admin.tøm(boks);

    var liste = produktion();
    // Et afsnit uden noget at vise findes ikke.
    kort.classList.toggle('skjult', !liste.length);
    if (!liste.length) return;

    liste.forEach(function (r) {
      var p = lav('div', 'prod-pille');
      p.appendChild(lav('b', 'prod-antal', r.ialt));
      p.appendChild(lav('span', 'prod-navn', r.navn));
      var delt = lav('span', 'prod-delt');
      delt.textContent = '🥡 ' + r.ud + ' · 🍽️ ' + r.her;
      delt.title = r.ud + ' ud af huset, ' + r.her + ' spist her';
      p.appendChild(delt);
      boks.appendChild(p);
    });
  }

  // ----------------------------------------------------------
  //  FRA BORDENE — den separate ting
  //  --------------------------------------------------------
  //  Overblik LISTER dem ikke; køkken-køen gør. Her står kun, at
  //  de findes, hvor mange der venter, og hvor længe den ældste
  //  har ventet — for det er dét tal, der afgør, om nogen skal gå
  //  fra lugen og ud i køkkenet nu.
  // ----------------------------------------------------------
  function tegnBorde() {
    var kort = $('bord-koe-kort');
    var boks = $('overblik-bordkoe');
    if (!kort || !boks) return;
    Admin.tøm(boks);

    var koe = (Admin.lister.bestillinger || []).filter(function (b) {
      return !b.slettet && erBord(b) && !FAERDIG[b.status];
    });

    kort.classList.toggle('skjult', !koe.length);
    if (!koe.length) return;

    var aeldst = 0;
    var borde = {};
    koe.forEach(function (b) {
      var m = minutterSiden(b.oprettet);
      if (m !== null && m > aeldst) aeldst = m;
      borde[b.bord_nummer] = true;
    });
    var antalBorde = Object.keys(borde).length;

    var linje = lav('div', 'bordkoe-linje');
    linje.appendChild(lav('b', 'bordkoe-tal', koe.length));
    linje.appendChild(lav('span', 'bordkoe-tekst',
      (koe.length === 1 ? 'bestilling' : 'bestillinger') + ' fra '
      + antalBorde + (antalBorde === 1 ? ' bord' : ' borde')
      + ' venter i køkkenet · ældste ' + aeldst + ' min.'));
    boks.appendChild(linje);
    boks.appendChild(faneKnap('p-koekken', 'Åbn køkken-køen →'));
  }

  // ----------------------------------------------------------
  //  FÆRDIGE
  //  --------------------------------------------------------
  //  De faldt HELT ud af skærmen før. Det var rigtigt for
  //  arbejdslisten og forkert for dagen: trykker nogen "Afhentet"
  //  på det forkerte kort i en frokost, var bestillingen væk, og
  //  gæsten stod ved lugen uden noget at hente.
  //
  //  Foldet sammen, så de ikke fylder — og med en vej tilbage.
  // ----------------------------------------------------------
  function tegnFaerdige() {
    var kort = $('faerdige-kort');
    var boks = $('overblik-faerdige');
    var titel = $('faerdige-titel');
    if (!kort || !boks || !titel) return;
    Admin.tøm(boks);

    var liste = iDagsBestillinger().filter(function (b) {
      return FAERDIG[b.status] && !erBord(b);
    }).sort(function (a, b) {
      return String(b.hent_tid || '').localeCompare(String(a.hent_tid || ''));
    });

    kort.classList.toggle('skjult', !liste.length);
    titel.textContent = '✓ Færdige (' + liste.length + ')';
    if (!liste.length) return;

    var ORD = {
      afhentet: 'Afhentet', serveret: 'Serveret',
      afvist: 'Afvist', udeblevet: 'Udeblevet',
    };

    liste.forEach(function (b) {
      var k = lav('div', 'faerdig-raekke');

      var midt = lav('div', 'vagt-midt');
      var hvem = lav('div', 'bestil-hvem');
      hvem.appendChild(lav('span', 'vare-navn', b.navn));
      hvem.appendChild(lav('span', 'maerke', ORD[b.status] || b.status));
      midt.appendChild(hvem);
      midt.appendChild(lav('div', 'vare-tekst', linjeTekst(b)));
      midt.appendChild(lav('div', 'vare-tekst',
        'kl. ' + String(b.hent_tid || '').slice(0, 5).replace(':', '.')));
      k.appendChild(midt);

      /* GENDAN FØRER TIL "BEKRÆFTET" og ikke til "ny". Rækken HAR
         været set af personalet — det var derfor, nogen trykkede.
         Sat til ny ville den tælle med i "ikke set på endnu" og
         sende køkkenet ud at lede efter noget, de allerede
         kender. */
      /* ⚠️ friskOp OG IKKE Admin.gem. Admin.gem henter
         indstillinger og menukort — ikke bestillingerne. Kortet
         ville blive stående på "Afhentet", og personalet ville
         trykke igen på en knap, der allerede havde virket. Det er
         nøjagtig den fejl, køkken-køen faldt i 25/8; svaret står i
         noten ved videre() i js/admin/koekken.js. */
      var knap = lav('button', 'nyt-aabn', '↩ Gendan');
      knap.type = 'button';
      knap.addEventListener('click', function () {
        knap.disabled = true;
        Butik.skrive.bestillingStatus(b.id, 'bekraeftet')
          .then(function () { return Admin.friskOp(); })
          .then(function () {
            Admin.kvitter(b.navn + ' er tilbage i dagens forløb.');
          })
          .catch(function (e) {
            knap.disabled = false;
            Admin.brøl(e && e.message || String(e));
          });
      });
      k.appendChild(knap);

      boks.appendChild(k);
    });
  }

  // ----------------------------------------------------------
  //  LIGE MODTAGET — til ANDRE dage
  // ----------------------------------------------------------
  function nyligt() {
    var ud = [];

    (Admin.lister.bestillinger || []).forEach(function (b) {
      var min = minutterSiden(b.oprettet);
      if (b.slettet || min === null || min * 60000 > VINDUE_MS) return;
      ud.push({
        min: min, navn: b.navn, ny: b.status === 'ny',
        hvad: linjeTekst(b),
        dato: b.hent_dato,
        naar: Admin.pænDato(b.hent_dato) + ' kl. '
          + String(b.hent_tid || '').slice(0, 5).replace(':', '.'),
        fane: 'p-bestillinger', faneNavn: 'Åbn bestillingerne',
      });
    });

    (Admin.lister.borde || []).forEach(function (b) {
      var min = minutterSiden(b.oprettet);
      if (b.slettet || min === null || min * 60000 > VINDUE_MS) return;
      ud.push({
        min: min, navn: b.navn, ny: b.status === 'ny',
        hvad: 'Bord · ' + b.antal_personer + ' personer',
        dato: b.dato,
        naar: Admin.pænDato(b.dato) + ' kl. '
          + String(b.tid || '').slice(0, 5).replace(':', '.'),
        fane: 'p-borde', faneNavn: 'Åbn bordene',
      });
    });

    (Admin.lister.udlejninger || []).forEach(function (u) {
      var min = minutterSiden(u.oprettet);
      if (u.slettet || min === null || min * 60000 > VINDUE_MS) return;
      ud.push({
        min: min, navn: u.navn, ny: u.status === 'ny',
        hvad: 'Baglokalet'
          + (u.antal_personer ? ' · ' + u.antal_personer + ' personer' : ''),
        dato: u.dato, naar: Admin.pænDato(u.dato),
        fane: 'p-lokale', faneNavn: 'Åbn baglokalet',
      });
    });

    (Admin.lister.forespoergsler || []).forEach(function (f) {
      var min = minutterSiden(f.oprettet);
      if (f.slettet || min === null || min * 60000 > VINDUE_MS) return;
      var navne = {
        catering: 'Catering', baglokale: 'Baglokale',
        selskab: 'Selskab', frokost: 'Frokostordning',
      };
      ud.push({
        min: min, navn: f.navn, ny: f.status === 'ny',
        hvad: (navne[f.type] || f.type)
          + (f.antal_personer ? ' · ' + f.antal_personer + ' personer' : ''),
        dato: f.dato || null,
        naar: f.dato ? Admin.pænDato(f.dato) : 'Dato ikke oplyst',
        fane: 'p-forespoergsler', faneNavn: 'Åbn forespørgslerne',
      });
    });

    return ud.sort(function (a, b) { return a.min - b.min; });
  }

  function tegnNyligt() {
    var boks = $('overblik-nyt');
    if (!boks) return;
    Admin.tøm(boks);

    /* Kun det, der gælder en ANDEN dag. Dagens ting står allerede
       i forløbet, og to kort om den samme bestilling er ikke to
       oplysninger — det er én oplysning, man skal regne ud er den
       samme. */
    var iDag = Butik.nu().dato;
    var liste = nyligt().filter(function (n) { return n.dato !== iDag; });

    var kort = $('vagt-nyt-kort');
    if (kort) kort.classList.toggle('skjult', !liste.length);
    if (!liste.length) return;

    liste.forEach(function (n) {
      var k = lav('div', 'nyt-kort');
      k.appendChild(lav('div', 'nyt-hvornaar', hvornårTekst(n.min)));

      var linje = lav('div', 'bestil-hvem');
      linje.appendChild(lav('span', 'vare-navn', n.navn));
      if (n.ny) linje.appendChild(lav('span', 'maerke m-ny', 'Ny'));
      k.appendChild(linje);

      k.appendChild(lav('div', 'vare-tekst', n.hvad));
      k.appendChild(lav('div', 'nyt-naar', n.naar));
      k.appendChild(faneKnap(n.fane, n.faneNavn + ' →'));

      boks.appendChild(k);
    });
  }

  // ----------------------------------------------------------
  //  DAGENS TAL
  //  --------------------------------------------------------
  //  Kun tal, vi FAKTISK har. Der er ingen kasse og ingen
  //  omsætning i det her system — der er det, gæsterne har sendt
  //  gennem hjemmesiden. Et tal, der ligner en omsætning uden at
  //  være det, er værre end intet tal.
  //
  //  ⚠️ LUGEN OG BORDENE HAR HVER SIT FELT. Ét felt med summen
  //  ville skjule netop den forskel, hele fanen er bygget om for
  //  at vise — og et travlt bord ville se ud som en travl luge.
  // ----------------------------------------------------------
  function tegnTal() {
    var boks = $('overblik-tal');
    if (!boks) return;
    Admin.tøm(boks);

    var iDag = iDagsBestillinger();
    var lugen = iDag.filter(function (b) { return !erBord(b); });
    var bordene = iDag.filter(erBord);
    var retter = produktion().reduce(function (s, r) { return s + r.ialt; }, 0);

    var borde = Admin.lister.borde || [];
    var fore = Admin.lister.forespoergsler || [];
    var lokale = Admin.lister.udlejninger || [];

    var venter = fore.filter(function (f) { return f.status === 'ny'; }).length
      + lokale.filter(function (u) { return u.status === 'ny'; }).length;

    var felter = [
      ['Til lugen i dag', lugen.length, 'bestilt på hjemmesiden'],
      ['Fra bordene i dag', bordene.length, 'scannet ved bordet'],
      ['Retter i alt', retter, 'lagt sammen'],
    ];

    /* Dagens ret: solgt tælles af BESTILLINGERNE, og "tilbage"
       kommer fra tabellen. Der findes intet "solgt af N" i
       databasen — kun antal_tilbage — og et samlet antal, vi
       selv fandt på, ville være et opdigtet tal. */
    var ret = (Butik.dagensRetter(Admin.data || {}, Butik.nu().dato) || [])[0];
    if (ret) {
      var solgt = 0;
      iDag.forEach(function (b) {
        if (b.status === 'afvist') return;
        (b.linjer || []).forEach(function (l) {
          if (String(l.navn || '').trim().toLowerCase()
              === String(ret.navn || '').trim().toLowerCase()) {
            solgt += Number(l.antal) || 0;
          }
        });
      });
      felter.push(['Dagens ret solgt', solgt,
        ret.antal_tilbage === null || ret.antal_tilbage === undefined
          ? ret.navn
          : ret.antal_tilbage + ' tilbage']);
    }

    felter.push(['Nye bookinger',
      borde.filter(function (b) { return b.status === 'ny'; }).length,
      'ikke set på endnu']);
    felter.push(['Venter på svar', venter, 'forespørgsler og baglokale']);

    felter.forEach(function (t) {
      var f = lav('div', 'tal-felt');
      f.appendChild(lav('div', 'tal-navn', t[0]));
      f.appendChild(lav('div', 'tal-tal', t[1]));
      f.appendChild(lav('div', 'tal-note', t[2]));
      boks.appendChild(f);
    });
  }

  /* ---- KØREPLANEN: DAGEN, SOM DEN ER ----

     Kundens ord (24/8): "køreplanen får præcis den, skrive
     notater til den dag osv som selvfølgelig kommer ind i
     overblik".

     Linjen står ØVERST og siger tre ting, der ellers ligger på
     tre faner: om der er åbent, om lokalet er lejet ud, og hvad
     personalet har skrevet til sig selv. */
  function tegnKoereplan() {
    var boks = $('overblik-koereplan');
    if (!boks) return;

    var iDag = Butik.nu().dato;
    var kal = (Admin.data && Admin.data.kalender) || [];

    var lukket = null, tidligt = null;
    kal.forEach(function (k) {
      var til = k.slut_dato || k.dato;
      if (iDag < k.dato || iDag > til) return;
      if (k.type === 'lukkedag') lukket = k;
      if (k.type === 'tidlig_lukning') tidligt = k;
    });

    /* Åbent eller lukket er det første, man skal vide, når man
       møder ind — og det er det eneste her, der kan gøre resten
       af skærmen ligegyldig. */
    var ind = (Admin.data && Admin.data.indstillinger) || {};
    var aaben = ind.bestilling_aaben !== false;
    var stribe = $('plan-stribe');
    stribe.className = 'plan-stribe' + (lukket || !aaben ? ' plan-lukket' : '');
    if (lukket) {
      stribe.textContent = '⛔ Lukket i dag — ' + lukket.titel
        + '. Gæsterne kan ikke bestille.';
    } else if (!aaben) {
      stribe.textContent = '⛔ Bestillinger er slået fra. Der er åbent, men '
        + 'gæsterne kan ikke bestille på siden.';
    } else if (tidligt) {
      stribe.textContent = '🕐 Åbent for bestillinger — vi lukker kl. '
        + String(tidligt.lukker_kl || '').slice(0, 5) + '.';
    } else {
      stribe.textContent = '✅ Åbent for bestillinger.';
    }

    // Er lokalet lejet ud i dag, står der et selskab i baglokalet,
    // og det er ikke til at se nogen andre steder på Overblik.
    var lejet = $('plan-lejet');
    Admin.tøm(lejet);
    (Admin.lister.udlejninger || []).forEach(function (u) {
      if (u.dato !== iDag || u.status !== 'aftalt') return;
      lejet.appendChild(lav('div', 'plan-linje',
        '🔑 Baglokalet er lejet ud i dag — ' + u.navn
        + (u.antal_personer ? ' · ' + u.antal_personer + ' pers.' : '')));
    });

    /* ⚠️ FELTET OVERSKRIVES KUN, NÅR DET IKKE ER I BRUG. Skriver
       en medarbejder på noten, mens takten henter, ville en
       optegning kaste det skrevne væk — og det ville ligne, at
       systemet slugte sætningen. */
    var felt = $('plan-note-felt');
    if (felt && document.activeElement !== felt) {
      var note = Admin.noteFor ? Admin.noteFor(iDag) : null;
      felt.value = (note && note.beskrivelse) || '';
    }

    var dato = $('plan-dato');
    if (dato) {
      dato.textContent = Admin.pænDato(iDag)
        + ' · det ene sted, der skal tjekkes, når I møder ind';
    }
  }

  /* ⚠️ HVORFOR TO REGLER OG IKKE BARE AUTOGEM.

     Uden en id OPRETTER skrivningen en ny række. Autogem skriver
     1,2 sekund efter sidste tastetryk, og listen hentes IKKE
     imellem — så en note, der ikke fandtes i forvejen, ville
     blive oprettet én gang pr. pause i tastningen. Fem pauser =
     fem noter på dagen, og ingen fejl nogen steder. Rækken kendes
     kun på sin titel, så de fem ville ligne fem arrangementer.

     Derfor: FINDES rækken, er skrivningen en opdatering og må
     køre stille, så tit den vil. Findes den IKKE, gemmes der
     først, når feltet forlades (change), og kalenderen hentes
     igen bagefter — så den næste skrivning er en opdatering.
     Feltet er ikke i fokus på det tidspunkt, så optegningen river
     ingenting ud af hånden.

     ⚠️ Admin.genindlæs OG IKKE Admin.friskOp. friskOp henter
     FANERNES lister (bestillinger, borde, forespørgsler); noten
     bor i kalenderen, som ligger i Admin.data. MÅLT med friskOp:
     Admin.noteFor svarede stadig null ved anden skrivning, og der
     stod TO noter på dagen bagefter — helt uden en fejl.

     ⚠️ Roden er KORTET og ikke notefeltets boks: se noten i
     CLAUDE.md om autogem, hvor mærket blev revet ned sammen med
     en boks, der blev tegnet om. */
  function bindNote() {
    var kort = $('overblik-koereplan');
    var felt = $('plan-note-felt');
    if (!kort || !felt) return;

    Admin.autogem(kort, function () {
      var dag = Butik.nu().dato;
      var tekst = felt.value.trim();
      var findes = Admin.noteFor ? Admin.noteFor(dag) : null;

      if (!tekst) {
        if (!findes) return null;          // Ingen note, intet at slette
        return Butik.skrive.sletKalender(findes.id).then(Admin.genindlæs);
      }
      if (findes) return Admin.skrivNote(dag, tekst);
      if (document.activeElement === felt) return null;   // vent på change
      return Admin.skrivNote(dag, tekst).then(Admin.genindlæs);
    });
  }

  function tegnOverblik() {
    tegnKoereplan();
    tegnTal();
    tegnProduktion();
    tegnForloeb();
    tegnBorde();
    tegnFaerdige();
    tegnNyligt();
  }

  /* Overblik tegnes, hver gang en fane melder nye data ind — og
     én gang ved login, hvis der slet ikke kom noget (fx fordi
     begge kald fejlede). Ellers stod siden tom uden at sige
     hvorfor. */
  Admin.efterHent.push(tegnOverblik);
  Admin.vedLogin.push(tegnOverblik);

  // Notefeltet står fast i opmærkningen og bindes én gang.
  bindNote();

  /* KØREPLANEN SKAL OGSÅ TEGNES, NÅR DATA HENTES.

     Resten af Overblik lever af Admin.lister — fanernes egne
     lister — og de melder sig ind gennem efterHent. Køreplanen er
     den FØRSTE del af fanen, der læser Admin.data: lukkedagen og
     noten kommer fra kalenderen, ikke fra en liste.

     Uden den her linje blev noten først synlig, næste gang en
     fane meldte noget ind. MÅLT: personalet skrev en note på
     dagen, gik til Overblik, og der stod "Ingen note skrevet" —
     med noten gemt og det hele. */
  Admin.tegnere.push(tegnKoereplan);
})();
