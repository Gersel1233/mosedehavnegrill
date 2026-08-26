/* BESTILLINGER: DAGENS STYREPULT

   Kundens billeder (26/8). Fanen var én lang stribe fra i går og
   frem med en overskrift pr. dato — og på en travl uge skulle man
   rulle forbi tre dage for at finde i morgen.

   Nu ses ÉN dag ad gangen. ⚠️ Men den lange liste var god til én
   ting, og den egenskab skal beholdes: en bestilling til på
   fredag må ikke ligge uset, til fredag kommer. Det er dét,
   linjen om de andre dage er til for, og det er den vigtigste
   prøve i filen.

   Admin er computer- og iPad-først (CLAUDE.md), så knapperne står
   som en række og ikke som en rulleliste.
*/

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData } = require('./hjaelp');

// Uret i åbnAdmin står fredag 7. august 2026 kl. 13.00 dansk tid.
const I_DAG = '2026-08-07';
const I_MORGEN = '2026-08-08';

function b(id, dato, tid, navn, vare, antal, ekstra) {
  return Object.assign({
    id, lokation_id: 'mosede', reference: 'SM-B-' + id, navn,
    telefon: '2030405' + (id % 10), email: null,
    hent_dato: dato, hent_tid: tid,
    linjer: [{ navn: vare, antal, pris: 75 }], fyld: [], antal,
    besked: null, status: 'bekraeftet', hvordan: 'afhentning',
    leverings_adresse: null, intern_note: null, slettet: null,
    oprettet: '2026-08-07T10:00:00Z',
  }, ekstra || {});
}

function dage() {
  const d = grunddata();
  d.borde = [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
    placering: 'ude', aktiv: true, sortering: 10 }];
  d.bestillinger = [
    b(1, I_DAG, '12:00', 'Anna Vind', 'Fiskefilet', 2),
    b(2, I_DAG, '13:00', 'Jonas Berg', 'Fiskefilet', 3),
    b(3, I_DAG, '11:30', 'Mette Holm', 'Burger', 1, { status: 'afhentet' }),
    b(4, I_DAG, '12:30', 'Bord 7', 'Fadøl, lille', 2,
      { hvordan: 'spis_her', bord_nummer: '7' }),
    b(5, I_MORGEN, '17:00', 'Sara Dam', 'Stjerneskud', 4, { status: 'ny' }),
  ];
  return d;
}

async function åbnFanen(page, data) {
  await åbnAdmin(page, { data: data || dage() });
  await page.locator('[data-panel="p-bestillinger"]').click();
  await page.waitForSelector('#bestil-dage .knap');
}

