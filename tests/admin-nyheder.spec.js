/* NYHEDER, DER TÆNDER OG SLUKKER SIG SELV

   "Live musik på molen · lørdag 22. august" skal væk om søndagen.
   Uden datoer skal NOGEN huske det — og det er den slags, ingen
   husker, når der er travlt. En nyhed om en fredag, der stadig
   står i november, får gæsten til at holde op med at læse
   nyhederne overhovedet.

   TOM BETYDER ALTID: alt det, der allerede står, bliver stående.

   Reglen står ÉT sted — Butik.nyhedSynlig — så forsiden,
   nyhedssiden og admin ikke kan blive uenige om, hvad gæsten ser.

   ⚠️ Kræver supabase/nyheder-fra-til.sql kørt (7 × BESTOD lokalt).

   Uret i åbnAdmin står på fredag den 7. august 2026. */

const { test, expect } = require('@playwright/test');
const { åbn, åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const I_DAG = '2026-08-07';

function nyhed(æ) {
  return Object.assign({
    id: 1, lokation_id: 'mosede', titel: 'Friske rødspætter',
    tekst: 'Hele ugen, mens de er der.', dato: '2026-08-05',
    aktiv: true, vis_fra: null, vis_til: null,
    oprettet: '2026-08-05T09:00:00Z',
  }, æ);
}

async function nyhedsfanen(page, nyheder) {
  await åbnAdmin(page, { data: grunddata({ nyheder: nyheder }) });
  await visFane(page, 'p-nyheder');
}

test.describe('Vinduet i admin', () => {

  test('en nyhed uden datoer står som "vises nu"', async ({ page }) => {
    await nyhedsfanen(page, [nyhed()]);
    await expect(page.locator('#nyheder-liste')).toContainText('Vises nu');
  });

  test('en nyhed, der endnu ikke er begyndt, står som "venter"', async ({ page }) => {
    await nyhedsfanen(page, [nyhed({ vis_fra: '2026-08-20' })]);
    await expect(page.locator('#nyheder-liste')).toContainText('Venter');
    await expect(page.locator('#nyheder-liste')).toContainText('20. august');
  });

  /* DEN VIGTIGSTE AF DE FIRE. Uden ordet "udløbet" skal ejeren
     åbne hjemmesiden for at finde ud af, om nyheden stadig står
     der — og "hvorfor kan jeg ikke se den?" er så et opkald. */
  test('en udløbet nyhed siger det, i stedet for bare at være væk', async ({ page }) => {
    await nyhedsfanen(page, [nyhed({ vis_til: '2026-08-01' })]);
    await expect(page.locator('#nyheder-liste')).toContainText('Udløbet');
    await expect(page.locator('#nyheder-liste')).toContainText('1. august');
  });

  test('datoerne kan sættes på en nyhed, der allerede står der', async ({ page }) => {
    await nyhedsfanen(page, [nyhed()]);
    await page.locator('#nyheder-liste input[type="date"]').nth(1).fill('2026-08-22');
    await page.locator('#nyheder-liste button', { hasText: 'Gem datoer' }).click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const gemt = await gemteData(page);
    expect(gemt.nyheder[0].vis_til).toBe('2026-08-22');
  });

  /* ⚠️ DER SKAL LIGGE EN RÆKKE I FORVEJEN (28/8).

     Datofelterne findes kun, når kolonnen gør, og svaret læses af
     DET, DATABASEN HAR SVARET. Med en tom liste er der ingen
     nøgler at læse, og så skjuler felterne sig — se maaVindue().
     Rækken her er altså ikke pynt: den er den oplysning, der
     siger, at kolonnen er der. */
  test('en nyhed kan lægges ind med et vindue med det samme', async ({ page }) => {
    await nyhedsfanen(page, [nyhed({ id: 9, titel: 'Står der i forvejen' })]);
    await page.locator('#ny-titel').fill('Live musik på molen');
    await page.locator('#ny-tekst').fill('Lørdag aften.');
    await page.locator('#ny-til').fill('2026-08-22');
    await page.locator('#tilfoej-nyhed').click();
    await expect(page.locator('#kvittering')).toContainText('22. august');

    const gemt = await gemteData(page);
    const ny = gemt.nyheder.find((n) => n.titel === 'Live musik på molen');
    expect(ny.vis_til).toBe('2026-08-22');
    expect(ny.vis_fra).toBe(null);
  });

  test('et baglæns vindue bliver afvist', async ({ page }) => {
    /* Samme regel som nyhed_vindue_ok i databasen. En nyhed, der
       slutter før den begynder, er ikke farlig — den er bare
       usynlig, og så leder nogen efter en fejl i koden. */
    await nyhedsfanen(page, [nyhed({ id: 9, titel: 'Står der i forvejen' })]);
    await page.locator('#ny-titel').fill('Baglæns');
    await page.locator('#ny-tekst').fill('Slutter før den begynder.');
    await page.locator('#ny-fra').fill('2026-08-20');
    await page.locator('#ny-til').fill('2026-08-10');
    await page.locator('#tilfoej-nyhed').click();
    await expect(page.locator('#fejl')).toContainText('ligger før');

    const gemt = await gemteData(page);
    expect(gemt.nyheder || []).toHaveLength(1);   // kun den, der lå der i forvejen
  });
});

test.describe('Vinduet på gæstesiden', () => {

  /* Reglen står ét sted, men den skal virke ALLE de steder,
     nyhederne læses: den nye forside, den gamle forside og
     nyhedssiden. Tre kopier af filteret ville langsomt komme til
     at vise tre forskellige ting. */
  test('forsiden viser ikke en udløbet nyhed', async ({ page }) => {
    const d = grunddata({
      nyheder: [
        nyhed({ id: 1, titel: 'Skal væk', vis_til: '2026-08-01' }),
        nyhed({ id: 2, titel: 'Skal blive', dato: '2026-08-06' }),
      ],
    });
    await åbnSkal(page, '/index.html', { ur: I_DAG + 'T11:00:00Z', data: d });

    const afsnit = page.locator('#nyheder');
    await expect(afsnit).toContainText('Skal blive');
    await expect(afsnit).not.toContainText('Skal væk');
  });

  test('forsiden viser ikke en nyhed, der først begynder senere', async ({ page }) => {
    const d = grunddata({
      nyheder: [
        nyhed({ id: 1, titel: 'Kommer senere', vis_fra: '2026-09-01' }),
        nyhed({ id: 2, titel: 'Er her nu', dato: '2026-08-06' }),
      ],
    });
    await åbnSkal(page, '/index.html', { ur: I_DAG + 'T11:00:00Z', data: d });
    await expect(page.locator('#nyheder')).toContainText('Er her nu');
    await expect(page.locator('#nyheder')).not.toContainText('Kommer senere');
  });

  /* ⚠️ SPRUNGET OVER: /nyheder/ er en vejviser nu (30/8).

     Siden sender videre til forsidens #nyheder-afsnit, og præcis
     den regel — Butik.nyhedSynlig, ét sted — måles af prøven
     lige ovenfor på /index.html. Der er ikke to gæsteflader til
     nyhederne længere, og derfor heller ikke to steder, de kan
     komme til at sige hver sit. */
  test.skip('nyhedssiden følger den samme regel', async ({ page }) => {
    const d = grunddata({
      nyheder: [
        nyhed({ id: 1, titel: 'Udløbet nyhed', vis_til: '2026-08-01' }),
        nyhed({ id: 2, titel: 'Gyldig nyhed', dato: '2026-08-06' }),
      ],
    });
    await åbn(page, '/nyheder/', { ur: I_DAG + 'T11:00:00Z', data: d });
    await expect(page.locator('body')).toContainText('Gyldig nyhed');
    await expect(page.locator('body')).not.toContainText('Udløbet nyhed');
  });

  /* EN NYHED, DER GÆLDER PRÆCIS I DAG, SKAL VISES. Grænserne er
     med — et > i stedet for >= ville slukke "Live musik i dag"
     præcis den dag, den handler om. */
  test('en nyhed, der slutter I DAG, står der stadig', async ({ page }) => {
    const d = grunddata({
      nyheder: [nyhed({ titel: 'Sidste dag', vis_fra: I_DAG, vis_til: I_DAG })],
    });
    await åbnSkal(page, '/index.html', { ur: I_DAG + 'T11:00:00Z', data: d });
    await expect(page.locator('#nyheder')).toContainText('Sidste dag');
  });
});

/* ============================================================
   SLAGSEN, FORHÅNDSVISNINGEN OG DET DESIGNEDE FELT
   ------------------------------------------------------------
   Kundens ord (26/8): hver gang de lægger en nyhed op, skal den
   være "så tæt på ... som hvis du gjorde det" — ikke bare
   standardbillede og tekst.

   ⚠️ Kræver supabase/nyheder-slags-og-billede.sql. Indtil den er
   kørt, findes kolonnerne ikke, og fanen skal opføre sig som før.
   Filen måler BEGGE tilstande.
   ============================================================ */

// Som databasen ser ud, FØR ejeren har kørt filen.
function udenSlags(æ) {
  const n = nyhed(æ);
  delete n.slags; delete n.detaljer; delete n.billede;
  return n;
}

// …og efter.
function medSlags(æ) {
  return Object.assign(nyhed(), { slags: 'andet', detaljer: null, billede: null }, æ);
}

const SPAND = 'https://epwyjzakvvbxtpvnhvbn.supabase.co/storage/v1/object/public/nyheder/';

test.describe('Slagsen skriver nyheden', () => {

  test('et valg fylder overskrift og tekst ud af sig selv', async ({ page }) => {
    await nyhedsfanen(page, [medSlags()]);

    await page.locator('#ny-slags [data-slags="musik"]').click();
    await page.locator('#ny-d-hvem').fill('Jonas & Band');
    await page.locator('#ny-d-hvornaar').fill('lørdag kl. 19');

    await expect(page.locator('#ny-titel')).toHaveValue('Live musik: Jonas & Band');
    await expect(page.locator('#ny-tekst'))
      .toHaveValue(/Jonas & Band spiller lørdag kl\. 19/);
  });

  /* ⚠️ FORSLAGET HOLDER OP MED AT VÆRE ET FORSLAG, når nogen har
     rettet. Ellers ville en overskrift, personalet lige havde
     skrevet om, blive overskrevet ved næste tastetryk i et
     detaljefelt — midt i en sætning. */
  test('… men ikke når personalet har rettet den', async ({ page }) => {
    await nyhedsfanen(page, [medSlags()]);

    await page.locator('#ny-slags [data-slags="musik"]').click();
    await page.locator('#ny-d-hvem').fill('Jonas');
    await page.locator('#ny-titel').fill('Jazz på molen');
    await page.locator('#ny-d-hvem').fill('Jonas & Band');

    await expect(page.locator('#ny-titel')).toHaveValue('Jazz på molen');
  });

  test('slagsen gemmes med nyheden', async ({ page }) => {
    await nyhedsfanen(page, [medSlags()]);

    await page.locator('#ny-slags [data-slags="ret"]').click();
    await page.locator('#ny-d-ret').fill('Stegt rødspætte');
    await page.locator('#tilfoej-nyhed').click();
    await expect(page.locator('#kvittering')).toContainText('på siden');

    const gemt = await gemteData(page);
    const ny = gemt.nyheder.find((n) => n.titel === 'Stegt rødspætte er på kortet');
    expect(ny.slags).toBe('ret');
    expect(ny.detaljer).toEqual({ ret: 'Stegt rødspætte' });
  });

  /* ET TRYK PÅ SKJUL MÅ IKKE ÆNDRE NOGET ANDET.

     ⚠️ Reglen bor i skrivelaget, ikke i medUaendret(): de tre
     nye kolonner sendes kun med, når kalderen HAR dem, og både
     PATCH og øvetilstandens Object.assign lader resten stå.
     Prøven her er set BESTÅ, da medUaendret's kopiering blev
     fjernet — det var dét, der viste, hvor reglen faktisk bor.
     Den, der måler skrivelagets regel, er "et gem sender ikke de
     kolonner, der ikke findes" længere nede. */
  test('Skjul ændrer ikke slags, detaljer og billede', async ({ page }) => {
    await nyhedsfanen(page, [medSlags({
      slags: 'musik', detaljer: { hvem: 'Jonas' }, billede: SPAND + 'a.jpg',
    })]);

    await page.locator('#nyheder-liste').getByRole('button', { name: 'Skjul' }).click();
    await expect(page.locator('#kvittering')).toContainText('skjult');

    const n = (await gemteData(page)).nyheder[0];
    expect(n.aktiv).toBe(false);
    expect(n.slags).toBe('musik');
    expect(n.detaljer).toEqual({ hvem: 'Jonas' });
    expect(n.billede).toBe(SPAND + 'a.jpg');
  });
});

/* ⚠️ BILLEDVÆRNET STÅR BEGGE STEDER.

   Databasen afviser en adresse uden for vores egen spand (se
   proev-nyheder-slags-og-billede.sql, prøve 11-17), og browseren
   gør det samme. Det er ikke et ekko: en formular kan omgås med
   to linjer i konsollen, og en database kan man ikke tale
   udenom — men en browser, der sender noget, databasen afviser,
   giver personalet en fejl, de ikke kan gøre noget ved.

   En adresse ude i verden ville få forsiden til at hente et
   billede fra en server, vi ikke kender, og javascript: i et
   src-felt er den klassiske vej ind. */
test.describe('Billedet må kun komme fra vores egen spand', () => {

  const NEJ = [
    ['et fremmed domæne', 'https://eksempel.dk/fremmed.jpg'],
    ['en anden spand i vores projekt',
      'https://epwyjzakvvbxtpvnhvbn.supabase.co/storage/v1/object/public/andet/a.jpg'],
    ['http i stedet for https',
      'http://epwyjzakvvbxtpvnhvbn.supabase.co/storage/v1/object/public/nyheder/a.jpg'],
    ['en javascript-adresse', 'javascript:alert(1)'],
  ];

  NEJ.forEach(function (par) {
    test(par[0] + ' bliver kasseret', async ({ page }) => {
      await åbnAdmin(page, { data: grunddata({ nyheder: [] }) });
      await page.evaluate((url) => Butik.skrive.nyhed({
        titel: 'Prøve', tekst: 'Prøve', billede: url,
      }), par[1]);
      expect((await gemteData(page)).nyheder[0].billede).toBe(null);
    });
  });

  /* Modstykket. Uden den måler prøverne ovenfor kun, at feltet
     altid bliver tømt. */
  test('vores egen spand går igennem', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata({ nyheder: [] }) });
    await page.evaluate((url) => Butik.skrive.nyhed({
      titel: 'Prøve', tekst: 'Prøve', billede: url,
    }), SPAND + 'a.jpg');
    expect((await gemteData(page)).nyheder[0].billede).toBe(SPAND + 'a.jpg');
  });
});

