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
  sætDataEngang, NØGLE, åbnAdmin, visFane } = require('./hjaelp');

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

    /* ⚠️ TIDSRUMMET ER TO FELTER NU, IKKE FIRE CHIPS  (4/9) —
       kundens beslutning, ikke en forældet prøve. Reglen, den
       vogter, er uændret: spændet OG med/uden mad skal med i
       detaljer, så personalet kan læse det på kortet. */
    await page.locator('#btid-fra').fill('17:00');
    await page.locator('#btid-til').fill('21:00');
    await page.locator('#bdato').fill('2026-10-04');
    await page.locator('#bnavn').fill('Jonas Berg');
    await page.locator('#btlf').fill('28871343');
    await page.locator('#forespoerg button.g.solid.blk').click();

    const f = (await gemteData(page)).forespoergsler[0];
    expect(f.type).toBe('baglokale');
    expect(f.detaljer.tidsrum).toBe('17.00–21.00');
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
  /* ⚠️ PRØVEN MÅLER PÅ FROKOSTEN NU  (4/9). Fejlen blev fundet på
     cateringsiden, men reglen er havnegrillen.js', ikke sidens —
     og cateringsiden har ikke længere et segment: den er blevet
     én knap til mailen (kundens ord). Frokostens
     [data-toggles="#fadrfelt"] er det samme segment med de samme
     to halvdele, og h-baglokale.html har et tredje.

     Det er dét, der skal ske, når en side falder væk: reglen
     flytter til en side, der stadig kører. Bliver prøven bare
     stående mod en side uden et segment, måler den ingenting —
     30/8's ar, hvor seks prøvefiler holdt op med at måle noget. */
  test('segmentet flytter markeringen, ikke kun feltet', async ({ page }) => {
    await åbnSkal(page, '/h-frokost.html', { data: grunddata() });
    const seg = page.locator('[data-toggles="#fadrfelt"]');

    await expect(seg.locator('button.on')).toHaveText(/Levering/);
    await expect(page.locator('#fadrfelt')).toBeVisible();

    await seg.locator('button', { hasText: 'Vi henter selv' }).click();
    await expect(seg.locator('button.on'), 'markeringen fulgte ikke trykket — '
      + 'knappen ser død ud').toHaveText('Vi henter selv');
    await expect(page.locator('#fadrfelt')).toBeHidden();

    // Og tilbage igen: et segment skal kunne fortryde.
    await seg.locator('button', { hasText: 'Levering' }).click();
    await expect(seg.locator('button.on')).toHaveText(/Levering/);
    await expect(page.locator('#fadrfelt')).toBeVisible();
  });

  /* ⚠️ "cateringens adresse følger med ved levering — og ryger
     ved afhentning" ER FJERNET HER  (4/9), fordi cateringsiden
     ikke længere har en formular. Reglen er IKKE væk: den står
     som "leveringsadressen ryger, når firmaet henter selv" i
     Frokostordningen-blokken nedenfor, mod den samme kode
     (detaljer() i js/skal/forespoergsel.js) og det samme segment.

     ⚠️ EN PRØVE, DER PARKERES, SKAL LÆSES IGENNEM FØRST for det,
     ingen anden måler. Den her målte to ting: at adressen følger
     med, og at den IKKE bliver hængende. Frokostens måler begge. */
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

  /* ⚠️ "catering må gerne ligge på en optaget dag" ER FJERNET
     HER  (4/9) — samme grund som ovenfor. Reglen ("ud af huset
     optager ingenting") er vogtet to andre steder: fra
     selskabssiden lige ovenfor, hvor et tryk på "Ud af huset"
     frigiver dagen igen, og af frokosten nedenfor, som kan sendes
     på en dag, havnen er optaget. */
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

  /* ⚠️ VENT PÅ FELTET, IKKE PÅ KLIKKET (31/8).

     Prøven faldt sjældent under en FULD runde med fire arbejdere
     og bestod hver gang alene — den kendte flake, CLAUDE.md
     beskriver. Årsagen er, hvad koden LÆSER: segSvar() aflæser
     adressefeltets SYNLIGHED, ikke .on (se noten fra 30/8 om
     cateringen, der blev sendt som en levering). Går klikket
     igennem, før designets [data-toggles]-lytter har foldet
     feltet væk, ser afsendelsen stadig et synligt felt og sender
     "levering".

     At vente på, at feltet ER væk, svækker ikke prøven: det er
     præcis den tilstand, reglen hviler på, og et menneske ville
     se den, før hun trykkede send. Folder toggle'en aldrig
     feltet væk, fejler ventetiden — og reglen er stadig vogtet. */
  test('leveringsadressen ryger, når firmaet henter selv', async ({ page }) => {
    /* Samme fælde som på catering: [data-toggles] flytter ikke
       .on, og en adresse, der bliver hængende, sender køkkenet ud
       med mad, nogen henter selv. */
    await åbn(page, '/h-frokost.html');
    await udfyld(page);
    await page.locator('#fadr').fill('Havnevej 20I, 2670 Greve');
    await page.locator('[data-toggles="#fadrfelt"] button', { hasText: 'Vi henter selv' }).click();
    await expect(page.locator('#fadrfelt')).toBeHidden();
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

  /* ⚠️ LØFTET FLYTTEDE, DET FORSVANDT IKKE  (4/9). Det stod i
     den lille linje under knappen; nu står det i kortet "Sådan
     går det videre", som kunden bad om — og linjen under knappen
     siger i stedet det, kortet ikke siger (hvor sagen lander).

     Prøven spørger derfor PANELET og ikke ét element: reglen er,
     at siden lover et svar inden for et døgn, ikke hvor på siden
     det står. Ville den hænge på et bestemt element, ville den
     falde næste gang teksten flytter — og så ville nogen rette
     prøven i stedet for at tjekke løftet. */
  test('siden lover et svar inden for et døgn', async ({ page }) => {
    await åbn(page, '/h-selskaber.html');
    await expect(page.locator('#forespoerg')).toContainText('inden for et døgn',
      { ignoreCase: true });
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
   CATERINGSIDEN ER ÉN KNAP TIL MAILEN  (4/9)
   ------------------------------------------------------------
   Kundens ord: *"hele catering fanen skal altså bare være en knap
   til mailen booking men gør det pænt og ordentligt og der kommer
   billeder men det er der bare ikke endnu men hvor man kan læse
   om det og vi elsker det og vores personale er dygtige maden er
   god og vi holder alt og skræddersyr præcis til jeres behov."*

   Siden var en forespørgselsformular fra 23/8 til 4/9.
   Forespørgslen landede i tabellen `forespoergsler`, altså på
   Forespørgsler-fanen, hvor den kunne tælles, få en reference og
   blive lagt i kalenderen. En mail lander i en indbakke. Det er
   kundens beslutning, og prøverne her vogter den — de vogter
   IKKE, at det er den bedste løsning.

   ⚠️ DERFOR ER "SENDER SIDEN NOGET?" DEN VIGTIGSTE PRØVE HER.
   Falder formularen ved et uheld ind igen (en gammel fil, en
   forkert flet), ville halvdelen af cateringsagerne lande ét sted
   og halvdelen et andet — og ingen af dem ville se forkerte ud
   for sig selv. Det er nøjagtig arret fra 30/8, hvor to udgaver
   af hjemmesiden stod i luften.
   ============================================================ */
test.describe('Cateringsiden', () => {

  test('der er ingen formular — siden sender ingenting', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: grunddata() });

    /* Ingen af formularens egne felter. Id'erne er dem, den gamle
       opsætning i SIDER hed cdato efter. */
    for (const id of ['#cdato', '#ckuv', '#cnavn', '#ctlf', '#cmail',
      '#cadr', '#canledning', '#candet', '#cbesked']) {
      await expect(page.locator(id), id + ' står stadig på siden')
        .toHaveCount(0);
    }
    // Og motoren indlæses ikke: en side uden formular skal ikke
    // bære 40 kB regler, den ikke bruger.
    expect(await page.locator('script[src*="forespoergsel.js"]').count()).toBe(0);
  });

  /* ⚠️ OG DEN SKRIVER IKKE I DATABASEN — MÅLT, IKKE LÆST.
     Prøven ovenfor spørger om opmærkningen; den her trykker på
     sidens eneste store knap og ser efter, om der KOM en række.
     En prøve på et fravær af felter ville bestå, også hvis noget
     helt andet på siden skrev. */
  test('et tryk på knappen opretter ingen forespørgsel', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: grunddata() });

    const knap = page.locator('#skriv a.g.solid.blk');
    await expect(knap).toBeVisible();
    /* Knappen er et mailto — et rigtigt klik ville bede browseren
       åbne et mailprogram. Vi læser derfor adressen og efterser
       databasen, i stedet for at navigere væk. */
    await expect(knap).toHaveAttribute('href', /^mailto:/);

    const gemt = await gemteData(page);
    expect(gemt.forespoergsler || []).toHaveLength(0);
    expect(gemt.bestillinger || []).toHaveLength(0);
  });

  /* ⚠️ BREVET ER FORMULARENS SPØRGSMÅL, IKKE ET TOMT VINDUE.
     Uden det ville personalet få "hej, hvad koster catering?" og
     skulle ringe for at spørge om alt det, formularen spurgte om
     på ét skærmbillede — dato, antal, levering, ønsker. Samme
     greb som forsidens selskabsknap fik 4/9. */
  test('knappen bærer emnet og de spørgsmål, personalet skal bruge svar på',
    async ({ page }) => {
      await åbnSkal(page, '/h-catering.html', { data: grunddata() });
      const href = await page.locator('#skriv a.g.solid.blk').getAttribute('href');
      const url = decodeURIComponent(href);

      expect(url).toContain('mailto:booking@mosedehavnecafe.dk');
      expect(url).toContain('subject=Catering fra Mosede Havnecafe');
      for (const linje of ['Anledning:', 'Dato:', 'Antal kuverter:',
        'Levering eller afhentning:', 'Ønsker til maden:', 'Allergier og hensyn:']) {
        expect(url, 'brevet mangler linjen "' + linje + '"').toContain(linje);
      }
    });

  /* ⚠️ EJERENS ADRESSE SLÅR HTML'ENS. js/skal/kontakt.js bytter
     den, hvis han skriver en anden i admin → Kontakt — og emnet
     OG brevet skal med over. Uden de to linjer i kontakt.js
     tørrede kanalen dem af, og en rettet adresse ville give et
     tomt mailvindue uden emne (arret fra 28/8 og 31/8). */
  test('skriver ejeren en anden bookingadresse, følger emne og brev med',
    async ({ page }) => {
      const d = grunddata();
      d.indstillinger.kontakt_email_booking = 'fest@mosedehavnecafe.dk';
      await åbnSkal(page, '/h-catering.html', { data: d });

      const knap = page.locator('#skriv a.g.solid.blk');
      await expect(knap).toHaveAttribute('href', /^mailto:fest@mosedehavnecafe\.dk\?/);
      const url = decodeURIComponent(await knap.getAttribute('href'));
      expect(url).toContain('subject=Catering fra Mosede Havnecafe');
      expect(url).toContain('Antal kuverter:');
    });

  /* ⚠️ ÉN MAILVEJ, IKKE TO. Mailen ER sidens store handling; en
     "Send en mail"-knap til selskab1@ nede i .anden-vej ville
     være to postkasser at vælge imellem for det samme ærinde —
     og gæsten ville vælge forkert halvdelen af gangene.
     Telefonen bliver: den er en ANDEN slags vej, ikke den samme
     en gang til. */
  test('der er én mailadresse på siden — og telefonen som anden vej',
    async ({ page }) => {
      await åbnSkal(page, '/h-catering.html', { data: grunddata() });
      const panel = page.locator('#skriv');
      await expect(panel.locator('a[href^="mailto:"]')).toHaveCount(1);
      await expect(panel.locator('.anden-vej a[href^="tel:"]')).toHaveCount(1);
      await expect(panel.locator('.anden-vej a[href^="mailto:"]')).toHaveCount(0);
    });

  /* ⚠️ DET SÆLGENDE SKAL VÆRE PÅ SIDEN, og det er kundens egen
     bestilling: "hvor man kan læse om det". Prøven læser de fire
     ting, han bad om, af sidens TEKST — ikke af en klasse. */
  test('man kan læse om det: vi elsker det, folkene og at vi holder alt',
    async ({ page }) => {
      await åbnSkal(page, '/h-catering.html', { data: grunddata() });
      const tekst = await page.locator('#sc').innerText();

      expect(tekst).toContain('Vi elsker at lave mad til andre');
      expect(tekst).toMatch(/dygtige/i);
      expect(tekst).toMatch(/maden er god/i);
      expect(tekst).toMatch(/holder det hele/i);
      expect(tekst).toMatch(/skræddersyr/i);
    });

  /* ⚠️ OG DEN MÅ IKKE FINDE PÅ NOGET. Designbundtets opdigtede
     tal (21/8) er stadig forbudt, og en sælgende side er præcis
     dér, de sniger sig ind: stjerner, anmeldelser, antal år,
     antal selskaber, en pris pr. kuvert vi ikke har fået.

     ⚠️ MØNSTRENE ER BREDE MED VILJE — ikke "4,8", men ETHVERT
     tal foran "stjerner". Et fast tal ville holde op med at måle,
     første gang nogen skrev et andet. */
  test('ingen opdigtede tal, stjerner eller priser pr. kuvert',
    async ({ page }) => {
      await åbnSkal(page, '/h-catering.html', { data: grunddata() });
      /* ⚠️ SIDENS INDHOLD, IKKE HUSETS MØBLER. Med hele #sc
         matchede \d+\s*selskaber footerens "+45 28 87 13 43"
         efterfulgt af linket "Selskaber & catering" — altså
         faldt prøven på et telefonnummer og en menuetiket.
         Footeren og skuffemenuen er de samme på tolv sider og
         måles af kontakt-post.spec.js; det, DEN her handler om,
         er den sælgende tekst. */
      const tekst = (await page.locator('.phead').innerText())
        + '\n' + (await page.locator('section').first().innerText());

      const forbudt = [
        [/\d[,.]\d\s*(?:på Google|stjerner)/i, 'en anmeldelsesscore'],
        [/\d+\s*anmeldelser/i, 'et antal anmeldelser'],
        [/(?:i|gennem|siden)\s*\d+\s*år/i, 'et antal år, ingen har bekræftet'],
        [/\d+\s*kr\.?\s*pr\.?\s*(?:kuvert|person|couvert)/i, 'en pris pr. kuvert'],
        [/bedste/i, 'en påstand om at være bedst'],
        [/\d+\s*selskaber/i, 'et antal afholdte selskaber'],
      ];
      for (const [m, hvad] of forbudt) {
        expect(tekst, 'siden lover ' + hvad).not.toMatch(m);
      }
    });

  /* ⚠️ BILLEDERNE ER IKKE KOMMET — OG PLADSEN SKAL SE HEL UD.
     Uden et foto tegner js/skal/billedplads.js en flade i havnens
     farver med pladsens tegn. En <image-slot>, der bliver
     stående, er en STIPLET GRÅ KASSE (målt 29/8), og det ligner
     en side, der er gået i stykker. */
  test('de tre billedpladser bliver til flader, ikke stiplede kasser',
    async ({ page }) => {
      await åbnSkal(page, '/h-catering.html', { data: grunddata() });
      await expect(page.locator('.foto-galleri .foto-felt')).toHaveCount(3);
      await expect(page.locator('.foto-galleri image-slot')).toHaveCount(0);
    });

  /* ⚠️ OG EJEREN SKAL KUNNE LÆGGE DEM OP, NÅR DE KOMMER. Et foto
     i admin → Forside slår igennem på siden. Prøven måler det
     GEMTE billede på skærmen, ikke at nøglen står i en tabel. */
  test('ejerens eget foto slår fladen', async ({ page }) => {
    const d = grunddata();
    const punkt = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    d.indstillinger.foto_catering_1 = punkt;
    await åbnSkal(page, '/h-catering.html', { data: d });

    await expect(page.locator('.foto-galleri img.foto-fyldt')).toHaveCount(1);
    await expect(page.locator('.foto-galleri .foto-felt')).toHaveCount(2);
  });

  /* ⚠️ HVER NØGLE, SIDEN SLÅR OP, SKAL HAVE EN RÆKKE I ADMIN.
     Uden den kan fotoet kun lægges ind ved at rette i koden — og
     så ser ejerens upload ud, som om den ikke virkede. Samme
     prøve som fotopladserne fik 30/8: den tæller ikke rækker, den
     kræver, at nøglen FINDES. */
  test('de tre nøgler har hver sin række i admin', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: grunddata() });
    const noegler = await page.evaluate(() => Object.keys(
      (window.MosedeBilledplads || {}).NOEGLER || {})
      .map((k) => window.MosedeBilledplads.NOEGLER[k]));
    for (const n of ['foto_catering_1', 'foto_catering_2', 'foto_catering_3']) {
      expect(noegler, n + ' slås op af siden').toContain(n);
    }

    const filen = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'js', 'admin', 'forside.js'), 'utf8');
    for (const n of ['foto_catering_1', 'foto_catering_2', 'foto_catering_3']) {
      expect(filen, n + ' mangler en række i admin → Forside').toContain(n);
    }
  });

  /* ⚠️ LEVERINGSLINJEN ER EJERENS EGNE TAL. Faktalinjen lovede
     "Vi leverer og stiller op" uden ét ord om hvor eller hvad det
     koster — og opstillingen har ingen bekræftet. Ejeren har
     svaret på området og prisen, og svaret bor i
     Butik.leveringsTekst, som forsiden og smørrebrødssiden også
     spørger. ⚠️ Prøven sætter et ANDET område end husets
     standard, så et af tallene kommer udefra. */
  test('leveringslinjen skriver ejerens område og pris', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.levering = true;
    d.indstillinger.leverings_omraade = 'Ishøj til Køge';
    d.indstillinger.leverings_pris = '79 kr.';
    await åbnSkal(page, '/h-catering.html', { data: d });

    await expect(page.locator('#lev-fakta')).toContainText('Vi leverer i Ishøj til Køge');
    await expect(page.locator('#lev-fakta')).toContainText('79 kr.');
  });

  /* ⚠️ OG ER LEVERING SLÅET FRA, RYGER HELE LINJEN. Fluebenet er
     forretningens ja til at køre ud; står det fra, ved vi
     hverken hvad, hvortil eller hvad det koster. En faktalinje,
     der bliver stående med "Vi leverer", er et løfte på ejerens
     vegne — samme regel som den nedlagte mailadresse, hvor
     rækken går med linket (31/8). */
  test('er levering slået fra, står der ikke noget om levering', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.levering = false;
    await åbnSkal(page, '/h-catering.html', { data: d });

    await expect(page.locator('#lev-fakta')).toHaveCount(0);
    await expect(page.locator('.facts')).not.toContainText('Vi leverer');
  });

  test('siden siger, hvad der sker efter mailen', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: grunddata() });
    const boks = page.locator('.note.trin-liste');
    await expect(boks).toBeVisible();
    await expect(boks).toContainText('Inden for et døgn');
    await expect(page.locator('#skriv .fine'))
      .toContainText('ikke en bestilling');
  });

  /* ⚠️ PILLEN SKAL PEGE PÅ NOGET, DER FINDES OG ER SYNLIGT.
     Den pegede på #forespoerg, som forsvandt med formularen — og
     et anker uden et mål gør præcis ingenting, uden en fejl og
     uden bevægelse. Det er den fejl, gennemgang.spec.js har
     fældet siden 31/8; her måles den på sidens egen pille. */
  test('den flydende pille fører ned til knappen', async ({ page }) => {
    await åbnSkal(page, '/h-catering.html', { data: grunddata() });
    const pille = page.locator('#bestil-pill');
    await expect(pille).toHaveAttribute('href', '#skriv');
    await expect(page.locator('#skriv')).toBeVisible();
  });
});

