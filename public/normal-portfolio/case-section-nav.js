/** Keep a case study's sticky chapter links in sync with its reading surface. */
export function mountCaseSectionNav({scroller, nav, sections = []} = {}) {
  if (!scroller || !nav) return () => {};
  const view = scroller.ownerDocument?.defaultView || globalThis.window;
  const requestFrame = view?.requestAnimationFrame?.bind(view) || globalThis.requestAnimationFrame;
  const cancelFrame = view?.cancelAnimationFrame?.bind(view) || globalThis.cancelAnimationFrame;
  const sticky = nav.closest?.('.story-index') || nav.parentElement || nav;
  const targets = new Map(Array.from(sections).filter(item => item?.id).map(item => [item.id, item]));
  const entries = Array.from(nav.querySelectorAll('[data-section-target]'))
    .map(link => ({link, section: targets.get(link.getAttribute('data-section-target'))}))
    .filter(entry => entry.section);
  if (!entries.length) return () => {};

  let disposed = false;
  let frame = null;
  let current = null;
  const cleanups = [];
  const offset = () => Math.max(0, sticky.getBoundingClientRect().height) + 24;

  function revealLink(link) {
    if (nav.scrollWidth <= nav.clientWidth || !nav.scrollTo) return;
    const bounds = nav.getBoundingClientRect();
    const item = link.getBoundingClientRect();
    const inset = 8;
    let left = nav.scrollLeft;
    if (item.left < bounds.left + inset) left += item.left - bounds.left - inset;
    else if (item.right > bounds.right - inset) left += item.right - bounds.right + inset;
    if (left !== nav.scrollLeft) nav.scrollTo({left: Math.max(0, left), behavior: 'auto'});
  }

  function select(entry) {
    if (!entry || disposed) return;
    for (const item of entries) {
      const active = item === entry;
      item.link.classList.toggle('is-current', active);
      if (active) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    }
    const changed = current !== entry;
    current = entry;
    if (changed) revealLink(entry.link);
  }

  function update() {
    if (disposed) return;
    const threshold = scroller.getBoundingClientRect().top + offset() + 2;
    let active = entries[0];
    for (const entry of entries) {
      if (entry.section.getBoundingClientRect().top <= threshold) active = entry;
    }
    const remaining = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
    if (scroller.scrollTop > 0 && remaining <= 2) active = entries.at(-1);
    select(active);
  }

  function schedule() {
    if (disposed || frame !== null) return;
    if (!requestFrame) { update(); return; }
    frame = requestFrame(() => { frame = null; update(); });
  }

  for (const entry of entries) {
    const activate = event => {
      if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      const top = Math.max(0, scroller.scrollTop + entry.section.getBoundingClientRect().top
        - scroller.getBoundingClientRect().top - offset());
      const heading = entry.section.querySelector('h2, h3, h4') || entry.section;
      // Every target is focusable without becoming an extra Tab stop.
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({preventScroll: true});
      select(entry);
      // A chapter shortcut should deliver its heading immediately, even in a long case.
      scroller.scrollTo({top, behavior: 'instant'});
    };
    entry.link.addEventListener('click', activate);
    cleanups.push(() => entry.link.removeEventListener('click', activate));
  }

  scroller.addEventListener('scroll', schedule, {passive: true});
  scroller.addEventListener('load', schedule, true);
  view?.addEventListener?.('resize', schedule, {passive: true});
  cleanups.push(() => scroller.removeEventListener('scroll', schedule));
  cleanups.push(() => scroller.removeEventListener('load', schedule, true));
  cleanups.push(() => view?.removeEventListener?.('resize', schedule));
  const Resize = view?.ResizeObserver || globalThis.ResizeObserver;
  const observer = Resize ? new Resize(schedule) : null;
  observer?.observe(nav);
  if (sticky !== nav) observer?.observe(sticky);
  observer?.observe(scroller);
  scroller.ownerDocument?.fonts?.ready?.then(schedule, () => {});
  update();
  schedule();

  return () => {
    if (disposed) return;
    disposed = true;
    cleanups.forEach(cleanup => cleanup());
    observer?.disconnect();
    if (frame !== null) cancelFrame?.(frame);
    frame = null;
  };
}
