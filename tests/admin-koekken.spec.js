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
const { åbnAdmin, åbn, grunddata, gemteData, visFane } = require('./hjaelp');

/* ⚠️ VENTETID OG LOFT LIGGER BAG EN FOLD (27/8).

   Køen skal være det første, et køkken ser; de to tal sættes én
   gang om året. Kontakten "Åbent for bordbestilling" står stadig
   frit — den bruges under pres. Prøverne går den vej, et menneske
   går: åbn folden først. */
async function aabnKoekkenIndstillinger(page) {
  const fold = page.locator('#koekken-indstillinger');
  if (await fold.count() && !(await fold.evaluate((e) => e.open))) {
    await fold.locator('> summary').click();
  }
}

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

/* ⚠️ indstillinger SKAL FLETTES, IKKE ERSTATTES. grunddata
   spreder ændringerne hen over standarden, så et helt
   indstillingsobjekt ville tørre dagens besked, sæsonen og
   kontakt-mailen af — og prøven ville måle en anden forretning
   end den, resten af filen måler på. */
async function åbnKoekkenet(page, bestillinger, indst, ekstra) {
  const grund = grunddata();
  await åbnAdmin(page, {
    ur: UR,
    data: grunddata(Object.assign({
      borde: BORDE,
      bestillinger: bestillinger,
      indstillinger: Object.assign({}, grund.indstillinger, indst || {}),
    }, ekstra || {})),
  });
  await visFane(page, 'p-koekken');
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
/* ⚠️ AFSNITTET ER VENDT — OG DET ER EN KUNDEBESLUTNING  (31/8).

   Her stod tre prøver, der vogtede kæden ny → tilberedes → klar →
   serveret som TRE tryk med hver sin knaptekst.

   Kundens ord 31/8: *"i køkken kø ... ik noget med start
   tilberedning, bare en done eller færdig knap og ik mere end
   det."* Det er den samme beslutning, Bestillinger-fanen fik
   samme dag ("man skal bare trykke færdig, ikke det der
   dobbeltknap-noget").

   Kæden er IKKE fjernet — statusserne står i databasen som før,
   og salgstallene tæller på dem. Mellemtrinnene ligger bag "···".
   Prøverne vogter derfor tre ting nu:

     1) ét tryk lukker sagen, uanset hvor den står
     2) mellemtrinnene KAN stadig nås, for køkkenet vil gerne
        kunne markere "den er i gang", så to kokke ikke laver
        den samme ret
     3) og de to skærme giver det SAMME ene tryk — kæden bor ét
        sted (Admin.naesteTrin / FAERDIG_TRIN) */
test.describe('Ét tryk: Færdig', () => {

  /* Kortet skal FLYTTE SIG ved trykket. Gør det ikke det, trykker
     personalet igen — og så springer bestillingen et trin over.
     Derfor henter køkkenet listen igen, før den kvitterer; se
     videre() i js/admin/koekken.js. */
  test('ét tryk lukker sagen, uanset hvor den står', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);

    await expect(kort(page, '7')).toContainText('Modtaget');
    await expect(kort(page, '7').locator('.koek-knap')).toContainText('Færdig');
    await kort(page, '7').locator('.koek-knap').click();

    await expect(page.locator('.koek-kort')).toHaveCount(0);
    expect((await gemteData(page)).bestillinger[0].status).toBe('serveret');
  });

  /* ⚠️ OG DET SAMME FRA MIDT I KÆDEN. En bestilling, personalet
     har markeret som "i gang", må ikke have en anden knap end en,
     der lige er kommet ind — så ville øjet skulle læse status,
     før hånden kunne trykke. */
  test('også en, der er sat i gang, har ét tryk til Færdig', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ status: 'tilberedes' })]);
    await expect(kort(page, '7').locator('.koek-knap')).toContainText('Færdig');
    await kort(page, '7').locator('.koek-knap').click();
    expect((await gemteData(page)).bestillinger[0].status).toBe('serveret');
  });

  /* Der er ÉN knap fremad pr. kort. Fire knapper er fire steder
     at ramme forkert med en fedtet finger. */
  test('kortet har ét næste trin, ikke fire', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);
    await expect(kort(page, '7').locator('.koek-knap')).toHaveCount(1);
    await expect(kort(page, '7').locator('.koek-knap')).toHaveText('✓ Færdig');
  });

  /* ⚠️ MELLEMTRINNENE ER IKKE FJERNET, DE ER LAGT BAG DØREN. En
     knap, der er væk, er en oplysning, køkkenet ikke kan give. */
  test('"den er i gang" kan stadig markeres bag ···', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);
    const k = kort(page, '7');
    await expect(k.locator('.bestil-mere .knap')).toHaveCount(2);
    await k.locator('.knap-mere').click();
    await k.locator('.bestil-mere .knap', { hasText: 'Start tilberedning' }).click();
    await expect(k).toContainText('Tilberedes');
    expect((await gemteData(page)).bestillinger[0].status).toBe('tilberedes');
  });

  /* ⚠️ OG DØREN FINDES KUN, NÅR DER ER NOGET BAG DEN. Står kortet
     på 'klar', er der ikke noget mellemtrin tilbage — og en "···",
     der åbner ingenting, trykker man på én gang og aldrig igen. */
  test('på "klar" er der ingen dør, for der er intet bag den', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ status: 'klar' })]);
    await expect(kort(page, '7').locator('.knap-mere')).toHaveCount(0);
  });

  /* 'bekraeftet' er ikke køkkenets ord, men kortet står OGSÅ på
     Bestillinger, og trykker nogen "Bekræft" dér, skal køkkenet
     stadig kunne komme videre. */
  test('en bekræftet bordbestilling kan stadig sættes i gang', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ status: 'bekraeftet' })]);
    await expect(kort(page, '7')).toContainText('Bekræftet');
    await kort(page, '7').locator('.knap-mere').click();
    await kort(page, '7').locator('.bestil-mere .knap', { hasText: 'Start tilberedning' }).click();
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
    /* Klokkeslættet er flyttet ned i foden (28/8): det er en
       oplysning til den, der undersøger noget bagefter, ikke til
       den, der laver mad nu. Minutterne er tallet i toppen. */
    await expect(kort(page, '7').locator('.koek-kl')).toHaveText('bestilt ' + vent);
  });

  /* Grænsen er 15 minutter, og den er briefens. Prøven måler den
     BEREGNEDE farve: en klasse, der ikke slår igennem i CSS'en,
     er ingen alarm. */
  test('under 15 minutter er kortet ikke rødt', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ oprettet: forSiden(14) })]);
    await expect(kort(page, '7')).not.toHaveClass(/sent/);
  });

  /* ⚠️ URET ER EN PILLE NU (28/8), og den røde er FLADEN.
     Prøven måler den beregnede baggrund og sammenligner med et
     kort, der IKKE er sent — tallet skal komme udefra, ikke fra
     det, prøven selv måler på. */
  test('fra 15 minutter er ventetiden rød', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre({ id: 1, bord_nummer: '7', oprettet: forSiden(15) }),
      ordre({ id: 2, reference: 'SM260806-BBBBB', bord_nummer: '3',
        oprettet: forSiden(2) }),
    ]);
    await expect(kort(page, '7')).toHaveClass(/sent/);
    await expect(kort(page, '3')).not.toHaveClass(/sent/);

    const sen = await kort(page, '7').locator('.koek-ur')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const rolig = await kort(page, '3').locator('.koek-ur')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(sen, 'uret ser ens ud, sent og ikke sent').not.toBe(rolig);
    expect(sen).toMatch(/^rgb\(2[0-2]\d/);   // en rød tone
  });

  /* ⚠️ EJERENS EGET TAL SLÅR VORES (28/8).

     "Forventet ventetid" er dét, gæsten får at se, når hun
     scanner. Er den sat til 10, HAR vi lovet 10 — og så er 12
     minutter for længe, uanset hvad briefen sagde. Uden det her
     ville skærmen have to sandheder om den samme bestilling. */
  test('men ejerens forventede ventetid bestemmer grænsen', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ oprettet: forSiden(12) })],
      { bord_ventetid_min: 10 });
    await expect(kort(page, '7')).toHaveClass(/sent/);
    await expect(page.locator('#koekken-obs-kort'))
      .toContainText('den burde tage 10');
  });

  /* Og uden et tal loves der ingenting — så skriver skærmen
     heller ikke et, som om nogen havde sagt det. */
  test('uden et tal skriver kortet ikke hvad den burde tage', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ oprettet: forSiden(20) })]);
    const obs = page.locator('#koekken-obs-kort');
    await expect(obs).toContainText('Bord 7 har ventet for længe');
    await expect(obs).toContainText('20 min siden de bestilte');
    await expect(obs).not.toContainText('burde tage');
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
    await åbnKoekkenet(page, [ordre()], { bordbestilling_aaben: false });

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
    await aabnKoekkenIndstillinger(page);
    await page.locator('#bord-ventetid').fill('20');
    await aabnKoekkenIndstillinger(page);
    await page.locator('#bord-ventetid').blur();
    await expect(page.locator('#p-koekken .gemt-maerke')).toContainText('Gemt');
    expect((await gemteData(page)).indstillinger.bord_ventetid_min).toBe(20);

    await aabnKoekkenIndstillinger(page);
    await page.locator('#bord-ventetid').fill('400');
    await aabnKoekkenIndstillinger(page);
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

  /* ⚠️ EN OVERSKRIFT LUKKER IKKE SIG SELV.

     Første udgave havde ÉN gruppe — "Restaurant" — og så læste
     øjet de otte faner bagefter som en del af den: Baglokalet,
     Salg, Menukort, Nyheder, Beskeder, Forside, Kontakt og
     Historik stod alle sammen under Restaurant. Det kunne ikke
     ses i koden, kun på skærmen.

     Prøven læser søjlen i rækkefølge og kræver, at Restaurant kun
     har de to faner, den skal have — og at der ikke ligger noget
     efter den sidste gruppe. */
  test('hver gruppe i søjlen holder kun sine egne faner', async ({ page }) => {
    await åbnKoekkenet(page, []);

    const raekken = await page.locator('.faner > *').evaluateAll((noder) =>
      noder.map((n) => ({
        gruppe: n.classList.contains('fane-gruppe'),
        // Kun tekstknuderne: ikonet og tallet er ikke navnet.
        navn: [...n.childNodes].filter((c) => c.nodeType === 3)
          .map((c) => c.nodeValue).join('').trim(),
      })));

    // Ingen fane må stå FØR den første overskrift — så ville den
    // ligge i ingenting.
    expect(raekken[0].gruppe, 'der ligger faner før den første gruppe').toBe(true);

    const grupper = {};
    let nu = null;
    raekken.forEach((r) => {
      if (r.gruppe) { nu = r.navn; grupper[nu] = []; } else grupper[nu].push(r.navn);
    });

    expect(Object.keys(grupper)).toEqual(
      ['Dagen', 'Restaurant', 'Forretningen', 'Hjemmesiden', 'Log']);
    expect(grupper.Restaurant, 'Restaurant har fået faner, der ikke hører til den')
      .toEqual(['Køkken-kø', 'Borde']);
    /* ⚠️ PERSONALE KOM TIL 2/9 og hører til her: "hvem gjorde
       hvad" og "hvem må hvad" er det samme spørgsmål set fra hver
       sin side. Listen er rettet MED en note — reglen, prøven
       vogter, er urørt: der må ikke ligge en fane UDEN for en
       gruppe, og optællingen nedenfor er det, der beviser det. */
    expect(grupper.Log, 'der ligger faner efter den sidste gruppe')
      .toEqual(['Historik', 'Personale']);
    // Og alle femten faner skal være med — ingen må falde ud af en
    // gruppe og blive usynlig.
    const alle = Object.keys(grupper).reduce((n, k) => n + grupper[k].length, 0);
    expect(alle).toBe(await page.locator('.faner button').count());
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

/* ============================================================
   ALLERGIEN PÅ KØKKENETS SKÆRM
   ------------------------------------------------------------
   Gæsten ved bordet har fået sit eget felt til den, og
   js/bestilling.js sætter ordet ALLERGI: foran beskeden. Her
   måles den anden halvdel: at ordet FAKTISK gør noget synligt.

   Uden det er hele feltet til ingen nytte — allergien ville stå
   som en almindelig note mellem "uden remoulade" og "vi sidder
   ude bagved", og køkkenet skimmer den slags i en travl frokost.

   ⚠️ Prøven læser den BEREGNEDE farve. En klasse, der ikke slår
   igennem, er ingen regel — klasserne stod i JavaScript i en
   uge, før nogen opdagede, at der ikke var CSS bag dem.
   ============================================================ */
test.describe('Allergien kan ikke skimmes forbi', () => {

  test('en besked med ALLERGI: markeres rødt — en almindelig gør ikke', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre({ id: 1, reference: 'SM260806-ALLER', besked: 'ALLERGI: Nødder' }),
      ordre({ id: 2, reference: 'SM260806-ALMIN', besked: 'Uden remoulade',
        bord_nummer: '3', navn: 'Bord 3', oprettet: forSiden(2) }),
    ]);

    const allergi = page.locator('.koek-kort', { hasText: 'ALLERGI' });
    const almindelig = page.locator('.koek-kort', { hasText: 'Uden remoulade' });

    await expect(allergi.locator('.koek-note.allergi')).toHaveCount(1);
    await expect(almindelig.locator('.koek-note.allergi')).toHaveCount(0);

    // Farven skal være der i virkeligheden, ikke kun i klassen
    const farver = await page.evaluate(() => {
      function baggrund(el) { return getComputedStyle(el).backgroundColor; }
      const noter = Array.from(document.querySelectorAll('.koek-note'));
      const a = noter.find((n) => n.classList.contains('allergi'));
      const b = noter.find((n) => !n.classList.contains('allergi'));
      return { allergi: baggrund(a), almindelig: baggrund(b),
        kant: getComputedStyle(a).borderTopWidth };
    });
    expect(farver.allergi, 'allerginoten ser ud som en almindelig note')
      .not.toBe(farver.almindelig);
    expect(parseFloat(farver.kant), 'allerginoten har ingen kant').toBeGreaterThan(0);
  });

  /* ⚠️ Kortet SELV skal markeres, ikke kun noten. Noten står
     nederst; i en kø på tolv kort ser personalet toppen af dem. */
  test('hele kortet bærer mærket, ikke kun noten', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ besked: 'ALLERGI: Skaldyr' })]);
    await expect(page.locator('.koek-kort.har-allergi')).toHaveCount(1);
  });

  /* Ordet skal kunne stå med små bogstaver og med luft foran —
     det er gæsten, der har skrevet det, ikke et system. */
  test('allergi: med små bogstaver tæller også', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ besked: '  allergi: laktose' })]);
    await expect(page.locator('.koek-kort.har-allergi')).toHaveCount(1);
  });

  /* Og et ord, der bare NÆVNER allergi midt i en sætning, er
     ikke mærket. Ellers ville "ingen allergi, bare uden løg"
     tænde alarmen — og en alarm, der tænder for tit, holder man
     op med at se. */
  test('allergi nævnt midt i en besked tænder ikke alarmen', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ besked: 'Ingen allergi, bare uden løg' })]);
    await expect(page.locator('.koek-kort.har-allergi')).toHaveCount(0);
    await expect(page.locator('.koek-note.allergi')).toHaveCount(0);
  });
});

