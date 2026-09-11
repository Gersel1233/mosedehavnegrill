/* KALENDEREN SKAL VÆRE EN KALENDER

   Kundens ord (24/8): "kalenderen skal være en kalender ... alt
   skal kunne administreres ift at have styr på alle ting derinde
   ... køreplanen får præcis den, skrive notater til den dag osv
   som selvfølgelig kommer ind i overblik".

   Fanen var en LISTE over arrangementer og lukkedage, og den
   vidste ikke, at der lå bestillinger, borde, forespørgsler eller
   en udlejning samme dag. Spørgsmålet "hvad sker der den 12.?"
   havde fire svar på fire faner, og det femte — "er lokalet lejet
   ud?" — kunne man kun finde ved at gætte.

   Prøverne her måler netop dét: at de fem kilder mødes på ÉN dag,
   og at noten til dagen når hele vejen ud på Overblik.

   Uret i åbnAdmin står på fredag den 7. august 2026, så nettet
   viser august 2026. */

const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata, gemteData, visFane } = require('./hjaelp');

const DAGEN = '2026-08-12';        // en onsdag i den viste måned

/* Fem kilder, samme dag. Rækkerne er skrevet af efter de rigtige
   kolonnenavne: bordene, forespørgslerne og udlejningerne hedder
   alle antal_personer og IKKE antal — det har kostet en runde før. */
function dagenFuld() {
  return grunddata({
    bestillinger: [{
      id: 1, lokation_id: 'mosede', reference: 'SM260812-AAAAA',
      navn: 'Anna Vind', telefon: '20304050', hent_dato: DAGEN,
      hent_tid: '12:00', linjer: [{ navn: 'Smørrebrød', antal: 2, pris: 55 }],
      fyld: [], antal: 2, status: 'ny', intern_note: null,
      oprettet: '2026-08-07T10:00:00Z',
    }],
    bordbestillinger: [{
      id: 1, lokation_id: 'mosede', reference: 'BO260812-AAAAA',
      navn: 'Ole Berg', telefon: '30405060', dato: DAGEN, tid: '18:00',
      antal_personer: 6, besked: null, status: 'ny', intern_note: null,
      oprettet: '2026-08-07T10:00:00Z',
    }],
    forespoergsler: [{
      id: 1, lokation_id: 'mosede', reference: 'FO260812-AAAAA',
      slags: 'selskab', navn: 'Peter Lund', telefon: '40506070',
      email: 'p@example.com', dato: DAGEN, antal_personer: 20,
      besked: null, status: 'ny', intern_note: null,
      oprettet: '2026-08-07T10:00:00Z',
    }],
    udlejninger: [{
      id: 1, lokation_id: 'mosede', reference: 'BL260812-AAAAA',
      navn: 'Karen Sø', telefon: '50607080', email: null, dato: DAGEN,
      antal_personer: 30, besked: null, status: 'ny', intern_note: null,
      oprettet: '2026-08-07T10:00:00Z',
    }],
    kalender: [{
      id: 1, lokation_id: 'mosede', type: 'arrangement', dato: DAGEN,
      slut_dato: null, titel: 'Livemusik på molen', beskrivelse: null,
      emoji: '🎸', lukker_kl: null, offentlig: true,
      oprettet: '2026-08-01T10:00:00Z',
    }],
  });
}

async function åbnKalenderen(page, data) {
  await åbnAdmin(page, data ? { data } : undefined);
  await visFane(page, 'p-kalender');
  await page.waitForSelector('#maaned-net .maaned-dag');
}

/* ⚠️ SCOPET TIL #maaned-net (27/8). Baglokale-fanen fik sit eget
   månedsnet med de samme klasser, og alt herunder, der talte
   .maaned-dag eller .maaned-tom, talte pludselig to net. 31
   prøver faldt på "strict mode violation" og forkerte antal.

   Klasserne ER fælles med vilje — det er den samme visuelle form
   — så det er vælgeren, der skal sige HVILKEN kalender. */
const NET = '#maaned-net';
const dag = (page, iso) => page.locator(`${NET} .maaned-dag[data-dag="${iso}"]`);

/* ⚠️ DAGEN ER ET LAG SIDEN 28/8, og laget dækker nettet og
   søjlen. Skal en prøve bruge siden bagved — en anden dag, en
   anden fane — skal den lukke dagen først, præcis som et
   menneske skal trykke ✕. */
async function lukDagen(page) {
  const lag = page.locator('#dag-lag');
  if (await lag.isVisible()) {
    await page.keyboard.press('Escape');
    await lag.waitFor({ state: 'hidden' });
  }
}

test.describe('Måneden er et net, ikke en liste', () => {

  test('nettet viser den måned, vi står i, og kan skiftes', async ({ page }) => {
    await åbnKalenderen(page);
    await expect(page.locator('#maaned-navn')).toHaveText('August 2026');

    /* ⚠️ VENDT 3/9 MED VILJE — det er kundens forlæg, ikke en
       forældet prøve. Nettet HAR nabomånedens dage nu, dæmpet:
       en uge slutter ikke, fordi måneden gør, og et selskab den
       1. september var usynligt, mens man planlagde den 28.
       august. Reglen, prøven vogter, er den samme: måneden skal
       have sine EGNE 31 dage, hverken flere eller færre. */
    await expect(page.locator(`${NET} .maaned-dag:not(.nabo-mdr)`)).toHaveCount(31);
    // Og nettet går altid op i hele uger.
    expect((await page.locator(`${NET} .maaned-dag`).count()) % 7).toBe(0);

    await page.locator('#maaned-naeste').click();
    await expect(page.locator('#maaned-navn')).toHaveText('September 2026');
    await expect(page.locator(`${NET} .maaned-dag:not(.nabo-mdr)`)).toHaveCount(30);

    await page.locator('#maaned-forrige').click();
    await page.locator('#maaned-forrige').click();
    await expect(page.locator('#maaned-navn')).toHaveText('Juli 2026');

    await page.locator('#maaned-idag').click();
    await expect(page.locator('#maaned-navn')).toHaveText('August 2026');
  });

  /* MANDAG ER FØRSTE SØJLE. getUTCDay() giver søndag = 0, og uden
     (+6)%7 stod hele måneden EN DAG forskudt. Det er den slags,
     ingen opdager, før nogen møder ind på den forkerte dag.

     1. august 2026 er en lørdag: den skal derfor stå i søjle seks,
     altså efter fem tomme felter. */
  test('måneden begynder om mandagen, ikke om søndagen', async ({ page }) => {
    await åbnKalenderen(page);
    /* ⚠️ ÉT AF TALLENE KOMMER UDEFRA. Prøven talte tomme felter
       før; nu læser den de DATOER, felterne bærer, og de fem
       foran 1. august SKAL være 27.-31. juli. Et forkert
       (getUTCDay()+6)%7 ville give en anden juli-dato, ikke bare
       et andet antal. */
    const foran = await page.locator(`${NET} .maaned-dag`).evaluateAll((celler) => {
      const ud = [];
      for (const c of celler) {
        const d = c.getAttribute('data-dag');
        if (d.startsWith('2026-08')) break;
        ud.push(d);
      }
      return ud;
    });
    expect(foran, '1. august 2026 er en lørdag og skal stå i sjette søjle').toEqual(
      ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31']);
  });

  /* ---- NABOMÅNEDENS DAGE (3/9) ----
     De er ikke pynt. Den 1. i næste måned kan have tre borde og et
     selskab, og står man den 28. og planlægger, var de usynlige. */
  test('nabomånedens dage er med, dæmpede og med deres eget indhold', async ({ page }) => {
    await åbnKalenderen(page, grunddata({
      kalender: [{
        id: 9, lokation_id: 'mosede', type: 'arrangement', dato: '2026-09-02',
        slut_dato: null, titel: 'Sensommerfest', beskrivelse: null, emoji: '🎉',
        lukker_kl: null, offentlig: true, oprettet: '2026-08-01T10:00:00Z',
      }],
    }));

    const nabo = dag(page, '2026-09-02');
    await expect(nabo).toHaveClass(/nabo-mdr/);
    await expect(nabo).toContainText('Sensommerfest');
    // 31. juli er også naboens; 1. august er ikke.
    await expect(dag(page, '2026-07-31')).toHaveClass(/nabo-mdr/);
    await expect(dag(page, '2026-08-01')).not.toHaveClass(/nabo-mdr/);
  });

  /* ⚠️ ET TRYK PÅ NABOENS DAG SKAL SKIFTE MÅNED. Gjorde det ikke
     det, stod dagens panel med en dato, der ikke findes i det net,
     man kigger på — og pilene op/ned pegede et andet sted hen end
     det, man lige havde valgt. */
  test('et tryk på nabomånedens dag flytter nettet med', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, '2026-09-02').click();
    await expect(page.locator('#maaned-navn')).toHaveText('September 2026');
    await lukDagen(page);
    await expect(dag(page, '2026-09-02')).not.toHaveClass(/nabo-mdr/);
  });

  test('i dag er markeret', async ({ page }) => {
    await åbnKalenderen(page);
    await expect(dag(page, '2026-08-07')).toHaveClass(/er-idag/);
    await expect(dag(page, '2026-08-08')).not.toHaveClass(/er-idag/);
  });
});

