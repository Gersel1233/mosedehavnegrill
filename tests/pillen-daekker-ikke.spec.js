/* ============================================================
   DEN FLYDENDE PILLE MÅ IKKE DÆKKE NOGET PERMANENT
   ------------------------------------------------------------
   Kundens ord 10/9: *"test at det hele hænger sammen — det kan
   ikke overskride hinanden."*

   MÅLT på 1280 px, rullet HELT i bund: pillens top lå på 814, og
   footerens sidste linje ("Personale") sluttede på 828. Altså
   dækkede pillen linket med 14 px, OG DER VAR IKKE MERE AT RULLE
   — det indhold kunne aldrig blive frit. Computerarket havde sat
   footerens bundluft ned til 72 px, mens pillen fylder
   24 + 58 = 82.

   ⚠️ FORSKELLEN PÅ EN FEJL OG EN KNAP, DER GØR SIT ARBEJDE, ER
   OM DET KAN RULLES FRI. En flydende pille dækker altid noget,
   mens man står ét sted; prøven her måler kun bunden, hvor der
   ikke er mere at rulle.

   ⚠️ OG DEN MÅLER TO UAFHÆNGIGE ELEMENTER: pillens top mod
   footerens sidste linje. Et spørgsmål til footeren om dens egen
   padding ville bestå, også hvis pillen blev højere.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const H = require('./hjaelp.js');

/* Siderne læses af MAPPEN. En ny side med en pille kan ikke
   slippe forbi — samme regel som gennemgangens egen. */
function sider() {
  return fs.readdirSync('.')
    .filter((f) => f.endsWith('.html'))
    .filter((f) => !H.erGoogleKvittering(f))
    .filter((f) => /class="bestil\b/.test(fs.readFileSync(f, 'utf8')));
}

for (const fil of sider()) {
  test('pillen dækker ikke bunden af /' + fil, async ({ page }) => {
    await H.åbnSkal(page, '/' + fil);

    const svar = await page.evaluate(() => {
      const pille = document.querySelector('.bestil');
      const fod = document.querySelector('footer');
      if (!pille || !fod) return { spring: 'siden har ingen pille eller footer' };

      const sc = document.getElementById('sc');
      const rod = sc && getComputedStyle(sc).overflowY !== 'visible'
        ? sc : document.scrollingElement;
      rod.style.scrollBehavior = 'auto';
      rod.scrollTop = rod.scrollHeight;

      /* Pillen folder sig væk, når det, den er en genvej TIL, er
         i syne (31/8). Er den væk, dækker den ikke noget. */
      const pr = pille.getBoundingClientRect();
      if (!pr.height || getComputedStyle(pille).display === 'none') {
        return { spring: 'pillen er foldet væk i bunden' };
      }

      const sidste = [...fod.querySelectorAll('*')]
        .filter((e) => e.children.length === 0 && e.textContent.trim())
        .pop();
      if (!sidste) return { spring: 'footeren har ingen tekst' };
      const sr = sidste.getBoundingClientRect();
      return {
        pilleTop: Math.round(pr.top),
        sidsteBund: Math.round(sr.bottom),
        tekst: sidste.textContent.trim().slice(0, 24),
      };
    });

    if (svar.spring) { test.info().annotations.push({ type: 'note', description: svar.spring }); return; }

    expect(svar.pilleTop,
      'pillen dækker "' + svar.tekst + '" med '
      + (svar.sidsteBund - svar.pilleTop) + ' px, og der er ikke mere at rulle')
      .toBeGreaterThanOrEqual(svar.sidsteBund);
  });
}
