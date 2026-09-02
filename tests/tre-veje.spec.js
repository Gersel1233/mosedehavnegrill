/* DE TRE BESTILLINGSVEJE SKAL VISE DET SAMME.

   Kundens ord 1/9, da de sidste menukort kom: *"bestillingen
   online takeaway eller spis her skal passe med det her, og
   QR-kode-bestillingen skal også samme priser, samme menukort
   præcis."*

   Der er tre veje ind i den samme kasse:

     forsiden      index.html          data-udvalg="uden-fyld"
     bestil/       js/bestilling.js    data-udvalg="kun-smoer"
     ved-bordet/   js/bestilling.js    data-udvalg="uden-fyld"

   To af dem deler motor, den tredje er skrevet for sig — og de
   tre siders lister bygges af hver sin funktion. Det er præcis
   dér, to lister over det SAMME sortiment kan skride fra
   hinanden, uden at nogen af siderne ser forkerte ud for sig
   selv. Huset er fuldt af ar efter netop den fejl: fyldvælgeren,
   ingen kunne nå (30/8), de 24 håndmadder, der faldt ud af
   bestil/ (1/9), og varen uden pris, der stod på bestil/ og var
   usynlig på forsiden (31/8).

   ⚠️ PRØVEN LÆSER DOM'EN, IKKE Butik.udvalg. Et opslag i den
   samme funktion tre gange beviser ingenting — det er
   OPTEGNINGEN, der er skrevet tre steder. Derfor åbnes tre
   rigtige sider, folderne åbnes som en finger gør det, og
   navnene og priserne læses af det, gæsten faktisk ser.

   Det, der IKKE er ens, er med vilje og står som prøver for sig:
   bestil/ sælger kun smørrebrødet (kunden bad om en side til
   smørrebrød ud af huset), og isen kan slet ikke bestilles
   nogen steder ("det er altid til rådighed"). */

const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, grunddata, springIntroOver } = require('./hjaelp');

// Fredag 7. august 2026, uret står 11:00Z = 13:00 dansk tid.
const UR = '2026-08-07T11:00:00Z';

/* Et menukort med den samme form som ejerens rigtige: to
   smørrebrødskategorier (hel skive og håndmad), to almindelige,
   og isen — plus en vare uden pris og en udsolgt. */
function menu(ændringer) {
  const d = grunddata();
  d.menu_kategorier = [
    { id: 1, afdeling: 'mad', navn: 'Smørrebrød', sortering: 10, aktiv: true },
    { id: 2, afdeling: 'mad', navn: 'Håndmadder', sortering: 20, aktiv: true },
    { id: 3, afdeling: 'mad', navn: 'Grill fra pladen', sortering: 30, aktiv: true },
    { id: 4, afdeling: 'drikke', navn: 'Øl, vin og bar', sortering: 40, aktiv: true },
    { id: 5, afdeling: 'is', navn: 'Softice og vafler', sortering: 50, aktiv: true },
  ];
  d.menu_varer = [
    v(1, 1, 'Flæskesteg med surt', 55, 1),
    v(2, 1, 'Rejemad med mayo og citron', 85, 2),
    // Uden pris: skal kunne SES alle tre steder, ikke bestilles
    v(3, 1, 'Morgenbrød', null, 3),
    v(4, 2, 'Flæskesteg med surt, håndmad', 27, 101),
    v(5, 3, 'Havnens burger', 95, 1),
    v(6, 3, 'Pølse i brød', 45, 2),
    v(7, 4, 'Fadøl, lille', 35, 1),
    v(8, 5, 'Softice med guf', 40, 1),
  ];
  d.indstillinger.bestilbare_kategorier = [1, 2, 3, 4, 5];
  d.indstillinger.bestilling_varsel_timer = 2;
  d.borde = [{
    id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
    placering: 'ude', aktiv: true, sortering: 10,
  }];
  return Object.assign(d, ændringer || {});
}

function v(id, kategori_id, navn, pris, sortering) {
  return {
    id, kategori_id, navn, pris, sortering,
    beskrivelse: null, fremhaevet: false, udsolgt: false, aktiv: true,
  };
}

