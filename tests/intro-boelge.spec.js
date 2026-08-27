/* ============================================================
   BØLGE-INTROEN
   ------------------------------------------------------------
   Mikkels eget bundt (27/8), afleveret som færdigt og godkendt.
   Briefen har seks accepttests; de står som prøver her, plus dem
   der følger af de fem afvigelser i js/intro-boelge.js.

   ⚠️ ÉN AF BRIEFENS SEKS ER VENDT OM. Punkt 2 siger "reload i
   samme session: ingen intro" (sessionStorage). Kunden sagde 27/8
   "hver gang man kommer ind på hjemmesiden", og det er tredje
   gang, han beder om netop det — se historikken i js/intro.js.
   Prøven måler derfor det MODSATTE af briefens punkt 2, med vilje.
   ============================================================ */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

const LAG = '#intro';

test.describe('Bølge-introen', () => {

  test('den ligger på forsiden ved hvert besøg', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await expect(page.locator(LAG)).toHaveCount(1);
  });

  /* ⚠️ IKKE sessionStorage. Se noten øverst: kunden har bedt om
     "hver gang" tre gange. Prøven åbner forsiden to gange i den
     SAMME browserkontekst — altså den samme session. */
  test('… også anden gang i den samme session', async ({ page }) => {
    await åbnSkal(page, '/', { data: grunddata() });
    await expect(page.locator(LAG)).toHaveCount(1);
    await page.reload();
    await expect(page.locator(LAG)).toHaveCount(1);
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
      const b = document.querySelector('.topbar .brandmark');
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
