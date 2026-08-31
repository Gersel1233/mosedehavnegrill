/* Forsidens bestillingsformular — koblingen til køkkenet.

   Formularen var en attrap: faste datoer, faste klokkeslæt, seks
   rækker mad skrevet i hånden og en knap, der ikke gjorde noget.
   Prøverne her måler, at den er blevet ægte — og at designet
   stadig er designet. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

// 2026-08-07 er en FREDAG, uret står 11:00Z = 13:00 dansk tid.
const FREDAG = '2026-08-07T11:00:00Z';

function data(ændringer) {
  const d = grunddata();
  // Kategorien skal være åbnet i admin, ellers er der intet at sælge
  d.indstillinger.bestilbare_kategorier = [1, 6, 9];
  d.indstillinger.bestilling_varsel_timer = 2;
  Object.assign(d.indstillinger, (ændringer || {}).indstillinger || {});
  return Object.assign(d, ændringer || {}, {
    indstillinger: Object.assign(d.indstillinger, (ændringer || {}).indstillinger || {}),
  });
}

async function åbn(page, valg) {
  await åbnSkal(page, '/index.html', Object.assign({ ur: FREDAG, data: data() }, valg || {}));
}

test.describe('Forsidens bestilling', () => {
  test('dagene kommer fra åbningstiderne, ikke fra designet', async ({ page }) => {
    await åbn(page);
    const muligheder = await page.$$eval('#dato option', (o) => o.map((e) => e.value));

    // Designets tre faste tekster er væk
    await expect(page.locator('#dato')).not.toContainText('25. august');
    // Med to timers varsel kan man bestille i dag
    expect(muligheder[0]).toBe('2026-08-07');
    // Alle dage er rigtige datoer i rækkefølge
    expect(muligheder.length).toBeGreaterThan(3);
    expect(muligheder).toEqual([...muligheder].sort());
  });

  test('en lukkedag kan ikke vælges', async ({ page }) => {
    const d = data();
    d.kalender = [{
      id: 1, lokation_id: 'mosede', type: 'lukkedag', dato: '2026-08-08',
      slut_dato: null, titel: 'Havnefest', beskrivelse: '', emoji: '',
      lukker_kl: null, offentlig: true,
    }];
    await åbn(page, { data: d });

    const muligheder = await page.$$eval('#dato option', (o) => o.map((e) => e.value));
    expect(muligheder).toContain('2026-08-07');
    expect(muligheder).not.toContain('2026-08-08');
  });

  test('varslet skubber dagene frem', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_varsel_timer = 24;
    await åbn(page, { data: d });

    const muligheder = await page.$$eval('#dato option', (o) => o.map((e) => e.value));
    expect(muligheder[0]).toBe('2026-08-08');
  });

  test('tiderne ligger inden for åbningstiden', async ({ page }) => {
    await åbn(page);
    const tider = await page.$$eval('#tid option', (o) => o.map((e) => e.value));

    // Ugeplanen er 11–21, og sidste tid er en halv time før der lukkes
    expect(tider[tider.length - 1]).toBe('20:30');
    // Klokken er 13, varslet er 2 timer → intet før 15
    expect(tider[0]).toBe('15:00');
  });

  test('dagens ret står øverst med tæller, kategorierne folder ud', async ({ page }) => {
    const d = data();
    d.indstillinger.dagens_ret = { navn: 'Stegt rødspætte', beskrivelse: '', pris: 118 };
    await åbn(page, { data: d });

    const første = page.locator('[data-liste] .item').first();
    await expect(første).toHaveClass(/hi/);
    await expect(første.locator('h4')).toHaveText('Stegt rødspætte');
    await expect(første.locator('.tag')).toContainText('118,-');

    // Kategorien er lukket til at begynde med
    const kat = page.locator('[data-kategori="Smørrebrød"]');
    await expect(kat.locator('.add')).toHaveText('+ tilføj');
    await expect(page.locator('[data-vare="Flæskestegssandwich"]')).toHaveCount(0);

    await kat.click();
    await expect(page.locator('[data-vare="Flæskestegssandwich"]')).toHaveCount(1);
    await expect(kat.locator('.add')).toHaveText('– luk');
  });

  test('en bestilling lander i databasen med de rigtige linjer', async ({ page }) => {
    await åbn(page);

    await page.locator('[data-kategori="Smørrebrød"]').click();
    const række = page.locator('[data-vare="Flæskestegssandwich"]');
    await række.locator('button[data-d="+"]').click();
    await række.locator('button[data-d="+"]').click();

    await page.locator('#navn').fill('Sara Poulsen');
    await page.locator('#tlf').fill('28 87 13 43');
    await page.locator('#besked').fill('Uden agurk, tak.');
    await page.locator('#tid').selectOption('17:00');
    await page.locator('button.g.solid.blk').click();

    // Kvitteringen bruger designets egne dele
    await expect(page.locator('#bestil .panel h3')).toContainText('Tak, Sara');
    // Referencen er SM + dato + kode, fx SM260807-AKA8H
    await expect(page.locator('#bestil .panel .note')).toContainText(/Reference: SM\d{6}-/);

    const gemt = await gemteData(page);
    expect(gemt.bestillinger).toHaveLength(1);
    const b = gemt.bestillinger[0];
    expect(b.navn).toBe('Sara Poulsen');
    expect(b.hent_dato).toBe('2026-08-07');
    expect(b.hent_tid).toBe('17:00');
    expect(b.antal).toBe(2);
    expect(b.linjer).toEqual([{ navn: 'Flæskestegssandwich', antal: 2, pris: 89 }]);
    expect(b.besked).toBe('Uden agurk, tak.');
    expect(b.status).toBe('ny');
  });

  test('dagens ret ryger ud af kurven, når man skifter dag', async ({ page }) => {
    /* Retten gælder KUN i dag — sådan er feltet i admin skruet
       sammen. Blev den hængende i kurven, ville køkkenet få en
       ret, de ikke laver den dag. */
    const d = data();
    d.indstillinger.dagens_ret = { navn: 'Stegt rødspætte', beskrivelse: '', pris: 118 };
    await åbn(page, { data: d });

    await page.locator('.item.hi button[data-d="+"]').click();
    await expect(page.locator('#sumline')).toContainText('1 × Stegt rødspætte');

    await page.locator('#dato').selectOption('2026-08-08');
    await expect(page.locator('.item.hi')).toHaveCount(0);
    await expect(page.locator('#sumline')).toContainText('Vælg mindst én ting');
  });

  test('uden navn eller nummer bliver den ikke sendt', async ({ page }) => {
    await åbn(page);
    await page.locator('[data-kategori="Smørrebrød"]').click();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();

    await page.locator('button.g.solid.blk').click();
    await expect(page.locator('#sumline')).toContainText('Skriv dit navn');

    await page.locator('#navn').fill('Sara');
    await page.locator('button.g.solid.blk').click();
    await expect(page.locator('#sumline')).toContainText('telefonnummer');

    const gemt = await gemteData(page);
    expect(gemt.bestillinger || []).toHaveLength(0);
  });

  test('spis her spørges der kun om, når forretningen har slået det til', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('[data-seg="how"]')).toBeHidden();

    const d = data();
    d.indstillinger.spis_her = true;
    await åbn(page, { data: d });
    await expect(page.locator('[data-seg="how"]')).toBeVisible();

    await page.locator('[data-seg="how"] button').nth(1).click();
    await page.locator('[data-kategori="Smørrebrød"]').click();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#navn').fill('Sara Poulsen');
    await page.locator('#tlf').fill('28871343');
    await page.locator('button.g.solid.blk').click();

    const gemt = await gemteData(page);
    expect(gemt.bestillinger[0].hvordan).toBe('spis_her');
  });

  test('er der lukket for bestillinger, findes afsnittet ikke', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_aaben = false;
    await åbn(page, { data: d });

    await expect(page.locator('#bestil')).toBeHidden();
    // Pillen må ikke pege ned i ingenting
    await expect(page.locator('#bestil-pill')).toHaveAttribute('href', 'h-smorrebrod.html');
  });

  test('skallen er urørt: felterne står i designets rækkefølge', async ({ page }) => {
    await åbn(page);
    const etiketter = await page.$$eval('#bestil .panel .field label',
      (els) => els.map((e) => e.textContent.trim()));
    expect(etiketter).toEqual(['Dato', 'Vælg jeres retter', 'Tidspunkt',
      'Hvordan vil I spise?', 'Navn', 'Telefonnummer', 'Besked (valgfrit)']);
  });
});

