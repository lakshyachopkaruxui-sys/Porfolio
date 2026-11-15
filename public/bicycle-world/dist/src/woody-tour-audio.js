/** Fresh audio element per line; stale native events never affect the current owner. */
export function createWoodyTourAudio({AudioClass = globalThis.Audio, onPlaying = () => {}, mountAudio = () => {},
  setTimeout: setTimer = globalThis.setTimeout, clearTimeout: clearTimer = globalThis.clearTimeout, startDeadlineMs = 8000} = {}) {
  let current = null, disposed = false, generation = 0;
  const primed=new Map();
  function prime(clip){
    if(disposed||!clip?.src||primed.has(clip.id)||typeof AudioClass!=='function')return;
    try{const audio=new AudioClass();audio.preload='auto';audio.src=clip.src;audio.load?.();primed.set(clip.id,audio);}catch{}
  }
  function stopCurrent() { current?.stop(); }
  function play(clip, {onPlaying: onLinePlaying = () => {}, onEnded = () => {}, onError = () => {}} = {}) {
    stopCurrent();
    if (disposed) return {stop() {}};
    const token = ++generation;
    let audio, detached, stopped = false, sounding = false, buffering = false, startTimer = null, playbackTimer = null, started = false;
    const listeners = [];
    const valid = () => !disposed && !stopped && generation === token;
    function stop() {
      if (stopped) return;
      stopped = true;
      if (startTimer !== null) clearTimer(startTimer);
      if (playbackTimer !== null) clearTimer(playbackTimer);
      startTimer = playbackTimer = null;
      listeners.splice(0).forEach(([type,handler]) => audio?.removeEventListener(type,handler));
      try { audio?.pause(); } catch {}
      if (sounding) { sounding = false; onPlaying(false); }
      try { audio?.removeAttribute('src'); audio?.load(); } catch {}
      if (typeof detached === 'function') detached(); else audio?.remove?.();
      if (current?.token === token) current = null;
    }
    const owner = {stop,token,get frame(){return {kind:clip?.id,time:audio?.currentTime||0,playing:sounding&&!buffering&&!audio?.paused&&!stopped};}}; current = owner;
    function finish(failure) { if (!valid()) return; stop(); failure ? onError() : onEnded(); }
    try {
      if (typeof AudioClass !== 'function' || !clip?.src) throw Error('Voice unavailable');
      audio = primed.get(clip.id)||new AudioClass();primed.delete(clip.id); audio.preload = 'auto'; audio.hidden = true;
      if (audio.dataset) audio.dataset.woodyTour = clip.id||'';
      detached = mountAudio(audio);
      const listen = (type,handler) => {audio.addEventListener(type,handler); listeners.push([type,handler]);};
      listen('playing', () => {
        if (!valid()) return;
        buffering = false;
        if (startTimer !== null) { clearTimer(startTimer); startTimer = null; }
        if (!started) {
          started = true;
          if(audio.dataset)audio.dataset.playingAt=String(globalThis.performance?.now?.()||0);
          const duration = Number(clip.durationSeconds);
          const deadline = Number.isFinite(duration) && duration > 0 ? duration * 1000 + 5000 : 45000;
          playbackTimer = setTimer(() => finish(true), deadline);
        }
        if (!sounding) {sounding=true; onPlaying(true);} onLinePlaying();
      });
      // `paused` stays false during native buffering. Freeze speech gestures
      // until media really resumes, without restarting its clock or allowing
      // short music bursts between buffered fragments. The watchdog still
      // bounds the quiet period. `stalled` alone may retain playable data.
      listen('waiting', () => { if (valid()) buffering = true; });
      listen('ended', () => finish(false)); listen('error', () => finish(true));
      // Native media pauses at natural completion before dispatching `ended`.
      // That pause is successful completion in progress, not a playback error.
      listen('pause', () => {if (valid() && !audio.ended) finish(true);});
      if(audio.src!==clip.src)audio.src = clip.src;
      const contextualDeadline=clip.id==='ramp-airborne'?350:clip.id==='feedback-nearby'?1500:null;
      startTimer = setTimer(() => finish(true), contextualDeadline??(Number.isFinite(startDeadlineMs) && startDeadlineMs > 0 ? startDeadlineMs : 8000));
      Promise.resolve(audio.play()).catch(() => finish(true));
    } catch { finish(true); }
    return owner;
  }
  return {prime,get frame(){return current?.frame||null;},play, stop:stopCurrent, dispose() { if (disposed) return; stopCurrent(); disposed=true;generation++;for(const audio of primed.values()){try{audio.removeAttribute('src');audio.load?.();}catch{}}primed.clear(); }};
}
