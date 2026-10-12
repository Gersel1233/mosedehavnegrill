/* ARRANGØREN  (12/10)

   Chefens ord: *"Er der lavet en gruppe på hjemmesiden, hvor vores
   event-arrangør kan gå ind og lægge alle vores events ind på?"*
   Mikkels svar: stederne er "hele havnecaféen" og de fire andre, "men
   de kan lave navnene om", "arrangøren må godt udgive selv",
   "venteliste ja".

   Databasens halvdel er bevist for sig i supabase/proev-arrangoer.sql
   (rollen, bremsen, ventelisten, slet-værnet). Her måles det, man SER:
   arbejdsbordet i admin (js/admin/arrangementer.js), rollen, der kun
   viser to faner, og kalendersiden (js/skal/kalender.js) — og at
   øvetilstanden fejler som skyen, for en øvelse, der er mildere end
   det rigtige, er ikke en øvelse.

   ⚠️ UREt står fredag 7. august 2026 kl. 13 dansk tid (hjaelp.js).
   Datoerne nedenfor er regnet i hånden ud fra det — ikke af koden,
   der måles. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const arr = (æ) => Object.assign({
  id: 31, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-21',
  slut_dato: null, titel: 'Fredagsbar på molen', beskrivelse: 'Fadøl og musik på molen.',
  emoji: null, lukker_kl: null, offentlig: true, tilmelding: false, pladser: null,
  pris_tekst: null, start_kl: '19:00', slut_kl: '22:00', billede: null, kategori: null,
  sted_id: null, aflyst: false, aflyst_tekst: null, venteliste: false,
  max_pr_tilmelding: null, tilmelding_lukker_timer: null, bord_booking: false, serie: null,
}, æ);

const res = (æ) => Object.assign({
  id: 1, lokation_id: 'mosede', kalender_id: 31, reference: 'RE260807-AAAAA',
  navn: 'Anna Vind', telefon: '20304050', email: null, antal_personer: 2,
  besked: null, status: 'ny', intern_note: null, slettet: null,
  oprettet: '2026-08-06T10:00:00Z',
}, æ);

const med = (kalender, reservationer, æ) => Object.assign(grunddata(), {
  kalender: kalender || [], reservationer: reservationer || [],
}, æ);

async function arbejdsbordet(page, data) {
  await åbnAdmin(page, { data });
  await visFane(page, 'p-arrangementer');
}
const række = (page, titel) => page.locator('.arr-raekke', { hasText: titel || 'Fredagsbar på molen' });

/* ============================================================
   ARBEJDSBORDET
   ============================================================ */
