/* Menukortet: en side, man LÆSER.

   Kortet kom med handoffet i sit eget v3-tema og med en kurv:
   plusknapper på hver vare, en kurvbjælke i bunden og en
   "Gå til bestilling", der førte til forsidens formular — hvor
   kurven IKKE fulgte med. Gæsten lagde tre ting i den og begyndte
   forfra.

   Kundens ord (24/8): man skal ikke kunne bestille derinde, og
   det skal se ud som resten af siden. Begge dele måles herunder.

   Indholdet kommer fra personalesiden: dagens ret, åbningstiden,
   kategorierne og priserne. Står der ikke noget i databasen,
   findes afsnittet ikke — en tom kasse ligner en fejl. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

// 2026-08-07 er en FREDAG, uret står 11:00Z = 13:00 dansk tid.
const FREDAG = '2026-08-07T11:00:00Z';

function medRet(ændringer) {
  const d = grunddata();
  d.indstillinger.dagens_ret = {
    navn: 'Stegt rødspætte',
    beskrivelse: 'Fanget i Køge Bugt.',
    pris: 118,
  };
  return Object.assign(d, ændringer || {});
}

async function åbn(page, d) {
  await åbnSkal(page, '/m-menukort.html', { ur: FREDAG, data: d || medRet() });
}

test.describe('Menukortet', () => {
  test('man kan ikke bestille herinde', async ({ page }) => {
    /* Den vigtigste prøve på siden. Kommer kurven igen, kommer
       også vejen, hvor gæsten mister sit valg undervejs. */
    await åbn(page);

    await expect(page.locator('.plus')).toHaveCount(0);
    await expect(page.locator('#cartbar')).toHaveCount(0);
    await expect(page.locator('#cart')).toHaveCount(0);
    await expect(page.locator('[data-step]')).toHaveCount(0);

    // Der skal være én vej hen til bestillingen i stedet
    await expect(page.locator('.mk-slut a[href="index.html#bestil"]')).toHaveCount(1);
  });

  test('I dag viser dagens ret og dagens åbningstid', async ({ page }) => {
    await åbn(page);

    const kort = page.locator('#mk-idag');
    await expect(kort.locator('h4')).toHaveText('Stegt rødspætte');
    await expect(kort.locator('.tag')).toHaveText('Dagens ret');
    await expect(kort.locator('.mk-pris')).toHaveText('118,-');
    // Ugeplanen i prøvedataene er 11–21
    await expect(kort.locator('.mk-naar')).toHaveText('7. august · 11–21');
  });

  test('uden en dagens ret findes kortet ikke', async ({ page }) => {
    await åbn(page, grunddata());
    await expect(page.locator('#mk-idag-afsnit')).toBeHidden();
  });

  test('ugelisten er syv dage med i dag først', async ({ page }) => {
    await åbn(page);

    const dage = page.locator('#mk-uge .mk-dag');
    await expect(dage).toHaveCount(7);
    await expect(dage.first()).toHaveClass(/mk-nu/);
    await expect(dage.first()).toContainText('Fredag · i dag');
    await expect(dage.first()).toContainText('Stegt rødspætte');

    /* Resten står som "Følger snart…" — og det er sandt: der er
       kun ét felt til dagens ret i admin. En opdigtet ret på
       torsdag ville være et løfte, køkkenet ikke har givet. */
    await expect(dage.nth(1)).toContainText('Følger snart');
  });

  test('en lukkedag i ugen siger lukket, ikke "følger snart"', async ({ page }) => {
    const d = medRet({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'lukkedag', dato: '2026-08-09',
        slut_dato: null, titel: 'Havnefest', beskrivelse: '', emoji: '',
        lukker_kl: null, offentlig: true,
      }],
    });
    await åbn(page, d);

    const søndag = page.locator('#mk-uge [data-dag="2026-08-09"]');
    await expect(søndag).toContainText('Lukket');
    await expect(søndag).not.toContainText('Følger snart');
  });

  test('sortimentet er ét kort pr. kategori fra admin', async ({ page }) => {
    await åbn(page);

    const kort = page.locator('#mk-kat .panel');
    await expect(kort).toHaveCount(4);
    await expect(page.locator('[data-kategori="Smørrebrød"] h3')).toHaveText('Smørrebrød');
    await expect(page.locator('[data-vare="Flæskestegssandwich"] .mk-pris')).toHaveText('89,-');
    await expect(page.locator('[data-vare="Flæskestegssandwich"] p'))
      .toHaveText('Sprød flæskesteg, rødkål og agurkesalat.');
  });

  test('en vare uden pris siger spørg — ikke 0', async ({ page }) => {
    // 79 af forretningens varer har ikke fået en pris endnu.
    await åbn(page);
    await expect(page.locator('[data-vare="Dyrlægens natmad"] .mk-pris')).toHaveText('spørg');
  });

  test('udsolgte varer står ikke på kortet', async ({ page }) => {
    /* Et kort, der tilbyder noget, køkkenet ikke har, er værre
       end et kort med én ret mindre. */
    const d = medRet();
    d.menu_varer[0].udsolgt = true;
    await åbn(page, d);

    await expect(page.locator('[data-vare="Softice med guf"]')).toHaveCount(1);
    await expect(page.locator('[data-vare="Flæskestegssandwich"]')).toHaveCount(0);
  });

  test('et tomt menukort siger hvorfor, i stedet for at være tomt', async ({ page }) => {
    const d = medRet();
    d.menu_kategorier = [];
    d.menu_varer = [];
    await åbn(page, d);

    await expect(page.locator('#mk-kat .panel')).toHaveCount(0);
    await expect(page.locator('#mk-tom')).toBeVisible();
    await expect(page.locator('#mk-tom')).toContainText('28 87 13 43');
  });
});

