/* ============================================================
   STRIBEN ØVERST PÅ FORSIDEN

   Beskeder-fanen har haft feltet "Dagens besked" med et flueben,
   og det gemte pænt. MÅLT 28/8: teksten stod ikke ét sted på
   hjemmesiden. Personalet kunne skrive "vi holder ferie i uge
   34", slå den til, og ingen gæst ville nogensinde se den.

   Det værste ved den slags er ikke, at den ikke virker — det er,
   at personalet TROR den virker, og så står gæsten ved en lukket
   luge.

   Kundens ord (28/8): "en lille stripe øverst".
   ============================================================ */

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

const UR = '2026-08-07T11:00:00Z';

function med(besked) {
  const d = grunddata();
  d.indstillinger = { ...d.indstillinger, dagens_besked: besked };
  return d;
}

test.describe('Beskeden fra Beskeder-fanen når ud på siden', () => {

  test('slået til med tekst: striben står øverst', async ({ page }) => {
    await åbn(page, '/', { ur: UR,
      data: med({ vis: true, tekst: 'Vi holder ferie i uge 34.' }) });

    const s = page.locator('#topstribe');
    await expect(s).toBeVisible();
    await expect(s).toContainText('ferie i uge 34');
  });

  /* ⚠️ DEN VIGTIGSTE: STRIBEN SKAL STÅ FØR TOPBJÆLKEN.
     Heroen har margin-top: -116px og glider op UNDER bjælken. Lå
     striben imellem dem, ville heroen dække den — og beskeden
     ville være "på siden" uden at kunne ses. */
  test('… og den står FØR topbjælken, ikke under heroen', async ({ page }) => {
    await åbn(page, '/', { ur: UR,
      data: med({ vis: true, tekst: 'Vi holder ferie i uge 34.' }) });

    const foran = await page.evaluate(() => {
      const s = document.getElementById('topstribe');
      const tb = document.querySelector('.topbar');
      // 4 = DOCUMENT_POSITION_FOLLOWING: topbjælken kommer EFTER striben
      return !!(s && tb && (s.compareDocumentPosition(tb) & 4));
    });
    expect(foran, 'striben ligger ikke før topbjælken').toBe(true);

    // Og den er faktisk synlig på skærmen — ikke dækket af noget.
    const k = await page.locator('#topstribe').boundingBox();
    expect(k.height, 'striben har ingen højde').toBeGreaterThan(20);
    expect(k.y, 'striben er skubbet ned under noget').toBeLessThan(5);
  });

  test('slået fra: ingen stribe', async ({ page }) => {
    await åbn(page, '/', { ur: UR,
      data: med({ vis: false, tekst: 'Vi holder ferie i uge 34.' }) });
    await expect(page.locator('#topstribe')).toBeHidden();
  });

  /* ⚠️ ET HAK OVER ET TOMT FELT ER IKKE EN BESKED. En rød stribe
     uden tekst er en streg, ingen kan forklare — og den ville
     stå der, til nogen opdagede den. */
  test('slået til uden tekst: heller ingen stribe', async ({ page }) => {
    await åbn(page, '/', { ur: UR, data: med({ vis: true, tekst: '   ' }) });
    await expect(page.locator('#topstribe')).toBeHidden();
  });

  test('er der ingen besked i databasen, findes striben ikke', async ({ page }) => {
    await åbn(page, '/', { ur: UR, data: grunddata() });
    await expect(page.locator('#topstribe')).toBeHidden();
  });

  /* ⚠️ PERSONALETS FRIE TEKST MÅ IKKE KUNNE LAVE OM PÅ SIDEN.
     textContent og ikke innerHTML — samme regel som alle de andre
     felter, gæsten får at se. */
  test('teksten skrives som tekst, ikke som opmærkning', async ({ page }) => {
    await åbn(page, '/', { ur: UR,
      data: med({ vis: true, tekst: 'Ferie <b>hele</b> ugen' }) });

    const s = page.locator('#topstribe');
    await expect(s).toContainText('Ferie <b>hele</b> ugen');
    expect(await s.locator('b').count(), 'opmærkningen slap igennem').toBe(0);
  });

  /* Bjælkens 58 px luft foroven holder fri af telefonens
     statuslinje. Med en stribe ovenover blev de 58 px til et tomt
     hul mellem beskeden og logoet. */
  /* ⚠️ ÉN SIDEINDLÆSNING OG IKKE TO. Første udgave åbnede
     forsiden to gange i den samme prøve for at måle begge veje,
     og den anden åbning væltede med "Target page has been
     closed". Begge tilstande måles på den SAMME side ved at slå
     striben til og fra — og det er også dét, der sker i
     virkeligheden, når personalet trykker på hakket. */
  test('topbjælkens luft foroven viger for striben', async ({ page }) => {
    await åbn(page, '/', { ur: UR,
      data: med({ vis: true, tekst: 'Vi holder ferie i uge 34.' }) });

    const luft = () => page.locator('.topbar')
      .evaluate((e) => parseFloat(getComputedStyle(e).paddingTop));

    const medStribe = await luft();
    /* ⚠️ TO KALD OG IKKE ÉT. Læses den nye padding i det SAMME
       evaluate, som slår striben fra, svarer browseren med det
       gamle tal: søskendevælgeren er ikke regnet om endnu. Målt —
       begge veje gav 14 px, og prøven fældede noget, der virkede.
       Et kald mere er en ny opgave i browseren, og så er stilen
       regnet færdig. */
    await page.locator('#topstribe').evaluate((e) => { e.hidden = true; });
    await page.waitForTimeout(60);
    const udenStribe = await luft();

    expect(medStribe, 'luften over logoet blev ikke mindre')
      .toBeLessThan(udenStribe);
  });
});
