/* ============================================================
   ET FOTO BAG MENUKORTETS KATEGORIER  (13/9)
   Kundens ord: "stegt flæsk med persillesovs som baggrundsbillede
   ... også sortimentet uden på". Prøverne måler, at fotoet står der,
   hvor det skal, at filen findes, og at teksten kan læses mod det
   LYSESTE, fotoet kan være — en hvid sky under sløret.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { åbnSkal, grunddata } = require('./hjaelp');

test.describe('Menukortets kategorier står på et foto', () => {
  test('kategorier med et foto får det — og de andre gør ikke', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    const smoer = page.locator('#mk-kat .panel[data-kategori="Smørrebrød"]');
    await expect(smoer).toHaveClass(/mk-foto-kort/);
    await expect(smoer.locator('.mk-bg img')).toHaveAttribute('src', /selskab-fade\.webp/);
    await expect(smoer.locator('.mk-bg img')).toHaveAttribute('loading', 'lazy');
    await expect(page.locator('#mk-kat .panel[data-kategori="Softice og vafler"] .mk-bg img'))
      .toHaveAttribute('src', /havn-softice\.jpg/);
    // Øl har sit eget foto fra 13/9; "Vælg fyld" har med vilje ingen.
    const fyld = page.locator('#mk-kat .panel[data-kategori="Vælg fyld til smørrebrødet"]');
    await expect(fyld, 'vagt: fyld-kortet skal findes').toHaveCount(1);
    await expect(fyld).not.toHaveClass(/mk-foto-kort/);
    await expect(fyld.locator('.mk-bg')).toHaveCount(0);
  });

  /* DE FIRE, DER STOD UDEN FOTO (25/9). Navnene er produktionens.
     ⚠️ "Andre retter" indeholder "retter" — den må ikke tage stegt
     flæsks foto, og "Retter" må ikke miste det. */
  test('Andre retter, Sandwich, Snacks og Reception får hver sit foto', async ({ page }) => {
    const d = grunddata();
    const nye = [
      [40, 'Retter', /havn-retter\.jpg/],
      [41, 'Andre retter', /menu-andre-retter\.jpg/],
      [42, 'Sandwich', /menu-sandwich\.jpg/],
      [43, 'Snacks og slik', /menu-snacks\.jpg/],
      [44, 'Reception og pindemad', /menu-pindemad\.jpg/],
    ];
    for (const [id, navn] of nye) {
      d.menu_kategorier.push({ id, afdeling: 'mad', navn, sortering: id, aktiv: true });
      d.menu_varer.push({ id: id * 10, kategori_id: id, navn: navn + ' vare', beskrivelse: null, pris: 50,
        fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true });
    }
    await åbnSkal(page, '/m-menukort.html', { data: d });
    for (const [, navn, fil] of nye) {
      const img = page.locator(`#mk-kat .panel[data-kategori="${navn}"] .mk-bg img`);
      await expect(img, navn).toHaveCount(1);
      await expect(img, navn).toHaveAttribute('src', fil);
    }
  });

  /* ⚠️ BUNDEN UNDER FOTOET SKAL VÆRE MØRK OG TÆT. Fotoet er højst
     skærmhøjt og sticky, så i et langt kort er der stykker af kortet
     uden foto — dér ville husets hvide .panel skinne op under sløret.
     Og gennemgangens kontrastmåler ser ikke kortene (#mk-kat står på
     opacity 0, til man ruller), så reglen har sin egen prøve. */
  test('fotokortet har en tæt, mørk bund under fotoet', async ({ page }, info) => {
    /* ⚠️ TELEFONENS KORT (26/9). På en computer står varerne ikke på
       fotoet — det er et bånd øverst med kun navnet på, og varerne
       står på den lyse bund (menukort.css, "ET TRYKT KORT"). Båndets
       egen læsbarhed måles i prøven nedenfor. */
    test.skip(info.project.name === 'computer', 'computerens kort har fotoet som et bånd, varerne står på lys bund');
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    const kort = page.locator('#mk-kat .panel.mk-foto-kort').first();
    await expect(kort).toHaveCount(1);
    const bund = await kort.evaluate((k) => getComputedStyle(k).backgroundColor);
    const t = (bund.match(/[\d.]+/g) || []).map(Number);
    expect(t.length > 3 ? t[3] : 1, 'bunden er gennemsigtig: ' + bund).toBeGreaterThanOrEqual(0.95);
    expect(Math.max(t[0], t[1], t[2]), 'bunden er ikke mørk: ' + bund).toBeLessThan(60);
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

  test('teksten kan læses, også hvor fotoet er lyst', async ({ page }, info) => {
    test.skip(info.project.name === 'computer', 'computerens bånd måles i sin egen prøve nedenfor');
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    const kort = page.locator('#mk-kat .panel.mk-foto-kort').first();
    await expect(kort).toHaveCount(1);
    const fund = await kort.evaluate((k) => {
      const tal = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const slor = k.querySelector('.mk-slor');
      if (!slor) return ['intet slør'];
      const s = tal(getComputedStyle(slor).backgroundColor);
      const a = s.length > 3 ? s[3] : 1;
      const bund = [0, 1, 2].map((i) => a * s[i] + (1 - a) * 255);   // en hvid sky
      const lys = (c) => {
        const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
      };
      const ud = [];
      for (const sel of ['.mk-hoved h3', '.mk-antal', '.mk-linje h4', '.mk-linje p', '.mk-pris']) {
        const el = k.querySelector(sel);
        if (!el) { ud.push(sel + ' findes ikke'); continue; }
        const f = tal(getComputedStyle(el).color);
        const fa = f.length > 3 ? f[3] : 1;
        const farve = [0, 1, 2].map((i) => fa * f[i] + (1 - fa) * bund[i]);
        const [h, l] = [lys(farve), lys(bund)].sort((x, y) => y - x);
        const r = (h + 0.05) / (l + 0.05);
        if (r < 4.5) ud.push(sel + ' ' + r.toFixed(2) + ':1');
      }
      return ud;
    });
    expect(fund, 'tekst, der ikke kan læses mod en lys del af fotoet').toEqual([]);
  });
  /* ============================================================
     COMPUTERENS BÅND KAN LÆSES  (26/9)
     På en computer er fotoet et bredt bånd med kategoriens navn og
     antal nederst; sløret er en gradient, der er tættest dér. Prøven
     regner navnet mod gradientens tætteste stop lagt over en HVID
     sky — det lyseste, fotoet kan være. Et tal udefra: det første
     stop læses af den beregnede stil, ikke skrevet af her.
     ============================================================ */
  test('computerens bånd: navnet kan læses mod en hvid sky', async ({ page }, info) => {
    test.skip(info.project.name !== 'computer', 'båndet findes kun på en bred skærm');
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    const kort = page.locator('#mk-kat .panel.mk-foto-kort').first();
    await expect(kort).toHaveCount(1);
    const m = await kort.evaluate((k) => {
      const tal = (x) => (x.match(/[\d.]+/g) || []).map(Number);
      const gi = getComputedStyle(k.querySelector('.mk-slor')).backgroundImage;
      const stop = gi.match(/rgba?\([^)]*\)/);
      if (!stop) return { fejl: 'ingen gradient: ' + gi };
      const s = tal(stop[0]); const a = s.length > 3 ? s[3] : 1;
      const bund = [0, 1, 2].map((i) => a * s[i] + (1 - a) * 255);
      const lys = (c) => { const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      const ud = {};
      for (const sel of ['.mk-hoved h3', '.mk-antal']) {
        const f = tal(getComputedStyle(k.querySelector(sel)).color); const fa = f.length > 3 ? f[3] : 1;
        const farve = [0, 1, 2].map((i) => fa * f[i] + (1 - fa) * bund[i]);
        const [h, l] = [lys(farve), lys(bund)].sort((x, y) => y - x);
        ud[sel] = +((h + 0.05) / (l + 0.05)).toFixed(2);
      }
      /* Og varerne står IKKE på fotoet: første linje er under båndet. */
      ud.varerUnder = k.querySelector('.mk-linje').getBoundingClientRect().top >= k.querySelector('.mk-bg').getBoundingClientRect().bottom - 1;
      return ud;
    });
    expect(m.fejl).toBeUndefined();
    expect(m['.mk-hoved h3'], 'kategoriens navn på båndet').toBeGreaterThanOrEqual(4.5);
    expect(m['.mk-antal'], 'antallet på båndet').toBeGreaterThanOrEqual(4.5);
    expect(m.varerUnder, 'varerne står på fotoet på en computer').toBe(true);
  });
});
