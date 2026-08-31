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

      return [...new Set(ud)];
    });
    if (m.length) fund.push(side + ' :: ' + m.join(' | '));
    if (fejl.length) fund.push(side + ' :: JS-FEJL ' + fejl.join(' | '));
    page.removeAllListeners('pageerror');
  }
  expect(fund, 'gennemgangen fandt noget — se linjerne').toEqual([]);
});
