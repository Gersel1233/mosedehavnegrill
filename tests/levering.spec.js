/* LEVERING AF SMØRREBRØD UD AF HUSET.

   Kundens ord (23/8): bestillingssiden med smørrebrød ud af huset
   "skal være egnet til smørrebrød ud af huset, om det afhentes
   eller skal leveres — det skal ik bare være det samme".

   To ting måles her, og den anden er den vigtige:

   1) At de to sider stiller HVER SIT spørgsmål. Ved lugen er det
      to-go eller spis her. Ud af huset spiser man ikke her, og
      spørgsmålet er hentning eller levering.

   2) At siden ALDRIG lover en levering af sig selv. Der er ingen
      bekræftet leveringszone og ingen pris — se listen "Ejeren
      skal bekræfte" i README. Databasens halvdel af den regel er
      prøvet i supabase/proev-levering.sql (8 af 8).
*/

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

/* Grunddata med smørrebrød at bestille. bestil/ viser kun
   udvalget 'kun-smoer', så uden stykker er formularen tom, og
   prøverne ville måle på en skjult plads. */
function medSmoerrebroed(ændringer = {}) {
  const d = grunddata();
  d.menu_kategorier = [
    { id: 1, afdeling: 'mad', navn: 'Smørrebrød', sortering: 6, aktiv: true },
    { id: 12, afdeling: 'mad', navn: 'Vælg fyld til smørrebrødet', sortering: 7, aktiv: true },
  ];
  d.menu_varer = [
    { id: 1, kategori_id: 1, navn: 'Håndmad', beskrivelse: null, pris: 45,
      fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true },
    { id: 2, kategori_id: 12, navn: 'Leverpostej med baconsvøb', beskrivelse: null,
      pris: null, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true },
  ];
  d.indstillinger = { ...d.indstillinger, bestilling_varsel_timer: 0, ...ændringer };
  return d;
}

/* Læg ét stykke i kurven.

   Folden åbnes KUN hvis den er lukket. Første udgave klikkede
   fold-hovedet blindt — og med ét stykke i listen står folden
   åben af sig selv, så klikket LUKKEDE den. Send-knappen blev
   ved med at være slået fra, og fire prøver meldte timeout på
   en knap, der opførte sig helt rigtigt.

   Plus-knappen vælges på sin etiket og ikke på teksten "+":
   fold-hovedet siger "+ tilføj", og .first() ramte det i stedet
   for tælleren. */
async function laegIKurv(page) {
  const lukket = page.locator('#bestil-stykker .fold-hoved[aria-expanded="false"]');
  if (await lukket.count()) await lukket.first().click();
  await page.locator('#bestil-stykker button[aria-label^="Én mere"]').first().click();
}

