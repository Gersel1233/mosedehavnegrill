/* SMØRREBRØDSSIDEN BESTILLER IGEN  (4/9)

   Kundens ord: siden *"blir næsten om det er en forkostordning —
   det er helt almindelig bestilling"*, *"opdelingen imellem
   smørbrødne skal være bedre"*, *"der skal komme hvad man har
   valgt, og pris"*, *"minimum bestille 4 smørrebrød ... og ikke
   må kunne gå under"*, og *"levering der tjekker at det er
   korrekt ift omegn og regner fragten oveni plus maden som står
   og eventuelt embelage"*.

   ⚠️ FILEN ER IKKE DEN GAMLE GENOPLIVET. tests-gamle/
   skal-smoerrebroed.spec.js har 24 prøver, og de fjorten af dem
   måler STØRRELSESMODELLEN (hel skive 55 / håndmad 27 med det
   samme fyld) og ØNSKEFYLDET — begge dele lukkede kunden 31/8
   med "1 mad er som 1 mad". De bliver liggende parkeret.

   Det, der er hentet med herfra, er reglerne, ingen anden fil
   måler: at levering ikke tilbydes, før ejeren har sagt ja, at
   en levering aldrig bekræftes af sig selv, og at varslet er
   reglens tal og ikke designets tekst.

   Resten er nyt 4/9 og hører til den her side alene. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';

/* Ejerens egne to kategorier. Kortene SMØRREBRØD og HÅNDMADDER
   lister det samme fyld til hver sin pris — og håndmadden bærer
   suffikset ", håndmad", fordi de to navneværn i databasen slår
   op på lower(btrim(navn)) PÅ TVÆRS af kategorier (1/9). */
const SLAGS = ['Leverpostej med baconsvøb', 'Dyrlægens natmad', 'Rejemad',
  'Roastbeef med remoulade', 'Flæskesteg med surt'];

function data(ændringer) {
  const d = grunddata();
  d.indstillinger.bestilling_varsel_timer = 2;
  d.menu_kategorier = [
    { id: 13, afdeling: 'mad', navn: 'Smørrebrød', sortering: 1, aktiv: true },
    { id: 14, afdeling: 'mad', navn: 'Håndmadder', sortering: 2, aktiv: true },
  ];
  d.menu_varer = [];
  SLAGS.forEach((n, i) => {
    d.menu_varer.push({
      id: 100 + i, kategori_id: 13, navn: n, beskrivelse: null, pris: 55,
      fremhaevet: false, udsolgt: false, sortering: i + 1, aktiv: true,
    });
    d.menu_varer.push({
      id: 200 + i, kategori_id: 14, navn: n + ', håndmad', beskrivelse: null,
      pris: 27, fremhaevet: false, udsolgt: false, sortering: 100 + i, aktiv: true,
    });
  });
  d.indstillinger.bestilbare_kategorier = [13, 14];
  return Object.assign(d, ændringer || {});
}

function medLevering(ændringer) {
  const d = data();
  d.indstillinger.levering = true;
  d.indstillinger.leverings_gebyr = 79;
  d.indstillinger.leverings_postnr = [2635, 2670, 2680, 2690, 4030, 4600, 4623];
  return Object.assign(d, ændringer || {});
}

async function åbn(page, d) {
  await åbnSkal(page, '/h-smorrebrod.html', { ur: FREDAG, data: d || data() });
}

/* Folder en kategori ud, som en finger gør det.

   ⚠️ KUN HVIS DEN ER LUKKET. Er den åben, LUKKER et tryk den —
   og så leder næste linje efter en vare, der ikke er på skærmen.
   Kostede to prøver, første gang filen blev kørt. */
async function foldUd(page, kategori) {
  const fold = page.locator('#bestil .item', { hasText: kategori }).first();
  /* ⚠️ [data-add] OG IKKE .add — OG IKKE "visible". To fælder,
     og de kostede hver sin kørsel:

       1) designets egen skabelonrække i HTML'en har også en
          .add, der siger "+ tilføj". Kun motorens egne bærer
          data-add, så det er DEN, der beviser, at folden er
          tegnet. Uden ventetiden faldt prøven sjældent og bestod
          hver gang alene — samme slags som dagstribens klik 1/9.
       2) og teksten SKJULES, så snart der ligger noget i
          kategoriens kurv (så står der "2 valgt" i stedet).
          En "vent til den er synlig" hang derfor for evigt på
          anden runde. textContent kan læses på et skjult
          element; det kan et klik ikke. */
  const knap = fold.locator('[data-add]');
  await knap.waitFor({ state: 'attached' });
  if ((await knap.textContent()).indexOf('luk') === -1) await fold.click();
}

