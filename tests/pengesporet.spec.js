/* ============================================================
   PENGESPORET: DET, GÆSTEN SER, ER DET, DER BLIVER GEMT  (5/9)
   ------------------------------------------------------------
   Prøverne dækker hver regel for sig: emballagen har sin,
   fragten har sin, tillægget har sin. Men SUMMEN kan være
   forkert, selv om hver regel er rigtig — det er husets egen
   lære fra pillen oven i heroens manchet og fra galleriet, der
   kun gik op på en telefon.

   Her måles kæden HELE vejen: gæsten lægger noget i kurven,
   skærmen skriver et beløb, hun trykker send — og prøven læser
   den GEMTE række og lægger linjerne sammen. To tal, to steder,
   og de skal være ens.

   ⚠️ ET AF TALLENE KOMMER UDEFRA. Prøven regner ikke summen ud
   af de samme funktioner som siden; den læser BELØBET PÅ
   SKÆRMEN og holder det op mod RÆKKEN I DATABASEN. Et spørgsmål
   til koden om dens egen udregning ville bestå, også hvis begge
   var forkerte.

   ⚠️ OG DEN TÆLLER OGSÅ RETTER. Køkkenet laver mad efter
   linjerne; emballagen og fragten er penge, ikke arbejde. Er de
   to blandet sammen, laver køkkenet en pose. */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';

function data(ændringer) {
  const d = grunddata();
  d.indstillinger.bestilbare_kategorier = [1, 6, 9];
  d.indstillinger.bestilling_varsel_timer = 2;
  Object.assign(d.indstillinger, (ændringer || {}).indstillinger || {});
  return d;
}

/* TOTALEN på skærmen, som gæsten læser den.

   ⚠️ DET ER "I ALT"-BELØBET, IKKE DET FØRSTE TAL PÅ LINJEN.
   Første udgave tog det første beløb, den fandt — og på en
   bestilling med emballage står der "+ emballage 3 × 10,-" FØR
   totalen. Prøven meldte derfor 10 mod 135 og lignede en fejl i
   koden; den var i målingen. */
function beløbAf(tekst) {
  const t = String(tekst);
  const ialt = t.match(/i alt\s*(\d[\d.\s]*(?:,\d+)?)\s*(?:,-|kr)/i);
  const m = ialt || t.match(/(\d[\d.\s]*(?:,\d+)?)\s*(?:,-|kr)/i);
  if (!m) return null;
  return Number(m[1].replace(/[.\s]/g, '').replace(',', '.'));
}

/* Summen af den GEMTE række — som kassen ville regne den. */
function sumAfRække(b) {
  return (b.linjer || []).reduce(
    (s, l) => s + (Number(l.pris) || 0) * (Number(l.antal) || 0), 0);
}

async function læg(page, kategori, vare, gange) {
  await page.locator(`[data-kategori="${kategori}"]`).click();
  for (let i = 0; i < (gange || 1); i++) {
    await page.locator(`[data-vare="${vare}"] button[data-d="+"]`).click();
  }
}

async function send(page) {
  await page.locator('#navn').fill('Sara Poulsen');
  await page.locator('#tlf').fill('28871343');
  await page.locator('#tid').selectOption({ index: 1 });
  await page.locator('button.g.solid.blk').click();
  await expect(page.locator('#bestil .panel h3')).toContainText('Tak,');
}

