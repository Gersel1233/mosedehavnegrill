/* ET HURTIGT TRYK ER ET TRYK, IKKE EN ZOOM  (13/9).

   Kundens ord: knapperne på bestillingen "alle steder ... er svær at
   ramme ordentlig uden at den tror man vil dobbelt trykke for at
   zoome ind". To tryk på + inden for et halvt sekund læste Safari
   som et dobbelttryk, og siden zoomede i stedet for at tælle op.

   ⚠️ PLAYWRIGHT KAN IKKE DOBBELTTRYKKE SOM EN iPHONE. Prøven måler
   derfor den egenskab, Safari reagerer på: den BEREGNEDE touch-action
   på roden. `manipulation` slår kun dobbelttryk-zoom fra — to fingre
   kan stadig zoome, og det er den halvdel, der ikke må forsvinde.
   Siderne er én fra hvert stilark: designets (havnegrillen.css) og
   det gamle (css/style.css, som bærer bestil/, bord/ og ved-bordet/). */

const { test, expect } = require('@playwright/test');
const { åbn } = require('./hjaelp');

const SIDER = ['/index.html', '/h-smorrebrod.html', '/h-kalender.html', '/bestil/', '/bord/'];

test.describe('Hurtige tryk bliver ved at være tryk', () => {
  for (const sti of SIDER) {
    test(sti + ': et dobbelttryk zoomer ikke — men to fingre gør stadig', async ({ page }) => {
      await åbn(page, sti);
      const t = await page.evaluate(() => getComputedStyle(document.documentElement).touchAction);
      expect(t).toBe('manipulation');
    });
  }

  /* Plus og minus var 30 px i designet — under det, en finger
     rammer sikkert, og netop dér trykker man hurtigt flere gange. */
  test('plus og minus på forsiden er mindst 38 px', async ({ page }) => {
    await åbn(page, '/index.html');
    const mål = await page.evaluate(() => {
      const s = document.createElement('div');
      s.className = 'step';
      const b = document.createElement('button');
      b.setAttribute('data-d', '+');
      b.textContent = '+';
      s.appendChild(b);
      (document.querySelector('#bestil .panel') || document.body).appendChild(s);
      const r = b.getBoundingClientRect();
      return Math.min(r.width, r.height);
    });
    expect(mål).toBeGreaterThanOrEqual(38);
  });
});
