/* Forespørgsler: catering, baglokale og selskab.

   FIRE SLAGS FEJL KAN KOMME HER, OG DE ER DYRE HVER FOR SIG:

   1) Siden lover noget, forretningen ikke har bekræftet. Der er
      ikke oplyst et lokale, et antal personer eller en pris, og
      står der alligevel noget, ringer der en kunde om et selskab,
      vi ikke kan holde. Det er den vigtigste prøve i filen.

   2) Formularen tager imod noget, databasen afviser. Så trykker
      gæsten send og får en fejl, ingen forstår.

   3) Formularen kræver noget, den ikke behøver. Dato og antal er
      frivillige med vilje: "sølvbryllup engang til foråret" er
      den forespørgsel, der er mest værd.

   4) Personoplysninger bliver liggende i browseren. Det er en
      fælles telefon i en familie.

   Adgangsreglerne prøves for sig i
   supabase/proev-forespoergsler.sql — dem kan en browser ikke se.
*/

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData,
  lokalTilstand, sætUr, sætDataEngang } = require('./hjaelp');

const SIDE = '/selskaber/';
const UR = '2026-08-06T11:00:00Z';   // torsdag 6. august, kl. 13 dansk tid

async function åbnSiden(page, sti) {
  await åbn(page, sti || SIDE, { ur: UR, data: grunddata() });
}

/* Som åbnSiden, men dataene lægges kun ind FØRSTE gang.

   åbn() bruger sætData, der skriver grunddata ved hver eneste
   sidevisning. Det er rigtigt for de fleste tests, men ubrugeligt
   for dem, der sender noget og derefter genindlæser: den første
   forespørgsel bliver tørret væk, inden den anden når frem, og så
   kan man aldrig se, om dobbeltspærren virker. */
async function åbnSidenEngang(page) {
  await lokalTilstand(page);
  await sætUr(page, UR);
  await sætDataEngang(page, grunddata());
  await page.goto(SIDE);
}

/* Udfylder det, der SKAL udfyldes. Testene går den vej et menneske
   går: vælger en type, skriver navn og telefon. */
async function udfyld(page, { type = 'selskab', navn = 'Anna Hansen',
  telefon = '20304050', email, antal, dato, besked } = {}) {
  if (type) await page.locator(`.type-knap[data-type="${type}"]`).click();
  if (navn !== null) await page.locator('#foresp-navn').fill(navn);
  if (telefon !== null) await page.locator('#foresp-telefon').fill(telefon);
  if (antal !== undefined) await page.locator('#foresp-antal').fill(antal);
  if (dato !== undefined) await page.locator('#foresp-dato').fill(dato);
  if (besked !== undefined) await page.locator('#foresp-besked').fill(besked);
  if (email !== undefined) {
    await page.locator('#foresp-mere-knap').click();
    await page.locator('#foresp-email').fill(email);
  }
}

test.describe('Siden lover ingenting', () => {

  /* DEN VIGTIGSTE PRØVE I FILEN.

     Forretningen har ikke oplyst, om der er et lokale, hvor mange
     man kan være, om der leveres, eller hvad noget koster. Skriver
     nogen en pris eller en kapacitet ind i et anfald af
     hjælpsomhed, står der en påstand på siden, som forretningen
     ikke kan holde — og den fejl opdages først, når en kunde
     ringer og er skuffet.

     Reglen står i CLAUDE.md: "Alt det, vi ikke har beviser på, skal
     ikke stå på siden." */
  test('der loves hverken lokale, antal eller pris', async ({ page }) => {
    await åbnSiden(page);
    const tekst = (await page.locator('main').innerText()).toLowerCase();

    for (const ord of [
      'vi leverer', 'levering', 'inkl. moms', 'pr. person',
      'kr.', 'personer i lokalet', 'plads til',
    ]) {
      expect(tekst, `siden lover "${ord}", og det er ikke bekræftet`)
        .not.toContain(ord);
    }
  });

  test('der står, at vi ringer – og at intet er booket endnu', async ({ page }) => {
    await åbnSiden(page);
    const tekst = (await page.locator('main').innerText()).toLowerCase();
    expect(tekst).toContain('ringer');
    expect(tekst, 'gæsten skal vide, at der ikke er lovet noget')
      .toContain('ikke lovet noget');
  });

  test('baglokalet er et spørgsmål, ikke et tilbud', async ({ page }) => {
    await åbnSiden(page);
    const knap = page.locator('.type-knap[data-type="baglokale"]');
    await expect(knap).toBeVisible();
    const tekst = (await knap.innerText()).toLowerCase();
    expect(tekst, 'knappen påstår, at der ER et lokale at leje')
      .not.toContain('lej');
  });
});

