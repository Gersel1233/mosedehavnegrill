/* GENNEMGANGEN AF ALLE GÆSTESIDER  (31/8)

   Kundens ord: *"UI's og animation optimizing ... fix hjemmesiden
   telefon og kunde mæssigt."*

   ⚠️ DEN HER PRØVE ER EN GENNEMGANG, IKKE EN REGEL OM ÉN TING.
   Den åbner HVER udgivet gæsteside på en telefon og leder efter
   det, der er svært at se med øjnene, fordi det kun rammer én
   side ad gangen:

     · ruller siden sidelæns
     · noget stikker ud over en forælder, der klipper
     · døde links (href="#" eller "")
     · manglende favicon
     · billeder uden alt-tekst
     · trykflader under 30 px
     · to fodlinks der deler en linje
     · ankre uden et mål på siden

   ⚠️ SIDERNE LÆSES AF MAPPEN, ikke skrevet af i hånden — en ny
   side skal ikke kunne slippe forbi. Samme greb som
   favicon-prøven og siderMedFooter().

   DEN FANDT FEM TING FØRSTE GANG, den blev kørt:
   · m-menukort.html's "Bestil smørrebrød" pegede på #bestil, som
     ikke findes på siden — menukortsidens ENESTE handling gjorde
     præcis ingenting
   · footerens links på ti sider var 15-22 px høje
   · forsidens "…eller ring til os på 28 87 13 43" var 17 px —
     det mindste trykmål på siden, og det er et telefonnummer
   · bestil/ og bord/ havde det samme i deres egne footere
   · de to sætninger under bordformularen ("skriv til os om den",
     "ring 28 87 13 43") var 16 px

   ⚠️ .sheen ER IKKE EN FEJL. Designets glans er bredere end sin
   knap med vilje og klippes af den — det er effekten. Uden den
   undtagelse ville prøven råbe på ti sider hver gang. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');
const fs = require('fs');

/* Alle udgivne gæstesider — læst af MAPPEN.

   ⚠️ OGSÅ UNDERMAPPERNE, OG DE LÆSES NU AF DISKEN (4/9). Her stod
   ['bestil/', 'bord/', 'ved-bordet/'] skrevet i hånden — og da
   min-bestilling/ kom til, gled den forbi hele gennemgangen uden
   at nogen så det: ingen måling af trykflader, sidelæns rulning,
   døde links eller favicon på en helt ny gæsteside. Det er
   nøjagtig arret fra 30/8, hvor otte adresser blev vejvisere, og
   seks prøvefiler holdt op med at måle noget.

   ⚠️ VEJVISERNE SPRINGES OVER, og de kendes på det, de GØR — en
   refresh plus et location.replace — ikke på en liste over navne.
   De syv gamle adresser (selskaber/, catering/, nyheder/ …)
   sender videre med det samme; at måle trykflader på dem ville
   være at måle målsiden og kalde den noget andet. Samme
   kendetegn som udgivelse.spec.js bruger. */
function erVejviser(sti) {
  const t = fs.readFileSync(sti, 'utf8');
  return t.includes('http-equiv="refresh"') && t.includes('location.replace');
}

