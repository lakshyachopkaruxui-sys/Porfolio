// Deterministic task model for a stationary, simulated HMI comparison.
// No media, vehicle, provider or navigation API is called.
export const TRACKS = Object.freeze([
  {id: 'city', title: 'City morning', artist: 'Illustrative track 01', artwork: 'art-city.svg'},
  {id: 'coast', title: 'Open coast', artist: 'Illustrative track 02', artwork: 'art-coast.svg'},
  {id: 'night', title: 'After hours', artist: 'Illustrative track 03', artwork: 'art-night.svg'},
]);
export const APPROACHES = ['existing', 'receipt'];
export const SCENARIOS = ['confirmed', 'delayed', 'failed', 'unknown'];
export const unresolved = state => ['pending', 'unknown'].includes(state.status);
export function initialState(session = 1) {
  return {session, serial: 1, view: 'dashboard', approach: 'existing', scenario: 'confirmed',
    track: 0, playing: true, revision: 0, muted: false, status: 'ready', pending: null,
    lastCommand: null, queryPending: false, frozen: false};
}
const validTrack = value => Number.isInteger(value) && value >= 0 && value < TRACKS.length;
function confirmed(state, request) {
  return {...state, track: request.track, playing: request.playing,
    revision: state.revision + 1, pending: null, status: 'confirmed', queryPending: false};
}
export function transition(state, event) {
  switch (event.type) {
    case 'VIEW': return ['dashboard', 'map', 'media'].includes(event.view) ? {...state, view: event.view} : state;
    case 'APPROACH': return APPROACHES.includes(event.value) ? {...state, approach: event.value} : state;
    case 'SCENARIO': return SCENARIOS.includes(event.value) ? {...state, scenario: event.value} : state;
    case 'MUTE': return state.frozen ? state : {...state, muted: !state.muted};
    case 'FREEZE': return {...state, frozen: Boolean(event.value)};
    case 'COMMAND': {
      if (state.frozen || unresolved(state) || !['next', 'previous', 'playback'].includes(event.command)) return state;
      const delta = event.command === 'next' ? 1 : event.command === 'previous' ? -1 : 0;
      const request = {id: `${state.session}:${state.serial}`, command: event.command,
        track: (state.track + delta + TRACKS.length) % TRACKS.length,
        playing: event.command === 'playback' ? !state.playing : state.playing};
      const next = {...state, serial: state.serial + 1, pending: request, lastCommand: request, queryPending: false};
      if (state.scenario === 'confirmed') return confirmed(next, request);
      if (state.scenario === 'failed') return {...next, pending: null, status: 'failed'};
      return {...next, status: state.scenario === 'delayed' ? 'pending' : 'unknown'};
    }
    case 'RESOLVE': {
      // The reply must belong to this exact unresolved request; old replies cannot
      // apply a stale track after a later command or an authoritative refresh.
      if (!unresolved(state) || !state.pending || event.id !== state.pending.id) return state;
      if (event.outcome === 'confirmed') return confirmed(state, state.pending);
      if (event.outcome === 'failed') return {...state, status: 'failed', pending: null, queryPending: false};
      if (event.outcome === 'unknown') return {...state, status: 'unknown', queryPending: false};
      return state;
    }
    case 'READ_STATE': return state.frozen || !unresolved(state) ? state : {...state, queryPending: true};
    case 'SNAPSHOT': {
      if (!state.queryPending || !validTrack(event.track) || typeof event.playing !== 'boolean'
        || !Number.isInteger(event.revision) || event.revision <= state.revision) return state;
      return {...state, track: event.track, playing: event.playing, revision: event.revision,
        status: 'refreshed', pending: null, queryPending: false};
    }
    case 'RESET': return {...initialState(state.session + 1), approach: state.approach};
    default: return state;
  }
}
export function commandLabel(request) {
  if (!request) return 'No command';
  if (request.command === 'playback') return request.playing ? 'Play requested' : 'Pause requested';
  return `${request.command === 'next' ? 'Next' : 'Previous'} requested`;
}
export function statusText(state) {
  const requested = state.pending || state.lastCommand;
  const name = requested ? TRACKS[requested.track].title : '';
  const playback = requested?.command === 'playback';
  if (state.status === 'pending') return `${playback ? commandLabel(requested) : `Request for ${name}`} received locally. Playback has not confirmed the change.`;
  if (state.status === 'unknown') return `Playback outcome unknown${name ? ` for ${playback ? commandLabel(requested).toLowerCase() : name}` : ''}. Last confirmed playback may be stale. Check playback before another command.`;
  if (state.status === 'failed') return `Change failed. Last confirmed playback is unchanged. You can deliberately try again.`;
  if (state.status === 'confirmed') return `Playback confirmed: ${TRACKS[state.track].title}, ${state.playing ? 'playing' : 'paused'}.`;
  if (state.status === 'refreshed') return `Current playback received: ${TRACKS[state.track].title}, ${state.playing ? 'playing' : 'paused'}. No command was repeated.`;
  return 'Playback is confirmed. Choose a control when needed; navigation stays available.';
}
export function receiptContent(state) {
  // A fresh snapshot establishes current state, not the outcome of an earlier
  // command. Do not display that old request as if the snapshot confirmed it.
  if (state.status === 'refreshed') return {tag: 'Playback state refreshed', request: 'Current playback check', result: statusText(state)};
  const request = state.pending || state.lastCommand;
  return {
    tag: state.status === 'pending' ? 'Input received locally' : state.status === 'unknown' ? 'Result not known'
      : state.status === 'failed' ? 'Change not applied' : 'Playback source confirmed',
    request: request ? `${commandLabel(request)}${request.command !== 'playback' ? ` · ${TRACKS[request.track].title}` : ''}` : 'Current playback',
    result: statusText(state),
  };
}
export function serialize(state) {
  return JSON.stringify({session: state.session, serial: state.serial, track: state.track,
    playing: state.playing, revision: state.revision, muted: state.muted,
    status: state.status, pending: state.pending, lastCommand: state.lastCommand, approach: state.approach});
}
function cleanRequest(value) {
  if (!value || typeof value.id !== 'string' || !/^\d+:\d+$/.test(value.id)
    || !['next', 'previous', 'playback'].includes(value.command) || !validTrack(value.track)
    || typeof value.playing !== 'boolean') return null;
  return {id: value.id, command: value.command, track: value.track, playing: value.playing};
}
export function restore(text) {
  const clean = initialState();
  try {
    const saved = JSON.parse(text);
    if (!saved || typeof saved !== 'object') return clean;
    if (Number.isSafeInteger(saved.session) && saved.session > 0) clean.session = saved.session;
    if (Number.isSafeInteger(saved.serial) && saved.serial > 0) clean.serial = saved.serial;
    if (validTrack(saved.track)) clean.track = saved.track;
    if (typeof saved.playing === 'boolean') clean.playing = saved.playing;
    if (Number.isSafeInteger(saved.revision) && saved.revision >= 0) clean.revision = saved.revision;
    clean.muted = saved.muted === true;
    if (APPROACHES.includes(saved.approach)) clean.approach = saved.approach;
    if (['pending', 'unknown'].includes(saved.status)) {
      clean.pending = cleanRequest(saved.pending);
      if (clean.pending) { clean.status = 'unknown'; clean.lastCommand = clean.pending; }
    }
  } catch { /* An unavailable or malformed session starts with known initial state. */ }
  return clean;
}
