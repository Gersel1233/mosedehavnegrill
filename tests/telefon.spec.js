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

  /* MOBILBJÆLKEN ER FJERNET.

     Fire faste genveje nederst tog 56 px af skærmen permanent, oven
     i bådstribens 66 – på en iPhone 14% af skærmen der aldrig viste
     indhold. Kunden pegede på den tre gange.

     De to ting den var til for, ring og find vej, står nu øverst i
     skuffemenuen som knapper. Testene her holder øje med at de
     virkelig ER der: fjerner man en bjælke uden at flytte det den
     kunne, har man taget noget fra gæsten. */
  test('bjælken i bunden er væk, og båden har pladsen', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('.mobilbar')).toHaveCount(0);

    const svar = await page.evaluate(() => {
      const s = document.getElementById('sail').getBoundingClientRect();
      return { bund: s.bottom, vindue: window.innerHeight, hoejde: s.height };
    });
    expect(Math.abs(svar.bund - svar.vindue),
      'bådstriben slutter ikke i skærmens nederste kant').toBeLessThan(2);
    expect(svar.hoejde).toBeLessThanOrEqual(72);
  });

  test('ring og find vej kan nås fra skuffemenuen', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#burger').click();
    await expect(page.locator('#ark')).toBeVisible();

    const ring = page.locator('.ark-handling a[href^="tel:"]');
    const rute = page.locator('.ark-handling a[data-rute]');
    await expect(ring, 'telefonnummeret mangler i skuffemenuen').toHaveCount(1);
    await expect(rute, '"Find vej" mangler i skuffemenuen').toHaveCount(1);

    // Rutelinket skal være udfyldt, ikke stå som "#"
    await expect(rute).toHaveAttribute('href', /maps|google/i);

    for (const el of [ring, rute]) {
      const k = await el.boundingBox();
      expect(k.height, 'en knap i skuffemenuen er under 44 px').toBeGreaterThanOrEqual(44);
    }
  });

  test('menupunkterne i skuffen er store nok', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#burger').click();

    const punkter = await page.locator('.ark-liste a').all();
    expect(punkter.length, 'skuffemenuen er tom').toBeGreaterThan(3);
    for (const a of punkter) {
      const k = await a.boundingBox();
      expect(k.height, `"${(await a.textContent()).trim()}" er ${Math.round(k.height)}px høj`)
        .toBeGreaterThanOrEqual(44);
    }
  });

  test('bådstriben dækker ikke footeren når man har rullet ned', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.evaluate(() => window.scrollTo({
      top: document.documentElement.scrollHeight, behavior: 'instant',
    }));
    await page.waitForTimeout(250);

    const daekker = await page.evaluate(() => {
      const s = document.getElementById('sail').getBoundingClientRect();
      const f = document.querySelector('footer .fine').getBoundingClientRect();
      return f.bottom > s.top + 1;
    });
    expect(daekker, 'bådstriben ligger oven på den nederste linje i footeren')
      .toBe(false);
  });

  /* Båden VAR slået fra på telefon, fordi striben på 76 px ville
     ligge oven på indholdet. Men båden er sidens rullemåler, og det
     er den der giver siden liv mens man ruller – at fjerne den på
     det apparat de fleste bruger, er at fjerne bevægelsen dér hvor
     den tæller.

     Den er nu 66 px høj og ligger i den nederste kant – bjælken der
     lå der før, er væk. De ting der kan gå galt, står herunder. */
  test('båden sejler også på telefonen', async ({ page }) => {
    await åbn(page, '/index.html');

    const sail = page.locator('#sail');
    await expect(sail).toBeVisible();

    /* Canvas'et skal have en bredde. Et fixed canvas uden
       eksplicit width falder sammen til sin iboende 300 px, og så
       tegnes båden i venstre hjørne af en tredjedel af skærmen.
       Koden i js/baad.js springer desuden helt fra når clientWidth
       er 0 – så en usynlig fejl her ville give en tom stribe. */
    const maal = await page.evaluate(() => {
      const c = document.getElementById('sail');
      return { bredde: c.clientWidth, vindue: window.innerWidth, pixels: c.width };
    });
    expect(maal.bredde, 'striben er ikke så bred som skærmen')
      .toBeGreaterThanOrEqual(maal.vindue - 1);
    expect(maal.pixels, 'canvas har ingen pixels – der bliver ikke tegnet noget')
      .toBeGreaterThan(0);

    // Og der SKAL komme noget på den. Er den helt tom, sejler intet.
    await page.waitForTimeout(400);
    const tegnet = await page.evaluate(() => {
      const c = document.getElementById('sail');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
      return false;
    });
    expect(tegnet, 'striben er tegnet tom').toBe(true);
  });

});
