// Shared shortcut policy for the active Play room. Native controls own their keys.
const NATIVE_KEYBOARD_TARGETS = 'input,textarea,select,video,audio,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="slider"],[role="spinbutton"],[data-native-keyboard]';

export function isKeyboardShortcutBlocked(event, {allowShift = false} = {}) {
  if (!event || event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey || (!allowShift && event.shiftKey)) return true;
  const targets = event.composedPath?.() || [event.target];
  return targets.some(target => target?.isContentEditable || target?.closest?.(NATIVE_KEYBOARD_TARGETS));
}

export function getHorizontalNavigation(event) {
  if (isKeyboardShortcutBlocked(event) || event.repeat) return 0;
  const key = event.key?.toLowerCase();
  return key === 'a' || key === 'arrowleft' ? -1 : key === 'd' || key === 'arrowright' ? 1 : 0;
}

export function getBoundaryNavigation(event) {
  if (isKeyboardShortcutBlocked(event) || event.repeat) return null;
  return event.key === 'Home' ? 'first' : event.key === 'End' ? 'last' : null;
}

export function consumeNavigationKey(event) {
  event.preventDefault();
  event.stopPropagation();
}
