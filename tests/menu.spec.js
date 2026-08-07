/* Menukortet. */

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

test('grill vises først', async ({ page }) => {
  await åbn(page, '/menu.html');
  await expect(page.locator('#menu')).toContainText('Sandwich');
  await expect(page.locator('#menu')).toContainText('Flæskestegssandwich');
  await expect(page.locator('#menu')).not.toContainText('Softice');
});

test('man kan skifte til is og tilbage', async ({ page }) => {
  await åbn(page, '/menu.html');

  await page.locator('#fane-is').click();
  await expect(page.locator('#menu')).toContainText('Softice med guf');
  await expect(page.locator('#menu')).not.toContainText('Flæskestegssandwich');
  await expect(page.locator('#fane-is')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#fane-grill')).toHaveAttribute('aria-selected', 'false');

  await page.locator('#fane-grill').click();
  await expect(page.locator('#menu')).toContainText('Flæskestegssandwich');
  await expect(page.locator('#fane-grill')).toHaveAttribute('aria-selected', 'true');
});

test('priser skrives på dansk', async ({ page }) => {
  await åbn(page, '/menu.html');
  // 89 → "89 kr." (ikke "89,00")
  await expect(page.locator('#menu')).toContainText('89 kr.');

  await page.locator('#fane-is').click();
  // 35.5 → "35,50 kr." med komma, ikke punktum
  await expect(page.locator('#menu')).toContainText('35,50 kr.');
});

test('en vare uden pris lover ikke 0 kr.', async ({ page }) => {
  const varer = grunddata().menu_varer.map(v =>
    v.id === 1 ? { ...v, pris: null } : v);
  await åbn(page, '/menu.html', { data: grunddata({ menu_varer: varer }) });

  await expect(page.locator('#menu')).toContainText('Flæskestegssandwich');
  await expect(page.locator('#menu')).not.toContainText('0 kr.');
  // Prisfeltet er tomt – CSS sætter en tankestreg
  await expect(page.locator('.vare-pris').first()).toHaveText('');
});

test('udsolgt bliver markeret, ikke skjult', async ({ page }) => {
  // Gæsten skal kunne se at varen findes, men er væk i dag.
  const varer = grunddata().menu_varer.map(v =>
    v.id === 1 ? { ...v, udsolgt: true } : v);
  await åbn(page, '/menu.html', { data: grunddata({ menu_varer: varer }) });

  await expect(page.locator('#menu')).toContainText('Flæskestegssandwich');
  await expect(page.locator('#menu')).toContainText('Udsolgt');
  await expect(page.locator('.vare').first()).toHaveClass(/er-udsolgt/);
});

test('en slukket vare vises slet ikke', async ({ page }) => {
  const varer = grunddata().menu_varer.map(v =>
    v.id === 1 ? { ...v, aktiv: false } : v);
  await åbn(page, '/menu.html', { data: grunddata({ menu_varer: varer }) });
  await expect(page.locator('#menu')).not.toContainText('Flæskestegssandwich');
});

test('en tom afdeling siger noget venligt i stedet for ingenting', async ({ page }) => {
  await åbn(page, '/menu.html', { data: grunddata({ menu_varer: [], menu_kategorier: [] }) });
  await expect(page.locator('#menu')).toContainText(/ikke lagt ind endnu/);
});

test('en kategori uden varer fylder ikke menukortet med tomme overskrifter', async ({ page }) => {
  const kat = grunddata().menu_kategorier.concat(
    [{ id: 99, afdeling: 'grill', navn: 'Vinterretter', sortering: 9, aktiv: true }]);
  await åbn(page, '/menu.html', { data: grunddata({ menu_kategorier: kat }) });
  await expect(page.locator('#menu')).not.toContainText('Vinterretter');
});

test('menusiden siger også om der er åbent', async ({ page }) => {
  await åbn(page, '/menu.html', { ur: '2026-08-07T11:00:00Z' });
  await expect(page.locator('#status-linje')).toContainText('Åbent nu');
});
