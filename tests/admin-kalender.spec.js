/* KALENDEREN SKAL VÆRE EN KALENDER

   Kundens ord (24/8): "kalenderen skal være en kalender ... alt
   skal kunne administreres ift at have styr på alle ting derinde
   ... køreplanen får præcis den, skrive notater til den dag osv
   som selvfølgelig kommer ind i overblik".

   Fanen var en LISTE over arrangementer og lukkedage, og den
   vidste ikke, at der lå bestillinger, borde, forespørgsler eller
   en udlejning samme dag. Spørgsmålet "hvad sker der den 12.?"
   havde fire svar på fire faner, og det femte — "er lokalet lejet
   ud?" — kunne man kun finde ved at gætte.

   Prøverne her måler netop dét: at de fem kilder mødes på ÉN dag,
   og at noten til dagen når hele vejen ud på Overblik.

   Uret i åbnAdmin står på fredag den 7. august 2026, så nettet
   viser august 2026. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData } = require('./hjaelp');

const DAGEN = '2026-08-12';        // en onsdag i den viste måned

/* Fem kilder, samme dag. Rækkerne er skrevet af efter de rigtige
   kolonnenavne: bordene, forespørgslerne og udlejningerne hedder
   alle antal_personer og IKKE antal — det har kostet en runde før. */
function dagenFuld() {
  return grunddata({
    bestillinger: [{
      id: 1, lokation_id: 'mosede', reference: 'SM260812-AAAAA',
      navn: 'Anna Vind', telefon: '20304050', hent_dato: DAGEN,
      hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
      fyld: [], antal: 2, status: 'ny', intern_note: null,
      oprettet: '2026-08-07T10:00:00Z',
    }],
    bordbestillinger: [{
      id: 1, lokation_id: 'mosede', reference: 'BO260812-AAAAA',
      navn: 'Ole Berg', telefon: '30405060', dato: DAGEN, tid: '18:00',
      antal_personer: 6, besked: null, status: 'ny', intern_note: null,
      oprettet: '2026-08-07T10:00:00Z',
    }],
    forespoergsler: [{
      id: 1, lokation_id: 'mosede', reference: 'FO260812-AAAAA',
      slags: 'selskab', navn: 'Peter Lund', telefon: '40506070',
      email: 'p@example.com', dato: DAGEN, antal_personer: 20,
      besked: null, status: 'ny', intern_note: null,
      oprettet: '2026-08-07T10:00:00Z',
    }],
    udlejninger: [{
      id: 1, lokation_id: 'mosede', reference: 'BL260812-AAAAA',
      navn: 'Karen Sø', telefon: '50607080', email: null, dato: DAGEN,
      antal_personer: 30, besked: null, status: 'ny', intern_note: null,
      oprettet: '2026-08-07T10:00:00Z',
    }],
    kalender: [{
      id: 1, lokation_id: 'mosede', type: 'arrangement', dato: DAGEN,
      slut_dato: null, titel: 'Livemusik på molen', beskrivelse: null,
      emoji: '🎸', lukker_kl: null, offentlig: true,
      oprettet: '2026-08-01T10:00:00Z',
    }],
  });
}

async function åbnKalenderen(page, data) {
  await åbnAdmin(page, data ? { data } : undefined);
  await page.locator('[data-panel="p-kalender"]').click();
  await page.waitForSelector('.maaned-dag');
}

const dag = (page, iso) => page.locator(`.maaned-dag[data-dag="${iso}"]`);

