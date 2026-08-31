/* De tre forespørgselssider: selskaber, catering og baglokalet.

   Det er ÉN tabel med tre indgange (fase 2), og formularerne
   spørger om forskellige ting. Alt det ekstra lægges i kolonnen
   detaljer, så personalet ser felter og ikke en sætning, de skal
   læse et tal ud af.

   Og havnen er ét sted: er baglokalet lejet ud den 12., kan der
   ikke også holdes selskab hos jer den 12. Prøverne herunder
   måler browserens halvdel af det værn — databasens halvdel
   måles af supabase/proev-forespoergsel-kalender.sql. */

/* ⚠️ FEJLLINJEN SLÅS OP PÅ [data-fejllinje], IKKE PÅ .fine (31/8).

   Designet har ikke tegnet et fejlfelt; motoren låner den lille
   linje under knappen (se fineFelt() i js/skal/forespoergsel.js).
   Da "Kontakt og få et tilbud"-kortet kom ind i panelet, var der
   pludselig TO .fine — og seks prøver faldt med "strict mode
   violation: resolved to 2 elements".

   Attributten sættes af koden på præcis det element, den skriver
   i. Så måler prøven dét, der styrer, hvad gæsten ser — i stedet
   for at gætte på en klasse, designet bruger til flere ting. */
const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata, gemteData, lokalTilstand, sætUr,
  sætDataEngang, NØGLE } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';
const OPTAGET = '2026-09-12';

function data(ændringer) {
  const d = grunddata();
  d.forespoergsler = [];
  d.udlejninger = [];
  Object.assign(d, ændringer || {});
  return d;
}

/* En dag, personalet HAR sagt ja til. Kun aftalte dage er
   optagne — en forespørgsel, der lige er kommet ind, er et
   spørgsmål, ikke en booking. */
function medAftaltSelskab() {
  return data({
    forespoergsler: [{
      id: 1, lokation_id: 'mosede', reference: 'FO-1', type: 'selskab',
      navn: 'Anden gæst', telefon: '20304050', email: null,
      dato: OPTAGET, antal_personer: 30, besked: null,
      detaljer: { hvor: 'hos-jer' }, status: 'aftalt', intern_note: null,
      slettet: null, oprettet: '2026-08-01T10:00:00.000Z',
    }],
  });
}

async function åbn(page, sti, d) {
  await åbnSkal(page, sti, { ur: FREDAG, data: d || data() });
}

