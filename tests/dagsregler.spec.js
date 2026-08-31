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

/* ============================================================
   DAGENS BESKED PÅ FORSIDEN
   ------------------------------------------------------------
   Kundens ord (26/8): den skal vises "pænt og flot nærmest
   cinematisk med titel og tekst".

   Den står ØVERST, fordi den handler om NU: "i dag er der kun
   mad ud af huset". Stod den længere nede, læste gæsten den
   efter at have valgt sin mad — og så er beskeden kommet for
   sent.
   ============================================================ */
test.describe('Dagens besked', () => {

  function medBesked(ekstra) {
    return data([regel(I_DAG, Object.assign({
      besked_titel: 'Kun mad ud af huset i dag',
      besked_til_gaester: 'Vi har selskab på trædækket til kl. 16.\nDu kan '
        + 'stadig hente mad ved lugen.',
    }, ekstra || {}))]);
  }

  test('titel og tekst står på forsiden', async ({ page }) => {
    await åbn(page, '/index.html', { ur: UR, data: medBesked() });
    const boks = page.locator('#dagsbesked');
    await expect(boks).toBeVisible();
    await expect(page.locator('#dagsbesked-titel'))
      .toHaveText('Kun mad ud af huset i dag');
    await expect(page.locator('#dagsbesked-tekst')).toContainText('trædækket');
    await expect(page.locator('#dagsbesked-dag')).toContainText('august');
  });

  /* ⚠️ ET BANNER UDEN INDHOLD ER EN SIDE, DER SER I STYKKER UD.

     Og prøven skal kunne skelne "korrekt skjult" fra "siden gik
     ned". MÅLT 26/8: da garden mod en tom besked blev fjernet i
     en efterprøvning, KASTEDE koden i stedet (der er ingen
     regelrække at læse en titel fra), banneret blev hængende
     skjult — og prøven sagde BESTOD om et sammenbrud. Derfor
     læses konsollen med. */
  test('uden en besked findes afsnittet ikke', async ({ page }) => {
    const fejl = [];
    page.on('pageerror', (e) => fejl.push(String(e.message)));
    page.on('console', (m) => { if (m.type() === 'error') fejl.push(m.text()); });

    await åbn(page, '/index.html', { ur: UR, data: data() });
    await expect(page.locator('#dagsbesked')).toBeHidden();

    await expect(page.locator('.hero .status')).toBeVisible();
    await expect(page.locator('.hours .now')).toBeVisible();
    expect(fejl.filter((f) => !/favicon|404|net::/.test(f)),
      'siden kastede en fejl — banneret er skjult af den forkerte grund')
      .toEqual([]);
  });

  test('en besked til i MORGEN står ikke på forsiden i dag', async ({ page }) => {
    await åbn(page, '/index.html', {
      ur: UR,
      data: data([regel(I_MORGEN, { besked_til_gaester: 'Lukket for selskab' })]),
    });
    await expect(page.locator('#dagsbesked')).toBeHidden();
  });

  /* Har personalet skrevet en tekst uden overskrift, skal der
     ikke stå et hul over den. */
  test('uden en titel står der "I dag"', async ({ page }) => {
    await åbn(page, '/index.html', {
      ur: UR,
      data: data([regel(I_DAG, { besked_til_gaester: 'Vi lukker kl. 15.' })]),
    });
    await expect(page.locator('#dagsbesked-titel')).toHaveText('I dag');
  });

  /* ⚠️ TEKSTEN ER PERSONALETS FRIE TEKST. Skrives den med
     innerHTML, kan et uheldigt tegn lave om på siden. */
  test('teksten skrives som tekst, ikke som opmærkning', async ({ page }) => {
    await åbn(page, '/index.html', {
      ur: UR,
      data: data([regel(I_DAG, {
        besked_til_gaester: 'Vi lukker <b>tidligt</b> i dag',
      })]),
    });
    await expect(page.locator('#dagsbesked-tekst b')).toHaveCount(0);
    await expect(page.locator('#dagsbesked-tekst')).toContainText('<b>tidligt</b>');
  });

  /* Cinematisk betyder, at den kan LÆSES. Hvid på ternet alene er
     3,75:1; det er hinden ovenpå, der bærer kontrasten. */
  test('teksten kan læses på den mørke grund', async ({ page }) => {
    await åbn(page, '/index.html', { ur: UR, data: medBesked() });
    const k = await page.locator('#dagsbesked-titel').evaluate((el) => {
      const tal = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const lys = (rgb) => {
        const v = rgb.map((x) => {
          x /= 255;
          return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
      };
      // Den mørkeste hinde er bunden af gradienten
      const a = lys(tal(getComputedStyle(el).color));
      const b = lys([58, 22, 26]);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(k, 'dagsbeskeden kan ikke læses').toBeGreaterThan(4.5);
  });
});

/* ============================================================
   QR-SPÆRREN
   ------------------------------------------------------------
   Kundens ord: "lad dem også få en blokér bestillinger på qr
   koden bare hvis de har lyst."
   ============================================================ */
test.describe('QR kan spærres', () => {

  const BORDE = [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
    placering: 'ude', aktiv: true, sortering: 10 }];

  test('slået fra: bordsiden siger det FØR gæsten vælger mad', async ({ page }) => {
    const d = data();
    d.borde = BORDE;
    d.indstillinger = { ...d.indstillinger, bordbestilling_aaben: false };
    await åbn(page, '/ved-bordet/?bord=7', { ur: UR, data: d });

    await expect(page.locator('#bestil-lukket')).toBeVisible();
    await expect(page.locator('#bestil-form')).toBeHidden();
    // Og den peger på lugen — der er et menneske tyve meter væk
    await expect(page.locator('#bestil-lukket')).toContainText('lugen');
  });

  /* ⚠️ MANGLER INDSTILLINGEN, ER QR ÅBEN. En forretning, der
     aldrig har rørt fluebenet, skal ikke opdage, at bordene
     holdt op med at virke. Det er den samme regel, databasens
     værn følger. */
  test('uden indstillingen er QR åben', async ({ page }) => {
    const d = data();
    d.borde = BORDE;
    await åbn(page, '/ved-bordet/?bord=7', { ur: UR, data: d });
    await expect(page.locator('#bestil-form')).toBeVisible();
  });

  test('slået til er den åben', async ({ page }) => {
    const d = data();
    d.borde = BORDE;
    d.indstillinger = { ...d.indstillinger, bordbestilling_aaben: true };
    await åbn(page, '/ved-bordet/?bord=7', { ur: UR, data: d });
    await expect(page.locator('#bestil-form')).toBeVisible();
  });

  /* ⚠️ SPÆRREN RAMMER KUN BORDENE. Ramte den lugen med, ville en
     forretning, der slog QR fra en travl lørdag, lukke hele
     take-away-forretningen uden at vide det. */
  test('lugens egen bestillingsside er urørt', async ({ page }) => {
    const d = data();
    d.indstillinger = { ...d.indstillinger, bordbestilling_aaben: false };
    await åbn(page, '/bestil/', { ur: UR, data: d });
    await expect(page.locator('#bestil-form')).toBeVisible();
  });
});

/* ============================================================
   ÉN SEKTION MÅ IKKE TAGE DE ANDRE MED SIG
   ------------------------------------------------------------
   Forsidens kobling kaldte syv funktioner i den samme then() med
   ÉN .catch om det hele. Kastede den anden, blev de fem sidste
   aldrig kørt — dagens ret, nyhederne, åbningstiderne og
   tapasprisen stod tilbage som designets pladsholdere, og det
   eneste spor var en console.warn, ingen ser.

   Det er nøjagtig den samme fejl som Promise.all i Butik.hent(),
   hvor en manglende tabel væltede hele menuen. Her koster den
   mindre og ser lige så normal ud.

   ⚠️ DEN HER PRØVE ER GRUNDEN TIL, AT DEN BLEV FUNDET. Prøven om
   den tomme besked kunne IKKE se det: efter rettelsen fejler
   banneret pænt, og en tom skærm ligner en tom skærm. Isolationen
   skal måles for sig.
   ============================================================ */
test.describe('En fejl i én sektion stopper ikke de andre', () => {

  test('åbningstiderne tegnes, selv om dagsbeskeden kaster', async ({ page }) => {
    /* ⚠️ FEJLEN LÆGGES IND FØR SIDEN INDLÆSES, og det er hele
       kunsten. En page.evaluate BAGEFTER ville komme for sent —
       koblingen har allerede kørt — og et reload ville skylle
       ændringen væk igen. Her serveres store.js med en
       dagsregel(), der kaster, så fejlen kommer ad den samme vej
       som en rigtig. */
    await page.route('**/js/store.js*', async (route) => {
      const svar = await route.fetch();
      const kode = await svar.text();
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: kode + '\n;window.Butik.dagsregel = function () {'
          + ' throw new Error("med vilje"); };',
      });
    });

    /* ⚠️ TIDERNE SÆTTES TIL NOGET, DER IKKE STÅR I DESIGNET.

       Første udgave ledte efter .hours .now — og den findes i
       designets FASTE opmærkning, så prøven bestod, også da
       isolationen blev pillet ud. Et tal, der kun kan komme fra
       databasen, er det eneste, der beviser, at tegningen kørte. */
    const d = data();
    d.aabningstider = d.aabningstider.map((a) => (
      { ...a, aabner: '09:00', lukker: '10:00' }));
    await åbn(page, '/index.html', { ur: UR, data: d });

    /* ⚠️ .first(): find-afsnittet har TO .hours-paneler nu (31/8)
       — tiderne og kontakten. Prøven her måler tidernes. */
    await expect(page.locator('.hours').first(),
      'en fejl i dagsbeskeden tog åbningstiderne med sig')
      .toContainText('9–10');
    await expect(page.locator('#dagsbesked')).toBeHidden();
  });
});
