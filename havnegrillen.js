const sc=document.getElementById('sc'),tb=document.getElementById('tb'),pill=document.getElementById('bestil-pill'),sheet=document.getElementById('sheet');
let last=0,raf=0;
if(sc)sc.addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const y=sc.scrollTop;
if(tb&&!tb.classList.contains('solid'))tb.classList.toggle('stuck',y>300);
if(Math.abs(y-last)>16)last=y;});},{passive:true});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{root:sc,rootMargin:'0px 0px -8%'});
document.querySelectorAll('.rev').forEach(el=>io.observe(el));
function revealFallback(root){const els=[...document.querySelectorAll('.rev:not(.in)')];if(!els.length)return;
const box=root?root.getBoundingClientRect():{top:0,bottom:innerHeight};
els.forEach(el=>{const r=el.getBoundingClientRect();if(r.top<box.bottom-10&&r.bottom>box.top-200)el.classList.add('in')})}
let rraf=0;if(sc){sc.addEventListener('scroll',()=>{if(rraf)return;rraf=requestAnimationFrame(()=>{rraf=0;revealFallback(sc)})},{passive:true});requestAnimationFrame(()=>revealFallback(sc));setTimeout(()=>revealFallback(sc),400)}
const openSheet=v=>sheet&&sheet.classList.toggle('open',v);
const bg=document.getElementById('burger');if(bg)bg.addEventListener('click',()=>openSheet(true));
const lk=document.getElementById('lukmenu');if(lk)lk.addEventListener('click',()=>openSheet(false));
if(sheet)sheet.addEventListener('click',e=>{if(e.target===sheet)openSheet(false)});
document.querySelectorAll('[data-seg]').forEach(s=>s.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;s.querySelectorAll('button').forEach(o=>o.classList.remove('on'));b.classList.add('on');sum()}));
document.querySelectorAll('[data-step]').forEach(s=>s.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const n=s.querySelector('b');const v=+n.textContent+(b.dataset.d==='+'?1:-1);n.textContent=Math.max(0,v);sum()}));
function sum(){const el=document.getElementById('sumline');if(!el)return;
const n=document.querySelector('[data-step] b'),t=document.querySelector('#tid'),m=document.querySelector('[data-seg="how"] button.on');
el.textContent=(n?n.textContent:'0')+' × dagens ret · '+(m?m.textContent.trim():'To-go')+' · '+(t?t.value:'')}
const tid=document.getElementById('tid');if(tid)tid.addEventListener('change',sum);
sum();
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',ev=>{const h=a.getAttribute('href');if(h.length<2)return;const el=document.querySelector(h);if(el&&sc){ev.preventDefault();openSheet(false);/* ⚠️ 40 VAR FOR LIDT — MÅLT PÅ EN IPHONE 13 (31/8). .topbar er FAST og 115 px høj, så et hop til et afsnit lagde afsnittets øverste 75 px BAG bjælken. På tapassiden betød det, at panelets overskrift og hele den første række (Dag og Tidspunkt) var skjult, i det sekund man trykkede på knappen, der førte derhen. Kunden kaldte det et skævt layout; det var en for lille konstant. Højden LÆSES af bjælken i stedet for at stå som et tal — ellers skrider de to fra hinanden, den dag bjælken bliver højere. */var bar=document.querySelector('.topbar');var luft=(bar?bar.getBoundingClientRect().height:96)+14;sc.scrollTo({top:Math.max(0,el.offsetTop-luft),behavior:'smooth'})}}));

