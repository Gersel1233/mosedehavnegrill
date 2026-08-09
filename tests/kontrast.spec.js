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
    /* Havnestriben er væk – dens .k og .v stod her. */
    '.head h2', '.head p', '.eyebrow',
    /* Smørrebrødsblokken. Den erstattede favoritkortene, som blev
       målt her med '.fav h3', '.fav .desc' og '.fav-pris'. */
    '.smoer-navn', '.smoer-desc', '.smoer-pris', '.smoer-fyld',
    '.oversigt-navn', '.oversigt-tal',
    '.kat > h2', '.linje .navn', '.linje .desc', '.linje-pris',
    '.valg-en', '.note',
    '.chip', '.flav h2', '.flav p',
    '.split-tekst h2', '.split-tekst p',
    '.hours div span',
    '.adresse', '.kontakt-kort a',
    'footer h3', 'footer a', '.fcol b', '.fine',
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
    [['.hero-row p', '.scrollhint', '#hero-status-tekst', '.hero h1', '.hero .eyebrow'],
      [0x22, 0x3d, 0x53]],
    // .wide-tekst er væk: billedet i fuld bredde med teksten
    // "Trædækket på Mosede Havn" hen over er fjernet.
  ];

  test('åbent, med indhold i alle sektioner', async ({ page }) => {
    const g = grunddata();
    const varer = g.menu_varer.concat([
      { id: 9, kategori_id: 1, navn: 'Udsolgt ting', beskrivelse: 'Noget der er væk.',
        pris: 60, fremhaevet: true, udsolgt: true, sortering: 9, aktiv: true },
      { id: 21, kategori_id: 9, navn: 'Kaffe og kage', beskrivelse: null,
        pris: 65, fremhaevet: false, udsolgt: false, sortering: 21, aktiv: true },
    ]);
    const data = grunddata({
      menu_varer: varer,
      lukkedage: [{ id: 1, lokation_id: 'mosede', dato: '2026-12-24', aarsag: 'Juleaften', emoji: '🎄' }],
      indstillinger: {
        ...g.indstillinger,
        dagens_kugler: [{ navn: 'Jordbær', farve: '#f0c3bb' }, { navn: 'Pistacie', farve: '#c9d6b4' }],
      },
    });

    await åbn(page, '/index.html', { ur: '2026-08-07T11:00:00Z', data });
    await page.waitForSelector('#menu-oversigt .oversigt-navn');
    await page.waitForSelector('#kugler-liste .chip');

    expect(await tjek(page, SOLIDE)).toEqual([]);

    // Og teksten oven på fotoerne, målt mod værst tænkelige billede
    for (const [vælgere, bund] of PAA_FOTO) {
      expect(await tjek(page, vælgere, bund), 'på foto: ' + vælgere.join(', ')).toEqual([]);
    }
  });

  test('lukket – pillen skifter, men skal stadig kunne læses', async ({ page }) => {
    await åbn(page, '/index.html', { ur: '2026-08-07T20:30:00Z' });
    await page.waitForFunction(
      () => !document.getElementById('hero-status-tekst').textContent.includes('Henter'));

    expect(await tjek(page, ['#hero-status-tekst'])).toEqual([]);
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

  /* TOPMENUEN HAR TO TILSTANDE, OG DEN ANDEN VAR ALDRIG MÅLT.

     PAA_FOTO ovenfor måler menupunkterne oven på hero-fotoet, hvor de
     er hvide. Så snart man har rullet 60 px, bliver bjælken til
     sandfarvet glas, og teksten skal skifte til mørkeblå.

     Det gjorde den ikke. Skiftet hed "header.stuck nav a" og vejede
     (0,2,3); reglen der satte den hvide farve, fik et id og vejede
     (1,1,3). Menupunkterne blev derfor hvide på en næsten hvid
     flade — 1,05:1 — på hver side, hele vejen ned. Ingen så det,
     fordi menupunkterne er skjulte på en telefon, og det er telefonen
     man kigger på.

     Undersiderne måles med, for dér er bjælken glas fra første
     sekund: man lander på menukortet med menuen allerede lys. */
  test('topmenuen når den er blevet glas – også på undersiderne', async ({ page }) => {
    for (const side of ['/index.html', '/menu.html', '/smoerrebroed-ud-af-huset/']) {
      await åbn(page, side);
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForFunction(
        () => document.getElementById('hd').classList.contains('stuck'));
      // Farveskiftet er en overgang på .4s
      await page.waitForTimeout(500);

      expect(await tjek(page, ['#hd nav a', '#hd .logo']), 'topmenuen på ' + side)
        .toEqual([]);
    }
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

test.describe('Bestillingsformularen kan læses', () => {

  /* Den ene formular en gæst møder, og den skal kunne udfyldes i
     sollys nede ved havnen. Fejlbeskederne måles for sig: de er dem
     man SKAL kunne læse, og de er skrevet i --red-tekst netop fordi
     den lyse --red kun giver 4,0:1 mod sand. */
  const UR = '2026-08-06T11:00:00Z';

  test('felter, piller, dage og kvitteringslinje', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/', { ur: UR });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    // Alt skal være fremme for at kunne måles
    await page.locator('#bestil-stykker .stk-linje').first()
      .locator('button', { hasText: '+' }).click();
    await page.locator('#fyld-knap').click();
    await page.locator('#mere-knap').click();
    await page.waitForSelector('#bestil-fyld .fyld-valg');

    expect(await tjek(page, [
      '.bestil-trin > h3', '.bestil-trin > .desc',
      '.fold-navn', '.fold-note',
      '.stk-tekst .navn', '.stk-tekst .desc', '.stk-pris',
      '.taeller-tal', '.glass.rund',
      '.fyld-valg', '.dag-navn', '.dag-dato',
      '#bestil-form label', '.hjaelp', '.frivillig',
      '#bestil-sum-tekst', '#bestil-send',
    ])).toEqual([]);
  });

  test('en valgt pille og en valgt dag – hvid på mørkeblå', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/', { ur: UR });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    /* Dagvælgeren og fyldet ligger ikke fremme: fyldet er foldet
       sammen (det er frivilligt), og dagene findes ikke før der er
       noget i kurven. Testen går den vej et menneske går. */
    await page.locator('#bestil-stykker .stk-linje').first()
      .locator('button', { hasText: '+' }).click();
    await page.locator('#fyld-knap').click();
    await page.waitForSelector('#bestil-fyld .fyld-valg');
    await page.locator('#bestil-fyld .fyld-valg').first().click();

    /* DER SKAL VENTES PÅ OVERGANGEN.

       Pillen har transition på background, og getComputedStyle
       svarer med den farve der gælder LIGE NU – altså et sted midt
       i overgangen. Første udgave af denne test målte
       rgba(146,159,170,.81) i stedet for havnens mørkeblå og
       påstod 2,24:1 om hvid tekst der i virkeligheden ligger på
       14:1.

       En måling af en farve under en overgang måler ingenting.
       Overgangen er 180 ms (--t-hurtig); der ventes 350. */
    await page.waitForTimeout(350);

    expect(await tjek(page, ['.fyld-valg.valgt', '.dag.valgt .dag-navn',
      '.dag.valgt .dag-dato'])).toEqual([]);
  });

  test('fejlbeskederne', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/', { ur: UR });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    // Vælg noget, og send uden navn
    await page.locator('#bestil-stykker .stk-linje').first()
      .locator('button', { hasText: '+' }).click();
    await page.locator('#bestil-send').click();
    await page.waitForSelector('#fejl-navn:not(.skjult)');

    expect(await tjek(page, ['#fejl-navn'])).toEqual([]);
  });

  test('kvitteringen bagefter', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/', { ur: UR });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await page.locator('#bestil-stykker .stk-linje').first()
      .locator('button', { hasText: '+' }).click();
    await page.fill('#bestil-navn', 'Mikkel Gersel');
    await page.fill('#bestil-telefon', '20304050');
    await page.locator('#bestil-send').click();
    await page.waitForSelector('#bestil-tak:not(.skjult)');

    expect(await tjek(page, ['#bestil-tak h3', '#bestil-tak > p',
      '.kvit-navn', '.kvit-vaerdi'])).toEqual([]);
  });

  test('bestillingerne på personalesiden', async ({ page }) => {
    const d = grunddata();
    d.bestillinger = [
      { id: 1, reference: 'SM260806-ABCDE', lokation_id: 'mosede',
        navn: 'Mikkel Gersel', telefon: '20304050', email: null,
        hent_dato: '2026-08-07', hent_tid: '12:00',
        linjer: [{ navn: 'Flæskestegssandwich', antal: 4, pris: 89 }],
        fyld: ['Dyrlægens natmad'], antal: 4, besked: 'Uden agurk',
        status: 'ny', intern_note: null, oprettet: '2026-08-06T11:00:00Z' },
      { id: 2, reference: 'SM260806-FGHJK', lokation_id: 'mosede',
        navn: 'Anne Sørensen', telefon: '20304051', email: null,
        hent_dato: '2026-08-07', hent_tid: '14:00',
        linjer: [{ navn: 'Flæskestegssandwich', antal: 2, pris: 89 }],
        fyld: [], antal: 2, besked: null,
        status: 'klar', intern_note: null, oprettet: '2026-08-06T11:00:00Z' },
    ];

    await åbnAdmin(page, { ur: UR, data: d });
    await page.locator('[data-panel="p-bestillinger"]').click();
    await page.waitForSelector('.bestil-kort');

    expect(await tjek(page, [
      '.bestil-tid', '.bestil-ref', '.bestil-tlf',
      '.maerke.m-ny', '.maerke.m-klar',
      '.bestil-antal-tal', '.bestil-vare', '.bestil-linjepris',
      '.bestil-gaestebesked', '.badge',
    ])).toEqual([]);
  });
});

