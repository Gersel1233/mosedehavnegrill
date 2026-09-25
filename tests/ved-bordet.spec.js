/* BESTILLING FRA BORDET — siden bag QR-koden på mærkatet.

   Gæsten sidder ved bord 7 og scanner. Der er fire ting, der kan
   gå galt her, og de er alle fire dyre:

   1) MADEN GÅR TIL DET FORKERTE BORD. Det er hele forskellen på
      den her side og en almindelig bestilling: der er ingen
      hentetid, hvor køkkenet kan opdage en fejl. Bordnummeret ER
      leveringsadressen.

   2) DEN SPØRGER OM EN DAG OG EN TID. Gæsten sidder der nu. En
      dagvælger ville lade hende bestille frokost til på tirsdag
      til bord 7 — et bord, hun ikke har på tirsdag.

   3) DEN TAGER IMOD, NÅR DER ER LUKKET. En bestilling til et
      lukket køkken er et løfte, ingen kan holde, og hun opdager
      det først, når der ikke kommer noget.

   4) DEN SENDER TIL ET BORD, DER IKKE FINDES. Mærkatet kan være
      flyttet, bordet nedlagt. Databasen afviser det
      (supabase/bordkort.sql, prøve 5 og 11), men gæsten skal
      have en vej videre FØR hun trykker send.

   Testene kører i øvetilstand: der er ingen database, og
   bestillingen lander i localStorage. Adgangsreglerne prøves for
   sig i supabase/proev-bordkort.sql — dem kan en browser ikke se.
*/

const { test, expect } = require('@playwright/test');

/* Kontrastregnestykket er WCAG's eget og staar magen til i
   tests/find-foto.spec.js. Det maaler den BEREGNEDE farve mod den
   BEREGNEDE grund — en klasse, der ikke slaar igennem, er ingen
   regel. */
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const kontrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgba = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { rgb: m.slice(0, 3), a: m.length > 3 ? m[3] : 1 }; };
const over = (top, bund) => top.rgb.map((c, i) => c * top.a + bund[i] * (1 - top.a));
const { åbn, grunddata, gemteData } = require('./hjaelp');

const SIDE = '/ved-bordet/';
// Torsdag 6. august 2026 kl. 13.00 dansk tid — midt i åbningstiden.
const UR = '2026-08-06T11:00:00Z';

const BORDE = [
  { id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4, placering: 'ude', aktiv: true, sortering: 10 },
  { id: 2, lokation_id: 'mosede', nummer: 'Terrassen 2', pladser: 6, placering: 'ude', aktiv: true, sortering: 20 },
  { id: 3, lokation_id: 'mosede', nummer: '9', pladser: 2, placering: 'inde', aktiv: false, sortering: 30 },
];

async function åbnBord(page, adresse = '?bord=7', valg = {}) {
  const g = grunddata({ borde: BORDE, ...(valg.data || {}) });
  /* ⚠️ INDSTILLINGER SKAL FLETTES, IKKE OVERSKRIVES. grunddata
     bærer åbningstider, varsel og bestilbare kategorier; sætter en
     prøve bare { emballage_pris: 10 }, forsvinder resten, og siden
     siger "lukket" i stedet for at måle det, prøven handler om. */
  if (valg.data && valg.data.indstillinger) {
    g.indstillinger = Object.assign({}, grunddata().indstillinger,
      valg.data.indstillinger);
  }
  await åbn(page, SIDE + adresse, { ur: valg.ur || UR, data: g });
}

async function vaelg(page, n = 1) {
  const op = page.locator('#bestil-stykker .stk-linje').first().locator('button', { hasText: '+' });
  for (let i = 0; i < n; i++) await op.click();
}

test.describe('Bordet kommer fra listen, ikke fra adressen', () => {

  test('et kendt bord åbner formularen med bordet skrevet på', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('#bord-titel')).toContainText('bord 7');
    await expect(page.locator('#bestil-form')).toBeVisible();
    await expect(page.locator('#bord-vaelg')).toBeHidden();
    expect(await page.locator('#bestil-form').getAttribute('data-bord')).toBe('7');
  });

  /* ?bord=BORD%207 og ?bord=7 må ikke blive til to borde i
     køkkenets liste, når det er ét bord på trædækket. Det er
     RÆKKENS navn, der skrives i formularen — ikke gæstens tekst. */
  test('store bogstaver og mellemrum rammer det samme bord', async ({ page }) => {
    await åbnBord(page, '?bord=%20terrassen%202%20');
    await expect(page.locator('#bestil-form')).toBeVisible();
    expect(await page.locator('#bestil-form').getAttribute('data-bord'))
      .toBe('Terrassen 2');
  });

  test('uden et bord i adressen spørger siden, hvilket bord det er', async ({ page }) => {
    await åbnBord(page, '');
    await expect(page.locator('#bord-vaelg')).toBeVisible();
    await expect(page.locator('#bestil-form')).toBeHidden();
    // De to tændte borde står der, det slukkede gør ikke
    await expect(page.locator('#bord-liste button')).toHaveCount(2);
    await expect(page.locator('#bord-liste')).toContainText('Terrassen 2');
    await expect(page.locator('#bord-liste')).not.toContainText('9');
  });

  test('et ukendt bord siger hvad der er galt, i stedet for at gå i stå', async ({ page }) => {
    await åbnBord(page, '?bord=Parkeringspladsen');
    await expect(page.locator('#bord-vaelg')).toBeVisible();
    await expect(page.locator('#bord-vaelg-note')).toContainText('Parkeringspladsen');
    await expect(page.locator('#bestil-form')).toBeHidden();
  });

  /* Et bord, personalet har slukket i admin, tager ikke imod —
     og skiltet på det ligger der stadig. Siden skal opføre sig
     som databasen (prøve 7 i proev-bordkort.sql), ikke vise en
     formular, der bliver afvist ved afsendelsen. */
  test('et slukket bord opfører sig som et ukendt', async ({ page }) => {
    await åbnBord(page, '?bord=9');
    await expect(page.locator('#bord-vaelg')).toBeVisible();
    await expect(page.locator('#bestil-form')).toBeHidden();
  });

  test('vælger man et bord i listen, står det i adressen bagefter', async ({ page }) => {
    await åbnBord(page, '');
    await page.locator('#bord-liste button', { hasText: 'Terrassen 2' }).click();
    await expect(page.locator('#bestil-form')).toBeVisible();
    expect(page.url()).toContain('bord=Terrassen%202');
  });
});

test.describe('Der er ingen dag og ingen tid at vælge', () => {

  test('dagvælgeren og tidsvælgeren findes ikke på siden', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('#bestil-dag')).toHaveCount(0);
    await expect(page.locator('#bestil-tid')).toHaveCount(0);
  });

  /* To go / spis her er lugens spørgsmål. Ved bordet er svaret
     givet, og et valg med ét svar er ikke et valg. */
  test('der spørges ikke om to-go eller spis her', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('#bestil-hvordan-trin')).toHaveCount(0);
  });
});

