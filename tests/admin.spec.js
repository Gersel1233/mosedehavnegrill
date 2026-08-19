/* Personalets side.

   Testene kører i øvetilstand (ingen anon-nøgle), så intet går
   ud på nettet. Men det er præcis samme kode der kalder Supabase
   når nøglen er sat – valideringen og skærmen er ens.

   Det vigtigste her er ikke at knapperne findes, men at ingenting
   bliver gemt når det er forkert.
*/

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, sætUr, sætDataEngang } = require('./hjaelp');

/* Admin lander på OVERBLIK og ikke på Åbningstider. Det er med
   vilje: det første, personalet skal se, er hvad der er tikket ind,
   mens de ikke kiggede — ikke de tider, man ændrer to gange om
   året. Testene herunder åbner derfor selv fanen, som et menneske
   gør. */
async function åbnFane(page, panel) {
  await page.locator(`[data-panel="${panel}"]`).click();
}

test.describe('Adgang', () => {

  test('uden login er admin ikke tilgængelig', async ({ page }) => {
    await åbn(page, '/admin.html');
    await expect(page.locator('#login')).toBeVisible();
    await expect(page.locator('#admin')).toBeHidden();
  });

  /* GENVEJEN UNDER BYGGERIET, OG DENS TRE LÅSE.

     admin.html?fri=1 springer loginskærmen over. Det er til den der
     bygger, og det sparer en indtastning ved hver eneste fane.

     Tre betingelser skal ALLE holde: localhost, ingen database, og
     ?fri=1 i adressen. Testene her måler hver af dem, for det er en
     genvej uden om en lås — og en genvej uden om en lås skal kunne
     bevises, ikke antages.

     Den tredje betingelse findes, fordi første udgave sprang over på
     localhost alene. Den slog testen ovenfor ihjel: testene kører
     netop på 127.0.0.1 i øvetilstand, altså præcis det miljø
     genvejen åbnede. At omgåelsen ikke kunne skelnes fra testmiljøet,
     var tegnet på at den var for grov. */
  test('?fri=1 springer login over på egen maskine', async ({ page }) => {
    await åbn(page, '/admin.html?fri=1');
    await expect(page.locator('#admin')).toBeVisible();
    await expect(page.locator('#login')).toBeHidden();
  });

  test('uden ?fri=1 er låsen der, selv på localhost', async ({ page }) => {
    await åbn(page, '/admin.html');
    await expect(page.locator('#login')).toBeVisible();
    await expect(page.locator('#admin')).toBeHidden();
  });

  /* DEN VIGTIGSTE AF DEM: genvejen må ikke kunne åbne en side der har
     en rigtig database bag sig. Her er der data — gæsters navne og
     telefonnumre — og så skal der logges rigtigt ind, uanset hvad der
     står i adressen. */
  test('?fri=1 åbner IKKE når der er en rigtig database', async ({ page }) => {
    await page.route('**/js/config.js*', (r) => r.fulfill({
      contentType: 'application/javascript',
      body: "window.MOSEDE_CLOUD={url:'https://eksempel.supabase.co',anonKey:'noget'};",
    }));

    await page.goto('/admin.html?fri=1');
    await expect(page.locator('#login'),
      'genvejen åbnede admin selv om der er en database bag').toBeVisible();
    await expect(page.locator('#admin')).toBeHidden();
  });

  test('øvetilstand bliver sagt højt, så ingen tror det er live', async ({ page }) => {
    await åbn(page, '/admin.html');
    await expect(page.locator('#oeve-besked')).toBeVisible();
    await expect(page.locator('#oeve-besked')).toContainText('øvetilstand');
  });

  test('man kan logge ind og komme videre', async ({ page }) => {
    await åbn(page, '/admin.html');
    await page.locator('#email').fill('chef@mosedehavnegrill.dk');
    await page.locator('#kode').fill('noget');
    await page.locator('#login-form button[type=submit]').click();

    await expect(page.locator('#admin')).toBeVisible();
    await expect(page.locator('#hvem')).toContainText('chef@mosedehavnegrill.dk');
    await expect(page.locator('#oeve-baand')).toBeVisible();
  });

  test('log ud lukker siden igen', async ({ page }) => {
    // Logger ind gennem formularen, ikke via hjælperen. Hjælperen
    // lægger nøglen ind ved hver sideindlæsning, og så ville
    // genindlæsningen efter log-ud logge os ind igen.
    await åbn(page, '/admin.html');
    await page.locator('#email').fill('chef@mosedehavnegrill.dk');
    await page.locator('#kode').fill('noget');
    await page.locator('#login-form button[type=submit]').click();
    await expect(page.locator('#admin')).toBeVisible();

    await page.locator('#log-ud').click();
    await expect(page.locator('#login')).toBeVisible();
    await expect(page.locator('#admin')).toBeHidden();
  });
});

