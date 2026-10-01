/* TILBEHØR TIL DAGENS RET — og varer, der slukker sig selv  (1/10)

   Mikkel med et skud af ugen: *"og teksten står alt for generisk fix
   lige."* Linjen under kartoflen sluttede »Tilføj valgfrit tilbehør
   og kød – 10,- pr. stk.« — hvilket tilbehør? Det stod ingen steder,
   og køkkenet fik en bon, hvor der heller ikke stod andet end retten.

   Og hans ord om, hvad det skulle være: *"på dagensret gør så de kan
   tilføje tilbehør ting i admin … og at de kan vælge det og i dette
   tilfælde 10 kroner og selv kan skrive det ind."*

   Fire slags fejl kan komme her, og de er alle fire dyre:

   1) PRISEN FØLGER IKKE MED. Gæsten ser 55, databasen regner 65, og
      bestillingen afvises med bestilling_pris_aendret — efter at hun
      har skrevet navn og telefon.

   2) TILBEHØRET NÅR IKKE KØKKENET. Linjen hedder "Bagt kartoffel", og
      kokken ved ikke, at der skulle kylling på. Det er husets faste
      feltliste-fælde, og den har ramt fem gange før.

   3) DE TO SIDER VISER HVER SIT. Forsiden og bordet har hver sin
      bestillingsfil; en rettelse i den ene er en fejl i den anden,
      til nogen opdager det. (Isen 1/10: kun den ene fik lappen.)

   4) TILBUDDET SLUKKER IKKE. Fredagsbarens pølsemix til 55,- skal væk
      af sig selv efter den 2. oktober — ellers står den der i
      november, og ingen opdager det.
*/

const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, grunddata, gemteData } = require('./hjaelp');

// 2026-08-07 er en FREDAG, uret står 11:00Z = 13:00 dansk tid.
const FREDAG = '2026-08-07T11:00:00Z';
const DAGEN = '2026-08-07';

/* ⚠️ TALLENE KOMMER UDEFRA — fra fiksturet her og ikke fra koden.
   55 + 10 + 10 = 75 er et regnestykke, prøven kan falde på; læste
   den prisen ud af siden og sammenlignede med sig selv, målte den
   ingenting. */
const GRUND = 55;
const OKSE = 10;
const KYLLING = 10;

function medRet(ændringer) {
  const d = grunddata();
  d.indstillinger.bestilbare_kategorier = [1, 6, 9];
  d.indstillinger.bestilling_varsel_timer = 2;
  d.indstillinger.bestilling_min_stk = 1;
  d.dagens_retter = [{
    id: 1, lokation_id: 'mosede', dato: DAGEN,
    navn: 'Bagt krydderet kartoffel',
    beskrivelse: 'Med blandet salat, tomat, agurk, majs, asparges, løg og dressing.',
    pris: GRUND, antal_tilbage: null, udsolgt: false, aktiv: true, sortering: 0,
    tilvalg: [{ navn: 'Oksekød', pris: OKSE }, { navn: 'Kylling', pris: KYLLING }],
  }];
  return Object.assign(d, ændringer || {});
}

/* ============================================================
   FORSIDEN  (js/skal/bestil.js)
   ============================================================ */