test.describe('Forespørgselssiderne', () => {
  test('selskabsforespørgslen lander med sine detaljer', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');

    /* ⚠️ ANLEDNING OG MAD ER FRITEKST SIDEN 29/8 — de var chips,
       og en gæst, der ikke kunne se sin anledning, trykkede
       "Andet", som ikke fortæller personalet noget. */
    await page.locator('#panledning').fill('Konfirmation');
    await page.locator('#pdato').fill('2026-10-03');
    await page.locator('#pantal').fill('42');
    await page.locator('#pmad').fill('Tapasfad og lidt sødt');
    await page.locator('#pnavn').fill('Sara Poulsen');
    await page.locator('#ptlf').fill('28871343');
    await page.locator('#pmail').fill('sara@eksempel.dk');
    await page.locator('#pbesked').fill('Vi kommer 12.30.');
    await page.locator('#forespoerg button.g.solid.blk').click();

    await expect(page.locator('#forespoerg h3')).toContainText('Tak, Sara');

    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.type).toBe('selskab');
    expect(f.dato).toBe('2026-10-03');
    expect(f.antal_personer).toBe(42);
    expect(f.email).toBe('sara@eksempel.dk');
    expect(f.detaljer.anledning).toBe('Konfirmation');
    expect(f.detaljer.hvor).toBe('hos-jer');
    /* Maden er FRITEKST siden 29/8 (kundens ord: "det aftaler I i
       fremtiden, ikke valgmuligheder") — chippen "Tapasfad"
       findes ikke længere. */
    expect(f.detaljer.mad).toBe('Tapasfad og lidt sødt');
    expect(f.status).toBe('ny');
  });

  test('baglokalet gemmer tidsrum og med/uden mad', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');

    await page.locator('[data-chips="single"] button', { hasText: 'Aften' }).click();
    await page.locator('#bdato').fill('2026-10-04');
    await page.locator('#bnavn').fill('Jonas Berg');
    await page.locator('#btlf').fill('28871343');
    await page.locator('#forespoerg button.g.solid.blk').click();

    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.type).toBe('baglokale');
    expect(f.detaljer.tidsrum).toContain('Aften');
    /* ⚠️ SEGMENTET HEDDER 'servering' NU (29/8). Feltet "mad" er
       gæstens FRITEKST om, hvad hun tænker — og to ting med det
       samme navn i den samme detaljer-blok ville overskrive
       hinanden, så personalet mistede det ene. */
    expect(f.detaljer.servering).toBe('med-mad');
  });

  /* ============================================================
     ET SEGMENT SKAL VISE, HVAD DER ER VALGT  (30/8)
     ------------------------------------------------------------
     Kundens ord om catering: "knapperne virker ikke ift levering
     eller afhentning".

     MÅLT på en iPhone 13: et tryk på "Afhentning" skjulte
     adressefeltet, men markeringen blev stående på "Levering" —
     designets [data-toggles] flyttede aldrig .on. Begge knapper
     så uændrede ud, så gæsten trykkede igen, og bagefter kunne
     hun ikke se, hvad hun havde valgt.

     ⚠️ PRØVEN MÅLER BEGGE HALVDELE. Feltets synlighed er det, der
     afgør, hvad der SENDES (se segSvar), og .on er det, gæsten
     SER. Går de to fra hinanden igen, er en af dem forkert.

     Set fejle: fjernes classList-linjen i havnegrillen.js, står
     "Levering" markeret efter et tryk på "Afhentning". */
  test('segmentet flytter markeringen, ikke kun feltet', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: grunddata() });
    const seg = page.locator('[data-toggles="#cadrfelt"]');

    await expect(seg.locator('button.on')).toHaveText(/Levering/);
    await expect(page.locator('#cadrfelt')).toBeVisible();

    await seg.locator('button', { hasText: 'Afhentning' }).click();
    await expect(seg.locator('button.on'), 'markeringen fulgte ikke trykket — '
      + 'knappen ser død ud').toHaveText('Afhentning');
    await expect(page.locator('#cadrfelt')).toBeHidden();

    // Og tilbage igen: et segment skal kunne fortryde.
    await seg.locator('button', { hasText: 'Levering' }).click();
    await expect(seg.locator('button.on')).toHaveText(/Levering/);
    await expect(page.locator('#cadrfelt')).toBeVisible();
  });

  test('cateringens adresse følger med ved levering — og ryger ved afhentning', async ({ page }) => {
    await åbn(page, '/h-catering.html');

    await page.locator('#cdato').fill('2026-10-05');
    await page.locator('#ckuv').fill('60');
    await page.locator('#cadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#cnavn').fill('Sara Poulsen');
    await page.locator('#ctlf').fill('28871343');
    await page.locator('#forespoerg button.g.solid.blk').click();

    let f = (await gemteData(page)).forespoergsler[0];
    expect(f.type).toBe('catering');
    expect(f.detaljer.levering).toBe('levering');
    expect(f.detaljer.adresse).toBe('Havnevej 20I, 2670 Greve');

    /* Skifter gæsten til afhentning, må adressen IKKE blive
       hængende — så ville personalet ringe om en levering, ingen
       har bedt om. */
    await åbn(page, '/h-catering.html');
    await page.locator('#cdato').fill('2026-10-06');
    await page.locator('#cadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('[data-toggles="#cadrfelt"] button', { hasText: 'Afhentning' }).click();
    await page.locator('#cnavn').fill('Sara Poulsen');
    await page.locator('#ctlf').fill('28871343');
    await page.locator('#forespoerg button.g.solid.blk').click();

    f = (await gemteData(page)).forespoergsler[0];
    expect(f.detaljer.levering).toBe('afhentning');
    expect(f.detaljer.adresse).toBeUndefined();
  });

  test('designets faste dato er væk, og feltet kan ikke gå bagud', async ({ page }) => {
    /* En pladsholder, ingen har valgt, ville blive sendt som
       gæstens ønskede dato den dag, hun glemmer at røre feltet. */
    await åbn(page, '/h-selskaber.html');

    await expect(page.locator('#pdato')).toHaveValue('');
    /* Fire dages varsel siden 29/8 — se "Selskabsforespørgslen"
       nedenfor. Feltet kan stadig ikke gå bagud; grænsen er bare
       rykket frem. */
    await expect(page.locator('#pdato')).toHaveAttribute('min', '2026-08-11');
    await expect(page.locator('#pdato')).toHaveAttribute('max', '2028-08-06');
  });

  test('en optaget dag kan ikke vælges til et selskab hos jer', async ({ page }) => {
    await åbn(page, '/h-selskaber.html', medAftaltSelskab());

    await page.locator('#pdato').fill(OPTAGET);
    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('optaget');

    await page.locator('#pnavn').fill('Sara Poulsen');
    await page.locator('#ptlf').fill('28871343');
    /* Mailen er påkrævet på selskabssiden siden 29/8: vi lover
       svar inden for et døgn, og en gæst, der ikke tager
       telefonen, skal kunne nås på skrift. */
    await page.locator('#pmail').fill('sara@eksempel.dk');
    await page.locator('#forespoerg button.g.solid.blk').click();

    // Der må ikke være kommet en nummer to på den dag
    const alle = (await gemteData(page)).forespoergsler;
    expect(alle.filter((f) => f.dato === OPTAGET)).toHaveLength(1);
  });

  test('ud af huset optager ingenting — så er dagen fri igen', async ({ page }) => {
    await åbn(page, '/h-selskaber.html', medAftaltSelskab());

    await page.locator('#pdato').fill(OPTAGET);
    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('optaget');

    await page.locator('.seg2 button', { hasText: 'Ud af huset' }).click();
    await expect(page.locator('#forespoerg [data-fejllinje]')).not.toContainText('optaget');

    await page.locator('#pnavn').fill('Sara Poulsen');
    await page.locator('#ptlf').fill('28871343');
    /* Mailen er påkrævet på selskabssiden siden 29/8: vi lover
       svar inden for et døgn, og en gæst, der ikke tager
       telefonen, skal kunne nås på skrift. */
    await page.locator('#pmail').fill('sara@eksempel.dk');
    await page.locator('#forespoerg button.g.solid.blk').click();

    const alle = (await gemteData(page)).forespoergsler;
    expect(alle.filter((f) => f.dato === OPTAGET)).toHaveLength(2);
  });

  test('catering må gerne ligge på en optaget dag', async ({ page }) => {
    // Maden kører ud; havnen står fri.
    await åbn(page, '/h-catering.html', medAftaltSelskab());

    await page.locator('#cdato').fill(OPTAGET);
    await page.locator('#cnavn').fill('Sara Poulsen');
    await page.locator('#ctlf').fill('28871343');
    await page.locator('#forespoerg button.g.solid.blk').click();

    await expect(page.locator('#forespoerg h3')).toContainText('Tak, Sara');
  });

  test('en bekræftet udlejning lukker dagen for selskaber', async ({ page }) => {
    const d = data({
      udlejninger: [{
        id: 1, lokation_id: 'mosede', reference: 'UD-1', navn: 'Lejer',
        telefon: '20304051', email: null, dato: OPTAGET, antal_personer: 20,
        besked: null, status: 'bekraeftet', intern_note: null, slettet: null,
        oprettet: '2026-08-01T10:00:00.000Z',
      }],
    });
    await åbn(page, '/h-baglokale.html', d);

    await page.locator('#bdato').fill(OPTAGET);
    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('optaget');
  });

  test('uden navn, nummer eller med en skæv mail sendes den ikke', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');

    await page.locator('#forespoerg button.g.solid.blk').click();
    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('Skriv dit navn');

    await page.locator('#pnavn').fill('Sara');
    await page.locator('#forespoerg button.g.solid.blk').click();
    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('telefonnummer');

    await page.locator('#ptlf').fill('28871343');
    await page.locator('#pmail').fill('sara-at-eksempel');
    await page.locator('#forespoerg button.g.solid.blk').click();
    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('E-mailen');

    expect((await gemteData(page)).forespoergsler || []).toHaveLength(0);
  });

  /* ⚠️ RÆKKEFØLGEN ER STADIG DESIGNETS — det er dét, prøven
     vogter. Etiketterne er ændret 29/8 efter kundens egen ordre
     (fritekst i stedet for chips, stedvalg, mail påkrævet), og
     to felter er kommet til; men INTET er flyttet, og
     designbundtets orden — anledning → dato → antal → hvor →
     mad → fortæl → navn/tlf/mail — står. Kommer der en ny
     etiket ind midt i listen uden at nogen har bedt om det,
     falder prøven her. */
  test('skallen er urørt: felterne står i designets rækkefølge', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    const etiketter = await page.$$eval('#forespoerg .field label',
      (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' ')));
    expect(etiketter).toEqual(['Hvad handler det om?', 'Dato', 'Antal gæster',
      'Hvor skal det være?', 'Hvor på havnen?', 'Skal dækket med?',
      'Hvad tænker I mad-mæssigt? (vi aftaler det endelige sammen)',
      'Fortæl om dagen', 'Navn', 'Telefonnummer', 'E-mail']);
  });
});

