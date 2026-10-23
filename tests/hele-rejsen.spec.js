/* ============================================================
   HELE REJSEN — FRA GÆSTENS TRYK TIL PERSONALETS SKÆRM  (23/10)
   ------------------------------------------------------------
   Mikkel: *"alt ende til ende fungerer — også med de nye steder —
   og alt man kan administrere, test lige det hele"*.

   Hver side er prøvet for sig andre steder: gæstens tryk lander i
   databasen (skal-*.spec.js, bord.spec.js …), og admin viser det,
   der ligger i databasen (admin-*.spec.js). Det, ingen prøve gjorde,
   var at sætte de to halvdele SAMMEN: det, en gæst lige har sendt fra
   en af de nye sider, skal stå i den rigtige fane i admin.

   Fremgangsmåden er personalets: gæsten sender fra siden, og admin
   åbnes i en NY fane i den samme browser (øvetilstandens database er
   browserens egen). Navnet, prøven leder efter, er det, prøven selv
   skrev i formularen — et tal udefra, ikke et, siden kunne finde på.

   Uret står fredag 7. august 2026 kl. 13 dansk tid (hjaelp.js),
   undtagen ved bordet, der kører torsdag som ved-bordet.spec.js.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';

/* Admin i en ny fane: localStorage er den samme, og sætDataEngang
   lader det, gæsten lige har sendt, stå. */
async function iAdmin(page, fane, navn, alleDage) {
  const admin = await page.context().newPage();
  await åbnAdmin(admin, { data: grunddata() });
  await visFane(admin, fane);
  /* Bestillinger viser "I dag" fra start; en bestilling til en anden dag står under "Alle dage" */
  if (alleDage) await admin.locator('#' + fane + ' button', { hasText: /^Alle dage$/ }).first().click();
  await expect(admin.locator('#' + fane), navn + ' står ikke i admins fane ' + fane)
    .toContainText(navn, { timeout: 8000 });
  return admin;
}

