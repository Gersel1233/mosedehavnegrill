/* ============================================================
   ET SELSKAB AFTALT I TELEFONEN SKAL KUNNE SKRIVES IND
   ------------------------------------------------------------
   Kundens ord aftenen før lancering: *"hvad hvis det er noget de
   har aftalt over telefonen og skal oprette booking ... systemet
   skal være dygtigt nok og hænge fuldstændig sammen"*.

   MÅLT før: bord kunne oprettes manuelt (24/8), tilmelding kunne
   (7/9) — men et SELSKAB eller en CATERING aftalt i røret kunne
   ikke skrives ind nogen steder. Så stod halvdelen af efterårets
   selskaber i systemet og halvdelen på en seddel ved lugen.

   ⚠️ PRØVEN LÆSER DEN GEMTE RÆKKE, IKKE SKÆRMEN. Et kort, der
   ser rigtigt ud, beviser ikke, at noget nåede databasen — og
   det er hele pointen med at bruge gæstens egen motor.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const H = require('./hjaelp.js');

async function udfyld(page, felter) {
  for (const [id, v] of Object.entries(felter)) {
    await page.locator('#' + id).fill(String(v));
  }
}

async function aabnFolden(page) {
  await H.visFane(page, 'p-forespoergsler');
  const fold = page.locator('#tag-foresp');
  await expect(fold).toBeVisible();
  if (!(await fold.getAttribute('open'))) {
    await fold.locator('summary').click();
  }
  return fold;
}

test('en forespørgsel taget i telefonen lander i den samme tabel', async ({ page }) => {
  await H.åbnAdmin(page);
  await aabnFolden(page);

  await page.locator('#nyf-type').selectOption('selskab');
  await udfyld(page, {
    'nyf-navn': 'susanne dahl',
    'nyf-telefon': '28282828',
    'nyf-antal': '45',
    'nyf-besked': 'Sølvbryllup, vender tilbage med pris.',
  });
  await page.locator('#opret-foresp').click();
  await expect(page.locator('#kvittering')).toBeVisible();

  const d = await H.gemteData(page);
  expect(d.forespoergsler, 'rækken nåede ikke databasen').toHaveLength(1);
  const f = d.forespoergsler[0];
  expect(f.type).toBe('selskab');
  expect(f.antal_personer).toBe(45);
  expect(f.reference, 'referencen skal være motorens egen FO-nummer')
    .toMatch(/^FO/);
});

test('den lander som KONTAKTET — ikke ny, og ikke aftalt', async ({ page }) => {
  await H.åbnAdmin(page);
  await aabnFolden(page);
  await udfyld(page, { 'nyf-navn': 'jonas møller', 'nyf-telefon': '29292929' });
  await page.locator('#opret-foresp').click();
  await expect(page.locator('#kvittering')).toBeVisible();

  const f = (await H.gemteData(page)).forespoergsler[0];

  /* ⚠️ TRE UAFHÆNGIGE PÅSTANDE, OG DE HØRER SAMMEN.
     · ny   ville betyde "ingen har set den" — men de har lige
       talt med gæsten, og tallet i søjlen ville råbe om et
       arbejde, der er gjort.
     · aftalt ville LÅSE DAGEN (optagne_dage forener bekræftede
       udlejninger med aftalte forespørgsler). Et ja skal trykkes
       bevidst.
     Uden begge modstykker ville en regel, der bare satte en
     tilfældig status, bestå den første. */
  expect(f.status).toBe('kontaktet');
  expect(f.status).not.toBe('ny');
  expect(f.status).not.toBe('aftalt');
  expect(f.intern_note, 'noten skal sige hvor den kom fra')
    .toMatch(/telefon/i);
});

test('dato og antal er frivillige — som på gæstesiden', async ({ page }) => {
  await H.åbnAdmin(page);
  await aabnFolden(page);
  /* "Sølvbryllup engang til foråret, hvad koster det?" er den
     forespørgsel, der er mest værd. Et krav om en dato ville
     sende netop den gæst væk. */
  await udfyld(page, { 'nyf-navn': 'anna vind', 'nyf-telefon': '23456789' });
  await page.locator('#opret-foresp').click();
  await expect(page.locator('#kvittering')).toBeVisible();

  const f = (await H.gemteData(page)).forespoergsler[0];
  expect(f.dato).toBeNull();
  expect(f.antal_personer).toBeNull();
});

test('uden en vej tilbage bliver den afvist — med ord, ikke en databasefejl', async ({ page }) => {
  await H.åbnAdmin(page);
  await aabnFolden(page);
  await udfyld(page, { 'nyf-navn': 'uden kontakt' });
  await page.locator('#opret-foresp').click();

  const fejl = page.locator('#fejl');
  await expect(fejl).toBeVisible();

  /* ⚠️ DEN HER MÅLTE FØRST MOTORENS SVAR OG IKKE FANENS.
     Falsifikationen afslørede det: kontroltjekket i
     forespoergsler.js fjernet — og prøven bestod, fordi
     `Butik.forespoerg` SELV håndhæver forespoergsel_kontakt_ok i
     øvetilstand og siger noget, der også indeholder ordene. En
     falsifikation, der ikke falder, er et spørgsmål og ikke et
     bevis.

     De to lag er ikke overflødige — fanens tjek svarer FØR der
     skrives, med personalets egne ord ("ingen vej tilbage til
     dem"), og motorens er gæstens ("Skriv et telefonnummer eller
     en e-mail, så vi kan..."). Prøven peger nu på fanens, så den
     falder, hvis laget forsvinder. */
  await expect(fejl).toContainText(/ingen vej tilbage/i);

  /* ⚠️ MODSTYKKET: der må ikke være gemt noget. En besked på
     skærmen beviser ikke, at rækken blev stoppet — og motoren er
     backstoppet, hvis fanens tjek en dag falder ud. */
  const d = await H.gemteData(page);
  expect(d.forespoergsler || []).toHaveLength(0);
});

test('mail alene er nok — databasens regel er ELLER, ikke OG', async ({ page }) => {
  await H.åbnAdmin(page);
  await aabnFolden(page);
  /* forespoergsel_kontakt_ok (28/8): mindst ÉN vej tilbage.
     Uden den her prøve ville en regel, der krævede BEGGE, bestå
     prøven ovenfor — og den gæst, der kun vil skrive, ville
     blive afvist af en skærm, databasen tager imod. */
  await udfyld(page, { 'nyf-navn': 'kun mail', 'nyf-email': 'kun@eksempel.dk' });
  await page.locator('#opret-foresp').click();
  await expect(page.locator('#kvittering')).toBeVisible();

  const f = (await H.gemteData(page)).forespoergsler[0];
  expect(f.email).toBe('kun@eksempel.dk');
  expect(f.telefon === '' || f.telefon === null).toBeTruthy();
});
