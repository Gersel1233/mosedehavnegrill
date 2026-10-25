/* ============================================================
   HVAD KAN GÆSTEN BESTILLE I DAG? — ENDE TIL ENDE  (25/10)
   ------------------------------------------------------------
   Mikkel: *"gør det nemmere at slå fra, om den kun kan bestilles
   enten take-away eller spis her eller begge dele"* — og bagefter:
   *"det skal kun gælde denne dag, det er forvirrende med alt hverdag"*.

   Tre knapper øverst under Åbningstider. De skriver dagens EGEN regel
   (dags_regler) — den kalenderen bruger, og som databasen allerede
   håndhæver. Prøverne går ejerens vej: knap i admin → det, admin GEMTE,
   åbnes på forsiden.
   ============================================================ */

const { test, expect } = require('@playwright/test');
const { åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-08-07T11:00:00Z';   // fredag
const I_DAG = '2026-08-07';
const I_MORGEN = '2026-08-08';

function data(regel, ekstra) {
  const d = grunddata();
  d.indstillinger = { ...d.indstillinger, bestilling_varsel_timer: 0, spis_her: true };
  d.dags_regler = regel ? [{ lokation_id: 'mosede', dato: I_DAG, ...regel }] : [];
  return Object.assign(d, ekstra || {});
}

const regelIDag = (gemt) => (gemt.dags_regler || []).find((r) => r.dato === I_DAG) || null;
const knap = (page, m) => page.locator('#i-dag-valg [data-maade="' + m + '"]');

test.describe('Admin: tre knapper, der kun gælder i dag', () => {
  test('"Kun spis her" lukker take-away i dag — og kun i dag', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: data() });
    await visFane(page, 'p-tider');
    await expect(knap(page, 'begge')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#i-dag-note')).toContainText('7. august');
    await expect(page.locator('#i-dag-note')).toContainText('i morgen er begge dele åbne igen');
    await expect(page.locator('#i-dag-note'), '"i dag" står allerede i titlen').not.toContainText(/^i dag/i);

    await knap(page, 'spis_her').click();
    await expect(page.locator('#kvittering')).toContainText('kun bestilles til at spise her');
    await expect(knap(page, 'spis_her')).toHaveAttribute('aria-pressed', 'true');

    const gemt = await gemteData(page);
    const r = regelIDag(gemt);
    expect(r && r.luk_takeaway, 'take-away lukket i dag').toBe(true);
    expect(r.luk_spis_her).toBe(false);
    expect((gemt.dags_regler || []).filter((x) => x.dato !== I_DAG), 'ingen andre dage røres').toHaveLength(0);
  });

  test('"Begge dele" fjerner dagens lukning igen', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: data({ luk_takeaway: false, luk_spis_her: true }) });
    await visFane(page, 'p-tider');
    await expect(knap(page, 'takeaway')).toHaveAttribute('aria-pressed', 'true');
    await knap(page, 'begge').click();
    await expect(page.locator('#kvittering')).toContainText('både take-away og spis her');
    expect(regelIDag(await gemteData(page)), 'en almindelig dag har ingen række').toBeNull();
  });

  /* ⚠️ DAGENS RÆKKE BÆRER MERE END LUKNINGERNE. Knapperne må ikke tørre
     dagens besked, overskrift, tider eller bordloft af — arret fra 16/9
     i kalenderen (gemRegel). */
  test('dagens besked, tider og bordloft bliver stående', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: data({
      luk_takeaway: false, luk_spis_her: false, tidligst: '12:00',
      besked_til_gaester: 'Vi har musik på havnen i aften', besked_titel: 'Fredag', bord_loft: 20,
    }) });
    await visFane(page, 'p-tider');
    await knap(page, 'takeaway').click();
    await expect(page.locator('#kvittering')).toContainText('kun bestilles take-away');
    const r = regelIDag(await gemteData(page));
    expect(r.luk_spis_her).toBe(true);
    expect(r.besked_til_gaester).toBe('Vi har musik på havnen i aften');
    expect(r.besked_titel).toBe('Fredag');
    expect(String(r.tidligst || '').slice(0, 5)).toBe('12:00');
    expect(r.bord_loft).toBe(20);
  });

  test('ligger der allerede bestillinger til den måde i dag, spørges der først', async ({ page }) => {
    const d = data(null, {
      bestillinger: [{ id: 1, lokation_id: 'mosede', reference: 'SM260807-AAAA1', nummer: 3,
        navn: 'Ole Berg', telefon: '30405060', hent_dato: I_DAG, hent_tid: '12:30',
        linjer: [{ navn: 'Burger', antal: 1, pris: 95 }], fyld: [], antal: 1, status: 'ny',
        intern_note: null, hvordan: 'afhentning', oprettet: '2026-08-07T10:00:00Z' }],
    });
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-tider');
    let spurgt = '';
    page.once('dialog', (dlg) => { spurgt = dlg.message(); dlg.dismiss(); });
    await knap(page, 'spis_her').click();
    await page.waitForTimeout(300);
    expect(spurgt).toContain('Ole Berg');
    expect(regelIDag(await gemteData(page)), 'sagde man nej, sker der intet').toBeNull();
  });
});

test.describe('Hele vejen: admin vælger, gæsten får det i dag — og kun i dag', () => {
  test('admin "Kun spis her" → forsiden: i dag kan ikke vælges til to-go, i morgen kan', async ({ page, browser }) => {
    await åbnAdmin(page, { ur: UR, data: data() });
    await visFane(page, 'p-tider');
    await knap(page, 'spis_her').click();
    await expect(page.locator('#kvittering')).toContainText('kun bestilles til at spise her');
    const gemt = await gemteData(page);

    const gaest = await (await browser.newContext()).newPage();
    await åbnSkal(gaest, '/index.html', { ur: UR, data: gemt });
    await gaest.waitForTimeout(900);
    const dage = await gaest.locator('#dato option').evaluateAll((os) => os.map((o) => o.value));
    expect(dage, 'i dag er lukket for to-go').not.toContain(I_DAG);
    expect(dage, 'i morgen er helt almindelig').toContain(I_MORGEN);
    await expect(gaest.locator('body'), 'gæsten skal vide hvorfor').toContainText('I dag:');
    await expect(gaest.locator('body'), 'og hvad hun så kan').toContainText('spise her');
  });
});
