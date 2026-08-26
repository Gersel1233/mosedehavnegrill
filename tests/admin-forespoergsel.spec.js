/* Forespørgslerne i admin: mail-knappen og detaljerne.

   Et tilbud på et selskab er tal, datoer og forbehold — det skal
   skrives, ikke siges i en telefon ved en travl luge. Knappen
   åbner personalets eget mailprogram med adressen, referencen og
   det, gæsten har oplyst, så de ikke skal skrive det af fra
   skærmen.

   Og detaljerne skal stå som FELTER. De lå før som fri tekst i
   beskeden, hvor personalet skulle læse en sætning igennem for
   at finde tallet. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata } = require('./hjaelp');

function medForespoergsler() {
  const d = grunddata();
  const f = (id, navn, email, detaljer) => ({
    id, lokation_id: 'mosede', reference: 'FO-' + id, type: 'selskab',
    navn, telefon: '2030405' + id, email,
    dato: '2026-10-03', antal_personer: 42, besked: null,
    detaljer, status: 'ny', intern_note: null, slettet: null,
    oprettet: '2026-08-07T09:00:00.000Z',
  });

  d.forespoergsler = [
    f(1, 'Sara Poulsen', 'sara@eksempel.dk',
      { anledning: 'Konfirmation', hvor: 'hos-jer', mad: ['Smørrebrød', 'Tapasfad'] }),
    f(2, 'Jonas Berg', null, { anledning: 'Firmafest', hvor: 'ud-af-huset' }),
  ];
  return d;
}

test.describe('Forespørgsler i admin', () => {
  test('mail-knappen står på kortet med reference og detaljer', async ({ page }) => {
    await åbnAdmin(page, { data: medForespoergsler() });
    await page.locator('[data-panel="p-forespoergsler"]').click();

    const knap = page.locator('#forespoergsler-liste a[href^="mailto:"]').first();
    await expect(knap).toHaveCount(1);

    const href = decodeURIComponent(await knap.getAttribute('href'));
    expect(href).toContain('mailto:sara@eksempel.dk');
    expect(href).toContain('FO-1');
    expect(href).toContain('Antal: 42 personer');
    expect(href).toContain('Anledning: Konfirmation');
  });

  test('uden en mail er der ingen knap', async ({ page }) => {
    /* En knap, der åbner et tomt mailvindue, er en knap, man
       trykker på én gang. */
    await åbnAdmin(page, { data: medForespoergsler() });
    await page.locator('[data-panel="p-forespoergsler"]').click();

    await expect(page.locator('#forespoergsler-liste a[href^="mailto:"]')).toHaveCount(1);
    await expect(page.locator('#forespoergsler-liste')).toContainText('Jonas Berg');
  });

  test('detaljerne står som felter, ikke som fritekst', async ({ page }) => {
    await åbnAdmin(page, { data: medForespoergsler() });
    await page.locator('[data-panel="p-forespoergsler"]').click();

    const liste = page.locator('#forespoergsler-liste');
    await expect(liste).toContainText('Anledning');
    await expect(liste).toContainText('Konfirmation');
    await expect(liste).toContainText('Hos jer på havnen');
    await expect(liste).toContainText('Smørrebrød, Tapasfad');
    // Den anden er ud af huset — og det skal kunne læses
    await expect(liste).toContainText('Ud af huset');
  });
});

/* ============================================================
   DE TRE TRIN — OG PÅMINDELSEN OM KALENDEREN
   ------------------------------------------------------------
   Kundens ord (26/8): aftalen foregår på mail og har ikke noget
   med systemet at gøre; personalet "skal mindes om at selv
   oprette det inde i kalenderen — får mest overblik".

   ⚠️ DEN VIGTIGSTE PRØVE I FILEN er den, der siger, at
   påmindelsen FORSVINDER, når rækken findes. En påmindelse, der
   bliver stående, når arbejdet er gjort, lærer man at trykke
   forbi — og så virker den heller ikke den dag, den betyder
   noget.
   ============================================================ */

const KAL = (dato, titel) => ({
  id: 90, lokation_id: 'mosede', type: 'arrangement', dato,
  slut_dato: null, titel, beskrivelse: null, tid: null, lukker_kl: null,
  emoji: '🎉', offentlig: true, slettet: null,
});

