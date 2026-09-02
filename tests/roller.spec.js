/* ROLLER I ADMIN: EJER OG MEDARBEJDER  (2/9)

   ⚠️ DET HER ER SKÆRMEN, IKKE VÆRNET. Det, der faktisk siger nej,
   er RLS og udløserne i supabase/roller.sql, og de er prøvet for
   sig i proev-roller.sql (18 × BESTOD, hvert værn set fejle) —
   dem kan en browser ikke se.

   Prøverne her måler den anden halvdel: at en medarbejder ikke
   MØDER de knapper, hun alligevel ikke må trykke på. En fane,
   der er synlig men afvises ved gem, er et system, der ser i
   stykker ud. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, visFane, gemteData } = require('./hjaelp');

/* ⚠️ ØVETILSTANDEN KENDER MIG PÅ SESSIONSTORAGE. logInd() i
   hjaelp.js sætter mosede_email = test@lesreg.dk, og
   Butik.minRolle slår netop den op i listen. Derfor er det DEN
   e-mail, prøvernes hold skal bruge. */
const MIG = 'test@lesreg.dk';

function medHold(hold) {
  const d = grunddata();
  d.personale = hold;
  return d;
}

const EJER = [
  { email: MIG, lokation_id: 'mosede', rolle: 'ejer', aktiv: true, navn: 'Chefen' },
  { email: 'lone@proev.dk', lokation_id: 'mosede', rolle: 'medarbejder', aktiv: true, navn: 'Lone' },
];

const MEDARBEJDER = [
  { email: 'chef@proev.dk', lokation_id: 'mosede', rolle: 'ejer', aktiv: true, navn: 'Chefen' },
  { email: MIG, lokation_id: 'mosede', rolle: 'medarbejder', aktiv: true, navn: 'Lone' },
];

// De fire, en medarbejder ikke skal møde.
const SKJULTE = ['p-tider', 'p-kontakt', 'p-historik', 'p-salg', 'p-personale'];

test.describe('Ejeren ser det hele', () => {
  test('Personale-fanen findes, og holdet står på den', async ({ page }) => {
    await åbnAdmin(page, { data: medHold(EJER) });
    await visFane(page, 'p-personale');

    await expect(page.locator('[data-person="' + MIG + '"]')).toHaveCount(1);
    await expect(page.locator('[data-person="lone@proev.dk"]')).toHaveCount(1);
    await expect(page.locator('[data-person="lone@proev.dk"]')).toContainText('Lone');
  });

  test('alle fanerne er der', async ({ page }) => {
    await åbnAdmin(page, { data: medHold(EJER) });
    for (const id of SKJULTE) {
      await expect(page.locator('[data-panel="' + id + '"]'),
        id + ' mangler for ejeren').not.toBeHidden();
    }
  });
});

test.describe('Medarbejderen ser dagen — ikke forretningen', () => {
  test('de fem faner er væk', async ({ page }) => {
    await åbnAdmin(page, { data: medHold(MEDARBEJDER) });
    // Vent på at rollen er hentet og fanerne vekslet
    await expect(page.locator('[data-panel="p-tider"]')).toBeHidden();

    for (const id of SKJULTE) {
      await expect(page.locator('[data-panel="' + id + '"]'),
        id + ' burde være skjult for en medarbejder').toBeHidden();
    }
  });

  test('dagens faner bliver stående', async ({ page }) => {
    await åbnAdmin(page, { data: medHold(MEDARBEJDER) });
    await expect(page.locator('[data-panel="p-tider"]')).toBeHidden();

    /* ⚠️ DEN HER ER MODSTYKKET. Uden den ville en fejl, der
       skjulte ALT, bestå prøven ovenfor — og efterlade en
       medarbejder med en tom skærm. */
    for (const id of ['p-overblik', 'p-bestillinger', 'p-koekken', 'p-borde',
                      'p-menu', 'p-kalender', 'p-dagensret']) {
      await expect(page.locator('[data-panel="' + id + '"]'),
        id + ' er dagens arbejde og skal blive').not.toBeHidden();
    }
  });

  test('står hun på en fane, der forsvinder, flyttes hun til Overblik', async ({ page }) => {
    /* Rollen hentes EFTER login, så der er et øjeblik, hvor
       Åbningstider stadig står der. Går man derind i det sekund,
       må man ikke blive stående på et panel, man ikke kan gemme
       i — og tro, at systemet er i stykker. */
    await åbnAdmin(page, { data: medHold(MEDARBEJDER) });
    await page.evaluate(() => window.Admin.visFane('p-tider'));
    await page.evaluate(() => window.Admin.vekslFaner());

    await expect(page.locator('#p-tider')).toBeHidden();
    await expect(page.locator('#p-overblik')).toBeVisible();
  });
});

