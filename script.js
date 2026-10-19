const header=document.querySelector('[data-header]'),toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('#main-nav');
toggle?.addEventListener('click',()=>{const open=nav?.classList.toggle('open');toggle.setAttribute('aria-expanded',String(Boolean(open)))});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle?.setAttribute('aria-expanded','false')}));
document.querySelectorAll('[data-store]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();alert('The Lingofisy app store links will be available at launch.')}));
document.querySelectorAll('[data-year]').forEach(n=>n.textContent=String(new Date().getFullYear()));

const consentKey='lingofisy-consent-v1',banner=document.querySelector('[data-consent-banner]'),modal=document.querySelector('[data-consent-modal]'),backdrop=document.querySelector('[data-consent-backdrop]');
const consentRead=()=>{try{return JSON.parse(localStorage.getItem(consentKey)||'null')}catch{return null}};
const consentWrite=analytics=>{localStorage.setItem(consentKey,JSON.stringify({essential:true,analytics:Boolean(analytics),updatedAt:new Date().toISOString()}));banner.hidden=true;modal.hidden=true;backdrop.hidden=true;document.body.classList.remove('consent-open')};
const consentOpen=()=>{modal.hidden=false;backdrop.hidden=false;document.body.classList.add('consent-open');const saved=consentRead(),cb=modal.querySelector('[data-consent-analytics]');if(cb)cb.checked=Boolean(saved?.analytics)};
const consentClose=()=>{modal.hidden=true;backdrop.hidden=true;document.body.classList.remove('consent-open')};
const cs=document.createElement('button');cs.className='consent-settings-link';cs.type='button';cs.textContent='Privacy settings';cs.style.cssText='position:fixed;z-index:45;right:20px;bottom:20px;padding:8px 12px;border:1px solid #d8e5f3;border-radius:99px;color:#53617c;background:#ffffffe8;box-shadow:0 8px 22px #1421501f;cursor:pointer;font:700 11px Figtree,Arial,sans-serif';cs.addEventListener('click',consentOpen);document.body.append(cs);
if(!consentRead())banner.hidden=false;
document.querySelectorAll('[data-consent-accept]').forEach(b=>b.addEventListener('click',()=>consentWrite(true)));document.querySelectorAll('[data-consent-reject]').forEach(b=>b.addEventListener('click',()=>consentWrite(false)));document.querySelectorAll('[data-consent-customize]').forEach(b=>b.addEventListener('click',consentOpen));document.querySelectorAll('[data-consent-close]').forEach(b=>b.addEventListener('click',consentClose));document.querySelector('[data-consent-save]')?.addEventListener('click',()=>consentWrite(Boolean(modal.querySelector('[data-consent-analytics]')?.checked)));backdrop?.addEventListener('click',consentClose);addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)consentClose()});

/* ---- stage support ----
   The camera is pure CSS scroll timelines. JS only does what CSS cannot
   read: the header colour over the dark half of the journey, deep links
   into the stage, and reveals where animation-timeline is unsupported. */
const calm=matchMedia('(prefers-reduced-motion:reduce)').matches;
const hasIO='IntersectionObserver'in window;
const hasTimeline=typeof CSS!=='undefined'&&CSS.supports&&CSS.supports('animation-timeline','view()');
const story=document.querySelector('.story');
const pinned=()=>hasTimeline&&!calm&&innerHeight>=560;
const progress=()=>{
  if(!story)return 0;
  const r=story.getBoundingClientRect(),span=r.height-innerHeight;
  return span<=0?0:Math.min(1,Math.max(0,-r.top/span));
};

let ticking=false;
const onScroll=()=>{
  if(ticking)return; ticking=true;
  requestAnimationFrame(()=>{
    ticking=false;
    header?.classList.toggle('scrolled',scrollY>12);
    if(!pinned()){header?.classList.remove('on-dark');return}
    const p=progress(),inStage=story.getBoundingClientRect().top<=1;
    /* navy ground runs .18-.66, the closing gradient from .95 */
    header?.classList.toggle('on-dark',inStage&&((p>.15&&p<.69)||p>.93));
  });
};
addEventListener('scroll',onScroll,{passive:true});
addEventListener('resize',onScroll,{passive:true});
onScroll();

document.querySelectorAll('[data-seek]').forEach(a=>a.addEventListener('click',e=>{
  if(!pinned()||!story)return;
  e.preventDefault();
  const f=Number(a.dataset.seek)||0,span=story.offsetHeight-innerHeight;
  scrollTo({top:story.offsetTop+span*f,behavior:'smooth'});
}));

if(!calm&&hasIO&&!hasTimeline){
  document.documentElement.classList.add('js-reveal');
  const sel='.slot,.world,.faq-head>*,.faq-list details,.get-strip>div';
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -10% 0px',threshold:.14});
  document.querySelectorAll(sel).forEach(n=>io.observe(n));
}

/* Keyboard focus drives the stage.
   The six copy slots live in a clipped filmstrip, so tabbing into a slot that
   is currently off-stage would put focus somewhere invisible. Rather than hide
   that content from assistive tech (which is what aria-hidden was doing, and
   why screen readers only ever got the hero), the stage scrolls to whichever
   slot the user tabbed into. Focus is always visible, nothing is duplicated,
   and the full page stays in the accessibility tree. */
const SLOT_REST=[.02,.14,.75,.82,.88,.96];
const copyCol=document.querySelector('.copy');
if(copyCol&&story){
  let jumping=false;
  copyCol.addEventListener('focusin',e=>{
    if(!pinned()||jumping)return;
    const slot=e.target.closest('.slot');
    if(!slot)return;
    const i=[...copyCol.querySelectorAll('.slot')].indexOf(slot);
    const want=SLOT_REST[i];
    if(want===undefined||Math.abs(progress()-want)<.04)return;
    jumping=true;
    scrollTo({top:story.offsetTop+(story.offsetHeight-innerHeight)*want,behavior:'smooth'});
    setTimeout(()=>{jumping=false},650);
  });
}