/* Prisen som gæsten ser den: "55,-", "35,50,-" eller "??,-".
   Læses som TEKST og ikke som et tal fra dataene — det er
   formateringen, de tre sider hver især skal ramme. */
function pris(tekst) {
  const m = String(tekst || '').match(/(\?\?|\d+(?:,\d+)?),-\s*$/);
  return m ? m[1] : null;
}

// ------------------------------------------------------------
//  De tre lister, læst af skærmen
// ------------------------------------------------------------

/* Forsiden bygger kun de foldede kategoriers rækker, når folden
   er åben — så prøven skal trykke, som en finger gør. */
async function forsiden(page, data) {
  await åbnSkal(page, '/index.html', { ur: UR, data: data || menu() });
  await springIntroOver(page);
  await page.waitForSelector('[data-liste] .item');

  for (let i = 0; i < 30; i++) {
    const lukket = page.locator('[data-liste] [data-kategori] .add')
      .filter({ hasText: '+ tilføj' });
    if (!(await lukket.count())) break;
    await lukket.first().click();
  }

  return page.$$eval('[data-liste] .item[data-vare]', (r) => r.map((e) => ({
    navn: e.getAttribute('data-vare'),
    pris: (e.querySelector('.tag') || {}).textContent || '',
    kanBestilles: !!e.querySelector('.taeller'),
    harTegn: !!e.querySelector('.item-tegn, .item-foto'),
  })));
}

async function stkListe(page, sti, data) {
  await åbn(page, sti, { ur: UR, data: data || menu() });
  await page.waitForSelector('#bestil-stykker .stk-linje');
  return page.$$eval('#bestil-stykker .stk-linje[data-vare]', (r) => r.map((e) => ({
    navn: e.getAttribute('data-vare'),
    pris: (e.querySelector('.stk-pris') || {}).textContent || '',
    kanBestilles: !!e.querySelector('.taeller'),
    harTegn: !!e.querySelector('.stk-tegn, .stk-foto'),
  })));
}

const bestilSiden = (page, data) => stkListe(page, '/bestil/', data);
const bordet = (page, data) => stkListe(page, '/ved-bordet/?bord=7', data);

function navne(liste) { return liste.map((r) => r.navn).sort(); }

function priser(liste) {
  const m = {};
  liste.forEach((r) => { m[r.navn] = pris(r.pris); });
  return m;
}

