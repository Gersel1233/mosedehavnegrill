/* BESTILLING FRA BORDET — siden bag QR-koden på mærkatet.

   Gæsten sidder ved bord 7 og scanner. Der er fire ting, der kan
   gå galt her, og de er alle fire dyre:

   1) MADEN GÅR TIL DET FORKERTE BORD. Det er hele forskellen på
      den her side og en almindelig bestilling: der er ingen
      hentetid, hvor køkkenet kan opdage en fejl. Bordnummeret ER
      leveringsadressen.

   2) DEN SPØRGER OM EN DAG OG EN TID. Gæsten sidder der nu. En
      dagvælger ville lade hende bestille frokost til på tirsdag
      til bord 7 — et bord, hun ikke har på tirsdag.

   3) DEN TAGER IMOD, NÅR DER ER LUKKET. En bestilling til et
      lukket køkken er et løfte, ingen kan holde, og hun opdager
      det først, når der ikke kommer noget.

   4) DEN SENDER TIL ET BORD, DER IKKE FINDES. Mærkatet kan være
      flyttet, bordet nedlagt. Databasen afviser det
      (supabase/bordkort.sql, prøve 5 og 11), men gæsten skal
      have en vej videre FØR hun trykker send.

   Testene kører i øvetilstand: der er ingen database, og
   bestillingen lander i localStorage. Adgangsreglerne prøves for
   sig i supabase/proev-bordkort.sql — dem kan en browser ikke se.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata, gemteData } = require('./hjaelp');

const SIDE = '/ved-bordet/';
// Torsdag 6. august 2026 kl. 13.00 dansk tid — midt i åbningstiden.
const UR = '2026-08-06T11:00:00Z';

const BORDE = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 },
  { id: 2, lokation_id: 'mosede', nummer: 'Terrassen 2', pladser: 6, placering: 'ude', aktiv: true, sortering: 20 },
  { id: 3, lokation_id: 'mosede', nummer: '9', pladser: 2, placering: 'inde', aktiv: false, sortering: 30 },
];

async function åbnBord(page, adresse = '?bord=7', valg = {}) {
  await åbn(page, SIDE + adresse, {
    ur: UR,
    data: grunddata({ borde: BORDE, ...(valg.data || {}) }),
  });
}

async function vaelg(page, n = 1) {
  const op = page.locator('#bestil-stykker .stk-linje').first().locator('button', { hasText: '+' });
  for (let i = 0; i < n; i++) await op.click();
}

test.describe('Bordet kommer fra listen, ikke fra adressen', () => {

  test('et kendt bord åbner formularen med bordet skrevet på', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('#bord-titel')).toContainText('bord 7');
    await expect(page.locator('#bestil-form')).toBeVisible();
    await expect(page.locator('#bord-vaelg')).toBeHidden();
    expect(await page.locator('#bestil-form').getAttribute('data-bord')).toBe('7');
  });

  /* ?bord=BORD%207 og ?bord=7 må ikke blive til to borde i
     køkkenets liste, når det er ét bord på trædækket. Det er
     RÆKKENS navn, der skrives i formularen — ikke gæstens tekst. */
  test('store bogstaver og mellemrum rammer det samme bord', async ({ page }) => {
    await åbnBord(page, '?bord=%20terrassen%202%20');
    await expect(page.locator('#bestil-form')).toBeVisible();
    expect(await page.locator('#bestil-form').getAttribute('data-bord'))
      .toBe('Terrassen 2');
  });

  test('uden et bord i adressen spørger siden, hvilket bord det er', async ({ page }) => {
    await åbnBord(page, '');
    await expect(page.locator('#bord-vaelg')).toBeVisible();
    await expect(page.locator('#bestil-form')).toBeHidden();
    // De to tændte borde står der, det slukkede gør ikke
    await expect(page.locator('#bord-liste button')).toHaveCount(2);
    await expect(page.locator('#bord-liste')).toContainText('Terrassen 2');
    await expect(page.locator('#bord-liste')).not.toContainText('9');
  });

  test('et ukendt bord siger hvad der er galt, i stedet for at gå i stå', async ({ page }) => {
    await åbnBord(page, '?bord=Parkeringspladsen');
    await expect(page.locator('#bord-vaelg')).toBeVisible();
    await expect(page.locator('#bord-vaelg-note')).toContainText('Parkeringspladsen');
    await expect(page.locator('#bestil-form')).toBeHidden();
  });

  /* Et bord, personalet har slukket i admin, tager ikke imod —
     og skiltet på det ligger der stadig. Siden skal opføre sig
     som databasen (prøve 7 i proev-bordkort.sql), ikke vise en
     formular, der bliver afvist ved afsendelsen. */
  test('et slukket bord opfører sig som et ukendt', async ({ page }) => {
    await åbnBord(page, '?bord=9');
    await expect(page.locator('#bord-vaelg')).toBeVisible();
    await expect(page.locator('#bestil-form')).toBeHidden();
  });

  test('vælger man et bord i listen, står det i adressen bagefter', async ({ page }) => {
    await åbnBord(page, '');
    await page.locator('#bord-liste button', { hasText: 'Terrassen 2' }).click();
    await expect(page.locator('#bestil-form')).toBeVisible();
    expect(page.url()).toContain('bord=Terrassen%202');
  });
});

