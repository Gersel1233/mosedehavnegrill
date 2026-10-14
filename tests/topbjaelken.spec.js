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
    /* ⚠️ HOST GROTESK SIDEN 27/9 (Mikkels valg: LESREG's skrift i hele huset). */
    expect(m.skrift, 'ordmærket står ikke i husets skrift')
      .toMatch(/Host Grotesk/);
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

    /* ⚠️ OG DEN MÅLER SLUTTILSTANDEN, IKKE ET ØJEBLIK I
       OVERGANGEN. Første udgave læste `opacity` straks efter
       `toBeVisible()` og fik **0,957** — synligheden vipper med
       det samme, men indtoningen varer 450 ms. Det er
       ankerprøvens ar fra samme dag i en ny forklædning: vent på
       den tilstand, reglen hviler på. `poll` er den ærlige form
       — fjernes reglen, når den aldrig 1, og prøven falder.

       ⚠️ OG DEN HER RETTELSE BLEV SLETTET ÉN GANG AF
       `git checkout -- .` under en falsifikation (9/9): den var
       lavet EFTER commit'en og før rollbacken, og den fulde runde
       fandt den igen med 0,429. Husets regel er "commit FØR du
       falsificerer" — den skarpere udgave er: **læs `git status`
       FØR hver rollback, ikke kun efter.** */
    await expect.poll(async () => parseFloat((await laes()).gennemsigt),
      { message: 'navnet kom ikke frem med bjælken', timeout: 3000 }).toBe(1);
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

/* ============================================================
   NAVNET I DEN FASTE BJÆLKE ER ENS PÅ ALLE SIDER  (11/10)
   ------------------------------------------------------------
   Mikkels ord: *"det mosedehavnecafe i toppen skifter ift skrifttype
   og placering imellem tabsne … det skal se ud som når man scroller
   ned på forsiden"*. MÅLT FØR: forsiden 21/500 til venstre; de ni
   undersider intet navn; bord/ og bestil/ 17/400 midt for efter en pil
   og en anden Menu-knap.

   ⚠️ FACIT ER FORSIDENS FASTE BJÆLKE, læst på samme kørsel — ikke tal
   skrevet her. Og SIDERNE LÆSES AF FORSIDENS EGEN MENU (skuffen), så en
   ny side i menuen er med af sig selv. bestil/ er med, fordi forsiden
   linker dertil fra Bestil mad.
   ============================================================ */
test.describe('Den faste bjælke er forsidens på alle sider', () => {
  async function bjaelken(page, sti) {
    await åbnSkal(page, sti, { data: grunddata() });
    await page.evaluate(() => document.getElementById('intro')?.remove());
    await rul(page, 900);
    /* ⚠️ VENT PÅ AT BJÆLKEN KLÆBER, ikke på uret (14/10). Den faste
       ventetid alene faldt én gang i en fuld runde på smørrebrødssiden
       (en tung side på en presset maskine) og bestod alene på 12 s —
       maskinens fejl, ikke sidens. Klæber den aldrig, svarer prøven
       stadig null nedenfor og fejler, som den skal. */
    await page.waitForFunction(() => document.querySelector('#tb.stuck, #hd.stuck'), null, { timeout: 5000 })
      .catch(() => {});
    await page.waitForTimeout(700);   // navnet toner ind (.45 s)
    return page.evaluate(() => {
      const navn = document.querySelector('#tb.stuck .ordmaerke, #hd.stuck .logo');
      const knap = document.querySelector('#tb #burger, #hd #burger');
      if (!navn || !knap) return null;
      const cs = getComputedStyle(navn), kr = knap.getBoundingClientRect(), nr = navn.getBoundingClientRect();
      const synlig = cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.99;
      return {
        synlig, tekst: navn.textContent.trim(),
        skrift: [cs.fontFamily.split(',')[0].replace(/"/g, ''), cs.fontSize, cs.fontWeight, cs.letterSpacing, cs.color].join(' '),
        sted: [Math.round(nr.left), Math.round(nr.top), Math.round(nr.height)].join(','),
        knap: [Math.round(kr.right), Math.round(kr.top), Math.round(kr.width), Math.round(kr.height),
          getComputedStyle(knap, '::after').content, getComputedStyle(knap).backgroundColor].join(' '),
      };
    });
  }

  test('navn og Menu står ens på hver side i menuen', async ({ page }) => {
    const html = fs.readFileSync(path.join(ROD, 'index.html'), 'utf8');
    const skuffe = html.slice(html.indexOf('id="sheet"'), html.indexOf('id="sheet"') + 6000);
    const sider = [...new Set([...skuffe.matchAll(/href="([^"#:]+)"/g)].map((m) => m[1]))]
      .filter((h) => h !== 'index.html').map((h) => '/' + h).concat('/bestil/');
    expect(sider.length, 'vagt: menuens sider').toBeGreaterThanOrEqual(9);
    expect(sider, 'vagt: bord/ er i menuen').toContain('/bord/');

    const facit = await bjaelken(page, '/index.html');
    expect(facit, 'forsidens faste bjælke har intet navn eller ingen Menu').not.toBeNull();
    expect(facit.synlig, 'forsidens navn kom ikke frem, da bjælken klæbede').toBe(true);
    for (const sti of sider) {
      const m = await bjaelken(page, sti);
      expect(m, sti + ': ingen navn eller ingen Menu i den faste bjælke').not.toBeNull();
      expect(m.synlig, sti + ': navnet vises ikke, når bjælken klæber').toBe(true);
      expect(m.tekst, sti).toBe(facit.tekst);
      expect(m.skrift, sti + ': navnet står i en anden skrift end forsidens').toBe(facit.skrift);
      expect(m.sted, sti + ': navnet står et andet sted end forsidens').toBe(facit.sted);
      expect(m.knap, sti + ': Menu-knappen er ikke forsidens').toBe(facit.knap);
    }
  });

  /* Navnet er vejen tilbage, hvor pilen er væk: data-tilbage (js/tilbage.js). */
  test('navnet i undersidens faste bjælke går et skridt tilbage', async ({ page, baseURL }) => {
    await åbnSkal(page, '/m-menukort.html', { data: grunddata() });
    await page.goto('/m-tapas.html', { waitUntil: 'domcontentloaded', referer: baseURL + '/m-menukort.html' });
    await rul(page, 900);
    const navn = page.locator('#tb.stuck .ordmaerke');
    await expect(navn).toBeVisible();
    await expect(page.locator('#tb .g.icn[data-tilbage]'), 'pilen står ved siden af navnet').toBeHidden();
    await navn.click();
    await expect(page).toHaveURL(/m-menukort\.html$/);
  });
});
