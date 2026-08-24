/* Ét site, ét tema.

   Menukortet kom med handoffet i sit eget v3-tema — sandfarvet
   grund, marineblåt sidehoved, Bebas Neue i overskrifterne — og
   stod som en fremmed side, man kom til fra forsidens største
   knap. Kundens ord (24/8): "hvorfor ser den her stadig sådan
   ud?"

   Prøverne herunder måler den BEREGNEDE værdi og ikke, hvad der
   står i et stylesheet. En overskrift kan sagtens have den
   rigtige regel og den forkerte skrift, hvis noget andet vinder
   i kaskaden — og det kan kun ses ved at spørge browseren. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

// Havnens farver, som de står i havnegrillen.css
const CREME = 'rgb(253, 247, 239)';
const RØD = 'rgb(214, 42, 58)';
const BLÆK = 'rgb(36, 26, 23)';

test.describe('Menukortet har havnens tema', () => {
  test('grunden er cremet, ikke sandfarvet', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    await expect(page.locator('#sc')).toHaveCSS('background-color', CREME);
  });

  test('overskrifterne er Instrument Serif, ikke Bebas Neue', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });

    const skrift = await page.locator('.phead h1').evaluate(
      (el) => getComputedStyle(el).fontFamily);
    expect(skrift).toContain('Instrument Serif');
    expect(skrift).not.toContain('Bebas');

    const afsnit = await page.locator('.msec h2').first().evaluate(
      (el) => getComputedStyle(el).fontFamily);
    expect(afsnit).toContain('Instrument Serif');
  });

  test('sidehovedet er havnens ternede bånd, ikke en marineblå blok', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });

    // Blokken selv er cremet nu; ternet ligger i ::before
    await expect(page.locator('.phead')).toHaveCSS('background-color', CREME);
    const tern = await page.locator('.phead').evaluate(
      (el) => getComputedStyle(el, '::before').backgroundImage);
    expect(tern).toContain('repeating-linear-gradient');
    // Manchetten står på cremen og skal være rød som på de andre sider
    await expect(page.locator('.phead .eyebrow')).toHaveCSS('color', RØD);
    await expect(page.locator('.phead h1')).toHaveCSS('color', BLÆK);
  });

  test('prisen er havnens røde, ikke marineblå Bebas', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });

    const pris = page.locator('.mi .pr').first();
    await expect(pris).toHaveCSS('color', RØD);
    const skrift = await pris.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(skrift).not.toContain('Bebas');
  });

  test('mærket i toppen er det samme som på de andre sider', async ({ page }) => {
    /* Logoet er det første, gæsten ser. Står der et andet mærke
       øverst, er det en anden side — uanset hvor ens resten er. */
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    await expect(page.locator('.topbar .crest')).toHaveCount(1);
    await expect(page.locator('.topbar .crest')).toBeVisible();
  });

  test('temaet gælder KUN menukortet', async ({ page }) => {
    /* Klassenavnene i menukort-tema.css (.phead, .topbar, .pr)
       betyder noget andet i havnegrillen.css. Kom filen med på en
       anden side, ville den lave den om. Scopet er body.kort. */
    await åbnSkal(page, '/h-smorrebrod.html', { data: grunddata() });
    const klasser = await page.locator('body').getAttribute('class');
    expect(klasser).not.toContain('kort');
  });
});
