/* DAGENS RET FIK EN TABEL

   Den var ÉN indstilling: ét navn, én dag, én pris. Det gav tre
   begrænsninger, som alle tre kostede noget:

   1) KUN I DAG. Menukortets ugeplan stod halvt tom — "Følger
      snart…" fra tirsdag og frem — fordi der ikke fandtes et sted
      at skrive torsdagens ret.
   2) KUN ÉN RET. To at vælge imellem blev til ét langt navn med
      én pris, og så var det gæsten, der skulle gætte.
   3) INGEN UDSOLGT. Retten kunne bestilles, til nogen huskede at
      tømme feltet.

   ⚠️ Kræver supabase/dagens-retter.sql (11 × BESTOD lokalt).
   Selve NEDTÆLLINGEN er databasens og måles dér — prøverne her
   måler det, browseren gør med tallet.

   Uret står på fredag den 7. august 2026. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, åbnAdmin, grunddata, gemteData, sætUr } = require('./hjaelp');

const I_DAG = '2026-08-07';
const I_MORGEN = '2026-08-08';
const UR = I_DAG + 'T11:00:00Z';

function ret(æ) {
  return Object.assign({
    id: 1, lokation_id: 'mosede', dato: I_DAG, navn: 'Stegt flæsk',
    beskrivelse: 'Med persillesovs og kartofler.', pris: 109,
    antal_tilbage: null, udsolgt: false, aktiv: true, sortering: 1,
  }, æ);
}

const medRetter = (retter) => grunddata({ dagens_retter: retter });

test.describe('Flere retter på den samme dag', () => {

  test('menukortet viser dem begge med hver sin pris', async ({ page }) => {
    /* Før stod "Stegt flæsk eller fiskefilet" i ét felt med ÉN
       pris, og gæsten skulle gætte, hvad de to kostede. */
    const d = medRetter([
      ret({ id: 1, navn: 'Stegt flæsk', pris: 109 }),
      ret({ id: 2, navn: 'Fiskefilet', pris: 99, sortering: 2 }),
    ]);
    await åbnSkal(page, '/m-menukort.html', { ur: UR, data: d });

    const kort = page.locator('#mk-idag');
    await expect(kort).toContainText('Stegt flæsk');
    await expect(kort).toContainText('109');
    await expect(kort).toContainText('Fiskefilet');
    await expect(kort).toContainText('99');
  });

  test('forsiden viser den første og nævner de andre', async ({ page }) => {
    /* Designet har tegnet ÉT kort, og skallen er facitlisten. Et
       kort mere ville være en ændring af den. */
    const d = medRetter([
      ret({ id: 1, navn: 'Stegt flæsk', pris: 109 }),
      ret({ id: 2, navn: 'Fiskefilet', pris: 99, sortering: 2 }),
    ]);
    await åbnSkal(page, '/index.html', { ur: UR, data: d });

    await expect(page.locator('#idag .today h3')).toHaveText('Stegt flæsk');
    await expect(page.locator('#idag')).toContainText('Fiskefilet');
  });
});

test.describe('Ugen er ikke halvt tom længere', () => {

  test('en ret på torsdag står på ugeplanen', async ({ page }) => {
    const d = medRetter([ret({ id: 1, dato: '2026-08-13', navn: 'Boller i karry' })]);
    await åbnSkal(page, '/m-menukort.html', { ur: UR, data: d });

    const torsdag = page.locator('.mk-uge [data-dag="2026-08-13"]');
    await expect(torsdag).toContainText('Boller i karry');
  });

  test('en dag uden en ret siger stadig "Følger snart"', async ({ page }) => {
    /* En opdigtet ret på torsdag ville være et løfte, køkkenet
       ikke har givet. */
    await åbnSkal(page, '/m-menukort.html', { ur: UR, data: medRetter([]) });
    await expect(page.locator('.mk-uge [data-dag="2026-08-13"]'))
      .toContainText('Følger snart');
  });
});

