/* Intro-animationen.

   Det vigtigste her er ikke at animationen er pæn – det kan en
   test ikke se. Det vigtigste er at den ALTID slipper siden igen,
   og at den ikke står i vejen for nogen:

   - den skal kunne springes over
   - den skal fjerne sig selv helt, ikke bare blive gennemsigtig
   - den må ikke køre hver gang man går tilbage til forsiden
   - den må slet ikke køre for dem der har frabedt sig bevægelse
   - indholdet skal ligge i siden bagved hele tiden, så Google og
     en skærmlæser kan læse det
*/

const { test, expect } = require('@playwright/test');
const { åbn } = require('./hjaelp');

test.describe('Introen kører', () => {

  test('den vises ved første besøg og lærredet får en størrelse', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });

    const intro = page.locator('#intro');
    await expect(intro).toBeVisible();

    // Lærredet skal være målt op efter vinduet – er det 0 bredt,
    // er der ikke tegnet noget
    const bredde = await page.locator('#intro-laerred').evaluate(el => el.width);
    expect(bredde).toBeGreaterThan(0);
  });

  test('procenten tæller op til 100', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });

    // Ingen påstand om at den starter på 0 – animationen er i gang
    // før testen når at se efter, og en test der kappes med en
    // animation om at være først bliver upålidelig.
    await expect(page.locator('#intro-pct')).toHaveText('100%', { timeout: 8000 });
  });

  test('beskeden skifter undervejs', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro-besked')).toHaveText('Fyrer op for grillen');
    await expect(page.locator('#intro-besked')).not.toHaveText('Fyrer op for grillen', { timeout: 4000 });
  });

  test('den forsvinder af sig selv, og laget fjernes helt', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });

    // Hele forløbet er ca. 4,8 sekunder. Et gennemsigtigt lag der
    // blev liggende ville stadig fange klik, så vi kræver at
    // elementet er VÆK – ikke bare usynligt.
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 12000 });

    // Og så skal man kunne bruge siden
    await page.locator('a[href="menu.html"]').first().click();
    await expect(page).toHaveURL(/menu\.html/);
  });

  test('indholdet ligger i siden bagved mens introen kører', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });

    // Introen er stadig oppe...
    await expect(page.locator('#intro')).toBeVisible();
    // ...men teksten står i siden. Ellers ville Google og en
    // skærmlæser se en tom side.
    await expect(page.locator('h1')).toHaveText(/Mosede Havn/i);
    await expect(page.locator('#tider-krop tr')).toHaveCount(7);
  });

  test('introen er skjult for skærmlæsere – den er ren dekoration', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro')).toHaveAttribute('aria-hidden', 'true');
  });
});

test.describe('Man kan komme uden om den', () => {

  test('"Spring over" fjerner den med det samme', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });

    await page.locator('#intro-spring').click();
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 3000 });
  });

  test('Escape springer også over', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });

    await page.keyboard.press('Escape');
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 3000 });
  });

  test('anden gang i samme fane kører den ikke', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });
    await page.locator('#intro-spring').click();
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 3000 });

    // Tilbage til forsiden igen – nu skal den ikke plage os
    await page.goto('/menu.html');
    await page.goto('/index.html');
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('#status')).toBeVisible();
  });
});

test.describe('Reduceret bevægelse', () => {

  test('har gæsten frabedt sig bevægelse, springes introen helt over', async ({ page }) => {
    // Sættes direkte på siden. test.use({reducedMotion}) nåede
    // ikke ind i browseren her, og så kørte introen i fuld længde
    // mens testen troede den prøvede det modsatte.
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Kontrol: virker emuleringen overhovedet? Ellers ville testen
    // kunne "bestå" uden at have prøvet noget.
    await åbn(page, '/index.html', { intro: true });
    expect(await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);

    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('#status')).toBeVisible();
  });

  test('introen huskes ikke som set, når den blev sprunget over', async ({ page }) => {
    // Ellers ville en gæst med reduceret bevægelse aldrig kunne
    // få introen at se, heller ikke hvis hun senere slår
    // indstillingen fra.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 3000 });

    expect(await page.evaluate(
      () => sessionStorage.getItem('mosede_intro_set'))).toBeNull();
  });
});

test.describe('Hvor introen IKKE hører hjemme', () => {

  test('menukortet har ingen intro', async ({ page }) => {
    await åbn(page, '/menu.html', { intro: true });
    await expect(page.locator('#intro')).toHaveCount(0);
    await expect(page.locator('#menu')).toContainText('Flæskestegssandwich');
  });

  test('personalesiden har ingen intro', async ({ page }) => {
    await åbn(page, '/admin.html', { intro: true });
    await expect(page.locator('#intro')).toHaveCount(0);
    await expect(page.locator('#login')).toBeVisible();
  });
});
