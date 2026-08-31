const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await b.newPage();
  // Intet maa hentes udefra — skrifterne ligger i filen.
  await p.route(/^https?:/, r => r.abort());
  await p.goto('file://' + process.argv[2], { waitUntil:'load' });
  await p.emulateMedia({ media:'print' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);

  // Kom skrifterne faktisk med?
  const skrift = await p.evaluate(() => {
    const h1 = document.querySelector('h1');
    return { h1: getComputedStyle(h1).fontFamily,
             krop: getComputedStyle(document.body).fontFamily,
             serifKlar: document.fonts.check('16px "Instrument Serif"'),
             sansKlar: document.fonts.check('16px "Instrument Sans"') };
  });
  console.log('skrifter:', JSON.stringify(skrift));

  await p.pdf({ path: process.argv[3], format:'A4', printBackground:true,
    margin:{top:'15mm',right:'14mm',bottom:'16mm',left:'14mm'},
    displayHeaderFooter:true,
    headerTemplate:'<div></div>',
    footerTemplate:'<div style="width:100%;font:400 8pt \'Helvetica\',sans-serif;'
      +'color:#6f5b55;padding:0 14mm;display:flex;justify-content:space-between">'
      /* ⚠️ SIDEFODENS TEKST ER ET ARGUMENT, IKKE EN KONSTANT.
         Den stod fast som "vejledning til personalet", og da det
         SAMME script lavede overdragelsesdokumentet, kom det ud
         med den anden fils sidefod på alle syv sider. Et dokument,
         hvis fod siger noget andet end dets forside, får den, der
         læser det, til at tro, at der mangler en side. */
      +'<span>'+(process.argv[4]||'Mosede Havnecafe')+'</span>'
      +'<span class="pageNumber"></span></div>' });
  await b.close();
})();
