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

/* Grunddata med bestillingen ÅBEN. Uden et bestilbart udvalg
   skjuler afsnittet sig selv, og så måler prøverne på en tom
   plads i stedet for på formularen. Kategori 9 er Øl i
   grunddata — den har en pris, så varen kan tælles op. */
function medBestilling() {
  const d = grunddata();
  d.indstillinger = { ...d.indstillinger,
    bestilbare_kategorier: [9], bestilling_varsel_timer: 0 };
  return d;
}

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
      /* Er der ikke noget at bestille på forsiden, findes
         afsnittet ikke — og formularen er det bredeste, siden
         har: to kolonner med navn og telefon, en typevælger, en
         datovælger og en tæller pr. vare. Måltes siden uden den,
         blev netop den del, der oftest stikker ud, aldrig set.
         Øllen åbnes, varslet sættes i nul, og dagens ret skrives,
         så listen har både en fremhævet række og en almindelig. */
      bestilbare_kategorier: [9],
      bestilling_varsel_timer: 0,
      dagens_ret: { navn: 'Stegt flæsk med persillesovs', beskrivelse: '', pris: 95 },
      spis_her_aaben: true };

    await åbn(page, '/index.html', { data: d });

    /* Bannerne er den vandrette ting øverst. De måles FØR der
       rulles, for de ligger over folden.

       TO bannere, ikke tre: kundens ord (22/8) — kun musikken og
       Facebook. dagens_besked står stadig i dataene her, netop
       for at målingen fælder siden, hvis beskeden en dag bliver
       til et banner igen uden at nogen har besluttet det. */
    await expect(page.locator('.bn')).toHaveCount(2);
    await expect(page.locator('.strip')).toHaveCount(0);

    // Hele vejen ned: et afsnit langt nede kan godt være det der
    // stikker ud, fx en tabel eller et billede i fuld bredde.
    for (const id of ['nyheder', 'bestil', 'smoerrebroed', 'menu',
      'hjaelp', 'isen', 'find']) {
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

  test('intet felt i bestillingen blinker i browserens egen farve', async ({ page }) => {
    /* KUNDENS FEJL, 23/8: "når man vælger noget, er en gul border
       dækket og er uprofessionelt."

       Blinket kommer fra BROWSEREN, ikke fra vores stilark, og
       det er derfor det er svært at få øje på: en test, der kun
       læser vores egne farver, ser ingenting galt. Derfor måles
       den BEREGNEDE værdi af -webkit-tap-highlight-color — det
       tal, browseren rent faktisk vil bruge.

       Reglen stod på a, button og .fyld-valg og glemte select,
       input og textarea. <select> er præcis dét, gæsten vælger
       i: Dato og Tidspunkt står begge som select. */
    await åbn(page, '/index.html', { data: medBestilling() });
    await page.locator('#bestil-form').waitFor();

    const syndere = await page.evaluate(() => {
      const felter = document.querySelectorAll(
        '#bestil-form select, #bestil-form input, #bestil-form textarea, ' +
        '#bestil-form button, #bestil-stykker button');
      const ud = [];
      felter.forEach((el) => {
        const v = getComputedStyle(el).webkitTapHighlightColor;
        // Gennemsigtig kan skrives på flere måder afhængigt af browseren
        const gennemsigtig = /rgba\(0, *0, *0, *0\)|transparent/.test(v);
        if (!gennemsigtig) ud.push((el.id || el.tagName.toLowerCase()) + ' → ' + v);
      });
      return ud;
    });

    expect(syndere, 'disse felter blinker i browserens egen farve').toEqual([]);
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

    /* Og så skal man kunne trykke på noget nedenunder. Er skuffen
       stadig i vejen, rammer klikket den i stedet.

       Der blev trykket på heroens "Book et bord". Heroen har
       ingen knapper mere (kundens ord, 22/8) — den flydende
       Bestil-pille er nu forsidens ene handling, og den ligger
       netop dér, hvor en glemt skuffe ville ligge i vejen: fast
       over indholdet. Den er altså et BEDRE mål end den gamle. */
    await page.locator('.bestil-fast').click();
    await expect(page).toHaveURL(/bestil\//);
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

    /* SYNLIG FRA FØRSTE PIXEL — kundens tredje og sidste ord om
       pillen (22/8): den skal være der HELE TIDEN på forsiden, og
       at den først kom ved rulning, var en fejl. Historikken står
       i js/side.js. */
    const knap = page.locator('.bestil-fast');
    await expect(knap, 'den faste bestil-knap mangler').toBeVisible();
    await expect(knap).not.toHaveClass(/dukket/);

    const svar = await page.evaluate(() => {
      const k = document.querySelector('.bestil-fast').getBoundingClientRect();
      return { bund: k.bottom, vindue: window.innerHeight, hoejde: k.height, bredde: k.width };
    });
    // I den nederste kant, ikke midt på skærmen
    expect(svar.vindue - svar.bund,
      'knappen står ikke i den nederste kant').toBeLessThan(40);
    // Stor nok at ramme med en tomme, og i næsten fuld bredde
    expect(svar.hoejde).toBeGreaterThanOrEqual(44);
    expect(svar.bredde).toBeGreaterThan(300);
  });

  /* OG DEN MÅ IKKE LIGGE OVEN I HEROENS TEKST.

     Den gjorde. Manchetten "Spis på trædækket …" og "Rul ned" lå
     begge bag pillen på en iPhone 13 — set på et skærmbillede
     23/8, ikke i koden. Hver regel så rigtig ud for sig: heroen
     havde 67 px luft i bunden, pillen fyldte 70. Det er summen,
     der er forkert, og den findes kun ved at måle.

     Kunden har allerede sagt det én gang (22/8): "fix ting som
     det her, der står oven i hinanden". */
  test('den klæbende knap dækker ikke heroens tekst', async ({ page }) => {
    await åbn(page, '/index.html');
    await expect(page.locator('.bestil-fast')).toBeVisible();

    const kasser = await page.evaluate(() => {
      const r = (v) => {
        const e = document.querySelector(v);
        if (!e) return null;
        const k = e.getBoundingClientRect();
        return { top: k.top, bund: k.bottom };
      };
      return { pille: r('.bestil-fast'), tekst: r('#hero-tekst'), hint: r('.scrollhint') };
    });

    expect(kasser.tekst.bund,
      `manchetten går ${Math.round(kasser.tekst.bund - kasser.pille.top)} px `
      + 'ned bag den faste bestil-knap').toBeLessThanOrEqual(kasser.pille.top);

    if (kasser.hint) {
      expect(kasser.hint.bund, '"Rul ned" ligger bag den faste bestil-knap')
        .toBeLessThanOrEqual(kasser.pille.top);
    }
  });

  /* Den skal IKKE stå på bestillingssiden. Dér er man fremme, og
     formularen har sin egen klæbende kurvelinje i bunden — to
     klæbende ting oven på hinanden er værre end ingen af dem. */
  test('bestil-knappen står ikke på bestillingssiden selv', async ({ page }) => {
    /* bestil/ og ikke smoerrebroed-ud-af-huset/: det er DÉR, den
       klæbende kurvelinje bor, og påstanden handler om de to
       klæbende ting. */
    await åbn(page, '/bestil/');
    await expect(page.locator('.bestil-fast')).toHaveCount(0);
    await expect(page.locator('#bestil-kurv')).toHaveCount(1);
  });

  /* PILLEN ER KUN PÅ FORSIDEN — kundens ord (23/8): "når man er
     inde på andre sider end forsiden, så fjern bestil-knappen der
     altid er der; ellers skal den altid være der."

     Den stod på menukortet, og det var rigtigt, dengang
     bestillingen lå på en helt tredje adresse. Nu er formularen
     forsidens, og pillen er genvejen NED til den. På menukortet
     ville den samme pille være et link væk fra den side, gæsten
     lige har valgt at kigge på — og topmenuen har allerede
     "Bestil mad". */
  test('bestil-knappen er kun på forsiden', async ({ page }) => {
    await åbn(page, '/menu.html');
    await expect(page.locator('.bestil-fast')).toHaveCount(0);
    await expect(page.locator('#hd nav a', { hasText: 'Bestil mad' })).toHaveCount(1);
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
