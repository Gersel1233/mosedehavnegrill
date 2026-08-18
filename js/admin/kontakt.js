/* Fanen Kontakt: adresse, telefon og e-mail. Se js/admin/kerne.js
   for de to principper der gælder i alle admin-filerne. */
(function () {
  'use strict';

  var $ = Admin.$;

  function tegnKontakt() {
    var l = (Admin.data.lokationer || [])[0];
    if (!l) return;
    $('lok-navn').value = l.navn || '';
    $('lok-adresse').value = l.adresse || '';
    $('lok-postnr').value = l.postnr || '';
    $('lok-by').value = l.by || '';
    $('lok-telefon').value = l.telefon || '';
    $('lok-beskrivelse').value = l.beskrivelse || '';
    $('lok-email').value = (Admin.data.indstillinger || {}).kontakt_email || l.email || '';
  }

  $('gem-kontakt').addEventListener('click', function () {
    var l = (Admin.data.lokationer || [])[0];
    if (!l) return Admin.brøl('Der er ingen lokation at rette. Kør setup.sql først.');

    var f = Butik.tjek.navn($('lok-navn').value, 'navn', 120)
         || Butik.tjek.navn($('lok-adresse').value, 'adresse', 120)
         || Butik.tjek.navn($('lok-by').value, 'by', 80);
    if (f) return Admin.brøl(f);
    if (!/^\d{4}$/.test($('lok-postnr').value.trim())) return Admin.brøl('Postnummeret skal være fire cifre.');

    var email = $('lok-email').value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Admin.brøl('E-mailen ser ikke rigtig ud.');

    Admin.gem(Butik.skrive.lokation({
      id: l.id,
      navn: $('lok-navn').value,
      adresse: $('lok-adresse').value,
      postnr: $('lok-postnr').value,
      by: $('lok-by').value,
      telefon: $('lok-telefon').value,
      beskrivelse: $('lok-beskrivelse').value,
    }).then(function () {
      return Butik.skrive.indstilling('kontakt_email', email);
    }), 'Kontaktoplysningerne er gemt.');
  });

  Admin.tegnere.push(tegnKontakt);
})();
