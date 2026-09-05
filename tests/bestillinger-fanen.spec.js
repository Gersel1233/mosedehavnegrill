/* ============================================================
   BESTILLINGER-FANEN: DAGEN, HUKOMMELSEN OG TYPEN  (6/9)
   ============================================================
   Kundens ord: *"in the order tab in the admin it's not clear
   what type of order it is, what they need to do, and when
   you've pressed done, you need to go into like a done bucket
   for the day, and it needs to be remembered."*

   ⚠️ FORLÆGGET ER TO SKÆRMBILLEDER af spiis' egen fane, ikke
   deres kode — samme fremgangsmåde som Overblik 1/9,
   bestillingskortet 31/8 og kalenderen 3/9.

   Målt på et skud af VORES fane, før der blev rettet noget:
   · seks kort i træk med "anna vind" og "klaus valentiner" med
     småt. Admin.pæntNavn har ligget i kerne.js siden 1/9, og
     Overblik var den ENESTE fane, der spurgte den — nøjagtig som
     Admin.kontakt indtil 3/9. Tredje gang, samme mønster
   · to af seks kort uden ét eneste typemærke, fordi afhentning
     med vilje ikke fik et
   · og dagvalget overlevede ikke en genindlæsning
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, visFane } = require('./hjaelp');

const IDAG = '2026-08-07';
const IGAAR = '2026-08-06';

function best(id, o) {
  return Object.assign({
    id, lokation_id: 'mosede', reference: 'SM260807-' + (10000 + id),
    navn: 'anna vind', telefon: '2030405' + (id % 10), email: null,
    hent_dato: IDAG, hent_tid: '12:30', antal: 2, status: 'afhentet',
    hvordan: 'afhentning', bord_nummer: null, slettet: null, fyld: [],
    linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
    intern_note: null, oprettet: '2026-08-07T08:00:00Z',
  }, o);
}

async function åbnFanen(page, bestillinger) {
  await åbnAdmin(page, { data: grunddata({ bestillinger }) });
  await visFane(page, 'p-bestillinger');
  await page.waitForTimeout(400);
}

test.describe('Dagen er standarden', () => {
  test('fanen åbner på i dag, ikke på alle dage', async ({ page }) => {
    await åbnFanen(page, [best(1), best(2, { hent_dato: IGAAR })]);
    /* ⚠️ TALLET KOMMER UDEFRA: kortet fra I GÅR må ikke være med.
       Et spørgsmål til dagvælgerens tekst alene ville bestå, også
       hvis listen viste alle dage. */
    await expect(page.locator('#bestillinger-liste .bestil-kort')).toHaveCount(1);
    await expect(page.locator('.bestil-dagnavn')).toContainText('7. august');
  });

  test('og "Færdige" er så DAGENS spand, ikke et livstidsarkiv', async ({ page }) => {
    /* Det er hele hans sætning: en færdig-spand FOR DAGEN. Med
       "alle dage" som standard ville bunken vokse for evigt. */
    await åbnFanen(page, [
      best(1, { navn: 'i dag' }),
      best(2, { navn: 'i gaar', hent_dato: IGAAR }),
      best(3, { navn: 'ogsaa i gaar', hent_dato: IGAAR }),
    ]);
    const fold = page.locator('#bestillinger-liste .bestil-gruppe.klar');
    await expect(fold).toContainText('Færdige (1)');
  });
});

test.describe('Dagvalget huskes', () => {
  test('et skift til en anden dag overlever en genindlæsning', async ({ page }) => {
    await åbnFanen(page, [best(1), best(2, { hent_dato: IGAAR })]);
    await page.locator('.adm-dagvaelger button').first().click();   // ← én dag tilbage
    await page.waitForTimeout(300);
    await expect(page.locator('.bestil-dagnavn')).toContainText('6. august');

    await page.reload();
    await page.waitForTimeout(1200);
    await visFane(page, 'p-bestillinger');
    await page.waitForTimeout(400);
    await expect(page.locator('.bestil-dagnavn'), 'dagvalget blev glemt')
      .toContainText('6. august');
  });

  test('"Alle dage" huskes også — det er et valg, ikke et fravalg', async ({ page }) => {
    /* ⚠️ `dato: null` ER et gyldigt valg. Gemmes der på VÆRDIEN
       i stedet for på nøglen, ryger netop den her. */
    await åbnFanen(page, [best(1), best(2, { hent_dato: IGAAR })]);
    await page.locator('.adm-seg button', { hasText: 'Alle dage' }).first().click();
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForTimeout(1200);
    await visFane(page, 'p-bestillinger');
    await page.waitForTimeout(400);
    await expect(page.locator('.bestil-dagnavn')).toContainText('Alle dage');
    await expect(page.locator('#bestillinger-liste .bestil-kort')).toHaveCount(2);
  });

  test('men en dag fra I GÅR huskes ikke ind i den nye dag', async ({ page }) => {
    /* ⚠️ DEN ANDEN HALVDEL, og uden den er hukommelsen en fælde:
       en medarbejder, der torsdag bladrede tilbage til onsdag,
       ville møde ONSDAG fredag morgen og tro, dagen var tom.
       Samme greb som dagens_ret_ingen (31/8): det gemte bærer sin
       egen dato og nulstiller sig selv. */
    await åbnAdmin(page, { data: grunddata({ bestillinger: [best(1)] }) });
    await page.evaluate((ig) => localStorage.setItem(
      'mosede_admin_bestil_dag', JSON.stringify({ dato: ig, gemt: ig })), IGAAR);
    await page.reload();
    await page.waitForTimeout(1200);
    await visFane(page, 'p-bestillinger');
    await page.waitForTimeout(400);
    await expect(page.locator('.bestil-dagnavn'), 'en gammel dag blev hentet frem')
      .toContainText('7. august');
  });
});

