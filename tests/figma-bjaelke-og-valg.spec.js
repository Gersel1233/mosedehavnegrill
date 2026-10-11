/* BESTIL-PILLEN, KURVBJÆLKEN OG VALGENE ER FIGMAS  (11. okt 2026)

   Mikkels ord: *"bestil knappen på telefon skal opdateres efter Figma
   sheetsne også lige som book bord tabs knapperne … gøres endnu bedre og
   mere bestil knap egnet"*.

   TALLENE KOMMER UDEFRA — fra Figma-filen, læst med Plugin API'et:
   · LA31 Nav / Mobile bar (98:278): "350 × 56 (390 − 2 × 20)", radius 28,
     luft 22 til venstre og 4 til højre, en knap på 48 med en linse på 40
   · LA31 Control / Chip (103:571): 44 høj, radius 22, luft 18 i siderne
   · Det valgte er husets røde (fullskaerm-gamle: "Et valg er rødt, ikke
     sort") — rgb(214, 42, 58)
   Reglerne bor i havnegrillen.css (pillen), js/skal/bestil.js
   (kurvbjælkens linse) og css/style.css (chippen). */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

const UR = '2026-08-07T11:00:00Z';
const IS_KAT = 6;                 // grunddata: "Softice og vafler", afdeling is

/* Formen målt uden transform: pillen glider væk med translateY, når den er
   foldet, og en boundingBox ville måle glidningen, ikke bjælken. */
const form = (loc) => loc.evaluate((e) => {
  const s = getComputedStyle(e);
  const linse = e.querySelector('.pille-linse');
  const l = linse && linse.getBoundingClientRect();
  const r = e.getBoundingClientRect();
  const før = linse && getComputedStyle(linse, '::before');
  return {
    venstre: e.offsetLeft, bredde: e.offsetWidth, højde: e.offsetHeight,
    runding: parseFloat(s.borderTopLeftRadius),
    luftV: parseFloat(s.paddingLeft), luftH: parseFloat(s.paddingRight),
    linse: l ? { b: Math.round(l.width), h: Math.round(l.height),
      højreLuft: Math.round(r.right - l.right),
      indre: før ? Math.round(l.width - 2 * parseFloat(før.left)) : null } : null,
    /* Etiketten står til venstre for linsen: den første tekst i bjælken */
    tekstFørLinse: linse ? [...e.childNodes].indexOf(linse) > 0 : false,
  };
});

test.describe('Bestil-pillen og kurvbjælken er Figmas mobilbjælke', () => {

  test('pillen er 350 × 56 med radius 28 og en linse på 40 til højre', async ({ page }) => {
    test.skip(!test.info().project.use.isMobile, 'Figmas mobilbjælke er telefonens');
    await åbnSkal(page, '/h-smorrebrod.html', { ur: UR, data: grunddata() });
    const f = await form(page.locator('#bestil-pill'));
    expect(f.højde, 'Figma: 56 høj').toBe(56);
    expect(f.venstre, 'Figma: 20 fra kanten').toBe(20);
    expect(f.bredde, 'Figma: 390 − 2 × 20').toBe(page.viewportSize().width - 40);
    expect(f.runding, 'Figma: radius 28').toBe(28);
    expect(f.luftV, 'Figma: 22 luft før teksten').toBe(22);
    expect(f.linse, 'pillen har ingen linse').not.toBeNull();
    expect(f.linse.b, 'Figma: knappen er 48').toBe(48);
    expect(f.linse.indre, 'Figma: linsen er 40, 4 inde').toBe(40);
    expect(f.linse.højreLuft, 'Figma: 4 til højre').toBe(4);
    expect(f.tekstFørLinse, 'teksten skal stå før linsen').toBe(true);
  });

  test('kurvbjælken er samme bjælke, og pilen er tegnet — ikke et "↓"', async ({ page }) => {
    test.skip(!test.info().project.use.isMobile, 'Figmas mobilbjælke er telefonens');
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [1, IS_KAT, 9];
    d.indstillinger.bestilling_varsel_timer = 2;
    d.indstillinger.is_smage = 'Vanilje\nJordbær\nLakrids';
    const b = { beskrivelse: null, fremhaevet: false, udsolgt: false, aktiv: true };
    d.menu_varer.push({ id: 9001, kategori_id: IS_KAT, navn: '1 kugle', pris: 35,
      valg: ['Vaffel', 'Bæger'], sortering: 1, ...b });
    await åbnSkal(page, '/index.html', { ur: UR, data: d });
    await page.waitForSelector('.isbyg-blok');
    const trin = (nr) => page.locator(`.isbyg-trin[data-trin="${nr}"]`);
    await trin(1).locator('.isbyg-knap').filter({ hasText: 'Vaffel' }).first().click();
    await trin(2).locator('.isbyg-knap[data-vare="1 kugle"]').click();
    await trin(3).locator('.isbyg-smag').selectOption('Jordbær');
    await page.locator('.isbyg-laeg').evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await page.locator('.isbyg-laeg').click();

    const bar = page.locator('.kurvbar');
    await expect(bar).toContainText('1 i kurven');
    const f = await form(bar);
    expect(f.højde, 'Figma: 56 høj').toBe(56);
    expect(f.venstre, 'Figma: 20 fra kanten').toBe(20);
    expect(f.runding, 'Figma: radius 28').toBe(28);
    expect(f.linse, 'bjælken har ingen linse').not.toBeNull();
    expect(f.linse.indre, 'Figma: linsen er 40').toBe(40);
    /* Figma 33:25: "drawn — never a font glyph". Både teksten og et
       ::after med indhold tæller som et skrifttegn. */
    const pil = await bar.evaluate((e) => ({
      tekst: e.textContent,
      efter: getComputedStyle(e.querySelector('.kurvbar-pil'), '::after').content,
      tegnet: !!e.querySelector('.pille-linse svg path'),
    }));
    expect(pil.tekst, 'pilen er et skrifttegn').not.toContain('↓');
    expect(['none', 'normal'], 'pilen er et skrifttegn i ::after').toContain(pil.efter);
    expect(pil.tegnet, 'linsen har ingen tegnet pil').toBe(true);
  });

  /* iOS Safari viser ikke :active uden en touchstart-lytter (11/10) —
     .trykket fra havnegrillen.js. Prøven måler bredden, ikke klassen. */
  test('et tryk med en finger på pillen kan ses', async ({ page }) => {
    test.skip(!test.info().project.use.isMobile, 'fingeren er telefonens');
    await åbnSkal(page, '/h-smorrebrod.html', { ur: UR, data: grunddata() });
    const pille = page.locator('#bestil-pill');
    await expect(pille).toBeVisible();
    const bredde = () => pille.evaluate((e) => e.getBoundingClientRect().width);
    const før = await bredde();
    const b = await pille.boundingBox();
    await pille.evaluate((e, p) => e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: p.x, clientY: p.y })), { x: b.x + 40, y: b.y + b.height / 2 });
    await page.waitForTimeout(320);
    const ned = await bredde();
    await pille.evaluate((e) => e.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerType: 'touch' })));
    expect(ned, 'pillen blev ikke mindre under fingeren').toBeLessThan(før - 4);
    await page.waitForTimeout(320);
    expect(await bredde(), 'pillen blev stående trykket ned').toBeCloseTo(før, 0);
  });
});

