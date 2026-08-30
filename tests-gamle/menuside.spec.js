/* Menukortet på sin egen side.

   Testene her er de samme påstande som lå i forside.spec.js, indtil
   hele menukortet flyttede væk fra forsiden. De handler stadig om
   de tre ting der kan gå galt med et menukort:

   1) At en pris bliver opdigtet. Fire varer står med "ca." på
      forretningens eget kort, og de skal vises UDEN pris.
   2) At en kategori uden priser – de 29 slags smørrebrødsfyld –
      bliver en søjle med 29 tankestreger i stedet for pastiller.
   3) At en udsolgt vare forsvinder. Den skal blive stående med et
      mærke, så gæsten kan se at den findes til næste gang.

   Og to der er nye med siden: at afdelingerne kan skiftes, og at et
   link direkte til en kategori åbner den rigtige afdeling.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

test.describe('Hele menukortet', () => {

  test('mad vises først, med kategorier fra databasen', async ({ page }) => {
    await åbn(page, '/menu.html');
    await expect(page.locator('#afd-mad')).toHaveAttribute('aria-selected', 'true');
    // Og fanen skal SES valgt, ikke kun være det for en skærmlæser
    await expect(page.locator('#afd-mad')).toHaveClass(/valgt/);
    await expect(page.locator('#afd-is')).not.toHaveClass(/valgt/);
    await expect(page.locator('#menu-liste .kat')).toHaveCount(2);
    await expect(page.locator('#menu-liste')).toContainText('Smørrebrød');
    await expect(page.locator('#menu-liste')).not.toContainText('Fadøl');
  });

  test('man kan skifte til is og til drikkevarer', async ({ page }) => {
    await åbn(page, '/menu.html');

    await page.locator('#afd-is').click();
    await expect(page.locator('#menu-liste')).toContainText('Softice med guf');
    await expect(page.locator('#menu-liste')).not.toContainText('Flæskestegssandwich');
    await expect(page.locator('#afd-is')).toHaveClass(/valgt/);

    await page.locator('#afd-drikke').click();
    await expect(page.locator('#menu-liste')).toContainText('Fadøl, lille');
    await expect(page.locator('#afd-mad')).toHaveAttribute('aria-selected', 'false');
  });

  test('priser skrives som på et menukort', async ({ page }) => {
    await åbn(page, '/menu.html');
    await expect(page.locator('#menu-liste .linje-pris').first()).toHaveText('89,-');

    await page.locator('#afd-is').click();
    // 35,5 → "35,50,-" ville være grimt; komma-formen bevares
    await expect(page.locator('#menu-liste .linje-pris').first()).toHaveText('35,50,-');
  });

  test('en kategori uden priser vises som pastiller, ikke som tankestreger', async ({ page }) => {
    // Fyldet til smørrebrødet er en liste man vælger fra. 29
    // tankestreger i en priskolonne er støj.
    await åbn(page, '/menu.html');
    const valg = page.locator('#menu-liste .valg');
    await expect(valg).toHaveCount(1);
    await expect(valg.locator('.valg-en')).toHaveCount(2);
    await expect(valg).toContainText('Dyrlægens natmad');
    // Ingen prisfelter i den kategori
    expect(await page.locator('#menu-liste .kat').last().locator('.linje-pris').count()).toBe(0);
  });

  test('en vare uden pris viser ingen pris – aldrig et gæt', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, pris: null } : v);
    await åbn(page, '/menu.html', { data: grunddata({ menu_varer: varer }) });

    await expect(page.locator('#menu-liste')).toContainText('Flæskestegssandwich');
    await expect(page.locator('#menu-liste')).not.toContainText('0,-');
    // Kategorien har nu ingen priser, så den vises som pastiller
    await expect(page.locator('#menu-liste .valg')).toHaveCount(2);
  });

  test('udsolgt markeres, men varen bliver stående', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, udsolgt: true } : v);
    await åbn(page, '/menu.html', { data: grunddata({ menu_varer: varer }) });
    await expect(page.locator('#menu-liste .linje').first()).toHaveClass(/udsolgt/);
    await expect(page.locator('#menu-liste')).toContainText('Flæskestegssandwich');
  });

  test('en slukket vare vises slet ikke', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, aktiv: false } : v);
    await åbn(page, '/menu.html', { data: grunddata({ menu_varer: varer }) });
    await expect(page.locator('#menu-liste')).not.toContainText('Flæskestegssandwich');
  });

  test('en tom afdeling siger noget venligt', async ({ page }) => {
    await åbn(page, '/menu.html', { data: grunddata({ menu_varer: [] }) });
    await expect(page.locator('#menu-liste')).toContainText(/ikke lagt noget ind/);
  });

  test('noten under menukortet kommer fra databasen', async ({ page }) => {
    await åbn(page, '/menu.html');
    await expect(page.locator('#menu-note')).toContainText('glutenfri');
  });

  test('gamle kategorier med afdeling "grill" havner under mad', async ({ page }) => {
    // Efter en halv opgradering af databasen kan der stå 'grill'.
    // De må ikke blive usynlige.
    const kat = grunddata().menu_kategorier.map(k =>
      k.id === 1 ? { ...k, afdeling: 'grill' } : k);
    await åbn(page, '/menu.html', { data: grunddata({ menu_kategorier: kat }) });
    await expect(page.locator('#menu-liste')).toContainText('Flæskestegssandwich');
  });

  /* DER MÅ IKKE VÆRE TOMT SAND MELLEM KATEGORIERNE.

     js/menuside.js tegner hver kategori som <section class="kat">, og
     arket har en regel

       section { padding-block: clamp(64px, 9vw, 132px); }

     skrevet til sidens egne afsnit. Den ramte hver kategori: 115 px
     over og 115 px under hver af dem. På det rigtige menukort med
     fjorten kategorier blev det godt 3200 px tomt sand, og man kunne
     kun se det ved at måle – der var jo ingenting dér.

     Testen måler afstanden fra den sidste vare i én kategori til
     navnet på den næste. Det skal være den ene afstand der er valgt
     (margin-bottom, op til 52 px) plus overskriftens egen luft – ikke
     to gange 115 px oveni. */
  test('kategorierne står tæt nok til at man kan rulle gennem dem', async ({ page }) => {
    await åbn(page, '/menu.html');
    await expect(page.locator('#menu-liste .kat')).toHaveCount(2);

    const hul = await page.evaluate(() => {
      const kats = document.querySelectorAll('#menu-liste .kat');
      const forrige = kats[0].getBoundingClientRect();
      const naeste = kats[1].querySelector('h2').getBoundingClientRect();
      const polstring = getComputedStyle(kats[0]);
      return {
        afstand: naeste.top - forrige.bottom,
        pt: parseFloat(polstring.paddingTop),
        pb: parseFloat(polstring.paddingBottom),
      };
    });

    expect(hul.pt + hul.pb,
      `kategorien har ${hul.pt + hul.pb} px lodret polstring – section-reglen har ramt den`)
      .toBe(0);
    expect(hul.afstand,
      `der er ${Math.round(hul.afstand)} px mellem to kategorier`).toBeLessThan(80);
  });
});

