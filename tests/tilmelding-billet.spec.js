/* ============================================================
   TILMELDINGEN OG BILLETTEN  (28/10, aftenen før lanceringen)
   ------------------------------------------------------------
   Mikkels ord, samme aften:
   · *"alt det der med hvor vil I sidde, når man skriver sig op,
     skal væk eller administreres, når de opretter den — og hvilke
     slags pladser, og selv kunne personalisere dem"*
   · *"fjern også allergi fra der"*
   · *"prisen pr. billet skal stå tydeligt, og der skal også stå
     betales ved kassen — dette er en reservationsbillet — og afbud
     senest 24 timer inden, også nummer"*
   · fra iPad'en: *"højst hvad?"* og *"når man skriver noget nederst,
     scroller de op og hakker"*

   ⚠️ UREt står fredag 7. august 2026 kl. 13 dansk tid (hjaelp.js).
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const arr = (æ) => Object.assign({
  id: 41, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-21',
  slut_dato: null, titel: 'Fællesspisning på molen', beskrivelse: 'Langborde og fælles fad.',
  emoji: null, lukker_kl: null, offentlig: true, tilmelding: true, pladser: 40,
  pris_tekst: null, start_kl: '18:00', slut_kl: null, billede: null, kategori: null,
  sted_id: null, aflyst: false, aflyst_tekst: null, venteliste: false,
  max_pr_tilmelding: null, tilmelding_lukker_timer: null, bord_booking: false, serie: null,
  siddevalg: null,
}, æ);
const med = (k) => Object.assign(grunddata(), { kalender: [k], reservationer: [] });

async function kalenderen(page, k) {
  await åbnSkal(page, '/h-kalender.html', { data: med(k) });
  await page.locator('.evcard').first().waitFor({ state: 'attached' });
  const pille = page.locator('#bestil-pill');
  if (await pille.getAttribute('href') === '#reserver') await pille.click();
  await expect(page.locator('#reserver')).toBeVisible();
  await page.locator('#kvalg button').first().click();
}
async function tilmeld(page, antal) {
  await page.locator('#kantal').fill(String(antal || 2));
  await page.locator('#knavn').fill('Anna Vind');
  await page.locator('#ktlf').fill('20304050');
  await page.locator('#reserver button.g.solid.blk').click();
}

test.describe('Gæstens tilmelding', () => {
  test('der er intet allergifelt', async ({ page }) => {
    await kalenderen(page, arr());
    await expect(page.locator('#kallergi')).toHaveCount(0);
    await tilmeld(page);
    await expect.poll(async () => ((await gemteData(page)).reservationer || []).length).toBe(1);
    expect((await gemteData(page)).reservationer[0].besked || '').not.toMatch(/ALLERGI/);
  });

  test('uden pladser fra arrangøren bliver gæsten ikke spurgt, hvor de vil sidde', async ({ page }) => {
    await kalenderen(page, arr());
    await expect(page.locator('#kbord')).toBeHidden();
    await tilmeld(page);
    await expect.poll(async () => ((await gemteData(page)).reservationer || []).length).toBe(1);
    expect((await gemteData(page)).reservationer[0].besked || '').not.toMatch(/sidde/);
  });

  test('med arrangørens egne pladser vælger gæsten blandt dem — og svaret når personalet', async ({ page }) => {
    await kalenderen(page, arr({ siddevalg: ['Ved scenen', 'Langbord ude'] }));
    const sel = page.locator('#kbord');
    await expect(sel).toBeVisible();
    expect(await sel.locator('option').allTextContents()).toEqual(['Ved scenen', 'Langbord ude', 'Er lige meget']);
    await expect(sel).toHaveValue('Er lige meget');
    await sel.selectOption('Ved scenen');
    await tilmeld(page);
    await expect.poll(async () => ((await gemteData(page)).reservationer || [{}])[0]?.besked || '')
      .toContain('Vil gerne sidde: Ved scenen');
  });

  test('prisen pr. billet står, før gæsten skriver sig på', async ({ page }) => {
    await kalenderen(page, arr({ pris_tekst: '145 kr.' }));
    await expect(page.locator('#kpris')).toBeVisible();
    await expect(page.locator('#kpris')).toContainText('Pris: 145 kr. pr. billet');
    await expect(page.locator('#kpris')).toContainText('betales ved kassen');
  });

  test('uden en pris står der ingen prislinje', async ({ page }) => {
    await kalenderen(page, arr());
    await expect(page.locator('#kpris')).toBeHidden();
  });
});

test.describe('Billetten', () => {
  test('pris pr. billet, i alt ved kassen, reservationsbillet og afbud senest 24 timer før med nummer', async ({ page }) => {
    await kalenderen(page, arr({ pris_tekst: '145 kr.' }));
    await tilmeld(page, 3);
    const kv = page.locator('.kvit-tak');
    await expect(kv).toBeVisible();
    await expect(kv).toContainText('Billetnummer');
    await expect(kv).toContainText('Fællesspisning på molen');
    await expect(kv.locator('.kvit-linje', { hasText: 'Pris pr. billet' })).toContainText('145 kr.');
    await expect(kv.locator('.kvit-linje', { hasText: 'I alt ved kassen' })).toContainText('435 kr.');
    await expect(kv.locator('.kvit-vilkaar')).toContainText('Reservationsbillet — betales ved kassen');
    await expect(kv.locator('.kvit-vilkaar')).toContainText('senest 24 timer før');
    await expect(kv.locator('.kvit-vilkaar a[href^="tel:"]')).toBeVisible();
  });

  test('fri entré: ingen regnestykke, men stadig reservationsbillet', async ({ page }) => {
    await kalenderen(page, arr({ pris_tekst: 'fri entré' }));
    await tilmeld(page, 2);
    const kv = page.locator('.kvit-tak');
    await expect(kv.locator('.kvit-linje', { hasText: 'Pris pr. billet' })).toContainText('fri entré');
    await expect(kv.locator('.kvit-linje', { hasText: 'I alt' })).toHaveCount(0);
    await expect(kv.locator('.kvit-vilkaar')).toContainText('senest 24 timer før');
  });
});

test.describe('Arrangørens ark', () => {
  async function arket(page, k) {
    await åbnAdmin(page, { data: med(k) });
    await visFane(page, 'p-arrangementer');
    await page.locator('.arr-raekke', { hasText: k.titel }).getByRole('button', { name: 'Ret' }).click();
    await expect(page.locator('#arr-form-kort')).toBeVisible();
  }

  test('"Højst" siger, hvad det er', async ({ page }) => {
    await arket(page, arr());
    await expect(page.locator('label[for="arr-max"]')).toHaveText('Højst personer pr. tilmelding');
    await expect(page.locator('#arr-max-hjaelp')).toContainText('Tomt = 20');
  });

  test('pladserne skrives med komma og gemmes på arrangementet', async ({ page }) => {
    await arket(page, arr());
    await page.fill('#arr-sidde', 'Ved scenen, Langbord ude ,, er lige meget, Ved scenen');
    await page.locator('#arr-udgiv').click();
    await expect.poll(async () => (await gemteData(page)).kalender.find((x) => x.id === 41).siddevalg)
      .toEqual(['Ved scenen', 'Langbord ude']);
    // Og tømmes feltet, bliver gæsten ikke spurgt længere.
    await page.locator('.arr-raekke', { hasText: 'Fællesspisning' }).getByRole('button', { name: 'Ret' }).click();
    await expect(page.locator('#arr-sidde')).toHaveValue('Ved scenen, Langbord ude');
    await page.fill('#arr-sidde', '');
    await page.locator('#arr-udgiv').click();
    await expect.poll(async () => (await gemteData(page)).kalender.find((x) => x.id === 41).siddevalg).toBe(null);
  });

  /* ⚠️ ARKET STÅR STILLE, MENS DER SKRIVES. Før rullede rammens
     scrollIntoView også arket, 120 ms efter hvert tastetryk. */
  test('at skrive nederst i arket flytter ikke arket', async ({ page }) => {
    await arket(page, arr());
    const max = page.locator('#arr-max');
    await max.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const foer = await max.evaluate((e) => e.getBoundingClientRect().top);
    await max.click();
    await page.keyboard.type('6');
    await page.waitForTimeout(700);
    await page.fill('#arr-sidde', 'Ved scenen');
    await page.waitForTimeout(700);
    const efter = await max.evaluate((e) => e.getBoundingClientRect().top);
    expect(Math.abs(efter - foer), 'feltet flyttede sig under fingeren').toBeLessThan(2);
  });
});
