/* ============================================================
   DE TO E-MAILADRESSER  (28/8)

   Mikkel oplyste to rigtige adresser: selskab1@ og booking1@.
   De dækker præcis det, systemet IKKE gør — et tilbud på et
   selskab, en ændring i en booking, et spørgsmål der skal
   skrives ned frem for siges i en telefon.

   Det VIGTIGSTE, filen måler, er ikke at de er der. Det er, at
   den OPDIGTEDE adresse er væk: der stod hej@mosedehavnegrill.dk
   i bunden af ni sider — designets pladsholder, på et forkert
   domæne — og en gæst, der skrev til den, nåede ingen.
   ============================================================ */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { åbn, åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const ROD = path.join(__dirname, '..');

/* De ni sider, designet leverede med en footer. Listen læses af
   MAPPEN og ikke skrevet af i hånden: en tiende side med den
   samme footer ville ellers slippe forbi prøven. */
function siderMedFooter() {
  return fs.readdirSync(ROD)
    .filter((f) => f.endsWith('.html') && f !== 'admin.html')
    .filter((f) => fs.readFileSync(path.join(ROD, f), 'utf8').includes('class="fcols"'));
}

/* En VEJVISER, ikke en side: canonical til den nye adresse, en
   refresh for browsere uden JavaScript, og en location.replace,
   så tilbage-knappen ikke sender gæsten frem og tilbage i en
   løkke. Syv gamle adresser blev til vejvisere 30/8, da de to
   udgaver af hjemmesiden blev lagt sammen.

   ⚠️ DE SKAL STADIG HAVE FAVICON — de vises i et brøkdel af et
   sekund, og et blankt ark i fanen er dét, gæsten ser, mens
   browseren flytter sig. Men de har hverken krans, topbjælke
   eller footer, og det er meningen. */
function erOmdirigering(fil) {
  const sti = path.join(ROD, fil);
  if (!fs.existsSync(sti)) return false;
  const t = fs.readFileSync(sti, 'utf8');
  return t.includes('http-equiv="refresh"') && t.includes('location.replace');
}


test.describe('Den opdigtede adresse er væk', () => {

  test('ingen side nævner hej@mosedehavnegrill.dk', () => {
    const sider = siderMedFooter();
    expect(sider.length, 'der er ingen sider med footer at måle på')
      .toBeGreaterThan(5);
    for (const f of sider) {
      const tekst = fs.readFileSync(path.join(ROD, f), 'utf8');
      expect(tekst, f + ' har stadig den opdigtede adresse')
        .not.toContain('hej@mosedehavnegrill.dk');
    }
  });

  /* Og de to rigtige står der i stedet — i HTML'en, ikke kun i
     JavaScript. Står de kun i koden, forsvinder de den dag
     hentningen fejler, og så har siden ingen adresse. */
  test('og begge de rigtige står i hver footer', () => {
    for (const f of siderMedFooter()) {
      const tekst = fs.readFileSync(path.join(ROD, f), 'utf8');
      expect(tekst, f).toContain('selskab1@mosedehavnecafe.dk');
      expect(tekst, f).toContain('booking1@mosedehavnecafe.dk');
    }
  });

  /* ⚠️ ET LINK TIL "#" ER EN BLINDGYDE. Footeren havde
     <a href="#">Facebook</a> og det samme til Instagram på alle
     ni sider — gæsten trykker, siden hopper til toppen, og hun
     tror, det er hende, der gør noget forkert. Reglen står i
     js/oplysninger.js: tomme profiler vises ikke. */
  test('og de døde sociale links er væk', () => {
    for (const f of siderMedFooter()) {
      const tekst = fs.readFileSync(path.join(ROD, f), 'utf8');
      expect(tekst, f + ' har stadig et dødt Facebook-link')
        .not.toContain('<a href="#">Facebook</a>');
      expect(tekst, f).not.toContain('<a href="#">Instagram</a>');
    }
  });

  /* Adressen alene siger ingenting om, hvem der læser den.
     Etiketten er det, der får gæsten til at skrive det rigtige
     sted hen — og de to adresser er delt efter ÆRINDE. */
  test('hvert link siger, hvad adressen er til', async ({ page }) => {
    /* ⚠️ SCOPET TIL FOOTEREN (31/8): find-afsnittet fik sin egen
       kontaktblok, hvor ÆRINDET står som rækkens etiket og
       linket hedder "Skriv til os" — samme oplysning, en anden
       form (den blok har sine egne prøver i skal-forside).
       Footerens links bærer stadig ærindet i selve linkteksten,
       og det er DEM, prøven her vogter. */
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const selskab = page.locator('footer a[data-post="selskab"]');
    const booking = page.locator('footer a[data-post="booking"]');
    await expect(selskab).toContainText('Selskaber');
    /* ⚠️ IKKE "Bordbestilling". Bordene bookes gennem systemet,
       ikke i en indbakke — og en etiket, der lover det modsatte,
       giver bookinger, ingen ser. Se prøven nedenfor. */
    await expect(booking).toContainText('Om din booking');
    await expect(selskab).toHaveAttribute('href', /mailto:selskab1@/);
    await expect(booking).toHaveAttribute('href', /mailto:booking1@/);
  });
});

test.describe('Personalet kan skifte adresserne i admin', () => {

  test('en ny adresse slår den, der står i HTML', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, {
      kontakt_email_selskab: 'fest@eksempel.dk',
    });
    await åbnSkal(page, '/index.html', { data: d });
    /* Begge udgaver af linket — footerens OG find-afsnittets —
       skal have den nye adresse: én kanal, to steder (31/8). */
    for (const a of await page.locator('a[data-post="selskab"]').all()) {
      await expect(a).toHaveAttribute('href', 'mailto:fest@eksempel.dk');
    }
    expect(await page.locator('a[data-post="selskab"]').count()).toBeGreaterThan(1);
    // Den, ingen har rørt, står som den står.
    await expect(page.locator('footer a[data-post="booking"]'))
      .toHaveAttribute('href', /mailto:booking1@/);
  });

  /* ⚠️ TOM ER IKKE DET SAMME SOM ALDRIG SAT. Har forretningen
     nedlagt adressen, skal linket VÆK fra siden — ikke blive
     stående som en blindgyde. */
  test('en tømt adresse tager linket helt af siden', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger,
      { kontakt_email_selskab: '' });
    await åbnSkal(page, '/index.html', { data: d });
    // ALLE udgaver ryger — footerens link og find-afsnittets række.
    await expect(page.locator('a[data-post="selskab"]')).toHaveCount(0);
    await expect(page.locator('footer a[data-post="booking"]')).toHaveCount(1);
  });

  test('felterne gemmes fra Kontakt-fanen', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await visFane(page, 'p-kontakt');
    await page.fill('#post-selskab', 'fest@eksempel.dk');
    await page.fill('#post-booking', 'bord@eksempel.dk');
    await page.locator('#gem-kontakt').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const i = (await gemteData(page)).indstillinger;
    expect(i.kontakt_email_selskab).toBe('fest@eksempel.dk');
    expect(i.kontakt_email_booking).toBe('bord@eksempel.dk');
  });

  /* En adresse med en tastefejl er værre end ingen: gæsten
     skriver, får ingen fejl, og hører aldrig fra nogen. */
  test('en skæv adresse bliver afvist med besked', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await visFane(page, 'p-kontakt');
    await page.fill('#post-booking', 'bord-uden-snabela');
    await page.locator('#gem-kontakt').click();
    await expect(page.locator('#fejl')).toContainText('Bordbestilling');
    expect(((await gemteData(page)).indstillinger || {}).kontakt_email_booking)
      .toBeUndefined();
  });
});

