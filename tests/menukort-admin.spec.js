/* KAN MENUKORTET ADMINISTRERES ORDENTLIGT?

   Kundens spørgsmål (23/8), og svaret var nej på tre punkter. De
   var alle tre usynlige i koden, fordi fanen SÅ færdig ud:

   1) BESKRIVELSEN kunne ikke rettes. Den blev sendt uændret med
      hver gang varen blev gemt, så den ene sætning, der sælger
      retten, kunne kun skrives i SQL.
   2) RÆKKEFØLGEN kunne ikke ændres. Kolonnen sortering sættes ved
      oprettelsen, og en ny ret lå nederst for evigt.
   3) KATEGORIER kunne kun oprettes i setup.sql. Fanen skrev det
      endda højt — et svar til en udvikler, ikke til en ejer, der
      gerne vil have en afdeling, der hedder "Vinterretter".

   Ingen af delene krævede noget nyt i databasen: adgangsreglerne
   i flerlejer.sql har givet admin lov til at oprette, rette og
   slette i menu_kategorier og menu_varer hele tiden. Der manglede
   en vej derhen fra skærmen.

   Hver prøve her måler både HANDLINGEN i admin og det, gæsten
   ser bagefter. En rettelse, der bliver i admin, er ingen
   rettelse. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

async function åbnMenufanen(page, valg) {
  await åbnAdmin(page, valg);
  await page.locator('[data-panel="p-menu"]').click();
  await page.waitForSelector('.kat-hoved');
}

/* VÆLG PÅ ID OG IKKE PÅ NAVN.

   Første udgave af filen her brugte { hasText: 'Flæskestegssandwich' },
   og hver eneste prøve løb tør for tid. Grunden er, at navnet i
   admin står i et <input value="...">, og et felts værdi er ikke
   tekst på siden — hasText kan ikke se den. Derfor bærer rækkerne
   data-vare og grupperne data-kategori. Grunddatas id'er:
   1 = Flæskestegssandwich, 9 = Øl, 12 = fyldkategorien. */
const vare = (page, id) => page.locator(`.vare-raekke[data-vare="${id}"]`);
const gruppe = (page, id) => page.locator(`.menu-gruppe[data-kategori="${id}"]`);

/* ⚠️ FAVORIT, VIS, PILENE OG GEM LIGGER BAG ⋯ (26/8).

   Kundens billeder har seks ting på rækken: navn, beskrivelse,
   pris, få tilbage, Udsolgt? og ✕. De fire andre er vores egne og
   ændres et par gange om året — med alle ti på rækken passede den
   kun på en skærm bredere end 1400 px, og med 242 varer er to
   linjer pr. række dobbelt så langt at rulle.

   Prøverne går den vej, et menneske går: åbn rækken først. */
async function åbnMereFor(r) {
  if (await r.locator('.vare-bag.skjult').count()) await r.locator('.mere-knap').click();
  return r;
}
async function åbnMere(page, id) { return åbnMereFor(vare(page, id)); }

test.describe('Beskrivelsen kan rettes', () => {

  test('teksten under varenavnet skrives i admin og lander på menukortet',
    async ({ page }) => {
      await åbnMenufanen(page);

      const række = vare(page, 1);
      await række.locator('.vare-tekst-felt').fill('Med rødkål fra egen gryde.');
      await (await åbnMere(page, 1)).locator('button', { hasText: 'Gem' }).click();
      await expect(page.locator('#kvittering')).toContainText('gemt');

      const gemt = await gemteData(page);
      const v = gemt.menu_varer.filter((x) => x.navn === 'Flæskestegssandwich')[0];
      expect(v.beskrivelse).toBe('Med rødkål fra egen gryde.');

      // …og gæsten kan læse den
      await åbn(page, '/menu.html', { data: gemt });
      await expect(page.locator('#menu-liste')).toContainText('Med rødkål fra egen gryde.');
    });

  test('feltet står med den tekst, der allerede er skrevet', async ({ page }) => {
    /* Uden det ville den, der retter prisen, slette beskrivelsen
       ved at gemme — feltet ville være tomt, og tomt bliver til
       null. Det er den dyreste slags fejl i et redigeringsfelt. */
    await åbnMenufanen(page);
    const række = vare(page, 1);
    await expect(række.locator('.vare-tekst-felt'))
      .toHaveValue('Sprød flæskesteg, rødkål og agurkesalat.');
  });

  test('en beskrivelse overlever, at prisen rettes', async ({ page }) => {
    await åbnMenufanen(page);
    const række = vare(page, 1);
    await række.locator('.smal').fill('95');
    await (await åbnMereFor(række)).locator('button', { hasText: 'Gem' }).click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const gemt = await gemteData(page);
    const v = gemt.menu_varer.filter((x) => x.navn === 'Flæskestegssandwich')[0];
    expect(v.pris).toBe(95);
    expect(v.beskrivelse, 'beskrivelsen blev slettet af en prisrettelse')
      .toBe('Sprød flæskesteg, rødkål og agurkesalat.');
  });
});

