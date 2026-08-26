/* KORTVISNINGEN — menuen, som den ser ud ved bordet.

   Forsiden og bestil/ folder menuen sammen. Det er rigtigt dér:
   gæsten har allerede besluttet, hvad hun vil, og folden holder
   formularen kort nok til en telefon.

   Ved bordet er det modsat. Hun har ikke læst kortet, hun sidder
   med 242 varer og en telefon i sollys, og lugen er tyve meter
   væk. En foldet liste er så mange tryk, at man rejser sig og går
   op og spørger — og så var QR-koden spildt.

   Derfor: åbne afsnit, et søgefelt og chips. ⚠️ Men KUN tegningen
   skifter. Udvalget, kurven, summen, det sidste kig og
   afsendelsen er de samme linjer kode som de to andre steder, og
   nederst i filen står de prøver, der holder de to andre sider
   fast på foldene. Skrider de fra hinanden, sælger de to udgaver
   langsomt noget forskelligt.

   ALLERGIEN er sit eget felt her og ikke en sætning i "Besked".
   Et køkken, der skimmer, kan overse et ord — og forskellen på en
   middag og en ambulance må ikke ligge i, hvor godt nogen læste.
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata, gemteData } = require('./hjaelp');

const SIDE = '/ved-bordet/?bord=7';
// Torsdag 6. august 2026 kl. 13.00 dansk tid — midt i åbningstiden.
const UR = '2026-08-06T11:00:00Z';

const BORDE = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 },
];

/* Menuen her er grunddata's, men med de tre ting kortvisningen
   lever af: en beskrivelse med et ord, der IKKE står i navnet
   (søgningen skal finde det), et æ/ø/å-navn, og en note på
   kategorien.

   ⚠️ To ting styrer, om en kategori overhovedet står i listen, og
   begge kostede en runde her: den skal være åbnet i admin
   (bestilbare_kategorier), og den må ikke være en IS-kategori —
   isen kan ikke bestilles noget sted, heller ikke fra et bord.
   Smørrebrødet er med af sig selv; det er formularens fundament. */
function menudata(ændringer = {}) {
  const g = grunddata({ borde: BORDE });

  g.menu_kategorier = [
    { id: 1, afdeling: 'mad', navn: 'Smørrebrød', sortering: 6, aktiv: true,
      note: 'På toastbrød eller rugbrød' },
    { id: 20, afdeling: 'mad', navn: 'Dessert', sortering: 30, aktiv: true },
    { id: 9, afdeling: 'drikke', navn: 'Øl', sortering: 40, aktiv: true },
    // Isen står MED i kortet — og skal aldrig kunne bestilles.
    { id: 6, afdeling: 'is', navn: 'Softice og vafler', sortering: 50, aktiv: true },
  ];

  g.menu_varer = [
    {
      id: 1, kategori_id: 1, navn: 'Havnens all in one',
      beskrivelse: 'Med bacon, rødbeder og remoulade.',
      pris: 89, fremhaevet: true, udsolgt: false, sortering: 1, aktiv: true,
    },
    {
      id: 2, kategori_id: 1, navn: 'Røget ål', beskrivelse: null,
      pris: 75, fremhaevet: false, udsolgt: false, sortering: 2, aktiv: true,
    },
    {
      id: 3, kategori_id: 20, navn: 'Rødgrød med fløde', beskrivelse: null,
      pris: 45, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
    },
    {
      id: 4, kategori_id: 9, navn: 'Fadøl, lille', beskrivelse: null,
      pris: 35, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
    },
    {
      id: 5, kategori_id: 6, navn: 'Softice med guf', beskrivelse: null,
      pris: 35, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
    },
  ];

  g.indstillinger = { ...g.indstillinger, bestilbare_kategorier: [20, 9, 6] };

  return { ...g, ...ændringer };
}

async function åbnBord(page, data = menudata()) {
  await åbn(page, SIDE, { ur: UR, data });
  await expect(page.locator('#bestil-form')).toBeVisible();
}

/* Søgefeltet venter 120 ms efter sidste tastetryk, så listen ikke
   tegnes om ved hvert bogstav. Prøverne venter på RESULTATET og
   ikke på uret — en fast pause ville enten være for kort på en
   langsom maskine eller spilde tid på en hurtig. */
async function soeg(page, tekst) {
  await page.fill('.kort-soeg', tekst);
}

