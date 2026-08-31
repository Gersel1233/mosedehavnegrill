/* Smørrebrødssidens kobling.

   Samme motor som forsiden — det er den samme bestilling, der
   bliver sendt — men to ting er anderledes med vilje: udvalget er
   KUN smørrebrød, og spørgsmålet er "hentes eller leveres" i
   stedet for "spis her eller tag med". Smørrebrød er pr.
   definition ud af huset. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';

function data() {
  const d = grunddata();
  d.indstillinger.bestilling_varsel_timer = 2;
  return d;
}

/* ============================================================
   EJERENS TRYKTE KORT: PRISEN SIDDER PÅ STØRRELSEN  (30/8)
   ------------------------------------------------------------
   Ét kort hedder SMØRREBRØD, ét hedder HÅNDMADDER, og de lister
   det SAMME fyld. En hel skive rugbrød koster 55, en håndmad 27
   — uanset hvad der ligger på. De tre andre rækker (rejemad,
   tartar, æbleflæsk) er FÆRDIGE retter med deres egen pris og
   deres eget fyld.
   ============================================================ */
function medStørrelser(ændringer) {
  const d = data();
  d.menu_kategorier = [
    { id: 13, afdeling: 'mad', navn: 'Smørrebrød', sortering: 6, aktiv: true },
    { id: 14, afdeling: 'mad', navn: 'Vælg fyld til smørrebrødet', sortering: 7, aktiv: true },
  ];
  const v = (id, kat, navn, pris, sort) => ({
    id, kategori_id: kat, navn, beskrivelse: null, pris,
    fremhaevet: false, udsolgt: false, sortering: sort, aktiv: true,
  });
  d.menu_varer = [
    v(1, 13, 'Håndmad', 27, 1),
    v(2, 13, 'Smørrebrød', 55, 2),
    v(3, 13, 'Rejemad med mayo og citron', 85, 3),
    v(20, 14, 'Leverpostej med baconsvøb', null, 1),
    v(21, 14, 'Dyrlægens natmad', null, 2),
  ];
  d.indstillinger.bestilbare_kategorier = [13, 14];
  return Object.assign(d, ændringer || {});
}

async function åbn(page, d) {
  await åbnSkal(page, '/h-smorrebrod.html', { ur: FREDAG, data: d || data() });
}

