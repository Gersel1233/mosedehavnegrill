/* Kan man læse det?

   Denne fil regner efter i browseren i stedet for at stole på
   øjet. Den fandt allerede to fejl der var umulige at se:
   cremehvid overskrift på et hvidt kort, og en dæmpet grå der
   kun nåede 3,5 mod cremebaggrunden.

   Kravet er WCAG AA: 4,5 til almindelig tekst, 3,0 til stor
   tekst (24px, eller 18,7px hvis den er fed). Det er ikke en
   formalitet – det er en grillbar hvis gæster læser siden på en
   telefon i skarpt sollys på en havn.
*/

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata } = require('./hjaelp');

/* Lægges ind i siden. Finder den FAKTISKE baggrund bag et
   element – den nærmeste forfader der har en farve, for et
   element med gennemsigtig baggrund arver den bagfra. */
const MAALER = () => {
  window.__kontrast = function (vaelger) {
    function tal(farve) {
      var m = farve.match(/[\d.]+/g);
      return m ? m.map(Number) : null;
    }
    function lin(v) {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    function lum(c) {
      return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    }
    function bagved(el) {
      var n = el;
      while (n && n !== document.documentElement) {
        var bg = tal(getComputedStyle(n).backgroundColor);
        // alpha 0 = gennemsigtig, så kig videre opad
        if (bg && (bg.length < 4 || bg[3] > 0)) return bg;
        n = n.parentElement;
      }
      return [255, 255, 255];
    }

    var ud = [];
    document.querySelectorAll(vaelger).forEach(function (el) {
      var s = getComputedStyle(el);
      if (!el.textContent.trim()) return;
      if (s.visibility === 'hidden' || s.display === 'none') return;

      var f = tal(s.color), b = bagved(el);
      var lf = lum(f), lb = lum(b);
      var forhold = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);

      var px = parseFloat(s.fontSize);
      var fed = parseInt(s.fontWeight, 10) >= 700;
      var stor = px >= 24 || (fed && px >= 18.66);

      ud.push({
        tekst: el.textContent.trim().slice(0, 30),
        forhold: Math.round(forhold * 100) / 100,
        kraev: stor ? 3 : 4.5,
        px: px,
      });
    });
    return ud;
  };
};

async function tjek(page, vælgere) {
  await page.evaluate(MAALER);
  const daarlige = [];
  for (const v of vælgere) {
    const rk = await page.evaluate((s) => window.__kontrast(s), v);
    rk.forEach((r) => {
      if (r.forhold < r.kraev) {
        daarlige.push(`${v} → "${r.tekst}" ${r.forhold}:1 (krav ${r.kraev}, ${r.px}px)`);
      }
    });
  }
  return daarlige;
}

test.describe('Forsiden kan læses', () => {

  const VÆLGERE = [
    '.top-navn', '.top nav a',
    '.status-ord', '.status-detalje',
    '.hero h1', '.hero .under',
    '.oeje', 'h2',
    '.kort h3', '.kort p', '.kort a',
    '.tider th', '.tider td',
    '.vare-tekst', '.vare-pris',
    '.besked', '.nyhed-dato',
    'footer h3', 'footer p', 'footer a', '.footer-bund',
  ];

  test('åbent – gult bånd', async ({ page }) => {
    const data = grunddata({
      nyheder: [{ id: 1, titel: 'Nyt', tekst: 'Noget nyt fra køkkenet.', dato: '2026-08-05', aktiv: true }],
      indstillinger: { ...grunddata().indstillinger, dagens_besked: { vis: true, tekst: 'En besked.' } },
      lukkedage: [{ id: 1, lokation_id: 'mosede', dato: '2026-12-24', aarsag: 'Juleaften', emoji: '🎄' }],
    });
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z', data });
    await page.waitForSelector('#favoritter-liste .kort');

    expect(await tjek(page, VÆLGERE)).toEqual([]);
  });

  test('lukket – rødt bånd', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T20:30:00Z' });
    await page.waitForFunction(() => !document.querySelector('#status').textContent.includes('Henter'));

    expect(await tjek(page, ['.status-ord', '.status-detalje'])).toEqual([]);
  });

  test('snart lukket – mørkt bånd med gult', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T18:45:00Z' });
    await page.waitForFunction(() => document.querySelector('#status').className.includes('snart'));

    expect(await tjek(page, ['.status-ord', '.status-detalje'])).toEqual([]);
  });

  test('i dag-rækken i åbningstiderne', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.waitForSelector('#tider-krop tr.i-dag');

    expect(await tjek(page, ['.tider tr.i-dag th', '.tider tr.i-dag td'])).toEqual([]);
  });
});

test.describe('Menukortet kan læses', () => {

  test('varer, priser og mærkater', async ({ page }) => {
    const varer = grunddata().menu_varer.concat([{
      id: 9, kategori_id: 1, navn: 'Udsolgt ting', beskrivelse: 'Noget der er væk.',
      pris: null, fremhaevet: false, udsolgt: true, sortering: 9, aktiv: true,
    }]);
    await åbn(page, '/menu.html', { data: grunddata({ menu_varer: varer }) });
    await page.waitForSelector('.vare');

    expect(await tjek(page, [
      '.hero h1', '.hero .under', '.oeje',
      '.menu-gruppe h3', '.vare-navn', '.vare-tekst', '.vare-pris',
      '.maerke', '.knap', '.footer-bund', '.footer-bund a',
    ])).toEqual([]);
  });
});

test.describe('Personalesiden kan læses', () => {

  test('faner, felter og beskeder', async ({ page }) => {
    await åbnAdmin(page);
    await page.waitForSelector('#tider-felter .admin-raekke');

    expect(await tjek(page, [
      '.faner button', 'label', '.hjaelp', '.afkryds',
      '.h-arbejde', '.h-panel', '.vare-tekst', '.besked', '.knap',
    ])).toEqual([]);
  });

  test('kvittering og fejlbesked', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('#gem-tider').click();
    await page.waitForSelector('#kvittering:not(.skjult)');
    expect(await tjek(page, ['#kvittering'])).toEqual([]);

    // Fremtving en fejl
    await page.locator('[data-rolle="til"][data-ugedag="0"]').fill('09:00');
    await page.locator('#gem-tider').click();
    await page.waitForSelector('#fejl:not(.skjult)');
    expect(await tjek(page, ['#fejl'])).toEqual([]);
  });

  test('slet-knappen skal kunne ses, selv om den er dæmpet', async ({ page }) => {
    // Den er med vilje kun et omrids, så den ikke inviterer til
    // fejlklik. Men "dæmpet" må ikke betyde "ulæselig".
    await åbnAdmin(page);
    await page.locator('[data-panel="p-menu"]').click();
    await page.waitForSelector('#menu-redigering .knap.fare');

    expect(await tjek(page, ['.admin-raekke .knap.fare'])).toEqual([]);
  });
});

test.describe('Introen kan læses', () => {

  test('tælleren og beskeden mod himlen', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });
    await page.waitForSelector('#intro-pct');

    expect(await tjek(page, ['.intro-hud .msg', '.intro-hud .pct', '#intro-spring'])).toEqual([]);
  });
});
