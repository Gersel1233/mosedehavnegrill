/* ============================================================
   INGEN SAG FORSVINDER  (16/9)
   ------------------------------------------------------------
   Ejerens ord: "man skal altid kunne finde det, hvis det bliver
   væk", og det gælder alle slags.

   MÅLT: Butik.hentForespoergsler hentede kun de sidste 180 dage.
   Grænsen sad på HENTNINGEN, så en sag fra i fjor hverken stod på
   fanen eller kunne søges frem med Find en sag — den fandtes
   simpelthen ikke i browseren.

   ⚠️ MÅLT PÅ SKY-VEJEN. Øvetilstanden henter alt fra localStorage
   og har ingen grænse, så en prøve dér ville måle ingenting.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { sætUr } = require('./hjaelp');

const SKY = 'https://proeve.eksempel.dk';

async function medSky(page) {
  const kald = [];
  await page.route('**/js/config.js*', (r) => r.fulfill({
    status: 200, contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD = { url: '" + SKY + "', anonKey: 'noget' };",
  }));
  await page.route(SKY + '/**', (r) => {
    kald.push(decodeURIComponent(r.request().url()));
    r.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' }, body: '[]' });
  });
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  return kald;
}

test('forespørgsler hentes med en grænse — men kan hentes uden', async ({ page }) => {
  const kald = await medSky(page);
  await sætUr(page, '2026-09-16T11:00:00Z');
  await page.goto('/bestil/', { waitUntil: 'domcontentloaded' });

  const url = (alt) => page.evaluate((a) => window.Butik.hentForespoergsler(a)
    .catch(() => null).then(() => null), alt);

  await url(false);
  await expect.poll(() => kald.filter((k) => k.indexOf('/forespoergsler?') !== -1).length)
    .toBeGreaterThan(0);
  const begraenset = kald.filter((k) => k.indexOf('/forespoergsler?') !== -1).pop();
  /* Standarden er stadig de sidste 180 dage: en fane, der henter alt
     fra tidernes morgen ved hver opdatering, er langsom for ingenting. */
  expect(begraenset, 'grænsen er væk fra den almindelige hentning')
    .toContain('oprettet=gte.');

  const foer = kald.length;
  await url(true);
  await expect.poll(() => kald.length).toBeGreaterThan(foer);
  const alle = kald.filter((k) => k.indexOf('/forespoergsler?') !== -1).pop();
  expect(alle, 'de ældre sager hentes stadig med en grænse')
    .not.toContain('oprettet=gte.');
});

/* Og vejen i admin: knappen står under listen, henter og siger det
   bagefter. ⚠️ ØVETILSTANDEN HAR INGEN GRÆNSE — den henter alt fra
   localStorage — så prøven her måler KNAPPENS vej, ikke grænsen.
   Grænsen måles i prøven ovenfor, på sky-vejen. */
const { åbnAdmin, grunddata, visFane } = require('./hjaelp');

test('knappen til de ældre sager står under listen og henter', async ({ page }) => {
  const d = grunddata();
  d.forespoergsler = [{
    id: 1, nummer: 7, lokation_id: 'mosede', reference: 'FO260916-AAA11',
    type: 'selskab', navn: 'Susanne Dahl', telefon: '28282828', email: null,
    dato: '2026-10-02', antal_personer: 40, besked: null, status: 'ny',
    intern_note: null, slettet: null, oprettet: '2026-09-14T10:00:00Z', detaljer: {},
  }];
  await åbnAdmin(page, { ur: '2026-09-16T11:00:00Z', data: d });
  await visFane(page, 'p-forespoergsler');

  const knap = page.locator('#foresp-aeldre');
  await expect(knap).toBeVisible();
  await expect(page.locator('#foresp-aeldre-note')).toContainText('halve år');

  await knap.click();
  /* Knappen forsvinder, og linjen siger, at alt er med: en knap, der
     kan trykkes igen og igen uden at der sker noget, holder man op
     med at stole på. */
  await expect(knap).toHaveCount(0);
  await expect(page.locator('#foresp-aeldre-note')).toContainText('Alle sager er med');
  // Og sagerne står der stadig — hentningen må ikke tømme listen.
  await expect(page.locator('#forespoergsler-liste')).toContainText('Susanne Dahl');
});

/* ⚠️ OG NÅR KNAPPEN BEDER OM DE ÆLDRE, SKAL DET NÅ FREM TIL
   HENTNINGEN. Falsifikationen afslørede hullet: fjernes flaget fra
   kaldet (Butik.hentForespoergsler() uden argument), BESTOD begge
   prøver ovenfor — øvetilstanden henter alt fra localStorage og ser
   aldrig argumentet, og sky-prøven kalder funktionen direkte, altså
   uden om knappen. Reglen stod uden vagt.

   Her måles selve sømmen: hvad admin FAKTISK beder om. */
test('knappen beder hentningen om de ældre', async ({ page }) => {
  const d = grunddata();
  d.forespoergsler = [];
  await åbnAdmin(page, { ur: '2026-09-16T11:00:00Z', data: d });
  await visFane(page, 'p-forespoergsler');

  await page.evaluate(() => {
    const org = window.Butik.hentForespoergsler;
    window.__alt = [];
    window.Butik.hentForespoergsler = function (alt) {
      window.__alt.push(alt);
      return org.apply(this, arguments);
    };
  });

  await page.locator('#foresp-aeldre').click();
  await expect.poll(() => page.evaluate(() => window.__alt))
    .toContain(true);

  /* Og den bliver ved med at bede om dem: takten og hvert gem henter
     listen igen, og uden at flaget huskes, ville de ældre forsvinde
     to sekunder efter, nogen bad om dem. */
  await page.evaluate(() => { window.__alt = []; });
  await page.evaluate(() => window.Admin.friskOp && window.Admin.friskOp());
  await expect.poll(() => page.evaluate(() => window.__alt))
    .not.toContain(false);
});
