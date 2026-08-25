/* Personalets side.

   Testene kører i øvetilstand (ingen anon-nøgle), så intet går
   ud på nettet. Men det er præcis samme kode der kalder Supabase
   når nøglen er sat – valideringen og skærmen er ens.

   Det vigtigste her er ikke at knapperne findes, men at ingenting
   bliver gemt når det er forkert.
*/

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData, sætUr, sætDataEngang , NØGLE } = require('./hjaelp');

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

    /* To veje ud, og kun én er synlig ad gangen: topbjælken bærer
       den på en telefon, sidemenuen fra 900 px og op, hvor bjælken
       er skjult. Prøven må ikke vide hvilken skærm den kører på. */
    await page.locator('#log-ud-side:visible, #log-ud:visible').first().click();
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

    /* ⚠️ AUTOGEM ÆNDREDE FORUDSÆTNINGEN HER (24/8), og det er værd
       at forstå frem for at rette prøven i blinde.

       Før gemte INTET, før nogen trykkede Gem, og prøven kunne
       kræve, at åbningstiden stod urørt. Nu gemmer hvert felt sig
       selv, når det forlades — og "åbner 20.00" alene ER en
       gyldig åbningstid, som personalet faktisk har skrevet. Den
       bliver gemt.

       Det, der IKKE må ske, er at PARRET 20.00–11.00 lander i
       databasen: så lover forsiden en luge, der lukker ni timer
       før den åbner. Det er dét, prøven måler nu. */
    const d = await gemteData(page);
    const onsdag = d.aabningstider.find(a => a.ugedag === 2);
    expect(onsdag.lukker, 'den umulige lukketid blev gemt').not.toBe('11:00');
    expect(onsdag.lukker > onsdag.aabner, 'der lukkes før der åbnes').toBe(true);
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
    await række.locator('button', { hasText: 'Gem' }).click();

    await expect(page.locator('#kvittering')).toContainText('gemt');
    const d = await gemteData(page);
    expect(d.menu_varer.find(v => v.id === 1).pris).toBe(95);
  });

  test('en pris med komma bliver forstået som dansk', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const række = page.locator('#menu-redigering .admin-raekke').first();
    await række.locator('input.smal').fill('89,50');
    await række.locator('button', { hasText: 'Gem' }).click();

    const d = await gemteData(page);
    expect(d.menu_varer.find(v => v.id === 1).pris).toBe(89.5);
  });

  test('en negativ pris bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const række = page.locator('#menu-redigering .admin-raekke').first();
    await række.locator('input.smal').fill('-50');
    await række.locator('button', { hasText: 'Gem' }).click();

    await expect(page.locator('#fejl')).toContainText('negativ');
    const d = await gemteData(page);
    expect(d.menu_varer.find(v => v.id === 1).pris).toBe(89);
  });

  test('en tastefejl på 99999 kr. bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const række = page.locator('#menu-redigering .admin-raekke').first();
    await række.locator('input.smal').fill('99999');
    await række.locator('button', { hasText: 'Gem' }).click();

    await expect(page.locator('#fejl')).toContainText('over 10.000');
    const d = await gemteData(page);
    expect(d.menu_varer.find(v => v.id === 1).pris).toBe(89);
  });

  test('et tomt varenavn bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const række = page.locator('#menu-redigering .admin-raekke').first();
    await række.locator('input.navn').fill('   ');
    await række.locator('button', { hasText: 'Gem' }).click();

    await expect(page.locator('#fejl')).toContainText('varenavn');
    const d = await gemteData(page);
    expect(d.menu_varer.find(v => v.id === 1).navn).toBe('Flæskestegssandwich');
  });

  test('en tom pris er tilladt – det er ikke det samme som nul', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();

    const række = page.locator('#menu-redigering .admin-raekke').first();
    await række.locator('input.smal').fill('');
    await række.locator('button', { hasText: 'Gem' }).click();

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
    await række.locator('button', { hasText: 'Gem' }).click();
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

  /* Beskeden GEMMES, men står ikke på forsiden længere — kunden bad
     om præcis to bannere (22/8). Prøven vogter begge halvdele: at
     personalets tekst lander i databasen, OG at kvitteringen ikke
     lover en synlighed, forsiden ikke leverer. */
  test('dagens besked gemmes, og kvitteringen lover ikke for meget', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-beskeder"]').click();

    await page.locator('#besked-vis').check();
    await page.locator('#besked-tekst').fill('Kontanter virker ikke i dag.');
    await page.locator('#gem-besked').click();
    await expect(page.locator('#kvittering')).toContainText('vises ikke på siden');

    const d = await gemteData(page);
    expect(d.indstillinger.dagens_besked.tekst).toBe('Kontanter virker ikke i dag.');

    // Og forsiden viser den faktisk ikke
    await page.goto('/index.html');
    await expect(page.locator('.bn.besked')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Kontanter virker ikke i dag.');
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
    test.skip(true, 'forsiden er skiftet ud (23/8) — genoprettes mod den nye forside i systemfasen, se tests-gamle/README.md');
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

test.describe('Dagens ret', () => {

  /* Det eneste på forsiden, der skifter fra dag til dag. Feltet
     står øverst på Forside-fanen, fordi det skal skrives HVER
     morgen — kuglerne skiftes sjældnere. */
  test('retten kan skrives og lander på forsiden', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-forside');

    await page.fill('#dagens-navn', 'Stegt flæsk');
    await page.fill('#dagens-desc', 'Med persillesovs');
    await page.fill('#dagens-pris', '89');
    await page.locator('#gem-dagens').click();
    await expect(page.locator('#kvittering')).toContainText('forsiden');

    const gemt = await gemteData(page);
    expect(gemt.indstillinger.dagens_ret).toEqual({
      navn: 'Stegt flæsk', beskrivelse: 'Med persillesovs', pris: 89,
    });
  });

  /* Prisen skrives som på et menukort: 89 eller 89,50. Et tal, der
     ikke er en pris, skal ikke gemmes — og et tomt felt er også et
     svar: så står der ingen pris på forsiden. */
  test('prisen tager komma, og tom er også et svar', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-forside');

    await page.fill('#dagens-navn', 'Fiskefilet');
    await page.fill('#dagens-pris', '89,50');
    await page.locator('#gem-dagens').click();
    expect((await gemteData(page)).indstillinger.dagens_ret.pris).toBe(89.5);

    await page.fill('#dagens-pris', '');
    await page.locator('#gem-dagens').click();
    expect((await gemteData(page)).indstillinger.dagens_ret.pris).toBeNull();
  });

  test('en pris der ikke er et tal bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-forside');

    await page.fill('#dagens-navn', 'Fiskefilet');
    await page.fill('#dagens-pris', 'ca. 89');
    await page.locator('#gem-dagens').click();

    await expect(page.locator('#fejl')).toContainText('tal');
    expect(((await gemteData(page)).indstillinger.dagens_ret || {}).navn)
      .toBeFalsy();
  });

  /* Uden navn er der ingen ret. Blokken på forsiden findes ikke,
     og en gemt ret uden navn ville være en tom kasse med et rødt
     mærke på. */
  test('uden navn bliver der ikke gemt noget', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-forside');

    await page.fill('#dagens-desc', 'Med persillesovs');
    await page.locator('#gem-dagens').click();

    await expect(page.locator('#fejl')).toContainText('Skriv retten');
    expect(((await gemteData(page)).indstillinger.dagens_ret || {}).beskrivelse)
      .toBeFalsy();
  });

  test('Ryd tømmer retten, og forsiden holder op med at vise den', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.dagens_ret = { navn: 'Stegt flæsk', beskrivelse: '', pris: 89 };
    await åbnAdmin(page, { data: d });
    await åbnFane(page, 'p-forside');
    await expect(page.locator('#dagens-navn')).toHaveValue('Stegt flæsk');

    page.once('dialog', (dlg) => dlg.accept());
    await page.locator('#ryd-dagens').click();

    expect((await gemteData(page)).indstillinger.dagens_ret.navn).toBe('');
  });
});

