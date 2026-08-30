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
const { åbn, åbnAdmin, grunddata, gemteData , aabnFold, visFane } = require('./hjaelp');

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

  /* ⚠️ MÅLT PÅ bestil/ NU (30/8). Prøven stod på
     /smoerrebroed-ud-af-huset/, og den adresse blev en vejviser,
     da de to udgaver af hjemmesiden blev lagt sammen —
     js/smoerrebroed.js med sin tæller (#smoer-tal) indlæses ikke
     af én eneste side længere.

     Reglen er urørt, og den er den vigtigste i filen: SKELLET GÅR
     PÅ KATEGORIEN, IKKE PÅ PRISEN. Fyldet får priser her, og
     tallene skal stå stille — med det gamle pris-skel ville de to
     fyld hoppe op i smørrebrødets gruppe, og siden ville love tre
     slags smørrebrød, hvor forretningen har ét. */
  test('fyld med pris bliver IKKE til stykker', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    /* ⚠️ FYLDETS GRUPPE HEDDER "Kød og pålæg" PÅ bestil/, ikke
       kategoriens fulde navn — den samme betegnelse, prøven
       "fyld med pris har tæller" bruger nedenfor. Målt, ikke
       gættet: to grupper, én med stykket og én med de to fyld. */
    const stykker = page.locator('.vare-gruppe', { hasText: 'Smørrebrød' });
    const fyld = page.locator('.vare-gruppe', { hasText: 'Kød og pålæg' });

    await expect(stykker.locator('.stk-linje'),
      'fyld med pris er hoppet op i smørrebrødets gruppe').toHaveCount(1);
    await expect(fyld.locator('.stk-linje'),
      'fyldet blev til stykker, da det fik en pris').toHaveCount(2);
  });

  /* Med det gamle pris-skel ville fyldet med pris være talt som
     stykker, og kortet ville love 3 slags stykker og 0 slags fyld. */
  test('forsiden lover stadig det rigtige antal slags', async ({ page }) => {
    test.skip(true, 'forsiden er skiftet ud (23/8) — genoprettes mod den nye forside i systemfasen, se tests-gamle/README.md');
    /* Tallene står nu i smørrebrødets EGET afsnit på forsiden.
       Kundens ord (23/8): smørrebrød ud af huset "er en af deres
       hoved ting og fortjener deres eget bestillings ting" — så
       det er ikke længere en række inde i et dagens ret-panel,
       og det står der, også når køkkenet ikke har skrevet en ret. */
    await åbn(page, '/index.html', { data: medPriser() });
    await page.waitForSelector('#smoer-forside-tal:not([hidden])');

    await expect(page.locator('#smoer-forside-stykker')).toHaveText('1');
    await expect(page.locator('#smoer-forside-fyld')).toHaveText('2');
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
     Ingen af dem må kunne bestilles, før personalet siger ja —
     og isen ikke engang så. */
  test('kun smørrebrødet kan bestilles fra start', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    /* textContent, ikke innerText: en lukket fold er skjult, og
       innerText ville springe præcis det over, prøven leder efter. */
    const tekst = await page.locator('#bestil-stykker').textContent();
    expect(tekst, 'isen kan bestilles, uden at nogen har sagt ja')
      .not.toContain('Softice');
    expect(tekst, 'øllen kan bestilles, uden at nogen har sagt ja')
      .not.toContain('Fadøl');
  });

  test('et flueben i admin åbner en kategori — og lukker den igen', async ({ page }) => {
    await åbnAdmin(page);
    await visFane(page, 'p-menu');

    // Smørrebrødet kan altid: fluebenet er sat og kan ikke pilles af
    const smør = page.locator('#bestilbar-1');
    await expect(smør).toBeChecked();
    await expect(smør).toBeDisabled();

    // Øllen slås til
    await page.locator('#bestilbar-9').check();
    await expect(page.locator('#kvittering')).toContainText('kan nu bestilles');

    const gemt = await gemteData(page);
    expect(gemt.indstillinger.bestilbare_kategorier).toContain(9);
  });

  test('isen har slet ikke et flueben at sætte', async ({ page }) => {
    /* Et flueben, der ikke gør noget, er værre end ingen: personalet
       sætter det og leder bagefter efter fejlen på gæstesiden.
       Kundens ord (23/8): isen "er altid til rådighed", den skal
       fremvises, ikke bestilles. */
    await åbnAdmin(page);
    await visFane(page, 'p-menu');
    await page.waitForSelector('#bestilbar-1');

    await expect(page.locator('#bestilbar-6')).toHaveCount(0);
    await expect(page.locator('.kan-bestilles-nej').first())
      .toContainText('bestilles ikke');
  });

  test('selv med fluebenet sat kommer isen ikke i listen', async ({ page }) => {
    test.skip(true, 'forsiden er skiftet ud (23/8) — genoprettes mod den nye forside i systemfasen, se tests-gamle/README.md');
    /* Bæltet og selerne: sætter en gammel indstilling — eller en
       hånd i databasen — is-kategorien på listen over bestilbare,
       skal gæstesiden stadig lade være. */
    const d = medPriser();
    // Øllen med, så afsnittet overhovedet står der at måle på
    d.indstillinger.bestilbare_kategorier = [6, 9];
    await åbn(page, '/index.html', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    expect(await page.locator('#bestil-stykker').textContent())
      .not.toContain('Softice');
    // …og øllen ER der, så prøven ikke består på en tom liste
    expect(await page.locator('#bestil-stykker').textContent()).toContain('Fadøl');
  });

  /* CHIP-RÆKKEN ER BLEVET TIL FOLDE I LISTEN.

     Her stod tre prøver på en vandret række chips over listen —
     "hvad skal det være?" — der filtrerede udvalget. Kunden bad om
     spiis' form (23/8), og dér står ALLE kategorier som folde i én
     liste. To måder at vise det samme udvalg på er én for meget.

     SMØRREBRØDET ER FLYTTET UD (23/8). Forsiden bestiller grill,
     café og dagens ret; smørrebrød ud af huset har sin egen side
     og sit eget afsnit. Derfor er påstanden delt i to: forsiden
     får ejerens åbnede kategorier og IKKE smørrebrødet, og
     bestillingssiden får smørrebrødet og IKKE resten. */
  test('en åbnet kategori får sin egen fold med ejerens eget navn',
    async ({ page }) => {
    test.skip(true, 'forsiden er skiftet ud (23/8) — genoprettes mod den nye forside i systemfasen, se tests-gamle/README.md');
      const d = medPriser();
      d.indstillinger.bestilbare_kategorier = [9];
      await åbn(page, '/index.html', { data: d });
      await page.waitForSelector('#bestil-stykker .stk-linje');

      // Ingen chips over listen længere
      await expect(page.locator('#bestil-slags .slags-knap')).toHaveCount(0);

      const navne = await page.locator('#bestil-stykker .fold-navn').allTextContents();
      expect(navne.join(' · '), 'ejerens eget kategorinavn mangler').toContain('Øl');
      /* Stykkerne er MED på forsiden (23/8) — det er FYLDET, der
         hører til byggeriet på bestil/. Se noten om uden-fyld i
         js/store.js. */
      expect(navne.join(' · '), 'stykkerne mangler i forsidens liste')
        .toContain('Smørrebrød');
      await expect(page.locator('#bestil-fyld-trin')).toBeHidden();
    });

  test('smørrebrødssiden har smørrebrødet og ikke resten', async ({ page }) => {
    const d = medPriser();
    d.indstillinger.bestilbare_kategorier = [9];
    await åbn(page, '/bestil/', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const navne = await page.locator('#bestil-stykker .fold-navn').allTextContents();
    expect(navne[0], 'stykkerne står ikke først').toContain('Smørrebrød');
    expect(navne.join(' · '), 'øllen er fulgt med over på smørrebrødssiden')
      .not.toContain('Øl');
  });

  /* KURVEN ER DET, DER GJORDE FILTERET FARLIGT: en chip kunne
     gemme to bestilte burgere bag et tal, gæsten skulle huske at
     kigge på. Med folder er intet skiftet ud — det, der er valgt,
     står i sin egen fold, og folden viser antallet på sit hoved,
     også når den er lukket. */
  test('en anden kategori kan foldes ud, og kurven bliver', async ({ page }) => {
    test.skip(true, 'forsiden er skiftet ud (23/8) — genoprettes mod den nye forside i systemfasen, se tests-gamle/README.md');
    const d = medPriser();
    d.indstillinger.bestilbare_kategorier = [9];
    d.indstillinger.dagens_ret = { navn: 'Stegt flæsk', beskrivelse: '', pris: 95 };
    /* Uden nullet er dagen i dag ikke valgbar — varslet er et døgn —
       og så står dagens ret ikke i listen at lægge i kurven. */
    d.indstillinger.bestilling_varsel_timer = 0;
    await åbn(page, '/index.html', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    // Læg det første — dagens ret — i kurven
    const første = page.locator('#bestil-stykker .stk-linje').first();
    /* Navnet LÆSES af listen og skrives ikke i prøven: står der et
       fast varenavn her, går prøven i stykker den dag, grunddata
       får et andet menukort — og fejlen ligner et brud på reglen,
       den måler. */
    const navn = (await første.locator('.navn').first().innerText()).trim();
    await første.getByRole('button', { name: /Én mere/ }).click();

    const øllen = page.locator('.vare-gruppe', { hasText: 'Øl' });
    await øllen.locator('.fold-hoved').click();
    await expect(øllen.locator('.stk-linje', { hasText: 'Fadøl' })).toBeVisible();

    /* Dagens ret er der STADIG — ikke skiftet ud — og folden
       siger, hvad der ligger i den. */
    await expect(page.locator('#bestil-stykker .stk-linje', { hasText: navn }))
      .toHaveCount(1);
    await expect(page.locator('.vare-gruppe', { hasText: 'Dagens ret' })
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

  /* DE TO PRØVER HERUNDER MÅLTE PÅ /bestil/. De er flyttet til
     forsiden, ikke slettet.

     Smørrebrød ud af huset spiser man ikke her, så siden spørger
     nu om hentning eller levering (kundens ord 23/8). Spis her er
     lugens valg, og det bor på forsiden. Se tests/levering.spec.js
     for smørrebrødssidens eget spørgsmål. */
  function forsidenMedPriser() {
    const d = medPriser();
    d.indstillinger = { ...d.indstillinger,
      bestilbare_kategorier: [9], bestilling_varsel_timer: 0 };
    return d;
  }

  test('gæsten kan vælge uden at nogen har rørt en indstilling', async ({ page }) => {
    test.skip(true, 'forsiden er skiftet ud (23/8) — genoprettes mod den nye forside i systemfasen, se tests-gamle/README.md');
    /* Ingen spis_her i indstillinger — altså standarden. */
    await åbn(page, '/index.html', { data: forsidenMedPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await page.locator('#bestil-stykker .stk-linje').first()
      .getByRole('button', { name: /Én mere/ }).click();

    await expect(page.locator('#bestil-hvordan-trin')).toBeVisible();
  });

  test('valget følger med bestillingen', async ({ page }) => {
    test.skip(true, 'forsiden er skiftet ud (23/8) — genoprettes mod den nye forside i systemfasen, se tests-gamle/README.md');
    await åbn(page, '/index.html', { data: forsidenMedPriser() });
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
    await visFane(page, 'p-bestillinger');

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
    await visFane(page, 'p-bestillinger');

    const kort = page.locator('#bestillinger-liste .bestil-kort').first();
    await expect(kort).not.toContainText('Spis her');
  });

  test('fluebenet står sat fra start og kan slå valget fra', async ({ page }) => {
    await åbnAdmin(page);
    await visFane(page, 'p-bestillinger');
    /* ⚠️ "Regler for bestilling" er foldet sammen siden 30/8
       (kundens ønske), så fluebenet skal åbnes frem — præcis som
       en finger skal. toBeChecked() virker på et skjult felt;
       uncheck() gør ikke. */
    await aabnFold(page, 'bestil-regler-fold');

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
    await visFane(page, 'p-menu');

    /* Linjen skal sige sandheden om, hvor mange der mangler —
       ellers tror personalet, at siden er i stykker. */
    await expect(page.locator('.samle-pris')).toContainText('2 af 2 mangler en pris');

    page.once('dialog', (d) => d.accept());
    await page.locator('#samlepris-12').fill('45');
    await page.locator('.samle-pris button').click();

    await expect(page.locator('.samle-pris')).toContainText('Alle 2 har en pris');

    const gemt = await gemteData(page);
    const fyld = gemt.menu_varer.filter((v) => v.kategori_id === 12);
    expect(fyld.every((v) => v.pris === 45), 'ikke alle fyld fik prisen').toBe(true);
  });

  test('et tal, der ikke er en pris, bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await visFane(page, 'p-menu');

    await page.locator('#samlepris-12').fill('99999');
    await page.locator('.samle-pris button').click();
    await expect(page.locator('#fejl')).toContainText('mellem 0 og 10.000');

    const gemt = await gemteData(page);
    const fyld = gemt.menu_varer.filter((v) => v.kategori_id === 12);
    expect(fyld.every((v) => v.pris === null)).toBe(true);
  });
});
