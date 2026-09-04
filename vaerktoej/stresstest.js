/* ============================================================
   STRESSTEST AF HELE SIDEN  (4/9)
   ------------------------------------------------------------
   Kundens ord: *"og derefter test det til ende, stress test
   osv."*

   Prøvesuiten måler REGLER: bliver den rigtige række skrevet,
   siger siden det rigtige, står knappen det rigtige sted. Den
   måler dem på et lille datasæt — grunddata() har en håndfuld
   varer og et par bestillinger.

   Filen her måler noget andet: hvad der sker, når der er MEGET.
   En travl lørdag på havnen er 262 varer på kortet, 55 borde,
   halvandet hundrede bestillinger og en køkkenskærm, der tegnes
   om hvert ottende sekund. Det er dér, en optegning, der river
   hele listen ned, holder op med at være en detalje.

   ⚠️ DEN ER IKKE EN PRØVE, OG DET ER MED VILJE. Der er ingen
   grænse, den falder på, ud over de to, der ER regler: en
   JS-fejl er altid en fejl, og en side, der ruller sidelæns, er
   altid en fejl. Resten er TAL, man læser og sammenligner med
   sidste gang — et loft på "17 ms" ville falde den dag, maskinen
   var travl, og så begynder man at lede i den forkerte ende.

   ⚠️ OG DEN SKAL KØRE ALENE. Playwrights egen server på 4173 dør,
   hvis en browser kører med under en fuld runde (arret fra 4/9,
   hvor ~500 prøver fejlede med ERR_CONNECTION_REFUSED). Kør
   runden FØR eller EFTER, aldrig imens.

   Sådan:
       nohup python3 -m http.server 4175 --bind 127.0.0.1 &
       /opt/node22/bin/node vaerktoej/stresstest.js
   ============================================================ */
'use strict';

const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const { grunddata } = require('../tests/hjaelp.js');

const ROD = 'http://127.0.0.1:4175';

/* ---- EN TRAVL LØRDAG ----------------------------------------
   Tallene er forretningens egne størrelsesordener: 262 varer i
   21 kategorier (målt i produktionen 3/9), 55 borde (ejerens
   eget tal), og en dag med langt mere, end der nogensinde har
   stået på skærmen. Vi vil vide, hvad der sker OVER kanten —
   ikke hvad der sker på en almindelig tirsdag. */
