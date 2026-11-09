/** Render an owner-supplied case film with native controls and bounded playback. */
export function mountCaseVideo({parent, reader, media} = {}) {
  if (!parent || !reader || !media) return () => {};
  const document = parent.ownerDocument || globalThis.document;
  const view = document?.defaultView || globalThis.window;
  if (!document?.createElement) return () => {};
  let disposed = false;
  const cleanups = [];

  function create(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text) item.textContent = text;
    return item;
  }

  function localAsset(value) {
    if (typeof value !== 'string' || !value || /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//')) return null;
    let decoded;
    try { decoded = decodeURIComponent(value); } catch { return null; }
    if (/[\\\u0000-\u001f?#%]/.test(decoded) || decoded.split('/').some(part => part === '.' || part === '..')) return null;
    try {
      const source = new URL(value, import.meta.url);
      const assets = new URL('./assets/cases/', import.meta.url);
      if (source.origin !== assets.origin || source.protocol !== assets.protocol || !source.pathname.startsWith(assets.pathname)) return null;
      return source;
    } catch { return null; }
  }

  function listen(target, name, handler, options) {
    if (!target?.addEventListener) return;
    target.addEventListener(name, handler, options);
    cleanups.push(() => target.removeEventListener(name, handler, options));
  }

  const figure = create('figure', 'story-video');
  parent.append(figure);
  const caption = create('figcaption', 'story-video-caption', media.caption || media.alt || 'Project film');
  const source = localAsset(media.src);
  if (!source) {
    figure.append(create('p', 'story-video-error', 'This project video is unavailable.'), caption);
    return () => {
      if (disposed) return;
      disposed = true;
      figure.remove();
    };
  }

  const video = create('video', 'story-video-player');
  video.controls = true;
  video.preload = 'none';
  video.playsInline = true;
  video.autoplay = false;
  video.loop = false;
  video.muted = false;
  video.defaultMuted = false;
  video.width = Number(media.width) > 0 ? Number(media.width) : 1280;
  video.height = Number(media.height) > 0 ? Number(media.height) : 720;
  video.setAttribute('aria-label', media.alt || media.caption || 'Project film');
  const poster = localAsset(media.poster);
  if (poster) video.poster = poster.href;
  video.src = source.href;
  video.append(create('p', undefined, 'Your browser cannot play this video. Use the video file link below.'));

  const status = create('p', 'story-video-error');
  status.hidden = true;
  status.setAttribute('role', 'status');
  const fallback = create('a', 'story-video-fallback', 'Open video file (new tab)');
  fallback.href = source.href;
  fallback.target = '_blank';
  fallback.rel = 'noopener';
  figure.append(video, caption, status, fallback);

  const pause = () => {
    try { video.pause?.(); } catch { /* A removed or unsupported media element has no playback to preserve. */ }
  };
  const hidden = () => document.hidden || document.visibilityState === 'hidden';
  listen(reader, 'close', pause);
  listen(document, 'visibilitychange', () => { if (hidden()) pause(); });
  listen(view, 'pagehide', pause);
  listen(document, 'play', event => {
    if (event.target === video) {
      if (reader.open === false || hidden()) pause();
    } else if (event.target?.tagName?.toLowerCase() === 'video' && event.target.closest?.('.story-video')) pause();
  }, true);
  listen(video, 'error', () => {
    if (disposed) return;
    pause();
    status.hidden = false;
    status.textContent = 'This video could not play. Open the video file to try it separately.';
  });

  return () => {
    if (disposed) return;
    disposed = true;
    cleanups.forEach(cleanup => cleanup());
    pause();
    video.removeAttribute('src');
    try { video.load?.(); } catch { /* The element is already detached or unsupported. */ }
    figure.remove();
  };
}
