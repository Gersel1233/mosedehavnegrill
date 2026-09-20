/* ============================================================
   ADRESSEFELTET OG LEVERINGEN PÅ FORSIDEN  (20. sep 2026)
   ------------------------------------------------------------
   Ejernes punkt nummer ét: *"Leverings muligheden mangler."*
   Målt 20/9: indstillingen var slået TIL, gebyret sat til 79 og de
   syv postnumre skrevet — men forsiden spurgte kun "To-go eller
   Spis her". Levering fandtes kun på smørrebrødssiden og i bestil/,
   så en burger, en is eller grillmad kunne slet ikke køres ud.

   ⚠️ FELTET ER HØFLIGHED, IKKE SIKKERHED. Den rigtige spærring
      ligger i databasen (supabase/levering-valideret.sql), som
      OVERSKRIVER adressen med den, serveren har bekræftet hos
      Dataforsyningen. De prøver står i proev-levering-valideret.sql.
      Her måles kun, hvad gæsten SER og kan komme til.

   ⚠️ DAWA OG VALIDERINGEN ER MOCKET. Prøven må ikke afhænge af, at
      Dataforsyningen svarer — og den må slet ikke skrive rigtige
      kvitteringer. Svarformen er den MÅLTE fra 20/9:
      [{ tekst, adresse: { id } }].
   ============================================================ */

const { test, expect } = require('@playwright/test');
const { grunddata, sætUr, sætData, lokalTilstand } = require('./hjaelp');

const SKY = 'https://db.eksempel.test';

/* Forsiden med en sky-adresse, så adressefeltet kobler sig på —
   og med DAWA og valideringen i snor. */
async function åbnMedSky(page, valg) {
  const o = valg || {};
  const t = { forslag: 0, valideringer: 0, sidsteId: null, svar: o.svar || null };

  await lokalTilstand(page);
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**/js/config.js*', (r) => r.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD = { url: '" + SKY + "', anonKey: 'proeve' };",
  }));

  /* ⚠️ MED EN SKY-ADRESSE HENTER SIDEN FRA NETTET, ikke fra
     localStorage. Første udgave af prøven svarede tomt på alle
     tabeller — og så var leveringen slået fra, fordi indstillingerne
     aldrig kom med, og knappen var væk af en helt anden grund end
     den, prøven målte. Nu svarer mocken med de SAMME data, som
     øvetilstanden ville have brugt.

     ⚠️ indstillinger er en TABEL i databasen og et OBJEKT i
     prøvedataene. Butik.hent laver rækkerne om til et objekt, så
     her skal vejen tilbage gås. */
  const d = o.data || medLevering();
  await page.route(SKY + '/rest/v1/**', (r) => {
    const sti = new URL(r.request().url()).pathname;
    const tabel = sti.replace('/rest/v1/', '').split('?')[0];
    let krop = d[tabel];
    if (tabel === 'indstillinger') {
      krop = Object.keys(d.indstillinger || {}).map((n) => ({
        lokation_id: 'mosede', noegle: n, vaerdi: d.indstillinger[n],
      }));
    }
    return r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(Array.isArray(krop) ? krop : []),
    });
  });

  await page.route('https://api.dataforsyningen.dk/**', (r) => {
    t.forslag++;
    const q = decodeURIComponent(r.request().url());
    if (o.dawaNede) return r.abort('failed');
    const svar = /Havn/i.test(q)
      ? [{ tekst: 'Havnevej 20, 2670 Greve',
           adresse: { id: '5d4b049b-1e0e-447f-abdf-62c79a92a5cc' } },
         { tekst: 'Havnevej 22, 2670 Greve',
           adresse: { id: '11111111-2222-3333-4444-555555555555' } }]
      : [];
    return r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(svar) });
  });

  await page.route(SKY + '/functions/v1/valider-levering', async (r) => {
    t.valideringer++;
    const krop = JSON.parse(r.request().postData() || '{}');
    t.sidsteId = krop.dawaId;
    if (o.valideringNede) return r.abort('failed');
    return r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(t.svar || {
        gyldig: true, leveres: true, token: 'TOKEN-123',
        adresse: 'Havnevej 20, 2670 Greve', postnr: '2670', by: 'Greve',
      }),
    });
  });

  await sætUr(page, '2026-08-07T11:00:00Z');
  await sætData(page, d);
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.evaluate(() => { const i = document.getElementById('intro'); if (i) i.remove(); });
  return t;
}

