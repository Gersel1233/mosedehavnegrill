/* Hjernen (4/11, supabase/funktioner/laes-opgaver.ts). Mikkel: "det skal være
   en hjerne, der læser dokumentet, og hvad Jim sådan vil med hans dokument".
   Her svarer en efterligning i stedet for Claude: vi prøver, at admin sender
   dokumentet rigtigt af sted, viser forståelsen, tager flere lister én ad
   gangen — og falder tilbage til den enkle læser, når hjernen ikke svarer. */
const path = require('path');
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData } = require('./hjaelp');

function chefData() {
  const d = grunddata();
  d.personale = [{ email: 'test@lesreg.dk', lokation_id: 'mosede', rolle: 'ejer', aktiv: true, navn: 'Mig' }];
  d.medarbejdere = [{ id: 7, lokation_id: 'mosede', navn: 'Jim Hansen', initialer: 'JH', aktiv: true }];
  return d;
}

// Sådan svarer hjernen på et rodet dokument: en mail fra Jim.
const SVAR = {
  forklaring: 'Jim har skrevet en mail med en lukkeliste for de næste to uger og en ugentlig rengøring om mandagen.',
  lister: [
    { titel: 'Lukning', ugedage: null, gyldig_fra: '2026-11-09', gyldig_til: '2026-11-22', periode_tekst: 'de næste 2 uger',
      ansvarlig_initialer: 'JH',
      afsnit: [{ navn: 'Hver aften', ugedag: null, dato: null, opgaver: [
        { tekst: 'Sluk grill og frituren', vaerdi: null, ugedag: null, dato: null },
        { tekst: 'Mål temperatur i kølerummet', vaerdi: 'Temp. °C', ugedag: null, dato: null }] }] },
    { titel: 'Ugentlig rengøring', ugedage: [1], gyldig_fra: null, gyldig_til: null, periode_tekst: null, ansvarlig_initialer: null,
      afsnit: [{ navn: '', ugedag: null, dato: null, opgaver: [
        { tekst: 'Afrim fryseren', vaerdi: null, ugedag: null, dato: null },
        { tekst: '', vaerdi: null, ugedag: null, dato: null }] }] },
  ],
};

async function medHjerne(page, svar) {
  await page.evaluate((svar) => {
    window.__sendt = [];
    Butik.skrive.hjerneLaes = (krop) => {
      window.__sendt.push(krop);
      if (svar && svar.fejl) { const e = new Error(svar.fejl); e.kode = svar.fejl; return Promise.reject(e); }
      return new Promise((ja) => setTimeout(() => ja(svar), 150));
    };
  }, svar);
}
async function åbnOpgaver(page) {
  await åbnAdmin(page, { ur: '2026-11-04T10:00:00Z', data: chefData() });
  await page.evaluate(() => Admin.visFane('p-opgaver'));
  await page.locator('#opg-ny-fold > summary').click();
}

