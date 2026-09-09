/* ============================================================
   LOVGIVNINGEN: PERSONDATA, COOKIES OG CVR  (8/9)

   Kundens ord: *"vi skal sikre os at hjemmesiden overholder
   lovgivningen og cookies, policies, alt det der."*

   ⚠️ SVARET ER MÅLT, IKKE SKREVET EFTER EN SKABELON. Før der
   blev skrevet en linje på `persondatapolitik.html`, blev koden
   gennemsøgt:

     document.cookie          0 steder i hele repoet
     <iframe>                 0 på alle udgivne sider
     analytics / pixel        0 (det ene hit var min egen
                              kommentar fra samme dag)
     fonts.googleapis.com     0 i virksom kode — skrifterne har
                              ligget lokalt siden 5/9

   Derfor er der **ikke** et cookiebanner, og det er ikke en
   forglemmelse: ePrivacy art. 5(3) og cookiebekendtgørelsen
   kræver samtykke til lagring, der IKKE er nødvendig for den
   tjeneste, brugeren selv har bedt om — og en indkøbskurv er
   skolebogseksemplet på nødvendig lagring. Et banner, ingen skal
   have, er to skader: en klikbarriere foran hver eneste gæst, OG
   en påstand om, at vi sporer noget, vi ikke sporer.

   ⚠️ FILEN HER ER MODSTYKKET TIL DEN PÅSTAND. Siden siger
   "vi bruger ingen cookies" — så måler prøven BROWSEREN efter et
   besøg på hver eneste gæsteside. Skulle nogen en dag lægge et
   kort, en pixel eller en Google-skrift ind, bliver sætningen
   forkert i det sekund, og det er den slags, ingen opdager: siden
   ser fuldstændig ens ud.
   ============================================================ */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { åbnSkal, grunddata, lokalTilstand, sætData, sætUr } = require('./hjaelp');

const ROD = path.join(__dirname, '..');
const SIDE = '/persondatapolitik.html';

/* Vejviserne omdirigerer og har ikke deres eget indhold. */
function erOmdirigering(fil) {
  const t = fs.readFileSync(path.join(ROD, fil), 'utf8');
  return t.includes('http-equiv="refresh"') && t.includes('location.replace');
}

/* ⚠️ LISTEN LÆSES AF MAPPEN. Siderne, der SAMLER personoplysninger,
   kendes på deres egne felter — ikke på et navn, jeg har skrevet
   af. En ny formularside kan derfor ikke udgives uden en vej til
   politikken, og det er netop kravet: oplysningerne skal være let
   tilgængelige DÉR, hvor dataene gives. */
function siderDerSamlerData() {
  const ud = [];
  const kig = (fil) => {
    const t = fs.readFileSync(path.join(ROD, fil), 'utf8');
    if (erOmdirigering(fil)) return;
    // Et navnefelt PLUS et nummer- eller mailfelt er en formular,
    // der beder om personoplysninger.
    const harNavn = /id="[^"]*navn"|name="navn"/i.test(t);
    const harKontakt = /inputmode="tel"|type="tel"|type="email"/i.test(t);
    if (harNavn && harKontakt) ud.push(fil);
  };
  fs.readdirSync(ROD).forEach((f) => {
    if (f.endsWith('.html') && f !== 'admin.html') kig(f);
  });
  fs.readdirSync(ROD, { withFileTypes: true }).forEach((d) => {
    if (!d.isDirectory() || d.name.startsWith('.') || d.name === 'node_modules'
      || d.name === 'test-results' || d.name === 'tests-gamle') return;
    const p = path.join(d.name, 'index.html');
    if (fs.existsSync(path.join(ROD, p))) kig(p);
  });
  return ud;
}

