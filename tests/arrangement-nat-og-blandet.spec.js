/* ============================================================
   CHEFENS TO 2/11
   ------------------------------------------------------------
   *"Man kan ikke lægge et opslag på hjemmesiden, som slutter
   klokken 02.00. Og man kan ikke lave et blandet event, som både er
   musik og spisning."*

   1) 20.00–02.00 blev afvist ("sluttiden er før starttiden"). Nu er
      en sluttid før starttiden NATTEN TIL NÆSTE DAG: rækken får
      slut_dato = dagen efter, så tilmeldingsbremsen ikke lukker kl.
      02.00 samme dag — og siden viser det som én aften.
   2) "Musik & spisning" er sin egen knap og står under BÅDE Musik-
      og Spisning-filteret på kalendersiden.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, åbnSkal, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-11-02T11:00:00Z';
const DAG = '2026-11-14';

async function nytArrangement(page) {
  await åbnAdmin(page, { ur: UR, data: grunddata() });
  await visFane(page, 'p-nyheder');
  await page.locator('#nyhed-opret-arr').click();
  await expect(page.locator('#arr-form-kort')).toBeVisible();
}

const gemt = async (page) => ((await gemteData(page)).kalender || []).filter((k) => k.dato === DAG);

test('et arrangement 20.00–02.00 kan udgives og slutter natten til næste dag', async ({ page }) => {
  await nytArrangement(page);
  await page.locator('#arr-titel').fill('Fredagsbar til sent');
  await page.locator('#arr-dato').fill(DAG);
  await page.locator('#arr-start').fill('20:00');
  await page.locator('#arr-slut').fill('02:00');
  await expect(page.locator('#arr-slut-hjaelp')).toBeVisible();
  await page.locator('#arr-udgiv').click();

  await expect.poll(async () => (await gemt(page)).length, 'det blev ikke gemt').toBe(1);
  const k = (await gemt(page))[0];
  expect(String(k.start_kl).slice(0, 5)).toBe('20:00');
  expect(String(k.slut_kl).slice(0, 5)).toBe('02:00');
  expect(k.slut_dato, 'bremsen ville lukke tilmeldingen kl. 02 samme dag').toBe('2026-11-15');
});

test('en almindelig aften (18.00–22.00) får ingen dag efter', async ({ page }) => {
  await nytArrangement(page);
  await page.locator('#arr-titel').fill('Fællesspisning');
  await page.locator('#arr-dato').fill(DAG);
  await page.locator('#arr-start').fill('18:00');
  await page.locator('#arr-slut').fill('22:00');
  await expect(page.locator('#arr-slut-hjaelp')).toBeHidden();
  await page.locator('#arr-udgiv').click();
  await expect.poll(async () => (await gemt(page)).length).toBe(1);
  expect((await gemt(page))[0].slut_dato || null).toBe(null);
});

test('"Musik & spisning" kan vælges og gemmes', async ({ page }) => {
  await nytArrangement(page);
  await page.locator('#arr-titel').fill('Jazz og fiskebuffet');
  await page.locator('#arr-dato').fill(DAG);
  await page.locator('[data-kat="musik_spisning"]').click();
  await expect(page.locator('[data-kat="musik_spisning"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#arr-udgiv').click();
  await expect.poll(async () => (await gemt(page)).length).toBe(1);
  expect((await gemt(page))[0].kategori).toBe('musik_spisning');
});

const række = (æ) => Object.assign({
  id: 71, lokation_id: 'mosede', type: 'arrangement', dato: DAG, slut_dato: null,
  titel: 'Jazz og fiskebuffet', beskrivelse: 'Live jazz og buffet.', emoji: null,
  lukker_kl: null, offentlig: true, tilmelding: false, pladser: null,
  pris_tekst: null, start_kl: '20:00', slut_kl: null, kategori: 'musik_spisning',
}, æ);

test('kalendersiden: blandet står under både Musik og Spisning, og natten vises som én aften', async ({ page }) => {
  const d = grunddata();
  d.kalender = [
    række({ slut_kl: '02:00', slut_dato: '2026-11-15' }),
    række({ id: 72, titel: 'Fest i baglokalet', kategori: 'fest', start_kl: '19:00', slut_kl: '23:00' }),
  ];
  d.reservationer = [];
  await åbnSkal(page, '/h-kalender.html', { ur: UR, data: d });
  const blandet = page.locator('.evcard', { hasText: 'Jazz og fiskebuffet' });
  const fest = page.locator('.evcard', { hasText: 'Fest i baglokalet' });
  await expect(blandet).toBeVisible();
  await expect(blandet).toContainText('20.00–02.00');
  await expect(blandet).toContainText(/musik & spisning/i);

  const chip = (navn) => page.locator('.chipset[data-chips="single"] button', { hasText: new RegExp('^' + navn + '$') });
  for (const navn of ['Musik', 'Spisning']) {
    await chip(navn).click();
    await expect(blandet, 'mangler under ' + navn).toBeVisible();
    await expect(fest).toBeHidden();
  }
  await chip('Fest').click();
  await expect(blandet).toBeHidden();
  await expect(fest).toBeVisible();
});