/* ============================================================
   VEJEN TILBAGE, DER IKKE ER ET OPKALD

   Halvdelen af dem, der spørger om et selskab eller booker et
   bord, gør det fra et arbejde, hvor de ikke kan ringe. Indtil nu
   sagde begge kvitteringer kun "ring".
   ============================================================ */
test.describe('Kvitteringerne fortæller, hvor man skriver hen', () => {

  test('forespørgslen peger på selskabsadressen med referencen',
    async ({ page }) => {
      await åbnSkal(page, '/h-selskaber.html', { data: grunddata() });
      await page.fill('#pdato', '2026-09-12');
      await page.fill('#pantal', '20');
      await page.fill('#pnavn', 'Anna Vind');
      await page.fill('#ptlf', '20304050');
      /* ⚠️ MAILEN ER PÅKRÆVET PÅ SELSKABSSIDEN (tilføjet 30/8).
         Kunden bad 29/8 om, at "navn og nummer og mail SKAL være
         essentielt", fordi siden lover svar inden for et døgn, og
         en gæst, der ikke tager telefonen, skal kunne nås på
         skrift. Uden feltet her sender formularen ikke, og prøven
         måler så en kvittering, der aldrig kom. */
      await page.fill('#pmail', 'anna@eksempel.dk');
      await page.locator('#forespoerg button.g.solid.blk').click();

      const panel = page.locator('#forespoerg');
      await expect(panel).toContainText('Vil I hellere skrive?');
      const link = panel.locator('a[href^="mailto:"]');
      await expect(link).toHaveText('selskab1@mosedehavnecafe.dk');
      // Referencen skal med i emnet — ellers ved personalet ikke,
      // hvilken sag mailen hører til.
      await expect(link).toHaveAttribute('href', /subject=Foresp/);
    });

  /* ⚠️ BORDET ER UNDTAGELSEN, OG DET ER MED VILJE (28/8).
     Kundens ord: "bordbestilling skal foregå igennem systemet og
     admin og ikke igennem mail." Kvitteringen på bord/ peger
     derfor på TELEFONEN og ikke på en postkasse — se prøven
     "bordsiden har ingen mailadresse". */
  test('bordkvitteringen peger på telefonen, ikke på en mail',
    async ({ page }) => {
      await åbn(page, '/bord/');
      await page.locator('#bord-antal').fill('4');
      await page.locator('#bord-navn').fill('Anna Vind');
      await page.locator('#bord-telefon').fill('20304050');
      await page.locator('#bord-send').click();

      const tak = page.locator('#bord-tak');
      await expect(tak).toContainText('ring', { ignoreCase: true });
      await expect(tak.locator('a[href^="mailto:"]')).toHaveCount(0);
    });
});

/* ============================================================
   KNAPPEN, DER RAMMER DEN RIGTIGE MAIL MED DET SAMME  (28/8)

   Kundens ord: "sådan knap, også rammer man mailen instantly og
   den korrekte."

   Adressen i bunden af siden virkede, men den er en linje i en
   footer. Den, der står og skal spørge om et selskab, skal have
   en KNAP ved siden af "Ring til os" — og den skal ramme
   selskabsadressen, ikke bookingens.
   ============================================================ */