test.describe('Arbejdsbordet', () => {

  /* ⚠️ ÉN FREDAGSBAR OM UGEN VAR TI GANGE DEN SAMME FORMULAR. Gentag
     laver én række pr. dato — hver sin, så én fredag kan aflyses uden
     de andre — og de lander SAMMEN (én POST, kalenderSerie). */
  test('gentag hver uge lægger én række ind pr. fredag, med samme serie', async ({ page }) => {
    await arbejdsbordet(page, med([]));
    await page.locator('#arr-ny').click();
    await page.fill('#arr-titel', 'Fredagsbar');
    await page.fill('#arr-dato', '2026-08-14');
    await page.fill('#arr-start', '19:00');
    await page.selectOption('#arr-gentag', '7');
    await page.fill('#arr-gentag-til', '2026-09-04');

    // Arrangøren ser, hvad der bliver lavet, FØR der trykkes.
    await expect(page.locator('#arr-gentag-liste')).toContainText('Laver 4 arrangementer');
    await expect(page.locator('#arr-udgiv')).toHaveText('Udgiv alle 4');
    await page.locator('#arr-udgiv').click();
    await expect(page.locator('#kvittering')).toContainText('4 arrangementer er udgivet');

    const rk = (await gemteData(page)).kalender.filter((k) => k.titel === 'Fredagsbar');
    // Fire fredage, regnet i hånden: 14/8, 21/8, 28/8, 4/9.
    expect(rk.map((k) => k.dato).sort()).toEqual(['2026-08-14', '2026-08-21', '2026-08-28', '2026-09-04']);
    expect(new Set(rk.map((k) => k.id)).size, 'to rækker fik samme id').toBe(4);
    expect(rk[0].serie, 'rækkerne bærer ikke et seriemærke').toBeTruthy();
    expect(new Set(rk.map((k) => k.serie)).size, 'rækkerne har hver sin serie').toBe(1);
    expect(rk.every((k) => k.offentlig === true && k.start_kl === '19:00')).toBe(true);
  });

  /* ⚠️ AFLYS ER IKKE SLET. Gæstelisten skal stå, så nogen kan ringe
     rundt — og siden skal sige "Aflyst", ikke lade aftenen forsvinde. */
  test('Aflys lader arrangementet og gæstelisten stå', async ({ page }) => {
    await arbejdsbordet(page, med([arr({ tilmelding: true, pladser: 40 })], [res()]));
    page.once('dialog', (d) => d.accept('Bandet er sygt'));
    await række(page).locator('button', { hasText: /^Aflys$/ }).click();
    await expect(page.locator('#kvittering')).toContainText('Ring til de 2');

    const gemt = await gemteData(page);
    expect(gemt.kalender).toHaveLength(1);
    expect(gemt.kalender[0].aflyst).toBe(true);
    expect(gemt.kalender[0].aflyst_tekst).toBe('Bandet er sygt');
    // Og intet andet er rørt — tiden og tilmeldingen står, som de stod.
    expect(gemt.kalender[0].start_kl).toBe('19:00');
    expect(gemt.kalender[0].tilmelding).toBe(true);
    expect(gemt.reservationer, 'gæstelisten forsvandt med aflysningen').toHaveLength(1);

    await expect(række(page)).toContainText('Aflyst');
    await expect(række(page).locator('button', { hasText: /^Genåbn$/ })).toHaveCount(1);
  });

  /* ⚠️ SLET MED TILMELDTE TOG GÆSTELISTEN MED I STILHED (on delete
     cascade). Databasen afviser det nu (kalender_slet_vaern); knappen
     siger det, før nogen prøver. To prøver: uden modstykket ville en
     knap, der ALTID var låst, bestå. */
  test('Slet er låst, når nogen har meldt sig til', async ({ page }) => {
    await arbejdsbordet(page, med([arr({ tilmelding: true, pladser: 40 })], [res()]));
    await expect(række(page).locator('button', { hasText: /^Slet$/ })).toBeDisabled();
  });

  test('uden tilmeldte kan det slettes', async ({ page }) => {
    await arbejdsbordet(page, med([arr()], []));
    page.once('dialog', (d) => d.accept());
    await række(page).locator('button', { hasText: /^Slet$/ }).click();
    await expect(page.locator('#kvittering')).toContainText('Slettet');
    expect((await gemteData(page)).kalender).toHaveLength(0);
  });

  /* ⚠️ ØVETILSTANDEN SKAL FEJLE SOM SKYEN. Knappen er låst, men en
     side, der er dage gammel, har den ikke — så værnet sidder i
     databasen og i øvelsens spejl af den. */
  test('og øvetilstanden afviser at slette et arrangement med tilmeldte', async ({ page }) => {
    await arbejdsbordet(page, med([arr({ tilmelding: true, pladser: 40 })], [res()]));
    const fejl = await page.evaluate(() => Butik.skrive.sletKalender(31)
      .then(() => '', (e) => String(e.message || e)));
    expect(fejl).toContain('arrangement_har_tilmeldte');
    expect((await gemteData(page)).kalender).toHaveLength(1);
  });

  /* KOPIÉR: det samme arrangement en anden dag. Alt følger med —
     undtagen datoen, som er det, der er nyt. */
  test('Kopiér tager alt med undtagen datoen', async ({ page }) => {
    await arbejdsbordet(page, med([arr({ tilmelding: true, pladser: 30, sted_id: 2, pris_tekst: '50,-' })]));
    await række(page).locator('button', { hasText: /^Kopiér$/ }).click();
    await expect(page.locator('#arr-titel')).toHaveValue('Fredagsbar på molen');
    await expect(page.locator('#arr-dato')).toHaveValue('');
    await expect(page.locator('#arr-maade [data-maade="tilmelding"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#arr-pladser')).toHaveValue('30');
    await expect(page.locator('#arr-steder [data-sted="2"]')).toHaveAttribute('aria-pressed', 'true');

    await page.fill('#arr-dato', '2026-08-28');
    await page.locator('#arr-udgiv').click();
    await expect(page.locator('#kvittering')).toContainText('Udgivet');
    const rk = (await gemteData(page)).kalender;
    expect(rk, 'kopien overskrev originalen').toHaveLength(2);
    const kopi = rk.filter((k) => k.dato === '2026-08-28')[0];
    expect(kopi.pladser).toBe(30);
    expect(kopi.sted_id).toBe(2);
    expect(kopi.pris_tekst).toBe('50,-');
  });

  /* ⚠️ "SMART MED HVOR DET FOREGÅR" — chefens ord. Samme sted samme
     aften er en dobbeltbooking af terrassen; et andet sted er ikke.
     "Hele havnecaféen" rammer alle de andre. */
  test('samme sted samme aften giver en advarsel', async ({ page }) => {
    await arbejdsbordet(page, med([arr({ sted_id: 2 })]));
    await page.locator('#arr-ny').click();
    await page.fill('#arr-titel', 'Smagning');
    await page.fill('#arr-dato', '2026-08-21');
    await page.fill('#arr-start', '20:00');
    await page.locator('#arr-steder [data-sted="2"]').click();
    await expect(page.locator('#arr-advarsler')).toContainText('Rammer «Fredagsbar på molen» samme sted');

    // Et andet sted samme aften er ingen konflikt …
    await page.locator('#arr-steder [data-sted="3"]').click();
    await expect(page.locator('#arr-advarsler')).toBeEmpty();
    // … men hele havnecaféen rammer terrassen.
    await page.locator('#arr-steder [data-sted="1"]').click();
    await expect(page.locator('#arr-advarsler')).toContainText('Fredagsbar på molen');
    // Og efter at det er slut, er der plads igen.
    await page.fill('#arr-start', '22:00');
    await expect(page.locator('#arr-advarsler')).toBeEmpty();
  });

  /* "DE KAN LAVE NAVNENE OM" (Mikkel 12/10). Et omdøbt sted er det
     samme sted — arrangementerne følger med, uden at nogen retter dem. */
  test('et sted kan omdøbes, og arrangementet følger med', async ({ page }) => {
    await arbejdsbordet(page, med([arr({ sted_id: 2 })]));
    await expect(række(page)).toContainText('Terrassen');
    await page.locator('#arr-ret-steder-liste').click();
    const rk = page.locator('.arr-sted-raekke').filter({ has: page.locator('[data-sted-navn="2"]') });
    await rk.locator('input').fill('Træterrassen');
    await rk.locator('button', { hasText: 'Gem navnet' }).click();
    await expect(page.locator('#kvittering')).toContainText('Træterrassen');

    const gemt = await gemteData(page);
    expect(gemt.arrangement_steder.filter((s) => s.id === 2)[0].navn).toBe('Træterrassen');
    expect(gemt.kalender[0].sted_id, 'arrangementet blev flyttet').toBe(2);
    await expect(række(page)).toContainText('Træterrassen');
  });

  /* ⚠️ TO STEDER MED SAMME NAVN KAN INGEN GÆST SKELNE — samme unikke
     indeks som databasen (arrangement_steder_navn_unik). */
  test('to steder kan ikke hedde det samme', async ({ page }) => {
    await arbejdsbordet(page, med([]));
    await page.locator('#arr-ret-steder-liste').click();
    await page.fill('#arr-sted-navn', 'molen');
    await page.locator('#arr-sted-tilfoej').click();
    await expect(page.locator('#fejl')).toContainText('allerede');
    const gemt = await gemteData(page);
    expect((gemt.arrangement_steder || []).filter((s) => /molen/i.test(s.navn)).length).toBeLessThan(2);
  });

  /* ⚠️ VENTELISTE UDEN ET LOFT ER EN LISTE, INGEN KOMMER PÅ. */
  test('ventelisten kan kun slås til, når der er et antal pladser', async ({ page }) => {
    await arbejdsbordet(page, med([]));
    await page.locator('#arr-ny').click();
    await page.locator('#arr-maade [data-maade="tilmelding"]').click();
    await expect(page.locator('#arr-venteliste')).toBeDisabled();
    await page.fill('#arr-pladser', '40');
    await expect(page.locator('#arr-venteliste')).toBeEnabled();
  });
});