test.describe('Alle fem kilder mødes på den samme dag', () => {

  /* ⚠️ VENDT 3/9 — KUNDENS FORLÆG, IKKE EN FORÆLDET PRØVE.
     Feltet bar seks tegn med tal (🥪 3 🍽️ 2), og de svarer på
     "hvor travlt". En kalender bliver spurgt om "hvad er der den
     dag", og det svar kan kun gives med et NAVN: livemusikken og
     baglokalet står med deres egne ord nu, tallene under dem.

     Reglen, prøven vogter, er den samme og den vigtigste: hver af
     de fem kilder skal kunne ses på dagen uden at åbne den. */
  test('dagen viser alt, der rører den — med navne og med tal', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    const d = dag(page, DAGEN);

    // Navnene: kalenderens egen række og baglokalet.
    await expect(d.locator('.maaned-pille.mp-fest')).toContainText('Livemusik på molen');
    await expect(d.locator('.maaned-pille.mp-lokale')).toContainText('Karen Sø');

    // Tallene: maden, bestillingerne, forespørgslerne, bordene.
    const tal = d.locator('.maaned-tal');
    await expect(tal).toContainText('2 retter');
    await expect(tal).toContainText('🥡');
    await expect(tal).toContainText('💬');
    await expect(tal).toContainText('🍽️');
  });

  /* ⚠️ EMBALLAGEN ER IKKE EN RET, og nettet er den FEMTE skærm,
     der skal vide det. Reglen bor i Admin.retterI; uden den ville
     to poser stå som to portioner mad, præcis som Bestillinger-
     fanen sagde "9 retter" på fem 1/9. */
  test('emballagen tæller ikke som en ret i nettet', async ({ page }) => {
    await åbnKalenderen(page, grunddata({
      bestillinger: [{
        id: 1, lokation_id: 'mosede', reference: 'SM260812-AAAAA',
        navn: 'Anna Vind', telefon: '20304050', hent_dato: DAGEN,
        hent_tid: '12:00', antal: 5, status: 'ny', fyld: [],
        linjer: [
          { navn: 'Smørrebrød', antal: 5, pris: 55 },
          { navn: 'Emballage', antal: 4, pris: 10, emballage: true },
        ],
        oprettet: '2026-08-07T10:00:00Z',
      }],
    }));
    await expect(dag(page, DAGEN).locator('.mt-retter')).toHaveText('5 retter');
  });

  /* Dagens ret hørte kun til i dagens panel — altså først, når
     nogen havde trykket. Ugeplanen skrives én gang om ugen, og
     hullet på torsdag skal kunne ses uden syv klik. */
  test('dagens ret står i feltet, og flere retter siger hvor mange', async ({ page }) => {
    await åbnKalenderen(page, grunddata({
      dagens_retter: [
        { id: 1, lokation_id: 'mosede', dato: DAGEN, navn: 'Stegt flæsk',
          pris: 95, antal_tilbage: null, udsolgt: false, aktiv: true, sortering: 1 },
        { id: 2, lokation_id: 'mosede', dato: DAGEN, navn: 'Fiskefilet',
          pris: 89, antal_tilbage: null, udsolgt: false, aktiv: true, sortering: 2 },
        { id: 3, lokation_id: 'mosede', dato: '2026-08-13', navn: 'Frikadeller',
          pris: 85, antal_tilbage: null, udsolgt: false, aktiv: true, sortering: 1 },
      ],
    }));

    await expect(dag(page, DAGEN).locator('.maaned-ret')).toContainText('Stegt flæsk');
    await expect(dag(page, DAGEN)).toContainText('+ 1 ret mere');

    await expect(dag(page, '2026-08-13').locator('.maaned-ret')).toContainText('Frikadeller');
    await expect(dag(page, '2026-08-13')).not.toContainText('ret mere');
    // En dag uden ret har ingen linje at misforstå.
    await expect(dag(page, '2026-08-14').locator('.maaned-ret')).toHaveCount(0);
  });

  /* ============================================================
     BORDENE MOD DAGENS LOFT  (3/9)
     ------------------------------------------------------------
     Kundens anden halvdel af ordren: kalenderen skal hænge sammen
     med, HVORDAN FOLK BOOKER. Er lørdagens loft tre borde, og er
     de tre taget, siger gæsten FULDT på bord/ — og indtil nu stod
     der ingen steder i personalets kalender, at lørdagen var
     lukket for flere.

     ⚠️ TALLET KOMMER FRA Admin.bordLoftFor, den SAMME regel
     gæsten møder. To udgaver ville skride fra hinanden den dag,
     ejeren nedlægger et bord — og begge skærme ville se rigtige
     ud for sig selv.
     ============================================================ */
  test('bordene står mod dagens loft, og en fuld dag er markeret', async ({ page }) => {
    await åbnKalenderen(page, grunddata({
      borde: [
        { id: 1, lokation_id: 'mosede', nummer: '1', aktiv: true },
        { id: 2, lokation_id: 'mosede', nummer: '2', aktiv: true },
        { id: 3, lokation_id: 'mosede', nummer: '3', aktiv: true },
      ],
      dags_regler: [{ id: 1, lokation_id: 'mosede', dato: DAGEN, bord_loft: 2 }],
      bordbestillinger: [
        { id: 1, lokation_id: 'mosede', reference: 'BO-A', navn: 'Ole Berg',
          telefon: '30405060', dato: DAGEN, tid: '18:00', antal_personer: 6,
          status: 'ny', oprettet: '2026-08-07T10:00:00Z' },
        { id: 2, lokation_id: 'mosede', reference: 'BO-B', navn: 'Lis Hald',
          telefon: '30405061', dato: DAGEN, tid: '19:00', antal_personer: 4,
          status: 'bekraeftet', oprettet: '2026-08-07T10:00:00Z' },
        { id: 3, lokation_id: 'mosede', reference: 'BO-C', navn: 'Per Vig',
          telefon: '30405062', dato: '2026-08-14', tid: '18:00', antal_personer: 2,
          status: 'ny', oprettet: '2026-08-07T10:00:00Z' },
      ],
    }));

    // Dagens eget loft er to, og de to er taget: dagen er fuld.
    const fuld = dag(page, DAGEN).locator('.maaned-maerke.er-fuldt');
    await expect(fuld).toHaveCount(1);
    await expect(fuld).toContainText('2/2');

    // Den 14. har ejerens grundtal — tre aktive borde — og ét taget.
    const anden = dag(page, '2026-08-14').locator('.maaned-maerke').last();
    await expect(anden).toContainText('1/3');
    await expect(dag(page, '2026-08-14').locator('.maaned-maerke.er-fuldt')).toHaveCount(0);
  });

  /* ⚠️ DEN TREDJE VEJ, FOLK BOOKER. Et arrangement med tilmelding
     har et loft ligesom dagen har det for bordene, og gæsten får
     nej på kalendersiden, når det er nået. Stod det ikke i
     nettet, kunne personalet se et arrangement, de troede der var
     plads til, mens hjemmesiden for længst havde lukket.

     ⚠️ TALLET KOMMER FRA Admin.pladserTaget — Tilmeldinger-fanens
     egen regel, som springer de AFVISTE over, fordi et afslag
     frigiver pladsen igen. */
  test('et arrangements pladser står i nettet, og fuldt er markeret', async ({ page }) => {
    await åbnKalenderen(page, grunddata({
      kalender: [
        { id: 1, lokation_id: 'mosede', type: 'arrangement', dato: DAGEN,
          slut_dato: null, titel: 'Torskegilde', beskrivelse: null, emoji: '🐟',
          lukker_kl: null, offentlig: true, tilmelding: true, pladser: 40,
          oprettet: '2026-08-01T10:00:00Z' },
        { id: 2, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-19',
          slut_dato: null, titel: 'Fællesspisning', beskrivelse: null, emoji: '🍲',
          lukker_kl: null, offentlig: true, tilmelding: true, pladser: 10,
          oprettet: '2026-08-01T10:00:00Z' },
      ],
      reservationer: [
        { id: 1, lokation_id: 'mosede', kalender_id: 1, reference: 'RE-A',
          navn: 'Anna', telefon: '20304050', antal_personer: 12, status: 'ny',
          oprettet: '2026-08-07T10:00:00Z' },
        { id: 2, lokation_id: 'mosede', kalender_id: 2, reference: 'RE-B',
          navn: 'Bo', telefon: '20304051', antal_personer: 10, status: 'bekraeftet',
          oprettet: '2026-08-07T10:00:00Z' },
        /* Et afslag frigiver pladsen — det må IKKE tælle med,
           ellers siger skærmen fuldt, mens siden tager imod. */
        { id: 3, lokation_id: 'mosede', kalender_id: 1, reference: 'RE-C',
          navn: 'Cita', telefon: '20304052', antal_personer: 20, status: 'afvist',
          oprettet: '2026-08-07T10:00:00Z' },
      ],
    }));
    // Fanen skal have hentet reservationerne, før nettet kan vide noget.
    await visFane(page, 'p-tilmeldinger');
    await visFane(page, 'p-kalender');

    const billet = (iso) => dag(page, iso).locator('.maaned-maerke').filter({ hasText: '🎟️' });
    await expect(billet(DAGEN)).toContainText('12/40');
    await expect(dag(page, DAGEN).locator('.maaned-maerke.er-fuldt')).toHaveCount(0);

    await expect(billet('2026-08-19')).toContainText('10/10');
    await expect(dag(page, '2026-08-19').locator('.maaned-maerke.er-fuldt'))
      .toHaveCount(1);
  });

  /* Et "kig forbi"-arrangement har hverken loft eller tilmelding,
     og en billet-chip på det ville love en reservation, der ikke
     findes. */
  test('et arrangement uden tilmelding har ingen billet-chip', async ({ page }) => {
    await åbnKalenderen(page, grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'arrangement', dato: DAGEN,
        slut_dato: null, titel: 'Livemusik', beskrivelse: null, emoji: '🎸',
        lukker_kl: null, offentlig: true, tilmelding: false, pladser: null,
        oprettet: '2026-08-01T10:00:00Z',
      }],
    }));
    await expect(dag(page, DAGEN)).toContainText('Livemusik');
    await expect(dag(page, DAGEN).locator('.maaned-tal')).not.toContainText('🎟️');
  });

  /* ⚠️ INGEN BORDE OPRETTET = INTET LOFT, IKKE NUL. bord/ har
     taget imod bookinger, længe før tabellen `borde` fandtes, og
     et "1/0" i nettet ville sige, at dagen var overbooket, mens
     hjemmesiden tog glad imod. Se noten i Butik.bordLoft. */
  test('uden oprettede borde står antallet alene, uden loft', async ({ page }) => {
    await åbnKalenderen(page, grunddata({
      borde: [],
      bordbestillinger: [{
        id: 1, lokation_id: 'mosede', reference: 'BO-A', navn: 'Ole Berg',
        telefon: '30405060', dato: DAGEN, tid: '18:00', antal_personer: 6,
        status: 'ny', oprettet: '2026-08-07T10:00:00Z',
      }],
    }));
    const d = dag(page, DAGEN);
    await expect(d.locator('.maaned-tal')).toContainText('🍽️');
    await expect(d.locator('.maaned-tal')).not.toContainText('/');
    await expect(d.locator('.maaned-maerke.er-fuldt')).toHaveCount(0);
  });

  /* ---- KANTEN I VENSTRE SIDE ----
     Den siger "der er et program den dag". En note er personalets
     egen seddel — "kun to på arbejde" er ikke et arrangement, og
     en grøn kant på den ville overdrive pillen. */
  test('et arrangement giver dagen en grøn kant, en note gør ikke', async ({ page }) => {
    await åbnKalenderen(page, grunddata({
      kalender: [
        { id: 1, lokation_id: 'mosede', type: 'arrangement', dato: DAGEN,
          slut_dato: null, titel: 'Livemusik', beskrivelse: null, emoji: '🎸',
          lukker_kl: null, offentlig: true, oprettet: '2026-08-01T10:00:00Z' },
        { id: 2, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-19',
          slut_dato: null, titel: 'Note til dagen',
          beskrivelse: 'Personaledag — kun to på arbejde', emoji: null,
          lukker_kl: null, offentlig: false, oprettet: '2026-08-01T10:00:00Z' },
      ],
    }));

    await expect(dag(page, DAGEN)).toHaveClass(/har-fest/);
    const noten = dag(page, '2026-08-19');
    await expect(noten).not.toHaveClass(/har-fest/);
    // Men noten SES — pillen er der, kanten er bare ikke.
    await expect(noten.locator('.maaned-pille.mp-note')).toContainText('Personaledag');
  });

  test('dagens panel skriver det hele ud', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();

    const panel = page.locator('#dag-panel');
    await expect(panel).toContainText('12. august');
    await expect(panel).toContainText('Anna Vind');
    await expect(panel).toContainText('Ole Berg');
    /* "Bord til 6" og ikke "6 pers.": programmet skriver, hvad
       linjen ER, og et bord til seks er ikke seks personer på en
       liste. Antallet er stadig med — se noten om antal_personer
       nedenfor, som stadig gælder forespørgsler og baglokalet. */
    await expect(panel).toContainText('Bord til 6');
    await expect(panel).toContainText('Peter Lund');
    await expect(panel).toContainText('20 pers.');   // antal_personer, ikke antal
    await expect(panel).toContainText('Karen Sø');
    await expect(panel).toContainText('30 pers.');
    await expect(panel).toContainText('Livemusik på molen');
  });

  test('panelet fører hen til den fane, tingen kan rettes på', async ({ page }) => {
    /* Panelet retter INTET selv. To steder at ændre en bestilling
       er to steder, der kan skride fra hinanden. */
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();

    /* Pilen på selve linjen. Programmet står i tidsrækkefølge, så
       vejen til fanen hører til på den enkelte sag og ikke som en
       knap under en gruppe — grupperne findes ikke længere. */
    await page.locator('.prog-linje', { hasText: 'Anna Vind' })
      .locator('.nyt-aabn').click();
    await expect(page.locator('#p-bestillinger')).toBeVisible();
    // Og laget skal være væk, ellers står fanen bag et mørkt lag.
    await expect(page.locator('#dag-lag')).toBeHidden();
  });

  /* ⚠️ DAGEN ER ET LAG NU (28/8), og et lag lukkes ikke ved at
     trykke på det, der ligger bagved — nettet er dækket. To veje
     ud, og begge er med vilje udtrykkelige: ✕ og Escape.

     Et klik på en tom flade lukker IKKE. Panelet har felter,
     personalet skriver i; et fejlklik ved siden af er ikke et
     ønske om at kassere en halv sætning. */
  test('krydset lukker laget', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();
    await expect(page.locator('#dag-lag')).toBeVisible();

    await page.locator('.dag-luk').click();
    await expect(page.locator('#dag-lag')).toBeHidden();
  });

  test('og Escape gør det samme', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();
    await expect(page.locator('#dag-lag')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#dag-lag')).toBeHidden();
  });

  /* ⚠️ MEN ET KLIK VED SIDEN AF MÅ IKKE LUKKE. Målt: uden reglen
     ville en halvskrevet note forsvinde ved et fejlklik. */
  test('et klik ved siden af lukker ikke', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();
    await page.locator('#dag-lag').click({ position: { x: 4, y: 4 } });
    await expect(page.locator('#dag-lag')).toBeVisible();
  });

  /* Ugestriben: "hvad med i morgen?" uden at lukke og åbne igen. */
  test('ugestriben flytter til en anden dag', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();
    await expect(page.locator('.dag-titel')).toContainText('12. august');

    await page.locator('.dag-uge-dag', { hasText: '13' }).click();
    await expect(page.locator('.dag-titel')).toContainText('13. august');
    await expect(page.locator('#dag-lag'), 'laget lukkede sig selv').toBeVisible();
  });

  test('en tom dag siger det, i stedet for at stå tom', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, '2026-08-20').click();
    await expect(page.locator('#dag-panel')).toContainText('ikke noget på dagen');
  });
});

