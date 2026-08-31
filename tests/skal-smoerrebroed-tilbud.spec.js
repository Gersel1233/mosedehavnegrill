/* SMØRREBRØD UD AF HUSET ER EN FORESPØRGSEL  (31/8)

   Kundens ord: *"fixet smørrebrød ud af huset — fuck af med
   kalenderen, det er ligegyldigt, og skriv en masse godt, men så
   bare hav en knap, der hedder kontakt og få et tilbud, som
   henviser dem til selskab1@mosedehavnecafe.dk med en præ-skrevet
   start."* Adspurgt direkte valgte han, at bestillingsformularen
   skal HELT væk.

   ⚠️ OG I SAMME BESKED: *"alt, der svares derinde, skal vi kunne
   se inde i Forespørgsler i admin, og det skal være tydeligt,
   hvad for en ting det drejer sig om."* De to sætninger peger
   hver sin vej, hvis knappen bare er en mailto — en mail lander i
   en indbakke, tælles ingen steder og kan ikke lægges i
   kalenderen. Det er præcis dét, han selv afviste 28/8 om
   bordbestilling.

   Derfor måler filen her BEGGE dele:

   1) formularen er væk — ingen kurv, ingen dagvælger
   2) det, gæsten skriver, LANDER i forespørgslerne med sin egen
      slags, så personalet kan se hvad det drejer sig om
   3) og mailknappen er stadig der som den anden vej, med et
      færdigskrevet brev

   Den gamle fils 24 prøver er parkeret i tests-gamle/ — læs
   dens afsnit i tests-gamle/README.md, før nogen tror, at
   dækningen bare forsvandt. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const SIDE = '/h-smorrebrod.html';

async function åbn(page, d) {
  await åbnSkal(page, SIDE, { data: d || grunddata() });
}

test.describe('Siden bestiller ikke længere — den spørger', () => {

  test('der er hverken kurv, dagvælger eller tidsvælger', async ({ page }) => {
    await åbn(page);
    /* Bestillingsmotorens egne kendetegn. Var ét af dem tilbage,
       ville siden både spørge og bestille — to veje ind til den
       samme mad, som langsomt kommer til at sige hver sit. */
    await expect(page.locator('#bestil-stykker')).toHaveCount(0);
    await expect(page.locator('#bestil-sum-tekst')).toHaveCount(0);
    await expect(page.locator('[data-step]')).toHaveCount(0);
    await expect(page.locator('#stid')).toHaveCount(0);
    /* Og ingen ledighedskalender: smørrebrød ud af huset optager
       ingen dage, så et net ville bare fylde. */
    await expect(page.locator('#ledigkal')).toHaveCount(0);
  });

  /* ⚠️ MEN DATOEN ER IKKE VÆK — DEN ER BLEVET FRIVILLIG.
     "Engang i oktober" er en helt rimelig forespørgsel, og et
     varsel ville afvise den. */
  test('man kan sende uden at have valgt en dato', async ({ page }) => {
    await åbn(page);
    await page.fill('#santal', '20');
    await page.fill('#snavn', 'Karen Kok');
    await page.fill('#stlf', '20304050');
    await page.locator('#ssend').click();

    const gemt = await gemteData(page);
    expect(gemt.forespoergsler, 'forespørgslen blev ikke sendt').toHaveLength(1);
    expect(gemt.forespoergsler[0].dato).toBeNull();
  });

  test('den lander som SIN EGEN slags, ikke som et selskab', async ({ page }) => {
    await åbn(page);
    /* ⚠️ INTET ER VALGT PÅ FORHÅND i madvælgeren, siden den blev
       ejerens egen liste (31/8): et forudvalgt "Håndmadder" ville
       lægge en ret i forespørgslen, gæsten aldrig har peget på.
       Samme regel som størrelsesvælgeren havde 30/8. */
    await page.locator('#smad-valg button').first().click();
    await page.fill('#santal', '40');
    await page.fill('#snavn', 'Bo Bager');
    await page.fill('#stlf', '20304051');
    await page.locator('#ssend').click();

    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.type, 'slagsen er forkert — personalet kan ikke se, hvad det drejer sig om')
      .toBe('smoerrebroed');
    expect(f.antal_personer).toBe(40);
    /* Anledningen og maden er gæstens valg, ikke gætværk. */
    expect(f.detaljer.anledning).toBeTruthy();
    expect(Array.isArray(f.detaljer.mad)).toBe(true);
  });

  /* ⚠️ OG DEN SKAL KUNNE SES I ADMIN MED ET NAVN, MAN FORSTÅR.
     Står der "smoerrebroed" råt på kortet, skal personalet
     oversætte databasens ord i hovedet, mens de har travlt. */
  test('admin viser den med sit fulde navn', async ({ page }) => {
    const d = grunddata();
    d.forespoergsler = [{
      id: 1, lokation_id: 'mosede', reference: 'FO-1', type: 'smoerrebroed',
      navn: 'Karen Kok', telefon: '20304050', email: null,
      dato: '2026-10-03', antal_personer: 40, besked: null,
      detaljer: { anledning: 'Reception', mad: ['Håndmadder'] },
      status: 'ny', intern_note: null, slettet: null,
      oprettet: '2026-08-07T09:00:00.000Z',
    }];
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-forespoergsler');

    await expect(page.locator('#forespoergsler-liste'))
      .toContainText('Smørrebrød ud af huset');
  });
});

