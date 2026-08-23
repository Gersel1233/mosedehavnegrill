/* ============================================================
   MENUKORTET — KOBLINGEN, IKKE SKALLEN

   m-menukort.html er leveret med sit eget tema (mosede-m.css +
   menu.*) og med hele kortet skrevet i menu-data.js. Den fil er
   en NØDMENU: den bliver stående, så siden kan vise noget, hvis
   databasen er nede — præcis som forsiden altid har haft en.

   Her lægges forretningens rigtige kort ind i stedet, når det er
   hentet. Vi rører ikke menu.js: den tegner listen, og vi giver
   den bare noget andet at tegne.

   HVORFOR TEGNES DER FORFRA I STEDET FOR AT VENTE PÅ DATAENE?
   Fordi menu.js tegner ved indlæsning, og en side, der venter på
   nettet med at vise noget som helst, er en hvid skærm på en
   telefon nede ved vandet. Nødmenuen står med det samme, og
   kortet skiftes ud, når det er hentet.
   ============================================================ */

(function () {
  'use strict';

  if (!window.Butik) return;
  // Ingen nødmenu at skifte ud = siden er ikke den, vi tror.
  if (typeof MENU === 'undefined' || typeof render !== 'function') return;

  /* Tegnet kommer fra AFDELINGEN, ikke fra kategorinavnet.
     Ejeren sætter mad/is/drikke i admin, og de tre er sande.
     Fjorten gættede tegn ud fra ordene i et kategorinavn ville
     være pænere og forkerte — "Pølser og hotdogs" ville få en
     pølse, og "Til selskabet" ville få et gæt. */
  var TEGN = { mad: 'pan', is: 'cone', drikke: 'cup' };

  function byg(d) {
    return Butik.menu(d).map(function (g) {
      var varer = g.varer.filter(function (v) { return !v.udsolgt; });
      return {
        // Sektionens id bliver til "s-kat7" i menu.js — kategoriens
        // egen nøgle, så pillerne i toppen peger rigtigt, uanset
        // hvad kategorien kommer til at hedde.
        id: 'kat' + g.kategori.id,
        title: g.kategori.navn,
        icon: TEGN[g.kategori.afdeling] || 'bag',
        // Kategorierne har ingen notekolonne i databasen. Designets
        // "Serveres 8–11" står derfor ikke på et rigtigt kort —
        // skal den kunne skrives, er det ét felt i admin.
        note: '',
        groups: [{
          items: varer.map(function (v) {
            /* Tom pris sendes videre som tom. menu.js skriver
               "spørg" på den, og det er det rigtige: 79 af
               forretningens varer har ikke fået en pris endnu, og
               et nul ville stå som gratis. */
            return [v.navn, v.pris === null || v.pris === undefined ? 0 : Number(v.pris),
              v.beskrivelse || ''];
          }),
        }],
      };
    }).filter(function (s) { return s.groups[0].items.length > 0; });
  }

  Butik.hent().then(function (d) {
    var nyt = byg(d);
    /* Regel 1, som på forsiden: vi overskriver kun, når
       databasen har noget at sige. Et tomt svar lader nødmenuen
       stå i stedet for at tømme kortet. */
    if (!nyt.length) return;

    // MENU er en const — den kan fyldes om, ikke sættes om.
    MENU.length = 0;
    nyt.forEach(function (s) { MENU.push(s); });

    render();

    /* Efter en ny tegning findes de gamle elementer ikke mere.
       Tre ting hænger på dem, og de skal sættes på igen — ellers
       står kortet usynligt (indfaldet), pillerne holder op med at
       følge med, og kurven glemmer sig selv. */
    if (typeof io !== 'undefined' && io) {
      document.querySelectorAll('.rev').forEach(function (el) { io.observe(el); });
    }
    if (typeof spy !== 'undefined' && spy) {
      document.querySelectorAll('.msec').forEach(function (s) { spy.observe(s); });
    }
    if (typeof revealFallback === 'function') revealFallback(document.getElementById('sc'));
    if (typeof paint === 'function') paint();

    /* Har gæsten allerede skrevet i søgefeltet, mens kortet blev
       hentet, står søgningen på den gamle liste. Den køres igen,
       så det, hun kigger på, er det, hun har søgt efter. */
    var felt = document.getElementById('q');
    if (felt && felt.value.trim() && typeof search === 'function') search();
  }).catch(function (fejl) {
    console.warn('Menukortets kobling fejlede, nødmenuen står:', fejl);
  });
}());
