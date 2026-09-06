/* ============================================================
   ÉN TALSTEMME I ADMIN OGSÅ  (6/9)
   ============================================================
   Kundens ord: *"I think you fixed the fonts and text and numbers
   on the public website, but we also need that fixed in admin ...
   it looks very generic with the numbers and the text, and it's
   not simplified enough."*

   Gæstesiden fik runden 5/9. Admin fik den ikke, og **målt i
   browseren** stod der tre stemmer for de samme slags tal:

   | hvad            | før                    |
   |-----------------|------------------------|
   | klokken (kortet)| Instrument Serif 400/30|
   | klokken (aksen) | Instrument Sans 700/19 |
   | dagens seks tal | Serif 42, UDEN tabular |

   Det er nøjagtig den fejl, gæstesiden havde, hvor det samme
   "89,-" stod i tre skrifter. Personalet skifter mellem de to
   faner hele dagen.

   ⚠️ OG SHORTHANDEN VAR SKYLD I DEN TREDJE. `font: 400 42px/1 …`
   nulstiller `font-variant-numeric`, så de seks tal i rækken
   havde hver sin bredde og sitrede, hver gang takten tegnede om.
   Samme fælde som `--overskrift` i en shorthand 24/8.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, visFane } = require('./hjaelp');

const IDAG = '2026-08-07';

function best(id, o) {
  return Object.assign({
    id, lokation_id: 'mosede', reference: 'SM260807-' + (10000 + id),
    navn: 'anna vind', telefon: '2030405' + (id % 10), email: null,
    hent_dato: IDAG, hent_tid: '12:15', antal: 2, status: 'ny',
    hvordan: 'afhentning', bord_nummer: null, slettet: null, fyld: [],
    linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
    intern_note: null, oprettet: '2026-08-07T08:00:00Z',
  }, o);
}

const stil = (l) => l.evaluate((e) => {
  const c = getComputedStyle(e);
  return {
    f: c.fontFamily.split(',')[0].replace(/"/g, ''),
    v: c.fontWeight,
    tab: /tabular/.test(c.fontVariantNumeric),
  };
});

test.describe('Én talstemme i admin', () => {
  test('klokken ser ens ud på Overblik og på Bestillinger', async ({ page }) => {
    /* ⚠️ TO FANER MOD HINANDEN. Et spørgsmål til den ene om dens
       egen skrift ville bestå, også hvis den anden var sans. */
    await åbnAdmin(page, { data: grunddata({ bestillinger: [best(1)] }) });
    await visFane(page, 'p-overblik');
    await page.waitForTimeout(500);
    const aksen = await stil(page.locator('.vagt-tid-tal').first());

    await visFane(page, 'p-bestillinger');
    await page.waitForTimeout(500);
    const kortet = await stil(page.locator('.bestil-tid').first());

    expect(aksen.f, 'to skrifter for det samme klokkeslæt').toBe(kortet.f);
    expect(aksen.v, 'to vægte for det samme klokkeslæt').toBe(kortet.v);
    /* Og det skal være HUSETS talstemme i admin, ikke bare ens:
       to sans'er ville også være ens. Serif'en er den, dagens seks
       tal og produktionens antal allerede står i. */
    expect(kortet.f).toBe('Instrument Serif');
  });

  test('alle tal, der står i en kolonne, har lige brede cifre', async ({ page }) => {
    /* ⚠️ DAGENS SEKS TAL ER DEN VIGTIGE. De står side om side, og
       et 1-tal er smallere end et 4-tal — så rækken sitrede, hver
       gang takten tegnede om. */
    await åbnAdmin(page, { data: grunddata({ bestillinger: [best(1)] }) });
    await visFane(page, 'p-overblik');
    await page.waitForTimeout(500);
    for (const v of ['.tal-tal', '.vagt-tid-tal', '.vagt-antal', '.prod-antal']) {
      const el = page.locator(v).first();
      if (!(await el.count())) continue;
      expect((await stil(el)).tab, v + ' har ikke tabular-nums').toBe(true);
    }
  });

  test('og ingen brøkdels-pixel i admins egne regler', () => {
    /* En halv pixel er en beslutning, ingen har taget: browseren
       runder den selv, og to naboer ender forskelligt. Samme
       skralde som havnegrillen.css fik 5/9.

       ⚠️ LOGOET ER UNDTAGET, og det er ikke en formalitet:
       `.crest .est` ER tegnet geometri, og et snap dér ændrer
       mærket. Første udgave af rettelsen ramte den — fanget ved
       at læse sit eget diff. */
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    /* ⚠️ OG `css/style.css` BÆRER BÅDE ADMIN OG FIRE GÆSTESIDER.
       Præfikset `bestil-` deles af de to: `.bestil-kort` er
       admins, `.bestil-fast` er den flydende pille på `bestil/`.
       En præfiks-regel kan altså ikke skelne, og første udgave af
       prøven fældede gæstens. Undtagelserne står ved navn med en
       grund, så listen ikke bare kan vokse. */
    const GAEST = ['.bestil-fast'];
    const broek = [];
    for (const [, sel, krop] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/personale|^\s*\.(adm|bestil|vagt|maerke|foresp|klokke|tal|prod)-/.test(sel)) continue;
      if (sel.includes('body:not(.personale)')) continue;   // gæstesiden
      if (sel.includes('.crest')) continue;                 // tegnet, ikke sat
      if (GAEST.some((g) => sel.includes(g))) continue;
      for (const [, v] of krop.matchAll(/font-size:\s*([^;}]+)/g)) {
        if (/^\d+\.\d+px$/.test(v.trim())) broek.push(sel.trim().slice(0, 40) + ' → ' + v.trim());
      }
    }
    expect(broek, 'en halv pixel i admin').toEqual([]);
  });

  test('logoets EST. 2025 er IKKE snappet — det er tegnet', () => {
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
    expect(css, 'kransens tekst blev snappet med — den er tegnet geometri')
      .toMatch(/\.crest \.est[^}]*font-size:\s*14\.5px/);
  });
});

