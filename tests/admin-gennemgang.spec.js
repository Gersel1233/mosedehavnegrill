/* HELE PERSONALESIDEN GÅET IGENNEM — SOM EN PRØVE  (31/8)

   Kundens ord: *"alle tabs alle faner gå dem personligt
   igennem, ikke stop før."*

   Det gjorde jeg — men et menneskes øjne ser én fane ad gangen,
   og der er seksten. Prøven her åbner HVER fane på en telefon og
   leder efter det, der er svært at se med øjnene, fordi det kun
   rammer én fane ad gangen:

     · en JavaScript-fejl, der væltede fanen
     · sidelæns rulning
     · noget, der stikker ud over en forælder, der klipper
     · trykflader under 30 px

   ⚠️ FANELISTEN LÆSES AF OPMÆRKNINGEN, ikke skrevet af i hånden.
   En ny fane skal ikke kunne slippe forbi — det er den samme
   regel som gennemgang.spec.js' mappe-læsning og favicon-prøvens.

   ⚠️ OG DEN MÅLER PÅ EN TELEFON. Personalesiden er computer- og
   iPad-først (se CLAUDE.md), men den SKAL virke på en telefon —
   og det var netop dér, kunden fandt fanerne, der forsvandt ned
   i browserens bjælke (30/8) og knapperne "fra 1850'erne".
*/

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, visFane } = require('./hjaelp');

/* Sider, hvor en fejl i konsollen er FORVENTET, fordi fanen
   selv siger, hvad der mangler. Tom liste indtil videre — står
   der noget her en dag, skal grunden med. */
const TILGIVES = [];

/* En dag med noget på hver af de faner, personalet arbejder i.
   Navnene er lange med vilje: det er de lange, der brækker en
   telefon, og de korte, der får en prøve til at bestå på
   ingenting. */
function medArbejde() {
  const d = grunddata();
  const iDag = '2026-08-06';
  d.menu_varer = d.menu_varer.map((v) => Object.assign({ billede: null }, v));
  d.bestillinger = [
    { id: 1, lokation_id: 'mosede', reference: 'SM-1', nummer: 47,
      navn: 'Sara Sørensen-Dam', telefon: '20304050', email: 'sara@eksempel.dk',
      hent_dato: iDag, hent_tid: '13:00', antal: 2,
      linjer: [{ navn: 'Håndmad med leverpostej og baconsvøb', antal: 2, pris: 32 }],
      fyld: [], status: 'ny', hvordan: 'afhentning',
      besked: 'Vi henter lidt før, hvis det er i orden',
      oprettet: iDag + 'T09:00:00.000Z' },
    { id: 2, lokation_id: 'mosede', reference: 'SM-2', nummer: 48, navn: 'Bord 7',
      telefon: null, hent_dato: iDag, hent_tid: '12:10', antal: 3,
      linjer: [{ navn: 'Softice med guf', antal: 3, pris: 40 }], fyld: [],
      status: 'ny', hvordan: 'spis_her', bord_nummer: '7',
      besked: 'ALLERGI: nødder og skaldyr',
      oprettet: iDag + 'T11:50:00.000Z' },
  ];
  d.borde = [{ id: 9, lokation_id: 'mosede', reference: 'BO-1',
    navn: 'Familien Vind-Christensen', telefon: '20304051', dato: iDag,
    tid: '18:00', antal_personer: 6, status: 'ny',
    oprettet: iDag + 'T08:00:00.000Z' }];
  d.bordliste = [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
    aktiv: true, sortering: 10 }];
  /* ⚠️ DEN ANDEN HAR KUN EN MAIL. foresp-kontakt.sql (28/8) gjorde
     kravet til "et gyldigt nummer ELLER en gyldig mail", netop
     fordi en gæst, der kun ville skrive, blev afvist af databasen.
     Uden en sådan række måler null-reglen herunder ingenting på
     forespørgselskortet. */
  d.forespoergsler = [{ id: 1, lokation_id: 'mosede', reference: 'FO-1',
    type: 'selskab', navn: 'Karen Kok', telefon: '20304052',
    email: 'karen@eksempel.dk', dato: '2026-10-03', antal_personer: 40,
    besked: 'Sølvbryllup — vi vil gerne have noget med fisk',
    detaljer: { anledning: 'Sølvbryllup', sted: 'baglokalet' },
    status: 'ny', intern_note: null, slettet: null,
    oprettet: iDag + 'T07:00:00.000Z' },
    { id: 2, lokation_id: 'mosede', reference: 'FO-2',
    type: 'selskab', navn: 'Mette Bjerre', telefon: null,
    email: 'mette@eksempel.dk', dato: '2026-11-14', antal_personer: 65,
    besked: 'Sølvbryllup til foråret — hvad koster det?',
    detaljer: { anledning: 'Sølvbryllup' },
    status: 'ny', intern_note: null, slettet: null,
    oprettet: iDag + 'T07:30:00.000Z' }];
  return d;
}

