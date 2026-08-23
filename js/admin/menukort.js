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
        'Der er ingen kategorier endnu. Opret den første herunder.'));
    }

    kategorier.forEach(function (k) {
      var gruppe = lav('div', 'menu-gruppe');
      /* Id'et i opmærkningen, så en gruppe kan findes uden at lede
         efter et navn. Navnet står i et <input>, og et felts værdi
         er ikke tekst på siden — hverken for en prøve eller for
         den, der skal fejlsøge fanen i en browserkonsol. */
      gruppe.setAttribute('data-kategori', k.id);
      gruppe.appendChild(kategoriHoved(k, kategorier));
      gruppe.appendChild(kanBestilles(k));

      var varer = (Admin.data.menu_varer || [])
        .filter(function (v) { return v.kategori_id === k.id; })
        .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); });

      varer.forEach(function (v) { gruppe.appendChild(varerække(v, varer)); });
      /* Fyldkategorien får sit eget værktøj: 29 priser tastet én ad
         gangen er en halv time og en tastefejl. Se samlePris(). */
      if (/fyld/i.test(k.navn || '')) gruppe.appendChild(samlePris(k, varer));
      gruppe.appendChild(nyVareFelt(k));
      boks.appendChild(gruppe);
    });

    boks.appendChild(nyKategoriFelt(kategorier));
  }

  /* ---- KATEGORIENS EGET HOVED ----

     Kundens spørgsmål (23/8): "på admin kan man administrere
     menukortet ordentligt?" Svaret var nej på tre punkter, og det
     her er de to af dem: navnet var en overskrift, man ikke kunne
     rette, og rækkefølgen kunne kun ændres i databasen.

     Navnet er et felt nu, afdelingen en vælger, og pilene flytter
     kategorien op og ned. Ingen af delene er nye i databasen —
     adgangsreglerne har tilladt det hele tiden (se flerlejer.sql).

     SLET STÅR KUN PÅ EN TOM KATEGORI. Databasen sletter varerne
     med (on delete cascade), og et tryk må ikke kunne tage 29
     varer med sig. Er der varer i, siger linjen det i stedet. */
  function kategoriHoved(k, alle) {
    var h = lav('div', 'kat-hoved');

    var navn = document.createElement('input');
    navn.type = 'text';
    navn.className = 'navn';
    navn.id = 'kat-navn-' + k.id;
    navn.value = k.navn;
    navn.maxLength = 80;

    // 'grill' er det gamle navn for 'mad'. Står der stadig gamle
    // rækker i databasen, skal de ikke vises som ukendte.
    var afd = k.afdeling === 'grill' ? 'mad' : k.afdeling;
    var vælger = document.createElement('select');
    vælger.className = 'smal-vaelger';
    vælger.id = 'kat-afd-' + k.id;
    [['mad', 'Mad'], ['is', 'Is'], ['drikke', 'Drikkevarer']].forEach(function (p) {
      var o = document.createElement('option');
      o.value = p[0]; o.textContent = p[1];
      if (p[0] === afd) o.selected = true;
      vælger.appendChild(o);
    });

    var gem = lav('button', 'knap', 'Gem');
    gem.addEventListener('click', function () {
      var f = Butik.tjek.navn(navn.value, 'kategorinavn', 80);
      if (f) return Admin.brøl(f);
      Admin.gem(Butik.skrive.kategori({
        id: k.id, navn: navn.value, afdeling: vælger.value,
        sortering: k.sortering, aktiv: k.aktiv,
      }), navn.value + ' er gemt.');
    });

    h.appendChild(navn);
    h.appendChild(vælger);
    h.appendChild(flytKnapper(k, alle, 'kategori'));
    h.appendChild(gem);

    var varer = (Admin.data.menu_varer || [])
      .filter(function (v) { return v.kategori_id === k.id; });
    if (!varer.length) {
      var slet = lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!window.confirm('Slet kategorien "' + k.navn + '"?')) return;
        Admin.gem(Butik.skrive.sletKategori(k.id), k.navn + ' er slettet.');
      });
      h.appendChild(slet);
    }

    return h;
  }

  /* ---- OP OG NED ----

     Rækkefølgen på gæstesiden er kolonnen sortering, og den kunne
     kun sættes ved at oprette varen i den rigtige orden. Fik
     ejeren en ny ret, lå den nederst for evigt.

     De to rækker BYTTER tal. Det er med vilje ikke "sæt alle
     sorteringer om": to skrivninger i stedet for fjorten, og
     ingen anden række rykker sig, mens man kigger. Har to rækker
     samme tal — og det har de, hvis de er oprettet i SQL med
     sortering 0 — får de to nye, der ligger et tal fra hinanden,
     så byttet faktisk kan ses. */
  function flytKnapper(r, alle, slags) {
    var boks = lav('span', 'flyt');
    var plads = alle.map(function (x) { return String(x.id); }).indexOf(String(r.id));

    [['↑', -1, 'Flyt op'], ['↓', 1, 'Flyt ned']].forEach(function (p) {
      var knap = lav('button', 'knap lille', p[0]);
      knap.type = 'button';
      knap.title = p[1] === -1 ? 'Flyt op' : 'Flyt ned';
      knap.setAttribute('aria-label', p[2] + ': ' + r.navn);
      var nabo = alle[plads + p[1]];
      var retning = p[1];
      if (!nabo) knap.disabled = true;
      knap.addEventListener('click', function () { byt(r, nabo, slags, retning); });
      boks.appendChild(knap);
    });
    return boks;
  }

  function byt(a, b, slags, retning) {
    var sa = Number(a.sortering) || 0;
    var sb = Number(b.sortering) || 0;
    /* a får b's tal og b får a's. Det virker kun, hvis de to tal
       er forskellige — og to rækker oprettet i SQL har begge
       sortering 0. Så laves der plads, og RETNINGEN afgør hvilken
       vej: skal a op, skal a ende med det MINDSTE tal, altså skal
       b's tal være det mindste af de to nu.

       Første udgave regnede det ud af tallene selv (sa <= sb) og
       ramte derfor altid "ned", uanset hvilken pil man trykkede
       på. Fanget af prøven "to varer med samme sortering kan
       stadig bytte plads" — den var skrevet netop til det. */
    if (sa === sb) { sa = sb + (retning < 0 ? 1 : -1); }
    var skriv = slags === 'kategori' ? Butik.skrive.kategori : Butik.skrive.vare;
    Admin.gem(Promise.all([
      skriv(Object.assign({}, a, { sortering: sb })),
      skriv(Object.assign({}, b, { sortering: sa })),
    ]), a.navn + ' er flyttet.');
  }

  function nyKategoriFelt(alle) {
    var boks = lav('div', 'menu-gruppe ny-kategori');
    boks.appendChild(lav('div', 'eyebrow', 'Ny kategori'));
    boks.appendChild(lav('p', 'hjaelp',
      'En kategori er en overskrift på menukortet — "Burgere", '
      + '"Vinterretter". Afdelingen bestemmer, hvor på menukortet den står.'));

    var r = lav('div', 'admin-raekke');
    var navn = document.createElement('input');
    navn.type = 'text'; navn.className = 'navn'; navn.id = 'ny-kategori-navn';
    navn.placeholder = 'Fx Vinterretter'; navn.maxLength = 80;

    var vælger = document.createElement('select');
    vælger.className = 'smal-vaelger'; vælger.id = 'ny-kategori-afd';
    [['mad', 'Mad'], ['is', 'Is'], ['drikke', 'Drikkevarer']].forEach(function (p) {
      var o = document.createElement('option');
      o.value = p[0]; o.textContent = p[1];
      vælger.appendChild(o);
    });

    var knap = lav('button', 'knap', 'Opret');
    knap.addEventListener('click', function () {
      var f = Butik.tjek.navn(navn.value, 'kategorinavn', 80);
      if (f) return Admin.brøl(f);
      var højeste = alle.reduce(function (m, k) {
        return Math.max(m, Number(k.sortering) || 0);
      }, 0);
      Admin.gem(Butik.skrive.kategori({
        navn: navn.value, afdeling: vælger.value, sortering: højeste + 1,
      }), navn.value + ' er oprettet.');
    });

    r.appendChild(navn);
    r.appendChild(vælger);
    r.appendChild(knap);
    boks.appendChild(r);
    return boks;
  }

  /* ---- HVAD KAN BESTILLES UD AF HUSET? ----

     Smørrebrødet kan altid — det er dét, bestillingssiden er
     bygget om. Resten af kortet kun hvis personalet siger ja her.

     Fluebenet er ejerens beslutning, ikke en indstilling i koden:
     den dag køkkenet kan nå at lave pølser ud af huset, er det ét
     tryk. Og lige så vigtigt den anden vej — er fluebenet ikke
     sat, står der ikke ét ord om det på gæstesiden.

     Kun varer MED pris kommer med på siden, så en kategori uden
     priser gør ingen skade: linjen siger det højt i stedet. */
  function kanBestilles(k) {
    /* ISEN HAR INTET FLUEBEN — for det ville ikke virke.
       Kundens ord (23/8): "isen skal stå som en flot fremvisning
       ... men det skal man ikke kunne bestille, det er altid til
       rådighed." Gæstesiden filtrerer is-afdelingen fra i
       Butik.udvalg. Stod fluebenet her, ville personalet sætte det
       og bagefter lede efter fejlen på en side, der gør præcis det,
       den skal. */
    if (k.afdeling === 'is') {
      return lav('p', 'kan-bestilles-nej',
        'Isen bestilles ikke — den laves i lugen, mens gæsten står der. '
        + 'Den står som fremvisning på forsiden.');
    }

    var række = lav('label', 'afkryds kan-bestilles');
    var felt = document.createElement('input');
    felt.type = 'checkbox';
    felt.id = 'bestilbar-' + k.id;

    var smørrebrød = /smørrebrød|fyld/i.test(k.navn || '');
    var valgte = ((Admin.data.indstillinger || {}).bestilbare_kategorier || [])
      .map(Number);

    felt.checked = smørrebrød || valgte.indexOf(Number(k.id)) !== -1;
    felt.disabled = smørrebrød;

    felt.addEventListener('change', function () {
      var nu = ((Admin.data.indstillinger || {}).bestilbare_kategorier || [])
        .map(Number)
        .filter(function (id) { return id !== Number(k.id); });
      if (felt.checked) nu.push(Number(k.id));

      Admin.gem(Butik.skrive.indstilling('bestilbare_kategorier', nu),
        felt.checked
          ? k.navn + ' kan nu bestilles ud af huset.'
          : k.navn + ' kan ikke længere bestilles ud af huset.');
    });

    række.appendChild(felt);
    række.appendChild(lav('span', null, smørrebrød
      ? 'Kan altid bestilles ud af huset'
      : 'Kan bestilles ud af huset'));
    return række;
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

  function varerække(v, alle) {
    var r = lav('div', 'admin-raekke vare-raekke');
    r.setAttribute('data-vare', v.id);

    var navn = document.createElement('input');
    navn.type = 'text'; navn.className = 'navn'; navn.value = v.navn; navn.maxLength = 120;

    var pris = document.createElement('input');
    pris.type = 'text'; pris.className = 'smal'; pris.inputMode = 'decimal';
    pris.placeholder = 'kr.';
    pris.value = (v.pris === null || v.pris === undefined) ? '' : String(v.pris).replace('.', ',');

    /* BESKRIVELSEN KUNNE IKKE RETTES.

       Den blev sendt uændret med hver gang varen blev gemt —
       beskrivelse: v.beskrivelse — så teksten under varenavnet på
       gæstesiden kunne kun skrives i SQL. Det er den ene sætning,
       der sælger retten, og den var låst for den, der laver maden.

       Den står på sin egen linje under navnet og ikke som en
       kolonne mere: en fjerde kolonne ville presse felterne
       sammen til ingenting på en iPad. */
    var tekst = document.createElement('input');
    tekst.type = 'text'; tekst.className = 'vare-tekst-felt';
    tekst.value = v.beskrivelse || '';
    tekst.maxLength = 400;
    tekst.placeholder = 'Beskrivelse (valgfri) — den linje gæsten læser under navnet';

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
        beskrivelse: tekst.value,
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
    r.appendChild(flytKnapper(v, alle, 'vare'));
    r.appendChild(gemKnap);
    r.appendChild(sletKnap);
    r.appendChild(tekst);
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