test.describe('Smørrebrødssidens kobling', () => {
  test('stykkerne kommer fra kortet, og den døde tilbehørsrække er væk', async ({ page }) => {
    await åbn(page);

    await expect(page.locator('[data-vare="Flæskestegssandwich"]')).toHaveCount(1);
    // Designets fire opdigtede rækker
    await expect(page.locator('[data-liste]')).not.toContainText('Luksus-smørrebrød');
    /* "Tilbehør: øl, snaps og vand" havde intet bag sig: siden
       sælger kun smørrebrød, så rækken kunne ikke bestilles. */
    await expect(page.locator('[data-liste]')).not.toContainText('Tilbehør');
  });

  test('varslet står i teksten, ikke et fast tal', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_varsel_timer = 48;
    await åbn(page, d);

    // Designet skrev "inden for 2 dage" fast; tallet sættes i admin
    // Hinten hører til datofeltet, ikke manchetten under overskriften
    await expect(page.locator('#bestil .field:has(#sdato) + .hint'))
      .toContainText('mindst 2 dage');
  });

  test('levering tilbydes ikke, før forretningen har sagt ja', async ({ page }) => {
    /* Vi ved hverken hvad de kører ud med, hvor langt eller hvad
       det koster. En side, der tilbyder levering, fordi ingen har
       sagt nej, lover noget på forretningens vegne. */
    await åbn(page);

    await expect(page.locator('[data-toggles="#levfelt"]')).toBeHidden();
    await expect(page.locator('#levfelt')).toBeHidden();
    /* Og så er designets ubekræftede løfte om leveringspris og
       -zone ude af syne med det. Teksten står stadig i filen —
       den er designets, og den skal bekræftes af ejeren, før
       fluebenet slås til. */
    await expect(page.locator('#levfelt .hint')).toBeHidden();

    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    const gemt = await gemteData(page);
    expect(gemt.bestillinger[0].hvordan).toBe('afhentning');
    expect(gemt.bestillinger[0].leverings_adresse).toBe(null);
  });

  test('er levering slået til, kræves adressen — og den følger med', async ({ page }) => {
    const d = data();
    d.indstillinger.levering = true;
    await åbn(page, d);

    await expect(page.locator('[data-toggles="#levfelt"]')).toBeVisible();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    // Levering er valgt som standard i designet, så adressen mangler
    await expect(page.locator('#bestil #sumline')).toContainText('adressen');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);

    await page.locator('#sadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#bestil button.g.solid.blk').click();

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.hvordan).toBe('levering');
    expect(b.leverings_adresse).toBe('Havnevej 20I, 2670 Greve');
  });

  test('en levering bekræftes ALDRIG af sig selv', async ({ page }) => {
    /* Vi kan love, at maden bliver lavet. Vi kan ikke love, at den
       kan køres til en adresse, vi ikke kender. */
    const d = data();
    d.indstillinger.levering = true;
    d.indstillinger.auto_bekraeft = true;
    await åbn(page, d);

    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#sadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#bestil button.g.solid.blk').click();

    await expect(page.locator('#bestil .hint').first()).toContainText('ringer og bekræfter');
  });

  test('mindsteantallet håndhæves', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_min_stk = 10;
    await åbn(page, d);

    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    await expect(page.locator('#bestil #sumline')).toContainText('mindst bestilles 10 stk. smørrebrød');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);
  });

  test('skallen er urørt: felterne står i designets rækkefølge', async ({ page }) => {
    const d = data();
    d.indstillinger.levering = true;
    await åbn(page, d);

    /* ⚠️ KUN DE SYNLIGE (30/8). Størrelsesvælgeren "Hvad skal
       brødet være?" kom til samme dag, og den SKJULER SIG, når
       ejeren ikke har nogen størrelser på kortet — som her.
       Talte de skjulte med, ville prøven kræve en etiket, gæsten
       aldrig ser, og den ville ikke længere kunne fælde et felt,
       der glemte at skjule sig. Der er en prøve nedenfor for
       rækkefølgen MED størrelser. */
    const etiketter = await page.$$eval('#bestil .field label',
      (els) => els.filter((e) => e.offsetParent !== null || e.getClientRects().length)
        .map((e) => e.textContent.trim()));
    /* ⚠️ "Hvilket fyld?" ER TILFØJET, OG DET ER DEN ENESTE
       AFVIGELSE FRA DESIGNET PÅ SIDEN (30/8). Model A — hvert
       fyld er en vare — kunne ikke nås af nogen gæst, fordi
       bestil/ kun var linket fra en forældreløs menu.html.

       Feltet står lige FØR beskeden med vilje: designets egen
       pladsholder i beskedfeltet sagde "ønsker til fyld", så
       vælgeren står præcis dér, hvor gæsten ellers skulle have
       skrevet det i fri tekst. Resten af rækkefølgen er urørt —
       kommer der en etiket mere ind midt i listen, uden at nogen
       har bedt om det, falder prøven her. */
    expect(etiketter).toEqual(['Vælg jeres smørrebrød', 'Leveringsdag', 'Tidspunkt',
      'Levering eller afhentning?', 'Leveringsadresse', 'Navn', 'Telefonnummer',
      'Hvilket fyld? (valgfrit)', 'Besked (valgfrit)']);
  });

  /* ⚠️ OG MED STØRRELSER STÅR SPØRGSMÅLET FØRST.

     "Først basen altså brødet og derefter fyld" var kundens egne
     ord. Stod vælgeren under listen, ville gæsten tælle stykker
     op og BAGEFTER få at vide, at prisen afhænger af et valg,
     hun ikke har truffet — og de optalte linjer ville skifte
     pris under hånden. */
  test('med størrelser står brødvalget øverst — før listen', async ({ page }) => {
    const d = medStørrelser();
    d.indstillinger.levering = true;
    await åbn(page, d);

    const etiketter = await page.$$eval('#bestil .field label',
      (els) => els.filter((e) => e.offsetParent !== null || e.getClientRects().length)
        .map((e) => e.textContent.trim()));
    expect(etiketter[0]).toBe('Hvad skal brødet være?');
    expect(etiketter[1]).toBe('Vælg jeres smørrebrød');
    /* Fyldvælgeren er tilbagefaldet og skal være VÆK, når
       størrelsesmodellen kører: de samme 32 slags to steder ville
       være ét sted, hvor de koster noget, og ét, hvor de er
       ønsker. */
    expect(etiketter).not.toContain('Hvilket fyld? (valgfrit)');
  });
});