test.describe('Lukkedage og perioder farver nettet', () => {

  test('en lukkedag er markeret og siger hvorfor', async ({ page }) => {
    const d = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'lukkedag', dato: '2026-08-18',
        slut_dato: null, titel: 'Ferie', beskrivelse: null, emoji: null,
        lukker_kl: null, offentlig: true, oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnKalenderen(page, d);
    await expect(dag(page, '2026-08-18')).toHaveClass(/er-lukket/);
    await expect(dag(page, '2026-08-18')).toContainText('Lukket');

    await dag(page, '2026-08-18').click();
    await expect(page.locator('#dag-panel')).toContainText('Lukket — Ferie');
  });

  /* EN PERIODE ER ÉN RÆKKE. En vinterlukning er ikke halvfems
     rækker — men den skal farve halvfems dage i nettet, ikke kun
     den første. Første udgave af raekkerOver() ville have vist
     kun startdagen, og så ville personalet tro, der var åbent den
     19. og den 20. */
  test('en periode farver alle dagene, ikke kun den første', async ({ page }) => {
    const d = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'lukkedag', dato: '2026-08-17',
        slut_dato: '2026-08-21', titel: 'Sommerlukket', beskrivelse: null,
        emoji: null, lukker_kl: null, offentlig: true,
        oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnKalenderen(page, d);
    for (const iso of ['2026-08-17', '2026-08-18', '2026-08-19',
      '2026-08-20', '2026-08-21']) {
      await expect(dag(page, iso), iso + ' skulle være lukket').toHaveClass(/er-lukket/);
    }
    await expect(dag(page, '2026-08-22')).not.toHaveClass(/er-lukket/);
    await expect(dag(page, '2026-08-16')).not.toHaveClass(/er-lukket/);
  });

  test('en tidlig lukning siger hvornår, ikke bare at der lukkes', async ({ page }) => {
    const d = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'tidlig_lukning', dato: '2026-08-14',
        slut_dato: null, titel: 'Personalefest', beskrivelse: null, emoji: null,
        lukker_kl: '15:00:00', offentlig: true, oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnKalenderen(page, d);
    await expect(dag(page, '2026-08-14')).toContainText('Til 15:00');
  });
});

test.describe('Noten til dagen når hele vejen ud på Overblik', () => {

  test('noten skrives på dagen og gemmes i kalenderen', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, '2026-08-07').click();

    await page.locator('#dag-note-felt').fill('Henning kommer og spiser kl. 18');
    await page.locator('#gem-dag-note').click();
    await expect(page.locator('#kvittering')).toContainText('Noten er gemt');

    const gemt = await gemteData(page);
    const note = gemt.kalender.find((k) => k.dato === '2026-08-07');
    expect(note.beskrivelse).toBe('Henning kommer og spiser kl. 18');
    /* INTERN, ALTID. En note til personalet, der ved en fejl blev
       offentlig, ville stå på gæsternes forside som et
       arrangement. */
    expect(note.offentlig, 'noten må ALDRIG være offentlig').toBe(false);
    expect(note.titel, 'kendingen er titlen — se NOTE_TITEL').toBe('Note til dagen');
  });

  test('og den står på Overblik, når det er i dag', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, '2026-08-07').click();
    await page.locator('#dag-note-felt').fill('Der kommer en levering kl. 9');
    await page.locator('#gem-dag-note').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    await lukDagen(page);
    await visFane(page, 'p-overblik');
    /* Noten står i et FELT på køreplanen nu (26/8) og ikke som en
       linje tekst — den kan skrives begge steder. toContainText
       kan ikke se en feltværdi; det er den samme fælde som
       navnene i admin, der bærer data-vare. */
    await expect(page.locator('#plan-note-felt'))
      .toHaveValue('Der kommer en levering kl. 9');
  });

  test('en note til en ANDEN dag står ikke på Overblik', async ({ page }) => {
    /* Køreplanen er dagens. Stod morgendagens note der også, ville
       personalet handle på den i dag. */
    await åbnKalenderen(page);
    await dag(page, '2026-08-20').click();
    await page.locator('#dag-note-felt').fill('Husk at bestille rugbrød');
    await page.locator('#gem-dag-note').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    await lukDagen(page);
    await visFane(page, 'p-overblik');
    await expect(page.locator('#plan-note-felt')).toHaveValue('');
    await expect(page.locator('#overblik-koereplan')).not.toContainText('rugbrød');
  });

  test('en tom note er ingen note', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, '2026-08-07').click();
    await page.locator('#gem-dag-note').click();
    await expect(page.locator('#fejl')).toContainText('Skriv noget');

    const gemt = await gemteData(page);
    expect((gemt.kalender || []).length, 'en tom note blev gemt som en række').toBe(0);
  });

  /* Noten er en kalenderrække med typen arrangement. Den må IKKE
     tælle som et arrangement — hverken i nettet, på listen eller i
     beskeden om det manglende banner på forsiden. */
  test('noten er ikke et arrangement', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, '2026-08-07').click();
    await page.locator('#dag-note-felt').fill('Kun til os selv');
    await page.locator('#gem-dag-note').click();
    await expect(page.locator('#kvittering')).toContainText('gemt');

    const d = dag(page, '2026-08-07');
    await expect(d).toContainText('📝');
    await expect(d).not.toContainText('📅');
  });
});