test.describe('Uden SQL-filen opfører fanen sig som før', () => {

  test('uploadfeltet findes ikke', async ({ page }) => {
    await nyhedsfanen(page, [udenSlags()]);
    await expect(page.locator('#ny-billede-felt')).toBeHidden();
  });

  /* ⚠️ OG ET GEM MÅ IKKE SENDE KOLONNER, DER IKKE FINDES. Gjorde
     det det, ville hvert eneste gem fejle med "column slags does
     not exist", til filen var kørt. */
  test('et gem sender ikke de kolonner, der ikke findes', async ({ page }) => {
    await nyhedsfanen(page, [udenSlags()]);
    await page.locator('#ny-titel').fill('En helt almindelig nyhed');
    await page.locator('#ny-tekst').fill('Med en helt almindelig tekst.');
    await page.locator('#tilfoej-nyhed').click();
    await expect(page.locator('#kvittering')).toContainText('på siden');

    const ny = (await gemteData(page)).nyheder
      .find((n) => n.titel === 'En helt almindelig nyhed');
    expect('slags' in ny).toBe(false);
    expect('billede' in ny).toBe(false);
  });
});

test.describe('Forhåndsvisningen', () => {

  test('viser det, der skrives', async ({ page }) => {
    await nyhedsfanen(page, [medSlags()]);
    await page.locator('#ny-titel').fill('Havnens tapas er landet');
    await expect(page.locator('#ny-forhaand .fh-titel'))
      .toHaveText('Havnens tapas er landet');
  });

  test('og slagsens felt i stedet for en tom firkant', async ({ page }) => {
    await nyhedsfanen(page, [medSlags()]);
    await page.locator('#ny-slags [data-slags="musik"]').click();
    const felt = page.locator('#ny-forhaand .fh-felt');
    await expect(felt).toHaveClass(/s-musik/);
    await expect(felt).toHaveText('🎵');
  });
});

