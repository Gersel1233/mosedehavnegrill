/* Forsidens bestillingsformular — koblingen til køkkenet.

   Formularen var en attrap: faste datoer, faste klokkeslæt, seks
   rækker mad skrevet i hånden og en knap, der ikke gjorde noget.
   Prøverne her måler, at den er blevet ægte — og at designet
   stadig er designet. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

// 2026-08-07 er en FREDAG, uret står 11:00Z = 13:00 dansk tid.
const FREDAG = '2026-08-07T11:00:00Z';

function data(ændringer) {
  const d = grunddata();
  // Kategorien skal være åbnet i admin, ellers er der intet at sælge
  d.indstillinger.bestilbare_kategorier = [1, 6, 9];
  d.indstillinger.bestilling_varsel_timer = 2;
  Object.assign(d.indstillinger, (ændringer || {}).indstillinger || {});
  return Object.assign(d, ændringer || {}, {
    indstillinger: Object.assign(d.indstillinger, (ændringer || {}).indstillinger || {}),
  });
}

async function åbn(page, valg) {
  await åbnSkal(page, '/index.html', Object.assign({ ur: FREDAG, data: data() }, valg || {}));
}

test.describe('Forsidens bestilling', () => {
  test('dagene kommer fra åbningstiderne, ikke fra designet', async ({ page }) => {
    await åbn(page);
    const muligheder = await page.$$eval('#dato option', (o) => o.map((e) => e.value));

    // Designets tre faste tekster er væk
    await expect(page.locator('#dato')).not.toContainText('25. august');
    // Med to timers varsel kan man bestille i dag
    expect(muligheder[0]).toBe('2026-08-07');
    // Alle dage er rigtige datoer i rækkefølge
    expect(muligheder.length).toBeGreaterThan(3);
    expect(muligheder).toEqual([...muligheder].sort());
  });

  test('en lukkedag kan ikke vælges', async ({ page }) => {
    const d = data();
    d.kalender = [{
      id: 1, lokation_id: 'mosede', type: 'lukkedag', dato: '2026-08-08',
      slut_dato: null, titel: 'Havnefest', beskrivelse: '', emoji: '',
      lukker_kl: null, offentlig: true,
    }];
    await åbn(page, { data: d });

    const muligheder = await page.$$eval('#dato option', (o) => o.map((e) => e.value));
    expect(muligheder).toContain('2026-08-07');
    expect(muligheder).not.toContain('2026-08-08');
  });

  test('varslet skubber dagene frem', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_varsel_timer = 24;
    await åbn(page, { data: d });

    const muligheder = await page.$$eval('#dato option', (o) => o.map((e) => e.value));
    expect(muligheder[0]).toBe('2026-08-08');
  });

  test('tiderne ligger inden for åbningstiden', async ({ page }) => {
    await åbn(page);
    const tider = await page.$$eval('#tid option', (o) => o.map((e) => e.value));

    // Ugeplanen er 11–21, og sidste tid er en halv time før der lukkes
    expect(tider[tider.length - 1]).toBe('20:30');
    // Klokken er 13, varslet er 2 timer → intet før 15
    expect(tider[0]).toBe('15:00');
  });

  test('dagens ret står øverst med tæller, kategorierne folder ud', async ({ page }) => {
    const d = data();
    d.indstillinger.dagens_ret = { navn: 'Stegt rødspætte', beskrivelse: '', pris: 118 };
    await åbn(page, { data: d });

    const første = page.locator('[data-liste] .item').first();
    await expect(første).toHaveClass(/hi/);
    await expect(første.locator('h4')).toHaveText('Stegt rødspætte');
    await expect(første.locator('.tag')).toContainText('118,-');

    // Kategorien er lukket til at begynde med
    const kat = page.locator('[data-kategori="Smørrebrød"]');
    await expect(kat.locator('.add')).toHaveText('+ tilføj');
    await expect(page.locator('[data-vare="Flæskestegssandwich"]')).toHaveCount(0);

    await kat.click();
    await expect(page.locator('[data-vare="Flæskestegssandwich"]')).toHaveCount(1);
    await expect(kat.locator('.add')).toHaveText('– luk');
  });

  test('en bestilling lander i databasen med de rigtige linjer', async ({ page }) => {
    await åbn(page);

    await page.locator('[data-kategori="Smørrebrød"]').click();
    const række = page.locator('[data-vare="Flæskestegssandwich"]');
    await række.locator('button[data-d="+"]').click();
    await række.locator('button[data-d="+"]').click();

    await page.locator('#navn').fill('Sara Poulsen');
    await page.locator('#tlf').fill('28 87 13 43');
    await page.locator('#besked').fill('Uden agurk, tak.');
    await page.locator('#tid').selectOption('17:00');
    await page.locator('button.g.solid.blk').click();

    // Kvitteringen bruger designets egne dele
    await expect(page.locator('#bestil .panel h3')).toContainText('Tak, Sara');
    // Referencen er SM + dato + kode, fx SM260807-AKA8H
    await expect(page.locator('#bestil .panel .note')).toContainText(/Reference: SM\d{6}-/);

    const gemt = await gemteData(page);
    expect(gemt.bestillinger).toHaveLength(1);
    const b = gemt.bestillinger[0];
    expect(b.navn).toBe('Sara Poulsen');
    expect(b.hent_dato).toBe('2026-08-07');
    expect(b.hent_tid).toBe('17:00');
    expect(b.antal).toBe(2);
    expect(b.linjer).toEqual([{ navn: 'Flæskestegssandwich', antal: 2, pris: 89 }]);
    expect(b.besked).toBe('Uden agurk, tak.');
    expect(b.status).toBe('ny');
  });

  test('dagens ret ryger ud af kurven, når man skifter dag', async ({ page }) => {
    /* Retten gælder KUN i dag — sådan er feltet i admin skruet
       sammen. Blev den hængende i kurven, ville køkkenet få en
       ret, de ikke laver den dag. */
    const d = data();
    d.indstillinger.dagens_ret = { navn: 'Stegt rødspætte', beskrivelse: '', pris: 118 };
    await åbn(page, { data: d });

    await page.locator('.item.hi button[data-d="+"]').click();
    await expect(page.locator('#sumline')).toContainText('1 × Stegt rødspætte');

    await page.locator('#dato').selectOption('2026-08-08');
    await expect(page.locator('.item.hi')).toHaveCount(0);
    await expect(page.locator('#sumline')).toContainText('Vælg mindst én ting');
  });

  test('uden navn eller nummer bliver den ikke sendt', async ({ page }) => {
    await åbn(page);
    await page.locator('[data-kategori="Smørrebrød"]').click();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();

    await page.locator('button.g.solid.blk').click();
    await expect(page.locator('#sumline')).toContainText('Skriv dit navn');

    await page.locator('#navn').fill('Sara');
    await page.locator('button.g.solid.blk').click();
    await expect(page.locator('#sumline')).toContainText('telefonnummer');

    const gemt = await gemteData(page);
    expect(gemt.bestillinger || []).toHaveLength(0);
  });

  test('spis her spørges der kun om, når forretningen har slået det til', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('[data-seg="how"]')).toBeHidden();

    const d = data();
    d.indstillinger.spis_her = true;
    await åbn(page, { data: d });
    await expect(page.locator('[data-seg="how"]')).toBeVisible();

    await page.locator('[data-seg="how"] button').nth(1).click();
    await page.locator('[data-kategori="Smørrebrød"]').click();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#navn').fill('Sara Poulsen');
    await page.locator('#tlf').fill('28871343');
    await page.locator('button.g.solid.blk').click();

    const gemt = await gemteData(page);
    expect(gemt.bestillinger[0].hvordan).toBe('spis_her');
  });

  test('er der lukket for bestillinger, findes afsnittet ikke', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_aaben = false;
    await åbn(page, { data: d });

    await expect(page.locator('#bestil')).toBeHidden();
    // Pillen må ikke pege ned i ingenting
    await expect(page.locator('#bestil-pill')).toHaveAttribute('href', 'h-smorrebrod.html');
  });

  test('skallen er urørt: felterne står i designets rækkefølge', async ({ page }) => {
    await åbn(page);
    const etiketter = await page.$$eval('#bestil .panel .field label',
      (els) => els.map((e) => e.textContent.trim()));
    expect(etiketter).toEqual(['Dato', 'Vælg jeres retter', 'Tidspunkt',
      'Hvordan vil I spise?', 'Navn', 'Telefonnummer', 'Besked (valgfrit)']);
  });
});

