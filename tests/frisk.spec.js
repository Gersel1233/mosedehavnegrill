/* Admin holder sig selv frisk (fase 5c).

   Kunden så fejlen med det samme: telefonen bippede, men skærmen
   stod stille, til nogen trykkede "Hent på ny". Her måles kæden
   indeni: at en ny række viser sig selv, når signalet kommer — og
   at signalet fra service workeren faktisk er koblet til. */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { åbnAdmin } = require('./hjaelp');

const ROD = path.join(__dirname, '..');

/* Lægger en ny bestilling direkte i localStorage — som om en gæst
   lige har sendt den fra en anden fane. */
async function nyBestillingBagom(page) {
  await page.evaluate(() => {
    const nøgle = 'mosede_data_v1';
    const d = JSON.parse(localStorage.getItem(nøgle));
    d.bestillinger = d.bestillinger || [];
    d.bestillinger.unshift({
      id: 991, lokation_id: 'mosede', reference: 'SM260807-FRISK',
      navn: 'Frisk Gæst', telefon: '20304050', hent_dato: '2026-08-07',
      hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 1, pris: 55 }],
      fyld: [], antal: 1, status: 'ny', intern_note: null,
      oprettet: new Date().toISOString(),
    });
    localStorage.setItem(nøgle, JSON.stringify(d));
  });
}

test.describe('Admin holder sig selv frisk', () => {

  test('en ny bestilling viser sig uden "Hent på ny"', async ({ page }) => {
    await åbnAdmin(page);
    await expect(page.locator('#overblik-nyt')).toContainText('ikke kommet noget');

    await nyBestillingBagom(page);
    /* Signalet — her trykket med hånden; de næste prøver måler,
       at det også kommer af sig selv. */
    await page.evaluate(() => Admin.friskOp());

    await expect(page.locator('#overblik-nyt')).toContainText('Frisk Gæst');
    await expect(page.locator('#bestil-antal')).toHaveText('1');
  });

  test('beskeden fra service workeren udløser hentningen', async ({ page }) => {
    await åbnAdmin(page);
    await nyBestillingBagom(page);

    /* Samme besked, som sw.js sender, når pushen lander. Det er
       DEN kobling, der giver "i samme sekund" på iPad'en. */
    await page.evaluate(() => {
      navigator.serviceWorker.dispatchEvent(
        new MessageEvent('message', { data: { type: 'mosede-nyt' } }));
    });

    await expect(page.locator('#overblik-nyt')).toContainText('Frisk Gæst');
  });

  test('en uvedkommende besked henter ingenting', async ({ page }) => {
    await åbnAdmin(page);
    await nyBestillingBagom(page);

    await page.evaluate(() => {
      navigator.serviceWorker.dispatchEvent(
        new MessageEvent('message', { data: { type: 'noget-helt-andet' } }));
    });

    await expect(page.locator('#overblik-nyt')).toContainText('ikke kommet noget');
  });

  test('logget ud hentes der ikke — og der males ingen fejl', async ({ page }) => {
    /* uden logInd: åbn siden rå, så login-skærmen står der. Et
       friskOp her ville give 401 i alle lister — værnet er, at
       den slet ikke går i gang. */
    const { lokalTilstand, sætUr, sætData, grunddata } = require('./hjaelp');
    await lokalTilstand(page);
    await sætUr(page, '2026-08-07T11:00:00Z');
    await sætData(page, grunddata());
    await page.addInitScript(() => {
      /* fri() ville logge os ind af sig selv på localhost — luk
         den dør, så login-skærmen faktisk står der. */
      sessionStorage.removeItem('mosede_token');
      Object.defineProperty(navigator, 'onLine', { value: true });
    });
    await page.route('**/js/config.js*', (r) => r.fulfill({
      contentType: 'application/javascript',
      body: "window.MOSEDE_CLOUD = { url: 'https://ikke.rigtig', anonKey: 'x' };",
    }));
    /* Der måles på NETVÆRKET og ikke på fejlbeskeden: beskeden
       kommer først, når det langsomme kald fejler, og en prøve,
       der måler før det, består altid. Nul forsøg kan ikke løbe
       om hjørner med nogen. */
    let kald = 0;
    await page.route('**/rest/v1/**', (r) => { kald++; r.abort(); });

    await page.goto('/admin.html');
    await expect(page.locator('#login')).toBeVisible();

    await page.evaluate(() => Admin.friskOp());
    await page.waitForTimeout(400);
    expect(kald, 'friskOp hentede, selv om ingen er logget ind').toBe(0);
  });
});

test.describe('Service workeren sender signalet', () => {

  test.skip(({ isMobile }) => !!isMobile, 'læser en fil, ikke en side');

  test('pushen siger også til vinduerne — og stadig uden cache', async () => {
    const sw = fs.readFileSync(path.join(ROD, 'sw.js'), 'utf8');
    expect(sw).toContain("postMessage({ type: 'mosede-nyt' })");
    /* Reglen fra push-fasen står stadig: ingen fetch-håndtering.
       Et signal er ikke en undskyldning for at begynde at cache. */
    expect(sw).not.toContain("addEventListener('fetch'");
  });
});
