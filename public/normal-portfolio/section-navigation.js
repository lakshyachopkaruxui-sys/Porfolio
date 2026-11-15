/** The preceding section stays current through intentional large section gaps. */
export function currentSection(sections, readingLine, atBottom = false) {
  if (!sections.length) return null;
  if (atBottom) return sections.at(-1).id;
  let current = sections[0].id;
  for (const section of sections) if (section.top <= readingLine) current = section.id;
  return current;
}

/** Own a short fragment landing while asynchronous layout settles; yield on user intent. */
export function mountDocumentAnchors(doc = document, view = window) {
  let anchor = null, frame = null, timer = null, dead = false;
  const off = [];
  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    off.push(() => target.removeEventListener(type, fn, options));
  };
  function release() {
    anchor = null;
    if (timer !== null) view.clearTimeout(timer);
    timer = null;
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
  }
  function targetFor(hash) {
    if (!hash || hash.startsWith('#project-')) return null;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return null; }
    const aliases = {approach: 'work', highlights: 'work', life: 'about', questions: 'contact'};
    const target = doc.getElementById(aliases[id] || id);
    return target && !target.closest?.('dialog') ? target : null;
  }
  function align() {
    frame = null;
    if (dead || !anchor || doc.querySelector('#case-reader[open]')) return;
    const header = doc.querySelector('.site-header');
    const offset = header && view.getComputedStyle(header).position === 'sticky'
      ? header.getBoundingClientRect().height + 32 : 32;
    const delta = anchor.target.id === 'top' ? -view.scrollY : anchor.target.getBoundingClientRect().top - offset;
    if (Math.abs(delta) > 1) view.scrollTo({top: Math.max(0, view.scrollY + delta), behavior: 'instant'});
  }
  function schedule() {
    if (!dead && anchor && frame === null) frame = view.requestAnimationFrame(align);
  }
  function land(target, focus = false) {
    release();
    const heading = target.matches?.('h1,h2,h3') ? target : target.querySelector?.('h1,h2,h3');
    anchor = {target, heading};
    if (focus && heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({preventScroll: true});
    }
    timer = view.setTimeout(release, 6000);
    align();
    schedule();
  }
  listen(doc, 'click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || link.target && link.target !== '_self') return;
    let url;
    try { url = new URL(link.href, view.location.href); } catch { return; }
    if (url.origin !== view.location.origin || url.pathname !== view.location.pathname || url.search !== view.location.search) return;
    const target = targetFor(url.hash);
    if (!target || link.closest?.('#case-reader')) return;
    event.preventDefault();
    // Capture before the older per-link smooth-scroll handler. One owner prevents races.
    event.stopImmediatePropagation();
    if (view.location.hash !== url.hash) view.history.replaceState(null, '', url.pathname + url.search + url.hash);
    land(target, true);
  }, true);
  for (const type of ['wheel', 'touchstart', 'pointerdown']) listen(doc, type, release, {capture: true, passive: true});
  listen(doc, 'keydown', event => {
    if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Escape','Tab'].includes(event.key)) release();
  }, true);
  listen(doc, 'focusin', event => { if (anchor && event.target !== anchor.heading) release(); });
  const route = () => {
    // A case close owns exact card/reading-position restoration, not a section landing.
    if (doc.querySelector('#case-reader[open]')) { release(); return; }
    const target = targetFor(view.location.hash);
    if (target) land(target); else release();
  };
  for (const type of ['hashchange', 'popstate', 'pageshow']) listen(view, type, route);
  for (const type of ['resize','scroll']) listen(view, type, schedule, {passive: true});
  listen(doc, 'load', schedule, true);
  const observer = view.ResizeObserver ? new view.ResizeObserver(schedule) : null;
  const main = doc.querySelector('main');
  if (main) observer?.observe(main);
  doc.fonts?.ready.then(schedule, () => {});
  route();
  return () => { dead = true; release(); observer?.disconnect(); off.forEach(fn => fn()); };
}

function mount() {
  mountDocumentAnchors();
  const header = document.querySelector('.site-header');
  const navigation = header?.querySelector('nav[aria-label="Main navigation"]');
  if (!header || !navigation) return;
  const links = [...navigation.querySelectorAll('a[href^="#"]')];
  if (!links.length) return;
  let frame = null;
  function update() {
    frame = null;
    const sticky = getComputedStyle(header).position === 'sticky';
    const headerHeight = sticky ? header.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--normal-nav-offset', `${headerHeight + 32}px`);
    if (document.querySelector('#case-reader[open]')) return;
    // Background is mounted asynchronously from the resume data. Resolve its
    // current element on every update instead of freezing the initial DOM.
    const entries = links.map(link => {
      const section = document.getElementById(link.hash.slice(1));
      link.hidden = !section;
      return {link, section};
    })
      .filter(entry => entry.section);
    // With large inter-section gaps, the next visible heading should become
    // current as it enters the main reading area, not only at the header edge.
    const line = headerHeight + Math.max(72, (innerHeight - headerHeight) * .5);
    const atBottom = scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
    const id = currentSection(entries.map(({section}) => ({id: section.id, top: section.getBoundingClientRect().top})), line, atBottom);
    for (const {link, section} of entries) {
      if (section.id === id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  function schedule() { if (frame === null) frame = requestAnimationFrame(update); }
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule, {passive: true});
  addEventListener('pageshow', schedule);
  addEventListener('hashchange', schedule);
  document.addEventListener('load', schedule, true);
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(schedule);
    observer.observe(header);
    const main = document.querySelector('main');
    if (main) observer.observe(main);
  }
  document.fonts?.ready.then(schedule, () => {});
  update();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true});
  else mount();
}
