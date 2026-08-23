const sc=document.getElementById('sc'),tb=document.getElementById('tb'),bestil=document.getElementById('bestil'),sheet=document.getElementById('sheet');
let last=0,raf=0;
if(sc)sc.addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const y=sc.scrollTop;
if(tb&&!tb.classList.contains('solid'))tb.classList.toggle('stuck',y>380);
if(bestil)bestil.classList.toggle('tuck',y>last+16&&y>300);if(Math.abs(y-last)>16)last=y;});},{passive:true});
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
document.querySelectorAll('[data-step]').forEach(s=>s.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const n=s.querySelector('b');let v=+n.textContent+(b.dataset.d==='+'?1:-1);n.textContent=Math.max(0,v);sum()}));
function sum(){const el=document.getElementById('sumline');if(!el)return;
const n=document.querySelector('[data-step] b'),t=document.querySelector('#tid'),m=document.querySelector('[data-seg="how"] button.on');
el.textContent=(n?n.textContent:'0')+' × dagens ret · '+(m?m.textContent.trim():'To-go')+' · '+(t?t.value:'');}
sum();
document.querySelectorAll('.bn .x').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();const n=b.closest('.bn');n.style.maxHeight=n.offsetHeight+'px';requestAnimationFrame(()=>n.classList.add('out'));setTimeout(()=>n.remove(),600)}));
const heroImg=document.querySelector('.hero img');
if(heroImg&&sc){let hraf=0;sc.addEventListener('scroll',()=>{if(hraf)return;hraf=requestAnimationFrame(()=>{hraf=0;const y=Math.min(sc.scrollTop,700);heroImg.style.transform='translate3d(0,'+(y*.18).toFixed(1)+'px,0) scale('+(1+y*.00012).toFixed(4)+')'})},{passive:true})}
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',ev=>{const h=a.getAttribute('href');if(h.length<2)return;const el=document.querySelector(h);if(el){ev.preventDefault();openSheet(false);sc.scrollTo({top:el.offsetTop-40,behavior:'smooth'})}}));
(()=>{const cv=document.getElementById('wave');if(!cv)return;const x=cv.getContext('2d');let W,H,dpr;
function sz(){dpr=Math.min(2,devicePixelRatio||1);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0)}
function surf(u,t,l){return l+Math.sin(u*.022+t*1.1)*4+Math.sin(u*.05-t*1.7)*2}
function boat(bx,by,a){x.save();x.translate(bx,by);x.rotate(a);x.scale(.34,.34);x.fillStyle='#f7f0e4';
x.beginPath();x.moveTo(-25,-2);x.lineTo(28,-2);x.quadraticCurveTo(18,12,-13,11);x.closePath();x.fill();
x.fillRect(-1.5,-46,2.4,32);x.beginPath();x.moveTo(1.8,-44);x.lineTo(1.8,-16);x.lineTo(20,-16);x.closePath();x.fill();
x.fillStyle='#d1462f';x.beginPath();x.moveTo(-2.4,-40);x.lineTo(-2.4,-16);x.lineTo(-18,-16);x.closePath();x.fill();x.restore()}
function draw(ms){const t=ms/1000,l=H*.42;x.clearRect(0,0,W,H);
x.fillStyle='#173d58';x.beginPath();x.moveTo(0,surf(0,t*.8+6,l+9));for(let u=6;u<=W;u+=6)x.lineTo(u,surf(u,t*.8+6,l+9));x.lineTo(W,H);x.lineTo(0,H);x.closePath();x.fill();
x.strokeStyle='rgba(247,240,228,.4)';x.lineWidth=1;x.beginPath();x.moveTo(0,surf(0,t,l));for(let u=6;u<=W;u+=6)x.lineTo(u,surf(u,t,l));x.stroke();
const bx=W*.5+Math.sin(t*.22)*(W*.32),by=surf(bx,t,l),a=Math.atan2(surf(bx+14,t,l)-by,14)*.8;boat(bx,by+1,a);
requestAnimationFrame(draw)}
addEventListener('resize',sz);sz();requestAnimationFrame(draw)})();