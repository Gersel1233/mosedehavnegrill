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
    id: 1, reference: 'FO260807-CCC33', lokation_id: 'mosede', type: 'selskab',
    navn: 'susanne dahl', telefon: '28282828', dato: null, antal_personer: 40,
    status: 'kontaktet',
  }];
  d.udlejninger = [{
    id: 1, reference: 'UD260807-DDD44', lokation_id: 'mosede',
    navn: 'greve sejlklub', telefon: '30303030', dato: ISO,
    antal_personer: 30, status: 'ny',
  }];
  d.kalender = (d.kalender || []).concat([{
    id: 900, lokation_id: 'mosede', type: 'arrangement', titel: 'Fællesspisning',
    dato: '2026-08-14', offentlig: true, tilmelding: true, pladser: 40, start_kl: '18:00',
  }]);
  d.reservationer = [{
    id: 1, lokation_id: 'mosede', kalender_id: 900, reference: 'RE260807-EEE55',
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
  await expect(traef.filter({ hasText: '#0044' })).toHaveCount(1);
  const medNuller = await soeg(page, '0044');
  await expect(medNuller.filter({ hasText: '#0044' })).toHaveCount(1);
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

test('et træf fører hen til sagens egen fane', async ({ page }) => {
  await H.åbnAdmin(page, { data: femSager() });
  const traef = await soeg(page, 'FO260807-CCC33');
  await traef.first().click();
  /* Registret RETTER ingenting — det finder og fører derhen.
     To steder at ændre den samme sag er to steder, der kan
     skride fra hinanden. */
  await expect(page.locator('#p-forespoergsler')).toBeVisible();
});
