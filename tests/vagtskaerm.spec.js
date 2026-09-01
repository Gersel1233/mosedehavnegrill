/* OVERBLIKKET ER EN VAGTSKÆRM.

   Kundens ord (23/8): "overblikket er heller ikke så godt — det
   er dér, de bør stå, når de er på arbejde og modtager
   bestillinger."

   Fanen var sorteret efter hvornår bestillingen KOM IND. Det var
   rigtigt, dengang hver bestilling ventede på et opkald — men
   bestilt er bestilt siden 23/8, og så var rækkefølgen tilbage
   uden en grund.

   MÅLT PÅ EN TRAVL DAG, og det er den måling, prøverne herunder
   gentager: klokken 13.00 stod Sara, der henter kl. 18.00, som
   nummer to — fordi hun havde bestilt ni minutter før.

   Fanerne måles her også. På en iPhone 13 fyldte de 344 px
   øverst og sluttede 599 px nede på en 844 px skærm: 71 % af
   skærmen var navigation, før personalet så en bestilling.
*/

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, aabnMere } = require('./hjaelp');

/* Uret i åbnAdmin står på fredag 7. august 2026 kl. 13.00 dansk
   tid. Tiderne herunder er valgt op omkring det: to før klokken,
   tre efter, og én langt ude i fremtiden. */
function travlDag() {
  const nu = new Date('2026-08-07T11:00:00Z');
  const lavet = (min) => new Date(nu.getTime() - min * 60000).toISOString();
  const b = (id, tid, navn, tlf, vare, antal, status, bestiltForMin) => ({
    id, lokation_id: 'mosede', reference: 'SM-P-' + id, navn, telefon: tlf,
    email: null, hent_dato: '2026-08-07', hent_tid: tid,
    linjer: [{ navn: vare, antal, pris: 45 }], fyld: [], antal,
    besked: null, status, hvordan: 'afhentning', leverings_adresse: null,
    intern_note: null, slettet: null, oprettet: lavet(bestiltForMin),
  });

  /* RÆKKEFØLGEN I DEN HER LISTE ER OMVENDT AF TIDEN — også inde
     i de første tre.

     Første udgave lå tilfældigvis rigtigt: Anna, Jonas, Mette
     stod i arrayet i samme orden som klokkeslættet, så prøven
     bestod, selv når sorteringen blev pillet ud. Den målte
     ingenting. Nu står Mette (14.00) først og Anna (13.15)
     sidst, så kun en rigtig sortering kan give 13.15, 13.30,
     14.00. */
  const d = grunddata();
  d.bestillinger = [
    b(5, '18:00', 'Sara Dam', '20304054', 'Smørrebrød', 12, 'ny', 9),
    b(3, '14:00', 'Mette Holm', '20304052', 'Burger', 3, 'bekraeftet', 48),
    b(4, '17:30', 'Peter Lund', '20304053', 'Fiskefilet', 6, 'bekraeftet', 120),
    b(2, '13:30', 'Jonas Berg', '20304051', 'Stjerneskud', 2, 'ny', 22),
    b(1, '13:15', 'Anna Vind', '20304050', 'Håndmad', 4, 'ny', 6),
  ];
  return d;
}

test.describe('Vagtskærmen', () => {

  test('dagen står i tidsrækkefølge, ikke i bestillingsrækkefølge', async ({ page }) => {
    /* SELVE FEJLEN, målt. Uden sorteringen står Sara (18.00) som
       nummer to, fordi hun bestilte ni minutter før. */
    await åbnAdmin(page, { data: travlDag() });
    /* ⚠️ .vagt-tid-tal OG IKKE .vagt-tid (1/9). Tiden er
       forlæggets to linjer nu — "kl." over "13.15" — så
       .vagt-tid rummer begge dele og læses som "kl.13.15".
       Rækkefølgen er den samme regel; det er kun tallet, der
       skal læses. */
    const tider = page.locator('#overblik-vagt .vagt-tid-tal');
    await expect(tider).toHaveCount(5);
    await expect(tider.nth(0)).toHaveText('13.15');
    await expect(tider.nth(1)).toHaveText('13.30');
    await expect(tider.nth(2)).toHaveText('14.00');
    await expect(tider.nth(3)).toHaveText('17.30');
    await expect(tider.nth(4)).toHaveText('18.00');
  });

  /* De to grupper lå i hvert sit KORT før. Det var to overskrifter,
     to kanter og to gange luft for én liste — og på en iPad betød
     det, at man skulle rulle for at se, om der var noget senere.
     Skellet består; det er en overskrift i den samme liste nu.

     Prøven læser DOKUMENTETS rækkefølge og ikke to beholdere: det
     er dét, øjet følger, og det er det eneste, der stadig kan
     måles, når kanterne er væk. */
  test('det der ligger langt ude står under Senere i dag', async ({ page }) => {
    await åbnAdmin(page, { data: travlDag() });

    const raekke = await page.evaluate(() => Array.from(
      document.getElementById('overblik-vagt').children).map((el) => (
      el.classList.contains('forloeb-hoved')
        ? 'GRUPPE: ' + el.textContent
        : el.querySelector('.vagt-tid-tal').textContent)));

    expect(raekke[0]).toContain('GRUPPE: Nu og de næste to timer');
    expect(raekke.slice(1, 4)).toEqual(['13.15', '13.30', '14.00']);
    expect(raekke[4]).toBe('GRUPPE: Senere i dag');
    expect(raekke.slice(5)).toEqual(['17.30', '18.00']);
  });

  test('en overskredet afhentning bliver stående øverst og bliver markeret',
    async ({ page }) => {
    /* En gæst, der skulle have hentet kl. 12.30 og ikke har, er
       ikke mindre vigtig kl. 13.00 — hun er mere. Nedtones eller
       skjules den, opdager ingen at maden står og bliver kold. */
    const d = travlDag();
    d.bestillinger[4].hent_tid = '12:30';   // Anna, sidst i listen
    await åbnAdmin(page, { data: d });

    const foerste = page.locator('#overblik-vagt .vagt-raekke').first();
    await expect(foerste).toHaveClass(/overskredet/);
    await expect(foerste).toContainText('Anna Vind');
    await expect(foerste).toContainText('Overskredet');
  });

  test('det færdige er ikke arbejde længere', async ({ page }) => {
    /* Uden det her vokser listen hen over dagen, mens det, der
       skal laves, bliver skubbet ned. */
    const d = travlDag();
    d.bestillinger[4].status = 'afhentet';   // Anna 13.15
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#overblik-vagt')).not.toContainText('Anna Vind');
    await expect(page.locator('#overblik-vagt')).toContainText('Jonas Berg');
  });

  /* ⚠️ MEN DET FÆRDIGE ER IKKE VÆK. Det faldt HELT ud af skærmen
     før, og det var forkert: trykker nogen "Afhentet" på det
     forkerte kort midt i en frokost, var bestillingen væk — og
     gæsten stod ved lugen uden noget at hente. */
  test('det færdige kan findes igen og gøres om', async ({ page }) => {
    const d = travlDag();
    d.bestillinger[4].status = 'afhentet';   // Anna 13.15
    await åbnAdmin(page, { data: d });

    const kort = page.locator('#faerdige-kort');
    await expect(kort).not.toHaveClass(/skjult/);
    await expect(page.locator('#faerdige-titel')).toHaveText('✓ Færdige (1)');
    await expect(page.locator('#overblik-faerdige')).toContainText('Anna Vind');

    // Foldet sammen fra start: det er ikke arbejde, det er en
    // fortrydeknap.
    expect(await kort.evaluate((el) => el.open)).toBe(false);

    await kort.locator('summary').click();
    /* ⚠️ KNAPPEN ER HUSETS .knap NU, IKKE .nyt-aabn (1/9). Den
       færdige række fik samme form som den åbne, og dermed samme
       knapper. Prøven peger på ORDET og ikke på klassen — det er
       ordet, personalet leder efter. */
    await page.locator('#overblik-faerdige button', { hasText: 'Gendan' }).click();

    await expect(page.locator('#overblik-vagt')).toContainText('Anna Vind');
    await expect(page.locator('#faerdige-titel')).toHaveText('✓ Færdige (0)');
  });

  /* ⚠️ GENDAN FØRER TIL "BEKRÆFTET" OG IKKE TIL "NY". Rækken HAR
     været set af personalet — det var derfor, nogen trykkede. Sat
     til ny ville den tælle med i "ikke set på endnu" og sende
     køkkenet ud at lede efter noget, de allerede kender. */
  test('en gendannet bestilling tæller ikke som ny igen', async ({ page }) => {
    const d = travlDag();
    d.bestillinger[4].status = 'afhentet';
    await åbnAdmin(page, { data: d });

    await page.locator('#faerdige-kort summary').click();
    await page.locator('#overblik-faerdige button', { hasText: 'Gendan' }).click();
    await expect(page.locator('#overblik-vagt')).toContainText('Anna Vind');

    const raekke = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Anna Vind' });
    await expect(raekke).not.toContainText('Ny');
  });

  test('en bestilling til en anden dag står for sig, ikke i dagens liste',
    async ({ page }) => {
    /* Den gamle rækkefølge var god til ét: en bestilling til på
       fredag, der lige er kommet ind, forsvinder ikke ud af syne.
       Den egenskab skal beholdes — bare ikke øverst. */
    const d = travlDag();
    d.bestillinger[0].hent_dato = '2026-08-14';   // Sara, en uge frem
    await åbnAdmin(page, { data: d });

    await expect(page.locator('#overblik-vagt')).not.toContainText('Sara Dam');
    await expect(page.locator('#vagt-nyt-kort')).not.toHaveClass(/skjult/);
    await expect(page.locator('#overblik-nyt')).toContainText('Sara Dam');
  });

  test('dagens ting står ikke to steder', async ({ page }) => {
    /* Anna bestilte for seks minutter siden OG henter i dag. Hun
       hører til ét sted. To kort om den samme bestilling er ikke
       to oplysninger — det er én, man skal regne ud er den samme. */
    await åbnAdmin(page, { data: travlDag() });
    await expect(page.locator('#overblik-nyt')).not.toContainText('Anna Vind');
    await expect(page.locator('#vagt-nyt-kort')).toHaveClass(/skjult/);
  });

  test('en tom dag siger det, i stedet for at stå tom', async ({ page }) => {
    const d = grunddata();
    d.bestillinger = [];
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#overblik-vagt'))
      .toContainText('Ingen bestillinger eller aftaler endnu i dag');
  });
});

