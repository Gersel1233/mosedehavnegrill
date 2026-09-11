/* ============================================================
   HEROENS FILM ER ÅBNINGEN  (11/9)
   ------------------------------------------------------------
   Kundens ord: filmen skal bruges *"i stedet for animationen before
   landing, fade ind premium ligesom Apples hjemmeside og blive til
   den statiske end frame, hvor teksten så kommer"*. Bølge-introen er
   fjernet; dens regler, der stadig gælder for en åbning, er flyttet
   hertil (tests-gamle/intro-boelge.spec.js).

   ⚠️ PLAYWRIGHTS CHROMIUM KAN AFSPILLE H.264 — målt 11/9: Chromium
   151 svarer "probably" og spiller filmen til ende. (Her stod
   tidligere det modsatte, uden en måling bag.) Prøverne, der måler
   forløbet, bruger den rigtige afspilning; prøverne, der måler en
   gren (afvist play, en fil der ikke kan hentes), stubber play()
   eller svarer 404, så netop DEN gren er den eneste vej.
   ============================================================ */
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, rul } = require('./hjaelp');

/* play() erstattes, så prøven kan se, HVORNÅR filmen startes — og så
   en rigtig afspilning ikke blander sig i målingen af en gren. */
async function taelPlay(page, svar = 'lykkes') {
  await page.addInitScript((s) => {
    window.__play = 0;
    HTMLMediaElement.prototype.play = function () {
      window.__play++;
      return s === 'afvises' ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve();
    };
  }, svar);
}

const aabner = (page) => page.evaluate(() => document.documentElement.classList.contains('film-aabner'));
const synlighed = (page, sel) => page.locator(sel).first().evaluate((e) => Number(getComputedStyle(e).opacity));

