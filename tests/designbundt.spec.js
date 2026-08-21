/* DET DESIGNBUNDTET BRAGTE MED — OG DET DER IKKE MÅTTE FØLGE MED

   Kunden sendte 21. august et mobil-først designbundt (Mosede
   Mobil v3) med otte sider. Formerne er gode, og de er bygget:
   bannere under heroen, en genvejsstribe, nyhedskort,
   rækkekortene og menukortets tre afdelinger.

   MEN BUNDTET VAR FULDT AF PÅSTANDE, DER IKKE ER SANDE:

     "4,8 · 312 anmeldelser på Google"
     "Bedste fiskefilet på hele Sydkysten"
     baglokalet: 40 personer, egen indgang, projektor, 1.200,-
     Mosede Havnevej 15  (vores adresse er Havnevej 20I eller 20)
     telefon 43 90 15 00 (vores er 28 87 13 43)
     hej@mosedehavnegrill.dk (vi har ingen kendt e-mail)
     frokost 145,-, levering 150,-, torskegilde 245,-

   Ingen af dem er bekræftet af forretningen, og flere modsiger
   det, vi HAR fået. Kunden har sagt det direkte: brug aldrig
   opdigtede anmeldelser, og opfind ikke svaret.

   Halvdelen af filen her måler formerne. Den anden halvdel måler,
   at påstandene ikke sneg sig med.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata, NØGLE,
  lokalTilstand, sætUr, sætDataEngang, springIntroOver } = require('./hjaelp');

/* Data med et offentligt arrangement, tre nyheder og en besked.
   Bygget som en funktion, så hver test får sin egen kopi — deler
   de ét objekt, kan den ene test rette i den andens data. */
function medAlt(ekstra = {}) {
  return grunddata({
    kalender: [
      {
        id: 1, type: 'arrangement', dato: '2026-08-29', slut_dato: null,
        titel: 'Live musik på molen', beskrivelse: 'Der spilles fra 19.',
        emoji: null, offentlig: true,
      },
    ],
    nyheder: [
      { id: 1, titel: 'Længere åbent', tekst: 'Vi holder åbent til 21.', dato: '2026-08-14', aktiv: true },
      { id: 2, titel: 'Nye kager', tekst: 'Citronmåne og drømmekage.', dato: '2026-08-09', aktiv: true },
      { id: 3, titel: 'Ny sodavand', tekst: 'Der er kommet flere slags.', dato: '2026-08-02', aktiv: true },
    ],
    ...ekstra,
  });
}

/* ============================================================
   BANNERNE
   ============================================================ */