test.describe('Åbningstider', () => {

  test('en ændret tid bliver gemt', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-tider');
    await page.locator('[data-rolle="fra"][data-ugedag="0"]').fill('10:00');
    await page.locator('[data-rolle="til"][data-ugedag="0"]').fill('22:00');
    await page.locator('#gem-tider').click();

    await expect(page.locator('#kvittering')).toContainText('gemt');

    const d = await gemteData(page);
    const mandag = d.aabningstider.find(a => a.ugedag === 0);
    expect(mandag.aabner).toBe('10:00');
    expect(mandag.lukker).toBe('22:00');
  });

  test('lukketid før åbningstid bliver afvist – og intet gemmes', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-tider');
    await page.locator('[data-rolle="fra"][data-ugedag="2"]').fill('20:00');
    await page.locator('[data-rolle="til"][data-ugedag="2"]').fill('11:00');
    await page.locator('#gem-tider').click();

    await expect(page.locator('#fejl')).toContainText('Onsdag');
    await expect(page.locator('#fejl')).toContainText('lukkes efter der er åbnet');

    // Det afgørende: intet nåede ned i dataene
    const d = await gemteData(page);
    expect(d.aabningstider.find(a => a.ugedag === 2).aabner).toBe('11:00');
  });

  test('samme åbne- og lukketid bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-tider');
    await page.locator('[data-rolle="fra"][data-ugedag="1"]').fill('12:00');
    await page.locator('[data-rolle="til"][data-ugedag="1"]').fill('12:00');
    await page.locator('#gem-tider').click();
    await expect(page.locator('#fejl')).toContainText('lukkes efter der er åbnet');
  });

  test('hakket i Lukket slukker tidsfelterne', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-tider');
    const fra = page.locator('[data-rolle="fra"][data-ugedag="0"]');
    await expect(fra).toBeEnabled();

    await page.locator('[data-rolle="lukket"][data-ugedag="0"]').check();
    await expect(fra).toBeDisabled();
  });

  test('en lukket dag gemmes uden tider', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-tider');
    await page.locator('[data-rolle="lukket"][data-ugedag="0"]').check();
    await page.locator('#gem-tider').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const d = await gemteData(page);
    const mandag = d.aabningstider.find(a => a.ugedag === 0);
    expect(mandag.lukket).toBe(true);
    expect(mandag.aabner).toBeNull();
  });
});

