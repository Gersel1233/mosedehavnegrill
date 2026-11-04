/* Arbejdsopgaver: filerne bliver til opgaver (3/11 · 4/11).
   Mikkel: "så han kan uploade en PDF-fil, og så er vores system dygtigt nok
   til at gøre det til et sæt opgaver". js/admin/opgave-laeser.js finder
   titel, afsnit, tabeller og målinger og springer papirets felter over. */
const path = require('path');
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData } = require('./hjaelp');

async function læs(page, fil) {
  await åbnAdmin(page, { data: grunddata() });
  return page.evaluate(async (f) => {
    const b = await (await fetch('tests/filer-opgaver/' + f)).blob();
    return Admin.opgaveLaeser.laesFil(new File([b], f, { type: b.type }));
  }, fil);
}
const tekster = (a) => a.opgaver.map((o) => o.tekst);

test('PDF-rengøringsplan: titel, afsnit, tabel med ugedage og en opgave over to linjer', async ({ page }) => {
  const r = await læs(page, 'Rengoeringsplan.pdf');
  expect(r.titel).toBe('Rengøringsplan – Køkken');
  expect(r.afsnit.map((a) => a.navn)).toEqual(['Dagligt', 'Ugentligt', 'Lukning']);
  expect(tekster(r.afsnit[0])).toEqual(['Vask skærebrætter', 'Rengør grill og plader', 'Tør borde og stole af', 'Tøm skraldespande']);
  expect(tekster(r.afsnit[1])).toEqual(['Afrim fryser', 'Rengør emhættefilter']);
  expect(tekster(r.afsnit[2])).toEqual(['Sluk grill og frituregryde',
    'Tjek at køleskabe er lukket og temperaturen er under 5 grader', 'Lås bagdøren']);
  // Papirets felter er væk.
  expect(JSON.stringify(r)).not.toMatch(/Side \d|Uge:|Kontrolleret|Sign|Man Tir/);
});

test('PDF-egenkontrol: fede overskrifter, nummererede punkter og en temperatur-kolonne', async ({ page }) => {
  const r = await læs(page, 'Egenkontrol.pdf');
  expect(r.titel).toBe('EGENKONTROL');
  expect(r.afsnit.map((a) => a.navn)).toEqual(['Ved åbning', 'Temperaturer', 'Ved lukning']);
  expect(tekster(r.afsnit[0])).toEqual(['Mål temperatur i køleskab 1 og 2', 'Tjek datoer på mælk og fløde', 'Vask hænder og tag forklæde på']);
  expect(r.afsnit[1].opgaver).toEqual([
    { tekst: 'Køleskab 1 (drikkevarer)', vaerdi: 'Temp. °C' },
    { tekst: 'Køleskab 2 (råvarer)', vaerdi: 'Temp. °C' },
    { tekst: 'Fryser', vaerdi: 'Temp. °C' },
  ]);
  expect(tekster(r.afsnit[2])).toEqual(['Sluk alle maskiner', 'Tøm og rengør kaffemaskinen', 'Lås alle døre']);
  expect(JSON.stringify(r)).not.toMatch(/Revideret|Enhed|Udfyldt af/);
});

test('enkel PDF-liste: første linje er titlen', async ({ page }) => {
  const r = await læs(page, 'Lukning.pdf');
  expect(r.titel).toBe('Lukning');
  expect(tekster(r.afsnit[0])).toEqual(['Sluk grillen', 'Tøm skraldespande', 'Lås døren']);
});

test('Word (.docx)', async ({ page }) => {
  const r = await læs(page, 'Aabning.docx');
  expect(r.titel).toBe('Åbning');
  expect(tekster(r.afsnit[0])).toEqual(['Tænd kaffemaskinen', 'Tjek køleskab (temperatur)', 'Sæt skilte ud']);
});

test('Excel (.xlsx) — tabelhovedet springes over, ugedagen bliver', async ({ page }) => {
  const r = await læs(page, 'Ugeliste.xlsx');
  expect(tekster(r.afsnit[0])).toEqual(['Rengør fritureolie – Mandag', 'Tjek isdiske', 'Bestil varer – Fredag']);
});

