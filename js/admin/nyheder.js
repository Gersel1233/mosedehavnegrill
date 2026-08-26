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

      /* STÅR DEN PÅ SIDEN LIGE NU? Uden det ord skal ejeren åbne
         hjemmesiden for at finde ud af, om nyheden virker — og
         "hvorfor kan jeg ikke se den?" er så et opkald.
         Butik.nyhedStatus er den samme regel, som gæstesiden
         filtrerer efter. */
      v.appendChild(statusMaerke(n));
      r.appendChild(v);

      /* Vinduet kan rettes bagefter. En nyhed, der er sat til at
         slutte i går, skal kunne få en uge mere uden at blive
         skrevet igen. */
      r.appendChild(vinduesFelter(n));

      /* SKJUL ER IKKE SLET. En nyhed om J-dag skal af siden i
         september og PÅ igen i november — slettes den, skal
         nogen skrive den forfra og finde billedet igen. Kolonnen
         aktiv har ligget i databasen siden setup.sql; det var
         KNAPPEN, der manglede, og uden den var "Slet" den eneste
         måde at få en nyhed væk på. */
      var skjul = Admin.lav('button', 'knap',
        n.aktiv === false ? 'Vis igen' : 'Skjul');
      skjul.type = 'button';
      skjul.addEventListener('click', function () {
        Admin.gem(Butik.skrive.nyhed({
          id: n.id, titel: n.titel, tekst: n.tekst, dato: n.dato,
          aktiv: n.aktiv === false, vis_fra: n.vis_fra, vis_til: n.vis_til,
        }), n.aktiv === false
          ? 'Nyheden er på siden igen.'
          : 'Nyheden er skjult. Den ligger her, til I viser den igen.');
      });
      r.appendChild(skjul);

      var slet = Admin.lav('button', 'knap fare', 'Slet');
      slet.addEventListener('click', function () {
        if (!window.confirm('Slet nyheden "' + n.titel + '"?\n\n'
          + 'Skal den bare af siden for en tid, så brug Skjul i stedet.')) return;
        Admin.gem(Butik.skrive.sletNyhed(n.id), 'Nyheden er slettet.');
      });
      r.appendChild(slet);
      boks.appendChild(r);
    });
  }

  var STATUS = {
    vises:    { tekst: 'Vises nu', klasse: 'favorit' },
    venter:   { tekst: 'Venter', klasse: 'udsolgt' },
    udloebet: { tekst: 'Udløbet', klasse: 'udsolgt' },
    /* Ordet følger knappen: den hedder Skjul, så tilstanden
       hedder Skjult — ikke "slukket", som ingen knap siger. */
    slukket:  { tekst: 'Skjult', klasse: 'udsolgt' },
  };

  function statusMaerke(n) {
    var s = Butik.nyhedStatus(n);
    var m = STATUS[s] || STATUS.slukket;
    var boks = Admin.lav('div', 'nyhed-status');
    boks.appendChild(Admin.lav('span', 'maerke ' + m.klasse, m.tekst));
    if (s === 'venter') {
      boks.appendChild(Admin.lav('span', 'hjaelp', 'fra ' + Admin.pænDato(n.vis_fra)));
    } else if (s === 'udloebet') {
      boks.appendChild(Admin.lav('span', 'hjaelp', 'sluttede ' + Admin.pænDato(n.vis_til)));
    } else if (n.vis_til) {
      boks.appendChild(Admin.lav('span', 'hjaelp', 'til og med ' + Admin.pænDato(n.vis_til)));
    }
    return boks;
  }

  function vinduesFelter(n) {
    var boks = Admin.lav('div', 'nyhed-vindue');
    var felter = {};

    [['vis_fra', 'Fra'], ['vis_til', 'Til og med']].forEach(function (p) {
      var f = document.createElement('input');
      f.type = 'date';
      f.className = 'smal-dato';
      f.value = n[p[0]] || '';
      f.setAttribute('aria-label', p[1] + ' — ' + n.titel);
      f.title = p[1];
      felter[p[0]] = f;
      boks.appendChild(f);
    });

    var gem = Admin.lav('button', 'knap lille', 'Gem datoer');
    gem.type = 'button';
    gem.addEventListener('click', function () {
      var fra = felter.vis_fra.value;
      var til = felter.vis_til.value;
      // Samme regel som nyhed_vindue_ok i databasen. En nyhed, der
      // slutter før den begynder, er ikke farlig — den er bare
      // usynlig, og så leder nogen efter en fejl i koden.
      if (fra && til && til < fra) {
        return Admin.brøl('Slutdatoen ligger før startdatoen.');
      }
      Admin.gem(Butik.skrive.nyhed({
        id: n.id, titel: n.titel, tekst: n.tekst, dato: n.dato,
        aktiv: n.aktiv, vis_fra: fra, vis_til: til,
      }), 'Datoerne er gemt.');
    });
    boks.appendChild(gem);
    return boks;
  }

  $('tilfoej-nyhed').addEventListener('click', function () {
    var f = Butik.tjek.navn($('ny-titel').value, 'overskrift', 120)
         || Butik.tjek.navn($('ny-tekst').value, 'tekst', 2000);
    if (f) return Admin.brøl(f);

    var fra = $('ny-fra').value;
    var til = $('ny-til').value;
    if (fra && til && til < fra) {
      return Admin.brøl('Slutdatoen ligger før startdatoen.');
    }

    Admin.gem(Butik.skrive.nyhed({
      titel: $('ny-titel').value,
      tekst: $('ny-tekst').value,
      dato: Butik.nu().dato,
      vis_fra: fra,
      vis_til: til,
    }), til ? 'Nyheden er på siden til og med ' + Admin.pænDato(til) + '.'
            : 'Nyheden er på siden.').then(function () {
      ['ny-titel', 'ny-tekst', 'ny-fra', 'ny-til'].forEach(function (id) {
        $(id).value = '';
      });
    });
  });

  Admin.tegnere.push(tegnNyheder);
})();
