/* SEO og virksomhedsoplysninger.

   Den nuværende adresse er ikke indekseret i Google, og der findes
   modstridende oplysninger om forretningen ude på nettet: tre
   udgaver af husnummeret og to telefonnumre. Begge problemer har
   samme løsning – oplysningerne skal stå ÉT sted og være ens
   overalt – og denne fil er det der holder løftet.

   ------------------------------------------------------------
   DET VIGTIGSTE HER ER TESTEN AF JSON-LD
   ------------------------------------------------------------
   JSON-LD er skrevet ind i hver side som statisk markup, så en
   søgemaskine der ikke kører JavaScript også kan læse den. Prisen
   for det er at oplysningerne står to steder: i HTML'en og i
   js/oplysninger.js.

   Uden en test er det kun et spørgsmål om tid før de to skrider fra
   hinanden – og så fortæller vi Google én adresse og gæsten en
   anden. Testen læser js/oplysninger.js som data og sammenholder
   hvert felt.
*/

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');

/* js/oplysninger.js læses som tekst og køres i et lille rum for
   sig. Den sætter window.MOSEDE, så vi giver den et window at
   sætte den på. Alternativet – at gentage tallene i testen – ville
   gøre testen til en tredje kilde til de samme oplysninger. */
function hentOplysninger() {
  const kode = fs.readFileSync(path.join(ROD, 'js', 'oplysninger.js'), 'utf8');
  const rum = { window: {} };
  // eslint-disable-next-line no-new-func
  new Function('window', kode)(rum.window);
  return rum.window.MOSEDE;
}

const SIDER = [
  { sti: '/index.html', url: 'https://gersel1233.github.io/mosedehavnegrill/' },
  { sti: '/menu.html', url: 'https://gersel1233.github.io/mosedehavnegrill/menu.html' },
  { sti: '/bestil/', url: 'https://gersel1233.github.io/mosedehavnegrill/bestil/' },
  {
    sti: '/smoerrebroed-ud-af-huset/',
    url: 'https://gersel1233.github.io/mosedehavnegrill/smoerrebroed-ud-af-huset/',
  },
  {
    sti: '/selskaber/',
    url: 'https://gersel1233.github.io/mosedehavnegrill/selskaber/',
  },
  { sti: '/bord/', url: 'https://gersel1233.github.io/mosedehavnegrill/bord/' },
  {
    sti: '/catering/',
    url: 'https://gersel1233.github.io/mosedehavnegrill/catering/',
  },
  {
    sti: '/baglokale/',
    url: 'https://gersel1233.github.io/mosedehavnegrill/baglokale/',
  },
  {
    sti: '/arrangementer/',
    url: 'https://gersel1233.github.io/mosedehavnegrill/arrangementer/',
  },
  {
    sti: '/nyheder/',
    url: 'https://gersel1233.github.io/mosedehavnegrill/nyheder/',
  },
];

