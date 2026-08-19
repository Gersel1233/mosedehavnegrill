/* Bordbestillingen (fase 4): gæsten spørger, personalet bekræfter.

   Det vigtigste, filen måler, er LØFTERNE: at formularen ikke kan
   spørge om et bord på en lukkedag, at en tidlig lukning skærer
   aftenens tider af, og at kvitteringen siger højt, at bordet IKKE
   er bekræftet endnu. Databasens egne regler (gæst må skrive, ikke
   læse; bremsen) er bevist for sig i supabase/proev-borde.sql. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

/* Uret i åbn() står på fredag 7. august 2026 kl. 13.00 dansk tid.
   Grunddataene holder åbent 11-21 alle dage. */

const bordønske = (æ) => ({
  id: 1, lokation_id: 'mosede', reference: 'BO260807-AAAAA',
  navn: 'Familien Vind', telefon: '20304050', email: null,
  dato: '2026-08-08', tid: '18:00', antal_personer: 4,
  besked: null, status: 'ny', intern_note: null,
  oprettet: '2026-08-07T10:30:00Z', ...æ,
});

test.describe('Gæsten spørger om et bord', () => {

  test('dagene og tiderne kommer fra åbningstiderne', async ({ page }) => {
    await åbn(page, '/bord/');
    await expect(page.locator('#bord-dage .dag').first()).toBeVisible();
    await expect(page.locator('#bord-dage .dag').first()).toContainText('I dag');

    /* Klokken er 13, og varslet er to timer: første tid i dag er
       15.00 — ikke 11.00, som var åbningstiden. Sidste er 20.30,
       en halv time før der lukkes. */
    const tider = await page.locator('#bord-tid option').allTextContents();
    expect(tider[0]).toBe('kl. 15.00');
    expect(tider[tider.length - 1]).toBe('kl. 20.30');
  });

  test('en lukkedag kan ikke vælges', async ({ page }) => {
    await åbn(page, '/bord/', {
      data: grunddata({
        kalender: [{
          id: 1, lokation_id: 'mosede', type: 'lukkedag', titel: 'Privatfest',
          dato: '2026-08-08', slut_dato: null, lukker_kl: null, offentlig: false,
        }],
      }),
    });
    const datoer = await page.locator('#bord-dage .dag .dag-dato').allTextContents();
    expect(datoer, 'lørdag den 8. er lukket og må ikke stå der')
      .not.toContain('8. aug.');
    expect(datoer).toContain('9. aug.');
  });

  test('en tidlig lukning skærer aftenens tider af', async ({ page }) => {
    await åbn(page, '/bord/', {
      data: grunddata({
        kalender: [{
          id: 1, lokation_id: 'mosede', type: 'tidlig_lukning', titel: 'Lukker tidligt',
          dato: '2026-08-08', slut_dato: null, lukker_kl: '15:00', offentlig: false,
        }],
      }),
    });
    await page.locator('#bord-dage .dag')
      .filter({ has: page.getByText('8. aug.', { exact: true }) }).click();
    const tider = await page.locator('#bord-tid option').allTextContents();
    expect(tider[tider.length - 1],
      'lukker lugen 15, kan man ikke få bord 19.30').toBe('kl. 14.30');
  });

  /* Samme regel fandtes IKKE på smørrebrødssiden, og det var en
     rigtig fejl: forsiden vidste, at der lukkedes tidligt, men
     formularen solgte afhentning kl. 19. Fundet, da bordformularen
     fik reglen — og nu målt begge steder. */
  test('smørrebrødssiden respekterer også en tidlig lukning', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/', {
      data: grunddata({
        kalender: [{
          id: 1, lokation_id: 'mosede', type: 'tidlig_lukning', titel: 'Lukker tidligt',
          dato: '2026-08-10', slut_dato: null, lukker_kl: '15:00', offentlig: false,
        }],
      }),
    });
    /* Dagvælgeren findes først, når der er noget i kurven — testen
       går den vej, et menneske går, og lægger ét stykke i. */
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await page.locator('#bestil-stykker .stk-linje').first()
      .locator('button', { hasText: '+' }).click();

    await page.locator('#bestil-dage .dag')
      .filter({ has: page.getByText('10. aug.', { exact: true }) }).click();
    const tider = await page.locator('#bestil-tid option').allTextContents();
    expect(tider[tider.length - 1]).toBe('kl. 14.30');
  });

  test('et bord kan sendes, og kvitteringen lover IKKE bordet', async ({ page }) => {
    await åbn(page, '/bord/');
    await page.locator('#bord-antal').fill('4');
    await page.locator('#bord-navn').fill('Familien Vind');
    await page.locator('#bord-telefon').fill('20304050');
    await page.locator('#bord-send').click();

    const tak = page.locator('#bord-tak');
    await expect(tak).toBeVisible();
    /* Det her er sidens vigtigste sætning: uden den møder familien
       op til et bord, der ikke findes. */
    await expect(tak).toContainText('IKKE bekræftet');
    await expect(tak).toContainText('20304050');
    await expect(tak).toContainText('Reference');

    const gemt = await gemteData(page);
    expect(gemt.bordbestillinger.length).toBe(1);
    expect(gemt.bordbestillinger[0].status, 'gæsten må ikke kunne sætte status')
      .toBe('ny');
    expect(gemt.bordbestillinger[0].reference).toMatch(/^BO/);
  });

  test('uden antal bliver der ikke sendt noget', async ({ page }) => {
    await åbn(page, '/bord/');
    await page.locator('#bord-navn').fill('Familien Vind');
    await page.locator('#bord-telefon').fill('20304050');
    await page.locator('#bord-send').click();

    await expect(page.locator('#fejl-antal')).toBeVisible();
    const gemt = await gemteData(page);
    expect((gemt.bordbestillinger || []).length).toBe(0);
  });

  test('over 100 sendes videre til selskaber i stedet', async ({ page }) => {
    await åbn(page, '/bord/');
    await page.locator('#bord-antal').fill('120');
    await page.locator('#bord-navn').fill('Foreningen');
    await page.locator('#bord-telefon').fill('20304050');
    await page.locator('#bord-send').click();

    await expect(page.locator('#fejl-antal')).toContainText('selskab');
    expect(((await gemteData(page)).bordbestillinger || []).length).toBe(0);
  });

  test('siden nævner hverken pris eller pladser', async ({ page }) => {
    /* Pladstallet er personalets arbejdsredskab i admin. Gæsten
       skal ikke se "40 pladser" — det er ikke et løfte, ejeren har
       givet. */
    await åbn(page, '/bord/');
    const tekst = await page.locator('main').innerText();
    expect(tekst).not.toMatch(/\d+\s*kr/i);
    expect(tekst).not.toMatch(/\d+\s*pladser/i);
  });
});

