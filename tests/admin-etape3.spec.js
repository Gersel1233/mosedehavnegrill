/* ETAPE 3 FRA SPIIS-GENNEMGANGEN — de fire små, der manglede

   Skærmbillederne af spiis' admin (26/8) viste fire ting, vores
   ikke havde, og som ikke kræver noget nyt i databasen:

   1) SKJUL er ikke SLET. Kolonnen aktiv har ligget i databasen
      siden setup.sql — det var knappen, der manglede, og uden
      den var "Slet" den eneste måde at få en nyhed væk på.
   2) Månedens noter som LISTE. I nettet er en note en 📝-prik,
      og så skal man huske, hvilke dage der har en.
   3) Udeblivelser i KRONER. "2 udeblivelser" lyder som et
      vilkår; "1.370 kr. tabt" er et sprog, en beslutning tages
      på. Og snittet pr. bestilling ved siden af.
   4) Sikkerhedskopien. Én fil med alt det, admin har i hænderne.
*/

const { test, expect } = require('@playwright/test');
const { åbnAdmin, åbn, grunddata, gemteData, visFane } = require('./hjaelp');

// ============================================================
//  1) SKJUL OG VIS
// ============================================================
test.describe('En nyhed kan skjules uden at blive slettet', () => {

  const NYHED = {
    id: 1, titel: 'J-dag ved havnen', tekst: 'Vi fejrer det.',
    dato: '2026-08-01', aktiv: true,
  };

  async function åbnNyheder(page, nyheder) {
    await åbnAdmin(page, { data: grunddata({ nyheder }) });
    await visFane(page, 'p-nyheder');
  }

  test('Skjul tager nyheden af siden — og gemmer den ikke væk', async ({ page }) => {
    await åbnNyheder(page, [NYHED]);
    await page.locator('#nyheder-liste button', { hasText: 'Skjul' }).click();
    await expect(page.locator('#kvittering')).toContainText('skjult');

    // Rækken STÅR der stadig, mærket siger Skjult, og knappen er
    // blevet vejen tilbage.
    await expect(page.locator('#nyheder-liste')).toContainText('J-dag ved havnen');
    await expect(page.locator('#nyheder-liste .maerke')).toContainText('Skjult');
    await expect(page.locator('#nyheder-liste button', { hasText: 'Vis igen' })).toBeVisible();
    expect((await gemteData(page)).nyheder[0].aktiv).toBe(false);
  });

  test('Vis igen sætter den tilbage på siden', async ({ page }) => {
    await åbnNyheder(page, [{ ...NYHED, aktiv: false }]);
    await expect(page.locator('#nyheder-liste .maerke')).toContainText('Skjult');
    await page.locator('#nyheder-liste button', { hasText: 'Vis igen' }).click();
    await expect(page.locator('#nyheder-liste .maerke')).toContainText('Vises nu');
    expect((await gemteData(page)).nyheder[0].aktiv).toBe(true);
  });

  /* Og forsiden skal adlyde: en skjult nyhed findes ikke for
     gæsten — det er hele pointen med knappen. */
  test('en skjult nyhed står ikke på forsiden', async ({ page }) => {
    await åbn(page, '/index.html', {
      data: grunddata({ nyheder: [{ ...NYHED, aktiv: false }] }),
    });
    const tekst = await page.evaluate(() => document.body.innerText);
    expect(tekst).not.toContain('J-dag ved havnen');
  });
});

// ============================================================
//  2) MÅNEDENS NOTER
// ============================================================
test.describe('Månedens noter står som en liste', () => {

  const NOTER = [
    { id: 1, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-14',
      slut_dato: null, titel: 'Note til dagen', beskrivelse: 'Personale dag',
      emoji: null, lukker_kl: null, offentlig: false, oprettet: '2026-08-01T10:00:00Z' },
    { id: 2, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-21',
      slut_dato: null, titel: 'Note til dagen', beskrivelse: 'Cafeen lukket — take away kan bestilles',
      emoji: null, lukker_kl: null, offentlig: false, oprettet: '2026-08-01T10:00:00Z' },
    /* Et RIGTIGT arrangement må ikke stå i notelisten — det har
       sin egen plads i nettet og på arrangementssiden. */
    { id: 3, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-22',
      slut_dato: null, titel: 'Livemusik på molen', beskrivelse: 'Fra kl. 19',
      emoji: '🎸', lukker_kl: null, offentlig: true, oprettet: '2026-08-01T10:00:00Z' },
  ];

  async function åbnKalenderen(page, kalender) {
    await åbnAdmin(page, { data: grunddata({ kalender }) });
    await visFane(page, 'p-kalender');
    // Scopet: Baglokale-fanen har sit eget månedsnet (27/8).
    await page.waitForSelector('#maaned-net .maaned-dag');
  }

  test('listen viser månedens noter — og kun noterne', async ({ page }) => {
    await åbnKalenderen(page, NOTER);
    const linjer = page.locator('.noter-linje');
    await expect(linjer).toHaveCount(2);
    await expect(linjer.nth(0)).toContainText('Personale dag');
    await expect(linjer.nth(1)).toContainText('Cafeen lukket');
    await expect(page.locator('#maaned-noter'),
      'et offentligt arrangement er røget med i notelisten')
      .not.toContainText('Livemusik');
  });

  /* Forlæggets egen underlinje (3/9). Uden den er listen en
     overskrift med datoer under — og så trykker man ikke, fordi
     der ikke står, at man kan. */
  test('listen siger, hvor mange dage der har noter, og at man kan trykke', async ({ page }) => {
    await åbnKalenderen(page, NOTER);
    const under = page.locator('#maaned-noter .noter-under');
    await expect(under).toHaveText(/2 dage har noter denne måned/);
    await expect(under).toContainText('tryk på en note');
  });

  test('et tryk på en note åbner dagen', async ({ page }) => {
    await åbnKalenderen(page, NOTER);
    await page.locator('.noter-linje', { hasText: 'Personale dag' }).click();
    await expect(page.locator('#maaned-net .maaned-dag[data-dag="2026-08-14"]'))
      .toHaveClass(/valgt/);
    await expect(page.locator('#dag-panel')).toContainText('14. august');
  });

  /* Findes der ingen noter, findes listen ikke. En tom overskrift
     er en liste, man tror er i stykker. */
  test('uden noter er der ingen liste', async ({ page }) => {
    await åbnKalenderen(page, []);
    await expect(page.locator('#maaned-noter .noter-titel')).toHaveCount(0);
  });
});

