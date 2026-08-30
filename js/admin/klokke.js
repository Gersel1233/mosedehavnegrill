/* ============================================================
   KLOKKEN: HVAD ER KOMMET IND, MENS INGEN KIGGEDE  (30/8)
   ------------------------------------------------------------
   Kundens ord: "historik er fint, men skal gøres bedre både
   teknisk og placeringen skal være en klokke oppe i højre
   hjørne ... og virke for mosedehavnecafeen."

   ⚠️ DEN ER IKKE EN NY DATAKILDE. Den læser de lister, fanerne
   allerede har meldt ind — bestillinger, forespørgsler, borde,
   udlejninger og reservationer — og samler dem ét sted. En klokke
   med sin EGEN hentning kunne sige noget andet end fanen ved
   siden af, og så holder man op med at stole på tallet.

   ⚠️ OG "LÆST" ER DENNE BROWSERS EGEN. Der findes ikke en kolonne
   for det, og en, der blev delt, ville betyde, at den første
   medarbejder, der åbnede klokken om morgenen, slukkede den for
   alle andre. Det står i localStorage med rækkens id, så en
   iPad i køkkenet og en telefon i lugen kan have hver sin.

   ⚠️ TALLET TÆLLER DET ULÆSTE, IKKE DET NYE. En bestilling, der
   er sat til "bekræftet" af nogen, er set — og skal ikke blive
   ved med at råbe. Derfor er en række læst, når enten nogen har
   trykket på den ELLER den er flyttet videre fra "ny".
   ============================================================ */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;
  var NØGLE = 'mosede_klokke_laest';

  function læste() {
    try { return JSON.parse(localStorage.getItem(NØGLE)) || {}; }
    catch (e) { return {}; }
  }
  function gemLæst(sæt) {
    try { localStorage.setItem(NØGLE, JSON.stringify(sæt)); }
    catch (e) { /* privat vindue — klokken virker, den husker bare ikke */ }
  }

  /* Hver slags med sit tegn, sin fane og sin egen sætning. Teksten
     siger HVAD der er kommet ind, ikke hvad tabellen hedder. */
  function poster() {
    var L = Admin.lister || {};
    var ud = [];

    (L.bestillinger || []).forEach(function (b) {
      if (b.slettet || b.status !== 'ny') return;
      var bord = b.bord_nummer;
      ud.push({
        id: 'b' + b.id,
        tegn: bord ? '🍽️' : '🥡',
        titel: (bord ? 'Bord ' + bord + ': ' : 'Ny bestilling: ')
          + linjeTekst(b),
        under: b.navn + ' · ' + Admin.pænDato(b.hent_dato)
          + (b.hent_tid ? ' kl. ' + String(b.hent_tid).slice(0, 5) : ''),
        dato: b.hent_dato,
        naar: b.oprettet,
        fane: bord ? 'p-koekken' : 'p-bestillinger',
      });
    });

    (L.forespoergsler || []).forEach(function (f) {
      if (f.slettet || f.status !== 'ny') return;
      ud.push({
        id: 'f' + f.id,
        tegn: '💬',
        titel: 'Ny forespørgsel: ' + (TYPER[f.type] || f.type),
        under: f.navn + (f.antal_personer ? ' · ' + f.antal_personer + ' pers.' : ''),
        dato: f.dato,
        naar: f.oprettet,
        fane: 'p-forespoergsler',
      });
    });

    (L.borde || []).forEach(function (b) {
      if (b.slettet || b.status !== 'ny') return;
      ud.push({
        id: 'k' + b.id,
        tegn: '📅',
        titel: 'Ny bordbestilling: ' + (b.antal_personer || '?') + ' pers.',
        under: b.navn + ' · ' + Admin.pænDato(b.dato)
          + (b.tid ? ' kl. ' + String(b.tid).slice(0, 5) : ''),
        dato: b.dato,
        naar: b.oprettet,
        fane: 'p-borde',
      });
    });

    (L.udlejninger || []).forEach(function (u) {
      if (u.slettet || u.status !== 'ny') return;
      ud.push({
        id: 'u' + u.id,
        tegn: '🔑',
        titel: 'Baglokalet: ' + u.navn,
        under: Admin.pænDato(u.dato)
          + (u.antal_personer ? ' · ' + u.antal_personer + ' pers.' : ''),
        dato: u.dato,
        naar: u.oprettet,
        fane: 'p-baglokale',
      });
    });

    (L.reservationer || []).forEach(function (r) {
      if (r.slettet || r.status !== 'ny') return;
      ud.push({
        id: 'r' + r.id,
        tegn: '🎉',
        titel: 'Ny tilmelding: ' + (r.antal_personer || 1) + ' pers.',
        under: r.navn,
        dato: null,
        naar: r.oprettet,
        fane: 'p-tilmeldinger',
      });
    });

    /* Nyeste øverst. Uden et oprettelsestidspunkt står rækken
       sidst — den er der stadig, den har bare ikke et sted i
       rækkefølgen. */
    return ud.sort(function (a, b) {
      return String(b.naar || '').localeCompare(String(a.naar || ''));
    });
  }

  var TYPER = {
    selskab: 'selskab', catering: 'catering',
    baglokale: 'baglokalet', frokost: 'frokostordning',
  };

  function linjeTekst(b) {
    var l = (b.linjer || [])[0];
    if (!l) return 'ingen linjer';
    var mere = (b.linjer || []).length - 1;
    return l.antal + ' × ' + l.navn + (mere > 0 ? ' + ' + mere + ' mere' : '');
  }

  /* ============================================================
     ⚠️ GRUPPERET PÅ DEN DAG, DET GÆLDER — ikke på den dag, det
     kom ind. Forlægget gør det, og grunden er god: personalet
     planlægger efter hvornår maden skal ud, ikke efter hvornår
     bestillingen blev tastet. Rækker uden en dato står under
     "Dato ikke fastlagt" — en forespørgsel om et selskab "engang
     til foråret" har ingen.
     ============================================================ */
  function tegn() {
    var liste = poster();
    var sæt = læste();
    var nye = liste.filter(function (p) { return !sæt[p.id]; });

    var tal = $('klokke-tal');
    if (tal) {
      tal.textContent = String(nye.length);
      tal.classList.toggle('skjult', !nye.length);
    }
    var knap = $('klokke-knap');
    if (knap) knap.classList.toggle('har-nyt', !!nye.length);

    var boks = $('klokke-liste');
    if (!boks) return;
    Admin.tøm(boks);

    var note = $('klokke-note');
    if (note) {
      note.textContent = 'Klokken er denne enheds egen. Markerer du noget som '
        + 'læst her, står det stadig på fanerne — det forsvinder ikke.';
    }

    if (!liste.length) {
      boks.appendChild(lav('p', 'vare-tekst tom-plads',
        'Ingenting nyt lige nu. Klokken siger til, når der kommer noget ind.'));
    }

    var grupper = {};
    var orden = [];
    liste.forEach(function (p) {
      var n = p.dato || '';
      if (!grupper[n]) { grupper[n] = []; orden.push(n); }
      grupper[n].push(p);
    });

    orden.forEach(function (dag) {
      var hoved = lav('div', 'klokke-dag');
      hoved.appendChild(lav('span', null,
        dag ? Admin.pænDato(dag) : '📅 Dato ikke fastlagt'));
      var ulæstIDag = grupper[dag].filter(function (p) { return !sæt[p.id]; }).length;
      if (ulæstIDag) hoved.appendChild(lav('span', 'klokke-dag-tal', String(ulæstIDag)));
      boks.appendChild(hoved);

      grupper[dag].forEach(function (p) {
        var r = lav('div', 'klokke-post' + (sæt[p.id] ? ' laest' : ''));
        r.setAttribute('data-post', p.id);

        var t = lav('span', 'klokke-tegn', p.tegn);
        t.setAttribute('aria-hidden', 'true');
        r.appendChild(t);

        var midt = lav('div', 'klokke-midt');
        midt.appendChild(lav('b', null, p.titel));
        midt.appendChild(lav('div', 'vare-tekst', p.under));
        r.appendChild(midt);

        /* Pilen ÅBNER fanen og markerer som læst i samme tryk —
           man har jo set den. ✕ markerer kun som læst. */
        var aabn = lav('button', 'klokke-aabn', '→');
        aabn.type = 'button';
        aabn.setAttribute('aria-label', 'Åbn ' + p.titel);
        aabn.addEventListener('click', function () {
          markér(p.id);
          luk();
          Admin.visFane(p.fane);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        r.appendChild(aabn);

        var vaek = lav('button', 'klokke-vaek', '✕');
        vaek.type = 'button';
        vaek.setAttribute('aria-label', 'Markér som læst');
        vaek.addEventListener('click', function () { markér(p.id); });
        r.appendChild(vaek);

        boks.appendChild(r);
      });
    });

    var veje = $('klokke-veje');
    if (veje) {
      Admin.tøm(veje);
      [['📦 Bestillinger', 'p-bestillinger'], ['📅 Borde', 'p-borde'],
        ['🕐 Historik', 'p-historik']].forEach(function (v) {
        var k = lav('button', 'klokke-vej', v[0]);
        k.type = 'button';
        k.addEventListener('click', function () {
          luk();
          Admin.visFane(v[1]);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        veje.appendChild(k);
      });
    }
  }

  function markér(id) {
    var sæt = læste();
    sæt[id] = true;
    gemLæst(sæt);
    tegn();
  }

  function luk() {
    var lag = $('klokke-lag');
    if (lag) lag.classList.add('skjult');
    var knap = $('klokke-knap');
    if (knap) knap.setAttribute('aria-expanded', 'false');
  }

  if ($('klokke-knap')) {
    $('klokke-knap').addEventListener('click', function (e) {
      e.stopPropagation();
      var lag = $('klokke-lag');
      var åben = !lag.classList.contains('skjult');
      lag.classList.toggle('skjult', åben);
      $('klokke-knap').setAttribute('aria-expanded', åben ? 'false' : 'true');
      if (!åben) tegn();
    });

    /* ⚠️ ET KLIK VED SIDEN AF LUKKER — men et klik INDE i laget
       må ikke. Uden stopPropagation lukkede laget sig selv, i det
       sekund man trykkede ✕ på en post. */
    $('klokke-lag').addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', luk);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') luk();
    });
  }

  if ($('klokke-alle')) {
    $('klokke-alle').addEventListener('click', function () {
      var sæt = læste();
      poster().forEach(function (p) { sæt[p.id] = true; });
      gemLæst(sæt);
      tegn();
    });
  }

  /* ⚠️ TALLET SKAL VÆRE FRISKT, OGSÅ NÅR LAGET ER LUKKET. Den
     direkte forbindelse og frisk.js melder listerne ind, og så
     skal klokken tælle om — ellers står den på 2, mens der er
     kommet fire. */
  Admin.efterHent.push(tegn);
  Admin.vedLogin.push(tegn);
}());
