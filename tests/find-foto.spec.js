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

  /* ⚠️ KORTENE ER GLAS (11/9). Kundens ord: "find os og åbningstider
     liquid glass og sådan see-through agtig, iOS 18". Glasset er MØRKT
     med lys tekst: fotoet bag det er mørkt, og lys tekst på lyst glas
     ville forsvinde i en hvid sky. Og det skal være GLAS: slører det
     ikke, eller er det tæt, er det et mørkt kort og ikke det, kunden
     bad om. */
  test('kortene er glas — man kan se fotoet igennem', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    const k = await page.locator('#find .findkort').first().evaluate((e) => {
      const s = getComputedStyle(e);
      return { bg: s.backgroundColor, bf: s.backdropFilter || s.webkitBackdropFilter || '' };
    });
    expect(k.bf, 'kortet slører ikke fotoet bag sig').toContain('blur');
    const a = rgba(k.bg).a;
    expect(a, 'kortet er tæt — fotoet kan ikke ses igennem').toBeLessThan(0.6);
    expect(a, 'kortet er helt klart — teksten har intet at stå på').toBeGreaterThan(0.1);
  });

  /* Kontrasten regnes som overskriftens: mod det lyseste, fotoet kan
     være, gennem BÅDE sløret og glasset. Gennemgangens måler kan ikke
     se glas — den springer en flade under 90 % over og læser
     sektionens mørke grund — så uden den her prøve ville et lysere
     glas bestå overalt. Statuslinjen har sin egen pille oven på
     glasset og regnes mod den. */
  test('kortenes tekst kan læses på glasset, også over en hvid sky', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    const f = await page.evaluate(() => {
      const c = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).color : null; };
      const bg = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).backgroundColor : null; };
      return {
        slor: bg('.find-slor'), kort: bg('#find .findkort'), status: bg('#find .fk-status'),
        tekster: {
          overskrift: c('#find .fk-hoved h3'), under: c('#find .fk-under'), adresse: c('#find .fk-adresse'),
          dag: c('#find-tider div span'), tid: c('#find-tider div span:last-child'),
          idag: c('#find-tider div.now'), link: c('#find-kontakt a'), note: c('#find .rute-note'),
          statustekst: c('#find .fk-status'),
        },
      };
    });
    const glas = over(rgba(f.kort), over(rgba(f.slor), [255, 255, 255]));
    for (const [navn, farve] of Object.entries(f.tekster)) {
      expect(farve, navn + ' findes ikke på siden — prøven måler ingenting').not.toBeNull();
      const grund = navn === 'statustekst' ? over(rgba(f.status), glas) : glas;
      const k = kontrast(over(rgba(farve), grund), grund);
      expect(k, `${navn} ${farve} på glasset over en hvid sky: ${k.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
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

/* ============================================================
   HISTORIEN STÅR PÅ ET LUFTFOTO AF HAVNEN  (12/9)
   ------------------------------------------------------------
   Kundens ord: "den måde find os tingene ligger ovenpå det billede i
   baggrunden er perfekt — samme case her". Samme lag og samme tre
   regler som Find os, målt på historie-afsnittet (#omos): lazy og
   dekorativt, hver skærm sit eget billede, og teksten kan læses over
   en hvid sky — gennem sløret alene og gennem sløret OG glasset.
   ============================================================ */
test.describe('Historien står på havnen', () => {

  test('fotoet er lazy, dekorativt og ligger i billeder/', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    const img = page.locator('#omos .hist-bg img');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('loading', 'lazy');
    await expect(img).toHaveAttribute('alt', '');
    await expect(page.locator('#omos .hist-bg')).toHaveAttribute('aria-hidden', 'true');
    for (const f of ['billeder/historie-hoej.jpg', 'billeder/historie-bred.jpg']) {
      expect(fs.statSync(f).size, f).toBeLessThan(450 * 1024);
    }
  });

  test('hver skærm henter sit eget billede', async ({ page }, info) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await page.locator('#omos').scrollIntoViewIfNeeded();
    const img = page.locator('#omos .hist-bg img');
    await expect.poll(() => img.evaluate((e) => e.complete && e.naturalWidth), { timeout: 10000 }).toBeGreaterThan(0);
    const valgt = await img.evaluate((e) => e.currentSrc);
    expect(valgt).toContain(info.project.name === 'computer' ? 'historie-bred.jpg' : 'historie-hoej.jpg');
  });

  test('sløret ligger over fotoet og dækker hele afsnittet', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await page.locator('#omos').scrollIntoViewIfNeeded();
    const m = await page.evaluate(() => {
      const s = document.getElementById('omos').getBoundingClientRect();
      const l = document.querySelector('#omos .hist-slor').getBoundingClientRect();
      const stak = document.elementsFromPoint(s.left + 4, Math.max(s.top, 0) + 120).map((e) => e.className || e.tagName);
      return { s: [s.width, s.height], l: [l.width, l.height], stak };
    });
    expect(m.l[0]).toBeCloseTo(m.s[0], 0);
    expect(m.l[1]).toBeCloseTo(m.s[1], 0);
    const iSlor = m.stak.indexOf('hist-slor');
    expect(iSlor, 'sløret findes ikke på det punkt: ' + m.stak.join(' > ')).toBeGreaterThanOrEqual(0);
    expect(m.stak.findIndex((c) => c === 'IMG'), 'fotoet findes ikke under sløret').toBeGreaterThan(iSlor);
  });

  test('kortene er glas — man kan se fotoet igennem', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    for (const sel of ['#omos .hist-teaser', '#omos .val']) {
      const k = await page.locator(sel).first().evaluate((e) => {
        const s = getComputedStyle(e);
        return { bg: s.backgroundColor, bf: s.backdropFilter || s.webkitBackdropFilter || '' };
      });
      expect(k.bf, `${sel} slører ikke fotoet bag sig`).toContain('blur');
      const a = rgba(k.bg).a;
      expect(a, `${sel} er tæt — fotoet kan ikke ses igennem`).toBeLessThan(0.6);
      expect(a, `${sel} er helt klart — teksten har intet at stå på`).toBeGreaterThan(0.1);
    }
  });

  /* Kontrasten regnes mod det lyseste, fotoet kan være (hvid): for
     overskriften og manchetten gennem sløret alene, for kortenes tekst
     gennem sløret OG glasset. Gennemgangens måler læser sektionens
     mørke grund og kan hverken se fotoet eller glasset. */
  test('teksten kan læses, også hvis fotoet er hvidt under den', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    const f = await page.evaluate(() => {
      const c = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).color : null; };
      const bg = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).backgroundColor : null; };
      return {
        slor: bg('#omos .hist-slor'), teaser: bg('#omos .hist-teaser'), val: bg('#omos .val'),
        direkte: { eyebrow: c('#omos .eyebrow'), h2: c('#omos h2'), manchet: c('#omos p.lead') },
        teaserTekst: { overskrift: c('#omos .hist-teaser h4'), tekst: c('#omos .hist-teaser p'), knap: c('#omos .hist-teaser-knap') },
        valTekst: { overskrift: c('#omos .val h4'), tekst: c('#omos .val p') },
      };
    });
    const paaSlor = over(rgba(f.slor), [255, 255, 255]);
    const maal = (farver, grund, hvor) => {
      for (const [navn, farve] of Object.entries(farver)) {
        expect(farve, `${hvor} ${navn} findes ikke på siden — prøven måler ingenting`).not.toBeNull();
        const k = kontrast(over(rgba(farve), grund), grund);
        expect(k, `${hvor} ${navn} ${farve} over en hvid sky: ${k.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    };
    maal(f.direkte, paaSlor, 'sløret:');
    maal(f.teaserTekst, over(rgba(f.teaser), paaSlor), 'teaserens glas:');
    maal(f.valTekst, over(rgba(f.val), paaSlor), 'kapitelkortets glas:');
  });
});