/* ============================================================
   ROLLEN
   ============================================================ */
test.describe('Arrangøren ser sit eget', () => {

  const PERSONALE = (rolle) => [{ id: 1, lokation_id: 'mosede', email: 'test@lesreg.dk',
    navn: 'Lise', rolle, aktiv: true }];

  async function synligeFaner(page) {
    await page.locator('#arr-liste').waitFor({ state: 'attached' });
    await expect.poll(() => page.evaluate(() => Admin.rolle)).toBeTruthy();
    return page.evaluate(() => [...document.querySelectorAll('.faner button[data-panel]')]
      .filter((b) => !b.hidden).map((b) => b.dataset.panel));
  }

  /* ⚠️ "ALT, DER IKKE ER MEDARBEJDER, ER EJER" var den gamle regel — så
     en arrangør ville have fået priser, salg og personale at se.
     Databasen siger nej alligevel (is_admin_for), men en skærm fuld af
     felter, der ikke kan gemmes, er et system, der ser i stykker ud. */
  test('arrangøren ser kun Arrangementer og Tilmeldinger', async ({ page }) => {
    await åbnAdmin(page, { data: med([arr()], [], { personale: PERSONALE('arrangoer') }) });
    expect((await synligeFaner(page)).sort()).toEqual(['p-arrangementer', 'p-tilmeldinger']);
    await expect(page.locator('#p-arrangementer')).toBeVisible();
    await expect(række(page)).toBeVisible();
  });

  test('ejeren ser stadig det hele', async ({ page }) => {
    await åbnAdmin(page, { data: med([arr()], [], { personale: PERSONALE('ejer') }) });
    const faner = await synligeFaner(page);
    expect(faner).toContain('p-arrangementer');
    expect(faner).toContain('p-personale');
    expect(faner.length).toBeGreaterThan(5);
  });

  /* ⚠️ GEM I PERSONALE GJORDE ARRANGØREN TIL EJER: rækkens rolle blev
     læst som "medarbejder eller ejer". */
  test('ejeren kan gøre nogen til arrangør, og det bliver stående', async ({ page }) => {
    const folk = PERSONALE('ejer').concat([{ id: 2, lokation_id: 'mosede',
      email: 'lise@havnen.dk', navn: 'Lise', rolle: 'medarbejder', aktiv: true }]);
    await åbnAdmin(page, { data: med([], [], { personale: folk }) });
    await visFane(page, 'p-personale');
    await page.locator('#personale-liste [data-person="lise@havnen.dk"] [data-rolle="arrangoer"]').click();
    await expect.poll(async () => ((await gemteData(page)).personale || [])
      .filter((p) => p.email === 'lise@havnen.dk')[0]?.rolle).toBe('arrangoer');
  });
});

