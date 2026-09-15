/* ROBUSTHEDEN I AFSENDELSEN — spiis' lærepenge, målt her.

   Briefen fra spiis (22/8) betalte for tre lektioner med rigtige
   kunder: net der blinker, dubletter på de dårlige dage, og tomme
   lister uden forklaring. Prøverne her sørger for, at lektionerne
   BLIVER lært — hver af dem er bevist i stand til at fejle ved at
   genindføre fejlen.

   Nettet er opdigtet: config.js byttes ud, så siden tror den har
   en database på https://prove.invalid, og hvert kald derhen
   besvares af prøven selv. Læsningerne får lov at fejle — så
   falder siden tilbage på det lokale, som den skal — og det er
   KUN skrivningen af bestillingen, der styres i hver prøve.
   Uret og dataene sættes som i resten af prøverne. */

const { test, expect } = require('@playwright/test');
/* Prøverne åbnede forsiden. Den nye forside (23/8, Claude
   Design-handoffet) kører ikke motoren endnu — bestil/ gør, med
   samme kig, samme tre forsøg og samme nødudgang, så nettets
   svigt måles dér, til motoren er koblet på den nye forside. */
const {
  sætUr, sætData, springIntroOver, grunddata, visFane,
} = require('./hjaelp');

/* Varslet sættes til NUL med vilje. Standarden er et døgn — "bestil
   senest dagen før" — og så kan dagen i dag ikke vælges, og dagens
   ret kan altså ikke bestilles. Prøverne her handler ikke om
   varslet, men om hvad der sker, når nettet svigter midt i en
   afsendelse; uden nullet ville de fejle på noget helt andet. */
function medRet(ekstra = {}) {
  const d = grunddata(ekstra);
  d.indstillinger = { ...d.indstillinger,
    bestilling_varsel_timer: 0,
    dagens_ret: { navn: 'Stegt flæsk', beskrivelse: 'Med persillesovs.', pris: 95 } };
  return d;
}

/* Som åbn() i hjaelp.js, men med skyen SLÅET TIL mod prøvens eget
   net. bestillinger-kaldene gives videre til planen; alt andet på
   det opdigtede domæne afvises, så Butik.hent falder tilbage på
   de lokale data. */
async function åbnMedSky(page, sti, { data, plan }) {
  await page.route('**/js/config.js*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD = { url: 'https://prove.invalid',"
      + " anonKey: 'prove', lokation: 'mosede' };",
  }));
  await page.route('https://prove.invalid/**', (route) => {
    if (route.request().url().indexOf('/rest/v1/bestillinger') !== -1
        && route.request().method() === 'POST') return plan(route);
    return route.abort();
  });
  await sætUr(page, '2026-08-07T11:00:00Z');
  await sætData(page, data);
  await page.goto(sti);
  await springIntroOver(page);
}

/* FORSIDEN HAR SELVE FORMULAREN NU (23/8) — ikke et lille panel,
   der linkede videre. Dagens ret står øverst i listen som en
   almindelig linje med sin egen tæller, så vejen igennem er den
   samme som på enhver anden vare. Kunden bad om det: "man skal
   kunne bestille direkte der uden at skulle ind på 1 side."

   Fejl under afsendelsen lander i kiggets egen fejlboks
   (#kig-fejl), fordi det er kigget, gæsten står i, når der trykkes
   send. */
async function sendFraSiden(page) {
  await page.waitForSelector('#bestil-stykker .stk-linje');
  await page.locator('#bestil-stykker .stk-linje', { hasText: 'Stegt flæsk' })
    .getByRole('button', { name: /Én mere/ }).click();
  await page.locator('#bestil-navn').fill('Test Testesen');
  await page.locator('#bestil-telefon').fill('12345678');
  await page.locator('#bestil-send').click();
  /* Det sidste kig står imellem — formularen er byttet ud med
     kigget, så knappen her ER kiggets egen. */
  await expect(page.locator('#bestil-kig')).toBeVisible();
  await page.locator('#kig-send').click();
}

