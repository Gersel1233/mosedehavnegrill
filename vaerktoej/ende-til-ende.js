/* ============================================================
   HELE KÆDEN, ENDE TIL ENDE                    (10. sep 2026)
   ------------------------------------------------------------
   Kundens ord: *"tjek alt om det virker ende til ende, også
   QR-code-bestillingerne, og gerne fixe alt det der lort og
   rette til, så det virker fuldt funktionelt."*

   Prøverne måler hver sin regel. Det her måler noget andet:
   at en gæsts handling FAKTISK kommer hele vejen frem til den
   skærm, personalet står ved. Fem veje ind, og for hver af dem:

     1) gæsten sender          (og siden kvitterer)
     2) rækken ligger i basen  (og bærer det, den skal)
     3) admin TEGNER den       (på den fane, den hører til)

   ⚠️ OG DEN KØRER PÅ EJERENS EGNE DATA — 308 varer, 22
   kategorier, hans åbningstider og hans flueben. Med fem varer
   ser hver side fin ud; det er husets ar fra 7/9 og 8/9.

   ⚠️ DEN SKRIVER INGENTING I PRODUKTIONEN. Alt sker i
   øvetilstand i en browser, der lukkes bagefter.

   BRUG:  python3 -m http.server 4175 --bind 127.0.0.1 &
          node vaerktoej/ende-til-ende.js <ejerens-data.json>
   ============================================================ */
const { chromium, devices } = require('playwright');
const fs = require('fs');

const ROD = process.env.ROD || 'http://127.0.0.1:4175';
const DATA = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const NØGLE = 'mosede_data_v1';

/* Fredag kl. 13 dansk tid. Uret sættes fast: "kan det bestilles"
   afhænger af klokken OG af ugedagen (kategorier kan lukkes pr.
   dag), og en måling, der siger noget andet kl. 22, er ubrugelig. */
const UR = '2026-09-11T11:00:00Z';

const fund = [];
function fejl(hvor, hvad) { fund.push({ hvor, hvad }); }

