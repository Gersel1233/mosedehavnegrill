/* ============================================================
   HVAD LIGGER OVEN PÅ HVAD?                    (10. sep 2026)
   ------------------------------------------------------------
   Kundens ord: *"test at det hele hænger sammen — det kan ikke
   overskride hinanden."*

   `gennemgang.spec.js` måler allerede sidelæns rulning, døde
   links, trykflader og det, der stikker ud over en forælder, som
   KLIPPER. Den her måler det, ingen prøve fangede: noget, der
   ligger OVEN PÅ noget andet.

   To målinger, fordi de fanger hver sin slags:

   A) ELEMENTFROMPOINT — hvad rammer en finger midt på teksten?
      Er svaret et element, der hverken er teksten selv, dens
      forælder eller dens barn, ligger noget i vejen. Det er den
      slags, der gør en knap uklikbar (bundbaren 7/9) eller en
      overskrift ulæselig.

   B) PSEUDO-ELEMENTER — ::before/::after er IKKE hit-testbare,
      så (A) er blind for dem. Musikbanneret 9/9 skrev "septem"
      hvidt og "ber" rødt midt i et ord, fordi en absolut
      placeret ::after uden z-index males OVEN PÅ forælderens
      tekst. Den her sammenligner kasserne geometrisk.

   ⚠️ OG DEN MÅLER PÅ TO BREDDER. Musikbanneret var kun forkert
   på en telefon: på 1280 px er kortet bredt nok til, at gløden
   aldrig når teksten. Summen findes kun ved at måle flere
   skærmbredder — huset har arret tre gange.
   ============================================================ */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROD = process.env.ROD || 'http://127.0.0.1:4175';

/* Siderne læses af MAPPEN, ikke af en liste. En ny side kan
   ikke slippe forbi — samme regel som gennemgangens egen. */
function gaestesider() {
  const rod = path.resolve(__dirname, '..');
  const html = fs.readdirSync(rod)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => !/^google[a-z0-9]+\.html$/.test(f));
  const mapper = ['bestil', 'bord', 'ved-bordet', 'min-bestilling']
    .filter((m) => fs.existsSync(path.join(rod, m, 'index.html')))
    .map((m) => m + '/');
  return html.concat(mapper);
}

