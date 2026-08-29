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

  /* ---- HVAD ER DER FILTRERET PÅ, OG HVAD ER DER SØGT EFTER? ----

     Fanen havde ÉT filter: "vis kun dem uden pris". Det var det
     rigtige den dag, 118 priser skulle skrives — men det er ikke
     det, fanen bruges til bagefter. Til daglig er spørgsmålet
     "hvad er udsolgt", "hvad er ved at slippe op" og "hvor er den
     pølse henne".

     ⚠️ 'uden-pris' HEDDER STADIG DET SAMME, og knappen har stadig
     id'et pris-filter. Den var vejen igennem 242 varer på en
     eftermiddag, og den skal ikke laves om, fordi der er kommet
     fire søskende. */
  var filter = 'alle';
  var soeg = '';

  /* Hvornår er kortet så langt, at kategorierne skal foldes?

     ⚠️ MÅLT, IKKE GÆTTET. Ejerens kort er 242 varer i 21
     kategorier. Med alt slået ud er det omkring 280 rækker felter
     — en skærm, man ruller igennem i tyve sekunder for at nå
     "Øl". Under 30 varer fylder hele kortet under to skærme, og
     dér er en fold bare et tryk mere mellem personalet og
     arbejdet. Derfor tælles der, og der foldes ikke på en tom
     forretning. */
  var FOLD_FRA = 30;

  // Hvilke kategorier står åbne? Overlever en optegning — ellers
  // ville folden smække i, hver gang et felt gemte sig selv.
  var aabne = {};

  /* Hvornår er "få tilbage" få? Tallet er gæstesidens: js/skal/
     menukort.js skriver "Kun N tilbage" fra og med fem. To
     udgaver af "hvornår er det ved at slippe op" ville betyde, at
     hjemmesiden advarede gæsten, mens admin sagde, alt var fint. */
  var FAA_TILBAGE = 5;

  /* ---- FINDES KOLONNEN OVERHOVEDET? ----

     antal_tilbage og dage kom til med
     supabase/menukort-antal-og-dage.sql, og den fil er EJERENS at
     køre. Indtil da findes felterne ikke i databasen.

     ⚠️ ET FELT UDEN EN KOLONNE BAG SIG ER VÆRRE END INTET FELT.
     Det ser rigtigt ud, personalet skriver "10 tilbage" i det, og
     gemmet fejler — eller, hvis vi tav om fejlen, gemte det
     ingenting, og køkkenet regnede med et tal, der aldrig blev
     talt ned.

     Svaret læses af DET, DATABASEN HAR SVARET, og ikke af en
     indstilling nogen skal huske at sætte: har rækkerne nøglen,
     er kolonnen der. Er der ingen rækker endnu, er der heller
     ikke noget at vise feltet på. */
  function harNoegle(raekker, noegle) {
    return (raekker || []).some(function (r) {
      return Object.prototype.hasOwnProperty.call(r, noegle);
    });
  }

  function maaAntal() {
    return harNoegle(Admin.data && Admin.data.menu_varer, 'antal_tilbage');
  }

  function maaDage() {
    return harNoegle(Admin.data && Admin.data.menu_kategorier, 'dage');
  }

  var DAGE_NAVNE = {
    alle: 'Alle dage', hverdage: 'Kun hverdage', weekend: 'Kun weekend',
  };

  function udenPris(v) {
    return v.pris === null || v.pris === undefined || v.pris === '';
  }

  function antalAf(v) {
    return v.antal_tilbage === null || v.antal_tilbage === undefined
      ? null : Number(v.antal_tilbage);
  }

  /* ⚠️ FÅ TILBAGE ER IKKE NUL TILBAGE. En vare, der er talt ned
     til nul, ER udsolgt — databasen sætter selv fluebenet — og
     den hører til under Udsolgt. Stod den begge steder, ville de
     to tal tilsammen være større end antallet af varer, og så
     holder man op med at stole på dem. */
  function faaTilbage(v) {
    var n = antalAf(v);
    return n !== null && n > 0 && n <= FAA_TILBAGE;
  }

  function skjult(v) { return v.aktiv === false; }

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

    var status = lav('div', 'menu-status');
    status.id = 'menu-status';
    status.appendChild(statusFelter(alleVarer));
    if (alleVarer.length) status.appendChild(soegefelt());
    if (filter === 'udsolgt') {
      var masse = aabnAlleIgen(alleVarer);
      if (masse) status.appendChild(masse);
    }
    status.appendChild(prisPanel(alleVarer));
    boks.appendChild(status);
    boks.appendChild(bestilAntal());

    /* ⚠️ FOLDET, NÅR KORTET ER LANGT — OG ÅBENT, NÅR DER SØGES.
       Se noten ved FOLD_FRA. Et filter eller en søgning har
       allerede skåret ned til det, man leder efter; at skulle
       åbne en fold oveni ville være et tryk for at se det, man
       lige har bedt om. */
    var folder = alleVarer.length > FOLD_FRA && !filtrerer();

    kategorier.forEach(function (k) {
      var varer = (Admin.data.menu_varer || [])
        .filter(function (v) { return v.kategori_id === k.id; })
        .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); });

      /* Filteret skjuler KATEGORIEN, ikke bare dens varer. En
         overskrift med ingenting under er en kategori, man tror er
         tom — og så opretter nogen varen, der allerede findes.

         ⚠️ MEN EN TOM KATEGORI SKAL BLIVE STÅENDE, når der ikke
         filtreres: den er stedet, hvor den første vare oprettes. */
      var vises = filtrerer() ? varer.filter(passer) : varer;
      if (filtrerer() && !vises.length) return;

      var gruppe = lav('div', 'menu-gruppe');
      /* Id'et i opmærkningen, så en gruppe kan findes uden at lede
         efter et navn. Navnet står i et <input>, og et felts værdi
         er ikke tekst på siden — hverken for en prøve eller for
         den, der skal fejlsøge fanen i en browserkonsol. */
      gruppe.setAttribute('data-kategori', k.id);

      /* ⚠️ EN LUKKET KATEGORI ER ÉN LINJE — HELE VEJEN.
         Første udgave foldede kun VARERNE væk og lod
         kategorihovedet stå: navnefelt, afdeling, dage, pile, Gem
         og et tomt notefelt. **Målt: 21 lukkede kategorier fyldte
         stadig fire skærme**, og notefeltet lignede noget, der
         skulle udfyldes. Er den lukket, står der navnet og
         tallene, og intet andet. */
      var aaben = !folder || aabne[k.id];
      gruppe.classList.toggle('foldet', !aaben);
      if (folder) gruppe.appendChild(foldeknap(k, varer));
      if (!aaben) { boks.appendChild(gruppe); return; }

      gruppe.appendChild(kategoriHoved(k, kategorier));

      var krop = lav('div', 'menu-krop');
      krop.appendChild(kanBestilles(k));

      // Pilene flytter i den HELE liste, også når filteret viser
      // et udsnit: rækkefølgen på gæstesiden er hele listens.
      vises.forEach(function (v) { krop.appendChild(varerække(v, varer)); });

      /* Genvejen findes, hvor den kan bruges: én pris tastet ét
         sted i stedet for 29 felter. På en kategori med én vare er
         den bare et felt mere at kigge på. Se samlePris(). */
      if (varer.length >= 2) krop.appendChild(samlePris(k, varer));
      if (!filtrerer()) krop.appendChild(nyVareFelt(k));

      gruppe.appendChild(krop);
      boks.appendChild(gruppe);
    });

    if (!filtrerer()) boks.appendChild(nyKategoriFelt(kategorier));

    /* Søgte man efter noget, der ikke findes, skal det siges. En
       tom skærm ligner en fane, der er gået i stå — og så
       genindlæser nogen midt i en frokost. */
    if (filtrerer() && !boks.querySelector('.menu-gruppe')) {
      boks.appendChild(lav('p', 'vare-tekst', soeg
        ? 'Ingen varer hedder noget med "' + soeg + '".'
        : 'Ingen varer i den gruppe.'));
    }
  }

  /* ---- FOLDEN, OG HVAD DER STÅR PÅ DEN ----

     Overskriften alene er ikke nok til at vælge en kategori fra:
     "Burgere" siger ikke, om der er noget at se på i den i dag.
     Tallene gør — og de er de SAMME tal som de fem felter øverst,
     så en lukket fold ikke kan skjule et rødt tal. */
  function foldeknap(k, varer) {
    var aaben = !!aabne[k.id];
    var knap = lav('button', 'menu-fold' + (aaben ? ' aaben' : ''));
    knap.type = 'button';
    knap.setAttribute('data-fold', k.id);
    knap.setAttribute('aria-expanded', aaben ? 'true' : 'false');

    knap.appendChild(lav('span', 'menu-fold-pil', aaben ? '▾' : '▸'));
    /* NAVNET STÅR PÅ FOLDEN, ikke kun i feltet indeni. Et felt,
       man ikke kan se, er ikke en overskrift — og en lukket
       kategori uden navn er en linje, ingen kan vælge fra. */
    knap.appendChild(lav('span', 'menu-fold-navn', k.navn));
    knap.appendChild(lav('span', 'menu-fold-antal',
      varer.length + (varer.length === 1 ? ' vare' : ' varer')));

    var udsolgte = varer.filter(function (v) { return !!v.udsolgt; }).length;
    var faa = maaAntal() ? varer.filter(faaTilbage).length : 0;
    var uden = varer.filter(udenPris).length;

    if (udsolgte) knap.appendChild(lav('span', 'menu-fold-varsel', udsolgte + ' udsolgt'));
    if (faa) knap.appendChild(lav('span', 'menu-fold-varsel', faa + ' få tilbage'));
    if (uden) knap.appendChild(lav('span', 'menu-fold-note', uden + ' uden pris'));

    knap.addEventListener('click', function () {
      aabne[k.id] = !aabne[k.id];
      /* Hele fanen tegnes om — som ved filteret og søgningen. Det
         er kun sikkert, fordi PRISERNE huskes i skrevet{} på tværs
         af optegninger: uden det ville en fold, der blev rørt,
         tørre de tal af, som nogen stod og skrev i en anden
         kategori. Se noten øverst i filen.

         ⚠️ OG MARKØREN SKAL TILBAGE PÅ KNAPPEN. Uden det lander
         fokus på <body>, og den, der folder sig igennem kortet med
         tastaturet, begynder forfra ved hver fold. */
      tegnMenu();
      var nyt = document.querySelector('[data-fold="' + k.id + '"]');
      if (nyt) nyt.focus();
    });
    return knap;
  }

  /* ============================================================
     SÅDAN STÅR KORTET
     ------------------------------------------------------------
     Fem tal, og de svarer på de fem spørgsmål, man ellers skal
     rulle 242 rækker igennem for at besvare. Hvert tal er en
     KNAP: et tryk filtrerer listen, så tallet også er vejen hen
     til arbejdet og ikke bare noget at kigge på.

     ⚠️ FELTER, DER IKKE KAN LADE SIG GØRE, FINDES IKKE.
     "Få tilbage" kræver kolonnen antal_tilbage, og den kommer
     med supabase/menukort-antal-og-dage.sql, som er EJERENS at
     køre. Indtil da ville feltet stå og sige 0 om noget, der
     ikke kan tælles. Se maaAntal().
     ============================================================ */
  var FILTRE = [
    { id: 'alle', navn: 'Alle', note: 'hele kortet',
      passer: function () { return true; } },
    { id: 'udsolgt', navn: 'Udsolgt', note: 'kan ikke bestilles nu',
      passer: function (v) { return !!v.udsolgt; } },
    { id: 'faa', navn: 'Få tilbage', note: FAA_TILBAGE + ' eller færre',
      kraeverAntal: true, passer: faaTilbage },
    { id: 'uden-pris', navn: 'Mangler pris', note: 'kan ses, ikke bestilles',
      passer: udenPris },
    { id: 'skjult', navn: 'Skjult', note: 'ikke på kortet', passer: skjult },
  ];

  function filterNu() {
    return FILTRE.filter(function (f) { return f.id === filter; })[0] || FILTRE[0];
  }

  /* Søgningen er den vigtigste af dem alle på et kort med 242
     varer: "hvor er pølsen henne" er tyve sekunders rulning uden
     den. Der søges i BÅDE navn og beskrivelse — ejeren husker
     ikke altid, hvad varen hedder, men han husker, hvad der er i
     den. */
  function passerSoeg(v) {
    if (!soeg) return true;
    var s2 = soeg.toLowerCase();
    return String(v.navn || '').toLowerCase().indexOf(s2) !== -1
      || String(v.beskrivelse || '').toLowerCase().indexOf(s2) !== -1;
  }

  function passer(v) {
    return filterNu().passer(v) && passerSoeg(v);
  }

  // Er der overhovedet skruet på noget? Så skal folderne åbne sig.
  function filtrerer() { return filter !== 'alle' || !!soeg; }

  function saetFilter(f) {
    filter = (filter === f && f !== 'alle') ? 'alle' : f;
    tegnMenu();
    var nyt = $('menu-status');
    if (nyt) nyt.scrollIntoView({ block: 'start' });
  }

  function statusFelter(alleVarer) {
    var boks = lav('div', 'menu-tal');

    FILTRE.forEach(function (f) {
      if (f.kraeverAntal && !maaAntal()) return;
      var n = f.id === 'alle' ? alleVarer.length : alleVarer.filter(f.passer).length;
      var k = lav('button', 'menu-tal-felt'
        + (filter === f.id ? ' valgt' : '')
        + (n && (f.id === 'udsolgt' || f.id === 'faa') ? ' varsel' : ''));
      k.type = 'button';
      k.setAttribute('data-menutal', f.id);
      k.setAttribute('aria-pressed', filter === f.id ? 'true' : 'false');
      k.appendChild(lav('span', 'menu-tal-tal', String(n)));
      k.appendChild(lav('span', 'menu-tal-navn', f.navn));
      k.appendChild(lav('span', 'menu-tal-note', f.note));
      k.addEventListener('click', function () { saetFilter(f.id); });
      boks.appendChild(k);
    });

    return boks;
  }

  function soegefelt() {
    var r = lav('div', 'menu-soeg');
    var f = document.createElement('input');
    f.type = 'search';
    f.id = 'menu-soeg';
    f.placeholder = 'Søg efter en vare — fx pølse';
    f.setAttribute('aria-label', 'Søg på menukortet');
    f.value = soeg;
    /* ⚠️ DER TEGNES OM VED HVERT TASTETRYK, og markøren skal
       tilbage i feltet bagefter. Uden det mistede man feltet efter
       første bogstav, og resten af ordet landede ingen steder. */
    f.addEventListener('input', function () {
      soeg = f.value.trim();
      tegnMenu();
      var nyt = $('menu-soeg');
      if (nyt) { nyt.focus(); nyt.setSelectionRange(nyt.value.length, nyt.value.length); }
    });
    r.appendChild(f);
    return r;
  }

  /* ---- ÉT TRYK OM MORGENEN ----

     Det, der er meldt udsolgt i går, skal på kortet igen i dag, og
     med tolv udsolgte varer er det tolv tryk plus tolv gange at
     finde rækken. Knappen står KUN, når man kigger på de udsolgte
     — den er et redskab til den opgave, ikke en knap på hele fanen.

     ⚠️ DEN RØRER IKKE DEM, DER ER TALT NED TIL NUL. En vare med
     antal_tilbage = 0 er udsolgt, fordi databasen talte den ned,
     og satte vi bare fluebenet fra, ville gæsten kunne lægge den i
     kurven — og bremsen ville afvise hele bestillingen ved
     afsendelsen. Hun ville ikke ane hvorfor. De skal have et nyt
     antal, og linjen siger det. */
  function aabnAlleIgen(alleVarer) {
    var udsolgte = alleVarer.filter(function (v) { return !!v.udsolgt; });
    if (!udsolgte.length) return null;

    var kanAabnes = udsolgte.filter(function (v) { return antalAf(v) !== 0; });
    var talt = udsolgte.length - kanAabnes.length;

    var boks = lav('div', 'menu-massehandling');
    if (kanAabnes.length) {
      var knap = lav('button', 'knap', kanAabnes.length === 1
        ? 'Sæt den ene til salg igen'
        : 'Sæt alle ' + kanAabnes.length + ' til salg igen');
      knap.type = 'button';
      knap.id = 'aabn-alle-udsolgte';
      knap.addEventListener('click', function () {
        if (!window.confirm('Sæt ' + kanAabnes.length + ' udsolgte varer til salg igen?\n\n'
          + 'De står på kortet med det samme.')) return;
        knap.disabled = true;
        var kaede = kanAabnes.reduce(function (p, v) {
          return p.then(function () {
            return Butik.skrive.vare({
              id: v.id, kategori_id: v.kategori_id, navn: v.navn,
              beskrivelse: v.beskrivelse, pris: visPris(v),
              fremhaevet: v.fremhaevet, udsolgt: false, aktiv: v.aktiv,
              sortering: v.sortering,
            });
          });
        }, Promise.resolve());
        Admin.gem(kaede, kanAabnes.length + ' varer er til salg igen.');
      });
      boks.appendChild(knap);
    }
    if (talt) {
      boks.appendChild(lav('p', 'hjaelp', talt === 1
        ? 'Én er udsolgt, fordi der er talt ned til nul. Skriv et nyt '
          + 'antal på den — ellers afviser databasen bestillingen.'
        : talt + ' er udsolgte, fordi der er talt ned til nul. Skriv et nyt '
          + 'antal på dem — ellers afviser databasen bestillingen.'));
    }
    return boks;
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

    /* ⚠️ KNAPPEN BLIVER, OG DEN BEHOLDER SIT ID.

       Den var vejen igennem 242 varer på en eftermiddag, og selv
       om "Mangler pris" nu også er et af de fem tal øverst, er
       den her stadig dér, hvor sætningen om hullerne står. De to
       gør det samme — saetFilter er den ene vej ind, så de ikke
       kan komme til at være uenige om, hvad der er slået til. */
    if (uden.length || filter === 'uden-pris') {
      var filterKnap = lav('button', 'knap sekundaer', filter === 'uden-pris'
        ? 'Vis hele menukortet'
        : (uden.length === 1
          ? 'Vis kun den ene, der mangler en pris'
          : 'Vis kun de ' + uden.length + ', der mangler en pris'));
      filterKnap.type = 'button';
      filterKnap.id = 'pris-filter';
      filterKnap.addEventListener('click', function () { saetFilter('uden-pris'); });
      række.appendChild(filterKnap);
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

    /* ---- HVILKE DAGE LAVES DET? ----

       Kundens billeder (26/8): en rulleliste ude til højre for
       kategorinavnet. Burgerne laves ikke i weekenden, og stod de
       på kortet alligevel, ville en gæst bestille en burger til
       lørdag, og køkkenet ville opdage det lørdag morgen.

       ⚠️ VÆLGEREN FINDES KUN, NÅR KOLONNEN GØR. Se maaAntal() og
       maaDage() øverst. */
    var dage = null;
    if (maaDage()) {
      dage = document.createElement('select');
      dage.className = 'smal-vaelger';
      dage.id = 'kat-dage-' + k.id;
      dage.setAttribute('aria-label', 'Hvilke dage laves ' + k.navn);
      Object.keys(DAGE_NAVNE).forEach(function (n) {
        var o = document.createElement('option');
        o.value = n; o.textContent = DAGE_NAVNE[n];
        if (n === (k.dage || 'alle')) o.selected = true;
        dage.appendChild(o);
      });
    }

    function saml() {
      var f = Butik.tjek.navn(navn.value, 'kategorinavn', 80);
      if (f) return f;
      var ud = {
        id: k.id, navn: navn.value, afdeling: vælger.value, note: note.value,
        sortering: k.sortering, aktiv: k.aktiv,
      };
      // undefined = rør ikke kolonnen. Se noten i js/store-skriv.js.
      if (dage) ud.dage = dage.value;
      return Butik.skrive.kategori(ud);
    }

    var gem = lav('button', 'knap', 'Gem');
    gem.addEventListener('click', function () {
      var svar = saml();
      if (typeof svar === 'string') return Admin.brøl(svar);
      Admin.gem(svar, navn.value + ' er gemt.');
    });

    h.appendChild(navn);
    h.appendChild(vælger);
    if (dage) h.appendChild(dage);
    h.appendChild(flytKnapper(k, alle, 'kategori'));
    h.appendChild(gem);
    h.appendChild(note);

    /* ⚠️ AUTOGEM PÅ HOVEDET, IKKE PÅ HELE FANEN. "Alt gemmes
       automatisk, mens du skriver" står i kundens billeder, og en
       medarbejder, der retter en kategori kl. 11.55 og går, har
       ellers rettet ingenting.

       Roden er KORTET (h) og ikke en boks, der tegnes om — se
       noten ved Admin.autogem: hænger mærket på noget, der
       genopbygges, rives det ned under fingeren. */
    Admin.autogem(h, saml);

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

    /* Dagevælgeren står her OGSÅ, når kolonnen findes. En kategori,
       der først skal oprettes og så åbnes igen for at sættes til
       hverdage, er to arbejdsgange, hvor der er brug for én. */
    var dage = null;
    if (maaDage()) {
      dage = document.createElement('select');
      dage.className = 'smal-vaelger'; dage.id = 'ny-kategori-dage';
      dage.setAttribute('aria-label', 'Hvilke dage laves den nye kategori');
      Object.keys(DAGE_NAVNE).forEach(function (n) {
        var o = document.createElement('option');
        o.value = n; o.textContent = DAGE_NAVNE[n];
        dage.appendChild(o);
      });
    }

    var knap = lav('button', 'knap tilfoej', '+ Tilføj kategori');
    knap.type = 'button';
    knap.addEventListener('click', function () {
      var f = Butik.tjek.navn(navn.value, 'kategorinavn', 80);
      if (f) return Admin.brøl(f);
      var højeste = alle.reduce(function (m, k) {
        return Math.max(m, Number(k.sortering) || 0);
      }, 0);
      var ud = {
        navn: navn.value, afdeling: vælger.value, sortering: højeste + 1,
      };
      if (dage) ud.dage = dage.value;
      Admin.gem(Butik.skrive.kategori(ud), navn.value + ' er oprettet.');
    });

    navn.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      knap.click();
    });

    r.appendChild(navn);
    r.appendChild(vælger);
    if (dage) r.appendChild(dage);
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

    /* ⚠️ ER DER INGEN HULLER, ER KASSEN I VEJEN (27/8).

       Genvejen stod åben på HVER kategori — også dem, hvor alle
       varer havde en pris. MÅLT på Menukort-fanen: en grå kasse
       på fire linjer pr. kategori, hvoraf de fleste sagde "Alle 3
       har en pris og kan bestilles" og tilbød at overskrive dem.

       Det modsiger genvejens egen regel to linjer nede — at den
       UDFYLDER og ikke overskriver — og med 21 kategorier er det
       21 kasser, man ruller forbi for at nå varerne.

       Den forsvinder ikke: en generel prisstigning på syv pølser
       er et rigtigt ærinde. Den er bare foldet, når der ikke er
       noget hul at fylde. */
    var lukket = !uden.length;
    var boks = lav(lukket ? 'details' : 'div', 'samle-pris');
    var hoved = lukket ? lav('summary', 'eyebrow', 'Sæt samme pris på alle ' + varer.length)
      : lav('div', 'eyebrow', 'Sæt samme pris på alle');
    boks.appendChild(hoved);
    boks.appendChild(lav('p', 'hjaelp', uden.length
      ? uden.length + ' af ' + varer.length + ' mangler en pris og kan ikke bestilles endnu — '
        + 'de kan kun ønskes. Sæt en pris, så bliver de rigtige varer.'
      : 'Alle ' + varer.length + ' har en pris. Herinde kan de sættes til det samme tal '
        + 'på én gang — fx ved en prisstigning.'));

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
    /* Klassen på RÆKKEN og ikke en :has()-vælger i stilarket: den
       udsolgte tilstand skal kunne ses i opmærkningen, både af en
       prøve og af den, der fejlsøger i en konsol. */
    var r = lav('div', 'admin-raekke vare-raekke'
      + (v.udsolgt ? ' udsolgt-vare' : ''));
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
    tekst.placeholder = 'Beskrivelse';

    /* ---- FÅ TILBAGE ----

       Kundens billeder (26/8). Tallet er FRIVILLIGT: tomt betyder
       ingen tælling, og det er stadig det rigtige for en pølse,
       køkkenet laver i det uendelige.

       ⚠️ TALLET TÆLLES NED AF DATABASEN, ikke af et menneske. Det
       var hele indvendingen mod feltet, dengang det ikke var
       bygget: et tal, personalet tæller ned i hånden, bliver
       forkert i løbet af en frokost. Bremsen ligger i
       supabase/menukort-antal-og-dage.sql, og feltet her er kun
       til at SÆTTE tallet. */
    var antal = null;
    var antalRørt = false;
    if (maaAntal()) {
      antal = document.createElement('input');
      antal.type = 'text'; antal.className = 'smal';
      antal.inputMode = 'numeric';
      antal.placeholder = 'Få tilbage';
      antal.setAttribute('aria-label', 'Hvor mange er der tilbage af ' + v.navn);
      antal.setAttribute('data-antal', v.id);
      antal.value = v.antal_tilbage === null || v.antal_tilbage === undefined
        ? '' : String(v.antal_tilbage);
      /* ⚠️ ET TAL I ET FELT ER IKKE EN ADVARSEL. "3" ser ud som
         enhver anden værdi, og med 242 rækker ruller man forbi
         den. Feltet farves, når der er få tilbage — samme grænse
         som gæstesidens "Kun N tilbage", så de to ikke kan komme
         til at sige noget forskelligt. */
      if (faaTilbage(v)) antal.className += ' antal-faa';
      else if (antalAf(v) === 0) antal.className += ' antal-tom';
      /* ⚠️ ET FLAG, IKKE defaultValue. Første udgave sammenlignede
         antal.value med antal.defaultValue — og defaultValue er
         HTML-attributten, som ikke sættes af at skrive til .value
         i JavaScript. Den var altså tom, "10" !== "" var altid
         sandt, og tallet blev sendt med hver eneste gang.

         Målt: databasen talte ned til 2, mens fanen stod åben, et
         gem på NAVNET skrev 10 tilbage — og køkkenet lovede otte
         portioner, der ikke fandtes. js/admin/forside.js har gjort
         det med et flag hele tiden; det er den samme regel. */
      antal.addEventListener('input', function () { antalRørt = true; });
      antal.addEventListener('change', function () { antalRørt = true; });
    }

    /* ---- FAVORIT OG VIS ER TEGN, IKKE AFKRYDSNINGSFELTER ----

       MÅLT: med "☐ Favorit ☑ Vis" som tekst blev rækken 1106 px
       bred i et felt på 1012, og hver eneste af de 242 rækker brød
       om til to linjer. Et kort, man skal rulle dobbelt så langt
       igennem, er ikke det overblik, kunden bad om (26/8).

       De to er heller ikke dagligt arbejde — de ændres et par
       gange om året, hvor udsolgt ændres flere gange om dagen.
       Et tegn med en forklaring i title er nok til det.

       ⚠️ DE ER STADIG <input type=checkbox>. Kun etiketten er
       skjult for øjet: skærmlæseren læser den som før, og
       tastaturet rammer feltet som før. Et <div> med en klasse
       ville have taget begge dele væk. */
    function hakMed(mærke, sat, tegn, forklaring) {
      var i = document.createElement('input');
      i.type = 'checkbox'; i.checked = !!sat;
      var l = lav('label', 'afkryds hak-tegn');
      l.title = forklaring;
      l.appendChild(i);
      l.appendChild(lav('span', 'hak-ikon', tegn));
      l.appendChild(lav('span', 'kun-skaerm', mærke));
      return { felt: i, mærkat: l };
    }

    var favorit = hakMed('Favorit', v.fremhaevet, '★',
      'Favorit — fremhæves på menukortet');
    var vis = hakMed('Vis', v.aktiv !== false, '👁',
      'Vis på kortet. Tages hakket af, forsvinder varen helt — '
      + 'brug det, når den er væk i en periode.');

    /* ---- UDSOLGT ER EN KNAP, IKKE ET FLUEBEN ----

       Kundens billeder: "Udsolgt?" står som en åben knap, og en
       udsolgt vare bliver til en fyldt rød "UDSOLGT ✕".

       Det er mere end pynt. Udsolgt skifter flere gange om dagen —
       det er den hyppigste handling på hele fanen — og et flueben
       på 12 px ved siden af to andre flueben er et lille mål med
       fedtede fingre. Knappen er hele rækkens højde.

       ⚠️ DEN GEMMER MED DET SAMME. Et tryk på "udsolgt" er en
       besked til gæsterne om, at maden er væk NU; ventede den på
       et gem, ville en gæst nå at bestille imens. */
    var erUdsolgt = !!v.udsolgt;
    var udsolgtKnap = lav('button', 'udsolgt-knap' + (erUdsolgt ? ' er-udsolgt' : ''));
    udsolgtKnap.type = 'button';
    udsolgtKnap.textContent = erUdsolgt ? 'UDSOLGT ✕' : 'Udsolgt?';
    udsolgtKnap.setAttribute('aria-pressed', erUdsolgt ? 'true' : 'false');
    udsolgtKnap.setAttribute('data-udsolgt', v.id);
    /* ⚠️ TEKSTEN HER ER FLYTTET FRA ET AFSNIT ØVERST PÅ FANEN.
       Den stod som prosa nr. 3 ud af tre og blev læst af ingen.
       Den hører til på knappen: udsolgt afvises også i DATABASEN,
       så en gæst, der åbnede kortet for fem minutter siden, ikke
       kan nå at bestille alligevel. */
    udsolgtKnap.title = erUdsolgt
      ? 'Tryk for at sætte ' + v.navn + ' til salg igen'
      : 'Meld ' + v.navn + ' udsolgt. Den forsvinder fra kortet med det '
        + 'samme, og bestillinger fra en telefon, der havde kortet åbent '
        + 'i forvejen, bliver også afvist.';
    udsolgtKnap.addEventListener('click', function () {
      erUdsolgt = !erUdsolgt;
      Admin.gem(byg(false), navn.value + (erUdsolgt ? ' er meldt udsolgt.' : ' er til salg igen.'));
    });

    /* ⚠️ PRISFELTET GEMMES KUN AF PRISMOTOREN — aldrig af autogem
       og aldrig som en sidegevinst ved en anden handling.

       Autogem skriver 1,2 sekund efter sidste tastetryk. Skriver
       ejeren "150" i tre anslag med en prisliste i hånden, ville
       den nå at gemme "1" undervejs — og en burger til 1 krone
       står LIVE på hjemmesiden, til næste ciffer er tastet. En
       gæst kan nå at bestille den.

       Prisen har derfor sin egen vej ind: det skrevne huskes i
       skrevet{} på tværs af optegninger, og ÉN knap (eller Enter)
       gemmer dem alle. Den vej er uændret. Alt andet herinde
       sender DATABASENS pris med, så et gem på beskrivelsen ikke
       kan komme til at flytte et tal, ingen var færdig med.

       Det holder også to løfter, prøverne stiller: det skrevne
       overlever, at en anden række gemmes, og én forkert pris
       standser hele gemningen. */
    function byg(brugFeltetsPris) {
      var ud = {
        id: v.id,
        kategori_id: v.kategori_id,
        navn: navn.value,
        beskrivelse: tekst.value,
        pris: brugFeltetsPris ? pris.value : visPris(v),
        fremhaevet: favorit.felt.checked,
        udsolgt: erUdsolgt,
        aktiv: vis.felt.checked,
        sortering: v.sortering,
      };
      /* ⚠️ KUN NÅR NOGEN HAR RØRT FELTET. Ellers ville et gem midt
         i en frokost skrive morgenens tal tilbage — databasen har
         talt ned imens. Samme regel som dagens rets antal. */
      if (antal && antalRørt) ud.antal_tilbage = antal.value;
      return Butik.skrive.vare(ud);
    }

    // Autogem: alt undtagen prisen.
    function saml() {
      var f = Butik.tjek.navn(navn.value, 'varenavn', 120);
      if (f) return v.navn + ': ' + f;
      return byg(false);
    }

    /* Den gamle Gem-knap. Den er et UDTRYKKELIGT tryk på netop
       den her række, så den må gerne tage feltets pris med — i
       modsætning til autogem, der fyrer af sig selv. */
    var gemKnap = lav('button', 'knap', 'Gem');
    gemKnap.addEventListener('click', function () {
      var f = Butik.tjek.navn(navn.value, 'varenavn', 120) || Butik.tjek.pris(pris.value);
      if (f) return Admin.brøl(v.navn + ': ' + f);
      Admin.gem(byg(true), navn.value + ' er gemt.');
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

    /* ✕ og ikke "Slet". Kundens billeder — og den vigtige del er
       IKKE tegnet: bekræftelsen bliver stående, fordi en slettet
       vare ikke kan hentes tilbage fra admin. Et lille kryds er
       nemmere at ramme ved et uheld end en knap, der hedder Slet,
       så spørgsmålet er MERE nødvendigt her, ikke mindre. */
    var sletKnap = lav('button', 'kryds-knap', '✕');
    sletKnap.type = 'button';
    sletKnap.title = 'Slet ' + v.navn;
    sletKnap.setAttribute('aria-label', 'Slet ' + v.navn);
    sletKnap.addEventListener('click', function () {
      if (!window.confirm('Slet "' + v.navn + '" helt?\n\n'
        + 'Den kan ikke hentes tilbage. Vil du bare tage den af kortet '
        + 'i en periode, så fjern hakket i Vis.')) return;
      Admin.gem(Butik.skrive.sletVare(v.id), v.navn + ' er slettet.');
    });

    /* RÆKKEFØLGEN ER KUNDENS BILLEDER: navn · beskrivelse · pris ·
       få tilbage · Udsolgt? · ✕

       Beskrivelsen lå før på sin EGEN linje under navnet, og noten
       dér sagde, at en fjerde kolonne ville presse felterne sammen
       på en iPad. Det var sandt, dengang rækken også havde tre
       flueben, ↑↓, Gem og Slet. Udsolgt er en knap nu, Slet er et
       kryds, og de to øvrige flueben er flyttet bagest — så er der
       plads. */
    r.appendChild(navn);
    r.appendChild(tekst);
    r.appendChild(pris);
    if (antal) r.appendChild(antal);
    r.appendChild(udsolgtKnap);
    r.appendChild(sletKnap);

    /* ---- DET, DER IKKE ER DAGLIGT ARBEJDE, LIGGER BAG ⋯ ----

       Kundens billeder har SEKS ting på rækken: navn,
       beskrivelse, pris, få tilbage, Udsolgt? og ✕. Favorit, vis,
       op/ned og Gem er vores egne, og de ændres et par gange om
       året, hvor udsolgt ændres flere gange om dagen.

       ⚠️ MÅLT, IKKE GÆTTET. Med alle ti på rækken passede den kun
       på en skærm bredere end 1400 px: ved 1400 brød den om til to
       linjer, og med 242 varer er det dobbelt så langt at rulle.
       En bærbar på 1280 er almindelig, og en iPad er 1024.

       De er ikke VÆK — ét tryk, og de står der. En knap, der
       skjuler noget for evigt, ville bare være en mangel. */
    var bag = lav('div', 'vare-bag skjult');
    bag.appendChild(favorit.mærkat);
    bag.appendChild(vis.mærkat);
    bag.appendChild(flytKnapper(v, alle, 'vare'));
    bag.appendChild(gemKnap);

    var mere = lav('button', 'kryds-knap mere-knap', '⋯');
    mere.type = 'button';
    mere.title = 'Favorit, vis på kortet, flyt op og ned';
    mere.setAttribute('aria-label', 'Flere indstillinger for ' + v.navn);
    mere.setAttribute('aria-expanded', 'false');
    mere.addEventListener('click', function () {
      var åben = bag.classList.toggle('skjult');
      mere.setAttribute('aria-expanded', åben ? 'false' : 'true');
      r.classList.toggle('raekke-aaben', !åben);
    });
    r.insertBefore(mere, sletKnap);
    r.appendChild(bag);

    /* ⚠️ AUTOGEM PÅ RÆKKEN. "Alt gemmes automatisk, mens du
       skriver" står i kundens billeder.

       Gem-knappen bliver stående — den skal bare ikke være det
       eneste, der virker. Se noten ved Admin.autogem: den skriver
       STILLE, fordi Admin.gem tegner alle faner om, og en
       optegning midt i en sætning river feltet ud af siden under
       fingeren.

       ⚠️ OG PRISEN ER MED — det er netop dét, der gør den sikker.
       Grunden til, at priserne fik deres EGEN samle-knap, var, at
       Admin.gem tegner fanen om: havde ejeren skrevet ti priser og
       gemt den ene, var de ni væk. Autogem tegner ingenting om, så
       den fælde findes ikke her. Panelet øverst og den ene knap
       bliver stående til den, der taster hele kortet igennem uden
       at forlade et felt. */
    Admin.autogem(r, saml);
    return r;
  }

  function nyVareFelt(k) {
    var r = lav('div', 'admin-raekke ny-vare');

    var navn = document.createElement('input');
    navn.type = 'text'; navn.className = 'navn'; navn.placeholder = 'Ny vare i ' + k.navn;
    navn.maxLength = 120;

    var pris = document.createElement('input');
    pris.type = 'text'; pris.className = 'smal'; pris.inputMode = 'decimal'; pris.placeholder = 'kr.';

    var knap = lav('button', 'knap tilfoej', '+ Tilføj ret');
    knap.type = 'button';
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
      }), navn.value + ' er lagt på menukortet.').then(function () {
        /* Felterne tømmes ikke af sig selv: Admin.gem tegner fanen
           om, og rækken bygges på ny med tomme felter. Men markøren
           skal tilbage — ellers skal ejeren finde feltet igen for
           hver eneste vare, og der er 242 af dem. */
        var nyt = document.querySelector('[data-kategori="' + k.id + '"] .ny-vare .navn');
        if (nyt) nyt.focus();
      });
    });

    // Enter i navnet gør det samme som knappen. Se noten om de 118
    // priser: en hånd på musen mellem hver vare er en eftermiddag.
    [navn, pris].forEach(function (felt) {
      felt.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        knap.click();
      });
    });

    r.appendChild(navn);
    r.appendChild(pris);
    r.appendChild(knap);
    return r;
  }

  /* ============================================================
     HAVNENS TAPAS — kortet øverst på fanen  (29/8)
     ------------------------------------------------------------
     Spiis' menukort-fane har tapassen som sit eget kort, og
     kundens ord var "a la sådan her, også med tapas". Kortet er
     en RUDE ind til menukortets egne rækker: fadet og cavaen ER
     varer i menu_varer (kendingen er NAVNET, samme regexer som
     js/skal/tapas.js), og "Det får I"-listen er fadets
     beskrivelse med ét punkt pr. linje — gemt som "·"-adskilt,
     som ejerens liste skrev den. Intet nyt lager: to steder at
     rette den samme pris ville skride fra hinanden.

     ⚠️ OPTEGNINGEN RØRER IKKE KORTET, MENS DER SKRIVES I DET.
     tegnere kører efter hvert gem, og autogem gemmer 1,2 sekund
     efter sidste tastetryk — en optegning dér river feltet ud af
     siden under fingeren. Samme fælde som køreplanens notefelt.

     ⚠️ VARSLET KAN KUN TRÆKKES OP. Feltet skriver
     tapas_varsel_timer; tomt = fadets egne 48 timer, og
     formularen på tapassiden lægger altid forretningens varsel
     nedenunder som bund. Se varselTimer() i bestil-regler.js. */
  function tapasFad() {
    return (Admin.data.menu_varer || []).filter(function (v) {
      return /tapas/i.test(String(v.navn || ''));
    })[0] || null;
  }
  function tapasBobler() {
    return (Admin.data.menu_varer || []).filter(function (v) {
      return /cava|champagne|bobler/i.test(String(v.navn || ''));
    })[0] || null;
  }

  function tapasFelt(id, etiket, vaerdi, pladsholder) {
    var felt = Admin.lav('div', 'felt felt-smal');
    var m = Admin.lav('label', null, etiket);
    m.setAttribute('for', id);
    var input = document.createElement('input');
    input.type = 'text'; input.id = id; input.inputMode = 'decimal';
    input.maxLength = 8; input.placeholder = pladsholder || '';
    input.value = vaerdi;
    felt.appendChild(m); felt.appendChild(input);
    return felt;
  }

  function tegnTapas() {
    var rod = $('tapas-felter');
    if (!rod) return;
    /* Skrives der i kortet, tegnes der ikke om — se noten ovenfor. */
    if (rod.contains(document.activeElement)) return;

    var fad = tapasFad();
    var bobler = tapasBobler();
    var ind = Admin.data.indstillinger || {};

    var aftryk = [fad && fad.id, fad && fad.pris, fad && fad.beskrivelse,
      bobler && bobler.id, bobler && bobler.pris,
      ind.tapas_varsel_timer].join('|');
    if (rod.getAttribute('data-aftryk') === aftryk) return;
    rod.setAttribute('data-aftryk', aftryk);

    Admin.tøm(rod);

    if (!fad) {
      /* Samme besked som tapassiden selv: uden fadet på kortet er
         der ingenting at styre — og et opdigtet filnavn sender
         nogen ud at lede, så det RIGTIGE står her. */
      rod.appendChild(Admin.lav('p', 'hjaelp',
        'Tapasfadet står ikke på menukortet endnu. Kør '
        + 'supabase/menukort-ud-af-huset.sql i Supabase, så kommer '
        + 'felterne her af sig selv.'));
      return;
    }

    rod.appendChild(tapasFelt('tapas-pris', 'Pris pr. person',
      (fad.pris === null || fad.pris === undefined) ? '' : String(fad.pris).replace('.', ','),
      'fx 199'));

    /* Cava-feltet findes kun, når varen gør — samme regel som på
       tapassiden: at prissætte en vare, ingen har oprettet, er at
       finde på et produkt. */
    if (bobler) {
      rod.appendChild(tapasFelt('tapas-cava', bobler.navn + ' pr. flaske',
        (bobler.pris === null || bobler.pris === undefined) ? '' : String(bobler.pris).replace('.', ','),
        'fx 150'));
    }

    var indhold = Admin.lav('div', 'felt');
    var im = Admin.lav('label', null, 'Det får I — én linje pr. punkt');
    im.setAttribute('for', 'tapas-indhold');
    var tekst = document.createElement('textarea');
    tekst.id = 'tapas-indhold'; tekst.rows = 8; tekst.maxLength = 1200;
    tekst.placeholder = '5 slags ost\nSerranoskinke\nChorizo';
    tekst.value = String(fad.beskrivelse || '').split('·')
      .map(function (l) { return l.trim(); })
      .filter(Boolean).join('\n');
    indhold.appendChild(im); indhold.appendChild(tekst);
    rod.appendChild(indhold);
    rod.appendChild(Admin.lav('p', 'hjaelp',
      'Listen står på tapassiden under "Det får I" og som fadets '
      + 'linje på menukortet. Tom liste = designets egen bliver stående.'));

    rod.appendChild(tapasFelt('tapas-varsel', 'Varsel i timer',
      (typeof ind.tapas_varsel_timer === 'number' && isFinite(ind.tapas_varsel_timer))
        ? String(ind.tapas_varsel_timer) : '',
      'tomt = 48'));
  }

  /* Autogem registreres ÉN gang — roden er KORTET, ikke felterne,
     for felterne tegnes om (samme lære som tider-fanen). */
  Admin.autogem($('tapas-kort'), function () {
    var fad = tapasFad();
    if (!fad || !$('tapas-pris')) return false;

    var f = Butik.tjek.pris($('tapas-pris').value)
      || ($('tapas-cava') && Butik.tjek.pris($('tapas-cava').value));
    if (f) return f;

    var varselTekst = ($('tapas-varsel') ? $('tapas-varsel').value : '').trim();
    var varsel = null;
    if (varselTekst) {
      varsel = Number(varselTekst.replace(',', '.'));
      if (!isFinite(varsel) || varsel < 0 || varsel > 720) {
        return 'Varslet skal være timer mellem 0 og 720 — eller tomt.';
      }
    }

    var punkter = $('tapas-indhold').value.split('\n')
      .map(function (l) { return l.trim(); }).filter(Boolean);

    var kald = Butik.skrive.vare(Object.assign({}, fad, {
      pris: $('tapas-pris').value,
      beskrivelse: punkter.join(' · '),
    }));

    var bobler = tapasBobler();
    if (bobler && $('tapas-cava')) {
      kald = kald.then(function () {
        return Butik.skrive.vare(Object.assign({}, bobler, {
          pris: $('tapas-cava').value,
        }));
      });
    }

    return kald.then(function () {
      return Butik.skrive.indstilling('tapas_varsel_timer', varsel);
    });
  });

  Admin.tegnere.push(tegnMenu);
  Admin.tegnere.push(tegnTapas);
})();
