/* Bordbestillingen (fase 4): gæsten spørger, personalet bekræfter.

   Det vigtigste, filen måler, er LØFTERNE: at formularen ikke kan
   spørge om et bord på en lukkedag, at en tidlig lukning skærer
   aftenens tider af, og at kvitteringen siger højt, at bordet IKKE
   er bekræftet endnu. Databasens egne regler (gæst må skrive, ikke
   læse; bremsen) er bevist for sig i supabase/proev-borde.sql. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

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
    const dagen = page.locator('#bord-dage .dag')
      .filter({ has: page.getByText('8. aug.', { exact: true }) });
    await dagen.click();

    /* ⚠️ VENT PÅ DEN TILSTAND, REGLEN HVILER PÅ (1/9). Prøven
       læste tiderne i det sekund, klikket var sendt — og under en
       fuld runde med fire arbejdere nåede dagstriben ikke altid
       at tegne sig om først. MÅLT i runden: sidste tid var
       "kl. 20.30", altså i dag og ikke den 8., og fejlen lignede
       en tidlig lukning, der ikke virkede. Filen bestod hver gang
       alene.

       Ventetiden svækker ikke prøven: bliver dagen aldrig valgt,
       fejler den her i stedet — og med en besked, der siger
       hvad der gik galt. Samme rettelse som segment-prøverne fik
       31/8. */
    await expect(dagen, 'dagen blev aldrig valgt').toHaveClass(/\bvalgt\b/);

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
    await visFane(page, 'p-borde');

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
    /* ⚠️ KNAPPEN HED "Bekræft bordet" INDTIL 3/9, og bookingen
       flyttede til "Kommende borde". Kunden vendte det: *"den her
       knap skal bare sige ankommet, og så ryge i en
       ankommet/færdige historik ligesom bestillingerne"*. Det er
       hans beslutning om sit eget flow, ikke en forældet prøve —
       og REGLEN, prøven vogter, er den samme og den vigtige:
       hakket må ikke bede om et opkald. */
    let besked = null;
    page.once('dialog', (d) => { besked = d.message(); d.accept(); });
    await kort.getByRole('button', { name: /Ankommet/ }).click();

    // Efter hakket er bookingen FÆRDIG — som en afhentet bestilling.
    await expect(page.locator('#borde-faerdige .bestil-kort .maerke'))
      .toContainText('Ankommet');
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
    await visFane(page, 'p-borde');

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
    await visFane(page, 'p-borde');

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
    await visFane(page, 'p-borde');
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
    await visFane(page, 'p-borde');
  }

  /* ⚠️ "KOMMENDE BORDE" FINDES IKKE MERE (3/9). Kortet holdt
     mellemtrinnet — de bookinger, personalet havde "set". Kunden
     vendte knappen til ✓ Ankommet, og en ankommet booking er
     FÆRDIG, så der er ikke noget imellem. Hans beslutning om sit
     eget flow, ikke en forældet prøve.

     Reglen, prøven vogter, er den samme: en ANKOMMET booking er
     ikke arbejde længere, og en NY booking til en dag, der er
     gået, er det heller ikke — begge hører i Færdige, og ingen af
     dem må lyse i søjlens tal. Det er dét, der måles nu. */
  test('en ankommet booking og en glemt fra i går står begge i Færdige',
    async ({ page }) => {
      await åbnFanen(page, [
        bordønske({ id: 1, status: 'ny', dato: iGaar, navn: 'Familien Dahl' }),
        bordønske({ id: 2, reference: 'BO260807-BBBBB', telefon: '30405060',
          status: 'bekraeftet', dato: iMorgen, navn: 'Familien Vind' }),
      ]);

      const fold = page.locator('#borde-faerdige-kort');
      await expect(fold).toContainText('Færdige (2)');
      await expect(page.locator('#borde-faerdige')).toContainText('Familien Dahl');
      await expect(page.locator('#borde-faerdige')).toContainText('Familien Vind');

      /* Ingen af dem er arbejde — søjlens tal skal være væk. */
      await expect(page.locator('#borde-antal')).toBeHidden();
      await expect(page.locator('#borde-venter')).not.toContainText('Familien');
    });

  /* ⚠️ OG DET GÆLDER OGSÅ DE NYE. En booking fra i mandags til en
     lørdag, der er gået, kan ingen nå at gøre noget ved — men den
     stod øverst i køen, fordi "nye øverst" ikke spurgte om datoen.

     ⚠️ ORDET "ØNSKE" I DEN HER FIL ER ET LEVN. bord/ BOOKER et
     bord (kundens ord, sagt fire gange), og gæsten har fået "vi
     ses" på kvitteringen. Fixturen hedder stadig bordønske() —
     det er et navn, ikke en påstand — men skærmens ord er rettet
     31/8: "Nye bookinger", ikke "Venter på svar". */
  test('et ubesvaret ønske til en dag, der er gået, er også færdigt', async ({ page }) => {
    await åbnFanen(page, [bordønske({ status: 'ny', dato: iGaar })]);

    await expect(page.locator('#borde-venter')).toContainText('Ingen nye bookinger');
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

  /* ⚠️ UDEBLEV LIGGER PÅ EN *NY* BOOKING NU (3/9). Den lå på en
     bekræftet, dengang "bekræftet" betød "vi har set den". Efter
     kundens ændring betyder det ANKOMMET — og en familie, der ER
     kommet, kan ikke udeblive. Bordet, der stod tomt, er en
     booking, ingen nåede at hakke af. */
  test('en booking, der ikke kom, kan meldes udeblevet — uden et opkald', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        bordbestillinger: [bordønske({ status: 'ny', dato: '2026-08-08' })],
      }),
    });
    await visFane(page, 'p-borde');

    let besked = null;
    page.once('dialog', (d) => { besked = d.message(); d.accept(); });
    await page.locator('#borde-venter').getByRole('button', { name: 'Udeblev' }).click();

    /* Der skal IKKE ringes: gæsten kom ikke, og et opkald om det
       er ikke personalets arbejde. */
    expect(besked).not.toMatch(/ring til/i);

    expect((await gemteData(page)).bordbestillinger[0].status).toBe('udeblevet');
    await expect(page.locator('#borde-faerdige')).toContainText('Familien Vind');
    /* Og den er VÆK fra de nye — bunken "Kommende borde" findes
       ikke mere (3/9), så modstykket måles dér, rækken kom fra. */
    await expect(page.locator('#borde-venter')).not.toContainText('Familien Vind');
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
    await visFane(page, 'p-borde');
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

  /* ⚠️ GENDAN FØRER TIL *NY* NU (3/9). Den førte til bekraeftet,
     dengang det ord betød "vi har set den". Efter kundens ændring
     betyder bekraeftet ANKOMMET — og et fortrudt fejltryk må ikke
     sige, at familien kom. Bookingen er åben igen.

     Reglen, prøven vogter, er urørt og den vigtige: et fejltryk
     kan fortrydes, og rækken kommer tilbage på skærmen. */
  test('en udeblivelse kan fortrydes', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        bordbestillinger: [bordønske({ status: 'udeblevet', dato: '2026-08-08' })],
      }),
    });
    await visFane(page, 'p-borde');

    await page.locator('#borde-faerdige-kort > summary').click();
    await page.locator('#borde-faerdige').getByRole('button', { name: 'Gendan' }).click();

    expect((await gemteData(page)).bordbestillinger[0].status).toBe('ny');
    await expect(page.locator('#borde-venter')).toContainText('Familien Vind');
  });
});

