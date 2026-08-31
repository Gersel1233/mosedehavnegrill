/* ADMIN SKAL LIGNE ÉT PRODUKT, IKKE FEMTEN SIDER

   Kundens ord (26/8): udseendet i de forskellige faner "er
   elendigt, hvor spiis ... er langt kønnere". Målt, ikke bare
   troet: 58 blokke forklarende prosa stod som brødtekst inde i
   kortene, og overskrifterne var op til 34 px serif — hvert kort
   råbte sit navn og forklarede sig over fire linjer, før
   indholdet begyndte.

   Prøverne her holder komponentsystemet fast:

   · Korthovedet: navnet til venstre (22 px), konsekvensen dæmpet
     til højre. Noten siger, hvad kortet styrer ude på siden.
   · Højst ÉN blok løs prosa pr. kort — resten er hjaelp-linjer
     ved felterne eller slettet.
   · Felterne er til fedtede fingre: mindst 44 px høje.
   · Og gæstesiden må IKKE flytte sig med: komponenterne er
     scopet til body.personale.

   Reglerne måles på den BEREGNEDE stil — en klasse, der ikke
   slår igennem, er ingen regel. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, åbn, grunddata, visFane } = require('./hjaelp');

/* ⚠️ VENTETID OG LOFT LIGGER BAG EN FOLD (27/8).

   Køen skal være det første, et køkken ser; de to tal sættes én
   gang om året. Kontakten "Åbent for bordbestilling" står stadig
   frit — den bruges under pres. Prøverne går den vej, et menneske
   går: åbn folden først. */
async function åbnFane(page, id) {
  await visFane(page, id);
}

async function aabnKoekkenIndstillinger(page) {
  const fold = page.locator('#koekken-indstillinger');
  if (await fold.count() && !(await fold.evaluate((e) => e.open))) {
    await fold.locator('> summary').click();
  }
}

test.describe('Korthovedet', () => {

  test('overskrifterne i admin siger navnet — de råber det ikke', async ({ page }) => {
    await åbnAdmin(page);
    /* Alle paneler på én gang: getComputedStyle virker også på
       skjulte knuder, så vi behøver ikke åbne fjorten faner. */
    const stoerrelser = await page.evaluate(() =>
      [...document.querySelectorAll('.kort .h-panel')].map((h) => ({
        tekst: h.textContent.trim(),
        px: parseFloat(getComputedStyle(h).fontSize),
      })));
    expect(stoerrelser.length).toBeGreaterThan(15);
    for (const h of stoerrelser) {
      expect(h.px, `"${h.tekst}" råber (${h.px}px — loftet er 26)`)
        .toBeLessThanOrEqual(26);
    }
  });

  test('hvert kort med et hoved har sin konsekvens-note', async ({ page }) => {
    await åbnAdmin(page);
    const hoveder = await page.evaluate(() =>
      [...document.querySelectorAll('.kort-hoved')].map((h) => ({
        titel: (h.querySelector('.h-panel') || {}).textContent || '',
        note: (h.querySelector('.kort-note') || {}).textContent || '',
      })));
    expect(hoveder.length, 'korthovederne er forsvundet').toBeGreaterThanOrEqual(20);
    for (const h of hoveder) {
      expect(h.note.trim().length, `"${h.titel.trim()}" mangler sin note`)
        .toBeGreaterThan(8);
    }
  });

  /* DEN, DER HOLDER RODET UDE. 26 blokke løs prosa var det, der
     fik femten faner til at ligne femten sider. En ny fane må
     gerne forklare ét felt (hjaelp) — den må ikke lægge et essay
     oven på kortet igen. */
  test('højst én blok løs prosa pr. kort', async ({ page }) => {
    await åbnAdmin(page);
    const syndere = await page.evaluate(() =>
      [...document.querySelectorAll('#admin .kort')].map((k) => ({
        titel: ((k.querySelector('.h-panel') || {}).textContent || '?').trim(),
        blokke: [...k.children].filter((b) => b.matches('p.vare-tekst')).length,
      })).filter((k) => k.blokke > 1));
    expect(syndere, 'kort med mere end én prosablok: '
      + syndere.map((s) => s.titel).join(', ')).toHaveLength(0);
  });

  test('noten kan læses — den er dæmpet, ikke svag', async ({ page }) => {
    await åbnAdmin(page);
    const farve = await page.evaluate(() => {
      const n = document.querySelector('.kort-note');
      return n ? getComputedStyle(n).color : null;
    });
    // --muted i admin er #6f5b55: 5,97:1 på hvid. Prøven falder,
    // hvis nogen dæmper den forbi det.
    expect(farve).toBe('rgb(111, 91, 85)');
  });
});

