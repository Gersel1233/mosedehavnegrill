/* CATERING OG FROKOST — OPDATERET OG SÆLGENDE  (14/9)

   Kundens ord: "catering og frokostordning-siden er også forældet og
   ikke up to date eller god og sælgende nok."

   To ting måles, og de er to forskellige slags:

   1) CATERINGENS PRISER ER MENUKORTETS. Siden sagde ikke ét tal, så
      gæsten gættede. Nu står den laveste pris pr. punkt — men KUN som
      menukortet siger den: intet tal i HTML'en, ingen linje uden en
      pris, og enheden står med (et tapasfad er pr. person).
   2) FROKOSTSIDEN HAR MADEN AT SE. Den var den eneste salgsside uden
      ét foto, og dens startdato stod fast på 1. september — en dato,
      der var gået, da siden blev åbnet. */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

function medCatering() {
  const d = grunddata();
  d.menu_kategorier = (d.menu_kategorier || []).concat([
    { id: 26, afdeling: 'mad', navn: 'Tapasfad', sortering: 26, aktiv: true },
    { id: 28, afdeling: 'mad', navn: 'Sliders', sortering: 28, aktiv: true },
    { id: 29, afdeling: 'mad', navn: 'Reception og pindemad', sortering: 29, aktiv: true },
    { id: 14, afdeling: 'mad', navn: 'Håndmadder', sortering: 14, aktiv: true },
  ]);
  const v = (id, kat, navn, pris, ekstra) => Object.assign({
    id, kategori_id: kat, navn, beskrivelse: null, pris,
    fremhaevet: false, udsolgt: false, sortering: id, aktiv: true,
  }, ekstra || {});
  d.menu_varer = (d.menu_varer || []).concat([
    v(901, 26, 'Tapasfad', 179),
    v(902, 28, 'Slider med roastbeef', 45),
    v(903, 28, 'Slider med æg', 40),
    v(904, 28, 'Slider med guld', 5, { aktiv: false }),
    v(905, 14, 'Æggesalat, håndmad', 27),
  ]);
  return d;
}

test.describe('Cateringens priser', () => {

  test('hvert punkt får menukortets laveste pris — med sin enhed', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: medCatering() });
    const pris = (m) => page.locator('.getlist .gl-pris[data-fra="' + m + '"]');
    await expect(pris('^tapasfad')).toHaveText('179,- pr. person');
    /* Laveste AKTIVE pris: 40 og ikke den slukkede 5. "fra", fordi
       sliderne koster forskelligt. */
    await expect(pris('^sliders')).toHaveText('sliders fra 40,- stk.');
    /* Grunddata har også hele skiver til en højere pris, så det er
       "fra" — som i produktionen (håndmad 27, hel skive 55). */
    await expect(pris('^(smørrebrød|håndmadder)$')).toHaveText('fra 27,- stk.');
    await expect(pris('^tapasfad')).toBeVisible();
  });

  test('uden en pris på kortet står punktet uden linje', async ({ page }) => {
    /* grunddata har ingen pindemad — linjen må ikke sige "fra 0,-". */
    await åbnSkal(page, '/h-catering.html', { data: medCatering() });
    const pinde = page.locator('.getlist .gl-pris[data-fra="pindemad"]');
    await expect(pinde, 'vagt: pladsen findes').toHaveCount(1);
    await expect(pinde).toBeHidden();
    await expect(pinde).toHaveText('');
  });

  test('der står intet tal i HTML\'en — prisen kan ikke skride fra kortet', () => {
    const html = fs.readFileSync('h-catering.html', 'utf8');
    const spans = [...html.matchAll(/<small class="gl-pris"[^>]*>([^<]*)<\/small>/g)];
    expect(spans.length, 'priserne er væk fra listen').toBeGreaterThan(2);
    for (const [, indhold] of spans) expect(indhold.trim(), 'et tal er skrevet af i HTML\'en').toBe('');
  });
});

