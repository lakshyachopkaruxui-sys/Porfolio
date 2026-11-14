import {createOakNarration} from './oak-narration.js';
import {OAK_RECORDED_VOICE, OAK_VOICE_CLIPS} from './oak-voice-clips.js';

const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();

/** One lazily loaded performance at a time, with the installed Mark voice as fallback. */
export function createOakRecordedNarration({
  onState = () => {},
  audioFactory = typeof globalThis.Audio === 'function' ? () => new globalThis.Audio() : null,
  audioParent = globalThis.document?.body,
  fallbackFactory = createOakNarration,
  clips = OAK_VOICE_CLIPS,
  timers = {},
} = {}) {
  const schedule = timers.setTimeout || globalThis.setTimeout.bind(globalThis);
  const unschedule = timers.clearTimeout || globalThis.clearTimeout.bind(globalThis);
  const byText = new Map(clips.map(clip => [normalize(clip.text), clip]));
  const recordedAvailable = typeof audioFactory === 'function';
  let audio = null, active = false, paused = false, disposed = false, disposing = false, engine = 'none';
  let generation = 0, playAttempt = 0, startupTimer = null, selectedVoice = '', currentText = '', removeListeners = () => {};
  let currentClip = null;
  let recordedPlaying = false;

  function cueIndex() {
    const cues = currentClip?.cues || [];
    const time = Number(audio?.currentTime) || 0;
    return Math.max(0, cues.findLastIndex(cue => cue.start <= time));
  }
  function emit(status, error) {
    const cues = currentClip?.cues || [], index = cueIndex();
    onState(active, error, {status, sentence: cues[index]?.text || currentText, index, total: cues.length || 1,
      paused, voiceId: OAK_RECORDED_VOICE.id, engine: 'recorded'});
  }
  const fallback = fallbackFactory({onState(value, error, details = {}) {
    if (disposed || engine !== 'device') return;
    active = value;
    paused = Boolean(details.paused);
    onState(value, error, {...details, engine: 'device', fallback: prefersRecorded()});
  }});
  const prefersRecorded = () => recordedAvailable && (!selectedVoice || selectedVoice === OAK_RECORDED_VOICE.id);

  function clearStartup() {
    if (startupTimer !== null) unschedule(startupTimer);
    startupTimer = null;
  }
  function releaseAudio() {
    recordedPlaying = false;
    playAttempt++;
    clearStartup();
    removeListeners();
    removeListeners = () => {};
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  function stop() {
    if (disposed) return;
    generation++;
    engine = 'none';
    active = paused = false;
    currentClip = null;
    releaseAudio();
    fallback.stop();
    emit('idle');
  }
  function useDevice() {
    if (disposed || disposing) return false;
    generation++;
    engine = 'none';
    currentClip = null;
    releaseAudio();
    fallback.stop();
    fallback.setVoice(prefersRecorded() ? '' : selectedVoice);
    engine = 'device';
    active = true;
    paused = false;
    return fallback.read(currentText);
  }
  function ensureAudio() {
    if (audio) return audio;
    audio = audioFactory();
    audio.preload = 'auto';
    audio.hidden = true;
    audio.loop = false;
    audio.volume = 1;
    audio.playbackRate = 1;
    audio.setAttribute('data-oak-narration-media', '');
    audioParent?.append(audio);
    return audio;
  }
  function watchRecording(token, attempt) {
    clearStartup();
    startupTimer = schedule(() => {
      startupTimer = null;
      if (!disposed && generation === token && playAttempt === attempt && engine === 'recorded' && active && !paused) useDevice();
    }, 12000);
  }
  function playRecording(token) {
    if (disposed || disposing || generation !== token || engine !== 'recorded' || paused) return false;
    recordedPlaying = false;
    const attempt = ++playAttempt;
    watchRecording(token, attempt);
    try {
      const result = audio.play();
      result?.catch(() => {
        if (!disposed && generation === token && playAttempt === attempt && engine === 'recorded' && !paused) useDevice();
      });
      return true;
    } catch {
      return useDevice();
    }
  }
  function read(text) {
    if (disposed || disposing) return false;
    const stoppedGeneration = generation + 1;
    stop();
    if (disposed || disposing || generation !== stoppedGeneration) return false;
    currentText = normalize(text);
    if (!currentText) return false;
    const clip = prefersRecorded() && byText.get(currentText);
    if (!clip) return useDevice();
    const token = ++generation;
    engine = 'recorded';
    currentClip = clip;
    active = true;
    paused = false;
    try {
      const player = ensureAudio();
      player.volume = 1;
      player.playbackRate = 1;
      const owned = () => !disposed && generation === token && engine === 'recorded';
      let lastCue = -1;
      const events = {
        playing() {
          if (!owned()) return;
          if (paused) { player.pause(); return; }
          recordedPlaying = true;
          lastCue = cueIndex();
          clearStartup();
          emit('speaking');
        },
        waiting() {
          if (!owned() || paused) return;
          recordedPlaying = false;
          emit('loading');
          if (owned() && !paused) watchRecording(token, playAttempt);
        },
        pause() {
          if (!owned() || player.ended || !player.paused) return;
          recordedPlaying = false;
          playAttempt++;
          clearStartup();
          paused = true;
          emit('paused');
        },
        ended() {
          if (!owned()) return;
          generation++;
          engine = 'none';
          active = paused = false;
          currentClip = null;
          releaseAudio();
          emit('complete');
        },
        error() { if (owned() && !paused) useDevice(); },
        timeupdate() {
          if (!owned() || !recordedPlaying || paused) return;
          const next = cueIndex();
          if (next !== lastCue) { lastCue = next; emit('speaking'); }
        },
      };
      for (const [name, handler] of Object.entries(events)) player.addEventListener(name, handler);
      removeListeners = () => {
        for (const [name, handler] of Object.entries(events)) player.removeEventListener(name, handler);
      };
      player.src = clip.src;
      emit('loading');
      return playRecording(token);
    } catch {
      return useDevice();
    }
  }
  function pause() {
    if (disposed || disposing || !active || paused) return false;
    if (engine === 'device') return fallback.pause();
    playAttempt++;
    recordedPlaying = false;
    paused = true;
    clearStartup();
    audio?.pause();
    emit('paused');
    return true;
  }
  function resume() {
    if (disposed || disposing || !active || !paused) return false;
    if (engine === 'device') return fallback.resume();
    if (engine === 'pending') return read(currentText);
    const token = generation;
    paused = false;
    emit('starting');
    return playRecording(token);
  }
  function getVoices() {
    return [...(recordedAvailable ? [OAK_RECORDED_VOICE] : []), ...fallback.getVoices()];
  }
  function setVoice(id = '') {
    if (disposed || disposing || (id && !getVoices().some(voice => voice.id === id))) return false;
    if (selectedVoice === id) return true;
    const wasActive = active, wasPaused = paused, text = currentText;
    const stoppedGeneration = generation + 1;
    stop();
    if (disposed || disposing || generation !== stoppedGeneration) return false;
    selectedVoice = id;
    if (wasActive && wasPaused) {
      currentText = text;
      active = paused = true;
      engine = 'pending';
      emit('paused');
    } else if (wasActive) read(text);
    return true;
  }
  return {
    available: recordedAvailable || fallback.available,
    read, stop, pause, resume, setVoice, getVoices,
    subscribeVoices(listener) { return fallback.subscribeVoices(() => listener(getVoices())); },
    togglePause: () => paused ? resume() : pause(),
    get speaking() { return active; },
    get paused() { return paused; },
    get voiceId() { return selectedVoice; },
    dispose() {
      if (disposed || disposing) return;
      disposing = true;
      stop();
      disposed = true;
      fallback.dispose();
      audio?.remove();
      audio = null;
    },
  };
}