function medAftale(ekstra, kalender) {
  const d = grunddata();
  d.forespoergsler = [{
    id: 1, lokation_id: 'mosede', reference: 'FO-1', type: 'selskab',
    navn: 'Sara Poulsen', telefon: '20304050', email: 'sara@eksempel.dk',
    dato: '2026-10-03', antal_personer: 42, besked: null,
    detaljer: { hvor: 'hos-jer' }, status: 'aftalt', intern_note: null,
    slettet: null, oprettet: '2026-08-07T09:00:00.000Z',
    ...(ekstra || {}),
  }];
  if (kalender) d.kalender = (d.kalender || []).concat(kalender);
  return d;
}

async function åbnFanen(page, data) {
  await åbnAdmin(page, { data });
  await page.locator('[data-panel="p-forespoergsler"]').click();
  await page.waitForSelector('#forespoergsler-liste .bestil-kort');
}

test.describe('De tre trin', () => {

  test('striben står på kortet med tre trin', async ({ page }) => {
    await åbnFanen(page, medForespoergsler());
    const trin = page.locator('#forespoergsler-liste .bestil-kort').first()
      .locator('.trin');
    await expect(trin).toHaveCount(3);
    await expect(trin.nth(0)).toContainText('Kommet ind');
    await expect(trin.nth(1)).toContainText('Svaret dem');
    await expect(trin.nth(2)).toContainText('I kalenderen');
  });

  /* En ny forespørgsel mangler et svar. Trin 2 er "nu" — og kun
     trin 2: er både 2 og 3 fremhævet, er der ikke noget, der er
     næste, og striben er en pynt. */
  test('på en ny er det svaret, der mangler — og kun det', async ({ page }) => {
    await åbnFanen(page, medForespoergsler());
    const kort = page.locator('#forespoergsler-liste .bestil-kort').first();
    await expect(kort.locator('.trin-nu')).toHaveCount(1);
    await expect(kort.locator('.trin-nu')).toContainText('Svaret dem');
  });

  test('knappen hedder "svaret" og ikke "ringet"', async ({ page }) => {
    await åbnFanen(page, medForespoergsler());
    await expect(page.locator('#forespoergsler-liste')).toContainText('Jeg har svaret dem');
    await expect(page.locator('#forespoergsler-liste')).not.toContainText('Jeg har ringet');
  });
});