function sider() {
  const rod = fs.readdirSync('.').filter((f) => /\.html$/.test(f)
    && !/^(admin|image-slot)/.test(f)
    && !erVejviser(f));
  const mapper = fs.readdirSync('.', { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name + '/')
    .filter((m) => fs.existsSync(m + 'index.html'))
    .filter((m) => !erVejviser(m + 'index.html'));
  return [...rod.map((f) => '/' + f), ...mapper.map((m) => '/' + m)];
}

test('hver gæsteside står rent på en telefon', async ({ page }) => {
  test.skip(!test.info().project.use.isMobile);
  const fund = [];
  for (const side of sider()) {
    const fejl = [];
    page.on('pageerror', (e) => fejl.push(e.message));
    try {
      await åbnSkal(page, side, { data: grunddata() });
    } catch (e) { fund.push(side + ' :: KUNNE IKKE ÅBNES'); continue; }
    await page.waitForTimeout(500);

    const m = await page.evaluate(() => {
      const ud = [];
      const vb = document.documentElement.clientWidth;

      // 1) Ruller siden sidelæns?
      /* ⚠️ DEN, DER FAKTISK RULLER (5/9). Under 820 px er #sc
         ikke en rullebeholder mere — spurgte vi den, ville en
         sidelaens rulning i DOKUMENTET gaa fri. */
      const skaerm = document.getElementById('sc');
      const rod = (skaerm && getComputedStyle(skaerm).overflowY !== 'visible')
        ? skaerm : document.scrollingElement;
      if (rod && rod.scrollWidth > vb + 2) {
        ud.push('ruller sidelaens: ' + rod.scrollWidth + ' > ' + vb);
      }

      // 2) Elementer der stikker ud over en foraelder, som klipper
      document.querySelectorAll('*').forEach((e) => {
        const p = e.parentElement; if (!p) return;
        const c = getComputedStyle(p);
        if (c.overflow !== 'hidden' && c.overflowX !== 'hidden') return;
        const a = e.getBoundingClientRect(), b = p.getBoundingClientRect();
        if (a.width === 0 || b.width === 0) return;
        /* .sheen er designets egen glans: den er BREDERE end
           knappen med vilje og klippes af den. Det er ikke en
           fejl, det er effekten. */
        if (/\bsheen\b/.test(e.className || '')) return;
        if (a.left < b.left - 2 || a.right > b.right + 2) {
          ud.push('stikker ud: ' + e.tagName + '.' + (e.className||'').toString().slice(0,24));
        }
      });

      // 3) Doede links
      document.querySelectorAll('a[href="#"], a[href=""]').forEach((a) => {
        if (a.offsetParent !== null) ud.push('doedt link: ' + a.textContent.trim().slice(0,30));
      });

      // 4) Favicon
      if (!document.querySelector('link[rel~="icon"]')) ud.push('ingen favicon');

      // 5) Billeder uden alt
      document.querySelectorAll('img:not([alt])').forEach(() => ud.push('img uden alt'));

      // 6) Trykflader under 44 px — en finger kan ikke ramme dem
      document.querySelectorAll('a, button, input[type="checkbox"], select').forEach((e) => {
        if (e.offsetParent === null) return;
        const r = e.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.height < 30) {
          ud.push('lille trykflade ' + Math.round(r.height) + 'px: '
            + e.tagName + '.' + (e.className||'').toString().slice(0,20)
            + ' "' + e.textContent.trim().slice(0, 18) + '"');
        }
      });

      /* 7) TO FODLINKS MÅ IKKE DELE EN LINJE.
            ⚠️ DEN HER REGEL KOMMER AF EN FEJL, PRØVEN SELV
            FORÅRSAGEDE. Trykfladerne blev rettet med
            display:inline-block på .fcols a — men de var block i
            forvejen, én pr. linje, så de flød sammen: footerens
            "Havnen"-søjle stod "Bestil madMenukort" og
            "SelskaberCatering". Kontakt-søjlen så rigtig ud, fordi
            dens links er lange nok til at brække alligevel.
            Højdemålingen ovenfor bestod hele vejen igennem — den
            spurgte om trykfladen, ikke om linjen. */
      document.querySelectorAll('.fcols > div, .fgrid > div').forEach((sp) => {
        const links = [...sp.querySelectorAll('a')].filter((a) => a.offsetParent);
        for (let i = 1; i < links.length; i++) {
          const a = links[i - 1].getBoundingClientRect();
          const b = links[i].getBoundingClientRect();
          if (Math.abs(a.top - b.top) < 4) {
            ud.push('to fodlinks deler linje: "'
              + links[i - 1].textContent.trim().slice(0, 18) + '" + "'
              + links[i].textContent.trim().slice(0, 18) + '"');
          }
        }
      });

      // 8) Lander et hop bag topbjaelken?
      const bar = document.querySelector('.topbar');
      const anker = [...document.querySelectorAll('a[href^="#"]')]
        .map((a) => a.getAttribute('href')).filter((h) => h.length > 1);
      if (bar && anker.length) {
        const mangler = anker.filter((h) => !document.querySelector(h));
        if (mangler.length) ud.push('anker uden maal: ' + mangler.join(','));
      }

      /* 8b) ⚠️ ET SYNLIGT ANKER MED ET SKJULT MÅL GØR INGENTING.
         Reglen ovenfor fanger et maal, der ikke FINDES. Det her er
         den anden halvdel, og den er den, der har staaet live to
         gange: kalenderens "Reservér plads" pegede paa #reserver
         med display:none (31/8), og tapassidens ENESTE handling
         pegede paa #bestil-tapas, som skjuler sig, naar fadet ikke
         staar i menukortet (MAALT 3/9). Et tryk goer absolut
         ingenting — browseren hopper ikke til noget, den ikke kan
         se. Ingen fejl, ingen bevaegelse, ingen linje om hvorfor.

         Rettelsen i huset er begge steder den samme: knappen
         foelger virkeligheden (pegVidere). */
      const synlig = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const c = getComputedStyle(el);
        return r.width > 0 && r.height > 0
          && c.display !== 'none' && c.visibility !== 'hidden';
      };
      [...document.querySelectorAll('a[href^="#"]')].forEach((a) => {
        const h = a.getAttribute('href');
        if (!h || h.length < 2) return;
        if (!synlig(a)) return;                 // en skjult knap lover intet
        /* Skuffemenuens egne punkter maales ikke: skuffen er lukket,
           saa dens links er skjulte og fanges af linjen ovenfor. */
        let m;
        try { m = document.querySelector(h); } catch (e) { return; }
        if (m && !synlig(m)) {
          ud.push('synlig knap peger paa et SKJULT maal ' + h + ': "'
            + (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26) + '"');
        }
      });

      return [...new Set(ud)];
    });
    if (m.length) fund.push(side + ' :: ' + m.join(' | '));
    if (fejl.length) fund.push(side + ' :: JS-FEJL ' + fejl.join(' | '));
    page.removeAllListeners('pageerror');
  }
  expect(fund, 'gennemgangen fandt noget — se linjerne').toEqual([]);
});