test.describe('Udsolgt og antal tilbage', () => {

  test('en udsolgt ret bliver stående, men mærket', async ({ page }) => {
    /* Gæsten skal kunne se, hvad der VAR — men den må ikke se ud
       som noget, man kan bestille. */
    const d = medRetter([ret({ udsolgt: true, antal_tilbage: 0 })]);
    await åbnSkal(page, '/m-menukort.html', { ur: UR, data: d });

    await expect(page.locator('#mk-idag')).toContainText('Stegt flæsk');
    await expect(page.locator('#mk-idag')).toContainText('Udsolgt');
  });

  test('"kun 3 tilbage" står der, når tallet er lavt', async ({ page }) => {
    const d = medRetter([ret({ antal_tilbage: 3 })]);
    await åbnSkal(page, '/m-menukort.html', { ur: UR, data: d });
    await expect(page.locator('#mk-idag')).toContainText('Kun 3 tilbage');
  });

  /* ⚠️ ET HØJT TAL ER IKKE EN OPLYSNING, DET ER STØJ. "Kun 40
     tilbage" beroliger ingen og fylder en linje. */
  test('et højt tal står der ikke', async ({ page }) => {
    const d = medRetter([ret({ antal_tilbage: 40 })]);
    await åbnSkal(page, '/m-menukort.html', { ur: UR, data: d });
    await expect(page.locator('#mk-idag')).not.toContainText('tilbage');
  });

  test('en ret uden et antal siger ingenting om antal', async ({ page }) => {
    await åbnSkal(page, '/m-menukort.html', { ur: UR, data: medRetter([ret()]) });
    await expect(page.locator('#mk-idag')).not.toContainText('tilbage');
  });
});

test.describe('Bestillingen følger den valgte dag', () => {

  test('en udsolgt ret kan ikke bestilles', async ({ page }) => {
    const d = medRetter([ret({ udsolgt: true })]);
    d.indstillinger.bestilling_varsel_timer = 0;
    await åbnSkal(page, '/index.html', { ur: UR, data: d });

    /* Rækkerne i varelisten, ikke hele afsnittet: afsnittet
       rummer også overskrifter og hjælpetekst. */
    await expect(page.locator('#bestil .item').filter({ hasText: 'Stegt flæsk' }))
      .toHaveCount(0);
  });

  test('en ret uden pris kan ses, men ikke bestilles', async ({ page }) => {
    /* Samme regel som på menukortet: kan vi prissætte det, kan
       det bestilles — kan vi ikke, kan det ses. */
    const d = medRetter([ret({ pris: null })]);
    d.indstillinger.bestilling_varsel_timer = 0;
    await åbnSkal(page, '/m-menukort.html', { ur: UR, data: d });
    await expect(page.locator('#mk-idag')).toContainText('Stegt flæsk');

    await åbnSkal(page, '/index.html', { ur: UR, data: d });
    await expect(page.locator('#idag .today h3')).toHaveText('Stegt flæsk');
  });
});

test.describe('Den gamle indstilling lever videre', () => {

  /* ⚠️ DEN VIGTIGSTE PRØVE I FILEN. Er der ikke lagt noget i
     tabellen, men står der en ret i den gamle indstilling, skal
     DEN vises — ellers ville dagens ret forsvinde fra forsiden i
     det sekund, SQL-filen blev kørt, og det, ejeren har skrevet,
     ville se ud til at være væk. */
  test('uden rækker i tabellen vises den gamle dagens ret', async ({ page }) => {
    const d = grunddata({ dagens_retter: [] });
    d.indstillinger.dagens_ret = {
      navn: 'Pastaruller med salciccia', beskrivelse: 'Med salat.', pris: 109,
    };
    await åbnSkal(page, '/index.html', { ur: UR, data: d });
    await expect(page.locator('#idag .today h3')).toHaveText('Pastaruller med salciccia');
  });

  test('men tabellen vinder, når der ER lagt noget ind', async ({ page }) => {
    const d = medRetter([ret({ navn: 'Stegt flæsk' })]);
    d.indstillinger.dagens_ret = { navn: 'Gammel ret', beskrivelse: '', pris: 89 };
    await åbnSkal(page, '/index.html', { ur: UR, data: d });
    await expect(page.locator('#idag .today h3')).toHaveText('Stegt flæsk');
  });

  /* Den gamle indstilling gælder KUN i dag. Den har ingen dato i
     sig, og at vise den på torsdag ville være at love den samme
     ret hele ugen. */
  test('den gamle indstilling smitter ikke af på de andre dage', async ({ page }) => {
    const d = grunddata({ dagens_retter: [] });
    d.indstillinger.dagens_ret = { navn: 'Kun i dag', beskrivelse: '', pris: 89 };
    await åbnSkal(page, '/m-menukort.html', { ur: UR, data: d });

    await expect(page.locator('.mk-uge [data-dag="' + I_MORGEN + '"]'))
      .not.toContainText('Kun i dag');
  });
});

