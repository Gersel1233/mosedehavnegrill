/* ============================================================
   ET UGYLDIGT NUMMER ER TYDELIGT — ALLE STEDER  (28/9)
   ------------------------------------------------------------
   Mikkels ord: *"alle steder, hvis telefonnummeret der er angivet
   er ugyldigt den ene eller anden måde, skal det også være
   tydeligt"*.

   Før: forsiden, smørrebrød og tapas skrev fejlen i summen ved
   Send og sprang op til feltet, der så helt normalt ud; kalender-
   siden skrev den i en grå 12 px-linje uden at røre feltet; og
   ingen af dem så et nummer med seksten cifre — det gik videre og
   kom tilbage fra databasen som "Otte cifre." Øvetilstanden tog
   imod det hele.

   Reglen er Butik.tjek.telefon, og feltet bliver rødt med sin
   sætning (js/skal/feltfejl.js).
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, åbnAdmin, visFane, grunddata, gemteData } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';

async function feltSigerFra(page, id, ord) {
  const felt = page.locator(id);
  await expect(felt).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator(id + ' + .felt-fejl')).toContainText(ord);
  const kant = await felt.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(kant, 'feltet har ingen rød kant').toBe('solid');
}

test.describe('Forsiden', () => {
  function data() {
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [1, 6, 9];
    d.indstillinger.bestilling_varsel_timer = 2;
    return d;
  }
  async function kurv(page) {
    await åbnSkal(page, '/index.html', { ur: FREDAG, data: data() });
    await page.locator('[data-kategori="Smørrebrød"]').click();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#navn').fill('Sara Poulsen');
    await page.locator('#tid').selectOption('17:00');
  }

  test('et for kort nummer står ved feltet, ikke kun i summen', async ({ page }) => {
    await kurv(page);
    await page.locator('#tlf').fill('2887');
    await page.locator('button.g.solid.blk').click();
    await feltSigerFra(page, '#tlf', 'for kort');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);
  });

  test('seksten cifre bliver sagt fra, før databasen gør det', async ({ page }) => {
    await kurv(page);
    await page.locator('#tlf').fill('2887134328871343');
    await page.locator('button.g.solid.blk').click();
    await feltSigerFra(page, '#tlf', 'for langt');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);
  });

  test('retter man nummeret, går den røde kant væk', async ({ page }) => {
    await kurv(page);
    await page.locator('#tlf').fill('2887');
    await page.locator('button.g.solid.blk').click();
    await feltSigerFra(page, '#tlf', 'for kort');
    await page.locator('#tlf').fill('28871343');
    await expect(page.locator('#tlf + .felt-fejl')).toHaveCount(0);
  });
});

test.describe('Tapas', () => {
  test('et nummer med ord i bliver sagt fra ved feltet', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 2;
    d.menu_kategorier.push({ id: 20, afdeling: 'mad', navn: 'Til selskabet', sortering: 30, aktiv: true });
    d.menu_varer.push({ id: 20, kategori_id: 20, navn: 'Tapasfad, pr. person', beskrivelse: null,
      pris: 145, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true });
    await åbnSkal(page, '/m-tapas.html', { ur: FREDAG, data: d });
    await page.locator('#tpers').fill('6');
    await page.locator('#tnavn').fill('Sara Poulsen');
    await page.locator('#ttlf').fill('ring efter 16: 28871343');
    await page.locator('#tdato').selectOption('2026-08-09');
    await page.locator('#bestil-tapas button.g.solid.blk').click();
    await feltSigerFra(page, '#ttlf', 'uden ord');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);
  });
});

test.describe('Kalendersiden', () => {
  function med() {
    const d = grunddata();
    d.kalender = [{
      id: 11, lokation_id: 'mosede', type: 'arrangement',
      dato: '2026-09-05', slut_dato: null, titel: 'Fællesspisning på havnen',
      beskrivelse: 'Langborde, én ret og fælles snak.', emoji: null,
      lukker_kl: null, offentlig: true, tilmelding: true, pladser: 40,
      pris_tekst: '145,-', start_kl: '18:00',
    }];
    d.reservationer = [];
    return d;
  }

  test('et for kort nummer: feltet bliver rødt, og linjen ved knappen er et fejlkort', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', { ur: FREDAG, data: med() });
    await page.locator('.evcard').first().waitFor();
    const pille = page.locator('#bestil-pill');
    if (await pille.getAttribute('href') === '#reserver') await pille.click();
    await page.fill('#kantal', '3');
    await page.fill('#knavn', 'Sara Poulsen');
    await page.fill('#ktlf', '2887');
    await page.locator('#reserver button.g.solid.blk').click();
    await feltSigerFra(page, '#ktlf', 'for kort');
    await expect(page.locator('#reserver .fine.fejlkort')).toContainText('for kort');
    expect((await gemteData(page)).reservationer || []).toHaveLength(0);
  });
});

/* ⚠️ ØVETILSTANDEN SKAL FEJLE SOM SKYEN (CLAUDE.md). Butik.bestil,
   bookBord, lejLokale og reserverPlads tog imod et nummer, databasen
   afviser (8-15 cifre, *_telefon_ok). Målt direkte på Butik, for det
   er dér, øvelsen skal sige nej — en side, der glemmer sit eget tjek,
   skal stadig få nej. */