/* ============================================================
   SKÆRMEN, KØKKENET STÅR OG KIGGER PÅ  (28/8)

   Kunden sendte to skærmbilleder af en færdig køkkenskærm og
   sagde, at bordbestillinger "er jo en hel anden ting end online
   bestillinger og skal være bl.a. den køkkenet står og kigger på
   og skal være dygtig og intelligent".

   Formen er lånt. Det, der er anderledes, er de steder, hvor
   forlægget påstod noget, systemet ikke ved — se prøven om
   "betalt" nederst.
   ============================================================ */
test.describe('Køkkenskærmens hoved og alarmer', () => {

  test('linjen under navnet siger klokken og hvor meget der skal ud',
    async ({ page }) => {
      await åbnKoekkenet(page, [
        ordre({ id: 1 }),
        ordre({ id: 2, reference: 'SM260806-BBBBB', bord_nummer: '3' }),
      ]);
      const linje = page.locator('#koekken-linje');
      await expect(linje).toContainText('QR-bestillinger fra bordene');
      await expect(linje).toContainText('2 bestillinger skal ud');
    });

  test('og den siger det højt, når bordene er lukket', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()], { bordbestilling_aaben: false });
    await expect(page.locator('#koekken-linje')).toContainText('LUKKET for bordene');
    await expect(page.locator('#koekken-obs-kort'))
      .toContainText('Bordene kan ikke bestille lige nu');
  });

  /* ⚠️ KORTET FINDES KUN, NÅR DER ER NOGET. En fast boks, der som
     regel siger "alt er fint", bliver til udsmykning på en uge —
     og så ses den heller ikke den dag, den siger noget. */
  test('⚠️-kortet er der ikke på en rolig dag', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ oprettet: forSiden(3) })]);
    await expect(page.locator('#koekken-obs-kort')).toBeHidden();
  });

  /* ⚠️ ALLERGIEN ER GÆSTENS EGNE ORD, ikke en ordliste, vi har
     fundet på. Admin.erAllergi kender den på ordet ALLERGI:, som
     gæstens eget felt sætter foran. Teksten citeres, som hun skrev
     den — et referat kan tabe det ene ord, der betød noget. */
  test('en allergi står øverst med gæstens egne ord', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre({ id: 1, bord_nummer: '3', oprettet: forSiden(2),
        besked: 'ALLERGI: Glutenallergi ved bordet — brød ved siden af' }),
    ]);
    const obs = page.locator('#koekken-obs-kort');
    await expect(obs).toBeVisible();
    await expect(obs).toContainText('Allergi ved bord 3');
    await expect(obs).toContainText('Glutenallergi ved bordet — brød ved siden af');
    await expect(obs).toContainText('sig det til den, der laver den');
  });

  /* En almindelig note er ikke en allergi og hører ikke øverst.
     Stod hver eneste "uden agurk" i alarmkortet, ville allergien
     drukne i dem. */
  test('men en almindelig note bliver på kortet', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre({ oprettet: forSiden(2), besked: 'En burger uden agurk' }),
    ]);
    await expect(page.locator('#koekken-obs-kort')).toBeHidden();
    await expect(kort(page, '7')).toContainText('En burger uden agurk');
  });
});