/* ============================================================
   FYLDVÆLGEREN BOR HER NU  (30/8)
   ------------------------------------------------------------
   Model A — hvert fyld er en vare med sin egen pris — har levet
   på bestil/ siden 20/8. MÅLT 30/8: bestil/ var kun linket fra
   menu.html, som selv var forældreløs. Ingen gæst kunne altså
   vælge fyld til sit smørrebrød, selv om ejeren har 29 slags i
   admin. Kundens beslutning: byg den ind i den nye side.
   ============================================================ */
test.describe('Fyldet kan vælges på smørrebrødssiden', () => {

  /* Fyld UDEN pris er ønsker (se model A i README): de kan vælges,
     men de lægges ikke til summen. Fyld MED pris er almindelige
     varer og står i listen ovenfor. */
  function medFyld() {
    const d = grunddata();
    const kat = (d.menu_kategorier || []).filter((k) => /fyld/i.test(k.navn))[0];
    return { d, kat };
  }

  test('de fyld, ejeren har uden pris, står som piller', async ({ page }) => {
    const { d } = medFyld();
    await åbnSkal(page, '/h-smorrebrod.html', { data: d });

    await expect(page.locator('#fyldfelt')).toBeVisible();
    const piller = page.locator('#fyldvalg button');
    expect(await piller.count(), 'ingen fyld at vælge').toBeGreaterThan(0);
  });

  /* ⚠️ DESIGNET EJER MARKERINGEN. havnegrillen.js binder sin egen
     lytter på hver [data-chips], og første udgave togglede .on
     OGSÅ — de to ophævede hinanden, så tælleren sagde "2 slags
     valgt", mens begge piller så uvalgte ud. Samme fælde som
     segmenterne. Prøven måler BEGGE halvdele. */
  test('en valgt pille ser valgt ud — og tælleren følger med', async ({ page }) => {
    const { d } = medFyld();
    await åbnSkal(page, '/h-smorrebrod.html', { data: d });

    const først = page.locator('#fyldvalg button').first();
    await først.click();
    await expect(først, 'markeringen fulgte ikke trykket').toHaveClass(/on/);
    await expect(page.locator('#fyldtal')).toContainText('1 slags valgt');

    // Og den kan slås fra igen.
    await først.click();
    await expect(først).not.toHaveClass(/on/);
    await expect(page.locator('#fyldtal')).toContainText('Vælg det fyld');
  });

  /* ⚠️ FYLDET LÆGGES IKKE TIL SUMMEN OG ER IKKE EN LINJE. Et ønske
     uden pris, der talte med, ville give gæsten et beløb, hun ikke
     skal betale — og køkkenet et stykke, ingen har bestilt. Det
     sendes i kolonnen fyld, som bestil/ har brugt siden 20/8. */
  test('fyldet følger med bestillingen som ønsker, ikke som varer', async ({ page }) => {
    const { d } = medFyld();
    await åbnSkal(page, '/h-smorrebrod.html', { data: d });

    await page.locator('#fyldvalg button').first().click();
    const navn = (await page.locator('#fyldvalg button').first().textContent()).trim();

    // Vælg et stykke, så der er noget at sende.
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.fyld, 'fyldet fulgte ikke med').toContain(navn);
    expect(b.linjer.map((l) => l.navn), 'fyldet blev sendt som en VARE')
      .not.toContain(navn);
  });

  /* Et afsnit uden noget at vise findes ikke — samme regel som
     resten af huset. Har ejeren sat pris på alle fyldene, er de
     varer i listen i stedet. */
  test('uden ønskefyld findes afsnittet ikke', async ({ page }) => {
    const d = grunddata();
    d.menu_varer = (d.menu_varer || []).map((v) => ({ ...v, pris: v.pris || 15 }));
    await åbnSkal(page, '/h-smorrebrod.html', { data: d });

    /* ⚠️ toBeHidden() ER OGSÅ SANDT FOR ET ELEMENT, DER IKKE
       FINDES. Første udgave af den her linje bestod derfor, også
       da hele fyldvælgeren var rullet væk — den målte ingenting.
       Derfor kræves det FØRST, at afsnittet er der, og DEREFTER
       at det er skjult. */
    await expect(page.locator('#fyldfelt')).toHaveCount(1);
    await expect(page.locator('#fyldfelt')).toBeHidden();
  });
});