test.describe('Baglokalets forespørgsel', () => {

  test('anledning og mad skrives, og der er fire dages varsel', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');
    await expect(page.locator('#banledning')).toBeVisible();
    await expect(page.locator('#bmad')).toBeVisible();
    await expect(page.locator('#bdato')).toHaveAttribute('min', '2026-08-11');
    /* ⚠️ INGEN CHIPS TILBAGE  (4/9). Tidsrummet var det sidste,
       og kunden bad om at styre det selv. Anledning og mad har
       været fritekst siden 29/8. Prøven er vendt MED en note:
       det er kundens beslutning, ikke en forældet prøve. */
    await expect(page.locator('#forespoerg [data-chips]')).toHaveCount(0);
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

    /* ⚠️ KVITTERINGEN ER HUSETS FÆLLES NU  (4/9), så referencen
       står i kodeboksen og ikke i en .note. Reglen er den samme
       — og den ER skærpet: en forespørgsel har intet nummer, så
       referencen er DET STORE på kvitteringen, med "Jeres
       reference" over sig. Kundens eget spørgsmål til den gamle
       udgave var *"hvad er referance?"*; en nøgen kode i en
       fodnote var svaret på hvorfor. */
    const boks = page.locator('#forespoerg .kvit-nr');
    await expect(boks).toBeVisible();
    await expect(boks.locator('.kvit-nr-navn')).toContainText('reference',
      { ignoreCase: true });

    /* FO og ikke SM: personalet har de to lister ved siden af
       hinanden, og en gæst, der læser koden op, skal ikke sende
       nogen på jagt i den forkerte. Ingen I, O, 0 og 1 — de
       forveksles, når koden læses højt. */
    const tekst = (await boks.locator('.kvit-nr-ref').innerText()).trim();
    expect(tekst, `referencen ser forkert ud: ${tekst}`)
      .toMatch(/^FO260807-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);
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
    await expect(page.locator('#forespoerg .kvit-nr-ref')).toBeVisible();

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
    await expect(page.locator('#forespoerg .kvit-nr-ref')).toBeVisible();

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

    await expect(page.locator('#forespoerg .kvit-nr-ref')).toBeVisible();
    const f = (await gemteData(page)).forespoergsler;
    expect(f).toHaveLength(1);
    expect(f[0].dato, 'en tom dato skal være null, ikke ""').toBeNull();
    expect(f[0].antal_personer, 'et tomt antal skal være null, ikke ""').toBeNull();
  });
});