test.describe('Menukortet har havnens tema', () => {
  /* Prøverne måler den BEREGNEDE værdi og ikke, hvad der står i
     et stylesheet: en overskrift kan sagtens have den rigtige
     regel og den forkerte skrift, hvis noget andet vinder i
     kaskaden. */
  const CREME = 'rgb(253, 247, 239)';
  const RØD = 'rgb(214, 42, 58)';

  test('siden kører på havnegrillen.css som de andre', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('body')).toHaveClass(/hav/);
    await expect(page.locator('#sc')).toHaveCSS('background-color', CREME);
  });

  test('overskrifterne er Instrument Serif', async ({ page }) => {
    await åbn(page);
    for (const vælger of ['.phead h1', '#mk-kat .panel h3']) {
      const skrift = await page.locator(vælger).first()
        .evaluate((el) => getComputedStyle(el).fontFamily);
      expect(skrift, vælger).toContain('Instrument Serif');
      expect(skrift, vælger).not.toContain('Bebas');
    }
  });

  test('priserne er havnens røde', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('#mk-kat .mk-pris').first()).toHaveCSS('color', RØD);
  });

  test('mærket i toppen er det samme som på de andre sider', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('.topbar .crest')).toHaveCount(1);
  });

  test('det gamle v3-tema er helt væk fra siden', async ({ page }) => {
    /* mosede-m.css, menu.css og menu.js var menukortets eget
       tema og egen motor. Kommer et af dem med igen, er siden
       tilbage i to temaer på én gang. */
    await åbn(page);
    const ark = await page.$$eval('link[rel="stylesheet"]', (l) => l.map((e) => e.getAttribute('href')));
    const kode = await page.$$eval('script[src]', (l) => l.map((e) => e.getAttribute('src')));
    for (const gammel of ['mosede-m.css', 'menu.css', 'menukort-tema.css']) {
      expect(ark.join(' '), gammel).not.toContain(gammel);
    }
    for (const gammel of ['menu.js', 'menu-data.js']) {
      expect(kode.join(' '), gammel).not.toContain(gammel);
    }
  });
});
