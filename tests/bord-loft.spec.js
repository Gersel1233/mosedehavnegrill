/* UDSOLGT-VÆRNET, LOFTET OG VENTETIDEN

   Tillægget til bordbestillings-briefen, punkt 2, 3, 5 og 7.

   ⚠️ TILLÆGGET ER SKREVET UD FRA, AT GÆSTEN BETALER I APPEN.
   Det gør hun ikke — ejeren har besluttet, at der betales ved
   kassen som altid, og personalet taster tingene ind dér. Det
   fjerner refusionerne og hele spørgsmålet om salgsregistrering.

   Det fjerner IKKE de to problemer herunder. Tværtimod: uden en
   betaling koster en forkert bestilling ingenting for den, der
   sender den — så den er lettere at lave, ikke sværere.

   1) UDSOLGT ER EN BESLUTNING, DER SKAL LIGGE I DATABASEN.
      Gæsten, der åbnede kortet for fem minutter siden, har varen
      på skærmen endnu. Browseren må gerne skjule den for at være
      pæn. Den må bare ikke være den eneste, der ved det.

   2) KØKKENET SKAL KUNNE SIGE "IKKE LIGE NU". Der var kun åben
      eller lukket, og der er langt imellem dem: femten ordrer på
      fem minutter, og eneste udvej var at lukke HELT — også for
      de borde, der ikke havde bestilt endnu.

   Adgangsreglerne og værnene i databasen prøves for sig i
   supabase/proev-bord-loft.sql (15 prøver). Prøverne her måler
   den halvdel, en browser kan se: at øvetilstanden opfører sig
   som databasen, og at skærmene siger det rigtige.
*/

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

const UR = '2026-08-06T11:00:00Z';        // torsdag kl. 13.00 dansk
const I_DAG = '2026-08-06';

const BORDE = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 },
];

function forSiden(minutter) {
  return new Date(Date.parse(UR) - minutter * 60000).toISOString();
}

/* En bordordre, som den ser ud i databasen. Bruges til at fylde
   kvarteret op, når loftet skal prøves. */
function bordordre(n, ekstra) {
  return Object.assign({
    id: n, lokation_id: 'mosede', reference: 'SM260806-Q' + n,
    navn: 'Bord 7', telefon: '0000000' + n, hent_dato: I_DAG, hent_tid: '13:0' + n,
    linjer: [{ navn: 'Fadøl, lille', antal: 1, pris: 35 }],
    fyld: [], antal: 1, status: 'ny', intern_note: null, besked: null,
    hvordan: 'spis_her', bord_nummer: '7', slettet: null,
    oprettet: forSiden(2),
  }, ekstra);
}

async function åbnBord(page, valg = {}) {
  await åbn(page, '/ved-bordet/?bord=7', {
    ur: UR,
    data: grunddata(Object.assign({ borde: BORDE }, valg)),
  });
}

async function bestil(page, navn) {
  const linje = navn
    ? page.locator('#bestil-stykker .stk-linje', { hasText: navn })
    : page.locator('#bestil-stykker .stk-linje').first();
  await linje.locator('button', { hasText: '+' }).click();
  await page.fill('#bestil-navn', 'Sara Holm');
  await page.fill('#bestil-telefon', '20304050');
  await page.locator('#bestil-send').click();
  await page.locator('#kig-send').click();
}