test.describe('De tre indgange', () => {

  test('alle tre står på siden', async ({ page }) => {
    await åbnSiden(page);
    await expect(page.locator('.type-knap')).toHaveCount(3);
    for (const t of ['catering', 'baglokale', 'selskab']) {
      await expect(page.locator(`.type-knap[data-type="${t}"]`)).toBeVisible();
    }
  });

  test('typen kan komme med fra en knap på forsiden', async ({ page }) => {
    await åbnSiden(page, SIDE + '?type=catering');
    await expect(page.locator('.type-knap[data-type="catering"]'))
      .toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.type-knap[data-type="selskab"]'))
      .toHaveAttribute('aria-pressed', 'false');
  });

  /* En værdi, ingen kender, må ikke kunne sendes af sted. Ellers
     afviser databasen den, og gæsten får en fejl, hun ikke selv har
     lavet.

     Prøven måler at der SPØRGES om typen — ikke bare at ingen knap
     lyser op. Første udgave gjorde det sidste, og den kunne ikke
     fejle: vælgType() med en ukendt værdi sætter alligevel ingen
     knap i .valgt, fordi der ikke er nogen knap med det navn. Den
     bestod altså lige så pænt med vagten fjernet, og en prøve, der
     ikke kan fejle, måler ingenting. */
  test('en ukendt type i adressen kan ikke sendes af sted', async ({ page }) => {
    await åbnSiden(page, SIDE + '?type=bryllupsplanlaegning');
    await expect(page.locator('.type-knap.valgt')).toHaveCount(0);

    await udfyld(page, { type: null });
    await page.locator('#foresp-send').click();

    await expect(page.locator('#fejl-type'),
      'siden tog imod en type, ingen kender').toContainText('Vælg');
    const d = await gemteData(page);
    expect(d.forespoergsler || []).toHaveLength(0);
  });

  test('man kan ikke sende uden at vælge en type', async ({ page }) => {
    await åbnSiden(page);
    await udfyld(page, { type: null });
    await page.locator('#foresp-send').click();

    await expect(page.locator('#fejl-type')).toContainText('Vælg');
    const d = await gemteData(page);
    expect(d.forespoergsler || [], 'der blev sendt noget uden en type').toHaveLength(0);
  });
});

test.describe('Fejl i felterne', () => {

  test('uden navn og telefon sker der ingenting', async ({ page }) => {
    await åbnSiden(page);
    await udfyld(page, { navn: '', telefon: '' });
    await page.locator('#foresp-send').click();

    await expect(page.locator('#fejl-navn')).toBeVisible();
    const d = await gemteData(page);
    expect(d.forespoergsler || []).toHaveLength(0);
  });

  test('et for kort telefonnummer afvises', async ({ page }) => {
    await åbnSiden(page);
    await udfyld(page, { telefon: '123' });
    await page.locator('#foresp-send').click();

    await expect(page.locator('#fejl-telefon')).toBeVisible();
    const d = await gemteData(page);
    expect(d.forespoergsler || []).toHaveLength(0);
  });

  /* Den negative og den positive sammen. En prøve, der kun måler
     den ene side, kan bestå med reglen sat et helt andet sted. */
  test('en skæv e-mail afvises, en tom er i orden', async ({ page }) => {
    await åbnSiden(page);
    await udfyld(page, { email: 'anna@' });
    await page.locator('#foresp-send').click();
    await expect(page.locator('#fejl-email')).toBeVisible();

    await page.locator('#foresp-email').fill('');
    await page.locator('#foresp-send').click();
    await expect(page.locator('#foresp-tak')).toBeVisible();
  });

  test('en fejl i det foldede felt åbner folden', async ({ page }) => {
    await åbnSiden(page);
    await udfyld(page, { email: 'anna@' });
    await page.locator('#foresp-mere-knap').click();      // luk den igen
    await expect(page.locator('#foresp-mere')).toBeHidden();

    await page.locator('#foresp-send').click();
    await expect(page.locator('#foresp-mere'),
      'fejlen stod i noget, der var skjult').toBeVisible();
  });

  test('et umuligt antal personer afvises', async ({ page }) => {
    await åbnSiden(page);
    await udfyld(page, { antal: '9999' });
    await page.locator('#foresp-send').click();

    await expect(page.locator('#fejl-antal')).toBeVisible();
    const d = await gemteData(page);
    expect(d.forespoergsler || []).toHaveLength(0);
  });
});

