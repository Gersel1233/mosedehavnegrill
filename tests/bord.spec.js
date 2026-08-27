/* Bordbestillingen (fase 4): gæsten spørger, personalet bekræfter.

   Det vigtigste, filen måler, er LØFTERNE: at formularen ikke kan
   spørge om et bord på en lukkedag, at en tidlig lukning skærer
   aftenens tider af, og at kvitteringen siger højt, at bordet IKKE
   er bekræftet endnu. Databasens egne regler (gæst må skrive, ikke
   læse; bremsen) er bevist for sig i supabase/proev-borde.sql. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

/* Uret i åbn() står på fredag 7. august 2026 kl. 13.00 dansk tid.
   Grunddataene holder åbent 11-21 alle dage. */

const bordønske = (æ) => ({
  id: 1, lokation_id: 'mosede', reference: 'BO260807-AAAAA',
  navn: 'Familien Vind', telefon: '20304050', email: null,
  dato: '2026-08-08', tid: '18:00', antal_personer: 4,
  besked: null, status: 'ny', intern_note: null,
  oprettet: '2026-08-07T10:30:00Z', ...æ,
});

test.describe('Gæsten spørger om et bord', () => {

  test('dagene og tiderne kommer fra åbningstiderne', async ({ page }) => {
    await åbn(page, '/bord/');
    await expect(page.locator('#bord-dage .dag').first()).toBeVisible();
    await expect(page.locator('#bord-dage .dag').first()).toContainText('I dag');

    /* Klokken er 13, og varslet er to timer: første tid i dag er
       15.00 — ikke 11.00, som var åbningstiden. Sidste er 20.30,
       en halv time før der lukkes. */
    const tider = await page.locator('#bord-tid option').allTextContents();
    expect(tider[0]).toBe('kl. 15.00');
    expect(tider[tider.length - 1]).toBe('kl. 20.30');
  });

  test('en lukkedag kan ikke vælges', async ({ page }) => {
    await åbn(page, '/bord/', {
      data: grunddata({
        kalender: [{
          id: 1, lokation_id: 'mosede', type: 'lukkedag', titel: 'Privatfest',
          dato: '2026-08-08', slut_dato: null, lukker_kl: null, offentlig: false,
        }],
      }),
    });
    const datoer = await page.locator('#bord-dage .dag .dag-dato').allTextContents();
    expect(datoer, 'lørdag den 8. er lukket og må ikke stå der')
      .not.toContain('8. aug.');
    expect(datoer).toContain('9. aug.');
  });

  test('en tidlig lukning skærer aftenens tider af', async ({ page }) => {
    await åbn(page, '/bord/', {
      data: grunddata({
        kalender: [{
          id: 1, lokation_id: 'mosede', type: 'tidlig_lukning', titel: 'Lukker tidligt',
          dato: '2026-08-08', slut_dato: null, lukker_kl: '15:00', offentlig: false,
        }],
      }),
    });
    await page.locator('#bord-dage .dag')
      .filter({ has: page.getByText('8. aug.', { exact: true }) }).click();
    const tider = await page.locator('#bord-tid option').allTextContents();
    expect(tider[tider.length - 1],
      'lukker lugen 15, kan man ikke få bord 19.30').toBe('kl. 14.30');
  });

  /* Samme regel fandtes IKKE på smørrebrødssiden, og det var en
     rigtig fejl: forsiden vidste, at der lukkedes tidligt, men
     formularen solgte afhentning kl. 19. Fundet, da bordformularen
     fik reglen — og nu målt begge steder. */
  test('smørrebrødssiden respekterer også en tidlig lukning', async ({ page }) => {
    await åbn(page, '/bestil/', {
      data: grunddata({
        kalender: [{
          id: 1, lokation_id: 'mosede', type: 'tidlig_lukning', titel: 'Lukker tidligt',
          dato: '2026-08-10', slut_dato: null, lukker_kl: '15:00', offentlig: false,
        }],
      }),
    });
    /* Dagvælgeren findes først, når der er noget i kurven — testen
       går den vej, et menneske går, og lægger ét stykke i. */
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await page.locator('#bestil-stykker .stk-linje').first()
      .locator('button', { hasText: '+' }).click();

    /* Dagen vælges i en <select> nu — bestillingssiden fik spiis'
       form (23/8), og piller-rækken #bestil-dage er væk. Værdien
       er datoen; teksten er den, gæsten læser. */
    await page.locator('#bestil-dag').selectOption('2026-08-10');
    const tider = await page.locator('#bestil-tid option').allTextContents();
    expect(tider[tider.length - 1]).toBe('kl. 14.30');
  });

  /* BOOKET ER BOOKET (23/8). Her stod det modsatte: kvitteringen
     skulle sige "IKKE bekræftet — vent på opkaldet".

     Kunden har sagt det fire gange, senest med ordene "hvad man
     skal kunne BESTILLE bord, ikke SPØRGE — det er det, jeg har
     prøvet at sige 100 gange". Det er den samme beslutning som på
     bestillingerne: gæsten booker, og kan forretningen ikke
     skaffe bordet, er det DEM, der ringer.

     Kvitteringen skal derfor sige tre ting: at bordet ER booket,
     hvornår vi ses, og hvordan man kommer af med det igen. Et
     løfte uden en udgang er et bord, ingen tør booke. */
  test('et bord kan bookes, og kvitteringen lover bordet', async ({ page }) => {
    await åbn(page, '/bord/');
    await page.locator('#bord-antal').fill('4');
    await page.locator('#bord-navn').fill('Familien Vind');
    await page.locator('#bord-telefon').fill('20304050');
    await page.locator('#bord-send').click();

    const tak = page.locator('#bord-tak');
    await expect(tak).toBeVisible();
    await expect(tak).toContainText('booket', { ignoreCase: true });
    await expect(tak, 'kvitteringen tager bordet tilbage igen')
      .not.toContainText('IKKE bekræftet');
    // Vejen ud, hvis de bliver forhindret
    await expect(tak).toContainText('ring', { ignoreCase: true });
    await expect(tak).toContainText('20304050');
    await expect(tak).toContainText('Reference');

    const gemt = await gemteData(page);
    expect(gemt.bordbestillinger.length).toBe(1);
    expect(gemt.bordbestillinger[0].status, 'gæsten må ikke kunne sætte status')
      .toBe('ny');
    expect(gemt.bordbestillinger[0].reference).toMatch(/^BO/);
  });

  test('uden antal bliver der ikke sendt noget', async ({ page }) => {
    await åbn(page, '/bord/');
    await page.locator('#bord-navn').fill('Familien Vind');
    await page.locator('#bord-telefon').fill('20304050');
    await page.locator('#bord-send').click();

    await expect(page.locator('#fejl-antal')).toBeVisible();
    const gemt = await gemteData(page);
    expect((gemt.bordbestillinger || []).length).toBe(0);
  });

  test('over 100 sendes videre til selskaber i stedet', async ({ page }) => {
    await åbn(page, '/bord/');
    await page.locator('#bord-antal').fill('120');
    await page.locator('#bord-navn').fill('Foreningen');
    await page.locator('#bord-telefon').fill('20304050');
    await page.locator('#bord-send').click();

    await expect(page.locator('#fejl-antal')).toContainText('selskab');
    expect(((await gemteData(page)).bordbestillinger || []).length).toBe(0);
  });

  test('siden nævner hverken pris eller pladser', async ({ page }) => {
    /* Pladstallet er personalets arbejdsredskab i admin. Gæsten
       skal ikke se "40 pladser" — det er ikke et løfte, ejeren har
       givet. */
    await åbn(page, '/bord/');
    const tekst = await page.locator('main').innerText();
    expect(tekst).not.toMatch(/\d+\s*kr/i);
    expect(tekst).not.toMatch(/\d+\s*pladser/i);
  });
});