function synligeVarer(page) {
  return page.locator('#bestil-stykker .stk-linje:not([hidden])');
}

test.describe('Menuen er åben ved bordet', () => {

  test('der er ingen folde — alle afsnit står åbne', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('#bestil-stykker .fold-hoved')).toHaveCount(0);
    await expect(page.locator('#bestil-stykker .kort-gruppe')).toHaveCount(3);
    // Og varerne er synlige uden et eneste tryk
    await expect(synligeVarer(page)).toHaveCount(4);
  });

  /* Ejerens egen note på kategorien — "På toastbrød eller
     rugbrød". Den stod kun på menukortet før, og ved bordet er
     den mere værd: her bestiller man UDEN at have læst kortet. */
  test('kategoriens note fra admin står under overskriften', async ({ page }) => {
    await åbnBord(page);
    const afsnit = page.locator('.kort-gruppe[data-gruppe="Smørrebrød"]');
    await expect(afsnit.locator('.kort-gruppe-note'))
      .toHaveText('På toastbrød eller rugbrød');
    // En kategori uden note får ingen tom linje
    await expect(page.locator('.kort-gruppe[data-gruppe="Øl"] .kort-gruppe-note'))
      .toHaveCount(0);
  });
});

/* ⚠️ DEN HER PRØVE ER SKREVET EFTER EN FEJL, DER KOSTEDE EN TIME.

   Bordsiden lånte designsystemet ved at indlæse havnegrillen.css.
   Den fil er BUNDTETS, og dens body-regel er artboardets: mørk
   flade, display:grid, place-items:center — den centrerer en
   428 px telefonattrap. På en rigtig telefon gjorde
   place-items:center <main> til et gitterbarn på max-content, og
   siden voksede fra 390 til 531 px.

   Det var ikke til at se. Browseren zoomede ud, så alt så rigtigt
   ud på et skærmbillede — men chipsene lå nu et andet sted, end
   fingeren troede, og et tryk på "Øl" ramte "Smørrebrød". Fem
   prøver løb tør for tid på et klik, der ikke kunne ske.

   ⚠️ MÅLET SKAL KOMME UDEFRA. Den nærliggende prøve —
   scrollWidth mod window.innerWidth — kan ikke fejle her: begge
   tal kommer fra siden selv, og innerWidth VOKSER med indholdet,
   når telefonen zoomer ud. Den ville have sagt 531 mod 531 og
   bestået. Playwrights egen viewport-bredde er tallet udefra. */
test.describe('Siden passer på en telefon', () => {

  test('bordsiden kan ikke rulles sidelæns', async ({ page, viewport, isMobile }) => {
    test.skip(!isMobile, 'siden findes kun bag en QR-kode på et bord');
    await åbnBord(page);
    const bred = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(bred, 'siden er bredere end telefonen').toBeLessThanOrEqual(viewport.width + 1);
  });

  /* Chipsstriben er BREDERE end skærmen med vilje — den ruller
     for sig selv. Den må bare ikke trække siden med sig. */
  test('chipsstriben ruller for sig selv, ikke hele siden', async ({ page, viewport, isMobile }) => {
    test.skip(!isMobile, 'siden findes kun bag en QR-kode på et bord');
    const d = menudata();
    // Nok kategorier til at striben helt sikkert er for lang
    d.menu_kategorier = d.menu_kategorier.concat(
      [31, 32, 33, 34].map((id) => ({
        id, afdeling: 'mad', navn: 'Kategori nummer ' + id, sortering: 60 + id, aktiv: true,
      })),
    );
    d.menu_varer = d.menu_varer.concat(
      [31, 32, 33, 34].map((id) => ({
        id: id * 10, kategori_id: id, navn: 'Vare ' + id, beskrivelse: null,
        pris: 40, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
      })),
    );
    d.indstillinger = {
      ...d.indstillinger,
      bestilbare_kategorier: [20, 9, 6, 31, 32, 33, 34],
    };
    await åbnBord(page, d);

    const m = await page.evaluate(() => {
      const r = document.querySelector('.kort-chips');
      return { rulleBred: r.scrollWidth, synligBred: r.clientWidth,
        side: document.documentElement.scrollWidth };
    });
    expect(m.rulleBred, 'striben er ikke for lang — prøven måler ingenting')
      .toBeGreaterThan(m.synligBred);
    expect(m.side, 'chipsstriben trækker hele siden med sig')
      .toBeLessThanOrEqual(viewport.width + 1);
  });
});

