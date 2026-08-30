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
const { åbnAdmin, åbn, grunddata } = require('./hjaelp');

/* ⚠️ VENTETID OG LOFT LIGGER BAG EN FOLD (27/8).

   Køen skal være det første, et køkken ser; de to tal sættes én
   gang om året. Kontakten "Åbent for bordbestilling" står stadig
   frit — den bruges under pres. Prøverne går den vej, et menneske
   går: åbn folden først. */
async function åbnFane(page, id) {
  await page.locator('[data-panel="' + id + '"]').click();
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

    await page.locator('[data-panel="p-koekken"]').click();
    await aabnKoekkenIndstillinger(page);
    const ventetid = page.locator('#bord-ventetid');
    expect((await ventetid.boundingBox()).height).toBeGreaterThanOrEqual(44);

    await page.locator('[data-panel="p-borde"]').click();
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
    const knap = page.locator('.vagt-raekke > .knap').first();
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
  test('noten rykker med, når titlen er skjult', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-tider');
    const skjult = page.locator('#p-tider .h-panel.dobbelt-titel');
    await expect(skjult).toHaveCount(1);

    const note = page.locator('#p-tider .kort-note').first();
    const kort = page.locator('#p-tider .kort').first();
    const [a, b] = await Promise.all([note.boundingBox(), kort.boundingBox()]);
    /* Venstrestillet: noten begynder i kortets venstre kant og
       ikke ude i højre side. */
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
    await page.locator('[data-panel="p-bestillinger"]').click();
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
    await expect(page.locator('#bestil-regler-note'))
      .toHaveText('Åben for bestillinger · et døgns varsel · mindst 5 stk. · leverer');
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
    await page.locator('[data-panel="p-menu"]').click();
    await page.waitForSelector('#menu-status');
  }

  /* ⚠️ RØD SKAL BETYDE NOGET. En udsolgt-knap pr. række i rødt er
     en væg; øjet holder op med at se den, og så ses den heller
     ikke den dag, en vare FAKTISK er væk. */
  test('udsolgt-knappen er stille, til varen faktisk er udsolgt', async ({ page }) => {
    await åbnMenufanen(page);
    const hoved = page.locator('[aria-expanded]').first();
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
