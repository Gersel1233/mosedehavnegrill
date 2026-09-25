/* ============================================================
   TILBAGE LANDER, HVOR MAN VAR  (26/9)
   ------------------------------------------------------------
   Mikkels spørgsmål: *"hvad med når man trykker tilbage for hver
   enkelte side, skal man så bare ryge til toppen eller hvad"*.
   Svaret er nej, og reglen bor i js/tilbage.js.

   ⚠️ DATABASEN SVARER MED VILJE LANGSOMT HER (700 ms). Menukortet
   tegnes af JavaScript, når databasen har svaret; det er hele
   grunden til, at browserens egen gendannelse ikke rækker — den
   ruller, før kortet findes. Svarede databasen med det samme,
   ville prøven bestå uden modulet og måle ingenting.

   ⚠️ PLAYWRIGHT SLÅR BROWSERENS SIDE-HUKOMMELSE (bfcache) FRA, så
   goBack() indlæser siden på ny — det er netop den vej, gæsten
   går, når telefonen har smidt siden ud af hukommelsen.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { grunddata, sætUr } = require('./hjaelp');

const SKY = 'https://db.eksempel.test';
const UR = '2026-08-07T11:00:00Z';

async function medLangsomSky(page, forsinkelse = 700) {
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**/js/config.js*', (r) => r.fulfill({
    status: 200, contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD={url:'" + SKY + "',anonKey:'proeve'};",
  }));
  const d = grunddata();
  const svar = {
    lokationer: d.lokationer, aabningstider: d.aabningstider, kalender: [],
    menu_kategorier: d.menu_kategorier, menu_varer: d.menu_varer, nyheder: [],
    indstillinger: Object.keys(d.indstillinger).map((k) => ({ lokation_id: 'mosede', noegle: k, vaerdi: d.indstillinger[k] })),
    dagens_retter: [],
  };
  await page.route(SKY + '/**', async (r) => {
    const tabel = new URL(r.request().url()).pathname.split('/').pop();
    await new Promise((ok) => setTimeout(ok, forsinkelse));
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(svar[tabel] || []) });
  });
  await page.addInitScript(() => { try { localStorage.setItem('mosede_vilkaar_v1', 'ja'); } catch (e) {} });
  await sætUr(page, UR);
}

/* Mens tilbage-navigationen stadig er i gang, findes siden ikke at
   spørge; så svarer vi -1, og målingen prøver igen. */
const y = (page) => page.evaluate(() => Math.round(window.scrollY)).catch(() => -1);

/* Gæstesiderne læses af mappen: roden og undermapperne — men ikke
   admin, Googles fil, og vejviserne (en side, der kun sender videre). */
function gæstesider() {
  const rod = path.join(__dirname, '..');
  const ud = [];
  const erSide = (f) => !/http-equiv="refresh"/i.test(fs.readFileSync(path.join(rod, f), 'utf8'));
  for (const f of fs.readdirSync(rod)) {
    const p = path.join(rod, f);
    if (f.endsWith('.html') && !/^(admin|googlea)/.test(f) && erSide(f)) ud.push(f);
    else if (!f.startsWith('.') && fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'index.html'))
      && !/^(node_modules|tests|tests-gamle|overdragelse|vejledning|docs|test-results|playwright-report|print)$/.test(f)
      && erSide(f + '/index.html')) ud.push(f + '/index.html');
  }
  return ud;
}