/* ------------------------------------------------------------
   FROKOSTORDNINGEN ER DEN FJERDE INDGANG
   ------------------------------------------------------------
   Den stod som fase 6 med "tilbagevendende levering, pauser,
   helligdage". Det var en misforståelse, og Mikkel rettede den
   20/8: den mad, man også kan bestille, skal bare kunne bestilles
   senest dagen før — og det gør forsidens bestilling allerede.

   Men designet fra 23/8 tegnede siden som et B2B-tilbud: firma,
   CVR, faste ugedage, fakturamail og knappen "Få et tilbud". Og
   dét er ikke en bestilling — det er en forespørgsel.

   Der bygges altså INGEN abonnementsmotor. Prøverne her måler,
   at siden bruger den samme tabel og det samme modul som de tre
   andre — og at den ikke lægger beslag på havnen.

   ⚠️ Kræver supabase/frokost.sql kørt i Mosede-projektet: uden
   den afviser databasen typen 'frokost'. Øvetilstanden her har
   ingen check-constraint, så prøven kan ikke se det — det kan
   supabase/proev-frokost.sql (8 × BESTOD lokalt).
   ------------------------------------------------------------ */
/* ============================================================
   FROKOSTEN FIK SAMME RUNDE — MED SINE EGNE PRINCIPPER  (30/8)

   ⚠️ OG DER BYGGES STADIG INGEN ABONNEMENTSMOTOR. "Hvor tit" er
   et FELT på forespørgslen: personalet skal kunne se, om firmaet
   spørger om én levering eller om hver uge, for det er to vidt
   forskellige priser. Der er ingen tabel til gentagne leveringer,
   ingen pauser og ingen automatiske ordrer — det blev afvist
   20/8, og prøverne herunder må ikke komme til at forudsætte det.
   ============================================================ */
test.describe('Frokostordningens runde', () => {

  test('hvor tit følger med som et ønske, ikke som et abonnement', async ({ page }) => {
    await åbnSkal(page, '/h-frokost.html', { data: grunddata() });
    await page.fill('#fstart', '2026-09-12');
    await page.locator('.chipset').first().locator('button', { hasText: 'Hver måned' }).click();
    await page.fill('#ffirma', 'Bech A/S');
    await page.fill('#fnavn', 'Anna Vind');
    await page.fill('#ftlf', '20304050');
    await page.fill('#fadr', 'Havnevej 3, 2670 Greve');
    await page.locator('#tilbud button.g.solid.blk').click();

    const d = await gemteData(page);
    expect(d.forespoergsler[0].detaljer.hvor_ofte).toBe('Hver måned');
    /* ⚠️ OG DER ER KUN ÉN RÆKKE. Ville nogen bygge en motor, ville
       "hver måned" begynde at oprette flere — det er præcis det,
       der er afvist. Én forespørgsel, ét menneske, én samtale. */
    expect(d.forespoergsler).toHaveLength(1);
    expect(d.bestillinger || []).toHaveLength(0);
  });

  test('fritekst om indholdet lægges til det valgte', async ({ page }) => {
    await åbnSkal(page, '/h-frokost.html', { data: grunddata() });
    await page.fill('#fstart', '2026-09-12');
    await page.fill('#fandet', 'to vegetarer og en glutenfri');
    await page.fill('#ffirma', 'Bech A/S');
    await page.fill('#fnavn', 'Anna Vind');
    await page.fill('#ftlf', '20304050');
    await page.fill('#fadr', 'Havnevej 3, 2670 Greve');
    await page.locator('#tilbud button.g.solid.blk').click();

    const ind = (await gemteData(page)).forespoergsler[0].detaljer.indhold;
    expect(ind).toContain('Smørrebrød');
    expect(ind).toContain('to vegetarer og en glutenfri');
  });

  /* ⚠️ CHIPGRUPPERNE LÆSES EFTER RÆKKEFØLGE. "Hvor tit" kom til
     som den FØRSTE gruppe 30/8, og bytter nogen om på to grupper
     i HTML'en uden at rette SIDER, lander ugedagene under "hvor
     ofte" — tavst, og admin viser det pænt formateret. */
  test('ugedagene lander som ugedage, ikke under hvor tit', async ({ page }) => {
    await åbnSkal(page, '/h-frokost.html', { data: grunddata() });
    await page.fill('#fstart', '2026-09-12');
    await page.fill('#ffirma', 'Bech A/S');
    await page.fill('#fnavn', 'Anna Vind');
    await page.fill('#ftlf', '20304050');
    await page.fill('#fadr', 'Havnevej 3, 2670 Greve');
    await page.locator('#tilbud button.g.solid.blk').click();

    const d = (await gemteData(page)).forespoergsler[0].detaljer;
    expect(d.dage).toContain('Man');
    expect(d.hvor_ofte).toBe('Hver uge');
  });

  test('tre dages varsel, og siden siger det samme tal', async ({ page }) => {
    await åbnSkal(page, '/h-frokost.html', { data: grunddata() });
    await expect(page.locator('#fstart')).toHaveAttribute('min', '2026-08-10');
    await expect(page.locator('[data-varsel]')).toHaveText('mindst tre dage');
    await expect(page.locator('.lk-dag[data-dato="2026-08-09"]')).toBeDisabled();
    await expect(page.locator('.lk-dag[data-dato="2026-08-10"]')).toBeEnabled();
  });

  /* ============================================================
     ⚠️ VI OPFINDER INGEN PRIS  (30/8)
     ------------------------------------------------------------
     Siden stod med designets "59 kr. pr. medarbejder pr. dag ved
     10+ personer" og "gratis levering inden for 12 km af havnen".
     Begge er tal, ingen i forretningen har sagt.

     Det er den dyreste slags fejl, en side kan lave: et firma
     læser 59, beder om et tilbud og får 75 — og så har vi lovet
     noget på ejerens vegne, som han skal afvise. Kunden tog
     beslutningen 30/8: ud nu.

     ⚠️ OG DER KOM INGEN PRISBEREGNER I STEDET. Et tal, vi selv
     regner os frem til, er lige så opfundet som et, vi skriver.
     Prisen kommer fra ejeren, i den samtale, siden lover.
     ============================================================ */
  test('frokostsiden lover ingen pris, vi ikke har fået', async ({ page }) => {
    await åbnSkal(page, '/h-frokost.html', { data: grunddata() });
    const tekst = await page.locator('body').innerText();

    expect(tekst, 'en opfundet pris pr. medarbejder er tilbage')
      .not.toMatch(/\d+\s*kr\.?\s*pr\.\s*medarbejder/i);
    expect(tekst, 'en opfundet leveringsgrænse er tilbage')
      .not.toMatch(/gratis levering/i);
    expect(tekst).not.toContain('59 kr');

    // Og siden siger, hvad der SÅ gælder.
    await expect(page.locator('.facts')).toContainText('afhænger af antal');
  });

  test('ring og mail er second options, og processen står', async ({ page }) => {
    await åbnSkal(page, '/h-frokost.html', { data: grunddata() });
    expect(await page.locator('section > .callrow').count()).toBe(0);
    await expect(page.locator('.anden-vej a[href^="tel:"]')).toHaveCount(1);
    await expect(page.locator('.note.trin-liste')).toContainText('Inden for et døgn');
    /* Og løftet om, at intet sættes i gang af sig selv — det er
       dét, der gør, at "hver måned" ikke er et abonnement. */
    await expect(page.locator('#tilbud .fine')).toContainText('Uforpligtende');
  });
});