async function maalSiden(side, bredde) {
  return side.evaluate(() => {
    const ud = [];
    /* ⚠️ SYNLIGHED SKAL LÆSES OP GENNEM FORÆLDRENE, OG BROWSEREN
       GØR DET BEDST. Første udgave gik selv op ad træet og
       kiggede efter display/opacity — men den så ikke, at et
       element lå i en LUKKET <details>. Resultatet var 41 fund i
       admin, hvor alle sytten faner ligger i DOM'en samtidig, og
       ikke ét af dem kunne ses på et skud. En rapport, hvor
       tallet ikke holder, læses ikke til ende — det er arret fra
       tilgængelighedsmåleren 5/9 (190 fund blev til 20).

       `checkVisibility` svarer på præcis det spørgsmål og tager
       forfædre, content-visibility og opacity med. */
    const synlig = (e) => {
      if (typeof e.checkVisibility === 'function') {
        return e.checkVisibility({ contentVisibilityAuto: true,
          opacityProperty: true, visibilityProperty: true });
      }
      const r = e.getBoundingClientRect();
      return !!(r.width && r.height);
    };

    /* ---- A) NOGET LIGGER OVEN PÅ TEKSTEN ---- */
    const tekster = [...document.querySelectorAll('h1,h2,h3,h4,p,a,button,label,li,span')]
      .filter((e) => e.children.length === 0
        && e.textContent.trim().length > 2
        && synlig(e));

    for (const e of tekster) {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) continue;
      const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!t) continue;
      if (t === e || e.contains(t) || t.contains(e)) continue;
      /* Designets glans ligger med vilje over sin egen knap, og
         et label dækker sit eget felt — begge er effekten. */
      if (t.classList && t.classList.contains('sheen')) continue;
      if (t.tagName === 'LABEL' && t.contains(e)) continue;
      /* ⚠️ KAN DET RULLES FRI?  Det er hele forskellen mellem en
         fejl og en flydende knap, der gør sit arbejde. En pille,
         der svæver over noget midt på siden, dækker det kun,
         mens man står dér — ruller man, bliver det frit. Er det
         STADIG dækket, når elementet står midt på skærmen, kan
         det aldrig blive frit, og DÉT er fejlen (footerens
         sidste linje, målt 10/9: dækket med 14 px uden mere at
         rulle).

         Rulleroden er #sc på en computer og dokumentet på en
         telefon — arret fra 5/9. */
      /* ⚠️ ET ELEMENT I EN INDLEJRET RULLER KAN IKKE CENTRERES
         HERFRA, og så måler prøven ingenting. Admins sidemenu er
         sin egen ruller (fjorten punkter à 46 px er 644, og en
         bærbar har ikke plads til dem), så ikonerne dernede ligger
         uden for skærmen — elementFromPoint svarer null, og
         resultatet blev fund, der ikke kunne ses på et skud:
         ikonet står på x=208 og mærket på x=336, 128 px fra
         hinanden. Målt 10/9. */
      let indlejret = null, f = e.parentElement;
      while (f && f !== document.body) {
        const fs = getComputedStyle(f);
        if (f.id !== 'sc' && (fs.overflowY === 'auto' || fs.overflowY === 'scroll')
            && f.scrollHeight > f.clientHeight + 4) { indlejret = f; break; }
        f = f.parentElement;
      }
      if (indlejret) continue;

      const sc = document.getElementById('sc');
      const rod = sc && getComputedStyle(sc).overflowY !== 'visible'
        ? sc : document.scrollingElement;
      const foer = rod.scrollTop;
      rod.style.scrollBehavior = 'auto';
      rod.scrollTop = foer + (r.top + r.height / 2) - innerHeight / 2;
      const r2 = e.getBoundingClientRect();
      const t2 = document.elementFromPoint(r2.left + r2.width / 2, r2.top + r2.height / 2);
      rod.scrollTop = foer;
      const stadig = t2 && t2 !== e && !e.contains(t2) && !t2.contains(e)
        && !(t2.classList && t2.classList.contains('sheen'));
      if (!stadig) continue;   // kunne rulles fri — ikke en fejl

      ud.push({
        slags: 'oven paa (kan IKKE rulles fri)',
        tekst: e.textContent.trim().slice(0, 44),
        hvem: e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0],
        daekket_af: t2.tagName.toLowerCase() + '.' + String(t2.className).split(' ').slice(0, 2).join('.'),
      });
    }

    /* ---- B) ET PSEUDO-ELEMENT MALER OVEN PÅ TEKSTEN ---- */
    for (const el of document.querySelectorAll('*')) {
      if (!synlig(el)) continue;
      for (const pe of ['::before', '::after']) {
        const c = getComputedStyle(el, pe);
        if (c.content === 'none' || c.position !== 'absolute') continue;
        const harBg = c.backgroundImage !== 'none'
          || (c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== 'transparent');
        if (!harBg) continue;
        /* Et negativt z-index ligger bevidst bagved. */
        if (c.zIndex !== 'auto' && Number(c.zIndex) < 0) continue;
        /* ⚠️ DESIGNETS GLASGLANS ER IKKE ET OVERLAP. `.g::after`
           er den indvendige lysstribe på en liquid glass-knap —
           en næsten gennemsigtig hvid gradient, der ER effekten,
           præcis som `.sheen` er det. Uden undtagelsen råber
           værktøjet på hver eneste knap, og en rapport, hvor en
           fjerdedel er støj, læses ikke til ende (arret fra
           Googles kvittering 9/9). Grunden står her, så
           undtagelsen ikke bare vokser. */
        if (el.classList.contains('g') && pe === '::after') continue;

        const er = el.getBoundingClientRect();
        const w = parseFloat(c.width), h = parseFloat(c.height);
        if (!isFinite(w) || !isFinite(h) || !w || !h) continue;
        const hoejre = c.right !== 'auto'
          ? er.right - parseFloat(c.right) : er.left + parseFloat(c.left || 0) + w;
        const venstre = hoejre - w;
        const top = c.top !== 'auto'
          ? er.top + parseFloat(c.top) : er.bottom - parseFloat(c.bottom || 0) - h;
        const bund = top + h;

        for (const n of el.querySelectorAll('h1,h2,h3,h4,p,a,button,span,li')) {
          if (n.children.length || !n.textContent.trim()) continue;
          /* ⚠️ ET POSITIONERET BARN MALES EFTER EN ::before — OGSÅ
             UDEN z-index. Begge hører til de positionerede
             efterkommere, og dér afgør TRÆETS RÆKKEFØLGE, hvem
             der ligger øverst; ::before kommer først. Første
             udgave krævede et z-index for at springe barnet
             over, og så råbte værktøjet på hvert eneste
             tælle-mærke: cirklen er en ::before, og tallet er et
             positioneret span OVEN PÅ den. Målt: tallet kan ses
             på skuddet. */
          let egen = false, k = n;
          while (k && k !== el) {
            if (getComputedStyle(k).position !== 'static') { egen = true; break; }
            k = k.parentElement;
          }
          if (egen) continue;

          const q = n.getBoundingClientRect();
          if (!q.width || !q.height) continue;
          const rammer = !(q.right < venstre || q.left > hoejre
            || q.bottom < top || q.top > bund);
          if (!rammer) continue;
          ud.push({
            slags: 'pseudo oven paa',
            tekst: n.textContent.trim().slice(0, 44),
            hvem: el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + pe,
            daekket_af: (c.backgroundImage !== 'none' ? c.backgroundImage : c.backgroundColor).slice(0, 40),
          });
        }
      }
    }
    return ud;
  });
}

