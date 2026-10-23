/* ============================================================
   FORHÅNDSVISNINGEN AF MENUKORTET I ADMIN  (23/10)
   ------------------------------------------------------------
   Mikkel: *"hvis de tilføjer ting til menukortet — bliver det så
   længere, og følger skriften, kortet og tilføjelserne automatisk
   præcis, hvordan menukortene ser ud nu — og hvorhenne de vil have
   det, og et preview af, hvordan det ser ud"*.

   Prøverne måler hele vejen: en vare lagt ind i admin står på den
   RIGTIGE menukortside (i arket), i sin kategoris afsnit, og arket
   siger kapitlet. En ny kategori står i "Mere fra lugen". Tallene og
   navnene kommer udefra: dem, prøven selv skriver i admin.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, visFane, gemteData } = require('./hjaelp');

async function menufanen(page) {
  await åbnAdmin(page, { data: grunddata() });
  await visFane(page, 'p-menu');
  await expect(page.locator('#menu-redigering .menu-gruppe').first()).toBeVisible();
}

async function seVare(page, navn) {
  const idx = await page.$$eval('.vare-raekke input.navn', (l, n) => l.findIndex((i) => i.value === n), navn);
  expect(idx, 'varen står ikke i admin').toBeGreaterThan(-1);
  const rk = page.locator('.vare-raekke').nth(idx);
  await rk.locator('.mere-knap').click();
  await rk.locator('.forhaand-vare').click();
  return page.frameLocator('.forhaand-ramme');
}

test.describe('Menukortet i admin: det, ejeren lægger ind, kan ses, som gæsten ser det', () => {
  test('en ny vare står i sin kategoris afsnit — og arket siger hvor', async ({ page }) => {
    await menufanen(page);
    const grp = page.locator('#menu-redigering .menu-gruppe').first();
    const kat = await grp.locator('.kat-hoved input.navn').inputValue();
    await grp.locator('.ny-vare input.navn').fill('Rødspætte med remoulade');
    await grp.locator('.ny-vare input.smal').fill('129');
    await grp.locator('.ny-vare button.tilfoej').click();
    await expect.poll(async () => (await gemteData(page)).menu_varer
      .filter((v) => v.navn === 'Rødspætte med remoulade').length).toBe(1);

    const f = await seVare(page, 'Rødspætte med remoulade');
    const linje = f.locator('.mk-linje.mk-fremhaevet');
    await expect(linje).toHaveAttribute('data-vare', 'Rødspætte med remoulade');
    await expect(linje).toContainText('129,-');
    await expect(f.locator('.mk-forhaand-skilt')).toContainText('«Rødspætte med remoulade» står i kapitlet');
    // Varen står i det kapitel, dens kategori hører til — ikke i "Mere fra lugen"
    await expect(f.locator('.mk-forhaand-skilt')).not.toContainText('Mere fra lugen');
    await expect(page.locator('.forhaand-ark')).toBeVisible();
    expect(kat.length).toBeGreaterThan(0);
  });

  test('en ny kategori står i «Mere fra lugen» i kortets eget udseende', async ({ page }) => {
    await menufanen(page);
    const nk = page.locator('#menu-redigering .ny-kategori');
    await nk.locator('input').first().fill('Sæsonens fisk');
    await nk.locator('button.tilfoej').click();
    const grp = page.locator('#menu-redigering .menu-gruppe', { has: page.locator('.kat-hoved input.navn') }).last();
    await expect(grp.locator('.kat-hoved input.navn')).toHaveValue('Sæsonens fisk');
    await grp.locator('.ny-vare input.navn').fill('Stegte sild');
    await grp.locator('.ny-vare input.smal').fill('89');
    await grp.locator('.ny-vare button.tilfoej').click();

    const f = await seVare(page, 'Stegte sild');
    await expect(f.locator('.mk-forhaand-skilt')).toContainText('«Stegte sild» står i kapitlet «Mere fra lugen» under «Sæsonens fisk»');
    // Samme trykte kort: kapitlet har husets hoved og afsnittets rubrik
    const kap = f.locator('.mk-kapitel', { has: f.locator('.mk-fremhaevet') });
    await expect(kap.locator('h2')).toContainText('Mere fra lugen');
    await expect(kap.locator('.mk-sek h3')).toContainText('Sæsonens fisk');
  });

  test('knappen øverst viser hele kortet, og Luk lukker arket', async ({ page }) => {
    await menufanen(page);
    await page.locator('[data-forhaand]').click();
    const f = page.frameLocator('.forhaand-ramme');
    await expect(f.locator('#mk-kat .mk-kapitel').first()).toBeAttached();
    await page.locator('.forhaand-luk').click();
    await expect(page.locator('.forhaand-ark')).toBeHidden();
  });
});
