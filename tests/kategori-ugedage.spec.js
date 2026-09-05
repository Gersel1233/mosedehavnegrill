/* ============================================================
   SORTIMENT PR. UGEDAG  (5/9)
   ------------------------------------------------------------
   Kundens ord: *"derudover skal de vælge hvilket mad der f.eks
   er de forskellige dage — sådan fx weekenderne er det kun
   friture eller det 'nemme', så man ik kan bestille dagensret og
   burger de dage, eller mandag til torsdag have alt sortiment
   men ikke dürüm."*

   ⚠️ MANDAG TIL TORSDAG VAR IKKE MULIGT. Kolonnen `dage` kunne
   tre ting — alle | hverdage | weekend — og 'hverdage' er
   man-FRE. Fredag er netop den dag, en grillbar har travlt, så
   ejeren kunne ikke skrive det, han bad om.

   Formatet er nu cifre i stigende rækkefølge (isodow): '1234' =
   man-tors, '67' = weekend. De tre gamle ord læses stadig, fordi
   der står rækker med dem i produktionen.

   ⚠️ OG DE TO SIDER SKAL SVARE ENS. Databasens
   mosede_kategori_paa_dagen og browserens Butik.kategoriPaaDag
   gør det samme opslag; et "hverdag", der betyder noget
   forskelligt de to steder, er den slags fejl, der ser helt
   rigtig ud på skærmen. SQL-halvdelen har sin egen prøve
   (supabase/proev-kategori-ugedage.sql, 12 × BESTOD). */
const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, visFane, gemteData } = require('./hjaelp');

/* September 2026: 7. = mandag, 10. = torsdag, 11. = fredag,
   12. = lørdag. Uret sættes til mandag, så man-tors er ÅBEN og
   fredag/lørdag er lukket — to uafhængige svar. */
const MANDAG = '2026-09-07T09:00:00Z';
const FREDAG = '2026-09-11T09:00:00Z';

function medDage(dage) {
  const d = grunddata();
  d.indstillinger = { ...d.indstillinger, bestilling_varsel_timer: 0 };
  d.menu_kategorier = d.menu_kategorier.map((k) => (
    k.navn === 'Smørrebrød' ? { ...k, dage } : k));
  return d;
}

test.describe('Gæstesiden følger ejerens ugedage', () => {
  test('man-tors: smørrebrødet står på kortet om mandagen', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: MANDAG, data: medDage('1234') });
    await page.waitForTimeout(900);
    await expect(page.locator('#bestil-stykker')).toContainText('Flæskestegssandwich');
  });

  test('man-tors: og IKKE om fredagen — det er hele pointen', async ({ page }) => {
    /* ⚠️ MODSTYKKET. Uden det målte prøven ovenfor ingenting: en
       regel, der aldrig lukker noget, ville bestå den. Og fredag
       er netop den dag, 'hverdage' ikke kunne skelne. */
    await åbn(page, '/bestil/', { ur: FREDAG, data: medDage('1234') });
    await page.waitForTimeout(900);
    await expect(page.locator('#bestil-stykker')).not.toContainText('Flæskestegssandwich');
  });

  test('hverdage betyder stadig man-FRE — de gamle ord er urørte', async ({ page }) => {
    /* Der står rækker i produktionen med 'hverdage'. Brød
       migreringen dem, ville en gæst ikke kunne bestille en
       burger om fredagen, og ingen ville opdage det. */
    await åbn(page, '/bestil/', { ur: FREDAG, data: medDage('hverdage') });
    await page.waitForTimeout(900);
    await expect(page.locator('#bestil-stykker')).toContainText('Flæskestegssandwich');
  });

  test('weekend som cifre lukker fredagen', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: FREDAG, data: medDage('67') });
    await page.waitForTimeout(900);
    await expect(page.locator('#bestil-stykker')).not.toContainText('Flæskestegssandwich');
  });

  test('et ord, vi ikke kender, lukker ingenting', async ({ page }) => {
    /* En kategori, der forsvandt, fordi nogen skrev noget nyt i
       databasen, ville være et menukort, der bliver mindre uden
       en fejl nogen steder. */
    await åbn(page, '/bestil/', { ur: FREDAG, data: medDage('noget-nyt') });
    await page.waitForTimeout(900);
    await expect(page.locator('#bestil-stykker')).toContainText('Flæskestegssandwich');
  });
});