test.describe('Afsendelsen prøver igen', () => {

  test('to nedbrud og så igennem: én bestilling, samme nummer', async ({ page }) => {
    const forsøg = [];
    await åbnMedSky(page, '/bestil/', {
      data: medRet(),
      plan: (route) => {
        forsøg.push(JSON.parse(route.request().postData()).reference);
        if (forsøg.length < 3) return route.fulfill({ status: 503, body: 'nede' });
        return route.fulfill({ status: 201, body: '' });
      },
    });
    await sendFraSiden(page);

    /* Kvitteringen kommer først efter tredje forsøg — pauserne er
       0,7 + 1,8 sekunder, så der ventes med rum til dem. */
    await expect(page.locator('#bestil-tak')).toContainText('Tak', { timeout: 10000 });

    expect(forsøg.length, 'der skulle være prøvet præcis tre gange').toBe(3);
    /* SAMME nummer i alle tre forsøg. Det er hele pointen: skifter
       nummeret undervejs, kan databasen ikke se, at det er den
       samme bestilling, og gensendelse bliver til dubletter. */
    expect(new Set(forsøg).size, 'referencen skiftede mellem forsøgene').toBe(1);
    expect(forsøg[0]).toMatch(/^SM/);
  });

  test('et gensendt forsøg, der allerede er landet, bliver ikke en dublet', async ({ page }) => {
    /* Første forsøg "dør" efter at være nået frem: prøven svarer
       503, men i virkeligheden står rækken der. Andet forsøg
       rammer så unik-indekset på referencen — og DET svar skal
       læses som "den er inde", ikke som en fejl. */
    let kald = 0;
    await åbnMedSky(page, '/bestil/', {
      data: medRet(),
      plan: (route) => {
        kald += 1;
        if (kald === 1) return route.fulfill({ status: 503, body: 'nede' });
        return route.fulfill({
          status: 409,
          body: JSON.stringify({ code: '23505',
            message: 'duplicate key value violates unique constraint "bestillinger_reference_key"' }),
        });
      },
    });
    await sendFraSiden(page);

    await expect(page.locator('#bestil-tak')).toContainText('Tak', { timeout: 10000 });
    expect(kald).toBe(2);
  });

  test('et gensendt forsøg, der rammer dubletvagten, er også landet', async ({ page }) => {
    /* ⚠️ SAMME SITUATION SOM OVENFOR, MEN DATABASEN SVARER PÅ DET
       ANDET UNIK-INDEKS. Rækken er inde efter første forsøg, og
       den bryder BEGGE indekser, når den sendes igen: referencen
       og `bestilling_ikke_dobbelt` (samme forretning, samme
       nummer, samme hentetid). Hvilket af de to Postgres nævner
       i sit svar, afhænger af den rækkefølge, indekserne blev
       oprettet i — altså af hvilke SQL-filer der er kørt hvornår.

       Det er en tavs afhængighed: reglen om, at et gensendt
       forsøg ER landet, må ikke hænge på, hvilket indeks der
       tilfældigvis dømmer først. Uden det her læses vores EGEN
       første afsendelse som "du har allerede sendt en bestilling
       til det tidspunkt" — og gæsten, hvis mad ligger i køkkenet,
       tror det slog fejl og ringer eller bestiller igen.

       ⚠️ OG DET GÆLDER KUN PÅ ET GENSENDT FORSØG. Kommer svaret i
       FØRSTE forsøg, har gæsten faktisk sendt to gange, og så
       skal hun have beskeden. Prøven nedenfor måler netop den
       halvdel. */
    let kald = 0;
    await åbnMedSky(page, '/bestil/', {
      data: medRet(),
      plan: (route) => {
        kald += 1;
        if (kald === 1) return route.fulfill({ status: 503, body: 'nede' });
        return route.fulfill({
          status: 409,
          body: JSON.stringify({ code: '23505',
            message: 'duplicate key value violates unique constraint "bestilling_ikke_dobbelt"' }),
        });
      },
    });
    await sendFraSiden(page);

    await expect(page.locator('#bestil-tak')).toContainText('Tak', { timeout: 10000 });
    expect(kald).toBe(2);
  });

  test('men i FØRSTE forsøg er dubletten gæstens egen, og hun får besked', async ({ page }) => {
    /* Modstykket, og uden det måler prøven ovenfor ingenting: en
       regel, der siger ja til hver eneste dublet, ville bestå den
       — og så kunne gæsten sende den samme bestilling to gange
       uden at høre et ord om det. */
    let kald = 0;
    await åbnMedSky(page, '/bestil/', {
      data: medRet(),
      plan: (route) => {
        kald += 1;
        return route.fulfill({
          status: 409,
          body: JSON.stringify({ code: '23505',
            message: 'duplicate key value violates unique constraint "bestilling_ikke_dobbelt"' }),
        });
      },
    });
    await sendFraSiden(page);

    await expect(page.locator('#kig-fejl')).toContainText('allerede sendt');
    expect(kald, 'en afvisning skal ikke gentages').toBe(1);
  });

  test('en afvisning under 500 prøves ikke igen', async ({ page }) => {
    /* Bremsen svarer 409. At sende igen ville bare banke på den
       samme lukkede dør — og med tre forsøg ville gæsten vente
       2,5 sekunder ekstra på præcis samme svar. */
    let kald = 0;
    await åbnMedSky(page, '/bestil/', {
      data: medRet(),
      plan: (route) => {
        kald += 1;
        return route.fulfill({ status: 409, body: 'bestilling_bremse_travlt' });
      },
    });
    await sendFraSiden(page);

    await expect(page.locator('#kig-fejl')).toContainText('travlt');
    expect(kald, 'en afvisning skal ikke gentages').toBe(1);
  });
});

