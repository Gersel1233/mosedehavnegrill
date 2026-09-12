/* ET BILLEDE PR. VARE  (31/8)

   Kundens ord: *"du skal gøre, så hver en ting har billede, som
   de selv kan lægge ind i admin — og priser og udsolgt eller
   andet."* Han taler om siden ved bordet: gæsten sidder med en
   liste over 242 navne, hun ikke kender.

   Fire ting skal holde, og de er hver især blevet set fejle:

   1) EJEREN KAN LÆGGE ET OP i admin → Menukort, på rækken selv
   2) GÆSTEN SER DET, hvor hun bestiller
   3) INGEN PLADSHOLDER — en vare uden foto ser ud som før. En tom
      grå kasse er værre end ingen plads (reglen fra 29/8), og et
      stockfoto ville love en ret, forretningen ikke har vist os
   4) ⚠️ ET GEM AF NOGET ANDET MÅ IKKE TØMME BILLEDET. Det er
      `vis_fra`-arret fra 28/8: en kolonne, der sendes ubetinget,
      river en værdi væk, uden at nogen kan se hvorfor
*/

const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

/* ⚠️ NØGLEN SKAL VÆRE DER, OGSÅ NÅR DEN ER TOM. Admin viser kun
   billedfeltet, når DATABASEN har svaret med kolonnen (maaBillede,
   samme greb som maaAntal) — og en prøve uden nøglen ville måle en
   fane, hvor feltet med rette ikke findes. */
function medBilledkolonne(ekstra) {
  const d = grunddata();
  d.menu_varer = d.menu_varer.map((v) => Object.assign({ billede: null }, v));
  if (ekstra) ekstra(d);
  return d;
}

/* Et rigtigt lille billede, så uploaden har noget at komprimere.
   1×1 px rød PNG. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

test.describe('Ejeren lægger billedet op', () => {

  test('rækken har en billedflise, når kolonnen findes', async ({ page }) => {
    await åbnAdmin(page, { data: medBilledkolonne() });
    await visFane(page, 'p-menu');
    await expect(page.locator('.vare-raekke .vare-foto').first()).toBeVisible();
  });

  /* ⚠️ UDEN KOLONNEN FINDES FELTET IKKE. Ellers ville hvert gem
     fejle med PGRST204, til supabase/vare-billede.sql er kørt — og
     ejeren ville sidde med et menukort, der ikke kan gemmes, på
     grund af en fil, han ikke ved eksisterer. */
  test('uden kolonnen er der ingen flise', async ({ page }) => {
    const d = grunddata();
    d.menu_varer = d.menu_varer.map((v) => {
      const kopi = Object.assign({}, v);
      delete kopi.billede;
      return kopi;
    });
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-menu');
    await expect(page.locator('.vare-raekke .vare-foto')).toHaveCount(0);
  });

  test('et valgt billede gemmes med det samme', async ({ page }) => {
    await åbnAdmin(page, { data: medBilledkolonne() });
    await visFane(page, 'p-menu');

    const række = page.locator('.vare-raekke').first();
    await række.locator('input[type=file]').setInputFiles({
      name: 'ret.png', mimeType: 'image/png', buffer: PNG,
    });
    await expect(page.locator('#kvittering')).toContainText('lagt op');

    const gemt = await gemteData(page);
    expect(gemt.menu_varer[0].billede, 'billedet blev ikke gemt på varen').toBeTruthy();
  });

  /* ⚠️ SMÅT FORMAT (12/9). Kundens ord: "16:9 billeder i småt format,
     så det passer på telefon". Nyhedernes loft er 1600 px; et varefoto
     står under 100 px bredt ved bordet, og der kan være 242 af dem.
     Prøven læser LÆRREDET, billedet blev tegnet på — ikke et tal i
     koden — og kilden er bredere end loftet, ellers målte den ingenting. */
  test('et varefoto gemmes som 640 × 360 — ikke i nyhedernes størrelse', async ({ page }) => {
    await page.addInitScript(() => {
      window.__lærreder = [];
      const org = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (...a) {
        window.__lærreder.push([this.width, this.height]);
        return org.apply(this, a);
      };
    });
    await åbnAdmin(page, { data: medBilledkolonne() });
    await visFane(page, 'p-menu');
    const kilde = fs.readFileSync('billeder/tapas-1.jpg');   // 1087 px bred
    await page.locator('.vare-raekke').first().locator('input[type=file]').setInputFiles({
      name: 'ret.jpg', mimeType: 'image/jpeg', buffer: kilde,
    });
    await expect(page.locator('#kvittering')).toContainText('lagt op');
    const l = await page.evaluate(() => window.__lærreder);
    expect(l, 'intet billede blev komprimeret — prøven måler ingenting').toHaveLength(1);
    expect(l[0], 'varefotoet blev gemt i nyhedernes store format').toEqual([640, 360]);
  });

  /* ⚠️ DEN VIGTIGSTE I FILEN. Samme lov som vis_fra på nyhederne
     og nøglen på bordet: undefined betyder "lad det være". Var
     linjen ubetinget, ville et gem på PRISEN tømme fotoet — og
     ingen ville kunne se hvorfor. */
  /* ⚠️ OG PRØVEN MÅLTE FØRST INGENTING. Første udgave gemte via
     "Gem priserne" øverst — og den vej bygger rækken med
     Object.assign({}, v, {pris}), altså MED databasens eget
     billede. Falsifikationen (ud.billede sendt ubetinget) bestod
     derfor. Det er byg() på rækken, der er faren, og den fyres af
     rækkens egen Gem-knap og af autogem. Prøven går den vej nu. */
  test('et gem af NAVNET rører ikke billedet', async ({ page }) => {
    await åbnAdmin(page, {
      data: medBilledkolonne((d) => {
        d.menu_varer[0].billede =
          'https://abc.supabase.co/storage/v1/object/public/nyheder/ret.jpg';
      }),
    });
    await visFane(page, 'p-menu');

    const række = page.locator('.vare-raekke').first();
    /* Rækkens egen Gem ligger bag "⋯" — det er ikke dagligt
       arbejde. Det er samtidig en prøve på, at vejen findes. */
    await række.locator('.mere-knap').click();
    await række.locator('.vare-tekst-felt').fill('Nu med rødkål');
    await række.locator('.vare-bag .knap', { hasText: 'Gem' }).click();
    await expect(page.locator('#kvittering')).toBeVisible();

    const gemt = await gemteData(page);
    expect(gemt.menu_varer[0].beskrivelse).toBe('Nu med rødkål');
    expect(gemt.menu_varer[0].billede,
      'billedet forsvandt, fordi et gem af beskrivelsen tog det med')
      .toContain('/nyheder/ret.jpg');
  });
});

