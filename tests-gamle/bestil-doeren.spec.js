/* DØREN TIL BESTILLINGEN.

   Formularen lå på smoerrebroed-ud-af-huset/. Den kunne allerede
   tage imod grill og café — ejeren sætter selv fluebenene i admin —
   og både "spis her" og "tag med". En adresse, der siger smørrebrød,
   passede altså ikke længere til det, der stod på skærmen.

   DEN FLYTTEDE VIDERE 23/8, og det er kundens ord: "man skal kunne
   bestille direkte der uden at skulle ind på 1 side." Formularen
   står nu på FORSIDEN, og bestil/ er blevet smørrebrødets egen —
   "det er en af deres hoved ting og fortjener deres eget
   bestillings ting."

   Filen måler, at delingen hænger sammen: forsiden tager imod alt
   det andet, bestil/ tager imod smørrebrødet, den flydende pille
   findes kun dér, hvor formularen er, og smørrebrødssiden er
   blevet det, den er bedst til — en salgs- og søgeside, der fører
   derind.

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

  /* HEROEN HAR INGEN KNAPPER, OG DØREN ER PILLEN.

     Der stod to store i heroen — "Bestil mad" og "Book et bord" —
     med den samme regel som pillen: HTML'en sagde "Bestil mad"
     med bestillingssiden bagved, og et script skrev om til
     "Bestil dagens ret", når dagens-panelet fandtes.

     Kunden bad om at få dem væk (22/8): "knapperne behøver ikke
     være der på heroen." På hans telefon lå den flydende pille
     oven i den nederste af dem i højre hjørne — to knapper til
     den samme handling, hvor den ene dækkede den anden.

     REGLEN OM AT SKRIVE OM ER VÆK (23/8). Den fandtes, fordi
     døren nogle dage var et afsnit og andre dage en anden side —
     og et script skulle gætte hvilken. Formularen står på
     forsiden nu, hver dag, så pillen peger ét sted hen og gør det
     i HTML'en. Ingen omskrivning, ingen dør der peger på et
     afsnit, som ikke er der. */
  test('pillen peger på formularen, og den står i HTML’en', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [9];
    await åbn(page, '/index.html', { data: d });
    const pille = page.locator('.bestil-fast');
    await expect(pille).toContainText('Bestil mad');
    await expect(pille).toHaveAttribute('href', '#bestil');
  });

  test('pillen lander i formularen, med og uden dagens ret', async ({ page }) => {
    /* Begge dage måles: dagens ret lægger en ekstra fold øverst i
       listen, og en pille, der kun er prøvet den ene dag, er
       prøvet halvt. */
    for (const ret of [null, { navn: 'Stegt flæsk', beskrivelse: '', pris: 95 }]) {
      const d = grunddata();
      d.indstillinger = { ...d.indstillinger,
        bestilbare_kategorier: [9], bestilling_varsel_timer: 0, dagens_ret: ret };
      await åbn(page, '/index.html', { data: d });

      const pille = page.locator('.bestil-fast');
      await expect(pille).toHaveAttribute('href', '#bestil');
      await pille.click();
      await expect(page.locator('#bestil-form'),
        ret ? 'med dagens ret' : 'uden dagens ret').toBeInViewport();
    }
  });

  /* ER DER IKKE NOGET AT BESTILLE PÅ FORSIDEN, PEGER PILLEN
     DERHEN, HVOR DER ER. En rød knap, der ruller ned til
     ingenting, er værre end ingen knap.

     Tilstanden er sjælden nu: forsiden sælger også stykkerne, så
     den kræver et menukort helt uden priser. Den findes stadig —
     en halvt opsat database, eller alt sat udsolgt — og
     smørrebrødets ØNSKEfyld kan stadig bestilles på bestil/. */
  test('uden forsidens formular fører pillen til smørrebrødet', async ({ page }) => {
    const d = grunddata();
    // Stykket mister sin pris; fyldet har ingen i forvejen og kan
    // stadig ønskes på bestil/. Så er der intet på forsiden.
    d.menu_varer = d.menu_varer.map((v) => ({ ...v, pris: null }));
    await åbn(page, '/index.html', { data: d });

    const pille = page.locator('.bestil-fast');
    await expect(pille).toHaveAttribute('href', 'bestil/');
    await expect(pille).toBeVisible();
  });

  test('er der slet ingenting at bestille, er pillen væk', async ({ page }) => {
    /* Hverken forsidens udvalg eller smørrebrødet. Så er der ikke
       en dør at pege på, og en knap, der lover én, er en løgn. */
    const d = grunddata({ menu_varer: [], menu_kategorier: [] });
    await åbn(page, '/index.html', { data: d });
    await expect(page.locator('.bestil-fast')).toBeHidden();
  });

  /* Den STORE størrelse fandtes kun til heroens to knapper. Er de
     væk, må størrelsen ikke blive stående og dukke op et
     tilfældigt sted længere nede: så er den ikke længere "den
     store" — så er den bare en knap, der er større end de andre. */
  test('den store knapstørrelse bruges ikke længere', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('.glass.stor')).toHaveCount(0);
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

  /* DEN KLÆBENDE PILLE ER DER HELE TIDEN — KUNDENS TREDJE OG
     SIDSTE ORD (22/8): "den konsistente bestil-knap skal være
     der hele tiden på forsiden". At den først kom ved rulning,
     var en af tingene, han slog ned på. Historikken over alle
     tre kontraktskifter står i js/side.js — læs den, før nogen
     ændrer det her igen. */
  test('den klæbende pille er der i toppen OG i bunden af siden', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [9];
    await åbn(page, '/index.html', { data: d });
    const fast = page.locator('.bestil-fast');

    await expect(fast).toBeVisible();
    await expect(fast).not.toHaveClass(/dukket/);
    await expect(fast).toHaveAttribute('href', '#bestil');
    await expect(fast).toContainText('Bestil mad');

    // Til et AFSNIT og ikke til et pixeltal — afsnittene har
    // byttet plads en gang, og så pegede tallet et andet sted hen.
    await page.locator('#find').scrollIntoViewIfNeeded();
    await expect(fast).toBeVisible();
    await expect(fast).not.toHaveClass(/dukket/);
  });

  /* PILLEN ER KUN PÅ FORSIDEN — kundens ord (23/8): "når man er
     inde på andre sider end forsiden, så fjern bestil-knappen der
     altid er der; ellers skal den altid være der."

     Grunden er, at den ikke betyder det samme to steder. På
     forsiden er den en genvej NED til formularen, der står lige
     der. På bord/ eller catering/ ville den samme pille være et
     link VÆK fra den formular, gæsten står midt i — en rød knap,
     der afbryder det, hun er i gang med. */
  test('pillen findes ikke på de andre sider', async ({ page }) => {
    for (const sti of ['/menu.html', '/bestil/', '/smoerrebroed-ud-af-huset/',
      '/bord/', '/selskaber/', '/catering/', '/baglokale/', '/arrangementer/',
      '/nyheder/']) {
      await åbn(page, sti);
      await expect(page.locator('.bestil-fast'),
        `${sti} har stadig den klæbende pille`).toHaveCount(0);
    }
  });

  test('pillen bliver, mens man står i formularen', async ({ page }) => {
    /* Det er præcis spiis' opførsel: kurven forsvinder ikke, fordi
       man er nået ned til den. */
    const d = grunddata();
    d.indstillinger = { ...d.indstillinger,
      bestilling_varsel_timer: 0,
      dagens_ret: { navn: 'Stegt flæsk', beskrivelse: '', pris: 95 } };
    await åbn(page, '/index.html', { data: d });

    const fast = page.locator('.bestil-fast');
    await page.locator('#bestil-form').scrollIntoViewIfNeeded();
    await expect(page.locator('#bestil-form')).toBeInViewport();
    await expect(fast).toBeVisible();
  });

  test('skuffen kender både bestillingen og smørrebrødssiden', async ({ page }) => {
    await åbn(page, '/index.html');
    const skuffe = page.locator('.ark-liste');
    await expect(skuffe.locator('a[href="bestil/"]')).toHaveCount(1);
    await expect(skuffe.locator('a[href="smoerrebroed-ud-af-huset/"]')).toHaveCount(1);
  });
});