test('chefen uploader en PDF, ser udkastet og opretter listen med afsnit og måling', async ({ page }) => {
  const d = grunddata();
  d.personale = [{ email: 'test@lesreg.dk', lokation_id: 'mosede', rolle: 'ejer', aktiv: true, navn: 'Mig' }];
  await åbnAdmin(page, { ur: '2026-11-04T10:00:00Z', data: d });
  await page.evaluate(() => Admin.visFane('p-opgaver'));
  await page.locator('#opg-ny-fold > summary').click();
  await page.locator('#opg-fil').setInputFiles(path.join(__dirname, 'filer-opgaver', 'Egenkontrol.pdf'));
  await expect(page.locator('#opg-fil-status')).toContainText('9 opgaver fundet i 3 afsnit', { timeout: 15000 });
  await expect(page.locator('#opg-ny-navn')).toHaveValue('EGENKONTROL');
  await expect(page.locator('#opg-udkast .opg-forh-afsnit')).toHaveCount(3);
  await expect(page.locator('#opg-opret')).toHaveText('✓ Opret listen (9 opgaver)');
  await page.locator('#opg-ny-navn').fill('Egenkontrol');
  await page.locator('#opg-opret').click();
  await expect(page.locator('#kvittering')).toContainText('Listen er oprettet');

  const kort = page.locator('#opg-dag .opg-liste', { hasText: 'Egenkontrol' });
  await expect(kort).toContainText('0/9');
  await expect(kort.locator('.opg-afsnit')).toHaveCount(3);
  await expect(kort).toContainText('📏 Temp. °C');

  // Personalet: temperatur + initialer på køleskab 1.
  const r = kort.locator('.opg-raekke', { hasText: 'Køleskab 1 (drikkevarer)' });
  await r.locator('.opg-tryk').click();
  await r.locator('.opg-vaerdi-felt').fill('3,5');
  await r.locator('.opg-ini-felt').fill('lk');
  await r.locator('button', { hasText: '✓ Udført' }).click();
  const gjort = page.locator('#opg-dag .opg-raekke', { hasText: 'Køleskab 1 (drikkevarer)' });
  await expect(gjort).toContainText('LK');
  await expect(gjort).toContainText('3,5 °C');
  const u = (await gemteData(page)).opgave_udfoert;
  expect(u).toHaveLength(1);
  expect(u[0]).toMatchObject({ tekst: 'Køleskab 1 (drikkevarer)', initialer: 'LK', vaerdi: '3,5' });
});

test('testdokumentet (filer/eksempel-opgaveliste.pdf) bliver til 5 afsnit og 19 opgaver', async ({ page }) => {
  const r = await læs(page, 'eksempel-opgaveliste.pdf');
  expect(r.titel).toBe('Daglige opgaver – Mosede Havnecafe');
  expect(r.afsnit.map((a) => a.navn)).toEqual(['Ved åbning', 'Egenkontrol – temperaturer', 'I løbet af dagen', 'Ved lukning', 'Ugentligt']);
  expect(r.afsnit.reduce((s, a) => s + a.opgaver.length, 0)).toBe(19);
  expect(r.afsnit[1].opgaver.every((o) => o.vaerdi === 'Temp. °C')).toBe(true);
  expect(tekster(r.afsnit[3])).toContain('Rengør grillplade og stål, og tør alle overflader af med sprit');
  expect(JSON.stringify(r)).not.toMatch(/Uge:|Sign|Side \d|Kontrolleret|Revideret|Enhed/);
});

test('"Prøv med et eksempel" lægger testdokumentet ind som udkast', async ({ page }) => {
  const d = grunddata();
  d.personale = [{ email: 'test@lesreg.dk', lokation_id: 'mosede', rolle: 'ejer', aktiv: true, navn: 'Mig' }];
  await åbnAdmin(page, { ur: '2026-11-04T10:00:00Z', data: d });
  await page.evaluate(() => Admin.visFane('p-opgaver'));
  await page.locator('#opg-ny-fold > summary').click();
  await page.locator('#opg-eksempel').click();
  await expect(page.locator('#opg-fil-status')).toContainText('19 opgaver fundet i 5 afsnit', { timeout: 15000 });
  await expect(page.locator('#opg-ny-navn')).toHaveValue('Daglige opgaver – Mosede Havnecafe');
});
