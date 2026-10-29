// @ts-check
/* ============================================================
   QR-SIDEN ER FORSIDENS KORT — LYST PAPIR  (29/10; før: mørkt glas 12/9)
   ------------------------------------------------------------
   Mikkel 29/10: *"kan vi ikke gøre bestillingssiden på QR-bordene i
   opdateret stil som på siden her, med de rigtige menukort i stedet
   for det der skrammel"*. Siden er nu forsidens "Bestil mad"-kort:
   lyst papir, rødt hoved med logo og bordnummer, ternet kant, hvide
   varekort. Fotoet af lugen er væk (det viste skiltet "Grill &
   ishus"). Prøverne nedenfor måler det nye — kontrasten på papiret.
   ------------------------------------------------------------
   DEN GAMLE NOTE (12/9):
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

test.describe('QR-siden er forsidens kort', () => {

  test('ingen foto af lugen, et rødt hoved med logo og bordnummeret', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('.bord-bg')).toHaveCount(0);
    await expect(page.locator('#bord-eyebrow')).toHaveText('Bord 7');
    await expect(page.locator('#bestil > .head .vb-logo svg')).toHaveCount(1);
    await expect(page.locator('.vb-kant')).toHaveCount(1);
    const rod = await page.locator('#bestil > .head').evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(rod).toBe('rgb(214, 42, 58)');
  });

  test('teksten kan læses på papiret — alle de steder, gæsten læser', async ({ page }) => {
    await åbnBord(page);
    const f = await page.evaluate(() => {
      const c = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).color : null; };
      const bg = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).backgroundColor : null; };
      return {
        papir: bg('#bestil'), hoved: bg('#bestil > .head'), raekke: bg('#bestil-stykker .stk-linje:not(.valgt)'),
        feltBg: bg('#bestil-navn'), soegBg: bg('.kort-soeg'), chipBg: bg('.kort-chip:not(.on)'),
        paaHoved: { titel: c('#bord-titel'), manchet: c('#bord-manchet') },
        paaPapir: {
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
    const grund = (s) => over(rgba(s), [255, 255, 255]);
    const maal = (farver, bund, hvor) => {
      for (const [navn, farve] of Object.entries(farver)) {
        expect(farve, `${hvor} ${navn} findes ikke — prøven måler ingenting`).not.toBeNull();
        const k = kontrast(over(rgba(farve), bund), bund);
        expect(k, `${hvor} ${navn} ${farve}: ${k.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    };
    maal(f.paaHoved, grund(f.hoved), 'det røde hoved:');
    maal(f.paaPapir, grund(f.papir), 'papiret:');
    maal(f.raekkeTekst, grund(f.raekke), 'varekortet:');
    maal({ felt: f.felt }, grund(f.feltBg), 'feltet:');
    maal({ soeg: f.soeg }, grund(f.soegBg), 'søgefeltet:');
    maal({ chip: f.chip }, grund(f.chipBg), 'chippen:');
  });

  /* Den valgte vare får husets røde ring — og teksten står stadig på hvidt. */
  test('en valgt vare er hvid med en rød ring', async ({ page }) => {
    await åbnBord(page);
    const r = page.locator('#bestil-stykker .stk-linje').first();
    await r.locator('button', { hasText: '+' }).click();
    await expect(r).toHaveClass(/valgt/);
    await expect.poll(() => r.evaluate((e) => getComputedStyle(e).boxShadow), { timeout: 3000 })
      .toContain('214, 42, 58');
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
});