test('hver fane i admin står rent på en telefon', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobil', 'måler telefonens layout');
  test.setTimeout(180000);

  const fejl = [];
  page.on('pageerror', (e) => fejl.push('JS-fejl: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') fejl.push('konsolfejl: ' + m.text());
  });

  /* ⚠️ MED DATA PÅ, IKKE PÅ EN TOM SIDE. En tom fane har ingen
     kort, ingen knapper og intet at stikke ud over noget — den
     ville bestå på ingenting. Det er kortene, der brækker
     layoutet, og det er dem, personalet ser hele dagen. */
  await åbnAdmin(page, { ur: '2026-08-06T10:10:00Z', data: medArbejde() });

  const faner = await page.locator('.faner button[data-panel]')
    .evaluateAll((els) => els.map((e) => e.dataset.panel));
  expect(faner.length, 'fanelisten kunne ikke læses').toBeGreaterThan(10);

  const fund = [];

  for (const fane of faner) {
    fejl.length = 0;
    await visFane(page, fane);
    await page.waitForTimeout(250);

    fejl.forEach((f) => {
      if (TILGIVES.some((t) => f.includes(t))) return;
      fund.push(`${fane} :: ${f}`);
    });

    const rapport = await page.evaluate(() => {
      const ud = [];

      /* ⚠️ ET AF TALLENE SKAL KOMME UDEFRA. document.documentElement
         .scrollWidth mod window.innerWidth ville være to tal fra
         det samme sted — og på en telefon vokser innerWidth med
         indholdet. 390 er profilens egen bredde (iPhone 13). */
      const bred = document.documentElement.scrollWidth;
      if (bred > 391) ud.push('siden kan rulles sidelæns: ' + bred + 'px');

      /* Noget, der stikker ud over en forælder, der klipper. Det
         ses ikke i koden: hver regel er rigtig for sig. */
      document.querySelectorAll('.panel:not(.skjult) *').forEach((el) => {
        const p = el.parentElement;
        if (!p) return;
        const pc = getComputedStyle(p);
        if (pc.overflowX !== 'hidden' && pc.overflow !== 'hidden') return;
        const r = el.getBoundingClientRect();
        const pr = p.getBoundingClientRect();
        if (r.width === 0 || pr.width === 0) return;
        /* Designets glans er bredere end sin knap MED VILJE og
           klippes af den — det er effekten. */
        if (el.classList.contains('sheen')) return;
        const ud1 = Math.round(pr.left - r.left);
        const ud2 = Math.round(r.right - pr.right);
        if (Math.max(ud1, ud2) > 2) {
          ud.push('stikker ' + Math.max(ud1, ud2) + 'px ud over en klippende '
            + p.tagName + '.' + (p.className || '') + ': '
            + el.tagName + '.' + (el.className || ''));
        }
      });

      /* ⚠️ INTET KORT MÅ SKRIVE "null" ELLER "undefined" PÅ SKÆRMEN.
         MÅLT på et skud 3/9: bestillingskortet skrev "📞 null" på en
         QR-bestilling uden nummer, og forespørgselskortet gjorde det
         samme på en gæst, der kun havde givet sin mail. Begge dele er
         tilladt af databasen med vilje (bord-uden-telefon.sql og
         foresp-kontakt.sql), og reglen fandtes allerede i
         Admin.kontakt — kortene spurgte den bare aldrig.

         Fiksturet HAR haft en bestilling med telefon: null hele
         tiden. Fejlen stod altså på skærmen i hver eneste kørsel;
         der var bare ingen, der kiggede efter den.

         ⚠️ DER MÅLES PÅ innerText, ikke på koden. Et spørgsmål til
         kortet om dets egen b.telefon ville bestå, også hvis en
         anden linje skrev et null ud et andet sted. */
      document.querySelectorAll('.panel:not(.skjult)').forEach((pa) => {
        const t = pa.innerText || '';
        (t.match(/^.*\b(null|undefined|NaN)\b.*$/gm) || []).forEach((l) => {
          ud.push('skriver et tomt felt ud: "' + l.trim().slice(0, 60) + '"');
        });
      });

      /* Trykflader. 30 px er husets nedre grænse — fanen bruges
         med fedtede fingre på en iPad, og på en telefon er den
         det eneste, personalet har. */
      document.querySelectorAll('.panel:not(.skjult) button, '
        + '.panel:not(.skjult) a, .panel:not(.skjult) summary').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;      // skjult
        if (r.height < 30) {
          ud.push('lille trykflade ' + Math.round(r.height) + 'px: '
            + el.tagName + '.' + (el.className || '') + ' "'
            + (el.textContent || '').trim().slice(0, 30) + '"');
        }
      });

      return ud;
    });

    rapport.forEach((r) => fund.push(`${fane} :: ${r}`));
  }

  expect(fund, 'gennemgangen af admin fandt noget — se linjerne').toEqual([]);
});

