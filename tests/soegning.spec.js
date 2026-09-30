/* ============================================================
   ÉN SØGNING — GÆSTENS OG PERSONALETS SKAL SVARE DET SAMME
   (30/9)
   ------------------------------------------------------------
   Ejerens ord: *"folk søger jo ikke korrekt stavning hver gang …
   de skriver bare pommes, eller mayo, eller burger, og så skal
   det korrekte udvalg komme frem — og admin og bestillingen,
   sammenhæng og dygtighed, er ikke god nok."*

   MÅLT 30/9 mod det levende sortiment ved bord 1, og han har
   ret — men fejlen er den omvendte af, hvad man skulle tro:
   ADMIN havde den kloge søgning, GÆSTEN den dumme.

     js/admin/menukort.js   ord.every(harOrdet)  ← alle ord, fri orden
     js/bestilling.js       hoestak.indexOf(q)   ← ét ord, i træk

   Så en gæst, der skrev "stor øl", fik NUL træf, mens der stod
   "Fadøl, stor" på kortet. Og personalet, der tastede det samme i
   admin, fik varen frem. To søgninger, to svar, samme spørgsmål.

   ⚠️ DEN TREDJE FEJL VAR DATAEN, IKKE REGLEN. Gæstens
   `data-soeg` var kun navn + beskrivelse — uden KATEGORIEN. Selv
   med admins regel ville "stor øl" falde, fordi "øl" foldes til
   "ol", og "ol" står ikke i "fadol" på en ordgrænse. I admin
   virkede det, fordi kategorinavnet "Øl" ligger i høstakken.

   ⚠️ OG STAVEFEJLEN ER NY FOR BEGGE. Hverken admin eller gæsten
   kunne finde "softis" eller "burgir". Reglen tåler nu ét tegns
   afvigelse på ord fra fire tegn og op — ikke på de korte, hvor
   et tegn er forskellen på "øl" og "ål".
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbn, åbnAdmin, grunddata, visFane } = require('./hjaelp');

const UR = '2026-08-07T11:00:00Z';

/* Et sortiment, der kan skelne mellem de fælder, reglen har.
   ⚠️ "Pølse med brød" er IKKE pynt: foldet hedder den "polse med
   brod", og den indeholder "ol". Uden den ville prøven på, at et
   kort ord skal stå forrest i et ord, måle ingenting. */
function kort() {
  const d = grunddata();
  d.menu_kategorier = [
    { id: 1, lokation_id: 'mosede', navn: 'Smørrebrød', afdeling: 'mad', sortering: 1, aktiv: true },
    { id: 2, lokation_id: 'mosede', navn: 'Burgere', afdeling: 'mad', sortering: 2, aktiv: true },
    { id: 3, lokation_id: 'mosede', navn: 'Pølser', afdeling: 'mad', sortering: 3, aktiv: true },
    { id: 6, lokation_id: 'mosede', navn: 'Softice og vafler', afdeling: 'is', sortering: 4, aktiv: true },
    { id: 9, lokation_id: 'mosede', navn: 'Øl', afdeling: 'drikke', sortering: 5, aktiv: true },
  ];
  const v = (id, kat, navn, beskrivelse) => ({
    id, kategori_id: kat, lokation_id: 'mosede', navn, beskrivelse: beskrivelse || null,
    pris: 45, fremhaevet: false, udsolgt: false, sortering: id, aktiv: true, valg: null });
  d.menu_varer = [
    v(1, 1, 'Leverpostej med baconsvøb'),
    v(2, 1, 'Æggemad med mayonnaise'),
    v(3, 2, 'Bøfburger', 'Med pommes frites'),
    v(4, 3, 'Pølse med brød'),
    v(5, 6, 'Softice med guf'),
    v(6, 9, 'Fadøl, lille'),
    v(7, 9, 'Fadøl, stor'),
  ];
  d.indstillinger.bestilbare_kategorier = [1, 2, 3, 6, 9];
  d.borde = [{ id: 7, lokation_id: 'mosede', nummer: '7', aktiv: true, har_kode: false }];
  return d;
}

/* De spørgsmål, en gæst faktisk stiller — og det ene navn, hvert
   af dem skal give. `null` betyder: ingenting, og det er svaret. */
const SPØRGSMÅL = [
  ['stor øl', ['Fadøl, stor']],
  ['øl stor', ['Fadøl, stor']],
  ['mayo', ['Æggemad med mayonnaise']],
  ['burgir', ['Bøfburger']],
  ['softis', ['Softice med guf']],
  ['pommes', ['Bøfburger']],
  ['svøb', ['Leverpostej med baconsvøb']],
  ['flødeskumsbolle', []],
];

async function bordetsTraef(page, ord) {
  const felt = page.locator('.kort-soeg');
  await felt.fill(ord);
  await page.waitForTimeout(220);
  return (await page.locator('[data-vare]:visible').evaluateAll(
    (ns) => ns.map((n) => n.getAttribute('data-vare')))).sort();
}

