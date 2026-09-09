/* ============================================================
   ADMIN SKAL SE ENS UD, UANSET HVILKEN FANE MAN STÅR PÅ
   ------------------------------------------------------------
   Kundens ord 9/9, aftenen før lancering: *"alt er rodet og ik
   dygtig nok ... alle sektioner i admin er rodet og ikke tydelige
   nok"*, og om tilmeldingerne specifikt: *"tilmeldingerne skal
   være bedre oplysningerne selve besked kortene uanset hvilken
   tab skal være bedre"*.

   Han har ret, og det kunne MÅLES. Husets form siden 31/8 er ét
   skridt frem og resten bag "···". På en arbejdsdag med rigtige
   sager stod fire faner rigtigt — Bestillinger, Køkken-kø, Borde
   og Forespørgsler — mens TO havde alle handlinger i række:

       Tilmeldinger:  ✓ Kommet | Udeblev | Afvis      (3 frem)
       Baglokalet:    Lej lokalet ud | Afvis          (2 frem)

   ⚠️ PRØVEN LÆSER SKÆRMEN, IKKE KODEN. Den tæller de knapper, en
   FINGER kan ramme (en kasse med bredde), ikke dem, der står i
   DOM'en: `.bestil-mere` ligger inde i knaprækken på nogle kort
   og uden for den på andre, så et DOM-tal ville sige 4 om et
   kort, der viser 1. Det var præcis den fejl, min egen første
   måling lavede.

   ⚠️ OG TALLET KOMMER UDEFRA: hvert kort holdes op mod HUSETS
   regel, ikke mod sig selv. Et spørgsmål til Tilmeldinger om dens
   egen opmærkning ville bestå, uanset hvad de fem andre gjorde.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const H = require('./hjaelp.js');

/* En arbejdsdag: én sag pr. fane, så hvert kort HAR en knap at
   tegne. Statusserne er databasens egne — et fikstur, der skriver
   et ord, CHECK'et afviser, måler en række, produktionen aldrig
   kan indeholde (arret fra 'aftalt' på en udlejning 28/8, og jeg
   gik selv i den tre gange, mens det her blev målt). */
function arbejdsdag() {
  const d = H.grunddata();
  const iso = '2026-08-07';
  d.bestillinger = [{
    id: 1, nummer: 1, reference: 'SM260807-AAA11', lokation_id: 'mosede',
    navn: 'lone hansen', telefon: '20304050', hent_dato: iso, hent_tid: '12:30',
    linjer: [{ navn: 'Rejemad', antal: 2, pris: 85 }], fyld: [], antal: 2,
    status: 'ny', hvordan: 'afhentning',
  }];
  d.bordbestillinger = [{
    id: 1, reference: 'BO260807-BBB22', lokation_id: 'mosede',
    navn: 'familien nielsen', telefon: '26262626', dato: iso, tid: '18:00',
    antal_personer: 6, status: 'ny',
  }];
  d.forespoergsler = [{
    id: 1, reference: 'FO260807-CCC33', lokation_id: 'mosede', type: 'selskab',
    navn: 'susanne dahl', telefon: '28282828', email: 's@eksempel.dk',
    dato: '2026-09-05', antal_personer: 40, status: 'ny',
  }];
  d.udlejninger = [{
    id: 1, reference: 'UD260807-DDD44', lokation_id: 'mosede',
    navn: 'greve sejlklub', telefon: '30303030', dato: '2026-09-12',
    antal_personer: 30, status: 'ny',
  }];
  d.kalender = (d.kalender || []).concat([{
    id: 900, lokation_id: 'mosede', type: 'arrangement', titel: 'Fællesspisning',
    dato: '2026-08-14', offentlig: true, tilmelding: true, pladser: 40,
    start_kl: '18:00',
  }]);
  d.reservationer = [{
    id: 1, lokation_id: 'mosede', kalender_id: 900, reference: 'RE260807-EEE55',
    navn: 'anna vind', telefon: '23456789', antal_personer: 4, status: 'ny',
    slettet: null,
  }];
  return d;
}

/* Fanerne med SAGSKORT. Overblik, Køkken-kø og Nyheder står ikke
   her: Overblik er ruder ind i andre faner, køkkenet har sin egen
   form (én stor knap under maden, ikke ved siden af), og Nyheder
   er en redigeringsliste og ikke en sag. */
const SAGSFANER = [
  ['Tilmeldinger', 'p-tilmeldinger'],
  ['Bestillinger', 'p-bestillinger'],
  ['Forespørgsler', 'p-forespoergsler'],
  ['Baglokalet', 'p-lokale'],
  ['Borde', 'p-borde'],
];

for (const [navn, panel] of SAGSFANER) {
  test('kortet på ' + navn + ' viser ét skridt frem og gemmer resten', async ({ page }) => {
    await H.åbnAdmin(page, { data: arbejdsdag() });
    await H.visFane(page, panel);

    const kort = page.locator('#' + panel + ' .bestil-kort, #' + panel + ' .foresp-kort').first();
    await expect(kort).toBeVisible();   // ⚠️ FØRST at kortet ER der.
                                        // Uden den ville en tom fane bestå
                                        // hver eneste regel (toBeHidden-arret 30/8).

    const synlige = await kort.evaluate((k) => {
      const raekke = k.querySelector('.knap-raekke');
      if (!raekke) return null;
      return [...raekke.querySelectorAll('button')]
        .filter((b) => b.getBoundingClientRect().width > 0)
        .map((b) => b.textContent.replace(/\s+/g, ' ').trim());
    });

    expect(synlige, 'kortet har ingen knaprække').not.toBeNull();

    const doer = synlige.filter((t) => /^[·.·]{2,}$/.test(t));
    const handlinger = synlige.filter((t) => !/^[·.·]{2,}$/.test(t));

    expect(handlinger.length,
      navn + ' viser ' + handlinger.length + ' handlinger på én gang: '
      + handlinger.join(' | ') + ' — husets form er ÉN frem, resten bag "···"')
      .toBeLessThanOrEqual(1);
    expect(doer.length, navn + ' mangler "···"').toBe(1);
  });
}

test('døren skjuler faktisk noget — og åbner det', async ({ page }) => {
  await H.åbnAdmin(page, { data: arbejdsdag() });
  await H.visFane(page, 'p-tilmeldinger');

  const kort = page.locator('#p-tilmeldinger .bestil-kort').first();
  await expect(kort).toBeVisible();

  /* ⚠️ MODSTYKKET. Uden det ville en regel, der bare FJERNEDE
     Udeblev og Afvis, bestå prøven ovenfor — og personalet ville
     stå uden en vej til at lukke sagen. Knapperne skal være
     skjulte OG nåelige. */
  const skjult = kort.locator('.bestil-mere button', { hasText: 'Udeblev' });
  await expect(skjult).toBeHidden();
  await H.aabnMere(kort);
  await expect(skjult).toBeVisible();
});