test.describe('Søgningen', () => {

  test('finder et ord, der kun står i beskrivelsen', async ({ page }) => {
    await åbnBord(page);
    await soeg(page, 'bacon');
    await expect(synligeVarer(page)).toHaveCount(1);
    await expect(synligeVarer(page).first()).toContainText('Havnens all in one');
  });

  /* Gæsten står i sollys med en telefon og rammer ikke altid æ,
     ø og å. "rodgrod" skal finde rødgrød. */
  test('æ, ø og å foldes ned, så rodgrod finder rødgrød', async ({ page }) => {
    await åbnBord(page);
    await soeg(page, 'rodgrod');
    await expect(synligeVarer(page)).toHaveCount(1);
    await expect(synligeVarer(page).first()).toContainText('Rødgrød');
  });

  test('et afsnit uden træf skjuler sig selv — overskriften bliver ikke stående', async ({ page }) => {
    await åbnBord(page);
    await soeg(page, 'fadøl');
    await expect(page.locator('.kort-gruppe[data-gruppe="Øl"]')).toBeVisible();
    await expect(page.locator('.kort-gruppe[data-gruppe="Smørrebrød"]')).toBeHidden();
    await expect(page.locator('.kort-gruppe[data-gruppe="Dessert"]')).toBeHidden();
  });

  /* Isen kan ikke bestilles NOGET sted — heller ikke fra et bord,
     hvor gæsten sidder tyve meter fra ishuset. "Det er altid til
     rådighed", og filteret ligger i Butik.udvalg, ikke i
     opmærkningen. En søgning skal derfor heller ikke kunne grave
     den frem her. */
  test('isen er ikke i menuen ved bordet, heller ikke via søgningen', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('.kort-gruppe[data-gruppe="Softice og vafler"]')).toHaveCount(0);
    await soeg(page, 'softice');
    await expect(synligeVarer(page)).toHaveCount(0);
    await expect(page.locator('.kort-intet')).toBeVisible();
  });

  /* En tom skærm er ikke et svar. Og ved bordet skal svaret pege
     på lugen — der ER et menneske tyve meter væk. */
  test('ingen træf siger hvad der blev søgt på, og peger på lugen', async ({ page }) => {
    await åbnBord(page);
    await soeg(page, 'pizza');
    await expect(synligeVarer(page)).toHaveCount(0);
    const tom = page.locator('.kort-intet');
    await expect(tom).toBeVisible();
    await expect(tom).toContainText('pizza');
    await expect(tom).toContainText('lugen');
  });

  test('beskeden forsvinder igen, når søgningen ryddes', async ({ page }) => {
    await åbnBord(page);
    await soeg(page, 'pizza');
    await expect(page.locator('.kort-intet')).toBeVisible();
    await soeg(page, '');
    await expect(page.locator('.kort-intet')).toBeHidden();
    await expect(synligeVarer(page)).toHaveCount(4);
  });

  /* Tælleren retter tallet på PLADSEN og tegner ikke om — så den
     her kan ikke fejle på, hvor søgeteksten er gemt. Den holder
     fast i noget andet: den dag nogen får listen til at tegne sig
     om ved hvert tryk, må søgningen ikke ryge med. */
  test('søgningen står, når varen lægges i kurven', async ({ page }) => {
    await åbnBord(page);
    await soeg(page, 'bacon');
    await expect(synligeVarer(page)).toHaveCount(1);

    await synligeVarer(page).first().locator('button', { hasText: '+' }).click();

    await expect(page.locator('.kort-soeg')).toHaveValue('bacon');
    await expect(synligeVarer(page)).toHaveCount(1);
    await expect(synligeVarer(page).first().locator('.taeller-tal')).toHaveText('1');
  });
});

/* ANDEN RUNDE. Selskabet ved bord 7 bestiller mad, og bagefter is
   — det er den vej, siden er bygget til, og databasen har sin egen
   regel om den (dubletvagten gælder ikke bordene).

   Menuen skal være HEL igen. Stod søgningen på "fadøl", ville de
   møde et kort med én øl på og et søgefelt, de ikke havde
   skrevet i. */