test.describe('Køreplanen siger, om der er åbent', () => {

  test('åbent er den grønne stribe', async ({ page }) => {
    await åbnAdmin(page);
    await expect(page.locator('.plan-stribe')).toContainText('Åbent for bestillinger');
    await expect(page.locator('.plan-stribe')).not.toHaveClass(/plan-lukket/);
  });

  test('en lukkedag i dag slår alt andet', async ({ page }) => {
    const d = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'lukkedag', dato: '2026-08-07',
        slut_dato: null, titel: 'Ferie', beskrivelse: null, emoji: null,
        lukker_kl: null, offentlig: true, oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnAdmin(page, { data: d });
    await expect(page.locator('.plan-stribe')).toContainText('Lukket i dag');
    await expect(page.locator('.plan-stribe')).toHaveClass(/plan-lukket/);
  });

  test('slukkede bestillinger siges ogsaa højt', async ({ page }) => {
    /* Der ER åbent i lugen, men siden tager ikke imod. To
       forskellige ting, og personalet skal kunne se forskel:
       ellers leder de efter en fejl i formularen. */
    const d = grunddata();
    d.indstillinger.bestilling_aaben = false;
    await åbnAdmin(page, { data: d });
    await expect(page.locator('.plan-stribe')).toContainText('slået fra');
  });

  /* ⚠️ PRØVEN HER BESTOD PÅ EN RÆKKE, DER IKKE KAN FINDES (rettet
     29/8, fundet på et skud af køreplanen).

     Den skrev status 'aftalt' på en UDLEJNING. Det ord findes kun
     i forespørgslernes tabel — en udlejning hedder ny, bekraeftet
     eller afvist — og koden spurgte efter præcis det samme
     umulige ord. Prøve og kode delte altså den forkerte antagelse,
     så linjen bestod, mens den i produktionen ALDRIG blev tegnet:
     baglokalet var lejet ud til 30 personer, og køreplanen sagde
     "Ingen bestillinger eller aftaler endnu i dag".

     Det er lærestregen fra CLAUDE.md om, at ét af tallene skal
     komme udefra: her kom begge fra den samme misforståelse. */
  test('er baglokalet lejet ud i dag, står det på køreplanen', async ({ page }) => {
    const d = grunddata({
      udlejninger: [{
        id: 1, lokation_id: 'mosede', reference: 'BL260807-AAAAA',
        navn: 'Karen Sø', telefon: '50607080', email: null,
        dato: '2026-08-07', antal_personer: 30, besked: null,
        status: 'bekraeftet', intern_note: null, oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#overblik-koereplan')).toContainText('Baglokalet er lejet ud');
    await expect(page.locator('#overblik-koereplan')).toContainText('Karen Sø');
  });

  /* Og den anden vej ind til det samme lokale. En forespørgsel,
     personalet har sagt ja til, er en dag, der er lovet væk — også
     selv om ingen har låst den endnu. Køkkenet skal møde ind til
     festen uanset hvilken formular gæsten brugte; forskellen på de
     to hører til på Baglokalet-fanen, ikke her. */
  test('og en aftalt forespørgsel om lokalet står der også', async ({ page }) => {
    const d = grunddata({
      forespoergsler: [{
        id: 9, lokation_id: 'mosede', reference: 'FO260807-CCCCC',
        type: 'baglokale', navn: 'Mette Lund', telefon: '40506070',
        email: null, dato: '2026-08-07', antal_personer: 20, besked: null,
        detaljer: null, status: 'aftalt', intern_note: null,
        oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#overblik-koereplan')).toContainText('Baglokalet er aftalt i dag');
    await expect(page.locator('#overblik-koereplan')).toContainText('Mette Lund');
  });

  /* Men et spørgsmål er ikke en aftale. En forespørgsel, der lige
     er kommet ind, må ikke få køreplanen til at sige, at lokalet
     er optaget — så ville personalet holde en dag fri, som ingen
     har lovet nogen. */
  test('en forespørgsel, ingen har svaret på, står der ikke', async ({ page }) => {
    const d = grunddata({
      forespoergsler: [{
        id: 9, lokation_id: 'mosede', reference: 'FO260807-CCCCC',
        type: 'baglokale', navn: 'Mette Lund', telefon: '40506070',
        email: null, dato: '2026-08-07', antal_personer: 20, besked: null,
        detaljer: null, status: 'ny', intern_note: null,
        oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#overblik-koereplan')).not.toContainText('Baglokalet er');
  });

  test('en udlejning, der kun er FORESPURGT, står der ikke', async ({ page }) => {
    /* Kun aftalte optager lokalet — se optagne_dage i
       forespoergsel-kalender.sql. En forespørgsel, der lige er
       kommet ind, er et spørgsmål, ikke en booking, og køreplanen
       må ikke sige, at lokalet er optaget. */
    const d = grunddata({
      udlejninger: [{
        id: 1, lokation_id: 'mosede', reference: 'BL260807-AAAAA',
        navn: 'Karen Sø', telefon: '50607080', email: null,
        dato: '2026-08-07', antal_personer: 30, besked: null,
        status: 'ny', intern_note: null, oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#overblik-koereplan')).not.toContainText('lejet ud');
  });
});

/* ⚠️ DE SMÅ KNAPPER SKAL BLIVE VED MED AT VÆRE DÆMPEDE.

   Da admin fik gæstesidens tema (24/8), fik body.personale .knap
   mærkefarven — og den regel vejer tungere end .knap.lille. Så
   blev pilene op/ned på Menukort og månedsskiftet her RØDE. Noten
   ved .knap.lille i style.css advarer netop imod det: de er et
   værktøj, man bruger sjældent, og i rødt råber de lige så højt
   som Gem, der bruges hver dag.

   Set på et skærmbillede, usynligt i koden. Prøven læser den
   BEREGNEDE farve, som prøven for den gule kant på telefonen. */
test('de små knapper er dæmpede, ikke røde', async ({ page }) => {
  await åbnKalenderen(page);
  const farve = await page.locator('#maaned-forrige')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(farve, 'månedspilene må ikke råbe som en Gem-knap')
    .not.toBe('rgb(214, 42, 58)');

  await visFane(page, 'p-menu');
  const pil = await page.locator('.flyt .knap.lille').first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(pil, 'pilene på Menukort må heller ikke').not.toBe('rgb(214, 42, 58)');
});

/* ------------------------------------------------------------
   PERSONALET SKAL KUNNE TAGE EN BOOKING I TELEFONEN
   ------------------------------------------------------------
   Ringer nogen og bestiller et bord, fandtes der ingen vej ind:
   bookingen kunne kun laves på hjemmesiden. Så stod halvdelen af
   dagen i systemet og halvdelen på en seddel ved lugen — og
   dagens billede løj om, hvor mange pladser der var tilbage.
   ------------------------------------------------------------ */
test.describe('Booking taget i telefonen', () => {

  async function åbnBorde(page, data) {
    await åbnAdmin(page, data ? { data } : undefined);
    await visFane(page, 'p-borde');
    await page.locator('#tag-booking summary').click();
  }

  async function udfyld(page, æ) {
    const v = { navn: 'Anna Vind', telefon: '20304050', dato: '2026-08-14',
      tid: '18:00', antal: '4', ...æ };
    await page.locator('#nyb-navn').fill(v.navn);
    await page.locator('#nyb-telefon').fill(v.telefon);
    await page.locator('#nyb-dato').fill(v.dato);
    await page.locator('#nyb-tid').fill(v.tid);
    await page.locator('#nyb-antal').fill(v.antal);
  }

  test('bookingen lander i den samme liste som gæsternes', async ({ page }) => {
    await åbnBorde(page);
    await udfyld(page);
    await page.locator('#opret-booking').click();
    await expect(page.locator('#kvittering')).toContainText('oprettet og bekræftet');

    const gemt = await gemteData(page);
    expect(gemt.bordbestillinger).toHaveLength(1);
    const b = gemt.bordbestillinger[0];
    expect(b.navn).toBe('Anna Vind');
    expect(b.dato).toBe('2026-08-14');
    expect(b.antal_personer).toBe(4);
    /* BEKRÆFTET, IKKE NY. Personalet har sagt ja i røret; en
       booking, der lander som "ny", står på listen som noget, der
       skal ringes om — og så bliver der ringet til en, der lige
       har lagt på. */
    expect(b.status).toBe('bekraeftet');
    expect(b.intern_note).toContain('telefonen');
    // Samme referenceform som gæsternes: BO.
    expect(b.reference).toMatch(/^BO\d{6}-/);
  });

  test('og den står med det samme på fanen og i kalenderen', async ({ page }) => {
    await åbnBorde(page);
    await udfyld(page, { navn: 'Ole Berg', dato: '2026-08-14' });
    await page.locator('#opret-booking').click();
    await expect(page.locator('#kvittering')).toContainText('oprettet');

    await expect(page.locator('#p-borde')).toContainText('Ole Berg');

    await visFane(page, 'p-kalender');
    await expect(dag(page, '2026-08-14')).toContainText('🍽️');
  });

  test('felterne tømmes, så nummer to ikke arver nummer et', async ({ page }) => {
    /* Uden det ville personalet, der tager to opkald i træk,
       sende den samme gæst ind igen — og dobbeltnøglen ville
       afvise den med en besked, der ikke giver mening. */
    await åbnBorde(page);
    await udfyld(page);
    await page.locator('#opret-booking').click();
    await expect(page.locator('#kvittering')).toContainText('oprettet');
    await expect(page.locator('#nyb-navn')).toHaveValue('');
    await expect(page.locator('#nyb-telefon')).toHaveValue('');
  });

  test('den bruger gæstens egne værn — dobbelt er stadig dobbelt', async ({ page }) => {
    /* Butik.bookBord er den SAMME funktion, hjemmesiden kalder.
       At skrive en anden vej ind i den samme tabel ville være to
       regelsæt, der langsomt kommer til at sige noget forskelligt. */
    await åbnBorde(page);
    await udfyld(page);
    await page.locator('#opret-booking').click();
    await expect(page.locator('#kvittering')).toContainText('oprettet');

    await udfyld(page);
    await page.locator('#opret-booking').click();
    await expect(page.locator('#fejl')).toContainText('allerede');

    const gemt = await gemteData(page);
    expect(gemt.bordbestillinger).toHaveLength(1);
  });

  test('en booking uden klokkeslæt bliver afvist', async ({ page }) => {
    await åbnBorde(page);
    await udfyld(page, { tid: '' });
    await page.locator('#opret-booking').click();
    await expect(page.locator('#fejl')).toContainText('hvad klokken er');

    const gemt = await gemteData(page);
    expect(gemt.bordbestillinger || []).toHaveLength(0);
  });

  test('hundrede mennesker er ikke et bord', async ({ page }) => {
    await åbnBorde(page);
    await udfyld(page, { antal: '150' });
    await page.locator('#opret-booking').click();
    await expect(page.locator('#fejl')).toContainText('selskab');
  });

  test('formularen er foldet sammen, til nogen har brug for den', async ({ page }) => {
    /* Fanen handler om de bookinger, der ER kommet ind. Syv åbne
       felter oven over dagens liste ville skubbe arbejdet ned
       hver eneste gang, nogen åbnede fanen. */
    await åbnAdmin(page);
    await visFane(page, 'p-borde');
    await expect(page.locator('#nyb-navn')).toBeHidden();
  });
});

/* ============================================================
   DAGENS STYRING — DEN HALVT ÅBNE DAG
   ------------------------------------------------------------
   Kundens ord (26/8): "hvis der er selskab en dag som en booking
   der er blevet oprettet skal de kunne administrere at der ikke
   er åbent for bestillinger den dag eller kun åbent for to go
   ... så det netop ikke kan gå galt."

   Databasen afviser (proev-dagsregler.sql, 21 af 21), og
   gæstesiden skjuler (tests/dagsregler.spec.js). Her måles den
   tredje del: at personalet kan SÆTTE reglen — og at skærmen
   fortæller dem, hvad den koster, før de gør det.
   ============================================================ */
test.describe('Dagen kan være halvt åben', () => {

  const DAG = '2026-08-20';

  test('de to veje står som et valg, begge åbne fra start', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    const veje = page.locator('.dag-vej');
    await expect(veje).toHaveCount(2);
    await expect(veje.filter({ hasText: 'Ud af huset' })).toContainText('Åben');
    await expect(veje.filter({ hasText: 'Spis her' })).toContainText('Åben');
  });

  test('lukkes spis her, står det i databasen — og take-away er urørt',
    async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');

    const d = await gemteData(page);
    const r = (d.dags_regler || []).filter((x) => x.dato === DAG)[0];
    expect(r, 'der blev ikke skrevet en regel').toBeTruthy();
    expect(r.luk_spis_her).toBe(true);
    expect(r.luk_takeaway, 'take-away blev lukket med').toBe(false);
  });

  /* ⚠️ EN DAG UDEN NOGET SÆRLIGT SKAL IKKE HAVE EN RÆKKE. En
     tabel fuld af rækker, der siger "helt almindelig", er en
     tabel, nogen skal vedligeholde — og den dag, en af dem bliver
     forkert, står den og lyver stille. */
  test('åbnes den igen, forsvinder rækken helt', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');

    await page.locator('.dag-vej[data-vej="luk_spis_her"] button',
      { hasText: 'Åbn igen' }).click();
    await expect(page.locator('#kvittering')).toContainText('åben igen');

    const d = await gemteData(page);
    expect((d.dags_regler || []).filter((x) => x.dato === DAG)).toHaveLength(0);
  });

  /* ⚠️ MÆRKET SKAL KUNNE LÆSES I BEGGE TILSTANDE. Den valgte dag
     har mørk flade, og mærkefarven forsvinder i den. MÅLT på et
     skærmbillede: 2,57:1 — mærket var der, og man kunne ikke læse
     det. Hver regel så rigtig ud for sig; det er sammensætningen,
     der er forkert, og den findes kun ved at måle. */
  test('mærket kan læses — også på den valgte dag', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');

    const maal = async (iso) => dag(page, iso).evaluate((celle) => {
      const m = celle.querySelector('.maaned-stand');
      if (!m) return null;
      const tal = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const lys = (rgb) => {
        const k = rgb.map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
      };
      let bag = getComputedStyle(celle).backgroundColor, el = celle;
      while (/rgba\(0, 0, 0, 0\)|transparent/.test(bag) && el.parentElement) {
        el = el.parentElement;
        bag = getComputedStyle(el).backgroundColor;
      }
      const a = lys(tal(getComputedStyle(m).color)), b = lys(tal(bag));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });

    // Valgt (mørk flade)
    expect(await maal(DAG), 'mærket forsvinder i den valgte dags flade')
      .toBeGreaterThan(4.5);

    // Og uvalgt: der vælges en anden dag, så den første bliver almindelig
    await lukDagen(page);
    await dag(page, '2026-08-21').click();
    expect(await maal(DAG), 'mærket kan ikke læses på en almindelig dag')
      .toBeGreaterThan(4.5);
  });

  test('månedsnettet siger det på afstand', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');

    await expect(dag(page, DAG)).toContainText('Kun ud af huset');
    await expect(dag(page, DAG)).toHaveClass(/er-halv/);
    // Nabodagen er urørt
    await expect(dag(page, '2026-08-21')).not.toContainText('Kun ud af huset');
  });

  /* Begge veje spærret ER en lukkedag — også i nettet. Ellers
     ligner den en halvt åben dag, og nogen regner med, at der
     stadig kan hentes. */
  test('begge veje lukket ser ud som en lukkedag', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');
    await page.locator('.dag-vej[data-vej="luk_takeaway"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');

    await expect(dag(page, DAG)).toContainText('Lukket');
    await expect(dag(page, DAG)).toHaveClass(/er-lukket/);
  });

  /* ⚠️ FELTET HEDDER luk_takeaway (12/9). Dagspanelet læste
     r.luk_take_away, som ikke findes — så en dag lukket for ud af
     huset stod som "✅ Åbent", og en dag lukket for BEGGE dele stod
     som "Kun ud af huset er åben". Målt på 12/9 i produktionen, hvor
     begge veje var lukket. Nettet havde det rigtigt hele tiden; det
     var panelet ved siden af, der sagde noget andet. */
  test('dagspanelet siger det samme som nettet', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await page.locator('.dag-vej[data-vej="luk_takeaway"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');
    await expect(page.locator('.dag-stand')).toContainText('Kun spis her er åben');

    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();
    await expect(page.locator('.dag-stand')).toContainText('Hverken');
  });

  test('dagens tider gemmer sig selv', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await page.locator('#dag-senest-togo').fill('19:00');
    await page.locator('#dag-senest-togo').blur();
    await expect(page.locator('.dag-styring .gemt-maerke')).toHaveText('✓ Gemt');

    const d = await gemteData(page);
    const r = (d.dags_regler || []).filter((x) => x.dato === DAG)[0];
    expect(r.senest_togo).toBe('19:00');
    await expect(dag(page, DAG)).toContainText('Egne tider');
  });

  /* ⚠️ BESKEDEN LÆSES AF GÆSTEN, og feltet skal sige det HVOR
     feltet er. En medarbejder, der skriver "ring til Henning" i
     den, har skrevet det på hjemmesiden. */
  test('gæstebeskeden siger selv, at gæsterne kan læse den', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    const linje = page.locator('.dag-styring .hjaelp.gaester-laeser');
    await expect(linje).toContainText('gæsterne kan læse');

    /* ⚠️ OG DEN SKAL KUNNE LÆSES. Klassen hed 'advarsel' først,
       og .advarsel har rød flade og hvid tekst i forvejen — så
       stod linjen rød på rødt. Prøven læser den BEREGNEDE
       kontrast, ikke klassenavnet: en linje, der er der og ikke
       kan læses, er ikke en linje. */
    const m = await linje.evaluate((el) => {
      const c = getComputedStyle(el);
      const tal = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const lys = (rgb) => {
        const k = rgb.map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
      };
      let bag = c.backgroundColor, el2 = el;
      while (/rgba\(0, 0, 0, 0\)|transparent/.test(bag) && el2.parentElement) {
        el2 = el2.parentElement;
        bag = getComputedStyle(el2).backgroundColor;
      }
      const a = lys(tal(c.color)), b = lys(tal(bag));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(m, 'linjen om gæsterne kan ikke læses').toBeGreaterThan(4.5);
  });
});

/* ============================================================
   DET KLOGE: SKÆRMEN KIGGER PÅ DAGEN FØRST
   ============================================================ */
test.describe('Kalenderen advarer, før noget kan gå galt', () => {

  const DAG = '2026-08-20';

  function medUdlejning() {
    const d = dagenFuld();
    d.udlejninger = [{
      id: 1, lokation_id: 'mosede', reference: 'UD-1', navn: 'Hansen',
      telefon: '20304050', dato: DAG, antal_personer: 40,
      status: 'aftalt', besked: null, intern_note: null, slettet: null,
      oprettet: '2026-08-01T10:00:00Z',
    }];
    return d;
  }

  /* DEN DAG, HELE TABELLEN BLEV BYGGET TIL. Personalet skal ikke
     skulle huske sammenhængen mellem en udlejning og en
     bestillingsformular — skærmen kender den. */
  test('er baglokalet lejet ud, foreslår den at lukke for spis her',
    async ({ page }) => {
    await åbnKalenderen(page, medUdlejning());
    await dag(page, DAG).click();

    const forslag = page.locator('.dag-forslag');
    await expect(forslag).toContainText('Hansen');
    await expect(forslag).toContainText('40');
    await expect(forslag).toContainText('spis her');

    await forslag.locator('button').click();
    await expect(page.locator('#kvittering')).toContainText('spis her');

    const d = await gemteData(page);
    expect((d.dags_regler || []).filter((x) => x.dato === DAG)[0].luk_spis_her)
      .toBe(true);
  });

  /* Forslaget skal FORSVINDE, når det er fulgt. Et forslag, der
     bliver stående, læses som "det virkede ikke". */
  test('forslaget er væk, når det er fulgt', async ({ page }) => {
    await åbnKalenderen(page, medUdlejning());
    await dag(page, DAG).click();
    await page.locator('.dag-forslag button').click();
    await expect(page.locator('#kvittering')).toContainText('spis her');
    await expect(page.locator('.dag-forslag')).toHaveCount(0);
  });

  test('uden noget optaget er der intet forslag', async ({ page }) => {
    await åbnKalenderen(page);
    await dag(page, DAG).click();
    await expect(page.locator('.dag-forslag')).toHaveCount(0);
  });

  /* ⚠️ EN LUKNING MÅ IKKE STRANDE NOGEN I STILHED. Ligger der
     bestillinger på dagen, skal personalet SE dem med navn og
     klokkeslæt, før de lukker. Ellers opdages det, når gæsten
     står ved lugen. */
  test('ligger der bestillinger, siges det med navn før der lukkes',
    async ({ page }) => {
    const d = dagenFuld();
    d.bestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'SM-1', navn: 'Sara Dam',
      telefon: '20304050', hent_dato: DAG, hent_tid: '17:30',
      linjer: [{ navn: 'Fiskefilet', antal: 2, pris: 75 }], fyld: [], antal: 2,
      besked: null, status: 'bekraeftet', hvordan: 'spis_her',
      leverings_adresse: null, intern_note: null, slettet: null,
      oprettet: '2026-08-19T10:00:00Z',
    }];
    await åbnKalenderen(page, d);
    await dag(page, DAG).click();

    let tekst = '';
    page.on('dialog', (dlg) => { tekst = dlg.message(); dlg.dismiss(); });
    await page.locator('.dag-vej[data-vej="luk_spis_her"] button').click();

    expect(tekst).toContain('Sara Dam');
    expect(tekst).toContain('17:30');

    // Afvist i advarslen = ingenting sker
    const gemt = await gemteData(page);
    expect((gemt.dags_regler || []).filter((x) => x.dato === DAG)).toHaveLength(0);
  });

  /* Den anden vej: en spis her-bestilling må ikke advare om en
     take-away-lukning. En advarsel, der kommer hver gang, holder
     man op med at læse. */
  test('en spis her-bestilling advarer ikke mod at lukke take-away',
    async ({ page }) => {
    const d = dagenFuld();
    d.bestillinger = [{
      id: 1, lokation_id: 'mosede', reference: 'SM-1', navn: 'Sara Dam',
      telefon: '20304050', hent_dato: DAG, hent_tid: '17:30',
      linjer: [{ navn: 'Fiskefilet', antal: 2, pris: 75 }], fyld: [], antal: 2,
      besked: null, status: 'bekraeftet', hvordan: 'spis_her',
      leverings_adresse: null, intern_note: null, slettet: null,
      oprettet: '2026-08-19T10:00:00Z',
    }];
    await åbnKalenderen(page, d);
    await dag(page, DAG).click();

    let kom = false;
    page.on('dialog', (dlg) => { kom = true; dlg.dismiss(); });
    await page.locator('.dag-vej[data-vej="luk_takeaway"] button').click();
    await expect(page.locator('#kvittering')).toContainText('lukket');
    expect(kom, 'der blev advaret om en bestilling, lukningen ikke rammer')
      .toBe(false);
  });
});

/* ============================================================
   GENVEJENE I DAGENS HOVED  (28/8)

   Kundens skærmbilleder har tre knapper: opret en bestilling, luk
   hele dagen, luk flere dage.

   ⚠️ INGEN AF DEM SKRIVER SELV. At tage imod en booking findes på
   Borde-fanen; at leje lokalet ud findes på Baglokalet; at lukke
   en dag er en række i kalenderen. Byggede knapperne deres egne
   skrivninger, ville de samme tabeller have to veje ind — og to
   regelsæt, der langsomt kommer til at sige noget forskelligt.

   De gør det, en genvej skal: de tager dig derhen OG udfylder
   datoen. Det er dét, der er besværligt — ikke at finde fanen,
   men at taste den dag af, man lige stod og kiggede på.
   ============================================================ */
test.describe('Genvejene tager dig derhen med dagen udfyldt', () => {

  /* ⚠️ ORDENE ER KUNDENS EGNE (8/9), IKKE EN FORÆLDET PRØVE.
     Knappen hed "Tag imod et bord" og "⛔ Luk dagen"; hans forlæg
     siger "+ Opret booking denne dag", og hans ord var, at han
     "stadig ik kan oprette booking". Reglerne herunder — folden
     åbner, datoen står i, laget lukker — er urørte. */
  test('et bord: Borde-fanen åbner med datoen i', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();
    await page.getByRole('button', { name: /Opret booking denne dag/ }).click();

    await expect(page.locator('#p-borde')).toBeVisible();
    await expect(page.locator('#dag-lag'), 'laget dækker fanen').toBeHidden();
    await expect(page.locator('#tag-booking')).toHaveAttribute('open', '');
    await expect(page.locator('#nyb-dato')).toHaveValue(DAGEN);
  });

  test('baglokalet: samme vej, samme dato', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();
    await page.getByRole('button', { name: /Lej baglokalet ud/ }).click();

    await expect(page.locator('#p-lokale')).toBeVisible();
    await expect(page.locator('#lokale-tag-booking')).toHaveAttribute('open', '');
    await expect(page.locator('#nyl-dato')).toHaveValue(DAGEN);
  });

  /* ⚠️ DAGENS ENE HANDLING SKAL SE UD SOM EN HANDLING.

     Kunden havde ret i mekanikken hele vejen — den virkede — og
     alligevel kunne han ikke finde den. MÅLT på hans skud: fire
     ENS hvide chips, og den eneste RØDE knap i panelet var
     "Gem noten".

     ⚠️ OG TALLET KOMMER UDEFRA: knappens farve måles mod NOTENS
     farve, to uafhængige elementer på den samme skærm. Et
     spørgsmål til booking-knappen om dens egen baggrund ville
     bestå, også hvis noten var lige så rød — og det var netop
     dét, der var galt. */
  test('booking-knappen er dagens ene røde — noten er stille', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();
    await expect(page.locator('#dag-lag')).toBeVisible();

    const farve = (sel) => page.locator(sel).first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);

    const booking = await page.locator('#dag-panel .dag-hoved-handling').first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const note = await farve('#gem-dag-note');

    expect(booking, 'booking-knappen har en farve').not.toBe('rgba(0, 0, 0, 0)');
    expect(note, 'noten må ikke være den samme røde').not.toBe(booking);

    /* Og de tre andre genveje er stille — ellers er fire røde
       knapper stadig fire ens knapper. */
    const andre = await page.locator('#dag-panel .dag-genveje .knap:not(.dag-hoved-handling)')
      .evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
    expect(andre.length, 'der ER andre genveje at holde op imod').toBeGreaterThan(0);
    andre.forEach((f) => expect(f).not.toBe(booking));
  });

  /* ⚠️ OVERSKRIFTEN OPFINDES IKKE. Lukkedagen står på
     hjemmesiden, og en titel, systemet selv finder på, er en
     besked, ingen har skrevet. Genvejen udfylder datoen og sætter
     markøren i titelfeltet — resten skriver et menneske. */
  test('luk dagen: formularen står klar, men gemmer ikke selv', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();
    await page.getByRole('button', { name: /Luk dagen for bestilling/ }).click();

    await expect(page.locator('#kal-dato')).toHaveValue(DAGEN);
    await expect(page.locator('.type-knap[data-type="lukkedag"]'))
      .toHaveAttribute('aria-pressed', 'true');
    // Der er IKKE oprettet noget endnu.
    const d = await gemteData(page);
    expect((d.kalender || []).filter((k) => k.type === 'lukkedag').length).toBe(0);
    // Og markøren står i titlen, så det næste, man gør, er at skrive den.
    await expect(page.locator('#kal-titel')).toBeFocused();
  });

  test('luk flere dage: slutdatoen er også sat', async ({ page }) => {
    await åbnKalenderen(page, dagenFuld());
    await dag(page, DAGEN).click();
    await page.getByRole('button', { name: /Luk flere dage/ }).click();

    await expect(page.locator('#kal-dato')).toHaveValue(DAGEN);
    await expect(page.locator('#kal-slut')).toHaveValue(DAGEN);
    await expect(page.locator('#kal-slut')).toBeFocused();
  });

  /* En dag, der ALLEREDE er lukket, skal ikke kunne lukkes igen —
     det ville lægge en lukkedag oven i den, der er, og så står
     der to beskeder til gæsten om den samme dag. */
  test('en lukket dag har ingen luk-knap', async ({ page }) => {
    const d = grunddata({
      kalender: [{
        id: 1, lokation_id: 'mosede', type: 'lukkedag', dato: '2026-08-18',
        slut_dato: null, titel: 'Ferie', beskrivelse: null, emoji: null,
        lukker_kl: null, offentlig: true, oprettet: '2026-08-01T10:00:00Z',
      }],
    });
    await åbnKalenderen(page, d);
    await dag(page, '2026-08-18').click();
    expect(await page.getByRole('button', { name: /Luk dagen for bestilling/ }).count()).toBe(0);
    // Men bordet og baglokalet kan man stadig tage imod.
    await expect(page.getByRole('button', { name: /Opret booking denne dag/ })).toBeVisible();
  });
});

/* ============================================================
   KØREPLANEN SAMLER HELE DAGEN  (4/9)
   ------------------------------------------------------------
   Kundens ord: *"overblikket skal vi efter havde gjort så det
   samler alt den dag også hvis der er ude af huset osv og ik kun
   i kalenderen."*

   Køreplanen viste ÉN af de fem slags aftaler: baglokalet. Et
   selskab hos jer, en catering, der skal køres ud, eller
   smørrebrød til fyrre stod ingen steder på den skærm,
   personalet har åben hele dagen — man skulle ind på
   Kalender-fanen og trykke på dagen for at få dem at se.
   ============================================================ */
test.describe('Køreplanen samler hele dagen', () => {

  const IDAG = '2026-08-07';

  function foresp(i, type, status, ekstra) {
    return Object.assign({
      id: i, lokation_id: 'mosede', reference: 'FO260807-' + i,
      slags: type, type: type, navn: 'gæst ' + i, telefon: '2030405' + i,
      email: null, dato: IDAG, antal_personer: 30, besked: null,
      detaljer: {}, status: status, intern_note: null, slettet: null,
      oprettet: '2026-08-01T09:00:00Z',
    }, ekstra || {});
  }

  const aftaler = (page) => page.locator('#plan-aftaler');

  test('et selskab hos os står i køreplanen', async ({ page }) => {
    const d = grunddata({ forespoergsler: [
      foresp(1, 'selskab', 'aftalt', { navn: 'fru hansen',
        antal_personer: 34, detaljer: { hvor: 'hos-jer' } }),
    ] });
    await åbnAdmin(page, { data: d });
    await expect(aftaler(page)).toContainText('Fru Hansen');
    await expect(aftaler(page)).toContainText('Selskab');
    await expect(aftaler(page)).toContainText('34 pers.');
    await expect(aftaler(page)).toContainText('her hos os');
  });

  /* ⚠️ UD AF HUSET ER FORSKELLEN, KØKKENET SKAL VIDE. "Selskab
     til 30" og "catering til 30, der skal køres ud" er to vidt
     forskellige dage. Prøven måler BEGGE veje — uden den anden
     halvdel ville en regel, der skrev "ud af huset" på alt,
     bestå. */
  test('og catering står som ud af huset', async ({ page }) => {
    const d = grunddata({ forespoergsler: [
      foresp(2, 'catering', 'aftalt', { navn: 'havnens revision' }),
    ] });
    await åbnAdmin(page, { data: d });
    await expect(aftaler(page)).toContainText('Catering');
    await expect(aftaler(page)).toContainText('ud af huset');
    await expect(aftaler(page)).not.toContainText('her hos os');
  });

  /* ⚠️ OG DET ER GÆSTENS EGET VALG PÅ ET SELSKAB. Hun svarer
     "hos jer" eller "ud af huset" i formularen, og linjen skal
     følge hendes svar — ikke slagsen. */
  test('et selskab ud af huset siger det', async ({ page }) => {
    const d = grunddata({ forespoergsler: [
      foresp(3, 'selskab', 'aftalt', { navn: 'klubben',
        detaljer: { hvor: 'ud-af-huset' } }),
    ] });
    await åbnAdmin(page, { data: d });
    await expect(aftaler(page)).toContainText('ud af huset');
    await expect(aftaler(page)).not.toContainText('her hos os');
  });

  /* ⚠️ KUN DET AFTALTE. En forespørgsel, der lige er tikket ind
     til i dag, er et SPØRGSMÅL og ikke en aftale. Stod den her,
     ville køreplanen love køkkenet mad, ingen har sagt ja til —
     samme regel som optagne_dage i databasen. */
  test('en NY forespørgsel er ikke en aftale', async ({ page }) => {
    const d = grunddata({ forespoergsler: [
      foresp(4, 'selskab', 'ny', { navn: 'må ikke stå her' }),
    ] });
    await åbnAdmin(page, { data: d });
    /* ⚠️ ignoreCase — OG DET ER IKKE PYNT. Første udgave skrev
       'må ikke stå her' med små bogstaver, mens linjen går
       gennem Admin.pæntNavn og hedder "Må Ikke Stå Her". Prøven
       kunne derfor ALDRIG fejle: den bestod med statusfilteret
       fjernet. Fanget af falsifikationen, ikke af kørslen. */
    await expect(aftaler(page)).not.toContainText('må ikke stå her',
      { ignoreCase: true });
  });

  /* ⚠️ FROKOSTORDNINGEN STÅR IKKE HER. Dens dato er ØNSKET
     START, ikke en dag, der skal laves mad til — der er ingen
     abonnementsmotor (afvist 20/8). Stod den i køreplanen, ville
     den stå der én gang og aldrig igen, og køkkenet ville tro,
     det var dagens levering. */
  test('frokostordningen er ikke dagens arbejde', async ({ page }) => {
    const d = grunddata({ forespoergsler: [
      foresp(5, 'frokost', 'aftalt', { navn: 'heller ikke her' }),
    ] });
    await åbnAdmin(page, { data: d });
    await expect(aftaler(page)).not.toContainText('heller ikke her',
      { ignoreCase: true });
  });

  /* Baglokalet har sin EGEN linje, der siger mere (lejet ud mod
     aftalt) — og må derfor ikke også stå som en aftale. To linjer
     for den samme dag er den dublet, resten af huset advarer mod. */
  test('baglokalet står ét sted, ikke to', async ({ page }) => {
    const d = grunddata({ forespoergsler: [
      foresp(6, 'baglokale', 'aftalt', { navn: 'anna vind' }),
    ] });
    await åbnAdmin(page, { data: d });
    await expect(page.locator('#plan-lejet')).toContainText('Anna Vind');
    await expect(aftaler(page)).not.toContainText('Anna Vind');
  });

  test('dagens arrangement står med sit klokkeslæt', async ({ page }) => {
    const d = grunddata({ kalender: [{
      id: 90, lokation_id: 'mosede', type: 'arrangement', dato: IDAG,
      slut_dato: null, titel: 'Live musik på molen', beskrivelse: null,
      emoji: null, lukker_kl: null, offentlig: true, start_kl: '19:00',
      oprettet: '2026-08-01T10:00:00Z',
    }] });
    await åbnAdmin(page, { data: d });
    await expect(aftaler(page)).toContainText('Live musik på molen');
    /* ⚠️ PUNKTUM, IKKE KOLON — husets format, se noten i
       js/bord.js. */
    await expect(aftaler(page)).toContainText('kl. 19.00');
  });

  /* ⚠️ NOTEN TIL DAGEN ER IKKE ET ARRANGEMENT. Den bor i
     kalenderen som en intern arrangement-række med titlen "Note
     til dagen" — og den har sit EGET felt nedenfor i det samme
     kort. Stod den også som en aftale, ville personalets egen
     seddel stå to gange på den samme skærm.

     Kendingen bor ét sted (Admin.erNote i js/admin/kalender.js);
     en kopi ville betyde, at et skift i titlen gjorde alle
     skrevne noter til arrangementer på den ene skærm. */
  test('noten til dagen står ikke som et arrangement', async ({ page }) => {
    const d = grunddata({ kalender: [{
      id: 91, lokation_id: 'mosede', type: 'arrangement', dato: IDAG,
      slut_dato: null, titel: 'Note til dagen',
      beskrivelse: 'Kun to på arbejde', emoji: null, lukker_kl: null,
      offentlig: false, start_kl: null, oprettet: '2026-08-01T10:00:00Z',
    }] });
    await åbnAdmin(page, { data: d });
    await expect(aftaler(page)).not.toContainText('Note til dagen');
    // Men den STÅR i sit eget felt — ellers måler prøven ingenting.
    await expect(page.locator('#plan-note-felt')).toHaveValue('Kun to på arbejde');
  });

  /* ⚠️ OG EN AFTALE I MORGEN ER IKKE I DAG. Uden den her ville en
     regel, der glemte datoen, bestå på alle de andre prøver. */
  test('en aftale i morgen står ikke i dag', async ({ page }) => {
    const d = grunddata({ forespoergsler: [
      foresp(7, 'selskab', 'aftalt', { navn: 'i morgen',
        dato: '2026-08-08', detaljer: { hvor: 'hos-jer' } }),
    ] });
    await åbnAdmin(page, { data: d });
    await expect(aftaler(page)).not.toContainText('i morgen',
      { ignoreCase: true });
  });
});

/* ============================================================
   PROGRAMLINJEN SIGER, HVAD DET ER — OG KAN TRYKKES  (7/9)

   Kundens ord med et skud af netop den linje: *"gør så man kan
   klikke ind på tingene som fortæller hvad det er eller skal den
   dag, fx her med event."*

   MÅLT på hans skærm to ting:

   1) Et offentligt arrangement stod som "📅 havne" og INTET
      andet. Hverken klokkeslæt, tilmelding, pladser, pris eller
      beskrivelse — `under` blev kun brugt til at sige "kun her".
   2) Og pilen stod på x = 1835 i en linje, hvis tekst begynder
      på 92. Man trykker på navnet, ikke på en pil halvanden
      meter væk.

   ⚠️ OG MÅLINGEN FANDT EN TREDJE, INGEN LEDTE EFTER: linjen
   læste `k.tid_fra`, og den kolonne findes IKKE i tabellen
   `kalender`. Hvert arrangement har derfor stået med "—" i
   stedet for sit klokkeslæt, siden køreplanen blev bygget.
   ============================================================ */
test.describe('Dagens program: linjen fortæller og kan trykkes', () => {

  const ARR_DAG = '2026-08-12';

  function medArrangement(o) {
    return grunddata({
      kalender: [Object.assign({
        id: 9, lokation_id: 'mosede', type: 'arrangement', titel: 'Havnefest',
        dato: ARR_DAG, slut_dato: null,
        beskrivelse: 'Fællesspisning med levende musik.',
        offentlig: true, tilmelding: true, pladser: 40,
        pris_tekst: '150 kr. pr. person', start_kl: '18:00',
        oprettet: '2026-08-01T10:00:00Z',
      }, o)],
      reservationer: [{
        id: 1, lokation_id: 'mosede', reference: 'RE-A', kalender_id: 9,
        navn: 'Anna Vind', telefon: '20304050', email: null,
        antal_personer: 4, besked: null, status: 'ny', intern_note: null,
        oprettet: '2026-08-02T10:00:00Z',
      }],
    });
  }

  async function åbnArrangementsdagen(page, data) {
    await åbnAdmin(page, { data: data || medArrangement() });
    await visFane(page, 'p-kalender');
    await dag(page, ARR_DAG).click();
    await expect(page.locator('#dag-lag')).toBeVisible();
    return page.locator('#dag-panel .prog-linje', { hasText: 'Havnefest' }).first();
  }

  test('arrangementets linje siger tid, pladser, pris og hvad det er', async ({ page }) => {
    const linje = await åbnArrangementsdagen(page);
    /* ⚠️ PLADSTALLET KOMMER FRA Admin.pladserTaget — den SAMME
       regel som Tilmeldinger-fanen — og reservationen i fiksturet
       er på 4 personer. Tallet er altså udefra: skrev linjen sit
       eget, ville de to skærme sige hver sit. */
    await expect(linje).toContainText('4 af 40 pladser');
    await expect(linje).toContainText('150 kr. pr. person');
    await expect(linje).toContainText('Fællesspisning med levende musik');
    /* ⚠️ OG KLOKKESLÆTTET. Kolonnen hedder start_kl; linjen læste
       k.tid_fra, som ikke findes, så her stod "—". */
    await expect(linje.locator('.prog-tid')).toHaveText('18:00');
  });

  /* Modstykket: uden tilmelding er der ingen pladser at love, og
     så skal linjen sige DET — ikke bare mangle noget. */
  test('uden tilmelding siger den "kig forbi"', async ({ page }) => {
    const linje = await åbnArrangementsdagen(page,
      medArrangement({ tilmelding: false, pladser: null, pris_tekst: null }));
    await expect(linje).toContainText('kig forbi');
    await expect(linje).not.toContainText('pladser');
  });

  /* ⚠️ HELE LINJEN ER KNAPPEN, IKKE PILEN — og prøven spørger
     BROWSEREN, hvad et tryk midt på navnet rammer. Et spørgsmål
     til linjen om dens eget role="button" ville bestå, også hvis
     noget lå oven på den. */
  test('et tryk midt på navnet åbner tilmeldingerne', async ({ page }) => {
    const linje = await åbnArrangementsdagen(page);

    /* ⚠️ RUL DERHEN FØRST (9/9). `elementFromPoint` arbejder i
       SKÆRMENS koordinater og svarer null for alt uden for
       viewporten — så da dagens styring flyttede op over
       programmet, lå linjen under folden i dialogen, og prøven
       faldt med "INTET" på begge profiler. Det så ud som om
       noget lå oven på linjen; den var bare ikke på skærmen.
       Reglen er urørt — den måler stadig, at intet dækker
       linjen — den måler den bare dér, hvor en finger ville
       finde den. */
    await linje.locator('.prog-navn').scrollIntoViewIfNeeded();
    const svar = await linje.locator('.prog-navn').evaluate((el) => {
      const r = el.getBoundingClientRect();
      const t = document.elementFromPoint(r.left + 20, r.top + r.height / 2);
      const linje = el.closest('.prog-linje');
      return {
        rammer: t ? t.tagName + '.' + String(t.className).slice(0, 30) : 'INTET',
        iLinjen: !!t && !!linje && linje.contains(t),
        /* ⚠️ INGEN KNAP INDE I KNAPPEN. Et <button> i et
           role="button" er ugyldig opmærkning, og browseren river
           dem fra hinanden. */
        indreKnapper: linje ? linje.querySelectorAll('button').length : -1,
        rolle: linje ? linje.getAttribute('role') : null,
      };
    });
    expect(svar.iLinjen, 'noget ligger oven på linjen: ' + svar.rammer).toBe(true);
    expect(svar.rolle).toBe('button');
    expect(svar.indreKnapper, 'der er en knap inde i knappen').toBe(0);

    await linje.locator('.prog-navn').click();
    await expect(page.locator('#dag-lag')).toBeHidden();
    await expect(page.locator('#p-tilmeldinger')).toBeVisible();
    /* Og den lander på DET arrangement — ikke bare på fanen. */
    await expect(page.locator('#tilmeld-titel')).toHaveText('Havnefest');
  });

  /* Rammerne — "Køkkenet åbner", "Sidste bestilling" — er ikke
     sager, og de fører ingen steder hen. En linje, der ser ud
     som en knap og ikke er det, er værre end en, der ikke gør. */
  test('men rammerne om dagen er ikke knapper', async ({ page }) => {
    await åbnArrangementsdagen(page);
    const ramme = page.locator('#dag-panel .prog-linje', { hasText: 'Køkkenet åbner' });
    await expect(ramme).toHaveCount(1);
    await expect(ramme).not.toHaveAttribute('role', 'button');
  });
});

/* ============================================================
   DAGENS LAG SKAL KUNNE BRUGES OG FORLADES  (7/9)

   Kundens ord: "når jeg trykker på kalenderen kan jeg ikke åbne
   dagen i den der menu hvor jeg kan oprette bookinger og tingene
   ... altså hele admin er elendig og fungerer ikke."

   MÅLT på en iPhone 13 med ejerens EGNE data (hentet fra
   produktionen med anon-nøglen), og det var tre fejl på én gang:

   1) Bundbjælken stod på z-index 40 og laget på 200 — så laget
      dækkede den. Men baren har `backdrop-filter`, og den blev
      derfor tegnet som en lys stribe under lagets slør: den så
      LEVENDE ud og var DØD. Et elementFromPoint midt på "Mere"
      svarede `P.hjaelp` inde i dagspanelet. Alle fem faner.
   2) ✕ rullede væk med panelet. Med ejerens data er kortet
      1797 px højt på en skærm på 844; efter 900 px rulning stod
      ✕ på y = −848. Med baren død var der da INGEN vej ud.
   3) Og kvitteringen stod på z-index 60 under laget, så et gem
      inde i panelet svarede med et "✓ Gemt", ingen kunne se.

   Prøverne måler det, BROWSEREN gør — elementFromPoint — og ikke
   hvad koden siger om sig selv. Et spørgsmål til reglerne om
   deres egne z-index ville bestå, også hvis en fjerde regel
   længere nede i arket vandt på rækkefølgen. Præcis dét skete
   under rettelsen: `body.lag-aabent .bundbar` vejer det samme
   som barens egne regler, og glasreglen nedenfor vandt.
   ============================================================ */
/* ============================================================
   DEN SAMME BOOKING MÅ IKKE STÅ TO GANGE  (8/9)
   ------------------------------------------------------------
   Kundens skud af DAGENS PROGRAM:

       — 🔑 Baglokalet: Mikkel Sten Gersel · 30 pers.
       — 💬 Mikkel Sten Gersel — baglokale · 30 pers.

   Det ER én aftale. "Book lokalet til dem" opretter udlejningen
   OG sætter forespørgslen til aftalt, så begge rækker findes
   bagefter med vilje — men på dagens program læses de to linjer
   som to selskaber, og køkkenet laver mad til tres.

   Det er 29/8-arret igen ("et skud af dagens panel viste den
   samme booking TO gange"), og kunden så det før os.
   ============================================================ */
test.describe('En booking, der er sagt ja til, står én gang', () => {

  const BL_DAG = '2026-08-12';

  /* laast: har udlejningen en note, der nævner forespørgslens
     reference, ER de to det samme forløb. */
  function medBaglokale(laast) {
    const f = {
      id: 1, lokation_id: 'mosede', reference: 'FO260812-BBBBB',
      type: 'baglokale', slags: 'baglokale', navn: 'Mikkel Sten Gersel',
      telefon: '20304050', email: null, dato: BL_DAG, antal_personer: 30,
      besked: null, status: laast ? 'aftalt' : 'ny', intern_note: null,
      detaljer: null, oprettet: '2026-08-01T10:00:00Z',
    };
    const u = {
      id: 1, lokation_id: 'mosede', reference: 'BL260812-BBBBB',
      navn: 'Mikkel Sten Gersel', telefon: '20304050', email: null,
      dato: BL_DAG, antal_personer: 30, besked: null, status: 'bekraeftet',
      intern_note: 'Aftalt i telefonen ud fra FO260812-BBBBB.',
      oprettet: '2026-08-01T11:00:00Z',
    };
    return grunddata({
      forespoergsler: [f],
      udlejninger: laast ? [u] : [],
    });
  }

  async function åbnDagen(page, data) {
    await åbnAdmin(page, { data });
    await visFane(page, 'p-kalender');
    await dag(page, BL_DAG).click();
    await expect(page.locator('#dag-lag')).toBeVisible();
  }

  test('er lokalet booket, står Mikkel én gang og ikke to', async ({ page }) => {
    await åbnDagen(page, medBaglokale(true));
    const linjer = page.locator('#dag-panel .prog-linje', { hasText: 'Mikkel Sten Gersel' });
    await expect(linjer).toHaveCount(1);
    /* Og den, der bliver, er UDLEJNINGEN — det er den, der
       faktisk låser dagen. Stod forespørgslen tilbage i stedet,
       ville programmet vise et spørgsmål, hvor der er en aftale. */
    await expect(linjer.first()).toContainText('Baglokalet');
  });

  /* ⚠️ MODSTYKKET, OG UDEN DET MÅLER DEN FØRSTE INGENTING: en
     regel, der bare skjulte hver eneste baglokale-forespørgsel,
     ville bestå prøven ovenfor — og så forsvandt netop den sag,
     ingen har svaret på endnu, fra dagens program. */
  test('uden en udlejning bag bliver forespørgslen stående', async ({ page }) => {
    await åbnDagen(page, medBaglokale(false));
    const linjer = page.locator('#dag-panel .prog-linje', { hasText: 'Mikkel Sten Gersel' });
    await expect(linjer).toHaveCount(1);
    await expect(linjer.first()).toContainText('venter på svar');
  });
});

test.describe('Dagens lag: kan bruges og kan forlades', () => {

  async function åbnDagen(page) {
    await åbnAdmin(page, { data: dagenFuld() });
    await visFane(page, 'p-kalender');
    await dag(page, DAGEN).click();
    await expect(page.locator('#dag-lag')).toBeVisible();
  }

  /* ⚠️ REGLEN ER "IKKE PÅ SKÆRMEN", IKKE "KAN IKKE TRYKKES" —
     og den forskel fandt falsifikationen.

     Første udgave spurgte, hvad et elementFromPoint midt på
     "Mere" rammer. Den bestod med rettelsen FJERNET, og med god
     grund: laget ligger på z-index 200 og baren på 40, så
     lagets eget slør har ALTID svaret på det punkt. Baren har
     aldrig kunnet trykkes, mens laget er åbent.

     Fejlen er, at den var SYNLIG: baren har backdrop-filter og
     blev tegnet som en lys stribe med fem fane-navne under
     sløret — den så levende ud, og personalet trykkede på den.
     Derfor måles KASSEN: et element uden kasse kan ikke tegnes.
     Og tallet kommer udefra — baren skal HAVE en kasse, mens
     laget er lukket, ellers måler prøven ingenting. */
  test('bundbjælken er ude af skærmen, når dagens lag er åbent', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'bundbjælken findes kun under 900 px');

    await åbnAdmin(page, { data: dagenFuld() });
    await visFane(page, 'p-kalender');

    const maal = () => page.evaluate(() => {
      const bar = document.getElementById('bundbar');
      if (!bar) return { findes: false };
      const r = bar.getBoundingClientRect();
      const knap = document.getElementById('bb-mere');
      const kr = knap ? knap.getBoundingClientRect() : null;
      return {
        findes: true,
        hoejde: Math.round(r.height),
        knapHoejde: kr ? Math.round(kr.height) : 0,
        display: getComputedStyle(bar).display,
      };
    });

    const lukket = await maal();
    expect(lukket.findes, 'bundbjælken findes slet ikke på profilen').toBe(true);
    expect(lukket.hoejde, 'baren har ingen kasse, FØR laget åbnes — '
      + 'prøven kan ikke måle, at den forsvinder').toBeGreaterThan(40);
    expect(lukket.knapHoejde).toBeGreaterThan(40);

    await dag(page, DAGEN).click();
    await expect(page.locator('#dag-lag')).toBeVisible();

    const aabent = await maal();
    expect(aabent.hoejde,
      'bundbjælken står stadig på skærmen bag lagets slør (display: '
      + aabent.display + ') — den ser levende ud og kan ikke trykkes')
      .toBe(0);

    /* Den anden halvdel: baren kommer igen, når dagen lukkes.
       En regel, der skjulte den for altid, ville bestå ovenfor. */
    await page.keyboard.press('Escape');
    await expect(page.locator('#dag-lag')).toBeHidden();
    expect((await maal()).hoejde,
      'bundbjælken kom ikke tilbage, da dagen blev lukket')
      .toBeGreaterThan(40);
  });

  test('✕ bliver på skærmen, når dagens panel rulles', async ({ page }) => {
    await åbnDagen(page);

    /* Rulningen er panelets egen højde, ikke et tal, jeg har
       skrevet af — og prøven kræver, at der FAKTISK blev rullet.
       Uden det ville den bestå på et panel, der er kortere end
       skærmen, og reglen ville aldrig blive prøvet. */
    const rullet = await page.evaluate(() => {
      const lag = document.getElementById('dag-lag');
      lag.scrollTop = lag.scrollHeight;
      return lag.scrollTop;
    });
    expect(rullet, 'panelet kunne slet ikke rulles — prøven måler intet')
      .toBeGreaterThan(200);

    const svar = await page.locator('#dag-panel .dag-luk').evaluate((el) => {
      const r = el.getBoundingClientRect();
      const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        y: Math.round(r.top),
        skaerm: window.innerHeight,
        rammer: t ? t.tagName + '.' + String(t.className).slice(0, 30) : 'INTET',
        erKnappen: !!t && (t === el || el.contains(t)),
      };
    });

    expect(svar.erKnappen,
      '✕ kan ikke trykkes efter rulning (y=' + svar.y + ', skærm='
      + svar.skaerm + ', ramte ' + svar.rammer + ')').toBe(true);
  });

  /* ⚠️ GENVEJEN GJORDE DET HELE — OG SÅ UD SOM INGENTING (7/9).

     MÅLT på en iPhone 13 med ejerens egne data: "🍽️ Tag imod et
     bord" åbnede Borde-fanen, foldede formularen ud, skrev dagen
     i datofeltet og satte markøren i navnefeltet. Datofeltet lå
     bare på y = 835 på en skærm på 844. Personalet ser toppen af
     Borde-fanen og tror, at knappen ikke gjorde noget.

     Prøven måler TO uafhængige ting: at folden er på skærmen, og
     at datoen ER dagen, man trykkede på. Et spørgsmål om
     rulningen alene ville bestå på en genvej, der landede det
     rigtige sted med det forkerte i felterne — og omvendt. */
  for (const [ord, fane, foldId, datoId] of [
    ['Opret booking denne dag', 'p-borde', 'tag-booking', 'nyb-dato'],
    ['Lej baglokalet ud', 'p-lokale', 'lokale-tag-booking', 'nyl-dato'],
  ]) {
    test('genvejen "' + ord + '" lander på formularen, ikke over den', async ({ page }) => {
      await åbnDagen(page);
      await page.locator('#dag-panel .dag-genveje button', { hasText: ord })
        .first().click();
      await expect(page.locator('#dag-lag')).toBeHidden();
      await expect(page.locator('#' + fane)).toBeVisible();

      // Smooth rulning skal have lov at lande.
      await expect.poll(async () => page.evaluate((id) => {
        const f = document.getElementById(id);
        if (!f) return -1;
        return Math.round(f.getBoundingClientRect().top);
      }, foldId), { timeout: 4000 }).toBeLessThan(200);

      const svar = await page.evaluate(([foldId, datoId]) => {
        const f = document.getElementById(foldId);
        const d = document.getElementById(datoId);
        const fr = f ? f.getBoundingClientRect() : null;
        const dr = d ? d.getBoundingClientRect() : null;
        return {
          foldAaben: f ? f.open : false,
          foldTop: fr ? Math.round(fr.top) : -1,
          datoTop: dr ? Math.round(dr.top) : -1,
          datoBund: dr ? Math.round(dr.bottom) : -1,
          dato: d ? d.value : '',
          skaerm: window.innerHeight,
        };
      }, [foldId, datoId]);

      expect(svar.foldAaben, 'folden er ikke foldet ud').toBe(true);
      expect(svar.dato, 'datofeltet bærer ikke den dag, der blev trykket på')
        .toBe(DAGEN);
      expect(svar.datoBund,
        'datofeltet ligger under folden (y=' + svar.datoTop + ', skærm='
        + svar.skaerm + ') — skærmen skiftede, uden at man kan se det')
        .toBeLessThanOrEqual(svar.skaerm);
      expect(svar.foldTop,
        'foldens overskrift er rullet af skærmen foroven').toBeGreaterThan(-40);
    });
  }

  /* Panelet er fuldt af felter, der gemmer — noten, tiderne,
     beskeden til gæsterne. Kvitteringen er hele svaret på "kom
     det med?", og den må aldrig kunne dækkes af det lag, knappen
     står i. */
  test('kvitteringen kan ses oven på dagens lag', async ({ page }) => {
    await åbnDagen(page);
    await page.evaluate(() => window.Admin.kvitter('✓ Gemt'));

    const svar = await page.locator('#kvittering').evaluate((el) => {
      const r = el.getBoundingClientRect();
      const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        synlig: !!(r.width && r.height),
        rammer: t ? t.tagName + '#' + t.id + '.' + String(t.className).slice(0, 30) : 'INTET',
        erKvitteringen: !!t && (t === el || el.contains(t)),
      };
    });

    expect(svar.synlig, 'kvitteringen har ingen kasse').toBe(true);
    expect(svar.erKvitteringen,
      'kvitteringen ligger bag dagens lag — der ramtes ' + svar.rammer).toBe(true);
  });
});

