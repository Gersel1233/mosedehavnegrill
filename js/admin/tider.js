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
    /* ⚠️ EGEN KLASSE, SÅ RÆKKEN KAN LÆGGES ANDERLEDES PÅ EN
       TELEFON. Målt på en iPhone 13: den almindelige .admin-raekke
       brød ugedagens tre dele til tre linjer — "Mandag", så
       "11:00", så "21:00 · Lukket" — og syv dage fyldte over tre
       skærme. Uden en klasse skulle reglen hænge på :nth-child
       eller på hele fanen, og så ville den ramme kort, der ikke
       er tidsrækker. */
    var r = Admin.lav('div', 'admin-raekke tid-raekke');
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

  /* ============================================================
     KØKKENET OG VARSLERNE  (30/8)
     ------------------------------------------------------------
     ⚠️ ÅBNINGSTIDERNE ER LUGENS, IKKE KØKKENETS. Kundens ord:
     "køkkenet lukker jo 20.00, så sidste spisning og to-go
     slutter 19.30 af bestillinger, og man skal bestille tidligst
     30 min in advance når det er to-go — udover bord, der er det
     15 min."

     ⚠️ TOMME FELTER ÆNDRER INGENTING. Uden dem gælder det gamle:
     en halv time før lugen lukker, og bestilling_varsel_timer som
     varsel. Slog de nye tal igennem som standard, ville en
     forretning, der ikke kender felterne, pludselig tage imod en
     bestilling om en halv time — og køkkenet står med den.
     Se katVarselMin() i js/bestil-regler.js. */
  function tegnKoekken() {
    var i = Admin.data.indstillinger || {};
    if (!$('koekken-lukker')) return;
    if (document.activeElement && document.activeElement.closest
        && document.activeElement.closest('#gem-koekken, .kort')
        && ['koekken-lukker', 'sidste-bestilling', 'varsel-togo', 'varsel-bord']
          .indexOf(document.activeElement.id) !== -1) return;

    $('koekken-lukker').value = String(i.koekken_lukker || '').slice(0, 5);
    $('sidste-bestilling').value = i.sidste_bestilling_min === undefined
      || i.sidste_bestilling_min === null ? '' : i.sidste_bestilling_min;
    $('varsel-togo').value = i.varsel_min_togo === undefined
      || i.varsel_min_togo === null ? '' : i.varsel_min_togo;
    $('varsel-bord').value = i.varsel_min_bord === undefined
      || i.varsel_min_bord === null ? '' : i.varsel_min_bord;
  }

  function tal(id, mindst, mest) {
    var v = $(id).value.trim();
    if (v === '') return { tom: true };
    var n = Number(v);
    if (!isFinite(n) || n < mindst || n > mest) return { fejl: true };
    return { vaerdi: Math.round(n) };
  }

  function samlKoekken() {
    if (!$('koekken-lukker')) return Promise.resolve();
    var sidste = tal('sidste-bestilling', 0, 240);
    var togo = tal('varsel-togo', 0, 1440);
    var bord = tal('varsel-bord', 0, 1440);
    if (sidste.fejl) return 'Sidste bestilling skal være mellem 0 og 240 minutter.';
    if (togo.fejl || bord.fejl) return 'Varslet skal være mellem 0 og 1440 minutter.';

    /* ⚠️ TOMT SKRIVES SOM TOMT, IKKE SOM NUL. Et 0 i "sidste
       bestilling" betyder "helt frem til køkkenet lukker" — og
       det er noget andet end "brug den gamle halve time". */
    return Butik.skrive.indstilling('koekken_lukker',
      $('koekken-lukker').value || '')
      .then(function () {
        return Butik.skrive.indstilling('sidste_bestilling_min',
          sidste.tom ? '' : sidste.vaerdi);
      })
      .then(function () {
        return Butik.skrive.indstilling('varsel_min_togo',
          togo.tom ? '' : togo.vaerdi);
      })
      .then(function () {
        return Butik.skrive.indstilling('varsel_min_bord',
          bord.tom ? '' : bord.vaerdi);
      });
  }

  if ($('gem-koekken')) {
    $('gem-koekken').addEventListener('click', function () {
      var svar = samlKoekken();
      if (typeof svar === 'string') return Admin.brøl(svar);
      Admin.gem(svar, 'Køkkenets tider er gemt.');
    });
    Admin.autogem($('gem-koekken').closest('.kort'), samlKoekken);
  }

  /* ============================================================
     EMBALLAGE VED TO-GO  (30/8)
     ------------------------------------------------------------
     Kundens ord: "emballage tillæg ved to-go skal vi have."

     ⚠️ KATEGORIERNE ER FLUEBEN OG IKKE ET TAL. En sodavand skal
     sjældent pakkes; en portion pommes skal. Ingen hak = alt, der
     går ud af huset — det rimelige udgangspunkt, når ejeren har
     sat en pris uden at pege på noget. */
  function tegnEmballage() {
    if (!$('emballage-pris')) return;
    var i = Admin.data.indstillinger || {};
    var akt = document.activeElement;
    if (!akt || !akt.closest || !akt.closest('#emballage-kat')) {
      var valgte = Array.isArray(i.emballage_kategorier)
        ? i.emballage_kategorier.map(Number) : [];
      var boks = $('emballage-kat');
      Admin.tøm(boks);
      (Admin.data.menu_kategorier || []).slice()
        .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); })
        .forEach(function (k) {
          var m = Admin.lav('label', 'afkryds');
          var f = document.createElement('input');
          f.type = 'checkbox';
          f.value = String(k.id);
          f.checked = valgte.indexOf(Number(k.id)) !== -1;
          m.appendChild(f);
          m.appendChild(document.createTextNode(' ' + k.navn));
          boks.appendChild(m);
        });
    }
    if (akt && akt.id === 'emballage-pris') return;
    $('emballage-pris').value = i.emballage_pris === undefined
      || i.emballage_pris === null ? '' : String(i.emballage_pris).replace('.', ',');
    if (akt && akt.id === 'emballage-navn') return;
    $('emballage-navn').value = i.emballage_navn || '';
  }

  function samlEmballage() {
    if (!$('emballage-pris')) return Promise.resolve();
    var raa = $('emballage-pris').value.trim();
    var pris = '';
    if (raa !== '') {
      var n = Number(raa.replace(',', '.'));
      if (!isFinite(n) || n < 0 || n > 500) {
        return 'Emballagen skal være et beløb mellem 0 og 500.';
      }
      pris = n;
    }
    var valgte = Array.prototype.slice
      .call($('emballage-kat').querySelectorAll('input:checked'))
      .map(function (f) { return Number(f.value); });

    return Butik.skrive.indstilling('emballage_pris', pris)
      .then(function () {
        return Butik.skrive.indstilling('emballage_navn',
          $('emballage-navn').value.trim());
      })
      .then(function () {
        return Butik.skrive.indstilling('emballage_kategorier', valgte);
      });
  }

  if ($('gem-emballage')) {
    $('gem-emballage').addEventListener('click', function () {
      var svar = samlEmballage();
      if (typeof svar === 'string') return Admin.brøl(svar);
      Admin.gem(svar, 'Emballagen er gemt.');
    });
    Admin.autogem($('gem-emballage').closest('.kort'), samlEmballage);
  }

  Admin.tegnere.push(tegnTider);
  Admin.tegnere.push(tegnKoekken);
  Admin.tegnere.push(tegnEmballage);
})();
