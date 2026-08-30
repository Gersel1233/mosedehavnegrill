/* Tegner de to FASTE QR-koder — til bestil/ og menukortet — med
   husets egen motor (js/qr.js) i stedet for npm-pakken.

   Hvorfor ikke lav-qr.js? Den kræver `npm install qrcode`, og
   pakken er ikke installeret her. Vigtigere: js/qr.js ER motoren,
   der tegner bordenes 55 koder i browseren, og den er målt tern
   for tern mod npm-pakkens facitliste i tests/facit/qr-facit.json.
   To motorer til det samme er en kommende forskel; den ene skal
   bruges begge steder.

   ⚠️ EN QR-KODE, DER ER EN SMULE FORKERT, SER RIGTIG UD. Derfor
   afkodes begge koder til sidst med en rigtig scanner-rutine, og
   scriptet skriver den tekst, den LÆSTE ud af billedet — ikke den,
   den skrev ind.

   Kør:  node vaerktoej/lav-qr-husets.js
*/
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');
const BUND = 'https://mosedehavnecafe.dk/';
const KODER = [
  ['bestil', BUND + 'bestil/'],
  /* ⚠️ DIREKTE til m-menukort.html: menu.html er en vejviser
     siden 30/8, og en kode, der lander på en omdirigering, koster
     gæsten et hop på et dårligt signal nede ved vandet. */
  ['menu', BUND + 'm-menukort.html'],
];

(async () => {
  const motor = fs.readFileSync(path.join(ROD, 'js/qr.js'), 'utf8');
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await (await b.newContext()).newPage();
  await p.setContent('<body></body>');
  await p.addScriptTag({ content: motor });

  for (const [navn, url] of KODER) {
    const svg = await p.evaluate(([u, n]) => window.MosedeQR.svg(u, {
      niveau: 'H',
      /* Husets mørke, ikke den gamle marineblå: de to filer stod
         med #0f2c44 fra før paletten skiftede 29/8. */
      moerk: '#241a17',
      beskrivelse: n === 'bestil'
        ? 'QR-kode til bestillingssiden' : 'QR-kode til menukortet',
    }), [url, navn]);
    fs.writeFileSync(path.join(ROD, 'print', 'qr-' + navn + '.svg'), svg + '\n');
    console.log('skrev print/qr-' + navn + '.svg  →  ' + url);
  }
  await b.close();
})();
