import {AUDIO_MIX} from './audio-mix.js';

const FILES = {
  pikachu: ['pokemon-voices/pikachu-anime-candidate.mp3', 'anime-candidate'],
  bulbasaur: ['pokemon-voices/bulbasaur-anime-candidate.mp3', 'anime-candidate'],
  charmander: ['pokemon-voices/charmander-anime-candidate.mp3', 'anime-candidate'],
  charizard: ['pokemon-voices/charizard-anime-candidate.mp3', 'anime-candidate'],
  // The untouched game recordings are 14–17 dB hotter than the short anime
  // candidates. Source-specific trims balance them without rewriting assets.
  vaporeon: ['pokemon-audio/vaporeon.ogg', 'game-cry', .15],
  articuno: ['pokemon-audio/articuno.ogg', 'game-cry', .19],
};
const bounded = (value, minimum, maximum, fallback) => Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;

/** Short source-labelled calls; the four anime candidates have no verified dub. */
export function createPokemonAudio({
  contextFactory = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
  fetcher = globalThis.fetch,
  onState,
} = {}) {
  let context, enabled = false, disposed = false, intent = 0, playIntent = 0;
  let lastCry = -Infinity, voice = null, voiceGain = null, voicePan = null;
  let playingId = null, playedCount = 0, lastPlayedId = null, sourceKind = null;
  let emittedState = '';
  const buffers = new Map(), controller = new AbortController();
  const snapshot = () => Object.freeze({enabled, playingId, playedCount, lastPlayedId, sourceKind});
  emittedState = JSON.stringify(snapshot());

  function emitState() {
    const status = snapshot(), signature = JSON.stringify(status);
    if (signature === emittedState) return;
    emittedState = signature;
    try { onState?.(status); } catch { /* Diagnostics must not interrupt sound controls. */ }
  }
  function releaseVoice() {
    if (voice) {
      voice.onended = null;
      try { voice.stop(); } catch { /* A completed source may already be stopped. */ }
      voice.disconnect();
      voice = null;
    }
    voiceGain?.disconnect(); voiceGain = null;
    voicePan?.disconnect(); voicePan = null;
    playingId = null;
  }
  function stop() { playIntent++; releaseVoice(); emitState(); }

  async function setEnabled(value) {
    const request = ++intent;
    if (!value || disposed) { enabled = false; stop(); return false; }
    try {
      context ??= contextFactory();
      await context.resume();
      if (request !== intent || disposed) return false;
      enabled = context.state === 'running';
      emitState();
      return enabled;
    } catch {
      if (request === intent && !disposed) { enabled = false; stop(); }
      return false;
    }
  }

  async function play(id, {gain: attenuation = 1, pan = 0} = {}) {
    const file = FILES[id], level = bounded(attenuation, 0, 1, 1);
    if (!enabled || disposed || !file || level === 0 || context?.state !== 'running' || context.currentTime - lastCry < 2) return false;
    const request = intent, playRequest = ++playIntent;
    lastCry = context.currentTime;
    let pending;
    try {
      if (!buffers.has(id)) {
        buffers.set(id, Promise.resolve(fetcher(new URL(`../assets/${file[0]}`, import.meta.url), {signal: controller.signal})).then(response => {
          if (!response.ok) throw new Error('Pokémon recording unavailable.');
          return response.arrayBuffer();
        }).then(bytes => context.decodeAudioData(bytes)));
      }
      pending = buffers.get(id);
      const buffer = await pending;
      if (disposed || !enabled || request !== intent || playRequest !== playIntent || context.state !== 'running') return false;
      releaseVoice();
      const source = context.createBufferSource(), gain = context.createGain();
      const panner = context.createStereoPanner?.() ?? null;
      source.buffer = buffer;
      gain.gain.value = AUDIO_MIX.pokemon * level * (file[2] ?? 1);
      source.connect(gain);
      if (panner) { panner.pan.value = bounded(pan, -1, 1, 0); gain.connect(panner); panner.connect(context.destination); }
      else gain.connect(context.destination);
      voice = source; voiceGain = gain; voicePan = panner;
      source.onended = () => {
        source.disconnect(); gain.disconnect(); panner?.disconnect();
        if (voice === source) { voice = null; voiceGain = null; voicePan = null; playingId = null; emitState(); }
      };
      source.start();
      playingId = id; lastPlayedId = id; sourceKind = file[1]; playedCount++;
      emitState();
      return true;
    } catch {
      if (buffers.get(id) === pending) buffers.delete(id);
      if (playRequest === playIntent && playingId === null) { releaseVoice(); emitState(); }
      return false;
    }
  }

  return {
    setEnabled, play, stop,
    get enabled() { return enabled; },
    // sourceKind describes the last successfully started call, including after it ends.
    get status() { return snapshot(); },
    dispose() {
      if (disposed) return;
      disposed = true; enabled = false; intent++; stop();
      controller.abort(); buffers.clear(); context?.close();
    },
  };
}
