// A one-time invitation. It never opens the conversation or moves focus itself.
export const ASSISTANT_DISCOVERY_KEY = 'lakshya-portfolio-ai-introduction-v1';

export function mountAssistantDiscovery({host, launcher, invitation, dismiss, open, onOpen,
  win = window, doc = document, delay = 6000, visibleDuration = 10000} = {}) {
  if (!host || !launcher || !invitation || !dismiss || !open) return null;
  const listeners = [];
  let timer = null;
  let expiry = null;
  let animation = null;
  let observer = null;
  let suspended = false;
  let destroyed = false;
  let shown = false;
  let hovered = false;
  const preference = win.matchMedia?.('(prefers-reduced-motion: reduce)');

  function stored() {
    for (const name of ['localStorage', 'sessionStorage']) {
      try { if (win[name]?.getItem(ASSISTANT_DISCOVERY_KEY) === 'seen') return true; }
      catch { /* Private browsing may disable storage. The current mount still works. */ }
    }
    return false;
  }
  let consumed = stored();
  function remember() {
    consumed = true;
    for (const name of ['localStorage', 'sessionStorage']) {
      try { win[name]?.setItem(ASSISTANT_DISCOVERY_KEY, 'seen'); }
      catch { /* Do not let unavailable storage prevent normal use. */ }
    }
  }
  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  }
  function cancelTimer() {
    if (timer !== null) win.clearTimeout(timer);
    timer = null;
  }
  function stopAnimation() {
    animation?.cancel();
    animation = null;
  }
  function cancelExpiry() {
    if (expiry !== null) win.clearTimeout(expiry);
    expiry = null;
  }
  function scheduleExpiry() {
    if (!shown || hovered || invitation.contains(doc.activeElement) || expiry !== null) return;
    expiry = win.setTimeout(() => { expiry = null; hide(); }, visibleDuration);
  }
  function hide() {
    cancelExpiry();
    stopAnimation();
    shown = false;
    invitation.hidden = true;
    host.dataset.assistantDiscovery = destroyed ? 'destroyed' : consumed ? 'seen' : 'waiting';
  }
  function blocked() {
    const active = doc.activeElement;
    return destroyed || suspended || doc.hidden || Boolean(doc.querySelector('dialog[open]')) ||
      Boolean(active?.matches?.('input, textarea, select, [contenteditable="true"]'));
  }
  function show() {
    timer = null;
    if (consumed || blocked()) return;
    remember();
    shown = true;
    invitation.hidden = false;
    host.dataset.assistantDiscovery = 'shown';
    if (!preference?.matches && typeof invitation.animate === 'function') {
      try {
        const easing = win.getComputedStyle?.(host).getPropertyValue('--portfolio-motion-ease').trim() ||
          'cubic-bezier(0.23, 1, 0.32, 1)';
        animation = invitation.animate([
          {opacity: 0, transform: 'translateY(8px) scale(.97)'},
          {opacity: 1, transform: 'translateY(0) scale(1)'},
        ], {duration: 200, easing});
        animation.finished?.catch(() => {});
      } catch { /* The visible invitation is the non-animated fallback. */ }
    }
    protectFocus();
    scheduleExpiry();
  }
  function overlaps(first, second) {
    if (!first || !second) return false;
    return first.width > 0 && first.height > 0 && first.left < second.right && first.right > second.left &&
      first.top < second.bottom && first.bottom > second.top;
  }
  function protectFocus() {
    const active = doc.activeElement;
    const outside = active && active !== doc.body && active !== doc.documentElement && !host.contains(active);
    const focusedRect = outside ? active.getBoundingClientRect?.() : null;
    host.dataset.assistantObscured = String(Boolean(overlaps(focusedRect, launcher.getBoundingClientRect?.())));
    if (shown && overlaps(focusedRect, invitation.getBoundingClientRect?.())) hide();
    if (invitation.contains(active)) cancelExpiry();
    else scheduleExpiry();
  }
  function refresh() {
    if (destroyed) return;
    if (blocked()) {
      cancelTimer();
      if (shown) hide();
      return;
    }
    if (!consumed && timer === null) timer = win.setTimeout(show, delay);
  }
  function consume({restoreFocus = false} = {}) {
    const focusWasInside = invitation.contains(doc.activeElement);
    remember();
    cancelTimer();
    hide();
    if (restoreFocus && focusWasInside && launcher.isConnected) launcher.focus({preventScroll: true});
  }
  listen(dismiss, 'click', () => consume({restoreFocus: true}));
  listen(open, 'click', () => { consume(); onOpen?.(); });
  listen(invitation, 'keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); consume({restoreFocus: true}); }
  });
  listen(invitation, 'pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovered = true;
    cancelExpiry();
  });
  listen(invitation, 'pointerleave', () => { hovered = false; scheduleExpiry(); });
  listen(doc, 'visibilitychange', refresh);
  listen(doc, 'focusin', () => { protectFocus(); refresh(); });
  listen(doc, 'focusout', refresh);
  listen(doc, 'close', refresh, true);
  listen(win, 'pagehide', () => { suspended = true; cancelTimer(); if (shown) hide(); });
  listen(win, 'pageshow', () => { suspended = false; refresh(); });
  listen(win, 'storage', event => {
    if (event.key === ASSISTANT_DISCOVERY_KEY && event.newValue === 'seen') {
      consumed = true;
      cancelTimer();
      hide();
    }
  });
  listen(win, 'resize', protectFocus, {passive: true});
  listen(win, 'scroll', protectFocus, {passive: true});
  if (preference?.addEventListener) listen(preference, 'change', stopAnimation);
  if (typeof win.MutationObserver === 'function') {
    observer = new win.MutationObserver(refresh);
    // Opening/closing the welcome or project dialog interrupts the quiet dwell.
    observer.observe(doc.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['open']});
  }
  invitation.hidden = true;
  host.dataset.assistantDiscovery = consumed ? 'seen' : 'waiting';
  protectFocus();
  refresh();
  return {
    consume,
    refresh,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelTimer();
      hide();
      observer?.disconnect();
      for (const remove of listeners) remove();
    },
  };
}
