/* MEDARBEJDERNE I OPGAVERNE (4/11). Mikkel: "de opretter medarbejdere derinde,
   som spiller sammen med systemet — primært opgaverne, når de lægger PDF'er ind." */
const path = require('path');
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData } = require('./hjaelp');

const UR = '2026-11-04T10:00:00Z';
function data(rolle, ekstra) {
  const d = grunddata();
  d.personale = [{ email: 'test@lesreg.dk', lokation_id: 'mosede', rolle, aktiv: true, navn: 'Mig' }];
  return Object.assign(d, ekstra || {});
}
const HOLD = [
  { id: 1, lokation_id: 'mosede', navn: 'Mikkel Kruse', initialer: 'MK', aktiv: true },
  { id: 2, lokation_id: 'mosede', navn: 'Lone Krogh', initialer: 'LK', aktiv: true },
];
const LISTE = {
  medarbejdere: HOLD,
  opgavelister: [{ id: 1, lokation_id: 'mosede', navn: 'Lukning', ugedage: null, aktiv: true, raekkefoelge: 0,
    ansvarlig_id: 2, oprettet: '2026-11-01T08:00:00Z' }],
  opgaver: [{ id: 11, lokation_id: 'mosede', liste_id: 1, tekst: 'Sluk grillen', raekkefoelge: 0, aktiv: true }],
  opgave_udfoert: [],
};

test('chefen opretter medarbejdere — initialerne foreslås, og dobbelte afvises', async ({ page }) => {
  await åbnAdmin(page, { ur: UR, data: data('ejer') });
  await page.evaluate(() => Admin.visFane('p-opgaver'));
  await expect(page.locator('#opg-hold-kort')).toBeVisible();
  await page.locator('#opg-hold-navn').fill('Mikkel Kruse');
  await expect(page.locator('#opg-hold-ini')).toHaveValue('MK');
  await page.locator('#opg-hold-tilfoej').click();
  await expect(page.locator('#kvittering')).toContainText('oprettet');
  await page.locator('#opg-hold-navn').fill('Maria Kjær');
  await page.locator('#opg-hold-tilfoej').click();
  await expect(page.locator('#fejl')).toContainText('MK bruges allerede');
  expect((await gemteData(page)).medarbejdere.map((m) => m.initialer)).toEqual(['MK']);
});

test('personalet trykker på sit navn — ét tryk, og den ansvarlige står først', async ({ page }) => {
  await åbnAdmin(page, { ur: UR, data: data('medarbejder', LISTE) });
  await page.evaluate(() => Admin.visFane('p-opgaver'));
  await expect(page.locator('#opg-hold-kort'), 'personalet retter ikke holdet').toBeHidden();
  await expect(page.locator('#opg-dag .opg-liste')).toContainText('👤 Lone Krogh');
  const r = page.locator('#opg-dag .opg-raekke', { hasText: 'Sluk grillen' });
  await r.locator('.opg-tryk').click();
  await expect(r.locator('.opg-person').first()).toContainText('LK');
  await r.locator('.opg-person', { hasText: 'Mikkel' }).click();
  await expect(page.locator('#opg-dag .opg-raekke.gjort', { hasText: 'Sluk grillen' })).toContainText('MK');
  await expect(page.locator('#opg-dag .opg-raekke.gjort', { hasText: 'Sluk grillen' })).toContainText('Mikkel');
  const u = (await gemteData(page)).opgave_udfoert[0];
  expect(u).toMatchObject({ initialer: 'MK', medarbejder_id: 1 });
});

test('en vikar uden for holdet skriver sine egne initialer', async ({ page }) => {
  await åbnAdmin(page, { ur: UR, data: data('medarbejder', LISTE) });
  await page.evaluate(() => Admin.visFane('p-opgaver'));
  const r = page.locator('#opg-dag .opg-raekke', { hasText: 'Sluk grillen' });
  await r.locator('.opg-tryk').click();
  await r.locator('button', { hasText: 'Andre initialer' }).click();
  await r.locator('.opg-ini-felt').fill('vk');
  await r.locator('button', { hasText: '✓ Udført' }).click();
  await expect(page.locator('#opg-dag .opg-raekke.gjort', { hasText: 'Sluk grillen' })).toContainText('VK');
});

test('chefen lægger en PDF ind og sætter en ansvarlig', async ({ page }) => {
  await åbnAdmin(page, { ur: UR, data: data('ejer', { medarbejdere: HOLD }) });
  await page.evaluate(() => Admin.visFane('p-opgaver'));
  await page.locator('#opg-ny-fold > summary').click();
  await page.locator('#opg-fil').setInputFiles(path.join(__dirname, 'filer-opgaver', 'Lukning.pdf'));
  await expect(page.locator('#opg-fil-status')).toContainText('3 opgaver fundet', { timeout: 15000 });
  await page.locator('#opg-udkast select[aria-label="Ansvarlig"]').selectOption({ label: 'Lone Krogh (LK)' });
  await page.locator('#opg-opret').click();
  await expect(page.locator('#kvittering')).toContainText('Listen er oprettet');
  expect((await gemteData(page)).opgavelister[0]).toMatchObject({ navn: 'Lukning', ansvarlig_id: 2 });
  await expect(page.locator('#opg-dag .opg-liste', { hasText: 'Lukning' })).toContainText('👤 Lone Krogh');
});
