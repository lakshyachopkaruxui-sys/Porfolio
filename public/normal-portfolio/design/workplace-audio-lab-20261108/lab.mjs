import {TRACKS, initialState, transition, restore, serialize, unresolved, statusText, receiptContent} from './model.mjs';
import {retainActionFocus} from './focus.mjs';

const storageKey = 'workplace-audio-comparison-20261108';
let state;
try { state = restore(sessionStorage.getItem(storageKey)); } catch { state = initialState(); }
const controller = new AbortController();
const car = document.querySelector('#car-display');
const byId = id => document.getElementById(id);
const listen = (element, name, listener) => element.addEventListener(name, listener, {signal:controller.signal});

function save() {
  try { sessionStorage.setItem(storageKey, serialize(state)); } catch { /* The prototype works without storage. */ }
}
function dispatch(event, announcement = '', origin = null, scope = 'display') {
  const wasFocused = origin && document.activeElement === origin;
  state = transition(state, event);
  if (event.type === 'MUTE') announcement = `Modeled output ${state.muted ? 'muted' : 'unmuted'}. This model is silent.`;
  save(); render(announcement);
  retainActionFocus({control:origin,wasFocused,scope,display:car,moderatorTarget:byId('scenario')});
}
function render(announcement = '') {
  const blocked = unresolved(state);
  car.inert = state.frozen;
  byId('freeze-note').hidden = !state.frozen;
  byId('freeze-display').checked = state.frozen;
  byId('scenario').value = state.scenario;
  document.querySelectorAll('[name=approach]').forEach(input => { input.checked = input.value === state.approach; });
  for (const id of ['confirm-result','fail-result','lose-result']) byId(id).disabled = !blocked;
  byId('send-snapshot').disabled = !state.queryPending;
  byId('moderator-status').textContent = state.queryPending ? 'A playback-state query is waiting. Choose the source’s track and playback state, then send the snapshot.'
    : blocked ? 'A playback command has no confirmed result yet. Supply a simulated result, or use Check playback state in the display.' : 'No command is waiting for a result.';
  document.querySelectorAll('.wheel-actions button').forEach(button => {
    button.disabled = state.frozen || (button.hasAttribute('data-command') && blocked);
  });
  // A stalled renderer cannot display a newly invented acknowledgement. Outside
  // researcher controls may change the model, but the HMI stays unchanged.
  if (state.frozen) return;

  car.dataset.view = state.view;
  car.dataset.approach = state.approach;
  const track = TRACKS[state.track];
  const lastKnown = ['pending','unknown'].includes(state.status);
  byId('album-art').src = track.artwork;
  byId('album-art').alt = `Original abstract illustration for ${track.title}`;
  byId('track-label').textContent = lastKnown ? 'Last confirmed track' : 'Confirmed track';
  byId('track-title').textContent = track.title;
  byId('track-artist').textContent = `${track.artist} · ${state.playing ? 'last confirmed playing' : 'last confirmed paused'}`;
  byId('playback-certainty').textContent = state.status === 'unknown' ? 'Current playback unknown' : state.status === 'pending' ? 'Awaiting playback' : 'Confirmed playback';
  byId('mute-state').textContent = state.muted ? 'Modeled output muted' : 'Modeled output on';
  byId('mute-label').textContent = state.muted ? 'Unmute output' : 'Mute output';
  byId('display-mute').setAttribute('aria-pressed', String(state.muted));
  byId('steering-mute').setAttribute('aria-pressed', String(state.muted));
  byId('steering-mute').textContent = state.muted ? 'Steering Unmute' : 'Steering Mute';
  byId('play-label').textContent = state.playing ? 'Pause' : 'Play';
  byId('play-icon').setAttribute('d', state.playing ? 'M8 5v14M16 5v14' : 'm8 4 12 8-12 8Z');
  document.querySelectorAll('[data-command]').forEach(button => {
    button.disabled = blocked;
    if (button.dataset.command === 'playback') button.setAttribute('aria-label', `Request ${state.playing ? 'pause' : 'play'}`);
  });
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
  });
  byId('playback-status').textContent = `${statusText(state)}${announcement ? ` ${announcement}` : ''}`;
  const receipt = receiptContent(state);
  byId('receipt').hidden = state.approach !== 'receipt';
  byId('receipt-tag').textContent = receipt.tag;
  byId('receipt-request').textContent = receipt.request;
  byId('receipt-result').textContent = receipt.result;
  byId('read-state').hidden = !blocked;
  byId('read-state').disabled = state.queryPending;
  byId('query-status').hidden = !state.queryPending;
}

document.querySelectorAll('[data-command]').forEach(button => listen(button, 'click', () => dispatch({type:'COMMAND',command:button.dataset.command},'',button)));
document.querySelectorAll('button[data-view]').forEach(button => listen(button, 'click', () => dispatch({type:'VIEW',view:button.dataset.view})));
for (const id of ['display-mute','steering-mute']) listen(byId(id), 'click', () => dispatch({type:'MUTE'}));
document.querySelectorAll('[name=approach]').forEach(input => listen(input, 'change', () => dispatch({type:'APPROACH',value:input.value}, `${input.value === 'receipt' ? 'Explicit action receipt' : 'Existing-pattern comparison'} selected. Playback state is unchanged. Reset before an independent trial.`)));
listen(byId('scenario'),'change', event => dispatch({type:'SCENARIO',value:event.target.value}));
for (const [id, outcome] of [['confirm-result','confirmed'],['fail-result','failed'],['lose-result','unknown']]) {
  listen(byId(id), 'click', () => dispatch({type:'RESOLVE',id:state.pending?.id,outcome},'',byId(id),'moderator'));
}
listen(byId('read-state'),'click', () => dispatch({type:'READ_STATE'},'',byId('read-state')));
listen(byId('send-snapshot'),'click', () => dispatch({type:'SNAPSHOT',track:Number(byId('snapshot-track').value),playing:byId('snapshot-playing').checked,revision:state.revision+1},'',byId('send-snapshot'),'moderator'));
listen(byId('freeze-display'),'change', event => dispatch({type:'FREEZE',value:event.target.checked}));
listen(byId('reset'),'click', () => {
  dispatch({type:'RESET'});
  car.focus({preventScroll:true});
});
listen(car, 'keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.target.isContentEditable
    || ['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName)) return;
  const key = event.key.toLowerCase();
  if (!['n','p','m'].includes(key)) return;
  event.preventDefault();
  dispatch(key === 'm' ? {type:'MUTE'} : {type:'COMMAND',command:key === 'n' ? 'next' : 'previous'},'',document.activeElement);
});
window.addEventListener('pagehide', event => {
  save();
  if (!event.persisted) controller.abort();
}, {signal:controller.signal});
render();
