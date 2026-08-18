/* HENTER SIDEN KUN SIN EGEN FORRETNINGS DATA?

   Databasen deles nu af flere. Hver række i menukort,
   åbningstider, nyheder, indstillinger og bestillinger bærer et
   lokation_id, og js/store.js skal filtrere på det ved HVER
   eneste hentning.

   Det er ikke sikkerheden — den ligger i adgangsreglerne, og de
   er prøvet i supabase/proev-flerlejer.sql mod en rigtig
   Postgres. Det her er noget andet og lige så vigtigt: glemmer
   én af syv hentninger sit filter, viser Mosede pludselig en
   anden forretnings åbningstider. Siden ser helt normal ud
   imens, og der står "Åbent til 21" på en dag hvor der er
   lukket. Den slags opdager man ikke ved at kigge.

   Resten af testene kører uden database, så de ville aldrig
   ramme det her. Derfor har filen sin egen opsætning: en config
   MED forbindelse, og alle kald til databasen fanget og talt.
*/

const { test, expect } = require('@playwright/test');
const { sætUr, springIntroOver, grunddata, åbn, gemteData, NØGLE } = require('./hjaelp');

const LOK = 'proev-x';

/* Sætter siden i "skytilstand" uden at der er en sky.

   config.js får en url og en nøgle, så store.js tror på
   forbindelsen — og hvert eneste kald til den url bliver fanget
   her, skrevet ned og besvaret med en tom liste. Ingenting går
   på nettet. */
async function medSky(page, lokation = LOK) {
  const kald = [];

  await page.route('**/js/config.js*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: `window.MOSEDE_CLOUD = { url: 'https://proeve.eksempel.dk',`
      + ` anonKey: 'noget', lokation: '${lokation}' };`,
  }));

  await page.route('https://proeve.eksempel.dk/**', (route) => {
    const url = route.request().url();
    kald.push({ url: url, metode: route.request().method() });
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: '[]',
    });
  });

  return kald;
}

