/* Mosede /ny/ frokostordning: "Levering eller afhentning?" der tænker med.
   · Leveres den: adressen tjekkes, mens den skrives — postnummeret slås op i
     forretningens eget leveringsområde (indstillinger.leverings_postnr via
     MosedeRegler.leveringSvar, den samme regel som bestillingen bruger).
   · Hentes den: hvor lugen er, og et link til vejen derhen.
   forespoergsel.js er urørt: den læser stadig bare, hvilken knap der er valgt. */
(function () {
  'use strict';
  var seg = document.querySelector('[data-toggles="#fadrfelt"]');
  var felt = document.getElementById('fadrfelt');
  var adr = document.getElementById('fadr');
  var tjek = document.getElementById('nyLevTjek');
  var hent = document.getElementById('nyHent');
  if (!seg || !felt || !adr || !tjek || !hent) return;

  var BY = { 2635: 'Ishøj', 2670: 'Greve', 2680: 'Solrød Strand', 2690: 'Karlslunde',
    4000: 'Roskilde', 4030: 'Tune', 4600: 'Køge', 4623: 'Lille Skensved' };

  function data() { return window.nyData || null; }
  function område() {
    var d = data();
    return d && d.indstillinger ? String(d.indstillinger.leverings_omraade || '').trim() : '';
  }

  function vis(tekst, slags) {
    tjek.textContent = tekst;
    tjek.className = 'ny-levtjek' + (slags ? ' ny-levtjek--' + slags : '');
    tjek.hidden = !tekst;
  }

  function tjekAdresse() {
    var d = data();
    var t = adr.value.trim();
    if (!d || !window.MosedeRegler || typeof MosedeRegler.leveringSvar !== 'function') { vis('', ''); return; }
    if (!t) {
      var omr = område();
      vis(omr ? 'Vi kører fast til ' + omr + '. Skriv adressen, så ser vi med det samme, om I ligger på ruten.' : '', '');
      return;
    }
    var svar = MosedeRegler.leveringSvar(d, t);
    var m = t.match(/\b(\d{4})\b/);
    var nr = m ? Number(m[1]) : null;
    var navn = nr && BY[nr] ? ' ' + BY[nr] : '';
    if (svar === 'ja') vis(nr + navn + ' ligger på vores rute. Vi aftaler tidspunktet, når vi ringer.', 'ja');
    else if (svar === 'spoerg') vis(nr + navn + ' ligger uden for vores faste område. Længere ude kører vi efter aftale, så vi ringer om det.', 'spoerg');
    else vis(t.length > 5 ? 'Skriv postnummeret med, så kan vi se, om vi kører derud.' : '', '');
  }

  function opdater() {
    var leveres = !felt.hidden;
    hent.hidden = leveres;
    if (leveres) tjekAdresse();
  }

  adr.addEventListener('input', tjekAdresse);
  seg.addEventListener('click', function () { setTimeout(opdater, 0); });
  document.addEventListener('ny-data', opdater);
  opdater();
})();
