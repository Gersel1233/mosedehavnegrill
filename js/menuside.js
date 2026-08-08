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

  function tegnKategori(g) {
    var sek = lav('section', 'kat');
    sek.id = 'kat-' + tilId(g.kategori.navn);

    var h = lav('h2', null, g.kategori.navn);
    sek.appendChild(h);

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
      sek.appendChild(pille);
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
      sek.appendChild(r);
    });

    return sek;
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
       under skærmkanten. */
    grupper.forEach(function (g) {
      var a = lav('a', 'glass sm', g.kategori.navn);
      a.href = '#kat-' + tilId(g.kategori.navn);
      stier.appendChild(a);
    });

    grupper.forEach(function (g) { boks.appendChild(tegnKategori(g)); });
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

    // Ankeret virker først når kategorien er tegnet
    if (location.hash) {
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