test.describe('Sikkerhed og robusthed', () => {

  test('et varenavn med tegn fra HTML bliver vist som tekst', async ({ page }) => {
    const farligt = '<img src=x onerror="window.HACKET=1">Burger';
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, navn: farligt } : v);
    await åbn(page, '/menu.html', { data: grunddata({ menu_varer: varer }) });

    await expect(page.locator('#menu-liste')).toContainText(farligt);
    expect(await page.evaluate(() => window.HACKET)).toBeUndefined();
    expect(await page.locator('#menu-liste img').count()).toBe(0);
  });

  test('siden går ikke ned hvis databasen svarer tomt', async ({ page }) => {
    const tomt = {
      lokationer: [], aabningstider: [], lukkedage: [],
      menu_kategorier: [], menu_varer: [], nyheder: [], indstillinger: {},
    };
    await åbn(page, '/menu.html', { data: tomt });

    /* Siden skal stå der, og gæsten skal kunne ringe. En tom
       database må aldrig blive en hvid skærm. */
    await expect(page.locator('h1')).toContainText('Menukortet');
    await expect(page.locator('#menu-status-tekst')).not.toHaveText('');
    await expect(page.locator('#menu-tel')).toHaveAttribute('href', /^tel:/);
    await expect(page.locator('#menu-liste')).toContainText(/ikke lagt noget ind/);
  });
});

