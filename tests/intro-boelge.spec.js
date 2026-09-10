/* ============================================================
   BØLGE-INTROEN
   ------------------------------------------------------------
   Mikkels eget bundt (27/8), afleveret som færdigt og godkendt.
   Briefen har seks accepttests; de står som prøver her, plus dem
   der følger af de fem afvigelser i js/intro-boelge.js.

   ⚠️ OG SÅ ER DEN VENDT TILBAGE (10/9) — KUNDENS EGEN VENDING.
   Punkt 2 i briefen sagde "reload i samme session: ingen intro".
   Kunden bad 27/8 om "hver gang man kommer ind på hjemmesiden",
   og prøven vogtede DET i to uger. 10/9 vendte han det selv:
   *"vi skal have fixet logo animationen til kun at virke første
   gang en bruger bruger hjemmesiden for første gang."*

   Prøverne herunder er derfor VENDT MED GRUNDEN, ikke slettet —
   det er en beslutning om hans eget produkt, ikke en forældet
   prøve. Og de er blevet SKARPERE: der er nu et modstykke, som
   kræver, at introen FAKTISK kommer første gang. Uden det ville
   en regel, der aldrig viste den, bestå.

   ⚠️ localStorage OG IKKE sessionStorage: hans ord er FØRSTE
   GANG, ikke "én gang pr. fane".
   ============================================================ */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

const LAG = '#intro';

test.describe('Bølge-introen', () => {

  /* ⚠️ MODSTYKKET, OG DET ER DET VIGTIGSTE AF DE TO. Uden det
     ville en regel, der ALDRIG viste introen, bestå prøven
     nedenfor — og gæsten ville aldrig se den. */
  test('den kommer FØRSTE gang, en gæst er på forsiden', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await expect(page.locator(LAG)).toHaveCount(1);
  });

  /* ⚠️ VENDT 10/9 — kundens egen beslutning, se noten øverst.
     Prøven åbner forsiden to gange i den SAMME browserkontekst,
     altså med det samme localStorage. */
  test('… og ikke anden gang', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await expect(page.locator(LAG)).toHaveCount(1);
    await page.reload();
    await expect(page.locator(LAG)).toHaveCount(0);
  });

  /* ⚠️ OG EN NY GÆST SKAL SE DEN. En regel, der huskede på tværs
     af browsere, ville betyde, at kun det allerførste menneske i
     verden så introen. Prøven åbner en HELT ny kontekst — tom
     localStorage, som en gæst, der aldrig har været her. */
  test('en ny gæst ser den, selv om en anden har set den', async ({ browser }) => {
    const a = await browser.newContext();
    const s1 = await a.newPage();
    await åbnSkal(s1, '/', { data: grunddata() });
    await expect(s1.locator(LAG)).toHaveCount(1);
    await a.close();

    const b = await browser.newContext();
    const s2 = await b.newPage();
    await åbnSkal(s2, '/', { data: grunddata() });
    await expect(s2.locator(LAG)).toHaveCount(1);
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
