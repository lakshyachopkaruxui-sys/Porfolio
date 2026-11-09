// Preserve a deliberate action's keyboard context when its initiating control
// becomes unavailable. Passive source updates must not move the user's focus.
export function retainActionFocus({control, wasFocused, scope, display, moderatorTarget}) {
  if (!control || !wasFocused || !control.disabled) return false;
  const target = scope === 'display' ? display : moderatorTarget;
  if (!target || target.inert) return false;
  target.focus({preventScroll:true});
  return true;
}