test.describe('Samme menukort, samme priser — de tre veje', () => {
  test('forsiden og QR-siden ved bordet viser præcis de samme varer', async ({ page }) => {
    const f = await forsiden(page);
    const b = await bordet(page);

    /* Begge kører data-udvalg="uden-fyld" — de sælger hele
       lugens kort. Går de fra hinanden, har den ene side fået en
       regel, den anden ikke fik. */
    expect(navne(b)).toEqual(navne(f));
    expect(f.length).toBeGreaterThan(4);
  });

  test('den samme vare koster det samme alle tre steder', async ({ page }) => {
    const f = priser(await forsiden(page));
    const s = priser(await bestilSiden(page));
    const b = priser(await bordet(page));

    /* Det er DEN her prøve, kunden bad om: "samme priser, samme
       menukort præcis". Sammenligningen går på fælles navne — de
       tre sider sælger ikke det samme UDVALG (bestil/ er kun
       smørrebrødet), men et navn må aldrig bære to priser. */
    const uenige = [];
    [['forsiden', f], ['bestil/', s], ['ved-bordet/', b]].forEach(([navnA, a], i, alle) => {
      alle.slice(i + 1).forEach(([navnB, andet]) => {
        Object.keys(a).forEach((n) => {
          if (andet[n] !== undefined && andet[n] !== a[n]) {
            uenige.push(`${n}: ${navnA} ${a[n]} mod ${navnB} ${andet[n]}`);
          }
        });
      });
    });
    expect(uenige).toEqual([]);

    // Og prisen er ejerens egen, ikke et gæt
    expect(f['Flæskesteg med surt']).toBe('55');
    expect(s['Flæskesteg med surt, håndmad']).toBe('27');
    expect(b['Havnens burger']).toBe('95');
  });

  test('bestil/ er en delmængde af forsiden — ikke en anden liste', async ({ page }) => {
    const f = await forsiden(page);
    const s = await bestilSiden(page);

    /* bestil/ sælger kun smørrebrødet, og det er en aftale med
       kunden. Men hver eneste vare, den viser, skal stå på
       forsiden også: står den kun det ene sted, kan gæsten
       bestille noget, den anden vej ikke kender. */
    const påForsiden = navne(f);
    const kun = navne(s).filter((n) => påForsiden.indexOf(n) === -1);
    expect(kun).toEqual([]);

    // Og det er smørrebrødet, den viser — ikke grillen
    expect(navne(s)).toContain('Flæskesteg med surt, håndmad');
    expect(navne(s)).not.toContain('Havnens burger');
  });

  test('isen kan ikke bestilles nogen af de tre steder', async ({ page }) => {
    /* "Det er altid til rådighed" — isen er en fremvisning, ikke
       en bestilling. Filteret bor i Butik.udvalg, og det skal
       gælde alle tre veje, også når ejeren har sat flueben ved
       kategorien i admin (det HAR prøvens data). */
    expect(navne(await forsiden(page))).not.toContain('Softice med guf');
    expect(navne(await bestilSiden(page))).not.toContain('Softice med guf');
    expect(navne(await bordet(page))).not.toContain('Softice med guf');
  });

  test('en vare uden pris kan ses alle tre steder, men ikke bestilles', async ({ page }) => {
    /* Reglen fra 26/8, og den skal se ens ud de tre steder: en
       vare, der forsvinder, ligner en vare, der ikke findes —
       men en, der kan lægges i kurven uden pris, er en gæst, der
       ikke ved, hvad hun skal betale. */
    for (const hent of [forsiden, bestilSiden, bordet]) {
      const liste = await hent(page);
      const række = liste.filter((r) => r.navn === 'Morgenbrød')[0];
      expect(række, 'Morgenbrød mangler helt').toBeTruthy();
      expect(række.kanBestilles).toBe(false);
    }
  });

  test('hver ret har et ansigt på alle tre veje — også dem uden pris', async ({ page }) => {
    /* Tegnene kom 1/9, og reglen bor ét sted (MosedeEmoji.forVare).
       Men OPTEGNINGEN er skrevet fire steder, og forsidens
       spørg-række fik den aldrig — MÅLT på et skud: "Morgenbrød"
       stod nøgen mellem to naboer med hver sit tegn, som om den
       var noget andet end mad.

       Prøven måler alle rækketyper på alle tre sider: bestilbar,
       uden pris og udsolgt. Et spørgsmål til ÉN rækketype ville
       bestå, også hvis de tre andre manglede. */
    const d = menu();
    d.menu_varer.filter((x) => x.navn === 'Havnens burger')[0].udsolgt = true;

    for (const hent of [forsiden, bestilSiden, bordet]) {
      const uden = (await hent(page, d)).filter((r) => !r.harTegn);
      expect(uden.map((r) => r.navn)).toEqual([]);
    }
  });

  test('en udsolgt vare står de samme steder — og kan ingen steder bestilles', async ({ page }) => {
    /* Personalet melder burgeren udsolgt midt i frokosten. Så
       skal de tre skærme sige det samme: rækken står, streget
       over, uden plusknap. Forsvandt den ét sted og blev stående
       et andet, ville gæsten lede efter en ret, hun lige har set
       på den anden side. */
    const d = menu();
    d.menu_varer.filter((x) => x.navn === 'Havnens burger')[0].udsolgt = true;

    const f = await forsiden(page, d);
    const b = await bordet(page, d);
    expect(navne(b)).toEqual(navne(f));

    const påBordet = b.filter((r) => r.navn === 'Havnens burger')[0];
    expect(påBordet, 'den udsolgte burger mangler helt').toBeTruthy();
    expect(påBordet.kanBestilles).toBe(false);
  });
});
