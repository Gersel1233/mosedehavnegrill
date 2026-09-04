/* KONTAKT OG FÅ ET TILBUD PÅ SMØRREBRØD

   ⚠️ FILEN HED ENGANG "SMØRREBRØD UD AF HUSET ER EN
   FORESPØRGSEL" (31/8), OG DEN HALVDEL ER VÆK  (4/9).

   31/8 valgte kunden, at bestillingsformularen skulle HELT væk
   fra siden, og at alt skulle lande i Forespørgsler. 4/9 traf
   han den modsatte beslutning: *"det er helt almindelig
   bestilling"* — ejeren har prissat hele smørrebrødskortet
   siden 1/9, så der er ikke noget at spørge om for den, der
   skal bruge otte stykker på fredag.

   SEKS PRØVER ER DERFOR FJERNET, ikke gemt væk, og det er
   kundens beslutning og ikke en forældet prøve:

     · "der er hverken kurv, dagvælger eller tidsvælger"
     · "man kan sende uden at have valgt en dato"
     · "den lander som SIN EGEN slags, ikke som et selskab"
     · "hver slags smørrebrød står som sin egen pille"
     · "en udsolgt slags kan ikke vælges"
     · "uden smørrebrød på kortet bliver designets egne stående"
     · "det valgte følger med forespørgslen ind i admin"

   ⚠️ OG ÉN AF DEM BESTOD VACUØST, DA FORMULAREN FORSVANDT:
   "en udsolgt slags kan ikke vælges" spurgte kun, om der var
   NUL knapper med det navn — og det er sandt for en vælger, der
   slet ikke findes. Præcis den fælde, filen selv fik en note om
   30/8 (toBeHidden er sandt for et element, der ikke findes).
   Den ville have stået grøn i månedsvis og målt ingenting.

   Dækningen af selve forespørgselsmotoren er urørt: den måles
   for selskaber, catering, frokost og baglokalet i
   skal-forespoergsel.spec.js. Og siden bestiller nu, hvilket
   måles i tests/skal-smoerrebroed.spec.js.

   Tilbage står de to ting, den her fil ER, og som ingen anden
   måler: at tilbud-knappen skriver til selskabsadressen med et
   færdigt brev, og at admin viser en gammel
   smørrebrøds-forespørgsel med sit fulde navn.

   ⚠️ TILBUD-KNAPPEN ER STADIG EN MAILTO, OG DET ER KUNDENS
   EGET VALG fra 31/8: *"en knap, der hedder kontakt og få et
   tilbud, som henviser dem til selskab1@mosedehavnecafe.dk med
   en præ-skrevet start."* Den, der skal bruge et helt fad til
   fyrre, har brug for et menneske — ikke en kurv. */

const { test, expect } = require('@playwright/test');
const { åbnSkal, åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const SIDE = '/h-smorrebrod.html';

async function åbn(page, d) {
  await åbnSkal(page, SIDE, { data: d || grunddata() });
}

test.describe('Den gamle slags kan stadig læses i admin', () => {

  /* ⚠️ RÆKKER FRA FØR 4/9 LIGGER I DATABASEN. Siden sendte
     forespørgsler af typen 'smoerrebroed' i fire dage, og de
     skal blive ved med at kunne læses — et ord, admin ikke
     kender, står som en rå nøgle på kortet. */
  test('admin viser den med sit fulde navn', async ({ page }) => {
    const d = grunddata();
    d.forespoergsler = [{
      id: 1, lokation_id: 'mosede', reference: 'FO-1', type: 'smoerrebroed',
      navn: 'Karen Kok', telefon: '20304050', email: null,
      dato: '2026-10-03', antal_personer: 40, besked: null,
      detaljer: { anledning: 'Reception', mad: ['Håndmadder'] },
      status: 'ny', intern_note: null, slettet: null,
      oprettet: '2026-08-07T09:00:00.000Z',
    }];
    await åbnAdmin(page, { data: d });
    await visFane(page, 'p-forespoergsler');

    await expect(page.locator('#forespoergsler-liste'))
      .toContainText('Smørrebrød ud af huset');
  });
});

test.describe('Kontakt og få et tilbud', () => {

  test('knappen skriver til selskabsadressen med et færdigt brev', async ({ page }) => {
    await åbn(page);
    const knap = page.locator('.tilbud-knap');
    await expect(knap).toHaveCount(1);

    const href = decodeURIComponent(await knap.getAttribute('href'));
    expect(href).toContain('mailto:selskab1@mosedehavnecafe.dk');
    expect(href, 'emnet mangler — personalet kan ikke se, hvad mailen handler om')
      .toContain('subject=Tilbud');
    /* ⚠️ BREVET ER DET NYE. Kanalen kunne kun bære et emne før;
       uden brevet får personalet en mail uden dato og antal, og
       så går der et døgn med at spørge om det. */
    expect(href, 'det færdigskrevne brev kom ikke med').toContain('body=');
    expect(href).toContain('Antal personer');
  });

  /* Adressen går gennem husets data-post-kanal — den samme som
     footeren. Rettes den i admin, slår den igennem begge steder. */
  test('en rettet adresse i admin slår igennem på knappen', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.kontakt_email_selskab = 'fest@eksempel.dk';
    await åbn(page, d);

    const href = decodeURIComponent(await page.locator('.tilbud-knap').getAttribute('href'));
    expect(href).toContain('mailto:fest@eksempel.dk');
    /* Og brevet skal overleve udskiftningen — det var lige præcis
       dét, kanalen tørrede af, før den lærte data-brev. */
    expect(href, 'adressen blev skiftet, men brevet forsvandt').toContain('body=');
  });
});