test.describe('Bestillingen bærer bordet', () => {

  test('den lander med bord, spis her og dagen i dag', async ({ page }) => {
    await åbnBord(page);
    await vaelg(page, 2);
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304050');
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-kig')).toBeVisible();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const d = await gemteData(page);
    const b = d.bestillinger[0];
    expect(b.bord_nummer).toBe('7');
    expect(b.hvordan).toBe('spis_her');
    expect(b.hent_dato).toBe('2026-08-06');
    // Klokken nu, ikke en valgt tid: 13.00 dansk tid
    expect(b.hent_tid).toBe('13:00');
  });

  test('det sidste kig viser bordet i stedet for en hentetid', async ({ page }) => {
    await åbnBord(page);
    await vaelg(page, 1);
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304051');
    await page.locator('#bestil-send').click();

    const kig = page.locator('#kig-indhold');
    await expect(kig).toContainText('Bord');
    await expect(kig).toContainText('7');
    await expect(kig).not.toContainText('Hentes');
  });

  /* VI RINGER IKKE TIL ET BORD. Gæsten sidder tyve meter fra
     lugen; et opkald til telefonen, der ligger foran hende, er
     ikke en bekræftelse. */
  test('kvitteringen siger at vi kommer med det, ikke at vi ringer', async ({ page }) => {
    await åbnBord(page);
    await vaelg(page, 1);
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304052');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();

    const tak = page.locator('#bestil-tak');
    await expect(tak).toContainText('bord 7');
    await expect(tak).toContainText('kommer med det');
    await expect(tak).not.toContainText('Vi ringer til dig');
  });

  /* "BESTIL NOGET MERE" LÆGGER EN NY ORDRE PÅ DET SAMME BORD.
     Briefens punkt 3. Selskabet ved bord 7 bestiller is efter
     maden, og køkkenet skal kunne se, at det er den samme regning
     — altså det samme bord — men to stykker arbejde: det første
     er måske allerede serveret, når det næste kommer ind. Én ordre,
     der voksede, ville betyde, at køkkenet skulle huske, hvad de
     havde lavet af den. */
  test('bestil noget mere bliver en NY ordre på det samme bord', async ({ page }) => {
    await åbnBord(page);
    await vaelg(page, 1);
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304054');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    await page.locator('#bestil-tak button', { hasText: 'Bestil noget mere' }).click();
    await expect(page.locator('#bestil-form')).toBeVisible();
    // Bordet følger med — formularen er stadig bordets.
    expect(await page.locator('#bestil-form').getAttribute('data-bord')).toBe('7');

    await vaelg(page, 1);
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304054');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const d = await gemteData(page);
    expect(d.bestillinger.length, 'den anden bestilling blev lagt oven i den første')
      .toBe(2);
    expect(d.bestillinger.map((b) => b.bord_nummer)).toEqual(['7', '7']);
    expect(d.bestillinger[0].reference,
      'de to ordrer har samme reference og kan ikke skelnes i køkkenet')
      .not.toBe(d.bestillinger[1].reference);
  });

  /* UDSOLGT VIRKER MED DET SAMME — briefens accepttest 4.
     Personalet sætter fluebenet i admin, og næste gæst, der
     scanner, kan ikke bestille varen. Det er Butik.udvalg, der
     filtrerer, så det gælder alle tre bestillingssider på én
     gang.

     ⚠️ "KAN IKKE BESTILLES" ER IKKE "ER VÆK" (31/8). Prøven
     krævede, at rækken forsvandt helt. Det er det modsatte af
     husets egen regel — "udsolgt vises, ikke skjules" (se
     tests/spiis-laere.spec.js og noten i js/store.js): en vare,
     der forsvinder, ligner en vare, der ikke findes, og så tror
     gæsten, at kortet er blevet mindre.

     Den bestod på et hul i js/bestilling.js, som blev fjernet i
     dag: et gard skjulte den udsolgte, hvis dens læsegruppe ikke
     havde noget bestilbart. Med det gard væk stod tre prøver og
     sagde hver sit om den samme regel.

     Det, accepttesten HANDLER om, er stadig dækket og måles her:
     rækken har ingen plusknap. */
  test('en udsolgt vare kan ikke bestilles fra bordet', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('#bestil-stykker')).toContainText('Flæskestegssandwich');

    await åbnBord(page, '?bord=7', {
      data: {
        menu_varer: grunddata().menu_varer.map((v) =>
          (v.navn === 'Flæskestegssandwich' ? { ...v, udsolgt: true } : v)),
      },
    });
    const linje = page.locator('#bestil-stykker .stk-linje',
      { hasText: 'Flæskestegssandwich' });
    await expect(linje).toHaveCount(1);
    await expect(linje).toHaveClass(/udsolgt/);
    await expect(linje).toContainText('Udsolgt i dag');
    await expect(linje.locator('button'),
      'en udsolgt vare kunne stadig lægges i kurven ved bordet').toHaveCount(0);
  });

  /* Mindsteantallet er smørrebrødets regel — ti stykker, før
     køkkenet går i gang. Den må ikke stå i vejen for én is ved
     bord 7. */
  test('mindsteantallet står ikke i vejen ved bordet', async ({ page }) => {
    await åbnBord(page, '?bord=7', {
      data: { indstillinger: { ...grunddata().indstillinger, bestilling_min_stk: 10 } },
    });
    await vaelg(page, 1);
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304053');
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-kig')).toBeVisible();
  });
});

/* KURVEN ER FÆLLES FOR SIDERNE, og det er med vilje: gæsten skal
   kunne skifte side uden at miste sit valg. Ved bordet er det
   farligt — se noten i js/bestilling.js. */
test.describe('Kurven fra en anden side kører ikke med', () => {

  test('smørrebrød og fyld fra bestil/ ryger ud ved bordet', async ({ page }) => {
    await åbn(page, SIDE + '?bord=7', {
      ur: UR,
      data: grunddata({ borde: BORDE }),
    });
    // Læg en kurv, som den ser ud efter et besøg på bestil/
    await page.evaluate(() => {
      localStorage.setItem('mosede_kurv_v1', JSON.stringify({
        stk: { 'Rejemad': 2, 'Flæskestegssandwich': 1 },
        fyld: ['Leverpostej med baconsvøb'],
        hvordan: 'afhentning',
      }));
    });
    await page.reload();
    await page.waitForSelector('#bestil-stykker .stk-linje');

    /* Flæskestegssandwichen kan sælges ved bordet og bliver
       stående. Rejemad kan ikke — den står ikke i listen, og så
       må den heller ikke tælle med i bjælken eller køre med i
       bestillingen. */
    const kurv = await page.evaluate(
      () => JSON.parse(localStorage.getItem('mosede_kurv_v1')));
    expect(Object.keys(kurv.stk)).toEqual(['Flæskestegssandwich']);
    expect(kurv.fyld).toEqual([]);

    await page.fill('#bestil-navn', 'Sara Holm');
    await page.fill('#bestil-telefon', '20304055');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();

    const d = await gemteData(page);
    const b = d.bestillinger[0];
    expect(b.linjer.map((l) => l.navn), 'noget uden for bordets udvalg kørte med')
      .toEqual(['Flæskestegssandwich']);
    expect(b.fyld).toEqual([]);
  });
});

test.describe('Lukket er lukket', () => {

  test('er der lukket i dag, er der ingen formular', async ({ page }) => {
    await åbnBord(page, '?bord=7', {
      data: {
        aabningstider: Array.from({ length: 7 }, (_, u) => ({
          lokation_id: 'mosede', ugedag: u, lukket: true, aabner: null, lukker: null,
        })),
      },
    });
    await expect(page.locator('#bestil-lukket')).toBeVisible();
    await expect(page.locator('#bestil-form')).toBeHidden();
  });

  test('er der ingen borde oprettet, siges det i stedet for en tom side', async ({ page }) => {
    await åbnBord(page, '?bord=7', { data: { borde: [] } });
    await expect(page.locator('#bestil-lukket')).toContainText('ikke sat op');
    await expect(page.locator('#bestil-form')).toBeHidden();
  });
});