test.describe('Rækkefølgen kan ændres', () => {

  /* Grunddata har to varer i fyldkategorien. Den anden flyttes op,
     og menukortet skal vise dem i den nye orden. */
  test('en vare kan flyttes op, og menukortet følger med', async ({ page }) => {
    await åbnMenufanen(page);

    const fyld = gruppe(page, 12);
    const navne = await fyld.locator('.vare-raekke .navn').evaluateAll(
      (es) => es.map((e) => e.value));
    expect(navne.length, 'der er ikke to varer at bytte om på')
      .toBeGreaterThanOrEqual(2);

    await (await åbnMereFor(fyld.locator('.vare-raekke').nth(1)))
      .getByRole('button', { name: /Flyt op/ }).click();
    await expect(page.locator('#kvittering')).toContainText('flyttet');

    const gemt = await gemteData(page);
    await åbn(page, '/menu.html', { data: gemt });
    await page.locator('#kat-stier a', { hasText: 'Vælg fyld' }).click();

    const påSiden = await page.locator('#menu-liste .kat').nth(1)
      .locator('.valg-en').allInnerTexts();
    expect(påSiden[0].trim(), 'rækkefølgen på menukortet fulgte ikke med')
      .toBe(navne[1]);
  });

  test('den øverste kan ikke flyttes op, den nederste ikke ned', async ({ page }) => {
    /* En pil, der ikke gør noget, er værre end ingen pil: man
       trykker, der sker ingenting, og man tror, siden er i
       stykker. */
    await åbnMenufanen(page);
    const fyld = gruppe(page, 12);
    const rækker = fyld.locator('.vare-raekke');
    const antal = await rækker.count();

    await åbnMereFor(rækker.first());
    await åbnMereFor(rækker.nth(antal - 1));
    await expect(rækker.first().getByRole('button', { name: /Flyt op/ })).toBeDisabled();
    await expect(rækker.nth(antal - 1).getByRole('button', { name: /Flyt ned/ }))
      .toBeDisabled();
  });

  /* To rækker, der er oprettet i SQL, har begge sortering 0. Bytter
     man to ens tal, sker der ingenting — og prøven her er hele
     grunden til, at byt() giver dem to nye tal. */
  test('to varer med samme sortering kan stadig bytte plads', async ({ page }) => {
    const d = grunddata();
    d.menu_varer = d.menu_varer.map((v) => (
      v.kategori_id === 12 ? { ...v, sortering: 0 } : v
    ));
    await åbnMenufanen(page, { data: d });

    const fyld = gruppe(page, 12);
    const før = await fyld.locator('.vare-raekke .navn').evaluateAll(
      (es) => es.map((e) => e.value));

    await (await åbnMereFor(fyld.locator('.vare-raekke').nth(1)))
      .getByRole('button', { name: /Flyt op/ }).click();
    await expect(page.locator('#kvittering')).toContainText('flyttet');

    const gemt = await gemteData(page);
    const ifyld = gemt.menu_varer
      .filter((v) => v.kategori_id === 12)
      .sort((a, b) => (a.sortering || 0) - (b.sortering || 0));
    expect(ifyld[0].navn, 'de to har stadig samme tal, og intet flyttede sig')
      .toBe(før[1]);
  });

  test('en hel kategori kan flyttes op', async ({ page }) => {
    await åbnMenufanen(page);
    const navneFør = await page.locator('.kat-hoved .navn').evaluateAll(
      (es) => es.map((e) => e.value));

    await page.locator('.menu-gruppe').nth(1)
      .locator('.kat-hoved').getByRole('button', { name: /Flyt op/ }).click();
    await expect(page.locator('#kvittering')).toContainText('flyttet');

    const navneEfter = await page.locator('.kat-hoved .navn').evaluateAll(
      (es) => es.map((e) => e.value));
    expect(navneEfter[0]).toBe(navneFør[1]);
  });
});

