/* Fanen Baglokalet: ønsker om at leje lokalet, og lokalets
   kalender. Se js/admin/kerne.js for de to principper, der gælder
   i alle admin-filerne.

   HER GIVES JA'ET — og lokalet er ET lokale, så der kan kun være
   ét ja pr. dag. Det er ikke en regel i den her fil: databasen
   selv afviser ja nummer to (udlejning_dagen_er_taget i
   supabase/udlejning.sql), så to medarbejdere på hver sin iPad
   ikke kan sige ja samtidig. Fanen viser bare sandheden, FØR man
   trykker: lokalets kalender øverst siger, hvilke dage der er
   væk. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var STATUS_NAVNE = { ny: 'Ny', bekraeftet: 'Lejet ud', afvist: 'Afvist' };

  var udlejninger = [];

  // Nye øverst med den ældste først — den, der har ventet længst
  // på sit opkald, står øverst. Resten efter dato.
  var RANG = { ny: 0, bekraeftet: 1, afvist: 2 };

  function sorteret(liste) {
    return liste.slice().sort(function (a, b) {
      var ra = RANG[a.status] === undefined ? 9 : RANG[a.status];
      var rb = RANG[b.status] === undefined ? 9 : RANG[b.status];
      if (ra !== rb) return ra - rb;
      if (a.status === 'ny') return a.oprettet < b.oprettet ? -1 : 1;
      return a.dato < b.dato ? -1 : 1;
    });
  }

  // ----------------------------------------------------------
  //  LOKALETS KALENDER
  //  --------------------------------------------------------
  //  Én linje pr. dag, der er nævnt i et ønske, fra i dag og
  //  frem: er dagen lejet ud, og hvor mange venter på svar. De
  //  baglokale-FORESPØRGSLER, der har en dato, står også her —
  //  de kom ind ad selskabssiden, og et ja i telefonen på en af
  //  dem skal gives med lokalets kalender foran sig.
  // ----------------------------------------------------------
  function tegnKalender() {
    var boks = $('lokale-kalender');
    if (!boks) return;
    Admin.tøm(boks);

    var i_dag = Butik.nu().dato;
    var dage = {};

    udlejninger.forEach(function (u) {
      if (u.dato < i_dag || u.status === 'afvist') return;
      var d = dage[u.dato] || (dage[u.dato] = { lejer: null, venter: 0, spurgt: 0 });
      if (u.status === 'bekraeftet') d.lejer = u.navn;
      else d.venter += 1;
    });

    /* Forespørgslerne om baglokalet kommer ind ad selskabssiden og
       lever på deres egen fane — men har de en dato, hører de til
       i det her billede. Admin.lister har dem allerede; et kald
       mere ville være et kald for meget. */
    (Admin.lister.forespoergsler || []).forEach(function (f) {
      if (f.type !== 'baglokale' || !f.dato || f.dato < i_dag) return;
      if (f.status === 'afvist' || f.status === 'aftalt') return;
      var d = dage[f.dato] || (dage[f.dato] = { lejer: null, venter: 0, spurgt: 0 });
      d.spurgt += 1;
    });

    var datoer = Object.keys(dage).sort();
    if (!datoer.length) return;

    datoer.forEach(function (dato) {
      var d = dage[dato];
      var linje = lav('div', 'bestil-linje');
      linje.appendChild(lav('span', 'bestil-vare', Admin.pænDato(dato)));

      var dele = [];
      if (d.lejer) dele.push('LEJET UD til ' + d.lejer);
      if (d.venter) dele.push(d.venter + (d.venter === 1 ? ' ønske venter' : ' ønsker venter'));
      if (d.spurgt) dele.push(d.spurgt + (d.spurgt === 1
        ? ' forespørgsel på selskabsfanen' : ' forespørgsler på selskabsfanen'));

      var felt = lav('span', 'bestil-linjepris', dele.join(' · '));
      if (d.lejer) felt.className += ' fejl-tekst';
      linje.appendChild(felt);
      boks.appendChild(linje);
    });
  }

  // ----------------------------------------------------------
  //  LISTEN
  // ----------------------------------------------------------
  function tegnUdlejninger() {
    var boks = $('lokale-liste');
    if (!boks) return;
    Admin.tøm(boks);
    tegnKalender();

    var nye = udlejninger.filter(function (u) { return u.status === 'ny'; }).length;
    var maerke = $('lokale-antal-maerke');
    if (nye) { maerke.textContent = nye; maerke.classList.remove('skjult'); }
    else maerke.classList.add('skjult');

    if (!udlejninger.length) {
      boks.appendChild(lav('p', 'vare-tekst', 'Der er ingen udlejningsønsker endnu.'));
      return;
    }

    sorteret(udlejninger).forEach(function (u) {
      boks.appendChild(udlejningKort(u));
    });
  }

  function dagenTagetAf(u) {
    return udlejninger.filter(function (x) {
      return String(x.id) !== String(u.id)
        && x.dato === u.dato
        && x.status === 'bekraeftet';
    })[0] || null;
  }

  function udlejningKort(u) {
    var k = lav('div', 'bestil-kort b-' + u.status);

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'maerke m-' + u.status,
      STATUS_NAVNE[u.status] || u.status));
    top.appendChild(lav('span', 'bestil-ref', u.reference));
    k.appendChild(top);

    var hvem = lav('div', 'bestil-hvem');
    hvem.appendChild(lav('span', 'vare-navn', u.navn));
    var tlf = lav('a', 'bestil-tlf', u.telefon);
    tlf.href = 'tel:' + String(u.telefon).replace(/[^0-9+]/g, '');
    hvem.appendChild(tlf);
    if (u.email) hvem.appendChild(lav('span', 'vare-tekst', u.email));
    k.appendChild(hvem);

    var detaljer = lav('div', 'bestil-linjer');
    var r1 = lav('div', 'bestil-linje');
    r1.appendChild(lav('span', 'bestil-vare', Admin.pænDato(u.dato)));
    r1.appendChild(lav('span', 'bestil-linjepris',
      u.antal_personer ? u.antal_personer + ' personer' : 'Antal ikke oplyst'));
    detaljer.appendChild(r1);
    k.appendChild(detaljer);

    /* Er dagen allerede lejet ud, skal det stå PÅ kortet — ikke
       først i fejlen, når der er trykket. Databasen afviser
       alligevel, men en advarsel efter et opkald til gæsten er en
       pinlig samtale for sent. */
    var taget = u.status === 'ny' && dagenTagetAf(u);
    if (taget) {
      var advarsel = lav('p', 'fejl');
      advarsel.textContent = 'Dagen er allerede lejet ud til ' + taget.navn
        + '. Der kan kun være ét ja pr. dag.';
      k.appendChild(advarsel);
    }

    if (u.besked) {
      var m = lav('p', 'bestil-gaestebesked');
      m.appendChild(lav('strong', null, 'Gæsten skriver: '));
      m.appendChild(document.createTextNode(u.besked));
      k.appendChild(m);
    }

    var note = lav('div', 'felt');
    var etiket = lav('label', null, 'Din note');
    etiket.setAttribute('for', 'lokale-note-' + u.id);
    var felt = document.createElement('input');
    felt.type = 'text';
    felt.id = 'lokale-note-' + u.id;
    felt.maxLength = 1000;
    felt.value = u.intern_note || '';
    felt.placeholder = 'Fx: depositum aftalt, de kommer kl. 12';
    felt.addEventListener('change', function () {
      if (felt.value === (u.intern_note || '')) return;
      gemUdlejning(Butik.skrive.udlejningStatus(u.id, u.status, felt.value),
        'Noten er gemt.');
    });
    note.appendChild(etiket);
    note.appendChild(felt);
    k.appendChild(note);

    var raekke = lav('div', 'knap-raekke');

    if (u.status === 'ny') {
      var frem = lav('button', 'knap', 'Lej lokalet ud');
      frem.addEventListener('click', function () {
        if (!confirm('Lej lokalet ud til ' + u.navn + ' '
          + Admin.pænDato(u.dato) + '?\n\n'
          + 'Der kan kun være ét ja pr. dag. Husk at ringe til '
          + u.telefon + ' — gæsten venter på opkaldet.')) return;
        gemUdlejning(Butik.skrive.udlejningStatus(u.id, 'bekraeftet', felt.value),
          'Lokalet er lejet ud ' + Admin.pænDato(u.dato) + '. Ring til ' + u.telefon + '.');
      });
      raekke.appendChild(frem);
    }

    if (u.status !== 'afvist') {
      var afvis = lav('button', 'knap fare', 'Afvis');
      afvis.addEventListener('click', function () {
        if (!confirm('Afvis ønsket fra ' + u.navn + '?\n\n'
          + 'Husk at ringe til ' + u.telefon + ' — gæsten har fået at vide, '
          + 'at vi ringer.')) return;
        gemUdlejning(Butik.skrive.udlejningStatus(u.id, 'afvist', felt.value),
          'Ønsket er afvist.');
      });
      raekke.appendChild(afvis);
    }

    if (u.status === 'afvist') {
      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!confirm('Flyt ønsket fra ' + u.navn + ' til skraldespanden?\n\n'
          + 'Det kan hentes tilbage i 30 dage.')) return;
        gemUdlejning(Butik.skrive.tilSkraldespand('udlejning', u.id),
          'Ønsket ligger i skraldespanden.');
      });
      raekke.appendChild(slet);
    }

    k.appendChild(raekke);
    return k;
  }

  // ----------------------------------------------------------
  //  HENT
  // ----------------------------------------------------------
  function gemUdlejning(løfte, besked) {
    return løfte
      .then(hentUdlejninger)
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e.message || String(e)); });
  }

  function hentUdlejninger() {
    return Butik.hentUdlejninger().then(function (liste) {
      udlejninger = liste || [];
      Admin.meld('udlejninger', udlejninger);
      tegnUdlejninger();
      var t = Butik.nu();
      $('lokale-hentet').textContent = 'Hentet kl. '
        + ('0' + Math.floor(t.minutter / 60)).slice(-2) + '.'
        + ('0' + (t.minutter % 60)).slice(-2);
    }).catch(function (e) {
      var boks = $('lokale-liste');
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Udlejningerne kunne ikke hentes: ' + (e.message || e)
        + ' Prøv "Hent på ny", eller log ud og ind igen.'));
      if (window.console) console.warn('udlejninger:', e);
    });
  }

  $('lokale-genindlaes').addEventListener('click', hentUdlejninger);

  /* Kalenderen tegner også forespørgslernes datoer, og de kan
     komme EFTER udlejningerne — så der tegnes igen, når en anden
     fane melder nye data ind. */
  Admin.efterHent.push(tegnKalender);
  Admin.vedLogin.push(hentUdlejninger);
  Admin.friske.push(hentUdlejninger);
})();