test.describe('Frokostsiden', () => {

  test('maden kan ses — et galleri, der skifter', async ({ page }) => {
    await åbnSkal(page, '/h-frokost.html', { data: grunddata() });
    await expect(page.locator('.foto-galleri image-slot')).toHaveCount(0);
    await expect(page.locator('.foto-galleri .gal > .foto-skift')).toHaveCount(3);
    const hoejder = await page.locator('.foto-galleri .gal > *')
      .evaluateAll((ns) => ns.map((n) => Math.round(n.getBoundingClientRect().height)));
    for (const h of hoejder) expect(h, 'en ramme er faldet sammen').toBeGreaterThan(80);
  });

  /* ============================================================
     FROKOSTENS ALLERGIFELT BLEV ALDRIG LÆST  (16/9)
     ------------------------------------------------------------
     MÅLT af en gennemgang og bekræftet i koden: h-frokost.html HAR
     et allergifelt (#fallergi) og en samtykkelinje — men ordet
     "allergi" optræder NUL gange i js/skal/forespoergsel.js, og
     frokostens opsætning kender kun adresse, firma og cvr.

     Et firma skriver "nødder", trykker send, og oplysningen findes
     ikke bagefter. Samtykkelinjen ligger med klassen `skjult`, og
     intet fjerner den nogensinde — så gæsten har heller aldrig
     haft mulighed for at sige ja.

     ⚠️ MÅLES GENNEM SKÆRMEN. Et spørgsmål til Butik.medAllergi
     ville bestå: reglen har været i orden hele tiden. Det var
     siden, der aldrig spurgte den.
     ============================================================ */
  async function udfyldFrokost(page, allergi, sigJa) {
    await åbnSkal(page, '/h-frokost.html', { data: grunddata() });
    await page.locator('#fnavn').fill('Bogholderiet');
    await page.locator('#ftlf').fill('20304050');
    /* Uret i åbnSkal står 7. august 2026, og frokosten har tre
       dages varsel — datoen skal være langt nok ude, ellers
       spærrer et HELT andet værn, og prøven måler ikke sit eget. */
    await page.locator('#fstart').fill('2026-08-20');
    if (allergi) {
      await page.locator('#fallergi').fill(allergi);
      if (sigJa) await page.locator('#fallergi-samtykke').check();
    }
    await page.locator('button.g.solid.blk').click();
  }

  test('frokost: fluebenet dukker op, når der skrives en allergi', async ({ page }) => {
    await åbnSkal(page, '/h-frokost.html', { data: grunddata() });
    const linje = page.locator('#fallergi-samtykke-linje');
    await expect(linje).toBeHidden();
    await page.locator('#fallergi').fill('nødder');
    await expect(linje).toBeVisible();
    /* Og det nulstilles igen — ellers står et gammelt ja og gælder
       en allergi, gæsten har slettet. */
    await page.locator('#fallergi').fill('');
    await expect(linje).toBeHidden();
  });

  test('frokost: allergien kommer med — forrest, med ordet ALLERGI:', async ({ page }) => {
    await udfyldFrokost(page, 'nødder', true);
    await expect.poll(async () =>
      ((await gemteData(page)).forespoergsler || [{}])[0].besked || '')
      .toMatch(/^ALLERGI: nødder/);
  });

  /* ⚠️ MODSTYKKET: uden en allergi må ingenting spærre. Kan man
     ikke sende uden at sige ja til at få gemt en helbredsoplysning,
     er samtykket ikke frivilligt — og så er det ikke gyldigt. */
  test('frokost: uden en allergi spærrer ingenting', async ({ page }) => {
    await udfyldFrokost(page, null, false);
    await expect.poll(async () =>
      ((await gemteData(page)).forespoergsler || []).length).toBe(1);
  });

  test('startdatoen står ikke fast på en dag, der er gået', () => {
    const html = fs.readFileSync('h-frokost.html', 'utf8');
    expect(html).not.toMatch(/id="fstart"[^>]*value="/);
  });
});
