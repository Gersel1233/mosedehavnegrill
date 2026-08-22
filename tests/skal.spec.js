/* Skallen: navigationen og de fire nye sider.

   Hele produktet har nu én indgang pr. ærinde — smørrebrød, bord,
   selskaber, catering, baglokale, arrangementer — og de her tests
   holder skallen sammen: at alle indgange findes, at menuen kan
   være der, og at de nye sider ikke lover noget, forretningen
   ikke har bekræftet. */

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

test.describe('Mulighederne på forsiden', () => {

  /* Ærinderne er samlet ét sted: afsnittet "Hvad kan vi hjælpe
     med?". De seks er den samme slags opkald — man ringer om dem
     alle. Testen for indholdet ligger i forside.spec.js; her måles
     kun, at rækkerne findes.

     De var .mulighed i et net af firkanter før. Designbundtet gør
     dem til brede rækker, fordi seks rækker kan scannes med
     tommelfingeren nedad, mens seks kvadrater tvinger øjet frem og
     tilbage to ad gangen. */
  test('rækkerne med ærinder findes på forsiden', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#hjaelp .row-card')).toHaveCount(6);
  });

  /* Kortene er den samme slags løfte som resten af siden: ingen
     opfundne tal. Priser og antal er ikke bekræftet af ejeren. */
  test('kortene nævner hverken pris eller antal', async ({ page }) => {
    await åbn(page, '/index.html');
    const tekst = await page.locator('#hjaelp').innerText();
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

/* INDTONINGEN MÅ ALDRIG KUNNE GØRE INDHOLD USYNLIGT FOR EVIGT.

   Det skete: .rev-motoren boede i js/side.js, som kun forsiden
   indlæser, og bestil/ og smørrebrødssiden havde .rev-sektioner.
   Fem sektioner stod med opacity 0 i luften — hele
   smørrebrødssidens indhold var usynligt. Fundet 22/8 ved at måle
   opacity, ikke ved at læse kode.

   Motoren bor i js/faelles.js nu, og prøven her går ALLE sider
   igennem: hvert eneste .rev-element skal ende synligt, når man
   har rullet forbi det. Fjernes motoren fra faelles.js, fælder
   den her — det er efterprøvet. */
test.describe('Indtoningen efterlader aldrig noget usynligt', () => {

  const SIDER = ['/index.html', '/bestil/', '/smoerrebroed-ud-af-huset/',
    '/bord/', '/selskaber/', '/catering/', '/baglokale/',
    '/arrangementer/', '/nyheder/', '/menu.html'];

  test('alle .rev-blokke toner ind på alle sider', async ({ page }) => {
    for (const sti of SIDER) {
      await åbn(page, sti);
      const antal = await page.locator('.rev').count();
      if (!antal) continue;

      // Rul hele siden igennem, så observeren ser hvert element
      await page.evaluate(async () => {
        const h = document.body.scrollHeight;
        for (let y = 0; y <= h; y += 300) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
      });

      /* Kun blokke, der faktisk ER på siden. #dagens og #nyheder
         er display:none uden data i databasen — det er deres
         KORREKTE tilstand, ikke buggen her jagter. En blok uden
         layout-boks (display:none) filtreres fra.

         KORTENE MÅLES OGSÅ, ikke kun sektionerne. Nyhedskort,
         tovalg, rækker og platter toner ind ét ad gangen med
         deres egen opacity — knækker `.rev.in .nw`-reglerne i
         CSS'en, står kortene usynlige inde i en fuldt synlig
         sektion, og en måling på sektionen alene ville aldrig
         se det. Præcis den klasse af fejl har siden haft før:
         fem sektioner stod med opacity 0 i luften. */
      await expect.poll(async () => page.evaluate(
        () => [...document.querySelectorAll(
          '.rev, .rev .nw, .rev .valgkort, .rev .row-card, .rev .plattekort')]
          .filter((e) => e.getClientRects().length > 0)
          .filter((e) => Number(getComputedStyle(e).opacity) < 0.9).length
      ), { message: `${sti}: .rev-blokke forbliver usynlige`, timeout: 6000 }).toBe(0);
    }
  });
});