test.describe('Persondatapolitikken', () => {

  test('siden findes, og den siger hvem der har ansvaret', async ({ page }) => {
    await åbnSkal(page, SIDE, { data: grunddata() });

    await expect(page.locator('h1')).toContainText('Persondata');
    /* Den dataansvarlige SKAL kunne identificeres (artikel 13):
       navn, adresse og en vej til at kontakte os. */
    const om = page.locator('#jura-om');
    await expect(om).toContainText('Mosede Havnecafe');
    await expect(om).toContainText('Havnevej 20I');

    /* ⚠️ TELEFONEN ER DEN, DER ALTID STÅR — og det er derfor,
       prøven hænger på den. Mailrækken kan forsvinde med vilje:
       er adressen sat til TOM i admin, HAR ejeren nedlagt
       postkassen, og et mailto til en død adresse er en
       blindgyde (reglen fra 28/8). Fiksturet har netop en tom
       adresse, så rækken er væk her — og prøven skal måle det,
       loven kræver: at der ER en vej til den dataansvarlige, ikke
       at der er præcis to. Målt i produktionen 8/9:
       `kontakt_email = kontakt@mosedehavnecafe.dk`, så dér står
       begge. */
    await expect(om.locator('a[href^="tel:"]'),
      'jura-siden har ingen vej til den dataansvarlige').toHaveCount(1);

    /* Klagevejen er en del af oplysningspligten. */
    await expect(page.locator('section.jura')).toContainText('Datatilsynet');
  });

  /* ⚠️ OG NÅR EJEREN HAR EN ADRESSE, SKAL DEN STÅ DÉR.
     Modstykket til prøven ovenfor: uden den ville en side, hvor
     mailrækken ALTID var væk, bestå — og så manglede den ene
     skriftlige vej, e-handelsloven kræver. Tallet kommer udefra:
     ejerens eget felt i admin, og det er den værdi, produktionen
     faktisk har. */
  test('har ejeren en mailadresse, står den på jura-siden', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger,
      { kontakt_email: 'kontakt@mosedehavnecafe.dk' });
    await åbnSkal(page, SIDE, { data: d });

    const post = page.locator('#jura-om a[href^="mailto:"]');
    await expect(post).toHaveCount(1);
    await expect(post).toHaveAttribute('href', /kontakt@mosedehavnecafe\.dk/);
  });

  /* ⚠️ ALLERGIEN HAR SIT EGET AFSNIT, og det er ikke pynt.
     Gæsten skriver den selv i beskedfeltet, og en allergi er en
     HELBREDSOPLYSNING (artikel 9) — den slags må kun behandles på
     et af de snævre grundlag, og her er det gæstens eget valg at
     oplyse den. En politik, der talte om "navn og nummer" og sprang
     den over, ville mangle netop den oplysning, der kræver mest. */
  test('allergien står som det, den er — en helbredsoplysning', async ({ page }) => {
    await åbnSkal(page, SIDE, { data: grunddata() });

    const blok = page.locator('.jura-blok.jura-vigtig');
    await expect(blok, 'allergien har ikke sit eget afsnit').toHaveCount(1);
    await expect(blok).toContainText('helbredsoplysning');
    /* Og siden siger, hvad gæsten skal gøre, hvis det er alvorligt:
       et felt på en hjemmeside er ikke et menneske, der har hørt
       hende. Det er det ærlige svar, ikke det juridiske. */
    await expect(blok).toContainText(/telefonen|lugen/);
  });

  /* ⚠️ LISTEN LÆSES AF MAPPEN — se noten ovenfor. */
  test('hver side, der beder om personoplysninger, har en vej til politikken', () => {
    const sider = siderDerSamlerData();
    expect(sider.length, 'ingen side blev genkendt som en formular — '
      + 'prøven måler ingenting').toBeGreaterThan(4);

    for (const f of sider) {
      const t = fs.readFileSync(path.join(ROD, f), 'utf8');
      expect(t, f + ' beder om personoplysninger uden en vej til politikken')
        .toContain('persondatapolitik.html');
    }
  });

  /* ⚠️ OG DEN SKAL VÆRE DEN RIGTIGE VEJ. En sti, der peger forbi
     filen, er præcis så ubrugelig som ingen sti — og den ser helt
     rigtig ud i opmærkningen. Tallet kommer udefra: DISKEN. */
  test('linket peger på en fil, der findes', () => {
    const sider = siderDerSamlerData();
    for (const f of sider) {
      const t = fs.readFileSync(path.join(ROD, f), 'utf8');
      const m = t.match(/href="([^"]*persondatapolitik\.html)"/);
      expect(m, f + ': linket kan ikke læses').toBeTruthy();
      const maal = path.resolve(path.dirname(path.join(ROD, f)), m[1]);
      expect(fs.existsSync(maal), f + ': ' + m[1] + ' findes ikke').toBe(true);
    }
  });
});

