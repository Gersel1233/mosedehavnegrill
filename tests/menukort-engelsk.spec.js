/* MENUKORTET PÅ ENGELSK  (2. okt 2026)

   Mikkel: *"bar lad menukortene kunne oversættes til engelsk"* — og
   fra oplægget: *"Produktdata og priser skal ikke kopieres til fire
   separate datasæt … mens pris, lager/tilgængelighed og produkt-ID
   fortsat kommer fra den samme vare/database."*

   Fire slags fejl kan komme her, og de er alle fire dyre:

   1) PRISEN SKRIDER MELLEM SPROGENE. Hvis den engelske side nogensinde
      får sin egen kopi af varen, er det et spørgsmål om tid, før kun
      den ene bliver rettet — og to gæster ved samme bord ser hver sin
      pris. Prøven måler, at tallet er det SAMME på begge sprog.

   2) ET HUL I STEDET FOR ET NAVN. Mangler en oversættelse, skal der
      stå dansk. En tom linje kan gæsten ikke bestille efter.

   3) DE DANSKE SPECIALITETER BLIVER OVERSAT VÆK. "Roast pork" står
      ikke på det trykte kort, og så kan gæsten ikke pege på retten.
      Flæskesteg, Rullepølse, Dyrlægens natmad, Stjerneskud,
      Frikadelle og flæskesvær SKAL beholde deres navn.

   4) BESTILLINGEN SENDER ENGELSK. Databasens prisværn slår op på det
      DANSKE navn; en linje, der hedder "Roast pork with pickles",
      ville blive afvist med bestilling_ukendt_vare. Derfor er
      data-vare stadig dansk, og det måler prøven.
*/

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

const FREDAG = '2026-08-07T11:00:00Z';
const SIDE = '/m-menukort.html';

/* ⚠️ TALLENE OG NAVNENE KOMMER UDEFRA — fra fiksturet her, ikke fra
   koden. Læste prøven prisen ud af siden på dansk og sammenlignede
   med den samme side på engelsk, målte den sig selv. */
const PRIS = 89;
const DA = 'Flæskestegssandwich';
const EN = 'Flæskesteg – roast pork sandwich';

function data() {
  const d = grunddata();
  d.menu_kategorier = d.menu_kategorier.map((k) =>
    /* ⚠️ ET ANDET ORD END DET DANSKE. Produktionen kalder den
       "Smørrebrød" på begge sprog MED VILJE — men en prøve, hvor
       de to er ens, kan ikke se forskel på "oversat" og "ikke
       oversat". Her måler vi maskinen; at specialiteterne beholder
       deres navn, måles for sig i proev-filen (nr. 14). */
    /* ⚠️ ØL OG IKKE SMØRREBRØD. Kategoriens navn bliver kun en
       OVERSKRIFT, når afsnittet hedder det samme som kategorien —
       smørrebrødskapitlets afsnit hedder "Varianter", så den vej
       bliver aldrig gået dér. Målt: afsnittene er ["Varianter",
       "Vælg fyld", "Sødt", "Øl"], og "Øl" er den eneste af dem.
       ⚠️ Og et ANDET ord end det danske: produktionen kalder
       smørrebrødet "Smørrebrød" på begge sprog med vilje, men en
       prøve, hvor de to er ens, kan ikke se forskel på "oversat"
       og "ikke oversat". */
    k.id === 9 ? { ...k, oversaettelser: { en: { navn: 'Beer' } } } : k);
  d.menu_varer = d.menu_varer.map((v) => {
    if (v.id === 1) {
      return { ...v, pris: PRIS, navn: DA,
        oversaettelser: { en: { navn: EN, beskrivelse: 'Crispy roast pork, red cabbage and cucumber salad.' } } };
    }
    /* ⚠️ TO SLAGS "MANGLER", OG DE FALDER FORSKELLIGE STEDER.
       Nr. 3 har slet INGEN oversættelser. Nr. 2 har et engelsk
       objekt, men uden navn — og dét er den farlige: opslaget når
       hele vejen ind og finder undefined.

       MÅLT: da jeg fjernede faldskærmen (`return t || dansk`),
       bestod alle otte prøver alligevel, fordi ingen af dem havde
       den her form. Et værn, ingen prøve rører, er et værn, der
       forsvinder næste gang nogen rydder op. */
    if (v.id === 2) {
      return { ...v, oversaettelser: { en: { beskrivelse: 'Soft serve with guf.' } } };
    }
    return v;
  });
  return d;
}

