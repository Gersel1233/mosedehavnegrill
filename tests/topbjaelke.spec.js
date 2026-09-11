/* ============================================================
   BJÆLKEN BLIVER LAVERE, NÅR DEN STÅR FAST  (11/9)
   ------------------------------------------------------------
   Kundens ord: bjælken med "Mosede Havnecafe" skal være "lidt
   mindre, når man scroller, så man kan se mere".

   To uafhængige ting, og begge skal holde:

   1) Den er LAVERE, når den står fast — målt på dens egen kasse
      før og efter.
   2) INTET UNDER DEN HOPPER. Bjælken er `sticky` og i FLOW, så dens
      højde bestemmer, hvor resten af siden begynder. Uden margenen
      i stilarket ville hele siden rykke op, i det sekund bjælken
      sætter sig fast. Målt på et element under den (offsetTop-kæden,
      som ikke ser transforms og ikke ser rulningen) — et spørgsmål
      til bjælken om dens egen margen ville bestå, også hvis tallet
      var forkert.

   ⚠️ TO SIDER, fordi bjælkens indhold er forskelligt: forsiden har
   ordmærket og burgeren, undersiderne pil og burger. En regel, der
   kun passede på ét indhold, ville hoppe på det andet.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, springIntroOver, rul } = require('./hjaelp');

for (const side of ['/index.html', '/h-selskaber.html']) {
  test('bjælken bliver lavere, når den står fast — og intet under den hopper · ' + side,
    async ({ page }, info) => {
      test.skip(info.project.name !== 'mobil', 'kundens ord gælder telefonen');
      await åbnSkal(page, side, { data: grunddata() });
      await springIntroOver(page);

      const maal = () => page.evaluate(() => {
        const bar = document.querySelector('.topbar');
        let y = 0;
        for (let e = document.querySelector('h1'); e; e = e.offsetParent) y += e.offsetTop;
        return { bar: Math.round(bar.getBoundingClientRect().height), h1: y, fast: bar.classList.contains('stuck') };
      });

      const foer = await maal();
      expect(foer.fast, 'bjælken stod fast fra start — prøven måler ingenting').toBe(false);
      await rul(page, 700);
      await expect(page.locator('.topbar')).toHaveClass(/stuck/);
      const efter = await maal();

      expect(efter.bar, `bjælken var ${foer.bar} px og står fast på ${efter.bar}`)
        .toBeLessThanOrEqual(foer.bar - 20);
      expect(Math.abs(efter.h1 - foer.h1),
        `indholdet under bjælken hoppede ${efter.h1 - foer.h1} px`).toBeLessThanOrEqual(1);
    });
}

/* ⚠️ FELTET VED KAMERAET FØLGER BJÆLKEN (11/9). Kundens skud fra hans
   iPhone viste CREME over filmen. To kilder, fordi Safari har skiftet:
   theme-color på ældre iPhones, sidens egen baggrund i iOS 26 (den
   læste IKKE theme-color — der stod rød, og feltet var creme). Prøven
   måler begge veje: mørkt øverst, creme når bjælken står fast, og
   mørkt igen tilbage i toppen — ellers ville en regel, der bare var
   mørk hele tiden, bestå. Kroppens farve måles kun på telefonen;
   computerens krop er artboardets mørke ramme i forvejen. */
test('feltet ved kameraet er mørkt over filmen og creme, når bjælken står fast', async ({ page }, info) => {
  await åbnSkal(page, '/index.html', { data: grunddata() });
  await springIntroOver(page);
  const mobil = info.project.name === 'mobil';
  const tone = () => page.evaluate(() => ({
    meta: document.querySelector('meta[name="theme-color"]').content,
    krop: getComputedStyle(document.body).backgroundColor,
  }));
  const t0 = await tone();
  expect(t0.meta).toBe('#0b0706');
  if (mobil) expect(t0.krop, 'kroppen er ikke mørk over filmen').toBe('rgb(11, 7, 6)');

  await rul(page, 700);
  await expect(page.locator('.topbar')).toHaveClass(/stuck/);
  await expect.poll(async () => (await tone()).meta).toBe('#fdf7ef');
  if (mobil) expect((await tone()).krop, 'kroppen blev ikke creme med bjælken').not.toBe('rgb(11, 7, 6)');

  await rul(page, 0);
  await expect(page.locator('.topbar')).not.toHaveClass(/stuck/);
  await expect.poll(async () => (await tone()).meta).toBe('#0b0706');
  if (mobil) expect((await tone()).krop).toBe('rgb(11, 7, 6)');
});

/* Og kun forsiden skifter: undersiderne har ingen film og intet
   data-fast, så deres farve står stille. */
test('en underside skifter ikke sin farve ved kameraet', async ({ page }) => {
  await åbnSkal(page, '/h-selskaber.html', { data: grunddata() });
  const foer = await page.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
  await rul(page, 700);
  await expect(page.locator('.topbar')).toHaveClass(/stuck/);
  const efter = await page.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
  expect(efter).toBe(foer);
});
