/* ============================================================
   TOPBJÆLKEN: MÆRKET OG DE TO KNAPPER  (5/9)
   ============================================================
   Kundens ord: *"det der runde is ikon i øverste venstre hjørne
   konstant skal væk"* og *"tilbage knappen skal være liquid glass
   stadig men forsvinder altså i de hvide environments"*.

   ⚠️ MÆRKET ER FLYTTET, IKKE FJERNET. Han valgte selv, at det
   bliver på FORSIDEN og forsvinder fra de ni undersider. Det er
   en ændring af hans egen ordre fra 29/8 (*"logoet alle steder"*),
   og derfor er de to gamle prøver vendt MED noter i stedet for
   slettet. Undersiderne siger stadig, hvem de er: navnet står som
   tekst i footeren på hver eneste af dem.

   ⚠️ OG KNAPPERNE STOD I 1,06:1. Målt på en iPhone 13 på otte
   sider, både øverst og efter at bjælken havde fæstnet sig: den
   mørke glasvariant lader ternet skinne igennem, og ternet har
   BÅDE røde og næsten hvide felter — så en hvid pil forsvandt i
   de lyse. Reglen fandtes for burgeren og kun i `.stuck`; pilen
   var glemt, og det er den eneste vej tilbage på de sider.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, rul } = require('./hjaelp');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');

/* Designsiderne læses af MAPPEN, så en tiende underside ikke kan
   udgives med mærket tilbage i toppen uden at nogen ser det. */
function undersider() {
  return fs.readdirSync(ROD)
    .filter((f) => /^(h-|m-)[a-z-]+\.html$/.test(f) || f === 'historien.html');
}

