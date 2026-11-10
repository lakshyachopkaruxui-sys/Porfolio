// Clipboard writes remain a direct button action. No permissions are requested
// and a failed write is never reported as success.
export async function copyText(value, {
  document: doc = globalThis.document,
  navigator: nav = globalThis.navigator,
  isCurrent = () => true,
} = {}) {
  if (!isCurrent()) return {status: 'cancelled'};
  const text = String(value);
  try {
    if (typeof nav?.clipboard?.writeText === 'function') {
      await nav.clipboard.writeText(text);
      return isCurrent() ? {status: 'copied', method: 'clipboard'} : {status: 'cancelled'};
    }
  } catch { /* Try an actual selection copy before offering manual selection. */ }
  if (!isCurrent()) return {status: 'cancelled'};
  if (!doc?.body || typeof doc.execCommand !== 'function') return {status: 'unavailable'};

  const active = doc.activeElement;
  const inputSelection = active && typeof active.selectionStart === 'number'
    ? {start: active.selectionStart, end: active.selectionEnd, direction: active.selectionDirection}
    : null;
  let selection;
  const ranges = [];
  try {
    selection = doc.getSelection?.();
    if (selection) {
      for (let index = 0; index < selection.rangeCount; index++) {
        ranges.push(selection.getRangeAt(index).cloneRange());
      }
    }
  } catch { /* A selection may have been removed before its range was read. */ }
  const field = doc.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.tabIndex = -1;
  field.setAttribute('aria-hidden', 'true');
  Object.assign(field.style, {position: 'fixed', left: '-9999px', top: '0', opacity: '0'});
  let copied = false;
  try {
    doc.body.append(field);
    field.focus({preventScroll: true});
    field.select();
    field.setSelectionRange(0, text.length);
    copied = doc.execCommand('copy') === true;
  } catch { /* Manual selection remains available when copying is restricted. */ }
  finally {
    field.remove();
    if (active?.isConnected && typeof active.focus === 'function') {
      try {
        active.focus({preventScroll: true});
        if (inputSelection && typeof active.setSelectionRange === 'function') {
          active.setSelectionRange(inputSelection.start, inputSelection.end, inputSelection.direction);
        }
      } catch { /* A removed or non-selectable input must not suppress feedback. */ }
    }
    if (selection) {
      try {
        selection.removeAllRanges();
        for (const range of ranges) selection.addRange(range);
      } catch { /* An original selected node may have been removed meanwhile. */ }
    }
  }
  if (!isCurrent()) return {status: 'cancelled'};
  return copied ? {status: 'copied', method: 'selection'} : {status: 'unavailable'};
}