test.describe('Bestillingssiden er smørrebrødets egen', () => {

  test('den har formularen, og hovedet lover ikke for meget', async ({ page }) => {
    await åbn(page, '/bestil/');
    await page.waitForSelector('#bestil-stykker .stk-linje');

    await expect(page.locator('h1')).toHaveText('Smørrebrød ud af huset');
    await expect(page.locator('#bestil-form')).toBeVisible();

    /* Overskriften lover IKKE grill eller pølser. Siden er
       smørrebrødets nu — resten bestilles på forsiden — og en
       overskrift, der lover mere, end formularen kan tage imod,
       er en kunde, der møder skuffet op. */
    const hoved = (await page.locator('.mork-top').innerText()).toLowerCase();
    expect(hoved).not.toContain('grill');
    expect(hoved).not.toContain('pølse');
  });
});

test.describe('Forsidens bestilling', () => {

  /* Svaret på "hvad kan jeg få her" står ÉT sted: som folde i
     listen, med ejerens egne kategorinavne — som hos spiis (23/8).
     Afsnittets hoved skal ikke gentage det: dér lå der engang en
     række piller med det samme svar, målt på et skærmbillede. */
  test('hovedet gentager ikke kategorierne', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [9];
    await åbn(page, '/index.html', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const hoved = await page.locator('#bestil .mid').innerText();
    expect(hoved).not.toContain('Øl');
    // … og folden i listen siger det til gengæld
    await expect(page.locator('#bestil-stykker .fold-navn', { hasText: 'Øl' }))
      .toHaveCount(1);
  });

  /* FEJLEN, FLYTNINGEN KOSTEDE. Grupperne blev filtreret på den
     valgte slags, varerne blev ikke — og den første vare fra en
     anden slags væltede hele tegningen. Siden sagde så "Vi kan
     ikke tage imod lige nu", og der var ikke noget i vejen med
     hverken databasen eller åbningstiderne. */
  test('med flere slags kommer der ingen fejlboks', async ({ page }) => {
    const d = medPriser();
    d.indstillinger.bestilbare_kategorier = [9];
    d.indstillinger.bestilling_varsel_timer = 0;
    d.indstillinger.dagens_ret = { navn: 'Stegt flæsk', beskrivelse: '', pris: 95 };
    await åbn(page, '/index.html', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    await expect(page.locator('#bestil-lukket')).toBeHidden();
    await expect(page.locator('#bestil-form')).not.toHaveClass(/skjult/);
    await expect(page.locator('#bestil-stykker .stk-linje').first()).toBeVisible();
  });

  /* ET TOMT AFSNIT ER IKKE EN FEJL — MEN DET SÅ SÅDAN UD.

     Er der intet at bestille, stod der "Vi kan ikke hente udvalget
     lige nu. Ring til os", som om databasen var nede. Det er
     fejlens besked på en side, hvor alt er, som det skal være.

     Tilstanden kræver et menukort HELT uden priser nu. Det er med
     vilje: første udgave kunne rammes af en helt almindelig
     forretning, der kun havde åbnet for smørrebrødet — og så
     forsvandt netop det afsnit, gæsten primært skal bestille i.
     Se noten i js/store.js om uden-fyld. */
  test('uden noget at bestille forsvinder afsnittet', async ({ page }) => {
    const d = grunddata();
    d.menu_varer = d.menu_varer.map((v) => ({ ...v, pris: null }));
    await åbn(page, '/index.html', { data: d });
    await page.waitForSelector('#smoerrebroed:not(.skjult)');

    await expect(page.locator('#bestil')).toBeHidden();
    // …og den løgn står ikke nogen steder
    expect(await page.locator('main').textContent())
      .not.toContain('Vi kan ikke hente udvalget');
  });

  /* DEN ANDEN VEJ, OG DEN ER DEN VIGTIGE. Kunden fandt fejlen her:
     afsnittet forsvandt på en forretning, der kun havde åbnet for
     smørrebrødet. Prøven bruger derfor GRUNDDATA som de er — uden
     et eneste flueben i admin — og kræver, at der står noget. */
  test('kun smørrebrød er nok til at afsnittet står der', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.waitForSelector('#bestil-stykker .stk-linje');

    await expect(page.locator('#bestil')).toBeVisible();
    await expect(page.locator('#bestil-stykker .fold-navn').first())
      .toContainText('Smørrebrød');
  });

  test('med en åbnet kategori står afsnittet der også', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.bestilbare_kategorier = [9];
    await åbn(page, '/index.html', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    await expect(page.locator('#bestil')).toBeVisible();
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
