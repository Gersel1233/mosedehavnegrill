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

    if (!rækker.length) {
      boks.appendChild(lav('p', 'vare-tekst', 'Der står ikke noget i kalenderen.'));
      return;
    }

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

  tegnTyper();
  visFelter();
  Admin.tegnere.push(tegnKalender);
})();
