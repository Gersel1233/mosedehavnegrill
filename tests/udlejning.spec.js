/* Udlejningen af baglokalet (fase 5): som bordene, men lokalet er
   ET lokale — ét ja optager hele dagen.

   Det vigtigste, filen måler, er netop dét: at admin ikke kan leje
   lokalet ud to gange samme dag, og at advarslen står PÅ kortet,
   FØR der trykkes. Databasens egen håndhævelse (det delvist unikke
   indeks) er bevist for sig i supabase/proev-udlejning.sql — her
   måles øvetilstandens spejl af samme regel, for opfører øvelsen
   sig anderledes end det rigtige, er den ikke en øvelse. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

/* Uret i åbn() står på fredag 7. august 2026. */

const udlejning = (æ) => ({
  id: 1, lokation_id: 'mosede', reference: 'BL260807-AAAAA',
  navn: 'Anna Vind', telefon: '20304050', email: null,
  dato: '2026-08-22', antal_personer: 30,
  besked: null, status: 'ny', intern_note: null,
  oprettet: '2026-08-07T10:30:00Z', ...æ,
});

/* ⚠️ PARKERET 30/8: baglokale/ er en VEJVISER nu.

   Da de to udgaver af hjemmesiden blev lagt sammen, viste en
   måling, at ni gamle gæstesider stod i luften ved siden af de
   nye, og at kun bord/ kunne nås fra den nye side. baglokale/ var
   forældreløs, og adressen sender nu videre til h-baglokale.html.

   ⚠️ OG DE TO SIDER GJORDE IKKE DET SAMME. baglokale/ kaldte
   Butik.lejLokale() og skrev en UDLEJNING; h-baglokale.html
   skriver en FORESPØRGSEL. Det blev tjekket, før der blev
   omdirigeret.

   Omdirigeringen er stadig rigtig, fordi flowet blev lagt om
   29/8: gæsten spørger, og PERSONALET booker med knappen "Book
   lokalet til dem" på Baglokalet-fanen. Udlejningen oprettes af
   et menneske, ikke af en formular — og netop dét måles stadig,
   længere nede i filen her ("Personalet kan booke lokalet selv").

   Gæstens halvdel måles nu af tests/skal-forespoergsel.spec.js
   under "Baglokalets forespørgsel". Prøverne herunder er derfor
   sprunget over og ikke slettet: kommer der en dag en direkte
   bookingside igen, er de facitlisten. Én grep på sætningen
   nedenfor finder dem alle. */
test.describe.skip('Gæsten spørger om lokalet', () => {

  test('et ønske kan sendes, og kvitteringen lover IKKE lokalet', async ({ page }) => {
    await åbn(page, '/baglokale/');
    await page.locator('#lokale-dato').fill('2026-08-22');
    await page.locator('#lokale-antal').fill('30');
    await page.locator('#lokale-navn').fill('Anna Vind');
    await page.locator('#lokale-telefon').fill('20304050');
    await page.locator('#lokale-send').click();

    const tak = page.locator('#lokale-tak');
    await expect(tak).toBeVisible();
    /* Sidens vigtigste sætning: der kan kun være ét ja pr. dag,
       og det gives ikke af en formular. */
    await expect(tak).toContainText('IKKE lejet');
    await expect(tak).toContainText('20304050');
    await expect(tak).toContainText('Lørdag 22. august');

    const gemt = await gemteData(page);
    expect(gemt.udlejninger.length).toBe(1);
    expect(gemt.udlejninger[0].status, 'gæsten må ikke kunne sætte status').toBe('ny');
    expect(gemt.udlejninger[0].reference).toMatch(/^BL/);
  });

  test('uden dato bliver der ikke sendt noget', async ({ page }) => {
    /* "Engang til foråret" er en FORESPØRGSEL, og det link står i
       formularen. Et udlejningsønske uden dag kan personalet ikke
       svare på. */
    await åbn(page, '/baglokale/');
    await page.locator('#lokale-navn').fill('Anna Vind');
    await page.locator('#lokale-telefon').fill('20304050');
    await page.locator('#lokale-send').click();

    await expect(page.locator('#fejl-dato')).toBeVisible();
    expect(((await gemteData(page)).udlejninger || []).length).toBe(0);
  });

  test('en dag, der er gået, bliver afvist', async ({ page }) => {
    await åbn(page, '/baglokale/');
    await page.locator('#lokale-dato').fill('2026-08-01');
    await page.locator('#lokale-navn').fill('Anna Vind');
    await page.locator('#lokale-telefon').fill('20304050');
    await page.locator('#lokale-send').click();

    await expect(page.locator('#fejl-dato')).toContainText('gået');
    expect(((await gemteData(page)).udlejninger || []).length).toBe(0);
  });

  test('formularen peger på forespørgslen, hvis datoen ikke kendes', async ({ page }) => {
    await åbn(page, '/baglokale/');
    await expect(page.locator('#lokale-form a[href="../selskaber/?type=baglokale"]'))
      .toBeVisible();
  });
});