test.describe('Frokostordningen', () => {

  async function udfyld(page) {
    await page.locator('#ffirma').fill('Havnens Revision ApS');
    await page.locator('#fcvr').fill('12345678');
    await page.locator('#fantal').fill('14');
    await page.locator('#fstart').fill('2026-09-01');
    await page.locator('#fnavn').fill('Jens Kok');
    await page.locator('#ftlf').fill('28871343');
    await page.locator('#fmail').fill('bogholderi@firma.dk');
  }

  test('tilbuddet lander som en forespørgsel, ikke som en bestilling', async ({ page }) => {
    await åbn(page, '/h-frokost.html');
    await udfyld(page);
    await page.locator('#fadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#tilbud button.g.solid.blk').click();

    const gemt = await gemteData(page);
    expect(gemt.bestillinger || [], 'en frokostordning er ikke en bestilling')
      .toHaveLength(0);

    const f = gemt.forespoergsler[0];
    expect(f.type).toBe('frokost');
    expect(f.navn).toBe('Jens Kok');
    expect(f.telefon).toBe('28871343');
    expect(f.email).toBe('bogholderi@firma.dk');
    expect(f.dato).toBe('2026-09-01');
    expect(f.antal_personer).toBe(14);
  });

  test('firma, CVR og ugedagene står som felter, ikke som fritekst', async ({ page }) => {
    /* Uden detaljer ville alle valgene ende i beskeden, hvor
       personalet skulle læse en sætning igennem for at finde
       tallet. */
    await åbn(page, '/h-frokost.html');
    await udfyld(page);
    await page.locator('#tilbud button.g.solid.blk').click();

    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.detaljer.firma).toBe('Havnens Revision ApS');
    expect(f.detaljer.cvr).toBe('12345678');
    expect(f.detaljer.dage).toEqual(['Man', 'Tirs', 'Ons', 'Tors', 'Fre']);
    expect(f.detaljer.indhold).toContain('Smørrebrød');
  });

  test('leveringsadressen ryger, når firmaet henter selv', async ({ page }) => {
    /* Samme fælde som på catering: [data-toggles] flytter ikke
       .on, og en adresse, der bliver hængende, sender køkkenet ud
       med mad, nogen henter selv. */
    await åbn(page, '/h-frokost.html');
    await udfyld(page);
    await page.locator('#fadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('[data-toggles="#fadrfelt"] button', { hasText: 'Vi henter selv' }).click();
    await page.locator('#tilbud button.g.solid.blk').click();

    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.detaljer.levering).toBe('afhentning');
    expect(f.detaljer.adresse).toBeUndefined();
  });

  /* EN FROKOSTORDNING OPTAGER INGEN DAGE. Datoen er ønsket
     START, ikke en enkelt dag — og maden kører ud af huset, så
     lokalet står frit. Optog den dagen, kunne ét firma med en
     fast onsdag lukke hver eneste onsdag for selskaber. */
  test('den kan sendes på en dag, hvor havnen er optaget', async ({ page }) => {
    await åbn(page, '/h-frokost.html', medAftaltSelskab());
    await udfyld(page);
    await page.locator('#fstart').fill(OPTAGET);
    await page.locator('#tilbud button.g.solid.blk').click();

    const f = (await gemteData(page)).forespoergsler
      .filter((x) => x.type === 'frokost')[0];
    expect(f, 'frokosten blev spærret af en dag, den ikke lægger beslag på')
      .toBeTruthy();
    expect(f.dato).toBe(OPTAGET);
  });

  test('uden navn og telefon sendes der ingenting', async ({ page }) => {
    await åbn(page, '/h-frokost.html');
    await page.locator('#ffirma').fill('Firma uden kontakt');
    await page.locator('#tilbud button.g.solid.blk').click();

    const gemt = await gemteData(page);
    expect(gemt.forespoergsler || []).toHaveLength(0);
  });
});

/* Den GAMLE selskabsside bygger sine knapper af det, den har en
   tekst til — ikke af hele listen over, hvad databasen tager imod.
   De to var det samme, indtil frokosten kom til 24/8, og så fik
   siden en fjerde knap, der førte til en formular uden ét eneste
   af frokostens felter. Prøven er set fejle. */
/* ⚠️ SPRUNGET OVER: /selskaber/ er en vejviser nu (30/8).

   Prøven kom med frokostrunden 24/8 og vogtede, at den GAMLE
   selskabssides typevælger ikke fik en fjerde knap, når
   FORESPOERGSEL_TYPER blev udvidet. Den side sender videre til
   h-selskaber.html i dag, og typevælgeren findes ikke: hver af de
   fire sider har ÉN fast type. At hver side sender sin egen type
   og ingen andens, måles af prøverne længere oppe i filen —
   "selskabsforespørgslen lander med sine detaljer" og
   "tilbuddet lander som en forespørgsel, ikke som en bestilling". */
test.skip('den gamle selskabsside tilbyder stadig kun sine egne tre', async ({ page }) => {
  await åbnSkal(page, '/selskaber/', { ur: FREDAG, data: data() });
  await expect(page.locator('.type-knap')).toHaveCount(3);
  await expect(page.locator('.type-knap[data-type="frokost"]')).toHaveCount(0);
});