function medLevering(ændringer) {
  const d = grunddata();
  d.indstillinger.levering = true;
  d.indstillinger.spis_her = true;
  return Object.assign(d, ændringer || {});
}

const LEVERING = '[data-seg="how"] button:has-text("Levering")';

test.describe('Levering på forsiden', () => {

  test('knappen findes, når forretningen leverer', async ({ page }) => {
    await åbnMedSky(page);
    await expect(page.locator(LEVERING),
      'ejernes punkt nummer ét: leveringen mangler på forsiden').toBeVisible();
  });

  /* ⚠️ MODSTYKKET. En knap, der ikke virker, er værre end ingen
     knap: gæsten tror, hun har valgt. Uden den her prøve ville en
     regel, der ALTID viste knappen, bestå den første. */
  test('knappen er væk, når forretningen ikke leverer', async ({ page }) => {
    const d = medLevering();
    d.indstillinger.levering = false;
    await åbnMedSky(page, { data: d });
    await expect(page.locator(LEVERING)).toBeHidden();
  });

  test('adressefeltet folder sig ud, når levering vælges — og væk igen', async ({ page }) => {
    await åbnMedSky(page);
    await expect(page.locator('#flevfelt')).toBeHidden();
    await page.locator(LEVERING).click();
    await expect(page.locator('#flevfelt')).toBeVisible();
    await page.locator('[data-seg="how"] button:has-text("To-go")').click();
    await expect(page.locator('#flevfelt')).toBeHidden();
  });
});