test.describe('Bestil noget mere', () => {

  async function sendEnBestilling(page) {
    await synligeVarer(page).first().locator('button', { hasText: '+' }).click();
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '30 20 10 40');
    await page.click('#bestil-send');
    await page.click('#kig-send');
    await expect(page.locator('#bestil-tak')).toBeVisible();
  }

  test('anden runde giver hele menuen igen, med tomt søgefelt', async ({ page }) => {
    await åbnBord(page);
    await soeg(page, 'bacon');
    await expect(synligeVarer(page)).toHaveCount(1);
    await sendEnBestilling(page);

    await page.locator('button', { hasText: 'Bestil noget mere' }).click();
    await expect(page.locator('.kort-soeg')).toHaveValue('');
    await expect(synligeVarer(page)).toHaveCount(4);
  });

  test('anden runde nulstiller også chippen', async ({ page }) => {
    await åbnBord(page);
    await page.locator('.kort-chip', { hasText: 'Øl' }).click();
    await expect(synligeVarer(page)).toHaveCount(1);
    await sendEnBestilling(page);

    await page.locator('button', { hasText: 'Bestil noget mere' }).click();
    await expect(page.locator('.kort-chip.on')).toHaveText('Alt');
    await expect(synligeVarer(page)).toHaveCount(4);
  });
});

