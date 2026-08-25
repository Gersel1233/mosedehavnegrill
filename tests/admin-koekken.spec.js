/* KØKKEN-KØEN — skærmen, der står tændt ved lugen

   Briefen (25/8) bad om en egen "Restaurant-mode", hvor personalet
   KUN ser bestillinger fra bordene, med ét tryk pr. trin og en
   ventetid, der bliver rød. Den er bygget som en egen SKÆRM og
   ikke som en egen tabel — se noten øverst i js/admin/koekken.js
   og i supabase/restaurant.sql.

   Det er præcis dét skel, prøverne her måler. Fire ting kan gå
   galt, og de er alle fire dyre:

   1) EN WEBBESTILLING SNIGER SIG IND I KØEN. Så laver køkkenet
      mad til en, der først kommer kl. 18 — mens et bord venter.
   2) ET TRYK GØR INGENTING SYNLIGT. Så trykker personalet igen,
      og bestillingen springer et trin over. Kortet SKAL flytte
      sig med det samme.
   3) ET GLEMT BORD SER UD SOM ET BORD I GANG. Ventetiden er
      skærmens eneste alarm.
   4) LUKKEKONTAKTEN SLÅR KØEN IHJEL. Lukkes der for nye
      scanninger, skal det, der allerede er i gang, køre færdigt —
      ellers står tre borde med mad, der aldrig kommer.

   Uret står torsdag 6. august 2026 kl. 13.00 dansk tid.
*/

const { test, expect } = require('@playwright/test');
const { åbnAdmin, åbn, grunddata, gemteData } = require('./hjaelp');

const UR = '2026-08-06T11:00:00Z';        // 13.00 dansk tid
const I_DAG = '2026-08-06';

const BORDE = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 },
  { id: 2, lokation_id: 'mosede', nummer: '3', pladser: 2, placering: 'inde', aktiv: true, sortering: 20 },
];

/* Minutter FØR det faste ur. Ventetiden regnes af oprettet, så
   det er dét tal, der afgør om kortet er rødt. */
function forSiden(minutter) {
  return new Date(Date.parse(UR) - minutter * 60000).toISOString();
}

function ordre(ekstra) {
  return Object.assign({
    id: 1, lokation_id: 'mosede', reference: 'SM260806-AAAAA',
    navn: 'Bord 7', telefon: '00000000', hent_dato: I_DAG, hent_tid: '13:05',
    linjer: [{ navn: 'Fiskefilet', antal: 2, pris: 75 }],
    fyld: [], antal: 2, status: 'ny', intern_note: null, besked: null,
    hvordan: 'spis_her', bord_nummer: '7', slettet: null,
    oprettet: forSiden(4),
  }, ekstra);
}

async function åbnKoekkenet(page, bestillinger, ekstra) {
  await åbnAdmin(page, {
    ur: UR,
    data: grunddata(Object.assign({ borde: BORDE, bestillinger: bestillinger }, ekstra || {})),
  });
  await page.locator('[data-panel="p-koekken"]').click();
  await page.waitForSelector('#p-koekken:not(.skjult)');
}

const kort = (page, bord) => page.locator(`.koek-kort[data-bord="${bord}"]`);

// ============================================================
//  1) KUN BORDENE
// ============================================================
test.describe('Køen viser kun det, der kommer fra et bord', () => {

  /* Adskillelsen er bord_nummer og ikke en tabel. Falder den her,
     står webbestillingerne i køkkenets kø — og så laver køkkenet
     mad fem timer for tidligt. */
  test('en webbestilling uden bordnummer er ikke i køen', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre(),
      ordre({
        id: 2, reference: 'SM260806-BBBBB', navn: 'Anna Vind',
        telefon: '20304050', bord_nummer: null, hvordan: 'ud_af_huset',
        hent_tid: '18:00',
      }),
    ]);

    await expect(page.locator('.koek-kort')).toHaveCount(1);
    await expect(kort(page, '7')).toBeVisible();
    await expect(page.locator('#koekken-liste')).not.toContainText('Anna Vind');
  });

  /* De færdige er ikke arbejde længere. Stod de der, ville køen
     vokse hele dagen, og det, der venter, ville drukne i det,
     der er serveret. */
  test('serveret, afvist og slettet forsvinder fra køen', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre(),
      ordre({ id: 2, reference: 'SM260806-BBBBB', bord_nummer: '3', status: 'serveret' }),
      ordre({ id: 3, reference: 'SM260806-CCCCC', bord_nummer: '3', status: 'afvist' }),
      ordre({ id: 4, reference: 'SM260806-DDDDD', bord_nummer: '3', slettet: '2026-08-06T10:00:00Z' }),
    ]);

    await expect(page.locator('.koek-kort')).toHaveCount(1);
    await expect(kort(page, '7')).toBeVisible();
  });

  /* Tomt er et SVAR. Står der ingenting, tror man skærmen er gået
     i stå — og så begynder nogen at genindlæse midt i en frokost. */
  test('en tom kø siger det med ord', async ({ page }) => {
    await åbnKoekkenet(page, []);
    await expect(page.locator('#koekken-liste')).toContainText('Ingen bestillinger fra bordene');
    await expect(page.locator('#koekken-antal')).toHaveClass(/skjult/);
  });

  test('tallet på fanen tæller kun bordene', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre(),
      ordre({ id: 2, reference: 'SM260806-BBBBB', bord_nummer: '3' }),
      ordre({ id: 3, reference: 'SM260806-CCCCC', bord_nummer: null, navn: 'Anna Vind' }),
    ]);
    await expect(page.locator('#koekken-antal')).toHaveText('2');
  });

  /* Ældste først. Køkkenet arbejder i den rækkefølge, tingene kom
     ind — det er en ANDEN sortering end Overblik, hvor hentetiden
     bestemmer, og det er med vilje. */
  test('den, der har ventet længst, står øverst', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre({ id: 1, bord_nummer: '3', oprettet: forSiden(2) }),
      ordre({ id: 2, reference: 'SM260806-BBBBB', bord_nummer: '7', oprettet: forSiden(20) }),
    ]);
    const bordene = page.locator('.koek-kort .koek-bord');
    await expect(bordene.nth(0)).toHaveText('Bord 7');
    await expect(bordene.nth(1)).toHaveText('Bord 3');
  });
});

