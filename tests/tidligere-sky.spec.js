/* ============================================================
   ARKIVET SKAL OGSÅ VIRKE MED SKYEN  (16/9)
   ------------------------------------------------------------
   MÅLT: "Tidligere på havnen" stod i produktionen kun med nyheder og
   plakater. Butik.hent() smed alle overståede kalenderrækker væk FØR
   arkivet fik dem — også de offentlige arrangementer, som arkivet
   lever af. skal-forside.spec.js' prøve bestod hele tiden, fordi
   øvetilstanden ikke går gennem den gren.

   Her går siden gennem skyens vej: config.js får en adresse, og hvert
   kald besvares af prøven med den tabel, det spørger efter. Ingenting
   går på nettet.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { sætUr } = require('./hjaelp');

const SKY = 'https://proeve.eksempel.dk';

function ark(x) {
  return Object.assign({
    lokation_id: 'mosede', type: 'arrangement', offentlig: true, tilmelding: false,
    pladser: null, slut_dato: null, start_kl: null, beskrivelse: null, billede: null,
    emoji: null, lukker_kl: null,
  }, x);
}

const TABELLER = {
  kalender: [
    ark({ id: 71, dato: '2026-08-01', titel: 'Musik på molen', start_kl: '13:00' }),
    ark({ id: 72, dato: '2026-08-02', titel: 'Bent har ferie', offentlig: false }),
    ark({ id: 73, dato: '2026-08-02', type: 'lukkedag', titel: 'Lukket i går' }),
    ark({ id: 74, dato: '2026-08-20', titel: 'Kommer snart' }),
  ],
};

async function medSky(page) {
  await page.route('**/js/config.js*', (r) => r.fulfill({
    status: 200, contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD = { url: '" + SKY + "', anonKey: 'noget' };",
  }));
  await page.route(SKY + '/**', (r) => {
    const t = (r.request().url().match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    r.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(TABELLER[t] || []) });
  });
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
}

test('et overstået arrangement når arkivet, også når data kommer fra skyen', async ({ page }) => {
  await medSky(page);
  await sætUr(page, '2026-08-07T11:00:00Z');
  await page.goto('/h-kalender.html', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#evliste')).toContainText('Kommer snart');
  const fold = page.locator('.tidligere');
  await fold.locator('summary').click();
  await expect(fold.locator('.tidl[data-kilde="arrangement"] h4')).toHaveText(['Musik på molen']);
  // Modstykkerne: en intern note og en lukkedag hører ikke i arkivet,
  // og det, der kommer, står ikke begge steder.
  await expect(fold).not.toContainText('Bent har ferie');
  await expect(fold).not.toContainText('Lukket i går');
  await expect(fold).not.toContainText('Kommer snart');
});

/* ⚠️ OG EN OVERSTÅET LUKKEDAG MÅ IKKE LUKKE I DAG. Filteret slipper
   nu gamle rækker igennem — men kun offentlige arrangementer. Sluppes
   lukkedage med, ville en lukning fra i går kunne stå som "lukket" på
   forsiden i dag. */
test('en overstået lukkedag lukker ikke forsiden i dag', async ({ page }) => {
  await medSky(page);
  await sætUr(page, '2026-08-07T11:00:00Z');
  await page.goto('/h-kalender.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#evliste')).toContainText('Kommer snart');
  const lukkedage = await page.evaluate(() =>
    window.Butik.hent().then((d) => (d.lukkedage || []).map((l) => l.dato)));
  expect(lukkedage).toEqual([]);
});
