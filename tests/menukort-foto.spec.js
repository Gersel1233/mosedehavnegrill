/* ============================================================
   FOTOERNE I MENUKORTETS KAPITLER  (26/9)
   ------------------------------------------------------------
   Her stod fra 13/9 "et foto bag kategorierne": fotoet lå sløret
   bag teksten, og prøverne regnede kontrasten mod en hvid sky. Mikkels
   ord 26/9: *"der er stadig nogle beskæringer der halter"* — og det
   nye kort står som de trykte kort, med fotoerne SKARPT og for sig
   selv over hvert kapitel, beskåret på maden.

   Prøverne måler: hvert kapitel får sine kategoriers fotos (FOTOS i
   js/skal/menukort.js — én liste), filerne findes og er lette nok,
   fotoet er pynt (alt="" og lazy), der står ingen tekst oven på et
   foto, og intet foto stikker ud over en telefons kant.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { åbnSkal, grunddata } = require('./hjaelp');

function medKategorier(navne) {
  const d = grunddata();
  navne.forEach(([navn, afd], i) => {
    const id = 70 + i;
    d.menu_kategorier.push({ id, afdeling: afd || 'mad', navn, sortering: 30 + i, aktiv: true });
    d.menu_varer.push({ id: 700 + i, kategori_id: id, navn: navn + ' vare', beskrivelse: null, pris: 50,
      fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true });
  });
  return d;
}
const src = (page, kap) => page.$$eval(`#${kap} .mk-foto img`, (l) => l.map((i) => i.getAttribute('src')));

test.describe('Fotoerne i menukortets kapitler', () => {
  test('hvert kapitel får sine egne kategoriers fotos', async ({ page }) => {
    const d = medKategorier([['Retter'], ['Andre retter'], ['Sandwich'], ['Snacks og slik', 'drikke'],
      ['Reception og pindemad']]);
    await åbnSkal(page, '/m-menukort.html', { data: d });
    expect(await src(page, 'kapitel-grillen')).toEqual(['billeder/havn-retter.jpg']);
    expect(await src(page, 'kapitel-burgere')).toEqual(['billeder/menu-andre-retter.jpg', 'billeder/menu-sandwich.jpg']);
    expect(await src(page, 'kapitel-smoerrebroed')).toEqual(['billeder/selskab-fade.webp']);
    expect(await src(page, 'afsnit-is')).toEqual(['billeder/havn-softice.jpg']);
    expect(await src(page, 'kapitel-bar')).toEqual(['billeder/havn-oel.jpg', 'billeder/menu-snacks.jpg']);
    expect(await src(page, 'kapitel-selskab')).toEqual(['billeder/menu-pindemad.jpg']);
    /* "Vælg fyld" har med vilje intet foto (FOTOS: null) — og arver
       ikke smørrebrødets: kapitlet har kun det ene. */
  });

  test('fotoet er pynt — tomt alt, hentes først når man ruller derned', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    const img = page.locator('#mk-kat .mk-foto img').first();
    await expect(img).toHaveAttribute('alt', '');
    await expect(img).toHaveAttribute('loading', 'lazy');
    await expect(page.locator('#mk-kat .mk-fotos').first()).toHaveAttribute('aria-hidden', 'true');
  });

  test('der står ingen tekst oven på et foto', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    await expect(page.locator('#mk-kat .mk-foto').first()).toBeAttached();
    const tekst = await page.$$eval('#mk-kat .mk-foto', (l) => l.map((f) => f.textContent.trim()).join(''));
    expect(tekst).toBe('');
    // Og varelinjerne står under fotorækken, ikke inde i den
    const over = await page.evaluate(() => {
      const r = document.querySelector('#mk-kat .mk-fotos').getBoundingClientRect();
      const l = document.querySelector('#mk-kat .mk-kapitel .mk-linje').getBoundingClientRect();
      return l.top >= r.bottom - 1;
    });
    expect(over, 'en varelinje står oven på fotoerne').toBe(true);
  });

  test('intet foto stikker ud over skærmens kant', async ({ page }) => {
    const d = medKategorier([['Andre retter'], ['Sandwich'], ['Burgere'], ['Pølser']]);
    await åbnSkal(page, '/m-menukort.html', { data: d });
    await expect(page.locator('#kapitel-burgere .mk-foto').first()).toBeAttached();
    const ud = await page.evaluate(() => [...document.querySelectorAll('#mk-kat .mk-foto')]
      .filter((f) => getComputedStyle(f).display !== 'none')
      .map((f) => f.getBoundingClientRect())
      .filter((r) => r.right > innerWidth + 1 || r.left < -1).length);
    expect(ud).toBe(0);
  });

  test('hver fil, kortet peger på, findes på disken', async () => {
    const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'skal', 'menukort.js'), 'utf8');
    const filer = [...js.matchAll(/'(billeder\/[^']+\.(?:jpg|webp))'/g)].map((m) => m[1]);
    expect(filer.length, 'kortet peger ikke på nogen fotos').toBeGreaterThanOrEqual(10);
    for (const f of filer) {
      expect(fs.existsSync(path.join(__dirname, '..', f)), f + ' findes ikke').toBe(true);
      expect(fs.statSync(path.join(__dirname, '..', f)).size, f + ' er for tungt').toBeLessThan(260000);
    }
  });
});
