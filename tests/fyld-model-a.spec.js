/* MODEL A: fyldet er varen.

   Aftalt med ejeren august 2026. Før valgte gæsten et ANTAL
   stykker ét sted og krydsede fyld af i en løsrevet liste — "8
   stykker + 12 slags fyld" fortæller ikke køkkenet, hvad der skal
   smøres. Nu tælles der pr. fyld: 2 × rejemad, 3 × leverpostej.

   Filen måler tre ting, og den første er den vigtigste:

   1) SKELLET GÅR PÅ KATEGORIEN, IKKE PÅ PRISEN. Så længe skellet
      var prisen, ville den dag, fyldet fik priser, forvandle alle
      29 fyld til stykker — og forsiden ville love 34 slags
      smørrebrød. Prøven herunder giver fyldet priser og tjekker,
      at tallene står stille.

   2) Fyld MED pris kan bestilles og lander i bestillingens linjer.

   3) Fyld UDEN pris kan stadig kun ØNSKES. Det er ikke en
      overgangsfase, det er reglen: kan vi prissætte det, kan det
      bestilles — kan vi ikke, kan det ønskes. Siden skal virke
      både før og efter, ejeren har givet tallene. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

/* BESTILLINGSSIDEN FIK SPIIS' FORM (23/8), og det ændrede to ting
   for prøverne her:

   1) Dagen er en <select> med den første mulige dag valgt fra
      start. Piller-rækken #bestil-dage er væk, og der er derfor
      ikke noget at klikke på — den valgte dag er allerede rigtig.
   2) Send åbner et sidste kig, og kiggets egen knap sender. Uden
      det andet klik venter prøven på en kvittering, der aldrig
      kommer. */
async function sendMedKig(page) {
  await page.locator('#bestil-send').click();
  await expect(page.locator('#bestil-kig')).toBeVisible();
  await page.locator('#kig-send').click();
}

/* Grunddata har ét stykke (Flæskestegssandwich, 89 kr., kategori
   "Smørrebrød") og to fyld uden pris (kategori "Vælg fyld til
   smørrebrødet"). medPriser() giver fyldet priser — altså model A. */
function medPriser() {
  const d = grunddata();
  d.menu_varer = d.menu_varer.map((v) => (
    v.kategori_id === 12 ? { ...v, pris: v.id === 4 ? 38 : 45 } : v
  ));
  return d;
}

test.describe('Skellet går på kategorien', () => {

  test('fyld med pris bliver IKKE til stykker', async ({ page }) => {
    /* Den fælde, hele ombygningen stod og faldt med. Med det gamle
       pris-skel ville tallene her blive 3 stykker og 0 fyld. */
    await åbn(page, '/smoerrebroed-ud-af-huset/', { data: medPriser() });
    await page.waitForSelector('#smoer-tal:not([hidden])');

    await expect(page.locator('#smoer-tal-stykker')).toHaveText('1');
    await expect(page.locator('#smoer-tal-fyld')).toHaveText('2');
  });

  /* Med det gamle pris-skel ville fyldet med pris være talt som
     stykker, og kortet ville love 3 slags stykker og 0 slags fyld. */
  test('forsiden lover stadig det rigtige antal slags', async ({ page }) => {
    /* Tallet står nu i smørrebrødsrækken inde i dagens
       ret-panelet, og panelet findes kun, når køkkenet har skrevet
       en ret. */
    const d = medPriser();
    d.indstillinger = { ...d.indstillinger,
      dagens_ret: { navn: 'Stegt flæsk', beskrivelse: '', pris: 95 } };
    await åbn(page, '/index.html', { data: d });
    await expect(page.locator('#smoer-fyld'))
      .toHaveText('1 slags stykker · 2 slags fyld');
  });
});

