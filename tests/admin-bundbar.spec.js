/* BUNDBJÆLKEN PÅ TELEFONEN  (30/8)

   Kundens ord: "admin-appen skal også fixes på telefonen — jeg
   kan ikke vælge imellem fanerne, fordi de forsvinder ned i
   telefonens bar."

   To fejl på én gang, og den værste var ikke den, han så:

   1) Fanerne lå i en stribe, der rullede SIDELÆNS. Målt på en
      iPhone 13: fjorten piller fylder over 1800 px på en skærm
      på 390, så tretten stod uden for kanten — og der var intet,
      der sagde, at der VAR mere.
   2) Striben lå i bunden, hvor browserens egen bjælke lægger sig
      hen over den.

   ⚠️ MÅLINGERNE HER SKAL HAVE ET TAL UDEFRA. "Ruller striben
   sidelæns?" kan ikke afgøres ved at sammenligne to tal, der
   begge kommer fra det, den måler — det er præcis den fejl,
   CLAUDE.md advarer om. Bredden på 390 kommer fra profilen i
   playwright.config.js, ikke fra elementet.
*/

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, visFane } = require('./hjaelp');

const I_DAG = new Date().toISOString().slice(0, 10);

function best(id, navn, tid) {
  return { id, lokation_id: 'mosede', reference: 'SM' + id, navn,
    telefon: '2030405' + id, hent_dato: I_DAG, hent_tid: tid,
    linjer: [{ navn: 'Fiskefilet', antal: 1, pris: 75 }], fyld: [], antal: 1,
    status: 'ny', hvordan: 'afhentning', bord_nummer: null, slettet: null,
    intern_note: null, besked: null, oprettet: new Date().toISOString() };
}

const FORESP = {
  id: 1, lokation_id: 'mosede', reference: 'FO1', slags: 'selskab',
  navn: 'Anna Vind', telefon: '20304052', email: null, dato: null,
  antal_personer: 30, besked: 'Sølvbryllup', detaljer: {}, status: 'ny',
  intern_note: null, slettet: null, oprettet: new Date().toISOString(),
};

async function fanen(page, ekstra) {
  await åbnAdmin(page, { data: grunddata(ekstra || {}) });
}