/* ============================================================
   LEVERINGSOMRÅDET ER EJERENS FAKTA — PRISEN ER STADIG UKENDT
   ------------------------------------------------------------
   Mikkel oplyste området 27/8: Karslunde, Greve, Tune, Solrød og
   omegn. Det står som en INDSTILLING og ikke i koden — hver ny
   by ville ellers være en udgivelse hos os.

   ⚠️ OG DER MÅ IKKE STÅ EN PRIS. Designet havde "150 kr. inden
   for 10 km af havnen"; det var et opdigtet tal. Området er
   oplyst, prisen er ikke — og et beløb, vi finder på, er værre
   end ingen pris, for gæsten regner med det.
   ============================================================ */
test.describe('Leveringsområdet', () => {

  function medLevering(omraade, pris) {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, {
      levering: true, bestilling_varsel_timer: 24,
    });
    if (omraade !== undefined) d.indstillinger.leverings_omraade = omraade;
    if (pris !== undefined) d.indstillinger.leverings_pris = pris;
    return d;
  }

  test('området fra admin står på siden', async ({ page }) => {
    await åbnSkal(page, '/h-smorrebrod.html',
      { data: medLevering('Karslunde, Greve, Tune og Solrød') });
    await expect(page.locator('#lev-fakta'))
      .toContainText('Vi leverer i Karslunde, Greve, Tune og Solrød');
    await expect(page.locator('#lev-hint'))
      .toContainText('Karslunde, Greve, Tune og Solrød');
  });

  /* Er feltet tomt i admin, nævner siden intet område — så er vi
     tilbage ved det, der ikke lover noget. */
  test('uden et område nævner siden ikke et', async ({ page }) => {
    await åbnSkal(page, '/h-smorrebrod.html', { data: medLevering('') });
    await expect(page.locator('#lev-fakta')).not.toContainText('Vi leverer i');
    await expect(page.locator('#lev-hint')).toContainText('ringer og aftaler');
  });

  /* ⚠️ DEN VIGTIGSTE I AFSNITTET. Designets opdigtede tal må
     ikke kunne snige sig tilbage — hverken i opmærkningen eller
     i noget, motoren skriver. */
  /* PRISEN ER OGSÅ EJERENS. Skriver han den, står den; lader han
     feltet stå tomt, ringer de og aftaler. */
  test('prisen fra admin står på siden', async ({ page }) => {
    await åbnSkal(page, '/h-smorrebrod.html',
      { data: medLevering('Karslunde, Greve, Tune og Solrød', '150 kr.') });
    await expect(page.locator('#lev-fakta')).toContainText('for 150 kr.');
    await expect(page.locator('#lev-hint')).toContainText('Levering koster 150 kr.');
  });

  /* ⚠️ TOM ER IKKE NUL. Et tomt felt betyder "vi har ikke sat en
     pris" — ikke "gratis". Stod der 0 kr., ville gæsten regne med
     gratis levering. */
  test('uden en pris ringer de og aftaler den', async ({ page }) => {
    await åbnSkal(page, '/h-smorrebrod.html',
      { data: medLevering('Greve', '') });
    await expect(page.locator('#lev-hint')).toContainText('ringer og aftaler prisen');
    await expect(page.locator('#lev-hint')).not.toContainText('0 kr');
    await expect(page.locator('#lev-fakta')).not.toContainText('for ');
  });

  test('der står ingen opfundet pris nogen steder', async ({ page }) => {
    await åbnSkal(page, '/h-smorrebrod.html',
      { data: medLevering('Karslunde, Greve, Tune og Solrød') });
    const tekst = await page.locator('body').innerText();
    expect(tekst).not.toContain('150 kr');
    expect(tekst).not.toContain('10 km');
  });
});

