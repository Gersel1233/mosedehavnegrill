/* HISTORIEN OM MOSEDE HAVN  (31/8)

   Kundens ord: i den mørke info-sektion skal der være historie om
   cafeen med en knap, "og når man har trykket på historien om
   Mosede Havn, skal der komme en helt anden slags stil, end vi
   har kørt med — nærmest cinematisk". Og: "bestil-knappen skal
   væk for telefonen, selvfølgelig, når man læser."

   Tre ting måles her, og de er tre forskellige slags:

   1) DEN LOVER IKKE NOGET, VI IKKE HAR BELÆG FOR. Halvdelen af
      historien er lokalhistorie, ikke noget forretningen har
      målt. Kildelinjen er husets regel gjort synlig — uden den er
      siden en påstand.

   2) BESTILLINGEN STÅR IKKE I VEJEN. Den flydende pille er en rød
      plet, der beder om noget andet, end man er i gang med.

   3) STILEN ER EN ANDEN. Det er hele bestillingen, og det kan
      måles: grunden er mørk, ikke husets creme.

   ⚠️ Resten — favicon, alt-tekster, trykflader, sidelæns rulning,
   døde links — måles af tests/gennemgang.spec.js, som læser
   MAPPEN. Den nye side kom med i den, uden at nogen skrev den på
   en liste. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, springIntroOver } = require('./hjaelp');

test.describe('Historien om havnen', () => {

  test('den flydende bestil-pille findes IKKE på siden', async ({ page }) => {
    /* ⚠️ MÅLT PÅ ANTALLET, IKKE PÅ SYNLIGHEDEN. toBeHidden() er
       sandt for et element, der ikke findes — husets eget ar fra
       fyldvælgeren — men her er "findes ikke" netop reglen, og så
       er tællingen det rigtige svar. Til gengæld skal prøven
       bevise, at den ER der på forsiden, ellers måler den kun, at
       et klassenavn er stavet forkert. */
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    await expect(page.locator('.bestil')).toHaveCount(0);
    await expect(page.locator('#bestil-pill')).toHaveCount(0);

    await åbnSkal(page, '/index.html', { data: grunddata() });
    await expect(page.locator('#bestil-pill'),
      'pillen findes ikke på forsiden — så måler prøven ingenting')
      .toHaveCount(1);
  });

  test('stilen er en anden: grunden er mørk, ikke husets creme', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const forside = await page.locator('#sc').evaluate(
      (e) => getComputedStyle(e).backgroundColor);

    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const historie = await page.locator('#sc').evaluate(
      (e) => getComputedStyle(e).backgroundColor);

    /* To uafhængige tal: den ene sides grund mod den andens. Et
       spørgsmål til historiesiden om dens EGEN farve ville bestå,
       også hvis forsiden en dag blev sort. */
    expect(historie, 'historiesiden har samme grund som forsiden')
      .not.toBe(forside);
    const [r, g, b] = historie.match(/\d+/g).map(Number);
    expect(r + g + b, `grunden er ikke mørk: ${historie}`).toBeLessThan(120);
  });

  test('kildelinjen står der — historien er ikke vores påstand', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const kilde = page.locator('.h-kilde');
    await expect(kilde).toBeVisible();
    await expect(kilde).toContainText('lokalhistoriske');
    /* Ankerets ophav er overleveret. Siden må ikke sige det som en
       kendsgerning — hverken i kildelinjen eller i kapitlet. */
    await expect(kilde).toContainText('ikke dokumenteret');
    await expect(page.locator('.h-citat')).toContainText('Efter sigende');
  });

  test('forsidens mørke afsnit fører derhen', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await springIntroOver(page);

    const knap = page.locator('.about .hist-teaser-knap');
    await expect(knap).toHaveCount(1);
    expect(await knap.getAttribute('href')).toBe('historien.html');
    /* Teaseren lover ankeret — og siden skal holde det. */
    await expect(page.locator('.about .hist-teaser')).toContainText('1710');
  });

  /* ⚠️ BILLEDERNE ER EJERENS. Vi lægger ikke arkivfotos ind for
     ham: rettighederne er ikke vores at give videre. Uden et foto
     står en MØRK FLADE med pladsens tegn — aldrig en stiplet grå
     kasse (reglen fra 29/8), og aldrig et opdigtet motiv. */
  test('uden et foto står en flade med tegnet — ikke en grå kasse', async ({ page }) => {
    await åbnSkal(page, '/historien.html', { data: grunddata() });

    await expect(page.locator('image-slot'),
      'pladserne blev stående som <image-slot> — de tegner sig stiplet grå')
      .toHaveCount(0);
    const felt = page.locator('.h-foto .foto-felt').first();
    await expect(felt).toBeVisible();
    /* Ankeret er havnens eget ikon nu (5/9); emojiet er reserven. */
    await expect(felt.locator('svg.ik-anker')).toHaveCount(1);
  });

  test('et foto fra admin slår igennem', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.foto_historie_2 = 'data:image/gif;base64,'
      + 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
    await åbnSkal(page, '/historien.html', { data: d });

    const foto = page.locator('.h-foto img');
    await expect(foto).toHaveCount(1);
    /* Alt-teksten er FOTOETS, ikke pladsens — samme regel som
       resten af huset. */
    await expect(foto).toHaveAttribute('alt', 'Ankeret på Mosede Havn');
  });
});
