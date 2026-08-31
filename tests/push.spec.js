/* Push (fase 5c): telefonen skal sige til, når der kommer noget
   ind.

   Selve afsendelsen sker i en Edge Function hos Supabase og kan
   ikke måles herfra — men alt det, der KAN gå galt i klienten,
   måles: at manifest og service worker kun hører til
   personalesiden (gæsten skal ikke hente en byte mere), at
   kortet i admin fortæller sandheden om enhedens tilstand, og at
   abonnementet gemmes med personalets e-mail på. */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { åbn, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const ROD = path.join(__dirname, '..');

test.describe('Filerne hører KUN til personalesiden', () => {

  test.skip(({ isMobile }) => !!isMobile, 'statiske filer måles kun én gang');

  test('manifestet er gyldigt og peger på admin', async () => {
    const m = JSON.parse(fs.readFileSync(path.join(ROD, 'manifest.webmanifest'), 'utf8'));
    expect(m.start_url).toBe('admin.html');
    expect(m.display).toBe('standalone');
    expect(m.icons.length).toBeGreaterThanOrEqual(2);
    for (const ikon of m.icons) {
      expect(fs.existsSync(path.join(ROD, ikon.src)), `${ikon.src} findes ikke`).toBe(true);
    }
  });

  /* ⚠️ DEN HER PRØVE ER VENDT (30/8), OG GRUNDEN ER KUNDENS EGEN.

     Reglen var, at KUN admin måtte linke et manifest: gæstesiden
     er telefon-først, og en "installér"-prompt var bytes, ingen
     havde bedt om. Så bad Mikkel om det modsatte — forretningen
     skal kunne lægges på hjemmeskærmen med logoet på. Det er en
     aftale med kunden, ikke en forældet prøve, og så er det
     reglen, der flytter.

     MEN DEN HALVDEL, DER BAR VÆRDIEN, BLIVER — og den er nu
     skarpere end før:

     · Gæsten må ALDRIG få admins manifest. Ét forkert href, og
       en gæst, der trykker "Føj til hjemmeskærm", får en app,
       der åbner personalets login. Derfor tjekkes filnavnet,
       ikke bare at der ER et manifest.
     · Vejviserne (menu.html, selskaber/ …) må slet ikke have
       et. De sender videre i samme sekund; en app-genvej til en
       omdirigering er en blindgyde på hjemmeskærmen.
     · Ingen gæsteside må registrere en service worker. Den er
       admins push-kanal, og på en gæsteside ville den være vægt
       plus risikoen for gamle priser. */
  test('gæsten får sit EGET manifest — aldrig admins', async () => {
    const admin = fs.readFileSync(path.join(ROD, 'admin.html'), 'utf8');
    expect(admin).toContain('rel="manifest"');
    expect(admin, 'admin peger på gæstens manifest').toContain('manifest.webmanifest');

    // Gæstesider, der kan installeres. Adressen er relativ, så
    // bestil/ peger et niveau op.
    for (const side of ['index.html', 'm-menukort.html', 'm-tapas.html',
      'h-smorrebrod.html', 'h-selskaber.html', 'h-catering.html',
      'h-frokost.html', 'h-baglokale.html', 'h-kalender.html',
      'bestil/index.html', 'bord/index.html']) {
      const html = fs.readFileSync(path.join(ROD, side), 'utf8');
      expect(html, `${side} mangler gæstens manifest`).toMatch(/rel="manifest" href="(\.\.\/)?gaest\.webmanifest"/);
      expect(html, `${side} peger på ADMINS manifest`).not.toMatch(/href="(\.\.\/)?manifest\.webmanifest"/);
      expect(html, `${side} registrerer service worker`).not.toContain('serviceWorker');
    }

    // Vejviserne: de sender videre, og en genvej til en
    // omdirigering hører ikke hjemme på en hjemmeskærm.
    for (const side of ['menu.html', 'smoerrebroed-ud-af-huset/index.html',
      'selskaber/index.html', 'catering/index.html',
      'baglokale/index.html', 'arrangementer/index.html']) {
      const html = fs.readFileSync(path.join(ROD, side), 'utf8');
      expect(html, `vejviseren ${side} linker et manifest`).not.toContain('rel="manifest"');
      expect(html, `${side} registrerer service worker`).not.toContain('serviceWorker');
    }
  });

  test('gæstens manifest åbner forsiden — ikke personalesiden', () => {
    const g = JSON.parse(fs.readFileSync(path.join(ROD, 'gaest.webmanifest'), 'utf8'));
    expect(g.start_url).toBe('index.html');
    expect(g.start_url, 'gæstens app åbner admin').not.toContain('admin');
    for (const ikon of g.icons) {
      expect(fs.existsSync(path.join(ROD, ikon.src)), `${ikon.src} findes ikke`).toBe(true);
    }
    // Genvejene må heller ikke føre ind i admin.
    for (const g2 of (g.shortcuts || [])) {
      expect(g2.url, `genvejen ${g2.name} peger på admin`).not.toContain('admin');
    }
  });

  test('service workeren cacher IKKE', async () => {
    /* En service worker med fetch-håndtering er en side, der kan
       vise gamle priser, efter personalet har rettet dem. Filen
       må kun kende push og klik. */
    const sw = fs.readFileSync(path.join(ROD, 'sw.js'), 'utf8');
    expect(sw).toContain("addEventListener('push'");
    expect(sw).toContain("addEventListener('notificationclick'");
    expect(sw, 'sw.js har en fetch-håndtering').not.toContain("addEventListener('fetch'");
    expect(sw, 'sw.js rører cachen').not.toMatch(/caches\.open|cache\.put/);
  });

  test('admin er stadig noindex, også med manifest på', async ({ page }) => {
    await page.goto('/admin.html');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
  });
});

test.describe('Kortet i admin', () => {

  /* Nøglerne laves af chefen selv med supabase/lav-vapid.html —
     de er ALDRIG i repoet. Før den offentlige er sat, skal kortet
     vise opsætningen og intet love. */
  test('uden nøgle vises opsætningen, og til-knappen findes ikke', async ({ page }) => {
    await åbnAdmin(page);
    await visFane(page, 'p-kontakt');

    await expect(page.locator('#push-opsaetning')).toBeVisible();
    await expect(page.locator('#push-status')).toContainText('Opsætningen mangler');
    await expect(page.locator('#push-til')).toBeHidden();
    await expect(page.locator('#push-enheder')).toContainText('Ingen enheder');
  });

  test('en nøgle, der ikke ligner en nøgle, bliver afvist', async ({ page }) => {
    await åbnAdmin(page);
    await visFane(page, 'p-kontakt');
    await page.locator('#vapid-noegle').fill('ikke-en-noegle');
    await page.locator('#gem-vapid').click();
    await expect(page.locator('#fejl')).toContainText('87 tegn');
  });

  test('med nøglen på plads forsvinder opsætningen', async ({ page }) => {
    const nøgle = 'B' + 'a'.repeat(86);
    await åbnAdmin(page, {
      data: grunddata({
        indstillinger: { ...grunddata().indstillinger, vapid_offentlig: nøgle },
      }),
    });
    await visFane(page, 'p-kontakt');

    await expect(page.locator('#push-opsaetning')).toBeHidden();
    /* I testbrowseren uden abonnement skal der stå, at enheden
       ikke får besked — ikke et tomt felt, der ligner en fejl. */
    await expect(page.locator('#push-status')).not.toHaveText('');
    await expect(page.locator('#push-status')).not.toContainText('Opsætningen mangler');
  });

  test('tilmeldte enheder står på listen med navn og e-mail', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        push_abonnementer: [{
          id: 1, lokation_id: 'mosede', email: 'chef@mosede.dk', enhed: 'iPad',
          endpoint: 'https://push.eksempel/enhed-1', p256dh: 'x', auth: 'y',
          oprettet: '2026-08-07T08:00:00Z',
        }],
      }),
    });
    await visFane(page, 'p-kontakt');
    await expect(page.locator('#push-enheder')).toContainText('iPad · chef@mosede.dk');
  });

  test('en enhed kan fjernes fra listen', async ({ page }) => {
    await åbnAdmin(page, {
      data: grunddata({
        push_abonnementer: [{
          id: 1, lokation_id: 'mosede', email: 'chef@mosede.dk', enhed: 'iPad',
          endpoint: 'https://push.eksempel/enhed-1', p256dh: 'x', auth: 'y',
          oprettet: '2026-08-07T08:00:00Z',
        }],
      }),
    });
    await visFane(page, 'p-kontakt');
    page.once('dialog', (d) => d.accept());
    await page.locator('#push-enheder').getByRole('button', { name: 'Fjern' }).click();
    await expect(page.locator('#push-enheder')).toContainText('Ingen enheder');

    const gemt = await gemteData(page);
    expect((gemt.push_abonnementer || []).length).toBe(0);
  });
});

