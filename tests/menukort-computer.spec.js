/* ============================================================
   MENUKORTET PÅ EN COMPUTER ER ET TRYKT KORT  (26/9)
   ------------------------------------------------------------
   Mikkels ord: *"du kan se det ikke er desktop egnet, cinematisk og
   bare generelt rodet"* — med et skærmbillede af tre spalter kort i
   vidt forskellig højde, store huller og en liste ude til venstre,
   der løb ud over skærmens kant.

   Prøverne måler det, øjet så: at listen passer i skærmen og ruller
   for sig selv, at kategorierne ikke er kasser, og at priserne i en
   spalte flugter. Reglerne bor i menukort.css ("ET TRYKT KORT").
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

test.describe('Menukortet på en computer', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'computer', 'reglen gælder den brede skærm');
    /* Halvdelen af varerne får en beskrivelse. Det er DEM, der får en
       pil og kan trykkes — og pilen var det, der skubbede netop deres
       priser ind fra kanten. Uden beskrivelser ville prisprøven bestå
       med den gamle regel (set 26/9). */
    const d = grunddata();
    d.menu_varer.forEach((v, i) => { if (i % 2 === 0) v.beskrivelse = 'En linje om ' + v.navn.toLowerCase() + '.'; });
    await åbnSkal(page, '/m-menukort.html', { data: d });
    await expect(page.locator('#mk-kat .panel').nth(2)).toBeAttached();
  });

  test('listen ude til venstre passer i skærmen og ruller for sig selv', async ({ page }) => {
    const m = await page.evaluate(() => {
      const h = document.getElementById('mk-hop');
      const cs = getComputedStyle(h);
      return { maks: parseFloat(cs.maxHeight), vindue: innerHeight, ruller: cs.overflowY,
        position: cs.position, knapper: h.querySelectorAll('button').length };
    });
    expect(m.knapper, 'listen er tom — prøven måler ingenting').toBeGreaterThan(2);
    expect(m.position).toBe('sticky');
    expect(m.maks, 'listen kan blive højere end skærmen').toBeLessThanOrEqual(m.vindue);
    expect(['auto', 'scroll']).toContain(m.ruller);
  });

  test('kategorierne er ikke kasser — og står i hele spaltens bredde', async ({ page }) => {
    const m = await page.evaluate(() => {
      /* 26/9: kortet står i to spalter som det trykte kort — hvert
         afsnit skal fylde SIN spalte (.mk-spalte), ikke hele siden. */
      return [...document.querySelectorAll('#mk-kat .panel')].map((p) => {
        const cs = getComputedStyle(p);
        const kat = p.closest('.mk-spalte').getBoundingClientRect();
        return { navn: p.dataset.kategori, skygge: cs.boxShadow, grund: cs.backgroundColor,
          bredde: Math.round(p.getBoundingClientRect().width), spalte: Math.round(kat.width) };
      });
    });
    for (const k of m) {
      expect(k.skygge, k.navn + ' har en skygge som et kort').toBe('none');
      expect(k.grund, k.navn + ' har en flade som et kort').toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
      /* Tallet udefra: spaltens egen bredde — ikke de 640 px, huset
         ellers holder et .panel på. */
      expect(k.bredde, k.navn + ' står ikke i hele spalten').toBeGreaterThanOrEqual(k.spalte - 2);
    }
  });

  test('priserne i en spalte flugter', async ({ page }) => {
    const skæve = await page.evaluate(() => {
      const ud = [];
      document.querySelectorAll('#mk-kat .panel').forEach((p) => {
        const kanter = {};
        p.querySelectorAll('.mk-linje').forEach((l) => {
          const pris = l.querySelector('.mk-pris');
          if (!pris) return;
          const spalte = Math.round(l.getBoundingClientRect().left);
          const højre = Math.round(pris.getBoundingClientRect().right);
          (kanter[spalte] = kanter[spalte] || []).push(højre);
        });
        Object.values(kanter).forEach((k) => {
          if (Math.max(...k) - Math.min(...k) > 1) ud.push(p.dataset.kategori + ': ' + k.join(','));
        });
      });
      return ud;
    });
    expect(skæve, 'priser i samme spalte, der ikke flugter').toEqual([]);
  });

  test('telefonens tegn ved hver vare står ikke på det trykte kort', async ({ page }) => {
    const synlige = await page.evaluate(() => [...document.querySelectorAll('#mk-kat .mk-vare-tegn')]
      .filter((e) => getComputedStyle(e).display !== 'none').length);
    expect(synlige).toBe(0);
  });
});