/* ============================================================
   LUGEN OG BORDENE ER TO STRØMME
   ------------------------------------------------------------
   Kundens ord (26/8): "det er rodet at både qr bestillinger er
   der og online bestillinger — du skal huske online bestillinger
   er bare bestillinger til lugen dernede, hvor at selve qr
   bestillinger skal i en separat ting."

   Det er ikke smag. De to har forskelligt arbejde bag sig: en
   bestilling fra hjemmesiden skal ramme et KLOKKESLÆT, en fra en
   QR-kode skal laves NU og bæres ud. Blandet i én liste sorteret
   efter tid ligger bordet — hentetid = nu — altid øverst og
   skubber den frokost, der skal være klar kl. 12.30, ned.
   ============================================================ */
test.describe('Bordene står for sig', () => {

  function medBord() {
    const d = travlDag();
    d.borde = [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
      placering: 'ude', aktiv: true, sortering: 10 }];
    d.bestillinger.push({
      id: 90, lokation_id: 'mosede', reference: 'SM-P-90', navn: 'Bord 7',
      telefon: '00000000', email: null,
      hent_dato: '2026-08-07', hent_tid: '13:00',
      linjer: [{ navn: 'Fadøl, lille', antal: 2, pris: 35 }], fyld: [], antal: 2,
      besked: null, status: 'ny', hvordan: 'spis_her', leverings_adresse: null,
      bord_nummer: '7', intern_note: null, slettet: null,
      oprettet: '2026-08-07T10:52:00Z',
    });
    return d;
  }

  test('en QR-bestilling står IKKE i dagens forløb', async ({ page }) => {
    await åbnAdmin(page, { data: medBord() });
    await expect(page.locator('#overblik-vagt')).not.toContainText('Bord 7');
    await expect(page.locator('#overblik-vagt')).not.toContainText('Fadøl');
    // Lugens fem er der stadig — bordet er taget ud, ikke listen
    await expect(page.locator('#overblik-vagt .vagt-tid')).toHaveCount(5);
  });

  test('den står i sin egen boks med en vej til køkken-køen', async ({ page }) => {
    await åbnAdmin(page, { data: medBord() });
    const kort = page.locator('#bord-koe-kort');
    await expect(kort).not.toHaveClass(/skjult/);
    await expect(kort).toContainText('1');
    await expect(kort).toContainText('bord');

    await kort.locator('button', { hasText: 'Åbn køkken-køen' }).click();
    await expect(page.locator('#p-koekken')).not.toHaveClass(/skjult/);
  });

  /* Et afsnit uden noget at vise findes ikke — ellers står der en
     tom overskrift, der ligner en kø, nogen har glemt. */
  test('uden QR-bestillinger findes boksen slet ikke', async ({ page }) => {
    await åbnAdmin(page, { data: travlDag() });
    await expect(page.locator('#bord-koe-kort')).toHaveClass(/skjult/);
  });

  /* ⚠️ ET FÆRDIGT BORD FYLDER IKKE I KØEN. Køen er dét, køkkenet
     stadig skal af sted med. */
  test('et serveret bord er ude af køen igen', async ({ page }) => {
    const d = medBord();
    d.bestillinger[d.bestillinger.length - 1].status = 'serveret';
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#bord-koe-kort')).toHaveClass(/skjult/);
  });

  /* ⚠️ TALLENE SKAL OGSÅ DELE SIG. Ét felt med summen ville
     skjule netop den forskel, hele fanen er bygget om for at
     vise — og et travlt bord ville se ud som en travl luge. */
  test('dagens tal har et felt til hver', async ({ page }) => {
    await åbnAdmin(page, { data: medBord() });
    const felt = (navn) => page.locator('#overblik-tal .tal-felt', { hasText: navn })
      .locator('.tal-tal');
    await expect(felt('Til lugen i dag')).toHaveText('5');
    await expect(felt('Fra bordene i dag')).toHaveText('1');
  });
});

