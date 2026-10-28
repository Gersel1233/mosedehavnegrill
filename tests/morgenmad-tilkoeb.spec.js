/* ============================================================
   MORGENMADENS TILKØB SIDDER PÅ RETTEN  (28/10, før lanceringen)
   ------------------------------------------------------------
   Mikkel: *"køber jeg Havnens All in One og en English Breakfast og så
   tilkøber +10 grønt — hvad gælder det til? Det hænger ikke sammen."*
   Og: *"den må gerne lige have en ekstra spejlæg tilkøb til morgenmad."*

   Før var tilkøbene en løs kategori, og bonen sagde "1 × Grønt".
   Nu vælger gæsten dem PÅ retten, linjen bærer dem, prisen følger med,
   og køkkenet ser "English Breakfast · Grønt, Ekstra spejlæg".
   Databasens halvdel er supabase/proev-lancering-28-10.sql (15/15).
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';   // kl. 13 dansk tid
const DAGEN = '2026-08-07';
const ENGLISH = 99;
const TILKOEB = [
  { navn: 'Grønt', pris: 10 }, { navn: 'Ekstra spejlæg', pris: 10 },
  { navn: 'Bacon, 2 skiver', pris: 10 }, { navn: 'Pølser', pris: 10 },
  { navn: 'Bønner i tomat', pris: 10 },
];

function data(udenTilkoeb) {
  const d = grunddata();
  d.menu_kategorier.push({ id: 20, lokation_id: 'mosede', navn: 'Morgenmad', aktiv: true, sortering: 0, afdeling: 'mad' });
  d.menu_varer.push(
    { id: 201, kategori_id: 20, lokation_id: 'mosede', navn: 'English Breakfast', pris: ENGLISH,
      aktiv: true, udsolgt: false, sortering: 1, tilvalg: udenTilkoeb ? null : TILKOEB },
    { id: 202, kategori_id: 20, lokation_id: 'mosede', navn: 'Havnens All in One', pris: 40,
      aktiv: true, udsolgt: false, sortering: 2, tilvalg: null },
  );
  d.indstillinger.bestilbare_kategorier = [1, 20];
  d.indstillinger.bestilling_varsel_timer = 1;
  d.indstillinger.bestilling_min_stk = 1;
  return d;
}

const raekke = (page, navn) => page.locator('#bestil .item', { hasText: navn }).first();
/* Forsidens kategorier er en harmonika: retterne står, når kategorien er åbnet. */
async function aabnMorgenmad(page) {
  await page.locator('#bestil .item', { hasText: 'Morgenmad' }).first().click();
  await expect(raekke(page, 'English Breakfast')).toBeVisible();
}

test('tilkøbene står bag én knap på retten — og ikke løst i listen', async ({ page }) => {
  await åbnSkal(page, '/index.html', { ur: FREDAG, data: data() });
  await aabnMorgenmad(page);
  const r = raekke(page, 'English Breakfast');
  await expect(r.locator('.item-tilvalg-fold')).toContainText('Tilkøb til retten (5)');
  await expect(r.locator('[data-tilvalg="Grønt"]'), 'foldet sammen fra start').toBeHidden();
  await r.locator('.item-tilvalg-fold').click();
  await expect(r.locator('[data-tilvalg="Ekstra spejlæg"]')).toBeVisible();
  await expect(r.locator('[data-tilvalg="Ekstra spejlæg"]')).toContainText('10');
  // All in One har ingen tilkøb — og intet "Grønt" står løst nogen steder.
  await expect(raekke(page, 'Havnens All in One').locator('.item-tilvalg-fold')).toHaveCount(0);
});

test('English Breakfast + Grønt + Ekstra spejlæg og en ren All in One: to linjer, rigtig pris, tilkøbet på den rigtige', async ({ page, browser }) => {
  await åbnSkal(page, '/index.html', { ur: FREDAG, data: data() });
  await page.locator('#dato').selectOption(DAGEN);
  await aabnMorgenmad(page);
  const eng = raekke(page, 'English Breakfast');
  await eng.locator('.item-tilvalg-fold').click();
  await eng.locator('[data-tilvalg="Grønt"]').click();
  await eng.locator('[data-tilvalg="Ekstra spejlæg"]').click();
  await expect(eng.locator('.tag')).toContainText(String(ENGLISH + 20));
  await eng.locator('button[data-d="+"]').first().click();
  await raekke(page, 'Havnens All in One').locator('button[data-d="+"]').first().click();

  await page.locator('#navn').fill('Sara Poulsen');
  await page.locator('#tlf').fill('28871343');
  await page.locator('#tid').selectOption({ index: 1 });
  await page.locator('button.g.solid.blk').click();
  await expect(page.locator('.kvit-titel')).toBeVisible();

  const gemt = await gemteData(page);
  const b = (gemt.bestillinger || []).slice(-1)[0];
  const e = b.linjer.find((l) => l.navn === 'English Breakfast');
  const a = b.linjer.find((l) => l.navn === 'Havnens All in One');
  expect(e.tilvalg).toEqual(['Grønt', 'Ekstra spejlæg']);
  expect(e.pris).toBe(ENGLISH + 20);
  expect(a.tilvalg || [], 'All in One fik ikke andres tilkøb').toEqual([]);
  expect(b.linjer.some((l) => l.navn === 'Grønt'), 'intet løst "Grønt" på bonen').toBe(false);

  // Køkkenet ser, hvilken ret tilkøbet hører til.
  const admin = await (await browser.newContext()).newPage();
  await åbnAdmin(admin, { ur: FREDAG, data: gemt });
  await visFane(admin, 'p-borde');   // fanen hedder Køkkenet
  await expect(admin.locator('#p-borde')).toContainText(/English Breakfast · Grønt, Ekstra spejlæg|English Breakfast[^\n]*Grønt[^\n]*Ekstra spejlæg/);
});

test('admin: tilkøb skrives på retten med navn og pris — og gemmes', async ({ page }) => {
  await åbnAdmin(page, { ur: FREDAG, data: data(true) });
  await visFane(page, 'p-menu');
  await page.waitForSelector('#menu-status');
  const raek = page.locator('.vare-raekke[data-vare="201"]');
  if (await raek.locator('.vare-bag.skjult').count()) await raek.locator('.mere-knap').click();
  // En ret uden tilkøb har én lille knap — listen åbnes med den.
  await raek.locator('.vare-tilkoeb-ny').click();
  const boks = raek.locator('.vare-tilkoeb');
  await expect(boks).toBeVisible();
  await boks.locator('.tilvalg-navn').last().fill('Ekstra spejlæg');
  await boks.locator('.tilvalg-pris').first().fill('10');
  await boks.locator('button', { hasText: 'Gem tilkøbene' }).click();
  await expect(page.locator('#kvittering')).toContainText('English Breakfast har nu 1 tilkøb');
  const v = (await gemteData(page)).menu_varer.find((x) => x.id === 201);
  expect(v.tilvalg).toEqual([{ navn: 'Ekstra spejlæg', pris: 10 }]);
});
