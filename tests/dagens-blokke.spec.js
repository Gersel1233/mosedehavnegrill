// @ts-check
/* ============================================================
   BLOKKENE BAG DAGENS RET OG UGENS RETTER  (12/9)
   ------------------------------------------------------------
   Kundens ord: "gør blokkene pænere også dagensret tingen når der er
   en". Filmen bag de to afsnit er væk igen på hans ord ("kontrasten og
   rækkefølgen med billed gav ikke mening der"), og de står på sidens
   creme. Prøverne måler det, et øje ser, og holder to elementer op
   mod hinanden i stedet for at spørge et element om sin egen regel.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

const UR = '2026-08-07T10:00:00Z';
const ret = (id, dato, navn, beskrivelse, pris) => ({
  id, lokation_id: 'mosede', dato, navn, beskrivelse, pris,
  antal: 40, antal_tilbage: 28, udsolgt: false, sortering: 1,
});
async function åbnUgen(page) {
  const d = grunddata();
  d.dagens_retter = [
    ret(1, '2026-08-07', 'Boller i karry', 'Med ris.', 109),
    ret(2, '2026-08-08', 'Stegt flæsk med persillesovs',
      'Sprødt flæsk, nye kartofler og hjemmerørt persillesovs med masser af persille.', 125),
  ];
  await åbnSkal(page, '/index.html', { ur: UR, data: d });
  await expect(page.locator('#ugen .day .pr')).toHaveCount(2);
}

test.describe('Blokkene bag dagens retter', () => {

  test('der er ingen film bag dagens ret og ugens retter', async ({ page }) => {
    await åbnSkal(page, '/index.html', { ur: UR, data: grunddata() });
    await expect(page.locator('#dag-baand, #ugen video, #idag video')).toHaveCount(0);
  });

  test('prisen står i bunden — i samme højde på to kort med hver sin tekst', async ({ page }) => {
    /* ⚠️ TO KORT MED FORSKELLIG LÆNGDE TEKST. Med én ret ville en pris,
       der stod lige under teksten, også "stå i bunden". */
    await åbnUgen(page);
    const m = await page.evaluate(() => {
      const kort = [...document.querySelectorAll('#ugen .day')].filter((k) => k.querySelector('.pr'));
      return kort.map((k) => ({
        pris: k.querySelector('.pr').getBoundingClientRect().bottom,
        tekst: k.querySelector('p').getBoundingClientRect().bottom,
      }));
    });
    expect(m.length).toBe(2);
    expect(Math.abs(m[0].tekst - m[1].tekst), 'teksterne er lige lange — prøven måler ingenting')
      .toBeGreaterThan(10);
    expect(Math.abs(m[0].pris - m[1].pris), 'priserne står i hver sin højde').toBeLessThan(1.5);
  });

  test('i dag er mærket — og kun i dag', async ({ page }) => {
    await åbnUgen(page);
    const s = await page.evaluate(() => [...document.querySelectorAll('#ugen .day')]
      .slice(0, 2).map((k) => getComputedStyle(k).boxShadow));
    expect(s[0], 'i dag har ingen rød ring').toContain('214, 42, 58');
    expect(s[1], 'i morgen har også en rød ring').not.toContain('214, 42, 58');
  });

  test('ugestriben klipper ikke kortenes skygge af', async ({ page }) => {
    /* ⚠️ .week er en rullebeholder, og den klipper alt uden for sin
       kasse. --skygge-let kaster 12 px ned med 30 px slør, så der skal
       være luft INDE i striben under kortet. Kassen og kortet er to
       elementer; et spørgsmål til .week om dens egen padding ville
       bestå, også hvis kortene voksede ned i den. */
    await åbnUgen(page);
    /* ⚠️ RUL FREM FØRST. Designets .rev flytter kortene 12 px ned, til
       de er afsløret — målt uden rulning stod der 24 og ikke 36, og
       prøven målte indtoningen og ikke luften. */
    await page.locator('#ugen .week').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('#ugen .day').first()
      .evaluate((e) => getComputedStyle(e).transform), { timeout: 5000 }).toBe('none');
    const m = await page.evaluate(() => {
      const w = document.querySelector('#ugen .week').getBoundingClientRect();
      const d = document.querySelector('#ugen .day').getBoundingClientRect();
      return { under: w.bottom - d.bottom, over: d.top - w.top };
    });
    expect(m.under, 'ingen plads til skyggen under kortet').toBeGreaterThanOrEqual(30);
    expect(m.over, 'ingen plads til skyggen over kortet').toBeGreaterThanOrEqual(16);
  });

  test('prisen på kortet kan læses', async ({ page }) => {
    await åbnUgen(page);
    const f = await page.evaluate(() => {
      const e = document.querySelector('#ugen .day .pr');
      const c = getComputedStyle(e);
      return { farve: c.color, bund: c.backgroundColor, kort: getComputedStyle(e.closest('.day')).backgroundColor };
    });
    const tal = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { rgb: m.slice(0, 3), a: m.length > 3 ? m[3] : 1 }; };
    const over = (t, b) => t.rgb.map((c, i) => c * t.a + b[i] * (1 - t.a));
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const kort = tal(f.kort).rgb;
    const bund = over(tal(f.bund), kort);
    const tekst = over(tal(f.farve), bund);
    const [x, y] = [lum(tekst), lum(bund)].sort((a, b) => b - a);
    const k = (x + 0.05) / (y + 0.05);
    expect(k, `prisen ${f.farve} på ${f.bund}: ${k.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});