test.describe('Mail-knappen på siderne', () => {

  const SIDER = [
    ['/h-selskaber.html', 'selskab', 'Selskab'],
    ['/h-baglokale.html', 'selskab', 'Baglokalet'],
    ['/h-catering.html', 'selskab', 'Catering'],
    ['/h-frokost.html', 'selskab', 'Frokostordning'],
  ];

  for (const [sti, slags, emne] of SIDER) {
    test(sti + ' har en mail-knap ved siden af telefonen', async ({ page }) => {
      await åbnSkal(page, sti, { data: grunddata() });
      const raekke = page.locator('.callrow').first();
      await expect(raekke.locator('a[href^="tel:"]')).toHaveCount(1);

      const mail = raekke.locator(`a[data-post="${slags}"]`);
      await expect(mail).toHaveText('Send en mail');
      /* ⚠️ EMNET SKAL MED. Personalet skal kunne se, hvad mailen
         handler om, uden at åbne den — fire sider skriver til den
         SAMME postkasse. */
      await expect(mail).toHaveAttribute('href',
        new RegExp('^mailto:selskab1@mosedehavnecafe\\.dk\\?subject=' + emne));
    });
  }

  /* ⚠️ BORDSIDEN HAR INGEN MAILVEJ, OG DET ER HELE POINTEN.

     Kundens ord (28/8): "bordbestilling skal foregå igennem
     systemet og admin og ikke igennem mail."

     Det er den samme fejl, telefonbookingen på Borde-fanen blev
     bygget for at lukke: en booking, der kommer i en indbakke,
     står ikke i tabellen. Den tæller ikke med i dagens billede,
     den optager ingen pladser, og den findes ikke på skærmen, når
     familien møder op. */
  test('bordsiden har ingen mailadresse — hverken før eller efter',
    async ({ page }) => {
      await åbn(page, '/bord/');
      await expect(page.locator('#bord-form a[href^="mailto:"]')).toHaveCount(0);
      // Telefonen er vejen: dér kan personalet rette det i admin,
      // mens gæsten er i røret.
      await expect(page.locator('#bord-form a[href^="tel:"]')).toHaveCount(1);

      await page.locator('#bord-antal').fill('4');
      await page.locator('#bord-navn').fill('Anna Vind');
      await page.locator('#bord-telefon').fill('20304050');
      await page.locator('#bord-send').click();

      const tak = page.locator('#bord-tak');
      await expect(tak).toContainText('Tak, Anna');
      await expect(tak.locator('a[href^="mailto:"]')).toHaveCount(0);
      await expect(tak).not.toContainText('booking1@');
    });

  /* Og knapperne følger admin som footeren gør — det er den samme
     mekanisme, kun et data-post mere. */
  test('en rettet adresse i admin slår også igennem på knappen',
    async ({ page }) => {
      const d = grunddata();
      d.indstillinger = Object.assign({}, d.indstillinger,
        { kontakt_email_selskab: 'fest@eksempel.dk' });
      await åbnSkal(page, '/h-selskaber.html', { data: d });
      const mail = page.locator('.callrow a[data-post="selskab"]');
      await expect(mail).toHaveAttribute('href', /^mailto:fest@eksempel\.dk/);
      // Og emnet overlever rettelsen.
      await expect(mail).toHaveAttribute('href', /subject=Selskab/);
    });

  /* ⚠️ OG KVITTERINGEN LÆGGER IKKE ET EMNE OVEN I ET ANDET.
     Første udgave læste adressen af knappen — som allerede havde
     et ?subject= — og satte sit eget på: mailto:…?subject=Selskab
     …?subject=Forespørgsel FO…, og mailprogrammet fik den anden
     halvdel af adressen som emne. Prøven fældede det. */
  test('kvitteringens emne står alene', async ({ page }) => {
    await åbnSkal(page, '/h-selskaber.html', { data: grunddata() });
    await page.fill('#pdato', '2026-09-12');
    await page.fill('#pantal', '20');
    await page.fill('#pnavn', 'Anna Vind');
    await page.fill('#ptlf', '20304050');
    // Påkrævet siden 29/8 — se noten i prøven ovenfor.
    await page.fill('#pmail', 'anna@eksempel.dk');
    await page.locator('#forespoerg button.g.solid.blk').click();

    const href = await page.locator('#forespoerg a[href^="mailto:"]')
      .getAttribute('href');
    expect(href.match(/\?subject=/g) || []).toHaveLength(1);
    expect(href).toMatch(/^mailto:selskab1@mosedehavnecafe\.dk\?subject=Foresp/);
  });
});

/* ============================================================
   FEM DØDE LINKS PÅ FORSIDEN  (29/8)

   Facebook, Instagram, Anmeldelser, "Følg os →" og "Læs
   anmeldelserne på Google →" pegede alle på "#". Gæsten trykker,
   siden hopper til toppen, og hun tror, det er hende, der gør
   noget forkert.

   Det er NØJAGTIG den fejl, der blev fjernet i footeren 28/8 —
   den stod bare stadig øverst på forsiden. Reglen har været i
   js/oplysninger.js hele tiden: "tomme felter vises ikke — et
   link til en profil, der ikke findes, er en blindgyde."
   ============================================================ */
test.describe('Ingen døde links på forsiden', () => {

  test('uden adresser står linkene slet ikke der', async ({ page }) => {
    await åbn(page, '/index.html', { data: grunddata() });
    await expect(page.locator('a[data-social]')).toHaveCount(0);
    // Ingen href="#" tilbage på hele siden.
    await expect(page.locator('a[href="#"]')).toHaveCount(0);

    /* ⚠️ MEN STRIBEN BLIVER. "Musik på havnen" er et RIGTIGT link
       til kalendersiden og ikke en profil — den skal ikke rives
       med, fordi Facebook mangler. Striben går kun, når der ikke
       er ét link tilbage i den. */
    await expect(page.locator('.social')).toHaveCount(1);
    await expect(page.locator('.social a')).toHaveCount(1);
    await expect(page.locator('.social a')).toContainText('Musik på havnen');
  });

  /* ⚠️ ET KORT, DER KUN ER EN KNAP, GÅR MED. "Følg os på Facebook"
     er en reklame for en side, vi ikke kan linke til — bliver
     knappen væk og kortet stående, står der en opfordring uden en
     vej. */
  test('og Facebook-kortet går med knappen', async ({ page }) => {
    await åbn(page, '/index.html', { data: grunddata() });
    await expect(page.locator('.promo.fb')).toHaveCount(0);
    await expect(page.locator('#sc')).not.toContainText('Følg os på Facebook');
  });

  /* ⚠️ MEN STJERNELINJEN BLIVER. Den bærer også en sætning, og
     tallet er designets pladsholder, som Mikkel udtrykkeligt har
     sagt bliver stående, til personalet retter det. At tage hele
     linjen ville være at træffe hans beslutning om igen. */
  test('men stjernelinjens tekst bliver stående', async ({ page }) => {
    await åbn(page, '/index.html', { data: grunddata() });
    await expect(page.locator('.stars')).toHaveCount(1);
    await expect(page.locator('.stars')).not.toContainText('Læs anmeldelserne');
    await expect(page.locator('.stars a')).toHaveCount(0);
  });

  test('med en adresse tænder linket af sig selv', async ({ page }) => {
    const d = grunddata();
    d.indstillinger = Object.assign({}, d.indstillinger, {
      social_facebook: 'facebook.com/mosedehavnecafe',
      social_google: 'https://g.page/mosede',
    });
    await åbn(page, '/index.html', { data: d });

    const fb = page.locator('.social a[data-social="facebook"]');
    await expect(fb).toHaveAttribute('href', 'https://facebook.com/mosedehavnecafe');
    await expect(fb).toHaveAttribute('target', '_blank');
    // Kortet kommer også igen.
    await expect(page.locator('.promo.fb')).toHaveCount(1);
    // Google-linket i stjernelinjen med.
    await expect(page.locator('.stars a[data-social="google"]'))
      .toHaveAttribute('href', 'https://g.page/mosede');
    // Instagram er stadig tom og står derfor ikke.
    await expect(page.locator('a[data-social="instagram"]')).toHaveCount(0);
  });

  test('adresserne gemmes fra Kontakt-fanen', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await visFane(page, 'p-kontakt');
    await page.fill('#soc-facebook', 'facebook.com/mosedehavnecafe');
    await page.locator('#gem-kontakt').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const i = (await gemteData(page)).indstillinger;
    expect(i.social_facebook).toBe('facebook.com/mosedehavnecafe');
    expect(i.social_instagram).toBe('');
  });

  /* En tekst uden et punktum i er ikke en hjemmeside — og så ville
     chippen komme tilbage på forsiden og pege ingen steder hen. */
  test('og noget, der ikke er en adresse, bliver ikke gemt', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await visFane(page, 'p-kontakt');
    await page.fill('#soc-instagram', 'find os på instagram');
    await page.locator('#gem-kontakt').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');
    expect((await gemteData(page)).indstillinger.social_instagram).toBe('');
  });
});