test.describe('Kategorier kan oprettes og rettes', () => {

  test('en ny kategori bliver oprettet og står på menukortet', async ({ page }) => {
    await åbnMenufanen(page);

    await page.locator('#ny-kategori-navn').fill('Vinterretter');
    await page.locator('#ny-kategori-afd').selectOption('mad');
    await page.locator('.ny-kategori button', { hasText: 'Tilføj kategori' }).click();
    await expect(page.locator('#kvittering')).toContainText('oprettet');

    const gemt = await gemteData(page);
    const ny = gemt.menu_kategorier.filter((k) => k.navn === 'Vinterretter')[0];
    expect(ny, 'kategorien blev ikke oprettet').toBeTruthy();
    expect(ny.afdeling).toBe('mad');

    /* Den står SIDST. En ny kategori, der lander øverst, skubber
       forretningens vigtigste mad ned under en tom overskrift. */
    const alle = gemt.menu_kategorier
      .filter((k) => k.afdeling === 'mad')
      .sort((a, b) => (a.sortering || 0) - (b.sortering || 0));
    expect(alle[alle.length - 1].navn).toBe('Vinterretter');
  });

  test('en kategori kan omdøbes og skifte afdeling', async ({ page }) => {
    await åbnMenufanen(page);

    const hoved = gruppe(page, 9).locator('.kat-hoved');
    await hoved.locator('.navn').fill('Fadøl og vand');
    await hoved.locator('.smal-vaelger').selectOption('drikke');
    await hoved.locator('button', { hasText: 'Gem' }).click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const gemt = await gemteData(page);
    const k = gemt.menu_kategorier.filter((x) => x.id === 9)[0];
    expect(k.navn).toBe('Fadøl og vand');
    expect(k.afdeling).toBe('drikke');

    await åbn(page, '/menu.html', { data: gemt });
    await page.locator('#afd-drikke').click();
    await expect(page.locator('#menu-liste')).toContainText('Fadøl og vand');
  });

  /* SLET STÅR KUN PÅ EN TOM KATEGORI. Databasen sletter varerne med
     (on delete cascade), og ét tryk må ikke kunne tage 29 varer med
     sig — heller ikke med en bekræftelse, for den læser ingen. */
  test('slet findes ikke på en kategori med varer i', async ({ page }) => {
    await åbnMenufanen(page);
    const medVarer = gruppe(page, 1).locator('.kat-hoved');
    await expect(medVarer.locator('button', { hasText: 'Slet' })).toHaveCount(0);
  });

  test('en tom kategori kan slettes', async ({ page }) => {
    const d = grunddata();
    d.menu_kategorier = d.menu_kategorier.concat([
      { id: 40, afdeling: 'mad', navn: 'Tom afdeling', sortering: 30, aktiv: true },
    ]);
    await åbnMenufanen(page, { data: d });

    page.once('dialog', (dlg) => dlg.accept());
    await gruppe(page, 40).locator('button', { hasText: 'Slet' }).click();
    await expect(page.locator('#kvittering')).toContainText('slettet');

    const gemt = await gemteData(page);
    expect(gemt.menu_kategorier.filter((k) => k.id === 40)).toHaveLength(0);
  });

  test('en kategori uden navn bliver afvist', async ({ page }) => {
    await åbnMenufanen(page);
    await page.locator('#ny-kategori-navn').fill('   ');
    await page.locator('.ny-kategori button', { hasText: 'Tilføj kategori' }).click();
    await expect(page.locator('#fejl')).toBeVisible();

    const gemt = await gemteData(page);
    expect(gemt.menu_kategorier).toHaveLength(4);
  });

  /* Fanen sagde "De oprettes i setup.sql", når der ikke var nogen.
     Det er et svar til en udvikler. Nu er der en vej videre på
     skærmen. */
  test('en tom database peger på feltet og ikke på en SQL-fil', async ({ page }) => {
    const d = grunddata({ menu_kategorier: [], menu_varer: [] });
    await åbnAdmin(page, { data: d });
    await page.locator('[data-panel="p-menu"]').click();
    await page.waitForSelector('#ny-kategori-navn');

    const tekst = await page.locator('#menu-redigering').innerText();
    expect(tekst).not.toContain('setup.sql');
    await expect(page.locator('#ny-kategori-navn')).toBeVisible();
  });
});

test.describe('Kategoriens note', () => {
  /* Noten gælder HELE kategorien: "På toastbrød eller rugbrød"
     hører til alle tolv slags pindemad. Skrevet på hver vare
     ville den fylde tolv gange og sige det samme.

     Prøven måler hele vejen — feltet i admin, det gemte, og det
     gæsten ser. En rettelse, der bliver i admin, er ingen
     rettelse. */

  test('noten kan skrives i admin og står på kortet bagefter', async ({ page }) => {
    await åbnMenufanen(page, { data: grunddata() });

    const hoved = gruppe(page, 1).locator('.kat-hoved');
    const felt = hoved.locator('.kat-note');
    await expect(felt).toHaveCount(1);
    await expect(felt).toHaveValue('');

    await felt.fill('På toastbrød eller rugbrød');
    await hoved.locator('button', { hasText: 'Gem' }).click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const gemt = await gemteData(page);
    const kat = gemt.menu_kategorier.find((k) => String(k.id) === '1');
    expect(kat.note).toBe('På toastbrød eller rugbrød');
  });

  test('en tom note gemmes som ingenting, ikke som en tom linje', async ({ page }) => {
    /* En tom streng ville tegne en tom linje på menukortet.
       Databasen skelner, og det skal vi også. */
    const d = grunddata();
    d.menu_kategorier[0].note = 'Skal væk igen';
    await åbnMenufanen(page, { data: d });

    const hoved = gruppe(page, 1).locator('.kat-hoved');
    await hoved.locator('.kat-note').fill('   ');
    await hoved.locator('button', { hasText: 'Gem' }).click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const gemt = await gemteData(page);
    expect(gemt.menu_kategorier.find((k) => String(k.id) === '1').note).toBe(null);
  });
});

