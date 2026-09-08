/* Tapasfadet skal SES i admin.

   Ejerens ord (23/8): tapas skal kunne bestilles to dage i
   forvejen, gæsten skal kunne ringe om fadets indhold — og
   bestillingen skal markeres anderledes inde i admin.

   Grunden er praktisk: et fad til tolv er ikke en pose, der
   rækkes ud af lugen. Står den som en almindelig bestilling
   mellem tredive andre, opdager køkkenet den, når der er to timer
   til — og så er de to dages varsel spildt. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, visFane } = require('./hjaelp');

function medTapas() {
  const d = grunddata();
  const b = (id, tid, navn, linjer) => ({
    id, lokation_id: 'mosede', reference: 'SM-T-' + id, navn, telefon: '2030405' + id,
    email: null, hent_dato: '2026-08-07', hent_tid: tid,
    linjer, fyld: [], antal: linjer.reduce((s, l) => s + l.antal, 0),
    besked: null, status: 'ny', hvordan: 'afhentning', leverings_adresse: null,
    intern_note: null, slettet: null, oprettet: '2026-08-07T09:00:00.000Z',
  });

  d.bestillinger = [
    b(1, '17:00', 'Sara Dam', [
      { navn: 'Tapasfad, pr. person', antal: 8, pris: 145 },
      { navn: 'Cava, flaske', antal: 2, pris: 295 },
    ]),
    b(2, '17:30', 'Jonas Berg', [{ navn: 'Flæskestegssandwich', antal: 2, pris: 89 }]),
  ];
  return d;
}

test.describe('Tapas i admin', () => {
  test('tapasbestillingen får sit eget mærke på Bestillinger', async ({ page }) => {
    await åbnAdmin(page, { data: medTapas() });
    await visFane(page, 'p-bestillinger');

    const tapas = page.locator('.bestil-kort[data-id="1"]');
    await expect(tapas.locator('.maerke.m-tapas')).toHaveText('🧀 Tapasfad');

    // Og den almindelige bestilling får det IKKE — ellers betyder
    // mærket ingenting
    await expect(page.locator('.bestil-kort[data-id="2"] .maerke.m-tapas')).toHaveCount(0);
  });

  test('mærket står også på vagtskærmen', async ({ page }) => {
    await åbnAdmin(page, { data: medTapas() });

    /* Uret står fredag kl. 13.00, og Sara henter kl. 17 — altså
       under "Senere i dag". De to grupper ligger i den SAMME
       liste nu (26/8), så der måles på hele forløbet. Mærket skal
       stå dér, hvor køkkenet kigger. */
    const raekke = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Sara Dam' });
    await expect(raekke).toHaveCount(1);
    await expect(raekke.locator('.maerke', { hasText: 'Tapasfad' })).toHaveCount(1);

    const anden = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Jonas Berg' });
    await expect(anden.locator('.maerke', { hasText: 'Tapasfad' })).toHaveCount(0);
  });
});

/* ============================================================
   OG SMØRREBRØDET FÅR DET SAMME  (8/9)
   ------------------------------------------------------------
   Kundens ord med et skud af et bestillingskort: *"når man
   bestiller smørbrød ud af huset, er det meget utydeligt — det
   ligner hvilken som helst bestilling. Det skal være tydeligt,
   hvad det er, hvor det er bestilt fra osv."*

   Argumentet er fadets, ord for ord: smørrebrødet bestilles et
   DØGN før og mindst fire stykker ad gangen, og det anrettes.
   Står det som enhver anden to-go, opdager køkkenet det, når der
   er to timer til.

   ⚠️ OG "HVOR DET ER BESTILT FRA" KAN KUN SIGES HALVT — MÅLT:
   der er ingen kanalkolonne på `bestillinger`, og
   lavReference('SM') bruges til AL mad. Systemet ved altså ikke,
   om den kom ind ad h-smorrebrod eller ad forsiden. Det, det
   VED, er bord eller luge, og det står i typemærket. Resten
   ville være et gæt.
   ============================================================ */
