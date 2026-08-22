/* Telefonen.

   Det meste af siden er skrevet med clamp() og flyder derfor med
   skærmen af sig selv. Det her er de fejl der IKKE fanger sig
   selv, og som en kunde nede ved havnen støder på med en tomme:

   1) For små trykflader. En pille på 40 px er under de 44 px både
      Apple og Google sætter som mindstemål, og på siden står de
      tæt: tre menufaner, "Ring", "Vis rute".

   2) Vandret rulning. Ét element der stikker 12 px ud gør hele
      siden skæv, og man opdager det først på en rigtig telefon.

   3) Noget der bliver siddende oven på indholdet. Skuffemenuen
      dækker hele skærmen – bliver den i DOM'en efter lukning,
      fanger den hvert klik bagefter.

   Testene kører i telefonprofilen. Kører de i computerprofilen,
   springes de over: dér måler de ingenting.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

test.describe('På en telefon', () => {

  test.skip(({ isMobile }) => !isMobile, 'kun i telefonprofilen');

  test('siden kan ikke rulles sidelæns', async ({ page }) => {
    /* MED NYHEDER OG ET ARRANGEMENT, ikke med grunddata alene.

       To af forsidens afsnit skjuler sig selv, når der ikke er
       noget at vise, og bannerne findes slet ikke uden en besked
       eller en begivenhed. Måltes siden tom, ville de dele der
       oftest stikker ud — de vandrette striber og bannerne —
       aldrig blive målt. */
    const d = grunddata({
      nyheder: [
        { id: 1, titel: 'Længere åbent i weekenden fra september',
          tekst: 'Fredag og lørdag holder vi åbent til 21.', dato: '2026-08-06', aktiv: true },
      ],
      kalender: [
        { id: 1, type: 'arrangement', dato: '2026-08-29', slut_dato: null,
          titel: 'Live musik på molen hele aftenen',
          beskrivelse: 'Grillen er tændt, og der spilles fra 19.',
          emoji: null, offentlig: true },
      ],
    });
    d.indstillinger = { ...d.indstillinger,
      dagens_besked: { vis: true, tekst: 'Vi lukker kl. 16 på torsdag.' },
      /* Uden en ret findes bestillingspanelet ikke — og det er det
         bredeste, siden har: to kolonner med navn og telefon, en
         segmentvælger og en tæller. Måltes siden uden det, blev
         netop den del, der oftest stikker ud, aldrig set. */
      dagens_ret: { navn: 'Stegt flæsk med persillesovs', beskrivelse: '', pris: 95 },
      spis_her_aaben: true };

    await åbn(page, '/index.html', { data: d });

    /* Bannerne og genvejsstriben er de to vandrette ting øverst.
       De måles FØR der rulles, for de ligger over folden.

       TRE bannere: arrangementet, dagens besked og Facebook. Det
       sidste står der altid — se noten i visBannere() i
       js/side.js om hvorfor linket alligevel ikke er opfundet. */
    await expect(page.locator('.bn')).toHaveCount(3);
    await expect(page.locator('.strip a')).toHaveCount(5);

    // Hele vejen ned: et afsnit langt nede kan godt være det der
    // stikker ud, fx en tabel eller et billede i fuld bredde.
    for (const id of ['dagens', 'nyheder', 'hjaelp', 'menu', 'isen', 'find']) {
      await page.locator('#' + id).scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      /* DER MÅLES MOD SKÆRMEN, IKKE MOD window.innerWidth.

         Den her test kunne indtil 21. august 2026 IKKE FEJLE, og
         det tog en fejlindsprøjtning at opdage: striben fik med
         vilje width: 900px på en skærm på 390, og testen sagde
         stadig bestået.

         Grunden er telefonens layoutviewport. Siden har
         width=device-width, og når indholdet stikker ud, zoomer
         browseren UD, så det kan være der. window.innerWidth
         vokser med — den blev 900 i forsøget. Så sammenlignede
         testen 900 mod 900 og var tilfreds, mens gæsten sad med en
         side, hun kunne skubbe til side.

         page.viewportSize() er den skærm, vi HAR bedt om, og den
         står fast uanset hvad siden gør. Det er den, der svarer
         til en rigtig telefon.

         Det er værd at huske som mønster: en måling der henter
         BEGGE sine tal fra det, den måler på, kan ikke fælde
         noget. Det ene tal skal komme udefra. */
      const bredde = page.viewportSize().width;
      const side = await page.evaluate(() => document.documentElement.scrollWidth);

      expect(side, `siden er ${side - bredde} px bredere end skærmen ved #${id}`)
        .toBeLessThanOrEqual(bredde + 1);
    }
  });

  test('alt man skal trykke på er mindst 44 px højt', async ({ page }) => {
    await åbn(page, '/index.html');

    // Menukortets faner og de øvrige piller. Skuffemenuen måles
    // for sig, for den skal først åbnes.
    const smaa = page.locator('.glass.sm:visible');
    const antal = await smaa.count();
    expect(antal, 'der blev ikke fundet nogen piller at måle').toBeGreaterThan(2);

    const forSmaa = [];
    for (let i = 0; i < antal; i++) {
      const el = smaa.nth(i);
      const kasse = await el.boundingBox();
      if (kasse && kasse.height < 44) {
        forSmaa.push(`${(await el.textContent()).trim()} = ${Math.round(kasse.height)}px`);
      }
    }
    expect(forSmaa, `for lave trykflader: ${forSmaa.join(', ')}`).toEqual([]);
  });

  test('burgeren og lukkekrydset kan rammes', async ({ page }) => {
    await åbn(page, '/index.html');

    for (const vaelger of ['#burger']) {
      const kasse = await page.locator(vaelger).boundingBox();
      expect(kasse.width, `${vaelger} er kun ${kasse.width}px bred`).toBeGreaterThanOrEqual(44);
      expect(kasse.height, `${vaelger} er kun ${kasse.height}px høj`).toBeGreaterThanOrEqual(44);
    }

    await page.locator('#burger').click();
    await expect(page.locator('#ark')).toBeVisible();

    /* Vent til skuffen står STILLE, før der måles. Krydset er
       nøjagtigt 44 px, og mens arket glider ind (translateY),
       står det på en brøkdel af en pixel — så svarer
       getBoundingClientRect 43,99997, og testen faldt i ny og næ
       under fuld last, hvor målingen oftere ramte midt i glidningen. */
    await page.locator('#ark').evaluate((el) =>
      Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));

    const kryds = await page.locator('#ark-luk').boundingBox();
    expect(kryds.height).toBeGreaterThanOrEqual(44);

    // Links i skuffen skal også kunne rammes
    const link = await page.locator('#ark a').first().boundingBox();
    expect(link.height, 'menupunkterne i skuffen er for lave').toBeGreaterThanOrEqual(44);
  });

  test('skuffemenuen slipper siden igen når den lukkes', async ({ page }) => {
    await åbn(page, '/index.html');

    await page.locator('#burger').click();
    await expect(page.locator('#ark')).toBeVisible();
    await page.locator('#ark-luk').click();
    await expect(page.locator('#ark')).toBeHidden();

    // Og så skal man kunne trykke på noget nedenunder. Er skuffen
    // stadig i vejen, rammer klikket den i stedet.
    /* Heroens knapper er "Bestil dagens ret" og "Book et bord"
       efter designbundtets opstilling. Bordknappen fører altid til
       en anden side; bestil-knappen skifter til et anker på siden
       selv, når køkkenet har skrevet en dagens ret. */
    await page.locator('.hero a[href="bord/"]').click();
    await expect(page).toHaveURL(/bord\//);
  });

  test('topmenuen er ikke i vejen når man hopper til et afsnit', async ({ page }) => {
    await åbn(page, '/index.html');

    await page.locator('#burger').click();
    await page.locator('#ark a[href="#isen"]').click();
    await page.waitForTimeout(900);

    // Overskriften skal stå UNDER den faste topmenu, ikke bag den
    const svar = await page.evaluate(() => {
      const h = document.getElementById('hd').getBoundingClientRect();
      const m = document.querySelector('#isen .head h2').getBoundingClientRect();
      return { menuBund: h.bottom, overskriftTop: m.top };
    });
    expect(svar.overskriftTop,
      'overskriften ligger bag den faste topmenu').toBeGreaterThanOrEqual(svar.menuBund - 1);
  });

  test('hero fylder skærmen uden at overskriften brækker ud af den', async ({ page }) => {
    await åbn(page, '/index.html');

    const svar = await page.evaluate(() => {
      const hero = document.querySelector('.hero').getBoundingClientRect();
      const h1 = document.querySelector('.hero h1').getBoundingClientRect();
      const pille = document.getElementById('hero-status').getBoundingClientRect();
      return {
        heroHoejde: hero.height,
        vindue: window.innerHeight,
        h1Hoejre: h1.right,
        breddeVindue: window.innerWidth,
        pilleSynlig: pille.bottom <= hero.bottom + 1,
      };
    });

    // Hero skal dække skærmen – det er det første indtryk
    expect(svar.heroHoejde).toBeGreaterThanOrEqual(svar.vindue * 0.9);
    // Overskriften må ikke stikke ud til siden
    expect(svar.h1Hoejre).toBeLessThanOrEqual(svar.breddeVindue + 1);
    // "Er der åbent" skal være med i det første skærmbillede
    expect(svar.pilleSynlig, 'åbent-pillen ligger uden for hero').toBe(true);
  });

  /* MOBILBJÆLKEN ER FJERNET.

     Fire faste genveje nederst tog 56 px af skærmen permanent, oven
     i bådstribens 66 – på en iPhone 14% af skærmen der aldrig viste
     indhold. Kunden pegede på den tre gange.

     De to ting den var til for, ring og find vej, står nu øverst i
     skuffemenuen som knapper. Testene her holder øje med at de
     virkelig ER der: fjerner man en bjælke uden at flytte det den
     kunne, har man taget noget fra gæsten. */
  /* NEDERST PÅ TELEFONEN ER DER ÉN TING, OG DET ER BESTIL-KNAPPEN.

     Rækkefølgen har været: en bjælke med fire genveje (56 px), så
     bjælken væk og båden alene (66 px), og nu knappen alene.

     Der er kun plads til én ting i den nederste kant, og af båden og
     knappen er det knappen der er til noget: båden er en rullemåler,
     knappen er forretningens forretning. Båden bliver på en computer,
     hvor der er plads i en kant hvor der ikke er andet. */
  test('bjælken og båden er væk, og bestil-knappen har pladsen', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('.mobilbar')).toHaveCount(0);
    await expect(page.locator('#sail')).toBeHidden();

    /* OPPE I HEROEN HOLDER PILLEN SIG VÆK. Heroens egen røde knap
       står der allerede — to knapper med samme handling oven i
       hinanden lignede en fejl på kundens telefon, og js/side.js
       gemmer pillen, så længe heroens knaprække kan ses. */
    const knap = page.locator('.bestil-fast');
    await expect(knap, 'pillen står oven i heroens egne knapper')
      .toHaveClass(/dukket/);

    /* Forbi heroen dukker den op — og bliver stående resten af
       vejen. #hjaelp findes altid; nyhedsafsnittet kræver nyheder. */
    await page.locator('#hjaelp').scrollIntoViewIfNeeded();
    await expect(knap, 'den faste bestil-knap mangler efter heroen')
      .not.toHaveClass(/dukket/);
    await expect(knap).toBeVisible();

    /* expect.poll, ikke én måling: klassen ryger med det samme,
       men knappen GLIDER op på plads. Målt midt i flyvningen står
       den "midt på skærmen" uden at være det. */
    await expect.poll(async () => page.evaluate(() => {
      const k = document.querySelector('.bestil-fast').getBoundingClientRect();
      return window.innerHeight - k.bottom;
    }), { message: 'knappen står ikke i den nederste kant' }).toBeLessThan(40);

    const svar = await page.evaluate(() => {
      const k = document.querySelector('.bestil-fast').getBoundingClientRect();
      return { hoejde: k.height, bredde: k.width };
    });
    // Stor nok at ramme med en tomme, og i næsten fuld bredde
    expect(svar.hoejde).toBeGreaterThanOrEqual(44);
    expect(svar.bredde).toBeGreaterThan(300);
  });

  /* Den skal IKKE stå på bestillingssiden. Dér er man fremme, og
     formularen har sin egen klæbende kurvelinje i bunden — to
     klæbende ting oven på hinanden er værre end ingen af dem. */
  test('bestil-knappen står ikke på bestillingssiden selv', async ({ page }) => {
    await åbn(page, '/smoerrebroed-ud-af-huset/');
    await expect(page.locator('.bestil-fast')).toHaveCount(0);
  });

  test('bestil-knappen er også med på menukortet', async ({ page }) => {
    await åbn(page, '/menu.html');
    await expect(page.locator('.bestil-fast')).toBeVisible();
    await page.locator('.bestil-fast').click();
    await expect(page).toHaveURL(/smoerrebroed-ud-af-huset/);
  });

  test('ring og find vej kan nås fra skuffemenuen', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#burger').click();
    await expect(page.locator('#ark')).toBeVisible();

    const ring = page.locator('.ark-handling a[href^="tel:"]');
    const rute = page.locator('.ark-handling a[data-rute]');
    await expect(ring, 'telefonnummeret mangler i skuffemenuen').toHaveCount(1);
    await expect(rute, '"Find vej" mangler i skuffemenuen').toHaveCount(1);

    // Rutelinket skal være udfyldt, ikke stå som "#"
    await expect(rute).toHaveAttribute('href', /maps|google/i);

    for (const el of [ring, rute]) {
      const k = await el.boundingBox();
      expect(k.height, 'en knap i skuffemenuen er under 44 px').toBeGreaterThanOrEqual(44);
    }
  });

  test('menupunkterne i skuffen er store nok', async ({ page }) => {
    await åbn(page, '/index.html');
    await page.locator('#burger').click();

    const punkter = await page.locator('.ark-liste a').all();
    expect(punkter.length, 'skuffemenuen er tom').toBeGreaterThan(3);
    for (const a of punkter) {
      const k = await a.boundingBox();
      expect(k.height, `"${(await a.textContent()).trim()}" er ${Math.round(k.height)}px høj`)
        .toBeGreaterThanOrEqual(44);
    }
  });

  /* BÅDEN MÅLES IKKE LÆNGERE HER.

     Der stod to tests: at bådstriben ikke dækkede footeren når man
     havde rullet ned, og at den faktisk blev tegnet på en telefon —
     den sidste læste pixels ud af canvas'et, fordi js/baad.js springer
     fra når clientWidth er 0 og en usynlig fejl dér ville give en tom
     stribe.

     Båden er slået fra under 900 px. Bestil-knappen har den plads nu.
     Testene er flyttet til baad.spec.js, som kører i computerprofilen,
     hvor båden findes. */

});
