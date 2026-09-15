/* ============================================================
   EN LUKKEDAG SPØRGER FØRST, HVIS DEN RAMMER NOGET  (16/9)
   ------------------------------------------------------------
   Ejerens ord: admin skal være "klogere og hænge bedre sammen med
   kalenderen … enkelt og dygtigt ift. lukkedage med arrangementer".

   MÅLT før rettelsen: en lukkedag blev gemt uden et spørgsmål — også
   oven i en koncert med tilmeldinger, en bordbooking og en udlejning
   af baglokalet. Og et arrangement kunne lægges på en lukket dag uden
   et ord. Kun de DELVISE lukninger (spis her / take-away) advarede.

   Modstykkerne: en tom dag spørger ikke (en advarsel, der altid
   kommer, holder man op med at læse), og siger man nej, gemmes intet.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-08-06T11:00:00Z';
const DAG = '2026-08-14';

function dagenMedTing() {
  const d = grunddata();
  d.kalender = [{
    id: 1, lokation_id: 'mosede', type: 'arrangement', dato: DAG, slut_dato: null,
    titel: 'Livemusik på molen', beskrivelse: null, emoji: '🎸', lukker_kl: null,
    offentlig: true, tilmelding: true, pladser: 40, start_kl: '19:00',
    oprettet: '2026-08-01T10:00:00Z',
  }];
  d.reservationer = [{ id: 1, lokation_id: 'mosede', kalender_id: 1, reference: 'RE-A',
    navn: 'Anna', telefon: '20304050', antal_personer: 4, status: 'ny',
    oprettet: '2026-08-02T10:00:00Z' }];
  d.bordbestillinger = [{ id: 1, lokation_id: 'mosede', reference: 'BO260814-AAAAA',
    navn: 'Ole Berg', telefon: '30405060', dato: DAG, tid: '18:00', antal_personer: 6,
    besked: null, status: 'ny', intern_note: null, oprettet: '2026-08-05T10:00:00Z' }];
  d.udlejninger = [{ id: 1, lokation_id: 'mosede', reference: 'BL260814-AAAAA',
    navn: 'Karen Sø', telefon: '50607080', email: null, dato: DAG, antal_personer: 30,
    besked: null, status: 'bekraeftet', intern_note: null, oprettet: '2026-08-01T10:00:00Z' }];
  return d;
}

async function kalenderen(page, data) {
  await åbnAdmin(page, { ur: UR, data });
  await visFane(page, 'p-kalender');
  await page.evaluate(() => {
    const f = document.getElementById('kal-dato');
    const fold = f && f.closest('details');
    if (fold) fold.open = true;
  });
}

async function udfyld(page, type, titel) {
  await page.locator(`#kalender-typer [data-type="${type}"]`).click();
  await page.locator('#kal-dato').fill(DAG);
  await page.locator('#kal-titel').fill(titel);
}

const kalenderRaekker = async (page, type) =>
  ((await gemteData(page)).kalender || []).filter((k) => k.type === type && k.dato === DAG);

test.describe('En lukkedag, der rammer noget', () => {

  test('siger hvad den rammer — og et nej gemmer ingenting', async ({ page }) => {
    await kalenderen(page, dagenMedTing());
    await udfyld(page, 'lukkedag', 'Lukket');
    let tekst = '';
    page.once('dialog', (dlg) => { tekst = dlg.message(); dlg.dismiss(); });
    await page.locator('#tilfoej-kalender').click();
    await expect.poll(() => tekst).toContain('Livemusik på molen');
    expect(tekst).toContain('4 har meldt sig til');
    expect(tekst).toContain('Ole Berg');
    expect(tekst).toContain('Karen Sø');
    expect(tekst).toContain('stadig på hjemmesiden');
    expect(await kalenderRaekker(page, 'lukkedag')).toHaveLength(0);
  });

  test('et ja lukker dagen', async ({ page }) => {
    await kalenderen(page, dagenMedTing());
    await udfyld(page, 'lukkedag', 'Lukket');
    page.once('dialog', (dlg) => dlg.accept());
    await page.locator('#tilfoej-kalender').click();
    await expect.poll(async () => (await kalenderRaekker(page, 'lukkedag')).length).toBe(1);
  });

  /* ⚠️ MODSTYKKET: en tom dag spørger ikke. */
  test('en tom dag lukkes uden spørgsmål', async ({ page }) => {
    await kalenderen(page, grunddata());
    await udfyld(page, 'lukkedag', 'Lukket');
    let kom = false;
    page.on('dialog', (dlg) => { kom = true; dlg.dismiss(); });
    await page.locator('#tilfoej-kalender').click();
    await expect.poll(async () => (await kalenderRaekker(page, 'lukkedag')).length).toBe(1);
    expect(kom, 'der blev spurgt om en dag uden noget på').toBe(false);
  });
});

test.describe('Et arrangement på en lukket dag', () => {
  test('spørger, og et nej gemmer ingenting', async ({ page }) => {
    const d = grunddata();
    d.kalender = [{ id: 2, lokation_id: 'mosede', type: 'lukkedag', dato: DAG, slut_dato: null,
      titel: 'Ferielukket', beskrivelse: null, emoji: null, lukker_kl: null, offentlig: true,
      oprettet: '2026-08-01T10:00:00Z' }];
    await kalenderen(page, d);
    await udfyld(page, 'arrangement', 'Quiz');
    let tekst = '';
    page.once('dialog', (dlg) => { tekst = dlg.message(); dlg.dismiss(); });
    await page.locator('#tilfoej-kalender').click();
    await expect.poll(() => tekst).toContain('Ferielukket');
    expect(await kalenderRaekker(page, 'arrangement')).toHaveLength(0);
  });
});