test.describe('Bundbjælken på telefonen', () => {

  test.skip(({ isMobile }) => !isMobile,
    'bjælken findes kun under 900 px — søjlen er der på computer');

  /* ⚠️ DEN FEJL, KUNDEN SÅ. Fjorten piller på 390 px kan ikke
     stå ved siden af hinanden, og en stribe, der ruller sidelæns,
     skjuler det, man leder efter. */
  test('der er fem faste pladser og intet at rulle efter', async ({ page }) => {
    await fanen(page);
    const bar = page.locator('#bundbar');
    await expect(bar).toBeVisible();
    await expect(bar.locator('button')).toHaveCount(5);

    /* ⚠️ TALLET KOMMER UDEFRA. 390 er profilens bredde i
       playwright.config.js — ikke noget, elementet selv fortæller.
       Sammenlignede vi scrollWidth med clientWidth alene, ville
       målingen bestå, også hvis bjælken var 1800 px bred. */
    const bredde = await bar.evaluate((e) => e.getBoundingClientRect().width);
    expect(bredde).toBeLessThanOrEqual(390);

    const slots = await bar.locator('button').evaluateAll(
      (ks) => ks.map((k) => Math.round(k.getBoundingClientRect().width)));
    // Fem lige store pladser: ingen af dem må være dobbelt så bred.
    expect(Math.max(...slots) - Math.min(...slots)).toBeLessThanOrEqual(2);

    // Og summen må ikke stikke uden for skærmen.
    expect(slots.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(390);
  });

  /* ⚠️ DEN ANDEN HALVDEL AF KUNDENS FEJL: bjælken lå, hvor
     telefonens egen bar lægger sig. Den skal slutte PÅ
     skærmkanten og ikke under den. */
  test('bjælken slutter på skærmens nederste kant', async ({ page }) => {
    await fanen(page);
    const m = await page.evaluate(() => {
      const r = document.getElementById('bundbar').getBoundingClientRect();
      return { bund: Math.round(r.bottom), top: Math.round(r.top),
        vindue: window.innerHeight };
    });
    expect(m.bund).toBe(m.vindue);
    // Og den skal være høj nok til en finger plus den sikre zone.
    expect(m.vindue - m.top).toBeGreaterThanOrEqual(60);
  });

  /* Det sidste kort må ikke ligge under bjælken — ellers kan man
     ikke trykke "Afhentet" på dagens sidste bestilling. */
  test('indholdet har plads under sig til bjælken', async ({ page }) => {
    await fanen(page);
    const pad = await page.evaluate(() => parseInt(
      getComputedStyle(document.querySelector('.admin-indhold')).paddingBottom, 10));
    const barH = await page.evaluate(() =>
      Math.round(document.getElementById('bundbar').getBoundingClientRect().height));
    expect(pad).toBeGreaterThanOrEqual(barH);
  });

  test('den valgte fane er markeret i bjælken', async ({ page }) => {
    await fanen(page);
    const overblik = page.locator('#bundbar button[data-gaa="p-overblik"]');
    await expect(overblik).toHaveAttribute('aria-current', 'page');

    await page.locator('#bundbar button[data-gaa="p-borde"]').click();
    await expect(page.locator('#p-borde')).toBeVisible();
    await expect(page.locator('#bundbar button[data-gaa="p-borde"]'))
      .toHaveAttribute('aria-current', 'page');
    await expect(overblik).toHaveAttribute('aria-current', 'false');
  });

  /* ⚠️ EN FANE, DER IKKE ER I BJÆLKEN, SKAL MARKERE "MERE".
     Ellers står man på Menukort, mens bjælken siger Overblik —
     og så ved man ikke, hvor man er. */
  test('en fane bag Mere markerer Mere', async ({ page }) => {
    await fanen(page);
    await visFane(page, 'p-menu');
    await expect(page.locator('#bb-mere')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#bundbar button[data-gaa="p-overblik"]'))
      .toHaveAttribute('aria-current', 'false');
  });

  test('Mere åbner arket med alle fanerne, og et valg lukker det', async ({ page }) => {
    await fanen(page);
    const ark = page.locator('#fane-ark');
    await expect(ark).not.toHaveClass(/aabent/);

    await page.locator('#bb-mere').click();
    await expect(ark).toHaveClass(/aabent/);
    await expect(page.locator('#bb-mere')).toHaveAttribute('aria-expanded', 'true');
    // Alle fjorten faner står i arket — ikke en udvalgt kopi.
    const antal = await page.locator('.fane-ark .faner button[data-panel]').count();
    expect(antal).toBeGreaterThanOrEqual(14);

    await page.locator('.fane-ark .faner button[data-panel="p-salg"]').click();
    await expect(page.locator('#p-salg')).toBeVisible();
    await expect(ark).not.toHaveClass(/aabent/);
  });

  test('Escape og Luk lukker arket', async ({ page }) => {
    await fanen(page);
    const ark = page.locator('#fane-ark');
    await page.locator('#bb-mere').click();
    await page.keyboard.press('Escape');
    await expect(ark).not.toHaveClass(/aabent/);

    await page.locator('#bb-mere').click();
    await page.locator('#fane-ark-luk').click();
    await expect(ark).not.toHaveClass(/aabent/);
  });

  // ==========================================================
  //  TALLENE
  // ==========================================================
  /* ⚠️ TALLENE ER SPEJLE, IKKE KOPIER. De læses af fanens eget
     mærke. Regnede bjælken selv efter, ville de to langsomt komme
     til at sige hver sit — og ingen ville vide hvilket der var
     rigtigt. */
  test('bjælken viser fanens eget tal', async ({ page }) => {
    await fanen(page, { bestillinger: [best(1, 'Sara', '13:00'), best(2, 'Bo', '14:00')] });
    const maerke = page.locator('#bundbar button[data-gaa="p-bestillinger"] .bb-tal');
    await expect(maerke).toHaveText('2');

    const fanens = await page.locator('.faner button[data-panel="p-bestillinger"] .badge')
      .innerText();
    expect(fanens.replace(/\D+/g, ''), 'bjælken og fanen siger ikke det samme').toBe('2');
  });

  /* ⚠️ DEN VIGTIGSTE, OG DEN ENE TING FORLÆGGET IKKE GØR.
     Ligger der en forespørgsel og venter, står den bag "…". Uden
     et tal på døren er den usynlig, til nogen tilfældigvis kigger
     ind — og en forespørgsel, ingen har svaret på, er den, der
     koster mest. */
  test('Mere bærer tallet for det, der ligger bag den', async ({ page }) => {
    await fanen(page, { forespoergsler: [FORESP] });
    await expect(page.locator('#bb-mere .bb-tal')).toHaveText('1');
  });

  test('uden noget at vente på er der ingen tal', async ({ page }) => {
    await fanen(page);
    await expect(page.locator('#bundbar .bb-tal')).toHaveCount(0);
  });

  /* En fane, der ER i bjælken, må ikke tælle med i Mere — så
     ville de to tal tilsammen være større end antallet af sager,
     og man holder op med at stole på dem. */
  test('en fane i bjælken tæller ikke også med i Mere', async ({ page }) => {
    await fanen(page, { bestillinger: [best(1, 'Sara', '13:00')] });
    await expect(page.locator('#bundbar button[data-gaa="p-bestillinger"] .bb-tal'))
      .toHaveText('1');
    await expect(page.locator('#bb-mere .bb-tal')).toHaveCount(0);
  });
});

/* ⚠️ PÅ COMPUTER MÅ BJÆLKEN IKKE FINDES. To veje til det samme
   er to steder at holde styr på, hvor man er — og søjlen er der
   fra 900 px og op. */
test.describe('Computeren har søjlen', () => {
  test.skip(({ isMobile }) => !!isMobile,
    'søjlen måles kun på computerprofilen');

  test('bundbjælken er væk, og fanelisten er søjlens', async ({ page }) => {
    await åbnAdmin(page);
    await expect(page.locator('#bundbar')).toBeHidden();
    await expect(page.locator('.adm-side .faner')).toBeVisible();

    /* Arket er ikke et ark her — listen står i søjlen, og
       hovedet med "Gå til / Luk" hører ikke til der. */
    await expect(page.locator('.fane-ark-hoved')).toBeHidden();
  });
});