/* ============================================================
   BESTILLINGEN STÅR PÅ LUGEN  (12/9)
   ------------------------------------------------------------
   Samme lag som Find os — og samme regel for kontrasten: regnet mod
   det lyseste, fotoet kan være (hvid), gennem sløret OG glasset.
   ============================================================ */
test.describe('Bestillingen står på lugen', () => {
  /* Afsnittet skjuler sig, når der intet er at bestille — så prøven
     åbner kategorierne, som skal-bestil.spec.js gør. Ellers målte den
     et skjult afsnit. */
  const åbnBestil = async (page) => {
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [1, 6, 9];
    d.indstillinger.bestilling_varsel_timer = 2;
    await åbnSkal(page, '/', { ur: '2026-08-07T11:00:00Z', data: d });
    await expect(page.locator('#bestil')).toBeVisible();
  };

  test('fotoet er ejerens, lazy og dekorativt', async ({ page }) => {
    await åbnBestil(page);
    const img =page.locator('#bestil .best-bg img');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('loading', 'lazy');
    await expect(img).toHaveAttribute('alt', '');
    await expect(page.locator('#bestil .best-bg')).toHaveAttribute('aria-hidden', 'true');
    expect(fs.statSync('billeder/bestil-luge.jpg').size).toBeLessThan(450 * 1024);
  });

  test('kortet er glas — og formularens tekst kan læses', async ({ page }) => {
    await åbnBestil(page);
    await expect(page.locator('#bestil .item .add').first()).toBeAttached();
    const f = await page.evaluate(() => {
      const c = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).color : null; };
      const bg = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).backgroundColor : null; };
      const p = getComputedStyle(document.querySelector('#bestil .panel'));
      return {
        slor: bg('#bestil .best-slor'), panel: p.backgroundColor, bf: p.backdropFilter || p.webkitBackdropFilter || '',
        raekke: bg('#bestil .item:not(.hi)'),
        direkte: { eyebrow: c('#bestil .eyebrow'), h2: c('#bestil h2'), manchet: c('#bestil .sub') },
        glas: { etiket: c('#bestil .field > label'), jura: c('#bestil .jura-ved-send'), link: c('#bestil .jura-ved-send a'), fine: c('#bestil .fine') },
        paaRaekke: { navn: c('#bestil .item:not(.hi) h4'), tilfoej: c('#bestil .item .add') },
        felt: { tekst: c('#bestil .inp') }, feltBg: bg('#bestil .inp'),
      };
    });
    expect(f.bf, 'kortet slører ikke fotoet bag sig').toContain('blur');
    expect(rgba(f.panel).a).toBeLessThan(0.6);
    const paaSlor = over(rgba(f.slor), [255, 255, 255]);
    const paaGlas = over(rgba(f.panel), paaSlor);
    const maal = (farver, grund, hvor) => {
      for (const [navn, farve] of Object.entries(farver)) {
        expect(farve, `${hvor} ${navn} findes ikke — prøven måler ingenting`).not.toBeNull();
        const k = kontrast(over(rgba(farve), grund), grund);
        expect(k, `${hvor} ${navn} ${farve} over en hvid sky: ${k.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    };
    maal(f.direkte, paaSlor, 'sløret:');
    maal(f.glas, paaGlas, 'glasset:');
    maal(f.paaRaekke, over(rgba(f.raekke), paaGlas), 'rækken:');
    maal(f.felt, over(rgba(f.feltBg), paaGlas), 'feltet:');
  });

  test('fotoet står stille, mens formularen ruller forbi', async ({ page }) => {
    await åbnBestil(page);
    const m =await page.evaluate(async () => {
      const sek = document.getElementById('bestil');
      const sc = document.getElementById('sc');
      const rod = (sc && getComputedStyle(sc).overflowY === 'auto') ? sc : document.scrollingElement;
      const top = rod === document.scrollingElement ? 0 : rod.getBoundingClientRect().top;
      rod.scrollTo({ top: rod.scrollTop + sek.getBoundingClientRect().top - top + 500, behavior: 'instant' });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const img = document.querySelector('#bestil .best-bg img').getBoundingClientRect();
      return { sekTop: sek.getBoundingClientRect().top - top, imgTop: img.top - top };
    });
    expect(m.sekTop, 'afsnittet er ikke rullet op over kanten — prøven måler ingenting').toBeLessThan(-400);
    expect(Math.abs(m.imgTop), 'fotoet rullede med formularen').toBeLessThan(2);
  });
});
