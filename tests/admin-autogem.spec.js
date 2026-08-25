/* AUTOGEM: DET SKREVNE MÅ IKKE KUNNE GÅ TABT

   Der var otte Gem-knapper i admin. En travl medarbejder, der
   retter tavlen kl. 11.55 og går uden at trykke, har rettet
   INGENTING — og det opdages om onsdagen.

   To lyttere, og den anden er den vigtige:

   · 'change' gemmer STRAKS, når feltet forlades. Det er dét, der
     fanger den, der taster og går.
   · 'input' gemmer 1,2 sekund efter sidste tastetryk.

   Knapperne bliver stående. De skal bare ikke være det eneste,
   der virker. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData } = require('./hjaelp');

async function fane(page, id) {
  await åbnAdmin(page);
  await page.locator(`[data-panel="${id}"]`).click();
}

test.describe('Felterne gemmer sig selv', () => {

  test('åbningstiderne gemmer, når feltet forlades', async ({ page }) => {
    /* DEN FARLIGSTE AF DEM ALLE. Sættes hakket i "Lukket" uden at
       nogen trykker Gem, står forsiden og lover åbent — og gæsten
       kører forgæves. */
    await fane(page, 'p-tider');

    const lukket = page.locator('#tider-felter [data-rolle="lukket"][data-ugedag="2"]');
    await lukket.check();
    await expect(page.locator('#gem-tider').locator('../..').locator('.gemt-maerke'))
      .toContainText('Gemt');

    const gemt = await gemteData(page);
    const onsdag = gemt.aabningstider.find((r) => r.ugedag === 2);
    expect(onsdag.lukket, 'hakket blev aldrig gemt').toBe(true);
  });

  test('dagens besked gemmer sig selv, mens man skriver', async ({ page }) => {
    await fane(page, 'p-beskeder');

    await page.locator('#besked-vis').check();
    await page.locator('#besked-tekst').fill('Vi har friske rødspætter i dag');
    // 'input' venter 1,2 sekund; mærket er beviset på, at den kom.
    await expect(page.locator('#gem-besked').locator('..').locator('.gemt-maerke'))
      .toContainText('Gemt', { timeout: 4000 });

    const gemt = await gemteData(page);
    expect(gemt.indstillinger.dagens_besked.tekst).toBe('Vi har friske rødspætter i dag');
    expect(gemt.indstillinger.dagens_besked.vis).toBe(true);
  });

  test('sæsonlukningen gemmer sig selv', async ({ page }) => {
    /* Et hak i "Lukket for sæsonen", der aldrig blev gemt, betyder
       en forside, der tager imod bestillinger, ingen laver. */
    await fane(page, 'p-beskeder');
    await page.locator('#saeson-lukket').check();

    const gemt = await gemteData(page);
    expect(gemt.indstillinger.saeson.lukket).toBe(true);
  });

  test('reglerne for bestilling gemmer sig selv', async ({ page }) => {
    await fane(page, 'p-bestillinger');
    await page.locator('#bestil-varsel-timer').fill('48');
    await page.locator('#bestil-min-stk').fill('4');
    await page.locator('#bestil-min-stk').blur();

    const gemt = await gemteData(page);
    expect(gemt.indstillinger.bestilling_varsel_timer).toBe(48);
    expect(gemt.indstillinger.bestilling_min_stk).toBe(4);
  });

  test('kontaktoplysningerne gemmer sig selv', async ({ page }) => {
    await fane(page, 'p-kontakt');
    await page.locator('#lok-telefon').fill('28871343');
    await page.locator('#lok-telefon').blur();

    const gemt = await gemteData(page);
    expect(gemt.lokationer[0].telefon).toBe('28871343');
  });

  /* EN HALV VÆRDI MÅ IKKE GEMMES, og den må heller ikke lyve om
     det. Mærket siger, hvad der mangler — knappen brøler det
     samme, hvis man trykker. */
  test('et ugyldigt tal bliver ikke gemt, og mærket siger hvorfor', async ({ page }) => {
    await fane(page, 'p-bestillinger');
    await page.locator('#bestil-min-stk').fill('0');
    await page.locator('#bestil-min-stk').blur();

    const maerke = page.locator('#gem-bestil-regler').locator('..').locator('.gemt-maerke');
    await expect(maerke).toContainText('mellem 1 og 500');
    await expect(maerke).toHaveClass(/gemt-fejl/);

    const gemt = await gemteData(page);
    expect(gemt.indstillinger.bestilling_min_stk).not.toBe(0);
  });

  /* KNAPPERNE BLIVER STÅENDE. De skal bare ikke være det eneste,
     der virker — og de skal stadig give den fulde kvittering. */
  test('Gem-knapperne virker som før', async ({ page }) => {
    await fane(page, 'p-beskeder');
    await page.locator('#saeson-besked').fill('Vi ses til foråret');
    await page.locator('#gem-saeson').click();
    await expect(page.locator('#kvittering')).toContainText('slået fra');

    const gemt = await gemteData(page);
    expect(gemt.indstillinger.saeson.besked).toBe('Vi ses til foråret');
  });

  /* ⚠️ AUTOGEM MÅ IKKE TEGNE FANEN OM.

     Admin.gem henter data igen og tegner ALLE faner om, og en
     optegning midt i en sætning river feltet ud af siden under
     fingeren. Præcis den fejl kostede en halv sætning, da noten på
     et bestillingskort gemte ved 'change'.

     Prøven skriver i ét felt, gemmer et ANDET, og tjekker at det
     første stadig har markøren og sin tekst. */
  test('markøren bliver i feltet, mens der gemmes', async ({ page }) => {
    await fane(page, 'p-kontakt');

    await page.locator('#lok-telefon').fill('28871343');
    await page.locator('#lok-telefon').blur();
    await expect(page.locator('#gem-kontakt').locator('..').locator('.gemt-maerke'))
      .toContainText('Gemt');

    await page.locator('#lok-beskrivelse').fill('');
    await page.locator('#lok-beskrivelse').click();
    await page.keyboard.type('Vi ligger nede ved vandet');
    await page.waitForTimeout(1600);

    await expect(page.locator('#lok-beskrivelse')).toBeFocused();
    await expect(page.locator('#lok-beskrivelse')).toHaveValue('Vi ligger nede ved vandet');
  });
});