test.describe('Edge Function-koden holder sine egne regler', () => {

  test.skip(({ isMobile }) => !!isMobile, 'læser en fil, ikke en side');

  test('døren tjekkes før alt andet, og hemmeligheden står ikke i filen', async () => {
    const fn = fs.readFileSync(
      path.join(ROD, 'supabase', 'funktioner', 'send-push.ts'), 'utf8');

    /* Headeren skal tjekkes FØR json-parsning — ellers kan enhver
       på internettet få funktionen til at arbejde. Der måles på
       KODEN og ikke på ordet: 'x-mosede-secret' står også i
       kommentaren øverst, og første udgave af testen målte på den
       — og kunne dermed ikke fejle. Genindført fejl afslørede det. */
    const doer = fn.indexOf('req.headers.get("x-mosede-secret")');
    expect(doer).toBeGreaterThan(-1);
    expect(doer, 'json parses før døren er tjekket')
      .toBeLessThan(fn.indexOf('req.json'));

    /* Ingen hemmeligheder i koden: alt skal komme fra env. Selv
       den OFFENTLIGE VAPID-nøgle er ikke i repoet — den laves af
       chefen med lav-vapid.html og bor i indstillinger. */
    expect(fn).not.toMatch(/VAPID_PRIVAT\s*=\s*["']/);
    expect(fn).toContain("Deno.env.get(\"VAPID_PRIVAT\")");
    expect(fn).toContain("Deno.env.get(\"PUSH_SECRET\")");
    expect(fn).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  test('alle fire tabeller giver en besked', async () => {
    const fn = fs.readFileSync(
      path.join(ROD, 'supabase', 'funktioner', 'send-push.ts'), 'utf8');
    for (const tabel of ['bestillinger', 'forespoergsler', 'bordbestillinger', 'udlejninger']) {
      expect(fn, `${tabel} giver ingen push`).toContain(`"${tabel}"`);
    }
  });

  test('gæstens telefonnummer står ikke i push-teksten', async () => {
    /* En push kan ligge på en låst skærm i et køkken, hvor gæster
       går forbi. Navnets fornavn er nok til at vide, at der skal
       kigges — nummeret hører til inde i admin. */
    const fn = fs.readFileSync(
      path.join(ROD, 'supabase', 'funktioner', 'send-push.ts'), 'utf8');
    expect(fn).not.toMatch(/r\??\.telefon/);
  });
});

/* ============================================================
   BESKEDERNE SIGER HVAD OG HVORNÅR — OG LYVER IKKE  (31/8)
   ------------------------------------------------------------
   Kundens ord: push-beskederne skal være "bedre og pænere, og
   forklar hvad det er og hvad tid". Tre ting var direkte
   forkerte, og de vogtes her som tekst i funktionen — browseren
   kan ikke køre en Deno-funktion, men den kan holde fast i, at
   fejlene ikke kommer tilbage.
   ============================================================ */
const fsP = require('fs');
const pathP = require('path');
const RODP = pathP.join(__dirname, '..');

test.describe('Push-beskedernes ord', () => {

  /* ⚠️ KOMMENTARERNE KLIPPES AF FØR MÅLINGEN — de dokumenterer
     netop de gamle fejl med deres egne ord, og favicon-prøven
     har allerede én gang fældet sin egen dokumentation. Det er
     KODEN, der ikke må sige "Ring og bekræft" — noten om, at
     den engang gjorde, må gerne. */
  const fn = () => fsP.readFileSync(
    pathP.join(RODP, 'supabase', 'funktioner', 'send-push.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  test('en bordbooking beder ALDRIG om et bekræftende opkald', async () => {
    /* Booket er booket — kundens egen regel, sagt fire gange.
       Opkaldet hører til Afvis. */
    expect(fn()).not.toMatch(/Ring og bekræft/i);
    expect(fn()).toContain('Booket er booket');
  });

  test('bestillingen påstår ikke længere, at alt er smørrebrød', async () => {
    expect(fn()).not.toContain('har bestilt smørrebrød');
  });

  test('frokostordningen har sit eget ord — ikke "noget"', async () => {
    expect(fn()).toMatch(/frokost:\s*"en frokostordning"/);
  });

  test('der står aldrig "betalt" — der er ingen betaling i systemet', async () => {
    /* Samme regel som køkkenskærmen (28/8): en push, der siger
       betalt, er en tallerken, der bæres ud som betalt. */
    expect(fn()).not.toMatch(/betalt/i);
  });

  test('en levering siger LEVERES — og lover ingen automatik', async () => {
    expect(fn()).toContain('LEVERES');
    expect(fn()).toContain('bekræftes aldrig automatisk');
  });
});