test.describe('Kalenderen', () => {

  async function åbnKalender(page, data) {
    await åbnAdmin(page, data ? { data } : undefined);
    await åbnFane(page, 'p-kalender');
  }

  test('en lukkedag kan lægges ind og slettes igen', async ({ page }) => {
    await åbnKalender(page);
    await expect(page.locator('#kalender-liste')).toContainText('ikke noget i kalenderen');

    await page.locator('[data-type="lukkedag"]').click();
    await page.locator('#kal-dato').fill('2026-12-24');
    await page.locator('#kal-titel').fill('Juleaften');
    await page.locator('#kal-emoji').fill('🎄');
    await page.locator('#tilfoej-kalender').click();

    await expect(page.locator('#kalender-liste')).toContainText('Juleaften');
    await expect(page.locator('#kalender-liste')).toContainText('24. december');

    const d = await gemteData(page);
    expect(d.kalender[0].type).toBe('lukkedag');

    /* Sletningen spørger først. Playwright afviser dialoger af sig
       selv, så uden linjen her ville testen måle, at en ANNULLERET
       sletning ikke sletter noget — og bestå, uanset om knappen
       virkede. Bekræftelsen bliver: sletter man en lukkedag ved et
       uheld, står forsiden og siger "åbent" på en dag, hvor lugen
       er lukket. */
    page.once('dialog', (d2) => d2.accept());
    await page.locator('#kalender-liste button.fare').first().click();
    await expect(page.locator('#kalender-liste')).toContainText('ikke noget i kalenderen');
  });

  test('uden dato sker der ingenting', async ({ page }) => {
    await åbnKalender(page);
    await page.locator('#kal-titel').fill('Uden dato');
    await page.locator('#tilfoej-kalender').click();

    await expect(page.locator('#fejl')).toContainText('Vælg en dato');
    const d = await gemteData(page);
    expect(d.kalender || []).toHaveLength(0);
  });

  test('uden overskrift sker der ingenting', async ({ page }) => {
    /* Titlen står på listen OG på siden. En række uden overskrift
       er en linje, personalet ikke kan kende igen. */
    await åbnKalender(page);
    await page.locator('#kal-dato').fill('2026-12-24');
    await page.locator('#tilfoej-kalender').click();

    await expect(page.locator('#fejl')).toContainText('overskrift');
    const d = await gemteData(page);
    expect(d.kalender || []).toHaveLength(0);
  });

  /* Det nye i forhold til den gamle fane: en vinterlukning er ÉN
     række, ikke halvfems man skal klikke ind og slette igen. */
  test('en lukkeperiode er én række', async ({ page }) => {
    await åbnKalender(page);
    await page.locator('[data-type="lukkedag"]').click();
    await page.locator('#kal-dato').fill('2026-11-01');
    await page.locator('#kal-slut').fill('2027-02-01');
    await page.locator('#kal-titel').fill('Vinterlukket');
    await page.locator('#tilfoej-kalender').click();

    const d = await gemteData(page);
    expect(d.kalender, 'en periode blev til flere rækker').toHaveLength(1);
    expect(d.kalender[0].slut_dato).toBe('2027-02-01');
    await expect(page.locator('#kalender-liste')).toContainText('1. februar');
  });

  test('en slutdato før startdatoen bliver afvist', async ({ page }) => {
    await åbnKalender(page);
    await page.locator('#kal-dato').fill('2026-12-24');
    await page.locator('#kal-slut').fill('2026-12-01');
    await page.locator('#kal-titel').fill('Baglæns');
    await page.locator('#tilfoej-kalender').click();

    await expect(page.locator('#fejl')).toContainText('før startdatoen');
    const d = await gemteData(page);
    expect(d.kalender || []).toHaveLength(0);
  });

  /* En tidlig lukning uden klokkeslæt siger "vi lukker tidligt"
     uden at sige hvornår, og så står gæsten ved en lukket luge. */
  test('en tidlig lukning kræver et klokkeslæt', async ({ page }) => {
    await åbnKalender(page);
    await page.locator('[data-type="tidlig_lukning"]').click();
    await page.locator('#kal-dato').fill('2026-12-23');
    await page.locator('#kal-titel').fill('Personalemøde');
    await page.locator('#tilfoej-kalender').click();

    await expect(page.locator('#fejl')).toContainText('hvornår der lukkes');

    await page.locator('#kal-tid').fill('15:00');
    await page.locator('#tilfoej-kalender').click();
    await expect(page.locator('#kalender-liste')).toContainText('lukker 15:00');
  });

  test('felterne følger typen', async ({ page }) => {
    await åbnKalender(page);
    await page.locator('[data-type="lukkedag"]').click();
    await expect(page.locator('#kal-tid-felt'), 'en lukkedag har ikke et lukketidspunkt')
      .toBeHidden();
    await expect(page.locator('#kal-offentlig-felt')).toBeHidden();

    await page.locator('[data-type="tidlig_lukning"]').click();
    await expect(page.locator('#kal-tid-felt')).toBeVisible();

    await page.locator('[data-type="arrangement"]').click();
    await expect(page.locator('#kal-offentlig-felt')).toBeVisible();
    await expect(page.locator('#kal-tid-felt')).toBeHidden();
  });

  /* DEN VIGTIGSTE HER. Personalet skriver også ting til sig selv i
     kalenderen, og de må ikke havne på hjemmesiden, fordi nogen
     glemte at tænke over det. Standarden skal være "kun internt". */
  test('et arrangement er internt, indtil nogen siger andet', async ({ page }) => {
    await åbnKalender(page);
    await page.locator('[data-type="arrangement"]').click();
    await expect(page.locator('#kal-offentlig'),
      'fluebenet er sat på forhånd — så ryger interne noter på siden').not.toBeChecked();

    await page.locator('#kal-dato').fill('2026-09-01');
    await page.locator('#kal-titel').fill('Bent har ferie');
    await page.locator('#tilfoej-kalender').click();

    const d = await gemteData(page);
    expect(d.kalender[0].offentlig, 'et arrangement blev offentligt af sig selv').toBe(false);
    await expect(page.locator('#kalender-liste')).toContainText('Kun internt');
  });

  test('et arrangement kan sættes til at blive vist', async ({ page }) => {
    await åbnKalender(page);
    await page.locator('[data-type="arrangement"]').click();
    await page.locator('#kal-dato').fill('2026-09-01');
    await page.locator('#kal-titel').fill('Havnefest');
    await page.locator('#kal-offentlig').check();
    await page.locator('#tilfoej-kalender').click();

    const d = await gemteData(page);
    expect(d.kalender[0].offentlig).toBe(true);
    await expect(page.locator('#kalender-liste')).toContainText('Vises for gæsterne');
  });
});

