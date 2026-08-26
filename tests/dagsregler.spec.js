/* DAGSREGLERNE PÅ GÆSTESIDEN

   Kundens ord (26/8): "hvis der er selskab en dag ... skal de
   kunne administrere at der ikke er åbent for bestillinger den
   dag eller kun åbent for to go ... så det netop ikke kan gå
   galt."

   Databasen siger nej — det er bevist i supabase/proev-dagsregler.sql
   med 21 af 21. Prøverne her måler den ANDEN halvdel: at
   browseren siger det SAMME. Gør den ikke det, får gæsten lov at
   vælge hele sin mad og møder først afvisningen på send-knappen,
   og det er den slags, der får folk til at gå op til lugen og
   spørge hvorfor.

   ⚠️ Reglerne bor i js/bestil-regler.js, som forsiden, bestil/ og
   ved-bordet/ deler. Derfor måles de dér, og ikke tre gange på
   tre sider.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

// Torsdag 6. august 2026 kl. 13.00 dansk tid.
const UR = '2026-08-06T11:00:00Z';
const I_DAG = '2026-08-06';
const I_MORGEN = '2026-08-07';

/* Varslet sættes til 0, så i dag og i morgen begge kan vælges —
   ellers ville de 24 timers standard skjule den dag, prøven
   handler om, og prøven ville bestå af den forkerte grund. */
function data(regler) {
  const d = grunddata();
  d.indstillinger = { ...d.indstillinger, bestilling_varsel_timer: 0 };
  d.dags_regler = regler || [];
  return d;
}

function regel(dato, ekstra) {
  return Object.assign({
    id: 1, lokation_id: 'mosede', dato,
    luk_takeaway: false, luk_spis_her: false,
    tidligst: null, senest_togo: null, senest_spis_her: null,
    besked_til_gaester: null,
  }, ekstra || {});
}

/* Reglerne læses i sidens egen browser, så de måles dér. Det er
   den samme kode, forsiden kalder. */
async function spørg(page, udtryk, ...args) {
  return page.evaluate(([kode, a]) => {
    // eslint-disable-next-line no-new-func
    return new Function('d', 'a', 'return ' + kode)(
      JSON.parse(localStorage.getItem('mosede_data_v1')), a);
  }, [udtryk, args]);
}

test.describe('En dag kan være halvt åben', () => {

  test('uden en regelrække er dagen helt almindelig', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: UR, data: data() });
    const svar = await spørg(page,
      `({ togo: MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'afhentning').length,
          her:  MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'spis_her').length })`);
    expect(svar.togo).toBeGreaterThan(0);
    expect(svar.her).toBeGreaterThan(0);
  });

  /* SELSKABSDAGEN. Trædækket er optaget, men køkkenet laver mad. */
  test('lukket for spis her: ingen tider til spis her, men stadig til to-go',
    async ({ page }) => {
    await åbn(page, '/bestil/', {
      ur: UR, data: data([regel(I_MORGEN, { luk_spis_her: true })]),
    });
    const svar = await spørg(page,
      `({ togo: MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'afhentning').length,
          her:  MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'spis_her').length })`);
    expect(svar.her, 'spis her kan stadig vælges på en lukket dag').toBe(0);
    expect(svar.togo, 'take-away blev lukket med — en hel dags salg tabt')
      .toBeGreaterThan(0);
  });

  test('lukket for take-away: den anden vej rundt', async ({ page }) => {
    await åbn(page, '/bestil/', {
      ur: UR, data: data([regel(I_MORGEN, { luk_takeaway: true })]),
    });
    const svar = await spørg(page,
      `({ togo: MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'afhentning').length,
          her:  MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'spis_her').length,
          lev:  MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'levering').length })`);
    expect(svar.togo).toBe(0);
    expect(svar.lev, 'levering er også ud af huset').toBe(0);
    expect(svar.her).toBeGreaterThan(0);
  });

  /* ⚠️ BEGGE VEJE SPÆRRET ER EN LUKKEDAG. Står dagen alligevel i
     vælgeren, kan gæsten vælge den og får først besked, når hun
     trykker send. */
  test('begge veje lukket: dagen findes slet ikke i vælgeren', async ({ page }) => {
    await åbn(page, '/bestil/', {
      ur: UR,
      data: data([regel(I_MORGEN, { luk_takeaway: true, luk_spis_her: true })]),
    });
    const dage = await spørg(page, 'MosedeRegler.muligeDage(d, 0)');
    expect(dage).not.toContain(I_MORGEN);
    expect(dage, 'de andre dage røg med').toContain(I_DAG);
  });

  /* Dagvælgeren tegnes, FØR gæsten har valgt hvordan hun vil
     spise. En dag må ikke forsvinde, fordi den ene vej er
     lukket — så ville selskabsdagen se ud som en lukkedag. */
  test('uden et hvordan står den halvt åbne dag stadig i vælgeren', async ({ page }) => {
    await åbn(page, '/bestil/', {
      ur: UR, data: data([regel(I_MORGEN, { luk_spis_her: true })]),
    });
    const dage = await spørg(page, 'MosedeRegler.muligeDage(d, 0)');
    expect(dage).toContain(I_MORGEN);
  });
});