test.describe('Fyldet er varen', () => {

  test('fyld med pris har tæller og kommer med i bestillingen', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    /* Fyldet ligger i sin egen gruppe. Den er lukket fra start —
       kun den første gruppe står åben — så testen åbner den, som
       et menneske gør. */
    const gruppe = page.locator('.vare-gruppe', { hasText: 'Kød og pålæg' });
    await gruppe.locator('.fold-hoved').click();

    const linje = gruppe.locator('.stk-linje', { hasText: 'Leverpostej' });
    await expect(linje).toContainText('38');
    await linje.getByRole('button', { name: /Én mere/ }).click();
    await linje.getByRole('button', { name: /Én mere/ }).click();

    await expect(page.locator('#bestil-sum-tekst')).toContainText('2 stykker');

    await page.locator('#bestil-navn').fill('Anna Vind');
    await page.locator('#bestil-telefon').fill('20304050');
    await sendMedKig(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const gemt = await gemteData(page);
    const b = gemt.bestillinger[0];
    const linjen = b.linjer.filter((l) => /Leverpostej/.test(l.navn))[0];
    expect(linjen, 'fyldet kom ikke med som en vare').toBeTruthy();
    expect(linjen.antal).toBe(2);
    expect(linjen.pris, 'prisen fulgte ikke med — så kan køkkenet ikke regne')
      .toBe(38);
  });

  test('grupperne er foldet: den første åben, resten lukket', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const grupper = page.locator('.vare-gruppe');
    await expect(grupper).toHaveCount(2);
    await expect(grupper.nth(0).locator('.fold-hoved'))
      .toHaveAttribute('aria-expanded', 'true');
    await expect(grupper.nth(1).locator('.fold-hoved'))
      .toHaveAttribute('aria-expanded', 'false');
  });

  test('grupperne står i fast rækkefølge, og resten sidst', async ({ page }) => {
    /* Første udkast lod grupperne komme i den rækkefølge, deres
       første vare tilfældigvis havde i sorteringen — og så stod
       "Andet godt" midt imellem de navngivne. Set på et
       skærmbillede, ikke i koden. */
    const d = grunddata();
    d.menu_varer = d.menu_varer.map((v) => (
      v.kategori_id === 12 ? { ...v, pris: 45 } : v
    ));
    // En vare, der ikke passer i nogen gruppe — den skal ligge sidst
    d.menu_varer.push({
      id: 30, kategori_id: 12, navn: 'Ristet løg og sennep', beskrivelse: null,
      pris: 12, fremhaevet: false, udsolgt: false, sortering: 0, aktiv: true,
    });
    await åbn(page, '/bestil/', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const navne = await page.locator('.vare-gruppe .fold-navn').allInnerTexts();
    expect(navne[0], 'stykkerne står ikke først').toBe('Smørrebrød');
    expect(navne[navne.length - 1], '"Andet godt" står ikke sidst').toBe('Andet godt');
  });

  test('en lukket gruppe viser, hvor meget der ligger i den', async ({ page }) => {
    /* Uden tallet ville gæstens egen kurv være skjult bag en
       lukket fold — og så tæller hun forfra. */
    await åbn(page, '/bestil/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const stykker = page.locator('.vare-gruppe').nth(0);
    await stykker.locator('.stk-linje').first()
      .getByRole('button', { name: /Én mere/ }).click();

    await expect(stykker.locator('.fold-note')).toHaveText('1 valgt');
  });
});

test.describe('Fyld uden pris kan ønskes, ikke købes', () => {

  test('uden priser står ønskefolden der som før', async ({ page }) => {
    /* Den udgivne side i dag: fyldet har ingen priser. Den skal
       virke uændret, til ejeren har givet tallene. */
    await åbn(page, '/bestil/');
    await page.waitForSelector('#bestil-stykker .stk-linje');

    await expect(page.locator('#bestil-fyld-trin')).toBeVisible();
    await page.locator('#fyld-knap').click();
    await expect(page.locator('#bestil-fyld .fyld-valg').first()).toBeVisible();

    // Og fyldet har ingen tæller: det kan ikke købes
    await expect(page.locator('.vare-gruppe', { hasText: 'Kød og pålæg' }))
      .toHaveCount(0);

    /* Listen er FOLDET, også med kun smørrebrødet. Det stod
       omvendt før: flad med én gruppe, foldet med flere. Kunden
       bad om spiis' form (23/8), og en liste, der skifter form
       efter antallet af grupper, er to formularer at teste og
       huske. Den første fold står åben, så gæsten møder ikke en
       side, hvor der ikke er noget at se. */
    await expect(page.locator('.vare-gruppe .fold-hoved').first())
      .toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#bestil-stykker .stk-linje').first()).toBeVisible();
  });

  test('med priser på alt forsvinder ønskefolden af sig selv', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await expect(page.locator('#bestil-fyld-trin')).toBeHidden();
  });
});

