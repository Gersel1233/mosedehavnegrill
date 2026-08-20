/* ============================================================
   BESTIL MAD – siden omkring formularen

   Den her fil er søsteren til js/smoerrebroed.js: den gør det, der
   omgiver bestillingsformularen — åbent eller lukket, noten fra
   personalet, telefonen — og sender de hentede data videre til
   js/bestilling.js.

   ------------------------------------------------------------
   HVORFOR SIDEN FINDES
   ------------------------------------------------------------
   Formularen lå på smoerrebroed-ud-af-huset/. Den kunne allerede
   tage imod grill og café — ejeren sætter selv fluebenene i admin
   — og både "spis her" og "tag med". En adresse, der siger
   smørrebrød, passede altså ikke længere til det, der stod på
   skærmen. Smørrebrødssiden er blevet det, den er bedst til: en
   salgs- og søgeside for "smørrebrød ud af huset i Greve", der
   fører hertil.

   ------------------------------------------------------------
   SIDEN LOVER IKKE, HVAD DER KAN BESTILLES
   ------------------------------------------------------------
   Overskriften siger "Bestil mad" og ikke "Bestil grill,
   smørrebrød og is". Hvad der FAKTISK kan bestilles, er ejerens
   beslutning og står i admin — og svaret står ét sted på siden:
   i vælgeren over listen, som js/bestilling.js tegner ud fra
   menukortet.

   Det er ikke en detalje. En overskrift, der lover pølser, mens
   køkkenet kun tager imod smørrebrød, er en kunde, der møder
   skuffet op — og det er præcis den slags løfte, resten af siden
   er bygget for at undgå.
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
    var el = $('bestil-note');
    if (!el) return;
    if (n) { el.textContent = n; el.classList.remove('skjult'); }
    else el.classList.add('skjult');
  }

  function visStatus(d) {
    var s = Butik.status(d);
    var pille = $('bestil-status');
    var tekst = $('bestil-status-tekst');
    if (!pille || !tekst) return;
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
  }

  visOplysninger();

  Butik.hent().then(function (d) {
    visStatus(d);
    visNote(d);

    /* Formularen får DE SAMME data. To Butik.hent() på samme side
       ville hente de samme syv tabeller to gange over en
       mobilforbindelse — og de to svar kunne i teorien være hver
       sin udgave af menukortet, så prisen i kurven ikke passede
       med prisen på listen. */
    if (window.MosedeBestilling) window.MosedeBestilling.start(d);
  }).catch(function (fejl) {
    /* Kan menukortet ikke hentes, kan man ikke bestille noget: vi
       ved ikke, hvad der er, hvad det koster, eller hvornår der er
       åbent. Formularen skjules, og telefonen står i stedet. Det er
       bedre end en formular, der sender en bestilling, ingen kan
       udføre. */
    var form = $('bestil-form');
    if (form) form.classList.add('skjult');

    var lukket = $('bestil-lukket');
    if (lukket) {
      tøm(lukket);
      lukket.appendChild(lav('h3', null, 'Vi kan ikke tage imod lige nu'));
      lukket.appendChild(lav('p', null,
        'Der er noget, der driller på hjemmesiden. Ring til os – '
        + 'så skriver vi bestillingen ned med det samme.'));
      var m = window.MOSEDE;
      var t = lav('div', 'tags luft');
      var ring = lav('a', 'glass solid', m ? m.telefonPent : 'Ring til os');
      ring.href = 'tel:' + (m ? m.telefon : '');
      t.appendChild(ring);
      lukket.appendChild(t);
      lukket.classList.remove('skjult');
    }

    var pille = $('bestil-status-tekst');
    if (pille) pille.textContent = 'Ring og hør om vi har åbent';

    if (window.console) console.warn('bestillingssiden kunne ikke hentes:', fejl);
  });
})();