test.describe('Chipsene', () => {

  test('en chip pr. afsnit, og Alt er valgt fra start', async ({ page }) => {
    await åbnBord(page);
    const chips = page.locator('.kort-chips .kort-chip');
    // Alt + Favoritter + de tre afsnit
    await expect(chips).toHaveCount(5);
    await expect(chips.first()).toHaveText('Alt');
    await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('en chip viser kun sit eget afsnit', async ({ page }) => {
    await åbnBord(page);
    await page.locator('.kort-chip', { hasText: 'Øl' }).click();
    await expect(synligeVarer(page)).toHaveCount(1);
    await expect(synligeVarer(page).first()).toContainText('Fadøl');
    await expect(page.locator('.kort-gruppe[data-gruppe="Smørrebrød"]')).toBeHidden();
  });

  /* ⚠️ FAVORITTERNE ER EJERENS EGNE (fremhaevet i admin) og
     hedder derfor ikke "Mest bestilt". Vi MÅLER ikke, hvad der
     sælges mest — de tal er personalets og må ikke læses af en
     gæst. Et ord, der lover en optælling, vi ikke har lavet, er
     et opdigtet tal, og dem har vi en aftale om. */
  test('Favoritter er ejerens markering — ikke en optælling af salg', async ({ page }) => {
    await åbnBord(page);
    const chip = page.locator('.kort-chip', { hasText: 'Favoritter' });
    await expect(chip).toHaveText('★ Favoritter');
    await chip.click();
    await expect(synligeVarer(page)).toHaveCount(1);
    await expect(synligeVarer(page).first()).toContainText('Havnens all in one');

    // Og ordet står ingen steder på siden
    await expect(page.locator('body')).not.toContainText('Mest bestilt');
  });

  /* En tom chip er et løfte om en liste, der ikke findes. */
  test('har ejeren ikke fremhævet noget, er der ingen Favoritter-chip', async ({ page }) => {
    const d = menudata();
    d.menu_varer = d.menu_varer.map((v) => ({ ...v, fremhaevet: false }));
    await åbnBord(page, d);
    await expect(page.locator('.kort-chip', { hasText: 'Favoritter' })).toHaveCount(0);
    await expect(page.locator('.kort-chips .kort-chip')).toHaveCount(4);
  });

  /* Chippen SNÆVRER ind, søgningen snævrer ind — sammen skal de
     snævre ind. Var det et enten-eller, ville en gæst, der har
     valgt Øl og søger "rødgrød", få en dessert serveret som en øl. */
  test('søgning og chip virker sammen', async ({ page }) => {
    await åbnBord(page);
    await page.locator('.kort-chip', { hasText: 'Smørrebrød' }).click();
    await soeg(page, 'rødgrød');
    await expect(synligeVarer(page)).toHaveCount(0);
    await expect(page.locator('.kort-intet')).toBeVisible();
  });

  test('chippen overlever også, at man lægger varen i kurven', async ({ page }) => {
    await åbnBord(page);
    await page.locator('.kort-chip', { hasText: 'Øl' }).click();
    await synligeVarer(page).first().locator('button', { hasText: '+' }).click();
    await expect(page.locator('.kort-chip.on')).toContainText('Øl');
    await expect(synligeVarer(page)).toHaveCount(1);
  });
});

/* ============================================================
   EMOJIERNE — de SAMME som på menukortet
   ------------------------------------------------------------
   Kunden bad om emojier og farver (24/8). Listen bor i
   js/menu-emoji.js, og det er hele pointen: gæsten kigger på
   menukortet og bestiller herfra, så en kategori skal have det
   samme ansigt begge steder. To lister ville skride fra
   hinanden — ejeren opretter "Vegansk", nogen føjer et tegn til
   den ene fil, og ingen kan se forskellen i koden.
   ============================================================ */
test.describe('Emojierne', () => {

  test('hvert afsnit har menukortets eget tegn', async ({ page }) => {
    await åbnBord(page);
    const tegn = (g) => page.locator(`.kort-gruppe[data-gruppe="${g}"] .kort-tegn`);
    await expect(tegn('Smørrebrød')).toHaveText('🍞');
    await expect(tegn('Øl')).toHaveText('🍺');
    // "Dessert" rammer /kage|dessert/ i listen
    await expect(tegn('Dessert')).toHaveText('🍰');
  });

  /* Farven bag tegnet kommer fra AFDELINGEN, som ejeren sætter i
     admin — ikke fra kategorinavnet. Tre sande farver slår
     enogtyve gættede. */
  test('farven bag tegnet kommer fra afdelingen', async ({ page }) => {
    await åbnBord(page);
    const klasse = (g) => page.locator(`.kort-gruppe[data-gruppe="${g}"] .kort-tegn`)
      .getAttribute('class');
    expect(await klasse('Smørrebrød')).toContain('kort-tegn-mad');
    expect(await klasse('Øl')).toContain('kort-tegn-drikke');

    const farver = await page.evaluate(() => {
      const f = (g) => getComputedStyle(
        document.querySelector(`.kort-gruppe[data-gruppe="${g}"] .kort-tegn`)).backgroundColor;
      return { mad: f('Smørrebrød'), drikke: f('Øl') };
    });
    expect(farver.mad, 'afdelingsfarven slår ikke igennem').not.toBe(farver.drikke);
  });

  test('chipsene bærer de samme tegn', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('.kort-chip', { hasText: 'Øl' })).toContainText('🍺');
  });

  /* Tegnet er pynt. En skærmlæser skal høre "Smørrebrød", ikke
     "brød Smørrebrød" — og søgningen skal stadig kunne finde
     afsnittet på navnet. */
  test('tegnet er skjult for skærmlæsere, og navnet står for sig', async ({ page }) => {
    await åbnBord(page);
    const titel = page.locator('.kort-gruppe[data-gruppe="Smørrebrød"] .kort-gruppe-titel');
    await expect(titel.locator('.kort-tegn')).toHaveAttribute('aria-hidden', 'true');
    await expect(titel.locator('.kort-gruppe-navn')).toHaveText('Smørrebrød');
  });

  /* ⚠️ Mangler filen, må menuen ikke gå i stå. Et manglende tegn
     er en skæv tegning; en tom side er en gæst, der går op til
     lugen. */
  test('uden js/menu-emoji.js står afsnittene bare uden tegn', async ({ page }) => {
    await page.route('**/js/menu-emoji.js*', (r) => r.fulfill({
      status: 200, contentType: 'application/javascript', body: '',
    }));
    await åbnBord(page);
    await expect(page.locator('.kort-tegn')).toHaveCount(0);
    await expect(page.locator('.kort-gruppe')).toHaveCount(3);
    await expect(synligeVarer(page)).toHaveCount(4);
  });
});