test.describe('Personalet bekræfter', () => {

  test('fanen viser bookingen, og hakket kræver ikke et opkald', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bordbestillinger: [bordønske()] }) });
    await page.locator('[data-panel="p-borde"]').click();

    /* Køen er sit eget kort siden 27/8 — se noten ved faerdig() i
       js/admin/borde.js: det, der er overstået, er ikke arbejde. */
    const kort = page.locator('#borde-venter .bestil-kort');
    await expect(kort).toHaveCount(1);
    await expect(kort).toContainText('Familien Vind');
    await expect(kort).toContainText('4 personer');
    await expect(page.locator('#borde-antal')).toHaveText('1');

    /* Hakket er personalets eget: gæsten har allerede fået bordet
       i sin kvittering. Beskeden må derfor IKKE bede om et
       opkald — så ville personalet ringe for at sige noget,
       gæsten allerede ved. */
    let besked = null;
    page.once('dialog', (d) => { besked = d.message(); d.accept(); });
    await kort.getByRole('button', { name: 'Bekræft bordet' }).click();

    // Efter hakket flytter kortet til "Kommende borde".
    await expect(page.locator('#borde-kommende .bestil-kort .maerke'))
      .toContainText('Bekræftet');
    /* /ring/i alene duer ikke: ordet "kvitteringen" indeholder det.
       Det, der måles, er OPFORDRINGEN — "ring til". */
    expect(besked, 'hakket beder stadig om et opkald').not.toMatch(/ring til/i);
    await expect(page.locator('#borde-antal')).toBeHidden();
  });

  /* DEN ANDEN VEJ SKAL DER RINGES. Gæsten regner med bordet, så
     et afslag, hun ikke har hørt, er en familie, der møder op.
     Nummeret skal stå i beskeden, så det ikke skal slås op. */
  test('et afslag beder om et opkald, med nummeret i beskeden', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bordbestillinger: [bordønske()] }) });
    await page.locator('[data-panel="p-borde"]').click();

    const kort = page.locator('#borde-venter .bestil-kort');
    let besked = null;
    page.once('dialog', (d) => { besked = d.message(); d.accept(); });
    await kort.getByRole('button', { name: 'Afvis' }).click();

    expect(besked, 'afslaget siger ikke, at der skal ringes').toMatch(/ring til/i);
    expect(besked).toContain('20304050');
  });

  test('dagens billede lægger ja\'erne sammen mod pladserne', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        indstillinger: { ...grunddata().indstillinger, bord_pladser: 40 },
        bordbestillinger: [
          bordønske({ id: 1, status: 'bekraeftet', antal_personer: 24 }),
          bordønske({ id: 2, reference: 'BO260807-BBBBB', telefon: '30405060',
            tid: '19:00', antal_personer: 4 }),
        ],
      }),
    });
    await page.locator('[data-panel="p-borde"]').click();

    const billede = page.locator('#borde-billede');
    await expect(billede).toContainText('24 af 40 pladser sagt ja til');
    await expect(billede).toContainText('1 ønske venter');
  });

  test('et afvist ønske tæller ikke med i billedet', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        indstillinger: { ...grunddata().indstillinger, bord_pladser: 40 },
        bordbestillinger: [bordønske({ status: 'afvist', antal_personer: 30 })],
      }),
    });
    await page.locator('[data-panel="p-borde"]').click();
    await expect(page.locator('#borde-billede')).not.toContainText('30');
  });

  test('bordet står også i Overblik under lige modtaget', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bordbestillinger: [bordønske()] }) });
    const nyt = page.locator('#overblik-nyt');
    await expect(nyt).toContainText('Familien Vind');
    await expect(nyt).toContainText('Bord · 4 personer');
    await expect(nyt).toContainText('Åbn bordene');
  });
});