// ============================================================
//  2) ÉT TRYK PR. TRIN
// ============================================================
test.describe('Modtaget → Tilberedes → Klar → Serveret', () => {

  /* Kortet skal FLYTTE SIG ved trykket. Gør det ikke det, trykker
     personalet igen — og så springer bestillingen et trin over.
     Derfor henter køkkenet listen igen, før den kvitterer; se
     videre() i js/admin/koekken.js. */
  test('ét tryk ad gangen fører hele vejen igennem', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);

    await expect(kort(page, '7')).toContainText('Modtaget');
    await kort(page, '7').locator('.koek-knap').click();

    await expect(kort(page, '7')).toContainText('Tilberedes');
    await expect(kort(page, '7').locator('.koek-knap')).toHaveText('Meld klar');
    expect((await gemteData(page)).bestillinger[0].status).toBe('tilberedes');

    await kort(page, '7').locator('.koek-knap').click();
    await expect(kort(page, '7')).toContainText('Klar');
    expect((await gemteData(page)).bestillinger[0].status).toBe('klar');

    // Sidste tryk lukker sagen — og så er kortet ikke arbejde mere.
    await kort(page, '7').locator('.koek-knap').click();
    await expect(page.locator('.koek-kort')).toHaveCount(0);
    expect((await gemteData(page)).bestillinger[0].status).toBe('serveret');
  });

  /* Der er ÉN knap pr. kort ud over undtagelsen. Fire knapper er
     fire steder at ramme forkert med en fedtet finger. */
  test('kortet har ét næste trin, ikke fire', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);
    await expect(kort(page, '7').locator('.koek-knap')).toHaveCount(1);
    await expect(kort(page, '7').locator('.koek-knap')).toHaveText('Start tilberedning');
  });

  /* 'bekraeftet' er ikke køkkenets ord, men kortet står OGSÅ på
     Bestillinger, og trykker nogen "Bekræft" dér, skal køkkenet
     stadig kunne komme videre. */
  test('en bekræftet bordbestilling kan stadig sættes i gang', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ status: 'bekraeftet' })]);
    await expect(kort(page, '7')).toContainText('Bekræftet');
    await kort(page, '7').locator('.koek-knap').click();
    await expect(kort(page, '7')).toContainText('Tilberedes');
  });

  /* Afvis er en UNDTAGELSE, ikke et trin — og gæsten sidder ved
     bordet uden at få besked af systemet. Spørgsmålet siger det. */
  test('"Kan ikke laves" spørger først og siger, at man skal ud til bordet', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);

    let spurgt = '';
    page.on('dialog', (d) => { spurgt = d.message(); d.accept(); });

    await kort(page, '7').locator('.knap.fare').click();
    await expect(page.locator('.koek-kort')).toHaveCount(0);
    expect(spurgt).toContain('bord 7');
    expect(spurgt).toContain('gå ud og sig det');
    expect((await gemteData(page)).bestillinger[0].status).toBe('afvist');
  });

  test('fortryder man afvisningen, sker der ingenting', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);
    page.on('dialog', (d) => d.dismiss());
    await kort(page, '7').locator('.knap.fare').click();
    await expect(kort(page, '7')).toBeVisible();
    expect((await gemteData(page)).bestillinger[0].status).toBe('ny');
  });
});