test.describe('Øvetilstanden', () => {
  test('et nummer med seksten cifre bliver afvist som i databasen', async ({ page }) => {
    await åbnSkal(page, '/index.html', { ur: FREDAG, data: grunddata() });
    await page.waitForFunction(() => window.Butik && Butik.bookBord);
    const svar = await page.evaluate(async () => {
      const ud = {};
      const lang = '1234567890123456';
      try {
        await Butik.bookBord({ navn: 'Sara', telefon: lang, dato: '2026-08-20',
          tid: '18:00', antal_personer: 2 });
        ud.bord = 'taget imod';
      } catch (e) { ud.bord = e.message; }
      try {
        await Butik.bestil({ navn: 'Sara', telefon: lang, hent_dato: '2026-08-20',
          hent_tid: '12:00', linjer: [{ navn: 'Rejemad', antal: 1, pris: 95 }] });
        ud.bestil = 'taget imod';
      } catch (e) { ud.bestil = e.message; }
      return ud;
    });
    expect(svar.bord).toMatch(/Telefonnummeret blev afvist/);
    expect(svar.bestil).toMatch(/Telefonnummeret blev afvist/);
  });
});

/* bord/ satte aria-invalid på feltet, men ingen regel læste det, og
   feltfejlene havde role=alert — så de blev tegnet som store kort, mens
   bestil/ tegnede dem som små linjer. Nu: små linjer og et rødt felt. */
test.describe('bord/', () => {
  test('et for kort nummer: feltet er rødt, og fejlen er en linje, ikke et kort', async ({ page }) => {
    await åbn(page, '/bord/');
    await page.locator('#bord-antal').fill('4');
    await page.locator('#bord-navn').fill('Familien Vind');
    await page.locator('#bord-telefon').fill('2030');
    await page.locator('#bord-send').click();
    await expect(page.locator('#fejl-telefon')).toContainText('for kort');
    const kant = await page.locator('#bord-telefon').evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(kant, 'feltet har ingen rød kant').toBe('solid');
    const flade = await page.locator('#fejl-telefon').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(flade, 'feltfejlen er tegnet som et kort').toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('Admin', () => {
  test('en udlejning i telefonen med "12" som nummer bliver sagt fra', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await visFane(page, 'p-lokale');
    await page.locator('#lokale-tag-booking summary').click();
    await page.fill('#nyl-navn', 'Bodil Storm');
    await page.fill('#nyl-telefon', '12');
    await page.fill('#nyl-dato', '2026-09-12');
    await page.locator('#opret-udlejning').click();
    await expect(page.locator('#fejl')).toContainText('for kort');
    expect((await gemteData(page)).udlejninger || []).toHaveLength(0);
  });
});
