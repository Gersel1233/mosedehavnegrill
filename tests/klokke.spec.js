/* KLOKKEN OEVERST TIL HOEJRE  (30/8)

   Kundens ord: "historik er fint, men skal gøres bedre både
   teknisk og placeringen skal være en klokke oppe i højre
   hjørne ... og virke for mosedehavnecafeen."

   ⚠️ DEN ER IKKE EN NY DATAKILDE. Den læser de lister, fanerne
   allerede har meldt ind. En klokke med sin EGEN hentning kunne
   sige noget andet end fanen ved siden af, og så holder man op
   med at stole på tallet. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata } = require('./hjaelp');

const I_DAG = '2026-08-07';

function medNyt(ændringer) {
  const d = grunddata();
  d.bestillinger = [{
    id: 1, lokation_id: 'mosede', reference: 'SM-K-1', navn: 'Bo Jensen',
    telefon: '20304050', email: null, hent_dato: I_DAG, hent_tid: '13:00',
    linjer: [{ navn: 'Softice med guf', antal: 4, pris: 35.5 }], fyld: [], antal: 4,
    besked: null, status: 'ny', hvordan: 'afhentning', leverings_adresse: null,
    bord_nummer: null, intern_note: null, slettet: null,
    oprettet: '2026-08-07T10:00:00Z',
  }];
  d.forespoergsler = [{
    id: 1, lokation_id: 'mosede', reference: 'FO-1', type: 'selskab',
    navn: 'Anna Hansen', telefon: '20304051', email: null, dato: '2026-12-05',
    antal_personer: 30, besked: null, detaljer: {}, status: 'ny',
    intern_note: null, slettet: null, oprettet: '2026-08-06T09:00:00Z',
  }];
  return Object.assign(d, ændringer || {});
}

test.describe('Klokken', () => {

  test('tallet siger, hvor meget der er ulæst', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await expect(page.locator('#klokke-tal')).toHaveText('2');
    await expect(page.locator('#klokke-tal')).toBeVisible();
  });

  /* Et tal, der altid står der, holder man op med at se på. */
  test('uden noget nyt er tallet væk', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    const tal = page.locator('#klokke-tal');
    await expect(tal).toHaveCount(1);
    await expect(tal).toBeHidden();
  });

  /* ⚠️ GRUPPERET PÅ DEN DAG, DET GÆLDER — ikke på den dag, det
     kom ind. Personalet planlægger efter hvornår maden skal ud. */
  test('posterne står under den dag, de gælder', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await page.locator('#klokke-knap').click();

    const dage = await page.$$eval('.klokke-dag', (e) => e.map((x) => x.textContent));
    expect(dage.join(' ')).toContain('7. august');
    expect(dage.join(' ')).toContain('5. december');
  });

  test('pilen åbner fanen og markerer posten som læst', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await page.locator('#klokke-knap').click();
    await page.locator('.klokke-post', { hasText: 'Bo Jensen' })
      .locator('.klokke-aabn').click();

    await expect(page.locator('#p-bestillinger')).not.toHaveClass(/skjult/);
    await expect(page.locator('#klokke-tal')).toHaveText('1');
  });

  /* ⚠️ EN LÆST POST BLIVER STÅENDE, den bliver bare stille.
     Fjernede vi den, kunne personalet ikke finde tilbage til den
     — og så er klokken en liste, man ikke tør røre. */
  test('markeret som læst forsvinder posten ikke', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await page.locator('#klokke-knap').click();
    const post = page.locator('.klokke-post', { hasText: 'Bo Jensen' });
    await post.locator('.klokke-vaek').click();

    await expect(post).toHaveCount(1);
    await expect(post).toHaveClass(/laest/);
    await expect(page.locator('#klokke-tal')).toHaveText('1');
  });

  test('markér alle som læst slukker tallet', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await page.locator('#klokke-knap').click();
    await page.locator('#klokke-alle').click();
    await expect(page.locator('#klokke-tal')).toBeHidden();
  });

  /* ⚠️ KUN DET, DER IKKE ER SET PÅ. En bestilling, nogen har sat
     til "bekræftet", er set — og skal ikke blive ved med at råbe. */
  test('en bekræftet bestilling tæller ikke med', async ({ page }) => {
    const d = medNyt();
    d.bestillinger[0].status = 'bekraeftet';
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#klokke-tal')).toHaveText('1');
  });

  /* ⚠️ ET KLIK INDE I LAGET MÅ IKKE LUKKE DET. Uden
     stopPropagation lukkede laget sig selv, i det sekund man
     trykkede ✕ på en post. */
  test('laget bliver åbent, når man trykker inde i det', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await page.locator('#klokke-knap').click();
    await page.locator('.klokke-post').first().locator('.klokke-vaek').click();
    await expect(page.locator('#klokke-lag')).not.toHaveClass(/skjult/);
  });

  test('et klik ved siden af lukker', async ({ page }) => {
    await åbnAdmin(page, { data: medNyt() });
    await page.locator('#klokke-knap').click();
    await expect(page.locator('#klokke-lag')).not.toHaveClass(/skjult/);
    await page.locator('#fane-titel').click();
    await expect(page.locator('#klokke-lag')).toHaveClass(/skjult/);
  });
});
