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
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',ev=>{const h=a.getAttribute('href');if(h.length<2)return;const el=document.querySelector(h);if(el&&sc){ev.preventDefault();openSheet(false);sc.scrollTo({top:el.offsetTop-40,behavior:'smooth'})}}));

// skjul bestil-pillen når selve bestillingen er i syne
(()=>{if(!pill||!sc)return;const t=document.querySelector(pill.getAttribute('href'));if(!t)return;
new IntersectionObserver(es=>es.forEach(e=>pill.classList.toggle('tuck',e.isIntersecting)),{root:sc,rootMargin:'-25% 0px -20% 0px'}).observe(t)})();

// chip-vælgere
document.querySelectorAll('[data-chips]').forEach(s=>s.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
if(s.dataset.chips==='multi'){b.classList.toggle('on')}else{s.querySelectorAll('button').forEach(o=>o.classList.remove('on'));b.classList.add('on')}}));
// vis/skjul felter afhængigt af valg
document.querySelectorAll('[data-toggles]').forEach(s=>s.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
const t=document.querySelector(s.dataset.toggles);if(t)t.hidden=b.dataset.show!=='1'}));
