/* ============================================================
   FILER, INGEN SIDE INDLÆSER  (5/9)
   ------------------------------------------------------------
   Seks filer i js/ kører ikke. De blev efterladt, da gæstesiden
   blev skiftet ud 23/8 og da de gamle adresser blev vejvisere
   30/8, og de er ikke slettet: prøverne i tests-gamle/ peger på
   dem, og de skal læses igennem for dækning, ingen anden måler,
   før noget fjernes.

   ⚠️ MEN LISTEN MÅ IKKE VOKSE I STILHED. Det er selve faren:
   en fil, ingen indlæser, ser ud præcis som en, der kører — og
   den næste, der læser koden, bruger en time på at rette noget,
   der ikke findes på skærmen. Det er sket: js/dagens.js blev
   slettet 23/8, netop fordi den byggede en ringere udgave af en
   formular, der allerede fandtes.

   ⚠️ OG DEN FÆLDER OGSÅ EN FORSVUNDEN FIL. Bliver en af de seks
   ryddet op, skal papirerne følge med — derfor sammenlignes hele
   sættet og ikke bare antallet.

   ⚠️ LISTEN LÆSES AF DISKEN, ikke skrevet af i hånden: hver
   .js-fil i js/ holdes op mod hver udgivet .html-fil. Samme greb
   som favicon-prøven og siderMedFooter(). */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/* De seks, vi VED er forældreløse — og som papirerne beskriver.
   Står der noget nyt her, er der efterladt kode; mangler der
   noget, er der ryddet op, og så skal CLAUDE.md følge med. */
const KENDTE = [
  'arrangementer.js',
  'baad.js',
  'baglokale.js',
  'intro.js',
  'menuside.js',
  'smoerrebroed.js',
];

function sider() {
  const ud = [];
  fs.readdirSync('.').forEach((f) => {
    if (f.endsWith('.html')) ud.push(f);
  });
  ['', 'print', 'vejledning'].forEach(() => {});
  fs.readdirSync('.', { withFileTypes: true }).forEach((d) => {
    if (!d.isDirectory() || d.name.startsWith('.') || d.name === 'node_modules') return;
    try {
      fs.readdirSync(d.name).forEach((f) => {
        if (f.endsWith('.html')) ud.push(path.join(d.name, f));
      });
    } catch (e) { /* ikke en mappe, vi kan læse */ }
  });
  return ud;
}

test('ingen NY fil i js/ er holdt op med at blive indlæst', () => {
  const html = sider().map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  expect(html.length, 'ingen sider blev læst — prøven måler ingenting')
    .toBeGreaterThan(1000);

  const forældreløse = fs.readdirSync('js')
    .filter((f) => f.endsWith('.js'))
    .filter((f) => html.indexOf(f) === -1)
    .sort();

  expect(forældreløse, 'listen over filer, ingen side indlæser, har '
    + 'ændret sig — ryd op eller ret KENDTE og CLAUDE.md')
    .toEqual([...KENDTE].sort());
});

/* ⚠️ OG HVER AF DEM SIGER DET SELV. En note i toppen er det
   eneste, der når den, som åbner filen uden at slå op i
   papirerne — og det er præcis den situation, fælden virker i. */
for (const f of KENDTE) {
  test(`js/${f} siger selv, at ingen side indlæser den`, () => {
    const t = fs.readFileSync(path.join('js', f), 'utf8');
    expect(t.slice(0, 900),
      `js/${f} mangler noten om, at den ikke kører`)
      .toContain('INGEN SIDE INDLÆSER DEN HER FIL');
  });
}
