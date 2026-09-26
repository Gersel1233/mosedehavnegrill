/* ============================================================
   ADMIN SPØRGER, FØR DET GÅR GALT  (26/9)
   ------------------------------------------------------------
   Gennemgangen af admin fandt to ting i koden:
   · "✓ Færdig" på en bestilling til en SENERE dag satte den som
     afhentet uden at spørge — og så forsvandt den fra den dags
     Overblik, og køkkenet lavede den aldrig
   · Afvis på en bordbestilling uden nummer sagde "Husk at ringe
     til null"
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane, visAlleDage } = require('./hjaelp');

function b(id, dato, ekstra) {
  return Object.assign({
    id, lokation_id: 'mosede', reference: 'SM-B-' + id, navn: 'Sara Dam',
    telefon: '20304055', email: null, hent_dato: dato, hent_tid: '17:00',
    linjer: [{ navn: 'Stjerneskud', antal: 1, pris: 105 }], fyld: [], antal: 1,
    besked: null, status: 'bekraeftet', hvordan: 'afhentning',
    leverings_adresse: null, intern_note: null, slettet: null,
    oprettet: '2026-08-07T10:00:00Z',
  }, ekstra || {});
}

async function åbn(page, bestillinger) {
  const d = grunddata();
  d.bestillinger = bestillinger;
  await åbnAdmin(page, { data: d });
  await visFane(page, 'p-bestillinger');
}

test('"Færdig" på lørdagens bestilling spørger — og nej lader den stå', async ({ page }) => {
  await åbn(page, [b(5, '2026-08-08')]);
  if (typeof visAlleDage === 'function') await visAlleDage(page).catch(() => {});
  let spurgt = '';
  page.once('dialog', (d) => { spurgt = d.message(); d.dismiss(); });
  const knap = page.locator('[data-id="5"] button', { hasText: 'Færdig' }).first();
  await knap.click();
  await expect.poll(() => spurgt, { message: 'knappen spurgte ikke' }).toContain('ikke i dag');
  await page.waitForTimeout(300);
  expect((await gemteData(page)).bestillinger[0].status, 'et nej ændrede alligevel status').toBe('bekraeftet');
});

test('men dagens bestilling bliver færdig i ét tryk — uden spørgsmål', async ({ page }) => {
  /* Modstykket: ellers ville en regel, der spurgte om ALT, bestå. */
  await åbn(page, [b(6, '2026-08-07')]);
  let spurgt = false;
  page.on('dialog', (d) => { spurgt = true; d.dismiss(); });
  await page.locator('[data-id="6"] button', { hasText: 'Færdig' }).first().click();
  await expect.poll(async () => (await gemteData(page)).bestillinger[0].status).not.toBe('bekraeftet');
  expect(spurgt, 'dagens bestilling spurgte').toBe(false);
});

test('Afvis på en bordbestilling uden nummer siger, hvad man gør — ikke "null"', async ({ page }) => {
  await åbn(page, [b(7, '2026-08-07', { telefon: null, bord_nummer: '12', hvordan: 'spis_her', navn: 'Bord 12' })]);
  let spurgt = '';
  page.once('dialog', (d) => { spurgt = d.message(); d.dismiss(); });
  const kort = page.locator('[data-id="7"]').first();
  const mere = kort.locator('button[aria-expanded]').first();
  if (await mere.count()) await mere.click();
  await kort.locator('button', { hasText: 'Afvis' }).first().click();
  await expect.poll(() => spurgt).not.toBe('');
  expect(spurgt).not.toContain('null');
  expect(spurgt).toContain('bord 12');
});
