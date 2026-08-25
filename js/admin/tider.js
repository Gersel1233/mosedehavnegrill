/* Fanen Åbningstider. Se js/admin/kerne.js for de to principper
   der gælder i alle admin-filerne. */
(function () {
  'use strict';

  var $ = Admin.$;

  /* Hver dag bygges i sin egen funktion, ikke inde i løkken.

     Med var inde i en løkke deler alle syv dage de samme
     variabler, og så peger alle syv lyttere på den sidste dags
     felter. Resultatet er at et hak i "Lukket" på mandag slukker
     søndagens felter. Én funktion pr. række giver hver dag sine
     egne. */
  function tidsrække(u, plan) {
    var r = Admin.lav('div', 'admin-raekke');
    r.appendChild(Admin.lav('span', 'navn', Butik.UGEDAGE[u]));

    var fra = document.createElement('input');
    fra.type = 'time'; fra.className = 'smal';
    fra.dataset.rolle = 'fra'; fra.dataset.ugedag = u;
    fra.value = Butik.pænTid(plan.aabner) || '11:00';

    var til = document.createElement('input');
    til.type = 'time'; til.className = 'smal';
    til.dataset.rolle = 'til'; til.dataset.ugedag = u;
    til.value = Butik.pænTid(plan.lukker) || '21:00';

    var hak = document.createElement('input');
    hak.type = 'checkbox';
    hak.dataset.rolle = 'lukket'; hak.dataset.ugedag = u;
    hak.checked = !!plan.lukket;

    var mærkat = Admin.lav('label', 'afkryds');
    mærkat.appendChild(hak);
    mærkat.appendChild(document.createTextNode('Lukket'));

    // Er dagen lukket, er tidsfelterne uden betydning – de
    // slukkes så ingen sidder og retter i tal der ikke bruges.
    function opdater() {
      fra.disabled = hak.checked;
      til.disabled = hak.checked;
    }
    hak.addEventListener('change', opdater);
    opdater();

    r.appendChild(fra);
    r.appendChild(Admin.lav('span', null, '–'));
    r.appendChild(til);
    r.appendChild(mærkat);
    return r;
  }

  function tegnTider() {
    var boks = $('tider-felter');
    Admin.tøm(boks);

    for (var u = 0; u < 7; u++) {
      var plan = (Admin.data.aabningstider || []).filter(function (a) {
        return a.ugedag === u;
      })[0] || { lukket: false, aabner: '11:00', lukker: '21:00' };

      boks.appendChild(tidsrække(u, plan));
    }
  }

  function samlTider() {
    var rækker = [];
    for (var u = 0; u < 7; u++) {
      var r = {
        ugedag: u,
        lukket: $('tider-felter').querySelector('[data-rolle="lukket"][data-ugedag="' + u + '"]').checked,
        aabner: $('tider-felter').querySelector('[data-rolle="fra"][data-ugedag="' + u + '"]').value,
        lukker: $('tider-felter').querySelector('[data-rolle="til"][data-ugedag="' + u + '"]').value,
      };
      var fejl = Butik.tjek.dagensTider(r);
      if (fejl) return Butik.UGEDAGE[u] + ': ' + fejl;
      rækker.push(r);
    }

    var lokId = ((Admin.data.lokationer || [])[0] || {}).id || Butik.LOKATION;
    return Butik.skrive.tider(lokId, rækker);
  }

  $('gem-tider').addEventListener('click', function () {
    var svar = samlTider();
    if (typeof svar === 'string') return Admin.brøl(svar);
    Admin.gem(svar, 'Åbningstiderne er gemt.');
  });

  /* ÅBNINGSTIDERNE ER DEN FARLIGSTE AF DEM ALLE. Sættes hakket i
     "Lukket" uden at nogen trykker Gem, står forsiden og lover
     åbent — og gæsten kører forgæves. */
  /* KORTET er roden, ikke #tider-felter: den boks tegnes om ved
     hver hentning, og mærket ville blive revet ned med den.
     Lytterne fanger felterne indeni alligevel — begivenheder
     bobler. */
  Admin.autogem($('gem-tider').closest('.kort'), samlTider);

  Admin.tegnere.push(tegnTider);
})();