async function åbn(page, sprog) {
  await åbnSkal(page, SIDE + (sprog ? '?sprog=' + sprog : ''), { ur: FREDAG, data: data() });
  await page.waitForSelector('.mk-linje');
}

test.describe('Menukortet på engelsk', () => {
  test('dansk er standard, og kortet står på dansk', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('.mk-linje[data-vare="' + DA + '"] h4')).toHaveText(DA);
    await expect(page.locator('.mk-sprog-knap.valgt')).toHaveText('Dansk');
  });

  test('?sprog=en åbner kortet på engelsk', async ({ page }) => {
    await åbn(page, 'en');
    await expect(page.locator('.mk-linje[data-vare="' + DA + '"] h4')).toHaveText(EN);
    await expect(page.locator('.mk-sprog-knap.valgt')).toHaveText('English');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('knappen skifter kortet uden at hente siden igen', async ({ page }) => {
    await åbn(page);
    await page.locator('.mk-sprog-knap[data-sprog="en"]').click();
    await expect(page.locator('.mk-linje[data-vare="' + DA + '"] h4')).toHaveText(EN);
    await page.locator('.mk-sprog-knap[data-sprog="da"]').click();
    await expect(page.locator('.mk-linje[data-vare="' + DA + '"] h4')).toHaveText(DA);
  });

  /* ⚠️ DEN DYRESTE: én vare, ét id, én pris. Hele formen findes for
     at undgå fire datasæt — og det er her, det ville vise sig. */
  test('prisen er den SAMME på begge sprog', async ({ page }) => {
    await åbn(page);
    const da = await page.locator('.mk-linje[data-vare="' + DA + '"] .mk-pris').textContent();
    await page.locator('.mk-sprog-knap[data-sprog="en"]').click();
    await expect(page.locator('.mk-linje[data-vare="' + DA + '"] h4')).toHaveText(EN);
    const en = await page.locator('.mk-linje[data-vare="' + DA + '"] .mk-pris').textContent();
    expect(da).toContain(String(PRIS));
    expect(en).toBe(da);
  });

  /* ⚠️ data-vare ER BESTILLINGENS NAVN. Databasens prisværn slår op på
     det danske navn; blev det oversat, ville hver eneste bestilling
     fra en engelsk side blive afvist med bestilling_ukendt_vare. */
  test('det danske navn bliver i data-vare, så bestillingen stadig kan sendes', async ({ page }) => {
    await åbn(page, 'en');
    await expect(page.locator('.mk-linje[data-vare="' + DA + '"]')).toHaveCount(1);
    await expect(page.locator('.mk-linje[data-vare="' + EN + '"]')).toHaveCount(0);
  });

  test('en vare UDEN oversættelse står på dansk — aldrig tom', async ({ page }) => {
    await åbn(page, 'en');
    const linje = page.locator('.mk-linje[data-vare="Fadøl, lille"] h4');
    await expect(linje).toHaveText('Fadøl, lille');
  });

  /* ⚠️ DEN FARLIGE FORM: et engelsk objekt UDEN navn. Opslaget når
     hele vejen ind og finder undefined — og uden `|| dansk` står
     overskriften tom. Se noten i fiksturet. */
  test('et TOMT engelsk navn falder også tilbage på dansk', async ({ page }) => {
    await åbn(page, 'en');
    const linje = page.locator('.mk-linje[data-vare="Softice med guf"] h4');
    await expect(linje).toHaveText('Softice med guf');
    // … mens beskrivelsen, der ER oversat, står på engelsk.
    await expect(page.locator('.mk-linje[data-vare="Softice med guf"] p'))
      .toHaveText('Soft serve with guf.');
  });

  test('kategoriens navn følger sproget — ejeren retter det i databasen', async ({ page }) => {
    await åbn(page);
    await expect(page.locator('.mk-sek-navn').filter({ hasText: 'Øl' })).toHaveCount(1);
    await page.locator('.mk-sprog-knap[data-sprog="en"]').click();
    await expect(page.locator('.mk-sek-navn').filter({ hasText: 'Beer' })).toHaveCount(1);
    await expect(page.locator('.mk-sek-navn').filter({ hasText: 'Øl' })).toHaveCount(0);
  });

  /* Kapitlernes faste tekster ligger i ordbogen i menukort-kort.js —
     ikke i databasen. Prøven læser dem UD AF FILEN, så den falder, hvis
     en overskrift bliver rettet uden at oversættelsen følger med. */
  test('kapitlernes overskrifter oversættes', async ({ page }) => {
    await åbn(page, 'en');
    const ord = await page.evaluate(() => window.MosedeMenukort.ORDBOG.en);
    expect(Object.keys(ord).length).toBeGreaterThan(40);
    expect(ord['Fisk & klassikere']).toBe('Fish & classics');
    /* ⚠️ MÅLT PÅ DET, FIKSTURET FAKTISK TEGNER. Første udgave
       ledte efter "Fish & classics", og grunddata har ingen af de
       varer — prøven faldt på sin egen kulisse, ikke på koden.
       "Varianter" → "Toppings" er der. */
    const afsnit = await page.locator('.mk-sek-navn').allTextContents();
    expect(afsnit).toContain('Toppings');
    expect(afsnit).not.toContain('Varianter');
  });
});

