/* ============================================================
   ALLERGIEN HAR SIT EGET FELT — OG SIT EGET JA
   ------------------------------------------------------------
   Kundens ord (10/9): *"vi skal have de tre, der man SKAL have
   for at måtte modtage mail og telefonnummer og navn."*

   ⚠️ MÅLT FØR: SEKS formularer bad om allergier i en pladsholder
   ("Fx allergier eller særlige ønsker"), og ÉN havde samtykket —
   den ved bordet. Vi inviterede altså til en helbredsoplysning
   fem steder uden at spørge om lov, og køkkenet skulle finde den
   midt i en sætning.

   En allergi er en oplysning efter artikel 9, og dér er "vi har
   en aftale" ikke hjemmel nok: stk. 2, litra a kræver et
   UDTRYKKELIGT samtykke.

   ⚠️ OG NAVN, TELEFON OG MAIL ER IKKE HERINDE. De hviler på
   artikel 6, stk. 1, litra b, og et flueben dér ville love
   gæsten, at hun kan trække nummeret tilbage og stadig få sin
   mad. Se `tests/jura-ved-send.spec.js`.

   ⚠️ REGLEN BOR ÉT STED: `Butik.allergiMangler` +
   `Butik.medAllergi`. Prøven måler den gennem SKÆRMEN og ikke
   ved at kalde den — et spørgsmål til funktionen ville bestå,
   også hvis ingen formular spurgte den.
   ============================================================ */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { åbnSkal, grunddata, gemteData } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';
const ROD = path.resolve(__dirname, '..');

function data() {
  const d = grunddata();
  d.indstillinger.bestilling_varsel_timer = 2;
  d.indstillinger.bestilbare_kategorier = [1, 9];
  return d;
}

async function åbnForsiden(page) {
  await åbnSkal(page, '/index.html', { ur: FREDAG, data: data() });
}

async function laegIKurven(page) {
  await page.locator('[data-kategori="Smørrebrød"]').click();
  await page.locator('[data-vare="Flæskestegssandwich"] button[data-d="+"]').click();
}

async function udfyld(page) {
  await page.locator('#navn').fill('Sara Poulsen');
  await page.locator('#tlf').fill('28871343');
  await page.locator('#tid').selectOption({ index: 1 });
}