/* ============================================================
   DET, DER ER OVERSTÅET, ER IKKE ARBEJDE  (27/8)

   Kundens spørgsmål: "hvad gør den her section overhovedet".
   Skærmbilledet svarede selv: en bekræftet booking fra I GÅR stod
   midt i arbejdslisten, mens linjen ovenover sagde "0 af 40
   pladser sagt ja til" for i dag. To tal på samme skærm om det
   samme, og de var uenige — dagens billede tæller fra i dag og
   frem, listen tællede fra tidernes morgen.

   Om to måneder skulle personalet rulle forbi hundrede afholdte
   middage for at finde det ene ønske, der venter på et opkald.

   Uret i åbnAdmin står fredag 7. august 2026.
   ============================================================ */
test.describe('Listen glemmer det, der er overstået', () => {

  const iGaar = '2026-08-06';
  const iMorgen = '2026-08-08';

  async function åbnFanen(page, raekker) {
    await åbnAdmin(page, { data: grunddata({ bordbestillinger: raekker }) });
    await page.locator('[data-panel="p-borde"]').click();
  }

  test('en bekræftet booking fra i går står ikke som kommende', async ({ page }) => {
    await åbnFanen(page, [
      bordønske({ id: 1, status: 'bekraeftet', dato: iGaar, navn: 'Familien Dahl' }),
      bordønske({ id: 2, reference: 'BO260807-BBBBB', telefon: '30405060',
        status: 'bekraeftet', dato: iMorgen, navn: 'Familien Vind' }),
    ]);

    await expect(page.locator('#borde-kommende')).toContainText('Familien Vind');
    await expect(page.locator('#borde-kommende')).not.toContainText('Familien Dahl');

    const fold = page.locator('#borde-faerdige-kort');
    await expect(fold).toContainText('Færdige (1)');
    await expect(page.locator('#borde-faerdige')).toContainText('Familien Dahl');
  });

  /* ⚠️ OG DET GÆLDER OGSÅ DE NYE. Et ønske fra i mandags til en
     lørdag, der er gået, kan ingen nå at svare på — men det stod
     øverst i køen, fordi "nye øverst" ikke spurgte om datoen. */
  test('et ubesvaret ønske til en dag, der er gået, er også færdigt', async ({ page }) => {
    await åbnFanen(page, [bordønske({ status: 'ny', dato: iGaar })]);

    await expect(page.locator('#borde-venter')).toContainText('Ingen venter på svar');
    await expect(page.locator('#borde-faerdige')).toContainText('Familien Vind');
  });

  /* Tallet i søjlen skal følge med. Talte det stadig det
     overståede, ville personalet åbne fanen efter et rødt 1-tal
     og ikke finde noget at gøre — og så holder man op med at
     stole på tallet. */
  /* Tallet i søjlen skal følge med. Talte det stadig det
     overståede, ville personalet åbne fanen efter et rødt 1-tal
     og ikke finde noget at gøre — og så holder man op med at
     stole på tallet.

     ⚠️ TO PRØVER OG IKKE ÉN. Første udgave åbnede admin to gange
     i den samme prøve for at måle begge veje, og den anden
     åbning slog ikke igennem — dataene fra den første stod
     stadig. Prøven fejlede på noget, der virkede. */
  test('tallet i søjlen tæller ikke det overståede', async ({ page }) => {
    await åbnFanen(page, [bordønske({ status: 'ny', dato: iGaar })]);
    await expect(page.locator('#borde-antal')).toBeHidden();
  });

  test('… men det tæller det, der stadig kan besvares', async ({ page }) => {
    await åbnFanen(page, [bordønske({ status: 'ny', dato: iMorgen })]);
    await expect(page.locator('#borde-antal')).toHaveText('1');
  });
});