/* ============================================================
   VENTELISTEN I ADMIN
   ============================================================ */
test.describe('Ventelisten', () => {

  async function fanen(page, data) {
    await åbnAdmin(page, { data });
    await visFane(page, 'p-tilmeldinger');
  }

  /* ⚠️ EN PÅ VENTELISTEN TÆLLER IKKE SOM EN PLADS — ellers stod der
     "fuldt" længe efter, at nogen havde meldt fra. */
  test('en på ventelisten rykkes op, når der er plads', async ({ page }) => {
    await fanen(page, med([arr({ tilmelding: true, pladser: 4, venteliste: true })], [
      res({ id: 1, antal_personer: 2 }),
      res({ id: 2, reference: 'RE-V', navn: 'Ole Vent', telefon: '30405060', antal_personer: 2, status: 'venteliste' }),
    ]));
    await expect(page.locator('#tilmeld-tael')).toContainText('2 af 4');
    const ole = page.locator('#tilmeld-liste .bestil-kort', { hasText: 'Ole Vent' });
    page.once('dialog', (d) => d.accept());
    await ole.locator('button', { hasText: 'Ryk op' }).click();
    await expect.poll(async () => (await gemteData(page)).reservationer
      .filter((r) => r.id === 2)[0].status).toBe('ny');
    await expect(page.locator('#tilmeld-tael')).toContainText('4 af 4');
  });

  /* Modstykket: ingen plads, ingen ryk op — samme svar som databasens
     reservation_ret_vaern. */
  test('men ikke, når der stadig er fuldt', async ({ page }) => {
    await fanen(page, med([arr({ tilmelding: true, pladser: 4, venteliste: true })], [
      res({ id: 1, antal_personer: 4 }),
      res({ id: 2, reference: 'RE-V', navn: 'Ole Vent', telefon: '30405060', antal_personer: 2, status: 'venteliste' }),
    ]));
    const ole = page.locator('#tilmeld-liste .bestil-kort', { hasText: 'Ole Vent' });
    page.once('dialog', (d) => d.accept());
    await ole.locator('button', { hasText: 'Ryk op' }).click();
    await expect(page.locator('#fejl')).toBeVisible();
    expect((await gemteData(page)).reservationer.filter((r) => r.id === 2)[0].status).toBe('venteliste');
  });
});

