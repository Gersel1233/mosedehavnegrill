/* LEVERING AF SMØRREBRØD UD AF HUSET.

   Kundens ord (23/8): bestillingssiden med smørrebrød ud af huset
   "skal være egnet til smørrebrød ud af huset, om det afhentes
   eller skal leveres — det skal ik bare være det samme".

   To ting måles her, og den anden er den vigtige:

   1) At de to sider stiller HVER SIT spørgsmål. Ved lugen er det
      to-go eller spis her. Ud af huset spiser man ikke her, og
      spørgsmålet er hentning eller levering.

   2) At siden ALDRIG lover en levering af sig selv. Der er ingen
      bekræftet leveringszone og ingen pris — se listen "Ejeren
      skal bekræfte" i README. Databasens halvdel af den regel er
      prøvet i supabase/proev-levering.sql (8 af 8).
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

/* Grunddata med smørrebrød at bestille. bestil/ viser kun
   udvalget 'kun-smoer', så uden stykker er formularen tom, og
   prøverne ville måle på en skjult plads. */
function medSmoerrebroed(ændringer = {}) {
  const d = grunddata();
  d.menu_kategorier = [
    { id: 1, afdeling: 'mad', navn: 'Smørrebrød', sortering: 6, aktiv: true },
    { id: 12, afdeling: 'mad', navn: 'Vælg fyld til smørrebrødet', sortering: 7, aktiv: true },
  ];
  d.menu_varer = [
    { id: 1, kategori_id: 1, navn: 'Håndmad', beskrivelse: null, pris: 45,
      fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true },
    { id: 2, kategori_id: 12, navn: 'Leverpostej med baconsvøb', beskrivelse: null,
      pris: null, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true },
  ];
  d.indstillinger = { ...d.indstillinger, bestilling_varsel_timer: 0, ...ændringer };
  return d;
}

/* Læg ét stykke i kurven.

   Folden åbnes KUN hvis den er lukket. Første udgave klikkede
   fold-hovedet blindt — og med ét stykke i listen står folden
   åben af sig selv, så klikket LUKKEDE den. Send-knappen blev
   ved med at være slået fra, og fire prøver meldte timeout på
   en knap, der opførte sig helt rigtigt.

   Plus-knappen vælges på sin etiket og ikke på teksten "+":
   fold-hovedet siger "+ tilføj", og .first() ramte det i stedet
   for tælleren. */
async function laegIKurv(page) {
  const lukket = page.locator('#bestil-stykker .fold-hoved[aria-expanded="false"]');
  if (await lukket.count()) await lukket.first().click();
  await page.locator('#bestil-stykker button[aria-label^="Én mere"]').first().click();
}