test.describe('Hvad kan bestilles ud af huset?', () => {

  /* Grunddata har en is-kategori og en ølkategori med priser.
     Ingen af dem må kunne bestilles, før personalet siger ja. */
  test('kun smørrebrødet kan bestilles fra start', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const tekst = await page.locator('#bestil-stykker').innerText();
    expect(tekst, 'isen kan bestilles, uden at nogen har sagt ja')
      .not.toContain('Softice');
    expect(tekst, 'øllen kan bestilles, uden at nogen har sagt ja')
      .not.toContain('Fadøl');
  });

  test('et flueben i admin åbner en kategori — og lukker den igen', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    // Smørrebrødet kan altid: fluebenet er sat og kan ikke pilles af
    const smør = page.locator('#bestilbar-1');
    await expect(smør).toBeChecked();
    await expect(smør).toBeDisabled();

    // Isen slås til
    await page.locator('#bestilbar-6').check();
    await expect(page.locator('#kvittering')).toContainText('kan nu bestilles');

    const gemt = await gemteData(page);
    expect(gemt.indstillinger.bestilbare_kategorier).toContain(6);
  });

  /* CHIP-RÆKKEN ER BLEVET TIL FOLDE I LISTEN.

     Her stod tre prøver på en vandret række chips over listen —
     "hvad skal det være?" — der filtrerede udvalget. Kunden bad om
     spiis' form (23/8), og dér står ALLE kategorier som folde i én
     liste. To måder at vise det samme udvalg på er én for meget.

     Påstanden er den samme som før, men målt på den nye form:
     hver åbnet kategori får sit eget navn i listen, det er
     ejerens EGET navn fra menukortet, og smørrebrødet står
     først. */
  test('en åbnet kategori får sin egen fold, og smørrebrødet står først',
    async ({ page }) => {
      const d = medPriser();
      d.indstillinger.bestilbare_kategorier = [6];
      await åbn(page, '/bestil/', { data: d });
      await page.waitForSelector('#bestil-stykker .stk-linje');

      // Ingen chips over listen længere
      await expect(page.locator('#bestil-slags .slags-knap')).toHaveCount(0);

      const navne = await page.locator('#bestil-stykker .fold-navn').allInnerTexts();
      expect(navne[0]).toContain('Smørrebrød');
      expect(navne.join(' · ')).toContain('Softice og vafler');
    });

  /* KURVEN ER DET, DER GJORDE FILTERET FARLIGT: en chip kunne
     gemme to bestilte burgere bag et tal, gæsten skulle huske at
     kigge på. Med folder er intet skiftet ud — det, der er valgt,
     står i sin egen fold, og folden viser antallet på sit hoved,
     også når den er lukket. */
  test('en anden kategori kan foldes ud, og kurven bliver', async ({ page }) => {
    const d = medPriser();
    d.indstillinger.bestilbare_kategorier = [6];
    await åbn(page, '/bestil/', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    // Læg det første stykke smørrebrød i kurven
    const stykke = page.locator('#bestil-stykker .stk-linje').first();
    /* Navnet LÆSES af listen og skrives ikke i prøven: står der et
       fast varenavn her, går prøven i stykker den dag, grunddata
       får et andet menukort — og fejlen ligner et brud på reglen,
       den måler. */
    const navn = (await stykke.locator('.navn').first().innerText()).trim();
    await stykke.locator('button', { hasText: '+' }).click();

    const isen = page.locator('.vare-gruppe', { hasText: 'Softice og vafler' });
    await isen.locator('.fold-hoved').click();
    await expect(isen.locator('.stk-linje', { hasText: 'Softice' })).toBeVisible();

    /* Smørrebrødet er der STADIG — ikke skiftet ud — og folden
       siger, hvad der ligger i den. */
    await expect(page.locator('#bestil-stykker .stk-linje', { hasText: navn }))
      .toHaveCount(1);
    await expect(page.locator('.vare-gruppe', { hasText: 'Smørrebrød' })
      .locator('.fold-note').first()).toContainText('1');
  });

  /* ÉN GRUPPE ER OGSÅ EN FOLD. Første udgave lod listen stå flad,
     når der kun var smørrebrødet, og foldede den, når der var
     mere — to formularer at teste og huske. Formen skifter ikke
     efter, hvor meget ejeren har åbnet for. */
  test('listen er foldet, også når kun smørrebrødet kan bestilles', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await expect(page.locator('#bestil-slags .slags-knap')).toHaveCount(0);
    expect(await page.locator('.vare-gruppe').count(),
      'listen står flad — formen skifter med antallet af grupper')
      .toBeGreaterThan(0);
  });
});