test.describe('Gæsten ser billedet, hvor hun bestiller', () => {

  const BORDE = [{
    id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
    placering: 'ude', aktiv: true, sortering: 10,
  }];

  function medFoto() {
    const d = grunddata({ borde: BORDE });
    d.menu_varer = d.menu_varer.map((v) => Object.assign({}, v));
    d.menu_varer[0].billede =
      'https://abc.supabase.co/storage/v1/object/public/nyheder/ret.jpg';
    return d;
  }

  test('ved bordet står fotoet på rækken', async ({ page }) => {
    await åbn(page, '/ved-bordet/?bord=7',
      { ur: '2026-08-06T11:00:00Z', data: medFoto() });
    const foto = page.locator('#bestil-stykker .stk-foto').first();
    await expect(foto).toHaveCount(1);
    /* Alt-teksten er varens NAVN, ikke "billede af mad": en
       skærmlæser skal kunne skelne to rækker fra hinanden. */
    expect(await foto.getAttribute('alt')).toBeTruthy();
    /* ⚠️ Det ene ord, hele farten hænger på. 242 rækker × ivrig
       hentning er 242 billeder på en telefon ved et bord. */
    expect(await foto.getAttribute('loading')).toBe('lazy');
  });

  /* ⚠️ 16:9 OG IKKE EN FIRKANT (12/9). Admin beskærer altid til 16:9;
     en firkantet flise skar en tredjedel væk igen. Kilden her er 4:3
     med vilje: var den selv 16:9, ville et felt uden forhold også se
     rigtigt ud, og prøven målte ingenting. */
  test('ved bordet er fotoet et lille 16:9-billede', async ({ page }) => {
    const d = medFoto();
    d.menu_varer[0].billede = '/billeder/tapas-1.jpg';
    await åbn(page, '/ved-bordet/?bord=7', { ur: '2026-08-06T11:00:00Z', data: d });
    const foto = page.locator('#bestil-stykker .stk-foto').first();
    await expect.poll(() => foto.evaluate((e) => e.naturalWidth), 'fotoet blev ikke hentet').toBeGreaterThan(0);
    const m = await foto.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { b: r.width, h: r.height, kilde: e.naturalWidth / e.naturalHeight };
    });
    expect(m.kilde, 'kilden er selv 16:9 — prøven måler ingenting').not.toBeCloseTo(16 / 9, 1);
    expect(m.b / m.h, `fotoet står ${m.b} × ${m.h}`).toBeCloseTo(16 / 9, 1);
    expect(m.b, 'fotoet er ikke småt').toBeLessThanOrEqual(100);
  });

  /* ⚠️ INGEN PLADSHOLDER. Reglen fra 29/8: en tom grå kasse er
     værre end ingen plads. Et kort uden fotos skal se ud præcis
     som i dag. */
  test('uden foto står rækken som før — ingen grå kasse', async ({ page }) => {
    await åbn(page, '/ved-bordet/?bord=7',
      { ur: '2026-08-06T11:00:00Z', data: grunddata({ borde: BORDE }) });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await expect(page.locator('#bestil-stykker .stk-foto')).toHaveCount(0);
  });
});
