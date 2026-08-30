/* Fanen Kalender: arrangementer, lukkedage og tidlige lukninger.
   Se js/admin/kerne.js for de to principper, der gælder i alle
   admin-filerne.

   DEN ERSTATTER FANEN LUKKEDAGE, og det er mere end et nyt navn.
   Et arrangement, en lukkedag og en tidlig lukning er tre
   forskellige beskeder til gæsten, men det samme spørgsmål: hvad
   sker der den dag? Og det er dét spørgsmål, bordbestilling og
   udlejning af baglokalet skal stille bagefter. To steder at holde
   styr på, hvad der sker hvornår, er præcis dér, dobbeltbookinger
   opstår.

   Det nye i forhold til lukkedage:

   - EN PERIODE ER ÉN RÆKKE. En vinterlukning er ikke halvfems
     lukkedage, man skal klikke ind og slette igen.
   - EN TIDLIG LUKNING er ikke en lukkedag. Der ER åbent, bare
     kortere — og en gæst, der kommer kl. 19 til en luge, der
     lukkede 15, er lige så skuffet.
   - ARRANGEMENTER KAN VÆRE INTERNE. Personalet skriver også ting
     til sig selv, og de må ikke havne på hjemmesiden, fordi nogen
     glemte at tænke over det. Derfor er "vis for gæsterne" slået
     FRA som udgangspunkt. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var TYPER = [
    { id: 'arrangement', navn: 'Arrangement', note: 'noget der sker' },
    { id: 'lukkedag', navn: 'Lukkedag', note: 'der er lukket' },
    { id: 'tidlig_lukning', navn: 'Lukker tidligt', note: 'åbent, men kortere' },
  ];

  var TYPE_NAVNE = {
    arrangement: 'Arrangement', lukkedag: 'Lukket', tidlig_lukning: 'Lukker tidligt',
  };

  var nyType = 'lukkedag';

  // ----------------------------------------------------------
  //  LISTEN
  // ----------------------------------------------------------
  function tegnKalender() {
    var boks = $('kalender-liste');
    if (!boks) return;
    Admin.tøm(boks);

    var rækker = (Admin.data.kalender || []).slice().sort(function (a, b) {
      return a.dato < b.dato ? -1 : 1;
    });

    /* BANNERET PÅ FORSIDEN KOMMER HERFRA.

       Kunden savnede livemusik-banneret (22/8) — "det var flot og
       gav lidt". Banneret var der ikke, fordi kalenderen var tom:
       js/side.js viser det NÆSTE offentlige arrangement, og der
       var ingen. Der er ikke noget i vejen med koden.

       Vi opfinder ikke et arrangement for at fylde en plads ud.
       Men admin skal sige, hvorfor pladsen er tom, i stedet for
       at lade ejeren lede efter en fejl, der ikke findes. */
    var næste = rækker.filter(function (k) {
      return k.type === 'arrangement' && k.offentlig !== false
        && (k.slut_dato || k.dato) >= Butik.nu().dato;
    })[0];

    if (!næste) {
      var savn = lav('p', 'vare-tekst');
      savn.appendChild(lav('strong', null, rækker.length
        ? 'Der står intet kommende arrangement.'
        : 'Der står ikke noget i kalenderen.'));
      savn.appendChild(document.createTextNode(
        ' Så er arrangement-banneret på forsiden heller ikke der. Læg et'
        + ' arrangement ind herunder og sæt hak i "vis for gæsterne",'
        + ' så står det øverst på forsiden med det samme.'));
      boks.appendChild(savn);
    }

    if (!rækker.length) return;

    rækker.forEach(function (k) {
      var r = lav('div', 'admin-raekke');

      var naar = Admin.pænDato(k.dato)
        + (k.slut_dato && k.slut_dato !== k.dato ? ' – ' + Admin.pænDato(k.slut_dato) : '');
      r.appendChild(lav('span', 'navn', (k.emoji ? k.emoji + ' ' : '') + naar));

      r.appendChild(lav('span', 'maerke ' + (k.type === 'lukkedag' ? 'udsolgt' : 'favorit'),
        TYPE_NAVNE[k.type] || k.type));

      r.appendChild(lav('span', 'vare-tekst', k.titel
        + (k.type === 'tidlig_lukning' && k.lukker_kl
          ? ' — lukker ' + String(k.lukker_kl).slice(0, 5) : '')));

      /* Står det på hjemmesiden? Det skal kunne ses på listen og
         ikke først, når man åbner rækken: en intern note, der ved
         en fejl er sat offentlig, opdager man ellers aldrig. */
      if (k.type === 'arrangement') {
        r.appendChild(lav('span', 'hjaelp',
          k.offentlig ? 'Vises for gæsterne' : 'Kun internt'));
      }

      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!window.confirm('Slet "' + k.titel + '" fra kalenderen?')) return;
        Admin.gem(Butik.skrive.sletKalender(k.id), 'Slettet fra kalenderen.');
      });
      r.appendChild(slet);

      boks.appendChild(r);
    });
  }

  // ----------------------------------------------------------
  //  TILFØJ
  // ----------------------------------------------------------
  function tegnTyper() {
    var boks = $('kalender-typer');
    if (!boks) return;
    Admin.tøm(boks);

    TYPER.forEach(function (t) {
      var knap = lav('button', 'type-knap' + (t.id === nyType ? ' valgt' : ''));
      knap.type = 'button';
      knap.dataset.type = t.id;
      knap.setAttribute('aria-pressed', t.id === nyType ? 'true' : 'false');
      knap.appendChild(lav('span', 'type-navn', t.navn));
      knap.appendChild(lav('span', 'type-note', t.note));
      knap.addEventListener('click', function () {
        nyType = t.id;
        tegnTyper();
        visFelter();
      });
      boks.appendChild(knap);
    });
  }

  /* Felterne følger typen. Et klokkeslæt på en lukkedag afvises af
     databasen, og et felt, der ikke betyder noget, er et felt,
     nogen udfylder alligevel. */
  function visFelter() {
    $('kal-tid-felt').hidden = nyType !== 'tidlig_lukning';
    $('kal-offentlig-felt').hidden = nyType !== 'arrangement';
    /* ⚠️ TILMELDINGEN FINDES KUN PÅ ET OFFENTLIGT ARRANGEMENT. En
       tilmelding til noget, gæsten ikke kan se, er en blindgyde —
       og databasen afviser den alligevel
       (reservation_findes_ikke). Derfor følger felterne både
       typen OG fluebenet. */
    visTilmelding();
  }

  /* ⚠️ SPØRG DATABASEN, IKKE KODEN (30/8). Kolonnerne tilmelding,
     pladser og pris_tekst kommer med supabase/arrangementer.sql.
     Er den ikke kørt, svarer PostgREST 400 med PGRST204, og
     ejeren kan ikke oprette et arrangement overhovedet — for en
     fil, han ikke ved eksisterer.

     Samme greb som maaAntal() på Menukort og maaVindue() på
     Nyheder: vi læser, hvad databasen HAR svaret, og sender kun
     det, den kender.

     ⚠️ OG UDEN RÆKKER SKJULES FELTERNE. De to valg fejler hver sin
     vej, og den ene er dyrere: viser vi felterne uden kolonnen,
     kan der slet ikke oprettes noget. Skjuler vi dem, og kolonnen
     ER der, bliver det første arrangement oprettet uden
     tilmelding — hvilket er den rigtige standard — og felterne
     dukker op af sig selv, så snart der er én række at læse
     nøglen af. Den anden fejl retter sig selv. Den første gør
     ikke. */
  function maaTilmelding() {
    var liste = (Admin.data && Admin.data.kalender) || [];
    /* ⚠️ EN TOM KALENDER ER ET "MÅSKE", IKKE ET "NEJ" (30/8).

       Reglen var: ingen rækker → skjul felterne. For nyheder var
       det rigtigt (den første nyhed blev bare oprettet uden
       datoer, hvilket ER standarden). Her er det ikke: ejerens
       FØRSTE arrangement er præcis det, han vil have tilmelding
       på, og med felterne skjult blev pladser og pris sat til
       ingenting — tavst.

       Nu er en tom kalender optimistisk. Er kolonnen der ikke,
       svarer databasen PGRST204, og Admin.forklarFejl oversætter
       den til "Kør supabase/arrangementer.sql i Supabase". En høj
       fejl med en løsning slår en tavs, der koster en booking. */
    if (!liste.length) return true;
    return Object.prototype.hasOwnProperty.call(liste[0], 'tilmelding');
  }

  function visTilmelding() {
    var arr = nyType === 'arrangement' && $('kal-offentlig').checked
      && maaTilmelding();
    $('kal-tilmeld-felt').hidden = !arr;
    /* Pladser og pris hører til tilmeldingen, ikke til
       arrangementet: et "kig forbi" har hverken et loft eller en
       formular at skrive prisen i. */
    $('kal-plads-felt').hidden = !(arr && $('kal-tilmelding').checked);
  }
  $('kal-offentlig').addEventListener('change', visTilmelding);
  $('kal-tilmelding').addEventListener('change', visTilmelding);

  $('tilfoej-kalender').addEventListener('click', function () {
    var dato = $('kal-dato').value;
    var fejl = Butik.tjek.dato(dato);
    if (fejl) return Admin.brøl(fejl);

    var titel = $('kal-titel').value.trim();
    if (!titel) return Admin.brøl('Skriv en overskrift — den står på listen og på siden.');

    var slut = $('kal-slut').value;
    if (slut && slut < dato) {
      return Admin.brøl('Slutdatoen ligger før startdatoen.');
    }

    if (nyType === 'tidlig_lukning' && !$('kal-tid').value) {
      return Admin.brøl('Skriv hvornår der lukkes. Uden et klokkeslæt '
        + 'siger beskeden ingenting til gæsten.');
    }

    var lokId = ((Admin.data.lokationer || [])[0] || {}).id || Butik.LOKATION;
    Admin.gem(Butik.skrive.kalender({
      lokation_id: lokId,
      type: nyType,
      dato: dato,
      slut_dato: slut || null,
      titel: titel,
      emoji: $('kal-emoji').value,
      lukker_kl: $('kal-tid').value || null,
      offentlig: nyType === 'arrangement' && $('kal-offentlig').checked,
      /* ⚠️ TILMELDING KUN PÅ ET OFFENTLIGT ARRANGEMENT. Sendte vi
         den på en lukkedag, ville kolonnen stå true på en række,
         ingen kan melde sig til — og næste medarbejder ville lede
         efter en fejl, der ikke findes. */
      tilmelding: maaTilmelding()
        ? (nyType === 'arrangement' && $('kal-offentlig').checked
          && $('kal-tilmelding').checked)
        : undefined,
      pladser: maaTilmelding()
        ? ($('kal-pladser').value === '' ? null : Number($('kal-pladser').value))
        : undefined,
      pris_tekst: maaTilmelding()
        ? ($('kal-pris').value.trim() || null)
        : undefined,
    }), 'Lagt i kalenderen.').then(function () {
      ['kal-dato', 'kal-slut', 'kal-titel', 'kal-emoji', 'kal-tid',
        'kal-pladser', 'kal-pris'].forEach(function (id) {
        $(id).value = '';
      });
      /* ⚠️ BEGGE FLUEBEN NULSTILLES. kal-tilmelding blev stående
         sat, så det næste arrangement arvede en tilmelding, ingen
         havde bedt om — og felterne under den stod med det
         forrige antal pladser. */
      $('kal-offentlig').checked = false;
      $('kal-tilmelding').checked = false;
      visTilmelding();
    });
  });

  /* ============================================================
     MÅNEDEN — "kalenderen skal være en kalender" (24/8)
     ------------------------------------------------------------
     Fanen var en LISTE over arrangementer og lukkedage, og den
     vidste ikke, at der lå bestillinger, borde, forespørgsler
     eller en udlejning samme dag. Spørgsmålet "hvad sker der den
     12.?" havde fire svar på fire faner, og det femte — "er
     lokalet lejet ud?" — kunne man kun finde ved at gætte.

     Nettet henter fra ALLE fanernes lister (Admin.meld i
     kerne.js) og lægger dem oven på hinanden dag for dag. Det
     koster ingen nye kald og ingen SQL: dataene er hentet i
     forvejen.

     DET ER LÆSNING, IKKE EN NY SANDHED. Nettet ejer ingenting —
     hver ting hører stadig til sin egen fane, og det er dér, den
     rettes. Nettet svarer kun på hvornår.
     ============================================================ */

  var MDR = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli',
    'august', 'september', 'oktober', 'november', 'december'];

  // Måneden, der vises, og dagen, der er valgt. Begge overlever en
  // optegning: listen henter sig selv hvert minut, og skærmen må
  // ikke hoppe tilbage til i dag, mens nogen kigger på december.
  var visAar = null;
  var visMdr = null;
  var valgtDag = null;

  function iso(aar, mdr, dag) {
    return aar + '-' + ('0' + (mdr + 1)).slice(-2) + '-' + ('0' + dag).slice(-2);
  }

  function idag() { return Butik.nu().dato; }

  function saetMaaned() {
    if (visAar !== null) return;
    var d = idag();
    visAar = Number(d.slice(0, 4));
    visMdr = Number(d.slice(5, 7)) - 1;
  }

  /* Ligger datoen inden for rækkens periode? En vinterlukning er
     ÉN række med en slutdato — den skal farve halvfems dage i
     nettet, ikke kun den første. */
  function raekkerOver(k, dag) {
    var fra = k.dato;
    var til = k.slut_dato || k.dato;
    return dag >= fra && dag <= til;
  }

  /* ---- ALT, DER RØRER ÉN DAG ----
     Rækkefølgen er den, personalet arbejder i: hvad er lukket,
     hvad sker der, hvad skal laves, hvem kommer. */
  function dagensTing(dag) {
    var ud = {
      lukket: null, tidligt: null, arrangementer: [], noter: [],
      bestillinger: [], borde: [], forespoergsler: [], udlejninger: [],
    };

    /* Admin.data KAN vaere null her. efterHent kaldes af
       Admin.meld, og fanerne melder deres lister ind, saa snart
       de har hentet — det kan ske foer den foerste Butik.hent()
       er kommet hjem. Uden gardet kastede tegnMaaned, og da alle
       tegnere ligger i den SAMME liste, blev de faner, der stod
       efter kalenderen, aldrig tegnet: Overblik og Bestillinger
       stod tomme uden en fejl paa skaermen. Elleve proever faldt. */
    ((Admin.data && Admin.data.kalender) || []).forEach(function (k) {
      if (!raekkerOver(k, dag)) return;
      if (k.type === 'lukkedag') ud.lukket = k;
      else if (k.type === 'tidlig_lukning') ud.tidligt = k;
      else if (erNote(k)) ud.noter.push(k);
      else ud.arrangementer.push(k);
    });

    (Admin.lister.bestillinger || []).forEach(function (b) {
      if (b.hent_dato === dag) ud.bestillinger.push(b);
    });
    (Admin.lister.borde || []).forEach(function (b) {
      if (b.dato === dag) ud.borde.push(b);
    });
    (Admin.lister.forespoergsler || []).forEach(function (f) {
      if (f.dato === dag) ud.forespoergsler.push(f);
    });
    (Admin.lister.udlejninger || []).forEach(function (u) {
      if (u.dato === dag) ud.udlejninger.push(u);
    });
    return ud;
  }

  // Er rækken en note til dagen og ikke et arrangement? Se noten
  // ved noteFor().
  function erNote(k) {
    return k.type === 'arrangement' && !k.offentlig && k.titel === NOTE_TITEL;
  }

  /* ⚠️ NETTET ALENE, UDEN DAGENS PANEL.

     tegnMaaned tegner BEGGE dele, og det er rigtigt, når data er
     hentet — panelet skal følge nettet. Men efter et stille gem
     i dagens styring er det forkert: panelet indeholder det felt,
     medarbejderen lige har skrevet i, og en optegning river det
     ud af hånden sammen med autogem-mærket. MÅLT: kvitteringen
     "✓ Gemt" blev skrevet i et mærke, der ikke længere sad på
     siden.

     Derfor de to funktioner. tegnNet rører kun #maaned-net. */
  function tegnNet() {
    var net = $('maaned-net');
    if (!net) return;
    saetMaaned();
    Admin.tøm(net);

    $('maaned-navn').textContent = MDR[visMdr].charAt(0).toUpperCase()
      + MDR[visMdr].slice(1) + ' ' + visAar;

    ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].forEach(function (d) {
      net.appendChild(lav('div', 'maaned-ugedag', d));
    });

    /* Mandag som første søjle. getUTCDay() giver søndag = 0, og
       en dansk kalender begynder om mandagen — uden (+6)%7 stod
       hele måneden en dag forskudt, og det er den slags, ingen
       opdager, før nogen møder ind på den forkerte dag. */
    var foerste = new Date(Date.UTC(visAar, visMdr, 1));
    var spring = (foerste.getUTCDay() + 6) % 7;
    var dageIMdr = new Date(Date.UTC(visAar, visMdr + 1, 0)).getUTCDate();

    for (var t = 0; t < spring; t++) net.appendChild(lav('div', 'maaned-tom'));

    var iDag = idag();
    for (var d = 1; d <= dageIMdr; d++) {
      net.appendChild(dagFelt(iso(visAar, visMdr, d), d, iDag));
    }
    tegnNoter();
  }

  function tegnMaaned() {
    tegnNet();
    tegnDag();
  }

  /* ---- MÅNEDENS NOTER SOM LISTE ----
     I nettet er en note en 📝-prik, og så skal man huske, HVILKE
     dage der har en. Listen svarer på "hvad har vi skrevet i
     august?" — og et tryk åbner dagen, så der kan skrives videre.
     Findes der ingen noter i måneden, findes listen ikke: en tom
     overskrift er en liste, man tror er i stykker. */
  function tegnNoter() {
    var boks = $('maaned-noter');
    if (!boks) return;
    Admin.tøm(boks);

    var start = iso(visAar, visMdr, 1);
    var slut = iso(visAar, visMdr,
      new Date(Date.UTC(visAar, visMdr + 1, 0)).getUTCDate());

    var noter = ((Admin.data && Admin.data.kalender) || [])
      .filter(function (k) {
        return erNote(k) && k.dato >= start && k.dato <= slut
          && String(k.beskrivelse || '').trim();
      })
      .sort(function (a, b) { return a.dato < b.dato ? -1 : 1; });

    if (!noter.length) return;

    boks.appendChild(lav('h3', 'noter-titel',
      '📝 Noter i ' + MDR[visMdr]));
    noter.forEach(function (k) {
      var r = lav('button', 'noter-linje');
      r.type = 'button';
      r.setAttribute('data-dag', k.dato);
      r.appendChild(lav('strong', null, Admin.pænDato(k.dato)));
      r.appendChild(lav('span', null, k.beskrivelse));
      r.addEventListener('click', function () {
        valgtDag = k.dato;
        tegnMaaned();
        /* ⚠️ SCOPET TIL #maaned-net. Opslaget gik i HELE dokumentet
           og fandt "det første .maaned-dag med den dato" — og
           siden 27/8 har Baglokale-fanen sit eget månedsnet med
           den samme klasse. Det net bruger data-lokale-dag netop
           for ikke at kunne rammes her, men scopet hører med:
           en tredje kalender må ikke kunne genindføre fejlen. */
        var felt = document.querySelector(
          '#maaned-net .maaned-dag[data-dag="' + k.dato + '"]');
        if (felt && felt.scrollIntoView) {
          felt.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });
      boks.appendChild(r);
    });
  }

  function dagFelt(dag, nr, iDag) {
    var ting = dagensTing(dag);
    var felt = lav('button', 'maaned-dag');
    felt.type = 'button';
    felt.setAttribute('data-dag', dag);
    if (dag === iDag) felt.classList.add('er-idag');
    if (dag === valgtDag) felt.classList.add('valgt');
    if (ting.lukket) felt.classList.add('er-lukket');

    /* ---- DAGENS TILSTAND, SET PÅ AFSTAND ----
       En halvt åben dag ligner en almindelig dag i et net, og det
       er præcis den, personalet skal kunne få øje på: dagen med
       selskab, hvor der kun kan hentes. Uden mærket her skal man
       åbne hver dag for at vide, hvad der gælder — og så gør man
       det ikke. */
    var r = Butik.dagsregel ? Butik.dagsregel(Admin.data || {}, dag) : null;
    if (r && (r.luk_takeaway || r.luk_spis_her)) {
      if (r.luk_takeaway && r.luk_spis_her) {
        // Begge veje spærret ER en lukkedag — også for gæsten.
        felt.classList.add('er-lukket');
        felt.appendChild(lav('span', 'maaned-stand lukket', '🚫 Lukket'));
      } else {
        felt.classList.add('er-halv');
        felt.appendChild(lav('span', 'maaned-stand halv',
          r.luk_spis_her ? '🥡 Kun ud af huset' : '🍽️ Kun spis her'));
      }
    } else if (r && (r.tidligst || r.senest_togo || r.senest_spis_her)) {
      // Egne tider er ikke en lukning, men det er heller ikke en
      // helt almindelig dag.
      felt.classList.add('er-tider');
      felt.appendChild(lav('span', 'maaned-stand tider', '🕐 Egne tider'));
    }

    felt.appendChild(lav('span', 'maaned-nr', nr));

    var maerker = lav('span', 'maaned-maerker');
    /* Tallene og ikke navnene. Et felt i et net er 90 px bredt, og
       "3 bestillinger, 1 bord" fylder fire linjer — tegnet og
       tallet fylder én og kan læses på afstand. Hele navnet står
       i dagens panel nedenunder. */
    [
      ['🥪', ting.bestillinger.length, 'bestillinger'],
      ['🍽️', ting.borde.length, 'borde'],
      ['💬', ting.forespoergsler.length, 'forespørgsler'],
      ['🔑', ting.udlejninger.length, 'udlejninger'],
      ['📅', ting.arrangementer.length, 'arrangementer'],
      ['📝', ting.noter.length, 'noter'],
    ].forEach(function (m) {
      if (!m[1]) return;
      var chip = lav('span', 'maaned-maerke');
      chip.appendChild(lav('span', 'maaned-tegn', m[0]));
      // Noten er der eller ikke; et 1-tal ved siden af en blyant
      // siger ingenting.
      if (m[1] > 1 || m[0] !== '📝') chip.appendChild(lav('span', null, m[1]));
      chip.title = m[1] + ' ' + m[2];
      maerker.appendChild(chip);
    });
    felt.appendChild(maerker);

    if (ting.lukket) felt.appendChild(lav('span', 'maaned-lukket', 'Lukket'));
    else if (ting.tidligt) {
      felt.appendChild(lav('span', 'maaned-lukket',
        'Til ' + String(ting.tidligt.lukker_kl || '').slice(0, 5)));
    }

    felt.setAttribute('aria-label', Admin.pænDato(dag));
    felt.addEventListener('click', function () {
      // Et tryk på den valgte lukker panelet igen.
      valgtDag = valgtDag === dag ? null : dag;
      tegnMaaned();
    });
    return felt;
  }

  /* ---- DAGENS PANEL ----
     Hele dagen skrevet ud, og hver linje fører hen til den fane,
     hvor den kan rettes. Panelet retter INTET selv: to steder at
     ændre en bestilling er to steder, der kan skride fra
     hinanden. */

  /* ============================================================
     DAGENS STYRING — den halvt åbne dag
     ------------------------------------------------------------
     Kundens ord (26/8): "hvis der er selskab en dag som en
     booking der er blevet oprettet skal de kunne administrere at
     der ikke er åbent for bestillinger den dag eller kun åbent
     for to go ... så det netop ikke kan gå galt."

     Kortet her er dét sted. Reglerne bor i dags_regler
     (supabase/dagsregler.sql), og gæstesiden og databasen kender
     dem begge — se js/bestil-regler.js.

     ⚠️ DET KLOGE ER IKKE KNAPPERNE. Det er, at kortet KIGGER på
     dagen, før det gør noget:

      · Ligger der allerede bestillinger, som en lukning ville
        strande, står de med navn og klokkeslæt — og lukningen
        sker først, når nogen har set dem. En lukning, der tavst
        efterlader fire gæster, opdages, når de står ved lugen.
      · Er baglokalet lejet ud, eller er der et selskab aftalt,
        FORESLÅR kortet at lukke for spis her. Det er den dag,
        hele tabellen blev bygget til, og personalet skal ikke
        skulle huske sammenhængen selv.
     ============================================================ */

  function regelFor(dag) {
    return Butik.dagsregel ? Butik.dagsregel(Admin.data || {}, dag) : null;
  }

  /* Hvad ville en lukning ramme? Kun det, der stadig er i
     arbejde — en afhentet bestilling er ikke en gæst, der bliver
     efterladt. */
  function ramtAf(ting, hvad) {
    var FAERDIG = { afhentet: true, serveret: true, afvist: true, udeblevet: true };
    if (hvad === 'spis_her') {
      return ting.bestillinger.filter(function (b) {
        return !b.slettet && !FAERDIG[b.status]
          && (b.hvordan === 'spis_her' || b.bord_nummer);
      }).map(function (b) {
        return (b.hent_tid || '').slice(0, 5) + ' · ' + b.navn
          + (b.bord_nummer ? ' (bord ' + b.bord_nummer + ')' : '');
      }).concat(ting.borde.filter(function (b) {
        return !b.slettet && b.status !== 'afvist' && b.status !== 'udeblevet';
      }).map(function (b) {
        return (b.tid || '').slice(0, 5) + ' · ' + b.navn + ' (booket bord)';
      }));
    }
    return ting.bestillinger.filter(function (b) {
      return !b.slettet && !FAERDIG[b.status]
        && b.hvordan !== 'spis_her' && !b.bord_nummer;
    }).map(function (b) {
      return (b.hent_tid || '').slice(0, 5) + ' · ' + b.navn;
    });
  }

  /* Gemmer dagens regel. ⚠️ HELE rækken sendes hver gang: felterne
     hænger sammen, og en delvis skrivning ville lade et gammelt
     klokkeslæt stå på en dag, personalet lige har åbnet igen. */
  function gemRegel(dag, aendringer) {
    var r = regelFor(dag) || {};
    var ny = {
      dato: dag,
      luk_takeaway: !!r.luk_takeaway,
      luk_spis_her: !!r.luk_spis_her,
      tidligst: r.tidligst || '',
      senest_togo: r.senest_togo || '',
      senest_spis_her: r.senest_spis_her || '',
      besked_til_gaester: r.besked_til_gaester || '',
    };
    Object.keys(aendringer || {}).forEach(function (k) { ny[k] = aendringer[k]; });
    return Butik.skrive.dagsregel(ny);
  }

  function tidsFelt(id, etiket, vaerdi, note) {
    var boks = lav('div', 'felt');
    var e = document.createElement('label');
    e.setAttribute('for', id);
    e.textContent = etiket;
    boks.appendChild(e);
    var f = document.createElement('input');
    f.type = 'time';
    f.id = id;
    f.value = String(vaerdi || '').slice(0, 5);
    boks.appendChild(f);
    if (note) boks.appendChild(lav('p', 'hjaelp', note));
    return boks;
  }

  function dagsStyring(dag, ting) {
    var r = regelFor(dag) || {};
    var kort = lav('div', 'dag-styring');

    /* ---- FORSLAGET ----
       Er havnen optaget den dag, siger kortet det og tilbyder
       rettelsen. Ét tryk, i stedet for at personalet skal huske
       sammenhængen mellem en udlejning og en bestillingsformular. */
    var optaget = ting.udlejninger.filter(function (u) {
      return u.status === 'aftalt';
    }).map(function (u) {
      return 'Baglokalet er lejet ud til ' + u.navn
        + (u.antal_personer ? ' (' + u.antal_personer + ' pers.)' : '');
    }).concat(ting.forespoergsler.filter(function (f) {
      return f.status === 'aftalt' && f.type === 'selskab';
    }).map(function (f) {
      return 'Der er selskab hos jer — ' + f.navn
        + (f.antal_personer ? ' (' + f.antal_personer + ' pers.)' : '');
    }));

    if (optaget.length && !r.luk_spis_her) {
      var forslag = lav('div', 'dag-forslag');
      forslag.appendChild(lav('div', 'dag-forslag-tekst',
        '💡 ' + optaget.join('. ') + '. Skal vi lukke for spis her den dag, '
        + 'så I ikke får gæster ind midt i det? Maden kan stadig hentes.'));
      var ja = lav('button', 'knap lille', 'Luk for spis her');
      ja.type = 'button';
      ja.addEventListener('click', function () {
        ja.disabled = true;
        Admin.gem(gemRegel(dag, { luk_spis_her: true }),
          'Der er lukket for spis her den dag.');
      });
      forslag.appendChild(ja);
      kort.appendChild(forslag);
    }

    /* ---- HVAD KAN MAN BESTILLE DENNE DAG? ---- */
    kort.appendChild(lav('h4', 'dag-under', 'Hvad kan man bestille denne dag?'));
    kort.appendChild(lav('p', 'hjaelp',
      'Luk kun den ene måde — resten af dagen kører videre.'));

    var par = lav('div', 'dag-par');
    [
      ['🥡 Ud af huset', 'luk_takeaway', 'take-away'],
      ['🍽️ Spis her', 'luk_spis_her', 'spis her'],
    ].forEach(function (v) {
      var lukket = !!r[v[1]];
      var b = lav('div', 'dag-vej' + (lukket ? ' er-lukket' : ''));
      b.setAttribute('data-vej', v[1]);
      b.appendChild(lav('div', 'dag-vej-navn', v[0]));
      b.appendChild(lav('div', 'dag-vej-stand', lukket ? '🚫 Lukket' : '✅ Åben'));

      var knap = lav('button', 'knap lille', lukket ? 'Åbn igen' : 'Luk');
      knap.type = 'button';
      knap.addEventListener('click', function () {
        var aendring = {};
        aendring[v[1]] = !lukket;

        /* ⚠️ EN LUKNING MÅ IKKE STRANDE NOGEN I STILHED. */
        if (!lukket) {
          var ramte = ramtAf(ting, v[1] === 'luk_spis_her' ? 'spis_her' : 'togo');
          if (ramte.length && !window.confirm(
            'Der ligger allerede ' + ramte.length
            + (ramte.length === 1 ? ' bestilling' : ' bestillinger')
            + ' til ' + v[2] + ' den dag:\n\n' + ramte.join('\n')
            + '\n\nDe forsvinder IKKE — men gæsterne regner med dem. '
            + 'Ring til dem, hvis I lukker.\n\nLuk alligevel?')) return;
        }
        knap.disabled = true;
        Admin.gem(gemRegel(dag, aendring),
          v[0] + ' er ' + (lukket ? 'åben igen' : 'lukket') + ' den dag.');
      });
      b.appendChild(knap);
      par.appendChild(b);
    });
    kort.appendChild(par);

    /* ---- HVORNÅR KAN MAN HENTE? ---- */
    kort.appendChild(lav('h4', 'dag-under', 'Hvornår kan man hente denne dag?'));
    kort.appendChild(lav('p', 'hjaelp',
      'Lad felterne stå tomme, så gælder de almindelige åbningstider. '
      + 'Udfyld kun det, der er anderledes — og husk, at en dag kun kan '
      + 'åbne SENERE og lukke TIDLIGERE end normalt.'));

    var tider = lav('div', 'dag-tider');
    var plan = window.MosedeRegler
      ? MosedeRegler.planFor(Admin.data || {}, dag) : null;
    tider.appendChild(tidsFelt('dag-tidligst', '🕐 Tidligst', r.tidligst,
      plan ? 'bruger ' + String(plan.aabner).slice(0, 5) : ''));
    tider.appendChild(tidsFelt('dag-senest-togo', '🥡 Senest ud af huset',
      r.senest_togo, plan ? 'bruger ' + String(plan.lukker).slice(0, 5) : ''));
    tider.appendChild(tidsFelt('dag-senest-her', '🍽️ Senest spis her',
      r.senest_spis_her, plan ? 'bruger ' + String(plan.lukker).slice(0, 5) : ''));
    kort.appendChild(tider);

    /* ---- BESKED TIL GÆSTERNE ---- */
    kort.appendChild(lav('h4', 'dag-under', '💬 Besked til gæsterne denne dag'));
    kort.appendChild(lav('p', 'hjaelp',
      'Står på hjemmesiden ved netop den dag. Lad feltet stå tomt, '
      + 'hvis der ikke er noget at sige.'));
    /* ⚠️ TITLEN ER ET EGET FELT og ikke tekstens første linje.
       En besked på én linje ville ellers blive til en overskrift
       uden noget under, og personalet ville ikke kunne se
       hvorfor. To felter er to felter. */
    var titel = document.createElement('input');
    titel.type = 'text';
    titel.id = 'dag-besked-titel';
    titel.maxLength = 120;
    titel.placeholder = 'Overskrift — fx "Kun mad ud af huset i dag"';
    titel.value = r.besked_titel || '';
    kort.appendChild(titel);

    var besked = document.createElement('textarea');
    besked.id = 'dag-gaestebesked';
    besked.rows = 2;
    besked.maxLength = 2000;
    besked.placeholder = 'Fx "I dag er der kun mad ud af huset — vi er tilbage '
      + 'med spisning i morgen"';
    besked.value = r.besked_til_gaester || '';
    kort.appendChild(besked);
    /* ⚠️ DEN HER LÆSES AF GÆSTEN. Personalets egen note står
       ovenfor og bor i kalenderen; den her står på hjemmesiden.
       Sætningen skal stå, hvor feltet er — ikke i en manual. */
    /* ⚠️ KLASSEN HED 'hjaelp advarsel', OG DET VAR EN KOLLISION.
       .advarsel findes i forvejen i style.css med rød flade og
       hvid tekst — beregnet til en bjælke, ikke til en linje. Med
       min --red-tekst ovenpå blev den rød på rødt. MÅLT på et
       skærmbillede: linjen var der, og man kunne ikke læse den.
       Præcis den fælde, .bestil-kort faldt i i admin. */
    kort.appendChild(lav('p', 'hjaelp gaester-laeser',
      'Det er IKKE personalenoten — gæsterne kan læse den her.'));

    /* Tiderne og beskeden gemmer sig selv. Knapperne ovenfor er
       handlinger med en konsekvens; de her er felter, man retter
       og går fra.

       ⚠️ OG NETTET SKAL FØLGE MED. Autogem skriver STILLE og
       tegner ikke om — det er dét, der forhindrer, at feltet
       rives ud af hånden midt i en sætning. Men uden en optegning
       satte personalet et klokkeslæt og så INGEN forskel: dagen i
       nettet så almindelig ud, og det læses som "det blev ikke
       gemt". Prøven fandt det.

       ⚠️ OG SVARET ER IKKE Admin.genindlæs. Første udgave hentede
       kun, når feltet var forladt — målt på document.activeElement
       — og den betingelse ramte forkert: prøven så et net, der
       aldrig blev opdateret. Et gæt om, hvor markøren står, er en
       dårlig ting at hænge en optegning på.

       Her hentes friske data, og KUN nettet tegnes om. tegnMaaned
       rører ikke dagens panel, så der er intet felt at rive ud af
       hånden — og så er der ingen betingelse at ramme forkert. */
    Admin.autogem(kort, function () {
      return gemRegel(dag, {
        tidligst: $('dag-tidligst').value,
        senest_togo: $('dag-senest-togo').value,
        senest_spis_her: $('dag-senest-her').value,
        besked_til_gaester: besked.value,
        besked_titel: titel.value,
      }).then(function () {
        return Butik.hent().then(function (d) {
          Admin.data = d;
          tegnNet();
        });
      });
    });

    return kort;
  }

  /* ---- LAGET ----

     ⚠️ ESCAPE LUKKER, EN TOM FLADE GØR IKKE. Panelet har felter,
     personalet skriver i — noten og beskeden til gæsterne. Et
     klik ved siden af er ikke et ønske om at kassere en halv
     sætning; Escape og ✕ er. */
  function lukDag() {
    valgtDag = null;
    var lag = $('dag-lag');
    if (lag) lag.classList.add('skjult');
    document.body.classList.remove('lag-aabent');
    tegnNet();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var lag = $('dag-lag');
    if (lag && !lag.classList.contains('skjult')) lukDag();
  });

  /* ---- UGESTRIBEN ----

     "Hvad med på lørdag?" er det næste spørgsmål, hver gang man
     har kigget på en dag. Uden striben skal man lukke panelet,
     finde dagen i nettet og åbne igen — tre skridt for at flytte
     sig én dag.

     Prikken under en dag siger, at der ER noget; den siger ikke
     hvad. Farven er nok til at vide, hvor man skal kigge. */
  function ugeStribe(dag) {
    var boks = lav('div', 'dag-uge');
    var d = new Date(dag + 'T12:00:00Z');
    var mandag = new Date(d);
    mandag.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));

    for (var i = 0; i < 7; i++) {
      var x = new Date(mandag);
      x.setUTCDate(mandag.getUTCDate() + i);
      var iso = x.toISOString().slice(0, 10);
      var t = dagensTing(iso);
      var noget = t.lukket || t.tidligt || t.arrangementer.length || t.noter.length
        || t.bestillinger.length || t.borde.length
        || t.forespoergsler.length || t.udlejninger.length;

      var k = lav('button', 'dag-uge-dag' + (iso === dag ? ' valgt' : '')
        + (t.lukket ? ' er-lukket' : ''));
      k.type = 'button';
      k.appendChild(lav('span', 'dag-uge-navn', UGEDAGE_KORT[i]));
      k.appendChild(lav('span', 'dag-uge-nr', String(x.getUTCDate())));
      if (noget) k.appendChild(lav('span', 'dag-uge-prik'));
      k.setAttribute('aria-label', Admin.pænDato(iso)
        + (noget ? ' — der er noget på dagen' : ' — tom'));
      k.addEventListener('click', (function (v) {
        return function () { valgtDag = v; tegnDag(); tegnNet(); };
      })(iso));
      boks.appendChild(k);
    }
    return boks;
  }

  var UGEDAGE_KORT = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];

  function naboDag(dag, n) {
    var d = new Date(dag + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  /* ---- HOVEDET ---- */
  function dagHoved(dag) {
    var h = lav('div', 'dag-hoved');

    var tilbage = lav('button', 'knap lille', '‹');
    tilbage.type = 'button';
    tilbage.setAttribute('aria-label', 'Dagen før');
    tilbage.addEventListener('click', function () {
      valgtDag = naboDag(dag, -1); tegnDag(); tegnNet();
    });

    var frem = lav('button', 'knap lille', '›');
    frem.type = 'button';
    frem.setAttribute('aria-label', 'Dagen efter');
    frem.addEventListener('click', function () {
      valgtDag = naboDag(dag, 1); tegnDag(); tegnNet();
    });

    var luk = lav('button', 'knap lille dag-luk', '✕');
    luk.type = 'button';
    /* ⚠️ "LUK DAGEN" PÅ ET ✕ ER TVETYDIGT. Knappen lukker
       PANELET; "luk dagen" er dét, forretningen gør, når der er
       ferie — og det er en helt anden handling, som står som sin
       egen knap tre linjer nede. En, der bruger skærmlæser, ville
       høre "Luk dagen" på krydset og tro, hun lukkede lugen.
       Fundet, fordi to knapper med det samme navn fældede en
       prøve. */
    luk.setAttribute('aria-label', 'Luk panelet');
    luk.addEventListener('click', lukDag);

    var titel = lav('h3', 'dag-titel', Admin.pænDato(dag));
    titel.id = 'dag-lag-titel';

    h.appendChild(tilbage);
    h.appendChild(titel);
    h.appendChild(frem);
    h.appendChild(luk);
    return h;
  }

  /* ---- DAGENS PROGRAM ----

     ⚠️ EN VAGT LÆSES I TIDSRÆKKEFØLGE, IKKE I GRUPPER.

     Panelet listede bestillinger for sig, borde for sig,
     forespørgsler for sig. Hver liste var rigtig, og tilsammen
     svarede de ikke på det spørgsmål, man åbner en dag for at
     stille: hvad sker der hvornår? En booking kl. 12.30 og en
     afhentning kl. 12.35 stod tredive linjer fra hinanden.

     Åbningen og lukningen står med, fordi de er dagens rammer —
     og fordi "sidste bestilling ud af huset" er et klokkeslæt,
     personalet ellers skal regne ud af tre felter. */
  function tider(dag) {
    var r = regelFor(dag) || {};
    var uge = (Admin.data && Admin.data.aabningstider) || [];
    var d = new Date(dag + 'T12:00:00Z');
    var u = uge.filter(function (t) { return t.ugedag === ((d.getUTCDay() + 6) % 7); })[0];
    return {
      aabner: kl(r.aabner) || kl(u && u.aabner),
      togo: kl(r.senest_togo) || kl(u && u.lukker),
      spis: kl(r.senest_spis_her) || kl(u && u.lukker),
      lukket: !!(u && u.lukket),
    };
  }

  function kl(v) { return v ? String(v).slice(0, 5) : ''; }

  function program(dag, ting) {
    var t = tider(dag);
    var linjer = [];

    if (t.aabner) linjer.push({ tid: t.aabner, tegn: '🔓', tekst: 'Køkkenet åbner for bestillinger' });

    ting.bestillinger.forEach(function (b) {
      linjer.push({
        tid: kl(b.hent_tid), tegn: b.bord_nummer ? '🍽️' : '🥡',
        tekst: b.navn, under: (b.antal || 0) + ' stk.'
          + (b.bord_nummer ? ' · bord ' + b.bord_nummer : ''),
        fremhaev: true, fane: 'p-bestillinger',
      });
    });
    ting.borde.forEach(function (b) {
      linjer.push({
        tid: kl(b.tid), tegn: '🍽️', tekst: b.navn,
        under: 'Bord til ' + (b.antal_personer || '?')
          + (b.status === 'ny' ? ' · venter på svar' : ''),
        fremhaev: true, fane: 'p-borde',
      });
    });
    ting.arrangementer.forEach(function (k) {
      linjer.push({
        tid: kl(k.tid_fra), tegn: k.emoji || '📅', tekst: k.titel,
        under: k.offentlig ? null : 'kun her — gæsterne ser den ikke',
        fane: 'p-kalender',
      });
    });
    ting.udlejninger.forEach(function (u) {
      linjer.push({
        tid: '', tegn: '🔑', tekst: 'Baglokalet: ' + u.navn,
        under: (u.antal_personer ? u.antal_personer + ' pers.' : '')
          + (u.status === 'ny' ? ' · venter på svar' : ''),
        fane: 'p-lokale',
      });
    });
    ting.forespoergsler.forEach(function (f) {
      linjer.push({
        tid: '', tegn: '💬', tekst: f.navn + ' — ' + (f.type || ''),
        under: (f.antal_personer ? f.antal_personer + ' pers.' : '')
          + (f.status === 'ny' ? ' · venter på svar' : ''),
        fane: 'p-forespoergsler',
      });
    });

    if (t.togo) linjer.push({ tid: t.togo, tegn: '🥡', tekst: 'Sidste bestilling ud af huset' });
    if (t.spis && t.spis !== t.togo) {
      linjer.push({ tid: t.spis, tegn: '🍽️', tekst: 'Køkkenet lukker — sidste spis her' });
    }

    /* Uden klokkeslæt sidst: en forespørgsel har ingen tid, og
       den skal ikke stå kl. 00.00 øverst på dagen. */
    return linjer.sort(function (a, b) {
      if (!a.tid !== !b.tid) return a.tid ? -1 : 1;
      return a.tid < b.tid ? -1 : 1;
    });
  }

  function tegnProgram(dag, ting) {
    var linjer = program(dag, ting);
    if (!linjer.length) return null;

    var boks = lav('div', 'dag-program');
    boks.appendChild(lav('div', 'eyebrow', 'Dagens program'));

    linjer.forEach(function (l) {
      var r = lav('div', 'prog-linje' + (l.fremhaev ? ' prog-sag' : ''));
      r.appendChild(lav('span', 'prog-tid', l.tid || '—'));
      var m = lav('div', 'prog-midt');
      var n = lav('div', 'prog-navn');
      n.appendChild(lav('span', 'prog-tegn', l.tegn));
      n.appendChild(document.createTextNode(' ' + l.tekst));
      m.appendChild(n);
      if (l.under) m.appendChild(lav('div', 'prog-under', l.under));
      r.appendChild(m);
      if (l.fane) {
        var k = lav('button', 'nyt-aabn', '→');
        k.type = 'button';
        k.setAttribute('aria-label', 'Åbn fanen');
        k.addEventListener('click', function () { lukDag(); Admin.visFane(l.fane); });
        r.appendChild(k);
      }
      boks.appendChild(r);
    });
    return boks;
  }

  /* ---- HVEM RØRER DAGEN, HVIS NOGET ÆNDRES ----

     ⚠️ EN LUKKET DAG SENDER INGEN BESKED. Slår personalet en dag
     fra, får de gæster, der ALLEREDE har bestilt til den dag,
     ingenting at vide — det er et opkald, et menneske skal
     foretage. Uden linjen her opdages det først, når nogen møder
     op til en lukket luge. */
  function folkPaaDagen(ting) {
    var n = ting.bestillinger.filter(function (b) {
      return b.status !== 'afvist' && !b.slettet;
    }).length + ting.borde.filter(function (b) {
      return b.status !== 'afvist' && !b.slettet;
    }).length;
    return n;
  }

  function tegnFoelger(dag, ting) {
    var n = folkPaaDagen(ting);
    if (!n) return null;
    var boks = lav('div', 'dag-foelger');
    boks.appendChild(lav('div', 'eyebrow', 'Hvis du lukker dagen'));
    boks.appendChild(lav('p', 'hjaelp',
      n === 1
        ? '1 gæst har allerede bestilt eller booket den dag — og får IKKE besked af sig selv. Ring.'
        : n + ' gæster har allerede bestilt eller booket den dag — og de får IKKE besked af sig selv. Ring til dem.'));
    return boks;
  }

  /* ============================================================
     GENVEJENE — VEJE HEN TIL DET, DER FINDES
     ------------------------------------------------------------
     Kundens skærmbilleder har tre knapper i dagens hoved: opret
     en bestilling, luk hele dagen, luk flere dage.

     ⚠️ INGEN AF DEM SKRIVER SELV.

     At tage imod en booking findes på Borde-fanen; at leje
     lokalet ud findes på Baglokalet; at lukke en dag er en række
     i kalenderen. Byggede knapperne her deres egne skrivninger,
     ville de samme tabeller have to veje ind — og to regelsæt,
     der langsomt kommer til at sige noget forskelligt. Det er
     præcis dét, der giver to selskaber i det samme lokale.

     Så de gør det, en genvej skal: de tager dig derhen OG
     udfylder datoen. Det er dét, der faktisk er besværligt —
     ikke at finde fanen, men at taste den dag af, man lige stod
     og kiggede på.

     ⚠️ OG LUKKEDAGEN FÅR IKKE EN OPFUNDET OVERSKRIFT. Formularen
     kræver en titel, fordi den står på hjemmesiden: "uden et
     klokkeslæt siger beskeden ingenting til gæsten" gælder også
     her. Genvejen udfylder datoen og sætter markøren i
     titelfeltet — resten skriver et menneske.
     ============================================================ */
  function saet(id, vaerdi) {
    var f = $(id);
    if (f) { f.value = vaerdi; f.dispatchEvent(new Event('change', { bubbles: true })); }
  }

  function genveje(dag) {
    var r = lav('div', 'dag-genveje');

    function knap(tekst, titel, gør) {
      var k = lav('button', 'knap sekundaer lille', tekst);
      k.type = 'button';
      k.title = titel;
      k.addEventListener('click', gør);
      r.appendChild(k);
      return k;
    }

    knap('🍽️ Tag imod et bord', 'Åbner Borde-fanen med dagen udfyldt', function () {
      lukDag();
      Admin.visFane('p-borde');
      var fold = $('tag-booking');
      if (fold) fold.open = true;
      saet('nyb-dato', dag);
      var n = $('nyb-navn');
      if (n) n.focus();
    });

    knap('🔑 Lej baglokalet ud', 'Åbner Baglokalet med dagen udfyldt', function () {
      lukDag();
      Admin.visFane('p-lokale');
      var fold = $('lokale-tag-booking');
      if (fold) fold.open = true;
      saet('nyl-dato', dag);
      var n = $('nyl-navn');
      if (n) n.focus();
    });

    /* Er dagen allerede lukket, er knappen forkert: den ville
       lave en lukkedag mere oven i den, der er. */
    var ting = dagensTing(dag);
    if (!ting.lukket) {
      knap('⛔ Luk dagen', 'Udfylder kalenderformularen med dagen', function () {
        tilKalenderformular(dag, false);
      });
      knap('🌴 Luk flere dage…', 'Udfylder formularen med dagen som start',
        function () { tilKalenderformular(dag, true); });
    }

    return r;
  }

  function tilKalenderformular(dag, flere) {
    lukDag();
    nyType = 'lukkedag';
    tegnTyper();
    visFelter();
    saet('kal-dato', dag);
    if (flere) saet('kal-slut', dag);
    var felt = $(flere ? 'kal-slut' : 'kal-titel');
    var kort = $('kal-dato');
    if (kort && kort.scrollIntoView) kort.scrollIntoView({ block: 'center' });
    if (felt) felt.focus();
    Admin.kvitter(flere
      ? 'Sæt slutdatoen og skriv, hvad der står på siden.'
      : 'Skriv, hvad der skal stå på hjemmesiden den dag.');
  }

  function tegnDag() {
    var boks = $('dag-panel');
    var lag = $('dag-lag');
    if (!boks) return;
    Admin.tøm(boks);
    if (!valgtDag) {
      if (lag) lag.classList.add('skjult');
      document.body.classList.remove('lag-aabent');
      return;
    }
    if (lag) lag.classList.remove('skjult');
    document.body.classList.add('lag-aabent');

    var ting = dagensTing(valgtDag);
    var kort = lav('div', 'dag-kort');
    kort.appendChild(dagHoved(valgtDag));
    kort.appendChild(ugeStribe(valgtDag));

    /* ---- ÉN LINJE MED DAGENS TILSTAND ----
       Grøn eller rød, og den står før alt andet. Spørgsmålet
       "er der åbent den dag?" må ikke kræve, at man læser tre
       felter og selv lægger dem sammen. */
    var r = regelFor(valgtDag) || {};
    var t = tider(valgtDag);
    var stand = lav('p', 'dag-stand');
    if (ting.lukket || t.lukket) {
      stand.className += ' er-lukket';
      stand.textContent = '⛔ Lukket' + (ting.lukket ? ' — ' + ting.lukket.titel : '')
        + '. Gæsterne kan ikke bestille.';
    } else if (r.luk_take_away && r.luk_spis_her) {
      stand.className += ' er-lukket';
      stand.textContent = '⛔ Hverken ud af huset eller spis her er åben.';
    } else if (r.luk_take_away || r.luk_spis_her) {
      stand.className += ' er-halv';
      stand.textContent = '⚠️ Kun ' + (r.luk_take_away ? 'spis her' : 'ud af huset')
        + ' er åben denne dag.';
    } else {
      stand.className += ' er-aaben';
      stand.textContent = '✅ Åbent for bestillinger og booking'
        + (t.aabner ? ' · ' + t.aabner + '–' + (t.spis || t.togo) : '');
    }
    if (ting.tidligt) {
      stand.textContent += ' Lukker kl. '
        + kl(ting.tidligt.lukker_kl) + ' — ' + ting.tidligt.titel + '.';
    }
    kort.appendChild(stand);
    kort.appendChild(genveje(valgtDag));

    var prog = tegnProgram(valgtDag, ting);
    if (prog) kort.appendChild(prog);

    kort.appendChild(noteFelt(valgtDag, ting.noter[0]));
    kort.appendChild(dagsStyring(valgtDag, ting));

    var foelger = tegnFoelger(valgtDag, ting);
    if (foelger) kort.appendChild(foelger);

    /* ⚠️ DE FEM GRUPPEREDE LISTER ER VÆK (28/8).

       Panelet listede bestillinger for sig, borde for sig,
       forespørgsler for sig, baglokalet for sig og kalenderen for
       sig — fem overskrifter med hver sin "Åbn … →"-knap. Hver
       liste var rigtig, og tilsammen svarede de ikke på det
       spørgsmål, man åbner en dag for at stille: hvad sker der
       hvornår?

       En booking kl. 12.30 og en afhentning kl. 12.35 stod tredive
       linjer fra hinanden, fordi de kom fra hver sin tabel — og
       det er tabellernes skel, ikke vagtens.

       Alt står i Dagens program nu, i tidsrækkefølge, og pilen på
       linjen fører til den fane, hvor tingen kan rettes. Intet er
       gået tabt; det er sorteret efter tid i stedet for efter
       hvor det kom fra. */
    /* ⚠️ TÆL SAGERNE, IKKE LINJERNE. Programmet har ALTID mindst
       to linjer — køkkenet åbner og lukker — så et tomt program
       findes ikke, og en tælling på linjer ville aldrig sige
       "ingenting". Det, personalet spørger om, er om der er noget
       at forholde sig til den dag. */
    var sager = ting.bestillinger.length + ting.borde.length
      + ting.forespoergsler.length + ting.udlejninger.length
      + ting.arrangementer.length;
    if (!sager) {
      kort.appendChild(lav('p', 'vare-tekst luft-top',
        'Der er ikke noget på dagen endnu.'));
    }

    boks.appendChild(kort);
  }

  /* ---- NOTEN TIL DAGEN ----

     Kundens ord (24/8): "køreplanen ... skrive notater til den dag
     osv som selvfølgelig kommer ind i overblik".

     Den bor i KALENDEREN og ikke i en ny tabel: så står den også
     på dagen, når nogen kigger tilbage, og den følger med de
     adgangsregler og den skraldespand, kalenderen allerede har.
     En intern kalenderrække er den form, huset bruger i forvejen
     (se demo-indhold.sql).

     KENDINGEN ER TITLEN. Databasen har tre typer og ingen fjerde,
     og en kolonne mere er en SQL-fil, ejeren skal køre. En række
     med typen arrangement, uden hak i "vis for gæsterne" og med
     præcis den her titel ER dagens note. Det er den samme slags
     aftale som Admin.erTapas: en kending frem for en kolonne.

     ⚠️ Skift ALDRIG teksten i NOTE_TITEL. De noter, der allerede
     er skrevet, ville blive til arrangementer på dagen — synlige
     i nettet som noget, der sker, og væk fra køreplanen. */
  var NOTE_TITEL = 'Note til dagen';

  function noteFelt(dag, findes) {
    var boks = lav('div', 'dag-note');
    boks.appendChild(lav('div', 'eyebrow', '📝 Note til dagen'));
    boks.appendChild(lav('p', 'hjaelp',
      'Kun personalet ser den. Den står øverst på Overblik, når det er i dag.'));

    var felt = document.createElement('textarea');
    felt.id = 'dag-note-felt';
    felt.rows = 2;
    felt.maxLength = 2000;
    felt.placeholder = 'Fx "Henning kommer og spiser med sin kone kl. 18"';
    felt.value = (findes && findes.beskrivelse) || '';

    var knap = lav('button', 'knap', 'Gem noten');
    knap.type = 'button';
    knap.id = 'gem-dag-note';
    knap.addEventListener('click', function () { gemNote(dag, findes, felt.value); });

    boks.appendChild(felt);
    boks.appendChild(knap);

    if (findes) {
      var slet = lav('button', 'knap fare lille', 'Slet noten');
      slet.type = 'button';
      slet.addEventListener('click', function () {
        Admin.gem(Butik.skrive.sletKalender(findes.id), 'Noten er slettet.');
      });
      boks.appendChild(slet);
    }
    return boks;
  }

  function gemNote(dag, findes, tekst) {
    var ren = String(tekst || '').trim();
    /* En tom note er ingen note. Blev den gemt som en tom række,
       ville dagen bære et blyantsmærke uden noget bag. */
    if (!ren) {
      if (!findes) return Admin.brøl('Skriv noget i noten først.');
      return Admin.gem(Butik.skrive.sletKalender(findes.id), 'Noten er slettet.');
    }
    Admin.gem(Admin.skrivNote(dag, ren), 'Noten er gemt.');
  }

  /* ÉN VEJ IND I NOTEN, TO STEDER AT SKRIVE DEN.

     Overblik har feltet i køreplanen, kalenderen har det på dagen.
     De må ikke have hver sin skrivning: to steder at rette den
     samme sætning er to steder, der kan skride fra hinanden — og
     rækken kendes på sin TITEL, så en udgave, der glemmer den,
     laver en note om til et arrangement på dagen.

     ⚠️ Uden en id opretter den. Kalderen SKAL derfor hente
     listen igen efter en oprettelse, ellers ved næste gem ikke,
     at rækken findes, og laver én til. Se noten ved
     autogem-feltet i js/admin/overblik.js. */
  Admin.skrivNote = function (dag, tekst) {
    var findes = Admin.noteFor(dag);
    return Butik.skrive.kalender({
      id: findes ? findes.id : undefined,
      type: 'arrangement',
      dato: dag,
      titel: NOTE_TITEL,
      beskrivelse: String(tekst || '').trim(),
      emoji: '📝',
      offentlig: false,
    });
  };

  // Noten for en dag, så Overblik kan vise dagens uden at kende
  // formen. Se køreplanen i js/admin/overblik.js.
  Admin.noteFor = function (dag) {
    var fundet = null;
    (Admin.data && Admin.data.kalender || []).forEach(function (k) {
      if (k.dato === dag && erNote(k)) fundet = k;
    });
    return fundet;
  };

  /* ---- STÅR DAGEN ALLEREDE I KALENDEREN? ----

     Forespørgsler-fanen spørger om det: personalet skal selv
     oprette det aftalte selskab i kalenderen, og påmindelsen om
     det skal forsvinde, NÅR de har gjort det. En påmindelse, der
     bliver stående bagefter, lærer man at trykke forbi.

     ⚠️ NOTEN TIL DAGEN TÆLLER IKKE MED. Den er personalets egen
     huskeseddel og ligger i kalenderen som en intern
     arrangement-række (se NOTE_TITEL). Talte den med, ville en
     dag med "husk ekstra rugbrød" se ud, som om selskabet var
     oprettet.

     ⚠️ OG DEN SKAL SPØRGE HER, ikke i forespoergsler.js. Reglen
     for hvad en note er, og hvordan en flerdags-række dækker en
     dag (raekkerOver), bor i den her fil. To udgaver af det ville
     langsomt komme til at svare forskelligt.

     ⚠️ TRE SVAR, IKKE TO. undefined betyder "det ved vi ikke
     endnu" — Admin.data er ikke hentet. Svarede den nej dér,
     ville skærmen advare om en manglende kalenderrække et halvt
     sekund efter login, hver gang, også når den står der. En
     advarsel, der lyver ved hver indlæsning, er ingen advarsel.

     ⚠️ MEN "det ved vi ikke" er KUN Admin.data === null. Er
     data hentet uden en kalender-nøgle, ER kalenderen tom, og
     svaret er nej. Første udgave krævede også nøglen, og så
     svarede den undefined altid: påmindelsen kunne aldrig komme
     frem. Fundet af prøven, ikke ved at læse. */
  Admin.kalenderHar = function (dag) {
    if (!Admin.data) return undefined;
    if (!dag) return null;
    var fundet = null;
    (Admin.data.kalender || []).forEach(function (k) {
      if (fundet || erNote(k)) return;
      if (raekkerOver(k, dag)) fundet = k;
    });
    return fundet;
  };

  /* Åbner kalenderen på en bestemt dag. Fanen skifter, måneden
     følger med, og dagens panel står åbent — så knappen "Skriv
     den i kalenderen" lander dér, hvor arbejdet skal gøres, og
     ikke bare på fanen. */
  Admin.aabnDag = function (dag) {
    if (!dag) return;
    visAar = Number(dag.slice(0, 4));
    visMdr = Number(dag.slice(5, 7)) - 1;
    valgtDag = dag;
    var knap = document.querySelector('[data-panel="p-kalender"]');
    if (knap) knap.click();
    tegnMaaned();
  };

  function skift(antal) {
    saetMaaned();
    var d = new Date(Date.UTC(visAar, visMdr + antal, 1));
    visAar = d.getUTCFullYear();
    visMdr = d.getUTCMonth();
    tegnMaaned();
  }

  if ($('maaned-forrige')) {
    $('maaned-forrige').addEventListener('click', function () { skift(-1); });
    $('maaned-naeste').addEventListener('click', function () { skift(1); });
    $('maaned-idag').addEventListener('click', function () {
      visAar = null;
      valgtDag = idag();
      tegnMaaned();
    });
  }

  tegnTyper();
  visFelter();
  Admin.tegnere.push(tegnKalender);
  Admin.tegnere.push(tegnMaaned);
  /* Nettet lever af FANERNES lister, og de kommer ind efter
     login, ikke sammen med Butik.hent(). Uden den her stod
     månedens felter tomme, til nogen skiftede fane. */
  Admin.efterHent.push(tegnMaaned);
})();