/* ============================================================
   HVAD ER DET HER FOR EN SIDE, OG HVAD SKER DER NU?  (4/9)
   ------------------------------------------------------------
   Kundens ord med et skud af selskabskortet: *"fjern den røde
   knap der og lad de to hvide i bunden være der ... forklar
   processen at der går under 24 timer så får de svar og dermed
   aftale yderlige og sætter et i kalenderen ... men hvad den side
   der er til."*

   ⚠️ SIDERNE LÆSES AF MAPPEN, ikke skrevet af i hånden. En femte
   forespørgselsside skal ikke kunne udgives uden at sige, hvad
   der sker, når gæsten har trykket send — og det er præcis den
   slags, der slipper igennem, fordi ingen tænker på at føje den
   til en liste. Samme greb som favicon-prøven og
   gennemgang.spec.js.
   ============================================================ */
const fs = require('fs');
const path = require('path');

/* En forespørgselsside kendes på sit panel: den har en formular,
   der skriver i tabellen forespoergsler. */
function forespoergselsSider() {
  return sidderMed('js/skal/forespoergsel.js');
}

/* ⚠️ OG SÅ ER DER SIDER, DER AFLEVERER ET ÆRINDE UDEN EN FORMULAR
   (4/9). Cateringsiden er én knap til mailen booking@ — kundens
   beslutning — men LØFTET er det samme: gæsten har sendt noget
   fra sig og skal vide, hvad hun venter på, og hvor længe.

   ⚠️ DE TO LISTER ER IKKE DEN SAMME. Prøverne om formularens ene
   røde knap og om .anden-vejs to hvide gælder kun de sider, der
   HAR en formular; kortet "Sådan går det videre" gælder dem alle.
   Lagde vi cateringsiden i den første løkke, ville den falde på
   en formular, den med vilje ikke har — og så ville nogen "rette"
   prøven ved at lempe den for alle fire. */