/* ------------------------------------------------------------
   ⚠️ FANENS IKON ER LOGOET — OG DET BLEV GLEMT TO GANGE  (29/8)

   Kransen kom på alle sider 29/8, men favicon.svg blev stående
   som det GAMLE mærke: båden i marineblå og den gamle røde. Og
   de ni nye sider havde slet ingen favicon — forsiden viste
   browserens blanke ark, mens de gamle sider viste båden.
   Kundens ord: "hvorfor er logoet ikke opdateret på siden som
   jeg bad dig om 2 gange."

   To målinger, og de fanger hver sin halvdel:
   1) HVER udgivet side peger på favicon.svg
   2) og filen ER kransen — logoets røde, ikke bådens farver
   ------------------------------------------------------------ */
test.describe('Fanens ikon er kransen', () => {

  test('hver side har favicon-linket', () => {
    /* Listen læses af MAPPEN, som siderMedFooter() gør det: en ny
       side uden favicon ville ellers slippe forbi. Admin er med —
       søjlen har ankeret, men fanen i browseren er stadig
       forretningens. */
    const sider = fs.readdirSync(ROD)
      .filter((f) => f.endsWith('.html'))
      .concat(['bestil/index.html', 'bord/index.html', 'selskaber/index.html',
        'nyheder/index.html', 'arrangementer/index.html', 'baglokale/index.html',
        'catering/index.html', 'smoerrebroed-ud-af-huset/index.html',
        'ved-bordet/index.html', 'print/bordkort.html']);

    expect(sider.length).toBeGreaterThan(15);
    for (const f of sider) {
      const tekst = fs.readFileSync(path.join(ROD, f), 'utf8');
      expect(tekst, f + ' har ingen favicon — fanen viser et blankt ark')
        .toMatch(/rel="icon" href="(\.\.\/)?favicon\.svg"/);
    }
  });

  /* ⚠️ DEN HER MÅLER, AT BROWSEREN KAN TEGNE FILEN  (30/8)

     De to prøver omkring den her læste TEKST: at hver side har
     linket, og at filen indeholder logoets røde og ingen af
     bådens farver. Begge bestod — mens fanens ikon var BLANKT på
     hver eneste side i et døgn.

     Grunden: kommentaren øverst i favicon.svg indeholdt
     variabelnavnet for sidens røde, altså to bindestreger, og to
     bindestreger er ULOVLIGE inde i en XML-kommentar. Filen var
     ugyldig SVG, og en ugyldig SVG tegner browseren slet ikke.
     Kunden så det før os — for anden gang med det logo.

     Reglen fra CLAUDE.md, som de to andre prøver ikke fulgte:
     LÆS DET, BROWSEREN GØR, ikke det filen siger om sig selv.
     naturalWidth er nul, hvis billedet ikke kunne afkodes;
     complete er sandt, også når det fejlede. */
  test('browseren kan faktisk tegne ikonet', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    const maal = await page.evaluate(() => new Promise((klar) => {
      const i = new Image();
      i.onload = () => klar({ b: i.naturalWidth, h: i.naturalHeight });
      i.onerror = () => klar({ b: 0, h: 0 });
      i.src = '/favicon.svg';
    }));
    expect(maal.b, 'favicon.svg kunne ikke afkodes — fanen viser et blankt ark')
      .toBeGreaterThan(0);
    expect(maal.h).toBeGreaterThan(0);
  });

  /* Og de andre ikoner, gæsten og personalet ser: PWA-ikonerne
     er dem, der står på telefonens hjemmeskærm, når admin lægges
     som app. En ødelagt fil dér ses først den dag, nogen
     installerer den. */
  for (const fil of ['/ikoner/ikon-192.png', '/ikoner/ikon-512.png']) {
    test(fil + ' kan tegnes', async ({ page }) => {
      await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
      const b = await page.evaluate((src) => new Promise((klar) => {
        const i = new Image();
        i.onload = () => klar(i.naturalWidth);
        i.onerror = () => klar(0);
        i.src = src;
      }), fil);
      expect(b, fil + ' kunne ikke afkodes').toBeGreaterThan(0);
    });
  }

  /* ⚠️ PWA-IKONERNE ER TEGNET UD FRA favicon.svg — og de blev
     glemt, da kransen blev rettet 30/8: fanen fik den rigtige,
     hjemmeskærmen beholdt den forkerte. Det er tredje gang det
     mærke bliver glemt ét sted ("alle steder betyder alle
     flader"), så prøven læser PIXELS og ikke filnavne: er den
     blå inderring der ikke, er ikonet den gamle, helt røde. */
  test('PWA-ikonet bærer også kransens blå ring', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    const harBlaa = await page.evaluate(() => new Promise((klar) => {
      const i = new Image();
      i.onerror = () => klar(null);
      i.onload = () => {
        const c = document.createElement('canvas');
        c.width = i.naturalWidth; c.height = i.naturalHeight;
        c.getContext('2d').drawImage(i, 0, 0);
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let blaa = 0;
        for (let n = 0; n < d.length; n += 4) {
          /* Kransens blå er #2a5f8f: mere blåt end rødt, og ikke
             gråt. Et løst mål med vilje — komprimeringen flytter
             de enkelte pixels et par trin. */
          if (d[n + 2] > d[n] + 40 && d[n + 2] > 90 && d[n + 3] > 200) blaa++;
        }
        klar(blaa);
      };
      i.src = '/ikoner/ikon-192.png';
    }));
    expect(harBlaa, 'ikonet kunne ikke afkodes').not.toBeNull();
    expect(harBlaa, 'PWA-ikonet er den gamle, helt røde krans')
      .toBeGreaterThan(200);
  });

  test('og ikonet er kransen, ikke den gamle båd', () => {
    const svg = fs.readFileSync(path.join(ROD, 'favicon.svg'), 'utf8');
    /* Logoets røde — og den er LOGOETS, ikke sidens: #d62a3a står
       fast, uanset hvad temafarven hedder. */
    expect(svg).toContain('#d62a3a');

    /* ⚠️ OG DEN BLÅ INDERRING OG BØLGEN ER LOGOET (30/8).

       Her lå en forenklet, HELT RØD udgave uden dem. Kunden sagde
       det ligeud: "det er det forkerte logo". Et mærke er ikke
       det samme mærke, fordi formen ligner — den blå ring og
       bølgen er dét, der gør kransen til kransen. Den blå er
       LOGOETS egen (#2a5f8f, den samme som i intro-animationen),
       ikke sidens tema: hele den marineblå familie er forbudt i
       stilarkene, men her hører den til. */
    expect(svg, 'kransens blå inderring mangler — det er ikke logoet')
      .toContain('#2a5f8f');
    expect(svg, 'bølgen under isen mangler')
      .toMatch(/M122 228q9\.5-7 19 0t19 0/);
    /* Bådens to farver må aldrig komme igen. #0f2c44 var
       marineblå fra den GAMLE forside, #d1462f den gamle røde. */
    expect(svg, 'den gamle båds marineblå er tilbage i ikonet')
      .not.toContain('#0f2c44');
    expect(svg).not.toContain('#d1462f');
  });
});

