/* ============================================================
   HENT MENUKORTET SOM REGNEARK  (3/9)
   ------------------------------------------------------------
   Kundens ord: "giv mig det hele som filer, da jeg skal lave
   menukort." Der ligger et script i vaerktoej/, men det kræver
   en terminal — og det blev prøvet kørt i Supabases SQL Editor,
   hvor det fejlede på linje 1. Knappen på Menukort-fanen henter
   det SAMME regneark uden terminal, script eller nøgle.

   ⚠️ PRØVEN LÆSER FILENS INDHOLD, ikke knappens attributter.
   Et spørgsmål til <a download> ville bestå, også hvis
   indholdet var tomt eller manglede prisen.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, visFane } = require('./hjaelp');

/* Ejerens virkelighed i miniature: en kategori der kan
   bestilles, en der ikke kan (is), en vare uden pris og en
   udsolgt. */
function menuData() {
  return grunddata({
    menu_kategorier: [
      { id: 1, lokation_id: 'mosede', navn: 'Smørrebrød', afdeling: 'mad',
        sortering: 1, aktiv: true, note: null, dage: 'alle' },
      { id: 2, lokation_id: 'mosede', navn: 'Burgere', afdeling: 'mad',
        sortering: 2, aktiv: true, note: 'Serveres 11-20', dage: 'hverdage' },
      { id: 3, lokation_id: 'mosede', navn: 'Kugleis', afdeling: 'is',
        sortering: 3, aktiv: true, note: null, dage: 'alle' },
    ],
    menu_varer: [
      { id: 1, lokation_id: 'mosede', kategori_id: 1, navn: 'Leverpostej med surt',
        pris: 55, beskrivelse: 'Rugbrød, smør og surt', sortering: 1,
        aktiv: true, udsolgt: false },
      { id: 2, lokation_id: 'mosede', kategori_id: 2, navn: 'Cheeseburger',
        pris: 85, beskrivelse: 'Bøf, ost, salat; kan fås uden', sortering: 1,
        aktiv: true, udsolgt: true },
      { id: 3, lokation_id: 'mosede', kategori_id: 2, navn: 'Morgenbrød',
        pris: null, beskrivelse: 'Sig til dagen før', sortering: 2,
        aktiv: true, udsolgt: false },
      { id: 4, lokation_id: 'mosede', kategori_id: 3, navn: 'Vaffel',
        pris: 30, beskrivelse: null, sortering: 1, aktiv: true, udsolgt: false },
    ],
    /* ⚠️ ISEN ER TIKKET AF MED VILJE. Var den ikke, kunne prøven
       "isen kan ikke bestilles" ikke fejle: kategorien ville
       alligevel være ude, fordi den manglede fluebenet — og
       falsifikationen bestod første gang af netop den grund.
       Nu er fluebenet SAT, så afdelingsreglen er det eneste, der
       holder isen ude. */
    indstillinger: Object.assign({}, grunddata().indstillinger,
      { bestilbare_kategorier: [2, 3] }),
  });
}

async function hentCsv(page) {
  await åbnAdmin(page, { data: menuData() });
  await visFane(page, 'p-menu');
  const [fil] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#hent-menukort').click(),
  ]);
  const sti = await fil.path();
  return { navn: fil.suggestedFilename(), tekst: require('fs').readFileSync(sti, 'utf8') };
}