test.describe('Bannerne under heroen', () => {

  test('det næste offentlige arrangement bliver til et banner', async ({ page }) => {
    await åbn(page, '/index.html', { data: medAlt() });
    await expect(page.locator('.bn.musik h3')).toContainText('Live musik på molen');
    await expect(page.locator('.bn.musik h3')).toContainText('29. august');
    /* "Få en plads →" til bordsiden, som i filerne. Gæsten skal
       ikke læse om arrangementet, hun skal sikre sig en plads —
       kalenderen er et opslagsværk, bordet er en handling. */
    await expect(page.locator('.bn.musik .bn-cta')).toHaveText('Få en plads →');
    await expect(page.locator('.bn.musik .bn-cta')).toHaveAttribute('href', 'bord/');
  });

  /* Et internt arrangement er personalets egen note i kalenderen.
     Ryger den ud som banner, står forretningens interne planer på
     forsiden. Adgangsreglen i databasen holder det tilbage mod
     skyen (supabase/proev-kalender.sql), men i øvetilstand er der
     ingen regel — så filteret i js/side.js skal også være der. */
  test('et internt arrangement bliver ikke til et banner', async ({ page }) => {
    const d = medAlt();
    d.kalender[0].offentlig = false;
    await åbn(page, '/index.html', { data: d });
    await expect(page.locator('.bn.musik')).toHaveCount(0);
  });

  /* Kalenderen er ÉN tabel med tre typer. En lukkedag er også en
     kalenderrække, og den skal ikke stå under heroen som noget,
     man kan glæde sig til. */
  test('en lukkedag bliver ikke til et banner', async ({ page }) => {
    const d = medAlt();
    d.kalender = [{
      id: 9, type: 'lukkedag', dato: '2026-08-29', slut_dato: null,
      titel: 'Personalefest', beskrivelse: null, emoji: null, offentlig: true,
    }];
    await åbn(page, '/index.html', { data: d });
    await expect(page.locator('.bn.musik')).toHaveCount(0);
  });

  /* Et overstået arrangement er ikke en nyhed. Uret står på
     7. august 2026, så den 1. august er forbi. */
  test('et overstået arrangement bliver ikke til et banner', async ({ page }) => {
    const d = medAlt();
    d.kalender[0].dato = '2026-08-01';
    await åbn(page, '/index.html', { data: d });
    await expect(page.locator('.bn.musik')).toHaveCount(0);
  });

  test('dagens besked bliver til sit eget banner', async ({ page }) => {
    const d = medAlt();
    d.indstillinger = { ...d.indstillinger, dagens_besked: { vis: true, tekst: 'Vi tager ikke kort i dag.' } };
    await åbn(page, '/index.html', { data: d });
    await expect(page.locator('.bn.besked p')).toHaveText('Vi tager ikke kort i dag.');
  });

  /* HUKOMMELSEN ER HELE POINTEN.

     En besked, man ikke kan komme af med, holder op med at være
     en besked og bliver til en ting, der er i vejen. Lukker
     gæsten den, skal den blive lukket — også efter et
     genindlæsning. */
  test('et lukket banner kommer ikke igen', async ({ page }) => {
    const d = medAlt();
    d.indstillinger = { ...d.indstillinger, dagens_besked: { vis: true, tekst: 'Vi tager ikke kort i dag.' } };
    await åbn(page, '/index.html', { data: d });

    await expect(page.locator('.bn.besked')).toHaveCount(1);
    await page.locator('.bn.besked .bn-luk').click();
    await expect(page.locator('.bn.besked')).toHaveCount(0);

    // Samme browser, ny sidevisning — dataene ligger allerede i localStorage
    await page.reload();
    await expect(page.locator('.bn.besked')).toHaveCount(0);
    // Musikbanneret er ikke lukket og skal stadig være der
    await expect(page.locator('.bn.musik')).toHaveCount(1);
  });

  /* OG DEN MODSATTE FEJL, SOM ER VÆRRE.

     Havde vi gemt "beskedbanneret er lukket" i stedet for at gemme
     SELVE TEKSTEN, ville personalet aldrig kunne råbe gæsten op
     igen: hun lukkede beskeden om kortterminalen i maj, og så så
     hun aldrig beskeden om ændrede åbningstider i juli. */
  test('en ny besked kommer igennem, selv om den gamle blev lukket', async ({ page }) => {
    const d = medAlt();
    d.indstillinger = { ...d.indstillinger, dagens_besked: { vis: true, tekst: 'Vi tager ikke kort i dag.' } };

    /* sætDataEngang og ikke åbn(): åbn() lægger dataene ind ved
       HVER sidevisning, og så ville personalets nye besked blive
       vasket væk af genindlæsningen — testen ville måle sin egen
       hjælpefunktion i stedet for siden. */
    await lokalTilstand(page);
    await sætUr(page, '2026-08-07T11:00:00Z');
    await sætDataEngang(page, d);
    await page.goto('/index.html');
    await springIntroOver(page);

    await page.locator('.bn.besked .bn-luk').click();

    // Personalet skriver en ny besked i admin
    await page.evaluate(([n, tekst]) => {
      const g = JSON.parse(localStorage.getItem(n));
      g.indstillinger.dagens_besked = { vis: true, tekst };
      localStorage.setItem(n, JSON.stringify(g));
    }, [NØGLE, 'Vi lukker kl. 16 på torsdag.']);

    await page.reload();
    await springIntroOver(page);
    await expect(page.locator('.bn.besked p')).toHaveText('Vi lukker kl. 16 på torsdag.');
  });

  /* FACEBOOK-BANNERET STÅR DER, OGSÅ FØR ADRESSEN ER SKREVET IND.

     Det var betinget af, at feltet i js/oplysninger.js var udfyldt
     — og da det står tomt, betød det i praksis, at banneret aldrig
     kom. Kunden holdt siden op mod filerne: banneret er en af de
     to ting, gæsten møder under heroen, og det skal være der.

     MEN LINKET ER IKKE OPFUNDET. Uden en adresse peger knappen på
     en SØGNING efter forretningen — et link, der virker, og som
     finder siden hvis den findes. Det er noget andet end at
     påstå en adresse, vi ikke har. */
  test('Facebook-banneret står der, og linket er ikke opfundet', async ({ page }) => {
    await åbn(page, '/index.html', { data: medAlt() });

    const fb = page.locator('.bn.fb');
    await expect(fb).toHaveCount(1);
    await expect(fb.locator('.bn-cta')).toHaveText('Følg os →');

    const href = await fb.locator('.bn-cta').getAttribute('href');
    expect(href, 'uden adresse skal knappen søge, ikke gætte en profil')
      .toContain('facebook.com/search');
    expect(href).toContain('Mosede');
    /* Og den må ALDRIG finde på en profiladresse. */
    expect(href).not.toMatch(/facebook\.com\/[a-z0-9.]+$/i);
  });

  /* OG DET SKAL KOMME AF SIG SELV, NÅR ADRESSEN ER DER.

     Et banner der er kommenteret ud, bliver aldrig sat ind igen —
     det er kode, ingen finder tilbage til. Derfor er det bundet
     til feltet i js/oplysninger.js: skriver ejeren adressen ind,
     dukker banneret op uden at nogen skal huske noget.

     Testen fanger tildelingen af window.MOSEDE og lægger en
     adresse i, i det øjeblik oplysninger.js sætter objektet. Det
     er præcis det, en udfyldt fil ville gøre. */
  test('men det kommer, når adressen er skrevet ind', async ({ page }) => {
    await page.addInitScript(() => {
      let gemt;
      Object.defineProperty(window, 'MOSEDE', {
        configurable: true,
        get() { return gemt; },
        set(v) {
          gemt = v;
          if (v && v.social) v.social.facebook = 'https://facebook.com/eksempel';
        },
      });
    });
    await åbn(page, '/index.html', { data: medAlt() });

    const fb = page.locator('#bannere .bn').filter({ hasText: 'Facebook' });
    await expect(fb).toHaveCount(1);
    await expect(fb.locator('.bn-cta'))
      .toHaveAttribute('href', 'https://facebook.com/eksempel');
  });
});

