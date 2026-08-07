/* Isfilmen.

   Filmen er tegnet, ikke filmet: tre kugler hopper op i keglen,
   og så trækker billedet sig tilbage og viser solnedgangen over
   havnen. Navnet står inde i selve videoen.

   Der er tre slags fejl der kan komme her, og en test til hver:

   1) AFSNITTET. Overskriften bærer pointen – "Du kommer for isen.
      Du bliver for udsigten." – og den skal stå i sidens tekst,
      ikke kun være brændt ind i en video. Ellers findes den ikke
      for den der bruger oplæsning, har slået bevægelse fra, eller
      sidder på en forbindelse hvor videoen aldrig kommer.

   2) DATAFORBRUGET. 959 kB må ikke hentes hos nogen der aldrig
      ruller ned til afsnittet, og slet ikke hos nogen der har
      bedt om at spare data.

   3) NAVNET INDE I VIDEOEN. Det står i hvid skrift oven på et
      solnedgangsfoto, og solnedgange er lyse. Sløret bag skriften
      er sat efter en måling, og målingen står her, så en ny
      udgave af filmen ikke kan snige et ulæseligt navn ind.
*/

const { test, expect } = require('@playwright/test');
const { åbn } = require('./hjaelp');

test.describe('Isafsnittet', () => {

  test('pointen står i sidens egen tekst', async ({ page }) => {
    await åbn(page, '/index.html');

    const afsnit = page.locator('#isen');
    await expect(afsnit).toBeVisible();
    await expect(afsnit.locator('h2')).toContainText('Du kommer for isen');
    await expect(afsnit.locator('h2')).toContainText('Du bliver for udsigten');

    // Videoen skal kunne beskrives for den der ikke ser den
    const film = page.locator('#isfilm');
    await expect(film).toHaveAttribute('aria-label', /kugler is|kegle/i);
    await expect(film).toHaveAttribute('poster', /isfilm-poster/);
  });

  test('linket åbner menukortets is-afdeling, ikke maden', async ({ page }) => {
    await åbn(page, '/index.html');

    // Udgangspunktet er mad
    await expect(page.locator('#afd-mad')).toHaveAttribute('aria-selected', 'true');

    await page.locator('#isen-til-menu').click();

    await expect(page.locator('#afd-is')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#afd-mad')).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#menu-liste')).toContainText('Softice og vafler');
  });

  test('videoen hentes ikke før afsnittet nærmer sig', async ({ page }) => {
    const hentet = [];
    await page.route('**/isfilm.*', (route) => {
      hentet.push(route.request().url());
      return route.abort();
    });

    await åbn(page, '/index.html');
    await page.waitForSelector('#isfilm');

    // Posterbilledet må gerne komme – det er selve filmen der er tung
    const film = hentet.filter((u) => /isfilm\.(mp4|webm)/.test(u));
    expect(film, `videoen blev hentet uden at nogen rullede derned: ${film}`)
      .toHaveLength(0);
    await expect(page.locator('#isfilm source')).toHaveCount(0);
  });

  test('reduceret bevægelse: ingen video, men en knap', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Emuleringen skal virke, ellers måler testen ingenting
    expect(await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches
    )).toBe(true);

    await åbn(page, '/index.html');
    await page.locator('#isen').scrollIntoViewIfNeeded();

    await expect(page.locator('#isfilm-knap')).toBeVisible();
    await expect(page.locator('#isfilm source')).toHaveCount(0);
    expect(await page.locator('#isfilm').evaluate((v) => v.paused)).toBe(true);
  });

  /* Sparetilstand. Her får knappen sin egentlige mening: filmen
     hentes ikke af sig selv, og gæsten bestemmer.

     Første udgave af denne test fjernede bare .skjult fra knappen
     og klikkede. Den kunne ikke bestå: så snart afsnittet kom i
     syne, gik videoen i gang af sig selv, og koden skjulte
     knappen igen – med rette. Testen skal fremkalde den situation
     hvor knappen faktisk hører hjemme, ikke tvinge den frem. */
  test('sparetilstand: filmen hentes først når gæsten selv trykker', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', {
        configurable: true,
        get: function () { return { saveData: true, effectiveType: '4g' }; },
      });
    });

    await åbn(page, '/index.html');
    await page.locator('#isen').scrollIntoViewIfNeeded();

    // Intet hentet, men et tilbud
    await expect(page.locator('#isfilm-knap')).toBeVisible();
    await expect(page.locator('#isfilm source')).toHaveCount(0);

    await page.locator('#isfilm-knap').click();

    await expect(page.locator('#isfilm source')).toHaveCount(2);
    // MP4 først: se begrundelsen i js/side.js
    await expect(page.locator('#isfilm source').first())
      .toHaveAttribute('type', 'video/mp4');
    // Trykker man selv, skal man også kunne standse igen
    expect(await page.locator('#isfilm').evaluate((v) => v.controls)).toBe(true);
  });
});


