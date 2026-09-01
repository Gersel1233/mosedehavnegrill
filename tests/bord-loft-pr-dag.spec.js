/* HVOR MANGE BORDE MÅ BOOKES PR. DAG?  (1/9)

   Kundens ord: *"det er bare den fane, folk booker bord ... man
   skal bare kunne booke bord til den og den dag, og måske som
   det eneste administrere, hvor mange borde man kan bestille ud
   af de 55 på i dag eller dit og dat dag."*

   Indtil nu kunne ALT bookes. `bord_pladser` var et tal,
   personalet skrev selv, og det blev kun VIST — det spærrede
   ingenting.

   ⚠️ GRUNDTALLET ER BORDENE SELV. Har ejeren ikke sat noget, er
   loftet antallet af AKTIVE borde. De er data, han styrer; et
   hårdkodet 55 ville skulle rettes to steder den dag, han
   nedlægger et bord.

   ⚠️ OG DET RIGTIGE VÆRN LIGGER I DATABASEN. To familier, der
   trykker på det sidste bord i det samme sekund, findes ikke i
   én browser — det prøves i supabase/proev-bord-loft-pr-dag.sql
   (16 × BESTOD). Her måles det, gæsten og ejeren SER.
*/

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const UR = '2026-08-06T11:00:00Z';   // torsdag 6. august, 13.00 dansk
const IDAG = '2026-08-06';
const IMORGEN = '2026-08-07';

/* Tre borde, ikke femoghalvtreds: et loft på tre kan MÅLES i en
   prøve, og reglen er den samme. Ejerens 55 er data. */
function medBorde(ekstra) {
  const d = grunddata({
    borde: [
      { id: 1, lokation_id: 'mosede', nummer: '1', aktiv: true, sortering: 10 },
      { id: 2, lokation_id: 'mosede', nummer: '2', aktiv: true, sortering: 20 },
      { id: 3, lokation_id: 'mosede', nummer: '3', aktiv: true, sortering: 30 },
    ],
  });
  d.dags_regler = d.dags_regler || [];
  if (ekstra) ekstra(d);
  return d;
}

/* ⚠️ DAGEN PEGES UD PÅ SIN ISO-DATO, IKKE PÅ TEKSTEN. "7. aug"
   rammer også "17. aug." — to knapper for én dag, og prøven
   faldt på strict mode i stedet for på reglen. Samme grund som
   data-vare på menukortets rækker. */
function dagen(page, iso) {
  return page.locator('#bord-dage .dag[data-dato="' + iso + '"]');
}

function booking(n, dato, status) {
  return {
    id: n, lokation_id: 'mosede', reference: 'BO-' + n, navn: 'Gæst ' + n,
    telefon: '2030405' + n, email: null, dato, tid: '18:00',
    antal_personer: 4, besked: null, status: status || 'ny',
    intern_note: null, slettet: null, oprettet: IDAG + 'T08:00:00.000Z',
  };
}