/* Skjul bestil-pillen, når det, den er en genvej TIL, er i syne.

   ⚠️ OG DET GÆLDER OGSÅ HEROENS EGNE KNAPPER (31/8).

   MÅLT PÅ EN IPHONE 13 (390x664): pillen står 24 px over bunden
   og er 58 px høj, altså 582-640. Heroens anden knap, "Selskab &
   catering", ligger 579,5-633,5. De dækker hinanden HELT — og et
   elementFromPoint midt i pillen, med pillen selv slået fra,
   svarer "A.g ghost Selskab & catering". Gæsten kan altså slet
   ikke trykke på den knap på det FØRSTE skærmbillede, hun ser;
   trykker hun, hvor den står, bliver hun sendt ned i
   bestillingsformularen i stedet.

   MÅLT PÅ 320 px er det værre: dér dækker pillen "Bestil mad",
   altså heroens primære knap.

   Hver regel er rigtig for sig — pillen skal stå i bunden, og
   heroen skal fylde sin skærm. Det er SUMMEN, der er forkert, og
   den findes kun ved at måle på flere skærmhøjder. Præcis samme
   slags fejl som pillen oven i heroens manchet 23/8.

   ⚠️ RETTELSEN ER PILLENS EGEN REGEL, IKKE EN NY.
   Heroens "Bestil mad" ER den handling, pillen er en genvej til.
   Er den på skærmen, er pillen både overflødig OG i vejen. Vi
   giver derfor ikke heroen 70 px luft i bunden (det ville lave
   om på designets afstande på hver eneste skærmhøjde) — vi
   folder pillen væk, som den allerede gør ved formularen.

   ⚠️ TO IAGTTAGERE MÅ IKKE OVERSKRIVE HINANDEN. Skrev de begge
   toggle('tuck', e.isIntersecting), ville den, der udløste sidst,
   vinde: heroen forsvinder ud af syne og folder pillen FREM,
   oven i formularen. Derfor holdes de synlige mål i et sæt, og
   pillen er væk, så længe sættet ikke er tomt.

   ⚠️ KUN index.html HAR .hero-cta (målt) — de syv andre sider
   med en pille opfører sig præcis som før. */
(()=>{if(!pill||!sc)return;
const maal=[];
const t=document.querySelector(pill.getAttribute('href'));
/* Formularen: først når den er godt inde i skærmen. Uden
   margenen ville pillen blinke, så snart afsnittets øverste kant
   lige akkurat kom med. */
if(t)maal.push([t,'-25% 0px -20% 0px']);
/* Heroens knapper: så snart de overhovedet er i syne. Den ene af
   dem er den samme handling som pillen. */
const cta=document.querySelector('.hero-cta');
if(cta)maal.push([cta,'0px']);
if(!maal.length)return;
const synlige=new Set();
maal.forEach(([el,margin])=>new IntersectionObserver(es=>{
  es.forEach(e=>{e.isIntersecting?synlige.add(e.target):synlige.delete(e.target)});
  pill.classList.toggle('tuck',synlige.size>0);
},{root:sc,rootMargin:margin}).observe(el));})();

// chip-vælgere
document.querySelectorAll('[data-chips]').forEach(s=>s.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
if(s.dataset.chips==='multi'){b.classList.toggle('on')}else{s.querySelectorAll('button').forEach(o=>o.classList.remove('on'));b.classList.add('on')}}));
/* Vis/skjul felter afhængigt af valg.

   ⚠️ OG FLYT MARKERINGEN MED (30/8). Kundens ord om catering:
   "knapperne virker ikke ift levering eller afhentning".

   MÅLT på en iPhone 13: et tryk på "Afhentning" skjulte
   adressefeltet — men .on blev stående på "Levering", så begge
   knapper så uændrede ud. Gæsten ser en knap, der ikke svarer,
   og trykker igen; og skal hun bagefter finde ud af, hvad hun
   har valgt, står der stadig "Levering".

   Rettelsen er den samme linje, [data-chips]-enkeltvalget bruger
   lige ovenfor: fjern .on fra alle, sæt den på den, der blev
   trykket. Et segment, der ikke viser sit eget valg, er ikke et
   valg — det er to knapper.

   ⚠️ AFLÆSNINGEN ER STADIG FELTETS SYNLIGHED, ikke .on. Se
   segSvar() i js/skal/forespoergsel.js: en catering, hvor gæsten
   havde trykket Afhentning, blev engang sendt som en LEVERING med
   adresse på, fordi koden læste .on. Nu passer de to ting sammen
   — men det, der afgør, hvad der SENDES, skal blive ved med at
   være det, designet faktisk styrer. */
document.querySelectorAll('[data-toggles]').forEach(s=>s.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
s.querySelectorAll('button').forEach(o=>o.classList.remove('on'));b.classList.add('on');
const t=document.querySelector(s.dataset.toggles);if(t)t.hidden=b.dataset.show!=='1'}));
