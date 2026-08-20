/* Skallen: navigationen og de fire nye sider.

   Hele produktet har nu én indgang pr. ærinde — smørrebrød, bord,
   selskaber, catering, baglokale, arrangementer — og de her tests
   holder skallen sammen: at alle indgange findes, at menuen kan
   være der, og at de nye sider ikke lover noget, forretningen
   ikke har bekræftet. */

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

test.describe('Mulighederne på forsiden', () => {

  /* Bestillingen, smørrebrødet og bordet har hver fået deres eget
     afsnit på forsiden. Nettet er det, der er tilbage: de ærinder,
     vi tager i telefonen. */
  test('de fire store ærinder kan vælges', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#stoerre .mulighed')).toHaveCount(4);

    for (const sti of ['selskaber/', 'catering/', 'baglokale/', 'arrangementer/']) {
      await expect(page.locator(`#stoerre a[href="${sti}"]`),
        `kortet til ${sti} mangler`).toHaveCount(1);
    }
  });

  /* Kortene er den samme slags løfte som resten af siden: ingen
     opfundne tal. Priser og antal er ikke bekræftet af ejeren. */
  test('kortene nævner hverken pris eller antal', async ({ page }) => {
    await åbn(page, '/index.html');
    const tekst = await page.locator('#stoerre').innerText();
    expect(tekst).not.toMatch(/\d+\s*kr/i);
    expect(tekst).not.toMatch(/(op til|plads til)\s+\d+/i);
  });
});

test.describe('Menuen kan være der', () => {

  /* Menupunkterne blev flere, og pladsen blev ikke større. Måles
     der ikke, opdages et ombrud først på et skærmbillede — og en
     topmenu på to linjer skubber alt andet ned. */
  test('topmenuen står på én linje uden sidelæns rul', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'på telefon er menuen bag burgeren');

    for (const sti of ['/index.html', '/menu.html', '/bord/', '/arrangementer/']) {
      await åbn(page, sti);
      const m = await page.evaluate(() => {
        const links = [...document.querySelectorAll('#hd nav a')];
        const toppe = links.map((a) => a.getBoundingClientRect().top);
        return {
          spring: Math.max(...toppe) - Math.min(...toppe),
          rul: document.documentElement.scrollWidth,
          vindue: window.innerWidth,
        };
      });
      expect(m.spring, `menuen ombryder på ${sti}`).toBeLessThan(10);
      expect(m.rul, `${sti} kan rulles sidelæns`).toBeLessThanOrEqual(m.vindue + 1);
    }
  });

  test('skuffen kender alle ærinder', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'skuffen er telefonens menu');
    await åbn(page, '/index.html');
    await page.locator('#burger').click();

    for (const [tekst, href] of [
      ['Book et bord', 'bord/'],
      ['Catering', 'catering/'],
      ['Baglokalet', 'baglokale/'],
      ['Arrangementer', 'arrangementer/'],
    ]) {
      await expect(page.locator(`.ark-liste a[href="${href}"]`),
        `${tekst} mangler i skuffen`).toHaveText(tekst);
    }
  });
});

test.describe('Arrangementer for gæsterne', () => {

  /* Uret i åbn() står på 7. august 2026 — datoerne er valgt efter
     det. */
  const arrangement = (æ) => ({
    id: 1, lokation_id: 'mosede', type: 'arrangement',
    titel: 'Havnefest', emoji: '🎉', dato: '2026-08-20',
    slut_dato: null, lukker_kl: null, offentlig: true, ...æ,
  });

  test('et offentligt arrangement vises med dato og titel', async ({ page }) => {
    await åbn(page, '/arrangementer/', {
      data: grunddata({ kalender: [arrangement()] }),
    });
    const kort = page.locator('#arr-liste .arr-kort');
    await expect(kort).toHaveCount(1);
    await expect(kort).toContainText('Havnefest');
    await expect(kort).toContainText('Torsdag 20. august');
  });

  /* Det her er sidens vigtigste løfte: personalets interne noter
     må ALDRIG stå på en offentlig side. I produktionen stopper
     databasens adgangsregel dem (proev-kalender.sql); i
     øvetilstand er filteret i js/arrangementer.js det eneste værn,
     og det er det, der måles her. */
  test('et internt arrangement vises IKKE', async ({ page }) => {
    await åbn(page, '/arrangementer/', {
      data: grunddata({
        kalender: [
          arrangement(),
          arrangement({ id: 2, titel: 'Personalefest', offentlig: false }),
        ],
      }),
    });
    await expect(page.locator('#arr-liste .arr-kort')).toHaveCount(1);
    await expect(page.locator('#arr-liste')).not.toContainText('Personalefest');
  });

  test('et overstået arrangement vises ikke', async ({ page }) => {
    await åbn(page, '/arrangementer/', {
      data: grunddata({
        kalender: [arrangement({ dato: '2026-08-01' })],
      }),
    });
    await expect(page.locator('#arr-liste .arr-kort')).toHaveCount(0);
    await expect(page.locator('#arr-liste')).toContainText('ikke lagt noget op');
  });

  /* En lukkedag er også en kalenderrække — men den er drift, ikke
     et arrangement, og skal ikke stå som en fest. */
  test('en lukkedag optræder ikke som arrangement', async ({ page }) => {
    await åbn(page, '/arrangementer/', {
      data: grunddata({
        kalender: [{
          id: 3, lokation_id: 'mosede', type: 'lukkedag',
          titel: 'Lukket', emoji: null, dato: '2026-08-21',
          slut_dato: null, lukker_kl: null, offentlig: false,
        }],
      }),
    });
    await expect(page.locator('#arr-liste .arr-kort')).toHaveCount(0);
  });

  test('tom liste er et svar, ikke en tom side', async ({ page }) => {
    await åbn(page, '/arrangementer/');
    await expect(page.locator('#arr-liste .arr-tom')).toBeVisible();
    await expect(page.locator('#arr-liste')).toContainText('ikke lagt noget op');
  });
});

test.describe('De nye sider lover ikke mere end bekræftet', () => {

  /* Bordbestillingen er ikke bygget (fase 4), og om der overhovedet
     tages imod reservationer, er ikke bekræftet. Siden må invitere
     til en samtale — ikke love et bord. */
  test('bord/ peger på telefonen og lover ingen reservation', async ({ page }) => {
    await åbn(page, '/bord/');
    await expect(page.locator('main a[href^="tel:"]').first()).toBeVisible();

    const tekst = (await page.locator('main').innerText()).toLowerCase();
    for (const ord of ['reserver her', 'book direkte', 'garanteret bord', 'vælg tidspunkt']) {
      expect(tekst, `bord/ lover "${ord}"`).not.toContain(ord);
    }
  });

  /* Priser, kapacitet og levering er ikke bekræftet af ejeren —
     samme regel som på selskabssiden, målt på samme måde. */
  for (const sti of ['/bord/', '/catering/', '/baglokale/']) {
    test(`${sti} nævner hverken pris, antal eller levering`, async ({ page }) => {
      await åbn(page, sti);
      const tekst = await page.locator('main').innerText();
      expect(tekst).not.toMatch(/\d+\s*kr/i);
      expect(tekst).not.toMatch(/(op til|plads til)\s+\d+/i);
      expect(tekst.toLowerCase(), `${sti} lover levering`).not.toContain('vi leverer');
    });
  }
});