/* ============================================================
   ALARMSTRIBEN PÅ KØREPLANEN  (30/8)
   ------------------------------------------------------------
   MÅLT på en 1280 px skærm med en almindelig dag: dagens forløb
   begynder 750 px nede, og "Fra bordene" står 1500 px nede —
   under HELE køreplanen. Et bord, der havde ventet i to timer,
   stod altså under folden på den skærm, personalet har åben hele
   dagen.

   Striben siger det, der brænder, i toppen af køreplanen. Den
   følger Køkken-køens to regler: den findes KUN, når der er
   noget, og den siger det ÉN gang.
   ============================================================ */
/* ============================================================
   FORLØBET BLINKER IKKE, OG DET NYE LYSER OP  (31/8)
   ------------------------------------------------------------
   Kundens ord: nye ting skal lande *"straks og uden at
   refreshe"*, og skærmen skal *"lysne og være levende"*.

   De to hænger sammen: da takten blev sat ned fra ét minut til
   8-30 sekunder, ville en optegning, der river hele listen ned,
   få skærmen til at blinke hele dagen — og tage det kort væk,
   fingeren var på vej ned mod. Det er den samme fejl,
   Bestillinger-fanen fik rettet 31/8.
   ============================================================ */
test.describe('Forløbet står stille, til noget ændrer sig', () => {

  test('en uændret række bliver STÅENDE ved en ny hentning', async ({ page }) => {
    await åbnAdmin(page, { data: travlDag() });
    const raekke = page.locator('#overblik-vagt [data-raekke]').first();
    await expect(raekke).toBeVisible();

    /* ⚠️ ET MÆRKE UDEFRA. Vi sætter en egenskab på DOM-knuden,
       som ingen kode kender — overlever den en hentning, er det
       den SAMME knude. Et spørgsmål til koden om dens egen
       tegnRaekker ville bestå, også hvis listen blev revet ned. */
    await raekke.evaluate((el) => { el.dataset.mitMaerke = 'ja'; });
    await page.evaluate(() => Admin.friskOp());
    await page.waitForTimeout(300);

    expect(await page.locator('#overblik-vagt [data-raekke]').first()
      .getAttribute('data-mit-maerke'), 'rækken blev revet ned og bygget op igen')
      .toBe('ja');
  });
});

test.describe('Alarmstriben', () => {

  const NU = new Date('2026-08-07T11:00:00Z');

  function bordFor(id, nr, min) {
    return {
      id, lokation_id: 'mosede', reference: 'SM-B-' + id, navn: 'Bord ' + nr,
      telefon: '20304050', email: null,
      hent_dato: '2026-08-07', hent_tid: '13:00',
      linjer: [{ navn: 'Fadøl, lille', antal: 2, pris: 35 }], fyld: [], antal: 2,
      besked: null, status: 'ny', hvordan: 'spis_her', leverings_adresse: null,
      bord_nummer: String(nr), intern_note: null, slettet: null,
      oprettet: new Date(NU.getTime() - min * 60000).toISOString(),
    };
  }

  function medSentBord(minutter, ekstra) {
    const d = grunddata();
    d.bestillinger = [bordFor(1, 7, minutter)];
    if (ekstra) d.bestillinger.push(bordFor(2, 12, minutter - 5));
    return d;
  }

  /* En afhentning, klokken er løbet fra. Uret står 13.00 dansk
     tid, så 12.30 er en halv time for sent. */
  function medOverskredet(antal) {
    const d = grunddata();
    d.bestillinger = [];
    const tider = ['12:30', '12:45', '11:15'];
    for (let i = 0; i < antal; i++) {
      d.bestillinger.push({
        id: i + 1, lokation_id: 'mosede', reference: 'SM-O-' + i,
        navn: 'Gæst ' + (i + 1), telefon: '2030405' + i, email: null,
        hent_dato: '2026-08-07', hent_tid: tider[i],
        linjer: [{ navn: 'Håndmad', antal: 2, pris: 45 }], fyld: [], antal: 2,
        besked: null, status: 'bekraeftet', hvordan: 'afhentning',
        leverings_adresse: null, bord_nummer: null, intern_note: null,
        slettet: null, oprettet: '2026-08-07T08:00:00Z',
      });
    }
    return d;
  }

  /* ⚠️ FØRST AT DEN FINDES, SÅ AT DEN ER SKJULT.

     toBeHidden() og "har klassen skjult" er begge SANDE for et
     element, der slet ikke findes — den fælde kostede en prøve
     på fyldvælgeren 30/8, hvor hele afsnittet var rullet væk, og
     prøven bestod med at måle ingenting. En stribe, der aldrig
     blev bygget, ville bestå på nøjagtig samme måde. */
  test('en rolig dag har ingen stribe — men elementet er der', async ({ page }) => {
    // Bordet har ventet 2 minutter, og alt skal hentes senere.
    await åbnAdmin(page, { data: medSentBord(2) });
    const stribe = page.locator('#plan-alarm');
    await expect(stribe).toHaveCount(1);
    await expect(stribe).toHaveClass(/skjult/);
  });

  test('en overskredet afhentning står i striben', async ({ page }) => {
    await åbnAdmin(page, { data: medOverskredet(1) });
    const stribe = page.locator('#plan-alarm');
    await expect(stribe).not.toHaveClass(/skjult/);
    await expect(stribe).toContainText('Gæst 1 skulle have hentet kl. 12.30');
  });

  /* ⚠️ DEN ÆLDSTE STÅR MED SIT TAL, RESTEN ER ET ANTAL. Tre
     næsten ens linjer er et kort, man holder op med at læse. */
  test('flere overskredne bliver til ét tal og den ældste', async ({ page }) => {
    await åbnAdmin(page, { data: medOverskredet(3) });
    const stribe = page.locator('#plan-alarm');
    await expect(stribe).toContainText('3 bestillinger skulle have været hentet');
    await expect(stribe).toContainText('den ældste kl. 11.15');
  });

  /* ⚠️ GRÆNSEN ER KØKKENETS EGEN, IKKE ET TAL SKREVET AF.

     Sætter ejeren ventetiden til 10, skal striben sige 10. Skrev
     Overblik sit eget kvarter, ville de to skærme sige hver sit
     den dag, ejeren satte tallet ned — og begge ville se rigtige
     ud hver for sig. Prøven læser TALLET i sætningen, ikke bare
     at der står en advarsel. */
  test('grænsen for "for længe" er ejerens tal, ikke vores', async ({ page }) => {
    const d = medSentBord(12);
    d.indstillinger.bord_ventetid_min = 10;
    await åbnAdmin(page, { data: d });
    const stribe = page.locator('#plan-alarm');
    await expect(stribe).not.toHaveClass(/skjult/);
    await expect(stribe).toContainText('Bord 7 har ventet 12 min');
    await expect(stribe).toContainText('regner med 10');
  });

  /* Uden ejerens tal gælder køkkenets kvarter — og så er 12
     minutter IKKE for længe. */
  test('uden ejerens tal gælder køkkenets kvarter', async ({ page }) => {
    await åbnAdmin(page, { data: medSentBord(12) });
    await expect(page.locator('#plan-alarm')).toHaveClass(/skjult/);
  });

  test('to sene borde giver ÉN linje, ikke to', async ({ page }) => {
    const d = medSentBord(40, true);
    d.indstillinger.bord_ventetid_min = 10;
    await åbnAdmin(page, { data: d });
    const stribe = page.locator('#plan-alarm');
    await expect(stribe.locator('.alarm-linje')).toHaveCount(1);
    await expect(stribe).toContainText('Bord 7 har ventet 40 min');
    await expect(stribe).toContainText('1 andet bord');
  });
});

