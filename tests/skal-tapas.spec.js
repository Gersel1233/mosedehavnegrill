/* Tapasfadets kobling.

   Fadet er en anden slags bestilling: man vælger antal personer,
   ikke rækker. To ting er ejerens ord (23/8) — det skal kunne
   bestilles to dage i forvejen, og gæsten skal ringe om fadets
   indhold — og begge dele skal kunne ses i koden. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';

function data(medFad, medBobler) {
  const d = grunddata();
  // Forretningens eget varsel er KORT — fadets skal alligevel gælde
  d.indstillinger.bestilling_varsel_timer = 2;
  d.menu_kategorier.push({ id: 20, afdeling: 'mad', navn: 'Til selskabet', sortering: 30, aktiv: true });
  if (medFad !== false) {
    d.menu_varer.push({
      id: 20, kategori_id: 20, navn: 'Tapasfad, pr. person', beskrivelse: null,
      pris: medFad === 'uden-pris' ? null : 145,
      fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
    });
  }
  if (medBobler) {
    d.menu_varer.push({
      id: 21, kategori_id: 20, navn: 'Cava, flaske', beskrivelse: 'Tør og frisk.',
      pris: 295, fremhaevet: false, udsolgt: false, sortering: 2, aktiv: true,
    });
  }
  return d;
}

async function åbn(page, d) {
  await åbnSkal(page, '/m-tapas.html', { ur: FREDAG, data: d || data() });
}

test.describe('Tapasfadets kobling', () => {
  test('fadet kan først bestilles om to dage', async ({ page }) => {
    await åbn(page);
    const dage = await page.$$eval('#tdato option', (o) => o.map((e) => e.value));

    // Forretningens varsel er 2 timer, men fadet kræver to dage
    expect(dage[0]).toBe('2026-08-09');
    await expect(page.locator('label[for="tdato"] span')).toContainText('mindst 2 dage');
  });

  test('forretningens længere varsel vinder', async ({ page }) => {
    /* Fadets "mindst" må aldrig kunne sætte varslet NED — så
       kunne en enkelt formular omgå det, ejeren har sat i admin,
       og køkkenet fik en bestilling, de ikke kan nå. */
    const d = data();
    d.indstillinger.bestilling_varsel_timer = 24 * 5;
    await åbn(page, d);

    const dage = await page.$$eval('#tdato option', (o) => o.map((e) => e.value));
    expect(dage[0]).toBe('2026-08-12');
  });

  test('prisen kommer fra menukortet, ikke fra designet', async ({ page }) => {
    await åbn(page);
    await page.locator('#tpers').fill('4');

    // Designet regnede med 199; menukortet siger 145
    await expect(page.locator('#tsum b')).toHaveText('580 kr.');
    await expect(page.locator('#tsum')).toContainText('4 × tapas à 145,-');
  });

  test('uden pris står der "Pris følger" — ikke et tal, vi har fundet på', async ({ page }) => {
    /* Ejerens liste kom uden ét eneste tal (23/8). Et beløb, vi
       selv finder på, er værre end ingen pris: gæsten regner
       med det. */
    await åbn(page, data('uden-pris'));
    await page.locator('#tpers').fill('4');

    await expect(page.locator('#tsum b')).toHaveText('Pris følger');
    await expect(page.locator('#tsum')).not.toContainText('199');
  });

  test('tilkøbet står kun, når varen findes i menukortet', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('.addon')).toBeHidden();

    await åbn(page, data(true, true));
    await expect(page.locator('.addon')).toBeVisible();
    await expect(page.locator('.addon h4')).toHaveText('Cava, flaske');
  });

  test('bestillingen lander med fadet pr. person', async ({ page }) => {
    await åbn(page, data(true, true));

    await page.locator('#tpers').fill('6');
    await page.locator('.addon button[data-d="+"]').click();
    await page.locator('#tnavn').fill('Sara Poulsen');
    await page.locator('#ttlf').fill('28871343');
    await page.locator('#tdato').selectOption('2026-08-09');
    await page.locator('#bestil-tapas button.g.solid.blk').click();

    await expect(page.locator('#bestil-tapas h3')).toContainText('Tak, Sara');

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.hent_dato).toBe('2026-08-09');
    expect(b.linjer).toEqual([
      { navn: 'Tapasfad, pr. person', antal: 6, pris: 145 },
      { navn: 'Cava, flaske', antal: 1, pris: 295 },
    ]);
    expect(b.antal).toBe(7);
  });

  test('uden fadet i menukortet kan der ikke bestilles', async ({ page }) => {
    /* Siden bliver — den sælger stadig fadet. Kun formularen
       ryger, og ring-kortet ligger inde i den, så nummeret skal
       findes i foden i stedet. Det er en yderlighed: så snart
       fadet står i menukortet, er formularen der. */
    await åbn(page, data(false));

    await expect(page.locator('#bestil-tapas')).toBeHidden();
    await expect(page.locator('footer a[href^="tel:"]').first()).toBeVisible();
  });

  test('spis her tilbydes kun, når forretningen har slået det til', async ({ page }) => {
    await åbn(page);
    let valg = await page.$$eval('#thow option', (o) => o.map((e) => e.textContent));
    expect(valg).toEqual(['To-go']);

    const d = data();
    d.indstillinger.spis_her = true;
    await åbn(page, d);
    valg = await page.$$eval('#thow option', (o) => o.map((e) => e.textContent));
    expect(valg).toEqual(['To-go', 'Spis her']);
  });

  test('ring-kortet om fadets indhold bliver stående', async ({ page }) => {
    // Ejerens ord: man skal kunne ringe om ændringer af fadet
    await åbn(page);
    await expect(page.locator('.callbox')).toContainText('Ring til os');
    await expect(page.locator('.callbox .tel')).toHaveAttribute('href', 'tel:+4528871343');
  });
});

