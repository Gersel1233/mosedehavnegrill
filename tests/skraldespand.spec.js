/* Skraldespanden: "Slet" er ikke længere endeligt.

   Det, filen måler, er ikke at rækken forsvinder fra listen — det
   er den nemme halvdel. Det er at den KAN KOMME TILBAGE, at den
   ikke spærrer imens, og at "for altid" faktisk er for altid.

   Databasens egen håndhævelse er bevist for sig i
   supabase/proev-skraldespand.sql (19 prøver). Her måles
   øvetilstandens spejl af samme regler — opfører øvelsen sig
   anderledes end det rigtige, er den ikke en øvelse. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, NØGLE } = require('./hjaelp');

/* Samme vej gennem formularen som i tests/bestilling.spec.js: to
   stykker af den første slags, navn og telefon. Dag og tid vælger
   formularen selv, og den vælger det samme hver gang — derfor er
   to sendinger i træk præcis den samme bestilling. */
async function sendEnBestilling(page) {
  const op = page.locator('#bestil-stykker .stk-linje').first()
    .locator('button', { hasText: '+' });
  await op.click();
  await op.click();
  await page.fill('#bestil-navn', 'Mikkel Gersel');
  await page.fill('#bestil-telefon', '20304050');
  /* Det sidste kig står imellem: Send åbner kigget, og kiggets
     egen knap sender. Se noten i js/bestilling.js. */
  await page.locator('#bestil-send').click();
  await page.locator('#bestil-kig:not(.skjult)').waitFor();
  await page.locator('#kig-send').click();
}

/* Uret i åbn() og åbnAdmin() står på fredag 7. august 2026. */
const I_DAG = '2026-08-07T11:00:00Z';

const bestilling = (æ) => ({
  id: 1, lokation_id: 'mosede', reference: 'SM260807-AAAAA',
  navn: 'Anna Vind', telefon: '20304050', email: null,
  hent_dato: '2026-08-09', hent_tid: '12:00',
  linjer: [{ navn: 'Rejemad', antal: 2, pris: 65 }], antal: 2,
  besked: null, status: 'afhentet', intern_note: null,
  hvordan: 'afhentning',
  oprettet: '2026-08-07T09:00:00Z', ...æ,
});

const udlejning = (æ) => ({
  id: 1, lokation_id: 'mosede', reference: 'BL260807-AAAAA',
  navn: 'Anna Vind', telefon: '20304050', email: null,
  dato: '2026-08-22', antal_personer: 30,
  besked: null, status: 'ny', intern_note: null,
  oprettet: '2026-08-07T10:30:00Z', ...æ,
});

// Slettet for N dage siden, regnet fra uret i testene.
const slettetFor = (dage) =>
  new Date(Date.parse(I_DAG) - dage * 86400000).toISOString();

test.describe('Slet flytter til skraldespanden', () => {

  test('en slettet bestilling forsvinder fra listen og står i spanden', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bestillinger: [bestilling()] }) });
    await page.locator('[data-panel="p-bestillinger"]').click();

    const kort = page.locator('#bestillinger-liste .bestil-kort');
    await expect(kort).toHaveCount(1);

    let besked = null;
    page.once('dialog', (d) => { besked = d.message(); d.accept(); });
    await kort.getByRole('button', { name: 'Slet' }).click();

    /* Spørgsmålet skal sige, at det KAN fortrydes. Stod der "for
       altid", ville personalet tro, det var væk — og aldrig lede
       her. */
    await expect.poll(() => besked).toContain('skraldespanden');
    expect(besked).toContain('30 dage');

    await expect(page.locator('#bestillinger-liste .bestil-kort')).toHaveCount(0);

    await page.locator('[data-panel="p-historik"]').click();
    const spand = page.locator('#skrald-liste .bestil-kort');
    await expect(spand).toHaveCount(1);
    await expect(spand).toContainText('Anna Vind');
    await expect(spand).toContainText('Bestilling');
    await expect(spand).toContainText('2 × Rejemad');

    /* Rækken er stadig i databasen — det er hele forskellen på
       en skraldespand og en sletning. */
    const gemt = await gemteData(page);
    expect(gemt.bestillinger.length).toBe(1);
    expect(gemt.bestillinger[0].slettet).toBeTruthy();
  });

  test('den kan hentes tilbage og står på listen igen', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({ bestillinger: [bestilling({ slettet: slettetFor(2) })] }),
    });

    await page.locator('[data-panel="p-bestillinger"]').click();
    await expect(page.locator('#bestillinger-liste .bestil-kort')).toHaveCount(0);

    await page.locator('[data-panel="p-historik"]').click();
    await page.locator('#skrald-liste').getByRole('button', { name: 'Hent tilbage' }).click();

    await expect(page.locator('#skrald-liste .bestil-kort')).toHaveCount(0);
    /* ⚠️ BESTILLINGER VISER ÉN DAG AD GANGEN NU (26/8), og den
       her er til den 9. og AFHENTET — altså færdig. Den står
       derfor hverken på i dag eller i linjen om de andre dage;
       den linje tæller ARBEJDE, ikke historik.

       Prøven går den vej, et menneske ville gå, når det, der blev
       hentet op, ikke er dagens: "📚 Alle dage". Rækken er
       tilbage, og den står under det færdige. */
    await page.locator('[data-panel="p-bestillinger"]').click();
    await page.locator('#bestil-dage').getByRole('button', { name: '📚 Alle dage' }).click();
    await expect(page.locator('#bestillinger-liste .bestil-kort')).toContainText('Anna Vind');

    expect((await gemteData(page)).bestillinger[0].slettet).toBeFalsy();
  });

  test('"Slet for altid" er for altid', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({ bestillinger: [bestilling({ slettet: slettetFor(2) })] }),
    });
    await page.locator('[data-panel="p-historik"]').click();

    page.once('dialog', (d) => d.accept());
    await page.locator('#skrald-liste').getByRole('button', { name: 'Slet for altid' }).click();

    await expect(page.locator('#skrald-liste .bestil-kort')).toHaveCount(0);
    expect(((await gemteData(page)).bestillinger || []).length).toBe(0);
  });

  test('kortet siger hvor mange dage der er tilbage', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({ bestillinger: [bestilling({ slettet: slettetFor(28) })] }),
    });
    await page.locator('[data-panel="p-historik"]').click();
    await expect(page.locator('#skrald-liste .bestil-kort'))
      .toContainText('Slettes om 2 dage');
  });

  test('en tom spand siger det med ord', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bestillinger: [bestilling()] }) });
    await page.locator('[data-panel="p-historik"]').click();
    await expect(page.locator('#skrald-liste')).toContainText('tom');
  });

  /* Fanen må IKKE have et tal på. Et mærke betyder "her venter
     noget, du skal handle på", og spanden er det modsatte: et
     sted, man går hen, når man har lavet en fejl. */
  test('fanen har ikke et tal på', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({ bestillinger: [bestilling({ slettet: slettetFor(1) })] }),
    });
    await expect(page.locator('[data-panel="p-historik"] .badge')).toHaveCount(0);
  });
});