/* ============================================================
   MINDSTEANTALLET ER SMØRREBRØDETS  (30/8)
   ------------------------------------------------------------
   Kundens ord, målt på den udgivne side: "der er en fejl med at
   der står når man bestiller smørbrød ud af huset skal man
   minimum bestille 5 ting — har jeg sat den til, men det gælder
   på alt. Det er en fejl, det er kun smørrebrød."

   Han har ret, og noten ved minStk() i js/bestil-regler.js har
   sagt det siden 23/8. Koden holdt tallet op mod HELE kurven, så
   én burger og en sodavand blev afvist med "der skal mindst
   bestilles 5 stk." Det er "en kommentar er ikke et værn", igen.
   ============================================================ */
test.describe('Mindsteantallet gælder kun smørrebrødet', () => {

  function medFem() {
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 2;
    d.indstillinger.bestilling_min_stk = 5;
    d.indstillinger.bestilbare_kategorier = [1, 6, 9, 12];
    return d;
  }

  async function udfyld(page) {
    await page.locator('#navn').fill('Sara Poulsen');
    await page.locator('#tlf').fill('28871343');
    await page.locator('#tid').selectOption({ index: 1 });
    await page.locator('button.g.solid.blk').click();
  }

  test('én is kan bestilles, selv om ejeren kræver fem smørrebrød', async ({ page }) => {
    await åbn(page, { data: medFem() });

    /* Øl og ikke is: isen kan slet ikke bestilles nogen steder
       (Butik.udvalg filtrerer den fra — "det er altid til
       rådighed"), så kategorien findes ikke i listen. */
    await page.locator('[data-kategori="Øl"]').click();
    await page.locator('[data-vare="Fadøl, lille"] button[data-d="+"]').click();
    await udfyld(page);

    // Den skal IGENNEM — ikke stoppes af smørrebrødets regel.
    await expect(page.locator('#bestil .panel h3')).toContainText('Tak, Sara');
    const gemt = await gemteData(page);
    expect(gemt.bestillinger).toHaveLength(1);
  });

  /* ⚠️ MEN REGLEN GÆLDER STADIG, HVOR DEN HØRER TIL. Fjernes den
     helt, kan ejeren ikke længere sætte et mindsteantal på det,
     køkkenet skal smøre i hånden. */
  test('to stykker smørrebrød bliver stadig afvist', async ({ page }) => {
    await åbn(page, { data: medFem() });

    await page.locator('[data-kategori="Smørrebrød"]').click();
    const række = page.locator('[data-vare="Flæskestegssandwich"]');
    await række.locator('button[data-d="+"]').click();
    await række.locator('button[data-d="+"]').click();
    await udfyld(page);

    await expect(page.locator('#bestil #sumline, #bestil .note').first())
      .toContainText('5 stk. smørrebrød');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);
  });

  /* Og beskeden SIGER smørrebrød. "Der skal mindst bestilles 5
     stk." fik en gæst med én burger til at lede efter fire mere. */
  test('fem stykker smørrebrød går igennem', async ({ page }) => {
    await åbn(page, { data: medFem() });

    await page.locator('[data-kategori="Smørrebrød"]').click();
    const række = page.locator('[data-vare="Flæskestegssandwich"]');
    for (let i = 0; i < 5; i++) await række.locator('button[data-d="+"]').click();
    await udfyld(page);

    await expect(page.locator('#bestil .panel h3')).toContainText('Tak, Sara');
  });
});