test.describe('Dagens egne tider', () => {

  test('dagens tidligste skærer morgenen af', async ({ page }) => {
    await åbn(page, '/bestil/', {
      ur: UR, data: data([regel(I_MORGEN, { tidligst: '16:00' })]),
    });
    const tider = await spørg(page,
      `MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'afhentning')`);
    expect(tider[0]).toBe('16:00');
  });

  /* ⚠️ DE TO SIDSTE TIDER ER FORSKELLIGE, og det er hele
     pointen: køkkenet pakker ud af huset til kl. 19, men
     gæsterne må sidde og spise til 20.30. */
  test('to-go og spis her har hver sin sidste tid', async ({ page }) => {
    await åbn(page, '/bestil/', {
      ur: UR,
      data: data([regel(I_MORGEN, { senest_togo: '19:00', senest_spis_her: '20:30' })]),
    });
    const svar = await spørg(page,
      `({ togo: MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'afhentning'),
          her:  MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'spis_her') })`);
    // Sidste tid er en halv time før — der skal være tid til at
    // række posen ud af lugen.
    expect(svar.togo[svar.togo.length - 1]).toBe('18:30');
    expect(svar.her[svar.her.length - 1]).toBe('20:00');
  });

  /* ⚠️ DAGENS TIDER KAN KUN SNÆVRE IND. En dag, der åbnede
     TIDLIGERE end åbningstiderne, ville love en luge, der ikke er
     bemandet. Åbningstiderne i grunddata er 11–21. */
  test('en dag kan ikke åbne tidligere end åbningstiderne', async ({ page }) => {
    await åbn(page, '/bestil/', {
      ur: UR, data: data([regel(I_MORGEN, { tidligst: '07:00' })]),
    });
    const tider = await spørg(page,
      `MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'afhentning')`);
    expect(tider[0]).toBe('11:00');
  });

  test('og heller ikke lukke senere', async ({ page }) => {
    await åbn(page, '/bestil/', {
      ur: UR, data: data([regel(I_MORGEN, { senest_togo: '23:00' })]),
    });
    const tider = await spørg(page,
      `MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'afhentning')`);
    expect(tider[tider.length - 1]).toBe('20:30');
  });
});

test.describe('De andre dage er urørte', () => {

  /* En regel gælder ÉN dag. Ramte den flere, ville en enkelt
     selskabsaften lukke hele ugen — og det ville se helt rigtigt
     ud i admin. */
  test('en regel på i morgen rører ikke i dag', async ({ page }) => {
    await åbn(page, '/bestil/', {
      ur: UR,
      data: data([regel(I_MORGEN, { luk_takeaway: true, luk_spis_her: true })]),
    });
    const svar = await spørg(page,
      `({ iDag: MosedeRegler.tiderFor(d, '${I_DAG}', 0, 'afhentning').length,
          iMorgen: MosedeRegler.tiderFor(d, '${I_MORGEN}', 0, 'afhentning').length })`);
    expect(svar.iDag).toBeGreaterThan(0);
    expect(svar.iMorgen).toBe(0);
  });
});