/* ============================================================
   TEKSTERNE INDE I FILMEN

   Filmen har tre tekster brændt ind: navnet i 96px, linjen
   "Udsigten er inkluderet" i 25px, og undervejs "Tre kugler. Én
   hånd. Én udsigt." De står oven på et solnedgangsfoto, og
   solnedgange er lyse. Sløret bag dem er sat efter en måling, og
   målingen står her, så en ny udgave af filmen ikke kan snige en
   ulæselig tekst ind.

   DER MÅLES PÅ OPSKRIFTEN, IKKE PÅ VIDEOEN. Det er et bevidst
   valg. I den færdige video ER teksten en del af billedet, så en
   måling af videoens pixels ville måle den hvide skrift mod sig
   selv og altid give 1:1. Første udgave af denne test gjorde
   præcis det og påstod 1,09:1.

   assets/scoop-film.html kan derimod tegne det samme øjeblik med
   teksten slået fra. Så er det baggrunden alene der bliver målt –
   og baggrunden er hele det der afgør om skriften kan læses.
   Videoen er lavet af netop den fil, så måler vi det rigtige.

   METODEN: der tages et billede af feltet bag teksten, det
   sendes tilbage ind i browseren, tegnes ned i blokke på
   størrelse med en bogstavstreg og måles. En lys plet der er
   smallere end stregen forhindrer ikke at man læser bogstavet –
   en lys FLADE på størrelse med stregen gør.
   ============================================================ */

const FELTER = [
  {
    navn: 'navnet',
    // Hvid skrift, 96px Bebas. Stor tekst: kravet er 3,0.
    farve: [255, 247, 234], blok: 12, krav: 3.0,
    boks: { x: 1070, y: 340, width: 700, height: 330 },
    // Titlen er fremme fra 8,55s. Fra 11,25s toner hele billedet
    // ud til sand, og der er ikke længere noget at læse.
    fra: 8.55, til: 11.2,
  },
  {
    navn: 'underlinjen',
    farve: [255, 247, 234], blok: 5, krav: 3.0,
    boks: { x: 1070, y: 690, width: 700, height: 60 },
    fra: 9.6, til: 11.2,
  },
  {
    navn: 'undervejs',
    // Blækblå skrift på lyst sand, 34px. Stor tekst: 3,0.
    farve: [15, 44, 68], blok: 5, krav: 3.0,
    boks: { x: 1240, y: 420, width: 530, height: 130 },
    fra: 5.6, til: 6.35,
  },
];

