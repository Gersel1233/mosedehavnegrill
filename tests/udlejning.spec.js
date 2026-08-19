/* Udlejningen af baglokalet (fase 5): som bordene, men lokalet er
   ET lokale — ét ja optager hele dagen.

   Det vigtigste, filen måler, er netop dét: at admin ikke kan leje
   lokalet ud to gange samme dag, og at advarslen står PÅ kortet,
   FØR der trykkes. Databasens egen håndhævelse (det delvist unikke
   indeks) er bevist for sig i supabase/proev-udlejning.sql — her
   måles øvetilstandens spejl af samme regel, for opfører øvelsen
   sig anderledes end det rigtige, er den ikke en øvelse. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

/* Uret i åbn() står på fredag 7. august 2026. */

const udlejning = (æ) => ({
  id: 1, lokation_id: 'mosede', reference: 'BL260807-AAAAA',
  navn: 'Anna Vind', telefon: '20304050', email: null,
  dato: '2026-08-22', antal_personer: 30,
  besked: null, status: 'ny', intern_note: null,
  oprettet: '2026-08-07T10:30:00Z', ...æ,
});

test.describe('Gæsten spørger om lokalet', () => {

  test('et ønske kan sendes, og kvitteringen lover IKKE lokalet', async ({ page }) => {
    await åbn(page, '/baglokale/');
    await page.locator('#lokale-dato').fill('2026-08-22');
    await page.locator('#lokale-antal').fill('30');
    await page.locator('#lokale-navn').fill('Anna Vind');
    await page.locator('#lokale-telefon').fill('20304050');
    await page.locator('#lokale-send').click();

    const tak = page.locator('#lokale-tak');
    await expect(tak).toBeVisible();
    /* Sidens vigtigste sætning: der kan kun være ét ja pr. dag,
       og det gives ikke af en formular. */
    await expect(tak).toContainText('IKKE lejet');
    await expect(tak).toContainText('20304050');
    await expect(tak).toContainText('Lørdag 22. august');

    const gemt = await gemteData(page);
    expect(gemt.udlejninger.length).toBe(1);
    expect(gemt.udlejninger[0].status, 'gæsten må ikke kunne sætte status').toBe('ny');
    expect(gemt.udlejninger[0].reference).toMatch(/^BL/);
  });

  test('uden dato bliver der ikke sendt noget', async ({ page }) => {
    /* "Engang til foråret" er en FORESPØRGSEL, og det link står i
       formularen. Et udlejningsønske uden dag kan personalet ikke
       svare på. */
    await åbn(page, '/baglokale/');
    await page.locator('#lokale-navn').fill('Anna Vind');
    await page.locator('#lokale-telefon').fill('20304050');
    await page.locator('#lokale-send').click();

    await expect(page.locator('#fejl-dato')).toBeVisible();
    expect(((await gemteData(page)).udlejninger || []).length).toBe(0);
  });

  test('en dag, der er gået, bliver afvist', async ({ page }) => {
    await åbn(page, '/baglokale/');
    await page.locator('#lokale-dato').fill('2026-08-01');
    await page.locator('#lokale-navn').fill('Anna Vind');
    await page.locator('#lokale-telefon').fill('20304050');
    await page.locator('#lokale-send').click();

    await expect(page.locator('#fejl-dato')).toContainText('gået');
    expect(((await gemteData(page)).udlejninger || []).length).toBe(0);
  });

  test('formularen peger på forespørgslen, hvis datoen ikke kendes', async ({ page }) => {
    await åbn(page, '/baglokale/');
    await expect(page.locator('#lokale-form a[href="../selskaber/?type=baglokale"]'))
      .toBeVisible();
  });
});

