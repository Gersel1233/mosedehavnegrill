/* ============================================================
   HVAD FÅR GÆSTEN, NÅR DET GÅR GALT?   (5. september 2026)
   ------------------------------------------------------------
   Stresstesten (4/9) målte meget data og en TOM database. Det
   her er den tredje tilstand, ingen har målt: databasen svarer
   med en FEJL, eller den svarer slet ikke.

   Det er ikke en teoretisk tilstand. Supabase har nedetid,
   telefonen mister dækning på molen, og en tabel kan mangle en
   kolonne, fordi en SQL-fil ikke er kørt — det er sket fire
   gange i det her projekt.

   Den måler fire ting pr. side:
     · sider den overhovedet, eller bliver den blank
     · siger den NOGET til gæsten, eller ser den bare tom ud
     · står der en rå fejlbesked eller et engelsk ord på skærmen
     · hvor tung er siden, og hvor mange kald sender den

   BRUG:  node vaerktoej/naar-det-gaar-galt.js
   ============================================================ */
const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 4178;
const ROD = 'http://127.0.0.1:' + PORT;
const FORUD = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const START = {
  ...(fs.existsSync(FORUD) ? { executablePath: FORUD } : {}),
  args: ['--no-sandbox'],
};

function erVejviser(f) {
  const t = fs.readFileSync(f, 'utf8');
  return /http-equiv=["']refresh/i.test(t) && /location\.replace/.test(t);
}
function sider() {
  const ud = [];
  fs.readdirSync('.').forEach((f) => {
    if (f.endsWith('.html') && f !== 'admin.html' && !erVejviser(f)) ud.push('/' + f);
  });
  fs.readdirSync('.', { withFileTypes: true }).forEach((d) => {
    if (!d.isDirectory()) return;
    const i = path.join(d.name, 'index.html');
    if (fs.existsSync(i) && !erVejviser(i)) ud.push('/' + d.name + '/');
  });
  return ud.filter((s) => !/^\/(vejledning|print)\//.test(s));
}

/* Ord, der aldrig må stå på en gæsteside. Engelsk fra en
   fejlbesked, en rå statuskode eller en SQL-nøgle er ikke en
   oplysning — det er en side, der har givet op på dansk. */
const FORBUDT = [
  /\bundefined\b/, /\bnull\b/, /\bNaN\b/, /\[object Object\]/,
  /\bFailed to fetch\b/i, /\bTypeError\b/, /\bnetwork error\b/i,
  /PGRST\d+/, /\b42\d{3}\b/, /\bviolates\b/i, /\binternal server\b/i,
];

async function kør(navn, opsæt) {
  const browser = await chromium.launch(START);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  const ud = [];

  for (const sti of sider()) {
    const fejl = [];
    let vaegt = 0;
    let kald = 0;
    let tilDb = 0;
    page.removeAllListeners('pageerror');
    page.removeAllListeners('response');
    page.on('pageerror', (e) => fejl.push('JS: ' + e.message.slice(0, 90)));
    page.on('requestfailed', (r) => {
      if (r.url().indexOf('db.eksempel.test') !== -1) tilDb++;
    });
    page.on('response', async (r) => {
      kald++;
      if (r.url().indexOf('db.eksempel.test') !== -1) tilDb++;
      try {
        const h = r.headers()['content-length'];
        if (h) vaegt += Number(h);
      } catch (e) { /* nogle svar har ingen længde */ }
    });
    await opsæt(page);
    let synligTekst = '';
    try {
      await page.goto(ROD + sti, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(900);
      await page.evaluate(() => {
        const c = document.querySelector('#intro, #film');
        if (c && c.parentElement) c.parentElement.removeChild(c);
      });
      synligTekst = await page.evaluate(() => document.body.innerText || '');
    } catch (e) {
      fejl.push('SIDEN KOM IKKE OP: ' + e.message.slice(0, 70));
    }

    const blank = synligTekst.replace(/\s+/g, '').length < 40;
    if (blank) fejl.push('SIDEN ER SO GODT SOM TOM (' + synligTekst.length + ' tegn)');
    FORBUDT.forEach((r) => {
      const m = synligTekst.match(r);
      if (m) fejl.push('RÅT PÅ SKÆRMEN: "' + m[0] + '"');
    });
    /* ⚠️ EN MÅLING, DER IKKE RAMTE DATABASEN, MÅLER INGENTING —
       og siger "bestået". Det er husets ældste ar. Sider uden et
       eneste kald til den falske adresse markeres, så en runde
       med nul fejl kan skelnes fra en runde, der aldrig kørte. */
    ud.push({ sti, fejl, kb: Math.round(vaegt / 1024), kald, tilDb });
  }
  await browser.close();
  return { navn, ud };
}

/* ⚠️ GLOBALEN HEDDER MOSEDE_CLOUD, ikke MOSEDE_CONFIG — og det
   kostede den første kørsel. Med det forkerte navn stod SKY på
   false, siderne kørte i ØVETILSTAND, og alle tre fejltilstande
   meldte "0 af 14 sider har noget". En måling, der ikke rammer
   det, den måler, siger "bestået". Derfor tælles kaldene til den
   falske adresse nu, og en stum runde råber op om sig selv. */
const KONFIG = "window.MOSEDE_CLOUD={url:'https://db.eksempel.test',"
  + "anonKey:'proeve'};";

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1200));
  try {
    const runder = [];

    // 1) ALT VIRKER (øvetilstand) — målestokken
    runder.push(await kør('alt virker (øvetilstand)', async (page) => {
      await page.route('**/js/config.js*', (r) => r.fulfill({
        status: 200, contentType: 'application/javascript',
        body: "window.MOSEDE_CLOUD={url:'',anonKey:''};",
      }));
    }));

    // 2) DATABASEN SVARER 500
    runder.push(await kør('databasen svarer 500', async (page) => {
      await page.route('**/js/config.js*', (r) => r.fulfill({
        status: 200, contentType: 'application/javascript', body: KONFIG,
      }));
      await page.route('https://db.eksempel.test/**', (r) => r.fulfill({
        status: 500, contentType: 'application/json',
        body: '{"message":"internal server error"}',
      }));
    }));

    // 3) DATABASEN SVARER SLET IKKE
    runder.push(await kør('databasen svarer ikke', async (page) => {
      await page.route('**/js/config.js*', (r) => r.fulfill({
        status: 200, contentType: 'application/javascript', body: KONFIG,
      }));
      await page.route('https://db.eksempel.test/**', (r) => r.abort('connectionfailed'));
    }));

    // 4) EN KOLONNE MANGLER — arret fra vis_fra og vare-billede
    runder.push(await kør('en kolonne mangler (42703)', async (page) => {
      await page.route('**/js/config.js*', (r) => r.fulfill({
        status: 200, contentType: 'application/javascript', body: KONFIG,
      }));
      await page.route('https://db.eksempel.test/**', (r) => r.fulfill({
        status: 400, contentType: 'application/json',
        body: '{"code":"42703","message":"column x does not exist"}',
      }));
    }));

    runder.forEach((r) => {
      const daarlige = r.ud.filter((x) => x.fejl.length);
      if (!r.navn.startsWith('alt virker')) {
        const stumme = r.ud.filter((x) => !x.tilDb).map((x) => x.sti);
        if (stumme.length) {
          console.log('\n  ⚠️ RAMTE ALDRIG DATABASEN (målte altså ingenting): '
            + stumme.join(', '));
        }
      }
      console.log('\n=== ' + r.navn.toUpperCase() + ' — '
        + daarlige.length + ' af ' + r.ud.length + ' sider har noget ===');
      daarlige.forEach((x) => {
        console.log('  ' + x.sti);
        x.fejl.forEach((f) => console.log('      ' + f));
      });
      if (r.navn.startsWith('alt virker')) {
        console.log('  --- vægt og kald ---');
        r.ud.sort((a, b) => b.kb - a.kb).forEach((x) => {
          console.log('      ' + String(x.kb).padStart(5) + ' kB  '
            + String(x.kald).padStart(3) + ' kald   ' + x.sti);
        });
      }
    });
  } finally {
    server.kill();
  }
})();
