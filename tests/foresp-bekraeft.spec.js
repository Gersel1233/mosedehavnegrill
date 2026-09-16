/* ============================================================
   BEKRÆFT AFTALEN  (16/9)
   ------------------------------------------------------------
   Ejerens ord: når man tager imod en forespørgsel, skal man kunne
   "justere eller bekræfte den første omgang foreslået tid og
   datoønske", vælge "hvad der skal være lukket", og siden skal
   kunne "sige noget automatisk" — og ellers skal dataene på
   forespørgslen være tydelige, "det de ansøger om i forvejen".

   MÅLT før: felterne kom FØRST, når sagen allerede stod som aftalt.
   Der var ingen tid, ingen "hele dagen", ingen besked til gæsterne
   og ingen advarsel om, hvad en lukning rammer.

   ⚠️ INTET ER SAT PÅ FORHÅND. En dag, der lukkede sig selv, fordi
   nogen trykkede ja, ville koste den take-away, køkkenet sagtens
   kunne have lavet.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-08-06T11:00:00Z';
const DAG = '2026-08-15';

function sag(x) {
  return Object.assign({
    id: 1, nummer: 7, lokation_id: 'mosede', reference: 'FO260806-AAA11',
    type: 'selskab', navn: 'susanne dahl', telefon: '28282828', email: null,
    dato: DAG, antal_personer: 40, besked: null, status: 'kontaktet',
    intern_note: null, slettet: null, oprettet: '2026-08-01T10:00:00Z',
    detaljer: { anledning: 'Sølvbryllup', tidsrum: '17.00–21.00' },
  }, x);
}

async function aabn(page, ekstra) {
  const d = grunddata();
  d.forespoergsler = [sag(ekstra && ekstra.sag)];
  if (ekstra && ekstra.bordbestillinger) d.bordbestillinger = ekstra.bordbestillinger;
  await åbnAdmin(page, { ur: UR, data: d });
  await visFane(page, 'p-forespoergsler');
  return page.locator('.kalender-bekraeft');
}

test('boksen står, når personalet har kontaktet dem — med gæstens eget ønske', async ({ page }) => {
  const boks = await aabn(page);
  await expect(boks).toContainText('Bekræft aftalen');
  await expect(boks.locator('.kal-bad-om')).toContainText('40 pers.');
  await expect(boks.locator('.kal-bad-om')).toContainText('Sølvbryllup');
  /* Tiden er gæstens egen, foreslået — ikke gættet. */
  await expect(boks.locator('.kal-tid input').first()).toHaveValue('17:00');
  await expect(boks.locator('.kal-tid input').nth(1)).toHaveValue('21:00');
});

/* ⚠️ MODSTYKKET: en sag, ingen har rørt, får ingen boks. Uden den
   ville en regel, der ALTID viste felterne, bestå prøven ovenfor —
   og personalet ville blive bedt om at bekræfte en aftale, de ikke
   har haft i telefonen endnu. */
test('en ny sag har ingen bekræft-boks', async ({ page }) => {
  await aabn(page, { sag: { status: 'ny' } });
  await expect(page.locator('.kalender-bekraeft')).toHaveCount(0);
});

test('et ja skriver dagen, tiden og lukningen — og sætter sagen til aftalt', async ({ page }) => {
  const boks = await aabn(page);
  await boks.locator('label.afkryds', { hasText: 'hele dagen' }).locator('input').check();
  await boks.locator('button', { hasText: 'Bekræft aftalen' }).click();

  await expect.poll(async () =>
    ((await gemteData(page)).forespoergsler || [{}])[0].status).toBe('aftalt');
  const d = await gemteData(page);

  const k = (d.kalender || []).filter((r) => r.dato === DAG)[0];
  expect(k, 'dagen står ikke i kalenderen').toBeTruthy();
  expect(k.start_kl).toBe('17:00');
  /* ⚠️ ALDRIG OFFENTLIG. Et selskab er som regel en privat fest. */
  expect(k.offentlig).toBe(false);
  expect(k.beskrivelse).toContain('Aftalt kl. 17.00–21.00');

  const r = (d.dags_regler || []).filter((x) => x.dato === DAG)[0];
  expect(r, 'dagen blev ikke lukket').toBeTruthy();
  expect(r.luk_takeaway).toBe(true);
  expect(r.luk_spis_her).toBe(true);
});

