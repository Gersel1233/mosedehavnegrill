/* Smørrebrødssidens kobling.

   Samme motor som forsiden — det er den samme bestilling, der
   bliver sendt — men to ting er anderledes med vilje: udvalget er
   KUN smørrebrød, og spørgsmålet er "hentes eller leveres" i
   stedet for "spis her eller tag med". Smørrebrød er pr.
   definition ud af huset. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';

function data() {
  const d = grunddata();
  d.indstillinger.bestilling_varsel_timer = 2;
  return d;
}

async function åbn(page, d) {
  await åbnSkal(page, '/h-smorrebrod.html', { ur: FREDAG, data: d || data() });
}

test.describe('Smørrebrødssidens kobling', () => {
  test('stykkerne kommer fra kortet, og den døde tilbehørsrække er væk', async ({ page }) => {
    await åbn(page);

    await expect(page.locator('[data-vare="Flæskestegssandwich"]')).toHaveCount(1);
    // Designets fire opdigtede rækker
    await expect(page.locator('[data-liste]')).not.toContainText('Luksus-smørrebrød');
    /* "Tilbehør: øl, snaps og vand" havde intet bag sig: siden
       sælger kun smørrebrød, så rækken kunne ikke bestilles. */
    await expect(page.locator('[data-liste]')).not.toContainText('Tilbehør');
  });

  test('varslet står i teksten, ikke et fast tal', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_varsel_timer = 48;
    await åbn(page, d);

    // Designet skrev "inden for 2 dage" fast; tallet sættes i admin
    // Hinten hører til datofeltet, ikke manchetten under overskriften
    await expect(page.locator('#bestil .field:has(#sdato) + .hint'))
      .toContainText('mindst 2 dage');
  });

  test('levering tilbydes ikke, før forretningen har sagt ja', async ({ page }) => {
    /* Vi ved hverken hvad de kører ud med, hvor langt eller hvad
       det koster. En side, der tilbyder levering, fordi ingen har
       sagt nej, lover noget på forretningens vegne. */
    await åbn(page);

    await expect(page.locator('[data-toggles="#levfelt"]')).toBeHidden();
    await expect(page.locator('#levfelt')).toBeHidden();
    /* Og så er designets ubekræftede løfte om leveringspris og
       -zone ude af syne med det. Teksten står stadig i filen —
       den er designets, og den skal bekræftes af ejeren, før
       fluebenet slås til. */
    await expect(page.locator('#levfelt .hint')).toBeHidden();

    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    const gemt = await gemteData(page);
    expect(gemt.bestillinger[0].hvordan).toBe('afhentning');
    expect(gemt.bestillinger[0].leverings_adresse).toBe(null);
  });

  test('er levering slået til, kræves adressen — og den følger med', async ({ page }) => {
    const d = data();
    d.indstillinger.levering = true;
    await åbn(page, d);

    await expect(page.locator('[data-toggles="#levfelt"]')).toBeVisible();
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    // Levering er valgt som standard i designet, så adressen mangler
    await expect(page.locator('#bestil .note')).toContainText('adressen');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);

    await page.locator('#sadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#bestil button.g.solid.blk').click();

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.hvordan).toBe('levering');
    expect(b.leverings_adresse).toBe('Havnevej 20I, 2670 Greve');
  });

  test('en levering bekræftes ALDRIG af sig selv', async ({ page }) => {
    /* Vi kan love, at maden bliver lavet. Vi kan ikke love, at den
       kan køres til en adresse, vi ikke kender. */
    const d = data();
    d.indstillinger.levering = true;
    d.indstillinger.auto_bekraeft = true;
    await åbn(page, d);

    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#sadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#bestil button.g.solid.blk').click();

    await expect(page.locator('#bestil .hint').first()).toContainText('ringer og bekræfter');
  });

  test('mindsteantallet håndhæves', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_min_stk = 10;
    await åbn(page, d);

    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    await expect(page.locator('#bestil .note')).toContainText('mindst bestilles 10');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);
  });

  test('skallen er urørt: felterne står i designets rækkefølge', async ({ page }) => {
    const d = data();
    d.indstillinger.levering = true;
    await åbn(page, d);

    const etiketter = await page.$$eval('#bestil .field label',
      (els) => els.map((e) => e.textContent.trim()));
    expect(etiketter).toEqual(['Vælg jeres smørrebrød', 'Leveringsdag', 'Tidspunkt',
      'Levering eller afhentning?', 'Leveringsadresse', 'Navn', 'Telefonnummer',
      'Besked (valgfrit)']);
  });
});

