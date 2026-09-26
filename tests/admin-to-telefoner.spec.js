/* ============================================================
   TO TELEFONER, ÉN BESTILLING  (26/9)
   ------------------------------------------------------------
   Gennemgangen af admin fandt det i koden: en note blev gemt med den
   status, SKÆRMEN havde, da kortet blev tegnet — og en statusknap
   sendte notefeltets tekst med, også når ingen havde rørt den. To
   telefoner i køkkenet kunne derfor:
   · genåbne en færdig bestilling med en note (den faldt ud af Salg)
   · slette en note, der lige var skrevet, med et tryk på "Færdig"

   "Den anden telefon" er her en ændring direkte i de gemte data,
   efter kortet er tegnet — præcis det, skærmen ikke ved.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane, NØGLE } = require('./hjaelp');

const I_DAG = '2026-08-07';

function data() {
  const d = grunddata();
  d.bestillinger = [{
    id: 2, lokation_id: 'mosede', reference: 'SM-B-2', navn: 'Jonas Berg',
    telefon: '20304052', email: null, hent_dato: I_DAG, hent_tid: '13:00',
    linjer: [{ navn: 'Fiskefilet', antal: 3, pris: 75 }], fyld: [], antal: 3,
    besked: null, status: 'bekraeftet', hvordan: 'afhentning',
    leverings_adresse: null, intern_note: null, slettet: null,
    oprettet: '2026-08-07T10:00:00Z',
  }];
  return d;
}

async function denAndenTelefon(page, ændring) {
  await page.evaluate(([n, æ]) => {
    const d = JSON.parse(localStorage.getItem(n));
    d.bestillinger = d.bestillinger.map((b) => (b.id === 2 ? Object.assign({}, b, æ) : b));
    localStorage.setItem(n, JSON.stringify(d));
  }, [NØGLE, ændring]);
}

const nr2 = async (page) => (await gemteData(page)).bestillinger.find((b) => b.id === 2);

test.describe('To telefoner, én bestilling', () => {
  test.beforeEach(async ({ page }) => {
    await åbnAdmin(page, { data: data() });
    await visFane(page, 'p-bestillinger');
    await expect(page.locator('[data-id="2"]').first()).toBeAttached();
  });

  test('en note genåbner ikke en bestilling, køkkenet har gjort færdig', async ({ page }) => {
    await denAndenTelefon(page, { status: 'afhentet' });
    await page.locator('#note-2').evaluate((e) => {
      e.value = 'Ringet — kommer 13.15';
      e.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect.poll(async () => (await nr2(page)).intern_note).toBe('Ringet — kommer 13.15');
    expect((await nr2(page)).status, 'noten satte bestillingen tilbage til skærmens status').toBe('afhentet');
  });

  test('"Færdig" sletter ikke en note, der er skrevet på en anden telefon', async ({ page }) => {
    await denAndenTelefon(page, { intern_note: 'Allergi: nødder — spurgt i køkkenet' });
    await page.locator('[data-id="2"] button', { hasText: 'Færdig' }).first().click();
    await expect.poll(async () => (await nr2(page)).status).not.toBe('bekraeftet');
    expect((await nr2(page)).intern_note, 'knappen skrev det tomme notefelt hen over noten')
      .toBe('Allergi: nødder — spurgt i køkkenet');
  });

  test('men skriver man selv en note og trykker "Færdig", gemmes begge dele', async ({ page }) => {
    /* Modstykket: ellers ville en regel, der ALDRIG sendte noten,
       bestå de to prøver ovenfor. */
    await page.locator('#note-2').evaluate((e) => { e.value = 'Hentet af svigersøn'; });
    await page.locator('[data-id="2"] button', { hasText: 'Færdig' }).first().click();
    await expect.poll(async () => (await nr2(page)).status).not.toBe('bekraeftet');
    expect((await nr2(page)).intern_note).toBe('Hentet af svigersøn');
  });
});
