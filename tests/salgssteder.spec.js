// @ts-check
/* HVOR SÆLGES DET? (14/9). Kundens ord: "det hele skal bare kunne
   administreres — og også, hvis kun noget af det gælder det ene eller
   det andet sted".

   Tre steder: smørrebrødssiden (kun-smoer), forsidens bestilling og
   QR-koden ved bordene. Hver kategori har et flueben pr. sted, og en
   vare kan tages af ét sted for sig.

   MÅLT FØR: smørrebrødet stod med et LÅST flueben på forsiden, der var
   intet flueben til smørrebrødssiden, og en enkelt vare kunne kun
   slukkes overalt (Vis) — ikke fx kun ved bordene.

   ⚠️ PRØVERNE LÆSER DET, GÆSTEN SER, ikke Butik.udvalg: listerne sættes
   i FIKSTURET, og siderne tegnes, som de tegnes for gæsten. Et opslag i
   den samme funktion, der skal kontrolleres, ville bestå på en side,
   der viste noget andet. */
const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, åbnAdmin, visFane, gemteData, grunddata, springIntroOver } = require('./hjaelp');

const UR = '2026-08-07T11:00:00Z';

/* Ejerens form: to smørrebrødskategorier, grillen, drikkevarerne og isen. */
function menu() {
  const d = grunddata();
  d.menu_kategorier = [
    { id: 1, afdeling: 'mad', navn: 'Smørrebrød', sortering: 10, aktiv: true },
    { id: 2, afdeling: 'mad', navn: 'Håndmadder', sortering: 20, aktiv: true },
    { id: 3, afdeling: 'mad', navn: 'Grill fra pladen', sortering: 30, aktiv: true },
    { id: 4, afdeling: 'drikke', navn: 'Øl, vin og bar', sortering: 40, aktiv: true },
    { id: 5, afdeling: 'is', navn: 'Softice og vafler', sortering: 50, aktiv: true },
  ];
  d.menu_varer = [
    v(1, 1, 'Flæskesteg med surt', 55, 1),
    v(2, 1, 'Rejemad med mayo og citron', 85, 2),
    v(4, 2, 'Flæskesteg med surt, håndmad', 27, 101),
    v(5, 3, 'Havnens burger', 95, 1),
    v(7, 4, 'Fadøl, lille', 35, 1),
    v(8, 5, 'Softice med guf', 40, 1),
  ];
  d.indstillinger.bestilbare_kategorier = [1, 2, 3, 4, 5];
  d.indstillinger.bestilling_varsel_timer = 2;
  d.borde = [{
    id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
    placering: 'ude', aktiv: true, sortering: 10,
  }];
  return d;
}
function v(id, kategori_id, navn, pris, sortering) {
  return { id, kategori_id, navn, pris, sortering,
    beskrivelse: null, fremhaevet: false, udsolgt: false, aktiv: true };
}

/* Forsiden og smørrebrødssiden folder kategorierne; en finger åbner dem. */
async function foldListe(page, sti, data) {
  await åbnSkal(page, sti, { ur: UR, data });
  if (sti === '/index.html') await springIntroOver(page);
  await page.waitForSelector('[data-liste] .item');
  for (let i = 0; i < 30; i++) {
    const lukket = page.locator('[data-liste] [data-kategori] .add').filter({ hasText: '+ tilføj' });
    if (!(await lukket.count())) break;
    await lukket.first().click();
  }
  return page.$$eval('[data-liste] .item[data-vare]', (r) => r.map((e) => e.getAttribute('data-vare')));
}
async function bordet(page, data) {
  await åbn(page, '/ved-bordet/?bord=7', { ur: UR, data });
  await page.waitForSelector('#bestil-stykker .stk-linje');
  return page.$$eval('#bestil-stykker .stk-linje[data-vare]', (r) => r.map((e) => e.getAttribute('data-vare')));
}

