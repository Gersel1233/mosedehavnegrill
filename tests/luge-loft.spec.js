/* LOFTET PR. TIDSRUM VED LUGEN  (4. september 2026)

   Der var INTET loft pr. hentetid: fyrre bestillinger kunne lande
   på kl. 12.00, og systemet sagde ja til dem alle sammen.
   bord_loft_pr_kvarter gælder kun bordene og tæller et rullende
   kvarter i REALTID — den siger intet om, hvor mange der har bedt
   om at hente kl. 12.00 i morgen.

   Værnet er databasens (supabase/luge-loft.sql, 14 × BESTOD).
   Prøverne her måler den halvdel, GÆSTEN ser — for et krav, man
   møder som et afslag, er skrevet det forkerte sted.

   ⚠️ TALLENE KOMMER UDEFRA. Loftet står i indstillinger og
   optællingen i rækkerne; koden får dem begge to serveret, så en
   prøve, der bestod på sin egen udregning, findes ikke her. */

const { test, expect } = require('@playwright/test');
const {
  åbnSkal, åbnAdmin, grunddata, gemteData, visFane, aabnFold,
} = require('./hjaelp');

// 2026-08-07 er en FREDAG, uret står 11:00Z = 13:00 dansk tid.
const FREDAG = '2026-08-07T11:00:00Z';
const I_DAG = '2026-08-07';
const I_MORGEN = '2026-08-08';

/* En bestilling ved lugen, som den ligger i databasen. Alt andet
   end de fire felter, reglen læser, er ligegyldigt her. */
function best(n, dato, tid, ekstra) {
  return Object.assign({
    id: n,
    reference: 'SM-P' + n,
    lokation_id: 'mosede',
    navn: 'Gæst ' + n,
    telefon: '2000' + String(1000 + n),
    hent_dato: dato,
    hent_tid: tid,
    status: 'ny',
    slettet: null,
    bord_nummer: null,
    hvordan: 'afhentning',
    antal: 1,
    linjer: [{ navn: 'Fadøl, lille', antal: 1, pris: 35 }],
  }, ekstra || {});
}

function data(loft, raekker, ændringer) {
  const d = grunddata();
  d.indstillinger.bestilbare_kategorier = [1, 6, 9];
  d.indstillinger.bestilling_varsel_timer = 2;
  if (loft !== null) d.indstillinger.luge_loft_pr_tid = loft;
  d.bestillinger = raekker || [];
  Object.assign(d.indstillinger, (ændringer || {}).indstillinger || {});
  return d;
}

/* Med varslet på to timer og uret 13.00 er første tid kl. 15.00,
   og listen går til 20.30. De to, prøverne bruger. */
const FØRSTE = '15:00';
const ANDEN = '15:30';

async function åbnForside(page, d) {
  await åbnSkal(page, '/index.html', { ur: FREDAG, data: d });
}

async function tidTekster(page, vælger) {
  return page.$$eval(vælger + ' option', (o) => o.map((e) => ({
    v: e.value, tekst: e.textContent, laast: e.disabled,
  })));
}