test.describe('Klarheden på Overblik', () => {
  test('alarmstriben skriver navnet, som det siges højt', async ({ page }) => {
    /* Den RØDE linje øverst er den, personalet læser først, og den
       skrev "anna vind" med småt. Fjerde sted med samme mønster. */
    await åbnAdmin(page, {
      ur: '2026-08-07T13:00:00Z',
      data: grunddata({ bestillinger: [best(1, { navn: 'anna vind', hent_tid: '12:15' })] }),
    });
    await visFane(page, 'p-overblik');
    await page.waitForTimeout(600);
    const stribe = page.locator('#plan-alarm');
    await expect(stribe).toContainText('Anna Vind');
    await expect(stribe, 'navnet står stadig med småt').not.toContainText('anna vind');
  });

  test('klokkeslættet står én gang på rækken, ikke to', async ({ page }) => {
    /* ⚠️ SUMMEN, IKKE REGLEN. Kontaktlinjens "kl. 16.00 · 📞 …"
       kom fra hans forlæg, og tidsaksen til venstre kom fra hans
       forlæg samme dag. Hver for sig rigtige; sammen stod det
       samme klokkeslæt to gange, 30 px fra hinanden. Kunne kun
       ses på et skud. */
    await åbnAdmin(page, { data: grunddata({ bestillinger: [best(1, { hent_tid: '12:15' })] }) });
    await visFane(page, 'p-overblik');
    await page.waitForTimeout(600);
    const raekke = page.locator('#overblik-vagt .vagt-raekke').first();
    const tekst = await raekke.innerText();
    const gange = (tekst.match(/12\.15/g) || []).length;
    expect(gange, 'klokkeslættet står ' + gange + ' gange på den samme række').toBe(1);
    /* Og det er AKSEN, der blev — den, man skimmer ned ad. */
    await expect(raekke.locator('.vagt-tid-tal')).toContainText('12.15');
  });
});

