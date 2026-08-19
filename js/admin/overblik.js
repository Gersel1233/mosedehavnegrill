/* Fanen Overblik: hvad er lige kommet ind, og hvad gælder i dag.
   Se js/admin/kerne.js for de to principper, der gælder i alle
   admin-filerne.

   DEN HER FANE ER LANDINGSSIDEN, og spørgsmålet, den svarer på, er
   ikke "hvad skal der laves i dag". Det er "hvad er tikket ind,
   mens jeg ikke kiggede".

   De to er ikke det samme, og forskellen er hele pointen: en
   bestilling til på fredag, der kom for en time siden, skal ses
   NU — det er nu, der skal ringes og bekræftes. Sorterede vi efter
   hentedag, ville den ligge nederst i fire dage.

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

  // ----------------------------------------------------------
  //  LIGE MODTAGET
  // ----------------------------------------------------------
  function nyligt() {
    var ud = [];

    (Admin.lister.bestillinger || []).forEach(function (b) {
      var min = minutterSiden(b.oprettet);
      if (min === null || min * 60000 > VINDUE_MS) return;
      ud.push({
        min: min,
        navn: b.navn,
        ny: b.status === 'ny',
        hvad: (b.linjer || []).map(function (l) {
          return l.antal + ' × ' + l.navn;
        }).join(' · ') || (b.antal + ' stk.'),
        naar: Admin.pænDato(b.hent_dato) + ' kl. '
          + String(b.hent_tid || '').slice(0, 5).replace(':', '.'),
        fane: 'p-bestillinger',
        faneNavn: 'Åbn bestillingerne',
      });
    });

    (Admin.lister.borde || []).forEach(function (b) {
      var min = minutterSiden(b.oprettet);
      if (min === null || min * 60000 > VINDUE_MS) return;
      ud.push({
        min: min,
        navn: b.navn,
        ny: b.status === 'ny',
        hvad: 'Bord · ' + b.antal_personer + ' personer',
        naar: Admin.pænDato(b.dato) + ' kl. '
          + String(b.tid || '').slice(0, 5).replace(':', '.'),
        fane: 'p-borde',
        faneNavn: 'Åbn bordene',
      });
    });

    (Admin.lister.forespoergsler || []).forEach(function (f) {
      var min = minutterSiden(f.oprettet);
      if (min === null || min * 60000 > VINDUE_MS) return;
      var navne = { catering: 'Catering', baglokale: 'Baglokale', selskab: 'Selskab' };
      ud.push({
        min: min,
        navn: f.navn,
        ny: f.status === 'ny',
        hvad: (navne[f.type] || f.type)
          + (f.antal_personer ? ' · ' + f.antal_personer + ' personer' : ''),
        naar: f.dato ? Admin.pænDato(f.dato) : 'Dato ikke oplyst',
        fane: 'p-forespoergsler',
        faneNavn: 'Åbn forespørgslerne',
      });
    });

    return ud.sort(function (a, b) { return a.min - b.min; });
  }

  function tegnNyligt() {
    var boks = $('overblik-nyt');
    if (!boks) return;
    Admin.tøm(boks);

    var liste = nyligt();
    if (!liste.length) {
      /* Tomt er et SVAR, ikke en tom skærm. Står der ingenting,
         tror man, siden ikke virker — og så begynder nogen at
         genindlæse i stedet for at passe forretningen. */
      boks.appendChild(lav('p', 'vare-tekst',
        'Der er ikke kommet noget de sidste tre timer.'));
      return;
    }

    liste.forEach(function (n) {
      var k = lav('div', 'nyt-kort');
      k.appendChild(lav('div', 'nyt-hvornaar', hvornårTekst(n.min)));

      var linje = lav('div', 'bestil-hvem');
      linje.appendChild(lav('span', 'vare-navn', n.navn));
      if (n.ny) linje.appendChild(lav('span', 'maerke m-ny', 'Ny'));
      k.appendChild(linje);

      k.appendChild(lav('div', 'vare-tekst', n.hvad));
      k.appendChild(lav('div', 'nyt-naar', n.naar));

      /* En knap og ikke et link: der skiftes fane på siden, der
         hoppes ikke til en adresse. Et <a href="#"> ville se ens
         ud og opføre sig forkert med tastaturet. */
      var aabn = lav('button', 'nyt-aabn', n.faneNavn + ' →');
      aabn.type = 'button';
      aabn.addEventListener('click', function () {
        Admin.visFane(n.fane);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      k.appendChild(aabn);

      boks.appendChild(k);
    });
  }

  // ----------------------------------------------------------
  //  I DAG
  //  --------------------------------------------------------
  //  Kun tal, vi FAKTISK har. Der er ingen kasse og ingen
  //  omsætning i det her system — der er det, gæsterne har sendt
  //  gennem hjemmesiden. Et tal, der ligner en omsætning uden at
  //  være det, er værre end intet tal.
  // ----------------------------------------------------------
  function tegnTal() {
    var boks = $('overblik-tal');
    if (!boks) return;
    Admin.tøm(boks);

    var i_dag = Butik.nu().dato;
    var best = Admin.lister.bestillinger || [];
    var fore = Admin.lister.forespoergsler || [];
    var borde = Admin.lister.borde || [];

    var iDag = best.filter(function (b) { return b.hent_dato === i_dag; });
    var stykker = iDag.reduce(function (s, b) { return s + (b.antal || 0); }, 0);

    [
      ['Nye bestillinger', best.filter(function (b) { return b.status === 'ny'; }).length,
        'ikke bekræftet endnu'],
      ['Til afhentning i dag', iDag.length, 'uanset status'],
      ['Stykker i dag', stykker, 'lagt sammen'],
      ['Nye forespørgsler', fore.filter(function (f) { return f.status === 'ny'; }).length,
        'der skal ringes'],
      ['Bordønsker der venter', borde.filter(function (b) { return b.status === 'ny'; }).length,
        'der skal bekræftes'],
    ].forEach(function (t) {
      var f = lav('div', 'tal-felt');
      f.appendChild(lav('div', 'tal-navn', t[0]));
      f.appendChild(lav('div', 'tal-tal', t[1]));
      f.appendChild(lav('div', 'tal-note', t[2]));
      boks.appendChild(f);
    });
  }

  function tegnOverblik() {
    tegnNyligt();
    tegnTal();
  }

  /* Overblik tegnes, hver gang en fane melder nye data ind — og
     én gang ved login, hvis der slet ikke kom noget (fx fordi
     begge kald fejlede). Ellers stod siden tom uden at sige
     hvorfor. */
  Admin.efterHent.push(tegnOverblik);
  Admin.vedLogin.push(tegnOverblik);
})();
