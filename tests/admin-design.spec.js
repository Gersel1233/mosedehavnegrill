/* ADMIN SKAL LIGNE ÉT PRODUKT, IKKE FEMTEN SIDER

   Kundens ord (26/8): udseendet i de forskellige faner "er
   elendigt, hvor spiis ... er langt kønnere". Målt, ikke bare
   troet: 58 blokke forklarende prosa stod som brødtekst inde i
   kortene, og overskrifterne var op til 34 px serif — hvert kort
   råbte sit navn og forklarede sig over fire linjer, før
   indholdet begyndte.

   Prøverne her holder komponentsystemet fast:

   · Korthovedet: navnet til venstre (22 px), konsekvensen dæmpet
     til højre. Noten siger, hvad kortet styrer ude på siden.
   · Højst ÉN blok løs prosa pr. kort — resten er hjaelp-linjer
     ved felterne eller slettet.
   · Felterne er til fedtede fingre: mindst 44 px høje.
   · Og gæstesiden må IKKE flytte sig med: komponenterne er
     scopet til body.personale.

   Reglerne måles på den BEREGNEDE stil — en klasse, der ikke
   slår igennem, er ingen regel. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, åbn, grunddata } = require('./hjaelp');

test.describe('Korthovedet', () => {

  test('overskrifterne i admin siger navnet — de råber det ikke', async ({ page }) => {
    await åbnAdmin(page);
    /* Alle paneler på én gang: getComputedStyle virker også på
       skjulte knuder, så vi behøver ikke åbne fjorten faner. */
    const stoerrelser = await page.evaluate(() =>
      [...document.querySelectorAll('.kort .h-panel')].map((h) => ({
        tekst: h.textContent.trim(),
        px: parseFloat(getComputedStyle(h).fontSize),
      })));
    expect(stoerrelser.length).toBeGreaterThan(15);
    for (const h of stoerrelser) {
      expect(h.px, `"${h.tekst}" råber (${h.px}px — loftet er 26)`)
        .toBeLessThanOrEqual(26);
    }
  });

  test('hvert kort med et hoved har sin konsekvens-note', async ({ page }) => {
    await åbnAdmin(page);
    const hoveder = await page.evaluate(() =>
      [...document.querySelectorAll('.kort-hoved')].map((h) => ({
        titel: (h.querySelector('.h-panel') || {}).textContent || '',
        note: (h.querySelector('.kort-note') || {}).textContent || '',
      })));
    expect(hoveder.length, 'korthovederne er forsvundet').toBeGreaterThanOrEqual(20);
    for (const h of hoveder) {
      expect(h.note.trim().length, `"${h.titel.trim()}" mangler sin note`)
        .toBeGreaterThan(8);
    }
  });

  /* DEN, DER HOLDER RODET UDE. 26 blokke løs prosa var det, der
     fik femten faner til at ligne femten sider. En ny fane må
     gerne forklare ét felt (hjaelp) — den må ikke lægge et essay
     oven på kortet igen. */
  test('højst én blok løs prosa pr. kort', async ({ page }) => {
    await åbnAdmin(page);
    const syndere = await page.evaluate(() =>
      [...document.querySelectorAll('#admin .kort')].map((k) => ({
        titel: ((k.querySelector('.h-panel') || {}).textContent || '?').trim(),
        blokke: [...k.children].filter((b) => b.matches('p.vare-tekst')).length,
      })).filter((k) => k.blokke > 1));
    expect(syndere, 'kort med mere end én prosablok: '
      + syndere.map((s) => s.titel).join(', ')).toHaveLength(0);
  });

  test('noten kan læses — den er dæmpet, ikke svag', async ({ page }) => {
    await åbnAdmin(page);
    const farve = await page.evaluate(() => {
      const n = document.querySelector('.kort-note');
      return n ? getComputedStyle(n).color : null;
    });
    // --muted i admin er #6f5b55: 5,97:1 på hvid. Prøven falder,
    // hvis nogen dæmper den forbi det.
    expect(farve).toBe('rgb(111, 91, 85)');
  });
});

test.describe('Felterne er til fedtede fingre', () => {

  /* Tre faner som stikprøve: tekst, tal og select. 44 px er
     WCAG's mindste trykflade — og "mindst 44, gerne mere" var
     også spiis-dokumentets eget tal for sol og sand på
     fingrene. */
  test('felterne i admin er mindst 44 px høje', async ({ page }) => {
    await åbnAdmin(page);

    await page.locator('[data-panel="p-koekken"]').click();
    const ventetid = page.locator('#bord-ventetid');
    expect((await ventetid.boundingBox()).height).toBeGreaterThanOrEqual(44);

    await page.locator('[data-panel="p-borde"]').click();
    const nummer = page.locator('#nyt-bord-nummer');
    expect((await nummer.boundingBox()).height).toBeGreaterThanOrEqual(44);
    const vaelger = page.locator('#nyt-bord-placering');
    expect((await vaelger.boundingBox()).height).toBeGreaterThanOrEqual(44);
  });

  /* OG GÆSTESIDEN MÅ IKKE FLYTTE SIG MED. Komponenterne er
     scopet til body.personale; bestillingsformularen har sin EGEN
     form (spiis-formen, 23/8: 52 px høj, --r-lille runding, tonet
     fyld), og den skal stå, som den gør. Prøven læser gæstens
     egne værdier — falder den, har en admin-regel ramt uden for
     sit scope. */
  test('gæstesidens felter er urørte', async ({ page }) => {
    await åbn(page, '/bestil/', { data: grunddata() });
    const stil = await page.evaluate(() => {
      const f = document.querySelector('#bestil-navn');
      const s = getComputedStyle(f);
      return { radius: s.borderRadius, bg: s.backgroundColor };
    });
    expect(stil.radius, 'gæstens felter har mistet deres egen runding').toBe('14px');
    // Tonet, gennemsigtigt fyld — IKKE admins sandfarvede flade.
    expect(stil.bg, 'gæstens felter har fået admins fyld')
      .toBe('rgba(15, 44, 68, 0.035)');
  });
});
