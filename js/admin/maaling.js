/* ============================================================
   MÅLINGER OG COOKIES  (4/11 2026)
   ------------------------------------------------------------
   Kortet under Indstillinger. Koderne gemmes som indstillingerne
   maaling_ga4, maaling_gtm og maaling_meta; js/samtykke.js læser
   dem på gæstesiderne. Tomt felt = det værktøj er slået fra.

   ⚠️ EN FORKERT KODE AFVISES HER. js/samtykke.js springer en kode
   over, der ikke ligner en rigtig — men så ville ejeren tro, at der
   måles, og der måles ikke. Bedre at sige det, mens han skriver.
   ============================================================ */
(function () {
  'use strict';
  var $ = Admin.$;
  if (!$('maaling-kort')) return;

  var FELTER = [
    { id: 'maal-ga4', noegle: 'maaling_ga4', navn: 'Google Analytics', re: /^G-[A-Z0-9]{4,15}$/, eks: 'G-ABC123XYZ9' },
    { id: 'maal-gtm', noegle: 'maaling_gtm', navn: 'Google Tag Manager', re: /^GTM-[A-Z0-9]{4,12}$/, eks: 'GTM-ABC1234' },
    { id: 'maal-meta', noegle: 'maaling_meta', navn: 'Meta Pixel', re: /^[0-9]{10,20}$/, eks: '1234567890123456' },
  ];

  function tegn() {
    var i = (Admin.data && Admin.data.indstillinger) || {};
    FELTER.forEach(function (f) {
      var el = $(f.id);
      if (!el || document.activeElement === el) return;
      el.value = i[f.noegle] ? String(i[f.noegle]) : '';
    });
    var til = FELTER.filter(function (f) { return f.re.test(String(i[f.noegle] || '')); });
    $('maal-status').textContent = til.length
      ? '✓ Slået til: ' + til.map(function (f) { return f.navn; }).join(', ')
        + '. Gæsterne bliver spurgt med et cookie-banner, før der måles.'
      : 'Ingen målinger. Hjemmesiden sætter ingen cookies og viser intet banner.';
  }

  function saml() {
    var par = [];
    for (var n = 0; n < FELTER.length; n++) {
      var f = FELTER[n];
      var v = $(f.id).value.replace(/\s+/g, '').toUpperCase();
      if (v && !f.re.test(v)) return f.navn + ': koden ser ikke rigtig ud. Den skal ligne ' + f.eks + '.';
      par.push([f.noegle, v]);
    }
    return par.reduce(function (kaede, p) {
      return kaede.then(function () { return Butik.skrive.indstilling(p[0], p[1]); });
    }, Promise.resolve());
  }

  $('gem-maaling').addEventListener('click', function () {
    var svar = saml();
    if (typeof svar === 'string') return Admin.brøl(svar);
    Admin.gem(svar, 'Målingerne er gemt.');
  });

  Admin.tegnere.push(tegn);
}());