test.describe('Kontakt', () => {

  test('adressen kan rettes og slår igennem på forsiden', async ({ page }) => {
    test.skip(true, 'forsiden er skiftet ud (23/8) — genoprettes mod den nye forside i systemfasen, se tests-gamle/README.md');
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
    await expect(page.locator('#overblik-tal .tal-felt')).toHaveCount(6);
    await expect(page.locator('#overblik-tal')).toContainText('Nye bestillinger');
    /* "Bordønsker" stod her. Bordet BOOKES nu (23/8), og et
       system, hvor gæstesiden siger "booket" og personalesiden
       siger "ønske", er to systemer. */
    await expect(page.locator('#overblik-tal')).toContainText('Nye bookinger');
    /* Baglokalet står stadig som "ønsker der skal ringes om", og
       det er rigtigt: pris, timer og antal er ikke bekræftet, så
       DÉR er der noget at snakke om. Kun bordet er vendt. */
    await expect(page.locator('#overblik-tal')).not.toContainText('Bordønsker');
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

    /* Anna henter I DAG, så hun står i vagtskærmen — ikke under
       "Nyt til andre dage". Prøven pegede på #overblik-nyt,
       dengang overblikket var sorteret efter hvornår
       bestillingen kom ind. Se noten øverst i js/admin/overblik.js. */
    await expect(page.locator('#overblik-vagt')).toContainText('Anna Hansen');
    await expect(page.locator('#overblik-vagt')).toContainText('2 × Smørrebrød');

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
      const s = document.querySelector('.adm-side').getBoundingClientRect();
      const i = document.querySelector('.admin-indhold').getBoundingClientRect();
      return {
        menuHoejre: s.right, indholdVenstre: i.left,
        menuTop: s.top, menuBund: s.bottom, vindueHoej: window.innerHeight,
        bredde: document.documentElement.scrollWidth, vindue: window.innerWidth,
      };
    });

    expect(m.menuHoejre, 'menuen ligger ikke til venstre for indholdet')
      .toBeLessThanOrEqual(m.indholdVenstre + 1);
    /* Søjlen går fra kant til kant lodret. En menu, der slutter
       midt på en 1440 px skærm, ser ud som om siden er gået i
       stykker — og personalet ruller gennem lange lister. */
    expect(m.menuTop, 'menuen starter ikke i toppen').toBeLessThanOrEqual(1);
    expect(m.menuBund, 'menuen når ikke ned i bunden')
      .toBeGreaterThanOrEqual(m.vindueHoej - 1);
    expect(m.bredde, 'personalesiden kan rulles sidelæns').toBeLessThanOrEqual(m.vindue + 1);
  });

  /* ---- SAMME HUS SOM GÆSTESIDEN ----
     Kundens ord (24/8): temaerne skal være "cirka de samme, men
     alligevel lidt anderledes og bedre, fordi det er admin".

     Farverne og overskriftsskriften skal derfor være gæstesidens
     — og de skal komme fra body.personale og ikke fra :root, for
     css/style.css bærer stadig ni gæstesider, der skal se ud, som
     de gør. Prøven måler begge dele på én gang: admin er varmt,
     og bestil/ er stadig marineblå. */
  test('admin bruger gæstesidens farver og serif — og kun admin', async ({ page }) => {
    await åbnAdmin(page);
    const a = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      const h = getComputedStyle(document.querySelector('.h-panel, h2'));
      return {
        sea: s.getPropertyValue('--sea').trim(),
        red: s.getPropertyValue('--red').trim(),
        sand: s.getPropertyValue('--sand').trim(),
        serif: h.fontFamily,
      };
    });
    expect(a.sea, 'admin skal bruge gæstesidens varme blæk').toBe('#241a17');
    expect(a.red, 'admin skal bruge gæstesidens røde').toBe('#d62a3a');
    expect(a.sand).toBe('#fdf7ef');
    expect(a.serif, 'overskrifterne skal være Instrument Serif').toContain('Instrument Serif');

    /* OG GÆSTESIDERNE PÅ style.css MÅ IKKE FØLGE MED. Havde
       farverne stået i :root, ville bestil/, menu.html og
       selskaber/ skifte tema uden at nogen bad om det. */
    await åbn(page, '/bestil/');
    const g = await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue('--sea').trim());
    expect(g, 'gæstesiden på style.css er stadig marineblå').toBe('#0f2c44');
  });

  /* Søjlen er FLADEN, rækkerne er stille, og den valgte er rød.
     Det lyder som smag, men det er en kaskadefælde: basisreglen for
     .faner button og @media-reglens "background: transparent" vejer
     det samme, så den, der står SIDST i style.css, vinder. Da basis
     lå efter media-blokken, var rækkerne grå kasser inde i panelet
     — set på et skærmbillede, usynligt i koden.

     Og den valgte skal være RØD og ikke marineblå: søjlen ER
     marineblå, og et marineblåt mærke på marineblå bund kan kun
     ses på kanten. */
  test('søjlen er fladen, rækkerne er stille, den valgte er rød', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'på telefon er de grå piller netop meningen');
    await åbnAdmin(page);

    const m = await page.evaluate(() => {
      const læs = (v) => getComputedStyle(document.querySelector(v)).backgroundColor;
      return {
        soejle: læs('.adm-side'),
        panel: læs('.faner'),
        række: læs('.faner button:not([aria-selected="true"])'),
        valgt: læs('.faner button[aria-selected="true"]'),
      };
    });
    expect(m.soejle, 'søjlen skal være gæstesidens varme blæk').toBe('rgb(36, 26, 23)');
    expect(m.panel, 'menulisten skal lade søjlen være fladen').toBe('rgba(0, 0, 0, 0)');
    expect(m.række, 'rækkerne skal lade søjlen være fladen').toBe('rgba(0, 0, 0, 0)');
    expect(m.valgt, 'den valgte skal være mærkefarven').toBe('rgb(214, 42, 58)');
  });

  /* ---- SKABELONEN FRA 24/8 ----
     Kunden pegede på en færdig personaleside og bad om den form.
     Prøverne her måler de dele, der ikke kan ses ved at læse
     koden: at overskriften følger fanen, at søjlen bærer navnet og
     vejen ud, og at tallene står øverst. */

  test('sidens navn er den valgte fanes navn', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'overskriften hører til skallen på computer');
    await åbnAdmin(page);
    await expect(page.locator('#fane-titel')).toHaveText('Overblik');

    await page.locator('[data-panel="p-bestillinger"]').click();
    /* Ikonet og tallet må IKKE med — "🥪 Bestillinger 4" er ikke
       en overskrift. */
    await expect(page.locator('#fane-titel')).toHaveText('Bestillinger');

    await page.locator('[data-panel="p-menu"]').click();
    await expect(page.locator('#fane-titel')).toHaveText('Menukort');
  });

  test('søjlen bærer navnet, hvem man er, og vejen ud', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'på telefon står de to links i topbjælken');
    await åbnAdmin(page);

    await expect(page.locator('.adm-maerke')).toContainText('Havnegrill');
    /* Hvem der er logget ind står i HOVEDET og ikke i søjlen:
       søjlen findes ikke på en telefon, og flere medarbejdere
       deler den samme iPad i køkkenet. */
    await expect(page.locator('.adm-hoved #hvem')).toBeVisible();
    await expect(page.locator('#hvem')).toContainText('@');
    await expect(page.locator('#log-ud-side')).toBeVisible();
    // Topbjælken er væk, når man arbejder: den sagde det samme og
    // kostede 92 px af skærmhøjden på hver eneste fane.
    await expect(page.locator('header.top')).toBeHidden();
  });

  test('dagens tal står ØVERST på overblikket, ikke nederst', async ({ page }) => {
    await åbnAdmin(page);

    const m = await page.evaluate(() => {
      const tal = document.querySelector('#overblik-tal').getBoundingClientRect();
      const liste = document.querySelector('#overblik-vagt').getBoundingClientRect();
      return { tal: tal.top, liste: liste.top, felter: document.querySelectorAll('.tal-felt').length };
    });
    expect(m.felter, 'der er ingen tal at vise').toBeGreaterThan(0);
    expect(m.tal, 'tallene står under listerne igen').toBeLessThan(m.liste);
  });

  /* SØJLEN MÅ IKKE TAGE TELEFONENS FANER MED SIG.

     Den fejl blev lavet med det samme: .adm-side fik display:none
     under 900 px, og da .faner ligger INDE i den, forsvandt alle
     fjorten faner på telefonen. Otte prøver løb tør for tid på et
     klik, der aldrig kunne ske — og på en iPhone havde personalet
     stået med en side uden navigation. Prøven er set fejle. */
  test('fanerne findes stadig i bunden på en telefon', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'her måles telefonens skal');
    await åbnAdmin(page);

    await expect(page.locator('[data-panel="p-tider"]')).toBeVisible();
    await page.locator('[data-panel="p-tider"]').click();
    await expect(page.locator('#p-tider')).toBeVisible();

    // Mærket og vejen ud hører til søjlen, og den findes ikke her.
    await expect(page.locator('.adm-maerke')).toBeHidden();
    await expect(page.locator('.adm-bund')).toBeHidden();
    /* Men SIDETITLEN skal med. Første udgave skjulte hele hovedet
       under 900 px, og så landede man på seks tal uden en
       overskrift over sig. */
    await expect(page.locator('#fane-titel')).toBeVisible();
    await expect(page.locator('#fane-titel')).toHaveText('Åbningstider');
    await expect(page.locator('#hvem')).toBeVisible();
    // Topbjælken bærer dem i stedet.
    await expect(page.locator('header.top')).toBeVisible();
    await expect(page.locator('#log-ud')).toBeVisible();
  });

  test('overskriften er ikke gemt bag topbjælken på login-skærmen', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'gælder skallen på computer');
    // Uden klassen "arbejder" ville login-skærmen stå uden hoved og
    // uden gutter, som en formular, der er faldet af en side.
    await åbn(page, '/admin.html');
    await expect(page.locator('header.top')).toBeVisible();
    await expect(page.locator('#login')).toBeVisible();
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
  test('kun det, der er ud ad døren, tæller som salg', async ({ page }) => {
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

  /* EN BORDBESTILLING ENDER PÅ 'serveret' OG ALDRIG PÅ 'afhentet'.
     Talte vi kun det sidste, ville hver eneste krone fra bordene
     være væk fra regnskabet — uden en fejl, uden et hul i listen,
     bare et tal, der var for lavt. Det er den samme begivenhed set
     fra hver sin side af lugen. */
  test('en serveret bordbestilling tæller med i omsætningen', async ({ page }) => {
    await åbnSalg(page, [
      bestilling({ id: 1, status: 'serveret', bord_nummer: '7' }),
      bestilling({ id: 2, status: 'klar', reference: 'SM260807-BBBBB',
        bord_nummer: '3', linjer: [{ navn: 'Pølse', antal: 1, pris: 45 }], antal: 1 }),
    ]);

    const tal = page.locator('#salg-tal');
    await expect(tal, 'den serverede bordbestilling blev ikke talt med')
      .toContainText('110 kr.');
    // Den, der stadig står i køkkenet, er ikke solgt endnu.
    await expect(tal).not.toContainText('155 kr.');
  });

  /* Ejeren skal kunne se, om QR-koderne på bordene betyder noget.
     Det er ikke et andet regnskab — det er det samme tal delt op. */
  test('uden bordbestillinger findes bordfeltet ikke', async ({ page }) => {
    await åbnSalg(page, [bestilling({ id: 1, status: 'afhentet' })]);
    await expect(page.locator('#salg-tal'),
      'et tomt bordfelt på en forretning uden QR-koder ligner en fejl')
      .not.toContainText('Fra bordene');
  });

  test('bordene har deres eget felt, og totalen er begge dele', async ({ page }) => {
    await åbnSalg(page, [
      bestilling({ id: 1, status: 'afhentet' }),
      bestilling({ id: 2, status: 'serveret', reference: 'SM260807-BBBBB',
        bord_nummer: '7', linjer: [{ navn: 'Pølse', antal: 1, pris: 45 }], antal: 1 }),
    ]);
    const bordfelt = page.locator('#salg-tal .tal-felt', { hasText: 'Fra bordene' });
    await expect(bordfelt).toContainText('45 kr.');
    await expect(bordfelt).toContainText('1 ordre via QR');
    await expect(page.locator('#salg-tal .tal-felt').first()).toContainText('155 kr.');
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
    await expect(page.locator('#salg-varer')).toContainText('ikke hentet eller serveret noget');
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


/* ==================== UDEBLIVELSER OG VAGTHUNDEN ==============

   Begge er spiis' lærepenge (briefen 22/8), betalt med rigtige
   middage: gæster der aldrig kom, og beskeder skrevet som retter,
   man kunne bestille. Prøverne her holder de to døre lukkede. */
test.describe('Udeblivelser', () => {

  const bestilling = (over = {}) => Object.assign({
    id: 1, lokation_id: 'mosede', reference: 'SM260806-ABCDE',
    navn: 'Anna Hansen', telefon: '20304050', hent_dato: '2026-08-07',
    hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
    fyld: [], antal: 2, status: 'klar', intern_note: null,
    oprettet: '2026-08-07T09:30:00Z',
  }, over);

  test('en klar bestilling kan sættes som udeblevet', async ({ page }) => {
    const data = grunddata({ bestillinger: [bestilling()] });
    await åbnAdmin(page, { data });
    await åbnFane(page, 'p-bestillinger');

    page.on('dialog', (d) => d.accept());
    await page.locator('.bestil-kort button', { hasText: 'Udeblev' }).click();

    await expect(page.locator('#kvittering')).toContainText('tæller ikke som salg');
    const d = await gemteData(page);
    expect(d.bestillinger[0].status).toBe('udeblevet');
  });

  test('en ny bestilling fra et nummer med udeblivelser får et mærke', async ({ page }) => {
    const data = grunddata({
      bestillinger: [
        bestilling({ id: 1, reference: 'SM260801-GAMLE', hent_dato: '2026-08-01',
          status: 'udeblevet' }),
        bestilling({ id: 2, reference: 'SM260807-NYEST', status: 'ny' }),
      ],
    });
    await åbnAdmin(page, { data });
    await åbnFane(page, 'p-bestillinger');

    /* Mærket står på den NYE — oplysningen skal ses, FØR maden
       laves. På den udeblevne selv er det bagklogskab. */
    const nyt = page.locator('.bestil-kort', { hasText: 'SM260807-NYEST' });
    await expect(nyt.locator('.maerke.gaenger')).toHaveText('Udeblevet 1 gang');
    const gammel = page.locator('.bestil-kort', { hasText: 'SM260801-GAMLE' });
    await expect(gammel.locator('.maerke.gaenger')).toHaveCount(0);
  });

  test('salget tæller udeblivelser for sig, og de tæller ikke som omsætning', async ({ page }) => {
    const data = grunddata({
      bestillinger: [
        bestilling({ id: 1, reference: 'SM260807-HENTA', status: 'afhentet' }),
        bestilling({ id: 2, reference: 'SM260807-VAEKK', status: 'udeblevet',
          linjer: [{ navn: 'Stegt flæsk', antal: 1, pris: 95 }], antal: 1 }),
      ],
    });
    await åbnAdmin(page, { data });
    await åbnFane(page, 'p-salg');

    /* 2 × 55 = 110 fra den afhentede. Var den udeblevne talt med,
       stod der 205 — og det er præcis det tal, der IKKE må stå. */
    await expect(page.locator('#salg-tal')).toContainText('110');
    await expect(page.locator('#salg-tal')).not.toContainText('205');
    await expect(page.locator('#salg-udeblivelser')).toContainText('Udeblivelser');
    await expect(page.locator('#salg-udeblivelser .tal-tal')).toHaveText('1');
  });

  test('gænger-listen viser kun numre med flere udeblivelser', async ({ page }) => {
    const data = grunddata({
      bestillinger: [
        bestilling({ id: 1, reference: 'SM260801-EEN01', hent_dato: '2026-08-01',
          status: 'udeblevet' }),
        bestilling({ id: 2, reference: 'SM260803-EEN02', hent_dato: '2026-08-03',
          status: 'udeblevet' }),
        /* Ét enkelt uheld fra et andet nummer — det skal IKKE på
           listen. Et opslag over folks enkeltuheld er en gabestok,
           ikke et værktøj. */
        bestilling({ id: 3, reference: 'SM260804-UHELD', hent_dato: '2026-08-04',
          telefon: '30405060', status: 'udeblevet' }),
      ],
    });
    await åbnAdmin(page, { data });
    await åbnFane(page, 'p-salg');

    await expect(page.locator('#salg-udeblivelser')).toContainText('20304050');
    await expect(page.locator('#salg-udeblivelser')).toContainText('2 gange');
    await expect(page.locator('#salg-udeblivelser')).not.toContainText('30405060');
  });
});

test.describe('Vagthunden', () => {

  test('en besked skrevet som dagens ret bliver stoppet af et spørgsmål', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-forside');

    let spurgt = null;
    page.once('dialog', (d) => { spurgt = d.message(); return d.dismiss(); });

    await page.locator('#dagens-navn').fill('Lukket i dag');
    await page.locator('#gem-dagens').click();

    /* Spørgsmålet kom, personalet fortrød — og der er IKKE gemt
       en "ret", gæsterne kan bestille. */
    expect(spurgt, 'vagthunden spurgte ikke').toContain('ligner en BESKED');
    const d = await gemteData(page);
    expect(((d.indstillinger || {}).dagens_ret || {}).navn || '').toBe('');
  });

  test('siger personalet ja, gemmes den alligevel', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-forside');

    page.on('dialog', (d) => d.accept());
    await page.locator('#dagens-navn').fill('Lukket landgang');
    await page.locator('#gem-dagens').click();

    await expect(page.locator('#kvittering')).toContainText('forsiden');
    const d = await gemteData(page);
    expect(d.indstillinger.dagens_ret.navn).toBe('Lukket landgang');
  });

  test('en almindelig ret går igennem uden spørgsmål', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-forside');

    let dialoger = 0;
    page.on('dialog', (d) => { dialoger += 1; return d.accept(); });

    await page.locator('#dagens-navn').fill('Stegt flæsk med persillesovs');
    await page.locator('#gem-dagens').click();

    await expect(page.locator('#kvittering')).toContainText('forsiden');
    expect(dialoger, 'vagthunden gøede ad en almindelig ret').toBe(0);
  });
});


/* ==================== SKÆRMEN STÅR STILLE =====================

   Briefens punkt 1 (23/8): frisk.js henter hvert minut, og før
   fingeraftrykket tegnede HVER hentning alle faner om — skærmen
   hoppede 59 gange i timen med ingenting. Målingen her er på
   NODE-IDENTITET: står det samme DOM-element der efter en
   hentning uden ændringer, blev der ikke tegnet om. */
test.describe('Admin blinker ikke', () => {

  test('en hentning uden ændringer tegner ingenting om', async ({ page }) => {
    /* Markøren er nyheds-listen: den GENOPBYGGES af tegnerne, så
       node-identiteten afslører en omtegning. Salg-tallene kunne
       ikke bruges — de tegnes af deres egen hentning, ikke af
       tegnerne, og målingen dér kunne aldrig fejle. */
    const data = grunddata({
      nyheder: [{ id: 1, titel: 'Stille nyhed', tekst: 'Tekst',
        dato: '2026-08-06', aktiv: true }],
    });
    await åbnAdmin(page, { data });
    await åbnFane(page, 'p-nyheder');
    await expect(page.locator('#nyheder-liste')).toContainText('Stille nyhed');

    /* Loginet har sin egen genindlæsning i luften — fanges
       markøren, før den er landet, tegner DEN om, og prøven
       fælder fingeraftrykket for et kapløb, det ikke er skyld i.
       Én gennemløbet genindlæsning FØR markøren lader støvet
       lægge sig. */
    const uaendret = await page.evaluate(async () => {
      await Admin.genindlæs();
      const foer = document.getElementById('nyheder-liste').firstElementChild;
      await Admin.genindlæs();
      await Admin.genindlæs();
      return foer === document.getElementById('nyheder-liste').firstElementChild;
    });
    expect(uaendret, 'skærmen tegnede om, uden at noget var ændret').toBe(true);
  });

  test('en ændring tegner stadig om', async ({ page }) => {
    /* Fingeraftrykket må ikke blive en prop: ændrer dataene sig,
       SKAL der tegnes. Ellers står personalet og kigger på en
       gammel skærm, der føles frisk. */
    const data = grunddata({
      nyheder: [{ id: 1, titel: 'Stille nyhed', tekst: 'Tekst',
        dato: '2026-08-06', aktiv: true }],
    });
    await åbnAdmin(page, { data });
    await åbnFane(page, 'p-nyheder');
    await expect(page.locator('#nyheder-liste')).toContainText('Stille nyhed');

    const tegnedeOm = await page.evaluate(async ([noegle]) => {
      const foer = document.getElementById('nyheder-liste').firstElementChild;
      const g = JSON.parse(localStorage.getItem(noegle));
      g.nyheder.push({ id: 99, titel: 'Helt ny', tekst: 'Ny',
        dato: '2026-08-07', aktiv: true });
      localStorage.setItem(noegle, JSON.stringify(g));
      await Admin.genindlæs();
      return foer !== document.getElementById('nyheder-liste').firstElementChild;
    }, [NØGLE]);
    expect(tegnedeOm, 'en ændring i dataene tegnede ikke om').toBe(true);
    await expect(page.locator('#nyheder-liste')).toContainText('Helt ny');
  });

  test('en ny bestilling glider ind og lyser op', async ({ page }) => {
    const data = grunddata({
      bestillinger: [{
        id: 1, lokation_id: 'mosede', reference: 'SM260806-FOER1',
        navn: 'Anna Hansen', telefon: '20304050', hent_dato: '2026-08-07',
        hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
        fyld: [], antal: 2, status: 'ny', intern_note: null,
        oprettet: '2026-08-07T09:30:00Z',
      }],
    });
    await åbnAdmin(page, { data });
    await åbnFane(page, 'p-bestillinger');
    await expect(page.locator('.bestil-kort')).toHaveCount(1);

    await page.evaluate(([noegle]) => {
      const g = JSON.parse(localStorage.getItem(noegle));
      g.bestillinger.push({
        id: 2, lokation_id: 'mosede', reference: 'SM260807-NYNY2',
        navn: 'Bo Jensen', telefon: '30405060', hent_dato: '2026-08-07',
        hent_tid: '13:00', linjer: [{ navn: 'Smørrebrød', antal: 1, pris: 55 }],
        fyld: [], antal: 1, status: 'ny', intern_note: null,
        oprettet: '2026-08-07T10:30:00Z',
      });
      localStorage.setItem(noegle, JSON.stringify(g));
      return Promise.all(Admin.friske.map((hent) => hent()));
    }, [NØGLE]);

    await expect(page.locator('.bestil-kort')).toHaveCount(2);
    // Den NYE lyser op — den gamle gør ikke
    await expect(page.locator('.bestil-kort[data-id="2"]')).toHaveClass(/linje-ny/);
    await expect(page.locator('.bestil-kort[data-id="1"]')).not.toHaveClass(/linje-ny/);
  });

  /* BRIEFENS PUNKT 1, DELPUNKT 2: "indsæt rækken, byg ikke listen
     om". Grunden, briefen giver, er den her — og den er dyrere end
     et hop på skærmen.

     Noten gemmes ved 'change', altså når feltet FORLADES. Tegnes
     kortet om, mens nogen skriver i det, bliver feltet skiftet ud
     under fingrene: den halve sætning er væk, ingen 'change' nåede
     at fyre, og der kommer ingen fejl. Personalet opdager det
     først, når de leder efter noten, de er sikre på at have
     skrevet.

     Det sker præcis, når det er værst: midt i en travl vagt, hvor
     der lander en bestilling hvert andet minut. */
  test('en note, der bliver skrevet, overlever at der lander en bestilling', async ({ page }) => {
    const data = grunddata({
      bestillinger: [{
        id: 1, lokation_id: 'mosede', reference: 'SM260806-FOER1',
        navn: 'Anna Hansen', telefon: '20304050', hent_dato: '2026-08-07',
        hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
        fyld: [], antal: 2, status: 'ny', intern_note: null,
        oprettet: '2026-08-07T09:30:00Z',
      }],
    });
    await åbnAdmin(page, { data });
    await åbnFane(page, 'p-bestillinger');

    const note = page.locator('#note-1');
    await note.click();
    await note.type('ringet, hun kommer 12.30');

    await page.evaluate(([noegle]) => {
      const g = JSON.parse(localStorage.getItem(noegle));
      g.bestillinger.push({
        id: 2, lokation_id: 'mosede', reference: 'SM260807-NYNY2',
        navn: 'Bo Jensen', telefon: '30405060', hent_dato: '2026-08-07',
        hent_tid: '13:00', linjer: [{ navn: 'Smørrebrød', antal: 1, pris: 55 }],
        fyld: [], antal: 1, status: 'ny', intern_note: null,
        oprettet: '2026-08-07T10:30:00Z',
      });
      localStorage.setItem(noegle, JSON.stringify(g));
      return Promise.all(Admin.friske.map((hent) => hent()));
    }, [NØGLE]);

    await expect(page.locator('.bestil-kort')).toHaveCount(2);

    /* Teksten skal stå der endnu ... */
    await expect(note, 'personalets halve note blev tegnet væk')
      .toHaveValue('ringet, hun kommer 12.30');

    /* ... og markøren skal stå i feltet, hvor den var. Ellers
       skriver den næste bogstav ud i ingenting. */
    const stadigIFeltet = await page.evaluate(() => ({
      fokus: document.activeElement && document.activeElement.id,
      markør: document.activeElement && document.activeElement.selectionStart,
    }));
    expect(stadigIFeltet.fokus, 'markøren hoppede ud af noten').toBe('note-1');
    expect(stadigIFeltet.markør, 'markøren sprang til en anden plads i teksten')
      .toBe('ringet, hun kommer 12.30'.length);

    /* OG DEN MÅ IKKE VÆRE GEMT BAG RYGGEN PÅ DEM. Det var, hvad
       målingen viste i Chromium: browseren fyrer et 'change', når
       et felt, der er skrevet i, rives ud af siden — så blev den
       halve sætning gemt, med en kvittering ingen bad om og en
       linje i logbogen. Noten gemmes, når feltet FORLADES, ikke
       fordi en anden bestilling landede. */
    const undervejs = await gemteData(page);
    expect(undervejs.bestillinger.find((b) => b.id === 1).intern_note,
      'den halve note blev gemt af sig selv').toBeFalsy();

    /* Den normale vej skal stadig virke. */
    await page.locator('#note-1').press('Tab');
    await expect(page.locator('#kvittering')).toContainText('gemt');
    const bagefter = await gemteData(page);
    expect(bagefter.bestillinger.find((b) => b.id === 1).intern_note)
      .toBe('ringet, hun kommer 12.30');
  });

  /* Den modsatte fejl: bevarelsen må ikke blive en prop, der
     holder på en gammel værdi i et felt, ingen står i. Rører man
     ikke skærmen, skal en note fra en ANDEN enhed slå igennem. */
  test('en note fra en anden enhed slår igennem, når ingen skriver', async ({ page }) => {
    const data = grunddata({
      bestillinger: [{
        id: 1, lokation_id: 'mosede', reference: 'SM260806-FOER1',
        navn: 'Anna Hansen', telefon: '20304050', hent_dato: '2026-08-07',
        hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
        fyld: [], antal: 2, status: 'ny', intern_note: null,
        oprettet: '2026-08-07T09:30:00Z',
      }],
    });
    await åbnAdmin(page, { data });
    await åbnFane(page, 'p-bestillinger');
    await expect(page.locator('#note-1')).toHaveValue('');

    await page.evaluate(([noegle]) => {
      const g = JSON.parse(localStorage.getItem(noegle));
      g.bestillinger[0].intern_note = 'skrevet på iPad\'en i køkkenet';
      localStorage.setItem(noegle, JSON.stringify(g));
      return Promise.all(Admin.friske.map((hent) => hent()));
    }, [NØGLE]);

    await expect(page.locator('#note-1')).toHaveValue('skrevet på iPad\'en i køkkenet');
  });
});

/* ==================== EJERENS KONTAKT =========================

   Grundprincippet — bestillingen er accepteret, telefonen er
   nødudgangen — er ejerens beslutning, og den bor som en kontakt
   i admin.

   TIL som standard siden 23/8. Kundens ord: "fjern det med ring og
   bekræft. De skal nok ringe og afbekræfte, hvis de ikke kan. Alt
   skal kunne administreres — ikke noget med ring; man får deres
   oplysninger til netop sådan noget." */
test.describe('Kontakten til automatisk bekræftelse', () => {

  test('kontakten er TIL som standard og kan slås fra', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-bestillinger');

    const felt = page.locator('#auto-bekraeft');
    await expect(felt).toBeChecked();

    await felt.uncheck();
    await expect(page.locator('#kvittering')).toContainText('opkald');
    const d = await gemteData(page);
    expect(d.indstillinger.auto_bekraeft).toBe(false);
  });
});

