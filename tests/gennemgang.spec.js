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

/* Alle udgivne gæstesider — læst af MAPPEN. */
function sider() {
  const rod = fs.readdirSync('.').filter((f) => /\.html$/.test(f)
    && !/^(admin|image-slot)/.test(f));
  const mapper = ['bestil/', 'bord/', 'ved-bordet/'].filter((m) =>
    fs.existsSync(m + 'index.html'));
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
      const rod = document.getElementById('sc') || document.scrollingElement;
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
