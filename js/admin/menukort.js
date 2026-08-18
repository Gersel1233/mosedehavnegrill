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
      gruppe.appendChild(nyVareFelt(k));
      boks.appendChild(gruppe);
    });
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