test.describe('Tilbage lander, hvor man var', () => {
  test('hver gæsteside har reglen', () => {
    const sider = gæstesider();
    /* Et tal udefra: mindst forsiden, menukortet, tapas og bestil/. */
    expect(sider).toEqual(expect.arrayContaining(['index.html', 'm-menukort.html', 'm-tapas.html', 'bestil/index.html']));
    const mangler = sider.filter((f) => !/js\/tilbage\.js/.test(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')));
    expect(mangler, 'en gæsteside lander i toppen, når man går tilbage').toEqual([]);
  });

  test('menukortet — tegnet af JavaScript — lander, hvor man var', async ({ page }) => {
    await medLangsomSky(page);
    await page.goto('/m-menukort.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#mk-kat .panel').nth(3)).toBeAttached({ timeout: 10000 });
    const maal = await page.evaluate(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const v = Math.min(1800, max - 50);
      scrollTo(0, v);
      return Math.round(scrollY);
    });
    expect(maal, 'menukortet er ikke højt nok til at måle på').toBeGreaterThan(600);
    await page.waitForTimeout(400);           // positionen gemmes 120 ms efter rulningen

    await page.goto('/m-tapas.html', { waitUntil: 'domcontentloaded' });
    await page.goBack({ waitUntil: 'domcontentloaded' });

    await expect.poll(() => y(page), { timeout: 6000, message: 'tilbage landede ikke, hvor gæsten var' })
      .toBeGreaterThan(maal - 40);
    expect(await y(page)).toBeLessThan(maal + 40);
  });

  test('et nyt klik ind på siden begynder i toppen', async ({ page }) => {
    await medLangsomSky(page, 50);
    await page.goto('/m-menukort.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#mk-kat .panel').nth(3)).toBeAttached({ timeout: 10000 });
    await page.evaluate(() => scrollTo(0, 900));
    await page.waitForTimeout(300);
    await page.goto('/m-tapas.html', { waitUntil: 'domcontentloaded' });
    await page.goto('/m-menukort.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#mk-kat .panel').nth(3)).toBeAttached({ timeout: 10000 });
    await page.waitForTimeout(500);
    expect(await y(page), 'en ny sidevisning arvede den gamles plads').toBe(0);
  });

  test('pilen øverst går et skridt tilbage — ikke til forsiden', async ({ page, baseURL }) => {
    await medLangsomSky(page, 50);
    await page.goto('/m-menukort.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#mk-kat .panel').nth(3)).toBeAttached({ timeout: 10000 });
    /* Gæsten kom fra menukortet — document.referrer siger det. */
    await page.goto('/m-tapas.html', { waitUntil: 'domcontentloaded', referer: baseURL + '/m-menukort.html' });
    await page.locator('a[data-tilbage]').click();
    await expect(page).toHaveURL(/m-menukort\.html$/);
    /* Og det var ET SKRIDT TILBAGE, ikke et nyt: frem fører til tapas. */
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/m-tapas\.html$/);
  });

  test('kom man udefra, fører pilen til forsiden', async ({ page }) => {
    await medLangsomSky(page, 50);
    await page.goto('/m-tapas.html', { waitUntil: 'domcontentloaded', referer: 'https://www.google.com/' });
    await page.locator('a[data-tilbage]').click();
    await expect(page).toHaveURL(/index\.html$/);
  });

  test('forsidens film spiller ikke forfra, når man går tilbage til den', async ({ page }) => {
    /* Klassen film-aabner lever kun, til filmen er gået i gang — så
       prøven noterer, om den NOGENSINDE blev sat, fra første øjeblik. */
    await page.addInitScript(() => {
      window.__film = false;
      /* Hele dokumentet, ikke <html>: når init-scriptet kører, er
         <html> endnu ikke læst, og en iagttager på null ser ingenting. */
      new MutationObserver(() => {
        if (document.documentElement && document.documentElement.classList.contains('film-aabner')) window.__film = true;
      }).observe(document, { attributes: true, subtree: true, attributeFilter: ['class'] });
    });
    await medLangsomSky(page, 50);
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    /* Tallet udefra: ved en ankomst SKAL filmen være der — ellers
       måler prøven nedenfor ingenting. */
    expect(await page.evaluate(() => window.__film), 'filmen spiller ikke engang ved en ankomst').toBe(true);
    await page.goto('/m-tapas.html', { waitUntil: 'domcontentloaded' });
    await page.goBack({ waitUntil: 'load' });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__film), 'filmen spillede forfra, da gæsten gik tilbage').toBe(false);
  });

  test('isvaflen (loaderen) kommer ikke igen, når man går tilbage', async ({ page, baseURL }) => {
    /* Loaderen springer over i en automatiseret browser — samme greb
       som tests/loader.spec.js for at gå gæstens vej.

       ⚠️ PRØVEN NOTERER, OM DEN NOGENSINDE VISTES — ikke om den står
       der nu. Første udgave spurgte `toHaveCount(0)`, og det venter
       Playwright på: isvaflen forsvinder af sig selv efter højst 5
       sekunder, så prøven bestod OGSÅ uden værnet. Set 26/9. */
    await page.addInitScript(() => {
      try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true }); } catch (e) {}
      try { Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true }); } catch (e) {}
      window.__loader = false;
      new MutationObserver(() => { if (document.querySelector('.hc-load')) window.__loader = true; })
        .observe(document, { childList: true, subtree: true });
    });
    await medLangsomSky(page, 50);
    await page.goto('/m-menukort.html', { waitUntil: 'domcontentloaded', referer: 'https://www.google.com/' });
    /* Tallet udefra: ved ankomsten fra Google SKAL den vises. */
    expect(await page.evaluate(() => window.__loader), 'loaderen vises ikke engang ved en ankomst').toBe(true);
    await page.goto('/m-tapas.html', { waitUntil: 'domcontentloaded', referer: baseURL + '/m-menukort.html' });
    await page.goBack({ waitUntil: 'load' });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__loader), 'isvaflen kom igen ved tilbage').toBe(false);
  });
});