test.describe('Hvad er der bestilt?', () => {

  /* ⚠️ VAREN SLÅS OP I MENUKORTET, ikke i navnet. Ejerens 48
     smørrebrød hedder Leverpostej, Æbleflæsk, Rejemad … der er
     ikke ét fælles ord. Fiksturets kategori 1 hedder
     "Smørrebrød"; kategori 6 er isen. */
  function medSmoer() {
    const d = grunddata();
    const b = (id, navn, linjer) => ({
      id, lokation_id: 'mosede', reference: 'SM-S-' + id, navn,
      telefon: '2030405' + id, email: null, hent_dato: '2026-08-07',
      hent_tid: '17:0' + id, linjer, fyld: [],
      antal: linjer.reduce((s, l) => s + l.antal, 0), nummer: id,
      besked: null, status: 'ny', hvordan: 'afhentning',
      leverings_adresse: null, bord_nummer: null,
      intern_note: null, slettet: null, oprettet: '2026-08-07T09:00:00.000Z',
    });
    d.bestillinger = [
      b(1, 'Anna Vind', [{ navn: 'Flæskestegssandwich', antal: 4, pris: 89 }]),
      b(2, 'Jonas Berg', [{ navn: 'Softice med guf', antal: 2, pris: 35.5 }]),
    ];
    return d;
  }

  /* ⚠️ TO UAFHÆNGIGE TING I ÉN PRØVE: smørrebrødet SKAL have
     mærket, og isen SKAL IKKE. Uden anden halvdel ville en regel,
     der satte mærket på hvert eneste kort, bestå — og så siger
     mærket ingenting, hvilket var hele klagen. */
  test('smørrebrødet får sit eget mærke — isen gør ikke', async ({ page }) => {
    await åbnAdmin(page, { data: medSmoer() });
    await visFane(page, 'p-bestillinger');

    await expect(page.locator('.bestil-kort[data-id="1"] .maerke.m-smoer'))
      .toHaveText('🥪 Smørrebrød');
    await expect(page.locator('.bestil-kort[data-id="2"] .maerke.m-smoer'))
      .toHaveCount(0);
  });

  /* ⚠️ HØJST ÉT VAREMÆRKE. Tre mærker i træk på et kort er ingen
     oplysning — så er man tilbage ved at læse hvert kort. Et fad
     til tolv er dagens største stykke arbejde og slår derfor
     smørrebrødet, hvis en bestilling har begge. */
  test('har den både fad og smørrebrød, står fadet alene', async ({ page }) => {
    const d = medSmoer();
    d.bestillinger[0].linjer = [
      { navn: 'Tapasfad, pr. person', antal: 8, pris: 145 },
      { navn: 'Flæskestegssandwich', antal: 4, pris: 89 },
    ];
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-bestillinger');

    const kort = page.locator('.bestil-kort[data-id="1"]');
    await expect(kort.locator('.maerke.m-tapas')).toHaveCount(1);
    await expect(kort.locator('.maerke.m-smoer')).toHaveCount(0);
  });

  /* ⚠️ OG DE TO SKÆRME SKAL SIGE DET SAMME. Personalet skifter
     mellem Bestillinger og Overblik hele dagen, og de skrev hver
     sin udgave af tapasmærket før — det var dét, Admin.typeMaerke
     blev bygget for at lukke 6/9. Prøven holder de to skærme op
     mod hinanden: tallet kommer udefra. */
  test('vagtskærmen siger det samme som Bestillinger', async ({ page }) => {
    await åbnAdmin(page, { data: medSmoer() });

    const raekke = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Anna Vind' });
    await expect(raekke.locator('.maerke', { hasText: 'Smørrebrød' })).toHaveCount(1);

    const anden = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Jonas Berg' });
    await expect(anden.locator('.maerke', { hasText: 'Smørrebrød' })).toHaveCount(0);
  });

  /* ⚠️ UDEN MENUKORTET ER SVARET NEJ, IKKE EN FEJL. Er databasen
     nede, ser kortet ud som i går. En regel, der kastede, ville
     tage HELE fanen med sig — Admin.tegnere er én liste, og det
     er sket tre gange (24/8, 29/8, 31/8). */
  test('uden et menukort falder fanen ikke', async ({ page }) => {
    const d = medSmoer();
    d.menu_kategorier = [];
    d.menu_varer = [];
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-bestillinger');

    await expect(page.locator('.bestil-kort[data-id="1"]')).toBeVisible();
    await expect(page.locator('.bestil-kort[data-id="1"] .maerke.m-smoer'))
      .toHaveCount(0);
  });
});