/* ⚠️ HANDLINGEN LIGGER, HVOR ØJET ENDER  (30/8)
   ------------------------------------------------------------
   MÅLT på 1280 px: hver række i forløbet var 166 px høj, fordi
   begge knapper faldt UNDER teksten, hver på sin linje — mens
   højre halvdel af kortet stod tom. Tre bestillinger fyldte en
   halv skærm.

   Prøven sammenligner TO UAFHÆNGIGE elementer: knappens venstre
   kant mod tekstens højre kant. Et spørgsmål til knappen om dens
   egen grid-column ville bestå, også hvis reglen ikke slog
   igennem. */
test.describe('Rækkens knapper', () => {

  test.skip(({ isMobile }) => !!isMobile,
    'på en telefon står knapperne UNDER teksten med vilje');

  test('knapperne står til højre for teksten fra 900 px', async ({ page }) => {
    const d = grunddata();
    d.bestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'SM-H-1',
      navn: 'Sara Holm', telefon: '20304050', email: null,
      hent_dato: '2026-08-07', hent_tid: '13:30',
      linjer: [{ navn: 'Håndmad', antal: 2, pris: 45 }], fyld: [], antal: 2,
      besked: null, status: 'ny', hvordan: 'afhentning', leverings_adresse: null,
      bord_nummer: null, intern_note: null, slettet: null,
      oprettet: '2026-08-07T09:00:00Z',
    }];
    await åbnAdmin(page, { data: d });

    const raekke = page.locator('#overblik-vagt .vagt-raekke').first();
    /* ⚠️ MÅLT MOD VARELINJERNE OG IKKE MOD .vagt-midt (1/9).
       Handlingen ligger INDE i kortet nu — forlæggets form, hvor
       knappen hører til den bestilling, den handler om. Kortets
       egen kasse rummer altså begge dele, og en sammenligning
       med den ville aldrig kunne fejle.

       De to elementer er stadig uafhængige: maden i venstre
       kolonne mod knapkolonnen. Et spørgsmål til knappen om dens
       egen grid-column ville bestå, også hvis reglen ikke slog
       igennem. */
    const tekst = await raekke.locator('.vagt-varer').boundingBox();
    const knapper = await raekke.locator('.vagt-handling').boundingBox();

    expect(knapper.x, 'knapperne ligger stadig under teksten')
      .toBeGreaterThan(tekst.x + tekst.width - 1);
    /* Og rækken skal være LAV. 166 px var den gamle fejl, hvor
       begge knapper faldt under teksten.

       ⚠️ LOFTET ER HÆVET FRA 130 TIL 150 (1/9), og det er ikke
       en opblødning: kortet HAR en kant og luft nu (2+2 px kant
       og 12+14 px luft = 30 px), som den flade række ikke havde.
       MÅLT på 1280 px efter ombygningen: 130 px. Uden
       `grid-row: 1 / span 50` på handlingen bliver den 179 —
       altså fanger loftet stadig præcis den fejl, det er sat
       for. */
    const hele = await raekke.boundingBox();
    expect(hele.height, 'rækken er lige så høj som før').toBeLessThan(150);
  });
});

/* ============================================================
   PRODUKTION I ALT
   ------------------------------------------------------------
   Uden den skal køkkenet selv lægge "2 × pasta" og "3 × pasta"
   og "1 × pasta" sammen i hovedet, midt i en frokost, hver gang
   de vil vide, hvor mange der skal på panden.

   ⚠️ HER ER BORDENE MED, og det modsiger ikke adskillelsen.
   Forløbet handler om HVORNÅR noget skal ud; produktionen om
   HVOR MEGET der skal laves — og der skal alt tælle med, ellers
   laver køkkenet for lidt. Derfor står tallet DELT.
   ============================================================ */
test.describe('Produktion i alt', () => {

  function toGangeDetSamme() {
    const d = grunddata();
    const b = (id, navn, vare, antal, ekstra) => Object.assign({
      id, lokation_id: 'mosede', reference: 'SM-P-' + id, navn,
      telefon: '20304050', email: null,
      hent_dato: '2026-08-07', hent_tid: '13:30',
      linjer: [{ navn: vare, antal, pris: 45 }], fyld: [], antal,
      besked: null, status: 'bekraeftet', hvordan: 'afhentning',
      leverings_adresse: null, intern_note: null, slettet: null,
      oprettet: '2026-08-07T10:00:00Z',
    }, ekstra || {});

    d.borde = [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
      placering: 'ude', aktiv: true, sortering: 10 }];
    d.bestillinger = [
      b(1, 'Anna Vind', 'Fiskefilet', 2),
      b(2, 'Jonas Berg', 'Fiskefilet', 3),
      b(3, 'Mette Holm', 'Burger', 1),
      b(4, 'Bord 7', 'Fiskefilet', 4, { hvordan: 'spis_her', bord_nummer: '7' }),
    ];
    return d;
  }

  test('den samme ret lægges sammen på tværs af bestillingerne', async ({ page }) => {
    await åbnAdmin(page, { data: toGangeDetSamme() });
    const fisk = page.locator('#overblik-produktion .prod-pille', { hasText: 'Fiskefilet' });
    await expect(fisk.locator('.prod-antal')).toHaveText('9');
  });

  test('tallet er delt i ud af huset og spist her', async ({ page }) => {
    await åbnAdmin(page, { data: toGangeDetSamme() });
    const fisk = page.locator('#overblik-produktion .prod-pille', { hasText: 'Fiskefilet' });
    // 2 + 3 ud ad lugen, 4 ved bord 7
    await expect(fisk.locator('.prod-delt')).toHaveText('🥡 5 · 🍽️ 4');
  });

  test('den travleste ret står først', async ({ page }) => {
    await åbnAdmin(page, { data: toGangeDetSamme() });
    const piller = page.locator('#overblik-produktion .prod-pille .prod-navn');
    await expect(piller.nth(0)).toHaveText('Fiskefilet');
    await expect(piller.nth(1)).toHaveText('Burger');
  });

  /* ⚠️ DET AFVISTE BLIVER ALDRIG LAVET. Talte det med, ville
     køkkenet stå med mad, ingen har bestilt. Det AFHENTEDE tæller
     derimod med: det ER lavet, og "i alt" skal blive ved med at
     være dagens tal, også kl. 21. */
  test('afvist tæller ikke med — afhentet gør', async ({ page }) => {
    const d = toGangeDetSamme();
    d.bestillinger[0].status = 'afvist';      // 2 fiskefileter
    d.bestillinger[1].status = 'afhentet';    // 3 fiskefileter
    await åbnAdmin(page, { data: d });
    const fisk = page.locator('#overblik-produktion .prod-pille', { hasText: 'Fiskefilet' });
    await expect(fisk.locator('.prod-antal')).toHaveText('7');
  });

  /* ⚠️ REGLEN ER VENDT OM 30/8 — OG DET ER EN BESLUTNING, IKKE EN
     FEJL, DER ER GEMT VÆK.

     Her stod, at afsnittet skulle forsvinde helt uden
     bestillinger — husets almindelige regel om at "et afsnit uden
     noget at vise findes ikke". Den regel er gæstesidens, og den
     er rigtig dér: en tom sektion på en hjemmeside er spildplads.

     Men Produktion i alt er en DEL af køreplanen — det ene sted,
     personalet tjekker, når de møder ind. Et hul i den liste
     læses ikke som "der er ingen bestillinger endnu"; det læses
     som "den er ikke tegnet færdig", og så begynder nogen at
     genindlæse i stedet for at passe forretningen. De to
     aflæsninger er ikke det samme, og kun den ene er beroligende.

     Kunden bad om spiis' opstilling, hvor tomme afsnit står som
     en stiplet ramme med én sætning. Prøven måler nu dét. */
  test('uden bestillinger står afsnittet med en tom tilstand', async ({ page }) => {
    const d = grunddata();
    d.bestillinger = [];
    await åbnAdmin(page, { data: d });

    const kort = page.locator('#produktion-kort');
    await expect(kort, 'afsnittet skjuler sig igen — så ligner en tom '
      + 'dag en side, der ikke blev tegnet færdig').not.toHaveClass(/skjult/);
    await expect(kort.locator('.tom-plads')).toContainText('Ingen bestillinger');
  });
});

