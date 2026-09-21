/* ============================================================
   FORESPØRGSLERNE SKAL VÆRE TYDELIGE  (15/9)
   ------------------------------------------------------------
   Ejerens ord: "forespørgslerne alle sammen, om det er baglokale
   eller de ting, der kan ryge ind i admin, er utydelige."

   MÅLT før rettelsen:
   - den samme status hed "Svaret" på mærket, "Jeg har kontaktet
     dem" på knappen og "Ringet på" på Baglokale-fanen
   - Baglokale-fanen ledte efter .bestil-top på et kort, der har
     .foresp-top, så ventetiden kom aldrig på netop de sager, der
     venter på svar
   - datoen sagde "Lørdag 3. oktober", ikke om det var om to dage
     eller om to måneder
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, visFane } = require('./hjaelp');

const UR = '2026-08-06T11:00:00Z';   // torsdag 6. august, 13.00 dansk tid

function foresp(ekstra) {
  return Object.assign({
    id: 1, lokation_id: 'mosede', reference: 'FO260806-AAAAA', nummer: 4,
    type: 'selskab', navn: 'Peter Lund', telefon: '40506070', email: 'p@example.com',
    dato: '2026-08-16', antal_personer: 20, besked: null, status: 'ny',
    intern_note: null, detaljer: {}, oprettet: '2026-08-06T08:00:00Z',
  }, ekstra);
}

async function fanen(page, id, forespoergsler) {
  await åbnAdmin(page, { ur: UR, data: grunddata({ forespoergsler }) });
  await visFane(page, id);
}

test.describe('Forespørgslerne siger det samme med de samme ord', () => {

  test('en kontaktet sag hedder "Kontaktet" — ikke "Svaret"', async ({ page }) => {
    await fanen(page, 'p-forespoergsler', [foresp({ status: 'kontaktet' })]);
    const kort = page.locator('#forespoergsler-liste .bestil-kort').first();
    await expect(kort).toContainText('Kontaktet');
    await expect(kort).not.toContainText('Svaret');
  });

  test('Baglokale-fanens trin hedder også "Kontaktet"', async ({ page }) => {
    await fanen(page, 'p-lokale', [foresp({ type: 'baglokale', status: 'kontaktet' })]);
    await expect(page.locator('#p-lokale')).toContainText('Kontaktet');
    await expect(page.locator('#p-lokale')).not.toContainText('Ringet på');
  });

  /* ⚠️ FØR RETTELSEN KOM VENTETIDEN ALDRIG PÅ EN FORESPØRGSEL HER —
     kortet har .foresp-top, og fanen ledte efter .bestil-top. */
  test('en baglokale-forespørgsel, der venter, siger hvor længe — i toppen', async ({ page }) => {
    await fanen(page, 'p-lokale', [foresp({ type: 'baglokale', oprettet: '2026-08-03T08:00:00Z' })]);
    const ventet = page.locator('#p-lokale .foresp-top .ventet');
    await expect(ventet).toHaveCount(1);
    await expect(ventet).toContainText('3 dage');
  });
});

test.describe('Datoen siger, hvor langt der er til', () => {

  test('om ti dage står der "om 10 dage"', async ({ page }) => {
    await fanen(page, 'p-forespoergsler', [foresp({ dato: '2026-08-16' })]);
    await expect(page.locator('#forespoergsler-liste .foresp-dato').first()).toContainText('om 10 dage');
  });

  test('i morgen står der "i morgen" — og i dag intet tal', async ({ page }) => {
    await fanen(page, 'p-forespoergsler', [
      foresp({ dato: '2026-08-07' }),
      foresp({ id: 2, reference: 'FO260806-BBBBB', nummer: 5, dato: '2026-08-06' }),
    ]);
    const datoer = page.locator('#forespoergsler-liste .foresp-dato');
    await expect(datoer.filter({ hasText: '7. august' })).toContainText('i morgen');
    await expect(datoer.filter({ hasText: 'I DAG' })).not.toContainText('om ');
  });

  test('et andet år står med årstal', async ({ page }) => {
    await fanen(page, 'p-forespoergsler', [foresp({ dato: '2027-03-20' })]);
    await expect(page.locator('#forespoergsler-liste .foresp-dato').first()).toContainText('2027');
  });
});

