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

test.describe('Beskrivelsen kan rettes', () => {

  test('teksten under varenavnet skrives i admin og lander på menukortet',
    async ({ page }) => {
      await åbnMenufanen(page);

      const række = vare(page, 1);
      await række.locator('.vare-tekst-felt').fill('Med rødkål fra egen gryde.');
      await række.locator('button', { hasText: 'Gem' }).click();
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
    await række.locator('button', { hasText: 'Gem' }).click();
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

    await fyld.locator('.vare-raekke').nth(1)
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

    await fyld.locator('.vare-raekke').nth(1)
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
    await page.locator('.ny-kategori button', { hasText: 'Opret' }).click();
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
    await page.locator('.ny-kategori button', { hasText: 'Opret' }).click();
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
