/* Fanen Borde: ønsker om et bord, og dagens billede.
   Se js/admin/kerne.js for de to principper, der gælder i alle
   admin-filerne.

   HER GIVES JA'ET — og kun her. Gæsten har fået at vide, at vi
   ringer og bekræfter, så en række her er et løfte om et opkald.
   Øverst står dagens billede: hvor mange pladser der allerede er
   sagt ja til pr. dag, målt mod antallet af pladser. Det er DET,
   der gør, at to gæster ikke kan få ja til det samme bord: der er
   kun én, der siger ja, og hun kan se, hvad hun har sagt ja til.

   Antallet af pladser er personalets eget tal og sættes hernede.
   Databasen håndhæver det med vilje ikke — se supabase/borde.sql. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  var STATUS_NAVNE = { ny: 'Ny', bekraeftet: 'Bekræftet', afvist: 'Afvist' };

  var borde = [];

  /* Nye øverst med den ÆLDSTE først — den, der har ventet længst
     på sit opkald, står øverst. Resten efter dag og tid: det er
     sådan, de står i restauranten. */
  var RANG = { ny: 0, bekraeftet: 1, afvist: 2 };

  function sorteret(liste) {
    return liste.slice().sort(function (a, b) {
      var ra = RANG[a.status] === undefined ? 9 : RANG[a.status];
      var rb = RANG[b.status] === undefined ? 9 : RANG[b.status];
      if (ra !== rb) return ra - rb;
      if (a.status === 'ny') return a.oprettet < b.oprettet ? -1 : 1;
      if (a.dato !== b.dato) return a.dato < b.dato ? -1 : 1;
      return (a.tid || '') < (b.tid || '') ? -1 : 1;
    });
  }

  function pladser() {
    var v = Number((Admin.data.indstillinger || {}).bord_pladser);
    return isFinite(v) && v >= 1 ? Math.round(v) : null;
  }

  // ----------------------------------------------------------
  //  DAGENS BILLEDE
  //  --------------------------------------------------------
  //  Én linje pr. dag med ønsker, fra i dag og frem: hvor mange
  //  pladser er sagt ja til, og hvor mange venter. Det er tallet,
  //  man kigger på, FØR man trykker Bekræft — uden det siger man
  //  ja med lukkede øjne, og det er præcis sådan, to selskaber
  //  ender ved det samme bord.
  // ----------------------------------------------------------
  function tegnBillede() {
    var boks = $('borde-billede');
    if (!boks) return;
    Admin.tøm(boks);

    var i_dag = Butik.nu().dato;
    var dage = {};
    borde.forEach(function (b) {
      if (b.dato < i_dag || b.status === 'afvist') return;
      var d = dage[b.dato] || (dage[b.dato] = { ja: 0, venter: 0 });
      if (b.status === 'bekraeftet') d.ja += b.antal_personer || 0;
      else d.venter += 1;
    });

    var datoer = Object.keys(dage).sort();
    if (!datoer.length) return;

    var max = pladser();
    datoer.forEach(function (dato) {
      var d = dage[dato];
      var linje = lav('div', 'bestil-linje');
      linje.appendChild(lav('span', 'bestil-vare', Admin.pænDato(dato)));

      var tekst = d.ja + (max ? ' af ' + max : '') + ' pladser sagt ja til'
        + (d.venter ? ' · ' + d.venter + (d.venter === 1 ? ' ønske venter' : ' ønsker venter') : '');
      var felt = lav('span', 'bestil-linjepris', tekst);
      /* Rødt når ja'erne når loftet: det er IKKE et forbud — måske
         kan der klemmes et bord ind — men det skal ses, FØR der
         ringes og siges ja. */
      if (max && d.ja >= max) felt.className += ' fejl-tekst';
      linje.appendChild(felt);
      boks.appendChild(linje);
    });
  }

  // ----------------------------------------------------------
  //  LISTEN
  // ----------------------------------------------------------
  function tegnBorde() {
    var boks = $('borde-liste');
    if (!boks) return;
    Admin.tøm(boks);
    tegnBillede();

    var nye = borde.filter(function (b) { return b.status === 'ny'; }).length;
    var maerke = $('borde-antal');
    if (nye) { maerke.textContent = nye; maerke.classList.remove('skjult'); }
    else maerke.classList.add('skjult');

    if (!borde.length) {
      boks.appendChild(lav('p', 'vare-tekst', 'Der er ingen bordønsker endnu.'));
      return;
    }

    sorteret(borde).forEach(function (b) {
      boks.appendChild(bordKort(b));
    });
  }

  function bordKort(b) {
    var k = lav('div', 'bestil-kort b-' + b.status);

    var top = lav('div', 'bestil-top');
    top.appendChild(lav('span', 'maerke m-' + b.status,
      STATUS_NAVNE[b.status] || b.status));
    top.appendChild(lav('span', 'bestil-ref', b.reference));
    k.appendChild(top);

    var hvem = lav('div', 'bestil-hvem');
    hvem.appendChild(lav('span', 'vare-navn', b.navn));
    var tlf = lav('a', 'bestil-tlf', b.telefon);
    tlf.href = 'tel:' + String(b.telefon).replace(/[^0-9+]/g, '');
    hvem.appendChild(tlf);
    if (b.email) hvem.appendChild(lav('span', 'vare-tekst', b.email));
    k.appendChild(hvem);

    var detaljer = lav('div', 'bestil-linjer');
    var r1 = lav('div', 'bestil-linje');
    r1.appendChild(lav('span', 'bestil-vare',
      Admin.pænDato(b.dato) + ' kl. ' + String(b.tid || '').slice(0, 5).replace(':', '.')));
    r1.appendChild(lav('span', 'bestil-linjepris', b.antal_personer + ' personer'));
    detaljer.appendChild(r1);
    k.appendChild(detaljer);

    if (b.besked) {
      var m = lav('p', 'bestil-gaestebesked');
      m.appendChild(lav('strong', null, 'Gæsten skriver: '));
      m.appendChild(document.createTextNode(b.besked));
      k.appendChild(m);
    }

    var note = lav('div', 'felt');
    var etiket = lav('label', null, 'Din note');
    etiket.setAttribute('for', 'bord-note-' + b.id);
    var felt = document.createElement('input');
    felt.type = 'text';
    felt.id = 'bord-note-' + b.id;
    felt.maxLength = 1000;
    felt.value = b.intern_note || '';
    felt.placeholder = 'Fx: bord 4 ved vinduet';
    felt.addEventListener('change', function () {
      if (felt.value === (b.intern_note || '')) return;
      gemBord(Butik.skrive.bordStatus(b.id, b.status, felt.value), 'Noten er gemt.');
    });
    note.appendChild(etiket);
    note.appendChild(felt);
    k.appendChild(note);

    var raekke = lav('div', 'knap-raekke');

    if (b.status === 'ny') {
      var frem = lav('button', 'knap', 'Bekræft bordet');
      frem.addEventListener('click', function () {
        /* Opkaldet står i løftet: gæstens kvittering siger "vent på
           opkaldet, før I regner med det". Et ja her uden et opkald
           er en familie, der ikke ved, at de har et bord. */
        if (!confirm('Bekræft bordet til ' + b.navn + ' — '
          + b.antal_personer + ' personer ' + Admin.pænDato(b.dato)
          + ' kl. ' + String(b.tid || '').slice(0, 5).replace(':', '.') + '?\n\n'
          + 'Husk at ringe til ' + b.telefon + ' — gæsten venter på opkaldet.')) return;
        gemBord(Butik.skrive.bordStatus(b.id, 'bekraeftet', felt.value),
          'Bordet er bekræftet. Ring til ' + b.telefon + '.');
      });
      raekke.appendChild(frem);
    }

    if (b.status !== 'afvist') {
      var afvis = lav('button', 'knap fare', 'Afvis');
      afvis.addEventListener('click', function () {
        if (!confirm('Afvis bordønsket fra ' + b.navn + '?\n\n'
          + 'Husk at ringe til ' + b.telefon + ' — gæsten har fået at vide, '
          + 'at vi ringer.')) return;
        gemBord(Butik.skrive.bordStatus(b.id, 'afvist', felt.value),
          'Ønsket er afvist.');
      });
      raekke.appendChild(afvis);
    }

    if (b.status === 'afvist') {
      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!confirm('Flyt bordønsket fra ' + b.navn + ' til skraldespanden?\n\n'
          + 'Det kan hentes tilbage i 30 dage.')) return;
        gemBord(Butik.skrive.tilSkraldespand('bord', b.id),
          'Ønsket ligger i skraldespanden.');
      });
      raekke.appendChild(slet);
    }

    k.appendChild(raekke);
    return k;
  }

  // ----------------------------------------------------------
  //  PLADSERNE
  // ----------------------------------------------------------
  $('gem-pladser').addEventListener('click', function () {
    var v = $('bord-pladser').value.trim();
    var tal = Number(v);
    if (v !== '' && (!isFinite(tal) || tal < 1 || tal > 500 || Math.round(tal) !== tal)) {
      return Admin.brøl('Skriv et helt antal pladser — eller lad feltet stå tomt.');
    }
    Admin.gem(Butik.skrive.indstilling('bord_pladser', v === '' ? null : tal),
      v === '' ? 'Pladstallet er fjernet — dagens billede viser kun ja\'erne.'
               : 'Der regnes nu med ' + tal + ' pladser.');
  });

  function tegnPladser() {
    var felt = $('bord-pladser');
    if (!felt) return;
    var max = pladser();
    felt.value = max === null ? '' : max;
    tegnBillede();
  }

  // ----------------------------------------------------------
  //  HENT
  // ----------------------------------------------------------
  function gemBord(løfte, besked) {
    return løfte
      .then(hentBorde)
      .then(function () { Admin.kvitter(besked); })
      .catch(function (e) { Admin.brøl(e.message || String(e)); });
  }

  function hentBorde() {
    return Butik.hentBorde().then(function (liste) {
      borde = liste || [];
      Admin.meld('borde', borde);
      tegnBorde();
      var t = Butik.nu();
      $('borde-hentet').textContent = 'Hentet kl. '
        + ('0' + Math.floor(t.minutter / 60)).slice(-2) + '.'
        + ('0' + (t.minutter % 60)).slice(-2);
    }).catch(function (e) {
      /* Fejlen skjules IKKE — ellers venter en familie på et
         opkald, ingen ved skal foretages. */
      var boks = $('borde-liste');
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl',
        'Bordønskerne kunne ikke hentes: ' + (e.message || e)
        + ' Prøv "Hent på ny", eller log ud og ind igen.'));
      if (window.console) console.warn('borde:', e);
    });
  }

  $('borde-genindlaes').addEventListener('click', hentBorde);

  Admin.tegnere.push(tegnPladser);
  Admin.vedLogin.push(hentBorde);
  Admin.friske.push(hentBorde);
})();
