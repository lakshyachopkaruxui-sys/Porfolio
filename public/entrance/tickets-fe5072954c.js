
const clips=[];
const calm=matchMedia('(prefers-reduced-motion: reduce)');
for(const stop of document.querySelectorAll('.stop')){
 const card=stop.querySelector('a'),video=card.querySelector('video'),button=stop.querySelector('.clip-control');
 let revision=0;
 function pause(){
  revision++;
  video.pause();
  video.classList.remove('show');
  button.setAttribute('aria-pressed','false');
  button.textContent='Play '+button.dataset.label;
 }
 async function play(){
  for(const other of clips)if(other!==pause)other();
  const current=++revision;
  if(!video.src)video.src=video.dataset.clip;
  try{
   await video.play();
   if(current!==revision)return;
   video.classList.add('show');
   button.setAttribute('aria-pressed','true');
   button.textContent='Pause '+button.dataset.label;
  }catch{if(current===revision)pause()}
 }
 clips.push(pause);
 stop.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!calm.matches)play()});
 stop.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')pause()});
 card.addEventListener('focus',()=>{if(card.matches(':focus-visible')&&!calm.matches)play()});
 stop.addEventListener('focusout',e=>{if(!stop.contains(e.relatedTarget))pause()});
 video.addEventListener('ended',()=>{
  button.setAttribute('aria-pressed','false');
  button.textContent='Replay '+button.dataset.label;
 });
 button.addEventListener('click',()=>video.paused?play():pause());
 new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause()}).observe(stop);
}
function stopClips(){clips.forEach(pause=>pause())}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopClips()});
window.addEventListener('pagehide',stopClips);
calm.addEventListener('change',stopClips);


for(const button of document.querySelectorAll('.peek')){
 button.addEventListener('click',()=>{
  const open=button.getAttribute('aria-expanded')==='false';
  const bubble=document.getElementById(button.getAttribute('aria-controls'));
  button.setAttribute('aria-expanded',String(open));
  bubble.setAttribute('aria-hidden',String(!open));
  button.textContent=open?'Close greeting':'Say hi to Woody';
 });
}
async function loadVisitorNumber() {
  const headers = {};
  try {
    let key = sessionStorage.getItem('lakshya-visit-key');
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem('lakshya-visit-key', key);
    }
    headers['X-Visit-Key'] = key;
  } catch {}
  const response = await fetch('/api/visit', {method:'POST', headers, credentials:'same-origin', cache:'no-store'});
  if (response.status !== 200) return;
  const {number} = await response.json();
  if (!Number.isSafeInteger(number) || number < 1) return;
  const guest = document.getElementById('guest');
  const digits = document.createElement('strong');
  digits.textContent = number.toLocaleString();
  guest.replaceChildren('You’re visitor number ', digits, '.');
  guest.hidden = false;
}
loadVisitorNumber().catch(() => {});