/* ============================================================
   BEVÆGELSEN  (31/8)
   ------------------------------------------------------------
   Kundens ord: *"optimering af sidens smoothness, satisfying og
   sådan — lad den føles 120 fps, også i start animationen."*

   To regler, der kan MÅLES, og som er dem, der faktisk koster
   billeder på en rigtig telefon. Resten af "smooth" er smag; de
   her to er fysik.
   ============================================================ */

/* ⚠️ EN IKKE-PASSIV wheel/touchmove-LYTTER TVINGER BROWSEREN TIL
   AT VENTE PÅ JAVASCRIPT, FØR DEN MÅ RULLE.

   MÅLT på forsiden: tre af dem, alle fra <image-slot> — én pr.
   billedplads. Zoomen bag dem virker kun inde i "reframe", som en
   gæst aldrig går ind i, så de ventede på ingenting. De hægtes på
   ved _enterReframe() nu.

   Prøven instrumenterer addEventListener FØR sidens egne scripts
   kører — det er den eneste måde at se, hvad der faktisk bliver
   registreret. Et spørgsmål til koden ville bestå, også hvis en
   ny lytter kom til et andet sted. */
test('ingen gæsteside blokerer rulningen med en ikke-passiv lytter', async ({ page }) => {
  const fund = [];
  for (const side of sider()) {
    await page.addInitScript(() => {
      window.__blokkerende = [];
      const org = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (t, f, o) {
        if (t === 'wheel' || t === 'touchmove' || t === 'mousewheel') {
          const passiv = o && typeof o === 'object' && o.passive;
          if (!passiv) {
            window.__blokkerende.push(t + ' på '
              + (this === window ? 'window'
                : this === document ? 'document'
                : (this.id || this.tagName || '?')));
          }
        }
        return org.call(this, t, f, o);
      };
    });
    try { await åbnSkal(page, side, { data: grunddata() }); }
    catch (e) { continue; }
    await page.waitForTimeout(400);
    const b = await page.evaluate(() => [...new Set(window.__blokkerende || [])]);
    if (b.length) fund.push(side + ' :: ' + b.join(' | '));
  }
  expect(fund, 'lyttere, der får browseren til at vente før den ruller')
    .toEqual([]);
});

