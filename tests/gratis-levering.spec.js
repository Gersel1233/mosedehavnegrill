/* ============================================================
   GRATIS LEVERING  (14. okt 2026)
   ------------------------------------------------------------
   Mikkels ord: *"de kan slå prisen på levering fra og til, så gratis
   … og de også kan ændre prisen … på lanceringsdagen her fredag skal
   levering være gratis"*.

   Indstillingen gratis_levering = { fra, til } — slået fra = false.
   Den gælder LEVERINGSDAGEN. Gebyret (79) røres ikke og gælder igen
   bagefter. Kurvens halvdel står i skal-smoerrebroed.spec.js
   («Fragten står i summen»).

   ⚠️ URET står fredag 7. august 2026 kl. 13 (hjaelp.js). Datoerne
   nedenfor er regnet i hånden ud fra det.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const IDAG = '2026-08-07';
const NAESTE_FREDAG = '2026-08-14';

test.describe('Reglen', () => {
  test('gratis på leveringsdagen — og kun den', async ({ page }) => {
    await åbnSkal(page, 'bestil/', { data: grunddata() });
    const svar = await page.evaluate(([idag, naeste]) => {
      const R = window.MosedeRegler;
      const d = (g) => ({ indstillinger: { leverings_gebyr: 79, gratis_levering: g } });
      const fredag = { fra: naeste, til: naeste };
      return {
        paaDagen: R.levering(d(fredag), 'levering', naeste),
        dagenFoer: R.levering(d(fredag), 'levering', idag),
        dagenEfter: R.levering(d(fredag), 'levering', '2026-08-15'),
        altid: R.levering(d({ fra: null, til: null }), 'levering', '2027-01-01'),
        fra: R.levering(d(false), 'levering', naeste),
        hent: R.levering(d({ fra: null, til: null }), 'afhentning', naeste),
      };
    }, [IDAG, NAESTE_FREDAG]);
    expect(svar.paaDagen.ialt, 'fragten blev lagt på den gratis dag').toBe(0);
    expect(svar.paaDagen.gratis).toBe(true);
    // Udenfor perioden: ejerens eget gebyr, urørt.
    expect(svar.dagenFoer.ialt).toBe(79);
    expect(svar.dagenEfter.ialt).toBe(79);
    expect(svar.altid.gratis, 'uden datoer gælder den til den slås fra').toBe(true);
    expect(svar.fra.ialt, 'slået fra skal koste som før').toBe(79);
    expect(svar.hent.gratis, 'en afhentning har ingen fragt at gøre gratis').toBeFalsy();
  });
});

test.describe('Gæsten ser det', () => {
  function medLevering(gratis) {
    const d = grunddata();
    Object.assign(d.indstillinger, {
      levering: true, leverings_omraade: 'Greve og Tune', leverings_gebyr: 79, gratis_levering: gratis,
    });
    return d;
  }

  test('gratis i dag: forsiden siger det i stedet for prisen', async ({ page }) => {
    await åbnSkal(page, '/', { data: medLevering({ fra: IDAG, til: IDAG }) });
    const felt = page.locator('#bestil .lev-nyhed');
    await expect(felt).toContainText('Gratis levering i dag.');
    await expect(felt).not.toContainText('79,- pr. bestilling');
  });

  /* I forvejen: prisen står, og dagen står under den — så lanceringen
     kan annonceres, før den er der. */
  test('gratis på fredag: prisen står i dag, og fredagen står under', async ({ page }) => {
    await åbnSkal(page, '/', { data: medLevering({ fra: NAESTE_FREDAG, til: NAESTE_FREDAG }) });
    const felt = page.locator('#bestil .lev-nyhed');
    await expect(felt).toContainText('79,- pr. bestilling');
    await expect(felt).toContainText('Gratis levering fredag 14. august.');
  });

  test('når perioden er forbi, står der intet om den', async ({ page }) => {
    await åbnSkal(page, '/', { data: medLevering({ fra: '2026-08-01', til: '2026-08-02' }) });
    const felt = page.locator('#bestil .lev-nyhed');
    await expect(felt).toContainText('79,- pr. bestilling');
    await expect(felt).not.toContainText('Gratis');
  });
});

