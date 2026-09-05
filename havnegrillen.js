const sc=document.getElementById('sc'),tb=document.getElementById('tb'),pill=document.getElementById('bestil-pill'),sheet=document.getElementById('sheet');

/* ============================================================
   HVEM RULLER? (5/9)
   ============================================================
   Designet blev leveret som et telefon-artboard: .device med de
   runde hjørner og .screen#sc med overflow-y:auto indeni. Al
   rullelogik her hang på #sc, og det var rigtigt — indtil kunden
   bad om, at Safaris bundbjælke skulle folde sig sammen, når man
   ruller ("så meget fullscreen som overhovedet muligt").

   ⚠️ SAFARI FOLDER KUN SIN BJÆLKE PÅ DOKUMENTETS RULNING. En
   indlejret beholder rører den aldrig. Derfor holder
   havnegrillen.css op med at gøre .screen til en rullebeholder
   under 820 px — og derfor SPØRGER koden her, hvem der ruller,
   i stedet for at vælge.

   ⚠️ DEN SPØRGER OM DEN BEREGNEDE STIL, ikke om skærmbredden.
   Et brudpunkt skrevet af i JavaScript er husets ældste ar: to
   udgaver af den samme regel, der skrider fra hinanden den dag
   nogen retter de 820 px i stilarket. overflow-y er dét, der
   FAKTISK afgør, om en beholder ruller.

   ⚠️ OG DEN SPØRGER ÉN GANG. Skiftede den undervejs, skulle hver
   eneste iagttager rives ned og bygges op igen; et brudpunkt
   krydses kun ved at dreje en telefon eller trække i et vindue,
   og så er en genindlæsning det, der sker i praksis. */
const scRuller = !!sc && getComputedStyle(sc).overflowY !== 'visible';
const rulLyt  = scRuller ? sc : window;                     /* hvem der fyrer 'scroll' */
const rulRod  = scRuller ? sc : document.scrollingElement;  /* hvem der har scrollTop  */
const ioRod   = scRuller ? sc : null;                       /* null = browservinduet   */


let last=0,raf=0;
rulLyt.addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const y=rulRod?rulRod.scrollTop:0;
if(tb&&!tb.classList.contains('solid'))tb.classList.toggle('stuck',y>300);
if(Math.abs(y-last)>16)last=y;});},{passive:true});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{root:ioRod,rootMargin:'0px 0px -8%'});
document.querySelectorAll('.rev').forEach(el=>io.observe(el));
/* ⚠️ DEN AFVISER SELV EN RULLEROD, DER IKKE RULLER (5/9).
   js/skal/forside.js kalder revealFallback(document.getElementById('sc'))
   uden at vide, hvem der ruller. Traf den valget ude i hver
   kalder, ville den fil skulle rettes hver gang — og den, der
   glemte det, ville måle et element, der fylder hele siden, og
   afsløre ALT på én gang. Her er svaret ét sted. */
function revealFallback(root){const els=[...document.querySelectorAll('.rev:not(.in)')];if(!els.length)return;
if(root&&getComputedStyle(root).overflowY==='visible')root=null;
const box=root?root.getBoundingClientRect():{top:0,bottom:innerHeight};
els.forEach(el=>{const r=el.getBoundingClientRect();if(r.top<box.bottom-10&&r.bottom>box.top-200)el.classList.add('in')})}
let rraf=0;rulLyt.addEventListener('scroll',()=>{if(rraf)return;rraf=requestAnimationFrame(()=>{rraf=0;revealFallback(ioRod)})},{passive:true});requestAnimationFrame(()=>revealFallback(ioRod));setTimeout(()=>revealFallback(ioRod),400);
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
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',ev=>{const h=a.getAttribute('href');if(h.length<2)return;const el=document.querySelector(h);if(el&&rulRod){ev.preventDefault();openSheet(false);/* ⚠️ 40 VAR FOR LIDT — MÅLT PÅ EN IPHONE 13 (31/8). .topbar er FAST og 115 px høj, så et hop til et afsnit lagde afsnittets øverste 75 px BAG bjælken. På tapassiden betød det, at panelets overskrift og hele den første række (Dag og Tidspunkt) var skjult, i det sekund man trykkede på knappen, der førte derhen. Kunden kaldte det et skævt layout; det var en for lille konstant. Højden LÆSES af bjælken i stedet for at stå som et tal — ellers skrider de to fra hinanden, den dag bjælken bliver højere. */var bar=document.querySelector('.topbar');var luft=(bar?bar.getBoundingClientRect().height:96)+14;
/* ⚠️ offsetTop BLIVER — OG DET ER MÅLT, IKKE VALGT (5/9).
   .screen er position:relative og dermed hvert afsnits
   offsetParent i BEGGE verdener: i artboardet er den også
   rullebeholderen, og på en telefon ligger den i dokumentets
   nulpunkt. Så tallet er det samme, uanset hvem der ruller.

   To udgaver blev prøvet undervejs, og begge var forkerte:

   · rect.top + rulRod.scrollTop landede afsnittet 43 px under
     bjælken på en computer i stedet for 14 — rammens egen
     afstand ned til vindueskanten talte med.
   · rect.top minus beholderens top rettede DEN, og ramte så en
     anden: MÅLT på h-selskaber og h-smorrebrod landede afsnittet
     11-12 px BAG bjælken, fordi målet stadig bar designets
     .rev — og en transform flytter rektanglet, mens offsetTop
     ikke ved af den. Et afsnit, der ikke er afsløret endnu, er
     præcis det, man hopper til. */
rulRod.scrollTo({top:Math.max(0,el.offsetTop-luft),behavior:'smooth'})}}));

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
(()=>{if(!pill)return;
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
},{root:ioRod,rootMargin:margin}).observe(el));})();

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
