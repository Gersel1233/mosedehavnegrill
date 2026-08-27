/* ============================================================
   FACITLISTEN TIL QR-MOTOREN

   node vaerktoej/lav-qr-facit.js   →  tests/facit/qr-facit.json

   ------------------------------------------------------------
   HVORFOR DEN HER FIL FINDES
   ------------------------------------------------------------
   tests/qr.spec.js måler js/qr.js tern for tern mod npm-pakken
   "qrcode". Det ENE tal, der skal komme udefra, er facitlistens
   — ellers måler prøven motoren mod sig selv.

   ⚠️ FACITLISTEN BLEV RETTET I HÅNDEN ÉN GANG, OG DET GIK GALT.
   Da forretningen skiftede navn til Mosede Havnecafe (27/8), gik
   en søg-og-erstat gennem 44 filer — også gennem facitlistens
   TEKST. Men ternene blev stående: de var regnet ud for den
   længere tekst "Bord 7 · Mosede Havnegrill og Ishus", som
   fylder en større kode (29 tern mod 25).

   Prøven fangede det ("25 tern bred, facit siger 29"), men først
   ved næste fulde kørsel. Havde uheldet gået den anden vej —
   samme bredde, andet indhold — var det sluppet igennem.

   En facitliste, der kan redigeres, er ikke en facitliste.
   Derfor står sagerne HER som ren tekst, og filen regner resten.
   Skal der en sag til, eller skal en tekst ændres: ret listen
   nedenfor og kør filen igen. Rør ALDRIG JSON-filen.
   ------------------------------------------------------------ */

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

/* Sagerne. Rækkefølgen er ligegyldig for prøven, men holdes
   stabil, så en genkørsel giver den mindst mulige diff. */
const ROD = 'https://gersel1233.github.io/mosedehavnegrill/ved-bordet/?bord=';
const SAGER = [
  // De almindelige: et bord med et tal, og et med et navn.
  { tekst: ROD + '1', niveau: 'H' },
  { tekst: ROD + '7', niveau: 'H' },
  { tekst: ROD + 'Terrassen%202', niveau: 'H' },
  { tekst: ROD + '12', niveau: 'M' },
  // Med eget domæne — den dag det kommer, bliver koderne kortere.
  { tekst: 'https://mosedehavnegrill.dk/ved-bordet/?bord=3', niveau: 'Q' },
  /* ⚠️ DEN HER BÆRER FORRETNINGENS NAVN. Skifter navnet igen,
     SKAL filen her køres om — teksten alene i JSON-filen er
     ikke nok. Se noten øverst. */
  { tekst: 'Bord 7 · Mosede Havnecafe', niveau: 'L' },
  // Yderpunkterne: det korteste og noget langt.
  { tekst: 'A', niveau: 'H' },
  { tekst: 'x'.repeat(120), niveau: 'H' },
];

/* ⚠️ BYTE-TILSTAND SKAL TVINGES, ELLERS SAMMENLIGNER VI TO
   FORSKELLIGE TING.

   js/qr.js kan ÉN tilstand: byte. npm-pakken vælger selv den
   mest kompakte — tal bliver til numerisk, og "A" og "AB" bliver
   til alfanumerisk, som pakker flere tegn i færre bit. Så bliver
   koden en anden, uden at nogen af dem er forkerte.

   MÅLT: uden det her blev "A" til 118 forkerte tern, og ingen af
   de otte masker kunne forklare det — det lignede en fejl i
   motoren. Alle sager med små bogstaver (adresserne, "Bord 7 ·
   Mosede Havnecafe") ramte plet, fordi små bogstaver ikke findes
   i det alfanumeriske sæt, og pakken derfor selv valgte byte.

   Det har ingen praktisk betydning for skiltene: et bordkort
   bærer en adresse med små bogstaver. Men facitlisten skal måle
   det samme, som motoren laver. */
function net(tekst, niveau) {
  const q = QRCode.create([{ data: tekst, mode: 'byte' }],
    { errorCorrectionLevel: niveau });
  const n = q.modules.size;
  const d = q.modules.data;
  const raekker = [];
  for (let y = 0; y < n; y++) {
    let r = '';
    for (let x = 0; x < n; x++) r += d[y * n + x] ? '1' : '0';
    raekker.push(r);
  }
  return { version: q.version, net: raekker };
}

const ud = {
  lavet_med: 'npm-pakken qrcode ' + require('qrcode/package.json').version
    + ', byte-tilstand — skrevet af vaerktoej/lav-qr-facit.js, ret ikke i hånden',
  sager: SAGER.map((s) => Object.assign({ tekst: s.tekst, niveau: s.niveau }, net(s.tekst, s.niveau))),
};

const sti = path.join(__dirname, '..', 'tests', 'facit', 'qr-facit.json');
fs.writeFileSync(sti, JSON.stringify(ud, null, 2) + '\n');
console.log('Skrevet: ' + sti);
ud.sager.forEach((s) => {
  console.log('  ' + s.niveau + '  version ' + s.version + '  '
    + s.net.length + ' tern  ' + JSON.stringify(s.tekst.slice(0, 46)));
});
