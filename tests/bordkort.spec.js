/* BORDENE I ADMIN, OG SKILTENE DER PRINTES AF DEM.

   Numrene på bordene må ikke stå i koden. En QR-kode kan ikke
   laves om, når den først ligger på et bord — men listen over
   borde ændrer sig: der kommer et til på trædækket, et andet
   nedlægges, og "Terrassen 2" bliver til "Ved gavlen". Stod
   numrene i koden, var hver ommøblering en ændring, ejeren skulle
   bede om.

   To ting måles her:

   1) Personalet kan oprette, omdøbe, slukke og slette borde —
      og kan IKKE lave to med samme navn. To mærkater, der peger
      samme sted hen, er en bestilling til det forkerte selskab.

   2) Printsiden tegner ét skilt pr. tændt bord, og hvert skilt
      bærer SIN egen kode. Den fejl, der er nem at lave og umulig
      at se, er at alle skilte får den samme kode — de ser jo
      ens ud. Derfor sammenlignes hvert skilts kode med den, der
      hører til netop det bord.
*/

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, NØGLE } = require('./hjaelp');

const BORDE = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 },
  { id: 2, lokation_id: 'mosede', nummer: 'Terrassen 2', pladser: 6, placering: 'ude', aktiv: true, sortering: 20 },
  { id: 3, lokation_id: 'mosede', nummer: '9', pladser: 2, placering: 'inde', aktiv: false, sortering: 30 },
];

async function åbnBorde(page, borde = BORDE) {
  await åbnAdmin(page, { data: grunddata({ borde: borde }) });
  await page.locator('[data-panel="p-borde"]').click();
  await page.waitForSelector('#bordkort-liste');
}