/* ------------------------------------------------------------
   LEDIGHEDSKALENDEREN  (29/8)

   Kundens ord: "en kalender som admin styrer men kunderne kan se
   ift hvis der allerede er booket eller reserveret den dag."
   Nettet viser optagne_dage — kun datoer, aldrig navne — og en
   dag er først optaget, når personalet har sagt ja OG låst den
   (eller en udlejning står bekræftet). En optaget dag STÅR i
   nettet, streget: en dag, der mangler, ligner en fejl.
   ------------------------------------------------------------ */
test.describe('Ledighedskalenderen', () => {

  function medUdlejning() {
    const d = data();
    d.udlejninger = [{
      id: 1, lokation_id: 'mosede', reference: 'BL-1', navn: 'Hansen',
      telefon: '11111111', dato: OPTAGET, status: 'bekraeftet',
    }];
    return d;
  }

  test('den optagne dag står streget og kan ikke vælges — en ledig kan', async ({ page }) => {
    await åbn(page, '/h-baglokale.html', medUdlejning());

    await expect(page.locator('#ledigkal')).toBeVisible();
    // Uret står i august; den optagne dag ligger i september.
    await page.locator('#lk-naeste').click();
    await expect(page.locator('#lk-titel')).toHaveText('september 2026');

    const taget = page.locator(`.lk-dag[data-dato="${OPTAGET}"]`);
    await expect(taget).toHaveClass(/taget/);
    await expect(taget).toBeDisabled();

    /* Klik på en ledig dag sætter datofeltet — samme vej som et
       håndskrevet valg, så datospærrens lyttere ser det. */
    await page.locator('.lk-dag[data-dato="2026-09-18"]').click();
    await expect(page.locator('#bdato')).toHaveValue('2026-09-18');
    await expect(page.locator('.lk-dag[data-dato="2026-09-18"]')).toHaveClass(/valgt/);
  });

  /* ⚠️ REGLEN ER LAVET OM, IKKE PRØVEN GEMT VÆK (30/8).

     Her stod, at nettet SKULLE forsvinde ved "ud af huset" — en
     kalender, hvor alt er ledigt, ville bare fylde. Så bad kunden
     om noget andet: "valg af datoen er forældet udseende og
     navigations ting fix". Tilbage stod browserens eget
     <input type=date>, og på en telefon er det et hjul, hvor man
     hverken ser ugedagene eller hvilke dage der er for tidlige.

     Nettet ER datofeltet nu, på alle fire sider — så det bliver
     stående. Det, der følger optagerDagen, er de to ting, der
     handler om at holde festen HOS OS: markeringen af optagne
     dage og forklaringen "Ledig / Optaget". Er der ingen dage,
     der kan være optagne, må siden ikke strege noget eller love
     en oplysning, den ikke giver. */
  test('ud af huset streger ingen dage — men nettet bliver, det ER datofeltet', async ({ page }) => {
    await åbn(page, '/h-selskaber.html', medUdlejning());
    await expect(page.locator('#ledigkal')).toBeVisible();
    await page.locator('#lk-naeste').click();
    await expect(page.locator(`.lk-dag[data-dato="${OPTAGET}"]`),
      'hos jer skal den lejede dag stå streget').toHaveClass(/taget/);
    await expect(page.locator('#ledigkal .lk-tegn')).toBeVisible();

    await page.locator('.seg2 button', { hasText: 'Ud af huset' }).click();

    await expect(page.locator('#ledigkal'),
      'nettet er datovælgeren — forsvinder den, står browserens hjul tilbage')
      .toBeVisible();
    await expect(page.locator(`.lk-dag[data-dato="${OPTAGET}"]`),
      'ud af huset optager ingen dage, så der må ikke streges noget')
      .not.toHaveClass(/taget/);
    await expect(page.locator('#ledigkal .lk-tegn'),
      'forklaringen "Ledig / Optaget" lover en oplysning, nettet ikke giver')
      .toBeHidden();
  });
});

/* ------------------------------------------------------------
   SELSKABSFORESPØRGSLEN BLEV KLOGERE  (29/8)

   Kundens liste: anledningen og maden skal kunne SKRIVES (de seks
   chips kunne ikke rumme "min mors 80-års, men som frokost", og
   maden aftales alligevel i telefonen bagefter) · mindst FIRE
   dages varsel ("de kan ikke nå det på 1-3 dage") · stedvalget
   skal være klogere (hvor på havnen, skal dækket med) · navn,
   nummer OG mail er påkrævede og tjekkes · og det skal være
   tydeligt, at vi vender tilbage inden for et døgn.
   ------------------------------------------------------------ */
test.describe('Selskabsforespørgslen', () => {

  test('anledning og mad skrives — der er ingen chips tilbage til dem', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    await expect(page.locator('#panledning')).toBeVisible();
    await expect(page.locator('#pmad')).toBeVisible();
    /* Kun stedvalgets to grupper er chips nu. Kommer der en
       tredje, er det en beslutning, nogen skal tage bevidst. */
    await expect(page.locator('#forespoerg [data-chips]')).toHaveCount(2);
  });

  test('fire dages varsel — hverken feltet eller kalenderen slipper en tidligere dag', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');

    /* FREDAG er 2026-08-07, så tidligst 11/8. Tallet kommer
       UDEFRA: prøven regner det selv ud i stedet for at spørge
       siden om, hvad den mener. */
    await expect(page.locator('#pdato')).toHaveAttribute('min', '2026-08-11');

    // Kalenderen må heller ikke kunne vælge den 10.
    await expect(page.locator('.lk-dag[data-dato="2026-08-10"]')).toBeDisabled();
    await expect(page.locator('.lk-dag[data-dato="2026-08-11"]')).toBeEnabled();

    /* Og skriver nogen datoen alligevel (feltet kan tastes), skal
       beskeden sige hvorfor — og hvad man gør i stedet. */
    await page.fill('#pdato', '2026-08-09');
    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('mindst 4 dage');
    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('ring');
  });

  test('mailen er påkrævet — løftet om svar kræver en vej tilbage', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    await page.fill('#pdato', '2026-09-12');
    await page.fill('#pnavn', 'Anna Vind');
    await page.fill('#ptlf', '20304050');
    await page.locator('#forespoerg button.g.solid.blk').click();

    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('e-mail');
    // Intet må være sendt.
    expect((await gemteData(page)).forespoergsler || []).toHaveLength(0);

    // Og en skæv mail bliver også fanget.
    await page.fill('#pmail', 'anna-uden-snabela');
    await page.locator('#forespoerg button.g.solid.blk').click();
    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('ser ikke rigtig ud');
  });

  test('stedvalget følger med — og forsvinder ud af huset', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    await expect(page.locator('#stedfelt')).toBeVisible();

    await page.fill('#pdato', '2026-09-12');
    await page.fill('#pnavn', 'Anna Vind');
    await page.fill('#ptlf', '20304050');
    await page.fill('#pmail', 'anna@eksempel.dk');
    await page.fill('#panledning', '80-års fødselsdag');
    await page.fill('#pmad', 'Smørrebrød og lidt varmt');
    await page.locator('#stedfelt [data-chips]').first()
      .locator('button', { hasText: 'Baglokalet' }).click();
    await page.locator('#forespoerg button.g.solid.blk').click();

    await expect(page.locator('#forespoerg')).toContainText('Tak');
    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.detaljer.anledning).toBe('80-års fødselsdag');
    expect(f.detaljer.mad).toBe('Smørrebrød og lidt varmt');
    expect(f.detaljer.sted).toBe('Baglokalet');
  });

  /* ⚠️ Spørger vi om lokalevalg til en fest UD AF HUSET, giver vi
     et løfte om at holde den for dem. */
  test('ud af huset skjuler stedvalget — men ikke datofeltet', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    await expect(page.locator('#stedfelt')).toBeVisible();
    await page.locator('.seg2 button', { hasText: 'Ud af huset' }).click();
    await expect(page.locator('#stedfelt')).toBeHidden();
    /* ⚠️ KALENDEREN BLIVER — se noten ved "ud af huset streger
       ingen dage" ovenfor: nettet er datovælgeren siden 30/8, og
       kun markeringen følger optagerDagen. */
    await expect(page.locator('#ledigkal')).toBeVisible();
  });

  test('siden lover et svar inden for et døgn', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('inden for et døgn');
  });
});