test.describe('Siden er bordets, ikke hjemmesidens', () => {

  /* Står den i Google, kan en, der aldrig har været på havnen,
     bestille til bord 7, mens et rigtigt selskab sidder ved det.
     Værnet i databasen kan kræve, at bordet FINDES — det kan
     ikke se, om nogen sidder ved det. */
  test('den holdes ude af søgemaskinerne', async ({ page }) => {
    await åbnBord(page);
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
  });

  /* Hvert link væk herfra er en vej ud af den bestilling, gæsten
     er i gang med. Det er den samme regel som den flydende pille
     på forsiden: ét sted, én ting man kan gøre. */
  test('der er ingen menu og ingen vej væk fra bordet', async ({ page }) => {
    await åbnBord(page);
    await expect(page.locator('header nav')).toHaveCount(0);
    await expect(page.locator('.tilbage')).toHaveCount(0);
    /* ⚠️ ÉT LINK ER KOMMET TIL, OG DET ER ET LOVKRAV (9/9).
       Persondatapolitikken skal kunne nås, DER hvor gæsten
       skriver noget om sig selv — og det her er den ene side,
       hvor hun skriver en allergi. Reglen bag prøven er urørt:
       intet må tage hende VÆK fra bestillingen. Derfor tælles
       kun links, der åbner i den SAMME fane; jura-linket har
       target="_blank" og lader bestillingen stå.

       Falsifikationen er den anden halvdel: fjernes target,
       falder prøven igen. */
    const væk = await page.locator('a[href]:not([target="_blank"])').count();
    expect(væk, 'der er links væk fra bordets side').toBe(0);
    /* ⚠️ TO JURA-LINKS NU, IKKE ÉT (11/9). Betingelserne står også
       ved send-knappen (tests/jura-ved-send.spec.js), og et fast
       antal ville falde, hver gang oplysningen flyttede. Reglen er
       den samme: HVERT af dem lader bestillingen stå. Vagten på, at
       der overhovedet ER et, bliver — ellers bestod løkken tom. */
    const jura = page.locator('a[href*="persondatapolitik"]');
    expect(await jura.count(), 'persondatapolitikken kan ikke nås').toBeGreaterThan(0);
    for (const a of await jura.all()) await expect(a).toHaveAttribute('target', '_blank');
  });
});

/* ============================================================
   SIDEN VED BORDET SKAL KUNNE OVERSKUES  (31/8)
   ------------------------------------------------------------
   Kundens ord: "hele siden på qr code bestil er rodet og dårlig
   og skal fungere langt bedre, bedre overblik, klarhed over hvad
   man har bestilt."

   Tre ting blev MÅLT, ikke skønnet, ved at åbne siden som en
   gæst der lige har scannet mærkatet på bord 7.
   ============================================================ */
test.describe('Overblikket ved bordet', () => {

  /* ⚠️ MÅLT PÅ EN IPHONE 13: den første vare, gæsten kunne trykke
     på, lå 626 px nede på en skærm på 664 — 94 % af det første
     skærmbillede var overskrifter. Og hun SIDDER ved bordet: hun
     kender stedet, hun skal se mad.

     Roden var ikke listen, men én generisk regel:
     section { padding-block: clamp(56px, 7vw, 104px) } — og
     .kort-gruppe ER et <section>, så hver eneste kategori fik
     56 px foroven og forneden, ingen havde bedt om.

     ⚠️ PRØVEN SAMMENLIGNER TO UAFHÆNGIGE TAL: varens egen top mod
     skærmens højde. Et spørgsmål til .kort-gruppe om dens eget
     padding ville bestå, også hvis heroen voksede og skubbede
     maden ned igen. */
  test('den første vare er på det første skærmbillede', async ({ page }) => {
    test.skip(!test.info().project.use.isMobile, 'det er telefonen, gæsten scanner med');
    await åbnBord(page);

    /* ⚠️ HELE RÆKKEN, IKKE BARE DENS ØVERSTE KANT. Første udgave
       spurgte, om varens TOP lå over skærmens bund — og den
       bestod med fejlen genindført: varen lå 626 px nede på en
       skærm på 664, altså med 38 px synlige og plusknappen under
       folden. En regel, der er sand både før og efter rettelsen,
       måler ingenting.

       Det, gæsten skal kunne, er at TRYKKE: derfor måles plussets
       nederste kant mod skærmens højde. */
    const m = await page.evaluate(() => {
      const sc = document.getElementById('sc') || document.scrollingElement;
      const v = document.querySelector('#bestil-stykker .stk-linje');
      if (!v) return null;
      const plus = [...v.querySelectorAll('.taeller button')].pop();
      const maal = plus || v;
      const r = maal.getBoundingClientRect();
      return { top: Math.round(v.getBoundingClientRect().top + sc.scrollTop),
               plusBund: Math.round(r.bottom + sc.scrollTop),
               skaerm: window.innerHeight };
    });
    expect(m, 'der var ingen vare at måle på').not.toBeNull();
    expect(m.plusBund,
      `den første vares plusknap slutter ${m.plusBund} px nede på en skærm `
      + `på ${m.skaerm} — varen begynder ${m.top} px nede`)
      .toBeLessThanOrEqual(m.skaerm);
  });

  /* ⚠️ KATEGORIEN MÅ IKKE ARVE SIDENS AFSNITS-LUFT. Med ejerens
     21 kategorier er 56 px foroven og forneden over 2.000 px tomt
     sand ned gennem menuen. Målt på den BEREGNEDE stil, ikke på
     klassen — reglen, der gav de 56 px, står slet ikke i
     css/ved-bordet.css. */
  test('kategorierne arver ikke sidens afsnits-luft', async ({ page }) => {
    await åbnBord(page);
    const p = await page.evaluate(() => {
      const g = document.querySelector('.kort-gruppe');
      if (!g) return null;
      const c = getComputedStyle(g);
      return { top: c.paddingTop, bund: c.paddingBottom };
    });
    expect(p, 'der var ingen kategori at måle på').not.toBeNull();
    expect(p.top, `kategorien har ${p.top} luft foroven, den ikke har bedt om`)
      .toBe('0px');
    expect(p.bund).toBe('0px');
  });

  /* ⚠️ KURVEN SKAL SIGE HVAD, IKKE KUN HVOR MANGE. Den sagde
     "2 stykker · 178,-" og intet andet: med 242 varer på kortet og
     fire mennesker om et bord kunne gæsten ikke se, HVAD hun havde
     valgt, uden at rulle hele menuen igennem igen. */
  test('kurven siger hvad der er bestilt — ikke kun hvor mange', async ({ page }) => {
    await åbnBord(page);
    await vaelg(page, 2);

    // Navnet på den vare, der faktisk blev valgt.
    const navn = await page.locator('#bestil-stykker .stk-linje').first()
      .locator('.navn').textContent();

    await page.locator('#kurv-abn').click();
    const liste = page.locator('#kurv-liste');
    await expect(liste).toBeVisible();
    await expect(liste).toContainText(navn.trim());
    await expect(liste.locator('.kurv-linje')).toHaveCount(1);
    // Og linjen bærer sit eget antal, så to gæster kan se hver sin ret.
    await expect(liste.locator('.taeller-tal').first()).toHaveText('2');
  });

  /* Og den kan rettes DÉR. En liste, man kun kan læse, sender
     gæsten tilbage op i menuen for at ændre ét tal. */
  test('antallet kan rettes i kurven, og menuen følger med', async ({ page }) => {
    await åbnBord(page);
    await vaelg(page, 2);
    await page.locator('#kurv-abn').click();

    await page.locator('#kurv-liste .taeller button', { hasText: '−' }).first().click();

    await expect(page.locator('#bestil-sum-tekst')).toContainText('1 stykke');
    // ⚠️ MENUENS EGEN RÆKKE SKAL SIGE DET SAMME. To steder, der
    // tæller hver sit, er præcis det, gæsten ikke kan gennemskue.
    await expect(page.locator('#bestil-stykker .stk-linje').first()
      .locator('.taeller-tal')).toHaveText('1');
  });

  /* ⚠️ OG DE TO KNAPPER MÅ IKKE VÆRE ÉN. Bjælken var selv knappen,
     der førte videre; skulle den også folde kurven ud, ville ét
     tryk gøre to ting — og gæsten, der ville se sin bestilling,
     blev sendt ned i formularen i stedet. */
  test('"Videre" fører videre, og summen åbner kurven', async ({ page }) => {
    await åbnBord(page);
    await vaelg(page, 1);
    await expect(page.locator('#kurv-liste')).toBeHidden();

    await page.locator('#kurv-videre').click();
    await expect(page.locator('#kurv-liste'),
      'Videre foldede kurven ud i stedet for at føre videre').toBeHidden();

    await page.locator('#kurv-abn').click();
    await expect(page.locator('#kurv-liste')).toBeVisible();
  });

  /* ⚠️ PLADSHOLDEREN MÅ IKKE VÆRE KLIPPET AF. Den stod "Søg i
     menuen — burger, softice, fadøl…" og blev målt klippet: gæsten
     så "…softice, fad". Prøven måler TEKSTENS bredde mod feltets
     — ikke antallet af tegn. */
  test('søgefeltets tekst er ikke klippet af', async ({ page }) => {
    test.skip(!test.info().project.use.isMobile, 'den klippes kun på en telefon');
    await åbnBord(page);
    const m = await page.evaluate(() => {
      const s = document.querySelector('.kort-soeg');
      if (!s) return null;
      const c = getComputedStyle(s);
      const m = document.createElement('span');
      m.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:' + c.font;
      m.textContent = s.placeholder;
      document.body.appendChild(m);
      const tekst = m.getBoundingClientRect().width;
      m.remove();
      return { tekst: Math.round(tekst),
               plads: Math.round(s.clientWidth - parseFloat(c.paddingLeft)
                 - parseFloat(c.paddingRight)),
               ord: s.placeholder };
    });
    expect(m, 'der var intet søgefelt').not.toBeNull();
    expect(m.tekst, `"${m.ord}" fylder ${m.tekst} px i et felt på ${m.plads}`)
      .toBeLessThanOrEqual(m.plads);
  });
});