function lum(c) {
  const [r, g, b] = c.match(/\d+/g).map(Number).map((v) => {
    v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function kontrast(a, b) {
  const l1 = lum(a); const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

test.describe('Mærket i toppen', () => {
  /* ⚠️ VENDT 8/9 — OG DEN ER BLEVET SKARPERE.
     Prøven krævede den LILLE krans i forsidens topbjælke. Kundens
     ord med et skud af hjørnet: *"logoet heroppe er også forkert
     — måske skriv Mosede Havnecafe i stedet, med header, skift
     det pænere."*

     Det er hans beslutning om sit eget mærke, ikke en forældet
     prøve. Og den løser det, målingen 3/9 selv fandt: briefen
     siger, at ringteksten er ulæselig under 60 px, og bjælkens
     krans var 50 — altså stod forretningens navn i toppen som en
     grå udtværing. Nu står det som TEKST, læsbart, i husets egen
     display-serif.

     Reglen er den samme og den vigtige: **forsidens identitet må
     ikke gå tabt.** Den er bare skærpet fra "der er en cirkel" til
     "navnet kan LÆSES" — og den fulde krans med ringteksten
     bliver i heroen, hvor den er stor nok. */
  test('forsiden bærer navnet i bjælken og mærket i heroen', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });

    /* Ordmærket: navnet som tekst, i display-serif og på ÉN linje
       — to linjer gør bjælken højere, og bjælkens højde er et tal,
       tre sidehoveder regner med (--top-luft + 70, 5/9). */
    const ord = page.locator('.topbar .ordmaerke');
    await expect(ord, 'forsiden har intet ordmærke i bjælken').toHaveCount(1);
    await expect(ord).toHaveText('Mosede Havnecafe');
    const m = await ord.evaluate((e) => {
      const s = getComputedStyle(e);
      const r = document.createRange(); r.selectNodeContents(e);
      const t = r.getBoundingClientRect();
      return { skrift: s.fontFamily, ombryder: s.whiteSpace,
        linjer: t.height / parseFloat(s.lineHeight || s.fontSize) };
    });
    expect(m.skrift, 'ordmærket står ikke i husets display-serif')
      .toMatch(/Fraunces/);
    expect(m.ombryder, 'ordmærket må ikke kunne ombryde').toBe('nowrap');
    expect(m.linjer, 'ordmærket står på to linjer').toBeLessThan(1.6);

    /* ⚠️ OG MÆRKET ER IKKE FORSVUNDET — det er flyttet derhen, hvor
       ringteksten kan læses. Uden den her halvdel ville en forside
       helt uden krans bestå. */
    const hero = page.locator('.hero-badge svg.crest');
    await expect(hero).toHaveCount(1);
    await expect(hero).toHaveAttribute('aria-label', /Mosede Havnecafe/);
    expect(await hero.evaluate((e) => e.getBoundingClientRect().width),
      'heroens krans er under briefens 60 px — dér er ringteksten '
      + 'en grå udtværing').toBeGreaterThanOrEqual(60);
  });

  /* ⚠️ ORDMÆRKET MÅ IKKE STØDE IND I BURGEREN.
     Kransen var 50 px bred; navnet er 197. Det er den ENE ting,
     ordmærket kan ødelægge, som ingen anden prøve måler — og det
     sker først på en smal skærm, altså netop dér, hvor ingen
     kigger.

     ⚠️ FØRSTE UDGAVE AF DEN HER PRØVE MÅLTE DET FORKERTE: den
     krævede, at heroens top lå klods op ad bjælkens bund, og fik
     **-128 px**. Heroen trækker sig `--top-luft + 70` OP under
     bjælken MED VILJE (5/9), så ternet går hele vejen til
     kanten — og cremestriben har sin egen prøve i
     fullscreen-telefon.spec.js. To prøver om det samme er én for
     meget; den her måler det, der er nyt.

     ⚠️ OG TALLET KOMMER UDEFRA: burgerens egen venstre kant, ikke
     et bredde-tal skrevet af. Bliver skriften større, eller
     vokser navnet, falder prøven af sig selv. */
  test('ordmærket støder ikke ind i menuknappen', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });

    const m = await page.evaluate(() => {
      const ord = document.querySelector('.topbar .ordmaerke');
      const knap = document.getElementById('burger');
      const r = document.createRange(); r.selectNodeContents(ord);
      const t = r.getBoundingClientRect();
      const b = knap.getBoundingClientRect();
      return { tekstHoejre: t.right, knapVenstre: b.left, bredde: t.width };
    });
    expect(m.bredde, 'ordmærket har ingen bredde — står det der?')
      .toBeGreaterThan(80);
    expect(m.tekstHoejre,
      'ordmærket løber ind i menuknappen: teksten slutter ved '
      + Math.round(m.tekstHoejre) + ' px, knappen begynder ved '
      + Math.round(m.knapVenstre)).toBeLessThan(m.knapVenstre - 8);
  });
  /* ============================================================
     ⚠️ NAVNET VISER SIG FØRST MED DEN HVIDE BJÆLKE  (9/9)
     ------------------------------------------------------------
     Kundens ord med to skud af hjørnet: *"det her skal først vise
     sig når man har scrollet lidt længere ned hvor den hvide bar
     begynder at vise sig — den må ik stå i vejen og være dårlig."*

     Det er TREDJE runde på det samme hjørne: hvid stod i 1,06:1 på
     ternet (9/9), blæk blev læsbart — og blæk PÅ TERNET er stadig
     et navn oven i et mønster med røde og næsten hvide felter,
     tre centimeter over heroens egen krans, som siger nøjagtig
     det samme.

     ⚠️ TALLET KOMMER UDEFRA: bjælkens EGEN `.stuck`, ikke et
     rulletal skrevet af. Prøven venter på den tilstand, reglen
     hviler på — ikke på et stopur (ankerprøvens ar, 9/9).
     ============================================================ */
  test('ordmærket er skjult øverst og kommer med den hvide bjælke', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await page.evaluate(() => { const i = document.getElementById('intro'); if (i) i.remove(); });

    const ord = page.locator('.topbar .ordmaerke');
    const laes = () => ord.evaluate((e) => {
      const s = getComputedStyle(e);
      return { synlig: s.visibility, gennemsigt: s.opacity,
        hoejde: Math.round(e.getBoundingClientRect().height) };
    });

    /* Øverst: bjælken er IKKE klæbet, og navnet står ikke i vejen. */
    expect(await page.locator('.topbar').evaluate((e) => e.classList.contains('stuck')),
      'bjælken var klæbet, før der var rullet — prøven måler ingenting').toBe(false);
    const foer = await laes();
    expect(foer.synlig, 'navnet står på ternet, hvor det er larm').toBe('hidden');
    expect(parseFloat(foer.gennemsigt)).toBe(0);

    /* ⚠️ OG DEN SKJULTE KASSE HAR STADIG SIN HØJDE. `.topbar` er
       `sticky` og i FLOW, så dens INDHOLD bestemmer, hvor resten
       af siden begynder — et `display:none` ville flytte hele
       forsiden ti pixels op (målt 9/9: h1 fra 260 til 250). Uden
       den her linje ville netop den rettelse bestå. */
    expect(foer.hoejde, 'den skjulte kasse mistede sin højde')
      .toBeGreaterThanOrEqual(50);

    /* Og så ruller vi til den hvide bjælke og venter på DEN
       tilstand, ikke på et antal millisekunder. */
    await rul(page, 700);
    await page.waitForFunction(() =>
      document.querySelector('.topbar').classList.contains('stuck'));
    await expect(ord).toBeVisible();
    const efter = await laes();
    expect(parseFloat(efter.gennemsigt), 'navnet kom ikke frem med bjælken').toBe(1);
  });

  test('undersiderne har ikke mærket i topbjælken', () => {
    const med = undersider().filter((f) => {
      const s = fs.readFileSync(path.join(ROD, f), 'utf8');
      const m = s.match(/<div class="topbar"[\s\S]*?<\/div>\s*(?=\n|<div|<section|<main)/);
      return m ? /class="crest/.test(m[0]) : /class="crest/.test(s);
    });
    expect(med, 'mærket er tilbage i en undersides topbjælke').toEqual([]);
  });

  test('men hver underside siger stadig, hvem den er', () => {
    /* ⚠️ DEN ANDEN HALVDEL, og uden den måler den første ingenting.
       En side må gerne miste cirklen i toppen; den må ikke miste
       sin identitet. Navnet står i footeren på hver eneste. */
    const uden = undersider().filter((f) =>
      !fs.readFileSync(path.join(ROD, f), 'utf8').includes('Mosede Havnecafe'));
    expect(undersider().length, 'ingen undersider fundet').toBeGreaterThan(8);
    expect(uden, 'en underside står helt uden forretningens navn').toEqual([]);
  });
});