test.describe('Dato og antal er frivillige', () => {

  /* Hele fase 2 står og falder med den her. En forespørgsel uden
     dato er ikke en halv forespørgsel — det er den, hvor gæsten
     stadig kan overtales. */
  test('man kan sende helt uden dato og antal', async ({ page }) => {
    await åbnSiden(page);
    await udfyld(page, { besked: 'Vi ved ikke datoen endnu' });
    await page.locator('#foresp-send').click();

    await expect(page.locator('#foresp-tak')).toBeVisible();
    const d = await gemteData(page);
    expect(d.forespoergsler).toHaveLength(1);
    expect(d.forespoergsler[0].dato, 'en tom dato skal være null, ikke ""').toBeNull();
    expect(d.forespoergsler[0].antal_personer).toBeNull();
  });

  test('dato og antal kommer med, når de er udfyldt', async ({ page }) => {
    await åbnSiden(page);
    await udfyld(page, { dato: '2026-12-05', antal: '30' });
    await page.locator('#foresp-send').click();

    await expect(page.locator('#foresp-tak')).toBeVisible();
    const d = await gemteData(page);
    expect(d.forespoergsler[0].dato).toBe('2026-12-05');
    expect(d.forespoergsler[0].antal_personer).toBe(30);
  });
});

test.describe('Når den er sendt', () => {

  test('gæsten får en reference, hun kan læse op i telefonen', async ({ page }) => {
    await åbnSiden(page);
    await udfyld(page, { type: 'catering' });
    await page.locator('#foresp-send').click();

    await expect(page.locator('#foresp-tak')).toBeVisible();
    const ref = await page.locator('#foresp-tak .kvit-linje').first()
      .locator('.kvit-vaerdi').innerText();

    /* FO og ikke SM: personalet har de to lister ved siden af
       hinanden, og en gæst, der læser koden op, skal ikke sende
       nogen på jagt i den forkerte. Ingen I, O, 0 og 1. */
    expect(ref, `referencen ser forkert ud: ${ref}`)
      .toMatch(/^FO260806-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);
  });

  test('kvitteringen siger, at der IKKE er booket noget', async ({ page }) => {
    await åbnSiden(page);
    await udfyld(page);
    await page.locator('#foresp-send').click();

    const tak = page.locator('#foresp-tak');
    await expect(tak).toBeVisible();
    await expect(tak, 'gæsten går herfra og tror, der er booket noget')
      .toContainText('ikke booket');
    await expect(tak).toContainText('20304050');
  });

  test('det, der blev sendt, er også det, der blev gemt', async ({ page }) => {
    await åbnSiden(page);
    await udfyld(page, { type: 'baglokale', navn: 'Bo Jensen',
      telefon: '11223344', besked: '40 personer i marts' });
    await page.locator('#foresp-send').click();
    await expect(page.locator('#foresp-tak')).toBeVisible();

    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.type).toBe('baglokale');
    expect(f.navn).toBe('Bo Jensen');
    expect(f.telefon).toBe('11223344');
    expect(f.besked).toContain('40 personer');
    expect(f.status, 'gæsten må ikke kunne sætte sin egen status').toBe('ny');
    expect(f.intern_note, 'gæsten må ikke kunne skrive i personalets note').toBeNull();
  });

  /* Samme regel som ved bestillingen: kurven må gerne huskes,
     mennesket må ikke. Det er en fælles telefon i en familie, og
     den næste, der åbner siden, skal ikke se, hvem der spurgte om
     et selskab i går. */
  test('navn og telefon bliver IKKE husket i browseren', async ({ page }) => {
    await åbnSiden(page);
    await udfyld(page, { navn: 'Anna Hansen', telefon: '20304050' });
    await page.locator('#foresp-send').click();
    await expect(page.locator('#foresp-tak')).toBeVisible();

    await page.goto(SIDE);
    await expect(page.locator('#foresp-navn')).toHaveValue('');
    await expect(page.locator('#foresp-telefon')).toHaveValue('');

    /* Og hele lageret læses igennem. Det er ikke nok at kigge på de
       to felter: gemte noget ANDET nummeret undervejs, ville det
       stadig ligge der. Forespørgslen selv er undtaget — den ER
       databasen i øvetilstand. */
    const rester = await page.evaluate(() => {
      const ud = {};
      for (let i = 0; i < localStorage.length; i++) {
        const n = localStorage.key(i);
        if (n !== 'mosede_data_v1') ud[n] = localStorage.getItem(n);
      }
      return JSON.stringify(ud);
    });
    expect(rester, 'telefonnummeret ligger i browseren').not.toContain('20304050');
    expect(rester, 'navnet ligger i browseren').not.toContain('Anna Hansen');
  });

  test('det samme spørgsmål to gange bliver afvist', async ({ page }) => {
    await åbnSidenEngang(page);
    await udfyld(page, { dato: '2026-12-05' });
    await page.locator('#foresp-send').click();
    await expect(page.locator('#foresp-tak')).toBeVisible();

    await page.goto(SIDE);
    await udfyld(page, { dato: '2026-12-05' });
    await page.locator('#foresp-send').click();

    await expect(page.locator('#foresp-fejl')).toBeVisible();
    const d = await gemteData(page);
    expect(d.forespoergsler, 'den samme forespørgsel kom ind to gange')
      .toHaveLength(1);
  });
});