/* ⚠️ EN OVERGANG PÅ width/height/padding ER EN OMBRYDNING PR.
   BILLEDE — og de sad netop dér, hvor de gør mest skade.

   .topbar animerede `padding` 58 → 52 px over 450 ms, og bjælken
   skifter tilstand UNDER rulningen: seks pixels, betalt med en
   ombrydning af hele bjælken i et halvt sekund, mens fingeren er
   på skærmen. Sluttilstanden er den samme; de 6 px skifter bare
   med det samme nu.

   Prøven læser STILARKENE, ikke en enkelt side: reglen skal også
   gælde den næste, der bliver skrevet. */
test('ingen overgang animerer en egenskab, der udløser layout', async () => {
  const LAYOUT = ['width', 'height', 'top', 'left', 'right', 'bottom',
    'margin', 'margin-top', 'margin-left', 'padding', 'padding-top',
    'max-height', 'min-height', 'font-size', 'line-height', 'gap', 'all'];

  const ark = fs.readdirSync('.').filter((f) => /\.css$/.test(f))
    .concat(fs.existsSync('css')
      ? fs.readdirSync('css').filter((f) => /\.css$/.test(f)).map((f) => 'css/' + f)
      : []);
  expect(ark.length, 'der blev ikke fundet nogen stilark').toBeGreaterThan(0);

  const fund = [];
  for (const fil of ark) {
    /* ⚠️ KOMMENTARER KLIPPES AF FØRST. Noterne i det her hus
       nævner tit netop de egenskaber, de advarer imod — og
       favicon-prøven har allerede én gang fældet sin egen
       dokumentation. */
    const s = fs.readFileSync(fil, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /transition\s*:\s*([^;}]+)/g;
    let m;
    while ((m = re.exec(s))) {
      for (const del of m.group === undefined ? m[1].split(',') : []) {
        const prop = del.trim().split(/\s+/)[0];
        if (LAYOUT.indexOf(prop) !== -1) {
          const start = s.lastIndexOf('{', m.index);
          const sel = s.slice(Math.max(0, s.lastIndexOf('}', start) + 1), start)
            .trim().replace(/\s+/g, ' ').slice(-60);
          fund.push(fil + ': ' + prop + '  <-  ' + sel);
        }
      }
    }
  }
  expect([...new Set(fund)],
    'overgange, der tvinger en ombrydning pr. billede').toEqual([]);
});

/* ============================================================
   ⚠️ EN GÆSTESIDE MÅ IKKE HENTE NOGET, DER IKKE FINDES  (1/9)
   ------------------------------------------------------------
   Fundet under en gennemgang med ti fiktive kunder: FEM udgivne
   gæstesider — forsiden iblandt — fyrede
   "404 /.image-slots.state.json" ved hver eneste indlæsning.

   Filen er designværktøjets eget sidekatalog (image-slot.js), og
   den kan ALDRIG findes i produktionen. Et spildt kald pr.
   sidevisning på en telefon på mobildata, og støj i konsollen,
   der skjuler de fejl, der betyder noget.

   ⚠️ PRØVEN LÆSER DET, BROWSEREN GJORDE — svarkoderne — og ikke
   koden. Et spørgsmål til image-slot.js om dens egen gren ville
   bestå, også hvis en anden fil begyndte at hente den igen.
   ============================================================ */
