const ICONS={star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8"/>',pan:'<path d="M4 16h16M6 16c0-4 2.7-7 6-7s6 3 6 7M12 9V6M3 20h18"/>',sandwich:'<path d="M3 9l9-4 9 4-9 4z"/><path d="M4 12.5l8 3.5 8-3.5M4 16l8 3.5L20 16"/>',hotdog:'<path d="M5 15c-2-2-1-6 1.5-8.5S13 3 15 5s2 6-.5 8.5S7 17 5 15z"/><path d="M8.5 12.5c1-1.5 2.5-3 4-4"/>',burger:'<path d="M4 9c0-3 3.6-5 8-5s8 2 8 5zM4 12.5h16M4.5 16h15c0 2.2-1.4 3.5-3.5 3.5h-8C5.9 19.5 4.5 18.2 4.5 16z"/>',bread:'<path d="M4 10c0-2.8 3.6-5 8-5s8 2.2 8 5c0 1.4-1.2 2-2.5 2V19H6.5v-7C5.2 12 4 11.4 4 10z"/>',leaf:'<path d="M5 19c0-8 5-13 14-13 0 9-5 13-11 13H5z"/><path d="M8 16c2-3 4.5-5 8-6.5"/>',cone:'<path d="M8 10a4 4 0 118 0zM8 11l4 9 4-9"/>',cake:'<path d="M4 20h16v-6H4zM4 14c1.5 0 1.5-2 3-2s1.5 2 3 2 1.5-2 3-2 1.5 2 3 2 1.5-2 3-2M12 8V5M9.5 8V6"/>',cup:'<path d="M4 7h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5zM16 9h2.5a2.5 2.5 0 010 5H16M4 21h13"/>',bag:'<path d="M4 8h16l-1.2 9A2 2 0 0116.8 19H7.2A2 2 0 015.2 17zM8 8V6.5a4 4 0 018 0V8"/>',bottle:'<path d="M10 3h4v3.5l2 3V21H8V9.5l2-3zM8 13h8"/>',glass:'<path d="M6 4h12l-1 5a5 5 0 01-10 0zM12 14v6M8.5 20h7"/>',beer:'<path d="M5 8h10v11a2 2 0 01-2 2H7a2 2 0 01-2-2zM15 10h2.5a2.5 2.5 0 010 5H15M7 4.5c1.5-1.5 3.5-1.5 5 0s3.5 1.5 5 0"/>',drink:'<path d="M4 5h16l-8 8zM12 13v6M9 19h6"/>',party:'<path d="M4 20l5-11 6 6zM14 9l1.5-3M17 12l3-1.5M13 5.5V3"/>'};
const CART={};
function money(n){return n.toLocaleString('da-DK')+',-'}
function render(){
const root=document.getElementById('mroot'),rail=document.getElementById('catrail');
root.innerHTML=MENU.map(s=>{
 const groups=s.groups.map(g=>{
  const items=g.items.map(([n,p,d])=>{
   const key=(s.id+'|'+n).replace(/"/g,'');
   const price=p?'<div class="pr">'+money(p)+'</div>':'<div class="pr ask">spørg</div>';
   return '<div class="mi" data-key="'+key+'" data-name="'+n.replace(/"/g,'&quot;')+'" data-price="'+p+'"><div class="txt"><h4>'+n+'</h4>'+(d?'<p>'+d+'</p>':'')+'</div>'+price+'<button class="plus" aria-label="Tilføj '+n+'">+</button></div>'}).join('');
  return (g.name?'<div class="gname">'+g.name+'</div>':'')+(g.note?'<p class="gnote">'+g.note+'</p>':'')+'<div class="mlist">'+items+'</div>'}).join('');
 return '<section class="msec" id="s-'+s.id+'"><div class="shead rev"><div class="si"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[s.icon]||ICONS.bag)+'</svg></div><h2>'+s.title+'</h2></div>'+(s.note?'<p class="snote rev">'+s.note+'</p>':'')+'<div class="rev d1">'+groups+'</div></section>'}).join('')+'<div class="nores" id="nores" style="display:none">Ingen retter matcher søgningen.</div>';
rail.innerHTML=MENU.map((s,i)=>'<button class="cat'+(i?'':' on')+'" data-to="s-'+s.id+'">'+s.title+'</button>').join('');
}
render();

const sc=document.getElementById('sc'),bar=document.getElementById('cartbar'),cart=document.getElementById('cart');
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{root:sc,rootMargin:'0px 0px -6%'});
document.querySelectorAll('.rev').forEach(el=>io.observe(el));
function revealFallback(root){const els=[...document.querySelectorAll('.rev:not(.in)')];if(!els.length)return;
const box=root?root.getBoundingClientRect():{top:0,bottom:innerHeight};
els.forEach(el=>{const r=el.getBoundingClientRect();if(r.top<box.bottom-10&&r.bottom>box.top-200)el.classList.add('in')})}
let rraf=0;const onScroll=()=>{if(rraf)return;rraf=requestAnimationFrame(()=>{rraf=0;revealFallback(sc)})};
sc.addEventListener('scroll',onScroll,{passive:true});requestAnimationFrame(()=>revealFallback(sc));setTimeout(()=>revealFallback(sc),400);

// kategori-piller
const rail=document.getElementById('catrail');
rail.addEventListener('click',e=>{const b=e.target.closest('.cat');if(!b)return;const el=document.getElementById(b.dataset.to);if(el)sc.scrollTo({top:el.offsetTop-104,behavior:'smooth'})});
const spy=new IntersectionObserver(es=>{es.forEach(e=>{if(!e.isIntersecting)return;const id=e.target.id;
 rail.querySelectorAll('.cat').forEach(c=>{const on=c.dataset.to===id;c.classList.toggle('on',on);if(on)c.scrollIntoViewIfNeeded?c.scrollIntoViewIfNeeded():rail.scrollTo({left:c.offsetLeft-70,behavior:'smooth'})})})},{root:sc,rootMargin:'-108px 0px -72% 0px'});
document.querySelectorAll('.msec').forEach(s=>spy.observe(s));

// søgning
const inp=document.getElementById('q'),clr=document.querySelector('.srch .clr');
function search(){const v=inp.value.trim().toLowerCase();clr.classList.toggle('on',!!v);let any=false;
 document.querySelectorAll('.msec').forEach(sec=>{let vis=0;
  sec.querySelectorAll('.mi').forEach(mi=>{const hit=!v||mi.textContent.toLowerCase().includes(v)||sec.querySelector('h2').textContent.toLowerCase().includes(v);mi.classList.toggle('hidden',!hit);if(hit)vis++});
  sec.classList.toggle('hidden',vis===0);if(vis)any=true});
 document.getElementById('nores').style.display=any?'none':'block';
 document.querySelector('.catrail').style.display=v?'none':'flex'}
inp.addEventListener('input',search);
clr.addEventListener('click',()=>{inp.value='';search();inp.focus()});

// kurv
function fly(btn){const b=btn.getBoundingClientRect(),t=bar.getBoundingClientRect(),host=document.querySelector('.device');const h=host.getBoundingClientRect();
 const d=document.createElement('div');d.className='fly';d.style.left=(b.left-h.left+8)+'px';d.style.top=(b.top-h.top+8)+'px';host.appendChild(d);
 d.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+((t.left+30)-(b.left+8))+'px,'+((t.top+30)-(b.top+8))+'px) scale(.5)',opacity:.2}],{duration:560,easing:'cubic-bezier(.3,.8,.3,1)'}).onfinish=()=>d.remove()}
function paint(){const keys=Object.keys(CART),n=keys.reduce((a,k)=>a+CART[k].n,0),sum=keys.reduce((a,k)=>a+CART[k].n*CART[k].p,0);
 bar.classList.toggle('on',n>0);
 const nEl=bar.querySelector('.n');if(nEl.textContent!=String(n)){nEl.textContent=n;nEl.classList.remove('bump');void nEl.offsetWidth;nEl.classList.add('bump')}
 bar.querySelector('.lab').innerHTML=money(sum)+'<span>'+keys.map(k=>CART[k].n+' × '+CART[k].name).join(' · ')+'</span>';
 document.querySelectorAll('.mi').forEach(mi=>{const c=CART[mi.dataset.key];mi.classList.toggle('picked',!!c);
  const btn=mi.querySelector('.plus'),q=mi.querySelector('.qty');
  if(c&&!q){const w=document.createElement('div');w.className='qty';w.innerHTML='<button data-d="-">–</button><b>'+c.n+'</b><button data-d="+">+</button>';btn.replaceWith(w)}
  else if(c&&q)q.querySelector('b').textContent=c.n;
  else if(!c&&q){const p=document.createElement('button');p.className='plus';p.textContent='+';q.replaceWith(p)}});
 const cl=document.getElementById('clist');
 cl.innerHTML=keys.length?keys.map(k=>'<div class="crow" data-key="'+k+'"><div class="t">'+CART[k].name+'<span>'+money(CART[k].p)+' pr. stk.</span></div><div class="qty"><button data-d="-">–</button><b>'+CART[k].n+'</b><button data-d="+">+</button></div><div class="pr" style="font-family:\'Bebas Neue\';font-size:20px">'+money(CART[k].n*CART[k].p)+'</div></div>').join(''):'<div class="nores" style="padding:20px">Kurven er tom.</div>';
 document.getElementById('ctotv').textContent=money(sum)}
function add(mi,btn){const k=mi.dataset.key;if(!CART[k])CART[k]={name:mi.dataset.name,p:+mi.dataset.price||0,n:0};CART[k].n++;
 if(btn){btn.classList.remove('pop');void btn.offsetWidth;btn.classList.add('pop');fly(btn)}paint()}
document.getElementById('mroot').addEventListener('click',e=>{const p=e.target.closest('.plus');if(p){add(p.closest('.mi'),p);return}
 const q=e.target.closest('.qty button');if(!q)return;const mi=q.closest('.mi'),k=mi.dataset.key;CART[k].n+=q.dataset.d==='+'?1:-1;if(CART[k].n<1)delete CART[k];paint()});
document.getElementById('clist').addEventListener('click',e=>{const q=e.target.closest('.qty button');if(!q)return;const k=q.closest('.crow').dataset.key;CART[k].n+=q.dataset.d==='+'?1:-1;if(CART[k].n<1)delete CART[k];paint()});
bar.querySelector('.go').addEventListener('click',()=>cart.classList.add('open'));
cart.addEventListener('click',e=>{if(e.target===cart)cart.classList.remove('open')});
document.getElementById('lukkurv').addEventListener('click',()=>cart.classList.remove('open'));
paint();

// menu-sheet + topbar
const sheet=document.getElementById('sheet');
const openSheet=v=>sheet&&sheet.classList.toggle('open',v);
const bg=document.getElementById('burger');if(bg)bg.addEventListener('click',()=>openSheet(true));
const lk=document.getElementById('lukmenu');if(lk)lk.addEventListener('click',()=>openSheet(false));
if(sheet)sheet.addEventListener('click',e=>{if(e.target===sheet)openSheet(false)});
