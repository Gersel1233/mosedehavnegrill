/* ==========================================================
   OPTAGER ISFILMEN

   Kør:  node vaerktoej/lav-isfilm.js

   assets/scoop-film.html tegner ét billede ad gangen ud fra ét
   tal. Denne fil beder om alle billederne i rækkefølge, gemmer
   dem, og lader ffmpeg lægge dem sammen til en video.

   HVORFOR OPTAGE OVERHOVEDET – filmen kunne køre live i gæstens
   browser. Men så skulle hver gæst hente fem udklip på halvanden
   megabyte, og telefonen skulle regne blur og drop-shadow på
   fire lag i tolv sekunder. Som video er det én fil, den standser
   når man ruller væk, og den ser ens ud i alle browsere.

   HVORFOR IKKE OPTAGE MENS DEN KØRER – en skærmoptagelse følger
   maskinens humør. Er der travlt et øjeblik, springer den nogle
   billeder over, og hoppene bliver rykvise. Her sætter vi tiden
   selv: billede nummer n er altid n/FPS sekunder inde, uanset
   hvor lang tid maskinen bruger på at tegne det.

   FILMEN LAVES I TO FORMATER, og det er ikke pynt. 1920×1080 på
   en telefon giver en ramme der er 350 px bred og 197 høj: navnet
   i 96 px bliver 17 px på skærmen, og åbningslinjen kan slet ikke
   læses. Højformatet er 1080×1350, hvor keglen er 35% større i
   forhold til rammen og titlen står under den i stedet for ved
   siden af. Opskriften i assets/scoop-film.html kender begge –
   se FORMATER dér.

   Filerne der kommer ud:
     billeder/isfilm.mp4               H.264, computer
     billeder/isfilm.webm              VP9, computer
     billeder/isfilm-poster.jpg        stillbillede, computer
     billeder/isfilm-hoej.mp4          H.264, telefon
     billeder/isfilm-hoej.webm         VP9, telefon
     billeder/isfilm-hoej-poster.jpg   stillbillede, telefon

   Kør ét format ad gangen med:  node vaerktoej/lav-isfilm.js hoej
   ========================================================== */

const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROD = path.join(__dirname, '..');
const UD = path.join(ROD, 'billeder');
const ARBEJDE = path.join(ROD, 'test-results', 'isfilm-billeder');

const FPS = 30;
const PORT = 4174;

/* Formaterne. Størrelsen står i scoop-film.html og læses derfra –
   to steder med de samme tal ville før eller siden komme til at
   sige noget forskelligt, og resultatet ville være en film med en
   sandfarvet stribe langs kanten. */
const FORMATER = [
  { form: 'bred', navn: 'isfilm' },
  { form: 'hoej', navn: 'isfilm-hoej' },
];

/* Posterbilledet. Det skal vise hvad filmen handler om, før nogen
   trykker play: keglen foran havnen med navnet sat. 9,9 sekunder er
   efter titlen er faldet på plads og før udtoningen begynder.

   Tallet bliver TJEKKET mod filmens længde længere nede. Det skal
   det, fordi fejlen er lydløs: da filmen blev kortere end det gamle
   tal på 9,9, søgte ffmpeg ud over slutningen, skrev ingen billeder
   og sluttede pænt med kode 0 – og lod det gamle posterbillede
   ligge. Resultatet var en ny film med et stillbillede fra den
   gamle, og intet der sagde det. */
const POSTER_T = 9.9;

/* ffmpeg. Playwright har sin egen med, men det er en skrabet
   udgave der kun kan lave WebM ud af rå billeder – den kan
   hverken læse JPEG eller skrive H.264. Vi bruger derfor en
   fuld ffmpeg: den fra imageio-ffmpeg hvis den er hentet, ellers
   systemets egen. */