/* ------------------------------------------------------------
   MÆRKET ER DEN RUNDE KRANS FRA INTROEN — PÅ HVER SIDE  (29/8)

   Kundens ord: logoet "skal skiftes til dette som afspiles i
   before landing animations videoen". Ovalen med undertitlen
   "OG ISHUS · MOSEDE HAVN" blev skiftet til den runde krans
   (300-net, blå inderring og bølge) alle 19 steder. To mærker
   på det samme hus er præcis den fejl, kunden selv fangede
   tidligere samme dag — så listen læses af MAPPEN, og både en
   side, der får ovalen tilbage, og en NY side, der bygges med
   den, falder her.
   ------------------------------------------------------------ */
/* ============================================================
   DE TO UDGAVER AF HJEMMESIDEN ER LAGT SAMMEN  (30/8)
   ------------------------------------------------------------
   MÅLT: der stod NITTEN gæstesider i luften — ti på designet fra
   23/8 og ni på det gamle stilark. Af de ni kunne kun bord/ nås
   fra den nye side. De otte andre var forældreløse, havde ingen
   noindex og pegede canonical på sig selv.

   Det betød, at en gæst, der googlede "smørrebrød Mosede Havn",
   kunne lande i den GAMLE verden — hvor hvert link førte dybere
   ind i den, og hvor hun aldrig så den nye side. To udgaver af
   den samme forretning, begge i luften.

   ⚠️ SIDERNE ER IKKE SLETTET. Adressen står i Googles resultater
   og i folks bogmærker; en 404 er et blindt spor. De omdirigerer.
   ============================================================ */
test.describe('De gamle adresser sender gæsten videre', () => {

  const OMDIR = {
    'menu.html': 'm-menukort.html',
    'selskaber/index.html': '../h-selskaber.html',
    'catering/index.html': '../h-catering.html',
    'baglokale/index.html': '../h-baglokale.html',
    'arrangementer/index.html': '../h-kalender.html',
    'nyheder/index.html': '../index.html#nyheder',
    'smoerrebroed-ud-af-huset/index.html': '../h-smorrebrod.html',
  };

  for (const [gammel, ny] of Object.entries(OMDIR)) {
    test(gammel + ' peger på ' + ny, () => {
      const t = fs.readFileSync(path.join(ROD, gammel), 'utf8');

      /* Tre lag, fordi GitHub Pages ikke har en server:
         canonical til Google, refresh til browsere uden
         JavaScript, og replace så tilbage-knappen ikke laver en
         løkke mellem den gamle og den nye adresse. */
      expect(t, gammel + ' mangler canonical — Google bliver ved med '
        + 'at vise den gamle side').toMatch(/rel="canonical"/);
      expect(t, gammel + ' omdirigerer ikke uden JavaScript')
        .toContain('http-equiv="refresh"');
      expect(t, gammel + ' lægger sig i historikken og laver en løkke '
        + 'med tilbage-knappen').toContain('location.replace');

      expect(t, gammel + ' peger et andet sted hen end forventet').toContain(ny);
      /* ⚠️ OG DEN MÅ IKKE PEGE PÅ SIG SELV. En omdirigering til
         sin egen adresse er en uendelig løkke, og browseren
         viser en tom side. */
      expect(t.includes("location.replace('" + gammel + "')"), gammel
        + ' omdirigerer til sig selv').toBe(false);
    });
  }

  /* ⚠️ OG DE TO, DER BLIVER, SKAL BLIVE. bestil/ har fyldvælgeren
     (model A, 29 slags fyld), og bord/ er den eneste vej til en
     bordbooking. Bliver en af dem lavet om til en vejviser, er
     der en funktion mindre på siden — og det ville ingen opdage,
     før en gæst prøvede. */
  for (const bliver of ['bestil/index.html', 'bord/index.html']) {
    test(bliver + ' er stadig en rigtig side', () => {
      const t = fs.readFileSync(path.join(ROD, bliver), 'utf8');
      expect(t).not.toContain('http-equiv="refresh"');
      expect(t.length).toBeGreaterThan(8000);
    });
  }
});