test.describe('Smørrebrød ud af huset: hentes eller leveres', () => {

  test('siden spørger ikke om levering, før ejeren har sagt ja', async ({ page }) => {
    /* STANDARDEN ER FRA, og det er hele pointen. Vi ved ikke, om
       forretningen leverer. En side, der tilbyder det, fordi
       ingen har sagt nej, lover noget på deres vegne. */
    await åbn(page, '/bestil/', { data: medSmoerrebroed() });
    await expect(page.locator('#bestil-hvordan-trin')).toHaveClass(/skjult/);
    await expect(page.locator('#bestil-adresse-trin')).toHaveClass(/skjult/);
  });

  test('slået til spørger den om hentning eller levering — ikke om spis her', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medSmoerrebroed({ levering: true }) });
    const valg = page.locator('#bestil-hvordan');
    await expect(valg).toBeVisible();
    await expect(valg).toContainText('Vi henter selv');
    await expect(valg).toContainText('I leverer');
    /* Lugens spørgsmål må ikke stå her: smørrebrød ud af huset
       spiser man pr. definition ikke her. */
    await expect(valg).not.toContainText('Spis her');
    await expect(valg).not.toContainText('To-go');
  });

  test('forsiden spørger stadig om to-go eller spis her', async ({ page }) => {
    test.skip(true, 'forsiden er skiftet ud (23/8) — genoprettes mod den nye forside i systemfasen, se tests-gamle/README.md');
    /* Den anden halvdel af det samme: ét modul, to spørgsmål.
       Rettede man det ene sted uden det andet, ville lugen
       pludselig spørge, om maden skal leveres. */
    const d = grunddata();
    d.indstillinger = { ...d.indstillinger,
      bestilbare_kategorier: [9], bestilling_varsel_timer: 0, levering: true };
    await åbn(page, '/index.html', { data: d });
    const valg = page.locator('#bestil-hvordan');
    await expect(valg).toContainText('To-go');
    await expect(valg).toContainText('Spis her');
    await expect(valg).not.toContainText('I leverer');
  });

  test('adressefeltet kommer først frem, når der skal leveres', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medSmoerrebroed({ levering: true }) });
    const adresse = page.locator('#bestil-adresse-trin');
    await expect(adresse).toHaveClass(/skjult/);

    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await expect(adresse).not.toHaveClass(/skjult/);

    /* Og VÆK igen. Et adressefelt, der bliver stående på en
       bestilling, der skal hentes, er præcis den fejl, databasens
       regel også fanger — men gæsten skal ikke se feltet
       overhovedet. */
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'Vi henter selv' }).click();
    await expect(adresse).toHaveClass(/skjult/);
  });

  test('en levering uden adresse kommer ikke forbi formularen', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medSmoerrebroed({ levering: true }) });
    await laegIKurv(page);
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await page.locator('#bestil-navn').fill('Test Testesen');
    await page.locator('#bestil-telefon').fill('20304050');
    await page.locator('#bestil-send').click();

    await expect(page.locator('#fejl-adresse')).not.toHaveClass(/skjult/);
    // Det sidste kig må IKKE være nået frem
    await expect(page.locator('#bestil-kig')).toHaveClass(/skjult/);
  });

  /* ============================================================
     KØRER VI DERUD?  (16/9)
     ------------------------------------------------------------
     Ejerens ord: de leverer i en radius — Greve, Karlslunde, Tune,
     Køge og det ind imellem — *"så adresse skal der være, og den
     skal kende til, om det ligger inden for."*

     MÅLT: reglen fandtes (R.leveringSvar), listen fandtes i
     produktionen (2635, 2670, 2680, 2690, 4030, 4600, 4623), og
     smørrebrødssiden spurgte den. bestil/ gjorde ALDRIG — der stod
     kun en fast sætning: "Vi ringer og bekræfter, at vi kan køre
     til adressen." En gæst uden for området udfyldte hele
     formularen og fik først nej i et opkald bagefter.

     ⚠️ TRE UDFALD, IKKE TO. Et postnummer udenfor er et SPØRGSMÅL,
     ikke et blankt nej — ejeren kører "længere ude efter aftale".
     Men afsendelsen spærres, fordi en levering, forretningen ikke
     kan køre, ender i køkkenets liste med en tid, ingen kan holde.
     Det er ejerens egen beslutning fra 4/9 (Frederiksberg-sagen),
     og bestil/ skal sige NØJAGTIG det samme som smørrebrødssiden.
     ============================================================ */
  test('zonen: et postnummer i området siger ja', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medSmoerrebroed({ levering: true }) });
    await laegIKurv(page);
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await page.locator('#bestil-adresse').fill('Havnevej 20I, 2670 Greve');
    /* ⚠️ MÅL KLASSEN OG HAKKET, IKKE "kører derud" (rettet 16/9).
       Første udgave spurgte kun toContainText('kører derud') — og
       den streng står i TO af de tre svar:
         "✓ Vi kører derud."
         "Skriv postnummeret med, så kan vi sige med det samme, om
          vi kører derud."
       MÅLT: med svaret tvunget til 'ukendt' bestod prøven
       alligevel. Den kunne ikke skelne et ja fra et "skriv
       postnummeret" — samme klasse som et "ikke lig X", der
       opfyldes af noget andet end det, prøven handler om. */
    const linje = page.locator('#lev-svar');
    await expect(linje).toHaveClass(/lev-ja/);
    await expect(linje).not.toHaveClass(/lev-spoerg/);
    await expect(linje).toContainText('✓ Vi kører derud.');
  });

  test('zonen: et postnummer udenfor siger det — og kan ikke sendes', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medSmoerrebroed({ levering: true }) });
    await laegIKurv(page);
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await page.locator('#bestil-adresse').fill('Storegade 1, 8000 Aarhus');
    await expect(page.locator('#lev-svar')).toContainText('kører ikke fast');

    await page.locator('#bestil-navn').fill('Test Testesen');
    await page.locator('#bestil-telefon').fill('20304050');
    await page.locator('#bestil-send').click();
    /* Kigget er beviset på, at afsendelsen nåede frem — står det
       skjult, kom bestillingen aldrig af sted. */
    await expect(page.locator('#bestil-kig')).toHaveClass(/skjult/);
  });

  /* ⚠️ OMRÅDET ER EJERENS FELT, IKKE ET TAL I KODEN. Retter han
     leverings_postnr i admin, skal siden svare efter DET — ét af
     tallene i prøven skal komme udefra, ellers måler den sig selv. */
  test('zonen: området kommer fra ejerens egen liste', async ({ page }) => {
    const d = medSmoerrebroed({ levering: true });
    d.indstillinger.leverings_postnr = [8000];
    await åbn(page, '/bestil/', { data: d });
    await laegIKurv(page);
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await page.locator('#bestil-adresse').fill('Storegade 1, 8000 Aarhus');
    /* Samme skelnen som ovenfor: klassen er entydig, delstrengen
       "kører derud" er det ikke. Og tallet kommer udefra — ejerens
       liste er sat til 8000, som ikke står i husets standard. */
    const linje = page.locator('#lev-svar');
    await expect(linje).toHaveClass(/lev-ja/);
    await expect(linje).toContainText('✓ Vi kører derud.');
  });

  /* ⚠️ TO BESKEDER, DER SIGER HVER SIT (set på et skud 16/9).

     Noten under feltet siger "Vi ringer og bekræfter, at vi kan
     køre til adressen". Da zonesvaret kom til, stod de to
     samtidig — og modsagde hinanden:

       noten:   "Vi ringer og bekræfter …"
       svaret:  "Vi kører ikke fast derud. RING TIL OS …"

     Den ene lover, at VI ringer; den anden beder gæsten ringe. Og
     ved et ja er noten overflødig: siden har lige sagt, at vi
     kører derud.

     Reglen: har zonen svaret, er noten væk. Er der endnu intet
     postnummer, er "vi ringer og bekræfter" stadig det ærlige —
     og det er netop dér, gæsten ikke har fået et svar endnu. */
  test('zonen: noten forsvinder, når svaret er givet', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medSmoerrebroed({ levering: true }) });
    await laegIKurv(page);
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();

    const note = page.locator('#bestil-adresse-note');
    /* Uden et postnummer har zonen intet svar — så står noten. */
    await page.locator('#bestil-adresse').fill('Strandvejen 4, Greve');
    await expect(note).toContainText('Vi ringer og bekræfter');

    /* Svarer zonen ja, er noten overflødig. */
    await page.locator('#bestil-adresse').fill('Havnevej 20I, 2670 Greve');
    await expect(note).toHaveText('');

    /* Og siger zonen "ring til os", må noten ikke samtidig love,
       at VI ringer. */
    await page.locator('#bestil-adresse').fill('Storegade 1, 8000 Aarhus');
    await expect(note).toHaveText('');
    await expect(page.locator('#lev-svar')).toContainText('Ring til os');
  });

  /* ⚠️ MODSTYKKET: en adresse UDEN postnummer må ikke spærre.
     Gæsten kan skrive "Strandvejen 4, Greve", og et nej dér ville
     afvise en adresse, forretningen kører til hver dag. */
  test('zonen: uden et postnummer spærrer ingenting', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medSmoerrebroed({ levering: true }) });
    await laegIKurv(page);
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await page.locator('#bestil-adresse').fill('Strandvejen 4, Greve');
    await page.locator('#bestil-navn').fill('Test Testesen');
    await page.locator('#bestil-telefon').fill('20304050');
    await page.locator('#bestil-send').click();
    await expect(page.locator('#bestil-kig')).not.toHaveClass(/skjult/);
  });

  test('det sidste kig siger Leveres og viser adressen', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medSmoerrebroed({ levering: true }) });
    await laegIKurv(page);
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await page.locator('#bestil-adresse').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#bestil-navn').fill('Test Testesen');
    await page.locator('#bestil-telefon').fill('20304050');
    await page.locator('#bestil-send').click();

    const kig = page.locator('#bestil-kig');
    await expect(kig).not.toHaveClass(/skjult/);
    await expect(kig).toContainText('Leveres');
    await expect(kig).toContainText('Havnevej 20I, 2670 Greve');
    /* "Hentes" må ikke stå på en bestilling, der køres ud — det
       er dét, kigget findes for at fange. */
    await expect(kig.locator('.kvit-navn', { hasText: /^Hentes$/ })).toHaveCount(0);
  });

  test('en levering bekræftes ALDRIG automatisk, heller ikke når kontakten står til',
    async ({ page }) => {
    /* DEN VIGTIGSTE PRØVE I FILEN. auto_bekraeft er slået TIL som
       standard, så en levering ville ellers få "Bestilt. Hentes
       lørdag kl. 12" — et løfte om at køre til en adresse, ingen
       har set på. */
    await åbn(page, '/bestil/', {
      data: medSmoerrebroed({ levering: true, auto_bekraeft: true }),
    });
    await laegIKurv(page);
    await page.locator('#bestil-hvordan .type-knap', { hasText: 'I leverer' }).click();
    await page.locator('#bestil-adresse').fill('Havnevej 20I, 2670 Greve');
    await page.locator('#bestil-navn').fill('Test Testesen');
    await page.locator('#bestil-telefon').fill('20304050');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();

    const tak = page.locator('#bestil-tak');
    await expect(tak).toBeVisible();
    await expect(tak).toContainText('bekræfter, at vi kan køre til adressen');
    await expect(tak).not.toContainText('Bestilt.');
  });

  test('en afhentning bekræftes stadig automatisk', async ({ page }) => {
    /* Modstykket. Uden den kunne reglen ovenfor være skrevet som
       "bekræft aldrig noget automatisk", og så var grundprincippet
       rullet tilbage uden at nogen opdagede det. */
    await åbn(page, '/bestil/', {
      data: medSmoerrebroed({ levering: true, auto_bekraeft: true }),
    });
    await laegIKurv(page);
    await page.locator('#bestil-navn').fill('Test Testesen');
    await page.locator('#bestil-telefon').fill('20304050');
    await page.locator('#bestil-send').click();
    await page.locator('#kig-send').click();

    await expect(page.locator('#bestil-tak')).toContainText('Bestilt.');
  });
});