test.describe('Felterne er til fedtede fingre', () => {

  /* Tre faner som stikprøve: tekst, tal og select. 44 px er
     WCAG's mindste trykflade — og "mindst 44, gerne mere" var
     også spiis-dokumentets eget tal for sol og sand på
     fingrene. */
  test('felterne i admin er mindst 44 px høje', async ({ page }) => {
    await åbnAdmin(page);

    await visFane(page, 'p-koekken');
    await aabnKoekkenIndstillinger(page);
    const ventetid = page.locator('#bord-ventetid');
    expect((await ventetid.boundingBox()).height).toBeGreaterThanOrEqual(44);

    await visFane(page, 'p-borde');
    const nummer = page.locator('#nyt-bord-nummer');
    expect((await nummer.boundingBox()).height).toBeGreaterThanOrEqual(44);
    const vaelger = page.locator('#nyt-bord-placering');
    expect((await vaelger.boundingBox()).height).toBeGreaterThanOrEqual(44);
  });

  /* OG GÆSTESIDEN MÅ IKKE FLYTTE SIG MED. Komponenterne er
     scopet til body.personale; bestillingsformularen har sin EGEN
     form (spiis-formen, 23/8: 52 px høj, --r-lille runding, tonet
     fyld), og den skal stå, som den gør. Prøven læser gæstens
     egne værdier — falder den, har en admin-regel ramt uden for
     sit scope. */
  test('gæstesidens felter er urørte', async ({ page }) => {
    await åbn(page, '/bestil/', { data: grunddata() });
    const stil = await page.evaluate(() => {
      const f = document.querySelector('#bestil-navn');
      const s = getComputedStyle(f);
      return { radius: s.borderRadius, bg: s.backgroundColor };
    });
    expect(stil.radius, 'gæstens felter har mistet deres egen runding').toBe('14px');
    /* Tonet, GENNEMSIGTIGT fyld — ikke admins solide sandflade.

       ⚠️ TALLET ER SKIFTET, REGLEN ER DEN SAMME (30/8). Fyldet
       var rgba(15, 44, 68, .035) — marineblå med 3,5 % — og 29/8
       gik hele huset over i den varme palet, så det er
       rgba(36, 26, 23, .035) nu. Det er farven i --sea, der er
       skiftet, ikke reglen: gæstens felt er stadig en TONE oven på
       kortet, hvor admins er en flade (rgb(253, 247, 239)).
       Falder gæstens fyld til en rgb() uden alfa, er en
       admin-regel sluppet uden om body.personale. */
    expect(stil.bg, 'gæstens felter har fået admins fyld')
      .toBe('rgba(36, 26, 23, 0.035)');
  });
});

/* ============================================================
   RUNDEN GENNEM ALLE FANER  (27/8)

   Kundens ord: "kan du ikke give alle tabsne sådan et tjek ...
   virker de godt, er det nemt, forståeligt, hænger det hele
   sammen, kan det gå galt, er det flot nok" — og "der skal være
   liquid glass knapper i alle tabsne".

   Hvert punkt herunder er noget, der stod på et skærmbillede og
   ikke i koden. Prøverne læser den BEREGNEDE stil: en klasse, der
   ikke slår igennem, er ingen regel.
   ============================================================ */