test.describe('Mærket er den runde krans', () => {

  test('hver krans er den runde — ovalen findes ikke længere', () => {
    const sider = fs.readdirSync(ROD)
      .filter((f) => f.endsWith('.html'))
      .concat(['bestil/index.html', 'bord/index.html', 'selskaber/index.html',
        'nyheder/index.html', 'arrangementer/index.html', 'baglokale/index.html',
        'catering/index.html', 'smoerrebroed-ud-af-huset/index.html',
        'ved-bordet/index.html', 'print/bordkort.html'])
      /* ⚠️ EN OMDIRIGERING ER IKKE EN SIDE. Se erOmdirigering()
         ovenfor: vejviserne har med vilje hverken krans eller
         footer. At de FAKTISK omdirigerer — og ikke bare er
         blevet tomme — måles af "de gamle adresser sender gæsten
         videre" nedenfor. */
      .filter((f) => !erOmdirigering(f));

    let kranse = 0;
    for (const f of sider) {
      const tekst = fs.readFileSync(path.join(ROD, f), 'utf8');
      if (!tekst.includes('class="crest"')) continue;
      kranse++;
      expect(tekst, f + ' har den gamle ovale krans (200x140)')
        .not.toContain('viewBox="0 0 200 140"');
      expect(tekst, f + ' har ovalens undertitel')
        .not.toContain('OG ISHUS');
      expect(tekst, f + ' har en krans, der ikke er den runde (300-net)')
        .toContain('viewBox="0 0 300 300"');
    }
    /* Tallet faldt fra 19 til 12 den 30/8, da syv gamle adresser
       blev til vejvisere — ikke fordi mærket forsvandt fra en
       side, men fordi der er syv færre sider. Tælles der FÆRRE
       end det her, er mærket røget helt af en side, og det er den
       anden halvdel af fejlen fra 29/8 (ni sider uden favicon). */
    expect(kranse).toBeGreaterThanOrEqual(12);
  });

  /* ÉN RØD — OG INGEN MARINEBLÅ — PÅ HELE HUSET (29/8).
     style.css' --red var #d1462f, den gamle orange-røde, og hele
     den mørke side af paletten var marineblå (#0f2c44-familien),
     mens designsiderne står i logoets #d62a3a og varm blæk.
     Kundens ord om det blå: "ved ikke lige hvor du har de blå
     ting fra — hele hjemmesiden har det ternede og rød/hvide
     tema." Gæsten går mellem siderne i ét klik, og to paletter
     på det samme hus læses som to huse. Ingen af familierne må
     komme tilbage i stilarkene. Kransens egen blå (#2a5f8f) bor
     i SVG'en i HTML — et logo skifter ikke farve med et tema. */
  test('den gamle orange-røde og marineblå familie er ude af stilarkene', () => {
    for (const f of ['css/style.css', 'havnegrillen.css', 'menukort.css']) {
      /* Kommentarerne klippes af FØR målingen: advarslen i
         style.css nævner selv #d1462f som det forbudte, og
         favicon-prøven har allerede én gang fældet sin egen
         dokumentation. Det er den VIRKSOMME CSS, der ikke må
         bære farven. */
      const css = fs.readFileSync(path.join(ROD, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .toLowerCase();
      for (const gammel of ['#d1462f', '#bb3a25', '#a8321f', 'rgba(209, 70, 47', 'rgba(209,70,47',
        '#0f2c44', '#1a4763', '#2c6180', '#4e6985', '#526e8b', 'rgba(15, 44, 68', 'rgba(15,44,68']) {
        expect(css, f + ' har den gamle farve ' + gammel + ' tilbage')
          .not.toContain(gammel);
      }
    }
  });
});

/* ------------------------------------------------------------
   ⚠️ BORDBOOKING KUNNE IKKE FINDES  (29/8)

   Kundens spørgsmål: "hvorhenne booker jeg bord?" — og han havde
   ret i at spørge. MÅLT: bord/ havde ikke ét eneste link fra de
   ni designsider. Siden har været i luften siden fase 4, men
   menukortsidens "Book spisning"-knap forsvandt, da siden blev
   skrevet om 24/8, og CLAUDE.md stod og lovede den i fem dage.
   En side, ingen kan finde, findes ikke.

   Listen læses af MAPPEN — en NY side uden en vej til
   bordbooking skal også falde her, ikke kun de ni, vi kender.
   ------------------------------------------------------------ */
test.describe('Vejen til bordbooking', () => {

  test('hver gæsteside har et link til bord/', () => {
    const sider = siderMedFooter();
    expect(sider.length, 'der er ingen sider at måle på').toBeGreaterThan(5);

    for (const f of sider) {
      const tekst = fs.readFileSync(path.join(ROD, f), 'utf8');
      /* Undersiderne ligger i roden og linker "bord/"; de gamle
         sider i undermapper linker "../bord/". Begge tæller. */
      expect(tekst, f + ' har ingen vej til bordbooking — gæsten kan ikke booke et bord')
        .toMatch(/href="(\.\.\/)?bord\/"/);
    }
  });

  test('og forsiden har den som en egen række i hjælpelisten', () => {
    const tekst = fs.readFileSync(path.join(ROD, 'index.html'), 'utf8');
    /* Rækken står ØVERST: at sikre sig en plads er det mest
       hverdagsagtige ærinde. Falder den ned i bunden af listen,
       er det en beslutning, nogen skal tage bevidst. */
    const rows = tekst.slice(tekst.indexOf('<div class="rows">'));
    const foerste = rows.indexOf('href="bord/"');
    const smoer = rows.indexOf('href="h-smorrebrod.html"');
    expect(foerste, 'forsiden har ingen bord-række i hjælpelisten').toBeGreaterThan(-1);
    expect(foerste, 'bord-rækken står ikke øverst').toBeLessThan(smoer);
  });
});

/* ============================================================
   HVER UDGIVET SIDE PEGER PÅ FORRETNINGENS EGET DOMÆNE  (30/8)
   ------------------------------------------------------------
   ⚠️ STATUSTABELLEN I README SAGDE "SEO-fundament ✅ titler,
   canonical, JSON-LD, robots, sitemap" — og MÅLT samme dag havde
   de NI nye designsider hverken canonical eller og:-felter. Nul
   af hver. Det var de GAMLE sider, der havde dem, og de pegede
   på github.io-adressen.

   To ting gik galt af det, og begge er usynlige på skærmen:
   Google blev ved med at kalde den gamle adresse den rigtige, og
   et link delt i en sms eller på Facebook kom uden både titel og
   billede — altså den grå kasse, ingen trykker på.

   Prøven læser MAPPEN, som favicon- og footer-prøverne gør det:
   en ny side kan ikke slippe forbi ved at blive glemt i en liste.
   ============================================================ */
test.describe('Canonical og delelinks', () => {

  const DOM = 'https://mosedehavnecafe.dk/';

  /* De udgivne gæstesider. Vejviserne er MED — deres canonical er
     hele deres eksistensberettigelse: den fortæller Google, hvad
     der trådte i stedet for dem. */
  function udgivneSider() {
    return fs.readdirSync(ROD)
      .filter((f) => f.endsWith('.html') && f !== 'admin.html')
      .concat(['bestil/index.html', 'bord/index.html', 'selskaber/index.html',
        'nyheder/index.html', 'arrangementer/index.html', 'baglokale/index.html',
        'catering/index.html', 'smoerrebroed-ud-af-huset/index.html']);
  }

  test('hver udgivet side har en canonical på det rigtige domæne', () => {
    const sider = udgivneSider();
    expect(sider.length).toBeGreaterThan(15);

    for (const f of sider) {
      const t = fs.readFileSync(path.join(ROD, f), 'utf8');
      const m = t.match(/rel="canonical" href="([^"]+)"/);
      expect(m, f + ' har ingen canonical — Google gætter selv, '
        + 'hvad der er den rigtige adresse').not.toBeNull();
      expect(m[1], f + ' peger canonical et andet sted hen end domænet')
        .toContain(DOM);
      /* ⚠️ OG ALDRIG PÅ github.io. En canonical, der peger på den
         gamle vært, fortæller Google, at DEN er den rigtige — og
         så bliver det gamle domæne ved med at stå i resultaterne,
         uanset hvad der ellers er sat op. */
      expect(m[1], f + ' peger stadig på github.io')
        .not.toContain('github.io');
    }
  });

  /* ⚠️ og:url SKAL VÆRE DEN SAMME SOM canonical. Siger de to hver
     sit, deler Facebook den ene adresse, mens Google indekserer
     den anden — og så tæller siden som to sider, der konkurrerer
     med hinanden. */
  test('delelinket og canonical siger det samme', () => {
    for (const f of udgivneSider()) {
      const t = fs.readFileSync(path.join(ROD, f), 'utf8');
      const og = t.match(/property="og:url" content="([^"]+)"/);
      if (!og) continue;                       // vejviserne har ingen
      const kan = t.match(/rel="canonical" href="([^"]+)"/);
      expect(og[1], f + ': og:url og canonical peger hvert sit sted')
        .toBe(kan[1]);
    }
  });

  /* Et delt link uden titel og billede er en grå kasse. De ni nye
     sider bærer hele hjemmesiden nu, så det er DEM, folk sender
     videre. */
  test('de nye sider har titel, beskrivelse og billede at dele med', () => {
    const nye = ['index.html', 'h-smorrebrod.html', 'h-selskaber.html',
      'h-catering.html', 'h-frokost.html', 'h-baglokale.html',
      'h-kalender.html', 'm-menukort.html', 'm-tapas.html'];
    for (const f of nye) {
      const t = fs.readFileSync(path.join(ROD, f), 'utf8');
      for (const felt of ['og:title', 'og:description', 'og:image', 'og:site_name']) {
        expect(t, f + ' mangler ' + felt).toContain('property="' + felt + '"');
      }
      expect(t, f + ' har ingen beskrivelse til søgeresultatet')
        .toMatch(/<meta name="description" content="[^"]{40,}"/);
    }
  });

  /* ⚠️ OG BILLEDET SKAL FINDES. En og:image, der peger på en fil,
     der ikke er der, giver den samme grå kasse som slet ingen —
     og det ses ingen steder på siden selv. */
  test('delebilledet ligger der faktisk', () => {
    const t = fs.readFileSync(path.join(ROD, 'index.html'), 'utf8');
    const m = t.match(/property="og:image" content="([^"]+)"/);
    expect(m).not.toBeNull();
    const sti = m[1].replace(DOM, '');
    expect(fs.existsSync(path.join(ROD, sti)),
      'og:image peger på ' + sti + ', som ikke findes').toBe(true);
  });

  /* CNAME er dét, der fortæller GitHub Pages, hvilket domæne
     siden svarer på. Uden filen svarer domænet 403
     host_not_allowed — målt 30/8, før den blev lagt ind. */
  test('CNAME nævner domænet og intet andet', () => {
    const t = fs.readFileSync(path.join(ROD, 'CNAME'), 'utf8').trim();
    expect(t).toBe('mosedehavnecafe.dk');
  });
});