test.describe('Hver bestilling siger, hvad den er', () => {
  test('alle fire typer har hver sit mærke — også to-go', async ({ page }) => {
    await åbnFanen(page, [
      best(1, { navn: 'to go' }),
      best(2, { navn: 'spis her', hvordan: 'spis_her' }),
      best(3, { navn: 'ved bordet', hvordan: 'spis_her', bord_nummer: '7' }),
      best(4, { navn: 'leveres', hvordan: 'levering',
        leverings_adresse: 'Havnevej 4, 2670 Greve' }),
    ]);
    const kort = page.locator('#bestillinger-liste .bestil-kort');
    await expect(kort).toHaveCount(4);
    /* ⚠️ INGEN KORT UDEN TYPE. Med fire muligheder er fraværet af
       et mærke tvetydigt: personalet kan ikke se forskel på "det
       er to-go" og "mærket blev ikke tegnet". */
    const uden = await kort.evaluateAll((els) => els
      .filter((e) => !e.querySelector('.maerke.m-togo, .maerke.favorit, .maerke.m-bord, .maerke.m-ny'))
      .map((e) => e.textContent.slice(0, 40)));
    expect(uden, 'et kort uden typemærke').toEqual([]);
    await expect(page.locator('.maerke.m-togo')).toHaveCount(1);
    await expect(page.locator('.maerke.m-bord')).toContainText('Bord 7');
  });

  test('to-go råber ikke lige så højt som en levering', async ({ page }) => {
    /* To uafhængige elementer. To-go er den ALMINDELIGE
       bestilling; sagde den lige så meget som den, der skal køres
       ud, ville de fire typer være lige vigtige.

       ⚠️ MÅLT PÅ ÅBNE KORT. Et FÆRDIGT kort farver alle sine
       mærker grønne (.bestil-kort.b-faerdig .maerke), så dér er
       de to ens med vilje — og prøven ville måle den regel i
       stedet for sin egen. Fundet ved at falsificere. */
    await åbnFanen(page, [
      best(1, { status: 'ny' }),
      best(2, { status: 'ny', hvordan: 'levering', leverings_adresse: 'Havnevej 4' }),
    ]);
    const farve = (v) => page.locator(v).first().evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(await farve('.maerke.m-togo')).not.toBe(await farve('.maerke.m-ny'));
  });

  test('en gammel række uden hvordan er to-go, ikke ingenting', async ({ page }) => {
    /* Rækker fra før spis-her.sql har `hvordan` som null, og de
       VAR afhentning. Et kort uden mærke ville se ud som en fejl
       netop på de gamle. */
    await åbnFanen(page, [best(1, { hvordan: null })]);
    await expect(page.locator('.maerke.m-togo')).toHaveCount(1);
  });
});

test.describe('Navnet står, som det siges højt', () => {
  test('gæstens navn får stort forbogstav på bestillingskortet', async ({ page }) => {
    await åbnFanen(page, [best(1, { navn: 'klaus valentiner' })]);
    await expect(page.locator('#bestillinger-liste .vare-navn').first())
      .toHaveText('Klaus Valentiner');
  });

  test('og det er den SAMME regel som på Overblik', async ({ page }) => {
    /* ⚠️ TO FANER MOD HINANDEN. Et spørgsmål til Bestillinger om
       dens eget navn ville bestå, også hvis Overblik gik sin egen
       vej — og personalet skifter mellem de to hele dagen.

       Overblik har haft BÅDE pæntNavn og "🥡 To-go" siden 31/8.
       Det var Bestillinger, der manglede begge dele. */
    await åbnFanen(page, [best(1, { navn: 'bettina holm larsen', status: 'ny' })]);
    const paaFanen = await page.locator('#bestillinger-liste .vare-navn').first().textContent();
    await visFane(page, 'p-overblik');
    await page.waitForTimeout(400);
    const paaOverblik = await page.locator('#overblik-vagt .vare-navn')
      .first().textContent();
    expect(paaOverblik.trim(), 'de to faner skriver navnet forskelligt')
      .toBe(paaFanen.trim());
    /* ⚠️ OG DEN SKAL VÆRE RIGTIG, IKKE BARE ENS. Falsifikationen
       afslørede hullet: fjernes pæntNavn fra BEGGE faner, står de
       stadig ens — og prøven bestod på to forkerte navne. En
       sammenligning fanger kun uenighed, ikke fælles fejl. */
    expect(paaFanen.trim(), 'begge faner skriver navnet med småt')
      .toBe('Bettina Holm Larsen');
  });
});