test.describe('Runden gennem fanerne', () => {

  /* ---- LIQUID GLASS ----
     Uden slør, med vilje: backdrop-filter uden et foto bagved
     koster billeder i sekundet på en iPad — for at sløre den
     flade creme, kortet allerede har. Glasset er kanterne, kroppen
     og lysstrejfet. */
  test('knapperne er glas og ikke flade flader', async ({ page }) => {
    await åbnAdmin(page);
    const k = page.locator('#p-overblik .knap, .faner + * .knap').first();
    await åbnFane(page, 'p-tider');
    const gem = page.locator('#gem-tider');

    const stil = await gem.evaluate((e) => {
      const s = getComputedStyle(e);
      return { bg: s.backgroundImage, skygge: s.boxShadow, slor: s.backdropFilter };
    });
    expect(stil.bg, 'knappen har ingen krop — den er en flad flade')
      .toContain('gradient');
    /* Fire skygger: linsekant, lys foroven, skygge forneden, løft. */
    expect(stil.skygge.split('rgb').length - 1,
      'glasset mangler sine kanter').toBeGreaterThanOrEqual(4);
    /* ⚠️ OG DEN MÅ IKKE HAVE FÅET ET SLØR MED. Det er hele
       grunden til, at admin har sin egen udgave. */
    expect(['none', ''], 'et slør uden foto bagved koster billeder i sekundet')
      .toContain(stil.slor);
    expect(k).toBeTruthy();
  });

  test('lysstrejfet findes, men kører ikke af sig selv', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-tider');
    const navn = await page.locator('#gem-tider').evaluate((e) =>
      getComputedStyle(e, '::after').animationName);
    expect(navn, 'striben løber hele tiden — det er uro, ikke liv').toBe('none');
  });

  /* ---- OVERBLIK: KNAPPEN LÅ I TIDENS KOLONNE ----
     MÅLT: "✓ Sæt som klar" stod som tre ord over tre linjer inde
     i en 67 px cirkel under klokkeslættet. */
  test('handlingsknappen på køreplanen er en knap, ikke en cirkel', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        bestillinger: [{
          id: 1, lokation_id: 'mosede', reference: 'SM260807-AAAAA',
          navn: 'Sara Holm', telefon: '20304050',
          hent_dato: '2026-08-07', hent_tid: '13:30',
          linjer: [{ navn: 'Rejemad', antal: 1, pris: 85 }], fyld: [], antal: 1,
          besked: null, status: 'ny', intern_note: null, hvordan: 'afhentning',
          bord_nummer: null, slettet: null, oprettet: '2026-08-07T09:00:00Z',
        }],
      }),
    });
    /* Ikke '> .knap' længere: knapperne blev samlet i
       .vagt-handling 30/8, så de kunne flyttes ud i deres egen
       kolonne. Målingen er den samme — det er formen på knappen,
       der vogtes, ikke hvor i træet den hænger. */
    const knap = page.locator('.vagt-raekke .knap').first();
    await expect(knap).toBeVisible();
    const m = await knap.boundingBox();
    /* En knap med tre ord skal være bredere end tidskolonnens
       4,2 rem (67 px) og ikke højere end to linjer. */
    expect(m.width, 'knappen er klemt ned i tidens kolonne').toBeGreaterThan(90);
    expect(m.height, 'teksten er brudt over flere linjer').toBeLessThan(52);
  });

  /* ---- NOTEN, DER SVÆVEDE ALENE ----
     Er kortets titel skjult (den siger det samme som fanens navn),
     stod noten helt ude til højre med ingenting til venstre for
     sig — en billedtekst uden et billede. */
  /* ⚠️ REGLEN ER BLEVET STRAMMERE (31/8), IKKE OPGIVET.

     Da den blev skrevet, rykkede noten bare til venstre, når
     titlen var skjult. Det var pænere, men det løste ikke det,
     prøven hed: en billedtekst uden et billede. "styrer, hvilke
     dage og tider gæsten kan vælge" står med lille
     begyndelsesbogstav, fordi den FORTSÆTTER titlen — alene
     læses den som en løsreven sætning i toppen af kortet.

     Kundens gennemgang på telefonen gjorde det tydeligt, og nu
     går hele hovedet med. Prøven måler det stærkere krav; det
     gamle er indeholdt i det. */
  test('noten bliver ikke stående, når titlen er skjult', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-tider');
    const skjult = page.locator('#p-tider .h-panel.dobbelt-titel');
    await expect(skjult).toHaveCount(1);

    /* ⚠️ OG NOTEN BLIVER STÅENDE — DET ER PRØVERNE, DER AFGJORDE
       DET.

       En mellemudgave skjulte hele .kort-hoved, så noten ikke
       stod alene. Så faldt prøven "siden siger, at det ikke er
       butikkens omsætning": Salg-kortets note bærer forbeholdet
       om, at tallet KUN er det, der er bestilt gennem
       hjemmesiden, og ikke butikkens kasse. At rydde op i
       udseendet ved at skjule en advarsel om penge er en dyrere
       fejl end den, det retter.

       Noten er venstrestillet, så den ikke svæver ude til højre
       med ingenting til venstre for sig. */
    const note = page.locator('#p-tider .kort-note').first();
    await expect(note).toBeVisible();
    const kort = page.locator('#p-tider .kort').first();
    const [a, b] = await Promise.all([note.boundingBox(), kort.boundingBox()]);
    expect(a.x - b.x, 'noten svæver stadig ude til højre').toBeLessThan(80);
  });

  /* ---- ET TAL ALENE ER IKKE HOVEDTALLET ----
     .tal-felt:first-child gør feltet mørkt. Reglen ramte også de
     felter, der står alene, så "Udeblivelser 0" blev en mørk blok
     i fuld bredde — og der var to mørke felter på Salg. */
  test('et enligt talfelt er hverken mørkt eller fuldbredde', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-salg');
    const enlig = page.locator('#salg-udeblivelser .tal-felt');
    await expect(enlig).toHaveCount(1);

    const m = await enlig.evaluate((e) => {
      const s = getComputedStyle(e);
      return { bg: s.backgroundColor, bredde: e.getBoundingClientRect().width };
    });
    expect(m.bg, 'det enlige felt er stadig mørkt').not.toBe('rgb(36, 26, 23)');
    expect(m.bredde, 'et tal på 1200 px er ikke mere sandt end et på 260')
      .toBeLessThan(400);
  });

  /* ---- KØEN FØRST, INDSTILLINGERNE BAGEFTER ----
     MÅLT: over 400 px opsætning før den første ordre i et køkken. */
  test('køkkenets indstillinger er foldet — men kontakten er fremme', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-koekken');

    const fold = page.locator('#koekken-indstillinger');
    await expect(fold).toHaveCount(1);
    expect(await fold.evaluate((e) => e.open),
      'folden står åben — så er den ikke en fold').toBe(false);
    await expect(page.locator('#bord-loft')).toBeHidden();

    /* ⚠️ MEN IKKE KONTAKTEN. Er der run på, skal bordbestilling
       kunne slås fra med det samme — en sikkerhedskontakt bag en
       fold er en kontakt, man leder efter, mens køkkenet drukner. */
    await expect(page.locator('#bord-aaben')).toBeVisible();
  });

  /* ---- BESTILLINGER HAVDE TO INDSTILLINGSKORT ----
     … med arbejdet imellem. 350 px flueben og prosa før den
     første ordre, og reglerne-kortet nederst gjorde det samme. */
  test('bestillingernes indstillinger står i reglerne, ikke over arbejdet', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-bestillinger');

    for (const id of ['spis-her', 'levering', 'auto-bekraeft',
      'leverings-omraade', 'leverings-pris']) {
      const i = page.locator('#' + id);
      await expect(i, id + ' står ikke i reglerne').toHaveCount(1);
      expect(await i.evaluate((e) => !!e.closest('#p-bestillinger .kort:last-of-type')
        || !!e.closest('.kort').querySelector('#gem-bestil-regler')),
      id + ' ligger stadig over arbejdet').toBe(true);
    }
  });

  /* ---- GENVEJEN, DER IKKE HAVDE NOGET AT LAVE ----
     "Sæt samme pris på alle" stod åben på hver kategori — også
     dem, hvor alt havde en pris, og hvor den derfor kun kunne
     OVERSKRIVE. Det modsiger genvejens egen regel. */
  test('sæt-samme-pris er foldet, når ingen mangler en pris', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-menu');
    await page.waitForSelector('.kat-hoved');

    /* Kategori 1 (Smørrebrød) har én vare, og den har en pris. */
    const foldet = page.locator('.menu-gruppe[data-kategori="1"] details.samle-pris');
    const aaben = page.locator('.menu-gruppe[data-kategori="12"] .samle-pris');
    await expect(aaben, 'fyldkategorien mangler priser og skal stå åben')
      .toHaveCount(1);
    expect(await foldet.count() ? await foldet.evaluate((e) => e.open) : false,
      'genvejen står åben, hvor der ikke er noget hul at fylde').toBe(false);
  });
});

/* ============================================================
   ET HELT KORT, DER KAN FOLDES  (30/8)
   ------------------------------------------------------------
   Kundens ord: "kan du ikke gøre så den her folder ned?" —
   Regler for bestilling fyldte en hel skærm med indstillinger,
   man rører et par gange om året: varsel, mindsteantal,
   leveringsområde.

   ⚠️ HELE KORTET ER FOLDEN, ikke en fold inde i det. Lagde vi en
   <summary> INDE i kortet, ville der stå to overskrifter over
   hinanden, og den øverste kunne ikke trykkes.

   ⚠️ OG ET LUKKET KORT SKAL STADIG SIGE DET VIGTIGSTE. Én af de
   fire indstillinger er ikke sjælden — om der overhovedet tages
   imod bestillinger — og en lukket forretning må ikke se præcis
   ud som en åben, når kortet er foldet sammen.
   ============================================================ */
