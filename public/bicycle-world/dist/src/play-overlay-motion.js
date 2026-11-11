const FEEDBACK_DURATION = 140;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

/** Motion policy and finite control feedback. Native owners retain every open,
 * close, hidden, inert and focus decision; CSS owns the visual transitions. */
export function mountPlayOverlayMotion({isReduced, document: doc = globalThis.document} = {}) {
  const body = doc?.body, view = doc?.defaultView || globalThis.window;
  const previousPolicy = body?.getAttribute?.('data-play-ui-motion') ?? null;
  const active = new Map(), removers = [];
  let disposed = false, reduced = true, ownedPolicy = null, observer = null, media = null;
  try { media = view?.matchMedia?.('(prefers-reduced-motion: reduce)'); } catch {}
  const listen = (target, type, handler, options) => {
    target?.addEventListener?.(type, handler, options);
    removers.push(() => target?.removeEventListener?.(type, handler, options));
  };
  function cancelFeedback() {
    for (const record of active.values()) {
      try { record.animation.cancel(); } catch {}
    }
    active.clear();
  }
  function refresh() {
    if (disposed) return reduced;
    let preference;
    try { preference = isReduced?.(); } catch {}
    reduced = typeof preference === 'boolean' ? preference : Boolean(media?.matches);
    ownedPolicy = reduced ? 'reduced' : 'full';
    if (body?.getAttribute?.('data-play-ui-motion') !== ownedPolicy) body?.setAttribute?.('data-play-ui-motion', ownedPolicy);
    if (reduced) cancelFeedback();
    return reduced;
  }
  function feedback(element) {
    refresh();
    if (disposed || reduced || doc?.hidden || !element || element.disabled || element.isConnected === false
      || element.getAttribute?.('aria-disabled') === 'true' || element.closest?.('[hidden], [inert]')
      || typeof element.animate !== 'function') return false;
    const now = view?.performance?.now?.() ?? Date.now(), prior = active.get(element);
    // A captured click and the same central action (for example Bell) share one
    // response. Later repeated actions replace it rather than queueing motion.
    if (prior && now - prior.started < 32) return false;
    let opacity = prior?.baseline ?? 1, current = opacity;
    try {
      const value = Number.parseFloat(view?.getComputedStyle?.(element)?.opacity);
      if (Number.isFinite(value)) { current = Math.max(0, Math.min(1, value)); if (!prior) opacity = current; }
    } catch {}
    try { prior?.animation.cancel(); } catch {}
    active.delete(element);
    let animation;
    try {
      animation = element.animate([{opacity: current}, {opacity: opacity * 0.72}, {opacity}], {
        duration: FEEDBACK_DURATION, easing: EASE_OUT,
      });
    } catch { return false; }
    if (!animation) return false;
    const record = {animation, baseline: opacity, started: now};
    active.set(element, record);
    const finish = () => { if (active.get(element) === record) active.delete(element); };
    if (animation.finished?.then) animation.finished.then(finish, finish);
    else { animation.onfinish = finish; animation.oncancel = finish; }
    return true;
  }
  function onClick(event) {
    if (!body?.classList?.contains('hybrid-world')) return;
    const element = event.target?.closest?.('button, a[href], summary');
    if (!element || !element.closest?.('#game, dialog, .play-music-dock')) return;
    feedback(element);
  }
  refresh();
  listen(doc, 'click', onClick, true);
  listen(doc, 'visibilitychange', () => { if (doc.hidden) cancelFeedback(); });
  listen(media, 'change', refresh);
  // Only the existing application motion-policy class is observed. No panel
  // mutation triggers animations or changes another owner's interaction state.
  const Observer = view?.MutationObserver || globalThis.MutationObserver;
  if (typeof Observer === 'function' && doc?.documentElement) {
    observer = new Observer(refresh);
    observer.observe(doc.documentElement, {attributes: true, attributeFilter: ['class']});
  }
  return {
    refresh, feedback,
    dispose() {
      if (disposed) return;
      disposed = true; cancelFeedback(); observer?.disconnect(); removers.splice(0).forEach(remove => remove());
      if (body?.getAttribute?.('data-play-ui-motion') === ownedPolicy) {
        if (previousPolicy === null) body?.removeAttribute?.('data-play-ui-motion');
        else body?.setAttribute?.('data-play-ui-motion', previousPolicy);
      }
    },
  };
}
