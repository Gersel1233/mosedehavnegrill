/* ============================================================
   LEVERINGENS TID: KØKKENET + KØRETUREN  (8. okt 2026)
   ------------------------------------------------------------
   Mikkels ord: *"når levering er der, der skal være noget in
   advance så de kan bestille til xx:xx så caféen kan nå det … nok
   sådan 30 min … hvis de bor i Karlslunde er det typisk 10-15
   minutter til kunden får maden, hvis det er Køge kan det godt være
   30 min, det samme med Tune og 20 min til Greve … det skal give
   mening"*.

   ⚠️ TALLENE I PRØVERNE ER MIKKELS, IKKE REGLENS. 30 i køkkenet, 15 til
      Karlslunde, 30 til Køge — og uret står kl. 13.00. De tidligste
      tider (13.30 / 13.45 / 14.00) er regnet i hånden ud fra dem; en
      prøve, der spurgte reglen om facit, ville måle sig selv.

   Databasens halvdel står i supabase/proev-levering-tid-8-10.sql.
   ============================================================ */

const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, åbnAdmin, grunddata, gemteData, visFane, sætUr, sætData, lokalTilstand } = require('./hjaelp');

const SKY = 'https://db.eksempel.test';
const LEVERING = '[data-seg="how"] button:has-text("Levering")';
const TOGO = '[data-seg="how"] button:has-text("To-go")';

/* Mikkels tal. */
const TIDER = {
  varsel_min_togo: 30,
  varsel_min_levering: 30,
  leverings_koeretid: { 2690: 15, 2670: 20, 4030: 30, 4600: 30 },
};

function medLevering(ekstra) {
  const d = grunddata();
  Object.assign(d.indstillinger, { levering: true, spis_her: true, ...TIDER }, ekstra || {});
  return d;
}

/* Forsiden med en sky-adresse, så adressefeltet kobler sig på — DAWA og
   valideringen i snor, som i tests/adressefelt.spec.js. Serverens svar
   (postnummeret!) er prøvens eget. */
async function forsiden(page, svar, d) {
  await lokalTilstand(page);
  await page.route('**/js/config.js*', (r) => r.fulfill({
    status: 200, contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD = { url: '" + SKY + "', anonKey: 'proeve' };",
  }));
  const data = d || medLevering();
  await page.route(SKY + '/rest/v1/**', (r) => {
    const tabel = new URL(r.request().url()).pathname.replace('/rest/v1/', '').split('?')[0];
    let krop = data[tabel];
    if (tabel === 'indstillinger') {
      krop = Object.keys(data.indstillinger || {}).map((n) => ({
        lokation_id: 'mosede', noegle: n, vaerdi: data.indstillinger[n],
      }));
    }
    return r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(Array.isArray(krop) ? krop : []) });
  });
  await page.route('https://api.dataforsyningen.dk/**', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ tekst: svar.adresse, adresse: { id: 'id-' + svar.postnr } }]),
  }));
  await page.route(SKY + '/functions/v1/valider-levering', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ gyldig: true, leveres: true, token: 'TOKEN-' + svar.postnr, ...svar }),
  }));
  await sætUr(page, '2026-08-07T11:00:00Z');            // kl. 13.00 dansk tid
  await sætData(page, data);
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.evaluate(() => { const i = document.getElementById('intro'); if (i) i.remove(); });
}

async function vælgAdresse(page, tekst) {
  await page.locator('#fadr').fill(tekst.slice(0, 8));
  await page.locator('.adr-liste .adr-forslag').first().click();
  await expect(page.locator('#lev-svar')).toContainText('Vi leverer');
}

const førsteTid = (page, sel) => page.locator(sel + ' option:not([disabled])').first();

const KARLSLUNDE = { adresse: 'Karlslunde Strandvej 10, 2690 Karlslunde', postnr: '2690', by: 'Karlslunde' };
const KØGE = { adresse: 'Torvet 1, 4600 Køge', postnr: '4600', by: 'Køge' };

