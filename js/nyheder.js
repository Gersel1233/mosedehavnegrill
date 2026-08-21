/* Nyhederne for gæsterne.

   Listen ER fanen i admin: personalet skriver en nyhed, sætter
   fluebenet "Vis den", og så står den her. Der er ingen anden
   liste at vedligeholde, og derfor kan siden ikke komme til at
   vise noget, personalet har taget ned.

   Tabellen og fanen har eksisteret siden fase 1. Siden her er det,
   der manglede: uden den skrev personalet ind i en skuffe, ingen
   åbnede — og en funktion, ingen kan se virke, holder folk op med
   at bruge.

   Filen er en tvilling til js/arrangementer.js. De to gør det
   samme for hver sin tabel, og de er holdt adskilt med vilje:
   en fælles "vis en liste"-funktion ville skulle kende begge
   dataformer, og så er den ikke længere nemmere end to filer. */
(function () {
  'use strict';

  var liste = document.getElementById('nyhedsliste');
  if (!liste) return;

  var MÅNEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

  /* T12:00:00Z og ikke bare datoen. En dato uden klokkeslæt læses
     som midnat UTC, og midnat UTC er dagen FØR i dansk sommertid —
     så en nyhed fra den 14. ville stå som den 13. Klokken 12 er
     midt på dagen i begge tidszoner. */
  function pænDato(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    var ugedag = Butik.UGEDAGE[(d.getUTCDay() + 6) % 7];
    return ugedag + ' ' + d.getUTCDate() + '. ' + MÅNEDER[d.getUTCMonth()];
  }

  function lav(tag, klasse, tekst) {
    var el = document.createElement(tag);
    if (klasse) el.className = klasse;
    if (tekst) el.textContent = tekst;
    return el;
  }

  function besked(overskrift, brød) {
    liste.textContent = '';
    var boks = lav('div', 'nw');
    boks.appendChild(lav('h3', null, overskrift));
    boks.appendChild(lav('p', null, brød));
    liste.appendChild(boks);
  }

  function tegn(rækker) {
    liste.textContent = '';

    if (!rækker.length) {
      /* Tomt er et svar, ikke en fejl. En tom side uden ord ligner
         noget, der er gået i stykker — og så er gæsten videre. */
      besked('Der er ikke noget nyt lige nu',
        'Når der sker noget — ændrede tider, nyt i disken — står det her. '
        + 'Kig forbi igen, eller kom bare ned til havnen.');
      return;
    }

    rækker.forEach(function (n) {
      var kort = lav('article', 'nw');
      if (n.dato) kort.appendChild(lav('div', 'nw-naar', pænDato(n.dato)));
      kort.appendChild(lav('h3', null, n.titel));
      if (n.tekst) kort.appendChild(lav('p', null, n.tekst));
      liste.appendChild(kort);
    });
  }

  Butik.hent().then(function (d) {
    tegn((d.nyheder || [])
      .filter(function (n) { return n.aktiv !== false && n.titel; })
      .sort(function (a, b) { return (b.dato || '') < (a.dato || '') ? -1 : 1; }));
  }).catch(function () {
    /* Kan der ikke hentes, skal der stå HVORFOR der er tomt —
       ellers tror gæsten, at der aldrig sker noget her. Det er
       den samme regel som i js/arrangementer.js. */
    besked('Listen kunne ikke hentes', 'Prøv igen om lidt.');
  });
})();