test.describe('Fanerne på en telefon', () => {

  test.skip(({ isMobile }) => !isMobile, 'kun i telefonprofilen');

  test('bjælken ligger i bunden og fylder ikke skærmen', async ({ page }) => {
    /* MÅLINGEN, DER STARTEDE DET HELE (23/8): fanerne fyldte
       344 px og sluttede 599 px nede på en 844 px skærm — 71 % af
       skærmen var navigation, før personalet så en bestilling.

       ⚠️ DEN MÅLER BUNDBJÆLKEN NU (30/8), IKKE STRIBEN.

       Striben var svaret dengang, og den var ikke godt nok:
       fjorten piller ruller sidelæns, og kunden kunne ikke finde
       sine faner ("de forsvinder ned i telefonens bar"). Fanerne
       ligger i et ark bag "Mere", og #bundbar er det, der står i
       bunden. Reglen er den samme — navigationen må ikke æde
       skærmen — så prøven flyttede med i stedet for at blive
       slettet. Loftet er stadig 90 px. */
    await åbnAdmin(page);
    const m = await page.evaluate(() => {
      const f = document.getElementById('bundbar');
      const c = getComputedStyle(f);
      const r = f.getBoundingClientRect();
      return { position: c.position, hoejde: Math.round(r.height),
               bund: Math.round(r.bottom), skaerm: window.innerHeight };
    });
    expect(m.position).toBe('fixed');
    expect(m.hoejde, `bjælken fylder ${m.hoejde} px — den er ombrudt igen`)
      .toBeLessThan(90);
    // Den skal slutte ved skærmens underkant, ikke svæve
    expect(Math.abs(m.bund - m.skaerm)).toBeLessThanOrEqual(2);

    /* ⚠️ OG FANELISTEN MÅ IKKE LIGGE OVEN I DEN. Arket er lukket,
       til nogen trykker Mere — ellers dækker fjorten punkter
       skærmen, i det sekund man lander. */
    await expect(page.locator('#fane-ark')).not.toHaveClass(/aabent/);
  });

  test('striben dækker ikke det sidste kort', async ({ page }) => {
    /* Uden luft i bunden kan man ikke trykke "Afhentet" på dagens
       sidste bestilling — knappen ligger under striben. */
    await åbnAdmin(page, { data: travlDag() });

    /* Den bløde rulning slås fra. Tre udgaver blev prøvet og
       kasseret først, og alle tre målte det samme forkerte:
       scrollTo(body.scrollHeight) landede 74 px før bunden,
       scrollTo(documentElement.scrollHeight) landede 376 px før
       — springet blev afbrudt af scroll-behavior — og
       scrollIntoViewIfNeeded ruller MINDST muligt og ved ikke,
       at der ligger en fast stribe over bunden.

       Alle tre meldte, at kortet lå under striben. Det gjorde
       det også: man var bare ikke rullet ned til det endnu.
       Her måles LAYOUTET, ikke animationen. */
    await page.addStyleTag({ content: '*{scroll-behavior:auto !important}' });
    await page.evaluate(() => window.scrollTo(0,
      document.documentElement.scrollHeight));
    await page.waitForTimeout(300);

    const m = await page.evaluate(() => {
      const f = document.querySelector('.faner').getBoundingClientRect();
      const kort = document.querySelectorAll('#p-overblik .kort');
      const r = kort[kort.length - 1].getBoundingClientRect();
      const d = document.documentElement;
      return {
        daekket: Math.round(Math.max(0, r.bottom - f.top)),
        tilbage: Math.round(d.scrollHeight - window.innerHeight - window.scrollY),
      };
    });
    expect(m.tilbage, 'siden blev ikke rullet helt ned').toBeLessThanOrEqual(2);
    expect(m.daekket,
      `${m.daekket} px af det sidste kort ligger under striben`).toBe(0);
  });

  test('den valgte fane er markeret, også når der skiftes fra et kort',
    async ({ page }) => {
    await åbnAdmin(page, { data: travlDag() });
    /* ⚠️ GENVEJEN LIGGER BAG "···" NU (1/9). Rækken fik
       forlæggets to knapper — den grønne fremad og en dør — og
       "Bestillinger →" flyttede ind bag døren. Prøven går den
       vej, personalet går; et klik direkte på den skjulte knap
       ville måle et element, en finger ikke kan ramme. */
    const kort = page.locator('#overblik-vagt .vagt-raekke').first();
    await aabnMere(kort);
    await kort.locator('.bestil-mere .knap').first().click();
    const valgt = page.locator('.faner button[aria-selected="true"]');
    await expect(valgt).toHaveCount(1);
    await expect(valgt).toContainText('Bestillinger');
    await expect(page.locator('#p-bestillinger')).not.toHaveClass(/skjult/);
  });
});

