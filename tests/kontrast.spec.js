/* Kan man læse det?

   Denne fil regner efter i browseren i stedet for at stole på
   øjet. Kravet er WCAG AA: 4,5:1 til almindelig tekst, 3:1 til
   stor tekst (24px, eller 18,7px hvis den er fed).

   Det er ikke en formalitet. Gæsterne læser siden på en telefon
   i skarpt sollys på en havn, og designet bruger halvgennem-
   sigtige glasflader hvor det er umuligt at gætte resultatet.

   ------------------------------------------------------------
   MÅLINGEN BLANDER GENNEMSIGTIGHED SAMMEN
   ------------------------------------------------------------
   Første udgave af denne fil behandlede rgba(15,44,68,.07) som
   massiv marineblå. Den meldte 1,9:1 på en fane der i
   virkeligheden ligger på 8:1, og den ville have tvunget mig til
   at "rette" noget der var i orden.

   Nu lægges lagene oven på hinanden med deres alfa – både
   baggrundene opad gennem forældrene og tekstens egen farve.
   Ellers kan man ikke måle et design der er bygget på glas.
*/

const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata } = require('./hjaelp');

const MAALER = () => {
  window.__kontrast = function (vaelger, antaget) {
    function tal(farve) {
      var m = String(farve).match(/[\d.]+/g);
      return m ? m.map(Number) : null;
    }
    function lin(v) {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    function lum(c) {
      return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    }
    // Lægger farve (med alfa) oven på en massiv bund
    function over(farve, alfa, bund) {
      return [
        farve[0] * alfa + bund[0] * (1 - alfa),
        farve[1] * alfa + bund[1] * (1 - alfa),
        farve[2] * alfa + bund[2] * (1 - alfa),
      ];
    }

    /* Alle baggrunde op gennem forældrene, indtil en er massiv.

       Bunden er hvid hvis ingen forælder er massiv. Til tekst der
       ligger oven på et foto bruges denne funktion ikke – se
       antaget nedenfor. */
    function bagved(el) {
      var lag = [], n = el;
      while (n && n.nodeType === 1) {
        var bg = tal(getComputedStyle(n).backgroundColor);
        if (bg) {
          var a = bg.length > 3 ? bg[3] : 1;
          if (a > 0) {
            lag.push({ c: bg, a: a });
            if (a >= 1) break;
          }
        }
        n = n.parentElement;
      }
      // Fra bagerst mod forrest
      var ud = [255, 255, 255];
      for (var i = lag.length - 1; i >= 0; i--) ud = over(lag[i].c, lag[i].a, ud);
      return ud;
    }

    var ud = [];
    document.querySelectorAll(vaelger).forEach(function (el) {
      var s = getComputedStyle(el);
      if (!el.textContent.trim()) return;
      if (s.visibility === 'hidden' || s.display === 'none') return;
      if (!el.getClientRects().length) return;

      /* Er der givet en antaget bund, ligger elementet oven på et
         foto. Så må forældrenes baggrunde IKKE tælle med – body er
         sandfarvet, men det er ikke det man ser bag en fast
         topmenu eller bag et slør. Kun elementets eget lag lægges
         ovenpå, så en glas-pille stadig måles som glas. */
      var b;
      if (antaget) {
        var eg = tal(s.backgroundColor);
        var ea = eg ? (eg.length > 3 ? eg[3] : 1) : 0;
        b = ea > 0 ? over(eg, ea, antaget) : antaget;
      } else {
        b = bagved(el);
      }
      var f = tal(s.color);
      // Tekst kan også være halvgennemsigtig – fx hvid @ 78%
      var fa = f.length > 3 ? f[3] : 1;
      var fs = over(f, fa, b);

      var lf = lum(fs), lb = lum(b);
      var forhold = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);

      var px = parseFloat(s.fontSize);
      var fed = parseInt(s.fontWeight, 10) >= 700;
      var stor = px >= 24 || (fed && px >= 18.66);

      ud.push({
        tekst: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 34),
        forhold: Math.round(forhold * 100) / 100,
        kraev: stor ? 3 : 4.5,
        px: Math.round(px * 10) / 10,
      });
    });
    return ud;
  };
};

