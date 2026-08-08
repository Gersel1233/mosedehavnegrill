/* Bestilling af smørrebrød ud af huset.

   Det er den eneste formular på hjemmesiden, og den eneste ting en
   gæst skriver i databasen. Der er fire slags fejl der kan komme
   her, og de er alle fire dyre:

   1) DEN LOVER NOGET FORKERT. Der betales ikke på siden, og
      bestillingen er ikke bekræftet før nogen har ringet. Står det
      ikke tydeligt, møder en kunde op til en pose der ikke findes.

   2) MAN KAN VÆLGE EN DAG DER IKKE FINDES. En datovælger med alle
      årets dage lader gæsten bestille til juleaften kl. 7. Dagene
      skal komme FRA åbningstiderne.

   3) FYLDET BLIVER TALT SOM STYKKER. Kortet har fem slags stykker
      med pris og 29 slags fyld uden. Ligger de i samme kurv, bliver
      fire stykker med tre slags fyld til syv stykker, og personalet
      pakker forkert.

   4) DEN SENDER TO GANGE. Gæsten trykker Send, der sker ikke noget
      med det samme, hun trykker igen.

   Testene kører i øvetilstand: der er ingen database, og
   bestillingen lander i localStorage. Reglerne i databasen –
   hvem der må læse og skrive – prøves for sig i
   supabase/proev-adgang.sql, for dem kan en browser ikke se.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata, gemteData } = require('./hjaelp');

const SIDE = '/smoerrebroed-ud-af-huset/';

/* Torsdag 6. august 2026 kl. 13.00 dansk tid. Alle dage er åbne
   11–21 i grunddata, så dagvælgeren har noget at vise. */
const UR = '2026-08-06T11:00:00Z';

async function åbnBestil(page, valg = {}) {
  await åbn(page, SIDE, { ur: UR, ...valg });
  await page.waitForSelector('#bestil-stykker .stk-linje');
}

// Vælger n stykker af den første slags
async function vaelg(page, n) {
  const op = page.locator('#bestil-stykker .stk-linje').first().locator('button', { hasText: '+' });
  for (let i = 0; i < n; i++) await op.click();
}

/* Fyldet ligger i en foldet blok, fordi det er frivilligt og fylder
   seks grupper med 29 piller. Testene går den vej et menneske går:
   de åbner folden. */
async function aabnFyld(page) {
  const knap = page.locator('#fyld-knap');
  if ((await knap.getAttribute('aria-expanded')) !== 'true') await knap.click();
  await page.waitForSelector('#bestil-fyld .fyld-valg');
}

// E-mail og "andet vi skal vide" ligger også foldet sammen
async function aabnMere(page) {
  const knap = page.locator('#mere-knap');
  if ((await knap.getAttribute('aria-expanded')) !== 'true') await knap.click();
}

/* Navn og telefon findes først på skærmen når der er noget i
   kurven – en hentetid til ingen mad er ikke et spørgsmål. Kald
   derfor altid vaelg() før udfyld(). */
async function udfyld(page, { navn = 'Mikkel Gersel', telefon = '20304050', email = '', besked = '' } = {}) {
  await page.fill('#bestil-navn', navn);
  await page.fill('#bestil-telefon', telefon);
  if (email || besked) await aabnMere(page);
  if (email) await page.fill('#bestil-email', email);
  if (besked) await page.fill('#bestil-besked-felt', besked);
}

test.describe('Formularen siger hvad der sker', () => {

  test('den lover ikke betaling, og den lover en opringning', async ({ page }) => {
    await åbnBestil(page);

    const afsnit = page.locator('#bestil');
    // Det skal stå FØR man udfylder, ikke bagefter
    await expect(afsnit.locator('.head')).toContainText('vi ringer og bekræfter', { ignoreCase: true });
    await expect(afsnit.locator('.head')).toContainText('betaler når du henter', { ignoreCase: true });

    /* Ingen af de ord der betyder at der bliver trukket penge. Det
       er ikke ordkløveri: "Betal nu" på en side hvor der ikke er en
       betalingsløsning, er et løfte forretningen ikke kan holde. */
    const tekst = (await afsnit.innerText()).toLowerCase();
    for (const forbudt of ['betal nu', 'kortbetaling', 'betal online', 'gå til betaling']) {
      expect(tekst, `formularen skriver "${forbudt}", men der er ingen betaling`)
        .not.toContain(forbudt);
    }
  });

  test('varslet står som personalet har sat det', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 72;
    await åbnBestil(page, { data: d });

    await expect(page.locator('#bestil-varsel')).toContainText('3 dage');
  });

  test('personalet kan lukke for bestillinger', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilling_aaben = false;
    await åbn(page, SIDE, { ur: UR, data: d });

    await expect(page.locator('#bestil-form')).toBeHidden();
    await expect(page.locator('#bestil-lukket')).toBeVisible();
    // Og telefonen skal stå i stedet – der skal være en vej videre
    await expect(page.locator('#bestil-lukket a[href^="tel:"]')).toBeVisible();
  });
});

