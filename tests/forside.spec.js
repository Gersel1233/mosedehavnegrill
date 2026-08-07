/* Forsiden.

   Vægten ligger tre steder:

   1) "Er der åbent?" – sidens vigtigste påstand. Står der åbent
      når der er lukket, cykler folk forgæves ned til havnen.

   2) At INTET OPDIGTET slipper ud. Vandtemperatur og lignende
      skal være skjult når der ikke er en kilde, og prototypens
      eksempelværdier må ikke stå nogen steder.

   3) At en tom pris aldrig bliver et tal. Fire varer på
      menukortet står med "ca." i forretningens eget kort, og de
      skal vise ingenting frem for et gæt.

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
  });

  test('efter lukketid peger den på næste dag', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T20:30:00Z' }); // kl. 22.30
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket for i dag');
    await expect(page.locator('#status-v small')).toHaveText('åbner i morgen 11:00');
  });

  test('sidste halve time bliver sagt tydeligt', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T18:45:00Z' }); // kl. 20.45
    await expect(page.locator('#hero-status-tekst')).toContainText('15 min');
    await expect(page.locator('#hero-status .dot')).not.toHaveClass(/lukket/);
  });

  test('lige på klokkeslaget for lukning er der lukket', async ({ page }) => {
    // Grænsetilfælde: 21:00 præcis må ikke give "lukker om 0 min."
    await åbn(page, '/index.html', { ur: '2026-08-07T19:00:00Z' });
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket for i dag');
  });

  test('lige på klokkeslaget for åbning er der åbent', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T09:00:00Z' }); // kl. 11.00
    await expect(page.locator('#hero-status-tekst')).toContainText('Åbent nu');
  });

  test('en lukkedag slår ugeplanen', async ({ page }) => {
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

    await expect(rk).toHaveCount(3);
    await expect(rk.nth(0)).toContainText('Mandag – torsdag');
    await expect(rk.nth(1)).toContainText('Fredag (i dag)');
    await expect(rk.nth(2)).toContainText('Lørdag – søndag');

    // Farven er ikke det eneste signal – der står også "(i dag)"
    await expect(page.locator('#hours div.now')).toHaveCount(1);
    await expect(page.locator('#hours div.now')).toContainText('i dag');
  });

  test('forskellige dage lægges ikke sammen', async ({ page }) => {
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
  });
});

test.describe('Solnedgangen regnes ud', () => {

  test('7. august 2026 i Greve: 21:05', async ({ page }) => {
    // Kontrolleret mod soltider.dk og solopgang.dk. Tallet regnes
    // ud i browseren, ikke hentet nogen steder.
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z' });
    await expect(page.locator('#solnedgang')).toHaveText('21:05');
  });

  test('vinter ligger klart før sommer', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-12-21T11:00:00Z' });
    const vinter = await page.locator('#solnedgang').textContent();
    expect(vinter).toMatch(/^\d{2}:\d{2}$/);
    expect(Number(vinter.slice(0, 2))).toBeGreaterThan(14);
    expect(Number(vinter.slice(0, 2))).toBeLessThan(17);
  });
});

test.describe('Intet opdigtet slipper ud', () => {

  test('vandtemperatur, vind og dagens ret er skjulte når de er tomme', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#celle-vandtemp')).toBeHidden();
    await expect(page.locator('#celle-vind')).toBeHidden();
    await expect(page.locator('#celle-landing')).toBeHidden();
  });

  test('prototypens opdigtede påstande findes ikke på siden', async ({ page }) => {
    await åbn(page, '/index.html');
    const krop = page.locator('body');
    for (const p of ['18,4', 'm/s NØ', 'siden 1972', '54 somre',
                     'Sydkysten', 'pistacie', 'Man kommer for pølsen']) {
      await expect(krop, `"${p}" skal være væk`).not.toContainText(p);
    }
  });

  test('der er ingen stribede pladsholdere tilbage', async ({ page }) => {
    await åbn(page, '/index.html');
    expect(await page.locator('.ph').count()).toBe(0);
  });

  test('men felterne vises når personalet har skrevet dem ind', async ({ page }) => {
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        vandtemp: '17,2 °C', vind: '6 m/s V', landing: 'Stegt flæsk',
      },
    });
    await åbn(page, '/index.html', { data });
    await expect(page.locator('#vandtemp')).toHaveText('17,2 °C');
    await expect(page.locator('#vind')).toHaveText('6 m/s V');
    await expect(page.locator('#landing')).toHaveText('Stegt flæsk');
  });
});

test.describe('Hele menukortet', () => {

  test('mad vises først, med kategorier fra databasen', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#afd-mad')).toHaveAttribute('aria-selected', 'true');
    // Og fanen skal SES valgt, ikke kun være det for en skærmlæser
    await expect(page.locator('#afd-mad')).toHaveClass(/valgt/);
    await expect(page.locator('#afd-is')).not.toHaveClass(/valgt/);
    await expect(page.locator('#menu-liste .kat')).toHaveCount(2);
    await expect(page.locator('#menu-liste')).toContainText('Smørrebrød');
    await expect(page.locator('#menu-liste')).not.toContainText('Fadøl');
  });

  test('man kan skifte til is og til drikkevarer', async ({ page }) => {
    await åbn(page, '/index.html');

    await page.locator('#afd-is').click();
    await expect(page.locator('#menu-liste')).toContainText('Softice med guf');
    await expect(page.locator('#menu-liste')).not.toContainText('Flæskestegssandwich');
    await expect(page.locator('#afd-is')).toHaveClass(/valgt/);

    await page.locator('#afd-drikke').click();
    await expect(page.locator('#menu-liste')).toContainText('Fadøl, lille');
    await expect(page.locator('#afd-mad')).toHaveAttribute('aria-selected', 'false');
  });

  test('priser skrives som på et menukort', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#menu-liste .linje-pris').first()).toHaveText('89,-');

    await page.locator('#afd-is').click();
    // 35,5 → "35,50,-" ville være grimt; komma-formen bevares
    await expect(page.locator('#menu-liste .linje-pris').first()).toHaveText('35,50,-');
  });

  test('en kategori uden priser vises som pastiller, ikke som tankestreger', async ({ page }) => {
    // Fyldet til smørrebrødet er en liste man vælger fra. 29
    // tankestreger i en priskolonne er støj.
    await åbn(page, '/index.html');
    const valg = page.locator('#menu-liste .valg');
    await expect(valg).toHaveCount(1);
    await expect(valg.locator('.valg-en')).toHaveCount(2);
    await expect(valg).toContainText('Dyrlægens natmad');
    // Ingen prisfelter i den kategori
    expect(await page.locator('#menu-liste .kat').last().locator('.linje-pris').count()).toBe(0);
  });

  test('en vare uden pris viser ingen pris – aldrig et gæt', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, pris: null } : v);
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });

    await expect(page.locator('#menu-liste')).toContainText('Flæskestegssandwich');
    await expect(page.locator('#menu-liste')).not.toContainText('0,-');
    // Kategorien har nu ingen priser, så den vises som pastiller
    await expect(page.locator('#menu-liste .valg')).toHaveCount(2);
  });

  test('udsolgt markeres, men varen bliver stående', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, udsolgt: true } : v);
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });
    await expect(page.locator('#menu-liste .linje').first()).toHaveClass(/udsolgt/);
    await expect(page.locator('#menu-liste')).toContainText('Flæskestegssandwich');
  });

  test('en slukket vare vises slet ikke', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => v.id === 1 ? { ...v, aktiv: false } : v);
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });
    await expect(page.locator('#menu-liste')).not.toContainText('Flæskestegssandwich');
  });

  test('en tom afdeling siger noget venligt', async ({ page }) => {
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: [] }) });
    await expect(page.locator('#menu-liste')).toContainText(/ikke lagt noget ind/);
  });

  test('noten under menukortet kommer fra databasen', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#menu-note')).toContainText('glutenfri');
  });

  test('gamle kategorier med afdeling "grill" havner under mad', async ({ page }) => {
    // Efter en halv opgradering af databasen kan der stå 'grill'.
    // De må ikke blive usynlige.
    const kat = grunddata().menu_kategorier.map(k =>
      k.id === 1 ? { ...k, afdeling: 'grill' } : k);
    await åbn(page, '/index.html', { data: grunddata({ menu_kategorier: kat }) });
    await expect(page.locator('#menu-liste')).toContainText('Flæskestegssandwich');
  });
});

test.describe('Mest bestilte', () => {

  test('de fremhævede varer bliver kort med stor pris', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#favoritter-liste .fav')).toHaveCount(1);
    await expect(page.locator('.fav h3')).toHaveText('Flæskestegssandwich');
    await expect(page.locator('.fav-pris')).toHaveText('89,-');
  });

  test('afsnittet skjules helt hvis intet er fremhævet', async ({ page }) => {
    const varer = grunddata().menu_varer.map(v => ({ ...v, fremhaevet: false }));
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });
    await expect(page.locator('#favoritter')).toBeHidden();
  });
});

test.describe('Kager og dagens kugler', () => {

  test('kagepriserne hentes fra menukortet', async ({ page }) => {
    const varer = grunddata().menu_varer.concat([
      { id: 20, kategori_id: 9, navn: 'Kage', beskrivelse: 'Spørg til dagens udvalg',
        pris: 30, fremhaevet: false, udsolgt: false, sortering: 20, aktiv: true },
      { id: 21, kategori_id: 9, navn: 'Kaffe og kage', beskrivelse: null,
        pris: 65, fremhaevet: false, udsolgt: false, sortering: 21, aktiv: true },
    ]);
    await åbn(page, '/index.html', { data: grunddata({ menu_varer: varer }) });

    await expect(page.locator('#kage-priser .glass')).toHaveCount(2);
    await expect(page.locator('#kage-priser')).toContainText('Kaffe og kage 65,-');
  });

  test('dagens kugler er skjult når tavlen er tom', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#is')).toBeHidden();
  });

  test('kugler vises med farveprik', async ({ page }) => {
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        dagens_kugler: [{ navn: 'Jordbær', farve: '#f0c3bb' }, { navn: 'Pistacie', farve: '#c9d6b4' }],
      },
    });
    await åbn(page, '/index.html', { data });
    await expect(page.locator('#is')).toBeVisible();
    await expect(page.locator('#kugler-liste .chip')).toHaveCount(2);
    await expect(page.locator('#kugler-liste .chip i').first())
      .toHaveCSS('background-color', 'rgb(240, 195, 187)');
  });

  test('en farve der ikke er en farve kan ikke smugle CSS ind', async ({ page }) => {
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

test.describe('Hero: billede og video', () => {

  test('stillbilledet indlæses altid, i en størrelse der passer til skærmen', async ({ page }) => {
    await åbn(page, '/index.html');

    // naturalWidth måler IKKE filens bredde når der er brugt
    // srcset med w-beskrivelser – browseren korrigerer for
    // billedets tæthed i den plads det står i. Derfor tjekkes
    // complete og hvilken fil der blev valgt i stedet.
    const i = await page.locator('#hero-still').evaluate(el => ({
      klar: el.complete,
      fil: (el.currentSrc || '').split('/').pop(),
    }));
    expect(i.klar).toBe(true);
    expect(i.fil).toMatch(/^facade-(800|1400|2400)\.jpg$/);
  });

  test('MP4 står FØR WebM – ellers henter Chrome den største fil', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.waitForFunction(() => document.querySelectorAll('#hero-film source').length > 0);

    const typer = await page.locator('#hero-film source').evaluateAll(
      els => els.map(e => e.type));
    expect(typer).toEqual(['video/mp4', 'video/webm']);
  });

  test('videoen kommer i gang og tones frem', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#hero-film')).toHaveClass(/vis/, { timeout: 15000 });
    expect(await page.locator('#hero-film').evaluate(v => v.paused)).toBe(false);
  });

  test('reduceret bevægelse: ingen video hentes overhovedet', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const videoer = [];
    page.on('request', r => { if (/\.(mp4|webm)$/.test(r.url())) videoer.push(r.url()); });

    await åbn(page, '/index.html');
    await page.waitForTimeout(1200);

    expect(videoer).toEqual([]);
    // Stillbilledet står der stadig
    expect(await page.locator('#hero-still').evaluate(el => el.complete)).toBe(true);
  });
});

test.describe('Kontakt og adresse', () => {

  test('adressen kommer fra databasen', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#adresse')).toContainText('Havnevej 20');
    await expect(page.locator('#adresse')).toContainText('2670 Greve');
    await expect(page.locator('#footer-adresse')).toContainText('2670 Greve');
  });

  test('telefonnummeret kan trykkes på fire steder', async ({ page }) => {
    await åbn(page, '/index.html');
    for (const id of ['#ring', '#tel2', '#footer-tel', '#arr-ring']) {
      await expect(page.locator(id), id).toHaveAttribute('href', 'tel:+4528871343');
    }
    await expect(page.locator('#tel2')).toHaveText('28 87 13 43');
  });

  test('rute-linket peger på adressen', async ({ page }) => {
    await åbn(page, '/index.html');
    const href = await page.locator('#rute').getAttribute('href');
    expect(href).toContain('Havnevej%2020');
    expect(href).toContain('2670');
  });

  test('dagens besked vises kun når den er slået til', async ({ page }) => {
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
  });

  test('et klik i mobilmenuen lukker den', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await åbn(page, '/index.html');
    await page.locator('#burger').click();
    await page.locator('#ark a[href="#menu"]').click();
    await expect(page.locator('#ark')).toBeHidden();
  });

  test('bådstriben får en bredde – ellers falder den til 300px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await åbn(page, '/index.html');
    expect(await page.locator('#sail').evaluate(el => el.clientWidth)).toBeGreaterThan(1000);
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
    await expect(page.locator('#hours div')).toHaveCount(3);
    await expect(page.locator('#menu-liste')).toContainText(/ikke lagt noget ind/);
  });

  test('ingen fejl i konsollen ved almindelig indlæsning', async ({ page }) => {
    const fejl = [];
    page.on('pageerror', e => fejl.push(e.message));
    page.on('console', m => { if (m.type() === 'error') fejl.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) fejl.push('HTTP ' + r.status() + ' ' + r.url()); });

    await åbn(page, '/index.html');
    await page.locator('#find').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    expect(fejl).toEqual([]);
  });
});

test.describe('Filmen længere nede', () => {

  test('hentes ikke før man nærmer sig den', async ({ page }) => {
    const hentet = [];
    page.on('request', r => {
      if (/montage\.(mp4|webm)/.test(r.url())) hentet.push(r.url().split('/').pop());
    });

    await åbn(page, '/index.html');
    await page.waitForSelector('#montage-film');
    // Øverst på siden må der intet være hentet
    await page.waitForTimeout(600);
    expect(hentet, '1,1 MB blev hentet uden at nogen havde rullet derned').toEqual([]);

    await page.locator('#film').scrollIntoViewIfNeeded();
    await expect.poll(() => hentet.length, { timeout: 8000 }).toBeGreaterThan(0);
  });

  test('den spiller når den er i syne, og standser når den ikke er', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#film').scrollIntoViewIfNeeded();

    await expect.poll(async () => page.locator('#montage-film')
      .evaluate(v => !v.paused && v.currentTime > 0), { timeout: 15000 }).toBe(true);

    // Rul væk igen – så skal den standse af sig selv
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => page.locator('#montage-film')
      .evaluate(v => v.paused), { timeout: 8000 }).toBe(true);
  });

  test('den er tavs – ingen skal overfaldes af lyd', async ({ page }) => {
    await åbn(page, '/index.html');
    const tavs = await page.locator('#montage-film').evaluate(v => v.muted && v.loop);
    expect(tavs).toBe(true);
  });

  test('med reduceret bevægelse hentes den ikke, men kan vælges', async ({ page }) => {
    const hentet = [];
    page.on('request', r => { if (/montage\.(mp4|webm)/.test(r.url())) hentet.push(r.url()); });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await åbn(page, '/index.html');
    await page.locator('#film').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);

    expect(hentet, 'videoen blev hentet trods reduceret bevægelse').toEqual([]);
    // Men gæsten skal kunne se den hvis hun vil
    await expect(page.locator('#film-knap')).toBeVisible();
    await expect(page.locator('#montage-film')).toHaveAttribute('poster', /montage-poster/);
  });

  test('hero-videoen og montagen er to forskellige filer', async ({ page }) => {
    // Hero er facade-panoreringen alene. Lagde man hele montagen
    // der, ville overskriften stå på en lys vaniljekugle.
    await åbn(page, '/index.html');
    const kilder = await page.evaluate(() =>
      [...document.querySelectorAll('#hero-film source')].map(s => s.getAttribute('src')));
    expect(kilder.join(' ')).toContain('havnen');
    expect(kilder.join(' ')).not.toContain('montage');
  });
});

test.describe('Ankerlinks i topmenuen', () => {

  /* Topmenuen ligger fast øverst. Uden scroll-margin-top ruller et
     ankerlink sektionen helt op til kanten, og overskriften ender
     BAG menuen. Det så jeg først på et skærmbillede – testen her
     er billigere end at opdage det igen. */
  for (const [navn, link, overskrift] of [
    ['Menukort', 'a[href="#menu"]', '#menu h2'],
    ['Kager', 'a[href="#kager"]', '#kager h2'],
    ['Find os', 'a[href="#find"]', '#find h2'],
  ]) {
    test(`"${navn}" skjuler ikke overskriften bag menuen`, async ({ page }) => {
      await åbn(page, '/index.html');

      /* På en telefon er menupunkterne bag burgeren. Testen skal
         bruge den vej gæsten faktisk har, ikke en der kun findes
         på en stor skærm. */
      if (await page.locator('#burger').isVisible()) {
        await page.locator('#burger').click();
        await page.locator('#ark ' + link).click();
      } else {
        await page.locator('#hd ' + link).click();
      }

      // Rulningen er blød; vent på at den falder til ro
      await page.waitForTimeout(1200);

      const m = await page.evaluate((sel) => {
        const h = document.querySelector(sel).getBoundingClientRect();
        const hd = document.getElementById('hd').getBoundingClientRect();
        return { overskriftTop: h.top, menuBund: hd.bottom };
      }, overskrift);

      expect(m.overskriftTop,
        `overskriften ligger ${Math.round(m.menuBund - m.overskriftTop)}px bag topmenuen`)
        .toBeGreaterThanOrEqual(m.menuBund - 2);
    });
  }
});
