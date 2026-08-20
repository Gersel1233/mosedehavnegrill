/* DØREN TIL BESTILLINGEN.

   Formularen lå på smoerrebroed-ud-af-huset/. Den kunne allerede
   tage imod grill og café — ejeren sætter selv fluebenene i admin —
   og både "spis her" og "tag med". En adresse, der siger smørrebrød,
   passede altså ikke længere til det, der stod på skærmen.

   Filen måler, at flytningen hænger sammen: at der er ÉN dør, at
   den hedder det samme overalt, og at smørrebrødssiden er blevet
   det, den er bedst til — en salgs- og søgeside, der fører derind.

   Den måler også den fejl, flytningen kostede undervejs: da
   listen blev delt op i slags, blev GRUPPERNE filtreret, men ikke
   varerne. Resultatet var "Cannot read properties of undefined" og
   en side, der sagde "Vi kan ikke tage imod lige nu", mens alt
   andet så helt normalt ud. */

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

function medPriser() {
  const d = grunddata();
  d.menu_varer = d.menu_varer.map((v) => (
    v.kategori_id === 12 ? { ...v, pris: v.id === 4 ? 38 : 45 } : v
  ));
  return d;
}

test.describe('Der er én dør, og den hedder Bestil mad', () => {

  test('forsidens ene store knap fører til bestillingen', async ({ page }) => {
    await åbn(page, '/index.html');

    const stor = page.locator('.hero-cta .glass.stor');
    await expect(stor).toHaveCount(1);
    await expect(stor).toHaveText('Bestil mad');
    await expect(stor).toHaveAttribute('href', 'bestil/');

    /* Og den er den ENESTE store. Bruges størrelsen to steder, er
       den ikke længere den store — så er der bare to knapper. */
    await expect(page.locator('.glass.stor')).toHaveCount(1);
  });

  test('topmenuen siger Bestil mad på hver eneste side', async ({ page }) => {
    for (const sti of ['/index.html', '/menu.html', '/bestil/',
      '/smoerrebroed-ud-af-huset/', '/bord/', '/selskaber/',
      '/catering/', '/baglokale/', '/arrangementer/']) {
      await åbn(page, sti);
      await expect(page.locator('#hd nav a', { hasText: 'Bestil mad' }),
        `${sti} mangler Bestil mad i topmenuen`).toHaveCount(1);
      /* Og den gamle tekst må ikke stå tilbage ét sted: to navne
         til den samme dør er to døre for gæsten. */
      await expect(page.locator('#hd nav a', { hasText: 'Smørrebrød' }),
        `${sti} har stadig den gamle tekst i topmenuen`).toHaveCount(0);
    }
  });

  /* DEN KLÆBENDE KNAP OG HEROENS EGEN MÅ IKKE STÅ SAMMEN.
     Uden det her stod der to røde bestil-knapper i det FØRSTE
     skærmbillede på en telefon, og den klæbende lagde sig oven på
     "Se menukortet" og "Find vej". Målt på et skærmbillede. */
  test('den klæbende knap gemmer sig, mens heroens egen er fremme',
    async ({ page }) => {
      await åbn(page, '/index.html');
      const fast = page.locator('.bestil-fast');
      await expect(fast).toHaveAttribute('href', 'bestil/');
      await expect(fast).toHaveClass(/dukket/);

      // Til et AFSNIT og ikke til et pixeltal — afsnittene har
      // byttet plads en gang, og så pegede tallet et andet sted hen.
      await page.locator('#find').scrollIntoViewIfNeeded();
      await expect(fast).not.toHaveClass(/dukket/);
    });

  /* … og den gemmer sig ogsaa for bestil-afsnittets EGEN røde knap.
     Da kun heroen blev set, lå den klæbende oven på afsnittets knap
     — to røde knapper med den samme tekst i det samme
     skærmbillede. Målt på et skærmbillede. */
  test('den gemmer sig også for bestil-afsnittets egen knap', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#smoerrebroed a.knap').scrollIntoViewIfNeeded();
    await expect(page.locator('#smoerrebroed a.knap')).toBeInViewport();
    await expect(page.locator('.bestil-fast')).toHaveClass(/dukket/);
  });

  test('skuffen kender både bestillingen og smørrebrødssiden', async ({ page }) => {
    await åbn(page, '/index.html');
    const skuffe = page.locator('.ark-liste');
    await expect(skuffe.locator('a[href="bestil/"]')).toHaveCount(1);
    await expect(skuffe.locator('a[href="smoerrebroed-ud-af-huset/"]')).toHaveCount(1);
  });
});