test.describe('Smørrebrød ud af huset: hentes eller leveres', () => {

  test('siden spørger ikke om levering, før ejeren har sagt ja', async ({ page }) => {
    /* STANDARDEN ER FRA, og det er hele pointen. Vi ved ikke, om
       forretningen leverer. En side, der tilbyder det, fordi
       ingen har sagt nej, lover noget på deres vegne. */
    await åbn(page, '/bestil/', { data: medSmoerrebroed() });
    await expect(page.locator('#bestil-hvordan-trin')).toHaveClass(/skjult/);
    await expect(page.locator('#bestil-adresse-trin')).toHaveClass(/skjult/);
  });

  test('slået til spørger den om hentning eller levering — ikke om spis her', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medSmoerrebroed({ levering: true }) });
    const valg = page.locator('#bestil-hvordan');
    await expect(valg).toBeVisible();
    await expect(valg).toContainText('Vi henter selv');
    await expect(valg).toContainText('I leverer');
    /* Lugens spørgsmål må ikke stå her: smørrebrød ud af huset
       spiser man pr. definition ikke her. */
    await expect(valg).not.toContainText('Spis her');
    await expect(valg).not.toContainText('To-go');
  });

  test('forsiden spørger stadig om to-go eller spis her', async ({ page }) => {
    /* Den anden halvdel af det samme: ét modul, to spørgsmål.
       Rettede man det ene sted uden det andet, ville lugen
       pludselig spørge, om maden skal leveres. */
    const d = grunddata();
    d.indstillinger = { ...d.indstillinger,
      bestilbare_kategorier: [9], bestilling_varsel_timer: 0, levering: true };
    await åbn(page, '/index.html', { data: d });
    const valg = page.locator('#bestil-hvordan');
    await expect(valg).toContainText('To-go');
    await expect(valg).toContainText('Spis her');
    await expect(valg).not.toContainText('I leverer');
  });

  test('adressefeltet kommer først frem, når der skal leveres', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medSmoerrebroed({ levering: true }) });
    const adresse = page.locator('#bestil-adresse-trin');
    await expect(adresse).toHaveClass(/skjult/);

    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await expect(adresse).not.toHaveClass(/skjult/);

    /* Og VÆK igen. Et adressefelt, der bliver stående på en
       bestilling, der skal hentes, er præcis den fejl, databasens
       regel også fanger — men gæsten skal ikke se feltet
       overhovedet. */
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'Vi henter selv' }).click();
    await expect(adresse).toHaveClass(/skjult/);
  });

  test('en levering uden adresse kommer ikke forbi formularen', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medSmoerrebroed({ levering: true }) });
    await laegIKurv(page);
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await page.locator('#bestil-navn').fill('Test Testesen');
    await page.locator('#bestil-telefon').fill('20304050');
    await page.locator('#bestil-send').click();

    await expect(page.locator('#fejl-adresse')).not.toHaveClass(/skjult/);
    // Det sidste kig må IKKE være nået frem
    await expect(page.locator('#bestil-kig')).toHaveClass(/skjult/);
  });

  test('det sidste kig siger Leveres og viser adressen', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medSmoerrebroed({ levering: true }) });
    await laegIKurv(page);
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await page.locator('#bestil-adresse').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#bestil-navn').fill('Test Testesen');
    await page.locator('#bestil-telefon').fill('20304050');
    await page.locator('#bestil-send').click();

    const kig = page.locator('#bestil-kig');
    await expect(kig).not.toHaveClass(/skjult/);
    await expect(kig).toContainText('Leveres');
    await expect(kig).toContainText('Havnevej 20I, 2670 Greve');
    /* "Hentes" må ikke stå på en bestilling, der køres ud — det
       er dét, kigget findes for at fange. */
    await expect(kig.locator('.kvit-navn', { hasText: /^Hentes$/ })).toHaveCount(0);
  });

  test('en levering bekræftes ALDRIG automatisk, heller ikke når kontakten står til',
    async ({ page }) => {
    /* DEN VIGTIGSTE PRØVE I FILEN. auto_bekraeft er slået TIL som
       standard, så en levering ville ellers få "Bestilt. Hentes
       lørdag kl. 12" — et løfte om at køre til en adresse, ingen
       har set på. */
    await åbn(page, '/bestil/', {
      data: medSmoerrebroed({ levering: true, auto_bekraeft: true }),
    });
    await laegIKurv(page);
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await page.locator('#bestil-adresse').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#bestil-navn').fill('Test Testesen');
    await page.locator('#bestil-telefon').fill('20304050');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();

    const tak = page.locator('#bestil-tak');
    await expect(tak).toBeVisible();
    await expect(tak).toContainText('bekræfter, at vi kan køre til adressen');
    await expect(tak).not.toContainText('Bestilt.');
  });

  test('en afhentning bekræftes stadig automatisk', async ({ page }) => {
    /* Modstykket. Uden den kunne reglen ovenfor være skrevet som
       "bekræft aldrig noget automatisk", og så var grundprincippet
       rullet tilbage uden at nogen opdagede det. */
    await åbn(page, '/bestil/', {
      data: medSmoerrebroed({ levering: true, auto_bekraeft: true }),
    });
    await laegIKurv(page);
    await page.locator('#bestil-navn').fill('Test Testesen');
    await page.locator('#bestil-telefon').fill('20304050');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();

    await expect(page.locator('#bestil-tak')).toContainText('Bestilt.');
  });
});