/* ============================================================
   SIDEN HØRER TIL HUSET  (31/8)

   Kundens ord: *"book et bord ved vandet — den side er elendig,
   den er sort og hvid, får dårligt layout msæssigt og bare ik
   god nok."*

   Han har ret, og grunden er historisk: bord/ og bestil/ er
   ÆLDRE end designet fra 23/8 og kørte videre på css/style.css,
   hvor heroen er en mørk blækflade uden ét rødt element — mens
   hver anden side har det rød/hvide tern. Gæsten går imellem dem
   med ét klik.

   ⚠️ DE TO SIDER BLIVER. bord/ er den ENESTE vej til en
   bordbooking, og bestil/ bærer fyldvælgeren; de blev derfor
   ikke vejvisere 30/8. Derfor er det værd at gøre dem færdige i
   stedet for at lade dem stå.
   ============================================================ */
test.describe('Bordsiden hører til huset', () => {

  test('heroen bærer havnens tern, ikke en sort flade', async ({ page }) => {
    await åbn(page, '/bord/', { data: grunddata() });

    const m = await page.evaluate(() => {
      const h = document.querySelector('.smoer-hoved');
      const f = getComputedStyle(h, '::before');
      return { billede: f.backgroundImage, indhold: f.content,
        laget: getComputedStyle(h).position };
    });
    /* Mønsteret tegnes af ::before, så teksten kan ligge oven på
       det. Uden content findes laget ikke. */
    expect(m.indhold).not.toBe('none');
    expect(m.billede, 'heroen har intet mønster').toContain('repeating-linear-gradient');
    /* ⚠️ OG DET SKAL VÆRE MÆRKETS RØDE. Et gråt gitter ville være
       en tekstur; det her skal genkendes fra forsiden. */
    expect(m.billede, 'mønsteret er ikke i mærkets røde').toMatch(/214,\s*42,\s*58/);
    expect(m.laget, 'laget kan ikke ligge over uden position').toBe('relative');
  });

  /* ⚠️ ET VALG ER RØDT PÅ HELE HJEMMESIDEN. Den valgte dag var
     SORT — den eneste flade på siden, hvor et valg markeres med
     sort. Gæsten, der lige har valgt "Spis her" i rødt, skal
     ikke lære en ny farve for at vælge en dag. */
  test('den valgte dag er rød, ikke sort', async ({ page }) => {
    await åbn(page, '/bord/', { data: grunddata() });
    const valgt = page.locator('.dag.valgt').first();
    await expect(valgt).toHaveCount(1);

    const [r, g, b] = (await valgt.evaluate((e) => getComputedStyle(e).backgroundColor))
      .match(/\d+/g).map(Number);
    /* Rød: den røde kanal skal være meget større end de to andre.
       Sort og hvid har alle tre lige store. */
    expect(r - g, 'den valgte dag er ikke rød').toBeGreaterThan(90);
    expect(r - b).toBeGreaterThan(90);
  });

  /* Teksten i heroen er hvid og ligger OVEN PÅ mønsteret. Blev
     laget tegnet efter indholdet, ville overskriften forsvinde
     bag et gitter. */
  test('overskriften ligger over mønsteret', async ({ page }) => {
    await åbn(page, '/bord/', { data: grunddata() });
    const z = await page.locator('.smoer-hoved .side-top')
      .evaluate((e) => getComputedStyle(e).zIndex);
    expect(Number(z), 'indholdet ligger ikke over laget').toBeGreaterThanOrEqual(1);
    await expect(page.locator('.smoer-hoved h1')).toBeVisible();
  });
});