/* Fylder kurven som en finger gør det. */
async function tælOp(page, kategori, vare, n) {
  await foldUd(page, kategori);
  const plus = page.locator('[data-vare="' + vare + '"] button[data-d="+"]');
  await plus.waitFor({ state: 'visible' });
  for (let i = 0; i < n; i += 1) await plus.click();
  // ⚠️ Og vent på, at tallet ER landet, før prøven måler noget.
  await expect(page.locator('[data-vare="' + vare + '"] [data-step] b'))
    .not.toHaveText('0');
}

async function udfyld(page) {
  await page.locator('#snavn').fill('Sara Poulsen');
  await page.locator('#stlf').fill('28871343');
}

test.describe('Siden bestiller — den spørger ikke', () => {

  /* ⚠️ DEN HER VENDER FORESPØRGSELSPRØVEN FRA 31/8 PÅ HOVEDET, og
     det er kundens egen beslutning, ikke en forældet prøve.
     Formularen skal være der; det er hele ordren 4/9. */
  test('motoren er der: dagvælger, tidsvælger og tællere', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('#sdato')).toHaveCount(1);
    await expect(page.locator('#stid')).toHaveCount(1);
    await foldUd(page, 'Smørrebrød');
    await expect(page.locator('#bestil [data-step]').first()).toBeVisible();
    // Og knappen sender — den skriver ikke en mail.
    await expect(page.locator('#ssend')).toContainText('Send bestilling');
  });

  /* ⚠️ ANKERET SKAL PEGE PÅ NOGET, DER FINDES. Pillen hed
     "Få et tilbud" og pegede på #forespoerg, som ikke findes
     mere — gennemgangens regel 8, målt på siden selv. */
  test('den flydende pille fører ned i bestillingen', async ({ page }) => {
    await åbn(page);
    const pille = page.locator('#bestil-pill');
    await expect(pille).toHaveAttribute('href', '#bestil');
    await expect(page.locator('#bestil')).toHaveCount(1);
  });
});

test.describe('Sortimentet er delt i folder', () => {

  /* Kundens ord: "opdelingen imellem smørbrødne skal være bedre"
     og "telefon opdelt sortiemtn valg".

     ⚠️ PRØVEN MÅLER, AT VARERNE ER SKJULT FØR ET TRYK. Et
     spørgsmål til opsætningen om dens eget folder-flag ville
     bestå, også hvis folden aldrig blev tegnet. */
  test('kategorierne står som folder, ikke som 10 løse rækker', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('#bestil .item', { hasText: 'Smørrebrød' }).first())
      .toBeVisible();
    await expect(page.locator('#bestil .item', { hasText: 'Håndmadder' }).first())
      .toBeVisible();
    // Varen findes ikke, før folden er åbnet.
    await expect(page.locator('[data-vare="Rejemad"]')).toHaveCount(0);

    await page.locator('#bestil .item', { hasText: 'Smørrebrød' }).first().click();
    await expect(page.locator('[data-vare="Rejemad"]')).toBeVisible();
    // Håndmadden ligger stadig i sin egen fold.
    await expect(page.locator('[data-vare="Rejemad, håndmad"]')).toHaveCount(0);
  });
});

test.describe('Mindsteantallet står, før kurven fyldes', () => {

  /* ⚠️ REGLEN HAR HOLDT SIDEN 30/8 — den svarede bare først på
     Send-knappen, altså efter dag, tid, navn og nummer. Et krav,
     man møder som et afslag, er skrevet det forkerte sted. */
  test('linjen siger ejerens tal, ikke designets', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_min_stk = 6;
    await åbn(page, d);
    await expect(page.locator('#min-stk')).toContainText('mindst 6 stykker');
  });

  test('den siger, hvor mange der mangler, mens man tæller op', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_min_stk = 4;
    await åbn(page, d);
    await tælOp(page, 'Smørrebrød', 'Rejemad', 2);
    await expect(page.locator('#min-stk')).toContainText('I mangler 2');

    await tælOp(page, 'Smørrebrød', 'Rejemad', 2);
    await expect(page.locator('#min-stk')).not.toContainText('mangler');
  });

  /* Og afsendelsen holder stadig fast — linjen er en oplysning,
     ikke værnet. */
  test('for få stykker kan ikke sendes', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_min_stk = 4;
    await åbn(page, d);
    await tælOp(page, 'Smørrebrød', 'Rejemad', 2);
    await udfyld(page);
    await page.locator('#ssend').click();
    await expect(page.locator('#sumline')).toContainText('mindst bestilles 4 stk. smørrebrød');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);
  });
});