test.describe('Teksterne i isfilmen kan læses', () => {
  test.setTimeout(120000);

  /* Kun i fuld størrelse. Filmen er en fast komposition på
     1920x1080 og har intet med sidens layout at gøre – teksten
     ligger på de samme pixels uanset hvilken skærm videoen
     senere bliver vist på. I telefonprofilen er vinduet 390 px
     bredt, så udsnittet ved x=1070 ligger uden for skærmen, og
     målingen ville ramme forbi. */
  test.skip(({ isMobile }) => !!isMobile,
    'filmen er 1920x1080 og måles kun i fuld størrelse');

  for (const felt of FELTER) {
    test(`${felt.navn} står på en baggrund der bærer den`, async ({ page }) => {
      await page.goto('/assets/scoop-film.html?t=0');
      await page.waitForFunction('window.KLAR === true');

      let vaerst = 99, hvor = null, plet = null, antal = 0;

      for (let t = felt.fra; t <= felt.til; t += 1 / 10) {
        // Tegn øjeblikket, og slå filmens egne tekster fra
        await page.evaluate((tid) => {
          window.SCOOP.tegn(tid);
          document.getElementById('titel').style.visibility = 'hidden';
          document.getElementById('tekst').style.visibility = 'hidden';
          return new Promise((ok) => requestAnimationFrame(
            () => requestAnimationFrame(ok)
          ));
        }, t);

        const billede = (await page.screenshot({ clip: felt.boks })).toString('base64');

        const svar = await page.evaluate(async ([b64, felt]) => {
          function lin(x) {
            x /= 255;
            return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
          }
          function lum(r, g, b) {
            return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
          }

          const im = new Image();
          im.src = 'data:image/png;base64,' + b64;
          await im.decode();

          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width / felt.blok));
          c.height = Math.max(1, Math.round(im.height / felt.blok));
          const ctx = c.getContext('2d');
          ctx.drawImage(im, 0, 0, c.width, c.height);

          const lt = lum(felt.farve[0], felt.farve[1], felt.farve[2]);
          const d = ctx.getImageData(0, 0, c.width, c.height).data;

          let v = 99, p = null;
          for (let i = 0; i < d.length; i += 4) {
            const lb = lum(d[i], d[i + 1], d[i + 2]);
            const k = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05);
            if (k < v) { v = k; p = [d[i], d[i + 1], d[i + 2]]; }
          }
          return { vaerst: v, plet: p };
        }, [billede, felt]);

        antal++;
        if (svar.vaerst < vaerst) {
          vaerst = svar.vaerst;
          hvor = Math.round(t * 100) / 100;
          plet = svar.plet;
        }
      }

      console.log(`${felt.navn}: værst ${vaerst.toFixed(2)}:1 ved ${hvor}s `
        + `(baggrund rgb(${plet}), ${antal} øjeblikke målt)`);

      expect(antal, 'der blev ikke målt nogen øjeblikke').toBeGreaterThan(3);
      expect(vaerst,
        `${felt.navn} er ulæselig ved ${hvor}s. Styrk sløret i `
        + `assets/scoop-film.html og lav filmen om med `
        + `node vaerktoej/lav-isfilm.js`).toBeGreaterThanOrEqual(felt.krav);
    });
  }
});

/* Den færdige video skal svare til opskriften. Uden dette kunne
   målingen ovenfor bestå på en opskrift der er rettet, mens
   gæsterne stadig ser en gammel video der aldrig blev lavet om. */
test('videoen er lavet af den opskrift der lige blev målt', async ({ page }) => {
  await page.goto('/assets/scoop-film.html?t=0');
  await page.waitForFunction('window.KLAR === true');
  const opskrift = await page.evaluate('window.SCOOP.ialt');

  await page.goto('/index.html');
  const laengde = await page.evaluate(async () => {
    const v = document.createElement('video');
    v.src = 'billeder/isfilm.webm';   // testbrowseren er bygget uden H.264
    await new Promise((ok, nej) => {
      v.addEventListener('loadedmetadata', ok, { once: true });
      v.addEventListener('error', () => nej(new Error('kunne ikke indlæse isfilm.webm')), { once: true });
    });
    return v.duration;
  });

  // 1/30 sekund: ét billede. Mere end det, og videoen er en anden
  // film end den filen beskriver.
  expect(Math.abs(laengde - opskrift),
    `opskriften er ${opskrift}s, men videoen er ${laengde}s. `
    + 'Lav filmen om med: node vaerktoej/lav-isfilm.js').toBeLessThan(1 / 30 + 0.01);
});
