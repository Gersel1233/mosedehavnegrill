/* ============================================================
   ÉN INDGANG TIL ALLE FEM SAGER
   ------------------------------------------------------------
   Kundens ord 10/9: *"det hele skal hænge sammen og eventuelt
   have det i et ordre register eller noget den stil"*.

   MÅLT før: hver sag HAVDE en unik reference — SM, BO, FO, UD,
   RE — men ringede nogen med en kode eller et nummer, skulle
   personalet gætte hvilken fane sagen lå på og lede i den.

   ⚠️ REGISTRET LIGGER PÅ OVERBLIK OG IKKE PÅ HISTORIK. Historik
   er KUN_EJER, og den, der tager telefonen, er ofte en
   medarbejder. Et register, halvdelen af personalet ikke må
   åbne, er ikke et register.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const H = require('./hjaelp.js');

const ISO = '2026-08-07';

function femSager() {
  const d = H.grunddata();
  d.bestillinger = [{
    id: 1, nummer: 44, reference: 'SM260807-AAA11', lokation_id: 'mosede',
    navn: 'lone hansen', telefon: '20304050', hent_dato: ISO, hent_tid: '12:30',
    linjer: [{ navn: 'Rejemad', antal: 2, pris: 85 }], fyld: [], antal: 2,
    status: 'tilberedes', hvordan: 'afhentning',
  }];
  d.bordbestillinger = [{
    id: 1, nummer: 3, reference: 'BO260807-BBB22', lokation_id: 'mosede',
    navn: 'familien nielsen', telefon: '26262626', dato: ISO, tid: '18:00',
    antal_personer: 6, status: 'ny',
  }];
  d.forespoergsler = [{
    id: 1, nummer: 7, reference: 'FO260807-CCC33', lokation_id: 'mosede', type: 'selskab',
    navn: 'susanne dahl', telefon: '28282828', dato: null, antal_personer: 40,
    status: 'kontaktet',
  }];
  d.udlejninger = [{
    id: 1, nummer: 2, reference: 'UD260807-DDD44', lokation_id: 'mosede',
    navn: 'greve sejlklub', telefon: '30303030', dato: ISO,
    antal_personer: 30, status: 'ny',
  }];
  d.kalender = (d.kalender || []).concat([{
    id: 900, lokation_id: 'mosede', type: 'arrangement', titel: 'Fællesspisning',
    dato: '2026-08-14', offentlig: true, tilmelding: true, pladser: 40, start_kl: '18:00',
  }]);
  d.reservationer = [{
    id: 1, nummer: 5, lokation_id: 'mosede', kalender_id: 900, reference: 'RE260807-EEE55',
    navn: 'anna vind', telefon: '20304050', antal_personer: 4, status: 'ny', slettet: null,
  }];
  return d;
}

async function soeg(page, ord) {
  const felt = page.locator('#find-sag-felt');
  await felt.fill(ord);
  return page.locator('#find-sag-svar .find-traef');
}

/* ⚠️ HVER AF DE FEM SKAL KUNNE FINDES. En prøve på ÉN tabel ville
   bestå på et register, der kun kigger i bestillingerne — og det
   er præcis det, der skulle laves om. Tallet kommer udefra:
   listen her er de fem præfikser, huset FAKTISK laver. */
const SAGER = [
  ['SM260807-AAA11', 'Bestilling'],
  ['BO260807-BBB22', 'Bordbooking'],
  ['FO260807-CCC33', 'Forespørgsel'],
  ['UD260807-DDD44', 'Baglokalet'],
  ['RE260807-EEE55', 'Tilmelding'],
];

for (const [ref, slags] of SAGER) {
  test('registret finder ' + slags.toLowerCase() + ' på referencen', async ({ page }) => {
    await H.åbnAdmin(page, { data: femSager() });
    const traef = await soeg(page, ref);
    await expect(traef).toHaveCount(1);
    await expect(traef.first()).toContainText(slags);
  });
}