test.describe('Personalet lejer ud — og kun én gang pr. dag', () => {

  test('fanen viser ønsket, og et ja kræver et opkald', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ udlejninger: [udlejning()] }) });
    await visFane(page, 'p-lokale');

    /* ⚠️ ÉN LISTE NU, IKKE TRE (28/8). Se noten øverst i
       js/admin/udlejning.js: lokalet lejes ud nogle gange om
       måneden, og tre kasser med hver sin overskrift betyder tre
       steder at kigge. Chipsene filtrerer; hasten sorterer. */
    const kort = page.locator('#lokale-sager .bestil-kort');
    await expect(kort).toHaveCount(1);
    await expect(kort).toContainText('Anna Vind');
    await expect(kort).toContainText('30 personer');
    await expect(page.locator('#lokale-antal-maerke')).toHaveText('1');

    let besked = null;
    page.once('dialog', (d) => { besked = d.message(); d.accept(); });
    await kort.getByRole('button', { name: 'Lej lokalet ud' }).click();

    /* Og efter ja'et er kortet stadig på skærmen — det er den
       samme sag — men det er ikke arbejde længere. Chippen
       "Venter på svar" er tallet, personalet handler på. */
    await expect(page.locator('[data-filter="venter"] .sag-chip-tal'))
      .toHaveText('0');
    /* ⚠️ .maerke ER TO TING NU: kortet bærer både slagsen
       ("Ønske" / "Forespørgsel") og statussen, fordi de to veje
       ind til lokalet står side om side. Vælg statussen. */
    await expect(page.locator('#lokale-sager .bestil-kort .maerke.m-bekraeftet'))
      .toContainText('Lejet ud');
    expect(besked).toContain('20304050');
    expect(besked).toContain('ét ja pr. dag');
  });

  /* FASENS REGEL. Advarslen skal stå på kortet FØR der trykkes —
     en advarsel efter et opkald til gæsten er en pinlig samtale
     for sent — og trykkes der alligevel, siger systemet nej. */
  test('dagen kan ikke lejes ud to gange', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [
          udlejning({ id: 1, status: 'bekraeftet', navn: 'Anna Vind' }),
          udlejning({ id: 2, reference: 'BL260807-BBBBB', telefon: '30405060',
            navn: 'Ole Berg' }),
        ],
      }),
    });
    await visFane(page, 'p-lokale');

    const nyKort = page.locator('#lokale-sager .bestil-kort.b-ny');
    await expect(nyKort).toContainText('Dagen er allerede lejet ud til Anna Vind');

    page.once('dialog', (d) => d.accept());
    await nyKort.getByRole('button', { name: 'Lej lokalet ud' }).click();

    /* Afvisningen kommer fra samme regel som databasens indeks:
       ønsket forbliver Ny, og fejlen siger hvorfor. */
    await expect(page.locator('#fejl')).toContainText('ét ja pr. dag');
    await expect(page.locator('#lokale-sager .bestil-kort.b-ny .maerke.m-ny').first())
      .toContainText('Ny');
  });

  test('et nej frigiver dagen igen', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [
          udlejning({ id: 1, status: 'afvist', navn: 'Anna Vind' }),
          udlejning({ id: 2, reference: 'BL260807-BBBBB', telefon: '30405060',
            navn: 'Ole Berg' }),
        ],
      }),
    });
    await visFane(page, 'p-lokale');

    const nyKort = page.locator('#lokale-sager .bestil-kort.b-ny');
    await expect(nyKort).not.toContainText('allerede lejet ud');

    page.once('dialog', (d) => d.accept());
    await nyKort.getByRole('button', { name: 'Lej lokalet ud' }).click();
    /* Efter ja'et flytter kortet til "I hus", så det findes på navnet. */
    await expect(page.locator('#lokale-sager .bestil-kort', { hasText: 'Ole Berg' })
      .locator('.maerke.m-bekraeftet')).toContainText('Lejet ud');
  });

  /* ⚠️ SKREVET OM 27/8. Før stod baglokale-forespørgslen som en
     LINJE i en datoliste ("1 forespørgsel på selskabsfanen") —
     en henvisning til en anden fane, uden et link, uden gæstens
     navn og uden en knap.

     Kundens ord: "baglokale skal ikke [i forespørgsler], da det
     har sin egen fane." Nu står den som et kort her, med sine
     egne knapper, og dagen markeres i månedsnettet. */
  test('baglokale-forespørgsler står på lokalets egen fane', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [udlejning({ status: 'bekraeftet' })],
        forespoergsler: [{
          id: 9, lokation_id: 'mosede', reference: 'FO260807-CCCCC',
          type: 'baglokale', navn: 'Mette Lund', telefon: '40506070',
          email: null, dato: '2026-08-29', antal_personer: 20, besked: null,
          status: 'ny', intern_note: null, oprettet: '2026-08-07T09:00:00Z',
        }],
      }),
    });
    await visFane(page, 'p-lokale');

    // Forespørgslen står som et kort i køen — ikke som en henvisning.
    const kort = page.locator('#lokale-sager .bestil-kort', { hasText: 'Mette Lund' });
    await expect(kort).toHaveCount(1);
    await expect(kort).toContainText('Forespørgsel');
    /* ⚠️ "20 pers.", ikke "20 personer". Kortet blev skrevet om
       29/8, da kunden bad om, at Forespørgsler skulle ligne
       resten ("layoutet og udseendet er grimt og uoverskueligt"),
       og antallet står i den korte form nu — både i overskriften
       og på sin egen linje. Det er kortet, der er lavet om, ikke
       en fejl, der er gemt væk. */
    await expect(kort).toContainText('20 pers.');

    /* Og den udlejede dag er markeret i nettet med lejerens navn.

       ⚠️ SCOPET TIL #lokale-net. Der er TO månedsnet i admin nu —
       kalenderfanens og lokalets — og begge bruger data-dag.
       Uden scopet rammer vælgeren to felter, og prøven falder på
       "strict mode violation" i stedet for på noget, der er galt. */
    await expect(page.locator('.maaned-dag[data-lokale-dag="2026-08-22"]'))
      .toContainText('Anna Vind');
  });

  test('baglokalet står i Overblik under lige modtaget', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ udlejninger: [udlejning()] }) });
    const nyt = page.locator('#overblik-nyt');
    await expect(nyt).toContainText('Anna Vind');
    await expect(nyt).toContainText('Baglokalet · 30 personer');
    await expect(nyt).toContainText('Åbn baglokalet');
  });
});

