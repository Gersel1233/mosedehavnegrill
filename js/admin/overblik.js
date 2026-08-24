/* Fanen Overblik: vagtskærmen. Se js/admin/kerne.js for de to
   principper, der gælder i alle admin-filerne.

   DER STOD NOGET ANDET HER, OG DET ER VÆRD AT VIDE HVORFOR.

   Fanen var bygget om "hvad er tikket ind, mens jeg ikke kiggede",
   sorteret efter hvornår bestillingen KOM IND. Begrundelsen stod
   her: en bestilling til på fredag, der kom for en time siden,
   skal ses NU, for det er nu, der skal ringes og bekræftes.

   Den begrundelse faldt bort den 23/8. Bestilt er bestilt —
   auto_bekraeft er slået til som standard, og der ringes ikke
   længere for at bekræfte. Tilbage stod en rækkefølge uden en
   grund.

   MÅLT PÅ EN TRAVL DAG: klokken 13.00, fem bestillinger. Sara,
   der henter kl. 18.00, stod som nummer to — fordi hun havde
   bestilt ni minutter før. Køkkenet skulle læse fem kort igennem
   for at finde ud af, hvad der skulle laves først.

   Spørgsmålet under en vagt er: HVAD SKAL UD AF DØREN, OG HVORNÅR.
   Derfor står dagen nu i tidsrækkefølge. Det nye er stadig mærket
   som nyt; det bestemmer bare ikke længere rækkefølgen. Og det,
   der er tikket ind til en ANDEN dag, har sin egen boks — ellers
   ville en bestilling til på fredag forsvinde ud af syne, til
   fredag kom, og dét var den gamle rækkefølge god til.

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
  //  DAGENS ARBEJDE
  //  --------------------------------------------------------
  //  Alt, der skal ud af døren i dag, i tidsrækkefølge. Både
  //  bestillinger og borde: køkkenet skal vide, at der kommer
  //  seks personer kl. 18, på samme skærm som maden.
  //
  //  DET FÆRDIGE ER IKKE MED. En afhentet bestilling er ikke
  //  arbejde længere, og en afvist skal ikke laves. Stod de der,
  //  ville listen vokse hen over dagen, mens det, der skulle
  //  laves, blev skubbet ned.
  // ----------------------------------------------------------

  /* To timer frem. Kortere, og listen tømmer sig midt i en
     frokost. Længere, og "nu" holder op med at betyde noget:
     hele dagen står i den ene boks igen. */
  var SNART_MIN = 120;

  var FAERDIG = { afhentet: true, afvist: true, udeblevet: true };

  function tilMinutter(tid) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(tid || ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }

  function dagensArbejde() {
    var nu = Butik.nu();
    var ud = [];

    (Admin.lister.bestillinger || []).forEach(function (b) {
      if (b.slettet || FAERDIG[b.status]) return;
      if (b.hent_dato !== nu.dato) return;
      ud.push({
        min: tilMinutter(b.hent_tid),
        tid: String(b.hent_tid || '').slice(0, 5).replace(':', '.'),
        navn: b.navn,
        hvad: (b.linjer || []).map(function (l) {
          return l.antal + ' × ' + l.navn;
        }).join(' · ') || (b.antal || 0) + ' stk.',
        /* Leveringen skal ses her OGSÅ. En bestilling, der skal
           køres ud, har en afgang og ikke et afhentningstidspunkt
           — ser køkkenet den som en almindelig afhentning, står
           maden klar ved lugen, mens gæsten venter derhjemme. */
        /* BORDET SLÅR "SPIS HER". En bestilling fra en QR-kode
           ER spis her, så to mærker ville sige det samme to
           gange — og det ene af dem siger MERE: hvor maden skal
           hen. Står der bare "Spis her", skal personalet gætte,
           hvem der har bestilt, og gå rundt med en bakke. */
        /* TAPASFADET SLÅR RESTEN. Et fad til tolv er dagens
           største stykke arbejde, og det skal ses på vagtskærmen,
           før nogen begynder på en pølse. */
        maerke: Admin.erTapas(b) ? '🧀 Tapasfad'
          : b.bord_nummer ? '🍽️ Bord ' + b.bord_nummer
            : b.hvordan === 'levering' ? '🚗 Leveres'
              : b.hvordan === 'spis_her' ? 'Spis her' : '',
        ny: b.status === 'ny',
        fane: 'p-bestillinger', faneNavn: 'Bestillinger',
      });
    });

    (Admin.lister.borde || []).forEach(function (b) {
      if (b.slettet || b.status === 'afvist' || b.status === 'udeblevet') return;
      if (b.dato !== nu.dato) return;
      ud.push({
        min: tilMinutter(b.tid),
        tid: String(b.tid || '').slice(0, 5).replace(':', '.'),
        navn: b.navn,
        hvad: (b.antal_personer || '?') + ' personer',
        maerke: '🍽️ Bord',
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

  function tegnVagt() {
    var boks = $('overblik-vagt');
    if (!boks) return;
    Admin.tøm(boks);

    var nu = Butik.nu();
    var alle = dagensArbejde();

    /* "Snart" er alt, der ikke er overstået, indtil to timer frem.
       DET OVERSKREDNE BLIVER I DEN ØVERSTE BOKS: en gæst, der
       skulle have hentet kl. 13.15, og som ikke har, er ikke
       mindre vigtig kl. 13.20 — hun er mere. */
    var snart = [], senere = [];
    alle.forEach(function (r) {
      if (r.min === null || r.min <= nu.minutter + SNART_MIN) snart.push(r);
      else senere.push(r);
    });

    var manchet = $('vagt-manchet');
    if (manchet) {
      var kl = Math.floor(nu.minutter / 60) + '.'
        + String(nu.minutter % 60).padStart(2, '0');
      manchet.textContent = alle.length
        ? 'Klokken er ' + kl + '. ' + alle.length
          + (alle.length === 1 ? ' ting' : ' ting') + ' tilbage i dag.'
        : 'Klokken er ' + kl + '.';
    }

    if (!snart.length) {
      /* Tomt er et SVAR, ikke en tom skærm. Står der ingenting,
         tror man, siden ikke virker — og så begynder nogen at
         genindlæse i stedet for at passe forretningen. */
      boks.appendChild(lav('p', 'vare-tekst', senere.length
        ? 'Ikke noget de næste par timer. Det næste står nedenfor.'
        : 'Der er ikke mere i dag.'));
    } else {
      snart.forEach(function (r) { boks.appendChild(vagtRaekke(r, nu)); });
    }

    var senereKort = $('vagt-senere-kort');
    var senereBoks = $('overblik-senere');
    if (senereKort && senereBoks) {
      Admin.tøm(senereBoks);
      senereKort.classList.toggle('skjult', !senere.length);
      senere.forEach(function (r) { senereBoks.appendChild(vagtRaekke(r, nu)); });
    }
  }

  function vagtRaekke(r, nu) {
    var overskredet = r.min !== null && r.min < nu.minutter;
    var k = lav('div', 'vagt-raekke' + (overskredet ? ' overskredet' : ''));

    var tid = lav('div', 'vagt-tid', r.tid || '—');
    k.appendChild(tid);

    var midt = lav('div', 'vagt-midt');
    var linje = lav('div', 'bestil-hvem');
    linje.appendChild(lav('span', 'vare-navn', r.navn));
    if (r.ny) linje.appendChild(lav('span', 'maerke m-ny', 'Ny'));
    if (r.maerke) linje.appendChild(lav('span', 'maerke favorit', r.maerke));
    if (overskredet) linje.appendChild(lav('span', 'maerke m-ny', 'Overskredet'));
    midt.appendChild(linje);
    midt.appendChild(lav('div', 'vare-tekst', r.hvad));
    k.appendChild(midt);

    /* En knap og ikke et link: der skiftes fane på siden, der
       hoppes ikke til en adresse. Et <a href="#"> ville se ens ud
       og opføre sig forkert med tastaturet. */
    var aabn = lav('button', 'nyt-aabn', r.faneNavn + ' →');
    aabn.type = 'button';
    aabn.addEventListener('click', function () {
      Admin.visFane(r.fane);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    k.appendChild(aabn);
    return k;
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
        dato: b.hent_dato,
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
        dato: b.dato,
        naar: Admin.pænDato(b.dato) + ' kl. '
          + String(b.tid || '').slice(0, 5).replace(':', '.'),
        fane: 'p-borde',
        faneNavn: 'Åbn bordene',
      });
    });

    (Admin.lister.udlejninger || []).forEach(function (u) {
      var min = minutterSiden(u.oprettet);
      if (min === null || min * 60000 > VINDUE_MS) return;
      ud.push({
        min: min,
        navn: u.navn,
        ny: u.status === 'ny',
        hvad: 'Baglokalet'
          + (u.antal_personer ? ' · ' + u.antal_personer + ' personer' : ''),
        dato: u.dato,
        naar: Admin.pænDato(u.dato),
        fane: 'p-lokale',
        faneNavn: 'Åbn baglokalet',
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
        dato: f.dato || null,
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

    /* Kun det, der gælder en ANDEN dag. Dagens ting står allerede
       øverst i tidsrækkefølge, og to kort om den samme bestilling
       er ikke to oplysninger — det er én oplysning, man skal
       regne ud er den samme. */
    var iDag = Butik.nu().dato;
    var liste = nyligt().filter(function (n) { return n.dato !== iDag; });

    var kort = $('vagt-nyt-kort');
    if (kort) kort.classList.toggle('skjult', !liste.length);

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
    var lokale = Admin.lister.udlejninger || [];

    var iDag = best.filter(function (b) { return b.hent_dato === i_dag; });
    var stykker = iDag.reduce(function (s, b) { return s + (b.antal || 0); }, 0);

    [
      /* "ikke bekræftet endnu" stod her, dengang hver bestilling
         ventede på et opkald. Bestilt er bestilt nu (23/8), og
         det samme gælder bordene: tallet er dem, køkkenet ikke
         har set på endnu — ikke dem, gæsten venter på svar om. */
      ['Nye bestillinger', best.filter(function (b) { return b.status === 'ny'; }).length,
        'ikke set på endnu'],
      ['Til afhentning i dag', iDag.length, 'uanset status'],
      ['Stykker i dag', stykker, 'lagt sammen'],
      ['Nye forespørgsler', fore.filter(function (f) { return f.status === 'ny'; }).length,
        'der skal ringes'],
      ['Nye bookinger', borde.filter(function (b) { return b.status === 'ny'; }).length,
        'ikke set på endnu'],
      ['Baglokalet', lokale.filter(function (u) { return u.status === 'ny'; }).length,
        'ønsker der skal ringes om'],
    ].forEach(function (t) {
      var f = lav('div', 'tal-felt');
      f.appendChild(lav('div', 'tal-navn', t[0]));
      f.appendChild(lav('div', 'tal-tal', t[1]));
      f.appendChild(lav('div', 'tal-note', t[2]));
      boks.appendChild(f);
    });
  }

  function tegnOverblik() {
    tegnVagt();
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
