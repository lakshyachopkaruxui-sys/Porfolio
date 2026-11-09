// Progressive motion: the CSS baseline always contains the complete, readable page.
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_MOVE = 'cubic-bezier(0.77, 0, 0.175, 1)';
const REVEAL_SELECTOR = 'main > section > .section-heading, main > section > .personal-section-heading, .project-card[data-project], .approach-list > div, .highlights-list > article, .personal-photo-strip, .personal-life-card, #contact > h2';

export function mountPortfolioMotion() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {intro: () => false, captureProjects: () => new Map(), refreshProjects: () => 0,
      observe() {}, replay() {}, cancel() {}, destroy() {}};
  }
  const win = window;
  const doc = document;
  const preference = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const effects = new Map();
  const listeners = [];
  const pending = new Set();
  const seen = new WeakSet();
  let observer;
  let destroyed = false;
  let suspended = false;
  let keyboardMode = false;
  let introAttempted = false;
  let introFrame = 0;
  let sweepFrame = 0;
  let startedCount = 0;
  const playFrame = doc.querySelector('.play-preview');
  const root = doc.documentElement;
  // Rendered diagnostics identify the actual page runtime, not the inspection sandbox.
  root.dataset.motionRevision = '2026-11-04-photo-spread';
  root.dataset.motionEngine = typeof doc.body.animate === 'function' ? 'web-animations' : 'static';
  const updatePreference = () => { root.dataset.motionPreference = preference?.matches ? 'reduced' : 'full'; };
  updatePreference();

  function listen(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    listeners.push(() => target.removeEventListener(type, callback, options));
  }
  function allowed(explicit = false) {
    return !destroyed && !suspended && (!keyboardMode || explicit) && !preference?.matches && !doc.hidden;
  }
  function focusWithin(element) {
    const focused = doc.activeElement;
    return focused && focused !== doc.body && focused !== root &&
      (element === focused || element.contains(focused));
  }
  function visibleRect(element) {
    if (!element?.isConnected) return null;
    const rect = element.getBoundingClientRect();
    const style = win.getComputedStyle(element);
    if (!rect.width || !rect.height || style.display === 'none' || style.visibility === 'hidden') return null;
    const visibleHeight = Math.max(0, Math.min(rect.bottom, win.innerHeight * .92) - Math.max(rect.top, 96));
    return {left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
      width: rect.width, height: rect.height,
      visible: rect.bottom > 96 && rect.top < win.innerHeight && rect.right > 0 && rect.left < win.innerWidth,
      ratio: visibleHeight / Math.min(rect.height, win.innerHeight * .75)};
  }
  function stopEffects(predicate = () => true) {
    for (const [animation, element] of effects) {
      if (!predicate(element)) continue;
      effects.delete(animation);
      element.dataset.motionState = 'settled';
      animation.cancel();
    }
  }
  function stopIntroFrame() {
    if (introFrame) win.cancelAnimationFrame(introFrame);
    introFrame = 0;
  }
  function animateElement(element, frames, timing, explicit = false) {
    if (!allowed(explicit) || !element?.isConnected || typeof element.animate !== 'function' || focusWithin(element)) return false;
    stopEffects(candidate => candidate === element);
    try {
      const animation = element.animate(frames, {...timing, fill: 'backwards'});
      effects.set(animation, element);
      element.dataset.motionState = 'running';
      root.dataset.motionCount = String(++startedCount);
      const release = () => {
        effects.delete(animation);
        if (![...effects.values()].includes(element)) element.dataset.motionState = 'settled';
      };
      animation.finished?.then(release, release);
      return true;
    } catch { return false; }
  }
  function lift(element, delay = 0, explicit = false) {
    return animateElement(element, [
      {opacity: 0, transform: 'translateY(32px)'},
      {opacity: 1, transform: 'translateY(0px)'},
    ], {duration: 640, delay, easing: EASE_OUT}, explicit);
  }
  function topIsReady(explicit = false, fromWelcome = false) {
    const navigation = win.performance?.getEntriesByType?.('navigation')?.[0];
    const blockedByDialog = doc.querySelector(fromWelcome ? 'dialog[open]:not(#welcome-intro)' : 'dialog[open]');
    return allowed(explicit) && Math.abs(win.scrollY || 0) < 2 && !blockedByDialog &&
      (explicit || ((!win.location.hash || win.location.hash === '#hero-title') && navigation?.type !== 'back_forward'));
  }
  function intro({replay = false, fromWelcome = false} = {}) {
    if (destroyed || (!replay && introAttempted) || !topIsReady(replay, fromWelcome)) return false;
    stopIntroFrame();
    const play = () => {
        introFrame = 0;
        if (!topIsReady(replay, fromWelcome)) return;
        introAttempted = true;
        const copy = doc.querySelector('.hero-copy');
        const parts = [...(copy?.children || [])];
        let count = 0;
        parts.forEach((part, index) => {
          if (!visibleRect(part)?.visible) return;
          count += Number(animateElement(part, [
            {opacity: 0, transform: 'translateY(36px)'},
            {opacity: 1, transform: 'translateY(0px)'},
          ], {duration: 800, delay: (fromWelcome ? 0 : 80) + index * 70, easing: EASE_OUT}, replay));
        });
        const portrait = doc.querySelector('.hero-portrait');
        if (visibleRect(portrait)?.visible) {
          count += Number(animateElement(portrait, [
            {opacity: 0, clipPath: 'inset(12% 8% 12% 8%)', transform: 'translateY(24px) scale(.96)'},
            {opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', transform: 'translateY(0px) scale(1)'},
          ], {duration: 900, delay: fromWelcome ? 80 : 180, easing: EASE_OUT}, replay));
        }
        root.dataset.motionIntro = count ? 'played' : 'static';
    };
    if (fromWelcome) play();
    else introFrame = win.requestAnimationFrame(() => { introFrame = win.requestAnimationFrame(play); });
    return true;
  }
  function reveal(element, delay = 0, explicit = false) {
    let started;
    if (element.matches('.personal-photo-strip')) {
      // The gallery and captions retain their final layout throughout. Only the
      // photographs spread from an overlapping arrangement into their frames.
      const photos = [...element.querySelectorAll('.personal-photo-frame')];
      const wide = win.innerWidth > 739;
      let count = 0;
      photos.forEach((photo, index) => {
        if (!wide && !visibleRect(photo)?.visible) return;
        const offset = (photos.length - 1) / 2 - index;
        count += Number(animateElement(photo, [
          {opacity: .15, transform: `translate(${wide ? offset * 96 : 0}px, ${wide ? 36 : 24}px) rotate(${offset * -4}deg) scale(.92)`},
          {opacity: 1, transform: 'translate(0px, 0px) rotate(0deg) scale(1)'},
        ], {duration: 880, delay: index * 70, easing: EASE_OUT}, explicit));
      });
      started = count > 0;
      if (started) root.dataset.photoSpread = 'played';
    } else if (element === playFrame) {
      started = animateElement(playFrame, [
        {opacity: 0, transform: 'translateY(40px) scale(.94)', clipPath: 'inset(8% 5% 8% 5% round 4px)'},
        {opacity: 1, transform: 'translateY(0px) scale(1)', clipPath: 'inset(0% 0% 0% 0% round 4px)'},
      ], {duration: 900, easing: EASE_OUT}, explicit);
      const copy = doc.querySelector('.play-invitation-copy');
      if (visibleRect(copy)?.visible) lift(copy, 100, explicit);
    } else started = lift(element, delay, explicit);
    if (started) {
      seen.add(element);
      pending.delete(element);
      observer?.unobserve(element);
    }
    return started;
  }
  function eligible(element) {
    return allowed() && !doc.querySelector('dialog[open]') && !focusWithin(element) &&
      (visibleRect(element)?.ratio || 0) >= .18;
  }
  function sweep() {
    sweepFrame = 0;
    let index = 0;
    for (const element of pending) {
      if (!element.isConnected) { pending.delete(element); observer?.unobserve(element); continue; }
      if (eligible(element)) reveal(element, Math.min(index++ * 60, 180));
    }
  }
  function scheduleSweep() {
    if (!destroyed && !sweepFrame) sweepFrame = win.requestAnimationFrame(sweep);
  }
  function observe(scope = doc) {
    if (destroyed) return;
    const candidates = [...scope.querySelectorAll(REVEAL_SELECTOR)];
    if (scope === doc && playFrame) candidates.push(playFrame);
    for (const element of candidates) {
      if (seen.has(element) || pending.has(element)) continue;
      pending.add(element);
      observer?.observe(element);
    }
    scheduleSweep();
  }
  if (typeof win.IntersectionObserver === 'function') {
    observer = new win.IntersectionObserver(entries => {
      let index = 0;
      for (const entry of entries) {
        // isIntersecting is also true for a single visible pixel.
        if (!entry.isIntersecting || entry.intersectionRatio < .18 || !pending.has(entry.target)) continue;
        if (eligible(entry.target)) reveal(entry.target, Math.min(index++ * 60, 180));
      }
    }, {threshold: [0, .18], rootMargin: '0px 0px -8% 0px'});
  }
  function captureProjects(grid) {
    const before = new Map();
    if (destroyed || !grid) return before;
    for (const card of grid.querySelectorAll('.project-card[data-project]')) {
      const rect = visibleRect(card);
      if (rect) before.set(card.dataset.project, rect);
      pending.delete(card);
      observer?.unobserve(card);
    }
    stopEffects(element => !element.isConnected || grid.contains(element));
    return before;
  }
  function refreshProjects(grid, before, {animate = true} = {}) {
    if (destroyed || !grid) return 0;
    stopEffects(element => !element.isConnected || grid.contains(element));
    let started = 0;
    if (!animate && before?.size) {
      // An immediate filter/history update must not become a delayed scroll reveal.
      // Initial rendering (no prior cards) and future offscreen entries can still reveal.
      for (const element of grid.querySelectorAll('.project-card[data-project]')) {
        if (visibleRect(element)?.visible) seen.add(element);
      }
    }
    if (animate && allowed() && before?.get && !doc.querySelector('dialog[open]')) {
      for (const element of grid.querySelectorAll('.project-card[data-project]')) {
        const rect = visibleRect(element);
        if (!rect?.visible || focusWithin(element)) continue;
        const previous = before.get(element.dataset.project);
        const moved = previous?.visible && (Math.abs(previous.left - rect.left) > .5 || Math.abs(previous.top - rect.top) > .5);
        // A retained stationary lead card also needs feedback that the filter changed.
        const frames = moved ? [
          {opacity: .4, transform: `translate(${previous.left - rect.left}px, ${previous.top - rect.top}px)`},
          {opacity: 1, transform: 'translate(0px, 0px)'},
        ] : [{opacity: .15, transform: 'translateY(18px)'}, {opacity: 1, transform: 'translateY(0px)'}];
        const didStart = animateElement(element, frames, {duration: moved ? 400 : 360,
          delay: Math.min(started * 50, 100), easing: moved ? EASE_MOVE : EASE_OUT});
        if (didStart) { started++; seen.add(element); }
      }
    }
    observe(grid);
    return started;
  }
  function cancel() { stopIntroFrame(); stopEffects(); }
  function replay(section) {
    if (!section || !allowed(true)) return false;
    cancel();
    if (section.matches('.hero')) return intro({replay: true});
    if (playFrame && section.contains(playFrame)) return reveal(playFrame, 0, true);
    const photoStrip = section.matches('.personal-photo-strip') ? section : section.querySelectorAll('.personal-photo-strip')[0];
    if (photoStrip && visibleRect(photoStrip)?.visible) return reveal(photoStrip, 0, true);
    const targets = section.querySelectorAll('.section-heading, .project-card, .toolkit-explorer, .personal-section-heading');
    let count = 0;
    for (const element of targets) {
      if (visibleRect(element)?.visible) count += Number(lift(element, count * 60, true));
    }
    return count > 0;
  }
  listen(doc, 'keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
    keyboardMode = true;
    cancel();
  }, true);
  const pointerIntent = () => { keyboardMode = false; scheduleSweep(); };
  listen(doc, 'pointerdown', pointerIntent, true);
  listen(doc, 'wheel', pointerIntent, {passive: true});
  listen(doc, 'touchstart', pointerIntent, {passive: true});
  listen(doc, 'focusin', event => stopEffects(element => element === event.target || element.contains(event.target)), true);
  listen(win, 'scroll', scheduleSweep, {passive: true});
  listen(doc, 'close', scheduleSweep, true);
  listen(win, 'pagehide', () => { suspended = true; cancel(); });
  listen(win, 'pageshow', event => {
    // Initial pageshow must not cancel an entrance started during module loading.
    if (event.persisted) { cancel(); introAttempted = true; }
    suspended = false;
    scheduleSweep();
  });
  listen(win, 'hashchange', () => { cancel(); scheduleSweep(); });
  listen(doc, 'visibilitychange', () => {
    if (doc.hidden) cancel();
    else { intro(); scheduleSweep(); }
  });
  const preferenceChanged = () => {
    updatePreference();
    if (preference.matches) cancel();
    else scheduleSweep();
  };
  if (preference?.addEventListener) listen(preference, 'change', preferenceChanged);
  else if (preference?.addListener) {
    preference.addListener(preferenceChanged);
    listeners.push(() => preference.removeListener(preferenceChanged));
  }
  observe();
  function destroy() {
    if (destroyed) return;
    cancel();
    destroyed = true;
    if (sweepFrame) win.cancelAnimationFrame(sweepFrame);
    observer?.disconnect();
    pending.clear();
    for (const remove of listeners) remove();
  }
  return {intro, observe, captureProjects, refreshProjects, replay, cancel, destroy};
}