/* ============================================================
   ÉN FANE TIL LOKALET  (27/8)

   Kundens ord: "baglokale skal ikke [i forespørgsler], da det har
   sin egen fane."

   Skellet var formularens og ikke personalets: baglokale/ skriver
   en UDLEJNING, h-baglokale skriver en FORESPØRGSEL, og de
   handler om det SAMME lokale på den samme dag. Stod de to på
   hver sin fane, skulle nogen huske at kigge begge steder, før de
   sagde ja til en lørdag — og det er præcis sådan, en dag bliver
   lovet væk to gange.
   ============================================================ */

const baglokaleForesp = (æ) => ({
  id: 9, lokation_id: 'mosede', reference: 'FO260807-CCCCC',
  type: 'baglokale', navn: 'Mette Lund', telefon: '40506070',
  email: 'mette@example.com', dato: '2026-08-29', antal_personer: 20,
  besked: null, detaljer: null, status: 'ny', intern_note: null,
  oprettet: '2026-08-07T09:00:00Z', ...æ,
});

const selskabForesp = (æ) => ({
  id: 10, lokation_id: 'mosede', reference: 'FO260807-DDDDD',
  type: 'selskab', navn: 'Jens Dahl', telefon: '50607080',
  email: null, dato: '2026-08-30', antal_personer: 40,
  besked: null, detaljer: null, status: 'ny', intern_note: null,
  oprettet: '2026-08-07T08:00:00Z', ...æ,
});

