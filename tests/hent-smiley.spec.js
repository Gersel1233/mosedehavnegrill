/* ============================================================
   DEN RIGTIGE SMILEY HENTES I UDGIVELSEN  (25/10)
   ------------------------------------------------------------
   Mikkel: *"smiley'en kan du selv finde"*. vaerktoej/hent-smiley.py
   henter Fødevarestyrelsens seneste resultat og deres egen tegning og
   bytter den tegnede smiley ud — i udgivelsens kopi, ikke i repoet.
   Prøverne her kan ikke nå Fødevarestyrelsen; de måler skriptets
   egen prøve (falsk svar, alle 15 steder) og at udgivelsen kalder det
   det rigtige sted, uden at det kan stoppe en udgivelse.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');

test('skriptets egen prøve: den officielle smiley sættes ind alle 15 steder', () => {
  const ud = execFileSync('python3', ['vaerktoej/hent-smiley.py', '--proev'], { cwd: ROD, encoding: 'utf8' });
  expect(ud).toContain('PRØVE: BESTOD');
});

test('hver side, skriptet skal ramme, har stadig den tegnede smiley at bytte', () => {
  /* Ændres opmærkningen, finder skriptet intet — og så står tegningen
     stille for evigt, uden at nogen får en fejl. Tallet er sidernes. */
  const sider = fs.readdirSync(ROD).filter((f) => f.endsWith('.html'))
    .concat(fs.readdirSync(ROD).filter((d) => fs.existsSync(path.join(ROD, d, 'index.html'))
      && fs.statSync(path.join(ROD, d)).isDirectory()).map((d) => d + '/index.html'));
  let antal = 0;
  for (const f of sider) {
    const s = fs.readFileSync(path.join(ROD, f), 'utf8');
    antal += (s.match(/<a class="smiley-linje" href="https:\/\/www\.findsmiley\.dk[^"]*"[^>]*><svg class="fod-ill"/g) || []).length;
    antal += (s.match(/<a class="smiley-kort glasraekke rev" href="https:\/\/www\.findsmiley\.dk[^"]*"[^>]*><span class="gr-tegn" aria-hidden="true"><svg class="ny-maerke-ill"/g) || []).length;
  }
  expect(antal).toBe(15);
});

test('udgivelsen henter smileyen før oprydningen, og en fejl stopper den ikke', () => {
  const y = fs.readFileSync(path.join(ROD, '.github/workflows/deploy.yml'), 'utf8');
  const smil = y.indexOf('run: python3 vaerktoej/hent-smiley.py');
  const ryd = y.indexOf('- name: Fjern udviklingsfiler');
  expect(smil, 'trinnet mangler').toBeGreaterThan(0);
  expect(smil, 'oprydningen fjerner vaerktoej/ — trinnet skal stå før').toBeLessThan(ryd);
  const trin = y.slice(y.lastIndexOf('- name:', smil), smil);
  expect(trin).toContain('continue-on-error: true');
  /* og den følger med, når resultatet skifter — uden at nogen pusher */
  expect(y).toMatch(/schedule:\s*\n\s*- cron:/);
  expect(y, 'bagdøren må ikke komme tilbage').not.toMatch(/^\s*workflow_dispatch:/m);
});
