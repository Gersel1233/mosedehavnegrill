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
const { sætUr, sætData, springIntroOver, grunddata } = require('./hjaelp');

function medRet(ekstra = {}) {
  const d = grunddata(ekstra);
  d.indstillinger = { ...d.indstillinger,
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

async function sendFraPanelet(page) {
  await page.locator('#dagens-valg [data-d="+"]').click();
  await page.locator('#dagens-kunde').fill('Test Testesen');
  await page.locator('#dagens-tlf').fill('12345678');
  await page.locator('#dagens-send').click();
}

test.describe('Afsendelsen prøver igen', () => {

  test('to nedbrud og så igennem: én bestilling, samme nummer', async ({ page }) => {
    const forsøg = [];
    await åbnMedSky(page, '/index.html', {
      data: medRet(),
      plan: (route) => {
        forsøg.push(JSON.parse(route.request().postData()).reference);
        if (forsøg.length < 3) return route.fulfill({ status: 503, body: 'nede' });
        return route.fulfill({ status: 201, body: '' });
      },
    });
    await sendFraPanelet(page);

    /* Kvitteringen kommer først efter tredje forsøg — pauserne er
       0,7 + 1,8 sekunder, så der ventes med rum til dem. */
    await expect(page.locator('#dagens')).toContainText('Tak', { timeout: 10000 });

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
    await åbnMedSky(page, '/index.html', {
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
    await sendFraPanelet(page);

    await expect(page.locator('#dagens')).toContainText('Tak', { timeout: 10000 });
    expect(kald).toBe(2);
  });

  test('en afvisning under 500 prøves ikke igen', async ({ page }) => {
    /* Bremsen svarer 409. At sende igen ville bare banke på den
       samme lukkede dør — og med tre forsøg ville gæsten vente
       2,5 sekunder ekstra på præcis samme svar. */
    let kald = 0;
    await åbnMedSky(page, '/index.html', {
      data: medRet(),
      plan: (route) => {
        kald += 1;
        return route.fulfill({ status: 409, body: 'bestilling_bremse_travlt' });
      },
    });
    await sendFraPanelet(page);

    await expect(page.locator('#dagens-fejl')).toContainText('travlt');
    expect(kald, 'en afvisning skal ikke gentages').toBe(1);
  });
});

test.describe('Sms-nødudgangen', () => {

  test('nettet er dødt: hele bestillingen som sms, og ingen løgn om modtagelse', async ({ page }) => {
    let kald = 0;
    await åbnMedSky(page, '/index.html', {
      data: medRet(),
      plan: (route) => { kald += 1; return route.abort(); },
    });
    await sendFraPanelet(page);

    const fejl = page.locator('#dagens-fejl');
    await expect(fejl).toContainText('IKKE sendt', { timeout: 10000 });
    expect(kald, 'alle tre forsøg skal være brugt først').toBe(3);

    /* Kvitteringen må IKKE stå der. En kvittering for noget, der
       ligger i en sms-kladde, er en løgn om en kundes aftensmad. */
    await expect(page.locator('#dagens')).not.toContainText('Tak — vi har den');

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