/* ============================================================
   KALENDERSIDEN
   ============================================================ */
async function åbnKalender(page, data, ur) {
  await åbnSkal(page, '/h-kalender.html', { data, ur });
  await page.locator('.evcard, .evtom').first().waitFor({ state: 'attached' });
}
async function reserver(page, antal, navn, tlf) {
  const pille = page.locator('#bestil-pill');
  if (await pille.getAttribute('href') === '#reserver') await pille.click();
  await expect(page.locator('#reserver')).toBeVisible();
  await page.fill('#kantal', String(antal));
  await page.fill('#knavn', navn);
  await page.fill('#ktlf', tlf);
  await page.locator('#reserver button.g.solid.blk').click();
}

test.describe('Kalendersiden', () => {

  test('stedet står på kortet', async ({ page }) => {
    await åbnKalender(page, med([arr({ sted_id: 5 })]));
    await expect(page.locator('.evcard')).toContainText('Molen');
  });

  /* ⚠️ "HUSK AT BESTILLE BORD" VAR EN SÆTNING, IKKE EN KNAP (1/10).
     Nu lander gæsten på bordbookingen med dagen valgt. */
  test('Book bord fører til bordbookingen med dagen valgt', async ({ page }) => {
    /* 14/8 — en uge frem, så dagen står i bordbookingens stribe (14 dage). */
    const data = med([arr({ bord_booking: true, dato: '2026-08-14' })]);
    await åbnKalender(page, data);
    const knap = page.locator('.evcard a', { hasText: 'Book bord' });
    await expect(knap).toHaveAttribute('href', 'bord/?dato=2026-08-14');
    await expect(page.locator('.evcard')).not.toContainText('Reservér plads');

    await åbnSkal(page, '/bord/?dato=2026-08-14', { data });
    await expect(page.locator('button.dag.valgt')).toHaveAttribute('data-dato', '2026-08-14');
  });

  test('et aflyst arrangement står med ordet Aflyst, og ingen kan melde sig til', async ({ page }) => {
    await åbnKalender(page, med([arr({ tilmelding: true, pladser: 40, aflyst: true,
      aflyst_tekst: 'Bandet er sygt' })]));
    const kort = page.locator('.evcard');
    await expect(kort).toHaveClass(/aflyst/);
    await expect(kort).toContainText('Aflyst: Bandet er sygt');
    await expect(kort.locator('[data-kalender][data-pick]')).toHaveCount(0);
    // Den overstregede titel er den, øjet fanger først.
    expect(await kort.locator('h3').evaluate((h) => getComputedStyle(h).textDecorationLine)).toContain('line-through');
  });

  /* ⚠️ FRISTEN: "lukker dagen før" er dagen før KL. 18 — ikke midnat.
     Uret står kl. 13 fredag 7/8; arrangementet starter kl. 18 samme dag. */
  test('er fristen passeret, er tilmeldingen lukket', async ({ page }) => {
    await åbnKalender(page, med([arr({ dato: '2026-08-07', start_kl: '18:00', slut_kl: null,
      tilmelding: true, pladser: 40, tilmelding_lukker_timer: 24 })]));
    await expect(page.locator('.evcard')).toContainText('Tilmeldingen er lukket');
    await expect(page.locator('.evcard [data-kalender][data-pick]')).toHaveCount(0);
  });

  test('men tre timer før kl. 18 er der stadig åbent kl. 13', async ({ page }) => {
    await åbnKalender(page, med([arr({ dato: '2026-08-07', start_kl: '18:00', slut_kl: null,
      tilmelding: true, pladser: 40, tilmelding_lukker_timer: 3 })]));
    await expect(page.locator('.evcard')).toContainText('Reservér plads');
    // Fristen står i laget, hvor gæsten læser det hele.
    await page.locator('.evcard h3').click();
    await expect(page.locator('#ev-plads')).toContainText('Tilmelding senest fredag 7. august kl. 15.00');
  });

  /* ⚠️ VENTELISTEN SKAL SIGE, AT DET ER EN VENTELISTE. En kvittering,
     der lignede en plads, ville sende en gæst til havnen til en aften,
     der var udsolgt. */
  test('fuldt med venteliste: gæsten skrives på ventelisten og får det at vide', async ({ page }) => {
    await åbnKalender(page, med([arr({ tilmelding: true, pladser: 4, venteliste: true })], [
      res({ antal_personer: 4 })]));
    await expect(page.locator('.evcard')).toContainText('Skriv jer på ventelisten');
    await reserver(page, 2, 'Ole Vent', '30405060');
    await expect(page.locator('#reserver h3')).toContainText('ventelisten');
    await expect(page.locator('#reserver .kv-kalender'),
      'en venteliste i kalenderen ligner en aftale, der ikke er der').toHaveCount(0);

    const r = (await gemteData(page)).reservationer.filter((x) => x.navn === 'Ole Vent')[0];
    expect(r.status).toBe('venteliste');
  });

  test('med en plads får gæsten en kalenderfil med', async ({ page }) => {
    await åbnKalender(page, med([arr({ tilmelding: true, pladser: 40 })]));
    await reserver(page, 2, 'Sara Poulsen', '28871343');
    await expect(page.locator('#reserver h3')).toContainText('Vi ses');
    await expect(page.locator('#reserver .kv-kalender')).toHaveCount(1);
  });

  /* ⚠️ HØJST PR. TILMELDING er arrangementets eget — og øvetilstanden
     afviser som databasen (reservation_for_mange). */
  test('flere end arrangementets loft pr. tilmelding bliver afvist', async ({ page }) => {
    await åbnKalender(page, med([arr({ tilmelding: true, pladser: 40, max_pr_tilmelding: 6 })]));
    await reserver(page, 8, 'Stor Familie', '28871343');
    await expect(page.locator('#reserver .fine')).toContainText('flere end 6');
    expect((await gemteData(page)).reservationer || []).toHaveLength(0);
  });

  /* ⚠️ KALENDERFILEN REGNER I UTC. Kl. 19 dansk sommertid er 17Z, og
     kl. 19 vintertid er 18Z — et fast "+2" ville flytte hver vinter-
     aften en time i gæstens telefon. */
  test('Gem i kalender har det rigtige klokkeslæt — sommer og vinter', async ({ page }) => {
    await åbnKalender(page, med([arr(),
      arr({ id: 32, dato: '2026-11-20', titel: 'Julefrokost; med dans, og sild' })]));
    const ics = async (i) => {
      await page.locator('.evcard').nth(i).locator('h3').click();
      const href = await page.locator('#ev-cta a', { hasText: 'Gem i kalender' }).getAttribute('href');
      await page.keyboard.press('Escape');
      return decodeURIComponent(href.replace(/^data:text\/calendar;charset=utf-8,/, ''));
    };
    const sommer = await ics(0);
    expect(sommer).toContain('DTSTART:20260821T170000Z');
    expect(sommer).toContain('DTEND:20260821T200000Z');
    const vinter = await ics(1);
    expect(vinter).toContain('DTSTART:20261120T180000Z');
    /* ⚠️ SEMIKOLON OG KOMMA ESCAPES (RFC 5545) — ellers klipper
       kalenderen titlen ved det første semikolon. */
    expect(vinter).toContain('SUMMARY:Julefrokost\\; med dans\\, og sild');
  });

  /* GOOGLE KAN SE ARRANGEMENTERNE — kun de offentlige, og et aflyst
     siger EventCancelled i stedet for at forsvinde. */
  test('Google får hvert offentligt arrangement som en begivenhed', async ({ page }) => {
    await åbnKalender(page, med([
      arr({ sted_id: 5 }),
      arr({ id: 32, dato: '2026-08-28', titel: 'Aflyst aften', aflyst: true }),
      arr({ id: 33, dato: '2026-09-04', titel: 'Hemmelig kladde', offentlig: false }),
    ]));
    const ld = JSON.parse(await page.locator('#arrangementer-ld').textContent());
    expect(ld.map((e) => e.name).sort()).toEqual(['Aflyst aften', 'Fredagsbar på molen']);
    const fb = ld.filter((e) => e.name === 'Fredagsbar på molen')[0];
    expect(fb.startDate).toBe('2026-08-21T19:00+02:00');
    expect(fb.endDate).toBe('2026-08-21T22:00+02:00');
    expect(fb.location.name).toContain('Molen');
    expect(fb.eventStatus).toContain('EventScheduled');
    expect(ld.filter((e) => e.name === 'Aflyst aften')[0].eventStatus).toContain('EventCancelled');
    // Ingen pris i Googles udgave: prisen er fritekst og kunne lyve.
    expect(JSON.stringify(ld)).not.toContain('"offers"');
  });
});