/* ------------------------------------------------------------
   PRISERNE SKAL KUNNE SKRIVES AF EJEREN SELV
   ------------------------------------------------------------
   Hele sortimentet kom ind i august 2026: 242 varer, og ejerens
   liste havde ikke ét tal i sig. Ingen pris er gættet, så over
   halvdelen af kortet står tomt — og en vare uden pris kan ikke
   bestilles.

   Det er ejerens arbejde at skrive dem. Prøverne her måler de to
   ting, der stod i vejen: at man ikke kunne SE hullerne, og at et
   gem tog det, man havde skrevet andre steder, med sig.
   ------------------------------------------------------------ */
test.describe('Priserne kan skrives af ejeren', () => {

  /* Grunddata: 5 varer, og de to fyld (id 4 og 5) er uden pris. */

  test('tælleren siger, hvor mange der mangler', async ({ page }) => {
    await åbnMenufanen(page, { data: grunddata() });
    await expect(page.locator('#pris-panel')).toContainText('2 af 5 varer mangler en pris');
  });

  test('filteret viser KUN hullerne — og kategorier uden huller forsvinder', async ({ page }) => {
    await åbnMenufanen(page, { data: grunddata() });

    // Før: alle fire kategorier står der.
    await expect(page.locator('.menu-gruppe[data-kategori]')).toHaveCount(4);

    await page.locator('#pris-filter').click();

    /* Kun fyldkategorien har huller. Smørrebrød, is og øl har alle
       en pris og skal være VÆK — en overskrift med ingenting under
       er en kategori, man tror er tom. */
    await expect(page.locator('.menu-gruppe[data-kategori]')).toHaveCount(1);
    await expect(gruppe(page, 12)).toBeVisible();
    await expect(vare(page, 1)).toHaveCount(0);

    await page.locator('#pris-filter').click();
    await expect(page.locator('.menu-gruppe[data-kategori]')).toHaveCount(4);
  });

  test('flere priser skrives og gemmes med ét tryk', async ({ page }) => {
    await åbnMenufanen(page, { data: grunddata() });

    // Knappen er død, indtil der er skrevet noget.
    await expect(page.locator('#gem-alle-priser')).toBeDisabled();

    await vare(page, 4).locator('[data-pris]').fill('38');
    await vare(page, 5).locator('[data-pris]').fill('45,50');

    await expect(page.locator('#pris-panel')).toContainText('2 priser er skrevet, men ikke gemt');
    await page.locator('#gem-alle-priser').click();
    await expect(page.locator('#kvittering')).toContainText('2 priser er gemt');

    const gemt = await gemteData(page);
    expect(gemt.menu_varer.find((v) => v.id === 4).pris).toBe(38);
    expect(gemt.menu_varer.find((v) => v.id === 5).pris).toBe(45.5);

    // Og linjen skal holde op med at love noget, der er sket.
    await expect(page.locator('#pris-panel')).toContainText('Alle 5 varer har en pris');
  });

  /* DEN FEJL, DER GJORDE HELE ØVELSEN NØDVENDIG.

     Admin.gem henter data igen og tegner fanen om (se kerne.js).
     Havde ejeren skrevet ti priser og gemt den ene række, tørrede
     optegningen de ni felter af — uden en fejl, uden en advarsel,
     og uden at det kunne ses andre steder end i mappen, tallene
     var skrevet af fra.

     Prøven er set fejle med den gamle udgave: feltet stod tomt. */
  test('det skrevne overlever, at en ANDEN række bliver gemt', async ({ page }) => {
    await åbnMenufanen(page, { data: grunddata() });

    await vare(page, 5).locator('[data-pris]').fill('45');

    // Et gem et helt andet sted på fanen.
    await vare(page, 1).locator('.navn').fill('Flæskestegssandwich, stor');
    await (await åbnMere(page, 1)).locator('button', { hasText: 'Gem' }).first().click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    await expect(vare(page, 5).locator('[data-pris]')).toHaveValue('45');
    await expect(page.locator('#pris-panel')).toContainText('Én pris er skrevet, men ikke gemt');
  });

  test('Enter i prisfeltet gemmer det hele', async ({ page }) => {
    await åbnMenufanen(page, { data: grunddata() });

    await vare(page, 4).locator('[data-pris]').fill('38');
    await vare(page, 5).locator('[data-pris]').fill('45');
    await vare(page, 5).locator('[data-pris]').press('Enter');

    await expect(page.locator('#kvittering')).toContainText('2 priser er gemt');
    const gemt = await gemteData(page);
    expect(gemt.menu_varer.find((v) => v.id === 4).pris).toBe(38);
  });

  /* HALVDELEN GEMT ER VÆRRE END INGENTING: så ved ingen, hvad der
     står i databasen, og kortet skal læses igennem igen. */
  test('én forkert pris standser hele gemningen', async ({ page }) => {
    await åbnMenufanen(page, { data: grunddata() });

    await vare(page, 4).locator('[data-pris]').fill('38');
    await vare(page, 5).locator('[data-pris]').fill('99999');
    await page.locator('#gem-alle-priser').click();

    await expect(page.locator('#fejl')).toContainText('over 10.000');
    const gemt = await gemteData(page);
    expect(gemt.menu_varer.find((v) => v.id === 4).pris).toBe(null);
  });

  test('et tomt prisfelt er markeret, et udfyldt er ikke', async ({ page }) => {
    await åbnMenufanen(page, { data: grunddata() });

    await expect(vare(page, 4).locator('[data-pris]')).toHaveClass(/mangler/);
    await expect(vare(page, 1).locator('[data-pris]')).not.toHaveClass(/mangler/);
  });
});

