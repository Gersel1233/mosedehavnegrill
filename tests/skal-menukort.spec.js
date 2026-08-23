/* Menukortets kobling.

   m-menukort.html er leveret med hele kortet skrevet i
   menu-data.js. Den fil er nødmenuen nu — den skal stå, når
   databasen er væk, og forsvinde bag forretningens eget kort,
   når den er der. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

/* Se skal-forside.spec.js: de nye sider åbnes med åbnSkal. */
async function åbn(page, sti, valg) {
  await åbnSkal(page, sti, valg);
}

test.describe('Menukortets kobling', () => {
  test('forretningens eget kort erstatter nødmenuen', async ({ page }) => {
    await åbn(page, '/m-menukort.html');

    /* Kommer fra databasen (prøvedataene). Mønsteret er bundet i
       begge ender: hasText er en DELSTRENG, og kategorien "Vælg
       fyld til smørrebrødet" indeholder også ordet. Uden ^$ var
       prøven bestået af to overskrifter og havde ikke målt
       noget. */
    await expect(page.locator('.msec h2', { hasText: /^Smørrebrød$/ })).toHaveCount(1);
    await expect(page.locator('.mi', { hasText: 'Flæskestegssandwich' })).toHaveCount(1);

    // Nødmenuens egne kategorier må ikke stå tilbage ved siden af
    await expect(page.locator('.msec h2', { hasText: 'Mest bestilt' })).toHaveCount(0);
    await expect(page.locator('.mi', { hasText: 'Stjerneskud' })).toHaveCount(0);
  });

  test('kategori-pillerne følger med det nye kort', async ({ page }) => {
    await åbn(page, '/m-menukort.html');

    const piller = page.locator('#catrail .cat');
    await expect(piller).toHaveCount(4);
    await expect(piller.first()).toHaveText('Smørrebrød');
  });

  test('en vare uden pris siger spørg — ikke 0', async ({ page }) => {
    // 79 af forretningens varer har ikke fået en pris endnu.
    await åbn(page, '/m-menukort.html');

    const linje = page.locator('.mi', { hasText: 'Dyrlægens natmad' });
    await expect(linje.locator('.pr')).toHaveText('spørg');
    await expect(page.locator('.mi', { hasText: 'Flæskestegssandwich' }).locator('.pr'))
      .toHaveText('89,-');
  });

  test('udsolgte varer står ikke på kortet', async ({ page }) => {
    /* Designet har ingen udsolgt-tilstand, og at finde på en
       ville være at lave om på skallen. Et kort, der tilbyder
       noget, køkkenet ikke har, er værre end et kort med én ret
       mindre. */
    const data = grunddata();
    data.menu_varer[0].udsolgt = true;
    await åbn(page, '/m-menukort.html', { data });

    /* Den anden vare i samme kategori beviser, at kortet FAKTISK
       er skiftet ud. Uden den linje ville prøven også bestå på
       nødmenuen, hvor der slet ikke er nogen flæskestegssandwich
       — og så måler den ingenting. */
    await expect(page.locator('.mi', { hasText: 'Softice med guf' })).toHaveCount(1);
    await expect(page.locator('.mi', { hasText: 'Flæskestegssandwich' })).toHaveCount(0);
  });

  test('kurven virker efter kortet er skiftet ud', async ({ page }) => {
    /* Efter en ny tegning findes de gamle knapper ikke mere.
       Sættes kurven ikke på igen, kan gæsten trykke + uden at
       der sker noget — og det ses ikke ved at læse koden. */
    await åbn(page, '/m-menukort.html');

    await page.locator('.mi', { hasText: 'Flæskestegssandwich' }).locator('.plus').click();
    await expect(page.locator('#cartbar')).toHaveClass(/on/);
    await expect(page.locator('#cartbar .n')).toHaveText('1');
  });

  test('nødmenuen står, hvis databasen intet svarer', async ({ page }) => {
    const data = grunddata();
    data.menu_kategorier = [];
    data.menu_varer = [];
    await åbn(page, '/m-menukort.html', { data });

    // Et tomt kort må ikke tømme siden
    await expect(page.locator('.msec h2', { hasText: 'Mest bestilt' })).toHaveCount(1);
  });
});