// ============================================================
//  UDSOLGT
// ============================================================
test.describe('Udsolgt afgøres ikke af browseren alene', () => {

  /* Den, browseren KAN klare: varen er væk fra listen, når siden
     hentes. Falder den, er der ikke engang et pænt lag. */
  test('en udsolgt vare står ikke på listen ved bordet', async ({ page }) => {
    await åbnBord(page, {
      menu_varer: grunddata().menu_varer.map((v) =>
        (v.navn === 'Flæskestegssandwich' ? { ...v, udsolgt: true } : v)),
    });
    await expect(page.locator('#bestil-stykker .stk-linje',
      { hasText: 'Flæskestegssandwich' })).toHaveCount(0);
  });

  /* DEN VIGTIGE. Gæsten har kortet åbent fra før, varen bliver
     meldt udsolgt, og hun trykker send. Uden et værn lander
     bestillingen, og køkkenet får en ordre på noget, de ikke har
     — hun sidder tyve meter væk og venter på mad, ingen laver. */
  test('en vare, der bliver udsolgt undervejs, afvises ved send', async ({ page }) => {
    await åbnBord(page);
    const linje = page.locator('#bestil-stykker .stk-linje',
      { hasText: 'Flæskestegssandwich' });
    await linje.locator('button', { hasText: '+' }).click();

    // Personalet melder den udsolgt, mens gæsten sidder med siden åben.
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('mosede_data_v1'));
      d.menu_varer = d.menu_varer.map((v) =>
        (v.navn === 'Flæskestegssandwich' ? { ...v, udsolgt: true } : v));
      localStorage.setItem('mosede_data_v1', JSON.stringify(d));
    });

    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304050');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();

    await expect(page.locator('#kig-fejl')).toContainText('udsolgt');
    // Og navnet skal med: ellers skal hun gætte, hvad af otte ting
    // hun skal tage af.
    await expect(page.locator('#kig-fejl')).toContainText('Flæskestegssandwich');
    await expect(page.locator('#bestil-tak')).toBeHidden();

    const d = await gemteData(page);
    expect(d.bestillinger || [], 'bestillingen på en udsolgt vare landede alligevel')
      .toHaveLength(0);
  });

  /* ⚠️ ET NAVN, DER IKKE STÅR PÅ KORTET, RØRES IKKE. Dagens ret
     bor i sin egen tabel og har sin egen nedtælling. Afviste
     værnet alt, det ikke kunne finde, ville en ret, ejeren skrev
     i hånden i morges, blive umulig at bestille. */
  test('dagens ret kan stadig bestilles, selv om den ikke står i menu_varer', async ({ page }) => {
    await åbnBord(page, {
      indstillinger: {
        ...grunddata().indstillinger,
        dagens_ret: { navn: 'Stegt flæsk med persillesovs', pris: 95, dato: I_DAG },
      },
    });
    await bestil(page, 'Stegt flæsk');
    await expect(page.locator('#bestil-tak')).toBeVisible();
    expect((await gemteData(page)).bestillinger).toHaveLength(1);
  });
});