// ============================================================
//  FORSIDEN
// ============================================================
test.describe('Forsiden: tiden siger, at den er fyldt op', () => {
  /* ⚠️ MODSTYKKET FØRST. Uden den her ville alle prøverne herunder
     bestå på en side, der mærker HVER tid som fyldt. */
  test('uden et loft er ingen tid fyldt, uanset hvor mange der er', async ({ page }) => {
    const r = [];
    for (let i = 1; i <= 12; i++) r.push(best(i, I_DAG, FØRSTE));
    await åbnForside(page, data(null, r));

    const tider = await tidTekster(page, '#tid');
    expect(tider.length).toBeGreaterThan(3);
    expect(tider.some((t) => t.laast)).toBe(false);
    expect(tider.some((t) => /fyldt/i.test(t.tekst))).toBe(false);
  });

  test('nul er heller ikke et loft', async ({ page }) => {
    await åbnForside(page, data(0, [best(1, I_DAG, FØRSTE), best(2, I_DAG, FØRSTE)]));
    const tider = await tidTekster(page, '#tid');
    expect(tider.some((t) => t.laast)).toBe(false);
  });

  /* ⚠️ DEN VIGTIGSTE. Er tallet nået, skal gæsten SE det i
     vælgeren — ikke få det som et afslag, efter hun har fyldt
     kurven, skrevet navn og nummer og trykket send. */
  test('er loftet nået, står tiden som fyldt op og kan ikke vælges', async ({ page }) => {
    await åbnForside(page, data(2, [best(1, I_DAG, FØRSTE), best(2, I_DAG, FØRSTE)]));

    const tider = await tidTekster(page, '#tid');
    const den = tider.filter((t) => t.v === FØRSTE)[0];
    expect(den, 'tiden skal stadig STÅ i listen — en tid, der mangler, ligner en fejl')
      .toBeTruthy();
    expect(den.tekst).toMatch(/fyldt op/i);
    expect(den.laast).toBe(true);
  });

  /* ⚠️ OG VALGET MÅ IKKE LANDE PÅ DEN. Ellers fylder gæsten hele
     formularen ud og får først nej ved afsendelsen — dét, tallene
     her findes for. */
  test('den fyldte tid bliver ikke den valgte', async ({ page }) => {
    await åbnForside(page, data(2, [best(1, I_DAG, FØRSTE), best(2, I_DAG, FØRSTE)]));
    await expect(page.locator('#tid')).not.toHaveValue(FØRSTE);
  });

  test('et andet klokkeslæt samme dag er frit', async ({ page }) => {
    await åbnForside(page, data(2, [best(1, I_DAG, FØRSTE), best(2, I_DAG, FØRSTE)]));
    const tider = await tidTekster(page, '#tid');
    const anden = tider.filter((t) => t.v === ANDEN)[0];
    expect(anden.laast).toBe(false);
    expect(anden.tekst).not.toMatch(/fyldt/i);
  });

  /* ⚠️ UDEN DEN HER KUNNE REGLEN TÆLLE HELE DAGEN UNDER ÉT og
     stadig bestå prøven ovenfor. */
  test('den samme tid en anden dag er fri', async ({ page }) => {
    await åbnForside(page, data(2, [best(1, I_DAG, FØRSTE), best(2, I_DAG, FØRSTE)]));
    await page.locator('#dato').selectOption(I_MORGEN);
    const tider = await tidTekster(page, '#tid');
    expect(tider.filter((t) => t.v === FØRSTE)[0].laast).toBe(false);
  });

  /* ⚠️ ET AFSLAG FRIGIVER TIDEN IGEN — samme regel som
     reservationernes pladser. Uden den ville ét fejltryk i admin
     lukke kl. 15.00 for altid. */
  test('en afvist bestilling holder ikke tiden', async ({ page }) => {
    await åbnForside(page, data(2, [
      best(1, I_DAG, FØRSTE, { status: 'afvist' }),
      best(2, I_DAG, FØRSTE),
    ]));
    const tider = await tidTekster(page, '#tid');
    expect(tider.filter((t) => t.v === FØRSTE)[0].laast).toBe(false);
  });

  test('en slettet bestilling holder heller ikke tiden', async ({ page }) => {
    await åbnForside(page, data(2, [
      best(1, I_DAG, FØRSTE, { slettet: '2026-08-07T09:00:00Z' }),
      best(2, I_DAG, FØRSTE),
    ]));
    const tider = await tidTekster(page, '#tid');
    expect(tider.filter((t) => t.v === FØRSTE)[0].laast).toBe(false);
  });

  /* ⚠️ OG BORDENE TÆLLER IKKE MED. Et bord vælger ingen hentetid —
     den er klokken NU — så en QR-bestilling må ikke fylde et
     tidsrum ved lugen op. */
  test('bordenes bestillinger fylder ikke lugens tidsrum', async ({ page }) => {
    await åbnForside(page, data(2, [
      best(1, I_DAG, FØRSTE, { bord_nummer: '7', hvordan: 'spis_her' }),
      best(2, I_DAG, FØRSTE, { bord_nummer: '9', hvordan: 'spis_her' }),
      best(3, I_DAG, FØRSTE, { bord_nummer: '3', hvordan: 'spis_her' }),
    ]));
    const tider = await tidTekster(page, '#tid');
    expect(tider.filter((t) => t.v === FØRSTE)[0].laast).toBe(false);
  });
});

