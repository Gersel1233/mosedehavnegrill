/* ============================================================
   RABATKODER TIL AFTALE-KUNDER  (28/10)
   ------------------------------------------------------------
   Mikkel: dem, der har en ordning med huset, skal kunne få lidt
   rabat på smørrebrød ud af huset — og det skal kunne styres.
   Hans valg: en rabatkode. Databasens halvdel er
   supabase/proev-rabatkoder-28-10.sql (17/17); her måles skærmene:
   admin laver koden, gæsten bruger den, og lugen ser rabatten.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-08-06T11:00:00Z';
const KODE = { id: 1, lokation_id: 'mosede', kode: 'GREVE10', navn: 'Greve Kommune', procent: 10, aktiv: true };

async function bestilSiden(page, data) {
  await åbn(page, '/bestil/', { ur: UR, data });
  await page.waitForSelector('#bestil-stykker .stk-linje');
  const op = page.locator('#bestil-stykker .stk-linje').first().locator('button', { hasText: '+' });
  await op.click();
  await op.click();
  await page.fill('#bestil-navn', 'Ole Aftale');
  await page.fill('#bestil-telefon', '20304050');
}
async function skrivKode(page, kode) {
  await page.locator('#bestil-rabat summary').click();
  await page.fill('#bestil-rabatkode', kode);
  await page.locator('#bestil-rabat-tjek').click();
}

test.describe('Gæsten med en aftale', () => {
  test('koden giver rabatten — på kigget, på kvitteringen og på rækken', async ({ page }) => {
    await bestilSiden(page, Object.assign(grunddata(), { rabatkoder: [KODE] }));
    await skrivKode(page, 'greve10');
    await expect(page.locator('#bestil-rabat-svar')).toContainText('Greve Kommune — 10 % rabat');

    await page.locator('#bestil-send').click();
    const kig = page.locator('#bestil-kig');
    await expect(kig).toBeVisible();
    await expect(kig).toContainText('Aftale: Greve Kommune (10 %)');
    await expect(kig).toContainText('Til betaling');
    await page.locator('#kig-send').click();
    await expect(page.locator('.kvit-tak, #bestil-tak').first()).toContainText('Til betaling ved lugen');

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.rabat_kode).toBe('GREVE10');
    const sum = b.linjer.reduce((s, l) => s + (l.pris || 0) * l.antal, 0);
    expect(b.rabat_kr).toBe(Math.round(sum * 0.1));
    expect(b.rabat_navn).toBe('Greve Kommune');
  });

  test('en forkert kode siges med det samme — og bestillingen sendes ikke med den', async ({ page }) => {
    await bestilSiden(page, Object.assign(grunddata(), { rabatkoder: [KODE] }));
    await skrivKode(page, 'GAETTET');
    await expect(page.locator('#bestil-rabat-svar')).toContainText('passer ikke');
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-fejl')).toContainText('Rabatkoden passer ikke');
    await expect(page.locator('#bestil-kig')).toBeHidden();
    expect(((await gemteData(page)).bestillinger || []).length).toBe(0);
  });

  test('en slukket kode virker ikke', async ({ page }) => {
    await bestilSiden(page, Object.assign(grunddata(), { rabatkoder: [{ ...KODE, aktiv: false }] }));
    await skrivKode(page, 'GREVE10');
    await expect(page.locator('#bestil-rabat-svar')).toContainText('passer ikke');
  });

  test('uden kode er alt som før', async ({ page }) => {
    await bestilSiden(page, Object.assign(grunddata(), { rabatkoder: [KODE] }));
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-kig')).not.toContainText('Aftale: ');
    await page.locator('#kig-send').click();
    await expect.poll(async () => ((await gemteData(page)).bestillinger || []).length).toBe(1);
    expect((await gemteData(page)).bestillinger[0].rabat_kr || null).toBe(null);
  });
});

test.describe('Admin', () => {
  test('en kode laves, slukkes og tændes på Bestillinger', async ({ page }) => {
    await åbnAdmin(page, { data: Object.assign(grunddata(), { rabatkoder: [] }) });
    await visFane(page, 'p-bestillinger');
    await expect(page.locator('#rabat-kort')).toBeVisible();
    await page.fill('#rabat-navn', 'Greve Kommune');
    await page.fill('#rabat-kode', 'greve 10');
    await page.fill('#rabat-procent', '10');
    await page.locator('#rabat-tilfoej').click();
    await expect(page.locator('#rabat-liste [data-rabat="GREVE10"]')).toContainText('Greve Kommune');
    await expect(page.locator('#rabat-navn')).toHaveValue('');
    expect((await gemteData(page)).rabatkoder[0]).toMatchObject({ kode: 'GREVE10', procent: 10, aktiv: true });

    await page.locator('#rabat-liste [data-rabat="GREVE10"]').getByRole('button', { name: /Sluk/ }).click();
    await expect.poll(async () => (await gemteData(page)).rabatkoder[0].aktiv).toBe(false);
    await expect(page.locator('#rabat-liste [data-rabat="GREVE10"]')).toContainText('slukket');
  });

  test('over 50 % afvises — og det skrevne bliver stående', async ({ page }) => {
    await åbnAdmin(page, { data: Object.assign(grunddata(), { rabatkoder: [] }) });
    await visFane(page, 'p-bestillinger');
    await page.fill('#rabat-navn', 'For gavmild');
    await page.fill('#rabat-kode', 'HALVT');
    await page.fill('#rabat-procent', '60');
    await page.locator('#rabat-tilfoej').click();
    await expect(page.locator('#fejl')).toContainText('mellem 1 og 50');
    await expect(page.locator('#rabat-navn')).toHaveValue('For gavmild');
  });

  test('lugen ser rabatten og beløbet, der skal betales', async ({ page }) => {
    const d = grunddata();
    d.bestillinger = [{
      id: 9, reference: 'SM-RABAT', lokation_id: 'mosede', navn: 'Ole Aftale', telefon: '20304050',
      hent_dato: '2026-08-07', hent_tid: '12:00:00', hvordan: 'afhentning', kanal: 'bestil',
      linjer: [{ navn: 'Flæskestegssandwich', antal: 2, pris: 89 }, { navn: 'Smørrebrød', antal: 2, pris: 55 }],
      fyld: [], antal: 4, status: 'ny', oprettet: '2026-08-06T10:00:00Z',
      rabat_kode: 'GREVE10', rabat_navn: 'Greve Kommune', rabat_procent: 10, rabat_kr: 29,
    }];
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-bestillinger');
    const kort = page.locator('#p-bestillinger').getByText('Aftale: Greve Kommune (10 %, GREVE10)');
    await expect(kort.first()).toBeVisible();
    await expect(page.locator('#p-bestillinger .bestil-sum', { hasText: 'Til betaling' }).first()).toContainText('259');
  });
});
