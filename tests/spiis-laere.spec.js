/* Læren fra spiis (målt på kundens skærmbilleder, august 2026):
   fristerne står under åbningstiderne, og udsolgt VISES i stedet
   for at forsvinde.

   Fristerne er AFLEDT, aldrig skrevet i hånden — samme regnestykke
   som formularerne selv bruger. Prøverne her regner det samme
   stykke fra den anden side: står der 18.30, skal 18.30 også kunne
   vælges på bord/. Uret i åbn() står på fredag 7. august 2026
   kl. 13.00, og grunddataene holder åbent 11–21. */

const { test, expect } = require('@playwright/test');
const { åbn, grunddata } = require('./hjaelp');

test.describe('Fristerne under åbningstiderne', () => {

  test('bordets og smørrebrødets frister er regnet, ikke skrevet', async ({ page }) => {
    await åbn(page, '/index.html');
    const frister = page.locator('#find .frister');

    /* Bord: lukker 21 → sidste bord 20.30 → minus to timers varsel
       = 18.30. Smørrebrød: 24 timers varsel → ingen "til i dag",
       men reglen står der. */
    await expect(frister).toContainText('senest kl. 18.30');
    await expect(frister).toContainText('Bestilles mindst 24 timer før');
    await expect(frister).not.toContainText('Smørrebrød til i dag');
  });

  test('en tidlig lukning flytter fristen — eller fjerner den', async ({ page }) => {
    /* Lukker lugen 17 i stedet for 21, er bordfristen 14.30 — og
       klokken er 13, så linjen skal stadig stå der, men med det NYE
       tal. Det er selve beviset for, at tallet er afledt. */
    await åbn(page, '/index.html', {
      data: grunddata({
        kalender: [{
          id: 1, lokation_id: 'mosede', type: 'tidlig_lukning', titel: 'Lukker tidligt',
          dato: '2026-08-07', slut_dato: null, lukker_kl: '17:00', offentlig: false,
        }],
      }),
    });
    await expect(page.locator('#find .frister')).toContainText('senest kl. 14.30');

    /* Og lukker den 15, er fristen 12.30 — som er overskredet
       kl. 13. Så skal linjen VÆK: en frist, der er gået, er et
       løfte, siden ikke kan holde. */
    await åbn(page, '/index.html', {
      data: grunddata({
        kalender: [{
          id: 1, lokation_id: 'mosede', type: 'tidlig_lukning', titel: 'Lukker tidligt',
          dato: '2026-08-07', slut_dato: null, lukker_kl: '15:00', offentlig: false,
        }],
      }),
    });
    await expect(page.locator('#find .hours')).toBeVisible();
    await expect(page.locator('#find .frister')).not.toContainText('Bord i dag');
  });

  test('kort varsel giver smørrebrød til i dag', async ({ page }) => {
    /* Sætter admin varslet til to timer, skal linjen skifte fra
       regel til klokkeslæt: 21 → 20.30 → minus 2 timer = 18.30. */
    const d = grunddata();
    d.indstillinger.bestilling_varsel_timer = 2;
    await åbn(page, '/index.html', { data: d });

    const frister = page.locator('#find .frister');
    await expect(frister).toContainText('Smørrebrød til i dag?');
    await expect(frister).not.toContainText('mindst 2 timer før');
  });
});

test.describe('Udsolgt vises, ikke skjules', () => {

  const medUdsolgt = () => {
    const d = grunddata();
    d.menu_varer.push(
      { id: 21, kategori_id: 1, navn: 'Stjerneskud', beskrivelse: null,
        pris: 95, fremhaevet: false, udsolgt: true, sortering: 9, aktiv: true },
      { id: 22, kategori_id: 12, navn: 'Hjemmelavet hønsesalat', beskrivelse: null,
        pris: null, fremhaevet: false, udsolgt: true, sortering: 9, aktiv: true },
    );
    return d;
  };

  test('et udsolgt stykke står gennemstreget og kan ikke bestilles', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medUdsolgt() });
    await page.waitForSelector('#bestil-stykker .stk-linje');

    const linje = page.locator('.stk-linje.udsolgt', { hasText: 'Stjerneskud' });
    await expect(linje).toBeVisible();
    await expect(linje).toContainText('Udsolgt i dag');
    /* Ingen tæller: det, man ikke kan få, skal ikke have en
       plusknap, der bare siger nej. */
    await expect(linje.locator('button')).toHaveCount(0);
  });

  test('udsolgt fyld står dødt i sin gruppe', async ({ page }) => {
    await åbn(page, '/bestil/', { data: medUdsolgt() });
    await page.waitForSelector('#bestil-stykker .stk-linje');
    await page.locator('#fyld-knap').click();

    const pille = page.locator('.fyld-valg.udsolgt', { hasText: 'Hjemmelavet hønsesalat' });
    await expect(pille).toBeVisible();
    await expect(pille).toContainText('udsolgt');
    await expect(pille.locator('input')).toHaveCount(0);
  });

  test('forsidens fyld-tal tæller stadig kun det bestilbare', async ({ page }) => {
    /* Tallet på forsiden lover "N slags fyld". Et udsolgt fyld er
       ikke en slags, man kan få i dag — talte det med, ville tallet
       lyve præcis den dag, noget er udsolgt.

       Tallet står i smørrebrødets eget afsnit nu (23/8) og ikke
       inde i et dagens ret-panel, så det står der hver dag. */
    await åbn(page, '/index.html', { data: medUdsolgt() });
    await page.waitForSelector('#smoer-forside-tal:not([hidden])');

    await expect(page.locator('#smoer-forside-fyld')).toHaveText('2');
  });
});