test.describe('Leveringens tid — reglen', () => {
  test('køkkenets 30 + køreturen pr. postnummer; uden tal den længste', async ({ page }) => {
    await åbn(page, '/index.html', { data: medLevering() });
    const svar = await page.evaluate((tider) => {
      const R = window.MosedeRegler;
      const d = { indstillinger: { ...tider } };
      const t = (p) => R.leveringsTid(d, p);
      return {
        karlslunde: t('2690'), greve: t('2670'), tune: t('4030'), koege: t('4600'),
        ishoej: t('2635'),
        udenTabel: R.leveringsTid({ indstillinger: { varsel_min_togo: 30, varsel_min_levering: 30 } }, '2690'),
        udenKoekken: R.leveringsTid({ indstillinger: { varsel_min_togo: 25, leverings_koeretid: { 2690: 15 } } }, '2690'),
      };
    }, TIDER);
    expect(svar.karlslunde).toMatchObject({ koekken: 30, koeretid: 15, ialt: 45, kendt: true });
    expect(svar.greve.ialt).toBe(50);
    expect(svar.tune.ialt).toBe(60);
    expect(svar.koege.ialt).toBe(60);
    // Ishøj har intet tal endnu → den længste køretid, og det siges ikke som "ca."
    expect(svar.ishoej).toMatchObject({ koeretid: 30, ialt: 60, kendt: false });
    // Ingen køretider → køkkenet alene
    expect(svar.udenTabel).toMatchObject({ koeretid: 0, ialt: 30 });
    // Intet køkkental → to-go'ens
    expect(svar.udenKoekken.koekken).toBe(25);
  });

  test('varslet: kun en levering får køreturen, og en længere kategori vinder', async ({ page }) => {
    await åbn(page, '/index.html', { data: medLevering() });
    const v = await page.evaluate((tider) => {
      const R = window.MosedeRegler;
      const d = { indstillinger: { ...tider, kategori_tider: { 1: { varsel_min: 60 } } },
        menu_kategorier: [{ id: 1, navn: 'Smørrebrød', aktiv: true }, { id: 2, navn: 'Burgere', aktiv: true }] };
      R.saetLeveringsAdresse(d, 'Karlslunde Strandvej 10, 2690 Karlslunde');
      return {
        afhentning: R.mindsteVarsel(d, [2], 'togo'),
        levering: R.mindsteVarsel(d, [2], 'levering'),
        smoerLevering: R.mindsteVarsel(d, [1], 'levering'),
        udenKategori: R.mindsteVarsel(d, [], 'levering'),
      };
    }, TIDER);
    expect(v.afhentning).toBe(30);
    expect(v.levering).toBe(45);          // 30 + 15
    expect(v.smoerLevering).toBe(75);     // smørrebrødets 60 + 15
    expect(v.udenKategori).toBe(45);      // dagens ret: køkkenet + køreturen
  });

  /* ⚠️ BAGFRA. Et husnummer kan have fire cifre; postnummeret er det, der
     står foran byen til sidst. Første udgave tog det første firecifrede tal. */
  test('postnummeret læses bagfra — et firecifret husnummer snyder ikke', async ({ page }) => {
    await åbn(page, '/index.html', { data: medLevering() });
    const a = await page.evaluate(() => [
      window.MosedeRegler.postnrAf('Strandvejen 1000, 2690 Karlslunde'),
      window.MosedeRegler.postnrAf('Havnevej 20, 1. tv, 2670 Greve'),
      window.MosedeRegler.postnrAf('Havnevej 20 2670 Greve'),
      window.MosedeRegler.postnrAf('Havnevej'),
    ]);
    expect(a[0]).toEqual({ postnr: '2690', by: 'Karlslunde' });
    expect(a[1]).toEqual({ postnr: '2670', by: 'Greve' });
    expect(a[2]).toEqual({ postnr: '2670', by: 'Greve' });
    expect(a[3]).toBeNull();
  });
});