test.describe('Beløbet på skærmen er beløbet i databasen', () => {
  const tilfaelde = [
    {
      navn: 'to varer uden tillæg',
      ind: {},
      kurv: [['Øl', 'Fadøl, lille', 2]],
      retter: 2,
    },
    {
      navn: 'med emballage ud af huset',
      ind: { emballage_pris: 10, emballage_kategorier: [9] },
      kurv: [['Øl', 'Fadøl, lille', 3]],
      retter: 3,
    },
    {
      navn: 'med to slags mad og emballage',
      ind: { emballage_pris: 10, emballage_kategorier: [1, 9] },
      kurv: [['Smørrebrød', 'Flæskestegssandwich', 2], ['Øl', 'Fadøl, lille', 1]],
      retter: 3,
    },
  ];

  for (const t of tilfaelde) {
    test(`${t.navn}: skærmen og rækken siger det samme`, async ({ page }) => {
      await åbnSkal(page, '/index.html',
        { ur: FREDAG, data: data({ indstillinger: t.ind }) });

      for (const [kat, vare, n] of t.kurv) await læg(page, kat, vare, n);

      /* Beløbet LÆSES af skærmen, før der sendes — det er dét,
         gæsten har set og regner med at skulle betale. */
      const paaSkaermen = beløbAf(await page.locator('#sumline').innerText());
      expect(paaSkaermen, 'sumlinjen viste intet beløb').not.toBeNull();

      await send(page);

      const gemt = await gemteData(page);
      expect(gemt.bestillinger).toHaveLength(1);
      const b = gemt.bestillinger[0];

      expect(sumAfRække(b),
        'gæsten så ét beløb, køkkenet fik et andet').toBe(paaSkaermen);

      /* ⚠️ OG RETTERNE ER IKKE PENGENE. Emballagen og fragten er
         linjer i regnskabet, ikke noget, køkkenet skal lave.
         Reglen bor i Butik.erEmballage; prøven her holder den op
         mod det, DEN har lagt i kurven. */
      const retter = (b.linjer || [])
        .filter((l) => !Butik_erEmballage(b, l))
        .reduce((s, l) => s + (Number(l.antal) || 0), 0);
      expect(retter, 'køkkenet ville lave emballagen som en ret').toBe(t.retter);
    });
  }

  /* Kopien af husets egen regel, skrevet HER med vilje: prøven
     må ikke spørge den funktion, den skal kontrollere. To
     kendetegn, som i Butik.erEmballage — flaget på linjen, og
     navnet for de gamle rækker. */
  function Butik_erEmballage(b, l) {
    if (l.emballage === true) return true;
    return /^(emballage|levering)$/i.test(String(l.navn || '').trim());
  }
});

/* ⚠️ OG DEN SAMME KÆDE PÅ SMØRREBRØDSSIDEN. De to formularer
   deler motor, men har hver sit udvalg og hver sit spørgsmål —
   og det er netop dér, to udgaver af den samme udregning ville
   skride fra hinanden uden at nogen af siderne så forkerte ud
   for sig selv. */
test.describe('Smørrebrødssiden regner det samme', () => {
  test('fire stykker og emballage giver det samme to steder',
    async ({ page }) => {
      const d = data({
        indstillinger: {
          emballage_pris: 10,
          emballage_kategorier: [1],
          bestilling_min_stk: 1,
        },
      });
      await åbnSkal(page, '/h-smorrebrod.html', { ur: FREDAG, data: d });

      /* ⚠️ VARERNE FINDES FØRST, NÅR FOLDEN ER ÅBEN. Første udgave
         ledte efter [data-vare] med det samme, fandt nul og
         SPRANG SIG SELV OVER — altså målte den ingenting og
         sagde "bestået" med grønt. En sprunget prøve er ikke en
         prøve. */
      await page.locator('[data-kategori="Smørrebrød"]').click();
      const kort = page.locator('[data-vare="Flæskestegssandwich"]');
      await expect(kort, 'varen kom ikke frem, da folden blev åbnet')
        .toBeVisible();
      for (let i = 0; i < 4; i++) {
        await kort.locator('button[data-d="+"]').click();
      }

      const paaSkaermen = beløbAf(await page.locator('#sumline').innerText());
      expect(paaSkaermen, 'sumlinjen viste intet beløb').not.toBeNull();

      await page.locator('#snavn').fill('Sara Poulsen');
      await page.locator('#stlf').fill('28871343');
      await page.locator('#stid').selectOption({ index: 1 });
      await page.locator('button.g.solid.blk').first().click();

      const gemt = await gemteData(page);
      expect(gemt.bestillinger, 'bestillingen blev ikke gemt').toHaveLength(1);
      const sum = (gemt.bestillinger[0].linjer || []).reduce(
        (s, l) => s + (Number(l.pris) || 0) * (Number(l.antal) || 0), 0);
      expect(sum, 'gæsten så ét beløb, køkkenet fik et andet').toBe(paaSkaermen);

      /* ⚠️ OG EMBALLAGEN SKAL FAKTISK VÆRE MED. Uden den her ville
         prøven bestå på en side, hvor tillægget slet ikke bliver
         lagt på — to nuller er også ens. */
      const harEmballage = (gemt.bestillinger[0].linjer || [])
        .some((l) => l.emballage === true
          || /^emballage$/i.test(String(l.navn || '').trim()));
      expect(harEmballage, 'emballagen kom aldrig med i bestillingen')
        .toBe(true);
    });
});