/* ============================================================
   LEVERINGSOMRÅDET ER EJERENS FAKTA — PRISEN ER STADIG UKENDT
   ------------------------------------------------------------
   Mikkel oplyste området 27/8: Karslunde, Greve, Tune, Solrød og
   omegn. Det står som en INDSTILLING og ikke i koden — hver ny
   by ville ellers være en udgivelse hos os.

   ⚠️ OG DER MÅ IKKE STÅ EN PRIS. Designet havde "150 kr. inden
   for 10 km af havnen"; det var et opdigtet tal. Området er
   oplyst, prisen er ikke — og et beløb, vi finder på, er værre
   end ingen pris, for gæsten regner med det.
   ============================================================ */
test.describe('Leveringsområdet', () => {

  function medLevering(omraade, pris) {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, {
      levering: true, bestilling_varsel_timer: 24,
    });
    if (omraade !== undefined) d.indstillinger.leverings_omraade = omraade;
    if (pris !== undefined) d.indstillinger.leverings_pris = pris;
    return d;
  }

  test('området fra admin står på siden', async ({ page }) => {
    await åbnSkal(page, '/h-smorrebrod.html',
      { data: medLevering('Karslunde, Greve, Tune og Solrød') });
    await expect(page.locator('#lev-fakta'))
      .toContainText('Vi leverer i Karslunde, Greve, Tune og Solrød');
    await expect(page.locator('#lev-hint'))
      .toContainText('Karslunde, Greve, Tune og Solrød');
  });

  /* Er feltet tomt i admin, nævner siden intet område — så er vi
     tilbage ved det, der ikke lover noget. */
  test('uden et område nævner siden ikke et', async ({ page }) => {
    await åbnSkal(page, '/h-smorrebrod.html', { data: medLevering('') });
    await expect(page.locator('#lev-fakta')).not.toContainText('Vi leverer i');
    await expect(page.locator('#lev-hint')).toContainText('ringer og aftaler');
  });

  /* ⚠️ DEN VIGTIGSTE I AFSNITTET. Designets opdigtede tal må
     ikke kunne snige sig tilbage — hverken i opmærkningen eller
     i noget, motoren skriver. */
  /* PRISEN ER OGSÅ EJERENS. Skriver han den, står den; lader han
     feltet stå tomt, ringer de og aftaler. */
  test('prisen fra admin står på siden', async ({ page }) => {
    await åbnSkal(page, '/h-smorrebrod.html',
      { data: medLevering('Karslunde, Greve, Tune og Solrød', '150 kr.') });
    await expect(page.locator('#lev-fakta')).toContainText('for 150 kr.');
    await expect(page.locator('#lev-hint')).toContainText('Levering koster 150 kr.');
  });

  /* ⚠️ TOM ER IKKE NUL. Et tomt felt betyder "vi har ikke sat en
     pris" — ikke "gratis". Stod der 0 kr., ville gæsten regne med
     gratis levering. */
  test('uden en pris ringer de og aftaler den', async ({ page }) => {
    await åbnSkal(page, '/h-smorrebrod.html',
      { data: medLevering('Greve', '') });
    await expect(page.locator('#lev-hint')).toContainText('ringer og aftaler prisen');
    await expect(page.locator('#lev-hint')).not.toContainText('0 kr');
    await expect(page.locator('#lev-fakta')).not.toContainText('for ');
  });

  test('der står ingen opfundet pris nogen steder', async ({ page }) => {
    await åbnSkal(page, '/h-smorrebrod.html',
      { data: medLevering('Karslunde, Greve, Tune og Solrød') });
    const tekst = await page.locator('body').innerText();
    expect(tekst).not.toContain('150 kr');
    expect(tekst).not.toContain('10 km');
  });
});