test.describe('Én dag ad gangen', () => {

  test('man lander på i dag, og kun dagens står i listen', async ({ page }) => {
    await åbnFanen(page);
    await expect(page.locator('.bestil-dagnavn')).toContainText('7. august');
    await expect(page.locator('#bestillinger-liste .bestil-kort')).toHaveCount(4);
    await expect(page.locator('#bestillinger-liste')).not.toContainText('Sara Dam');
  });

  /* ⚠️ DEN VIGTIGSTE PRØVE I FILEN. Uden linjen ville Saras
     bestilling til i morgen ligge uset, til i morgen kom — og
     det var netop dét, den gamle lange liste var god til. */
  /* ⚠️ OG DER TÆLLES ALT, DER IKKE ER NÅET IGENNEM — ikke kun det
     NYE. En BEKRÆFTET bestilling til på fredag skal også ses;
     ellers er den usynlig, til fredag kommer, og så var linjen
     ingen hjælp. */
  test('en bekræftet bestilling på en anden dag ses også', async ({ page }) => {
    const d = dage();
    d.bestillinger = [
      b(1, I_DAG, '12:00', 'Anna Vind', 'Fiskefilet', 2),
      b(2, I_MORGEN, '17:00', 'Sara Dam', 'Stjerneskud', 4,
        { status: 'bekraeftet' }),
    ];
    await åbnFanen(page, d);
    await expect(page.locator('#bestil-andre')).toContainText('8. august');
  });

  /* Og det FÆRDIGE tæller ikke med: en afhentet bestilling er
     ikke noget, nogen skal gøre. */
  test('en afhentet bestilling på en anden dag tæller ikke', async ({ page }) => {
    const d = dage();
    d.bestillinger = [
      b(1, I_DAG, '12:00', 'Anna Vind', 'Fiskefilet', 2),
      b(2, I_MORGEN, '17:00', 'Sara Dam', 'Stjerneskud', 4,
        { status: 'afhentet' }),
    ];
    await åbnFanen(page, d);
    await expect(page.locator('#bestil-andre')).toHaveClass(/skjult/);
  });

  test('nye bestillinger til andre dage siges højt', async ({ page }) => {
    await åbnFanen(page);
    const linje = page.locator('#bestil-andre');
    await expect(linje).toBeVisible();
    await expect(linje).toContainText('8. august');
    await expect(linje).toContainText('1 ny');
  });

  test('og linjen fører hen til dagen', async ({ page }) => {
    await åbnFanen(page);
    await page.locator('#bestil-andre .knap').first().click();
    await expect(page.locator('.bestil-dagnavn')).toContainText('8. august');
    await expect(page.locator('#bestillinger-liste')).toContainText('Sara Dam');
  });

  /* ⚠️ DER SKAL VÆRE ET HUL, ellers måler prøven ingenting.
     Første udgave sprang fra den 7. til den 8. — og den 8. er
     BÅDE "næste dag" og "næste dag med noget", så en pil, der
     bare lagde ét døgn til, bestod. Her er der tre tomme dage
     imellem. */
  test('pilene springer tomme dage over', async ({ page }) => {
    const d = dage();
    d.bestillinger = [
      b(1, I_DAG, '12:00', 'Anna Vind', 'Fiskefilet', 2),
      b(2, '2026-08-11', '17:00', 'Sara Dam', 'Stjerneskud', 4),
    ];
    await åbnFanen(page, d);
    await page.locator('#bestil-dage .knap.bestil-pil', { hasText: '→' }).click();
    await expect(page.locator('.bestil-dagnavn'),
      'pilen lagde bare et døgn til og landede på en tom dag')
      .toContainText('11. august');
  });

  test('Alle dage viser dem alle igen', async ({ page }) => {
    await åbnFanen(page);
    await page.locator('#bestil-dage .knap', { hasText: 'Alle dage' }).click();
    await expect(page.locator('#bestillinger-liste .bestil-kort')).toHaveCount(5);
    // Og så giver linjen om "andre dage" ingen mening længere
    await expect(page.locator('#bestil-andre')).toHaveClass(/skjult/);
  });

  /* En tom dag skal sige det. Står der ingenting, tror man,
     skærmen er i stykker. */
  test('en dag uden bestillinger siger det', async ({ page }) => {
    const d = dage();
    d.bestillinger = [b(9, I_MORGEN, '17:00', 'Sara Dam', 'Stjerneskud', 4)];
    await åbnFanen(page, d);
    await page.locator('#bestil-dage .knap', { hasText: 'I dag' }).click();
    await expect(page.locator('#bestillinger-liste'))
      .toContainText('Ingen bestillinger i dag');
  });

  /* ⚠️ MEN EN TOM DAG MÅ IKKE VÆRE DET FØRSTE, MAN SER, hvis der
     ligger noget forude. En stille tirsdag med fire bestillinger
     til lørdag skal åbne på lørdag. */
  test('er der intet i dag, landes der på den nærmeste dag med noget',
    async ({ page }) => {
    const d = dage();
    d.bestillinger = [b(9, I_MORGEN, '17:00', 'Sara Dam', 'Stjerneskud', 4)];
    await åbnFanen(page, d);
    await expect(page.locator('.bestil-dagnavn')).toContainText('8. august');
    await expect(page.locator('#bestillinger-liste')).toContainText('Sara Dam');
  });
});