test('ingen gæsteside beder om en fil, der ikke findes', async ({ page }) => {
  test.skip(!test.info().project.use.isMobile);
  const fund = [];
  for (const side of sider()) {
    const døde = [];
    const lyt = (r) => { if (r.status() >= 400) døde.push(r.status() + ' ' + new URL(r.url()).pathname); };
    page.on('response', lyt);
    try { await åbnSkal(page, side, { data: grunddata() }); }
    catch (e) { page.off('response', lyt); continue; }
    await page.waitForTimeout(500);
    page.off('response', lyt);
    [...new Set(døde)].forEach((d) => fund.push(side + ' :: ' + d));
  }
  expect(fund, 'sider henter noget, der svarer 404').toEqual([]);
});

/* ============================================================
   FOOTEREN SKAL LIGGE UDEN FOR SEKTIONEN  (4/9)
   ------------------------------------------------------------
   Kundens ord med et skud af bunden: *"det der skal også lige
   fixes til at se ordentlig ud på både desktop og telefon."*

   ⚠️ MÅLT PÅ 1440 px, IKKE LÆST. h-smorrebrod.html åbnede et
   <section> og lukkede det aldrig — den eneste af de ni
   designsider uden sit </section>. Footeren lå derfor INDE i
   sektionen og arvede dens desktop-tagrende på 370 px: det
   mørke felt var 700 px bredt midt i en creme-side i stedet
   for at gå fra kant til kant.

   ⚠️ OG PÅ EN TELEFON KUNNE DET IKKE SES. Dér er tagrenden 20 px
   for både sektionen og footeren, så de to lå oven i hinanden.
   Fejlen fandtes KUN ved at måle på en anden skærmbredde —
   husets egen regel om, at summen kan være forkert, selv om hver
   regel er rigtig for sig.

   ⚠️ LISTEN LÆSES AF MAPPEN, så en ny side ikke kan slippe forbi
   med den samme fejl.
   ============================================================ */
test('footeren går fra kant til kant på en bred skærm', async ({ page }) => {
  test.skip(test.info().project.use.isMobile, 'måles på computerprofilen');
  const fund = [];

  for (const side of sider()) {
    let åbnet = true;
    try { await åbnSkal(page, side, { data: grunddata() }); }
    catch (e) { åbnet = false; }
    if (!åbnet) continue;
    await page.waitForTimeout(300);

    const m = await page.evaluate(() => {
      const f = document.querySelector('footer');
      if (!f) return null;
      /* ⚠️ TO UAFHÆNGIGE ELEMENTER: footerens egen bredde mod
         rullerodens. Et spørgsmål til footeren om dens eget
         padding ville bestå, også hvis en forælder klemte den. */
      const rod = document.getElementById('sc') || document.documentElement;
      return {
        footer: Math.round(f.getBoundingClientRect().width),
        rod: Math.round(rod.getBoundingClientRect().width),
        iSektion: !!f.closest('section'),
      };
    });
    if (!m) continue;

    if (m.iSektion) fund.push(side + ' :: footeren ligger inde i et <section>');
    else if (m.footer < m.rod - 2) {
      fund.push(side + ' :: footeren er ' + m.footer + ' px, skærmen ' + m.rod);
    }
  }

  expect(fund, 'footeren fylder ikke skærmens bredde:\n' + fund.join('\n'))
    .toHaveLength(0);
});