test.describe('Menukort', () => {

  test('en pris kan rettes og bliver gemt', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const række = page.locator('#menu-redigering .admin-raekke').first();
    await række.locator('input.smal').fill('95');
    await række.locator('button.knap:not(.fare)').click();

    await expect(page.locator('#kvittering')).toContainText('gemt');
    const d = await gemteData(page);
    expect(d.menu_varer.find(v => v.id === 1).pris).toBe(95);
  });

  test('en pris med komma bliver forstået som dansk', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const række = page.locator('#menu-redigering .admin-raekke').first();
    await række.locator('input.smal').fill('89,50');
    await række.locator('button.knap:not(.fare)').click();

    const d = await gemteData(page);
    expect(d.menu_varer.find(v => v.id === 1).pris).toBe(89.5);
  });

  test('en negativ pris bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const række = page.locator('#menu-redigering .admin-raekke').first();
    await række.locator('input.smal').fill('-50');
    await række.locator('button.knap:not(.fare)').click();

    await expect(page.locator('#fejl')).toContainText('negativ');
    const d = await gemteData(page);
    expect(d.menu_varer.find(v => v.id === 1).pris).toBe(89);
  });

  test('en tastefejl på 99999 kr. bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const række = page.locator('#menu-redigering .admin-raekke').first();
    await række.locator('input.smal').fill('99999');
    await række.locator('button.knap:not(.fare)').click();

    await expect(page.locator('#fejl')).toContainText('over 10.000');
    const d = await gemteData(page);
    expect(d.menu_varer.find(v => v.id === 1).pris).toBe(89);
  });

  test('et tomt varenavn bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const række = page.locator('#menu-redigering .admin-raekke').first();
    await række.locator('input.navn').fill('   ');
    await række.locator('button.knap:not(.fare)').click();

    await expect(page.locator('#fejl')).toContainText('varenavn');
    const d = await gemteData(page);
    expect(d.menu_varer.find(v => v.id === 1).navn).toBe('Flæskestegssandwich');
  });

  test('en tom pris er tilladt – det er ikke det samme som nul', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const række = page.locator('#menu-redigering .admin-raekke').first();
    await række.locator('input.smal').fill('');
    await række.locator('button.knap:not(.fare)').click();

    await expect(page.locator('#kvittering')).toContainText('gemt');
    const d = await gemteData(page);
    expect(d.menu_varer.find(v => v.id === 1).pris).toBeNull();
  });

  test('en ny vare kan lægges på kortet', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const nyRække = page.locator('#menu-redigering .menu-gruppe').first()
      .locator('.admin-raekke').last();
    await nyRække.locator('input.navn').fill('Fiskefilet-sandwich');
    await nyRække.locator('input.smal').fill('79');
    await nyRække.locator('button').click();

    await expect(page.locator('#kvittering')).toContainText('lagt på menukortet');
    const d = await gemteData(page);
    const ny = d.menu_varer.find(v => v.navn === 'Fiskefilet-sandwich');
    expect(ny.pris).toBe(79);
    expect(ny.kategori_id).toBe(1);
  });

  test('Udsolgt kan slås til og slår igennem på menukortet', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const række = page.locator('#menu-redigering .admin-raekke').first();
    await række.locator('label.afkryds', { hasText: 'Udsolgt' }).locator('input').check();
    await række.locator('button.knap:not(.fare)').click();
    await expect(page.locator('#kvittering')).toBeVisible();

    // Og nu det der betyder noget: ser gæsten det? Menukortet har
    // sin egen side, så det er dér man skal kigge.
    await page.goto('/menu.html');
    await expect(page.locator('#menu-liste .linje').first()).toHaveClass(/udsolgt/);
    await expect(page.locator('#menu-liste')).toContainText('Udsolgt');
  });
});

