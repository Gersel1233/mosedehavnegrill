/* ============================================================
   FROKOSTORDNINGEN SOM ET FLOW, OG FEJLEN VED FELTET  (28/9)
   ------------------------------------------------------------
   Mikkels ord: *"selve frokost til arbejdspladsen er ikke dygtig
   nok ift bestillingsflow — hvis jeg skal have det hver uge, men
   kan vælge mandag, tirsdag, onsdag, torsdag, så er det jo ikke 1
   gang om ugen, så er det jo 4 gange om ugen … og jeg kan ikke få
   et tilbud, den går bare op og siger, jeg skal vælge en dato, jeg
   allerede har gjort … og når man vælger dato og tingen på
   kalender-tingen, snakker de overhovedet ikke sammen"* og *"alle
   steder, hvis telefonnummeret er ugyldigt den ene eller anden
   måde, skal det også være tydeligt"*.

   Uret står fredag 7. august 2026 (åbnSkal). Frokosten har tre
   dages varsel, så den første mulige dag er mandag 10. august.
   Ugedagene her er regnet i kalenderen, ikke spurgt af siden:
     10 man · 11 tirs · 12 ons · 13 tors · 14 fre · 15 lør · 16 søn
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

async function frokost(page) {
  await åbnSkal(page, '/h-frokost.html', { data: grunddata() });
  // Nettet tegnes, når data er hentet — det er dét, gæsten trykker i.
  await expect(page.locator('.lk-dag').first()).toBeVisible();
}

function dag(page, navn) {
  return page.locator('#tilbud [data-chips]').nth(1).locator('button', { hasText: navn });
}
function hvorTit(page, navn) {
  return page.locator('#tilbud [data-chips]').first().locator('button', { hasText: navn });
}

async function kontakt(page) {
  await page.locator('#fnavn').fill('Jens Kok');
  await page.locator('#ftlf').fill('28871343');
  await page.locator('#fadr').fill('Havnevej 20I, 2670 Greve');
}
const send = (page) => page.locator('#tilbud button.g.solid.blk').click();

test.describe('Dagene og hvor tit hænger sammen', () => {

  test('fire dage hver uge står som fire leveringer om ugen', async ({ page }) => {
    await frokost(page);
    await dag(page, 'Fre').click();
    await expect(page.locator('#f-rytme'))
      .toHaveText('4 leveringer om ugen: mandag, tirsdag, onsdag og torsdag.');
  });

  test('hver anden uge siger det, og én dag er ental', async ({ page }) => {
    await frokost(page);
    await hvorTit(page, 'Hver anden uge').click();
    for (const d of ['Man', 'Tirs', 'Tors', 'Fre']) await dag(page, d).click();
    await expect(page.locator('#f-rytme')).toHaveText('1 levering hver anden uge: onsdag.');
  });

  test('uden en eneste dag sendes der ikke — og feltet siger hvorfor', async ({ page }) => {
    await frokost(page);
    for (const d of ['Man', 'Tirs', 'Ons', 'Tors', 'Fre']) await dag(page, d).click();
    await expect(page.locator('#f-rytme')).toHaveText('Vælg mindst én dag.');
    await kontakt(page);
    await send(page);
    await expect(page.locator('#tilbud [data-fejllinje]')).toContainText('mindst én dag');
    expect((await gemteData(page)).forespoergsler || []).toHaveLength(0);
  });

  test('rytmen sendes med i ord, så personalet læser det samme', async ({ page }) => {
    await frokost(page);
    await dag(page, 'Fre').click();
    await kontakt(page);
    await send(page);
    await expect.poll(async () => ((await gemteData(page)).forespoergsler || []).length).toBe(1);
    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.detaljer.rytme).toBe('4 leveringer om ugen: mandag, tirsdag, onsdag og torsdag');
    expect(f.detaljer.dage).toEqual(['Man', 'Tirs', 'Ons', 'Tors']);
  });

  test('"Kun én gang" skjuler ugedagene og sender dem ikke', async ({ page }) => {
    await frokost(page);
    await hvorTit(page, 'Kun én gang').click();
    await expect(page.locator('#f-dage-felt')).toBeHidden();
    await kontakt(page);
    await send(page);
    await expect.poll(async () => ((await gemteData(page)).forespoergsler || []).length).toBe(1);
    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.detaljer.dage).toBeUndefined();
    expect(f.detaljer.rytme).toContain('Én levering');
  });
});

test.describe('Kalenderen taler med dagene', () => {

  test('weekenden og de fravalgte dage kan ikke vælges', async ({ page }) => {
    await frokost(page);
    await expect(page.locator('.lk-dag[data-dato="2026-08-15"]')).toBeDisabled();   // lør
    await expect(page.locator('.lk-dag[data-dato="2026-08-16"]')).toBeDisabled();   // søn
    await expect(page.locator('.lk-dag[data-dato="2026-08-14"]')).toBeEnabled();    // fre
    await dag(page, 'Fre').click();
    await expect(page.locator('.lk-dag[data-dato="2026-08-14"]')).toBeDisabled();
    await expect(page.locator('.lk-dag[data-dato="2026-08-13"]')).toBeEnabled();    // tors
  });

  test('en valgt dag, der ikke passer længere, tages af — og det siges', async ({ page }) => {
    await frokost(page);
    await page.locator('.lk-dag[data-dato="2026-08-14"]').click();
    await expect(page.locator('#fstart')).toHaveValue('2026-08-14');
    await expect(page.locator('#bl-valgt')).toContainText('Fredag den 14. august');
    await dag(page, 'Fre').click();
    await expect(page.locator('#fstart')).toHaveValue('');
    await expect(page.locator('#bl-valgt')).toContainText('passer ikke');
  });

  test('en dato skrevet i feltet flytter nettet til sin måned', async ({ page }) => {
    await frokost(page);
    await page.locator('#fstart').fill('2026-10-06');
    await expect(page.locator('#lk-titel')).toHaveText('oktober 2026');
    await expect(page.locator('.lk-dag[data-dato="2026-10-06"]')).toHaveClass(/valgt/);
  });

  /* ⚠️ DATOEN STÅR ÉN GANG. Browserens felt stod ved siden af nettet
     på frokost- og selskabssiden: to datovælgere, der ikke fulgtes ad.
     Målt på BREDDEN, ikke på en klasse — og også efter fokus, for det
     var fokus, der foldede det ud og flyttede knapperne. */
  for (const [side, id] of [['/h-frokost.html', '#fstart'], ['/h-selskaber.html', '#pdato']]) {
    test(`${side}: browserens datofelt er skjult bag nettet, også med fokus`, async ({ page }) => {
      await åbnSkal(page, side, { data: grunddata() });
      await expect(page.locator('.lk-dag').first()).toBeVisible();
      const bredde = async () => (await page.locator(id).boundingBox() || { width: 0 }).width;
      expect(await bredde()).toBeLessThanOrEqual(1);
      await page.locator(id).focus();
      expect(await bredde()).toBeLessThanOrEqual(1);
    });
  }

  test('et for tidligt varsel peger på nettet med frokostens egne ord', async ({ page }) => {
    await frokost(page);
    await kontakt(page);
    await page.locator('#fstart').fill('2026-08-07');
    await send(page);
    const linje = page.locator('#tilbud [data-fejllinje]');
    await expect(linje).toContainText('frokostordning');
    await expect(linje).not.toContainText('selskab');
    await expect(linje).toContainText('mandag den 10. august');
    await expect(page.locator('#ledigkal')).toHaveAttribute('aria-invalid', 'true');
    expect((await gemteData(page)).forespoergsler || []).toHaveLength(0);
  });
});

