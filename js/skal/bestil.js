/* ============================================================
   FORSIDENS BESTILLING — KOBLINGEN, IKKE SKALLEN

   Designet tegnede en formular med faste datoer, faste
   klokkeslæt og seks rækker mad skrevet i hånden. Her får den
   forretningens egne: dagene kommer fra åbningstiderne og
   kalenderen, tiderne fra den valgte dag, varerne fra det, der er
   åbnet for i admin — og "Send bestilling" skriver i databasen,
   så den står i køkkenets overblik med det samme.

   REGLERNE ER IKKE SKREVET HER. Hvilke dage og tider der kan
   vælges, står i js/bestil-regler.js, som bestil/ og ved-bordet/
   bruger i forvejen. To udgaver af "hvornår kan man hente?" er
   én for meget: rettes varslet det ene sted og glemmes det
   andet, kan gæsten bestille til om to timer på den ene side og
   ikke på den anden — og ingen af delene ser forkerte ud.

   OPMÆRKNINGEN LAVES IKKE OM. Rækkerne, der bygges, er designets
   egne: .item med h4, .tag og .step, og .item.hi til dagens ret.
   Der findes ikke en klasse i den her fil, som ikke allerede står
   i havnegrillen.css.

   TO SIDER, ÉN MOTOR. Forsiden og h-smorrebrod.html har hver sin
   formular med hver sine felt-id'er, men det er den SAMME
   bestilling, der bliver sendt. Forskellene står i SIDER nedenfor
   som opsætning; alt andet er fælles. Skrev vi den samme
   afsendelse to gange, ville den anden langsomt komme til at gøre
   noget andet end den første — og det ville ingen opdage, før en
   gæst fik forkert mad.
   ============================================================ */

