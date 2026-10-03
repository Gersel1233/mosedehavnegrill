/* SIDSTE BESTILLING PR. MÅDE  (3. okt 2026)

   Mikkel: *"bare så de selv kan administrere det, og det hele
   hænger sammen, og at kunder så ikke kan dit og dat."*

   Systemet kunne skelne mellem to-go og spisning i forvejen — men
   KUN dag for dag. MÅLT i produktionen 3/10: to dagsregler, NUL med
   tiderne sat. I praksis delte alle tre måder ét klokkeslæt
   (lukketid minus 30), og skulle køkkenet stoppe to-go tidligere,
   skulle ejeren sætte det hver morgen. Det gør ingen.

   Tre ting kan gå galt, og de er alle tre dyre:

   1) SIDEN TILBYDER EN TID, KØKKENET IKKE KAN NÅ. Gæsten vælger
      21.45 til afhentning, og der står ingen ved lugen.
   2) DAGENS EGEN REGEL BLIVER OVERTRUMFET. Ejeren lukker tidligt en
      enkelt dag, og den faste indstilling kører videre hen over det.
   3) SIDEN OG DATABASEN BLIVER UENIGE. Så ser gæsten en tid, hun
      kan vælge, og får en fejl, når hun trykker send.
*/

const { test, expect } = require('@playwright/test');
const { åbnSkal, grunddata } = require('./hjaelp');

/* Fredag 7. august 2026, uret 09:00Z = 11.00 dansk — tidligt nok
   til at hele dagen er i spil. Tallene nedenfor kommer UDEFRA:
   de er fiksturets, ikke læst af siden. */
const FORMIDDAG = '2026-08-07T09:00:00Z';
const LUKKER = '22:00';
const SENEST_TOGO = '20:00';
const SENEST_SPIS = '21:00';

function data(indstillinger, dagsregler) {
  const d = grunddata();
  d.aabningstider = d.aabningstider.map((a) => ({ ...a, lukket: false,
    aabner: '10:00', lukker: LUKKER }));
  d.indstillinger = { ...d.indstillinger,
    bestilling_varsel_timer: 0, varsel_min_togo: 0, varsel_min_bord: 0,
    sidste_bestilling_min: 0, levering: true,
    ...indstillinger };
  if (dagsregler) d.dags_regler = dagsregler;
  return d;
}

test.describe('Sidste bestilling kan sættes pr. måde', () => {
  /* ⚠️ MÅLT PÅ REGLEN SELV (MosedeRegler.tiderFor) og ikke på
     vælgeren: det er dén, både forsiden, /bestil/ og bordet
     spørger, og det er dén, databasen har sin tvilling til. En
     prøve på én vælger ville lade de to andre skride. */
  async function tider(page, d, hvordan) {
    await åbnSkal(page, '/index.html', { ur: FORMIDDAG, data: d });
    /* ⚠️ hvordan ER FJERDE PARAMETER, ikke tredje:
       tiderFor(d, iso, mindst, hvordan, …). Første udgave af
       prøven sendte den som `mindst`, så reglen fik INGEN måde at
       gå efter og svarede den seneste af dem alle — og prøven
       lignede en fejl i koden. Slået op i signaturen, ikke gættet. */
    return page.evaluate((hv) => {
      const t = window.MosedeRegler.tiderFor(
        JSON.parse(localStorage.getItem('mosede_data_v1')),
        '2026-08-07', 0, hv);
      return (t || []).map(String);
    }, hvordan);
  }

  test('uden indstillinger er alle tre måder ens — som før', async ({ page }) => {
    const d = data({});
    const togo = await tider(page, d, 'afhentning');
    const spis = await tider(page, d, 'spis_her');
    expect(togo[togo.length - 1]).toBe(spis[spis.length - 1]);
    expect(togo[togo.length - 1]).toBe(LUKKER);
  });

  test('to-go kan stoppe før spisningen', async ({ page }) => {
    const d = data({ senest_togo: SENEST_TOGO, senest_spis_her: SENEST_SPIS });
    const togo = await tider(page, d, 'afhentning');
    const spis = await tider(page, d, 'spis_her');
    expect(togo[togo.length - 1], 'to-go går for længe').toBe(SENEST_TOGO);
    expect(spis[spis.length - 1], 'spisningen stopper for tidligt').toBe(SENEST_SPIS);
  });

  /* ⚠️ LEVERING FØLGER TO-GO, IKKE SPISNINGEN. Begge er ud af
     huset, og maden skal nå af sted. */
  test('levering følger to-go, når den ikke har sin egen tid', async ({ page }) => {
    const d = data({ senest_togo: SENEST_TOGO, senest_spis_her: SENEST_SPIS });
    const lev = await tider(page, d, 'levering');
    expect(lev[lev.length - 1]).toBe(SENEST_TOGO);
  });

  test('… men får sin egen, når ejeren sætter den', async ({ page }) => {
    const d = data({ senest_togo: SENEST_TOGO, senest_levering: '19:00' });
    const lev = await tider(page, d, 'levering');
    expect(lev[lev.length - 1]).toBe('19:00');
  });

  /* ⚠️ DAGENS EGEN REGEL VINDER. Lukker ejeren tidligt én dag, må
     den faste indstilling ikke køre hen over det — så ville en
     enkelt travl aften blive til en bestilling, ingen kan lave. */
  test('dagens egen regel slår den faste indstilling', async ({ page }) => {
    const d = data({ senest_togo: SENEST_TOGO },
      [{ lokation_id: 'mosede', dato: '2026-08-07', senest_togo: '17:00' }]);
    const togo = await tider(page, d, 'afhentning');
    expect(togo[togo.length - 1], 'den faste indstilling kørte hen over dagen')
      .toBe('17:00');
  });

  /* ⚠️ OG DEN KAN KUN SNÆVRE IND. En indstilling EFTER lukketid
     ville love en luge, der ikke er bemandet. */
  test('en indstilling efter lukketid flytter ikke lukketiden', async ({ page }) => {
    const d = data({ senest_togo: '23:30' });
    const togo = await tider(page, d, 'afhentning');
    expect(togo[togo.length - 1]).toBe(LUKKER);
  });
});
