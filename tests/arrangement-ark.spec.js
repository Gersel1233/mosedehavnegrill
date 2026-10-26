/* ============================================================
   ARRANGEMENTET I ET ARK — MED SIDENS EGEN KALENDER VED SIDEN AF  (26/10)
   ------------------------------------------------------------
   Mikkel: *"det rigtig vigtigt at de ting kan administreres perfekt
   fra siden, især event-tingen, og det bliver flot på siden, når de
   laver changes"*.

   Prøverne måler det, arrangøren ser: kalendersiden i rammen er
   sidens egen (h-kalender.html?forhaand=1), den følger med, mens der
   skrives, og intet af det gemmes, før der trykkes. Arket må ikke
   tabe det skrevne ved et uheld, og forsiden siger ærligt, om
   arrangementet står der.

   ⚠️ UREt står fredag 7. august 2026 kl. 13 dansk tid (hjaelp.js).
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const arr = (æ) => Object.assign({
  id: 31, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-21',
  slut_dato: null, titel: 'Fredagsbar på molen', beskrivelse: 'Fadøl og musik på molen.',
  emoji: null, lukker_kl: null, offentlig: true, tilmelding: false, pladser: null,
  pris_tekst: null, start_kl: '19:00', slut_kl: '22:00', billede: null, kategori: null,
  sted_id: null, aflyst: false, aflyst_tekst: null, venteliste: false,
  max_pr_tilmelding: null, tilmelding_lukker_timer: null, bord_booking: false, serie: null,
}, æ);
const med = (kalender) => Object.assign(grunddata(), { kalender: kalender || [], reservationer: [] });

async function arbejdsbordet(page, data) {
  await åbnAdmin(page, { data });
  await visFane(page, 'p-arrangementer');
}
const ramme = (page) => page.frameLocator('#arr-forhaand iframe');
const række = (page, titel) => page.locator('.arr-raekke', { hasText: titel });

test('kalendersiden i arket er sidens egen og følger med, mens der skrives — uden at gemme', async ({ page }) => {
  await arbejdsbordet(page, med([arr(), arr({ id: 32, dato: '2026-08-28', titel: 'Quiz på havnen' })]));
  await række(page, 'Fredagsbar på molen').getByRole('button', { name: 'Ret' }).click();
  await expect(page.locator('#arr-form-kort')).toBeVisible();

  // Sidens egne opslag: billetten, nålen, Bebas — klassen .evcard fra js/skal/kalender.js.
  const mit = ramme(page).locator('.evcard.er-udkast');
  await expect(mit.locator('h3')).toHaveText('Fredagsbar på molen');
  await expect(ramme(page).locator('.evcard'), 'de andre arrangementer hænger der også').toHaveCount(2);

  await page.fill('#arr-titel', 'Fredagsbar med Danni');
  await page.fill('#arr-pris', 'fri entré');
  await expect(mit.locator('h3')).toHaveText('Fredagsbar med Danni');
  await expect(mit.locator('.kind')).toContainText('fri entré');
  await expect(ramme(page).locator('.evcard'), 'det gemte står ikke to gange').toHaveCount(2);

  // Flyttes datoen forbi quizzen, flytter opslaget med på tavlen.
  await page.fill('#arr-dato', '2026-09-04');
  await expect(ramme(page).locator('.evcard').last()).toHaveClass(/er-udkast/);

  // Intet af det er gemt.
  const gemt = await gemteData(page);
  expect(gemt.kalender.find((k) => k.id === 31).titel).toBe('Fredagsbar på molen');
});

test('et nyt arrangement hænger på tavlen, før det er udgivet — og kan ikke reserveres derfra', async ({ page }) => {
  await arbejdsbordet(page, med([]));
  await page.locator('#arr-ny').click();
  await expect(page.locator('#arr-forhaand-note')).toContainText('Skriv en titel');
  await page.fill('#arr-titel', 'Loppemarked');
  await page.fill('#arr-dato', '2026-08-15');
  await page.fill('#arr-start', '10:00');
  await page.locator('#arr-maade [data-maade="tilmelding"]').click();
  await page.fill('#arr-pladser', '40');

  const mit = ramme(page).locator('.evcard.er-udkast');
  await expect(mit.locator('h3')).toHaveText('Loppemarked');
  await expect(mit).toContainText('40 pladser tilbage');
  await expect(page.locator('#arr-forhaand-note')).toContainText('Står ikke på siden, før det er udgivet');
  // Rammen er en visning: sidens topbjælke, reservationen og bunden er væk, knappen gør intet.
  await expect(ramme(page).locator('.topbar')).toBeHidden();
  await expect(ramme(page).locator('#reserver')).toBeHidden();
  // På telefonen står siden under fanen «Se på siden».
  const fane = page.locator('#arr-form-faner [data-fane="se"]');
  if (await fane.isVisible()) await fane.click();
  await mit.locator('[data-pick]').click();
  await expect(ramme(page).locator('#reserver')).toBeHidden();
  expect((await gemteData(page)).kalender).toHaveLength(0);
});

test('forsiden siger ærligt, om det er dette arrangement, der står der', async ({ page }) => {
  await arbejdsbordet(page, med([arr({ id: 32, dato: '2026-08-14', titel: 'Musik på molen' })]));
  await page.locator('#arr-ny').click();
  await page.fill('#arr-titel', 'Høstfest');
  await page.fill('#arr-dato', '2026-09-12');
  await expect(page.locator('.arr-forside-hvad')).toContainText('Lige nu er det «Musik på molen» (14/8)');

  await page.fill('#arr-dato', '2026-08-08');
  await expect(page.locator('.arr-forside-hvad')).toContainText('Det bliver det næste');
  await expect(page.locator('.arr-kv-forside')).toContainText('Høstfest · lørdag d. 8. august');
  await expect(page.locator('.arr-kv-forside')).toContainText('Se kalenderen →');
});

test('Escape spørger, før det skrevne går tabt — Luk lukker', async ({ page }) => {
  await arbejdsbordet(page, med([arr()]));
  await række(page, 'Fredagsbar på molen').getByRole('button', { name: 'Ret' }).click();

  // Uden ændringer lukker Escape uden at spørge.
  let spurgt = 0;
  page.on('dialog', (d) => { spurgt++; d.dismiss(); });
  await page.keyboard.press('Escape');
  await expect(page.locator('#arr-form-kort')).toBeHidden();
  expect(spurgt).toBe(0);

  await række(page, 'Fredagsbar på molen').getByRole('button', { name: 'Ret' }).click();
  await page.fill('#arr-titel', 'Noget andet');
  await page.keyboard.press('Escape');
  await expect.poll(() => spurgt).toBe(1);
  await expect(page.locator('#arr-form-kort'), 'sagde man nej, står arket der stadig').toBeVisible();
  await expect(page.locator('#arr-titel')).toHaveValue('Noget andet');

  await page.locator('#arr-luk').click();
  await expect(page.locator('#arr-form-kort')).toBeHidden();
});

test('hele rækken åbner arrangementet, og ⋯ har resten', async ({ page }) => {
  await arbejdsbordet(page, med([arr()]));
  await række(page, 'Fredagsbar på molen').locator('.arr-titel').click();
  await expect(page.locator('#arr-form-titel')).toContainText('Ret "Fredagsbar på molen"');
  await page.locator('#arr-luk').click();

  const r = række(page, 'Fredagsbar på molen');
  await expect(r.locator('.arr-menu')).toBeHidden();
  await r.locator('.arr-mere-knap').click();
  await expect(r.locator('.arr-menu')).toBeVisible();
  await expect(r.locator('.arr-menu')).toContainText('Kopiér');
  await expect(r.locator('.arr-menu a', { hasText: 'Se på siden' })).toHaveAttribute('href', 'h-kalender.html#arr-31');
  // Et tryk ved siden af lukker menuen og åbner IKKE arrangementet under den.
  await page.mouse.click(5, 5);
  await expect(r.locator('.arr-menu')).toBeHidden();
  await expect(page.locator('#arr-form-kort')).toBeHidden();
});

test('kalendersiden med ?forhaand=1 uden for admin er bare kalendersiden', async ({ page }) => {
  await åbnSkal(page, '/h-kalender.html?forhaand=1', { data: med([arr()]) });
  await expect(page.locator('.evcard')).toHaveCount(1);
  await expect(page.locator('html')).not.toHaveClass(/arr-forhaand/);
  await expect(page.locator('.topbar')).toBeVisible();
  // Og et udkast sendt til en side, der ikke er en ramme, ændrer intet.
  await page.evaluate(() => window.postMessage({ type: 'mosede-arr-forhaand',
    k: { id: 99, titel: 'Falsk', dato: '2026-08-09', offentlig: true } }, location.origin));
  await page.waitForTimeout(300);
  await expect(page.locator('.evcard')).toHaveCount(1);
});