test.describe('Det, der ligger i spanden, spærrer ikke', () => {

  /* DEN VIGTIGSTE PRØVE. Uden den ville gæsten få "du har
     allerede sendt den her" på grund af en række, hverken gæsten
     eller personalet kan se.

     Gæsten sender, personalet smider ud, gæsten sender igen. Det
     midterste skridt sker direkte i browserens gemte data og ikke
     gennem admin: at personalets Slet lander i spanden er målt
     ovenfor, og turen gennem to sider ville kun gøre den her prøve
     langsommere og mere skrøbelig — ikke mere sand. */
  test('gæsten kan sende præcis den samme igen', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: I_DAG });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    await sendEnBestilling(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();

    // Personalet smider den ud.
    await page.evaluate((n) => {
      const d = JSON.parse(localStorage.getItem(n));
      d.bestillinger[0].slettet = new Date().toISOString();
      localStorage.setItem(n, JSON.stringify(d));
    }, NØGLE);

    await page.locator('#bestil-tak button', { hasText: 'Bestil noget mere' }).click();
    await sendEnBestilling(page);

    await expect(page.locator('#bestil-fejl')).toBeHidden();
    await expect(page.locator('#bestil-tak')).toBeVisible();
    expect((await gemteData(page)).bestillinger.length).toBe(2);
  });

  /* Og reglen skal stadig gælde det, den er skrevet til: to
     LEVENDE ens bestillinger er stadig et dobbelttryk. */
  test('dobbelttrykket bliver stadig afvist', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: I_DAG });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    await sendEnBestilling(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();

    await page.locator('#bestil-tak button', { hasText: 'Bestil noget mere' }).click();
    await sendEnBestilling(page);

    /* Fejlen lander i KIGGETS egen boks og ikke i formularens.
       Gæsten trykkede send inde i kigget, og svaret skal stå ved
       den knap, hun trykkede på — ikke 500 px længere oppe i en
       formular, hun ikke kan se. */
    await expect(page.locator('#kig-fejl')).toContainText('allerede sendt');
  });

  /* En bekræftet udlejning i spanden må ikke holde dagen. Gjorde
     den det, ville lokalet være optaget for evigt af noget, ingen
     kan se — og ingen ville kunne forklare hvorfor. */
  test('en bekræftet udlejning i spanden frigiver dagen igen', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [
          udlejning({ id: 1, status: 'bekraeftet', navn: 'Anna Vind',
            slettet: slettetFor(1) }),
          udlejning({ id: 2, reference: 'BL260807-BBBBB', telefon: '30405060',
            navn: 'Ole Berg' }),
        ],
      }),
    });
    await page.locator('[data-panel="p-lokale"]').click();

    /* Køen er sit eget kort siden 27/8 — se noten øverst i
       js/admin/udlejning.js. Den slettede står ikke i den. */
    const kort = page.locator('#lokale-venter .bestil-kort');
    await expect(kort).toHaveCount(1);
    await expect(kort).not.toContainText('allerede lejet ud');

    page.once('dialog', (d) => d.accept());
    await kort.getByRole('button', { name: 'Lej lokalet ud' }).click();

    /* .maerke er to ting nu (slags + status), så vælg statussen. */
    await expect(page.locator('#lokale-lejet .bestil-kort .maerke.m-bekraeftet'))
      .toContainText('Lejet ud');
  });

  /* Og reglen skal stadig gælde det, den er skrevet til. */
  test('to LEVENDE ja på samme dag er stadig umuligt', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [
          udlejning({ id: 1, status: 'bekraeftet', navn: 'Anna Vind' }),
          udlejning({ id: 2, reference: 'BL260807-BBBBB', telefon: '30405060',
            navn: 'Ole Berg' }),
        ],
      }),
    });
    await page.locator('[data-panel="p-lokale"]').click();

    const nyKort = page.locator('#lokale-venter .bestil-kort.b-ny');
    await expect(nyKort).toContainText('Dagen er allerede lejet ud til Anna Vind');
  });
});