/* ============================================================
   ⚠️ DEN TOMME BEIGE FIRKANT PÅ FORSIDEN
   ------------------------------------------------------------
   Designets .nw har en <image-slot> — 170 px høj, flad cream2.
   Uden et foto var det bogstavelig talt en tom kasse, og det var
   dét, kunden kaldte "bare standard billede og tekst".
   ============================================================ */
test.describe('Gæstens nyhedskort', () => {

  test('en nyhed med slags får slagsens felt, ikke en tom kasse', async ({ page }) => {
    await åbnSkal(page, '/', {
      data: grunddata({ nyheder: [medSlags({ slags: 'musik' })] }),
    });
    const kort = page.locator('#nyheder .nw').first();
    await expect(kort.locator('.nw-felt')).toHaveClass(/s-musik/);
    await expect(kort.locator('.nw-felt')).toHaveText('🎵');
    await expect(kort.locator('image-slot')).toHaveCount(0);
  });

  test('en nyhed med foto får fotoet', async ({ page }) => {
    await åbnSkal(page, '/', {
      data: grunddata({ nyheder: [medSlags({ billede: SPAND + 'a.jpg' })] }),
    });
    const kort = page.locator('#nyheder .nw').first();
    await expect(kort.locator('img.nw-foto')).toHaveAttribute('src', SPAND + 'a.jpg');
    await expect(kort.locator('image-slot')).toHaveCount(0);
  });

  /* ⚠️ REGLEN ER LAVET OM (29/8), OG DET VAR EN RETTELSE.

     Her stod, at designets egen plads blev stående uden en slags
     — "en gammel nyhed må ikke gå i stykker, fordi en kolonne
     mangler". Tanken var rigtig, virkningen var ikke: en tom
     <image-slot> er ikke ingenting, den er en STIPLET GRÅ KASSE
     med "Foto eller opslag" i midten.

     Og slagsen mangler præcis, indtil ejeren har kørt
     supabase/nyheder-slags-og-billede.sql. Altså stod kassen
     dér, hvor kolonnen ikke er — den situation, prøven skulle
     dække. Det var det, kunden så: "kedeligt hele vejen ned".

     📣 lover ingenting om nyhedens indhold, og det er derfor,
     det er det rigtige tegn at falde ned på. Kortet er helt,
     også før SQL-filen er kørt. */
  test('uden slags får kortet det neutrale tegn — ikke en tom kasse', async ({ page }) => {
    await åbnSkal(page, '/', {
      data: grunddata({ nyheder: [udenSlags()] }),
    });
    const kort = page.locator('#nyheder .nw').first();
    await expect(kort.locator('image-slot')).toHaveCount(0);
    await expect(kort.locator('.nw-felt')).toHaveText('📣');
    // Slagsens egen farve kan vi ikke kende — så falder den ned
    // på den neutrale flade, ikke på en gættet.
    await expect(kort.locator('.nw-felt')).toHaveClass(/s-andet/);
  });
});