/* ============================================================
   GÆSTEN KAN LÆGGE FORRETNINGEN PÅ HJEMMESKÆRMEN  (30/8)
   ------------------------------------------------------------
   ⚠️ MÅLT: manifestet lå KUN på admin.html. Personalet kunne
   lægge personalesiden på hjemmeskærmen, men gæsten kunne ikke
   lægge FORRETNINGEN der — og det er hende, der står nede ved
   vandet med telefonen i hånden.

   ⚠️ OG ADMINS MANIFEST BAR DEN GAMLE PALETTE: theme_color var
   #0f2c44, marineblå fra før 29/8, og baggrunden det gamle sand.
   Farverne i stilarkene blev skiftet; filen her blev glemt, og
   den er dét, telefonen tegner splash-skærmen med.
   ============================================================ */
test.describe('Appen på hjemmeskærmen', () => {

  const GÆSTESIDER = ['index.html', 'h-smorrebrod.html', 'h-selskaber.html',
    'h-catering.html', 'h-frokost.html', 'h-baglokale.html', 'h-kalender.html',
    'm-menukort.html', 'm-tapas.html', 'bestil/index.html', 'bord/index.html'];

  test('hver gæsteside kan lægges på hjemmeskærmen', () => {
    for (const f of GÆSTESIDER) {
      const t = fs.readFileSync(path.join(ROD, f), 'utf8');
      expect(t, f + ' kan ikke lægges på hjemmeskærmen')
        .toMatch(/rel="manifest" href="(\.\.\/)?gaest\.webmanifest"/);
      /* Uden apple-touch-icon tegner iOS et skærmbillede af siden
         som ikon — altså et lille, ulæseligt foto af forsiden i
         stedet for mærket. */
      expect(t, f + ' mangler apple-touch-icon — iOS tegner et skærmbillede')
        .toContain('apple-touch-icon');
    }
  });

  /* ⚠️ TO MANIFESTER, IKKE ÉT. Personalets starter i admin,
     gæstens på forsiden. Ét fælles ville lægge admin på gæstens
     hjemmeskærm — eller give personalet en app, der åbner
     hjemmesiden, når de skal se dagens bestillinger. */
  test('gæsten og personalet har hvert sit manifest', () => {
    const g = JSON.parse(fs.readFileSync(path.join(ROD, 'gaest.webmanifest'), 'utf8'));
    const p = JSON.parse(fs.readFileSync(path.join(ROD, 'manifest.webmanifest'), 'utf8'));

    expect(g.start_url, 'gæstens app åbner ikke forsiden').toBe('index.html');
    expect(p.start_url, 'personalets app åbner ikke admin').toBe('admin.html');
    expect(g.name).not.toContain('Personale');

    /* admin.html må ALDRIG pege på gæstens manifest: personalet
       ville få en app, der åbner hjemmesiden. */
    const a = fs.readFileSync(path.join(ROD, 'admin.html'), 'utf8');
    expect(a, 'admin peger på gæstens manifest').not.toContain('gaest.webmanifest');
  });

  /* Farverne er dem, telefonen tegner splash-skærmen og
     statuslinjen med — de er lige så meget "siden" som stilarket. */
  test('begge manifester bruger husets farver, ikke den gamle palette', () => {
    for (const fil of ['gaest.webmanifest', 'manifest.webmanifest']) {
      const m = JSON.parse(fs.readFileSync(path.join(ROD, fil), 'utf8'));
      expect(m.theme_color, fil + ' har ikke logoets røde').toBe('#d62a3a');
      expect(m.background_color, fil + ' har ikke designets creme').toBe('#fdf7ef');
      /* Den gamle marineblå familie må aldrig komme tilbage —
         samme regel som i stilarkene. */
      expect(JSON.stringify(m), fil + ' bærer den gamle marineblå')
        .not.toContain('0f2c44');
    }
  });

  test('ikonerne i manifestet findes', () => {
    for (const fil of ['gaest.webmanifest', 'manifest.webmanifest']) {
      const m = JSON.parse(fs.readFileSync(path.join(ROD, fil), 'utf8'));
      expect(m.icons.length).toBeGreaterThan(1);
      for (const i of m.icons) {
        expect(fs.existsSync(path.join(ROD, i.src)),
          fil + ' peger på ' + i.src + ', som ikke findes').toBe(true);
      }
    }
  });
});