test.describe('Fortryd kan afvises, og beskeden siger hvorfor', () => {

  test('den samme er sendt igen imens', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        bestillinger: [
          bestilling({ id: 1, slettet: slettetFor(1) }),
          // Præcis samme telefon, dag og tid — gæsten sendte igen.
          bestilling({ id: 2, reference: 'SM260807-BBBBB', status: 'ny' }),
        ],
      }),
    });
    await page.locator('[data-panel="p-historik"]').click();
    await page.locator('#skrald-liste').getByRole('button', { name: 'Hent tilbage' }).click();

    await expect(page.locator('#fejl')).toContainText('sendt præcis den samme igen');
    // Og den bliver liggende i spanden.
    await expect(page.locator('#skrald-liste .bestil-kort')).toHaveCount(1);
  });

  test('lokalet er lejet ud til en anden imens', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [
          udlejning({ id: 1, status: 'bekraeftet', navn: 'Anna Vind',
            slettet: slettetFor(1) }),
          udlejning({ id: 2, reference: 'BL260807-BBBBB', telefon: '30405060',
            navn: 'Ole Berg', status: 'bekraeftet' }),
        ],
      }),
    });
    await page.locator('[data-panel="p-historik"]').click();
    await page.locator('#skrald-liste').getByRole('button', { name: 'Hent tilbage' }).click();

    await expect(page.locator('#fejl')).toContainText('ét ja pr. dag');
  });
});

test.describe('Spanden tømmer sig selv', () => {

  test('det, der er ældre end 30 dage, er væk ved login', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        bestillinger: [
          bestilling({ id: 1, slettet: slettetFor(31) }),
          bestilling({ id: 2, reference: 'SM260807-BBBBB', hent_tid: '13:00',
            slettet: slettetFor(29) }),
        ],
      }),
    });
    await page.locator('[data-panel="p-historik"]').click();

    const kort = page.locator('#skrald-liste .bestil-kort');
    await expect(kort).toHaveCount(1);
    await expect(kort).toContainText('SM260807-BBBBB');

    /* Og den gamle er væk af databasen, ikke bare af skærmen. En
       spand, der aldrig tømmes, er et arkiv over kunders
       telefonnumre. */
    const gemt = await gemteData(page);
    expect(gemt.bestillinger.length).toBe(1);
    expect(gemt.bestillinger[0].id).toBe(2);
  });

  test('det levende bliver aldrig ryddet op', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        bestillinger: [bestilling({ id: 1, oprettet: '2026-01-01T09:00:00Z' })],
      }),
    });
    await page.locator('[data-panel="p-historik"]').click();
    expect((await gemteData(page)).bestillinger.length).toBe(1);
  });
});

test.describe('Alle fire slags kan ligge i spanden', () => {

  test('bordbooking, forespørgsel og baglokale står med hver sit navn', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        bordbestillinger: [{
          id: 1, lokation_id: 'mosede', reference: 'BO260807-AAAAA',
          navn: 'Bo Bord', telefon: '11223344', dato: '2026-08-20',
          tid: '18:00', antal_personer: 4, besked: null, status: 'afvist',
          intern_note: null, oprettet: '2026-08-07T10:00:00Z',
          slettet: slettetFor(1),
        }],
        forespoergsler: [{
          id: 1, lokation_id: 'mosede', reference: 'FO260807-AAAAA',
          type: 'catering', navn: 'Fie Fest', telefon: '55667788', email: null,
          dato: '2026-09-12', antal_personer: 40, besked: null,
          status: 'afvist', intern_note: null, oprettet: '2026-08-07T10:10:00Z',
          slettet: slettetFor(1),
        }],
        udlejninger: [udlejning({ navn: 'Ulla Udlejning', status: 'afvist',
          slettet: slettetFor(1) })],
      }),
    });
    await page.locator('[data-panel="p-historik"]').click();

    const spand = page.locator('#skrald-liste');
    await expect(spand.locator('.bestil-kort')).toHaveCount(3);
    await expect(spand).toContainText('Bordbooking');
    await expect(spand).toContainText('Forespørgsel');
    await expect(spand).toContainText('Baglokalet');
    await expect(spand).toContainText('Bo Bord');
    await expect(spand).toContainText('Fie Fest');
    await expect(spand).toContainText('Ulla Udlejning');
  });
});