test.describe('Mangler og færdige', () => {

  test('det, der mangler, står øverst — det færdige under',
    async ({ page }) => {
    await åbnFanen(page);
    const grupper = await page.$$eval('#bestillinger-liste .bestil-gruppe',
      (els) => els.map((e) => e.textContent));
    expect(grupper[0]).toContain('Mangler');
    expect(grupper[1]).toContain('Færdige (1)');

    /* ⚠️ DET ER IKKE NOK AT MÅLE, HVEM DER STÅR SIDST. Første
       udgave gjorde det — og bestod, da alle bestillinger blev
       lagt i "Mangler": Mette stod stadig sidst, hun stod bare
       OGSÅ øverst. En prøve, der kun ser på enden af listen, kan
       ikke se en dublet.

       Her tælles kortene MELLEM de to overskrifter. */
    const iMangler = await page.evaluate(() => {
      const boern = Array.from(
        document.getElementById('bestillinger-liste').children);
      const start = boern.findIndex((e) => /Mangler/.test(e.textContent));
      const slut = boern.findIndex((e) => /Færdige/.test(e.textContent));
      return boern.slice(start + 1, slut === -1 ? undefined : slut)
        .filter((e) => e.classList.contains('bestil-kort'))
        .map((e) => e.textContent);
    });
    expect(iMangler, 'der står færdige bestillinger under Mangler')
      .toHaveLength(3);
    expect(iMangler.join(' ')).not.toContain('Mette Holm');

    /* Rækkefølgen i dokumentet: Mette (afhentet) skal ligge
       EFTER de tre, der mangler.

       ⚠️ Navnet læses fra .bestil-hvem og ikke med et mønster på
       hele kortets tekst: første udgave fangede "Mette
       Holm203040531", fordi telefonnummeret står lige efter. Et
       mønster, der læser hele kortet, læser også alt det, der
       ikke er et navn. */
    const navne = await page.$$eval('#bestillinger-liste .bestil-kort',
      (els) => els.map((e) => {
        const n = e.querySelector('.bestil-hvem .vare-navn, .bestil-hvem');
        return n ? n.textContent.trim().split('\n')[0] : '';
      }));
    expect(navne[navne.length - 1]).toContain('Mette Holm');
  });

  test('inden for gruppen står de i hentetid', async ({ page }) => {
    await åbnFanen(page);
    const tider = await page.$$eval('#bestillinger-liste .bestil-kort',
      (els) => els.map((e) => (e.textContent.match(/\d\d[:.]\d\d/) || [''])[0]));
    // 12.00 Anna, 12.30 Bord 7, 13.00 Jonas — og Mette (11.30) sidst,
    // fordi hun er færdig
    expect(tider.slice(0, 3)).toEqual(['12.00', '12.30', '13.00']);
  });

  test('er alt nået igennem, siges det', async ({ page }) => {
    const d = dage();
    d.bestillinger = d.bestillinger.map((x) => (
      x.hent_dato === I_DAG ? { ...x, status: 'afhentet' } : x));
    await åbnFanen(page, d);
    await expect(page.locator('#bestillinger-liste'))
      .toContainText('Alle bestillinger er nået igennem');
  });
});

test.describe('Overblikket over dagen', () => {

  test('sumlinjen siger hvad dagen indeholder', async ({ page }) => {
    await åbnFanen(page);
    const sum = page.locator('#bestil-sum');
    await expect(sum).toContainText('4 bestillinger');
    // 2 + 3 + 1 + 2 retter
    await expect(sum).toContainText('8 retter');
    // 3 ud af huset, 1 ved bordet
    await expect(sum).toContainText('🥡 3 · 🍽️ 1');
  });

  test('produktionen lægger den samme ret sammen', async ({ page }) => {
    await åbnFanen(page);
    const fisk = page.locator('#bestil-produktion .prod-pille',
      { hasText: 'Fiskefilet' });
    await expect(fisk.locator('.prod-antal')).toHaveText('5');
  });

  test('tallene siger hvor meget der mangler', async ({ page }) => {
    await åbnFanen(page);
    await expect(page.locator('#bestil-tal')).toContainText('🔥 3 mangler');
    await expect(page.locator('#bestil-tal')).toContainText('✅ 1 færdige');
  });
});

