/** Deterministic, opt-in narration policy. Audio playback belongs to the caller. */
export function createWoodyTour({clips = {}, play, onState = () => {}, now = () => performance.now(), cooldownMs = 18000,feedbackAlreadyInvited=false} = {}) {
  const seen = new Set();
  const completedApproaches = new Set();
  const automaticStarts = [];
  let enabled = false, disposed = false, generation = 0, active = null, playback = null, quietContext = null;
  let lastLanding=-Infinity, feedbackInvited=Boolean(feedbackAlreadyInvited);
  let lastClip = null, lastScope = null, lastAutomatic = -Infinity, choice = false, choiceOffered = false, worksOpened = false, error = null;
  let context = {stopId: null, destinationId: null, roomId: null, stopped: false, riding: true, overlay: false, hidden: false, jumping: false,feedbackNear:false,explorationStarted:false}, publishedState = '', arrivedStop = null;
  const blocked = (key=null) => !context.riding || context.overlay || context.hidden || (context.jumping && key!=='ramp-airborne');
  const contextKey = () => JSON.stringify([context.stopId,context.destinationId,context.roomId]);
  const isQuiet = () => quietContext === contextKey();
  const matchesScope = scope => !scope || (!scope.stopId || scope.stopId === context.stopId) && (!scope.destinationId || scope.destinationId === context.destinationId) && (!scope.roomId || scope.roomId === context.roomId) && (!scope.feedbackNear || context.feedbackNear&&!context.roomId);
  const snapshot = () => ({enabled, status: active ? active.playing ? 'speaking' : 'starting' : error ? 'unavailable' : enabled ? 'ready' : 'off',
    clip: active?.clip || lastClip, speaking: Boolean(active), playing: Boolean(active?.playing), choice, worksOpened, feedbackInvited, error, suspended: blocked(active?.key)});
  function publish() { const state = snapshot(), signature = JSON.stringify(state); if (!disposed && signature !== publishedState) { publishedState = signature; onState(state); } }
  function cancel() {
    generation++;
    active = null;
    const previous = playback; playback = null;
    previous?.stop?.();
  }
  function dismissWorksChoice() {
    choice = false;
    if (active?.key === 'works-skipped') cancel();
    if (lastClip?.id === 'works-skipped') { lastClip = null; lastScope = null; error = null; }
  }
  function finish(token, failure) {
    if (disposed || token !== generation || !active) return;
    if(!failure&&active.key.startsWith('approach:'))completedApproaches.add(active.clip.text);
    active = null; playback = null;
    error = failure ? 'Voice unavailable. The caption is still available.' : null;
    publish();
  }
  function speak(key, {manual = false, automatic = !manual, stopId = null, destinationId = null, roomId = null} = {}) {
    if (disposed || !enabled) return false;
    const clip = key === 'room:music' && clips[key] ? {...clips[key],captionOnly:true} : clips[key];
    if (!clip || typeof clip.text !== 'string' || !clip.text.trim()) return false;
    if(key==='ramp-airborne'&&!context.jumping)return false;
    if (key.startsWith('arrive:')) stopId ??= key.split(':')[1];
    // A room opened directly from the map does not move the bicycle. Return
    // speech belongs to its actual garden position, not the remote room's stop.
    if (key.startsWith('return:')) stopId ??= context.stopId;
    if (key.startsWith('approach:')) destinationId ??= key.split(':')[1];
    if (key === 'works-skipped') stopId ??= context.stopId;
    const scope = {stopId,destinationId,roomId:roomId || (key.startsWith('room:') ? key.split(':')[1] : null),feedbackNear:key==='feedback-nearby'};
    if (!matchesScope(scope)) return false;
    if (manual && !automatic) quietContext = null;
    if (manual && key !== 'works-skipped') dismissWorksChoice();
    if (blocked(key)) {
      if (manual) { cancel(); lastClip = {...clip,id:clip.id || key}; lastScope = scope; error = 'Voice paused here. The caption is still available.'; publish(); }
      return false;
    }
    const currentTime = now();
    while (automaticStarts.length && currentTime - automaticStarts[0] >= 60000) automaticStarts.shift();
    // Automatic context never queues: at most two starts in any rolling minute,
    // in addition to per-line deduplication and the shorter breathing-space gap.
    if (automatic && (isQuiet() || active || seen.has(key) || currentTime - lastAutomatic < cooldownMs || automaticStarts.length >= 2)) return false;
    if (stopId && context.stopId !== stopId) return false;
    if (destinationId && context.destinationId !== destinationId) return false;
    cancel(); error = null;
    const token = generation;
    lastClip = {...clip, id: clip.id || key}; lastScope = scope; active = {clip: lastClip, key, ...scope, playing:false};
    // An explicit arrival/replay also satisfies that contextual line. It may be
    // replayed manually, but the frame loop must not repeat it automatically.
    seen.add(key);
    if(['feedback-nearby','return:cloud','room:visitor'].includes(key))feedbackInvited=true;
    if (automatic) { lastAutomatic = currentTime; automaticStarts.push(currentTime); }
    publish();
    if (clip.captionOnly) { finish(token, false); return true; }
    if (typeof play !== 'function' || !clip.src) { finish(token, true); return true; }
    try {
      const result = play(lastClip, {onPlaying: () => { if (token === generation && active) { active.playing = true; publish(); } }, onEnded: () => finish(token, false), onError: () => finish(token, true)});
      Promise.resolve(result).then(owner => {
        if (disposed || token !== generation || !active) owner?.stop?.();
        else playback = owner;
      }, () => finish(token, true));
    } catch { finish(token, true); }
    return true;
  }
  function offerWorks() {
    // Preserve a failed room intro as the relevant caption and replay target.
    if (!enabled || error || blocked() || isQuiet() || !['work','music',null].includes(context.roomId) || (!context.roomId&&!context.stopped) || active || worksOpened || choiceOffered || !['work','music'].includes(context.roomId || arrivedStop) || (!context.roomId&&arrivedStop !== context.stopId)) return false;
    if (!clips['works-skipped'] || context.roomId&&!seen.has(`room:${context.roomId}`)) return false;
    // This one explicit choice replaces any completed caption; it never interrupts a line.
    if (!speak('works-skipped', {manual:true, automatic:false, stopId:context.roomId?null:arrivedStop,roomId:context.roomId})) return false;
    choiceOffered = true; choice = true; publish(); return true;
  }
  function emit(event, payload = {}) {
    if (disposed) return false;
    if(event==='feedback-invited'){feedbackInvited=true;publish();return true;}
    if(event==='enable-intro'){
      if(blocked()||!enabled)return false;
      if(context.roomId){
        if(active?.roomId===context.roomId)return true;
        return speak(`room:${context.roomId}`,{manual:true});
      }
      return speak(context.stopId?`arrive:${context.stopId}`:'controls',{manual:true});
    }
    if (event === 'works-opened') { worksOpened = true; dismissWorksChoice(); publish(); return true; }
    if (event === 'stay') { dismissWorksChoice(); publish(); return true; }
    if (event === 'visit-works') { choice = false; cancel(); publish(); return true; }
    if (event === 'room-enter') {
      const key = `room:${payload.stopId}`;
      if(context.roomId !== payload.stopId){cancel();publish();return false;}
      if (seen.has(key) || blocked() || isQuiet()) return false;
      cancel(); choice = false; arrivedStop = null; publish();
      const accepted = speak(key, {manual:true}); if (accepted) {seen.add(key); if (active) active.roomId = payload.stopId;} return accepted;
    }
    if (event === 'room-return') {
      const key=`return:${payload.stopId}`;
      if(isQuiet()||blocked()||(payload.stopId==='cloud'&&(seen.has(key)||feedbackInvited)))return false;
      return speak(key,{automatic:false,stopId:context.stopId});
    }
    if(event==='feedback-nearby'){
      if(feedbackInvited||!context.feedbackNear||context.feedbackEntry===false||!context.explorationStarted||context.roomId)return false;
      return speak('feedback-nearby');
    }
    if(event==='ramp-airborne'){
      if(!enabled||!context.jumping||blocked('ramp-airborne')||isQuiet()||now()-lastLanding<3000)return false;
      const accepted=speak('ramp-airborne',{automatic:false});if(accepted)lastLanding=now();return accepted;
    }
    if (event === 'manual') return speak(payload.clipId, {manual: true});
    if (!enabled || blocked()) return false;
    if(event==='ramp-landed'){
      // A real landing is timely feedback, not incidental route chatter.
      // Do not delay it behind an approach or suppress later completed jumps.
      if(isQuiet() || now()-lastLanding<3000)return false;
      const accepted=speak('ramp-landed',{automatic:false});
      if(accepted)lastLanding=now();return accepted;
    }
    const stopId = payload.stopId;
    if (event === 'arrive' && context.stopId === stopId) {
      if(active?.key?.startsWith('return:'))return false;
      arrivedStop = stopId;
      const arrivalKey=`arrive:${stopId}`;
      if(isQuiet())return false;
      if(seen.has(arrivalKey))return offerWorks();
      if(completedApproaches.has(clips[arrivalKey]?.text)){
        seen.add(arrivalKey);return offerWorks();
      }
      // Arrival is authoritative: supersede approach chatter and bypass its rate limit.
      return speak(arrivalKey,{automatic:false,stopId});
    }
    const key = event === 'welcome' ? 'welcome' : event === 'ramp-landed' ? 'ramp-landed' : event === 'route-cancelled' ? 'route-cancelled'
      : ['approach', 'arrive'].includes(event) && stopId ? `${event}:${stopId}` : null;
    return key ? speak(key, {stopId: event === 'arrive' ? stopId : null, destinationId: event === 'approach' ? stopId : null}) : false;
  }
  return {
    emit,
    update(next = {}) {
      if (disposed) return;
      const oldStop = context.stopId;
      const oldContext = contextKey();
      context = {...context, ...next};
      // Identical sign copy is one continuous introduction as a guided ride
      // becomes an actual arrival; changing scope must not restart its audio.
      if(active?.key.startsWith('approach:')&&context.stopped&&!context.roomId&&context.stopId===active.destinationId&&clips[`arrive:${context.stopId}`]?.text===active.clip.text){
        active.key=`arrive:${context.stopId}`;active.stopId=context.stopId;active.destinationId=null;
        lastClip={...clips[active.key],id:active.key};active.clip=lastClip;
        lastScope={stopId:context.stopId,destinationId:null,roomId:null};seen.add(active.key);
      }
      if (oldContext !== contextKey()) {quietContext = null;dismissWorksChoice();}
      if (!context.stopped&&!context.roomId) dismissWorksChoice();
      if (next.worksOpened) { worksOpened = true; choice = false; }
      if (blocked(active?.key) || active?.key==='ramp-airborne'&&!context.jumping || active?.key==='feedback-nearby'&&(!context.feedbackNear||context.roomId) || active?.stopId && active.stopId !== context.stopId || active?.destinationId && active.destinationId !== context.destinationId || active?.roomId && active.roomId !== context.roomId) cancel();
      if (lastClip && !matchesScope(lastScope)) { lastClip = null; lastScope = null; error = null; }
      if (oldStop !== context.stopId || blocked()) { choice = false; arrivedStop = null; }
      offerWorks();
      publish();
    },
    setEnabled(value, {announce = true} = {}) {
      if (disposed) return;
      const newlyEnabled = !enabled && Boolean(value); enabled = Boolean(value);
      if (!enabled) { cancel(); choice = false; } error = null; publish();
      if (newlyEnabled && announce) {
        const key = context.stopId && clips[`arrive:${context.stopId}`] ? `arrive:${context.stopId}` : 'welcome';
        speak(key, {manual: true, stopId: context.stopId});
      }
    },
    replay() { return lastClip ? speak(Object.keys(clips).find(key => (clips[key].id || key) === lastClip.id), {manual: true}) : false; },
    stop({quiet = false} = {}) { if (disposed) return; if (quiet) quietContext = contextKey(); cancel(); publish(); },
    get snapshot() { return snapshot(); },
    dispose() { if (disposed) return; cancel(); disposed = true; },
  };
}
