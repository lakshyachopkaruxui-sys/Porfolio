/** Plays only supplied recordings. Missing clips remain a silent, readable UI. */
export function createWelcomeRecordings({clips = {}, AudioClass = globalThis.Audio, mountAudio = () => {}, onState = () => {}} = {}) {
  const supported = typeof AudioClass === 'function';
  let enabled = false, speaking = false, disposed = false, active = null, kind = null, error = null, generation = 0, playback = 'idle';

  function clipFor(name) {
    const clip = clips?.[name];
    return clip && typeof clip.src === 'string' && clip.src.trim() ? clip : null;
  }
  function available(name) { return !disposed && supported && Boolean(clipFor(name)); }
  function emit() {
    try { onState(Object.freeze({enabled, supported, speaking, kind, error, playback})); } catch {}
  }
  function release(audio) {
    if (!audio) return;
    audio.onplaying = null; audio.onended = null; audio.onerror = null;
    try { audio.pause(); } catch {}
    try { audio.currentTime = 0; } catch {}
    try {
      if (typeof audio.removeAttribute === 'function') audio.removeAttribute('src');
      else audio.src = '';
      audio.load?.();
    } catch {}
    try { audio.remove?.(); } catch {}
  }
  function stop() {
    generation++;
    const previous = active;
    active = null; speaking = false; kind = null; playback = 'idle';
    release(previous); emit();
  }
  function setEnabled(value) {
    enabled = Boolean(value) && supported && !disposed && Object.keys(clips || {}).some(name => Boolean(clipFor(name)));
    error = null;
    if (!enabled) stop(); else emit();
    return enabled;
  }
  function play(name) {
    if (!enabled) return false;
    if (!available(name)) {
      // A missing next recording must not carry the previous scene's speech
      // into new instructions. The written next step remains the fallback.
      stop(); return false;
    }
    const clip = clipFor(name);
    stop(); error = null;
    const token = generation;
    let audio;
    const current = () => !disposed && active === audio && token === generation;
    const finish = message => {
      if (!current()) return;
      active = null; speaking = false; kind = null; error = message; playback = message ? 'error' : 'idle';
      release(audio); emit();
    };
    try {
      // A fresh element has no old media events waiting for its new handlers.
      // Only one element is owned at a time; stop releases its source first.
      audio = new AudioClass();
      audio.preload = 'none';
      audio.src = clip.src.trim();
      audio.onplaying = () => { if (current()) { speaking = true; playback = 'playing'; emit(); } };
      audio.onended = () => finish(null);
      audio.onerror = () => finish('recording-unavailable');
      active = audio; speaking = true; kind = name; playback = 'loading';
      mountAudio(audio, name);
      const playbackPromise = audio.play();
      // Invocation remains synchronous so a click retains its browser audio
      // permission. A rejected promise updates captions, never navigation.
      if (playbackPromise && typeof playbackPromise.then === 'function') Promise.resolve(playbackPromise).catch(() => finish('playback-unavailable'));
      emit();
      return true;
    } catch {
      if (active === audio) { active = null; speaking = false; kind = null; }
      release(audio); error = 'recording-unavailable'; playback = 'error'; emit();
      return false;
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; enabled = false; stop();
  }
  return {
    get enabled() { return enabled; }, get supported() { return supported; }, get speaking() { return speaking; }, get playback() { return playback; },
    available, setEnabled, play, stop, dispose,
  };
}
