/* Menukortet på sin egen side.

   Testene her er de samme påstande som lå i forside.spec.js, indtil
   hele menukortet flyttede væk fra forsiden. De handler stadig om
   de tre ting der kan gå galt med et menukort:

   1) At en pris bliver opdigtet. Fire varer står med "ca." på
      forretningens eget kort, og de skal vises UDEN pris.
   2) At en kategori uden priser – de 29 slags smørrebrødsfyld –
      bliver en søjle med 29 tankestreger i stedet for pastiller.
   3) At en udsolgt vare forsvinder. Den skal blive stående med et
      mærke, så gæsten kan se at den findes til næste gang.

   Og to der er nye med siden: at afdelingerne kan skiftes, og at et
   link direkte til en kategori åbner den rigtige afdeling.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

test.describe('Hele menukortet', () => {

  test('mad vises først, med kategorier fra databasen', async ({ page }) => {
    await åbn(page, '/menu.html');
    await expect(page.locator('#afd-mad')).toHaveAttribute('aria-selected', 'true');
    // Og fanen skal SES valgt, ikke kun være det for en skærmlæser
    await expect(page.locator('#afd-mad')).toHaveClass(/valgt/);
    await expect(page.locator('#afd-is')).not.toHaveClass(/valgt/);
    await expect(page.locator('#menu-liste .kat')).toHaveCount(2);
    await expect(page.locator('#menu-liste')).toContainText('Smørrebrød');
    await expect(page.locator('#menu-liste')).not.toContainText('Fadøl');
  });

  test('man kan skifte til is og til drikkevarer', async ({ page }) => {
    await åbn(page, '/menu.html');

    await page.locator('#afd-is').click();
    await expect(page.locator('#menu-liste')).toContainText('Softice med guf');
    await expect(page.locator('#menu-liste')).not.toContainText('Flæskestegssandwich');
    await expect(page.locator('#afd-is')).toHaveClass(/valgt/);

    await page.locator('#afd-drikke').click();
    await expect(page.locator('#menu-liste')).toContainText('Fadøl, lille');
    await expect(page.locator('#afd-mad')).toHaveAttribute('aria-selected', 'false');
  });

  test('priser skrives som på et menukort', async ({ page }) => {
    await åbn(page, '/menu.html');
    await expect(page.locator('#menu-liste .linje-pris').first()).toHaveText('89,-');

    await page.locator('#afd-is').click();
    // 35,5 → "35,50,-" ville være grimt; komma-formen bevares
    await expect(page.locator('#menu-liste .linje-pris').first()).toHaveText('35,50,-');
  });

  test('en kategori uden priser vises som pastiller, ikke som tankestreger', async ({ page }) => {
    // Fyldet til smørrebrødet er en liste man vælger fra. 29
    // tankestreger i en priskolonne er støj.
    await åbn(page, '/menu.html');
    const valg = page.locator('#menu-liste .valg');
    await expect(valg).toHaveCount(1);
    await expect(valg.locator('.valg-en')).toHaveCount(2);
    await expect(valg).toContainText('Dyrlægens natmad');
    // Ingen prisfelter i den kategori
    expect(await page.locator('#menu-liste .kat').last().locator('.linje-pris').count()).toBe(0);
  });

  test('en vare uden pris viser ingen pris – aldrig et gæt', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, pris: null } : v);
    await åbn(page, '/menu.html', { data: grunddata({ menu_varer: varer }) });

    await expect(page.locator('#menu-liste')).toContainText('Flæskestegssandwich');
    await expect(page.locator('#menu-liste')).not.toContainText('0,-');
    // Kategorien har nu ingen priser, så den vises som pastiller
    await expect(page.locator('#menu-liste .valg')).toHaveCount(2);
  });

  test('udsolgt markeres, men varen bliver stående', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, udsolgt: true } : v);
    await åbn(page, '/menu.html', { data: grunddata({ menu_varer: varer }) });
    await expect(page.locator('#menu-liste .linje').first()).toHaveClass(/udsolgt/);
    await expect(page.locator('#menu-liste')).toContainText('Flæskestegssandwich');
  });

  test('en slukket vare vises slet ikke', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, aktiv: false } : v);
    await åbn(page, '/menu.html', { data: grunddata({ menu_varer: varer }) });
    await expect(page.locator('#menu-liste')).not.toContainText('Flæskestegssandwich');
  });

  test('en tom afdeling siger noget venligt', async ({ page }) => {
    await åbn(page, '/menu.html', { data: grunddata({ menu_varer: [] }) });
    await expect(page.locator('#menu-liste')).toContainText(/ikke lagt noget ind/);
  });

  test('noten under menukortet kommer fra databasen', async ({ page }) => {
    await åbn(page, '/menu.html');
    await expect(page.locator('#menu-note')).toContainText('glutenfri');
  });

  test('gamle kategorier med afdeling "grill" havner under mad', async ({ page }) => {
    // Efter en halv opgradering af databasen kan der stå 'grill'.
    // De må ikke blive usynlige.
    const kat = grunddata().menu_kategorier.map(k =>
      k.id === 1 ? { ...k, afdeling: 'grill' } : k);
    await åbn(page, '/menu.html', { data: grunddata({ menu_kategorier: kat }) });
    await expect(page.locator('#menu-liste')).toContainText('Flæskestegssandwich');
  });
});

test.describe('Sikkerhed og robusthed', () => {

  test('et varenavn med tegn fra HTML bliver vist som tekst', async ({ page }) => {
    const farligt = '<img src=x onerror="window.HACKET=1">Burger';
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, navn: farligt } : v);
    await åbn(page, '/menu.html', { data: grunddata({ menu_varer: varer }) });

    await expect(page.locator('#menu-liste')).toContainText(farligt);
    expect(await page.evaluate(() => window.HACKET)).toBeUndefined();
    expect(await page.locator('#menu-liste img').count()).toBe(0);
  });

  test('siden går ikke ned hvis databasen svarer tomt', async ({ page }) => {
    const tomt = {
      lokationer: [], aabningstider: [], lukkedage: [],
      menu_kategorier: [], menu_varer: [], nyheder: [], indstillinger: {},
    };
    await åbn(page, '/menu.html', { data: tomt });

    /* Siden skal stå der, og gæsten skal kunne ringe. En tom
       database må aldrig blive en hvid skærm. */
    await expect(page.locator('h1')).toContainText('Menukortet');
    await expect(page.locator('#menu-status-tekst')).not.toHaveText('');
    await expect(page.locator('#menu-tel')).toHaveAttribute('href', /^tel:/);
    await expect(page.locator('#menu-liste')).toContainText(/ikke lagt noget ind/);
  });
});