test.describe('Regler for bestilling folder sammen', () => {

  async function åbnFanen(page, indstillinger) {
    const d = grunddata();
    Object.assign(d.indstillinger, indstillinger || {});
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-bestillinger');
    return page.locator('#bestil-regler-fold');
  }

  test('kortet står foldet sammen, og hovedet er knappen', async ({ page }) => {
    const fold = await åbnFanen(page);
    await expect(fold).toHaveCount(1);
    expect(await fold.evaluate((e) => e.open),
      'kortet står åbent — så fylder det stadig en hel skærm').toBe(false);

    /* Trykfladen er HELE hovedet, ikke en lille pil: admin bruges
       med en fedtet finger på en iPad. */
    const sum = page.locator('#bestil-regler-fold > summary');
    expect(await sum.evaluate((e) => getComputedStyle(e).cursor)).toBe('pointer');

    await sum.click();
    expect(await fold.evaluate((e) => e.open), 'folden åbnede ikke').toBe(true);
    await expect(page.locator('#bestil-varsel-timer')).toBeVisible();
  });

  /* ⚠️ ÉN OVERSKRIFT, IKKE TO. Prøven fra 26/8 tæller, at hvert
     korthoved har både navn og konsekvens-note; den her holder
     fast i, at hovedet ER summary'en, så der ikke sniger sig en
     ekstra overskrift ind, når nogen bygger videre. */
  test('der er ét hoved, og det er selve folden', async ({ page }) => {
    await åbnFanen(page);
    const hoveder = page.locator('#bestil-regler-fold .kort-hoved');
    await expect(hoveder).toHaveCount(1);
    expect(await hoveder.evaluate((e) => e.tagName)).toBe('SUMMARY');
    await expect(hoveder.locator('.h-panel')).toHaveText('Regler for bestilling');
  });

  test('noten siger tilstanden, så et lukket kort ikke skjuler den', async ({ page }) => {
    await åbnFanen(page, {
      bestilling_aaben: true, bestilling_varsel_timer: 24,
      bestilling_min_stk: 5, levering: true,
    });
    /* ⚠️ TEKSTEN ER ÆNDRET MED VILJE (30/8), OG PRØVEN FULGTE
       IKKE MED. Kunden: "der står at man minimum skal bestille 5
       ting, men det gælder på alt — det er en fejl, det er kun
       smørrebrød." Noten siger nu HVAD tallet gælder, og det er
       hele rettelsen: stod der bare "mindst 5 stk.", ville ejeren
       stadig tro, det gjaldt en burger. */
    await expect(page.locator('#bestil-regler-note'))
      .toHaveText('Åben for bestillinger · et døgns varsel · mindst 5 stk. smørrebrød · leverer');
  });

  /* ⚠️ LUKKET ER IKKE EN OPLYSNING — DET ER EN ADVARSEL. Den skal
     kunne ses uden at læse, og den skal stå FØRST i sætningen:
     det er den ene tilstand, der koster penge. */
  test('lukket for bestillinger råber, og gør det i rødt', async ({ page }) => {
    await åbnFanen(page, { bestilling_aaben: false });
    const note = page.locator('#bestil-regler-note');
    await expect(note).toContainText('LUKKET');

    const farve = await note.evaluate((e) => getComputedStyle(e).color);
    const [r, g, b] = farve.match(/\d+/g).map(Number);
    expect(r, 'advarslen står i dæmpet grå som al anden note').toBeGreaterThan(150);
    expect(g, 'farven er ikke rød').toBeLessThan(90);
    expect(b).toBeLessThan(90);
  });
});

/* ============================================================
   DET ÅBNE KATEGORIKORT  (30/8)
   ------------------------------------------------------------
   Kundens ord: "ret det her når man åbner kortet, det er lort
   grimt — og gør så jeg kan trykke dem uden priser."

   To ting, og den første bryder en regel, huset selv skrev ned
   26/8: "Rækkens knapper er STILLE, panelets hovedhandling er
   rød. Menukortets 21+242 røde Gem-knapper var en væg — rød
   betyder noget igen." Udsolgt-knappen slap forbi den oprydning
   og stod som en rød ring på HVER række, også på de 240 varer,
   der ikke er udsolgte.
   ============================================================ */