test.describe('Tilbage-pilen og menuen kan ses', () => {
  /* Ternet har både røde og næsten hvide felter, så knappen skal
     have sin EGEN flade. Blæk på den lyse glasflade måler over
     11:1 mod begge tern-farver; hvid på den mørke målte 1,06. */
  for (const side of ['/m-menukort.html', '/h-selskaber.html', '/m-tapas.html']) {
    test(side + ': knapperne er blæk på lys glas, ikke hvide', async ({ page }) => {
      await åbnSkal(page, side, { data: grunddata() });
      const knapper = page.locator('.topbar .g.icn');
      const antal = await knapper.count();
      expect(antal, 'ingen knapper i topbjælken at måle på').toBeGreaterThan(0);
      for (let i = 0; i < antal; i++) {
        const r = await knapper.nth(i).evaluate((e) => {
          const c = getComputedStyle(e);
          return { farve: c.color, fyld: c.backgroundColor };
        });
        expect(r.farve, 'ikonet er hvidt og forsvinder i ternets lyse felter')
          .not.toBe('rgb(255, 255, 255)');
        expect(kontrast(r.farve, 'rgb(255, 255, 255)'),
          'ikonet kan ikke ses mod en hvid flade').toBeGreaterThan(4.5);
      }
    });
  }

  test('og de er stadig liquid glass', async ({ page }) => {
    /* ⚠️ KUNDENS EGEN BETINGELSE: *"skal være liquid glass
       stadig"*. En knap med en solid flade ville bestå
       kontrastprøven ovenfor og være en helt anden knap. */
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    const k = page.locator('.topbar .g.icn').first();
    const r = await k.evaluate((e) => {
      const c = getComputedStyle(e);
      return {
        slør: c.backdropFilter || c.webkitBackdropFilter,
        fyld: c.backgroundColor,
        kant: c.boxShadow,
      };
    });
    expect(r.slør, 'sløringen er væk — så er det ikke glas længere').toMatch(/blur/);
    expect(r.fyld, 'fladen er solid, ikke glas').toMatch(/rgba\(/);
    expect(r.kant, 'linsekanten indeni er væk').toMatch(/inset/);
  });

  test('historien beholder den mørke — to sider mod hinanden', async ({ page }) => {
    /* ⚠️ ET SPØRGSMÅL TIL ÉN SIDE VILLE BESTÅ, også hvis alle ti
       blev ens. Historien er sort med messing; en lys glasknap
       ville være en hvid klat i et cinematisk hjørne.

       ⚠️ OG DET ER historien.css, DER BESKYTTER DEN — ikke en
       undtagelse i det fælles ark. `.hist .topbar .g.icn.dark`
       vejer 0,4,0 mod den fælles regels 0,3,0. Falsifikationen
       fandt det: en `body:not(.hist)`-garde i havnegrillen.css
       kunne fjernes, uden at noget faldt. */
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    const lys = await page.locator('.topbar .g.icn').first().evaluate((e) => getComputedStyle(e).color);
    await åbnSkal(page, '/historien.html', { data: grunddata() });
    const mørk = await page.locator('.topbar .g.icn').first().evaluate((e) => getComputedStyle(e).color);
    expect(mørk, 'historien fik den lyse knap med').not.toBe(lys);
    expect(kontrast(mørk, 'rgb(11, 9, 8)'), 'pilen kan ikke ses på det sorte').toBeGreaterThan(4.5);
  });
});