// ============================================================
//  LOFTET
// ============================================================
test.describe('Køkkenet kan sige "ikke lige nu"', () => {

  /* Ikke sat betyder INTET loft. En indstilling, ingen har rørt,
     må ikke kunne lukke for noget, der virkede i går. */
  test('uden et loft er der ingen grænse', async ({ page }) => {
    await åbnBord(page, {
      bestillinger: [1, 2, 3, 4, 5].map((n) => bordordre(n)),
    });
    await bestil(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();
  });

  test('et fyldt kvarter siger nej — med en grund og en vej videre', async ({ page }) => {
    await åbnBord(page, {
      bestillinger: [1, 2].map((n) => bordordre(n)),
      indstillinger: { ...grunddata().indstillinger, bord_loft_pr_kvarter: 2 },
    });
    await bestil(page);

    const fejl = page.locator('#kig-fejl');
    await expect(fejl).toContainText('run på');
    // Det er noget ANDET end lukket, og der skal stå hvad man gør.
    await expect(fejl).toContainText('lugen');
    await expect(page.locator('#bestil-tak')).toBeHidden();
  });

  /* Ordrer, der er FALDET UD af kvarteret, tæller ikke med.
     Ellers ville loftet være et loft pr. dag, og bordene ville
     være lukket fra frokost til lukketid. */
  test('en ordre fra for en time siden fylder ikke i kvarteret', async ({ page }) => {
    await åbnBord(page, {
      bestillinger: [1, 2].map((n) => bordordre(n, { oprettet: forSiden(60) })),
      indstillinger: { ...grunddata().indstillinger, bord_loft_pr_kvarter: 2 },
    });
    await bestil(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();
  });

  /* ⚠️ LOFTET GÆLDER KUN BORDENE. Smørrebrød ud af huset
     bestilles dagen før og lægger ikke pres på lugen nu. Lukkede
     loftet for dem også, ville en travl frokost ved bordene lukke
     for morgendagens smørrebrød — og det ville ingen forstå. */
  test('loftet rører ikke mad ud af huset', async ({ page }) => {
    await åbn(page, '/bestil/', {
      ur: UR,
      data: grunddata({
        borde: BORDE,
        bestillinger: [1, 2, 3].map((n) => bordordre(n)),
        indstillinger: { ...grunddata().indstillinger, bord_loft_pr_kvarter: 2 },
      }),
    });
    await expect(page.locator('#bestil-form')).toBeVisible();
    await expect(page.locator('#bestil-lukket')).toBeHidden();
  });

  /* Et loft på nul er "slået fra", ikke "ingen ordrer
     overhovedet". Skrev nogen 0 i feltet for at slukke det, må
     det ikke lukke bordene i stilhed. */
  test('et loft på nul er intet loft', async ({ page }) => {
    await åbnBord(page, {
      bestillinger: [1, 2, 3].map((n) => bordordre(n)),
      indstillinger: { ...grunddata().indstillinger, bord_loft_pr_kvarter: 0 },
    });
    await bestil(page);
    await expect(page.locator('#bestil-tak')).toBeVisible();
  });
});

// ============================================================
//  VENTETIDEN
// ============================================================
test.describe('Ventetiden er personalets tal, ikke vores', () => {

  test('uden en grundtid står der ingen ventetid', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('#bord-travlhed')).toBeHidden();
  });

  test('grundtiden fra admin står på siden', async ({ page }) => {
    await åbnBord(page, {
      indstillinger: { ...grunddata().indstillinger, bord_ventetid_min: 15 },
    });
    await expect(page.locator('#bord-travlhed')).toContainText('15 min');
  });

  /* ⚠️ TALLET PR. ORDRE ER EJERENS. Fandt siden selv på "tre
     minutter pr. ordre", ville den love noget på køkkenets vegne,
     som ingen havde sagt. Uden tallet står grundtiden alene —
     også når der er kø. */
  test('uden ejerens tal vokser ventetiden ikke med køen', async ({ page }) => {
    await åbnBord(page, {
      bestillinger: [1, 2, 3, 4].map((n) => bordordre(n)),
      indstillinger: { ...grunddata().indstillinger, bord_ventetid_min: 15 },
    });
    await expect(page.locator('#bord-travlhed')).toContainText('15 min');
  });

  test('med ejerens tal vokser den med køen', async ({ page }) => {
    await åbnBord(page, {
      bestillinger: [1, 2, 3, 4].map((n) => bordordre(n)),
      indstillinger: {
        ...grunddata().indstillinger,
        bord_ventetid_min: 15,
        bord_ventetid_pr_ordre_min: 3,
      },
    });
    // 15 + 4 × 3 = 27, rundet til nærmeste fem: 25. "Ca. 27" lyder
    // som et løfte, der er regnet ud; "ca. 25" lyder som et skøn.
    await expect(page.locator('#bord-travlhed')).toContainText('25 min');
  });

  /* Det færdige er ikke kø. Er alt serveret, skal ventetiden være
     grundtiden igen — ellers vokser den hele dagen. */
  test('serverede ordrer tæller ikke som kø', async ({ page }) => {
    await åbnBord(page, {
      bestillinger: [1, 2, 3, 4].map((n) => bordordre(n, { status: 'serveret' })),
      indstillinger: {
        ...grunddata().indstillinger,
        bord_ventetid_min: 15,
        bord_ventetid_pr_ordre_min: 3,
      },
    });
    await expect(page.locator('#bord-travlhed')).toContainText('15 min');
  });
});