test.describe('Personalet lejer ud — og kun én gang pr. dag', () => {

  test('fanen viser ønsket, og et ja kræver et opkald', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ udlejninger: [udlejning()] }) });
    await page.locator('[data-panel="p-lokale"]').click();

    const kort = page.locator('#lokale-liste .bestil-kort');
    await expect(kort).toHaveCount(1);
    await expect(kort).toContainText('Anna Vind');
    await expect(kort).toContainText('30 personer');
    await expect(page.locator('#lokale-antal-maerke')).toHaveText('1');

    let besked = null;
    page.once('dialog', (d) => { besked = d.message(); d.accept(); });
    await kort.getByRole('button', { name: 'Lej lokalet ud' }).click();

    await expect(kort.locator('.maerke')).toContainText('Lejet ud');
    expect(besked).toContain('20304050');
    expect(besked).toContain('ét ja pr. dag');
  });

  /* FASENS REGEL. Advarslen skal stå på kortet FØR der trykkes —
     en advarsel efter et opkald til gæsten er en pinlig samtale
     for sent — og trykkes der alligevel, siger systemet nej. */
  test('dagen kan ikke lejes ud to gange', async ({ page }) => {
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

    const nyKort = page.locator('#lokale-liste .bestil-kort.b-ny');
    await expect(nyKort).toContainText('Dagen er allerede lejet ud til Anna Vind');

    page.once('dialog', (d) => d.accept());
    await nyKort.getByRole('button', { name: 'Lej lokalet ud' }).click();

    /* Afvisningen kommer fra samme regel som databasens indeks:
       ønsket forbliver Ny, og fejlen siger hvorfor. */
    await expect(page.locator('#fejl')).toContainText('ét ja pr. dag');
    await expect(page.locator('#lokale-liste .bestil-kort.b-ny .maerke').first())
      .toContainText('Ny');
  });

  test('et nej frigiver dagen igen', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [
          udlejning({ id: 1, status: 'afvist', navn: 'Anna Vind' }),
          udlejning({ id: 2, reference: 'BL260807-BBBBB', telefon: '30405060',
            navn: 'Ole Berg' }),
        ],
      }),
    });
    await page.locator('[data-panel="p-lokale"]').click();

    const nyKort = page.locator('#lokale-liste .bestil-kort.b-ny');
    await expect(nyKort).not.toContainText('allerede lejet ud');

    page.once('dialog', (d) => d.accept());
    await nyKort.getByRole('button', { name: 'Lej lokalet ud' }).click();
    /* Efter ja'et skifter kortet klasse, så det findes på navnet. */
    await expect(page.locator('#lokale-liste .bestil-kort', { hasText: 'Ole Berg' })
      .locator('.maerke')).toContainText('Lejet ud');
  });

  test('lokalets kalender kender også selskabsfanens forespørgsler', async ({ page }) => {
    /* En baglokale-forespørgsel med dato kom ind ad selskabssiden.
       Ja'et til en udlejning skal gives med HELE billedet foran
       sig — ellers lover telefonen noget, kalenderen ikke ved. */
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [udlejning({ status: 'bekraeftet' })],
        forespoergsler: [{
          id: 9, lokation_id: 'mosede', reference: 'FO260807-CCCCC',
          type: 'baglokale', navn: 'Mette Lund', telefon: '40506070',
          email: null, dato: '2026-08-29', antal_personer: 20, besked: null,
          status: 'ny', intern_note: null, oprettet: '2026-08-07T09:00:00Z',
        }],
      }),
    });
    await page.locator('[data-panel="p-lokale"]').click();

    const kal = page.locator('#lokale-kalender');
    await expect(kal).toContainText('LEJET UD til Anna Vind');
    await expect(kal).toContainText('1 forespørgsel på selskabsfanen');
  });

  test('baglokalet står i Overblik under lige modtaget', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ udlejninger: [udlejning()] }) });
    const nyt = page.locator('#overblik-nyt');
    await expect(nyt).toContainText('Anna Vind');
    await expect(nyt).toContainText('Baglokalet · 30 personer');
    await expect(nyt).toContainText('Åbn baglokalet');
  });
});