test.describe('Ugeplanen i admin', () => {

  async function ugefanen(page, retter) {
    await åbnAdmin(page, { data: medRetter(retter || []) });
    await page.locator('[data-panel="p-forside"]').click();
    await page.waitForSelector('#uge-retter .uge-dag');
  }

  test('planen viser syv dage frem', async ({ page }) => {
    await ugefanen(page);
    await expect(page.locator('#uge-retter .uge-dag')).toHaveCount(7);
    await expect(page.locator(`#uge-retter [data-dag="${I_DAG}"]`)).toHaveCount(1);
  });

  test('en ret kan lægges på en dag', async ({ page }) => {
    await ugefanen(page);
    const dag = page.locator(`#uge-retter [data-dag="2026-08-13"]`);
    await dag.getByLabel('Ny ret').fill('Boller i karry');
    await dag.locator('input.smal').first().fill('99');
    await dag.locator('button', { hasText: 'Tilføj' }).click();
    await expect(page.locator('#kvittering')).toContainText('13. august');

    const gemt = await gemteData(page);
    const r = gemt.dagens_retter[0];
    expect(r.navn).toBe('Boller i karry');
    expect(r.dato).toBe('2026-08-13');
    expect(r.pris).toBe(99);
  });

  test('startantallet kan sættes', async ({ page }) => {
    await ugefanen(page);
    const dag = page.locator(`#uge-retter [data-dag="${I_DAG}"]`);
    await dag.getByLabel('Ny ret').fill('Stegt flæsk');
    await dag.locator('input.smal').first().fill('109');
    await dag.locator('input[type="number"]').fill('20');
    await dag.locator('button', { hasText: 'Tilføj' }).click();

    const gemt = await gemteData(page);
    expect(gemt.dagens_retter[0].antal_tilbage).toBe(20);
  });

  /* ⚠️ ANTALLET SENDES KUN MED, NÅR NOGEN HAR RØRT FELTET.

     Databasen tæller selv ned ved hver bestilling. Gemte admin
     tallet med hver gang, ville en optegning midt i en frokost
     skrive morgenens tal tilbage — og en udsolgt ret ville blive
     bestilbar igen, fordi nogen rettede en stavefejl i navnet. */
  test('et gem uden at røre antallet rører ikke antallet', async ({ page }) => {
    await ugefanen(page, [ret({ antal_tilbage: 4 })]);

    const raekke = page.locator('#uge-retter [data-ret="1"]');
    await raekke.locator('input.navn').fill('Stegt flæsk med sovs');
    await raekke.locator('button', { hasText: 'Gem' }).first().click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const gemt = await gemteData(page);
    expect(gemt.dagens_retter[0].navn).toBe('Stegt flæsk med sovs');
    expect(gemt.dagens_retter[0].antal_tilbage,
      'antallet blev skrevet tilbage af et gem, der ikke handlede om det').toBe(4);
  });

  test('udsolgt kan sættes i hånden', async ({ page }) => {
    await ugefanen(page, [ret()]);
    const raekke = page.locator('#uge-retter [data-ret="1"]');
    await raekke.locator('input[type="checkbox"]').check();
    await raekke.locator('button', { hasText: 'Gem' }).first().click();

    const gemt = await gemteData(page);
    expect(gemt.dagens_retter[0].udsolgt).toBe(true);
  });

  test('en ret kan fjernes igen', async ({ page }) => {
    await ugefanen(page, [ret()]);
    page.once('dialog', (d) => d.accept());
    await page.locator('#uge-retter [data-ret="1"] button.fare').click();
    await expect(page.locator('#kvittering')).toContainText('fjernet');

    const gemt = await gemteData(page);
    expect(gemt.dagens_retter || []).toHaveLength(0);
  });

  /* Den samme ret to gange på den samme dag er en tastefejl, ikke
     to retter — og øvetilstanden skal sige det samme som
     databasen, ellers er det ikke en øvelse. */
  test('den samme ret kan ikke stå to gange på en dag', async ({ page }) => {
    await ugefanen(page, [ret()]);
    const dag = page.locator(`#uge-retter [data-dag="${I_DAG}"]`);
    await dag.getByLabel('Ny ret').fill('  stegt flæsk ');
    await dag.locator('button', { hasText: 'Tilføj' }).click();
    await expect(page.locator('#fejl')).toContainText('står allerede');
  });

  /* VAGTHUNDEN GÆLDER OGSÅ HER. Personalet skriver "Lukket i dag"
     i det felt, de har åbent — og så står beskeden på forsiden
     som noget, gæsterne kan BESTILLE. */
  test('en besked forklædt som en ret bliver mødt med et spørgsmål', async ({ page }) => {
    await ugefanen(page);
    const dag = page.locator(`#uge-retter [data-dag="${I_DAG}"]`);
    await dag.getByLabel('Ny ret').fill('Lukket i dag');

    let spurgt = false;
    page.once('dialog', (d) => { spurgt = true; d.dismiss(); });
    await dag.locator('button', { hasText: 'Tilføj' }).click();
    await page.waitForTimeout(300);

    expect(spurgt, 'der blev ikke spurgt').toBe(true);
    const gemt = await gemteData(page);
    expect(gemt.dagens_retter || []).toHaveLength(0);
  });
});