/* ============================================================
   NOTEN TIL DAGEN — SKREVET DIREKTE PÅ KØREPLANEN
   ------------------------------------------------------------
   Den stod som en LINJE med en knap til kalenderen før. Kundens
   billeder (26/8) har feltet på selve køreplanen, og det er
   rigtigt: en note til i dag skrives, mens man står med dagen —
   ikke efter et faneskift.

   ⚠️ DEN FARLIGE DEL ER OPRETTELSEN. Rækken kendes kun på sin
   TITEL ("Note til dagen"), og uden en id opretter skrivningen en
   NY række hver gang. Autogem skriver 1,2 sekund efter sidste
   tastetryk, og listen hentes ikke imellem — fem pauser i
   tastningen ville blive til fem noter på dagen, uden en fejl
   nogen steder, og de fire ville ligne arrangementer.
   ============================================================ */
test.describe('Noten til i dag', () => {

  test('feltet står på køreplanen og gemmer, når det forlades', async ({ page }) => {
    await åbnAdmin(page);
    const felt = page.locator('#plan-note-felt');
    await expect(felt).toBeVisible();

    await felt.fill('Henning kommer kl. 18');
    await felt.blur();
    await expect(page.locator('#overblik-koereplan .gemt-maerke')).toHaveText('✓ Gemt');

    const gemt = await gemteData(page);
    const noter = gemt.kalender.filter((k) => k.titel === 'Note til dagen');
    expect(noter).toHaveLength(1);
    expect(noter[0].beskrivelse).toBe('Henning kommer kl. 18');
    expect(noter[0].dato).toBe('2026-08-07');
    // ⚠️ Den må ALDRIG være offentlig: den er personalets.
    expect(noter[0].offentlig).toBe(false);
  });

  /* SELVE FEJLEN, målt. Uden garden bliver hver pause i
     tastningen til en ny række. */
  test('to gem i træk giver ÉN note, ikke to', async ({ page }) => {
    await åbnAdmin(page);
    const felt = page.locator('#plan-note-felt');

    await felt.fill('Første');
    await felt.blur();
    await expect(page.locator('#overblik-koereplan .gemt-maerke')).toHaveText('✓ Gemt');

    await felt.fill('Første og andet');
    await felt.blur();
    await page.waitForTimeout(400);

    const gemt = await gemteData(page);
    const noter = gemt.kalender.filter((k) => k.titel === 'Note til dagen');
    expect(noter, 'der blev oprettet en note pr. gem').toHaveLength(1);
    expect(noter[0].beskrivelse).toBe('Første og andet');
  });

  /* En tom note er ingen note. Blev den gemt som en tom række,
     ville dagen bære et blyantsmærke uden noget bag. */
  test('tømmes feltet, slettes noten', async ({ page }) => {
    await åbnAdmin(page);
    const felt = page.locator('#plan-note-felt');

    await felt.fill('Skal væk igen');
    await felt.blur();
    await expect(page.locator('#overblik-koereplan .gemt-maerke')).toHaveText('✓ Gemt');

    await felt.fill('');
    await felt.blur();
    await page.waitForTimeout(400);

    const gemt = await gemteData(page);
    expect(gemt.kalender.filter((k) => k.titel === 'Note til dagen')).toHaveLength(0);
  });

  /* ⚠️ EN NOTE ER IKKE ET ARRANGEMENT. Rækken kendes på sin
     titel, og skifter den, bliver alle skrevne noter til
     arrangementer på dagen — synlige i kalendernettet som noget,
     der sker. Prøven her holder titlen fast. */
  test('noten er en intern kalenderrække med den faste titel', async ({ page }) => {
    await åbnAdmin(page);
    await page.locator('#plan-note-felt').fill('Personalets egen');
    await page.locator('#plan-note-felt').blur();
    await expect(page.locator('#overblik-koereplan .gemt-maerke')).toHaveText('✓ Gemt');

    const gemt = await gemteData(page);
    const note = gemt.kalender.filter((k) => k.titel === 'Note til dagen')[0];
    expect(note.type).toBe('arrangement');
    expect(note.offentlig).toBe(false);
  });

  /* ⚠️ TAKTEN MÅ IKKE SLUGE EN SÆTNING. Fanen tegnes om, hver
     gang en liste melder sig ind — hvert minut. Skrev nogen midt
     i det, ville optegningen sætte feltets værdi tilbage til
     det gemte, og den halve sætning var væk. */
  test('en optegning tager ikke det skrevne ud af hånden', async ({ page }) => {
    await åbnAdmin(page);
    const felt = page.locator('#plan-note-felt');
    await felt.click();
    await felt.fill('En halv sætning, der ikke er gemt endnu');

    // Hele fanen tegnes om, mens markøren står i feltet
    await page.evaluate(() => Admin.efterHent.forEach((f) => f()));

    await expect(felt).toHaveValue('En halv sætning, der ikke er gemt endnu');
  });
});

/* ============================================================
   FÆRDIG-KNAPPEN PÅ RÆKKEN
   ------------------------------------------------------------
   Kundens ord (26/8): "på overblik skal man trykke færdig på
   online bestillinger?" Man skulle skifte fane for at flytte en
   bestilling videre — og midt i en frokost, med gæsten stående
   ved lugen, er et faneskift ét skridt for meget.

   ⚠️ TRINNET MÅ IKKE SKRIVES AF. Kæden bor i Bestillinger-fanen
   (Admin.naesteTrin). To udgaver af "hvad sker der efter klar?"
   ville langsomt sige noget forskelligt, og så havde den samme
   bestilling to forskellige naeste trin, alt efter hvilken fane
   man stod paa.
   ============================================================ */
