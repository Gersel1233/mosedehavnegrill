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
const { åbn, grunddata, gemteData , aabnFold, visFane, aabnMere } = require('./hjaelp');

const SIDE = '/bestil/';

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

/* ⚠️ HJÆLPEREN aabnFyld() ER SLETTET (31/8) sammen med
   ønskefolden. Stod den tilbage, ville den næste, der skrev en
   prøve, tro at folden findes — og skrive en prøve, der venter
   30 sekunder på et element, ingen har bygget siden i dag. */

// E-mail og "andet vi skal vide" ligger også foldet sammen


/* Navn og telefon findes først på skærmen når der er noget i
   kurven – en hentetid til ingen mad er ikke et spørgsmål. Kald
   derfor altid vaelg() før udfyld(). */
async function udfyld(page, { navn = 'Mikkel Gersel', telefon = '20304050', besked = '' } = {}) {
  await page.fill('#bestil-navn', navn);
  await page.fill('#bestil-telefon', telefon);
  if (besked) await page.fill('#bestil-besked-felt', besked);
}

/* DET SIDSTE KIG står mellem Send-knappen og afsendelsen nu —
   spiis' lærepenge (23/8). Prøverne går den vej et menneske går:
   tryk Send, se bestillingen efter, tryk Send igen. */
async function sendMedKig(page) {
  await page.locator('#bestil-send').click();
  await expect(page.locator('#bestil-kig')).toBeVisible();
  await page.locator('#kig-send').click();
}