test.describe('Zonerne og runderne', () => {

  /* ⚠️ STRIBEN FINDES KUN, NÅR DER ER MERE END ÉN ZONE. De fleste
     steder har ét hjørne, og "Alle zoner" ved siden af én knap,
     der hedder "Terrassen", er to knapper, der gør det samme. */
  test('én zone giver ingen zonestribe', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ bord_nummer: '7' })]);
    await expect(page.locator('#koekken-zoner')).toHaveClass(/skjult/);
  });

  test('to zoner giver en stribe, og et tryk filtrerer', async ({ page }) => {
    /* Zonen er fri tekst på bordet (borde.zone) og sættes af
       ejeren. De faste prøveborde har ingen — det er med vilje,
       for de fleste steder har ét hjørne. Her sættes de. */
    await åbnKoekkenet(page, [
      ordre({ id: 1, bord_nummer: '7' }),
      ordre({ id: 2, reference: 'SM260806-BBBBB', bord_nummer: '3' }),
    ], {}, {
      borde: [
        Object.assign({}, BORDE[0], { zone: 'Molen' }),
        Object.assign({}, BORDE[1], { zone: 'Terrassen' }),
      ],
    });
    const striben = page.locator('#koekken-zoner');
    await expect(striben).not.toHaveClass(/skjult/);
    await expect(page.locator('.koek-kort')).toHaveCount(2);

    await striben.locator('[data-zone="Terrassen"]').click();
    await expect(page.locator('.koek-kort')).toHaveCount(1);
    await expect(kort(page, '3')).toBeVisible();

    /* ⚠️ MEN TALLET PÅ FANEN TÆLLER STADIG HELE KØEN. Et filter,
       der også skruede ned for tallet i søjlen, ville skjule
       molen for den, der kigger på terrassen — og så holder man
       op med at stole på tallet. */
    await expect(page.locator('#koekken-antal')).toHaveText('2');
    await expect(page.locator('#koekken-linje'))
      .toContainText('2 bestillinger skal ud');
  });

  /* "Bestil mere" lægger en NY ordre på det samme bord — samme
     selskab, samme regning. For køkkenet er runde 2 dessert til
     nogen, der allerede sidder og spiser. */
  test('anden ordre på samme bord er runde 2', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre({ id: 1, oprettet: forSiden(20) }),
      ordre({ id: 2, reference: 'SM260806-BBBBB', oprettet: forSiden(4) }),
    ]);
    const kortene = page.locator('.koek-kort');
    await expect(kortene.first()).not.toContainText('Runde');
    await expect(kortene.nth(1)).toContainText('Runde 2');
  });

  /* ⚠️ DEN TÆLLER OGSÅ DE SERVEREDE — det er hele pointen. Havde
     vi kun talt de åbne, ville runde 2 hedde runde 1, i det sekund
     den første var båret ud. */
  test('og den serverede første runde tæller stadig med', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre({ id: 1, oprettet: forSiden(40), status: 'serveret' }),
      ordre({ id: 2, reference: 'SM260806-BBBBB', oprettet: forSiden(4) }),
    ]);
    await expect(page.locator('.koek-kort')).toHaveCount(1);
    await expect(page.locator('.koek-kort')).toContainText('Runde 2');
  });

  /* ⚠️ MEN IKKE DE AFVISTE. En ordre, køkkenet ikke kunne lave, er
     aldrig blevet til mad, og at kalde den en runde ville sige, at
     bordet havde fået noget. */
  test('en afvist ordre er ikke en runde', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre({ id: 1, oprettet: forSiden(40), status: 'afvist' }),
      ordre({ id: 2, reference: 'SM260806-BBBBB', oprettet: forSiden(4) }),
    ]);
    await expect(page.locator('.koek-kort')).toHaveCount(1);
    await expect(page.locator('.koek-kort')).not.toContainText('Runde');
  });
});

