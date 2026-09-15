/* ============================================================
   FORESPØRGSLERNE SKAL VÆRE TYDELIGE  (15/9)
   ------------------------------------------------------------
   Ejerens ord: "forespørgslerne alle sammen, om det er baglokale
   eller de ting, der kan ryge ind i admin, er utydelige."

   MÅLT før rettelsen:
   - den samme status hed "Svaret" på mærket, "Jeg har kontaktet
     dem" på knappen og "Ringet på" på Baglokale-fanen
   - Baglokale-fanen ledte efter .bestil-top på et kort, der har
     .foresp-top, så ventetiden kom aldrig på netop de sager, der
     venter på svar
   - datoen sagde "Lørdag 3. oktober", ikke om det var om to dage
     eller om to måneder
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, visFane } = require('./hjaelp');

const UR = '2026-08-06T11:00:00Z';   // torsdag 6. august, 13.00 dansk tid

function foresp(ekstra) {
  return Object.assign({
    id: 1, lokation_id: 'mosede', reference: 'FO260806-AAAAA', nummer: 4,
    type: 'selskab', navn: 'Peter Lund', telefon: '40506070', email: 'p@example.com',
    dato: '2026-08-16', antal_personer: 20, besked: null, status: 'ny',
    intern_note: null, detaljer: {}, oprettet: '2026-08-06T08:00:00Z',
  }, ekstra);
}

async function fanen(page, id, forespoergsler) {
  await åbnAdmin(page, { ur: UR, data: grunddata({ forespoergsler }) });
  await visFane(page, id);
}

test.describe('Forespørgslerne siger det samme med de samme ord', () => {

  test('en kontaktet sag hedder "Kontaktet" — ikke "Svaret"', async ({ page }) => {
    await fanen(page, 'p-forespoergsler', [foresp({ status: 'kontaktet' })]);
    const kort = page.locator('#forespoergsler-liste .bestil-kort').first();
    await expect(kort).toContainText('Kontaktet');
    await expect(kort).not.toContainText('Svaret');
  });

  test('Baglokale-fanens trin hedder også "Kontaktet"', async ({ page }) => {
    await fanen(page, 'p-lokale', [foresp({ type: 'baglokale', status: 'kontaktet' })]);
    await expect(page.locator('#p-lokale')).toContainText('Kontaktet');
    await expect(page.locator('#p-lokale')).not.toContainText('Ringet på');
  });

  /* ⚠️ FØR RETTELSEN KOM VENTETIDEN ALDRIG PÅ EN FORESPØRGSEL HER —
     kortet har .foresp-top, og fanen ledte efter .bestil-top. */
  test('en baglokale-forespørgsel, der venter, siger hvor længe — i toppen', async ({ page }) => {
    await fanen(page, 'p-lokale', [foresp({ type: 'baglokale', oprettet: '2026-08-03T08:00:00Z' })]);
    const ventet = page.locator('#p-lokale .foresp-top .ventet');
    await expect(ventet).toHaveCount(1);
    await expect(ventet).toContainText('3 dage');
  });
});

test.describe('Datoen siger, hvor langt der er til', () => {

  test('om ti dage står der "om 10 dage"', async ({ page }) => {
    await fanen(page, 'p-forespoergsler', [foresp({ dato: '2026-08-16' })]);
    await expect(page.locator('#forespoergsler-liste .foresp-dato').first()).toContainText('om 10 dage');
  });

  test('i morgen står der "i morgen" — og i dag intet tal', async ({ page }) => {
    await fanen(page, 'p-forespoergsler', [
      foresp({ dato: '2026-08-07' }),
      foresp({ id: 2, reference: 'FO260806-BBBBB', nummer: 5, dato: '2026-08-06' }),
    ]);
    const datoer = page.locator('#forespoergsler-liste .foresp-dato');
    await expect(datoer.filter({ hasText: '7. august' })).toContainText('i morgen');
    await expect(datoer.filter({ hasText: 'I DAG' })).not.toContainText('om ');
  });

  test('et andet år står med årstal', async ({ page }) => {
    await fanen(page, 'p-forespoergsler', [foresp({ dato: '2027-03-20' })]);
    await expect(page.locator('#forespoergsler-liste .foresp-dato').first()).toContainText('2027');
  });
});
