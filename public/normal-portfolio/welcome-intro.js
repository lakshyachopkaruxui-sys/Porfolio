// The selected LC mark resolves from printed fragments, then becomes the real header logo.
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_MOVE = 'cubic-bezier(0.77, 0, 0.175, 1)';
let sharedIntro;

export function getWelcomeIntro() {
  return sharedIntro || (sharedIntro = mountWelcomeIntro());
}

export function mountWelcomeIntro() {
  const revealSubscribers = new Set();
  const finishSubscribers = new Set();
  let current = null;
  let generation = 0;
  let destroyed = false;
  const available = typeof window !== 'undefined' && typeof document !== 'undefined';
  const win = available ? window : null;
  const doc = available ? document : null;
  const preference = win?.matchMedia?.('(prefers-reduced-motion: reduce)');

  function notify(subscribers, value) {
    for (const callback of subscribers) {
      try { callback(value); } catch { /* Optional observers cannot strand the opening. */ }
    }
  }
  function eligible(force) {
    if (!available || destroyed || doc.hidden || doc.querySelector('dialog[open]')) return false;
    if (!force && ((!win.location.hash && Math.abs(win.scrollY || 0) > 2) ||
      win.performance?.getEntriesByType?.('navigation')?.[0]?.type === 'back_forward')) return false;
    const focus = doc.activeElement;
    return force || !focus || focus === doc.body || focus === doc.documentElement;
  }
  function begin(force = false) {
    if (current) return current.promise;
    if (!eligible(force)) return Promise.resolve({shown: false, reason: 'ineligible'});
    const sourceLogo = doc.querySelector('.wordmark .brand-logo');
    if (!sourceLogo?.outerHTML) return Promise.resolve({shown: false, reason: 'missing-logo'});
    const dialog = doc.createElement('dialog');
    if (typeof dialog.showModal !== 'function' || typeof dialog.animate !== 'function') {
      return Promise.resolve({shown: false, reason: 'unsupported'});
    }
    const id = ++generation;
    const initialScroll = win.scrollY || 0;
    const timers = new Set();
    const effects = new Set();
    const removeListeners = [];
    let restoreTarget = null;
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    const run = {id, dialog, promise, phase: 'composition', shown: false, revealed: false};
    current = run;
    dialog.id = 'welcome-intro';
    dialog.style.width = `${win.innerWidth}px`;
    dialog.style.height = `${win.innerHeight}px`;
    dialog.setAttribute('aria-label', 'Welcome to Lakshya Chopkar’s portfolio');
    dialog.dataset.phase = 'composition';
    // Trusted SVG from this page is reused without a network request or font substitution.
    const mark = sourceLogo.outerHTML;
    dialog.innerHTML = `<div class="welcome-backdrop" aria-hidden="true"></div>
      <div class="welcome-meta"><button class="welcome-skip" type="button" autofocus>Skip intro <span aria-hidden="true">↗</span></button></div>
      <div class="welcome-composition" aria-hidden="true">
        <div class="welcome-logo"><div class="welcome-logo-plane">
          <div class="welcome-slice welcome-slice-top">${mark}</div>
          <div class="welcome-slice welcome-slice-middle">${mark}</div>
          <div class="welcome-slice welcome-slice-bottom">${mark}</div>
          <div class="welcome-assembled">${mark}</div>
        </div></div>
        <div class="welcome-caption"><p class="welcome-name">Lakshya Chopkar</p><p>Product Designer</p></div>
      </div>`;
    const live = () => current?.id === id;
    const listen = (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      removeListeners.push(() => target.removeEventListener(type, handler, options));
    };
    function finish(reason) {
      if (!live()) return;
      current = null;
      for (const timer of timers) win.clearTimeout(timer);
      timers.clear();
      for (const animation of effects) {
        try { animation.cancel(); } catch { /* One failed effect cannot retain a modal opening. */ }
      }
      effects.clear();
      for (const remove of removeListeners) {
        try { remove(); } catch { /* Continue releasing the other owned listeners. */ }
      }
      // The real header must survive every interruption, including a failed flight.
      if (restoreTarget) {
        try { restoreTarget(); } catch { /* The temporary dialog still needs to close. */ }
        restoreTarget = null;
      }
      try { if (dialog.open) dialog.close(); } catch { /* Removal is the final fallback. */ }
      dialog.remove();
      doc.documentElement.dataset.welcomeState = reason;
      const result = {shown: run.shown, reason};
      resolve(result);
      notify(finishSubscribers, result);
    }
    run.finish = finish;
    const after = (callback, delay) => {
      const timer = win.setTimeout(() => {
        timers.delete(timer);
        if (!live()) return;
        try { callback(); } catch { finish('error'); }
      }, delay);
      timers.add(timer);
    };
    const animate = (element, frames, timing) => {
      const animation = element.animate(frames, {...timing, fill: 'both'});
      effects.add(animation);
      animation.finished?.catch(() => {});
      return animation;
    };
    const reveal = () => {
      if (!live() || run.revealed) return;
      run.revealed = true;
      run.phase = 'revealing';
      dialog.dataset.phase = 'revealing';
      doc.documentElement.dataset.welcomeState = 'revealing';
      notify(revealSubscribers, {reduced: Boolean(preference?.matches)});
    };
    try {
      doc.body.append(dialog);
      if (win.getComputedStyle(dialog).getPropertyValue('--welcome-ready').trim() !== '1') {
        finish('unsupported-style');
        return promise;
      }
      dialog.showModal();
      run.shown = true;
      doc.documentElement.dataset.welcomeState = 'composition';
      listen(dialog.querySelector('.welcome-skip'), 'click', () => finish('user-skip'));
      listen(dialog, 'cancel', event => { event.preventDefault(); finish('user-skip'); });
      listen(doc, 'keydown', event => {
        if (event.ctrlKey || event.metaKey || event.altKey || ['Shift', 'Control', 'Meta', 'Alt'].includes(event.key)) return;
        if (event.key === 'Escape') event.preventDefault();
        finish('keyboard');
      }, true);
      listen(dialog, 'wheel', () => finish('user-skip'), {passive: true});
      listen(dialog, 'touchmove', () => finish('user-skip'), {passive: true});
      listen(win, 'pagehide', () => finish('navigation'));
      listen(win, 'pageshow', event => { if (event.persisted) finish('navigation'); });
      listen(win, 'hashchange', () => finish('navigation'));
      listen(win, 'scroll', () => { if (Math.abs((win.scrollY || 0) - initialScroll) > 2) finish('restored-scroll'); }, {passive: true});
      listen(win, 'resize', () => finish('resize'));
      listen(doc, 'visibilitychange', () => { if (doc.hidden) finish('hidden'); });
      if (preference?.addEventListener) listen(preference, 'change', () => finish('preference'));
      after(() => finish('timeout'), 3800);
      const logo = dialog.querySelector('.welcome-logo');
      const caption = dialog.querySelector('.welcome-caption');
      const viewBox = sourceLogo.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
      const ratio = viewBox?.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0
        ? viewBox[2] / viewBox[3] : 1.2;
      logo.style.aspectRatio = String(ratio);
      const sourceBox = logo.getBoundingClientRect();
      caption.style.top = `${sourceBox.bottom + 26}px`;
      // A cold case/section link still receives the owner's logo greeting, then
      // reaches its intended reading destination without a full homepage flight.
      if (preference?.matches || (!force && win.location.hash)) {
        if (preference?.matches) dialog.dataset.reduced = 'true';
        dialog.dataset.compact = 'true';
        animate(dialog.querySelector('.welcome-composition'), [{opacity: 0}, {opacity: 1}], {duration: 160, easing: EASE_OUT});
        after(() => {
          reveal();
          if (!live()) return;
          animate(dialog, [{opacity: 1}, {opacity: 0}], {duration: 220, easing: EASE_OUT});
        }, 360);
        after(() => finish('completed'), 600);
        return promise;
      }

      const plane = dialog.querySelector('.welcome-logo-plane');
      const slices = [...dialog.querySelectorAll('.welcome-slice')];
      animate(plane, [
        {transform: 'scale(1.8)'}, {transform: 'scale(1)'},
      ], {duration: 1100, easing: EASE_MOVE});
      const offsets = ['translate(19%, -6%)', 'translate(-14%, 0)', 'translate(10%, 7%)'];
      slices.forEach((slice, index) => animate(slice, [
        {transform: offsets[index]}, {transform: 'translate(0, 0)'},
      ], {duration: 900, delay: index * 75, easing: EASE_OUT}));
      animate(caption, [
        {opacity: 0, transform: 'translate(-50%, 12px)'}, {opacity: 1, transform: 'translate(-50%, 0)'},
      ], {duration: 350, delay: 950, easing: EASE_OUT});
      after(() => {
        dialog.dataset.phase = 'resolved';
        doc.documentElement.dataset.welcomeState = 'resolved';
        animate(dialog.querySelector('.welcome-assembled'), [{opacity: 0}, {opacity: 1}], {duration: 100, easing: EASE_OUT});
        slices.forEach(slice => animate(slice, [{opacity: 1}, {opacity: 0}], {duration: 100, easing: EASE_OUT}));
      }, 1150);

      after(() => {
        // Prime homepage content while it is still covered, then move this exact mark home.
        reveal();
        if (!live()) return;
        const target = doc.querySelector('.wordmark .brand-logo');
        const destination = target?.getBoundingClientRect();
        const source = logo.getBoundingClientRect();
        const valid = box => box && ['left', 'top', 'width', 'height'].every(key => Number.isFinite(box[key])) &&
          box.width > 0 && box.height > 0;
        if (valid(source) && valid(destination) && destination.top >= 0 && destination.left >= 0 &&
          destination.top + destination.height <= win.innerHeight && destination.left + destination.width <= win.innerWidth &&
          Math.abs(destination.width / destination.height - source.width / source.height) < .04) {
          const oldValue = target.style.getPropertyValue('visibility');
          const oldPriority = target.style.getPropertyPriority('visibility');
          restoreTarget = () => oldValue
            ? target.style.setProperty('visibility', oldValue, oldPriority)
            : target.style.removeProperty('visibility');
          target.style.setProperty('visibility', 'hidden');
          const dx = destination.left - source.left;
          const dy = destination.top - source.top;
          const scale = destination.width / source.width;
          animate(logo, [
            {transform: 'translate(-50%, -50%) scale(1)'},
            {transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale})`},
          ], {duration: 1100, easing: EASE_MOVE});
        } else {
          animate(logo, [{opacity: 1}, {opacity: 0}], {duration: 300, easing: EASE_OUT});
        }
        animate(caption, [
          {opacity: 1, transform: 'translate(-50%, 0)'}, {opacity: 0, transform: 'translate(-50%, -8px)'},
        ], {duration: 250, easing: EASE_OUT});
        animate(dialog.querySelector('.welcome-backdrop'), [
          {transform: 'translateY(0)'}, {transform: 'translateY(-102%)'},
        ], {duration: 1100, delay: 100, easing: EASE_MOVE});
      }, 1700);
      after(() => finish('completed'), 3000);
    } catch { finish('error'); }
    return promise;
  }
  const finished = begin();
  return {
    finished,
    onReveal(callback) {
      revealSubscribers.add(callback);
      return () => revealSubscribers.delete(callback);
    },
    onFinish(callback) { finishSubscribers.add(callback); return () => finishSubscribers.delete(callback); },
    replay() { return begin(true); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      current?.finish('destroyed');
      revealSubscribers.clear();
      finishSubscribers.clear();
    },
  };
}