test.describe('Adressefeltet', () => {

  async function skrivAdresse(page, tekst) {
    await page.locator(LEVERING).click();
    await page.locator('#fadr').fill(tekst);
    return page.locator('.adr-liste .adr-forslag');
  }

  test('under tre tegn spørges Dataforsyningen slet ikke', async ({ page }) => {
    const t = await åbnMedSky(page);
    await skrivAdresse(page, 'Ha');
    await page.waitForTimeout(600);
    expect(t.forslag, 'to tegn er støj, ikke en søgning').toBe(0);
    await expect(page.locator('.adr-liste')).toBeHidden();
  });

  test('forslagene vises, og et valg fylder feltet', async ({ page }) => {
    const t = await åbnMedSky(page);
    const forslag = await skrivAdresse(page, 'Havnevej 20');
    await expect(forslag).toHaveCount(2);
    await forslag.first().click();
    await expect(page.locator('#fadr')).toHaveValue('Havnevej 20, 2670 Greve');
    expect(t.sidsteId, 'serveren fik ikke DAWA-ID\'et')
      .toBe('5d4b049b-1e0e-447f-abdf-62c79a92a5cc');
    await expect(page.locator('#lev-svar')).toContainText('Vi leverer til denne adresse');
  });

  /* ⚠️ INGEN AUTOMATISK ACCEPT. Er der kun ét forslag, vælges det
     ikke af sig selv — et valg, hun aldrig foretog, er en levering
     til den forkerte dør. */
  test('et enkelt forslag vælges ikke af sig selv', async ({ page }) => {
    const t = await åbnMedSky(page);
    await page.route('https://api.dataforsyningen.dk/**', (r) => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([{ tekst: 'Havnevej 20, 2670 Greve',
        adresse: { id: '5d4b049b-1e0e-447f-abdf-62c79a92a5cc' } }]),
    }));
    await skrivAdresse(page, 'Havnevej 20');
    await expect(page.locator('.adr-liste .adr-forslag')).toHaveCount(1);
    expect(t.valideringer, 'forslaget blev valgt uden at gæsten pegede').toBe(0);
  });

  /* ⚠️ DEN VIGTIGSTE I FILEN. Vælger hun "Havnevej 20" og retter
     tallet bagefter, er adressen ikke længere den, serveren
     bekræftede — og så må der ikke kunne sendes. */
  test('retter hun ét tegn bagefter, er valget væk igen', async ({ page }) => {
    await åbnMedSky(page);
    const forslag = await skrivAdresse(page, 'Havnevej 20');
    await forslag.first().click();
    await expect(page.locator('#lev-svar')).toContainText('Vi leverer');

    await page.locator('#fadr').fill('Havnevej 2000, 2670 Greve');
    await expect(page.locator('#lev-svar'),
      'et rettet felt gælder stadig som en valgt adresse')
      .toContainText('Vælg din adresse fra forslagene');
  });

  test('uden for området siger den det — og sender ikke', async ({ page }) => {
    await åbnMedSky(page, { svar: {
      gyldig: true, leveres: false, grund: 'UDEN_FOR_OMRAADET',
      adresse: 'Rådhuspladsen 1, 1550 København V',
    } });
    const forslag = await skrivAdresse(page, 'Havnevej 20');
    await forslag.first().click();
    await expect(page.locator('#lev-svar'))
      .toContainText('Vi leverer desværre ikke til denne adresse');
  });

  /* Ejeren skrev selv "længere ude efter aftale", og huset har haft
     svaret siden 1/9. Ordlyden er ORDRET den samme som i
     js/bestilling.js — to formuleringer ville læses som to regler. */
  test('lige uden for kanten peger den på telefonen', async ({ page }) => {
    await åbnMedSky(page, { svar: {
      gyldig: true, leveres: false, grund: 'RING_TIL_OS',
      adresse: 'Et sted i Køge',
    } });
    const forslag = await skrivAdresse(page, 'Havnevej 20');
    await forslag.first().click();
    await expect(page.locator('#lev-svar')).toContainText('Ring til os');
  });

  /* ⚠️ FAIL CLOSED. Svarer valideringen ikke, udstedes ingen
     kvittering — og uden kvittering afviser databasen alligevel.
     Gæsten skal se en dansk sætning, ikke en teknisk fejl. */
  test('svarer serveren ikke, siges det — uden teknisk sprog', async ({ page }) => {
    await åbnMedSky(page, { valideringNede: true });
    const forslag = await skrivAdresse(page, 'Havnevej 20');
    await forslag.first().click();
    await expect(page.locator('#lev-svar'))
      .toContainText('Vi kunne ikke kontrollere leveringsadressen');
  });

  /* ⚠️ AUTOCOMPLETE MÅ FEJLE BLØDT. Kan vi ikke foreslå noget, er
     det ærgerligt — men siden må ikke gå i stykker, og gæsten må
     ikke møde en teknisk fejl midt i en bestilling. */
  test('svarer Dataforsyningen ikke, vælter siden ikke', async ({ page }) => {
    const fejl = [];
    page.on('pageerror', (e) => fejl.push(e.message));
    await åbnMedSky(page, { dawaNede: true });
    await skrivAdresse(page, 'Havnevej 20');
    await page.waitForTimeout(700);
    await expect(page.locator('.adr-liste')).toBeHidden();
    expect(fejl, 'en fejl fra autocomplete nåede ud i siden').toEqual([]);
  });

  test('tastaturet kan vælge: pil ned og retur', async ({ page }) => {
    await åbnMedSky(page);
    await skrivAdresse(page, 'Havnevej 20');
    await expect(page.locator('.adr-liste .adr-forslag')).toHaveCount(2);
    await page.locator('#fadr').press('ArrowDown');
    await page.locator('#fadr').press('ArrowDown');
    await page.locator('#fadr').press('Enter');
    await expect(page.locator('#fadr')).toHaveValue('Havnevej 20, 2670 Greve');
  });

  test('Escape lukker listen', async ({ page }) => {
    await åbnMedSky(page);
    await skrivAdresse(page, 'Havnevej 20');
    await expect(page.locator('.adr-liste')).toBeVisible();
    await page.locator('#fadr').press('Escape');
    await expect(page.locator('.adr-liste')).toBeHidden();
  });

  test('feltet er en combobox, som en skærmlæser kan forstå', async ({ page }) => {
    await åbnMedSky(page);
    await page.locator(LEVERING).click();
    const felt = page.locator('#fadr');
    await expect(felt).toHaveAttribute('role', 'combobox');
    await expect(felt).toHaveAttribute('aria-expanded', 'false');
    await skrivAdresse(page, 'Havnevej 20');
    await expect(felt).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.adr-liste')).toHaveAttribute('role', 'listbox');
    await expect(page.locator('.adr-liste .adr-forslag').first())
      .toHaveAttribute('role', 'option');
  });
});
