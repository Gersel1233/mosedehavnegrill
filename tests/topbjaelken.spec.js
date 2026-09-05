/* ============================================================
   TOPBJÆLKEN: MÆRKET OG DE TO KNAPPER  (5/9)
   ============================================================
   Kundens ord: *"det der runde is ikon i øverste venstre hjørne
   konstant skal væk"* og *"tilbage knappen skal være liquid glass
   stadig men forsvinder altså i de hvide environments"*.

   ⚠️ MÆRKET ER FLYTTET, IKKE FJERNET. Han valgte selv, at det
   bliver på FORSIDEN og forsvinder fra de ni undersider. Det er
   en ændring af hans egen ordre fra 29/8 (*"logoet alle steder"*),
   og derfor er de to gamle prøver vendt MED noter i stedet for
   slettet. Undersiderne siger stadig, hvem de er: navnet står som
   tekst i footeren på hver eneste af dem.

   ⚠️ OG KNAPPERNE STOD I 1,06:1. Målt på en iPhone 13 på otte
   sider, både øverst og efter at bjælken havde fæstnet sig: den
   mørke glasvariant lader ternet skinne igennem, og ternet har
   BÅDE røde og næsten hvide felter — så en hvid pil forsvandt i
   de lyse. Reglen fandtes for burgeren og kun i `.stuck`; pilen
   var glemt, og det er den eneste vej tilbage på de sider.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');

/* Designsiderne læses af MAPPEN, så en tiende underside ikke kan
   udgives med mærket tilbage i toppen uden at nogen ser det. */
function undersider() {
  return fs.readdirSync(ROD)
    .filter((f) => /^(h-|m-)[a-z-]+\.html$/.test(f) || f === 'historien.html');
}

function lum(c) {
  const [r, g, b] = c.match(/\d+/g).map(Number).map((v) => {
    v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function kontrast(a, b) {
  const l1 = lum(a); const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

test.describe('Mærket i toppen', () => {
  test('forsiden bærer det — begge varianter', async ({ page }) => {
    /* Den lille i bjælken og den fulde med ringteksten i heroen.
       Det er forsidens identitet, og den må ikke gå tabt, fordi
       nogen rydder op i undersidernes top. */
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await expect(page.locator('.topbar svg.crest.lille')).toHaveCount(1);
    const hero = page.locator('.hero-badge svg.crest');
    await expect(hero).toHaveCount(1);
    await expect(hero).toHaveAttribute('aria-label', /Mosede Havnecafe/);
  });

  test('undersiderne har ikke mærket i topbjælken', () => {
    const med = undersider().filter((f) => {
      const s = fs.readFileSync(path.join(ROD, f), 'utf8');
      const m = s.match(/<div class="topbar"[\s\S]*?<\/div>\s*(?=\n|<div|<section|<main)/);
      return m ? /class="crest/.test(m[0]) : /class="crest/.test(s);
    });
    expect(med, 'mærket er tilbage i en undersides topbjælke').toEqual([]);
  });

  test('men hver underside siger stadig, hvem den er', () => {
    /* ⚠️ DEN ANDEN HALVDEL, og uden den måler den første ingenting.
       En side må gerne miste cirklen i toppen; den må ikke miste
       sin identitet. Navnet står i footeren på hver eneste. */
    const uden = undersider().filter((f) =>
      !fs.readFileSync(path.join(ROD, f), 'utf8').includes('Mosede Havnecafe'));
    expect(undersider().length, 'ingen undersider fundet').toBeGreaterThan(8);
    expect(uden, 'en underside står helt uden forretningens navn').toEqual([]);
  });
});

test.describe('Tilbage-pilen og menuen kan ses', () => {
  /* Ternet har både røde og næsten hvide felter, så knappen skal
     have sin EGEN flade. Blæk på den lyse glasflade måler over
     11:1 mod begge tern-farver; hvid på den mørke målte 1,06. */
  for (const side of ['/m-menukort.html', '/h-selskaber.html', '/m-tapas.html']) {
    test(side + ': knapperne er blæk på lys glas, ikke hvide', async ({ page }) => {
      await åbnSkal(page, side, { data: grunddata() });
      const knapper = page.locator('.topbar .g.icn');
      const antal = await knapper.count();
      expect(antal, 'ingen knapper i topbjælken at måle på').toBeGreaterThan(0);
      for (let i = 0; i < antal; i++) {
        const r = await knapper.nth(i).evaluate((e) => {
          const c = getComputedStyle(e);
          return { farve: c.color, fyld: c.backgroundColor };
        });
        expect(r.farve, 'ikonet er hvidt og forsvinder i ternets lyse felter')
          .not.toBe('rgb(255, 255, 255)');
        expect(kontrast(r.farve, 'rgb(255, 255, 255)'),
          'ikonet kan ikke ses mod en hvid flade').toBeGreaterThan(4.5);
      }
    });
  }

  test('og de er stadig liquid glass', async ({ page }) => {
    /* ⚠️ KUNDENS EGEN BETINGELSE: *"skal være liquid glass
       stadig"*. En knap med en solid flade ville bestå
       kontrastprøven ovenfor og være en helt anden knap. */
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    const k = page.locator('.topbar .g.icn').first();
    const r = await k.evaluate((e) => {
      const c = getComputedStyle(e);
      return {
        slør: c.backdropFilter || c.webkitBackdropFilter,
        fyld: c.backgroundColor,
        kant: c.boxShadow,
      };
    });
    expect(r.slør, 'sløringen er væk — så er det ikke glas længere').toMatch(/blur/);
    expect(r.fyld, 'fladen er solid, ikke glas').toMatch(/rgba\(/);
    expect(r.kant, 'linsekanten indeni er væk').toMatch(/inset/);
  });

  test('historien beholder den mørke — to sider mod hinanden', async ({ page }) => {
    /* ⚠️ ET SPØRGSMÅL TIL ÉN SIDE VILLE BESTÅ, også hvis alle ti
       blev ens. Historien er sort med messing; en lys glasknap
       ville være en hvid klat i et cinematisk hjørne.

       ⚠️ OG DET ER historien.css, DER BESKYTTER DEN — ikke en
       undtagelse i det fælles ark. `.hist .topbar .g.icn.dark`
       vejer 0,4,0 mod den fælles regels 0,3,0. Falsifikationen
       fandt det: en `body:not(.hist)`-garde i havnegrillen.css
       kunne fjernes, uden at noget faldt. */
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    const lys = await page.locator('.topbar .g.icn').first().evaluate((e) => getComputedStyle(e).color);
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const mørk = await page.locator('.topbar .g.icn').first().evaluate((e) => getComputedStyle(e).color);
    expect(mørk, 'historien fik den lyse knap med').not.toBe(lys);
    expect(kontrast(mørk, 'rgb(11, 9, 8)'), 'pilen kan ikke ses på det sorte').toBeGreaterThan(4.5);
  });
});
