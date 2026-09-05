/* ============================================================
   TILGÆNGELIGHED OG INTEGRITET PÅ TVÆRS AF HELE HUSET
   ------------------------------------------------------------
   Prøverne fanger det, der kan formuleres som en regel om ÉN
   side. Det her er den anden slags: de fejl, der kun kan ses
   ved at gå ALLE sider igennem med det samme spørgsmål — og som
   derfor lever i årevis, fordi ingen har et sted at opdage dem.

   Den måler, den retter ikke. Rapporten er en liste over det,
   der skal kigges på.

   ⚠️ KØR IKKE MENS DEN FULDE RUNDE KØRER. Playwrights egen
   server på 4173 dør, hvis to browsere slås om den. Den her
   bruger sin egen på 4176.

   BRUG:  node vaerktoej/tilgaengelighed.js
   ============================================================ */
const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 4176;
const ROD = 'http://127.0.0.1:' + PORT;

/* Siderne læses af MAPPEN, ikke skrevet af i hånden — en ny side
   skal ikke kunne slippe forbi. Vejviserne springes over på det,
   de GØR (refresh + location.replace), ikke på deres navne. */
function erVejviser(fil) {
  const t = fs.readFileSync(fil, 'utf8');
  return /http-equiv=["']refresh/i.test(t) && /location\.replace/.test(t);
}

function gaestesider() {
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

/* Måles I BROWSEREN. Et spørgsmål til koden om dens egne
   attributter ville bestå, også når reglen ikke slår igennem. */
async function maal(page) {
  return page.evaluate(() => {
    const fund = [];
    const sig = (slags, hvad, hvor) => fund.push({ slags, hvad, hvor });

    const synlig = (el) => {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return false;
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    };
    const kort = (el) => {
      const t = (el.id ? '#' + el.id : '')
        || (el.getAttribute('name') ? '[name=' + el.getAttribute('name') + ']' : '')
        || (el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')
        || el.tagName.toLowerCase();
      return el.tagName.toLowerCase() + t;
    };

    // 1) Dobbelte id'er — to elementer med samme id er en fejl,
    //    der rammer BÅDE label-for, aria og enhver querySelector.
    const set = {};
    document.querySelectorAll('[id]').forEach((e) => {
      set[e.id] = (set[e.id] || 0) + 1;
    });
    Object.keys(set).forEach((id) => {
      if (set[id] > 1) sig('dobbelt-id', id + ' findes ' + set[id] + ' gange', '');
    });

    // 2) Felter uden en etiket, nogen kan læse op
    document.querySelectorAll('input, select, textarea').forEach((el) => {
      if (el.type === 'hidden' || !synlig(el)) return;
      const harLabel = el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      const navn = el.getAttribute('aria-label')
        || (el.getAttribute('aria-labelledby')
          && document.getElementById(el.getAttribute('aria-labelledby')))
        || harLabel || el.closest('label');
      if (!navn) sig('felt-uden-etiket', kort(el), '');
    });

    // 3) Knapper og links uden et navn
    document.querySelectorAll('button, a[href]').forEach((el) => {
      if (!synlig(el)) return;
      const tekst = (el.innerText || '').trim()
        || el.getAttribute('aria-label')
        || el.getAttribute('title')
        || (el.querySelector('img[alt]') || {}).alt;
      if (!tekst) sig('uden-navn', kort(el), (el.outerHTML || '').slice(0, 90));
    });

    // 4) Billeder uden alt (tom alt er lovligt — det betyder pynt)
    document.querySelectorAll('img').forEach((el) => {
      if (!el.hasAttribute('alt')) sig('img-uden-alt', el.getAttribute('src') || '', '');
    });

    // 5) Overskrifter, der springer et niveau over
    let sidst = 0;
    document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
      if (!synlig(h)) return;
      const n = Number(h.tagName.slice(1));
      if (sidst && n > sidst + 1) {
        sig('overskrift-springer', 'h' + sidst + ' → h' + n
          + ': "' + (h.innerText || '').trim().slice(0, 40) + '"', '');
      }
      sidst = n;
    });

    // 6) Kontrast på den tekst, der FAKTISK står der
    const lum = (c) => {
      const m = c.match(/[\d.]+/g);
      if (!m) return null;
      const a = m.length > 3 ? Number(m[3]) : 1;
      if (a < 0.9) return null;                 // gennemsigtig: kan ikke måles her
      const v = m.slice(0, 3).map((x) => {
        const s = Number(x) / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    const grund = (el) => {
      let p = el;
      while (p && p !== document.documentElement) {
        const b = getComputedStyle(p).backgroundColor;
        const l = lum(b);
        if (l !== null) return l;
        p = p.parentElement;
      }
      return lum(getComputedStyle(document.body).backgroundColor);
    };
    const set2 = new Set();
    document.querySelectorAll('p,span,a,li,h1,h2,h3,h4,h5,h6,label,button,td,th,strong,em,small')
      .forEach((el) => {
        if (!synlig(el)) return;
        const egen = Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3 && n.textContent.trim()).length;
        if (!egen) return;
        const s = getComputedStyle(el);
        const f = lum(s.color);
        const b = grund(el);
        if (f === null || b === null) return;
        const k = (Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05);
        const px = parseFloat(s.fontSize);
        const fed = Number(s.fontWeight) >= 700;
        const stor = px >= 24 || (px >= 18.66 && fed);
        const krav = stor ? 3 : 4.5;
        if (k < krav) {
          const n = kort(el) + '|' + s.color;
          if (set2.has(n)) return;
          set2.add(n);
          sig('kontrast', kort(el) + ' ' + k.toFixed(2) + ':1 (krav '
            + krav + ') ' + px + 'px', (el.innerText || '').trim().slice(0, 40));
        }
      });

    // 7) Sidens eget hoved
    if (!document.documentElement.getAttribute('lang')) sig('hoved', 'lang mangler', '');
    if (!document.title.trim()) sig('hoved', 'title mangler', '');
    const be = document.querySelector('meta[name="description"]');
    if (!be || !be.content.trim()) sig('hoved', 'description mangler', '');

    return fund;
  });
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT)],
    { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1200));

  const browser = await chromium.launch();
  const alt = {};
  try {
    for (const profil of [
      { navn: 'telefon', viewport: { width: 390, height: 664 } },
      { navn: 'computer', viewport: { width: 1280, height: 800 } },
    ]) {
      const ctx = await browser.newContext({ viewport: profil.viewport });
      const page = await ctx.newPage();
      // Skriften er spærret af udgangsproxyen — det er ikke en fejl på siden.
      await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
      await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
      await page.route('**/js/config.js*', (r) => r.fulfill({
        status: 200, contentType: 'application/javascript',
        body: 'window.MOSEDE_CONFIG={url:"",anonKey:"",lokation:"mosede"};',
      }));
      for (const sti of gaestesider()) {
        try {
          await page.goto(ROD + sti, { waitUntil: 'networkidle', timeout: 20000 });
          await page.evaluate(() => {
            const c = document.querySelector('#intro, #film, canvas#water');
            if (c && c.parentElement) c.parentElement.removeChild(c);
          }).catch(() => {});
          await page.waitForTimeout(400);
          const f = await maal(page);
          if (f.length) alt[profil.navn + ' ' + sti] = f;
        } catch (e) {
          alt[profil.navn + ' ' + sti] = [{ slags: 'KUNNE IKKE ÅBNES', hvad: e.message, hvor: '' }];
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }

  let n = 0;
  const efter = {};
  Object.keys(alt).forEach((k) => {
    alt[k].forEach((f) => {
      n++;
      (efter[f.slags] = efter[f.slags] || []).push(k + '  ::  ' + f.hvad
        + (f.hvor ? '  ::  ' + f.hvor : ''));
    });
  });
  console.log('\n=== ' + n + ' fund ===\n');
  Object.keys(efter).sort().forEach((s) => {
    console.log('--- ' + s + ' (' + efter[s].length + ')');
    efter[s].slice(0, 40).forEach((l) => console.log('    ' + l));
    if (efter[s].length > 40) console.log('    … og ' + (efter[s].length - 40) + ' mere');
    console.log('');
  });
})();
