/* MODEL A: fyldet er varen.

   Aftalt med ejeren august 2026. Før valgte gæsten et ANTAL
   stykker ét sted og krydsede fyld af i en løsrevet liste — "8
   stykker + 12 slags fyld" fortæller ikke køkkenet, hvad der skal
   smøres. Nu tælles der pr. fyld: 2 × rejemad, 3 × leverpostej.

   Filen måler tre ting, og den første er den vigtigste:

   1) SKELLET GÅR PÅ KATEGORIEN, IKKE PÅ PRISEN. Så længe skellet
      var prisen, ville den dag, fyldet fik priser, forvandle alle
      29 fyld til stykker — og forsiden ville love 34 slags
      smørrebrød. Prøven herunder giver fyldet priser og tjekker,
      at tallene står stille.

   2) Fyld MED pris kan bestilles og lander i bestillingens linjer.

   3) Fyld UDEN pris kan stadig kun ØNSKES. Det er ikke en
      overgangsfase, det er reglen: kan vi prissætte det, kan det
      bestilles — kan vi ikke, kan det ønskes. Siden skal virke
      både før og efter, ejeren har givet tallene. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

/* Grunddata har ét stykke (Flæskestegssandwich, 89 kr., kategori
   "Smørrebrød") og to fyld uden pris (kategori "Vælg fyld til
   smørrebrødet"). medPriser() giver fyldet priser — altså model A. */
function medPriser() {
  const d = grunddata();
  d.menu_varer = d.menu_varer.map((v) => (
    v.kategori_id === 12 ? { ...v, pris: v.id === 4 ? 38 : 45 } : v
  ));
  return d;
}

test.describe('Skellet går på kategorien', () => {

  test('fyld med pris bliver IKKE til stykker', async ({ page }) => {
    /* Den fælde, hele ombygningen stod og faldt med. Med det gamle
       pris-skel ville tallene her blive 3 stykker og 0 fyld. */
    await åbn(page, '/smoerrebroed-ud-af-huset/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    await expect(page.locator('#smoer-tal-stykker')).toHaveText('1');
    await expect(page.locator('#smoer-tal-fyld')).toHaveText('2');
  });

  test('forsiden lover stadig det rigtige antal slags', async ({ page }) => {
    await åbn(page, '/index.html', { data: medPriser() });
    await expect(page.locator('#smoer-fyld')).toContainText('2 slags fyld');
    // Ét stykke i listen — ikke tre
    await expect(page.locator('#smoer-liste .smoer-raekke')).toHaveCount(1);
  });
});

test.describe('Fyldet er varen', () => {

  test('fyld med pris har tæller og kommer med i bestillingen', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    /* Fyldet ligger i sin egen gruppe. Den er lukket fra start —
       kun den første gruppe står åben — så testen åbner den, som
       et menneske gør. */
    const gruppe = page.locator('.vare-gruppe', { hasText: 'Kød og pålæg' });
    await gruppe.locator('.fold-hoved').click();

    const linje = gruppe.locator('.stk-linje', { hasText: 'Leverpostej' });
    await expect(linje).toContainText('38');
    await linje.getByRole('button', { name: /Én mere/ }).click();
    await linje.getByRole('button', { name: /Én mere/ }).click();

    await expect(page.locator('#bestil-sum-tekst')).toContainText('2 stykker');

    await page.locator('#bestil-dage .dag').first().click();
    await page.locator('#bestil-navn').fill('Anna Vind');
    await page.locator('#bestil-telefon').fill('20304050');
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const gemt = await gemteData(page);
    const b = gemt.bestillinger[0];
    const linjen = b.linjer.filter((l) => /Leverpostej/.test(l.navn))[0];
    expect(linjen, 'fyldet kom ikke med som en vare').toBeTruthy();
    expect(linjen.antal).toBe(2);
    expect(linjen.pris, 'prisen fulgte ikke med — så kan køkkenet ikke regne')
      .toBe(38);
  });

  test('grupperne er foldet: den første åben, resten lukket', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const grupper = page.locator('.vare-gruppe');
    await expect(grupper).toHaveCount(2);
    await expect(grupper.nth(0).locator('.fold-hoved'))
      .toHaveAttribute('aria-expanded', 'true');
    await expect(grupper.nth(1).locator('.fold-hoved'))
      .toHaveAttribute('aria-expanded', 'false');
  });

  test('grupperne står i fast rækkefølge, og resten sidst', async ({ page }) => {
    /* Første udkast lod grupperne komme i den rækkefølge, deres
       første vare tilfældigvis havde i sorteringen — og så stod
       "Andet godt" midt imellem de navngivne. Set på et
       skærmbillede, ikke i koden. */
    const d = grunddata();
    d.menu_varer = d.menu_varer.map((v) => (
      v.kategori_id === 12 ? { ...v, pris: 45 } : v
    ));
    // En vare, der ikke passer i nogen gruppe — den skal ligge sidst
    d.menu_varer.push({
      id: 30, kategori_id: 12, navn: 'Ristet løg og sennep', beskrivelse: null,
      pris: 12, fremhaevet: false, udsolgt: false, sortering: 0, aktiv: true,
    });
    await åbn(page, '/smoerrebroed-ud-af-huset/', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const navne = await page.locator('.vare-gruppe .fold-navn').allInnerTexts();
    expect(navne[0], 'stykkerne står ikke først').toBe('Smørrebrød');
    expect(navne[navne.length - 1], '"Andet godt" står ikke sidst').toBe('Andet godt');
  });

  test('en lukket gruppe viser, hvor meget der ligger i den', async ({ page }) => {
    /* Uden tallet ville gæstens egen kurv være skjult bag en
       lukket fold — og så tæller hun forfra. */
    await åbn(page, '/smoerrebroed-ud-af-huset/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const stykker = page.locator('.vare-gruppe').nth(0);
    await stykker.locator('.stk-linje').first()
      .getByRole('button', { name: /Én mere/ }).click();

    await expect(stykker.locator('.fold-note')).toHaveText('1 valgt');
  });
});

test.describe('Fyld uden pris kan ønskes, ikke købes', () => {

  test('uden priser står ønskefolden der som før', async ({ page }) => {
    /* Den udgivne side i dag: fyldet har ingen priser. Den skal
       virke uændret, til ejeren har givet tallene. */
    await åbn(page, '/smoerrebroed-ud-af-huset/');
    await page.waitForSelector('#bestil-stykker .stk-linje');

    await expect(page.locator('#bestil-fyld-trin')).toBeVisible();
    await page.locator('#fyld-knap').click();
    await expect(page.locator('#bestil-fyld .fyld-valg').first()).toBeVisible();

    // Og fyldet har ingen tæller: det kan ikke købes
    await expect(page.locator('.vare-gruppe', { hasText: 'Kød og pålæg' }))
      .toHaveCount(0);

    /* Én gruppe er ingen gruppe: er der kun stykkerne, står listen
       flad som før — ellers skulle gæsten trykke en fold op for at
       se det, hun kom efter. */
    await expect(page.locator('.vare-gruppe')).toHaveCount(0);
    await expect(page.locator('#bestil-stykker .stk-linje').first()).toBeVisible();
  });

  test('med priser på alt forsvinder ønskefolden af sig selv', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await expect(page.locator('#bestil-fyld-trin')).toBeHidden();
  });
});

