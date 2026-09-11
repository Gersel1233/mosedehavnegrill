/* ============================================================
   FIND OS STÅR PÅ HAVNEN  (11/9)
   ------------------------------------------------------------
   Kundens ord: billedet *"skal bruges som baggrundsbillede nede ved
   find os som baggrund og gør det lidt mørkere"*.

   Tre regler, og hver af dem kan gå galt uden at noget ser forkert
   ud på en hurtig skærm:

   1) FOTOET ER LAZY. En CSS-baggrund hentes, i det sekund siden
      tegnes — forsidens fartprøve forbyder et foto før rul, og det
      her ligger nederst.
   2) HVER SKÆRM HENTER SIT EGET. Telefonen det høje billede,
      computeren det brede udsnit. Et spørgsmål til <img src> ville
      bestå, også hvis <source> var væk — prøven læser currentSrc,
      altså det, BROWSEREN valgte.
   3) OVERSKRIFTEN KAN LÆSES, OGSÅ OVER EN HVID SKY. Kontrasten
      regnes mod det lyseste, et foto kan være (hvid), under sløret
      alene. Gennemgangens måler kan ikke se et foto — den læser
      sektionens mørke grund — så uden den her prøve ville et lysere
      slør bestå overalt.
   ============================================================ */
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const kontrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgba = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { rgb: m.slice(0, 3), a: m.length > 3 ? m[3] : 1 }; };
const over = (top, bund) => top.rgb.map((c, i) => c * top.a + bund[i] * (1 - top.a));

test.describe('Find os står på havnen', () => {

  test('fotoet er lazy, dekorativt og ligger i billeder/', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    const img = page.locator('#find .find-bg img');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('loading', 'lazy');
    await expect(img).toHaveAttribute('alt', '');
    await expect(page.locator('#find .find-bg')).toHaveAttribute('aria-hidden', 'true');
    /* Filerne findes — en <img>, der peger på ingenting, er en mørk
       flade, og det kunne ingen se forskel på. */
    for (const f of ['billeder/find-hoej.jpg', 'billeder/find-bred.jpg']) {
      expect(fs.statSync(f).size, f).toBeLessThan(450 * 1024);
    }
  });

  test('hver skærm henter sit eget billede', async ({ page }, info) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await page.locator('#find').scrollIntoViewIfNeeded();
    const img = page.locator('#find .find-bg img');
    await expect.poll(() => img.evaluate((e) => e.complete && e.naturalWidth), { timeout: 10000 }).toBeGreaterThan(0);
    const valgt = await img.evaluate((e) => e.currentSrc);
    const forventet = info.project.name === 'computer' ? 'find-bred.jpg' : 'find-hoej.jpg';
    expect(valgt).toContain(forventet);
  });

  test('sløret ligger over fotoet og dækker hele afsnittet', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await page.locator('#find').scrollIntoViewIfNeeded();
    const m = await page.evaluate(() => {
      const s = document.getElementById('find').getBoundingClientRect();
      const l = document.querySelector('.find-slor').getBoundingClientRect();
      /* Et punkt i sektionens egen luft i venstre kant, og på
         SKÆRMEN: på en telefon er afsnittet højere end skærmen, så
         dens top kan ligge over vinduet — og elementsFromPoint uden
         for vinduet svarer en tom liste (målt 11/9). */
      const x = s.left + 4;
      const y = Math.max(s.top, 0) + 120;
      const stak = document.elementsFromPoint(x, y).map((e) => e.className || e.tagName);
      return { s: [s.width, s.height], l: [l.width, l.height], stak };
    });
    expect(m.l[0]).toBeCloseTo(m.s[0], 0);
    expect(m.l[1]).toBeCloseTo(m.s[1], 0);
    const iSlor = m.stak.indexOf('find-slor');
    const iFoto = m.stak.findIndex((c) => c === 'IMG');
    expect(iSlor, 'sløret findes ikke på det punkt: ' + m.stak.join(' > ')).toBeGreaterThanOrEqual(0);
    expect(iFoto, 'fotoet findes ikke på det punkt').toBeGreaterThan(iSlor);
  });

  test('overskriften kan læses, også hvis fotoet er hvidt under den', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    const f = await page.evaluate(() => ({
      slor: getComputedStyle(document.querySelector('.find-slor')).backgroundColor,
      h2: getComputedStyle(document.querySelector('#find .findhoved h2')).color,
      eyebrow: getComputedStyle(document.querySelector('#find .findhoved .eyebrow')).color,
    }));
    const grund = over(rgba(f.slor), [255, 255, 255]);
    for (const [navn, farve] of [['h2', f.h2], ['eyebrow', f.eyebrow]]) {
      const tekst = over(rgba(farve), grund);
      const k = kontrast(tekst, grund);
      expect(k, `${navn} ${farve} over sløret ${f.slor} på hvid: ${k.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