test.describe('Man kan kun vælge en dag og en tid der findes', () => {

  test('dagene kommer fra åbningstiderne, ikke fra en kalender', async ({ page }) => {
    /* Kun mandag og tirsdag er åbne. Så må der KUN være mandage og
       tirsdage at vælge – ikke syv dage hvor fem er lukkede. */
    const d = grunddata();
    d.aabningstider = d.aabningstider.map((t) => ({
      ...t, lukket: t.ugedag > 1,
    }));
    await åbnBestil(page, { data: d });
    await vaelg(page, 1);

    const dage = await page.locator('#bestil-dage .dag .dag-navn').allInnerTexts();
    expect(dage.length, 'der blev ikke fundet nogen dage').toBeGreaterThan(1);
    for (const n of dage) {
      expect(['Man.', 'Tir.', 'I dag', 'I morgen'],
        `"${n}" er en lukket dag`).toContain(n);
    }
  });

  test('en lukkedag kan ikke vælges', async ({ page }) => {
    /* Fredag 7. august er varslets første mulige dag (24 timer fra
       torsdag kl. 13). Er den en lukkedag, skal den ikke stå. */
    const d = grunddata();
    d.lukkedage = [{ id: 1, lokation_id: 'mosede', dato: '2026-08-07', aarsag: 'Personaledag' }];
    await åbnBestil(page, { data: d });
    await vaelg(page, 1);

    const knapper = page.locator('#bestil-dage .dag');
    const antal = await knapper.count();
    for (let i = 0; i < antal; i++) {
      await expect(knapper.nth(i).locator('.dag-dato'),
        'lukkedagen 7. august kan vælges').not.toHaveText('7. aug.');
    }
  });

  test('varslet skubber den første mulige dag', async ({ page }) => {
    // 24 timer fra torsdag kl. 13 → tidligste er fredag
    await åbnBestil(page);
    await vaelg(page, 1);
    await expect(page.locator('#bestil-dage .dag').first().locator('.dag-dato'))
      .toHaveText('7. aug.');

    // Sætter man varslet til en uge, skal den første dag flytte sig
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 24 * 7;
    await åbnBestil(page, { data: d });
    await vaelg(page, 1);
    await expect(page.locator('#bestil-dage .dag').first().locator('.dag-dato'))
      .toHaveText('13. aug.');
  });

  test('tiderne ligger inden for åbningstiden og slutter før der lukkes', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 1);          // dagvælgeren kommer med kurven

    /* Der måles på den ANDEN dag. På den første klipper varslet
       tiderne: uret står torsdag kl. 13, varslet er 24 timer, og så
       kan man tidligst hente fredag kl. 13 – ikke kl. 11, selv om
       der åbner kl. 11. Det er meningen, og det prøves for sig
       herunder. */
    await page.locator('#bestil-dage .dag').nth(1).click();

    const tider = await page.locator('#bestil-tid option').allInnerTexts();
    expect(tider.length, 'der er ingen tider at vælge').toBeGreaterThan(4);

    // Åbent 11–21. Første tid 11.00, sidste 20.30 – en halv time før
    // der lukkes, så der er tid til at række posen ud af lugen.
    expect(tider[0]).toBe('kl. 11.00');
    expect(tider[tider.length - 1]).toBe('kl. 20.30');
  });

  test('på den første mulige dag klipper varslet tiderne', async ({ page }) => {
    /* Uret står torsdag kl. 13.00 dansk tid, varslet er 24 timer.
       Fredag er derfor med, men kun fra kl. 13 – ikke fra kl. 11.
       Uden dette kunne gæsten bestille til fredag kl. 11 og komme
       to timer for tidligt i forhold til varslet. */
    await åbnBestil(page);
    await vaelg(page, 1);
    const tider = await page.locator('#bestil-tid option').allInnerTexts();
    expect(tider[0]).toBe('kl. 13.00');
  });
});