test.describe('Leveringens tid — forsiden', () => {
  test('den tidligste tid følger adressen: 14.00 uden, 13.45 til Karlslunde, 13.30 to-go', async ({ page }) => {
    await forsiden(page, KARLSLUNDE);
    await page.locator(TOGO).click();
    await expect(førsteTid(page, '#tid')).toHaveText('kl. 13.30');   // 13.00 + 30
    await expect(page.locator('.lev-tid')).toBeHidden();

    await page.locator(LEVERING).click();
    // Før adressen: den længste køretid — hellere for sent end en bil, der ikke når det
    await expect(førsteTid(page, '#tid')).toHaveText('kl. 14.00');   // 13.00 + 30 + 30
    await expect(page.locator('.lev-tid')).toBeVisible();
    await expect(page.locator('.lev-tid')).toContainText('Vælg adressen');

    await vælgAdresse(page, KARLSLUNDE.adresse);
    await expect(førsteTid(page, '#tid')).toHaveText('kl. 13.45');   // 13.00 + 30 + 15
    await expect(page.locator('.lev-tid')).toContainText('ca. 45 min.');
    await expect(page.locator('.lev-tid')).toContainText('Karlslunde');

    await page.locator(TOGO).click();
    await expect(førsteTid(page, '#tid')).toHaveText('kl. 13.30');
    await expect(page.locator('.lev-tid')).toBeHidden();
  });

  test('Køge får sine 30 minutter ud', async ({ page }) => {
    await forsiden(page, KØGE);
    await page.locator(LEVERING).click();
    await vælgAdresse(page, KØGE.adresse);
    await expect(førsteTid(page, '#tid')).toHaveText('kl. 14.00');
    await expect(page.locator('.lev-tid')).toContainText('ca. 30 min. ud til Køge');
  });
});

test.describe('Leveringens tid — bestil/ og tapas', () => {
  test('bestil/: linjen står under tiden, når der leveres — og tiderne flytter sig', async ({ page }) => {
    const d = medLevering({ bestilling_varsel_timer: 0 });
    await åbn(page, '/bestil/', { data: d });
    const tid = page.locator('#bestil-tid');
    await expect(førsteTid(page, '#bestil-tid')).toHaveText(/13\.30/);
    await expect(page.locator('#bestil-tid ~ .lev-tid')).toHaveCount(0);

    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await expect(page.locator('.lev-tid')).toBeVisible();
    await expect(førsteTid(page, '#bestil-tid')).toHaveText(/14\.00/);
    await page.locator('#bestil-adresse').fill('Karlslunde Strandvej 10, 2690 Karlslunde');
    await page.locator('#bestil-adresse').blur();
    await expect(førsteTid(page, '#bestil-tid')).toHaveText(/13\.45/);
    await expect(page.locator('.lev-tid')).toContainText('ca. 15 min. ud til Karlslunde');
    await expect(tid).toBeVisible();
  });

  test('tapas: linjen følger Levering og adressen', async ({ page }) => {
    const d = medLevering({ leverings_gebyr: 79, leverings_postnr: [2670, 2690, 4030, 4600] });
    d.menu_kategorier.push({ id: 20, afdeling: 'mad', navn: 'Til selskabet', sortering: 30, aktiv: true });
    d.menu_varer.push({ id: 20, kategori_id: 20, navn: 'Tapasfad, pr. person', beskrivelse: null,
      pris: 145, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true });
    await åbnSkal(page, '/m-tapas.html', { ur: '2026-08-07T11:00:00Z', data: d });
    await expect(page.locator('#bestil-tapas .lev-tid')).toHaveCount(0);
    await page.locator('#thow').selectOption('levering');
    await expect(page.locator('#bestil-tapas .lev-tid')).toBeVisible();
    await expect(page.locator('#bestil-tapas .lev-tid')).toContainText('Vælg adressen');
    await page.locator('#tadr').fill('Torvet 1, 4600 Køge');
    await page.locator('#tadr').blur();
    await expect(page.locator('#bestil-tapas .lev-tid')).toContainText('ca. 30 min. ud til Køge');
    await page.locator('#thow').selectOption({ index: 0 });
    await expect(page.locator('#bestil-tapas .lev-tid')).toBeHidden();
  });
});