test.describe('Baglokalet står ét sted', () => {

  test('forespørgsler-fanen viser ikke baglokalet', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({ forespoergsler: [baglokaleForesp(), selskabForesp()] }),
    });
    await visFane(page, 'p-forespoergsler');

    const liste = page.locator('#forespoergsler-liste');
    await expect(liste).toContainText('Jens Dahl');
    await expect(liste).not.toContainText('Mette Lund');
  });

  /* ⚠️ TALLET I SØJLEN SKAL FØLGE MED. Talte mærket stadig
     baglokalet, ville personalet åbne fanen efter et rødt 2-tal
     og finde ét kort — og så holder man op med at stole på
     tallet. */
  test('og tallet på fanen tæller det heller ikke', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({ forespoergsler: [baglokaleForesp(), selskabForesp()] }),
    });
    await expect(page.locator('#foresp-antal')).toHaveText('1');
  });

  test('men baglokale-fanen viser begge slags i den samme kø', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [udlejning({ dato: '2026-08-29' })],
        forespoergsler: [baglokaleForesp(), selskabForesp()],
      }),
    });
    await visFane(page, 'p-lokale');

    const koe = page.locator('#lokale-sager .bestil-kort');
    await expect(koe).toHaveCount(2);
    await expect(koe.first()).toContainText('Mette Lund');   // ældst
    await expect(koe.nth(1)).toContainText('Anna Vind');
    // Selskabet hører ikke til her.
    await expect(page.locator('#lokale-sager')).not.toContainText('Jens Dahl');
  });

  /* ⚠️ DEN DYRE. To ønsker om den SAMME dag stod som to kort uden
     et ord om hinanden — advarslen fandtes kun, når dagen
     ALLEREDE var lejet ud. Den, der svarede på det øverste, anede
     ikke, at det andet fandtes; et ja til den ene er et nej til
     den anden, og det nej skal gives af et menneske. */
  test('to der vil have samme dag advarer om hinanden', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [
          udlejning({ id: 1, navn: 'Anna Vind' }),
          udlejning({ id: 2, reference: 'BL260807-BBBBB', navn: 'Ole Berg',
            telefon: '30405060', oprettet: '2026-08-07T11:00:00Z' }),
        ],
      }),
    });
    await visFane(page, 'p-lokale');

    /* ⚠️ VÆLG PÅ REFERENCEN, IKKE PÅ NAVNET. Advarslen skriver
       NABOENS navn på kortet, så hasText:'Anna Vind' rammer
       begge kort — hendes eget OG Oles, hvor hun står i
       advarslen. Prøven fældede sig selv på det. */
    const annas = page.locator('#lokale-sager .bestil-kort',
      { hasText: 'BL260807-AAAAA' });
    const oles = page.locator('#lokale-sager .bestil-kort',
      { hasText: 'BL260807-BBBBB' });
    await expect(annas).toContainText('Ole Berg vil også have den dag');
    await expect(oles).toContainText('Anna Vind vil også have den dag');
  });

  test('nettet markerer både det udlejede og det, der venter', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [
          udlejning({ id: 1, status: 'bekraeftet', navn: 'Anna Vind' }),
          udlejning({ id: 2, reference: 'BL260807-BBBBB', navn: 'Ole Berg',
            telefon: '30405060', dato: '2026-08-29' }),
        ],
      }),
    });
    await visFane(page, 'p-lokale');

    const lejet = page.locator('.maaned-dag[data-lokale-dag="2026-08-22"]');
    await expect(lejet).toContainText('Anna Vind');
    await expect(lejet).toHaveClass(/er-lukket/);

    await expect(page.locator('.maaned-dag[data-lokale-dag="2026-08-29"]'))
      .toContainText('1 venter');
    // En dag, ingen har spurgt om, er tom — og det er halvdelen af svaret.
    await expect(page.locator('.maaned-dag[data-lokale-dag="2026-08-15"]'))
      .toHaveText('15');
  });

  test('et tryk på en dag viser kun den dag', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [
          udlejning({ id: 1, navn: 'Anna Vind' }),
          udlejning({ id: 2, reference: 'BL260807-BBBBB', navn: 'Ole Berg',
            telefon: '30405060', dato: '2026-08-29' }),
        ],
      }),
    });
    await visFane(page, 'p-lokale');
    await expect(page.locator('#lokale-sager .bestil-kort')).toHaveCount(2);

    await page.locator('.maaned-dag[data-lokale-dag="2026-08-29"]').click();
    await expect(page.locator('#lokale-sager .bestil-kort')).toHaveCount(1);
    await expect(page.locator('#lokale-sager')).toContainText('Ole Berg');

    // Og et tryk mere slipper den igen.
    await page.locator('.maaned-dag[data-lokale-dag="2026-08-29"]').click();
    await expect(page.locator('#lokale-sager .bestil-kort')).toHaveCount(2);
  });

  /* ⚠️ ET AFVIST ØNSKE KAN FORTRYDES. Før kunne det kun slettes:
     trykkede nogen forkert midt i en frokost, var ønsket væk, og
     gæsten stod uden et svar, ingen kunne finde igen. */
  test('et afvist ønske kan gendannes', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [udlejning({ status: 'afvist', dato: '2026-08-29' })],
      }),
    });
    await visFane(page, 'p-lokale');

    /* Det færdige er ikke arbejde og står ikke i "Alle" — men
       det forsvinder ikke: trykker nogen forkert, skal rækken
       kunne findes igen. Den har sin egen chip. */
    await expect(page.locator('#lokale-sager')).not.toContainText('Anna Vind');
    await expect(page.locator('[data-filter="faerdige"] .sag-chip-tal'))
      .toHaveText('1');
    await page.locator('[data-filter="faerdige"]').click();
    await page.locator('#lokale-sager .bestil-kort')
      .getByRole('button', { name: 'Gendan' }).click();

    await page.locator('[data-filter="alle"]').click();
    await expect(page.locator('#lokale-sager .bestil-kort')).toContainText('Anna Vind');
    expect((await gemteData(page)).udlejninger[0].status).toBe('ny');
  });

  /* ⚠️ MÅLT: fire kort gav fire åbne notefelter, tre af dem tomme
     med den samme grå pladsholder. Feltet fyldte lige så meget som
     navn, dato og antal tilsammen — og det er ikke arbejde. */
  test('den tomme note er foldet sammen, den udfyldte står åben', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        udlejninger: [
          udlejning({ id: 1, navn: 'Anna Vind' }),
          udlejning({ id: 2, reference: 'BL260807-BBBBB', navn: 'Ole Berg',
            telefon: '30405060', dato: '2026-08-29',
            intern_note: 'Depositum betalt.' }),
        ],
      }),
    });
    await visFane(page, 'p-lokale');

    const tom = page.locator('#lokale-sager .bestil-kort',
      { hasText: 'BL260807-AAAAA' });
    await expect(tom.locator('.note-fold')).toHaveCount(1);
    await expect(tom.locator('input[type="text"]')).toBeHidden();

    const skrevet = page.locator('#lokale-sager .bestil-kort',
      { hasText: 'BL260807-BBBBB' });
    await expect(skrevet.locator('.note-fold')).toHaveCount(0);
    await expect(skrevet.locator('input[type="text"]')).toHaveValue('Depositum betalt.');
  });
});

/* ============================================================
   FRA TELEFONEN IND I SYSTEMET  (27/8)

   Kundens ord: folk lægger forespørgsler på hjemmesiden, men
   "de skal ligesom bekræfte det ved at de ringer og derefter
   acceptere datoen eller manuelt skrive den ind".

   To veje, og de skal begge ende det samme sted — i tabellen
   udlejninger, hvor databasens eget indeks tæller, når nummer to
   vil have dagen.
   ============================================================ */