/* ============================================================
   JERES BESTILLING: OVERBLIK, MARKERING OG FARVER  (30/8)
   ------------------------------------------------------------
   Kundens ord med sit eget forlæg i hånden: bestillingen skal
   føles "lige så let og nem", man skal "kunne se hvad man har
   bestilt", "det samler sig og giver overblik og regner ud" — og
   "farverne er for ens ift når man bestiller med +'et".
   ============================================================ */
test.describe('Bestillingens overblik', () => {

  function medRet() {
    return data({ indstillinger: {
      dagens_ret: { navn: 'Stegt flæsk', beskrivelse: null, pris: 129 },
    } });
  }

  /* ⚠️ LINJE FOR LINJE, IKKE ET TAL. "3 stk. · 205 kr." er et
     tal, ikke et overblik: har man valgt i fire foldede
     kategorier, kan man ikke se HVAD de tre er uden at folde dem
     ud igen. */
  test('kvitteringen siger hvad der er valgt, ikke bare hvor mange', async ({ page }) => {
    await åbn(page, { data: medRet() });

    await page.locator('[data-vare="Stegt flæsk"] button[data-d="+"]').click();
    await page.locator('[data-kategori="Smørrebrød"]').click();
    const række = page.locator('[data-vare="Flæskestegssandwich"]');
    await række.locator('button[data-d="+"]').click();
    await række.locator('button[data-d="+"]').click();

    const sum = page.locator('#sumline');
    await expect(sum).toContainText('1 × Stegt flæsk');
    await expect(sum).toContainText('2 × Flæskestegssandwich');
    // og den regner: 129 + 2 × 89
    await expect(sum).toContainText('307');
    await expect(sum).toContainText('3 stk.');
  });

  /* ⚠️ DEN HER PRØVE ER VENDT, FØR DEN NÅEDE AT LYVE (30/8).

     Første udgave krævede, at summen sagde "+ det uden pris".
     Den faldt — og det var koden, der havde ret: en vare uden
     pris kan slet ikke komme i kurven (reglen fra 26/8, hvor
     Butik.udvalg lægger den i spoergPris). Grenen i visSum var
     altså død kode, der LIGNEDE et værn.

     Prøven måler nu reglen, der faktisk gælder: varen VISES med
     en vej til telefonen, men den har ingen plusknap. */
  test('en vare uden pris kommer slet ikke i bestillingslisten', async ({ page }) => {
    const d = data();
    d.menu_varer = d.menu_varer.map((v) => (v.id === 1 ? { ...v, pris: null } : v));
    await åbn(page, { data: d });

    /* Varen er ude af listen, og kategorien med den — den havde
       ikke andet at sælge. Gæsten kan stadig LÆSE den på
       menukortet, hvor den står med "spørg"; det er dér, hele
       sortimentet hører hjemme. */
    await expect(page.locator('[data-vare="Flæskestegssandwich"]')).toHaveCount(0);
    await expect(page.locator('[data-kategori="Smørrebrød"]')).toHaveCount(0);
  });

  /* Med syv foldede kategorier kan gæsten ellers ikke se, HVOR
     hun har lagt noget — hun ville skulle folde dem ud én ad
     gangen for at finde de to stykker igen. */
  test('en foldet kategori siger, at der ligger noget i den', async ({ page }) => {
    await åbn(page);

    await page.locator('[data-kategori="Smørrebrød"]').click();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('[data-kategori="Smørrebrød"]').click();   // fold sammen igen

    const hoved = page.locator('[data-kategori="Smørrebrød"]');
    await expect(hoved.locator('.kat-valgt')).toBeVisible();
    await expect(hoved.locator('.kat-valgt')).toHaveText('1 valgt');
    // Og "+ tilføj" viger for tallet — to etiketter om det samme
    await expect(hoved.locator('.add')).toBeHidden();
  });

  /* ⚠️ FARVERNE VAR FOR ENS. MÅLT: knappen var --cream2 i en
     hvid pille oven på en --cream2 række — tre nuancer af den
     samme creme. Prøven læser den BEREGNEDE farve, ikke klassen:
     en regel, der ikke slår igennem, er ingen regel. */
  test('plus-knappen skiller sig ud fra rækken', async ({ page }) => {
    await åbn(page);

    await page.locator('[data-kategori="Smørrebrød"]').click();
    const række = page.locator('[data-vare="Flæskestegssandwich"]');
    const farver = await række.evaluate((r) => {
      const plus = r.querySelector('button[data-d="+"]');
      const g = (el) => getComputedStyle(el).backgroundColor;
      return { plus: g(plus), raekke: g(r) };
    });
    expect(farver.plus, 'plus-knappen har samme farve som rækken')
      .not.toBe(farver.raekke);
    // Den er husets røde og ikke en creme mere
    expect(farver.plus).toMatch(/214,\s*42,\s*58/);
  });

  /* Man kan ikke tælle under nul — og knappen siger det selv,
     i stedet for at se ud som om den kan trykkes. */
  test('minus er slukket, når der ikke er valgt noget', async ({ page }) => {
    await åbn(page);

    await page.locator('[data-kategori="Smørrebrød"]').click();
    const række = page.locator('[data-vare="Flæskestegssandwich"]');
    await expect(række.locator('button[data-d="-"]')).toBeDisabled();
    await række.locator('button[data-d="+"]').click();
    await expect(række.locator('button[data-d="-"]')).toBeEnabled();
  });

  /* ⚠️ DAGENS RET ER HOVEDTINGEN. Kundens ord: den "skal have en
     markør for sig selv, da det er deres hovedting". Prøven
     sammenligner den med en almindelig række — et spørgsmål til
     elementet om dets egen klasse ville bestå, også hvis reglen
     ikke slog igennem. */
  test('dagens ret ser anderledes ud end resten af listen', async ({ page }) => {
    await åbn(page, { data: medRet() });

    const ret = page.locator('[data-vare="Stegt flæsk"]');
    await page.locator('[data-kategori="Smørrebrød"]').click();
    const alm = page.locator('[data-vare="Flæskestegssandwich"]');

    /* ⚠️ BOKSSKYGGEN ALENE MÅLTE INGENTING: designets egen
       .item.hi har haft en anden skygge end .item hele tiden, så
       prøven bestod, også da den nye markør blev pillet ud. Den
       måler nu det, der ER nyt, og den måler det mod en
       ALMINDELIG rækkes mærkat — to uafhængige elementer.

       Mærkatet er husets røde HELE vejen igennem (hvid tekst på
       rød), hvor et almindeligt prismærkat er en 12 %-toning.
       Og båndet i venstre side findes. */
    const maerkat = async (l) => l.locator('.tag').evaluate((e) => {
      const g = getComputedStyle(e);
      return { bg: g.backgroundColor, farve: g.color };
    });
    const retM = await maerkat(ret);
    const almM = await maerkat(alm);
    expect(retM.bg, 'dagens rets mærkat ser ud som et prismærkat').not.toBe(almM.bg);
    expect(retM.bg).toBe('rgb(214, 42, 58)');

    const baand = await ret.evaluate((e) => {
      const f = getComputedStyle(e, '::before');
      return { indhold: f.content, bredde: f.width, bg: f.backgroundColor };
    });
    expect(baand.indhold, 'dagens ret har intet bånd i siden').not.toBe('none');
    expect(baand.bg).toBe('rgb(214, 42, 58)');

    // Og mærkatet siger det med ord
    await expect(ret.locator('.tag')).toContainText('Dagens ret');
  });
});

