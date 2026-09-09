/* ============================================================
   ADMIN SKAL SIGE DE SAMME ORD OM DEN SAMME TING
   ------------------------------------------------------------
   Kundens ord 9/9: *"der ingen ordelig historik ... alle
   sektioner i admin er rodet og ikke tydelige nok"*.

   To ting blev målt på en arbejdsdag, og begge er husets egne ar
   i ny forklædning:

   1) LOGBOGEN HAVDE SIN EGEN KOPI af statusordene. Bestillingens
      sidste trin blev døbt om til **Færdig** 31/8, og reglen bor
      i `Admin.statusNavn` — men logbogen sagde stadig
      *"afhentet"*. Altså sagde Historik ét ord om præcis den
      bestilling, hvis kort tre faner væk sagde et andet.

   2) NAVNET STOD MED SMÅT i kalenderens dagspanel og i logbogen.
      `Admin.pæntNavn` har ligget i kerne.js siden 1/9; det her
      er fjerde og femte sted, der ikke spurgte den.

   ⚠️ BEGGE PRØVER HOLDER TO SKÆRME OP MOD HINANDEN — ét af
   tallene kommer UDEFRA. Et spørgsmål til logbogen om dens eget
   ord ville bestå, uanset hvad Bestillinger-fanen sagde, og det
   er præcis dét, der lod de to skride fra hinanden i ni dage.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const H = require('./hjaelp.js');

const ISO = '2026-08-07';

function medHistorik() {
  const d = H.grunddata();
  /* Bestillingen SKAL findes, så det samme ord kan læses to
     steder. Uden den måler prøven kun logbogen mod sig selv. */
  d.bestillinger = [{
    id: 6, nummer: 40, reference: 'SM260807-FFF66', lokation_id: 'mosede',
    navn: 'peter storm', telefon: '24681012', hent_dato: ISO, hent_tid: '10:30',
    linjer: [{ navn: 'Rejemad', antal: 2, pris: 85 }], fyld: [], antal: 2,
    status: 'afhentet', hvordan: 'afhentning',
  }];
  /* ⚠️ hvad ER ET FAST ORDFORRÅD (logbog_hvad_ok): rettet · i
     skraldespanden · hentet tilbage · slettet for altid. Selve
     ændringen ligger i foer/efter. Et fikstur med fri tekst her
     måler en række, databasen aldrig kan indeholde. */
  d.logbog = [{
    id: 1, lokation_id: 'mosede', tabel: 'bestillinger', raekke_id: 6,
    reference: 'SM260807-FFF66', navn: 'peter storm', hvad: 'rettet',
    hvem: 'chef@eksempel.dk', hvornaar: ISO + 'T10:40:00Z',
    foer: { status: 'klar' }, efter: { status: 'afhentet' },
  }, {
    id: 2, lokation_id: 'mosede', tabel: 'menu_varer', raekke_id: 12,
    reference: null, navn: 'Cheeseburger', hvad: 'rettet',
    hvem: 'chef@eksempel.dk', hvornaar: ISO + 'T10:41:00Z',
    foer: { pris: 89 }, efter: { pris: 95 },
  }];
  return d;
}

test('logbogen bruger husets ord for status, ikke databasens', async ({ page }) => {
  await H.åbnAdmin(page, { data: medHistorik() });

  /* UDEFRA: hvad kalder Bestillinger-fanen den status? */
  await H.visFane(page, 'p-bestillinger');
  const paaKortet = await page.evaluate(() => window.Admin.statusNavn('afhentet'));
  expect(paaKortet, 'Admin.statusNavn skal kende ordet').toBeTruthy();

  await H.visFane(page, 'p-historik');
  const linje = page.locator('#p-historik .log-hvad, #p-historik [class*="log-"]')
    .filter({ hasText: 'Status' }).first();
  await expect(linje).toBeVisible();   // først: linjen ER der

  const tekst = await linje.innerText();
  expect(tekst, 'logbogen skal sige "' + paaKortet + '" som resten af huset')
    .toContain(paaKortet);
  expect(tekst.toLowerCase(),
    'logbogen skriver databasens rå ord i stedet for husets')
    .not.toContain('afhentet');
});

test('logbogen skriver tabellen på dansk, ikke menu_varer', async ({ page }) => {
  await H.åbnAdmin(page, { data: medHistorik() });
  await H.visFane(page, 'p-historik');

  const boks = page.locator('#logbog-liste');
  await expect(boks).toBeVisible();
  const alt = await boks.innerText();

  /* Et råt tabelnavn kendes på underscoren — reglen er ikke ét
     filnavn, men enhver tabel, der slipper igennem uoversat. */
  expect(alt, 'databasens tabelnavn står på skærmen')
    .not.toMatch(/\b[a-z]+_[a-z]+\b/);
  /* ⚠️ MÆRKATET SÆTTES I VERSALER AF STILARKET, og innerText
     giver den TEGNEDE tekst — så "Bestilling" kommer ud som
     "BESTILLING". Prøven må ikke bindes til en skrivemåde,
     CSS'en bestemmer; den skal måle ORDET. */
  expect(alt.toLowerCase()).toContain('bestilling');
});

test('navnet står som et navn i kalenderens dagspanel og i logbogen', async ({ page }) => {
  await H.åbnAdmin(page, { data: medHistorik() });

  /* UDEFRA: hvad ville husets egen regel skrive? */
  const pænt = await page.evaluate(() => window.Admin.pæntNavn('peter storm'));
  expect(pænt).toBe('Peter Storm');

  await H.visFane(page, 'p-historik');
  await expect(page.locator('#logbog-liste')).toBeVisible();
  expect(await page.locator('#logbog-liste').innerText())
    .toContain(pænt);

  await H.visFane(page, 'p-kalender');
  /* ⚠️ Kalenderens dagsfelter bærer `data-dag` (ikke `data-dato`,
     som Bestillinger-fanens banner gør — H.visDag er den anden).
     To attributter med næsten samme navn i det samme hus er
     husets egen advarsel; her betyder det bare, at prøven skal
     pege på DEN rigtige. */
  await page.locator('#p-kalender [data-dag="' + ISO + '"]').first().click();
  /* ⚠️ #dag-lag OG IKKE [class*="dag-lag"]. Panelet indeni hedder
     .dag-lag-ind, så et delstrengs-match rammer TO elementer og
     falder på strict mode — samme fælde som .fine 31/8 og
     .h-kilde 6/9. Et id er ét element. */
  const lag = page.locator('#dag-lag');
  await expect(lag).toBeVisible();
  const dagen = await lag.innerText();
  expect(dagen, 'dagens program skriver gæstens navn med småt')
    .toContain(pænt);
  expect(dagen).not.toContain('peter storm');
});
