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
      adressetjenesten. De prøver står i proev-levering-valideret.sql.
      Her måles kun, hvad gæsten SER og kan komme til.

   ⚠️ ADRESSETJENESTEN OG VALIDERINGEN ER MOCKET. Prøven må ikke
      afhænge af, at tjenesten svarer — og den må slet ikke skrive
      rigtige kvitteringer.
   ⚠️⚠️ OG EN MOCK ER IKKE TJENESTEN (9/10). Indtil i dag efterlignede
      filen DAWA — og bestod, mens DAWA var lukket (1/10) og ingen
      gæst kunne bestille levering. Svarformen her er Adressevælgers,
      MÅLT mod det levende API 9/10:
      { status: "ok", fund: [{ type, id, titel, … }] }.
      Serverens halvdel prøves mod gemte, målte svar i
      tests/adressevaelger.spec.js.
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

  await page.route('https://adressevaelger.dk/**', (r) => {
    t.forslag++;
    t.sidsteSoeg = r.request().url();
    const q = decodeURIComponent(r.request().url());
    if (o.soegNede) return r.abort('failed');
    const fund = /Havn/i.test(q)
      ? [{ type: 'adresse', id: '5d4b049b-1e0e-447f-abdf-62c79a92a5cc',
           titel: 'Havnevej 20, 2670 Greve' },
         { type: 'adresse', id: '11111111-2222-3333-4444-555555555555',
           titel: 'Havnevej 22, 2670 Greve' }]
      : [];
    return r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(adv(fund)) });
  });

  await page.route(SKY + '/functions/v1/valider-levering', async (r) => {
    t.valideringer++;
    const krop = JSON.parse(r.request().postData() || '{}');
    t.sidsteId = krop.adresseId;
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

/* Adressevælgers svarform, målt 9/10. */
function adv(fund) { return { status: 'ok', beskrivelse: '', fund }; }

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

  test('under tre tegn spørges adressetjenesten slet ikke', async ({ page }) => {
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
    expect(t.sidsteId, 'serveren fik ikke adressens ID')
      .toBe('5d4b049b-1e0e-447f-abdf-62c79a92a5cc');
    await expect(page.locator('#lev-svar')).toContainText('Vi leverer til denne adresse');
  });

  /* ⚠️ INGEN AUTOMATISK ACCEPT. Er der kun ét forslag, vælges det
     ikke af sig selv — et valg, hun aldrig foretog, er en levering
     til den forkerte dør. */
  test('et enkelt forslag vælges ikke af sig selv', async ({ page }) => {
    const t = await åbnMedSky(page);
    await page.route('https://adressevaelger.dk/**', (r) => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(adv([{ type: 'adresse', titel: 'Havnevej 20, 2670 Greve',
        id: '5d4b049b-1e0e-447f-abdf-62c79a92a5cc' }])),
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

  /* ⚠️ AUTOCOMPLETE MÅ FEJLE BLØDT — MEN IKKE TAVST (9/10). Siden må
     ikke gå i stykker, og gæsten må ikke møde en teknisk fejl. Men
     da DAWA lukkede, lukkede listen sig bare: gæsten fik intet at
     vide og ingen vej videre. Nu siger feltet det — og hvad hun så
     kan gøre. Prøven bestod før med den tavse udgave; den kræver
     nu sætningen. */
  test('svarer adressetjenesten ikke, siger feltet det — uden at vælte', async ({ page }) => {
    const fejl = [];
    page.on('pageerror', (e) => fejl.push(e.message));
    await åbnMedSky(page, { soegNede: true });
    await skrivAdresse(page, 'Havnevej 20');
    await page.waitForTimeout(700);
    await expect(page.locator('.adr-liste')).toBeHidden();
    await expect(page.locator('#lev-svar')).toContainText('Vi kan ikke slå adresser op lige nu');
    await expect(page.locator('#lev-svar')).toContainText('ring til os');
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

/* ============================================================
   ADRESSEN DELT OP — OG AFVIST PÅ POSTNUMMERET  (21/9)
   ------------------------------------------------------------
   Ejerens egne ord: *"opdelt — adresse, vej, nummer, postnummer
   — og så skal det tjekkes i databasen. Leverer vi der, okay, de
   kan bestille; hvis ikke, er det uden for de områder vi kører,
   så kan de ikke bestille og får en afvisning. Og det kan ske ud
   fra postnummeret og afvise af sig selv."*
   ============================================================ */
test.describe('Adressen delt op', () => {

  /* Et fund med postnummeret i titlen — som det rigtige API skriver
     det ("Nylandsvej 43, 2690 Karlslunde"). Feltet læser det derfra. */
  async function medPostnr(page, postnr, id) {
    await page.route('https://adressevaelger.dk/**', (r) => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(adv([{
        type: 'adresse', titel: 'Prøvevej 1, ' + postnr + ' Byen',
        id: id || '5d4b049b-1e0e-447f-abdf-62c79a92a5cc',
      }])),
    }));
  }

  test('et postnummer uden for ruten afvises UDEN at spørge serveren', async ({ page }) => {
    /* ⚠️ TALLET KOMMER UDEFRA: 9000 står ikke i kulissens
       leverings_postnr, og 2670 gør. Prøven måler altså mod
       ejerens egen liste, ikke mod en liste skrevet her. */
    const d = medLevering();
    d.indstillinger.leverings_postnr = [2670, 2690];
    const t = await åbnMedSky(page, { data: d });
    await medPostnr(page, 9000);

    await page.locator('[data-seg="how"] button:has-text("Levering")').click();
    await page.locator('#fadr').fill('Prøvevej 1');
    await page.locator('.adr-liste .adr-forslag').first().click();
    await page.waitForTimeout(500);

    await expect(page.locator('.adr-status'), 'gæsten fik ingen afvisning')
      .toContainText('9000');
    /* ⚠️ DET ER HELE POINTEN: serveren blev ALDRIG spurgt.
       Bestod prøven uden den her linje, kunne afvisningen komme
       fra serveren — og så var intet blevet hurtigere. */
    expect(t.valideringer, 'serveren blev spurgt om et postnummer, vi aldrig kører til')
      .toBe(0);
    await expect(page.locator('.adr-dele')).toBeHidden();
  });

  test('et postnummer PÅ listen spørges stadig hos serveren', async ({ page }) => {
    /* ⚠️ MODSTYKKET. Et postnummer på listen betyder ikke, at vi
       kører derhen: zonen er geografisk, og et postnummer kan
       ligge halvt inde og halvt ude. Afgjorde feltet det selv,
       havde vi to dommere. */
    const d = medLevering();
    d.indstillinger.leverings_postnr = [2670, 2690];
    const t = await åbnMedSky(page, { data: d });
    await medPostnr(page, 2670);

    await page.locator('[data-seg="how"] button:has-text("Levering")').click();
    await page.locator('#fadr').fill('Prøvevej 1');
    await page.locator('.adr-liste .adr-forslag').first().click();
    await page.waitForTimeout(700);

    expect(t.valideringer, 'serveren blev sprunget over på et gyldigt postnummer')
      .toBe(1);
  });

  test('ved et ja står adressen delt op — med SERVERENS felter', async ({ page }) => {
    const t = await åbnMedSky(page);
    /* Serveren svarer med delene; browseren deler ikke selv op. */
    t.svar = {
      gyldig: true, leveres: true, token: 'TOKEN-123',
      adresse: 'Mosede Strandvej 25, 2. th, 2670 Greve',
      vejnavn: 'Mosede Strandvej', husnr: '25',
      etage: '2', doer: 'th', postnr: '2670', by: 'Greve',
    };
    await page.locator('[data-seg="how"] button:has-text("Levering")').click();
    await page.locator('#fadr').fill('Havnevej');
    await page.locator('.adr-liste .adr-forslag').first().click();
    await page.waitForTimeout(700);

    const dele = page.locator('.adr-dele');
    await expect(dele).toBeVisible();
    await expect(dele).toContainText('Mosede Strandvej');
    await expect(dele).toContainText('25');
    await expect(dele).toContainText('2670 Greve');
    /* Etage og dør er sat, så de skal stå — men KUN når de er der.
       Se prøven nedenfor. */
    await expect(dele).toContainText('2, th');
  });

  test('en adresse uden etage får ingen tom etage-linje', async ({ page }) => {
    /* Et mærket felt uden værdi er en påstand om, at noget
       mangler — og de fleste adresser har hverken etage eller dør. */
    const t = await åbnMedSky(page);
    t.svar = {
      gyldig: true, leveres: true, token: 'TOKEN-123',
      adresse: 'Havnevej 20, 2670 Greve',
      vejnavn: 'Havnevej', husnr: '20',
      etage: null, doer: null, postnr: '2670', by: 'Greve',
    };
    await page.locator('[data-seg="how"] button:has-text("Levering")').click();
    await page.locator('#fadr').fill('Havnevej');
    await page.locator('.adr-liste .adr-forslag').first().click();
    await page.waitForTimeout(700);

    await expect(page.locator('.adr-dele')).toBeVisible();
    await expect(page.locator('.adr-dele'), 'tom etage-linje står frem')
      .not.toContainText('Etage');
  });

  test('rettes adressen efter valget, forsvinder opdelingen', async ({ page }) => {
    /* En opdeling, der bliver stående, påstår noget om det, der
       stod FØR rettelsen — og gæsten tror, hun stadig er godkendt. */
    const t = await åbnMedSky(page);
    t.svar = {
      gyldig: true, leveres: true, token: 'TOKEN-123',
      adresse: 'Havnevej 20, 2670 Greve', vejnavn: 'Havnevej',
      husnr: '20', postnr: '2670', by: 'Greve',
    };
    await page.locator('[data-seg="how"] button:has-text("Levering")').click();
    await page.locator('#fadr').fill('Havnevej');
    await page.locator('.adr-liste .adr-forslag').first().click();
    await page.waitForTimeout(700);
    await expect(page.locator('.adr-dele')).toBeVisible();

    await page.locator('#fadr').press('End');
    await page.locator('#fadr').press('Backspace');
    await page.waitForTimeout(400);
    await expect(page.locator('.adr-dele'),
      'opdelingen stod stadig efter en rettelse').toBeHidden();
  });
});

/* ============================================================
   ADRESSEVÆLGER  (9. okt 2026)
   ------------------------------------------------------------
   DAWA lukkede 1/10. Afløseren svarer anderledes — målt 9/10:
     · token er obligatorisk
     · fundene er vej, vej-i-postnummer, husnummer eller adresse;
       kun en ADRESSE kan vælges, de andre indsnævrer
     · fundene er sorteret efter POSTNUMMER, ikke relevans
   ============================================================ */
test.describe('Adressevælger', () => {
  async function skrivAdresse(page, tekst) {
    await page.locator(LEVERING).click();
    await page.locator('#fadr').fill(tekst);
    return page.locator('.adr-liste .adr-forslag');
  }

  /* ⚠️ PRØVEN LÆSER DEN RIGTIGE ADRESSE, koden kalder — ikke koden
     selv. Et blik i kildeteksten ville bestå, også hvis parameteren
     blev skrevet et sted, der aldrig sendes. */
  test('opslaget går til Adressevælger med nøgle — ikke demonøglen, ikke foreløbige', async ({ page }) => {
    const t = await åbnMedSky(page);
    await skrivAdresse(page, 'Havnevej');
    await expect.poll(() => t.sidsteSoeg || '').toContain('adressevaelger.dk/adresser/soeg');
    const u = new URL(t.sidsteSoeg);
    expect(u.searchParams.get('tekst')).toBe('Havnevej');
    expect((u.searchParams.get('token') || '').length,
      'uden en nøgle på mindst 10 tegn svarer tjenesten 400').toBeGreaterThanOrEqual(10);
    expect(u.searchParams.get('token'), 'den fælles demonøgle må ikke bruges i drift')
      .not.toBe('adressevaelger123');
    expect(u.searchParams.get('medtagForeloebige'),
      'foreløbige adresser kan serveren ikke godkende').toBeNull();
  });

  /* ⚠️ TJENESTEN SORTERER EFTER POSTNUMMER. Målt 9/10: "Strandvejen
     10" giver 40 fund fra 2100 og opefter; Køge (4600) er ikke blandt
     de første seks. TALLET KOMMER UDEFRA: 4600 står i kulissens
     leverings_postnr — ejerens liste — ikke i prøven. */
  test('leveringens egne postnumre står øverst', async ({ page }) => {
    const d = medLevering();
    d.indstillinger.leverings_postnr = [2670, 2690, 4600];
    await åbnMedSky(page, { data: d });
    const fund = ['2100 København Ø', '3220 Tisvildeleje', '3740 Svaneke',
      '4000 Roskilde', '4040 Jyllinge', '4180 Sorø', '4520 Svinninge',
      '4600 Køge'].map((p, i) => ({ type: 'adresse', titel: 'Strandvejen 10, ' + p,
      id: '00000000-0000-0000-0000-00000000000' + i }));
    await page.route('https://adressevaelger.dk/**', (r) => r.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(adv(fund)) }));
    const forslag = await skrivAdresse(page, 'Strandvejen 10');
    await expect(forslag).toHaveCount(6);
    await expect(forslag.first()).toHaveText('Strandvejen 10, 4600 Køge');
    // Resten står i tjenestens egen rækkefølge
    await expect(forslag.nth(1)).toHaveText('Strandvejen 10, 2100 København Ø');
  });

  /* ⚠️ HUSNUMMERET SKAL STÅ LIGE EFTER VEJNAVNET. Målt 9/10:
     "Nylandsvej 2690 Karlslunde 43" finder ikke nr. 43;
     "Nylandsvej 43, 2690 Karlslunde" gør. Mikkels eksempel. */
  test('en vej i et postnummer indsnævrer — markøren står klar til husnummeret', async ({ page }) => {
    const t = await åbnMedSky(page);
    await page.route('https://adressevaelger.dk/**', (r) => {
      const q = new URL(r.request().url()).searchParams.get('tekst') || '';
      const fund = /2690/.test(q)
        ? [1, 2, 3, 43].map((n) => ({ type: 'adresse', titel: 'Nylandsvej ' + n + ', 2690 Karlslunde',
            id: '0a3f50ab-1317-32b8-e044-0003ba2980' + String(10 + n) }))
        : [{ type: 'navngivenvejpostnummer', id: '46ddc0e8-12b2-4bbd-9bc9-4bbe2ba65f6c',
             titel: 'Nylandsvej 2690 Karlslunde', vejnavn: 'Nylandsvej', postnr: '2690',
             postdistrikt: 'Karlslunde', antal_husnumre: 76 }];
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adv(fund)) });
    });
    const forslag = await skrivAdresse(page, 'Nylandsvej');
    await expect(forslag).toHaveCount(1);
    await forslag.first().click();
    await expect(page.locator('#fadr')).toHaveValue('Nylandsvej , 2690 Karlslunde');
    expect(await page.locator('#fadr').evaluate((f) => f.selectionStart)).toBe('Nylandsvej '.length);
    // Vejens adresser står klar — og intet er valgt eller sendt til serveren endnu
    await expect(page.locator('.adr-liste .adr-forslag')).toHaveCount(4);
    expect(t.valideringer, 'en vej blev sendt til serveren som en adresse').toBe(0);
    await page.locator('.adr-liste .adr-forslag', { hasText: 'Nylandsvej 43' }).click();
    await expect(page.locator('#fadr')).toHaveValue('Nylandsvej 43, 2690 Karlslunde');
    await expect.poll(() => t.valideringer).toBe(1);
  });

  test('et husnummer med lejligheder viser etagerne i stedet for at blive valgt', async ({ page }) => {
    const t = await åbnMedSky(page);
    await page.route('https://adressevaelger.dk/**', (r) => {
      const q = new URL(r.request().url()).searchParams.get('tekst') || '';
      const fund = /2670 Greve/.test(q)
        ? ['', ', st. 1', ', 1.'].map((e, i) => ({ type: 'adresse',
            titel: 'Greve Strandvej 10' + e + ', 2670 Greve', id: '00000000-0000-0000-0000-0000000000a' + i }))
        : [{ type: 'husnummer', id: '0a3f5081-2297-32b8-e044-0003ba298018',
             titel: 'Greve Strandvej 10, 2670 Greve', vejnavn: 'Greve Strandvej', husnummer: '10' }];
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adv(fund)) });
    });
    const forslag = await skrivAdresse(page, 'Greve Strandvej 10');
    await forslag.first().click();
    await expect(page.locator('.adr-liste .adr-forslag')).toHaveCount(3);
    await expect(page.locator('.adr-liste .adr-forslag').nth(2)).toHaveText('Greve Strandvej 10, 1., 2670 Greve');
    expect(t.valideringer).toBe(0);
  });
});