test.describe('Allergien har sit eget felt', () => {

  /* ⚠️ PLADSHOLDEREN MÅ IKKE INVITERE TIL DET LÆNGERE. Så længe
     beskedfeltet siger "Fx allergier …", beder vi om en
     helbredsoplysning uden et sted at sige ja — uanset hvad der
     ellers står på siden. Læses af MAPPEN, så en ny formular
     ikke kan slippe forbi. */
  test('ingen formular inviterer til allergier i et beskedfelt', () => {
    /* ⚠️ OGSÅ UNDERMAPPERNE (16/9, MÅLT).

       Her stod `fs.readdirSync(ROD)` — altså KUN rodens filer —
       mens kommentaren ovenfor lovede, at den læste "af MAPPEN, så
       en ny formular ikke kan slippe forbi". De tre vigtigste
       bestillingsformularer ligger i undermapper (bestil/, bord/,
       ved-bordet/) og er derfor ALDRIG blevet set af prøven.

       Målt: bestil/index.html:371 har ordret
       `placeholder="Fx allergier eller særlige ønsker"` — præcis
       det, prøven findes for at forhindre — og prøven meldte
       grønt hele vejen. En prøve, der lover mere, end den måler,
       er farligere end ingen prøve: den næste tror, dækningen er
       der. */
    const mapper = ['', 'bestil', 'bord', 'ved-bordet'];
    const filer = [];
    mapper.forEach((m) => {
      const sti = m ? path.join(ROD, m) : ROD;
      if (!fs.existsSync(sti)) return;
      fs.readdirSync(sti)
        .filter((f) => f.endsWith('.html'))
        .filter((f) => !/^google[a-z0-9]+\.html$/.test(f))
        .forEach((f) => filer.push(m ? m + '/' + f : f));
    });
    const synder = [];
    filer.forEach((f) => {
      const s = fs.readFileSync(path.join(ROD, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      /* Kun PLADSHOLDERE — en overskrift eller en etiket, der
         hedder "Allergi", er netop det rigtige. */
      const m = s.match(/placeholder="[^"]*allergi[^"]*"/gi) || [];
      /* ⚠️ TO UNDTAGELSER, HVER MED SIN GRUND — en liste uden
         grunde vokser, til prøven måler ingenting.

         · `h-catering.html` sender via gæstens EGET mailprogram
           (4/9). Dér kan der ikke sættes et flueben, og vi gemmer
           ingenting, før hun selv trykker send i sin mail.
         · `admin.html` er personalesiden. Feltet er notefeltet på
           den manuelle booking, og den, der taster, er PERSONALET
           — oplysningen er allerede givet i telefonen. Gæsten har
           ikke en skærm at samtykke på dér. Siden er `noindex` og
           bag et login. */
      const undtaget = f === 'h-catering.html' || f === 'admin.html';
      if (m.length && !undtaget) synder.push(f + ': ' + m[0]);
    });
    expect(synder, 'beskedfelter, der beder om allergier').toEqual([]);
  });

  /* ============================================================
     OG SMØRREBRØDSSIDEN bestil/ SKAL HAVE DET SAMME  (16/9)
     ------------------------------------------------------------
     MÅLT: bestil/ havde INTET allergifelt — men beskedfeltets
     pladsholder sagde "Fx allergier eller særlige ønsker". Gæsten
     blev altså inviteret til en helbredsoplysning i en fri tekst,
     uden et sted at sige ja.

     Og værre på køkkenets skærm: den slår kun rødt op på ordet
     ALLERGI:, som Butik.medAllergi kun sætter foran, når der kom
     noget fra et RIGTIGT felt. En gæst, der skrev "Nøddeallergi!!"
     i beskeden, blev en helt almindelig note.

     ⚠️ SIDEN DELER js/bestilling.js MED ved-bordet/. Koden leder
     efter #bestil-allergi og #allergi-samtykke — de findes bare
     kun i den ene sides opmærkning. Derfor måler prøven her
     SKÆRMEN og ikke funktionen: et spørgsmål til koden ville
     bestå, netop fordi koden var i orden hele tiden.
     ============================================================ */
  test('bestil/ har et rigtigt allergifelt — ikke kun en pladsholder', async ({ page }) => {
    await åbnSkal(page, '/bestil/', { ur: FREDAG, data: data() });
    await expect(page.locator('#bestil-allergi')).toHaveCount(1);
    /* Modstykket: beskedfeltet må ikke længere invitere til det,
       feltet ovenfor nu spørger om. */
    await expect(page.locator('#bestil-besked-felt'))
      .not.toHaveAttribute('placeholder', /allergi/i);
  });

  test('bestil/: fluebenet dukker op, når der skrives en allergi', async ({ page }) => {
    await åbnSkal(page, '/bestil/', { ur: FREDAG, data: data() });
    const linje = page.locator('#allergi-samtykke-linje');
    await expect(linje).toBeHidden();
    await page.locator('#bestil-allergi').fill('nødder');
    await expect(linje).toBeVisible();
    /* Og det nulstilles igen — ellers stod et gammelt ja og gjaldt
       en allergi, gæsten havde slettet. */
    await page.locator('#bestil-allergi').fill('');
    await expect(linje).toBeHidden();
  });

  test('fluebenet findes kun, når der ER skrevet en allergi', async ({ page }) => {
    await åbnForsiden(page);
    const linje = page.locator('#allergi-samtykke-linje');
    await expect(linje).toBeHidden();

    await page.locator('#allergi').fill('nødder');
    await expect(linje).toBeVisible();

    /* ⚠️ OG HAKKET RYDDES, NÅR FELTET TØMMES. Ellers står der et
       ja til en allergi, gæsten har slettet. */
    await page.locator('#allergi-samtykke').check();
    await page.locator('#allergi').fill('');
    await expect(linje).toBeHidden();
    expect(await page.locator('#allergi-samtykke').isChecked()).toBe(false);
  });

  test('en allergi uden flueben bliver ikke sendt', async ({ page }) => {
    await åbnForsiden(page);
    await laegIKurven(page);
    await udfyld(page);
    await page.locator('#allergi').fill('nødder');
    await page.locator('button.g.solid.blk').first().click();

    /* Den skal STOPPES — og siden skal sige hvorfor. */
    const gemt = await gemteData(page);
    expect(gemt.bestillinger || []).toHaveLength(0);
    await expect(page.locator('#bestil')).toContainText(/flueben/i);
  });

  test('med fluebenet går den igennem — og allergien står forrest', async ({ page }) => {
    await åbnForsiden(page);
    await laegIKurven(page);
    await udfyld(page);
    await page.locator('#allergi').fill('nødder');
    await page.locator('#allergi-samtykke').check();
    await page.locator('button.g.solid.blk').first().click();

    await expect(page.locator('#bestil .panel h3')).toContainText('Tak, Sara');
    const gemt = await gemteData(page);
    expect(gemt.bestillinger).toHaveLength(1);
    /* Køkkenet skal kunne SKIMME efter ordet, ikke lede. */
    expect(gemt.bestillinger[0].besked).toMatch(/^ALLERGI: nødder/);
  });

  /* ⚠️ MODSTYKKET, OG DET ER DET VIGTIGSTE AF DE FIRE. Uden det
     ville en regel, der spærrede for HVER bestilling, bestå
     prøven ovenfor — og et samtykke, man ikke kan komme udenom,
     er ikke frivilligt og dermed ugyldigt. */
  test('uden en allergi spærrer ingenting', async ({ page }) => {
    await åbnForsiden(page);
    await laegIKurven(page);
    await udfyld(page);
    await page.locator('button.g.solid.blk').first().click();

    await expect(page.locator('#bestil .panel h3')).toContainText('Tak, Sara');
    const gemt = await gemteData(page);
    expect(gemt.bestillinger).toHaveLength(1);
    expect(gemt.bestillinger[0].besked || '').not.toMatch(/ALLERGI/);
  });
});

/* ============================================================
   ET ALLERGIFELT, INGEN LÆSER, ER VÆRRE END INGEN  (21/9)
   ------------------------------------------------------------
   16/9 blev frokostsidens #fallergi fundet: feltet stod på
   siden, samtykkelinjen lå med klassen `skjult`, og ordet
   "allergi" optrådte NUL gange i js/skal/forespoergsel.js. Et
   firma skrev "nødder", trykkede send, og oplysningen fandtes
   ikke bagefter.

   ⚠️ DEN FEJL BLEV RETTET ÉT STED OG IKKE SOM EN KLASSE. MÅLT
   21/9 ved at læse ALLE siders allergifelter og slå deres id op
   i den kode, siden faktisk indlæser:

     index.html        #allergi        → js/skal/bestil.js      ✓
     h-smorrebrod.html #sallergi       → js/skal/bestil.js      ✓
     h-frokost.html    #fallergi       → js/skal/forespoergsel.js ✓
     m-tapas.html      #tallergi       → js/skal/tapas.js       ✓
     bestil/, ved-bordet/ #bestil-allergi → js/bestilling.js    ✓
     h-kalender.html   #kallergi       → INGEN                  ✗

   js/skal/kalender.js læser #kbesked og sender den — men den har
   aldrig kendt #kallergi. En gæst, der tilmelder sig en
   fællesspisning og skriver "skaldyr", fik hverken en
   samtykkelinje at sige ja på eller en oplysning frem til
   køkkenet. Og fællesspisningen er netop den aften, hvor der
   laves ÉN ret til alle.

   ⚠️ PRØVEN HER ER FILSYSTEMETS OG IKKE EN LISTE. Skriver nogen
   en syvende side med et allergifelt, falder den af sig selv —
   en håndholdt liste ville bestå, fordi ingen huskede at rette
   den.
   ============================================================ */
test.describe('Hvert allergifelt bliver læst af sidens egen kode', () => {

  /* Siderne findes ved at LÆSE dem, og koblingen slås op i de
     scripts, netop den side indlæser. At lede i hele js/ ville
     bestå, hvis feltet var koblet på en HELT anden side — og det
     er præcis den fejl, prøven findes for. */
  function siderMedAllergifelt() {
    const mapper = ['', 'bestil', 'bord', 'ved-bordet'];
    const fundet = [];
    mapper.forEach((m) => {
      const sti = m ? path.join(ROD, m) : ROD;
      if (!fs.existsSync(sti)) return;
      fs.readdirSync(sti)
        .filter((f) => f.endsWith('.html'))
        .filter((f) => !/^google[a-z0-9]+\.html$/.test(f))
        .forEach((f) => {
          const rel = m ? m + '/' + f : f;
          const s = fs.readFileSync(path.join(ROD, rel), 'utf8')
            .replace(/<!--[\s\S]*?-->/g, '');
          /* Selve TEKSTFELTET — ikke fluebenet ved siden af, som
             hedder det samme plus "-samtykke". */
          const felter = (s.match(/<input[^>]*id="([a-z-]*allergi)"[^>]*>/gi) || [])
            .map((t) => (t.match(/id="([a-z-]*allergi)"/i) || [])[1])
            .filter(Boolean);
          if (!felter.length) return;
          const scripts = (s.match(/src="([^"]+\.js)[^"]*"/g) || [])
            .map((t) => t.replace(/^src="/, '').replace(/[?"].*$/, ''));
          fundet.push({ fil: rel, felter, scripts });
        });
    });
    return fundet;
  }

  test('der ER allergifelter at måle på', () => {
    /* ⚠️ UDEN DEN HER BESTÅR PRØVEN NEDENFOR EN SIDE, DER IKKE
       FINDES. Forsvandt felterne — eller holdt mønsteret op med
       at matche — ville en tom liste melde grønt. Tallet er
       filsystemets, ikke et, vi har skrevet ned. */
    expect(siderMedAllergifelt().length).toBeGreaterThanOrEqual(5);
  });

  test('ingen side beder om en allergi, som dens kode aldrig læser', () => {
    const løse = [];
    siderMedAllergifelt().forEach((side) => {
      side.felter.forEach((id) => {
        /* ⚠️ STIEN ER SIDENS EGEN, IKKE RODENS. bestil/ og
           ved-bordet/ skriver "../js/bestilling.js", og et
           path.join fra roden peger så uden for repoet — hver
           eneste undermappe ville blive meldt "løs", og den
           rigtige fejl ville drukne mellem tre falske. MÅLT
           første gang prøven kørte. */
        const mappe = path.dirname(path.join(ROD, side.fil));
        const læst = side.scripts.some((s) => {
          const sti = path.resolve(mappe, s);
          if (!fs.existsSync(sti)) return false;
          /* ⚠️ MED ELLER UDEN #. js/skal/tapas.js slår op med
             find('#tallergi'), de andre med id('kallergi') — en
             søgning efter kun den ene form meldte tapassiden løs,
             selv om den har læst feltet hele tiden. Og et nøgent
             indexOf(id) ville bestå på ordet i en KOMMENTAR:
             tegnet før og efter skal være en anførsel eller #. */
          return new RegExp("['\"#]" + id + "['\"]")
            .test(fs.readFileSync(sti, 'utf8'));
        });
        if (!læst) løse.push(side.fil + ' #' + id);
      });
    });
    expect(løse, 'allergifelter, ingen af sidens scripts kender').toEqual([]);
  });
});

