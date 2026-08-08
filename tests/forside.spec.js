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

    /* Havnestriben sagde det samme ("Lige nu · fredag / Åbent til
       21:00") 200 px længere ned og er fjernet. Der måles derfor kun
       på pillen – én kilde, ét sted at rette. */
  });

  test('før åbningstid står der hvornår vi åbner', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T07:30:00Z' }); // kl. 9.30
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket lige nu');
    await expect(page.locator('#hero-status-tekst')).toContainText('11:00');
    await expect(page.locator('#hero-status .dot')).toHaveClass(/lukket/);
  });

  test('efter lukketid peger den på næste dag', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T20:30:00Z' }); // kl. 22.30
    // Detaljen står i pillen selv: "Lukket for i dag · åbner i morgen 11:00"
    await expect(page.locator('#hero-status-tekst')).toContainText('Lukket for i dag');
    await expect(page.locator('#hero-status-tekst')).toContainText('Vi åbner i morgen kl. 11:00');
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

test.describe('Menuoversigten på forsiden', () => {

  /* Hele menukortet lå her før: 14 kategorier, 151 varer og 29
     slags smørrebrødsfyld. Det gjorde forsiden 5600 px lang på en
     telefon, og alt det der sælger stedet lå nedenunder hvor ingen
     kom hen. Testene for selve kortet er flyttet til
     menuside.spec.js sammen med kortet. */

  test('forsiden viser kategorier, ikke varer', async ({ page }) => {
    await åbn(page, '/index.html');

    const oversigt = page.locator('#menu-oversigt');
    await expect(oversigt).toContainText('Smørrebrød');
    await expect(oversigt).toContainText('Softice og vafler');

    // Ingen priser og ingen varenavne på forsiden
    await expect(oversigt).not.toContainText('Flæskestegssandwich');
    await expect(oversigt).not.toContainText(',-');
    // Og slet ikke det gamle menukort
    await expect(page.locator('#menu-liste')).toHaveCount(0);
    await expect(page.locator('#afd-mad')).toHaveCount(0);
  });

  test('hvert kort tæller sine kategorier og varer', async ({ page }) => {
    /* Tallene på kortene er det der gør afsnittet værd at læse, og
       de skal TÆLLES – ikke skrives i hånden, for så bliver de
       forkerte den dag personalet lægger en kategori ind.

       Testen tæller selv pillerne på kortet og sammenholder. */
    await åbn(page, '/index.html');
    await page.waitForSelector('#menu-oversigt .oversigt-navn');

    const kort = await page.evaluate(() =>
      [...document.querySelectorAll('#menu-oversigt .oversigt-kort')].map((k) => ({
        navn: k.querySelector('.oversigt-navn').textContent,
        tal: k.querySelector('.oversigt-tal').textContent,
        piller: k.querySelectorAll('.oversigt-liste a').length,
      })));

    expect(kort.length, 'der skal være et kort pr. afdeling').toBeGreaterThan(1);

    for (const k of kort) {
      const tal = k.tal.match(/^(\d+) kategori(?:er)? · (\d+) vare[r]?$/);
      expect(tal, `linjen på "${k.navn}" har ikke formen "7 kategorier · 84 varer": ${k.tal}`)
        .not.toBeNull();
      expect(Number(tal[1]), `"${k.navn}" siger ${tal[1]} kategorier men viser ${k.piller} piller`)
        .toBe(k.piller);
      expect(Number(tal[2]), `"${k.navn}" har 0 varer og skulle slet ikke stå der`)
        .toBeGreaterThan(0);
    }
  });

  test('der loves ingen "fra"-pris på forsiden', async ({ page }) => {
    /* Første udgave skrev "fra 25,-" på hvert kort, regnet som den
       laveste pris i afdelingen. Det var sandt og alligevel
       vildledende: den billigste vare under Is og desserter er en
       løs vaffel til 4 kr., så kortet ville love "fra 4,-" om en
       afdeling hvor en is koster 30.

       Et tal der er rigtigt og giver et forkert indtryk, er værre
       end intet tal. Testen står her, så det ikke bliver fundet på
       igen. */
    await åbn(page, '/index.html');
    await page.waitForSelector('#menu-oversigt .oversigt-navn');
    const tekst = await page.locator('#menu-oversigt').innerText();
    expect(tekst, 'der er kommet en pris tilbage på menuoversigten').not.toMatch(/\bfra \d/);
  });

  test('kategorierne peger på den rigtige afdeling på menusiden', async ({ page }) => {
    await åbn(page, '/index.html');

    const is = page.locator('#menu-oversigt a', { hasText: 'Softice og vafler' });
    await expect(is).toHaveAttribute('href', /menu\.html\?afd=is#kat-/);
  });

  test('en tom kategori loves ikke på forsiden', async ({ page }) => {
    /* En kategori uden varer må ikke stå der: gæsten trykker på
       "Pølser" og lander på en tom afdeling. */
    const data = grunddata();
    data.menu_kategorier.push({
      id: 99, afdeling: 'mad', navn: 'Pølser', sortering: 5, aktiv: true,
    });
    await åbn(page, '/index.html', { data });

    await expect(page.locator('#menu-oversigt')).not.toContainText('Pølser');
  });

  test('knappen fører til hele menukortet', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#menu a[href="menu.html"]').first().click();
    await expect(page).toHaveURL(/menu\.html/);
    await expect(page.locator('h1')).toContainText('Menukortet');
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

  /* Nummeret stod fire steder på forsiden. Ét af dem, #tel2, stod
     under et TELEFON-mærkat lige ved siden af knappen "Ring 28 87 13
     43" i samme kort — den samme oplysning to gange inden for 80 px.
     Det er væk. De tre der er tilbage, står hver sit sted: ved
     adressen, i footeren og i arrangement-afsnittet.

     Testen tjekker at nummeret står SKREVET på ring-knappen og ikke
     kun i href'en. "Ring til os" med nummeret skjult i linket gør at
     man skal trykke for at se hvad man ringer til. */
  test('telefonnummeret kan trykkes på tre steder', async ({ page }) => {
    await åbn(page, '/index.html');
    for (const id of ['#ring', '#footer-tel', '#arr-ring']) {
      await expect(page.locator(id), id).toHaveAttribute('href', 'tel:+4528871343');
    }
    await expect(page.locator('#ring')).toHaveText('Ring 28 87 13 43');
    await expect(page.locator('#footer-tel')).toHaveText('28 87 13 43');
    await expect(page.locator('#tel2'), 'det dobbelte nummer er tilbage').toHaveCount(0);
  });

  /* Adressen stod også to steder: i linjen under "Find os" og i
     kortet nedenunder. Nu står den i kortet, og linjen siger hvor man
     skal kigge hen. */
  test('adressen står ét sted i Find os', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#adresse')).toContainText('Havnevej 20');
    await expect(page.locator('#find-under')).not.toContainText('Havnevej');
    await expect(page.locator('#find-under')).not.toContainText('2670');
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

  /* "DER ER INGEN ANIMATIONER" var kundens klage, og den var svær at
     modbevise: koden HAVDE animationer, de var bare så små at ingen
     lagde mærke til dem.

     Disse tests måler at bevægelsen faktisk finder sted – ikke at der
     står en transition i CSS'en, men at værdien ER anderledes før og
     efter. En transition med varigheden 0, en delay der aldrig
     udløber, eller en klasse der ikke bliver sat, ville alle bestå en
     test der kun læste CSS. */
  test('afsnittene rykker sig og bogstaverne trækker sig sammen', async ({ page }) => {
    await åbn(page, '/index.html');

    function maal() {
      return page.evaluate(() => {
        const h = document.querySelector('#find .head h2');
        return {
          luft: parseFloat(getComputedStyle(h).letterSpacing) || 0,
          synlig: Number(getComputedStyle(document.querySelector('#find .head')).opacity),
          streg: parseFloat(getComputedStyle(h, '::after').width) || 0,
        };
      });
    }

    // FØR afsnittet er i syne
    const foer = await maal();
    expect(foer.synlig, 'afsnittet er synligt før man ruller derned').toBeLessThan(0.5);
    expect(foer.luft, 'overskriften har ingen ekstra bogstavluft at trække sammen')
      .toBeGreaterThan(0.5);
    expect(foer.streg, 'stregen under overskriften er tegnet på forhånd').toBeLessThan(2);

    await page.locator('#find').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1700);       // længere end den længste overgang

    const efter = await maal();
    expect(efter.synlig, 'afsnittet blev ikke synligt').toBeGreaterThan(0.95);
    expect(efter.luft, 'bogstaverne trak sig ikke sammen').toBeLessThan(foer.luft);
    expect(efter.streg, 'stregen under overskriften blev ikke tegnet').toBeGreaterThan(40);
  });

  test('heroen lander når introen slipper siden', async ({ page }) => {
    /* Alt andet toner ind når man ruller til det. Heroen kunne ikke:
       den ER der når introen letter, og stod derfor helt færdig i
       netop det øjeblik hvor gæsten kigger mest. */
    await åbn(page, '/index.html');
    await expect(page.locator('body')).toHaveClass(/klar/);
    await page.waitForTimeout(1600);

    const svar = await page.evaluate(() => ({
      luft: parseFloat(getComputedStyle(document.querySelector('.hero h1')).letterSpacing) || 0,
      synlig: Number(getComputedStyle(document.querySelector('.hero h1')).opacity),
      hint: Number(getComputedStyle(document.querySelector('.scrollhint')).opacity),
    }));
    expect(svar.synlig, 'heroens overskrift blev aldrig synlig').toBeGreaterThan(0.95);
    expect(Math.abs(svar.luft), 'heroens bogstaver står stadig med indflyvningens luft')
      .toBeLessThan(0.6);
    expect(svar.hint, '"Rul ned" kom aldrig frem').toBeGreaterThan(0.95);
  });

  test('med reduceret bevægelse står alt stille OG synligt', async ({ page }) => {
    /* Den farligste fejl ved en indtoning: glemmer man én af dem i
       reduced-motion-blokken, står der et TOMT afsnit hos den gæst
       der har slået bevægelse fra. Der måles på hver af de nye. */
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await åbn(page, '/index.html');

    const svar = await page.evaluate(() => {
      const g = (v) => Number(getComputedStyle(document.querySelector(v)).opacity);
      const h = document.querySelector('#find .head h2');
      return {
        hero: g('.hero-in > *'),
        heroLuft: parseFloat(getComputedStyle(document.querySelector('.hero h1')).letterSpacing) || 0,
        find: g('#find .head'),
        streg: parseFloat(getComputedStyle(h, '::after').width) || 0,
        hint: g('.scrollhint'),
      };
    });

    expect(svar.hero, 'heroens indhold er usynligt').toBeGreaterThan(0.95);
    expect(Math.abs(svar.heroLuft), 'heroens bogstaver står med indflyvningsluft')
      .toBeLessThan(0.6);
    expect(svar.find, 'afsnittet er usynligt, og man kan ikke rulle det frem')
      .toBeGreaterThan(0.95);
    expect(svar.streg, 'stregen under overskriften mangler').toBeGreaterThan(40);
    expect(svar.hint, '"Rul ned" er usynlig').toBeGreaterThan(0.95);
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
    await page.locator('#ark a[href="#find"]').click();
    await expect(page.locator('#ark')).toBeHidden();
  });

  test('bådstriben får en bredde – ellers falder den til 300px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await åbn(page, '/index.html');
    expect(await page.locator('#sail').evaluate(el => el.clientWidth)).toBeGreaterThan(1000);
  });
});

test.describe('Sikkerhed og robusthed', () => {

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

test.describe('Videoen i hero', () => {

  /* Turen forbi lugerne lå før i sit eget afsnit længere nede.
     Nu er det den man møder først, og det gamle afsnit er væk.
     Det stiller to nye krav:

     1) Den må ikke hentes mens introen kører. Introen kommer ved
        hvert besøg, og 1,3 MB video ned ad linjen samtidig gør
        animationen hakkende.
     2) Overskriften står oven på den. Videoen har lyse steder –
        kagerne og softicen – så sløret skal bære hele vejen.
        Det måles for sig i kontrast.spec.js. */

  test('den hentes ikke mens introen kører', async ({ page }) => {
    const hentet = [];
    page.on('request', (r) => {
      if (/hero\.(mp4|webm)/.test(r.url())) hentet.push(r.url().split('/').pop());
    });

    // intro: true – introen får lov at køre
    await åbn(page, '/index.html', { intro: true });
    await expect(page.locator('#intro')).toBeVisible();
    expect(hentet, 'videoen blev hentet mens introen kørte').toEqual([]);

    // Når introen er væk, skal den komme
    await page.locator('#intro-spring').click();
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 3000 });
    await expect.poll(() => hentet.length, { timeout: 10000 }).toBeGreaterThan(0);
  });

  test('det er turen forbi lugerne, og MP4 kommer først', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#hero-film source')).toHaveCount(2, { timeout: 12000 });

    const kilder = await page.evaluate(() =>
      [...document.querySelectorAll('#hero-film source')].map((s) => s.getAttribute('src')));
    expect(kilder[0]).toContain('hero.mp4');
    expect(kilder[1]).toContain('hero.webm');
    // De gamle filer skal være helt væk
    expect(kilder.join(' ')).not.toContain('havnen');
    expect(kilder.join(' ')).not.toContain('montage');
  });

  test('den er tavs og kører i ring', async ({ page }) => {
    await åbn(page, '/index.html');
    const ok = await page.locator('#hero-film').evaluate((v) => v.muted && v.loop);
    expect(ok).toBe(true);
  });

  test('stillbilledet ligger under, så der aldrig er et sort hul', async ({ page }) => {
    await åbn(page, '/index.html');
    // Facaden er videoens første sekund, så skiftet ikke kan ses
    await expect(page.locator('#hero-still')).toHaveAttribute('src', /facade-/);

    /* Og videoen har INGEN poster. Et poster-billede hentes med
       det samme, også med preload="none", og dette ville aldrig
       blive set: fotoet ligger oven på det indtil videoen kører.
       Det kostede 119 kB ved hvert besøg. */
    expect(await page.locator('#hero-film').getAttribute('poster')).toBeNull();
  });

  test('med reduceret bevægelse hentes den slet ikke', async ({ page }) => {
    const hentet = [];
    page.on('request', (r) => { if (/hero\.(mp4|webm)/.test(r.url())) hentet.push(r.url()); });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await åbn(page, '/index.html');
    await page.waitForTimeout(1500);

    expect(hentet, 'videoen blev hentet trods reduceret bevægelse').toEqual([]);
    // Men fotoet skal stå der
    await expect(page.locator('#hero-still')).toBeVisible();
  });

  test('det gamle filmafsnit er væk', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('#film')).toHaveCount(0);
    await expect(page.locator('#montage-film')).toHaveCount(0);
  });
});

test.describe('Ankerlinks i topmenuen', () => {

  /* Topmenuen ligger fast øverst. Uden scroll-margin-top ruller et
     ankerlink sektionen helt op til kanten, og overskriften ender
     BAG menuen. Det så jeg først på et skærmbillede – testen her
     er billigere end at opdage det igen. */
  for (const [navn, link, overskrift] of [
    ['Is og kager', 'a[href="#isen"]', '#isen h2'],
    ['Arrangementer', 'a[href="#arrangement"]', '#arrangement h2'],
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
