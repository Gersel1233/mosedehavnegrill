/* BYG DIN IS — ISENS EGET BESTILLINGSFORLØB  (25. sep 2026)

   Kundens ord: *"når jeg bestiller 1 vaffel med 1 kugle, så kan
   jeg ikke vælge kuglen — det er jo forkert ... start med vaffel,
   hvor mange kugler du vil have, +1 okay hvad smag, bam +2 hvad
   smag, skal du have andet."*

   ⚠️ DEN MÅLTE ÅRSAG var ikke "1 kugle". Den vare FIK sin vælger.
   Fejlen var, at ejerens smagsliste ikke fandtes i produktionen,
   og så forsvandt hele spørgsmålet TAVST. Derfor har prøven
   "uden ejerens liste siger trin 3 det højt" lige så meget vægt
   som de andre — den vogter selve rettelsen.

   Fiksturet er ejerens rigtige is: fire kugleis 35/45/55/65 med
   valget Vaffel/Bæger/Glutenfri vaffel (+3), softice, og tre
   tilkøb. Tallene i prøverne kommer derfra. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

const UR = '2026-08-07T11:00:00Z';
const VALG = ['Vaffel', 'Bæger', { navn: 'Glutenfri vaffel', tillaeg: 3 }];
const IS_KAT = 6;                 // grunddata: "Softice og vafler", afdeling is

function data(smage) {
  const d = grunddata();
  d.indstillinger.bestilbare_kategorier = [1, IS_KAT, 9];
  d.indstillinger.bestilling_varsel_timer = 2;
  if (smage !== null) d.indstillinger.is_smage = smage || 'Vanilje\nJordbær\nLakrids';
  const b = { beskrivelse: null, fremhaevet: false, udsolgt: false, aktiv: true };
  d.menu_varer.push(
    { id: 9001, kategori_id: IS_KAT, navn: '1 kugle', pris: 35, valg: VALG, sortering: 1, ...b },
    { id: 9002, kategori_id: IS_KAT, navn: '2 kugler', pris: 45, valg: VALG, sortering: 2, ...b },
    { id: 9003, kategori_id: IS_KAT, navn: '3 kugler', pris: 55, valg: VALG, sortering: 3, ...b },
    { id: 9005, kategori_id: IS_KAT, navn: 'Softice, lille', pris: 37, valg: VALG, sortering: 5, ...b },
    { id: 9006, kategori_id: IS_KAT, navn: 'Ekstra kugle', pris: 12, sortering: 6, ...b },
    { id: 9007, kategori_id: IS_KAT, navn: 'Strøssel, topping eller guf', pris: 8, sortering: 7, ...b });
  return d;
}

async function åbn(page, smage) {
  await åbnSkal(page, '/index.html', { ur: UR, data: data(smage) });
  await page.waitForSelector('.isbyg-blok');
}

const trin = (page, nr) => page.locator(`.isbyg-trin[data-trin="${nr}"]`);
const knapMed = (page, nr, tekst) =>
  trin(page, nr).locator('.isbyg-knap').filter({ hasText: tekst }).first();

async function sendBestilling(page) {
  await page.locator('#navn').fill('Sara Poulsen');
  await page.locator('#tlf').fill('28871343');
  await page.locator('#tid').selectOption({ index: 1 });
  await page.locator('button.g.solid.blk').filter({ hasText: 'Send' }).click();
}

test.describe('Byg din is', () => {

  /* ⚠️ KUNDENS EGEN FEJLMELDING, ORD FOR ORD: "1 vaffel med 1
     kugle — så kan jeg ikke vælge kuglen". Med ÉN kugle er der
     ingen nummerering at hænge den på, og det var netop dér, den
     gamle model var svagest. */
  test('1 vaffel med 1 kugle kan vælge sin smag', async ({ page }) => {
    await åbn(page);
    await knapMed(page, 1, 'Vaffel').click();
    await trin(page, 2).locator('.isbyg-knap[data-vare="1 kugle"]').click();

    await expect(trin(page, 3).locator('.isbyg-smag'),
      'én kugle fik ingen smagsvælger').toHaveCount(1);
    await trin(page, 3).locator('.isbyg-smag').selectOption('Jordbær');

    await expect(page.locator('.isbyg-laeg')).toContainText('35');
    await page.locator('.isbyg-laeg').click();
    await sendBestilling(page);
    await expect(page.locator('.kvit-titel')).toContainText('Tak, Sara');

    const l = (await gemteData(page)).bestillinger[0].linjer
      .filter((x) => x.navn === '1 kugle');
    expect(l.length, 'isen nåede ikke køkkenet').toBe(1);
    expect(l[0].variant).toBe('Vaffel');
    expect(l[0].smage, 'smagen fulgte ikke med').toEqual(['Jordbær']);
    expect(l[0].pris).toBe(35);
  });

  /* ⚠️ DET, DER FAKTISK VAR GALT. Uden ejerens liste forsvandt
     spørgsmålet TAVST, og gæsten fik en is uden smag uden at vide
     det. Nu står der en besked — og bestillingen kan stadig
     sendes, for et krav, ejeren ikke kan opfylde, ville lukke
     hele isen. */
  test('uden ejerens smagsliste siger trin 3 det højt — og spærrer ikke', async ({ page }) => {
    await åbn(page, null);
    await knapMed(page, 1, 'Vaffel').click();
    await trin(page, 2).locator('.isbyg-knap[data-vare="2 kugler"]').click();

    /* ⚠️ INGEN RULLELISTE — men heller ikke et tomt trin. Mikkels
       valg 25/9: et frit ønskefelt, som IKKE er obligatorisk. */
    await expect(trin(page, 3).locator('.isbyg-smag'),
      'der blev spurgt med en rulleliste uden en liste').toHaveCount(0);
    await expect(trin(page, 3).locator('.isbyg-oenske-felt'),
      'spørgsmålet forsvandt — præcis den fejl, der blev meldt')
      .toHaveCount(1);

    /* Isen kan sendes UDEN at skrive noget ... */
    await expect(page.locator('.isbyg-laeg')).toBeEnabled();
    /* ... men skriver hun noget, følger det med hele vejen til
       køkkenet — som en smag, ikke som en fjerde slags data. */
    await trin(page, 3).locator('.isbyg-oenske-felt').fill('Vanilje og lakrids');
    await page.locator('.isbyg-laeg').click();
    await sendBestilling(page);
    await expect(page.locator('.kvit-titel')).toContainText('Tak, Sara');

    const l = (await gemteData(page)).bestillinger[0].linjer
      .filter((x) => x.navn === '2 kugler');
    expect(l[0].smage, 'ønsket nåede ikke linjen').toEqual(['Vanilje og lakrids']);
  });

  /* Rækkefølgen ER forløbet: et trin, man ikke kan svare på endnu,
     er dæmpet og slukket — ikke skjult, så man kan se, hvor mange
     skridt der er tilbage. */
  test('man kan ikke svare på trin 2, før trin 1 er svaret', async ({ page }) => {
    await åbn(page);
    await expect(trin(page, 2)).toHaveClass(/laast/);
    await expect(trin(page, 2).locator('.isbyg-knap').first()).toBeDisabled();
    /* Låst betyder dæmpet, ikke væk. */
    await expect(trin(page, 2)).toBeVisible();

    await knapMed(page, 1, 'Bæger').click();
    await expect(trin(page, 2)).not.toHaveClass(/laast/);
    await expect(trin(page, 2).locator('.isbyg-knap').first()).toBeEnabled();
  });

  /* ⚠️ EN SLUKKET KNAP UDEN EN GRUND er en gæst, der trykker tre
     gange og går. */
  test('knappen siger, hvad der mangler — ikke bare "Læg i kurven" i gråt', async ({ page }) => {
    await åbn(page);
    const knap = page.locator('.isbyg-laeg');
    await expect(knap).toContainText('Vælg vaffel eller bæger');
    await knapMed(page, 1, 'Vaffel').click();
    await expect(knap).toContainText('Vælg hvor mange kugler');
    await trin(page, 2).locator('.isbyg-knap[data-vare="2 kugler"]').click();
    await expect(knap).toContainText('Vælg smag');
    await expect(knap).toBeDisabled();
  });

  /* ⚠️ PRISEN ER EJERENS EGEN. Tillægget på den glutenfri vaffel
     er hans, ikke et tal her: 45 + 3. Og tilkøbet lægges oveni. */
  test('prisen er varens egen — glutenfri vaffel og tilkøb lægges til', async ({ page }) => {
    await åbn(page);
    await knapMed(page, 1, 'Glutenfri vaffel').click();
    await trin(page, 2).locator('.isbyg-knap[data-vare="2 kugler"]').click();
    /* ⚠️ BELØBET LÆSES I SUMLINJEN, IKKE PÅ KNAPPEN. Knappen siger
       med vilje HVAD DER MANGLER, indtil isen er færdig — se prøven
       ovenfor. Den her prøve målte altså den forkerte tekst. */
    await expect(page.locator('.isbyg-sum'), '45 + 3 for den glutenfri').toContainText('48');

    await trin(page, 3).locator('.isbyg-smag').nth(0).selectOption('Vanilje');
    await trin(page, 3).locator('.isbyg-smag').nth(1).selectOption('Lakrids');
    await trin(page, 4).locator('.isbyg-knap').filter({ hasText: 'Strøssel' }).click();
    await expect(page.locator('.isbyg-sum'), '45 + 3 + 8').toContainText('56');
    /* Og NU siger knappen beløbet, fordi isen er komplet. */
    await expect(page.locator('.isbyg-laeg')).toContainText('56');

    await page.locator('.isbyg-laeg').click();
    await sendBestilling(page);
    const linjer = (await gemteData(page)).bestillinger[0].linjer;
    const is = linjer.find((l) => l.navn === '2 kugler');
    const top = linjer.find((l) => l.navn === 'Strøssel, topping eller guf');
    expect(is.pris, 'tillægget nåede ikke linjen').toBe(48);
    expect(top.pris).toBe(8);
  });

  /* ⚠️ TO IS MED HVER SIN SMAG ER TO LINJER. Lagde de sig sammen
     som antal 2, ville køkkenet lave to ens — og gæsten få en is,
     hun ikke har bestilt. */
  test('to is med hver sin smag bliver to linjer', async ({ page }) => {
    await åbn(page);
    async function byg(smag) {
      await knapMed(page, 1, 'Vaffel').click();
      await trin(page, 2).locator('.isbyg-knap[data-vare="1 kugle"]').click();
      await trin(page, 3).locator('.isbyg-smag').selectOption(smag);
      await page.locator('.isbyg-laeg').click();
    }
    await byg('Vanilje');
    await byg('Lakrids');

    await sendBestilling(page);
    const l = (await gemteData(page)).bestillinger[0].linjer
      .filter((x) => x.navn === '1 kugle');
    expect(l.length, 'de to is blev slået sammen til én linje').toBe(2);
    expect(l.map((x) => (x.smage || []).join('')).sort()).toEqual(['Lakrids', 'Vanilje']);
    expect(l.reduce((a, x) => a + x.pris * x.antal, 0), 'to gange 35').toBe(70);
  });

  /* ⚠️ ISEN LIGGER FOR SIG OG NEDERST (kundens ord: "lad hele
     is-blokken ryge ned og stå som en eksklusiv ting"). Så længe
     den var en kategori mellem de andre, var den en fold som
     pølser og øl. */
  test('isen er sin egen blok nederst — ikke en fold mellem de andre', async ({ page }) => {
    await åbn(page);
    /* Ingen is-kategori i den almindelige liste. */
    await expect(page.locator('#bestil .item[data-afd="is"]'),
      'isen står stadig som en almindelig kategorirække').toHaveCount(0);

    const plads = await page.evaluate(() => {
      const liste = document.querySelector('[data-liste]');
      const b = liste.querySelector('.isbyg-blok');
      const alle = Array.prototype.slice.call(liste.children);
      return { nr: alle.indexOf(b), ialt: alle.length };
    });
    expect(plads.nr, 'is-blokken blev ikke tegnet').toBeGreaterThan(-1);
    expect(plads.nr, 'isen står ikke nederst i listen').toBe(plads.ialt - 1);
  });

  /* Vejen til hele sortimentet — kundens ord: "på bestil is skal
     også være se hele is-sortimentet og linke perfekt og korrekt
     op til de andre steder". Målet skal FINDES på menukortet. */
  test('"Se hele is-sortimentet" peger på et mål, der findes', async ({ page }) => {
    await åbn(page);
    const link = page.locator('.isbyg-blok-link');
    await expect(link).toHaveAttribute('href', 'm-menukort.html#afsnit-is');
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#afsnit-is'),
      'linket peger på et afsnit, menukortet ikke har').toHaveCount(1);
  });
});

