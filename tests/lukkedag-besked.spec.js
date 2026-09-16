/* ============================================================
   LUKKEDAGEN SKAL KUNNE SIGE NOGET  (16/9)
   ------------------------------------------------------------
   Ejerens ord: "en lukkedag giver ikke muligheden for at sige
   noget på siden".

   MÅLT før: genvejen "🚫 Luk dagen" kvitterede med ordene "Skriv,
   hvad der skal stå på hjemmesiden den dag" — og det eneste felt,
   formularen så tilbød, var en overskrift på 120 tegn.
   Beskrivelsesfeltet fandtes, men var skjult for alt andet end et
   arrangement. Og selv dagens egen besked (dags_regler) stod KUN
   på forsiden: en gæst, der gik direkte til bestil/, til bord/
   eller scannede QR-koden ved bordet, mødte en sætning, der står
   fast i koden.

   ⚠️ TO KILDER, ÉN AFGØRELSE. Dagens egen besked er skrevet om
   netop den dag; lukkedagens dækker hele perioden (derfor bor den
   på lukningen — en vinterlukning ville ellers være halvfems
   rækker i dags_regler). Er der begge, vinder dagens egen.
   Rækkefølgen ligger ét sted: js/dagsbesked.js.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-08-07T11:00:00Z';   /* fredag 7. august 2026 */
const I_DAG = '2026-08-07';

/* QR-siden skal kende bordet i adressen, ellers står den med
   bordvælgeren — banneret skal stå der uanset hvad. */
const BORDE = [{
  id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
  placering: 'ude', aktiv: true, sortering: 10, zone: 'Molen',
}];

function lukkedag(x) {
  return Object.assign({
    id: 1, lokation_id: 'mosede', type: 'lukkedag',
    dato: I_DAG, slut_dato: null,
    titel: 'Lukket for privat selskab',
    beskrivelse: 'Vi er tilbage i morgen kl. 11.\nMaden kan ikke hentes i dag.',
    emoji: '🚫', lukker_kl: null, offentlig: false,
  }, x || {});
}

function dagsregel(x) {
  return Object.assign({
    id: 1, lokation_id: 'mosede', dato: I_DAG,
    luk_takeaway: false, luk_spis_her: false,
    tidligst: null, senest_togo: null, senest_spis_her: null,
    besked_titel: null, besked_til_gaester: null,
  }, x || {});
}

function data(x) {
  return grunddata(Object.assign({ borde: BORDE }, x || {}));
}

/* De fire flader, gæsten kan møde en lukket dag på. QR-siden
   bærer bordet i adressen. */
const SIDER = [
  ['forsiden', '/index.html'],
  ['bestillingssiden', '/bestil/'],
  ['bordbookingen', '/bord/'],
  ['QR-koden ved bordet', '/ved-bordet/?bord=7'],
];

for (const [navn, sti] of SIDER) {
  test(`lukkedagens besked står på ${navn}`, async ({ page }) => {
    await åbn(page, sti, { ur: UR, data: data({ kalender: [lukkedag()] }) });
    await expect(page.locator('#dagsbesked')).toBeVisible();
    await expect(page.locator('#dagsbesked-titel'))
      .toHaveText('Lukket for privat selskab');
    await expect(page.locator('#dagsbesked-tekst'))
      .toContainText('tilbage i morgen');
    /* Datolinjen kommer udefra: uret står på den 7. august. */
    await expect(page.locator('#dagsbesked-dag')).toContainText('august');
  });
}

/* ⚠️ MODSTYKKET. Uden det ville et banner, der ALTID stod der,
   bestå prøverne ovenfor — og så ville hver eneste lukkedag uden
   en besked vise en tom, mørk flade. */
test('en lukkedag uden en besked giver intet banner', async ({ page }) => {
  const fejl = [];
  page.on('pageerror', (e) => fejl.push(String(e.message)));
  page.on('console', (m) => { if (m.type() === 'error') fejl.push(m.text()); });

  await åbn(page, '/bestil/', {
    ur: UR,
    data: data({ kalender: [lukkedag({ beskrivelse: '' })] }),
  });
  await expect(page.locator('#dagsbesked')).toBeHidden();
  /* Og siden skal være i live — skjult af den rigtige grund. */
  await expect(page.locator('#bestil-status-tekst')).not.toHaveText('');
  expect(fejl.filter((f) => !/favicon|404|net::/.test(f)),
    'siden kastede en fejl — banneret er skjult af den forkerte grund')
    .toEqual([]);
});