function afleveringsSider() {
  const set = new Set(sidderMed('js/skal/forespoergsel.js')
    .concat(sidderMed('js/skal/catering.js')));
  return [...set].sort();
}

function sidderMed(fil) {
  const rod = path.join(__dirname, '..');
  return fs.readdirSync(rod)
    .filter((f) => /^h-.*\.html$/.test(f))
    .filter((f) => fs.readFileSync(path.join(rod, f), 'utf8').includes(fil))
    .map((f) => '/' + f);
}

test.describe('Siden siger, hvad der sker bagefter', () => {

  const sider = forespoergselsSider();
  const alle = afleveringsSider();

  test('der ER sider at måle', () => {
    /* ⚠️ UDEN DEN HER MÅLER LØKKERNE NEDENFOR INGENTING. En tom
       liste består hver eneste regel — arret fra "toBeHidden er
       sandt for et element, der ikke findes" (30/8).

       Tallene er dem, der findes i dag: tre formularsider
       (selskaber, baglokale, frokost) og fire afleveringssider —
       de tre plus cateringen, som blev én mailknap 4/9. */
    expect(sider.length, 'ingen formularsider: ' + sider.join(', '))
      .toBeGreaterThanOrEqual(3);
    expect(alle.length, 'ingen afleveringssider: ' + alle.join(', '))
      .toBeGreaterThanOrEqual(4);
  });

  for (const side of afleveringsSider()) {
    test(`${side} har kortet "Sådan går det videre"`, async ({ page }) => {
      await åbnSkal(page, side, { data: data() });
      const kort = page.locator('.trin-liste');
      await expect(kort, 'kortet mangler helt').toHaveCount(1);
      await expect(kort).toBeVisible();

      /* De tre ting, kunden bad om at få sagt: hvor længe der
         går, at der aftales videre, og at det ender i
         kalenderen. Frokosten aftaler en STARTDATO i stedet for
         en enkelt dag — den er en fast levering, ikke en fest. */
      await expect(kort, 'døgnet står ikke i kortet')
        .toContainText('inden for et døgn', { ignoreCase: true });
      await expect(kort, 'der står ikke, at I aftaler resten')
        .toContainText(/aftal|pris|tilbud/i);
      await expect(kort, 'der står ikke, hvad der sker til sidst')
        .toContainText(/kalender|startdato|låser|jeres/i);
    });

  }

  /* ⚠️ DE TO HERUNDER GÆLDER KUN FORMULARSIDERNE (4/9).
     Cateringsiden er én mailknap: den HAR ikke en formular med en
     rød send-knap, og dens .anden-vej har med vilje kun
     telefonen — to mailadresser for det samme ærinde ville være
     to postkasser at vælge imellem. Reglerne for den side står i
     "Cateringsiden" ovenfor. */
  for (const side of forespoergselsSider()) {
    /* ⚠️ ÉN RØD KNAP, IKKE TO. Rød betyder "det her er
       handlingen" i hele huset. Der stod to røde under hinanden
       på selskabssiden — formularens Send og en mailto, der
       lavede det samme ærinde i gæstens eget mailprogram, altså
       uden om personalets indbakke. */
    test(`${side} har ÉN rød knap i panelet`, async ({ page }) => {
      await åbnSkal(page, side, { data: data() });
      /* ⚠️ FORMULARENS PANEL, IKKE DET FØRSTE PÅ SIDEN. Prøven
         tog .panel.first() og faldt, da baglokalet fik et
         "Det får I"-kort ovenover — altså målte den et panel
         uden knapper og kaldte det nul røde. Send-knappen er
         det, der gør panelet til formularen. */
      const panel = page.locator('.panel').filter({
        has: page.locator('button.g.solid.blk'),
      });
      await expect(panel).toHaveCount(1);
      await expect(panel.locator('.g.solid.blk')).toHaveCount(1);
    });

    /* Og de to hvide bliver — de er second options (30/8), ikke
       noget, der må ryge med, når den røde fjernes. */
    test(`${side} har stadig Ring og Send en mail nederst`, async ({ page }) => {
      await åbnSkal(page, side, { data: data() });
      const vej = page.locator('.anden-vej');
      await expect(vej).toBeVisible();
      await expect(vej.locator('a[href^="tel:"]')).toHaveCount(1);
      await expect(vej.locator('a[href^="mailto:"]')).toHaveCount(1);
    });
  }
});

