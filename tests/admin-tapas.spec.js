/* Tapasfadet skal SES i admin.

   Ejerens ord (23/8): tapas skal kunne bestilles to dage i
   forvejen, gæsten skal kunne ringe om fadets indhold — og
   bestillingen skal markeres anderledes inde i admin.

   Grunden er praktisk: et fad til tolv er ikke en pose, der
   rækkes ud af lugen. Står den som en almindelig bestilling
   mellem tredive andre, opdager køkkenet den, når der er to timer
   til — og så er de to dages varsel spildt. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata } = require('./hjaelp');

function medTapas() {
  const d = grunddata();
  const b = (id, tid, navn, linjer) => ({
    id, lokation_id: 'mosede', reference: 'SM-T-' + id, navn, telefon: '2030405' + id,
    email: null, hent_dato: '2026-08-07', hent_tid: tid,
    linjer, fyld: [], antal: linjer.reduce((s, l) => s + l.antal, 0),
    besked: null, status: 'ny', hvordan: 'afhentning', leverings_adresse: null,
    intern_note: null, slettet: null, oprettet: '2026-08-07T09:00:00.000Z',
  });

  d.bestillinger = [
    b(1, '17:00', 'Sara Dam', [
      { navn: 'Tapasfad, pr. person', antal: 8, pris: 145 },
      { navn: 'Cava, flaske', antal: 2, pris: 295 },
    ]),
    b(2, '17:30', 'Jonas Berg', [{ navn: 'Flæskestegssandwich', antal: 2, pris: 89 }]),
  ];
  return d;
}

test.describe('Tapas i admin', () => {
  test('tapasbestillingen får sit eget mærke på Bestillinger', async ({ page }) => {
    await åbnAdmin(page, { data: medTapas() });
    await page.locator('[data-panel="p-bestillinger"]').click();

    const tapas = page.locator('.bestil-kort[data-id="1"]');
    await expect(tapas.locator('.maerke.m-tapas')).toHaveText('🧀 Tapasfad');

    // Og den almindelige bestilling får det IKKE — ellers betyder
    // mærket ingenting
    await expect(page.locator('.bestil-kort[data-id="2"] .maerke.m-tapas')).toHaveCount(0);
  });

  test('mærket står også på vagtskærmen', async ({ page }) => {
    await åbnAdmin(page, { data: medTapas() });

    /* Uret står fredag kl. 13.00, og Sara henter kl. 17 — altså
       under "Senere i dag". De to grupper ligger i den SAMME
       liste nu (26/8), så der måles på hele forløbet. Mærket skal
       stå dér, hvor køkkenet kigger. */
    const raekke = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Sara Dam' });
    await expect(raekke).toHaveCount(1);
    await expect(raekke.locator('.maerke', { hasText: 'Tapasfad' })).toHaveCount(1);

    const anden = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Jonas Berg' });
    await expect(anden.locator('.maerke', { hasText: 'Tapasfad' })).toHaveCount(0);
  });
});