test.describe('Det åbne kategorikort', () => {

  /* Nok varer til at fanen folder — folden kommer først på et
     langt kort, og det er dét, kunden ser med 21 kategorier. */
  function langtKort() {
    const d = grunddata();
    d.menu_kategorier = [
      { id: 8, afdeling: 'mad', navn: 'Morgenmad', sortering: 1, aktiv: true },
      { id: 9, afdeling: 'mad', navn: 'Retter', sortering: 2, aktiv: true },
    ];
    d.menu_varer = [
      { id: 1, kategori_id: 8, navn: 'Morgenkomplet', pris: 99, udsolgt: false, sortering: 1, aktiv: true },
      { id: 2, kategori_id: 8, navn: 'Frugtmix', pris: 25, udsolgt: true, sortering: 2, aktiv: true },
      { id: 3, kategori_id: 8, navn: 'Brunchtallerken', pris: null, udsolgt: false, sortering: 3, aktiv: true },
    ];
    for (let i = 0; i < 30; i++) {
      d.menu_varer.push({ id: 100 + i, kategori_id: 9, navn: 'Ret ' + (i + 1),
        pris: 89, udsolgt: false, sortering: i, aktiv: true });
    }
    return d;
  }

  async function åbnMenufanen(page) {
    await åbnAdmin(page, { data: langtKort() });
    await visFane(page, 'p-menu');
    await page.waitForSelector('#menu-status');
  }

  /* ⚠️ RØD SKAL BETYDE NOGET. En udsolgt-knap pr. række i rødt er
     en væg; øjet holder op med at se den, og så ses den heller
     ikke den dag, en vare FAKTISK er væk. */
  test('udsolgt-knappen er stille, til varen faktisk er udsolgt', async ({ page }) => {
    await åbnMenufanen(page);
    /* ⚠️ SELEKTOREN SKAL VÆRE SCOPET TIL PANELET.
       [aria-expanded] uden scope ramte det FØRSTE element på hele
       siden med attributten — og siden 30/8 er det "Mere" i
       bundbjælken på telefonen, ikke kategorikortet. Prøven
       foldede altså fanelisten ud og ledte efter varerækker i
       den. Den slags fandt vi kun ved at måle; selektoren så
       rigtig ud. */
    const hoved = page.locator('#p-menu [aria-expanded]').first();
    if (await hoved.getAttribute('aria-expanded') === 'false') await hoved.click();

    /* ⚠️ data-vare BÆRER ID'ET, IKKE NAVNET — se prøven i
       admin.spec.js, der klikker .vare-raekke[data-vare="1"].
       Navnene står i <input>-felter, og Playwrights hasText kan
       ikke se en feltværdi; det er hele grunden til, at rækkerne
       har attributten. */
    const rolig = page.locator('.vare-raekke[data-vare="1"] .udsolgt-knap');
    const rød = page.locator('.vare-raekke[data-vare="2"] .udsolgt-knap');
    await expect(rolig).toHaveCount(1);
    await expect(rød).toHaveCount(1);

    const farve = (l) => l.evaluate((e) => {
      const s = getComputedStyle(e);
      return { tekst: s.color, bund: s.backgroundColor };
    });
    const r = await farve(rolig);
    const u = await farve(rød);

    /* Den rolige: dæmpet tekst, ikke rød. */
    const [rr, rg] = r.tekst.match(/\d+/g).map(Number);
    expect(rr - rg, 'den rolige knap er stadig rød').toBeLessThan(60);

    /* Den udsolgte: fyldt rød bund — dét er hele pointen. */
    const [ur, ug, ub] = u.bund.match(/\d+/g).map(Number);
    expect(ur, 'den udsolgte vare råber ikke').toBeGreaterThan(150);
    expect(ug).toBeLessThan(90);
    expect(ub).toBeLessThan(90);
  });

  /* ⚠️ TALLET ER VEJEN HEN TIL ARBEJDET. Stod det som en ren
     oplysning, skulle man bagefter finde filteret øverst på fanen
     og sætte det selv — på et kort med 21 kategorier. */
  test('"N uden pris" på folden filtrerer fanen', async ({ page }) => {
    await åbnMenufanen(page);
    const genvej = page.locator('.menu-fold-genvej', { hasText: 'uden pris' }).first();
    await expect(genvej).toHaveCount(1);
    await genvej.click();

    await expect(page.locator('.menu-tal-felt.valgt .menu-tal-navn')).toHaveText('Mangler pris');
    /* Og der står præcis den ene vare uden pris tilbage. */
    await expect(page.locator('.vare-raekke')).toHaveCount(1);
    await expect(page.locator('.vare-raekke')).toHaveAttribute('data-vare', '3');
  });

  /* ⚠️ HER STOD EN TREDJE PRØVE, OG DEN ER FJERNET IGEN (30/8).

     Den skulle vogte, at genvejen ikke OGSÅ åbner folden — uden
     stopPropagation fyrer foldens egen lytter med. Men den bestod
     også, da jeg fjernede stopPropagation, altså målte den
     ingenting: saetFilter tegner hele fanen om, og efter et
     filter er der en anden gruppe FØRST i listen, så
     [aria-expanded] var slet ikke den samme knude.

     En regel, der ikke kan fejle, måler ingenting — så hellere
     ingen prøve end en, der giver falsk tryghed. stopPropagation
     står med sin begrundelse i js/admin/menukort.js. */
});

/* ============================================================
   "DER ER KOMMET EN NY UDGAVE"  (30/8)
   ------------------------------------------------------------
   Kundens ord: "på admin siden skal de sige opdater, så man
   opdaterer hver gang."

   ⚠️ IPAD'EN I KØKKENET LUKKER ALDRIG SIN FANE. En browser, der
   har haft admin åben siden i mandags, kører mandagens kode —
   og INGEN opdager det, for siden ser helt rigtig ud. Udgiver vi
   en rettelse til en knap, der ikke virkede, er den der ikke for
   dem, der har mest brug for den.
   ============================================================ */
