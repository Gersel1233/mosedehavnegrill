/* ============================================================
   ARBEJDSOPGAVER MED INITIALER  (3/11, js/admin/opgaver.js)
   ------------------------------------------------------------
   Chefen: lister fra deres egne filer skal ind på iPad'en, så
   personalet hver dag kan sætte initialer ved det, de har gjort.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const MIG = 'test@lesreg.dk';
const UR = '2026-11-03T10:00:00Z';  // tirsdag 3/11 kl. 11
const DAG = '2026-11-03';

function data(rolle, ekstra) {
  const d = grunddata();
  d.personale = [{ email: MIG, lokation_id: 'mosede', rolle, aktiv: true, navn: 'Mig' }];
  return Object.assign(d, ekstra || {});
}
const LISTE = {
  opgavelister: [{ id: 1, lokation_id: 'mosede', navn: 'Lukning', ugedage: null, aktiv: true, raekkefoelge: 0,
    oprettet: '2026-11-01T08:00:00Z' }],
  opgaver: [
    { id: 11, lokation_id: 'mosede', liste_id: 1, tekst: 'Tøm opvaskemaskinen', raekkefoelge: 0, aktiv: true },
    { id: 12, lokation_id: 'mosede', liste_id: 1, tekst: 'Sluk grillen', raekkefoelge: 1, aktiv: true },
  ],
  opgave_udfoert: [],
};

test('chefen lægger en fil ind, og hver linje bliver en opgave', async ({ page }) => {
  await åbnAdmin(page, { ur: UR, data: data('ejer') });
  await visFane(page, 'p-opgaver');
  await page.locator('#opg-ny-fold summary').click();
  await page.locator('#opg-fil').setInputFiles({
    name: 'Rengøring.txt', mimeType: 'text/plain',
    buffer: Buffer.from('• Vask gulvet\n\n☐ Tør borde af\n3. Tøm skraldespande\n'),
  });
  await expect(page.locator('#opg-fil-status')).toContainText('3 opgaver fundet');
  await expect(page.locator('#opg-ny-navn')).toHaveValue('Rengøring');
  await expect(page.locator('#opg-ny-tekst')).toHaveValue('Vask gulvet\nTør borde af\nTøm skraldespande');
  await page.locator('#opg-opret').click();
  await expect(page.locator('#kvittering')).toContainText('Listen er oprettet');

  const g = await gemteData(page);
  expect(g.opgavelister.map((l) => l.navn)).toEqual(['Rengøring']);
  expect(g.opgaver.map((o) => o.tekst)).toEqual(['Vask gulvet', 'Tør borde af', 'Tøm skraldespande']);
  await expect(page.locator('#opg-dag .opg-liste', { hasText: 'Rengøring' })).toContainText('0/3');
});

test('personalet sætter initialer, og det gemmes med tid — og kan fortrydes', async ({ page }) => {
  await åbnAdmin(page, { ur: UR, data: data('medarbejder', LISTE) });
  await visFane(page, 'p-opgaver');
  await expect(page.locator('#opg-ret-kort'), 'personalet retter ikke listerne').toBeHidden();
  const r = page.locator('#opg-dag .opg-raekke', { hasText: 'Sluk grillen' });
  await r.locator('button', { hasText: 'Udført' }).click();
  await r.locator('input').fill('mk');
  await r.locator('button', { hasText: '✓ Udført' }).click();

  await expect(page.locator('#opg-dag .opg-raekke', { hasText: 'Sluk grillen' })).toContainText('✓ MK');
  await expect(page.locator('#opg-dag-tal')).toContainText('1 af 2 opgaver udført');
  const u = (await gemteData(page)).opgave_udfoert;
  expect(u).toHaveLength(1);
  expect(u[0]).toMatchObject({ opgave_id: 12, dato: DAG, initialer: 'MK', tekst: 'Sluk grillen', liste_navn: 'Lukning' });

  page.once('dialog', (d) => d.accept());
  await page.locator('#opg-dag .opg-raekke', { hasText: 'Sluk grillen' }).locator('button', { hasText: 'Fortryd' }).click();
  await expect(page.locator('#opg-dag .opg-raekke', { hasText: 'Sluk grillen' })).not.toContainText('✓');
  expect((await gemteData(page)).opgave_udfoert).toHaveLength(0);
});

test('uden initialer gemmes intet', async ({ page }) => {
  await åbnAdmin(page, { ur: UR, data: data('medarbejder', LISTE) });
  await visFane(page, 'p-opgaver');
  const r = page.locator('#opg-dag .opg-raekke', { hasText: 'Sluk grillen' });
  await r.locator('button', { hasText: 'Udført' }).click();
  await r.locator('input').fill('');
  await r.locator('button', { hasText: '✓ Udført' }).click();
  await expect(page.locator('#fejl')).toContainText('initialer');
  expect((await gemteData(page)).opgave_udfoert || []).toHaveLength(0);
});

test('dag for dag: i morgen er frisk og kan først udfyldes på dagen; Overblik tæller', async ({ page }) => {
  const d = data('ejer', Object.assign({}, LISTE, { opgave_udfoert: [
    { id: 1, lokation_id: 'mosede', opgave_id: 11, liste_id: 1, dato: DAG, tekst: 'Tøm opvaskemaskinen',
      liste_navn: 'Lukning', initialer: 'LK', udfoert: '2026-11-03T09:30:00Z' }] }));
  await åbnAdmin(page, { ur: UR, data: d });
  await expect(page.locator('#ob-opgaver-kort')).toBeVisible();
  await expect(page.locator('#ob-opgaver-tal')).toContainText('1 af 2 opgaver udført i dag');
  await page.locator('#ob-opgaver-aabn').click();
  await expect(page.locator('#p-opgaver')).not.toHaveClass(/skjult/);
  await expect(page.locator('#opg-dag .opg-raekke', { hasText: 'Tøm opvaskemaskinen' })).toContainText('✓ LK');
  await expect(page.locator('#opg-dag .opg-raekke', { hasText: 'Tøm opvaskemaskinen' })).toContainText('kl. 10.30');

  await page.locator('#opg-dag-naeste').click();
  await expect(page.locator('#opg-dag-navn')).toContainText('I MORGEN');
  await expect(page.locator('#opg-dag .opg-raekke', { hasText: 'Tøm opvaskemaskinen' })).not.toContainText('✓');
  await expect(page.locator('#opg-dag .opg-raekke').first()).toContainText('kan udfyldes på dagen');
});

test('eventudvalget ser ikke opgaverne', async ({ page }) => {
  await åbnAdmin(page, { ur: UR, data: data('arrangoer', LISTE) });
  await expect(page.locator('[data-panel="p-opgaver"]')).toBeHidden();
  await expect(page.locator('#ob-opgaver-kort')).toBeHidden();
});