/* ------------------------------------------------------------
   BAGLOKALET FIK SELSKABSSIDENS FORLØB  (29/8)

   Kundens ord: siden "ser også uoverskuelig og lort ud og er
   cirka samme koncept" — fritekst i stedet for chips, fire dages
   varsel, og "der skal stå hvad der sker, når de booker".

   ⚠️ ÉN FORSKEL, OG DEN ER KUNDENS EGEN: her er mail ELLER
   nummer nok ("lade email eller nummer være som en option").
   Selskabssiden kræver begge, fordi et tilbud dér er tal og
   forbehold, der skal skrives ned.
   ------------------------------------------------------------ */
/* ============================================================
   CATERING FIK SELSKABERNES RUNDE  (30/8)

   Kundens liste: knapperne virkede ikke, kortet skulle opdateres
   som resten, "type arrangement fint med forslag men skriv selv
   skal være en mulighed", det samme for "hvad skal vi levere",
   datovalget var forældet, to dages varsel, processen skulle stå,
   og ring/mail skulle væk fra toppen som second options.
   ============================================================ */
test.describe('Cateringforespørgslen', () => {

  /* ⚠️ GÆSTENS EGNE ORD VINDER OVER CHIPPEN. "Privatfest" står
     markeret på forhånd — hun har ikke trykket på den. Skriver
     hun sin egen anledning, er DET svaret, og admin skal have
     den i overskriften på kortet. */
  test('skriver gæsten sin egen anledning, slår den chippen', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: grunddata() });
    await page.fill('#cdato', '2026-09-12');
    await page.fill('#canledning', 'Rund fødselsdag med tale');
    await page.fill('#cnavn', 'Anna Vind');
    await page.fill('#ctlf', '20304050');
    await page.fill('#cadr', 'Havnevej 3, 2670 Greve');
    await page.locator('#forespoerg button.g.solid.blk').click();

    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.detaljer.anledning).toBe('Rund fødselsdag med tale');
    expect(f.detaljer.anledning).not.toBe('Privatfest');
  });

  /* ⚠️ MEN MADEN LÆGGES TIL. Man vælger smørrebrød OG skriver "og
     noget vegetarisk" — erstattede teksten listen, ville køkkenet
     lave det halve af det, gæsten havde valgt. */
  test('fritekst om maden lægges TIL det valgte, ikke i stedet for', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: grunddata() });
    await page.fill('#cdato', '2026-09-12');
    await page.fill('#candet', 'og noget vegetarisk');
    await page.fill('#cnavn', 'Anna Vind');
    await page.fill('#ctlf', '20304050');
    await page.fill('#cadr', 'Havnevej 3, 2670 Greve');
    await page.locator('#forespoerg button.g.solid.blk').click();

    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.detaljer.levering_indhold).toContain('Smørrebrød');
    expect(f.detaljer.levering_indhold).toContain('og noget vegetarisk');
  });

  /* To dages varsel (30/8). Køkkenet skal kunne købe ind. */
  test('to dages varsel — hverken feltet eller nettet slipper i morgen', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: grunddata() });
    // Uret står fredag 7. august, så første mulige dag er den 9.
    await expect(page.locator('#cdato')).toHaveAttribute('min', '2026-08-09');
    await expect(page.locator('.lk-dag[data-dato="2026-08-08"]')).toBeDisabled();
    await expect(page.locator('.lk-dag[data-dato="2026-08-09"]')).toBeEnabled();

    /* ⚠️ OG TEKSTEN PÅ SIDEN SIGER DET SAMME TAL. Faktakortet
       sagde "mindst en uge før ved mere end 30 kuverter", mens
       formularen holdt to dage — to udgaver af den samme regel,
       og gæsten møder ugen først. */
    await expect(page.locator('[data-varsel]')).toHaveText('mindst to dage');
  });

  /* ⚠️ NETTET ER DATOVÆLGER HER, IKKE LEDIGHEDSKALENDER. Kundens
     ord: "valg af datoen er forældet udseende og navigations
     ting". Catering optager INGEN dage — maden kører ud — så
     nettet skal stå der uden at strege noget, og uden
     forklaringen "Ledig / Optaget", som ville love en oplysning,
     det ikke giver. */
  test('datonettet står, og ingen dag er streget som optaget', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: medAftaltSelskab() });
    await expect(page.locator('#ledigkal')).toBeVisible();
    await expect(page.locator('.lk-dag.taget')).toHaveCount(0);
    await expect(page.locator('#ledigkal .lk-tegn')).toHaveCount(0);

    // Og et tryk i nettet sætter datoen.
    await page.locator('.lk-dag[data-dato="2026-08-20"]').click();
    await expect(page.locator('#cdato')).toHaveValue('2026-08-20');
  });

  /* ⚠️ RING OG MAIL ER SECOND OPTIONS (kundens ord). Øverst
     konkurrerede de med formularen; den, der lige er landet, blev
     bedt om at vælge mellem tre veje, før hun vidste, hvad hun
     ville spørge om. */
  test('ring og mail står under knappen, ikke over formularen', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: grunddata() });
    // Ingen kontaktrække FØR panelet.
    expect(await page.locator('section > .callrow').count()).toBe(0);

    const anden = page.locator('.anden-vej');
    await expect(anden).toContainText('hellere tale med os');
    await expect(anden.locator('a[href^="tel:"]')).toHaveCount(1);
    await expect(anden.locator('a[href^="mailto:"]')).toHaveCount(1);

    /* Og den står EFTER send-knappen — rækkefølgen er hele
       pointen, ikke bare at de findes. */
    const orden = await page.evaluate(() => {
      const knap = document.querySelector('#forespoerg button.g.solid.blk');
      const anden = document.querySelector('.anden-vej');
      return knap.compareDocumentPosition(anden) & Node.DOCUMENT_POSITION_FOLLOWING;
    });
    expect(orden, 'den anden vej står før send-knappen').toBeTruthy();
  });

  test('siden siger, hvad der sker efter forespørgslen', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: grunddata() });
    const boks = page.locator('.note.trin-liste');
    await expect(boks).toBeVisible();
    await expect(boks).toContainText('Inden for et døgn');
    await expect(page.locator('#forespoerg [data-fejllinje]'))
      .toContainText('ikke en bestilling endnu');
  });
});