test.describe('Ny udgave-båndet', () => {

  /* ⚠️ DEN VIGTIGSTE: BÅNDET MÅ IKKE DUKKE OP AF SIG SELV.
     Lokalt og i prøverne er versionsstemplet ikke erstattet (det
     står som "__V__"), så der er intet at sammenligne. Et bånd,
     der kom alligevel, ville sige til personalet, at de kører
     gammel kode, hver eneste gang de åbner siden — og så holder
     de op med at læse det. */
  /* ⚠️ DEN HER MÅTTE SKRIVES OM. Første udgave tjekkede bare, at
     båndet ikke var der efter et par hundrede millisekunder — og
     den bestod også, da jeg fjernede værnet, den skulle beskytte.
     Grunden: lokalt svarer den hentede side med det SAMME
     ustemplede "__V__", så der er alligevel ingen forskel at
     finde. Prøven målte ingenting.

     Nu svarer en falsk fetch med en RIGTIG version, så begge veje
     kan skelnes: samme stempel → intet bånd, nyt stempel → bånd. */
  test('samme udgave giver intet bånd — en ny giver ét', async ({ page }) => {
    await åbnAdmin(page);

    await page.evaluate(() => {
      window.fetch = () => Promise.resolve({ ok: true,
        text: () => Promise.resolve('<script src="x.js?v=aaaaaaa">') });
    });
    await page.evaluate(() => window.AdminOpdater.tjek('aaaaaaa'));
    await page.waitForTimeout(250);
    await expect(page.locator('#ny-udgave'),
      'båndet kom, selv om udgaven er den samme').toHaveCount(0);

    await page.evaluate(() => {
      window.fetch = () => Promise.resolve({ ok: true,
        text: () => Promise.resolve('<script src="x.js?v=bbbbbbb">') });
    });
    await page.evaluate(() => window.AdminOpdater.tjek('aaaaaaa'));
    await expect(page.locator('#ny-udgave'),
      'der er kommet en ny udgave, og båndet siger det ikke').toHaveCount(1);
  });

  /* Og i prøverne og lokalt er stemplet slet ikke erstattet — så
     skal der ALDRIG komme et bånd, uanset hvad serveren svarer. */
  test('uden et versionsstempel er den helt tavs', async ({ page }) => {
    await åbnAdmin(page);
    expect(await page.evaluate(() => window.AdminOpdater.minUdgave())).toBe('__V__');
    await page.evaluate(() => {
      window.fetch = () => Promise.resolve({ ok: true,
        text: () => Promise.resolve('<script src="x.js?v=noget-andet">') });
    });
    await page.evaluate(() => window.AdminOpdater.tjek());
    await page.waitForTimeout(250);
    await expect(page.locator('#ny-udgave')).toHaveCount(0);
  });

  /* ⚠️ OG DEN GENINDLÆSER ALDRIG AF SIG SELV. Personalet kan stå
     midt i en note eller en pris; en side, der hopper under
     fingeren, er værre end en gammel side. Båndet siger til —
     mennesket bestemmer hvornår. */
  test('båndet har en knap, og det står hvor de andre bånd står', async ({ page }) => {
    await åbnAdmin(page);
    await page.evaluate(() => window.AdminOpdater.visBaand());

    const baand = page.locator('#ny-udgave');
    await expect(baand).toBeVisible();
    await expect(baand).toContainText('ny udgave');
    await expect(page.locator('#ny-udgave-knap')).toHaveText('Opdater');

    /* Det må ikke ligge under sidemenuen. main.midt spænder over
       hele bredden, og menuen ligger fast oven på den — et bånd
       sat ind som mains første barn bliver klippet. Målt: båndets
       venstre kant skal ligge til HØJRE for menuens højre kant. */
    /* ⚠️ MÅLT PÅ PLADSEN I TRÆET, IKKE PÅ KOORDINATER. Første
       udgave sammenlignede båndets venstre kant med sidemenuens
       højre — og bestod også, da jeg pillede indsættelsen fra
       hinanden, fordi reserven (appendChild) lander nederst i
       main, hvor der tilfældigvis heller ikke er nogen menu.

       Reglen er, hvor det STÅR: lige før øvetilstandens bånd og
       kvitteringen, altså i den stak beskeder personalet i
       forvejen kigger på. Sat ind som mains første barn lander
       det under den faste sidemenu og bliver klippet — det er den
       fejl, der blev fundet på et skud. */
    const naboen = await baand.evaluate((e) => {
      const n = e.nextElementSibling;
      return n ? n.id : null;
    });
    expect(['oeve-baand', 'kvittering'],
      'båndet står ikke sammen med de andre bånd — det havner under sidemenuen')
      .toContain(naboen);
  });

  /* To bånd oven på hinanden er to gange den samme besked. */
  test('det kommer kun én gang, uanset hvor mange gange der tjekkes', async ({ page }) => {
    await åbnAdmin(page);
    await page.evaluate(() => {
      window.AdminOpdater.visBaand();
      window.AdminOpdater.visBaand();
      window.AdminOpdater.visBaand();
    });
    await expect(page.locator('#ny-udgave')).toHaveCount(1);
  });
});

/* ============================================================
   OVERBLIK: OPSÆTNING OG TOMME TILSTANDE  (30/8)
   ------------------------------------------------------------
   Kundens skærmbilleder af en færdig personaleside: to kort
   øverst om det, der skal sættes op, og tomme afsnit som en
   stiplet ramme med én sætning i stedet for ingenting.

   Formen er lånt derfra. Farverne er havnens, teksterne er
   Mosedes, og reglerne nedenunder er husets egne.
   ============================================================ */
