/* HANDELSBETINGELSERNE — ÉN GANG PR. ENHED  (14/9)

   Kundens ord: "når en device bestiller allerførste gang, skal man
   lige godkende, at man accepterer handelsbetingelserne og cookie …
   hvor de ikke behøver at læse dem, men bare lige: jeg accepterer."

   Reglen bor i `Butik.vilkaar` (js/store.js), og fem formularer
   spørger den. Prøverne går den vej, en gæst går, på de to motorer:
   js/bestilling.js (bestil/ og ved bordet) og js/skal/bestil.js
   (forsiden og smørrebrødssiden). Tapassiden deler reglen og
   kaldet med dem.

   ⚠️ DET ER IKKE ET COOKIESAMTYKKE — huset sætter ingen cookies
   (jura.spec.js). Prøven holder fast i, at linjen ikke siger
   "accepter cookies".

   ⚠️ ALLE ANDRE PRØVER BEGYNDER MED ET JA (tests/hjaelp.js, sætData),
   ellers ville hver send-prøve i huset vente på et flueben, den ikke
   handler om. Her fjernes det med førsteGang(). */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const {
  lokalTilstand, sætUr, sætData, førsteGang, springIntroOver, grunddata, gemteData,
} = require('./hjaelp');

const NOEGLE = 'mosede_vilkaar_v1';

async function åbnFørsteGang(page, sti, { ur = '2026-08-06T11:00:00Z', data = grunddata() } = {}) {
  await lokalTilstand(page);
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await sætUr(page, ur);
  await sætData(page, data);
  await førsteGang(page);
  await page.goto(sti);
  await springIntroOver(page);
}
const husket = (page) => page.evaluate((n) => localStorage.getItem(n), NOEGLE);

/* Smørrebrødssidens egne data (skal-smoerrebroed.spec.js): to
   kategorier, der kan bestilles, og et varsel, der tillader i dag. */
function smoerData() {
  const d = grunddata();
  d.indstillinger.bestilling_varsel_timer = 2;
  d.menu_kategorier = [{ id: 13, afdeling: 'mad', navn: 'Smørrebrød', sortering: 1, aktiv: true }];
  d.menu_varer = [{ id: 100, kategori_id: 13, navn: 'Rejemad', beskrivelse: null, pris: 55,
    fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true }];
  d.indstillinger.bestilbare_kategorier = [13];
  return d;
}

test.describe('Handelsbetingelserne første gang', () => {

  test('bestil/: fluebenet står over Send — uden det sendes intet, med det sendes og huskes', async ({ page }) => {
    await åbnFørsteGang(page, '/bestil/');
    await page.waitForSelector('#bestil-stykker .stk-linje');
    const ja = page.locator('[data-vilkaar]');
    await expect(ja).toHaveCount(1);
    /* Over send-knappen, ikke et andet sted på siden. */
    const foer = await page.evaluate(() => {
      const l = document.querySelector('[data-vilkaar]');
      return !!(l.compareDocumentPosition(document.getElementById('bestil-send'))
        & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(foer, 'fluebenet står ikke over Send').toBe(true);
    /* Stien er undermappens: linkene tages fra sidens egen linje. */
    await expect(ja.locator('a').nth(0)).toHaveAttribute('href', '../handelsbetingelser.html');
    await expect(ja.locator('a').nth(1)).toHaveAttribute('href', '../persondatapolitik.html');
    for (let i = 0; i < 2; i++) await expect(ja.locator('a').nth(i)).toHaveAttribute('target', '_blank');
    expect(await ja.innerText(), 'linjen beder om et cookiesamtykke').not.toMatch(/accepter (alle )?cookies/i);

    const op = page.locator('#bestil-stykker .stk-linje').first().locator('button', { hasText: '+' });
    for (let i = 0; i < 5; i++) await op.click();
    await page.fill('#bestil-navn', 'Mikkel Gersel');
    await page.fill('#bestil-telefon', '20304050');

    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-fejl')).toContainText('handelsbetingelserne');
    await expect(page.locator('#bestil-kig')).toBeHidden();
    expect(await husket(page), 'et nej blev husket som et ja').toBeNull();

    await ja.locator('input').check();
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-kig')).toBeVisible();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();
    expect((await gemteData(page)).bestillinger).toHaveLength(1);
    expect(await husket(page), 'jaet blev ikke husket').toMatch(/^\d{4}-\d{2}-\d{2}$/);

    /* Og næste gang spørges der ikke. */
    await page.reload();
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await expect(page.locator('[data-vilkaar]')).toHaveCount(0);
  });

  test('smørrebrødssiden: samme regel på den anden motor', async ({ page }) => {
    await åbnFørsteGang(page, '/h-smorrebrod.html', { ur: '2026-08-07T09:00:00Z', data: smoerData() });
    const ja = page.locator('#bestil [data-vilkaar]');
    await expect(ja).toHaveCount(1);
    await expect(ja.locator('a').nth(0)).toHaveAttribute('href', 'handelsbetingelser.html');

    const fold = page.locator('#bestil .item', { hasText: 'Smørrebrød' }).first();
    const tilfoej = fold.locator('[data-add]');
    await tilfoej.waitFor({ state: 'attached' });
    if ((await tilfoej.textContent()).indexOf('luk') === -1) await fold.click();
    const plus = page.locator('[data-vare="Rejemad"] button[data-d="+"]');
    await plus.waitFor({ state: 'visible' });
    for (let i = 0; i < 4; i++) await plus.click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');

    await page.locator('#ssend').click();
    await expect(page.locator('#bestil')).toContainText('handelsbetingelserne');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);

    await ja.locator('input').check();
    await page.locator('#ssend').click();
    await expect(page.locator('.kvit-tak')).toBeVisible();
    expect(await husket(page)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('en enhed, der har sagt ja, bliver ikke spurgt', async ({ page }) => {
    /* Den almindelige vej i husets prøver: sætData lægger et ja. */
    await lokalTilstand(page);
    await sætUr(page, '2026-08-06T11:00:00Z');
    await sætData(page, grunddata());
    await page.goto('/bestil/');
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await expect(page.locator('[data-vilkaar]')).toHaveCount(0);
  });

  test('persondatapolitikken siger, at jaet ligger i browseren', () => {
    const html = fs.readFileSync('persondatapolitik.html', 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    expect(html).toContain('Dit ja til handelsbetingelserne');
    expect(html).toContain('tre ting i din egen browser');
    expect(html, 'politikken lover stadig kun to ting').not.toContain('to ting i din egen browser');
  });
});
