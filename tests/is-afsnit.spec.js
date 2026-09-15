/* ============================================================
   ISEN HAR SIT EGET AFSNIT PÅ FORSIDEN  (15/9)
   ------------------------------------------------------------
   Ejerens ord: "på bestillingen skal der være is, is er en kæmpe
   stolthed — så også bedre og mere showcase af det".

   Prøverne måler det, afsnittet LOVER: priserne er menukortets (og
   aldrig en "fra"-pris), og knappen fører kun til bestillingen, når
   isen kan bestilles dér — ellers til menukortet.

   ⚠️ FIKSTURET HAR EJERENS FORM: en løs vaffel til 4 kr. og en
   "Softice-top" FØR de rigtige is i sorteringen. En regel, der tog
   den første is-vare, ville vise "Løs vaffel 4,-" som husets is.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, grunddata, springIntroOver } = require('./hjaelp');

// Fredag 7. august 2026 kl. 13 dansk tid
const UR = '2026-08-07T11:00:00Z';

function v(id, kategori_id, navn, pris, sortering, ekstra) {
  return Object.assign({ id, kategori_id, navn, pris, sortering,
    aktiv: true, udsolgt: false, beskrivelse: null }, ekstra || {});
}

function medIs(indstillinger) {
  const d = grunddata();
  d.menu_kategorier = [
    { id: 1, afdeling: 'mad', navn: 'Smørrebrød', sortering: 10, aktiv: true },
    { id: 15, afdeling: 'is', navn: 'Kugleis og ishorn', sortering: 50, aktiv: true },
    { id: 16, afdeling: 'is', navn: 'Softice og vafler', sortering: 51, aktiv: true },
  ];
  d.menu_varer = [
    v(1, 1, 'Flæskesteg med surt', 55, 1),
    v(2, 15, 'Løs vaffel', 4, 1),
    v(3, 15, '1 kugle', 35, 2),
    v(4, 15, 'Softice-top', 18, 3),
    v(5, 16, 'Softice, lille', 37, 1),
    v(6, 16, 'Boblevaffel med 1 kugle', 59, 2),
    v(7, 16, 'Churros med sukker og kanel', 45, 3),
  ];
  d.indstillinger = Object.assign({}, d.indstillinger,
    { bestilling_varsel_timer: 2 }, indstillinger || {});
  return d;
}

async function åbnForsiden(page, data) {
  await åbn(page, '/index.html', { ur: UR, data });
  await springIntroOver(page);
  await expect(page.locator('#isen')).toHaveCount(1);
}

const rækker = (page) => page.locator('#isen [data-is-priser] li');

test.describe('Isen på forsiden', () => {

  test('priserne er menukortets — én pr. slags, aldrig en "fra"-pris', async ({ page }) => {
    await åbnForsiden(page, medIs());
    await expect(rækker(page)).toHaveCount(4);
    const navne = await page.locator('#isen .is-navn').allTextContents();
    expect(navne).toEqual(['Softice, lille', '1 kugle', 'Boblevaffel med 1 kugle',
      'Churros med sukker og kanel']);
    const priser = await page.locator('#isen .is-pris').allTextContents();
    expect(priser.map((p) => p.replace(/\D/g, ''))).toEqual(['37', '35', '59', '45']);
    // Tilkøbene er ikke husets is
    await expect(page.locator('#isen')).not.toContainText('Løs vaffel');
    await expect(page.locator('#isen')).not.toContainText('Softice-top');
  });

  test('en pris, ejeren retter, står rettet', async ({ page }) => {
    const d = medIs();
    d.menu_varer.find((x) => x.id === 5).pris = 39;
    await åbnForsiden(page, d);
    await expect(page.locator('#isen .is-pris').first()).toContainText('39');
  });

  test('uden is på kortet er listen væk — afsnittet og vejen til kortet står', async ({ page }) => {
    const d = medIs();
    d.menu_kategorier = d.menu_kategorier.filter((k) => k.afdeling !== 'is');
    await åbnForsiden(page, d);
    await expect(page.locator('#isen [data-is-priser]')).toBeHidden();
    await expect(page.locator('#isen h2')).toBeVisible();
    await expect(page.locator('#isen [data-is-knap]')).toHaveAttribute('href', 'm-menukort.html');
  });

  test('uden flueben på forsiden peger knappen på menukortet', async ({ page }) => {
    await åbnForsiden(page, medIs());
    const knap = page.locator('#isen [data-is-knap]');
    await expect(knap).toHaveAttribute('href', 'm-menukort.html');
    await expect(knap).toContainText('Se iskortet');
  });

  test('kan isen bestilles på forsiden, fører knappen til bestillingen — og isen er foldet ud', async ({ page }) => {
    await åbnForsiden(page, medIs({ bestilbare_kategorier: [15, 16] }));
    const knap = page.locator('#isen [data-is-knap]');
    await expect(knap).toHaveAttribute('href', '#bestil');
    await expect(knap).toContainText('Bestil is');
    // Før trykket er isens fold lukket: rækken findes ikke i listen
    await expect(page.locator('#bestil .item h4', { hasText: 'Softice, lille' })).toHaveCount(0);
    await knap.click();
    await expect(page.locator('#bestil .item h4', { hasText: 'Softice, lille' })).toBeVisible();
  });

  test('fotoene venter på gæsten og siger, hvad de viser', async ({ page }) => {
    await åbnForsiden(page, medIs());
    const fotos = page.locator('#isen .is-fotos img');
    await expect(fotos).toHaveCount(2);
    for (const f of await fotos.all()) {
      await expect(f).toHaveAttribute('loading', 'lazy');
      expect((await f.getAttribute('alt')).length).toBeGreaterThan(10);
    }
  });
});
