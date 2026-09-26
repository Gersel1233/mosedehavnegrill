/* KURVEN KAN SES, MENS MAN VÆLGER  (26. sep 2026)

   Mikkels ord: *"læg i kurven virker ikke på is siden"*. MÅLT med
   produktionens data: den VIRKEDE — isen lå i kurven, og summen nede
   ved Send sagde det. Men gæsten så intet: knappen sprang straks
   tilbage til "Vælg hvor mange kugler", kvitteringen var en lille
   linje, der forsvandt efter fire sekunder, summen stod under
   skærmkanten, og pillen i bunden folder sig væk inde i formularen.

   Reglen bor i js/skal/bestil.js (visKurvbar) og js/isbygger.js
   (bekræft). Fiksturet er isbyggerens egen prøves: ejerens rigtige
   kugleis, 1 kugle til 35 kr. — tallet i prøverne kommer derfra. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

const UR = '2026-08-07T11:00:00Z';
const IS_KAT = 6;                 // grunddata: "Softice og vafler", afdeling is

function data() {
  const d = grunddata();
  d.indstillinger.bestilbare_kategorier = [1, IS_KAT, 9];
  d.indstillinger.bestilling_varsel_timer = 2;
  d.indstillinger.is_smage = 'Vanilje\nJordbær\nLakrids';
  const b = { beskrivelse: null, fremhaevet: false, udsolgt: false, aktiv: true };
  const valg = ['Vaffel', 'Bæger'];
  d.menu_varer.push(
    { id: 9001, kategori_id: IS_KAT, navn: '1 kugle', pris: 35, valg, sortering: 1, ...b },
    { id: 9002, kategori_id: IS_KAT, navn: '2 kugler', pris: 45, valg, sortering: 2, ...b });
  return d;
}

const trin = (page, nr) => page.locator(`.isbyg-trin[data-trin="${nr}"]`);

/* Én is i vaffel med én kugle jordbær — og knappen i midten af
   skærmen, så Send IKKE er i syne (ellers er bjælken med rette væk). */
async function lægEnIs(page) {
  await åbnSkal(page, '/index.html', { ur: UR, data: data() });
  await page.waitForSelector('.isbyg-blok');
  await trin(page, 1).locator('.isbyg-knap').filter({ hasText: 'Vaffel' }).first().click();
  await trin(page, 2).locator('.isbyg-knap[data-vare="1 kugle"]').click();
  await trin(page, 3).locator('.isbyg-smag').selectOption('Jordbær');
  await page.locator('.isbyg-laeg').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await page.locator('.isbyg-laeg').click();
}

const synlig = (loc) => loc.evaluate((e) => getComputedStyle(e).visibility === 'visible'
  && Number(getComputedStyle(e).opacity) > 0.5);

