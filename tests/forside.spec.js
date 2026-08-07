/* Forsiden.

   Vægten ligger to steder:

   1) "Er der åbent?" – sidens vigtigste påstand. Står der åbent
      når der er lukket, cykler folk forgæves ned til havnen.
      Derfor prøves hvert hjørne af logikken med uret sat fast.

   2) At intet OPDIGTET slipper ud. Vandtemperatur, nøgletal og
      dagens kugler skal være skjulte når de er tomme – ikke
      udfyldt med prototypens eksempelværdier.

   2026-08-07 er en fredag. Dansk sommertid = UTC+2, så 11:00Z er
   kl. 13 i Greve.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

test.describe('Åbent eller lukket', () => {

  test('midt på dagen står der åbent, med lukketid', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z' }); // kl. 13
    await expect(page.locator('#hero-status-tekst')).toHaveText('Åbent nu til 21:00');
    await expect(page.locator('#hero-status .dot')).not.toHaveClass(/lukket/);

    await expect(page.locator('#status-v')).toContainText('Åbent');
    await expect(page.locator('#status-v small')).toHaveText('til 21:00');
    await expect(page.locator('#status-k')).toHaveText('Lige nu · fredag');
  });

  test('før åbningstid står der hvornår vi åbner', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T07:30:00Z' }); // kl. 9.30
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket lige nu');
    await expect(page.locator('#hero-status-tekst')).toContainText('11:00');
    await expect(page.locator('#hero-status .dot')).toHaveClass(/lukket/);
    await expect(page.locator('#status-v')).toContainText('Lukket');
  });

  test('efter lukketid peger den på næste dag', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T20:30:00Z' }); // kl. 22.30
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket for i dag');
    await expect(page.locator('#hero-status-tekst')).toContainText('i morgen');
    // Etiketten koges ned til noget der er plads til
    await expect(page.locator('#status-v small')).toHaveText('åbner i morgen 11:00');
  });

  test('sidste halve time bliver sagt tydeligt', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T18:45:00Z' }); // kl. 20.45
    await expect(page.locator('#hero-status-tekst')).toContainText('15 min');
    // Der er stadig åbent
    await expect(page.locator('#hero-status .dot')).not.toHaveClass(/lukket/);
  });

  test('lige på klokkeslaget for lukning er der lukket', async ({ page }) => {
    // Grænsetilfælde: 21:00 præcis må ikke give "åbent, lukker om 0 min."
    await åbn(page, '/index.html', { ur: '2026-08-07T19:00:00Z' });
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket for i dag');
    await expect(page.locator('#hero-status .dot')).toHaveClass(/lukket/);
  });

  test('lige på klokkeslaget for åbning er der åbent', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T09:00:00Z' }); // kl. 11.00
    await expect(page.locator('#hero-status-tekst')).toContainText('Åbent nu');
  });

  test('en lukkedag slår ugeplanen, selv om der står 11-21', async ({ page }) => {
    const data = grunddata({
      lukkedage: [{ id: 1, lokation_id: 'mosede', dato: '2026-08-07', aarsag: 'Personaledag', emoji: '🔧' }],
    });
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z', data });
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket i dag');
    await expect(page.locator('#hero-status-tekst')).toContainText('Personaledag');
  });

  test('vinterlukning slår alt andet', async ({ page }) => {
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        saeson: { lukket: true, aabner_igen: '1. april', besked: 'Tak for en god sæson!' },
      },
    });
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z', data });
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket for sæsonen');
    await expect(page.locator('#hero-status .dot')).toHaveClass(/lukket/);
  });
});

test.describe('Åbningstider', () => {

  test('ens dage lægges sammen, og i dag får sin egen linje', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z' }); // fredag
    const rk = page.locator('#hours div');

    // Alle syv dage er 11-21, så det bliver: man-tors, fredag (i dag), lør-søn
    await expect(rk).toHaveCount(3);
    await expect(rk.nth(0)).toContainText('Mandag – torsdag');
    await expect(rk.nth(1)).toContainText('Fredag (i dag)');
    await expect(rk.nth(2)).toContainText('Lørdag – søndag');

    // I dag er markeret – og der står også "(i dag)", så farven
    // ikke er det eneste signal
    await expect(page.locator('#hours div.now')).toHaveCount(1);
    await expect(page.locator('#hours div.now')).toContainText('i dag');
  });

  test('forskellige dage bliver ikke lagt sammen', async ({ page }) => {
    const tider = grunddata().aabningstider.map(t =>
      t.ugedag >= 5 ? { ...t, lukker: '22:00' } : t);
    await åbn(page, '/index.html', { data: grunddata({ aabningstider: tider }) });

    await expect(page.locator('#hours div')).toContainText(['11:00–21:00', '11:00–21:00', '11:00–22:00']);
  });

  test('en lukket dag står som Lukket, ikke som 00:00', async ({ page }) => {
    const tider = grunddata().aabningstider.map(t =>
      t.ugedag === 0 ? { ...t, lukket: true, aabner: null, lukker: null } : t);
    await åbn(page, '/index.html', { data: grunddata({ aabningstider: tider }) });

    await expect(page.locator('#hours div').first()).toContainText('Mandag');
    await expect(page.locator('#hours div').first()).toContainText('Lukket');
  });

  test('lukkedage vises kun når der er nogen', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#lukkedage')).toBeHidden();

    const data = grunddata({
      lukkedage: [{ id: 1, lokation_id: 'mosede', dato: '2026-12-24', aarsag: 'Juleaften', emoji: '🎄' }],
    });
    await åbn(page, '/index.html', { data });
    await expect(page.locator('#lukkedage')).toBeVisible();
    await expect(page.locator('#lukkedage')).toContainText('24. december');
    await expect(page.locator('#lukkedage')).toContainText('Juleaften');
  });
});

test.describe('Solnedgangen regnes ud', () => {

  test('7. august 2026 i Greve: 21:05', async ({ page }) => {
    // Kontrolleret mod soltider.dk og solopgang.dk. Tallet er
    // regnet ud i browseren, ikke hentet nogen steder.
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z' });
    await expect(page.locator('#solnedgang')).toHaveText('21:05');
  });

  test('solen går ned tidligere om vinteren end om sommeren', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-12-21T11:00:00Z' });
    const vinter = await page.locator('#solnedgang').textContent();

    // Formen skal holde, og december skal ligge klart før august
    expect(vinter).toMatch(/^\d{2}:\d{2}$/);
    expect(Number(vinter.slice(0, 2))).toBeLessThan(17);
    expect(Number(vinter.slice(0, 2))).toBeGreaterThan(14);
  });
});

test.describe('Intet opdigtet slipper ud', () => {

  test('vandtemperatur, vind og landing er skjulte når de er tomme', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#celle-vandtemp')).toBeHidden();
    await expect(page.locator('#celle-vind')).toBeHidden();
    await expect(page.locator('#celle-landing')).toBeHidden();

    // Prototypens eksempelværdier må ikke stå nogen steder
    await expect(page.locator('body')).not.toContainText('18,4');
    await expect(page.locator('body')).not.toContainText('m/s');
  });

  test('men de vises når personalet har skrevet dem ind', async ({ page }) => {
    const data = grunddata({
      indstillinger: { ...grunddata().indstillinger, vandtemp: '17,2 °C', vind: '6 m/s V', landing: 'Rødspætte' },
    });
    await åbn(page, '/index.html', { data });

    await expect(page.locator('#vandtemp')).toHaveText('17,2 °C');
    await expect(page.locator('#vind')).toHaveText('6 m/s V');
    await expect(page.locator('#landing')).toHaveText('Rødspætte');
  });

  test('nøgletallene står tomme indtil nogen har bekræftet dem', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#stats .stat')).toHaveCount(0);
    // "54 somre" var prototypens gæt og må ikke stå på nettet
    await expect(page.locator('body')).not.toContainText('54');
    await expect(page.locator('body')).not.toContainText('siden 1972');
  });

  test('nøgletal vises når de er udfyldt, højst fire', async ({ page }) => {
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        noegletal: [
          { tal: '18', tekst: 'slags kugleis' }, { tal: '10–20', tekst: 'grillen er tændt' },
          { tal: '3', tekst: 'minutter fra stranden' }, { tal: '2', tekst: 'luger' },
          { tal: '9', tekst: 'bliver ikke vist' },
        ],
      },
    });
    await åbn(page, '/index.html', { data });
    await expect(page.locator('#stats .stat')).toHaveCount(4);
    await expect(page.locator('#stats')).not.toContainText('bliver ikke vist');
  });
});

test.describe('Dagens kugler', () => {

  test('hele afsnittet er skjult når tavlen er tom', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#is')).toBeHidden();
  });

  test('kugler vises med farveprik', async ({ page }) => {
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        dagens_kugler: [
          { navn: 'Jordbær fra Greve', farve: '#f0c3bb' },
          { navn: 'Pistacie', farve: '#c9d6b4' },
        ],
      },
    });
    await åbn(page, '/index.html', { data });

    await expect(page.locator('#is')).toBeVisible();
    await expect(page.locator('#kugler-liste .chip')).toHaveCount(2);
    await expect(page.locator('#kugler-liste')).toContainText('Jordbær fra Greve');
    await expect(page.locator('#kugler-liste .chip i').first())
      .toHaveCSS('background-color', 'rgb(240, 195, 187)');
  });

  test('en farve der ikke er en farve kan ikke smugle CSS ind', async ({ page }) => {
    // Feltet skrives af personalet. Står der noget andet end en
    // hex-farve, skal det afvises – ikke sættes ind i style.
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        dagens_kugler: [{ navn: 'Snyd', farve: 'red; position:fixed; inset:0; z-index:999' }],
      },
    });
    await åbn(page, '/index.html', { data });

    const prik = page.locator('#kugler-liste .chip i').first();
    await expect(prik).toHaveCSS('position', 'static');
    await expect(prik).toHaveCSS('background-color', 'rgb(239, 228, 210)');
  });
});

test.describe('Menukortet på forsiden', () => {

  test('de fremhævede varer bliver kort med pris', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#menu-liste .card')).toHaveCount(1);
    await expect(page.locator('#menu-liste')).toContainText('Flæskestegssandwich');
    await expect(page.locator('#menu-liste .price')).toHaveText('89,-');
  });

  test('er intet fremhævet, vises de aktive varer alligevel', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => ({ ...v, fremhaevet: false }));
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });
    await expect(page.locator('#menu-liste .card')).toHaveCount(2);
  });

  test('en vare uden pris får ingen prismærkat – ikke "0,-"', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, pris: null } : v);
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });

    await expect(page.locator('#menu-liste')).toContainText('Flæskestegssandwich');
    await expect(page.locator('#menu-liste .price')).toHaveCount(0);
    await expect(page.locator('#menu-liste')).not.toContainText('0,-');
  });

  test('udsolgt bliver markeret, ikke skjult', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, udsolgt: true } : v);
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });

    await expect(page.locator('#menu-liste .card').first()).toHaveClass(/udsolgt/);
    await expect(page.locator('.udsolgt-maerke')).toHaveText('Udsolgt');
    await expect(page.locator('#menu-liste')).toContainText('Flæskestegssandwich');
  });

  test('en slukket vare vises slet ikke', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, aktiv: false } : v);
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });
    await expect(page.locator('#menu-liste')).not.toContainText('Flæskestegssandwich');
  });

  test('et tomt menukort siger noget venligt', async ({ page }) => {
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: [] }) });
    await expect(page.locator('#menu-liste')).toContainText(/ikke lagt ind endnu/);
  });
});

test.describe('Kontakt og adresse', () => {

  test('adressen står tre steder og kommer fra databasen', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#kort-pin')).toHaveText('Havnevej 20');
    await expect(page.locator('#footer-adresse')).toContainText('2670 Greve');
    await expect(page.locator('#find-under')).toContainText('Havnevej 20');
  });

  test('telefonnummeret bliver et nummer man kan trykke på', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#ring')).toHaveAttribute('href', 'tel:+4528871343');
    await expect(page.locator('#ring')).toHaveText('Ring 28 87 13 43');
    await expect(page.locator('#footer-tel')).toHaveText('28 87 13 43');
  });

  test('rute-linket peger på adressen', async ({ page }) => {
    await åbn(page, '/index.html');
    const href = await page.locator('#rute').getAttribute('href');
    expect(href).toContain('Havnevej%2020');
    expect(href).toContain('2670');
  });

  test('dagens besked vises kun når personalet har slået den til', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#dagens-besked')).toBeHidden();

    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        dagens_besked: { vis: true, tekst: 'Kontanter virker ikke i dag.' },
      },
    });
    await åbn(page, '/index.html', { data });
    await expect(page.locator('#dagens-besked')).toHaveText('Kontanter virker ikke i dag.');
  });
});

test.describe('Opførsel', () => {

  test('topmenuen bliver til glas når man ruller ned', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#hd')).not.toHaveClass(/stuck/);

    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await expect(page.locator('#hd')).toHaveClass(/stuck/);
  });

  test('afsnittene toner ind når de kommer i syne', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#find').scrollIntoViewIfNeeded();
    await expect(page.locator('#find')).toHaveClass(/in/);
  });

  test('mobilmenuen åbner, lukker og fanger Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await åbn(page, '/index.html');

    await expect(page.locator('#ark')).toBeHidden();
    await page.locator('#burger').click();
    await expect(page.locator('#ark')).toBeVisible();
    await expect(page.locator('#burger')).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(page.locator('#ark')).toBeHidden();
    await expect(page.locator('#burger')).toHaveAttribute('aria-expanded', 'false');
  });

  test('et klik i mobilmenuen lukker den', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await åbn(page, '/index.html');

    await page.locator('#burger').click();
    await page.locator('#ark a[href="#menu"]').click();
    await expect(page.locator('#ark')).toBeHidden();
  });

  test('bådstriben får en bredde – ellers falder den sammen til 300px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await åbn(page, '/index.html');

    const b = await page.locator('#sail').evaluate(el => el.clientWidth);
    expect(b).toBeGreaterThan(1000);
  });
});

test.describe('Sikkerhed og robusthed', () => {

  test('et varenavn med tegn fra HTML bliver vist som tekst', async ({ page }) => {
    const farligt = '<img src=x onerror="window.HACKET=1">Burger';
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, navn: farligt } : v);
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });

    await expect(page.locator('#menu-liste')).toContainText(farligt);
    expect(await page.evaluate(() => window.HACKET)).toBeUndefined();
    expect(await page.locator('#menu-liste img').count()).toBe(0);
  });

  test('siden går ikke ned hvis databasen svarer tomt', async ({ page }) => {
    const tomt = {
      lokationer: [], aabningstider: [], lukkedage: [],
      menu_kategorier: [], menu_varer: [], nyheder: [], indstillinger: {},
    };
    await åbn(page, '/index.html', { data: tomt });

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#hero-status-tekst')).not.toHaveText('');
    // Hele ugen "Lukket", men i dag får sin egen linje, så det
    // bliver tre: før i dag, i dag, efter i dag
    await expect(page.locator('#hours div')).toHaveCount(3);
    await expect(page.locator('#hours')).toContainText('Lukket');
  });

  test('ingen fejl i konsollen ved almindelig indlæsning', async ({ page }) => {
    const fejl = [];
    page.on('pageerror', e => fejl.push(e.message));
    page.on('console', m => { if (m.type() === 'error') fejl.push(m.text()); });

    await åbn(page, '/index.html');
    await page.locator('#find').scrollIntoViewIfNeeded();
    expect(fejl).toEqual([]);
  });
});