// ============================================================
//  3) SALG: KRONERNE OG SNITTET
// ============================================================
test.describe('Salg taler i kroner', () => {

  const bestilling = (æ) => ({
    id: 1, lokation_id: 'mosede', reference: 'SM260807-AAAAA',
    navn: 'Anna', telefon: '20304050', hent_dato: '2026-08-07',
    hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
    fyld: [], antal: 2, status: 'afhentet', intern_note: null,
    oprettet: '2026-08-07T09:00:00Z', ...æ,
  });

  async function åbnSalg(page, bestillinger) {
    await åbnAdmin(page, { data: grunddata({ bestillinger }) });
    await visFane(page, 'p-salg');
  }

  /* "2 udeblivelser" er et vilkår; "1.370 kr." er maden, der blev
     lavet og smidt ud. Tallet er varelinjernes — det, gæsten
     SKULLE have betalt. */
  test('udeblivelserne gøres op i kroner', async ({ page }) => {
    await åbnSalg(page, [
      bestilling({ id: 1 }),
      bestilling({ id: 2, reference: 'SM260807-BBBBB', status: 'udeblevet',
        linjer: [{ navn: 'Tapasfad', antal: 2, pris: 685 }], antal: 2 }),
    ]);
    const felt = page.locator('#salg-udeblivelser .tal-felt');
    await expect(felt).toContainText('1');
    // "1.370 kr." med tusindpunktum (5/9): Butik.pris er et alias for
    // Butik.kroner, den ENE prisformaterer — og den skriver dansk.
    // Prøven krævede "1370 kr.", fordi den gamle pris() ikke satte
    // punktummet; det er formatet, der er rettet, ikke tallet.
    await expect(felt, 'kronerne mangler på udeblivelsen').toContainText('1.370 kr.');
    await expect(felt).toContainText('tæller ikke som salg');
  });

  test('uden udeblivelser står der ingen kroner', async ({ page }) => {
    await åbnSalg(page, [bestilling({ id: 1 })]);
    const felt = page.locator('#salg-udeblivelser .tal-felt');
    await expect(felt).toContainText('0');
    await expect(felt).not.toContainText('i mad, der var lavet');
  });

  test('snittet pr. bestilling regnes af det solgte', async ({ page }) => {
    await åbnSalg(page, [
      bestilling({ id: 1 }),                                          // 110
      bestilling({ id: 2, reference: 'SM260807-CCCCC',
        linjer: [{ navn: 'Fadøl', antal: 2, pris: 45 }], antal: 2 }), // 90
    ]);
    const snit = page.locator('#salg-tal .tal-felt', { hasText: 'Snit pr. bestilling' });
    await expect(snit).toContainText('100 kr.');
  });

  /* Et snit af ingenting er en division med nul klædt ud som et
     tal. */
  test('uden salg findes snittet ikke', async ({ page }) => {
    await åbnSalg(page, []);
    await expect(page.locator('#salg-tal')).not.toContainText('Snit pr. bestilling');
  });
});

// ============================================================
//  4) SIKKERHEDSKOPIEN
// ============================================================
test.describe('Sikkerhedskopien er én fil med det hele', () => {

  test('filen indeholder menuen, indstillingerne og listerne', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        bestillinger: [{
          id: 1, lokation_id: 'mosede', reference: 'SM260807-AAAAA',
          navn: 'Anna', telefon: '20304050', hent_dato: '2026-08-07',
          hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
          fyld: [], antal: 2, status: 'ny', intern_note: null,
          oprettet: '2026-08-07T09:00:00Z',
        }],
      }),
    });
    /* ⚠️ KOPIEN FLYTTEDE TIL INDSTILLINGER (30/8), OG PRØVEN
       FULGTE IKKE MED. Kunden bad om, at Kontakt blev til
       Indstillinger og fik "flere ting" — sikkerhedskopien er
       netop sådan en: den hører til, hvor man styrer forretningen,
       ikke i loggen over, hvad der ER sket. Prøven ledte stadig
       på Historik og ventede tredive sekunder på en knap, der var
       flyttet. */
    await visFane(page, 'p-kontakt');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#hent-backup').click(),
    ]);

    // Datoen i navnet: to kopier må ikke overskrive hinanden i en
    // downloadmappe.
    expect(download.suggestedFilename()).toBe('mosede-backup-2026-08-07.json');

    const sti = await download.path();
    const pakke = JSON.parse(require('fs').readFileSync(sti, 'utf8'));
    expect(pakke.data.menu_varer.length).toBeGreaterThan(0);
    expect(pakke.data.indstillinger).toBeTruthy();
    expect(pakke.lister.bestillinger.length).toBe(1);
    expect(pakke.lister.bestillinger[0].reference).toBe('SM260807-AAAAA');
    await expect(page.locator('#kvittering')).toContainText('Sikkerhedskopien');
  });
});