/* ============================================================
   OG DET SAMME SPØRGSMÅL EN GANG TIL — DENNE GANG OM INDHOLDET
   (21/9)
   ------------------------------------------------------------
   Ejerens ord om leveringerne i Bestillinger: de blev
   overskuelige. Hans spørgsmål bagefter: *"hvad med
   forespørgsler på de forskellige ting, er de mindst lige så
   gode, og kan man nemt skelne og vide præcist hvad det er og
   hvad man skal gøre og hvad det indeholder?"*

   De to første var på plads: mærket siger HVAD det er, og den
   ene røde knap siger, hvad man skal gøre. Det tredje var det
   ikke — MÅLT på et skærmbillede af fanen med fem kort:

   1) EN ALLERGI SÅ UD SOM "vi sidder ude bagved". Kortet tegnede
      `bestil-gaestebesked` uden at spørge Admin.erAllergi — den
      regel, Bestillinger, Køkkenet og Overblik har spurgt siden
      25/8. Frokostsiden HAR et allergifelt (#fallergi, 16/9), så
      det er ikke et tænkt tilfælde: "ALLERGI: nødder og skaldyr"
      stod i den samme lyserøde kasse som en hilsen.

   2) ADRESSEN VAR DØD TEKST. "Adresse: Greve Strandvej 14" stod
      midt i den grå detaljelinje, mens den samme oplysning på et
      leveringskort er et kortlink (Admin.kortUrl, 21/9). To
      skærme, den samme adresse, og kun den ene kan åbne ruten.
   ============================================================ */
