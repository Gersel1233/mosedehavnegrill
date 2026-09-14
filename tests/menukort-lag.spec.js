/* ============================================================
   VARENS LAG PÅ MENUKORTET  (13/9)
   Kundens idé: "at kunne trykke ind på sådan en ting inde i
   menukortet og læse hvad det er og sådan en lille beskrivelse".
   Kun varer med en beskrivelse kan trykkes; laget peger videre til
   bestillingen, men man bestiller stadig ikke herinde.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

function data() {
  const d = grunddata();
  d.indstillinger.bestilbare_kategorier = [1, 6, 9];
  d.menu_varer.push({ id: 40, kategori_id: 9, navn: 'Specialøl', beskrivelse: 'Fra et <b>lokalt</b> bryggeri.',
    pris: 55, sortering: 2, aktiv: true, udsolgt: false });
  return d;
}

test.describe('Varens lag på menukortet', () => {
  test('en vare med beskrivelse kan trykkes og siger, hvad den er', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: data() });
    const linje = page.locator('[data-vare="Flæskestegssandwich"]');
    await expect(linje).toHaveAttribute('role', 'button');
    await expect(linje.locator('.mk-mere')).toHaveCount(1);
    await linje.click();
    const lag = page.locator('#vare-lag');
    await expect(lag).toHaveClass(/open/);
    await expect(page.locator('#vare-titel')).toHaveText('Flæskestegssandwich');
    await expect(page.locator('#vare-pris')).toHaveText('89,-');
    await expect(page.locator('#vare-tekst')).toHaveText('Sprød flæskesteg, rødkål og agurkesalat.');
    /* ⚠️ FOTOET ER KATEGORIENS, IKKE RETTENS (13/9) — derfor helt sløret. */
    await expect(page.locator('#vare-foto')).toHaveAttribute('src', /selskab-fade\.webp/);
    const slør = await page.locator('#vare-foto').evaluate((e) =>
      parseFloat((getComputedStyle(e).filter.match(/blur\(([\d.]+)px\)/) || [0, 0])[1]));
    expect(slør, 'fotoet i laget er skarpt — det ligner retten, man læser om').toBeGreaterThanOrEqual(12);
    await expect(page.locator('#vare-tegn')).not.toBeEmpty();
    // Smørrebrødet bestilles på sin egen side.
    await expect(page.locator('#vare-cta a')).toHaveAttribute('href', 'h-smorrebrod.html');
    await page.keyboard.press('Escape');
    await expect(lag).not.toHaveClass(/open/);
    await expect(linje, 'fokus kom ikke tilbage til varen').toBeFocused();
  });

  test('en vare uden beskrivelse er bare en række', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: data() });
    const l = page.locator('[data-vare="Fadøl, lille"]');
    await expect(l, 'vagt: rækken skal findes').toHaveCount(1);
    await expect(l).not.toHaveAttribute('role', 'button');
    await expect(l.locator('.mk-mere')).toHaveCount(0);
    await l.click();
    await expect(page.locator('#vare-lag')).not.toHaveClass(/open/);
  });

  test('en bestilbar vare peger på forsidens bestilling, og HTML i teksten er tekst', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: data() });
    await page.locator('[data-vare="Specialøl"]').click();
    await expect(page.locator('#vare-lag')).toHaveClass(/open/);
    await expect(page.locator('#vare-cta a')).toHaveAttribute('href', 'index.html#bestil');
    await expect(page.locator('#vare-tekst')).toHaveText('Fra et <b>lokalt</b> bryggeri.');
    await expect(page.locator('#vare-tekst b')).toHaveCount(0);
  });

  /* TAPASFADET (14/9). Kundens ord: "man skal også kunne bestille tapas
     her fra menukortet med knappen og en bedre beskrivelse … eller hav et
     link der siger læs mere og bestil tapas". */
  function medFad(ekstra) {
    const d = data();
    d.menu_kategorier.push({ id: 26, afdeling: 'mad', navn: 'Tapasfad', sortering: 26, aktiv: true });
    d.menu_varer.push(Object.assign({ id: 90, kategori_id: 26, navn: 'Tapasfad',
      beskrivelse: '5 slags ost · serranoskinke · chorizo · paté', pris: 179,
      sortering: 1, aktiv: true, udsolgt: false }, ekstra || {}));
    return d;
  }

  test('tapasfadet peger på sin egen side — med fadet skarpt og indholdet som brikker', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: medFad() });
    await page.locator('[data-vare="Tapasfad"]').click();
    await expect(page.locator('#vare-lag')).toHaveClass(/open/);
    const knap = page.locator('#vare-cta a');
    await expect(knap).toHaveAttribute('href', 'm-tapas.html');
    await expect(knap).toContainText('Læs mere og bestil tapas');
    /* Prisen er pr. person — uden det læses 179 som prisen for hele fadet. */
    await expect(page.locator('#vare-pris')).toHaveText('179,- pr. person');
    /* Indholdet står som brikker, ét punkt pr. brik, og ikke som én linje. */
    await expect(page.locator('#vare-bits span')).toHaveText(['5 slags ost', 'serranoskinke', 'chorizo', 'paté']);
    /* Fadets foto ER fadet: skarpt, og det samme som tapassidens. */
    await expect(page.locator('#vare-foto')).toHaveAttribute('src', /tapas-1\.jpg/);
    expect(await page.locator('#vare-foto').evaluate((e) => getComputedStyle(e).filter)).toBe('none');
    /* Og det er stadig ikke en bestilling herinde. */
    await expect(page.locator('#vare-lag [data-step], #vare-lag .plus, #vare-lag input')).toHaveCount(0);
  });

  test('et udsolgt tapasfad har ingen knap — og en anden ret beholder sløret', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: medFad({ udsolgt: true }) });
    await page.locator('[data-vare="Tapasfad"]').click();
    await expect(page.locator('#vare-lag')).toHaveClass(/open/);
    await expect(page.locator('#vare-cta a')).toHaveCount(0);
    await page.keyboard.press('Escape');
    /* Modstykket: skarpheden hører til fadet alene. */
    await page.locator('[data-vare="Flæskestegssandwich"]').click();
    await expect(page.locator('#vare-hoved')).not.toHaveClass(/skarp/);
    await expect(page.locator('#vare-bits span')).toHaveCount(0);
  });

  test('tastaturet kan åbne laget — og der er stadig ingen tæller', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { data: data() });
    const linje = page.locator('[data-vare="Flæskestegssandwich"]');
    await linje.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#vare-lag')).toHaveClass(/open/);
    await expect(page.locator('#vare-lag [data-step], #vare-lag .plus, #vare-lag input')).toHaveCount(0);
  });
});
