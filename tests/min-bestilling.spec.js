/* ============================================================
   KVITTERINGEN, DER LEVER  (4/9)
   ------------------------------------------------------------
   Kundens ord: systemet skal være "dygtigere, mere intelligent
   og generelt bedre".

   MÅLT, før det blev bygget: gæsten hører ikke ét ord, efter hun
   har trykket send. Kvitteringen lever kun i den fane, hun står
   i — lukker hun den, er den væk. Og kan køkkenet ikke lave
   maden, står beskeden KUN på personalets skærm; opkaldet er
   noget, nogen skal huske.

   Nu har kvitteringen en adresse (?ref=), og siden viser, hvor
   langt maden er.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, grunddata, gemteData } = require('./hjaelp');

const UR = '2026-08-07T10:00:00Z';
const REF = 'SM260807-K3F9X';

/* ⚠️ EGEN BESTILLING, IKKE EJERENS DATA. grunddata() har sine
   egne varer og sin egen dag; prøven her lægger ÉN række ind med
   en reference, den selv kender. Læren fra
   proev-bord-uden-telefon.sql, som faldt tre gange hos kunden,
   fordi den lånte ejerens dag, vare og borde. */
function medBestilling(ændringer) {
  const d = grunddata();
  d.bestillinger = [Object.assign({
    id: 1, lokation_id: 'mosede', reference: REF, nummer: 47,
    navn: 'Anna Vind', telefon: '20304050', email: 'anna@eksempel.dk',
    hent_dato: '2026-08-07', hent_tid: '13:00', antal: 3,
    linjer: [{ navn: 'Flæskestegssandwich', antal: 2, pris: 89 },
      { navn: 'Sodavand', antal: 1, pris: 25 }],
    fyld: null, besked: null, status: 'ny', hvordan: 'afhentning',
    leverings_adresse: null, bord_nummer: null, intern_note: 'ring til hende',
    slettet: null, oprettet: '2026-08-07T10:00:00.000Z',
  }, ændringer || {})];
  return d;
}

async function åbnStatus(page, d, ref) {
  await åbn(page, '/min-bestilling/?ref=' + (ref === undefined ? REF : ref),
    { ur: UR, data: d || medBestilling() });
  await page.waitForSelector('.mb-kort');
}

