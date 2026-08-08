/* ============================================================
   SMØRREBRØD UD AF HUSET

   Siden gør to ting: den skal kunne findes på "smørrebrød ud af
   huset i Greve", og den skal gøre det nemt at ringe og bestille.

   ------------------------------------------------------------
   FYLDET GRUPPERES – MEN GRUPPERNE ER IKKE I DATABASEN
   ------------------------------------------------------------
   Forretningens kort har 29 slags fyld i én lang liste. Grupperne
   herunder – fisk, kød, salater, æg og kartoffel, ost og
   vegetarisk – er en LÆSEHJÆLP vi lægger ovenpå, ikke data.

   De findes derfor som ordlister her og ikke som en kolonne i
   tabellen: personalet skal kunne skrive et nyt fyld i admin uden
   først at skulle vælge en gruppe, og et fyld der ikke passer i en
   gruppe, havner i "Andet godt" frem for at forsvinde.

   Rækkefølgen betyder noget. "Æggesalat med bacon" indeholder både
   "æg" og "bacon", og den hører under salater. Derfor prøves
   grupperne i rækkefølge, og den første der passer, vinder.
   ------------------------------------------------------------ */

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

  var GRUPPER = [
    {
      navn: 'Salater',
      ord: ['salat', 'wienersalat', 'skinkesalat', 'hønsesalat', 'makrelsalat'],
    },
    {
      navn: 'Fisk og skaldyr',
      ord: ['fisk', 'sild', 'rejer', 'makrel', 'laks'],
    },
    {
      navn: 'Kød og pålæg',
      ord: ['flæskesteg', 'pølse', 'rullepølse', 'roastbeef', 'skinke',
            'kylling', 'spegepølse', 'leverpostej', 'dyrlægens', 'frikadelle',
            'bacon', 'kød'],
    },
    {
      navn: 'Æg og kartoffel',
      ord: ['æg', 'kartoffel', 'spejlæg'],
    },
    {
      navn: 'Ost og grønt',
      ord: ['ost', 'tomat', 'agurk', 'peberfrugt'],
    },
  ];

  function gruppeFor(navn) {
    var lille = navn.toLowerCase();
    for (var i = 0; i < GRUPPER.length; i++) {
      for (var j = 0; j < GRUPPER[i].ord.length; j++) {
        if (lille.indexOf(GRUPPER[i].ord[j]) !== -1) return GRUPPER[i].navn;
      }
    }
    return 'Andet godt';
  }

  /* Kategorierne fra databasen der handler om smørrebrød. Vi leder
     efter navnet frem for et fast id: personalet kan omdøbe en
     kategori i admin, og siden skal ikke gå i stå af det. */
  function smoerrebroedVarer(d) {
    var kat = (d.menu_kategorier || []).filter(function (k) {
      return k.aktiv !== false && /smørrebrød|fyld/i.test(k.navn || '');
    });
    var ids = kat.map(function (k) { return k.id; });
    return (d.menu_varer || []).filter(function (v) {
      return v.aktiv !== false && ids.indexOf(v.kategori_id) !== -1;
    });
  }

  function visFyld(d) {
    var boks = $('fyld-grupper');
    if (!boks) return;
    tøm(boks);

    var varer = smoerrebroedVarer(d);

    /* Kun dem UDEN pris. Kategorien "Smørrebrød" har priser og er
       de færdige stykker; "Vælg fyld til smørrebrødet" har ingen og
       er det man vælger imellem. Det er dem der skal grupperes. */
    var fyld = varer.filter(function (v) {
      return v.pris === null || v.pris === undefined || v.pris === '';
    });

    if (!fyld.length) {
      boks.appendChild(lav('p', 'desc',
        'Vi henter udvalget af fyld — ring til os, hvis det driller.'));
      return;
    }

    var efterGruppe = {};
    fyld.forEach(function (v) {
      var g = gruppeFor(v.navn);
      (efterGruppe[g] = efterGruppe[g] || []).push(v);
    });

    // Grupperne i den rækkefølge de er defineret, "Andet godt" sidst
    var raekke = GRUPPER.map(function (g) { return g.navn; }).concat(['Andet godt']);

    raekke.forEach(function (navn) {
      var liste = efterGruppe[navn];
      if (!liste || !liste.length) return;

      var kort = lav('div', 'oversigt-kort');
      kort.appendChild(lav('div', 'eyebrow', navn));

      var pille = lav('div', 'valg luft');
      liste.forEach(function (v) {
        pille.appendChild(lav('span', 'valg-en' + (v.udsolgt ? ' udsolgt' : ''), v.navn));
      });
      kort.appendChild(pille);
      boks.appendChild(kort);
    });

    var antal = lav('p', 'note', fyld.length + ' slags fyld at vælge imellem.');
    boks.parentNode.insertBefore(antal, boks.nextSibling);
  }

  /* De færdige stykker MED pris – dem der står på kortet med et
     tal. De er det bedste svar på "hvad koster det", og de er
     hentet fra kortet, ikke fundet på. */
  function visFaerdige(d) {
    var boks = $('smoer-priser');
    if (!boks) return;
    tøm(boks);

    var medPris = smoerrebroedVarer(d).filter(function (v) {
      return v.pris !== null && v.pris !== undefined && v.pris !== '';
    }).sort(function (a, b) { return (a.sortering || 0) - (b.sortering || 0); });

    if (!medPris.length) { boks.classList.add('skjult'); return; }

    medPris.forEach(function (v) {
      var r = lav('div', 'linje' + (v.udsolgt ? ' udsolgt' : ''));
      var venstre = lav('div', 'linje-navn');
      venstre.appendChild(lav('span', 'navn', v.navn));
      if (v.beskrivelse) venstre.appendChild(lav('p', 'desc', v.beskrivelse));
      r.appendChild(venstre);
      var p = window.MosedePris(v.pris);
      if (p) r.appendChild(lav('span', 'linje-pris', p));
      boks.appendChild(r);
    });
  }

  function visNote(d) {
    var n = (d.indstillinger && d.indstillinger.menu_note) || '';
    var el = $('smoer-note');
    if (!el) return;
    if (n) { el.textContent = n; el.classList.remove('skjult'); }
    else el.classList.add('skjult');
  }

  function visStatus(d) {
    var s = Butik.status(d);
    var pille = $('smoer-status');
    var tekst = $('smoer-status-tekst');
    if (!pille || !tekst) return;
    tekst.textContent = s.detalje ? s.overskrift + ' · ' + s.detalje : s.overskrift;
    var prik = pille.querySelector('.dot');
    if (prik) prik.classList.toggle('lukket', !s.aaben);
  }

  function visOplysninger() {
    var m = window.MOSEDE;
    if (!m) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-tel]'), function (a) {
      a.href = 'tel:' + m.telefon;
      if (a.hasAttribute('data-tel-tekst')) a.textContent = m.telefonPent;
    });
    var ad = $('smoer-adresse');
    if (ad) ad.textContent = m.fuldAdresse();
  }

  visOplysninger();

  Butik.hent().then(function (d) {
    visStatus(d);
    visFaerdige(d);
    visFyld(d);
    visNote(d);

    /* Bestillingsformularen får DE SAMME data. To Butik.hent() på
       samme side ville hente de samme syv tabeller to gange over en
       mobilforbindelse – og de to svar kunne i teorien være hver sin
       udgave af menukortet, så prisen i kurven ikke passede med
       prisen på listen. */
    if (window.MosedeBestilling) window.MosedeBestilling.start(d);
  }).catch(function (fejl) {
    var boks = $('fyld-grupper');
    if (boks) {
      tøm(boks);
      boks.appendChild(lav('p', 'desc',
        'Vi kan ikke hente udvalget lige nu. Ring til os — vi siger det gerne.'));
    }

    /* Kan menukortet ikke hentes, kan man ikke bestille noget: vi
       ved ikke hvad der er, hvad det koster, eller hvornår der er
       åbent. Formularen skjules, og telefonen står i stedet. Det er
       bedre end en formular der sender en bestilling ingen kan
       udføre. */
    var form = $('bestil-form');
    if (form) {
      form.classList.add('skjult');
      var lukket = $('bestil-lukket');
      if (lukket) {
        tøm(lukket);
        lukket.appendChild(lav('h3', null, 'Vi kan ikke tage imod lige nu'));
        lukket.appendChild(lav('p', null,
          'Der er noget der driller på hjemmesiden. Ring til os – '
          + 'så skriver vi bestillingen ned med det samme.'));
        var m = window.MOSEDE;
        var t = lav('div', 'tags luft');
        var ring = lav('a', 'glass solid', m ? m.telefonPent : 'Ring til os');
        ring.href = 'tel:' + (m ? m.telefon : '');
        t.appendChild(ring);
        lukket.appendChild(t);
        lukket.classList.remove('skjult');
      }
    }

    if (window.console) console.warn('smørrebrødet kunne ikke hentes:', fejl);
  });
})();
