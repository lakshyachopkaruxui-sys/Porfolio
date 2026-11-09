// Shared-image continuity, progressively enhanced over the native case dialog.
// Reference principle: https://prompt-motion.com/twoclipping-5cba86
// No reference code, media, or timed film sequence is used here.
export function mountCaseMotion(reader) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let cleanup = null;
  let scrollAtStart = 0;
  const cancel = () => { const dispose = cleanup; cleanup = null; dispose?.(); };

  // Both portfolio surfaces use object-fit: contain. Follow the painted image,
  // not its differently shaped CSS box, so the artifact never stretches.
  function paintedRect(image, ratio) {
    const box = image.getBoundingClientRect();
    const width = Math.min(box.width, box.height * ratio);
    const height = width / ratio;
    return {left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height};
  }
  const inView = rect => rect.width > 1 && rect.height > 1 && rect.top >= 0 && rect.left >= 0
    && rect.top + rect.height <= window.innerHeight && rect.left + rect.width <= window.innerWidth;
  const visibleSource = rect => {
    const width = Math.max(0, Math.min(rect.left + rect.width, window.innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.top + rect.height, window.innerHeight) - Math.max(rect.top, 0));
    // A partly visible artifact can travel naturally from the viewport edge.
    // A tiny sliver or an entirely off-screen image uses the content entrance.
    return width >= 24 && height >= 24 && width * height >= rect.width * rect.height * .15;
  };

  function run(element, frames, duration, restore = () => {}) {
    let animation;
    const dispose = () => {
      restore();
      if (animation) { animation.onfinish = null; animation.oncancel = null; animation.cancel(); }
    };
    cleanup = dispose;
    scrollAtStart = reader.scrollTop;
    try {
      animation = element.animate(frames, {duration, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'both'});
      const finish = () => { if (cleanup === dispose) cancel(); };
      animation.onfinish = finish;
      animation.oncancel = finish;
      return true;
    } catch { cancel(); return false; }
  }

  function contentEntrance() {
    const content = reader.querySelector('#case-content');
    if (!content) return;
    // WAAPI leaves no inline opacity/transform to strand the reading content.
    run(content, [
      {opacity: .45, transform: 'translateY(14px)'},
      {opacity: 1, transform: 'translateY(0)'},
    ], 350);
  }

  function capture(link, event) {
    cancel();
    if (reduced.matches || !event?.detail || typeof Element.prototype.animate !== 'function') return null;
    const fallback = {pointer: true};
    const image = link.querySelector('.project-art img');
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return fallback;
    const ratio = image.naturalWidth / image.naturalHeight;
    const rect = paintedRect(image, ratio);
    return visibleSource(rect) ? {...fallback, rect, ratio, src: image.currentSrc || image.src} : fallback;
  }

  function enter(snapshot) {
    cancel();
    if (!snapshot?.pointer || reduced.matches || !reader.open) return;
    if (!snapshot.rect || reader.scrollTop > 0) { contentEntrance(); return; }
    const target = reader.querySelector('.story-hero-art img');
    if (!target) { contentEntrance(); return; }
    const end = paintedRect(target, snapshot.ratio);
    if (!inView(end)) { contentEntrance(); return; }
    const copy = document.createElement('img');
    copy.className = 'case-image-flight';
    copy.src = snapshot.src;
    copy.alt = '';
    copy.setAttribute('aria-hidden', 'true');
    copy.style.left = `${end.left}px`;
    copy.style.top = `${end.top}px`;
    copy.style.width = `${end.width}px`;
    copy.style.height = `${end.height}px`;
    reader.append(copy);
    const previousOpacity = target.style.opacity;
    const restore = () => {
      target.style.opacity = previousOpacity;
      copy.remove();
    };
    const started = run(copy, [
      {transform: `translate(${snapshot.rect.left - end.left}px, ${snapshot.rect.top - end.top}px) scale(${snapshot.rect.width / end.width})`},
      {transform: 'translate(0, 0) scale(1)'},
    ], 420, restore);
    if (started) target.style.opacity = '0';
    else contentEntrance();
  }

  const onPreference = () => { if (reduced.matches) cancel(); };
  // Assigning the restored scrollTop before enter() can queue a late event.
  // Cancel only when the actual reading position changes during this entrance.
  const onScroll = () => { if (cleanup && reader.scrollTop !== scrollAtStart) cancel(); };
  reduced.addEventListener('change', onPreference);
  reader.addEventListener('scroll', onScroll, {passive: true});
  const events = [
    [reader, 'close'], [reader, 'cancel'], [reader, 'wheel'], [reader, 'touchstart'],
    [document, 'keydown'], [window, 'resize'], [window, 'pagehide'], [window, 'pageshow'],
  ];
  for (const [target, type] of events) target.addEventListener(type, cancel, {passive: true});
  return {capture, enter, cancel, destroy() {
    cancel();
    reduced.removeEventListener('change', onPreference);
    reader.removeEventListener('scroll', onScroll);
    for (const [target, type] of events) target.removeEventListener(type, cancel);
  }};
}
