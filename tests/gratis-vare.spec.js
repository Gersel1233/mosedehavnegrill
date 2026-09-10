/* ============================================================
   EN VARE TIL NUL ER GRATIS — IKKE "0,-"
   ------------------------------------------------------------
   Kundens ord (10/9): *"ja hellere stå gratis"*.

   Glutenfrit brød blev sat til 0 i produktionen samme dag, fordi
   TO trykte kort siger "samme pris". Og `kroner(0)` skriver
   "0,-" — sandt, men det læses som en fejl eller en manglende
   pris, netop dér hvor kortet lover, at det ikke koster noget.

   ⚠️ OG DEN VIGTIGE HALVDEL ER, AT `kroner` IKKE MÅ SMITTES.
   Den er husets ENE talformaterer og bærer også SUMMER: en kurv
   uden noget i skal sige "0,-" og ikke "Gratis" — det sidste er
   en helt anden påstand, som gæsten læser som et tilbud. Derfor
   måler prøven BEGGE veje, og et spørgsmål til den ene alene
   ville bestå på en regel, der havde ædt den anden.

   ⚠️ OG TOM ER IKKE NUL. `null` betyder "ejeren har ikke sat en
   pris" — de to varer, der SKAL stå uden (isbaren og
   morgenbrødet, ejerens eget ord er SPØRG). Uden den prøve ville
   en regel, der kaldte alt uden pris "Gratis", bestå.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

/* Reglen læses i BROWSEREN og ikke af filen: et spørgsmål til
   kildekoden ville bestå, hvis kaldstedet aldrig spurgte den. */
async function svar(page, fn) {
  return page.evaluate((kode) => eval(kode), fn);
}

test.describe('En vare til nul er gratis', () => {

  test('Butik.varePris(0) er "Gratis" — og tom er stadig tom', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    expect(await svar(page, 'Butik.varePris(0)')).toBe('Gratis');
    expect(await svar(page, 'Butik.varePris(null)')).toBe('');
    expect(await svar(page, 'Butik.varePris(undefined)')).toBe('');
    expect(await svar(page, "Butik.varePris('')")).toBe('');
    expect(await svar(page, 'Butik.varePris(55)')).toBe('55,-');
  });

  /* ⚠️ MODSTYKKET. Uden det ville en regel, der lagde "Gratis"
     ind i selve talformatereren, bestå prøven ovenfor — og en tom
     kurv ville sige "Gratis" i sumlinjen. */
  test('men SUMMEN siger stadig "0,-" — kroner er urørt', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    expect(await svar(page, 'Butik.kroner(0)')).toBe('0,-');
    expect(await svar(page, "Butik.kroner(0, 'kr')")).toBe('0 kr.');
    expect(await svar(page, 'Butik.pris(0)')).toBe('0 kr.');
  });

  /* Og reglen skal stå på SKÆRMEN, ikke kun i motoren. En vare
     til nul lægges i menukortet, og rækkens pris læses. */
  test('en gratis vare står som Gratis på menukortet', async ({ page }) => {
    const d = grunddata();
    d.menu_varer.push({
      id: 900, kategori_id: 1, navn: 'Glutenfrit brød (tillæg)',
      beskrivelse: null, pris: 0, fremhaevet: false, udsolgt: false,
      sortering: 90, aktiv: true,
    });
    await åbnSkal(page, '/m-menukort.html', { data: d });
    const række = page.locator('.mk-linje', { hasText: 'Glutenfrit brød' });
    await expect(række).toHaveCount(1);
    await expect(række.locator('.mk-pris')).toHaveText('Gratis');
  });

  /* ⚠️ OG DEN MÅ IKKE FORVEKSLES MED "spørg". En vare UDEN pris
     skal blive ved med at sige spørg — det er isbaren og
     morgenbrødet, hvor ejerens eget svar er SPØRG. */
  test('en vare uden pris siger stadig spørg', async ({ page }) => {
    const d = grunddata();
    d.menu_varer.push({
      id: 901, kategori_id: 1, navn: 'Isbar med betjening',
      beskrivelse: null, pris: null, fremhaevet: false, udsolgt: false,
      sortering: 91, aktiv: true,
    });
    await åbnSkal(page, '/m-menukort.html', { data: d });
    const række = page.locator('.mk-linje', { hasText: 'Isbar med betjening' });
    await expect(række).toHaveCount(1);
    await expect(række.locator('.mk-pris')).toHaveText('spørg');
  });
});