/* antagetBg: en massiv farve [r,g,b] der bruges i stedet for at
   kigge op gennem forældrene. Kun til tekst der ligger oven på et
   foto med et slør henover, hvor DOM'en ikke ved hvad der males
   bagved. */
async function tjek(page, vælgere, antagetBg) {
  await page.evaluate(MAALER);
  const daarlige = [];
  for (const v of vælgere) {
    const rk = await page.evaluate(
      ([s, a]) => window.__kontrast(s, a), [v, antagetBg || null]);
    rk.forEach((r) => {
      if (r.forhold < r.kraev) {
        daarlige.push(`${v} → "${r.tekst}" ${r.forhold}:1 (krav ${r.kraev}, ${r.px}px)`);
      }
    });
  }
  return daarlige;
}

/* Kontrol af selve måleren. Uden denne kunne alle de andre
   tests "bestå" fordi måleren var i stykker. */
test('måleren regner rigtigt på kendte par', async ({ page }) => {
  await åbn(page, '/index.html');
  await page.evaluate(MAALER);

  const svar = await page.evaluate(() => {
    var d = document.createElement('div');
    // Sort på hvid = 21:1. Halvgennemsigtig sort på hvid = ca. 5:1.
    d.innerHTML = '<div style="background:#fff"><span id="t1" style="color:#000">A</span>'
      + '<span id="t2" style="color:rgba(0,0,0,.5)">B</span>'
      + '<span id="t3" style="color:#fff">C</span></div>';
    document.body.appendChild(d);
    var r = {
      sortPaaHvid: window.__kontrast('#t1')[0].forhold,
      halvSortPaaHvid: window.__kontrast('#t2')[0].forhold,
      hvidPaaHvid: window.__kontrast('#t3')[0].forhold,
    };
    d.remove();
    return r;
  });

  expect(svar.sortPaaHvid).toBeCloseTo(21, 0);
  expect(svar.hvidPaaHvid).toBeCloseTo(1, 1);
  // Sort @ 50% over hvid bliver #808080 → ca. 3,95:1
  expect(svar.halvSortPaaHvid).toBeGreaterThan(3.5);
  expect(svar.halvSortPaaHvid).toBeLessThan(4.5);
});