/* ============ KATEGORIERNE ER FOLDER ==========================

   Kundens ord (22/8): menukortet skal være "mere overskueligt og
   opdelt og telefon-egnet", og han sendte to skærmbilleder fra
   bestillingssiden som svar på hvordan — lukkede rækker med
   kategorinavnet, og én foldet ud med varerne under.

   Grunden er den samme her: kortet har fjorten kategorier og 151
   varer. Fladt ud er det 5-6.000 pixel på en telefon, og man skal
   RULLE for at finde ud af, hvad der overhovedet findes. */
test.describe('Menukortets folder', () => {

  test('den første kategori er åben, resten er lukkede', async ({ page }) => {
    await åbn(page, '/menu.html');
    const hoveder = page.locator('#menu-liste .fold-hoved');
    await expect(hoveder).toHaveCount(2);

    /* Den FØRSTE er åben. En side, hvor alt er lukket, ligner et
       menukort, nogen har gemt væk — man skal trykke én gang for
       at se, at der overhovedet er mad. */
    await expect(hoveder.nth(0)).toHaveAttribute('aria-expanded', 'true');
    await expect(hoveder.nth(1)).toHaveAttribute('aria-expanded', 'false');

    await expect(page.locator('#menu-liste .kat').nth(0).locator('.fold-krop'))
      .toBeVisible();
    await expect(page.locator('#menu-liste .kat').nth(1).locator('.fold-krop'))
      .toBeHidden();
  });

  test('et tryk folder ud, og et til folder ind igen', async ({ page }) => {
    await åbn(page, '/menu.html');
    const anden = page.locator('#menu-liste .kat').nth(1);
    const knap = anden.locator('.fold-hoved');

    await knap.click();
    await expect(knap).toHaveAttribute('aria-expanded', 'true');
    await expect(anden.locator('.fold-krop')).toBeVisible();
    await expect(anden).toContainText('Dyrlægens natmad');

    await knap.click();
    await expect(anden.locator('.fold-krop')).toBeHidden();
  });

  /* Tallet er svaret på "er der noget at komme efter herinde?",
     som man ellers kun kan få ved at åbne folden. Det TÆLLES, så
     det ikke kan skride fra listen. */
  test('folden siger, hvor mange varer der er i kategorien', async ({ page }) => {
    await åbn(page, '/menu.html');
    const noter = page.locator('#menu-liste .fold-note');
    await expect(noter.nth(0)).toHaveText('1 vare');
    await expect(noter.nth(1)).toHaveText('2 varer');
  });

  /* Genvejen skal ÅBNE folden og ikke bare rulle hen til en lukket
     kasse. Uden det førte "Vælg fyld til smørrebrødet" i
     genvejsrækken til en overskrift uden noget under — man havde
     trykket rigtigt og stod stadig og manglede menukortet. */
  test('en genvej åbner den kategori, den peger på', async ({ page }) => {
    await åbn(page, '/menu.html');
    const anden = page.locator('#menu-liste .kat').nth(1);
    await expect(anden.locator('.fold-krop')).toBeHidden();

    await page.locator('#kat-stier a').nth(1).click();
    await expect(anden.locator('.fold-krop')).toBeVisible();
  });

  /* Et delt link — menu.html#kat-oel i en sms — skal vise øllene,
     ikke en lukket overskrift der hedder "Øl". */
  test('et anker i adressen åbner kategorien', async ({ page }) => {
    await åbn(page, '/menu.html#kat-vaelg-fyld-til-smoerrebroedet');
    const anden = page.locator('#menu-liste .kat').nth(1);
    await expect(anden.locator('.fold-krop')).toBeVisible();
    await expect(anden.locator('.fold-hoved')).toHaveAttribute('aria-expanded', 'true');
  });

  /* Overskriften ER knappen, men <h2> bliver stående om den. En
     skærmlæser skal kunne springe fra kategori til kategori, og et
     <button> alene er ingen overskrift. */
  test('hver fold har stadig en rigtig overskrift', async ({ page }) => {
    await åbn(page, '/menu.html');
    await expect(page.locator('#menu-liste .kat > h2')).toHaveCount(2);
    await expect(page.locator('#menu-liste .kat > h2 > button.fold-hoved')).toHaveCount(2);
  });
});

