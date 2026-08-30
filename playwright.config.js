/* Playwright – kører siden i en rigtig Chromium.

   Siden er ren HTML/CSS/JS uden build-step, så en simpel
   filserver er alt der skal til. */

const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');

/* Nogle byggemiljøer har en Chromium liggende i forvejen på en
   anden version end den Playwright selv ville hente. Findes den,
   bruger vi den – ellers lader vi Playwright bestemme. */
const forudInstalleret = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const launchOptions = {
  ...(fs.existsSync(forudInstalleret) ? { executablePath: forudInstalleret } : {}),
  // Containere kører ofte som root, og Chromium nægter at starte
  // med sandkasse som root. Det gælder kun testmiljøet – gæsternes
  // browser er ikke berørt.
  args: ['--no-sandbox'],
};

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,

  /* ⚠️ HALVDELEN AF MASKINEN STOD STILLE  (30/8)

     Kundens spørgsmål: "hvorfor tager det så lang tid, hver lille
     ændring?" Det gør ændringen heller ikke — det gør RUNDEN før
     udgivelsen: ~2100 prøver × to skærmstørrelser.

     Playwright bruger som standard kerner ÷ 2 arbejdere. På den
     her maskine er det 2 af 4, og de to andre lavede ingenting i
     25 minutter. Suiten deler ingen tilstand — hver prøve har sin
     egen browserkontekst og sit eget localStorage, og serveren er
     statiske filer — så der er intet at vinde ved at holde igen.

     ⚠️ MEN IKKE FLERE END KERNER. Sætter man 8 på 4 kerner, kommer
     prøverne til at vente på hinanden, og de tidsfølsomme (uret,
     autogem efter 1,2 sekund, kø-markeringen) begynder at falde
     på ventetid i stedet for på reglen. Det er nøjagtig den fejl,
     dobbeltafsendelses-prøven faldt på tidligere i dag. */
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // Kun ved fejl – ellers fylder det bare
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // iPhone-profilen kører normalt WebKit. Her er kun Chromium
      // installeret, så vi beholder skærmstørrelse og berøring –
      // det er layoutet vi vil prøve – men bruger Chromium.
      name: 'mobil',
      use: { ...devices['iPhone 13'], browserName: 'chromium', launchOptions },
    },
    {
      name: 'computer',
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
    // python's filserver skriver hver forespørgsel ud – det
    // drukner testresultaterne
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