/* ============================================================
   DATABASENS AFSLAG SIGER NAVNET — OG KUN NAVNET  (14/9)

   PostgREST svarer med JSON, og "message" står SIDST. Et (.*)$
   tog de afsluttende "} med, så gæsten læste "Æbleflæsk}" og
   "Kl. 12.00:00"}". Den gamle prøve svarede med ren tekst og
   kunne ikke se det — svarene her har databasens egen form.
   ============================================================ */
function afslag(besked) {
  return JSON.stringify({ code: 'P0001', details: null, hint: null, message: besked });
}

test.describe('Databasens afslag siger navnet', () => {
  for (const [kode, forventet] of [
    ['bestilling_udsolgt_vare', 'er lige blevet udsolgt'],
    ['bestilling_vare_uden_pris', 'har ikke fået en pris endnu'],
    ['bestilling_ikke_den_dag', 'laves ikke den dag'],
  ]) {
    test(`${kode} nævner retten — uden databasens tegn`, async ({ page }) => {
      await åbnMedSky(page, '/bestil/', {
        data: medRet(),
        plan: (route) => route.fulfill({
          status: 400, contentType: 'application/json',
          body: afslag(kode + ': Stegt flæsk'),
        }),
      });
      await sendFraSiden(page);
      const fejl = page.locator('#kig-fejl');
      await expect(fejl).toContainText(forventet);
      await expect(fejl).toContainText('"Stegt flæsk"');
      expect(await fejl.textContent(), 'databasens egne tegn slap med ud til gæsten')
        .not.toMatch(/[{}]|bestilling_|P0001/);
    });
  }

  test('lugens loft siger klokkeslættet, som gæsten skriver det', async ({ page }) => {
    await åbnMedSky(page, '/bestil/', {
      data: medRet(),
      plan: (route) => route.fulfill({
        status: 400, contentType: 'application/json',
        body: afslag('bestilling_luge_fuldt: 12:00:00'),
      }),
    });
    await sendFraSiden(page);
    const fejl = page.locator('#kig-fejl');
    await expect(fejl).toContainText('Kl. 12.00 er lige blevet fyldt op');
    expect(await fejl.textContent()).not.toMatch(/[{}"]|:00|bestilling_/);
  });
});

test.describe('Sms-nødudgangen', () => {

  test('nettet er dødt: hele bestillingen som sms, og ingen løgn om modtagelse', async ({ page }) => {
    let kald = 0;
    await åbnMedSky(page, '/bestil/', {
      data: medRet(),
      plan: (route) => { kald += 1; return route.abort(); },
    });
    await sendFraSiden(page);

    const fejl = page.locator('#kig-fejl');
    await expect(fejl).toContainText('IKKE sendt', { timeout: 10000 });
    expect(kald, 'alle tre forsøg skal være brugt først').toBe(3);

    /* Kvitteringen må IKKE stå der. En kvittering for noget, der
       ligger i en sms-kladde, er en løgn om en kundes aftensmad. */
    await expect(page.locator('#bestil-tak')).toBeEmpty();

    /* Sms'en har det hele med: navnet, retten og referencen, så
       personalet kan genkende bestillingen, uanset hvilken vej
       den til sidst kommer frem ad. */
    const sms = fejl.locator('a[href^="sms:"]');
    await expect(sms).toBeVisible();
    const href = await sms.getAttribute('href');
    const krop = decodeURIComponent(href.split('body=')[1] || '');
    expect(krop).toMatch(/ikke sendt/i);
    expect(krop).toContain('Test Testesen');
    expect(krop).toContain('Stegt flæsk');
    expect(krop).toMatch(/Ref: SM/);

    await expect(fejl.locator('a[href^="tel:"]')).toBeVisible();
  });
});

test.describe('Tomme tilstande forklarer sig', () => {

  test('sæsonlukningen lukker også bestillingsformularen', async ({ page }) => {
    /* lukketDen dækker kun kalenderens lukkedage. Uden den egen
       regel stod formularen og tilbød afhentningsdage midt i
       vinterlukningen, mens forsidens pille sagde lukket. */
    const d = grunddata();
    d.indstillinger = { ...d.indstillinger,
      saeson: { lukket: true, aabner_igen: 'til foråret', besked: 'Tak for i år!' } };
    const { åbn } = require('./hjaelp');
    await åbn(page, '/bestil/', { data: d });

    await expect(page.locator('#bestil-dag-note')).toContainText('lukket for sæsonen');
    await expect(page.locator('#bestil-dag-note')).toContainText('til foråret');
    await expect(page.locator('#bestil-dag option')).toHaveCount(0);
  });

  test('en aften uden flere tider forklarer, hvorfor i dag mangler', async ({ page }) => {
    /* Spiis' dyreste fejl: kl. 19 var listen bare tom, og kunden
       troede siden var i stykker. Kl. 20.45 med lukketid 21 er
       sidste afhentning (20.30) passeret — dagen i dag må ikke
       stå i rækken, og savnet skal forklares. Varslet er sat til
       nul, for ellers er det varslet, der forklarer fraværet. */
    const d = grunddata();
    d.indstillinger = { ...d.indstillinger, bestilling_varsel_timer: 0 };
    const { åbn } = require('./hjaelp');
    await åbn(page, '/bestil/', { ur: '2026-08-07T18:45:00Z', data: d });

    await expect(page.locator('#bestil-dag-note'))
      .toContainText('Ikke flere afhentningstider i dag');
    // Og i morgen står klar som første valgbare dag
    await expect(page.locator('#bestil-dag option').first()).toContainText('8. aug.');
  });

  test('en lukkedag i dag siger lukket, ikke bare ingenting', async ({ page }) => {
    const d = grunddata({
      kalender: [{ id: 1, type: 'lukkedag', dato: '2026-08-07', slut_dato: null,
        titel: 'Lukket', beskrivelse: null, emoji: null, offentlig: false }],
    });
    d.indstillinger = { ...d.indstillinger, bestilling_varsel_timer: 0 };
    const { åbn } = require('./hjaelp');
    await åbn(page, '/bestil/', { data: d });

    await expect(page.locator('#bestil-dag-note')).toContainText('Vi holder lukket i dag');
  });
});

/* ============================================================
   RESERVEDATAENE ER IKKE FORRETNINGENS  (5/9)
   ------------------------------------------------------------
   startdata() i js/store.js findes, så siden ikke står tom, når
   databasen er nede. Men den bar to ting, ingen har sat:

   · åbningstiderne 10-20 hver dag. MÅLT ved at lukke for
     databasen: statuspillen sagde "Åbent nu til 20:00" med lige
     så stor sikkerhed som en rigtig åbningstid — og en gæst,
     der kører til havnen kl. 19.45 på det løfte, har spildt
     turen.
   · adressen. Reservedataene bar ét husnummer, mens tretten
     sider bar et andet — altså stod forretningen med et forkert
     husnummer netop den dag, noget var galt. Nummeret er 20I
     igen fra 9/9 (årsrapporten, Mikkels beslutning); hele
     historikken står i kontakt-post.spec.js.

   ⚠️ RESTEN AF SIDEN BLIVER STÅENDE. Et menukort, der er en dag
   gammelt, er stadig bedre end en tom side. Det er kun
   PÅSTANDEN OM NUET, der ikke må komme fra et tal, ingen har
   sat. */
test.describe('Når databasen er nede, lover siden ikke noget', () => {
  const SKY = 'https://db.eksempel.test';

  async function åbnUdenDatabase(page) {
    await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
    await page.route('**/js/config.js*', (r) => r.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: "window.MOSEDE_CLOUD={url:'" + SKY + "',anonKey:'proeve'};",
    }));
    let kald = 0;
    await page.route(SKY + '/**', (r) => { kald++; return r.abort('connectionfailed'); });
    await sætUr(page, '2026-08-07T11:00:00Z');   // fredag 13.00 dansk
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await springIntroOver(page);
    await page.waitForTimeout(600);
    /* ⚠️ ÉT AF TALLENE KOMMER UDEFRA: uden et eneste kald til den
       falske adresse kørte siden i øvetilstand, og prøven målte
       ingenting. Det er nøjagtig dét, der skete, første gang
       værktøjet blev kørt. */
    expect(kald, 'prøven ramte aldrig databasen — den måler ingenting')
      .toBeGreaterThan(0);
  }

  test('statuspillen påstår hverken åbent eller lukket', async ({ page }) => {
    await åbnUdenDatabase(page);
    const pille = (await page.locator('.status').first().innerText()).trim();
    /* Kl. 13.00 ville reservens 10-20 sige "Åbent nu til 20.00". */
    expect(pille, 'pillen lover en åbningstid, ingen har sat')
      .not.toMatch(/åbent nu|åbent til/i);
    expect(pille, 'pillen siger heller ikke lukket — vi VED det ikke')
      .not.toMatch(/^lukket/i);
    expect(pille).toMatch(/ring og hør/i);
  });

  /* ⚠️ OG RESTEN AF SIDEN BLIVER STÅENDE. Uden den her ville
     "pillen siger ingenting" kunne opnås ved at tømme hele
     siden — og det er præcis det modsatte af meningen. */
  test('men siden står der stadig', async ({ page }) => {
    await åbnUdenDatabase(page);
    await expect(page.locator('h1').first()).toContainText('havnen');
    const tekst = await page.locator('body').innerText();
    expect(tekst.replace(/\s+/g, '').length).toBeGreaterThan(400);
  });

  test('og adressen er forretningens egen', async ({ page }) => {
    await åbnUdenDatabase(page);
    const tekst = await page.locator('body').innerText();
    const fundet = tekst.match(/Havnevej\s*20[A-Za-z]?/g) || [];
    expect(fundet.length, 'adressen står ingen steder').toBeGreaterThan(0);
    fundet.forEach((a) => {
      expect(a, 'reservedataene bærer et forkert husnummer')
        .toMatch(/Havnevej\s*20I/);
    });
  });
});

