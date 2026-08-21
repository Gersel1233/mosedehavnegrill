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
const QR = require('qrcode');
const fs = require('fs');

const BUND = 'https://gersel1233.github.io/mosedehavnegrill/';
const MÅL = [
  ['bestil', BUND + 'bestil/'],
  ['menu', BUND + 'menu.html'],
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
