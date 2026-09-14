// @ts-check
/* MENUKNAPPEN OG SKUFFEN (14/9). Kundens ord: "de der tre-linjer knap …
   den er grim, gennemsigtig, uoverskuelig — og når man slider ned på
   telefonen, slider man end på hjemmesiden".

   MÅLT FØR, på en iPhone 13:
   · skuffen var højere end skærmen, og de øverste punkter (Forside,
     Menukort, Tapas) stod OVER skærmens kant — de kunne ikke nås
   · den var glas (.76 + blur), så det bagved skinnede igennem teksten
   · et rul i den åbne menu flyttede siden bagved 1.200 px

   Siderne læses af MAPPEN: en ny side med en burger kommer med af sig
   selv. */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, grunddata, rul, springIntroOver } = require('./hjaelp');

const ROD = path.join(__dirname, '..');
const DESIGN = fs.readdirSync(ROD)
  .filter((f) => f.endsWith('.html'))
  .filter((f) => /id="burger"/.test(fs.readFileSync(path.join(ROD, f), 'utf8')))
  .map((f) => '/' + f);
const GAMLE = ['/bord/', '/bestil/'];

/* Alfa af en beregnet farve. "rgb(…)" er helt dækkende. */
const alfa = (farve) => {
  const m = String(farve).match(/rgba?\(([^)]+)\)/);
  if (!m) return 0;
  const d = m[1].split(/[,/]/).map((x) => x.trim());
  return d.length > 3 ? +d[3] : 1;
};

async function åbnSide(page, side) {
  await åbnSkal(page, side, { data: grunddata() });
  if (side === '/index.html') await springIntroOver(page);
}

test('vagt: der ER designsider med en burger', () => {
  expect(DESIGN.length, DESIGN.join(', ')).toBeGreaterThanOrEqual(10);
});

for (const side of DESIGN) {
  test(`${side}: knappen er et fast felt, der siger "Menu"`, async ({ page }) => {
    await åbnSide(page, side);
    const s = await page.locator('#burger').evaluate((e) => {
      const c = getComputedStyle(e);
      return { bg: c.backgroundColor, efter: getComputedStyle(e, '::after').content, blur: c.backdropFilter };
    });
    expect(alfa(s.bg), 'knappen er gennemsigtig: ' + s.bg).toBe(1);
    expect(s.blur, 'glas bag en fast flade er spild').toBe('none');
    expect(s.efter, 'ordet står der ikke').toBe('"Menu"');
  });

  test(`${side}: skuffen står helt på skærmen, og det første punkt kan trykkes`, async ({ page }) => {
    await åbnSide(page, side);
    await page.locator('#burger').click();
    await expect(page.locator('#sheet')).toHaveClass(/open/);
    /* Vent på, at arket STÅR. Målt midt i sin glidning stak det 9 px ud
       under skærmen, mens skuddet bagefter viste det helt inde. */
    await expect.poll(() => page.locator('#sheet .sheet-in').evaluate((e) => getComputedStyle(e).transform), { timeout: 3000 })
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    const r = await page.evaluate(() => {
      const ind = document.querySelector('#sheet .sheet-in');
      const i = ind.getBoundingClientRect();
      const a = document.querySelector('#sheet nav a');
      const ar = a.getBoundingClientRect();
      const ramt = document.elementFromPoint(ar.left + ar.width / 2, ar.top + ar.height / 2);
      return {
        top: i.top, bund: i.bottom, h: innerHeight,
        ramt: !!ramt && (ramt === a || a.contains(ramt)),
        tekst: a.textContent.trim(),
        bg: getComputedStyle(ind).backgroundColor,
      };
    });
    expect(r.top, 'arket stikker op over skærmen').toBeGreaterThanOrEqual(0);
    expect(r.bund, 'arket stikker ud under skærmen').toBeLessThanOrEqual(r.h + 1);
    expect(r.ramt, `det første punkt ("${r.tekst}") kan ikke rammes`).toBe(true);
    expect(alfa(r.bg), 'arket er glas: ' + r.bg).toBe(1);

    /* Escape lukker — og låsen går af med den. */
    await page.keyboard.press('Escape');
    await expect(page.locator('#sheet')).not.toHaveClass(/open/);
    expect(await page.evaluate(() => document.documentElement.classList.contains('menu-aaben'))).toBe(false);
  });
}

test('skuffen siger kun ét sted "du står her" — og det er siden selv', () => {
  /* Målt på et skud 14/9: menukortsiden havde BÅDE Menukort og Smørrebrød
     ud af huset markeret. Med den røde markering lignede det to sider, man
     stod på på én gang. */
  const fund = [];
  for (const side of DESIGN) {
    const f = side.slice(1);
    const h = fs.readFileSync(path.join(ROD, f), 'utf8');
    const i = h.indexOf('<div class="sheet" id="sheet">');
    const nav = h.slice(i, h.indexOf('</nav>', i));
    const on = [...nav.matchAll(/<a class="on" href="([^"]+)"/g)].map((m) => m[1]);
    if (on.length > 1 || on.some((href) => href !== f)) fund.push(f + ' → ' + on.join(', '));
  }
  expect(fund).toEqual([]);
});

test('menukortets varekort er ikke gjort om af menuens regler', async ({ page }) => {
  /* Menuens stil er scopet til #sheet. Varekortet (#vare-lag) deler
     klasserne .sheet/.sheet-in og skal se ud, som det gjorde. */
  await åbnSide(page, '/m-menukort.html');
  const v = await page.locator('#vare-lag .sheet-in').evaluate((e) => getComputedStyle(e).display);
  expect(v, 'varekortet blev et flex-ark').not.toBe('flex');
});

