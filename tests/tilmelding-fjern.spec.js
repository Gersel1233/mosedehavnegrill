/* FJERN EN TILMELDING (4/11). Chefen: "hvad med at helt fjerne en tilmelding,
   hvis nu de ringer og aflyser bookingen?" ··· → Fjern — gæsten har aflyst:
   pladserne bliver fri, der sendes ingen sms (Afvis sender én), og den kan
   hentes tilbage fra Skraldespanden. */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const arr = { id: 31, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-21', slut_dato: null,
  titel: 'Fællesspisning', beskrivelse: null, emoji: null, lukker_kl: null, offentlig: true, tilmelding: true,
  pladser: 10, pris_tekst: null, start_kl: '18:00', slut_kl: null, billede: null, kategori: null, aflyst: false };
const res = (x) => Object.assign({ id: 1, lokation_id: 'mosede', kalender_id: 31, reference: 'RE-1', nummer: 6,
  navn: 'Joel', telefon: '22304644', email: null, antal_personer: 6, besked: null, status: 'ny',
  intern_note: null, slettet: null, oprettet: '2026-08-06T10:00:00Z' }, x);

test('··· → Fjern — gæsten har aflyst: væk fra listen, pladserne fri, og den kan hentes tilbage', async ({ page }) => {
  await åbnAdmin(page, { data: Object.assign(grunddata(), { kalender: [arr], reservationer: [res()] }) });
  await page.evaluate(() => Admin.visTilmeldinger(31));
  const kort = page.locator('#tilmeld-liste [data-res="1"]');
  await kort.locator('.knap-mere').click();
  let spurgt = '';
  page.once('dialog', (d) => { spurgt = d.message(); d.accept(); });
  await kort.locator('.bestil-mere button', { hasText: 'Fjern — gæsten har aflyst' }).click();
  await expect(page.locator('#kvittering')).toContainText('Joel er fjernet — pladserne er fri igen');
  expect(spurgt).toContain('Gæsten får ingen sms');
  await expect(kort).toHaveCount(0);
  const r = (await gemteData(page)).reservationer[0];
  expect(r.slettet).toBeTruthy();
  expect(r.status).toBe('ny');   // ikke "afvist" — den sender en sms

  // Skraldespanden viser den og kan hente den tilbage.
  await visFane(page, 'p-historik');
  await expect(page.locator('#skrald-hentet')).not.toBeEmpty();
  const s = page.locator('#skrald-liste .bestil-kort', { hasText: 'Joel' });
  await expect(s).toContainText('Tilmelding');
  await expect(s).toContainText('Fællesspisning');
  await s.locator('button', { hasText: 'Hent tilbage' }).click();
  await expect(page.locator('#kvittering')).toContainText('Tilmelding står på listen igen');
  await expect.poll(async () => (await gemteData(page)).reservationer[0].slettet).toBeNull();
});