/* ============================================================
   ET FORLØB PR. SLAGS IS  (25/9)
   ------------------------------------------------------------
   Mikkels ord: *"hvis jeg vil vælge en isboks, skal det være et
   andet bestillingsflow ... den her skal have noget anderledes, og
   de her skal også have noget anderledes"* — og *"man skal heller
   ikke betale for emballage på isene"*.

   Fiksturet er kort 05's egne linjer og tekster: isboksen til 90
   med "Tag med på turen — 6 valgfrie kugler", en bubblewaffle med
   "2 kugler eller softice", en sundae, en affogato og en løs
   vaffel. INGEN is_opsaetning: prøverne måler det, siden læser af
   navnene alene — den dag, ejeren opretter en ny vare og ikke
   rører "Is & sødt" i admin.
   ============================================================ */
test.describe('Et forløb pr. slags is', () => {

  const IS_KUGLE = 60;              // en is-kategori FØR "Softice og vafler"

  function alt(smage, ekstra) {
    const d = data(smage);
    d.indstillinger.bestilbare_kategorier.push(IS_KUGLE);
    d.menu_kategorier.push(
      { id: IS_KUGLE, afdeling: 'is', navn: 'Kugleis', sortering: 10, aktiv: true });
    const b = { fremhaevet: false, udsolgt: false, aktiv: true };
    d.menu_varer.push(
      { id: 9020, kategori_id: IS_KAT, navn: 'Isboks, ca. 6 kugler eller softice', pris: 90,
        beskrivelse: 'Tag med på turen — 6 valgfrie kugler', sortering: 20, ...b },
      { id: 9021, kategori_id: IS_KAT, navn: 'Bubblewaffle, 2 kugler eller softice', pris: 67,
        beskrivelse: 'Inkl. drys og sovs', sortering: 5, ...b },
      { id: 9022, kategori_id: IS_KAT, navn: 'Sundae med sauce og topping', pris: 45,
        beskrivelse: null, sortering: 4, ...b },
      { id: 9023, kategori_id: IS_KAT, navn: 'Affogato', pris: 65,
        beskrivelse: 'Espresso med vaniljeis og nødder', sortering: 30, ...b },
      { id: 9024, kategori_id: IS_KAT, navn: 'Løs vaffel', pris: 7,
        beskrivelse: null, sortering: 31, ...b },
      /* Kortets rækkefølge: Kugleis (10) står før Softice og vafler
         (11) — også selv om varens egen sortering er højere. */
      { id: 9025, kategori_id: IS_KUGLE, navn: 'Havnens café-is', pris: 79,
        beskrivelse: '3 kugler, softice-top, guf, flødeskum og syltetøj', sortering: 21, ...b },
      /* Som på kort 05 står kugleisen i vaffel i SAMME kategori som
         café-isen — ellers var kategorien en uden størrelser, og så
         sælges alt i den løst. */
      { id: 9026, kategori_id: IS_KUGLE, navn: '4 kugler', pris: 65, valg: VALG,
        beskrivelse: null, sortering: 4, ...b });
    Object.assign(d.indstillinger, ekstra || {});
    return d;
  }

  async function åbnAlt(page, smage, ekstra) {
    await åbnSkal(page, '/index.html', { ur: UR, data: alt(smage, ekstra) });
    await page.waitForSelector('.isbyg-blok');
  }

  const slag = (page, id) => page.locator(`.isbyg-slag[data-slag="${id}"]`);
  const tæl = (page, smag) => page.locator(`.isbyg-tael[data-smag="${smag}"]`);
  const plus = (page, smag) => tæl(page, smag).locator('.isbyg-tael-knap').last();

  /* ⚠️ SEKS RULLELISTER EFTER HINANDEN er seks tryk og seks lister
     at læse på en telefon. En isboks er ét antal, der fordeles —
     og den kan ikke blive fuldere end fuld: kan man trykke en
     syvende kugle ind i en boks til seks, skal køkkenet vælge,
     hvilken der ikke kommer med. */
  test('isboksen fordeler seks kugler på smagene — og kan ikke blive fuldere end fuld', async ({ page }) => {
    await åbnAlt(page);
    await slag(page, 'boks').click();

    await expect(page.locator('.isbyg-beskriv'), 'boksen sagde ikke, hvad den er')
      .toContainText('6 valgfrie kugler');
    await page.locator('.isbyg-knap[data-form="kugler"]').click();

    const knap = page.locator('.isbyg-laeg');
    await expect(page.locator('.isbyg-status')).toHaveText('0 af 6 kugler valgt');
    await expect(knap).toHaveText('Fordel 6 kugler på smagene');
    await expect(knap).toBeDisabled();

    for (let i = 0; i < 4; i++) await plus(page, 'Vanilje').click();
    for (let i = 0; i < 2; i++) await plus(page, 'Jordbær').click();

    await expect(page.locator('.isbyg-status')).toHaveText('6 af 6 kugler valgt');
    for (const s of ['Vanilje', 'Jordbær', 'Lakrids']) {
      await expect(plus(page, s), `der kunne trykkes en syvende kugle ind (${s})`).toBeDisabled();
    }
    await expect(knap).toBeEnabled();
    await expect(knap).toContainText('90');
    await knap.click();

    /* Kvitteringen tæller for køkkenet — ikke seks ord at tælle. */
    await expect(page.locator('.isbyg-kvit')).toContainText('4× Vanilje + 2× Jordbær');

    await sendBestilling(page);
    const l = (await gemteData(page)).bestillinger[0].linjer
      .filter((x) => x.navn === 'Isboks, ca. 6 kugler eller softice');
    expect(l.length, 'isboksen nåede ikke køkkenet').toBe(1);
    expect(l[0].smage).toEqual(['Vanilje', 'Vanilje', 'Vanilje', 'Vanilje', 'Jordbær', 'Jordbær']);
    expect(l[0].pris).toBe(90);
  });

  /* "eller softice" står i boksens navn: så er softice et svar, og
     softice har ingen smag at vælge. */
  test('isboksen med softice spørger ikke om smag', async ({ page }) => {
    await åbnAlt(page);
    await slag(page, 'boks').click();
    await page.locator('.isbyg-knap[data-form="softice"]').click();

    await expect(page.locator('.isbyg-tael:visible'), 'der blev spurgt om smag til softice')
      .toHaveCount(0);
    await expect(page.locator('.isbyg-laeg')).toBeEnabled();
    await page.locator('.isbyg-laeg').click();

    await sendBestilling(page);
    const l = (await gemteData(page)).bestillinger[0].linjer
      .find((x) => x.navn === 'Isboks, ca. 6 kugler eller softice');
    expect(l.smage).toEqual(['Softice']);
  });

  /* En ret uden kugler er ét tryk; en ret med kugler spørger om
     deres smag PÅ SIT EGET KORT — ikke i et fælles trin længere
     nede, hvor gæsten skal regne ud, hvilken ret spørgsmålet
     gælder. */
  test('en dessert uden kugler er ét tryk — en med kugler spørger på sit eget kort', async ({ page }) => {
    await åbnAlt(page);
    await slag(page, 'dessert').click();

    const sundae = page.locator('.isbyg-dessert[data-vare="Sundae med sauce og topping"]');
    await expect(sundae.locator('.isbyg-tag')).toHaveText('Læg i kurven');
    await sundae.locator('.isbyg-tag').click();
    await expect(page.locator('.isbyg-kvit')).toContainText('Sundae med sauce og topping');

    const bw = page.locator('.isbyg-dessert[data-vare="Bubblewaffle, 2 kugler eller softice"]');
    await expect(bw, 'retten sagde ikke, hvad den er').toContainText('Inkl. drys og sovs');
    await expect(bw.locator('.isbyg-tag')).toHaveText('Vælg');
    await bw.locator('.isbyg-tag').click();
    await bw.locator('.isbyg-knap[data-form="kugler"]').click();

    const vælgere = bw.locator('select.isbyg-smag');
    await expect(vælgere, '"2 kugler" gav ikke to vælgere på kortet').toHaveCount(2);
    const knap = bw.locator('.isbyg-laeg');
    await expect(knap).toHaveText('Vælg smag til alle kuglerne');
    await vælgere.nth(0).selectOption('Jordbær');
    await vælgere.nth(1).selectOption('Lakrids');
    await expect(knap).toContainText('67');
    await knap.click();

    await sendBestilling(page);
    const linjer = (await gemteData(page)).bestillinger[0].linjer;
    expect(linjer.find((x) => x.navn === 'Sundae med sauce og topping').pris).toBe(45);
    const l = linjer.find((x) => x.navn === 'Bubblewaffle, 2 kugler eller softice');
    expect(l.smage).toEqual(['Jordbær', 'Lakrids']);
    expect(l.pris).toBe(67);
  });

  /* ⚠️ EN RET FOR SIG ER ALDRIG TILBEHØR PÅ EN VAFFEL. Målt 25/9
     mod produktionens 26 is-varer: ni retter til 45-79 kr. —
     Affogato, Sundae, churros, pandekager — stod i "Noget mere?"
     som noget, man lægger oven på en kugle. En gæst, der ville have
     en affogato, skulle først vælge en vaffel. */
  test('en ret for sig står aldrig som tilbehør på en vaffel', async ({ page }) => {
    await åbnAlt(page);
    await knapMed(page, 1, 'Vaffel').click();
    await trin(page, 2).locator('.isbyg-knap[data-vare="1 kugle"]').click();

    const t4 = trin(page, 4);
    await expect(t4.locator('.isbyg-knap').filter({ hasText: 'Ekstra kugle' })).toHaveCount(1);
    await expect(t4.locator('.isbyg-knap').filter({ hasText: 'Strøssel' })).toHaveCount(1);
    for (const n of ['Affogato', 'Sundae', 'Havnens café-is', 'Løs vaffel']) {
      await expect(t4.locator('.isbyg-knap').filter({ hasText: n }),
        `"${n}" stod som noget, man lægger oven på en is`).toHaveCount(0);
    }
  });

  /* Samme rækkefølge som kortet: kategorien først, så varen. Den
     første udgave sorterede på varens egen sortering alene, så
     "Havnens café-is" (Kugleis, 21) stod under alt fra softice-
     kategorien — og admin viste den et andet sted end siden. */
  test('desserterne står i kortets rækkefølge — kategorien først', async ({ page }) => {
    await åbnAlt(page);
    await slag(page, 'dessert').click();
    const navne = await page.locator('.isbyg-dessert .isbyg-dessert-navn').allTextContents();
    expect(navne[0], 'kategoriens plads på kortet blev ikke fulgt').toBe('Havnens café-is');
  });

  /* ⚠️ ISEN PAKKES ALDRIG. Målt i produktionen: emballage_kategorier
     er tom, og tom betyder "alt ud af huset" — så hver is til
     afhentning fik 10 kr. i emballage. Maden ved siden af skal
     stadig have sin: reglen er isens, ikke bestillingens. */
  test('isen koster ingen emballage — maden ved siden af gør', async ({ page }) => {
    await åbnAlt(page, undefined, { emballage_pris: 10 });
    await knapMed(page, 1, 'Vaffel').click();
    await trin(page, 2).locator('.isbyg-knap[data-vare="1 kugle"]').click();
    await trin(page, 3).locator('.isbyg-smag').selectOption('Vanilje');
    await page.locator('.isbyg-laeg').click();
    await slag(page, 'boks').click();
    await page.locator('.isbyg-knap[data-form="softice"]').click();
    await page.locator('.isbyg-laeg').click();

    const sum = page.locator('#sumline');
    await expect(sum).toContainText('125');
    await expect(sum, 'isen fik emballage lagt oveni').not.toContainText('emballage');

    await page.locator('[data-kategori="Smørrebrød"]').click();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await expect(sum, 'maden mistede sin emballage').toContainText('emballage 1 × 10');
  });

  /* ⚠️ FIRE FLISER PÅ EN TELEFON ER TO OG TO. Første udgave stod én
     pr. række og 150 px høje — fire skærmhøjder væk fra selve isen,
     før gæsten havde valgt noget. */
  test('de fire slags står to og to — og fylder ikke skærmen', async ({ page }) => {
    await åbnAlt(page);
    const f = page.locator('.isbyg-slag');
    await expect(f).toHaveCount(4);
    const k = [];
    for (let i = 0; i < 4; i++) k.push(await f.nth(i).boundingBox());
    expect(Math.abs(k[0].y - k[1].y), 'de to første står ikke på samme række').toBeLessThan(2);
    for (const b of k) expect(b.height, 'en flise er for høj').toBeLessThanOrEqual(96);
  });
});