test.describe('Baglokalets forespørgsel', () => {

  test('anledning og mad skrives, og der er fire dages varsel', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');
    await expect(page.locator('#banledning')).toBeVisible();
    await expect(page.locator('#bmad')).toBeVisible();
    await expect(page.locator('#bdato')).toHaveAttribute('min', '2026-08-11');
    /* Kun tidsrummet er chips: det ER et valg mellem fire kasser,
       og lokalet lejes ud i dem. */
    await expect(page.locator('#forespoerg [data-chips]')).toHaveCount(1);
  });

  test('siden fortæller, hvad der sker bagefter', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');
    const boks = page.locator('.note.trin-liste');
    await expect(boks).toBeVisible();
    await expect(boks).toContainText('Inden for et døgn');

    /* ⚠️ OG DEN SKAL SE UD SOM ET AFSNIT FOR SIG. Første udgave
       hed .hvad-sker og havde ingen stil i noget stilark — målt
       på en iPhone 13 lå de tre trin klods op ad e-mail-feltet
       uden luft og uden baggrund, så de lignede feltets
       hjælpetekst. En klasse, der ikke slår igennem, er ingen
       regel; derfor læses den BEREGNEDE baggrund og ikke klassen.
       Prøven er set fejle med .hvad-sker tilbage i filen. */
    const stil = await boks.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundColor, luft: parseFloat(s.paddingTop) };
    });
    expect(stil.bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(stil.luft).toBeGreaterThan(6);
    /* ⚠️ Og at det IKKE er en booking endnu — en gæst, der tror
       lokalet er hendes, møder op med tredive gæster. */
    await expect(page.locator('#forespoerg [data-fejllinje]'))
      .toContainText('ikke en booking endnu');
  });

  test('en mail alene er nok — og et nummer alene er også nok', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');
    await page.fill('#bdato', '2026-09-12');
    await page.fill('#bnavn', 'Anna Vind');
    await page.fill('#banledning', 'Rund fødselsdag');
    // Ingen telefon — kun mail.
    await page.fill('#bmail', 'anna@eksempel.dk');
    await page.locator('#forespoerg button.g.solid.blk').click();

    await expect(page.locator('#forespoerg')).toContainText('Tak');
    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.email).toBe('anna@eksempel.dk');
    expect(f.detaljer.anledning).toBe('Rund fødselsdag');
  });

  test('men uden nogen af delene kan der ikke sendes', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');
    await page.fill('#bdato', '2026-09-12');
    await page.fill('#bnavn', 'Anna Vind');
    await page.locator('#forespoerg button.g.solid.blk').click();

    await expect(page.locator('#forespoerg [data-fejllinje]'))
      .toContainText('telefonnummer eller en e-mail');
    expect((await gemteData(page)).forespoergsler || []).toHaveLength(0);
  });

  /* ⚠️ ØVETILSTANDEN SKAL FEJLE SOM DATABASEN. Et halvt nummer
     bliver afvist af forespoergsel_telefon_form_ok i Supabase —
     og en øvetilstand, der er mildere, tager imod det,
     produktionen afviser. */
  test('et halvt telefonnummer bliver afvist, også med en mail', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');
    await page.fill('#bdato', '2026-09-12');
    await page.fill('#bnavn', 'Anna Vind');
    await page.fill('#btlf', '12');
    await page.fill('#bmail', 'anna@eksempel.dk');
    await page.locator('#forespoerg button.g.solid.blk').click();

    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('for kort');
    expect((await gemteData(page)).forespoergsler || []).toHaveLength(0);
  });
});

/* ============================================================
   VÆRN, DER FULGTE MED FRA DEN GAMLE SELSKABSSIDE  (30/8)
   ------------------------------------------------------------
   ⚠️ tests/forespoergsel.spec.js målte /selskaber/, og den side
   blev en VEJVISER, da de to udgaver af hjemmesiden blev lagt
   sammen. Filens gæstehalvdel er derfor sprunget over — men seks
   af dens prøver målte noget, INGEN anden prøve dækkede, og de
   står her i stedet, mod h-selskaber.html.

   Læren er den samme som ved menuside.spec.js: dækning forsvinder
   ikke ved, at en prøve fejler — den forsvinder ved, at filen
   holder op med at måle det, den hedder. Parkeres en prøvefil,
   skal den læses igennem for det, ingen anden måler.
   ============================================================ */
