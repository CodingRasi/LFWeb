const header=document.querySelector('[data-header]'),toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('#main-nav');
addEventListener('scroll',()=>header?.classList.toggle('scrolled',scrollY>12),{passive:true});
toggle?.addEventListener('click',()=>{const open=nav?.classList.toggle('open');toggle.setAttribute('aria-expanded',String(Boolean(open)))});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle?.setAttribute('aria-expanded','false')}));
document.querySelectorAll('[data-store]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();alert('The Lingofisy app store links will be available at launch.')}));
document.querySelectorAll('[data-year]').forEach(n=>n.textContent=String(new Date().getFullYear()));