test.describe('Leveringens tid — admin', () => {
  /* Uret i åbnAdmin står fredag 7. august kl. 13.00. */
  function levering(id, tid, navn, adresse) {
    return {
      id, lokation_id: 'mosede', reference: 'SM-L-' + id, navn,
      telefon: '2030405' + id, email: null, hent_dato: '2026-08-07', hent_tid: tid,
      linjer: [{ navn: 'Burger', antal: 1, pris: 95 }], fyld: [], antal: 1,
      besked: null, status: 'bekraeftet', hvordan: 'levering',
      leverings_adresse: adresse, intern_note: null, slettet: null,
      oprettet: '2026-08-07T09:00:00Z',
    };
  }
  function medLeveringer(ekstra) {
    const d = medLevering(ekstra);
    d.bestillinger = [
      levering(1, '14:00', 'Kim Køge', 'Torvet 1, 4600 Køge'),
      levering(2, '15:30', 'Lis Karlslunde', 'Strandvejen 1000, 2690 Karlslunde'),
      levering(3, '16:00', 'Ib Ishøj', 'Vejlebrovej 5, 2635 Ishøj'),
    ];
    return d;
  }
  const afgang = (page, navn) => page.locator('.bestil-kort', { hasText: navn })
    .locator('.bestil-levering-afgang');

  /* Bilen kører senest køreturen FØR den tid, gæsten valgte — med den
     SAMME køretid, gæsten fik lovet. */
  test('kortet siger, hvornår bilen senest skal køre', async ({ page }) => {
    await åbnAdmin(page, { data: medLeveringer() });
    await visFane(page, 'p-bestillinger');
    await expect(afgang(page, 'Kim Køge')).toHaveText('🚗 Kører senest kl. 13.30 · ca. 30 min. ud til Køge');
    // Det firecifrede husnummer (1000) er ikke postnummeret
    await expect(afgang(page, 'Lis Karlslunde')).toHaveText('🚗 Kører senest kl. 15.15 · ca. 15 min. ud til Karlslunde');
    // Ishøj har intet tal endnu: den længste, og det siges som "op til"
    await expect(afgang(page, 'Ib Ishøj')).toHaveText('🚗 Kører senest kl. 15.30 · op til 30 min. ud');
  });

  test('uden køretider står der ingen afgangstid', async ({ page }) => {
    await åbnAdmin(page, { data: medLeveringer({ leverings_koeretid: {} }) });
    await visFane(page, 'p-bestillinger');
    await expect(page.locator('.bestil-kort', { hasText: 'Kim Køge' }).locator('.bestil-levering'))
      .toHaveCount(1);
    await expect(page.locator('.bestil-levering-afgang')).toHaveCount(0);
  });

  test('Åbningstider → Levering: køkkenets tid og én køretid pr. postnummer gemmes', async ({ page }) => {
    const d = medLevering({ leverings_postnr: [2635, 2670, 2690, 4030, 4600] });
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-tider');
    await expect(page.locator('#levering-varsel')).toHaveValue('30');
    const felt = (p) => page.locator('#levering-koeretid input[data-postnr="' + p + '"]');
    await expect(page.locator('#levering-koeretid input[data-postnr]')).toHaveCount(5);
    await expect(felt('2690')).toHaveValue('15');
    await expect(felt('2635')).toHaveValue('');      // Ishøj: intet tal endnu

    await felt('2635').fill('25');
    await felt('2690').fill('12');
    await page.locator('#levering-varsel').fill('35');
    await page.locator('#gem-levering').click();
    await expect.poll(async () => (await gemteData(page)).indstillinger.leverings_koeretid)
      .toEqual({ 2635: 25, 2670: 20, 2690: 12, 4030: 30, 4600: 30 });
    expect((await gemteData(page)).indstillinger.varsel_min_levering).toBe(35);
  });

  test('en køretid, der ikke er et helt antal minutter, gemmes ikke', async ({ page }) => {
    await åbnAdmin(page, { data: medLevering() });
    await visFane(page, 'p-tider');
    await page.locator('#levering-koeretid input[data-postnr="4600"]').fill('en halv time');
    await page.locator('#gem-levering').click();
    await expect(page.locator('#fejl')).toContainText('Køretiden til 4600');
    expect((await gemteData(page)).indstillinger.leverings_koeretid['4600'] ?? 30).toBe(30);
  });
});
