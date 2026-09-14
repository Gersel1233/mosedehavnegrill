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
const { åbnSkal, grunddata } = require('./hjaelp');

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

  test('startdatoen står ikke fast på en dag, der er gået', () => {
    const html = fs.readFileSync('h-frokost.html', 'utf8');
    expect(html).not.toMatch(/id="fstart"[^>]*value="/);
  });
});
