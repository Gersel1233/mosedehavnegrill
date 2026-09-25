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