// ============================================================
//  HELE DAGEN FYLDT
// ============================================================
test.describe('En dag, hvor alt er taget', () => {
  /* Fylder hver eneste tid på dagen op. Tiderne læses af siden
     selv, så prøven ikke skriver åbningstiderne af i hånden. */
  async function fyldHeleDagen(page, loft) {
    await åbnForside(page, data(loft, []));
    const alle = await page.$$eval('#tid option', (o) => o.map((e) => e.value));
    const r = [];
    let n = 0;
    alle.forEach(function (t) {
      for (let i = 0; i < loft; i++) r.push(best(++n, I_DAG, t));
    });
    return r;
  }

  test('dagen står som fyldt op i dagvælgeren — og bliver stående', async ({ page }) => {
    const r = await fyldHeleDagen(page, 1);
    await åbnForside(page, data(1, r));

    const dage = await page.$$eval('#dato option', (o) => o.map((e) => ({
      v: e.value, tekst: e.textContent, laast: e.disabled,
    })));
    const iDag = dage.filter((x) => x.v === I_DAG)[0];
    expect(iDag, 'dagen skal stadig STÅ — en dag, der mangler, ligner en fejl')
      .toBeTruthy();
    expect(iDag.tekst).toMatch(/fyldt op/i);
    expect(iDag.laast).toBe(true);
    // … og valget er flyttet væk fra den
    await expect(page.locator('#dato')).not.toHaveValue(I_DAG);
  });

  test('en dag, hvor kun én tid er taget, er ikke fyldt', async ({ page }) => {
    await åbnForside(page, data(1, [best(1, I_DAG, FØRSTE)]));
    const dage = await page.$$eval('#dato option', (o) => o.map((e) => ({
      v: e.value, laast: e.disabled,
    })));
    expect(dage.filter((x) => x.v === I_DAG)[0].laast).toBe(false);
  });
});

// ============================================================
//  ØVETILSTANDEN SKAL FEJLE SOM SKYEN
// ============================================================
test.describe('Afsendelsen afvises som i databasen', () => {
  /* ⚠️ EN EFTERLIGNING, DER TAGER IMOD MERE END PRODUKTIONEN,
     BEVISER INGENTING. Det er sket fire gange i det her projekt,
     så øvetilstanden har værnet med — og det måles her. */
  test('en fyldt tid kan ikke sendes, og beskeden siger klokkeslættet',
    async ({ page }) => {
      await åbnForside(page, data(1, [best(1, I_DAG, ANDEN)]));

      await page.locator('[data-kategori="Øl"]').click();
      await page.locator('[data-vare="Fadøl, lille"] button[data-d="+"]').click();
      await page.locator('#navn').fill('Sara Poulsen');
      await page.locator('#tlf').fill('28871343');
      /* Vælgeren har låst tiden — men en fane, der har stået åben,
         kender ikke de tider, der er blevet fyldt imens. Vi sætter
         den derfor med kode, som browseren ville have haft den. */
      await page.locator('#tid').evaluate((el, v) => {
        el.value = v;
      }, ANDEN);
      await page.locator('button.g.solid.blk').click();

      // Ingen kvittering
      await expect(page.locator('#bestil .panel h3')).not.toContainText('Tak,');
      const gemt = await gemteData(page);
      expect(gemt.bestillinger).toHaveLength(1);
      /* ⚠️ FEJLEN STÅR I SUMLINJEN. Designet har ikke tegnet et
         fejlfelt, og et opfundet ét ville være en ændring af
         skallen — så beskeden står, hvor summen står (se brøl()
         i js/skal/bestil.js). */
      await expect(page.locator('#sumline')).toContainText('15.30');
    });

  /* ⚠️ OG GRUNDEN SKAL NÅ FREM I DET HELE TAGET. Her stod ÉN
     sætning for alle fejl — "Bestillingen kunne ikke sendes" — så
     en gæst, hvis rejemad lige var blevet udsolgt, havde ingen
     måde at komme videre på. bestil/ har vist beskeden siden
     foråret; forsiden smed den væk. */
  test('den generiske linje er ikke svaret længere', async ({ page }) => {
    await åbnForside(page, data(1, [best(1, I_DAG, ANDEN)]));
    await page.locator('[data-kategori="Øl"]').click();
    await page.locator('[data-vare="Fadøl, lille"] button[data-d="+"]').click();
    await page.locator('#navn').fill('Sara Poulsen');
    await page.locator('#tlf').fill('28871343');
    await page.locator('#tid').evaluate((el, v) => { el.value = v; }, ANDEN);
    await page.locator('button.g.solid.blk').click();

    const linje = await page.locator('#sumline').innerText();
    expect(linje).not.toMatch(/Bestillingen kunne ikke sendes\. Prøv igen/);
  });
});