test.describe('Nyheder', () => {

  test('en nyhed kan skrives og vises på forsiden', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-nyheder"]').click();

    await page.locator('#ny-titel').fill('Friske rødspætter');
    await page.locator('#ny-tekst').fill('Direkte fra kutteren i morgen.');
    await page.locator('#tilfoej-nyhed').click();

    await expect(page.locator('#nyheder-liste')).toContainText('Friske rødspætter');

    // Nyheder har ikke sin egen sektion i det nye design endnu,
    // så vi bliver i admin og tjekker at den blev gemt
    const d = await gemteData(page);
    expect(d.nyheder[0].tekst).toContain('Direkte fra kutteren');
  });

  test('en nyhed uden tekst bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-nyheder"]').click();
    await page.locator('#ny-titel').fill('Kun en overskrift');
    await page.locator('#tilfoej-nyhed').click();

    await expect(page.locator('#fejl')).toBeVisible();
    const d = await gemteData(page);
    expect(d.nyheder.length).toBe(0);
  });
});

test.describe('Beskeder og sæson', () => {

  test('dagens besked slår igennem på forsiden', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-beskeder"]').click();

    await page.locator('#besked-vis').check();
    await page.locator('#besked-tekst').fill('Kontanter virker ikke i dag.');
    await page.locator('#gem-besked').click();
    await expect(page.locator('#kvittering')).toContainText('på siden');

    await page.goto('/index.html');
    await expect(page.locator('#dagens-besked')).toHaveText('Kontanter virker ikke i dag.');
    await expect(page.locator('#dagens-besked')).toBeVisible();
  });

  test('en tom besked kan ikke slås til', async ({ page }) => {
    // Ellers står der en tom gul boks på forsiden
    await åbnAdmin(page);
    await page.locator('[data-panel="p-beskeder"]').click();
    await page.locator('#besked-vis').check();
    await page.locator('#gem-besked').click();

    await expect(page.locator('#fejl')).toContainText('Skriv en tekst');
  });

  test('sæsonlukning slår igennem, selv om ugeplanen siger åbent', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-beskeder"]').click();

    await page.locator('#saeson-lukket').check();
    await page.locator('#saeson-aabner').fill('1. april');
    await page.locator('#saeson-besked').fill('Tak for en god sæson!');
    await page.locator('#gem-saeson').click();
    await expect(page.locator('#kvittering')).toContainText('Lukket for sæsonen');

    // Kl. 13 en fredag med 11-21 i ugeplanen: skal stadig være lukket
    await page.goto('/index.html');
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket for sæsonen');
    await expect(page.locator('#hero-status-tekst')).toContainText('Tak for en god sæson');
    await expect(page.locator('#hero-status .dot')).toHaveClass(/lukket/);
  });
});