test.describe('Måneden er et net, ikke en liste', () => {

  test('nettet viser den måned, vi står i, og kan skiftes', async ({ page }) => {
    await åbnKalenderen(page);
    await expect(page.locator('#maaned-navn')).toHaveText('August 2026');

    // 31 dage i august, og ingen af nabomånederne må snige sig med.
    await expect(page.locator('.maaned-dag')).toHaveCount(31);

    await page.locator('#maaned-naeste').click();
    await expect(page.locator('#maaned-navn')).toHaveText('September 2026');
    await expect(page.locator('.maaned-dag')).toHaveCount(30);

    await page.locator('#maaned-forrige').click();
    await page.locator('#maaned-forrige').click();
    await expect(page.locator('#maaned-navn')).toHaveText('Juli 2026');

    await page.locator('#maaned-idag').click();
    await expect(page.locator('#maaned-navn')).toHaveText('August 2026');
  });

  /* MANDAG ER FØRSTE SØJLE. getUTCDay() giver søndag = 0, og uden
     (+6)%7 stod hele måneden EN DAG forskudt. Det er den slags,
     ingen opdager, før nogen møder ind på den forkerte dag.

     1. august 2026 er en lørdag: den skal derfor stå i søjle seks,
     altså efter fem tomme felter. */
  test('måneden begynder om mandagen, ikke om søndagen', async ({ page }) => {
    await åbnKalenderen(page);
    const tomme = await page.locator('.maaned-tom').count();
    expect(tomme, '1. august 2026 er en lørdag og skal stå i sjette søjle').toBe(5);
  });

  test('i dag er markeret', async ({ page }) => {
    await åbnKalenderen(page);
    await expect(dag(page, '2026-08-07')).toHaveClass(/er-idag/);
    await expect(dag(page, '2026-08-08')).not.toHaveClass(/er-idag/);
  });
});

test.describe('Alle fem kilder mødes på den samme dag', () => {

  test('dagen bærer mærker for alt, der rører den', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    const d = dag(page, DAGEN);

    // Ét tegn pr. slags — bestilling, bord, forespørgsel,
    // udlejning og kalenderens egen række.
    await expect(d.locator('.maaned-maerke')).toHaveCount(5);
    await expect(d).toContainText('🥪');
    await expect(d).toContainText('🍽️');
    await expect(d).toContainText('💬');
    await expect(d).toContainText('🔑');
    await expect(d).toContainText('📅');
  });

  test('dagens panel skriver det hele ud', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();

    const panel = page.locator('#dag-panel');
    await expect(panel).toContainText('12. august');
    await expect(panel).toContainText('Anna Vind');
    await expect(panel).toContainText('Ole Berg');
    await expect(panel).toContainText('6 pers.');
    await expect(panel).toContainText('Peter Lund');
    await expect(panel).toContainText('20 pers.');   // antal_personer, ikke antal
    await expect(panel).toContainText('Karen Sø');
    await expect(panel).toContainText('30 pers.');
    await expect(panel).toContainText('Livemusik på molen');
  });

  test('panelet fører hen til den fane, tingen kan rettes på', async ({ page }) => {
    /* Panelet retter INTET selv. To steder at ændre en bestilling
       er to steder, der kan skride fra hinanden. */
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();

    await page.locator('#dag-panel button', { hasText: 'Åbn bestillinger' }).click();
    await expect(page.locator('#p-bestillinger')).toBeVisible();
  });

  test('et tryk på den valgte dag lukker panelet igen', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();
    await expect(page.locator('.dag-kort')).toHaveCount(1);
    await dag(page, DAGEN).click();
    await expect(page.locator('.dag-kort')).toHaveCount(0);
  });

  test('en tom dag siger det, i stedet for at stå tom', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, '2026-08-20').click();
    await expect(page.locator('#dag-panel')).toContainText('ikke andet på dagen');
  });
});

test.describe('Lukkedage og perioder farver nettet', () => {

  test('en lukkedag er markeret og siger hvorfor', async ({ page }) => {
    const d = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'lukkedag', dato: '2026-08-18',
        slut_dato: null, titel: 'Ferie', beskrivelse: null, emoji: null,
        lukker_kl: null, offentlig: true, oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnKalenderen(page, d);
    await expect(dag(page, '2026-08-18')).toHaveClass(/er-lukket/);
    await expect(dag(page, '2026-08-18')).toContainText('Lukket');

    await dag(page, '2026-08-18').click();
    await expect(page.locator('#dag-panel')).toContainText('Der er LUKKET');
  });

  /* EN PERIODE ER ÉN RÆKKE. En vinterlukning er ikke halvfems
     rækker — men den skal farve halvfems dage i nettet, ikke kun
     den første. Første udgave af raekkerOver() ville have vist
     kun startdagen, og så ville personalet tro, der var åbent den
     19. og den 20. */
  test('en periode farver alle dagene, ikke kun den første', async ({ page }) => {
    const d = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'lukkedag', dato: '2026-08-17',
        slut_dato: '2026-08-21', titel: 'Sommerlukket', beskrivelse: null,
        emoji: null, lukker_kl: null, offentlig: true,
        oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnKalenderen(page, d);
    for (const iso of ['2026-08-17', '2026-08-18', '2026-08-19',
      '2026-08-20', '2026-08-21']) {
      await expect(dag(page, iso), iso + ' skulle være lukket').toHaveClass(/er-lukket/);
    }
    await expect(dag(page, '2026-08-22')).not.toHaveClass(/er-lukket/);
    await expect(dag(page, '2026-08-16')).not.toHaveClass(/er-lukket/);
  });

  test('en tidlig lukning siger hvornår, ikke bare at der lukkes', async ({ page }) => {
    const d = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'tidlig_lukning', dato: '2026-08-14',
        slut_dato: null, titel: 'Personalefest', beskrivelse: null, emoji: null,
        lukker_kl: '15:00:00', offentlig: true, oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnKalenderen(page, d);
    await expect(dag(page, '2026-08-14')).toContainText('Til 15:00');
  });
});