test.describe('Genvejen står på hver kategori, der kan bruge den', () => {

  test('en kategori med én vare får den ikke — der er ikke noget at gøre hurtigt', async ({ page }) => {
    await åbnMenufanen(page, { data: grunddata() });
    await expect(gruppe(page, 1).locator('.samle-pris')).toHaveCount(0);
    await expect(gruppe(page, 12).locator('.samle-pris')).toHaveCount(1);
  });

  /* STANDARDEN ER AT UDFYLDE, IKKE AT OVERSKRIVE. Har ejeren
     allerede skrevet en pris på én af dem, er det den ENESTE, nogen
     har bekræftet — og et tryk på genvejen må ikke tage den med. */
  test('genvejen rører ikke de priser, der allerede står der', async ({ page }) => {
    const d = grunddata();
    d.menu_varer.find((v) => v.id === 4).pris = 38;
    await åbnMenufanen(page, { data: d });

    const værktøj = gruppe(page, 12).locator('.samle-pris');
    await expect(værktøj.locator('button')).toHaveText('Sæt på den ene uden pris');

    page.once('dialog', (dia) => dia.accept());
    await page.locator('#samlepris-12').fill('45');
    await værktøj.locator('button').click();
    await expect(page.locator('#kvittering')).toContainText('1 varer');

    const gemt = await gemteData(page);
    expect(gemt.menu_varer.find((v) => v.id === 4).pris).toBe(38);
    expect(gemt.menu_varer.find((v) => v.id === 5).pris).toBe(45);
  });

  test('men de kan overskrives med vilje', async ({ page }) => {
    const d = grunddata();
    d.menu_varer.find((v) => v.id === 4).pris = 38;
    await åbnMenufanen(page, { data: d });

    const værktøj = gruppe(page, 12).locator('.samle-pris');
    await værktøj.locator('input[type="checkbox"]').check();
    await expect(værktøj.locator('button')).toHaveText('Sæt på alle 2');

    page.once('dialog', (dia) => dia.accept());
    await page.locator('#samlepris-12').fill('45');
    await værktøj.locator('button').click();

    const gemt = await gemteData(page);
    expect(gemt.menu_varer.find((v) => v.id === 4).pris).toBe(45);
  });
});

test.describe('Antal og varsel står, hvor priserne skrives', () => {
  /* De to tal står også på fanen Bestillinger, og det er med
     vilje: det er HER, ejeren sidder, når han åbner en kategori
     for bestilling og sætter priser på den. */

  test('de to tal kan sættes fra Menukort-fanen', async ({ page }) => {
    await åbnMenufanen(page, { data: grunddata() });

    await page.locator('#menu-min-stk').fill('4');
    await page.locator('#menu-varsel-timer').fill('48');
    await page.locator('#gem-menu-antal').click();
    await expect(page.locator('#kvittering')).toContainText('mindst 4');

    const gemt = await gemteData(page);
    expect(gemt.indstillinger.bestilling_min_stk).toBe(4);
    expect(gemt.indstillinger.bestilling_varsel_timer).toBe(48);
  });

  test('og fanen Bestillinger viser det samme bagefter', async ({ page }) => {
    /* Det er de SAMME indstillinger, ikke en kopi. Skred de fra
       hinanden, ville ejeren sætte tallet ét sted og se det gamle
       et andet — og ingen af dem ville være til at stole på. */
    await åbnMenufanen(page, { data: grunddata() });
    await page.locator('#menu-min-stk').fill('4');
    await page.locator('#gem-menu-antal').click();
    await expect(page.locator('#kvittering')).toContainText('mindst 4');

    await page.locator('[data-panel="p-bestillinger"]').click();
    await expect(page.locator('#bestil-min-stk')).toHaveValue('4');
  });

  test('et umuligt antal bliver afvist', async ({ page }) => {
    await åbnMenufanen(page, { data: grunddata() });
    await page.locator('#menu-min-stk').fill('0');
    await page.locator('#gem-menu-antal').click();
    await expect(page.locator('#fejl')).toContainText('mellem 1 og 500');
  });
});

