/* Forsiden – og især "er der åbent nu?".

   Det er sidens vigtigste påstand. Står der åbent når der er
   lukket, cykler folk forgæves ned til havnen. Derfor bliver
   hvert hjørne af den logik prøvet med uret sat fast.

   2026-08-07 er en fredag. 2026-08-10 er en mandag.
   Dansk sommertid = UTC+2, så 11:00Z er kl. 13 i Greve.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

test.describe('Åbent eller lukket', () => {

  test('midt på dagen står der åbent, med lukketid', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z' }); // kl. 13
    const status = page.locator('#status');
    await expect(status).toHaveClass(/aaben/);
    await expect(status.locator('.status-ord')).toHaveText(/Åbent nu/);
    await expect(status.locator('.status-detalje')).toHaveText('Åbent til kl. 21:00');
  });

  test('før åbningstid står der hvornår vi åbner', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T07:30:00Z' }); // kl. 9.30
    const status = page.locator('#status');
    await expect(status).toHaveClass(/lukket/);
    await expect(status.locator('.status-ord')).toHaveText(/Lukket lige nu/);
    await expect(status.locator('.status-detalje')).toHaveText('Vi åbner kl. 11:00');
  });

  test('efter lukketid peger den på næste dag', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T20:30:00Z' }); // kl. 22.30 fredag
    const status = page.locator('#status');
    await expect(status).toHaveClass(/lukket/);
    await expect(status.locator('.status-ord')).toHaveText(/Lukket for i dag/);
    await expect(status.locator('.status-detalje')).toHaveText('Vi åbner i morgen kl. 11:00');
  });

  test('sidste halve time bliver sagt tydeligt', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T18:45:00Z' }); // kl. 20.45
    const status = page.locator('#status');
    await expect(status).toHaveClass(/snart/);
    await expect(status.locator('.status-detalje')).toHaveText('Vi lukker om 15 min.');
  });

  test('lige på klokkeslaget for lukning er der lukket', async ({ page }) => {
    // Grænsetilfælde: 21:00 præcis. Der må ikke stå "åbent, lukker
    // om 0 min." – der er lukket.
    await åbn(page, '/index.html', { ur: '2026-08-07T19:00:00Z' }); // kl. 21.00
    await expect(page.locator('#status')).toHaveClass(/lukket/);
    await expect(page.locator('#status .status-ord')).toHaveText(/Lukket for i dag/);
  });

  test('lige på klokkeslaget for åbning er der åbent', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T09:00:00Z' }); // kl. 11.00
    await expect(page.locator('#status')).toHaveClass(/aaben/);
  });

  test('en lukkedag slår ugeplanen, selv om der står 11-21', async ({ page }) => {
    const data = grunddata({
      lukkedage: [{ id: 1, lokation_id: 'mosede', dato: '2026-08-07', aarsag: 'Personaledag', emoji: '🔧' }],
    });
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z', data }); // midt på dagen
    const status = page.locator('#status');
    await expect(status).toHaveClass(/lukket/);
    await expect(status.locator('.status-ord')).toHaveText(/Lukket i dag/);
    await expect(status.locator('.status-detalje')).toHaveText('Personaledag');
  });

  test('vinterlukning slår alt andet', async ({ page }) => {
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        saeson: { lukket: true, aabner_igen: '1. april', besked: 'Vi holder vinterlukket. Tak for en god sæson!' },
      },
    });
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z', data });
    const status = page.locator('#status');
    await expect(status).toHaveClass(/lukket/);
    await expect(status.locator('.status-ord')).toHaveText(/Lukket for sæsonen/);
    await expect(status.locator('.status-detalje')).toHaveText(/vinterlukket/);
  });

  test('en lukket ugedag springes over når næste åbning findes', async ({ page }) => {
    // Mandag lukket. Søndag aften skal den pege på tirsdag.
    const tider = grunddata().aabningstider.map(t =>
      t.ugedag === 0 ? { ...t, lukket: true, aabner: null, lukker: null } : t);
    const data = grunddata({ aabningstider: tider });

    // 2026-08-09 er en søndag. Kl. 22.30 dansk = 20:30Z
    await åbn(page, '/index.html', { ur: '2026-08-09T20:30:00Z', data });
    await expect(page.locator('#status .status-detalje')).toHaveText('Vi åbner tirsdag kl. 11:00');
  });
});

test.describe('Åbningstider i tabellen', () => {

  test('alle syv dage står der, og i dag er markeret', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z' });
    const rækker = page.locator('#tider-krop tr');
    await expect(rækker).toHaveCount(7);

    // Fredag er nummer 5 (0-indekseret: 4)
    const iDag = page.locator('#tider-krop tr.i-dag');
    await expect(iDag).toHaveCount(1);
    await expect(iDag.locator('th')).toHaveText(/Fredag/);
  });

  test('en lukket dag står som Lukket, ikke som 00:00', async ({ page }) => {
    const tider = grunddata().aabningstider.map(t =>
      t.ugedag === 0 ? { ...t, lukket: true, aabner: null, lukker: null } : t);
    await åbn(page, '/index.html', { data: grunddata({ aabningstider: tider }) });

    await expect(page.locator('#tider-krop tr').first()).toContainText('Mandag');
    await expect(page.locator('#tider-krop tr').first()).toContainText('Lukket');
  });
});

test.describe('Resten af forsiden', () => {

  test('lukkedage vises kun når der er nogen', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#lukkedage-kort')).toBeHidden();

    const data = grunddata({
      lukkedage: [{ id: 1, lokation_id: 'mosede', dato: '2026-12-24', aarsag: 'Juleaften', emoji: '🎄' }],
    });
    await åbn(page, '/index.html', { data });
    await expect(page.locator('#lukkedage-kort')).toBeVisible();
    await expect(page.locator('#lukkedage-liste')).toContainText('Juleaften');
    // Datoen skrives på dansk, ikke som 2026-12-24
    await expect(page.locator('#lukkedage-liste')).toContainText('24. december');
  });

  test('dagens besked vises kun når personalet har slået den til', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#dagens-besked')).toBeHidden();

    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        dagens_besked: { vis: true, tekst: 'I dag har vi friske rødspætter.' },
      },
    });
    await åbn(page, '/index.html', { data });
    await expect(page.locator('#dagens-besked')).toHaveText('I dag har vi friske rødspætter.');
  });

  test('telefonnummeret bliver et nummer man kan trykke på', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#lok-telefon')).toHaveAttribute('href', 'tel:+4528871343');
    await expect(page.locator('#lok-telefon')).toHaveText('28 87 13 43');
    await expect(page.locator('#ring')).toHaveAttribute('href', 'tel:+4528871343');
  });

  test('fremhævede varer kommer frem som favoritter', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#favoritter')).toBeVisible();
    await expect(page.locator('#favoritter-liste')).toContainText('Flæskestegssandwich');
  });

  test('en udsolgt favorit vises ikke på forsiden', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v =>
      v.id === 1 ? { ...v, udsolgt: true } : v);
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });
    await expect(page.locator('#favoritter')).toBeHidden();
  });
});

test.describe('Sikkerhed og robusthed', () => {

  test('et varenavn med tegn fra HTML bliver vist som tekst', async ({ page }) => {
    // Personalet skriver varenavne. Et < må aldrig kunne blive kode.
    const farligt = '<img src=x onerror="window.HACKET=1">Burger';
    const varer = grunddata().menu_varer.map(v =>
      v.id === 1 ? { ...v, navn: farligt } : v);

    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });

    await expect(page.locator('#favoritter-liste')).toContainText(farligt);
    expect(await page.evaluate(() => window.HACKET)).toBeUndefined();
    expect(await page.locator('#favoritter-liste img').count()).toBe(0);
  });

  test('siden går ikke ned hvis databasen svarer tomt', async ({ page }) => {
    const tomt = {
      lokationer: [], aabningstider: [], lukkedage: [],
      menu_kategorier: [], menu_varer: [], nyheder: [], indstillinger: {},
    };
    await åbn(page, '/index.html', { data: tomt });

    // Der skal stadig stå noget om åbningstid, og siden skal stå
    // oprejst i stedet for at vise en tom hvid flade.
    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#tider-krop tr')).toHaveCount(7);
  });
});
