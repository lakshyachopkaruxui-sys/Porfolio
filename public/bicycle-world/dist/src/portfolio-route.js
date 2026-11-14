// The responsive portfolio is maintained in normal-portfolio, not in Play.
// Local previews use separate supervised ports; a combined deployment uses
// the sibling normal-portfolio directory on the same origin.
export const NORMAL_CASE_IDS=Object.freeze(['connectaid','giggles','pixel-mania','syringe','workplace-mode','jan-aushadhi','tear']);
const CASE_IDS = new Set(NORMAL_CASE_IDS);
export const CASE_STUDY_LINK_NOTE='Opens in Portfolio in a new tab. Your garden stays here.';

/** Known canonical Normal cases do not depend on retired Behance URL flags. */
export function localCaseStudyHash(project) {
  return CASE_IDS.has(project?.id)?`#project-${project.id}`:null;
}

/** A native case link preserves the current garden and standard browser clicks.
 * Mode navigation remains separate and retains its existing same-tab owner. */
export function configureCaseStudyLink(link,project,pageURL=globalThis.location?.href||import.meta.url){
  const hash=localCaseStudyHash(project);
  if(!hash)return false;
  link.href=normalPortfolioURL(pageURL,hash);
  link.target='_blank';link.rel='noopener noreferrer';
  link.setAttribute('aria-label',`Read the full ${project.title||project.id} case study in Portfolio, opens in a new tab`);
  return true;
}

export function legacyPortfolioHash(hash) {
  if (hash === '#portfolio') return '';
  if (hash === '#portfolio-work') return '#work';
  if (hash === '#portfolio-about') return '#about';
  const project = /^#portfolio\/project-([a-z0-9-]+)$/.exec(hash);
  if (project) return CASE_IDS.has(project[1]) ? `#project-${project[1]}` : '#work';
  return null;
}

export function normalPortfolioURL(pageURL, hash = '') {
  const current = new URL(pageURL);
  const prefix = current.pathname.includes('/bicycle-world/')
    ? current.pathname.split('/bicycle-world/')[0] : '';
  const target = new URL('/', current);
  // Assign the path separately: a doubled leading slash is a path, not a host.
  target.pathname = `${prefix}/normal-portfolio/`;
  target.search = ''; target.hash = '';
  if (['127.0.0.1', 'localhost', '[::1]'].includes(current.hostname) && current.port === '4186') {
    target.port = '4187';
    target.pathname = '/normal-portfolio/';
  }
  const translated = legacyPortfolioHash(hash);
  const destination = translated === null ? hash : translated;
  if (['#work', '#about', '#contact'].includes(destination)) target.hash = destination;
  else if (destination.startsWith('#project-')) {
    target.hash = CASE_IDS.has(destination.slice(9)) ? destination : '#work';
  }
  return target.href;
}

export function bindPortfolioLinks(document, location) {
  for (const link of document.querySelectorAll('a[data-normal-portfolio]')) {
    link.href = normalPortfolioURL(location.href, link.dataset.portfolioSection || '');
  }
}
