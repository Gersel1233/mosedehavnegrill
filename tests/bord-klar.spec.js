/* ============================================================
   DIN MAD ER KLAR — BESTILLING VED BORDET  (15/9)
   ------------------------------------------------------------
   Kundens spørgsmål: "en løsning ift. når folk bestiller ved
   bordene med QR-koden, så de ved, når ens mad er klar — man kan
   også lave afhentning oppe ved disken." Mikkels valg: ejeren
   vælger i admin — "Vi bærer den ud" (standard) eller "Gæsten
   henter ved lugen" (bord_hent_selv).

   Prøverne måler begge halvdele: køkkenets knapper følger valget
   (reglen er Admin.bordHentTrin, og tre skærme spørger den), og
   gæstens side kalder — med banner, titel og vibration — når
   køkkenet melder klar. Og modstykket: bærer I ud, kalder intet.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-08-06T11:00:00Z';        // 13.00 dansk tid
const I_DAG = '2026-08-06';
const BORDE = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 },
];

function ordre(ekstra) {
  return Object.assign({
    id: 1, lokation_id: 'mosede', reference: 'SM260806-AAAAA',
    navn: 'Bord 7', telefon: null, hent_dato: I_DAG, hent_tid: '13:05',
    linjer: [{ navn: 'Fiskefilet', antal: 2, pris: 75 }],
    fyld: [], antal: 2, status: 'ny', intern_note: null, besked: null,
    hvordan: 'spis_her', bord_nummer: '7', slettet: null,
    oprettet: new Date(Date.parse(UR) - 4 * 60000).toISOString(),
  }, ekstra);
}

function data(indst, ekstra) {
  const g = grunddata(Object.assign({ borde: BORDE }, ekstra || {}));
  g.indstillinger = Object.assign({}, grunddata().indstillinger, indst || {});
  return g;
}

const HENT = { bord_hent_selv: true };

async function køkkenet(page, indst, bestillinger) {
  await åbnAdmin(page, { ur: UR, data: data(indst, { bestillinger: bestillinger || [ordre()] }) });
  await visFane(page, 'p-koekken');
  await page.waitForSelector('#p-koekken:not(.skjult)');
}

const knap = (page) => page.locator('.koek-kort[data-bord="7"] .koek-knap');

test.describe('Køkkenet: hvem henter maden', () => {

  test('standarden er "vi bærer ud" — ét tryk, ✓ Færdig', async ({ page }) => {
    await køkkenet(page);
    await expect(knap(page)).toHaveText('✓ Færdig');
    await expect(page.locator('#bord-klar-maade [data-maade="ud"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#p-koekken .hjaelp-stor[data-maade-tekst="ud"]')).toBeVisible();
    await expect(page.locator('#p-koekken .hjaelp-stor[data-maade-tekst="hent"]')).toBeHidden();
  });

  test('henter gæsten selv, er knappen 🔔 Meld klar — og bagefter ✓ Hentet', async ({ page }) => {
    await køkkenet(page, HENT);
    await expect(knap(page)).toHaveText('🔔 Meld klar');
    /* Instruktionen over kortene må ikke sige "båret ud", når knappen
       lige nedenunder siger "Meld klar" (fundet på et skud 15/9). */
    await expect(page.locator('#p-koekken .hjaelp-stor[data-maade-tekst="hent"]')).toBeVisible();
    await expect(page.locator('#p-koekken .hjaelp-stor[data-maade-tekst="ud"]')).toBeHidden();
    await knap(page).click();
    await expect.poll(async () => (await gemteData(page)).bestillinger[0].status).toBe('klar');
    await expect(knap(page)).toHaveText('✓ Hentet');
    await expect(page.locator('.koek-kort[data-bord="7"] .koek-status')).toContainText('gæsten henter');
    await knap(page).click();
    await expect.poll(async () => (await gemteData(page)).bestillinger[0].status).toBe('serveret');
  });

  test('ejeren vælger det på Køkken-kø, og det gemmes', async ({ page }) => {
    await køkkenet(page);
    await page.locator('#bord-klar-maade [data-maade="hent"]').click();
    await expect.poll(async () => (await gemteData(page)).indstillinger.bord_hent_selv).toBe(true);
    await expect(page.locator('#bord-klar-maade [data-maade="hent"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(knap(page)).toHaveText('🔔 Meld klar');
  });

  /* ⚠️ TRE SKÆRME, ÉN REGEL. Bestillinger-fanen har sin egen frem-knap
     på bordkortet; sagde den "✓ Færdig", mens køkkenet sagde "Meld
     klar", ville et tryk dér springe gæstens besked over. */
  test('Bestillinger-fanen siger det samme som køkkenet', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: data(HENT, { bestillinger: [ordre()] }) });
    await visFane(page, 'p-bestillinger');
    const kort = page.locator('#bestillinger-liste .b-bord').first();
    await expect(kort).toContainText('🔔 Meld klar');
    await expect(kort).toContainText('gæsten henter ved lugen');
  });
});

