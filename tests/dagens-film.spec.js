// @ts-check
/* ============================================================
   FILMEN BAG DAGENS RET OG UGENS RETTER  (12/9)
   ------------------------------------------------------------
   Kundens ord: "den skal være loop i baggrunden, ligesom ned ved
   find os — her er det bare video". js/skal/dagens-film.js.

   ⚠️ KONTRASTEN REGNES MOD EN HVID PIXEL UNDER SLØRET, som Find os
   og historien (find-foto.spec.js). Gennemgangens måler kan ikke
   se en film — den læser båndets mørke grund.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, rul } = require('./hjaelp');

const video = (page) => page.locator('#dag-baand video');

test.describe('Filmen bag dagens retter', () => {

  test('begge afsnit står i båndet — og rækkefølgen er urørt', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#dag-baand > #idag')).toHaveCount(1);
    await expect(page.locator('#dag-baand > #ugen')).toHaveCount(1);
    await expect(page.locator('#dag-baand .dag-film')).toHaveAttribute('aria-hidden', 'true');
    const v = await video(page).evaluate((el) => ({
      muted: el.muted, loop: el.loop, inline: el.playsInline, preload: el.preload,
    }));
    expect(v).toEqual({ muted: true, loop: true, inline: true, preload: 'none' });
  });

  test('filmen hentes først, når gæsten kommer til den — og spiller så', async ({ page }, info) => {
    const hentet = [];
    page.on('request', (r) => { if (/film\/dagens-/.test(r.url())) hentet.push(r.url()); });
    await åbn(page, '/index.html');
    await page.waitForTimeout(800);
    expect(hentet, 'filmen blev hentet, før gæsten rullede').toEqual([]);
    expect(await video(page).getAttribute('src')).toBeNull();

    await page.locator('#ugen h2').scrollIntoViewIfNeeded();
    const format = info.project.name === 'computer' ? '16x9' : '9x16';
    await expect.poll(() => video(page).evaluate((el) => el.currentSrc)).toContain('dagens-' + format);
    await expect.poll(() => video(page).evaluate((el) => el.poster)).toContain('dagens-' + format + '-start');
    await expect.poll(() => video(page).evaluate((el) => !el.paused && el.currentTime > 0),
      { timeout: 8000 }).toBe(true);

    /* Og den står stille, når den er ude af syne igen. */
    await rul(page, 0);
    await expect.poll(() => video(page).evaluate((el) => el.paused), { timeout: 5000 }).toBe(true);
  });

  test('ved reduceret bevægelse står stillbilledet — ingen film', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const hentet = [];
    page.on('request', (r) => { if (/film\/dagens-/.test(r.url())) hentet.push(r.url()); });
    await åbn(page, '/index.html');
    await page.locator('#ugen h2').scrollIntoViewIfNeeded();
    await expect.poll(() => video(page).evaluate((el) => el.poster)).toContain('-start.jpg');
    await page.waitForTimeout(500);
    expect(await video(page).getAttribute('src')).toBeNull();
    expect(hentet.filter((u) => /\.mp4/.test(u)), 'filmen blev hentet alligevel').toEqual([]);
  });

  test('teksten kan læses, også hvor filmen er lysest', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#ugen .day.closed').first()).toBeAttached();
    const mål = await page.evaluate(() => {
      const tal = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const lys = (r, g, b) => [r, g, b].map((v) => {
        v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
      const bland = (f, b) => { const a = f[3] === undefined ? 1 : f[3]; return [0, 1, 2].map((i) => f[i] * a + b[i] * (1 - a)); };
      /* Sløret alene over en HVID pixel — tonen i top og bund gør
         det kun mørkere, så det her er det lyseste, filmen kan give. */
      const slor = tal(getComputedStyle(document.querySelector('.dag-slor')).backgroundColor);
      const bund = bland(slor, [255, 255, 255]);
      const kontrast = (sel) => {
        const el = document.querySelector(sel);
        const t = bland(tal(getComputedStyle(el).color), bund);
        const a = lys(...t), b = lys(...bund);
        return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2);
      };
      return {
        eyebrow: kontrast('#ugen .eyebrow'),
        h2: kontrast('#ugen h2'),
        dag: kontrast('#ugen .day.closed .dw'),
        dato: kontrast('#ugen .day.closed .dd'),
        tom: kontrast('#ugen .day.closed h4'),
      };
    });
    for (const [hvad, k] of Object.entries(mål)) {
      expect(k, hvad + ' kan ikke læses over filmen').toBeGreaterThanOrEqual(hvad === 'h2' ? 3 : 4.5);
    }
  });
});
