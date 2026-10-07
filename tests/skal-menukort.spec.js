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
     ◆ og dobbelt streg. Sidens egen overskrift øverst er husets skrift.
     ⚠️ HOST GROTESK SIDEN 27/9 (Mikkels valg: LESREG's skrift i hele huset). Bebas bliver:
     den er de trykte korts, tegnet og ikke sat. */
  test('overskrifterne er husets — og kortenes egne i kapitlerne', async ({ page }) => {
    await åbn(page);
    const skrift = (v) => page.locator(v).first().evaluate((el) => getComputedStyle(el).fontFamily);
    expect(await skrift('.phead h1')).toContain('Host Grotesk');
    expect(await skrift('#mk-kat .mk-kh-titel')).toContain('Bebas');
    expect(await skrift('#mk-kat .panel h3')).toContain('Bebas');
    expect(await skrift('#mk-kat .mk-linje h4')).toContain('Host Grotesk');
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
      /* ⚠️ MORGENMADEN BÆRER KORT 1 HER  (7/10). Her stod "Retter"
         (Pariserbøf) for maden på kort 1 — men korrekturen af kort 2
         (facit 7/10) satte Fisk & klassikere og dermed Retter på kort 2.
         Uden morgenmad var kort 1 tomt, og prøverne målte et kapitel, der
         ikke fandtes. Sortering 25: også den står hos ejeren efter isen. */
      { id: 6, afdeling: 'mad', navn: 'Morgenmad', sortering: 25, aktiv: true },
    ];
    d.menu_varer = [
      { id: 11, kategori_id: 1, navn: 'Pariserbøf', pris: 105, sortering: 1, aktiv: true },
      { id: 15, kategori_id: 1, navn: 'Clubsandwich', pris: 105, sortering: 2, aktiv: true },
      { id: 12, kategori_id: 2, navn: 'Softice', pris: 30, sortering: 1, aktiv: true },
      { id: 13, kategori_id: 3, navn: 'Fadøl', pris: 45, sortering: 1, aktiv: true },
      { id: 14, kategori_id: 4, navn: 'Cheeseburger', pris: 85, sortering: 1, aktiv: true },
      { id: 17, kategori_id: 6, navn: 'Morgenkomplet', pris: 95, sortering: 1, aktiv: true },
      { id: 18, kategori_id: 6, navn: 'Rundstykke med ost', pris: 30, sortering: 2, aktiv: true },
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
    /* 7/10: målt på morgenmaden, ikke Pariserbøf og Clubsandwich. Begge
       står nu ved NAVN på kort 2 (Fisk & klassikere / Burgere &
       sandwiches), og en navngiven vare følger det trykte korts orden —
       ejerens pile gælder kategoriens øvrige varer. Det er dem, prøven
       skal måle. */
    const d = medBlandetKort();
    d.menu_varer.find((v) => v.navn === 'Morgenkomplet').sortering = 5;   // efter rundstykket
    await åbn(page, d);
    const r = await page.$$eval('#kapitel-grillen .mk-linje[data-vare]', (l) => l.map((e) => e.getAttribute('data-vare')));
    expect(r, 'ejerens pile slår ikke igennem på gæstesiden').toEqual(['Rundstykke med ost', 'Morgenkomplet']);
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

/* ============================================================
   KORTVISNINGEN FØLGER DE TRYKTE KORTS EGNE NAVNE  (30/9)
   ------------------------------------------------------------
   De trykte grillkort er rokeret om. Ejerens besked: *"ingen varer
   eller priser er ændret. Kort 1: Morgenmad og frokost. Kort 2: À
   la carte, burgere og pølser. Sandwich bliver sammen med burgerne
   som før."*

   Kort 2 passede allerede. Kort 1 gjorde ikke: det hed »Menukort«
   og lovede i sin egen indledning »burgere lavet på bestilling« —
   og burgerne ligger på kort 2. En gæst med det trykte kort i
   hånden ledte efter et kapitel, skærmen ikke havde.

   ⚠️ KUN NAVNENE. Ingen vare, ingen pris og ingen kilde er rørt —
   det er en omrokering på papiret, ikke i køkkenet. `id` på
   kapitlet bliver også: det er ankeret, ikke en overskrift, og at
   skifte det ville brække links uden at gæsten så noget.

   ⚠️ OG »Menukort« STOD I FORVEJEN TO GANGE: siden har sin egen
   <h1>Menukort</h1> lige over kortet. Navnet gik altså ikke tabt.
   ============================================================ */
test.describe('Kapitlernes navne følger de trykte kort', () => {

  /* Det samme blandede kort som blokken ovenfor — helt sin egen, så
     en rettelse dér ikke flytter tallene her. */
  function kortMedMad() {
    const d = grunddata();
    d.menu_kategorier = [
      { id: 1, afdeling: 'mad', navn: 'Retter', sortering: 1, aktiv: true },
      { id: 2, afdeling: 'is', navn: 'Softice og vafler', sortering: 20, aktiv: true },
      { id: 4, afdeling: 'mad', navn: 'Burgere', sortering: 30, aktiv: true },
      { id: 5, afdeling: 'mad', navn: 'Sandwich', sortering: 31, aktiv: true },
      /* 7/10: Retter står på kort 2 nu (korrekturen af kort 2) — kort 1
         skal have morgenmad for at findes. */
      { id: 6, afdeling: 'mad', navn: 'Morgenmad', sortering: 0, aktiv: true },
    ];
    d.menu_varer = [
      { id: 11, kategori_id: 1, navn: 'Pariserbøf', pris: 105, sortering: 1, aktiv: true },
      { id: 12, kategori_id: 2, navn: 'Softice', pris: 30, sortering: 1, aktiv: true },
      { id: 14, kategori_id: 4, navn: 'Cheeseburger', pris: 85, sortering: 1, aktiv: true },
      { id: 16, kategori_id: 5, navn: 'Kyllingesandwich', pris: 75, sortering: 1, aktiv: true },
      { id: 17, kategori_id: 6, navn: 'Morgenkomplet', pris: 95, sortering: 1, aktiv: true },
    ];
    return d;
  }

  test('kort 1 hedder Morgenmad & frokost — på kortet og i hop-båndet',
    async ({ page }) => {
      await åbn(page, kortMedMad());
      const foerste = page.locator('#mk-kat .mk-kapitel').first();
      await expect(foerste).toHaveAttribute('data-kapitel', 'grillen');
      await expect(foerste.locator('.mk-kh-titel')).toContainText('Morgenmad');
      await expect(foerste.locator('.mk-kh-titel')).toContainText('frokost');
      await expect(foerste.locator('.mk-kh-titel'),
        'kortet hedder stadig "Menukort", som sidens egen overskrift')
        .not.toContainText('Menukort');
      const baand = await page.locator('#mk-hop a, #mk-hop button').allInnerTexts();
      expect(baand.map((s) => s.trim())[0]).toBe('Morgenmad & frokost');
    });

  /* ⚠️ INDLEDNINGEN MÅ IKKE LOVE BURGERE PÅ ET KORT UDEN BURGERE.
     Den stod der fra dengang kort 1 var hele grillens kort. */
  test('kort 1 lover ikke burgere længere', async ({ page }) => {
    await åbn(page, kortMedMad());
    await expect(page.locator('#kapitel-grillen .mk-kh-tekst'))
      .not.toContainText(/burger/i);
  });

  /* MODSTYKKET: kort 2 var rigtigt i forvejen og skal blive ved. */
  test('kort 2 er stadig À la carte, burgere & pølser — med sandwichen',
    async ({ page }) => {
      await åbn(page, kortMedMad());
      const k = page.locator('#kapitel-burgere');
      await expect(k.locator('.mk-kh-titel')).toContainText('À la carte');
      await expect(k.locator('.mk-kh-titel')).toContainText('burgere & pølser');
      /* Sandwichen hører til burgernes afsnit — "som før". */
      const afsnit = k.locator('.mk-sek', { hasText: 'Burgere & sandwiches' });
      await expect(afsnit.locator('[data-vare="Kyllingesandwich"]')).toHaveCount(1);
      await expect(afsnit.locator('[data-vare="Cheeseburger"]')).toHaveCount(1);
    });
});

/* ============================================================
   VEGANSK · VEGETAR · GLUTENFRIT — SOM MULIGHED, IKKE PÅSTAND
   (1/10)
   ------------------------------------------------------------
   Chefens ord: *"vi vil gerne have, at der bliver lavet et
   Vegansk/Vegetar, Glutenfrit punkt, hvor der står vores salat,
   hvidløgsbrød, pastasalat, bagt kartoffel med salat og
   dressing, smørrebrød, sandwich, rejecocktail, pommes frittes,
   Fish'n chips, fiskefilet, pølse, burger."*

   Mikkels forbehold, og det er det vigtige: *"formulér det som
   muligheder, der kan fås eller tilpasses — ikke som om alle
   nævnte retter opfylder alle tre kosttyper."*

   ⚠️ HAN HAR RET, OG FORSKELLEN ER IKKE SPROGLIG. En rejecocktail
   er ikke vegansk, og fish'n'chips er ikke glutenfrit, fordi det
   står under en overskrift. Et punkt, der læses som en
   erklæring, sender en gæst med cøliaki eller en vegansk gæst
   hen til en ret, køkkenet ikke kan levere — og dét opdages ved
   bordet, ikke her.

   Punktet siger derfor, hvad vi KAN tale om, og at svaret
   afhænger af retten og af dagen. Alle tolv retter er slået op i
   produktionen 1/10 og findes.

   ⚠️ OG DET STÅR UDEN FOR KAPITLERNE. Kapitlerne spejler de
   trykte kort 1:1 (se js/skal/menukort-kort.js); et kapitel, der
   ikke er på papiret, ville brække det løfte. Punktet er et
   panel på siden, som "Skal vi lave det til et selskab?" lige
   under.
   ============================================================ */
test.describe('Kostpunktet på menukortet', () => {

  async function åbnKort(page) {
    await åbnSkal(page, '/m-menukort.html', { ur: FREDAG, data: grunddata() });
    await page.waitForSelector('#mk-kat');
  }

  test('punktet står på siden med alle tre kosttyper', async ({ page }) => {
    await åbnKort(page);
    const k = page.locator('#kost');
    await expect(k).toHaveCount(1);
    await k.scrollIntoViewIfNeeded();
    await expect(k).toBeVisible();
    await expect(k).toContainText('Vegansk');
    await expect(k).toContainText('Vegetar');
    await expect(k).toContainText('Glutenfrit');
  });

  test('retterne, chefen nævnte, står der', async ({ page }) => {
    await åbnKort(page);
    const t = await page.locator('#kost').innerText();
    for (const ret of ['salat', 'hvidløgsbrød', 'pastasalat', 'kartoffel',
      'smørrebrød', 'sandwich', 'rejecocktail', 'pommes frites',
      'fish', 'fiskefilet', 'pølse', 'burger']) {
      expect(t.toLowerCase(), `"${ret}" mangler i punktet`).toContain(ret);
    }
  });

  /* ⚠️ MODSTYKKET, OG DET ER HELE POINTEN. Punktet må ikke kunne
     læses som "alt det her ER vegansk og glutenfrit". Prøven
     fælder de ord, der ville gøre det til en erklæring. */
  test('det er formuleret som en mulighed, ikke som en erklæring', async ({ page }) => {
    await åbnKort(page);
    const t = (await page.locator('#kost').innerText()).toLowerCase();
    /* Der SKAL stå, at man spørger — og at det afhænger. */
    expect(t, 'punktet beder ikke gæsten spørge').toMatch(/spørg|sig til/);
    /* Og der må IKKE stå noget, der lyder som en garanti. */
    for (const ord of ['alle retter er', 'alt er vegansk', 'alt er glutenfrit',
      'garanti', 'altid glutenfri', 'altid vegansk']) {
      expect(t, `punktet lover "${ord}"`).not.toContain(ord);
    }
    /* ⚠️ OG INGEN RET MÅ STÅ MED EN KOSTTYPE KLISTRET TIL SIG:
       "fish'n'chips (glutenfri)" er den påstand, hele noten
       handler om. */
    expect(t, 'en ret står med en kosttype som et løfte')
      .not.toMatch(/(fish|rejecocktail|pølse|burger)[^.]{0,20}(vegansk|glutenfri)/);
  });
});

/* ============================================================
   OG MENUKORTETS UGEPLAN SIGER DET SAMME  (1/10)
   ------------------------------------------------------------
   Forsiden lærte at sige "hele ugen", da Mikkel spurgte til de
   syv ens kort. MÅLT bagefter mod det levende kort: på
   MENUKORTET stod navnet stadig NI gange — "I dag" plus syv
   dage. Siden havde lært det ét sted og ikke det andet.

   ⚠️ REGLEN BOR I Butik.sammeRetHeleUgen, ikke i hver tegner.
   Jeg skrev den først kun i js/skal/forside.js — og det er den
   samme fejl som isbyggerens to laegIs dagen før: en kopi er en
   kommende fejl, også når det er mig, der laver kopien.
   ============================================================ */
test.describe('Menukortets ugeplan slår ens dage sammen', () => {
  const ret = (dato, navn) => ({
    id: dato.replace(/-/g, ''), lokation_id: 'mosede', dato,
    navn, beskrivelse: 'Med blandet salat.', pris: 55,
    antal_tilbage: null, udsolgt: false, aktiv: true, sortering: 1,
  });
  const UGE = ['2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10',
    '2026-08-11', '2026-08-12', '2026-08-13'];

  test('syv ens dage bliver til én række', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { ur: FREDAG,
      data: grunddata({ dagens_retter: UGE.map((d) => ret(d, 'Bagt krydderet kartoffel')) }) });
    await page.waitForSelector('#mk-uge');
    const r = page.locator('#mk-uge .mk-dag');
    const n = await r.count();
    expect(n, `ugeplanen står med ${n} rækker — det er den samme ret syv gange`).toBe(1);
    await expect(r.first()).toContainText(/hele ugen/i);
    await expect(r.first()).toContainText('Bagt krydderet kartoffel');
  });

  /* MODSTYKKET: én anden dag, og ugen står dag for dag igen. */
  test('én anden dag, og rækkerne kommer tilbage', async ({ page }) => {
    const dage = UGE.map((d) => ret(d, 'Bagt krydderet kartoffel'));
    dage[2].navn = 'Stegt flæsk';
    await åbnSkal(page, '/m-menukort.html', { ur: FREDAG,
      data: grunddata({ dagens_retter: dage }) });
    await page.waitForSelector('#mk-uge');
    expect(await page.locator('#mk-uge .mk-dag').count()).toBeGreaterThan(1);
    await expect(page.locator('#mk-uge')).toContainText('Stegt flæsk');
  });
});

/* ============================================================
   CHEFENS RETTELSER 7/10 PÅ KORTET
   ------------------------------------------------------------
   Chefens besked pr. afsnit, med Mikkels "gå videre med det, der
   kan rettes nu". Dataene herunder er databasen, som
   supabase/chefens-rettelser-7-10.sql efterlader den — navnene
   er filens. Det, prøven måler, er HVOR varerne står, og det
   kommer fra chefens egne ord:
     · "Rejemad & Tartarmad Fjern Kun Smørrebrød" og "Fjern Egen pris"
     · "Tartar skal IKKE bestilles dagen før"
     · "Fiskefilet med Rejer og Mayo +10,-" (65 — resten 55)
     · Lumumba og Irish coffee under "Varmt & Ekstra"
     · RTD under både "Kolde drikke" og "Bar"
     · Dagens frugtfad under både "Sødt" og "Slik & Snacks"
     · de tre sandwich under "Burgere"
   ============================================================ */
test.describe('Chefens rettelser 7/10 på kortet', () => {
  function vare(id, kat, navn, pris, ekstra) {
    return Object.assign({ id, kategori_id: kat, navn, beskrivelse: null, pris,
      fremhaevet: false, udsolgt: false, sortering: id, aktiv: true }, ekstra || {});
  }
  function efterChefen() {
    const d = medRet();
    d.menu_kategorier = [
      { id: 10, afdeling: 'mad', navn: 'Andre retter', sortering: 2, aktiv: true },
      { id: 11, afdeling: 'mad', navn: 'Burgere', sortering: 3, aktiv: true },
      { id: 13, afdeling: 'mad', navn: 'Smørrebrød', sortering: 6, aktiv: true },
      { id: 15, afdeling: 'is', navn: 'Kugleis', sortering: 10, aktiv: true },
      { id: 16, afdeling: 'is', navn: 'Softice og vafler', sortering: 11, aktiv: true },
      { id: 17, afdeling: 'drikke', navn: 'Kaffe og varme drikke', sortering: 20, aktiv: true },
      { id: 20, afdeling: 'drikke', navn: 'Sodavand, juice og kakao', sortering: 23, aktiv: true },
      { id: 21, afdeling: 'drikke', navn: 'Snacks og slik', sortering: 24, aktiv: true },
      { id: 39, afdeling: 'mad', navn: 'Håndmadder', sortering: 7, aktiv: true },
      { id: 63, afdeling: 'mad', navn: 'Sandwich', sortering: 4, aktiv: true },
    ];
    d.menu_varer = [
      vare(1, 10, 'Hjemmelavet lun frikadelle', 25),
      vare(2, 11, 'Cheeseburger', 85),
      /* Chefens endelige afklaring 7/10: egne varer UNDER BURGERE, 80/80/75 —
         ikke sandwich-varianter. */
      vare(3, 11, 'Frikadellesandwich', 80), vare(4, 11, 'Flæskestegssandwich', 80),
      vare(5, 11, 'Bøfsandwich', 75), vare(6, 63, 'Sandwich', 75),
      vare(10, 13, 'Hjemmelavet flæskesteg med surt', 55),
      vare(11, 13, 'Fiskefilet med rejer og mayo', 65),
      vare(12, 13, 'Leverpostej med surt', 55), vare(13, 13, 'Dyrlægens natmad', 55),
      vare(14, 13, 'Ostemad', 55),
      vare(15, 13, 'Rejemad', 95, { beskrivelse: 'Med mayo og citron — hel skive' }),
      vare(16, 13, 'Tartarmad', 95),
      vare(20, 39, 'Hjemmelavet flæskesteg med surt, håndmad', 27),
      vare(21, 39, 'Leverpostej med surt, håndmad', 27), vare(22, 39, 'Ostemad, håndmad', 27),
      vare(30, 15, '1 kugle', 35), vare(31, 15, 'Børnekop', 59),
      vare(40, 16, 'Hjemmelavet koldskål', 35), vare(41, 16, 'Dagens frugtfad', 45),
      vare(50, 17, 'Te', 25),
      vare(51, 17, 'Lumumba, lille 3 cl', 75, { beskrivelse: 'Varm eller kold', valg: ['Varm', 'Kold'] }),
      vare(52, 17, 'Lumumba, stor 6 cl', 145, { beskrivelse: 'Varm eller kold', valg: ['Varm', 'Kold'] }),
      vare(53, 17, 'Irish coffee, lille 3 cl', 75), vare(54, 17, 'Irish coffee, stor 6 cl', 145),
      vare(55, 17, 'Flødekager', 45), vare(56, 17, 'Småkagefad til 2 personer', 25),
      vare(60, 20, 'Isvand', 25),
      vare(61, 20, 'RTD, 1 stk. Breezer eller Smirnoff', 40),
      vare(62, 20, 'RTD, 3 stk. Breezer eller Smirnoff', 100),
      vare(63, 20, 'Drinks', 75),
      vare(70, 21, 'Slik, 1 stk.', 10), vare(71, 21, 'Slikpind', 8), vare(72, 21, '1 stk. frugt', 8),
      vare(73, 21, 'Hjemmelavet flæskesvær', 35),
    ];
    return d;
  }
  const afsnit = (page, kap, titel) => page.locator(`${kap} .mk-sek`,
    { has: page.locator('.mk-sek-navn', { hasText: new RegExp('^' + titel + '$', 'i') }) });
  const navne = (loc) => loc.locator('.mk-linje[data-vare]').evaluateAll(
    (l) => l.map((e) => e.getAttribute('data-vare')));

  test('rejemad og tartar står uden "Egen pris", "Kun smørrebrød" og "dagen før"', async ({ page }) => {
    await åbn(page, efterChefen());
    const mærker = await page.locator('#mk-kat .mk-boks-over').allTextContents();
    expect(mærker.map((m) => m.trim().toLowerCase()), 'chefen: "Fjern Egen pris" og "Fjern Kun Smørrebrød"')
      .not.toEqual(expect.arrayContaining(['egen pris']));
    expect(mærker.map((m) => m.trim().toLowerCase())).not.toEqual(expect.arrayContaining(['kun smørrebrød']));
    await expect(page.locator('#mk-kat'), 'chefen: "Tartar skal IKKE bestilles dagen før"')
      .not.toContainText(/dagen før/i);
    // Felterne står stadig — kun mærkaterne er væk
    for (const kap of ['#kapitel-smoerrebroed', '#kapitel-haandmadder']) {
      await expect(page.locator(`${kap} .mk-boks-titel`, { hasText: 'Rejemad' })).toHaveCount(1);
      await expect(page.locator(`${kap} .mk-boks-titel`, { hasText: 'Tartar' })).toHaveCount(1);
    }
  });

  test('fiskefilet med rejer står til 65 — og varianterne stadig uden pris', async ({ page }) => {
    await åbn(page, efterChefen());
    await expect(page.locator('#kapitel-smoerrebroed [data-vare="Fiskefilet med rejer og mayo"] .mk-pris'))
      .toHaveText('65,-');
    const varianter = afsnit(page, '#kapitel-smoerrebroed', 'Varianter');
    await expect(varianter.locator('.mk-linje[data-vare]')).not.toHaveCount(0);
    await expect(varianter.locator('.mk-pris'), 'én anden pris i listen viser ALLE priserne').toHaveCount(0);
  });

  test('Lumumba og Irish coffee står under Varmt & ekstra, ikke under Kage', async ({ page }) => {
    await åbn(page, efterChefen());
    const varmt = await navne(afsnit(page, '#kapitel-kaffe', 'Varmt & ekstra'));
    expect(varmt).toEqual(expect.arrayContaining(['Lumumba, lille 3 cl', 'Lumumba, stor 6 cl',
      'Irish coffee, lille 3 cl', 'Irish coffee, stor 6 cl']));
    const kage = await navne(afsnit(page, '#kapitel-kaffe', 'Kage'));
    expect(kage.filter((n) => /lumumba|irish/i.test(n))).toEqual([]);
    expect(kage).toEqual(expect.arrayContaining(['Flødekager', 'Småkagefad til 2 personer']));
  });

  test('RTD står under både Kolde drikke og Bar', async ({ page }) => {
    await åbn(page, efterChefen());
    const rtd = ['RTD, 1 stk. Breezer eller Smirnoff', 'RTD, 3 stk. Breezer eller Smirnoff'];
    expect(await navne(afsnit(page, '#kapitel-kaffe', 'Kolde drikke'))).toEqual(expect.arrayContaining(rtd));
    expect(await navne(afsnit(page, '#kapitel-bar', 'Bar'))).toEqual(expect.arrayContaining(rtd));
  });

  test('dagens frugtfad står under Sødt og under Slik & snacks — efter frugten', async ({ page }) => {
    await åbn(page, efterChefen());
    expect(await navne(afsnit(page, '#afsnit-is', 'Sødt'))).toContain('Dagens frugtfad');
    const slik = await navne(afsnit(page, '#kapitel-bar', 'Slik & snacks'));
    expect(slik.slice(-3)).toEqual(['1 stk. frugt', 'Dagens frugtfad', 'Hjemmelavet flæskesvær']);
  });

  test('de tre sandwich står under Burgere til chefens priser — og intet er faldet ud', async ({ page }) => {
    await åbn(page, efterChefen());
    const b = await navne(afsnit(page, '#kapitel-burgere', 'Burgere & sandwiches'));
    expect(b).toEqual(['Cheeseburger', 'Frikadellesandwich', 'Flæskestegssandwich', 'Bøfsandwich', 'Sandwich']);
    // Chefens priser 7/10: "Frikadellesandwich 80,- · Flæskestegssandwich 80,- · Bøfsandwich 75,-"
    for (const [n, p] of [['Frikadellesandwich', '80,-'], ['Flæskestegssandwich', '80,-'], ['Bøfsandwich', '75,-']])
      await expect(page.locator(`#kapitel-burgere [data-vare="${n}"] .mk-pris`)).toHaveText(p);
    expect(await navne(afsnit(page, '#afsnit-is', 'Is'))).toContain('Børnekop');
    await expect(page.locator('#kapitel-mere'), 'en vare, kortene ikke fandt plads til').toHaveCount(0);
  });
});

/* ============================================================
   KORT 1: MORGENMAD OG FROKOST — SOM KORREKTUREN 7/10
   ------------------------------------------------------------
   Mikkel: *"Jeg sender dig det nyeste danske kort 1. Brug det som
   facit og byg Frokost som korrekt afsnit på hjemmesiden."* — og
   chefen: *"Hvorfor er frokost, Smørrebrød, og håndmadder ikke som
   en bjælke under Morgenmad …"*.

   Rækkefølgen og priserne herunder er LÆST AF KORTET (korrektur-PNG
   7/10), ikke af koden: Smørrebrød og Håndmadder først som
   henvisninger, så rejemad, tartarmad, platte, rejecocktail, lun
   delle, frikadelle, de to toast og hvidløgsbrødet. Juleplatten står
   kun på hjemmesiden — lige efter platten.
   ============================================================ */
test.describe('Kort 1: Frokost som det trykte kort', () => {
  function kort1() {
    const d = medRet();
    let id = 500;
    const v = (kat, navn, pris, ekstra) => Object.assign({ id: ++id, kategori_id: kat, navn,
      beskrivelse: null, pris, fremhaevet: false, udsolgt: false, sortering: id, aktiv: true }, ekstra || {});
    d.menu_kategorier = [
      { id: 8, afdeling: 'mad', navn: 'Morgenmad', sortering: 12, aktiv: true },
      { id: 9, afdeling: 'mad', navn: 'Retter', sortering: 1, aktiv: true },
      { id: 10, afdeling: 'mad', navn: 'Andre retter', sortering: 2, aktiv: true },
      { id: 13, afdeling: 'mad', navn: 'Smørrebrød', sortering: 6, aktiv: true },
      { id: 39, afdeling: 'mad', navn: 'Håndmadder', sortering: 7, aktiv: true },
      { id: 27, afdeling: 'mad', navn: 'Platter', sortering: 9, aktiv: true },
    ];
    d.menu_varer = [
      v(8, 'Morgenkomplet', 99), v(8, 'Rundstykke med pålæg', 35),
      v(9, 'Stjerneskud', 105), v(9, 'Lun delle, steg eller leverpostej', 65,
        { beskrivelse: 'Med brød og surt', valg: ['Frikadelle', 'Steg', 'Leverpostej'] }),
      v(9, 'Pitabrød', 65),
      v(10, 'Gammeldags rejecocktail med brød og smør', 90), v(10, 'Hjemmelavet lun frikadelle', 25),
      v(10, 'Hjemmelavet toast, ost og skinke', 35), v(10, 'Hjemmelavet cowboytoast', 45),
      v(10, '1 stk. hjemmelavet hvidløgsbrød', 45, { beskrivelse: 'Med tomat & ost' }),
      v(10, 'Snackkurv', 85),
      v(13, 'Leverpostej med surt', 55), v(13, 'Ostemad', 55), v(13, 'Hvide sild', 55),
      v(13, 'Rejemad', 95), v(13, 'Tartarmad', 95),
      v(39, 'Leverpostej med surt, håndmad', 27), v(39, 'Ostemad, håndmad', 27), v(39, 'Hvide sild, håndmad', 27),
      /* ⚠️ 189 og ikke kortets 199 — Mikkels afklaring 7/10 er den seneste. */
      v(27, 'Platte', 189, { beskrivelse: 'Inkl. friskbagt brød og smør · skal bestilles' }),
      v(27, 'Juleplatte', 199, { beskrivelse: 'Inkl. friskbagt brød og smør' }),
      v(27, 'Brunchplatte til 2 personer', 349),
    ];
    return d;
  }
  const frokost = (page) => page.locator('#kapitel-grillen .mk-sek',
    { has: page.locator('.mk-sek-navn', { hasText: /^Frokost$/ }) });

  test('Frokost står i kortets rækkefølge med kortets priser', async ({ page }) => {
    await åbn(page, kort1());
    const linjer = await frokost(page).locator('.mk-linje').evaluateAll((l) => l.map((e) =>
      [(e.querySelector('h4') || {}).textContent, ((e.querySelector('.mk-pris') || {}).textContent || '').trim()]));
    expect(linjer).toEqual([
      ['Smørrebrød', '55,-'], ['Håndmadder', '27,-'], ['Rejemad', '95,-'], ['Tartarmad', '95,-'],
      ['Platte', '189,-'], ['Juleplatte', '199,-'], ['Brunchplatte til 2 personer', '349,-'],
      ['Gammeldags rejecocktail med brød og smør', '90,-'], ['Lun delle, steg eller leverpostej', '65,-'],
      ['Hjemmelavet lun frikadelle', '25,-'], ['Hjemmelavet toast, ost og skinke', '35,-'],
      ['Hjemmelavet cowboytoast', '45,-'], ['1 stk. hjemmelavet hvidløgsbrød', '45,-'],
    ]);
    await expect(frokost(page).locator('[data-vare="Platte"] p'))
      .toHaveText('Inkl. friskbagt brød og smør · skal bestilles');
  });

  test('Frokost står i kapitel 1 ved siden af Morgenmad — og varerne kun ét sted', async ({ page }) => {
    await åbn(page, kort1());
    await expect(page.locator('#kapitel-grillen .mk-hoejre .mk-sek-navn').first()).toHaveText('Frokost');
    await expect(page.locator('#kapitel-grillen .mk-venstre .mk-sek-navn').first()).toHaveText('Morgenmad');
    for (const n of ['Hjemmelavet cowboytoast', '1 stk. hjemmelavet hvidløgsbrød', 'Lun delle, steg eller leverpostej'])
      await expect(page.locator(`#mk-kat [data-vare="${n}"]`), n + ' står to steder').toHaveCount(1);
    // Kort 1 har ingen fisk — Fisk & klassikere står på kort 2 (korrekturen 7/10)
    await expect(page.locator('#kapitel-grillen [data-vare="Stjerneskud"]')).toHaveCount(0);
    await expect(page.locator('#kapitel-burgere [data-vare="Stjerneskud"]')).toHaveCount(1);
    await expect(page.locator('#kapitel-mere')).toHaveCount(0);
  });

  test('kortets egne tekster: indledningen og morgenbrødsboksen', async ({ page }) => {
    await åbn(page, kort1());
    await expect(page.locator('#kapitel-grillen .mk-kh-tekst'))
      .toHaveText('Morgenmad og frokost – smørrebrød, håndmadder og klassikere hele dagen.');
    await expect(page.locator('#kapitel-grillen .mk-boks-tekst').first())
      .toHaveText('Morgenbrød – spørg efter en bestillingsliste.');
  });
});

/* ============================================================
   KORT 2: FISK & KLASSIKERE ØVERST  (7/10)
   ------------------------------------------------------------
   Mikkel: *"Brug [kort 2] som facit for, hvor 'Fisk & klassikere'
   skal ligge på hjemmesidens menukort."* Korrekturen af kort 2 har
   Fisk & klassikere øverst til venstre med Stjerneskud, Fish'n'chips,
   Fiskefilet med pommes, 8 indbagte rejer, Pariserbøf, biksemaden og
   spejlægget — og clubsandwichen og "Dip eller dressing" under
   Burgere & sandwiches. Rækkefølgen herunder er LÆST AF KORTET.
   Navnene er hjemmesidens (Mikkel: biksemaden "med 1 spejlæg",
   "Ekstra spejlæg" urørt).
   ============================================================ */
test.describe('Kort 2: Fisk & klassikere som det trykte kort', () => {
  function kort2() {
    const d = medRet();
    let id = 700;
    const v = (kat, navn, pris, sortering) => ({ id: ++id, kategori_id: kat, navn, beskrivelse: null, pris,
      fremhaevet: false, udsolgt: false, sortering: sortering || id, aktiv: true });
    d.menu_kategorier = [
      { id: 9, afdeling: 'mad', navn: 'Retter', sortering: 9, aktiv: true },
      { id: 10, afdeling: 'mad', navn: 'Andre retter', sortering: 3, aktiv: true },
      { id: 11, afdeling: 'mad', navn: 'Burgere', sortering: 6, aktiv: true },
      { id: 63, afdeling: 'mad', navn: 'Sandwich', sortering: 5, aktiv: true },
    ];
    d.menu_varer = [
      // Databasens egen orden (sortering) — IKKE kortets
      v(9, 'Stjerneskud', 105, 9), v(9, 'Fish’n’chips', 105, 10), v(9, 'Fiskefilet med pommes', 95, 11),
      v(9, 'Pariserbøf', 105, 12), v(9, 'Clubsandwich', 105, 60),
      v(10, 'Pølsemix med pommes', 90, 1), v(10, 'Hjemmelavet biksemad med 1 spejlæg', 85, 7),
      v(10, '8 indbagte rejer med pommes', 95, 12), v(10, 'Dip eller dressing', 10, 20),
      v(10, 'Ekstra kød m.m.', 10, 21), v(10, 'Ekstra spejlæg', 10, 22),
      v(11, 'Kyllingeburger', 80, 3), v(11, 'Cheeseburger', 85, 10),
      v(11, 'Frikadellesandwich', 80, 13),
      v(63, 'Sandwich', 75, 4),
    ];
    return d;
  }
  const afsnit = (page, kap, titel) => page.locator(`${kap} .mk-sek`,
    { has: page.locator('.mk-sek-navn', { hasText: new RegExp('^' + titel + '$', 'i') }) });
  const navne = (loc) => loc.locator('.mk-linje[data-vare]').evaluateAll(
    (l) => l.map((e) => e.getAttribute('data-vare')));

  test('Fisk & klassikere står øverst på kort 2 i kortets rækkefølge', async ({ page }) => {
    await åbn(page, kort2());
    await expect(page.locator('#kapitel-burgere .mk-venstre .mk-sek-navn').first()).toHaveText('Fisk & klassikere');
    expect(await navne(afsnit(page, '#kapitel-burgere', 'Fisk & klassikere'))).toEqual([
      'Stjerneskud', 'Fish’n’chips', 'Fiskefilet med pommes', '8 indbagte rejer med pommes',
      'Pariserbøf', 'Hjemmelavet biksemad med 1 spejlæg', 'Ekstra spejlæg']);
    await expect(page.locator('#kapitel-grillen .mk-sek-navn', { hasText: /Fisk|Ekstra/ })).toHaveCount(0);
  });

  test('clubsandwichen og dip\'en står under Burgere & sandwiches — og intet er faldet ud', async ({ page }) => {
    await åbn(page, kort2());
    const b = await navne(afsnit(page, '#kapitel-burgere', 'Burgere & sandwiches'));
    expect(b).toEqual(['Kyllingeburger', 'Cheeseburger', 'Clubsandwich', 'Frikadellesandwich',
      'Sandwich', 'Dip eller dressing']);
    expect(await navne(afsnit(page, '#kapitel-burgere', 'Andre retter'))).toContain('Ekstra kød m.m.');
    await expect(page.locator('#kapitel-mere')).toHaveCount(0);
  });
});

/* ============================================================
   ET TILBUD MED EN SLUTDATO FORSVINDER OGSÅ FRA MENUKORTET  (7/10)
   ------------------------------------------------------------
   MÅLT på den udgivne side 7/10: "Pølsemix med pommes, fredagsbar
   55,- · Tilbud i fredagsbaren den 2. oktober — kun denne aften"
   stod stadig på menukortet fem dage efter. Varen har vis_fra og
   vis_til = 2/10, og bestillingen skjulte den (Butik.vareIVindue,
   1/10) — men menukortet spurgte aldrig. Datoerne herunder er
   fiksturets fredag 7/8; vinduet er ugen før.
   ============================================================ */
test.describe('Varens datovindue gælder også menukortet', () => {
  test('et udløbet tilbud står ikke på kortet — et aktuelt gør', async ({ page }) => {
    const d = medRet();
    d.menu_varer.push(
      { id: 901, kategori_id: 9, navn: 'Fadøl, fredagsbar', beskrivelse: 'Kun fredag i sidste uge.', pris: 20,
        fremhaevet: false, udsolgt: false, sortering: 2, aktiv: true, vis_fra: '2026-07-31', vis_til: '2026-07-31' },
      { id: 902, kategori_id: 9, navn: 'Fadøl, i dag', beskrivelse: null, pris: 25,
        fremhaevet: false, udsolgt: false, sortering: 3, aktiv: true, vis_fra: '2026-08-07', vis_til: '2026-08-07' });
    await åbn(page, d);
    await page.waitForSelector('#mk-kat .mk-kapitel');
    await expect(page.locator('#mk-kat [data-vare="Fadøl, fredagsbar"]'), 'det udløbne tilbud står stadig').toHaveCount(0);
    await expect(page.locator('#mk-kat [data-vare="Fadøl, i dag"]')).toHaveCount(1);
  });
});