test.describe('Tilbehør til dagens ret — forsiden', () => {
  test('ejerens tilbehør står som chips med deres pris', async ({ page }) => {
    await åbnSkal(page, '/index.html', { ur: FREDAG, data: medRet() });
    const blok = page.locator('.dagens-blok');
    await expect(blok.locator('[data-tilvalg="Oksekød"]')).toBeVisible();
    await expect(blok.locator('[data-tilvalg="Kylling"]')).toBeVisible();
    /* Prisen skal stå VED tilbehøret — gæsten skal se de 10 kroner,
       før hun trykker, ikke på kvitteringen bagefter. */
    await expect(blok.locator('[data-tilvalg="Oksekød"]'))
      .toContainText(String(OKSE));
  });

  test('prisen på rækken følger tilbehøret', async ({ page }) => {
    await åbnSkal(page, '/index.html', { ur: FREDAG, data: medRet() });
    const blok = page.locator('.dagens-blok');
    await expect(blok.locator('.tag')).toContainText(String(GRUND));
    await blok.locator('[data-tilvalg="Oksekød"]').click();
    await expect(blok.locator('.tag')).toContainText(String(GRUND + OKSE));
    await blok.locator('[data-tilvalg="Kylling"]').click();
    await expect(blok.locator('.tag')).toContainText(String(GRUND + OKSE + KYLLING));
  });

  /* ⚠️ DEN DYRE: når linjen når databasen, skal BÅDE prisen og
     tilbehøret være med. Uden prisen svarer værnet
     bestilling_pris_aendret; uden tilbehøret står køkkenet og
     gætter. Begge dele måles på det, der faktisk blev GEMT. */
  test('tilbehøret og prisen når hele vejen ud på bestillingen', async ({ page }) => {
    await åbnSkal(page, '/index.html', { ur: FREDAG, data: medRet() });
    const blok = page.locator('.dagens-blok');
    await page.locator('#dato').selectOption(DAGEN);
    await blok.locator('[data-tilvalg="Kylling"]').click();
    await blok.locator('button[data-d="+"]').click();

    await page.locator('#navn').fill('Sara Poulsen');
    await page.locator('#tlf').fill('28871343');
    await page.locator('#tid').selectOption({ index: 1 });
    await page.locator('button.g.solid.blk').click();
    await expect(page.locator('.kvit-titel')).toBeVisible();

    const gemt = await gemteData(page);
    const b = (gemt.bestillinger || []).slice(-1)[0];
    const linje = (b.linjer || [])[0];
    expect(linje.pris).toBe(GRUND + KYLLING);
    expect(linje.tilvalg).toEqual(['Kylling']);
  });

  /* ⚠️ TO SAMMENSÆTNINGER ER TO LINJER. En kartoffel med kylling og
     en uden er to forskellige retter; delte de linje, ville den ene
     tælle den anden ned, og køkkenet fik ét tal for to ting. Samme
     regel som isens portioner 25/9. */
  test('en ret med og en uden tilbehør bliver to linjer', async ({ page }) => {
    await åbnSkal(page, '/index.html', { ur: FREDAG, data: medRet() });
    const blok = page.locator('.dagens-blok');
    await page.locator('#dato').selectOption(DAGEN);
    await blok.locator('button[data-d="+"]').click();            // én uden
    await blok.locator('[data-tilvalg="Oksekød"]').click();
    await blok.locator('button[data-d="+"]').click();            // én med

    await page.locator('#navn').fill('Sara Poulsen');
    await page.locator('#tlf').fill('28871343');
    await page.locator('#tid').selectOption({ index: 1 });
    await page.locator('button.g.solid.blk').click();
    await expect(page.locator('.kvit-titel')).toBeVisible();

    const gemt = await gemteData(page);
    const b = (gemt.bestillinger || []).slice(-1)[0];
    const mad = (b.linjer || []).filter(l => l.navn === 'Bagt krydderet kartoffel');
    expect(mad).toHaveLength(2);
    const priser = mad.map(l => l.pris).sort((a, b2) => a - b2);
    expect(priser).toEqual([GRUND, GRUND + OKSE]);
  });
});

/* ============================================================
   VED BORDET OG /bestil/  (js/bestilling.js)
   ⚠️ EGEN FIL, EGEN PRØVE. De to bestillingsfiler er tvillinger,
      og 1/10 blev kun den ene lappet, da isens tilbehør kom —
      prøven fandt det først, fordi den spurgte dem begge.
   ============================================================ */
test.describe('Tilbehør til dagens ret — ved bordet', () => {
  test('chipsene står på rækken, og prisen følger med', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: FREDAG, data: medRet() });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    const r = page.locator('.stk-linje[data-vare="Bagt krydderet kartoffel"]');
    await expect(r.locator('[data-tilvalg="Oksekød"]')).toBeVisible();
    await expect(r.locator('.stk-pris')).toContainText(String(GRUND));
    await r.locator('[data-tilvalg="Oksekød"]').click();
    await expect(r.locator('.stk-pris')).toContainText(String(GRUND + OKSE));
  });

  test('tilbehøret når hele vejen ud på bestillingen', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: FREDAG, data: medRet() });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    const r = page.locator('.stk-linje[data-vare="Bagt krydderet kartoffel"]');
    await r.locator('[data-tilvalg="Oksekød"]').click();
    await r.locator('[data-tilvalg="Kylling"]').click();
    /* ⚠️ .taeller OG IKKE hasText:'+' — chippen hedder "Oksekød
       +10,-" og blev ramt med. Playwright sagde det selv:
       "strict mode violation … resolved to 3 elements". */
    await r.locator('.taeller button[aria-label^="Én mere"]').click();

    await page.fill('#bestil-navn', 'Prøve Person');
    await page.fill('#bestil-telefon', '34001234');
    /* ⚠️ DET SIDSTE KIG STÅR MELLEM SEND OG AFSENDELSEN (spiis'
       lærepenge 23/8). Prøven går den vej, et menneske går: tryk
       Send, se bestillingen efter, tryk Send igen. Uden det andet
       tryk blev der aldrig gemt noget — og prøven målte kun, at
       knappen kunne klikkes. */
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-kig')).toBeVisible();
    await page.locator('#kig-send').click();

    const gemt = await gemteData(page);
    const b = (gemt.bestillinger || []).slice(-1)[0];
    const linje = (b.linjer || []).filter(l => l.navn === 'Bagt krydderet kartoffel')[0];
    expect(linje.pris).toBe(GRUND + OKSE + KYLLING);
    expect(linje.tilvalg).toEqual(['Oksekød', 'Kylling']);
  });
});