/* ============================================================
   FØRST BRØDET, SÅ FYLDET  (30/8)
   ------------------------------------------------------------
   Kundens spørgsmål, da ejerens fem trykte kort kom: "smørbrød
   bestillingen — skal de først vælge basen altså brødet og
   derefter fyld eller hvordan?" Ja.

   Den dyre fejl, modellen er bygget for at undgå, er
   DOBBELTBETALING: lå både "Smørrebrød 55" og "Leverpostej 55" i
   den samme liste, kunne gæsten lægge begge i kurven og betale
   110 for ét stykke mad. Prøverne herunder måler netop det.
   ============================================================ */
test.describe('Størrelsen først, så fyldet', () => {

  test('brødet er to piller med hver sin pris', async ({ page }) => {
    await åbn(page, medStørrelser());

    await expect(page.locator('#stoerrelsefelt')).toBeVisible();
    const piller = page.locator('#stoerrelsevalg button');
    await expect(piller).toHaveCount(2);
    await expect(piller.nth(0)).toContainText('Håndmad');
    await expect(piller.nth(0)).toContainText('27');
    await expect(piller.nth(1)).toContainText('Smørrebrød');
    await expect(piller.nth(1)).toContainText('55');
  });

  /* ⚠️ STØRRELSEN MÅ ALDRIG OGSÅ STÅ SOM EN VARE I LISTEN.
     Gjorde den det, kunne gæsten lægge "Smørrebrød 55" (uden
     fyld) OG "Leverpostej 55" (varianten) i kurven og betale 110
     for ét stykke mad. De færdige retter — rejemad, tartar,
     æbleflæsk — har deres eget fyld og bliver stående. */
  test('brødet står ikke også som en vare, men de færdige retter gør', async ({ page }) => {
    await åbn(page, medStørrelser());

    await expect(page.locator('[data-vare="Smørrebrød"]')).toHaveCount(0);
    await expect(page.locator('[data-vare="Håndmad"]')).toHaveCount(0);
    await expect(page.locator('[data-vare="Rejemad med mayo og citron"]')).toHaveCount(1);
  });

  /* Fyldet findes ikke, før hun har svaret. Vælger siden den ene
     for hende, bestiller den, der ikke læser etiketten, en hel
     skive til 55, når hun troede, hun bad om en håndmad til 27. */
  test('fyldet kommer først frem, når brødet er valgt', async ({ page }) => {
    await åbn(page, medStørrelser());

    await expect(page.locator('[data-liste]')).not.toContainText('Leverpostej');
    await page.locator('#stoerrelsevalg button', { hasText: 'Smørrebrød' }).click();
    await expect(page.locator('[data-vare="Leverpostej med baconsvøb"]')).toBeVisible();
  });

  /* ⚠️ FYLDET KOSTER STØRRELSENS PRIS, IKKE SIN EGEN. De 32 slags
     står uden pris i menukortet — det er hele grunden til, at
     modellen findes. */
  test('fyldet får brødets pris — og den skifter med brødet', async ({ page }) => {
    await åbn(page, medStørrelser());

    await page.locator('#stoerrelsevalg button', { hasText: 'Smørrebrød' }).click();
    await expect(page.locator('[data-vare="Leverpostej med baconsvøb"] .tag'))
      .toContainText('55');

    await page.locator('#stoerrelsevalg button', { hasText: 'Håndmad' }).click();
    await expect(page.locator('[data-vare="Leverpostej med baconsvøb"][data-variant-af="Håndmad"] .tag'))
      .toContainText('27');
  });

  /* ⚠️ EN OPTALT STØRRELSE MÅ IKKE FORSVINDE FRA SKÆRMEN, NÅR
     GÆSTEN SKIFTER TIL DEN ANDEN.

     Første udgave viste kun den VALGTE størrelses fyld. To
     smørrebrød med leverpostej blev stående i kurven og i summen,
     men rækken var væk — så de kunne hverken ses eller tælles
     ned, og gæsten ville betale for mad, hun ikke kunne finde. */
  test('det, der allerede er talt op, bliver stående ved skift', async ({ page }) => {
    await åbn(page, medStørrelser());

    await page.locator('#stoerrelsevalg button', { hasText: 'Smørrebrød' }).click();
    await page.locator('[data-vare="Leverpostej med baconsvøb"] button[data-d="+"]').click();
    await page.locator('[data-vare="Leverpostej med baconsvøb"] button[data-d="+"]').click();

    await page.locator('#stoerrelsevalg button', { hasText: 'Håndmad' }).click();

    const gammel = page.locator('[data-variant-af="Smørrebrød"][data-vare="Leverpostej med baconsvøb"]');
    await expect(gammel, 'de to smørrebrød forsvandt fra skærmen').toHaveCount(1);
    await expect(gammel.locator('.step b')).toHaveText('2');
  });

  /* ⚠️ LINJENS NAVN ER STØRRELSEN, FYLDET ER EN VARIANT.

     Databasens pris-værn og udsolgt-værn slår begge op på NAVNET
     i menukortet. "Leverpostej med baconsvøb" står der uden en
     pris, så et sammensat navn ville få pris-værnet til at afvise
     hele bestillingen — eller, værre, tie på den. Køkkenet får
     varianten at se; værnene får kortets eget navn. */
  test('bestillingen sendes med brødets navn og fyldet som variant', async ({ page }) => {
    await åbn(page, medStørrelser());

    await page.locator('#stoerrelsevalg button', { hasText: 'Smørrebrød' }).click();
    await page.locator('[data-vare="Leverpostej med baconsvøb"] button[data-d="+"]').click();
    await page.locator('[data-vare="Leverpostej med baconsvøb"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.linjer).toHaveLength(1);
    expect(b.linjer[0].navn).toBe('Smørrebrød');
    expect(b.linjer[0].variant).toBe('Leverpostej med baconsvøb');
    expect(b.linjer[0].antal).toBe(2);
    expect(b.linjer[0].pris).toBe(55);
    /* 2 × 55 og ikke 2 × 110: fyldet lægges ikke oveni. Summen
       regnes af LINJERNE — der er ingen totalkolonne, og et tal
       ved siden af linjerne ville kunne skride fra dem. */
    const sum = b.linjer.reduce((n, l) => n + l.antal * l.pris, 0);
    expect(sum).toBe(110);
  });

  /* To størrelser af det samme fyld er to linjer til to priser —
     ikke én linje, hvor den ene tæller den anden ned. */
  test('to størrelser af samme fyld bliver til to linjer', async ({ page }) => {
    await åbn(page, medStørrelser());

    await page.locator('#stoerrelsevalg button', { hasText: 'Smørrebrød' }).click();
    await page.locator('[data-variant-af="Smørrebrød"][data-vare="Dyrlægens natmad"] button[data-d="+"]').click();
    await page.locator('#stoerrelsevalg button', { hasText: 'Håndmad' }).click();
    await page.locator('[data-variant-af="Håndmad"][data-vare="Dyrlægens natmad"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Bo Vind');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.linjer).toHaveLength(2);
    expect(b.linjer.map((l) => l.navn).sort()).toEqual(['Håndmad', 'Smørrebrød']);
    const sum = b.linjer.reduce((n, l) => n + l.antal * l.pris, 0);
    expect(sum).toBe(82);   // 55 + 27
  });

  /* ⚠️ UDEN EN STØRRELSE FALDER SIDEN TILBAGE TIL DEN GAMLE
     MODEL — hel og tavs. Ejeren skal ikke kunne lukke sin egen
     bestillingsside ved at omdøbe en vare i admin: så ville
     varianterne stå uden en pris bag sig, og gæsten kunne
     bestille 32 slags mad, ingen kender prisen på. */
  test('uden en størrelse sælges stykkerne enkeltvis som før', async ({ page }) => {
    const d = medStørrelser();
    // Ejeren har omdøbt begge størrelser til noget, reglen ikke kender.
    d.menu_varer[0].navn = 'Lille anretning';
    d.menu_varer[1].navn = 'Stor anretning';
    await åbn(page, d);

    await expect(page.locator('#stoerrelsefelt')).toBeHidden();
    // De to står nu som almindelige varer, man kan bestille.
    await expect(page.locator('[data-vare="Lille anretning"]')).toHaveCount(1);
    await expect(page.locator('[data-vare="Stor anretning"]')).toHaveCount(1);
    // Og fyldet er ønsker igen, ikke varianter.
    await expect(page.locator('#fyldfelt')).toBeVisible();
  });

  /* Ejeren kan overtage skellet i admin uden en SQL-fil:
     indstillinger er nøgle/værdi. Reglen i koden er reserven. */
  test('ejeren kan selv sige, hvad der er en størrelse', async ({ page }) => {
    const d = medStørrelser();
    d.indstillinger.smoer_stoerrelser = ['Håndmad'];
    await åbn(page, d);

    const piller = page.locator('#stoerrelsevalg button');
    await expect(piller).toHaveCount(1);
    await expect(piller.first()).toContainText('Håndmad');
    // Og så er "Smørrebrød" en vare, man kan bestille som den er.
    await expect(page.locator('[data-vare="Smørrebrød"]')).toHaveCount(1);
  });
});