/* ============================================================
   ET TOMT BORD ER IKKE ET AFSLAG

   En bekræftet booking havde ét sted at gå hen: Afvis. Men at
   "afvise" et bord, gæsten skulle have siddet ved, er forkert —
   vi sagde jo ja. Uden et andet ord blev enten udeblivelsen
   skrevet som et afslag, eller også blev der ikke trykket.

   ⚠️ KRÆVER supabase/bord-udeblev.sql. Databasens bord_status_ok
   kendte kun ny/bekraeftet/afvist.
   ============================================================ */
test.describe('Udeblev er sit eget ord', () => {

  test('en bekræftet booking kan meldes udeblevet — uden et opkald', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        bordbestillinger: [bordønske({ status: 'bekraeftet', dato: '2026-08-08' })],
      }),
    });
    await page.locator('[data-panel="p-borde"]').click();

    let besked = null;
    page.once('dialog', (d) => { besked = d.message(); d.accept(); });
    await page.locator('#borde-kommende').getByRole('button', { name: 'Udeblev' }).click();

    /* Der skal IKKE ringes: gæsten kom ikke, og et opkald om det
       er ikke personalets arbejde. */
    expect(besked).not.toMatch(/ring til/i);

    expect((await gemteData(page)).bordbestillinger[0].status).toBe('udeblevet');
    await expect(page.locator('#borde-faerdige')).toContainText('Familien Vind');
    await expect(page.locator('#borde-kommende')).not.toContainText('Familien Vind');
  });

  /* ⚠️ ET NYT ORD ER ET NYT SPØRGSMÅL: hvor gik pladserne hen?
     Udeblevet må ikke tælle med i dagens billede — pladserne blev
     aldrig brugt, og et tal, der siger "24 af 40", når de 24 ikke
     kom, får personalet til at afvise en booking, de kunne have
     taget. */
  test('en udeblivelse tæller ikke som pladser sagt ja til', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        indstillinger: { ...grunddata().indstillinger, bord_pladser: 40 },
        bordbestillinger: [
          bordønske({ id: 1, status: 'udeblevet', dato: '2026-08-08',
            antal_personer: 24 }),
          bordønske({ id: 2, reference: 'BO260807-BBBBB', telefon: '30405060',
            status: 'bekraeftet', dato: '2026-08-08', antal_personer: 4 }),
        ],
      }),
    });
    await page.locator('[data-panel="p-borde"]').click();
    await expect(page.locator('#borde-billede')).toContainText('4 af 40');
    /* ⚠️ OG DEN MÅ HELLER IKKE TÆLLE SOM VENTENDE.

       Første udgave af prøven målte kun de 4 af 40 — og den
       bestod, selv da udeblivelsen blev talt med igen. Grunden er,
       at tegnBillede lægger alt, der ikke er bekræftet, i "venter":
       en udeblivelse blev til "1 ønske venter", altså et opkald,
       ingen skal foretage. Målt, ikke gættet: fejlen blev sat
       tilbage, og prøven bestod. */
    await expect(page.locator('#borde-billede')).not.toContainText('venter');
  });

  /* Og et fejltryk skal kunne fortrydes. Gendan fører til
     BEKRÆFTET og ikke til ny: rækken HAR været set, det var
     derfor, nogen trykkede. */
  test('en udeblivelse kan fortrydes', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        bordbestillinger: [bordønske({ status: 'udeblevet', dato: '2026-08-08' })],
      }),
    });
    await page.locator('[data-panel="p-borde"]').click();

    await page.locator('#borde-faerdige-kort > summary').click();
    await page.locator('#borde-faerdige').getByRole('button', { name: 'Gendan' }).click();

    expect((await gemteData(page)).bordbestillinger[0].status).toBe('bekraeftet');
    await expect(page.locator('#borde-kommende')).toContainText('Familien Vind');
  });
});