/* ============================================================
   EMBALLAGE — OG HVORFOR DEN ALDRIG GÆLDER VED BORDET  (31/8)
   ------------------------------------------------------------
   Kundens ord: "vi mangler at lave emballagetillæg på
   bestillinger, det er 10 kroner oveni."

   ⚠️ MOTOREN VAR BYGGET, MEN KUN DEN HALVE SIDE BRUGTE DEN.
   js/skal/bestil.js regnede emballagen med; js/bestilling.js —
   som bærer bestil/ OG ved-bordet/ — gjorde det ikke. Det samme
   smørrebrød kostede altså forskelligt alt efter, hvilken side
   gæsten kom ind ad, og ingen af siderne så forkerte ud.

   Og den ene halvdel, der er dyrest at tage fejl af, er den her:
   maden ved bordet bæres ud på en tallerken.
   ============================================================ */
test.describe('Emballage ved bordet', () => {

  /* ⚠️ ET BORD ER SPIS HER, OG DER PAKKES INTET. Et gebyr for
     emballage på et bord er penge for noget, gæsten ikke får —
     og hun opdager det ved lugen, hvor personalet skal forklare
     det. Reglen ligger i R.emballage og gælder derfor begge
     motorer; prøven her holder fast i, at bordet faktisk bruger
     den. */
  test('et bord betaler aldrig emballage', async ({ page }) => {
    await åbnBord(page, '?bord=7', {
      data: { indstillinger: { emballage_pris: 10 } },
    });
    await vaelg(page, 2);

    const sum = page.locator('#bestil-sum-tekst');
    await expect(sum).toContainText('2 stykker');
    await expect(sum, 'bordet blev opkrævet emballage')
      .not.toContainText('emballage');

    // Og den må heller ikke snige sig ind i selve bestillingen.
    await page.locator('#kurv-abn').click();
    await expect(page.locator('#kurv-liste')).not.toContainText('Emballage');
  });
});

/* ============================================================
   LUKKETIDEN SIGER HVORFOR  (31/8)
   ------------------------------------------------------------
   Kundens ord: "når klokken er over lukke, så lad der stå:
   klokken er over 13, vi sælger ikke morgenmad længere."

   MÅLT, ikke læst: bordsiden spurgte slet ikke Butik.udvalg med
   et klokkeslæt, så kategoriPaaTid sprang hele sit tjek over —
   gæsten kunne bestille morgenmad kl. 13.05, selv om ejeren
   havde lukket den 12.30. Reglen fandtes; den blev bare aldrig
   spurgt. Beskeden, han bad om, var kun halvdelen af hullet.
   ============================================================ */
test.describe('Lukketiden siger hvorfor', () => {

  /* Morgenmad 10.00-12.30 oven i grunddataene. Prisen er sat, så
     rækken ikke kan gemme sig i spørg-listen i stedet. */
  function morgenData() {
    const g = grunddata();
    return {
      menu_kategorier: g.menu_kategorier.concat([
        { id: 13, afdeling: 'mad', navn: 'Morgenmad', sortering: 1, aktiv: true },
      ]),
      menu_varer: g.menu_varer.concat([
        {
          id: 40, kategori_id: 13, navn: 'Morgenkomplet', beskrivelse: null,
          pris: 99, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
        },
      ]),
      indstillinger: {
        bestilbare_kategorier: [13],
        kategori_tider: { 13: { fra: '10:00', til: '12:30' } },
      },
    };
  }

  /* UR er kl. 13.00 — en halv time efter morgenmadens lukketid.
     Ved bordet er tiden NU; der er ingen vælger at skjule sig bag. */
  test('morgenmaden kan ikke bestilles kl. 13 — og linjen siger klokken', async ({ page }) => {
    await åbnBord(page, '?bord=7', { data: morgenData() });

    // Resten af kortet står der stadig — det er KUN morgenmaden.
    await expect(page.locator('[data-vare="Flæskestegssandwich"]')).toHaveCount(1);
    await expect(page.locator('[data-vare="Morgenkomplet"]'),
      'morgenmaden kunne stadig bestilles efter lukketid').toHaveCount(0);

    /* Og siden SIGER det, med kundens egne ord — en kategori,
       der bare forsvinder, ligner en fejl på siden. */
    const linje = page.locator('#bestil-lukkede');
    await expect(linje).toBeVisible();
    await expect(linje).toContainText('Morgenmad');
    await expect(linje).toContainText('klokken er over 12.30');
    await expect(linje).toContainText('sælges ikke mere i dag');
  });

  /* Kl. 11.30 — cafeen er åben (grunddata åbner 11.00), og
     morgenmaden er inden for sit tidsrum. Så FINDES linjen, men
     er skjult. ⚠️ toBeHidden() er sandt for et element, der ikke
     findes (husets eget ar fra fyldvælgeren), derfor tælles den
     FØRST. */
  test('inden for tidsrummet står morgenmaden der — uden lukkelinje', async ({ page }) => {
    await åbnBord(page, '?bord=7', {
      data: morgenData(),
      ur: '2026-08-06T09:30:00Z', // kl. 11.30 dansk tid
    });

    await expect(page.locator('[data-vare="Morgenkomplet"]')).toHaveCount(1);
    await expect(page.locator('#bestil-lukkede')).toHaveCount(1);
    await expect(page.locator('#bestil-lukkede')).toBeHidden();
  });
});

