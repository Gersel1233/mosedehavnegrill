/* ============================================================
   LEVERINGENS PLAN: STORE BESTILLINGER, NU-LINJEN OG ÉN BIL  (17/10)
   ------------------------------------------------------------
   Mikkels ord: *"når der er blevet bestilt til for eksempel kl. 10,
   er det så der, at kunden forventer, at det skal komme? Er det der,
   det skal i gang sættes? … Hvor lang tid tager det med x antal …
   det må ikke kunne gå galt"*. Svarene på de to spørgsmål, han fik
   tilbage: *"Chefen sætter tal"* og *"Én bil / ét bud"*.

   MÅLT FØR (skud 17/10, fem bestillinger kl. 11.05): Firma A/S til
   Køge kl. 12.00 skulle være i gang 11.00, og intet sted stod der, at
   den var for sent; køkkenets tid var 30 min., om der var bestilt to
   burgere eller 30 stk.; og to leveringer på samme bil samtidig sagde
   ingenting.

   Trinene her er PRØVENS kulisse (fra 3 / 15 / 30 stk.), ikke
   chefens tal — han har ikke sat nogen endnu. Databasens halvdel
   står i supabase/proev-levering-store-17-10.sql.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const FREDAG_13 = '2026-08-07T11:00:00Z';   // kl. 13.00 dansk tid
const FREDAG_1105 = '2026-08-07T09:05:00Z'; // kl. 11.05 dansk tid

const LEVERING = '[data-seg="how"] button:has-text("Levering")';
const TOGO = '[data-seg="how"] button:has-text("To-go")';
const førsteTid = (page, sel) => page.locator(sel + ' option:not([disabled])').first();

function medLevering(ekstra) {
  const d = grunddata();
  d.indstillinger.bestilbare_kategorier = [1, 6, 9];
  Object.assign(d.indstillinger, {
    levering: true, spis_her: true, bestilling_varsel_timer: 0,
    varsel_min_togo: 30, varsel_min_levering: 30,
    leverings_koeretid: { 2690: 15, 2670: 20, 4600: 30 },
  }, ekstra || {});
  return d;
}

test.describe('Store bestillinger — gæstens tidligste tid', () => {
  /* ⚠️ UDEN ADRESSE GÆLDER DEN LÆNGSTE KØRETUR (30) — reglen fra 8/10.
     Kl. 13.00: køkkenet 30 + 30 = 14.00. Fra 3 stk. 60 + 30 = 14.30. */
  test('forsiden: den tidligste levering rykker, når kurven når chefens trin', async ({ page }) => {
    const d = medLevering({ levering_store: [{ fra: 3, min: 60 }] });
    await åbnSkal(page, '/index.html', { ur: FREDAG_13, data: d });
    await page.locator(LEVERING).click();
    await expect(førsteTid(page, '#tid')).toHaveText('kl. 14.00');

    await page.locator('[data-kategori="Smørrebrød"]').click();
    const plus = page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]');
    await plus.click();
    await plus.click();
    await expect(førsteTid(page, '#tid'), 'to stk. er under trinet').toHaveText('kl. 14.00');
    await plus.click();
    await expect(førsteTid(page, '#tid')).toHaveText('kl. 14.30');
    // Vælgeren stod på den tidligste — og følger med til den nye tidligste
    await expect(page.locator('#tid')).toHaveValue('14:30');
    // Linjen siger hvorfor, med gæstens eget antal
    await expect(page.locator('.lev-tid')).toContainText('60 min. til 3 stk.');

    // To-go er urørt: trinene er leveringens
    await page.locator(TOGO).click();
    await expect(førsteTid(page, '#tid')).toHaveText('kl. 13.30');
  });

  test('bestil/: samme regel, når der leveres', async ({ page }) => {
    const d = medLevering({ levering_store: [{ fra: 3, min: 60 }] });
    await åbn(page, '/bestil/', { ur: FREDAG_13, data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await expect(førsteTid(page, '#bestil-tid')).toHaveText(/14\.00/);
    const op = page.locator('#bestil-stykker .stk-linje[data-vare="Flæskestegssandwich"]')
      .locator('button', { hasText: '+' });
    await op.click();
    await op.click();
    await op.click();
    await expect(førsteTid(page, '#bestil-tid')).toHaveText(/14\.30/);
    await expect(page.locator('.lev-tid')).toContainText('til 3 stk.');
  });

  /* Et fad til 20 personer er 20 stk. Fadets eget varsel er sat til en
     time her, så tiden falder i dag. */
  test('tapas: fadet til mange personer får chefens tid', async ({ page }) => {
    const d = medLevering({ tapas_varsel_timer: 1, levering_store: [{ fra: 15, min: 60 }],
      leverings_gebyr: 79, leverings_postnr: [2670, 2690, 4600] });
    d.menu_kategorier.push({ id: 20, afdeling: 'mad', navn: 'Til selskabet', sortering: 30, aktiv: true });
    d.menu_varer.push({ id: 20, kategori_id: 20, navn: 'Tapasfad, pr. person', beskrivelse: null,
      pris: 145, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true });
    await åbnSkal(page, '/m-tapas.html', { ur: FREDAG_13, data: d });
    await page.locator('#thow').selectOption('levering');
    await page.locator('#tpers').fill('4');
    await expect(førsteTid(page, '#ttid')).toHaveText(/14\.00/);
    await page.locator('#tpers').fill('20');
    await expect(førsteTid(page, '#ttid')).toHaveText(/14\.30/);
    await expect(page.locator('#bestil-tapas .lev-tid')).toContainText('til 20 stk.');
  });

  test('reglen: det højeste trin, aldrig under køkkenets tid, fragten tæller ikke', async ({ page }) => {
    await åbnSkal(page, '/index.html', { ur: FREDAG_13, data: medLevering() });
    const svar = await page.evaluate(() => {
      const R = window.MosedeRegler;
      const d = { indstillinger: { varsel_min_levering: 30,
        levering_store: [{ fra: 30, min: 60 }, { fra: 15, min: 45 }, { fra: 5, min: 20 }] } };
      return {
        to: R.koekkenTil(d, 2),
        fjorten: R.koekkenTil(d, 14),
        femten: R.koekkenTil(d, 15),
        tredive: R.koekkenTil(d, 30),
        uden: R.koekkenTil({ indstillinger: { varsel_min_levering: 30 } }, 100),
        stk: R.stkI([{ navn: 'Burger', antal: 14 }, { navn: 'Levering', antal: 1, emballage: true },
          { navn: 'Emballage', antal: 1, emballage: true }]),
      };
    });
    expect(svar.to).toBe(30);
    expect(svar.fjorten, 'et trin under køkkenets tid (20) løfter ikke og sænker ikke').toBe(30);
    expect(svar.femten).toBe(45);
    expect(svar.tredive, 'det HØJESTE trin, ikke det første').toBe(60);
    expect(svar.uden, 'uden trin er alt som før').toBe(30);
    expect(svar.stk, 'fragt og emballage er ikke stk.').toBe(14);
  });
});

