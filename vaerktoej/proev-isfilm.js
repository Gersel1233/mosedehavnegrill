/* ==========================================================
   PRØVEBILLEDER AF ISFILMEN

   Kør:  node vaerktoej/proev-isfilm.js hoej 0 1.6 3 5.1 7 8.5 10

   Optager de nævnte sekunder som PNG i test-results/isfilm-proeve/
   og skriver hvor tingene ligger. Så kan et format sættes op ved
   at SE på det i stedet for at regne kameravinkler i hovedet – og
   de tal der kommer ud, kan skrives ind i FORMATER.

   Filen er et værktøj, ikke en del af hjemmesiden.
   ========================================================== */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROD = path.join(__dirname, '..');
const UD = path.join(ROD, 'test-results', 'isfilm-proeve');
const PORT = 4176;

const form = process.argv[2] === 'bred' ? 'bred' : 'hoej';
const tider = process.argv.slice(3).map(Number).filter((t) => !Number.isNaN(t));
if (!tider.length) tider.push(0, 1.6, 3, 5.1, 7, 8.5, 10, 11.5);

function server() {
  const typer = {
    '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2',
    '.png': 'image/png', '.jpg': 'image/jpeg',
  };
  const s = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const fil = path.join(ROD, rel);
    if (!fil.startsWith(ROD) || !fs.existsSync(fil) || fs.statSync(fil).isDirectory()) {
      res.writeHead(404); res.end('nej'); return;
    }
    res.writeHead(200, { 'Content-Type': typer[path.extname(fil)] || 'application/octet-stream' });
    fs.createReadStream(fil).pipe(res);
  });
  return new Promise((ok) => s.listen(PORT, '127.0.0.1', () => ok(s)));
}

(async () => {
  fs.rmSync(UD, { recursive: true, force: true });
  fs.mkdirSync(UD, { recursive: true });

  const srv = await server();
  const forud = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch({
    ...(fs.existsSync(forud) ? { executablePath: forud } : {}),
    args: ['--no-sandbox', '--force-device-scale-factor=1', '--hide-scrollbars'],
  });

  // Vinduet skal have scenens størrelse, og den kender kun scenen selv
  const spejder = await browser.newPage({ viewport: { width: 400, height: 400 } });
  await spejder.goto(`http://127.0.0.1:${PORT}/assets/scoop-film.html?form=${form}&t=0`);
  await spejder.waitForFunction('window.KLAR === true', null, { timeout: 30000 });
  const { bredde, hoejde } = await spejder.evaluate(
    () => ({ bredde: window.SCOOP.bredde, hoejde: window.SCOOP.hoejde }));
  await spejder.close();

  const side = await browser.newPage({
    viewport: { width: bredde, height: hoejde }, deviceScaleFactor: 1,
  });
  await side.goto(`http://127.0.0.1:${PORT}/assets/scoop-film.html?form=${form}&t=0`);
  await side.waitForFunction('window.KLAR === true', null, { timeout: 30000 });

  console.log(`${form}: ${bredde} × ${hoejde}`);

  for (const t of tider) {
    await side.evaluate((tid) => {
      window.SCOOP.tegn(tid);
      return new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    }, t);

    const navn = 't' + String(t).replace('.', '_') + '.png';
    await side.screenshot({ path: path.join(UD, navn) });

    /* Hvor ligger tingene? Kasserne måles EFTER kameraets transform
       (getBoundingClientRect gør netop det), så tallene er dem man
       ser – ikke dem der står i koden. */
    const m = await side.evaluate(() => {
      const r = (id) => {
        const e = document.getElementById(id);
        const b = e.getBoundingClientRect();
        return `${Math.round(b.left)},${Math.round(b.top)} → ${Math.round(b.right)},${Math.round(b.bottom)}`;
      };
      return {
        toppen: r('top'), haand: r('haand'), titel: r('titel'), tekst: r('tekst'),
        titelSynlig: Number(getComputedStyle(document.getElementById('l0')).opacity).toFixed(2),
        tekstSynlig: Number(document.getElementById('tekst').style.opacity || 0).toFixed(2),
      };
    });
    console.log(`\n  t=${t}s  →  ${navn}`);
    console.log(`    øverste kugle  ${m.toppen}`);
    console.log(`    hånd/kegle     ${m.haand}`);
    console.log(`    titel          ${m.titel}  (synlig ${m.titelSynlig})`);
    console.log(`    åbningslinje   ${m.tekst}  (synlig ${m.tekstSynlig})`);
  }

  await browser.close();
  srv.close();
  console.log(`\nBillederne ligger i ${path.relative(ROD, UD)}/`);
})().catch((e) => { console.error(e); process.exit(1); });
