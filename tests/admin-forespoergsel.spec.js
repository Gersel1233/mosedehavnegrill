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
const { åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

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
    await visFane(page, 'p-forespoergsler');

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
    await visFane(page, 'p-forespoergsler');

    await expect(page.locator('#forespoergsler-liste a[href^="mailto:"]')).toHaveCount(1);
    await expect(page.locator('#forespoergsler-liste')).toContainText('Jonas Berg');
  });

  /* ⚠️ DETALJERNE ER ÉN LINJE NU (29/8), ikke en tabel med en
     række pr. felt. Reglen fra 23/8 står ved magt — de må ikke
     ligge begravet i gæstens beskedtekst, hvor personalet skal
     læse en sætning igennem for at finde tallet — men formen er
     ændret efter kundens ordre om overskuelighed: fem rækker
     skubbede besked og knapper under folden. Hver detalje har
     stadig sit NAVN foran, og anledningen står som overskrift. */
  test('detaljerne har navn foran — de ligger ikke i beskeden', async ({ page }) => {
    await åbnAdmin(page, { data: medForespoergsler() });
    await visFane(page, 'p-forespoergsler');

    const liste = page.locator('#forespoergsler-liste');
    // Anledningen er overskriften — og står derfor ikke to gange.
    await expect(liste.locator('.foresp-titel').first()).toContainText('Konfirmation');
    await expect(liste.locator('.foresp-detaljer').first()).not.toContainText('Anledning');
    // Resten står med navn: værdi.
    await expect(liste.locator('.foresp-detaljer').first()).toContainText('Hvor: Hos jer på havnen');
    await expect(liste.locator('.foresp-detaljer').first()).toContainText('Mad: Smørrebrød, Tapasfad');
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
  await visFane(page, 'p-forespoergsler');
  await page.waitForSelector('#forespoergsler-liste .bestil-kort');
}

/* ⚠️ TRIN-STRIBEN ER VÆK (29/8) — og med den de to prøver, der
   målte den. Kundens ord: "de to grønne og ene røde ting inde i
   kortet er ass ... det er stadig ikke nemt at se det hele."
   Striben sagde det samme som statusmærket og knappen nedenunder,
   og øjet skulle læse tre piller for at finde ud af, hvad der
   manglede.

   Det, striben KUNNE, som intet andet kan — minde om kalenderen —
   er ikke fjernet: det er den røde advarsel med felterne, og den
   har sine egne prøver længere nede. Prøverne her måler i stedet
   den linje, personalet skimmer listen på. */
test.describe('Kortet kan skimmes', () => {

  test('overskriften er anledningen og antallet', async ({ page }) => {
    await åbnFanen(page, medForespoergsler());
    const kort = page.locator('#forespoergsler-liste .bestil-kort').first();
    /* Gæstens egen anledning (fritekst siden 29/8) — ikke typen,
       for "Selskab" står der på hvert eneste kort. */
    await expect(kort.locator('.foresp-titel')).toContainText('Konfirmation');
    await expect(kort.locator('.foresp-titel')).toContainText('42 pers.');
    // Og der er ingen trin-piller tilbage.
    await expect(kort.locator('.trin')).toHaveCount(0);
  });

  /* ⚠️ VENTETIDEN STÅR KUN, NÅR DEN ER ET PROBLEM. Et kort, der
     altid siger "har ventet 0 dage", er støj — og så ses tallet
     heller ikke den dag, det er 25. */
  /* ⚠️ ÉN ÅBNING PR. PRØVE. hjaelp.js' sætDataEngang skriver kun
     i localStorage, HVIS den er tom — netop for at en optegning
     midt i en prøve ikke sætter dataene tilbage. Åbner man fanen
     to gange i samme prøve med forskellige data, ser man derfor
     de FØRSTE data begge gange, og prøven måler noget andet, end
     den tror. Derfor to prøver her. */
  test('ventetiden står på det, der har ligget for længe', async ({ page }) => {
    const gammel = medForespoergsler();
    gammel.forespoergsler[0].oprettet = '2026-07-29T09:00:00.000Z';
    await åbnFanen(page, gammel);
    const ventet = page.locator('#forespoergsler-liste .foresp-ventet').first();
    await expect(ventet).toContainText('har ventet 9 dage');
    /* Over tre dage er den rød: en forespørgsel, der har ligget
       så længe, er et selskab, der bliver holdt et andet sted. */
    await expect(ventet).toHaveClass(/laenge/);
  });

  test('… men ikke på den, der kom ind i dag', async ({ page }) => {
    /* Uret i admin-prøverne står 7. august, og prøvedataene er
       fra samme dag. Et kort, der altid siger "har ventet 0
       dage", er støj — og så ses tallet heller ikke den dag, det
       er 25. */
    await åbnFanen(page, medForespoergsler());
    await expect(page.locator('#forespoergsler-liste .foresp-ventet')).toHaveCount(0);
  });

  /* ⚠️ ORDET ER "KONTAKTET" NU (29/8). Prøven hed "svaret og
     ikke ringet" og kom fra 26/8, hvor aftalen kun foregik på
     mail. Kunden har siden sagt begge dele: "de skal kontakte
     dem via mail eller nummer, og det skal stå der." Ét ord, der
     dækker begge veje, er sandt uanset hvad personalet gjorde —
     og en knap, der siger noget andet end det, de lige har
     gjort, er en knap, de holder op med at stole på. */
  test('knappen dækker begge veje: kontaktet, ikke kun ringet eller skrevet', async ({ page }) => {
    await åbnFanen(page, medForespoergsler());
    await expect(page.locator('#forespoergsler-liste')).toContainText('Jeg har kontaktet dem');
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

  /* ⚠️ PRØVEN ER VENDT (29/8). Den målte, at knappen FØRTE til
     Kalender-fanen på den rigtige dag. Kundens ord: "nej, i
     admin ikke noget med åben kalenderen ... derefter aftalen er
     afstemt, sæt i kalenderen." En knap, der fører VÆK til en
     anden fane, er et arbejde, der skal huskes; felterne på
     kortet gør det færdigt, hvor det står. Nu vogter prøven, at
     genvejen IKKE kommer tilbage. */
  test('der er ingen genvej væk til kalenderfanen — arbejdet gøres her', async ({ page }) => {
    await åbnFanen(page, medAftale());
    const advarsel = page.locator('.kalender-mangler');
    await expect(advarsel).toContainText('Den står ikke i kalenderen');
    await expect(advarsel.locator('button', { hasText: 'Åbn kalenderen' })).toHaveCount(0);
    /* Til gengæld står felterne, der gør arbejdet færdigt. */
    await expect(advarsel.locator('.kal-opret input[type="date"]')).toHaveCount(1);
    await expect(advarsel.locator('button', { hasText: 'Skriv i kalenderen' })).toHaveCount(1);
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
  await visFane(page, 'p-forespoergsler');
  const kort = page.locator('#forespoergsler-liste .bestil-kort').first();
  await expect(kort).toContainText('Ugedage');
  await expect(kort).toContainText('Indhold');
  await expect(kort).toContainText('CVR');
  // og ikke de rå nøgler
  await expect(kort.locator('.bestil-vare', { hasText: /^dage$/ })).toHaveCount(0);
  await expect(kort.locator('.bestil-vare', { hasText: /^indhold$/ })).toHaveCount(0);
});

/* ------------------------------------------------------------
   FRA AFTALE TIL KALENDER — PÅ KORTET  (29/8)

   Kundens ord: "derefter de har gjort det, skal de sige aftalt,
   og dermed efter trykket af det komme i deres kalender og vælge
   hvilken dag og skrive note og alt det som til kalenderen, så
   det ligesom hænger sammen."

   Før førte påmindelsen kun HEN til Kalender-fanen, og personalet
   skulle skrive dag, titel og note af fra skærmen bag sig. Nu
   står felterne i selve advarslen.

   ⚠️ RÆKKEN ER ALDRIG OFFENTLIG. Et selskab er som regel en
   privat fest, og en kalenderrække, der lander på hjemmesiden,
   fordi nogen trykkede "aftalt", ville sætte fru Hansens 80-års
   fødselsdag på internettet.
   ------------------------------------------------------------ */
test.describe('Aftalen skrives i kalenderen fra kortet', () => {

  test('felterne står i advarslen med dag, titel og note', async ({ page }) => {
    await åbnFanen(page, medAftale());
    const boks = page.locator('.kalender-mangler .kal-opret');
    await expect(boks).toBeVisible();

    // Dagen er forespørgslens — men kan rettes: aftalen kan være
    // landet på en anden dato i telefonen.
    await expect(boks.locator('input[type="date"]')).toHaveValue('2026-10-03');
    // Titlen er foreslået, så personalet ikke skriver af.
    await expect(boks.locator('input.navn')).toHaveValue(/Sara Poulsen/);
    // Noten foreslår det, gæsten HAR oplyst.
    await expect(boks.locator('input.vare-tekst-felt')).toHaveValue(/42 personer/);
  });

  test('et tryk skriver rækken — intern, ikke offentlig', async ({ page }) => {
    await åbnFanen(page, medAftale());
    await page.locator('.kal-opret button', { hasText: 'Skriv i kalenderen' }).click();
    await expect(page.locator('#kvittering')).toContainText('kalenderen');

    const d = await gemteData(page);
    const ny = (d.kalender || []).filter((k) => k.dato === '2026-10-03');
    expect(ny).toHaveLength(1);
    expect(ny[0].titel).toMatch(/Sara Poulsen/);
    expect(ny[0].type).toBe('arrangement');
    /* ⚠️ DEN VIGTIGSTE LINJE I FILEN: en privat fest må ikke
       ende på hjemmesiden. */
    expect(ny[0].offentlig).toBe(false);
  });

  test('og så er advarslen væk af sig selv', async ({ page }) => {
    /* Påmindelsen tjekker sig selv — den kan kun forsvinde ved,
       at arbejdet bliver gjort. */
    await åbnFanen(page, medAftale(null, [KAL('2026-10-03', 'Selskab: Sara Poulsen')]));
    await expect(page.locator('.kalender-mangler')).toHaveCount(0);
    await expect(page.locator('.kalender-staar')).toContainText('Sara Poulsen');
  });

  /* ⚠️ ETIKETTEN "KONTAKT" ER VÆK IGEN (29/8, samme dag den kom).
     Den var rigtigt tænkt — de to links ER fanens vigtigste
     handling — men den gjorde kortet en linje højere, og kunden
     klagede netop over, at kortene fyldte for meget. Nu står
     dato, navn, antal, nummer og mail på ÉN linje, som man læser
     dem højt i en telefon. Det, prøven skal holde fast i, er
     ikke etiketten: det er at begge veje er klikbare. */
  test('kontaktlinjen har begge klikbare veje', async ({ page }) => {
    await åbnFanen(page, medAftale());
    const kort = page.locator('#forespoergsler-liste .bestil-kort').first();
    await expect(kort.locator('.foresp-linje')).toHaveCount(1);
    await expect(kort.locator('a[href^="tel:"]')).toHaveAttribute('href', 'tel:20304050');
    /* ⚠️ Adressen er URL-kodet i href'en (sara%40eksempel.dk) —
       det SKAL den være, når emne og krop følger med. Prøven
       læser derfor den viste tekst for adressen og href'en for
       at det er en mailto med emne. */
    await expect(kort.locator('a[href^="mailto:"]')).toContainText('sara@eksempel.dk');
    await expect(kort.locator('a[href^="mailto:"]'))
      .toHaveAttribute('href', /^mailto:sara%40eksempel\.dk\?subject=/);
  });

  /* Stedvalget fra den nye selskabsformular skal stå med RIGTIGE
     navne. De stod som rå "sted" og "daekket", i det øjeblik de
     blev sendt — fundet på et skærmbillede, ikke ved at læse. */
  test('stedvalget står med navne, ikke med nøgler', async ({ page }) => {
    await åbnFanen(page, medAftale({
      detaljer: { hvor: 'hos-jer', sted: 'Baglokalet', daekket: 'Ja, gerne' },
    }));
    const detaljer = page.locator('#forespoergsler-liste .foresp-detaljer').first();
    await expect(detaljer).toContainText('Hvor på havnen: Baglokalet');
    await expect(detaljer).toContainText('Dækket med: Ja, gerne');
    // Og ALDRIG de rå nøgler.
    await expect(detaljer).not.toContainText('daekket');
  });
});

/* ============================================================
   LUK DAGEN, DÉR HVOR AFTALEN BLIVER TIL  (30/8)
   ------------------------------------------------------------
   Kundens spørgsmål: "når man har taget imod noget inde i
   forespørgsler og aftalt tid, hænger det så sammen med, at man
   kan vælge luk dagen for spisning eller to-go, eller luk bare
   hele dagen? Hænger hele systemet sammen på den måde?"

   Motoren fandtes (dags_regler siden 27/8) — knappen gjorde
   ikke: personalet skulle selv huske at gå på Kalender-fanen.
   ============================================================ */
test.describe('Luk dagen fra forespørgslen', () => {

  function aftalt() {
    const d = grunddata();
    d.forespoergsler = [{
      id: 1, lokation_id: 'mosede', reference: 'FO-260807-AAAAA',
      type: 'selskab', navn: 'Anna Hansen', telefon: '20304050',
      email: 'anna@eksempel.dk', dato: '2026-09-12', antal_personer: 40,
      besked: 'Rund fødselsdag', detaljer: {}, status: 'kontaktet',
      intern_note: null, slettet: null, oprettet: '2026-08-05T09:00:00Z',
    }];
    return d;
  }

  async function aabnKort(page) {
    await åbnAdmin(page, { data: aftalt() });
    await visFane(page, 'p-forespoergsler');
    const kort = page.locator('#forespoergsler-liste .bestil-kort').first();
    await kort.locator('button', { hasText: 'Aftal & sæt tid' }).click();
    return page.locator('#forespoergsler-liste .bestil-kort').first();
  }

  test('felterne til kalenderen har to lukninger', async ({ page }) => {
    const kort = await aabnKort(page);
    const luk = kort.locator('.kal-luk');
    await expect(luk).toBeVisible();
    await expect(luk).toContainText('ud af huset');
    await expect(luk).toContainText('spisning her');
  });

  /* ⚠️ INTET ER SAT PÅ FORHÅND. En dag, der lukkede sig selv,
     fordi nogen trykkede "aftalt", ville koste forretningen den
     take-away, de sagtens kunne have lavet — og det opdages
     først, når en gæst ikke kan bestille. */
  test('uden et hak lukkes der ingenting', async ({ page }) => {
    const kort = await aabnKort(page);
    await kort.locator('button', { hasText: 'Skriv i kalenderen' }).click();
    await expect(page.locator('#kvittering')).toContainText('kalenderen');

    const gemt = await gemteData(page);
    expect(gemt.dags_regler || [], 'dagen blev lukket uden at nogen bad om det')
      .toHaveLength(0);
    expect((gemt.kalender || []).length).toBe(1);
  });

  test('et hak lukker dagen for spisning — og kun for den', async ({ page }) => {
    const kort = await aabnKort(page);
    await kort.locator('.kal-luk label', { hasText: 'spisning her' }).locator('input').check();
    await kort.locator('button', { hasText: 'Skriv i kalenderen' }).click();
    await expect(page.locator('#kvittering')).toContainText('lukket');

    const regler = (await gemteData(page)).dags_regler || [];
    expect(regler).toHaveLength(1);
    expect(regler[0].dato).toBe('2026-09-12');
    expect(regler[0].luk_spis_her).toBe(true);
    /* ⚠️ OG TAKE-AWAY ER STADIG ÅBEN. Hele grunden til, at
       tabellen findes, er at de to kan lukkes hver for sig: en
       dag med selskab er ikke en dag uden take-away. */
    expect(regler[0].luk_takeaway).toBe(false);
  });

  /* ⚠️ EN EKSISTERENDE REGEL MÅ IKKE TØRRES AF. Butik.skrive
     .dagsregel erstatter dagens række, så to ubetingede falske
     flueben ville slette en tidlig lukning eller en besked,
     nogen havde skrevet til gæsterne. */
  test('en besked, der allerede står på dagen, overlever', async ({ page }) => {
    const d = aftalt();
    d.dags_regler = [{
      id: 1, lokation_id: 'mosede', dato: '2026-09-12',
      luk_takeaway: false, luk_spis_her: false,
      tidligst: null, senest_togo: '15:00', senest_spis_her: null,
      besked_til_gaester: 'Vi lukker tidligt på grund af et selskab.',
      besked_titel: 'Tidlig lukning',
    }];
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-forespoergsler');
    const kort = page.locator('#forespoergsler-liste .bestil-kort').first();
    await kort.locator('button', { hasText: 'Aftal & sæt tid' }).click();
    await kort.locator('.kal-luk label', { hasText: 'spisning her' }).locator('input').check();
    await kort.locator('button', { hasText: 'Skriv i kalenderen' }).click();

    const r = ((await gemteData(page)).dags_regler || [])[0];
    expect(r.luk_spis_her).toBe(true);
    expect(r.besked_til_gaester, 'beskeden til gæsterne blev tørret af')
      .toContain('selskab');
    expect(r.senest_togo, 'den tidlige lukning blev tørret af').toBe('15:00');
  });
});

/* ============================================================
   FORTRYD PÅ FORESPØRGSLERNE  (31/8)
   ------------------------------------------------------------
   Kundens ord: "gendannelse … det skal man kunne, hvis man
   klikker forkert — gælder også forespørgselsdelen." Et
   fejltryk på Afvis lukkede sagen for altid. Gendan efter et
   afslag fører til 'ny' (vi VED ikke, hvor langt sagen var, og
   "Venter på jer" er bunken, hvor intet bliver glemt); efter et
   fejltryk på Aftal fører den til 'kontaktet' — dér kom den
   fra, kæden har kun den ene vej dertil.
   ============================================================ */
test.describe('Gendan på forespørgslen', () => {

  function medStatus(status) {
    const d = grunddata();
    d.forespoergsler = [{
      id: 9, lokation_id: 'mosede', reference: 'FO-9', type: 'selskab',
      navn: 'Karin Fejl', telefon: '20304059', email: null,
      dato: '2026-10-03', antal_personer: 12, besked: null,
      detaljer: null, status, intern_note: null, slettet: null,
      oprettet: '2026-08-07T09:00:00.000Z',
    }];
    return d;
  }

  test('en afvist kan hentes tilbage — og lander under Venter på jer', async ({ page }) => {
    await åbnAdmin(page, { data: medStatus('afvist') });
    await visFane(page, 'p-forespoergsler');

    const kort = page.locator('.foresp-kort, .bestil-kort', { hasText: 'Karin Fejl' });
    await kort.locator('button', { hasText: 'Gendan' }).click();
    await expect(page.locator('#kvittering')).toContainText('Ny');

    const gemt = await gemteData(page);
    expect(gemt.forespoergsler[0].status).toBe('ny');
  });

  test('en aftalt kan fortrydes tilbage til kontaktet', async ({ page }) => {
    await åbnAdmin(page, { data: medStatus('aftalt') });
    await visFane(page, 'p-forespoergsler');

    const kort = page.locator('.foresp-kort, .bestil-kort', { hasText: 'Karin Fejl' });
    await kort.locator('button', { hasText: 'Gendan' }).click();

    const gemt = await gemteData(page);
    expect(gemt.forespoergsler[0].status).toBe('kontaktet');
  });

  test('en ny har ingen Gendan — der er ikke noget at fortryde', async ({ page }) => {
    await åbnAdmin(page, { data: medStatus('ny') });
    await visFane(page, 'p-forespoergsler');

    const kort = page.locator('.foresp-kort, .bestil-kort', { hasText: 'Karin Fejl' });
    await expect(kort.locator('button', { hasText: 'Gendan' })).toHaveCount(0);
  });
});