test.describe('Gæstens søgning ved bordet', () => {

  test.beforeEach(async ({ page }) => {
    await åbn(page, '/ved-bordet/?bord=7', { ur: UR, data: kort() });
    await expect(page.locator('.kort-soeg')).toBeVisible();
  });

  for (const [ord, forventet] of SPØRGSMÅL) {
    test(`"${ord}" giver ${forventet.length ? forventet.join(', ') : 'ingenting'}`,
      async ({ page }) => {
        expect(await bordetsTraef(page, ord)).toEqual([...forventet].sort());
      });
  }

  /* ⚠️ MODSTYKKET, OG DET ER DET, DER HOLDER REGLEN ÆRLIG.
     Et kort ord må ikke ramme inde i et andet: "øl" foldes til
     "ol", og "ol" står midt i "polse". Gav vi slip på det, ville
     en gæst, der søger øl, få pølserne med — og så er søgningen
     værre end ingen søgning. Samme lære som admin fik. */
  test('"øl" giver øllene og IKKE pølsen', async ({ page }) => {
    expect(await bordetsTraef(page, 'øl')).toEqual(['Fadøl, lille', 'Fadøl, stor']);
  });

  /* ⚠️ STAVETOLERANCEN MÅ IKKE BLIVE GAVMILD — MÅLT 30/9.

     Første udgave lod ét tegn være galt hvor som helst i et ord.
     Mod det levende kort gav "kaffe" da 29 træf og "vand" 63:
     "vaffel" er ét tegn fra "kaffe", og på et kort med seks
     vafler er det hver eneste af dem.

     Kravet er nu, at FØRSTE bogstav passer. Stavefejl rammer
     sjældent det første bogstav — burgir, softis, majo og
     frittes består alle — men kaffe/vaffel og vand/sand skilles
     ad. Tallene faldt til 23 og 16, og resten er kategorien, der
     gør sit arbejde. */
  test('"kaffe" finder ikke vaflerne', async ({ page }) => {
    const d = kort();
    d.menu_kategorier.push({ id: 4, lokation_id: 'mosede', navn: 'Kaffe',
      afdeling: 'drikke', sortering: 6, aktiv: true });
    d.menu_varer.push({ id: 8, kategori_id: 4, lokation_id: 'mosede',
      navn: 'Filterkaffe', beskrivelse: null, pris: 25, fremhaevet: false,
      udsolgt: false, sortering: 8, aktiv: true, valg: null });
    d.menu_varer.push({ id: 9, kategori_id: 6, lokation_id: 'mosede',
      navn: 'Vaffel med is', beskrivelse: null, pris: 45, fremhaevet: false,
      udsolgt: false, sortering: 9, aktiv: true, valg: null });
    d.indstillinger.bestilbare_kategorier = [1, 2, 3, 4, 6, 9];
    await åbn(page, '/ved-bordet/?bord=7', { ur: UR, data: d });
    await expect(page.locator('.kort-soeg')).toBeVisible();
    const traf = await bordetsTraef(page, 'kaffe');
    expect(traf).toContain('Filterkaffe');
    expect(traf, 'stavetolerancen tog vaflerne med').not.toContain('Vaffel med is');
  });
});

/* ============================================================
   OG DE TO SKÆRME SKAL SVARE DET SAMME
   ------------------------------------------------------------
   Det er hele ejerens pointe: personalet tager en bestilling i
   telefonen, mens gæsten sidder med sin egen skærm. Siger de to
   søgninger noget forskelligt, leder de efter hver sin vare i
   den samme samtale.
   ============================================================ */
test.describe('Admin og bestillingen svarer det samme', () => {

  for (const [ord, forventet] of SPØRGSMÅL) {
    test(`"${ord}" — samme svar begge steder`, async ({ page }) => {
      await åbnAdmin(page, { ur: UR, data: kort() });
      await visFane(page, 'p-menu');
      await page.waitForSelector('#menu-status');
      await page.locator('#menu-soeg').fill(ord);
      await page.waitForTimeout(260);
      /* ⚠️ ADMINS data-vare ER ID'ET, IKKE NAVNET. Navnet står i et
         <input>, og et hasText ser ikke en feltværdi — den fælde
         står i .claude/skills/se-siden. Første udgave af prøven
         sammenlignede "3" med "Bøfburger" og så ud som om admin
         fandt noget forkert; admin fandt det rigtige hele tiden. */
      const ider = await page.locator('.vare-raekke').evaluateAll(
        (ns) => ns.map((n) => n.getAttribute('data-vare')));
      const navne = ider.map((id) =>
        (kort().menu_varer.find((v) => String(v.id) === String(id)) || {}).navn)
        .filter(Boolean).sort();
      expect(navne).toEqual([...forventet].sort());
    });
  }
});