test('en lukket skuffe tegnes ikke — heller ikke dens sløring', async ({ page }) => {
  /* Målt 14/9 på menukortet på en computer: det lukkede varekort stod på
     opacity 0 med backdrop-filter over hele skærmen, og browseren sløede om
     ved hvert billede — ni billeder over 33 ms under et rul. En skuffe, ingen
     kan se, må ikke koste noget. Tallet udefra: skuffen SKAL være synlig,
     når den åbnes, ellers ville en regel, der skjulte den for altid, bestå. */
  await åbnSide(page, '/m-menukort.html');
  const lukkede = await page.evaluate(() => [...document.querySelectorAll('.sheet')]
    .map((e) => (e.id || '?') + ':' + getComputedStyle(e).visibility));
  expect(lukkede.length, 'vagt: siden har skuffer').toBeGreaterThanOrEqual(2);
  expect(lukkede.filter((x) => !x.endsWith(':hidden')), 'en lukket skuffe tegnes stadig').toEqual([]);
  const kb = await page.locator('#burger').boundingBox();
  await page.mouse.click(kb.x + kb.width / 2, kb.y + kb.height / 2);
  await expect.poll(() => page.locator('#sheet').evaluate((e) => getComputedStyle(e).visibility)).toBe('visible');
});

test('siden bagved ruller ikke, mens menuen er åben', async ({ page }, info) => {
  /* Kun på en telefon: dér er det DOKUMENTET, der ruller. På en computer
     ligger skuffen uden for #sc og kan ikke tage rulningen med (målt). */
  test.skip(info.project.name !== 'mobil', 'telefonens rulning');
  await åbnSide(page, '/h-selskaber.html');
  await rul(page, 600);
  const før = await page.evaluate(() => scrollY);
  expect(før, 'vagt: siden er rullet, ellers måles ingenting').toBeGreaterThan(300);

  /* ⚠️ ET TRYK PÅ STEDET, IKKE locator.click(). Playwright ruller selv
     knappen "i syne" før klikket og flyttede siden 600 → 291 — også helt
     uden lås (målt). En finger ruller ikke siden, før den trykker. */
  const kb = await page.locator('#burger').boundingBox();
  await page.mouse.click(kb.x + kb.width / 2, kb.y + kb.height / 2);
  await expect(page.locator('#sheet')).toHaveClass(/open/);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => scrollY), 'siden flyttede sig, da menuen åbnede').toBe(før);
  /* Og bjælken står, hvor den stod. Låste man body i stedet for <html>,
     klæbede den til body og røg op bag menuen (målt: top −600). */
  expect(await page.evaluate(() => Math.round(document.querySelector('.topbar').getBoundingClientRect().top)),
    'bjælken røg væk').toBeGreaterThanOrEqual(0);
  /* Et rul over dæmperen OG et over selve listen. */
  const ark = await page.locator('#sheet .sheet-in').boundingBox();
  await page.mouse.move(ark.x + ark.width / 2, Math.max(8, ark.y - 30));
  await page.mouse.wheel(0, 1200);
  const nav = await page.locator('#sheet nav').boundingBox();
  await page.mouse.move(nav.x + nav.width / 2, nav.y + nav.height / 2);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => scrollY), 'siden gled med bag menuen').toBe(før);

  await page.keyboard.press('Escape');
  await expect(page.locator('#sheet')).not.toHaveClass(/open/);
  expect(await page.evaluate(() => scrollY), 'siden står, hvor den stod').toBe(før);
});

for (const side of GAMLE) {
  test(`${side}: den gamle burger er husets knap, og siden står stille bag skuffen`, async ({ page }, info) => {
    /* Burgeren findes kun under 900 px; over den står menuen i bjælken. */
    test.skip(info.project.name !== 'mobil', 'burgeren er telefonens');
    await åbn(page, side, { data: grunddata() });
    const knap = page.locator('#burger');
    const s = await knap.evaluate((e) => {
      const c = getComputedStyle(e);
      return { bg: c.backgroundColor, efter: getComputedStyle(e, '::after').content };
    });
    expect(alfa(s.bg), 'knappen er gennemsigtig: ' + s.bg).toBe(1);
    expect(s.efter).toBe('"Menu"');

    await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
    const før = await page.evaluate(() => scrollY);
    expect(før, 'vagt: siden er rullet').toBeGreaterThan(200);
    await knap.click();
    await expect(page.locator('#ark')).toHaveClass(/aaben/);
    await page.waitForTimeout(500);
    /* ⚠️ OVER DÆMPEREN, IKKE OVER ARKET. Arket er selv en rullebeholder
       med overscroll-behavior: contain og sluger hjulet — første udgave
       rullede på (20, 200), altså INDE i arket, og bestod også med begge
       låse fjernet (falsifikation 20). Siden bagved kan kun nås i den
       dæmpede stribe over arket, og det er dér, fingeren glider. */
    const ark = await page.locator('#ark').boundingBox();
    expect(ark.y, 'vagt: der er en dæmpet stribe over arket at rulle i').toBeGreaterThan(40);
    await page.mouse.move(ark.x + ark.width / 2, ark.y - 30);
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => scrollY), 'siden gled med bag skuffen').toBe(før);
  });
}