test.describe('Hvad kan bestilles ud af huset?', () => {

  /* Grunddata har en is-kategori og en ølkategori med priser.
     Ingen af dem må kunne bestilles, før personalet siger ja. */
  test('kun smørrebrødet kan bestilles fra start', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/', { data: medPriser() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const tekst = await page.locator('#bestil-stykker').innerText();
    expect(tekst, 'isen kan bestilles, uden at nogen har sagt ja')
      .not.toContain('Softice');
    expect(tekst, 'øllen kan bestilles, uden at nogen har sagt ja')
      .not.toContain('Fadøl');
  });

  test('et flueben i admin åbner en kategori — og lukker den igen', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    // Smørrebrødet kan altid: fluebenet er sat og kan ikke pilles af
    const smør = page.locator('#bestilbar-1');
    await expect(smør).toBeChecked();
    await expect(smør).toBeDisabled();

    // Isen slås til
    await page.locator('#bestilbar-6').check();
    await expect(page.locator('#kvittering')).toContainText('kan nu bestilles');

    const gemt = await gemteData(page);
    expect(gemt.indstillinger.bestilbare_kategorier).toContain(6);
  });

  test('en åbnet kategori står som sin egen gruppe på siden', async ({ page }) => {
    const d = medPriser();
    d.indstillinger.bestilbare_kategorier = [6];
    await åbn(page, '/smoerrebroed-ud-af-huset/', { data: d });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    /* Gruppen hedder kategoriens eget navn fra menukortet — ingen
       har fundet på et ord til den. Og den står EFTER smørrebrødet. */
    const navne = await page.locator('.vare-gruppe .fold-navn').allInnerTexts();
    expect(navne).toContain('Softice og vafler');
    expect(navne[0]).toBe('Smørrebrød');
    expect(navne.indexOf('Softice og vafler')).toBeGreaterThan(0);

    const is = page.locator('.vare-gruppe', { hasText: 'Softice og vafler' });
    await is.locator('.fold-hoved').click();
    await expect(is.locator('.stk-linje', { hasText: 'Softice' })).toBeVisible();
  });
});

test.describe('Ejerens tal skrives ét sted', () => {

  test('samme pris kan sættes på alle fyld på én gang', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    /* Linjen skal sige sandheden om, hvor mange der mangler —
       ellers tror personalet, at siden er i stykker. */
    await expect(page.locator('.samle-pris')).toContainText('2 af 2 mangler en pris');

    page.once('dialog', (d) => d.accept());
    await page.locator('#fyld-samlepris').fill('45');
    await page.locator('.samle-pris button').click();

    await expect(page.locator('.samle-pris')).toContainText('Alle 2 har en pris');

    const gemt = await gemteData(page);
    const fyld = gemt.menu_varer.filter((v) => v.kategori_id === 12);
    expect(fyld.every((v) => v.pris === 45), 'ikke alle fyld fik prisen').toBe(true);
  });

  test('et tal, der ikke er en pris, bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    await page.locator('#fyld-samlepris').fill('99999');
    await page.locator('.samle-pris button').click();
    await expect(page.locator('#fejl')).toContainText('mellem 0 og 10.000');

    const gemt = await gemteData(page);
    const fyld = gemt.menu_varer.filter((v) => v.kategori_id === 12);
    expect(fyld.every((v) => v.pris === null)).toBe(true);
  });
});