test.describe('Kontakt', () => {

  test('adressen kan rettes og slår igennem på forsiden', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-kontakt"]').click();

    await page.locator('#lok-adresse').fill('Havnevej 20I');
    await page.locator('#gem-kontakt').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    await page.goto('/index.html');
    await expect(page.locator('#adresse')).toContainText('Havnevej 20I');
    // Footeren og rutelinket skal med. Linjen under "Find os" nævner
    // ikke længere adressen – den stod der to gange.
    await expect(page.locator('#footer-adresse')).toContainText('Havnevej 20I');
    await expect(page.locator('#rute')).toHaveAttribute('href', /Havnevej%2020I/);
  });

  test('et postnummer der ikke er fire cifre bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-kontakt"]').click();

    await page.locator('#lok-postnr').fill('26X0');
    await page.locator('#gem-kontakt').click();

    await expect(page.locator('#fejl')).toContainText('fire cifre');
    const d = await gemteData(page);
    expect(d.lokationer[0].postnr).toBe('2670');
  });

  test('en e-mail der ikke ser rigtig ud bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-kontakt"]').click();

    await page.locator('#lok-email').fill('chef@');
    await page.locator('#gem-kontakt').click();
    await expect(page.locator('#fejl')).toContainText('E-mailen');
  });
});