test.describe('Overblikkets opsætning og tomme tilstande', () => {

  /* ⚠️ ET KORT UDEN NOGET AT SIGE FINDES IKKE. Et fast kort, der
     som regel siger "alt er fint", bliver til udsmykning på en
     uge — og så ses det heller ikke den dag, det siger noget.
     Samme regel som ⚠️-kortet på Baglokalet og "Gå ud og sig
     noget" i Køkken-kø. */
  test('opsætningskortene findes kun, når der er noget at gøre', async ({ page }) => {
    await åbnAdmin(page);
    await expect(page.locator('#overblik-opsaetning')).toHaveCount(1);

    /* I en prøvebrowser er beskeder hverken slået til eller
       mulige, så der SKAL stå noget — men aldrig mere end de to. */
    const n = await page.locator('.ops-kort').count();
    expect(n, 'der er kommet flere kort end de to, opsætningen har')
      .toBeLessThanOrEqual(2);
  });

  /* ⚠️ ÉN IMPLEMENTATION, TO DØRE. Kortet må ikke bygge sin egen
     "slå til" — den skal være den samme, Kontakt-fanen bruger.
     To udgaver ville langsomt komme til at gøre noget
     forskelligt, og ingen ville opdage det, før en iPad holdt op
     med at sige til. */
  test('beskeder slås til gennem den samme funktion som på Kontakt', async ({ page }) => {
    await åbnAdmin(page);
    const deler = await page.evaluate(() => !!(window.AdminPush
      && typeof window.AdminPush.slaaTil === 'function'));
    expect(deler, 'push-modulet har ikke åbnet sin dør — så bygger '
      + 'kortet sin egen knap').toBe(true);
  });

  /* En tom liste skal sige "her kommer der noget", ikke ingenting.
     Står der ingenting, tror man siden ikke virker — og så
     begynder nogen at genindlæse i stedet for at passe
     forretningen. */
  test('en tom dag siger det med ord, ikke med et hul', async ({ page }) => {
    const d = grunddata();
    d.bestillinger = [];
    await åbnAdmin(page, { data: d });

    const tomme = page.locator('#overblik-koereplan .tom-plads');
    await expect(tomme).toHaveCount(2);          // produktion + forløb
    await expect(tomme.first()).toContainText('Ingen bestillinger');

    /* ⚠️ OG DEN ER IKKE EN ADVARSEL. En tom dag er ikke en fejl,
       så farven skal være den dæmpede — ikke den røde. Målt på
       den BEREGNEDE værdi: en klasse, der ikke slår igennem, er
       ingen regel. */
    const farve = await tomme.first().evaluate((e) => getComputedStyle(e).color);
    const [r, g, b] = farve.match(/\d+/g).map(Number);
    expect(r - g, 'den tomme tilstand står i rødt — det ligner en fejl')
      .toBeLessThan(45);
    expect(b).toBeLessThan(160);

    /* Og den fylder bredden. Produktion i alt er en flex-række, så
       uden display:block krymper kassen om sin egen tekst og står
       som en halv boks midt i kortet. */
    const kasse = await tomme.first().boundingBox();
    const kort = await page.locator('#overblik-koereplan').boundingBox();
    expect(kasse.width, 'den tomme kasse fylder ikke kortets bredde')
      .toBeGreaterThan(kort.width * 0.8);
  });

  /* ⚠️ OG NÅR DER ER NOGET, SKAL KASSEN VÆK. En stiplet kasse
     under en liste er to gange den samme plads. */
  test('med bestillinger står der ingen tom kasse', async ({ page }) => {
    const d = grunddata();
    d.bestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'SM1', navn: 'Sara',
      telefon: '20304050', hent_dato: '2026-08-07', hent_tid: '12:30',
      linjer: [{ navn: 'Flæskestegssandwich', antal: 2, pris: 89 }],
      i_alt: 178, status: 'ny', hvordan: 'afhentning', bord_nummer: null,
      besked: null, intern_note: null, slettet: null,
      oprettet: '2026-08-07T09:00:00Z',
    }];
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#overblik-koereplan .tom-plads')).toHaveCount(0);
  });
});

/* ============================================================
   ADMIN PÅ TELEFONEN  (31/8)

   Kundens ord: knapperne i admin "ligner noget for 1850'erne
   ... gennemgå det lige på telefonskærm for at se hvad jeg
   mener".

   ⚠️ MÅLT PÅ EN IPHONE 13, og det var værre end det så ud:

   · Sidetitlen, datoen, e-mailen og en streg fyldte toppen —
     og så gentog kortet titlen 200 px længere nede. Det FØRSTE
     felt, personalet kunne røre, lå 391 px nede på en skærm på
     664: 59 % var hoved og gentagelse.
   · Fem løse piller i TRE rækker udgjorde to forskellige
     filtre, der så ens ud.
   · Fluebenene var browserens egne firkanter.
   · Hver ugedag på Åbningstider fyldte tre linjer.

   Prøverne måler den BEREGNEDE stil, ikke klasserne — en klasse,
   der ikke slår igennem, er ingen regel. Det fangede en fejl her:
   .kort-hoved:has(> .dobbelt-titel) vejede mindre end kortets
   egen regel og slog aldrig igennem, mens klassen sad korrekt på
   overskriften.
   ============================================================ */