test.describe('Den sidste ejer kan ikke fjernes', () => {
  test('knapperne er slået fra på den eneste ejer', async ({ page }) => {
    await åbnAdmin(page, { data: medHold(EJER) });
    await visFane(page, 'p-personale');

    const chef = page.locator('[data-person="' + MIG + '"]');
    await expect(chef.locator('[data-sluk]')).toBeDisabled();
    await expect(chef.locator('[data-slet]')).toBeDisabled();
    await expect(chef.locator('[data-rolle="medarbejder"]')).toBeDisabled();

    /* Og på den anden er de tændte — ellers målte prøven bare, at
       ALT var slået fra. */
    const lone = page.locator('[data-person="lone@proev.dk"]');
    await expect(lone.locator('[data-sluk]')).toBeEnabled();
  });

  /* ⚠️ OG ØVETILSTANDEN SKAL AFVISE DET SOM DATABASEN. En
     efterligning, der er mildere end skyen, lader fejlen bestå
     lokalt og fælde hos kunden — det er sket fire gange. */
  test('øvetilstanden afviser at slukke den sidste ejer', async ({ page }) => {
    await åbnAdmin(page, { data: medHold(EJER) });
    const svar = await page.evaluate(() => window.Butik.skrive
      .personale({ email: 'test@lesreg.dk', rolle: 'ejer', aktiv: false })
      .then(() => 'gik igennem').catch((e) => e.message));
    expect(svar).toContain('mindst én aktiv ejer');
  });

  test('øvetilstanden afviser at slette den sidste ejer', async ({ page }) => {
    await åbnAdmin(page, { data: medHold(EJER) });
    const svar = await page.evaluate(() => window.Butik.skrive
      .sletPersonale('test@lesreg.dk', 'mosede')
      .then(() => 'gik igennem').catch((e) => e.message));
    expect(svar).toContain('mindst én aktiv ejer');
  });

  /* Modstykket: er der to ejere, må den ene godt gå. Uden den her
     ville en spærre, der bare sagde nej til alt, bestå de to
     ovenfor. */
  test('er der to ejere, kan den ene godt slukkes', async ({ page }) => {
    const hold = EJER.slice();
    hold[1] = Object.assign({}, hold[1], { rolle: 'ejer' });
    await åbnAdmin(page, { data: medHold(hold) });

    const svar = await page.evaluate(() => window.Butik.skrive
      .personale({ email: 'lone@proev.dk', rolle: 'ejer', aktiv: false })
      .then(() => 'gik igennem').catch((e) => e.message));
    expect(svar).toBe('gik igennem');
  });
});

test.describe('Ejeren kan styre holdet', () => {
  test('en ny bliver medarbejder som standard', async ({ page }) => {
    /* ⚠️ MED VILJE. Den, der tilføjer en ny, tilføjer som regel en,
       der skal stå ved lugen. Et fejltryk dér giver en ekstra
       ejer, og det opdager ingen. */
    await åbnAdmin(page, { data: medHold(EJER) });
    await visFane(page, 'p-personale');

    await page.locator('#pers-email').fill('ny@proev.dk');
    await page.locator('#pers-navn').fill('Ny Nyesen');
    await page.locator('#pers-tilfoej').click();

    await expect(page.locator('[data-person="ny@proev.dk"]')).toHaveCount(1);
    const d = await gemteData(page);
    const ny = d.personale.filter((p) => p.email === 'ny@proev.dk')[0];
    expect(ny.rolle).toBe('medarbejder');
    expect(ny.navn).toBe('Ny Nyesen');
  });

  test('rollen kan skiftes, og det står i databasen', async ({ page }) => {
    await åbnAdmin(page, { data: medHold(EJER) });
    await visFane(page, 'p-personale');

    await page.locator('[data-person="lone@proev.dk"] [data-rolle="ejer"]').click();
    await expect(page.locator('#kvittering')).toBeVisible();

    const d = await gemteData(page);
    expect(d.personale.filter((p) => p.email === 'lone@proev.dk')[0].rolle).toBe('ejer');
  });

  test('"Luk ude" lukker ude, og rækken bliver stående', async ({ page }) => {
    /* ⚠️ RÆKKEN BLIVER — det er hele forskellen på "Luk ude" og
       "Slet". En slettet medarbejder er en logbog med en e-mail,
       ingen kan sætte et ansigt på. */
    await åbnAdmin(page, { data: medHold(EJER) });
    await visFane(page, 'p-personale');

    await page.locator('[data-person="lone@proev.dk"] [data-sluk]').click();
    await expect(page.locator('[data-person="lone@proev.dk"]')).toContainText('Lukket ude');
    await expect(page.locator('[data-person="lone@proev.dk"] [data-sluk]'))
      .toHaveText('Luk ind igen');

    const d = await gemteData(page);
    expect(d.personale.filter((p) => p.email === 'lone@proev.dk')[0].aktiv).toBe(false);
  });

  test('en e-mail uden krøllealfa afvises', async ({ page }) => {
    await åbnAdmin(page, { data: medHold(EJER) });
    const svar = await page.evaluate(() => window.Butik.skrive
      .personale({ email: 'lone', rolle: 'medarbejder' })
      .then(() => 'gik igennem').catch((e) => e.message));
    expect(svar).toContain('rigtig e-mail');
  });
});

test.describe('Uden rollerne opfører admin sig som før', () => {
  /* ⚠️ KAN ROLLEN IKKE HENTES, ER MAN EJER. supabase/roller.sql
     er måske ikke kørt endnu, og et system, der låser sin egen
     ejer ude, fordi et kald fejlede, er værre end et uden
     roller. Databasen dømmer alligevel til sidst. */
  test('uden et hold i databasen er man ejer', async ({ page }) => {
    const d = grunddata();          // ingen `personale`
    await åbnAdmin(page, { data: d });
    for (const id of SKJULTE) {
      await expect(page.locator('[data-panel="' + id + '"]'),
        id + ' forsvandt, selv om rollerne ikke er sat op').not.toBeHidden();
    }
  });
});