/* ============================================================
   NYHEDERNE
   ============================================================ */
test.describe('Nyhederne', () => {

  /* En overskrift der siger "Sidste nyt" over ingenting,
     fortæller gæsten at der aldrig sker noget her. */
  test('afsnittet findes ikke, når der ingen nyheder er', async ({ page }) => {
    await åbn(page, '/index.html', { data: grunddata({ nyheder: [] }) });
    await expect(page.locator('#nyheder')).toBeHidden();
  });

  test('de tre nyeste står på forsiden, nyeste først', async ({ page }) => {
    const d = medAlt();
    d.nyheder.push({ id: 4, titel: 'Gammel nyhed', tekst: 'Fra i fjor.', dato: '2025-06-01', aktiv: true });
    await åbn(page, '/index.html', { data: d });

    await expect(page.locator('#nyhedsnet .nw')).toHaveCount(3);
    const titler = await page.locator('#nyhedsnet .nw h3').allInnerTexts();
    /* Bebas Neue TEGNER versaler — der er ingen text-transform,
       så teksten er som personalet skrev den. */
    expect(titler).toEqual(['Længere åbent', 'Nye kager', 'Ny sodavand']);
    await expect(page.locator('#nyhedsnet')).not.toContainText('Gammel nyhed');
  });

  /* Fluebenet "aktiv" i admin er personalets måde at tage en
     nyhed ned uden at slette den. Virker det ikke, står den der
     stadig — og så er knappen en løgn. */
  test('en slukket nyhed vises ikke', async ({ page }) => {
    const d = medAlt();
    d.nyheder[0].aktiv = false;
    await åbn(page, '/index.html', { data: d });
    await expect(page.locator('#nyhedsnet')).not.toContainText('Længere åbent');
    await expect(page.locator('#nyhedsnet .nw')).toHaveCount(2);
  });

  test('datoen står på kortet', async ({ page }) => {
    await åbn(page, '/index.html', { data: medAlt() });
    await expect(page.locator('#nyhedsnet .nw').first().locator('.nw-naar'))
      .toContainText('14. august');
  });
});

/* ============================================================
   AFDELINGSKORTENE
   ============================================================ */
