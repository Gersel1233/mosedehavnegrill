/* Fanen Lukkedage. Se js/admin/kerne.js for de to principper
   der gælder i alle admin-filerne.

   Fase 3 erstatter lukkedage med én kalendertabel (arrangement,
   lukkedag, tidlig lukning). Når den kommer, er det DENNE fil
   der skiftes ud – ikke et stykke af en større. */
(function () {
  'use strict';

  var $ = Admin.$;

  function tegnLukkedage() {
    var boks = $('lukkedage-liste');
    Admin.tøm(boks);

    var dage = (Admin.data.lukkedage || []).slice().sort(function (a, b) { return a.dato < b.dato ? -1 : 1; });
    if (!dage.length) {
      boks.appendChild(Admin.lav('p', 'vare-tekst', 'Ingen lukkedage lagt ind.'));
      return;
    }

    dage.forEach(function (l) {
      var r = Admin.lav('div', 'admin-raekke');
      r.appendChild(Admin.lav('span', 'navn', (l.emoji ? l.emoji + ' ' : '') + Admin.pænDato(l.dato)));
      r.appendChild(Admin.lav('span', 'vare-tekst', l.aarsag || ''));

      var slet = Admin.lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        Admin.gem(Butik.skrive.sletLukkedag(l.id), 'Lukkedagen er slettet.');
      });
      r.appendChild(slet);
      boks.appendChild(r);
    });
  }

  $('tilfoej-lukkedag').addEventListener('click', function () {
    var dato = $('ny-dato').value;
    var fejl = Butik.tjek.dato(dato);
    if (fejl) return Admin.brøl(fejl);

    var lokId = ((Admin.data.lokationer || [])[0] || {}).id || Butik.LOKATION;
    Admin.gem(Butik.skrive.lukkedag({
      lokation_id: lokId,
      dato: dato,
      aarsag: $('ny-aarsag').value,
      emoji: $('ny-emoji').value,
    }), 'Lukkedagen er lagt ind.').then(function () {
      $('ny-dato').value = ''; $('ny-aarsag').value = ''; $('ny-emoji').value = '';
    });
  });

  Admin.tegnere.push(tegnLukkedage);
})();