/* ============================================================
   HVORNÅR KAN HVAD BESTILLES  (30/8)
   ------------------------------------------------------------
   Kundens ord: "køkkenet lukker jo 20.00, så sidste spisning og
   to-go slutter 19.30 af bestillinger, og man skal bestille
   tidligst 30 min in advance når det er to-go — udover bord, der
   er det 15 min." Og: "morgenmad kun 10-12.30 og derefter alt
   andet ... man skal ikke kunne bestille en dagensret eller en
   burger klokken 10.00, det er først efter 12.30."
   ============================================================ */
test.describe('Tidsmodellen', () => {

  function medTider(ændringer) {
    const d = grunddata();
    d.menu_kategorier = [
      { id: 1, afdeling: 'mad', navn: 'Smørrebrød', sortering: 6, aktiv: true },
      { id: 2, afdeling: 'mad', navn: 'Morgenmad', sortering: 1, aktiv: true },
      { id: 3, afdeling: 'mad', navn: 'Burgere', sortering: 3, aktiv: true },
    ];
    const v = (id, kat, navn, pris) => ({
      id, kategori_id: kat, navn, beskrivelse: null, pris,
      fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
    });
    d.menu_varer = [v(1, 1, 'Flæskestegssandwich', 89),
      v(2, 2, 'Morgenkomplet', 99), v(3, 3, 'Havneburger', 119)];
    d.indstillinger.bestilbare_kategorier = [1, 2, 3];
    d.indstillinger.varsel_min_togo = 30;
    d.indstillinger.koekken_lukker = '20:00';
    d.indstillinger.sidste_bestilling_min = 30;
    d.indstillinger.kategori_tider = {
      2: { fra: '10:00', til: '12:30' },
      3: { fra: '12:30' },
    };
    Object.assign(d.indstillinger, ændringer || {});
    return d;
  }

  /* Køkkenet lukker 20.00, og sidste bestilling er en halv time
     før. Uden det her sluttede tiderne 20.30 — en halv time før
     LUGEN lukker, som var den gamle regel. */
  test('sidste tid er en halv time før køkkenet lukker', async ({ page }) => {
    await åbn(page, { data: medTider() });
    const tider = await page.$$eval('#tid option', (o) => o.map((e) => e.value));
    expect(tider[tider.length - 1]).toBe('19:30');
  });

  /* ⚠️ URET STÅR KL. 09.00 DANSK TID. Med et varsel på 30
     minutter er den første tid i dag ellers 13.30 (åbnSkal's
     standard er kl. 13), og så findes hverken 11.00 eller 12.30
     i vælgeren — prøven ville måle en tom liste. */
  const MORGEN = '2026-08-07T07:00:00Z';

  test('morgenmaden kan kun bestilles til før 12.30', async ({ page }) => {
    await åbn(page, { data: medTider(), ur: MORGEN });

    await page.locator('#tid').selectOption('11:00');
    await expect(page.locator('[data-kategori="Morgenmad"]')).toHaveCount(1);

    await page.locator('#tid').selectOption('13:00');
    await expect(page.locator('[data-kategori="Morgenmad"]')).toHaveCount(0);
    /* ⚠️ OG SIDEN SIGER HVORFOR. En kategori, der bare forsvinder,
       ligner en fejl — og gæsten leder efter morgenmaden i stedet
       for at vælge et andet tidspunkt. */
    await expect(page.locator('#lukkede')).toContainText('Morgenmad');
    await expect(page.locator('#lukkede')).toContainText('12:30');
  });

  /* Kundens ord (31/8): "når klokken er over lukke, så lad der
     stå: klokken er over 13, vi sælger ikke morgenmad længere."
     Kl. 13.05 ER 12.30 passeret — grunden skal sige KLOKKEN og
     ikke "kun til kl. 12:30", som beder gæsten vælge et
     tidligere tidspunkt, der ikke findes mere. */
  test('efter lukketid siger linjen klokken, ikke "kun til"', async ({ page }) => {
    await åbn(page, { data: medTider(), ur: '2026-08-07T11:05:00Z' });
    const linje = page.locator('#lukkede');
    await expect(linje).toContainText('Morgenmad');
    await expect(linje).toContainText('klokken er over 12.30');
    await expect(linje).toContainText('sælges ikke mere i dag');
    await expect(linje).not.toContainText('kun til');
  });

  test('burgeren kan først bestilles fra 12.30', async ({ page }) => {
    await åbn(page, { data: medTider(), ur: MORGEN });

    await page.locator('#tid').selectOption('11:00');
    await expect(page.locator('[data-kategori="Burgere"]')).toHaveCount(0);
    await expect(page.locator('#lukkede')).toContainText('Burgere');

    await page.locator('#tid').selectOption('13:00');
    await expect(page.locator('[data-kategori="Burgere"]')).toHaveCount(1);
  });

  /* ⚠️ DET, DER ER TALT OP, MÅ IKKE BLIVE HÆNGENDE USYNLIGT.
     Skifter gæsten fra 11.00 til 13.00, er morgenmaden væk fra
     skærmen — og bliver den i kurven, betaler hun for mad,
     køkkenet ikke laver på det tidspunkt. */
  test('et skift i tiden rydder det, der ikke kan bestilles mere', async ({ page }) => {
    await åbn(page, { data: medTider(), ur: MORGEN });

    await page.locator('#tid').selectOption('11:00');
    await page.locator('[data-kategori="Morgenmad"]').click();
    await page.locator('[data-vare="Morgenkomplet"] button[data-d="+"]').click();
    await expect(page.locator('#sumline')).toContainText('Morgenkomplet');

    await page.locator('#tid').selectOption('13:00');
    await expect(page.locator('#sumline'), 'morgenmaden blev hængende i kurven')
      .not.toContainText('Morgenkomplet');
  });

  /* ⚠️ SMØRREBRØDETS DØGN GATER IKKE HELE FORMULAREN LÆNGERE.
     bestilling_varsel_timer er smørrebrødets, og med 24 timer sat
     kunne gæsten ikke bestille en burger til i dag overhovedet.
     Varslet er kanalens 30 minutter nu; kategorien kan have sit
     eget. */
  test('en burger kan bestilles i dag, selv med et døgns varsel sat', async ({ page }) => {
    const d = medTider({ bestilling_varsel_timer: 24 });
    await åbn(page, { data: d });

    const dage = await page.$$eval('#dato option', (o) => o.map((e) => e.value));
    expect(dage[0], 'i dag faldt ud af dagene').toBe('2026-08-07');
  });

  /* Uden ejerens minut-varsel gælder det gamle i timer — ellers
     ville hver forretning, der ikke kender felterne, pludselig
     tage imod en bestilling om en halv time. */
  test('uden ejerens minut-varsel gælder det gamle i timer', async ({ page }) => {
    const d = medTider();
    delete d.indstillinger.varsel_min_togo;
    d.indstillinger.bestilling_varsel_timer = 24;
    await åbn(page, { data: d });

    const dage = await page.$$eval('#dato option', (o) => o.map((e) => e.value));
    expect(dage[0], 'det gamle døgn blev ignoreret').toBe('2026-08-08');
  });

  /* ⚠️ GUL OG RØD, NÅR DER ER TRAVLT MED AT NÅ DET. Kundens ord:
     "hvis de er tæt på, blinker en gul eller rød." */
  test('tæt på sidste bestilling bliver linjen gul og så rød', async ({ page }) => {
    // Kl. 18.30 dansk tid: 60 minutter til sidste bestilling 19.30
    await åbn(page, { data: medTider(), ur: '2026-08-07T16:30:00Z' });
    const linje = page.locator('#sidste-kald');
    await expect(linje).toBeVisible();
    await expect(linje).toHaveClass(/gul/);
    await expect(linje).toContainText('19.30');

    // Kl. 19.00: en halv time tilbage
    await åbn(page, { data: medTider(), ur: '2026-08-07T17:00:00Z' });
    await expect(page.locator('#sidste-kald')).toHaveClass(/roed/);

    /* ⚠️ OG EFTER SIDSTE BESTILLING SIGER DEN DET. Kl. 19.45 er i
       dag faldet UD af dagvælgeren — der er ikke tid til en
       bestilling mere — og uden linjen stod gæsten med en dag,
       der var hoppet til i morgen uden en forklaring. */
    await åbn(page, { data: medTider(), ur: '2026-08-07T17:45:00Z' });
    const efter = page.locator('#sidste-kald');
    await expect(efter).toHaveClass(/roed/);
    await expect(efter).toContainText('var kl. 19.30');
  });

  test('midt på dagen står der ingen advarsel', async ({ page }) => {
    await åbn(page, { data: medTider() });
    const linje = page.locator('#sidste-kald');
    await expect(linje).toHaveCount(1);
    await expect(linje).toBeHidden();
  });
});

