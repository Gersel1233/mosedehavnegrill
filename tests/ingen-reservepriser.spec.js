/* ============================================================
   SVARER DATABASEN IKKE, VISES INGEN PRISER  (25. sep 2026)
   ------------------------------------------------------------
   Mikkels ord: *"Hvis databasen ikke svarer, må hjemmesiden aldrig
   vise forældede reservepriser. Vis i stedet en tydelig fejlbesked
   med caféens telefonnummer. Test både normal indlæsning og
   databasefejl."*

   MÅLT i en browser med databasen afskåret, før rettelsen: menukortet
   viste "Smørrebrød 55,-", "Håndmad 24,-" og "Softice, stor 45,-" (den
   rigtige pris er 47), bestil/ viste de samme to, tapassiden og
   forsiden stod med designets "199 kr." (fadet koster 179), og
   cateringen sagde "fra 24,- stk.". Alt sammen tal, koden selv har
   skrevet (Butik.reservedata).

   Prøven læser SKÆRMEN, ikke koden: hvert synligt element, hvis egen
   tekst ligner en pris, tælles. Siderne står i en liste her, fordi
   hver af dem skal have sin egen fejlbesked — men ALLE gæstesider
   blev målt, da reglen blev lavet (se docs/HISTORIK.md 25/9).

   ⚠️ ÉN UNDTAGELSE, OG DEN ER NAVNGIVET: tapassidens tre `.tnote`-
   linjer (vin 175, levering 79, kage 30) er ejerens egne faste tilbud,
   skrevet i HTML'en 21/9 — ikke reservedata. De står, uanset om
   databasen svarer.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { sætUr, åbnSkal, grunddata } = require('./hjaelp');

const SKY = 'https://db.eksempel.test';
const NUMMER = '28 87 13 43';
const UR = '2026-08-07T11:00:00Z';   // fredag 13.00 dansk — åbent

async function åbnUdenDatabase(page, sti) {
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**/js/config.js*', (r) => r.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD={url:'" + SKY + "',anonKey:'proeve'};",
  }));
  let kald = 0;
  await page.route(SKY + '/**', (r) => { kald++; return r.abort('connectionfailed'); });
  await page.addInitScript(() => { try { localStorage.setItem('mosede_vilkaar_v1', 'ja'); } catch (e) {} });
  await sætUr(page, UR);
  await page.goto(sti, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { if (window.MosedeFilm) window.MosedeFilm.spring(); }).catch(() => {});
  await page.waitForTimeout(1200);
  /* ⚠️ ÉT AF TALLENE KOMMER UDEFRA: uden et eneste kald til den falske
     adresse kørte siden i øvetilstand, og prøven målte ingenting. */
  expect(kald, 'prøven ramte aldrig databasen — den måler ingenting').toBeGreaterThan(0);
}

/* Hvert synligt element, hvis EGEN tekst ligner en pris. */
function synligePriser(page) {
  return page.evaluate(() => {
    const ud = [];
    document.querySelectorAll('body *').forEach((e) => {
      if (e.closest('script,style,noscript,option,.tnote')) return;
      const egen = [...e.childNodes].filter((n) => n.nodeType === 3)
        .map((n) => n.textContent).join('').trim();
      if (!egen || !/\d+\s*(,-|kr\b)/.test(egen)) return;
      const r = e.getBoundingClientRect();
      if (!(r.width || r.height) || getComputedStyle(e).visibility === 'hidden') return;
      ud.push(egen.slice(0, 60));
    });
    return ud;
  });
}

const SIDER = [
  { sti: '/index.html', besked: '#bestil .nede-note' },
  { sti: '/m-menukort.html', besked: '#mk-tom' },
  { sti: '/bestil/', besked: '#bestil-nede-note' },
  { sti: '/m-tapas.html', besked: '#tapas-nede-note' },
  { sti: '/h-catering.html', besked: null },
];

test.describe('Uden database: ingen reservepriser, men en besked med nummeret', () => {
  for (const s of SIDER) {
    test(s.sti + ' viser ingen priser' + (s.besked ? ' og siger, hvem man ringer til' : ''), async ({ page }) => {
      await åbnUdenDatabase(page, s.sti);
      expect(await synligePriser(page), 'kodens egne priser står på skærmen').toEqual([]);
      if (s.besked) {
        const b = page.locator(s.besked);
        await expect(b, 'fejlbeskeden står der ikke').toBeVisible();
        await expect(b).toContainText(NUMMER);
      }
    });
  }
});

/* ============================================================
   OG NÅR DATABASEN SVARER, ER PRISERNE DER
   ------------------------------------------------------------
   Modstykket. Uden det ville en regel, der ALTID skjulte priserne,
   bestå prøverne ovenfor. Fiksturet har et tapasfad til 145 — et tal,
   hverken designet (199) eller produktionen (179) har.
   ============================================================ */
test.describe('Med database: priserne står, og ingen fejlbesked', () => {
  function data() {
    const d = grunddata();
    d.menu_kategorier.push({ id: 20, afdeling: 'mad', navn: 'Havnens tapas', sortering: 30, aktiv: true });
    d.menu_varer.push({ id: 20, kategori_id: 20, navn: 'Tapasfad', beskrivelse: null,
      pris: 145, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true });
    return d;
  }

  test('menukortet viser priserne — og ikke fejlbeskeden', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { ur: UR, data: data() });
    await expect(page.locator('#mk-kat .mk-pris').first()).toBeVisible();
    expect((await synligePriser(page)).length, 'menukortet viste ingen priser').toBeGreaterThan(0);
    await expect(page.locator('#mk-tom')).toBeHidden();
  });

  test('tapassiden viser ejerens pris — og ikke fejlbeskeden', async ({ page }) => {
    await åbnSkal(page, '/m-tapas.html', { ur: UR, data: data() });
    await expect(page.locator('[data-tapas-pris]')).toBeVisible();
    await expect(page.locator('[data-tapas-pris]')).toContainText('145');
    await expect(page.locator('#tapas-nede-note')).toHaveCount(0);
  });

  test('bestil/ viser varerne med pris — og ikke fejlbeskeden', async ({ page }) => {
    await åbnSkal(page, '/bestil/', { ur: UR, data: data() });
    await page.waitForSelector('#bestil-stykker .stk-linje, #bestil-stykker .stk-pris', { state: 'attached' });
    await expect(page.locator('#bestil-nede-note')).toHaveCount(0);
    await expect(page.locator('#bestil-stykker')).toBeVisible();
  });
});