test.describe('Personalet bekræfter', () => {

  test('fanen viser ønsket, og et ja kræver et opkald', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bordbestillinger: [bordønske()] }) });
    await page.locator('[data-panel="p-borde"]').click();

    const kort = page.locator('#borde-liste .bestil-kort');
    await expect(kort).toHaveCount(1);
    await expect(kort).toContainText('Familien Vind');
    await expect(kort).toContainText('4 personer');
    await expect(page.locator('#borde-antal')).toHaveText('1');

    /* Bekræftelsen nævner telefonnummeret: gæstens kvittering
       siger "vent på opkaldet", så ja'et OG opkaldet hører sammen. */
    let besked = null;
    page.once('dialog', (d) => { besked = d.message(); d.accept(); });
    await kort.getByRole('button', { name: 'Bekræft bordet' }).click();

    await expect(kort.locator('.maerke')).toContainText('Bekræftet');
    expect(besked).toContain('20304050');
    await expect(page.locator('#borde-antal')).toBeHidden();
  });

  test('dagens billede lægger ja\'erne sammen mod pladserne', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        indstillinger: { ...grunddata().indstillinger, bord_pladser: 40 },
        bordbestillinger: [
          bordønske({ id: 1, status: 'bekraeftet', antal_personer: 24 }),
          bordønske({ id: 2, reference: 'BO260807-BBBBB', telefon: '30405060',
            tid: '19:00', antal_personer: 4 }),
        ],
      }),
    });
    await page.locator('[data-panel="p-borde"]').click();

    const billede = page.locator('#borde-billede');
    await expect(billede).toContainText('24 af 40 pladser sagt ja til');
    await expect(billede).toContainText('1 ønske venter');
  });

  test('et afvist ønske tæller ikke med i billedet', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        indstillinger: { ...grunddata().indstillinger, bord_pladser: 40 },
        bordbestillinger: [bordønske({ status: 'afvist', antal_personer: 30 })],
      }),
    });
    await page.locator('[data-panel="p-borde"]').click();
    await expect(page.locator('#borde-billede')).not.toContainText('30');
  });

  test('bordet står også i Overblik under lige modtaget', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bordbestillinger: [bordønske()] }) });
    const nyt = page.locator('#overblik-nyt');
    await expect(nyt).toContainText('Familien Vind');
    await expect(nyt).toContainText('Bord · 4 personer');
    await expect(nyt).toContainText('Åbn bordene');
  });
});
