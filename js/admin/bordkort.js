/* Bordene og deres QR-koder. Se js/admin/kerne.js for de to
   principper, der gælder i alle admin-filerne.

   ------------------------------------------------------------
   HVORFOR BORDENE ER DATA
   ------------------------------------------------------------
   Et bordnummer i koden ville betyde, at hver ommøblering på
   trædækket er en ændring, ejeren skal bede om — og en QR-kode
   kan ikke laves om, når den først er printet og ligger på et
   bord. Derfor oprettes bordene her, og skiltene tegnes af den
   samme liste.

   ------------------------------------------------------------
   LISTEN HENTES FOR SIG
   ------------------------------------------------------------
   Bordene står ikke i Butik.hent(): forsiden, menukortet og de
   andre sider har ikke brug for dem. De hentes, når fanen åbnes
   (Admin.hentVedFane) — og ikke hvert minut som bestillingerne.
   Et bord ændrer sig ikke af sig selv; det gør kun, når nogen
   her på siden gør noget.
*/
(function () {
  'use strict';

  var $ = Admin.$;
  var borde = [];

  function tegnBordkort() {
    var boks = $('bordkort-liste');
    if (!boks) return;

    if (!borde.length) {
      Admin.tegnRaekker(boks, [{
        noegle: 'tom', aftryk: 'tom',
        byg: function () {
          return Admin.lav('p', 'vare-tekst',
            'Der er ingen borde endnu. Opret dem herover — så virker '
            + 'QR-koderne, og ikke før.');
        },
      }]);
      return;
    }

    Admin.tegnRaekker(boks, borde.map(function (b) {
      return {
        noegle: 'bord-' + b.id,
        aftryk: JSON.stringify(b),
        byg: function () { return bordRaekke(b); },
      };
    }));
  }

  function bordRaekke(b) {
    var r = Admin.lav('div', 'admin-raekke');
    /* data-bord, fordi navnet står i et <input>: Playwrights
       hasText kan ikke se en feltværdi. Samme regel som
       menukortets rækker — se noten i CLAUDE.md. */
    r.setAttribute('data-bord', b.nummer);
    if (b.aktiv === false) r.classList.add('slukket');

    var navn = document.createElement('input');
    navn.type = 'text';
    navn.value = b.nummer;
    navn.maxLength = 40;
    navn.className = 'navn';
    navn.setAttribute('aria-label', 'Bordets nummer eller navn');
    r.appendChild(navn);

    var pladser = document.createElement('input');
    pladser.type = 'number';
    pladser.min = '1';
    pladser.max = '50';
    pladser.value = b.pladser === null || b.pladser === undefined ? '' : b.pladser;
    pladser.className = 'smal';
    pladser.placeholder = 'pladser';
    pladser.setAttribute('aria-label', 'Antal pladser ved bordet');
    r.appendChild(pladser);

    var hvor = document.createElement('select');
    [['ude', 'Ude'], ['inde', 'Inde']].forEach(function (v) {
      var o = document.createElement('option');
      o.value = v[0];
      o.textContent = v[1];
      hvor.appendChild(o);
    });
    hvor.value = b.placering === 'inde' ? 'inde' : 'ude';
    hvor.className = 'smal-vaelger';
    hvor.setAttribute('aria-label', 'Ude eller inde');
    r.appendChild(hvor);

    /* ZONEN — briefens "Terrassen / Molen / Inde". Den er FRI
       TEKST og ikke en liste: havnen hedder det, den hedder, og
       en liste med tre navne ville betyde en kodeændring den dag,
       der kom et fjerde hjørne. Den er noget ANDET end ude/inde
       ovenfor: den siger, hvor bordet står, ikke om det står i
       vejret. Tom er i orden — de fleste steder har kun ét
       hjørne. */
    var zone = document.createElement('input');
    zone.type = 'text';
    zone.value = b.zone || '';
    zone.maxLength = 40;
    zone.className = 'zone';
    zone.placeholder = 'zone (valgfri)';
    zone.setAttribute('aria-label', 'Zone — hvor på havnen bordet står');
    r.appendChild(zone);

    /* TÆNDT ELLER SLUKKET, og ikke slettet. Et bord, der er væk
       for en sæson, skal kunne komme tilbage uden at der skal
       printes nye skilte: mærkatet bærer nummeret, og nummeret
       skal være det samme, når bordet stilles ud igen. */
    var hak = document.createElement('input');
    hak.type = 'checkbox';
    hak.checked = b.aktiv !== false;
    var taendt = Admin.lav('label', 'afkryds');
    taendt.appendChild(hak);
    taendt.appendChild(document.createTextNode('Tager imod'));
    r.appendChild(taendt);

    function gem(besked) {
      var tal = pladser.value === '' ? null : Number(pladser.value);
      Admin.gem(Butik.skrive.bord({
        id: b.id,
        nummer: navn.value,
        pladser: tal,
        placering: hvor.value,
        zone: zone.value,
        aktiv: hak.checked,
        sortering: b.sortering,
      }), besked).then(hent);
    }

    navn.addEventListener('change', function () {
      var f = Butik.tjek.navn(navn.value, 'bordets nummer', 40);
      if (f) { navn.value = b.nummer; return Admin.brøl(f); }
      gem('Bordet hedder "' + navn.value.trim() + '" nu. '
        + 'Husk at printe et nyt skilt til det.');
    });
    pladser.addEventListener('change', function () { gem('Pladserne er gemt.'); });
    hvor.addEventListener('change', function () { gem('Bordet er flyttet.'); });
    zone.addEventListener('change', function () {
      gem(zone.value.trim()
        ? 'Bord ' + b.nummer + ' står i "' + zone.value.trim() + '" nu.'
        : 'Zonen er fjernet fra bord ' + b.nummer + '.');
    });
    hak.addEventListener('change', function () {
      gem(hak.checked
        ? 'Bord ' + b.nummer + ' tager imod bestillinger igen.'
        : 'Bord ' + b.nummer + ' tager ikke imod lige nu. Mærkatet på '
          + 'bordet virker ikke, før du tænder det igen.');
    });

    var slet = Admin.lav('button', 'knap fare', 'Slet');
    slet.addEventListener('click', function () {
      if (!window.confirm('Slet bord "' + b.nummer + '"?\n\n'
        + 'Mærkatet på bordet holder op med at virke. De bestillinger, '
        + 'der allerede er kommet fra bordet, står stadig i listerne.')) return;
      Admin.gem(Butik.skrive.sletBord(b.id), 'Bordet er slettet.').then(hent);
    });
    r.appendChild(slet);

    return r;
  }

  function hent() {
    return Butik.hentBorde().then(function (liste) {
      borde = liste || [];
      /* Meldes ind, fordi køkken-køen skal kunne skrive zonen på
         kortet: "Bord 7 · Terrassen" er en retning at gå i, når
         maden er klar. Listen hedder 'bordliste' og ikke 'borde' —
         DET navn er bordBESTILLINGERNE, og de to har kostet en
         runde før (se advarslen i CLAUDE.md om hentBorde). */
      Admin.meld('bordliste', borde);
      tegnBordkort();
    }).catch(function (e) {
      Admin.brøl('Bordene kunne ikke hentes: ' + (e.message || e));
    });
  }

  var tilfoej = $('tilfoej-bord');
  if (tilfoej) {
    tilfoej.addEventListener('click', function () {
      var nummer = $('nyt-bord-nummer').value;
      var f = Butik.tjek.navn(nummer, 'bordets nummer', 40);
      if (f) return Admin.brøl(f);

      /* Den unikke nøgle i databasen ville også fange den her,
         men fejlen derfra hedder "duplicate key value violates
         unique constraint borde_nummer_unikt". Personalet skal
         læse en sætning, ikke et indeksnavn. */
      var findes = borde.some(function (b) {
        return String(b.nummer).trim().toLowerCase() === nummer.trim().toLowerCase();
      });
      if (findes) return Admin.brøl('Der er allerede et bord, der hedder "'
        + nummer.trim() + '". To borde med samme navn ville betyde to '
        + 'mærkater, der peger samme sted hen.');

      var pladser = $('nyt-bord-pladser').value;
      /* Nye borde lægger sig bagerst. Rækkefølgen er kun til for
         skiltene og listen her — den siger ingenting om, hvor
         bordene står. */
      var sidst = borde.reduce(function (m, b) {
        return Math.max(m, Number(b.sortering) || 0);
      }, 0);

      Admin.gem(Butik.skrive.bord({
        nummer: nummer,
        pladser: pladser === '' ? null : Number(pladser),
        placering: $('nyt-bord-placering').value,
        zone: $('nyt-bord-zone') ? $('nyt-bord-zone').value : '',
        aktiv: true,
        sortering: sidst + 10,
      }), 'Bordet er oprettet. Print et skilt til det.').then(function () {
        $('nyt-bord-nummer').value = '';
        $('nyt-bord-pladser').value = '';
        if ($('nyt-bord-zone')) $('nyt-bord-zone').value = '';
        return hent();
      });
    });
  }

  Admin.hentVedFane('p-borde', hent);

  /* Og én gang ved login. Fanen henter selv, når den åbnes — men
     køkken-køen skal kunne skrive zonen på kortene UDEN at nogen
     først har været omkring Borde-fanen. En zone, der kun står
     der halvdelen af tiden, læses som en fejl i noget, der
     virker. Det er ét lille bord med en håndfuld rækker. */
  Admin.vedLogin.push(hent);
})();
