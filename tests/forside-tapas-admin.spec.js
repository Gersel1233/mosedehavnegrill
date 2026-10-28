/* ============================================================
   FORSIDENS TAPASKORT FØLGER ADMIN  (28/10, før lanceringen)
   ------------------------------------------------------------
   Mikkel: *"hvad med tapas-tingen ude på forsiden, der står fem
   slags — kan de godt lave det om?"* Før stod listen og linjen fast i
   index.html. Nu læses de af tapasfadets beskrivelse — det felt, admin
   skriver i (Menukort → tapas, én linje pr. ting).
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';

function data(beskrivelse) {
  const d = grunddata();
  d.menu_kategorier.push({ id: 20, afdeling: 'mad', navn: 'Tapasfad', sortering: 30, aktiv: true });
  d.menu_varer.push({ id: 20, kategori_id: 20, navn: 'Tapasfad', beskrivelse, pris: 179,
    aktiv: true, udsolgt: false, sortering: 1 });
  return d;
}

test('admins punkter står på forsidens tapaskort — ikke designets "fem slags"', async ({ page }) => {
  await åbnSkal(page, '/index.html', { ur: FREDAG, data: data('3 slags ost · Serranoskinke · Hjemmebagt brød') });
  const kort = page.locator('#tapas');
  await expect(kort.locator('.nk-liste li')).toHaveText(['3 slags ost', 'Serranoskinke', 'Hjemmebagt brød']);
  await expect(kort.locator('.nk-slogan')).toHaveText('3 slags ost, serranoskinke og hjemmebagt brød.');
  await expect(kort).not.toContainText('5 slags ost');
});

test('et langt fad bliver ikke en mur: seks punkter og "… og N mere"', async ({ page }) => {
  const lang = 'a · b · c · d · e · f · g · h · i';
  await åbnSkal(page, '/index.html', { ur: FREDAG, data: data(lang) });
  const li = page.locator('#tapas .nk-liste li');
  await expect(li).toHaveCount(7);
  await expect(li.last()).toHaveText('… og 3 mere');
  await expect(page.locator('#tapas .nk-slogan')).toContainText('og meget mere');
});

test('uden en beskrivelse står designets tekst', async ({ page }) => {
  await åbnSkal(page, '/index.html', { ur: FREDAG, data: data(null) });
  await expect(page.locator('#tapas .nk-liste li').first()).toHaveText('5 slags ost');
});