/* ============================================================
   ⚠️ DER MÅ ALDRIG KOMME TIL AT STÅ "BETALT"

   Forlægget til den her skærm skrev "bestilt 12.12 · betalt 280,-"
   under hvert kort. Der ER ingen betaling i systemet — afklaret af
   Mikkel 25/8: "de gør det via kassen ved at tage tingene ind
   manuelt." En tallerken, der bæres ud til et bord, som personalet
   TROR har betalt, er penge ud ad døren.
   ============================================================ */
test.describe('Beløbet er en huskeseddel, ikke en kvittering', () => {

  test('kortet siger betales ved lugen — aldrig betalt', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);
    const k = kort(page, '7');
    await expect(k).toContainText('betales ved lugen');
    await expect(k).not.toContainText(/\bbetalt\b/);
  });
});

/* Den næste handling skal være det nemmeste sted at ramme: skærmen
   bruges med en fedtet finger, mens den anden hånd holder en
   tallerken. Prøven måler den FAKTISKE bredde mod kortets — et
   tal, der kommer udefra. */
test.describe('Knappen fylder hele bredden', () => {

  /* ⚠️ "HELE BREDDEN" ER IKKE LÆNGERE HELE BREDDEN  (31/8).
     Døren til mellemtrinnene ("···") står ved siden af Færdig, og
     den fylder sin egen plads. Prøven sammenligner derfor tre
     UAFHÆNGIGE elementer: knappens bredde mod rummets bredde
     minus dørens. Et spørgsmål til knappen om dens eget
     "width: 100%" ville bestå, også hvis reglen ikke slog
     igennem. */
  test('den store knap fylder alt, der ikke er døren', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);
    const k = kort(page, '7');
    const kb = await k.locator('.koek-knap').boundingBox();
    const rum = await k.locator('.koek-handling').boundingBox();
    const dør = await k.locator('.knap-mere').boundingBox();
    expect(kb.width).toBeGreaterThan(rum.width - dør.width - 14);
    expect(kb.height).toBeGreaterThan(50);
  });
});