test.describe('Kurven', () => {

  test('summen tæller stykker og pris, ikke fyld', async ({ page }) => {
    await åbnBestil(page);

    // Fire stykker à 89 kr.
    await vaelg(page, 4);
    await expect(page.locator('#bestil-sum-tekst')).toContainText('4 stykker');
    await expect(page.locator('#bestil-sum-tekst')).toContainText('356,-');

    /* Og så tre slags fyld. Antallet af STYKKER må ikke ændre sig:
       fyld er ønsker, ikke varer. Det er hele grunden til at de
       ligger i to kolonner i databasen. */
    await aabnFyld(page);
    const fyld = page.locator('#bestil-fyld .fyld-valg');
    const antalFyld = Math.min(2, await fyld.count());
    for (let i = 0; i < antalFyld; i++) await fyld.nth(i).click();

    await expect(page.locator('#bestil-sum-tekst')).toContainText('4 stykker');
    await expect(page.locator('#bestil-sum-tekst')).toContainText('356,-');
    await expect(page.locator('#bestil-sum-tekst')).toContainText(antalFyld + ' slags fyld');
  });

  test('man kan ikke sende en tom kurv', async ({ page }) => {
    await åbnBestil(page);
    await expect(page.locator('#bestil-send')).toBeDisabled();
    await vaelg(page, 1);
    await expect(page.locator('#bestil-send')).toBeEnabled();
  });

  test('kvitteringslinjen kommer først når der er valgt noget', async ({ page }) => {
    /* Den klæbede før hen over siden fra det øjeblik man landede,
       med "Vælg hvor mange stykker du vil have" – en bjælke der
       irettesatte gæsten for ikke at have gjort noget endnu, og som
       dækkede en femtedel af skærmen på en telefon. */
    await åbnBestil(page);
    await expect(page.locator('.bestil-bund')).toBeHidden();

    await vaelg(page, 2);
    await expect(page.locator('.bestil-bund')).toBeVisible();
    await expect(page.locator('#bestil-sum-tekst')).toContainText('2 stykker');

    // Og den forsvinder igen hvis man tømmer kurven
    const ned = page.locator('#bestil-stykker .stk-linje').first()
      .locator('button', { hasText: '−' });
    await ned.click();
    await ned.click();
    await expect(page.locator('.bestil-bund')).toBeHidden();
  });

  test('fyldet er delt i grupper, ikke én bunke på 29', async ({ page }) => {
    /* 29 piller i én klump er en mur. Grupperne er en læsehjælp
       js/bestilling.js lægger ovenpå – de står ikke i databasen, så
       personalet kan skrive et nyt fyld uden først at vælge gruppe.
       Grunddataen har to slags fyld, som begge hører under kød. */
    await åbnBestil(page);
    await aabnFyld(page);

    const grupper = page.locator('#bestil-fyld .fyld-gruppe');
    expect(await grupper.count(), 'fyldet blev ikke grupperet').toBeGreaterThan(0);
    await expect(grupper.first().locator('.eyebrow')).not.toBeEmpty();

    // Hver pille skal ligge i en gruppe – ingen må falde udenfor
    const iAlt = await page.locator('#bestil-fyld .fyld-valg').count();
    const iGrupper = await page.locator('#bestil-fyld .fyld-gruppe .fyld-valg').count();
    expect(iGrupper, 'et fyld ligger uden for alle grupper').toBe(iAlt);
  });

  test('den lukkede fyld-blok siger hvor mange man har valgt', async ({ page }) => {
    /* Blokken er lukket til at begynde med. Uden en note på selve
       hovedet kunne man ikke se om man havde valgt noget uden at
       åbne den igen. */
    await åbnBestil(page);
    await expect(page.locator('#fyld-valgt')).toHaveText('frivilligt');

    await aabnFyld(page);
    await page.locator('#bestil-fyld .fyld-valg').first().click();
    await expect(page.locator('#fyld-valgt')).toHaveText('1 slags valgt');

    // Og noten skal stadig kunne læses når blokken er lukket igen
    await page.locator('#fyld-knap').click();
    await expect(page.locator('#bestil-fyld')).toBeHidden();
    await expect(page.locator('#fyld-valgt')).toHaveText('1 slags valgt');
  });

  test('hentetid og kontaktoplysninger kommer først med kurven', async ({ page }) => {
    /* Formularen havde fire nummererede trin fremme på én gang:
       fem tællere, seks fyldgrupper, fjorten dage, en tidsvælger og
       fire felter – før man havde valgt ét stykke smørrebrød. Kunden
       kaldte den overkompliceret, og det var den.

       En hentetid til ingen mad er ikke et spørgsmål. */
    await åbnBestil(page);
    await expect(page.locator('#bestil-detaljer')).toBeHidden();
    await expect(page.locator('#bestil-dage')).toBeHidden();
    await expect(page.locator('#bestil-navn')).toBeHidden();

    await vaelg(page, 1);
    await expect(page.locator('#bestil-detaljer')).toBeVisible();
    await expect(page.locator('#bestil-navn')).toBeVisible();

    // Tømmer man kurven, forsvinder de igen
    await page.locator('#bestil-stykker .stk-linje').first()
      .locator('button', { hasText: '−' }).click();
    await expect(page.locator('#bestil-detaljer')).toBeHidden();
  });

  test('mindsteantallet holdes', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilling_min_stk = 10;
    await åbnBestil(page, { data: d });

    await vaelg(page, 3);
    await expect(page.locator('#bestil-send')).toBeDisabled();
    await expect(page.locator('#bestil-min')).toContainText('mindst være 10');

    await vaelg(page, 7);
    await expect(page.locator('#bestil-send')).toBeEnabled();
    await expect(page.locator('#bestil-min')).toBeHidden();
  });

  test('kurven overlever at siden bliver hentet igen', async ({ page }) => {
    /* Trykker gæsten på et link og går tilbage, skal hun ikke vælge
       otte stykker smørrebrød forfra. */
    await åbnBestil(page);
    await vaelg(page, 3);
    await page.reload();
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await expect(page.locator('#bestil-sum-tekst')).toContainText('3 stykker');
  });

  test('navn og telefon bliver IKKE husket', async ({ page }) => {
    /* Kurven må gerne blive liggende. Personoplysninger må ikke:
       det er en fælles telefon i en familie, og den næste der åbner
       siden skal ikke se hvem der bestilte i går. */
    await åbnBestil(page);
    await vaelg(page, 1);
    await udfyld(page, { navn: 'Mikkel Gersel', telefon: '20304050' });
    await page.reload();
    await page.waitForSelector('#bestil-stykker .stk-linje');

    // Kurven huskes, så felterne er fremme igen – men tomme
    await expect(page.locator('#bestil-navn')).toHaveValue('');
    await expect(page.locator('#bestil-telefon')).toHaveValue('');

    const gemt = await page.evaluate(() => {
      let alt = '';
      for (let i = 0; i < localStorage.length; i++) {
        alt += localStorage.getItem(localStorage.key(i));
      }
      return alt;
    });
    expect(gemt, 'telefonnummeret ligger i browseren').not.toContain('20304050');
    expect(gemt, 'navnet ligger i browseren').not.toContain('Mikkel Gersel');
  });
});

