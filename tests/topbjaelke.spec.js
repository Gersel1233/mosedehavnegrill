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