test.describe('Hentes eller leveres', () => {

  test('levering tilbydes ikke, før forretningen har sagt ja', async ({ page }) => {
    /* Vi ved hverken hvad de kører ud med, hvor langt eller hvad
       det koster. En side, der tilbyder levering, fordi ingen har
       sagt nej, lover noget på forretningens vegne. */
    await åbn(page);
    await expect(page.locator('[data-toggles="#levfelt"]')).toBeHidden();
    await expect(page.locator('#levfelt')).toBeHidden();
  });

  /* ⚠️ DEN HER FANDT EN FEJL, DER IKKE KAN LÆSES FREM (4/9).
     hvordan() slår knappens PLADS op i segSvar, og opmærkningen
     havde "Vi henter" først, mens listen sagde
     ['levering','afhentning']. Et tryk på "Vi henter" blev altså
     sendt som en LEVERING — og gæsten fik "Skriv adressen" på et
     felt, der var foldet væk.

     ⚠️ OG "VI HENTER" ER FORVALGT MED VILJE: levering koster 79
     kr., og et forvalg ville lægge et gebyr på, ingen har bedt
     om. Det er en anden rækkefølge end catering og frokost, hvor
     leveringen er gratis at spørge om. */
  test('"Vi henter" er valgt fra start og sendes som afhentning', async ({ page }) => {
    await åbn(page, medLevering());
    await expect(page.locator('#levfelt')).toBeHidden();

    await tælOp(page, 'Smørrebrød', 'Rejemad', 1);
    await udfyld(page);
    await page.locator('#ssend').click();

    const b = (await gemteData(page)).bestillinger[0];
    expect(b.hvordan).toBe('afhentning');
    expect(b.leverings_adresse).toBe(null);
  });

  test('et tryk på Leveres folder adressefeltet ud og kræver den', async ({ page }) => {
    await åbn(page, medLevering());
    await page.locator('[data-toggles="#levfelt"] button', { hasText: 'Leveres' }).click();
    await expect(page.locator('#levfelt')).toBeVisible();

    await tælOp(page, 'Smørrebrød', 'Rejemad', 1);
    await udfyld(page);
    await page.locator('#ssend').click();
    await expect(page.locator('#sumline')).toContainText('adressen');
    expect((await gemteData(page)).bestillinger || []).toHaveLength(0);

    await page.locator('#sadr').fill('Havnevej 20L, 2670 Greve');
    await page.locator('#ssend').click();
    const b = (await gemteData(page)).bestillinger[0];
    expect(b.hvordan).toBe('levering');
    expect(b.leverings_adresse).toBe('Havnevej 20L, 2670 Greve');
  });

  /* ⚠️ ETIKETTEN SKAL FØLGE VALGET. MÅLT på et skud: gæsten havde
     trykket "Leveres" og skrevet sin adresse, og feltet lige
     nedenunder spurgte stadig "Hvornår henter I?". */
  test('tidsfeltet spørger om det, gæsten har valgt', async ({ page }) => {
    await åbn(page, medLevering());
    await expect(page.locator('#stid-label')).toContainText('henter');
    await page.locator('[data-toggles="#levfelt"] button', { hasText: 'Leveres' }).click();
    await expect(page.locator('#stid-label')).toContainText('leveres');
  });

  test('en levering bekræftes ALDRIG af sig selv', async ({ page }) => {
    /* Vi kan love, at maden bliver lavet. Vi kan ikke love, at den
       kan køres til en adresse, vi ikke kender. */
    const d = medLevering();
    d.indstillinger.auto_bekraeft = true;
    await åbn(page, d);
    await page.locator('[data-toggles="#levfelt"] button', { hasText: 'Leveres' }).click();
    await tælOp(page, 'Smørrebrød', 'Rejemad', 1);
    await udfyld(page);
    await page.locator('#sadr').fill('Havnevej 20L, 2670 Greve');
    await page.locator('#ssend').click();
    await expect(page.locator('#bestil .hint').first()).toContainText('ringer og bekræfter');
  });
});