/* ⚠️ NYHEDSFANEN MÅ IKKE SPRÆNGE SKÆRMEN PÅ EN TELEFON.

   MÅLT: de to datofelter på hver nyhed var 489 px brede på en
   skærm på 390, og hele admin-siden blev derfor lagt ud i 530 px.
   Alt under dem stod så et andet sted, end det så ud til — et
   tryk på "Læg på siden" ramte forhåndsvisningen.

   Admin er computer- og iPad-først (CLAUDE.md), men "ikke bygget
   til en telefon" er ikke det samme som "må gå i stykker på en".

   ⚠️ TALLET SKAL KOMME UDEFRA. window.innerWidth vokser MED
   indholdet på en telefon — det er hele pointen i noten om
   striben, der kunne være 900 px bred på en skærm på 390.
   Playwrights viewport er det tal, der kommer udefra. */
test('fanen kan ikke rulles sidelæns på en telefon', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobil', 'måles kun på en telefon');
  await nyhedsfanen(page, [medSlags(), medSlags({ id: 2, titel: 'En anden' })]);
  await page.locator('#ny-slags [data-slags="musik"]').click();

  const bredde = testInfo.project.use.viewport.width;
  const doc = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(doc, 'siden er bredere end telefonen').toBeLessThanOrEqual(bredde);
});