// ============================================================
//  ADMIN
// ============================================================
test.describe('Loftet og ventetiden sættes i admin', () => {

  async function åbnKoekkenet(page, data) {
    await åbnAdmin(page, { ur: UR, data: grunddata(data || { borde: BORDE }) });
    await page.locator('[data-panel="p-koekken"]').click();
    await page.waitForSelector('#p-koekken:not(.skjult)');
  }

  test('felterne står tomme, når ingen har rørt dem', async ({ page }) => {
    await åbnKoekkenet(page);
    await expect(page.locator('#bord-loft')).toHaveValue('');
    await expect(page.locator('#bord-pr-ordre')).toHaveValue('');
  });

  test('loftet gemmer sig selv', async ({ page }) => {
    await åbnKoekkenet(page);
    await page.locator('#bord-loft').fill('8');
    await page.locator('#bord-loft').blur();
    await expect(page.locator('#p-koekken .gemt-maerke')).toContainText('Gemt');
    expect((await gemteData(page)).indstillinger.bord_loft_pr_kvarter).toBe(8);
  });

  /* Tomt OG nul betyder begge "intet loft". Skrev nogen 0 for at
     slå det fra, må det ikke blive til "ingen ordrer overhovedet". */
  test('et nul gemmes som intet loft, ikke som nul ordrer', async ({ page }) => {
    await åbnKoekkenet(page);
    await page.locator('#bord-loft').fill('0');
    await page.locator('#bord-loft').blur();
    await expect(page.locator('#p-koekken .gemt-maerke')).toContainText('Gemt');
    expect((await gemteData(page)).indstillinger.bord_loft_pr_kvarter).toBe(null);
  });

  test('et umuligt loft bliver afvist', async ({ page }) => {
    await åbnKoekkenet(page);
    await page.locator('#bord-loft').fill('500');
    await page.locator('#bord-loft').blur();
    await expect(page.locator('#p-koekken .gemt-maerke')).toContainText('0–99');
  });

  /* ⚠️ ÉT autogem PÅ HELE KORTET. To kald på den samme rod ville
     betyde, at et tryk i det ene felt også skrev det andet — og
     at ventetiden blev tørret af, når loftet blev gemt. */
  test('ventetid og loft gemmes sammen uden at tørre hinanden af', async ({ page }) => {
    await åbnKoekkenet(page);
    await page.locator('#bord-ventetid').fill('20');
    await page.locator('#bord-ventetid').blur();
    await page.locator('#bord-loft').fill('8');
    await page.locator('#bord-loft').blur();

    const d = await gemteData(page);
    expect(d.indstillinger.bord_ventetid_min, 'ventetiden blev tørret af').toBe(20);
    expect(d.indstillinger.bord_loft_pr_kvarter).toBe(8);
  });

  /* LYDEN SKAL SLÅS TIL MED EN FINGER. Browsere blokerer lyd,
     indtil nogen har rørt skærmen — en iPad, der har stået urørt
     i to timer, siger INGENTING, når den første ordre kommer. */
  test('lyden har en knap, og knappen siger, om den er slået til', async ({ page }) => {
    await åbnKoekkenet(page);
    const knap = page.locator('#koekken-lyd');
    await expect(knap).toContainText('Slå lyd til');
    await expect(page.locator('#koekken-lyd-note')).toContainText('slået fra');

    await knap.click();
    await expect(knap).toContainText('slået til');
    await expect(page.locator('#koekken-lyd-note')).toContainText('virker');
  });

  /* ⚠️ OG LYDEN ER ALDRIG ALENE. Der er larm i et køkken, og
     lyden kan være slået fra. Markeringen bliver stående, til
     kortet trykkes videre — et blink på to sekunder, ingen så,
     er ingen markering. */
  test('en ny ordre markerer sig synligt i køen', async ({ page }) => {
    await åbnKoekkenet(page);
    await expect(page.locator('.koek-kort')).toHaveCount(0);

    // En ordre lander, mens skærmen står tændt.
    await page.evaluate((ny) => {
      const d = JSON.parse(localStorage.getItem('mosede_data_v1'));
      d.bestillinger = [ny];
      localStorage.setItem('mosede_data_v1', JSON.stringify(d));
    }, bordordre(1));
    await page.evaluate(() => Admin.friskOp());

    const kort = page.locator('.koek-kort').first();
    await expect(kort).toBeVisible();
    await expect(kort, 'den nye ordre markerer sig ikke på skærmen')
      .toHaveClass(/linje-ny/);
    await expect(kort).toContainText('Bord 7');
  });

  /* Køen ved login er ikke "nyt". Ellers ville tredive kort lyse
     op og plinge tredive gange, hver gang nogen loggede ind. */
  test('køen ved login er ikke markeret som ny', async ({ page }) => {
    await åbnKoekkenet(page, { borde: BORDE, bestillinger: [bordordre(1)] });
    const kort = page.locator('.koek-kort').first();
    await expect(kort).toBeVisible();
    await expect(kort).not.toHaveClass(/linje-ny/);
  });
});

// ============================================================
//  DE TRYKTE KORT
// ============================================================
test.describe('Menukortet siger, hvad en prisændring koster', () => {

  /* De trykte kort ved lugen er trykt. Ændrer nogen en pris i
     admin, er kortet ved lugen forkert, til det bliver trykt om —
     og den, der opdager det, er en gæst, der har regnet med det
     gamle tal. */
  test('prisfeltet minder om kortet ved lugen', async ({ page }) => {
    await åbnAdmin(page, { ur: UR });
    await page.locator('[data-panel="p-menu"]').click();
    const tekst = (await page.locator('#p-menu').innerText()).toLowerCase();
    expect(tekst, 'der står ikke noget om de trykte kort ved lugen')
      .toContain('kortet ved lugen');
  });

  test('og at Udsolgt også fanger dem, der har siden åben', async ({ page }) => {
    await åbnAdmin(page, { ur: UR });
    await page.locator('[data-panel="p-menu"]').click();
    const tekst = (await page.locator('#p-menu').innerText()).toLowerCase();
    expect(tekst).toContain('havde kortet åbent');
  });
});
