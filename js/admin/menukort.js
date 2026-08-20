/* Fanen Menukort. Se js/admin/kerne.js for de to principper
   der gælder i alle admin-filerne. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  function tegnMenu() {
    var boks = $('menu-redigering');
    Admin.tøm(boks);

    var kategorier = (Admin.data.menu_kategorier || [])
      .slice()
      .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); });

    if (!kategorier.length) {
      boks.appendChild(lav('p', 'vare-tekst',
        'Der er ingen kategorier endnu. De oprettes i setup.sql.'));
      return;
    }

    kategorier.forEach(function (k) {
      var gruppe = lav('div', 'menu-gruppe');
      var h = lav('h3', null, k.navn);
      // 'grill' er det gamle navn for 'mad'. Står der stadig
      // gamle rækker i databasen, skal de ikke vises som ukendte.
      var afd = k.afdeling === 'grill' ? 'mad' : k.afdeling;
      var navne = { mad: 'Mad', is: 'Is', drikke: 'Drikkevarer' };
      h.appendChild(lav('span', 'maerke ' + (afd === 'is' ? 'udsolgt' : 'favorit'),
        navne[afd] || afd));
      gruppe.appendChild(h);

      var varer = (Admin.data.menu_varer || [])
        .filter(function (v) { return v.kategori_id === k.id; })
        .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); });

      varer.forEach(function (v) { gruppe.appendChild(varerække(v)); });
      /* Fyldkategorien får sit eget værktøj: 29 priser tastet én ad
         gangen er en halv time og en tastefejl. Se samlePris(). */
      if (/fyld/i.test(k.navn || '')) gruppe.appendChild(samlePris(k, varer));
      gruppe.appendChild(nyVareFelt(k));
      boks.appendChild(gruppe);
    });
  }

  /* ---- SAMME PRIS PÅ ALLE FYLD ----

     Model A: hvert fyld er en vare med sin egen pris, og gæsten
     bestiller "2 × rejemad". Men de 29 priser skal ind i systemet
     FØRSTE gang, og starter man med samme pris på alle og retter de
     få, der skiller sig ud, er det ét tal og et par rettelser i
     stedet for 29 felter.

     Tallet kommer fra ejeren — feltet står tomt, og der er ingen
     foreslået pris: en pris, siden ikke har fået af forretningen,
     må ikke stå på den. Derfor står der heller ikke noget i
     pladsholderen ud over formatet.

     Fyld UDEN pris kan ikke bestilles; de kan stadig ønskes i
     folden på bestillingssiden. Linjen her siger, hvor mange der
     mangler, så ingen tror, at siden er i stykker. */
  function samlePris(k, varer) {
    var uden = varer.filter(function (v) {
      return v.pris === null || v.pris === undefined || v.pris === '';
    });

    var boks = lav('div', 'samle-pris');
    boks.appendChild(lav('div', 'eyebrow', 'Sæt samme pris på alle'));
    boks.appendChild(lav('p', 'hjaelp', uden.length
      ? uden.length + ' af ' + varer.length + ' mangler en pris og kan ikke bestilles endnu — '
        + 'de kan kun ønskes. Sæt en pris, så bliver de rigtige varer.'
      : 'Alle ' + varer.length + ' har en pris og kan bestilles.'));

    var række = lav('div', 'felt-par');
    var felt = document.createElement('input');
    felt.type = 'number';
    felt.id = 'fyld-samlepris';
    felt.min = '0';
    felt.step = '0.5';
    felt.placeholder = 'fx 45';

    var knap = lav('button', 'knap sekundaer', 'Sæt på alle ' + varer.length);
    knap.type = 'button';
    knap.addEventListener('click', function () {
      var v = felt.value.trim();
      var tal = Number(v);
      if (v === '' || !isFinite(tal) || tal < 0 || tal >= 10000) {
        return Admin.brøl('Skriv en pris mellem 0 og 10.000.');
      }
      if (!confirm('Sæt prisen ' + tal + ' kr. på ALLE ' + varer.length
        + ' fyld?\n\nDe, der skiller sig ud, kan rettes enkeltvis bagefter.')) return;

      /* Én ad gangen mod databasen — der findes ikke et kald, der
         retter mange rækker med hver sin id, og 29 kald er få nok
         til at det ikke er værd at bygge et. Der ventes på dem
         alle, så genindlæsningen viser det færdige resultat. */
      Admin.gem(Promise.all(varer.map(function (vare) {
        return Butik.skrive.vare(Object.assign({}, vare, { pris: tal }));
      })), 'Prisen ' + tal + ' kr. står nu på alle ' + varer.length + ' fyld.');
    });

    var f1 = lav('div', 'felt');
    f1.appendChild(felt);
    var f2 = lav('div', 'felt');
    f2.appendChild(knap);
    række.appendChild(f1);
    række.appendChild(f2);
    boks.appendChild(række);
    return boks;
  }

  function varerække(v) {
    var r = lav('div', 'admin-raekke');

    var navn = document.createElement('input');
    navn.type = 'text'; navn.className = 'navn'; navn.value = v.navn; navn.maxLength = 120;

    var pris = document.createElement('input');
    pris.type = 'text'; pris.className = 'smal'; pris.inputMode = 'decimal';
    pris.placeholder = 'kr.';
    pris.value = (v.pris === null || v.pris === undefined) ? '' : String(v.pris).replace('.', ',');

    function hakMed(mærke, sat) {
      var i = document.createElement('input');
      i.type = 'checkbox'; i.checked = !!sat;
      var l = lav('label', 'afkryds');
      l.appendChild(i);
      l.appendChild(document.createTextNode(mærke));
      return { felt: i, mærkat: l };
    }

    var favorit = hakMed('Favorit', v.fremhaevet);
    var udsolgt = hakMed('Udsolgt', v.udsolgt);
    var vis = hakMed('Vis', v.aktiv !== false);

    var gemKnap = lav('button', 'knap', 'Gem');
    gemKnap.addEventListener('click', function () {
      var f = Butik.tjek.navn(navn.value, 'varenavn', 120) || Butik.tjek.pris(pris.value);
      if (f) return Admin.brøl(v.navn + ': ' + f);

      Admin.gem(Butik.skrive.vare({
        id: v.id,
        kategori_id: v.kategori_id,
        navn: navn.value,
        beskrivelse: v.beskrivelse,
        pris: pris.value,
        fremhaevet: favorit.felt.checked,
        udsolgt: udsolgt.felt.checked,
        aktiv: vis.felt.checked,
        sortering: v.sortering,
      }), navn.value + ' er gemt.');
    });

    var sletKnap = lav('button', 'knap fare', 'Slet');
    sletKnap.addEventListener('click', function () {
      // Bevidst en bekræftelse: en slettet vare kan ikke hentes
      // tilbage fra admin.
      if (!window.confirm('Slet "' + v.navn + '" helt? Vil du bare skjule den, så fjern hakket i Vis.')) return;
      Admin.gem(Butik.skrive.sletVare(v.id), v.navn + ' er slettet.');
    });

    r.appendChild(navn);
    r.appendChild(pris);
    r.appendChild(favorit.mærkat);
    r.appendChild(udsolgt.mærkat);
    r.appendChild(vis.mærkat);
    r.appendChild(gemKnap);
    r.appendChild(sletKnap);
    return r;
  }

  function nyVareFelt(k) {
    var r = lav('div', 'admin-raekke');

    var navn = document.createElement('input');
    navn.type = 'text'; navn.className = 'navn'; navn.placeholder = 'Ny vare i ' + k.navn;
    navn.maxLength = 120;

    var pris = document.createElement('input');
    pris.type = 'text'; pris.className = 'smal'; pris.inputMode = 'decimal'; pris.placeholder = 'kr.';

    var knap = lav('button', 'knap', 'Tilføj');
    knap.addEventListener('click', function () {
      var f = Butik.tjek.navn(navn.value, 'varenavn', 120) || Butik.tjek.pris(pris.value);
      if (f) return Admin.brøl(f);

      var højeste = (Admin.data.menu_varer || [])
        .filter(function (v) { return v.kategori_id === k.id; })
        .reduce(function (m, v) { return Math.max(m, v.sortering || 0); }, 0);

      Admin.gem(Butik.skrive.vare({
        kategori_id: k.id,
        navn: navn.value,
        pris: pris.value,
        sortering: højeste + 1,
      }), navn.value + ' er lagt på menukortet.');
    });

    r.appendChild(navn);
    r.appendChild(pris);
    r.appendChild(knap);
    return r;
  }

  Admin.tegnere.push(tegnMenu);
})();