/* ⚠️ ADMIN MÅLES MED ARBEJDE PÅ FANERNE. En tom fane har ingen
   kort, ingen knapper og intet at ligge oven på — den ville
   bestå på ingenting. Fiksturet er husets eget (tests/hjaelp.js),
   så målingen ikke skrider fra prøvernes virkelighed, og
   statusserne er databasens lovlige ord. */
function arbejdsdag() {
  const { grunddata } = require('../tests/hjaelp.js');
  const d = grunddata();
  const iso = new Date().toISOString().slice(0, 10);
  d.bestillinger = [{
    id: 1, nummer: 44, reference: 'SM-A', lokation_id: 'mosede', navn: 'lone hansen',
    telefon: '20304050', hent_dato: iso, hent_tid: '12:30',
    linjer: [{ navn: 'Rejemad', antal: 2, pris: 85 }], fyld: [], antal: 2,
    status: 'ny', hvordan: 'afhentning',
  }, {
    id: 2, nummer: 45, reference: 'SM-B', lokation_id: 'mosede', navn: 'mikkel',
    telefon: null, hent_dato: iso, hent_tid: '12:05',
    linjer: [{ navn: 'Softice, stor', antal: 2, pris: 45 }], fyld: [], antal: 2,
    status: 'tilberedes', hvordan: 'spis_her', bord_nummer: '7',
  }];
  d.borde = [{ id: 7, lokation_id: 'mosede', nummer: '7', aktiv: true, har_kode: false }];
  d.bordbestillinger = [{ id: 1, nummer: 3, reference: 'BO-A', lokation_id: 'mosede',
    navn: 'familien nielsen', telefon: '26262626', dato: iso, tid: '18:00',
    antal_personer: 6, status: 'ny' }];
  d.forespoergsler = [{ id: 1, nummer: 7, reference: 'FO-A', lokation_id: 'mosede',
    type: 'selskab', navn: 'susanne dahl', telefon: '28282828', email: 's@eksempel.dk',
    dato: null, antal_personer: 40, status: 'kontaktet',
    besked: 'Sølvbryllup, vi er fleksible med tidspunktet.' }];
  d.udlejninger = [{ id: 1, nummer: 2, reference: 'UD-A', lokation_id: 'mosede',
    navn: 'greve sejlklub', telefon: '30303030', dato: iso, antal_personer: 30,
    status: 'ny' }];
  d.kalender = (d.kalender || []).concat([{ id: 900, lokation_id: 'mosede',
    type: 'arrangement', titel: 'Fællesspisning', dato: iso, offentlig: true,
    tilmelding: true, pladser: 40, start_kl: '18:00' }]);
  d.reservationer = [{ id: 1, nummer: 5, lokation_id: 'mosede', kalender_id: 900,
    reference: 'RE-A', navn: 'anna vind', telefon: '23456789', antal_personer: 4,
    status: 'ny', slettet: null }];
  d.logbog = [{ id: 1, lokation_id: 'mosede', tabel: 'bestillinger', raekke_id: 1,
    reference: 'SM-A', navn: 'lone hansen', hvad: 'rettet', hvem: 'chef@eksempel.dk',
    hvornaar: new Date().toISOString(), foer: { status: 'ny' }, efter: { status: 'afhentet' } }];
  return d;
}

