// @ts-check
/* ============================================================
   INDHOLDET SES UNDER SAFARIS BJÆLKE  (12/9)
   ------------------------------------------------------------
   Kundens ord med et skærmbillede af apple.com: "når man scroller ned
   kan man se alt, også under browser-tingen — det skal fixes alle
   steder man scroller ned på hjemmesiden".

   MÅLT I iOS 26 SAFARI (simulatoren): en SYNLIG fastgjort pille i bunden
   får Safari til at lægge en tæt flade under sin bjælke. En pille på
   opacity 0 talte også med; først visibility:hidden slap Safari.
   Playwright kan ikke se Safaris bjælke — prøverne måler derfor den
   egenskab, Safari reagerer på: pillens BEREGNEDE visibility.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, springIntroOver, rul, rulleHøjde } = require('./hjaelp');

const synlighed = (page) => page.locator('#bestil-pill').evaluate((e) => getComputedStyle(e).visibility);

async function åbn(page) {
  const d = grunddata();
  d.indstillinger.bestilbare_kategorier = [1, 6, 9];
  await åbnSkal(page, '/index.html', { data: d });
  await springIntroOver(page);
}

test.describe('Pillen giver plads under Safaris bjælke', () => {
  test.beforeEach(({}, info) => {
    test.skip(!info.project.use.isMobile, 'Safaris bjælke findes kun på telefonen');
  });

  test('på vej ned er pillen HELT skjult — på vej op kommer den', async ({ page }) => {
    await åbn(page);
    const bund = (await rulleHøjde(page)) - 900;
    await rul(page, bund);
    await expect.poll(() => synlighed(page), { timeout: 4000 }).toBe('hidden');
    await rul(page, bund - 300);
    await expect.poll(() => synlighed(page), { timeout: 4000 }).toBe('visible');
  });

  test('en foldet pille er også skjult, ikke bare gennemsigtig', async ({ page }) => {
    /* ⚠️ OP TIL FORMULAREN, IKKE NED: på vej ned er pillen skjult af
       den anden regel, og så målte prøven ikke foldningen. Nedefra og op
       til #bestil er det .tuck alene, der gemmer den. */
    await åbn(page);
    await rul(page, (await rulleHøjde(page)) - 900);
    const formular = await page.locator('#bestil').evaluate((e) => e.offsetTop);
    await rul(page, formular + 200);
    await expect(page.locator('#bestil-pill')).toHaveClass(/tuck/, { timeout: 4000 });
    await expect(page.locator('#bestil-pill')).not.toHaveClass(/\bned\b/);
    await expect.poll(() => synlighed(page), { timeout: 4000 }).toBe('hidden');
  });
});
