// @ts-check
/* ============================================================
   LOADEREN — isvaflen på vej ind  (12/9)
   ------------------------------------------------------------
   Kundens egen fil: Desktop/CLAUDE - Loader.md. js/loader.js.

   ⚠️ PRØVERNE SLÅR navigator.webdriver FRA. Loaderen springer
   automatiserede browsere over, så resten af suiten ikke venter
   1,7 sekund pr. side — og så ville en prøve uden det her måle en
   side, gæsten aldrig ser. Det er den ENE forskel på prøven og
   gæsten, og den står ét sted: gæst().

   ⚠️ OG TIDERNE MÅLES AF EN IAGTTAGER PÅ document, IKKE PÅ <html>.
   Init-scriptet kører, FØR <html> findes — det ar har introprøven
   og filmprøven begge (10/9, 11/9).
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { lokalTilstand, sætUr, sætData, grunddata } = require('./hjaelp');

async function gæst(page, sti, { referer } = {}) {
  await page.addInitScript(() => {
    try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true }); } catch (e) {}
    try { Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true }); } catch (e) {}
    const hc = { ind: null, ud: null };
    // @ts-ignore
    window.__hc = hc;
    new MutationObserver(() => {
      const el = document.querySelector('.hc-load');
      if (el && hc.ind === null) hc.ind = performance.now();
      if (!el && hc.ind !== null && hc.ud === null) hc.ud = performance.now();
    }).observe(document, { childList: true, subtree: true });
  });
  await lokalTilstand(page);
  await sætUr(page, '2026-08-07T11:00:00Z');
  await sætData(page, grunddata());
  await page.goto(sti, referer ? { referer } : {});
}

const hc = (page) => page.evaluate(() => /** @type {any} */ (window).__hc);

test.describe('Loaderen', () => {

  test('en gæst udefra møder isvaflen — og den går igen', async ({ page }) => {
    await gæst(page, '/h-smorrebrod.html');
    const load = page.locator('.hc-load');
    await expect(load, 'loaderen kom aldrig').toHaveCount(1);

    /* Den dækker hele skærmen og siger intet — filens egne krav. */
    const mål = await load.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        b: Math.round(r.width), h: Math.round(r.height),
        vb: innerWidth, vh: innerHeight,
        tekst: el.textContent.trim(),
        rolle: el.getAttribute('role'),
        klip: document.querySelectorAll('#hcCup').length,
        viewBox: el.querySelector('svg').getAttribute('viewBox'),
      };
    });
    expect(mål.b).toBe(mål.vb);
    expect(mål.h).toBe(mål.vh);
    expect(mål.tekst, 'loaderen må ikke have tekst').toBe('');
    expect(mål.rolle).toBe('status');
    expect(mål.klip, 'clipPath-id\'et skal være unikt').toBe(1);
    expect(mål.viewBox).toBe('0 0 84 112');

    /* Og den går igen — efter mindst 1,2 s + udtoningen på .5, men
       aldrig efter loftet på 5 s. */
    await expect(load).toHaveCount(0, { timeout: 8000 });
    const t = await hc(page);
    expect(t.ud - t.ind, 'loaderen blinkede').toBeGreaterThanOrEqual(1650);
    expect(t.ud - t.ind, 'loaderen blev hængende').toBeLessThan(6500);
  });

  test('et klik rundt på siden har ingen loader', async ({ page, baseURL }) => {
    await gæst(page, '/h-selskaber.html', { referer: baseURL + '/m-menukort.html' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(300);
    await expect(page.locator('.hc-load')).toHaveCount(0);
    expect((await hc(page)).ind, 'loaderen var der et øjeblik').toBeNull();
  });

  test('forsiden med filmen har ingen loader — filmen ER åbningen', async ({ page }) => {
    await gæst(page, '/index.html');
    /* Vagten: uden filmens klasse målte prøven en side uden film. */
    await expect(page.locator('html')).toHaveClass(/film-aabner/);
    await page.waitForTimeout(300);
    expect((await hc(page)).ind).toBeNull();
  });

  test('forsiden uden film — et link med # — får loaderen', async ({ page }) => {
    await gæst(page, '/index.html#find');
    await expect(page.locator('html')).not.toHaveClass(/film-aabner/);
    await expect(page.locator('.hc-load')).toHaveCount(1);
  });

  test('ved reduceret bevægelse står isen fyldt med det samme', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gæst(page, '/h-catering.html');
    await expect(page.locator('.hc-load')).toHaveCount(1);
    await page.waitForTimeout(150);
    const stand = await page.evaluate(() => ({
      kugler: [...document.querySelectorAll('.hc-scoop')].map((g) => getComputedStyle(g).opacity),
      fyld: document.querySelector('.hc-track i').getBoundingClientRect().width,
      spor: document.querySelector('.hc-track').getBoundingClientRect().width,
    }));
    expect(stand.kugler).toEqual(['1', '1', '1']);
    expect(Math.round(stand.fyld)).toBe(Math.round(stand.spor));
  });

  test('en automatiseret browser får ingen loader', async ({ page }) => {
    /* Modstykket til gæst(): uden det kunne loaderen stå i hver
       eneste af husets prøver og gøre runden en time længere. */
    /* ⚠️ OG DEN MÅLTE INGENTING FØRST. toHaveCount(0) venter op til
       fem sekunder — og loaderen går af sig selv efter 1,7. Prøven
       bestod altså MED loaderen. Den spørger nu, om den NOGENSINDE
       kom, målt af en iagttager fra første billede. */
    await page.addInitScript(() => {
      const hc = { ind: null };
      // @ts-ignore
      window.__hc = hc;
      new MutationObserver(() => {
        if (document.querySelector('.hc-load') && hc.ind === null) hc.ind = performance.now();
      }).observe(document, { childList: true, subtree: true });
    });
    await lokalTilstand(page);
    await sætData(page, grunddata());
    await page.goto('/h-smorrebrod.html');
    expect((await hc(page)).ind, 'loaderen stod i en automatiseret browser').toBeNull();
  });

  /* Hver side i sitemappet har scriptet som det FØRSTE i <body> —
     listen læses af sitemappet, så en ny side ikke kan slippe forbi. */
  test('alle sider i sitemappet bærer loaderen først i body', () => {
    const rod = path.join(__dirname, '..');
    const kort = fs.readFileSync(path.join(rod, 'sitemap.xml'), 'utf8');
    const sider = [...kort.matchAll(/<loc>https?:\/\/[^/]+\/([^<]*)<\/loc>/g)]
      .map((m) => m[1] === '' ? 'index.html' : (m[1].endsWith('/') ? m[1] + 'index.html' : m[1]));
    expect(sider.length).toBeGreaterThanOrEqual(12);
    for (const f of sider) {
      const html = fs.readFileSync(path.join(rod, f), 'utf8');
      const efter = html.split(/<body[^>]*>/)[1] || '';
      expect(efter.trimStart(), f + ' har ikke loaderen først i body')
        .toMatch(/^<script src="(\.\.\/)?js\/loader\.js\?v=__V__"><\/script>/);
    }
  });
});
