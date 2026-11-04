/* Opgaver med periode og dage (4/11, supabase/opgaver-perioder-4-11.sql).
   Mikkel: "og hvad hvis det er en uge frem, han laver dem, eller 5 dage
   frem eller 2 uger?" Jim skriver "gælder uge 46-47" øverst og "Mandag",
   "Onsdag", "Fredag" over det, der kun skal gøres de dage. */
const path = require('path');
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData } = require('./hjaelp');

const tekster = (a) => a.opgaver.map((o) => o.tekst);
function chefData() {
  const d = grunddata();
  d.personale = [{ email: 'test@lesreg.dk', lokation_id: 'mosede', rolle: 'ejer', aktiv: true, navn: 'Mig' }];
  return d;
}

test('Jims Word-dokument: periode, ÅBNING/LUKNING, temperaturfelter og dag-afsnit', async ({ page }) => {
  await åbnAdmin(page, { ur: '2026-11-04T10:00:00Z', data: grunddata() });
  const r = await page.evaluate(async () => {
    const b = await (await fetch('tests/filer-opgaver/Jims-liste.docx')).blob();
    return Admin.opgaveLaeser.laesFil(new File([b], 'Jims-liste.docx', { type: b.type }));
  });
  expect(r.titel).toBe('Lukkeliste + ugens ekstra');
  expect(r.periode).toMatchObject({ fra: '2026-11-09', til: '2026-11-22', tekst: 'gælder uge 46-47' });
  expect(r.afsnit.map((a) => [a.navn, a.ugedag || null])).toEqual([
    ['ÅBNING', null], ['LUKNING', null], ['Mandag', 1], ['Onsdag', 3], ['Fredag', 5]]);
  expect(tekster(r.afsnit[0])).toEqual(['tænd kaffemaskine og opvasker', 'tjek mail og bookinger for dagen',
    'skilte ud + tænd lys på terrassen', 'Temp køleskab', 'Fryser']);
  expect(r.afsnit[0].opgaver.slice(3).every((o) => o.vaerdi === 'Temp. °C')).toBe(true);
  // Den fede "HUSK …" er en opgave, ikke en overskrift.
  expect(tekster(r.afsnit[1])).toContain('HUSK AT LÅSE BAGDØREN!!');
  expect(r.afsnit[2].opgaver.every((o) => o.ugedag === 1)).toBe(true);
  // Jims hilsen og telefonnummer er ikke en opgave.
  expect(JSON.stringify(r.afsnit)).not.toMatch(/ring til mig|22 33 44 55|gælder uge/i);
});

test('perioder og dage i tekst: uge, datoer og "Fredag 13/11"', async ({ page }) => {
  await åbnAdmin(page, { ur: '2026-11-04T10:00:00Z', data: grunddata() });
  const ud = await page.evaluate(() => {
    const L = Admin.opgaveLaeser;
    return {
      dato: L.fraTekst('Ekstra opgaver\n10/11 - 14/11\n- vask vinduer\n- pudse messing').periode,
      maaned: L.fraTekst('Julefrokost-uger\n1.-14. december\n- pynt op\n- sæt lys i vinduerne').periode,
      dage: L.fraTekst('Næste uge\n\nTirsdag 10/11\n- tag imod vinlevering\n\nFredag 13/11\n- rens ismaskinen'),
    };
  });
  expect(ud.dato).toMatchObject({ fra: '2026-11-10', til: '2026-11-14' });
  expect(ud.maaned).toMatchObject({ fra: '2026-12-01', til: '2026-12-14' });
  expect(ud.dage.afsnit.map((a) => [a.navn, a.dato])).toEqual([['Tirsdag 10/11', '2026-11-10'], ['Fredag 13/11', '2026-11-13']]);
  // Ingen periode i filen → fra første til sidste dato.
  expect(ud.dage.periode).toMatchObject({ fra: '2026-11-10', til: '2026-11-13' });
});

test('chefen lægger Jims liste ind: den står kun i uge 46-47, og dagens opgaver kun den dag', async ({ page }) => {
  await åbnAdmin(page, { ur: '2026-11-04T10:00:00Z', data: chefData() });
  await page.evaluate(() => Admin.visFane('p-opgaver'));
  await page.locator('#opg-ny-fold > summary').click();
  await page.locator('#opg-fil').setInputFiles(path.join(__dirname, 'filer-opgaver', 'Jims-liste.docx'));
  await expect(page.locator('#opg-fil-status')).toContainText('15 opgaver fundet i 5 afsnit', { timeout: 15000 });
  await expect(page.locator('#opg-ny-fra')).toHaveValue('2026-11-09');
  await expect(page.locator('#opg-ny-til')).toHaveValue('2026-11-22');
  await expect(page.locator('#opg-udkast .opg-periode-info')).toHaveText('9/11–22/11 (uge 46–47)');
  await expect(page.locator('#opg-udkast')).toContainText('Fundet i filen: »gælder uge 46-47«');
  const afsnit = page.locator('#opg-udkast .opg-forh-afsnit');
  await expect(afsnit.nth(2).locator('.opg-forh-dag')).toHaveValue('1');
  await expect(afsnit.nth(0).locator('.opg-forh-dag')).toHaveValue('');
  await page.locator('#opg-ny-navn').fill('Jims lukkeliste');
  await page.locator('#opg-opret').click();
  await expect(page.locator('#kvittering')).toContainText('Listen er oprettet');

  const d = await gemteData(page);
  expect(d.opgavelister[0]).toMatchObject({ navn: 'Jims lukkeliste', gyldig_fra: '2026-11-09', gyldig_til: '2026-11-22' });
  expect(d.opgaver.filter((o) => o.ugedag === 1).map((o) => o.tekst)).toEqual(['skift fritureolie', 'bestil fisk hos Hugo inden kl 11']);

  // I dag (onsdag 4/11, uge 45) gælder listen ikke endnu.
  await expect(page.locator('#opg-dag')).toContainText('Ingen lister gælder for denne dag.');
  // Mandag 9/11: åbning, lukning og mandagens to — ikke onsdag eller fredag.
  await page.locator('#opg-dag-vaelg').fill('2026-11-09');
  const kort = page.locator('#opg-dag .opg-liste', { hasText: 'Jims lukkeliste' });
  await expect(kort).toContainText('0/12');
  await expect(kort).toContainText('skift fritureolie');
  await expect(kort).not.toContainText('afrim fryser');
  await expect(kort).not.toContainText('rens kaffemaskinen');
  await expect(kort).toContainText('📅 9/11–22/11 (uge 46–47)');
  // Onsdag 11/11: onsdagens ene.
  await page.locator('#opg-dag-vaelg').fill('2026-11-11');
  await expect(kort).toContainText('0/11');
  await expect(kort).toContainText('afrim fryser i baglokalet');
  await expect(kort).not.toContainText('skift fritureolie');
  // Mandag 23/11 (uge 48): listen er udløbet.
  await page.locator('#opg-dag-vaelg').fill('2026-11-23');
  await expect(page.locator('#opg-dag')).toContainText('Ingen lister gælder for denne dag.');
});