/* En vinterlukning er ÉN række med en periode. Beskeden skal stå
   alle dagene, ikke kun den første — det er hele grunden til, at
   den bor på lukningen og ikke i én række pr. dag. */
test('beskeden står også midt i en lukkeperiode', async ({ page }) => {
  await åbn(page, '/index.html', {
    ur: UR,
    data: data({ kalender: [lukkedag({ dato: '2026-08-05', slut_dato: '2026-08-09' })] }),
  });
  await expect(page.locator('#dagsbesked-titel'))
    .toHaveText('Lukket for privat selskab');
});

/* ⚠️ RÆKKEFØLGEN. Dagens egen besked er skrevet om netop den dag
   og vinder over lukningens. Stod de omvendt, ville et ja til en
   forespørgsel ("kun mad ud af huset i dag") blive overdøvet af en
   måneder gammel vinterlukning. */
test('dagens egen besked slår lukkedagens', async ({ page }) => {
  await åbn(page, '/bord/', {
    ur: UR,
    data: data({
      kalender: [lukkedag()],
      dags_regler: [dagsregel({
        besked_titel: 'Kun mad ud af huset i dag',
        besked_til_gaester: 'Vi har selskab på trædækket til kl. 16.',
      })],
    }),
  });
  await expect(page.locator('#dagsbesked-titel'))
    .toHaveText('Kun mad ud af huset i dag');
  await expect(page.locator('#dagsbesked-tekst')).toContainText('trædækket');
});

/* Teksten er personalets frie tekst. Skrives den som opmærkning,
   kan et uheldigt tegn lave om på siden — og nu står den på fire
   sider i stedet for én. */
test('teksten skrives som tekst, ikke som opmærkning', async ({ page }) => {
  await åbn(page, '/ved-bordet/?bord=7', {
    ur: UR,
    data: data({
      kalender: [lukkedag({ beskrivelse: 'Vi lukker <b>tidligt</b> i dag' })],
    }),
  });
  await expect(page.locator('#dagsbesked-tekst b')).toHaveCount(0);
  await expect(page.locator('#dagsbesked-tekst')).toContainText('<b>tidligt</b>');
});

/* ============================================================
   OG PERSONALET SKAL KUNNE SKRIVE DEN
   ============================================================ */
test.describe('Feltet i admin', () => {

  test('en lukkedag har beskedfeltet, og ordene passer til typen', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: data() });
    await visFane(page, 'p-kalender');

    /* Modstykket først: på et arrangement er feltet en historie. */
    await page.locator('#kalender-typer [data-type="arrangement"]').click();
    await expect(page.locator('#kal-tekst-felt')).toBeVisible();
    await expect(page.locator('#kal-tekst-etiket')).toContainText('Hvad sker der?');

    await page.locator('#kalender-typer [data-type="lukkedag"]').click();
    await expect(page.locator('#kal-tekst-felt')).toBeVisible();
    await expect(page.locator('#kal-tekst-etiket')).toContainText('Besked til gæsterne');
    /* Hjælpelinjen skal sige, HVOR den står — ellers tror man, det
       er personalets egen note. */
    await expect(page.locator('#kal-tekst-hjaelp')).toContainText('hjemmesiden');
  });

  test('beskeden gemmes på lukkedagen', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await åbnAdmin(page, { ur: UR, data: data() });
    await visFane(page, 'p-kalender');

    await page.locator('#kalender-typer [data-type="lukkedag"]').click();
    await page.locator('#kal-dato').fill('2026-08-24');
    await page.locator('#kal-titel').fill('Lukket for privat selskab');
    await page.locator('#kal-beskrivelse').fill('Vi er tilbage tirsdag kl. 11.');
    await page.locator('#tilfoej-kalender').click();

    await expect.poll(async () => {
      const k = ((await gemteData(page)).kalender || [])[0] || {};
      return k.beskrivelse;
    }).toBe('Vi er tilbage tirsdag kl. 11.');
  });

  /* ⚠️ OG EN TIDLIG LUKNING HAR DEN IKKE. Den har sit klokkeslæt,
     og resten står i åbningstiderne. Et felt, der ikke betyder
     noget, er et felt, nogen udfylder alligevel. */
  test('en tidlig lukning har ikke beskedfeltet', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: data() });
    await visFane(page, 'p-kalender');
    await page.locator('#kalender-typer [data-type="tidlig_lukning"]').click();
    await expect(page.locator('#kal-tekst-felt')).toBeHidden();
  });
});
