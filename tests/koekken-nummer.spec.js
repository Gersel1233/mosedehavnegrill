/* ============================================================
   KØKKENETS KORT SKAL BÆRE BESTILLINGSNUMMERET
   ------------------------------------------------------------
   Kundens ord 10/9: *"og korrekt ordrenummer osv"*.

   MÅLT før: Bestillinger-fanen har vist M-0047 siden 31/8, gæsten
   ser det på sin kvittering i min-bestilling/, og Køkken-kø —
   den ENE skærm, hvor maden faktisk bliver lavet — havde det
   ikke. Spørger nogen til bestilling 44, kunne køkkenet ikke
   finde den.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const H = require('./hjaelp.js');

const ISO = '2026-08-07';

function vedBordet(nummer) {
  const d = H.grunddata();
  d.borde = [{ id: 7, lokation_id: 'mosede', nummer: '7', aktiv: true, har_kode: false }];
  d.bestillinger = [{
    id: 1, reference: 'SM260807-AAA11', lokation_id: 'mosede',
    navn: 'mikkel', telefon: null, hent_dato: ISO, hent_tid: '12:05',
    linjer: [{ navn: 'Softice, stor', antal: 2, pris: 45 }], fyld: [], antal: 2,
    status: 'ny', hvordan: 'spis_her', bord_nummer: '7',
    ...(nummer === null ? {} : { nummer }),
  }];
  return d;
}

test('køkkenkortet viser bestillingsnummeret', async ({ page }) => {
  await H.åbnAdmin(page, { data: vedBordet(44) });
  await H.visFane(page, 'p-koekken');

  const kort = page.locator('#p-koekken .koek-kort').first();
  await expect(kort).toBeVisible();      // først: kortet ER der

  await expect(kort.locator('.koek-nr')).toHaveText('M-0044');

  /* ⚠️ OG BORDET ER STADIG DET STORE. Maden bæres ud efter
     BORDET; et nummer i samme vægt ville være to tal at vælge
     imellem på et kort, der læses på afstand. To uafhængige
     elementer sammenlignet — ikke ét spørgsmål til nummeret om
     dets egen størrelse. */
  const [bord, nr] = await Promise.all([
    kort.locator('.koek-bord').evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    kort.locator('.koek-nr').evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ]);
  expect(nr, 'nummeret fylder lige så meget som bordet').toBeLessThan(bord);
});

test('en række uden nummer får ikke et tomt #', async ({ page }) => {
  /* ⚠️ MODSTYKKET. Rækker fra før bestillingsnummer.sql har intet
     nummer, og et nøgent "#" ville ligne en fejl. Uden den her
     prøve ville en regel, der ALTID skriver tegnet, bestå den
     ovenfor. */
  await H.åbnAdmin(page, { data: vedBordet(null) });
  await H.visFane(page, 'p-koekken');

  const kort = page.locator('#p-koekken .koek-kort').first();
  await expect(kort).toBeVisible();
  await expect(kort.locator('.koek-nr')).toHaveCount(0);
});