test.describe('Personalet kan booke lokalet selv', () => {

  async function åbnFanen(page, data) {
    await åbnAdmin(page, { data: data || grunddata() });
    await visFane(page, 'p-lokale');
  }

  /* ⚠️ UDEN DEN HER STOD HALVDELEN AF EFTERÅRET PÅ EN SEDDEL.
     Ringer nogen og lejer lokalet, fandtes der ingen vej ind — og
     så løj månedsnettet om, hvilke dage der var ledige. Det er
     det værste, et overblik kan gøre. */
  test('en udlejning kan tages i telefonen', async ({ page }) => {
    await åbnFanen(page);
    await page.locator('#lokale-tag-booking summary').click();
    await page.fill('#nyl-navn', 'Bodil Storm');
    await page.fill('#nyl-telefon', '20304099');
    await page.fill('#nyl-dato', '2026-09-12');
    await page.fill('#nyl-antal', '35');
    await page.locator('#opret-udlejning').click();

    await expect(page.locator('#lokale-sager .bestil-kort')).toContainText('Bodil Storm');
    await expect(page.locator('#lokale-sager .bestil-kort .maerke.m-bekraeftet'))
      .toContainText('Lejet ud');

    const gemt = (await gemteData(page)).udlejninger[0];
    expect(gemt.status, 'personalet har sagt ja i røret').toBe('bekraeftet');
    expect(gemt.reference).toMatch(/^BL/);
    /* Noten siger, hvor den kom fra. Uden den ligner den en,
       gæsten selv har lavet — og så leder nogen efter en
       kvittering, der aldrig er sendt. */
    expect(gemt.intern_note).toContain('telefonen');
  });

  test('og dagen lukker sig i nettet med det samme', async ({ page }) => {
    await åbnFanen(page);
    await page.locator('#lokale-tag-booking summary').click();
    await page.fill('#nyl-navn', 'Bodil Storm');
    await page.fill('#nyl-telefon', '20304099');
    await page.fill('#nyl-dato', '2026-08-12');
    await page.locator('#opret-udlejning').click();

    const felt = page.locator('.maaned-dag[data-lokale-dag="2026-08-12"]');
    await expect(felt).toContainText('Bodil Storm');
    await expect(felt).toHaveClass(/er-lukket/);
  });

  test('uden navn, nummer eller dato bliver der ikke oprettet noget', async ({ page }) => {
    await åbnFanen(page);
    await page.locator('#lokale-tag-booking summary').click();
    await page.fill('#nyl-navn', 'Bodil Storm');
    await page.locator('#opret-udlejning').click();

    await expect(page.locator('#fejl')).toContainText('Navn, telefon og dato');
    expect(((await gemteData(page)).udlejninger || []).length).toBe(0);
  });

  /* ⚠️ DEN ANDEN VEJ: ACCEPTÉR DATOEN FRA FORESPØRGSLEN.

     Uden knappen var vejen: læs forespørgslen, åbn folden, tast
     navn, nummer, dato og antal af igen, og husk så at lukke
     forespørgslen bagefter. Fire felter tastet af fra en skærm,
     hvor de allerede står — og den, der bliver glemt, er den
     sidste: forespørgslen bliver stående som "ny", og næste
     medarbejder ringer til den samme gæst. */
  test('en forespørgsel kan blive til en booking med ét tryk', async ({ page }) => {
    await åbnFanen(page, grunddata({ forespoergsler: [baglokaleForesp()] }));

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Book lokalet til dem' }).click();

    // 1) Der er oprettet en RIGTIG udlejning, og den er bekræftet.
    await expect(page.locator('#lokale-sager .bestil-kort')).toContainText('Mette Lund');
    const d = await gemteData(page);
    const u = d.udlejninger[0];
    expect(u.status).toBe('bekraeftet');
    expect(u.dato).toBe('2026-08-29');
    expect(u.antal_personer).toBe(20);
    expect(u.intern_note, 'noten peger tilbage på forespørgslen')
      .toContain('FO260807-CCCCC');

    // 2) Og forespørgslen er lukket, så ingen ringer til hende igen.
    expect(d.forespoergsler[0].status).toBe('aftalt');
  });

  /* ⚠️ EN FORESPØRGSEL MÅ GERNE VÆRE UDEN DATO ("engang til
     foråret"), og så er der ikke noget at booke. Knappen står der
     ikke — en knap, der siger nej, når man trykker, er værre end
     ingen knap. */
  test('uden en dato er der ingen bookingknap', async ({ page }) => {
    await åbnFanen(page, grunddata({
      forespoergsler: [baglokaleForesp({ dato: null })],
    }));
    await expect(page.locator('#lokale-sager .bestil-kort')).toContainText('Mette Lund');
    expect(await page.getByRole('button', { name: 'Book lokalet til dem' }).count())
      .toBe(0);
  });

  /* ⚠️ EN "AFTALT" FORESPØRGSEL HAR EN KNAP NU — OG DET ER
     FANENS VIGTIGSTE RETTELSE (28/8).

     Den havde ingen før, og det så rigtigt ud: der var jo sagt
     ja. Men databasens indeks udlejning_dagen_er_taget tæller
     kun UDLEJNINGER, og så længe der ikke står en udlejning bag,
     kan en gæst på hjemmesiden stadig tage dagen. Hullet var
     usynligt, og der var ingen vej til at lukke det.

     Knappen hedder "Lås dagen", fordi det er dét, den gør — at
     kalde den "Book lokalet til dem" ville lyde som noget, der
     allerede var sket. */
  test('en aftalt forespørgsel kan låses, og siger hvorfor', async ({ page }) => {
    await åbnFanen(page, grunddata({
      forespoergsler: [baglokaleForesp({ status: 'aftalt' })],
    }));
    const kort = page.locator('#lokale-sager .bestil-kort');
    await expect(kort).toContainText('Dagen er ikke låst');
    expect(await page.getByRole('button', { name: 'Book lokalet til dem' }).count())
      .toBe(0);

    page.once('dialog', (d) => d.accept());
    await kort.getByRole('button', { name: 'Lås dagen' }).click();

    // Nu ER der en udlejning bag, og den er bekræftet.
    const d = await gemteData(page);
    expect(d.udlejninger[0].status).toBe('bekraeftet');
    expect(d.udlejninger[0].dato).toBe('2026-08-29');
  });
});

/* ⚠️ ÉN SAG, IKKE TO. Bookingen opretter en udlejning OG lukker
   forespørgslen, og uden et filter stod begge på skærmen
   bagefter — "Mette Lund" som udlejning og "Mette Lund" som
   forespørgsel, side om side i I hus. To kort, ét selskab, og
   den, der så dem, ville tro, der var booket to gange. */