test.describe('Chefen slår den til og fra', () => {
  async function leveringen(page, ekstra) {
    const d = grunddata();
    Object.assign(d.indstillinger, { levering: true, leverings_gebyr: 79 }, ekstra || {});
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-tider');
    await page.locator('#levering-gratis').waitFor({ state: 'attached' });
  }

  test('hak og datoer gemmes, og prisen bliver stående', async ({ page }) => {
    await leveringen(page);
    await expect(page.locator('#levering-gratis-status')).toContainText('Slået fra');
    await expect(page.locator('#levering-gratis-datoer')).toBeHidden();
    await page.locator('#levering-gratis').check();
    await page.locator('#levering-gratis-fra').fill(NAESTE_FREDAG);
    await page.locator('#levering-gratis-til').fill(NAESTE_FREDAG);
    await page.locator('#levering-gratis-gem').click();
    await expect.poll(async () => JSON.stringify((await gemteData(page)).indstillinger.gratis_levering))
      .toBe(JSON.stringify({ fra: NAESTE_FREDAG, til: NAESTE_FREDAG }));
    const ind = (await gemteData(page)).indstillinger;
    expect(Number(ind.leverings_gebyr), 'prisen blev rørt').toBe(79);
    await expect(page.locator('#levering-gratis-status')).toContainText('Gratis levering fredag 14. august');
    await expect(page.locator('#levering-gratis-status')).toContainText('79 kr.');
  });

  test('hakket af slår den fra igen', async ({ page }) => {
    await leveringen(page, { gratis_levering: { fra: null, til: null } });
    await expect(page.locator('#levering-gratis')).toBeChecked();
    // At tage hakket af er altid sikkert — det gemmes med det samme.
    await page.locator('#levering-gratis').uncheck();
    await expect.poll(async () => (await gemteData(page)).indstillinger.gratis_levering).toBe(false);
  });

  test('«til og med» før «fra» bliver afvist', async ({ page }) => {
    await leveringen(page);
    await page.locator('#levering-gratis').check();
    await page.locator('#levering-gratis-fra').fill(NAESTE_FREDAG);
    await page.locator('#levering-gratis-til').fill(IDAG);
    await page.locator('#levering-gratis-gem').click();
    await expect(page.locator('#fejl')).toContainText('«Til og med» ligger før «Fra»');
    expect((await gemteData(page)).indstillinger.gratis_levering || false).toBe(false);
  });

  /* ⚠️ ET HAK ALENE ER "GRATIS FRA NU". Første udgave gemte det i samme
     sekund — onsdag, mens chefen planlagde fredag. Også når et ANDET felt i
     kortet gemmer sig selv bagefter (prisen), må hakket ikke komme med. */
  test('et hak alene gør ikke leveringen gratis — først Gem', async ({ page }) => {
    await leveringen(page);
    await page.locator('#levering-gratis').check();
    await expect(page.locator('#levering-gratis-status')).toContainText('Ikke gemt endnu');
    await page.locator('#levering-gebyr').fill('79');
    await page.locator('#levering-gebyr').blur();
    await page.waitForTimeout(1600);
    expect((await gemteData(page)).indstillinger.gratis_levering || false,
      'leveringen blev gratis, før nogen trykkede Gem').toBe(false);
  });

  test('prisen kan stadig ændres', async ({ page }) => {
    await leveringen(page);
    await page.locator('#levering-gebyr').fill('59');
    await page.locator('#gem-levering').click();
    await expect.poll(async () => Number((await gemteData(page)).indstillinger.leverings_gebyr)).toBe(59);
  });
});
