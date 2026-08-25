/* NYHEDER, DER TÆNDER OG SLUKKER SIG SELV

   "Live musik på molen · lørdag 22. august" skal væk om søndagen.
   Uden datoer skal NOGEN huske det — og det er den slags, ingen
   husker, når der er travlt. En nyhed om en fredag, der stadig
   står i november, får gæsten til at holde op med at læse
   nyhederne overhovedet.

   TOM BETYDER ALTID: alt det, der allerede står, bliver stående.

   Reglen står ÉT sted — Butik.nyhedSynlig — så forsiden,
   nyhedssiden og admin ikke kan blive uenige om, hvad gæsten ser.

   ⚠️ Kræver supabase/nyheder-fra-til.sql kørt (7 × BESTOD lokalt).

   Uret i åbnAdmin står på fredag den 7. august 2026. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

const I_DAG = '2026-08-07';

function nyhed(æ) {
  return Object.assign({
    id: 1, lokation_id: 'mosede', titel: 'Friske rødspætter',
    tekst: 'Hele ugen, mens de er der.', dato: '2026-08-05',
    aktiv: true, vis_fra: null, vis_til: null,
    oprettet: '2026-08-05T09:00:00Z',
  }, æ);
}

async function nyhedsfanen(page, nyheder) {
  await åbnAdmin(page, { data: grunddata({ nyheder: nyheder }) });
  await page.locator('[data-panel="p-nyheder"]').click();
}

test.describe('Vinduet i admin', () => {

  test('en nyhed uden datoer står som "vises nu"', async ({ page }) => {
    await nyhedsfanen(page, [nyhed()]);
    await expect(page.locator('#nyheder-liste')).toContainText('Vises nu');
  });

  test('en nyhed, der endnu ikke er begyndt, står som "venter"', async ({ page }) => {
    await nyhedsfanen(page, [nyhed({ vis_fra: '2026-08-20' })]);
    await expect(page.locator('#nyheder-liste')).toContainText('Venter');
    await expect(page.locator('#nyheder-liste')).toContainText('20. august');
  });

  /* DEN VIGTIGSTE AF DE FIRE. Uden ordet "udløbet" skal ejeren
     åbne hjemmesiden for at finde ud af, om nyheden stadig står
     der — og "hvorfor kan jeg ikke se den?" er så et opkald. */
  test('en udløbet nyhed siger det, i stedet for bare at være væk', async ({ page }) => {
    await nyhedsfanen(page, [nyhed({ vis_til: '2026-08-01' })]);
    await expect(page.locator('#nyheder-liste')).toContainText('Udløbet');
    await expect(page.locator('#nyheder-liste')).toContainText('1. august');
  });

  test('datoerne kan sættes på en nyhed, der allerede står der', async ({ page }) => {
    await nyhedsfanen(page, [nyhed()]);
    await page.locator('#nyheder-liste input[type="date"]').nth(1).fill('2026-08-22');
    await page.locator('#nyheder-liste button', { hasText: 'Gem datoer' }).click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const gemt = await gemteData(page);
    expect(gemt.nyheder[0].vis_til).toBe('2026-08-22');
  });

  test('en nyhed kan lægges ind med et vindue med det samme', async ({ page }) => {
    await nyhedsfanen(page, []);
    await page.locator('#ny-titel').fill('Live musik på molen');
    await page.locator('#ny-tekst').fill('Lørdag aften.');
    await page.locator('#ny-til').fill('2026-08-22');
    await page.locator('#tilfoej-nyhed').click();
    await expect(page.locator('#kvittering')).toContainText('22. august');

    const gemt = await gemteData(page);
    expect(gemt.nyheder[0].vis_til).toBe('2026-08-22');
    expect(gemt.nyheder[0].vis_fra).toBe(null);
  });

  test('et baglæns vindue bliver afvist', async ({ page }) => {
    /* Samme regel som nyhed_vindue_ok i databasen. En nyhed, der
       slutter før den begynder, er ikke farlig — den er bare
       usynlig, og så leder nogen efter en fejl i koden. */
    await nyhedsfanen(page, []);
    await page.locator('#ny-titel').fill('Baglæns');
    await page.locator('#ny-tekst').fill('Slutter før den begynder.');
    await page.locator('#ny-fra').fill('2026-08-20');
    await page.locator('#ny-til').fill('2026-08-10');
    await page.locator('#tilfoej-nyhed').click();
    await expect(page.locator('#fejl')).toContainText('ligger før');

    const gemt = await gemteData(page);
    expect(gemt.nyheder || []).toHaveLength(0);
  });
});

test.describe('Vinduet på gæstesiden', () => {

  /* Reglen står ét sted, men den skal virke ALLE de steder,
     nyhederne læses: den nye forside, den gamle forside og
     nyhedssiden. Tre kopier af filteret ville langsomt komme til
     at vise tre forskellige ting. */
  test('forsiden viser ikke en udløbet nyhed', async ({ page }) => {
    const d = grunddata({
      nyheder: [
        nyhed({ id: 1, titel: 'Skal væk', vis_til: '2026-08-01' }),
        nyhed({ id: 2, titel: 'Skal blive', dato: '2026-08-06' }),
      ],
    });
    await åbnSkal(page, '/index.html', { ur: I_DAG + 'T11:00:00Z', data: d });

    const afsnit = page.locator('#nyheder');
    await expect(afsnit).toContainText('Skal blive');
    await expect(afsnit).not.toContainText('Skal væk');
  });

  test('forsiden viser ikke en nyhed, der først begynder senere', async ({ page }) => {
    const d = grunddata({
      nyheder: [
        nyhed({ id: 1, titel: 'Kommer senere', vis_fra: '2026-09-01' }),
        nyhed({ id: 2, titel: 'Er her nu', dato: '2026-08-06' }),
      ],
    });
    await åbnSkal(page, '/index.html', { ur: I_DAG + 'T11:00:00Z', data: d });
    await expect(page.locator('#nyheder')).toContainText('Er her nu');
    await expect(page.locator('#nyheder')).not.toContainText('Kommer senere');
  });

  test('nyhedssiden følger den samme regel', async ({ page }) => {
    const d = grunddata({
      nyheder: [
        nyhed({ id: 1, titel: 'Udløbet nyhed', vis_til: '2026-08-01' }),
        nyhed({ id: 2, titel: 'Gyldig nyhed', dato: '2026-08-06' }),
      ],
    });
    await åbn(page, '/nyheder/', { ur: I_DAG + 'T11:00:00Z', data: d });
    await expect(page.locator('body')).toContainText('Gyldig nyhed');
    await expect(page.locator('body')).not.toContainText('Udløbet nyhed');
  });

  /* EN NYHED, DER GÆLDER PRÆCIS I DAG, SKAL VISES. Grænserne er
     med — et > i stedet for >= ville slukke "Live musik i dag"
     præcis den dag, den handler om. */
  test('en nyhed, der slutter I DAG, står der stadig', async ({ page }) => {
    const d = grunddata({
      nyheder: [nyhed({ titel: 'Sidste dag', vis_fra: I_DAG, vis_til: I_DAG })],
    });
    await åbnSkal(page, '/index.html', { ur: I_DAG + 'T11:00:00Z', data: d });
    await expect(page.locator('#nyheder')).toContainText('Sidste dag');
  });
});
