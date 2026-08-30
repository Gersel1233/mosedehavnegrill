/* Logbogen: hvem ændrede hvad, og hvornår.

   En logbog kan fejle på to modsatte måder, og begge er stille.
   Den kan skrive FOR LIDT — så er svaret på "hvem gjorde det"
   bare tomt, og det ligner, at der ikke skete noget. Og den kan
   skrive FOR MEGET — så er den blevet en skyggekopi af kundernes
   navne og numre ved siden af den, adgangsreglerne passer på.

   Databasens egen håndhævelse er bevist for sig i
   supabase/proev-logbog.sql (19 prøver). Her måles øvetilstandens
   spejl af trigger'en og det, personalet faktisk får at se —
   opfører øvelsen sig anderledes end det rigtige, er den ikke en
   øvelse. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const bestilling = (æ) => ({
  id: 1, lokation_id: 'mosede', reference: 'SM260807-AAAAA',
  navn: 'Anna Vind', telefon: '20304050', email: null,
  hent_dato: '2026-08-09', hent_tid: '12:00',
  linjer: [{ navn: 'Rejemad', antal: 2, pris: 65 }], antal: 2,
  besked: 'Uden citron tak', status: 'ny', intern_note: null,
  hvordan: 'afhentning',
  oprettet: '2026-08-07T09:00:00Z', ...æ,
});

const åbnHistorik = (page) => visFane(page, 'p-historik');

test.describe('Logbogen skriver, når noget bliver ændret', () => {

  test('en statusændring giver én linje med hvem, hvad og hvornår', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bestillinger: [bestilling()] }) });
    await visFane(page, 'p-bestillinger');

    page.once('dialog', (d) => d.accept());
    await page.locator('#bestillinger-liste .bestil-kort')
      .getByRole('button', { name: 'Bekræft' }).click();

    await åbnHistorik(page);
    const linje = page.locator('#logbog-liste .log-linje');
    await expect(linje).toHaveCount(1);
    await expect(linje).toContainText('Bestilling');
    await expect(linje).toContainText('rettet');
    await expect(linje).toContainText('SM260807-AAAAA');
    // Hvem: e-mailen fra login
    await expect(linje).toContainText('@');
    // Og HVAD der blev anderledes — før OG efter.
    await expect(linje.locator('.log-foer')).toHaveText('Ny');
    await expect(linje.locator('.log-efter')).toHaveText('Bekræftet');
  });

  /* En ny bestilling er sit eget bevis: rækken ligger der med navn
     og tidspunkt. En logbogslinje oveni ville være den samme
     oplysning gemt to gange — altså dobbelt så mange steder, hvor
     en gæsts telefonnummer står. */
  test('en oprettelse giver INGEN linje', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bestillinger: [bestilling()] }) });
    await åbnHistorik(page);
    await expect(page.locator('#logbog-liste')).toContainText('ikke rettet eller slettet');
    expect(((await gemteData(page)).logbog || []).length).toBe(0);
  });

  test('en tur i skraldespanden har sit eget ord', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({ bestillinger: [bestilling({ status: 'afhentet' })] }),
    });
    await visFane(page, 'p-bestillinger');
    page.once('dialog', (d) => d.accept());
    await page.locator('#bestillinger-liste .bestil-kort')
      .getByRole('button', { name: 'Slet' }).click();

    await åbnHistorik(page);
    await expect(page.locator('#logbog-liste .log-linje').first())
      .toContainText('i skraldespanden');
  });

  test('og hentet tilbage har sit eget', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        bestillinger: [bestilling({ slettet: '2026-08-07T10:00:00Z' })],
      }),
    });
    await åbnHistorik(page);
    await page.locator('#skrald-liste').getByRole('button', { name: 'Hent tilbage' }).click();

    await expect(page.locator('#logbog-liste .log-linje').first())
      .toContainText('hentet tilbage');
  });

  test('en sletning for altid står der, når rækken er væk', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        bestillinger: [bestilling({ slettet: '2026-08-07T10:00:00Z' })],
      }),
    });
    await åbnHistorik(page);
    page.once('dialog', (d) => d.accept());
    await page.locator('#skrald-liste').getByRole('button', { name: 'Slet for altid' }).click();

    const linje = page.locator('#logbog-liste .log-linje').first();
    await expect(linje).toContainText('slettet for altid');
    await expect(linje).toContainText('SM260807-AAAAA');

    // Rækken er væk, linjen er ikke.
    const gemt = await gemteData(page);
    expect((gemt.bestillinger || []).length).toBe(0);
    expect(gemt.logbog.length).toBeGreaterThan(0);
  });
});

test.describe('Logbogen er ikke en skyggekopi af tabellen', () => {

  /* Gemte den hele rækken, ville logbogen være en kopi af
     kundelisten ved siden af den, som adgangsreglerne passer på. */
  test('kun det ændrede felt bliver gemt', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bestillinger: [bestilling()] }) });
    await visFane(page, 'p-bestillinger');
    page.once('dialog', (d) => d.accept());
    await page.locator('#bestillinger-liste .bestil-kort')
      .getByRole('button', { name: 'Bekræft' }).click();

    await åbnHistorik(page);
    const gemt = await gemteData(page);
    expect(Object.keys(gemt.logbog[0].efter)).toEqual(['status']);
  });

  test('gæstens egne ord og hele bestillingen ender ikke i logbogen', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bestillinger: [bestilling()] }) });
    await visFane(page, 'p-bestillinger');

    // En note fra personalet ændrer også aendret — og linjer og
    // besked skal stadig blive i tabellen.
    // Noten er foldet, når den er tom (29/8) — ét tryk ind til den.
    await page.locator('#bestillinger-liste .note-fold > summary').first().click();
    const felt = page.locator('#bestillinger-liste input[type="text"]').first();
    await felt.fill('Ringet, kommer kl. 12.15');
    await felt.blur();

    await åbnHistorik(page);
    const l = (await gemteData(page)).logbog[0];
    expect(Object.keys(l.efter)).toContain('intern_note');
    expect(Object.keys(l.efter)).not.toContain('linjer');
    expect(Object.keys(l.efter)).not.toContain('besked');
    // aendret ændrer sig ved HVER skrivning og fortæller ingenting.
    expect(Object.keys(l.efter)).not.toContain('aendret');
  });
});

test.describe('Logbogen kan ikke rettes', () => {

  /* Der er ingen knapper på en linje, og det er hele pointen.
     Kunne personalet rette i den, svarede den ikke længere på det
     spørgsmål, den findes for. */
  test('der er ingen knapper på en linje', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bestillinger: [bestilling()] }) });
    await visFane(page, 'p-bestillinger');
    page.once('dialog', (d) => d.accept());
    await page.locator('#bestillinger-liste .bestil-kort')
      .getByRole('button', { name: 'Bekræft' }).click();

    await åbnHistorik(page);
    await expect(page.locator('#logbog-liste .log-linje')).toHaveCount(1);
    await expect(page.locator('#logbog-liste .log-linje button')).toHaveCount(0);
  });
});

test.describe('Historik er én fane, ikke to', () => {

  test('skraldespanden og logbogen står i det samme panel', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bestillinger: [bestilling()] }) });
    await åbnHistorik(page);
    await expect(page.locator('#p-historik #skrald-liste')).toBeVisible();
    await expect(page.locator('#p-historik #logbog-liste')).toBeVisible();
  });

  test('fanen har ikke et tal på', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bestillinger: [bestilling()] }) });
    await expect(page.locator('[data-panel="p-historik"] .badge')).toHaveCount(0);
  });
});