/* ⚠️ VARSLET SKRIVES AF REGLEN, IKKE AF DESIGNET  (30/8).
   MÅLT på den udgivne side: heroens manchet og faktakortet sagde
   begge "Bestil senest 2 dage før", mens formularen holdt ejerens
   eget tal fra admin — så gæsten læste to dage, valgte i morgen,
   og fik lov. To udgaver af den samme regel, og den, gæsten møder
   først, er den, der ikke gælder. */
test.describe('Varslet står ét sted', () => {

  test('faktakortet og manchetten siger ejerens tal', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_varsel_timer = 72;
    await åbn(page, d);

    const tekster = await page.locator('[data-varsel]').allTextContents();
    expect(tekster.length, 'ingen [data-varsel] på siden').toBeGreaterThan(1);
    tekster.forEach((t) => expect(t).toContain('3 dage'));
    // Og designets faste "2 dage" må ikke stå tilbage nogen steder.
    await expect(page.locator('body')).not.toContainText('senest 2 dage før');
  });

  test('uden et varsel bliver designets egen tekst stående', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_varsel_timer = 0;
    await åbn(page, d);

    const tekster = await page.locator('[data-varsel]').allTextContents();
    tekster.forEach((t) => expect(t).toContain('senest dagen før'));
  });
});