test('et bestillingsnummer finder sagen — også uden nuller', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  const traef = await soeg(page, '44');
  /* 44 rammer både bestillingens nummer og UD…-44 i referencen —
     begge er rigtige træf. Det, prøven kræver, er, at NUMMERET
     findes: skrev personalet "0044", skal den samme sag komme. */
  /* ⚠️ M- OG IKKE # (10/9). Kundens ord: de fem slags sager skal
     kunne skelnes fra hinanden — de hed alle #0001. Bogstavet
     siger slagsen, og REGISTRET er netop den skærm, hvor det
     betyder mest: her står de fem side om side. */
  await expect(traef.filter({ hasText: 'M-0044' })).toHaveCount(1);
  const medNuller = await soeg(page, '0044');
  await expect(medNuller.filter({ hasText: 'M-0044' })).toHaveCount(1);
});

test('et telefonnummer samler gæstens sager på tværs af faner', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  /* Lone og Anna deler nummer i fiksturet — det er dét, "hænge
     sammen" betyder: én gæst, to sager, ét opslag. */
  const traef = await soeg(page, '20304050');
  await expect(traef).toHaveCount(2);
  await expect(traef.filter({ hasText: 'Bestilling' })).toHaveCount(1);
  await expect(traef.filter({ hasText: 'Tilmelding' })).toHaveCount(1);
});

/* ============================================================
   DE SIDSTE CIFRE ER NOK  (16/9)
   ------------------------------------------------------------
   Feltet lover "navn, telefon, dato, nummer eller reference", og
   porten i findsag.js lukker seks cifre ind (length >= 6). Men
   sammenligningen nedenunder er
       tlf.slice(-8) === sogt.slice(-8)
   og for seks cifre bliver det "20304050" === "304050" — falsk.
   Porten lover altså noget, sammenligningen ikke holder: seks og
   syv cifre kunne ALDRIG ramme, kun præcis otte.

   Det er den situation, feltet er til for: gæsten står i røret og
   læser de cifre, hun kan huske.

   ⚠️ MODSTYKKERNE ER DET VIGTIGE. Sammenligner man bare "de
   sidste N", bliver enhver kort talrække et bredt net — "4050"
   ville hente hver eneste gæst, hvis nummer ender sådan. Porten
   på seks skal blive stående.
   ============================================================ */
test('de sidste seks cifre finder gæsten', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  const traef = await soeg(page, '304050');
  await expect(traef, 'seks cifre af 20304050 fandt ingen').toHaveCount(2);
});

test('og de sidste syv gør det også', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  await expect(await soeg(page, '0304050')).toHaveCount(2);
});

/* ⚠️ LOFTET PÅ OTTE HAVDE INGEN PRØVE. Rettelsen skærer med
   min(længde, 8) netop for at bevare det her tilfælde — men uden
   en prøve ville den, der fjernede loftet i morgen, ikke mærke
   noget. Gæsten læser nummeret op med landekode, som det står i
   hendes telefon. */
test('et nummer med landekode finder stadig gæsten', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  await expect(await soeg(page, '4520304050')).toHaveCount(2);
});

test('men fire cifre er ikke et opslag — det er et net', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  /* ⚠️ Fire cifre må ikke ramme telefonen. Ingen sag har nummeret
     4050, så et træf her kunne kun komme fra en for løs
     nummersammenligning. */
  await expect(await soeg(page, '4050')).toHaveCount(0);
});

test('og seks cifre, der ikke passer, finder ingenting', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  await expect(await soeg(page, '999999')).toHaveCount(0);
});