// ============================================================
//  3) VENTETIDEN ER SKÆRMENS ALARM
// ============================================================
test.describe('Ventetiden tikker og bliver rød', () => {

  test('minutterne regnes fra da bestillingen kom ind', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ oprettet: forSiden(9) })]);
    await expect(kort(page, '7').locator('.koek-min')).toHaveText('9 min');

    /* Klokkeslættet skrives i BROWSERENS tid, og prøvemaskinen
       står i UTC, mens havnen står i UTC+2. Derfor regnes det
       forventede ud af det samme øjeblik i stedet for at stå som
       et fast tal — ellers ville prøven fejle den dag, den kørte
       på en maskine med dansk ur. */
    const t = new Date(forSiden(9));
    const vent = ('0' + t.getHours()).slice(-2) + '.' + ('0' + t.getMinutes()).slice(-2);
    await expect(kort(page, '7').locator('.koek-kl')).toHaveText('kl. ' + vent);
  });

  /* Grænsen er 15 minutter, og den er briefens. Prøven måler den
     BEREGNEDE farve: en klasse, der ikke slår igennem i CSS'en,
     er ingen alarm. */
  test('under 15 minutter er kortet ikke rødt', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ oprettet: forSiden(14) })]);
    await expect(kort(page, '7')).not.toHaveClass(/sent/);
  });

  test('fra 15 minutter er ventetiden rød', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ oprettet: forSiden(15) })]);
    await expect(kort(page, '7')).toHaveClass(/sent/);

    const farve = await kort(page, '7').locator('.koek-min')
      .evaluate((el) => getComputedStyle(el).color);
    const kant = await kort(page, '7')
      .evaluate((el) => getComputedStyle(el).borderLeftColor);
    expect(farve, 'ventetiden er ikke rød efter 15 minutter').not.toBe(kant);
    expect(farve).toMatch(/^rgb\(1[5-9]\d|^rgb\(2[0-2]\d/);   // en rød tone
  });
});

// ============================================================
//  4) ALLE BORDE
// ============================================================
test.describe('Alle borde: hvem venter, og hvor længe', () => {

  test('striben viser ét felt pr. bord med åbne ordrer', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre({ id: 1, bord_nummer: '7', oprettet: forSiden(4) }),
      ordre({ id: 2, reference: 'SM260806-BBBBB', bord_nummer: '3', oprettet: forSiden(6) }),
    ]);
    await expect(page.locator('.koek-bordchip')).toHaveCount(2);
    await expect(page.locator('.koek-bordchip').filter({ hasText: 'Bord 7' }))
      .toContainText('1 ordre');
  });

  /* "Bestil mere" lægger en NY ordre på det samme bord — samme
     regning, samme bord. Striben skal vise, at der er to. */
  test('to ordrer på samme bord tælles sammen i ét felt', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre({ id: 1, oprettet: forSiden(4) }),
      ordre({ id: 2, reference: 'SM260806-BBBBB', oprettet: forSiden(18) }),
    ]);
    await expect(page.locator('.koek-bordchip')).toHaveCount(1);
    await expect(page.locator('.koek-bordchip')).toContainText('2 ordrer');
    // Den ældste af de to bestemmer ventetiden — ellers ser et
    // bord, der har ventet i 18 minutter, ud som et nyt bord.
    await expect(page.locator('.koek-bordchip')).toContainText('18 min');
    await expect(page.locator('.koek-bordchip')).toHaveClass(/sent/);
  });
});

// ============================================================
//  5) NOTEN OG BELØBET
// ============================================================
test.describe('Kortet siger det, køkkenet skal vide', () => {

  /* "Uden remoulade" og "allergi" er ikke en detalje. Noten skal
     stå fremhævet og ikke som en linje mere i listen. */
  test('gæstens besked står i sin egen fremhævede boks', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ besked: 'Uden remoulade — allergi' })]);
    const note = kort(page, '7').locator('.koek-note');
    await expect(note).toContainText('Uden remoulade — allergi');

    const bund = await note.evaluate((el) => getComputedStyle(el).backgroundColor);
    const kortBund = await kort(page, '7').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bund, 'noten står på samme flade som kortet og kan ikke ses')
      .not.toBe(kortBund);
  });

  test('uden en besked er der ingen tom notebox', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);
    await expect(kort(page, '7').locator('.koek-note')).toHaveCount(0);
  });

  /* DER ER INGEN BETALING I SYSTEMET. Beløbet er en huskeseddel
     til den, der tager imod — aldrig et "betalt"-mærke. Et sådant
     mærke ville være en påstand, ingen har dækning for. */
  test('beløbet står med "betales ved lugen" og aldrig som betalt', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);
    await expect(kort(page, '7').locator('.koek-kr')).toContainText('betales ved lugen');
    await expect(kort(page, '7')).not.toContainText(/betalt/i);
  });

  test('varelinjerne står med antal', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({
      linjer: [
        { navn: 'Fiskefilet', antal: 2, pris: 75 },
        { navn: 'Pommes frites', antal: 1, pris: 35 },
      ],
    })]);
    const linjer = kort(page, '7').locator('.koek-linje');
    await expect(linjer).toHaveCount(2);
    await expect(linjer.nth(0)).toContainText('2 ×');
    await expect(linjer.nth(0)).toContainText('Fiskefilet');
  });
});