test.describe('Gæsten kan følge sin bestilling', () => {

  test('nummeret og maden står på siden', async ({ page }) => {
    await åbnStatus(page);
    await expect(page.locator('.mb-nr-tal')).toHaveText('#0047');
    await expect(page.locator('.mb-varer')).toContainText('Flæskestegssandwich');
    await expect(page.locator('.mb-ialt')).toContainText('203');
  });

  /* ⚠️ STATUSSEN ER GÆSTENS ORD, IKKE DATABASENS. Personalets
     skærm oversætter `klar` til personalets sprog; gæsten skal
     have sit. Prøven læser TEKSTEN på skærmen — et spørgsmål til
     koden om dens egen tabel ville bestå, også hvis siden skrev
     "klar" råt ud. */
  test('hvert trin siger noget, gæsten kan bruge', async ({ page }) => {
    for (const [status, ord] of [
      ['ny', 'Vi har din bestilling'],
      ['tilberedes', 'Maden er i gang'],
      ['klar', 'Din mad er klar'],
      ['afhentet', 'Afhentet'],
    ]) {
      await åbnStatus(page, medBestilling({ status }));
      await expect(page.locator('.mb-titel'), status).toContainText(ord);
    }
  });

  /* ⚠️ DATABASENS EGNE ORD MÅ IKKE SLIPPE UD — og prøven må kun
     lede efter dem, der IKKE også er danske ord. Første udgave
     krævede, at "klar" aldrig stod på siden; men "Din mad er
     klar" er præcis dét, gæsten skal læse, og trinnet hedder
     "Klar". Den faldt på sig selv.

     `tilberedes` og `bekraeftet` er personalets og databasens
     alene — står de på skærmen, er statussen skrevet råt ud. */
  test('databasens egne ord står aldrig på skærmen', async ({ page }) => {
    for (const status of ['bekraeftet', 'tilberedes', 'serveret']) {
      await åbnStatus(page, medBestilling({ status }));
      const tekst = (await page.locator('.mb-kort').innerText()).toLowerCase();
      expect(tekst, status + ' er skrevet raat ud').not.toContain(status);
      expect(tekst.trim().length, 'kortet er tomt — så måler prøven ingenting')
        .toBeGreaterThan(40);
    }
  });

  /* ⚠️ DEN VIGTIGSTE AF DEM ALLE. Kan køkkenet ikke lave maden,
     står beskeden i dag KUN på personalets skærm, og opkaldet er
     noget, nogen skal huske. Nu kan hun SE det — og siden siger,
     hvad hun gør ved det. */
  test('et afvist svar når frem — og siger hvad hun gør', async ({ page }) => {
    await åbnStatus(page, medBestilling({ status: 'afvist' }));
    await expect(page.locator('.mb-titel')).toContainText('kunne ikke lave den');
    await expect(page.locator('.mb-kort')).toContainText('Ring til os');
    await expect(page.locator('.mb-ring')).toHaveAttribute('href', /^tel:/);
  });

  /* ⚠️ OG EN AFVIST BESTILLING LOVER INGEN HENTETID. Set på et
     skud, ikke læst: kortet sagde "Vi kunne ikke lave den" og lige
     nedenunder "Hentes i dag kl. 13.00" — en aftale om mad, der
     ikke kommer. Samme med "Betales ved lugen": hun skal ikke
     betale for noget, hun ikke får.

     ⚠️ PRØVEN MÅLER BEGGE HALVDELE. Uden den anden ville reglen
     bestå på en side, der aldrig viser en hentetid. */
  test('en afvist bestilling lover hverken hentetid eller betaling',
    async ({ page }) => {
      await åbnStatus(page, medBestilling({ status: 'klar' }));
      await expect(page.locator('.mb-fakta'), 'en åben bestilling mangler '
        + 'hentetiden — så måler prøven nedenfor ingenting').toContainText('13.00');
      await expect(page.locator('.mb-fine')).toContainText('lugen');

      await åbnStatus(page, medBestilling({ status: 'afvist' }));
      await expect(page.locator('.mb-fakta')).toHaveCount(0);
      await expect(page.locator('.mb-kort')).not.toContainText('Betales');
    });

  /* ⚠️ NAVN, TELEFON, MAIL OG PERSONALETS NOTE MÅ ALDRIG STÅ DER.
     Referencen er nøglen, og en kvittering kan blive fundet på
     gaden. Databasen svarer slet ikke med dem
     (supabase/bestilling-status.sql) — det her er den anden
     halvdel: siden viser dem heller ikke, hvis de en dag skulle
     komme med. */
  test('siden viser hverken navn, nummer, mail eller personalets note',
    async ({ page }) => {
      await åbnStatus(page);
      const tekst = await page.locator('body').innerText();
      for (const hemmelig of ['Anna Vind', '20304050', 'anna@eksempel.dk',
        'ring til hende']) {
        expect(tekst, 'siden viser "' + hemmelig + '"').not.toContain(hemmelig);
      }
    });

  test('en ukendt reference siger det — og tilbyder et felt', async ({ page }) => {
    await åbnStatus(page, medBestilling(), 'SM260807-FINDESIKKE');
    await expect(page.locator('.mb-titel')).toContainText('kan ikke finde den');
    await expect(page.locator('#mb-ref')).toBeVisible();
  });

  test('uden en reference i adressen spørger siden efter den', async ({ page }) => {
    await åbn(page, '/min-bestilling/', { ur: UR, data: medBestilling() });
    await page.waitForSelector('.mb-kort');
    await expect(page.locator('#mb-ref')).toBeVisible();
  });

  /* ⚠️ EN SLETTET BESTILLING KAN IKKE FØLGES. Skraldespanden er
     en dato i `slettet`; en bestilling, personalet har lagt væk,
     må ikke blive ved med at kunne følges. Øvetilstanden
     håndhæver det samme som SQL'en — en mock, der er mildere end
     databasen, lader fejlen bestå lokalt og fælde i produktionen. */
  test('en slettet bestilling kan ikke følges', async ({ page }) => {
    await åbnStatus(page, medBestilling({ slettet: '2026-08-07' }));
    await expect(page.locator('.mb-titel')).toContainText('kan ikke finde den');
  });

  /* ⚠️ OG VINDUET LUKKER. En reference, der bliver fundet om en
     måned, svarer ingenting — men gårsdagens skal stadig kunne
     følges: hun henter kl. 19.45 og kigger på sin telefon kl.
     00.10. Uden den anden halvdel ville prøven bestå på et
     vindue, der var lukket helt. */
  test('gårsdagens kan følges, men ikke ugegammelt', async ({ page }) => {
    await åbnStatus(page, medBestilling({ hent_dato: '2026-08-06',
      status: 'afhentet' }));
    await expect(page.locator('.mb-titel')).toContainText('Afhentet');

    await åbnStatus(page, medBestilling({ hent_dato: '2026-07-30',
      status: 'afhentet' }));
    await expect(page.locator('.mb-titel')).toContainText('kan ikke finde den');
  });

  /* ⚠️ SIDEN ER noindex, SOM ADMIN OG ved-bordet/. Stod den i
     Google, ville søgemaskinen gemme et link med en fremmed
     reference i. */
  test('den holdes ude af søgemaskinerne og har ingen menu', async ({ page }) => {
    await åbnStatus(page);
    await expect(page.locator('meta[name="robots"]'))
      .toHaveAttribute('content', /noindex/);
    await expect(page.locator('nav, .sheet, footer')).toHaveCount(0);
  });

  /* ⚠️ ET BORD HAR INGEN HENTETID. Maden bæres ud, når den er
     klar, så en linje med et klokkeslæt ville være en aftale,
     ingen har lavet. */
  test('ved bordet står bordnummeret, ikke en hentetid', async ({ page }) => {
    await åbnStatus(page, medBestilling({ bord_nummer: '7',
      hvordan: 'spis_her', status: 'tilberedes' }));
    await expect(page.locator('.mb-fakta')).toContainText('7');
    await expect(page.locator('.mb-fakta')).not.toContainText('13.00');
    await expect(page.locator('.mb-tekst')).toContainText('bord 7');
  });
});