test.describe('Kurven kan ses, mens man vælger', () => {

  test('en tom kurv har ingen bjælke', async ({ page }) => {
    await åbnSkal(page, '/index.html', { ur: UR, data: data() });
    await page.waitForSelector('.isbyg-blok');
    await page.locator('.isbyg-blok').evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    const bar = page.locator('.kurvbar');
    if (await bar.count()) expect(await synlig(bar), 'en bjælke uden noget i kurven').toBe(false);
  });

  test('knappen siger selv "Lagt i kurven", når isen er lagt', async ({ page }) => {
    await lægEnIs(page);
    await expect(page.locator('.isbyg-laeg')).toContainText('Lagt i kurven');
  });

  test('isen står i bjælken i bunden — antal og beløb', async ({ page }) => {
    await lægEnIs(page);
    const bar = page.locator('.kurvbar');
    await expect(bar, 'der er ingen kurv at se').toHaveCount(1);
    await expect(bar).toContainText('1 i kurven');
    await expect(bar).toContainText('35');
    await expect.poll(() => synlig(bar), { message: 'bjælken står der, men kan ikke ses' }).toBe(true);
    /* Pillen er en genvej TIL bestillingen — to røde bjælker i bunden
       ville være én for meget. */
    expect(await synlig(page.locator('#bestil-pill')), 'pillen og kurven står begge').toBe(false);
  });

  test('et tryk på bjælken viser summen — og så går bjælken væk', async ({ page }) => {
    await lægEnIs(page);
    const bar = page.locator('.kurvbar');
    await expect.poll(() => synlig(bar)).toBe(true);
    await bar.click();
    const sum = page.locator('#sumline, .note.sumbar').first();
    await expect.poll(() => sum.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    }), { message: 'summen kom ikke frem' }).toBe(true);
    await expect(sum).toContainText('1 kugle');
    await expect.poll(() => synlig(bar), { message: 'bjælken dækker summen, den selv peger på' }).toBe(false);
  });

  /* ⚠️ RULLEMENUEN MED SMAGEN MÅ IKKE SKJULE BJÆLKEN. En rullemenu giver
     intet tastatur, og på en iPhone beholder den fokus efter et tryk på
     en knap. Første udgave af prøven lagde isen med fokus i menuen — men
     Chromium giver et fokus-tab, når menuen fjernes ved nulstillingen, så
     den bestod OGSÅ med menuen talt med (set 26/9). Nu: én is ligger i
     kurven, og gæsten vælger smag til den næste — menuen står, med fokus. */
  test('en valgt smag (rullemenu med fokus) skjuler ikke kurven', async ({ page }) => {
    await lægEnIs(page);
    const bar = page.locator('.kurvbar');
    await expect.poll(() => synlig(bar)).toBe(true);
    await trin(page, 1).locator('.isbyg-knap').filter({ hasText: 'Bæger' }).first().click();
    await trin(page, 2).locator('.isbyg-knap[data-vare="1 kugle"]').click();
    const smag = trin(page, 3).locator('.isbyg-smag');
    await smag.selectOption('Vanilje');
    await smag.focus();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.activeElement && document.activeElement.className),
      'prøven har ikke fokus i menuen — så måler den ingenting').toContain('isbyg-smag');
    await page.locator('.isbyg-laeg').evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    expect(await synlig(bar), 'rullemenuen med fokus skjulte kurven').toBe(true);
  });

  test('mens gæsten skriver sit navn, dækker bjælken ikke feltet', async ({ page }) => {
    await lægEnIs(page);
    const bar = page.locator('.kurvbar');
    await expect.poll(() => synlig(bar)).toBe(true);
    /* Fokus UDEN at rulle: ellers kunne Send komme i syne, og så gik
       bjælken væk af den grund — og prøven målte den forkerte regel. */
    await page.locator('#navn').evaluate((e) => e.focus({ preventScroll: true }));
    await expect.poll(() => synlig(bar), { message: 'bjælken stod over tastaturet' }).toBe(false);
  });
});

/* ISEN KAN TAGES UD IGEN, OG KURVEN OVERLEVER ET LINK  (26/9)
   ------------------------------------------------------------
   Isbyggeren nulstiller sig selv, så en is har ingen tæller i
   listen — før i dag kunne en forkert is kun fjernes ved at
   genindlæse siden. Og sidens eget link "Se hele is-sortimentet"
   tømte kurven: MÅLT, fadøl i kurven → menukortet → tilbage → tom. */
test.describe('Isen kan tages ud, og kurven overlever et link', () => {

  test('"fjern" på is-linjen tager isen ud af kurven', async ({ page }) => {
    await lægEnIs(page);
    const sum = page.locator('#sumline');
    await expect(sum).toContainText('1 × 1 kugle');
    await sum.locator('.sum-fjern').first().click();
    await expect(sum, 'isen blev liggende i kurven').not.toContainText('1 kugle');
    await expect(page.locator('.kurvbar.vis'), 'bjælken står stadig med en tom kurv').toHaveCount(0);
  });

  test('kurven er der stadig efter "Se hele is-sortimentet" og tilbage', async ({ page }) => {
    await lægEnIs(page);
    await expect(page.locator('#sumline')).toContainText('1 × 1 kugle');
    await page.locator('.isbyg-blok-link').click();
    await page.waitForURL(/m-menukort/);
    await page.goBack();
    await expect(page.locator('#sumline'), 'kurven blev tømt af sidens eget link')
      .toContainText('1 × 1 kugle');
    await expect(page.locator('#sumline')).toContainText('Jordbær');
  });
});