/* ============================================================
   DEN, DER STOD I PRODUKTIONEN  (28/8)

   Ejeren kunne ikke lægge en nyhed op. Skærmen sagde:

     Kunne ikke gemme (400). {"code":"PGRST204","details":null,
     "hint":null,"message":"Could not find the 'vis_fra' column
     of 'nyheder' in the schema cache"}

   To fejl i én: supabase/nyheder-fra-til.sql var ikke kørt, OG
   koden sendte kolonnen med alligevel — lige over tre felter, der
   gør det rigtigt, og en note, der advarede ordret mod præcis
   den fejl.
   ============================================================ */
test.describe('Nyheder virker, før SQL-filen er kørt', () => {

  /* En database UDEN kolonnerne: rækkerne har dem slet ikke.
     Det er sådan, øvetilstanden — og PostgREST — ser en tabel,
     hvor filen ikke er kørt. */
  function udenVindue(ekstra) {
    const n = nyhed(Object.assign({ id: 1, titel: 'Står der i forvejen' }, ekstra));
    delete n.vis_fra;
    delete n.vis_til;
    return n;
  }

  test('datofelterne findes ikke, når kolonnen ikke gør', async ({ page }) => {
    await nyhedsfanen(page, [udenVindue()]);
    await expect(page.locator('#ny-vindue')).toHaveClass(/skjult/);
    await expect(page.locator('#nyheder-liste .nyhed-vindue')).toHaveCount(0);
  });

  /* ⚠️ DET VIGTIGE: nyheden skal kunne oprettes ALLIGEVEL.
     Prøven er set fejle med den gamle udgave — dér blev vis_fra
     sendt med, og øvetilstanden kastede som databasen. */
  test('og en nyhed kan lægges op alligevel', async ({ page }) => {
    await nyhedsfanen(page, [udenVindue()]);
    await page.locator('#ny-titel').fill('Live musik på molen');
    await page.locator('#ny-tekst').fill('Lørdag aften.');
    await page.locator('#tilfoej-nyhed').click();
    await expect(page.locator('#kvittering')).toContainText('på siden');

    const gemt = await gemteData(page);
    const ny = gemt.nyheder.find((n) => n.titel === 'Live musik på molen');
    expect(ny, 'nyheden blev ikke oprettet').toBeTruthy();
    /* Og kolonnen er IKKE skrevet. En tom værdi ville være en
       kolonne, databasen ikke kender. */
    expect(Object.prototype.hasOwnProperty.call(ny, 'vis_fra')).toBe(false);
  });

  test('og en eksisterende kan stadig skjules og vises', async ({ page }) => {
    await nyhedsfanen(page, [udenVindue()]);
    await page.locator('#nyheder-liste button', { hasText: 'Skjul' }).first().click();
    await expect(page.locator('#kvittering')).toContainText('skjult');

    const gemt = await gemteData(page);
    expect(gemt.nyheder[0].aktiv).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(gemt.nyheder[0], 'vis_fra')).toBe(false);
  });

  /* Og så snart filen ER kørt, kommer felterne af sig selv —
     svaret læses af det, databasen har svaret. */
  test('men de er der, så snart kolonnen er', async ({ page }) => {
    await nyhedsfanen(page, [nyhed({ id: 1 })]);
    await expect(page.locator('#ny-vindue')).not.toHaveClass(/skjult/);
    await expect(page.locator('#nyheder-liste .nyhed-vindue')).toHaveCount(1);
  });
});