test.describe('Leveringens plan i admin', () => {
  function levering(id, tid, navn, adresse, linjer, ekstra) {
    return Object.assign({
      id, lokation_id: 'mosede', reference: 'SM-P-' + id, navn,
      telefon: '2040506' + id, email: null, hent_dato: '2026-08-07', hent_tid: tid,
      linjer: linjer || [{ navn: 'Burger', antal: 1, pris: 95 }], fyld: [],
      antal: (linjer || [{ antal: 1 }]).reduce((s, l) => s + l.antal, 0),
      besked: null, status: 'bekraeftet', hvordan: 'levering',
      leverings_adresse: adresse, intern_note: null, slettet: null,
      oprettet: '2026-08-07T06:00:00Z',
    }, ekstra || {});
  }
  const kort = (page, navn) => page.locator('.bestil-kort', { hasText: navn });

  /* ⚠️ HELE POINTEN. Kl. 11.05: Køge kl. 12.00 skulle være i gang 11.00.
     Den er ikke for sent endnu — bilen kører 11.30 — men den skal være i
     gang NU. En levering i Greve kl. 13.00 har god tid. */
  test('nu-linjen: i gang nu, start om lidt, god tid', async ({ page }) => {
    const d = medLevering();
    d.bestillinger = [
      levering(1, '12:00', 'Kim Køge', 'Torvet 1, 4600 Køge'),
      levering(2, '12:00', 'Lis Karlslunde', 'Strandvejen 2, 2690 Karlslunde'),   // start 11.15
      levering(3, '13:00', 'Jens Greve', 'Greve Strandvej 10, 2670 Greve'),       // start 12.10
    ];
    await åbnAdmin(page, { ur: FREDAG_1105, data: d });
    await visFane(page, 'p-bestillinger');
    await expect(kort(page, 'Kim Køge').locator('.lev-plan')).toHaveAttribute('data-fase', 'nu');
    await expect(kort(page, 'Kim Køge').locator('.lev-status'))
      .toHaveText('Skal være i gang nu — bilen kører om 25 min.');
    await expect(kort(page, 'Lis Karlslunde').locator('.lev-status')).toHaveText('Start om 10 min.');
    await expect(kort(page, 'Jens Greve').locator('.lev-status'))
      .toHaveText('Start kl. 12.10 — om 1 t. 5 min.');
  });

  /* Først når BILEN skulle være kørt, er den rød — se noten ved
     leveringsFase i kerne.js. Og ✓ Færdig (ud ad døren) tager den af. */
  test('for sent først efter afgangen, og en kørt levering siger det', async ({ page }) => {
    const d = medLevering();
    d.bestillinger = [
      levering(1, '11:30', 'Ole Køge', 'Torvet 1, 4600 Køge'),                 // kører 11.00
      levering(2, '11:30', 'Pia Køge', 'Torvet 3, 4600 Køge', null, { status: 'afhentet' }),
    ];
    await åbnAdmin(page, { ur: FREDAG_1105, data: d });
    await visFane(page, 'p-bestillinger');
    await expect(kort(page, 'Ole Køge').locator('.lev-plan')).toHaveAttribute('data-fase', 'sen');
    await expect(kort(page, 'Ole Køge').locator('.lev-status'))
      .toHaveText('⚠ Skulle være kørt kl. 11.00 — 5 min. for sent. Ring til gæsten.');
    await expect(kort(page, 'Pia Køge').locator('.lev-status')).toHaveText('✓ Kørt');
  });

  test('en levering en anden dag har tider, men ingen nu-linje', async ({ page }) => {
    const d = medLevering();
    d.bestillinger = [levering(1, '12:00', 'Kim Køge', 'Torvet 1, 4600 Køge', null,
      { hent_dato: '2026-08-08' })];
    await åbnAdmin(page, { ur: FREDAG_1105, data: d });
    await visFane(page, 'p-bestillinger');
    await page.locator('#bestil-alle-dage, [data-dag="alle"], button:has-text("Alle dage")').first().click();
    await expect(kort(page, 'Kim Køge').locator('.lev-trin-et')).toHaveCount(3);
    await expect(kort(page, 'Kim Køge').locator('.lev-status')).toHaveCount(0);
  });

  /* Chefens trin gælder admins starttid, som de gjaldt gæstens. 30 stk.
     til Køge kl. 13.00: 60 min. i køkkenet → lav senest 11.30. Fragten
     er ikke et stk. — 14 stk. + fragt er stadig under 15. */
  test('en stor bestilling får chefens tid i køkkenet — og siger antallet', async ({ page }) => {
    const d = medLevering({ levering_store: [{ fra: 15, min: 45 }, { fra: 30, min: 60 }] });
    d.bestillinger = [
      levering(1, '13:00', 'Firma A/S', 'Torvet 1, 4600 Køge',
        [{ navn: 'Smørrebrød', antal: 30, pris: 60 }]),
      levering(2, '13:00', 'Lille Lis', 'Torvet 5, 4600 Køge',
        [{ navn: 'Burger', antal: 14, pris: 95 }, { navn: 'Levering', antal: 1, pris: 79, emballage: true }]),
    ];
    d.indstillinger.leverings_biler = 2;   // bilen er ikke det, prøven handler om
    await åbnAdmin(page, { ur: FREDAG_1105, data: d });
    await visFane(page, 'p-bestillinger');
    const lav = (navn) => kort(page, navn).locator('.lev-lav');
    await expect(lav('Firma A/S').locator('.lev-trin-kl')).toHaveText('11.30');   // 13.00 − 30 − 60
    await expect(lav('Firma A/S').locator('.lev-trin-mer')).toHaveText('60 min. i køkkenet · 30 stk.');
    await expect(lav('Lille Lis').locator('.lev-trin-kl')).toHaveText('12.00');   // 13.00 − 30 − 30
    await expect(lav('Lille Lis').locator('.lev-trin-mer')).toHaveText('30 min. i køkkenet');
  });

  /* ⚠️ ÉN BIL. Køge-turen kører 11.30 og er tilbage 12.30; Karlslunde skal
     køre 11.45 — mens bilen er i Køge. Det siges på Karlslunde, den der
     bliver forsinket. Greve kører 12.40, efter bilen er hjemme. */
  test('én bil: en levering, der skal køre, mens bilen er ude, siger det', async ({ page }) => {
    const d = medLevering();
    d.bestillinger = [
      levering(1, '12:00', 'Kim Køge', 'Torvet 1, 4600 Køge'),
      levering(2, '12:00', 'Lis Karlslunde', 'Strandvejen 2, 2690 Karlslunde'),
      levering(3, '13:00', 'Jens Greve', 'Greve Strandvej 10, 2670 Greve'),
    ];
    await åbnAdmin(page, { ur: FREDAG_1105, data: d });
    await visFane(page, 'p-bestillinger');
    await expect(kort(page, 'Lis Karlslunde').locator('.lev-bil'))
      .toHaveText('⚠ Bilen er ude: turen til Køge kører 11.30 og er tilbage ca. 12.30.');
    await expect(kort(page, 'Kim Køge').locator('.lev-bil')).toHaveCount(0);
    await expect(kort(page, 'Jens Greve').locator('.lev-bil')).toHaveCount(0);
  });

  test('med to biler er to ture på samme tid ingen advarsel', async ({ page }) => {
    const d = medLevering({ leverings_biler: 2 });
    d.bestillinger = [
      levering(1, '12:00', 'Kim Køge', 'Torvet 1, 4600 Køge'),
      levering(2, '12:00', 'Lis Karlslunde', 'Strandvejen 2, 2690 Karlslunde'),
    ];
    await åbnAdmin(page, { ur: FREDAG_1105, data: d });
    await visFane(page, 'p-bestillinger');
    await expect(kort(page, 'Lis Karlslunde').locator('.lev-plan')).toHaveCount(1);
    await expect(page.locator('.lev-bil')).toHaveCount(0);
  });

  /* Mangler står i den rækkefølge, maden skal UD: Køge kl. 12.00 kører
     11.30 og skal stå før en afhentning 11.45. */
  test('Bestillinger: Mangler står efter, hvornår maden skal ud', async ({ page }) => {
    const d = medLevering();
    d.bestillinger = [
      Object.assign(levering(1, '11:45', 'Per Afhenter', null), { hvordan: 'afhentning' }),
      levering(2, '12:00', 'Kim Køge', 'Torvet 1, 4600 Køge'),
    ];
    await åbnAdmin(page, { ur: FREDAG_1105, data: d });
    await visFane(page, 'p-bestillinger');
    await expect(kort(page, 'Kim Køge')).toHaveCount(1);
    const tekster = await page.locator('.bestil-kort').allTextContents();
    const i = (n) => tekster.findIndex((x) => x.includes(n));
    expect(i('Kim Køge'), 'Køge (ud 11.30) står før afhentningen 11.45').toBeLessThan(i('Per Afhenter'));
  });

  test('Overblik viser den samme plan med nu-linjen', async ({ page }) => {
    const d = medLevering();
    d.bestillinger = [levering(1, '12:00', 'Kim Køge', 'Torvet 1, 4600 Køge')];
    await åbnAdmin(page, { ur: FREDAG_1105, data: d });
    await visFane(page, 'p-overblik');
    const række = page.locator('.vagt-raekke', { hasText: 'Kim Køge' }).first();
    await expect(række.locator('.lev-plan .lev-lav .lev-trin-kl')).toHaveText('11.00');
    await expect(række.locator('.lev-status')).toHaveText('Skal være i gang nu — bilen kører om 25 min.');
  });
});