test.describe('Noten til dagen når hele vejen ud på Overblik', () => {

  test('noten skrives på dagen og gemmes i kalenderen', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, '2026-08-07').click();

    await page.locator('#dag-note-felt').fill('Henning kommer og spiser kl. 18');
    await page.locator('#gem-dag-note').click();
    await expect(page.locator('#kvittering')).toContainText('Noten er gemt');

    const gemt = await gemteData(page);
    const note = gemt.kalender.find((k) => k.dato === '2026-08-07');
    expect(note.beskrivelse).toBe('Henning kommer og spiser kl. 18');
    /* INTERN, ALTID. En note til personalet, der ved en fejl blev
       offentlig, ville stå på gæsternes forside som et
       arrangement. */
    expect(note.offentlig, 'noten må ALDRIG være offentlig').toBe(false);
    expect(note.titel, 'kendingen er titlen — se NOTE_TITEL').toBe('Note til dagen');
  });

  test('og den står på Overblik, når det er i dag', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, '2026-08-07').click();
    await page.locator('#dag-note-felt').fill('Der kommer en levering kl. 9');
    await page.locator('#gem-dag-note').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    await page.locator('[data-panel="p-overblik"]').click();
    /* Noten står i et FELT på køreplanen nu (26/8) og ikke som en
       linje tekst — den kan skrives begge steder. toContainText
       kan ikke se en feltværdi; det er den samme fælde som
       navnene i admin, der bærer data-vare. */
    await expect(page.locator('#plan-note-felt'))
      .toHaveValue('Der kommer en levering kl. 9');
  });

  test('en note til en ANDEN dag står ikke på Overblik', async ({ page }) => {
    /* Køreplanen er dagens. Stod morgendagens note der også, ville
       personalet handle på den i dag. */
    await åbnKalenderen(page);
    await dag(page, '2026-08-20').click();
    await page.locator('#dag-note-felt').fill('Husk at bestille rugbrød');
    await page.locator('#gem-dag-note').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    await page.locator('[data-panel="p-overblik"]').click();
    await expect(page.locator('#plan-note-felt')).toHaveValue('');
    await expect(page.locator('#overblik-koereplan')).not.toContainText('rugbrød');
  });

  test('en tom note er ingen note', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, '2026-08-07').click();
    await page.locator('#gem-dag-note').click();
    await expect(page.locator('#fejl')).toContainText('Skriv noget');

    const gemt = await gemteData(page);
    expect((gemt.kalender || []).length, 'en tom note blev gemt som en række').toBe(0);
  });

  /* Noten er en kalenderrække med typen arrangement. Den må IKKE
     tælle som et arrangement — hverken i nettet, på listen eller i
     beskeden om det manglende banner på forsiden. */
  test('noten er ikke et arrangement', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, '2026-08-07').click();
    await page.locator('#dag-note-felt').fill('Kun til os selv');
    await page.locator('#gem-dag-note').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const d = dag(page, '2026-08-07');
    await expect(d).toContainText('📝');
    await expect(d).not.toContainText('📅');
  });
});