/* ============================================================
   "BORD 7" FINDER BORDET  (16/9)
   ------------------------------------------------------------
   Ejerens ønske: det skal være nemt at finde tingene. Personalet
   står ved et bord og vil se, hvem der har booket det — men
   bordnummeret var ikke blandt de felter, registret kiggede i.

   ⚠️ ORDET "BORD" SKAL MED, og det er hele pointen. Et tal alene er
   allerede et SAGSNUMMER, og lod vi det slå op i bordene, ville ét
   opslag pludselig give to svar om to forskellige ting. Husets egen
   note ved nummer-matchet siger det samme: "Kun HELE tal må matche
   nummeret. Ellers ville '4' hente hver eneste bestilling fra 4 til
   400 frem."

   ⚠️ TALLET ER 12 OG IKKE 7, OG DET ER MÅLT (16/9). Første udgave
   brugte bord 7 og søgte på "7" — men findsag.js viser INTET for et
   søgeord på under to tegn (linje 191), så modstykket fik nul træf
   og målte ingenting. Skærmbilledet af den faldne prøve viste det:
   "7" i feltet, tom svarboks. Ingen reference i fikstureret
   indeholder "12", så tallet giver et rent nul at måle på.

   ⚠️ BORDNUMMERET BOR PÅ BORDET, ikke på bookingen: rækken har et
   bord_id, og nummeret slås op i Admin.lister.bordliste, som
   bordkort.js melder ind ved login.
   ============================================================ */
function medBord() {
  const d = femSager();
  d.borde = [
    { id: 1, lokation_id: 'mosede', nummer: '12', sortering: 120, pladser: 5, aktiv: true },
    { id: 2, lokation_id: 'mosede', nummer: '13', sortering: 130, pladser: 5, aktiv: true },
  ];
  d.bordbestillinger[0].bord_id = 1;
  return d;
}

test('"bord 12" finder bookingen ved det bord', async ({ page }) => {
  await H.åbnAdmin(page, { data: medBord() });
  const traef = await soeg(page, 'bord 12');
  await expect(traef).toHaveCount(1);
  await expect(traef).toContainText('Bordbooking');
});

/* ⚠️ MODSTYKKET, OG DET VIGTIGSTE. Uden det ville en rettelse, der
   lod ethvert tal slå op i bordene, bestå prøven ovenfor — og så
   ville et sagsnummer og et bordnummer blive blandet sammen i ét
   svar, uden at personalet kan se hvorfor. */
test('men et blankt "12" slår ikke op i bordene', async ({ page }) => {
  await H.åbnAdmin(page, { data: medBord() });
  await expect(await soeg(page, '12')).toHaveCount(0);
});

test('og et bord, ingen har booket, finder ingenting', async ({ page }) => {
  await H.åbnAdmin(page, { data: medBord() });
  await expect(await soeg(page, 'bord 13')).toHaveCount(0);
});

test('hver slags sag har sit eget bogstav i nummeret', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });

  /* ⚠️ DET VAR HELE KUNDENS PUNKT: fem slags sager, og "#0001"
     kunne være fire af dem. Prøven læser bogstavet af HVERT
     træf og kræver, at de er forskellige — tallet kommer udefra,
     fra antallet af slags, ikke fra et 5, der er skrevet af.

     ⚠️ OG DEN MÅLER SKÆRMEN, ikke tabellen i store.js. Et
     spørgsmål til Butik.pæntNummer om dens egen liste ville
     bestå, også hvis et kaldested glemte at sige sin slags —
     og det var præcis dét, der kunne gå galt. */
  const bogstaver = {};
  for (const [ref, slags] of SAGER) {
    const traef = await soeg(page, ref);
    await expect(traef).toHaveCount(1);
    const tekst = await traef.first().innerText();
    const m = tekst.match(/\b([A-ZÆØÅ])-\d{4}\b/);
    expect(m, slags + ' viser intet nummer med bogstav: ' + tekst).not.toBeNull();
    bogstaver[slags] = m[1];
  }
  const brugte = Object.values(bogstaver);
  expect(new Set(brugte).size,
    'to slags sager deler bogstav: ' + JSON.stringify(bogstaver))
    .toBe(brugte.length);
});

