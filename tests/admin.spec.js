/* Personalets side.

   Testene kører i øvetilstand (ingen anon-nøgle), så intet går
   ud på nettet. Men det er præcis samme kode der kalder Supabase
   når nøglen er sat – valideringen og skærmen er ens.

   Det vigtigste her er ikke at knapperne findes, men at ingenting
   bliver gemt når det er forkert.
*/

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, sætUr, sætDataEngang } = require('./hjaelp');

test.describe('Adgang', () => {

  test('uden login er admin ikke tilgængelig', async ({ page }) => {
    await åbn(page, '/admin.html');
    await expect(page.locator('#login')).toBeVisible();
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
    await page.locator('[data-rolle="fra"][data-ugedag="1"]').fill('12:00');
    await page.locator('[data-rolle="til"][data-ugedag="1"]').fill('12:00');
    await page.locator('#gem-tider').click();
    await expect(page.locator('#fejl')).toContainText('lukkes efter der er åbnet');
  });

  test('hakket i Lukket slukker tidsfelterne', async ({ page }) => {
    await åbnAdmin(page);
    const fra = page.locator('[data-rolle="fra"][data-ugedag="0"]');
    await expect(fra).toBeEnabled();

    await page.locator('[data-rolle="lukket"][data-ugedag="0"]').check();
    await expect(fra).toBeDisabled();
  });

  test('en lukket dag gemmes uden tider', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-rolle="lukket"][data-ugedag="0"]').check();
    await page.locator('#gem-tider').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const d = await gemteData(page);
    const mandag = d.aabningstider.find(a => a.ugedag === 0);
    expect(mandag.lukket).toBe(true);
    expect(mandag.aabner).toBeNull();
  });
});

test.describe('Lukkedage', () => {

  test('en lukkedag kan lægges ind og slettes igen', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-lukkedage"]').click();

    await expect(page.locator('#lukkedage-liste')).toContainText('Ingen lukkedage');

    await page.locator('#ny-dato').fill('2026-12-24');
    await page.locator('#ny-aarsag').fill('Juleaften');
    await page.locator('#ny-emoji').fill('🎄');
    await page.locator('#tilfoej-lukkedag').click();

    await expect(page.locator('#lukkedage-liste')).toContainText('Juleaften');
    await expect(page.locator('#lukkedage-liste')).toContainText('24. december');

    await page.locator('#lukkedage-liste button.fare').first().click();
    await expect(page.locator('#lukkedage-liste')).toContainText('Ingen lukkedage');
  });

  test('en lukkedag uden dato bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-lukkedage"]').click();
    await page.locator('#ny-aarsag').fill('Uden dato');
    await page.locator('#tilfoej-lukkedag').click();

    await expect(page.locator('#fejl')).toContainText('Vælg en dato');
    const d = await gemteData(page);
    expect(d.lukkedage.length).toBe(0);
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

    // Og nu det der betyder noget: ser gæsten det?
    await page.goto('/index.html');
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
    await expect(page.locator('#find-under')).toContainText('Havnevej 20I');
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