test.describe('Skallen', () => {

  /* Landingssiden er en beslutning, ikke en tilfældighed. Før
     landede man på Åbningstider — det, man ændrer to gange om året
     — mens en ny bestilling lå urørt på en fane, ingen havde
     trykket på. */
  test('admin lander på Overblik', async ({ page }) => {
    await åbnAdmin(page);
    await expect(page.locator('#p-overblik')).toBeVisible();
    await expect(page.locator('#p-tider')).toBeHidden();
    await expect(page.locator('[data-panel="p-overblik"]'))
      .toHaveAttribute('aria-selected', 'true');
  });

  test('en tom Overblik siger det højt', async ({ page }) => {
    /* Tomt er et svar, ikke en tom skærm. Står der ingenting, tror
       man siden er i stykker, og så genindlæser nogen i stedet for
       at passe forretningen. */
    await åbnAdmin(page);
    await expect(page.locator('#overblik-nyt')).toContainText('sidste tre timer');
  });

  test('dagens tal står der, også når de er nul', async ({ page }) => {
    await åbnAdmin(page);
    await expect(page.locator('#overblik-tal .tal-felt')).toHaveCount(4);
    await expect(page.locator('#overblik-tal')).toContainText('Nye bestillinger');
  });

  /* Der er ingen kasse i det her system. Tallene er det, gæsterne
     har sendt gennem hjemmesiden, og et tal der ligner en omsætning
     uden at være det, er værre end intet tal. */
  test('Overblik lover ikke en omsætning', async ({ page }) => {
    await åbnAdmin(page);
    const tekst = (await page.locator('#p-overblik').innerText()).toLowerCase();
    for (const ord of ['omsætning', 'kr.', 'indtjening', 'salg i alt']) {
      expect(tekst, `Overblik påstår at kende "${ord}"`).not.toContain(ord);
    }
  });

  test('en fane kan åbnes fra Overblik', async ({ page }) => {
    const data = grunddata({
      bestillinger: [{
        id: 1, lokation_id: 'mosede', reference: 'SM260806-ABCDE',
        navn: 'Anna Hansen', telefon: '20304050', hent_dato: '2026-08-07',
        hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
        fyld: [], antal: 2, status: 'ny', intern_note: null,
        oprettet: '2026-08-07T10:30:00Z',      // en halv time før det faste ur
      }],
    });
    await åbnAdmin(page, { data });

    await expect(page.locator('#overblik-nyt')).toContainText('Anna Hansen');
    await expect(page.locator('#overblik-nyt')).toContainText('2 × Smørrebrød');

    await page.locator('.nyt-aabn').first().click();
    await expect(page.locator('#p-bestillinger')).toBeVisible();
    await expect(page.locator('#p-overblik')).toBeHidden();
  });

  /* Skallen er vendt om i forhold til gæstesiden: admin er
     computer- og iPad-først. Målingen er billigere end at opdage
     på et skærmbillede, at ni menupunkter er blevet to linjer. */
  test('menuen står ved siden af indholdet på en computer', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'på telefon er det en pillerække, og det er med vilje');
    await åbnAdmin(page);

    const m = await page.evaluate(() => {
      const f = document.querySelector('.faner').getBoundingClientRect();
      const i = document.querySelector('.admin-indhold').getBoundingClientRect();
      return {
        menuHoejre: f.right, indholdVenstre: i.left,
        menuTop: f.top, indholdTop: i.top,
        bredde: document.documentElement.scrollWidth, vindue: window.innerWidth,
      };
    });

    expect(m.menuHoejre, 'menuen ligger ikke til venstre for indholdet')
      .toBeLessThanOrEqual(m.indholdVenstre);
    expect(Math.abs(m.menuTop - m.indholdTop), 'menu og indhold står ikke på samme linje')
      .toBeLessThan(40);
    expect(m.bredde, 'personalesiden kan rulles sidelæns').toBeLessThanOrEqual(m.vindue + 1);
  });

  /* Vinduet er tre timer, og det skal kunne fejle: en bestilling
     fra i går må ikke stå under "lige modtaget", uanset hvornår
     maden skal hentes. */
  test('noget gammelt står ikke under "lige modtaget"', async ({ page }) => {
    const data = grunddata({
      bestillinger: [{
        id: 1, lokation_id: 'mosede', reference: 'SM260805-ABCDE',
        navn: 'Gammel Bestilling', telefon: '20304050', hent_dato: '2026-08-07',
        hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 1, pris: 55 }],
        fyld: [], antal: 1, status: 'ny', intern_note: null,
        oprettet: '2026-08-06T11:00:00Z',      // et helt døgn før
      }],
    });
    await åbnAdmin(page, { data });

    await expect(page.locator('#overblik-nyt')).not.toContainText('Gammel Bestilling');
    await expect(page.locator('#overblik-nyt')).toContainText('sidste tre timer');
  });
});

