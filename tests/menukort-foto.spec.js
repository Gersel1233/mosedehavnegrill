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
    /* 7/10: Retter (Fisk & klassikere) står på kort 2 efter korrekturen
       af kort 2 — og dens foto flytter med. Kort 1 bæres af morgenmaden. */
    const d = medKategorier([['Morgenmad'], ['Retter'], ['Andre retter'], ['Sandwich'],
      ['Snacks og slik', 'drikke'], ['Reception og pindemad']]);
    await åbnSkal(page, '/m-menukort.html', { data: d });
    expect(await src(page, 'kapitel-grillen')).toEqual(['billeder/havn-morgenmad.jpg']);
    expect(await src(page, 'kapitel-burgere')).toEqual(['billeder/havn-retter.jpg', 'billeder/menu-andre-retter.jpg',
      'billeder/menu-sandwich.jpg']);
    expect(await src(page, 'kapitel-smoerrebroed')).toEqual(['billeder/selskab-fade.webp']);
    expect(await src(page, 'afsnit-is')).toEqual(['billeder/havn-softice.jpg']);
    expect(await src(page, 'kapitel-bar')).toEqual(['billeder/havn-oel.jpg', 'billeder/menu-snacks.jpg']);
    expect(await src(page, 'kapitel-selskab')).toEqual(['billeder/menu-pindemad.jpg']);
    /* "Vælg fyld" har med vilje intet foto (FOTOS: null) — og arver
       ikke smørrebrødets: kapitlet har kun det ene. */
  });

  /* ⚠️ RETTEN STÅR I MIDTEN  (7/10). Mikkel: *"der er nogen billeder hvor
     retterne ikke er i centrum"*. Alle fotos blev beskåret ens (50 % 64 %),
     og i den brede kasse mistede isen sine kugler og softicen sin top.
     ⚠️ TALLENE KOMMER UDEFRA: hvor retten står, er aflæst på et gitter over
     fotoet — ikke læst af FOKUS i koden. Billedets egne mål og kassens
     størrelse er browserens. */
  for (const bredde of [1280, 390]) {
    test(`retten står midt i fotoet (${bredde} px)`, async ({ page }) => {
      const RET = { 'billeder/havn-kugleis.jpg': [52, 45], 'billeder/havn-softice.jpg': [50, 45] };
      await page.setViewportSize({ width: bredde, height: 900 });
      const d = medKategorier([['Kugleis', 'is'], ['Softice og vafler', 'is']]);
      await åbnSkal(page, '/m-menukort.html', { data: d });
      const img = page.locator('#afsnit-is .mk-foto img');
      await expect(img).toHaveCount(2);
      await img.evaluateAll((l) => l.forEach((i) => { i.loading = 'eager'; }));
      await expect.poll(() => img.evaluateAll((l) => l.every((i) => i.complete && i.naturalWidth > 0)))
        .toBe(true);
      await expect.poll(() => img.evaluateAll((l, RET) => Math.max(...l.map((i) => {
        const [fx, fy] = RET[i.getAttribute('src')];
        const op = (i.style.objectPosition || getComputedStyle(i).objectPosition).split(' ');
        const s = Math.max(i.clientWidth / i.naturalWidth, i.clientHeight / i.naturalHeight);
        const w = i.naturalWidth * s, h = i.naturalHeight * s;
        // Procent i CSS er en andel af overskuddet (kasse − billede)
        const px = (v, kasse, billede) => (/%$/.test(v) ? parseFloat(v) / 100 * (kasse - billede) : parseFloat(v));
        const ox = px(op[0], i.clientWidth, w), oy = px(op[1], i.clientHeight, h);
        /* Hvor langt fra kassens midte står retten? Nul, hvis der intet er at
           flytte — eller hvis billedet allerede står ved sin kant: længere kan
           det ikke rykkes uden at vise en tom stribe (telefonens 4:5-kasse er
           næsten lige så høj som fotoet). */
        const afstand = (o, f, b, k) => {
          if (b <= k + 1) return 0;
          const vedKant = Math.abs(o) <= 1 || Math.abs(o - (k - b)) <= 1;
          const d = Math.abs(o + f / 100 * b - k / 2);
          return vedKant ? Math.min(d, 0) : d;
        };
        return Math.max(afstand(ox, fx, w, i.clientWidth), afstand(oy, fy, h, i.clientHeight));
      })), RET), { message: 'retten står ikke midt i kassen (px fra midten)' })
        .toBeLessThanOrEqual(2);
    });
  }

  /* ⚠️ ET LÅNT FOTO STÅR IKKE PÅ KORTET  (7/10). Smørrebrødskortet låner
     "Hjemmelavet lun frikadelle" og "flæskesvær" fra Andre retter og Snacks
     (genbrug), og MÅLT viste det derfor biksemad og chips over smørrebrødet. */
  test('smørrebrødskortet viser smørrebrød — ikke de lånte varers fotos', async ({ page }) => {
    const d = medKategorier([['Andre retter'], ['Snacks og slik', 'drikke']]);
    d.menu_varer.find((v) => v.navn === 'Andre retter vare').navn = 'Hjemmelavet lun frikadelle';
    d.menu_varer.find((v) => v.navn === 'Snacks og slik vare').navn = 'Hjemmelavet flæskesvær';
    await åbnSkal(page, '/m-menukort.html', { data: d });
    await expect(page.locator('#kapitel-smoerrebroed [data-vare="Hjemmelavet lun frikadelle"]')).toHaveCount(1);
    expect(await src(page, 'kapitel-smoerrebroed')).toEqual(['billeder/selskab-fade.webp']);
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
