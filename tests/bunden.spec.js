// @ts-check
/* BUNDEN PÅ HVER SIDE (14/9). Kundens ord med et skud af bord/'s tynde
   bund: "hernede alle steder skal vi have fixet, så alt det, der skal
   stå, står der — og vigtigst: lavet af Lesreg".

   MÅLT FØR: kun bestil/ sagde, hvem der havde lavet siden. De tolv
   designsider og bord/ gjorde ikke — og bord/ havde hverken telefon,
   adresse, åbningstider eller personalets indgang.

   Siderne læses af MAPPEN: en ny side med en footer kommer med af sig
   selv. Admin er personalets og har sin egen bund. */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const ROD = path.join(__dirname, '..');
const læs = (f) => fs.readFileSync(path.join(ROD, f), 'utf8');
const SIDER = [
  ...fs.readdirSync(ROD).filter((f) => f.endsWith('.html')),
  ...fs.readdirSync(ROD, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(ROD, d.name, 'index.html')))
    .map((d) => d.name + '/index.html'),
].filter((f) => f !== 'admin.html' && /<footer/.test(læs(f)));

const bund = (f) => {
  const h = læs(f).replace(/<!--[\s\S]*?-->/g, '');
  return h.slice(h.indexOf('<footer'), h.indexOf('</footer>'));
};

/* De syv adresser, der blev vejvisere 30/8. En bund, der peger på
   en omdirigering, er et ekstra hop — og menu.html stod i bestil/'s. */
const VEJVISERE = ['menu.html', 'selskaber/', 'catering/', 'baglokale/', 'arrangementer/',
  'nyheder/', 'smoerrebroed-ud-af-huset/'];

test('vagt: der ER sider med en bund', () => {
  expect(SIDER.length, SIDER.join(', ')).toBeGreaterThanOrEqual(14);
  expect(SIDER).toContain('bord/index.html');
  expect(SIDER).toContain('bestil/index.html');
});

test('hver bund siger "Lavet af Lesreg" — med et link, der åbner for sig', () => {
  const mangler = SIDER.filter((f) => !/Lavet af\s*<a[^>]*href="https:\/\/lesreg\.dk"[^>]*>Lesreg<\/a>/.test(bund(f)));
  expect(mangler, 'sider uden Lesreg i bunden').toEqual([]);
  /* Et link væk fra en halvt udfyldt bestilling må ikke tage fanen med. */
  const sammeFane = SIDER.filter((f) => {
    const a = bund(f).match(/<a[^>]*href="https:\/\/lesreg\.dk"[^>]*>/);
    return a && !(/target="_blank"/.test(a[0]) && /rel="noopener"/.test(a[0]));
  });
  expect(sammeFane, 'Lesreg-linket åbner i samme fane').toEqual([]);
});

test('ingen bund peger på en vejviser', () => {
  const fund = [];
  for (const f of SIDER) {
    for (const [, href] of bund(f).matchAll(/href="([^"#?]+)/g)) {
      const ren = href.replace(/^(\.\.\/|\.\/)+/, '');
      if (VEJVISERE.includes(ren)) fund.push(f + ' → ' + href);
    }
  }
  expect(fund).toEqual([]);
});

test('bord/ har hele bunden — men ingen mailadresse', () => {
  const b = bund('bord/index.html');
  expect(b, 'telefonen').toMatch(/href="tel:/);
  expect(b, 'adressen').toMatch(/Havnevej 20I/);
  expect(b, 'åbningstiderne').toMatch(/#find"/);
  expect(b, 'personalets indgang').toMatch(/admin\.html/);
  expect(b, 'persondata').toMatch(/persondatapolitik\.html/);
  /* ⚠️ En bordbooking går aldrig gennem en mail (28/8). */
  expect(b, 'en mail i bord/s bund').not.toMatch(/mailto:/);
});
