/* EN VARE UDEN PRIS KAN SES, MEN IKKE BESTILLES

   Den kunne bestilles før — "??" på listen, og gæsten fik prisen,
   "når vi ringer og bekræfter" (kundens ord 23/8). Men opkaldet
   forsvandt samme dag: auto_bekraeft blev slået til, og "bestilt
   er bestilt". Så var der ingen tilbage til at sige prisen —
   bestillingen gik bare igennem, gæsten anede ikke, hvad den
   kostede, og i salgstallene talte varen som 0 kr.

   Præcis den fejl stod fire dage i spiis' produktionsdatabase,
   før nogen så den (25/8): kurven sagde "i alt 10 kr.", og det
   var kun emballagen. Hos os er hullet større — over halvdelen af
   kortets 242 varer står uden pris, til ejeren har skrevet
   tallene.

   Reglen er nu fyldets (model A), bare for hele kortet: kan vi
   prissætte det, kan det bestilles — kan vi ikke, kan der ringes.
   Databasens halvdel prøves i supabase/proev-pris-vaern.sql
   (8 prøver); her måles den halvdel, en browser kan se.

   Uret står torsdag 6. august 2026 kl. 13.00 dansk tid. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-08-06T11:00:00Z';

/* Et stykke smørrebrød uden pris, side om side med de prissatte.
   Kategori 1 er Smørrebrød i grunddata — den, bestil/ sælger. */
function dataMedPrisloes() {
  const d = grunddata();
  d.menu_varer = d.menu_varer.concat([{
    id: 91, kategori_id: 1, navn: 'Ugens særlige', beskrivelse: 'Spørg efter den.',
    pris: null, fremhaevet: false, udsolgt: false, sortering: 9, aktiv: true,
  }]);
  return d;
}

async function åbnBestil(page, data) {
  await åbn(page, '/bestil/', { ur: UR, data: data || grunddata() });
  await page.waitForSelector('#bestil-stykker .stk-linje');
}

test.describe('På siden: uden plusknap, med et nummer', () => {

  test('varen står på listen — men uden tæller', async ({ page }) => {
    await åbnBestil(page, dataMedPrisloes());

    const linje = page.locator('.stk-linje', { hasText: 'Ugens særlige' });
    await expect(linje).toBeVisible();
    await expect(linje, 'en vare uden pris fik en plusknap')
      .not.toHaveClass(/(^| )valgt/);
    await expect(linje.locator('button', { hasText: '+' })).toHaveCount(0);
    await expect(linje.locator('.taeller')).toHaveCount(0);
  });

  /* Spiis' egen form: "vises stadig, uden plusknap, med en
     forklaring og et trykbart nummer". Nummeret er handlingen —
     uden det er rækken bare en vare, man ikke kan få. */
  test('handlingen er telefonen, og nummeret er det rigtige', async ({ page }) => {
    await åbnBestil(page, dataMedPrisloes());

    const chip = page.locator('.stk-linje', { hasText: 'Ugens særlige' })
      .locator('.spoerg-chip');
    await expect(chip).toContainText('Ring og hør prisen');
    expect(await chip.getAttribute('href'), 'nummeret er ikke forretningens')
      .toContain('28871343');
  });

  /* ⚠️ "UDEN" ER IKKE LÆNGERE GRUNDDATA (31/8). Siden 1 mad blev
     1 mad, er grunddataens to prisløse fyld VARER — altså står
     noten med rette. Prøven laver derfor sin egen prissatte
     verden i stedet for at læne sig op ad, at grunddata
     tilfældigvis er tom for prisløse. */
  test('noten under listen tændes — og kun når der er noget at forklare', async ({ page }) => {
    await åbnBestil(page, dataMedPrisloes());
    await expect(page.locator('#bestil-pris-note')).toBeVisible();
    await expect(page.locator('#bestil-pris-note')).toContainText('kan den ikke bestilles');

    const altPrissat = grunddata();
    altPrissat.menu_varer = altPrissat.menu_varer.map(
      (v) => Object.assign({}, v, { pris: v.pris === null ? 55 : v.pris }));
    await åbnBestil(page, altPrissat);
    await expect(page.locator('#bestil-pris-note')).toBeHidden();
  });

  /* Samme navn prissat i en ANDEN kategori: den regel bor i
     databasen og prøves i proev-pris-vaern.sql nr. 4 — bestil/ er
     kun-smoer og viser slet ikke de andre kategorier, så herfra
     kan den ikke måles. Klienten viser bare hver række, som dens
     egen pris siger: den prissatte med tæller, den prisløse med
     nummer. */
});