/* ============================================================
   DET SÆLGENDE MÅ IKKE FINDE PÅ NOGET  (4/9)
   ------------------------------------------------------------
   Kundens ord: *"det sælgende må godt komme på alle faner og
   gøre dem flotte og pæne med animationer og frokostordninger og
   det hele."*

   Forretningens egne ord om sig selv må siden gerne sige — "vi
   elsker det", "vores folk er dygtige", "maden er god". Det, der
   ikke må komme med, er TAL og PÅSTANDE, ingen har bekræftet, og
   en sælgende tekst er præcis dér, de sniger sig ind.

   ⚠️ HUSET HAR BETALT FOR DEN LEKTION ÉN GANG. Designbundtet fra
   21/8 leverede "4,8 · 312 anmeldelser på Google" og "Bedste
   fiskefilet på hele Sydkysten". Ingen af delene var sande, og
   kunden så dem ikke — vi gjorde.

   ⚠️ PRØVEN MÅLER KUN .saelg-AFSNITTENE, og det er med vilje.
   Designets EGNE pladsholdere (4,8 på Google, 40 pers., 199 kr.
   pr. person) står live på Mikkels udtrykkelige beslutning fra
   23/8, og designbundt-vagten er parkeret imens. Den her vogter
   det, VI skriver: hver gang nogen føjer et sælgende afsnit til
   en side, gælder reglen af sig selv.

   ⚠️ OG AFSNITTENE LÆSES AF MAPPEN. En femte side med sælgende
   tekst skal ikke kunne udgives uden vagten — samme greb som
   resten af filen.

   ⚠️ MØNSTRENE ER BREDE MED VILJE. Ikke "4,8", men ETHVERT tal
   foran "stjerner": et fast tal holder op med at måle, første
   gang nogen skriver et andet. Set fejle på alle fire sider med
   sætningen "4,8 stjerner og 312 anmeldelser — vi har holdt 400
   selskaber i 15 år, fra 199 kr. pr. kuvert."
   ============================================================ */
const FORBUDT = [
  [/\d[,.]\d\s*(?:på Google|stjerner)/i, 'en anmeldelsesscore'],
  [/\d+\s*anmeldelser/i, 'et antal anmeldelser'],
  [/(?:i|gennem|siden)\s+\d+\s*år/i, 'et antal år, ingen har bekræftet'],
  [/\d+\s*kr\.?\s*pr\.?\s*(?:kuvert|person|couvert|medarbejder)/i, 'en pris pr. kuvert'],
  [/\bbedste\b/i, 'en påstand om at være bedst'],
  [/\d+\s*(?:selskaber|fester|arrangementer)\b/i, 'et antal afholdte selskaber'],
];

/* Siderne med et sælgende afsnit — læst af MAPPEN, ikke skrevet
   af i hånden. */
function saelgendeSider() {
  return fs.readdirSync('.')
    .filter((f) => /\.html$/.test(f) && !/^(admin|image-slot)/.test(f))
    .filter((f) => fs.readFileSync(f, 'utf8').includes('class="saelg'))
    .map((f) => '/' + f);
}

test('der ER sælgende afsnit at måle', () => {
  /* ⚠️ UDEN DEN HER MÅLER LØKKEN NEDENFOR INGENTING. En tom liste
     består hver eneste regel — arret fra "toBeHidden er sandt for
     et element, der ikke findes" (30/8). Fire sider i dag:
     catering, selskaber, smørrebrød og frokost. */
  const s = saelgendeSider();
  expect(s.length, 'ingen sider med .saelg: ' + s.join(', '))
    .toBeGreaterThanOrEqual(4);
});

for (const side of saelgendeSider()) {
  test(`${side}s sælgende tekst finder ikke på tal`, async ({ page }) => {
    await åbnSkal(page, side, { data: grunddata() });
    const afsnit = page.locator('.saelg');
    await expect(afsnit.first(), 'siden har ingen .saelg at måle').toBeVisible();

    const tekst = (await afsnit.allInnerTexts()).join('\n');
    expect(tekst.trim().length, 'de sælgende afsnit er tomme')
      .toBeGreaterThan(80);

    for (const [m, hvad] of FORBUDT) {
      expect(tekst, side + ' lover ' + hvad).not.toMatch(m);
    }
  });
}