function findFfmpeg() {
  // imageio-ffmpeg lægger binæren i en mappe med versionsnummer i
  // navnet, så vi leder efter den frem for at gætte
  const fraImageio = [];
  for (const rod of ['/usr/local/lib', '/usr/lib', process.env.HOME + '/.local/lib']) {
    for (const py of fs.existsSync(rod) ? fs.readdirSync(rod) : []) {
      const mappe = path.join(rod, py, 'dist-packages', 'imageio_ffmpeg', 'binaries');
      const mappe2 = path.join(rod, py, 'site-packages', 'imageio_ffmpeg', 'binaries');
      for (const m of [mappe, mappe2]) {
        if (!fs.existsSync(m)) continue;
        for (const f of fs.readdirSync(m)) {
          if (f.startsWith('ffmpeg-')) fraImageio.push(path.join(m, f));
        }
      }
    }
  }

  const kandidater = [
    process.env.FFMPEG,
    ...fraImageio,
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
  ].filter(Boolean);
  for (const k of kandidater) if (fs.existsSync(k)) return k;
  throw new Error(
    'Fandt ingen ffmpeg. Installér den med:  pip install imageio-ffmpeg\n' +
    'eller peg på en selv:  FFMPEG=/sti/til/ffmpeg node vaerktoej/lav-isfilm.js'
  );
}
const ffmpeg = findFfmpeg();

function kør(kommando, argumenter) {
  return new Promise((ok, fejl) => {
    const p = spawn(kommando, argumenter, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    p.stderr.on('data', (d) => { stderr += d; });
    p.on('close', (kode) => {
      if (kode === 0) ok();
      else fejl(new Error(`${path.basename(kommando)} sluttede med ${kode}\n${stderr.slice(-2000)}`));
    });
  });
}

/* En filserver. Skrifterne hentes med @font-face, og en browser
   nægter at hente skrifter over file:// – så uden en server ville
   teksten blive optaget i en tilfældig systemskrift. */
function server() {
  const typer = {
    '.html': 'text/html; charset=utf-8',
    '.woff2': 'font/woff2',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  };
  const s = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const fil = path.join(ROD, rel);
    // Ingen vej ud af mappen
    if (!fil.startsWith(ROD) || !fs.existsSync(fil) || fs.statSync(fil).isDirectory()) {
      res.writeHead(404); res.end('nej'); return;
    }
    res.writeHead(200, { 'Content-Type': typer[path.extname(fil)] || 'application/octet-stream' });
    fs.createReadStream(fil).pipe(res);
  });
  return new Promise((ok) => s.listen(PORT, '127.0.0.1', () => ok(s)));
}

