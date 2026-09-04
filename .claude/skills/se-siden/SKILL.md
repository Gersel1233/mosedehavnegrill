---
name: se-siden
description: Start siden lokalt og tag billeder af den med en rigtig browser, så du kan SE hvad du har lavet i stedet for at gætte. Brug den før du foreslår en ændring, efter du har lavet en, og hver gang nogen beskriver noget, der ser forkert ud. Virker også på admin. Ingen rigtig database bliver rørt — siden har en indbygget øvetilstand, hvor alle data ligger i localStorage, så du selv bestemmer hvad der står på skærmen.
---

# Se siden med dine egne øjne

Halvdelen af fejlene i det her projekt blev fundet, fordi nogen kiggede på et
billede: den gule kant på telefonen, ⚠-tegnet der stod dobbelt, 21 foldede
kategorier der stadig fyldte fire skærme, hullet på 212 px i galleriet.
**Læs ikke bare koden — kør den.**

## 1 · Start serveren

Fra repoets rod. **Port 4175, ikke 4173** — 4173 er Playwright-suitens egen
(`playwright.config.js`), og en fremmed server på den giver
`Process from config.webServer was not able to start` i alle testkørsler
bagefter. Det har kostet en fejlsøgningsrunde.

```bash
nohup python3 -m http.server 4175 --bind 127.0.0.1 >/dev/null 2>&1 &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4175/index.html
```

Skal svare `200`. **Serveren dør, når skallen genstarter** — tjek den, hver
gang du skal bruge den.

## 2 · Skabelonen

Gem i scratchpad og ret til det, du vil se. **Ingen netværksmock af
Supabase**: siden har sin egen øvetilstand. Ruter man `js/config.js` til en
tom `MOSEDE_CLOUD`, læser `js/store.js` alt fra localStorage-nøglen
`mosede_data_v1` — og `tests/hjaelp.js` leverer `grunddata()`, som er den
samme opsætning, hele testsuiten kører på. Byg videre på den i stedet for at
skrive datastrukturen af i hånden; så skrider dit kig ikke fra prøvernes
virkelighed.

```js
const { chromium, devices } = require('/opt/node22/lib/node_modules/playwright');
const { grunddata } = require('/home/user/mosedehavnegrill/tests/hjaelp.js');

const d = grunddata();
// Ret d for at se andre situationer, fx:
// d.nyheder = [{ id:'n1', lokation_id:'mosede', titel:'Live musik',
//   tekst:'Lørdag kl. 18.', dato:'2026-08-06', slags:'musik', aktiv:true }];
// d.indstillinger.dagens_ret = { navn:'Stegt flæsk', beskrivelse:'', pris: 95 };

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] });   // gæstesiden er telefon-først
  const p = await ctx.newPage();

  // Øvetilstand: tom sky-konfiguration + data i localStorage.
  await p.route('**/js/config.js*', r => r.fulfill({ status: 200,
    contentType: 'application/javascript',
    body: "window.MOSEDE_CLOUD = { url: '', anonKey: '' };" }));
  await p.addInitScript((d) => {
    localStorage.setItem('mosede_data_v1', JSON.stringify(d));
  }, d);

  // Google Fonts holder DOMContentLoaded tilbage i ~12 s i prøvemiljøet.
  await p.route('https://fonts.googleapis.com/**', r => r.abort());
  await p.route('https://fonts.gstatic.com/**', r => r.abort());

  const fejl = []; p.on('pageerror', e => fejl.push(e.message));
  await p.goto('http://127.0.0.1:4175/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2200);
  // Intro-laget dækker HELE forsiden i et par sekunder — fjern det.
  await p.evaluate(() => { const i = document.getElementById('intro'); if (i) i.remove(); });

  // Rul derhen, du vil kigge — og tag billedet af ELEMENTET, ikke skærmen.
  const el = p.locator('#bestil');
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(600);
  await el.screenshot({ path: 'kig.png' });

  console.log('JS-fejl:', fejl.length ? fejl.join(' | ') : 'ingen');
  await b.close();
})();
```

Kør med `/opt/node22/bin/node`, og **kig så på billedet** med Read-værktøjet.
Det er hele pointen.

Vil du rulle hele siden igennem: **rulleroden er `#sc`, ikke window.**
`window.scrollTo` gør ingenting — al rullelogik hænger på
`document.getElementById('sc').scrollTo(0, y)`.

## 3 · Fælder, der har kostet tid her

- **`#intro`-laget** dækker forsiden ved hvert besøg. Fjern det efter
  indlæsning (som ovenfor), ellers er hvert billede en creme-flade med logo.
- **`.rev` står med `opacity:0`**, til iagttageren sætter `.in` ved rul.
  Et element kan bestå enhver tekst-prøve og være usynligt på billedet —
  rul til det først, og mål `opacity`, hvis det betyder noget.
- **`loading="lazy"`-billeder har `naturalWidth` 0**, til browseren har
  set dem. Og `complete` er `true` OGSÅ for et billede, der fik 404 —
  det er `naturalWidth > 0`, der beviser noget.
- **Playwrights `hasText` ser ikke en feltværdi.** Navne i admin står i
  `<input>`; vælg på `data-vare`/`data-kategori`/`data-foto` i stedet.
- **Skjulte valg klikkes på deres `label`/segment-knap**, ikke på inputtet.
- **Designets `[data-toggles]`-segmenter flytter ikke `.on`** — aflæs det,
  de faktisk styrer (om feltet nedenunder er synligt), ikke klassen.
- **⚠️ `scroll-behavior: smooth` SLUGER `scrollTo`.** Rulleroden `#sc` har
  den, så et `sc.scrollTo(0, y)` efterfulgt af et skud giver et billede af
  toppen — og man tror, elementet ikke er der. Sæt
  `sc.style.scrollBehavior = 'auto'` og skriv `sc.scrollTop` direkte.
- **⚠️ Og `offsetTop` er relativ til `offsetParent`, ikke til `#sc`.**
  `el.getBoundingClientRect().top + sc.scrollTop` er tallet, der kommer
  udefra.
- **⚠️ TJEK FILNAVNET, FØR DU KONKLUDERER PÅ ET SKUD.** Et skript, hvis
  log-linje siger ét navn og hvis `screenshot({path})` siger et andet, får
  dig til at læse et forældet billede igen og igen — og til at lede efter en
  fejl i koden, der ikke findes. Kig på `ls -la --time-style=+%H:%M:%S`.

## 4 · Admin

Samme fremgangsmåde plus et login i sessionStorage — så lander du direkte
på fanerne:

```js
await p.addInitScript(() => {
  sessionStorage.setItem('mosede_token', 'lokal');
  sessionStorage.setItem('mosede_email', 'test@lesreg.dk');
});
// admin er computer- og iPad-først: brug viewport { width: 1280, height: 900 }
// og skift fane med  p.locator('[data-panel="p-bestillinger"]').click()
```

Skriver du noget i admin i øvetilstand, lander det i `mosede_data_v1` —
læs nøglen bagefter, hvis du vil se, hvad der faktisk blev gemt.

## 5 · Vis det til ejeren

Har du lavet noget om, så **send billedet med**, når du fortæller om det.
Mikkel afgør tingene på skærmbilleder — han skal kunne se det, ikke læse
om det. Og fandt du en fejl på et billede: skriv i CLAUDE.md, at den blev
fundet med øjnene, så den næste ved, hvad der ikke kan læses frem.