test.describe('Kurven kan ikke bære den — heller ikke ad bagvejen', () => {

  /* DEN VIGTIGSTE. En gammel fane (eller en delt kurv i
     localStorage) har varen liggende fra før. Send-knappen er
     sidste chance for at sige fra, og øvetilstanden skal opføre
     sig som databasen — ellers er det ikke en øvelse. */
  test('en prisløs vare i en gammel kurv afvises ved send — med navn', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('mosede_kurv_v1', JSON.stringify({
          stk: { 'Flæskestegssandwich': 1, 'Ugens særlige': 2 }, fyld: [],
          hvordan: 'afhentning',
        }));
      } catch (e) { /* ignoreres */ }
    });
    await åbnBestil(page, dataMedPrisloes());

    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304050');
    await page.locator('#bestil-send').click();
    const kig = page.locator('#bestil-kig');
    if (await kig.isVisible()) await page.locator('#kig-send').click();

    const fejl = page.locator('#kig-fejl, #bestil-fejl').filter({ hasText: /./ }).first();
    await expect(fejl).toContainText('Ugens særlige');
    await expect(fejl).toContainText('ikke fået en pris');
    await expect(page.locator('#bestil-tak')).toBeHidden();
    expect(((await gemteData(page)).bestillinger || []),
      'bestillingen med den prisløse vare landede alligevel').toHaveLength(0);
  });

  /* ⚠️ VENDT MED MODELLEN (31/8). Her stod: "fyld uden pris er
     ØNSKER (model A) og skal stadig kunne sendes — værnet må
     aldrig lukke smørrebrødsbestillingen."

     Ønskerne findes ikke mere ("1 mad er som 1 mad"), men det,
     prøven BAR, står ved magt og er vigtigere end før: en
     prisløs vare i listen må ikke kunne spærre for en
     bestilling af noget, der HAR en pris. Med de 29 fyld nu i
     samme liste er der langt flere prisløse rækker at komme til
     at spærre på. */
  test('en prisløs vare i listen spærrer ikke for resten', async ({ page }) => {
    await åbnBestil(page, dataMedPrisloes());
    /* Første række med en tæller — de prisløse har ingen. */
    const op = page.locator('#bestil-stykker .stk-linje button', { hasText: '+' }).first();
    await op.click();

    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304051');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.linjer.length).toBe(1);
    expect(b.linjer[0].pris, 'den prisløse red med i bestillingen').toBeTruthy();
  });

  /* Dagens ret uden pris: samme regel. Før red den med som "pris
     følger" — og med auto_bekraeft hørte gæsten først prisen ved
     lugen. */
  test('dagens ret uden pris kan ses men ikke lægges i kurven', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 0;
    d.indstillinger.dagens_ret = { navn: 'Stegt flæsk', beskrivelse: '', pris: null };
    await åbnBestil(page, d);

    const linje = page.locator('.stk-linje', { hasText: 'Stegt flæsk' });
    await expect(linje).toBeVisible();
    await expect(linje.locator('button', { hasText: '+' })).toHaveCount(0);
    await expect(linje.locator('.spoerg-chip')).toBeVisible();
  });
});

test.describe('Salg siger det højt', () => {

  const bestilling = (æ) => ({
    id: 1, lokation_id: 'mosede', reference: 'SM260806-AAAAA',
    navn: 'Anna', telefon: '20304050', hent_dato: '2026-08-06',
    hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
    fyld: [], antal: 2, status: 'afhentet', intern_note: null,
    oprettet: '2026-08-06T09:00:00Z', ...æ,
  });

  /* Tallet SER færdigt ud, når en prisløs linje lægges til som
     nul — det var præcis dét, der gjorde spiis-fejlen usynlig i
     fire dage. Derfor en advarsel, ikke en stille afrunding. */
  test('en linje uden pris i perioden giver en advarsel', async ({ page }) => {
    await åbnAdmin(page, {
      ur: UR,
      data: grunddata({
        bestillinger: [
          bestilling({}),
          bestilling({
            id: 2, reference: 'SM260806-BBBBB',
            linjer: [{ navn: 'Ugens særlige', antal: 1, pris: null }], antal: 1,
          }),
        ],
      }),
    });
    await visFane(page, 'p-salg');

    const advarsel = page.locator('#salg-tal .fejl');
    await expect(advarsel).toContainText('ingen pris');
    await expect(advarsel).toContainText('for lavt');
  });

  test('uden prisløse linjer er der ingen advarsel', async ({ page }) => {
    await åbnAdmin(page, {
      ur: UR, data: grunddata({ bestillinger: [bestilling({})] }),
    });
    await visFane(page, 'p-salg');
    await expect(page.locator('#salg-tal .tal-felt').first()).toBeVisible();
    await expect(page.locator('#salg-tal .fejl')).toHaveCount(0);
  });
});

