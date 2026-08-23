/* QR-motoren i js/qr.js.

   ET AF TALLENE SKAL KOMME UDEFRA.
   ------------------------------------------------------------
   En QR-kode, der er en smule forkert, ser rigtig ud. Der er
   ingen skæv kant, ingen manglende firkant — den er bare ikke
   til at læse, og det opdager man først, når en gæst står ved
   bord 7 med en telefon, der ikke vil.

   Derfor måler prøven ikke koden mod sig selv. tests/facit/
   qr-facit.json er skrevet af npm-pakken "qrcode" — den samme,
   vaerktoej/lav-qr.js har brugt til bordskiltene hele tiden —
   og hver eneste tern sammenlignes.

   DET VIRKER: undervejs havde motoren to fejl, som kun facit-
   listen kunne se. Alle 208 datatern var rigtige begge gange:

   1) De 15 formatbit stod SPEJLVENDT. Koden så helt normal ud,
      men en telefon fik aldrig at vide, hvilken maske der var
      brugt, og kunne derfor ikke læse et eneste tegn.
   2) Det ene tern, der ALTID er mørkt, blev sat til 0, fordi
      det var reserveret som formatplads og aldrig skrevet
      tilbage.

   Skal facitlisten laves om (nye adresser, flere sager), så kør
   npm-pakken igen — den er et VÆRKTØJ, ikke en afhængighed:
   siden indlæser den aldrig.
*/

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');
const FACIT = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'facit', 'qr-facit.json'), 'utf8'));

/* Motoren køres i et lille rum for sig — den skal ikke have en
   side omkring sig for at kunne regne. */
function motor() {
  const vindue = {};
  new Function('window', fs.readFileSync(path.join(ROD, 'js', 'qr.js'), 'utf8'))(vindue);
  return vindue.MosedeQR;
}

test('hver kode er tern for tern den samme som facitlistens', () => {
  const QR = motor();
  const fejl = [];

  FACIT.sager.forEach((sag) => {
    let net;
    try {
      net = QR.net(sag.tekst, sag.niveau);
    } catch (e) {
      fejl.push(sag.tekst.slice(0, 30) + ' (' + sag.niveau + '): kastede ' + e.message);
      return;
    }
    if (net.length !== sag.net.length) {
      fejl.push(sag.tekst.slice(0, 30) + ' (' + sag.niveau + '): '
        + net.length + ' tern bred, facit siger ' + sag.net.length);
      return;
    }
    let afvig = 0;
    for (let y = 0; y < net.length; y++) {
      for (let x = 0; x < net.length; x++) {
        if (String(net[y][x]) !== sag.net[y][x]) afvig++;
      }
    }
    if (afvig) {
      fejl.push(sag.tekst.slice(0, 30) + ' (' + sag.niveau + ', version '
        + sag.version + '): ' + afvig + ' tern forkerte');
    }
  });

  expect(fejl, 'koderne kan ikke læses af en telefon').toEqual([]);
});

test('en for lang tekst tegner ikke en kode, den siger fra', () => {
  const QR = motor();
  /* En kode, der er tegnet for en tekst, der ikke er plads til,
     ville være en kode med afskåret indhold — og den er værre
     end ingen kode: den scanner FINT og sender gæsten et
     forkert sted hen. */
  expect(() => QR.net('x'.repeat(400), 'H')).toThrow(/for lang/);
});

test('den hvide kant er der, for uden den kan koden ikke ses', () => {
  const QR = motor();
  const svg = QR.svg('https://eksempel.dk/', { niveau: 'H' });
  // Fire tern hele vejen rundt: standardens mindstemål.
  const kasse = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  const net = QR.net('https://eksempel.dk/', 'H');
  expect(Number(kasse[1]), 'kanten mangler i SVG-udsnittet').toBe(net.length + 8);
  expect(svg).toContain('<path');
});

/* Bordskiltene skal kunne tåle fedtfingre. H tåler, at omkring
   en tredjedel af koden er dækket — de tre andre niveauer gør
   ikke, og forskellen kan ikke ses på skiltet. */
test('alle fire fejlkorrektionsniveauer findes og giver forskellige koder', () => {
  const QR = motor();
  const set = new Set();
  ['L', 'M', 'Q', 'H'].forEach((n) => {
    const net = QR.net('https://gersel1233.github.io/mosedehavnegrill/ved-bordet/?bord=7', n);
    set.add(net.length + ':' + net.map((r) => r.join('')).join('').slice(0, 40));
  });
  expect(set.size, 'to niveauer gav den samme kode – så virker valget ikke').toBe(4);
});
