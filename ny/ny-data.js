/* Mosede /ny/: forsidens egne scripts henter data med Butik.hent().
   Her lytter vi med, så /ny/'s uge og hero kan tegnes af den SAMME
   hentning — ikke en ekstra tur til databasen. Hver gang en hentning
   lander, gemmes den og meldes som hændelsen "ny-data". */
(function () {
  'use strict';
  if (!window.Butik || typeof Butik.hent !== 'function') return;
  var hent = Butik.hent;
  Butik.hent = function () {
    return hent.apply(this, arguments).then(function (d) {
      try {
        window.nyData = d;
        document.dispatchEvent(new CustomEvent('ny-data', { detail: d }));
      } catch (e) {}
      return d;
    });
  };
})();