/* ============================================================
   EMBALLAGE VED TO-GO  (30/8)
   ------------------------------------------------------------
   Kundens ord: "emballage tillæg ved to-go skal vi have."
   ============================================================ */
test.describe('Emballage', () => {

  function medEmballage(ændringer) {
    const d = data();
    d.indstillinger.spis_her = true;
    d.indstillinger.emballage_pris = 10;
    Object.assign(d.indstillinger, ændringer || {});
    return d;
  }

  async function laegIKurven(page) {
    await page.locator('[data-kategori="Smørrebrød"]').click();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
  }

  test('to portioner ud af huset koster to gange emballage', async ({ page }) => {
    await åbn(page, { data: medEmballage() });
    await laegIKurven(page);

    const sum = page.locator('#sumline');
    await expect(sum).toContainText('emballage 2 × 10');
    // 2 × 89 + 2 × 10
    await expect(sum).toContainText('198');
  });

  /* ⚠️ ALDRIG VED SPIS HER. Maden bæres ud på en tallerken, og et
     gebyr dér ville være penge for noget, gæsten ikke får. */
  test('spis her koster ingen emballage', async ({ page }) => {
    await åbn(page, { data: medEmballage() });
    await laegIKurven(page);
    await page.locator('[data-seg="how"] button').nth(1).click();

    const sum = page.locator('#sumline');
    await expect(sum).not.toContainText('emballage');
    await expect(sum).toContainText('178');
  });

  /* ⚠️ TOM PRIS = INGEN EMBALLAGE. Vi finder ikke på et tal på
     forretningens vegne. */
  test('uden en pris er der ingen emballage', async ({ page }) => {
    const d = medEmballage();
    delete d.indstillinger.emballage_pris;
    await åbn(page, { data: d });
    await laegIKurven(page);

    await expect(page.locator('#sumline')).not.toContainText('emballage');
    await expect(page.locator('#sumline')).toContainText('178');
  });

  /* En sodavand skal sjældent pakkes; en portion pommes skal.
     Peger ejeren på kategorier, gælder den kun dem. */
  test('kun de kategorier, ejeren har peget på', async ({ page }) => {
    // Kun kategori 9 (Øl) koster emballage — smørrebrødet gør ikke
    await åbn(page, { data: medEmballage({ emballage_kategorier: [9] }) });
    await laegIKurven(page);

    await expect(page.locator('#sumline')).not.toContainText('emballage');

    await page.locator('[data-kategori="Øl"]').click();
    await page.locator('[data-vare="Fadøl, lille"] button[data-d="+"]').click();
    await expect(page.locator('#sumline')).toContainText('emballage 1 × 10');
  });

  /* ⚠️ EMBALLAGEN ER EN LINJE, IKKE ET SKJULT TILLÆG. Køkkenet
     skal kunne se, at der skal pakkes to portioner, og kassen skal
     kunne se, hvad totalen består af. */
  test('den følger med bestillingen som sin egen linje', async ({ page }) => {
    await åbn(page, { data: medEmballage({ emballage_navn: 'Bakke' }) });
    await laegIKurven(page);
    await page.locator('#navn').fill('Sara Poulsen');
    await page.locator('#tlf').fill('28871343');
    await page.locator('#tid').selectOption({ index: 1 });
    await page.locator('button.g.solid.blk').click();

    const b = (await gemteData(page)).bestillinger[0];
    const emb = b.linjer.filter((l) => l.navn === 'Bakke')[0];
    expect(emb, 'emballagen fulgte ikke med').toBeTruthy();
    expect(emb.antal).toBe(2);
    expect(emb.pris).toBe(10);
  });
});