/* ============================================================
   VEJEN DERHEN — uden den findes siden ikke for nogen
   ============================================================ */
test.describe('Kvitteringen fører til siden', () => {

  /* ⚠️ ADRESSEN ER RELATIV TIL SIDEN, IKKE SKREVET TO STEDER.
     bestil/ og ved-bordet/ ligger i en undermappe, forsiden gør
     ikke — og vejen udledes af sidens EGEN sti til js/store.js,
     som den allerede har måttet få rigtig. Prøven måler href'en
     fra begge steder; et spørgsmål til koden om dens egen
     konstant ville bestå, også hvis linket pegede ingen steder
     hen. */
  test('linket på bestil/ peger op og ud af mappen', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: UR, data: grunddata() });
    const adresse = await page.evaluate(() =>
      window.Butik && window.Butik.foelgAdresse
        ? window.Butik.foelgAdresse('SM260807-ABCDE') : null);
    expect(adresse).toBe('../min-bestilling/?ref=SM260807-ABCDE');
  });

  test('og på forsiden peger det ned i mappen', async ({ page }) => {
    await åbnSkal(page, '/index.html', { ur: UR, data: grunddata() });
    const adresse = await page.evaluate(() =>
      window.Butik && window.Butik.foelgAdresse
        ? window.Butik.foelgAdresse('SM260807-ABCDE') : null);
    expect(adresse).toBe('min-bestilling/?ref=SM260807-ABCDE');
  });
});
