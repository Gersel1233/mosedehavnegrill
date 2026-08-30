/* ============================================================
   QR-KODER TIL BORDSKILTENE
   ------------------------------------------------------------
   Kør:  node vaerktoej/lav-qr.js
   (kræver: npm install qrcode — pakken er KUN et værktøj her,
    den indlæses aldrig af siden)

   Skriver print/qr-bestil.svg og print/qr-menu.svg, som
   print/bordskilte.html har indlejret. Har du lavet nye koder,
   skal de sættes ind i bordskilte.html igen.

   ⚠️  ADRESSEN ER BRÆNDT IND I TERNENE. Får forretningen sit
   eget domæne (det står på ejerens liste), skal koderne laves
   om og skiltene printes om — en QR-kode kan ikke opdateres
   ude på bordene.

   Fejlkorrektion H: et bordskilt får fedtfingre og kaffepletter,
   og H tåler at omkring en tredjedel af koden er dækket.
   ============================================================ */
const QR = require('qrcode');   // se noten i lav-qr-husets.js
const fs = require('fs');

/* ⚠️ ADRESSEN SKIFTEDE 30/8 til forretningens eget domaene.
   Et maerkat paa en vaeg kan ikke laves om, saa koderne skal
   tegnes om og skiltene printes forfra, hver gang den her linje
   aendrer sig. Bordenes egne koder er noget andet: de tegnes i
   browseren ud fra location.origin (print/bordkort.html), og
   dér er adressen et FELT, netop for ikke at kraeve en
   kodeaendring paa den her dag. */
const BUND = 'https://mosedehavnecafe.dk/';
const MÅL = [
  ['bestil', BUND + 'bestil/'],
  /* ⚠️ DIREKTE TIL m-menukort.html, IKKE via menu.html. Den gamle
     adresse er en vejviser siden 30/8, og en QR-kode, der lander
     paa en omdirigering, koster gaesten et ekstra hop paa et
     daarligt signal nede ved vandet — og holder kun, saa laenge
     vejviseren staar. */
  ['menu', BUND + 'm-menukort.html'],
];

(async () => {
  for (const [navn, url] of MÅL) {
    const svg = await QR.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      // Husets marineblå. En kode skal ikke være sort for at
      // virke, kun mørk nok mod bunden — og skiltet er husets.
      color: { dark: '#0f2c44', light: '#ffffff00' },
    });
    fs.writeFileSync('print/qr-' + navn + '.svg', svg);
    console.log('skrev print/qr-' + navn + '.svg  →  ' + url);
  }
})();
