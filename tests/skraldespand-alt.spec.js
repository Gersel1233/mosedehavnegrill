/* ============================================================
   SKRALDESPANDEN TAGER ALT  (3/11)
   ------------------------------------------------------------
   Mikkel: *"alle slettede skal naturligvis ryge i skraldespanden,
   hvor alt skal ligge og gendannes"* — og *"når man sletter noget,
   skal kalenderen altså følge med"*.

   Øvetilstanden spejler udløseren til_skraldespand
   (supabase/skraldespand-alt-3-11.sql): et slettet arrangement er
   væk fra Arrangementer og kalenderen med det samme, står i
   Historik → Skraldespand, og kommer tilbage samme sted med ét tryk.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const arr = (æ) => Object.assign({
  id: 31, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-21',
  slut_dato: null, titel: 'Fredagsbar på molen', beskrivelse: 'Fadøl og musik.',
  emoji: null, lukker_kl: null, offentlig: true, tilmelding: false, pladser: null,
  pris_tekst: null, start_kl: '19:00', slut_kl: '22:00', billede: null, kategori: null,
  sted_id: null, aflyst: false, aflyst_tekst: null, venteliste: false,
  max_pr_tilmelding: null, tilmelding_lukker_timer: null, bord_booking: false, serie: null,
}, æ);

test('et slettet arrangement ligger i skraldespanden og kan hentes tilbage', async ({ page }) => {
  await åbnAdmin(page, { data: Object.assign(grunddata(), { kalender: [arr()], reservationer: [] }) });
  await visFane(page, 'p-arrangementer');
  const række = page.locator('.arr-raekke', { hasText: 'Fredagsbar på molen' });
  await række.locator('.arr-mere-knap').click();
  page.once('dialog', (d) => {
    expect(d.message()).toContain('Skraldespanden');
    d.accept();
  });
  await række.locator('.arr-menu button', { hasText: /^Slet$/ }).click();
  await expect(page.locator('#kvittering')).toContainText('Skraldespanden');
  await expect(række).toHaveCount(0);
  expect((await gemteData(page)).kalender).toHaveLength(0);

  // Kalenderen følger med: dagen har ikke længere arrangementet.
  await visFane(page, 'p-kalender');
  await expect(page.locator('#maaned-net')).not.toContainText('Fredagsbar');

  await visFane(page, 'p-historik');
  await expect(page.locator('#skrald-hentet')).not.toBeEmpty();
  const kort = page.locator('#skrald-liste .bestil-kort', { hasText: 'Fredagsbar på molen' });
  await expect(kort).toBeVisible();
  await expect(kort).toContainText('Arrangement');
  await kort.locator('button', { hasText: 'Hent tilbage' }).click();
  await expect(page.locator('#kvittering')).toContainText('hentet tilbage');
  await expect(kort).toHaveCount(0);

  const k = (await gemteData(page)).kalender;
  expect(k).toHaveLength(1);
  expect(k[0].id).toBe(31);
  expect(k[0].titel).toBe('Fredagsbar på molen');

  await visFane(page, 'p-arrangementer');
  await expect(page.locator('.arr-raekke', { hasText: 'Fredagsbar på molen' })).toBeVisible();
});

test('Slet for altid fjerner den fra spanden', async ({ page }) => {
  await åbnAdmin(page, { data: Object.assign(grunddata(), { kalender: [arr()], reservationer: [] }) });
  await visFane(page, 'p-arrangementer');
  const række = page.locator('.arr-raekke', { hasText: 'Fredagsbar på molen' });
  await række.locator('.arr-mere-knap').click();
  page.once('dialog', (d) => d.accept());
  await række.locator('.arr-menu button', { hasText: /^Slet$/ }).click();
  await expect(række).toHaveCount(0);

  await visFane(page, 'p-historik');
  // Spanden henter sig selv, når fanen åbnes — vent, til den har gjort det.
  await expect(page.locator('#skrald-hentet')).not.toBeEmpty();
  const kort = page.locator('#skrald-liste .bestil-kort', { hasText: 'Fredagsbar på molen' });
  await expect(kort).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await kort.locator('button', { hasText: 'Slet for altid' }).click();
  await expect(kort).toHaveCount(0);
  expect((await gemteData(page)).skraldespand_arkiv || []).toHaveLength(0);
});