test.describe('Bordene kan administreres', () => {

  test('de står i listen, også det slukkede', async ({ page }) => {
    await åbnBorde(page);
    await expect(page.locator('#bordkort-liste .admin-raekke')).toHaveCount(3);
    /* data-bord, fordi navnet står i et <input>: Playwrights
       hasText kan ikke se en feltværdi. Samme regel som
       menukortets rækker. */
    await expect(page.locator('[data-bord="Terrassen 2"]')).toBeVisible();
    await expect(page.locator('[data-bord="9"]')).toHaveClass(/slukket/);
  });

  test('et nyt bord kan oprettes', async ({ page }) => {
    await åbnBorde(page);
    await page.fill('#nyt-bord-nummer', 'Ved gavlen');
    await page.fill('#nyt-bord-pladser', '2');
    await page.locator('#tilfoej-bord').click();

    await expect(page.locator('#kvittering')).toContainText('oprettet');
    await expect(page.locator('[data-bord="Ved gavlen"]')).toBeVisible();

    const d = await gemteData(page);
    const nyt = d.borde.filter((b) => b.nummer === 'Ved gavlen')[0];
    expect(nyt.pladser).toBe(2);
    expect(nyt.aktiv).toBe(true);
  });

  /* To borde med samme navn er to mærkater, der peger samme sted
     hen — og så står køkkenet med mad til "bord 7" og to borde,
     der begge hedder det. Databasen har en unik nøgle
     (borde_nummer_unikt), men fejlen derfra hedder "duplicate key
     value violates unique constraint". Personalet skal læse en
     sætning. */
  test('to borde kan ikke hedde det samme', async ({ page }) => {
    await åbnBorde(page);
    await page.fill('#nyt-bord-nummer', '  terrassen 2 ');
    await page.locator('#tilfoej-bord').click();

    await expect(page.locator('#fejl')).toContainText('allerede et bord');
    const d = await gemteData(page);
    expect(d.borde.length, 'bordet blev oprettet alligevel').toBe(3);
  });

  test('et bord kan slukkes, og listen siger hvad det betyder', async ({ page }) => {
    await åbnBorde(page);
    const hak = page.locator('[data-bord="7"] input[type="checkbox"]');
    await expect(hak).toBeChecked();
    await hak.uncheck();

    await expect(page.locator('#kvittering')).toContainText('virker ikke');
    const d = await gemteData(page);
    expect(d.borde.filter((b) => b.nummer === '7')[0].aktiv).toBe(false);
  });

  test('et bord kan slettes', async ({ page }) => {
    await åbnBorde(page);
    page.on('dialog', (d) => d.accept());
    await page.locator('[data-bord="Terrassen 2"] button', { hasText: 'Slet' }).click();

    await expect(page.locator('[data-bord="Terrassen 2"]')).toHaveCount(0);
    const d = await gemteData(page);
    expect(d.borde.length).toBe(2);
  });

  test('er der ingen borde, siger listen hvad man skal gøre', async ({ page }) => {
    await åbnBorde(page, []);
    await expect(page.locator('#bordkort-liste')).toContainText('ingen borde endnu');
  });

  /* ZONEN — briefens "Terrassen / Molen / Inde". Den er FRI TEKST
     og noget ANDET end ude/inde: den siger, hvor på havnen bordet
     står, ikke om det står i vejret. En liste med tre navne ville
     være en kodeændring den dag, der kom et fjerde hjørne. */
  test('zonen kan sættes på et bord og gemmes', async ({ page }) => {
    await åbnBorde(page);
    const felt = page.locator('[data-bord="7"] .zone');
    await felt.fill('Terrassen');
    await felt.blur();

    await expect(page.locator('#kvittering')).toContainText('Terrassen');
    const d = await gemteData(page);
    expect(d.borde.filter((b) => b.nummer === '7')[0].zone).toBe('Terrassen');
  });

  /* Tom bliver til null og ikke til "". Databasens check-regel
     kræver 1–40 tegn, HVIS der står noget — en tom streng ville
     blive afvist, og personalet kunne ikke fjerne en zone igen. */
  test('en tømt zone bliver til ingenting, ikke til en tom tekst', async ({ page }) => {
    await åbnBorde(page, [
      { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
        placering: 'ude', zone: 'Molen', aktiv: true, sortering: 10 },
    ]);
    const felt = page.locator('[data-bord="7"] .zone');
    await expect(felt).toHaveValue('Molen');
    await felt.fill('   ');
    await felt.blur();

    await expect(page.locator('#kvittering')).toContainText('fjernet');
    expect((await gemteData(page)).borde[0].zone).toBe(null);
  });

  test('et nyt bord kan oprettes med zone', async ({ page }) => {
    await åbnBorde(page);
    await page.fill('#nyt-bord-nummer', 'Molen 1');
    await page.fill('#nyt-bord-zone', 'Molen');
    await page.locator('#tilfoej-bord').click();

    await expect(page.locator('[data-bord="Molen 1"]')).toBeVisible();
    const d = await gemteData(page);
    expect(d.borde.filter((b) => b.nummer === 'Molen 1')[0].zone).toBe('Molen');
  });
});

