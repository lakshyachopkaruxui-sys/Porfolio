// Optional previews reuse the original project recordings. Case-study films keep
// their own native controls; these muted card previews never load on page entry.
const PREVIEWS = {
  'pixel-mania': {
    src: './assets/cases/pixel-mania/evidence/board-demo.mp4',
    width: 1440, height: 1024,
  },
  syringe: {
    src: './assets/cases/syringe/evidence/syringe-showcase.mp4',
    width: 1280, height: 720,
  },
};

export function mountProjectPreview(link, figure, projectId) {
  const config = PREVIEWS[projectId];
  if (!config || !link || !figure) return {pause() {}, dispose() {}};

  const doc = link.ownerDocument;
  const win = doc.defaultView;
  const reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const hover = win.matchMedia?.('(hover: hover) and (pointer: fine)');
  const connection = win.navigator?.connection;
  const listeners = [];
  let video = null;
  let pointerIntent = false;
  let focusIntent = false;
  let visible = true;
  let disposed = false;
  let generation = 0;
  let pending = null;
  let failed = false;

  function listen(target, type, listener) {
    if (!target?.addEventListener) return;
    target.addEventListener(type, listener);
    listeners.push(() => target.removeEventListener(type, listener));
  }

  function allowed() {
    return !disposed && visible && !doc.hidden && !reduced?.matches
      && !connection?.saveData && (pointerIntent || focusIntent);
  }

  function stopMedia() {
    generation++;
    pending = null;
    figure.classList.remove('is-preview-playing');
    if (!video) return;
    video.pause();
    try { video.currentTime = 0; } catch { /* Metadata may not be loaded yet. */ }
  }

  function pause() {
    pointerIntent = false;
    focusIntent = false;
    stopMedia();
  }

  function reveal() {
    if (allowed() && pending !== null && video && !video.paused && video.readyState >= 2) {
      figure.classList.add('is-preview-playing');
    } else if (video && !allowed()) {
      stopMedia();
    }
  }

  function createVideo() {
    video = doc.createElement('video');
    video.className = 'project-preview';
    video.width = config.width;
    video.height = config.height;
    video.preload = 'none';
    video.autoplay = false;
    video.controls = false;
    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.tabIndex = -1;
    video.setAttribute('aria-hidden', 'true');
    listen(video, 'playing', reveal);
    listen(video, 'pause', () => figure.classList.remove('is-preview-playing'));
    listen(video, 'error', () => { failed = true; pause(); });
    // Assigning the URL is delayed until an allowed visitor action reaches here.
    video.src = new URL(config.src, import.meta.url).href;
    figure.append(video);
  }

  function start() {
    if (!allowed() || pending !== null) return;
    if (!video) createVideo();
    if (failed) { failed = false; video.load(); }
    const attempt = ++generation;
    pending = attempt;
    try {
      Promise.resolve(video.play()).then(() => {
        // A settled old request cannot reveal a preview after leave, suspension
        // or disposal, nor interfere with a newer deliberate playback request.
        if (disposed || !allowed()) {
          video.pause();
          figure.classList.remove('is-preview-playing');
          return;
        }
        if (generation === attempt && pending === attempt) reveal();
      }, () => {
        if (generation === attempt && !disposed) pause();
      });
    } catch {
      if (generation === attempt) pause();
    }
  }

  listen(link, 'pointerenter', event => {
    if (event.isTrusted === false || !hover?.matches
      || !['mouse', 'pen'].includes(event.pointerType)) return;
    pointerIntent = true;
    start();
  });
  listen(link, 'pointerleave', () => {
    pointerIntent = false;
    if (!focusIntent) stopMedia();
  });
  listen(link, 'focus', () => {
    // Touch focus does not start a video. Keyboard navigation retains a preview.
    if (!link.matches(':focus-visible')) return;
    focusIntent = true;
    start();
  });
  listen(link, 'blur', () => {
    focusIntent = false;
    if (!pointerIntent) stopMedia();
  });
  listen(doc, 'visibilitychange', () => { if (doc.hidden) pause(); });
  listen(reduced, 'change', () => { if (reduced.matches) pause(); });
  listen(hover, 'change', () => {
    if (hover.matches) return;
    pointerIntent = false;
    if (!focusIntent) stopMedia();
  });
  listen(connection, 'change', () => { if (connection.saveData) pause(); });

  const observer = typeof win.IntersectionObserver === 'function'
    ? new win.IntersectionObserver(entries => {
      const entry = entries.find(item => item.target === figure);
      if (!entry) return;
      visible = entry.isIntersecting;
      if (!visible) pause();
      // Keyboard focus can scroll the card onscreen before the observer reports
      // that movement. Only a fresh intent retained after the last exit resumes.
      else start();
    }) : null;
  observer?.observe(figure);

  return {
    pause,
    dispose() {
      if (disposed) return;
      pause();
      disposed = true;
      observer?.disconnect();
      for (const remove of listeners.splice(0)) remove();
      if (video) {
        video.removeAttribute('src');
        video.load();
        video.remove();
      }
    },
  };
}
