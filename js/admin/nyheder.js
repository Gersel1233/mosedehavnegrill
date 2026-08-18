/* Fanen Nyheder. Se js/admin/kerne.js for de to principper
   der gælder i alle admin-filerne. */
(function () {
  'use strict';

  var $ = Admin.$;

  function tegnNyheder() {
    var boks = $('nyheder-liste');
    Admin.tøm(boks);

    var nyheder = (Admin.data.nyheder || []).slice().sort(function (a, b) { return a.dato < b.dato ? 1 : -1; });
    if (!nyheder.length) {
      boks.appendChild(Admin.lav('p', 'vare-tekst', 'Ingen nyheder lagt ind.'));
      return;
    }

    nyheder.forEach(function (n) {
      var r = Admin.lav('div', 'admin-raekke');
      var v = Admin.lav('div');
      v.style.flex = '1 1 14rem';
      v.appendChild(Admin.lav('div', 'nyhed-dato', Admin.pænDato(n.dato)));
      v.appendChild(Admin.lav('div', 'vare-navn', n.titel));
      v.appendChild(Admin.lav('div', 'vare-tekst', n.tekst));
      r.appendChild(v);

      var slet = Admin.lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!window.confirm('Slet nyheden "' + n.titel + '"?')) return;
        Admin.gem(Butik.skrive.sletNyhed(n.id), 'Nyheden er slettet.');
      });
      r.appendChild(slet);
      boks.appendChild(r);
    });
  }

  $('tilfoej-nyhed').addEventListener('click', function () {
    var f = Butik.tjek.navn($('ny-titel').value, 'overskrift', 120)
         || Butik.tjek.navn($('ny-tekst').value, 'tekst', 2000);
    if (f) return Admin.brøl(f);

    Admin.gem(Butik.skrive.nyhed({
      titel: $('ny-titel').value,
      tekst: $('ny-tekst').value,
      dato: Butik.nu().dato,
    }), 'Nyheden er på siden.').then(function () {
      $('ny-titel').value = ''; $('ny-tekst').value = '';
    });
  });

  Admin.tegnere.push(tegnNyheder);
})();