test.describe('Færdig fra Overblik', () => {

  test('knappen viser næste trin og flytter bestillingen', async ({ page }) => {
    const d = travlDag();
    d.bestillinger[4].status = 'klar';        // Anna 13.15
    await åbnAdmin(page, { data: d });

    const raekke = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Anna Vind' });
    /* ⚠️ KNAPPEN HEDDER "FÆRDIG" NU (31/8). Kundens ord: "der
       skal stå færdig". Kæden bor i js/admin/bestillinger.js og
       deles med Overblik, så ordet skiftede begge steder på én
       gang — det er hele pointen med at have den ét sted. */
    await raekke.locator('button', { hasText: 'Færdig' }).click();

    // Ude af forløbet og nede i Færdige — uden et faneskift
    await expect(page.locator('#overblik-vagt')).not.toContainText('Anna Vind');
    await expect(page.locator('#faerdige-titel')).toHaveText('✓ Færdige (1)');
    await expect(page.locator('#p-overblik')).not.toHaveClass(/skjult/);

    const gemt = await gemteData(page);
    expect(gemt.bestillinger.find((b) => b.id === 1).status).toBe('afhentet');
  });

  /* ⚠️ REGLEN ER VENDT (31/8) — OG DET ER EN AFTALE MED KUNDEN.

     Her stod: "en NY skal bekræftes, før den kan blive klar.
     Springes der over, mister køkkenet det trin, der siger
     'maden er lavet'."

     Kundens ord: *"man skal bare trykke færdig, ikke det der
     dobbeltknap-noget, når man afstemmer bestillingerne."* Ved
     lugen, med gæsten stående foran sig, er de to mellemtrin
     arbejde uden modydelse. Mellemtrinnet er IKKE fjernet — det
     ligger bag "···" på Bestillinger-fanen for den, der vil
     markere "maden er lavet, den venter".

     Det, prøven vogter nu, er det, der stadig gælder: at de to
     skærme siger det SAMME. Knappen kommer fra Admin.naesteTrin
     ét sted, så Overblik og Bestillinger aldrig kan komme til at
     have hvert sit næste trin. */
  test('Overblik giver det samme ene tryk som Bestillinger-fanen', async ({ page }) => {
    await åbnAdmin(page, { data: travlDag() });

    // Anna er NY, Mette er BEKRÆFTET — begge skal have ét tryk frem.
    for (const navn of ['Anna Vind', 'Mette Holm']) {
      const r = page.locator('#overblik-vagt .vagt-raekke', { hasText: navn });
      await expect(r.locator('button', { hasText: 'Færdig' }),
        navn + ' fik ikke ét tryk frem').toHaveCount(1);
      /* Og mellemtrinnene står IKKE på vagtskærmen: den er til at
         afstemme med, ikke til at føre en sag gennem tre trin. */
      await expect(r.locator('button', { hasText: 'Bekræft' })).toHaveCount(0);
      await expect(r.locator('button', { hasText: 'Sæt som klar' })).toHaveCount(0);
    }
  });

  /* En booking flyttes videre på sin egen fane, hvor pladserne og
     dagens billede står. En færdig-knap her ville lade personalet
     lukke et bord uden at se, hvad det gjorde ved dagen. */
  test('en bordbooking har ingen færdig-knap', async ({ page }) => {
    const d = travlDag();
    d.borde = [{ id: 1, lokation_id: 'mosede', nummer: '7', pladser: 4,
      placering: 'ude', aktiv: true, sortering: 10 }];
    d.bordbestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'BO-1', navn: 'Familien Sø',
      telefon: '20304060', dato: '2026-08-07', tid: '18:00', antal_personer: 6,
      status: 'ny', besked: null, intern_note: null, slettet: null,
      oprettet: '2026-08-07T10:00:00Z',
    }];
    await åbnAdmin(page, { data: d });

    const raekke = page.locator('#overblik-vagt .vagt-raekke', { hasText: 'Familien Sø' });
    await expect(raekke).toHaveCount(1);
    /* ⚠️ MÅLT PÅ ORDET, IKKE PÅ KLASSEN (1/9). Genvejen til
       Borde-fanen er husets .knap nu (den ligger bag "···"), så
       "ingen .knap" ville falde på en knap, der intet gør ved
       bookingen. Reglen er den samme: der er ingen vej til at
       LUKKE en booking herfra. */
    await expect(raekke.locator('button', { hasText: 'Færdig' })).toHaveCount(0);
    await expect(raekke.locator('.vagt-frem')).toHaveCount(0);
    await expect(raekke.locator('button', { hasText: 'Borde' })).toHaveCount(1);
  });
});

/* ============================================================
   RÆKKEN EFTER FORLÆGGET  (1/9)
   ------------------------------------------------------------
   Kundens ord med to skærmbilleder af sin egen vagtskærm:
   *"det her er stadig ik godt nok ... telefon nummer besitlling
   emojis skrift alt er ik som spiis og det skal det være"* og
   *"præcis sådan her på telefonen ... nærmest identisk men med
   anderledes farver."*

   Prøverne herunder måler de fire ting, formen faktisk ændrede —
   ikke at den ligner et billede. Et skærmbillede kan ikke måles;
   en regel kan.
   ============================================================ */
test.describe('Rækkens form', () => {

  /* ⚠️ ÉN VARE PR. LINJE, IKKE ÉN LANG SÆTNING.
     Før stod maden som "1 × Flæskestegssandwich · 1 ×
     Bøfsandwich · 1 × Cheeseburger" — en sætning, der skal LÆSES
     for at tælles. Køkkenet skimmer. */
  test('hver vare står på sin egen linje med antallet fremhævet',
    async ({ page }) => {
    const d = grunddata();
    d.bestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'SM-F-1',
      navn: 'Henrik Hansen', telefon: '26204992', email: null,
      hent_dato: '2026-08-07', hent_tid: '17:30',
      linjer: [
        { navn: 'Flæskestegssandwich', antal: 1, pris: 89 },
        { navn: 'Bøfsandwich', antal: 2, pris: 95 },
      ],
      fyld: [], antal: 3, besked: null, status: 'ny', hvordan: 'afhentning',
      leverings_adresse: null, bord_nummer: null, intern_note: null,
      slettet: null, oprettet: '2026-08-07T08:00:00Z',
    }];
    await åbnAdmin(page, { data: d });

    const punkter = page.locator('#overblik-vagt .vagt-varer li');
    await expect(punkter).toHaveCount(2);
    await expect(punkter.nth(0)).toContainText('Flæskestegssandwich');
    await expect(punkter.nth(1)).toContainText('Bøfsandwich');
    // Antallet er sit eget element — det er dét, øjet lander på.
    await expect(punkter.nth(1).locator('.vagt-antal')).toHaveText('2 ×');
  });

  /* ⚠️ EMBALLAGEN ER IKKE EN VARE. Fire poser i varelisten er
     fire ting, køkkenet tror de skal lave. Den har sin egen
     kasse — samme regel og samme klasse som bestillingskortet
     fik 1/9. */
  test('emballagen står i sin egen kasse og ikke som en varelinje',
    async ({ page }) => {
    const d = grunddata();
    d.indstillinger.emballage_pris = 10;
    d.bestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'SM-F-2',
      navn: 'Henrik Hansen', telefon: '26204992', email: null,
      hent_dato: '2026-08-07', hent_tid: '17:30',
      linjer: [
        { navn: 'Bøfsandwich', antal: 3, pris: 95 },
        { navn: 'Emballage', antal: 3, pris: 10, emballage: true },
      ],
      fyld: [], antal: 3, besked: null, status: 'ny', hvordan: 'afhentning',
      leverings_adresse: null, bord_nummer: null, intern_note: null,
      slettet: null, oprettet: '2026-08-07T08:00:00Z',
    }];
    await åbnAdmin(page, { data: d });

    const raekke = page.locator('#overblik-vagt .vagt-raekke').first();
    await expect(raekke.locator('.vagt-varer li')).toHaveCount(1);
    await expect(raekke.locator('.vagt-varer')).not.toContainText('Emballage');
    await expect(raekke.locator('.bestil-emballage'))
      .toContainText('Emballage: 3 stk.');
  });

  /* ⚠️ TIDEN ER TO LINJER: "kl." over tallet — forlæggets akse,
     der kan skimmes ned ad venstre kant uden at læse kortene.
     Tallet skal stå ALENE i sit element, ellers kan hverken en
     prøve eller et øje skelne 13.15 fra kl.13.15. */
  test('tiden står som "kl." over tallet', async ({ page }) => {
    await åbnAdmin(page, { data: travlDag() });
    const tid = page.locator('#overblik-vagt .vagt-tid').first();
    await expect(tid.locator('.vagt-tid-kl')).toHaveText('kl.');
    await expect(tid.locator('.vagt-tid-tal')).toHaveText('13.15');
  });

  /* ⚠️ OG DEN FÆRDIGE RÆKKE BRUGER DEN SAMME AKSE. Den skrev
     sin egen (ren tekst, uden "kl."), og MÅLT på et skud stod
     "12.00" under et "kl. 17.30" i den samme liste — to udgaver
     af det samme, og den ene så ud som en eftertanke. */
  test('den færdige række har den samme tidsakse', async ({ page }) => {
    const d = travlDag();
    d.bestillinger[4].status = 'afhentet';   // Anna 13.15
    await åbnAdmin(page, { data: d });
    await page.locator('#faerdige-kort summary').click();
    const tid = page.locator('#overblik-faerdige .vagt-tid').first();
    await expect(tid.locator('.vagt-tid-kl')).toHaveText('kl.');
    await expect(tid.locator('.vagt-tid-tal')).toHaveText('13.15');
  });

  /* ⚠️ NAVNET SIGES HØJT VED LUGEN. Gæsten skriver "lone
     hansen" i sin telefon, og personalet råber det ud over en
     kø. Store forbogstaver er ikke pynt — det er dét, der gør
     linjen til et navn og ikke til en tekst. */
  test('gæstens navn får store forbogstaver', async ({ page }) => {
    const d = travlDag();
    d.bestillinger[4].navn = 'lone hansen-bak';
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#overblik-vagt .vagt-raekke').first()
      .locator('.vare-navn')).toHaveText('Lone Hansen-Bak');
  });

  /* Telefonen skal kunne trykkes, ikke læses op af en skærm og
     tastes ind i en anden. Samme regel som bestillingskortet fik
     31/8: en kontaktvej, man ikke kan se, er en, ingen bruger. */
  test('telefonnummeret på rækken er et link', async ({ page }) => {
    await åbnAdmin(page, { data: travlDag() });
    const tlf = page.locator('#overblik-vagt .vagt-raekke').first()
      .locator('.vagt-kontakt a').first();
    await expect(tlf).toHaveAttribute('href', 'tel:20304050');
  });
});