/* ============================================================
   EN MANGLENDE TABEL MÅ IKKE VÆLTE HELE MENUEN
   ------------------------------------------------------------
   MÅLT I PRODUKTIONEN 26/8, og det er den dyreste fejl i
   projektet indtil nu:

   supabase/dagens-retter.sql var aldrig kørt. Tabellen svarede
   404. Butik.hent() henter otte tabeller med Promise.all, og den
   ene, der kastede, væltede dem alle — så gæsten fik NØDMENUEN
   med to varer, mens der stod 242 i databasen.

   Og siden så helt normal ud imens. Der var ingen fejl på
   skærmen, ingen tom liste, ingen advarsel: bare et menukort med
   "Smørrebrød 55,-" og "Håndmad 24,-", som om det var hele
   forretningen. Det er præcis den slags, der først opdages, når
   en gæst spørger hvorfor hun ikke kan bestille en burger.

   ⚠️ Der stod endda i koden, at det degraderede pænt — "fejler
   tabellen, giver hentTabel en tom liste". Det gjorde den ikke.
   En kommentar er ikke en prøve.

   dagens_retter er den ENESTE tabel, der får lov at mangle: den
   kom til, efter siden var i luften, og den er valgfri af design.
   De syv andre er sidens fundament — svarer menu_varer 404, ER
   nødmenuen det rigtige svar, og prøve to holder det fast.
   ============================================================ */
test.describe('En tabel, der kom sent, må ikke tage resten med sig', () => {

  /* Skyen slås TIL, så store.js går den rigtige vej gennem
     hentTabel — øvetilstanden læser localStorage og ville aldrig
     ramme fejlen. Alle otte kald besvares her, og kun
     dagens_retter får 404'eren, tabellen gav i produktionen. */
  async function medSkyen(page, fejlendeTabel) {
    await page.route('**/js/config.js*', (r) => r.fulfill({
      status: 200, contentType: 'application/javascript',
      body: "window.MOSEDE_CLOUD = { url: 'https://proeve.test', anonKey: 'proeve' };",
    }));

    const d = grunddata();
    const svar = {
      lokationer: d.lokationer,
      aabningstider: d.aabningstider,
      kalender: [],
      menu_kategorier: d.menu_kategorier,
      menu_varer: d.menu_varer,
      nyheder: [],
      indstillinger: Object.keys(d.indstillinger).map(function (k) {
        return { lokation_id: 'mosede', noegle: k, vaerdi: d.indstillinger[k] };
      }),
      dagens_retter: [],
    };

    await page.route('https://proeve.test/rest/v1/**', (route) => {
      const tabel = new URL(route.request().url()).pathname.split('/').pop();
      if (tabel === fejlendeTabel) {
        return route.fulfill({
          status: 404, contentType: 'application/json',
          body: JSON.stringify({ code: 'PGRST205',
            message: "Could not find the table 'public." + tabel + "' in the schema cache" }),
        });
      }
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(svar[tabel] || []),
      });
    });
  }

  test('mangler dagens_retter, står hele menukortet der stadig', async ({ page }) => {
    await medSkyen(page, 'dagens_retter');
    await sætUr(page, '2026-08-07T11:00:00Z');
    await page.goto('/menu.html', { waitUntil: 'domcontentloaded' });

    /* Menukortet er databasens, ikke nødmenuens. De to lister
       deler navnet "Smørrebrød", så DET ord kan ikke skelne dem —
       prøven måler på en vare, der kun findes ét af stederne. */
    await expect(page.locator('#menu-liste'),
      'en manglende dagens_retter væltede hele menuen ned i nødmenu')
      .toContainText('Flæskestegssandwich');
    await expect(page.locator('#menu-liste'),
      'nødmenuens Håndmad står der — så er hentningen alligevel væltet')
      .not.toContainText('Håndmad');
  });

  /* MEN DE SYV ANDRE SKAL STADIG VÆLTE. Svarer menu_varer 404, er
     der ingen menu at vise, og nødmenuen ER det rigtige svar —
     ikke en tom side. Uden den her prøve kunne nogen "løse"
     ovenstående ved at pakke ALLE otte kald ind i en catch, og så
     ville en død database se ud som en forretning uden varer. */
  test('mangler menu_varer, falder siden tilbage på nødmenuen', async ({ page }) => {
    await medSkyen(page, 'menu_varer');
    await sætUr(page, '2026-08-07T11:00:00Z');
    await page.goto('/menu.html', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#menu-liste')).toContainText('Håndmad');
    await expect(page.locator('#menu-liste'),
      'menu_varer fejlede, men siden viste alligevel databasens varer')
      .not.toContainText('Flæskestegssandwich');
  });
});
