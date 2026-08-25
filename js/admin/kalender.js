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
  }

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
    }), 'Lagt i kalenderen.').then(function () {
      ['kal-dato', 'kal-slut', 'kal-titel', 'kal-emoji', 'kal-tid'].forEach(function (id) {
        $(id).value = '';
      });
      $('kal-offentlig').checked = false;
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

  function tegnMaaned() {
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
    tegnDag();
  }

  function dagFelt(dag, nr, iDag) {
    var ting = dagensTing(dag);
    var felt = lav('button', 'maaned-dag');
    felt.type = 'button';
    felt.setAttribute('data-dag', dag);
    if (dag === iDag) felt.classList.add('er-idag');
    if (dag === valgtDag) felt.classList.add('valgt');
    if (ting.lukket) felt.classList.add('er-lukket');

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
  function tegnDag() {
    var boks = $('dag-panel');
    if (!boks) return;
    Admin.tøm(boks);
    if (!valgtDag) return;

    var ting = dagensTing(valgtDag);
    var kort = lav('div', 'dag-kort');
    kort.appendChild(lav('h3', 'dag-titel', Admin.pænDato(valgtDag)));

    if (ting.lukket) {
      kort.appendChild(lav('p', 'dag-lukket',
        'Der er LUKKET — ' + ting.lukket.titel + '. Gæsterne kan ikke bestille.'));
    } else if (ting.tidligt) {
      kort.appendChild(lav('p', 'dag-lukket',
        'Lukker kl. ' + String(ting.tidligt.lukker_kl || '').slice(0, 5)
        + ' — ' + ting.tidligt.titel + '.'));
    }

    kort.appendChild(noteFelt(valgtDag, ting.noter[0]));

    var noget = false;
    [
      ['Bestillinger', ting.bestillinger, 'p-bestillinger', function (b) {
        return (b.hent_tid || '').slice(0, 5) + ' · ' + b.navn
          + ' · ' + (b.antal || 0) + ' stk.';
      }],
      ['Borde', ting.borde, 'p-borde', function (b) {
        return (b.tid || '').slice(0, 5) + ' · ' + b.navn
          + ' · ' + (b.antal_personer || 0) + ' pers.';
      }],
      ['Forespørgsler', ting.forespoergsler, 'p-forespoergsler', function (f) {
        /* antal_personer, IKKE antal. Det har kostet en runde før
           (se CLAUDE.md): bordene, forespørgslerne og
           udlejningerne hedder alle antal_personer, og et
           forkert feltnavn er tavst — der står bare ingenting. */
        return f.navn + ' · ' + (f.slags || '')
          + (f.antal_personer ? ' · ' + f.antal_personer + ' pers.' : '');
      }],
      ['Baglokalet', ting.udlejninger, 'p-lokale', function (u) {
        return u.navn + (u.antal_personer ? ' · ' + u.antal_personer + ' pers.' : '');
      }],
      ['I kalenderen', ting.arrangementer, 'p-kalender', function (k) {
        return (k.emoji ? k.emoji + ' ' : '') + k.titel
          + (k.offentlig ? '' : ' (kun her)');
      }],
    ].forEach(function (g) {
      if (!g[1].length) return;
      noget = true;
      kort.appendChild(lav('div', 'eyebrow luft-top', g[0]));
      g[1].forEach(function (r) {
        var linje = lav('div', 'dag-linje');
        linje.appendChild(lav('span', null, g[3](r)));
        if (r.status) linje.appendChild(lav('span', 'dag-status', r.status));
        kort.appendChild(linje);
      });
      // Vejen hen til fanen, hvor tingen kan rettes.
      var knap = lav('button', 'knap lille', 'Åbn ' + g[0].toLowerCase() + ' →');
      knap.type = 'button';
      knap.addEventListener('click', function () { Admin.visFane(g[2]); });
      kort.appendChild(knap);
    });

    if (!noget) {
      kort.appendChild(lav('p', 'vare-tekst luft-top',
        'Der er ikke andet på dagen endnu.'));
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
    Admin.gem(Butik.skrive.kalender({
      id: findes ? findes.id : undefined,
      type: 'arrangement',
      dato: dag,
      titel: NOTE_TITEL,
      beskrivelse: ren,
      emoji: '📝',
      offentlig: false,
    }), 'Noten er gemt.');
  }

  // Noten for en dag, så Overblik kan vise dagens uden at kende
  // formen. Se køreplanen i js/admin/overblik.js.
  Admin.noteFor = function (dag) {
    var fundet = null;
    (Admin.data && Admin.data.kalender || []).forEach(function (k) {
      if (k.dato === dag && erNote(k)) fundet = k;
    });
    return fundet;
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
