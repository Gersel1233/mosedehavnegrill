/* BÅDEN I BUNDEN – rullemåleren.

   Den lå i telefon.spec.js, indtil båden blev slået fra under 900 px:
   bestil-knappen har den plads nu, for der er kun rum til én ting i
   den nederste kant, og af de to er knappen den man skal bruge.

   Testene her kører derfor i COMPUTERPROFILEN, hvor båden findes.
   Kører de i telefonprofilen, springes de over — dér måler de
   ingenting.

   Det de holder øje med, er de fejl båden faktisk har haft, og som
   ingen af dem kunne ses ved at læse koden:

   1) Et fixed canvas UDEN eksplicit bredde falder sammen til sin
      iboende 300 px, og js/baad.js springer helt fra når clientWidth
      er 0. Resultatet er en tom stribe, uden en fejl nogen steder.

   2) Båden var malet i vandets farve. Skrog, dæk, mast og storsejl i
      #0f2c44 på et hav i #0f2c44 — det eneste man kunne se, var det
      lille røde forsejl. Derfor måles der på at der er SANDFARVE på
      canvas'et og ikke kun havblå.

   3) Striben må ikke dække den nederste linje i footeren.
*/

const { test, expect } = require('@playwright/test');
const { åbn } = require('./hjaelp');

test.describe('Båden', () => {

  test.skip(({ isMobile }) => isMobile, 'båden er slået fra på telefon');

  test('striben er så bred som skærmen og har pixels at tegne på',
    async ({ page }) => {
      await åbn(page, '/index.html');
      await expect(page.locator('#sail')).toBeVisible();

      const maal = await page.evaluate(() => {
        const c = document.getElementById('sail');
        return { bredde: c.clientWidth, vindue: window.innerWidth, pixels: c.width };
      });
      expect(maal.bredde, 'striben er ikke så bred som skærmen')
        .toBeGreaterThanOrEqual(maal.vindue - 1);
      expect(maal.pixels, 'canvas har ingen pixels – der bliver ikke tegnet noget')
        .toBeGreaterThan(0);
    });

  test('der bliver faktisk tegnet, og båden er ikke malet i vandets farve',
    async ({ page }) => {
      await åbn(page, '/index.html');
      await page.waitForTimeout(500);

      const svar = await page.evaluate(() => {
        const c = document.getElementById('sail');
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let malet = 0, sand = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] === 0) continue;
          malet++;
          /* Skroget er #f4ead8: meget lys og varm. Vandet er #0f2c44:
             mørkt og koldt. Én pixel hvor rød er høj OG rød > blå, kan
             ikke være vand. */
          if (d[i] > 200 && d[i] > d[i + 2] + 20) sand++;
        }
        return { malet: malet, sand: sand };
      });

      expect(svar.malet, 'striben er tegnet helt tom').toBeGreaterThan(0);
      expect(svar.sand,
        'der er ingen sandfarvede pixels – båden er malet i vandets farve igen')
        .toBeGreaterThan(50);
    });

  test('striben dækker ikke den nederste linje i footeren', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.evaluate(() => window.scrollTo({
      top: document.documentElement.scrollHeight, behavior: 'instant',
    }));
    await page.waitForTimeout(250);

    const daekker = await page.evaluate(() => {
      const s = document.getElementById('sail').getBoundingClientRect();
      const f = document.querySelector('footer .fine').getBoundingClientRect();
      return f.bottom > s.top + 1;
    });
    expect(daekker, 'bådstriben ligger oven på den nederste linje i footeren')
      .toBe(false);
  });

  /* Den faste bestil-knap ligger i samme hjørne. Den skal ligge OVER
     båden — den er til at trykke på, båden er til at se på — og den må
     ikke ligge oven i den. */
  test('bestil-knappen står over båden og ikke i den', async ({ page }) => {
    await åbn(page, '/index.html');

    /* Der rulles først: knappen gemmer sig, mens heroens egen
       "Bestil mad" er på skærmen — se js/side.js. Måltes den i
       toppen, ville man måle dens gemmested og ikke dens plads. */
    await page.evaluate(() => window.scrollTo(0, 2000));
    await expect(page.locator('.bestil-fast')).not.toHaveClass(/dukket/);

    const svar = await page.evaluate(() => {
      const k = document.querySelector('.bestil-fast').getBoundingClientRect();
      const s = document.getElementById('sail').getBoundingClientRect();
      const lag = (v) => Number(getComputedStyle(v).zIndex);
      return {
        knapBund: k.bottom,
        stribeTop: s.top,
        knapLag: lag(document.querySelector('.bestil-fast')),
        stribeLag: lag(document.getElementById('sail')),
      };
    });

    expect(svar.knapBund, 'knappen ligger nede i vandet')
      .toBeLessThanOrEqual(svar.stribeTop + 1);
    expect(svar.knapLag, 'knappen ligger bag striben').toBeGreaterThan(svar.stribeLag);
  });
});