function stordata() {
  const d = grunddata();
  const idag = new Date().toISOString().slice(0, 10);

  // 21 kategorier à 12-13 varer = 262
  d.menu_kategorier = [];
  d.menu_varer = [];
  const afd = ['mad', 'is', 'drikke'];
  let vid = 1;
  for (let k = 1; k <= 21; k++) {
    d.menu_kategorier.push({
      id: k, lokation_id: 'mosede', navn: 'Kategori ' + k,
      afdeling: afd[k % 3], sortering: k, aktiv: true, note: null,
      dage: 'alle', fra_kl: null, til_kl: null,
    });
    const antal = k <= 10 ? 13 : 12;
    for (let v = 0; v < antal; v++, vid++) {
      d.menu_varer.push({
        id: vid, lokation_id: 'mosede', kategori_id: k,
        navn: 'Vare ' + vid, beskrivelse: 'Med det hele, og lidt til',
        pris: 25 + (vid % 90), sortering: v, aktiv: true,
        udsolgt: vid % 37 === 0, antal_tilbage: null, billede: null,
      });
    }
  }

  d.borde = [];
  for (let i = 1; i <= 55; i++) {
    d.borde.push({ id: i, lokation_id: 'mosede', nummer: String(i),
      pladser: null, placering: null, zone: i % 2 ? 'Molen' : 'Terrassen',
      aktiv: true, har_kode: false });
  }

  /* 180 bestillinger i dag — 60 fra bordene, 120 fra lugen.
     Overblik sorterer dem i tid, Bestillinger deler dem i fire
     bunker, og køkkenskærmen filtrerer på bordnummer. */
  d.bestillinger = [];
  const statusser = ['ny', 'bekraeftet', 'klar', 'afhentet', 'serveret'];
  for (let i = 1; i <= 180; i++) {
    const bord = i % 3 === 0 ? String((i % 55) + 1) : null;
    const linjer = [];
    for (let l = 0; l < 1 + (i % 5); l++) {
      const v = d.menu_varer[(i * 7 + l * 13) % d.menu_varer.length];
      linjer.push({ navn: v.navn, antal: 1 + (l % 3), pris: v.pris });
    }
    d.bestillinger.push({
      id: i, lokation_id: 'mosede',
      reference: 'SM' + String(260900 + i),
      nummer: i,
      navn: 'Gæst nummer ' + i, telefon: '2030' + String(4000 + i),
      email: i % 4 ? null : 'gaest' + i + '@eksempel.dk',
      hent_dato: idag,
      hent_tid: String(10 + (i % 10)).padStart(2, '0') + ':'
        + String((i % 4) * 15).padStart(2, '0'),
      antal: linjer.reduce((a, l) => a + l.antal, 0),
      linjer, fyld: null, besked: i % 9 ? null : 'ALLERGI: nødder',
      status: statusser[i % statusser.length],
      hvordan: bord ? 'spis_her' : (i % 7 ? 'afhentning' : 'levering'),
      leverings_adresse: (!bord && i % 7 === 0) ? 'Havnevej 20L, 2670 Greve' : null,
      bord_nummer: bord, intern_note: null, slettet: null,
      oprettet: idag + 'T08:00:00.000Z',
    });
  }

  // 120 bordbookinger og 90 forespørgsler
  d.bordbestillinger = [];
  for (let i = 1; i <= 120; i++) {
    d.bordbestillinger.push({
      id: i, lokation_id: 'mosede', reference: 'BO' + String(260900 + i),
      nummer: i, navn: 'Familien ' + i, telefon: '2030' + String(5000 + i),
      email: null, dato: idag, tid: '18:00', antal_personer: 2 + (i % 8),
      besked: null, status: i % 5 ? 'bekraeftet' : 'ny',
      intern_note: null, slettet: null, oprettet: idag + 'T09:00:00.000Z',
    });
  }
  d.forespoergsler = [];
  const typer = ['selskab', 'catering', 'baglokale', 'frokost'];
  for (let i = 1; i <= 90; i++) {
    d.forespoergsler.push({
      id: i, lokation_id: 'mosede', reference: 'FO' + String(260900 + i),
      type: typer[i % typer.length], navn: 'Firma ' + i,
      telefon: '2030' + String(6000 + i), email: 'firma' + i + '@eksempel.dk',
      dato: idag, antal_personer: 10 + (i % 50),
      besked: 'Vi vil gerne høre nærmere om mulighederne hos jer.',
      detaljer: { anledning: 'Reception', levering: 'afhentning' },
      status: i % 4 ? 'ny' : 'aftalt', intern_note: null, slettet: null,
      oprettet: idag + 'T07:00:00.000Z',
    });
  }
  return d;
}