/* ============================================================
   CVR-NUMMERET
   ------------------------------------------------------------
   ⚠️ LOVPLIGTIGT (e-handelsloven § 7: navn, adresse, e-mail OG
   CVR-nummer skal være let tilgængelige) — OG VI HAR DET IKKE.

   Rækken er derfor skjult, til ejeren skriver nummeret i admin.
   Et gættet CVR-nummer er værre end en manglende række: det peger
   på en ANDEN virksomhed, altså en forkert oplysning om, hvem
   gæsten handler med.
   ============================================================ */
test.describe('CVR-nummeret', () => {

  test('uden et nummer er rækken skjult — ikke tom', async ({ page }) => {
    await åbnSkal(page, SIDE, { data: grunddata() });

    const raekke = page.locator('[data-jura-cvr]');
    await expect(raekke, 'CVR-rækken findes ikke i opmærkningen').toHaveCount(1);
    /* ⚠️ MÅLT PÅ SYNLIGHEDEN og ikke på attributten: en klasse med
       `display` slår browserens egen `[hidden]`-regel, og det er
       sket to gange i huset (.music og .lk-tegn). */
    await expect(raekke).toBeHidden();
  });

  /* ⚠️ TALLET KOMMER UDEFRA: ejerens eget felt i admin. */
  test('skriver ejeren nummeret, står det på siden', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, { cvr: '12345678' });
    await åbnSkal(page, SIDE, { data: d });

    const raekke = page.locator('[data-jura-cvr]');
    await expect(raekke).toBeVisible();
    /* Læses højt i grupper af to, som et telefonnummer. */
    await expect(page.locator('[data-cvr]')).toHaveText('12 34 56 78');
  });

  /* ⚠️ OG EN HALV INDTASTNING ER IKKE ET CVR-NUMMER. Syv cifre
     peger på ingen virksomhed; rækken må ikke stå med den. */
  test('et halvt nummer vises ikke', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, { cvr: '1234567' });
    await åbnSkal(page, SIDE, { data: d });
    await expect(page.locator('[data-jura-cvr]')).toBeHidden();
  });

  /* ⚠️ OG DER GÆTTES IKKE I KILDEN — OG FØRSTE UDGAVE AF DEN HER
     PRØVE KUNNE IKKE SE FORSKEL.

     Den krævede "tom ELLER otte cifre", og falsifikationen bestod:
     `cvr: '87654321'` er otte cifre og fuldstændig opdigtet. En
     prøve, der kun måler FORMEN på et tal, kan ikke fange et tal,
     nogen har fundet på — og det er præcis den fejl, hele reglen
     handler om. Det er husets egen lære fra 5/9: en falsifikation,
     der ikke falder, er ikke et bevis på, at koden er rigtig — det
     er et spørgsmål, der skal besvares.

     ⚠️ SVARET ER FILENS EGET FLAG. `godkendt: false` betyder, at
     oplysningerne IKKE er gennemgået med ejeren; så længe det står
     der, er et CVR-nummer i filen et gæt, uanset hvor rigtigt det
     ser ud. Nummeret hører i admin, hvor EJEREN taster det. Den
     dag han bekræfter listen og `godkendt` bliver true, løfter
     reglen sig selv — og så skal formen stadig holde.

     ⚠️ OG FLAGET LÆSES UDEFRA. Prøven kan ikke slå et CVR-nummer
     op (udgangsproxyen spærrer for cvrapi og Virk), så den måler
     det, den KAN vide: at ingen har skrevet et tal ind, som ejeren
     ikke har set. */
  test('oplysningsfilen har ikke fundet på et nummer', () => {
    const s = fs.readFileSync(path.join(ROD, 'js', 'oplysninger.js'), 'utf8');
    const m = s.match(/\n\s*cvr:\s*'([^']*)'/);
    expect(m, 'oplysningsfilen har ikke et cvr-felt').toBeTruthy();
    const v = m[1].replace(/\D/g, '');

    const godkendt = /godkendt:\s*true/.test(s);
    if (!godkendt) {
      expect(v, 'oplysningerne er ikke gennemgået med ejeren (godkendt: false), '
        + 'og så er et CVR-nummer i filen et gæt — det hører i admin').toBe('');
      return;
    }
    /* Er listen gennemgået, må nummeret gerne stå — men det skal
       være et helt nummer. Syv cifre peger på ingen virksomhed. */
    expect(v === '' || v.length === 8,
      'cvr er hverken tomt eller otte cifre: ' + m[1]).toBe(true);
  });
});

