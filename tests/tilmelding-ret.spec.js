/* RET EN TILMELDING (4/11). Mikkel: "man skal også kunne redigere bookinger
   i tilmeldinger hurtigt" — og et skærmbillede af kortet med ··· → Udeblev/Afvis. */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData } = require('./hjaelp');

const arr = { id: 31, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-21', slut_dato: null,
  titel: 'Fællesspisning', beskrivelse: null, emoji: null, lukker_kl: null, offentlig: true, tilmelding: true,
  pladser: 10, pris_tekst: null, start_kl: '18:00', slut_kl: null, billede: null, kategori: null, aflyst: false };
const res = (x) => Object.assign({ id: 1, lokation_id: 'mosede', kalender_id: 31, reference: 'RE-1', nummer: 6,
  navn: 'Joel', telefon: '22304644', email: null, antal_personer: 6, besked: null, status: 'ny',
  intern_note: null, slettet: null, oprettet: '2026-08-06T10:00:00Z' }, x);

async function aabn(page, reservationer) {
  await åbnAdmin(page, { data: Object.assign(grunddata(), { kalender: [arr], reservationer }) });
  await page.evaluate(() => Admin.visTilmeldinger(31));
  const kort = page.locator('#tilmeld-liste [data-res="1"]');
  await kort.locator('.knap-mere').click();
  await kort.locator('.bestil-mere button', { hasText: 'Rediger tilmelding' }).click();
  return kort;
}

test('··· → Rediger tilmelding: navn, antal og besked rettes', async ({ page }) => {
  const kort = await aabn(page, [res()]);
  await expect(kort.locator('#tret-navn-1')).toHaveValue('Joel');
  await kort.locator('#tret-navn-1').fill('Joel Hansen');
  await kort.locator('#tret-antal-1').fill('8');
  await kort.locator('#tret-besked-1').fill('2 vegetarer');
  await kort.locator('button', { hasText: 'Gem ændringer' }).click();
  await expect(page.locator('#kvittering')).toContainText('Tilmeldingen er ændret');
  const r = (await gemteData(page)).reservationer[0];
  expect(r).toMatchObject({ navn: 'Joel Hansen', antal_personer: 8, besked: '2 vegetarer', status: 'ny' });
  await expect(page.locator('#tilmeld-liste [data-res="1"]')).toContainText('8 personer');
});

test('flere end der er plads til: siger det og gemmer intet', async ({ page }) => {
  const kort = await aabn(page, [res(), res({ id: 2, reference: 'RE-2', nummer: 7, navn: 'Yvonne', telefon: '12345678', antal_personer: 3 })]);
  await kort.locator('#tret-antal-1').fill('9');
  await kort.locator('button', { hasText: 'Gem ændringer' }).click();
  await expect(page.locator('#fejl')).toContainText('ikke plads');
  expect((await gemteData(page)).reservationer[0].antal_personer).toBe(6);
});