/* ============================================================
   FEJLEN SKAL SIGE, HVAD MAN GØR VED DEN

   Skærmen viste en rå JSON-blok. Ejeren står med en iPad og skal
   lægge en nyhed op, og der var ikke ét ord om, at svaret er en
   SQL-fil, han selv skal køre.
   ============================================================ */
test.describe('Databasefejl oversættes', () => {

  test('en manglende kolonne peger på filen, der lægger den ind',
    async ({ page }) => {
      await åbnAdmin(page, { data: grunddata() });
      const svar = await page.evaluate(() => window.Admin.forklarFejl(new Error(
        'Kunne ikke gemme (400). {"code":"PGRST204","message":'
        + '"Could not find the \'vis_fra\' column of \'nyheder\' in the schema cache"}')));
      expect(svar).toContain('vis_fra');
      expect(svar).toContain('supabase/nyheder-fra-til.sql');
      expect(svar).not.toContain('PGRST204');
    });

  /* ⚠️ DEN GÆTTER IKKE ET FILNAVN. Kender vi ikke kolonnen,
     siger vi tabellen og lader være — et opfundet filnavn ville
     sende nogen ud at lede efter en fil, der ikke findes. */
  test('og en ukendt kolonne får ikke et opfundet filnavn', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    const svar = await page.evaluate(() => window.Admin.forklarFejl(new Error(
      "Could not find the 'noget_nyt' column of 'nyheder' in the schema cache")));
    expect(svar).toContain('noget_nyt');
    expect(svar).not.toContain('supabase/');
  });

  test('og alt andet står, som databasen skrev det', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    const svar = await page.evaluate(() => window.Admin.forklarFejl(
      new Error('Netværket svarede ikke.')));
    expect(svar).toBe('Netværket svarede ikke.');
  });
});
