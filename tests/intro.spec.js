/* Intro-animationen.

   Det vigtigste her er ikke at animationen er pæn – det kan en
   test ikke se. Det vigtigste er at den ALTID slipper siden igen,
   og at den ikke står i vejen for nogen:

   - den skal kunne springes over
   - den skal fjerne sig selv helt, ikke bare blive gennemsigtig
   - den SKAL køre hver gang, også ved genindlæsning – kunden har
     bedt om det, og derfor er den skåret ned til godt tre sekunder
   - den må slet ikke køre for dem der har frabedt sig bevægelse
   - indholdet skal ligge i siden bagved hele tiden, så Google og
     en skærmlæser kan læse det
*/

const { test, expect } = require('@playwright/test');
const { åbn } = require('./hjaelp');

test.describe('Introen kører', () => {

  test('den vises og lærredet får en størrelse', async ({ page }) => {
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

    // Hele forløbet er ca. 3,1 sekunder. Et gennemsigtigt lag der
    // blev liggende ville stadig fange klik, så vi kræver at
    // elementet er VÆK – ikke bare usynligt.
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 12000 });

    // Og så skal man kunne bruge siden. Knappen i hero findes på
    // både mobil og computer – topmenuen gør ikke.
    await page.locator('.hero a[href="menu.html"]').click();
    await expect(page).toHaveURL(/menu\.html/);
  });

  test('indholdet ligger i siden bagved mens introen kører', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });

    // Introen er stadig oppe...
    await expect(page.locator('#intro')).toBeVisible();
    // ...men teksten står i siden. Ellers ville Google og en
    // skærmlæser se en tom side.
    await expect(page.locator('h1')).toContainText('smørrebrød');
    await expect(page.locator('#hours div').first()).toBeVisible();
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
    /* Kravet har været begge veje. Først én gang pr. fane, så ved
       hvert besøg fordi kunden bad om det, og nu igen én gang pr.
       session – men til gengæld under to sekunder. Den huskes i
       sessionStorage, altså pr. fane: lukker man fanen og kommer
       igen i morgen, får man den at se. */
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro')).toBeVisible();
    await page.locator('#intro-spring').click();
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 3000 });

    await page.reload();
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 2500 });
    await expect(page.locator('#hero-status')).toBeVisible();
  });

  test('den huskes med det samme, ikke først når den er færdig', async ({ page }) => {
    /* Trykker gæsten opdater MENS animationen kører, skal den ikke
       starte forfra. Derfor sættes nøglen når introen begynder. */
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro')).toBeVisible();

    // Ingen "spring over" – vi genindlæser midt i den
    await page.reload();
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 2500 });
  });

  test('et direkte link til et afsnit springer den helt over', async ({ page }) => {
    /* Kommer gæsten ind på .../#menu fra Google eller fra et link,
       har hun allerede sagt hvor hun vil hen. En animation der
       dækker netop det sted, er en fejl uanset hvor kort den er. */
    await åbn(page, '/index.html#find', { intro: true });
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 2500 });

    /* Og afsnittet skal faktisk være i syne. Der ventes på at
       indholdet er kommet fra databasen først – ikke for at give
       koden tid, men fordi det ER pointen: åbningstiderne og
       menuoversigten skubber #find flere hundrede pixel ned, og
       side.js ruller derfor igen når de er på plads. Måler man før
       det, måler man et mellemstadie ingen gæst ser. */
    await expect(page.locator('#hero-status-tekst')).not.toHaveText(/Henter/);
    await expect(page.locator('#hours div').first()).toBeVisible();

    const inde = await page.locator('#find h2').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    });
    expect(inde, 'afsnittet blev ikke rullet frem').toBe(true);
  });

  test('tidslinjen er under to sekunder', async ({ page }) => {
    /* Kravet er højst 1-2 sekunder. Den har været 4,8 s og 3,0 s
       undervejs, og ingen ville lægge mærke til at den sneg sig op
       igen.

       Der måles PÅ TIDSLINJEN og ikke på væguret. To testarbejdere
       der deler en CPU kan gøre en vægur-måling et halvt sekund
       langsommere, og så fælder testen byggeriet for maskinens
       skyld i stedet for for koreografiens. Væguret bruges kun til
       at bevise at den faktisk slutter. */
    await åbn(page, '/index.html', { intro: true });

    const ms = await page.evaluate(() => window.MOSEDE_INTRO_MS);
    console.log(`introens tidslinje er ${ms} ms`);
    expect(ms, 'introens tidslinje er blevet for lang').toBeLessThanOrEqual(2000);

    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 8000 });
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
    await expect(page.locator('#hero-status')).toBeVisible();
  });

});

test.describe('Hvor introen IKKE hører hjemme', () => {

  test('personalesiden har ingen intro', async ({ page }) => {
    await åbn(page, '/admin.html', { intro: true });
    await expect(page.locator('#intro')).toHaveCount(0);
    await expect(page.locator('#login')).toBeVisible();
  });
});
