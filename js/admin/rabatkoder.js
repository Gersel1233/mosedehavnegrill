/* ============================================================
   AFTALER OG RABATKODER  (28/10)
   ------------------------------------------------------------
   Mikkel: *"hvad hvis man vil lave nogle priser om derinde [i
   smørrebrød ud af huset] … så dem, der har lavet en ordning,
   fik lidt rabat — det er jo fair — men det kan man ikke
   administrere, men det skal man"*. Hans valg: en rabatkode.

   Kortet står på Bestillinger. En kode har en aftale (hvem), en
   kode (det, gæsten skriver) og en procent. Den kan slukkes og
   tændes igen — en aftale, der holder pause, skal ikke skrives
   ind forfra — og slettes.

   ⚠️ KODERNE ER HEMMELIGE. De hentes kun her, af personalet
   (Butik.hentRabatkoder); gæsten kan kun spørge om sin egen.
   Er supabase/rabatkoder-28-10.sql ikke kørt, siger kortet det.
   ============================================================ */
(function () {
  'use strict';

  var $ = Admin.$;
  var lav = Admin.lav;

  function tegn(liste) {
    var boks = $('rabat-liste');
    if (!boks) return;
    Admin.tøm(boks);
    if (!liste.length) {
      boks.appendChild(lav('p', 'hjaelp tom-linje', 'Ingen aftaler endnu. Lav den første herunder.'));
      return;
    }
    liste.forEach(function (r) {
      var raekke = lav('div', 'rabat-raekke-admin' + (r.aktiv === false ? ' slukket' : ''));
      raekke.setAttribute('data-rabat', r.kode);
      var tekst = lav('div', 'rabat-tekst');
      tekst.appendChild(lav('strong', null, r.navn));
      tekst.appendChild(lav('span', 'rabat-kode-maerke', r.kode));
      tekst.appendChild(lav('span', 'rabat-procent', r.procent + ' %' + (r.aktiv === false ? ' · slukket' : '')));
      raekke.appendChild(tekst);

      var knapper = lav('div', 'rabat-knapper');
      var skift = lav('button', 'knap lille sekundaer', r.aktiv === false ? 'Tænd' : 'Sluk');
      skift.type = 'button';
      skift.setAttribute('aria-label', (r.aktiv === false ? 'Tænd' : 'Sluk') + ' koden ' + r.kode);
      skift.addEventListener('click', function () {
        Admin.gem(Butik.skrive.rabatkode(Object.assign({}, r, { aktiv: r.aktiv === false })),
          r.aktiv === false ? r.kode + ' virker igen.' : r.kode + ' er slukket.').then(hent);
      });
      var slet = lav('button', 'knap lille fare', 'Slet');
      slet.type = 'button';
      slet.setAttribute('aria-label', 'Slet koden ' + r.kode);
      slet.addEventListener('click', function () {
        if (!window.confirm('Slet koden ' + r.kode + ' (' + r.navn + ')? Bestillinger, der allerede har fået rabatten, beholder den.')) return;
        Admin.gem(Butik.skrive.sletRabatkode(r.id), r.kode + ' er slettet.').then(hent);
      });
      knapper.appendChild(skift);
      knapper.appendChild(slet);
      raekke.appendChild(knapper);
      boks.appendChild(raekke);
    });
  }

  function hent() {
    if (!Butik.hentRabatkoder) return Promise.resolve();
    return Butik.hentRabatkoder().then(function (l) { tegn(l || []); return l || []; }).catch(function (e) {
      var boks = $('rabat-liste');
      if (!boks) return;
      Admin.tøm(boks);
      boks.appendChild(lav('p', 'fejl', /rabatkoder|42P01|PGRST2/.test(String(e && e.message))
        ? 'Rabatkoderne er ikke sat op endnu. Sig til Lesreg: supabase/rabatkoder-28-10.sql skal køres.'
        : (Admin.forklarFejl ? Admin.forklarFejl(e) : String(e && e.message || e))));
    });
  }

  if ($('rabat-tilfoej')) {
    $('rabat-tilfoej').addEventListener('click', function () {
      var r = {
        navn: ($('rabat-navn') || {}).value,
        kode: ($('rabat-kode') || {}).value,
        procent: ($('rabat-procent') || {}).value,
        aktiv: true,
      };
      Admin.gem(Butik.skrive.rabatkode(r),
        'Koden ' + String(r.kode || '').trim().toUpperCase() + ' er lavet. Giv den til ' + String(r.navn || '').trim() + '.')
        .then(hent)
        .then(function (liste) {
          /* Felterne tømmes kun, når koden faktisk står på listen —
             afviste databasen den, skal det skrevne blive stående. */
          var k = String(r.kode || '').replace(/\s+/g, '').toUpperCase();
          if ((liste || []).some(function (x) { return x.kode === k; })) {
            ['rabat-navn', 'rabat-kode', 'rabat-procent'].forEach(function (id) { if ($(id)) $(id).value = ''; });
          }
        });
    });
  }

  Admin.hentVedFane('p-bestillinger', hent);
}());