/* ============================================================
   GÆSTESIDEN KOMMER SIG SELV, NÅR DATABASEN ER TILBAGE  (15/9)
   ------------------------------------------------------------
   MÅLT i gennemgangen: faldt forbindelsen, da en gæst åbnede siden,
   stod den på reservedataene for evigt — admin henter selv igen,
   gæstesiderne gjorde aldrig. Nu spørger siden igen (2, 4, 8 … s).

   ⚠️ TO UDFALD, OG DE HØRER SAMMEN. Har gæsten ikke rørt noget,
   hentes siden igen af sig selv. Har hun, må en genindlæsning ikke
   tage det, hun var i gang med — så står der en knap. Uden det
   andet ville en regel, der ALTID genindlæste, bestå det første.
   Navigationerne tælles på netværket (hovedrammens dokumentkald),
   ikke på 'load', som kan komme efter prøvens første aflæsning. */
test.describe('Gæstesiden kommer sig selv, når databasen er tilbage', () => {
  const SKY = 'https://db.eksempel.test';

  async function åbnNede(page) {
    const t = { nede: true, sider: 0, kald: 0 };
    await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
    await page.route('**/js/config.js*', (r) => r.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: "window.MOSEDE_CLOUD={url:'" + SKY + "',anonKey:'proeve'};",
    }));
    await page.route(SKY + '/**', (r) => {
      t.kald++;
      if (t.nede) return r.abort('connectionfailed');
      return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    page.on('request', (r) => {
      if (r.isNavigationRequest() && r.frame() === page.mainFrame()) t.sider++;
    });
    await sætUr(page, '2026-08-07T11:00:00Z');
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    expect(t.kald, 'prøven ramte aldrig databasen — den måler ingenting').toBeGreaterThan(0);
    return t;
  }

  test('har gæsten ikke rørt noget, henter siden sig selv igen', async ({ page }) => {
    const t = await åbnNede(page);
    const før = t.sider;
    t.nede = false;
    await expect.poll(() => t.sider, { timeout: 15000,
      message: 'siden hentede ikke sig selv igen' }).toBeGreaterThan(før);
  });

  test('har hun rørt noget, står der en knap i stedet', async ({ page }) => {
    const t = await åbnNede(page);
    const før = t.sider;
    await page.evaluate(() => document.body.dispatchEvent(new Event('click', { bubbles: true })));
    t.nede = false;
    await expect(page.locator('#genopret-bjaelke')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#genopret-bjaelke button')).toHaveText('Hent siden igen');
    expect(t.sider, 'siden genindlæste under fingeren').toBe(før);
  });
});

/* ============================================================
   UDEN FORBINDELSE ER SENDEKNAPPEN SPÆRRET FRA START  (15/9)
   ------------------------------------------------------------
   Reservedataene har "Smørrebrød 55" og "Håndmad 24". Uden spærren
   kunne gæsten fylde kurven, skrive navn og nummer og først få nej
   efter tre forsøg. Knappen skal sige vejen, FØR hun rører noget —
   og med forbindelse skal den ikke. Reglen er Butik.bestillingNede.
   ============================================================ */
test.describe('Uden forbindelse kan der ikke sendes', () => {
  const SKY = 'https://db.eksempel.test';

  async function nede(page, sti) {
    const t = { kald: 0 };
    await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
    await page.route('**/js/config.js*', (r) => r.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: "window.MOSEDE_CLOUD={url:'" + SKY + "',anonKey:'proeve'};",
    }));
    await page.route(SKY + '/**', (r) => { t.kald++; return r.abort('connectionfailed'); });
    await sætUr(page, '2026-08-07T11:00:00Z');
    await page.goto(sti, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => t.kald,
      { message: 'prøven ramte aldrig databasen — den måler ingenting' }).toBeGreaterThan(0);
  }

  test('smørrebrødssiden spærrer knappen og siger telefonen', async ({ page }) => {
    await nede(page, '/h-smorrebrod.html');
    const knap = page.locator('#ssend');
    await expect(knap).toContainText('ring 28 87 13 43');
    await expect(knap).toBeDisabled();
  });

  test('bestil/ spærrer knappen og siger telefonen', async ({ page }) => {
    await nede(page, '/bestil/');
    const knap = page.locator('#bestil-send');
    await expect(knap).toContainText('ring 28 87 13 43');
    await expect(knap).toBeDisabled();
  });

  /* Modstykket: i øvetilstand er intet nede, og knappen skal gå den
     almindelige vej. Uden den ville en spærre, der ALTID sagde "nede",
     bestå de to ovenfor. */
  test('med forbindelse siger knappen intet om at være nede', async ({ page }) => {
    await page.goto('/h-smorrebrod.html');
    await expect(page.locator('#ssend')).toContainText('Vælg noget først');
  });
});