/* ============================================================
   EJERENS EGNE LEVERINGSTAL  (1/9)
   ------------------------------------------------------------
   Svararket, punkt G: "Leveringspris 79 kr. · Mindstebeløb
   200,- kr. ELLERS AFTALES · Hvad kan leveres? alt · Skal
   levering aktiveres på siden nu? JA", og i margenen "Ishøj —
   Køge" med "længere efter aftale".

   Levering har været slået FRA siden 23/8, netop fordi vi ikke
   vidste hvad, hvortil og hvad det kostede. Nu gør vi.

   ⚠️ MINDSTEBELØBET ER IKKE ET VÆRN, OG DET ER MED VILJE.
   Ejeren skrev "ELLERS AFTALES" — altså er de 200 kr. ikke en
   grænse, der må afvise en bestilling; det er dét, de normalt
   siger ja til, og under det tager de en snak. Et hårdt værn
   ville afvise en ordre, forretningen gerne ville have haft.
   Derfor står beløbet i den tekst, gæsten LÆSER, og ikke i en
   regel, der siger nej.
   ============================================================ */
test.describe('Ejerens leveringstal', () => {

  function medEjerensTal() {
    const d = medSmoerrebroed();
    d.indstillinger = Object.assign({}, d.indstillinger, {
      levering: true,
      leverings_omraade: 'Ishøj, Greve, Karslunde, Tune, Solrød og Køge'
        + ' — længere ude efter aftale',
      leverings_pris: '79 kr. — er ordren under 200 kr.,'
        + ' aftaler vi det over telefonen',
    });
    return d;
  }

  /* ⚠️ REGLEN SPØRGES, DEN SKRIVES IKKE AF. Sætningen bygges ét
     sted (Butik.leveringsTekst), fordi to sider viser den. En
     prøve, der skrev sætningen af i hånden, ville bestå, også
     hvis de to sider begyndte at sige hver sit. */
  test('området og prisen kommer fra ejerens felter', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medEjerensTal() });

    const svar = await page.evaluate(() => {
      const d = window.Butik.data ? window.Butik.data() : null;
      const ind = (d && d.indstillinger) || JSON.parse(
        localStorage.getItem('mosede_data_v1')).indstillinger;
      return window.Butik.leveringsTekst(ind, true);
    });

    expect(svar.omraade, 'området er ikke ejerens').toContain('Ishøj');
    expect(svar.omraade).toContain('Køge');
    expect(svar.hint, 'prisen står ikke i hintet').toContain('79 kr.');
    /* Mindstebeløbet skal STÅ der — gæsten skal kunne se det,
       før hun bestiller for 90 kr. og bliver ringet op. */
    expect(svar.hint, 'mindstebeløbet er ikke synligt').toContain('200 kr.');
    /* ⚠️ OG DER MÅ IKKE STÅ ET TAL, VI HAR FUNDET PÅ. Designets
       "150 kr. inden for 10 km af havnen" var opdigtet. */
    expect(svar.hint).not.toContain('150 kr.');
    expect(svar.hint).not.toContain('10 km');
  });

  /* Tomme felter er stadig "vi ringer og aftaler prisen" — den
     regel må ikke gå tabt, fordi ejeren nu HAR svaret. Han kan
     tømme felterne igen i morgen. */
  test('uden ejerens tal lover siden stadig ingenting', async ({ page }) => {
    const d = medSmoerrebroed();
    d.indstillinger = Object.assign({}, d.indstillinger,
      { levering: true, leverings_omraade: '', leverings_pris: '' });
    await åbn(page, '/bestil/', { data: d });

    const svar = await page.evaluate(
      () => window.Butik.leveringsTekst({}, true));
    expect(svar.hint).toContain('aftaler prisen');
    expect(svar.hint).not.toContain('0 kr.');
  });
});
