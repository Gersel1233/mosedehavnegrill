/* Fanen Salg. Se js/admin/kerne.js for de to principper, der
   gælder i alle admin-filerne.

   TO TING, TALLENE IKKE ER, og begge skal stå på skærmen:

   1) Det er ikke butikkens omsætning. Der er ingen kasse i det her
      system. Det er, hvad gæsterne har bestilt gennem hjemmesiden
      — købet ved lugen er ikke med.

   2) En bestilling er ikke et salg, før maden er ud ad døren. Den
      kan blive afvist, aflyst eller aldrig hentet. Derfor tæller
      kun status AFHENTET med, ligesom spiis først tæller, når der
      er trykket kørt.

   Et tal, der ligner en omsætning uden at være det, er værre end
   intet tal — ejeren tager beslutninger på det.

   Fanen henter for sig og ikke i Admin.genindlæs(): et regnskab
   skal se en måned tilbage, hvor bestillingsfanen kun tager fra i
   går. Samme tabel, to spørgsmål, to vinduer. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var PERIODER = [
    { id: 'i-dag', navn: 'I dag', note: 'siden midnat' },
    { id: 'uge', navn: 'Denne uge', note: 'fra mandag' },
    { id: 'maaned', navn: 'Denne måned', note: 'fra den 1.' },
  ];

  var valgt = 'i-dag';
  var salg = [];
  var udeblivelser = [];

  /* Fra og med hvilken dato? Regnet i dansk tid gennem Butik.nu(),
     ikke på browserens ur: en telefon sat til New York må ikke
     kunne flytte en ugegrænse. */
  function fraDato() {
    var t = Butik.nu();
    if (valgt === 'i-dag') return t.dato;

    if (valgt === 'uge') {
      // Butik.nu().ugedag er 0 = mandag, så tallet ER antal dage
      // ind i ugen. Det er derfor, ugedagen tælles sådan.
      var d = new Date(t.dato + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - t.ugedag);
      return d.toISOString().slice(0, 10);
    }
    return t.dato.slice(0, 8) + '01';
  }

  function iPerioden() {
    var fra = fraDato();
    return salg.filter(function (b) {
      return b.hent_dato >= fra && b.status === 'afhentet';
    });
  }

  // ----------------------------------------------------------
  //  TEGN
  // ----------------------------------------------------------
  function tegnPerioder() {
    var boks = $('salg-perioder');
    if (!boks) return;
    Admin.tøm(boks);

    PERIODER.forEach(function (p) {
      var knap = lav('button', 'type-knap' + (p.id === valgt ? ' valgt' : ''));
      knap.type = 'button';
      knap.dataset.periode = p.id;
      knap.setAttribute('aria-pressed', p.id === valgt ? 'true' : 'false');
      knap.appendChild(lav('span', 'type-navn', p.navn));
      knap.appendChild(lav('span', 'type-note', p.note));
      knap.addEventListener('click', function () {
        valgt = p.id;
        tegnSalg();
      });
      boks.appendChild(knap);
    });
  }

  function tegnTal() {
    var boks = $('salg-tal');
    if (!boks) return;
    Admin.tøm(boks);

    var liste = iPerioden();
    var kroner = 0;
    var stykker = 0;

    liste.forEach(function (b) {
      stykker += b.antal || 0;
      (b.linjer || []).forEach(function (l) {
        /* En vare uden pris tæller 0 og ikke "ingenting". De fire
           "ca."-priser står tomme med vilje på menukortet, og en
           bestilling med dem i giver derfor et tal, der er for
           lavt — ikke et tal, der mangler. Noten nedenunder siger
           det, så ingen tror, kroner og stykker altid følges ad. */
        kroner += (Number(l.pris) || 0) * (Number(l.antal) || 0);
      });
    });

    [
      ['Solgt for', Butik.pris(kroner), 'kun afhentede'],
      ['Bestillinger', liste.length, 'afhentet i perioden'],
      ['Stykker', stykker, 'lagt sammen'],
    ].forEach(function (t) {
      var f = lav('div', 'tal-felt');
      f.appendChild(lav('div', 'tal-navn', t[0]));
      f.appendChild(lav('div', 'tal-tal', t[1]));
      f.appendChild(lav('div', 'tal-note', t[2]));
      boks.appendChild(f);
    });
  }

  function tegnVarer() {
    var boks = $('salg-varer');
    if (!boks) return;
    Admin.tøm(boks);

    var tael = {};
    iPerioden().forEach(function (b) {
      (b.linjer || []).forEach(function (l) {
        var navn = l.navn || 'Uden navn';
        tael[navn] = (tael[navn] || 0) + (Number(l.antal) || 0);
      });
    });

    var raekker = Object.keys(tael).map(function (navn) {
      return { navn: navn, antal: tael[navn] };
    }).sort(function (a, b) { return b.antal - a.antal; });

    if (!raekker.length) {
      boks.appendChild(lav('p', 'vare-tekst',
        'Der er ikke hentet noget i perioden endnu.'));
      return;
    }

    raekker.slice(0, 10).forEach(function (r) {
      var linje = lav('div', 'admin-raekke');
      linje.appendChild(lav('span', 'navn', r.navn));
      linje.appendChild(lav('span', 'vare-navn', r.antal + ' stk.'));
      boks.appendChild(linje);
    });
  }

  /* ----------------------------------------------------------
     UDEBLIVELSERNE
     ----------------------------------------------------------
     To ting, og de svarer på hver sit spørgsmål:

     · Tallet for PERIODEN (samme valg som resten af fanen):
       hvor meget mad blev lavet forgæves for nylig?

     · GÆNGERNE, altid 180 dage tilbage uanset perioden: hvilke
       numre bliver ved? Nummeret samles på de sidste otte cifre
       — +45 og mellemrum er indpakning — og listen viser kun
       numre med mere end én udeblivelse: én gang er et uheld,
       og et opslag over folks enkeltuheld er ikke et værktøj,
       det er en gabestok.

     Udeblivelser tæller ALDRIG i omsætningen — iPerioden()
     filtrerer på 'afhentet', og det er hele pointen med at have
     ordet som sin egen status. */
  function tegnUdeblivelser() {
    var boks = $('salg-udeblivelser');
    if (!boks) return;
    Admin.tøm(boks);

    var fra = fraDato();
    var antal = salg.filter(function (b) {
      return b.hent_dato >= fra && b.status === 'udeblevet';
    }).length;

    var f = lav('div', 'tal-felt');
    f.appendChild(lav('div', 'tal-navn', 'Udeblivelser'));
    f.appendChild(lav('div', 'tal-tal', String(antal)));
    f.appendChild(lav('div', 'tal-note', 'i perioden — tæller ikke som salg'));
    boks.appendChild(f);

    var tael = {};
    udeblivelser.forEach(function (u) {
      var n = String(u.telefon || '').replace(/\D/g, '').slice(-8);
      if (n) tael[n] = (tael[n] || 0) + 1;
    });
    var gaengere = Object.keys(tael)
      .filter(function (n) { return tael[n] >= 2; })
      .sort(function (a, b) { return tael[b] - tael[a]; });

    if (!gaengere.length) {
      boks.appendChild(lav('p', 'vare-tekst',
        'Ingen numre med flere udeblivelser de sidste 180 dage. '
        + 'Sæt en bestilling til "Udeblevet" på Bestillinger-fanen, '
        + 'når maden var klar, og ingen kom.'));
      return;
    }

    gaengere.forEach(function (n) {
      var linje = lav('div', 'vare-linje');
      linje.appendChild(lav('strong', null, n));
      linje.appendChild(lav('span', 'vare-tekst',
        ' — udeblevet ' + tael[n] + ' gange de sidste 180 dage'));
      boks.appendChild(linje);
    });
  }

  function tegnSalg() {
    tegnPerioder();
    tegnTal();
    tegnVarer();
    tegnUdeblivelser();
  }

  function hentSalg() {
    return Butik.hentUdeblivelser().then(function (liste) {
      udeblivelser = liste || [];
    }).catch(function () { udeblivelser = []; })
      .then(function () { return Butik.hentSalg(); })
      .then(function (liste) {
      salg = liste || [];
      tegnSalg();
    }).catch(function (e) {
      /* Fejlen skjules IKKE. Et tomt salgstal ligner nul salg, og
         nul salg er en oplysning, ejeren ville handle på. */
      var boks = $('salg-tal');
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Salgstallene kunne ikke hentes: ' + (e.message || e)
        + ' Log ud og ind igen, eller prøv om lidt.'));
      if (window.console) console.warn('salg:', e);
    });
  }

  Admin.vedLogin.push(hentSalg);

  /* Regnskabet hentes igen, hver gang fanen åbnes. Det står ikke i
     Admin.friske: salget flytter sig kun, når en bestilling bliver
     AFHENTET, og det sker ved lugen — ikke femten gange i timen.
     Men står ejeren og skifter en bestilling til afhentet på
     nabofanen og går herover for at se tallet, SKAL det være det
     nye tal. Ellers tror han, knappen ikke virkede. */
  Admin.hentVedFane('p-salg', hentSalg);
})();
