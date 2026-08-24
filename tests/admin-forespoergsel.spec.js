/* Forespørgslerne i admin: mail-knappen og detaljerne.

   Et tilbud på et selskab er tal, datoer og forbehold — det skal
   skrives, ikke siges i en telefon ved en travl luge. Knappen
   åbner personalets eget mailprogram med adressen, referencen og
   det, gæsten har oplyst, så de ikke skal skrive det af fra
   skærmen.

   Og detaljerne skal stå som FELTER. De lå før som fri tekst i
   beskeden, hvor personalet skulle læse en sætning igennem for
   at finde tallet. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata } = require('./hjaelp');

function medForespoergsler() {
  const d = grunddata();
  const f = (id, navn, email, detaljer) => ({
    id, lokation_id: 'mosede', reference: 'FO-' + id, type: 'selskab',
    navn, telefon: '2030405' + id, email,
    dato: '2026-10-03', antal_personer: 42, besked: null,
    detaljer, status: 'ny', intern_note: null, slettet: null,
    oprettet: '2026-08-07T09:00:00.000Z',
  });

  d.forespoergsler = [
    f(1, 'Sara Poulsen', 'sara@eksempel.dk',
      { anledning: 'Konfirmation', hvor: 'hos-jer', mad: ['Smørrebrød', 'Tapasfad'] }),
    f(2, 'Jonas Berg', null, { anledning: 'Firmafest', hvor: 'ud-af-huset' }),
  ];
  return d;
}

test.describe('Forespørgsler i admin', () => {
  test('mail-knappen står på kortet med reference og detaljer', async ({ page }) => {
    await åbnAdmin(page, { data: medForespoergsler() });
    await page.locator('[data-panel="p-forespoergsler"]').click();

    const knap = page.locator('#forespoergsler-liste a[href^="mailto:"]').first();
    await expect(knap).toHaveCount(1);

    const href = decodeURIComponent(await knap.getAttribute('href'));
    expect(href).toContain('mailto:sara@eksempel.dk');
    expect(href).toContain('FO-1');
    expect(href).toContain('Antal: 42 personer');
    expect(href).toContain('Anledning: Konfirmation');
  });

  test('uden en mail er der ingen knap', async ({ page }) => {
    /* En knap, der åbner et tomt mailvindue, er en knap, man
       trykker på én gang. */
    await åbnAdmin(page, { data: medForespoergsler() });
    await page.locator('[data-panel="p-forespoergsler"]').click();

    await expect(page.locator('#forespoergsler-liste a[href^="mailto:"]')).toHaveCount(1);
    await expect(page.locator('#forespoergsler-liste')).toContainText('Jonas Berg');
  });

  test('detaljerne står som felter, ikke som fritekst', async ({ page }) => {
    await åbnAdmin(page, { data: medForespoergsler() });
    await page.locator('[data-panel="p-forespoergsler"]').click();

    const liste = page.locator('#forespoergsler-liste');
    await expect(liste).toContainText('Anledning');
    await expect(liste).toContainText('Konfirmation');
    await expect(liste).toContainText('Hos jer på havnen');
    await expect(liste).toContainText('Smørrebrød, Tapasfad');
    // Den anden er ud af huset — og det skal kunne læses
    await expect(liste).toContainText('Ud af huset');
  });
});