test.describe('Personalet ser forespørgslerne', () => {

  const medForespoergsel = (ændringer = {}) => grunddata({
    forespoergsler: [{
      id: 1, lokation_id: 'mosede', reference: 'FO260806-KTPQR',
      type: 'selskab', navn: 'Anna Hansen', telefon: '20304050', email: null,
      dato: '2026-12-05', antal_personer: 30, besked: 'Rund fødselsdag',
      status: 'ny', intern_note: null, oprettet: '2026-08-06T09:00:00Z',
      ...ændringer,
    }],
  });

  test('en ny forespørgsel står på fanen med et tal', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: medForespoergsel() });
    await page.locator('[data-panel="p-forespoergsler"]').click();

    await expect(page.locator('#foresp-antal')).toHaveText('1');
    const kort = page.locator('#forespoergsler-liste .bestil-kort');
    await expect(kort).toContainText('Anna Hansen');
    await expect(kort).toContainText('Selskab');
    await expect(kort).toContainText('30 personer');
    await expect(kort).toContainText('Rund fødselsdag');
  });

  /* En forespørgsel UDEN dato skal sige det højt. Et tomt felt
     ligner en fejl i systemet, og personalet skal vide, at datoen
     er noget, de skal spørge om i telefonen. */
  test('mangler dato og antal, står det på kortet', async ({ page }) => {
    await åbnAdmin(page, {
      ur: UR, data: medForespoergsel({ dato: null, antal_personer: null }),
    });
    await page.locator('[data-panel="p-forespoergsler"]').click();

    const kort = page.locator('#forespoergsler-liste .bestil-kort');
    await expect(kort).toContainText('Dato ikke oplyst');
    await expect(kort).toContainText('Antal ikke oplyst');
  });

  test('statussen går ét skridt ad gangen', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: medForespoergsel() });
    await page.locator('[data-panel="p-forespoergsler"]').click();

    await page.locator('#forespoergsler-liste .knap:not(.fare)').first().click();
    await expect(page.locator('#kvittering')).toContainText('Kontaktet');

    const d = await gemteData(page);
    expect(d.forespoergsler[0].status).toBe('kontaktet');
  });

  /* Kun status og noten. Gæstens egne ord er et referat af, hvad
     der blev spurgt om, og et referat, personalet kan skrive om, er
     ikke længere et bevis. Testen tæller felterne på kortet og
     fælder byggeriet, hvis der kommer flere end det ene notefelt. */
  test('personalet kan ikke rette gæstens ord', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: medForespoergsel() });
    await page.locator('[data-panel="p-forespoergsler"]').click();

    const felter = page.locator('#forespoergsler-liste .bestil-kort input, '
      + '#forespoergsler-liste .bestil-kort textarea');
    await expect(felter, 'der er kommet et felt til på kortet').toHaveCount(1);
    await expect(felter.first()).toHaveAttribute('id', /^foresp-note-/);
  });

  test('telefonnummeret kan trykkes på', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: medForespoergsel() });
    await page.locator('[data-panel="p-forespoergsler"]').click();

    await expect(page.locator('#forespoergsler-liste .bestil-tlf'))
      .toHaveAttribute('href', 'tel:20304050');
  });
});