/* ============================================================
   ADMIN OG GÆSTESIDEN SIGER DET SAMME  (4/9)
   ------------------------------------------------------------
   Kundens ord: *"og også tydeligt fortælle inde i admin hvad det
   er for noget."*

   ⚠️ DET ER IKKE ET SPØRGSMÅL OM ORDLYD, MEN OM ET LØFTE.
   Gæsten har den skrevne udgave foran sig, når hun ringer. Stod
   der noget ANDET i admin, ville personalet love én ting i
   telefonen, mens hjemmesiden havde lovet en anden — og ingen af
   de to skærme ville se forkerte ud for sig selv. Det er husets
   egen regel om, at ét af tallene skal komme UDEFRA: her kommer
   det fra den anden skærm.
   ============================================================ */
test.describe('Admin siger det samme som gæstesiden', () => {

  test('begge steder står døgnet og kalenderen', async ({ page }) => {
    /* Gæstens udgave */
    await åbnSkal(page, '/h-selskaber.html', { data: data() });
    const gæst = (await page.locator('.trin-liste').innerText()).toLowerCase();

    /* Personalets udgave */
    await åbnAdmin(page, { data: data() });
    await visFane(page, 'p-forespoergsler');
    const adm = (await page.locator('#p-forespoergsler .kort').first()
      .innerText()).toLowerCase();

    for (const ord of ['inden for et døgn', 'kalender']) {
      expect(gæst, `gæstesiden mangler "${ord}"`).toContain(ord);
      expect(adm, `admin mangler "${ord}"`).toContain(ord);
    }
    /* Og admin skal sige, at det IKKE er en booking — det er den
       ene sætning, der afgør, hvad personalet siger i røret. */
    expect(adm, 'admin siger ikke, at det ikke er en booking')
      .toContain('ikke en booking');
  });

  /* ⚠️ TRINNENE SKAL VÆRE EN LISTE, IKKE PROSA. MÅLT på et skud
     på 1280 px: som én sætning med 1) 2) 3) inde i teksten var
     det fire linjer, der skal LÆSES. Prøven måler den BEREGNEDE
     stil — en klasse, der ikke slår igennem, er ingen regel, og
     ol.hjaelp-trin har sin egen scopede regel i css/style.css. */
  test('trinnene er en nummereret liste, ikke en sætning', async ({ page }) => {
    await åbnAdmin(page, { data: data() });
    await visFane(page, 'p-forespoergsler');
    const liste = page.locator('#p-forespoergsler ol.hjaelp-trin');
    await expect(liste).toHaveCount(1);
    await expect(liste.locator('li')).toHaveCount(3);

    const stil = await liste.evaluate((e) => getComputedStyle(e).listStyleType);
    expect(stil, 'listen har ingen numre').toBe('decimal');
  });

  /* ⚠️ OG REGLEN MÅ IKKE SIVE UD PÅ GÆSTESIDEN. css/style.css
     bærer stadig bestil/, bord/ og ved-bordet/ — arret fra
     .bestil-kort, der farvede hvert bestillingskort i admin
     mørkeblåt med usynlig tekst. */
  test('reglen er scopet til personalesiden', async ({ page }) => {
    await åbnSkal(page, '/bestil/', { data: data() });
    const virker = await page.evaluate(() => {
      const ol = document.createElement('ol');
      ol.className = 'hjaelp-trin';
      ol.innerHTML = '<li>prøve</li>';
      document.body.appendChild(ol);
      const f = getComputedStyle(ol).fontSize;
      ol.remove();
      return f;
    });
    /* Uden scope ville admins 13,5 px slå igennem her. */
    expect(virker, 'admins regel slog igennem på gæstesiden')
      .not.toBe('13.5px');
  });
});

