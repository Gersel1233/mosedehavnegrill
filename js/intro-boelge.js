/* ============================================================
   BØLGE-INTROEN — animationen  (august 2026)
   ------------------------------------------------------------
   Mikkels eget bundt, afleveret som færdigt og godkendt.
   Matematikken — faser, easings, partikler, geometri — er
   KOPIERET 1:1 fra havnegrillen-intro.js. Rør ikke P, B, easings,
   farver eller partikelmængder uden at spørge; det står i briefen.

   ------------------------------------------------------------
   FEM TING ER ANDERLEDES END I BUNDTET, OG HVER HAR SIN GRUND
   ------------------------------------------------------------
   1) ⚠️ SIDEN SKJULES IKKE. Prototypen lagde forsiden i #page med
      opacity: 0 og tonede den ind til sidst. Briefens EGET punkt 2
      siger, at siden skal være læsbar, selv hvis JS fejler — og med
      opacity: 0 som udgangspunkt er den præcis dét modsatte.
      Prototypens CSS og briefens krav er uenige, og kravet vinder.
      Introen ligger ovenpå og FJERNES; siden har aldrig været
      skjult. Samme beslutning som i js/intro.js på den gamle
      forside — den er truffet før, af den samme grund.

   2) LAGET FJERNES FRA SIDEN, ikke bare gjort gennemsigtigt. Et
      usynligt lag oven på forsiden fanger hvert eneste klik, og
      gæsten kan ikke bestille noget uden at vide hvorfor.

   3) "Spil igen"-knappen er væk — briefens eget punkt om #replay.
      start() bliver, som der står.

   4) DEN SPRINGES OVER VED ET DIREKTE LINK. Kommer gæsten ind på
      .../#menu fra Google eller fra et link, skal menukortet være
      der med det samme. En animation, der dækker netop det sted,
      man bad om at komme til, er en fejl uanset hvor kort den er.
      Reglen er arvet fra den gamle intro.

   5) ESCAPE LUKKER OGSÅ. Briefen har klik-hvor-som-helst, og det er
      bevaret — men det er hverken synligt eller noget, et tastatur
      kan nå. Escape koster ingen pixel og ingen ændring i
      animationen.

   ⚠️ INTROEN KØRER KUN FØRSTE GANG — OG DET ER EN VENDING (10/9).

   Kunden sagde 27/8 "hver gang man kommer ind på hjemmesiden", og
   det stod som tredje gang, han bad om netop det. 10/9 vendte han
   det selv: *"vi skal have fixet logo animationen til kun at virke
   første gang en bruger bruger hjemmesiden for første gang."*
   Det er hans beslutning om sit eget produkt, ikke en forældet
   note — og prøven er vendt MED grunden, ikke slettet.

   ⚠️ localStorage OG IKKE sessionStorage. Briefen sagde
   sessionStorage, men det er "én gang pr. fane": lukker gæsten
   browseren og kommer igen i morgen, ville hun se den igen, og
   så er det ikke "første gang". Hans ord er FØRSTE GANG.

   ⚠️ OG EN FEJL I LAGERET MÅ ALDRIG SPÆRRE FOR SIDEN. I en
   privat rude, med lagring slået fra eller i en indlejret ramme
   kaster selve OPSLAGET. Fanger vi ikke det, står gæsten med en
   forside, hvor intet script er kørt. Kan vi ikke huske det,
   viser vi introen — det er den milde fejl: en animation for
   meget, ikke en side, der ikke virker.

   ⚠️ DEN STÅR I PERSONDATAPOLITIKKEN. Vi gemmer noget i gæstens
   browser, og siden siger, hvad der ligger der.
   ============================================================ */