test.describe('Bestillingssiden', () => {

  test('den har formularen, og hovedet lover ikke for meget', async ({ page }) => {
    await åbn(page, '/bestil/');
    await page.waitForSelector('#bestil-stykker .stk-linje');

    await expect(page.locator('h1')).toHaveText('Bestil mad');
    await expect(page.locator('#bestil-form')).toBeVisible();

    /* Overskriften nævner IKKE grill eller is. Hvad der kan
       bestilles, er ejerens beslutning og står i admin — en
       overskrift, der lover pølser, mens køkkenet kun tager imod
       smørrebrød, er en kunde, der møder skuffet op. */
    const hoved = (await page.locator('.mork-top').innerText()).toLowerCase();
    expect(hoved).not.toContain('grill');
    expect(hoved).not.toContain('pølse');
  });

  /* Svaret på "hvad kan jeg få her" står ÉT sted: i vælgeren over
     listen. Her stod en række piller i sidens hoved med det samme
     svar — de er væk igen, og det er målt på et skærmbillede: de
     lå 300 px over vælgeren og så ud som knapper uden at være det. */
  test('hovedet gentager ikke vælgeren', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [6];
    await åbn(page, '/bestil/', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const hoved = await page.locator('.mork-top').innerText();
    expect(hoved).not.toContain('Softice og vafler');
    // … og vælgeren siger det til gengæld
    await expect(page.locator('#bestil-slags')).toContainText('Softice og vafler');
  });

  /* FEJLEN, FLYTNINGEN KOSTEDE. Grupperne blev filtreret på den
     valgte slags, varerne blev ikke — og den første vare fra en
     anden slags væltede hele tegningen. Siden sagde så "Vi kan
     ikke tage imod lige nu", og der var ikke noget i vejen med
     hverken databasen eller åbningstiderne. */
  test('med flere slags kommer der ingen fejlboks', async ({ page }) => {
    const d = medPriser();
    d.indstillinger.bestilbare_kategorier = [6];
    await åbn(page, '/bestil/', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    await expect(page.locator('#bestil-lukket')).toBeHidden();
    await expect(page.locator('#bestil-form')).not.toHaveClass(/skjult/);
    await expect(page.locator('#bestil-stykker .stk-linje').first()).toBeVisible();
  });
});

test.describe('Smørrebrødssiden er blevet en salgsside', () => {

  test('den har ingen formular mere', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/');
    await expect(page.locator('#bestil-form')).toHaveCount(0);
    await expect(page.locator('#bestil-stykker')).toHaveCount(0);
  });

  test('den viser stykkerne med pris og fyldet som piller', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/');
    await page.waitForSelector('#smoer-stykker-liste .smoer-raekke');

    const raekker = page.locator('#smoer-stykker-liste .smoer-raekke');
    await expect(raekker.first()).toContainText('Flæskestegssandwich');
    /* Prisformatet er menukortets, ikke datalagets: "89,-" og ikke
       "89 kr." Står de to formater på hver sin side af samme
       forretning, ser det ud som to forskellige priser. */
    await expect(raekker.first()).toContainText(',-');

    await expect(page.locator('#smoer-fyld-liste .chip').first()).toBeVisible();
    // Antallet TÆLLES og skrives ikke
    await expect(page.locator('#smoer-fyld-under')).toContainText('slags at vælge');
  });

  test('udsolgt vises, ikke skjules', async ({ page }) => {
    const d = grunddata();
    d.menu_varer = d.menu_varer.map((v) => (
      v.kategori_id === 1 ? { ...v, udsolgt: true } : v
    ));
    await åbn(page, '/smoerrebroed-ud-af-huset/', { data: d });
    await page.waitForSelector('#smoer-stykker-liste .smoer-raekke');
    await expect(page.locator('#smoer-stykker-liste .maerke.udsolgt').first())
      .toBeVisible();
  });

  test('den fører videre til bestillingen — og ikke kun i bunden', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/');
    const knapper = page.locator('main a[href="../bestil/"]');
    /* Mindst to: én i hovedet, som den, der allerede er overbevist,
       møder med det samme, og én længere nede til den, der først
       ville se priserne. Én knap nederst er en knap, man skal rulle
       gennem 29 slags fyld for at finde. */
    expect(await knapper.count()).toBeGreaterThanOrEqual(2);
    await expect(knapper.first()).toBeVisible();
  });

  test('den henter ikke formularens kode', async ({ page }) => {
    const hentet = [];
    page.on('request', (r) => hentet.push(r.url()));
    await åbn(page, '/smoerrebroed-ud-af-huset/');
    await page.waitForSelector('#smoer-stykker-liste .smoer-raekke');
    /* 26 kB kode til en formular, der ikke findes på siden, er
       26 kB over en mobilforbindelse for ingenting. */
    expect(hentet.filter((u) => u.includes('bestilling.js'))).toHaveLength(0);
  });
});