test.describe('Bordet står på bestillingen i admin', () => {

  const MED_BORD = grunddata({
    borde: BORDE,
    bestillinger: [{
      id: 1, lokation_id: 'mosede', reference: 'SM260807-BORD7',
      navn: 'Sara Holm', telefon: '20304050', hent_dato: '2026-08-07',
      hent_tid: '13:00', linjer: [{ navn: 'Fadøl, lille', antal: 2, pris: 35 }],
      fyld: [], antal: 2, status: 'ny', intern_note: null, hvordan: 'spis_her',
      bord_nummer: '7', oprettet: '2026-08-07T11:00:00Z',
    }],
  });

  /* Uden bordet står personalet med en bakke og kigger ud over
     trædækket. Mærket skal kunne ses på tværs af listen. */
  test('kortet viser Bord 7 i stedet for "Spis her"', async ({ page }) => {
    await åbnAdmin(page, { data: MED_BORD });
    await page.locator('[data-panel="p-bestillinger"]').click();

    const kort = page.locator('.bestil-kort').first();
    await expect(kort).toContainText('Bord 7');
    await expect(kort, 'både bordet og "Spis her" står der — det siger det samme to gange')
      .not.toContainText('Spis her');
  });

  /* ⚠️ BORDET STÅR IKKE LÆNGERE I DAGENS FORLØB PÅ OVERBLIK, og
     det er med vilje (26/8). Kundens ord: QR-bestillinger og
     bestillinger til lugen må ikke blandes sammen — de har
     forskelligt arbejde bag sig. En bordbestilling har ingen
     hentetid og ville altid ligge øverst i en tidssorteret liste
     og skubbe den frokost, der skal være klar kl. 12.30, ned.

     Overblik SIGER, at de er der, og fører til køkken-køen; det
     er dér, bordnummeret står. Prøven følger den vej. */
  test('bordet når personalet — gennem køkken-køen, ikke dagens forløb',
    async ({ page }) => {
    await åbnAdmin(page, { data: MED_BORD, ur: '2026-08-07T11:00:00Z' });

    // Overblik siger, at der venter noget fra bordene
    const koe = page.locator('#bord-koe-kort');
    await expect(koe).not.toHaveClass(/skjult/);
    await expect(koe).toContainText('bord');
    // ... men lister dem ikke i dagens forløb
    await expect(page.locator('#overblik-vagt')).not.toContainText('Bord 7');

    // Og knappen fører derhen, hvor nummeret står
    await koe.locator('button', { hasText: 'Åbn køkken-køen' }).click();
    await expect(page.locator('#p-koekken')).toContainText('Bord 7');
  });
});