test.describe('Der er ingen dag og ingen tid at vælge', () => {

  test('dagvælgeren og tidsvælgeren findes ikke på siden', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('#bestil-dag')).toHaveCount(0);
    await expect(page.locator('#bestil-tid')).toHaveCount(0);
  });

  /* To go / spis her er lugens spørgsmål. Ved bordet er svaret
     givet, og et valg med ét svar er ikke et valg. */
  test('der spørges ikke om to-go eller spis her', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('#bestil-hvordan-trin')).toHaveCount(0);
  });
});

test.describe('Bestillingen bærer bordet', () => {

  test('den lander med bord, spis her og dagen i dag', async ({ page }) => {
    await åbnBord(page);
    await vaelg(page, 2);
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304050');
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-kig')).toBeVisible();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const d = await gemteData(page);
    const b = d.bestillinger[0];
    expect(b.bord_nummer).toBe('7');
    expect(b.hvordan).toBe('spis_her');
    expect(b.hent_dato).toBe('2026-08-06');
    // Klokken nu, ikke en valgt tid: 13.00 dansk tid
    expect(b.hent_tid).toBe('13:00');
  });

  test('det sidste kig viser bordet i stedet for en hentetid', async ({ page }) => {
    await åbnBord(page);
    await vaelg(page, 1);
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304051');
    await page.locator('#bestil-send').click();

    const kig = page.locator('#kig-indhold');
    await expect(kig).toContainText('Bord');
    await expect(kig).toContainText('7');
    await expect(kig).not.toContainText('Hentes');
  });

  /* VI RINGER IKKE TIL ET BORD. Gæsten sidder tyve meter fra
     lugen; et opkald til telefonen, der ligger foran hende, er
     ikke en bekræftelse. */
  test('kvitteringen siger at vi kommer med det, ikke at vi ringer', async ({ page }) => {
    await åbnBord(page);
    await vaelg(page, 1);
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304052');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();

    const tak = page.locator('#bestil-tak');
    await expect(tak).toContainText('bord 7');
    await expect(tak).toContainText('kommer med det');
    await expect(tak).not.toContainText('Vi ringer til dig');
  });

  /* "BESTIL NOGET MERE" LÆGGER EN NY ORDRE PÅ DET SAMME BORD.
     Briefens punkt 3. Selskabet ved bord 7 bestiller is efter
     maden, og køkkenet skal kunne se, at det er den samme regning
     — altså det samme bord — men to stykker arbejde: det første
     er måske allerede serveret, når det næste kommer ind. Én ordre,
     der voksede, ville betyde, at køkkenet skulle huske, hvad de
     havde lavet af den. */
  test('bestil noget mere bliver en NY ordre på det samme bord', async ({ page }) => {
    await åbnBord(page);
    await vaelg(page, 1);
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304054');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    await page.locator('#bestil-tak button', { hasText: 'Bestil noget mere' }).click();
    await expect(page.locator('#bestil-form')).toBeVisible();
    // Bordet følger med — formularen er stadig bordets.
    expect(await page.locator('#bestil-form').getAttribute('data-bord')).toBe('7');

    await vaelg(page, 1);
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304054');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const d = await gemteData(page);
    expect(d.bestillinger.length, 'den anden bestilling blev lagt oven i den første')
      .toBe(2);
    expect(d.bestillinger.map((b) => b.bord_nummer)).toEqual(['7', '7']);
    expect(d.bestillinger[0].reference,
      'de to ordrer har samme reference og kan ikke skelnes i køkkenet')
      .not.toBe(d.bestillinger[1].reference);
  });

  /* UDSOLGT FORSVINDER MED DET SAMME — briefens accepttest 4.
     Personalet sætter fluebenet i admin, og næste gæst, der
     scanner, kan ikke bestille varen. Det er Butik.udvalg, der
     filtrerer, så det gælder alle tre bestillingssider på én
     gang. */
  test('en udsolgt vare kan ikke bestilles fra bordet', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('#bestil-stykker')).toContainText('Flæskestegssandwich');

    await åbnBord(page, '?bord=7', {
      data: {
        menu_varer: grunddata().menu_varer.map((v) =>
          (v.navn === 'Flæskestegssandwich' ? { ...v, udsolgt: true } : v)),
      },
    });
    await expect(page.locator('#bestil-stykker .stk-linje', { hasText: 'Flæskestegssandwich' }),
      'en udsolgt vare kunne stadig lægges i kurven ved bordet').toHaveCount(0);
  });

  /* Mindsteantallet er smørrebrødets regel — ti stykker, før
     køkkenet går i gang. Den må ikke stå i vejen for én is ved
     bord 7. */
  test('mindsteantallet står ikke i vejen ved bordet', async ({ page }) => {
    await åbnBord(page, '?bord=7', {
      data: { indstillinger: { ...grunddata().indstillinger, bestilling_min_stk: 10 } },
    });
    await vaelg(page, 1);
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304053');
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-kig')).toBeVisible();
  });
});