/* ============================================================
   FYLDVÆLGEREN BOR HER NU  (30/8)
   ------------------------------------------------------------
   Model A — hvert fyld er en vare med sin egen pris — har levet
   på bestil/ siden 20/8. MÅLT 30/8: bestil/ var kun linket fra
   menu.html, som selv var forældreløs. Ingen gæst kunne altså
   vælge fyld til sit smørrebrød, selv om ejeren har 29 slags i
   admin. Kundens beslutning: byg den ind i den nye side.
   ============================================================ */
test.describe('Fyldet kan vælges på smørrebrødssiden', () => {

  /* Fyld UDEN pris er ønsker (se model A i README): de kan vælges,
     men de lægges ikke til summen. Fyld MED pris er almindelige
     varer og står i listen ovenfor. */
  function medFyld() {
    const d = grunddata();
    const kat = (d.menu_kategorier || []).filter((k) => /fyld/i.test(k.navn))[0];
    return { d, kat };
  }

  test('de fyld, ejeren har uden pris, står som piller', async ({ page }) => {
    const { d } = medFyld();
    await åbnSkal(page, '/h-smorrebrod.html', { data: d });

    await expect(page.locator('#fyldfelt')).toBeVisible();
    const piller = page.locator('#fyldvalg button');
    expect(await piller.count(), 'ingen fyld at vælge').toBeGreaterThan(0);
  });

  /* ⚠️ DESIGNET EJER MARKERINGEN. havnegrillen.js binder sin egen
     lytter på hver [data-chips], og første udgave togglede .on
     OGSÅ — de to ophævede hinanden, så tælleren sagde "2 slags
     valgt", mens begge piller så uvalgte ud. Samme fælde som
     segmenterne. Prøven måler BEGGE halvdele. */
  test('en valgt pille ser valgt ud — og tælleren følger med', async ({ page }) => {
    const { d } = medFyld();
    await åbnSkal(page, '/h-smorrebrod.html', { data: d });

    const først = page.locator('#fyldvalg button').first();
    await først.click();
    await expect(først, 'markeringen fulgte ikke trykket').toHaveClass(/on/);
    await expect(page.locator('#fyldtal')).toContainText('1 slags valgt');

    // Og den kan slås fra igen.
    await først.click();
    await expect(først).not.toHaveClass(/on/);
    await expect(page.locator('#fyldtal')).toContainText('Vælg det fyld');
  });

  /* ⚠️ FYLDET LÆGGES IKKE TIL SUMMEN OG ER IKKE EN LINJE. Et ønske
     uden pris, der talte med, ville give gæsten et beløb, hun ikke
     skal betale — og køkkenet et stykke, ingen har bestilt. Det
     sendes i kolonnen fyld, som bestil/ har brugt siden 20/8. */
  test('fyldet følger med bestillingen som ønsker, ikke som varer', async ({ page }) => {
    const { d } = medFyld();
    await åbnSkal(page, '/h-smorrebrod.html', { data: d });

    await page.locator('#fyldvalg button').first().click();
    const navn = (await page.locator('#fyldvalg button').first().textContent()).trim();

    // Vælg et stykke, så der er noget at sende.
    await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
    await page.locator('#snavn').fill('Sara Poulsen');
    await page.locator('#stlf').fill('28871343');
    await page.locator('#bestil button.g.solid.blk').click();

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.fyld, 'fyldet fulgte ikke med').toContain(navn);
    expect(b.linjer.map((l) => l.navn), 'fyldet blev sendt som en VARE')
      .not.toContain(navn);
  });

  /* Et afsnit uden noget at vise findes ikke — samme regel som
     resten af huset. Har ejeren sat pris på alle fyldene, er de
     varer i listen i stedet. */
  test('uden ønskefyld findes afsnittet ikke', async ({ page }) => {
    const d = grunddata();
    d.menu_varer = (d.menu_varer || []).map((v) => ({ ...v, pris: v.pris || 15 }));
    await åbnSkal(page, '/h-smorrebrod.html', { data: d });

    /* ⚠️ toBeHidden() ER OGSÅ SANDT FOR ET ELEMENT, DER IKKE
       FINDES. Første udgave af den her linje bestod derfor, også
       da hele fyldvælgeren var rullet væk — den målte ingenting.
       Derfor kræves det FØRST, at afsnittet er der, og DEREFTER
       at det er skjult. */
    await expect(page.locator('#fyldfelt')).toHaveCount(1);
    await expect(page.locator('#fyldfelt')).toBeHidden();
  });
});
