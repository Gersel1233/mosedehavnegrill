/* ============================================================
   ⚠️ INGEN SIDE INDLÆSER DEN HER FIL  (målt 5/9)
   ------------------------------------------------------------
   Den kørte, dengang gæstesiden så anderledes ud. I dag gør
   arbejdet: h-kalender.html + js/skal/kalender.js.

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
/* Arrangementer for gæsterne.

   Listen ER kalenderen i admin: personalet sætter fluebenet
   "Vises for gæsterne" på et arrangement, og så står det her.
   Der er ingen anden liste at vedligeholde, og derfor kan siden
   ikke komme til at vise noget, personalet har slettet.

   Adgangen er bevist i databasen — gæster kan kun læse de
   offentlige rækker (supabase/proev-kalender.sql). Filteret på
   `offentlig` hernede er alligevel med: kører siden i øvetilstand
   uden database, er der ingen adgangsregel til at holde et internt
   arrangement tilbage, og så er det linjen her, der gør det. */
(function () {
  'use strict';

  var liste = document.getElementById('arr-liste');
  if (!liste) return;

  var MÅNEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december'];

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

  function tegn(rækker) {
    liste.textContent = '';

    if (!rækker.length) {
      /* Tomt er et svar, ikke en fejl. En tom side uden ord ligner
         noget, der er gået i stykker — og så er gæsten videre. */
      var tom = lav('div', 'kort arr-tom');
      tom.appendChild(lav('h2', null, 'Der er ikke lagt noget op lige nu'));
      tom.appendChild(lav('p', null,
        'Når der er et arrangement på vej, står det her. '
        + 'Kig forbi igen — eller kom bare ned til havnen.'));
      liste.appendChild(tom);
      return;
    }

    rækker.forEach(function (a) {
      var kort = lav('article', 'kort arr-kort');

      var hvornår = pænDato(a.dato);
      if (a.slut_dato && a.slut_dato !== a.dato) {
        hvornår += ' – ' + pænDato(a.slut_dato);
      }
      kort.appendChild(lav('div', 'eyebrow', hvornår));

      var titel = lav('h2', 'arr-titel');
      if (a.emoji) titel.appendChild(lav('span', 'arr-emoji', a.emoji + ' '));
      titel.appendChild(document.createTextNode(a.titel));
      kort.appendChild(titel);

      liste.appendChild(kort);
    });
  }

  Butik.hent().then(function (d) {
    var iDag = Butik.nu().dato;
    tegn((d.kalender || []).filter(function (k) {
      return k.type === 'arrangement'
        && k.offentlig !== false
        && (k.slut_dato || k.dato) >= iDag;
    }));
  }).catch(function () {
    /* Kan der ikke hentes, skal der stå hvorfor der er tomt —
       ellers tror gæsten, at der aldrig sker noget. */
    liste.textContent = '';
    var fejl = lav('div', 'kort arr-tom');
    fejl.appendChild(lav('h2', null, 'Listen kunne ikke hentes'));
    fejl.appendChild(lav('p', null, 'Prøv igen om lidt.'));
    liste.appendChild(fejl);
  });
})();