test.describe('Allergien er sit eget felt', () => {

  /* Vi PÅSTÅR ikke at kende allergenerne. Der står ikke
     "glutenfri" ved nogen ret, for den viden har vi ikke i
     databasen, og et forkert mærke er farligere end intet
     mærke. Feltet sender spørgsmålet videre til et menneske. */
  test('feltet findes, og linjen under peger på et menneske', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('#bestil-allergi')).toBeVisible();
    const hjaelp = page.locator('#bestil-allergi').locator('xpath=following-sibling::p[1]');
    await expect(hjaelp).toContainText('alvorlig');
    await expect(hjaelp).toContainText('lugen');
  });

  /* ⚠️ FELTET SKAL SES, IKKE FINDES — og en klasse, der ikke slår
     igennem, er ingen regel. Præcis den fejl stod i køkkenets
     ende: klasserne blev sat i JavaScript, og der var ingen CSS
     bag dem, så allergien så ud som "uden remoulade".

     Derfor læses den BEREGNEDE flade her, og ikke klassenavnet.
     Reglen hænger på .felt-allergi i opmærkningen og ikke på
     :has(#bestil-allergi): allergifeltet er ikke stedet, hvor
     udseendet skal afhænge af, hvor gammel gæstens telefon er. */
  test('feltet er markeret — målt på fladen, ikke på klassen', async ({ page }) => {
    await åbnBord(page);
    const m = await page.evaluate(() => {
      const a = document.querySelector('#bestil-allergi').closest('.felt');
      const b = document.querySelector('#bestil-besked-felt').closest('.felt');
      const s = getComputedStyle(a);
      return { allergi: s.backgroundColor, kant: parseFloat(s.borderTopWidth),
        almindelig: getComputedStyle(b).backgroundColor };
    });
    expect(m.allergi, 'allergifeltet ser ud som et almindeligt felt')
      .not.toBe(m.almindelig);
    expect(m.kant, 'allergifeltet har ingen kant').toBeGreaterThan(0);
  });

  /* Ordet ALLERGI: er dét, js/admin/koekken.js kender den på.
     Ændres det ene sted uden det andet, står allergien som en
     almindelig besked på køkkenets skærm — uden en fejl nogen
     steder. */
  test('allergien lander FØRST i beskeden med ordet ALLERGI:', async ({ page }) => {
    await åbnBord(page);
    await synligeVarer(page).first().locator('button', { hasText: '+' }).click();
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '30 20 10 40');
    await page.fill('#bestil-allergi', 'Nødder');
    await page.fill('#bestil-besked-felt', 'Vi sidder ude bagved');
    await page.click('#bestil-send');
    await page.click('#kig-send');
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const d = await gemteData(page);
    const b = d.bestillinger[d.bestillinger.length - 1];
    expect(b.besked.indexOf('ALLERGI: Nødder')).toBe(0);
    expect(b.besked).toContain('Vi sidder ude bagved');
  });

  test('uden en allergi står beskeden, som gæsten skrev den', async ({ page }) => {
    await åbnBord(page);
    await synligeVarer(page).first().locator('button', { hasText: '+' }).click();
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '30 20 10 40');
    await page.fill('#bestil-besked-felt', 'Uden remoulade');
    await page.click('#bestil-send');
    await page.click('#kig-send');
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const d = await gemteData(page);
    const b = d.bestillinger[d.bestillinger.length - 1];
    expect(b.besked).toBe('Uden remoulade');
    expect(b.besked).not.toContain('ALLERGI');
  });
});

test.describe('De to andre sider er URØRTE', () => {

  /* Kortvisningen tændes af data-visning="kort" på formularen og
     intet andet. Sneg den sig ind på forsiden eller bestil/,
     ville de miste foldene — den form, der gør spiis-formen kort
     nok til en telefon. */
  test('bestil/ folder stadig, og har hverken søgefelt eller chips', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: UR, data: menudata() });
    await expect(page.locator('#bestil-stykker .fold-hoved').first()).toBeVisible();
    await expect(page.locator('.kort-soeg')).toHaveCount(0);
    await expect(page.locator('.kort-chips')).toHaveCount(0);
    await expect(page.locator('.kort-gruppe')).toHaveCount(0);
  });

  /* Forsiden tegnes af js/skal/bestil.js i designets egen form —
     den har hverken folde eller kort. Det, der skal holdes fast
     her, er, at bordets tegning ikke siver derover. */
  test('forsiden har hverken søgefelt, chips eller kortafsnit', async ({ page }) => {
    await åbn(page, '/index.html', { ur: UR, data: menudata() });
    await expect(page.locator('.kort-soeg')).toHaveCount(0);
    await expect(page.locator('.kort-chips')).toHaveCount(0);
    await expect(page.locator('.kort-gruppe')).toHaveCount(0);
  });

  /* Allergifeltet er bordets. De to andre steder har gæsten en
     hentetid og en luge at komme op til, og et felt mere i en
     formular, ingen udfylder, er et felt, der skjuler de andre. */
  test('allergifeltet findes kun ved bordet', async ({ page }) => {
    await åbn(page, '/bestil/', { ur: UR, data: menudata() });
    await expect(page.locator('#bestil-allergi')).toHaveCount(0);
  });
});