/* ============================================================
   ⚠️ LUGEN OG BORDENE KAN SKILLES AD — MEN DE ER ÉN LISTE
   ------------------------------------------------------------
   Bordene har deres egen SKÆRM (Køkken-kø) til det, der skal
   laves NU. Den her fane er dagens REGNSKAB: hvor meget er der
   solgt, og hvad skal der laves. Filteret gør, at man kan skille
   dem ad, når man vil — uden at der bliver to lister over den
   samme dag, som kan skride fra hinanden.
   ============================================================ */
test.describe('Filteret på kilde', () => {

  test('Lugen skjuler bordene', async ({ page }) => {
    await åbnFanen(page);
    await page.locator('#bestil-dage .knap', { hasText: 'Lugen' }).click();
    await expect(page.locator('#bestillinger-liste .bestil-kort')).toHaveCount(3);
    await expect(page.locator('#bestillinger-liste')).not.toContainText('Bord 7');
  });

  test('Bordene viser kun dem', async ({ page }) => {
    await åbnFanen(page);
    await page.locator('#bestil-dage .knap', { hasText: 'Bordene' }).click();
    await expect(page.locator('#bestillinger-liste .bestil-kort')).toHaveCount(1);
    await expect(page.locator('#bestillinger-liste')).toContainText('Bord 7');
  });

  test('og tallene følger filteret', async ({ page }) => {
    await åbnFanen(page);
    await page.locator('#bestil-dage .knap', { hasText: 'Lugen' }).click();
    await expect(page.locator('#bestil-sum')).toContainText('3 bestillinger');
    await expect(page.locator('#bestil-sum')).toContainText('🥡 3 · 🍽️ 0');
  });
});

/* ============================================================
   FYLDLINJEN HØRER TIL SMØRREBRØDET
   ------------------------------------------------------------
   "Fyld: gæsten har ikke valgt – blandet udvalg" stod på HVERT
   kort — også på en fadøl. Det er ikke bare støj: det er en
   instruks til køkkenet om noget, bestillingen ikke indeholder.

   Fixturen har Flæskestegssandwich i kategorien Smørrebrød og
   Fadøl i kategorien Øl — derfor kan de to sider af reglen
   måles på det samme menukort.
   ============================================================ */
test.describe('Fyldlinjen', () => {

  test('står på et smørrebrød uden valgt fyld', async ({ page }) => {
    const d = dage();
    d.bestillinger = [b(1, I_DAG, '12:00', 'Anna Vind', 'Flæskestegssandwich', 2)];
    await åbnFanen(page, d);
    await expect(page.locator('#bestillinger-liste .bestil-kort'))
      .toContainText('blandet udvalg');
  });

  test('står IKKE på en bestilling uden smørrebrød', async ({ page }) => {
    const d = dage();
    d.bestillinger = [b(1, I_DAG, '12:00', 'Anna Vind', 'Fadøl, lille', 2)];
    await åbnFanen(page, d);
    const kort = page.locator('#bestillinger-liste .bestil-kort');
    await expect(kort).toContainText('Fadøl');
    await expect(kort).not.toContainText('Fyld');
  });

  test('og det VALGTE fyld står altid', async ({ page }) => {
    const d = dage();
    d.bestillinger = [b(1, I_DAG, '12:00', 'Anna Vind', 'Flæskestegssandwich', 2,
      { fyld: ['Dyrlægens natmad'] })];
    await åbnFanen(page, d);
    await expect(page.locator('#bestillinger-liste .bestil-kort'))
      .toContainText('Dyrlægens natmad');
  });
});