async function nySide(browser, d, opt) {
  const ctx = await browser.newContext(opt);
  const p = await ctx.newPage();
  await p.route('**/js/config.js*', (r) => r.fulfill({ status: 200,
    contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD = { url: '', anonKey: '' };" }));
  await p.addInitScript((data) => {
    localStorage.setItem('mosede_data_v1', JSON.stringify(data));
    sessionStorage.setItem('mosede_admin_ok', '1');
  }, d);
  await p.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await p.route('https://fonts.gstatic.com/**', (r) => r.abort());
  return { ctx, p };
}

/* Billedtider under et fuldt rul. ⚠️ requestAnimationFrame og ikke
   et stopur: vi vil vide, hvad BROWSEREN nåede at tegne, ikke hvor
   længe scriptet var om at rulle. */
async function rulOgMaal(p) {
  return p.evaluate(async () => {
    const sc = document.getElementById('sc') || document.scrollingElement;
    sc.style.scrollBehavior = 'auto';
    const tider = [];
    let sidst = performance.now();
    let kør = true;
    function tik(nu) { tider.push(nu - sidst); sidst = nu; if (kør) requestAnimationFrame(tik); }
    requestAnimationFrame(tik);
    for (let y = 0; y < sc.scrollHeight; y += 260) {
      sc.scrollTop = y;
      await new Promise((r) => setTimeout(r, 30));
    }
    kør = false;
    await new Promise((r) => setTimeout(r, 60));
    const t = tider.slice(2).sort((a, b) => a - b);
    return {
      billeder: t.length,
      median: t.length ? +t[Math.floor(t.length / 2)].toFixed(1) : 0,
      p95: t.length ? +t[Math.floor(t.length * 0.95)].toFixed(1) : 0,
      vaerste: t.length ? +t[t.length - 1].toFixed(1) : 0,
      over33: t.filter((x) => x > 33).length,
      hoejde: sc.scrollHeight,
      sidelaens: sc.scrollWidth > sc.clientWidth + 1,
    };
  });
}

const GAEST = ['/index.html', '/m-menukort.html', '/h-catering.html',
  '/h-smorrebrod.html', '/h-selskaber.html', '/h-frokost.html',
  '/h-baglokale.html', '/h-kalender.html', '/m-tapas.html',
  '/historien.html', '/bestil/', '/bord/', '/ved-bordet/?bord=7'];

const FANER = ['p-overblik', 'p-bestillinger', 'p-koekken', 'p-borde',
  'p-kalender', 'p-forespoergsler', 'p-menu', 'p-salg'];

(async () => {
  const d = stordata();
  console.log('STRESSTEST — ' + new Date().toISOString().slice(0, 16).replace('T', ' '));
  console.log('Data: ' + d.menu_varer.length + ' varer i ' + d.menu_kategorier.length
    + ' kategorier · ' + d.borde.length + ' borde · ' + d.bestillinger.length
    + ' bestillinger · ' + d.bordbestillinger.length + ' bookinger · '
    + d.forespoergsler.length + ' forespørgsler\n');

  const b = await chromium.launch({ args: ['--no-sandbox'] });
  let fejlIAlt = 0;

  console.log('GÆSTESIDEN — iPhone 13');
  console.log('side                          ms/median  p95  værste  >33ms  højde  fejl');
  for (const sti of GAEST) {
    const { ctx, p } = await nySide(b, d, { ...devices['iPhone 13'] });
    const fejl = [];
    p.on('pageerror', (e) => fejl.push(e.message));
    /* ⚠️ MIN EGEN SPÆRRING TÆLLER IKKE SOM SIDENS FEJL. Filen her
       afviser fonts.googleapis.com (de holder DOMContentLoaded
       tilbage i ~12 s i prøvemiljøet), og browseren skriver
       ERR_FAILED i konsollen for hver af dem. Første kørsel gav
       nøjagtig ÉN "fejl" på hver af de ti designsider — de ti
       sider, der bruger Google Fonts — og nul på de tre gamle,
       der har skrifterne liggende lokalt. Det var målingens eget
       fodaftryk, ikke en fejl på siden. */
    p.on('console', (m) => {
      const t = m.text();
      if (m.type() !== 'error') return;
      if (/ERR_FAILED|ERR_ABORTED|fonts\.(googleapis|gstatic)/.test(t)) return;
      fejl.push('console: ' + t);
    });
    await p.goto(ROD + sti, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1400);
    await p.evaluate(() => { const i = document.getElementById('intro'); if (i) i.remove(); });
    const m = await rulOgMaal(p);
    fejlIAlt += fejl.length;
    console.log(sti.padEnd(30)
      + String(m.median).padStart(6) + String(m.p95).padStart(6)
      + String(m.vaerste).padStart(8) + String(m.over33).padStart(6)
      + String(m.hoejde).padStart(8) + String(fejl.length).padStart(6)
      + (m.sidelaens ? '   ⚠️ RULLER SIDELÆNS' : ''));
    if (fejl.length) fejl.slice(0, 3).forEach((f) => console.log('      ⚠️ ' + f));
    await ctx.close();
  }

  /* ⚠️ ÉT AF TALLENE SKAL KOMME UDEFRA. Første kørsel gav
     designsiderne en median på 33,3 ms (30 billeder i sekundet),
     mens bestil/, bord/ og ved-bordet/ lå på 16,7 (60). Det kunne
     være designet — eller det kunne være de 262 varer, målingen
     selv lægger på. Derfor køres forsiden EN GANG TIL med
     grunddata: er tallet det samme, er det siden; falder det, er
     det mængden. */
  console.log('\nFORSIDEN MED LIDT DATA (grunddata, til sammenligning)');
  {
    const { ctx, p } = await nySide(b, grunddata(), { ...devices['iPhone 13'] });
    await p.goto(ROD + '/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1400);
    await p.evaluate(() => { const i = document.getElementById('intro'); if (i) i.remove(); });
    const m = await rulOgMaal(p);
    console.log('/index.html (lidt data)'.padEnd(30)
      + String(m.median).padStart(6) + String(m.p95).padStart(6)
      + String(m.vaerste).padStart(8) + String(m.over33).padStart(6)
      + String(m.hoejde).padStart(8));
    await ctx.close();
  }

  console.log('\nPERSONALESIDEN — 1280x900');
  console.log('fane                          tegnetid  ms/median  p95  værste  fejl');
  {
    const { ctx, p } = await nySide(b, d, { viewport: { width: 1280, height: 900 } });
    const fejl = [];
    p.on('pageerror', (e) => fejl.push(e.message));
    await p.goto(ROD + '/admin.html', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    for (const fane of FANER) {
      const foer = fejl.length;
      const t0 = Date.now();
      await p.evaluate((f) => window.Admin && window.Admin.visFane(f), fane);
      await p.waitForTimeout(500);
      const tegnetid = Date.now() - t0;
      const m = await rulOgMaal(p);
      fejlIAlt += fejl.length - foer;
      console.log(fane.padEnd(30) + String(tegnetid).padStart(8) + ' ms'
        + String(m.median).padStart(8) + String(m.p95).padStart(6)
        + String(m.vaerste).padStart(8) + String(fejl.length - foer).padStart(6));
    }
    if (fejl.length) fejl.slice(0, 5).forEach((f) => console.log('   ⚠️ ' + f));
    await ctx.close();
  }

  /* ---- HÅRDHÆNDET BRUG -------------------------------------
     Det, en travl gæst faktisk gør: trykker igen, fordi der ikke
     skete noget hurtigt nok. */
  console.log('\nHÅRDHÆNDET BRUG');
  {
    const { ctx, p } = await nySide(b, d, { ...devices['iPhone 13'] });
    const fejl = [];
    p.on('pageerror', (e) => fejl.push(e.message));
    await p.goto(ROD + '/ved-bordet/?bord=7', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    // 60 hurtige tryk på plusknapper spredt over kortet
    /* ⚠️ SELEKTORERNE ER SIDENS EGNE. Første kørsel ledte efter
       ".plus" og "#kurv-bar" og fandt ingenting — så stod der
       "(ingen kurvbjælke)", som om siden var i stykker. Den
       hedder #bestil-kurv, og plusknappen er button.glass.rund
       inde i .taeller. En måling, der leder efter et element,
       der ikke findes, måler ingenting og siger det som en fejl. */
    const plus = p.locator('.stk-linje .taeller button.glass.rund:has-text("+")');
    const n = Math.min(await plus.count(), 20);
    console.log('plusknapper fundet: ' + n);
    for (let i = 0; i < 60 && n; i++) {
      try { await plus.nth(i % n).click({ timeout: 900, force: true }); } catch (e) { /* videre */ }
    }
    await p.waitForTimeout(400);
    const kurv = await p.locator('#bestil-kurv').first()
      .innerText().catch(() => '(ingen kurvbjælke)');
    console.log('60 hurtige tryk ved bordet → kurven: '
      + kurv.replace(/\s+/g, ' ').trim().slice(0, 70));
    console.log('JS-fejl under hamringen: ' + fejl.length);
    fejlIAlt += fejl.length;
    fejl.slice(0, 3).forEach((f) => console.log('   ⚠️ ' + f));
    await ctx.close();
  }

  /* ---- DATABASEN SVARER IKKE -------------------------------
     Den vigtigste af dem alle: en side, der går i sort, når
     skyen driller, er en side, ingen kan bruge netop den dag. */
  console.log('\nUDEN DATA (tom database)');
  const tom = { indstillinger: {}, menu_kategorier: [], menu_varer: [],
    nyheder: [], kalender: [], bestillinger: [], bordbestillinger: [],
    forespoergsler: [], udlejninger: [], borde: [], dagens_retter: [],
    reservationer: [] };
  for (const sti of GAEST) {
    const { ctx, p } = await nySide(b, tom, { ...devices['iPhone 13'] });
    const fejl = [];
    p.on('pageerror', (e) => fejl.push(e.message));
    await p.goto(ROD + sti, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1200);
    const tekst = await p.locator('body').innerText().catch(() => '');
    const tom_side = tekst.replace(/\s+/g, ' ').trim().length < 40;
    fejlIAlt += fejl.length;
    console.log(sti.padEnd(30) + (fejl.length ? '⚠️ ' + fejl.length + ' JS-fejl'
      : (tom_side ? '⚠️ SIDEN ER TOM' : 'står')));
    fejl.slice(0, 2).forEach((f) => console.log('      ⚠️ ' + f));
    await ctx.close();
  }

  await b.close();
  console.log('\n' + (fejlIAlt ? '⚠️ ' + fejlIAlt + ' JS-fejl i alt'
    : 'INGEN JS-FEJL NOGEN STEDER'));
})();