test.describe('Heroens film er åbningen', () => {

  test('bølge-introen findes ikke længere', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await expect(page.locator('#intro')).toHaveCount(0);
    expect(await page.content()).not.toContain('intro-boelge');
  });

  test('formatet følger skærmen — 9:16 på en telefon, 16:9 på en computer', async ({ page }, info) => {
    await taelPlay(page);
    await åbnSkal(page, '/', { data: grunddata() });
    const forventet = info.project.name === 'computer' ? '16x9' : '9x16';
    await expect(page.locator('.hero-film')).toHaveAttribute('data-format', forventet);
    const v = page.locator('.hero-film video');
    expect(await v.getAttribute('src')).toContain(`film/hero-${forventet}.mp4`);
    expect(await v.getAttribute('poster')).toContain(`film/hero-${forventet}-start.jpg`);
  });

  /* ⚠️ TEKSTEN KOMMER DET SIDSTE SEKUND — ikke fra start og ikke først
     bagefter. To uafhængige ting: teksten er skjult, mens filmen
     spiller, og i det øjeblik klassen forsvinder, er filmen tæt på
     slutningen (målt på filmens eget ur). Rigtig afspilning. */
  test('teksten venter på filmen og kommer, når den er ved at være slut', async ({ page }) => {
    /* ⚠️ LYTTEREN SIDDER PÅ `document`, IKKE PÅ `<html>`. Et
       init-script kører, FØR opmærkningen er læst, så
       document.documentElement er null dér — og første udgave
       observerede derfor ingenting og målte `null` (11/9). Samme ar
       som introprøven fik 10/9. Dokumentet selv findes altid. */
    await page.addInitScript(() => {
      window.__afsloer = null;
      new MutationObserver(() => {
        const v = document.querySelector('.hero-film video');
        const h = document.documentElement;
        if (window.__afsloer === null && v && h && !h.classList.contains('film-aabner')
            && v.currentTime > 0) {
          window.__afsloer = { t: v.currentTime, varighed: v.duration };
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
    });
    await åbnSkal(page, '/', { data: grunddata() });
    expect(await aabner(page), 'åbningen startede ikke').toBe(true);
    expect(await synlighed(page, '.hero h1')).toBe(0);

    await expect.poll(() => page.evaluate(() => window.__afsloer), { timeout: 12000 }).not.toBeNull();
    const a = await page.evaluate(() => window.__afsloer);
    expect(a.varighed, 'filmen spillede ikke').toBeGreaterThan(3);
    expect(a.t, `teksten kom ${a.t.toFixed(2)} s inde i en film på ${a.varighed.toFixed(2)} s`)
      .toBeGreaterThanOrEqual(a.varighed - 1.5);
    await expect.poll(() => synlighed(page, '.hero h1')).toBe(1);
  });

  /* Filmen blændes ind — den står ikke bare der fra første billede. */
  test('filmen blændes ind, når den spiller', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await expect(page.locator('.hero-film')).toHaveClass(/spiller/, { timeout: 8000 });
    await expect.poll(() => synlighed(page, '.hero-film')).toBe(1);
  });

  test('når filmen er slut, står slutbilledet — og teksten', async ({ page }, info) => {
    await åbnSkal(page, '/', { data: grunddata() });
    const still = page.locator('.hero-slut');
    await expect(still).toHaveClass(/vis/, { timeout: 12000 });
    const fmt = info.project.name === 'computer' ? '16x9' : '9x16';
    await expect(still).toHaveAttribute('src', new RegExp(`film/hero-${fmt}-slut\\.jpg`));
    expect(await aabner(page)).toBe(false);
  });

  /* ⚠️ DEN, DER VIL VIDERE, SKAL IKKE VENTE PÅ FILMEN. */
  test('et tryk springer filmen over — teksten og slutbilledet med det samme', async ({ page }) => {
    await taelPlay(page);
    await åbnSkal(page, '/', { data: grunddata() });
    expect(await aabner(page)).toBe(true);
    await page.mouse.click(20, 400);
    await expect.poll(() => aabner(page)).toBe(false);
    await expect(page.locator('.hero-slut')).toHaveClass(/vis/);
  });

  test('et rul springer filmen over', async ({ page }) => {
    await taelPlay(page);
    await åbnSkal(page, '/', { data: grunddata() });
    expect(await aabner(page)).toBe(true);
    await rul(page, 300);
    await expect.poll(() => aabner(page)).toBe(false);
  });

  /* Briefens gamle accepttest: et direkte link må ikke dækkes. */
  test('et direkte link får ingen åbning — teksten og slutbilledet står', async ({ page }) => {
    await taelPlay(page);
    await åbnSkal(page, '/#nyheder', { data: grunddata() });
    expect(await aabner(page)).toBe(false);
    await expect(page.locator('.hero-slut')).toHaveClass(/vis/);
    expect(await page.evaluate(() => window.__play)).toBe(0);
  });

  test('reduceret bevægelse: ingen film — slutbilledet og teksten står', async ({ browser }) => {
    const kon = await browser.newContext({ reducedMotion: 'reduce' });
    const s = await kon.newPage();
    await taelPlay(s);
    await åbnSkal(s, '/', { data: grunddata() });
    expect(await aabner(s)).toBe(false);
    await expect(s.locator('.hero-slut')).toHaveClass(/vis/);
    expect(await s.locator('.hero-film video').getAttribute('src')).toBeNull();
    expect(await s.evaluate(() => window.__play)).toBe(0);
    expect(await synlighed(s, '.hero h1')).toBe(1);
    await kon.close();
  });

  /* ⚠️ INTET MÅ EFTERLADE EN SKJULT TEKST. */
  test('afviser telefonen afspilningen, kommer teksten og slutbilledet', async ({ page }) => {
    await taelPlay(page, 'afvises');
    await åbnSkal(page, '/', { data: grunddata() });
    await expect.poll(() => aabner(page)).toBe(false);
    await expect(page.locator('.hero-slut')).toHaveClass(/vis/);
  });

  test('en film, der ikke kan hentes, giver teksten og slutbilledet', async ({ page }) => {
    /* play() lykkes, og filen svarer 404: så er det KUN filmens egen
       fejl-lytter, der kan give slutbilledet. */
    await page.route('**/film/*.mp4*', (r) => r.fulfill({ status: 404, body: '' }));
    await taelPlay(page);
    await åbnSkal(page, '/', { data: grunddata() });
    await expect.poll(() => aabner(page), { timeout: 5000 }).toBe(false);
    await expect(page.locator('.hero-slut')).toHaveClass(/vis/);
  });

  /* ⚠️ OG UDEN JAVASCRIPT KOMMER TEKSTEN ALLIGEVEL. Klassen sættes i
     head; fejler filmens script, fjernes den aldrig — og så viser
     stilarket det hele efter 8 s. Målt på den BEREGNEDE synlighed. */
  test('fejler filmens script, kommer teksten alligevel', async ({ page }) => {
    await page.route('**/js/skal/hero-film.js*', (r) => r.abort());
    await åbnSkal(page, '/', { data: grunddata() });
    expect(await aabner(page)).toBe(true);
    expect(await synlighed(page, '.hero h1')).toBe(0);
    await expect.poll(() => synlighed(page, '.hero h1'), { timeout: 12000 }).toBe(1);
    await expect.poll(() => synlighed(page, '.hero-cta')).toBe(1);
    /* Topbjælken står under det samme værn: uden script ingen menu. */
    await expect.poll(() => synlighed(page, '.topbar')).toBe(1);
    /* Og lærredets kanter: uden script går de aldrig op, så værnet
       tager dem væk — ellers stod de som to sorte felter over teksten. */
    await expect.poll(() => synlighed(page, '.hero-bjaelke')).toBe(0);
  });

  /* ⚠️ LÆRREDET GÅR OP (11/9). Kundens ord: "kan den starte ud mere
     cinematisk". Filmen åbner sig fra en stribe midt i skærmen til
     fuld skærm. Kanterne måles som den brøkdel af FILMENS egen højde,
     de dækker — målt på deres kasser, altså efter transformen, og
     uafhængigt af hvor på siden heroen står. */
  const kanter = (page) => page.evaluate(() => {
    const f = document.querySelector('.hero-film').getBoundingClientRect();
    const [t, b] = [...document.querySelectorAll('.hero-bjaelke')].map((e) => e.getBoundingClientRect());
    return { top: (t.bottom - f.top) / f.height, bund: (f.bottom - b.top) / f.height };
  });

  test('åbningen begynder som en stribe midt i skærmen', async ({ page }) => {
    await taelPlay(page);
    await åbnSkal(page, '/', { data: grunddata() });
    expect(await aabner(page)).toBe(true);
    const k = await kanter(page);
    expect(k.top, 'den øverste kant dækker ikke toppen').toBeGreaterThan(0.25);
    expect(k.bund, 'den nederste kant dækker ikke bunden').toBeGreaterThan(0.25);
  });

  test('når filmen spiller, går lærredet op til fuld skærm', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await expect(page.locator('.hero-film')).toHaveClass(/spiller/, { timeout: 8000 });
    await expect.poll(async () => {
      const k = await kanter(page);
      return k.top <= 0.01 && k.bund <= 0.01;
    }, { timeout: 5000 }).toBe(true);
  });

  test('et direkte link får intet lærred — kanterne er væk fra første billede', async ({ page }) => {
    await taelPlay(page);
    await åbnSkal(page, '/#nyheder', { data: grunddata() });
    const k = await kanter(page);
    expect(k.top).toBeLessThanOrEqual(0.01);
    expect(k.bund).toBeLessThanOrEqual(0.01);
  });

  /* ⚠️ FULD SKÆRM PÅ TELEFONEN (11/9). Kundens ord: filmen skal være
     "fuld skærm på telefonen med animationen, ikke inde på
     hjemmesiden agtig — fuldskærm indtil end frame". MÅLT FØR: på en
     iPhone 13 sluttede heroen 4 px før skærmens bund, fordi dens
     højde kom af indholdet. Tallet kommer UDEFRA — vinduets egen
     højde — og en høj telefon står ved siden af, så en regel, der
     kun passer på ét mål, falder. */
  test('på en telefon fylder filmen hele skærmen — også på en høj telefon', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobil', 'kundens ord gælder telefonen');
    await taelPlay(page);
    for (const vindue of [null, { width: 430, height: 932 }]) {
      if (vindue) await page.setViewportSize(vindue);
      await åbnSkal(page, '/', { data: grunddata() });
      expect(await aabner(page), 'åbningen startede ikke').toBe(true);
      const m = await page.locator('.hero-film').evaluate((e) => {
        const r = e.getBoundingClientRect();
        return { top: r.top, bund: r.bottom, vh: innerHeight };
      });
      expect(m.top, 'filmen begynder under skærmens top').toBeLessThanOrEqual(0);
      expect(m.bund, `filmen slutter ${Math.round(m.vh - m.bund)} px før bunden på en skærm på ${m.vh} px`)
        .toBeGreaterThanOrEqual(m.vh);
    }
  });

  /* ⚠️ OG INTET STÅR OVEN I FILMEN. Menuknappen stod i fuld styrke
     hele åbningen (målt: opacity 1). Den kommer med teksten — og den
     lever imens: et tryk hvor som helst springer filmen over. Den
     flydende pille er foldet væk af sin egen regel (heroens knapper
     er i syne), og det måles her, så de to ikke kan skride fra
     hinanden. */
  test('topbjælken og pillen venter på filmen — bjælken kommer med teksten', async ({ page }) => {
    await taelPlay(page);
    await åbnSkal(page, '/', { data: grunddata() });
    expect(await aabner(page)).toBe(true);
    expect(await synlighed(page, '.topbar')).toBe(0);
    await expect.poll(() => synlighed(page, '.bestil')).toBe(0);
    await page.evaluate(() => window.MosedeFilm.spring());
    await expect.poll(() => synlighed(page, '.topbar')).toBe(1);
  });

  /* Kransen FALDER på plads — kundens ønske om logoet består. Og den
     mørke tone kommer med teksten, så filmen står i fuld styrke,
     mens den spiller. */
  test('kransen falder på plads, og den mørke tone kommer med teksten', async ({ page }) => {
    await taelPlay(page);
    await åbnSkal(page, '/', { data: grunddata() });
    const før = await page.locator('.hero-badge').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m42);
    expect(før, 'kransen står ikke oppe og venter').toBeLessThan(-5);
    const toneFør = await page.locator('.hero').evaluate((e) => Number(getComputedStyle(e, '::after').opacity));
    expect(toneFør).toBe(0);
    await page.evaluate(() => window.MosedeFilm.spring());
    await expect.poll(() => page.locator('.hero-badge').evaluate((e) => getComputedStyle(e).transform)).toBe('none');
    await expect.poll(() => page.locator('.hero').evaluate((e) => Number(getComputedStyle(e, '::after').opacity))).toBe(1);
  });

  /* ⚠️ TEKSTEN KOMMER MED OVERGANGEN TIL SLUTBILLEDET (11/9). Kundens
     ord efter at have set den på sin egen telefon: "det er først, når
     de går i overgang til slutframen, at det andet skal komme." Før kom
     teksten 1,1 s før slut, og slutbilledet først, når filmen var helt
     færdig. I det øjeblik teksten slippes fri, skal overgangen til
     slutbilledet allerede være begyndt — målt med rigtig afspilning. */
  test('teksten og overgangen til slutbilledet kommer i samme øjeblik', async ({ page }) => {
    await page.addInitScript(() => {
      window.__ved = null;
      new MutationObserver(() => {
        const h = document.documentElement;
        const f = document.querySelector('.hero-film');
        if (window.__ved === null && h && f && f.classList.contains('spiller')
            && !h.classList.contains('film-aabner')) {
          const v = f.querySelector('video');
          window.__ved = { slut: f.classList.contains('slut'), t: v ? v.currentTime : null, varighed: v ? v.duration : null };
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
    });
    await åbnSkal(page, '/', { data: grunddata() });
    await expect.poll(() => page.evaluate(() => window.__ved), { timeout: 12000 }).not.toBeNull();
    const v = await page.evaluate(() => window.__ved);
    expect(v.varighed, 'filmen spillede ikke — prøven målte en anden vej').toBeGreaterThan(3);
    expect(v.slut, `teksten kom ${v.t.toFixed(2)} s inde, før overgangen til slutbilledet`).toBe(true);
  });

  /* ⚠️ "DEN ÅBNER OP FOR LANGSOMT" (11/9, kundens ord på sin egen
     telefon). Lærredet gik op på 2,2 s og filmen blev blændet ind på
     2 — det føltes som ventetid. Loftet er 1,2 s for begge. */
  test('lærredet går op på lidt over et sekund — ikke to', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    const d = await page.evaluate(() => ({
      kant: parseFloat(getComputedStyle(document.querySelector('.hero-bjaelke')).transitionDuration),
      film: parseFloat(getComputedStyle(document.querySelector('.hero-film')).transitionDuration),
    }));
    expect(d.kant, 'kanterne går for langsomt op').toBeLessThanOrEqual(1.2);
    expect(d.film, 'filmen blændes for langsomt ind').toBeLessThanOrEqual(1.2);
  });

  /* ⚠️ lvh OG IKKE svh — målt på kundens egen iPhone (11/9): med svh
     stod der ~95 punkter creme under filmen, bag Safaris svævende
     bundlinje. Chromium kan ikke se forskel (de to er ens her), så
     prøven læser reglen i arket — kommentarerne klippes af, så en note
     om svh ikke fælder den. */
  test('heroen måles mod den store skærm (lvh), ikke den lille', () => {
    const css = fs.readFileSync('havnegrillen.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const regel = (css.match(/\.hero\.film\{[^}]*\}/) || [''])[0];
    expect(regel, 'reglen for .hero.film har intet gulv').toContain('min-height');
    expect(regel).toContain('100lvh');
    expect(regel, 'svh efterlader en creme bjælke bag Safaris bundlinje').not.toContain('svh');
  });

  test('ternet er slukket bag filmen', async ({ page }) => {
    await åbnSkal(page, '/#nyheder', { data: grunddata() });
    const foer = await page.locator('.hero').evaluate((el) => getComputedStyle(el, '::before').display);
    expect(foer).toBe('none');
  });

  /* Filerne ligger i film/ — ikke i billeder/, som forsidens
     fartprøve forbyder før rul. Loftet er et værn mod en ny film i
     fuld størrelse: originalerne var 2,5-2,9 MB. */
  test('filerne findes og holder sig under loftet', async () => {
    for (const fmt of ['16x9', '9x16']) {
      expect(fs.statSync(`film/hero-${fmt}.mp4`).size).toBeLessThan(2 * 1024 * 1024);
      for (const del of ['start', 'slut']) {
        expect(fs.statSync(`film/hero-${fmt}-${del}.jpg`).size).toBeLessThan(450 * 1024);
      }
    }
  });
});