/* ============================================================
   HVERT FELT I ADMIN HAR ET NAVN  (5/9)
   ------------------------------------------------------------
   MÅLT på alle sytten faner: 47 felter havde ingen etiket, ingen
   aria-label og ingen <label> om sig. For en skærmlæser hedder
   sådan et felt "redigeringsfelt" — og det er ikke kun for den,
   der ikke ser: en stemmestyring kan heller ikke ramme
   "prisfeltet", når feltet ikke hedder noget.

   ⚠️ NAVNET SIGER RÆKKEN MED. "Pris" alene er tvetydigt på et
   kort med 262 varer og syv gange under hinanden i
   åbningstiderne. Derfor "Pris på Flæskestegssandwich" og
   "Åbner mandag".

   ⚠️ OG PRØVEN LÆSER DET, BROWSEREN GØR. Et spørgsmål til koden
   om dens egne attributter ville bestå, også når en <label> ikke
   hører til feltet — så den spørger, om der findes et navn ad
   NOGEN af de fire veje, browseren selv bruger.

   ⚠️ FANERNE SKIFTES DEN VEJ, PERSONALET GÅR. Arret fra 30/8:
   127 prøver pegede på [data-panel], som en finger ikke kan nå
   på en telefon. */
test.describe('Felterne i admin har et navn', () => {
  test('ingen fane har et felt uden etiket', async ({ page }) => {
    await åbnAdmin(page, { data: medArbejde() });

    const faner = await page.$$eval('[data-panel]',
      (els) => els.map((e) => e.getAttribute('data-panel')).filter(Boolean));
    expect(faner.length, 'fanerne blev ikke fundet — prøven måler ingenting')
      .toBeGreaterThan(10);

    const uden = [];
    for (const id of faner) {
      await visFane(page, id);
      await page.waitForTimeout(120);
      const f = await page.evaluate((fane) => {
        const ud = [];
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
        document.querySelectorAll('input, select, textarea').forEach((el) => {
          if (el.type === 'hidden' || !synlig(el)) return;
          const harFor = el.id
            && document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
          const navn = el.getAttribute('aria-label')
            || (el.getAttribute('aria-labelledby')
              && document.getElementById(el.getAttribute('aria-labelledby')))
            || harFor || el.closest('label');
          if (!navn) {
            ud.push(fane + ': ' + el.tagName.toLowerCase()
              + (el.id ? '#' + el.id : '.' + String(el.className).trim().split(/\s+/)[0]));
          }
        });
        return ud;
      }, id);
      uden.push(...f);
    }
    expect(uden, 'felter uden et navn, nogen kan læse op').toEqual([]);
  });
});
