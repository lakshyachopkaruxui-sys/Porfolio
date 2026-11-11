/** The preceding section stays current through intentional large section gaps. */
export function currentSection(sections, readingLine, atBottom = false) {
  if (!sections.length) return null;
  if (atBottom) return sections.at(-1).id;
  let current = sections[0].id;
  for (const section of sections) if (section.top <= readingLine) current = section.id;
  return current;
}

function mount() {
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