/* ============================================================
   ADMIN GEMMER IKKE REservedata IND OVER EJERENS EGNE  (5/9)
   ------------------------------------------------------------
   MÅLT ved at lukke for databasen: de syv lister råber hver især
   "kunne ikke hentes" — men indstillingsfelterne stod pænt
   udfyldt med navn, adresse, telefon, varsel og åbningstider fra
   startdata() i js/store.js. De tal kommer fra KODE, ikke fra
   forretningen, og de ser ud præcis som ejerens egne.

   ⚠️ ET TRYK PÅ GEM VILLE SKRIVE DEM IND OVER HANS RIGTIGE, og
   autogem ville gøre det uden et tryk overhovedet — 1,2 sekund
   efter han rørte et felt. Det er "intet må gå tabt" vendt om:
   her er det ejerens egne indstillinger, der kan gå tabt. */
test.describe('Admin uden forbindelse', () => {
  const SKY = 'https://db.eksempel.test';

  async function åbnAdminUdenDatabase(page) {
    const skrivninger = [];
    await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
    await page.route('**/js/config.js*', (r) => r.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: "window.MOSEDE_CLOUD={url:'" + SKY + "',anonKey:'proeve'};",
    }));
    /* ⚠️ KUN DET, DER GEMMER NOGET. Skraldespanden rydder selv op
       ved login (DELETE på rækker, der er over 30 dage i spanden),
       og det er en anden ting end at skrive ejerens indstillinger
       — den fejler harmløst uden forbindelse. Prøven her handler
       om POST og PATCH: dem, der ville lægge reservedata ind over
       hans egne. */
    await page.route(SKY + '/**', (r) => {
      const m = r.request().method();
      const u = r.request().url();
      /* Et RPC-kald er et OPSLAG, ikke en skrivning: min_rolle
         spørger, hvad brugeren må — den ændrer ingenting. */
      if ((m === 'POST' || m === 'PATCH' || m === 'PUT')
          && u.indexOf('/rest/v1/rpc/') === -1) {
        skrivninger.push(m + ' ' + u);
      }
      return r.abort('connectionfailed');
    });
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('mosede_token', 'lokal');
        sessionStorage.setItem('mosede_email', 'test@lesreg.dk');
      } catch (e) { /* ignoreres */ }
    });
    await sætUr(page, '2026-08-07T11:00:00Z');
    await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    return skrivninger;
  }

  test('et tryk på Gem skriver ikke — og siger hvorfor', async ({ page }) => {
    const skrivninger = await åbnAdminUdenDatabase(page);
    await visFane(page, 'p-kontakt');
    /* ⚠️ FELTET SKAL VÆRE DER FØRST. Uden den her ville prøven
       bestå på en fane, der slet ikke blev tegnet. */
    await expect(page.locator('#lok-adresse')).toBeVisible();

    await page.locator('#gem-kontakt').click();
    await expect(page.locator('#fejl')).toBeVisible();
    await expect(page.locator('#fejl')).toContainText(/ikke få fat i databasen/i);
    await expect(page.locator('#fejl')).toContainText(/ikke jeres egne/i);
    /* Og ingen skrivning gik af sted. Tallet kommer UDEFRA — fra
       de kald, browseren faktisk sendte. */
    expect(skrivninger, 'admin skrev til databasen uden forbindelse')
      .toEqual([]);
  });

  test('og autogem skriver heller ikke af sig selv', async ({ page }) => {
    const skrivninger = await åbnAdminUdenDatabase(page);
    await visFane(page, 'p-kontakt');
    await expect(page.locator('#lok-adresse')).toBeVisible();

    await page.locator('#lok-adresse').fill('Et helt andet sted 9');
    await page.locator('#lok-navn').click();      // udløser 'change'
    await page.waitForTimeout(1800);              // og autogemmets 1,2 sek.
    expect(skrivninger, 'autogem sendte reservedata af sted')
      .toEqual([]);
  });
});
