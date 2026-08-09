/* ============================================================
   SMØRREBRØD UD AF HUSET – siden omkring formularen

   Siden gør to ting: den skal kunne findes på "smørrebrød ud af
   huset i Greve", og den skal gøre det nemt at bestille.

   ------------------------------------------------------------
   DEN HER FIL VAR TRE GANGE SÅ LANG
   ------------------------------------------------------------
   Den tegnede to afsnit mere: "Smørrebrød fra kortet" med de fem
   priser, og "Vælg fyld" med alle 29 slags grupperet i seks kort.

   Begge afsnit er væk, for bestillingsformularen viser præcis de
   samme fem priser og præcis de samme 29 slags fyld – bare til at
   trykke på. Siden sagde alt to gange, og man skulle rulle gennem
   hele sortimentet for at nå det sted hvor man kunne bestille.

   Grupperingen af fyldet er flyttet til js/bestilling.js, hvor
   pillerne er. Tilbage her er det der omgiver formularen: åbent
   eller lukket, noten fra personalet, telefon og adresse – og at
   sende de hentede data videre til formularen.
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

  function visNote(d) {
    var n = (d.indstillinger && d.indstillinger.menu_note) || '';
    var el = $('smoer-note');
    if (!el) return;
    if (n) { el.textContent = n; el.classList.remove('skjult'); }
    else el.classList.add('skjult');
  }

  /* ----------------------------------------------------------
     DE TO TAL I SIDENS HOVED
     ----------------------------------------------------------
     "5 slags stykker · 29 slags fyld". Begge TÆLLES af
     Butik.smoerrebroed ud fra menukortet i databasen, så de ikke kan
     blive forældede. Sætter personalet en slags udsolgt, falder
     tallet af sig selv — og der kan ikke komme til at stå "29 slags"
     den dag der er 27.

     Det er dem der fanger. "Stort udvalg" er en påstand man ikke kan
     efterprøve; 29 er et tal.

     Blokken er hidden indtil der ER tal. Et "0 slags" i det halve
     sekund databasen svarer i, er værre end ingenting — og kan
     kortet slet ikke hentes, bliver den skjult, for så ved vi det
     ikke.
     ---------------------------------------------------------- */
  function visTal(d) {
    var boks = $('smoer-tal');
    if (!boks) return;

    var s = Butik.smoerrebroed(d);
    if (!s.stykker.length && !s.fyld.length) {
      boks.hidden = true;
      return;
    }
    $('smoer-tal-stykker').textContent = String(s.stykker.length);
    $('smoer-tal-fyld').textContent = String(s.fyld.length);
    boks.hidden = false;
  }

  function visStatus(d) {
    var s = Butik.status(d);
    var pille = $('smoer-status');
    var tekst = $('smoer-status-tekst');
    if (!pille || !tekst) return;
    // Én linje, samme forkortelse som forsiden og menukortet
    tekst.textContent = Butik.pilleTekst(s);
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
    visNote(d);
    visTal(d);

    /* Bestillingsformularen får DE SAMME data. To Butik.hent() på
       samme side ville hente de samme syv tabeller to gange over en
       mobilforbindelse – og de to svar kunne i teorien være hver sin
       udgave af menukortet, så prisen i kurven ikke passede med
       prisen på listen. */
    if (window.MosedeBestilling) window.MosedeBestilling.start(d);
  }).catch(function (fejl) {
    /* Kan menukortet ikke hentes, kan man ikke bestille noget: vi
       ved ikke hvad der er, hvad det koster, eller hvornår der er
       åbent. Formularen skjules, og telefonen står i stedet. Det er
       bedre end en formular der sender en bestilling ingen kan
       udføre. */
    var form = $('bestil-form');
    if (form) form.classList.add('skjult');

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

    var pille = $('smoer-status-tekst');
    if (pille) pille.textContent = 'Ring og hør om vi har åbent';

    if (window.console) console.warn('smørrebrødet kunne ikke hentes:', fejl);
  });
})();