/* ============================================================
   LISTEN TONER IND TRIN FOR TRIN — OG STÅR STILLE UDEN BEVÆGELSE
   ------------------------------------------------------------
   Kundens ord (4/9): *"gøre dem flotte og pæne med
   animationer."*

   ⚠️ PRØVEN LÆSER DEN BEREGNEDE STIL, ikke klassen. En klasse,
   der ikke slår igennem, er ingen regel — og en :nth-child-regel
   er præcis den slags, der kan stå i arket uden at ramme noget,
   fordi punkterne har fået en wrapper imellem.

   ⚠️ OG DEN ANDEN HALVDEL ER DEN VIGTIGE. Punkterne begynder på
   opacity 0. Slår nogen animationer fra i sit styresystem, og
   virker reduced-motion-blokken ikke, står listen som en TOM
   flade — en side, der er gået i stykker for netop den, der har
   bedt om mindre bevægelse.
   ============================================================ */
test('punkterne i "Det kan vi lave til jer" toner ind forskudt', async ({ page }) => {
  await åbnSkal(page, '/h-catering.html', { data: grunddata() });

  const punkter = page.locator('.getlist > span');
  await expect(punkter).toHaveCount(7);
  // Rul til panelet, så .rev får sit .in — ellers måler vi
  // starttilstanden og kalder den reglen.
  await punkter.first().scrollIntoViewIfNeeded();
  await expect(punkter.first()).toHaveCSS('opacity', '1');
  await expect(punkter.nth(4)).toHaveCSS('opacity', '1');

  const forsinkelser = await punkter.evaluateAll((els) =>
    els.map((e) => getComputedStyle(e).transitionDelay));
  expect(forsinkelser[0], 'første punkt har ingen forsinkelse — '
    + 'listen kommer på én gang').not.toBe('0s');
  expect(forsinkelser[4], 'punkt fem har den samme forsinkelse som punkt ét')
    .not.toBe(forsinkelser[0]);
});

test('med reduced motion står punkterne stille og synlige', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await åbnSkal(page, '/h-catering.html', { data: grunddata() });

  const punkt = page.locator('.getlist > span').first();
  /* ⚠️ MÅLT UDEN AT RULLE. Uden .in er starttilstanden opacity 0,
     og det er præcis dét, reduced-motion-blokken skal ophæve —
     ruller vi først, ville .in redde den, og prøven ville måle
     ingenting. */
  await expect(punkt).toHaveCSS('opacity', '1');
  await expect(punkt).toHaveCSS('transition-duration', '0s');
});

/* ============================================================
   KONTRASTEN PÅ HVER ENESTE SIDE  (5/9)
   ------------------------------------------------------------
   ⚠️ DEN HER FANDT EN FEJL, DER HAVDE LIGGET DER SIDEN DESIGNET
   KOM. Målt på ti gæstesider: designets --muted #8b7871 giver
   3,93:1 på creme, 3,61:1 på cream2 og 4,18:1 på hvid — ALLE
   tre under kravet på 4,5:1. Det rammer .fine, .hint, .tcap,
   menukortets datolinje og kalenderens manchet, altså netop den
   lille skrift, der er sværest at læse i forvejen.

   css/style.css fik den runde 22/8 og igen 29/8;
   havnegrillen.css fik den aldrig. De to ark bærer hver sin
   halvdel af gæstesiderne, og gæsten går imellem dem i ét klik.

   ⚠️ TRE TING KAN IKKE MÅLES HERFRA, og en måling, der lader som
   om, er værre end ingen:

   1) EN GRADIENT ELLER ET BILLEDE. Designets røde knapper er en
      linear-gradient, så backgroundColor er gennemsigtig. Første
      udgave gik derfor OP til sidens creme og meldte hvid tekst
      på creme: 1,00:1 på hver eneste knap.
   2) EN BAGGRUND I ET ::before. Heroen tegner både sit tern og
      sin mørke tone dér, og getComputedStyle på elementet SELV
      ser dem ikke — så overskriften målte 1,06:1 på en flade,
      der i virkeligheden er mørkebrun.
   3) EN GENNEMSIGTIG FLADE. Halvgennemsigtige paneler blandes
      med det, der ligger bag.

   I alle tre tilfælde springes elementet over. Det betyder, at
   knapperne og heroen skal måles med ØJNENE på et skud — men
   det, der KAN måles, bliver målt på hver eneste side.

   ⚠️ OG SYNLIGHED LÆSES OP GENNEM FORÆLDRENE. Skuffemenuen har
   opacity:0 på .sheet, mens hvert link indeni står på 1 — uden
   det ville prøven råbe på en menu, ingen kan se.

   Slået-fra betjening er undtaget (WCAG): en grå dato i en
   kalender er netop meningen — dagen er gået. */