test.describe('Menukortet kan hentes som regneark', () => {

  test('filen indeholder varerne, priserne og beskrivelserne', async ({ page }) => {
    const { tekst } = await hentCsv(page);
    expect(tekst).toContain('Leverpostej med surt;55');
    expect(tekst).toContain('Cheeseburger;85');

    /* ⚠️ SKILLETEGNET ER SEMIKOLON, fordi et dansk Excel deler på
       det — og fordi halvdelen af ejerens beskrivelser har komma
       i sig ("ost, skinke, spejlæg"). Med komma som skilletegn
       ville hver af dem blive tre kolonner.

       Reglen er derfor todelt, og prøven måler begge halvdele:
       et KOMMA står bart, et SEMIKOLON pakkes ind. Første udgave
       krævede anførselstegn om kommaet — den målte en regel,
       filen ikke har, og den faldt med rette. */
    expect(tekst, 'komma skal stå bart, når skilletegnet er semikolon')
      .toContain(';Rugbrød, smør og surt;');
    expect(tekst, 'et semikolon i beskrivelsen skal pakkes ind')
      .toContain('"Bøf, ost, salat; kan fås uden"');
  });

  /* ⚠️ EN VARE UDEN PRIS SKRIVES TOM, ALDRIG SOM 0. Et beløb, vi
     finder på, er værre end ingen pris — det står på et menukort,
     nogen trykker, og gæsten regner med det. */
  test('en vare uden pris står som en tom celle, ikke som 0', async ({ page }) => {
    const { tekst } = await hentCsv(page);
    const linje = tekst.split(/\r?\n/).find((l) => l.startsWith('Burgere;Mad;Morgenbrød'));
    expect(linje, 'Morgenbrød står ikke i filen').toBeTruthy();
    expect(linje).toContain('Morgenbrød;;');
    expect(linje).not.toMatch(/Morgenbrød;0/);
  });

  /* Kolonnen er hele grunden til, at filen kan bruges: den siger,
     hvad en gæst FAKTISK kan lægge i kurven — ikke bare hvad der
     står på kortet. */
  test('filen siger, hvad der kan bestilles — og isen kan ikke', async ({ page }) => {
    const { tekst } = await hentCsv(page);
    const felt = (vare) => {
      const l = tekst.split(/\r?\n/).find((x) => x.includes(';' + vare + ';'));
      return l.split(';')[8];
    };
    // Smørrebrødet har intet flueben og kan alligevel altid bestilles.
    expect(felt('Leverpostej med surt'), 'smørrebrød skal altid kunne bestilles').toBe('ja');
    expect(felt('Cheeseburger'), 'Burgere har fluebenet').toBe('ja');
    /* ⚠️ ISEN KAN IKKE BESTILLES NOGEN STEDER — heller ikke med
       et flueben. "Den er altid til rådighed" (kunden 23/8). */
    expect(felt('Vaffel'), 'isen kan ikke bestilles').toBe('nej');
  });

  test('udsolgt og skjult står i filen', async ({ page }) => {
    const { tekst } = await hentCsv(page);
    const linje = tekst.split(/\r?\n/).find((l) => l.includes(';Cheeseburger;'));
    expect(linje.split(';')[7], 'Cheeseburger er meldt udsolgt').toBe('ja');
  });

  /* ⚠️ BOM FORAN. Uden den læser et dansk Excel filen som
     Latin-1, og hvert æ, ø og å bliver til krims-krams i et
     menukort, nogen skal trykke. */
  test('filen begynder med BOM, så æ, ø og å overlever Excel', async ({ page }) => {
    const { tekst, navn } = await hentCsv(page);
    expect(tekst.charCodeAt(0), 'BOM mangler').toBe(0xfeff);
    expect(navn).toMatch(/^mosede-menukort-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  /* Knappen ændrer ingenting — den er en udgang, ikke en
     handling. Databasen skal se præcis ud som før. */
  test('et tryk skriver ingenting i databasen', async ({ page }) => {
    await åbnAdmin(page, { data: menuData() });
    await visFane(page, 'p-menu');
    const før = await page.evaluate(() => localStorage.getItem('mosede_data_v1'));
    await Promise.all([
      page.waitForEvent('download'),
      page.locator('#hent-menukort').click(),
    ]);
    const efter = await page.evaluate(() => localStorage.getItem('mosede_data_v1'));
    expect(efter).toBe(før);
  });
});