/* ============================================================
   LINJENS NAVN — det køkkenet læser
   ============================================================ */
test.describe('Køkkenet kan se tilbehøret', () => {
  test('Butik.linjeNavn skriver tilbehøret med', async ({ page }) => {
    await åbnSkal(page, '/index.html', { ur: FREDAG, data: medRet() });
    const navn = await page.evaluate(() => window.Butik.linjeNavn({
      navn: 'Bagt krydderet kartoffel', tilvalg: ['Oksekød', 'Kylling'],
    }));
    /* Prikken er husets skillelinje — den samme, bonen og
       køkken-køen bruger til varianter og smage. */
    expect(navn).toBe('Bagt krydderet kartoffel · Oksekød + Kylling');
  });

  /* ⚠️ ET UKENDT TILBEHØR KOSTER 0 — og det er MED VILJE: at det
     ikke må STÅ på linjen, siger databasen
     (bestilling_ukendt_tilvalg). Regnede siden et tillæg for et
     navn, ejeren ikke har skrevet, ville de to blive uenige. */
  test('et tilbehør, ejeren ikke har skrevet, koster ingenting', async ({ page }) => {
    await åbnSkal(page, '/index.html', { ur: FREDAG, data: medRet() });
    const sum = await page.evaluate((g) => window.Butik.prisMedTilvalg(
      { pris: g, tilvalg: [{ navn: 'Oksekød', pris: 10 }] }, ['Hummer']), GRUND);
    expect(sum).toBe(GRUND);
  });
});

/* ============================================================
   VAREN, DER SLUKKER SIG SELV  (fredagsbarens pølsemix)
   ============================================================ */
test.describe('En vare med et datovindue', () => {
  /* ⚠️ KATEGORI 1 OG IKKE 9. /bestil/ er smørrebrødets side og
     tegner mad-kategorierne; øllet og isen har deres egne steder.
     MÅLT, ikke læst: med varen i kategori 9 bestod "dagen efter er
     den væk", fordi den aldrig blev tegnet overhovedet — en prøve,
     der målte ingenting og sagde god for sig selv. */
  function medTilbud(fra, til) {
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [1, 6, 9];
    d.menu_varer.push({
      id: 99, kategori_id: 1, navn: 'PRØVE-TILBUD', beskrivelse: null,
      pris: 55, fremhaevet: false, udsolgt: false, sortering: 9, aktiv: true,
      vis_fra: fra, vis_til: til,
    });
    return d;
  }

  /* ⚠️ OG DAGEN ER DEN VALGTE, IKKE I DAG. /bestil/ har 24 timers
     varsel som standard, så vælgeren står på DAGEN EFTER — og det
     er dén dag, vinduet skal måles på: gæsten bestiller til den
     dag, hun henter, ikke til den dag, hun sidder og taster. */
  const HENTEDAG = '2026-08-08';

  test('inden for sit vindue står varen på kortet', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: FREDAG, data: medTilbud(HENTEDAG, HENTEDAG) });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await expect(page.locator('.stk-linje[data-vare="PRØVE-TILBUD"]')).toBeVisible();
  });

  /* ⚠️ DEN, DER BETYDER NOGET: dagen efter er den VÆK af sig selv.
     Ingen skal huske at slukke den, og en gammel fane, der prøver
     alligevel, får bestilling_ukendt_vare fra databasen
     (supabase/proev-tilvalg-og-tidsbegraensede-varer.sql nr. 13). */
  test('dagen efter vinduet er varen væk — uden at nogen slukkede den',
    async ({ page }) => {
      await åbn(page, '/bestil/', { ur: FREDAG, data: medTilbud('2026-08-01', '2026-08-07') });
      await page.waitForSelector('#bestil-stykker .stk-linje');
      await expect(page.locator('.stk-linje[data-vare="PRØVE-TILBUD"]')).toHaveCount(0);
    });

  /* Og FØR vinduet er den der heller ikke — ellers var "slukker
     sig selv" kun det halve af reglen. */
  test('før vinduet er varen der heller ikke', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: FREDAG, data: medTilbud('2026-09-01', '2026-09-02') });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await expect(page.locator('.stk-linje[data-vare="PRØVE-TILBUD"]')).toHaveCount(0);
  });

  test('modstykke: en vare uden vindue står som altid', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: FREDAG, data: medTilbud(null, null) });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await expect(page.locator('.stk-linje[data-vare="PRØVE-TILBUD"]')).toBeVisible();
  });
});