test.describe('En booket forespørgsel står kun ét sted', () => {

  test('efter bookingen er der ét kort, ikke to', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({ forespoergsler: [baglokaleForesp()] }),
    });
    await visFane(page, 'p-lokale');

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Book lokalet til dem' }).click();
    await expect(page.locator('#lokale-sager .bestil-kort')).toHaveCount(1);
    await expect(page.locator('#lokale-sager .bestil-kort')).toContainText('Ønske');
    // Og køen er tom: der er ikke noget at svare på længere.
    await expect(page.locator('[data-filter="venter"] .sag-chip-tal')).toHaveText('0');
  });

  /* Men en forespørgsel, nogen har sat til "aftalt" UDEN at
     oprette en udlejning, må ikke forsvinde. Den spærrer dagen i
     visningen optagne_dage, og så skal nettet også vise den —
     ellers siger skærmen ledigt, mens hjemmesiden siger optaget. */
  test('en aftalt forespørgsel uden booking bliver stående', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({ forespoergsler: [baglokaleForesp({ status: 'aftalt' })] }),
    });
    await visFane(page, 'p-lokale');

    await expect(page.locator('#lokale-sager .bestil-kort')).toContainText('Mette Lund');

    /* ⚠️ MEN DEN STÅR MED ET ANDET TEGN END EN RIGTIG UDLEJNING
       (28/8). Dagen er lovet væk, og databasen holder den ikke —
       stod den som "lejet ud", ville hullet være usynligt præcis
       dér, hvor man kigger efter det. */
    const dag = page.locator('.maaned-dag[data-lokale-dag="2026-08-29"]');
    await expect(dag).toHaveClass(/er-halv/);
    await expect(dag).not.toHaveClass(/er-lukket/);
    await expect(dag).toContainText('🤝 Mette Lund');
  });
});

/* ============================================================
   FANEN ER ET FORLØB, IKKE TRE LISTER  (28/8)

   Kunden sendte fire skærmbilleder af en færdig udlejningsside og
   bad om, at fanen skulle se sådan ud "og gerne bedre".

   Formen er lånt. Det, der er NYT, er de oplysninger, fanen ikke
   kunne give før: hvor langt hver sag er, hvem der har ventet for
   længe, hvad der går galt af sig selv — og at et "aftalt" ja
   ikke er et låst ja.
   ============================================================ */
