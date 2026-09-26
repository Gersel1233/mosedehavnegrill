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

  /* ⚠️ VENDT 26/9: DE TOMME DAGE SAMLES I ÉN LINJE. Prøven krævede
     syv rækker, og uden en ugeplan stod "Følger snart…" seks gange i
     træk under i dag. Forsiden samlede de tomme dage i én linje 13/9
     (kundens ord: "noget er forældet … kedelige"); menukortet følger
     nu samme regel. Stadig ingen opdigtet ret på torsdag. */
  test('ugen har i dag først — og de tomme dage efter i én linje', async ({ page }) => {
    await åbn(page);

    const dage = page.locator('#mk-uge .mk-dag');
    await expect(dage.first()).toHaveClass(/mk-nu/);
    await expect(dage.first()).toContainText('Fredag · i dag');
    await expect(dage.first()).toContainText('Stegt rødspætte');

    await expect(page.locator('#mk-uge'), 'ugen gentager "Følger snart" for hver tom dag')
      .not.toContainText('Følger snart');
    await expect(page.locator('#mk-uge .mk-uge-mere')).toHaveText('Resten af ugen lægges op løbende.');
    await expect(dage, 'de tomme dage står stadig hver for sig').toHaveCount(1);
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
    /* Og kun i dag: i morgen er der ikke svaret noget endnu — den
       dag er tom og står i ugens samlede linje (26/9), ikke som en
       "ingen dagens ret". */
    await expect(page.locator('#mk-uge [data-dag="2026-08-08"]')).toHaveCount(0);
    await expect(page.locator('#mk-uge .mk-uge-mere')).toBeVisible();
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

  /* ⚠️ VENDT 26/9 — SORTIMENTET STÅR I DE TRYKTE KORTS KAPITLER, ikke
     som ét kort pr. kategori (Mikkels ord: "de skal naturligvis matche
     1:1 med de her"). Reglen bag er urørt og måles her: HVER aktiv vare
     fra admin står på kortet — tallet kommer fra fiksturet, ikke fra
     siden. (Varianter, der koster det samme — mindst tre — står uden
     pris på linjen og med prisen i boksen; se tre-veje.spec.js.) */
  test('sortimentet står i de trykte korts kapitler — alle ejerens varer med', async ({ page }) => {
    const d = medRet();
    await åbn(page, d);

    const aktive = new Set(d.menu_kategorier.filter((k) => k.aktiv).map((k) => k.id));
    const forventet = d.menu_varer.filter((v) => v.aktiv && aktive.has(v.kategori_id))
      .map((v) => v.navn).sort();
    const vist = (await page.$$eval('#mk-kat .mk-linje[data-vare]:not(.mk-henvis)',
      (l) => l.map((e) => e.getAttribute('data-vare')))).sort();
    expect(vist).toEqual(forventet);

    await expect(page.locator('#mk-kat .mk-kapitel')).not.toHaveCount(0);
    await expect(page.locator('[data-kategori="Smørrebrød"] h3')).toHaveText('Varianter');
    await expect(page.locator('[data-vare="Flæskestegssandwich"] .mk-pris')).toHaveText('89,-');
    await expect(page.locator('[data-vare="Flæskestegssandwich"] p'))
      .toHaveText('Sprød flæskesteg, rødkål og agurkesalat.');
  });

  /* ⚠️ VENDT 26/9 — TEGNENE OG ANTALLET ER VÆK MED VILJE. De trykte
     kort har ingen emojier og intet "2 varer"; kapitlerne bærer kortenes
     egne navne. Det er dem, prøven nu måler — og at de gamle tegn ikke
     sniger sig tilbage. */
  test('kapitlerne bærer de trykte korts navne', async ({ page }) => {
    const d = medRet();
    d.menu_kategorier.push({ id: 20, afdeling: 'drikke', navn: 'Kaffe og varme drikke', sortering: 20, aktiv: true });
    d.menu_varer.push({
      id: 20, kategori_id: 20, navn: 'Latte', beskrivelse: null, pris: 40,
      fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
    });
    await åbn(page, d);

    await expect(page.locator('#kapitel-smoerrebroed .mk-kh-titel')).toHaveText('Smørrebrød');
    await expect(page.locator('#afsnit-is .mk-kh-titel')).toHaveText('Is & sødt');
    await expect(page.locator('#kapitel-kaffe .mk-kh-titel')).toContainText('Kaffe,');
    await expect(page.locator('#kapitel-kaffe .mk-kh-titel')).toContainText('koldt & knas');
    await expect(page.locator('#kapitel-bar .mk-kh-titel')).toContainText('& bar');
    // Kaffen står under kortets afsnit "Kaffe", fyldet ved smørrebrødet
    await expect(page.locator('#kapitel-kaffe [data-vare="Latte"]')).toHaveCount(1);
    await expect(page.locator('#kapitel-smoerrebroed [data-vare="Dyrlægens natmad"]')).toHaveCount(1);
    // Og ingen emojier og intet antal
    await expect(page.locator('#mk-kat .mk-tegn, #mk-kat .mk-antal, #mk-kat .mk-vare-tegn')).toHaveCount(0);
  });

  /* ⚠️ TO KATEGORIER MÅ IKKE DELE ANSIGT, NÅR DE SÆLGER HVER SIT
     (20/9). Ejerne fik to nye kategorier samme dag: "Ispinde" og
     "Tillæg: glutenfri, laktosefri og vegansk".

     MÅLT på ejerens rigtige kort: Ispinde matchede INTET mønster
     (`\bis\b` kræver "is" som et helt ord, og "Ispinde" fortsætter)
     og faldt tilbage på afdelingens 🍦 — altså softicens eget tegn.
     To iskategorier med samme ansigt er to, man skal læse for at
     skelne. Tillægget faldt tilbage på husets tallerken 🍽️.

     ⚠️ OG TEGNET SIGER STADIG INTET OM INDHOLDET. Tillægget får det
     SAMME ➕ som de andre tilkøb — ikke 🌱. Et blad på en kategori
     er et løfte om vegansk, og det er en oplysning, ikke en
     tegning. Se loven i js/menu-emoji.js. */
  /* ⚠️ VENDT 26/9: tegnene er væk. Reglen, der er tilbage: ispindene
     står under isen, ikke i "Mere fra lugen". */
  test('ispindene står under Is & sødt', async ({ page }) => {
    const d = medRet();
    d.menu_kategorier.push({ id: 21, afdeling: 'is', navn: 'Ispinde', sortering: 12, aktiv: true });
    d.menu_varer.push({
      id: 21, kategori_id: 21, navn: 'Maxibon', beskrivelse: null, pris: 31,
      fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
    });
    await åbn(page, d);

    await expect(page.locator('#afsnit-is [data-vare="Maxibon"]')).toHaveCount(1);
    await expect(page.locator('#afsnit-is [data-vare="Maxibon"] .mk-pris')).toHaveText('31,-');
  });

  /* ⚠️ VENDT 26/9: tegnet er væk. Reglen, der er tilbage: tillægget
     står på kortet, med sin pris, under "Til selskabet". */
  test('tillægget står på kortet — under Til selskabet', async ({ page }) => {
    const d = medRet();
    d.menu_kategorier.push({
      id: 22, afdeling: 'mad', navn: 'Tillæg: glutenfri, laktosefri og vegansk',
      sortering: 14, aktiv: true,
    });
    d.menu_varer.push({
      id: 22, kategori_id: 22, navn: 'Glutenfri bolle', beskrivelse: null, pris: 10,
      fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
    });
    await åbn(page, d);

    await expect(page.locator('#kapitel-selskab [data-vare="Glutenfri bolle"] .mk-pris')).toHaveText('10,-');
  });

  test('hop-båndet fører til kategorien', async ({ page }) => {
    await åbn(page);

    /* ⚠️ ÉN KNAP PR. KAPITEL (26/9), ikke pr. kategori. Fiksturet har
       smørrebrød (+ fyld), is og øl: tre kapitler. */
    const chips = page.locator('#mk-hop button');
    await expect(chips).toHaveCount(3);
    await expect(chips.first()).toContainText('Smørrebrød');
    await chips.nth(1).click();
    await expect(page.locator('#afsnit-is')).toBeInViewport({ ratio: 0.1 });

    /* ⚠️ VENDT MED KUNDENS BESLUTNING (2/9). Her stod, at en
       kategori, hvor ALT er udsolgt, forsvandt fra båndet — og
       det passede, dengang kortet sorterede det udsolgte fra.
       Kunden sagde ja til, at gæsten skal se dem ("ja lad dem se
       det også"), og så bliver kortet stående med sine rækker
       streget over. En kategori, der forsvinder, ligner en
       kategori, der er nedlagt.

       Reglen bag båndet er URØRT og prøves stadig: det bygges af
       de kort, der FAKTISK står på siden. */
    const d = medRet();
    d.menu_varer[0].udsolgt = true;
    await åbn(page, d);
    await expect(page.locator('#mk-hop button')).toHaveCount(3);
    await expect(page.locator('#mk-hop [data-hop="Smørrebrød"]')).toHaveCount(1);

    // Men en kategori UDEN en eneste vare tegnes stadig ikke
    const tom = medRet();
    tom.menu_kategorier.push({
      id: 30, afdeling: 'mad', navn: 'Ny og tom', sortering: 30, aktiv: true,
    });
    await åbn(page, tom);
    await expect(page.locator('#mk-hop [data-hop="Ny og tom"]')).toHaveCount(0);
  });

  /* ⚠️ PÅ TELEFONEN KLÆBER BÅNDET LIGE UNDER BJÆLKEN  (13/9). Kundens
     ord: "den der bar ... svæver sådan i øvre midten af skærmen på
     telefon, det er elendigt". Båndet stod på 109 px — bjælkens højde
     FØR den blev kompakt — og der lå en stribe af menuen imellem. To
     elementer mod hinanden: bjælkens bund og båndets top. */
  test('på telefonen klæber båndet lige under den faste bjælke', async ({ page }, info) => {
    test.skip(info.project.name === 'computer', 'på computeren står båndet ude i siden');
    const d = medRet();
    d.menu_kategorier.push({ id: 50, afdeling: 'mad', navn: 'Lang liste', sortering: 30, aktiv: true });
    for (let i = 0; i < 30; i++) {
      d.menu_varer.push({ id: 500 + i, kategori_id: 50, navn: 'Vare ' + i, pris: 10 + i,
        sortering: i, aktiv: true, udsolgt: false });
    }
    await åbn(page, d);
    await page.locator('[data-vare="Vare 15"]').evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(page.locator('.topbar.stuck')).toHaveCount(1);
    await expect.poll(async () => {
      const b = await page.locator('#mk-hop').boundingBox();
      const t = await page.locator('.topbar').boundingBox();
      return Math.abs(Math.round(b.y - (t.y + t.height)));
    }, { message: 'afstanden mellem bjælkens bund og båndets top' }).toBeLessThanOrEqual(2);
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

  /* ⚠️ VENDT MED KUNDENS BESLUTNING (2/9). Her stod "udsolgte
     varer står ikke på kortet", med grunden fra 23/8: *"et kort,
     der tilbyder noget, køkkenet ikke har, er værre end et kort
     med én ret mindre."*

     tests/tre-veje.spec.js gjorde skævheden synlig: de tre
     bestillingsveje viser den udsolgte gennemstreget, kortet
     sorterede den helt fra — to lister over det SAMME sortiment,
     hvor den ene sagde, at retten ikke fandtes. Kundens ord:
     *"ja lad dem se det også."*

     ⚠️ KORTET LOVER STADIG INGENTING. Det er hele forudsætningen
     for at vende reglen: rækken er streget over og bærer ordet
     i stedet for prisen. */
  test('en udsolgt vare står gennemstreget på kortet — den forsvinder ikke', async ({ page }) => {
    const d = medRet();
    d.menu_varer[0].udsolgt = true;
    await åbn(page, d);

    const linje = page.locator('[data-vare="Flæskestegssandwich"]');
    await expect(linje).toHaveCount(1);
    await expect(linje).toHaveClass(/mk-udsolgt/);
    await expect(page.locator('[data-vare="Softice med guf"]')).toHaveCount(1);

    /* MÅL DEN BEREGNEDE STIL, ikke klassen: en klasse, der ikke
       slår igennem, er ingen regel. */
    const streg = await linje.locator('h4')
      .evaluate((e) => getComputedStyle(e).textDecorationLine);
    expect(streg).toContain('line-through');
  });

  test('en udsolgt vare bærer ordet i stedet for prisen', async ({ page }) => {
    /* ⚠️ EN PRIS PÅ EN RET, KØKKENET IKKE HAR, ER ET TAL, GÆSTEN
       REGNER MED. Og ordet er det SAMME som på de tre
       bestillingsveje — "Udsolgt i dag" to steder og "Udsolgt" et
       tredje ville være tre udgaver af den samme oplysning. */
    const d = medRet();
    d.menu_varer[0].udsolgt = true;
    await åbn(page, d);

    const linje = page.locator('[data-vare="Flæskestegssandwich"]');
    await expect(linje.locator('.mk-pris')).toHaveText('Udsolgt i dag');
    await expect(linje).not.toContainText('89,-');
  });

  test('en kategori, hvor alt er udsolgt, bliver stående', async ({ page }) => {
    /* Samme regel én gang til: en kategori, der forsvinder,
       ligner en kategori, der er nedlagt — og så leder gæsten
       efter smørrebrødet et andet sted. */
    const d = medRet();
    d.menu_varer[0].udsolgt = true;
    await åbn(page, d);

    await expect(page.locator('[data-kategori="Smørrebrød"]')).toBeVisible();
  });

  /* ⚠️ VENDT 26/9: antallet er væk (kortene har det ikke). Reglen, der
     er tilbage: den udsolgte står der, streget over og uden pris. */
  test('en udsolgt vare står på kortet — med ordet i stedet for prisen', async ({ page }) => {
    const d = medRet();
    d.menu_varer.filter((v) => v.navn === 'Leverpostej med baconsvøb')[0].udsolgt = true;
    await åbn(page, d);

    const kat = page.locator('[data-kategori="Vælg fyld til smørrebrødet"]');
    await expect(kat.locator('.mk-linje')).toHaveCount(2);
    const ud = kat.locator('[data-vare="Leverpostej med baconsvøb"]');
    await expect(ud).toHaveClass(/mk-udsolgt/);
    await expect(ud.locator('.mk-pris')).toHaveText('Udsolgt i dag');
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

  /* ⚠️ VENDT 26/9: kortets overskrifter er de TRYKTE KORTS — Bebas med
     ◆ og dobbelt streg — og deres kursive tekster Fraunces. Sidens egen
     overskrift øverst er stadig husets display-serif. */
  test('overskrifterne er husets — og kortenes egne i kapitlerne', async ({ page }) => {
    await åbn(page);
    const skrift = (v) => page.locator(v).first().evaluate((el) => getComputedStyle(el).fontFamily);
    expect(await skrift('.phead h1')).toContain('Fraunces');
    expect(await skrift('#mk-kat .mk-kh-titel')).toContain('Bebas');
    expect(await skrift('#mk-kat .panel h3')).toContain('Bebas');
    expect(await skrift('#mk-kat .mk-linje h4')).toContain('Instrument Sans');
  });

  /* ⚠️ PÅ PAPIRET (13/9). Kategorier med et foto bag sig har prisen
     i lys rosa med vilje — rød på et mørkt foto kan ikke læses, og
     menukort-foto.spec.js regner den efter. Reglen her er urørt:
     på husets hvide kort er prisen husets røde. */
  test('priserne er havnens røde', async ({ page }) => {
    // Et papirkort med en rigtig pris: alle prøvedataenes egne står nu på foto.
    const d = medRet();
    d.menu_kategorier.push({ id: 60, afdeling: 'mad', navn: 'Tilkøb ud af huset', sortering: 40, aktiv: true });
    d.menu_varer.push({ id: 600, kategori_id: 60, navn: 'Ekstra remoulade', pris: 10, sortering: 1, aktiv: true, udsolgt: false });
    await åbn(page, d);
    // En rigtig pris — "spørg" og "udsolgt" er dæmpet med vilje.
    const papir = page.locator('#mk-kat .panel:not(.mk-foto-kort) .mk-pris:not(.mk-spoerg):not(.mk-udsolgt-maerke)');
    await expect(papir.first(), 'vagt: der skal være et kort uden foto').toHaveCount(1);
    await expect(papir.first()).toHaveCSS('color', RØD);
  });

  /* ⚠️ VENDT 5/9 — MÆRKET ER UDE AF UNDERSIDERNES TOP, og det er
     kundens eget valg efter at være spurgt. Reglen var, at
     menukortet skal se ud som resten af huset, og den gælder
     stadig: toppen er den SAMME som på de andre undersider, altså
     tilbage-pil og menu og ingen krans. Prøven måler nu netop det,
     og tests/topbjaelken.spec.js holder de ni sider op mod
     mappen. */
  test('toppen er den samme som på de andre undersider', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('.topbar .crest')).toHaveCount(0);
    await expect(page.locator('.topbar a.g.icn[aria-label="Tilbage"]')).toHaveCount(1);
    await expect(page.locator('.topbar button.g.icn')).toHaveCount(1);
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
    /* Fotoet bag en kategori er vores eget (.mk-bg, 13/9); reglen er,
       at et VARENAVN aldrig bliver til et billede. */
    expect(await page.locator('.mk-sortiment .mk-linje img').count()).toBe(0);
    /* Kapitlernes fotos (.mk-foto) er husets pynt, ikke et varenavn. */
    expect(await page.$$eval('.mk-sortiment img', (l) => l.filter((i) => !i.closest('.mk-bg, .mk-foto')).length)).toBe(0);
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

/* ============================================================
   VARELINJEN ER NAVNET — OG KUN NAVNET  (26/9)
   ------------------------------------------------------------
   Her stod "Et ansigt pr. ret" (1/9): kortet viste bestillingssidens
   emoji ved hver vare. De trykte kort har ingen, og Mikkel bad om, at
   siden matcher dem 1:1 — så tegnene er væk med vilje. Det, der står
   tilbage af reglen: <h4> og data-vare er varens navn, ordret, for de
   læses af søgning, af lagene og af prøverne.
   ============================================================ */
test.describe('Varelinjen er navnet', () => {
  test('h4 og data-vare er det samme navn — uden tegn', async ({ page }) => {
    await åbn(page);
    const linjer = page.locator('#mk-kat .mk-linje[data-vare]:not(.mk-samlet)');
    const n = await linjer.count();
    expect(n, 'der er ingen varelinjer at måle på').toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const l = linjer.nth(i);
      expect(await l.locator('h4').textContent()).toBe(await l.getAttribute('data-vare'));
    }
    await expect(page.locator('#mk-kat .mk-vare-tegn')).toHaveCount(0);
  });
});

/* ============================================================
   KAPITLERNE STÅR I KORTENES RÆKKEFØLGE  (26/9)
   ------------------------------------------------------------
   Her stod "Menukortet læses i afsnit" (9/9): Mad, Is og dessert,
   Drikke, efter ejerens afdeling. Nu er rækkefølgen DE TRYKTE KORTS
   (Mikkels ord: "de skal naturligvis matche 1:1 med de her") —
   grillen, à la carte, smørrebrød, håndmadder, is, kaffe, øl, og
   "Til selskabet" til sidst.

   Det, der står tilbage af reglerne herfra, og som måles:
   · maden står samlet, isen og øllet deler den ikke
   · EJERENS PILE bestemmer rækkefølgen INDE i et afsnit (pilene i
     admin skal blive ved med at gøre, hvad de siger)
   · en kategori, kortene ikke kender, TABES IKKE — den får sin egen
     plads i "Mere fra lugen"
   · ét kapitel er ingen opdeling: ingen glasbjælke
   ============================================================ */
test.describe('Kapitlerne står i kortenes rækkefølge', () => {
  function medBlandetKort() {
    const d = medRet();
    d.menu_kategorier = [
      { id: 1, afdeling: 'mad', navn: 'Retter', sortering: 2, aktiv: true },
      { id: 2, afdeling: 'is', navn: 'Softice og vafler', sortering: 11, aktiv: true },
      { id: 3, afdeling: 'drikke', navn: 'Øl', sortering: 21, aktiv: true },
      { id: 4, afdeling: 'mad', navn: 'Burgere', sortering: 30, aktiv: true },
    ];
    d.menu_varer = [
      { id: 11, kategori_id: 1, navn: 'Pariserbøf', pris: 105, sortering: 1, aktiv: true },
      { id: 15, kategori_id: 1, navn: 'Clubsandwich', pris: 105, sortering: 2, aktiv: true },
      { id: 12, kategori_id: 2, navn: 'Softice', pris: 30, sortering: 1, aktiv: true },
      { id: 13, kategori_id: 3, navn: 'Fadøl', pris: 45, sortering: 1, aktiv: true },
      { id: 14, kategori_id: 4, navn: 'Cheeseburger', pris: 85, sortering: 1, aktiv: true },
    ];
    return d;
  }
  const kapitler = (page) => page.$$eval('#mk-kat .mk-kapitel', (l) => l.map((k) => k.getAttribute('data-kapitel')));

  test('maden står samlet — isen og øllet deler den ikke', async ({ page }) => {
    /* Burgerne har sortering 30, altså EFTER isen og øllet hos
       ejeren. Kortene sætter dem ved maden alligevel. */
    await åbn(page, medBlandetKort());
    expect(await kapitler(page)).toEqual(['grillen', 'burgere', 'is', 'bar']);
  });

  test('ejerens egen sortering bestemmer inde i afsnittet', async ({ page }) => {
    const d = medBlandetKort();
    d.menu_varer[0].sortering = 5;   // Pariserbøf efter Clubsandwich
    await åbn(page, d);
    const r = await page.$$eval('#kapitel-grillen .mk-linje[data-vare]', (l) => l.map((e) => e.getAttribute('data-vare')));
    expect(r, 'ejerens pile slår ikke igennem på gæstesiden').toEqual(['Clubsandwich', 'Pariserbøf']);
  });

  test('en kategori, kortene ikke kender, får sin egen plads', async ({ page }) => {
    const d = medBlandetKort();
    d.menu_kategorier.push({ id: 5, afdeling: 'grill', navn: 'Sæsonens fisk', sortering: 40, aktiv: true });
    d.menu_varer.push({ id: 16, kategori_id: 5, navn: 'Røget ørred', pris: 75, sortering: 1, aktiv: true });
    await åbn(page, d);
    expect((await kapitler(page)).slice(-1)).toEqual(['mere']);
    await expect(page.locator('#kapitel-mere [data-kategori="Sæsonens fisk"] h3')).toHaveText('Sæsonens fisk');
    await expect(page.locator('#kapitel-mere [data-vare="Røget ørred"] .mk-pris')).toHaveText('75,-');
  });

  test('ét kapitel er ingen opdeling — ingen glasbjælke', async ({ page }) => {
    const d = medBlandetKort();
    d.menu_kategorier = d.menu_kategorier.filter((k) => k.navn === 'Retter');
    await åbn(page, d);
    await expect(page.locator('#mk-kat .mk-kapitel')).toHaveCount(1);
    await expect(page.locator('#mk-hop')).toBeHidden();
  });
});

/* ============================================================
   #afsnit-is SKAL FAKTISK LANDE PÅ ISEN  (21/9)
   ------------------------------------------------------------
   Forsiden har fået "Se hele is-menukortet →", der peger på
   m-menukort.html#afsnit-is.

   ⚠️ PRØVEN MÅLER UDFALDET, IKKE HVEM DER GØR DET.
   Den består BÅDE med og uden husets eget hopTilHash() — målt
   21/9, da falsificeringen ikke kunne fælde den. Chromium prøver
   selv hoppet igen, når elementet dukker op.

   Og det er med vilje: det, der betyder noget, er, at gæsten
   lander på isen. Hvem der rullede — browseren eller os — er en
   detalje, hun aldrig mærker. En prøve, der i stedet spurgte om
   vores egen funktion blev kaldt, ville bestå den dag, hoppet
   holdt op med at virke af en helt anden grund.

   ⚠️ RULLEROD? DET AFHÆNGER AF SKÆRMBREDDEN — MÅLT 21/9.
   Her stod "rulleroden ER #sc, ikke vinduet". Det gælder på
   COMPUTER. På telefonen har #sc overflow-y: visible og
   scrollHeight == clientHeight (3319 == 3319) — det er VINDUET,
   der ruller, og sc.scrollTop bliver stående på nul, uanset hvor
   langt gæsten er nede.

   Prøven spurgte kun #sc og bestod derfor på computeren og faldt
   på telefonen, selv om hoppet virkede begge steder: window.scrollY
   1475, overskriften 272 px fra toppen — nøjagtig samme landing.
   Sætningen var skrevet af fra .claude/skills/se-siden, som handler
   om FORSIDEN, og aldrig målt her. En kommentar er ikke et værn.

   Målingen spørger derfor begge rødder og tager den, der faktisk
   har flyttet sig. Og den kræver nu, at overskriften er SYNLIG —
   ikke bare at et tal er over nul: rullet forbi isen er lige så
   forkert som ikke rullet.
   ============================================================ */
test.describe('Genvejen fra forsiden lander på isen', () => {

  async function rulletTil(page) {
    return page.evaluate(() => {
      const sc = document.getElementById('sc');
      const is = document.getElementById('afsnit-is');
      return {
        /* Den af de tre, der faktisk har flyttet sig. På computer
           er det #sc, på telefonen vinduet — se noten ovenfor. */
        rullet: Math.round(Math.max(
          sc ? sc.scrollTop : 0,
          window.scrollY || 0,
          document.documentElement.scrollTop || 0)),
        findes: !!is,
        /* Hvor langt fra skærmens top står overskriften? Den må
           ikke gemme sig under bjælken og hop-båndet. */
        fraToppen: is ? Math.round(is.getBoundingClientRect().top) : null,
        skaerm: Math.round(window.innerHeight),
      };
    });
  }

  test('med #afsnit-is ruller siden ned til isen', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html#afsnit-is', { ur: FREDAG, data: medRet() });
    await page.waitForTimeout(1800);
    const m = await rulletTil(page);
    expect(m.findes, 'isafsnittet blev ikke tegnet').toBe(true);
    /* ⚠️ TALLET KOMMER UDEFRA: nul er browserens egen udgangsstilling.
       Står den der stadig, skete hoppet aldrig. */
    expect(m.rullet, 'siden blev stående i toppen — hoppet virkede ikke')
      .toBeGreaterThan(0);
    /* Og overskriften skal være SYNLIG, ikke bare rullet forbi.
       ⚠️ BEGGE ENDER. Kun "over nul" ville bestå, hvis siden rullede
       til bunden og efterlod isen tre skærme oppe — og på telefonen
       er netop dét den sandsynlige fejl. */
    expect(m.fraToppen, 'isafsnittet gemmer sig under bjælken')
      .toBeGreaterThanOrEqual(0);
    expect(m.fraToppen, 'isafsnittet er slet ikke på skærmen')
      .toBeLessThan(m.skaerm);
  });

  /* ⚠️ MODSTYKKET. Uden en hash må siden IKKE rulle af sig selv —
     en gæst, der åbner menukortet for at læse fra toppen, skal
     ikke kastes ned i midten. */
  test('uden hash bliver siden i toppen', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { ur: FREDAG, data: medRet() });
    await page.waitForTimeout(1800);
    const m = await rulletTil(page);
    expect(m.rullet, 'siden rullede af sig selv uden at blive bedt om det')
      .toBe(0);
  });
});