/* ============================================================
   ANTAL TILBAGE OG DAGE PR. KATEGORI
   ------------------------------------------------------------
   Kundens billeder (26/8). Begge kolonner kom med
   supabase/menukort-antal-og-dage.sql, og den fil er EJERENS at
   køre.

   ⚠️ DERFOR MÅLER FILEN BEGGE TILSTANDE. Et felt uden en kolonne
   bag sig er værre end intet felt: det ser rigtigt ud, personalet
   skriver "10 tilbage" i det, og gemmet fejler — eller gemte
   ingenting, og køkkenet regnede med et tal, der aldrig blev talt
   ned.
   ============================================================ */

// Grunddata UDEN de nye kolonner — som databasen ser ud, før
// ejeren har kørt filen.
function udenKolonner() {
  const d = grunddata();
  d.menu_varer = d.menu_varer.map((v) => {
    const k = { ...v }; delete k.antal_tilbage; return k;
  });
  d.menu_kategorier = d.menu_kategorier.map((k) => {
    const x = { ...k }; delete x.dage; return x;
  });
  return d;
}

// …og MED dem.
function medKolonner(ændringer) {
  const d = grunddata();
  d.menu_varer = d.menu_varer.map((v) => ({ antal_tilbage: null, ...v }));
  d.menu_kategorier = d.menu_kategorier.map((k) => ({ dage: 'alle', ...k }));
  return Object.assign(d, ændringer || {});
}

test.describe('Felterne findes kun, når kolonnen gør', () => {

  test('uden SQL-filen står der hverken antal eller dagevælger', async ({ page }) => {
    await åbnMenufanen(page, { data: udenKolonner() });
    await expect(page.locator('[data-antal]')).toHaveCount(0);
    await expect(page.locator('[id^="kat-dage-"]')).toHaveCount(0);
    // …men fanen virker stadig
    await expect(page.locator('.vare-raekke')).not.toHaveCount(0);
  });

  test('og et gem virker stadig uden dem', async ({ page }) => {
    await åbnMenufanen(page, { data: udenKolonner() });
    await vare(page, 1).locator('.navn').fill('Flæskestegssandwich, stor');
    await (await åbnMere(page, 1)).locator('button', { hasText: 'Gem' }).first().click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const gemt = await gemteData(page);
    const v = gemt.menu_varer.find((x) => x.id === 1);
    expect(v.navn).toBe('Flæskestegssandwich, stor');
    /* ⚠️ OG KOLONNEN MÅ IKKE VÆRE OPFUNDET UNDERVEJS. Sendte vi
       feltet altid, ville hvert gem fejle i den rigtige database
       med "column antal_tilbage does not exist". */
    expect('antal_tilbage' in v).toBe(false);
  });

  test('med SQL-filen står de der', async ({ page }) => {
    await åbnMenufanen(page, { data: medKolonner() });
    await expect(page.locator('[data-antal]')).not.toHaveCount(0);
    await expect(page.locator('#kat-dage-1')).toHaveCount(1);
  });
});

test.describe('Få tilbage', () => {

  test('tallet kan skrives og gemmes', async ({ page }) => {
    await åbnMenufanen(page, { data: medKolonner() });
    await vare(page, 1).locator('[data-antal]').fill('10');
    await (await åbnMere(page, 1)).locator('button', { hasText: 'Gem' }).first().click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    expect((await gemteData(page)).menu_varer.find((v) => v.id === 1).antal_tilbage).toBe(10);
  });

  /* ⚠️ DEN VIGTIGSTE I AFSNITTET. Databasen tæller ned, mens
     personalet har fanen åben. Sendte et gem på NAVNET morgenens
     tal tilbage, ville en vare, der var talt ned til 2, hoppe op
     på 10 igen — og køkkenet ville love mad, der ikke findes. */
  test('et gem på noget andet skriver ikke morgenens tal tilbage', async ({ page }) => {
    const d = medKolonner();
    d.menu_varer.find((v) => v.id === 1).antal_tilbage = 10;
    await åbnMenufanen(page, { data: d });

    /* ⚠️ DATABASEN TÆLLER NED, MENS FANEN ER ÅBEN. Det er hele
       pointen: bremsen i menukort-antal-og-dage.sql trækker fra
       ved hver bestilling, og skærmen står stadig med morgenens
       tal i feltet.

       Første udgave af prøven satte bare 10 i fixturen og gemte —
       men så stod der 10 i FELTET også, og et gem, der sendte
       feltet med, skrev det samme tal tilbage. Prøven bestod med
       fejlen inde. Her tælles der ned bag om fanen, så de to tal
       er forskellige, og der er noget at måle. */
    await page.evaluate(() => {
      const n = 'mosede_data_v1';
      const d2 = JSON.parse(localStorage.getItem(n));
      d2.menu_varer.find((v) => v.id === 1).antal_tilbage = 2;
      localStorage.setItem(n, JSON.stringify(d2));
    });

    await vare(page, 1).locator('.navn').fill('Flæskestegssandwich, stor');
    await (await åbnMere(page, 1)).locator('button', { hasText: 'Gem' }).first().click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const v = (await gemteData(page)).menu_varer.find((x) => x.id === 1);
    expect(v.navn).toBe('Flæskestegssandwich, stor');
    // 2, ikke 10: køkkenet må ikke love mad, der ikke findes.
    expect(v.antal_tilbage).toBe(2);
  });

  /* Modstykket: RØRER man feltet, skal tallet også gemmes. Uden
     den her måler prøven ovenfor kun, at feltet aldrig virker. */
  test('… men rører man feltet, gemmes det nye tal', async ({ page }) => {
    const d = medKolonner();
    d.menu_varer.find((v) => v.id === 1).antal_tilbage = 10;
    await åbnMenufanen(page, { data: d });

    await vare(page, 1).locator('[data-antal]').fill('2');
    await (await åbnMere(page, 1)).locator('button', { hasText: 'Gem' }).first().click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    expect((await gemteData(page)).menu_varer.find((x) => x.id === 1).antal_tilbage).toBe(2);
  });
});