/* ============================================================
   VED BORDET SIDDER GÆSTEN ALLEREDE

   Kundens spørgsmål (27/8): "ved qr code bestilling sidder de der
   jo, så de skal ikke ringe og høre dem ad."

   Han har ret, og det var målt forkert: på ved-bordet/?bord=7
   havde hver vare uden pris en knap med tel:+4528871343 — mens
   sidens EGEN note lige under sagde "sig det til os ved lugen".
   To modsatte beskeder på den samme skærm, og den ene bad gæsten
   ringe til en luge, hun kan se tyve meter væk.

   Det er den samme regel, der allerede gjaldt sms-nødudgangen på
   den side. Nu gælder den også prisen.
   ============================================================ */

const BORDE_UP = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 },
];

async function åbnBordet(page, data) {
  await åbn(page, '/ved-bordet/?bord=7', {
    ur: UR,
    data: data || grunddata({ borde: BORDE_UP }),
  });
}

/* Ved bordet sælges hele lugens kort (uden fyldet), så den
   prisløse vare skal være noget, der står på DEN liste.
   Kategori 1 er Smørrebrød, som bestil/ bruger — her lægges den i
   samme kategori, men siden hentes med borde på. */
function bordDataMedPrisloes() {
  const d = grunddata({ borde: BORDE_UP });
  d.menu_varer = d.menu_varer.concat([{
    id: 91, kategori_id: 1, navn: 'Ugens særlige', beskrivelse: 'Spørg efter den.',
    pris: null, fremhaevet: false, udsolgt: false, sortering: 9, aktiv: true,
  }]);
  return d;
}

test.describe('Ved bordet ringer man ikke', () => {

  test('rækken siger spørg os — ikke ring', async ({ page }) => {
    await åbnBordet(page, bordDataMedPrisloes());
    const chip = page.locator('.stk-linje', { hasText: 'Ugens særlige' })
      .locator('.spoerg-chip');
    await expect(chip).toContainText('Spørg os om prisen');
    await expect(chip).not.toContainText('Ring');
  });

  /* ⚠️ DEN VIGTIGE. Teksten kan man rette; et tel:-link er en
     HANDLING, og telefonen ringer op, i det sekund fingeren
     rammer. Prøven ser efter selve linket, ikke efter ordet. */
  test('og der er ingen telefon at trykke på', async ({ page }) => {
    await åbnBordet(page, bordDataMedPrisloes());
    const linje = page.locator('.stk-linje', { hasText: 'Ugens særlige' });
    expect(await linje.locator('a[href^="tel:"]').count(),
      'der er stadig et telefonlink ved bordet').toBe(0);
    expect(await linje.locator('.spoerg-chip').evaluate((e) => e.tagName))
      .toBe('SPAN');
  });

  /* Og den må ikke smitte af på de to andre sider: dér ER
     telefonen svaret, for gæsten står ikke ved lugen. */
  test('på bestil/ er telefonen stadig svaret', async ({ page }) => {
    await åbnBestil(page, dataMedPrisloes());
    const chip = page.locator('.stk-linje', { hasText: 'Ugens særlige' })
      .locator('.spoerg-chip');
    await expect(chip).toContainText('Ring og hør prisen');
    expect(await chip.getAttribute('href')).toContain('28871343');
  });
});

/* ⚠️ OG KVITTERINGEN HAVDE DET SAMME PROBLEM (27/8).

   Noten i js/bestilling.js sagde "VED BORDET RINGER VI IKKE", og
   tolv linjer længere nede stod telefonnummeret som kvitteringens
   store, fremhævede knap. Teksten over den er rigtig ("Vi kommer
   med det"); knappen sendte gæsten den forkerte vej. */
test.describe('Kvitteringen ved bordet sender ikke til telefonen', () => {

  test('ingen ring-knap på bordets kvittering — men bestil mere står', async ({ page }) => {
    await åbnBordet(page);
    await page.locator('#bestil-stykker .stk-linje').first()
      .locator('button', { hasText: '+' }).click();
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304050');
    await page.locator('#bestil-send').click();
    // Det sidste kig ligger mellem knappen og kvitteringen.
    await page.locator('#kig-send').click();

    const tak = page.locator('#bestil-tak');
    await expect(tak).toContainText('bord 7');
    expect(await tak.locator('a[href^="tel:"]').count(),
      'kvitteringen ved bordet har stadig en ring-knap').toBe(0);
    await expect(tak.locator('button', { hasText: 'Bestil noget mere' })).toBeVisible();
  });

  test('… men på bestil/ er den der stadig', async ({ page }) => {
    await åbnBestil(page);
    await page.locator('#bestil-stykker .stk-linje').first()
      .locator('button', { hasText: '+' }).click();
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304050');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();

    const tak = page.locator('#bestil-tak');
    await expect(tak).toBeVisible();
    expect(await tak.locator('a[href^="tel:"]').count()).toBe(1);
  });
});