test.describe('Kortet viser, hvad forespørgslen indeholder', () => {

  /* ⚠️ MÅLES GENNEM SKÆRMEN OG IKKE VED AT SPØRGE Admin.erAllergi.
     Reglen har været rigtig hele tiden; det var kortet, der aldrig
     spurgte den. Et kald til funktionen ville bestå begge veje. */
  test('en allergi er ikke en almindelig besked', async ({ page }) => {
    await fanen(page, 'p-forespoergsler', [
      foresp({ id: 1, besked: 'ALLERGI: nødder og skaldyr' }),
      foresp({ id: 2, reference: 'FO260806-BBBBB', nummer: 5,
        navn: 'Lone Holm', besked: 'Vi sidder ude bagved' }),
    ]);
    const kort = page.locator('#forespoergsler-liste .bestil-kort');
    const medAllergi = kort.filter({ hasText: 'ALLERGI' });
    await expect(medAllergi).toHaveCount(1);
    await expect(medAllergi).toHaveClass(/har-allergi/);
    await expect(medAllergi.locator('.bestil-gaestebesked')).toHaveClass(/allergi/);
    await expect(medAllergi.locator('.bestil-gaestebesked')).toContainText('⚠️');

    /* Og modstykket: en almindelig besked må IKKE få alarmen. To
       slags rødt, der betyder det samme, er ingen alarm. */
    const uden = kort.filter({ hasText: 'ude bagved' });
    await expect(uden).not.toHaveClass(/har-allergi/);
    await expect(uden.locator('.bestil-gaestebesked')).not.toHaveClass(/allergi/);
  });

  /* ⚠️ TALLET KOMMER UDEFRA: farven læses af browseren, ikke af
     et klassenavn vi selv lige har skrevet. En klasse uden en
     regel bag sig er en kommentar. */
  test('allerginoten ser anderledes ud end en hilsen', async ({ page }) => {
    await fanen(page, 'p-forespoergsler', [
      foresp({ id: 1, besked: 'ALLERGI: nødder' }),
      foresp({ id: 2, reference: 'FO260806-BBBBB', nummer: 5,
        navn: 'Lone Holm', besked: 'Vi sidder ude bagved' }),
    ]);
    const farver = await page.locator('#forespoergsler-liste .bestil-gaestebesked')
      .evaluateAll((ns) => ns.map((n) => {
        const s = getComputedStyle(n);
        return { allergi: n.classList.contains('allergi'),
          kant: s.borderTopWidth, bg: s.backgroundColor };
      }));
    const a = farver.find((f) => f.allergi);
    const b = farver.find((f) => !f.allergi);
    expect(a, 'ingen af noterne er mærket som allergi').toBeTruthy();
    expect(parseFloat(a.kant), 'allerginoten har ingen kant').toBeGreaterThan(0);
    expect(a.bg, 'allerginoten ser ud som en hilsen').not.toBe(b.bg);
  });

  /* ⚠️ OG DET GÆLDER OGSÅ TILMELDINGERNE. h-kalender.html har sit
     eget allergifelt, og en fællesspisning er netop en aften, hvor
     køkkenet laver den samme mad til alle. */
  test('en tilmelding med allergi mærkes på samme måde', async ({ page }) => {
    const d = grunddata();
    d.kalender = [{ id: 11, lokation_id: 'mosede', type: 'arrangement',
      dato: '2026-08-16', slut_dato: null, titel: 'Fællesspisning',
      beskrivelse: null, emoji: null, lukker_kl: null, offentlig: true,
      tilmelding: true, pladser: 40, pris_tekst: null, start_kl: '18:00' }];
    d.reservationer = [{ id: 1, lokation_id: 'mosede', kalender_id: 11,
      reference: 'RE260806-AAAAA', navn: 'Anna Vind', telefon: '20304050',
      email: null, antal_personer: 4, besked: 'ALLERGI: skaldyr',
      status: 'ny', intern_note: null, slettet: null,
      oprettet: '2026-08-06T10:00:00Z' }];
    await åbnAdmin(page, { ur: UR, data: d });
    await visFane(page, 'p-tilmeldinger');
    const note = page.locator('#p-tilmeldinger .bestil-gaestebesked').first();
    await expect(note).toHaveClass(/allergi/);
    await expect(note).toContainText('⚠️');
  });

  /* ADRESSEN SKAL KUNNE ÅBNES. Samme regel som leveringskortet:
     Admin.kortUrl. Køkkenet står med en kasse mad og skal vide,
     hvor den skal hen — ikke læse en adresse op i en anden app. */
  test('adressen på en forespørgsel er et kortlink', async ({ page }) => {
    await fanen(page, 'p-forespoergsler', [foresp({ type: 'frokost',
      detaljer: { levering: 'levering', adresse: 'Håndværkervej 3, 2670 Greve' } })]);
    const link = page.locator('#forespoergsler-liste .foresp-detaljer a');
    await expect(link).toHaveCount(1);
    await expect(link).toContainText('Håndværkervej 3');
    /* ⚠️ MÅLET ER DEN RIGTIGE ADRESSE OG IKKE BARE "et link".
       Et kort, der åbner cafeen i stedet for gæsten, er værre end
       ingen knap — samme fælde som leveringskortets kortUrl. */
    expect(await link.getAttribute('href'))
      .toBe('https://www.google.com/maps/dir/?api=1&destination='
        + encodeURIComponent('Håndværkervej 3, 2670 Greve'));
    await expect(link).toHaveAttribute('target', '_blank');
  });

  /* Og resten af detaljelinjen skal stadig stå der — et link må
     ikke koste de fire andre felter. */
  test('kortlinket tager ikke de andre detaljer med sig', async ({ page }) => {
    await fanen(page, 'p-forespoergsler', [foresp({ type: 'frokost',
      detaljer: { hvor_ofte: 'Hver uge', dage: ['Tirsdag', 'Torsdag'],
        levering: 'levering', adresse: 'Håndværkervej 3, 2670 Greve',
        firma: 'Vind ApS' } })]);
    const linje = page.locator('#forespoergsler-liste .foresp-detaljer');
    await expect(linje).toContainText('Hvor tit: Hver uge');
    await expect(linje).toContainText('Ugedage: Tirsdag, Torsdag');
    await expect(linje).toContainText('Firma: Vind ApS');
    await expect(linje).toContainText('Skal leveres');
  });
});