test.describe('Køreplanen siger, om der er åbent', () => {

  test('åbent er den grønne stribe', async ({ page }) => {
    await åbnAdmin(page);
    await expect(page.locator('.plan-stribe')).toContainText('Åbent for bestillinger');
    await expect(page.locator('.plan-stribe')).not.toHaveClass(/plan-lukket/);
  });

  test('en lukkedag i dag slår alt andet', async ({ page }) => {
    const d = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'lukkedag', dato: '2026-08-07',
        slut_dato: null, titel: 'Ferie', beskrivelse: null, emoji: null,
        lukker_kl: null, offentlig: true, oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnAdmin(page, { data: d });
    await expect(page.locator('.plan-stribe')).toContainText('Lukket i dag');
    await expect(page.locator('.plan-stribe')).toHaveClass(/plan-lukket/);
  });

  test('slukkede bestillinger siges ogsaa højt', async ({ page }) => {
    /* Der ER åbent i lugen, men siden tager ikke imod. To
       forskellige ting, og personalet skal kunne se forskel:
       ellers leder de efter en fejl i formularen. */
    const d = grunddata();
    d.indstillinger.bestilling_aaben = false;
    await åbnAdmin(page, { data: d });
    await expect(page.locator('.plan-stribe')).toContainText('slået fra');
  });

  test('er baglokalet lejet ud i dag, står det på køreplanen', async ({ page }) => {
    const d = grunddata({
      udlejninger: [{
        id: 1, lokation_id: 'mosede', reference: 'BL260807-AAAAA',
        navn: 'Karen Sø', telefon: '50607080', email: null,
        dato: '2026-08-07', antal_personer: 30, besked: null,
        status: 'aftalt', intern_note: null, oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#overblik-koereplan')).toContainText('Baglokalet er lejet ud');
    await expect(page.locator('#overblik-koereplan')).toContainText('Karen Sø');
  });

  test('en udlejning, der kun er FORESPURGT, står der ikke', async ({ page }) => {
    /* Kun aftalte optager lokalet — se optagne_dage i
       forespoergsel-kalender.sql. En forespørgsel, der lige er
       kommet ind, er et spørgsmål, ikke en booking, og køreplanen
       må ikke sige, at lokalet er optaget. */
    const d = grunddata({
      udlejninger: [{
        id: 1, lokation_id: 'mosede', reference: 'BL260807-AAAAA',
        navn: 'Karen Sø', telefon: '50607080', email: null,
        dato: '2026-08-07', antal_personer: 30, besked: null,
        status: 'ny', intern_note: null, oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#overblik-koereplan')).not.toContainText('lejet ud');
  });
});

/* ⚠️ DE SMÅ KNAPPER SKAL BLIVE VED MED AT VÆRE DÆMPEDE.

   Da admin fik gæstesidens tema (24/8), fik body.personale .knap
   mærkefarven — og den regel vejer tungere end .knap.lille. Så
   blev pilene op/ned på Menukort og månedsskiftet her RØDE. Noten
   ved .knap.lille i style.css advarer netop imod det: de er et
   værktøj, man bruger sjældent, og i rødt råber de lige så højt
   som Gem, der bruges hver dag.

   Set på et skærmbillede, usynligt i koden. Prøven læser den
   BEREGNEDE farve, som prøven for den gule kant på telefonen. */
test('de små knapper er dæmpede, ikke røde', async ({ page }) => {
  await åbnKalenderen(page);
  const farve = await page.locator('#maaned-forrige')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(farve, 'månedspilene må ikke råbe som en Gem-knap')
    .not.toBe('rgb(214, 42, 58)');

  await page.locator('[data-panel="p-menu"]').click();
  const pil = await page.locator('.flyt .knap.lille').first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(pil, 'pilene på Menukort må heller ikke').not.toBe('rgb(214, 42, 58)');
});

/* ------------------------------------------------------------
   PERSONALET SKAL KUNNE TAGE EN BOOKING I TELEFONEN
   ------------------------------------------------------------
   Ringer nogen og bestiller et bord, fandtes der ingen vej ind:
   bookingen kunne kun laves på hjemmesiden. Så stod halvdelen af
   dagen i systemet og halvdelen på en seddel ved lugen — og
   dagens billede løj om, hvor mange pladser der var tilbage.
   ------------------------------------------------------------ */
test.describe('Booking taget i telefonen', () => {

  async function åbnBorde(page, data) {
    await åbnAdmin(page, data ? { data } : undefined);
    await page.locator('[data-panel="p-borde"]').click();
    await page.locator('#tag-booking summary').click();
  }

  async function udfyld(page, æ) {
    const v = { navn: 'Anna Vind', telefon: '20304050', dato: '2026-08-14',
      tid: '18:00', antal: '4', ...æ };
    await page.locator('#nyb-navn').fill(v.navn);
    await page.locator('#nyb-telefon').fill(v.telefon);
    await page.locator('#nyb-dato').fill(v.dato);
    await page.locator('#nyb-tid').fill(v.tid);
    await page.locator('#nyb-antal').fill(v.antal);
  }

  test('bookingen lander i den samme liste som gæsternes', async ({ page }) => {
    await åbnBorde(page);
    await udfyld(page);
    await page.locator('#opret-booking').click();
    await expect(page.locator('#kvittering')).toContainText('oprettet og bekræftet');

    const gemt = await gemteData(page);
    expect(gemt.bordbestillinger).toHaveLength(1);
    const b = gemt.bordbestillinger[0];
    expect(b.navn).toBe('Anna Vind');
    expect(b.dato).toBe('2026-08-14');
    expect(b.antal_personer).toBe(4);
    /* BEKRÆFTET, IKKE NY. Personalet har sagt ja i røret; en
       booking, der lander som "ny", står på listen som noget, der
       skal ringes om — og så bliver der ringet til en, der lige
       har lagt på. */
    expect(b.status).toBe('bekraeftet');
    expect(b.intern_note).toContain('telefonen');
    // Samme referenceform som gæsternes: BO.
    expect(b.reference).toMatch(/^BO\d{6}-/);
  });

  test('og den står med det samme på fanen og i kalenderen', async ({ page }) => {
    await åbnBorde(page);
    await udfyld(page, { navn: 'Ole Berg', dato: '2026-08-14' });
    await page.locator('#opret-booking').click();
    await expect(page.locator('#kvittering')).toContainText('oprettet');

    await expect(page.locator('#borde-liste')).toContainText('Ole Berg');

    await page.locator('[data-panel="p-kalender"]').click();
    await expect(dag(page, '2026-08-14')).toContainText('🍽️');
  });

  test('felterne tømmes, så nummer to ikke arver nummer et', async ({ page }) => {
    /* Uden det ville personalet, der tager to opkald i træk,
       sende den samme gæst ind igen — og dobbeltnøglen ville
       afvise den med en besked, der ikke giver mening. */
    await åbnBorde(page);
    await udfyld(page);
    await page.locator('#opret-booking').click();
    await expect(page.locator('#kvittering')).toContainText('oprettet');
    await expect(page.locator('#nyb-navn')).toHaveValue('');
    await expect(page.locator('#nyb-telefon')).toHaveValue('');
  });

  test('den bruger gæstens egne værn — dobbelt er stadig dobbelt', async ({ page }) => {
    /* Butik.bookBord er den SAMME funktion, hjemmesiden kalder.
       At skrive en anden vej ind i den samme tabel ville være to
       regelsæt, der langsomt kommer til at sige noget forskelligt. */
    await åbnBorde(page);
    await udfyld(page);
    await page.locator('#opret-booking').click();
    await expect(page.locator('#kvittering')).toContainText('oprettet');

    await udfyld(page);
    await page.locator('#opret-booking').click();
    await expect(page.locator('#fejl')).toContainText('allerede');

    const gemt = await gemteData(page);
    expect(gemt.bordbestillinger).toHaveLength(1);
  });

  test('en booking uden klokkeslæt bliver afvist', async ({ page }) => {
    await åbnBorde(page);
    await udfyld(page, { tid: '' });
    await page.locator('#opret-booking').click();
    await expect(page.locator('#fejl')).toContainText('hvad klokken er');

    const gemt = await gemteData(page);
    expect(gemt.bordbestillinger || []).toHaveLength(0);
  });

  test('hundrede mennesker er ikke et bord', async ({ page }) => {
    await åbnBorde(page);
    await udfyld(page, { antal: '150' });
    await page.locator('#opret-booking').click();
    await expect(page.locator('#fejl')).toContainText('selskab');
  });

  test('formularen er foldet sammen, til nogen har brug for den', async ({ page }) => {
    /* Fanen handler om de bookinger, der ER kommet ind. Syv åbne
       felter oven over dagens liste ville skubbe arbejdet ned
       hver eneste gang, nogen åbnede fanen. */
    await åbnAdmin(page);
    await page.locator('[data-panel="p-borde"]').click();
    await expect(page.locator('#nyb-navn')).toBeHidden();
  });
});

/* ============================================================
   DAGENS STYRING — DEN HALVT ÅBNE DAG
   ------------------------------------------------------------
   Kundens ord (26/8): "hvis der er selskab en dag som en booking
   der er blevet oprettet skal de kunne administrere at der ikke
   er åbent for bestillinger den dag eller kun åbent for to go
   ... så det netop ikke kan gå galt."

   Databasen afviser (proev-dagsregler.sql, 21 af 21), og
   gæstesiden skjuler (tests/dagsregler.spec.js). Her måles den
   tredje del: at personalet kan SÆTTE reglen — og at skærmen
   fortæller dem, hvad den koster, før de gør det.
   ============================================================ */
test.describe('Dagen kan være halvt åben', () => {

  const DAG = '2026-08-20';

  test('de to veje står som et valg, begge åbne fra start', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    const veje = page.locator('.dag-vej');
    await expect(veje).toHaveCount(2);
    await expect(veje.filter({ hasText: 'Ud af huset' })).toContainText('Åben');
    await expect(veje.filter({ hasText: 'Spis her' })).toContainText('Åben');
  });

  test('lukkes spis her, står det i databasen — og take-away er urørt',
    async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');

    const d = await gemteData(page);
    const r = (d.dags_regler || []).filter((x) => x.dato === DAG)[0];
    expect(r, 'der blev ikke skrevet en regel').toBeTruthy();
    expect(r.luk_spis_her).toBe(true);
    expect(r.luk_takeaway, 'take-away blev lukket med').toBe(false);
  });

  /* ⚠️ EN DAG UDEN NOGET SÆRLIGT SKAL IKKE HAVE EN RÆKKE. En
     tabel fuld af rækker, der siger "helt almindelig", er en
     tabel, nogen skal vedligeholde — og den dag, en af dem bliver
     forkert, står den og lyver stille. */
  test('åbnes den igen, forsvinder rækken helt', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');

    await page.locator('.dag-vej[data-vej="luk_spis_her"] button',
      { hasText: 'Åbn igen' }).click();
    await expect(page.locator('#kvittering')).toContainText('åben igen');

    const d = await gemteData(page);
    expect((d.dags_regler || []).filter((x) => x.dato === DAG)).toHaveLength(0);
  });

  test('månedsnettet siger det på afstand', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');

    await expect(dag(page, DAG)).toContainText('Kun ud af huset');
    await expect(dag(page, DAG)).toHaveClass(/er-halv/);
    // Nabodagen er urørt
    await expect(dag(page, '2026-08-21')).not.toContainText('Kun ud af huset');
  });

  /* Begge veje spærret ER en lukkedag — også i nettet. Ellers
     ligner den en halvt åben dag, og nogen regner med, at der
     stadig kan hentes. */
  test('begge veje lukket ser ud som en lukkedag', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');
    await page.locator('.dag-vej[data-vej="luk_takeaway"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');

    await expect(dag(page, DAG)).toContainText('Lukket');
    await expect(dag(page, DAG)).toHaveClass(/er-lukket/);
  });

  test('dagens tider gemmer sig selv', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await page.locator('#dag-senest-togo').fill('19:00');
    await page.locator('#dag-senest-togo').blur();
    await expect(page.locator('.dag-styring .gemt-maerke')).toHaveText('✓ Gemt');

    const d = await gemteData(page);
    const r = (d.dags_regler || []).filter((x) => x.dato === DAG)[0];
    expect(r.senest_togo).toBe('19:00');
    await expect(dag(page, DAG)).toContainText('Egne tider');
  });

  /* ⚠️ BESKEDEN LÆSES AF GÆSTEN, og feltet skal sige det HVOR
     feltet er. En medarbejder, der skriver "ring til Henning" i
     den, har skrevet det på hjemmesiden. */
  test('gæstebeskeden siger selv, at gæsterne kan læse den', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    const linje = page.locator('.dag-styring .hjaelp.advarsel');
    await expect(linje).toContainText('gæsterne kan læse');
  });
});

/* ============================================================
   DET KLOGE: SKÆRMEN KIGGER PÅ DAGEN FØRST
   ============================================================ */
test.describe('Kalenderen advarer, før noget kan gå galt', () => {

  const DAG = '2026-08-20';

  function medUdlejning() {
    const d = dagenFuld();
    d.udlejninger = [{
      id: 1, lokation_id: 'mosede', reference: 'UD-1', navn: 'Hansen',
      telefon: '20304050', dato: DAG, antal_personer: 40,
      status: 'aftalt', besked: null, intern_note: null, slettet: null,
      oprettet: '2026-08-01T10:00:00Z',
    }];
    return d;
  }

  /* DEN DAG, HELE TABELLEN BLEV BYGGET TIL. Personalet skal ikke
     skulle huske sammenhængen mellem en udlejning og en
     bestillingsformular — skærmen kender den. */
  test('er baglokalet lejet ud, foreslår den at lukke for spis her',
    async ({ page }) => {
    await åbnKalenderen(page, medUdlejning());
    await dag(page, DAG).click();

    const forslag = page.locator('.dag-forslag');
    await expect(forslag).toContainText('Hansen');
    await expect(forslag).toContainText('40');
    await expect(forslag).toContainText('spis her');

    await forslag.locator('button').click();
    await expect(page.locator('#kvittering')).toContainText('spis her');

    const d = await gemteData(page);
    expect((d.dags_regler || []).filter((x) => x.dato === DAG)[0].luk_spis_her)
      .toBe(true);
  });

  /* Forslaget skal FORSVINDE, når det er fulgt. Et forslag, der
     bliver stående, læses som "det virkede ikke". */
  test('forslaget er væk, når det er fulgt', async ({ page }) => {
    await åbnKalenderen(page, medUdlejning());
    await dag(page, DAG).click();
    await page.locator('.dag-forslag button').click();
    await expect(page.locator('#kvittering')).toContainText('spis her');
    await expect(page.locator('.dag-forslag')).toHaveCount(0);
  });

  test('uden noget optaget er der intet forslag', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await expect(page.locator('.dag-forslag')).toHaveCount(0);
  });

  /* ⚠️ EN LUKNING MÅ IKKE STRANDE NOGEN I STILHED. Ligger der
     bestillinger på dagen, skal personalet SE dem med navn og
     klokkeslæt, før de lukker. Ellers opdages det, når gæsten
     står ved lugen. */
  test('ligger der bestillinger, siges det med navn før der lukkes',
    async ({ page }) => {
    const d = dagenFuld();
    d.bestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'SM-1', navn: 'Sara Dam',
      telefon: '20304050', hent_dato: DAG, hent_tid: '17:30',
      linjer: [{ navn: 'Fiskefilet', antal: 2, pris: 75 }], fyld: [], antal: 2,
      besked: null, status: 'bekraeftet', hvordan: 'spis_her',
      leverings_adresse: null, intern_note: null, slettet: null,
      oprettet: '2026-08-19T10:00:00Z',
    }];
    await åbnKalenderen(page, d);
    await dag(page, DAG).click();

    let tekst = '';
    page.on('dialog', (dlg) => { tekst = dlg.message(); dlg.dismiss(); });
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();

    expect(tekst).toContain('Sara Dam');
    expect(tekst).toContain('17:30');

    // Afvist i advarslen = ingenting sker
    const gemt = await gemteData(page);
    expect((gemt.dags_regler || []).filter((x) => x.dato === DAG)).toHaveLength(0);
  });

  /* Den anden vej: en spis her-bestilling må ikke advare om en
     take-away-lukning. En advarsel, der kommer hver gang, holder
     man op med at læse. */
  test('en spis her-bestilling advarer ikke mod at lukke take-away',
    async ({ page }) => {
    const d = dagenFuld();
    d.bestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'SM-1', navn: 'Sara Dam',
      telefon: '20304050', hent_dato: DAG, hent_tid: '17:30',
      linjer: [{ navn: 'Fiskefilet', antal: 2, pris: 75 }], fyld: [], antal: 2,
      besked: null, status: 'bekraeftet', hvordan: 'spis_her',
      leverings_adresse: null, intern_note: null, slettet: null,
      oprettet: '2026-08-19T10:00:00Z',
    }];
    await åbnKalenderen(page, d);
    await dag(page, DAG).click();

    let kom = false;
    page.on('dialog', (dlg) => { kom = true; dlg.dismiss(); });
    await page.locator('.dag-vej[data-vej="luk_takeaway"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');
    expect(kom, 'der blev advaret om en bestilling, lukningen ikke rammer')
      .toBe(false);
  });
});