/* ============================================================
   BAGLOKALET: EGET TIDSRUM OG EN TYDELIG PRIS  (4/9)
   ------------------------------------------------------------
   Kundens ord: *"add noget mere luksus sælgene på siden der og
   gør det tydeligt med pricesen og ændrer tidsrum til selv at
   kunne styrer det istedet for de der intervaller."*

   De to hænger sammen: "en aften" ER op til fire timer, og alt
   derover er dagsprisen. Vælger gæsten selv spændet, skal siden
   svare med prisen MENS hun vælger.
   ============================================================ */
test.describe('Baglokalets tidsrum er gæstens eget', () => {

  const svar = (page) => page.locator('#tid-svar');

  async function saet(page, fra, til) {
    await page.locator('#btid-fra').fill(fra);
    await page.locator('#btid-til').fill(til);
    /* Svarlinjen tegnes på input; vent på, at den HAR skiftet —
       ikke på et fast antal millisekunder. */
    await expect(svar(page)).not.toHaveText('');
  }

  test('de fire faste intervaller er væk', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');
    await expect(page.locator('#forespoerg [data-chips]'),
      'chipsene står der stadig').toHaveCount(0);
    await expect(page.locator('#btid-fra')).toBeVisible();
    await expect(page.locator('#btid-til')).toBeVisible();
  });

  test('svarlinjen siger timerne og aftenprisen', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');
    await page.locator('#bantal').fill('8');
    await saet(page, '17:00', '21:00');
    await expect(svar(page)).toContainText('4 timer');
    await expect(svar(page)).toContainText('aftenpris');
  });

  /* ⚠️ ET OF TALLENE SKAL KOMME UDEFRA. Prisen læses af
     data-vilk-spanene, som visVilkaar() fylder fra ejerens felter
     — ikke af en kopi i koden. Prøven sætter derfor ejerens tal
     til noget ANDET end designets 1.200, så den falder, hvis
     nogen skriver beløbet ind i JavaScript. */
  test('prisen er ejerens tal, ikke designets', async ({ page }) => {
    const d = data();
    d.indstillinger.lokale_pris_aften = 1450;
    d.indstillinger.lokale_pris_dag = 2600;
    await åbn(page, '/h-baglokale.html', d);
    await page.locator('#bantal').fill('8');

    await saet(page, '17:00', '21:00');
    await expect(svar(page)).toContainText('1.450 kr.');

    await saet(page, '10:00', '22:00');
    await expect(svar(page)).toContainText('2.600 kr.');
    await expect(svar(page), 'designets tal slap igennem')
      .not.toContainText('2.000');
  });

  /* ⚠️ GRATIS SLÅR PRISEN, og rækkefølgen er hele pointen: står
     beløbet først og "men gratis" bagefter, læser gæsten
     beløbet. */
  test('nok kuverter mad gør lejen gratis', async ({ page }) => {
    const d = data();
    d.indstillinger.lokale_gratis_fra = 20;
    await åbn(page, '/h-baglokale.html', d);
    await page.locator('#bantal').fill('25');
    await saet(page, '17:00', '21:00');
    await expect(svar(page)).toContainText('gratis');
    await expect(svar(page), 'beløbet står der stadig')
      .not.toContainText('kr.');
  });

  /* ⚠️ MEN KUN MED MAD. "Kun lokalet" kan aldrig komme op på
     kuverter, uanset hvor mange gæster der er. Uden den her
     prøve ville reglen ovenfor bestå på et system, der forærer
     lokalet væk til enhver med 20 gæster. */
  test('uden mad er der ingen gratis leje', async ({ page }) => {
    const d = data();
    d.indstillinger.lokale_gratis_fra = 20;
    await åbn(page, '/h-baglokale.html', d);
    await page.locator('#bantal').fill('25');
    await page.locator('.seg2 button', { hasText: 'Kun lokalet' }).click();
    await saet(page, '17:00', '21:00');
    await expect(svar(page)).toContainText('kr.');
    await expect(svar(page)).not.toContainText('er lokalelejen gratis');
  });

  /* ⚠️ ET SPÆND OVER MIDNAT ER IKKE EN FEJL, DET ER EN FEST.
     22–01 er tre timer, ikke minus nitten — uden regnestykket
     ville en nytårsaften blive afvist af sin egen formular. */
  test('et tidsrum over midnat regnes rigtigt', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');
    await page.locator('#bantal').fill('8');
    await saet(page, '22:00', '01:00');
    await expect(svar(page)).toContainText('3 timer');
  });

  test('et tomt tidsrum kan ikke sendes', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');
    await page.locator('#bdato').fill('2026-10-04');
    await page.locator('#bnavn').fill('Jonas Berg');
    await page.locator('#btlf').fill('28871343');
    await saet(page, '19:00', '19:10');
    await page.locator('#forespoerg button.g.solid.blk').click();

    await expect(page.locator('#forespoerg [data-fejllinje]'))
      .toContainText('halv time');
    expect((await gemteData(page)).forespoergsler || []).toHaveLength(0);
  });
});