test.describe('Typen siger det samme på begge faner', () => {
  test('en række på Overblik bærer PRÆCIS ét typemærke', async ({ page }) => {
    /* ⚠️ DEN MÅLTE FEJL (6/9), fundet på et skud og ikke ved at
       læse: vagtskærmen satte "🥡 To-go" på hver eneste
       luge-række OG lagde `hvordan` ved siden af. Altså stod der
       "🥡 To-go   🍽️ Spis her" på den samme bestilling — to
       mærker, der modsagde hinanden om, hvad personalet skulle
       gøre. Det er lige præcis kundens klage: *"I can't really
       tell what kind of order it is."* */
    await åbnAdmin(page, {
      data: grunddata({ bestillinger: [
        best(1, { navn: 'to go' }),
        best(2, { navn: 'spis her', hvordan: 'spis_her' }),
        best(3, { navn: 'leveres', hvordan: 'levering',
          leverings_adresse: 'Havnevej 4, 2670 Greve' }),
      ] }),
    });
    await visFane(page, 'p-overblik');
    await page.waitForTimeout(600);
    const raekker = page.locator('#overblik-vagt .vagt-raekke');
    await expect(raekker).toHaveCount(3);
    const antal = await raekker.evaluateAll((els) => els
      .map((e) => e.querySelectorAll('[data-type]').length));
    expect(antal, 'en række med nul eller to typemærker').toEqual([1, 1, 1]);
    /* Og de tre skal være FORSKELLIGE — ellers ville ét fast mærke
       på hver række også bestå tællingen ovenfor. */
    const slags = await raekker.locator('[data-type]')
      .evaluateAll((els) => els.map((e) => e.dataset.type));
    expect(slags).toEqual(['togo', 'spis_her', 'levering']);
  });

  test('og det er den SAMME type som på Bestillinger-fanen', async ({ page }) => {
    /* ⚠️ TO SKÆRME MOD HINANDEN. Et spørgsmål til Overblik om dens
       eget mærke ville bestå, også hvis Bestillinger sagde noget
       andet — og personalet skifter mellem de to hele dagen.
       Reglen bor i Admin.typeMaerke, som begge spørger. */
    await åbnAdmin(page, {
      data: grunddata({ bestillinger: [best(1, { navn: 'bettina holm larsen',
        hvordan: 'levering', leverings_adresse: 'Havnevej 4, 2670 Greve' })] }),
    });
    await visFane(page, 'p-overblik');
    await page.waitForTimeout(600);
    const paaOverblik = await page.locator('#overblik-vagt [data-type]').first().textContent();

    await visFane(page, 'p-bestillinger');
    await page.waitForTimeout(600);
    const paaFanen = await page.locator('#bestillinger-liste [data-type]').first().textContent();

    expect(paaOverblik.trim(), 'de to faner siger hver sit om den samme bestilling')
      .toBe(paaFanen.trim());
    /* ⚠️ OG DEN SKAL VÆRE RIGTIG, IKKE BARE ENS. En sammenligning
       fanger kun uenighed, ikke en fælles fejl — samme lære som
       navneprøven i bestillinger-fanen.spec.js. */
    expect(paaFanen, 'en levering står ikke som en levering').toContain('Leveres');
  });

  test('en FÆRDIG levering står stadig som en levering', async ({ page }) => {
    /* ⚠️ TREDJE KOPI AF DEN SAMME REGEL. "Færdige" på Overblik
       havde sin egen: bord ELLER to-go. En levering, der var kørt
       ud, stod altså i bunken som "To-go" — og skulle nogen ringe
       om den bagefter, ville skærmen sige, at gæsten selv havde
       hentet den. */
    await åbnAdmin(page, {
      data: grunddata({ bestillinger: [best(1, { navn: 'jens ove',
        status: 'afhentet', hvordan: 'levering',
        leverings_adresse: 'Havnevej 4, 2670 Greve' })] }),
    });
    await visFane(page, 'p-overblik');
    await page.waitForTimeout(600);
    /* ⚠️ BUNKEN STÅR I EN FOLD — åbn den, som personalet gør.
       En prøve, der læser gennem et lukket <details>, måler
       ingenting på den vej, en finger faktisk går. */
    const sum = page.locator('#faerdige-kort summary').first();
    if (await sum.count()) await sum.click();
    await page.waitForTimeout(300);
    const faerdig = page.locator('#overblik-faerdige .faerdig-raekke').first();
    await expect(faerdig).toHaveCount(1);
    await expect(faerdig.locator('[data-type]')).toHaveText(/Leveres/);
  });
});