test.describe('Formularen siger hvad der sker', () => {

  /* OPRINGNINGEN ER VÆK SOM STANDARD — kundens ord (23/8): "fjern
     det med ring og bekræft. De skal nok ringe og afbekræfte, hvis
     de ikke kan. Alt skal kunne administreres — ikke noget med
     ring; man får deres oplysninger til netop sådan noget."

     Løftet var før grunden til, at man turde sende noget uden at
     betale. Nu er grunden en anden og stærkere: bestillingen ER
     modtaget, og kan køkkenet ikke lave den, er det dem, der
     ringer. Så må siden heller ikke stå og love et opkald, den
     ikke har tænkt sig at foretage.

     Det, der SKAL stå, er stadig svaret på "hvornår betaler jeg?"
     — uden det er der et spørgsmål tilbage på en side, hvor der
     ikke kan betales. */
  test('den lover ikke betaling, og den lover ikke et opkald', async ({ page }) => {
    await åbnBestil(page);

    // Det skal stå FØR man udfylder, ikke bagefter
    const intro = page.locator('.side-top .side-under');
    await expect(intro).toContainText('betal', { ignoreCase: true });

    const tekst = (await page.locator('main').innerText()).toLowerCase();
    expect(tekst, 'løftet om en opringning står der igen')
      .not.toContain('ringer og bekræfter');
    expect(tekst, 'løftet om en opringning står der igen')
      .not.toContain('vi ringer til dig');

    /* Ingen af de ord der betyder at der bliver trukket penge. Det
       er ikke ordkløveri: "Betal nu" på en side hvor der ikke er en
       betalingsløsning, er et løfte forretningen ikke kan holde. */
    for (const forbudt of ['betal nu', 'kortbetaling', 'betal online', 'gå til betaling']) {
      expect(tekst, `formularen skriver "${forbudt}", men der er ingen betaling`)
        .not.toContain(forbudt);
    }
  });

  /* MAN SKAL KUNNE SE SMØRREBRØDET NÅR MAN LANDER.

     Det kunne man ikke. Det første stykke stod 1017 px nede i et
     vindue på 720 og 891 px nede på en telefon på 664 – halvanden
     skærm forbi. Man landede altså på en bestillingsside uden at se
     noget der kunne bestilles, og det var hele grunden til at siden
     føltes uoverskuelig.

     Det der lå i vejen, var tre gentagelser af den samme aftale, en
     overskrift der sagde det samme som sidens h1, en h1 i
     hero-størrelse og 132 px sektionsluft mellem sidens hoved og
     dens eneste indhold.

     Testen måler det ét sted, så det ikke kan snige sig tilbage en
     linje ad gangen. */
  /* Spiis-formen begynder med DATOEN — det er den, gæsten skal se
     i første skærmbillede, og listen med retterne følger lige
     under. Grænsen på listen er halvanden skærm: længere nede er
     den begravet, og så er vi tilbage ved fejlen, den her test
     blev født af. */
  test('formularen begynder i første skærmbillede, og listen er ikke begravet', async ({ page }) => {
    await åbnBestil(page);

    const svar = await page.evaluate(() => ({
      dato: document.getElementById('bestil-dag').getBoundingClientRect().top,
      liste: document.querySelector('#bestil-stykker .stk-linje').getBoundingClientRect().top,
      vindue: window.innerHeight,
    }));

    expect(svar.dato,
      `datovælgeren står ${Math.round(svar.dato)} px nede i et vindue på ${svar.vindue}`)
      .toBeLessThan(svar.vindue);
    expect(svar.liste, 'listen med retterne er begravet under folden')
      .toBeLessThan(svar.vindue * 1.5);
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

    const dage = await page.locator('#bestil-dag option').allInnerTexts();
    expect(dage.length, 'der blev ikke fundet nogen dage').toBeGreaterThan(1);
    for (const n of dage) {
      const navn = n.split(' d. ')[0];
      expect(['Man.', 'Tir.', 'I dag', 'I morgen'],
        `"${n}" er en lukket dag`).toContain(navn);
    }
  });

  test('en lukkedag kan ikke vælges', async ({ page }) => {
    /* Fredag 7. august er varslets første mulige dag (24 timer fra
       torsdag kl. 13). Er den en lukkedag, skal den ikke stå. */
    const d = grunddata();
    d.lukkedage = [{ id: 1, lokation_id: 'mosede', dato: '2026-08-07', aarsag: 'Personaledag' }];
    await åbnBestil(page, { data: d });
    await vaelg(page, 1);

    /* Der tælles FØRST, så prøven ikke kan bestå i et vakuum: en
       tom vælger har ingen lukkedage — og ingen åbne dage. */
    const dage = await page.locator('#bestil-dag option').allInnerTexts();
    expect(dage.length, 'der blev ikke fundet nogen dage').toBeGreaterThan(1);
    for (const n of dage) {
      /* " d. 7. aug." og ikke bare "7. aug.": den 17. august
         indeholder også strengen "7. aug.", og så fældede prøven
         en helt lovlig mandag. */
      expect(n, 'lukkedagen 7. august kan vælges').not.toMatch(/ d\. 7\. aug\./);
    }
  });

  test('varslet skubber den første mulige dag', async ({ page }) => {
    // 24 timer fra torsdag kl. 13 → tidligste er fredag
    await åbnBestil(page);
    await expect(page.locator('#bestil-dag option').first()).toContainText('7. aug.');

    // Sætter man varslet til en uge, skal den første dag flytte sig
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 24 * 7;
    await åbnBestil(page, { data: d });
    await expect(page.locator('#bestil-dag option').first()).toContainText('13. aug.');
  });

  test('tiderne ligger inden for åbningstiden og slutter før der lukkes', async ({ page }) => {
    await åbnBestil(page);

    /* Der måles på den ANDEN dag. På den første klipper varslet
       tiderne: uret står torsdag kl. 13, varslet er 24 timer, og så
       kan man tidligst hente fredag kl. 13 – ikke kl. 11, selv om
       der åbner kl. 11. Det er meningen, og det prøves for sig
       herunder. */
    const anden = await page.locator('#bestil-dag option').nth(1).getAttribute('value');
    await page.locator('#bestil-dag').selectOption(anden);

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

/* ⚠️ FIRE PRØVER I FILEN VOGTEDE ØNSKEFYLDET (model A) — OG DET
   ER EN KUNDEBESLUTNING, IKKE FORÆLDEDE PRØVER  (31/8).

   Kundens ord: *"alle smørbrødene sælges som de er, ikke noget med
   valg af brød og derefter pålæg — nej, 1 mad er som 1 mad, og de
   skal allesammen kunne vælges."* Fyldet er derfor ikke længere en
   liste med hak uden pris; det er varer som alle andre. Har ejeren
   ikke sat en pris, VISES rækken med "Ring og hør prisen" — husets
   regel for hele kortet siden 26/8.

   Prøverne er vendt, ikke slettet: det, de bar, var at fyldet ikke
   må tælle med i STYKKERNE og ikke må forsvinde fra siden. Begge
   dele vogtes videre, bare mod den nye model. */
  test('summen tæller stykker og pris', async ({ page }) => {
    await åbnBestil(page);

    // Fire stykker à 89 kr.
    await vaelg(page, 4);
    await expect(page.locator('#bestil-sum-tekst')).toContainText('4 stykker');
    await expect(page.locator('#bestil-sum-tekst')).toContainText('356,-');

    /* ⚠️ OG ØNSKEFOLDEN FINDES IKKE MERE. Fandtes den, ville
       gæsten kunne både KØBE og ØNSKE det samme fyld — to veje til
       den samme mad, som køkkenet skulle læse to steder. */
    await expect(page.locator('#bestil-fyld-trin')).toBeHidden();
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

  /* ⚠️ FYLDET MÅ IKKE VÆRE FORSVUNDET. Her stod, at de 29 slags
     skulle deles i grupper i ønskefolden. Folden er væk — men
     rækkerne er der stadig, som varer man kan ringe om. En vare,
     der bare falder ud af listen, ligner en vare, der ikke findes,
     og så tror gæsten, at kortet er blevet mindre. */
  test('fyldet er ikke forsvundet — det står som varer, man kan ringe om', async ({ page }) => {
    await åbnBestil(page);
    await expect(page.locator('#bestil-stykker')).toContainText('Leverpostej med baconsvøb');
    await expect(page.locator('#bestil-stykker')).toContainText('Ring og hør prisen');
  });

  /* ⚠️ HER STOD "den lukkede fyld-blok siger hvor mange man har
     valgt". Blokken findes ikke, siden 1 mad blev 1 mad — og en
     prøve på en blok, der ikke er der, ville bestå på ingenting.
     Det, den BAR, var at fyldet ikke må tælle med i stykkerne;
     det vogtes af "summen tæller stykker og pris" ovenfor og af
     antal-prøven i "det der bliver gemt". */
  test('der er ingen ønskefold at åbne', async ({ page }) => {
    await åbnBestil(page);
    /* ⚠️ FØRST AT ELEMENTET ER DER, SÅ AT DET ER SKJULT.
       toBeHidden() er sandt for et element, der ikke findes — og
       så måler prøven ingenting (arret fra 30/8). */
    await expect(page.locator('#bestil-fyld-trin')).toHaveCount(1);
    await expect(page.locator('#bestil-fyld-trin')).toBeHidden();
  });

  test('hele formularen er synlig fra start, som hos spiis', async ({ page }) => {
    /* Kontrakten har vendt: først var alt fremme og kunden kaldte
       det overkompliceret; så kom detaljerne først med kurven; og
       23/8 holdt kunden spiis' form op som forlæg — dér er dato,
       tid, hvordan og felterne synlige fra start, og det er
       KATEGORIFOLDENE, der holder siden kort. Det er dét, der
       måles nu. */
    await åbnBestil(page);
    await expect(page.locator('#bestil-dag')).toBeVisible();
    await expect(page.locator('#bestil-tid')).toBeVisible();
    await expect(page.locator('#bestil-navn')).toBeVisible();

    await vaelg(page, 1);
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

  test('formularen spørger ikke om e-mail', async ({ page }) => {
    /* Spiis' form er navn, telefon og besked — og vi ringer
       alligevel og bekræfter hver bestilling. Feltet røg ud 23/8;
       prøven sørger for, at det ikke siver tilbage, uden at nogen
       har besluttet det. */
    await åbnBestil(page);
    await expect(page.locator('#bestil-email')).toHaveCount(0);

    await vaelg(page, 2);
    await udfyld(page);
    await sendMedKig(page);
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
    await udfyld(page, { besked: 'Uden agurk, tak' });

    const tid = await page.locator('#bestil-tid').inputValue();
    await sendMedKig(page);

    const tak = page.locator('#bestil-tak');
    await expect(tak).toBeVisible();
    await expect(page.locator('#bestil-form')).toBeHidden();

    // Referencen: SM + dato + fem tegn, uden I, O, 0 og 1 – de
    // bliver hørt og skrevet forkert i en telefon.
    // ⚠️ Slås op på ETIKETTEN, ikke på pladsen (31/8): bestillings-
    // nummeret står øverst nu, og prøvens ærinde er referencens
    // FORM — ikke hvilken række den står i.
    const ref = await tak.locator('.kvit-linje', { hasText: 'Reference' })
      .locator('.kvit-vaerdi').innerText();
    expect(ref, `referencen ser forkert ud: ${ref}`)
      .toMatch(/^SM260806-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);

    // Kvitteringen skal vise det hele, så gæsten kan se om hun ramte rigtigt
    await expect(tak).toContainText('4 ×');
    await expect(tak).toContainText('Uden agurk, tak');
    await expect(tak).toContainText(tid.replace(':', '.'));

    // Og den skal sige at der IKKE er betalt
    await expect(tak).toContainText('ikke betalt');
    await expect(tak).toContainText('28 87 13 43');
  });

  test('det der bliver gemt, er det gæsten valgte', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 3);
    await udfyld(page, { navn: 'Mikkel Gersel', telefon: '20 30 40 50' });

    const tid = await page.locator('#bestil-tid').inputValue();
    await sendMedKig(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.navn).toBe('Mikkel Gersel');
    expect(b.telefon).toBe('20 30 40 50');
    expect(b.hent_dato).toBe('2026-08-07');
    expect(b.hent_tid).toBe(tid);
    expect(b.antal, 'antal skal være summen af stykkerne – ikke stykker plus fyld').toBe(3);
    expect(b.linjer).toHaveLength(1);
    expect(b.linjer[0].antal).toBe(3);
    /* ⚠️ FYLD-KOLONNEN ER TOM NU, OG DET ER MED VILJE (31/8).
       Ønskefyldet er væk med kundens ord ("1 mad er som 1 mad"),
       og et fyld MED pris er en almindelig linje. Kolonnen bliver
       stående i databasen: gamle bestillinger bærer den, og
       personalets kort læser den stadig. */
    expect(b.fyld).toHaveLength(0);

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
    await sendMedKig(page);
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
    await sendMedKig(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();

    await page.locator('#bestil-tak button', { hasText: 'Bestil noget mere' }).click();
    await vaelg(page, 2);
    await udfyld(page);
    /* Afvisningen kommer først, når der FAKTISK sendes — altså
       efter kigget, og i kiggets egen fejllinje. */
    await sendMedKig(page);
    await expect(page.locator('#kig-fejl')).toContainText('allerede sendt');
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
    await visFane(page, 'p-bestillinger');

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

    /* ⚠️ MELLEMTRINNENE LIGGER BAG "···" NU (31/8). Kundens ord:
       "man skal bare trykke færdig, ikke det der dobbeltknap-noget".
       Kæden er IKKE fjernet — den, der vil markere "maden er lavet,
       den venter", kan stadig, og prøven her er beviset på det.
       Den går bare den vej, personalet går. */
    const kort2 = page.locator('.bestil-kort').first();
    await aabnMere(kort2);
    await kort2.locator('button', { hasText: 'Bekræft' }).click();
    await expect(page.locator('.maerke.m-bekraeftet')).toBeVisible();
    await expect(page.locator('#bestil-antal')).toBeHidden();

    await aabnMere(kort2);
    await kort2.locator('button', { hasText: 'Sæt som klar' }).click();
    await expect(page.locator('.maerke.m-klar')).toBeVisible();

    /* ⚠️ KNAPPEN HEDDER "✓ FÆRDIG" NU (31/8). Kundens ord: "der
       skal stå færdig". Det er KUN ordet på skærmen, der skiftede —
       linjen nedenunder holder fast i, at databasen stadig gemmer
       `afhentet`. Skiftede VÆRDIEN, ville salgstallene holde op med
       at tælle uden en eneste fejl. */
    await page.locator('.bestil-kort button', { hasText: 'Færdig' }).click();
    await expect(page.locator('.maerke.m-afhentet')).toBeVisible();
    await expect(page.locator('.maerke.m-afhentet')).toHaveText('Færdig');

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
    await visFane(page, 'p-bestillinger');

    const felter = page.locator('.bestil-kort input, .bestil-kort select, .bestil-kort textarea');
    await expect(felter, 'der må kun være ét felt: den interne note').toHaveCount(1);
    await expect(felter.first()).toHaveId('note-1');
  });

  test('reglerne for bestilling kan rettes i admin', async ({ page }) => {
    const { åbnAdmin } = require('./hjaelp');
    await åbnAdmin(page, { ur: UR });
    await visFane(page, 'p-bestillinger');

    await aabnFold(page, 'bestil-regler-fold');
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


/* ==================== SPIIS-FORMENS EGNE LØFTER ===============

   Kunden holdt spiis' bestillingsside op som forlæg (23/8): dato
   med "· menukort", dagens ret i listen, ?? på varer uden pris.
   Prøverne her vogter det, der er NYT i den form. */
test.describe('Spiis-formen', () => {

  /* Prøven bor på FORSIDEN nu. En vare uden pris kan kun opstå i
     en af ejerens åbnede kategorier — smørrebrødets egne stykker
     uden pris kommer slet ikke i listen (se bestilbare i
     js/store.js) — og de kategorier står på forsiden, ikke på
     bestil/. Isen kan ikke bruges som eksempel længere: den er
     ude af bestillingen helt (kundens ord, 23/8). */
  test('en vare uden pris står med ?? og en forklaring — og summen lyver ikke', async ({ page }) => {
    test.skip(true, 'forsiden er skiftet ud (23/8) — genoprettes mod den nye forside i systemfasen, se tests-gamle/README.md');
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [9];
    d.indstillinger.bestilling_varsel_timer = 0;
    d.indstillinger.dagens_ret = { navn: 'Stegt flæsk', beskrivelse: '', pris: 95 };
    d.menu_varer = d.menu_varer.concat([{
      id: 90, kategori_id: 9, navn: 'Dagens fadøl', beskrivelse: null,
      pris: null, fremhaevet: false, udsolgt: false, sortering: 2, aktiv: true,
    }]);
    await åbn(page, '/index.html', { ur: UR, data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const linje = page.locator('.stk-linje', { hasText: 'Dagens fadøl' });
    await expect(linje.locator('.stk-pris')).toHaveText('??,-');
    await expect(page.locator('#bestil-pris-note')).toBeVisible();

    /* Og i kurvlinjen: prisen på det prissatte + en indrømmelse
       om resten — ikke et tal, der ser færdigt ud. Kategoriens
       fold skal åbnes først — kun den første gruppe står åben. */
    await vaelg(page, 1);
    await page.locator('#bestil-stykker .fold-hoved', { hasText: 'Øl' }).click();
    await linje.locator('button', { hasText: '+' }).click();
    await expect(page.locator('#bestil-sum-tekst')).toContainText('uden pris');
  });

  /* ⚠️ VENDT MED MODELLEN (31/8). Grunddataen HAR to slags fyld
     uden pris, og siden 1 mad blev 1 mad er de varer som alle
     andre — altså vises de med "Ring og hør prisen", og
     forklaringen skal stå. Prøven måler derfor begge veje: med
     prisløse varer står linjen, uden dem gør den ikke. */
  test('forklaringen står kun, når noget mangler en pris', async ({ page }) => {
    await åbnBestil(page);
    await expect(page.locator('#bestil-pris-note')).toBeVisible();

    const d = grunddata();
    d.menu_varer = d.menu_varer.map((v) => Object.assign({}, v, { pris: v.pris === null ? 55 : v.pris }));
    await åbnBestil(page, { data: d });
    await expect(page.locator('#bestil-pris-note')).toBeHidden();
  });

  test('dagens ret står i listen på dagen i dag — og kun dér', async ({ page }) => {
    /* Varsel 0, så dagen i dag overhovedet kan vælges — og en ret
       skrevet i admin. På i dag: egen fold øverst og "· dagens
       ret" i vælgeren. På i morgen: væk igen, og vælgerens note
       siger, at man vælger frit fra menukortet. */
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 0;
    d.indstillinger.dagens_ret = { navn: 'Stegt flæsk', beskrivelse: 'Med persillesovs.', pris: 95 };
    await åbnBestil(page, { data: d });

    await expect(page.locator('#bestil-dag option').first()).toContainText('· dagens ret');
    await expect(page.locator('#bestil-stykker .fold-navn').first()).toHaveText('Dagens ret');
    await expect(page.locator('.stk-linje', { hasText: 'Stegt flæsk' })).toBeVisible();

    const iMorgen = await page.locator('#bestil-dag option').nth(1).getAttribute('value');
    await page.locator('#bestil-dag').selectOption(iMorgen);
    await expect(page.locator('#bestil-stykker')).not.toContainText('Stegt flæsk');
    await expect(page.locator('#bestil-dag-note'))
      .toContainText('Ingen dagens ret denne dag');
  });

  /* PRØVEN HED "To-go og Spis her står som ét valg" OG MÅLTE PÅ
     /bestil/. Den er flyttet, ikke slettet.

     Smørrebrød ud af huset spiser man ikke her, og siden spørger
     nu om hentning eller levering (kundens ord 23/8). Lugens valg
     hører til på forsiden, og dér måles det stadig — formen med
     navy på det valgte er den samme.

     Selve hentning/levering-valget har sine egne prøver i
     tests/levering.spec.js. */
  test('lugens valg står som ét valg med navy på det valgte — på forsiden',
    async ({ page }) => {
    test.skip(true, 'forsiden er skiftet ud (23/8) — genoprettes mod den nye forside i systemfasen, se tests-gamle/README.md');
    const d = grunddata();
    d.indstillinger = { ...d.indstillinger,
      bestilbare_kategorier: [9], bestilling_varsel_timer: 0 };
    await åbn(page, '/index.html', { ur: UR, data: d });

    const knapper = page.locator('#bestil-hvordan .type-knap');
    await expect(knapper).toHaveCount(2);
    await expect(knapper.nth(0)).toContainText('To-go');
    await expect(knapper.nth(1)).toContainText('Spis her');
    await expect(page.locator('#bestil-hvordan .type-knap.valgt')).toHaveCount(1);
  });

  test('smørrebrødssiden spørger ikke om spis her', async ({ page }) => {
    /* Den anden halvdel. Uden den kunne valget snige sig tilbage
       på /bestil/, og ingen ville opdage det: prøven ovenfor
       måler jo på forsiden. */
    await åbnBestil(page);
    await expect(page.locator('#bestil-hvordan')).not.toContainText('Spis her');
  });
});


/* ==================== DET SIDSTE KIG ==========================

   Spiis' lærepenge (23/8): "den er for nem og hurtig". Alle
   bestillinger går gennem ét kig, FØR de sendes — og det er
   gæstens eget værn mod en forkert bestilling. Prøverne vogter
   begge retninger: at kigget viser det rigtige, og at man kan
   komme TILBAGE uden at miste noget. */
test.describe('Det sidste kig', () => {

  test('kigget viser hele bestillingen, før den sendes', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 2);
    await udfyld(page, { besked: 'Uden agurk' });
    await page.locator('#bestil-send').click();

    const kig = page.locator('#bestil-kig');
    await expect(kig).toBeVisible();
    await expect(page.locator('#bestil-form')).toBeHidden();
    await expect(kig).toContainText('Mikkel Gersel');
    await expect(kig).toContainText('20304050');
    await expect(kig).toContainText('Uden agurk');
    await expect(kig).toContainText('To-go');

    // Og INTET er sendt endnu — kigget er et kig, ikke en kvittering
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);
  });

  test('Ret noget fører tilbage med alt udfyldt', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 2);
    await udfyld(page);
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-kig')).toBeVisible();

    await page.locator('#kig-ret').click();
    await expect(page.locator('#bestil-form')).toBeVisible();
    await expect(page.locator('#bestil-kig')).toBeHidden();
    await expect(page.locator('#bestil-navn')).toHaveValue('Mikkel Gersel');

    // Og den kan stadig sendes bagefter
    await sendMedKig(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();
  });
});

/* ==================== GRUNDPRINCIPPET =========================

   "Bestillingen er accepteret — kan køkkenet ikke lave den,
   ringer de."

   STANDARDEN ER VENDT (23/8). Den stod FRA: hver bestilling
   ventede på et opkald. Kunden vendte den: "fjern det med ring og
   bekræft. De skal nok ringe og afbekræfte, hvis de ikke kan. Alt
   skal kunne administreres — ikke noget med ring; man får deres
   oplysninger til netop sådan noget."

   Kontakten (auto_bekraeft i admin) findes stadig, og teksterne
   følger den. Begge retninger måles: en standard, der kun er
   prøvet den ene vej, er en standard, ingen kan komme ud af igen. */
test.describe('Grundprincippet bag ejerens kontakt', () => {

  test('uden at nogen har rørt noget: Bestilt. Hentes …', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 2);
    await udfyld(page);
    await sendMedKig(page);

    const tak = page.locator('#bestil-tak');
    await expect(tak).toContainText('Bestilt. Hentes');
    await expect(tak).not.toContainText('Vi ringer til dig');
    // Betalingslinjen er ens i begge tilstande
    await expect(tak).toContainText('du betaler når du henter');
  });

  test('slået FRA lover kvitteringen et opkald igen', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.auto_bekraeft = false;
    await åbnBestil(page, { data: d });
    await vaelg(page, 2);
    await udfyld(page);
    await sendMedKig(page);

    const tak = page.locator('#bestil-tak');
    await expect(tak).toContainText('Vi ringer til dig');
    await expect(tak).not.toContainText('Bestilt. Hentes');
  });
});

/* ============================================================
   EMBALLAGE VED TO-GO — OGSÅ PÅ bestil/  (31/8)
   ------------------------------------------------------------
   Kundens ord: "vi mangler at lave emballagetillæg på
   bestillinger, det er 10 kroner oveni."

   ⚠️ MOTOREN VAR BYGGET, MEN KUN DEN HALVE SIDE BRUGTE DEN.
   js/skal/bestil.js (forsiden, smørrebrødssiden, tapas) har
   regnet den med siden 30/8. js/bestilling.js — som bærer den
   HER side og ved-bordet/ — gjorde det ikke, så det samme
   smørrebrød kostede forskelligt alt efter, hvilken side gæsten
   kom ind ad. Ingen af de to sider så forkerte ud for sig selv;
   det var forskellen mellem dem, der var fejlen.

   Modstykket — at bordet ALDRIG betaler emballage — står i
   tests/ved-bordet.spec.js. De to prøver hører sammen: hver for
   sig kan de begge bestå på en side, hvor emballagen slet ikke
   findes.
   ============================================================ */
test.describe('Emballage ud af huset', () => {

  function medEmballage(ekstra) {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger,
      { emballage_pris: 10 }, ekstra || {});
    return d;
  }

  test('to portioner ud af huset koster to gange emballage', async ({ page }) => {
    await åbnBestil(page, { data: medEmballage() });
    await vaelg(page, 2);

    // 2 × 89 = 178, plus 2 × 10 i emballage = 198.
    await expect(page.locator('#bestil-sum-tekst')).toContainText('2 stykker');
    await expect(page.locator('#bestil-sum-tekst')).toContainText('198');
  });

  /* ⚠️ OG GÆSTEN SKAL KUNNE SE HVORFOR. Et tillæg, hun først
     møder på totalen, er et tal, hun spørger til ved lugen. */
  test('den står som sin egen linje i kurven', async ({ page }) => {
    await åbnBestil(page, { data: medEmballage() });
    await vaelg(page, 2);
    await page.locator('#kurv-abn').click();

    const liste = page.locator('#kurv-liste');
    await expect(liste).toBeVisible();
    await expect(liste.locator('.kurv-emballage')).toContainText('Emballage');
    await expect(liste.locator('.kurv-emballage')).toContainText('2 × 10');
  });

  /* Ejerens eget navn, hvis han har skrevet et — og navnet følger
     med i bestillingen, så køkkenet og kassen ser det samme. */
  test('den følger med i bestillingen som en linje', async ({ page }) => {
    await åbnBestil(page, { data: medEmballage({ emballage_navn: 'Til at tage med' }) });
    await vaelg(page, 2);
    await page.locator('#kurv-abn').click();
    await expect(page.locator('#kurv-liste .kurv-emballage'))
      .toContainText('Til at tage med');
  });

  /* ⚠️ TOM PRIS = INGEN EMBALLAGE. Vi finder ikke på et tal på
     forretningens vegne — samme regel som alt andet i huset. */
  test('uden en pris i admin er der ingen emballage', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 2);
    await expect(page.locator('#bestil-sum-tekst')).toContainText('178,-');
    await page.locator('#kurv-abn').click();
    await expect(page.locator('#kurv-liste .kurv-emballage')).toHaveCount(0);
  });
});

/* ============================================================
   BESTILLINGSNUMMERET  (31/8)
   ------------------------------------------------------------
   Kundens ord: "kan bestillings-ordrenummeret ikke være fra
   #0000 af, lidt pænere end det der" — og "oplys også
   bestillingsnumre, når folk bestiller, dér hvor de er".
   Nummeret tælles op af databasen (bestillingsnummer.sql);
   øvetilstanden spejler tælleren. Referencen er stadig rækkens
   nøgle — den er flyttet ned, ikke fjernet.
   ============================================================ */
test.describe('Bestillingsnummeret', () => {

  test('kvitteringen viser nummeret — og referencen består', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 2);
    await udfyld(page);
    await sendMedKig(page);

    const tak = page.locator('#bestil-tak');
    await expect(tak).toBeVisible();
    await expect(tak.locator('.kvit-linje', { hasText: 'Bestillingsnummer' })
      .locator('.kvit-vaerdi')).toHaveText('#0001');
    await expect(tak).toContainText('Reference');
  });

  test('numrene tæller op, én bestilling ad gangen', async ({ page }) => {
    await åbnBestil(page);
    await vaelg(page, 2);
    await udfyld(page);
    await sendMedKig(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const d = await gemteData(page);
    expect(d.bestillinger[0].nummer).toBe(1);

    /* Nummer to gennem "Bestil noget mere" — en genindlæsning
       ville nulstille prøvens lokale lager (åbn() sætter data
       ubetinget). Andet telefonnummer, så dubletvagten ikke er
       det, der måles. */
    await page.locator('#bestil-tak button', { hasText: 'Bestil noget mere' }).click();
    await vaelg(page, 2);
    await udfyld(page, { telefon: '20304099' });
    await sendMedKig(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const d2 = await gemteData(page);
    const numre = d2.bestillinger.map((b) => b.nummer).sort();
    expect(numre).toEqual([1, 2]);
  });
});
