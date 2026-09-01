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
const { åbnAdmin, grunddata, gemteData, visFane, aabnMere } = require('./hjaelp');

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
  await visFane(page, 'p-bestillinger');
  /* ⚠️ SELEKTOREN GIK PÅ .knap, ALTSÅ PÅ EN STILKLASSE (31/8).
     Filtrene er segmenterede grupper nu (kundens ord: admins
     knapper "ligner noget for 1850'erne"), og segmenterne har
     ikke .knap — de har aria-pressed, som er dét, der både
     styrer udseendet og siger tilstanden til en skærmlæser.
     Prøverne måler den attribut i stedet. */
  await page.waitForSelector('#bestil-dage button');
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

  /* ⚠️ OGSÅ BAGUD (31/8, "intet må gå tabt"-eftersynet). En
     bestilling fra I GÅR, ingen nåede at lukke, må ikke ligge
     uset, bare fordi dagvisningen står på i dag — det er samme
     regel som fredags-bestillingen, i den anden retning. */
  test('en uafsluttet bestilling fra i går ligger ikke uset', async ({ page }) => {
    const d = dage();
    d.bestillinger = [
      b(61, I_DAG, '12:00', 'Anna Vind', 'Fiskefilet', 2),
      b(62, '2026-08-06', '12:00', 'Glemte Gorm', 'Burger', 1,
        { status: 'bekraeftet' }),
    ];
    await åbnFanen(page, d);

    const linje = page.locator('#bestil-andre');
    await expect(linje, 'gårsdagens åbne bestilling er usynlig').toBeVisible();
    await expect(linje).toContainText('6. august');
    await linje.locator('.knap').first().click();
    await expect(page.locator('#bestillinger-liste')).toContainText('Glemte Gorm');
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
    await page.locator('#bestil-dage .bestil-pil', { hasText: '→' }).click();
    await expect(page.locator('.bestil-dagnavn'),
      'pilen lagde bare et døgn til og landede på en tom dag')
      .toContainText('11. august');
  });

  test('Alle dage viser dem alle igen', async ({ page }) => {
    await åbnFanen(page);
    await page.locator('#bestil-dage button', { hasText: 'Alle dage' }).click();
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
    await page.locator('#bestil-dage button', { hasText: 'I dag' }).click();
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
    await page.locator('#bestil-dage button', { hasText: 'Lugen' }).click();
    await expect(page.locator('#bestillinger-liste .bestil-kort')).toHaveCount(3);
    await expect(page.locator('#bestillinger-liste')).not.toContainText('Bord 7');
  });

  test('Bordene viser kun dem', async ({ page }) => {
    await åbnFanen(page);
    await page.locator('#bestil-dage button', { hasText: 'Bordene' }).click();
    await expect(page.locator('#bestillinger-liste .bestil-kort')).toHaveCount(1);
    await expect(page.locator('#bestillinger-liste')).toContainText('Bord 7');
  });

  test('og tallene følger filteret', async ({ page }) => {
    await åbnFanen(page);
    await page.locator('#bestil-dage button', { hasText: 'Lugen' }).click();
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

/* ============================================================
   DEN SAMME GÆST TO STEDER  (29/8)

   Kundens spørgsmål: Lone bestiller to burgere til kl. 14 på
   hjemmesiden — den står i Bestillinger, personalet ser den. Så
   kommer hun ned, får et bord, scanner QR-koden og bestiller dér.
   Nu ligger hun BÅDE i Bestillinger og i Køkken-køen. "Hvad gør
   man der, og er det personalet eller systemet?"

   ⚠️ SVARET: systemet kan ikke VIDE, om det er den samme mad
   bestilt to gange eller to runder — og et gæt ville enten lave
   maden dobbelt eller slette en rigtig bestilling. Men det kan se,
   at det er det samme nummer, og sige det. Vi peger, mennesket
   dømmer. Samme beslutning som "2 vil have lørdag den 12." på
   Baglokalet.
   ============================================================ */
test.describe('Samme gæst ved lugen og ved bordet', () => {

  /* To rækker med det SAMME nummer: én ved lugen, én fra et bord. */
  function toSteder(ekstra1, ekstra2) {
    const d = dage();
    d.bestillinger = [
      b(1, I_DAG, '14:00', 'Lone Krag', 'Havnens burger', 2,
        Object.assign({ telefon: '20304050', hvordan: 'spis_her' }, ekstra1 || {})),
      b(2, I_DAG, '13:05', 'Lone Krag', 'Softice', 2,
        Object.assign({ telefon: '20304050', hvordan: 'spis_her',
          bord_nummer: '7' }, ekstra2 || {})),
    ];
    return d;
  }

  const lugekort = (page) =>
    page.locator('#bestillinger-liste .bestil-kort', { hasText: 'Havnens burger' });

  test('lugekortet siger, at de også har bestilt fra et bord', async ({ page }) => {
    await åbnFanen(page, toSteder());
    await expect(lugekort(page)).toContainText('også bestilt fra bord 7');
    await expect(lugekort(page)).toContainText('Spørg dem');
  });

  /* ⚠️ NUMMERET SAMMENLIGNES PÅ CIFRENE. "+45 41 31 41 60" og
     "41314160" er den samme telefon, og en sammenligning på
     teksten ville aldrig finde noget. */
  test('og landekoden står ikke i vejen', async ({ page }) => {
    await åbnFanen(page, toSteder({ telefon: '+45 20 30 40 50' }));
    await expect(lugekort(page)).toContainText('også bestilt fra bord 7');
  });

  /* En AFHENTET frokost er ikke en dublet — den er en frokost,
     gæsten har fået. Stod advarslen der, ville hvert eneste
     gengangerbord få den. */
  test('men en serveret bestilling er ingen advarsel', async ({ page }) => {
    await åbnFanen(page, toSteder(null, { status: 'serveret' }));
    await expect(lugekort(page)).not.toContainText('også bestilt fra bord');
  });

  test('og to fremmede gæster advarer ikke om hinanden', async ({ page }) => {
    await åbnFanen(page, toSteder(null, { telefon: '99887766' }));
    await expect(lugekort(page)).not.toContainText('også bestilt fra bord');
  });

  /* Og den anden vej: køkkenet skal vide, at der står mad ved
     lugen til det samme nummer. */
  test('køkkenskærmen siger det den anden vej', async ({ page }) => {
    await åbnAdmin(page, { data: toSteder() });
    await visFane(page, 'p-koekken');
    await expect(page.locator('.koek-kort[data-bord="7"]'))
      .toContainText('bestilling ved lugen kl. 14.00');
  });
});

/* ============================================================
   VARIANTEN SKAL KUNNE SES  (30/8)
   ------------------------------------------------------------
   Smørrebrødssiden sender linjens navn som STØRRELSEN
   ("Smørrebrød") og fyldet som variant — fordi databasens pris-
   og udsolgt-værn begge slår op på menukortets navne, og
   "Leverpostej med baconsvøb" står der uden en pris.

   Prisen på det er, at et køkken, der kun får "3 × Smørrebrød",
   ikke kan smøre dem. Derfor skal varianten stå på HVER skærm,
   personalet arbejder på.
   ============================================================ */
test.describe('Fyldet står på kortet', () => {

  function medVariant() {
    const d = grunddata();
    d.borde = [];
    d.bestillinger = [
      b(9, I_DAG, '12:00', 'Sara Poulsen', 'Smørrebrød', 2,
        { linjer: [
          { navn: 'Smørrebrød', variant: 'Leverpostej med baconsvøb', antal: 2, pris: 55 },
          { navn: 'Håndmad', variant: 'Dyrlægens natmad', antal: 1, pris: 27 },
        ] }),
    ];
    return d;
  }

  test('bestillingskortet siger, hvad der skal på brødet', async ({ page }) => {
    await åbnAdmin(page, { data: medVariant() });
    await visFane(page, 'p-bestillinger');

    const kort = page.locator('#bestillinger-liste .bestil-kort', { hasText: 'Sara Poulsen' });
    await expect(kort).toContainText('Leverpostej med baconsvøb');
    await expect(kort).toContainText('Dyrlægens natmad');
  });

  /* ⚠️ OG PRODUKTIONEN LÆGGER DEM IKKE SAMMEN. To skiver med hver
     sit fyld er to forskellige stykker arbejde; "3 × Smørrebrød"
     ville lade køkkenet gætte, hvad de tre skulle have på. */
  test('produktionen holder de to fyld adskilt', async ({ page }) => {
    await åbnAdmin(page, { data: medVariant() });

    const prod = page.locator('#overblik-produktion');
    await expect(prod).toContainText('Leverpostej med baconsvøb');
    await expect(prod).toContainText('Dyrlægens natmad');
    // To piller, ikke én samlet
    await expect(prod.locator('.prod-pille')).toHaveCount(2);
  });

  test('og forløbet på Overblik siger det med', async ({ page }) => {
    await åbnAdmin(page, { data: medVariant() });

    const raekke = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Sara Poulsen' });
    await expect(raekke).toContainText('Leverpostej med baconsvøb');
  });
});

/* ============================================================
   EN FÆRDIG BESTILLING SKAL SES SOM FÆRDIG  (31/8)
   ------------------------------------------------------------
   Kundens ord, med to skærmbilleder af fanen: *"der skal stå
   færdig, og når de er kørt skal det tydeligt ses."*

   To ting var galt, og de forstærkede hinanden:

   1) ORDET. Det sidste trin hed "Afhentet", bunken hedder
      "✅ Færdige", og tælleren øverst siger "0 færdige". Tre ord
      for den samme tilstand er ét for meget, når man står midt i
      en frokost.

   2) FARVEN. b-afhentet var grå og halvgennemsigtig — den SAMME
      stil som b-afvist og b-udeblevet. "Maden kom ud ad døren" og
      "det blev aldrig til noget" lignede hinanden på en skærm,
      personalet skimmer.
   ============================================================ */
test.describe('Færdig skal kunne ses', () => {

  /* ⚠️ KUN ORDET PÅ SKÆRMEN SKIFTER. Databasens status hedder
     stadig afhentet (og serveret ved bordene) — salgstallene
     tæller på netop de ord, og en ændring dér ville stoppe
     omsætningen uden en eneste fejl. */
  test('det sidste trin hedder Færdig — men gemmer stadig afhentet', async ({ page }) => {
    await åbnFanen(page);

    // Mette Holm er den gennemførte i prøvedataene.
    const kort = page.locator('.bestil-kort', { hasText: 'Mette Holm' });
    await expect(kort.locator('.maerke')).toHaveText('Færdig');

    // Og knappen på en KLAR bestilling siger det samme.
    const d = dage();
    d.bestillinger = [b(9, I_DAG, '12:00', 'Klar Karl', 'Burger', 1, { status: 'klar' })];
    await page.evaluate((data) => {
      localStorage.setItem('mosede_data_v1', JSON.stringify(data));
    }, d);
    await page.reload();
    await visFane(page, 'p-bestillinger');
    await expect(page.locator('.bestil-kort', { hasText: 'Klar Karl' })
      .locator('button', { hasText: 'Færdig' })).toBeVisible();
  });

  /* ⚠️ PRØVEN LÆSER DEN BEREGNEDE STIL, ikke klassen. En regel på
     et klassenavn, der ikke findes, slår aldrig igennem uden at
     sige det — og selektoren blev netop gættet forkert én gang
     (.bestil-maerke findes ikke; den hedder .maerke). */
  test('den færdige er grøn og fuldt synlig — den afviste er ikke', async ({ page }) => {
    const d = dage();
    d.bestillinger = [
      b(10, I_DAG, '11:00', 'Gennemført Grete', 'Burger', 1, { status: 'afhentet' }),
      b(11, I_DAG, '11:15', 'Afvist Aksel', 'Burger', 1, { status: 'afvist' }),
      b(12, I_DAG, '11:30', 'Udeblev Ulla', 'Burger', 1, { status: 'udeblevet' }),
    ];
    await åbnFanen(page, d);

    const m = await page.evaluate(() => {
      const ud = {};
      document.querySelectorAll('#p-bestillinger .bestil-kort').forEach((k) => {
        const navn = (k.textContent.match(/(Gennemført Grete|Afvist Aksel|Udeblev Ulla)/) || [])[0];
        if (!navn) return;
        const c = getComputedStyle(k);
        ud[navn] = { kant: c.borderLeftColor, gennemsigtighed: c.opacity,
                     faerdig: k.classList.contains('b-faerdig') };
      });
      return ud;
    });

    expect(m['Gennemført Grete'], 'den gennemførte blev ikke fundet').toBeTruthy();
    expect(m['Gennemført Grete'].faerdig).toBe(true);
    expect(m['Gennemført Grete'].gennemsigtighed,
      'den færdige er tonet ned som et afslag').toBe('1');
    expect(m['Gennemført Grete'].kant,
      'den færdige har ikke fået sin egen farve').toBe('rgb(47, 138, 91)');

    /* ⚠️ OG AFVIST MÅ IKKE BLIVE GRØN. erFaerdig() er sand for en
       afvist bestilling — hænges den grønne stil på DEN, farves et
       afslag som en succes. Derfor er der en erGennemfoert(). */
    for (const navn of ['Afvist Aksel', 'Udeblev Ulla']) {
      expect(m[navn], navn + ' blev ikke fundet').toBeTruthy();
      expect(m[navn].faerdig, navn + ' blev markeret som gennemført').toBe(false);
      expect(m[navn].kant, navn + ' fik den grønne "det gik godt"-farve')
        .not.toBe('rgb(47, 138, 91)');
    }
  });
});

/* ⚠️ OG OVERBLIK SKAL SIGE DET SAMME ORD  (31/8).
   Fanen havde sin EGEN ordliste med "Afhentet"/"Serveret", så i
   det sekund det sidste trin blev døbt om til "Færdig" efter
   kundens ønske, ville de to skærme sige hver sit om den SAMME
   bestilling — og personalet skifter mellem dem hele dagen.
   Ordene låner nu Admin.statusNavn, som bor i bestillinger.js.

   ⚠️ Rækkefølgen er ikke ligegyldig: overblik.js indlæses FØR
   bestillinger.js i admin.html. Det går, fordi ordet først slås
   op ved optegningen — men prøven her er det, der siger til, hvis
   nogen flytter opslaget op i indlæsningen. */
test.describe('Ét ord for én tilstand', () => {
  test('Overblik siger Færdig med det samme ord som Bestillinger', async ({ page }) => {
    const d = dage();
    d.bestillinger = [
      b(20, I_DAG, '11:00', 'Gennemført Grete', 'Burger', 1, { status: 'afhentet' }),
    ];
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-overblik');

    /* ⚠️ .m-faerdig OG IKKE .maerke (1/9). Den færdige række fik
       forlæggets form og bærer nu TO mærker — kilden (🥡 To-go)
       og status — så `.maerke` rammer to elementer. Og hakket
       står foran ordet, som på bestillingskortet.

       ⚠️ ORDET KOMMER UDEFRA: det læses af Admin.statusNavn i
       SIDEN og skrives ikke af her. Et hårdkodet "Færdig" ville
       bestå, også hvis Overblik fik sin egen ordliste tilbage —
       og det er præcis dét, prøven er sat til at fange. */
    const raekke = page.locator('#p-overblik .faerdig-raekke',
      { hasText: 'Gennemført Grete' });
    const ordet = await page.evaluate(() => window.Admin.statusNavn('afhentet'));
    expect(ordet, 'Bestillinger-fanens eget ord er forsvundet').toBe('Færdig');
    await expect(raekke.locator('.m-faerdig')).toHaveText('✓ ' + ordet);
  });
});

/* ============================================================
   ÉN HANDLING FREM, RESTEN BAG "···"  (31/8)
   ------------------------------------------------------------
   Kundens forlæg var et SKÆRMBILLEDE ("det skal se sådan her ud
   ... agtig"): kortet er få linjer med ÉN grøn knap til højre og
   alt andet gemt.

   Vores kort havde tre knapper i fuld bredde under maden —
   Bekræft, Udeblev, Afvis — så hvert kort blev en halv skærm, og
   den ene knap, personalet trykker på ni gange ud af ti, stod
   side om side med to, de næsten aldrig bruger.
   ============================================================ */
test.describe('Én handling frem', () => {

  test('kortet har én knap fremad — resten ligger bag "···"', async ({ page }) => {
    const d = dage();
    d.bestillinger = [b(30, I_DAG, '12:00', 'Ny Nanna', 'Burger', 1, { status: 'ny' })];
    await åbnFanen(page, d);

    const kort = page.locator('.bestil-kort', { hasText: 'Ny Nanna' });
    // Kun den fremadrettede er synlig.
    await expect(kort.locator('.bestil-handling > .knap')).toHaveCount(1);
    /* ⚠️ OG DEN SIGER "FÆRDIG", OGSÅ PÅ EN NY (31/8). Kundens ord:
       "man skal bare trykke færdig, ikke det der dobbeltknap-noget,
       når man afstemmer bestillingerne". Mellemtrinnet Bekræft
       ligger bag døren — det er ikke fjernet, det er bare ikke det,
       man møder først. */
    await expect(kort.locator('.bestil-handling > .knap'))
      .toContainText('Færdig');
    await expect(kort.locator('.knap-mere')).toBeVisible();

    /* ⚠️ INGENTING ER FJERNET. En knap, der er væk, er en sag,
       personalet ikke kan lukke. Afvis ligger bag døren. */
    await expect(kort.locator('.bestil-mere')).toBeHidden();
    await aabnMere(kort);
    await expect(kort.locator('.bestil-mere')).toBeVisible();
    await expect(kort.locator('.bestil-mere button', { hasText: 'Afvis' }))
      .toBeVisible();
    /* Mellemtrinnet er heller ikke væk — det ligger samme sted. */
    await expect(kort.locator('.bestil-mere button', { hasText: 'Bekræft' }))
      .toBeVisible();
  });

  /* Den sidste knap i kæden er den grønne med hakket: den siger
     "det er ude ad døren". De to trin før er husets røde — de
     flytter sagen videre, men lukker den ikke.

     ⚠️ PRØVEN LÆSER DEN BEREGNEDE FARVE, ikke klassen. */
  test('knappen er grøn og siger Færdig — uanset hvor i kæden man er', async ({ page }) => {
    /* ⚠️ REGLEN ER VENDT (31/8), og det er en aftale med kunden,
       ikke en forældet prøve. Før var kun det SIDSTE trin grønt;
       de to mellemtrin var husets røde. Nu er der ét tryk fra hvor
       som helst, så knappen er grøn hele vejen — og prøven vogter,
       at den siger det samme på en NY som på en KLAR.

       ⚠️ PRØVEN LÆSER DEN BEREGNEDE FARVE, ikke klassen. */
    const d = dage();
    d.bestillinger = [
      b(31, I_DAG, '11:45', 'Klar Karl', 'Burger', 1, { status: 'klar' }),
      b(32, I_DAG, '12:15', 'Ny Nanna', 'Burger', 1, { status: 'ny' }),
    ];
    await åbnFanen(page, d);

    const m = await page.evaluate(() => {
      const ud = {};
      document.querySelectorAll('#p-bestillinger .bestil-kort').forEach((k) => {
        const navn = (k.textContent.match(/(Klar Karl|Ny Nanna)/) || [])[0];
        const kn = k.querySelector('.bestil-handling > .knap');
        if (!navn || !kn) return;
        ud[navn] = { tekst: kn.textContent.trim(),
                     farve: getComputedStyle(kn).backgroundColor };
      });
      return ud;
    });

    for (const navn of ['Klar Karl', 'Ny Nanna']) {
      expect(m[navn], navn + ' blev ikke fundet').toBeTruthy();
      expect(m[navn].tekst, navn + ' fik ikke ordet Færdig').toContain('Færdig');
      expect(m[navn].tekst, 'hakket mangler på ' + navn).toContain('✓');
      expect(m[navn].farve, navn + ' fik ikke den grønne')
        .toBe('rgb(47, 138, 91)');
    }
  });
});

/* ============================================================
   FORTRYD SKAL ALTID KUNNE LADE SIG GØRE  (31/8)
   ------------------------------------------------------------
   Kundens ord: "gendannelse af bestillinger det skal man kunne,
   hvis man klikker forkert." Overblik har haft ↩ Gendan siden
   26/8 — men på selve Bestillinger-fanen kunne et fejltryk på
   Færdig, Afvis eller Udeblev ikke fortrydes uden at skifte
   fane. Gendan fører til 'bekraeftet', ikke 'ny': rækken HAR
   været set, det var derfor, nogen trykkede.
   ============================================================ */
test.describe('Gendan på kortet', () => {

  test('et fejltryk på Afvis kan fortrydes fra kortet selv', async ({ page }) => {
    const d = dage();
    d.bestillinger = [b(41, I_DAG, '12:00', 'Fortryd Frida', 'Burger', 1,
      { status: 'afvist' })];
    await åbnFanen(page, d);

    const kort = page.locator('.bestil-kort', { hasText: 'Fortryd Frida' });
    await aabnMere(kort);
    await kort.locator('button', { hasText: 'Gendan' }).click();
    await expect(page.locator('#kvittering')).toContainText('bekræftet');

    const gemt = await gemteData(page);
    expect(gemt.bestillinger[0].status).toBe('bekraeftet');
  });

  test('også en Færdig kan komme tilbage — samme vej', async ({ page }) => {
    const d = dage();
    d.bestillinger = [b(42, I_DAG, '12:00', 'Mette Holm', 'Burger', 1,
      { status: 'afhentet' })];
    await åbnFanen(page, d);

    const kort = page.locator('.bestil-kort', { hasText: 'Mette Holm' });
    await aabnMere(kort);
    await kort.locator('button', { hasText: 'Gendan' }).click();

    const gemt = await gemteData(page);
    expect(gemt.bestillinger[0].status).toBe('bekraeftet');
  });

  /* En ÅBEN bestilling har ikke noget at gendanne — en Gendan på
     et nyt kort ville sige, at noget var gået galt. */
  test('en åben bestilling har ingen Gendan', async ({ page }) => {
    const d = dage();
    d.bestillinger = [b(43, I_DAG, '12:00', 'Ny Nadia', 'Burger', 1,
      { status: 'ny' })];
    await åbnFanen(page, d);

    const kort = page.locator('.bestil-kort', { hasText: 'Ny Nadia' });
    await expect(kort.locator('button', { hasText: 'Gendan' })).toHaveCount(0);
  });
});

/* Kundens ord (31/8): "nummer og email skal stå tydelig." Mailen
   stod som dæmpet brødtekst — nu er den et link i samme vægt som
   nummeret, og begge kan trykkes på en iPad ved lugen. */
test.describe('Nummer og mail står tydeligt', () => {

  test('mailen er et link ved siden af nummeret', async ({ page }) => {
    const d = dage();
    d.bestillinger = [b(44, I_DAG, '12:00', 'Mia Mail', 'Burger', 1,
      { email: 'mia@eksempel.dk' })];
    await åbnFanen(page, d);

    const kort = page.locator('.bestil-kort', { hasText: 'Mia Mail' });
    const links = kort.locator('.bestil-hvem a.bestil-tlf');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute('href', 'tel:20304054');
    await expect(links.nth(1)).toHaveAttribute('href', 'mailto:mia@eksempel.dk');
  });

  test('uden en mail er der kun nummeret — intet tomt link', async ({ page }) => {
    await åbnFanen(page);
    const kort = page.locator('.bestil-kort', { hasText: 'Anna Vind' });
    await expect(kort.locator('.bestil-hvem a')).toHaveCount(1);
  });
});

/* Kundens ord (31/8): "kan bestillings-ordrenummeret ikke være
   fra #0000 af, lidt pænere end det der" — det der var
   SM260831-UBJ7E på kortet. Nummeret kommer fra databasen
   (supabase/bestillingsnummer.sql); referencen er stadig rækkens
   nøgle og står som title på mærket. */
test.describe('Nummeret på kortet', () => {

  test('kortet viser #0047 — og referencen står som title', async ({ page }) => {
    const d = dage();
    d.bestillinger = [b(51, I_DAG, '12:00', 'Nr. Nina', 'Burger', 1, { nummer: 47 })];
    await åbnFanen(page, d);

    const m = page.locator('.bestil-kort .bestil-ref');
    await expect(m).toHaveText('#0047');
    expect(await m.getAttribute('title')).toBe('SM-B-51');
  });

  /* Intet må gå tabt: rækkerne fra FØR filen blev kørt har intet
     nummer, og de skal stå som de altid har — ikke som "#NaN". */
  test('en række uden nummer viser referencen som før', async ({ page }) => {
    const d = dage();
    d.bestillinger = [b(52, I_DAG, '12:00', 'Gammel Grete', 'Burger', 1)];
    await åbnFanen(page, d);

    await expect(page.locator('.bestil-kort .bestil-ref')).toHaveText('SM-B-52');
  });
});