/* ============================================================
   FÆRDIGE I DAG — OG ↩ GENDAN  (31/8)
   ------------------------------------------------------------
   Kundens ord: *"det skal ramme historikken, og alt blive gemt og
   kunne gendannes hvis fejltrykkelse."*

   Et fejltryk på Færdig tog kortet ud af køen, og vejen tilbage
   var Bestillinger-fanen — altså et faneskift midt i en frokost,
   hvor køkkenet står med DEN HER skærm foran sig.
   ============================================================ */
test.describe('Færdige i dag kan fortrydes', () => {

  /* ⚠️ FOLDEN FINDES KUN, NÅR DER ER NOGET I DEN. En fold, der som
     regel er tom, bliver til udsmykning på en uge — og så ses den
     heller ikke den dag, nogen har trykket forkert. */
  test('uden noget færdigt findes folden ikke', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);
    /* ⚠️ FØRST AT DEN ER DER, SÅ AT DEN ER SKJULT: toBeHidden() er
       sandt for et element, der slet ikke findes, og så måler
       prøven ingenting (arret fra 30/8). */
    await expect(page.locator('#koekken-faerdige-fold')).toHaveCount(1);
    await expect(page.locator('#koekken-faerdige-fold')).toBeHidden();
  });

  test('et fejltryk på Færdig kan fortrydes uden at skifte fane', async ({ page }) => {
    await åbnKoekkenet(page, [ordre()]);
    await kort(page, '7').locator('.koek-knap').click();
    await expect(page.locator('.koek-kort')).toHaveCount(0);

    const fold = page.locator('#koekken-faerdige-fold');
    await expect(fold).toBeVisible();
    await expect(page.locator('#koekken-faerdige-titel')).toContainText('(1)');

    await fold.locator('summary').click();
    await fold.locator('.koek-faerdig .knap', { hasText: 'Gendan' }).click();

    /* Tilbage i køen — og som "i gang", ikke som ny: kortet HAR
       været set, det var derfor, nogen trykkede. */
    await expect(kort(page, '7')).toBeVisible();
    expect((await gemteData(page)).bestillinger[0].status).toBe('tilberedes');
  });
});