test.describe('Udsolgt er en knap', () => {

  test('knappen melder varen udsolgt med det samme', async ({ page }) => {
    await åbnMenufanen(page, { data: medKolonner() });
    const knap = vare(page, 1).locator('[data-udsolgt]');
    await expect(knap).toHaveText('Udsolgt?');

    await knap.click();
    await expect(page.locator('#kvittering')).toContainText('udsolgt');
    expect((await gemteData(page)).menu_varer.find((v) => v.id === 1).udsolgt).toBe(true);

    await expect(vare(page, 1).locator('[data-udsolgt]')).toHaveText('UDSOLGT ✕');
    await expect(vare(page, 1)).toHaveClass(/udsolgt-vare/);
  });

  test('og den anden vej igen', async ({ page }) => {
    const d = medKolonner();
    d.menu_varer.find((v) => v.id === 1).udsolgt = true;
    await åbnMenufanen(page, { data: d });

    await vare(page, 1).locator('[data-udsolgt]').click();
    await expect(page.locator('#kvittering')).toContainText('til salg igen');
    expect((await gemteData(page)).menu_varer.find((v) => v.id === 1).udsolgt).toBe(false);
  });

  /* ⚠️ ET TRYK PÅ UDSOLGT MÅ IKKE FLYTTE EN PRIS, INGEN VAR
     FÆRDIG MED. Prisen har sin egen vej ind; alt andet sender
     databasens pris med. */
  test('den flytter ikke en halvskrevet pris', async ({ page }) => {
    await åbnMenufanen(page, { data: medKolonner() });
    await vare(page, 1).locator('[data-pris]').fill('1');
    await vare(page, 1).locator('[data-udsolgt]').click();
    await expect(page.locator('#kvittering')).toContainText('udsolgt');

    const v = (await gemteData(page)).menu_varer.find((x) => x.id === 1);
    expect(v.udsolgt).toBe(true);
    expect(v.pris).toBe(89);          // uændret
  });
});

test.describe('Dage pr. kategori', () => {

  test('vælgeren gemmer, og gæsten mister kategorien den dag', async ({ page }) => {
    await åbnMenufanen(page, { data: medKolonner() });
    await page.locator('#kat-dage-1').selectOption('hverdage');
    await gruppe(page, 1).locator('.kat-hoved button', { hasText: 'Gem' }).click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    expect((await gemteData(page)).menu_kategorier.find((k) => k.id === 1).dage)
      .toBe('hverdage');
  });

  /* ⚠️ REGLEN SKAL SVARE PÅ DATOEN, IKKE PÅ I DAG — og den skal
     svare det SAMME som mosede_kategori_paa_dagen i databasen.
     Gjorde de ikke det, ville siden vise en burger, som databasen
     afviser bagefter med en fejl, gæsten ikke kan gøre noget ved.
     2026-08-07 er en fredag, 2026-08-08 en lørdag. */
  test('reglen læser bestillingens dato', async ({ page }) => {
    await åbnMenufanen(page, { data: medKolonner() });
    const svar = await page.evaluate(() => ({
      hverdagPaaFredag: Butik.kategoriPaaDag({ dage: 'hverdage' }, '2026-08-07'),
      hverdagPaaLoerdag: Butik.kategoriPaaDag({ dage: 'hverdage' }, '2026-08-08'),
      weekendPaaLoerdag: Butik.kategoriPaaDag({ dage: 'weekend' }, '2026-08-08'),
      weekendPaaSoendag: Butik.kategoriPaaDag({ dage: 'weekend' }, '2026-08-09'),
      weekendPaaFredag: Butik.kategoriPaaDag({ dage: 'weekend' }, '2026-08-07'),
      allePaaLoerdag: Butik.kategoriPaaDag({ dage: 'alle' }, '2026-08-08'),
      // Uden en dato, og uden kolonnen, er svaret JA
      udenDato: Butik.kategoriPaaDag({ dage: 'hverdage' }, null),
      udenKolonne: Butik.kategoriPaaDag({}, '2026-08-08'),
    }));
    expect(svar).toEqual({
      hverdagPaaFredag: true, hverdagPaaLoerdag: false,
      weekendPaaLoerdag: true, weekendPaaSoendag: true, weekendPaaFredag: false,
      allePaaLoerdag: true, udenDato: true, udenKolonne: true,
    });
  });
});

