/* BESTIL/ SENDER GÆSTEN VIDERE TIL SMØRREBRØDSSIDEN  (26. sep 2026)

   Mikkels ja på et skærmbillede: to sider solgte smørrebrød ud af
   huset. bestil/ var ikke linket nogen steder fra, men stod i
   sitemap.xml — så Google kunne sende en gæst ind i den gamle udgave.

   Siden bliver liggende som prøvebænk for motoren bag bordene
   (js/bestilling.js). Derfor sender den KUN en rigtig browser videre;
   Playwright melder sig med navigator.webdriver og bliver. Prøverne
   her måler begge halvdele — ellers kunne vagten mod omdirigeringen
   tavst have taget alle bestil/-prøverne med sig, eller omvendt. */

const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const ROD = path.join(__dirname, '..');

/* En rigtig browser: webdriver er falsk. Sat på prototypen, så den
   også gælder, før sidens første script kører. */
async function somGaest(page) {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
  });
}

test.describe('bestil/ sender gæsten videre', () => {

  test('en gæst på bestil/ lander på smørrebrødssiden', async ({ page }) => {
    await somGaest(page);
    await page.goto('/bestil/');
    await expect(page).toHaveURL(/\/h-smorrebrod\.html$/);
  });

  /* location.replace lægger ikke bestil/ i historikken. Med en almindelig
     omdirigering ville tilbage-knappen sende hende til bestil/ — og
     derfra straks frem igen, i ring. */
  test('tilbage-knappen sender hende ikke i ring', async ({ page }) => {
    await somGaest(page);
    await page.goto('/index.html');
    await page.goto('/bestil/');
    await expect(page).toHaveURL(/\/h-smorrebrod\.html$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/index\.html$/);
  });

  /* Modstykket: prøvebrowseren bliver. Uden den her ville ~150 prøver
     på bestil/ måle smørrebrødssiden i stedet — og nogle af dem ville
     bestå af den forkerte grund. */
  test('prøvebrowseren bliver på bestil/', async ({ page }) => {
    await page.goto('/bestil/');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/bestil\/$/);
  });

  test('bestil/ står ikke i sitemap, og canonical peger på smørrebrødssiden', () => {
    const kort = fs.readFileSync(path.join(ROD, 'sitemap.xml'), 'utf8');
    expect(kort, 'bestil/ står stadig i sitemap.xml').not.toContain('mosedehavnecafe.dk/bestil/');
    expect(kort).toContain('mosedehavnecafe.dk/h-smorrebrod.html');
    const side = fs.readFileSync(path.join(ROD, 'bestil', 'index.html'), 'utf8');
    expect(side).toContain('<link rel="canonical" href="https://mosedehavnecafe.dk/h-smorrebrod.html">');
  });
});