test.describe('Fejl i felterne', () => {

  test('manglende navn og telefon siges i feltet', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 2);
    await page.locator('#bestil-send').click();

    await expect(page.locator('#fejl-navn')).toBeVisible();
    await expect(page.locator('#bestil-navn')).toHaveAttribute('aria-invalid', 'true');
    // Intet må være sendt
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);
  });

  test('et for kort telefonnummer afvises', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 2);
    await udfyld(page, { telefon: '123' });
    await page.locator('#bestil-send').click();

    await expect(page.locator('#fejl-telefon')).toContainText('for kort');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);
  });

  test('en skæv e-mail afvises, en tom er i orden', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 2);
    await udfyld(page, { email: 'mikkel-a-punktum-dk' });
    await page.locator('#bestil-send').click();
    await expect(page.locator('#fejl-email')).toBeVisible();

    // Tom e-mail må ikke være en fejl – feltet er frivilligt
    await page.fill('#bestil-email', '');
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();
  });

  test('fejlen forsvinder når man retter feltet', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 2);
    await page.locator('#bestil-send').click();
    await expect(page.locator('#fejl-navn')).toBeVisible();

    await page.fill('#bestil-navn', 'M');
    await expect(page.locator('#fejl-navn')).toBeHidden();
  });
});

test.describe('Når den er sendt', () => {

  test('gæsten får en reference og hele bestillingen at se', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 4);
    await aabnFyld(page);
    const fyld = page.locator('#bestil-fyld .fyld-valg').first();
    const fyldNavn = (await fyld.innerText()).trim();
    await fyld.click();
    await udfyld(page, { besked: 'Uden agurk, tak' });

    const tid = await page.locator('#bestil-tid').inputValue();
    await page.locator('#bestil-send').click();

    const tak = page.locator('#bestil-tak');
    await expect(tak).toBeVisible();
    await expect(page.locator('#bestil-form')).toBeHidden();

    // Referencen: SM + dato + fem tegn, uden I, O, 0 og 1 – de
    // bliver hørt og skrevet forkert i en telefon
    const ref = await tak.locator('.kvit-linje').first().locator('.kvit-vaerdi').innerText();
    expect(ref, `referencen ser forkert ud: ${ref}`)
      .toMatch(/^SM260806-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);

    // Kvitteringen skal vise det hele, så gæsten kan se om hun ramte rigtigt
    await expect(tak).toContainText('4 ×');
    await expect(tak).toContainText(fyldNavn);
    await expect(tak).toContainText('Uden agurk, tak');
    await expect(tak).toContainText(tid.replace(':', '.'));

    // Og den skal sige at der IKKE er betalt
    await expect(tak).toContainText('ikke betalt');
    await expect(tak).toContainText('28 87 13 43');
  });

  test('det der bliver gemt, er det gæsten valgte', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 3);
    await aabnFyld(page);
    await page.locator('#bestil-fyld .fyld-valg').first().click();
    await udfyld(page, { navn: 'Mikkel Gersel', telefon: '20 30 40 50' });

    const tid = await page.locator('#bestil-tid').inputValue();
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.navn).toBe('Mikkel Gersel');
    expect(b.telefon).toBe('20 30 40 50');
    expect(b.hent_dato).toBe('2026-08-07');
    expect(b.hent_tid).toBe(tid);
    expect(b.antal, 'antal skal være summen af stykkerne – ikke stykker plus fyld').toBe(3);
    expect(b.linjer).toHaveLength(1);
    expect(b.linjer[0].antal).toBe(3);
    expect(b.fyld).toHaveLength(1);

    /* Status og note sættes af databasen, ikke af gæsten.
       Adgangsreglen kræver netop status 'ny' og en tom note – kunne
       en gæst sætte dem, kunne hun sende en bestilling der ser
       bekræftet ud. */
    expect(b.status).toBe('ny');
    expect(b.intern_note).toBeNull();
  });

  test('kurven er tom bagefter', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 2);
    await udfyld(page);
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    await page.locator('#bestil-tak button', { hasText: 'Bestil noget mere' }).click();
    await expect(page.locator('#bestil-form')).toBeVisible();
    await expect(page.locator('#bestil-send')).toBeDisabled();
  });

  test('samme bestilling to gange bliver afvist', async ({ page }) => {
    /* Gæsten trykker Send, der sker ikke noget med det samme, hun
       trykker igen. Samme telefon, samme dag, samme tid er ÉN
       bestilling. Reglen står også i databasen som
       bestilling_ikke_dobbelt – begge steder, for formularen kan
       omgås og databasen kan ikke. */
    await åbnBestil(page);
    await vaelg(page, 2);
    await udfyld(page);
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    await page.locator('#bestil-tak button', { hasText: 'Bestil noget mere' }).click();
    await vaelg(page, 2);
    await udfyld(page);
    await page.locator('#bestil-send').click();

    await expect(page.locator('#bestil-fejl')).toContainText('allerede sendt');
    expect((await gemteData(page)).bestillinger).toHaveLength(1);
  });
});

