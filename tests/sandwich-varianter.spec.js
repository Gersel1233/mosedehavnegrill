/* ============================================================
   SANDWICHENS 14 VARIANTER NÅR FREM TIL GÆSTEN  (27/9)
   ------------------------------------------------------------
   Bestillingssedlerne (08 og 09, s. 2) har 14 sandwichvarianter.
   Butik.vareValg skar tavst listen ved 12 — databasen tillod også
   kun 12 (vare_valg_ok). Loftet er 16 begge steder nu
   (kortenes-rettelser-27-9.sql); prøven holder fast i, at de sidste
   to ikke forsvinder igen.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

const FJORTEN = ['Kebab', 'Kylling/bacon', 'Tun', 'Frikadelle', 'Æg', 'Flæskesteg', 'Ost & skinke',
  'Roastbeef', 'Leverpostej', 'Æg-karry', 'Æg-rejer', 'Rullepølse', 'Fiskefilet', 'Spørg gerne'];

test('alle 14 varianter står i gæstens valg', async ({ page }) => {
  await åbnSkal(page, '/index.html', { data: grunddata() });
  const ud = await page.evaluate((v) => window.Butik.vareValg({ navn: 'Sandwich', valg: v }), FJORTEN);
  expect(ud, 'en variant fra bestillingssedlen er skåret væk').toEqual(FJORTEN);
});