/* ⚠️ MODSTYKKET TIL LUKNINGEN: uden fluebenene lukkes ingenting. */
test('uden flueben lukkes dagen ikke', async ({ page }) => {
  const boks = await aabn(page);
  await boks.locator('button', { hasText: 'Bekræft aftalen' }).click();
  await expect.poll(async () =>
    ((await gemteData(page)).forespoergsler || [{}])[0].status).toBe('aftalt');
  const d = await gemteData(page);
  const r = (d.dags_regler || []).filter((x) => x.dato === DAG)[0];
  expect(r === undefined || (!r.luk_takeaway && !r.luk_spis_her),
    'dagen blev lukket, uden at nogen bad om det').toBe(true);
});

test('beskeden til gæsterne havner på dagen', async ({ page }) => {
  const boks = await aabn(page);
  await boks.locator('input[placeholder*="Overskrift"]').fill('Lukket for selskab');
  await boks.locator('input[placeholder*="Besked til gæsterne"]').fill('Vi holder fest — vi ses i morgen.');
  await boks.locator('label.afkryds', { hasText: 'spisning her' }).locator('input').check();
  await boks.locator('button', { hasText: 'Bekræft aftalen' }).click();

  await expect.poll(async () => {
    const d = await gemteData(page);
    const r = (d.dags_regler || []).filter((x) => x.dato === DAG)[0];
    return r && r.besked_titel;
  }).toBe('Lukket for selskab');
});

/* ⚠️ INTET AFLYSES AF SIG SELV. Lukker man en dag, der allerede har
   bookinger på sig, skal personalet SE dem, før de trykker — det er
   den samme liste, kalenderen regner ud (Admin.hvadRammerLukning). */
test('lukningen siger, hvad den rammer', async ({ page }) => {
  const boks = await aabn(page, {
    bordbestillinger: [{
      id: 1, lokation_id: 'mosede', reference: 'BO260815-AAAAA', navn: 'Ole Berg',
      telefon: '30405060', dato: DAG, tid: '18:00', antal_personer: 6,
      besked: null, status: 'ny', intern_note: null, slettet: null,
      oprettet: '2026-08-05T10:00:00Z',
    }],
  });
  const rammer = boks.locator('.kal-rammer');
  await expect(rammer).toBeHidden();
  await boks.locator('label.afkryds', { hasText: 'spisning her' }).locator('input').check();
  await expect(rammer).toBeVisible();
  await expect(rammer).toContainText('Ole Berg');
});

/* ⚠️ ÉN JA-KNAP AD GANGEN (16/9). Med bekræft-boksen stod der TO:
   den grønne "✓ Aftal & sæt tid" øverst, som kun sætter status, og
   den røde "✓ Bekræft aftalen", som skriver dagen, tiden og
   lukningen. Grøn betyder "det gik godt" i hele admin, så personalet
   trykker den — og går videre fra en dag, der ikke står nogen steder.
   Det er den samme fælde, baglokalet fik lukket 8/9.

   Den er FLYTTET, ikke fjernet: modstykket er, at den stadig kan nås
   bag "···", for der er dage, hvor man siger ja uden en dato. */
test('kun én vej frem: den grønne ligger bag ···', async ({ page }) => {
  const boks = await aabn(page);
  const kort = page.locator('#forespoergsler-liste .bestil-kort').first();
  const raekke = kort.locator('.knap-raekke.bestil-handling');

  await expect(raekke.locator('button', { hasText: 'Aftal & sæt tid' })).toHaveCount(0);
  await expect(boks.locator('button', { hasText: 'Bekræft aftalen' })).toHaveCount(1);

  // Og den stille vej findes stadig — bag døren.
  const skjult = kort.locator('.bestil-mere button', { hasText: 'Aftal uden at sætte i kalenderen' });
  await expect(skjult).toHaveCount(1);
  await expect(skjult).toBeHidden();
  await kort.locator('.knap-mere').click();
  await expect(skjult).toBeVisible();
});

/* Navnet står i kalenderen, hvor personalet læser det på dagen.
   Gæsten skriver "susanne dahl" i sin telefon. */
test('titlen i kalenderen skriver navnet pænt', async ({ page }) => {
  const boks = await aabn(page);
  await expect(boks.locator('input.navn')).toHaveValue('Selskab: Susanne Dahl (40 pers.)');
});
