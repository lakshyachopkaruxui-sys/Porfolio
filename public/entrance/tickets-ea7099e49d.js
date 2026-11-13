const clips = [];
const calm = matchMedia('(prefers-reduced-motion: reduce)');
for (const stop of document.querySelectorAll('.stop')) {
  const card = stop.querySelector('a');
  const video = card.querySelector('video');
  let revision = 0;
  function pause() {
    revision++;
    video.pause();
    // Keep the last presented frame in place so re-entry continues from that frame.
  }
  async function play() {
    if (!video.paused && !video.ended) return;
    for (const other of clips) if (other !== pause) other();
    const current = ++revision;
    if (!video.src) video.src = video.dataset.clip;
    if (video.ended) video.currentTime = 0;
    try {
      await video.play();
      if (current !== revision) return;
      const reveal = () => {
        if (current === revision && !video.paused) video.classList.add('show');
      };
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(reveal);
      else requestAnimationFrame(reveal);
    } catch {
      if (current === revision) pause();
    }
  }
  clips.push(pause);
  card.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && !calm.matches) play();
  });
  card.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && !card.matches(':focus-visible')) pause();
  });
  card.addEventListener('focus', () => {
    if (card.matches(':focus-visible') && !calm.matches) play();
  });
  card.addEventListener('blur', pause);
  new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) pause();
  }).observe(stop);
}
function stopClips() { clips.forEach(pause => pause()); }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopClips();
});
window.addEventListener('pagehide', stopClips);
calm.addEventListener('change', stopClips);
for(const button of document.querySelectorAll('.peek')){
 button.addEventListener('click',()=>{
  const open=button.getAttribute('aria-expanded')==='false';
  const bubble=document.getElementById(button.getAttribute('aria-controls'));
  button.setAttribute('aria-expanded',String(open));
  bubble.setAttribute('aria-hidden',String(!open));
  button.textContent=open?'Close greeting':'Say hi to Woody';
 });
}