/* ============================================================
   MINDSTEANTALLET ER SMØRREBRØDETS  (30/8)
   ------------------------------------------------------------
   Kundens ord, målt på den udgivne side: "der er en fejl med at
   der står når man bestiller smørbrød ud af huset skal man
   minimum bestille 5 ting — har jeg sat den til, men det gælder
   på alt. Det er en fejl, det er kun smørrebrød."

   Han har ret, og noten ved minStk() i js/bestil-regler.js har
   sagt det siden 23/8. Koden holdt tallet op mod HELE kurven, så
   én burger og en sodavand blev afvist med "der skal mindst
   bestilles 5 stk." Det er "en kommentar er ikke et værn", igen.
   ============================================================ */
test.describe('Mindsteantallet gælder kun smørrebrødet', () => {

  function medFem() {
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 2;
    d.indstillinger.bestilling_min_stk = 5;
    d.indstillinger.bestilbare_kategorier = [1, 6, 9, 12];
    return d;
  }

  async function udfyld(page) {
    await page.locator('#navn').fill('Sara Poulsen');
    await page.locator('#tlf').fill('28871343');
    await page.locator('#tid').selectOption({ index: 1 });
    await page.locator('button.g.solid.blk').click();
  }

  test('én is kan bestilles, selv om ejeren kræver fem smørrebrød', async ({ page }) => {
    await åbn(page, { data: medFem() });

    /* Øl og ikke is: isen kan slet ikke bestilles nogen steder
       (Butik.udvalg filtrerer den fra — "det er altid til
       rådighed"), så kategorien findes ikke i listen. */
    await page.locator('[data-kategori="Øl"]').click();
    await page.locator('[data-vare="Fadøl, lille"] button[data-d="+"]').click();
    await udfyld(page);

    // Den skal IGENNEM — ikke stoppes af smørrebrødets regel.
    await expect(page.locator('#bestil .panel h3')).toContainText('Tak, Sara');
    const gemt = await gemteData(page);
    expect(gemt.bestillinger).toHaveLength(1);
  });

  /* ⚠️ MEN REGLEN GÆLDER STADIG, HVOR DEN HØRER TIL. Fjernes den
     helt, kan ejeren ikke længere sætte et mindsteantal på det,
     køkkenet skal smøre i hånden. */
  test('to stykker smørrebrød bliver stadig afvist', async ({ page }) => {
    await åbn(page, { data: medFem() });

    await page.locator('[data-kategori="Smørrebrød"]').click();
    const række = page.locator('[data-vare="Flæskestegssandwich"]');
    await række.locator('button[data-d="+"]').click();
    await række.locator('button[data-d="+"]').click();
    await udfyld(page);

    await expect(page.locator('#bestil #sumline, #bestil .note').first())
      .toContainText('5 stk. smørrebrød');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);
  });

  /* Og beskeden SIGER smørrebrød. "Der skal mindst bestilles 5
     stk." fik en gæst med én burger til at lede efter fire mere. */
  test('fem stykker smørrebrød går igennem', async ({ page }) => {
    await åbn(page, { data: medFem() });

    await page.locator('[data-kategori="Smørrebrød"]').click();
    const række = page.locator('[data-vare="Flæskestegssandwich"]');
    for (let i = 0; i < 5; i++) await række.locator('button[data-d="+"]').click();
    await udfyld(page);

    await expect(page.locator('#bestil .panel h3')).toContainText('Tak, Sara');
  });
});