test.describe('Påmindelsen om kalenderen', () => {

  test('en aftalt dag uden en kalenderrække siger fra', async ({ page }) => {
    await åbnFanen(page, medAftale());
    const kort = page.locator('#forespoergsler-liste .bestil-kort').first();
    await expect(kort).toHaveClass(/mangler-kalender/);
    await expect(kort.locator('.kalender-mangler'))
      .toContainText('Den står ikke i kalenderen');
    await expect(kort.locator('.trin-nu')).toContainText('I kalenderen');
  });

  /* ⚠️ DEN VIGTIGSTE. Påmindelsen skal kunne forsvinde, og den
     må kun kunne forsvinde ét sted fra: ved at rækken findes. */
  test('… og forsvinder, når rækken FINDES', async ({ page }) => {
    await åbnFanen(page, medAftale(null, [KAL('2026-10-03', 'Saras konfirmation')]));
    const kort = page.locator('#forespoergsler-liste .bestil-kort').first();
    await expect(kort).not.toHaveClass(/mangler-kalender/);
    await expect(kort.locator('.kalender-mangler')).toHaveCount(0);
    await expect(kort.locator('.kalender-staar')).toContainText('Saras konfirmation');
  });

  /* ⚠️ NOTEN TIL DAGEN TÆLLER IKKE MED. Den er personalets egen
     huskeseddel; en dag med "husk ekstra rugbrød" må ikke se ud,
     som om selskabet var oprettet. Titlen er NOTE_TITEL i
     js/admin/kalender.js. */
  test('en note til dagen er ikke en kalenderrække', async ({ page }) => {
    const note = KAL('2026-10-03', 'Note til dagen');
    note.offentlig = false;
    await åbnFanen(page, medAftale(null, [note]));
    await expect(page.locator('#forespoergsler-liste .bestil-kort').first())
      .toHaveClass(/mangler-kalender/);
  });

  /* Kun det AFTALTE skal i kalenderen. En ny forespørgsel er et
     spørgsmål, ikke en booking — en påmindelse om at skrive den
     ind ville være forkert, og den ville stå på hver eneste
     række, der lige var tikket ind. */
  test('en ny forespørgsel bliver ikke mindet om kalenderen', async ({ page }) => {
    await åbnFanen(page, medAftale({ status: 'ny' }));
    await expect(page.locator('#forespoergsler-liste .kalender-mangler')).toHaveCount(0);
  });

  test('en afvist heller ikke', async ({ page }) => {
    await åbnFanen(page, medAftale({ status: 'afvist' }));
    await expect(page.locator('#forespoergsler-liste .kalender-mangler')).toHaveCount(0);
  });

  /* Datoen er et frivilligt felt i alle fire formularer. Er der
     ingen dato, er der heller ikke noget at skrive ind. */
  test('uden en dato er der ikke noget at minde om', async ({ page }) => {
    await åbnFanen(page, medAftale({ dato: null }));
    await expect(page.locator('#forespoergsler-liste .kalender-mangler')).toHaveCount(0);
  });

  /* Knappen skal føre DERHEN, hvor arbejdet gøres — ikke bare
     til fanen. Måles på, at kalenderen står på den rigtige dag. */
  test('knappen åbner kalenderen på dagen', async ({ page }) => {
    await åbnFanen(page, medAftale());
    await page.locator('.kalender-mangler .knap').click();
    await expect(page.locator('#p-kalender')).not.toHaveClass(/skjult/);
    await expect(page.locator('#dag-panel .dag-kort')).toContainText('3. oktober');
  });

  /* Mærket i søjlen skal tælle det, der MANGLER. Talte den kun de
     nye, ville den forsvinde i samme sekund, nogen trykkede
     "Aftalen er i hus" — og så var der ikke noget, der mindede
     om kalenderen. */
  test('tallet i søjlen tæller den manglende kalenderrække med', async ({ page }) => {
    await åbnFanen(page, medAftale());
    await expect(page.locator('#foresp-antal')).not.toHaveClass(/skjult/);
    await expect(page.locator('#foresp-antal')).toHaveText('1');
  });

  test('… og er væk, når alt er på plads', async ({ page }) => {
    await åbnFanen(page, medAftale(null, [KAL('2026-10-03', 'Saras konfirmation')]));
    await expect(page.locator('#foresp-antal')).toHaveClass(/skjult/);
  });
});

/* ⚠️ DE NØGLER, VI SELV SENDER, SKAL HAVE ET NAVN.

   Reglen om at vise en ukendt nøgle frem for at skjule den er
   rigtig — en ny chip i designet må ikke kunne forsvinde ud af
   personalets syn. Men den er ikke en undskyldning for ikke at
   navngive dem, formularerne allerede sender: frokostkortet stod
   med "dage" og "indhold" med lille begyndelsesbogstav midt
   mellem pæne etiketter. Nøglerne står i SIDER i
   js/skal/forespoergsel.js. */
test('frokostordningens felter har rigtige navne', async ({ page }) => {
  const d = grunddata();
  d.forespoergsler = [{
    id: 1, lokation_id: 'mosede', reference: 'FO-1', type: 'frokost',
    navn: 'Greve Tandklinik', telefon: '20304050', email: 'info@eksempel.dk',
    dato: '2026-09-01', antal_personer: 12, besked: null,
    detaljer: { dage: ['Man', 'Ons'], indhold: 'Smørrebrød', firma: 'Greve Tandklinik ApS', cvr: '12345678' },
    status: 'ny', intern_note: null, slettet: null,
    oprettet: '2026-08-07T09:00:00.000Z',
  }];
  await åbnAdmin(page, { data: d });
  await page.locator('[data-panel="p-forespoergsler"]').click();
  const kort = page.locator('#forespoergsler-liste .bestil-kort').first();
  await expect(kort).toContainText('Ugedage');
  await expect(kort).toContainText('Indhold');
  await expect(kort).toContainText('CVR');
  // og ikke de rå nøgler
  await expect(kort.locator('.bestil-vare', { hasText: /^dage$/ })).toHaveCount(0);
  await expect(kort.locator('.bestil-vare', { hasText: /^indhold$/ })).toHaveCount(0);
});