/* ============================================================
   EN ALLERGI ER IKKE EN BESKED
   ------------------------------------------------------------
   Køkken-køen har haft den røde ramme siden 25/8; Bestillinger
   havde ingenting — og det er de SAMME bestillinger, bare
   pakket ved lugen i stedet for serveret ved bordet.

   ⚠️ PRØVEN LÆSER DEN BEREGNEDE STIL. En klasse, der ikke slår
   igennem, er ingen regel.
   ============================================================ */
test.describe('Allergien kan ikke skimmes forbi', () => {

  function medBesked(tekst) {
    const d = dage();
    d.bestillinger = [b(1, I_DAG, '12:00', 'Anna Vind', 'Fiskefilet', 2,
      { besked: tekst })];
    return d;
  }

  /* ⚠️ ÉN åbnAdmin PR. PRØVE. To kald i den samme prøve genbruger
     det FØRSTE datasæt — skærmen stod med den forrige gæst, og
     prøven målte noget, den troede den havde skiftet ud. */
  test('allergien får rød ramme', async ({ page }) => {
    await åbnFanen(page, medBesked('ALLERGI: nødder\nGerne uden remoulade'));
    await expect(page.locator('#bestillinger-liste .bestil-kort'))
      .toHaveClass(/har-allergi/);
    await expect(page.locator('.bestil-gaestebesked')).toHaveClass(/allergi/);

    const ramme = await page.locator('.bestil-gaestebesked')
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(parseFloat(ramme)).toBeGreaterThan(0);
  });

  /* Modstykket. Uden den måler prøven ovenfor kun, at klassen kan
     sættes — ikke at den siger noget. */
  test('en almindelig besked gør ikke', async ({ page }) => {
    await åbnFanen(page, medBesked('Vi sidder ude bagved'));
    await expect(page.locator('#bestillinger-liste .bestil-kort'))
      .not.toHaveClass(/har-allergi/);
    const ingen = await page.locator('.bestil-gaestebesked')
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(parseFloat(ingen)).toBe(0);
  });

  /* ⚠️ GÆSTENS LINJESKIFT ER HENDES OPDELING. Uden pre-line løb
     "ALLERGI: nødder" og næste linje sammen til én sætning, hvor
     allergien endte midt inde i noget andet. Målt 26/8. */
  test('gæstens linjeskift overlever', async ({ page }) => {
    await åbnFanen(page, medBesked('ALLERGI: nødder\nGerne uden remoulade'));
    await expect(page.locator('.bestil-gaestebesked'))
      .toHaveCSS('white-space', 'pre-line');

    /* Og reglen skal SLÅ IGENNEM, ikke bare være erklæret.

       ⚠️ MÅLT MED EN KORT TEKST, og det er ikke pynt. Første
       udgave sammenlignede kassens højde med og uden pre-line på
       den rigtige besked — og på en telefon ombryder den tekst
       til to linjer ALLIGEVEL, så de to tal var ens (62 = 62) og
       prøven faldt på computeren og ikke på mobilen. Den målte
       skærmbredden, ikke reglen.

       "a\nb" kan ikke ombryde af sig selv på nogen bredde: er
       den to linjer, er det linjeskiftet, der gjorde det. */
    const boks = page.locator('.bestil-gaestebesked');
    const to = await boks.evaluate((el) => {
      el.textContent = 'a\nb';
      return el.getBoundingClientRect().height;
    });
    const en = await boks.evaluate((el) => {
      el.style.whiteSpace = 'normal';
      return el.getBoundingClientRect().height;
    });
    expect(to).toBeGreaterThan(en);
  });

  test('vagtskærmen siger det også', async ({ page }) => {
    await åbnAdmin(page, { data: medBesked('ALLERGI: nødder') });
    await expect(page.locator('#overblik-vagt')).toContainText('Allergi');
  });

  test('… og kun når der ER en', async ({ page }) => {
    await åbnAdmin(page, { data: medBesked('Vi sidder ude bagved') });
    await expect(page.locator('#overblik-vagt')).toContainText('Anna Vind');
    await expect(page.locator('#overblik-vagt')).not.toContainText('Allergi');
  });
});
