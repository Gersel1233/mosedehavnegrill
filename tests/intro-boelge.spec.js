/* ============================================================
   BØLGE-INTROEN
   ------------------------------------------------------------
   Mikkels eget bundt (27/8), afleveret som færdigt og godkendt.
   Briefen har seks accepttests; de står som prøver her, plus dem
   der følger af de fem afvigelser i js/intro-boelge.js.

   ⚠️ DEN KOMMER VED HVERT BESØG — OG DET ER VENDT TO GANGE PÅ
   ÉN DAG (10/9). Historikken hører til, for den er blevet
   besluttet frem og tilbage, og næste læser skal ikke tro, at
   nogen har glemt noget:

     27/8   Mikkel: "hver gang man kommer ind på hjemmesiden"
     10/9   formiddag: "kun virke første gang" — bygget med
            `mosede_intro_set_v1` i localStorage
     10/9   eftermiddag: "vi skal have ændret animationen til at
            komme hver gang" — gaten fjernet igen

   Bundtets eget punkt 1 ville have haft et flag; kundens ord
   vinder over bundtet, og hans SENESTE ord vinder over hans
   forrige. Prøverne er VENDT MED GRUNDEN, ikke slettet.

   ⚠️ OG NØGLEN LÆSES IKKE LÆNGERE. Ligger `mosede_intro_set_v1`
   stadig i en gæsts browser fra formiddagen, må den ikke kunne
   spærre for introen — det har sin egen prøve nedenfor.
   ============================================================ */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

const LAG = '#intro';

/* ⚠️ INTROEN MÅLES PÅ EN TILSTAND — IKKE MED ET STOPUR.
   `toHaveCount(0)` prøver igen, til den er sand, og introen
   fjerner SELV sit lag, når animationen er slut. Prøven
   "… og ikke anden gang" bestod derfor med reglen fjernet
   (målt 10/9): den ventede bare de ~2,6 sekunder, animationen
   tager, og fandt så nul. Den målte ingenting.

   `#intro` er statisk opmærkning i index.html, og gaten fjerner
   den SYNKRONT, når `js/intro-boelge.js` kører — nederst i body,
   altså FØR DOMContentLoaded. Spørgsmålet er derfor: står laget
   der stadig, når sidens egne scripts er kørt?

   ⚠️ OG DET MÅ IKKE MÅLES VED FØRSTE BILLEDE. Første udgave
   brugte requestAnimationFrame fra document-start, og MÅLT faldt
   prøven med reglen på plads: browseren tegner, mens den stadig
   parser, så billedet kom FØR scriptet. Den målte parsing. */
async function efterIndlaesning(page) {
  await expect.poll(() => page.evaluate(() => window.__introEfterScript),
    { message: 'vagten nåede aldrig at måle' })
    .not.toBe(null);
  return page.evaluate(() => window.__introEfterScript);
}

/* Sættes ved HVER navigation, også et reload — så flaget er
   den her sides svar og ikke den forriges. */
async function sætVagt(page) {
  await page.addInitScript(() => {
    window.__introEfterScript = null;
    document.addEventListener('DOMContentLoaded', function () {
      window.__introEfterScript = !!document.getElementById('intro');
    });
  });
}

/* ⚠️ OMBYTNINGEN MÅLES I DET ØJEBLIK, DEN SKER  (11/9).
   Begge landingsprøver målte med en sampler pr. billede, og under
   fire arbejdere kan der gå 100 ms mellem billederne. MÅLT i fem
   gentagelser: logoet stod 4,7-7,2 px fra kransen i det sidste
   BILLEDE, prøven så, og pausen blev 224 ms — ikke fordi siden
   gjorde noget andet, men fordi prøven ikke så de sidste billeder.
   Og i en fuld runde læste pause-prøven `vaek`, før sampleren
   havde skrevet det.

   Det, øjet ser, er logoet i det sekund, laget fjernes — så dér
   måles det: `removeChild` på `#intro` pakkes ind, og kasserne
   læses, FØR laget er væk. Ét tal pr. ombytning, uanset hvor
   mange billeder maskinen når. */
