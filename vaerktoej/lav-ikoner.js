/* PWA-ikonerne tegnes af favicon.svg, saa de tre flader ikke kan
   skride fra hinanden. Arret fra 29/8: kransen kom paa siderne,
   men favicon og app-ikon var stadig det gamle maerke. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const ROD = '/home/user/mosedehavnegrill';
(async () => {
  const svg = fs.readFileSync(ROD + '/favicon.svg', 'utf8');
  const b = await chromium.launch({ args:['--no-sandbox'] });
  for (const n of [192, 512]) {
    const p = await (await b.newContext({ viewport:{width:n,height:n} })).newPage();
    await p.setContent('<style>html,body{margin:0;background:#fff}'
      + 'svg{width:' + n + 'px;height:' + n + 'px;display:block}</style>' + svg);
    await p.waitForTimeout(200);
    await p.screenshot({ path: ROD + '/ikoner/ikon-' + n + '.png' });
    console.log('ikoner/ikon-' + n + '.png');
  }
  await b.close();
})();