/* ------------------------------------------------------------
   "DET FÅR I" ER EJERENS LISTE  (29/8)

   Punkterne var designets faste pladsholder, mens fadets
   beskrivelse allerede stod i menukortet — så det, ejeren skrev
   i admin, kom aldrig ud på tapassiden. Nu er listen fadets
   beskrivelse, "·"-adskilt, og designets liste er reserven.

   ⚠️ Fælden, der blev fundet ved at måle: tapas-filens find()
   søger i BESTILLINGSPANELET som standard, og listen står OVER
   panelet — med standard-roden fandtes den aldrig, og alt så
   rigtigt ud imens.
   ------------------------------------------------------------ */
test.describe('Det får I-listen', () => {

  test('fadets beskrivelse bliver til listens punkter', async ({ page }) => {
    const d = data();
    d.menu_varer.find((v) => /tapas/i.test(v.navn)).beskrivelse =
      '5 slags ost · Serranoskinke · Hjemmelavet havnebrød';
    await åbn(page, d);

    const punkter = page.locator('.getlist span');
    await expect(punkter).toHaveCount(3);
    await expect(punkter.nth(1)).toContainText('Serranoskinke');
    /* Hjertet er designets eget, klonet med — ikke en kopi i
       koden. Uden det ville listen skifte form med koblingen. */
    await expect(punkter.first().locator('svg')).toHaveCount(1);
  });

  test('uden en beskrivelse står designets egen liste', async ({ page }) => {
    await åbn(page);   // fadet i prøvedataene har ingen beskrivelse
    await expect(page.locator('.getlist span').first()).toContainText('5 forskellige oste');
  });
});

/* ============================================================
   ET HOP MÅ IKKE LANDE BAG TOPBJÆLKEN  (31/8)

   Kundens ord: *"tapas bestillings delen på telefon er elendigt
   ift layoutet — det skævt."*

   ⚠️ MÅLT PÅ EN IPHONE 13, og det var ikke layoutet: designets
   egen rullefunktion i havnegrillen.js trak en fast konstant på
   40 px fra, når man hopper til et afsnit. .topbar er FAST og
   115 px høj. Altså landede afsnittets øverste 75 px BAG
   bjælken — på tapassiden betød det, at panelets overskrift og
   hele den første række (Dag og Tidspunkt) var skjult, i det
   sekund man trykkede på knappen, der førte derhen.

   Det rammer ALLE ni designsider: "Reservér plads" på
   kalenderen, den flydende pille på forsiden, hvert punkt i
   skuffemenuen. Ét tal, ni sider.

   ⚠️ OG HØJDEN LÆSES AF BJÆLKEN, ikke skrevet som et nyt tal —
   ellers skrider de to fra hinanden, den dag bjælken bliver
   højere. Prøven her sammenligner to UAFHÆNGIGE elementer:
   panelets top mod bjælkens bund. Et spørgsmål til koden om dens
   egen konstant ville bestå, også hvis bjælken var 200 px.
   ============================================================ */
test.describe('Hoppet lander under bjælken, ikke bag den', () => {

  test.skip(({ isMobile }) => !isMobile, 'bjælken er telefonens');

  test('panelets overskrift er synlig, når man trykker Bestil tapas', async ({ page }) => {
    await åbn(page, data(true));

    /* ⚠️ MED ET FAD I MENUEN. Uden det skjuler panelet sig med
       vilje — og et skjult element har hverken offsetTop eller en
       kasse, så målingen ville sige 0 og se ud som en fejl. Den
       fælde kostede en runde her. */
    await expect(page.locator('#bestil-tapas')).toBeVisible();

    await page.locator('a[href="#bestil-tapas"]').first().click();
    await page.waitForTimeout(900);

    const m = await page.evaluate(() => {
      const p = document.getElementById('bestil-tapas').getBoundingClientRect();
      const b = document.querySelector('.topbar').getBoundingClientRect();
      const h = document.querySelector('#bestil-tapas h2, #bestil-tapas h3');
      return { panelTop: Math.round(p.top), bjaelkeBund: Math.round(b.bottom),
        titelTop: h ? Math.round(h.getBoundingClientRect().top) : null };
    });

    expect(m.panelTop, 'panelets top ligger bag bjælken')
      .toBeGreaterThanOrEqual(m.bjaelkeBund);
    /* Og overskriften — den er dét, man kigger efter, når man er
       landet et sted. */
    expect(m.titelTop, 'overskriften er skjult bag bjælken')
      .toBeGreaterThanOrEqual(m.bjaelkeBund);
    // Men den skal heller ikke stå langt nede på skærmen.
    expect(m.panelTop - m.bjaelkeBund).toBeLessThan(80);
  });
});
