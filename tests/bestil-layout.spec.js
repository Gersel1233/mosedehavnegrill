/* LAYOUTET I BESTILLINGSLISTEN.

   Kunden sendte et skærmbillede fra sin egen iPhone (23/8):
   "fix det der grimme layout og linjerne går ud over hinanden".
   Tre ting på ét billede, og ingen af dem kunne ses ved at læse
   koden — kun ved at måle:

   1) Den valgte vares røde ramme blev KLIPPET på venstre og
      højre kant. .stk-linje har margin: 0 -14px, så en valgt
      linje kan række ud i afsnittets luft — men inde i en
      .vare-gruppe har kortet overflow: hidden. Tilbage stod to
      vandrette streger fra kant til kant, der lignede en fejl.

   2) Prisen havde 2 px til kortkanten og så klippet ud.

   3) Den klæbende kurv flød sammen med listen: samme sandfarve
      som afsnittet, ingen kant.

   Prøverne herunder måler afstande, ikke udseende. En regel om
   at "det skal se pænt ud" kan ikke fejle.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

function medPriser() {
  const d = grunddata();
  d.menu_kategorier = [
    { id: 1, afdeling: 'mad', navn: 'Smørrebrød', sortering: 6, aktiv: true },
  ];
  d.menu_varer = [
    { id: 1, kategori_id: 1, navn: 'Håndmad', beskrivelse: null, pris: 24,
      fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true },
    { id: 2, kategori_id: 1, navn: 'Rejemad med mayo og citron', beskrivelse: null,
      pris: 75, fremhaevet: false, udsolgt: false, sortering: 2, aktiv: true },
  ];
  d.indstillinger = { ...d.indstillinger, bestilling_varsel_timer: 0 };
  return d;
}

async function vaelgFoerste(page) {
  const lukket = page.locator('#bestil-stykker .fold-hoved[aria-expanded="false"]');
  if (await lukket.count()) await lukket.first().click();
  await page.locator('#bestil-stykker button[aria-label^="Én mere"]').first().click();
  await page.waitForTimeout(300);
}

test.describe('Bestillingslistens layout', () => {

  test('den valgte vares ramme bliver ikke klippet af kortet', async ({ page }) => {
    /* SELVE FEJLEN. Målt på en iPhone 15 stak linjen 13 px ud til
       HVER side af en .vare-gruppe med overflow: hidden. */
    await åbn(page, '/bestil/', { data: medPriser() });
    await vaelgFoerste(page);

    const m = await page.evaluate(() => {
      const v = document.querySelector('.stk-linje.valgt');
      const g = v.closest('.vare-gruppe');
      const vr = v.getBoundingClientRect(), gr = g.getBoundingClientRect();
      return {
        venstre: Math.round(gr.left - vr.left),
        hoejre: Math.round(vr.right - gr.right),
        rammeBredde: getComputedStyle(v).borderLeftWidth,
      };
    });
    // Rammen skal findes — ellers måler prøven ingenting
    expect(m.rammeBredde).not.toBe('0px');
    expect(m.venstre, `linjen stikker ${m.venstre} px ud til venstre`)
      .toBeLessThanOrEqual(0);
    expect(m.hoejre, `linjen stikker ${m.hoejre} px ud til højre`)
      .toBeLessThanOrEqual(0);
  });

  test('prisen har luft til kortets kant', async ({ page }) => {
    /* 2 px så klippet ud på en rigtig telefon. Ti er et gulv, ikke
       et mål — paddingen giver 12-16. */
    await åbn(page, '/bestil/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const luft = await page.evaluate(() => {
      const linje = document.querySelector('#bestil-stykker .stk-linje');
      const g = linje.closest('.vare-gruppe');
      const pris = linje.querySelector('.stk-pris');
      if (!pris) return null;
      return Math.round(g.getBoundingClientRect().right
        - pris.getBoundingClientRect().right);
    });
    expect(luft, `prisen står ${luft} px fra kortkanten`).toBeGreaterThanOrEqual(10);
  });

  test('kurven kan ses som et lag, ikke som en del af listen', async ({ page }) => {
    /* Den lå midt hen over en tæller i samme farve som afsnittet.
       Kanten er forskellen på "et lag ovenpå" og "noget der er
       gået i stykker". */
    await åbn(page, '/bestil/', { data: medPriser() });
    await vaelgFoerste(page);

    const m = await page.evaluate(() => {
      const k = document.getElementById('bestil-kurv');
      const c = getComputedStyle(k);
      return { synlig: !k.classList.contains('skjult'),
               kant: c.borderTopWidth, farve: c.borderTopColor };
    });
    expect(m.synlig).toBe(true);
    expect(m.kant, 'kurven har ingen kant og flyder sammen med listen')
      .not.toBe('0px');
    expect(m.farve).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('topbjælken kan ikke ses igennem, når den klæber', async ({ page }) => {
    /* Den stod på 96 %, og de fire procent var nok til, at teksten
       under kunne anes. En bjælke, man kan se igennem, ser ud som
       om siden er tegnet forkert. */
    await åbn(page, '/bestil/', { data: medPriser() });
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);

    const b = await page.evaluate(() => {
      const hd = document.getElementById('hd');
      return { klaeber: hd.classList.contains('stuck'),
               baggrund: getComputedStyle(hd).backgroundColor };
    });
    expect(b.klaeber, 'headeren klæbede ikke — prøven måler ingenting').toBe(true);
    // rgb(...) uden alfa = helt ugennemsigtig. rgba(..., .96) ville fejle.
    expect(b.baggrund, `headeren er ${b.baggrund}`).toMatch(/^rgb\(/);
  });
});