const BORDE = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 },
  { id: 2, lokation_id: 'mosede', nummer: 'Terrassen 2', pladser: 6, placering: 'ude', aktiv: true, sortering: 20 },
];

test.describe('Dagene og typerne er Figmas chip', () => {

  test('dagene på bord/ er 44 høje, radius 22, navn og dato på én linje', async ({ page }) => {
    await åbnSkal(page, '/bord/', { ur: UR, data: grunddata({ borde: BORDE }) });
    const dage = page.locator('#bord-dage .dag');
    await expect(dage.first()).toBeVisible();
    const m = await dage.evaluateAll((alle) => alle.slice(0, 3).map((e) => {
      const s = getComputedStyle(e);
      const n = e.querySelector('.dag-navn').getBoundingClientRect();
      const d = e.querySelector('.dag-dato').getBoundingClientRect();
      return { højde: e.offsetHeight, runding: parseFloat(s.borderTopLeftRadius),
        luft: parseFloat(s.paddingLeft), valgt: e.classList.contains('valgt'), flade: s.backgroundColor,
        midtForskel: Math.abs((n.top + n.bottom) / 2 - (d.top + d.bottom) / 2), datoEfter: d.left >= n.right };
    }));
    for (const [i, d] of m.entries()) {
      expect(d.højde, `dag ${i + 1}: Figma 44 høj`).toBe(44);
      expect(d.runding, `dag ${i + 1}: Figma radius 22`).toBe(22);
      expect(d.luft, `dag ${i + 1}: Figma 18 luft`).toBe(18);
      expect(d.midtForskel, `dag ${i + 1}: navn og dato står ikke på én linje`).toBeLessThan(2);
      expect(d.datoEfter, `dag ${i + 1}: datoen står ikke efter navnet`).toBe(true);
    }
    const valgt = m.find((d) => d.valgt), hvil = m.find((d) => !d.valgt);
    expect(valgt.flade, 'det valgte er husets røde').toBe('rgb(214, 42, 58)');
    expect(hvil.flade, 'Figma: en hvilende chip har ingen flade').toBe('rgba(0, 0, 0, 0)');
  });

  /* Typerne fylder rækken; med inline-flex hang "7 ude" i venstre side af
     en knap i fuld bredde ved bordet (set på skuddet 11/10). */
  test('et bord ved bordet står midt i sin knap', async ({ page }) => {
    await åbnSkal(page, '/ved-bordet/', { ur: '2026-08-06T11:00:00Z', data: grunddata({ borde: BORDE }) });
    const knap = page.locator('#bord-liste .type-knap').first();
    await expect(knap).toBeVisible();
    const m = await knap.evaluate((e) => {
      const r = e.getBoundingClientRect();
      const børn = [...e.children].map((c) => c.getBoundingClientRect());
      const v = Math.min(...børn.map((c) => c.left)), h = Math.max(...børn.map((c) => c.right));
      return { højde: e.offsetHeight, runding: parseFloat(getComputedStyle(e).borderTopLeftRadius),
        skævhed: Math.abs((v + h) / 2 - (r.left + r.right) / 2) };
    });
    expect(m.højde, 'Figma: 44 høj').toBe(44);
    expect(m.runding, 'Figma: radius 22').toBe(22);
    expect(m.skævhed, 'bordet står ikke midt i knappen').toBeLessThan(2);
  });
});
