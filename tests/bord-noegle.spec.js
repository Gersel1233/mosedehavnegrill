/* NØGLEN I QR-KODEN  (30/8)

   Kundens spørgsmål: "er QR-koderne sikre? De peger på et link —
   hvad hvis nogen har gemt url'en og pludselig begynder at
   bestille hjemmefra, eller vil fucke med cafeen? Hvordan sikrer
   vi, at folk ikke bare kan taste url'en ind, men faktisk skal
   scanne dem?"

   ⚠️ FØRST DET ÆRLIGE: ingen adresse kan bevise, at nogen står
   ved bordet. En QR-kode ER et link, og den telefon, der
   scannede, kan gemme det. Det, nøglen flytter, er grænsen fra
   "kan gætte et tal mellem 1 og 55" til "har været ved bordet"
   — og den kan skiftes med ét tryk, den dag et bord misbruges.

   Databasens halvdel er bevist for sig i
   supabase/proev-bord-noegle.sql (16 × BESTOD på en lokal
   Postgres 16, set fejle tre gange). Filen her måler den
   halvdel, en browser kan se:

     · gætter man adressen, kommer man ikke igennem
     · øvetilstanden fælder det SAMME som databasen
     · nøglen står aldrig et sted, gæsten kan læse den
     · skiltet bærer den, og admin kan skifte den
*/

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-08-06T11:00:00Z';        // torsdag kl. 13.00 dansk

/* To borde: ét låst og ét som før. Blandingen er ikke kunstig —
   det er præcis den tilstand, ejeren står i, mellem at han
   trykker "Lås" og at skiltene er printet om. */
const BORDE = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude',
    aktiv: true, sortering: 10, kode: 'K3F9X2' },
  { id: 2, lokation_id: 'mosede', nummer: '9', pladser: 2, placering: 'inde',
    aktiv: true, sortering: 20, kode: null },
];

function data(ekstra) {
  return grunddata(Object.assign({ borde: BORDE }, ekstra || {}));
}

async function åbnBord(page, adresse) {
  await åbn(page, adresse, { ur: UR, data: data() });
}

async function bestil(page) {
  await page.locator('#bestil-stykker .stk-linje').first()
    .locator('button', { hasText: '+' }).click();
  await page.fill('#bestil-navn', 'Sara Holm');
  await page.fill('#bestil-telefon', '20304050');
  await page.locator('#bestil-send').click();
  await page.locator('#kig-send').click();
}