/* ================= SKÆRMEN HOLDER SIG SELV FRISK ==============

   Kundens ord (22/8): "alle Hent på ny inde i admin væk, alt skal
   være instant, responsivt, snakke med hinanden og live opdatere."

   Der stod seks af dem, og de gjorde det, skærmen allerede havde
   gjort: den direkte forbindelse (js/admin/live.js), pushen og
   takten (js/admin/frisk.js) henter af sig selv. En knap, der
   gentager noget, systemet allerede gør, lærer personalet at
   mistro systemet — og så trykker de på den hver gang.

   Tre påstande, og alle tre skal holde. "Knappen er væk" alene er
   en fælde: den er nem at opfylde ved at slette knappen og lade
   fanen stå med gamle tal. */
test.describe('Admin har ingen Hent på ny', () => {

  test('ingen af fanerne har en genindlæs-knap', async ({ page }) => {
    await åbnAdmin(page);
    const knapper = page.locator('button, a').filter({ hasText: /hent på ny/i });
    await expect(knapper, 'der er stadig en "Hent på ny"-knap i admin').toHaveCount(0);
    // …og ingen af de gamle id'er er blevet stående som en tom skal
    for (const id of ['bestil-genindlaes', 'foresp-genindlaes', 'borde-genindlaes',
      'lokale-genindlaes', 'skrald-genindlaes', 'logbog-genindlaes']) {
      await expect(page.locator('#' + id), `#${id} findes stadig`).toHaveCount(0);
    }
  });

  /* Det, der står i stedet, skal SIGE at listen er levende.
     Uden linjen ser en liste, der opdaterer sig selv, præcis ud
     som en liste, der er gået i stå — og så leder personalet
     efter knappen, vi lige har fjernet. */
  test('i stedet står der, at listen opdaterer sig selv', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-bestillinger');

    const maerke = page.locator('#p-bestillinger .live-maerke');
    await expect(maerke).toBeVisible();
    await expect(maerke).toContainText('opdaterer sig selv');
    // Klokkeslættet er beviset. Uden det er linjen bare en påstand.
    await expect(page.locator('#bestil-hentet')).toContainText(/Opdateret kl\. \d\d\.\d\d/);
  });

  /* FANER, DER IKKE HENTES HVERT MINUT, SKAL HENTES NÅR DE ÅBNES.

     Skraldespanden, logbogen og salget står ikke i Admin.friske:
     de ændrer sig kun, når personalet selv gør noget, og et kald i
     minuttet for en fane, ingen kigger på, er et kald for meget.
     Til gengæld SKAL de være friske i det sekund, fanen åbnes —
     ellers er "Hent på ny" fjernet uden at være erstattet.

     Prøven skriver noget nyt i lageret, mens fanen er lukket, og
     åbner den så. Står det der, har faneskiftet hentet. */
  test('skraldespanden og logbogen hentes, når fanen åbnes', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-tider');          // et andet sted end historikken

    await page.evaluate(([noegle]) => {
      const g = JSON.parse(localStorage.getItem(noegle));
      /* Skraldespanden er ikke sin egen tabel: den er de rækker,
         der har et slettet-stempel. Se SKRALD_TABELLER i
         js/store.js. */
      g.bestillinger = [{
        id: 91, lokation_id: 'mosede', reference: 'SM260807-SPAND',
        navn: 'Spand Spandesen', telefon: '20304050',
        hent_dato: '2026-08-07', hent_tid: '12:00',
        linjer: [{ navn: 'Smørrebrød', antal: 1, pris: 55 }],
        antal: 1, status: 'ny', oprettet: '2026-08-07T09:00:00Z',
        slettet: '2026-08-07T10:00:00Z', slettet_af: 'test@lesreg.dk',
      }];
      g.logbog = [{
        id: 92, lokation_id: 'mosede', hvem: 'proeve@lesreg.dk',
        hvad: 'rettet', tabel: 'menu_varer', navn: 'Prøvelinje i logbogen',
        foer: {}, efter: {}, hvornaar: '2026-08-07T10:00:00Z',
      }];
      localStorage.setItem(noegle, JSON.stringify(g));
    }, [NØGLE]);

    // Intet er hentet endnu — fanen har ikke været åbnet
    await åbnFane(page, 'p-historik');

    await expect(page.locator('#skrald-liste'),
      'skraldespanden blev ikke hentet, da fanen blev åbnet')
      .toContainText('Spand Spandesen');
    await expect(page.locator('#logbog-liste'),
      'logbogen blev ikke hentet, da fanen blev åbnet')
      .toContainText('proeve@lesreg.dk');
  });

  /* De to deler panelet p-historik. Med ét felt pr. fane i stedet
     for en liste ville den ene fil overskrive den anden, og den,
     der blev indlæst sidst, ville vinde. Prøven ovenfor fanger
     det — men kun fordi den måler BEGGE lister. */
  test('salget hentes også, når dets egen fane åbnes', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-tider');

    await page.evaluate(([noegle]) => {
      const g = JSON.parse(localStorage.getItem(noegle));
      g.bestillinger = [{
        id: 93, lokation_id: 'mosede', reference: 'SM260807-SALG',
        navn: 'Solgt Solgtesen', telefon: '20304050',
        hent_dato: '2026-08-07', hent_tid: '12:00',
        linjer: [{ navn: 'Flæskestegssandwich', antal: 2, pris: 89 }],
        antal: 2, status: 'afhentet', oprettet: '2026-08-07T09:00:00Z',
      }];
      localStorage.setItem(noegle, JSON.stringify(g));
    }, [NØGLE]);

    await åbnFane(page, 'p-salg');
    await expect(page.locator('#salg-varer'),
      'salget blev ikke hentet, da fanen blev åbnet')
      .toContainText('Flæskestegssandwich');
  });
});

