// @ts-check
/* ============================================================
   QR-SIDEN STÅR PÅ LUGEN — MØRKT GLAS SOM FORSIDENS BESTILLING  (12/9)
   ------------------------------------------------------------
   Kundens ord: "samme glowup til qr bestillingssiden". Forlægget er
   #bestil på forsiden: ejerens foto af lugen, det fælles slør og
   formularen som mørkt glas med lys tekst.

   ⚠️ GENNEMGANGENS KONTRASTMÅLER KAN IKKE SE ET FOTO. Den går op til
   den første flade over 90 % og finder sidens mørke grund — så hvid
   tekst består dér, uanset hvad fotoet viser. Prøven her regner derfor
   hver tekst mod det LYSESTE, fotoet kan være — en hvid sky — gennem
   sløret, glasset og rækken. Samme regnestykke som find-foto.spec.js.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const kontrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgba = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { rgb: m.slice(0, 3), a: m.length > 3 ? m[3] : 1 }; };
const over = (top, bund) => top.rgb.map((c, i) => c * top.a + bund[i] * (1 - top.a));

function data() {
  const g = grunddata({ borde: [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 }] });
  g.menu_kategorier = [
    { id: 1, afdeling: 'mad', navn: 'Smørrebrød', sortering: 6, aktiv: true, note: 'På toastbrød eller rugbrød' },
    { id: 9, afdeling: 'drikke', navn: 'Øl', sortering: 40, aktiv: true },
  ];
  g.menu_varer = [
    { id: 1, kategori_id: 1, navn: 'Havnens all in one', beskrivelse: 'Med bacon, rødbeder og remoulade.', pris: 89, fremhaevet: true, udsolgt: false, sortering: 1, aktiv: true },
    { id: 2, kategori_id: 1, navn: 'Røget ål', beskrivelse: 'Med røræg.', pris: 75, fremhaevet: false, udsolgt: false, sortering: 2, aktiv: true },
    { id: 3, kategori_id: 9, navn: 'Fadøl, lille', beskrivelse: null, pris: 35, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true },
    { id: 4, kategori_id: 9, navn: 'Fadøl, stor', beskrivelse: null, pris: 55, fremhaevet: false, udsolgt: false, sortering: 2, aktiv: true },
  ];
  g.indstillinger = { ...g.indstillinger, bestilbare_kategorier: [9] };
  return g;
}

async function åbnBord(page) {
  await åbn(page, '/ved-bordet/?bord=7', { ur: '2026-08-06T11:00:00Z', data: data() });
  await expect(page.locator('#bestil-form')).toBeVisible();
  await expect(page.locator('#bestil-stykker .stk-linje').first()).toBeVisible();
}

test.describe('QR-siden står på lugen', () => {

  test('fotoet er ejerens eget af lugen, og det er dekorativt', async ({ page }) => {
    await åbnBord(page);
    const img = page.locator('.bord-bg img');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('alt', '');
    await expect(page.locator('.bord-bg')).toHaveAttribute('aria-hidden', 'true');
    // Samme fil som forsidens bestilling — gæsten ser den samme luge to steder.
    expect(await img.getAttribute('src')).toContain('billeder/bestil-luge.jpg');
    await expect.poll(() => img.evaluate((e) => e.naturalWidth), 'fotoet blev ikke hentet').toBeGreaterThan(0);
  });

  test('formularen er glas — og teksten kan læses over en hvid sky', async ({ page }) => {
    await åbnBord(page);
    const f = await page.evaluate(() => {
      const c = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).color : null; };
      const bg = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).backgroundColor : null; };
      const k = getComputedStyle(document.querySelector('#bestil-form'));
      return {
        slor: bg('.bord-slor'), kort: k.backgroundColor, bf: k.backdropFilter || k.webkitBackdropFilter || '',
        raekke: bg('#bestil-stykker .stk-linje:not(.valgt)'),
        vaerktoej: bg('.kort-vaerktoej'), soegBg: bg('.kort-soeg'), chipBg: bg('.kort-chip:not(.on)'),
        feltBg: bg('#bestil-navn'),
        direkte: { logo: c('.bord-top .logo'), titel: c('#bord-titel'), manchet: c('#bord-manchet') },
        glas: {
          overskrift: c('#bestil-form .liste-titel'), afsnit: c('.kort-gruppe-titel'),
          note: c('.kort-gruppe-note'), etiket: c('label[for="bestil-navn"]'),
          valgfri: c('#bestil-form .valgfri'), jura: c('#bestil-form .jura-ved-send'),
          link: c('#bestil-form .jura-ved-send a'), sendNote: c('#bestil-form .send-note'),
        },
        raekkeTekst: {
          navn: c('#bestil-stykker .stk-linje:not(.valgt) .navn'),
          beskrivelse: c('#bestil-stykker .stk-linje:not(.valgt) .desc'),
          pris: c('#bestil-stykker .stk-linje:not(.valgt) .stk-pris'),
        },
        soeg: c('.kort-soeg'), chip: c('.kort-chip:not(.on)'), felt: c('#bestil-navn'),
      };
    });
    expect(f.bf, 'formularen slører ikke fotoet bag sig').toContain('blur');
    expect(rgba(f.kort).a, 'formularen er ikke glas, men en flade').toBeLessThan(0.6);

    const paaSlor = over(rgba(f.slor), [255, 255, 255]);
    const paaGlas = over(rgba(f.kort), paaSlor);
    const bjaelke = over(rgba(f.vaerktoej), paaGlas);
    const maal = (farver, grund, hvor) => {
      for (const [navn, farve] of Object.entries(farver)) {
        expect(farve, `${hvor} ${navn} findes ikke — prøven måler ingenting`).not.toBeNull();
        const k = kontrast(over(rgba(farve), grund), grund);
        expect(k, `${hvor} ${navn} ${farve}: ${k.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    };
    maal(f.direkte, paaSlor, 'sløret:');
    maal(f.glas, paaGlas, 'glasset:');
    maal(f.raekkeTekst, over(rgba(f.raekke), paaGlas), 'rækken:');
    maal({ felt: f.felt }, over(rgba(f.feltBg), paaGlas), 'feltet:');
    maal({ soeg: f.soeg }, over(rgba(f.soegBg), bjaelke), 'søgefeltet:');
    maal({ chip: f.chip }, over(rgba(f.chipBg), bjaelke), 'chippen:');
  });

  /* Den valgte vare er papir — det er den, øjet skal finde. Uden
     resettet ville den arve rækkens hvide tekst på en hvid flade. */
  test('en valgt vare er hvidt papir med blæk', async ({ page }) => {
    await åbnBord(page);
    const r = page.locator('#bestil-stykker .stk-linje').first();
    await r.locator('button', { hasText: '+' }).click();
    await expect(r).toHaveClass(/valgt/);
    /* ⚠️ VENT PÅ FLADEN, IKKE PÅ KLASSEN. Rækken glider over i sin nye
       farve, og en måling i samme øjeblik som klassen sættes læser
       overgangens første billede — glassets hvid .08. Målt: første
       udgave faldt på præcis det tal, mens skuddet viste hvidt papir. */
    await expect.poll(() => r.evaluate((e) => Number((getComputedStyle(e).backgroundColor
      .match(/[\d.]+/g) || [])[3] ?? 1)), { timeout: 3000 }).toBeGreaterThanOrEqual(0.9);
    const m = await r.evaluate((e) => ({
      bg: getComputedStyle(e).backgroundColor,
      navn: getComputedStyle(e.querySelector('.navn')).color,
      pris: getComputedStyle(e.querySelector('.stk-pris')).color,
    }));
    expect(rgba(m.bg).a, 'den valgte vare er ikke en flade').toBeGreaterThanOrEqual(0.9);
    for (const [navn, farve] of [['navn', m.navn], ['pris', m.pris]]) {
      const k = kontrast(rgba(farve).rgb, rgba(m.bg).rgb);
      expect(k, `valgt ${navn} ${farve} på ${m.bg}: ${k.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('fotoet står stille, mens menuen ruller forbi', async ({ page }) => {
    await åbnBord(page);
    const m = await page.evaluate(async () => {
      window.scrollTo({ top: 900, behavior: 'instant' });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return {
        rullet: window.scrollY,
        img: document.querySelector('.bord-bg img').getBoundingClientRect().top,
      };
    });
    expect(m.rullet, 'siden rullede ikke — prøven måler ingenting').toBeGreaterThan(400);
    expect(Math.abs(m.img), 'fotoet rullede med menuen').toBeLessThan(2);
  });
});
