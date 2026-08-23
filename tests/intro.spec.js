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

    /* Og så skal man kunne bruge siden. Der blev klikket på
       heroens "Book et bord". Heroen har ingen knapper mere
       (kundens ord, 22/8) — den flydende Bestil-pille er nu
       forsidens ene handling, og den findes på både telefon og
       computer, hvor topmenuen ikke gør. Den er samtidig et
       bedre mål: et intro-lag, der blev liggende, ville ligge
       præcis dér, fast over indholdet. */
    await page.locator('.bestil-fast').click();
    await expect(page).toHaveURL(/bestil\//);
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

  /* DEN KOMMER VED HVERT BESØG, OGSÅ ET OPDATER.

     Kravet har flyttet sig tre gange: én gang pr. fane, så hvert
     besøg, så én gang pr. session, og nu hvert besøg igen — med den
     tilføjelse at man "altid kan klikke så den væk".

     Her stod derfor to tests om det modsatte: at anden gang i samme
     fane ikke kørte, og at nøglen blev sat med det samme så et
     opdater midt i animationen ikke startede forfra. sessionStorage-
     nøglen er væk, og de to er byttet ud med den her.

     Det der gør det bærbart, står i testen nedenunder: hele laget er
     trykfladen. */
  test('den kommer igen efter et opdater', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro')).toBeVisible();
    await page.locator('#intro-spring').click();
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 3000 });

    await page.reload();
    await expect(page.locator('#intro'),
      'introen kom ikke igen efter et opdater').toBeVisible();
  });

  /* ET KLIK HVOR SOM HELST LUKKER DEN.

     Man kunne kun ramme knappen "Spring over" nede i hjørnet, eller
     trykke Escape — og Escape findes ikke på en telefon. Animationen
     varer under to sekunder, så knappen er lille og kortvarig: man
     skal se den, sigte og ramme, mens det man ville hen til, allerede
     er væk.

     Det her er halvdelen af hvorfor introen må komme hver gang.
     Testen trykker midt på skærmen, altså et sted hvor der IKKE er en
     knap. */
  test('et klik midt på skærmen lukker den', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro')).toBeVisible();

    const m = page.viewportSize();
    await page.mouse.click(Math.round(m.width / 2), Math.round(m.height / 2));
    await expect(page.locator('#intro'),
      'et klik midt på skærmen lukkede ikke introen').toHaveCount(0, { timeout: 3000 });
  });

  test('en berøring lukker den også – Escape findes ikke på en telefon',
    async ({ page }) => {
      await åbn(page, '/index.html', { intro: true });
      await expect(page.locator('#intro')).toBeVisible();

      const m = page.viewportSize();
      await page.touchscreen.tap(Math.round(m.width / 2), Math.round(m.height / 2))
        .catch(async () => {
          // Computerprofilen har ikke berøring. Så er klik-testen dækning nok.
          await page.mouse.click(Math.round(m.width / 2), Math.round(m.height / 2));
        });
      await expect(page.locator('#intro')).toHaveCount(0, { timeout: 3000 });
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

test.describe('Overgangen fra intro til landing', () => {

  /* Kunden skrev at overgangen var "hakkende og laggy". Det var den, og
     der var tre grunde. De to første er tidsfejl man kan måle direkte;
     den tredje er belastning, og den måles i testen nedenunder.

     1) Laget blev revet væk MIDT I SIT EGET FADE. CSS'en tonede ud på
        .6s, js/intro.js fjernede elementet efter 300 ms — altså ved
        omkring 50 % gennemsigtighed, som et spring til nul.

     2) Heroen ventede på at laget var VÆK, ikke på at fadet begyndte.
        Forløbet var: intro toner væk → intro fjernes → heroen begynder.
        I hullet stod heroen fremme med alt sit indhold usynligt.
        Nu meldes der når fadet begynder, så de to glider over i
        hinanden. */
  test('fadet og fjernelsen følges ad', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro')).toBeVisible();

    const fade = await page.evaluate(() => {
      const s = getComputedStyle(document.getElementById('intro'));
      return s.transitionDuration.split(',').map((d) => parseFloat(d) * 1000)[0];
    });

    // Klik lukker den. Vi måler hvor lang tid der går før den er væk.
    const start = Date.now();
    await page.mouse.click(20, 20);
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 3000 });
    const gik = Date.now() - start;

    /* Elementet må ikke forsvinde FØR fadet er færdigt — så ser man et
       spring. Der gives 40 ms slæk til timeren og til at måle i. */
    expect(gik, `laget forsvandt efter ${gik} ms, men fadet varer ${fade} ms`)
      .toBeGreaterThanOrEqual(fade - 40);
  });

  test('heroen begynder at rejse sig mens introen stadig toner væk', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro')).toBeVisible();

    await page.mouse.click(20, 20);

    /* body.klar skal være sat MENS laget stadig er i DOM'en. Er den
       først sat bagefter, er det et snit og ikke en overgang. */
    const samtidig = await page.waitForFunction(() =>
      document.body.classList.contains('klar')
      && !!document.getElementById('intro'), null, { timeout: 1000 })
      .then(() => true).catch(() => false);

    expect(samtidig,
      'heroen ventede på at introen var helt væk – de to glider ikke over i hinanden')
      .toBe(true);
  });

  /* VIDEOEN MÅ IKKE HENTES MENS HEROEN LANDER.

     Det var den tredje og største grund. load() plus afkodningen af de
     første billeder faldt i præcis det øjeblik heroens indflyvning
     skulle bruge hovedtråden. Målt over de 2,6 sekunder overgangen
     varer, på en computer: 23 tabte billeder med, 2 uden.

     Heroens koreografi er 1,6 sekunder lang (linjerne 0,85 s med op til
     0,30 s forsinkelse, "Rul ned" 0,8 + 0,8). Hentningen venter til
     efter den. */
  /* DET, DER VENTER, ER AFKODNINGEN — IKKE HENTNINGEN.

     Prøven krævede før, at der slet ikke blev sendt et kald efter
     videofilen, mens heroen landede. Den regel var for grov: en
     hentning er NETVÆRK og rører aldrig hovedtråden. Det var
     load() plus afkodningen af de første billeder, der tog de 21
     tabte billeder — se målingen ovenfor.

     Og reglen kostede noget. Kunden (22/8): "videoen på heroen
     starter ikke med det samme." Introen varer 1,73 s, så gik der
     1,7 s mere, og FØRST DER begyndte telefonen at hente 606 kB
     over mobilnettet.

     Nu hentes bytesene med rel=prefetch, mens introen kører, og
     kun load() venter. Prøven måler begge halvdele: at
     video-elementet ikke har rørt filen, mens heroen lander, og
     at kilderne kommer på bagefter. */
  test('kilderne lægges først på efter heroens indflyvning', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro')).toBeVisible();

    await page.mouse.click(20, 20);
    const slap = Date.now();

    // Mens heroen lander må video-elementet ikke afkode noget
    await page.waitForTimeout(1200);
    expect(await page.locator('#hero-film source').count(),
      'video-elementet afkodede, mens heroen stadig var i bevægelse').toBe(0);

    // Men kilderne skal komme bagefter
    await expect(page.locator('#hero-film source')).toHaveCount(2, { timeout: 8000 });
    const ventede = Date.now() - slap;
    expect(ventede, `kilderne kom efter kun ${ventede} ms`).toBeGreaterThan(1200);
  });
});
