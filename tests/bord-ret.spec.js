/* ============================================================
   RET EN BORDBOOKING  (3/11)
   ------------------------------------------------------------
   Chefen: *"Kan man ikke få lov at redigere en oprettet
   bordbooking??"* — og Mikkel: *"alt skal naturligvis komme ind i
   kalenderen og overblik"*.

   Prøverne måler: kortet bliver til en formular, kun det ændrede
   gemmes, bordet følger med (så databasen dømmer det igen), en
   forkert telefon afvises uden at gemme, Fortryd rører intet — og
   den rettede booking står på sin nye dag i Kalender og med sin nye
   tid i Overblik. Overblikket og Kalenderen fører hen til kortet.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-08-07T09:00:00Z';   // fredag 7/8, kl. 11 dansk tid
const I_DAG = '2026-08-07';

const BORDE = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 },
];

function booking(x) {
  return Object.assign({
    id: 1, nummer: 3, lokation_id: 'mosede', reference: 'BO260807-AAAAA',
    navn: 'Familien Sø', telefon: '20304060', email: null, dato: I_DAG, tid: '18:00',
    antal_personer: 4, besked: 'Barnevogn', status: 'ny', intern_note: null,
    bord_id: 1, slettet: null, oprettet: '2026-08-06T10:00:00Z',
  }, x);
}

async function aabn(page, bookinger) {
  const d = grunddata({ borde: BORDE, bordbestillinger: bookinger || [booking()] });
  await åbnAdmin(page, { ur: UR, data: d });
  return d;
}
const gemt = async (page) => (await gemteData(page)).bordbestillinger.find((b) => b.id === 1);

test('··· → Rediger booking: tid, antal og dag rettes på kortet og gemmes', async ({ page }) => {
  await aabn(page);
  await visFane(page, 'p-borde');
  const kort = page.locator('#borde-venter [data-id="1"]');
  await kort.locator('.knap-mere').click();
  await kort.locator('.bestil-mere button', { hasText: 'Rediger booking' }).click();

  await expect(kort).toContainText('Rediger booking');
  await expect(kort.locator('#ret-navn-1')).toHaveValue('Familien Sø');
  await expect(kort.locator('#ret-tid-1')).toHaveValue('18:00');

  await kort.locator('#ret-tid-1').fill('19:30');
  await kort.locator('#ret-antal-1').fill('6');
  await kort.locator('#ret-dato-1').fill('2026-08-08');
  await kort.locator('button', { hasText: 'Gem ændringer' }).click();

  await expect.poll(async () => (await gemt(page)).tid).toMatch(/^19:30/);
  const b = await gemt(page);
  expect(b.antal_personer).toBe(6);
  expect(b.dato).toBe('2026-08-08');
  expect(b.navn).toBe('Familien Sø');
  expect(b.bord_id, 'bordet skal følge med, så databasen dømmer det igen').toBe(1);
  expect(b.status, 'en rettelse er ikke et Ankommet').toBe('ny');

  // Kortet er tilbage som kort, med de nye tal.
  await expect(kort.locator('#ret-tid-1')).toHaveCount(0);
  await expect(kort).toContainText('19.30');
  await expect(kort).toContainText('6 personer');
});

test('en forkert telefon afvises og intet gemmes; Fortryd rører intet', async ({ page }) => {
  await aabn(page);
  await visFane(page, 'p-borde');
  const kort = page.locator('#borde-venter [data-id="1"]');
  await kort.locator('.knap-mere').click();
  await kort.locator('.bestil-mere button', { hasText: 'Rediger booking' }).click();
  await kort.locator('#ret-telefon-1').fill('123');
  await kort.locator('button', { hasText: 'Gem ændringer' }).click();
  await expect(page.locator('#fejl')).toBeVisible();
  expect((await gemt(page)).telefon).toBe('20304060');

  await kort.locator('button', { hasText: 'Fortryd' }).click();
  await expect(kort.locator('#ret-tid-1')).toHaveCount(0);
  await expect(kort).toContainText('20304060');
  expect((await gemt(page)).telefon).toBe('20304060');
});

test('Overblik: ··· → Rediger booking åbner formularen, og den nye tid står i Overblik bagefter', async ({ page }) => {
  await aabn(page);
  const raekke = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Familien Sø' });
  await expect(raekke).toContainText('18.00');
  await raekke.locator('.knap-mere').click();
  await raekke.locator('.bestil-mere button', { hasText: 'Rediger booking' }).click();

  await expect(page.locator('#p-borde')).not.toHaveClass(/skjult/);
  const kort = page.locator('#borde-venter [data-id="1"]');
  await expect(kort.locator('#ret-tid-1')).toBeVisible();
  await kort.locator('#ret-tid-1').fill('20:00');
  await kort.locator('button', { hasText: 'Gem ændringer' }).click();
  await expect.poll(async () => (await gemt(page)).tid).toMatch(/^20:00/);

  await visFane(page, 'p-overblik');
  const ny = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Familien Sø' });
  await expect(ny).toContainText('20.00');
});

test('Kalender: den rettede booking flytter dag, og linjen fører hen til kortet', async ({ page }) => {
  await aabn(page);
  await visFane(page, 'p-borde');
  const kort = page.locator('#borde-venter [data-id="1"]');
  await kort.locator('.knap-mere').click();
  await kort.locator('.bestil-mere button', { hasText: 'Rediger booking' }).click();
  await kort.locator('#ret-dato-1').fill('2026-08-12');
  await kort.locator('button', { hasText: 'Gem ændringer' }).click();
  await expect.poll(async () => (await gemt(page)).dato).toBe('2026-08-12');

  await visFane(page, 'p-kalender');
  await expect(page.locator('#maaned-net .maaned-dag[data-dag="2026-08-12"]')).toContainText(/1|bord/i);
  await page.locator('#maaned-net .maaned-dag[data-dag="2026-08-12"]').click();
  const linje = page.locator('[role="button"]', { hasText: 'Familien Sø' }).first();
  await expect(linje).toBeVisible();
  await linje.click();
  await expect(page.locator('#p-borde')).not.toHaveClass(/skjult/);
  await expect(page.locator('#borde-venter [data-id="1"]')).toBeInViewport();
});
