/* ============================================================
   COMPUTEREN: INTET STÅR UDE I SIDEN  (14/9)
   ------------------------------------------------------------
   Kundens ord: "hele hjemmesiden på desktop skal lige ryddes op,
   noget står ude i siden og fødevarestyrelses tingen er voldsom
   langt … så desktop er perfekt ligesom det er på telefon, men
   selvfølgelig ikke blande det sammen."

   Målt på den udgivne side på 1440 × 900, FØR noget blev rettet:
     · smiley-kortet på forsiden var 1400 px bredt
     · selskabets tre små kort stod fra x = 20 — galleriet over
       dem fra 370
     · ugens to kort begyndte 180 px til venstre for overskriften
     · bestil/ og bord/ havde en smiley-chip på 1210 px
     · bestil/-formularen stod i venstre side med 600 px tomt til
       højre

   ⚠️ HVER PRØVE HOLDER TO UAFHÆNGIGE ELEMENTER OP MOD HINANDEN
   (kortet mod galleriet, ugen mod sin overskrift) — et spørgsmål
   til kortet om dets egen bredde ville bestå, også hvis spalten
   flyttede sig. Og alt er målt med reduceret bevægelse: designets
   .rev flytter elementer med en transform, til de er afsløret.

   ⚠️ KUN COMPUTERPROFILEN. Alle rettelserne står bag
   @media (min-width: 821px), så telefonens udgave er urørt — og
   skal forblive det.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, grunddata } = require('./hjaelp');

const kasse = (page, sel) => page.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), n: e.children.length };
}, sel);

test.describe('Computeren: intet står ude i siden', () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== 'computer', 'måler computerens spalte');
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('smiley-kortet står i spalten, ikke fra kant til kant', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const kort = await kasse(page, '.smiley-kort');
    const gal = await kasse(page, '.selskab > .rev.d1');
    expect(kort && gal, 'vagt: kortet og galleriet skal findes').toBeTruthy();
    expect(kort.w, `smiley-kortet er ${kort.w} px bredt — spalten er ${gal.w}`)
      .toBeLessThanOrEqual(gal.w + 1);
    expect(Math.abs((kort.l + kort.r) / 2 - (gal.l + gal.r) / 2),
      'smiley-kortet står ikke midt i spalten').toBeLessThanOrEqual(2);
  });

  test('selskabets tre kort står under galleriet, ikke ude ved kanten', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const kort = await kasse(page, '.selskab .facts');
    const gal = await kasse(page, '.selskab > .rev.d1');
    expect(kort && gal, 'vagt: kortene og galleriet skal findes').toBeTruthy();
    expect(Math.abs(kort.l - gal.l), `kortene begynder ved ${kort.l}, galleriet ved ${gal.l}`)
      .toBeLessThanOrEqual(2);
    expect(Math.abs(kort.r - gal.r), `kortene slutter ved ${kort.r}, galleriet ved ${gal.r}`)
      .toBeLessThanOrEqual(2);
  });

  test('en uge med få dage står under sin overskrift', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const m = await page.evaluate(() => {
      const uge = document.querySelector('#ugen .week');
      const h2 = document.querySelector('#ugen h2');
      if (!uge || !h2 || !uge.firstElementChild) return null;
      return {
        n: uge.children.length,
        kort: Math.round(uge.firstElementChild.getBoundingClientRect().left),
        overskrift: Math.round(h2.getBoundingClientRect().left),
      };
    });
    expect(m, 'vagt: ugen og dens overskrift skal findes').toBeTruthy();
    expect(m.n, 'vagt: prøvedata har en hel uge — prøven måler ikke det, den skal')
      .toBeLessThanOrEqual(3);
    expect(Math.abs(m.kort - m.overskrift),
      `første kort står ved ${m.kort}, overskriften ved ${m.overskrift}`).toBeLessThanOrEqual(2);
  });

  for (const sti of ['/bestil/', '/bord/']) {
    test(`${sti}: smiley-chippen er en chip, ikke en stribe`, async ({ page }) => {
      await åbn(page, sti, { data: grunddata() });
      const chip = await kasse(page, 'footer .smiley-linje, .smiley-linje');
      expect(chip, 'vagt: chippen skal findes').toBeTruthy();
      const vw = await page.evaluate(() => document.documentElement.clientWidth);
      expect(chip.w, `chippen er ${chip.w} px bred på en skærm på ${vw}`).toBeLessThan(vw / 2);
    });
  }

  test('bestil/: formularen står midt for, ikke i venstre side', async ({ page }) => {
    await åbn(page, '/bestil/', { data: grunddata() });
    const form = await kasse(page, '#bestil-form');
    const vw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(form, 'vagt: formularen skal findes').toBeTruthy();
    expect(form.w, 'vagt: formularen skal være smallere end skærmen').toBeLessThan(vw - 100);
    expect(Math.abs((form.l + form.r) / 2 - vw / 2),
      `formularen står fra ${form.l} til ${form.r} på ${vw}`).toBeLessThanOrEqual(2);
  });
});