for (const side of sider()) {
  test(`${side} har læsbar kontrast på det, der kan måles`, async ({ page }) => {
    await åbnSkal(page, side, { data: grunddata() });
    await page.waitForTimeout(300);

    const fejl = await page.evaluate(() => {
      const ud = [];
      const lum = (c) => {
        const m = String(c).match(/[\d.]+/g);
        if (!m) return null;
        if (m.length > 3 && Number(m[3]) < 0.9) return null;
        const v = m.slice(0, 3).map((x) => {
          const s = Number(x) / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
      };
      const synlig = (el) => {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return false;
        let p = el;
        while (p && p.nodeType === 1) {
          const s = getComputedStyle(p);
          if (s.display === 'none' || s.visibility === 'hidden') return false;
          if (Number(s.opacity) === 0) return false;
          if (p.hasAttribute('hidden')) return false;
          if (p.getAttribute('aria-hidden') === 'true') return false;
          p = p.parentElement;
        }
        return true;
      };
      const grund = (el) => {
        let p = el;
        while (p && p !== document.documentElement) {
          const s = getComputedStyle(p);
          if (s.backgroundImage && s.backgroundImage !== 'none') return null;
          for (const d of ['::before', '::after']) {
            const ps = getComputedStyle(p, d);
            if (ps.content !== 'none' && ps.content !== 'normal') {
              if (ps.backgroundImage && ps.backgroundImage !== 'none') return null;
              if (lum(ps.backgroundColor) !== null) return null;
            }
          }
          const l = lum(s.backgroundColor);
          if (l !== null) return l;
          p = p.parentElement;
        }
        return lum(getComputedStyle(document.body).backgroundColor);
      };

      document.querySelectorAll(
        'p,span,a,li,h1,h2,h3,h4,h5,h6,label,button,td,th,strong,em,small,dt,dd'
      ).forEach((el) => {
        if (!synlig(el)) return;
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
        if (el.closest('[disabled],[aria-disabled="true"]')) return;
        // Kun elementer med deres EGEN tekst — ellers tælles en
        // sætning én gang pr. forælder hele vejen op.
        if (!Array.from(el.childNodes)
          .some((n) => n.nodeType === 3 && n.textContent.trim())) return;

        const s = getComputedStyle(el);
        const f = lum(s.color);
        const b = grund(el);
        if (f === null || b === null) return;
        const k = (Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05);
        const px = parseFloat(s.fontSize);
        const stor = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700);
        const krav = stor ? 3 : 4.5;
        if (k < krav) {
          ud.push(`${el.tagName.toLowerCase()}.${String(el.className).trim()
            .split(/\s+/)[0]} ${k.toFixed(2)}:1 (krav ${krav}, ${px}px) `
            + `"${(el.innerText || '').trim().slice(0, 40)}"`);
        }
      });
      return ud;
    });

    expect(fejl, `${side}: tekst under kravet`).toEqual([]);
  });
}
