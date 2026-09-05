/* ============================================================
   HELE SKÆRMEN — OGSÅ PÅ DE FIRE GAMLE SIDER  (5/9)
   ============================================================
   Kundens ord samme dag: "så meget fullscreen som overhovedet
   muligt" — og bagefter: "tjek gerne selv med telefon POV iphone
   helst om der noget der halter især qr bestillingen".

   Designsiderne fik viewport-fit=cover om formiddagen. MÅLT om
   eftermiddagen: bestil/, bord/, ved-bordet/ og min-bestilling/
   havde det IKKE — netop den side, gæsten sidder med ved bordet.
   De er ældre end designet fra 23/8 og kører på css/style.css.

   ⚠️ OG DEN ANDEN HALVDEL ER DET, DER KOSTEDE EN MÅLING: #hd er
   position:fixed, så sidens indhold følger ikke bjælken af sig
   selv. Med et simuleret hak på 47 px voksede bjælken til 111 px,
   mens overskriften blev stående på 114 — tre px luft. Det er
   --topbjaelke, der holder pladsen fri, og den skal vokse med.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');

/* Mapperne læses af DISKEN. En femte gæsteside i en undermappe
   kan ikke udgives uden at komme med — samme greb som
   siderMedFooter() og gennemgangens sider(). */
function gamleSider() {
  return fs.readdirSync(ROD, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !/^(node_modules|tests|tests-gamle|\.|css|js|billeder|ikoner|fonts|supabase|vaerktoej|menukort|assets|test-results|print|vejledning)/.test(d.name))
    .map((d) => d.name)
    .filter((m) => fs.existsSync(path.join(ROD, m, 'index.html')))
    .filter((m) => {
      const t = fs.readFileSync(path.join(ROD, m, 'index.html'), 'utf8');
      /* En vejviser er ikke en side — den sender videre. */
      return !(t.includes('http-equiv="refresh"') && t.includes('location.replace'));
    });
}

test('der ER gamle gæstesider at måle på', () => {
  /* ⚠️ UDEN DEN HER MÅLER LØKKEN NEDENFOR INGENTING. En tom
     liste består hver eneste regel — arret fra "toBeHidden er
     sandt for et element, der ikke findes" (30/8). */
  const s = gamleSider();
  expect(s.length, 'ingen undersider fundet: ' + s.join(', ')).toBeGreaterThanOrEqual(4);
});

for (const mappe of gamleSider()) {
  test(`/${mappe}/ beder om hele skærmen (viewport-fit=cover)`, () => {
    const t = fs.readFileSync(path.join(ROD, mappe, 'index.html'), 'utf8');
    const m = t.match(/<meta\s+name="viewport"[^>]*>/i);
    expect(m, `/${mappe}/ har intet viewport-meta`).not.toBeNull();
    expect(m[0], `uden cover fylder Safari sikkerhedsområdet med sidens egen flade`)
      .toMatch(/viewport-fit\s*=\s*cover/i);
  });
}

test.describe('Toppen viger for hakket', () => {
  /* ⚠️ env(safe-area-inset-top) kan ikke efterlignes i Chromium,
     men --sikker-top kan — og det er den ENE variabel, alle fire
     bjælker og --topbjaelke henter deres luft fra. Sættes den til
     et tal, opfører siden sig som på en telefon med hak.

     ⚠️ OG TALLET ER 47, ikke et vi har fundet på: det er en
     iPhone 13's inset. */
  const HAK = 47;

  for (const [sti, bjaelke, indhold] of [
    ['/ved-bordet/?bord=7', '.bord-top', 'h1'],
    ['/bestil/', '#hd', '.smoer-hoved h1'],
    ['/bord/', '#hd', '.smoer-hoved h1'],
  ]) {
    test(`${sti}: bjælken OG indholdet flytter sig med hakket`, async ({ page }, info) => {
      test.skip(info.project.name !== 'mobil', 'sikkerhedsområdet er telefonens');
      await åbn(page, sti, {
        ur: '2026-08-06T11:00:00Z',
        data: grunddata({ borde: [{ id: 1, lokation_id: 'mosede', nummer: '7',
          pladser: 4, placering: 'ude', aktiv: true, sortering: 10 }] }),
      });

      const maal = async () => page.evaluate(({ b, i }) => {
        const e = document.querySelector(b), h = document.querySelector(i);
        if (!e || !h) return null;
        return { bjaelke: Math.round(e.getBoundingClientRect().height),
                 indhold: Math.round(h.getBoundingClientRect().top) };
      }, { b: bjaelke, i: indhold });

      const uden = await maal();
      expect(uden, `${bjaelke} eller ${indhold} findes ikke`).not.toBeNull();

      await page.evaluate((v) =>
        document.documentElement.style.setProperty('--sikker-top', v + 'px'), HAK);
      await page.waitForTimeout(100);
      const med = await maal();

      /* Bjælken vokser med hakket — ellers ligger mærket bag
         statuslinjen. */
      expect(med.bjaelke, 'bjælken voksede ikke med hakket')
        .toBe(uden.bjaelke + HAK);
      /* ⚠️ OG LUFTEN MELLEM DEM ER UÆNDRET. To uafhængige tal:
         bjælkens højde mod indholdets top. Det er DEN, der faldt
         i målingen — bjælken voksede, indholdet blev stående. */
      expect(med.indhold - med.bjaelke, 'indholdet fulgte ikke bjælken')
        .toBe(uden.indhold - uden.bjaelke);
    });
  }
});

test.describe('Et valg er rødt, ikke sort', () => {
  /* ⚠️ TO SIDER MOD HINANDEN, IKKE ÉN MOD SIG SELV. Reglen er, at
     "det her er valgt" ser ens ud, uanset hvilken side gæsten står
     på — og hun går imellem dem i ét klik. Et spørgsmål til
     chippen om dens egen farve ville bestå, også hvis dagen en dag
     blev grøn. */
  test('den valgte chip ved bordet har SAMME farve som den valgte dag på bord/',
    async ({ page }) => {
      await åbn(page, '/bord/', { ur: '2026-08-06T11:00:00Z', data: grunddata() });
      await page.locator('.dag').first().click();
      await page.waitForTimeout(200);
      const dag = await page.locator('.dag.valgt').first()
        .evaluate((e) => getComputedStyle(e).backgroundColor);

      await åbn(page, '/ved-bordet/?bord=7', {
        ur: '2026-08-06T11:00:00Z',
        data: grunddata({ borde: [{ id: 1, lokation_id: 'mosede', nummer: '7',
          pladser: 4, placering: 'ude', aktiv: true, sortering: 10 }] }),
      });
      const chip = await page.locator('.kort-chip.on').first()
        .evaluate((e) => getComputedStyle(e).backgroundColor);

      expect(chip, 'filteret ved bordet markerer et valg med en anden farve end dagen')
        .toBe(dag);
      /* Og den skal være mærkets røde — ikke bare ens. To sorte
         ville også være ens. */
      expect(chip, 'et valg markeres ikke med mærkets røde').toBe('rgb(214, 42, 58)');
    });
});