test.describe('Baglokalets forløb', () => {

  const grund = (æ) => grunddata({ udlejninger: [], forespoergsler: [], ...æ });

  async function åbnFanen(page, data, ur) {
    await åbnAdmin(page, { data, ...(ur ? { ur } : {}) });
    await visFane(page, 'p-lokale');
  }

  test('de fire trin tæller sagerne, og et tryk filtrerer listen', async ({ page }) => {
    await åbnFanen(page, grund({
      udlejninger: [
        udlejning({ id: 1, navn: 'Anna Vind' }),                       // trin 1
        udlejning({ id: 2, reference: 'BL260807-BBBBB', navn: 'Ole Berg',
          telefon: '30405060', dato: '2026-09-05', status: 'bekraeftet' }), // trin 4
      ],
      forespoergsler: [
        baglokaleForesp({ id: 9, status: 'kontaktet' }),               // trin 2
        baglokaleForesp({ id: 11, reference: 'FO260807-GGGGG',
          navn: 'Sara Holm', telefon: '60708090', dato: '2026-09-12',
          status: 'aftalt' }),                                         // trin 3
      ],
    }));

    for (const [nr, tal] of [['1', '1'], ['2', '1'], ['3', '1'], ['4', '1']]) {
      await expect(page.locator(`[data-trin="${nr}"] .trinkort-tal`)).toHaveText(tal);
    }

    // Og trinet er vejen hen til arbejdet, ikke bare et tal.
    await page.locator('[data-trin="2"]').click();
    const kort = page.locator('#lokale-sager .bestil-kort');
    await expect(kort).toHaveCount(1);
    await expect(kort).toContainText('Mette Lund');
  });

  /* ⚠️ "ÆLDST FØRST" VAR IKKE GODT NOK.

     Køen var sorteret efter hvornår folk skrev. En forespørgsel om
     en fest på LØRDAG er noget andet end en om en fest til maj,
     også selv om maj-manden skrev først: den ene skal have et svar
     i dag, den anden kan vente til på tirsdag. */
  test('festen i denne uge står over den, der skrev først', async ({ page }) => {
    await åbnFanen(page, grund({
      udlejninger: [
        // Skrev først, men festen er om en måned.
        udlejning({ id: 1, navn: 'Langt Ude', dato: '2026-09-20',
          oprettet: '2026-08-01T10:00:00Z' }),
        // Skrev i morges, men festen er på søndag.
        udlejning({ id: 2, reference: 'BL260807-BBBBB', navn: 'Snart Fest',
          telefon: '30405060', dato: '2026-08-09',
          oprettet: '2026-08-07T09:00:00Z' }),
      ],
    }));
    const kort = page.locator('#lokale-sager .bestil-kort');
    await expect(kort.first()).toContainText('Snart Fest');
    await expect(kort.nth(1)).toContainText('Langt Ude');
  });

  /* ⚠️ KORTET ØVERST FINDES KUN, NÅR DER ER NOGET.
     En fast boks, der som regel siger "alt er fint", bliver til
     udsmykning på en uge — og så ses den heller ikke den dag, den
     siger noget. */
  test('opmærksomhedskortet er der ikke, når der ikke er noget', async ({ page }) => {
    await åbnFanen(page, grund({
      udlejninger: [udlejning({ dato: '2026-09-20' })],
    }));
    await expect(page.locator('#lokale-obs-kort')).toBeHidden();
  });

  test('men det siger til, når nogen har ventet for længe', async ({ page }) => {
    await åbnFanen(page, grund({
      udlejninger: [udlejning({ navn: 'Anna Vind', dato: '2026-09-20',
        oprettet: '2026-08-03T10:00:00Z' })],
    }));
    const obs = page.locator('#lokale-obs-kort');
    await expect(obs).toBeVisible();
    await expect(obs).toContainText('Anna Vind har ventet i 4 dage');
    // Og kortet bærer det samme: "Ny" siger ikke, om det var i går.
    await expect(page.locator('#lokale-sager .ventet')).toContainText('ventet 4 dage');
  });

  /* Fristen er ejerens, ikke vores. Sætter han den til 10 dage,
     skal fanen holde mund i 10 dage. */
  test('og fristen er den, ejeren har sat i Vilkår', async ({ page }) => {
    const d = grund({ udlejninger: [udlejning({ dato: '2026-09-20',
      oprettet: '2026-08-03T10:00:00Z' })] });
    d.indstillinger = { ...d.indstillinger, lokale_svarfrist_dage: 10 };
    await åbnFanen(page, d);
    await expect(page.locator('#lokale-obs-kort')).toBeHidden();
  });

  /* ⚠️ FANENS VIGTIGSTE NYE OPLYSNING. Databasens indeks tæller
     kun UDLEJNINGER: en forespørgsel sat til "aftalt" ser ud som
     et ja, men dagen er ikke spærret. */
  test('et aftalt ja uden booking råber op — og nettet viser det', async ({ page }) => {
    await åbnFanen(page, grund({
      forespoergsler: [baglokaleForesp({ status: 'aftalt' })],
    }));
    await expect(page.locator('#lokale-obs-kort'))
      .toContainText('Dagen med Mette Lund er ikke låst');
    await expect(page.locator('[data-trin="3"] .trinkort-tal')).toHaveText('1');
    await expect(page.locator('[data-trin="3"]')).toHaveClass(/trinkort-advar/);
  });

  /* ⚠️ TALLET ER EJERENS. Uden et tal for lokalets størrelse må
     fanen ikke gætte — 55 personer er kun for mange, hvis nogen
     har sagt, hvor mange der er plads til. */
  /* ⚠️ TO åbnAdmin I ÉN PRØVE VIRKER IKKE. sætDataEngang skriver
     kun, hvis der ikke allerede står noget, så den anden
     opsætning bliver aldrig lagt ind — og prøven måler den
     første igen uden at sige det. Derfor to prøver. */
  test('uden et tal for pladserne gætter fanen ikke', async ({ page }) => {
    await åbnFanen(page, grund({
      udlejninger: [udlejning({ antal_personer: 55 })],
    }));
    await expect(page.locator('#lokale-sager'))
      .not.toContainText('der er plads til');
    await expect(page.locator('#lokale-obs-kort')).toBeHidden();
  });

  test('med ejerens tal advarer den både på kortet og øverst', async ({ page }) => {
    const med = grund({ udlejninger: [udlejning({ antal_personer: 55 })] });
    med.indstillinger = { ...med.indstillinger, lokale_pladser: 40 };
    await åbnFanen(page, med);
    await expect(page.locator('#lokale-sager'))
      .toContainText('55 personer — der er plads til 40 siddende');
    await expect(page.locator('#lokale-obs-kort'))
      .toContainText('Anna Vind er 55 personer');
  });

  /* ⚠️ IKKE "TRAVL I CAFEEN" — ET TAL.
     Forlægget havde et felt, der hed travl, og der findes ikke
     noget mål for travlhed i systemet. Antallet af bordbestilte
     pladser ved vi derimod, og det er den oplysning, der skal
     bruges: mad til 40 i baglokalet OG servering for 12 i cafeen
     er et bemandingsspørgsmål. */
  test('nettet viser, hvor mange cafeen allerede har booket', async ({ page }) => {
    await åbnFanen(page, grund({
      udlejninger: [udlejning({ status: 'bekraeftet' })],
      bordbestillinger: [
        { id: 1, lokation_id: 'mosede', reference: 'BO260807-11111',
          navn: 'Fam. Sø', telefon: '11223344', dato: '2026-08-22',
          tid: '18:00', antal_personer: 12, status: 'bekraeftet',
          besked: null, intern_note: null, oprettet: '2026-08-06T10:00:00Z' },
        // Et afvist bord er ingen gæster.
        { id: 2, lokation_id: 'mosede', reference: 'BO260807-22222',
          navn: 'Fam. Nej', telefon: '11223355', dato: '2026-08-22',
          tid: '18:00', antal_personer: 8, status: 'afvist',
          besked: null, intern_note: null, oprettet: '2026-08-06T10:00:00Z' },
      ],
    }));
    await expect(page.locator('.maaned-dag[data-lokale-dag="2026-08-22"]'))
      .toContainText('🍽️ 12');
    await expect(page.locator('#lokale-sager .bestil-kort'))
      .toContainText('12 gæster er også booket i cafeen samme dag');
  });

  /* Lukkedagen kommer fra KALENDEREN, ikke fra dagsreglerne. Begge
     kan lukke en dag, og spurgte vi kun den ene, ville en
     almindelig lukkedag stå som åben — og advarslen aldrig komme. */
  test('en udlejning på en lukkedag bliver markeret', async ({ page }) => {
    await åbnFanen(page, grund({
      udlejninger: [udlejning({ status: 'bekraeftet', navn: 'Peter Lund' })],
      kalender: [{ id: 90, lokation_id: 'mosede', type: 'lukkedag',
        dato: '2026-08-22', slut_dato: null, titel: 'Ferielukket',
        offentlig: true }],
    }));
    await expect(page.locator('#lokale-obs-kort'))
      .toContainText('Cafeen er lukket lørdag 22. august');
    await expect(page.locator('#lokale-sager .bestil-kort'))
      .toContainText('Cafeen er lukket den dag');
  });

  /* ⚠️ EN VALGT DAG MÅ IKKE KUNNE SKJULES AF ET FILTER.
     Det er sket: man trykkede på en dag med to ønsker, mens
     filteret stod på "Lejet ud", og listen sagde "ingen på den
     dag". */
  test('et tryk på en dag slår filteret fra', async ({ page }) => {
    await åbnFanen(page, grund({
      udlejninger: [
        udlejning({ id: 1, navn: 'Anna Vind', dato: '2026-08-22',
          status: 'bekraeftet' }),
        udlejning({ id: 2, reference: 'BL260807-BBBBB', navn: 'Ole Berg',
          telefon: '30405060', dato: '2026-08-29' }),
      ],
    }));
    await page.locator('[data-filter="lejet"]').click();
    await expect(page.locator('#lokale-sager .bestil-kort')).toHaveCount(1);

    await page.locator('.maaned-dag[data-lokale-dag="2026-08-29"]').click();
    await expect(page.locator('#lokale-sager .bestil-kort')).toContainText('Ole Berg');
    await expect(page.locator('[data-filter="alle"]')).toHaveClass(/valgt/);
  });
});

