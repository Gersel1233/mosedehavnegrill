/* ============================================================
   EN STRIBE ENS DAGE SIGES ÉN GANG  (4/10)
   ------------------------------------------------------------
   Mikkels ord med forsiden foran sig: *"uge der kommer dagensret
   og dagenret tingen på forsiden ser forældet og sjusket ud."*

   MÅLT i databasen samme dag: køkkenet havde skrevet "Bagt
   krydret kartoffel" på FIRE dage — søndag til onsdag — og
   ingenting på de tre sidste. Forsiden stod med fire kort, der
   var bogstavelig talt ens: samme navn, samme sætning, samme
   pris, fire gange ved siden af hinanden. Det læses ikke som en
   uge. Det læses som en side, der er gået i stykker.

   Reglen fra 1/10 fandtes allerede — men den slog kun sammen,
   når ALLE SYV dage var ens. Køkkenet skriver ikke syv dage.
   Køkkenet skriver de dage, de ved. En stribe på fire ramte
   derfor midt imellem: for ens til at være en plan, for kort
   til at blive slået sammen.

   ⚠️ DER KLIPPES STADIG KUN I VISNINGEN. De fire rækker bliver
   stående i databasen, så køkkenet kan tage én dag ud eller
   sætte et antal pr. dag. Siden siger det bare én gang, så
   længe de er ens.

   ⚠️ OG DEN SAMME REGEL PÅ BEGGE FLADER. Forsidens ugestribe og
   menukortets ugeplan spørger Butik om det samme — det var
   præcis dén fejl, 1/10 kostede: forsiden havde lært det, og
   menukortet sagde navnet ni gange.
   ============================================================ */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

// 2026-08-07 er en fredag, og uret står 11:00Z = 13:00 dansk tid.
const FREDAG = '2026-08-07T11:00:00Z';

const ret = (dato, navn) => ({
  id: 'dr' + dato.replace(/-/g, ''), lokation_id: 'mosede', dato,
  navn, beskrivelse: 'Med blandet salat, tomat og dressing.', pris: 55,
  antal_tilbage: null, udsolgt: false, aktiv: true, sortering: 1,
});

// Præcis det, der stod i databasen 4/10: fire ens dage, så ingenting.
const FIRE_ENS = ['2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10']
  .map((d) => ret(d, 'Bagt krydret kartoffel'));

const SYV_ENS = ['2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10',
  '2026-08-11', '2026-08-12', '2026-08-13'].map((d) => ret(d, 'Bagt krydret kartoffel'));

test.describe('Forsidens ugestribe slår en stribe ens dage sammen', () => {
  test('fire ens dage bliver til ét kort', async ({ page }) => {
    await åbnSkal(page, '/index.html',
      { ur: FREDAG, data: grunddata({ dagens_retter: FIRE_ENS }) });
    await page.waitForSelector('#ugen .day');

    const kort = page.locator('#ugen .day');
    const n = await kort.count();
    expect(n, `ugestriben står med ${n} kort — det er den samme ret fire gange`).toBe(1);
    await expect(kort.first()).toContainText('Bagt krydret kartoffel');
  });

  /* Spændet er det, der gør kortet til en OPLYSNING og ikke bare
     til "vi har slået noget sammen": gæsten skal kunne se, hvor
     langt ind i ugen retten rækker. */
  test('kortet siger, hvilke dage striben dækker', async ({ page }) => {
    await åbnSkal(page, '/index.html',
      { ur: FREDAG, data: grunddata({ dagens_retter: FIRE_ENS }) });
    await page.waitForSelector('#ugen .day');

    const t = (await page.locator('#ugen .day').first().innerText()).replace(/\s+/g, ' ');
    expect(t, 'kortet skal sige, at striben er på fire dage').toMatch(/4 dage/i);
    // 7. august er i dag, 10. august er den sidste dag i striben.
    expect(t, 'kortet skal sige, hvor striben starter og slutter').toMatch(/7\.\s*–\s*10\.\s*august/);
    expect(t, 'fire dage er ikke en hel uge').not.toMatch(/hele ugen/i);
  });

  /* ⚠️ PRISEN SKAL VÆRE EN PRIS. Det sammenslåede kort skrev sin
     pris med en klasse, der ikke findes i CSS'en (`dp`, mens
     dagskortene bruger `pr`) — tallet stod som løs brødtekst
     under retten, hvor hvert andet kort har pillen. Tallet, der
     kommer udefra, er stylesheetets egen afrunding: pillen er
     999px, og brødtekst er 0px. */
  test('det sammenslåede korts pris står i pillen som på dagskortene', async ({ page }) => {
    await åbnSkal(page, '/index.html',
      { ur: FREDAG, data: grunddata({ dagens_retter: SYV_ENS }) });
    await page.waitForSelector('#ugen .day');

    const pris = page.locator('#ugen .day .pr');
    await expect(pris, 'prisen står ikke i prisfeltet, dagskortene bruger').toHaveCount(1);
    await expect(pris).toHaveText('55,-');
    const rund = await pris.evaluate((e) => getComputedStyle(e).borderRadius);
    expect(rund, `prisen er ikke pillen — afrundingen måler ${rund}`).not.toBe('0px');
  });

  /* MODSTYKKET: striben må ikke æde en dag, der er anderledes. */
  test('en anden ret midt i striben deler den op', async ({ page }) => {
    const dage = SYV_ENS.map((r) => Object.assign({}, r));
    dage[2].navn = 'Stegt flæsk';
    await åbnSkal(page, '/index.html',
      { ur: FREDAG, data: grunddata({ dagens_retter: dage }) });
    await page.waitForSelector('#ugen .day');

    expect(await page.locator('#ugen .day').count()).toBeGreaterThan(1);
    await expect(page.locator('#ugen')).toContainText('Stegt flæsk');
  });

  /* Og én dag alene er ikke en stribe — så står dagen, som den altid har. */
  test('én dag alene bliver stående som en dag', async ({ page }) => {
    await åbnSkal(page, '/index.html',
      { ur: FREDAG, data: grunddata({ dagens_retter: [ret('2026-08-07', 'Stegt flæsk')] }) });
    await page.waitForSelector('#ugen .day');

    const t = (await page.locator('#ugen .day').first().innerText()).replace(/\s+/g, ' ');
    expect(t, 'én dag må ikke skrives som en stribe').not.toMatch(/dage|hele ugen/i);
    expect(t).toMatch(/fredag/i);
  });
});

test.describe('Menukortets ugeplan slår den samme stribe sammen', () => {
  test('fire ens dage bliver til én række', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html',
      { ur: FREDAG, data: grunddata({ dagens_retter: FIRE_ENS }) });
    await page.waitForSelector('#mk-uge');

    const r = page.locator('#mk-uge .mk-dag');
    const n = await r.count();
    expect(n, `ugeplanen står med ${n} rækker — det er den samme ret fire gange`).toBe(1);
    await expect(r.first()).toContainText(/4 dage/i);
    await expect(r.first()).toContainText('Bagt krydret kartoffel');
  });

  /* Syv ens dage er stadig "hele ugen" og ikke "7 dage" — ordet er
     husets eget, og det er kortere at læse end et tal. */
  test('syv ens dage hedder stadig hele ugen', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html',
      { ur: FREDAG, data: grunddata({ dagens_retter: SYV_ENS }) });
    await page.waitForSelector('#mk-uge');

    const r = page.locator('#mk-uge .mk-dag');
    await expect(r).toHaveCount(1);
    await expect(r.first()).toContainText(/hele ugen/i);
  });
});