test.describe('Åbningstider → Levering: store bestillinger og biler', () => {
  async function levFanen(page, d) {
    await åbnAdmin(page, { ur: FREDAG_1105, data: d });
    await visFane(page, 'p-tider');
    await page.locator('#levering-store .store-raekke').first().waitFor();
  }
  const fra = (page, n) => page.locator('#levering-store [data-store="fra"]').nth(n);
  const min = (page, n) => page.locator('#levering-store [data-store="min"]').nth(n);

  test('trinene gemmes sorteret, og eksemplet siger dem som klokkeslæt', async ({ page }) => {
    await levFanen(page, medLevering());
    await expect(page.locator('#levering-store .store-raekke')).toHaveCount(3);
    await expect(fra(page, 0)).toHaveValue('');          // tomme, til chefen udfylder dem
    await fra(page, 0).fill('30');
    await min(page, 0).fill('60');
    await fra(page, 1).fill('15');
    await min(page, 1).fill('45');
    await page.locator('#levering-biler').fill('2');
    // Karlslunde er den korteste tur (15): 12.00 − 15 − 30 = 11.15
    await expect(page.locator('#levering-eksempel')).toContainText('1–14 stk.: køkkenet i gang 11.15');
    await expect(page.locator('#levering-eksempel')).toContainText('15–29 stk.: køkkenet i gang 11.00');
    await expect(page.locator('#levering-eksempel')).toContainText('30 stk. og op: køkkenet i gang 10.45');
    await page.locator('#gem-levering').click();
    await expect.poll(async () => (await gemteData(page)).indstillinger.levering_store)
      .toEqual([{ fra: 15, min: 45 }, { fra: 30, min: 60 }]);
    expect((await gemteData(page)).indstillinger.leverings_biler).toBe(2);
  });

  /* ⚠️ ET TRIN, DER IKKE GØR NOGET, GEMMES IKKE. "Fra 15 stk.: 30 min."
     med køkkenets 30 i forvejen ville se ud, som om store bestillinger
     havde fået mere tid. */
  test('et trin uden mere tid end køkkenets bliver sagt og ikke gemt', async ({ page }) => {
    await levFanen(page, medLevering());
    await fra(page, 0).fill('15');
    await min(page, 0).fill('30');
    await expect(page.locator('#levering-eksempel')).toContainText('mere end de 30 min.');
    await page.locator('#gem-levering').click();
    await page.waitForTimeout(400);
    expect((await gemteData(page)).indstillinger.levering_store).toBeUndefined();
  });

  test('en halv række bliver sagt og ikke gemt', async ({ page }) => {
    await levFanen(page, medLevering());
    await fra(page, 0).fill('15');
    await page.locator('#gem-levering').click();
    await page.waitForTimeout(400);
    expect((await gemteData(page)).indstillinger.levering_store).toBeUndefined();
    await expect(page.locator('#levering-eksempel')).toContainText('Skriv både antal stk. og minutter');
  });
});