test.describe('Menukortets tre afdelinger', () => {

  /* TALLENE TÆLLES. Der står ikke et rundt tal, nogen har skrevet
     i hånden — designbundtet skrev "7 kategorier · 78 varer", og
     ingen ved hvor de tal kom fra. Skriver personalet en vare ind,
     skal tallet gå op af sig selv. */
  test('kortene tæller kategorier og varer på det rigtige kort', async ({ page }) => {
    await åbn(page, '/index.html', { data: grunddata() });

    const mad = page.locator('#afd-net a[href="menu.html?afd=mad"]');
    await expect(mad.locator('h3')).toHaveText('Mad');

    /* grunddata har to mad-kategorier: Smørrebrød og "Vælg fyld
       til smørrebrødet". Tallet skal følge dem — ikke stå fast. */
    const før = await mad.locator('.afd-tal').innerText();

    const d = grunddata();
    d.menu_varer.push({
      id: 900, kategori_id: 1, navn: 'Ekstra stykke', beskrivelse: null,
      pris: 55, fremhaevet: false, udsolgt: false, sortering: 99, aktiv: true,
    });
    await åbn(page, '/index.html', { data: d });
    const efter = await page.locator('#afd-net a[href="menu.html?afd=mad"] .afd-tal').innerText();

    expect(efter).not.toEqual(før);
    expect(efter).toMatch(/varer/);
  });

  /* En kategori uden varer er ikke en afdeling af menukortet. Det
     er en overskrift, nogen har oprettet og ikke fyldt endnu, og
     den skal ikke gøre kortet større end det er. */
  test('en tom kategori tælles ikke med', async ({ page }) => {
    const d = grunddata();
    const før = d.menu_kategorier.length;
    d.menu_kategorier.push({ id: 77, afdeling: 'drikke', navn: 'Tom kategori', sortering: 99, aktiv: true });
    expect(d.menu_kategorier.length).toBe(før + 1);

    await åbn(page, '/index.html', { data: d });
    const drikke = page.locator('#afd-net a[href="menu.html?afd=drikke"]');
    await expect(drikke.locator('.afd-tal')).toContainText('1 kategori');
    // "1 kategori", ikke "1 kategorier" — entalsformen er sin egen fejl
    await expect(drikke.locator('.afd-tal')).not.toContainText('1 kategorier');
    await expect(drikke).not.toContainText('Tom kategori');
  });

  test('afsnittet findes ikke, når menukortet er tomt', async ({ page }) => {
    await åbn(page, '/index.html', { data: grunddata({ menu_kategorier: [], menu_varer: [] }) });
    await expect(page.locator('#menu')).toBeHidden();
  });

  test('kortet fører til sin egen afdeling på menukortet', async ({ page }) => {
    await åbn(page, '/index.html', { data: grunddata() });
    await page.locator('#afd-net a[href="menu.html?afd=is"]').click();
    await expect(page).toHaveURL(/afd=is/);
  });
});

/* ============================================================
   HERO-PARALLAKSEN
   ============================================================ */
test.describe('Hero-parallaksen', () => {

  test('baggrunden flytter sig langsommere end siden', async ({ page }) => {
    await åbn(page, '/index.html');

    const før = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.hero .bg')).transform);

    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(120);

    const efter = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.hero .bg')).transform);

    expect(efter).not.toEqual(før);

    /* Og den flytter sig MINDRE end siden — ellers er det ikke
       parallakse, så er det bare et billede der følger med. 400 ×
       0,16 er 64. */
    const flyt = Number((efter.match(/,\s*([-\d.]+)\)$/) || [])[1]);
    expect(flyt).toBeGreaterThan(0);
    expect(flyt).toBeLessThan(400);
  });

  /* KUN transform. top, margin eller background-position gør det
     samme visuelt og tvinger browseren til at regne hele sidens
     layout om ved hvert billede. Det er forskellen på 120 billeder
     i sekundet og 30. */
  test('der flyttes kun med transform', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(120);

    const stil = await page.evaluate(() => {
      const s = document.querySelector('.hero .bg').style;
      return { top: s.top, margin: s.marginTop, bp: s.backgroundPosition, tr: s.transform };
    });
    expect(stil.tr).toContain('translate3d');
    expect(stil.top).toBe('');
    expect(stil.margin).toBe('');
    expect(stil.bp).toBe('');
  });

  test('reduceret bevægelse: baggrunden står stille', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await åbn(page, '/index.html');
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(120);
    expect(await page.evaluate(() =>
      document.querySelector('.hero .bg').style.transform)).toBe('');
  });
});

/* ============================================================
   SKUFFEN ER ET BUNDARK
   ============================================================ */