async function maalAdmin(b, navn, opt) {
  const ctx = await b.newContext(opt);
  const side = await ctx.newPage();
  await side.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await side.route('**/js/config.js*', (r) => r.fulfill({ status: 200,
    contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD = { url: '', anonKey: '', lokation: 'mosede' };" }));
  await side.addInitScript((d) => {
    localStorage.setItem('mosede_data_v1', JSON.stringify(d));
    sessionStorage.setItem('mosede_admin', '1');
  }, arbejdsdag());
  await side.goto(ROD + '/admin.html', { waitUntil: 'domcontentloaded' });
  await side.waitForTimeout(900);
  await side.evaluate(() => {
    const f = [...document.querySelectorAll('input')];
    const m = f.find((x) => x.type === 'email'), k = f.find((x) => x.type === 'password');
    if (m && k) {
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(m, 'proev@lokalt.test'); m.dispatchEvent(new Event('input', { bubbles: true }));
      s.call(k, 'proev'); k.dispatchEvent(new Event('input', { bubbles: true }));
      [...document.querySelectorAll('button')]
        .find((b2) => /log ind/i.test(b2.textContent)).click();
    }
  });
  await side.waitForTimeout(1200);

  const faner = await side.evaluate(() => [...document.querySelectorAll('.faner [data-panel]')]
    .map((b2) => ({ id: b2.getAttribute('data-panel'),
                    navn: b2.textContent.replace(/\s+/g, ' ').trim().replace(/\s*\d+$/, '') })));
  let fund = 0;
  for (const f of faner) {
    await side.evaluate((id) => {
      const k = document.querySelector('.faner [data-panel="' + id + '"]');
      if (k) k.click();
    }, f.id);
    await side.waitForTimeout(450);
    const r = await maalSiden(side);
    if (r.length) {
      fund += r.length;
      console.log('\n' + navn.toUpperCase() + ' · ADMIN · ' + f.navn);
      r.forEach((x) => console.log('   ' + x.slags + ': "' + x.tekst
        + '"  i ' + x.hvem + '  <- ' + x.daekket_af));
    }
  }
  await ctx.close();
  return fund;
}

(async () => {
  const b = await chromium.launch();
  const profiler = [
    ['telefon', { ...devices['iPhone 13'] }],
    ['computer', { viewport: { width: 1280, height: 900 } }],
  ];
  let fund = 0;

  for (const [navn, opt] of profiler) {
    const ctx = await b.newContext(opt);
    const side = await ctx.newPage();
    /* Google Fonts er spærret her, og en ventende skrift flytter
       tekst. Skrifterne ligger lokalt siden 5/9. */
    await side.route('https://fonts.googleapis.com/**', (r) => r.abort());

    for (const s of gaestesider()) {
      try {
        await side.goto(ROD + '/' + s, { waitUntil: 'domcontentloaded' });
        await side.waitForTimeout(1400);
        /* Introen dækker forsiden ved hvert besøg, og .rev står
           på opacity 0, til man ruller. Begge dele skal væk,
           ellers måler vi et lag og ikke siden. */
        await side.evaluate(() => {
          const i = document.getElementById('intro'); if (i) i.remove();
          document.querySelectorAll('.rev').forEach((e) => e.classList.add('in'));
        });
        await side.waitForTimeout(300);
        const r = await maalSiden(side, opt.viewport ? opt.viewport.width : 390);
        if (r.length) {
          fund += r.length;
          console.log('\n' + navn.toUpperCase() + ' · /' + s);
          r.forEach((x) => console.log('   ' + x.slags + ': "' + x.tekst
            + '"  i ' + x.hvem + '  <- ' + x.daekket_af));
        }
      } catch (e) {
        console.log('  ' + navn + ' /' + s + ': kunne ikke måles — ' + e.message.slice(0, 70));
      }
    }
    await ctx.close();
  }

  for (const [navn, opt] of profiler) {
    fund += await maalAdmin(b, navn, opt);
  }

  await b.close();
  console.log('\n' + (fund ? fund + ' fund' : 'INTET LIGGER OVEN PÅ NOGET'));
})();