(function () {
  'use strict';

  var intro = document.getElementById('intro');
  if (!intro) return;

  function luk() {
    if (intro.parentNode) intro.parentNode.removeChild(intro);
  }

  // Et direkte link: gæsten har allerede sagt, hvor hun vil hen.
  if (location.hash && location.hash.length > 1) { luk(); return; }
  if (window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    luk(); return;
  }

  /* ⚠️ INTROEN KOMMER VED HVERT BESØG — OG DET ER VENDT TO GANGE
     PÅ ÉN DAG (10/9). Bundtets punkt 1 ville have et flag, så den
     kun kom første gang; Mikkel sagde 27/8 "hver gang man kommer
     ind på hjemmesiden"; om formiddagen 10/9 bad han om første
     gang, og den blev bygget med `mosede_intro_set_v1` i
     localStorage; om eftermiddagen vendte han den tilbage:
     *"vi skal have ændret animationen til at komme hver gang."*

     Nøglen læses IKKE længere, og den skrives ikke. Ligger den
     stadig i en gæsts browser fra formiddagen, gør den ingenting
     — og den ryddes ikke, for et opslag i lagringen for at slette
     noget, ingen læser, er et kald uden en modtager.

     ⚠️ PERSONDATAPOLITIKKENS RÆKKE ER FJERNET MED. Siden lister
     kun det, der FAKTISK ligger i gæstens browser; en linje om en
     nøgle, vi ikke længere sætter, er en påstand den anden vej. */

  var water=document.getElementById('water'),fx=document.getElementById('fx'),
      wc=water.getContext('2d'),fc=fx.getContext('2d');
  var logo=document.getElementById('logo'),film=document.getElementById('film'),
      sheen=document.getElementById('sheen');
const C={foam:'#fdf7ef',sea:'#0e3a48',mid:'#17505f',red:'#d62a3a'};
let gpat=null;
function gingham(){const s=Math.max(10,Math.round(14*S)),c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,s,s);g.fillStyle='rgba(214,42,58,.32)';
  g.fillRect(0,0,s/2,s);g.fillRect(0,0,s,s/2);g.fillStyle='rgba(214,42,58,.2)';g.fillRect(0,0,s/2,s/2);
  return fc.createPattern(c,'repeat')}
const P={fall:620,splash:150,pop:620,settle:400,shake:500,shine:600,blub:660,drop:540,out:520};
const B={};{let a=0;for(const k in P){B[k]=a;a+=P[k]}B.end=a}
let W,H,S=1,R={top:0,left:0,width:0,height:0,cx:0,cy:0},t0=0,raf=0,last=0,K=1;
let parts=[],rings=[],stars=[],beads=[],bub=null,drp=null,popped=false,splashed=false,logoS=1;
let _op=-1,_tr='',_fa=-1,_fbg='',_fcp='';
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const eOut=p=>1-Math.pow(1-clamp(p,0,1),3);
const eIn2=p=>Math.pow(clamp(p,0,1),1.7);
const back=p=>{p=clamp(p,0,1);const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2)};

function size(){const d=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;S=clamp(W/1280,.62,1.4);
  fx.width=W*d;fx.height=H*d;fc.setTransform(d,0,0,d,0,0);
  water.width=1;water.height=1;
  logo.style.transform='none';const r=logo.getBoundingClientRect();R={top:r.top,left:r.left,width:r.width,height:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2};
  film.style.backgroundSize=`100% ${(34*S).toFixed(1)}px`;gpat=gingham()}
addEventListener('resize',()=>size());

/* ---- partikler ---- */
function burst(x,y,n,pw){for(let i=0;i<n;i++){const a=Math.PI*(1.04+Math.random()*.92),s=(2+Math.random()*8.5)*pw;
  parts.push({k:'d',x:x+(Math.random()-.5)*30*S,y:y+(Math.random()-.5)*10*S,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:(1.3+Math.random()*3)*S,a:1,c:Math.random()<.5?'rgba(214,42,58,.55)':'rgba(23,80,95,.5)'})}}
function drip(x,y){parts.push({k:'r',x,y,vx:0,vy:.5+Math.random()*.6,r:(1.6+Math.random()*2.2)*S,a:.85,w:Math.random()*6})}
function fling(x,y,dir,pw){for(let i=0;i<2;i++)parts.push({k:'d',x,y,vx:dir*(3+Math.random()*9)*pw,vy:-(1+Math.random()*5),r:(1.4+Math.random()*3.2)*S,a:.95,c:'rgba(23,80,95,.45)'})}
function drawParts(){for(let i=parts.length-1;i>=0;i--){const p=parts[i];
  if(p.k==='c'){const dx=R.cx-p.x,dy=R.cy-p.y,dd=Math.hypot(dx,dy),g2=1-Math.pow(.87,K);
    p.x+=dx*g2;p.y+=dy*g2;if(dd<R.width*.06){parts.splice(i,1);continue}
    fc.globalAlpha=clamp(p.a,0,1);fc.fillStyle='rgba(214,42,58,.6)';fc.beginPath();fc.arc(p.x,p.y,p.r,0,7);fc.fill();continue}
  if(p.k==='r'){p.y+=p.vy*K;p.vy+=.05*K;p.w+=.14*K;p.x+=Math.sin(p.w)*.5*K;if(p.y>R.top+R.height+6)p.k='d';p.a-=.004*K}
  else{p.x+=p.vx*K;p.y+=p.vy*K;p.vy+=.22*K;p.a-=.013*K}
  if(p.a<=0||p.y>H+40){parts.splice(i,1);continue}
  fc.globalAlpha=clamp(p.a,0,1);fc.fillStyle=p.c||'rgba(23,80,95,.5)';fc.beginPath();
  if(p.k==='r'){fc.fillStyle='rgba(96,158,174,.75)';fc.ellipse(p.x,p.y,p.r*.8,p.r*1.35,0,0,7);fc.fill();
    fc.fillStyle='rgba(255,255,255,.85)';fc.beginPath();fc.ellipse(p.x-p.r*.25,p.y-p.r*.4,p.r*.28,p.r*.42,0,0,7);fc.fill()}
  else{fc.arc(p.x,p.y,p.r,0,7);fc.fill()}}
  fc.globalAlpha=1}
