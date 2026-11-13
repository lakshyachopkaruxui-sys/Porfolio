const clips = [];
const calm = matchMedia('(prefers-reduced-motion: reduce)');
for (const stop of document.querySelectorAll('.stop')) {
  const card = stop.querySelector('a');
  const video = card.querySelector('video');
  const button = stop.querySelector('.clip-control');
  let revision = 0;
  function setButton(playing) {
    button.setAttribute('aria-pressed', String(playing));
    button.textContent = (playing ? 'Pause ' : video.ended ? 'Replay ' : 'Play ') + button.dataset.label;
  }
  function pause() {
    revision++;
    video.pause();
    // Keep the last presented frame in place so re-entry continues from that frame.
    setButton(false);
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
      setButton(true);
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
  // The playback control is outside the hover trigger: hovering the Play button
  // must not switch it to Pause before its click arrives.
  card.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && !calm.matches) play();
  });
  stop.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && !stop.contains(document.activeElement)) pause();
  });
  card.addEventListener('focus', () => {
    if (card.matches(':focus-visible') && !calm.matches) play();
  });
  stop.addEventListener('focusout', event => {
    if (!stop.contains(event.relatedTarget)) pause();
  });
  button.addEventListener('click', () => video.paused ? play() : pause());
  video.addEventListener('ended', () => setButton(false));
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