/* ---- OG DET SAMME MÅLT GENNEM SKÆRMEN PÅ ARRANGEMENTSSIDEN ----

   ⚠️ FILPRØVEN OVENFOR ER IKKE NOK. Den ser et id i en fil; den
   ser ikke, om samtykkelinjen dukker op, eller om ordet ALLERGI:
   kommer med på rækken. Nøjagtig den samme deling som
   frokostsiden fik 16/9. */
test.describe('Arrangementssidens allergifelt', () => {

  const ARR = {
    id: 11, lokation_id: 'mosede', type: 'arrangement', dato: '2026-08-16',
    slut_dato: null, titel: 'Fællesspisning på havnen', beskrivelse: null,
    emoji: null, lukker_kl: null, offentlig: true, tilmelding: true,
    pladser: 40, pris_tekst: null, start_kl: '18:00',
  };

  async function åbnKalender(page) {
    const d = grunddata();
    d.kalender = [ARR];
    d.reservationer = [];
    await åbnSkal(page, '/h-kalender.html', { ur: FREDAG, data: d });
    await page.locator('.evcard, .evtom').first().waitFor({ state: 'attached' });
    const pille = page.locator('#bestil-pill');
    if (await pille.getAttribute('href') === '#reserver') await pille.click();
    await expect(page.locator('#reserver')).toBeVisible();
  }

  async function udfyld(page, allergi, sigJa) {
    await page.locator('#kvalg button').first().click();
    await page.locator('#knavn').fill('Anna Vind');
    await page.locator('#ktlf').fill('20304050');
    if (allergi) {
      await page.locator('#kallergi').fill(allergi);
      if (sigJa) await page.locator('#kallergi-samtykke').check();
    }
    await page.locator('#reserver button.g.solid.blk').click();
  }

  test('fluebenet dukker op, når der skrives en allergi', async ({ page }) => {
    await åbnKalender(page);
    const linje = page.locator('#kallergi-samtykke-linje');
    await expect(linje).toBeHidden();
    await page.locator('#kallergi').fill('skaldyr');
    await expect(linje).toBeVisible();
    /* Og det nulstilles igen — ellers står et gammelt ja og
       gælder en allergi, gæsten har slettet. */
    await page.locator('#kallergi').fill('');
    await expect(linje).toBeHidden();
  });

  test('uden fluebenet bliver tilmeldingen ikke sendt', async ({ page }) => {
    await åbnKalender(page);
    await udfyld(page, 'skaldyr', false);
    await page.waitForTimeout(400);
    expect(((await gemteData(page)).reservationer || []).length).toBe(0);
  });

  test('med fluebenet kommer allergien med — forrest, med ordet ALLERGI:',
    async ({ page }) => {
      await åbnKalender(page);
      await udfyld(page, 'skaldyr', true);
      await expect.poll(async () =>
        ((await gemteData(page)).reservationer || [{}])[0].besked || '')
        .toMatch(/^ALLERGI: skaldyr/);
    });

  /* ⚠️ MODSTYKKET, OG DET VIGTIGSTE: uden en allergi må
     ingenting spærre. Et samtykke, man ikke kan komme udenom, er
     ikke frivilligt — og dermed ugyldigt. */
  test('uden en allergi spærrer ingenting', async ({ page }) => {
    await åbnKalender(page);
    await udfyld(page, null, false);
    await expect.poll(async () =>
      ((await gemteData(page)).reservationer || []).length).toBe(1);
  });
});