async function målOmbytning(page) {
  await page.addInitScript(() => {
    window.__omb = null;
    const org = Node.prototype.removeChild;
    Node.prototype.removeChild = function (barn) {
      if (barn && barn.id === 'intro' && !window.__omb) {
        const kasse = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
        };
        window.__omb = {
          t: performance.now(),
          logo: kasse(barn.querySelector('.logo')),
          krans: kasse(document.querySelector('.hero-badge .crest')),
        };
      }
      return org.call(this, barn);
    };
  });
}
async function ombytning(page) {
  await expect.poll(() => page.evaluate(() => window.__omb),
    { timeout: 20000, message: 'ombytningen blev aldrig set' }).not.toBeNull();
  return page.evaluate(() => window.__omb);
}

test.describe('Bølge-introen', () => {

  /* ⚠️ MODSTYKKET, OG DET ER DET VIGTIGSTE AF DE TO. Uden det
     ville en regel, der ALDRIG viste introen, bestå prøven
     nedenfor — og gæsten ville aldrig se den. */
  test('den kommer FØRSTE gang, en gæst er på forsiden', async ({ page }) => {
    await sætVagt(page);
    await åbnSkal(page, '/', { data: grunddata() });
    expect(await efterIndlaesning(page)).toBe(true);
  });

  /* ⚠️ VENDT IGEN 10/9 — se historikken øverst. Prøven åbner
     forsiden to gange i den SAMME browserkontekst, altså med det
     samme localStorage, og introen skal komme BEGGE gange. */
  test('… og også anden gang', async ({ page }) => {
    await sætVagt(page);
    await åbnSkal(page, '/', { data: grunddata() });
    expect(await efterIndlaesning(page)).toBe(true);
    await page.reload();
    expect(await efterIndlaesning(page)).toBe(true);
  });

  /* ⚠️ OG EN GAMMEL NØGLE MÅ IKKE SPÆRRE. En gæst, der var inde
     om formiddagen 10/9, har `mosede_intro_set_v1` i sin browser.
     Læste koden den stadig, ville præcis de gæster aldrig se
     introen igen — og fejlen ville være usynlig for os, fordi en
     frisk browser opfører sig rigtigt. */
  test('en gammel nøgle fra formiddagen spærrer ikke', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('mosede_intro_set_v1', '1'); } catch (e) { /* ignoreres */ }
    });
    await sætVagt(page);
    await åbnSkal(page, '/', { data: grunddata() });
    expect(await efterIndlaesning(page)).toBe(true);
  });

  /* ⚠️ LOGOET RYGER PÅ PLADS  (10/9). Kundens ord: *"når logoet
     har rystet sig rent, skal hele siden animere sig ind, hvor
     logoet er på headeren."*

     Prøven måler to UAFHÆNGIGE elementer mod hinanden: introens
     logo og heroens krans. Et spørgsmål til logoet om dets egen
     transform ville bestå, uanset hvor kransen sad — og det er
     netop dét, der skal passe.

     ⚠️ OG DEN VENTER PÅ EN TILSTAND, IKKE PÅ ET STOPUR: at
     flyvningen ER begyndt (`#intro.lander`). Animationen tager
     ~4,1 sekund, før den når dertil, og et fast tal ville falde
     den dag, en fase bliver et hak længere. */
  test('logoet lander oven på heroens krans', async ({ page }) => {
    /* ⚠️ MÅLT I DET ØJEBLIK, LAGET RYGER — se `målOmbytning`.
       Tidligere udgaver målte med et stopur og med `transitionend`
       (begge målte ingenting, 10/9) og derefter som den tætteste
       afstand over billederne. Den sidste blev skrøbelig, da laget
       kom til at ryge i samme billede, som logoet når frem: under
       belastning så sampleren aldrig det billede. */
    await målOmbytning(page);
    await åbnSkal(page, '/', { data: grunddata() });
    const o = await ombytning(page);
    expect(o.logo && o.krans, 'logoet eller kransen manglede ved ombytningen').toBeTruthy();
    /* Fire pixels: kransen har en kant, og en scale rundes af. */
    expect(Math.abs(o.logo.x - o.krans.x)).toBeLessThan(4);
    expect(Math.abs(o.logo.y - o.krans.y)).toBeLessThan(4);
    expect(Math.abs(o.logo.w - o.krans.w)).toBeLessThan(4);
  });

  /* ⚠️ LOGOET MÅ IKKE FORSVINDE UNDERVEJS  (10/9). Kundens ord:
     *"animationen som var der før — den skal ikke forsvinde i den
     der blub, men efter, du ved, transform indtil der hvor det
     skal stå på landingsiden."*

     Faserne `blub` og `drop` krympede mærket til ingenting og
     poppede det som en boble; først DEREFTER fløj et allerede
     usynligt logo hen på plads. Flyvningen begynder ved `B.blub`
     nu, så de to faser aldrig nås.

     ⚠️ MÅLT FRA DET ØJEBLIK, LOGOET FØRST ER FREMME — ikke fra
     billede ét. Det første sekund ER med vilje tomt: dér falder
     dråben, og logoet er endnu ikke vokset ud af plasket. En
     prøve, der krævede opacity 1 hele vejen, ville fælde selve
     åbningen.

     ⚠️ OG SAMPLEREN SKAL OVERLEVE SIT EGET FØRSTE BILLEDE.
     `addInitScript` kører FØR opmærkningen er læst, så `#intro`
     er null i første billede — en løkke, der stopper, når laget
     mangler, måler ingenting. Det er sket to gange i den her fil
     og én gang i måleværktøjet ved siden af. */
  test('logoet forsvinder ikke undervejs — det transformer hele vejen', async ({ page }) => {
    await page.addInitScript(() => {
      window.__op = [];
      var harSet = false;
      (function tik() {
        const l = document.querySelector('#intro .logo');
        if (l) window.__op.push(Number(getComputedStyle(l).opacity));
        if (document.getElementById('intro')) harSet = true;
        if (!harSet || document.getElementById('intro')) requestAnimationFrame(tik);
      })();
    });
    await åbnSkal(page, '/', { data: grunddata() });
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 20000 });
    const op = await page.evaluate(() => window.__op);
    /* Vagt: uden billeder måler resten ingenting. */
    expect(op.length).toBeGreaterThan(40);
    const frem = op.indexOf(1);
    expect(frem).toBeGreaterThan(-1);
    /* Fra det billede og resten af introen: aldrig under fuld. */
    const efter = op.slice(frem);
    expect(Math.min(...efter)).toBe(1);
    /* Og der skal VÆRE en vej derfra — ellers målte vi ét billede. */
    expect(efter.length).toBeGreaterThan(20);
  });

  /* ⚠️ OG SIDEN MÅ ALDRIG BLIVE HÆNGENDE USYNLIG. Landingen
     sætter `.device` til nul og toner den ind; går noget galt
     undervejs, er det gæstens hele side, der er væk. Det er
     4/9-arret: en skjule-regel uden et modstykke. */
  test('siden er fuldt synlig, når introen er væk', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await expect(page.locator('#intro')).toHaveCount(0, { timeout: 15000 });
    const o = await page.evaluate(() => {
      const d = document.querySelector('.device');
      return { side: Number(getComputedStyle(d).opacity),
        krans: Number(getComputedStyle(document.querySelector('.hero-badge')).opacity),
        klasse: document.documentElement.classList.contains('intro-lander') };
    });
    expect(o.side).toBe(1);
    expect(o.krans).toBe(1);
    expect(o.klasse).toBe(false);
  });

  /* ⚠️ SIDEN ÅBNER — DEN BLIVER IKKE BARE TÆNDT  (10/9). Kundens
     ord: *"som om hele siden åbner i takt med at den flader på
     plads."* Heroens indhold stiger på plads, mens logoet flyver.

     ⚠️ OG PRØVEN MÅLER TO TING, FORDI DE HØRER SAMMEN. At `.hero-in`
     rejser sig — og at KRANSEN, logoets mål, står bomstille imens.
     En regel, der lod hele `.hero` rejse sig, ville bestå den første
     halvdel og sende logoet mod et rektangel, der har flyttet sig,
     når det lander.

     ⚠️ SAMPLEREN SKAL OVERLEVE SIT FØRSTE BILLEDE — `harSet`-flaget,
     som de to prøver ovenfor. */
  test('siden rejser sig, mens logoet flyver — og målet står stille', async ({ page }) => {
    await page.addInitScript(() => {
      window.__rejs = { hero: [], maal: [] };
      var harSet = false;
      (function tik() {
        const lag = document.getElementById('intro');
        if (lag) harSet = true;
        if (lag && lag.classList.contains('lander')) {
          const h = document.querySelector('.hero-in');
          const b = document.querySelector('.hero-badge .crest');
          if (h && b) {
            const cs = getComputedStyle(h);
            const ty = cs.transform === 'none' ? 0 : new DOMMatrix(cs.transform).m42;
            window.__rejs.hero.push({ ty, op: Number(cs.opacity) });
            const r = b.getBoundingClientRect();
            window.__rejs.maal.push({ top: r.top, left: r.left, w: r.width });
          }
        }
        if (!harSet || lag) requestAnimationFrame(tik);
      })();
    });
    await åbnSkal(page, '/', { data: grunddata() });
    await expect(page.locator(LAG)).toHaveCount(0, { timeout: 20000 });
    const { hero, maal } = await page.evaluate(() => window.__rejs);

    /* Vagt: uden billeder fra selve landingen måler resten intet. */
    expect(hero.length, 'landingen blev aldrig set').toBeGreaterThan(10);

    /* Den rejser sig: den har været nede, og den har været svag. */
    expect(Math.max(...hero.map((h) => h.ty))).toBeGreaterThanOrEqual(8);
    expect(Math.min(...hero.map((h) => h.op))).toBeLessThan(0.5);

    /* Målet står stille — hele landingen igennem. */
    const spand = (xs) => Math.max(...xs) - Math.min(...xs);
    expect(spand(maal.map((m) => m.top)), 'kransen flyttede sig').toBeLessThan(1);
    expect(spand(maal.map((m) => m.left)), 'kransen flyttede sig').toBeLessThan(1);
    expect(spand(maal.map((m) => m.w)), 'kransen skiftede størrelse').toBeLessThan(1);

    /* Og den ENDER på plads — ellers er det en side, der hænger. */
    const slut = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('.hero-in'));
      return { t: cs.transform, op: Number(cs.opacity) };
    });
    expect(slut.op).toBe(1);
    expect(slut.t).toBe('none');
  });

  /* ⚠️ INGEN DØD PAUSE  (10/9). Kurven `cubic-bezier(.34,1.14,.42,1)`
     havde logoet 2 px fra målet efter 568 ms, og laget blev først
     fjernet ved 960 — altså stod alt stille i ~400 ms, før siden
     blev fri. Det er dét, der læses som *hurtig og så gået i stå*.
     Og laget dækker hele skærmen: i de 400 ms ser siden færdig ud
     og kan ikke rulles.

     ⚠️ DE TO TAL ER UAFHÆNGIGE: hvornår logoet NÅR målet (målt på
     to elementers kasser), og hvornår laget FORSVINDER (målt på
     DOM'en). Et spørgsmål til koden om dens egen kurve eller dens
     egen `setTimeout` ville bestå, uanset hvad de to gjorde
     sammen — og det er summen, der mærkes.

     ⚠️ TIDEN ER VÆGURET, IKKE BILLEDERNE. En CSS-overgang følger
     uret, også når en travl maskine taber billeder; loftet har
     derfor luft til en forsinket `setTimeout` under fire
     arbejdere. */
  test('ingen død pause: logoet når målet lige før laget ryger', async ({ page }) => {
    await målOmbytning(page);
    await page.addInitScript(() => {
      window.__billeder = [];
      var harSet = false;
      (function tik() {
        const lag = document.getElementById('intro');
        if (lag) harSet = true;
        if (lag && lag.classList.contains('lander')) {
          const l = lag.querySelector('.logo');
          if (l) {
            const a = l.getBoundingClientRect();
            window.__billeder.push({ t: performance.now(),
              x: a.left + a.width / 2, y: a.top + a.height / 2, w: a.width });
          }
        }
        if (!harSet || lag) requestAnimationFrame(tik);
      })();
    });
    await åbnSkal(page, '/', { data: grunddata() });
    const o = await ombytning(page);
    const billeder = await page.evaluate(() => window.__billeder);

    /* Vagt: landingen skal være set — men et par billeder er nok,
       for selve ombytningen måles ikke af dem. */
    expect(billeder.length, 'landingen blev aldrig set').toBeGreaterThan(2);
    /* ⚠️ "FREMME" ER LOGOETS EGEN SLUTPLADS, IKKE KRANSENS. Kransens
       plads regnes med hele pixels og en afrundet scale, så logoet
       lander 1-3 px ved siden af — den afstand har prøven ovenfor
       sin egen tolerance til. Her er spørgsmålet et andet: hvornår
       holdt logoet op med at BEVÆGE SIG? Slutpladsen er logoet I
       ombytningen. Var intet billede inden for 2 px af den, var
       logoet stadig på vej, da laget røg — og så er pausen nul. */
    const frem = billeder.find((b) => Math.abs(b.x - o.logo.x)
      + Math.abs(b.y - o.logo.y) + Math.abs(b.w - o.logo.w) < 2);
    const tFrem = frem ? frem.t : o.t;
    const pause = o.t - tFrem;
    console.log(`[takt] fremme ${Math.round(tFrem - billeder[0].t)} ms · laget væk `
      + `${Math.round(o.t - billeder[0].t)} ms · pause ${Math.round(pause)} ms`);
    expect(pause).toBeGreaterThanOrEqual(0);
    /* Målt 10/9: den gamle kurve gav 416-440 ms, laget fast ved
       1060 gav 211-271, og ombytningen på overgangens eget ur 2-126
       på begge profiler. */
    expect(pause, `logoet var fremme ${Math.round(tFrem - billeder[0].t)} ms inde, `
      + `laget røg ${Math.round(o.t - billeder[0].t)} ms inde`).toBeLessThan(200);
  });

  /* ⚠️ OG HEROEN MÅ ALDRIG STÅ FORSKUDT FOR DEN, DER HAR SLÅET
     BEVÆGELSE FRA. Animationen har `both`, så den holder sit FØRSTE
     billede under forsinkelsen — 18 px nede og usynlig. Introen
     lukker sig selv ved reduced-motion, så klassen sættes normalt
     aldrig; prøven sætter den i hånden og kræver, at modstykket i
     arket står. 4/9-arret: en skjule-regel uden et modstykke. */
  test('reduceret bevægelse: landingens klasse skjuler intet', async ({ browser }) => {
    const kon = await browser.newContext({ reducedMotion: 'reduce' });
    const s = await kon.newPage();
    await åbnSkal(s, '/', { data: grunddata() });
    const o = await s.evaluate(() => {
      document.documentElement.classList.add('intro-lander');
      const h = getComputedStyle(document.querySelector('.hero-in'));
      return {
        hero: Number(h.opacity), t: h.transform,
        side: Number(getComputedStyle(document.querySelector('.device')).opacity),
        krans: Number(getComputedStyle(document.querySelector('.hero-badge')).opacity),
      };
    });
    expect(o).toEqual({ hero: 1, t: 'none', side: 1, krans: 1 });
    await kon.close();
  });

  /* En helt ny gæst skal naturligvis også se den. Prøven bliver
     som den er: den koster ingenting, og den er modstykket til
     enhver regel, der en dag skulle huske noget på tværs. */
  test('en ny gæst ser den, selv om en anden har set den', async ({ browser }) => {
    const a = await browser.newContext();
    const s1 = await a.newPage();
    await åbnSkal(s1, '/', { data: grunddata() });
    await expect(s1.locator(LAG)).toHaveCount(1);
    await a.close();

    const b = await browser.newContext();
    const s2 = await b.newPage();
    await sætVagt(s2);
    await åbnSkal(s2, '/', { data: grunddata() });
    expect(await efterIndlaesning(s2)).toBe(true);
    await b.close();
  });

  /* ⚠️ OG EN PRIVAT RUDE MÅ IKKE VÆLTE SIDEN. Med lagring slået
     fra kaster selve OPSLAGET, og uden en fangst ville intet
     script køre. Vi viser introen — den milde fejl er en
     animation for meget, ikke en side, der ikke virker. */
  test('en browser uden lagring får stadig en side, der virker', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() { throw new Error('lagring er slået fra'); },
      });
    });
    await åbnSkal(page, '/', { data: grunddata() });
    await expect(page.locator(LAG)).toHaveCount(1);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  /* Briefens accepttest 3. */
  test('den findes ikke på en underside', async ({ page }) => {
    await åbnSkal(page, '/h-smorrebrod.html', { data: grunddata() });
    expect(await page.locator(LAG).count()).toBe(0);
  });

  /* ⚠️ BRIEFENS EGET PUNKT 2: siden skal være læsbar, selv hvis JS
     fejler. Prototypen lagde forsiden i #page med opacity: 0, og
     de to ting kan ikke begge være sande.

     Prøven måler det, der betyder noget: forsidens indhold står
     i DOM'et og er ikke gjort gennemsigtigt. Et #page-lag på
     opacity 0 ville fælde den her. */
  test('forsiden er IKKE skjult bag introen', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    const sc = page.locator('#sc');
    await expect(sc).toHaveCount(1);
    const gennemsigtig = await sc.evaluate((e) => {
      // Hele vejen op: er noget af kæden sat til opacity 0?
      for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
        if (Number(getComputedStyle(n).opacity) === 0) return true;
      }
      return false;
    });
    expect(gennemsigtig, 'forsiden ligger bag et gennemsigtigt lag').toBe(false);
  });

  /* Briefens accepttest 6. Hele laget er trykfladen — se noten i
     js/intro-boelge.js om hvorfor det er halvdelen af aftalen ved
     en intro, der kommer hver gang. */
  test('et klik springer den over', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await page.locator(LAG).click({ position: { x: 5, y: 5 } });
    await expect(page.locator(LAG)).toHaveCount(0, { timeout: 4000 });
  });

  /* ⚠️ ET KLIK ER HVERKEN SYNLIGT ELLER NOGET, ET TASTATUR KAN NÅ.
     Escape koster ingen pixel og ingen ændring i animationen. */
  test('Escape gør det samme', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await page.keyboard.press('Escape');
    await expect(page.locator(LAG)).toHaveCount(0, { timeout: 4000 });
  });

  /* ⚠️ ET DIREKTE LINK MÅ IKKE DÆKKES. Kommer gæsten ind på
     .../#menu fra Google, skal menukortet være der med det samme.
     En animation, der dækker netop det sted, man bad om at komme
     til, er en fejl uanset hvor kort den er. */
  test('et direkte link springer den helt over', async ({ page }) => {
    await åbnSkal(page, '/#nyheder', { data: grunddata() });
    /* ⚠️ TÆLLES MED DET SAMME, IKKE MED toHaveCount.
       toHaveCount PRØVER IGEN i fem sekunder, og introen fjerner
       sig selv efter 3,7 — så prøven bestod, uanset om laget blev
       sprunget over eller bare kørte færdigt. MÅLT: gardet blev
       fjernet, og den bestod alligevel.

       "Sprunget over" betyder her: aldrig malet. Derfor et
       synkront tal. */
    expect(await page.locator(LAG).count(),
      'introen dækkede et direkte link').toBe(0);
  });

  /* Briefens accepttest 4. */
  test('reduceret bevægelse: ingen animation', async ({ browser }) => {
    const kon = await browser.newContext({ reducedMotion: 'reduce' });
    const s = await kon.newPage();
    await åbnSkal(s, '/', { data: grunddata() });
    // Synkront, af samme grund som ved det direkte link ovenfor.
    expect(await s.locator(LAG).count()).toBe(0);
    await kon.close();
  });

  /* ⚠️ LAGET SKAL FJERNES, IKKE BARE GØRES GENNEMSIGTIGT. Et
     usynligt lag oven på forsiden fanger hvert eneste klik, og
     gæsten kan ikke bestille noget uden at vide hvorfor. Prøven
     trykker på en rigtig knap bagefter. */
  test('den slipper siden fri, når den er væk', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await page.locator(LAG).click({ position: { x: 5, y: 5 } });
    await expect(page.locator(LAG)).toHaveCount(0, { timeout: 4000 });

    const truffet = await page.evaluate(() => {
      /* ⚠️ `.brandmark` FINDES IKKE MERE (9/9). Ordmærket afløste
         kransen i topbjælken på kundens ord, og prøven pegede på
         et element, der var væk — den svarede "ingen topbjælke"
         og faldt, uden at have målt introen én gang. Reglen er
         urørt: laget må ikke fange klik. Den peger nu på det, der
         FAKTISK står i bjælken. */
      const b = document.querySelector('.topbar .ordmaerke');
      if (!b) return 'ingen topbjælke';
      const r = b.getBoundingClientRect();
      const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return e && e.closest('#intro') ? 'introen fanger stadig klik' : 'fri';
    });
    expect(truffet).toBe('fri');
  });

  /* Bundtets timings må ikke rettes uden at spørge (briefen).
     Prøven låser dem, så en "lille justering" ikke sker ved et
     uheld — summen er de 3,7 sekunder, kunden har godkendt. */
  test('bundtets faser er urørte', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    const kilde = await page.evaluate(async () => {
      const r = await fetch('js/intro-boelge.js');
      return r.text();
    });
    expect(kilde).toContain(
      'const P={fall:620,splash:150,pop:620,settle:400,shake:500,'
      + 'shine:600,blub:660,drop:540,out:520}');
  });
});