test.describe('Det, gæsten sender fra de nye sider, står hos personalet', () => {

  test('forsiden: en bestilling står under Bestillinger', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [1, 6, 9];
    d.indstillinger.bestilling_varsel_timer = 2;
    await åbnSkal(page, '/index.html', { ur: FREDAG, data: d });
    await page.locator('[data-kategori="Smørrebrød"]').click();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#navn').fill('Rejse Forside');
    await page.locator('#tlf').fill('28871343');
    await page.locator('#tid').selectOption('17:00');
    await page.locator('button.g.solid.blk').click();
    await expect(page.locator('.kvit-titel')).toContainText('Tak, Rejse');
    await iAdmin(page, 'p-bestillinger', 'Rejse Forside');
  });

  test('smørrebrødssiden: en bestilling står under Bestillinger', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 2;
    d.menu_kategorier = [{ id: 13, afdeling: 'mad', navn: 'Smørrebrød', sortering: 1, aktiv: true }];
    d.menu_varer = ['Rejemad', 'Flæskesteg med surt', 'Dyrlægens natmad', 'Roastbeef med remoulade', 'Leverpostej med baconsvøb']
      .map((n, i) => ({ id: 100 + i, kategori_id: 13, navn: n, beskrivelse: null, pris: 55,
        fremhaevet: false, udsolgt: false, sortering: i + 1, aktiv: true }));
    d.indstillinger.bestilbare_kategorier = [13];
    await åbnSkal(page, '/h-smorrebrod.html', { ur: FREDAG, data: d });
    const fold = page.locator('#bestil .item', { hasText: 'Smørrebrød' }).first();
    const knap = fold.locator('[data-add]');
    await knap.waitFor({ state: 'attached' });
    if ((await knap.textContent()).indexOf('luk') === -1) await fold.click();
    const plus = page.locator('[data-vare="Rejemad"] button[data-d="+"]');
    await plus.waitFor({ state: 'visible' });
    for (let i = 0; i < 10; i++) await plus.click();   // smørrebrødssiden har et mindsteantal
    await page.locator('#snavn').fill('Rejse Smørrebrød');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#ssend').click();
    await expect.poll(async () => ((await gemteData(page)).bestillinger || []).length).toBe(1);
    await iAdmin(page, 'p-bestillinger', 'Rejse Smørrebrød');
  });

  test('tapassiden: fadet står under Bestillinger', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 2;
    d.menu_kategorier.push({ id: 20, afdeling: 'mad', navn: 'Til selskabet', sortering: 30, aktiv: true });
    d.menu_varer.push({ id: 20, kategori_id: 20, navn: 'Tapasfad, pr. person', beskrivelse: null,
      pris: 145, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true });
    await åbnSkal(page, '/m-tapas.html', { ur: FREDAG, data: d });
    await page.locator('#tpers').fill('6');
    await page.locator('#tnavn').fill('Rejse Tapas');
    await page.locator('#ttlf').fill('28871343');
    await page.locator('#tdato').selectOption('2026-08-09');
    await page.locator('#bestil-tapas button.g.solid.blk').click();
    await expect(page.locator('#bestil-tapas h3')).toContainText('Tak, Rejse');
    await iAdmin(page, 'p-bestillinger', 'Rejse Tapas', true);
  });

  test('bordbookingen: bordet står under Borde', async ({ page }) => {
    await åbn(page, '/bord/', { ur: FREDAG, data: grunddata() });
    await page.locator('#bord-antal').fill('4');
    await page.locator('#bord-navn').fill('Rejse Bord');
    await page.locator('#bord-telefon').fill('20304050');
    await page.locator('#bord-send').click();
    await expect(page.locator('#bord-tak')).toBeVisible();
    await iAdmin(page, 'p-borde', 'Rejse Bord');
  });

  test('QR ved bordet: bestillingen står under Bestillinger med bordet', async ({ page }) => {
    const borde = [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 }];
    await åbn(page, '/ved-bordet/?bord=7', { ur: '2026-08-06T11:00:00Z', data: grunddata({ borde }) });
    await page.locator('#bestil-stykker .stk-linje').first().locator('button', { hasText: '+' }).click();
    await page.fill('#bestil-navn', 'Rejse QR');
    await page.fill('#bestil-telefon', '20304050');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();
    const admin = await page.context().newPage();
    await åbnAdmin(admin, { ur: '2026-08-06T11:00:00Z', data: grunddata({ borde }) });
    await visFane(admin, 'p-bestillinger');
    await expect(admin.locator('#p-bestillinger')).toContainText('Rejse QR', { timeout: 8000 });
  });

  test('selskabssiden: forespørgslen står under Forespørgsler', async ({ page }) => {
    await åbn(page, '/h-selskaber.html', { ur: FREDAG, data: grunddata() });
    await page.locator('#panledning').fill('Konfirmation');
    await page.locator('#pdato').fill('2026-10-03');
    await page.locator('#pantal').fill('42');
    await page.locator('#pnavn').fill('Rejse Selskab');
    await page.locator('#ptlf').fill('28871343');
    await page.locator('#pmail').fill('rejse@eksempel.dk');   // selskabet får et tilbud på mail — feltet kræves
    await page.locator('#forespoerg button.g.solid.blk').click();
    await expect(page.locator('#forespoerg h3')).toContainText('Tak, Rejse');
    await iAdmin(page, 'p-forespoergsler', 'Rejse Selskab');
  });

  /* Ejerens ord: "baglokale skal ikke [i Forespørgsler], da det har sin egen fane" */
  test('baglokalet: ønsket står under Baglokalet', async ({ page }) => {
    await åbn(page, '/h-baglokale.html', { ur: FREDAG, data: grunddata() });
    await page.locator('#btid-fra').fill('17:00');
    await page.locator('#btid-til').fill('21:00');
    await page.locator('#bdato').fill('2026-10-04');
    await page.locator('#bnavn').fill('Rejse Baglokale');
    await page.locator('#btlf').fill('28871343');
    await page.locator('#forespoerg button.g.solid.blk').click();
    await expect.poll(async () => ((await gemteData(page)).forespoergsler || []).length).toBe(1);
    await iAdmin(page, 'p-lokale', 'Rejse Baglokale');
  });

  test('frokostordningen: tilbuddet står under Forespørgsler', async ({ page }) => {
    await åbnSkal(page, '/h-frokost.html', { data: grunddata() });
    await expect(page.locator('.lk-dag').first()).toBeVisible();
    await page.locator('#tilbud [data-chips]').nth(1).locator('button', { hasText: 'Fre' }).click();
    await page.locator('#fnavn').fill('Rejse Frokost');
    await page.locator('#ftlf').fill('28871343');
    await page.locator('#fadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#tilbud button.g.solid.blk').click();
    await expect.poll(async () => ((await gemteData(page)).forespoergsler || []).length).toBe(1);
    await iAdmin(page, 'p-forespoergsler', 'Rejse Frokost');
  });

  test('kalenderen: en reservation står under Tilmeldinger', async ({ page }) => {
    const d = grunddata();
    d.kalender = [{ id: 11, lokation_id: 'mosede', type: 'arrangement', dato: '2026-09-05', slut_dato: null,
      titel: 'Fællesspisning på havnen', beskrivelse: 'Langborde.', emoji: null, lukker_kl: null,
      offentlig: true, tilmelding: true, pladser: 40, pris_tekst: null, start_kl: '18:00', slut_kl: null,
      billede: null, kategori: null, sted_id: null, aflyst: false, aflyst_tekst: null, venteliste: false,
      max_pr_tilmelding: null, tilmelding_lukker_timer: null, bord_booking: false, serie: null }];
    d.reservationer = [];
    await åbnSkal(page, '/h-kalender.html', { data: d });
    await page.locator('.evcard, .evtom').first().waitFor({ state: 'attached' });
    const pille = page.locator('#bestil-pill');
    if (await pille.getAttribute('href') === '#reserver') await pille.click();
    await page.fill('#kantal', '3');
    await page.fill('#knavn', 'Rejse Kalender');
    await page.fill('#ktlf', '28871343');
    await page.locator('#reserver button.g.solid.blk').click();
    await expect(page.locator('#reserver h3')).toContainText('Vi ses, Rejse');
    await iAdmin(page, 'p-tilmeldinger', 'Rejse Kalender');
  });
});