/* OVERSKRIFTSSTIGEN VED BORDET.

   ⚠️ Fundet af vaerktoej/tilgaengelighed.js 9/9, ikke ved at læse:
   siden sprang fra h1 til h3. To bokse ligger FØR formularen i
   opmærkningen — bordvælgeren og "her er lukket" — så når en af
   dem er fremme, er dens overskrift den FØRSTE efter sidens h1.
   En skærmlæser, der hopper fra niveau 1 til 3, melder et afsnit,
   der ikke findes, og den, der navigerer på overskrifter, leder
   efter det.

   ⚠️ DET ER VORES SIDE, OG DET AFGØR, AT DEN BLEV RETTET.
   De ti designsiders h1→h3 er 1:1-handoffet fra 23/8 og røres
   ikke (beslutningen står i CLAUDE.md 5/9) — men ved-bordet/
   er husets egen, som admins h2→h4 på Borde var.

   ⚠️ OG PRØVEN LÆSER DE SYNLIGE OVERSKRIFTER I DOM-RÆKKEFØLGE,
   ikke ét element. Et spørgsmål til den ene overskrift om dens
   eget tag ville bestå, også hvis nogen lagde en h4 ind over den
   — det er STIGEN, der er reglen, og den kan kun ses ved at læse
   dem alle. */
test.describe('Overskrifterne springer ikke et niveau', () => {
  async function stigen(page) {
    return page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter((e) => e.offsetParent !== null && e.getClientRects().length)
      .map((e) => ({ n: Number(e.tagName.slice(1)), t: e.textContent.trim().slice(0, 40) })));
  }
  function spring(liste) {
    const d = [];
    for (let i = 1; i < liste.length; i++) {
      if (liste[i].n - liste[i - 1].n > 1) {
        d.push('h' + liste[i - 1].n + ' → h' + liste[i].n + ': "' + liste[i].t + '"');
      }
    }
    return d;
  }

  test('bordvælgeren er et afsnit under sidens h1, ikke to niveauer under', async ({ page }) => {
    await åbnBord(page, '', { data: grunddata({ borde: BORDE }) });
    /* Vagten: uden den kunne prøven bestå på en side, hvor
       vælgeren aldrig kom frem — og så måler den ingenting. */
    await expect(page.locator('#bord-vaelg')).toBeVisible();
    const liste = await stigen(page);
    expect(liste.length, 'ingen synlige overskrifter — så er der ingen stige at måle')
      .toBeGreaterThan(1);
    expect(spring(liste).join(' · ')).toBe('');
  });

  test('og "her er ikke sat op" er det samme niveau', async ({ page }) => {
    await åbnBord(page, '?bord=7', { data: grunddata({ borde: [] }) });
    await expect(page.locator('#bestil-lukket')).toBeVisible();
    const liste = await stigen(page);
    expect(liste.length).toBeGreaterThan(1);
    expect(spring(liste).join(' · ')).toBe('');
  });
});

/* ============================================================
   VALG PÅ EN VARE VED BORDET  (15/9)
   ------------------------------------------------------------
   kurv.stk var nøglet på NAVNET; med valg har hvert valg sin egen
   tæller ("Pitabrød||Tun"). Prøven går hele vejen: rækken, det sidste
   kig og den GEMTE linje — et valg, der kun stod på skærmen, ville
   ikke nå køkkenet. */
test.describe('Valg på en vare ved bordet', () => {
  function medPita() {
    const g = grunddata();
    g.menu_kategorier.push({ id: 30, afdeling: 'mad', navn: 'Retter', sortering: 2, aktiv: true });
    g.menu_varer.push({ id: 300, kategori_id: 30, navn: 'Pitabrød', beskrivelse: null, pris: 65,
      fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
      valg: ['Kebab', 'Kylling', 'Tun'] });
    return { menu_kategorier: g.menu_kategorier, menu_varer: g.menu_varer,
      indstillinger: { bestilbare_kategorier: [1, 6, 9, 30] } };
  }

  test('hvert valg har sin egen tæller, og kiget og køkkenet får valget', async ({ page }) => {
    await åbnBord(page, '?bord=7', { data: medPita() });
    const pita = page.locator('#bestil-stykker .stk-linje[data-vare="Pitabrød"]');
    await expect(pita.locator('.stk-valg-linje')).toHaveCount(3);
    await pita.locator('.stk-valg-linje[data-valg="Tun"] button', { hasText: '+' }).click();

    await page.fill('#bestil-navn', 'Sara Holm');
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-kig')).toContainText('Pitabrød · Tun');
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const l = (await gemteData(page)).bestillinger[0].linjer.find((x) => x.navn === 'Pitabrød');
    expect(l && l.variant, 'køkkenet fik ikke valget på linjen').toBe('Tun');
    expect(l.antal).toBe(1);
  });

  /* ⚠️ TILLÆGGET SKAL OGSÅ VIRKE BAG QR-KODEN  (20/9). Den her fil
     slår prisen op på varens NAVN i fem løkker — et tillæg på valget
     ville tavst falde på gulvet netop her, mens forsiden opkrævede
     det rigtige. Så ville den samme is koste to ting alt efter, om
     gæsten stod ved lugen eller sad ved bordet. Prøven læser den
     gemte linje og summen i kiget, ikke rækken. */
  test('et valg med tillæg koster mere ved bordet også', async ({ page }) => {
    const d = medPita();
    d.menu_varer.find((v) => v.navn === 'Pitabrød').valg =
      ['Kebab', 'Kylling', { navn: 'Tun', tillaeg: 5 }];
    await åbnBord(page, '?bord=7', { data: d });

    const pita = page.locator('#bestil-stykker .stk-linje[data-vare="Pitabrød"]');
    await expect(pita.locator('.stk-valg-linje[data-valg="Tun"] .stk-valg-tillaeg'))
      .toHaveText('+5,-');
    await expect(pita.locator('.stk-valg-linje[data-valg="Kebab"] .stk-valg-tillaeg'))
      .toHaveCount(0);

    await pita.locator('.stk-valg-linje[data-valg="Tun"] button', { hasText: '+' }).click();
    await pita.locator('.stk-valg-linje[data-valg="Kebab"] button', { hasText: '+' }).click();

    await page.fill('#bestil-navn', 'Sara Holm');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();

    const linjer = (await gemteData(page)).bestillinger[0].linjer
      .filter((x) => x.navn === 'Pitabrød');
    /* 65 er varens pris, 70 er den med tunens tillæg — regnet i hånden
       ud fra opsætningen, så prøven ikke måler sig selv. */
    expect(linjer.map((x) => [x.variant, x.pris]).sort(),
      'kassen ved bordet fik ikke tillægget med').toEqual([['Kebab', 65], ['Tun', 70]]);
  });
});

/* ============================================================
   HVOR MANGE SIDDER DER VED BORDET  (20. sep 2026)
   ------------------------------------------------------------
   Mikkels ord: "måske man skal ind i QR-code-tingen angive hvor
   mange siddende man er, så de ved det." Køkkenet skal kunne
   dække op til fire, også når der kun er bestilt mad til to.

   ⚠️ FELTET ER FRIVILLIGT, og modstykket er derfor lige så vigtigt
   som prøven selv: et tomt felt må ALDRIG sende et tal, og det må
   ikke spærre for bestillingen. Huset har haft reglen siden 23/8 —
   en bestilling må ikke møde sten på vejen. */
