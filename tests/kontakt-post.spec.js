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
const { åbn, åbnSkal, åbnAdmin, grunddata, gemteData } = require('./hjaelp');

const ROD = path.join(__dirname, '..');

/* De ni sider, designet leverede med en footer. Listen læses af
   MAPPEN og ikke skrevet af i hånden: en tiende side med den
   samme footer ville ellers slippe forbi prøven. */
function siderMedFooter() {
  return fs.readdirSync(ROD)
    .filter((f) => f.endsWith('.html') && f !== 'admin.html')
    .filter((f) => fs.readFileSync(path.join(ROD, f), 'utf8').includes('class="fcols"'));
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
    await åbnSkal(page, '/index.html', { data: grunddata() });
    const selskab = page.locator('a[data-post="selskab"]');
    const booking = page.locator('a[data-post="booking"]');
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
    await expect(page.locator('a[data-post="selskab"]'))
      .toHaveAttribute('href', 'mailto:fest@eksempel.dk');
    // Den, ingen har rørt, står som den står.
    await expect(page.locator('a[data-post="booking"]'))
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
    await expect(page.locator('a[data-post="selskab"]')).toHaveCount(0);
    await expect(page.locator('a[data-post="booking"]')).toHaveCount(1);
  });

  test('felterne gemmes fra Kontakt-fanen', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await page.locator('[data-panel="p-kontakt"]').click();
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
    await page.locator('[data-panel="p-kontakt"]').click();
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
    await page.locator('[data-panel="p-kontakt"]').click();
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
    await page.locator('[data-panel="p-kontakt"]').click();
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

  test('og ikonet er kransen, ikke den gamle båd', () => {
    const svg = fs.readFileSync(path.join(ROD, 'favicon.svg'), 'utf8');
    /* Logoets røde — og den er LOGOETS, ikke sidens: #d62a3a står
       fast, uanset hvad --red hedder i temaet. */
    expect(svg).toContain('#d62a3a');
    /* Bådens to farver må aldrig komme igen. #0f2c44 var
       marineblå fra den GAMLE forside, #d1462f den gamle røde. */
    expect(svg, 'den gamle båds marineblå er tilbage i ikonet')
      .not.toContain('#0f2c44');
    expect(svg).not.toContain('#d1462f');
  });
});