/* ============== SPIIS' KORTSTIL PÅ MENUKORTET =================

   Kunden sendte to skærmbilleder fra spiis (23/8): "menukortet og
   de steder, hvor man skal kunne se deres sortiment — lad det være
   præcis den her flotte og dejlige stil med overskuelighed, bare
   deres farvepaletter."

   Formen dér er ét hvidt kort pr. kategori: et lille tegn i en
   rund firkant, navnet, antallet ude til højre, en stiplet streg
   ned til varerne, og priserne i mærkefarven yderst.

   Prøverne måler den FAKTISKE maling og ikke klassenavnene: en
   regel, der bare tjekker at der står class="kat-fold", består
   stadig den dag, hele reglen er slettet af stilarket. */
test.describe('Menukortets kortstil', () => {

  test('hver kategori er et hvidt kort med afrundede hjørner', async ({ page }) => {
    await åbn(page, '/menu.html');
    const kort = page.locator('#menu-liste .kat').first();

    const stil = await kort.evaluate((e) => {
      const s = getComputedStyle(e);
      return { bund: s.backgroundColor, radius: parseFloat(s.borderTopLeftRadius) };
    });
    /* Papirfarven og ikke sandet: kortet skal LØFTE sig fra
       grunden. Er de to ens, er der ikke noget kort. */
    const sand = await page.locator('body')
      .evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(stil.bund, 'kortet har samme farve som siden bagved').not.toBe(sand);
    expect(stil.radius, 'kortet har skarpe hjørner').toBeGreaterThan(10);
  });

  test('tegnet foran navnet kommer fra afdelingen', async ({ page }) => {
    await åbn(page, '/menu.html');
    /* Begge kategorier i grunddata er mad. Skifter man til is,
       skifter tegnet — og DET er beviset for, at det kommer fra
       data og ikke fra en fast liste. */
    await expect(page.locator('#menu-liste .kat-tegn').first()).toHaveText('🍽️');

    await page.locator('#afd-is').click();
    await expect(page.locator('#menu-liste .kat-tegn').first()).toHaveText('🍦');
  });

  test('tegnet er skjult for skærmlæsere — det er pynt', async ({ page }) => {
    await åbn(page, '/menu.html');
    await expect(page.locator('#menu-liste .kat-tegn').first())
      .toHaveAttribute('aria-hidden', 'true');
  });

  test('skillelinjen ned til varerne er stiplet', async ({ page }) => {
    /* En FULD streg deler kortet i to kort. En stiplet siger "det
       her hører sammen, og nu kommer indholdet". */
    await åbn(page, '/menu.html');
    const stil = await page.locator('#menu-liste .kat .fold-krop').first()
      .evaluate((e) => getComputedStyle(e).borderTopStyle);
    expect(stil).toBe('dashed');
  });

  test('én kategori giver ingen genvejsrække', async ({ page }) => {
    /* En enlig pille over kortet, der fører til kortet lige
       nedenunder, ligner et filter, man har glemt at slå fra.
       Grunddatas is-afdeling har netop én kategori; mad har to. */
    await åbn(page, '/menu.html');
    await expect(page.locator('#kat-stier')).toBeVisible();

    await page.locator('#afd-is').click();
    await expect(page.locator('#menu-liste .kat')).toHaveCount(1);
    await expect(page.locator('#kat-stier')).toBeHidden();
  });

  test('prisen står i mærkefarven, ikke i brødtekstens', async ({ page }) => {
    await åbn(page, '/menu.html');
    const pris = page.locator('#menu-liste .linje-pris').first();
    await expect(pris).toBeVisible();

    const farver = await pris.evaluate((e) => ({
      pris: getComputedStyle(e).color,
      navn: getComputedStyle(e.closest('.linje').querySelector('.navn')).color,
    }));
    expect(farver.pris, 'prisen har samme farve som varenavnet').not.toBe(farver.navn);
    /* Og den er RØD og ikke bare anderledes: rød kanal højest af
       de tre. Uden det ville en grå pris bestå prøven. */
    const [r, g, b] = farver.pris.match(/\d+/g).map(Number);
    expect(r, 'prisen er ikke i mærkefarven').toBeGreaterThan(g + 30);
    expect(r).toBeGreaterThan(b + 30);
  });
});
