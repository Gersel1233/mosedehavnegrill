/* ============================================================
   HVILKET BORD FÅR DE?  (16/9)
   ------------------------------------------------------------
   Ejerens ord: bordbestillingen skal kunne styres ordentligt, og
   personalet skal kunne se hvilket bord.

   MÅLT før: en booking bar navn, telefon, dag, tid, antal og status
   — og INTET om bordet. Personalet skrev "bord 4 ved vinduet" i
   notefeltet, altså i fri tekst, og så kan systemet ikke se, at to
   familier har fået det samme bord kl. 18.

   ⚠️ VÆLGEREN HER ER EN HJÆLP, IKKE VÆRNET. Databasen dømmer
   (supabase/bord-plads.sql, proev-bord-plads.sql: 7 af 7) — to
   medarbejdere, der tildeler i samme sekund, ser begge det gamle
   billede. Prøverne herunder måler skærmens halvdel: at bordet kan
   sættes, at det gemmes som et RIGTIGT bord, at et optaget bord er
   spærret, og at feltet slet ikke findes, før kolonnen gør.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-09-16T11:00:00Z';
const DAG = '2026-09-19';

const BORDE = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude',
    aktiv: true, sortering: 10, zone: 'Molen' },
  { id: 2, lokation_id: 'mosede', nummer: '3', pladser: 2, placering: 'inde',
    aktiv: true, sortering: 20, zone: 'Terrassen' },
  { id: 3, lokation_id: 'mosede', nummer: '9', pladser: 6, placering: 'ude',
    aktiv: false, sortering: 30, zone: 'Molen' },
];

function booking(x) {
  return Object.assign({
    id: 1, nummer: 3, lokation_id: 'mosede', reference: 'BO260916-AAAAA',
    navn: 'familien vind', telefon: '20304050', email: null, dato: DAG, tid: '18:00',
    antal_personer: 4, besked: null, status: 'ny', intern_note: null,
    bord_id: null, slettet: null, oprettet: '2026-09-15T10:00:00Z',
  }, x);
}

async function aabn(page, bookinger) {
  const d = grunddata({ borde: BORDE, bordbestillinger: bookinger });
  await åbnAdmin(page, { ur: UR, data: d });
  await visFane(page, 'p-borde');
  return page.locator('#borde-venter .bestil-kort').first();
}

test('bordet vælges på kortet og gemmes som et rigtigt bord', async ({ page }) => {
  const kort = await aabn(page, [booking()]);
  const vaelger = kort.locator('select[id^="bord-plads-"]');
  await expect(vaelger).toBeVisible();
  /* Teksten siger, hvad man vælger imellem: nummer, pladser og zone. */
  await expect(vaelger.locator('option', { hasText: 'Bord 7' })).toContainText('Molen');

  await vaelger.selectOption('1');
  await expect.poll(async () =>
    ((await gemteData(page)).bordbestillinger || [{}])[0].bord_id).toBe(1);

  /* ⚠️ OG DET KAN TAGES AF IGEN. null er den normale tilstand, og et
     fejltryk skal kunne fortrydes. */
  await vaelger.selectOption('');
  await expect.poll(async () =>
    ((await gemteData(page)).bordbestillinger || [{}])[0].bord_id).toBe(null);
});

test('et bord, der allerede er lovet væk, kan ikke vælges', async ({ page }) => {
  const kort = await aabn(page, [
    booking({ id: 1, tid: '18:00', bord_id: 1, navn: 'ole berg', status: 'bekraeftet' }),
    booking({ id: 2, reference: 'BO260916-BBBBB', tid: '18:30', telefon: '30405060' }),
  ]);
  /* Kortet for den nye booking: bord 7 er taget en halv time før. */
  const vaelger = page.locator('#bord-plads-2');
  const taget = vaelger.locator('option', { hasText: 'Bord 7' });
  await expect(taget).toBeDisabled();
  await expect(taget).toContainText('optaget');
  await expect(taget).toContainText('Ole Berg');

  /* ⚠️ MODSTYKKET: det andet bord er frit, ellers ville en vælger,
     der spærrede ALT, bestå prøven. */
  await expect(vaelger.locator('option', { hasText: 'Bord 3' })).toBeEnabled();
});

/* ⚠️ ET FOR LILLE BORD SPÆRRES IKKE — det mærkes. To borde kan
   sættes sammen, og en vælger, der er strengere end virkeligheden,
   er en vælger, personalet arbejder udenom. */
test('et for lille bord står med en note, men kan vælges', async ({ page }) => {
  const kort = await aabn(page, [booking({ antal_personer: 4 })]);
  const lille = kort.locator('select[id^="bord-plads-"] option', { hasText: 'Bord 3' });
  await expect(lille).toContainText('for lille');
  await expect(lille).toBeEnabled();
});

/* Et slukket bord står der ikke — personalet skal ikke kunne sætte
   en familie ved et bord, der er taget ind for sæsonen. */
test('et slukket bord står ikke i listen', async ({ page }) => {
  const kort = await aabn(page, [booking()]);
  await expect(kort.locator('select[id^="bord-plads-"] option', { hasText: 'Bord 9' }))
    .toHaveCount(0);
});

/* ⚠️ OG KUN ÉT STED AT SKRIVE BORDET (set på et skud 16/9).
   Notens hjælpetekst sagde "Fx: bord 4 ved vinduet" — fri tekst,
   lige over den nye vælger. Vælgeren er intet værd, hvis feltet
   ovenover stadig beder om det samme: systemet kan ikke læse en
   note, og så er vi tilbage ved to familier på bord 7 kl. 18. */
test('noten beder ikke længere om bordet', async ({ page }) => {
  const kort = await aabn(page, [booking()]);
  const note = kort.locator('input[placeholder^="Fx:"]');
  await expect(note).toHaveCount(1);
  await expect(note).not.toHaveAttribute('placeholder', /bord/i);
});

/* ⚠️ OG FELTET FINDES IKKE, FØR KOLONNEN GØR. Er bord-plads.sql ikke
   kørt, ville hvert gem fejle med PGRST204 på en fil, ejeren ikke ved
   eksisterer — og han ville se en vælger, der ikke virker. */
test('uden kolonnen er der ingen vælger', async ({ page }) => {
  const uden = booking();
  delete uden.bord_id;
  const kort = await aabn(page, [uden]);
  await expect(kort).toBeVisible();
  await expect(kort.locator('select[id^="bord-plads-"]')).toHaveCount(0);
});