test('perioden og afsnittets dag kan rettes bagefter — og en ny opgave under "Mandag" står om mandagen', async ({ page }) => {
  const d = chefData();
  d.opgavelister = [{ id: 1, lokation_id: 'mosede', navn: 'Ugeliste', aktiv: true, raekkefoelge: 0,
    gyldig_fra: '2026-11-09', gyldig_til: '2026-11-15', oprettet: '2026-11-01T10:00:00Z' }];
  d.opgaver = [
    { id: 1, lokation_id: 'mosede', liste_id: 1, tekst: 'Tør borde af', afsnit: 'Hver dag', raekkefoelge: 0, aktiv: true },
    { id: 2, lokation_id: 'mosede', liste_id: 1, tekst: 'Skift olie', afsnit: 'Mandag', ugedag: 1, raekkefoelge: 1, aktiv: true },
  ];
  await åbnAdmin(page, { ur: '2026-11-09T10:00:00Z', data: d });
  await page.evaluate(() => Admin.visFane('p-opgaver'));
  const fold = page.locator('.opg-ret-liste[data-liste="1"]');
  await expect(fold.locator('summary')).toContainText('9/11–15/11 (uge 46)');
  await fold.locator('summary').click();

  // Forlæng til to uger.
  await page.locator('#opg-ret-1-til').fill('2026-11-22');
  await page.locator('#opg-ret-1-til').dispatchEvent('change');
  await expect(page.locator('#kvittering')).toContainText('Perioden er gemt: 9/11–22/11 (uge 46–47).');
  expect((await gemteData(page)).opgavelister[0].gyldig_til).toBe('2026-11-22');

  // Ny opgave under "Mandag" arver mandagen.
  const mandag = fold.locator('.opg-forh-afsnit').nth(1);
  await expect(mandag.locator('.opg-forh-dag')).toHaveValue('1');
  await mandag.locator('input[placeholder^="Ny opgave"]').fill('Bestil fisk');
  await mandag.locator('button', { hasText: '+ Tilføj' }).click();
  await expect(page.locator('#kvittering')).toContainText('Opgaven er tilføjet');
  expect((await gemteData(page)).opgaver.find((o) => o.tekst === 'Bestil fisk')).toMatchObject({ ugedag: 1, afsnit: 'Mandag' });

  // "Mandag" → hver dag.
  await fold.locator('.opg-forh-afsnit').nth(1).locator('.opg-forh-dag').selectOption('');
  await expect(page.locator('#kvittering')).toContainText('Mandag står nu hver dag.');
  expect((await gemteData(page)).opgaver.filter((o) => o.afsnit === 'Mandag').every((o) => o.ugedag === null)).toBe(true);

  // Altid: perioden fjernes.
  await page.locator('.opg-ret-liste[data-liste="1"]').locator('button', { hasText: 'Altid' }).click();
  await expect(page.locator('#kvittering')).toContainText('Listen gælder nu altid.');
  expect((await gemteData(page)).opgavelister[0]).toMatchObject({ gyldig_fra: null, gyldig_til: null });
});

test('en liste uden periode og dage står hver dag som før', async ({ page }) => {
  const d = chefData();
  d.opgavelister = [{ id: 1, lokation_id: 'mosede', navn: 'Lukning', aktiv: true, raekkefoelge: 0, oprettet: '2026-11-01T10:00:00Z' }];
  d.opgaver = [{ id: 1, lokation_id: 'mosede', liste_id: 1, tekst: 'Lås døren', raekkefoelge: 0, aktiv: true }];
  await åbnAdmin(page, { ur: '2026-11-04T10:00:00Z', data: d });
  await page.evaluate(() => Admin.visFane('p-opgaver'));
  for (const dag of ['2026-11-04', '2026-11-09', '2027-02-01']) {
    await page.locator('#opg-dag-vaelg').fill(dag);
    await expect(page.locator('#opg-dag .opg-liste', { hasText: 'Lukning' })).toContainText('Lås døren');
  }
});