/* ⚠️ ÉT ALARMKORT, DER SIGER DET SAMME TRE GANGE, ER ET KORT, MAN
   HOLDER OP MED AT LÆSE. Målt på en travl frokost med ejerens
   ventetid sat til ti minutter: tre borde over grænsen gav tre
   næsten ens linjer. Det værste bord står med sit tal; resten er
   et antal — hvilke borde det er, står på kortene nedenunder. */
test.describe('Alarmen siger det én gang', () => {

  test('tre sene borde bliver til én linje med et antal', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre({ id: 1, bord_nummer: '1', oprettet: forSiden(28) }),
      ordre({ id: 2, reference: 'SM260806-BBBBB', bord_nummer: '7',
        oprettet: forSiden(18) }),
      ordre({ id: 3, reference: 'SM260806-CCCCC', bord_nummer: '3',
        oprettet: forSiden(16) }),
    ]);
    const obs = page.locator('#koekken-obs-kort');
    // Det værste bord får linjen — de to andre er et tal.
    await expect(obs.locator('.obs-linje')).toHaveCount(1);
    await expect(obs).toContainText('Bord 1 har ventet for længe');
    await expect(obs).toContainText('2 andre borde venter også for længe');
    await expect(obs).not.toContainText('Bord 7 har ventet');
  });

  test('og ét sent bord får ingen hale', async ({ page }) => {
    await åbnKoekkenet(page, [ordre({ oprettet: forSiden(20) })]);
    await expect(page.locator('#koekken-obs-kort')).not.toContainText('venter også');
  });
});

/* Striben er en GENVEJ, ikke en gentagelse: den sagde det samme
   som kortet lige nedenunder. Et tryk fører til bordets ældste
   åbne kort — så er den en indholdsfortegnelse. */
test.describe('Bordstriben fører hen til bordet', () => {

  test('et tryk på et bord markerer bordets kort', async ({ page }) => {
    await åbnKoekkenet(page, [
      ordre({ id: 1, bord_nummer: '7', oprettet: forSiden(20) }),
      ordre({ id: 2, reference: 'SM260806-BBBBB', bord_nummer: '3',
        oprettet: forSiden(4) }),
    ]);
    await expect(kort(page, '3')).not.toHaveClass(/peget-paa/);
    await page.locator('[data-bordchip="3"]').click();
    await expect(kort(page, '3')).toHaveClass(/peget-paa/);
    // Og den slipper igen — en markering, der bliver, er ingen markering.
    await expect(kort(page, '3')).not.toHaveClass(/peget-paa/, { timeout: 4000 });
  });
});