test.describe('Introen kan læses', () => {

  test('tælleren, beskeden og spring-over', async ({ page }) => {
    await åbn(page, '/index.html', { intro: true });
    await page.waitForSelector('#intro-pct');

    expect(await tjek(page, ['.intro-hud .msg', '.intro-hud .pct', '#intro-spring'])).toEqual([]);
  });
});

/* ============================================================
   KAN OVERSKRIFTEN LÆSES OVEN PÅ DEN RIGTIGE VIDEO?
   ------------------------------------------------------------
   De øvrige tests måler mod en ANTAGET bund. Denne måler mod
   det faktiske billedmateriale: videoen spilles, hvert billede
   tegnes ned i et lille lærred, og den lyseste plet bag
   overskriften findes.

   Gennemsnittet ville ikke fange noget. Én lys plet bag et
   bogstav er nok til at gøre det ulæseligt, så vi leder efter
   det værste sted, ikke det typiske.

   Grunden til at testen findes: hero-videoen er nu hele turen
   forbi lugerne, og den har lyse steder – kagerne på det
   rødternede voksdug og den hvide softice. Den forrige video var
   facaden alene, netop for at undgå det. Skal det lykkes med
   denne, skal sløret bære hele vejen, og det er kun en måling
   der kan afgøre om det gør.

   TO TING GØR MÅLINGEN TROVÆRDIG:

   1) Sløret LÆSES ud af CSS'en i stedet for at stå som et tal
      her. Før stod der ALFA = 0.46, hentet i hovedet fra et
      gradient med tre stop. Ændrede nogen gradienten, målte
      testen videre på det gamle tal og kunne bestå på en side
      der var blevet ulæselig.

   2) Båndet der måles er overskriftens EGET sted på skærmen,
      hentet fra dens position – ikke et gæt på 30-74%.
   ============================================================ */
