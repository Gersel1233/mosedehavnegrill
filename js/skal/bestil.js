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
   ============================================================ */

(function () {
  'use strict';

  if (!window.Butik || !window.MosedeRegler) return;

  var R = window.MosedeRegler;
  var UDVALG = 'uden-fyld';   // forsiden sælger stykkerne, ikke de 29 slags fyld

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
  function dagensRet() {
    var ret = (data.indstillinger || {}).dagens_ret || {};
    if (!ret.navn || valgtDag !== Butik.nu().dato) return null;
    return { navn: ret.navn, pris: ret.pris, beskrivelse: ret.beskrivelse || '' };
  }

  function grupper() {
    var varer = Butik.udvalg(data, UDVALG).varer || [];
    var navne = {};
    (data.menu_kategorier || []).forEach(function (k) { navne[k.id] = k.navn; });

    var rækkefølge = [];
    var kasser = {};
    varer.forEach(function (v) {
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
  //  er tegnet: én med tæller (dagens ret) og én med "+ tilføj"
  //  (de øvrige). "+ tilføj" folder kategoriens varer ud
  //  nedenunder — som de samme .item-rækker med tæller. Der
  //  kommer ingen ny form på skærmen, kun flere af den, der er.
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

    grupper().forEach(function (g) { kategoriRække(g, liste); });
    visSum();
  }

  // ----------------------------------------------------------
  //  DAGE OG TIDER
  // ----------------------------------------------------------
  function visDage() {
    var vælger = find('#dato', panel);
    if (!vælger) return;
    var dage = R.muligeDage(data);
    tøm(vælger);

    var ret = (data.indstillinger || {}).dagens_ret || {};
    dage.forEach(function (iso) {
      var mulighed = lav('option', null, dagTekst(iso)
        + (iso === Butik.nu().dato && ret.navn ? ' · ' + ret.navn : ''));
      mulighed.value = iso;
      vælger.appendChild(mulighed);
    });

    valgtDag = dage.indexOf(valgtDag) === -1 ? dage[0] : valgtDag;
    if (valgtDag) vælger.value = valgtDag;
  }

  function visTider() {
    var vælger = find('#tid', panel);
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

  /* Linjen under datoen siger, hvad dagens ret er. Vælges en
     anden dag, findes den ikke — og så står der ingenting i
     stedet for gårsdagens ret. */
  function visDagensLinje() {
    var linje = find('.hint', panel);
    if (!linje) return;
    var ret = dagensRet();
    if (!ret) return void (linje.style.display = 'none');
    linje.style.display = '';
    linje.textContent = 'Dagens ret: ' + ret.navn
      + (kroner(ret.pris) ? ' · ' + kroner(ret.pris) : '');
  }

  // ----------------------------------------------------------
  //  SPIS HER ELLER TAG MED
  //  ----------------------------------------------------------
  //  Kan man ikke spise her, er spørgsmålet ikke et spørgsmål.
  //  Fluebenet står i admin, og står det fra, forsvinder feltet i
  //  stedet for at tilbyde noget, forretningen ikke har.
  // ----------------------------------------------------------
  function spisHerÅben() {
    return (data.indstillinger || {}).spis_her === true;
  }

  function hvordan() {
    if (!spisHerÅben()) return 'afhentning';
    var på = find('[data-seg="how"] button.on', panel);
    var knapper = alle('[data-seg="how"] button', panel);
    return (på && knapper.indexOf(på) === 1) ? 'spis_her' : 'afhentning';
  }

  function hvordanTekst() {
    var på = find('[data-seg="how"] button.on', panel);
    return på ? på.textContent.trim() : 'To-go';
  }

  // ----------------------------------------------------------
  //  SUMLINJEN
  //  ----------------------------------------------------------
  //  Designets note over knappen: "2 × dagens ret · To-go ·
  //  kl. 17:30". Den beholder sin form; kun tallene er ægte.
  //  Den er samtidig stedet, fejl står — der er ikke tegnet et
  //  fejlfelt i designet, og et opfundet ét ville være en
  //  ændring af skallen.
  // ----------------------------------------------------------
  var fejlVises = false;

  function visSum() {
    var note = find('#sumline', panel);
    if (!note) return;
    fejlVises = false;
    var n = antalIKurv();
    var tid = find('#tid', panel);
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

  function brøl(besked, feltId) {
    var note = find('#sumline', panel);
    if (note) note.textContent = '⚠ ' + besked;
    fejlVises = true;
    var felt = feltId ? find('#' + feltId, panel) : null;
    if (felt) felt.focus();
  }

  // ----------------------------------------------------------
  //  AFSENDELSEN
  // ----------------------------------------------------------
  function send() {
    var navn = (find('#navn', panel) || {}).value || '';
    var tlf = (find('#tlf', panel) || {}).value || '';
    var besked = (find('#besked', panel) || {}).value || '';
    var tid = find('#tid', panel);

    if (antalIKurv() < 1) return brøl('Vælg mindst én ting, før du sender.');
    var min = R.minStk(data);
    if (antalIKurv() < min) {
      return brøl('Der skal mindst bestilles ' + min + ' stk.');
    }
    if (navn.trim().length < 2) return brøl('Skriv dit navn.', 'navn');
    if (tlf.replace(/[^0-9]/g, '').length < 8) {
      return brøl('Skriv et telefonnummer, vi kan få fat i dig på.', 'tlf');
    }
    if (!valgtDag || !tid || !tid.value) return brøl('Vælg en dag og et tidspunkt.');

    var knap = find('button.g.solid.blk', panel);
    if (knap) knap.disabled = true;

    Butik.bestil({
      navn: navn,
      telefon: tlf,
      hent_dato: valgtDag,
      hent_tid: tid.value,
      hvordan: hvordan(),
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
       === true. Der er ingen levering på forsiden, så den
       undtagelse hører til smørrebrødssiden. */
    var auto = (data.indstillinger || {}).auto_bekraeft !== false;
    panel.appendChild(lav('p', 'hint', auto
      ? 'Bestilt. ' + (b.hvordan === 'spis_her' ? 'Spis her ' : 'Hentes ')
        + langDato(b.hent_dato) + ' kl. ' + String(b.hent_tid).slice(0, 5) + '. '
        + 'Der er ikke betalt noget – du betaler ved lugen.'
      : 'Vi ringer og bekræfter. ' + langDato(b.hent_dato)
        + ' kl. ' + String(b.hent_tid).slice(0, 5) + '. '
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
    var afsnit = document.getElementById('bestil');
    panel = find('.panel', afsnit || document);
    if (!afsnit || !panel) return;

    /* Er der lukket for bestillinger — sæsonen eller kontakten i
       admin — findes afsnittet ikke. Den flydende pille peger så
       på smørrebrødssiden i stedet for ned i ingenting. */
    var lukket = ((d.indstillinger || {}).saeson || {}).lukket
      || (d.indstillinger || {}).bestilling_aaben === false;
    var kanBestilles = (Butik.udvalg(d, UDVALG).varer || []).length > 0 || dagensRet();

    if (lukket || !kanBestilles || !R.muligeDage(d).length) {
      afsnit.style.display = 'none';
      var pille = document.getElementById('bestil-pill');
      if (pille) pille.setAttribute('href', 'h-smorrebrod.html');
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
    visDagensLinje();
    visVarer();

    var dato = find('#dato', panel);
    if (dato) {
      dato.addEventListener('change', function () {
        valgtDag = dato.value;
        visTider();
        visDagensLinje();
        /* Dagens ret findes kun i dag. Skifter gæsten dag, skal
           den ud af kurven igen — ellers bestiller hun en ret,
           køkkenet ikke laver den dag. */
        Object.keys(kurv).forEach(function (k) {
          if (k.indexOf('dagens|') === 0) delete kurv[k];
        });
        visVarer();
      });
    }

    var tid = find('#tid', panel);
    if (tid) tid.addEventListener('change', visSum);

    var seg = find('[data-seg="how"]', panel);
    if (seg) {
      if (!spisHerÅben()) {
        /* Feltet er hele .field'en omkring segmentet — etiketten
           "Hvordan vil I spise?" skal væk sammen med knapperne. */
        var felt = seg.closest ? seg.closest('.field') : null;
        (felt || seg).style.display = 'none';
      } else {
        // EFTER havnegrillen.js' egen lytter, så vores sumlinje
        // står sidst — ellers skriver designets sum() hen over.
        seg.addEventListener('click', visSum);
      }
    }

    ['navn', 'tlf'].forEach(function (id) {
      var felt = find('#' + id, panel);
      if (felt) {
        felt.addEventListener('input', function () { if (fejlVises) visSum(); });
      }
    });

    var knap = find('button.g.solid.blk', panel);
    if (knap) {
      knap.type = 'button';
      knap.addEventListener('click', send);
    }
  }

  Butik.hent().then(byg).catch(function (fejl) {
    console.warn('Bestillingens kobling fejlede, skallen står som designet:', fejl);
  });
}());
