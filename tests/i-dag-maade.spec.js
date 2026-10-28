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
  /* 28/10: knapperne er to-go, spis her og levering — hver for sig.
     Grøn (aria-pressed=true) = åben i dag. */
  test('"To-go" lukkes i dag — og kun i dag', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: data() });
    await visFane(page, 'p-tider');
    await expect(knap(page, 'togo')).toHaveAttribute('aria-pressed', 'true');
    await expect(knap(page, 'spis_her')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#i-dag-note')).toContainText('7. august');
    await expect(page.locator('#i-dag-note')).toContainText('i morgen er alt som det plejer');
    await expect(page.locator('#i-dag-note'), '"i dag" står allerede i titlen').not.toContainText(/^i dag/i);

    await knap(page, 'togo').click();
    await expect(page.locator('#kvittering')).toContainText('To-go er lukket i dag');
    await expect(knap(page, 'togo')).toHaveAttribute('aria-pressed', 'false');
    await expect(knap(page, 'togo')).toContainText('Lukket');
    await expect(page.locator('#i-dag-hjaelp')).toContainText('I dag kan gæsten bestille: spis her');

    const gemt = await gemteData(page);
    const r = regelIDag(gemt);
    expect(r && r.luk_takeaway, 'to-go lukket i dag').toBe(true);
    expect(r.luk_spis_her).toBe(false);
    expect((gemt.dags_regler || []).filter((x) => x.dato !== I_DAG), 'ingen andre dage røres').toHaveLength(0);
  });

  test('at åbne igen fjerner dagens lukning', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: data({ luk_takeaway: false, luk_spis_her: true }) });
    await visFane(page, 'p-tider');
    await expect(knap(page, 'spis_her')).toHaveAttribute('aria-pressed', 'false');
    await knap(page, 'spis_her').click();
    await expect(page.locator('#kvittering')).toContainText('Spis her er åben i dag');
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
    await knap(page, 'spis_her').click();
    await expect(page.locator('#kvittering')).toContainText('Spis her er lukket i dag');
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
    await knap(page, 'togo').click();
    await page.waitForTimeout(300);
    expect(spurgt).toContain('Ole Berg');
    expect(regelIDag(await gemteData(page)), 'sagde man nej, sker der intet').toBeNull();
  });

  /* LEVERINGSDAGEN (28/10). Mikkel: "kun spis her og levering, ikke to-go".
     Levering er slået FRA i indstillingerne; dagen åbner den selv. */
  test('leveringsdag: levering åbnes for i dag, to-go lukkes — levering bliver åben', async ({ page }) => {
    const d = data();
    d.indstillinger.levering = false;
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-tider');
    await expect(knap(page, 'levering')).toHaveAttribute('aria-pressed', 'false');
    await knap(page, 'levering').click();
    await expect(page.locator('#kvittering')).toContainText('Levering er åben i dag');
    await expect(knap(page, 'levering')).toHaveAttribute('aria-pressed', 'true');
    await knap(page, 'togo').click();
    await expect(page.locator('#kvittering')).toContainText('To-go er lukket i dag');
    await expect(knap(page, 'levering'), 'levering må ikke lukke med to-go').toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#i-dag-hjaelp')).toContainText('spis her og levering');

    const r = regelIDag(await gemteData(page));
    expect(r.luk_takeaway).toBe(true);
    expect(r.luk_levering).toBe(false);
    expect(r.luk_spis_her).toBe(false);
  });
});

test.describe('Hele vejen: admin vælger, gæsten får det i dag — og kun i dag', () => {
  test('admin lukker to-go → forsiden: i dag kan ikke vælges til to-go, i morgen kan', async ({ page, browser }) => {
    await åbnAdmin(page, { ur: UR, data: data() });
    await visFane(page, 'p-tider');
    await knap(page, 'togo').click();
    await expect(page.locator('#kvittering')).toContainText('To-go er lukket i dag');
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

  test('leveringsdag → gæsten: i dag levering og spis her, ikke afhentning; i morgen ingen levering', async ({ page, browser }) => {
    const d = data();
    d.indstillinger.levering = false;
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-tider');
    await knap(page, 'levering').click();
    await expect(page.locator('#kvittering')).toContainText('Levering er åben i dag');
    await knap(page, 'togo').click();
    await expect(page.locator('#kvittering')).toContainText('To-go er lukket i dag');
    const gemt = await gemteData(page);

    const gaest = await (await browser.newContext()).newPage();
    await åbnSkal(gaest, '/index.html', { ur: UR, data: gemt });
    await gaest.waitForTimeout(900);
    const svar = await gaest.evaluate(([dag, morgen]) => Butik.hent().then((dd) => ({
      levIDag: Butik.maaBestille(dd, dag, 'levering'),
      henteIDag: Butik.maaBestille(dd, dag, 'afhentning'),
      spisIDag: Butik.maaBestille(dd, dag, 'spis_her'),
      levIMorgen: Butik.maaBestille(dd, morgen, 'levering'),
      knap: Butik.leveringNogenDag(dd),
      hvorfor: Butik.dagLukketFor(dd, dag, 'afhentning'),
    })), [I_DAG, I_MORGEN]);
    expect(svar).toEqual(expect.objectContaining({
      levIDag: true, henteIDag: false, spisIDag: true, levIMorgen: false, knap: true }));
    expect(svar.hvorfor).toContain('få den leveret');
    // Forsidens måde-knapper: Levering står, fordi en dag har den.
    await expect(gaest.locator('[data-seg="how"] button').nth(2)).toBeVisible();
  });
});