test('statusserne står på dansk, ikke som databasens ord', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });

  /* ⚠️ 'tilberedes' MANGLEDE i Admin.statusNavn, selv om den er
     en lovlig status siden restaurant.sql — så ordet faldt
     igennem til `|| status` og stod råt på hver skærm, der
     spørger. Fundet ved at søge en sag frem. */
  const iGang = await soeg(page, 'SM260807-AAA11');
  await expect(iGang.first()).toContainText('I gang');
  await expect(iGang.first()).not.toContainText('tilberedes');

  const foresp = await soeg(page, 'FO260807-CCC33');
  await expect(foresp.first()).toContainText('Kontaktet');
  await expect(foresp.first()).not.toContainText('kontaktet ');
});

test('et tomt svar er et svar — og ét tegn søger ikke', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  const svar = page.locator('#find-sag-svar');

  /* ⚠️ ÉT TEGN SØGER IKKE. "2" ville hente halvdelen af huset frem,
     mens man taster. */
  await page.locator('#find-sag-felt').fill('2');
  await expect(svar.locator('.find-traef')).toHaveCount(0);

  /* ⚠️ MEN INTET TRÆF SKAL SIGE DET MED ORD. Står der ingenting,
     tror man, feltet ikke virker — og så leder nogen videre i
     fanerne efter en sag, systemet allerede har sagt nej til. */
  await page.locator('#find-sag-felt').fill('ZZZZZ');
  await expect(svar).toContainText(/ingen sag/i);
});

/* ============================================================
   NEMT AT FINDE — FRA ALLE FANER, PÅ NAVN OG DATO  (16/9)
   Ejerens ord: det skal være "nemt at finde de diverse ting". MÅLT
   før: feltet stod kun på Overblik, fandt kun reference, nummer og
   telefon, og et træf skiftede bare fane — kortet skulle man selv
   lede efter.
   ============================================================ */
test('søgefeltet står på alle faner', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  await H.visFane(page, 'p-menu');
  await expect(page.locator('#find-sag-felt')).toBeVisible();
  const traef = await soeg(page, 'FO260807-CCC33');
  await expect(traef).toHaveCount(1);
});

test('et navn finder sagen', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  const traef = await soeg(page, 'nielsen');
  await expect(traef).toHaveCount(1);
  await expect(traef.first()).toContainText('Bordbooking');
});

test('en dato finder dagens sager', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  const traef = await soeg(page, '7/8');
  await expect(traef.filter({ hasText: 'Bestilling' })).toHaveCount(1);
  await expect(traef.filter({ hasText: 'Bordbooking' })).toHaveCount(1);
  await expect(traef.filter({ hasText: 'Baglokalet' })).toHaveCount(1);
  // ⚠️ MODSTYKKET: forespørgslen har ingen dato og må ikke komme med
  await expect(traef.filter({ hasText: 'Forespørgsel' })).toHaveCount(0);
});

test('et træf rulles frem og markeres på sin fane', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  const traef = await soeg(page, 'BO260807-BBB22');
  await traef.first().click();
  const kort = page.locator('#p-borde [data-raekke="bord-1"]');
  await expect(kort).toHaveClass(/find-markeret/);
});

/* ⚠️ BESTILLINGER VISER ÉN DAG AD GANGEN. Uden at skifte dag landede
   personalet på en liste uden den bestilling, de lige havde fundet. */
test('en bestilling på en anden dag vises på sin egen dag', async ({ page }) => {
  await H.åbnAdmin(page, { ur: '2026-08-05T10:00:00Z', data: femSager() });
  const traef = await soeg(page, 'SM260807-AAA11');
  await traef.first().click();
  await expect(page.locator('#p-bestillinger [data-raekke="b-1"]')).toBeVisible();
});

test('"/" sætter markøren i søgefeltet', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('/');
  await expect(page.locator('#find-sag-felt')).toBeFocused();
});

test('et træf fører hen til sagens egen fane', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  const traef = await soeg(page, 'FO260807-CCC33');
  await traef.first().click();
  /* Registret RETTER ingenting — det finder og fører derhen.
     To steder at ændre den samme sag er to steder, der kan
     skride fra hinanden. */
  await expect(page.locator('#p-forespoergsler')).toBeVisible();
});
