/** Quiet semantic companion. Rendering never changes focus or starts playback. */
export function mountWoodyTourUI({document: doc = globalThis.document, host = doc.body,
  onEnable = () => {}, onReplay = () => {}, onStop = () => {}, onVisitWorks = () => {}, onStay = () => {}} = {}) {
  const panel = doc.createElement('section'); panel.className = 'woody-tour'; panel.setAttribute('aria-label', 'Woody’s garden guide');
  const controls = doc.createElement('div'); controls.className = 'woody-tour-controls';
  const label = doc.createElement('span'); label.className = 'woody-tour-label'; label.textContent = 'Woody’s guide';
  const toggle = doc.createElement('button'); toggle.type = 'button'; toggle.textContent = 'Enable voice'; toggle.setAttribute('aria-pressed', 'false');
  const replay = doc.createElement('button'); replay.type = 'button'; replay.textContent = 'Replay'; replay.disabled = true;
  const stop = doc.createElement('button'); stop.type = 'button'; stop.textContent = 'Stop'; stop.hidden = true;
  const caption = doc.createElement('p'); caption.className = 'woody-tour-caption'; caption.setAttribute('role', 'status'); caption.setAttribute('aria-live', 'polite'); caption.setAttribute('aria-atomic', 'true');
  const choice = doc.createElement('div'); choice.className = 'woody-tour-choice'; choice.hidden = true;
  const visit = doc.createElement('button'); visit.type = 'button'; visit.textContent = 'Visit Works';
  const stay = doc.createElement('button'); stay.type = 'button'; stay.textContent = 'Stay here';
  const status = doc.createElement('span'); status.className = 'woody-tour-status';
  controls.append(label, toggle, replay, stop); choice.append(visit, stay); panel.append(controls, caption, status, choice); host.append(panel);
  let enabled = false, disposed = false, lastSignature = '';
  const events = [[toggle, () => onEnable(!enabled)], [replay, onReplay], [stop, onStop], [visit, onVisitWorks], [stay, onStay]];
  events.forEach(([element, handler]) => element.addEventListener('click', handler));
  return {
    element: panel,
    render(state) {
      if (disposed) return;
      const signature = JSON.stringify(state); if (signature === lastSignature) return; lastSignature = signature;
      panel.setAttribute('data-clip',state.clip?.id||'');
      panel.hidden = !state.enabled || Boolean(state.suspended) || !(state.speaking || state.choice || state.error);
      enabled = Boolean(state.enabled); toggle.textContent = enabled ? 'Mute guide' : 'Enable voice'; toggle.setAttribute('aria-pressed', String(enabled));
      replay.disabled = !enabled || !state.clip; stop.hidden = !state.speaking;
      const text = enabled ? state.clip?.text || '' : '';
      caption.setAttribute('aria-live', state.error ? 'polite' : 'off');
      if (caption.textContent !== text) caption.textContent = text;
      caption.hidden = !text; choice.hidden = !state.choice || !enabled;
      status.textContent = state.error || ''; status.hidden = !state.error;
    },
    dispose() { if (disposed) return; disposed = true; events.forEach(([element, handler]) => element.removeEventListener('click', handler)); panel.remove(); },
  };
}