// ============================================================
//  6) KONTAKTEN
// ============================================================
test.describe('Åbent og lukket for bordbestilling', () => {

  /* Standarden er ÅBEN. En kontakt, ingen har rørt, må ikke kunne
     slukke for noget, der virkede i går. */
  test('kontakten står på åben, når ingen har rørt den', async ({ page }) => {
    await åbnKoekkenet(page, []);
    await expect(page.locator('#bord-aaben')).toBeChecked();
  });

  test('kontakten gemmer med det samme', async ({ page }) => {
    await åbnKoekkenet(page, []);
    await page.locator('#bord-aaben').uncheck();
    await expect(page.locator('#kvittering')).toContainText('lukket');
    expect((await gemteData(page)).indstillinger.bordbestilling_aaben).toBe(false);
  });

  /* Briefens accepttest 5: nye scanninger møder lukkebeskeden,
     mens det, der er i køen, kører færdigt. */
  test('lukket lukker gæstens side — og køen kører videre', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()], {
      indstillinger: Object.assign({}, grunddata().indstillinger,
        { bordbestilling_aaben: false }),
    });

    // Køen er urørt: det, der er bestilt, skal stadig laves.
    await expect(kort(page, '7')).toBeVisible();
    await expect(kort(page, '7').locator('.koek-knap')).toBeEnabled();

    // Og gæsten, der scanner nu, får beskeden.
    await åbn(page, '/ved-bordet/?bord=7', {
      ur: UR,
      data: grunddata({
        borde: BORDE,
        indstillinger: Object.assign({}, grunddata().indstillinger,
          { bordbestilling_aaben: false }),
      }),
    });
    await expect(page.locator('#bestil-lukket')).toContainText('Kom op til lugen');
    await expect(page.locator('#bestil-form')).toBeHidden();
  });

  /* To kontakter og ikke én: der kan være åbent for smørrebrød ud
     af huset, mens køkkenet ikke kan nå at servere ved bordene. */
  test('bordene kan lukkes, mens mad ud af huset er åben', async ({ page }) => {
    await åbn(page, '/bestil/', {
      ur: UR,
      data: grunddata({
        borde: BORDE,
        indstillinger: Object.assign({}, grunddata().indstillinger,
          { bordbestilling_aaben: false }),
      }),
    });
    await expect(page.locator('#bestil-form')).toBeVisible();
  });

  test('ventetiden gemmer sig selv og afviser et umuligt tal', async ({ page }) => {
    await åbnKoekkenet(page, []);
    await page.locator('#bord-ventetid').fill('20');
    await page.locator('#bord-ventetid').blur();
    await expect(page.locator('#p-koekken .gemt-maerke')).toContainText('Gemt');
    expect((await gemteData(page)).indstillinger.bord_ventetid_min).toBe(20);

    await page.locator('#bord-ventetid').fill('400');
    await page.locator('#bord-ventetid').blur();
    await expect(page.locator('#p-koekken .gemt-maerke')).toContainText('0–180');
    expect((await gemteData(page)).indstillinger.bord_ventetid_min).toBe(20);
  });
});

// ============================================================
//  7) SKÆRMEN I SØJLEN
// ============================================================
test.describe('Restaurant står for sig i søjlen', () => {

  test('gruppen har sin egen overskrift på computer', async ({ page }) => {
    test.skip(test.info().project.name === 'mobil',
      'Overskrifter i søjlen findes kun fra 900 px — fanerne er en stribe i bunden på en telefon');
    await åbnKoekkenet(page, []);
    await expect(page.locator('.fane-gruppe', { hasText: 'Restaurant' })).toBeVisible();
  });

  /* Sidens navn skrives af den valgte fanes tekst — uden ikonet og
     uden tallet. "👨‍🍳 Køkken-kø 3" er ikke en overskrift. */
  test('sidens navn er fanens navn', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);
    await expect(page.locator('#fane-titel')).toHaveText('Køkken-kø');
  });

  /* Der er ingen "Hent på ny". Skærmen står tændt i køkkenet, og
     en knap, nogen skal huske at trykke på, er en kø, der står
     stille. */
  test('der er ingen hent-knap på skærmen', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);
    await expect(page.locator('#p-koekken')).toContainText('opdaterer sig selv');
    await expect(page.locator('#p-koekken button', { hasText: /hent/i })).toHaveCount(0);
  });
});