test.describe('Admin på telefonen', () => {

  test.skip(({ isMobile }) => !isMobile, 'måles kun i telefonprofilen');

  /* ⚠️ SIDEN SIGER SIT NAVN ÉN GANG. */
  test('kortets overskrift gentager ikke fanens navn', async ({ page }) => {
    await åbnAdmin(page);
    await visFane(page, 'p-tider');

    const sidetitel = (await page.locator('#fane-titel').innerText()).trim();
    expect(sidetitel).toBe('Åbningstider');

    /* ⚠️ DET ER OVERSKRIFTEN, DER SKJULES — IKKE HELE HOVEDET.
       Noten bærer kortets forbehold og bliver stående; se de to
       prøver om Salg-kortets note for hvorfor. */
    const titel = page.locator('#p-tider .kort').first().locator('.h-panel');
    await expect(titel).toHaveCount(1);
    await expect(titel).toHaveClass(/dobbelt-titel/);
    /* Målt på den BEREGNEDE stil: en klasse, der ikke slår
       igennem, er ingen regel. */
    await expect(titel).toBeHidden();
  });

  /* ⚠️ OG NOTEN GÅR MED. "styrer, hvilke dage og tider gæsten kan
     vælge" står med lille begyndelsesbogstav, fordi den
     fortsætter titlen. Alene læses den som en løsreven sætning i
     toppen af kortet. */
  /* ⚠️ NOTEN SKJULES IKKE — SE PRØVEN "noten bliver ikke stående,
     når titlen er skjult" ovenfor for hvorfor. Den her måler den
     anden halvdel: at der ikke er TO overskrifter på skærmen. */
  test('der står kun ét sted, hvad fanen hedder', async ({ page }) => {
    await åbnAdmin(page);
    await visFane(page, 'p-tider');
    const navn = (await page.locator('#fane-titel').innerText()).trim();
    const synlige = await page.locator('#p-tider h1, #p-tider h2, #p-tider h3')
      .evaluateAll((ns, n) => ns
        .filter((e) => e.offsetParent !== null)
        .filter((e) => e.textContent.trim() === n).length, navn);
    expect(synlige, 'fanens navn står to gange på skærmen').toBe(0);
  });

  /* ⚠️ TO FILTRE, TO GRUPPER — og de så ens ud før. */
  test('filtrene er segmenterede grupper, ikke løse piller', async ({ page }) => {
    await åbnAdmin(page);
    await visFane(page, 'p-bestillinger');

    const grupper = page.locator('#bestil-dage .adm-seg');
    await expect(grupper).toHaveCount(2);

    /* ⚠️ AT TÆLLE ELEMENTER MÅLER OPMÆRKNINGEN, IKKE UDSEENDET.

       Første udgave af prøven bestod, da .adm-seg blev sat til
       display:contents — altså da gruppen holdt op med at have en
       flade og knapperne igen lå løst i rækken. Præcis den fejl,
       prøven er skrevet for at fange. SET BESTÅ med fejlen inde.

       Nu måles gruppens EGEN kasse: har den ingen højde, er der
       ingen gruppe, uanset hvad der står i opmærkningen. */
    const kasse = await grupper.first().evaluate((e) => {
      const r = e.getBoundingClientRect();
      const c = getComputedStyle(e);
      return { h: Math.round(r.height), b: Math.round(r.width),
        bund: c.backgroundColor };
    });
    expect(kasse.h, 'gruppen har ingen flade — knapperne ligger løst')
      .toBeGreaterThan(30);
    expect(kasse.b).toBeGreaterThan(60);
    /* Og fladen skal kunne ses: en gennemsigtig gruppe er ingen
       gruppe for øjet. */
    expect(kasse.bund, 'gruppens flade er gennemsigtig')
      .not.toBe('rgba(0, 0, 0, 0)');

    /* Knapperne i en gruppe står på ÉN linje. To uafhængige
       elementer sammenlignes — et spørgsmål til gruppen om dens
       egen display ville bestå, også hvis reglen ikke slog
       igennem. */
    const toppe = await grupper.first().locator('button')
      .evaluateAll((ks) => ks.map((k) => Math.round(k.getBoundingClientRect().top)));
    expect(Math.max(...toppe) - Math.min(...toppe),
      'segmenterne står under hinanden').toBeLessThanOrEqual(2);

    /* Den valgte siger det med aria-pressed — samme sandhed til
       øjet og til en skærmlæser. */
    const valgt = page.locator('#bestil-dage .adm-seg button[aria-pressed="true"]');
    await expect(valgt).toHaveCount(2);   // én pr. gruppe

    /* ⚠️ OG DEN VALGTE ER HVID, IKKE RØD. Rød betyder "det her er
       handlingen" i hele admin — Gem, Afvis, Slet. Et filter er
       ikke en handling; det er et sted, man står. */
    const bund = await valgt.first().evaluate((e) => getComputedStyle(e).backgroundColor);
    const [r, g, b] = bund.match(/\d+/g).map(Number);
    expect(r, 'den valgte er rød — så holder rød op med at betyde noget')
      .toBeLessThan(260);
    expect(Math.abs(r - g), 'den valgte har en farve, ikke hvid').toBeLessThan(20);
    expect(Math.abs(g - b)).toBeLessThan(20);
  });

  /* ⚠️ INGEN EMOJI I FILTRENE. 📅 og 📚 brød linjen på en telefon
     og sagde ikke noget, ordet ikke allerede sagde. */
  test('filtrene har ikke emoji i sig', async ({ page }) => {
    await åbnAdmin(page);
    await visFane(page, 'p-bestillinger');
    const tekst = await page.locator('#bestil-dage').innerText();
    expect(tekst, 'et emoji er tilbage i filterrækken')
      .not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  /* ⚠️ FLUEBENET ER IKKE BROWSERENS EGET. accent-color tegner en
     firkant, der ser forskellig ud i hver browser og intet har at
     gøre med resten af huset. */
  test('fluebenene har husets egen form', async ({ page }) => {
    await åbnAdmin(page);
    await visFane(page, 'p-tider');
    const hak = page.locator('#tider-felter input[type="checkbox"]').first();
    const s = await hak.evaluate((e) => {
      const c = getComputedStyle(e);
      return { udseende: c.appearance || c.webkitAppearance,
        runding: parseFloat(c.borderRadius), h: Math.round(e.getBoundingClientRect().height) };
    });
    expect(s.udseende).toBe('none');
    expect(s.runding, 'fluebenet er en skarp firkant').toBeGreaterThanOrEqual(5);
    expect(s.h).toBeGreaterThanOrEqual(20);
  });

  /* ⚠️ EN UGEDAG FYLDER TO LINJER, IKKE TRE. De to klokkeslæt
     hører sammen og skal stå ved siden af hinanden — ellers er
     syv dage over tre skærme. */
  test('de to klokkeslæt står på samme linje', async ({ page }) => {
    await åbnAdmin(page);
    await visFane(page, 'p-tider');

    const m = await page.evaluate(() => {
      const r = document.querySelector('#tider-felter .tid-raekke');
      const t = r.querySelectorAll('input[type="time"]');
      const a = t[0].getBoundingClientRect();
      const b = t[1].getBoundingClientRect();
      return { fraTop: Math.round(a.top), tilTop: Math.round(b.top),
        raekke: Math.round(r.getBoundingClientRect().height) };
    });
    /* To uafhængige elementer sammenlignes — et spørgsmål til
       feltet om dets egen grid-column ville bestå, også hvis
       reglen ikke slog igennem. */
    expect(Math.abs(m.fraTop - m.tilTop),
      'de to klokkeslæt står under hinanden').toBeLessThanOrEqual(4);
    expect(m.raekke, 'ugedagen fylder stadig tre linjer').toBeLessThan(150);
  });
});
