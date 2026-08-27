/* Udlejningen af baglokalet (fase 5): som bordene, men lokalet er
   ET lokale — ét ja optager hele dagen.

   Det vigtigste, filen måler, er netop dét: at admin ikke kan leje
   lokalet ud to gange samme dag, og at advarslen står PÅ kortet,
   FØR der trykkes. Databasens egen håndhævelse (det delvist unikke
   indeks) er bevist for sig i supabase/proev-udlejning.sql — her
   måles øvetilstandens spejl af samme regel, for opfører øvelsen
   sig anderledes end det rigtige, er den ikke en øvelse. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

/* Uret i åbn() står på fredag 7. august 2026. */

const udlejning = (æ) => ({
  id: 1, lokation_id: 'mosede', reference: 'BL260807-AAAAA',
  navn: 'Anna Vind', telefon: '20304050', email: null,
  dato: '2026-08-22', antal_personer: 30,
  besked: null, status: 'ny', intern_note: null,
  oprettet: '2026-08-07T10:30:00Z', ...æ,
});

test.describe('Gæsten spørger om lokalet', () => {

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
    await page.locator('[data-panel="p-lokale"]').click();

    /* Køen er sit eget kort nu — se noten øverst i
       js/admin/udlejning.js: det, der venter på svar, er det
       eneste på fanen, der er ARBEJDE. */
    const kort = page.locator('#lokale-venter .bestil-kort');
    await expect(kort).toHaveCount(1);
    await expect(kort).toContainText('Anna Vind');
    await expect(kort).toContainText('30 personer');
    await expect(page.locator('#lokale-antal-maerke')).toHaveText('1');

    let besked = null;
    page.once('dialog', (d) => { besked = d.message(); d.accept(); });
    await kort.getByRole('button', { name: 'Lej lokalet ud' }).click();

    /* Og efter ja'et flytter kortet til "I hus". Det er hele
       pointen med de to kort: køen tømmer sig selv. */
    await expect(page.locator('#lokale-venter .bestil-kort')).toHaveCount(0);
    /* ⚠️ .maerke ER TO TING NU: kortet bærer både slagsen
       ("Ønske" / "Forespørgsel") og statussen, fordi de to veje
       ind til lokalet står side om side. Vælg statussen. */
    await expect(page.locator('#lokale-lejet .bestil-kort .maerke.m-bekraeftet'))
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
    await page.locator('[data-panel="p-lokale"]').click();

    const nyKort = page.locator('#lokale-venter .bestil-kort.b-ny');
    await expect(nyKort).toContainText('Dagen er allerede lejet ud til Anna Vind');

    page.once('dialog', (d) => d.accept());
    await nyKort.getByRole('button', { name: 'Lej lokalet ud' }).click();

    /* Afvisningen kommer fra samme regel som databasens indeks:
       ønsket forbliver Ny, og fejlen siger hvorfor. */
    await expect(page.locator('#fejl')).toContainText('ét ja pr. dag');
    await expect(page.locator('#lokale-venter .bestil-kort.b-ny .maerke.m-ny').first())
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
    await page.locator('[data-panel="p-lokale"]').click();

    const nyKort = page.locator('#lokale-venter .bestil-kort.b-ny');
    await expect(nyKort).not.toContainText('allerede lejet ud');

    page.once('dialog', (d) => d.accept());
    await nyKort.getByRole('button', { name: 'Lej lokalet ud' }).click();
    /* Efter ja'et flytter kortet til "I hus", så det findes på navnet. */
    await expect(page.locator('#lokale-lejet .bestil-kort', { hasText: 'Ole Berg' })
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
    await page.locator('[data-panel="p-lokale"]').click();

    // Forespørgslen står som et kort i køen — ikke som en henvisning.
    const kort = page.locator('#lokale-venter .bestil-kort', { hasText: 'Mette Lund' });
    await expect(kort).toHaveCount(1);
    await expect(kort).toContainText('Forespørgsel');
    await expect(kort).toContainText('20 personer');

    /* Og den udlejede dag er markeret i nettet med lejerens navn.

       ⚠️ SCOPET TIL #lokale-net. Der er TO månedsnet i admin nu —
       kalenderfanens og lokalets — og begge bruger data-dag.
       Uden scopet rammer vælgeren to felter, og prøven falder på
       "strict mode violation" i stedet for på noget, der er galt. */
    await expect(page.locator('#lokale-net .maaned-dag[data-dag="2026-08-22"]'))
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
    await page.locator('[data-panel="p-forespoergsler"]').click();

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
    await page.locator('[data-panel="p-lokale"]').click();

    const koe = page.locator('#lokale-venter .bestil-kort');
    await expect(koe).toHaveCount(2);
    await expect(koe.first()).toContainText('Mette Lund');   // ældst
    await expect(koe.nth(1)).toContainText('Anna Vind');
    // Selskabet hører ikke til her.
    await expect(page.locator('#lokale-venter')).not.toContainText('Jens Dahl');
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
    await page.locator('[data-panel="p-lokale"]').click();

    /* ⚠️ VÆLG PÅ REFERENCEN, IKKE PÅ NAVNET. Advarslen skriver
       NABOENS navn på kortet, så hasText:'Anna Vind' rammer
       begge kort — hendes eget OG Oles, hvor hun står i
       advarslen. Prøven fældede sig selv på det. */
    const annas = page.locator('#lokale-venter .bestil-kort',
      { hasText: 'BL260807-AAAAA' });
    const oles = page.locator('#lokale-venter .bestil-kort',
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
    await page.locator('[data-panel="p-lokale"]').click();

    const lejet = page.locator('#lokale-net .maaned-dag[data-dag="2026-08-22"]');
    await expect(lejet).toContainText('Anna Vind');
    await expect(lejet).toHaveClass(/er-lukket/);

    await expect(page.locator('#lokale-net .maaned-dag[data-dag="2026-08-29"]'))
      .toContainText('1 venter');
    // En dag, ingen har spurgt om, er tom — og det er halvdelen af svaret.
    await expect(page.locator('#lokale-net .maaned-dag[data-dag="2026-08-15"]'))
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
    await page.locator('[data-panel="p-lokale"]').click();
    await expect(page.locator('#lokale-venter .bestil-kort')).toHaveCount(2);

    await page.locator('#lokale-net .maaned-dag[data-dag="2026-08-29"]').click();
    await expect(page.locator('#lokale-venter .bestil-kort')).toHaveCount(1);
    await expect(page.locator('#lokale-venter')).toContainText('Ole Berg');

    // Og et tryk mere slipper den igen.
    await page.locator('#lokale-net .maaned-dag[data-dag="2026-08-29"]').click();
    await expect(page.locator('#lokale-venter .bestil-kort')).toHaveCount(2);
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
    await page.locator('[data-panel="p-lokale"]').click();

    const fold = page.locator('#lokale-faerdige-kort');
    await expect(fold).toContainText('Færdige (1)');
    /* > summary: kortene indeni har deres egen fold til noten. */
    await fold.locator('> summary').click();
    await fold.getByRole('button', { name: 'Gendan' }).click();

    await expect(page.locator('#lokale-venter .bestil-kort')).toContainText('Anna Vind');
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
    await page.locator('[data-panel="p-lokale"]').click();

    const tom = page.locator('#lokale-venter .bestil-kort',
      { hasText: 'BL260807-AAAAA' });
    await expect(tom.locator('.note-fold')).toHaveCount(1);
    await expect(tom.locator('input[type="text"]')).toBeHidden();

    const skrevet = page.locator('#lokale-venter .bestil-kort',
      { hasText: 'BL260807-BBBBB' });
    await expect(skrevet.locator('.note-fold')).toHaveCount(0);
    await expect(skrevet.locator('input[type="text"]')).toHaveValue('Depositum betalt.');
  });
});