test.describe('Ankommet lukker bookingen', () => {
  /* Kundens ord 3/9 med et skærmbillede af Nye bookinger: *"den her
     knap i admin når man bestiller bord skal bare sige ankommet,
     også ryge i en ankommet/færdige historik ligesom
     bestillingerne"*.

     Knappen hed "Bekræft bordet", og bookingen flyttede til et
     mellemtrin, "Kommende borde", til dagen var gået. Nu er der ét
     tryk frem, og så er sagen lukket — samme beslutning, han traf
     om bestillingerne 31/8. */

  function bord(ekstra) {
    return Object.assign({
      id: 1, lokation_id: 'mosede', reference: 'BO-A', navn: 'Familien Holm',
      telefon: '20304050', email: null, dato: '2026-08-08', tid: '18:00',
      antal_personer: 6, status: 'ny', besked: null, intern_note: null,
      slettet: null, oprettet: '2026-08-07T09:00:00Z',
    }, ekstra || {});
  }

  test('ét tryk flytter bookingen fra Nye til Færdige', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ bordbestillinger: [bord()] }) });
    await visFane(page, 'p-borde');

    await expect(page.locator('#borde-venter')).toContainText('Familien Holm');

    page.once('dialog', (d) => d.accept());
    await page.locator('#borde-venter')
      .getByRole('button', { name: /Ankommet/ }).click();

    /* ⚠️ DER ER INTET MELLEMTRIN. Kortet skal være i Færdige, ikke
       i en tredje bunke — det er hele kundens ønske. */
    await expect(page.locator('#borde-faerdige')).toContainText('Familien Holm');
    await expect(page.locator('#borde-venter')).not.toContainText('Familien Holm');
    await expect(page.locator('#borde-faerdige-kort')).toContainText('Færdige (1)');

    /* ⚠️ OG DATABASENS ORD ER UÆNDRET. Salgstal og dagens billede
       tæller på 'bekraeftet'; kun skærmens ord skiftede. */
    expect((await gemteData(page)).bordbestillinger[0].status).toBe('bekraeftet');
  });

  test('en ankommet booking kan IKKE afvises', async ({ page }) => {
    /* Set på et skud: Afvis stod på en familie, der lige var kommet
       ind ad døren, fordi betingelsen var "alt, der ikke er afvist
       eller udeblevet". Er de kommet, og var det et fejltryk, er
       vejen Gendan. */
    await åbnAdmin(page, {
      data: grunddata({ bordbestillinger: [bord({ status: 'bekraeftet' })] }),
    });
    await visFane(page, 'p-borde');
    await page.locator('#borde-faerdige-kort > summary').click();

    const kort = page.locator('#borde-faerdige .bestil-kort');
    await expect(kort).toContainText('Ankommet');
    await expect(kort.getByRole('button', { name: 'Afvis' })).toHaveCount(0);
    await expect(kort.getByRole('button', { name: 'Gendan' })).toHaveCount(1);
  });

  test('Gendan fører til NY — ikke til ankommet', async ({ page }) => {
    /* Et fortrudt fejltryk må ikke sige, at familien kom. */
    await åbnAdmin(page, {
      data: grunddata({ bordbestillinger: [bord({ status: 'bekraeftet' })] }),
    });
    await visFane(page, 'p-borde');
    await page.locator('#borde-faerdige-kort > summary').click();
    await page.locator('#borde-faerdige')
      .getByRole('button', { name: 'Gendan' }).click();

    expect((await gemteData(page)).bordbestillinger[0].status).toBe('ny');
    await expect(page.locator('#borde-venter')).toContainText('Familien Holm');
  });
});
