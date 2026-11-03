/* Arbejdsopgaver: Word, Excel og PDF bliver til opgaver (3/11).
   Værktøjerne ligger i js/vendor/ og hentes først, når en fil vælges. */
const path = require('path');
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, visFane } = require('./hjaelp');

async function læs(page, fil) {
  const d = grunddata();
  d.personale = [{ email: 'test@lesreg.dk', lokation_id: 'mosede', rolle: 'ejer', aktiv: true, navn: 'Mig' }];
  await åbnAdmin(page, { ur: '2026-11-03T10:00:00Z', data: d });
  await visFane(page, 'p-opgaver');
  await page.locator('#opg-ny-fold summary').click();
  await page.locator('#opg-fil').setInputFiles(path.join(__dirname, 'filer-opgaver', fil));
  await expect(page.locator('#opg-fil-status')).toContainText('opgaver fundet', { timeout: 15000 });
  return (await page.locator('#opg-ny-tekst').inputValue()).split('\n');
}

test('Word (.docx)', async ({ page }) => {
  expect(await læs(page, 'Aabning.docx')).toEqual(['Åbning', 'Tænd kaffemaskinen', 'Tjek køleskab (temperatur)', 'Sæt skilte ud']);
});

test('Excel (.xlsx) — cellerne i en række bliver én opgave', async ({ page }) => {
  expect(await læs(page, 'Ugeliste.xlsx')).toEqual(['Opgave – Hvornår', 'Rengør fritureolie – Mandag', 'Tjek isdiske', 'Bestil varer – Fredag']);
});

test('PDF', async ({ page }) => {
  expect(await læs(page, 'Lukning.pdf')).toEqual(['Lukning', 'Sluk grillen', 'Tøm skraldespande', 'Lås døren']);
});