/* ============================================================
   1 MAD ER 1 MAD  (31/8)
   ------------------------------------------------------------
   Kundens ord: *"alle smørbrødene sælges som de er, ikke noget
   med valg af brød og derefter pålæg — nej, 1 mad er som 1 mad,
   og de skal allesammen kunne vælges i smørbrød ud af huset,
   normale bestillinger og QR-kode-bestillinger."*

   Designet leverede fem faste chips. Ejeren har over tredive
   slags i admin. De fem ville skride fra kortet med det samme.
   ============================================================ */
test.describe('Smørrebrødet i vælgeren er ejerens eget', () => {

  function medKort() {
    const d = grunddata();
    d.menu_kategorier = [
      { id: 1, lokation_id: 'mosede', navn: 'Smørrebrød', afdeling: 'mad',
        aktiv: true, sortering: 10 },
      { id: 2, lokation_id: 'mosede', navn: 'Vælg fyld til smørrebrødet',
        afdeling: 'mad', aktiv: true, sortering: 20 },
    ];
    d.menu_varer = [
      { id: 1, kategori_id: 1, navn: 'Håndmad', pris: 32, aktiv: true, sortering: 10 },
      { id: 2, kategori_id: 1, navn: 'Rejemad', pris: 85, aktiv: true, sortering: 20 },
      /* ⚠️ ET FYLD ER EN VARE NU. Før lå de 29 slags fyld i en
         egen "ønske"-liste uden pris; med 1 mad = 1 mad er de
         almindelige varer og skal kunne vælges. */
      { id: 3, kategori_id: 2, navn: 'Leverpostej', pris: 55, aktiv: true, sortering: 30 },
      /* Uden pris kan den stadig VÆLGES i en forespørgsel — der
         lægges ikke noget sammen her; personalet giver prisen. */
      { id: 4, kategori_id: 2, navn: 'Æbleflæsk', pris: null, aktiv: true, sortering: 40 },
      /* Udsolgt = "det har vi ikke". Fluebenet i admin ER
         ejerens udvalg, og et tilbud på noget, køkkenet ikke
         har, skal laves om. */
      { id: 5, kategori_id: 2, navn: 'Tunsalat', pris: 55, aktiv: true,
        udsolgt: true, sortering: 50 },
    ];
    return d;
  }

  test('hver slags smørrebrød står som sin egen pille', async ({ page }) => {
    await åbn(page, medKort());
    const chips = page.locator('#smad-valg button');
    await expect(chips).toHaveText(['Håndmad', 'Rejemad', 'Leverpostej', 'Æbleflæsk']);
  });

  test('en udsolgt slags kan ikke vælges', async ({ page }) => {
    await åbn(page, medKort());
    await expect(page.locator('#smad-valg button', { hasText: 'Tunsalat' })).toHaveCount(0);
  });

  /* ⚠️ VI OVERSKRIVER KUN, NÅR DATABASEN HAR NOGET AT SIGE.
     En side, der tømmer sin egen vælger, fordi kortet er tomt,
     er værre end en side med designets fem generelle ord. */
  test('uden smørrebrød på kortet bliver designets egne stående', async ({ page }) => {
    const d = grunddata();
    d.menu_kategorier = [];
    d.menu_varer = [];
    await åbn(page, d);
    await expect(page.locator('#smad-valg button', { hasText: 'Håndmadder' })).toHaveCount(1);
  });

  test('det valgte følger med forespørgslen ind i admin', async ({ page }) => {
    await åbn(page, medKort());
    await page.locator('#smad-valg button', { hasText: 'Rejemad' }).click();
    await page.fill('#santal', '20');
    await page.fill('#snavn', 'Karen Kok');
    await page.fill('#stlf', '20304050');
    await page.locator('#ssend').click();

    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.detaljer.mad, 'gæstens valg nåede ikke frem').toContain('Rejemad');
  });
});

test.describe('Kontakt og få et tilbud', () => {

  test('knappen skriver til selskabsadressen med et færdigt brev', async ({ page }) => {
    await åbn(page);
    const knap = page.locator('.tilbud-knap');
    await expect(knap).toHaveCount(1);

    const href = decodeURIComponent(await knap.getAttribute('href'));
    expect(href).toContain('mailto:selskab1@mosedehavnecafe.dk');
    expect(href, 'emnet mangler — personalet kan ikke se, hvad mailen handler om')
      .toContain('subject=Tilbud');
    /* ⚠️ BREVET ER DET NYE. Kanalen kunne kun bære et emne før;
       uden brevet får personalet en mail uden dato og antal, og
       så går der et døgn med at spørge om det. */
    expect(href, 'det færdigskrevne brev kom ikke med').toContain('body=');
    expect(href).toContain('Antal personer');
  });

  /* Adressen går gennem husets data-post-kanal — den samme som
     footeren. Rettes den i admin, slår den igennem begge steder. */
  test('en rettet adresse i admin slår igennem på knappen', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.kontakt_email_selskab = 'fest@eksempel.dk';
    await åbn(page, d);

    const href = decodeURIComponent(await page.locator('.tilbud-knap').getAttribute('href'));
    expect(href).toContain('mailto:fest@eksempel.dk');
    /* Og brevet skal overleve udskiftningen — det var lige præcis
       dét, kanalen tørrede af, før den lærte data-brev. */
    expect(href, 'adressen blev skiftet, men brevet forsvandt').toContain('body=');
  });
});