async function nyKontekst(b, { mobil = true, admin = false } = {}) {
  const ctx = await b.newContext(mobil ? devices['iPhone 13']
    : { viewport: { width: 1280, height: 900 } });
  const side = await ctx.newPage();
  const jsFejl = [];
  side.on('pageerror', (e) => jsFejl.push(String(e.message)));
  side.on('console', (m) => { if (m.type() === 'error') jsFejl.push('konsol: ' + m.text()); });
  await side.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await side.route('**/js/config.js*', (r) => r.fulfill({ status: 200,
    contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD = { url: '', anonKey: '', lokation: 'mosede' };" }));
  /* ⚠️ SKRIVES KUN ÉN GANG. Bruges `setItem` ubetinget, tørres
     gæstens egen bestilling af ved næste navigation — og så
     måler admin-halvdelen en tom base. Arret fra 5/9. */
  await side.addInitScript(([n, d, iso, somAdmin]) => {
    try { if (!localStorage.getItem(n)) localStorage.setItem(n, JSON.stringify(d)); } catch (e) { /**/ }
    try { localStorage.setItem('mosede_intro_set_v1', '1'); } catch (e) { /**/ }
    if (somAdmin) {
      try {
        sessionStorage.setItem('mosede_token', 'lokal');
        sessionStorage.setItem('mosede_email', 'ejer@lesreg.dk');
      } catch (e) { /**/ }
    }
    const fast = new Date(iso).getTime();
    const Ægte = Date;
    class FastDato extends Ægte {
      constructor(...a) { if (a.length === 0) super(fast); else super(...a); }
      static now() { return fast; }
    }
    window.Date = FastDato;
  }, [NØGLE, DATA, UR, admin]);
  return { ctx, side, jsFejl };
}

async function basen(side) {
  return side.evaluate((n) => JSON.parse(localStorage.getItem(n) || '{}'), NØGLE);
}

/* ------------------------------------------------------------
   A) QR VED BORDET — gæsten scanner bord 7 og bestiller
   ------------------------------------------------------------ */
async function qrBestilling(b) {
  const { ctx, side, jsFejl } = await nyKontekst(b);
  await side.goto(ROD + '/ved-bordet/?bord=7', { waitUntil: 'load' });
  await side.waitForTimeout(1200);

  const plus = side.locator('.stk-linje .taeller button.glass.rund:has-text("+")');
  const antal = await plus.count();
  if (!antal) { fejl('QR', 'ingen varer på kortet — bordsiden viste ingenting'); }
  else {
    await plus.nth(0).click();
    await plus.nth(1).click();
    await side.waitForTimeout(300);
  }

  /* Kurvbjælken skal sige, HVAD der er valgt — ikke kun hvor mange. */
  const kurv = await side.locator('#bestil-kurv').first().innerText().catch(() => '');
  if (!/\d/.test(kurv)) fejl('QR', 'kurvbjælken viser intet tal efter to tryk');

  await side.locator('#bestil-kurv button.kurv-videre, #bestil-kurv .kurv-videre')
    .first().click().catch(() => {});
  await side.waitForTimeout(400);

  /* ⚠️ FELTERNE HEDDER `bestil-navn` OG `bestil-telefon`.
     Første udgave skrev `#navn`/`#telefon`, og `fill` fejlede
     tavst i en `.catch` — så rapporten sagde "bestillingen nåede
     ALDRIG databasen" om en side, der var helt i orden. Husets
     ældste ar: en måling, der ikke rammer det, den måler. */
  await side.fill('#bestil-navn', 'Ende Til Ende');
  await side.fill('#bestil-telefon', '20304050');

  /* ⚠️ OG DER ER TO TRIN MED HVER SIN KNAP. `#bestil-send` åbner
     det sidste kig; `#kig-send` er den, der sender. Første udgave
     trykkede den samme knap to gange. */
  await side.locator('#bestil-send').click();
  await side.waitForTimeout(600);
  const kig = side.locator('#bestil-kig');
  if (!(await kig.isVisible().catch(() => false))) {
    fejl('QR', 'det sidste kig kom aldrig frem efter Send');
  }
  await side.locator('#kig-send').click();
  await side.waitForTimeout(1400);

  const kvit = await side.locator('.kvit, #bestil-tak').first().isVisible().catch(() => false);
  if (!kvit) fejl('QR', 'ingen kvittering efter afsendelse');

  const d = await basen(side);
  const raekker = (d.bestillinger || []).filter((x) => x.bord_nummer);
  if (!raekker.length) fejl('QR', 'bestillingen nåede ALDRIG databasen');
  else {
    const r = raekker[raekker.length - 1];
    if (r.hvordan !== 'spis_her') fejl('QR', 'et bord er ikke spis her: ' + r.hvordan);
    if (!r.reference) fejl('QR', 'rækken har ingen reference');
    if (!(r.linjer || []).length) fejl('QR', 'rækken har ingen varelinjer');
  }
  if (jsFejl.length) fejl('QR', 'JS-fejl: ' + jsFejl.slice(0, 2).join(' | '));
  const gemt = await side.evaluate((n) => localStorage.getItem(n), NØGLE);
  await ctx.close();
  return { gemt, kvit, antal };
}

/* ------------------------------------------------------------
   A2) BORDBOOKING — gæsten booker et bord på bord/
   ------------------------------------------------------------ */
async function bordbooking(b, gemt) {
  const { ctx, side, jsFejl } = await nyKontekst(b);
  await side.addInitScript(([n, v]) => {
    try { localStorage.setItem(n, v); } catch (e) { /**/ }
  }, [NØGLE, gemt]);
  await side.goto(ROD + '/bord/', { waitUntil: 'load' });
  await side.waitForTimeout(1200);

  /* ⚠️ VENT PÅ DEN VALGTE DAG, IKKE PÅ KLIKKET. `js/bord.js`
     afviser en booking uden dag OG tid, og begge tegnes af
     dagstriben EFTER `Butik.hent()`. Det er 3/9-arret: prøven
     fejlede med "kvitteringen manglede", som om MAILREGLEN var
     brudt. */
  const dag = side.locator('#bord-dage .dag').first();
  if (!(await dag.count())) { fejl('BORD', 'dagstriben er tom — ingen dage at booke'); }
  else {
    await dag.click();
    await side.waitForSelector('#bord-dage .dag.valgt', { timeout: 4000 }).catch(() => {});
  }
  const tid = await side.locator('#bord-tid option').count();
  if (tid < 2) fejl('BORD', 'ingen klokkeslæt på den valgte dag');

  /* ⚠️ ANTALLET ER PÅKRÆVET, og det kostede en falsk melding.
     Uden det sagde rapporten "bookingen nåede ALDRIG databasen"
     — mens siden helt korrekt skrev *"Hvor mange kommer I? Skriv
     et helt tal."* i `#fejl-antal`. Måleren ramte ikke det, den
     målte; tredje gang samme dag. */
  await side.fill('#bord-antal', '4');
  await side.fill('#bord-navn', 'Ende Til Ende');
  await side.fill('#bord-telefon', '20304051');
  await side.fill('#bord-email', 'ende@lesreg.dk').catch(() => {});
  await side.locator('#bord-send').click();
  await side.waitForTimeout(1400);

  if (!(await side.locator('#bord-tak').isVisible().catch(() => false)))
    fejl('BORD', 'ingen kvittering efter booking');
  const d = await basen(side);
  if (!(d.bordbestillinger || []).length) fejl('BORD', 'bookingen nåede ALDRIG databasen');
  if (jsFejl.length) fejl('BORD', 'JS-fejl: ' + jsFejl.slice(0, 2).join(' | '));
  const ud = await side.evaluate((n) => localStorage.getItem(n), NØGLE);
  await ctx.close();
  return ud;
}

/* ------------------------------------------------------------
   A3) FORESPØRGSEL — et selskab spørger
   ------------------------------------------------------------ */
async function forespoergsel(b, gemt) {
  const { ctx, side, jsFejl } = await nyKontekst(b);
  await side.addInitScript(([n, v]) => {
    try { localStorage.setItem(n, v); } catch (e) { /**/ }
  }, [NØGLE, gemt]);
  await side.goto(ROD + '/h-selskaber.html', { waitUntil: 'load' });
  await side.waitForTimeout(1000);
  await side.fill('#pnavn', 'Ende Til Ende');
  await side.fill('#ptlf', '20304052');
  await side.fill('#pmail', 'ende@lesreg.dk');
  await side.fill('#pantal', '30');
  /* ⚠️ DATOEN SKAL VÆRE MINDST FIRE DAGE UDE (selskabernes eget
     varsel, 29/8) — designets egen værdi i feltet kan være
     passeret, når den her måling køres om et halvt år. */
  await side.evaluate(() => {
    const f = document.getElementById('pdato');
    if (!f) return;
    const d = new Date(Date.now() + 10 * 86400000);
    f.value = d.toISOString().slice(0, 10);
    f.dispatchEvent(new Event('change', { bubbles: true }));
  });
  /* ⚠️ KNAPPEN HAR HVERKEN id ELLER type="submit" — den er
     designets `.g.solid`. En selektor, der gættede på
     `.knap.send`, ramte ingenting og meldte siden i stykker. */
  await side.locator('#forespoerg button.g.solid').first().click();
  await side.waitForTimeout(1600);
  const d = await basen(side);
  if (!(d.forespoergsler || []).length) fejl('FORESPØRGSEL', 'nåede ALDRIG databasen');
  if (jsFejl.length) fejl('FORESPØRGSEL', 'JS-fejl: ' + jsFejl.slice(0, 2).join(' | '));
  const ud = await side.evaluate((n) => localStorage.getItem(n), NØGLE);
  await ctx.close();
  return ud;
}

/* ------------------------------------------------------------
   B) ADMIN — ser personalet den?
   ------------------------------------------------------------ */
/* ⚠️ FANERNE LÆSES AF OPMÆRKNINGEN, IKKE AF EN LISTE HER.
   Første udgave var håndskrevet og sagde "FANEN FINDES IKKE" om
   tre faner: `p-baglokale` hedder `p-lokale`, og `p-beskeder` og
   `p-indstillinger` findes slet ikke længere. Tre falske fund —
   og en rapport, hvor en sjettedel er støj, læses ikke til ende.
   Samme regel som gæstesidernes gennemgang: listen kommer fra
   virkeligheden, så en NY fane heller ikke kan slippe forbi. */
async function faneListe(side) {
  return side.evaluate(() => [...document.querySelectorAll('.faner button[data-panel]')]
    .map((b) => b.getAttribute('data-panel')));
}

async function adminGennemgang(b, gemt) {
  const { ctx, side, jsFejl } = await nyKontekst(b, { mobil: false, admin: true });
  await side.addInitScript(([n, v]) => {
    try { localStorage.setItem(n, v); } catch (e) { /**/ }
  }, [NØGLE, gemt]);
  await side.goto(ROD + '/admin.html', { waitUntil: 'load' });
  await side.waitForTimeout(2500);

  const rapport = [];
  const FANER = await faneListe(side);
  if (FANER.length < 10) fejl('ADMIN', 'kun ' + FANER.length + ' faner fundet — søjlen tegnede ikke');
  for (const id of FANER) {
    const knap = side.locator(`.faner button[data-panel="${id}"]`);
    if (!(await knap.count())) { rapport.push({ fane: id, findes: false }); continue; }
    await knap.click({ force: true }).catch(() => {});
    await side.waitForTimeout(500);
    const m = await side.evaluate((p) => {
      const el = document.getElementById(p);
      if (!el) return { fejl: 'panelet findes ikke' };
      const t = el.innerText || '';
      const daarlige = (t.match(/\b(null|undefined|NaN|\[object Object\])\b/g) || []);
      /* Trykflader under 30 px — det, en finger ikke kan ramme. */
      let smaa = 0;
      el.querySelectorAll('button, a, input, select, [role="button"]').forEach((k) => {
        if (!k.checkVisibility || !k.checkVisibility()) return;
        const r = k.getBoundingClientRect();
        if (r.height > 0 && r.height < 30) smaa++;
      });
      return {
        tegn: t.trim().length,
        daarlige: daarlige.slice(0, 3),
        smaa,
        sidelaens: el.scrollWidth > el.clientWidth + 2,
      };
    }, id);
    if (m.fejl) fejl('ADMIN ' + id, m.fejl);
    if (m.daarlige && m.daarlige.length) fejl('ADMIN ' + id, 'skriver ' + m.daarlige.join(', ') + ' på skærmen');
    if (m.sidelaens) fejl('ADMIN ' + id, 'panelet ruller sidelæns');
    rapport.push({ fane: id, ...m });
  }
  /* ---- DET SIDSTE LED: KAN PERSONALET LUKKE SAGEN? ----------
     At admin TEGNER bestillingen er ikke det samme som, at den
     kan lukkes. Kæden slutter ved trykket, ikke ved visningen —
     og et tryk, der ikke skriver i basen, er præcis den slags,
     der ser ud til at virke (Gendan-knappen 26/8, live-mærket
     31/8). Vi trykker ✓ Færdig på QR-bestillingen i køkken-køen
     og læser RÆKKEN bagefter. */
  await side.locator('.faner button[data-panel="p-koekken"]').click({ force: true }).catch(() => {});
  await side.waitForTimeout(600);
  const faerdig = side.locator('#p-koekken .knap.gron, #p-koekken button:has-text("Færdig")').first();
  if (!(await faerdig.count())) {
    fejl('ADMIN p-koekken', 'ingen ✓ Færdig-knap på QR-bestillingen');
  } else {
    await faerdig.click({ force: true });
    await side.waitForTimeout(1200);
    const d = await basen(side);
    const bord = (d.bestillinger || []).filter((x) => x.bord_nummer);
    const sidste = bord[bord.length - 1];
    if (!sidste) fejl('ADMIN p-koekken', 'bordbestillingen forsvandt af basen');
    else if (sidste.status !== 'serveret') {
      fejl('ADMIN p-koekken',
        'et tryk på ✓ Færdig skrev IKKE i basen — status er stadig "' + sidste.status + '"');
    }
  }

  if (jsFejl.length) fejl('ADMIN', 'JS-fejl: ' + jsFejl.slice(0, 3).join(' | '));
  await ctx.close();
  return rapport;
}

(async () => {
  const b = await chromium.launch();
  console.log('ENDE TIL ENDE — ' + new Date().toISOString().slice(0, 16).replace('T', ' '));
  console.log('Data: ' + (DATA.menu_varer || []).length + ' varer · '
    + (DATA.menu_kategorier || []).length + ' kategorier · '
    + (DATA.borde || []).length + ' borde\n');

  const qr = await qrBestilling(b);
  console.log('A) QR VED BORDET');
  console.log('   plusknapper: ' + qr.antal + ' · kvittering: ' + (qr.kvit ? 'ja' : 'NEJ'));

  const efterBord = await bordbooking(b, qr.gemt);
  const efterForesp = await forespoergsel(b, efterBord);
  {
    const d = JSON.parse(efterForesp || '{}');
    console.log('\nA2) DE ANDRE VEJE IND');
    console.log('   bestillinger: ' + (d.bestillinger || []).length
      + ' · bordbookinger: ' + (d.bordbestillinger || []).length
      + ' · forespørgsler: ' + (d.forespoergsler || []).length);
  }

  const faner = await adminGennemgang(b, efterForesp);
  console.log('\nB) ADMIN — ' + faner.length + ' faner');
  faner.forEach((f) => {
    console.log('   ' + (f.findes === false ? '⚠️  ' : '    ') + f.fane.padEnd(20)
      + (f.findes === false ? 'FANEN FINDES IKKE'
        : (f.tegn + ' tegn' + (f.smaa ? ' · ' + f.smaa + ' små trykflader' : ''))));
  });

  await b.close();
  console.log('\n' + '='.repeat(58));
  if (!fund.length) console.log('INGEN FUND — kæden holder hele vejen.');
  else {
    console.log(fund.length + ' FUND:');
    fund.forEach((f) => console.log('  ⚠️  [' + f.hvor + '] ' + f.hvad));
  }
  process.exit(fund.length ? 1 : 0);
})();