/* ============================================================
   DAGENS RET OG BOOKINGER PÅ OVERBLIK  (1/9)
   ------------------------------------------------------------
   Kundens andet skærmbillede: to ruder under forløbet — "🍲
   Dagens ret i dag" med pris og solgt, og "📅 Bookinger" med en
   rød stribe, når nogen venter på svar.

   ⚠️ BEGGE KORT ER RUDER IND I EN ANDEN FANE. De retter
   ingenting; knappen fører derhen, hvor rettelsen hører hjemme.
   Samme regel som kalenderens dagspanel fik 24/8 — to steder at
   ændre den samme ting er to steder, der kan skride fra
   hinanden.
   ============================================================ */
test.describe('Ruderne under forløbet', () => {

  function medRet() {
    const d = grunddata();
    d.dagens_retter = [{
      id: 1, lokation_id: 'mosede', dato: '2026-08-07',
      navn: 'Paprikagryde med kartoffelmos', beskrivelse: '', pris: 109,
      antal: 30, antal_tilbage: 28, udsolgt: false, sortering: 1,
    }];
    d.bestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'SM-R-1',
      navn: 'Anna Vind', telefon: '20304050', email: null,
      hent_dato: '2026-08-07', hent_tid: '13:15',
      linjer: [{ navn: 'Paprikagryde med kartoffelmos', antal: 2, pris: 109 }],
      fyld: [], antal: 2, besked: null, status: 'ny', hvordan: 'afhentning',
      leverings_adresse: null, bord_nummer: null, intern_note: null,
      slettet: null, oprettet: '2026-08-07T08:00:00Z',
    }];
    return d;
  }

  test('dagens ret står med sin pris og hvor mange der er solgt',
    async ({ page }) => {
    await åbnAdmin(page, { data: medRet() });
    const kort = page.locator('#dagensret-kort');
    await expect(kort).not.toHaveClass(/skjult/);
    await expect(kort.locator('.ob-rude .vare-navn'))
      .toHaveText('Paprikagryde med kartoffelmos');
    await expect(kort.locator('.ob-chip.pris')).toContainText('109');
    /* 28 tilbage + 2 solgt = 30. Loftet regnes ud af de to tal og
       skrives ikke af fra ejerens `antal` — det felt er dagens
       oprindelige tal og følger ikke med, når nogen retter. */
    await expect(kort.locator('.ob-chip.solgt')).toHaveText('2/30 solgt');
  });

  /* ⚠️ INGEN PRIS ER IKKE 0 KR. Husets regel siden 26/8: et tal,
     vi selv har fundet på, er værre end ingen pris. */
  test('en ret uden pris siger "Pris følger" og ikke 0 kr.',
    async ({ page }) => {
    const d = medRet();
    d.dagens_retter[0].pris = null;
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#dagensret-kort .ob-chip.pris'))
      .toHaveText('Pris følger');
  });

  /* Et kort uden noget at vise findes ikke — husets regel fra
     forsiden, nu på personalesiden. */
  test('uden en ret i dag findes kortet ikke', async ({ page }) => {
    const d = grunddata();
    d.indstillinger.dagens_ret = null;
    d.dagens_retter = [];
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#dagensret-kort')).toHaveClass(/skjult/);
  });

  function medBooking(status) {
    const d = grunddata();
    d.bordbestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'BO-R-1', navn: 'Marianne Kjær',
      telefon: '20304060', email: null, dato: '2026-08-07', tid: '18:00',
      antal_personer: 6, besked: null, status, intern_note: null,
      slettet: null, oprettet: '2026-08-07T09:00:00Z',
    }];
    return d;
  }

  /* ⚠️ STRIBEN FINDES KUN, NÅR DER ER NOGET. En fast boks, der
     som regel siger "alt er fint", bliver til udsmykning på en
     uge — og så ses den heller ikke den dag, den siger noget.
     Samme regel som baglokalets ⚠️-kort fik 28/8. */
  test('en booking, der venter, får den røde stribe', async ({ page }) => {
    await åbnAdmin(page, { data: medBooking('ny') });
    const stribe = page.locator('#ob-booking .ob-stribe');
    await expect(stribe).toHaveCount(1);
    await expect(stribe).toContainText('1 venter på svar');
  });

  test('er alle hakket af, står der ingen stribe', async ({ page }) => {
    await åbnAdmin(page, { data: medBooking('bekraeftet') });
    await expect(page.locator('#ob-booking-kort')).not.toHaveClass(/skjult/);
    await expect(page.locator('#ob-booking .ob-stribe')).toHaveCount(0);
    await expect(page.locator('#ob-booking')).toContainText('hakket af');
  });

  test('uden bookinger findes kortet ikke', async ({ page }) => {
    await åbnAdmin(page, { data: grunddata() });
    await expect(page.locator('#ob-booking-kort')).toHaveClass(/skjult/);
  });

  /* Ruden retter ingenting: knappen fører hen til fanen, hvor
     pladserne og dagens billede står. */
  test('striben fører hen til Borde-fanen', async ({ page }) => {
    await åbnAdmin(page, { data: medBooking('ny') });
    await page.locator('#ob-booking .ob-stribe').click();
    await expect(page.locator('.faner button[aria-selected="true"]'))
      .toContainText('Borde');
  });
});