(function () {
  'use strict';

  if (!window.Butik || !window.MosedeRegler) return;

  var R = window.MosedeRegler;

  /* ---- DE TO FORMULARER ----

     udvalg: forsiden sælger stykkerne, men ikke de 29 slags fyld
     (dét er byggeriet, og det har sin egen side). Smørrebrødssiden
     sælger KUN smørrebrød — den er blevet smørrebrødets side.

     hvordan: forsiden spørger "spis her eller tag med", som lugen
     gør. Smørrebrødssiden spørger "hentes eller leveres", fordi
     smørrebrød pr. definition er ud af huset. Ét modul, to
     spørgsmål — ikke to moduler. */
  var SIDER = [
    {
      navn: 'forsiden',
      udvalg: 'uden-fyld',
      felter: { dato: 'dato', tid: 'tid', navn: 'navn', tlf: 'tlf', besked: 'besked' },
      seg: '[data-seg="how"]',
      segSvar: ['afhentning', 'spis_her'],
      segKraever: 'spis_her',
      dagensRet: true,
      folder: true,
      dagensHint: true,
      skjulHele: true,
      pilleTil: 'h-smorrebrod.html',
    },
    {
      navn: 'smørrebrødet',
      udvalg: 'kun-smoer',
      felter: {
        dato: 'sdato', tid: 'stid', navn: 'snavn',
        tlf: 'stlf', besked: 'sbesked', adresse: 'sadr',
      },
      seg: '[data-toggles="#levfelt"]',
      segSvar: ['levering', 'afhentning'],
      segKraever: 'levering',
      adresseFelt: '#levfelt',
      dagensRet: false,
      folder: false,
      varselHint: true,
      skjulHele: false,
    },
  ];

  var side = null;

  var MÅNEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

  var data = null;
  var valgtDag = null;
  var kurv = {};              // nøgle → { navn, pris, antal }
  var aabne = {};             // kategori-id → foldet ud?
  var panel = null;

  function find(vælger, rod) {
    try { return (rod || document).querySelector(vælger); } catch (e) { return null; }
  }
  function alle(vælger, rod) {
    return Array.prototype.slice.call((rod || document).querySelectorAll(vælger));
  }
  function tøm(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }

  function felt(navn) {
    var id = side.felter[navn];
    return id ? find('#' + id, panel) : null;
  }

  function værdi(navn) {
    var f = felt(navn);
    return f ? f.value : '';
  }

  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst !== undefined && tekst !== null) el.textContent = tekst;
    return el;
  }

  /* "89" → "89,-", tom pris → tom streng. Samme format som
     designets egne prislapper. */
  function kroner(p) {
    if (p === null || p === undefined || p === '') return '';
    var n = Number(p);
    if (!isFinite(n)) return '';
    return (n % 1 === 0 ? String(n) : n.toFixed(2).replace('.', ',')) + ',-';
  }

  function langDato(iso) {
    var t = new Date(iso + 'T12:00:00Z');
    var uge = Butik.UGEDAGE[(t.getUTCDay() + 6) % 7].toLowerCase();
    return uge + ' d. ' + t.getUTCDate() + '. ' + MÅNEDER[t.getUTCMonth()];
  }

  /* Designets egen ordlyd i datovælgeren: "I dag – søndag d. 23.
     august". Den er værd at holde fast i — "I dag" alene siger
     ikke, hvilken dag maden bliver lavet, og datoen alene siger
     ikke, om det er i dag. */
  function dagTekst(iso) {
    var i_dag = Butik.nu().dato;
    if (iso === i_dag) return 'I dag – ' + langDato(iso);
    if (iso === R.isoPlus(i_dag, 1)) return 'I morgen – ' + langDato(iso);
    var t = langDato(iso);
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // ----------------------------------------------------------
  //  HVAD KAN BESTILLES
  //  ----------------------------------------------------------
  //  Dagens ret er en vare på linje med de andre — den står bare
  //  ikke i menukortet, men i ét felt i admin. Lå den kun i
  //  TEGNINGEN af listen, ville hverken summen eller den afsendte
  //  bestilling kende dens pris, og køkkenet fik retten uden
  //  kroner. Det er sket før, og det er derfor, den ligger her.
  // ----------------------------------------------------------
  /* DAGENS RETTER FØLGER DEN VALGTE DAG NU. Før var det kun i
     dag, fordi der kun fandtes ét felt — og bestilte man til på
     torsdag, kunne torsdagens ret ikke vælges. Tabellen
     dagens_retter gav hver dag sine egne.

     UDSOLGT OG UDEN PRIS KOMMER IKKE MED. Butik.retKanBestilles
     er den samme regel, menukortet viser efter: en udsolgt ret
     bliver stående på kortet, men kan ikke lægges i kurven. */
  function dagensRetter() {
    if (!side.dagensRet || !valgtDag) return [];
    return Butik.dagensRetter(data, valgtDag).filter(Butik.retKanBestilles);
  }

  function dagensRet() {
    return dagensRetter()[0] || null;
  }

  function varerne() {
    return Butik.udvalg(data, side.udvalg).varer || [];
  }

  function grupper() {
    var navne = {};
    (data.menu_kategorier || []).forEach(function (k) { navne[k.id] = k.navn; });

    var rækkefølge = [];
    var kasser = {};
    varerne().forEach(function (v) {
      var id = String(v.kategori_id);
      if (!kasser[id]) {
        kasser[id] = { id: id, navn: navne[v.kategori_id] || 'Andet', varer: [] };
        rækkefølge.push(kasser[id]);
      }
      kasser[id].varer.push(v);
    });
    return rækkefølge;
  }

  function antalIKurv() {
    var n = 0;
    Object.keys(kurv).forEach(function (k) { n += kurv[k].antal; });
    return n;
  }

  function sumIKurv() {
    var s = 0;
    Object.keys(kurv).forEach(function (k) {
      var l = kurv[k];
      if (typeof l.pris === 'number' && isFinite(l.pris)) s += l.pris * l.antal;
    });
    return s;
  }

  // ----------------------------------------------------------
  //  RÆKKERNE
  //  ----------------------------------------------------------
  //  Designet har to slags rækker, og begge bliver brugt, som de
  //  er tegnet: én med tæller og én med "+ tilføj". På forsiden er
  //  udvalget hele kortet, og så folder "+ tilføj" kategorien ud —
  //  ellers ville listen være hundrede rækker lang. På
  //  smørrebrødssiden er der kun smørrebrød, og så står stykkerne
  //  direkte med tæller, som designet tegnede dem.
  // ----------------------------------------------------------
  function tællerFor(nøgle, navn, pris) {
    var boks = lav('div', 'step');
    boks.setAttribute('data-step', '');
    var ned = lav('button', null, '–');
    ned.setAttribute('data-d', '-');
    ned.type = 'button';
    var tal = lav('b', null, String((kurv[nøgle] || {}).antal || 0));
    var op = lav('button', null, '+');
    op.setAttribute('data-d', '+');
    op.type = 'button';

    function skift(retning) {
      var nu = (kurv[nøgle] || {}).antal || 0;
      var ny = Math.max(0, nu + retning);
      if (ny === 0) delete kurv[nøgle];
      else kurv[nøgle] = { navn: navn, pris: pris, antal: ny };
      tal.textContent = String(ny);
      visSum();
    }
    ned.addEventListener('click', function () { skift(-1); });
    op.addEventListener('click', function () { skift(1); });

    boks.appendChild(ned);
    boks.appendChild(tal);
    boks.appendChild(op);
    return boks;
  }

  function vareRække(v, fremhævet) {
    var nøgle = (v.kategori_id === undefined ? 'dagens' : v.kategori_id) + '|' + v.navn;
    var række = lav('div', 'item' + (fremhævet ? ' hi' : ''));
    række.setAttribute('data-vare', v.navn);

    var venstre = lav('div');
    venstre.appendChild(lav('h4', null, v.navn));
    /* Mærkatet er designets .tag. Uden pris står der "pris følger"
       og ikke et nul: 79 af forretningens varer har ikke fået en
       pris endnu, og et 0 ville stå som gratis. */
    var mærkat = (fremhævet ? 'Dagens ret' : '')
      + (fremhævet && kroner(v.pris) ? ' · ' : '')
      + (kroner(v.pris) || (fremhævet ? '' : 'pris følger'));
    if (mærkat) venstre.appendChild(lav('span', 'tag', mærkat));

    række.appendChild(venstre);
    række.appendChild(tællerFor(nøgle, v.navn, v.pris));
    return række;
  }

  function kategoriRække(g, liste) {
    var række = lav('div', 'item');
    række.setAttribute('data-kategori', g.navn);
    række.appendChild(lav('h4', null, g.navn));

    var knap = lav('span', 'add', aabne[g.id] ? '– luk' : '+ tilføj');
    række.appendChild(knap);
    række.addEventListener('click', function () {
      aabne[g.id] = !aabne[g.id];
      visVarer();
    });

    liste.appendChild(række);
    if (aabne[g.id]) {
      g.varer.forEach(function (v) { liste.appendChild(vareRække(v, false)); });
    }
  }

  function visVarer() {
    var liste = panel && panel.querySelector('[data-liste]');
    if (!liste) return;
    /* KUN rækkerne ryddes — ikke hele feltet. Første udgave tømte
       .field'en og tog designets <label>"Vælg jeres retter" med
       sig; overskriften var væk, og prøven på feltrækkefølgen
       fangede det. */
    alle('.item', liste).forEach(function (r) { liste.removeChild(r); });

    var ret = dagensRet();
    if (ret) liste.appendChild(vareRække(ret, true));

    if (side.folder) {
      grupper().forEach(function (g) { kategoriRække(g, liste); });
    } else {
      varerne().forEach(function (v) { liste.appendChild(vareRække(v, false)); });
    }
    visSum();
  }

  // ----------------------------------------------------------
  //  DAGE OG TIDER
  // ----------------------------------------------------------
  function visDage() {
    var vælger = felt('dato');
    if (!vælger) return;
    var dage = R.muligeDage(data);
    tøm(vælger);

    dage.forEach(function (iso) {
      /* Dagens ret står i dagvælgeren, så gæsten kan se, hvad der
         er hvornår, uden at skifte frem og tilbage. Er der flere,
         står den første og et "m.fl." — hele listen ville gøre
         hver linje til to. */
      var retter = side.dagensRet ? Butik.dagensRetter(data, iso) : [];
      var navne = retter.length
        ? ' · ' + retter[0].navn + (retter.length > 1 ? ' m.fl.' : '')
        : '';
      var mulighed = lav('option', null, dagTekst(iso) + navne);
      mulighed.value = iso;
      vælger.appendChild(mulighed);
    });

    valgtDag = dage.indexOf(valgtDag) === -1 ? dage[0] : valgtDag;
    if (valgtDag) vælger.value = valgtDag;
  }

  function visTider() {
    var vælger = felt('tid');
    if (!vælger) return;
    var før = vælger.value;
    var tider = R.tiderFor(data, valgtDag);
    tøm(vælger);
    tider.forEach(function (t) {
      var mulighed = lav('option', null, 'kl. ' + t);
      mulighed.value = t;
      vælger.appendChild(mulighed);
    });
    if (tider.indexOf(før) !== -1) vælger.value = før;
  }

  /* Linjen under datoen. På forsiden siger den, hvad dagens ret
     er; på smørrebrødssiden siger den, hvor lang tid i forvejen
     der skal bestilles. Begge steder stod der et fast tal i
     designet — "2 dage" — og varslet sættes i admin. */
  /* Hvilken .hint? Panelet har flere. Vi tager den, der HØRER TIL
     datoen: enten inde i datofeltet (forsiden) eller lige efter
     det (smørrebrødssiden). Første udgave tog bare den første i
     panelet og skrev varslet hen over manchetten under
     overskriften — den så rigtig ud, og datolinjen stod stadig
     med designets faste "inden for 2 dage". */
  function datoHint() {
    var d = felt('dato');
    var boks = d && d.closest ? d.closest('.field') : null;
    if (!boks) return null;
    var inde = find('.hint', boks);
    if (inde) return inde;
    var efter = boks.nextElementSibling;
    return efter && efter.classList.contains('hint') ? efter : null;
  }

  function visHint() {
    var linje = datoHint();
    if (!linje) return;

    if (side.varselHint) {
      var timer = R.varselTimer(data);
      var dage = Math.floor(timer / 24);
      linje.textContent = timer <= 0
        ? 'Bestil gerne i god tid — ring hvis det haster.'
        : 'Bestilles mindst ' + (dage >= 1
          ? dage + (dage === 1 ? ' dag' : ' dage')
          : timer + (timer === 1 ? ' time' : ' timer'))
          + ' i forvejen — ring hvis det haster.';
      return;
    }

    if (!side.dagensHint) return;
    var ret = dagensRet();
    if (!ret) return void (linje.style.display = 'none');
    linje.style.display = '';
    linje.textContent = 'Dagens ret: ' + ret.navn
      + (kroner(ret.pris) ? ' · ' + kroner(ret.pris) : '');
  }

  // ----------------------------------------------------------
  //  SPIS HER / LEVERING
  //  ----------------------------------------------------------
  //  Begge er flueben i admin, og begge er slået FRA som standard.
  //  Er de ikke slået til, er spørgsmålet ikke et spørgsmål:
  //  feltet forsvinder i stedet for at tilbyde noget, forretningen
  //  ikke har sagt ja til. Levering er den vigtigste af de to — vi
  //  ved hverken hvad de kører ud med, hvor langt eller hvad det
  //  koster, og en side, der tilbyder levering, fordi ingen har
  //  sagt nej, lover noget på forretningens vegne.
  // ----------------------------------------------------------
  function segÅben() {
    return (data.indstillinger || {})[side.segKraever] === true;
  }

  function hvordan() {
    if (!segÅben()) {
      // Det svar, der ikke lover noget: hentes ved lugen.
      return 'afhentning';
    }
    var på = find(side.seg + ' button.on', panel);
    var knapper = alle(side.seg + ' button', panel);
    var i = på ? knapper.indexOf(på) : 0;
    return side.segSvar[i] || 'afhentning';
  }

  function hvordanTekst() {
    var på = find(side.seg + ' button.on', panel);
    return på && segÅben() ? på.textContent.trim() : 'Afhentning';
  }

  // ----------------------------------------------------------
  //  SUMLINJEN
  //  ----------------------------------------------------------
  //  Designets note over knappen. Den beholder sin form; kun
  //  tallene er ægte. Den er samtidig stedet, fejl står — der er
  //  ikke tegnet et fejlfelt i designet, og et opfundet ét ville
  //  være en ændring af skallen.
  // ----------------------------------------------------------
  var fejlVises = false;

  function sumFelt() {
    return find('#sumline', panel) || find('.note', panel);
  }

  function visSum() {
    var note = sumFelt();
    if (!note) return;
    fejlVises = false;
    var n = antalIKurv();
    var tid = felt('tid');
    var klokken = tid && tid.value ? 'kl. ' + tid.value : '';
    var nøgler = Object.keys(kurv);

    if (!n) {
      note.textContent = 'Vælg mindst én ting' + (klokken ? ' · ' + klokken : '');
      return;
    }
    var start = nøgler.length === 1
      ? n + ' × ' + kurv[nøgler[0]].navn
      : n + ' stk.' + (sumIKurv() ? ' · ' + kroner(sumIKurv()) : '');
    note.textContent = start + ' · ' + hvordanTekst() + (klokken ? ' · ' + klokken : '');
  }

  function brøl(besked, feltNavn) {
    var note = sumFelt();
    if (note) note.textContent = '⚠ ' + besked;
    fejlVises = true;
    var f = feltNavn ? felt(feltNavn) : null;
    if (f) f.focus();
  }

  // ----------------------------------------------------------
  //  AFSENDELSEN
  // ----------------------------------------------------------
  function send() {
    var navn = værdi('navn');
    var tlf = værdi('tlf');
    var besked = værdi('besked');
    var adresse = værdi('adresse');
    var tid = felt('tid');
    var svar = hvordan();

    if (antalIKurv() < 1) return brøl('Vælg mindst én ting, før du sender.');
    var min = R.minStk(data);
    if (antalIKurv() < min) {
      return brøl('Der skal mindst bestilles ' + min + ' stk.');
    }
    if (navn.trim().length < 2) return brøl('Skriv dit navn.', 'navn');
    if (tlf.replace(/[^0-9]/g, '').length < 8) {
      return brøl('Skriv et telefonnummer, vi kan få fat i dig på.', 'tlf');
    }
    if (svar === 'levering' && adresse.trim().length < 5) {
      return brøl('Skriv adressen, maden skal køres til.', 'adresse');
    }
    if (!valgtDag || !tid || !tid.value) return brøl('Vælg en dag og et tidspunkt.');

    var knap = find('button.g.solid.blk', panel);
    if (knap) knap.disabled = true;

    Butik.bestil({
      navn: navn,
      telefon: tlf,
      hent_dato: valgtDag,
      hent_tid: tid.value,
      hvordan: svar,
      leverings_adresse: adresse,
      besked: besked,
      linjer: Object.keys(kurv).map(function (k) {
        return { navn: kurv[k].navn, antal: kurv[k].antal, pris: kurv[k].pris };
      }),
    }).then(function (raekke) {
      visTak(raekke);
    }).catch(function (fejl) {
      if (knap) knap.disabled = false;
      console.warn('Bestillingen kunne ikke sendes:', fejl);
      brøl('Bestillingen kunne ikke sendes. Prøv igen — eller ring til os.');
    });
  }

  /* Kvitteringen bygges af designets egne dele: h3, .hint og
     .note, som de står i panelet på de andre sider. */
  function visTak(b) {
    tøm(panel);
    panel.appendChild(lav('h3', null, 'Tak, ' + String(b.navn || '').split(' ')[0] + '.'));

    /* BESTILT ER BESTILT. Kontakten i admin står stadig, men den
       er slået TIL som standard — derfor === false og ikke
       === true.

       EN LEVERING BEKRÆFTES ALDRIG AF SIG SELV. Vi kan love, at
       maden bliver lavet — det er køkkenets eget arbejde. Vi kan
       IKKE love, at den kan køres til en adresse, vi ikke kender:
       der er ingen bekræftet leveringszone og ingen pris. Skrev
       siden "Bestilt. Leveres lørdag kl. 12" til en adresse i
       Roskilde, ville den have lovet noget, ingen har lovet — og
       gæsten ville opdage det, når maden ikke kom. */
    var leveres = b.hvordan === 'levering';
    var auto = (data.indstillinger || {}).auto_bekraeft !== false && !leveres;
    var hvornår = langDato(b.hent_dato) + ' kl. ' + String(b.hent_tid).slice(0, 5);

    panel.appendChild(lav('p', 'hint', auto
      ? 'Bestilt. ' + (b.hvordan === 'spis_her' ? 'Spis her ' : 'Hentes ') + hvornår + '. '
        + 'Der er ikke betalt noget – du betaler ved lugen.'
      : leveres
        ? 'Vi ringer og bekræfter leveringen — vi skal lige se på adressen først. '
          + hvornår + '. Der er ikke betalt noget.'
        : 'Vi ringer og bekræfter. ' + hvornår + '. '
          + 'Der er ikke betalt noget – du betaler ved lugen.'));

    panel.appendChild(lav('div', 'note', 'Reference: ' + b.reference));
    panel.appendChild(lav('p', 'fine', 'Skriv referencen ned, eller tag et billede af den. '
      + 'Har du glemt noget, så ring — vi kan nå det, indtil maden er lavet.'));
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ----------------------------------------------------------
  //  START
  // ----------------------------------------------------------
  function byg(d) {
    data = d;

    /* Er der lukket for bestillinger — sæsonen eller kontakten i
       admin — findes formularen ikke. På forsiden ryger hele
       afsnittet, og den flydende pille peger på smørrebrødssiden
       i stedet for ned i ingenting. På smørrebrødssiden ryger kun
       panelet: resten af siden sælger stadig smørrebrødet, og der
       står et telefonnummer. */
    var lukket = ((d.indstillinger || {}).saeson || {}).lukket
      || (d.indstillinger || {}).bestilling_aaben === false;
    var kanBestilles = varerne().length > 0 || dagensRet();

    if (lukket || !kanBestilles || !R.muligeDage(d).length) {
      var skjules = side.skjulHele
        ? (panel.closest ? panel.closest('section') : null) || panel
        : panel;
      skjules.style.display = 'none';
      var pille = document.getElementById('bestil-pill');
      if (pille && side.pilleTil) pille.setAttribute('href', side.pilleTil);
      return;
    }

    /* Listen mærkes, så tegningen kan finde den igen. Designet
       har ingen id på den, og at tælle .field'er ville gå i
       stykker, første gang nogen flyttede et felt. */
    var liste = null;
    alle('.field', panel).forEach(function (f) {
      if (!liste && f.querySelector('.item')) liste = f;
    });
    if (!liste) return;
    liste.setAttribute('data-liste', '');

    visDage();
    visTider();
    visHint();
    visVarer();

    var dato = felt('dato');
    if (dato) {
      dato.addEventListener('change', function () {
        valgtDag = dato.value;
        visTider();
        visHint();
        /* Dagens ret findes kun i dag. Skifter gæsten dag, skal
           den ud af kurven igen — ellers bestiller hun en ret,
           køkkenet ikke laver den dag. */
        Object.keys(kurv).forEach(function (k) {
          if (k.indexOf('dagens|') === 0) delete kurv[k];
        });
        visVarer();
      });
    }

    var tid = felt('tid');
    if (tid) tid.addEventListener('change', visSum);

    var seg = find(side.seg, panel);
    if (seg) {
      if (!segÅben()) {
        /* Feltet er hele .field'en omkring segmentet — etiketten
           skal væk sammen med knapperne. Og det felt, segmentet
           folder ud (leveringsadressen), skal med. */
        var felten = seg.closest ? seg.closest('.field') : null;
        (felten || seg).style.display = 'none';
        var ekstra = side.adresseFelt ? find(side.adresseFelt, panel) : null;
        if (ekstra) ekstra.style.display = 'none';
      } else {
        // EFTER havnegrillen.js' egen lytter, så vores sumlinje
        // står sidst — ellers skriver designets sum() hen over.
        seg.addEventListener('click', visSum);
      }
    }

    ['navn', 'tlf'].forEach(function (n) {
      var f = felt(n);
      if (f) f.addEventListener('input', function () { if (fejlVises) visSum(); });
    });

    var knap = find('button.g.solid.blk', panel);
    if (knap) {
      knap.type = 'button';
      knap.addEventListener('click', send);
    }
  }

  /* Hvilken af de to formularer står vi på? Panelet hedder
     #bestil begge steder — på forsiden er det inde i afsnittet,
     på smørrebrødssiden ER det panelet. */
  /* ---- DELT MED TAPASSIDEN ----
     m-tapas.html har en helt anden formular — antal personer i
     stedet for rækker — men den samme kvittering, det samme
     prisformat og den samme datotekst. De tre ting eksporteres,
     så tapassiden ikke skriver dem af. En kvittering, der siger
     noget andet på to sider af samme forretning, er to
     kvitteringer. */
  window.MosedeSkal = {
    kroner: kroner,
    langDato: langDato,
    dagTekst: dagTekst,
    kvittering: function (boks, b, ind) {
      var gemt = data;
      data = { indstillinger: ind || {} };
      panel = boks;
      visTak(b);
      data = gemt;
    },
  };

  var rod = document.getElementById('bestil');
  if (!rod) return;
  panel = rod.classList.contains('panel') ? rod : find('.panel', rod);
  if (!panel) return;

  /* #sdato findes kun på smørrebrødssiden. Vi kender siden på et
     af dens EGNE felter og ikke på filnavnet: adresserne kan
     flytte, felterne flytter ikke. */
  side = find('#sdato', panel) ? SIDER[1] : SIDER[0];

  Butik.hent().then(byg).catch(function (fejl) {
    console.warn('Bestillingens kobling fejlede, skallen står som designet:', fejl);
  });
}());