/* ============================================================
   RÆKKEN SKAL VÆRE ÉN LINJE
   ------------------------------------------------------------
   Kundens ord (26/8): "dejlig overskueligt". Der er 242 varer på
   kortet, og en række, der bryder om til to linjer, er dobbelt så
   langt at rulle.

   ⚠️ TALLET SKAL KOMME UDEFRA. Playwrights viewport er det ene
   tal, rækkens højde det andet — begge målt på skærmen ville
   sammenligne noget med sig selv. Se noten i CLAUDE.md om
   striben, der kunne ramme 900 px på en skærm på 390.
   ============================================================ */
test.describe('Overblikket over 242 rækker', () => {

  test('varerækken er ÉN linje på en computer', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'computer', 'måles kun på en computer');
    await åbnMenufanen(page, { data: medKolonner() });
    await page.setViewportSize({ width: 1440, height: 900 });

    const m = await vare(page, 1).evaluate((r) => {
      const navn = r.querySelector('.navn').getBoundingClientRect();
      const kryds = r.querySelector('.kryds-knap').getBoundingClientRect();
      return { hoejde: r.getBoundingClientRect().height,
               sammeLinje: Math.abs(navn.top - kryds.top) < 20 };
    });
    expect(m.sammeLinje, 'rækken brød om til to linjer').toBe(true);
    expect(m.hoejde).toBeLessThan(90);
  });

  /* ⚠️ OG DE FIRE, DER LIGGER BAG ⋯, SKAL KUNNE NÅS. En knap, der
     skjuler noget for evigt, er en mangel — ikke et overblik. */
  test('⋯ åbner favorit, vis og pilene', async ({ page }) => {
    await åbnMenufanen(page, { data: medKolonner() });
    const r = vare(page, 1);
    await expect(r.locator('.vare-bag')).toBeHidden();

    await r.locator('.mere-knap').click();
    await expect(r.locator('.vare-bag')).toBeVisible();
    await expect(r.getByRole('button', { name: /Flyt op/ })).toBeVisible();
    await expect(r.locator('.hak-tegn input')).toHaveCount(2);

    await r.locator('.mere-knap').click();
    await expect(r.locator('.vare-bag')).toBeHidden();
  });

  /* ⚠️ KVITTERINGEN MÅ IKKE FLYTTE KNAPPERNE.

     MÅLT: Admin.autogem hænger mærket i rækkens rod, og rækken er
     en flex-linje. I det sekund der stod "✓ Gemt", voksede mærket
     fra 0 til ~50 px og skubbede ⋯ og ✕ til side — et tryk lige
     efter en indtastning ramte ingenting. I et køkken er det et
     fejltryk på ✕ i stedet for ⋯. */
  /* ⚠️ MÅL INDE I RÆKKEN, IKKE PÅ SKÆRMEN.

     Første udgave sammenlignede boundingBox før og efter, altså
     koordinater i VINDUET. Den fældede sig selv: y faldt fra 885
     til 877, og rækken havde ikke rørt sig — SIDEN var rullet
     8 px. Chrome flytter selv rullepositionen, når noget over
     udsnittet ændrer størrelse (scroll anchoring), og mærket er
     absolut placeret og stikker uden for rækken.

     Det, prøven skal måle, er en LAYOUT-ændring inde i rækken.
     Så måler vi dét: knappens plads i forhold til rækkens egen
     kant. Den er ligeglad med, hvor siden er rullet hen. */
  const iRaekken = (r) => r.evaluate((e) => {
    const a = e.getBoundingClientRect();
    const b = e.querySelector('.mere-knap').getBoundingClientRect();
    return { x: Math.round(b.left - a.left), y: Math.round(b.top - a.top) };
  });

  test('kvitteringen flytter ikke knapperne', async ({ page }) => {
    await åbnMenufanen(page, { data: medKolonner() });
    const r = vare(page, 1);
    const foer = await iRaekken(r);

    await r.locator('[data-antal]').fill('10');
    await r.locator('.gemt-maerke').evaluate((e) => { e.textContent = '✓ Gemt'; });

    expect(await iRaekken(r)).toEqual(foer);
  });
});
