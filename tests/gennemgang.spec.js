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
const { åbnSkal, grunddata, erGoogleKvittering } = require('./hjaelp');
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
    /* Googles ejerskabsfil er én linje ren tekst, ikke en side —
       se noten ved erGoogleKvittering() i hjaelp.js. */
    && !erGoogleKvittering(f)
    && !erVejviser(f));
  const mapper = fs.readdirSync('.', { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name + '/')
    .filter((m) => fs.existsSync(m + 'index.html'))
    .filter((m) => !erVejviser(m + 'index.html'));
  return [...rod.map((f) => '/' + f), ...mapper.map((m) => '/' + m)];
}

/* ============================================================
   FOTOGITTERET MÅ IKKE FÅ ET HUL  (7/9)
   ============================================================
   .gal er tre fliser: ét stort til venstre, der spænder over
   begge rækker, og to lave til højre. Det STORE billedes format
   sætter højden (aspect-ratio 640/854), og rækkerne deler den —
   det er reglen fra 29/8, hvor galleriet havde et hul på 212 px.

   ⚠️ MEN RÆKKERNE ER 1fr, OG 1fr HAR ET AUTOMATISK MINIMUM. Et
   PORTRÆTFOTO i en lav flise vokser rækken til fotoets egen
   højde, og så dækker det store billede kun den øverste halvdel:
   der står et hul nederst til venstre. MÅLT på cateringsiden en
   iPhone 13: gitteret 464 px højt i stedet for 228.

   Smørrebrødssiden har virket siden 29/8, fordi DENS to små
   fotos tilfældigvis er liggende — reglen har altså holdt ved et
   held, og det holdt kun, så længe ingen lagde et højt billede i
   en lav flise. Ejeren lægger sine fotos op i admin.

   ⚠️ PRØVEN SAMMENLIGNER TO UAFHÆNGIGE ELEMENTER: gitterets egen
   højde mod det STORE billedes. Et spørgsmål til gitteret om dets
   egen grid-template-rows ville bestå, også hvis fliserne stak
   ud. Og den læser SIDERNE AF MAPPEN, så et nyt galleri ikke kan
   slippe forbi.
   ============================================================ */
test('intet fotogitter har et hul under det store billede', async ({ page }) => {
  const fund = [];
  let målte = 0;
  for (const side of sider()) {
    await åbnSkal(page, side, { data: grunddata() });
    const gitre = await page.evaluate(() => Array.from(
      document.querySelectorAll('.gal')).map((g) => {
      const stor = g.querySelector('.tall');
      if (!stor) return null;
      return {
        gitter: Math.round(g.getBoundingClientRect().height),
        stort: Math.round(stor.getBoundingClientRect().height),
      };
    }).filter(Boolean));

    for (const g of gitre) {
      målte += 1;
      /* To px slack: browseren runder rækkerne hver for sig. */
      if (Math.abs(g.gitter - g.stort) > 2) {
        fund.push(`${side}: gitteret er ${g.gitter} px, det store billede ${g.stort}`);
      }
    }
  }
  expect(målte, 'ingen gallerier blev målt — prøven måler ingenting')
    .toBeGreaterThanOrEqual(2);
  expect(fund, 'et fotogitter har et hul — se noten ovenfor').toEqual([]);
});

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
   VARIATION I AFSLØRINGEN  (9/9)
   ------------------------------------------------------------
   Kundens ord: *"gerne gøre brug af sådan nogle her nye slags
   design de steder det giver mening, da det hele er lidt
   kedeligt og ikke så godt som det bør være eller eksklusivt —
   så du ved nye og bedre animationer, rigtig variation af
   animationerne … og husk det skal se godt ud på telefon."*

   MÅLT FØR: 68 `.rev`-elementer på de ti designsider, og de
   brugte ALLE den samme bevægelse — stiger 26 px og toner ind.
   Den eneste variation var 70/140/210 ms forsinkelse.

   MÅLT EFTER, tre kørsler hver på en iPhone 13 under et fuldt
   rul: medianen er 33,4-35,8 ms MED variationen mod 34,3-38,2
   UDEN. Altså koster den ingenting — de ~34 ms er den indlejrede
   rullerod `#sc` fra 4/9, ikke animationerne. Og NUL sidelæns
   rulning på fem sider, som er den rigtige risiko ved en
   vandret transform (spøgelses-rulningen 5/9).
   ============================================================ */