/* ============================================================
   DE SAMME VARER BEGGE STEDER  (2. okt 2026)
   ------------------------------------------------------------
   Mikkel: *"kontrollere, at de samme varer kan bestilles både i
   almindelig onlinebestilling og via QR/bordbestilling."*

   Det er to forskellige sider med hver sin fil (js/skal/bestil.js
   og js/bestilling.js) og hver sin udvalgstilstand — forsiden og
   /bestil/ spørger 'kun-smoer' + 'uden-smoer', bordet spørger
   'bord'. Driver de fra hinanden, kan en gæst se en vare på sin
   telefon ved bordet, som kollegaen ikke kan finde på forsiden —
   og ingen opdager det, før nogen spørger ved lugen.

   MÅLT mod ejerens rigtige data 2/10: 201 varer begge steder,
   ingen forskel i nogen af retningerne.
   ============================================================ */
const { åbnSkal: åbnS2, grunddata: gd2 } = require('./hjaelp');

test.describe('Online og QR tilbyder det samme', () => {
  test('intet kan bestilles det ene sted og ikke det andet', async ({ page }) => {
    const d = gd2();
    d.indstillinger.bestilbare_kategorier = [1, 6, 9, 12];
    await åbnS2(page, '/m-menukort.html', { ur: FREDAG, data: d });
    await page.waitForSelector('.mk-linje');

    const svar = await page.evaluate(async () => {
      const data = await window.Butik.hent();
      const iso = window.Butik.nu().dato;
      function saet(hvad, hvordan) {
        const u = window.Butik.udvalg(data, hvad, iso, '13:00', hvordan);
        const n = new Set();
        (u.varer || []).forEach((v) => n.add(v.navn));
        (u.varianter || []).forEach((v) => n.add(v.navn));
        return n;
      }
      /* /bestil/ har BEGGE tilstande på siden (data-udvalg i
         bestil/index.html) — måles kun den ene, ligner alt
         smørrebrødet en forskel, og prøven råber fejl på noget,
         der virker. Det skete, første gang den blev kørt. */
      const online = new Set([...saet('kun-smoer', 'afhentning'),
                              ...saet('uden-smoer', 'afhentning')]);
      const bord = saet('bord', 'spis_her');
      return {
        antal: online.size,
        kunOnline: [...online].filter((x) => !bord.has(x)),
        kunBord: [...bord].filter((x) => !online.has(x)),
      };
    });

    expect(svar.kunOnline, 'kan bestilles online, men ikke ved bordet').toEqual([]);
    expect(svar.kunBord, 'kan bestilles ved bordet, men ikke online').toEqual([]);
    /* Et tal, så prøven ikke består på en tom liste: findes der
       INGEN varer, er to tomme mængder også ens.
       ⚠️ 3 er fiksturets egne: grunddata har fem varer, og to af
       dem er fyld uden pris. Målt, ikke gættet — jeg satte først
       gulvet til 4 og fældede min egen prøve. */
    expect(svar.antal, 'der var slet ingen varer at sammenligne').toBeGreaterThanOrEqual(3);
  });
});