test.describe('Salg', () => {

  /* Uret i åbnAdmin står på fredag 7. august 2026, så ugen løber
     fra mandag den 3. Datoerne herunder er valgt derefter. */
  const bestilling = (æ) => ({
    id: 1, lokation_id: 'mosede', reference: 'SM260807-AAAAA',
    navn: 'Anna', telefon: '20304050', hent_dato: '2026-08-07',
    hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
    fyld: [], antal: 2, status: 'afhentet', intern_note: null,
    oprettet: '2026-08-07T09:00:00Z', ...æ,
  });

  async function åbnSalg(page, bestillinger) {
    await åbnAdmin(page, { data: grunddata({ bestillinger }) });
    await åbnFane(page, 'p-salg');
  }

  /* DEN VIGTIGSTE HER. En bestilling er ikke et salg. Den kan blive
     afvist, aflyst eller aldrig hentet, og tæller vi den med, får
     ejeren et tal, der er for højt — og træffer beslutninger på
     det. Samme regel som i spiis: det tæller, når maden er ud ad
     døren. */
  test('kun afhentede bestillinger tæller som salg', async ({ page }) => {
    await åbnSalg(page, [
      bestilling({ id: 1, status: 'afhentet' }),
      bestilling({ id: 2, status: 'ny', reference: 'SM260807-BBBBB',
        linjer: [{ navn: 'Rejemad', antal: 5, pris: 75 }], antal: 5 }),
    ]);

    const tal = page.locator('#salg-tal');
    await expect(tal, 'en bestilling, der ikke er hentet, blev talt med')
      .toContainText('110 kr.');
    await expect(tal).toContainText('Bestillinger');
    await expect(page.locator('#salg-tal .tal-felt').nth(1)).toContainText('1');
  });

  test('perioden kan skiftes, og tallet følger med', async ({ page }) => {
    await åbnSalg(page, [
      bestilling({ id: 1, hent_dato: '2026-08-07' }),            // i dag
      bestilling({ id: 2, hent_dato: '2026-08-04',               // tirsdag i samme uge
        reference: 'SM260804-CCCCC' }),
    ]);

    await expect(page.locator('#salg-tal .tal-felt').nth(1)).toContainText('1');

    await page.locator('[data-periode="uge"]').click();
    await expect(page.locator('#salg-tal .tal-felt').nth(1),
      'ugen fandt ikke bestillingen fra tirsdag').toContainText('2');
    await expect(page.locator('#salg-tal')).toContainText('220 kr.');
  });

  test('mest solgte lægger stykkerne sammen', async ({ page }) => {
    await åbnSalg(page, [
      bestilling({ id: 1 }),
      bestilling({ id: 2, reference: 'SM260807-DDDDD',
        linjer: [{ navn: 'Smørrebrød', antal: 3, pris: 55 },
                 { navn: 'Rejemad', antal: 1, pris: 75 }], antal: 4 }),
    ]);

    const første = page.locator('#salg-varer .admin-raekke').first();
    await expect(første).toContainText('Smørrebrød');
    await expect(første, '2 + 3 skal give 5').toContainText('5 stk.');
  });

  /* Der er ingen kasse i systemet. Står der "omsætning" uden
     forbehold, tror ejeren, tallet er butikkens — og det er kun
     det, der er bestilt gennem hjemmesiden. */
  test('siden siger, at det ikke er butikkens omsætning', async ({ page }) => {
    await åbnSalg(page, []);
    const tekst = (await page.locator('#p-salg').innerText()).toLowerCase();
    expect(tekst, 'der står ikke, at det kun er online-salget')
      .toContain('gennem hjemmesiden');
    expect(tekst, 'der står ikke, at lugen ikke er med').toContain('lugen');
    expect(tekst).toContain('afhentet');
  });

  test('en tom periode siger det højt', async ({ page }) => {
    await åbnSalg(page, []);
    await expect(page.locator('#salg-varer')).toContainText('ikke hentet noget');
  });
});

test.describe('Opdelingen', () => {

  /* Der lå engang 800 linjer JavaScript inline i admin.html, og
     hver ny fane gjorde den blok længere. Koden ligger nu i
     js/admin/ med én fane pr. fil, og reglen her holder døren
     lukket: begynder nogen at skrive admin-kode direkte i
     HTML'en igen, fælder den byggeriet i stedet for at lade
     filen vokse i stilhed. */
  test('admin.html har ingen inline JavaScript', async ({ request }) => {
    const html = await (await request.get('/admin.html')).text();

    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
    // Måleren selv: finder den ingen script-tags, måler den ingenting
    expect(scripts.length, 'admin.html har slet ingen scripts – er siden død?')
      .toBeGreaterThan(2);

    for (const tag of scripts) {
      expect(tag, 'inline JavaScript hører til i en fil under js/admin/')
        .toMatch(/\bsrc=/);
    }
  });
});
