/* ============================================================
   KØKKENETS OVERBLIK  (29/9)
   ------------------------------------------------------------
   Mikkels ord: bordbestillingen i admin skulle op i "intelligens,
   funktionalitet og brugervenlighed". Tre ting blev valgt:

   1) LAV NU — det ÅBNE, lagt sammen pr. ret på tværs af bordene.
      Varianten er en del af retten (to fyld er to stykker arbejde),
      KLAR tæller ikke (den er lavet), drikke står for sig.
   2) MAD OG DRIKKE hver for sig på kortet — kun når kortet har begge.
   3) STATUS PÅ KORTET — et klart bord skal kunne ses.

   Afdelingen (mad/drikke) er EJERENS: menu_kategorier.afdeling.
   Uret: torsdag 6. august 2026 kl. 13.00 dansk tid.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, visFane } = require('./hjaelp');

const UR = '2026-08-06T11:00:00Z';
const I_DAG = '2026-08-06';
const BORDE = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 },
  { id: 2, lokation_id: 'mosede', nummer: '3', pladser: 2, placering: 'inde', aktiv: true, sortering: 20 },
  { id: 3, lokation_id: 'mosede', nummer: '9', pladser: 4, placering: 'ude', aktiv: true, sortering: 30 },
];
const KAT = [
  { id: 101, lokation_id: 'mosede', navn: 'Burgere', afdeling: 'mad', aktiv: true, sortering: 1 },
  { id: 102, lokation_id: 'mosede', navn: 'Sandwich', afdeling: 'mad', aktiv: true, sortering: 2 },
  { id: 103, lokation_id: 'mosede', navn: 'Øl', afdeling: 'drikke', aktiv: true, sortering: 3 },
];
const vare = (id, kat, navn, pris) => ({ id, kategori_id: kat, navn, pris, aktiv: true, udsolgt: false,
  sortering: id, lokation_id: 'mosede', beskrivelse: null, fremhaevet: false });
const VARER = [vare(1, 101, 'Cheeseburger', 85), vare(2, 102, 'Sandwich', 75), vare(3, 103, 'Fadøl, stor', 55)];

let nr = 0;
const ordre = (bord, status, linjer, min) => ({
  id: ++nr, lokation_id: 'mosede', reference: 'SM260806-' + String(nr).padStart(5, 'A'),
  navn: 'Bord ' + bord, telefon: '00000000', hent_dato: I_DAG, hent_tid: '13:00',
  linjer, fyld: [], antal: 1, status, intern_note: null, besked: null,
  hvordan: 'spis_her', bord_nummer: bord, slettet: null,
  oprettet: new Date(Date.parse(UR) - (min || 5) * 60000).toISOString(),
});

async function åbn(page, bestillinger) {
  await åbnAdmin(page, { ur: UR, data: grunddata({
    borde: BORDE, bestillinger, menu_kategorier: KAT, menu_varer: VARER }) });
  await visFane(page, 'p-borde');
  await page.waitForSelector('#p-borde:not(.skjult)');
}

const piller = (page, raekke) => page.locator(`#koekken-lavnu .koek-lavnu-raekke${raekke} .prod-pille`)
  .evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));

test.describe('Lav nu', () => {
  test('lægger retterne sammen på tværs af bordene — varianten for sig, klar tæller ikke', async ({ page }) => {
    await åbn(page, [
      ordre('7', 'ny', [{ navn: 'Cheeseburger', antal: 2, pris: 85 }, { navn: 'Fadøl, stor', antal: 2, pris: 55 }], 12),
      ordre('3', 'tilberedes', [{ navn: 'Cheeseburger', antal: 1, pris: 85 },
        { navn: 'Sandwich', antal: 1, pris: 75, variant: 'Flæskesteg' }], 8),
      ordre('9', 'ny', [{ navn: 'Sandwich', antal: 2, pris: 75, variant: 'Kebab' }], 4),
      // KLAR: lavet og venter på at blive båret ud — tæller IKKE
      ordre('9', 'klar', [{ navn: 'Cheeseburger', antal: 5, pris: 85 }], 2),
    ]);
    await expect(page.locator('#koekken-lavnu')).toBeVisible();
    const mad = await piller(page, ':not(.drikke)');
    expect(mad, 'retterne er ikke lagt sammen på tværs af bordene').toContain('3 Cheeseburger');
    expect(mad, 'to fyld er to stykker arbejde').toContain('2 Sandwich · Kebab');
    expect(mad).toContain('1 Sandwich · Flæskesteg');
    expect(mad.join(' '), 'det klare bord tæller med i Lav nu').not.toContain('8 Cheeseburger');
    expect(mad.join(' '), 'drikken står blandt maden').not.toContain('Fadøl');
    expect(await piller(page, '.drikke')).toEqual(['2 Fadøl, stor']);
  });

  test('findes ikke, når der ikke er noget åbent', async ({ page }) => {
    await åbn(page, [ordre('7', 'klar', [{ navn: 'Cheeseburger', antal: 1, pris: 85 }])]);
    await expect(page.locator('#koekken-lavnu')).toBeHidden();
  });
});

test.describe('Kortet', () => {
  test('mad og drikke står hver for sig — men kun når kortet har begge', async ({ page }) => {
    await åbn(page, [
      ordre('7', 'ny', [{ navn: 'Fadøl, stor', antal: 2, pris: 55 }, { navn: 'Cheeseburger', antal: 1, pris: 85 }], 9),
      ordre('3', 'ny', [{ navn: 'Cheeseburger', antal: 1, pris: 85 }], 3),
    ]);
    const bord7 = page.locator('.koek-kort[data-bord="7"]');
    await expect(bord7.locator('.koek-gruppe')).toHaveText(['Mad', 'Drikke']);
    // Maden først, selv om gæsten tastede øllen først
    const linjer = await bord7.locator('.koek-linje').evaluateAll((e) => e.map((x) => x.innerText.replace(/\s+/g, ' ')));
    expect(linjer[0]).toContain('Cheeseburger');
    await expect(page.locator('.koek-kort[data-bord="3"] .koek-gruppe')).toHaveCount(0);
  });

  test('et klart bord kan ses: grøn kant og "Klar — bær ud"', async ({ page }) => {
    await åbn(page, [ordre('7', 'klar', [{ navn: 'Cheeseburger', antal: 1, pris: 85 }], 3)]);
    const k = page.locator('.koek-kort[data-bord="7"]');
    await expect(k).toHaveClass(/status-klar/);
    await expect(k.locator('.koek-status')).toHaveText('Klar — bær ud');
    await expect(k).toHaveCSS('border-left-color', 'rgb(31, 122, 74)');
  });
});

test('køen står i to spalter på en iPad', async ({ page }, info) => {
  test.skip(info.project.name === 'mobil', 'telefonen har én spalte');
  await page.setViewportSize({ width: 1024, height: 1366 });
  await åbn(page, [
    ordre('7', 'ny', [{ navn: 'Cheeseburger', antal: 1, pris: 85 }], 9),
    ordre('3', 'ny', [{ navn: 'Cheeseburger', antal: 1, pris: 85 }], 5),
  ]);
  const a = await page.locator('.koek-kort[data-bord="7"]').boundingBox();
  const b = await page.locator('.koek-kort[data-bord="3"]').boundingBox();
  expect(Math.abs(a.y - b.y), 'kortene står ikke side om side').toBeLessThan(4);
  expect(b.x).toBeGreaterThan(a.x + a.width - 1);
});