/* ============================================================
   BORDKORTET FÅR HUSETS FORM  (8/9)
   ------------------------------------------------------------
   Kundens skærmbillede viste TRE knapper i træk — ✓ Ankommet,
   Udeblev, Afvis — alle tre i husets røde. Koden siger
   'knap primaer gron' på Ankommet, men `.knap.gron` fandtes KUN
   scopet til `.vagt-handling` (Overblik) og `.bestil-handling`
   (Bestillinger), og bordkortets række lå i ingen af dem. Så
   arvede den husets røde gradient.

   Bestillingskortet fik "ét skridt frem, resten bag ···" 31/8 og
   forespørgselskortet 8/9. Bordkortet fik den aldrig.
   ============================================================ */
test.describe('Bordkortet: ét skridt frem, resten bag døren', () => {

  function medBooking(status) {
    const d = grunddata();
    d.bordbestillinger = [{
      id: 71, nummer: 71, reference: 'BO-PROEVE', lokation_id: 'mosede',
      navn: 'anna vind', telefon: '20304050', email: null,
      dato: '2026-08-07', tid: '18:00:00', antal_personer: 4,
      status: status || 'ny', besked: null, intern_note: null,
      slettet: null, oprettet: '2026-08-07T10:00:00Z',
    }];
    return d;
  }

  async function kortet(page, status) {
    await åbnAdmin(page, { data: medBooking(status) });
    await visFane(page, 'p-borde');
    return page.locator('#borde-venter .bestil-kort, #borde-faerdige-kort .bestil-kort').first();
  }

  /* ⚠️ PRØVEN TÆLLER DE SYNLIGE KNAPPER, ikke knapperne i DOM'en.
     Ingenting er fjernet — Udeblev og Afvis ligger bag døren, og
     et spørgsmål til DOM'en ville derfor bestå, også hvis alle
     tre stod frem. */
  test('en ny booking har ÉN synlig handling', async ({ page }) => {
    const k = await kortet(page, 'ny');
    const raekke = k.locator('.knap-raekke');
    await expect(raekke.locator('.knap:visible')).toHaveCount(1);
    await expect(raekke.locator('.knap:visible')).toContainText('Ankommet');
    // og døren er der, fordi der ER noget bag den
    await expect(k.locator('.knap-mere')).toHaveCount(1);
  });

  test('Udeblev og Afvis ligger bag ···', async ({ page }) => {
    const k = await kortet(page, 'ny');
    await expect(k.locator('.bestil-mere')).toContainText('Udeblev');
    await expect(k.locator('.bestil-mere')).toContainText('Afvis');
    await expect(k.locator('.bestil-mere .knap').first()).not.toBeVisible();
    await k.locator('.knap-mere').click();
    await expect(k.locator('.bestil-mere .knap').first()).toBeVisible();
  });

  /* ⚠️ OG DEN GRØNNE SKAL VÆRE GRØN. Det var den halvdel, kunden
     SÅ: tre knapper i den samme røde. Prøven måler den BEREGNEDE
     farve — en klasse, der ikke slår igennem, er ingen regel —
     og den sammenligner med bestillingskortets egen grønne, så
     tallet kommer fra den anden skærm og ikke fra CSS'en. */
  test('✓ Ankommet er grøn, ikke rød', async ({ page }) => {
    const k = await kortet(page, 'ny');
    const farve = await k.locator('.knap-raekke .knap:visible').first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(farve, 'Ankommet er ikke grøn').toMatch(/47, 138, 91|rgb\(3[0-9], 1[0-9][0-9]/);
    expect(farve, 'Ankommet står i husets røde').not.toContain('214, 42, 58');
  });

  /* Et FÆRDIGT kort har ikke et skridt frem — så er Gendan den
     ene handling, og Slet ligger bag døren (samme regel som
     bestillingskortet fik 1/9). */
  test('en ankommet booking har Gendan fremme og Slet bag døren',
    async ({ page }) => {
    await åbnAdmin(page, { data: medBooking('bekraeftet') });
    await visFane(page, 'p-borde');
    /* ⚠️ FOLDEN SKAL ÅBNES FØRST — den vej personalet går. En
       ankommet booking ligger i "Færdige", som er et lukket
       <details>, og et skjult kort har ingen synlige knapper:
       prøven målte 0 og lignede en fejl i koden. Det er samme
       lære som aabnMere() (31/8) og visFane() (30/8): gå den vej,
       et menneske går, så er prøven samtidig en prøve på, at
       vejen findes. */
    await page.locator('#borde-faerdige-kort summary').click();
    const k = page.locator('#borde-faerdige-kort .bestil-kort').first();
    await expect(k.locator('.knap-raekke .knap:visible')).toHaveCount(1);
    await expect(k.locator('.knap-raekke .knap:visible')).toContainText('Gendan');
    await expect(k.locator('.bestil-mere')).toContainText('Slet');
  });
});
