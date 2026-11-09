/** Phone-sized entry keeps the 3D world out of the initial module graph. */
export const MOBILE_ENTRY_QUERIES = Object.freeze({
  narrow: '(max-width: 760px)',
  coarseLandscape: '(pointer: coarse) and (max-height: 500px)',
});

export function useMobileEntry({narrow = false, coarseLandscape = false} = {}) {
  return Boolean(narrow || coarseLandscape);
}

export function mobileEntryRoute(hash = '') {
  const project = /^#(?:portfolio\/)?project-([a-z0-9-]+)$/.exec(hash);
  if (project) return {kind: 'project', id: project[1]};
  if (hash === '#portfolio-work' || hash === '#portfolio-about') return {kind: 'section', id: hash.slice(1)};
  if (hash === '#portfolio') return {kind: 'portfolio'};
  return {kind: 'notice'};
}