test.describe('Hvor mange sidder der ved bordet', () => {
  function medRet() {
    const g = grunddata();
    g.menu_kategorier.push({ id: 31, afdeling: 'mad', navn: 'Retter', sortering: 2, aktiv: true });
    g.menu_varer.push({ id: 301, kategori_id: 31, navn: 'Frikadeller', beskrivelse: null,
      pris: 75, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true });
    return { menu_kategorier: g.menu_kategorier, menu_varer: g.menu_varer,
      indstillinger: { bestilbare_kategorier: [1, 6, 9, 31] } };
  }

  async function bestil(page, retter, personer) {
    await åbnBord(page, '?bord=7', { data: medRet() });
    const r = page.locator('#bestil-stykker .stk-linje[data-vare="Frikadeller"]');
    for (let i = 0; i < retter; i++) await r.locator('button', { hasText: '+' }).click();
    await page.fill('#bestil-navn', 'Sara Holm');
    if (personer !== null) await page.fill('#bestil-personer', String(personer));
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();
    return (await gemteData(page)).bestillinger[0];
  }

  test('tallet når hele vejen til den gemte række', async ({ page }) => {
    const b = await bestil(page, 2, 4);
    expect(b.antal_personer, 'køkkenet fik ikke at vide, hvor mange der sidder').toBe(4);
    /* Og retterne er stadig retterne — de to tal må aldrig blandes
       sammen. `antal` er mad, `antal_personer` er mennesker. */
    expect(b.antal, 'antal er antal RETTER, ikke personer').toBe(2);
  });

  test('feltet er frivilligt — tomt spærrer ikke og sender intet tal', async ({ page }) => {
    const b = await bestil(page, 1, null);
    expect(b.antal_personer === undefined || b.antal_personer === null,
      'et tomt felt sendte alligevel et tal').toBe(true);
    expect(b.antal).toBe(1);
  });
});

/* ⚠️ DAGENS RET MÅ IKKE RYGE UD AF KURVEN (16/9). rensKurv læste kun
   den gamle indstilling `dagens_ret`, men retten bor i tabellen
   dagens_retter siden 24/8. En gæst, der havde lagt dagens ret i
   kurven og genindlæste siden (eller låste telefonen), mistede den
   — uden et ord. */
test('dagens ret fra ugeplanen bliver i kurven ved bordet', async ({ page }) => {
  await åbn(page, SIDE + '?bord=7', {
    ur: UR,
    data: grunddata({ borde: BORDE, dagens_retter: [{ id: 1, lokation_id: 'mosede',
      dato: '2026-08-06', navn: 'Stegt flæsk', beskrivelse: null, pris: 95,
      antal_tilbage: null, udsolgt: false, aktiv: true, sortering: 0 }] }),
  });
  await page.evaluate(() => {
    localStorage.setItem('mosede_kurv_v1', JSON.stringify({ stk: { 'Stegt flæsk': 1 }, fyld: [] }));
  });
  await page.reload();
  await page.waitForSelector('#bestil-stykker .stk-linje');
  const kurv = await page.evaluate(() => JSON.parse(localStorage.getItem('mosede_kurv_v1')));
  expect(kurv.stk).toEqual({ 'Stegt flæsk': 1 });
});

/* ============================================================
   ISENS SMAGE VED BORDET  (25/9)
   ------------------------------------------------------------
   Kundens ord: *"når man bestiller en is skal man med kugler
   smage osv kunne gøre det rigtigt og ikke bare bestille 10
   kugler til 1 vaffel."*

   Forsiden fik det først. Huset er fuldt af ar efter en regel,
   der kun kom det ene sted hen — fyldvælgeren 30/8, de 24
   håndmadder 1/9, tillægget på valget 20/9 — og bag QR-koden er
   det netop isen, gæsterne sidder og bestiller. Prøverne går
   hele vejen: rækken, det sidste kig og den GEMTE linje.
   ============================================================ */
/* ============================================================
   BYG DIN IS — VED BORDET  (25. sep 2026)
   ------------------------------------------------------------
   Her stod "Isens smage ved bordet" med tre prøver, der målte
   det GAMLE forløb: en almindelig række med en tæller pr. valg
   og en smagsvælger pr. kugle under den (.is-portion, .is-smag).
   Det forløb findes ikke mere ved bordet — isen har fået sin egen
   blok, og reglerne bor nu i js/isbygger.js.

   Prøverne er ikke slettet uden videre; hver af dem har en
   afløser her, så ingen af reglerne kan falde på gulvet:

     "to vafler bliver TO linjer, hver med sin egen smag"
        → 'to is med hver sin smag bliver to linjer'
     "en is uden valgt smag kan ikke sendes fra bordet"
        → 'knappen spærrer, til smagen er valgt' (byggeren
          spærrer NU ved knappen i stedet for ved Send — gæsten
          rettes dér, hvor hun står)
     "uden ejerens liste spørges der ikke om smag"
        → 'uden ejerens liste spørger trin 3 frit' (reglen er
          VENDT 25/9, med vilje: den gamle udgave lod spørgsmålet
          forsvinde tavst, og det var præcis den fejl, kunden
          meldte. Nu spørges der altid — med en vælger, hvis
          ejeren har en liste, og med et frit felt, hvis ikke.)

   Fiksturet er ejerens rigtige is, og tallene i prøverne kommer
   derfra: 35/45/55 for kuglerne, 37 for softicen, 12 for den
   ekstra kugle, 8 for guffet, +3 for den glutenfri vaffel.
   ============================================================ */
