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

  /* Kundens ord (31/8): "gør så man kan trykke ingen dagens ret
     i dag … og ikke bare at der står 'dagens ret følger snart'."
     Trykket i admin gemmer dagens dato i dagens_ret_ingen — og så
     er "Følger snart…" ikke sandt længere: køkkenet HAR svaret. */
  test('har køkkenet trykket "ingen i dag", siger ugen det — ikke "følger snart"', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.dagens_ret_ingen = '2026-08-07';
    await åbn(page, d);

    const iDag = page.locator('#mk-uge [data-dag="2026-08-07"]');
    await expect(iDag).toContainText('Ingen dagens ret i dag');
    await expect(iDag).not.toContainText('Følger snart');
    // Og kun i dag: i morgen er der ikke svaret noget endnu.
    await expect(page.locator('#mk-uge [data-dag="2026-08-08"]'))
      .toContainText('Følger snart');
  });

  /* En SKREVET ret vinder over trykket — står der en ret på
     dagen, er den det nyeste, nogen har sagt. */
  test('en skreven ret vinder over "ingen i dag"-trykket', async ({ page }) => {
    const d = medRet();
    d.indstillinger.dagens_ret_ingen = '2026-08-07';
    await åbn(page, d);

    const iDag = page.locator('#mk-uge [data-dag="2026-08-07"]');
    await expect(iDag).toContainText('Stegt rødspætte');
    await expect(iDag).not.toContainText('Ingen dagens ret');
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

  test('hver kategori har sit eget tegn og sit antal', async ({ page }) => {
    /* Kunden bad om emojier og farver (24/8). Tegnet gættes ud
       fra navnet, og det FØRSTE mønster, der passer, vinder —
       derfor prøves de to, der ligger tættest på hinanden:
       "Vælg fyld til smørrebrødet" indeholder også ordet
       smørrebrød, og "Softice og vafler" indeholder også vafler. */
    const d = medRet();
    d.menu_kategorier.push({ id: 20, afdeling: 'drikke', navn: 'Kaffe og varme drikke', sortering: 20, aktiv: true });
    d.menu_varer.push({
      id: 20, kategori_id: 20, navn: 'Latte', beskrivelse: null, pris: 40,
      fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
    });
    await åbn(page, d);

    await expect(page.locator('[data-kategori="Smørrebrød"] .mk-tegn')).toHaveText('🍞');
    await expect(page.locator('[data-kategori="Vælg fyld til smørrebrødet"] .mk-tegn')).toHaveText('🥓');
    await expect(page.locator('[data-kategori="Softice og vafler"] .mk-tegn')).toHaveText('🍦');
    await expect(page.locator('[data-kategori="Kaffe og varme drikke"] .mk-tegn')).toHaveText('☕');

    // Farven kommer fra afdelingen, som ejeren sætter i admin
    await expect(page.locator('[data-kategori="Softice og vafler"] .mk-tegn')).toHaveClass(/mk-is/);
    await expect(page.locator('[data-kategori="Kaffe og varme drikke"] .mk-tegn')).toHaveClass(/mk-drikke/);

    // Antallet ude til højre gør en lang side overskuelig
    await expect(page.locator('[data-kategori="Vælg fyld til smørrebrødet"] .mk-antal'))
      .toHaveText('2 varer');
    await expect(page.locator('[data-kategori="Smørrebrød"] .mk-antal')).toHaveText('1 vare');
  });

  test('hop-båndet fører til kategorien', async ({ page }) => {
    await åbn(page);

    const chips = page.locator('#mk-hop button');
    await expect(chips).toHaveCount(4);
    await expect(chips.first()).toContainText('Smørrebrød');

    /* Båndet bygges af de kort, der FAKTISK står på siden. En
       chip, der peger på et kort, der blev sorteret fra, er en
       genvej til ingenting. */
    const d = medRet();
    d.menu_varer[0].udsolgt = true;
    await åbn(page, d);
    await expect(page.locator('#mk-hop button')).toHaveCount(3);
    await expect(page.locator('#mk-hop [data-hop="Smørrebrød"]')).toHaveCount(0);
  });

  test('båndet ligger aldrig oven på kortene', async ({ page }, info) => {
    /* MÅLT, og det var kundens fund (24/8): på en bred skærm
       bryder kategorikortene ud i fuld bredde, mens båndet lå i
       den smalle spalte — så klæbede det MIDT hen over kortene og
       dækkede priserne.

       Prøven måler kasserne mod hinanden i stedet for at kigge på
       en klasse: en regel kan sagtens være rigtig og alligevel
       tabe til en anden, og det ses kun på skærmen. */
    await åbn(page);

    const bånd = await page.locator('#mk-hop').boundingBox();
    const kort = await page.locator('#mk-kat').boundingBox();

    if (info.project.name === 'computer') {
      // Ude i siden: båndet slutter, før kortene begynder
      expect(bånd.x + bånd.width).toBeLessThanOrEqual(kort.x + 1);
    } else {
      // På telefonen er en klæbende stribe i toppen det rigtige —
      // der er ikke plads til andet. Så skal den ligge OVER
      // kortene, ikke inde i dem.
      expect(bånd.y + bånd.height).toBeLessThanOrEqual(kort.y + 1);
    }
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

test.describe('Kategoriens note', () => {
  /* "På toastbrød eller rugbrød" gælder alle tolv slags pindemad.
     Skrevet på hver linje ville den fylde tolv gange og sige det
     samme — derfor en kolonne på kategorien, som ejeren sætter i
     admin. */
  const FREDAG = '2026-08-07T11:00:00Z';

  test('noten står over varerne, når den er sat', async ({ page }) => {
    const { åbnSkal, grunddata } = require('./hjaelp');
    const d = grunddata();
    d.menu_kategorier[0].note = 'På toastbrød eller rugbrød';
    await åbnSkal(page, '/m-menukort.html', { ur: FREDAG, data: d });

    const kort = page.locator('[data-kategori="Smørrebrød"]');
    await expect(kort.locator('.mk-note')).toHaveText('På toastbrød eller rugbrød');
    // Og den står FØR varerne, ikke efter
    const noteY = (await kort.locator('.mk-note').boundingBox()).y;
    const vareY = (await kort.locator('.mk-linje').first().boundingBox()).y;
    expect(noteY).toBeLessThan(vareY);
  });

  test('uden en note er der ingen linje', async ({ page }) => {
    const { åbnSkal, grunddata } = require('./hjaelp');
    await åbnSkal(page, '/m-menukort.html', { ur: FREDAG, data: grunddata() });
    await expect(page.locator('.mk-note')).toHaveCount(0);
  });
});

/* ============================================================
   TRE VÆRN, DER FULGTE MED FRA menu.html  (30/8)
   ------------------------------------------------------------
   Den gamle menuside blev til en vejviser, da de to udgaver af
   hjemmesiden blev lagt sammen, og dens prøvefil er parkeret i
   tests-gamle/. Men tre af dens prøver målte noget, der stadig
   gælder — og som INGEN anden prøve dækkede. De ville være røget
   ud sammen med siden.

   ⚠️ Det er præcis sådan, dækning forsvinder uden at nogen
   opdager det: ikke ved at en prøve fejler, men ved at filen
   holder op med at blive kørt.
   ============================================================ */
test.describe('Værn, der fulgte med fra den gamle menuside', () => {

  /* ⚠️ ET VARENAVN ER TEKST, IKKE OPMÆRKNING. Ejeren skriver
     navnene i admin, og skriver nogen — ved et uheld eller ej —
     noget, der ligner HTML, skal det stå som bogstaver. Bygges
     listen med innerHTML en dag, kører det som kode i gæstens
     browser. */
  test('et varenavn med tegn fra HTML bliver vist som tekst', async ({ page }) => {
    const farligt = '<img src=x onerror="window.HACKET=1">Burger';
    const d = medRet();
    d.menu_varer = d.menu_varer.map((v) => (v.id === 1 ? { ...v, navn: farligt } : v));
    await åbn(page, d);

    await expect(page.locator('.mk-sortiment')).toContainText(farligt);
    expect(await page.evaluate(() => window.HACKET),
      'et varenavn blev kørt som kode').toBeUndefined();
    expect(await page.locator('.mk-sortiment img').count()).toBe(0);
  });

  /* En tom database må aldrig blive en hvid skærm. Gæsten står
     ved vandet og vil vide, om der er åbent — så skal siden stå
     der, og hun skal kunne ringe. */
  test('siden går ikke ned, hvis databasen svarer tomt', async ({ page }) => {
    await åbn(page, {
      lokationer: [], aabningstider: [], lukkedage: [], kalender: [],
      menu_kategorier: [], menu_varer: [], nyheder: [], indstillinger: {},
      dagens_retter: [],
    });

    /* ⚠️ SIDEN SKAL STÅ, OG GÆSTEN SKAL KUNNE RINGE. Det er de to
       ting, en tom database ikke må tage fra hende — hun står ved
       vandet og vil vide, om der er åbent. Beskeden bor i
       #mk-tom, som også bærer telefonnummeret. */
    await expect(page.locator('h1')).not.toHaveText('');
    await expect(page.locator('#mk-tom')).toBeVisible();
    await expect(page.locator('#mk-tom')).toContainText('28 87 13 43');
    await expect(page.locator('a[href^="tel:"]').first()).toHaveCount(1);
  });

  /* ⚠️ EN GAMMEL AFDELING MÅ IKKE TABE EN KATEGORI. Kategorierne
     har haft andre afdelingsnavne før ("grill"), og en kategori,
     der falder ud af kortet, fordi dens afdeling ikke findes
     længere, er varer, ingen kan bestille — og ingen fejl nogen
     steder. */
  test('en kategori med en gammel afdeling står stadig på kortet', async ({ page }) => {
    const d = medRet();
    d.menu_kategorier = d.menu_kategorier.map((k, i) =>
      (i === 0 ? { ...k, afdeling: 'grill' } : k));
    await åbn(page, d);

    await expect(page.locator('.mk-sortiment'))
      .toContainText(d.menu_kategorier[0].navn);
  });
});

/* ⚠️ SAMME ANSIGT SOM PÅ BESTILLINGSSIDEN  (1/9).
   Kortet og bestillingen er det SAMME sortiment set fra to
   skærme. Ser den samme burger forskellig ud de to steder, tror
   gæsten, det er to burgere — og det er nøjagtig den slags
   skred, huset har ar efter (to lister over det samme, der
   langsomt driver fra hinanden).

   Tegnet er MINDRE her: kortet har i forvejen kategoriens store
   flise øverst. Men det er det SAMME tegn, fra den ene liste. */
test.describe('Et ansigt pr. ret på kortet', () => {

  test('varelinjerne har det samme tegn som bestillingssiden',
    async ({ page }) => {
    await åbn(page);
    const linjer = page.locator('.mk-kat .mk-linje');
    const n = await linjer.count();
    expect(n, 'der er ingen varelinjer at måle på').toBeGreaterThan(0);

    for (let i = 0; i < n; i++) {
      const l = linjer.nth(i);
      await expect(l.locator('.mk-vare-tegn')).toHaveCount(1);
      /* Navnet må ikke bære tegnet: `data-vare` og h4 er begge
         varens navn, og de læses af søgning og prøver. */
      expect(await l.locator('h4').textContent())
        .toBe(await l.getAttribute('data-vare'));
    }

    /* ⚠️ OG DET ER DEN SAMME KILDE. Prøven spørger MosedeEmoji i
       SIDEN og sammenligner — et hårdkodet tegn her ville bestå,
       også hvis kortet fik sin egen liste tilbage. */
    const første = linjer.first();
    const navn = await første.getAttribute('data-vare');
    const forventet = await page.evaluate(
      (n) => window.MosedeEmoji.forVare({ navn: n }, null), navn);
    await expect(første.locator('.mk-vare-tegn')).toHaveText(forventet);
  });

  test('tegnet er skjult for en skærmlæser', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('.mk-kat .mk-vare-tegn').first())
      .toHaveAttribute('aria-hidden', 'true');
  });
});