test('overskriften kan læses oven på hero-videoen', async ({ page }) => {
  test.setTimeout(90000);   // videoen skal spille igennem

  await åbn(page, '/index.html');

  const svar = await page.evaluate(async () => {
    var v = document.getElementById('hero-film');
    var hero = document.querySelector('.hero');
    var h1 = document.querySelector('.hero h1');
    if (!v || !hero || !h1) return { sprunget: 'hero mangler' };

    // Kilderne lægges på af side.js når introen er ude af vejen.
    // Venter vi ikke på at der er noget at spille, måler vi på et
    // tomt lærred og "består".
    await new Promise(function (ok) {
      if (v.readyState >= 2) return ok();
      v.addEventListener('loadeddata', ok, { once: true });
      setTimeout(ok, 25000);
    });
    if (v.readyState < 2) return { sprunget: 'videoen indlæste ikke' };

    v.muted = true;
    try { await v.play(); } catch (e) { /* måles alligevel */ }

    /* ---- Sløret, læst ud af CSS ----
       Chrome skriver gradienten som
       "linear-gradient(rgba(15, 44, 68, 0.66) 0%, ...)".
       Vi henter hvert stop med sin farve, sin alfa og sin
       procent, og slår så op i listen for hver pixelrække. */
    var css = getComputedStyle(hero, '::after').backgroundImage || '';
    var stop = [];
    var re = /rgba?\(([^)]+)\)\s*([\d.]+)%/g, m;
    while ((m = re.exec(css)) !== null) {
      var d = m[1].split(',').map(Number);
      stop.push({
        rgb: [d[0], d[1], d[2]],
        a: d.length > 3 ? d[3] : 1,
        p: parseFloat(m[2]) / 100,
      });
    }
    if (stop.length < 2) return { sprunget: 'kunne ikke læse sløret ud af CSS: ' + css };

    function sloerVed(y01) {
      if (y01 <= stop[0].p) return stop[0];
      for (var i = 0; i < stop.length - 1; i++) {
        var a = stop[i], b = stop[i + 1];
        if (y01 <= b.p) {
          var t = (y01 - a.p) / (b.p - a.p);
          return {
            a: a.a + (b.a - a.a) * t,
            rgb: [
              a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t,
              a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t,
              a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t,
            ],
          };
        }
      }
      return stop[stop.length - 1];
    }

    // ---- Overskriftens eget bånd ----
    var rh = hero.getBoundingClientRect();
    var r1 = h1.getBoundingClientRect();
    var top01 = Math.max(0, (r1.top - rh.top) / rh.height);
    var bund01 = Math.min(1, (r1.bottom - rh.top) / rh.height);
    var hoejre01 = Math.min(1, (r1.right - rh.left) / rh.width);

    /* Lærredet er BEVIDST lille. At tegne videoen ned i 64x36
       svarer til at sløre den, og hver pixel dækker så ca. 22px af
       den rigtige hero – omtrent bredden af en bogstavstreg i
       Bebas ved den størrelse overskriften har.

       Det er den rigtige skala at måle på. Målte vi pr. pixel i
       fuld opløsning, ville en enkelt lys plet på 8x8 dumpe hele
       videoen – men en plet der er smallere end stregen i et
       bogstav forhindrer ikke at man læser bogstavet. Det gør en
       lys FLADE på størrelse med stregen. */
    var c = document.createElement('canvas');
    c.width = 64; c.height = 36;
    var ctx = c.getContext('2d');

    function lin(x) {
      x /= 255;
      return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    }
    function lum(r, g, b) { return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); }

    var y0 = Math.floor(top01 * c.height);
    var y1 = Math.max(y0 + 1, Math.ceil(bund01 * c.height));
    var x1 = Math.max(1, Math.ceil(hoejre01 * c.width));

    var vaerst = 99, hvor = -1, plet = null, raekke = -1;

    function maal() {
      ctx.drawImage(v, 0, 0, c.width, c.height);
      var d = ctx.getImageData(0, y0, x1, y1 - y0).data;
      for (var i = 0; i < d.length; i += 4) {
        var pxIdx = i / 4;
        var y = y0 + Math.floor(pxIdx / x1);
        var sl = sloerVed((y + 0.5) / c.height);
        var blandet = [
          sl.rgb[0] * sl.a + d[i] * (1 - sl.a),
          sl.rgb[1] * sl.a + d[i + 1] * (1 - sl.a),
          sl.rgb[2] * sl.a + d[i + 2] * (1 - sl.a),
        ];
        var k = 1.05 / (lum(blandet[0], blandet[1], blandet[2]) + 0.05);  // hvid tekst ovenpå
        if (k < vaerst) {
          vaerst = k;
          hvor = Math.round(v.currentTime * 100) / 100;
          plet = [d[i], d[i + 1], d[i + 2]];
          raekke = y;
        }
      }
    }

    // Følg videoen igennem i stedet for at springe: VP9-udgaven
    // har få nøglebilleder, og et spring lander tilbage på start.
    var slut = Date.now() + 24000;
    var sidste = -1, antal = 0;
    while (Date.now() < slut) {
      if (v.currentTime !== sidste) { maal(); antal++; sidste = v.currentTime; }
      if (v.currentTime > 0 && v.currentTime < sidste) break;   // loopet rundt
      await new Promise(function (r) { setTimeout(r, 100); });
      if (antal > 4 && v.currentTime >= (v.duration - 0.3)) break;
    }

    return {
      vaerst: Math.round(vaerst * 100) / 100,
      hvor: hvor, plet: plet, antal: antal,
      baand: [Math.round(top01 * 100), Math.round(bund01 * 100)],
      raekke: Math.round((raekke + 0.5) / c.height * 100),
      stop: stop.map(function (s) { return Math.round(s.p * 100) + '%:' + s.a; }).join(' '),
    };
  });

  if (svar.sprunget) {
    // Ingen tavs succes: kunne der ikke måles, skal det stå der
    console.log('BEMÆRK: videomålingen blev sprunget over –', svar.sprunget);
    test.skip(true, 'kunne ikke måle videoen: ' + svar.sprunget);
    return;
  }

  console.log(`hero-videoen målt på ${svar.antal} billeder i båndet `
    + `${svar.baand[0]}-${svar.baand[1]}% – værst ${svar.vaerst}:1 ved ${svar.hvor}s `
    + `i ${svar.raekke}% højde, lyseste plet rgb(${svar.plet}). Slør: ${svar.stop}`);

  expect(svar.antal, 'der blev slet ikke målt nogen billeder').toBeGreaterThan(3);
  // 3,0 er kravet til stor tekst. Overskriften er 56-210px.
  expect(svar.vaerst,
    `overskriften er ulæselig ved ${svar.hvor}s i videoen, i ${svar.raekke}% højde. `
    + 'Styrk sløret i .hero::after – det er den række der skal være mørkere.')
    .toBeGreaterThanOrEqual(3.0);
});