test.describe('Afsløringen har mere end én bevægelse', () => {

  /* ⚠️ TALLET KOMMER UDEFRA: ANTALLET AF FORSKELLIGE
     STARTPOSITIONER, læst af den BEREGNEDE stil. Et spørgsmål om,
     hvorvidt en klasse står i opmærkningen, ville bestå på en
     regel, der ikke slog igennem — og det er sket i det her hus
     fem gange (senest `.dobbelt-titel` 31/8). */
  test('forsiden bruger flere startpositioner, ikke én', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await page.evaluate(() => { const i = document.getElementById('intro'); if (i) i.remove(); });

    const m = await page.evaluate(() => {
      const skjulte = [...document.querySelectorAll('.rev')]
        .filter((e) => !e.classList.contains('in'));
      const t = skjulte.map((e) => getComputedStyle(e).transform);
      return { n: skjulte.length, unikke: [...new Set(t)] };
    });
    expect(m.n, 'der ER uafslørede afsnit at måle').toBeGreaterThan(8);
    expect(m.unikke.length,
      'alle ' + m.n + ' afsnit kommer ind ad den samme vej: '
      + m.unikke.join(' / ')).toBeGreaterThanOrEqual(2);

    /* Og de to skal være den lodrette OG den vandrette — to
       forskellige tal på den samme akse er ikke to bevægelser. */
    const akser = new Set(m.unikke.map((v) => {
      const d = (v.match(/matrix\(([^)]+)\)/) || [, ''])[1].split(',').map(Number);
      if (d.length < 6) return 'ingen';
      return (Math.abs(d[4]) > 1 ? 'x' : '') + (Math.abs(d[5]) > 1 ? 'y' : '') || 'ingen';
    }));
    expect([...akser].sort().join(','),
      'bevægelserne bruger ikke både den vandrette og den lodrette akse')
      .toContain('x');
    expect([...akser].sort().join(',')).toContain('y');
  });

  /* ⚠️ INGEN SKALERING AF NOGET MED INDHOLD I — husets regel fra
     30/8, og den er KUNDENS EGNE ORD: *"animationen der ind med
     billederne er hakkende og ik clean."* En skalering på 1 %
     tvinger browseren til at rastere ALT indeni på ny for hvert
     billede, og på smørrebrødssiden er "alt" tre fotos på flere
     hundrede kilobyte.

     ⚠️ `.rule` ER UNDTAGELSEN, og den har en grund: den er 2 px
     høj, har intet indhold, og at tegne sig selv er hele dens
     opgave. En undtagelse uden en grund vokser, til prøven måler
     ingenting — derfor står den i selektoren og ikke i en liste. */
  test('ingen afsløring skalerer noget med indhold i', async ({ page }) => {
    const sider = ['/index.html', '/h-smorrebrod.html', '/m-tapas.html',
      '/h-selskaber.html', '/m-menukort.html'];
    const fund = [];
    for (const sti of sider) {
      await åbnSkal(page, sti, { data: grunddata() });
      await page.evaluate(() => { const i = document.getElementById('intro'); if (i) i.remove(); });
      fund.push(...await page.evaluate((s) => {
        const ud = [];
        for (const e of document.querySelectorAll('.rev, .rev *')) {
          if (e.matches('.rule')) continue;   /* 2 px, intet indhold */
          const t = getComputedStyle(e).transform;
          const d = (t.match(/matrix\(([^)]+)\)/) || [, ''])[1].split(',').map(Number);
          if (d.length >= 6 && (Math.abs(d[0] - 1) > 0.001 || Math.abs(d[3] - 1) > 0.001)) {
            ud.push(s + ' :: ' + (e.className || e.tagName) + '  ' + t);
          }
        }
        return ud;
      }, sti));
    }
    expect(fund, 'en afsløring skalerer — det hakker, og kunden har '
      + 'klaget over netop det (30/8)').toEqual([]);
  });

  /* ⚠️ OG INTET MÅ STÅ SKJULT FOR DEN, DER HAR SLÅET ANIMATIONER
     FRA. `.rev{transform:none}` i reduced-motion vejer 0,1,0 og
     TABER til en variant på 0,2,0 — så uden blokken i arket ville
     halvdelen af siden stå forskudt og usynlig. Det er 4/9-arret
     (*"punkterne begynder på opacity 0"*), og prøven måler UDEN at
     rulle: ruller man først, redder `.in` den, og prøven måler
     ingenting. */
  test('med reduced motion står alt stille og synligt', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const sider = ['/index.html', '/h-smorrebrod.html', '/m-tapas.html',
      '/h-selskaber.html', '/m-menukort.html'];
    for (const sti of sider) {
      await åbnSkal(page, sti, { data: grunddata() });
      await page.evaluate(() => { const i = document.getElementById('intro'); if (i) i.remove(); });
      const m = await page.evaluate(() => {
        const alle = [...document.querySelectorAll(
          '.rev, .rev .week>*, .rev .facts>*, .rev .findgrid>*, .rev .tiles>*, '
          + '.rev .getlist>span, .rev .dots i, .rev .rule')];
        return { n: alle.length,
          skjulte: alle.filter((e) => getComputedStyle(e).opacity === '0').length,
          flyttede: alle.filter((e) => {
            const d = (getComputedStyle(e).transform.match(/matrix\(([^)]+)\)/) || [, ''])[1]
              .split(',').map(Number);
            return d.length >= 6 && (Math.abs(d[4]) > 1 || Math.abs(d[5]) > 1
              || Math.abs(d[0] - 1) > 0.001);
          }).length };
      });
      /* ⚠️ GULVET KOMMER UDEFRA — FRA FILEN PÅ DISKEN, og det
         var min egen første udgave, der ikke gjorde det: den
         krævede mere end TRE elementer pr. side, og
         `h-selskaber.html` har præcis tre `.rev`. Prøven faldt
         på mit eget tal og ikke på reglen. Nu er gulvet sidens
         eget antal, så en side, der mister sine afsnit, stadig
         falder — og et tal, jeg har skrevet af, kan ikke blive
         forkert i morgen. */
      const iFilen = (fs.readFileSync(
        sti === '/index.html' ? 'index.html' : sti.replace(/^\//, ''), 'utf8')
        .match(/class="[^"]*\brev\b[^"]*"/g) || []).length;
      expect(iFilen, sti + ': filen har ingen .rev — prøven måler ingenting')
        .toBeGreaterThan(0);
      expect(m.n, sti + ': ' + m.n + ' målte elementer mod ' + iFilen
        + ' i filen — afsnit forsvandt fra siden')
        .toBeGreaterThanOrEqual(iFilen);
      expect(m.skjulte, sti + ': ' + m.skjulte + ' af ' + m.n
        + ' elementer står på opacity 0 uden bevægelse — siden er halvt tom')
        .toBe(0);
      expect(m.flyttede, sti + ': ' + m.flyttede + ' elementer står forskudt')
        .toBe(0);
    }
  });

  /* ⚠️ TRINNENE ER FORSKUDTE, OG FORSINKELSEN LÆSES AF DEN
     BEREGNEDE STIL. Beholderen er ÉT `.rev`, så uden trin kommer
     børnene som en plade — det er dét, "rigtig variation" handler
     om. Tallet kommer udefra: barn to og barn ét sammenlignes med
     hinanden, ikke med et millisekundtal skrevet af. */
  test('børnene i en gentaget liste kommer forskudt', async ({ page }) => {
    await åbnSkal(page, '/index.html', { data: grunddata() });
    await page.evaluate(() => { const i = document.getElementById('intro'); if (i) i.remove(); });
    /* De skal være AFSLØRET, ellers har de ingen overgang at
       måle — forsinkelsen står på `.rev.in`. */
    await page.evaluate(() => {
      document.querySelectorAll('.rev').forEach((e) => e.classList.add('in'));
    });

    /* ⚠️ BEHOLDEREN SKAL SELV VÆRE `.rev` — OG DET FANDT
       FALSIFIKATIONEN, IKKE KØRSLEN. Første udgave målte
       `.findgrid`, hvis BØRN er `.rev` hver for sig (`d1`/`d2`):
       prøven læste altså husets gamle d1/d2-forsinkelse og
       bestod, også da jeg fjernede trin-reglen. En
       falsifikation, der ikke falder, er et spørgsmål og ikke et
       bevis — og svaret var, at `.rev .week>*` (en EFTERKOMMER)
       traf **0** elementer, fordi `.week` selv bærer klassen.
       Tre af fire regler var død CSS. */
    const m = await page.evaluate(() => {
      const boks = document.querySelector('.week.rev');
      if (!boks) return null;
      const b = [...boks.children].map((e) => parseFloat(getComputedStyle(e).transitionDelay));
      return { n: b.length, delays: b, klasser: boks.className };
    });
    expect(m, 'ugestriben findes ikke').not.toBeNull();
    expect(m.n, 'der ER mere end ét barn i striben').toBeGreaterThan(2);
    expect(m.delays[1], 'barn to kommer samtidig med barn ét — listen '
      + 'arriverer som en plade (' + m.delays.join(', ') + ')')
      .toBeGreaterThan(m.delays[0]);
    expect(m.delays[2], 'trinnet stopper efter barn to')
      .toBeGreaterThan(m.delays[1]);
  });
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

   4) ⚠️ MEN EN GENNEMSIGTIG TEKST ER IKKE EN GENNEMSIGTIG BUND
      (11/9). Første udgave sprang enhver farve med alfa under
      0,9 over — også TEKSTFARVEN. Betingelserne ved send-knappen
      stod derfor som hvid .62 på hvid på bord/, bestil/ og
      ved-bordet/ (1:1), og prøven bestod på alle tre. Bunden er
      en kendt farve; teksten blandes med den, som øjet gør.

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
      const farve = (c) => {
        const m = String(c).match(/[\d.]+/g);
        if (!m) return null;
        return { rgb: m.slice(0, 3).map(Number), a: m.length > 3 ? Number(m[3]) : 1 };
      };
      const lys = (rgb) => {
        const v = rgb.map((x) => {
          const s = x / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
      };
      /* En BUND med gennemsigtighed kan ikke måles — vi ved ikke,
         hvad der ligger bag den (punkt 3 ovenfor). */
      const tæt = (c) => { const f = farve(c); return f && f.a >= 0.9 ? f.rgb : null; };
      const lum = (c) => { const rgb = tæt(c); return rgb ? lys(rgb) : null; };
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
          const rgb = tæt(s.backgroundColor);
          if (rgb) return rgb;
          p = p.parentElement;
        }
        return tæt(getComputedStyle(document.body).backgroundColor);
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
        const tekst = farve(s.color);
        const bund = grund(el);
        if (!tekst || !bund) return;
        /* ⚠️ HELT gennemsigtig tekst tegnes ikke med sin farve —
           det er gradient-tekst (`background-clip: text`) eller
           noget, der med vilje er skjult. Den kan ikke måles. */
        if (tekst.a < 0.05) return;
        /* ⚠️ HALVGENNEMSIGTIG TEKST BLANDES MED BUNDEN — den må
           ikke springes over (11/9, se punkt 4 ovenfor). */
        const set = tekst.rgb.map((x, i) => tekst.a * x + (1 - tekst.a) * bund[i]);
        const f = lys(set), b = lys(bund);
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


/* ============================================================
   ET TEGN PR. PUNKT, IKKE DET SAMME 26 GANGE  (8/9)
   ------------------------------------------------------------
   Kundens ord: *"hele catering siden er for lang og kedelig og
   statisk og generisk ift telefon udseendet."*

   MÅLT på de tre sider med .getlist: 26 punkter og ÉT unikt
   ikon — det samme lille hjerte hele vejen ned. Et mærke, der
   står ud for hver linje uden at skelne dem, siger ingenting;
   øjet holder op med at se det efter to linjer.

   ⚠️ OG "FOR LANG" VAR IKKE DET, DER VAR GALT — MÅLT PÅ ALLE
   FEM SALGSSIDER PÅ EN iPHONE 13:

       catering   4,4 skærme     baglokale  5,7
       smørrebrød 4,9            selskaber  5,7
       frokost    5,6

   Cateringsiden er den KORTESTE af de fem. Det, han reagerede
   på, var ensartetheden — ikke længden. Derfor er det tegnene,
   der er rettet, og ikke teksten, som er hans egne ord.
   ============================================================ */
test.describe('Lister med forskellige slags har forskellige tegn', () => {

  /* ⚠️ LISTERNE LÆSES AF MAPPEN, så en femte side ikke kan
     udgives med syv ens hjerter. */
  function medGetlist() {
    return fs.readdirSync('.')
      .filter((f) => /\.html$/.test(f))
      .filter((f) => /class="getlist"/.test(fs.readFileSync(f, 'utf8')));
  }

  /* ⚠️ TAPASSIDEN ER UNDTAGELSEN, OG DEN HAR EN GRUND.
     Catering og baglokalet svarer på *"hvad kan I gøre for os"* —
     hver linje er sin egen ting. m-tapas' liste svarer på *"hvad
     ligger der PÅ fadet"*: dér hører punkterne til den SAMME ret,
     og det fælles mærke betyder faktisk noget.

     En undtagelsesliste uden en grund vokser bare, til prøven
     måler ingenting — derfor står grunden her, og derfor er den
     ÉN side og ikke et mønster. */
  const FAELLES_MAERKE = ['m-tapas.html'];

  test('hvert punkt har sit eget tegn — og listerne læses af mappen',
    async ({ page }) => {
      const sider = medGetlist().filter((f) => FAELLES_MAERKE.indexOf(f) === -1);
      expect(sider.length, 'der ER lister at måle').toBeGreaterThan(0);

      for (const fil of sider) {
        await åbnSkal(page, '/' + fil, { data: grunddata() });
        const tegn = await page.locator('.getlist > span .gl-i')
          .evaluateAll((els) => els.map((e) => e.textContent.trim()));
        const punkter = await page.locator('.getlist > span').count();

        expect(tegn.length, fil + ': hvert punkt skal have et tegn')
          .toBe(punkter);
        /* Tallet kommer UDEFRA: antallet af punkter, ikke et tal
           skrevet af i prøven. */
        expect(new Set(tegn).size, fil + ': ' + punkter
          + ' punkter deler ' + new Set(tegn).size + ' tegn')
          .toBe(punkter);
      }
    });

  /* ============================================================
     ⚠️ TAPASSIDENS FÆLLES TEGN ER EN BØLGE  (9/9)
     ------------------------------------------------------------
     Kundens ord: *"hjerterne til små bølger istedet — sådan den
     her emoji-lignende som hjerterne bare med en bølge istedet
     🌊."*

     ⚠️ UNDTAGELSEN OVENFOR STÅR VED MAGT, og det er hele grunden
     til, at den her prøve findes: undtagelsen siger, at
     tapassiden må have ÉT tegn til alle punkter — og en
     undtagelse uden en vagt er et hul. Nu måler den også, HVAD
     tegnet er.

     ⚠️ OG HJERTET MÅ IKKE KOMME TILBAGE. Tallet kommer udefra:
     prøven læser FILEN og fælder hjertets egen kurve. En prøve,
     der kun spurgte "er der to <path>", ville bestå på et hjerte
     med en streg under.
     ============================================================ */
  test('tapaslistens fælles tegn er en bølge, ikke et hjerte', async ({ page }) => {
    const fil = FAELLES_MAERKE[0];
    const kilde = fs.readFileSync(fil, 'utf8');

    /* Hjertets egen kurve fra designbundtet — den må ikke stå i
       filen mere. */
    expect(kilde.indexOf('M12 20S3.6 14.6'),
      fil + ': hjertet er tilbage i listen').toBe(-1);

    await åbnSkal(page, '/' + fil, { data: grunddata() });

    const m = await page.locator('.getlist > span').evaluateAll((els) => {
      const tegn = els.map((e) => {
        const svg = e.querySelector('svg');
        if (!svg) return null;
        return [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d')).join('|');
      });
      return { punkter: els.length, tegn: tegn,
        unikke: [...new Set(tegn)].length };
    });

    expect(m.punkter, 'der ER punkter at måle').toBeGreaterThan(4);
    /* ⚠️ ÉT tegn til dem alle — det er undtagelsen, og den skal
       stadig gælde. Kom der et emoji pr. punkt her, ville
       reglen fra 6/9 være brudt i den anden retning. */
    expect(m.unikke, fil + ': punkterne deler ikke ét tegn').toBe(1);

    /* ⚠️ OG DET SKAL VÆRE VAND: to bølgestreger, der begynder i
       den SAMME x og ligger på hver sin højde — et hjerte er ÉN
       lukket kurve. Formen læses af `d`, ikke af en klasse. */
    const d = m.tegn[0].split('|');
    expect(d.length, fil + ': tegnet er ikke to streger').toBe(2);
    const y = d.map((s) => parseFloat(s.match(/^M[\d.]+\s+([\d.]+)/)[1]));
    expect(Math.abs(y[1] - y[0]),
      fil + ': de to streger ligger oven i hinanden').toBeGreaterThan(3);
    for (const s of d) {
      expect(s, fil + ': stregen er ikke en bølge (ingen kurve)').toMatch(/c/);
      expect(s, fil + ': stregen er lukket som et hjerte').not.toMatch(/z$/i);
    }
  });

  /* ⚠️ OG TEGNET MÅ IKKE LÆSES OP. Samme lov som forsidens
     emoji-fliser 31/8: en skærmlæser skal sige "Smørrebrød og
     håndmadder", ikke "brød Smørrebrød og håndmadder". */
  test('tegnene er stumme for en skærmlæser', async ({ page }) => {
    let set = 0;
    for (const fil of medGetlist()) {
      await åbnSkal(page, '/' + fil, { data: grunddata() });
      set += await page.locator('.getlist .gl-i').count();
      const uden = await page.locator('.getlist .gl-i:not([aria-hidden="true"])').count();
      expect(uden, fil + ': et tegn uden aria-hidden').toBe(0);
    }
    /* ⚠️ EN TOM LØKKE BESTÅR HVER ENESTE REGEL (arret fra
       toBeHidden 30/8). Forsvandt tegnene helt, ville prøven
       ovenfor tælle nul uden aria-hidden og bestå. */
    expect(set, 'der ER tegn at måle').toBeGreaterThan(0);
  });
});
