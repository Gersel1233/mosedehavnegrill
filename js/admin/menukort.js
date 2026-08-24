/* Fanen Menukort. Se js/admin/kerne.js for de to principper
   der gælder i alle admin-filerne. */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  /* ---- PRISERNE ER DET, DER MANGLER ----

     Ejerens fulde sortiment kom ind i august 2026: 242 varer, og
     hans liste havde ikke ét tal i sig. Ingen af dem er gættet, så
     over halvdelen af kortet står uden pris — og en vare uden pris
     kan ikke bestilles.

     Det er ejerens arbejde at skrive dem, og det skal kunne gøres
     på en eftermiddag. To ting stod i vejen:

     1) Man kunne ikke SE, hvilke der manglede, uden at rulle hele
        kortet igennem. Derfor tælleren og filteret øverst.
     2) Hver pris kostede et tryk på Gem, og et gem tegner hele
        fanen om (se Admin.gem → genindlæs). Havde man skrevet ti
        priser og gemt den ene, var de ni væk uden en fejl. Derfor
        HUSKES det skrevne på tværs af optegninger, og derfor er
        der én knap, der gemmer dem alle. */

  // Prisen personalet HAR skrevet, men ikke gemt endnu: varens id →
  // teksten i feltet. Overlever optegningen; ryddes når databasen
  // svarer med det samme tal.
  var skrevet = {};
  var kunUdenPris = false;

  function udenPris(v) {
    return v.pris === null || v.pris === undefined || v.pris === '';
  }

  // Prisen som den står i FELTET: dansk komma, tom hvis der ingen er.
  function visPris(v) {
    return udenPris(v) ? '' : String(v.pris).replace('.', ',');
  }

  /* "45" og "45,00" og "45.0" er den samme pris. Sammenligningen
     går på tallet, når begge kan læses som et — ellers ville en
     gemt pris blive hængende i skrevet{} for evigt, fordi teksten
     ikke lignede sig selv. */
  function sammePris(a, b) {
    var x = String(a === null || a === undefined ? '' : a).trim();
    var y = String(b === null || b === undefined ? '' : b).trim();
    if (x === y) return true;
    if (x === '' || y === '') return false;
    var nx = Number(x.replace(',', '.'));
    var ny = Number(y.replace(',', '.'));
    return isFinite(nx) && isFinite(ny) && nx === ny;
  }

  /* Kun varer, der hører til en kategori, der faktisk står på
     fanen. En forældreløs række ville tælle med i "mangler en
     pris" og aldrig kunne rettes — tælleren ville lyve for evigt. */
  function varerPåKortet() {
    var kendte = (Admin.data.menu_kategorier || [])
      .map(function (k) { return String(k.id); });
    return (Admin.data.menu_varer || []).filter(function (v) {
      return kendte.indexOf(String(v.kategori_id)) !== -1;
    });
  }

  // Panelet alene, uden at røre felterne under det.
  function friskPrisPanel() {
    var gammel = $('pris-panel');
    if (!gammel || !gammel.parentNode) return;
    gammel.parentNode.replaceChild(prisPanel(varerPåKortet()), gammel);
  }

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

    var alleVarer = varerPåKortet();

    // Er prisen kommet i databasen, er den ikke "skrevet, ikke gemt".
    alleVarer.forEach(function (v) {
      if (Object.prototype.hasOwnProperty.call(skrevet, v.id)
        && sammePris(skrevet[v.id], visPris(v))) delete skrevet[v.id];
    });

    boks.appendChild(prisPanel(alleVarer));
    boks.appendChild(bestilAntal());

    kategorier.forEach(function (k) {
      var varer = (Admin.data.menu_varer || [])
        .filter(function (v) { return v.kategori_id === k.id; })
        .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); });

      /* Filteret skjuler KATEGORIEN, ikke bare dens varer. En
         overskrift med ingenting under er en kategori, man tror er
         tom — og så opretter nogen varen, der allerede findes. */
      var vises = kunUdenPris
        ? varer.filter(function (v) { return udenPris(v); })
        : varer;
      if (kunUdenPris && !vises.length) return;

      var gruppe = lav('div', 'menu-gruppe');
      /* Id'et i opmærkningen, så en gruppe kan findes uden at lede
         efter et navn. Navnet står i et <input>, og et felts værdi
         er ikke tekst på siden — hverken for en prøve eller for
         den, der skal fejlsøge fanen i en browserkonsol. */
      gruppe.setAttribute('data-kategori', k.id);
      gruppe.appendChild(kategoriHoved(k, kategorier));
      gruppe.appendChild(kanBestilles(k));

      // Pilene flytter i den HELE liste, også når filteret viser
      // et udsnit: rækkefølgen på gæstesiden er hele listens.
      vises.forEach(function (v) { gruppe.appendChild(varerække(v, varer)); });

      /* Genvejen findes, hvor den kan bruges: én pris tastet ét
         sted i stedet for 29 felter. På en kategori med én vare er
         den bare et felt mere at kigge på. Se samlePris(). */
      if (varer.length >= 2) gruppe.appendChild(samlePris(k, varer));
      if (!kunUdenPris) gruppe.appendChild(nyVareFelt(k));
      boks.appendChild(gruppe);
    });

    if (!kunUdenPris) boks.appendChild(nyKategoriFelt(kategorier));
  }

  /* ---- TÆLLEREN, FILTERET OG DEN ENE GEM-KNAP ----

     Panelet står ØVERST på fanen, fordi det er svaret på "hvor
     langt er vi?". Uden det er 118 manglende priser spredt ud over
     21 kategorier, og den eneste måde at finde dem på er at rulle. */
  function prisPanel(alleVarer) {
    var uden = alleVarer.filter(udenPris);
    var venter = Object.keys(skrevet).length;

    var boks = lav('div', 'pris-panel');
    boks.id = 'pris-panel';
    boks.appendChild(lav('div', 'eyebrow', 'Priser'));

    if (!alleVarer.length) {
      boks.appendChild(lav('p', 'hjaelp', 'Der er ingen varer endnu.'));
      return boks;
    }

    boks.appendChild(lav('p', 'hjaelp', uden.length
      ? uden.length + ' af ' + alleVarer.length + ' varer mangler en pris. '
        + 'En vare uden pris kan ikke bestilles — den står med en tankestreg '
        + 'på menukortet, og gæsten kan kun ønske sig den.'
      : 'Alle ' + alleVarer.length + ' varer har en pris.'));

    /* Det skrevne overlever en optegning, men ikke en lukket fane.
       Linjen siger det højt, så ingen går fra skærmen med tallene
       stående i felterne og tror, de er gemt. */
    if (venter) {
      boks.appendChild(lav('p', 'pris-venter', venter === 1
        ? 'Én pris er skrevet, men ikke gemt endnu.'
        : venter + ' priser er skrevet, men ikke gemt endnu.'));
    }

    var række = lav('div', 'pris-knapper');

    if (uden.length || kunUdenPris) {
      var filter = lav('button', 'knap sekundaer', kunUdenPris
        ? 'Vis hele menukortet'
        : (uden.length === 1
          ? 'Vis kun den ene, der mangler en pris'
          : 'Vis kun de ' + uden.length + ', der mangler en pris'));
      filter.type = 'button';
      filter.id = 'pris-filter';
      filter.addEventListener('click', function () {
        kunUdenPris = !kunUdenPris;
        // Ingen data har ændret sig, så der skal ikke gemmes eller
        // hentes — kun tegnes om.
        tegnMenu();
        /* Det NYE panel. boks er revet ud af siden af tegnMenu, og
           scrollIntoView på en knude, der ikke er i siden, gør
           ingenting — listen ville blive skiftet ud under fingeren
           med udsigt til midten af et kort. */
        var nyt = $('pris-panel');
        if (nyt) nyt.scrollIntoView({ block: 'start' });
      });
      række.appendChild(filter);
    }

    var gem = lav('button', 'knap', venter
      ? 'Gem ' + (venter === 1 ? 'prisen' : 'de ' + venter + ' priser')
      : 'Gem priserne');
    gem.type = 'button';
    gem.id = 'gem-alle-priser';
    gem.disabled = !venter;
    gem.addEventListener('click', gemSkrevnePriser);
    række.appendChild(gem);

    boks.appendChild(række);
    return boks;
  }

  /* Alle de skrevne priser i ÉN omgang. Det er ikke en optimering
     — det er den eneste måde, hvorpå et gem ikke kaster resten af
     det skrevne væk, når fanen tegnes om bagefter. */
  function gemSkrevnePriser() {
    var varer = Admin.data.menu_varer || [];
    var ændret = [];
    var fejl = null;

    Object.keys(skrevet).forEach(function (id) {
      var v = varer.filter(function (x) { return String(x.id) === String(id); })[0];
      if (!v) return;                       // varen er slettet imens
      var værdi = String(skrevet[id]).trim();
      var f = Butik.tjek.pris(værdi);
      if (f) { if (!fejl) fejl = v.navn + ': ' + f; return; }
      ændret.push(Object.assign({}, v, { pris: værdi }));
    });

    // Én forkert pris standser HELE gemningen. Halvdelen gemt og
    // halvdelen ikke er værre end ingenting: så ved ingen, hvad der
    // står i databasen.
    if (fejl) return Admin.brøl(fejl);
    if (!ændret.length) {
      return Admin.brøl('Der er ingen nye priser at gemme. Skriv tallene i felterne først.');
    }

    Admin.gem(Promise.all(ændret.map(function (v) {
      return Butik.skrive.vare(v);
    })), ændret.length === 1
      ? ændret[0].navn + ' har fået en pris.'
      : ændret.length + ' priser er gemt.');
  }

  /* ---- HVOR FÅ, OG HVOR TIDLIGT? ----

     De to tal står også på fanen Bestillinger, og det er med
     vilje: det er HER, ejeren sidder, når han åbner en kategori
     for bestilling og skriver priser på den. At skulle skifte fane
     for at sige "mindst 4 stykker" er den slags, der ender med, at
     ingen sætter tallet.

     Det er de SAMME indstillinger — ikke en kopi. Begge faner
     tegnes af Admin.tegnere efter hvert gem, så de kan ikke skride
     fra hinanden. */
  function bestilAntal() {
    var i = Admin.data.indstillinger || {};

    var boks = lav('div', 'pris-panel');
    boks.id = 'menu-antal';
    boks.appendChild(lav('div', 'eyebrow', 'Antal og varsel'));
    boks.appendChild(lav('p', 'hjaelp',
      'Gælder al bestilling af mad ud af huset. De samme to tal står '
      + 'på fanen Bestillinger.'));

    var række = lav('div', 'felt-par');

    var f1 = lav('div', 'felt');
    var m1 = lav('label', null, 'Mindste antal pr. bestilling');
    var min = document.createElement('input');
    min.type = 'number'; min.id = 'menu-min-stk'; min.min = '1'; min.max = '500';
    min.value = i.bestilling_min_stk === undefined ? 1 : i.bestilling_min_stk;
    m1.setAttribute('for', min.id);
    f1.appendChild(m1); f1.appendChild(min);

    var f2 = lav('div', 'felt');
    var m2 = lav('label', null, 'Varsel i timer');
    var varsel = document.createElement('input');
    varsel.type = 'number'; varsel.id = 'menu-varsel-timer';
    varsel.min = '0'; varsel.max = '720';
    varsel.value = i.bestilling_varsel_timer === undefined ? 24 : i.bestilling_varsel_timer;
    m2.setAttribute('for', varsel.id);
    f2.appendChild(m2); f2.appendChild(varsel);

    var knap = lav('button', 'knap', 'Gem antal og varsel');
    knap.type = 'button';
    knap.id = 'gem-menu-antal';
    knap.addEventListener('click', function () {
      var stk = Number(min.value);
      var timer = Number(varsel.value);
      if (!isFinite(stk) || stk < 1 || stk > 500) {
        return Admin.brøl('Mindste antal skal være mellem 1 og 500.');
      }
      if (!isFinite(timer) || timer < 0 || timer > 720) {
        return Admin.brøl('Varslet skal være mellem 0 og 720 timer.');
      }
      Admin.gem(Butik.skrive.indstilling('bestilling_min_stk', Math.round(stk))
        .then(function () {
          return Butik.skrive.indstilling('bestilling_varsel_timer', Math.round(timer));
        }), 'Gæsten skal bestille mindst ' + Math.round(stk) + ' og senest '
          + Math.round(timer) + ' timer før.');
    });

    var f3 = lav('div', 'felt');
    f3.appendChild(knap);

    række.appendChild(f1);
    række.appendChild(f2);
    række.appendChild(f3);
    boks.appendChild(række);
    return boks;
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

    /* NOTEN GÆLDER HELE KATEGORIEN. "På toastbrød eller rugbrød"
       hører til alle tolv slags pindemad, ikke til hver linje —
       skrevet på hver vare ville den fylde tolv gange og sige det
       samme. Feltet er frivilligt; er det tomt, står der ingen
       linje på kortet. */
    var note = document.createElement('input');
    note.type = 'text';
    /* IKKE klassen 'navn'. Prøverne — og flytte-knapperne —
       finder kategoriens navnefelt med '.kat-hoved .navn', og et
       felt mere med samme klasse gør den vælger til to felter.
       Fire prøver faldt på det. */
    note.className = 'kat-note';
    note.id = 'kat-note-' + k.id;
    note.value = k.note || '';
    note.maxLength = 200;
    note.placeholder = 'Note over varerne (valgfri) — fx "På toastbrød eller rugbrød"';

    var gem = lav('button', 'knap', 'Gem');
    gem.addEventListener('click', function () {
      var f = Butik.tjek.navn(navn.value, 'kategorinavn', 80);
      if (f) return Admin.brøl(f);
      Admin.gem(Butik.skrive.kategori({
        id: k.id, navn: navn.value, afdeling: vælger.value, note: note.value,
        sortering: k.sortering, aktiv: k.aktiv,
      }), navn.value + ' er gemt.');
    });

    h.appendChild(navn);
    h.appendChild(vælger);
    h.appendChild(flytKnapper(k, alle, 'kategori'));
    h.appendChild(gem);
    h.appendChild(note);

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

  /* ---- SAMME PRIS PÅ HELE KATEGORIEN ----

     Model A: hvert fyld er en vare med sin egen pris, og gæsten
     bestiller "2 × rejemad". Men de 29 priser skal ind i systemet
     FØRSTE gang, og starter man med samme pris på alle og retter de
     få, der skiller sig ud, er det ét tal og et par rettelser i
     stedet for 29 felter.

     Genvejen stod kun på fyldet. Med ejerens fulde sortiment inde
     er den lige så meget værd på syv pølser og seks burgere, og
     kategorien er kategorien: der er ikke noget særligt ved fyld,
     ud over at det var det første, vi mødte.

     Tallet kommer fra ejeren — feltet står tomt, og der er ingen
     foreslået pris: en pris, siden ikke har fået af forretningen,
     må ikke stå på den. Derfor står der heller ikke noget i
     pladsholderen ud over formatet.

     STANDARDEN ER AT UDFYLDE, IKKE AT OVERSKRIVE. Har ejeren
     allerede skrevet 45 på tre af dem, må et tryk her ikke tage de
     tre med sig — de var det eneste, nogen havde bekræftet. De
     andre skal krydses af med vilje. */
  function samlePris(k, varer) {
    var uden = varer.filter(udenPris);

    var boks = lav('div', 'samle-pris');
    boks.appendChild(lav('div', 'eyebrow', 'Sæt samme pris på alle'));
    boks.appendChild(lav('p', 'hjaelp', uden.length
      ? uden.length + ' af ' + varer.length + ' mangler en pris og kan ikke bestilles endnu — '
        + 'de kan kun ønskes. Sæt en pris, så bliver de rigtige varer.'
      : 'Alle ' + varer.length + ' har en pris og kan bestilles.'));

    var række = lav('div', 'felt-par');
    var felt = document.createElement('input');
    felt.type = 'number';
    /* Id pr. kategori. Det hed 'fyld-samlepris' dengang værktøjet
       kun stod ét sted; med det navn på 21 kategorier ville
       document.getElementById ramme den første, og et felt uden et
       entydigt id kan hverken prøves eller fejlsøges. */
    felt.id = 'samlepris-' + k.id;
    felt.min = '0';
    felt.step = '0.5';
    felt.placeholder = 'fx 45';

    var retAlle = null;
    if (uden.length && uden.length < varer.length) {
      var mærkat = lav('label', 'afkryds');
      retAlle = document.createElement('input');
      retAlle.type = 'checkbox';
      retAlle.id = 'samlepris-alle-' + k.id;
      mærkat.appendChild(retAlle);
      mærkat.appendChild(document.createTextNode('Ret også de '
        + (varer.length - uden.length) + ', der har en pris'));
      boks.appendChild(mærkat);
    }

    function mål() {
      if (!uden.length) return varer;                  // der er ikke andet at gøre
      return (retAlle && retAlle.checked) ? varer : uden;
    }

    var knap = lav('button', 'knap sekundaer', '');
    knap.type = 'button';
    function skrivKnap() {
      var n = mål().length;
      knap.textContent = n === varer.length ? 'Sæt på alle ' + n
        : (n === 1 ? 'Sæt på den ene uden pris' : 'Sæt på de ' + n + ' uden pris');
    }
    skrivKnap();
    if (retAlle) retAlle.addEventListener('change', skrivKnap);

    knap.addEventListener('click', function () {
      var v = felt.value.trim();
      var tal = Number(v);
      if (v === '' || !isFinite(tal) || tal < 0 || tal >= 10000) {
        return Admin.brøl('Skriv en pris mellem 0 og 10.000.');
      }
      var liste = mål();
      var overskriver = liste.filter(function (x) { return !udenPris(x); }).length;
      if (!confirm('Sæt prisen ' + tal + ' kr. på ' + liste.length + ' varer i "'
        + k.navn + '"?'
        + (overskriver ? '\n\n' + overskriver + ' af dem har en pris i forvejen, '
          + 'og den bliver overskrevet.' : '')
        + '\n\nDe, der skiller sig ud, kan rettes enkeltvis bagefter.')) return;

      /* Én ad gangen mod databasen — der findes ikke et kald, der
         retter mange rækker med hver sin id, og 29 kald er få nok
         til at det ikke er værd at bygge et. Der ventes på dem
         alle, så genindlæsningen viser det færdige resultat. */
      Admin.gem(Promise.all(liste.map(function (vare) {
        delete skrevet[vare.id];        // genvejen vinder over det skrevne
        return Butik.skrive.vare(Object.assign({}, vare, { pris: tal }));
      })), 'Prisen ' + tal + ' kr. står nu på ' + liste.length + ' varer i ' + k.navn + '.');
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
    pris.setAttribute('data-pris', v.id);
    pris.setAttribute('aria-label', 'Pris på ' + v.navn);
    /* Har personalet skrevet et tal, der endnu ikke er gemt, står
       DET i feltet — ikke databasens tomme felt. Ellers ville et
       gem på en anden række tørre de øvrige felter af, og de tal
       er tastet af et menneske, der kigger i en mappe. */
    pris.value = Object.prototype.hasOwnProperty.call(skrevet, v.id)
      ? skrevet[v.id] : visPris(v);
    if (!pris.value) pris.classList.add('mangler');

    pris.addEventListener('input', function () {
      if (sammePris(pris.value, visPris(v))) delete skrevet[v.id];
      else skrevet[v.id] = pris.value;
      pris.classList.toggle('mangler', !pris.value.trim());
      /* Panelet øverst tæller det skrevne og styrer Gem-knappen.
         Det tegnes for sig, så markøren bliver stående i feltet —
         hele fanen tegnet om ved hvert tastetryk ville tage feltet
         væk under fingeren. */
      friskPrisPanel();
    });

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

    /* ENTER GEMMER. 118 priser tastet med musen mellem hvert felt
       er en eftermiddag; med Enter er det en halv time.

       I PRISFELTET gemmer Enter ALLE de skrevne priser, ikke kun
       denne række. Gemte den kun rækken, ville optegningen bagefter
       tørre de andre felter af — og personalet ville opdage det
       ved at kigge på kortet bagefter. */
    pris.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      gemSkrevnePriser();
    });
    [navn, tekst].forEach(function (felt) {
      felt.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        gemKnap.click();
      });
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
