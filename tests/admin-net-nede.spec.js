/* ============================================================
   NETTET ER VÆK — OG SKÆRMEN SIGER DET  (26/9)
   ------------------------------------------------------------
   Fundet i en gennemgang af koden: faldt nettet ud på køkkenets
   iPad, stod køen med de gamle kort, og klokken tikkede videre —
   skærmen så levende ud. Reglen bor i js/admin/frisk.js
   (tjekNettet), og tidspunktet for sidste svar i js/store.js
   (Butik.sidstSvar, sat af hentTabel).
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata } = require('./hjaelp');

const baand = (page) => page.locator('#net-nede');

test.describe('Admin siger fra, når databasen ikke svarer', () => {

  test('et gammelt svar giver et rødt bånd øverst — og det går væk igen', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await page.evaluate(() => { Butik.sidstSvar = () => Date.now() - 60 * 1000; Admin.tjekNettet(); });
    await expect(baand(page), 'intet bånd, selv om databasen ikke har svaret i et minut')
      .toBeVisible();
    await expect(baand(page)).toContainText('Ingen forbindelse siden kl.');
    await expect(baand(page)).toContainText('nye bestillinger kommer ikke frem');
    /* Fast øverst: køkkenet har rullet ned i køen. */
    expect(await baand(page).evaluate((e) => getComputedStyle(e).position)).toBe('fixed');

    await page.evaluate(() => { Butik.sidstSvar = () => Date.now(); Admin.tjekNettet(); });
    await expect(baand(page), 'båndet blev stående, da svaret kom').toHaveCount(0);
  });

  test('et helt nyt svar giver intet bånd', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await page.evaluate(() => { Butik.sidstSvar = () => Date.now() - 20 * 1000; Admin.tjekNettet(); });
    await expect(baand(page)).toHaveCount(0);
  });

  /* Modstykket: i øvetilstand er der intet net at miste. */
  test('i øvetilstand står der intet bånd', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    expect(await page.evaluate(() => Butik.sidstSvar())).toBeNull();
    await page.evaluate(() => Admin.tjekNettet());
    await expect(baand(page)).toHaveCount(0);
  });
});

/* Tidspunktet sættes kun, når databasen FAKTISK svarer — målt på en
   gæsteside med en falsk sky, så det er store.js' egen hentTabel. */
test.describe('Butik.sidstSvar følger databasens svar', () => {
  const SKY = 'https://db.eksempel.test';
  async function medSky(page, status) {
    await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
    await page.route('**/js/config.js*', (r) => r.fulfill({
      status: 200, contentType: 'application/javascript',
      body: "window.MOSEDE_CLOUD={url:'" + SKY + "',anonKey:'proeve'};",
    }));
    await page.route(SKY + '/**', (r) => r.fulfill({
      status, contentType: 'application/json', body: status === 200 ? '[]' : '{"message":"nede"}',
    }));
  }

  test('et svar fra databasen sætter tidspunktet', async ({ page }) => {
    await medSky(page, 200);
    await page.goto('/m-menukort.html', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.evaluate(() => Butik.sidstSvar())).toBeGreaterThan(0);
  });

  test('en database, der svarer med fejl, sætter det ikke', async ({ page }) => {
    await medSky(page, 503);
    await page.goto('/m-menukort.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => Butik.sidstSvar())).toBe(0);
  });
});