test.describe('JSON-LD passer med js/oplysninger.js', () => {

  // Måles kun én gang: det er den samme statiske markup i begge
  // browserprofiler.
  test.skip(({ isMobile }) => !!isMobile, 'statisk markup måles kun én gang');

  for (const side of SIDER) {
    test(`${side.sti} fortæller Google det samme som siden selv`, async ({ page }) => {
      const m = hentOplysninger();

      await page.goto(side.sti);
      const raa = await page.locator('script[type="application/ld+json"]').first().textContent();

      let ld;
      try {
        ld = JSON.parse(raa);
      } catch (e) {
        throw new Error(`JSON-LD på ${side.sti} er ikke gyldig JSON: ${e.message}`);
      }

      expect(ld['@type'], 'typen skal være Restaurant, ellers får den ikke '
        + 'menu- og åbningstidsfelterne i Google').toBe('Restaurant');
      expect(ld.name).toBe(m.navn);
      expect(ld.telephone).toBe(m.telefon);
      expect(ld.address.streetAddress).toBe(m.adresse.vej);
      expect(ld.address.postalCode).toBe(m.adresse.postnr);
      expect(ld.address.addressLocality).toBe(m.adresse.by);
      expect(ld.address.addressCountry).toBe(m.adresse.land);
      expect(ld.geo.latitude).toBeCloseTo(m.position.lat, 4);
      expect(ld.geo.longitude).toBeCloseTo(m.position.lng, 4);
      expect(ld.priceRange).toBe(m.prisklasse);
      expect(ld.servesCuisine).toEqual(m.koekken);

      /* Billeder og adresser i JSON-LD skal være ABSOLUTTE. Google
         og Facebook henter dem fra deres egne servere og kan ikke
         slå en relativ sti op. */
      expect(ld.url, 'url i JSON-LD skal være absolut').toMatch(/^https:\/\//);
      expect(ld.image, 'image i JSON-LD skal være absolut').toMatch(/^https:\/\//);
      expect(ld.hasMenu).toMatch(/^https:\/\//);
    });
  }
});

test.describe('Hver side kan findes', () => {

  test.skip(({ isMobile }) => !!isMobile, 'statisk markup måles kun én gang');

  for (const side of SIDER) {
    test(`${side.sti} har titel, beskrivelse og canonical`, async ({ page }) => {
      await page.goto(side.sti);

      const titel = await page.title();
      expect(titel.length, 'titlen er tom').toBeGreaterThan(10);
      /* Under cirka 60 tegn. Google klipper længere titler af midt i
         et ord, og så er det sidste – ofte bynavnet – væk. */
      expect(titel.length, `titlen er ${titel.length} tegn og bliver klippet af: ${titel}`)
        .toBeLessThanOrEqual(70);

      const beskrivelse = await page.locator('meta[name="description"]').getAttribute('content');
      expect(beskrivelse, 'beskrivelsen mangler').toBeTruthy();
      expect(beskrivelse.length).toBeGreaterThan(60);
      expect(beskrivelse.length,
        `beskrivelsen er ${beskrivelse.length} tegn og bliver klippet af`).toBeLessThanOrEqual(185);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical, 'canonical mangler – to adresser til samme side '
        + 'deler Googles vurdering i to').toBe(side.url);

      // Delingsbilledet skal være absolut, ellers kan Facebook ikke hente det
      const ogBillede = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(ogBillede).toMatch(/^https:\/\//);
    });
  }

  test('siderne har hver sin titel', async ({ page }) => {
    /* To sider med samme titel konkurrerer med hinanden i Google, og
       den ene bliver valgt bort. */
    const titler = [];
    for (const side of SIDER) {
      await page.goto(side.sti);
      titler.push(await page.title());
    }
    expect(new Set(titler).size, `to sider deler titel: ${titler.join(' | ')}`)
      .toBe(SIDER.length);
  });

  test('kun én h1 pr. side, og den siger hvad siden er', async ({ page }) => {
    for (const side of SIDER) {
      await page.goto(side.sti);
      const h1 = page.locator('h1');
      await expect(h1, `${side.sti} skal have præcis én h1`).toHaveCount(1);
      const tekst = (await h1.textContent()).trim();
      expect(tekst.length, `h1 på ${side.sti} er tom`).toBeGreaterThan(3);
    }
  });
});

test.describe('robots og sitemap', () => {

  test.skip(({ isMobile }) => !!isMobile, 'statiske filer måles kun én gang');

  test('robots.txt holder personalesiden ude og peger på sitemap', async ({ request }) => {
    const svar = await request.get('/robots.txt');
    expect(svar.status()).toBe(200);
    const tekst = await svar.text();

    expect(tekst).toContain('Disallow: /admin.html');
    expect(tekst).toMatch(/Sitemap:\s*https:\/\/.+sitemap\.xml/);
  });

  test('sitemap.xml indeholder alle sider og kun rigtige sider', async ({ request }) => {
    const svar = await request.get('/sitemap.xml');
    expect(svar.status()).toBe(200);
    const xml = await svar.text();

    for (const side of SIDER) {
      expect(xml, `${side.url} mangler i sitemap.xml`).toContain(side.url);
    }

    /* Ankre er dele af en side, ikke sider. Et sitemap fyldt med
       ankre får Google til at behandle det som støj.

       Der måles på <loc>-værdierne og ikke på hele filen: den
       indeholder en kommentar der forklarer netop denne regel, og
       kommentaren nævner "#menu" som eksempel. En test der ikke kan
       tåle sin egen forklaring, er en dårlig test. */
    const adresser = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(adresser.length, 'sitemap.xml har ingen sider').toBe(SIDER.length);
    for (const a of adresser) {
      expect(a, `${a} er et anker, ikke en side`).not.toContain('#');
      expect(a, 'personalesiden skal ikke i sitemap').not.toContain('admin.html');
      expect(a, `${a} skal være en absolut adresse`).toMatch(/^https:\/\//);
    }
  });

  test('personalesiden beder om ikke at blive indekseret', async ({ page }) => {
    await page.goto('/admin.html');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
    expect(robots).toContain('nofollow');
  });
});

test.describe('Oplysninger der mangler ejerens godkendelse', () => {

  test.skip(({ isMobile }) => !!isMobile, 'læser en fil, ikke en side');

  /* Denne test FÆLDER IKKE byggeriet. Den skriver en påmindelse ud,
     så listen ikke bliver glemt mellem to travle uger. Der findes
     modstridende oplysninger om både husnummer og telefonnummer ude
     på nettet, og de skal bekræftes af ejeren før de bliver sendt
     til Google Virksomhedsprofil, Facebook og VisitDenmark. */
  test('påmindelse så længe oplysningerne ikke er bekræftet', async () => {
    const m = hentOplysninger();
    if (!m.godkendt) {
      console.log(
        '\nBEMÆRK: js/oplysninger.js har godkendt: false.\n'
        + `  Adresse: ${m.adresse.vej} (kunden har oplyst 20I; menukortet siger 20)\n`
        + `  Telefon: ${m.telefonPent} (fra forretningens eget menukort)\n`
        + `  Domæne:  ${m.domaene} (GitHub Pages – eget domæne mangler)\n`
        + '  E-mail og sociale profiler står tomme og vises derfor ikke.\n'
        + '  Se listen i README under "Ejeren skal bekræfte".\n'
      );
    }
    // Selve påstanden: felterne findes og er ikke tomme gæt
    expect(m.navn).toBeTruthy();
    expect(m.telefon).toMatch(/^\+45\d{8}$/);
    expect(m.adresse.postnr).toMatch(/^\d{4}$/);
    expect(m.position.lat).toBeGreaterThan(54);
    expect(m.position.lat).toBeLessThan(58);
  });
});