test.describe('Personalet ser bestillingerne', () => {

  test('en bestilling kan bekræftes, gøres klar og afhentes', async ({ page }) => {
    const { åbnAdmin } = require('./hjaelp');

    const d = grunddata();
    d.bestillinger = [{
      id: 1, reference: 'SM260806-ABCDE', lokation_id: 'mosede',
      navn: 'Mikkel Gersel', telefon: '28871343', email: null,
      hent_dato: '2026-08-07', hent_tid: '12:00',
      linjer: [{ navn: 'Flæskestegssandwich', antal: 4, pris: 89 }],
      fyld: ['Dyrlægens natmad'],
      antal: 4, besked: 'Uden agurk', status: 'ny', intern_note: null,
      oprettet: '2026-08-06T11:00:00Z',
    }];

    await åbnAdmin(page, { ur: UR, data: d });
    await page.locator('.faner button', { hasText: 'Bestillinger' }).click();

    const kort = page.locator('.bestil-kort');
    await expect(kort).toHaveCount(1);
    await expect(kort).toContainText('Mikkel Gersel');
    await expect(kort).toContainText('4 ×');
    await expect(kort).toContainText('Dyrlægens natmad');
    // Gæstens besked kan indeholde en allergi og må ikke gemmes væk
    await expect(kort.locator('.bestil-gaestebesked')).toContainText('Uden agurk');
    // Telefonnummeret skal kunne trykkes på – personalet skal ringe
    await expect(kort.locator('.bestil-tlf')).toHaveAttribute('href', 'tel:28871343');
    // Og der skal stå hvor mange nye der er, på fanen
    await expect(page.locator('#bestil-antal')).toHaveText('1');

    await page.locator('.bestil-kort button', { hasText: 'Bekræft' }).click();
    await expect(page.locator('.maerke.m-bekraeftet')).toBeVisible();
    await expect(page.locator('#bestil-antal')).toBeHidden();

    await page.locator('.bestil-kort button', { hasText: 'Sæt som klar' }).click();
    await expect(page.locator('.maerke.m-klar')).toBeVisible();

    await page.locator('.bestil-kort button', { hasText: 'Afhentet' }).click();
    await expect(page.locator('.maerke.m-afhentet')).toBeVisible();

    expect((await gemteData(page)).bestillinger[0].status).toBe('afhentet');
  });

  test('personalet kan ikke rette gæstens bestilling', async ({ page }) => {
    /* En bestilling personalet kan skrive om, er ikke længere et
       bevis på hvad gæsten bad om. Kun status og den interne note
       kan røres – der må derfor ikke være felter for navn, telefon,
       antal eller dato. */
    const { åbnAdmin } = require('./hjaelp');

    const d = grunddata();
    d.bestillinger = [{
      id: 1, reference: 'SM260806-ABCDE', lokation_id: 'mosede',
      navn: 'Mikkel Gersel', telefon: '28871343', email: null,
      hent_dato: '2026-08-07', hent_tid: '12:00',
      linjer: [{ navn: 'Flæskestegssandwich', antal: 4, pris: 89 }],
      fyld: [], antal: 4, besked: null, status: 'ny', intern_note: null,
      oprettet: '2026-08-06T11:00:00Z',
    }];

    await åbnAdmin(page, { ur: UR, data: d });
    await page.locator('.faner button', { hasText: 'Bestillinger' }).click();

    const felter = page.locator('.bestil-kort input, .bestil-kort select, .bestil-kort textarea');
    await expect(felter, 'der må kun være ét felt: den interne note').toHaveCount(1);
    await expect(felter.first()).toHaveId('note-1');
  });

  test('reglerne for bestilling kan rettes i admin', async ({ page }) => {
    const { åbnAdmin } = require('./hjaelp');
    await åbnAdmin(page, { ur: UR });
    await page.locator('.faner button', { hasText: 'Bestillinger' }).click();

    await page.uncheck('#bestil-aaben');
    await page.fill('#bestil-varsel-timer', '48');
    await page.fill('#bestil-min-stk', '10');
    await page.fill('#bestil-besked-tekst', 'Vi holder ferie i uge 29');
    await page.locator('#gem-bestil-regler').click();
    await expect(page.locator('#kvittering')).toBeVisible();

    const i = (await gemteData(page)).indstillinger;
    expect(i.bestilling_aaben).toBe(false);
    expect(i.bestilling_varsel_timer).toBe(48);
    expect(i.bestilling_min_stk).toBe(10);
    expect(i.bestilling_besked).toBe('Vi holder ferie i uge 29');
  });
});
