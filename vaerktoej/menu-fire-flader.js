/* ============================================================
   STEMMER MENUERNE MED HINANDEN?               (10. sep 2026)
   ------------------------------------------------------------
   Kundens ord: *"se menuerne for at tjekke om de stemmer med
   hinanden i cafeen og QR-code-bestillingen og normal online
   bestilling + sortiment."*

   Fire flader, og de skal sige det samme om den samme vare:

     1) CAFEEN      de syv trykte kort (vaerktoej/kortene.py)
     2) SORTIMENTET m-menukort.html — det, gæsten LÆSER
     3) ONLINE      forsidens bestilling (udvalget "uden-fyld")
     4) QR          ved-bordet/ — det samme udvalg fra bordet

   ⚠️ OG DEN LÆSER DOM'EN, IKKE `Butik.udvalg`. Reglen bor ét
   sted, men OPTEGNINGEN er skrevet fire — og det er dér, to
   lister over det samme sortiment skrider fra hinanden, uden at
   nogen af siderne ser forkerte ud for sig selv. Samme greb som
   tests/tre-veje.spec.js, men på EJERENS EGNE 308 varer: med
   fem varer ser hver side fin ud.

   ⚠️ DEN SKRIVER INGENTING og retter ingenting. Den siger, hvor
   de fire er uenige.

   BRUG:  python3 -m http.server 4175 --bind 127.0.0.1 &
          node vaerktoej/menu-fire-flader.js <ejerens-data.json>
   ============================================================ */
const { chromium, devices } = require('playwright');
const fs = require('fs');

const ROD = process.env.ROD || 'http://127.0.0.1:4175';
const DATA = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

/* Uret sættes fast. "Kan det bestilles?" afhænger af klokken og
   af ugedagen (kategorier kan lukkes pr. dag), og en måling, der
   siger noget andet kl. 22, er ubrugelig. Fredag kl. 13. */
const UR = '2026-09-11T11:00:00Z';

async function nySide(b, mobil) {
  const ctx = await b.newContext(mobil ? devices['iPhone 13'] : { viewport: { width: 1280, height: 900 } });
  const side = await ctx.newPage();
  await side.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await side.route('**/js/config.js*', (r) => r.fulfill({ status: 200,
    contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD = { url: '', anonKey: '', lokation: 'mosede' };" }));
  await side.addInitScript(([d, iso]) => {
    try { localStorage.setItem('mosede_data_v1', JSON.stringify(d)); } catch (e) { /* ignoreres */ }
    try { localStorage.setItem('mosede_intro_set_v1', '1'); } catch (e) { /* ignoreres */ }
    const fast = new Date(iso).getTime();
    const Ægte = Date;
    class FastDato extends Ægte {
      constructor(...a) { if (a.length === 0) super(fast); else super(...a); }
      static now() { return fast; }
    }
    window.Date = FastDato;
  }, [DATA, UR]);
  return { ctx, side };
}

/* Folder ud, som en finger gør det: hver "+ tilføj" trykkes, til
   der ikke er flere lukkede. Uden det måler vi kun de rækker,
   designet viser fra start — og det er ikke sortimentet. */
/* ⚠️ FOLDEN TEGNER LISTEN OM, OG DET KOSTEDE EN MÅLING.
   Første udgave satte en markør på hver "+ tilføj" og klikkede
   alt, der manglede en. Men et klik kalder `visVarer()`, som
   bygger rækkerne PÅ NY — markøren fulgte ikke med, så næste
   runde klikkede den samme fold igen og lukkede den. MÅLT: 11
   kategorier ind, 11 rækker ud, nul varer. Vi holder derfor styr
   på kategorinavnene HER og åbner hver præcis én gang. */
async function foldUd(side) {
  const navne = await side.evaluate(() => [...document.querySelectorAll('.item[data-kategori]')]
    .map((e) => e.getAttribute('data-kategori')));
  for (const n of navne) {
    const aabnet = await side.evaluate((navn) => {
      const r = [...document.querySelectorAll('.item[data-kategori]')]
        .find((e) => e.getAttribute('data-kategori') === navn);
      if (!r) return false;
      const add = r.querySelector('[data-add]');
      if (add && /luk/.test(add.textContent)) return true;   // står allerede åben
      r.click();
      return true;
    }, n);
    if (aabnet) await side.waitForTimeout(150);
  }
  return navne;
}

/* Navn + pris læst af SKÆRMEN. Prisen normaliseres til et tal,
   så "89,-" og "89 kr." er den samme oplysning — det er tallet,
   gæsten betaler, ikke formatet, der skal stemme her. */
async function laes(side, raekkeVaelger, navnVaelger, prisVaelger) {
  return side.evaluate(([rv, nv, pv]) => {
    const tal = (t) => {
      const m = (t || '').replace(/ /g, ' ').match(/(\d+(?:[.,]\d+)?)/);
      return m ? Number(m[1].replace('.', '').replace(',', '.')) : null;
    };
    const ud = [];
    document.querySelectorAll(rv).forEach((r) => {
      if (!r.checkVisibility || !r.checkVisibility()) return;
      const n = r.querySelector(nv);
      const p = r.querySelector(pv);
      if (!n) return;
      const navn = (n.textContent || '').trim();
      if (!navn) return;
      ud.push({ navn, pris: p ? tal(p.textContent) : null });
    });
    return ud;
  }, [raekkeVaelger, navnVaelger, prisVaelger]);
}

(async () => {
  const b = await chromium.launch();
  const fund = {};

  /* SORTIMENTET — m-menukort.html, det gæsten læser. */
  {
    const { ctx, side } = await nySide(b, true);
    await side.goto(ROD + '/m-menukort.html', { waitUntil: 'load' });
    await side.waitForTimeout(900);
    fund.sortiment = await laes(side, '.mk-linje', '.mk-txt h4', '.mk-pris');
    await ctx.close();
  }

  /* ONLINE — forsidens bestilling. */
  {
    const { ctx, side } = await nySide(b, true);
    await side.goto(ROD + '/index.html', { waitUntil: 'load' });
    await side.waitForTimeout(900);
    await foldUd(side);
    fund.online = await laes(side, '.item:not([data-kategori])', 'h4', '.tag, .stk-pris');
    await ctx.close();
  }

  /* QR — ved-bordet/, bord 7. */
  {
    const { ctx, side } = await nySide(b, true);
    await side.goto(ROD + '/ved-bordet/?bord=7', { waitUntil: 'load' });
    await side.waitForTimeout(900);
    await foldUd(side);
    fund.qr = await laes(side, '.stk-linje', '.navn', '.stk-pris');
    await ctx.close();
  }

  await b.close();
  console.log(JSON.stringify(fund, null, 1));
})();