/* KURVEN ER FÆLLES FOR SIDERNE, og det er med vilje: gæsten skal
   kunne skifte side uden at miste sit valg. Ved bordet er det
   farligt — se noten i js/bestilling.js. */
test.describe('Kurven fra en anden side kører ikke med', () => {

  test('smørrebrød og fyld fra bestil/ ryger ud ved bordet', async ({ page }) => {
    await åbn(page, SIDE + '?bord=7', {
      ur: UR,
      data: grunddata({ borde: BORDE }),
    });
    // Læg en kurv, som den ser ud efter et besøg på bestil/
    await page.evaluate(() => {
      localStorage.setItem('mosede_kurv_v1', JSON.stringify({
        stk: { 'Rejemad': 2, 'Flæskestegssandwich': 1 },
        fyld: ['Leverpostej med baconsvøb'],
        hvordan: 'afhentning',
      }));
    });
    await page.reload();
    await page.waitForSelector('#bestil-stykker .stk-linje');

    /* Flæskestegssandwichen kan sælges ved bordet og bliver
       stående. Rejemad kan ikke — den står ikke i listen, og så
       må den heller ikke tælle med i bjælken eller køre med i
       bestillingen. */
    const kurv = await page.evaluate(
      () => JSON.parse(localStorage.getItem('mosede_kurv_v1')));
    expect(Object.keys(kurv.stk)).toEqual(['Flæskestegssandwich']);
    expect(kurv.fyld).toEqual([]);

    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304055');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();

    const d = await gemteData(page);
    const b = d.bestillinger[0];
    expect(b.linjer.map((l) => l.navn), 'noget uden for bordets udvalg kørte med')
      .toEqual(['Flæskestegssandwich']);
    expect(b.fyld).toEqual([]);
  });
});

test.describe('Lukket er lukket', () => {

  test('er der lukket i dag, er der ingen formular', async ({ page }) => {
    await åbnBord(page, '?bord=7', {
      data: {
        aabningstider: Array.from({ length: 7 }, (_, u) => ({
          lokation_id: 'mosede', ugedag: u, lukket: true, aabner: null, lukker: null,
        })),
      },
    });
    await expect(page.locator('#bestil-lukket')).toBeVisible();
    await expect(page.locator('#bestil-form')).toBeHidden();
  });

  test('er der ingen borde oprettet, siges det i stedet for en tom side', async ({ page }) => {
    await åbnBord(page, '?bord=7', { data: { borde: [] } });
    await expect(page.locator('#bestil-lukket')).toContainText('ikke sat op');
    await expect(page.locator('#bestil-form')).toBeHidden();
  });
});

test.describe('Siden er bordets, ikke hjemmesidens', () => {

  /* Står den i Google, kan en, der aldrig har været på havnen,
     bestille til bord 7, mens et rigtigt selskab sidder ved det.
     Værnet i databasen kan kræve, at bordet FINDES — det kan
     ikke se, om nogen sidder ved det. */
  test('den holdes ude af søgemaskinerne', async ({ page }) => {
    await åbnBord(page);
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
  });

  /* Hvert link væk herfra er en vej ud af den bestilling, gæsten
     er i gang med. Det er den samme regel som den flydende pille
     på forsiden: ét sted, én ting man kan gøre. */
  test('der er ingen menu og ingen vej væk fra bordet', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('header nav')).toHaveCount(0);
    await expect(page.locator('.tilbage')).toHaveCount(0);
    const links = await page.locator('a[href]').count();
    expect(links, 'der er links væk fra bordets side').toBe(0);
  });
});