/* ============================================================
   OG DET, PERSONALET RETTER I ADMIN, STÅR PÅ SIDERNE
   ------------------------------------------------------------
   Den anden vej: en ændring i admin skal nå ud til gæsten. Prøven
   retter i admin — som personalet gør — og åbner siden bagefter.
   ============================================================ */
test.describe('Det, personalet retter i admin, står på siderne', () => {

  test('en ny ret i admin står på forsidens bestilling og på menukortet', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await visFane(page, 'p-menu');
    const grp = page.locator('#menu-redigering .menu-gruppe', { has: page.locator('.kat-hoved input.navn') }).first();
    const kat = await grp.locator('.kat-hoved input.navn').inputValue();
    await grp.locator('.ny-vare input.navn').fill('Rejsens ret');
    await grp.locator('.ny-vare input.smal').fill('99');
    await grp.locator('.ny-vare button.tilfoej').click();
    await expect.poll(async () => (await gemteData(page)).menu_varer.filter((v) => v.navn === 'Rejsens ret').length).toBe(1);

    /* Siden åbnes med det, admin lige har gemt — databasen, gæsten læser */
    const gemt = await gemteData(page);
    const side = await page.context().newPage();
    await åbnSkal(side, '/m-menukort.html', { data: gemt });
    await expect(side.locator('#mk-kat .mk-linje[data-vare="Rejsens ret"]')).toContainText('99,-');
    expect(kat.length).toBeGreaterThan(0);
  });

  test('et arrangement, arrangøren udgiver, står på kalendersiden og forsiden', async ({ page }) => {
    const d = grunddata();
    d.kalender = []; d.reservationer = [];
    d.personale = [{ id: 1, lokation_id: 'mosede', email: 'test@lesreg.dk', navn: 'Lise', rolle: 'arrangoer', aktiv: true }];
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-arrangementer');
    await page.locator('#arr-ny').click();
    await page.fill('#arr-titel', 'Rejsens fredagsbar');
    await page.fill('#arr-dato', '2026-08-14');
    await page.fill('#arr-start', '19:00');
    await page.locator('#arr-udgiv').click();
    await expect.poll(async () => (await gemteData(page)).kalender.filter((k) => k.titel === 'Rejsens fredagsbar').length).toBe(1);

    const gemt = await gemteData(page);
    const kal = await page.context().newPage();
    await åbnSkal(kal, '/h-kalender.html', { data: gemt });
    await expect(kal.locator('body')).toContainText('Rejsens fredagsbar');
    const forside = await page.context().newPage();
    await åbnSkal(forside, '/index.html', { data: gemt });
    await expect(forside.locator('.music')).toContainText('Rejsens fredagsbar');
  });
});