test.describe('Gæsten ser stedets eget sortiment', () => {
  test('uden egne lister er alt, som det var', async ({ page }) => {
    const d = menu();
    const smoer = await foldListe(page, '/h-smorrebrod.html', d);
    expect(smoer).toContain('Flæskesteg med surt, håndmad');
    expect(smoer, 'grillen står på smørrebrødssiden uden at nogen har sat den der')
      .not.toContain('Havnens burger');
    const f = await foldListe(page, '/index.html', d);
    expect(f).toContain('Flæskesteg med surt');
    expect(f).toContain('Havnens burger');
  });

  test('håndmadderne kan tages af forsiden — og står stadig på smørrebrødssiden', async ({ page }) => {
    const d = menu();
    d.indstillinger.bestilbare_kategorier_forside = [1, 3, 4];
    const f = await foldListe(page, '/index.html', d);
    expect(f, 'vagt: forsiden viser stadig smørrebrødet').toContain('Flæskesteg med surt');
    expect(f, 'håndmadderne står på forsiden, selv om fluebenet er taget af')
      .not.toContain('Flæskesteg med surt, håndmad');
    const smoer = await foldListe(page, '/h-smorrebrod.html', d);
    expect(smoer, 'håndmadderne forsvandt også fra smørrebrødssiden')
      .toContain('Flæskesteg med surt, håndmad');
  });

  test('drikkevarerne kan sættes på smørrebrødssiden', async ({ page }) => {
    const d = menu();
    d.indstillinger.bestilbare_kategorier_smoer = [1, 2, 4];
    const smoer = await foldListe(page, '/h-smorrebrod.html', d);
    expect(smoer, 'øllen kom ikke med på smørrebrødssiden').toContain('Fadøl, lille');
    expect(smoer, 'grillen fulgte med uden at stå på listen').not.toContain('Havnens burger');
    expect(smoer).toContain('Flæskesteg med surt');
  });

  test('en enkelt vare kan tages af bordet alene', async ({ page }) => {
    const d = menu();
    d.indstillinger.ikke_saelges = { 2: ['bord'] };
    const b = await bordet(page, d);
    expect(b, 'vagt: smørrebrødet står ved bordet').toContain('Flæskesteg med surt');
    expect(b, 'rejemaden står ved bordet, selv om den er taget af')
      .not.toContain('Rejemad med mayo og citron');
    const f = await foldListe(page, '/index.html', d);
    expect(f, 'rejemaden forsvandt også fra forsiden').toContain('Rejemad med mayo og citron');
  });
});

test.describe('Admin styrer stederne', () => {
  async function menufanen(page, data) {
    await åbnAdmin(page, { data });
    await visFane(page, 'p-menu');
    await page.waitForSelector('#bestilbar-1');
  }

  test('smørrebrødet kan tages af forsiden — og den gamle liste følger med', async ({ page }) => {
    await menufanen(page, menu());
    const f = page.locator('#bestilbar-2');
    await expect(f).toBeChecked();
    await expect(f, 'smørrebrødets flueben er stadig låst').toBeEnabled();
    await f.uncheck();
    await expect(page.locator('#kvittering')).toContainText('kan ikke længere bestilles på forsiden');
    const i = (await gemteData(page)).indstillinger;
    expect(i.bestilbare_kategorier_forside).not.toContain(2);
    expect(i.bestilbare_kategorier_forside, 'resten af forsiden røg med').toEqual(expect.arrayContaining([1, 3, 4]));
    /* Den gamle liste er uden smørrebrødet — og mister ikke grillen. */
    expect(i.bestilbare_kategorier).toEqual(expect.arrayContaining([3, 4]));
    expect(i.bestilbare_kategorier).not.toContain(1);
  });

  test('smørrebrødssiden kan få en kategori mere', async ({ page }) => {
    await menufanen(page, menu());
    const s = page.locator('#bestilbar-smoer-4');
    await expect(s, 'øllen står allerede på smørrebrødssiden').not.toBeChecked();
    await expect(page.locator('#bestilbar-smoer-1')).toBeChecked();
    await s.check();
    const i = (await gemteData(page)).indstillinger;
    expect(i.bestilbare_kategorier_smoer).toEqual(expect.arrayContaining([1, 2, 4]));
    expect(i.bestilbare_kategorier_smoer).not.toContain(3);
  });

  test('kategoriens linje siger alle tre steder', async ({ page }) => {
    /* Linjen står på FOLDEN, og kategorierne folder først, når kortet
       er stort (over 30 varer) — målt: med seks varer er den der ikke. */
    const d = menu();
    for (let i = 0; i < 30; i++) d.menu_varer.push(v(100 + i, 4, 'Sodavand nr. ' + i, 25, 10 + i));
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-menu');
    await page.waitForSelector('.menu-fold-salg');
    const linjer = await page.locator('.menu-fold-salg').allTextContents();
    expect(linjer.some((t) => t.includes('smørrebrødssiden + forsiden + QR ved bordene')),
      'smørrebrødets linje: ' + linjer.join(' | ')).toBe(true);
    expect(linjer.some((t) => /· forsiden \+ QR ved bordene$/.test(t.trim())),
      'grillens linje: ' + linjer.join(' | ')).toBe(true);
  });

  test('en vare kan tages af ét sted under ⋯ — og rækken siger det', async ({ page }) => {
    await menufanen(page, menu());
    /* Kun de steder, kategorien sælges: grillen står ikke på
       smørrebrødssiden, så burgeren har intet flueben dér. */
    await expect(page.locator('[data-vare-sted="5|smoer"]')).toHaveCount(0);
    await expect(page.locator('[data-vare-sted="5|bord"]')).toHaveCount(1);

    await page.locator('.vare-raekke[data-vare="2"] .mere-knap').click();
    const bord = page.locator('[data-vare-sted="2|bord"]');
    await expect(bord).toBeChecked();
    await bord.uncheck();
    await expect(page.locator('#kvittering')).toContainText('kan ikke længere bestilles på QR ved bordene');
    const i = (await gemteData(page)).indstillinger;
    expect(i.ikke_saelges && i.ikke_saelges['2']).toEqual(['bord']);
    await expect(page.locator('.vare-raekke[data-vare="2"] .vare-sted-note'))
      .toContainText('Ikke på QR ved bordene');
  });
});