/* ============================================================
   PRISKORTET  (4/9)
   ------------------------------------------------------------
   Kundens ord: *"gør det tydeligt med pricesen."*
   ============================================================ */
test.describe('Baglokalets priskort', () => {

  test('de to priser står hver for sig med ejerens tal', async ({ page }) => {
    const d = data();
    d.indstillinger.lokale_pris_aften = 1450;
    d.indstillinger.lokale_pris_dag = 2600;
    await åbn(page, '/h-baglokale.html', d);

    const kort = page.locator('.lokale-pris');
    await expect(kort).toBeVisible();
    await expect(kort).toContainText('1.450');
    await expect(kort).toContainText('2.600');
    await expect(kort).toContainText('gratis');
  });

  /* ⚠️ PRISEN SKAL KUNNE LÆSES. Husets regel siden 23/8: den
     lille skrift falder under 4,5:1 med mærkefarven selv, så
     tallet bruger --red-tekst. Prøven måler den BEREGNEDE farve —
     en klasse, der ikke slår igennem, er ingen regel. */
  test('tallet står i den mørke røde, ikke i mærkefarven', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');
    const farve = await page.locator('.lp-tal').first()
      .evaluate((e) => getComputedStyle(e).color);
    expect(farve, 'prisen bruger --red og ikke --red-tekst')
      .not.toBe('rgb(214, 42, 58)');
  });

  /* ⚠️ OG SIDEN MÅ IKKE LOVE FACILITETER, INGEN HAR BEKRÆFTET.
     Designbundlet leverede baglokalet med projektor og egen
     indgang (21/8), og ingen af delene er bekræftet af ejeren.
     "Det får I"-listen er sælgende, og det er præcis dér,
     fristelsen til at skrive dem ind igen ligger. */
  test('der loves hverken projektor eller egen indgang', async ({ page }) => {
    await åbn(page, '/h-baglokale.html');
    const tekst = (await page.locator('#sc').innerText()).toLowerCase();
    for (const ord of ['projektor', 'egen indgang', 'eget toilet', 'lærred']) {
      expect(tekst, `siden lover "${ord}" — det er ikke bekræftet`)
        .not.toContain(ord);
    }
  });
});