test.describe('Fejlen står ved feltet', () => {

  test('et for kort nummer bliver rødt med sin sætning, og retter man, går det væk', async ({ page }) => {
    await frokost(page);
    await kontakt(page);
    await page.locator('#ftlf').fill('1234');
    await send(page);
    const tlf = page.locator('#ftlf');
    await expect(tlf).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#ftlf + .felt-fejl')).toContainText('for kort');
    // Den røde kant er BEREGNET rød — en attribut, der ikke slår igennem, er ingen regel.
    const kant = await tlf.evaluate((el) => getComputedStyle(el).outlineColor);
    expect(kant).toBe('rgb(214, 42, 58)');
    await tlf.fill('28871343');
    await expect(page.locator('#ftlf + .felt-fejl')).toHaveCount(0);
    await expect(tlf).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('et nummer med seksten cifre bliver sagt fra ved feltet — ikke af databasen', async ({ page }) => {
    await åbnSkal(page, '/h-selskaber.html', { data: grunddata() });
    await page.locator('#pnavn').fill('Sara');
    await page.locator('#pmail').fill('sara@eksempel.dk');
    await page.locator('#ptlf').fill('1234567890123456');
    await page.locator('#forespoerg button.g.solid.blk').click();
    await expect(page.locator('#ptlf + .felt-fejl')).toContainText('for langt');
    expect((await gemteData(page)).forespoergsler || []).toHaveLength(0);
  });

  test('ord i nummerfeltet bliver sagt fra', async ({ page }) => {
    await åbnSkal(page, '/h-selskaber.html', { data: grunddata() });
    await page.locator('#pnavn').fill('Sara');
    await page.locator('#pmail').fill('sara@eksempel.dk');
    await page.locator('#ptlf').fill('ring efter 16 12345678');
    await page.locator('#forespoerg button.g.solid.blk').click();
    await expect(page.locator('#ptlf + .felt-fejl')).toContainText('uden ord');
    expect((await gemteData(page)).forespoergsler || []).toHaveLength(0);
  });

  test('alt, der mangler, bliver rødt på én gang', async ({ page }) => {
    await frokost(page);
    await send(page);
    await expect(page.locator('#tilbud .felt-fejl')).toHaveCount(3);   // adresse, navn, nummer
    await expect(page.locator('#tilbud [data-fejllinje]')).toContainText('2 ting mere');
  });

  test('en levering uden adresse sendes ikke; henter de selv, gør det ingenting', async ({ page }) => {
    await frokost(page);
    await page.locator('#fnavn').fill('Jens Kok');
    await page.locator('#ftlf').fill('28871343');
    await send(page);
    await expect(page.locator('#fadr + .felt-fejl')).toContainText('leveringsadressen');
    expect((await gemteData(page)).forespoergsler || []).toHaveLength(0);

    await page.locator('[data-toggles="#fadrfelt"] button', { hasText: 'Vi henter selv' }).click();
    await expect(page.locator('#fadrfelt')).toBeHidden();
    await send(page);
    await expect.poll(async () => ((await gemteData(page)).forespoergsler || []).length).toBe(1);
  });

  test('intet antal er forvalgt — et firma på 40 må ikke få et tilbud til 14', async ({ page }) => {
    await frokost(page);
    await expect(page.locator('#fantal')).toHaveValue('');
    await åbnSkal(page, '/h-selskaber.html', { data: grunddata() });
    await expect(page.locator('#pantal')).toHaveValue('');
  });
});