// ============================================================
//  DEN, DER TASTER ADRESSEN
// ============================================================
test.describe('Adressen alene er ikke nok', () => {

  /* ⚠️ KUNDENS SPØRGSMÅL, MÅLT. Den, der har set ét skilt, kender
     mønsteret: /ved-bordet/?bord=N. Uden en nøgle kunne han
     skrive de 54 andre og sende mad ud til borde, hvor der sidder
     nogen helt andre. */
  test('et låst bord tager ikke imod uden nøgle i adressen', async ({ page }) => {
    await åbnBord(page, '/ved-bordet/?bord=7');

    await expect(page.locator('#bestil-lukket')).toContainText('Scan QR-koden');
    // Og formularen står ikke og lokker.
    await expect(page.locator('#bestil-form')).toBeHidden();
  });

  test('en forkert nøgle bliver afvist ved afsendelsen', async ({ page }) => {
    await åbnBord(page, '/ved-bordet/?bord=7&n=AAAAAA');
    // Siden lukker ikke — nøglen SER rigtig ud, til databasen ser den.
    await expect(page.locator('#bestil-form')).toBeVisible();

    await bestil(page);
    await expect(page.locator('#kig-fejl')).toContainText('passer ikke til det bord');

    const gemt = await gemteData(page);
    expect((gemt.bestillinger || []).length,
      'bestillingen slap igennem med en forkert nøgle').toBe(0);
  });

  test('den rigtige nøgle kommer igennem', async ({ page }) => {
    await åbnBord(page, '/ved-bordet/?bord=7&n=K3F9X2');
    await bestil(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const gemt = await gemteData(page);
    expect(gemt.bestillinger.length).toBe(1);
    expect(gemt.bestillinger[0].bord_nummer).toBe('7');
  });

  /* Et skilt kan være kradset, og så taster nogen koden af med
     øjnene. Store og små bogstaver må ikke afgøre, om maden
     kommer. Databasen gør det samme (prøve 6 i SQL-prøven). */
  test('små bogstaver er den samme nøgle', async ({ page }) => {
    await åbnBord(page, '/ved-bordet/?bord=7&n=k3f9x2');
    await bestil(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();
  });

  /* ⚠️ ET BORD UDEN NØGLE BLIVER IKKE LÅST UDE. Ellers ville
     SQL-filen slukke alle 55 skilte i det sekund, den blev kørt —
     midt i en frokost, uden at nogen har trykket på noget. */
  test('et bord uden nøgle virker som før', async ({ page }) => {
    await åbnBord(page, '/ved-bordet/?bord=9');
    await expect(page.locator('#bestil-form')).toBeVisible();
    await bestil(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();
  });
});

// ============================================================
//  NØGLEN MÅ IKKE KUNNE LÆSES UD
// ============================================================
test.describe('Gæsten kan ikke hente nøglerne', () => {

  /* ⚠️ HELE VÆRNETS FUNDAMENT. Kunne siden hente bordlisten med
     koderne i, kunne enhver med anon-nøglen — som ligger
     offentligt i js/config.js — selv bygge alle 55 adresser, og
     nøglen var en dekoration.

     Databasen håndhæver det med kolonnerettigheder (prøve 8 i
     SQL-prøven). Her måles, at ØVETILSTANDEN gør det samme: en
     efterligning, der er mildere end skyen, lader fejlen bestå
     lokalt og fælde i produktionen. */
  test('Butik.hentBorde giver ikke gæsten koden', async ({ page }) => {
    await åbnBord(page, '/ved-bordet/?bord=9');

    const liste = await page.evaluate(() => window.Butik.hentBorde());
    expect(liste.length).toBe(2);
    liste.forEach((b) => {
      expect(b.kode, 'nøglen kom med ud til gæsten').toBeUndefined();
    });
    // Men OM bordet kræver en nøgle, må hun gerne vide.
    expect(liste.find((b) => b.nummer === '7').har_kode).toBe(true);
    expect(liste.find((b) => b.nummer === '9').har_kode).toBe(false);
  });

  /* Nøglen står i adressen, og det kan ikke være anderledes — men
     den må ikke ligge i den GEMTE bestilling bagefter. Gjorde
     den, ville den stå på personalets skærm, i sikkerhedskopien
     fra Historik og i enhver eksport. */
  test('nøglen bliver ikke gemt på bestillingen', async ({ page }) => {
    await åbnBord(page, '/ved-bordet/?bord=7&n=K3F9X2');
    await bestil(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const gemt = await gemteData(page);
    expect(gemt.bestillinger[0].bord_kode,
      'nøglen blev liggende i rækken').toBeFalsy();
  });

  /* Den står heller ikke skrevet ud på skærmen, gæsten kigger på. */
  test('nøglen står ikke i sidens tekst', async ({ page }) => {
    await åbnBord(page, '/ved-bordet/?bord=7&n=K3F9X2');
    const tekst = await page.locator('body').innerText();
    expect(tekst).not.toContain('K3F9X2');
  });
});

// ============================================================
//  PERSONALET
// ============================================================
test.describe('Ejeren styrer nøglerne selv', () => {

  async function borderFanen(page, borde) {
    await åbnAdmin(page, { data: grunddata({ borde: borde || BORDE }) });
    await visFane(page, 'p-borde');
  }

  test('kortet siger, hvor mange borde der er låst', async ({ page }) => {
    await borderFanen(page);
    await expect(page.locator('#noegle-status')).toContainText('1 af 2');
    await expect(page.locator('#noegle-tekst')).toContainText('nummeret alene');
  });

  /* ⚠️ MÆRKET SIGER OM — ALDRIG HVAD. Stod koden i listen, ville
     ét skærmbillede af Borde-fanen være 55 gyldige adresser, og
     personalesiden ville være det farligste sted i systemet. */
  test('rækken viser låst eller åben, men aldrig selve koden', async ({ page }) => {
    await borderFanen(page);
    const syv = page.locator('.admin-raekke[data-bord="7"]');
    await expect(syv.locator('.noegle-maerke')).toContainText('Låst');
    await expect(page.locator('.admin-raekke[data-bord="9"] .noegle-maerke'))
      .toContainText('Åben');

    const tekst = await page.locator('#p-borde').innerText();
    expect(tekst, 'koden står skrevet ud i admin').not.toContain('K3F9X2');
  });

  /* Svaret på "nogen har gemt url'en": ejeren giver bordet en ny
     nøgle, og linket i sofaen dør i samme sekund. Ét skilt
     printes om, ikke 55. */
  test('en ny nøgle gør den gamle adresse ubrugelig', async ({ page }) => {
    await borderFanen(page);
    page.on('dialog', (d) => d.accept());
    await page.locator('.admin-raekke[data-bord="7"] button', { hasText: 'Ny nøgle' })
      .click();
    await expect(page.locator('#kvittering')).toContainText('ny nøgle');

    const gemt = await gemteData(page);
    const syv = gemt.borde.find((b) => b.nummer === '7');
    expect(syv.kode, 'nøglen blev ikke skiftet').not.toBe('K3F9X2');
    expect(syv.kode, 'nøglen har ikke den aftalte form').toMatch(/^[2-9A-HJ-NP-Z]{6}$/);

    // Den gamle adresse er død nu.
    await åbn(page, '/ved-bordet/?bord=7&n=K3F9X2', { ur: UR, data: gemt });
    await bestil(page);
    await expect(page.locator('#kig-fejl')).toContainText('passer ikke');
  });

  test('alle åbne borde kan låses på én gang', async ({ page }) => {
    /* ⚠️ TRE ÅBNE BORDE, IKKE ÉT.

       Første udgave brugte den faste liste, hvor kun ét bord var
       åbent — og så bestod prøven "de er forskellige" af sig selv,
       fordi der kun blev lavet ÉN nøgle. Den blev SET BESTÅ med
       alle nøgler hårdkodet til AAAAAA. Et af tallene skal komme
       udefra: her er det, at der er flere borde end nøgler at
       sammenligne. */
    await borderFanen(page, [
      { id: 1, lokation_id: 'mosede', nummer: '1', placering: 'ude', aktiv: true, sortering: 10, kode: null },
      { id: 2, lokation_id: 'mosede', nummer: '2', placering: 'ude', aktiv: true, sortering: 20, kode: null },
      { id: 3, lokation_id: 'mosede', nummer: '3', placering: 'inde', aktiv: true, sortering: 30, kode: null },
    ]);
    page.on('dialog', (d) => d.accept());
    await page.locator('#laas-koder').click();
    await expect(page.locator('#kvittering')).toContainText('låst');

    const gemt = await gemteData(page);
    expect(gemt.borde.length).toBe(3);
    gemt.borde.forEach((b) => {
      expect(b.kode, 'bord ' + b.nummer + ' blev ikke låst').toMatch(/^[2-9A-HJ-NP-Z]{6}$/);
    });
    /* ⚠️ OG DE SKAL VÆRE FORSKELLIGE. Fik alle borde den samme
       nøgle, ville ét skilt åbne dem alle, og hele øvelsen var
       spildt — uden at noget så forkert ud på skærmen. */
    const nøgler = gemt.borde.map((b) => b.kode);
    expect(new Set(nøgler).size, 'to borde fik den samme nøgle').toBe(3);
  });

  /* ⚠️ ET GEM AF NOGET ANDET MÅ IKKE TØMME NØGLEN. Rettede ejeren
     zonen på et låst bord, og gik nøglen med, ville skiltet
     stadig virke — og der ville ikke stå en linje om det nogen
     steder. Det er nyhedernes vis_fra-fejl igen: en kolonne, der
     sendes ubetinget. */
  test('en rettelse af zonen rører ikke nøglen', async ({ page }) => {
    await borderFanen(page);
    const zone = page.locator('.admin-raekke[data-bord="7"] .zone');
    await zone.fill('Molen');
    await zone.blur();
    await expect(page.locator('#kvittering')).toBeVisible();

    const gemt = await gemteData(page);
    const syv = gemt.borde.find((b) => b.nummer === '7');
    expect(syv.zone).toBe('Molen');
    expect(syv.kode, 'nøglen blev tømt af et gem, der ikke handlede om den')
      .toBe('K3F9X2');
  });
});

// ============================================================
//  SKILTET
// ============================================================
test.describe('Skiltet bærer nøglen', () => {

  test('koden på skiltet har nøglen i sig', async ({ page }) => {
    await åbn(page, '/print/bordkort.html', { data: data() });
    await expect(page.locator('.kort').first()).toBeVisible();

    const adresser = await page.locator('.kort .adresse').allInnerTexts();
    const syv = adresser.find((a) => /bord=7/.test(a));
    expect(syv, 'bord 7 fik ikke sin nøgle med på skiltet').toContain('n=K3F9X2');
  });

  /* Den, der står ved printeren, er den eneste, der kan gøre
     noget ved et ulåst bord — og det er nu, han står der. */
  test('printsiden siger til om de borde, der ikke er låst', async ({ page }) => {
    await åbn(page, '/print/bordkort.html', { data: data() });
    await expect(page.locator('.kort').first()).toBeVisible();

    /* ⚠️ DER STÅR MERE END ÉN ADVARSEL. Prøveserveren kører på
       127.0.0.1, så domæne-advarslen står der altid — og en
       locator, der rammer to elementer, måler ingenting. Alle
       advarsler læses under ét. */
    const alle = (await page.locator('#besked .advarsel').allInnerTexts()).join(' ');
    expect(alle).toContain('1 af 2 borde har ingen nøgle');
  });
});

/* ⚠️ PRINTSIDEN UDEN LOGIN  (30/8)

   Kunden åbnede printsiden efter at have kørt SQL-filen og fik
   en TOM side: ingen skilte, ingen besked, ingenting. To fejl
   ramte samtidig, og de gjorde hinanden usynlige.

   1) rel="noopener" på knappen i admin river forbindelsen til
      admin-fanen over, og så følger sessionStorage — altså
      loginnet — ikke med. Uden login må siden ikke læse
      kolonnen kode (det er hele værnet), så databasen svarer
      42501 og der er ingen borde at tegne.

   2) Og beskeden om det blev tørret af. tegnBesked() rydder
      #besked og kaldes ved HVERT skift i adressefeltet — så i
      det sekund ejeren skrev sit domæne, forsvandt "log ind
      først", og tilbage stod en tom side.

   ⚠️ Fejl 1 kan IKKE måles her: øvetilstanden har intet login,
   og efterligningen giver altid koderne. Det er netop den
   fælde, CLAUDE.md advarer om. Fejl 2 kan, og det er den, der
   gjorde fejl 1 usynlig — så det er den, der måles. */
test.describe('Printsiden siger det, når den ikke kan hente koderne', () => {

  async function udenAdgang(page) {
    /* ⚠️ DOMContentLoaded ER FOR SENT. Printsidens eget script
       kører, mens siden læses, og har kaldt hentBorde længe før.
       Derfor gribes Butik i det sekund, store.js sætter den. */
    await page.addInitScript(() => {
      let rigtig;
      Object.defineProperty(window, 'Butik', {
        configurable: true,
        get() { return rigtig; },
        set(v) {
          rigtig = v;
          rigtig.hentBorde = function () {
            return Promise.reject(new Error('42501: permission denied for table borde'));
          };
        },
      });
    });
    await åbn(page, '/print/bordkort.html', { data: data() });
  }

  test('en afvist hentning står som en besked, ikke som en tom side', async ({ page }) => {
    await udenAdgang(page);
    const alle = (await page.locator('#besked .advarsel').allInnerTexts()).join(' ');
    expect(alle).toContain('ikke logget ind');
    expect(alle, 'den sikre vej står der ikke').toContain('Husk mig');
    await expect(page.locator('.kort')).toHaveCount(0);
  });

  /* ⚠️ DEN, DER GJORDE DEN ANDEN FEJL USYNLIG. */
  test('og beskeden overlever, at adressen skiftes', async ({ page }) => {
    await udenAdgang(page);
    const felt = page.locator('#grund-felt');
    await felt.fill('https://mosedehavnecafe.dk/');
    await felt.blur();

    const alle = (await page.locator('#besked .advarsel').allInnerTexts()).join(' ');
    expect(alle, 'beskeden blev tørret af, da adressen blev skrevet')
      .toContain('ikke logget ind');
  });
});