test.describe('Gæsten kan ikke booke en fuld dag', () => {

  test('uden et loft er grundtallet de aktive borde', async ({ page }) => {
    const d = medBorde();
    d.bordbestillinger = [booking(1, IMORGEN), booking(2, IMORGEN)];
    await åbn(page, '/bord/', { ur: UR, data: d });

    /* To af tre er taget — dagen er stadig ledig. */
    await expect(dagen(page, IMORGEN)).not.toHaveClass(/fuld/);
  });

  /* ⚠️ INGEN BORDE OPRETTET = INTET LOFT, IKKE NUL.
     bord/ har taget imod bookinger siden fase 4 — længe før
     tabellen `borde` fandtes. Talte grundtallet nul som et loft,
     ville hele bookingsiden lukke sig selv hos en forretning, der
     ikke har tastet sine borde ind, og ejeren ville ikke kunne se
     hvorfor. Måles begge veje: dagen er ledig, OG bookingen går
     igennem. */
  test('uden oprettede borde kan der stadig bookes', async ({ page }) => {
    const d = grunddata();
    d.borde = [];
    d.bordbestillinger = [booking(1, IMORGEN), booking(2, IMORGEN)];
    await åbn(page, '/bord/', { ur: UR, data: d });

    await expect(dagen(page, IMORGEN)).not.toHaveClass(/fuld/);
    const svar = await page.evaluate(() => Butik.bookBord({
      navn: 'Anna Vind', telefon: '20304050', dato: '2026-08-07',
      tid: '18:00', antal_personer: 4,
    }).then(() => 'gik igennem').catch((e) => e.message));
    expect(svar).toBe('gik igennem');
  });

  test('er alle bordene taget, er dagen fuld', async ({ page }) => {
    const d = medBorde();
    d.bordbestillinger = [booking(1, IMORGEN), booking(2, IMORGEN), booking(3, IMORGEN)];
    await åbn(page, '/bord/', { ur: UR, data: d });

    const dag = dagen(page, IMORGEN);
    await expect(dag).toHaveClass(/fuld/);
    /* ⚠️ ORDET STÅR PÅ KNAPPEN. En grå, gennemstreget dag uden en
       forklaring læses som noget, der er gået i stykker. */
    await expect(dag).toContainText('Fuldt');
    await expect(dag).toBeDisabled();
  });

  /* ⚠️ ET AFSLAG FRIGIVER BORDET IGEN. Ellers ville en aflyst
     booking spærre for en, der gerne vil — samme regel som
     pladserne på et arrangement. */
  test('en afvist booking tæller ikke med', async ({ page }) => {
    const d = medBorde();
    d.bordbestillinger = [booking(1, IMORGEN), booking(2, IMORGEN),
      booking(3, IMORGEN, 'afvist')];
    await åbn(page, '/bord/', { ur: UR, data: d });
    await expect(dagen(page, IMORGEN)).not.toHaveClass(/fuld/);
  });

  test('ejerens almindelige loft slår bordene', async ({ page }) => {
    const d = medBorde((x) => { x.indstillinger.bord_loft_pr_dag = 1; });
    d.bordbestillinger = [booking(1, IMORGEN)];
    await åbn(page, '/bord/', { ur: UR, data: d });
    await expect(dagen(page, IMORGEN)).toHaveClass(/fuld/);
  });

  /* ⚠️ DAGENS EGET LOFT SLÅR DET ALMINDELIGE — det er hele
     pointen med "på i dag eller dit og dat dag". */
  test('dagens eget loft vinder over det almindelige', async ({ page }) => {
    const d = medBorde((x) => {
      x.indstillinger.bord_loft_pr_dag = 3;
      x.dags_regler = [{ id: 1, lokation_id: 'mosede', dato: IMORGEN, bord_loft: 1 }];
    });
    d.bordbestillinger = [booking(1, IMORGEN)];
    await åbn(page, '/bord/', { ur: UR, data: d });
    await expect(dagen(page, IMORGEN)).toHaveClass(/fuld/);
  });

  /* ⚠️ NUL ER IKKE DET SAMME SOM TOMT. Nul lukker dagen, også
     når ingen har booket endnu. Var de to ens, kunne ejeren ikke
     lukke en enkelt lørdag uden at slette hele sit loft. */
  test('nul lukker dagen, selv uden en eneste booking', async ({ page }) => {
    const d = medBorde((x) => {
      x.dags_regler = [{ id: 1, lokation_id: 'mosede', dato: IMORGEN, bord_loft: 0 }];
    });
    await åbn(page, '/bord/', { ur: UR, data: d });
    await expect(dagen(page, IMORGEN)).toHaveClass(/fuld/);
  });

  /* ⚠️ DEN VALGTE DAG MÅ ALDRIG VÆRE EN FULD DAG. Blev den
     stående som valgt, kunne gæsten fylde formularen ud og først
     få nej ved afsendelsen. */
  test('er den første dag fuld, står en ledig dag valgt', async ({ page }) => {
    const d = medBorde((x) => {
      x.dags_regler = [{ id: 1, lokation_id: 'mosede', dato: IDAG, bord_loft: 0 }];
    });
    await åbn(page, '/bord/', { ur: UR, data: d });
    const valgt = page.locator('#bord-dage .dag.valgt');
    await expect(valgt).toHaveCount(1);
    await expect(valgt).not.toHaveClass(/fuld/);
  });

  /* Og værnet skal holde, hvis nogen alligevel når frem: samme
     ord som databasens, så gæsten ikke møder to forskellige
     sætninger for det samme nej. */
  test('en booking på en fuld dag afvises med husets egen besked', async ({ page }) => {
    const d = medBorde((x) => { x.indstillinger.bord_loft_pr_dag = 0; });
    await åbn(page, '/bord/', { ur: UR, data: d });

    const svar = await page.evaluate(() => Butik.bookBord({
      navn: 'Anna Vind', telefon: '20304050', dato: '2026-08-07',
      tid: '18:00', antal_personer: 4,
    }).then(() => 'gik igennem').catch((e) => e.message));

    expect(svar, 'bookingen gik igennem på en fuld dag')
      .toContain('ikke flere borde den dag');
  });
});