async function optag(browser, format) {
  const arbejde = path.join(ARBEJDE, format.form);
  fs.rmSync(arbejde, { recursive: true, force: true });
  fs.mkdirSync(arbejde, { recursive: true });

  const url = (t) => `http://127.0.0.1:${PORT}/assets/scoop-film.html`
    + `?form=${format.form}&t=${t}`;

  /* Scenens størrelse hentes FRA scenen. Et lille besøg i et
     tilfældigt vindue er nok til at spørge, og så åbnes det rigtige
     vindue bagefter. Skrev vi tallene her, kunne de komme til at
     sige noget andet end opskriften. */
  const spejder = await browser.newPage({ viewport: { width: 400, height: 400 } });
  await spejder.goto(url(0));
  await spejder.waitForFunction('window.KLAR === true', null, { timeout: 30000 });
  const maal = await spejder.evaluate(
    () => ({ b: window.SCOOP.bredde, h: window.SCOOP.hoejde }));
  await spejder.close();

  const side = await browser.newPage({
    viewport: { width: maal.b, height: maal.h },
    deviceScaleFactor: 1,
  });

  // Første besøg henter skrifter og udklip. Bagefter ligger de i
  // browserens hukommelse, så de næste 362 billeder går hurtigt.
  await side.goto(url(0));
  await side.waitForFunction('window.KLAR === true', null, { timeout: 30000 });

  const ialt = await side.evaluate('window.SCOOP.ialt');
  const antal = Math.round(ialt * FPS);

  if (POSTER_T > ialt - 0.1) {
    throw new Error(
      `POSTER_T er ${POSTER_T}s, men filmen er kun ${ialt}s. ffmpeg ville `
      + 'søge ud over slutningen, skrive ingenting og efterlade det gamle '
      + 'posterbillede – uden at sige det. Ret POSTER_T i denne fil.'
    );
  }

  console.log(`\n${format.navn}: ${maal.b}×${maal.h}, ${ialt}s, ${antal} billeder.`);

  /* Vi går IKKE til en ny side for hvert billede. Ét besøg, og så
     kaldes tegn() direkte med den næste tid. Det sparer 362
     sideindlæsninger, og – vigtigere – der er ingen risiko for at
     et billede bliver taget mens skrifterne hentes igen. */
  for (let i = 0; i < antal; i++) {
    const t = i / FPS;
    await side.evaluate((tid) => {
      window.SCOOP.tegn(tid);
      // To billeder frem, så browseren har lagt ændringen på skærmen
      return new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    }, t);
    await side.screenshot({
      path: path.join(arbejde, String(i).padStart(5, '0') + '.jpg'),
      type: 'jpeg',
      quality: 95,
    });
    if (i % 30 === 0) process.stdout.write(`  ${i}/${antal}\r`);
  }
  console.log(`  ${antal}/${antal} billeder optaget.`);
  await side.close();

  const moenster = path.join(arbejde, '%05d.jpg');
  const mp4 = path.join(UD, format.navn + '.mp4');

  /* H.264 til alle. yuv420p og faststart er de to ting der gør
     forskellen på om en video spiller på en iPhone eller ikke.
     crf 27: filmen er store bløde flader, og de koster næsten
     ingenting – detaljerne sidder i kuglernes kant. */
  console.log('  Koder MP4 …');
  await kør(ffmpeg, [
    '-y', '-framerate', String(FPS), '-i', moenster,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '27',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-an', mp4,
  ]);

  // VP9 til de browsere der er bygget uden H.264 – blandt andet
  // den Chromium testene kører i
  console.log('  Koder WebM …');
  await kør(ffmpeg, [
    '-y', '-framerate', String(FPS), '-i', moenster,
    '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0',
    '-row-mt', '1', '-cpu-used', '2',
    '-pix_fmt', 'yuv420p', '-an', path.join(UD, format.navn + '.webm'),
  ]);

  /* Posterbilledet hentes UD AF den færdige MP4 og ikke fra
     browseren. Så er stillbilledet med sikkerhed det samme
     billede gæsten ser når filmen begynder at spille – ellers
     kunne der komme et lille spring i farverne, fordi videoen er
     komprimeret og et skærmbillede ikke er.

     Bredden sættes til scenens egen, og ikke til 1600 for begge:
     et højformat opskaleret til 1600 px bredt ville være 2000 px
     højt og veje tre gange så meget som nødvendigt. */
  const posterBredde = Math.min(1600, maal.b);
  console.log('  Klipper posterbilledet ud …');
  await kør(ffmpeg, [
    '-y', '-ss', String(POSTER_T), '-i', mp4,
    '-frames:v', '1', '-vf', `scale=${posterBredde}:-2`, '-q:v', '5',
    path.join(UD, format.navn + '-poster.jpg'),
  ]);

  fs.rmSync(arbejde, { recursive: true, force: true });

  for (const f of [format.navn + '.mp4', format.navn + '.webm', format.navn + '-poster.jpg']) {
    const kb = Math.round(fs.statSync(path.join(UD, f)).size / 1024);
    console.log(`  ${f}  ${kb} kB`);
  }
}

(async () => {
  fs.rmSync(ARBEJDE, { recursive: true, force: true });
  fs.mkdirSync(ARBEJDE, { recursive: true });
  fs.mkdirSync(UD, { recursive: true });

  // Ét format ad gangen hvis der står et navn på kommandolinjen
  const kun = process.argv[2];
  const skalLaves = kun ? FORMATER.filter((f) => f.form === kun) : FORMATER;
  if (!skalLaves.length) {
    throw new Error(`Kender ikke formatet "${kun}". Vælg bred eller hoej.`);
  }

  const srv = await server();

  const forudInstalleret = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch({
    ...(fs.existsSync(forudInstalleret) ? { executablePath: forudInstalleret } : {}),
    args: ['--no-sandbox', '--force-device-scale-factor=1', '--hide-scrollbars'],
  });

  for (const format of skalLaves) await optag(browser, format);

  await browser.close();
  srv.close();
  fs.rmSync(ARBEJDE, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