// ============================================================
//  bestil/ BRUGER DEN SAMME REGEL
// ============================================================
test.describe('Smørrebrødets side siger det samme', () => {
  /* ⚠️ TO FORMULARER, ÉN REGEL. Skrev de hver sin, ville forsiden
     og bestil/ sige hver sit om det samme klokkeslæt — og begge
     ville se rigtige ud for sig selv. */
  test('er loftet nået, står tiden som fyldt op på bestil/ også', async ({ page }) => {
    await åbnSkal(page, '/bestil/', {
      ur: FREDAG, data: data(2, [best(1, I_DAG, FØRSTE), best(2, I_DAG, FØRSTE)]),
    });
    await expect(page.locator('#bestil-tid option').first()).toBeAttached();
    const tider = await tidTekster(page, '#bestil-tid');
    const den = tider.filter((t) => t.v === FØRSTE)[0];
    expect(den).toBeTruthy();
    expect(den.tekst).toMatch(/fyldt op/i);
    expect(den.laast).toBe(true);
  });
});

// ============================================================
//  ADMIN
// ============================================================
test.describe('Ejeren sætter tallet', () => {
  test('tallet gemmes og slår igennem på hjemmesiden', async ({ page }) => {
    await åbnAdmin(page, { ur: FREDAG, data: data(null, [best(1, I_DAG, FØRSTE)]) });
    await visFane(page, 'p-bestillinger');
    await aabnFold(page, 'bestil-regler-fold');
    await page.locator('#bestil-luge-loft').fill('1');
    await page.locator('#gem-bestil-regler').click();
    await expect(page.locator('#kvittering')).toBeVisible();

    const gemt = await gemteData(page);
    expect(Number(gemt.indstillinger.luge_loft_pr_tid)).toBe(1);
  });

  /* ⚠️ TOMT ER IKKE NUL, OG DET ER IKKE DET SAMME SPØRGSMÅL.
     Nul og tom betyder begge "ingen grænse" i værnet — men kun
     den tomme siger, at ejeren ikke har taget stilling. Skrev
     feltet 0, når nøglen mangler, ville et gem påstå en
     beslutning, han aldrig traf. */
  test('et tomt felt gemmes som tomt og lukker ikke for noget', async ({ page }) => {
    await åbnAdmin(page, { ur: FREDAG, data: data(null, []) });
    await visFane(page, 'p-bestillinger');
    await aabnFold(page, 'bestil-regler-fold');
    await expect(page.locator('#bestil-luge-loft')).toHaveValue('');
    await page.locator('#gem-bestil-regler').click();
    await expect(page.locator('#kvittering')).toBeVisible();

    const gemt = await gemteData(page);
    expect(String(gemt.indstillinger.luge_loft_pr_tid || '')).toBe('');
  });

  /* ⚠️ NOTEN SIGER DET KUN, NÅR DER ER NOGET AT SIGE. Et "ingen
     grænse" på hvert eneste korthoved er støj — og så læses noten
     heller ikke den dag, den siger noget. */
  test('korthovedet siger tallet, når det er sat', async ({ page }) => {
    await åbnAdmin(page, { ur: FREDAG, data: data(8, []) });
    await visFane(page, 'p-bestillinger');
    await aabnFold(page, 'bestil-regler-fold');
    await expect(page.locator('#bestil-regler-note')).toContainText('8 pr. tidsrum');
  });

  test('og siger ingenting om det, når det ikke er sat', async ({ page }) => {
    await åbnAdmin(page, { ur: FREDAG, data: data(null, []) });
    await visFane(page, 'p-bestillinger');
    await aabnFold(page, 'bestil-regler-fold');
    await expect(page.locator('#bestil-regler-note')).not.toContainText('tidsrum');
  });
});