/* Gæstens side. Vibration og titel måles; lyden kan ikke høres af en
   prøve, men den må aldrig vælte beskeden (try/catch i spilKlar). */
async function bestilVedBordet(page, indst) {
  await page.addInitScript(() => {
    window.__vib = [];
    Object.defineProperty(Navigator.prototype, 'vibrate', {
      configurable: true, value(m) { window.__vib.push(m); return true; },
    });
  });
  await åbn(page, '/ved-bordet/?bord=7', { ur: UR, data: data(indst) });
  await page.locator('#bestil-stykker .stk-linje').first().locator('button', { hasText: '+' }).click();
  await page.fill('#bestil-navn', 'Sara Holm');
  await page.locator('#bestil-send').click();
  await page.locator('#kig-send').click();
  await expect(page.locator('#bestil-tak')).toBeVisible();
}

/* Køkkenet trykker: status skrives i den gemte række, og siden
   spørges med det samme (fanen "kommer frem") i stedet for at vente
   otte sekunder på takten. */
async function køkkenetMelder(page, status) {
  await page.evaluate((st) => {
    const d = JSON.parse(localStorage.getItem('mosede_data_v1'));
    d.bestillinger[d.bestillinger.length - 1].status = st;
    localStorage.setItem('mosede_data_v1', JSON.stringify(d));
    document.dispatchEvent(new Event('visibilitychange'));
  }, status);
}

test.describe('Gæsten ved bordet: din mad er klar', () => {

  test('henter hun selv, siger kvitteringen det — og siden kalder, når køkkenet melder klar', async ({ page }) => {
    await bestilVedBordet(page, HENT);
    await expect(page.locator('#bestil-tak')).toContainText('henter du den ved lugen');
    await expect(page.locator('.kvit-foelg')).toHaveAttribute('href', /hent=1/);
    await expect(page.locator('#klar-banner')).toHaveCount(0);

    await køkkenetMelder(page, 'klar');
    const banner = page.locator('#klar-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Din mad er klar');
    await expect(banner).toContainText('bord 7');
    await expect(page.locator('.kvit-live')).toContainText('hent den ved lugen');
    expect(await page.title()).toMatch(/^🔔/);
    expect(await page.evaluate(() => window.__vib.length)).toBeGreaterThan(0);

    // Hentet: banneret går, og titlen kommer tilbage
    await køkkenetMelder(page, 'serveret');
    await expect(banner).toHaveCount(0);
    expect(await page.title()).not.toMatch(/^🔔/);
  });

  /* ⚠️ MODSTYKKET. Uden det ville en side, der kaldte ved ALT, bestå
     prøven ovenfor — og en gæst, der sidder og venter på tallerkenen,
     ville blive bedt om at gå op til lugen. */
  test('bærer I ud (standard), kalder siden ikke — den siger, at maden er på vej', async ({ page }) => {
    await bestilVedBordet(page);
    await expect(page.locator('#bestil-tak')).toContainText('Vi kommer med det');
    await expect(page.locator('.kvit-foelg')).not.toHaveAttribute('href', /hent=1/);
    await køkkenetMelder(page, 'klar');
    await expect(page.locator('.kvit-live')).toContainText('på vej ud til bord 7');
    await expect(page.locator('#klar-banner')).toHaveCount(0);
    expect(await page.evaluate(() => window.__vib.length)).toBe(0);
  });

  test('banneret bliver, når gæsten bestiller noget mere', async ({ page }) => {
    await bestilVedBordet(page, HENT);
    await køkkenetMelder(page, 'klar');
    await expect(page.locator('#klar-banner')).toBeVisible();
    await page.locator('#bestil-tak button', { hasText: 'Bestil noget mere' }).click();
    await expect(page.locator('#bestil-tak')).toBeHidden();
    await expect(page.locator('#klar-banner')).toBeVisible();
    await page.locator('#klar-banner button', { hasText: 'OK' }).click();
    await expect(page.locator('#klar-banner')).toHaveCount(0);
  });
});

test.describe('Min bestilling: ordene følger, hvem der henter', () => {
  const klar = ordre({ status: 'klar' });

  test('med &hent=1 siger siden "hent den ved lugen"', async ({ page }) => {
    await åbn(page, '/min-bestilling/?ref=SM260806-AAAAA&hent=1',
      { ur: UR, data: data(HENT, { bestillinger: [klar] }) });
    await expect(page.locator('.mb-titel')).toHaveText('Din mad er klar');
    await expect(page.locator('.mb-tekst')).toContainText('Hent den ved lugen og sig bord 7');
  });

  test('uden siger den som før: vi kommer ud med det', async ({ page }) => {
    await åbn(page, '/min-bestilling/?ref=SM260806-AAAAA',
      { ur: UR, data: data({}, { bestillinger: [klar] }) });
    await expect(page.locator('.mb-titel')).toHaveText('Den er på vej ud');
  });
});
