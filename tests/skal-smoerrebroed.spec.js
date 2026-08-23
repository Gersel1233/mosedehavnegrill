/* Smørrebrødssidens kobling.

   Samme motor som forsiden — det er den samme bestilling, der
   bliver sendt — men to ting er anderledes med vilje: udvalget er
   KUN smørrebrød, og spørgsmålet er "hentes eller leveres" i
   stedet for "spis her eller tag med". Smørrebrød er pr.
   definition ud af huset. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';

function data() {
  const d = grunddata();
  d.indstillinger.bestilling_varsel_timer = 2;
  return d;
}

async function åbn(page, d) {
  await åbnSkal(page, '/h-smorrebrod.html', { ur: FREDAG, data: d || data() });
}

test.describe('Smørrebrødssidens kobling', () => {
  test('stykkerne kommer fra kortet, og den døde tilbehørsrække er væk', async ({ page }) => {
    await åbn(page);

    await expect(page.locator('[data-vare="Flæskestegssandwich"]')).toHaveCount(1);
    // Designets fire opdigtede rækker
    await expect(page.locator('[data-liste]')).not.toContainText('Luksus-smørrebrød');
    /* "Tilbehør: øl, snaps og vand" havde intet bag sig: siden
       sælger kun smørrebrød, så rækken kunne ikke bestilles. */
    await expect(page.locator('[data-liste]')).not.toContainText('Tilbehør');
  });

  test('varslet står i teksten, ikke et fast tal', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_varsel_timer = 48;
    await åbn(page, d);

    // Designet skrev "inden for 2 dage" fast; tallet sættes i admin
    // Hinten hører til datofeltet, ikke manchetten under overskriften
    await expect(page.locator('#bestil .field:has(#sdato) + .hint'))
      .toContainText('mindst 2 dage');
  });

  test('levering tilbydes ikke, før forretningen har sagt ja', async ({ page }) => {
    /* Vi ved hverken hvad de kører ud med, hvor langt eller hvad
       det koster. En side, der tilbyder levering, fordi ingen har
       sagt nej, lover noget på forretningens vegne. */
    await åbn(page);

    await expect(page.locator('[data-toggles="#levfelt"]')).toBeHidden();
    await expect(page.locator('#levfelt')).toBeHidden();
    /* Og så er designets ubekræftede løfte om leveringspris og
       -zone ude af syne med det. Teksten står stadig i filen —
       den er designets, og den skal bekræftes af ejeren, før
       fluebenet slås til. */
    await expect(page.locator('#levfelt .hint')).toBeHidden();

    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    const gemt = await gemteData(page);
    expect(gemt.bestillinger[0].hvordan).toBe('afhentning');
    expect(gemt.bestillinger[0].leverings_adresse).toBe(null);
  });

  test('er levering slået til, kræves adressen — og den følger med', async ({ page }) => {
    const d = data();
    d.indstillinger.levering = true;
    await åbn(page, d);

    await expect(page.locator('[data-toggles="#levfelt"]')).toBeVisible();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    // Levering er valgt som standard i designet, så adressen mangler
    await expect(page.locator('#bestil .note')).toContainText('adressen');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);

    await page.locator('#sadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#bestil button.g.solid.blk').click();

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.hvordan).toBe('levering');
    expect(b.leverings_adresse).toBe('Havnevej 20I, 2670 Greve');
  });

  test('en levering bekræftes ALDRIG af sig selv', async ({ page }) => {
    /* Vi kan love, at maden bliver lavet. Vi kan ikke love, at den
       kan køres til en adresse, vi ikke kender. */
    const d = data();
    d.indstillinger.levering = true;
    d.indstillinger.auto_bekraeft = true;
    await åbn(page, d);

    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#sadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#bestil button.g.solid.blk').click();

    await expect(page.locator('#bestil .hint').first()).toContainText('ringer og bekræfter');
  });

  test('mindsteantallet håndhæves', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_min_stk = 10;
    await åbn(page, d);

    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    await expect(page.locator('#bestil .note')).toContainText('mindst bestilles 10');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);
  });

  test('skallen er urørt: felterne står i designets rækkefølge', async ({ page }) => {
    const d = data();
    d.indstillinger.levering = true;
    await åbn(page, d);

    const etiketter = await page.$$eval('#bestil .field label',
      (els) => els.map((e) => e.textContent.trim()));
    expect(etiketter).toEqual(['Vælg jeres smørrebrød', 'Leveringsdag', 'Tidspunkt',
      'Levering eller afhentning?', 'Leveringsadresse', 'Navn', 'Telefonnummer',
      'Besked (valgfrit)']);
  });
});
