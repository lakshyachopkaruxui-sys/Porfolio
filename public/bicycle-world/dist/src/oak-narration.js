// Ordinary voices supplied by the browser. This controller stays silent until
// read() is called; it does not load audio assets or imitate a character voice.
const voiceId = voice => `${voice.name}|${voice.lang}`;

function voiceScore(voice) {
  if (!/^en(?:[-_]|$)/i.test(voice.lang)) return -1;
  // Prefer the owner's chosen voice when the device provides it.
  if (/^Microsoft Mark(?:\s|-|$)/i.test(voice.name) && /^en[-_]US$/i.test(voice.lang)) return 1000;
  return (/natural|neural|premium|enhanced/i.test(voice.name) ? 60 : 0)
    + (/google/i.test(voice.name) ? 12 : 0)
    + (/^en-IN$/i.test(voice.lang) ? 10 : /^en-US$/i.test(voice.lang) ? 8 : 0)
    + (voice.default ? 4 : 0) + (voice.localService ? 2 : 0);
}

function pauseAfter(text, paragraphEnd = false) {
  if (paragraphEnd) return 500;
  if (/[!?]["'”’)]*$/.test(text)) return 440;
  if (/\.["'”’)]*$/.test(text)) return 360;
  if (/[;:]["'”’)]*$/.test(text)) return 300;
  return 240;
}

function sentencesFor(text) {
  const source = String(text ?? '').replace(/\r\n?/g, '\n').trim();
  if (!source) return [];
  const paragraphs = source.split(/\n\s*\n/);
  const segments = paragraphs.flatMap((paragraph, paragraphIndex) => {
    const value = paragraph.trim();
    const parts = typeof Intl.Segmenter === 'function'
      ? [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(value)].map(item => item.segment)
      : value.match(/[^.!?]+(?:[.!?]+["'”’)]*|$)\s*/gu) || [value];
    return parts.map((text, partIndex) => ({ text, paragraphEnd: paragraphIndex < paragraphs.length - 1 && partIndex === parts.length - 1 }));
  });
  const sentences = [];
  for (const segment of segments) {
    let remainder = segment.text.trim().replace(/\s+/g, ' ');
    // Short utterances avoid one long, flat delivery. Prefer existing clause
    // punctuation when a source sentence needs an additional breath.
    while (remainder.length > 160) {
      const window = remainder.slice(0, 160);
      const clauseEnds = [...window.matchAll(/[,;:]\s/gu)];
      const clause = clauseEnds.filter(match => match.index >= 45).at(-1);
      const boundary = clause ? clause.index + 1 : window.lastIndexOf(' ');
      if (boundary <= 0) break;
      const sentence = remainder.slice(0, boundary).trim();
      sentences.push({ text: sentence, pause: pauseAfter(sentence) });
      remainder = remainder.slice(boundary).trim();
    }
    if (remainder) sentences.push({ text: remainder, pause: pauseAfter(remainder, segment.paragraphEnd) });
  }
  return sentences;
}

export function createOakNarration({
  synthesis = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  onState = () => {},
  timers = {},
} = {}) {
  const schedule = timers.setTimeout || globalThis.setTimeout.bind(globalThis);
  const unschedule = timers.clearTimeout || globalThis.clearTimeout.bind(globalThis);
  const now = timers.now || (() => globalThis.performance?.now() ?? Date.now());
  const available = Boolean(synthesis && typeof synthesis.speak === 'function'
    && typeof synthesis.cancel === 'function' && typeof Utterance === 'function');
  const voiceListeners = new Set();
  let current = null, generation = 0, active = false, isPaused = false, disposed = false;
  let sentences = [], index = 0, phase = 'idle', selectedVoiceId = '';
  let gapTimer = null, gapDeadline = 0, gapRemaining = 0, gapGeneration = 0;

  function nativeVoices() {
    try { return synthesis?.getVoices?.() || []; } catch { return []; }
  }
  function getVoices() {
    return nativeVoices().map(voice => ({
      id: voiceId(voice), name: voice.name, lang: voice.lang,
      localService: Boolean(voice.localService), default: Boolean(voice.default),
    }));
  }
  function chosenVoice() {
    const voices = nativeVoices();
    return voices.find(voice => voiceId(voice) === selectedVoiceId)
      || voices.filter(voice => voiceScore(voice) >= 0).sort((a, b) => voiceScore(b) - voiceScore(a))[0];
  }
  function emit(status, error) {
    onState(active, error, {
      status, sentence: sentences[index]?.text || '', index, total: sentences.length,
      paused: isPaused, voiceId: current?.voice ? voiceId(current.voice) : voiceIdOrEmpty(chosenVoice()),
    });
  }
  function detach(utterance) {
    if (!utterance) return;
    utterance.onstart = null;
    utterance.onend = null;
    utterance.onerror = null;
  }
  function clearGap() {
    gapGeneration++;
    if (gapTimer !== null) unschedule(gapTimer);
    gapTimer = null;
    gapDeadline = 0;
    gapRemaining = 0;
  }
  function cancelOwned() {
    generation++;
    const owned = active || current !== null;
    const wasPaused = isPaused;
    clearGap();
    detach(current);
    current = null;
    active = false;
    isPaused = false;
    phase = 'idle';
    if (owned) {
      try { synthesis.cancel(); } catch { /* State still releases if the device engine has closed. */ }
      // cancel() does not reset the synthesis object's paused state.
      if (wasPaused) { try { synthesis.resume?.(); } catch { /* No queued speech remains. */ } }
    }
  }
  function stop() {
    if (disposed) return;
    cancelOwned();
    emit('idle');
  }
  function fail(error) {
    const message = error === 'not-allowed' || error?.name === 'NotAllowedError'
      ? 'Your browser blocked narration. Press Replay to start Oak’s voice, or keep reading the text.'
      : 'Read aloud is unavailable here. Press Replay to try again, or keep reading the text.';
    cancelOwned();
    emit('error', message);
  }
  function scheduleGap() {
    if (disposed || !active || isPaused || phase !== 'gap') return;
    const token = generation;
    const gapToken = ++gapGeneration;
    gapDeadline = now() + gapRemaining;
    gapTimer = schedule(() => {
      if (disposed || generation !== token || gapGeneration !== gapToken || !active || isPaused || phase !== 'gap') return;
      gapTimer = null;
      gapRemaining = 0;
      gapDeadline = 0;
      index++;
      speakSentence();
    }, gapRemaining);
  }
  function speakSentence() {
    if (disposed || !active || isPaused) return false;
    const token = generation;
    let rejected = false;
    try {
      const utterance = new Utterance(sentences[index].text);
      const voice = chosenVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || 'en-IN';
      utterance.rate = .89;
      utterance.pitch = .96;
      utterance.volume = .9;
      current = utterance;
      phase = 'utterance';
      const ownsEvent = () => !disposed && active && generation === token && current === utterance;
      utterance.onstart = () => { if (ownsEvent()) emit(isPaused ? 'paused' : 'speaking'); };
      utterance.onerror = event => { if (ownsEvent()) { rejected = true; fail(event?.error); } };
      utterance.onend = () => {
        if (!ownsEvent()) return;
        detach(utterance);
        current = null;
        if (index === sentences.length - 1) {
          const wasPaused = isPaused;
          active = false;
          isPaused = false;
          phase = 'idle';
          if (wasPaused) { try { synthesis.resume?.(); } catch { /* Narration is complete. */ } }
          emit('complete');
          return;
        }
        phase = 'gap';
        gapRemaining = sentences[index].pause;
        emit(isPaused ? 'paused' : 'gap');
        if (!isPaused) scheduleGap();
      };
      emit('speaking');
      if (!ownsEvent()) return false;
      // A previous owned pause has already been released by cancelOwned().
      synthesis.speak(utterance);
      return !rejected;
    } catch (error) {
      if (generation === token && active) fail(error);
      return false;
    }
  }
  function read(text) {
    if (disposed) return false;
    cancelOwned();
    sentences = sentencesFor(text);
    index = 0;
    if (!sentences.length) { emit('idle'); return false; }
    if (!available) {
      emit('unavailable', 'Read aloud is unavailable in this browser. You can keep reading the text.');
      return false;
    }
    active = true;
    return speakSentence();
  }
  function pause() {
    if (disposed || !active || isPaused) return false;
    isPaused = true;
    if (phase === 'gap' && gapTimer !== null) {
      gapRemaining = Math.max(0, gapDeadline - now());
      gapGeneration++;
      unschedule(gapTimer);
      gapTimer = null;
    } else if (current) {
      try {
        if (typeof synthesis.pause !== 'function' || typeof synthesis.resume !== 'function') throw Error('Pause unavailable');
        synthesis.pause();
      } catch {
        // A limited engine can still pause safely, restarting this short
        // sentence on Resume instead of leaving the voice running.
        generation++;
        detach(current);
        current = null;
        try { synthesis.cancel(); } catch { /* The controller is already paused. */ }
      }
    }
    emit('paused');
    return true;
  }
  function resume() {
    if (disposed || !active || !isPaused) return false;
    isPaused = false;
    if (phase === 'gap') {
      emit('gap');
      scheduleGap();
    } else if (current) {
      try { synthesis.resume(); emit('speaking'); } catch (error) { fail(error); return false; }
    } else return speakSentence();
    return true;
  }
  function setVoice(id = '') {
    if (disposed || (id && !nativeVoices().some(voice => voiceId(voice) === id))) return false;
    if (selectedVoiceId === id) return true;
    selectedVoiceId = id;
    if (active) {
      const wasPaused = isPaused;
      cancelOwned();
      active = true;
      isPaused = wasPaused;
      phase = 'utterance';
      if (wasPaused) emit('paused');
      else speakSentence();
    }
    return true;
  }
  function subscribeVoices(listener) {
    if (disposed || typeof listener !== 'function') return () => {};
    voiceListeners.add(listener);
    listener(getVoices());
    return () => voiceListeners.delete(listener);
  }
  const voicesChanged = () => {
    if (disposed) return;
    const voices = getVoices();
    for (const listener of voiceListeners) listener(voices);
  };
  const usesEventListener = typeof synthesis?.addEventListener === 'function';
  const previousVoicesChanged = synthesis?.onvoiceschanged;
  const propertyVoicesChanged = event => {
    if (typeof previousVoicesChanged === 'function') previousVoicesChanged.call(synthesis, event);
    voicesChanged();
  };
  if (usesEventListener) synthesis.addEventListener('voiceschanged', voicesChanged);
  else if (synthesis) synthesis.onvoiceschanged = propertyVoicesChanged;

  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    voiceListeners.clear();
    if (usesEventListener) synthesis.removeEventListener?.('voiceschanged', voicesChanged);
    else if (synthesis?.onvoiceschanged === propertyVoicesChanged) synthesis.onvoiceschanged = previousVoicesChanged;
  }
  return {
    available, read, stop, pause, resume, setVoice, getVoices, subscribeVoices, dispose,
    togglePause: () => isPaused ? resume() : pause(),
    get speaking() { return active; },
    get paused() { return isPaused; },
    get voiceId() { return selectedVoiceId; },
  };
}

function voiceIdOrEmpty(voice) { return voice ? voiceId(voice) : ''; }