test('hjernen forstår dokumentet: forklaring, periode, ansvarlig og to lister én ad gangen', async ({ page }) => {
  await åbnOpgaver(page);
  await medHjerne(page, SVAR);
  await page.locator('#opg-fil').setInputFiles(path.join(__dirname, 'filer-opgaver', 'Jims-liste.docx'));
  await expect(page.locator('#opg-fil-status')).toContainText('2 lister med 3 opgaver fundet');

  // Word sendes som tekst med formen bevaret; holdet og dagen følger med.
  const sendt = (await page.evaluate(() => window.__sendt))[0];
  expect(sendt).toMatchObject({ navn: 'Jims-liste.docx', idag: '2026-11-04', hold: [{ navn: 'Jim Hansen', initialer: 'JH' }] });
  expect(sendt.tekst).toContain('**Lukkeliste + ugens ekstra**');
  expect(sendt.tekst).toContain('- sluk grill og frituren');
  expect(sendt.data).toBeUndefined();

  const u = page.locator('#opg-udkast');
  await expect(u.locator('.opg-hjerne')).toContainText('Jim har skrevet en mail');
  await expect(u.locator('.opg-nr')).toHaveText('Liste 1 af 2');
  await expect(page.locator('#opg-ny-navn')).toHaveValue('Lukning');
  await expect(page.locator('#opg-ny-fra')).toHaveValue('2026-11-09');
  await expect(page.locator('#opg-ny-til')).toHaveValue('2026-11-22');
  await expect(u).toContainText('Fundet i filen: »de næste 2 uger«');
  await expect(u.locator('select[aria-label="Ansvarlig"]')).toHaveValue('7');
  await expect(page.locator('#opg-opret')).toHaveText('✓ Opret listen (2 opgaver)');
  await page.locator('#opg-opret').click();

  // Liste 2 kommer af sig selv, kun om mandagen.
  await expect(page.locator('#kvittering')).toContainText('her er den næste');
  await expect(u.locator('.opg-nr')).toHaveText('Liste 2 af 2');
  await expect(page.locator('#opg-ny-navn')).toHaveValue('Ugentlig rengøring');
  await expect(u.locator('.opg-hjerne')).toHaveCount(0);
  await expect(page.locator('#opg-ny-dage [data-dag="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#opg-ny-dage [data-dag="2"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#opg-opret')).toHaveText('✓ Opret listen (1 opgave)');
  await page.locator('#opg-opret').click();
  await expect(page.locator('#kvittering')).toContainText('Listen er oprettet — den står på dagens opgaver.');
  await expect(u).toBeHidden();

  const d = await gemteData(page);
  expect(d.opgavelister.map((l) => [l.navn, l.gyldig_fra, l.gyldig_til, l.ansvarlig_id, l.ugedage])).toEqual([
    ['Lukning', '2026-11-09', '2026-11-22', 7, null], ['Ugentlig rengøring', null, null, null, [1]]]);
  expect(d.opgaver.find((o) => o.tekst === 'Mål temperatur i kølerummet').vaerdi_navn).toBe('Temp. °C');
});

test('en PDF og et foto sendes, som de er — fotoet gjort mindre som JPEG', async ({ page }) => {
  await åbnOpgaver(page);
  await medHjerne(page, SVAR);
  await page.locator('#opg-fil').setInputFiles(path.join(__dirname, 'filer-opgaver', 'Lukning.pdf'));
  await expect(page.locator('#opg-udkast .opg-hjerne')).toBeVisible();
  await page.locator('#opg-udkast button', { hasText: 'Fortryd' }).click();
  // Et lille PNG-billede (et "foto" af en papirliste).
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP4z8DwnwEIGGEMAD/7Bf9lZ5TFAAAAAElFTkSuQmCC', 'base64');
  await page.locator('#opg-fil').setInputFiles({ name: 'papirliste.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('#opg-udkast .opg-hjerne')).toBeVisible();
  const [pdf, foto] = await page.evaluate(() => window.__sendt);
  expect(pdf.mime).toBe('application/pdf');
  expect(Buffer.from(pdf.data, 'base64').slice(0, 5).toString()).toBe('%PDF-');
  expect(pdf.tekst).toBeUndefined();
  expect(foto.mime).toBe('image/jpeg');
  expect(Buffer.from(foto.data, 'base64').slice(0, 2).toString('hex')).toBe('ffd8');
});

test('svarer hjernen ikke, bruges den enkle læser — og det siges', async ({ page }) => {
  await åbnOpgaver(page);
  await medHjerne(page, { fejl: 'intet_net' });
  await page.locator('#opg-fil').setInputFiles(path.join(__dirname, 'filer-opgaver', 'Egenkontrol.pdf'));
  await expect(page.locator('#opg-fil-status')).toContainText('9 opgaver fundet i 3 afsnit', { timeout: 15000 });
  await expect(page.locator('#opg-fil-status')).toContainText('Hjernen svarede ikke — tjek nettet');
  await expect(page.locator('#opg-udkast .opg-hjerne')).toHaveCount(0);
});

test('er det ikke en opgaveliste, siger hjernen det', async ({ page }) => {
  await åbnOpgaver(page);
  await medHjerne(page, { forklaring: 'Det her er et menukort, ikke en liste over opgaver.', lister: [] });
  await page.locator('#opg-fil').setInputFiles(path.join(__dirname, 'filer-opgaver', 'Lukning.pdf'));
  await expect(page.locator('#opg-fil-status')).toContainText('Det her er et menukort');
  await expect(page.locator('#opg-udkast')).toBeHidden();
});