/* ========= ADMIN SIGER, HVORFOR BANNERET IKKE ER DER =========

   Kunden savnede livemusik-banneret på forsiden (22/8): "det var
   flot og gav lidt". Banneret var der ikke, fordi kalenderen var
   tom — js/side.js viser det NÆSTE offentlige arrangement, og der
   var ingen. Der var ikke noget i vejen med koden.

   Vi opfinder ikke et arrangement for at fylde en plads ud. Men
   admin skal sige, HVORFOR pladsen er tom, i stedet for at lade
   ejeren lede efter en fejl, der ikke findes. */
test.describe('Kalenderen forklarer det manglende banner', () => {

  test('uden kommende arrangement står der, at banneret mangler', async ({ page }) => {
    await åbnAdmin(page);
    await åbnFane(page, 'p-kalender');
    await expect(page.locator('#kalender-liste'))
      .toContainText('arrangement-banneret på forsiden heller ikke der');
  });

  /* En lukkedag er OGSÅ en kalenderrække, og den bliver aldrig et
     banner. Uden filteret på type ville en vinterlukning slukke
     beskeden, og så stod ejeren med en tom bannerplads og en
     admin, der sagde alt var i orden. */
  test('en lukkedag tæller ikke som et arrangement', async ({ page }) => {
    const d = grunddata({
      kalender: [{ id: 1, lokation_id: 'mosede', type: 'lukkedag',
        dato: '2026-08-20', slut_dato: null, titel: 'Ferie',
        beskrivelse: null, emoji: null, offentlig: true }],
    });
    await åbnAdmin(page, { data: d });
    await åbnFane(page, 'p-kalender');
    await expect(page.locator('#kalender-liste'))
      .toContainText('Der står intet kommende arrangement');
  });

  /* Og et INTERNT arrangement er personalets egen note. Det når
     aldrig ud på forsiden, så beskeden skal blive stående. */
  test('et internt arrangement tæller heller ikke', async ({ page }) => {
    const d = grunddata({
      kalender: [{ id: 1, lokation_id: 'mosede', type: 'arrangement',
        dato: '2026-08-20', slut_dato: null, titel: 'Personalemøde',
        beskrivelse: null, emoji: null, offentlig: false }],
    });
    await åbnAdmin(page, { data: d });
    await åbnFane(page, 'p-kalender');
    await expect(page.locator('#kalender-liste'))
      .toContainText('Der står intet kommende arrangement');
  });

  test('med et offentligt arrangement er beskeden væk', async ({ page }) => {
    test.skip(true, 'forsiden er skiftet ud (23/8) — genoprettes mod den nye forside i systemfasen, se tests-gamle/README.md');
    const d = grunddata({
      kalender: [{ id: 1, lokation_id: 'mosede', type: 'arrangement',
        dato: '2026-08-20', slut_dato: null, titel: 'Live musik på molen',
        beskrivelse: 'Grillen er tændt.', emoji: null, offentlig: true }],
    });
    await åbnAdmin(page, { data: d });
    await åbnFane(page, 'p-kalender');
    await expect(page.locator('#kalender-liste'))
      .not.toContainText('arrangement-banneret på forsiden heller ikke der');

    // …og så STÅR banneret på forsiden
    await åbn(page, '/index.html', { data: d });
    await expect(page.locator('#bannere .bn.musik')).toContainText('Live musik på molen');
  });
});