/* ============================================================
   INGEN COOKIES — MÅLT PÅ BROWSEREN
   ------------------------------------------------------------
   ⚠️ DET ER MODSTYKKET TIL SIDENS EGEN PÅSTAND. Jura-siden siger
   ordret "vi bruger ingen cookies" og "vi måler ingenting". Bliver
   det forkert en dag — et indlejret kort, en pixel, en
   Google-skrift — er sætningen en løgn, og INTET ville se
   anderledes ud på skærmen.

   ⚠️ OG PRØVEN BLOKERER IKKE TREDJEPARTER, som `åbnSkal` gør.
   Den lader browseren gøre præcis det, den ville gøre hos gæsten,
   og TÆLLER så. En prøve, der først spærrede for Google og
   derefter spurgte, om der blev hentet fra Google, ville måle sin
   egen spærring.
   ============================================================ */
test.describe('Ingen cookies og ingen tredjeparter', () => {

  const SIDER = ['/index.html', '/persondatapolitik.html', '/m-menukort.html',
    '/h-smorrebrod.html', '/bord/', '/bestil/'];

  for (const sti of SIDER) {
    test('browseren sætter ingen cookies på ' + sti, async ({ page, context }) => {
      const fremmede = [];
      page.on('request', (r) => {
        const u = new URL(r.url());
        if (!/^(localhost|127\.0\.0\.1)$/.test(u.hostname)
          && u.protocol !== 'data:' && u.protocol !== 'blob:') fremmede.push(u.host);
      });

      /* Ingen route-blokering her — se noten ovenfor. */
      await lokalTilstand(page);
      await sætUr(page, '2026-08-07T11:00:00Z');
      await sætData(page, grunddata());
      await page.goto(sti, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(900);

      const kager = await context.cookies();
      expect(kager.map((k) => k.name),
        sti + ' satte en cookie — så er sætningen på jura-siden forkert')
        .toEqual([]);

      /* ⚠️ SUPABASE ER IKKE EN TREDJEPART I DEN HER FORSTAND: den
         ER databasen, den står i politikken som databehandler, og
         i øvetilstanden bliver den slet ikke spurgt. Alt andet
         udefra er en måling eller en skrift, vi har sagt vi ikke
         henter. */
      const ikkeVores = [...new Set(fremmede)].filter((h) => !/supabase\.co$/.test(h));
      expect(ikkeVores, sti + ' hentede noget fra en tredjepart').toEqual([]);
    });
  }

  /* ⚠️ OG DER ER INGEN BANNER-ATTRAP. Et cookiebanner, ingen skal
     have, er en klikbarriere foran hver eneste gæst OG en påstand
     om, at vi sporer noget. Prøven fælder både et banner og en
     "accepter"-knap, der kom med en skabelon. */
  test('der er ikke bygget et cookiebanner, ingen skal have', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await expect(page.locator('#cookie-banner, .cookie-banner, [data-cookie-banner]'))
      .toHaveCount(0);
    const tekst = await page.locator('body').innerText();
    expect(tekst, 'forsiden beder om samtykke til noget, vi ikke gør')
      .not.toMatch(/accepter (alle )?cookies/i);
  });

  /* ⚠️ OG INGEN SIDE MÅ INDLEJRE NOGET. Et Google-kort i "Find os"
     ville selv skabe det cookieproblem, banneret skulle løse — det
     er hele grunden til, at ruten er et LINK og ikke et kort. */
  test('ingen udgivet gæsteside indlejrer en tredjepart', () => {
    const sider = fs.readdirSync(ROD).filter((f) => f.endsWith('.html'))
      .filter((f) => f !== 'admin.html');
    expect(sider.length).toBeGreaterThan(8);
    for (const f of sider) {
      const t = fs.readFileSync(path.join(ROD, f), 'utf8')
        .replace(/<!--[\s\S]*?-->/g, '');
      expect(t, f + ' indlejrer noget med <iframe>').not.toMatch(/<iframe/i);
      expect(t, f + ' henter en skrift fra Google').not.toMatch(/fonts\.googleapis\.com/);
    }
  });
});