test.describe('Adressen får et svar, mens hun taster', () => {

  /* Kundens ord: siden skal "tjekke at det er en rigtig addresse
     it omegnen de levere i".

     ⚠️ TRE UDFALD, IKKE TO. Ejeren skriver selv "længere ude
     efter aftale", så et postnummer uden for listen er et
     SPØRGSMÅL og ikke et nej — et blankt afslag ville sende en
     kunde væk, forretningen gerne ville have haft. Samme
     afvejning som mindstebeløbet på 200 kr. fik 1/9. */
  test('et postnummer i området siger ja', async ({ page }) => {
    await åbn(page, medLevering());
    await page.locator('[data-toggles="#levfelt"] button', { hasText: 'Leveres' }).click();
    await page.locator('#sadr').fill('Strandvej 4, 2670 Greve');
    await expect(page.locator('#lev-svar')).toContainText('kører derud');
  });

  test('et postnummer udenfor er et spørgsmål, ikke et afslag', async ({ page }) => {
    await åbn(page, medLevering());
    await page.locator('[data-toggles="#levfelt"] button', { hasText: 'Leveres' }).click();
    await page.locator('#sadr').fill('Storegade 1, 8000 Aarhus');
    await expect(page.locator('#lev-svar')).toContainText('uden for');
    /* ⚠️ OG DEN MÅ STADIG SENDES. Var svaret et værn, ville en
       gæst i Slagelse, forretningen gerne kører til efter aftale,
       blive afvist af en side, ejeren ikke har bedt om. */
    await tælOp(page, 'Smørrebrød', 'Rejemad', 1);
    await udfyld(page);
    await page.locator('#ssend').click();
    const b = (await gemteData(page)).bestillinger[0];
    expect(b.leverings_adresse).toBe('Storegade 1, 8000 Aarhus');
  });

  /* ⚠️ OMRÅDET ER EJERENS FELT, IKKE ET TAL I KODEN. Retter han
     leverings_postnr i admin, skal siden svare efter DET. */
  test('området kommer fra ejerens egen liste', async ({ page }) => {
    const d = medLevering();
    d.indstillinger.leverings_postnr = [8000];
    await åbn(page, d);
    await page.locator('[data-toggles="#levfelt"] button', { hasText: 'Leveres' }).click();
    await page.locator('#sadr').fill('Storegade 1, 8000 Aarhus');
    await expect(page.locator('#lev-svar')).toContainText('kører derud');
  });
});

test.describe('Fragten står i summen', () => {

  /* Kundens ord: "regner fragten oveni plus maden som står og
     eventuelt embelage".

     ⚠️ MÅLT 4/9: fire stykker à 55 med emballage sagde "i alt
     339,-", mens linjerne kun forklarede 260 af dem — de 79 var
     rigtige og usynlige. Et beløb, gæsten ikke kan regne efter,
     er et spørgsmål ved lugen. */
  test('den er sin egen linje OG med i totalen', async ({ page }) => {
    const d = medLevering();
    d.indstillinger.emballage_pris = 10;
    await åbn(page, d);
    await page.locator('[data-toggles="#levfelt"] button', { hasText: 'Leveres' }).click();
    await tælOp(page, 'Smørrebrød', 'Rejemad', 4);

    const sum = page.locator('#sumline');
    await expect(sum).toContainText('levering 79,-');
    await expect(sum).toContainText('emballage 4 × 10,-');
    // 4 × 55 + 4 × 10 + 79
    await expect(sum).toContainText('339,-');
  });

  test('afhentning koster ingen fragt', async ({ page }) => {
    const d = medLevering();
    d.indstillinger.emballage_pris = 10;
    await åbn(page, d);
    await tælOp(page, 'Smørrebrød', 'Rejemad', 4);
    const sum = page.locator('#sumline');
    await expect(sum).not.toContainText('levering');
    // 4 × 55 + 4 × 10
    await expect(sum).toContainText('260,-');
  });

  /* Og linjen følger med ind i bestillingen, så kassen kan se,
     hvad totalen består af. */
  test('den følger med som en linje på bestillingen', async ({ page }) => {
    await åbn(page, medLevering());
    await page.locator('[data-toggles="#levfelt"] button', { hasText: 'Leveres' }).click();
    await tælOp(page, 'Smørrebrød', 'Rejemad', 1);
    await udfyld(page);
    await page.locator('#sadr').fill('Havnevej 20L, 2670 Greve');
    await page.locator('#ssend').click();

    const b = (await gemteData(page)).bestillinger[0];
    const lev = (b.linjer || []).filter((l) => l.navn === 'Levering')[0];
    expect(lev).toBeTruthy();
    expect(lev.pris).toBe(79);
    /* ⚠️ FLAGET SKAL MED. Butik.erEmballage er husets ENE regel
       for "det her er penge, ikke arbejde" — uden det ville
       køkkenet få "lav 1 Levering" i produktionslisten. */
    expect(lev.emballage).toBe(true);
  });
});

test.describe('Varslet er reglens tal', () => {

  /* ⚠️ HEROENS MANCHET OG FAKTAKORTET SAGDE ENGANG "senest 2 dage
     før", mens formularen holdt ejerens eget tal (30/8). Gæsten
     læser det første og møder det andet. */
  test('faktakortet skriver ejerens eget tal', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_varsel_timer = 24;
    await åbn(page, d);
    await expect(page.locator('[data-varsel]').first()).toContainText('senest dagen før');
  });

  test('datofeltets hint siger det samme', async ({ page }) => {
    const d = data();
    d.indstillinger.bestilling_varsel_timer = 48;
    await åbn(page, d);
    await expect(page.locator('#bestil .field:has(#sdato) .hint'))
      .toContainText('mindst 2 dage');
  });
});
