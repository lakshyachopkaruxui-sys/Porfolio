// A progressively enhanced photo frame. The biography and frame stay stationary.
const PHOTO_DWELL = 1200;
const PHOTO_TRANSITION = 240;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

export function mountPhotoCarousel(host) {
  if (!host) return null;
  const win = window;
  const doc = document;
  const slides = [...host.querySelectorAll('[data-photo-slide]')];
  const stage = host.querySelector('.photo-carousel-stage');
  const rotation = host.querySelector('[data-photo-rotation]');
  const help = host.querySelector('[data-photo-help]');
  const status = host.querySelector('[data-photo-status]');
  if (slides.length < 2 || !stage || !rotation || !status) return null;
  const preference = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const listeners = [];
  let index = 0;
  let requestedIndex = 0;
  let paused = Boolean(preference?.matches);
  let hovered = false;
  let inView = false;
  let suspended = false;
  let destroyed = false;
  let timer = null;
  let request = 0;
  let animations = [];
  let rotationIntent = null;
  let observer;
  const failedSlides = new Set();

  function listen(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    listeners.push(() => target.removeEventListener(type, callback, options));
  }
  function clearTimer() {
    if (timer !== null) win.clearTimeout(timer);
    timer = null;
  }
  function canRotate() {
    return !destroyed && !paused && !hovered && inView && !suspended && !doc.hidden &&
      !preference?.matches && !doc.querySelector('dialog[open]');
  }
  function updateState() {
    rotation.setAttribute('aria-label', preference?.matches ? 'Next photo' : paused ? 'Play photos' : 'Pause photos');
    if (help) help.textContent = preference?.matches
      ? 'Select the photo to see the next one. A/D or Left/Right browse; Home/End jump to the first or last photo.'
      : 'Photos change automatically. Select the photo to pause or play. A/D or Left/Right browse; Home/End jump to the first or last photo.';
    host.dataset.photoIndex = String(index + 1);
    host.dataset.photoId = slides[index].dataset.photoSlide;
    host.dataset.carouselState = destroyed ? 'destroyed' : canRotate() ? 'playing' : paused ? 'paused' : 'waiting';
  }
  function settle() {
    for (const animation of animations) animation.cancel();
    animations = [];
    slides.forEach((slide, position) => {
      slide.hidden = position !== index;
      slide.setAttribute('aria-hidden', String(position !== index));
      slide.style.zIndex = '';
    });
  }
  function interrupt() {
    request++;
    requestedIndex = index;
    clearTimer();
    settle();
    updateState();
  }
  function preload(position) {
    const image = slides[position]?.querySelector('img');
    if (image) image.loading = 'eager';
    return image;
  }
  function animateLayer(slide, keyframes) {
    const animation = slide.animate(keyframes, {duration: PHOTO_TRANSITION, easing: EASE_OUT, fill: 'both'});
    // Attach cancellation handling before another layer can fail to initialize.
    animation.finished?.catch(() => {});
    animations.push(animation);
  }
  async function show(position, manual = false) {
    if (destroyed) return false;
    const destination = (position + slides.length) % slides.length;
    const token = ++request;
    requestedIndex = destination;
    clearTimer();
    settle();
    const image = preload(destination);
    if (!image) return false;
    try {
      if (typeof image.decode === 'function') await image.decode();
      else if (!image.complete || !image.naturalWidth) throw new Error('Photo unavailable');
    } catch {
      if (!destroyed && token === request) {
        failedSlides.add(destination);
        requestedIndex = index;
        if (manual) status.textContent = 'This photo could not load. Try another photo.';
      }
      return false;
    }
    if (destroyed || token !== request || (!manual && !canRotate())) return false;
    failedSlides.delete(destination);
    if (destination === index) {
      if (manual) status.textContent = `Photo ${index + 1} of ${slides.length}. ${image.alt}`;
      return true;
    }
    const outgoing = slides[index];
    const incoming = slides[destination];
    index = destination;
    incoming.hidden = false;
    incoming.setAttribute('aria-hidden', 'false');
    outgoing.setAttribute('aria-hidden', 'true');
    incoming.style.zIndex = '2';
    updateState();
    if (manual) status.textContent = `Photo ${index + 1} of ${slides.length}. ${image.alt}`;
    else status.textContent = '';
    // A small upward settle gives the automatic handoff a tactile feel.
    // Overscan prevents empty mask edges; the individual photo crops stay intact.
    // Manual changes and reduced motion remain immediate.
    if (!preference?.matches && !manual && typeof incoming.animate === 'function') {
      try {
        animateLayer(incoming, [
          {opacity: 0, transform: 'translateY(10px) scale(1.04)', offset: 0},
          {opacity: 1, transform: 'translateY(-2px) scale(1.02)', offset: .72},
          {opacity: 1, transform: 'translateY(0) scale(1)', offset: 1},
        ]);
        animateLayer(outgoing, [{opacity: 1}, {opacity: 0}]);
        await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
      } catch { /* The normal image layout remains the fallback. */ }
    }
    if (destroyed || token !== request) return false;
    settle();
    preload((index + 1) % slides.length);
    return true;
  }
  function schedule() {
    clearTimer();
    updateState();
    if (!canRotate()) return;
    preload(index);
    preload((index + 1) % slides.length);
    timer = win.setTimeout(async () => {
      timer = null;
      if (!canRotate()) return;
      let destination = (index + 1) % slides.length;
      while (failedSlides.has(destination) && destination !== index) destination = (destination + 1) % slides.length;
      if (destination === index) { paused = true; updateState(); return; }
      await show(destination);
      schedule();
    }, PHOTO_DWELL);
  }
  function manualStep(direction) {
    const destination = requestedIndex + direction;
    paused = true;
    interrupt();
    show(destination, true);
  }
  // Preserve the intended action when pointer focus pauses a running carousel
  // immediately before the photo receives the click.
  listen(rotation, 'pointerdown', () => { rotationIntent = paused ? 'play' : 'pause'; });
  listen(rotation, 'pointercancel', () => { rotationIntent = null; });
  listen(rotation, 'click', () => {
    if (preference?.matches) {
      rotationIntent = null;
      manualStep(1);
      return;
    }
    const action = rotationIntent || (paused ? 'play' : 'pause');
    rotationIntent = null;
    paused = action !== 'play' || Boolean(preference?.matches);
    interrupt();
    schedule();
  });
  listen(host, 'pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovered = true;
    interrupt();
  });
  listen(host, 'pointerleave', () => { hovered = false; rotationIntent = null; schedule(); });
  listen(host, 'focusin', () => { paused = true; interrupt(); });
  rotation.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight A D Home End');
  listen(host, 'keydown', event => {
    rotationIntent = null;
    // Shortcuts belong to this focused photo frame, never the browser, an
    // editable field or a native media control placed inside it later.
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        event.isComposing || event.keyCode === 229 || event.target?.isContentEditable ||
        event.target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"], video, audio')) return;
    const key = event.key?.toLowerCase();
    let direction;
    if (key === 'arrowleft' || key === 'a') direction = -1;
    else if (key === 'arrowright' || key === 'd') direction = 1;
    else if (key === 'home') direction = -requestedIndex;
    else if (key === 'end') direction = slides.length - 1 - requestedIndex;
    else return; // Up/Down, PageUp/PageDown, Tab and button activation remain native.
    event.preventDefault();
    manualStep(direction);
  });
  const visibility = () => { interrupt(); schedule(); };
  listen(doc, 'visibilitychange', visibility);
  listen(doc, 'focusin', () => { if (doc.querySelector('dialog[open]')) interrupt(); }, true);
  listen(win, 'pagehide', () => { suspended = true; interrupt(); });
  listen(win, 'pageshow', () => { suspended = false; schedule(); });
  listen(doc, 'close', schedule, true);
  const preferenceChanged = () => { paused = true; interrupt(); schedule(); };
  if (preference?.addEventListener) listen(preference, 'change', preferenceChanged);
  else if (preference?.addListener) {
    preference.addListener(preferenceChanged);
    listeners.push(() => preference.removeListener(preferenceChanged));
  }
  function measureVisibility() {
    const rect = stage.getBoundingClientRect();
    const height = Math.min(rect.bottom, win.innerHeight) - Math.max(rect.top, 100);
    // The full-frame pause target is always available with the visible photo.
    const visible = height > Math.min(rect.height, win.innerHeight) * .35;
    if (visible === inView) return;
    inView = visible;
    if (!visible) interrupt();
    schedule();
  }
  if (typeof win.IntersectionObserver === 'function') {
    observer = new win.IntersectionObserver(measureVisibility, {threshold: [0, .35, .5, .75, 1], rootMargin: '-100px 0px 0px'});
    observer.observe(host);
  } else {
    listen(win, 'scroll', measureVisibility, {passive: true});
  }
  listen(win, 'resize', measureVisibility, {passive: true});
  rotation.hidden = false;
  settle();
  updateState();
  measureVisibility();
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    interrupt();
    observer?.disconnect();
    for (const remove of listeners) remove();
    rotation.hidden = true;
  }
  return {destroy};
}
