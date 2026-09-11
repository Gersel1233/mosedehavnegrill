/* ============================================================
   HEROENS FILM  (11/9)
   ------------------------------------------------------------
   Kundens ord: headerens baggrund "som lige nu er det ternede" skal
   være filmen fra Desktop/header — én til computer og én i 9:16 til
   iPhone — logoet skal stadig falde på plads, og bagefter skal
   slutbilledet stå. Reglerne bor i js/skal/hero-film.js.

   ⚠️ HER STOD, AT PLAYWRIGHTS CHROMIUM IKKE KAN AFSPILLE H.264 —
   og det var aldrig målt. MÅLT 11/9: Chromium 151 svarer "probably"
   på canPlayType og spiller filmen til ende. Fejl-prøven lænede sig
   på påstanden og bestod af en anden grund (filmen spillede færdig);
   den bruger en rigtig 404 nu. Prøverne her måler REGLERNE: hvornår
   filmen startes, hvilket format der vælges, og at intet efterlader
   en tom hero. Selve afspilningen er også set i rigtig Chrome.
   ============================================================ */
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

/* play() erstattes, så prøven kan se, HVORNÅR filmen startes — og
   så en afspilning, Chromium ikke kan, ikke blander sig i målingen. */
async function taelPlay(page, svar = 'lykkes') {
  await page.addInitScript((s) => {
    window.__play = [];
    HTMLMediaElement.prototype.play = function () {
      window.__play.push({
        lander: document.documentElement.classList.contains('intro-lander'),
        intro: !!document.getElementById('intro'),
      });
      return s === 'afvises' ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve();
    };
  }, svar);
}

