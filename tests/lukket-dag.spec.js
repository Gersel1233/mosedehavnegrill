/* ============================================================
   EN LUKKET DAG SIGER DET PÅ SIDEN  (5/9)
   ------------------------------------------------------------
   Kundens ord: der skal *"eventuelt komme en lille besked ting
   derude at i dag er der lukket for køkkenet eller lukket for
   to-go, spisning, mad"*.

   ⚠️ MÅLT, IKKE LÆST: `Butik.maaBestille` — funktionen, der ved,
   om dagen er lukket for den ene eller den anden måde — havde
   INGEN læsere på gæstesiden overhovedet. Kun en dag lukket for
   BEGGE dele forsvandt fra dagvælgeren (`dagenHeltLukket`).

   Var dagen lukket for KUN to-go eller KUN spis her, kunne
   gæsten vælge dagen, fylde kurven, skrive navn og nummer — og
   først få databasens `bestilling_takeaway_lukket` at se, når
   hun trykkede send. Husets egen regel: **et krav, man møder som
   et afslag, er skrevet det forkerte sted.**

   ⚠️ OG DAGEN BLIVER STÅENDE, SPÆRRET. En dag, der MANGLER,
   ligner en fejl, og gæsten leder efter den i stedet for at
   vælge en anden — samme regel som den fulde lørdag i
   bordstriben. */
const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, grunddata } = require('./hjaelp');

const UR = '2026-08-07T11:00:00Z';   // fredag
const I_DAG = '2026-08-07';

function medRegel(regel) {
  const d = grunddata();
  d.indstillinger = { ...d.indstillinger, bestilling_varsel_timer: 0, spis_her: true };
  d.dags_regler = [{ lokation_id: 'mosede', dato: I_DAG, ...regel }];
  d.borde = [{ id: 1, lokation_id: 'mosede', nummer: '7', aktiv: true, har_kode: false }];
  return d;
}

test.describe('Forsiden', () => {
  test('en dag uden to-go siger hvorfor — og hvad der ER muligt', async ({ page }) => {
    /* ⚠️ TO UAFHÆNGIGE TING MÅLES. Først at i dag FAKTISK er ude
       af vælgeren (tallet udefra — beviset for, at der er noget
       at forklare), og derefter at siden så siger hvorfor. Et
       spørgsmål til linjen alene ville bestå på en side, hvor
       dagen stod der hele tiden. */
    await åbnSkal(page, '/index.html',
      { ur: UR, data: medRegel({ luk_takeaway: true, luk_spis_her: false }) });
    await page.waitForTimeout(900);

    const dage = await page.locator('#dato option').evaluateAll(
      (os) => os.map((o) => o.value));
    expect(dage.length, 'der skal VÆRE dage at bestille til').toBeGreaterThan(0);
    expect(dage, 'i dag er lukket for to-go og skal derfor ikke kunne vælges')
      .not.toContain(I_DAG);

    const hint = page.locator('#dato-hint, .dato-hint, #bestil-hint').first();
    await expect(page.locator('body'),
      'gæsten skal vide, hvorfor i dag mangler').toContainText('I dag:');
    await expect(page.locator('body'),
      'og hvad hun så kan gøre i stedet').toContainText('spise her');
    expect(hint).toBeTruthy();
  });

  test('en helt åben dag siger ingenting', async ({ page }) => {
    /* ⚠️ MODSTYKKET, OG UDEN DET MÅLTE PRØVEN OVENFOR INGENTING.
       En regel, der skriver linjen hver eneste dag, ville bestå
       den — og så læste ingen den den dag, den betød noget. */
    await åbnSkal(page, '/index.html', { ur: UR, data: medRegel({}) });
    await page.waitForTimeout(900);
    const dage = await page.locator('#dato option').evaluateAll(
      (os) => os.map((o) => o.value));
    expect(dage, 'en åben dag skal kunne vælges').toContain(I_DAG);
    await expect(page.locator('body')).not.toContainText('lukket for');
  });
});

test.describe('bestil/', () => {
  test('en dag uden mad ud af huset siger hvorfor', async ({ page }) => {
    /* bestil/ er smørrebrød UD AF HUSET — både afhentning og
       levering er take-away, så en lukket to-go lukker dagen. */
    await åbn(page, '/bestil/',
      { ur: UR, data: medRegel({ luk_takeaway: true, luk_spis_her: false }) });
    await page.waitForTimeout(900);
    const dage = await page.locator('#bestil-dag option').evaluateAll(
      (os) => os.map((o) => o.value));
    expect(dage.length).toBeGreaterThan(0);
    expect(dage).not.toContain(I_DAG);
    await expect(page.locator('#bestil-dag-note')).toContainText('ud af huset');
  });

  test('og en åben dag kan stadig vælges', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: UR, data: medRegel({}) });
    await page.waitForTimeout(900);
    const dage = await page.locator('#bestil-dag option').evaluateAll(
      (os) => os.map((o) => o.value));
    expect(dage).toContain(I_DAG);
  });
});

test.describe('Ved bordet', () => {
  test('et bord er spis her — er dagen lukket for det, siger kortet det', async ({ page }) => {
    /* ⚠️ VED BORDET ER DER INGEN DAGVÆLGER. Dagen ER i dag, og
       måden ER spis her, så beskeden kan ikke stå i en vælger,
       gæsten ikke har. Uden linjen ville hun scanne mærkatet,
       læse hele kortet og først få nej ved afsendelsen. */
    await åbn(page, '/ved-bordet/?bord=7',
      { ur: UR, data: medRegel({ luk_takeaway: false, luk_spis_her: true }) });
    await page.waitForTimeout(1200);
    const linje = page.locator('#bestil-lukkede');
    await expect(linje).toBeVisible();
    await expect(linje).toContainText('I dag');
    await expect(linje, 'gæsten skal vide, hvad hun kan gøre i stedet')
      .toContainText('med hjem');
  });

  test('en almindelig dag siger ingenting ved bordet', async ({ page }) => {
    await åbn(page, '/ved-bordet/?bord=7', { ur: UR, data: medRegel({}) });
    await page.waitForTimeout(1200);
    await expect(page.locator('#bestil-lukkede')).toBeHidden();
  });
});

test('beskeden siger, hvad der ER muligt — ikke bare nej', async ({ page }) => {
  /* Reglen er husets: gæsten skal vide, hvad hun så kan gøre.
     Er kun to-go lukket, kan hun spise her — og omvendt. */
  await åbn(page, '/ved-bordet/?bord=7',
    { ur: UR, data: medRegel({ luk_takeaway: true, luk_spis_her: true }) });
  await page.waitForTimeout(1200);
  await expect(page.locator('#bestil-lukkede'),
    'begge veje lukket er en lukkedag — så lov ikke noget i stedet')
    .toContainText('Køkkenet er lukket');
});
