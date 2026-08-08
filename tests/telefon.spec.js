/* Telefonen.

   Det meste af siden er skrevet med clamp() og flyder derfor med
   skærmen af sig selv. Det her er de fejl der IKKE fanger sig
   selv, og som en kunde nede ved havnen støder på med en tomme:

   1) For små trykflader. En pille på 40 px er under de 44 px både
      Apple og Google sætter som mindstemål, og på siden står de
      tæt: tre menufaner, "Ring", "Vis rute".

   2) Vandret rulning. Ét element der stikker 12 px ud gør hele
      siden skæv, og man opdager det først på en rigtig telefon.

   3) Noget der bliver siddende oven på indholdet. Skuffemenuen
      dækker hele skærmen – bliver den i DOM'en efter lukning,
      fanger den hvert klik bagefter.

   Testene kører i telefonprofilen. Kører de i computerprofilen,
   springes de over: dér måler de ingenting.
*/

const { test, expect } = require('@playwright/test');
const { åbn } = require('./hjaelp');

test.describe('På en telefon', () => {

  test.skip(({ isMobile }) => !isMobile, 'kun i telefonprofilen');

  test('siden kan ikke rulles sidelæns', async ({ page }) => {
    await åbn(page, '/index.html');

    // Hele vejen ned: et afsnit langt nede kan godt være det der
    // stikker ud, fx en tabel eller et billede i fuld bredde.
    for (const id of ['favoritter', 'menu', 'isen', 'find']) {
      await page.locator('#' + id).scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      const maal = await page.evaluate(() => ({
        side: document.documentElement.scrollWidth,
        vindue: window.innerWidth,
      }));
      expect(maal.side,
        `siden er ${maal.side - maal.vindue} px bredere end skærmen ved #${id}`)
        .toBeLessThanOrEqual(maal.vindue + 1);
    }
  });

  test('alt man skal trykke på er mindst 44 px højt', async ({ page }) => {
    await åbn(page, '/index.html');

    // Menukortets faner og de øvrige piller. Skuffemenuen måles
    // for sig, for den skal først åbnes.
    const smaa = page.locator('.glass.sm:visible');
    const antal = await smaa.count();
    expect(antal, 'der blev ikke fundet nogen piller at måle').toBeGreaterThan(2);

    const forSmaa = [];
    for (let i = 0; i < antal; i++) {
      const el = smaa.nth(i);
      const kasse = await el.boundingBox();
      if (kasse && kasse.height < 44) {
        forSmaa.push(`${(await el.textContent()).trim()} = ${Math.round(kasse.height)}px`);
      }
    }
    expect(forSmaa, `for lave trykflader: ${forSmaa.join(', ')}`).toEqual([]);
  });

  test('burgeren og lukkekrydset kan rammes', async ({ page }) => {
    await åbn(page, '/index.html');

    for (const vaelger of ['#burger']) {
      const kasse = await page.locator(vaelger).boundingBox();
      expect(kasse.width, `${vaelger} er kun ${kasse.width}px bred`).toBeGreaterThanOrEqual(44);
      expect(kasse.height, `${vaelger} er kun ${kasse.height}px høj`).toBeGreaterThanOrEqual(44);
    }

    await page.locator('#burger').click();
    await expect(page.locator('#ark')).toBeVisible();

    const kryds = await page.locator('#ark-luk').boundingBox();
    expect(kryds.height).toBeGreaterThanOrEqual(44);

    // Links i skuffen skal også kunne rammes
    const link = await page.locator('#ark a').first().boundingBox();
    expect(link.height, 'menupunkterne i skuffen er for lave').toBeGreaterThanOrEqual(44);
  });

  test('skuffemenuen slipper siden igen når den lukkes', async ({ page }) => {
    await åbn(page, '/index.html');

    await page.locator('#burger').click();
    await expect(page.locator('#ark')).toBeVisible();
    await page.locator('#ark-luk').click();
    await expect(page.locator('#ark')).toBeHidden();

    // Og så skal man kunne trykke på noget nedenunder. Er skuffen
    // stadig i vejen, rammer klikket den i stedet.
    await page.locator('.hero a[href="menu.html"]').click();
    await expect(page).toHaveURL(/menu\.html/);
  });

  test('topmenuen er ikke i vejen når man hopper til et afsnit', async ({ page }) => {
    await åbn(page, '/index.html');

    await page.locator('#burger').click();
    await page.locator('#ark a[href="#isen"]').click();
    await page.waitForTimeout(900);

    // Overskriften skal stå UNDER den faste topmenu, ikke bag den
    const svar = await page.evaluate(() => {
      const h = document.getElementById('hd').getBoundingClientRect();
      const m = document.querySelector('#isen .head h2').getBoundingClientRect();
      return { menuBund: h.bottom, overskriftTop: m.top };
    });
    expect(svar.overskriftTop,
      'overskriften ligger bag den faste topmenu').toBeGreaterThanOrEqual(svar.menuBund - 1);
  });

  test('hero fylder skærmen uden at overskriften brækker ud af den', async ({ page }) => {
    await åbn(page, '/index.html');

    const svar = await page.evaluate(() => {
      const hero = document.querySelector('.hero').getBoundingClientRect();
      const h1 = document.querySelector('.hero h1').getBoundingClientRect();
      const pille = document.getElementById('hero-status').getBoundingClientRect();
      return {
        heroHoejde: hero.height,
        vindue: window.innerHeight,
        h1Hoejre: h1.right,
        breddeVindue: window.innerWidth,
        pilleSynlig: pille.bottom <= hero.bottom + 1,
      };
    });

    // Hero skal dække skærmen – det er det første indtryk
    expect(svar.heroHoejde).toBeGreaterThanOrEqual(svar.vindue * 0.9);
    // Overskriften må ikke stikke ud til siden
    expect(svar.h1Hoejre).toBeLessThanOrEqual(svar.breddeVindue + 1);
    // "Er der åbent" skal være med i det første skærmbillede
    expect(svar.pilleSynlig, 'åbent-pillen ligger uden for hero').toBe(true);
  });

  test('mobilbjælken kan læses og rammes', async ({ page }) => {
    await åbn(page, '/index.html');

    const bar = page.locator('.mobilbar');
    await expect(bar).toBeVisible();

    const felter = await bar.locator('a').all();
    expect(felter.length, 'bjælken skal have fire genveje').toBe(4);

    for (const f of felter) {
      const kasse = await f.boundingBox();
      expect(kasse.height, 'et felt i bjælken er under 44 px højt')
        .toBeGreaterThanOrEqual(44);
    }

    /* Teksten må ikke blive klippet. "Smørrebrød" måler 75 px ved
       13px skrift, og der er 77 px pr. felt på en iPhone 13 – to
       pixel luft. På en smallere telefon var ordet klippet. */
    const klippet = await page.evaluate(() =>
      [...document.querySelectorAll('.mobilbar a span')]
        .filter((s) => s.scrollWidth > s.parentElement.clientWidth + 1)
        .map((s) => s.textContent));
    expect(klippet, `teksten er klippet i bjælken: ${klippet.join(', ')}`).toEqual([]);

    /* Og den skal ikke dække footeren.

       behavior: 'instant' er nødvendigt. Arket har
       scroll-behavior: smooth, så et almindeligt scrollTo animerer
       – og en måling et halvt sekund senere lander midt i
       bevægelsen. Første udgave af denne test målte scrollY til
       3024 på en side hvor bunden ligger i 4865, og konkluderede at
       bjælken dækkede footeren. */
    await page.evaluate(() => window.scrollTo({
      top: document.documentElement.scrollHeight, behavior: 'instant',
    }));
    await page.waitForTimeout(250);

    const daekker = await page.evaluate(() => {
      const b = document.querySelector('.mobilbar').getBoundingClientRect();
      const f = document.querySelector('footer .fine').getBoundingClientRect();
      return f.bottom > b.top + 1;
    });
    expect(daekker, 'bjælken ligger oven på den nederste linje i footeren')
      .toBe(false);
  });

  test('båden i bunden er slået fra – den æder plads og batteri', async ({ page }) => {
    await åbn(page, '/index.html');
    // Striben er 76 px høj og fast i bunden. På en telefon ville
    // den ligge oven på indholdet hele tiden.
    await expect(page.locator('#sail')).toBeHidden();
  });
});
