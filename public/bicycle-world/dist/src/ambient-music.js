import {MUSIC_TRACKS,DEFAULT_MUSIC_TRACK_ID} from './music-catalog.js';
import {AUDIO_MIX} from './audio-mix.js';
const STORAGE_KEY = 'lakshya-ambient-music-enabled';
const TRACK_STORAGE_KEY = 'lakshya-ambient-track';
const LEVEL_STORAGE_KEY = 'lakshya-ambient-music-level';
const boundedLevel = (value, fallback) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

/** One optional music owner. Constructing it never creates or requests audio.
 * Suspensions are independent: leaving a recording cannot override a hidden tab
 * or Normal mode. A saved preference never starts sound on a fresh page. */
export function createAmbientMusic({
  onStatus = () => {},
  audioFactory = () => new Audio(),
  storage,
  requestFrame = callback => globalThis.requestAnimationFrame(callback),
  cancelFrame = id => globalThis.cancelAnimationFrame(id),
  now = () => globalThis.performance.now(),
  setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimer = id => globalThis.clearTimeout(id),
  source,
  tracks = MUSIC_TRACKS,
  trackId,
  volume = AUDIO_MIX.musicCeiling,
  level,
  fadeMs = 350,
  loop = false,
  repeatPauseMs = 1400
} = {}) {
  // The visitor's 0–100% range controls an authored music ceiling, not the
  // operating-system volume or a percentage of the complete sound mix.
  const volumeCeiling = boundedLevel(volume, AUDIO_MIX.musicCeiling);
  const reasons = new Set();
  let store = storage;
  if (store === undefined) { try { store = globalThis.localStorage; } catch { store = null; } }
  let rememberedPreference = false;
  try { rememberedPreference = store?.getItem(STORAGE_KEY) === '1'; } catch { /* Storage is optional. */ }
  let savedTrack;
  try { savedTrack = store?.getItem(TRACK_STORAGE_KEY); } catch { /* Track selection is optional. */ }
  let savedLevel;
  try {
    const value = store?.getItem(LEVEL_STORAGE_KEY);
    if (typeof value === 'string' && value.trim() !== '') savedLevel = Number(value);
  } catch { /* Music level works without storage. */ }
  let musicLevel = boundedLevel(level, boundedLevel(savedLevel, AUDIO_MIX.musicLevel));
  const targetVolume = () => volumeCeiling * musicLevel;
  let selectedTrack = tracks.find(track => track.id === (trackId ?? savedTrack))
    || tracks.find(track => track.id === DEFAULT_MUSIC_TRACK_ID) || tracks[0];
  let selectedSource = source ?? selectedTrack.source;
  let audio = null, enabled = false, disposed = false, status = 'off', error = null;
  let generation = 0, frame = null, timer = null, tailFading = false, retryStatus = null;
  const listeners = [];

  function snapshot() {
    return {
      enabled, status, rememberedPreference, trackId:selectedTrack.id, suspendedReasons: [...reasons], error,
      created: Boolean(audio), playing: Boolean(audio && !audio.paused),
      pendingFade: frame !== null, pendingRepeat: timer !== null, retryRequired: retryStatus !== null,
      level: musicLevel, musicGain: targetVolume()
    };
  }
  function publish(next = status) { status = next; onStatus(snapshot()); }
  function remember(value) {
    rememberedPreference = value;
    try { store?.setItem(STORAGE_KEY, value ? '1' : '0'); } catch { /* Playback does not depend on storage. */ }
  }
  function wantsPlayback() { return enabled && !disposed && reasons.size === 0; }
  function cancelFade() { if (frame !== null) cancelFrame(frame); frame = null; }
  function cancelRepeat() { if (timer !== null) clearTimer(timer); timer = null; }
  function pauseImmediately() {
    cancelFade(); cancelRepeat(); tailFading = false;
    if (audio) { audio.volume = 0; audio.pause(); }
  }
  function fadeTo(value, duration = fadeMs, complete = () => {}) {
    cancelFade();
    if (!audio || disposed) return;
    const initial = audio.volume, start = now();
    if (duration <= 0 || Math.abs(initial - value) < 0.0001) { audio.volume = value; complete(); return; }
    function tick() {
      frame = null;
      if (disposed || !audio) return;
      const progress = Math.min(1, Math.max(0, (now() - start) / duration));
      const eased = progress * progress * (3 - 2 * progress);
      audio.volume = initial + (value - initial) * eased;
      if (progress < 1) frame = requestFrame(tick);
      else { audio.volume = value; complete(); }
    }
    frame = requestFrame(tick);
  }
  function requireRetry(message, next = 'blocked') {
    generation++; retryStatus = next; status = next; error = message;
    // Set the retry state before pausing so our own native pause event cannot
    // be mistaken for another browser interruption.
    pauseImmediately(); publish(next);
  }
  function failure(cause) {
    const blocked = cause?.name === 'NotAllowedError';
    requireRetry(blocked
      ? 'Your browser paused the garden sound. Select Retry garden sound to try again.'
      : 'Garden sound could not load. Select Retry garden sound to try again.', blocked ? 'blocked' : 'error');
  }
  function ensureAudio() {
    if (audio) return audio;
    audio = audioFactory();
    audio.preload = 'none'; audio.loop = loop; audio.volume = 0;
    const listen = (name, callback) => { audio.addEventListener(name, callback); listeners.push([name, callback]); };
    listen('error', () => { if (wantsPlayback()) failure(audio.error); });
    listen('pause', () => {
      if (!wantsPlayback() || !audio.paused || audio.ended || !['starting','playing'].includes(status)) return;
      requireRetry('Your browser paused the garden sound. Select Retry garden sound to try again.');
    });
    listen('timeupdate', () => {
      if (loop || !wantsPlayback() || audio.paused || tailFading || !Number.isFinite(audio.duration)) return;
      const remaining = audio.duration - audio.currentTime;
      if (remaining > 0 && remaining <= 1.2) {
        tailFading = true;
        fadeTo(0, Math.max(0, remaining * 1000 - 100));
      }
    });
    listen('ended', () => {
      if (loop || retryStatus) return;
      cancelFade(); audio.volume = 0; tailFading = false;
      if (!wantsPlayback()) return;
      cancelRepeat();
      publish('between-tracks');
      timer = setTimer(() => {
        timer = null;
        if (!wantsPlayback()) return;
        audio.currentTime = 0;
        void start();
      }, repeatPauseMs);
    });
    audio.src = selectedSource;
    return audio;
  }
  async function start() {
    if (retryStatus) { publish(retryStatus); return false; }
    if (!wantsPlayback()) { publish(enabled ? 'paused' : 'off'); return false; }
    const attempt = ++generation;
    cancelFade(); cancelRepeat(); tailFading = false; error = null;
    try {
      const current = ensureAudio();
      if (current.ended) current.currentTime = 0;
      current.volume = 0;
      publish('starting');
      // Calling play here keeps the first attempt within the user's activation.
      await current.play();
      if (attempt !== generation || !wantsPlayback()) {
        if (!wantsPlayback()) { current.volume = 0; current.pause(); }
        return false;
      }
      publish('playing');
      fadeTo(targetVolume());
      return true;
    } catch (cause) {
      if (attempt === generation && wantsPlayback()) failure(cause);
      return false;
    }
  }
  async function setEnabled(value) {
    if (disposed) return false;
    const next = Boolean(value), retry = status === 'blocked' || status === 'error';
    if (next === enabled && !retry) {
      if (next && status === 'off') return start();
      return next && status === 'playing';
    }
    enabled = next; remember(next); error = null; retryStatus = null;
    if (!next) {
      generation++; cancelRepeat(); tailFading = false;
      publish('off');
      if (audio && !audio.paused) fadeTo(0, fadeMs, () => { audio.pause(); });
      else pauseImmediately();
      return false;
    }
    if (retry && audio) audio.load();
    return start();
  }
  function setSuspensions(updates) {
    if (disposed) return;
    const wasSuspended = reasons.size > 0;
    let changed = false;
    for (const [reason, value] of Object.entries(updates)) {
      if (!reason || reasons.has(reason) === Boolean(value)) continue;
      if (value) reasons.add(reason); else reasons.delete(reason);
      changed = true;
    }
    if (!changed) return;
    if (retryStatus) {
      if (reasons.size && !wasSuspended) { generation++; pauseImmediately(); }
      publish(retryStatus); return;
    }
    // Apply a complete visibility/media snapshot before considering playback.
    // Swapping one suspension reason for another must not call play() in between.
    if (reasons.size) {
      if (!wasSuspended) { generation++; pauseImmediately(); }
      publish(enabled ? 'paused' : 'off');
    } else if (enabled) { void start(); }
    else publish('off');
  }
  function setSuspended(reason, value) {
    if (reason) setSuspensions({[reason]:value});
  }
  function setTrack(id) {
    if (disposed) return false;
    const next = tracks.find(track => track.id === id);
    if (!next || next === selectedTrack && selectedSource === next.source) return false;
    generation++; status = enabled ? 'paused' : 'off'; retryStatus = null; pauseImmediately(); error = null;
    selectedTrack = next; selectedSource = next.source;
    try { store?.setItem(TRACK_STORAGE_KEY,next.id); } catch { /* Selection works without storage. */ }
    if (audio) {
      audio.src = selectedSource;
      audio.load();
    }
    publish(enabled ? 'paused' : 'off');
    if (wantsPlayback()) void start();
    return true;
  }
  function setLevel(value) {
    if (disposed || !Number.isFinite(value)) return false;
    const next = boundedLevel(value, musicLevel);
    if (next === musicLevel) return false;
    musicLevel = next;
    try { store?.setItem(LEVEL_STORAGE_KEY, String(next)); } catch { /* Playback does not depend on storage. */ }
    // A level change cannot start playback, cancel a mute or replace the final
    // track fade. A pending successful play reads the latest target itself.
    if (audio && wantsPlayback() && status === 'playing' && !audio.paused && !tailFading) fadeTo(targetVolume(), 180);
    publish();
    return true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true; enabled = false; generation++; pauseImmediately();
    if (audio) {
      for (const [name, callback] of listeners) audio.removeEventListener(name, callback);
      listeners.length = 0;
      audio.removeAttribute('src'); audio.load();
    }
    reasons.clear(); error = null; retryStatus = null; publish('disposed');
  }
  publish();
  return {
    setEnabled,
    toggle: () => setEnabled(status === 'blocked' || status === 'error' ? true : !enabled),
    setSuspended, setSuspensions, setTrack, setLevel, dispose,
    get enabled() { return enabled; },
    diagnostics: snapshot
  };
}