test.describe('Byg din is ved bordet', () => {
  const IS_KAT = 6;                        // grunddata: afdeling is
  const VALG = ['Vaffel', 'Bæger', { navn: 'Glutenfri vaffel', tillaeg: 3 }];

  /* `ekstra` slår de to varer til, som byggerens trin 4 lever af.
     `udsolgt` lægger en udsolgt og en prisløs is i, som byggeren
     IKKE kan tegne — de skal stadig stå på siden. */
  function medIs({ smage = 'Vanilje\nJordbær\nLakrids', ekstra = true,
                   udsolgt = false } = {}) {
    const g = grunddata({ borde: BORDE });
    const b = { beskrivelse: null, fremhaevet: false, udsolgt: false, aktiv: true };
    g.menu_varer.push(
      { id: 9001, kategori_id: IS_KAT, navn: '1 kugle', pris: 35, valg: VALG, sortering: 1, ...b },
      { id: 9002, kategori_id: IS_KAT, navn: '2 kugler', pris: 45, valg: VALG, sortering: 2, ...b },
      { id: 9003, kategori_id: IS_KAT, navn: '3 kugler', pris: 55, valg: VALG, sortering: 3, ...b },
      { id: 9005, kategori_id: IS_KAT, navn: 'Softice, lille', pris: 37, valg: VALG, sortering: 5, ...b });
    if (ekstra) g.menu_varer.push(
      { id: 9006, kategori_id: IS_KAT, navn: 'Ekstra kugle', pris: 12, sortering: 6, ...b },
      { id: 9007, kategori_id: IS_KAT, navn: 'Strøssel, topping eller guf', pris: 8, sortering: 7, ...b });
    if (udsolgt) g.menu_varer.push(
      { id: 9010, kategori_id: IS_KAT, navn: 'Softice, stor', pris: 45, sortering: 8,
        ...b, udsolgt: true },
      { id: 9011, kategori_id: IS_KAT, navn: 'Isdessert efter aftale', pris: null,
        sortering: 9, ...b });
    const ind = { bestilbare_kategorier: [1, IS_KAT, 9] };
    if (smage !== null) ind.is_smage = smage;
    g.indstillinger = Object.assign({}, grunddata().indstillinger, ind);
    return g;
  }

  async function åbnIs(page, valg) {
    await åbn(page, SIDE + '?bord=7', { ur: UR, data: medIs(valg) });
    await page.waitForSelector('.isbyg-blok');
  }

  const trin = (page, nr) => page.locator(`.isbyg-trin[data-trin="${nr}"]`);
  const knap = (page, nr, tekst) =>
    trin(page, nr).locator('.isbyg-knap').filter({ hasText: tekst }).first();

  async function sendFraBordet(page) {
    await page.fill('#bestil-navn', 'Sara Holm');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();
    await expect(page.locator('#bestil-tak')).toBeVisible();
  }

  /* ⚠️ KUNDENS EGEN FEJLMELDING, ORD FOR ORD: *"når jeg bestiller
     1 vaffel med 1 kugle, så kan jeg ikke vælge kuglen."* Bordet
     skal spørge om det samme som lugen — en gæst med en QR-kode
     må ikke møde en ringere isbestilling end en gæst ved lugen. */
  test('1 vaffel med 1 kugle kan vælge sin smag', async ({ page }) => {
    await åbnIs(page);
    await knap(page, 1, 'Vaffel').click();
    await knap(page, 2, '1 kugle').click();

    const vælger = trin(page, 3).locator('select');
    await expect(vælger, 'med én kugle blev der ikke spurgt om smag')
      .toHaveCount(1);
    await vælger.selectOption({ label: 'Jordbær' });
    await page.locator('.isbyg-laeg').click();

    await sendFraBordet(page);
    const l = (await gemteData(page)).bestillinger[0].linjer[0];
    expect(l.navn).toBe('1 kugle');
    expect(l.variant).toBe('Vaffel');
    expect(l.smage, 'smagen nåede ikke ud på bestillingen').toEqual(['Jordbær']);
  });

  /* Afløser "to vafler bliver TO linjer". Nøglen bærer smagene,
     og uden det ville de to lægge sig oven i hinanden som antal 2
     — og køkkenet lave to ens. */
  test('to is med hver sin smag bliver to linjer', async ({ page }) => {
    await åbnIs(page);
    for (const smag of ['Vanilje', 'Lakrids']) {
      await knap(page, 1, 'Vaffel').click();
      await knap(page, 2, '2 kugler').click();
      const vælgere = trin(page, 3).locator('select');
      await expect(vælgere).toHaveCount(2);
      await vælgere.nth(0).selectOption({ label: smag });
      await vælgere.nth(1).selectOption({ label: smag });
      await page.locator('.isbyg-laeg').click();
    }

    /* Kurvens egen liste er gæstens kvittering, FØR hun sender.
       Står de to linjer der uden deres smage, kan hun ikke se
       forskel på dem — og så ligner to linjer en fejl, hun retter
       ved at trykke minus. */
    await page.locator('#kurv-abn').click();
    await expect(page.locator('.kurv-linje').filter({ hasText: 'Vanilje' }))
      .toHaveCount(1);
    await expect(page.locator('.kurv-linje').filter({ hasText: 'Lakrids' }))
      .toHaveCount(1);

    await page.locator('#kurv-videre').click();
    await sendFraBordet(page);
    const linjer = (await gemteData(page)).bestillinger[0].linjer
      .filter((l) => l.navn === '2 kugler');
    expect(linjer.length, 'de to is blev ikke to linjer').toBe(2);
    expect(linjer.map((l) => (l.smage || []).join('+')).sort())
      .toEqual(['Lakrids+Lakrids', 'Vanilje+Vanilje']);
    /* ⚠️ OG PRISEN ER VARENS EGEN, ikke nul. Bordets afsendelse slår
       prisen op på NAVNET, og byggerens nøgle hedder ikke noget,
       der findes ("is||2 kugler||Vaffel||Vanilje"). Tallet 45 kommer
       fra fiksturet — ikke fra noget siden selv har regnet ud. */
    expect(linjer.reduce((a, l) => a + l.pris * l.antal, 0),
      'isen landede uden sin pris').toBe(90);
  });

  /* Prisen skal være den samme hele vejen: byggerens egen sum,
     kurvbjælken og den gemte linje. Det glutenfri tillæg er med,
     fordi det er DÉT tal, der tavst forsvinder, når nogen slår
     prisen op på varen i stedet for på valget. */
  test('tillægget for den glutenfri vaffel følger med hele vejen', async ({ page }) => {
    await åbnIs(page);
    await knap(page, 1, 'Glutenfri vaffel').click();
    await knap(page, 2, '2 kugler').click();
    const vælgere = trin(page, 3).locator('select');
    await vælgere.nth(0).selectOption({ label: 'Vanilje' });
    await vælgere.nth(1).selectOption({ label: 'Vanilje' });
    await knap(page, 4, 'Strøssel').click();

    // 45 + 3 + 8 — alle tre tal står i fiksturet
    await expect(page.locator('.isbyg-sum')).toContainText('56');
    await page.locator('.isbyg-laeg').click();
    await expect(page.locator('#bestil-sum-tekst')).toContainText('56');

    await sendFraBordet(page);
    const linjer = (await gemteData(page)).bestillinger[0].linjer;
    const isen = linjer.filter((l) => l.navn === '2 kugler')[0];
    expect(isen.variant).toBe('Glutenfri vaffel');
    expect(isen.pris, 'tillægget faldt af på vejen').toBe(48);
    expect(linjer.filter((l) => l.navn === 'Strøssel, topping eller guf')[0].pris)
      .toBe(8);
  });

  /* Afløser "en is uden valgt smag kan ikke sendes". Byggeren
     spærrer NU ved sin egen knap — gæsten rettes dér, hvor hun
     står, i stedet for efter at have udfyldt hele formularen. */
  test('knappen spærrer, til smagen er valgt — og siger hvad der mangler', async ({ page }) => {
    await åbnIs(page);
    const læg = page.locator('.isbyg-laeg');
    await expect(læg).toBeDisabled();
    await expect(læg).toContainText('Vælg vaffel eller bæger');

    await knap(page, 1, 'Vaffel').click();
    await expect(læg).toContainText('Vælg hvor mange kugler');
    await knap(page, 2, '2 kugler').click();
    await expect(læg).toContainText('Vælg smag');
    await expect(læg, 'knappen var åben, før smagen var valgt').toBeDisabled();

    const vælgere = trin(page, 3).locator('select');
    await vælgere.nth(0).selectOption({ label: 'Vanilje' });
    await expect(læg, 'én af to kugler var nok').toBeDisabled();
    await vælgere.nth(1).selectOption({ label: 'Lakrids' });
    await expect(læg).toBeEnabled();
    await expect(læg).toContainText('Læg i kurven');
  });

  /* ⚠️ REGLEN ER VENDT MED VILJE (25/9). Før forsvandt spørgsmålet
     tavst, når ejeren ikke havde skrevet sin liste — og MÅLT mod
     produktionen var det præcis dét, der skete: indstillingen
     `is_smage` fandtes slet ikke, så ingen gæst er nogensinde
     blevet spurgt. Det var kundens fejlmelding, og det var en
     designfejl, ikke en brugerfejl. Nu spørges der altid: et frit
     felt, som IKKE er obligatorisk, så en ejer uden liste ikke
     spærrer sin egen isbestilling. */
  test('uden ejerens liste spørger trin 3 frit — og spærrer ikke', async ({ page }) => {
    await åbnIs(page, { smage: null });
    await knap(page, 1, 'Vaffel').click();
    await knap(page, 2, '2 kugler').click();

    await expect(trin(page, 3).locator('select'),
      'der blev vist en tom vælger').toHaveCount(0);
    const felt = trin(page, 3).locator('.isbyg-oenske-felt');
    await expect(felt, 'spørgsmålet forsvandt tavst igen').toHaveCount(1);
    /* Ikke obligatorisk: knappen er åben, FØR der er skrevet noget. */
    await expect(page.locator('.isbyg-laeg')).toBeEnabled();

    await felt.fill('vanilje og lakrids tak');
    await page.locator('.isbyg-laeg').click();
    await sendFraBordet(page);
    expect((await gemteData(page)).bestillinger[0].linjer[0].smage)
      .toEqual(['vanilje og lakrids tak']);
  });

  /* ⚠️ MÅLT 25/9, OG DEN VÆLTEDE HELE SIDEN. Byggeren tager
     is-varerne ud af grupperingen, og rækkebyggeren slog bagefter
     `iGruppe[gruppens navn].boks` op UDEN at spørge, om gruppen
     fandtes. Resultatet var bord 7 med "Vi kan ikke hente kortet
     lige nu" og et helt menukort liggende usynligt bag beskeden —
     nøjagtig den fejl, husets egen kommentar to linjer længere
     oppe advarer mod. Prøven måler det, gæsten SER: at maden står
     der. */
  test('menukortet står der stadig, når isen har sit eget forløb', async ({ page }) => {
    await åbnIs(page);
    await expect(page.locator('.isbyg-blok')).toHaveCount(1);
    await expect(page.locator('#bestil-stykker .stk-linje').first()).toBeVisible();
    await expect(page.locator('#bestil-lukket')).toBeHidden();
    /* Og is-varerne står ikke BEGGE steder. "2 kugler" hører til i
       byggeren nu; en dublet ville give to tællere for den samme is. */
    await expect(page.locator('.stk-linje[data-vare="2 kugler"]')).toHaveCount(0);
  });

  /* ⚠️ BYGGEREN VISER IKKE DET UDSOLGTE OG DET PRISLØSE — den kan
     ikke bestille dem. Tog siden alligevel HELE is-afdelingen ud,
     forsvandt de sporløst, stik imod husets aftale fra 2/9 om, at
     bordet også viser det, der er udsolgt. Målt: begge stod væk. */
  test('en udsolgt is og en is uden pris bliver stående', async ({ page }) => {
    await åbnIs(page, { udsolgt: true });
    await expect(page.locator('.stk-linje[data-vare="Softice, stor"]')).toHaveCount(1);
    await expect(page.locator('.stk-linje[data-vare="Isdessert efter aftale"]'))
      .toHaveCount(1);
    // ... og de er IKKE havnet i byggeren, som ikke kan sælge dem
    await expect(trin(page, 2).locator('.isbyg-knap')
      .filter({ hasText: 'Softice, stor' })).toHaveCount(0);
    await expect(trin(page, 4).locator('.isbyg-knap')
      .filter({ hasText: 'Isdessert' })).toHaveCount(0);
  });

  /* ⚠️ 112 PX TOMT SAND, MAALT 25/9. Blokken er et <section>, og
     arket har en generisk `section { padding-block: clamp(56px,
     7vw, 104px) }`. Blokken blev 744 px hoej, hvor indholdet
     fylder 632. Det er NOEJAGTIG den faelde, .dagens-blok faldt i,
     med kommentaren staaende ved siden af — derfor en proeve her,
     saa den tredje <section>-blok i huset ikke falder i den igen.
     Maalt paa den BEREGNEDE stil: reglen, der giver de 56 px,
     staar slet ikke i den blok, nogen ville laese. */
  test('is-blokken arver ikke sidens afsnits-luft', async ({ page }) => {
    await åbnIs(page);
    const luft = await page.evaluate(() => {
      const c = getComputedStyle(document.querySelector('.isbyg-blok'));
      return { top: c.paddingTop, bund: c.paddingBottom };
    });
    expect(parseFloat(luft.top),
      `blokken har ${luft.top} luft foroven, den ikke har bedt om`)
      .toBeLessThanOrEqual(16);
    expect(parseFloat(luft.bund),
      `blokken har ${luft.bund} luft forneden, den ikke har bedt om`)
      .toBeLessThanOrEqual(16);
  });

  /* ⚠️ HVID PAA HVIDT — MAALT 25/9, OG INGEN ANDEN PROEVE FANGEDE
     DET. Blokkens baggrund blev sat til papir, men farven ikke, og
     saa arvede teksten bordsidens hvide skrift: "Vaffel eller
     bæger?" stod i #fff paa #fff, og gaesten saa fire roede tal og
     ingen spoergsmaal. Alle otte oevrige proever bestod med fejlen
     inde — en klasse, der ikke slaar igennem, er ingen regel, og
     en proeve, der laeser klassen, maaler ingenting.

     Derfor maales den BEREGNEDE farve mod den BEREGNEDE grund, og
     kravet (4,5:1) kommer udefra: det er WCAG's, ikke sidens. */
  test('spørgsmålene kan læses på blokkens egen grund', async ({ page }) => {
    await åbnIs(page);
    const maal = await page.evaluate(() => {
      const blok = document.querySelector('.isbyg-blok');
      /* Grunden er den FOERSTE forfader med en uigennemsigtig
         baggrund — teksten ligger oven paa dét, ikke oven paa en
         klasse, nogen har skrevet. */
      let e = blok, grund = null;
      while (e && !grund) {
        const bg = getComputedStyle(e).backgroundColor;
        const m = bg.match(/[\d.]+/g);
        if (m && (m.length < 4 || Number(m[3]) === 1)) grund = bg;
        e = e.parentElement;
      }
      const ud = { grund };
      ['.isbyg-blok-titel', '.isbyg-titel'].forEach((v) => {
        const n = document.querySelector(v);
        if (n) ud[v] = getComputedStyle(n).color;
      });
      return ud;
    });
    const grund = rgba(maal.grund).rgb;
    ['.isbyg-blok-titel', '.isbyg-titel'].forEach((v) => {
      const k = kontrast(over(rgba(maal[v]), grund), grund);
      expect(k, `${v} har kun ${k.toFixed(2)}:1 mod blokkens grund`)
        .toBeGreaterThanOrEqual(4.5);
    });
  });

  /* Blokken har ingen .stk-linje-rækker, og søgningen og chipsene
     rører kun rækker. Uden en regel for blokken blev byggeren
     stående under ølene, når gæsten filtrerede — og "Vi fandt ikke
     vaffel", mens byggeren stod lige under beskeden. */
  test('is-blokken adlyder chipsene og søgningen', async ({ page }) => {
    await åbnIs(page);
    const blok = page.locator('.isbyg-blok');
    const chip = (t) => page.locator('.kort-chip').filter({ hasText: t }).first();

    await expect(chip('Is & sødt')).toHaveCount(1);
    await chip('Øl').click();
    await expect(blok, 'byggeren blev stående under en anden chip').toBeHidden();
    await chip('Is & sødt').click();
    await expect(blok).toBeVisible();
    await expect(page.locator('#bestil-stykker .stk-linje:visible')).toHaveCount(0);

    await chip('Alt').click();
    await page.locator('.kort-soeg').fill('vaffel');
    await expect(blok, 'søgningen på "vaffel" fandt ikke isen').toBeVisible();
    await expect(page.locator('.kort-intet')).toBeHidden();
  });
});
