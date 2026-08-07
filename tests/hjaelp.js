/* Fælles hjælpere til testene.

   To ting gør testene pålidelige:

   1) Uret sættes fast. "Er der åbent nu?" afhænger af klokken,
      og en test der virker kl. 13 og fejler kl. 22 er ubrugelig.
   2) Dataene lægges i localStorage før siden kører. Så er der
      ingen database involveret, og hver test styrer præcis hvad
      der står i den.
*/

const NØGLE = 'mosede_data_v1';

// Uret sættes til et bestemt øjeblik i UTC. Husk at Danmark er
// UTC+2 om sommeren og UTC+1 om vinteren – står der 11:00Z i
// august, er det 13:00 dansk tid.
async function sætUr(page, isoUtc) {
  await page.addInitScript((iso) => {
    const fast = new Date(iso).getTime();
    const Ægte = Date;
    class FastDato extends Ægte {
      constructor(...a) {
        if (a.length === 0) super(fast);
        else super(...a);
      }
      static now() { return fast; }
    }
    window.Date = FastDato;
  }, isoUtc);
}

async function sætData(page, data) {
  await page.addInitScript(([n, d]) => {
    try { localStorage.setItem(n, JSON.stringify(d)); } catch (e) { /* ignoreres */ }
  }, [NØGLE, data]);
}

/* Standarddata som testene kan ændre på. Alle dage 11–21, så
   ugedagen ikke i sig selv afgør om der er åbent. */
function grunddata(ændringer = {}) {
  const tider = [];
  for (let u = 0; u < 7; u++) {
    tider.push({ lokation_id: 'mosede', ugedag: u, lukket: false, aabner: '11:00', lukker: '21:00' });
  }

  return {
    lokationer: [{
      id: 'mosede',
      navn: 'Mosede Havnegrill & Ishus',
      adresse: 'Havnevej 20',
      postnr: '2670',
      by: 'Greve',
      telefon: '28871343',
      beskrivelse: 'Grillbar og ishus midt på Mosede Havn.',
      aktiv: true,
      sortering: 1,
    }],
    aabningstider: tider,
    lukkedage: [],
    menu_kategorier: [
      { id: 1, afdeling: 'grill', navn: 'Sandwich', sortering: 1, aktiv: true },
      { id: 6, afdeling: 'is', navn: 'Softice', sortering: 6, aktiv: true },
    ],
    menu_varer: [
      {
        id: 1, kategori_id: 1, navn: 'Flæskestegssandwich',
        beskrivelse: 'Sprød flæskesteg, rødkål og agurkesalat.',
        pris: 89, fremhaevet: true, udsolgt: false, sortering: 1, aktiv: true,
      },
      {
        id: 2, kategori_id: 6, navn: 'Softice med guf',
        beskrivelse: null,
        pris: 35.5, fremhaevet: false, udsolgt: false, sortering: 1, aktiv: true,
      },
    ],
    nyheder: [],
    indstillinger: {
      dagens_besked: { vis: false, tekst: '' },
      saeson: { lukket: false, aabner_igen: '', besked: '' },
      forside_overskrift: 'Grill og is på Mosede Havn',
      kontakt_email: '',
    },
    ...ændringer,
  };
}

/* Åbner en side med fast ur og bestemte data på plads. */
async function åbn(page, sti, { ur = '2026-08-07T11:00:00Z', data = grunddata() } = {}) {
  await sætUr(page, ur);
  await sætData(page, data);
  await page.goto(sti);
}

module.exports = { sætUr, sætData, grunddata, åbn, NØGLE };