test.describe('Værn, der fulgte med fra den gamle selskabsside', () => {

  const NAVN = 'Anna Hansen';
  const TLF = '20304050';
  const MAIL = 'anna@eksempel.dk';

  async function udfyld(page, { navn = NAVN, tlf = TLF, mail = MAIL,
    dato, antal, besked } = {}) {
    if (navn !== null) await page.locator('#pnavn').fill(navn);
    if (tlf !== null) await page.locator('#ptlf').fill(tlf);
    if (mail !== null) await page.locator('#pmail').fill(mail);
    if (dato !== undefined) await page.locator('#pdato').fill(dato);
    if (antal !== undefined) await page.locator('#pantal').fill(antal);
    if (besked !== undefined) await page.locator('#pbesked').fill(besked);
  }

  const send = (page) => page.locator('#forespoerg button.g.solid.blk').click();

  test('gæsten får en reference, hun kan læse op i telefonen', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    await udfyld(page);
    await send(page);

    const note = page.locator('#forespoerg .note');
    await expect(note).toBeVisible();

    /* FO og ikke SM: personalet har de to lister ved siden af
       hinanden, og en gæst, der læser koden op, skal ikke sende
       nogen på jagt i den forkerte. Ingen I, O, 0 og 1 — de
       forveksles, når koden læses højt. */
    const tekst = (await note.innerText()).trim();
    expect(tekst, `referencen ser forkert ud: ${tekst}`)
      .toMatch(/^Reference: FO260807-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);
  });

  /* ⚠️ KVITTERINGEN MÅ IKKE LYDE SOM EN BEKRÆFTELSE.

     Den gamle side skrev det med rene ord ("der er ikke booket
     noget"). Designets kvittering siger det på sin egen måde —
     "vi vender tilbage med et svar" — og det er dét, der måles:
     der skal stå, at svaret kommer, og der må ikke stå et ord,
     der læses som en booking. Et selskab, gæsten TROR er booket,
     er en familie, der møder op til en lukket café. */
  test('kvitteringen lover ikke, at der er booket noget', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    await udfyld(page, { dato: '2026-12-05', antal: '30' });
    await send(page);

    const panel = page.locator('#forespoerg');
    await expect(panel).toContainText('vender tilbage');

    const tekst = (await panel.innerText()).toLowerCase();
    for (const ord of ['er booket', 'er bekræftet', 'er reserveret',
      'vi ses', 'jeres bord']) {
      expect(tekst, `kvitteringen siger "${ord}" — gæsten tror, det er en aftale`)
        .not.toContain(ord);
    }
  });

  /* Samme regel som ved bestillingen: kurven må gerne huskes,
     mennesket må ikke. Det er en fælles telefon i en familie, og
     den næste, der åbner siden, skal ikke se, hvem der spurgte om
     et selskab i går. */
  test('navn, nummer og mail bliver IKKE husket i browseren', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    await udfyld(page);
    await send(page);
    await expect(page.locator('#forespoerg .note')).toBeVisible();

    await page.goto('/h-selskaber.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#pnavn')).toHaveValue('');
    await expect(page.locator('#ptlf')).toHaveValue('');
    await expect(page.locator('#pmail')).toHaveValue('');

    /* Og hele lageret læses igennem. Det er ikke nok at kigge på
       felterne: gemte noget ANDET nummeret undervejs, ville det
       stadig ligge der. Forespørgslen selv er undtaget — den ER
       databasen i øvetilstand. */
    const rester = await page.evaluate((nøgle) => {
      const ud = {};
      for (let i = 0; i < localStorage.length; i++) {
        const n = localStorage.key(i);
        if (n !== nøgle) ud[n] = localStorage.getItem(n);
      }
      return JSON.stringify(ud);
    }, NØGLE);
    expect(rester, 'telefonnummeret ligger i browseren').not.toContain(TLF);
    expect(rester, 'navnet ligger i browseren').not.toContain(NAVN);
    expect(rester, 'e-mailen ligger i browseren').not.toContain(MAIL);
  });

  /* Den, der er i tvivl om, hvorvidt den gik igennem, trykker
     igen. To ens forespørgsler er to sager, personalet skal ringe
     om — og den anden gæst hører, at "det har vi allerede fået". */
  test('det samme spørgsmål to gange bliver afvist', async ({ page }) => {
    await lokalTilstand(page);
    /* Prøven bygger sin egen vej i stedet for åbnSkal(), fordi
       den skal have sætDataEngang: dataene må kun lægges ind
       FØRSTE gang — ellers tørres den første forespørgsel væk,
       inden den anden når frem, og så kan dobbeltspærren aldrig
       måles. Skrifterne afvises af lokalTilstand() for alle
       prøver siden 30/8; det stod kun i åbnSkal() før, og den her
       prøve faldt på 32 sekunders ventetid i den fulde runde. */
    await sætUr(page, FREDAG);
    await sætDataEngang(page, data());
    await page.goto('/h-selskaber.html', { waitUntil: 'domcontentloaded' });

    await udfyld(page, { dato: '2026-12-05' });
    await send(page);
    await expect(page.locator('#forespoerg .note')).toBeVisible();

    await page.goto('/h-selskaber.html', { waitUntil: 'domcontentloaded' });
    await udfyld(page, { dato: '2026-12-05' });
    await send(page);

    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('samme forespørgsel');
    expect((await gemteData(page)).forespoergsler,
      'den samme forespørgsel kom ind to gange').toHaveLength(1);
  });

  /* ⚠️ DATABASEN HOLDER 1-500 (forespoergsel_antal_ok), OG SIDEN
     SKAL SIGE DET FØRST. Den gamle side havde tjekket; det fulgte
     ikke med, da siderne blev designets, så en gæst, der skrev
     9999, fik databasens egen afvisning — en sætning, hun
     hverken forstår eller kan gøre noget ved.

     ⚠️ TALLET STÅR TO STEDER MED VILJE, og prøven kan ikke se
     forskel på dem: formularen siger det pænt med det samme, og
     skrivelaget siger nej under den — sidstnævnte fordi
     øvetilstanden skal fejle som skyen. Fjernes KUN det ene,
     består prøven stadig; fjernes begge, falder den. Det er set. */
  test('et umuligt antal personer bliver afvist', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    await udfyld(page, { antal: '9999' });
    await send(page);

    await expect(page.locator('#forespoerg [data-fejllinje]')).toContainText('mellem 1 og 500');
    expect((await gemteData(page)).forespoergsler || []).toHaveLength(0);
  });

  /* Hele fase 2 står og falder med den her. En forespørgsel uden
     dato er ikke en halv forespørgsel — det er den, hvor gæsten
     stadig kan overtales. "Vi skal holde sølvbryllup engang til
     foråret, hvad koster det?" er den mest værdifulde af dem. */
  test('man kan sende helt uden dato og antal', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    /* ⚠️ ANTALLET TØMMES MED VILJE. Designets tæller står på et
       tal fra begyndelsen — den er en stepper, ikke et tomt felt
       — så "lad være med at røre det" ville måle designets
       standard og ikke reglen. Det, der måles her, er at et TOMT
       felt bliver til null og ikke til "": personalet skal se
       "antal ikke oplyst" og spørge, ikke læse et tal, gæsten
       aldrig har givet. */
    await udfyld(page, { antal: '', besked: 'Vi ved ikke datoen endnu' });
    await send(page);

    await expect(page.locator('#forespoerg .note')).toBeVisible();
    const f = (await gemteData(page)).forespoergsler;
    expect(f).toHaveLength(1);
    expect(f[0].dato, 'en tom dato skal være null, ikke ""').toBeNull();
    expect(f[0].antal_personer, 'et tomt antal skal være null, ikke ""').toBeNull();
  });
});
