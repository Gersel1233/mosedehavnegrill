const { chromium, devices } = require('playwright');
const fs=require('fs');
const DATA=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext(devices['iPhone 13']); const s=await ctx.newPage();
 await s.route('**/js/config.js*',r=>r.fulfill({status:200,contentType:'application/javascript',
   body:"window.MOSEDE_CLOUD={url:'',anonKey:'',lokation:'mosede'};"}));
 await s.addInitScript(d=>{try{localStorage.setItem('mosede_data_v1',JSON.stringify(d));
   localStorage.setItem('mosede_intro_set_v1','1');}catch(e){}},DATA);
 await s.goto('http://127.0.0.1:4175/ved-bordet/?bord=7',{waitUntil:'load'});
 await s.waitForTimeout(1500);
 console.log(JSON.stringify(await s.evaluate(()=>{
   const t=document.querySelector('.stk-linje .taeller');
   const knapper=[...(t?t.querySelectorAll('button'):[])];
   return {
     taellere: document.querySelectorAll('.stk-linje .taeller').length,
     knapper: knapper.map(k=>({klasse:k.className, tekst:k.textContent,
        kode:[...k.textContent].map(c=>c.codePointAt(0).toString(16)), disabled:k.disabled,
        aria:k.getAttribute('aria-label')})),
     html: t?t.outerHTML.slice(0,300):'—'
   };
 }),null,1));
 await b.close();
})();