test.describe('Skiltene printes af listen', () => {

  async function åbnPrint(page, borde = BORDE) {
    await åbn(page, '/print/bordkort.html', { data: grunddata({ borde: borde }) });
    await page.waitForSelector('.kort h1, .advarsel');
  }

  test('der er ét skilt pr. tændt bord — det slukkede får ingen', async ({ page }) => {
    await åbnPrint(page);
    await expect(page.locator('.kort h1')).toHaveCount(2);
    await expect(page.locator('.kort h1').first()).toHaveText('Bord 7');
    await expect(page.locator('.kort h1').nth(1)).toHaveText('Bord Terrassen 2');
  });

  /* DEN FEJL, DER IKKE KAN SES MED ØJNENE: alle skilte får den
     samme kode. To QR-koder ligner hinanden fuldstændig, og
     fejlen ville først vise sig, når hele trædækket bestiller til
     bord 7. Derfor tegnes den kode, der HØRER til hvert bord, en
     gang til her — og de skal være ens. */
  test('hvert skilt bærer sin egen kode', async ({ page }) => {
    await åbnPrint(page);

    const stier = await page.locator('.qr svg path').evaluateAll(
      (nodes) => nodes.map((n) => n.getAttribute('d')));
    expect(stier.length).toBe(2);
    expect(stier[0], 'de to skilte har den samme kode').not.toBe(stier[1]);

    const forventet = await page.evaluate(() => {
      const grund = location.origin + location.pathname.replace(/print\/[^/]*$/, '');
      return ['7', 'Terrassen 2'].map(function (nr) {
        const svg = MosedeQR.svg(grund + 'ved-bordet/?bord=' + encodeURIComponent(nr),
          { niveau: 'H', moerk: '#0f2c44' });
        return /d="([^"]*)"/.exec(svg)[1];
      });
    });
    expect(stier[0], 'skiltet til bord 7 peger et andet sted hen').toBe(forventet[0]);
    expect(stier[1], 'skiltet til Terrassen 2 peger et andet sted hen').toBe(forventet[1]);
  });

  /* Adressen står under hvert skilt. Det er den ene ting, der
     ikke kan rettes bagefter: er koderne printet med den forkerte
     adresse, skal alle skilte laves om. */
  test('adressen står læsbart under koden', async ({ page }) => {
    await åbnPrint(page);
    await expect(page.locator('.kort .adresse').first()).toContainText('ved-bordet/?bord=7');
  });

  /* PRINTET FRA EN BÆRBAR PEGER PÅ DEN BÆRBARE. Adressen tages
     fra siden selv, så et eget domæne ikke kræver en kodeændring
     — men så kan man også komme til at printe skilte, der peger
     på localhost, og det kan man ikke se på en QR-kode. */
  test('åbnet fra egen maskine advarer den, før der printes', async ({ page }) => {
    await åbnPrint(page);
    await expect(page.locator('.advarsel').first()).toContainText('egen maskine');
  });

  test('er der ingen borde, siger siden det i stedet for et tomt ark', async ({ page }) => {
    await åbnPrint(page, []);
    /* Der står to advarsler i testmiljøet: den om localhost —
       som er dens egen prøve nedenfor — og den her. */
    await expect(page.locator('.advarsel').last()).toContainText('ingen borde');
    await expect(page.locator('.kort h1')).toHaveCount(0);
  });

  /* SKILTENE KOMMER UD I ÉN BUNKE PR. ZONE.
     Ejeren printer én gang og går ud med papiret i hånden. Lå
     Terrassens skilte spredt mellem Molens, skulle han sortere en
     stak varme sider ved printeren — og det er dér, bord 7's
     skilt ender på bord 9. */
  const ZONEBORDE = [
    { id: 1, lokation_id: 'mosede', nummer: '1', zone: 'Molen', pladser: 2, placering: 'ude', aktiv: true, sortering: 10 },
    { id: 2, lokation_id: 'mosede', nummer: '2', zone: 'Terrassen', pladser: 4, placering: 'ude', aktiv: true, sortering: 20 },
    { id: 3, lokation_id: 'mosede', nummer: '3', zone: 'Molen', pladser: 2, placering: 'ude', aktiv: true, sortering: 30 },
    { id: 4, lokation_id: 'mosede', nummer: '4', zone: null, pladser: 2, placering: 'inde', aktiv: true, sortering: 40 },
  ];

  test('skiltene står samlet pr. zone, og zoneløse borde til sidst', async ({ page }) => {
    await åbnPrint(page, ZONEBORDE);
    const navne = await page.locator('.kort h1').allTextContents();
    expect(navne, 'skiltene kom ikke ud i én bunke pr. zone')
      .toEqual(['Bord 1', 'Bord 3', 'Bord 2', 'Bord 4']);
  });

  test('zonen står på skiltet, så bunken kan bæres ud', async ({ page }) => {
    await åbnPrint(page, ZONEBORDE);
    await expect(page.locator('.kort').first()).toContainText('Molen');
    // Bord 4 har ingen zone — så står der ingen tom prik på skiltet.
    const sidste = page.locator('.kort', { hasText: 'Bord 4' });
    await expect(sidste).toContainText('2 pladser');
    await expect(sidste).not.toContainText('·  ·');
  });

  /* En ny zone begynder altid på et nyt ARK, så bunken kan deles
     ved arkkanten i stedet for ved en klippelinje. To Molen-borde
     fylder ét ark; Terrassen skal have sit eget. */
  test('en ny zone begynder på et nyt ark', async ({ page }) => {
    await åbnPrint(page, ZONEBORDE);
    await expect(page.locator('.ark')).toHaveCount(3);
    const foerste = page.locator('.ark').first();
    await expect(foerste.locator('.kort h1')).toHaveCount(2);
    await expect(page.locator('.ark').nth(1).locator('.kort h1')).toHaveText(['Bord 2']);
  });

  /* Uden zoner må intet ændre sig: to skilte pr. ark som før. */
  test('uden zoner er det stadig to skilte pr. ark', async ({ page }) => {
    await åbnPrint(page);
    await expect(page.locator('.ark')).toHaveCount(1);
    await expect(page.locator('.ark .kort')).toHaveCount(2);
  });
});