/* ============================================================
   VILKÅRENE — EJERENS TAL, IKKE DESIGNETS  (28/8)

   h-baglokale.html blev leveret med designets pladsholdere: 40
   siddende, 1.200 kr. for en aften, gratis fra 20 kuverter. De har
   stået i luften siden 23/8, fordi Mikkel bad om det — men indtil
   nu kunne de kun rettes ved at redigere HTML, og det kan en cafe
   ikke.
   ============================================================ */
test.describe('Vilkårene for baglokalet', () => {

  test('ejerens tal slår designets på hjemmesiden', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = {
      ...d.indstillinger,
      lokale_pladser: 25, lokale_staaende: 44,
      lokale_pris_aften: 1500, lokale_pris_dag: 2600,
      lokale_gratis_fra: 30, lokale_depositum: 750,
      lokale_vilkaar: 'Borde, stole og oprydning',
    };
    await åbnSkal(page, '/h-baglokale.html', { data: d });

    const fakta = page.locator('.facts');
    await expect(fakta).toContainText('25 siddende gæster');
    await expect(fakta).toContainText('44 stående');
    await expect(fakta).toContainText('1.500 kr. for en aften');
    await expect(fakta).toContainText('2.600 kr. for hele dagen');
    await expect(fakta).toContainText('Gratis fra 30 kuverter');
    await expect(fakta).toContainText('Depositum 750 kr.');
    await expect(fakta).toContainText('Borde, stole og oprydning');

    // Og designets egne tal er VÆK — ellers står begge dele.
    await expect(fakta).not.toContainText('40 siddende');
    await expect(fakta).not.toContainText('1.200 kr.');
    await expect(page.locator('.phead .sub')).toContainText('plads til 25 siddende');
  });

  /* ⚠️ VI OVERSKRIVER KUN, NÅR DATABASEN HAR NOGET AT SIGE.
     En kobling, der skriver "0 siddende" hen over designet, er
     værre end ingen kobling. */
  test('et tomt felt lader designets linje stå', async ({ page }) => {
    await åbnSkal(page, '/h-baglokale.html', { data: grunddata() });
    const fakta = page.locator('.facts');
    await expect(fakta).toContainText('40 siddende gæster');
    await expect(fakta).toContainText('1.200 kr. for en aften');
    // Og der står ikke et tomt depositum.
    await expect(fakta).not.toContainText('Depositum');
  });

  test('halve vilkår retter kun det halve', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = { ...d.indstillinger, lokale_pladser: 25 };
    await åbnSkal(page, '/h-baglokale.html', { data: d });
    const fakta = page.locator('.facts');
    await expect(fakta).toContainText('25 siddende gæster');
    // Det, ejeren ikke har rørt, bliver stående, så intet slettes.
    await expect(fakta).toContainText('60 stående');
  });

  test('felterne gemmes fra admin', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await visFane(page, 'p-lokale');
    await page.fill('#vilk-pladser', '25');
    await page.fill('#vilk-pris-aften', '1500');
    await page.fill('#vilk-tekst', 'Borde, stole og oprydning');
    await page.locator('#gem-vilkaar').click();
    await expect(page.locator('#kvittering')).toContainText('Vilkårene er gemt');

    const i = (await gemteData(page)).indstillinger;
    expect(i.lokale_pladser).toBe(25);
    expect(i.lokale_pris_aften).toBe(1500);
    expect(i.lokale_vilkaar).toBe('Borde, stole og oprydning');
    // Det, ingen har skrevet, gemmes som ingenting — ikke som nul.
    expect(i.lokale_depositum).toBe(null);
  });

  test('et tal uden for skalaen bliver afvist med besked', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await visFane(page, 'p-lokale');
    await page.fill('#vilk-pladser', '9000');
    await page.locator('#gem-vilkaar').click();
    await expect(page.locator('#fejl')).toContainText('Siddepladser');
    expect(((await gemteData(page)).indstillinger || {}).lokale_pladser)
      .toBeUndefined();
  });
});
