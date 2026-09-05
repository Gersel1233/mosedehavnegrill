/* ============================================================
   ⚠️ INGEN SIDE INDLÆSER DEN HER FIL  (målt 5/9)
   ------------------------------------------------------------
   Den kørte, dengang gæstesiden så anderledes ud. I dag gør
   arbejdet: m-menukort.html + js/skal/menukort.js.

   Den er ikke slettet — af samme grund som de gamle adresser
   ikke er det: prøverne i tests-gamle/ peger på den, og de skal
   læses igennem for dækning, ingen anden måler, før noget
   fjernes. Se noten i CLAUDE.md.

   ⚠️ MEN BYG IKKE VIDERE PÅ DEN. En rettelse her kommer ingen
   steder hen — hverken gæsten eller personalet ser den. Det er
   dét, noten skal forhindre: at nogen om et halvt år læser
   filen, tror den kører, og bruger en time på at rette noget,
   der ikke findes på skærmen.

   tests/doed-kode.spec.js holder listen, så tallet ikke kan
   vokse i stilhed.
   ============================================================ */
/* ============================================================
   MENUKORTET – hele sortimentet på sin egen side

   Denne kode lå før i js/side.js og tegnede hele menukortet
   midt på forsiden. Det gjorde forsiden 5600 pixel lang på en
   telefon: 14 kategorier, 151 varer og 29 slags smørrebrødsfyld
   mellem "er der åbent" og "find os".

   Forsiden sælger stedet. Denne side viser sortimentet.

   ------------------------------------------------------------
   TRE VALG
   ------------------------------------------------------------
   1) ÉN AFDELING AD GANGEN. Mad, is og drikkevarer er tre
      forskellige spørgsmål, og ingen læser dem samtidig. Fanerne
      er de samme glaspiller som resten af siden.

   2) KATEGORIERNE ER LINKBARE. Hver kategori får et id, så
      menu.html#smoerrebroed kan sendes i en sms. Rulningen tager
      højde for den faste topmenu.

   3) INGEN OPFUNDNE PRISER. Fire varer står med "ca." på
      forretningens eget menukort, og de vises uden pris frem for
      med et gæt. Kategorier hvor INGEN vare har en pris – fyldet
      til smørrebrødet – vises som pastiller, ikke som en søjle
      med 29 tankestreger.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function tøm(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function lav(tag, klasse, tekst) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst !== undefined && tekst !== null) e.textContent = String(tekst);
    return e;
  }

  /* Et id der kan stå i en adresse. Æ, ø og å skal oversættes –
     ikke bare fjernes – ellers bliver "Pølser" til "plser". */
  function tilId(navn) {
    return String(navn).toLowerCase()
      .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  var AFDELINGER = [
    { id: 'mad', navn: 'Mad' },
    { id: 'is', navn: 'Is og desserter' },
    { id: 'drikke', navn: 'Drikkevarer' },
  ];

  var data = null;
  var valgt = 'mad';

  /* Gamle kategorier kan stå med afdeling 'grill'. De hører under
     mad, så de ikke bliver usynlige efter en halv opgradering af
     databasen. */
  function afdelingFor(k) {
    return k.afdeling === 'grill' ? 'mad' : k.afdeling;
  }

  /* MÆRKET FORAN KATEGORINAVNET.

     Kunden sendte to skærmbilleder fra spiis (23/8): "lad det være
     præcis den her flotte og dejlige stil med overskuelighed, bare
     deres farvepaletter." Dér står der et lille tegn i en rund
     firkant foran hvert kategorinavn, og det gør rækken til et
     kort i stedet for en overskrift.

     Tegnet kommer fra AFDELINGEN, som ejeren selv sætter i admin,
     og ikke fra kategorinavnet. Det er tre tegn i stedet for
     fjorten — men de tre er sande. Gættede vi på navnet, ville
     "Pariserbøf" få en burger, og den dag ejeren opretter
     "Vinterretter", ville den få en tilfældighed. */
  var AFD_TEGN = { mad: '🍽️', is: '🍦', drikke: '🥤' };

  function grupperFor(afd) {
    return (data.menu_kategorier || [])
      .filter(function (k) { return k.aktiv !== false && afdelingFor(k) === afd; })
      .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); })
      .map(function (k) {
        return {
          kategori: k,
          varer: (data.menu_varer || [])
            .filter(function (v) { return v.kategori_id === k.id && v.aktiv !== false; })
            .sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); }),
        };
      })
      .filter(function (g) { return g.varer.length > 0; });
  }

  /* ------------------------------------------------------------
     HVER KATEGORI ER EN FOLD
     ------------------------------------------------------------
     Kundens ord (22/8): "lad menukortet være mere overskueligt og
     opdelt og telefon-egnet" — og han sendte to skærmbilleder fra
     bestillingssiden som svar på, hvordan det skulle rulle ned:
     lukkede rækker med kategorinavnet, og én foldet ud med
     varerne under.

     Det er den rigtige form her, og af den samme grund som dér.
     Menukortet har fjorten kategorier og 151 varer. Fladt ud er
     det 5-6.000 pixel på en telefon, og man skal RULLE for at
     finde ud af, hvad der overhovedet findes. Med folder er hele
     afdelingen ét skærmbillede: man kan se udvalget, før man
     vælger, hvad man vil læse.

     DEN FØRSTE ER ÅBEN. En side, hvor ALT er lukket, ligner et
     menukort, nogen har gemt væk — man skal trykke én gang for at
     se, at der overhovedet er mad. Den første fold viser, hvad
     det ER, man folder ud.

     Klasserne er de samme som folden i bestil/ (.fold-hoved,
     .fold-krop, .fold-pil). Én håndbevægelse på hele siden, ét
     sæt regler at holde ved lige.

     <h2> BLIVER STÅENDE om knappen. Overskriften er sidens
     struktur — en skærmlæser skal kunne springe fra kategori til
     kategori — og et <button> alene er ingen overskrift. */
  function tegnKategori(g, aaben) {
    var id = tilId(g.kategori.navn);
    var sek = lav('section', 'kat kat-fold');
    sek.id = 'kat-' + id;

    var krop = lav('div', 'fold-krop');
    krop.id = 'katkrop-' + id;
    if (!aaben) krop.hidden = true;

    var h = lav('h2');
    var knap = lav('button', 'fold-hoved');
    knap.type = 'button';
    knap.setAttribute('aria-expanded', aaben ? 'true' : 'false');
    knap.setAttribute('aria-controls', krop.id);
    /* aria-hidden: en skærmlæser skal høre "Smørrebrød", ikke
       "spisebestik Smørrebrød". Tegnet er pynt, ikke indhold. */
    var tegn = lav('span', 'kat-tegn', AFD_TEGN[afdelingFor(g.kategori)] || '🍽️');
    tegn.setAttribute('aria-hidden', 'true');
    knap.appendChild(tegn);
    knap.appendChild(lav('span', 'fold-navn', g.kategori.navn));
    /* Tallet TÆLLES. Det er svaret på "er der noget at komme
       efter herinde?", som man ellers kun kan få ved at åbne. */
    knap.appendChild(lav('span', 'fold-note',
      g.varer.length + (g.varer.length === 1 ? ' vare' : ' varer')));
    knap.appendChild(lav('span', 'fold-pil'));
    knap.addEventListener('click', function () {
      var nu = knap.getAttribute('aria-expanded') === 'true';
      knap.setAttribute('aria-expanded', nu ? 'false' : 'true');
      krop.hidden = nu;
    });
    h.appendChild(knap);
    sek.appendChild(h);
    sek.appendChild(krop);

    // Har INGEN vare i kategorien en pris, er det en liste at vælge
    // fra – fx fyldet til smørrebrødet. Så ville en søjle med 29
    // tankestreger være støj. Den vises som små pastiller i stedet.
    var harPris = g.varer.some(function (v) {
      return v.pris !== null && v.pris !== undefined && v.pris !== '';
    });

    if (!harPris) {
      var pille = lav('div', 'valg');
      g.varer.forEach(function (v) {
        pille.appendChild(lav('span', 'valg-en' + (v.udsolgt ? ' udsolgt' : ''), v.navn));
      });
      krop.appendChild(pille);
      return sek;
    }

    g.varer.forEach(function (v) {
      var r = lav('div', 'linje' + (v.udsolgt ? ' udsolgt' : ''));

      var venstre = lav('div', 'linje-navn');
      venstre.appendChild(lav('span', 'navn', v.navn));
      if (v.udsolgt) venstre.appendChild(lav('span', 'maerke udsolgt', 'Udsolgt'));
      if (v.fremhaevet) venstre.appendChild(lav('span', 'maerke populaer', 'Populær'));
      if (v.beskrivelse) venstre.appendChild(lav('p', 'desc', v.beskrivelse));
      r.appendChild(venstre);

      // Tom pris giver ingen pris. Aldrig et gæt.
      var p = window.MosedePris(v.pris);
      if (p) r.appendChild(lav('span', 'linje-pris', p));
      krop.appendChild(r);
    });

    return sek;
  }

  /* Genvejen skal ÅBNE folden, ikke bare rulle hen til en lukket
     kasse. Uden det her førte "Drikkevarer" i genvejsrækken til en
     overskrift uden noget under — man havde trykket rigtigt og
     stod stadig og manglede menukortet. */
  function aabnOgRul(id) {
    var sek = $('kat-' + id);
    if (!sek) return;
    var knap = sek.querySelector('.fold-hoved');
    var krop = sek.querySelector('.fold-krop');
    if (knap && krop && knap.getAttribute('aria-expanded') !== 'true') {
      knap.setAttribute('aria-expanded', 'true');
      krop.hidden = false;
    }
    sek.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function tegn() {
    var boks = $('menu-liste');
    var stier = $('kat-stier');
    tøm(boks);
    tøm(stier);

    var grupper = grupperFor(valgt);

    if (!grupper.length) {
      boks.appendChild(lav('p', 'desc', 'Der er ikke lagt noget ind i denne afdeling endnu.'));
      return;
    }

    /* Genvejene til hver kategori. På en telefon kan rækken rulles
       sidelæns – 7 kategorier kan ikke stå på 390 pixel, og en
       ombrudt klump på fire linjer skubber selve menukortet ned
       under skærmkanten.

       ÉN GENVEJ ER INGEN GENVEJ. Har afdelingen kun én kategori,
       står der en enlig pille over kortet, der fører til kortet
       lige nedenunder. Set på et skærmbillede af "Mad" med kun
       smørrebrødet i (23/8): den lignede et filter, man havde
       glemt at slå fra. */
    stier.classList.toggle('skjult', grupper.length < 2);

    grupper.forEach(function (g) {
      var id = tilId(g.kategori.navn);
      var a = lav('a', 'glass sm', g.kategori.navn);
      a.href = '#kat-' + id;
      /* Adressen bliver stående som href, så linket kan kopieres
         og deles — men klikket håndteres her, så folden åbnes.
         Se aabnOgRul. */
      a.addEventListener('click', function (h) {
        h.preventDefault();
        aabnOgRul(id);
      });
      stier.appendChild(a);
    });

    grupper.forEach(function (g, i) { boks.appendChild(tegnKategori(g, i === 0)); });
  }

  /* ---- Skiftet mellem afdelinger ----

     Uden en bevægelse er skiftet fra Mad til Is bare 150 linjer der
     bliver erstattet på samme billede, og man er ikke sikker på at
     man ramte fanen. Kategorierne flyver ind ovenfra, de tre
     øverste forskudt.

     Klassen skal FJERNES og sættes igen, ellers starter animationen
     ikke anden gang – browseren ser den samme klasse og gør intet.
     void offsetWidth tvinger et layout imellem, og det er det der
     nulstiller den. */
  function tegnMedBevaegelse() {
    var boks = $('menu-liste');
    boks.classList.remove('kat-skift');
    tegn();
    void boks.offsetWidth;
    boks.classList.add('kat-skift');
  }

  function skift(ny) {
    valgt = ny;
    AFDELINGER.forEach(function (a) {
      var b = $('afd-' + a.id);
      if (!b) return;
      var erValgt = a.id === ny;
      b.setAttribute('aria-selected', erValgt ? 'true' : 'false');
      b.className = erValgt ? 'glass sm valgt' : 'glass sm';
    });
    tegnMedBevaegelse();
    // Adressen følger med, så en afdeling kan sendes videre
    try {
      history.replaceState(null, '', '?afd=' + ny + location.hash);
    } catch (e) { /* fx file:// – uden betydning */ }
  }

  AFDELINGER.forEach(function (a) {
    var b = $('afd-' + a.id);
    if (b) b.addEventListener('click', function () { skift(a.id); });
  });

  /* ---- Noten under kortet, skrevet af personalet i admin ---- */
  function visNote(d) {
    var n = (d.indstillinger && d.indstillinger.menu_note) || '';
    var el = $('menu-note');
    if (!el) return;
    if (n) { el.textContent = n; el.classList.remove('skjult'); }
    else el.classList.add('skjult');
  }

  /* ---- Åbent-pillen i toppen, samme som på forsiden ---- */
  function visStatus(d) {
    var s = Butik.status(d);
    var pille = $('menu-status');
    var tekst = $('menu-status-tekst');
    if (!pille || !tekst) return;
    /* Butik.pilleTekst forkorter til én linje. Her stod
       s.overskrift + ' · ' + s.detalje, altså
       "Åbent nu · Åbent til kl. 21:00" – ordet "åbent" to gange, og
       to rækker pille på en telefon. */
    tekst.textContent = Butik.pilleTekst(s);
    var prik = pille.querySelector('.dot');
    if (prik) prik.classList.toggle('lukket', !s.aaben);
  }

  function visAdresse() {
    var m = window.MOSEDE;
    if (!m) return;
    var a = $('menu-adresse');
    if (a) a.textContent = m.fuldAdresse();
    var t = $('menu-tel');
    if (t) { t.href = 'tel:' + m.telefon; t.textContent = m.telefonPent; }
  }

  /* ---- Start ---- */
  visAdresse();

  Butik.hent().then(function (d) {
    data = d;
    visStatus(d);
    visNote(d);

    /* Hvilken afdeling? ?afd=is har førsteret, så et link kan pege
       direkte på isen. Ellers gætter vi ud fra et #kat-anker, så
       menu.html#kat-oel også åbner den rigtige fane – uden det
       ville linket ramme en kategori der ikke er tegnet endnu. */
    var fra = new URLSearchParams(location.search).get('afd');
    var start = 'mad';
    if (fra && AFDELINGER.some(function (a) { return a.id === fra; })) {
      start = fra;
    } else if (location.hash.indexOf('#kat-') === 0) {
      var oensket = location.hash.slice(5);
      AFDELINGER.forEach(function (a) {
        grupperFor(a.id).forEach(function (g) {
          if (tilId(g.kategori.navn) === oensket) start = a.id;
        });
      });
    }
    skift(start);

    /* Ankeret virker først når kategorien er tegnet — og folden
       skal ÅBNES, ikke bare rulles til. Et delt link til
       menu.html#kat-oel skal vise øllene, ikke en lukket
       overskrift der hedder "Øl". */
    if (location.hash.indexOf('#kat-') === 0) {
      aabnOgRul(location.hash.slice(5));
    } else if (location.hash) {
      var maal = document.getElementById(location.hash.slice(1));
      if (maal) maal.scrollIntoView({ block: 'start' });
    }
  }).catch(function (fejl) {
    // Ingen tavs fejl: kan menukortet ikke hentes, skal gæsten
    // kunne ringe i stedet for at stå med en tom side.
    var boks = $('menu-liste');
    if (boks) {
      tøm(boks);
      boks.appendChild(lav('p', 'desc',
        'Vi kan ikke hente menukortet lige nu. Ring til os – vi siger det gerne.'));
    }
    if (window.console) console.warn('menukortet kunne ikke hentes:', fejl);
  });
})();