function drawDroplet(x,y,r,al,st){fc.save();fc.globalAlpha=clamp(al,0,1);
  fc.beginPath();fc.ellipse(x,y,r*(st?.82:.94),r*(st?1.3:1.06),0,0,7);
  fc.fillStyle=gpat||'#fff';fc.save();fc.translate(x-r,y-r);fc.beginPath();fc.ellipse(r,r,r*(st?.82:.94),r*(st?1.3:1.06),0,0,7);fc.fill();fc.restore();
  fc.beginPath();fc.ellipse(x,y,r*(st?.82:.94),r*(st?1.3:1.06),0,0,7);
  fc.strokeStyle='rgba(214,42,58,.75)';fc.lineWidth=1.6*S;fc.stroke();
  fc.fillStyle='rgba(255,255,255,.92)';fc.beginPath();fc.ellipse(x-r*.3,y-r*.36,r*.22,r*.15,-.5,0,7);fc.fill();fc.restore()}

function makeBeads(){beads=[];for(let i=0;i<20;i++){const a=Math.random()*7,rr=Math.sqrt(Math.random())*.44;
  beads.push({ax:.5+Math.cos(a)*rr,ay:.5+Math.sin(a)*rr,r:(1.6+Math.random()*3.4)*S,sl:0,vs:.05+Math.random()*.16,w:Math.random()*7,a:.85})}}
function drawBeads(fade){for(let i=beads.length-1;i>=0;i--){const b=beads[i];
  b.sl+=b.vs*K;b.w+=.06*K;const al=clamp(b.a*fade,0,1);if(al<=.02)continue;
  const x=R.cx+(b.ax-.5)*R.width*logoS+Math.sin(b.w)*.7*S,y=R.cy+(b.ay-.5)*R.height*logoS+b.sl*logoS;
  fc.save();fc.globalAlpha=al;
  fc.fillStyle='rgba(150,196,208,.5)';fc.beginPath();fc.ellipse(x,y,b.r*.9,b.r*1.05,0,0,7);fc.fill();
  fc.strokeStyle='rgba(23,80,95,.42)';fc.lineWidth=.9*S;fc.stroke();
  fc.fillStyle='rgba(255,255,255,.9)';fc.beginPath();fc.ellipse(x-b.r*.3,y-b.r*.34,b.r*.24,b.r*.16,-.5,0,7);fc.fill();fc.restore()}}
function shakeOffBeads(pw){for(let i=beads.length-1;i>=0;i--){if(Math.random()>.22*K)continue;const b=beads.splice(i,1)[0];
  const x=R.cx+(b.ax-.5)*R.width*logoS,y=R.cy+(b.ay-.5)*R.height*logoS+b.sl,dir=x<R.cx?-1:1;
  parts.push({k:'d',x,y,vx:dir*(3+Math.random()*8)*pw,vy:-(1+Math.random()*4),r:b.r,a:.95,c:'rgba(150,196,208,.9)'})}}