test.describe('Heroens film', () => {

  test('formatet følger skærmen — 9:16 på en telefon, 16:9 på en computer', async ({ page }, info) => {
    await taelPlay(page);
    await åbnSkal(page, '/', { data: grunddata() });
    const film = page.locator('.hero-film');
    const forventet = info.project.name === 'computer' ? '16x9' : '9x16';
    await expect(film).toHaveAttribute('data-format', forventet);
    const src = await page.locator('.hero-film video').evaluate((v) => v.getAttribute('src'));
    expect(src).toContain(`film/hero-${forventet}.mp4`);
    /* Og startbilledet er SAMME format — én regel afgør begge. */
    const plakat = await page.locator('.hero-film video').evaluate((v) => v.getAttribute('poster'));
    expect(plakat).toContain(`film/hero-${forventet}-start.jpg`);
  });

  /* ⚠️ FILMEN STARTER, NÅR LOGOET BEGYNDER AT LANDE — ikke bag
     introens creme, hvor de fire sekunder, maden kommer frem, ville
     gå tabt. To uafhængige ting: play() blev kaldt, og i det øjeblik
     stod `intro-lander` på siden. */
  test('filmen startes først, når logoet begynder at lande', async ({ page }) => {
    await taelPlay(page);
    await åbnSkal(page, '/', { data: grunddata() });
    expect(await page.evaluate(() => window.__play.length), 'filmen startede bag introen').toBe(0);
    await expect.poll(() => page.evaluate(() => window.__play.length), { timeout: 15000 }).toBe(1);
    const kald = await page.evaluate(() => window.__play[0]);
    expect(kald.lander || !kald.intro, 'filmen startede, før logoet landede').toBe(true);
  });

  test('et direkte link springer introen over — og filmen starter med det samme', async ({ page }) => {
    await taelPlay(page);
    await åbnSkal(page, '/#nyheder', { data: grunddata() });
    await expect.poll(() => page.evaluate(() => window.__play.length)).toBe(1);
  });

  test('når filmen er slut, blændes slutbilledet ind', async ({ page }, info) => {
    await taelPlay(page);
    await åbnSkal(page, '/#nyheder', { data: grunddata() });
    await page.locator('.hero-film video').evaluate((v) => v.dispatchEvent(new Event('ended')));
    await expect(page.locator('.hero-film')).toHaveClass(/slut/);
    const still = page.locator('.hero-slut');
    const fmt = info.project.name === 'computer' ? '16x9' : '9x16';
    await expect(still).toHaveAttribute('src', new RegExp(`film/hero-${fmt}-slut\\.jpg`));
    await expect(still).toHaveClass(/vis/);
    /* Og det er et billede, der FINDES: et opgivet billede har bredden nul. */
    await expect.poll(() => still.evaluate((i) => i.naturalWidth)).toBeGreaterThan(0);
  });

  /* ⚠️ INTET MÅ EFTERLADE EN TOM, MØRK HERO. En iPhone på
     strømbesparelse afviser play(); en browser uden H.264 giver en
     fejl. Begge skal ende i slutbilledet. */
  test('afviser telefonen afspilningen, står slutbilledet', async ({ page }) => {
    await taelPlay(page, 'afvises');
    await åbnSkal(page, '/#nyheder', { data: grunddata() });
    await expect(page.locator('.hero-slut')).toHaveClass(/vis/);
  });

  test('en film, browseren ikke kan afspille, giver slutbilledet', async ({ page }) => {
    /* ⚠️ FILEN SVARER 404, OG play() LYKKES — MED VILJE. Så er det
       KUN filmens egen fejl-lytter, der kan give slutbilledet: ingen
       afvist play() og intet 'ended' at låne af. Den gren dækker en
       film, der ikke kan hentes eller går i stykker undervejs.
       Første udgave lænede sig på, at browseren ikke kunne afspille
       filmen — og målt kunne den godt, så prøven bestod af en helt
       anden grund (filmen spillede til ende). */
    await page.route('**/film/*.mp4*', (r) => r.fulfill({ status: 404, body: '' }));
    await taelPlay(page);
    await åbnSkal(page, '/#nyheder', { data: grunddata() });
    await expect(page.locator('.hero-slut')).toHaveClass(/vis/, { timeout: 10000 });
  });

  test('reduceret bevægelse: ingen film — slutbilledet står med det samme', async ({ browser }) => {
    const kon = await browser.newContext({ reducedMotion: 'reduce' });
    const s = await kon.newPage();
    await taelPlay(s);
    await åbnSkal(s, '/', { data: grunddata() });
    await expect(s.locator('.hero-slut')).toHaveClass(/vis/);
    expect(await s.locator('.hero-film video').getAttribute('src')).toBeNull();
    expect(await s.evaluate(() => window.__play.length)).toBe(0);
    await kon.close();
  });

  /* Ternet bag heroen er slukket, NÅR der er en film — og kun dér.
     Den mørke tone ovenover (::after) bliver, så teksten kan læses. */
  test('ternet er slukket bag filmen — den mørke tone bliver', async ({ page }) => {
    await åbnSkal(page, '/#nyheder', { data: grunddata() });
    const r = await page.locator('.hero').evaluate((el) => ({
      foer: getComputedStyle(el, '::before').display,
      efter: getComputedStyle(el, '::after').backgroundImage,
    }));
    expect(r.foer).toBe('none');
    expect(r.efter).not.toBe('none');
  });

  /* Filerne ligger i film/ — ikke i billeder/, som forsidens
     fartprøve forbyder før rul. Loftet er et værn mod at en ny film
     lægges ind i fuld størrelse: originalerne var 2,5-2,9 MB. */
  test('filerne findes og holder sig under loftet', async () => {
    for (const fmt of ['16x9', '9x16']) {
      const mp4 = fs.statSync(`film/hero-${fmt}.mp4`).size;
      expect(mp4, `film/hero-${fmt}.mp4 er for stor`).toBeLessThan(2 * 1024 * 1024);
      for (const del of ['start', 'slut']) {
        const jpg = fs.statSync(`film/hero-${fmt}-${del}.jpg`).size;
        expect(jpg, `film/hero-${fmt}-${del}.jpg er for stor`).toBeLessThan(450 * 1024);
      }
    }
  });
});