test.describe('Forsiden kan læses', () => {

  /* Tekst på massive flader. Her kan måleren selv finde bunden. */
  const SOLIDE = [
    '.status .k', '.status .v', '.status .v small',
    '.head h2', '.head p',
    '.reason .n', '.reason h3', '.reason p',
    '.card h3', '.card .desc',
    '.chip', '.flav h2',
    '.hours div span',
    'footer h3', 'footer a', '.fcol b', '.fine',
    '.stat b', '.stat span',
  ];

  /* Tekst der ligger OVEN PÅ et foto med et slør henover.
     ------------------------------------------------------------
     DOM'en kan ikke se hvad der males bagved, så vi måler mod den
     VÆRST TÆNKELIGE bund: sløret lagt over et helt hvidt billede.
     Klarer teksten det, klarer den ethvert foto.

     Tallene er sløret ved den højde hvor teksten faktisk står:
       topmenu     rgba(15,44,68,.78) over hvid  →  #4b6173
       hero-bund   rgba(15,44,68,.92) over hvid  →  #223d53
       luge-bund   rgba(15,44,68,.88) over hvid  →  #2c455a
       citat       rgba(15,44,68,.86) over hvid  →  #2f4860 */
  const PAA_FOTO = [
    [['.logo', 'header nav a'], [0x4b, 0x61, 0x73]],
    [['.hero-row p', '.scrollhint', '#hero-status-tekst', '.hero h1'], [0x22, 0x3d, 0x53]],
    [['.pane h3', '.pane p', '.pane .eyebrow'], [0x2c, 0x45, 0x5a]],
    [['.wide blockquote'], [0x2f, 0x48, 0x60]],
  ];

  test('åbent, med indhold i alle sektioner', async ({ page }) => {
    const g = grunddata();
    const varer = g.menu_varer.concat([{
      id: 9, kategori_id: 1, navn: 'Udsolgt ting', beskrivelse: 'Noget der er væk.',
      pris: 60, fremhaevet: true, udsolgt: true, sortering: 9, aktiv: true,
    }]);
    const data = grunddata({
      menu_varer: varer,
      lukkedage: [{ id: 1, lokation_id: 'mosede', dato: '2026-12-24', aarsag: 'Juleaften', emoji: '🎄' }],
      indstillinger: {
        ...g.indstillinger,
        dagens_kugler: [{ navn: 'Jordbær', farve: '#f0c3bb' }, { navn: 'Pistacie', farve: '#c9d6b4' }],
        noegletal: [{ tal: '18', tekst: 'slags kugleis' }, { tal: '10–20', tekst: 'grillen er tændt' }],
        vandtemp: '17,2 °C', vind: '6 m/s V', landing: 'Rødspætte',
      },
    });

    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z', data });
    await page.waitForSelector('#menu-liste .card');
    await page.waitForSelector('#kugler-liste .chip');

    expect(await tjek(page, SOLIDE)).toEqual([]);

    // Og teksten oven på fotoerne, målt mod værst tænkelige billede
    for (const [vælgere, bund] of PAA_FOTO) {
      expect(await tjek(page, vælgere, bund), 'på foto: ' + vælgere.join(', ')).toEqual([]);
    }
  });

  test('nøgletallene', async ({ page }) => {
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        noegletal: [{ tal: '18', tekst: 'slags kugleis på tavlen' }],
      },
    });
    await åbn(page, '/index.html', { data });
    await page.waitForSelector('#stats .stat');
    expect(await tjek(page, ['.stat b', '.stat span'])).toEqual([]);
  });

  test('lukket – pillen skifter, men skal stadig kunne læses', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T20:30:00Z' });
    await page.waitForFunction(
      () => !document.getElementById('hero-status-tekst').textContent.includes('Henter'));

    expect(await tjek(page, ['#hero-status-tekst', '.status .v', '.status .v small'])).toEqual([]);
  });

  test('i dag-linjen i åbningstiderne', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z' });
    await page.waitForSelector('#hours div.now');
    expect(await tjek(page, ['#hours div.now span'])).toEqual([]);
  });

  test('dagens besked og advarslen om manglende forbindelse', async ({ page }) => {
    const data = grunddata({
      indstillinger: {
        ...grunddata().indstillinger,
        dagens_besked: { vis: true, tekst: 'Kontanter virker ikke i dag.' },
      },
    });
    await åbn(page, '/index.html', { data });
    await page.waitForSelector('#dagens-besked:not(.skjult)');
    await page.evaluate(() => document.getElementById('offline-advarsel').classList.remove('skjult'));

    expect(await tjek(page, ['#dagens-besked', '#offline-advarsel'])).toEqual([]);
  });

  test('mobilmenuen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await åbn(page, '/index.html');
    await page.locator('#burger').click();
    await page.waitForSelector('#ark.aaben');

    expect(await tjek(page, ['.ark a', '.ark-luk'])).toEqual([]);
  });
});

test.describe('Personalesiden kan læses', () => {

  test('faner, felter og beskeder', async ({ page }) => {
    await åbnAdmin(page);
    await page.waitForSelector('#tider-felter .admin-raekke');

    expect(await tjek(page, [
      '.top-navn', '.top nav a',
      '.faner button', 'label', '.hjaelp', '.afkryds',
      '.h-arbejde', '.h-panel', '.vare-tekst', '.besked', '.knap', '#hvem',
    ])).toEqual([]);
  });

  test('kvittering og fejlbesked', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('#gem-tider').click();
    await page.waitForSelector('#kvittering:not(.skjult)');
    expect(await tjek(page, ['#kvittering'])).toEqual([]);

    await page.locator('[data-rolle="til"][data-ugedag="0"]').fill('09:00');
    await page.locator('#gem-tider').click();
    await page.waitForSelector('#fejl:not(.skjult)');
    expect(await tjek(page, ['#fejl'])).toEqual([]);
  });

  test('Forside-fanen med sine forklaringer', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('[data-panel="p-forside"]').click();
    await page.waitForSelector('#kugler');

    expect(await tjek(page, ['#p-forside .vare-tekst', '#p-forside label', '#p-forside code'])).toEqual([]);
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

  test('tælleren, beskeden og spring-over', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });
    await page.waitForSelector('#intro-pct');

    expect(await tjek(page, ['.intro-hud .msg', '.intro-hud .pct', '#intro-spring'])).toEqual([]);
  });
});
