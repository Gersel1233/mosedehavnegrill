/* Delingen af store.js: admin SKAL indlæse skrivelaget.

   Prøven boede i vaegt.spec.js sammen med sin tvilling —
   "gæstesiden henter ikke personalets skrivelag". Tvillingen er
   parkeret med den gamle forside (tests-gamle/vaegt.spec.js): den
   nye forside indlæser slet ikke store.js endnu, så dér er der
   ingenting at måle. Den kommer igen, når motoren kobles på.

   Den her halvdel gælder UÆNDRET: glemmes js/store-skriv.js i
   admin.html, findes Butik.skrive ikke, personalet kan ingenting
   gemme — og fejlen er tavs, til nogen trykker Gem. */
const { test, expect } = require('@playwright/test');
const { åbnAdmin } = require('./hjaelp');

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
