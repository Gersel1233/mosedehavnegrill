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

  /* ---- NØGLEN ------------------------------------------------
     32 tegn og seks lange = 1,07 mia. muligheder. Det er ikke et
     kodeord, ingen skal huske det — men det skal kunne skrives af
     med øjnene fra et kradset skilt, og derfor er 0/O og 1/I/L
     ude: det er dem, folk taster forkert.

     ⚠️ crypto.getRandomValues og IKKE Math.random. Math.random er
     forudsigelig — kender man én nøgle og hvornår den blev lavet,
     kan de næste regnes ud, og så var hele øvelsen spildt.
     256 går op i 32, så modulo giver ingen skævhed. */
  var TEGN = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  function nyNøgle() {
    var ud = '';
    var byte = new Uint8Array(6);
    window.crypto.getRandomValues(byte);
    for (var i = 0; i < 6; i++) ud += TEGN.charAt(byte[i] % 32);
    return ud;
  }

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

    /* NØGLENS TILSTAND PÅ RÆKKEN — et ord, ikke koden selv.
       Koden står på skiltet; her er spørgsmålet kun, OM bordet er
       låst. Skrev vi den ud i listen, ville et skærmbillede af
       admin-fanen være 55 gyldige adresser. */
    var laasT = Admin.lav('span', 'noegle-maerke ' + (b.kode ? 'laast' : 'aaben'),
      b.kode ? '🔒 Låst' : '🔓 Åben');
    laasT.title = b.kode
      ? 'Skiltet på bordet skal have den her nøgle i sig.'
      : 'Nummeret alene er nok — enhver, der kender adressen, kan bestille hertil.';
    r.appendChild(laasT);

    /* ⚠️ EN NY NØGLE DRÆBER DET SKILT, DER SIDDER PÅ BORDET.
       Det er hele pointen — det er sådan, man lukker for en, der
       har gemt adressen — men det er også grunden til, at den
       spørger først og siger, hvad der så skal ske. */
    var nyKode = Admin.lav('button', 'knap lille', b.kode ? 'Ny nøgle' : 'Lås bordet');
    nyKode.type = 'button';
    nyKode.addEventListener('click', function () {
      var spg = b.kode
        ? 'Giv bord ' + b.nummer + ' en ny nøgle?\n\n'
          + 'Det skilt, der sidder på bordet nu, holder op med at virke '
          + 'med det samme. Du skal printe et nyt.'
        : 'Lås bord ' + b.nummer + '?\n\n'
          + 'Bordet kan derefter kun bestille, hvis QR-koden er scannet. '
          + 'Du skal printe et nyt skilt til det.';
      if (!window.confirm(spg)) return;
      gem('Bord ' + b.nummer + ' har fået en ny nøgle. Print skiltet om.', nyNøgle());
    });
    r.appendChild(nyKode);

    function gem(besked, kode) {
      var tal = pladser.value === '' ? null : Number(pladser.value);
      Admin.gem(Butik.skrive.bord({
        id: b.id,
        nummer: navn.value,
        pladser: tal,
        placering: hvor.value,
        zone: zone.value,
        aktiv: hak.checked,
        sortering: b.sortering,
        /* ⚠️ KUN NÅR NOGEN HAR RØRT DEN. Sendte vi den ubetinget,
           ville et skift af zonen tømme nøglen på et bord, ejeren
           lige havde låst — skiltet ville stadig virke, og der
           ville ikke stå noget nogen steder. store-skriv.js
           springer feltet over, når det er undefined. */
        kode: kode === undefined ? undefined : kode,
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

  /* ---- KORTET "QR-KODERNE" ----------------------------------
     Det siger, hvor mange borde der er låst — og hvad det
     betyder, at de andre ikke er. Teksten skifter, fordi de to
     tilstande kræver hver sit af ejeren. */
  function tegnNøglekort() {
    var status = $('noegle-status');
    var tekst = $('noegle-tekst');
    var knap = $('laas-koder');
    if (!status || !tekst || !knap) return;

    var laaste = borde.filter(function (b) { return !!b.kode; }).length;
    var aabne = borde.length - laaste;

    status.textContent = borde.length
      ? laaste + ' af ' + borde.length + ' er låst'
      : 'ingen borde endnu';

    if (!borde.length) {
      tekst.textContent = 'Opret bordene først, så kan koderne låses.';
      knap.disabled = true;
      return;
    }
    knap.disabled = false;

    if (!aabne) {
      tekst.textContent = 'Alle bordene kræver, at QR-koden er scannet. '
        + 'Adressen alene kan ikke bruges til at bestille. Har du printet '
        + 'skiltene, EFTER du låste dem?';
      knap.textContent = 'Alle er låst';
      knap.disabled = true;
      return;
    }

    knap.textContent = 'Lås ' + aabne + (aabne === 1 ? ' bord' : ' borde');
    tekst.textContent = aabne + (aabne === 1 ? ' bord tager' : ' borde tager')
      + ' stadig imod på nummeret alene: enhver, der kender adressen, kan '
      + 'bestille dertil hjemmefra. Låser du dem, skal QR-koden scannes — '
      + 'og så skal skiltene printes om, før bordene kan bruges.';
  }

  function laasAlle() {
    var mangler = borde.filter(function (b) { return !b.kode; });
    if (!mangler.length) return;
    if (!window.confirm('Lås ' + mangler.length + ' borde?\n\n'
      + 'De skilte, der sidder på bordene nu, holder op med at virke '
      + 'med det samme. Du skal printe dem om, FØR gæsterne kan '
      + 'bestille fra bordene igen.\n\n'
      + 'Print dem her fra fanen, når du har trykket OK.')) return;

    var knap = $('laas-koder');
    if (knap) knap.disabled = true;

    /* ÉT BORD AD GANGEN, i rækkefølge — som serieoprettelsen.
       55 skrivninger på én gang rammer databasens bremse, og
       halvdelen ville blive afvist, uden at nogen kunne se
       hvilke. */
    mangler.reduce(function (p, b) {
      return p.then(function () {
        return Butik.skrive.bord({
          id: b.id, nummer: b.nummer, pladser: b.pladser,
          placering: b.placering, zone: b.zone, aktiv: b.aktiv,
          sortering: b.sortering, kode: nyNøgle(),
        });
      });
    }, Promise.resolve())
      .then(function () {
        Admin.kvitter(mangler.length + ' borde er låst. Print skiltene om nu.');
        return hent();
      })
      .catch(function (e) {
        Admin.brøl('Kunne ikke låse alle bordene: ' + (e.message || e)
          + ' — tryk igen, så tages resten.');
        return hent();
      })
      .then(function () { if (knap) knap.disabled = false; });
  }

  if ($('laas-koder')) $('laas-koder').addEventListener('click', laasAlle);

  function hent() {
    /* true = MED nøglen. Gæsten må ikke læse den (databasens
       kolonnerettigheder afviser det), men skiltene kan ikke
       printes uden. */
    return Butik.hentBorde(true).then(function (liste) {
      borde = liste || [];
      /* Meldes ind, fordi køkken-køen skal kunne skrive zonen på
         kortet: "Bord 7 · Terrassen" er en retning at gå i, når
         maden er klar. Listen hedder 'bordliste' og ikke 'borde' —
         DET navn er bordBESTILLINGERNE, og de to har kostet en
         runde før (se advarslen i CLAUDE.md om hentBorde). */
      Admin.meld('bordliste', borde);
      tegnBordkort();
      tegnNøglekort();
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

  // ----------------------------------------------------------
  //  MANGE BORDE PÅ ÉN GANG
  // ----------------------------------------------------------
  /* ⚠️ EJEREN HAR 55 BORDE (oplyst 28/8).

     Ét ad gangen er 55 gange navn + pladser + ude/inde + zone +
     Tilføj, og den, der taster nummer 40, taster forkert. Værre:
     en tastefejl her er en QR-kode, der peger på et bord, der
     ikke findes, og gæsten møder "bordet kendes ikke", mens hun
     sidder ved det.

     ⚠️ DEN SPRINGER DEM OVER, DER FINDES I FORVEJEN. En serie,
     der stoppede på det første sammenstød, ville efterlade
     halvdelen oprettet uden at sige hvilke — og så skal nogen
     tælle sig frem gennem 55 rækker. Springes de over, kan
     serien køres igen efter en udvidelse, og kun det nye kommer
     ind.

     ⚠️ OG DEN OPRETTER ÉT AD GANGEN, i rækkefølge. 55 skrivninger
     på én gang ville ramme databasens bremse, og halvdelen ville
     blive afvist uden at nogen kunne se hvilke. */
  function serieNavne() {
    var fra = Number($('serie-fra').value);
    var til = Number($('serie-til').value);
    var foran = String($('serie-foran') ? $('serie-foran').value : '').trim();

    if (!isFinite(fra) || !isFinite(til) || !$('serie-fra').value
      || !$('serie-til').value) {
      return 'Skriv både et fra- og et til-nummer.';
    }
    if (fra < 1 || til < 1 || fra > 999 || til > 999) {
      return 'Numrene skal være mellem 1 og 999.';
    }
    if (til < fra) return 'Til-nummeret ligger før fra-nummeret.';
    /* Et loft. 200 borde er ikke en cafe — det er en tastefejl,
       og 900 skrivninger tager fanen ned, mens nogen kigger. */
    if (til - fra + 1 > 200) return 'Højst 200 borde ad gangen.';

    var ud = [];
    for (var n = fra; n <= til; n++) ud.push(foran + n);
    return ud;
  }

  function sigSerie() {
    var note = $('serie-varsel');
    if (!note) return;
    var navne = serieNavne();
    if (typeof navne === 'string') { note.textContent = ''; return; }

    var nye = navne.filter(function (n) {
      return !borde.some(function (b) {
        return String(b.nummer).trim().toLowerCase() === n.toLowerCase();
      });
    });
    var findes = navne.length - nye.length;
    note.textContent = nye.length
      ? 'Opretter ' + nye.length + ' borde: ' + nye[0] + '–' + nye[nye.length - 1]
        + (findes ? ' · ' + findes + ' findes i forvejen og springes over.' : '.')
      : 'Alle ' + navne.length + ' findes i forvejen — der oprettes ingen.';
  }

  ['serie-fra', 'serie-til', 'serie-foran'].forEach(function (id) {
    if ($(id)) $(id).addEventListener('input', sigSerie);
  });

  if ($('opret-serie')) {
    $('opret-serie').addEventListener('click', function () {
      var navne = serieNavne();
      if (typeof navne === 'string') return Admin.brøl(navne);

      var nye = navne.filter(function (n) {
        return !borde.some(function (b) {
          return String(b.nummer).trim().toLowerCase() === n.toLowerCase();
        });
      });
      if (!nye.length) {
        return Admin.brøl('Alle bordene i serien findes i forvejen.');
      }

      if (!window.confirm('Opret ' + nye.length + ' borde (' + nye[0] + '–'
        + nye[nye.length - 1] + ')?\n\n'
        + 'Der skal printes et skilt til hvert af dem bagefter.')) return;

      var knap = $('opret-serie');
      knap.disabled = true;

      var pladser = $('serie-pladser').value;
      var sidst = borde.reduce(function (m, b) {
        return Math.max(m, Number(b.sortering) || 0);
      }, 0);

      var kaede = nye.reduce(function (p, navn, nr) {
        return p.then(function () {
          return Butik.skrive.bord({
            nummer: navn,
            pladser: pladser === '' ? null : Number(pladser),
            placering: $('serie-placering').value,
            zone: $('serie-zone') ? $('serie-zone').value : '',
            aktiv: true,
            sortering: sidst + (nr + 1) * 10,
          });
        });
      }, Promise.resolve());

      Admin.gem(kaede, nye.length + ' borde er oprettet. Print skiltene til dem.')
        .then(hent)
        .then(function () {
          ['serie-fra', 'serie-til', 'serie-pladser', 'serie-zone', 'serie-foran']
            .forEach(function (id) { if ($(id)) $(id).value = ''; });
          sigSerie();
        })
        .then(function () { knap.disabled = false; },
          function () { knap.disabled = false; });
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