/* ---- loop ---- */
function frame(ms){if(!t0)t0=ms;const e=ms-t0,t=e/1000;
  const dt=last?ms-last:16.7;K=clamp(dt,4,34)/16.7;last=ms;
  fc.clearRect(0,0,W,H);

  let tr='',op=0,fa=0;const h=R.height,iy=R.cy;
  if(e<B.splash){/* den ternede dråbe falder */
    const p=clamp(e/P.fall,0,1),sp2=eIn2(p),y=-60+( iy+60)*sp2,r=Math.max(13*S,R.width*.05);
    drawDroplet(R.cx,y,r*(1-.12*sp2),1,p>.15)}
  else if(e<B.pop){/* impact: rene ripples */
    if(!splashed){splashed=true;burst(R.cx,iy,16,1.15);
      for(let i=0;i<10;i++){const a=Math.random()*7,rr=R.width*(.2+Math.random()*.3);
        parts.push({k:'c',x:R.cx+Math.cos(a)*rr,y:iy+Math.sin(a)*rr*.4-10*S,r:(1.6+Math.random()*2.6)*S,a:.95})}
      rings.push({x:R.cx,y:iy,r:8*S,a:.42,g:R.width*.009});
      rings.push({x:R.cx,y:iy,r:3*S,a:.3,g:R.width*.0055});makeBeads()}}
  else if(e<B.settle){/* logoet vokser ud af splashet */
    const p=clamp((e-B.pop)/P.pop,0,1),s=back(p)*.96+.04,stq=clamp(1-p/.4,0,1);op=1;logo.style.clipPath='none';logoS=s;
    tr=`scale(${(s*(1-.12*stq)).toFixed(3)},${(s*(1+.22*stq)).toFixed(3)}) translateY(${((1-eOut(p))*10*S).toFixed(1)}px)`;
    fa=.5*p;if(_fbg!=='full'){film.style.backgroundSize='100% 100%';film.style.backgroundPosition='0 0';film.style.clipPath='none';_fbg='full'}
    if(p<.4&&Math.random()<.5*K)fling(R.cx+(Math.random()-.5)*R.width*.5,iy,Math.random()<.5?-1:1,.8);
    if(p>.3&&Math.random()<.5*K)drip(R.left+R.width*(.15+Math.random()*.7),R.top+h*(.3+Math.random()*.4))}
  else if(e<B.shake){op=1;logo.style.clipPath='none';logoS=1;const p=clamp((e-B.settle)/P.settle,0,1);
    fa=.5;if(_fbg!=='full'){film.style.backgroundSize='100% 100%';film.style.backgroundPosition='0 0';film.style.clipPath='none';_fbg='full'}
    tr=`translateY(${(-2*S*Math.sin(p*Math.PI)+Math.sin(p*Math.PI*2.2)*.8*S).toFixed(2)}px)`;
    if(p<1&&Math.random()<.5*K)drip(R.left+R.width*(.15+Math.random()*.7),R.top+h*(.4+p*.6))}
  else if(e<B.shine){op=1;logo.style.clipPath='none';
    const p=(e-B.shake)/P.shake,d=1-p,ph=p*Math.PI*2*3.5,rot=Math.sin(ph)*7.6*d;
    tr=`rotate(${rot}deg) scale(${1+Math.cos(ph)*.03*d},${1-Math.cos(ph)*.03*d})`;fa=.5*Math.pow(d,1.6);shakeOffBeads(d);
    if(p<.7&&Math.random()<.75*K){const dir=Math.cos(ph)>0?1:-1;fling(R.cx+dir*R.width*(.28+Math.random()*.18),R.top+h*(.2+Math.random()*.66),dir,d)}}
  else if(e<B.blub){op=1;logo.style.clipPath='none';
    const p=(e-B.shine)/P.shine,sa=Math.sin(clamp(p,0,1)*Math.PI),sx=-.15+p*1.3;
    tr=`scale(${1+Math.sin(clamp(p/.45,0,1)*Math.PI)*.04})`;
    sheen.style.opacity=sa;sheen.style.transform=`skewX(-16deg) translateX(${(sx+.27)*R.width}px)`;
    const rx=R.width*.466,ry=h*.466,dx=(sx-.5)*R.width;
    if(Math.abs(dx)<rx*.985){const dy=ry*Math.sqrt(1-(dx/rx)*(dx/rx));
      stars.push({x:R.cx+dx,y:R.cy-dy,s:7*S,a:sa});stars.push({x:R.cx+dx,y:R.cy+dy,s:6*S,a:sa*.8})}}
  else if(e<B.drop){const p=(e-B.blub)/P.blub;logo.style.clipPath='none';sheen.style.opacity=0;
    if(p<.26){const q=Math.sin((p/.26)*Math.PI);op=1;tr=`scale(${1-.05*q},${1+.07*q}) translateY(${-7*S*q}px)`}
    else if(p<.8){const q=clamp((p-.26)/.54,0,1),s=1-eIn2(q)*.93,wob=Math.sin(q*Math.PI*2.6)*.06*(1-q),yy=-26*S*eOut(q);
      op=1;tr=`translateY(${yy}px) scale(${s*(1.08+wob)},${s*(.92-wob)})`;
      if(q>.5)bub={x:R.cx,y:R.cy+yy,r:Math.max(8*S,R.width*.5*s*1.3),a:clamp((q-.5)/.22,0,1)*.9,w:q*6}}
    else{op=0;
      if(!popped){popped=true;const py=R.cy-26*S;
        for(let i=0;i<8;i++){const a=Math.PI*(1.12+Math.random()*.76),s2=2+Math.random()*5.5;parts.push({k:'d',x:R.cx,y:py,vx:Math.cos(a)*s2,vy:Math.sin(a)*s2,r:(1.3+Math.random()*2.2)*S,a:1,c:'rgba(96,158,174,.8)'})}
        rings.push({x:R.cx,y:py,r:R.width*.05,a:.5,g:R.width*.01});drp={x:R.cx,y:py,t:0}}}}
  else if(e<B.end){op=0;logo.style.clipPath='none';if(drp)drp.t=(e-B.drop)/P.drop}

  const trS=tr||'none';
  if(_op!==op){logo.style.opacity=op;_op=op}
  if(_tr!==trS){logo.style.transform=trS;_tr=trS}
  const faR=Math.round(fa*100)/100;if(_fa!==faR){film.style.opacity=faR;_fa=faR}

  if(drp&&drp.t>0&&drp.t<1){const q=drp.t,ri=Math.max(17*S,R.width*.062)*(q<.16?eOut(q/.16):1),
    y=drp.y-66*S*eOut(clamp(q/.72,0,1))+Math.sin(q*Math.PI*2.2)*3*S,
    wob=Math.sin(q*Math.PI*5.2)*.15*(1-q),
    r=ri*(q<.66?1:1-eIn2((q-.66)/.24)*.97);
    if(q<.9&&r>.3){fc.save();fc.globalAlpha=q>.82?1-(q-.82)/.1:1;
      fc.fillStyle='rgba(96,158,174,.85)';fc.beginPath();fc.ellipse(drp.x,y,r*(0.94+wob),r*(1.06-wob),0,0,7);fc.fill();
      fc.strokeStyle='rgba(14,58,72,.45)';fc.lineWidth=1.3*S;fc.stroke();
      fc.fillStyle='rgba(255,255,255,.92)';fc.beginPath();fc.ellipse(drp.x-r*.3,y-r*.36,r*.24,r*.16,-.5,0,7);fc.fill();fc.restore()}
    if(q>=.86&&!drp.done){drp.done=true;
      rings.push({x:drp.x,y,r:4*S,a:.5,g:R.width*.006});
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.5;stars.push({x:drp.x+Math.cos(a)*14*S,y:y+Math.sin(a)*14*S,s:(4+Math.random()*4)*S,a:.95})}
      for(let i=0;i<6;i++){const a=Math.random()*7,s2=1+Math.random()*2.6;parts.push({k:'d',x:drp.x,y,vx:Math.cos(a)*s2,vy:Math.sin(a)*s2-1,r:(1+Math.random()*1.6)*S,a:.9,c:'rgba(96,158,174,.85)'})}}}
  if(bub){fc.save();fc.globalAlpha=bub.a;const wq=1+Math.sin(bub.w)*.07;
    fc.fillStyle='rgba(150,196,208,.4)';fc.beginPath();fc.ellipse(bub.x,bub.y,bub.r*wq,bub.r/wq,0,0,7);fc.fill();
    fc.strokeStyle='rgba(14,58,72,.55)';fc.lineWidth=1.6*S;fc.stroke();
    fc.fillStyle='rgba(255,255,255,.9)';fc.beginPath();fc.ellipse(bub.x-bub.r*.34,bub.y-bub.r*.36,bub.r*.2,bub.r*.13,-.5,0,7);fc.fill();fc.restore();bub=null}
  for(let i=stars.length-1;i>=0;i--){const s=stars[i];s.a-=.07*K;if(s.a<=0){stars.splice(i,1);continue}
    fc.globalAlpha=clamp(s.a,0,1);fc.strokeStyle='rgba(255,255,255,.95)';fc.lineWidth=1.5*S;fc.beginPath();
    fc.moveTo(s.x-s.s,s.y);fc.lineTo(s.x+s.s,s.y);fc.moveTo(s.x,s.y-s.s);fc.lineTo(s.x,s.y+s.s);fc.stroke()}
  fc.globalAlpha=1;
  for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.r+=r.g*2.6*K;r.a-=.018*K;if(r.a<=0){rings.splice(i,1);continue}
    fc.globalAlpha=r.a;fc.strokeStyle='rgba(23,80,95,.55)';fc.lineWidth=1.6*S;fc.beginPath();fc.ellipse(r.x,r.y,r.r,r.r*.3,0,0,7);fc.stroke()}
  if(beads.length&&e>=B.pop+P.pop*.35){const wf=e<B.shake?clamp((e-B.pop-P.pop*.35)/(P.pop*.3),0,1):(e<B.shine?Math.pow(1-(e-B.shake)/P.shake,1.4):0);if(wf>0)drawBeads(wf)}
  fc.globalAlpha=1;drawParts();

  /* ⚠️ SIDEN TONES IND NU — og logoet FLYVER PÅ PLADS (10/9).
     Se `flyvPaaPlads` nedenfor. Her stod, at siden ikke blev
     tonet ind, fordi den havde ligget der hele tiden; det er
     kundens beslutning, der er lavet om, ikke en fejl. */
  /* ⚠️ FLYVNINGEN BEGYNDER VED `B.blub` OG IKKE VED `B.out`
     (10/9, kundens ord: *"den skal ikke forsvinde i den der
     blub"*). Faserne efter glansen er `blub` og `drop`, og de
     KRYMPER logoet til ingenting og popper det som en boble —
     altså forsvandt mærket, og først derefter fløj et allerede
     usynligt logo hen på plads.

     Nu går den fra ren og blank DIREKTE over i sin plads:
     fald → plask → pop → sæt → ryst → glans → flyv.
     Introen bliver samtidig 1,2 sekund kortere. */
  /* ⚠️ OG LØKKEN SKAL STOPPE HER — `return`, ikke bare et kald.
     `flyvPaaPlads` gør `cancelAnimationFrame(raf)`, men linjen
     nedenunder bestiller straks et NYT billede, og næste billede
     skriver `logo.style.transform` igen. Målt: flyvningen blev
     tørret af ved hvert billede, og logoet landede **144 px** fra
     kransen. Ved den gamle udløser (`B.out`) gik det tilfældigt
     godt: dér stod `tr` allerede på `none`, så `_tr`-vagten
     sprang skrivningen over. Fejlen har altså ligget i koden hele
     tiden og kunne først ses, da udløseren flyttede. */
  if(e>=B.blub&&!landet){landet=true;flyvPaaPlads();return}
  if(e<B.end+700)raf=requestAnimationFrame(frame)}


  /* ---- LOGOET RYGER PÅ PLADS  (10/9) ----------------------

     Kundens ord: *"når logoet har rystet sig rent, skal hele
     siden animere sig ind, hvor logoet er på headeren — så du
     ved, den ryger på plads på hjemmesiden."*

     ⚠️ MÅLET ER HERO-MÆRKET OG IKKE TOPBJÆLKEN. Målt 10/9:
     `.topbar .ordmaerke` er `visibility: hidden`, så længe siden
     ikke er rullet (beslutningen 9/9 om det tredje hjørne), og
     den er desuden TEKST og ikke et mærke. Det logo, gæsten
     FAKTISK ser øverst, er heroens krans — 108 px på en iPhone
     13, 140 på 1280. Et logo, der fløj hen til et skjult
     element, ville forsvinde ud i ingenting.

     ⚠️ KUN transform OG opacity. Husets regel fra 31/8: aldrig
     animere noget, der udløser layout. Flyvningen er én
     `translate` + `scale` på ét element.

     ⚠️ OG ANIMATIONEN STOPPES FØRST. Løkken skriver `transform`
     på logoet ved HVERT billede (`_tr`), så en overgang, der blev
     sat oveni, ville blive tørret af i næste frame — og det ville
     se ud som om flyvningen ikke virkede.

     ⚠️ SIDENS EGET MÆRKE VENTER, TIL DET ER LANDET. Ellers står
     der to kranse oven i hinanden i et halvt sekund. De to har
     samme plads og samme størrelse, når flyvningen slutter, så
     ombytningen kan ikke ses. */
  var landet = false;

  /* Flyvningens kurve og længde. Længden bruges også af reserverne
     for ombytningen. */
  var KURVE = [.24, .72, .24, 1], FLYV_MS = 1000;

  function flyvPaaPlads(){
    var maal = document.querySelector('.hero-badge .crest');
    /* ⚠️ LOGOETS KASSE MÅLES UDEN DEN TRANSFORM, LØKKEN SIDST SKREV
       (11/9). Flyvningens transform ERSTATTER den gamle — den lægges
       ikke oven i den. Blev vejen regnet af en kasse, der stadig bar
       rystelsen og skalaen fra `settle`/`shake`, landede logoet et
       andet sted end kransen: MÅLT 1,5-7 px under belastning, hvor
       flyvningen begynder midt i et ryst. Uden belastning var det
       tilfældigvis tæt på. Alt i samme opgave, så intet tegnes. */
    var foer = logo.style.transform;
    logo.style.transition = 'none';
    logo.style.transform = 'none';
    var a = logo.getBoundingClientRect();
    logo.style.transform = foer;
    var b = maal ? maal.getBoundingClientRect() : null;
    /* Uden et mål — eller uden en kasse at regne på — falder vi
       tilbage til den gamle udtoning. En side, der ikke har en
       krans i heroen, skal ikke stå med et logo, der bliver
       hængende midt på skærmen. */
    if (!b || !a.width || !b.width) {
      intro.classList.add('gone'); setTimeout(luk, 520); return;
    }
    cancelAnimationFrame(raf);
    var s = b.width / a.width;
    var dx = (b.left + b.width / 2) - (a.left + a.width / 2);
    var dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    document.documentElement.classList.add('intro-lander');
    /* ⚠️ SIDEN SÆTTES TIL NUL OG TONES IND — i den rækkefølge og
       i det her ene øjeblik. Laget dækker stadig, så nulstillingen
       er usynlig; sattes den tidligere, ville en side, der ER
       synlig, blive tonet UD først (målt: 1.00 → 0.00 → 1.00).
       `offsetWidth` læses for at tvinge browseren til at SE nullet,
       før overgangen sættes — uden den springer den direkte til 1. */
    var dev = document.querySelector('.device');
    if (dev) {
      dev.style.transition = 'none';
      dev.style.opacity = '0';
      void dev.offsetWidth;
      /* ⚠️ SAMME KURVE OG EN LILLE FORSINKELSE — SIDEN OG LOGOET
         SKAL LANDE PÅ SAMME TAKT. Målt før: siden var helt inde
         ved 660 ms og logoet ved 568, altså to bevægelser med
         92 ms imellem og derefter 300 ms, hvor intet skete. */
      dev.style.transition = 'opacity .86s cubic-bezier(.24,.72,.24,1) .08s';
      dev.style.opacity = '1';
    }
    /* ⚠️ GLANSEN SKAL VÆK, FØR DEN FLYVER. Den blev ryddet i
       `drop`-fasen, som vi ikke længere når — uden det ville et
       skævt lysglimt følge med hele vejen op i hjørnet. */
    sheen.style.opacity = 0;
    /* ⚠️ INGEN OVERSKUD I KURVEN — DET BLEV MÅLT (10/9).
       `cubic-bezier(.34,1.14,.42,1)` så rigtig ud på papiret, men
       **målt billede for billede** var logoet 2 px fra målet
       allerede efter **568 ms** af en overgang på 900 — resten
       krøb. Bevægelsen læses derfor som *hurtig og så gået i stå*,
       og det er præcis dét, kunden kalder ikke-smooth.

       Den her kurve decelererer HELE vejen og rammer først målet
       til sidst. Sluttilstanden er den samme; det er de sidste
       400 ms, der holder op med at være døde. */
    var maalTr = 'translate(' + Math.round(dx) + 'px,'
      + Math.round(dy) + 'px) scale(' + (Math.round(s * 1000) / 1000) + ')';
    /* ⚠️ SLUTPLADSEN MÅLES, FØR FLYVNINGEN BEGYNDER — se noten ved
       ombytningen nedenfor. Transformen sættes uden overgang, kassen
       læses, og den gamle sættes tilbage — alt i samme opgave, så
       intet af det tegnes. `offsetWidth` tvinger browseren til at SE
       den gamle igen, før overgangen sættes; ellers springer
       logoet direkte til målet. */
    logo.style.transition = 'none';
    logo.style.transform = maalTr;
    var slutKasse = logo.getBoundingClientRect();
    logo.style.transform = foer;
    void logo.offsetWidth;
    logo.style.transition = 'transform ' + FLYV_MS + 'ms cubic-bezier(' + KURVE.join(',') + ')';
    logo.style.transform = maalTr;
    intro.classList.add('lander');
    /* ⚠️ OG LAGET RYGER, NÅR BEVÆGELSEN ER SLUT FOR ØJET — IKKE
       NÅR KURVEN ER. Målt 10/9 på en iPhone 13: logoet var under
       2 px fra sin slutplads efter 794 ms, og med laget ved 1060
       stod siden FÆRDIG i 260 ms uden at kunne rulles — laget
       dækker hele skærmen og fanger hvert tryk. En kurve, der
       bremser hele vejen, har en hale, øjet ikke ser, men fingeren
       mærker.

       ⚠️ FIRE FORSØG, OG DE TRE FØRSTE VAR FORKERTE — MÅLT:
       1. Et fast 880 virkede på telefonen og hoppede 4 px på en
          computer, hvor logoet er større og skal længere.
       2. Et tidspunkt regnet af kurven og vejen, sat med
          `setTimeout`, var rigtigt på papiret — men overgangen
          begynder først ved næste billede, og på en travl maskine
          flere billeder senere. De to går ikke på samme ur: 2,5-4
          px tilbage ved ombytningen.
       3. At spørge kasserne, om logoet var under 1 px fra kransen,
          blev aldrig sandt. Det blev forklaret med afrunding — og
          det var FORKERT: afrundingen giver højst en halv pixel.
       4. Et tidspunkt på OVERGANGENS EGET UR (`currentTime`) faldt
          under belastning med 1,5-7 px — og ved den SAMME
          `currentTime` 850 ét sted 3,6 px og et andet 5,6. Det blev
          forklaret med, at kassen og uret ikke gik i takt — og det
          var OGSÅ forkert.

       ⚠️ ROD FUNDET VED DIAGNOSE (11/9): logoet ramte præcis sin
       slutplads — men slutpladsen lå ved siden af kransen, fordi
       vejen var regnet af en kasse, der stadig bar løkkens transform
       (se noten øverst i funktionen). Punkt 3 og 4 var den samme
       fejl set to gange; "samme `currentTime`, forskellig afstand"
       var to forskellige slutpladser. Kransen flyttede sig 0 px.
       Målt efter, under samme belastning: 0-1,1 px ved ombytningen.

       Ombytningen afgøres af KASSEN: logoets egen slutplads er målt,
       før flyvningen begyndte, og laget ryger, når logoet er under
       én pixel fra DEN. Reserverne er et værn mod en overgang, der
       aldrig når frem: overgangens ur ved slutningen, og vægurets
       FLYV_MS + 400. */
    var flyvStart = performance.now(), over = null;
    function fremme() {
      var r = logo.getBoundingClientRect();
      return Math.abs(r.left - slutKasse.left) < 1
        && Math.abs(r.top - slutKasse.top) < 1
        && Math.abs(r.width - slutKasse.width) < 1;
    }
    (function vent() {
      if (!over && logo.getAnimations) {
        over = logo.getAnimations().filter(function (x) {
          return x.transitionProperty === 'transform';
        })[0] || null;
      }
      var slutUr = over && over.currentTime !== null && over.currentTime >= FLYV_MS;
      if (fremme() || slutUr || performance.now() - flyvStart > FLYV_MS + 400) ombyt();
      else raf = requestAnimationFrame(vent);
    })();
    function ombyt() {
      /* ⚠️ I SAMME TRÆK: laget væk OG sidens mærke frem. Gøres
         det i to skridt, blinker hjørnet. */
      document.documentElement.classList.remove('intro-lander');
      /* Stilen tages af igen: en `opacity: 1` skrevet i
         elementets egen style vinder over alt, hvad arket måtte
         sige om `.device` en dag. */
      /* ⚠️ OG UDTONINGEN AFSLUTTES FØRST. Laget ryger nu, mens den
         stadig kører de sidste promille (den slutter ved 940 ms), og
         ryddes stilen bare, lader Chrome den løbe videre — målt:
         siden stod på 0,998 efter introen. `none` afbryder den, og
         værdien sættes, før stilen tages af. */
      if (dev) {
        dev.style.transition = 'none'; dev.style.opacity = '1';
        void dev.offsetWidth;
        dev.style.transition = ''; dev.style.opacity = '';
      }
      luk();
    }
  }

  function start(){cancelAnimationFrame(raf);t0=0;last=0;_op=-1;_tr='';_fa=-1;_fbg='';landet=false;
    logo.style.transition='';document.documentElement.classList.remove('intro-lander');
    intro.classList.remove('lander');
    parts=[];rings=[];stars=[];beads=[];bub=null;drp=null;logoS=1;
    popped=splashed=false;
    sheen.style.opacity=0;sheen.style.transform='skewX(-16deg) translateX(0)';
    logo.style.clipPath='none';logo.style.opacity=0;logo.style.filter='none';
    film.style.opacity=0;
    intro.classList.remove('gone');size();raf=requestAnimationFrame(frame)}

  /* Springet til slutningen. Bevaret fra bundtet — og udvidet med
     Escape, som hverken koster en pixel eller en ændring i
     animationen. */
  function spring(){ if (t0) t0 = performance.now() - B.out; else luk(); }
  intro.addEventListener('click', spring);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') spring();
  });

  // Vent på webfonts, ellers hopper logoteksten (briefens punkt 5).
  var go = function () { size(); start(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go).catch(go);
  else go();
})();