test.describe('Admin sætter dagene', () => {
  async function åbnMenu(page, data) {
    await åbnAdmin(page, { data });
    await visFane(page, 'p-menu');
    await page.waitForSelector('#menu-status');
  }

  function knapper(page) {
    return page.locator('[data-kategori] .kat-dage .kat-dag').first();
  }

  test('de syv dage står som knapper med rigtige navne', async ({ page }) => {
    await åbnMenu(page, medDage('1234'));
    const gruppe = page.locator('[data-kategori] .kat-dage').first();
    await expect(gruppe.locator('.kat-dag')).toHaveCount(7);
    /* ⚠️ BOGSTAVET ALENE SIGER IKKE HVILKEN DAG — T er både
       tirsdag og torsdag. Navnet er knappens. */
    await expect(gruppe.locator('.kat-dag').nth(3)).toHaveAttribute('aria-label', 'torsdag');
  });

  test('databasens værdi står som de rigtige knapper', async ({ page }) => {
    await åbnMenu(page, medDage('1234'));
    const gruppe = page.locator('[data-kategori] .kat-dage').first();
    const på = await gruppe.locator('.kat-dag').evaluateAll(
      (bs) => bs.map((b) => b.getAttribute('aria-pressed')));
    expect(på, 'man-tors skal stå som de fire første')
      .toEqual(['true', 'true', 'true', 'true', 'false', 'false', 'false']);
  });

  test('de gamle ord læses stadig som knapper', async ({ page }) => {
    await åbnMenu(page, medDage('weekend'));
    const gruppe = page.locator('[data-kategori] .kat-dage').first();
    const på = await gruppe.locator('.kat-dag').evaluateAll(
      (bs) => bs.map((b) => b.getAttribute('aria-pressed')));
    expect(på).toEqual(['false', 'false', 'false', 'false', 'false', 'true', 'true']);
  });

  test('et gem skriver det, knapperne viser', async ({ page }) => {
    /* ⚠️ UDEN DEN HER MÅLTE RESTEN AF FILEN INGENTING. De andre
       prøver læser knappernes TILSTAND — og en admin, der altid
       gemte 'alle', bestod dem alle sammen. Falsificeret: med
       dageVaerdi() låst til 'alle' faldt kun den her. */
    await åbnMenu(page, medDage('1234'));
    const gruppe = page.locator('[data-kategori] .kat-dage').first();
    await gruppe.locator('.kat-dag').nth(4).click();      // fredag til
    await page.locator('[data-kategori]').first()
      .locator('button', { hasText: 'Gem' }).first().click();
    await expect(page.locator('#kvittering')).toBeVisible();

    const gemt = await gemteData(page);
    const kat = gemt.menu_kategorier.find((k) => k.navn === 'Smørrebrød');
    expect(kat.dage, 'man-tors plus fredag er man-fre — altså hverdage')
      .toBe('hverdage');
  });

  test('ejerens egne dage overlever et gem — hele vejen ned', async ({ page }) => {
    /* ⚠️ DEN HER PRØVE FANDT EN TAVS FEJL, OG DEN VAR DYR.
       Skrivelaget (js/store-skriv.js) kastede alt andet end de
       tre gamle ord om til 'alle'. Ejeren kunne altså slå fredag
       fra, trykke Gem, se "✓ Gemt" — og få en kategori, der stod
       åben hver dag. Ingen fejl nogen steder.

       Derfor måles en værdi, der IKKE er et af de tre ord: fra
       man-tors slås onsdag fra, så resultatet er '124'. Et gem,
       der normaliserer, kan ikke bestå den. */
    await åbnMenu(page, medDage('1234'));
    const gruppe = page.locator('[data-kategori] .kat-dage').first();
    await gruppe.locator('.kat-dag').nth(2).click();      // onsdag fra
    await page.locator('[data-kategori]').first()
      .locator('button', { hasText: 'Gem' }).first().click();
    await expect(page.locator('#kvittering')).toBeVisible();

    const gemt = await gemteData(page);
    const kat = gemt.menu_kategorier.find((k) => k.navn === 'Smørrebrød');
    expect(kat.dage, 'mandag, tirsdag og torsdag — og ikke "alle"').toBe('124');
  });

  test('alle syv gemmes som "alle", ikke som 1234567', async ({ page }) => {
    /* Det korteste, der er sandt. Så bliver rækken ved med at
       ligne de andre, og en fremtidig læser skal ikke oversætte
       et tal for at se, at kategorien er åben hver dag. */
    await åbnMenu(page, medDage('1234'));
    const gruppe = page.locator('[data-kategori] .kat-dage').first();
    for (const n of [4, 5, 6]) await gruppe.locator('.kat-dag').nth(n).click();
    await page.locator('[data-kategori]').first()
      .locator('button', { hasText: 'Gem' }).first().click();
    await expect(page.locator('#kvittering')).toBeVisible();

    const gemt = await gemteData(page);
    const kat = gemt.menu_kategorier.find((k) => k.navn === 'Smørrebrød');
    expect(kat.dage).toBe('alle');
  });

  test('den sidste dag kan ikke slås fra', async ({ page }) => {
    /* En kategori uden en eneste dag kan aldrig bestilles, og
       databasens CHECK afviser en tom liste. Uden spærren her
       ville ejeren møde en rå SQL-fejl på et helt rimeligt tryk. */
    await åbnMenu(page, medDage('5'));
    const gruppe = page.locator('[data-kategori] .kat-dage').first();
    await gruppe.locator('.kat-dag').nth(4).click();
    await expect(gruppe.locator('.kat-dag.paa'),
      'der skal blive én dag tilbage').toHaveCount(1);
  });
});