test.describe('Bundarket', () => {

  test.skip(({ isMobile }) => !isMobile, 'arket er telefonens menu');

  /* Hele pointen med et ark frem for en skuffe: siden bagved er
     der stadig. Det er forskellen på "jeg åbnede en menu" og "jeg
     er landet et andet sted". Dækker det hele skærmen, er det
     ikke et ark. */
  test('arket dækker ikke hele skærmen', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#burger').click();
    await expect(page.locator('#ark')).toBeVisible();
    await page.waitForTimeout(500);

    const kasse = await page.locator('#ark').boundingBox();
    const skaerm = page.viewportSize();

    // Det ligger i BUNDEN
    expect(Math.round(kasse.y + kasse.height)).toBeCloseTo(skaerm.height, -1);
    // ...og der er side tilbage over det
    expect(kasse.y, 'arket dækker hele skærmen').toBeGreaterThan(20);
  });

  /* Man rammer ved siden af, og tingen lukker. Det er den gestus,
     alle kender fra telefonens egne ark, og den betyder at krydset
     ikke behøver rammes med tommelfingeren strakt op i toppen. */
  test('et klik ved siden af lukker arket', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#burger').click();
    await expect(page.locator('#ark')).toBeVisible();
    await page.waitForTimeout(500);

    const kasse = await page.locator('#ark').boundingBox();
    await page.mouse.click(page.viewportSize().width / 2, kasse.y / 2);
    await expect(page.locator('#ark')).toBeHidden();
  });

  /* HER STOD TO TESTS, DER IKKE KUNNE FEJLE. Begge er væk, og
     det er værd at skrive ned hvorfor — de så begge fornuftige
     ud.

     Den første målte, at et ANDET tryk på burgeren ikke lukkede
     arket. Den bestod uanset hvad, fordi dæmperen (z-index 24)
     ligger over topbjælken (20): burgeren kan slet ikke trykkes,
     mens arket er åbent. Undtagelsen i js/faelles.js, den skulle
     dække, er fjernet med den.

     Den anden målte, at arket ikke lukkede sig selv på burgerens
     ÅBNENDE klik. Den bestod også uden vagten i koden — for
     lukArk sætter kun hidden efter 450 ms og tjekker klassen igen
     dér, og på det tidspunkt har aabnArk's requestAnimationFrame
     for længst sat den. To lag, der beskytter mod det samme.

     At arket kan åbnes, måles i tests/telefon.spec.js. */

  /* Dæmperen ligger på body, ikke på arket. Lå den på .ark::before,
     malede den sig oven på arkets egen sandfarve — .ark har sin
     egen stakkontekst, og elementets baggrund males før børn med
     negativ z-index. Arket blev gråt. */
  test('arket beholder sin sandfarve, når dæmperen er tændt', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#burger').click();
    await page.waitForTimeout(500);

    const farve = await page.evaluate(() =>
      getComputedStyle(document.getElementById('ark')).backgroundColor);
    // --sand er #f7f0e4 = rgb(247, 240, 228)
    expect(farve).toBe('rgb(247, 240, 228)');

    // ...og der ER en dæmper tændt
    expect(await page.evaluate(() =>
      document.body.classList.contains('ark-aaben'))).toBe(true);
  });
});

/* ============================================================
   DET DER IKKE MÅTTE FØLGE MED
   ============================================================ */
test.describe('Designbundtets påstande er ikke sluppet ud', () => {

  const SIDER = [
    '/index.html', '/bestil/', '/smoerrebroed-ud-af-huset/', '/bord/',
    '/selskaber/', '/catering/', '/baglokale/', '/arrangementer/', '/menu.html',
  ];

  /* Tal og påstande, der stod i bundtet og ikke er bekræftet af
     forretningen. Hver enkelt kan koste en skuffet kunde i
     telefonen — eller, ved anmeldelserne, forretningens
     troværdighed. */
  const OPDIGTET = [
    '312 anmeldelser',
    'Sydkysten',
    '4,8',
    'Mosede Havnevej 15',
    '43 90 15 00',
    'hej@mosedehavnegrill.dk',
    '1.200',
    '1.800',
    'Ronni',
    'Torskegilde',
    'projektor',
    'Projektor',
    'egen indgang',
    'Egen indgang',
  ];

  for (const side of SIDER) {
    test(`${side} har ingen af bundtets opdigtede tal`, async ({ page }) => {
      await åbn(page, side);
      const krop = page.locator('body');
      for (const p of OPDIGTET) {
        await expect(krop, `"${p}" er ikke bekræftet og må ikke stå på ${side}`)
          .not.toContainText(p);
      }
    });
  }

  /* ANTALLET AF PERSONER I BAGLOKALET ER DEN FARLIGSTE.

     Bundtet skrev "40 pers." både på undersiden, i selve
     skuffemenuen og på forsidens kort. Et tal i en menu ligner en
     oplysning og ikke reklame, og en gæst der booker til 38
     personer og møder op til et lokale med plads til 20, er ikke
     en gæst mere.

     Reglen er formuleret som et mønster og ikke som "40", så den
     også fælder 30, 50 og 25. */
  test('ingen side lover et antal personer', async ({ page }) => {
    for (const side of SIDER) {
      await åbn(page, side);
      const tekst = await page.locator('body').innerText();
      expect(tekst, `${side} lover et antal personer`)
        .not.toMatch(/(op til|plads til|til)\s+\d{1,3}\s*(personer|pers\.?|siddende|gæster)/i);
    }
  });
});
