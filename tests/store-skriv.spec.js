/* Delingen af store.js — begge halvdele.

   1) Admin SKAL indlæse skrivelaget. Glemmes js/store-skriv.js i
      admin.html, findes Butik.skrive ikke, personalet kan
      ingenting gemme — og fejlen er tavs, til nogen trykker Gem.

   2) Gæstesiden må IKKE. Tvillingen var parkeret, mens den nye
      forside slet ikke indlæste store.js. Det gør den nu
      (systemfasen, trin 1), og så er der noget at måle igen:
      skrivelaget er 22 kB, som ingen gæst bruger, og en gæsteside,
      der begynder at kunne skrive, er en gæsteside, der er ved at
      få fat i noget, den ikke skal.

   Prøve 2 er den, der falder, hvis nogen "bare lige" tilføjer
   js/store-skriv.js til index.html for at få noget til at virke. */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, åbnSkal } = require('./hjaelp');

test('personalesiden henter skrivelaget', async ({ page }) => {
  await åbnAdmin(page);
  const typer = await page.evaluate(() => [
    typeof (window.Butik.skrive || {}).indstilling,
    typeof (window.Butik.skrive || {}).bord,
    typeof (window.Butik.skrive || {}).vare,
  ]);
  expect(typer, 'admin kan ikke gemme noget — er js/store-skriv.js glemt?')
    .toEqual(['function', 'function', 'function']);
});

test('gæstesiden henter ikke personalets skrivelag', async ({ page }) => {
  await åbnSkal(page, '/index.html');

  // Motoren skal være der — ellers måler prøven ingenting
  await expect.poll(() => page.evaluate(() => typeof window.Butik)).toBe('object');

  const skrive = await page.evaluate(() => typeof (window.Butik || {}).skrive);
  expect(skrive, 'forsiden har fået fat i skrivelaget — er js/store-skriv.js kommet med?')
    .toBe('undefined');
});