// Tabellen ud af en PostgREST-adresse: .../rest/v1/menu_varer?...
function tabel(url) {
  return (url.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
}

test.describe('hver hentning kender sin forretning', () => {
  test('alle syv tabeller filtreres på lokationen', async ({ page }) => {
    const kald = await medSky(page);
    await sætUr(page, '2026-08-07T11:00:00Z');
    await page.goto('/');
    await springIntroOver(page);

    // Forsiden henter alt gennem Butik.hent(). Vent til de er ude.
    await expect.poll(() => kald.filter((k) => tabel(k.url)).length,
      { timeout: 8000 }).toBeGreaterThanOrEqual(7);

    const læsninger = kald.filter((k) => k.metode === 'GET' && tabel(k.url));
    const set = {};
    for (const k of læsninger) set[tabel(k.url)] = k.url;

    /* lokationer står for sig. Den har ingen lokation_id-kolonne
       — dens egen id ER lokationen — så filteret hedder noget
       andet dér. Netop derfor er den nem at glemme. */
    expect(set.lokationer, 'lokationer blev slet ikke hentet').toBeTruthy();
    expect(decodeURIComponent(set.lokationer),
      'lokationer hentes uden id-filter – siden ville vise den '
      + 'første forretning i databasen, uanset hvem den er')
      .toContain(`id=eq.${LOK}`);

    for (const t of ['aabningstider', 'lukkedage', 'menu_kategorier',
      'menu_varer', 'nyheder', 'indstillinger']) {
      expect(set[t], `${t} blev slet ikke hentet`).toBeTruthy();
      expect(decodeURIComponent(set[t]),
        `${t} hentes uden lokation_id – siden ville blande to `
        + 'forretningers data sammen')
        .toContain(`lokation_id=eq.${LOK}`);
    }
  });

  test('ingen læsning slipper ud uden et filter', async ({ page }) => {
    /* Den forrige test spørger "har hver tabel sit filter?". Den
       her spørger det modsatte: "er der noget som helst der
       slipper ud uden?". Kommer der en ottende tabel til i en
       senere fase, fanger den her den — den forrige gør ikke. */
    const kald = await medSky(page);
    await sætUr(page, '2026-08-07T11:00:00Z');
    await page.goto('/');
    await springIntroOver(page);

    await expect.poll(() => kald.filter((k) => tabel(k.url)).length,
      { timeout: 8000 }).toBeGreaterThanOrEqual(7);

    const uden = kald
      .filter((k) => k.metode === 'GET' && tabel(k.url))
      .map((k) => decodeURIComponent(k.url))
      .filter((u) => !u.includes('lokation_id=eq.') && !u.includes('id=eq.'));

    expect(uden, 'disse hentninger har intet lokationsfilter:\n' + uden.join('\n'))
      .toEqual([]);
  });

  test('et andet id giver et andet filter', async ({ page }) => {
    /* At filteret STÅR der er ikke nok – det kunne være skrevet
       fast i koden som 'mosede'. Her skifter vi lokationen i
       config og ser om hentningen følger med. Uden det ville
       kunde nr. 2 få en side, der henter Mosedes menukort. */
    const kald = await medSky(page, 'anden-havn');
    await sætUr(page, '2026-08-07T11:00:00Z');
    await page.goto('/');
    await springIntroOver(page);

    await expect.poll(() => kald.filter((k) => tabel(k.url) === 'menu_varer').length,
      { timeout: 8000 }).toBeGreaterThan(0);

    const url = decodeURIComponent(
      kald.find((k) => tabel(k.url) === 'menu_varer').url);
    expect(url).toContain('lokation_id=eq.anden-havn');
    expect(url, 'lokationen er skrevet fast i koden')
      .not.toContain('mosede');
  });
});

test.describe('bremsen på bestillinger', () => {
  /* Den rigtige bremse sidder i databasen (supabase/bremse.sql)
     og er prøvet dér. Øvetilstanden har sin egen kopi af
     grænsen, og de to skal opføre sig ens — ellers øver man sig
     på noget andet end det, der kommer til at ske. */

  async function bestil(page, nr) {
    return page.evaluate((n) => window.Butik.bestil({
      navn: 'Prøve Gæst',
      telefon: '33333333',
      hent_dato: '2026-08-10',
      hent_tid: '12:0' + n,
      linjer: [{ navn: 'Smørrebrød', antal: 1, pris: 55 }],
    }).then(() => 'ok', (f) => f.message), nr);
  }

  test('fem fra samme nummer går igennem, den sjette bremses', async ({ page }) => {
    await åbn(page, '/', { data: grunddata({ bestillinger: [] }) });

    for (let i = 1; i <= 5; i++) {
      expect(await bestil(page, i), `bestilling nr. ${i} blev afvist`).toBe('ok');
    }

    const svar = await bestil(page, 6);
    expect(svar, 'den sjette bestilling fra samme nummer slap igennem')
      .not.toBe('ok');
    expect(svar, 'beskeden skal pege på telefonen, ikke bare afvise')
      .toMatch(/[Rr]ing til os/);
  });

  test('et andet nummer bremses ikke', async ({ page }) => {
    /* Grænsen går på nummeret. Gik den på noget bredere, ville
       en travl dag lukke bestillingerne for alle andre. */
    await åbn(page, '/', { data: grunddata({ bestillinger: [] }) });

    for (let i = 1; i <= 5; i++) await bestil(page, i);

    const svar = await page.evaluate(() => window.Butik.bestil({
      navn: 'En Anden',
      telefon: '44444444',
      hent_dato: '2026-08-10',
      hent_tid: '13:00',
      linjer: [{ navn: 'Smørrebrød', antal: 1, pris: 55 }],
    }).then(() => 'ok', (f) => f.message));

    expect(svar).toBe('ok');
  });

  test('bestillingen får sidens lokation med', async ({ page }) => {
    await åbn(page, '/', { data: grunddata({ bestillinger: [] }) });
    await bestil(page, 1);

    const d = await gemteData(page);
    expect(d.bestillinger[0].lokation_id).toBe('mosede');
  });
});