test.describe('Ejeren styrer loftet', () => {

  /* ⚠️ TO TALFELTER I TOPPEN AF FANEN LÆSTES SOM ÉT.
     "Pladser i alt" (mennesker) stod ved siden af bookingerne,
     mens loftet (borde) lå i en fold — og kundens ord var, at
     loftet er DET, man administrerer på den her fane. Feltet er
     ikke fjernet; det er flyttet ned til det andet tal. Prøven
     holder fast i begge dele: fanen har ét felt færre i toppen,
     og pladserne kan stadig sættes. */
  test('pladserne står sammen med loftet, ikke øverst på fanen', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: medBorde() });
    await visFane(page, 'p-borde');
    await expect(page.locator('#bord-pladser')).toBeHidden();
    await page.locator('#bord-loft-kort summary').click();
    await expect(page.locator('#bord-pladser')).toBeVisible();
  });

  test('feltet siger, hvad der gælder lige nu', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: medBorde() });
    await visFane(page, 'p-borde');
    await page.locator('#bord-loft-kort summary').click();
    /* Uden et loft er svaret bordene selv — ikke et tal, vi har
       fundet på. */
    await expect(page.locator('#bord-loft-nu')).toContainText('alle 3 aktive borde');
  });

  test('et almindeligt loft gemmes og står i linjen', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: medBorde() });
    await visFane(page, 'p-borde');
    await page.locator('#bord-loft-kort summary').click();
    await page.locator('#bord-loft-alle').fill('2');
    await page.locator('#gem-bord-loft').click();

    await expect(page.locator('#kvittering')).toContainText('Højst 2 borde pr. dag');
    expect((await gemteData(page)).indstillinger.bord_loft_pr_dag).toBe(2);
  });

  test('en enkelt dag kan få sit eget loft', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: medBorde() });
    await visFane(page, 'p-borde');
    await page.locator('#bord-loft-kort summary').click();
    await page.locator('#bord-loft-dato').fill(IMORGEN);
    await page.locator('#bord-loft-dag').fill('1');
    await page.locator('#gem-bord-loft-dag').click();

    const regel = (await gemteData(page)).dags_regler
      .filter((r) => r.dato === IMORGEN)[0];
    expect(regel, 'dagsreglen blev ikke oprettet').toBeTruthy();
    expect(regel.bord_loft).toBe(1);
    await expect(page.locator('[data-loftdag="' + IMORGEN + '"]'))
      .toContainText('højst 1 bord');
  });

  /* ⚠️ ET LOFT ALENE MÅ IKKE SLETTE SIN EGEN RÆKKE.
     Butik.skrive.dagsregel sletter rækken, når der "ikke er
     noget særligt" — og uden loftet i den test ville en dag,
     hvor ejeren KUN har sat et bordloft, forsvinde i det sekund,
     den blev gemt. */
  test('en dag med KUN et loft overlever gemningen', async ({ page }) => {
    await åbnAdmin(page, { ur: UR, data: medBorde() });
    await visFane(page, 'p-borde');
    await page.locator('#bord-loft-kort summary').click();
    await page.locator('#bord-loft-dato').fill(IMORGEN);
    await page.locator('#bord-loft-dag').fill('0');
    await page.locator('#gem-bord-loft-dag').click();

    const regler = (await gemteData(page)).dags_regler
      .filter((r) => r.dato === IMORGEN);
    expect(regler, 'rækken blev slettet, fordi et loft ikke talte som "noget særligt"')
      .toHaveLength(1);
    expect(regler[0].bord_loft).toBe(0);
  });

  /* ⚠️ DAGENS BILLEDE SKAL SIGE DET SAMME SOM HJEMMESIDEN.
     Personalet siger ja til bookinger på DEN skærm. Sagde den
     kun "24 af 40 pladser", kunne den se rolig ud på en dag,
     hjemmesiden for længst havde lukket — to skærme, der ved
     hver sit om den samme lørdag.

     ⚠️ OG DE TO TAL ER IKKE DET SAMME: "pladser" er MENNESKER,
     "borde" er bookinger mod dagens loft. */
  test('dagens billede siger også, hvor mange borde der er taget',
    async ({ page }) => {
    const d = medBorde((x) => { x.indstillinger.bord_loft_pr_dag = 3; });
    d.bordbestillinger = [booking(1, IMORGEN), booking(2, IMORGEN)];
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-borde');
    await expect(page.locator('#borde-billede')).toContainText('2 af 3 borde booket');
  });

  /* ⚠️ UDEN ET SAT LOFT ER GRUNDTALLET BORDENE — og de ligger
     IKKE i Admin.data. De hentes for sig og meldes ind som
     `bordliste`; glemmer skærmen dem, regner den med nul borde
     og siger "3 borde booket" uden et loft, mens hjemmesiden for
     længst har lukket dagen. */
  test('uden et sat loft er dagens billede bordenes eget tal', async ({ page }) => {
    const d = medBorde();
    d.bordbestillinger = [booking(1, IMORGEN), booking(2, IMORGEN), booking(3, IMORGEN)];
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-borde');
    await expect(page.locator('#borde-billede')).toContainText('3 af 3 borde booket');
  });

  /* ⚠️ MÅL FARVEN, IKKE KLASSEN. Første udgave spurgte om
     `.fejl-tekst` og bestod — mens linjen stod i den dæmpede
     brune: `.fejl-tekst` (0,1,0) tabte til
     `body.personale .bestil-linjepris` (0,2,1). Klassen sad
     korrekt; det var stilen, der ikke slog igennem. */
  test('er dagen fuld, er linjen rød', async ({ page }) => {
    const d = medBorde((x) => { x.indstillinger.bord_loft_pr_dag = 2; });
    d.bordbestillinger = [booking(1, IMORGEN), booking(2, IMORGEN)];
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-borde');

    const linje = page.locator('#borde-billede .bestil-linjepris').first();
    await expect(linje).toContainText('2 af 2 borde booket');
    /* To uafhængige mål: den må ikke være den dæmpede (som en
       naboligne ER), og den skal være husets røde til lille
       tekst. Et spørgsmål til klassen ville bestå begge veje. */
    const målt = await linje.evaluate((e) => {
      const rød = getComputedStyle(e).getPropertyValue('--red-tekst').trim();
      const prøve = document.createElement('span');
      prøve.style.color = rød;
      e.appendChild(prøve);
      const somRgb = getComputedStyle(prøve).color;
      prøve.remove();
      return { farve: getComputedStyle(e).color, rød: somRgb };
    });
    const dæmpet = await page.locator('#borde-billede .bestil-vare').first()
      .evaluate((e) => getComputedStyle(e).color);
    expect(målt.farve, 'linjen står i husets dæmpede brune, ikke i rødt')
      .not.toBe(dæmpet);
    expect(målt.farve, 'den røde slog ikke igennem').toBe(målt.rød);
  });

  /* ⚠️ FELTET FINDES IKKE, FØR KOLONNEN GØR. Uden
     supabase/bord-loft-pr-dag.sql ville hvert gem af en dagsregel
     fejle med PGRST204 — en fejl, ejeren ikke kan gøre noget ved.
     Samme greb som maaAntal() på Menukort. */
  test('kortet er væk, til SQL-filen er kørt', async ({ page }) => {
    const d = medBorde((x) => {
      /* En række UDEN nøglen bord_loft = databasen har ikke
         kolonnen endnu. */
      x.dags_regler = [{ id: 1, lokation_id: 'mosede', dato: IMORGEN, luk_takeaway: true }];
    });
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-borde');
    await expect(page.locator('#bord-loft-kort')).toBeHidden();
  });

  /* ============================================================
     ⚠️ OG DEN ANDEN VEJ: KALENDER-FANEN MÅ IKKE TØRRE LOFTET AF
     ------------------------------------------------------------
     Loftet står i dags_regler sammen med lukketiderne, og
     dagsregel() skriver HELE rækken. Lukker personalet for spis
     her på en lørdag, ejeren havde sat til højst to borde, ville
     loftet forsvinde uden en linje nogen steder — og lørdagen
     ville tage 55 bookinger igen.
     ============================================================ */
  /* ⚠️ OG DEN SKARPE ER, NÅR LUKNINGEN ÅBNES IGEN. Rækken
     slettes, når der ikke er "noget særligt" tilbage på dagen —
     og bar Kalender-fanen ikke loftet med, ville et bordloft
     ikke tælle som noget særligt. Så forsvandt hele rækken, i det
     sekund personalet åbnede for spis her igen.

     ⚠️ TO REGLER DÆKKEDE HINANDEN HER: øvetilstandens fletning
     holdt loftet i live, også uden linjen i kalender.js, og
     omvendt. Prøven måler derfor SLETNINGEN, som kun den ene af
     dem kan redde. */
  test('åbnes dagen igen på Kalender-fanen, står loftet der endnu', async ({ page }) => {
    const d = medBorde((x) => {
      x.dags_regler = [{ id: 1, lokation_id: 'mosede', dato: IMORGEN,
        bord_loft: 2, luk_spis_her: true }];
    });
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-kalender');
    await page.waitForSelector('#maaned-net .maaned-dag');
    await page.locator('#maaned-net .maaned-dag[data-dag="' + IMORGEN + '"]').click();
    /* Åbn spis her igen — nu er der ikke andet særligt på dagen
       end bordloftet. */
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();
    await expect(page.locator('#kvittering')).toContainText('åben');

    const regel = (await gemteData(page)).dags_regler
      .filter((r) => r.dato === IMORGEN)[0];
    expect(regel, 'hele rækken blev slettet — og bordloftet med').toBeTruthy();
    expect(regel.luk_spis_her).toBe(false);
    expect(regel.bord_loft, 'bordloftet blev tørret af på en anden fane').toBe(2);
  });

  /* ⚠️ MEN KOLONNEN SENDES ALDRIG AF SIG SELV. Er
     supabase/bord-loft-pr-dag.sql ikke kørt, findes den ikke —
     og et ubetinget felt ville fælde hvert eneste gem af en
     lukkedag med PGRST204. Det er vis_fra-arret fra 28/8, hvor
     noten stod lige over linjen, der lavede fejlen. */
  test('uden kolonnen sendes den ikke med', async ({ page }) => {
    const d = medBorde((x) => {
      /* Ingen bord_loft-nøgle: databasen kender ikke kolonnen. */
      x.dags_regler = [{ id: 1, lokation_id: 'mosede', dato: IMORGEN, luk_takeaway: true }];
    });
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-kalender');
    await page.waitForSelector('#maaned-net .maaned-dag');
    await page.locator('#maaned-net .maaned-dag[data-dag="' + IMORGEN + '"]').click();
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');

    const regel = (await gemteData(page)).dags_regler
      .filter((r) => r.dato === IMORGEN)[0];
    expect(Object.prototype.hasOwnProperty.call(regel, 'bord_loft'),
      'kolonnen blev sendt, selv om databasen ikke har den').toBe(false);
  });

  /* ⚠️ DAGENS LUKKETIDER MÅ IKKE RYGE MED. dagsregel() skriver
     HELE rækken, så et loft sat alene ville tørre resten af. */
  test('et loft rører ikke dagens øvrige regler', async ({ page }) => {
    const d = medBorde((x) => {
      /* ⚠️ bord_loft: null OG IKKE UDELADT. Efter migreringen
         svarer databasen med kolonnen på hver eneste række — en
         række UDEN nøglen betyder "filen er ikke kørt endnu", og
         så skjuler maaLoft() med vilje hele kortet. Prøven
         nedenfor måler netop dét. */
      x.dags_regler = [{ id: 1, lokation_id: 'mosede', dato: IMORGEN, bord_loft: null,
        luk_takeaway: true, besked_til_gaester: 'Vi holder lukket for take-away' }];
    });
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-borde');
    await page.locator('#bord-loft-kort summary').click();
    await page.locator('#bord-loft-dato').fill(IMORGEN);
    await page.locator('#bord-loft-dag').fill('2');
    await page.locator('#gem-bord-loft-dag').click();

    const regel = (await gemteData(page)).dags_regler
      .filter((r) => r.dato === IMORGEN)[0];
    expect(regel.bord_loft).toBe(2);
    expect(regel.luk_takeaway, 'lukketiden blev tørret af').toBe(true);
    expect(regel.besked_til_gaester).toContain('take-away');
  });
});