/* ============================================================
   SMILEY-RAPPORTEN  (31/8)
   ------------------------------------------------------------
   Linket er EJERENS EGET — findsmiley.dk/app/1480560, "Mosede
   havn grill og ishus", glad smiley, seneste kontrol 26-02-2026.
   Det stod på "Ejeren skal bekræfte"-listen som tomt siden
   foråret; nu er det bekræftet og står FAST i footeren som
   adressen og telefonen.

   ⚠️ SIDERNE LÆSES AF MAPPEN — en ny side skal ikke kunne udgives
   uden husets ene eksterne bevis. */
test.describe('Smiley-rapporten står i footeren', () => {
  const fs = require('fs');

  function siderMedFod() {
    const rod = fs.readdirSync('.').filter((f) => /\.html$/.test(f)
      && !/^(admin|image-slot)/.test(f)
      && fs.readFileSync(f, 'utf8').includes('class="legal"'));
    return rod.concat(['bestil/index.html', 'bord/index.html']
      .filter((p) => fs.existsSync(p)));
  }

  test('hver side med en footer bærer linket', async () => {
    const sider = siderMedFod();
    expect(sider.length).toBeGreaterThanOrEqual(10);
    const uden = sider.filter((p) =>
      !fs.readFileSync(p, 'utf8').includes('findsmiley.dk/app/1480560'));
    expect(uden, 'sider uden smiley-rapporten i footeren').toEqual([]);
  });

  /* Og den ÅBNER rapporten — ikke bare et ord i en tekst. Målt på
     den beregnede synlighed, som huset kræver. */
  test('chippen kan ses og peger på rapporten', async ({ page }) => {
    await åbnSkal(page, '/h-kalender.html', { data: grunddata() });
    const chip = page.locator('.smiley-linje');
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('href', /findsmiley\.dk\/app\/1480560/);
    await expect(chip).toContainText('Fødevarestyrelsen');
  });
});

/* ============================================================
   ADRESSEN ER 20L  (1/9)
   ------------------------------------------------------------
   Ejeren skrev det med hånden på svararket, og Mikkel bekræftede
   det ordret: *"alt skal passe, det er 20l/L."*

   Siden har sagt **20I** (bogstavet I som i Ida) siden 23/8, og
   det var det eneste sted, hvor ét af tre bud stod i sten:
   menukortet skriver 20, tredjeparter både 20 og 20L.

   ⚠️ LISTEN LÆSES AF MAPPEN. En ny side kan ikke slippe forbi
   med det gamle husnummer — samme greb som favicon-prøven og
   footer-prøven ovenfor.
   ============================================================ */
test.describe('Husnummeret', () => {

  function alleSider() {
    return fs.readdirSync(ROD)
      .filter((f) => f.endsWith('.html'))
      .filter((f) => !erOmdirigering(f));
  }

  test('ingen side skriver det gamle 20I', () => {
    const sider = alleSider();
    expect(sider.length, 'der er ingen sider at måle på').toBeGreaterThan(5);
    for (const f of sider) {
      const tekst = fs.readFileSync(path.join(ROD, f), 'utf8');
      expect(tekst, f + ' skriver stadig Havnevej 20I')
        .not.toContain('Havnevej 20I');
    }
  });

  /* Og den skal STÅ der, ikke bare være rettet væk. En side, hvor
     adressen var forsvundet helt, ville også bestå prøven
     ovenfor. */
  test('de sider, der har en adresse, skriver 20L', () => {
    const sider = alleSider()
      .filter((f) => /Havnevej/.test(fs.readFileSync(path.join(ROD, f), 'utf8')));
    expect(sider.length, 'ingen side nævner adressen længere')
      .toBeGreaterThan(5);
    for (const f of sider) {
      const tekst = fs.readFileSync(path.join(ROD, f), 'utf8');
      /* ⚠️ KUN DÉR, HVOR DER FØLGER ET HUSNUMMER. Første udgave
         tog alt efter ordet og faldt på historien.html, som
         skriver "…ude ad Havnevej. Der er både…" i brødteksten.
         Reglen er husnummeret, ikke ordet. */
      const numre = tekst.match(/Havnevej\s*\d+\s*[A-ZÆØÅ]?/g) || [];
      for (const n of numre) {
        expect(n, f + ' skriver "' + n + '"').toBe('Havnevej 20L');
      }
    }
  });

  /* Kilden bag JSON-LD, kvitteringer og "Vis rute" er
     js/oplysninger.js. Står den forkert, siger siden ét og
     Google et andet. */
  test('oplysningsfilen siger det samme', () => {
    const raa = fs.readFileSync(path.join(ROD, 'js', 'oplysninger.js'), 'utf8');
    expect(raa).toContain("vej: 'Havnevej 20L'");
    /* ⚠️ KOMMENTARERNE KLIPPES AF FØRST. Noten ved feltet
       fortæller, at der STOD 20I indtil 1/9 — og uden det her
       fælder prøven sin egen dokumentation. Nøjagtig det skete
       for favicon-prøven 29/8. */
    const virksom = raa.replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/[^\n]*/g, '');
    expect(virksom, 'den virksomme kode nævner stadig 20I')
      .not.toContain('20I');
  });
});