test.describe('Spis her eller tag med', () => {

  /* Forskellen er ikke kosmetisk: den ene skal pakkes i en pose,
     den anden skal stå på et bord med bestik.

     Valget er TIL som standard — forretningen skal kunne begge
     dele. Fluebenet slår det FRA, og begge retninger måles: en
     standard, der kun er prøvet den ene vej, er en standard,
     ingen kan komme ud af igen. */
  test('slået fra spørger formularen ikke', async ({ page }) => {
    const d = medPriser();
    d.indstillinger.spis_her = false;
    await åbn(page, '/bestil/', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await page.locator('#bestil-stykker .stk-linje').first()
      .getByRole('button', { name: /Én mere/ }).click();

    await expect(page.locator('#bestil-hvordan-trin')).toBeHidden();
  });

  test('gæsten kan vælge uden at nogen har rørt en indstilling', async ({ page }) => {
    /* Ingen spis_her i indstillinger — altså standarden. */
    await åbn(page, '/bestil/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await page.locator('#bestil-stykker .stk-linje').first()
      .getByRole('button', { name: /Én mere/ }).click();

    await expect(page.locator('#bestil-hvordan-trin')).toBeVisible();
  });

  test('valget følger med bestillingen', async ({ page }) => {
    const d = medPriser();
    await åbn(page, '/bestil/', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await page.locator('#bestil-stykker .stk-linje').first()
      .getByRole('button', { name: /Én mere/ }).click();

    const trin = page.locator('#bestil-hvordan-trin');
    await expect(trin).toBeVisible();
    await trin.locator('.type-knap', { hasText: 'Spis her' }).click();

    await page.locator('#bestil-navn').fill('Anna Vind');
    await page.locator('#bestil-telefon').fill('20304050');
    await sendMedKig(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const gemt = await gemteData(page);
    expect(gemt.bestillinger[0].hvordan).toBe('spis_her');
  });

  test('uden et valg er bestillingen afhentning', async ({ page }) => {
    /* Standarden er den form, siden har kunnet altid. En
       bestilling uden svar må aldrig blive tom — så ved køkkenet
       ikke, om der skal pakkes. */
    await åbn(page, '/bestil/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await page.locator('#bestil-stykker .stk-linje').first()
      .getByRole('button', { name: /Én mere/ }).click();

    await page.locator('#bestil-navn').fill('Ole Berg');
    await page.locator('#bestil-telefon').fill('30405060');
    await sendMedKig(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const gemt = await gemteData(page);
    expect(gemt.bestillinger[0].hvordan).toBe('afhentning');
  });

  test('køkkenet kan SE det på kortet', async ({ page }) => {
    const d = grunddata();
    d.bestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'SM260807-SPIS1',
      navn: 'Anna Vind', telefon: '20304050', hent_dato: '2026-08-07',
      hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 45 }],
      fyld: [], antal: 2, status: 'ny', intern_note: null,
      hvordan: 'spis_her', oprettet: '2026-08-07T10:30:00Z',
    }];
    await åbnAdmin(page, { data: d });
    await page.locator('[data-panel="p-bestillinger"]').click();

    const kort = page.locator('#bestillinger-liste .bestil-kort').first();
    await expect(kort).toContainText('Spis her');
  });

  test('afhentning får INTET mærke — ellers betyder mærket ingenting', async ({ page }) => {
    const d = grunddata();
    d.bestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'SM260807-TAG01',
      navn: 'Ole Berg', telefon: '30405060', hent_dato: '2026-08-07',
      hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 1, pris: 45 }],
      fyld: [], antal: 1, status: 'ny', intern_note: null,
      hvordan: 'afhentning', oprettet: '2026-08-07T10:30:00Z',
    }];
    await åbnAdmin(page, { data: d });
    await page.locator('[data-panel="p-bestillinger"]').click();

    const kort = page.locator('#bestillinger-liste .bestil-kort').first();
    await expect(kort).not.toContainText('Spis her');
  });

  test('fluebenet står sat fra start og kan slå valget fra', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-bestillinger"]').click();

    // TIL som standard, uden at nogen har rørt noget
    await expect(page.locator('#spis-her')).toBeChecked();

    await page.locator('#spis-her').uncheck();
    await expect(page.locator('#kvittering')).toContainText('kan ikke længere');

    const gemt = await gemteData(page);
    expect(gemt.indstillinger.spis_her).toBe(false);
  });
});

test.describe('Ejerens tal skrives ét sted', () => {

  test('samme pris kan sættes på alle fyld på én gang', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    /* Linjen skal sige sandheden om, hvor mange der mangler —
       ellers tror personalet, at siden er i stykker. */
    await expect(page.locator('.samle-pris')).toContainText('2 af 2 mangler en pris');

    page.once('dialog', (d) => d.accept());
    await page.locator('#fyld-samlepris').fill('45');
    await page.locator('.samle-pris button').click();

    await expect(page.locator('.samle-pris')).toContainText('Alle 2 har en pris');

    const gemt = await gemteData(page);
    const fyld = gemt.menu_varer.filter((v) => v.kategori_id === 12);
    expect(fyld.every((v) => v.pris === 45), 'ikke alle fyld fik prisen').toBe(true);
  });

  test('et tal, der ikke er en pris, bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    await page.locator('#fyld-samlepris').fill('99999');
    await page.locator('.samle-pris button').click();
    await expect(page.locator('#fejl')).toContainText('mellem 0 og 10.000');

    const gemt = await gemteData(page);
    const fyld = gemt.menu_varer.filter((v) => v.kategori_id === 12);
    expect(fyld.every((v) => v.pris === null)).toBe(true);
  });
});
