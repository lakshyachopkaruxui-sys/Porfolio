// This proposal consumes the audited catalog without changing shared source.
import {CASE_CONTEXT, normalProject} from './case-context.js?v=20261109-evidence-pass';
import {PROJECT_PROCESS} from './process-data.js?v=20261109-evidence-pass';
import {mountToolkit} from './toolkit.js?v=20261104-personal-space';
import {CASE_STORIES} from './case-stories.js?v=20261109-evidence-pass';
import {renderCaseStudy} from './case-reader.js?v=20261110-approved-covers';
import {mountPortfolioAssistant, mountPixelBreak} from './portfolio-extras.js?v=20261110-footer';
import {mountResumeProfile} from './resume-ui.js?v=20261110-footer';
import {mountPortfolioMotion} from './portfolio-motion.js?v=20261104-personal-space';
import {mountCaseMotion} from './case-motion.js?v=20261103b';
import {getWelcomeIntro} from './welcome-intro.js?v=20261103-shared-curve';
import {mountPhotoCarousel} from './photo-carousel.js?v=20261104-carousel-fast';
import {
  NORMAL_PROJECTS, NORMAL_PROJECT_CONTEXT, NORMAL_PROJECT_PROCESS,
  NORMAL_PROJECT_STORIES, NORMAL_PROJECT_ARTIFACTS, NORMAL_PROJECT_CATEGORIES,
  PROJECT_COVERS,
} from './normal-projects.js?v=20261110-approved-covers';
import {mountGigglesCover} from './cover-artwork.js?v=20261108-care-mockups';
import {mountProjectPreview} from './project-preview.js?v=20261110-space';

function optionalFeature(mount, fallback = null) {
  try { return mount(); }
  catch (error) { console.warn('An optional portfolio feature could not start.', error); return fallback; }
}

optionalFeature(() => mountToolkit(document.querySelector('#toolkit-board')));
optionalFeature(() => mountPhotoCarousel(document.querySelector('[data-photo-carousel]')));
const grid = document.querySelector('#project-grid');
const filters = document.querySelector('#project-filters');
const count = document.querySelector('#result-count');
const reader = document.querySelector('#case-reader');
const content = document.querySelector('#case-content');
const closeButton = document.querySelector('#close-case');
const motion = optionalFeature(() => mountPortfolioMotion(), {
  intro() {}, cancel() {}, captureProjects() {}, refreshProjects() {},
});
const welcome = getWelcomeIntro();
welcome.onReveal(() => { if (!location.hash) motion.intro({replay: true, fromWelcome: true}); });
welcome.onFinish(({shown, reason}) => {
  if (shown && reason !== 'completed') motion.cancel();
});
const caseMotion = optionalFeature(() => mountCaseMotion(reader), {cancel() {}, capture() {}, enter() {}});
const PROJECT_ORDER = ['connectaid', 'giggles', 'pixel-mania', 'syringe', 'workplace-mode', 'jan-aushadhi', 'tear'];
const FEATURED_PROJECTS = new Set(['connectaid', 'giggles', 'pixel-mania']);
const CARD_SUMMARIES = {
  tear: 'Pinch a seam. Pull reality apart. A dream journey through wonder, fear and uncertain relief.',
  connectaid: 'One place to book care, order medicines and keep health records.',
  giggles: 'A learning game for autistic children that connects physical play with questions and feedback on a phone.',
  'pixel-mania': 'An open-ended drawing board built from one five-colour interaction.',
  syringe: 'A syringe redesign focused on grip, thumb support and scale readability.',
  'workplace-mode': 'An in-car interface concept shaped by how private and commercial drivers use screens.',
};
const CARD_CATEGORIES = {
  tear: 'Immersive interaction · Storytelling',
  connectaid: 'Healthcare · App design', giggles: 'Learning · Physical–digital play',
  'pixel-mania': 'Interaction · Visual system', syringe: 'Ergonomics · Physical product',
  'workplace-mode': 'UX research · Interface concept',
};
const CARD_DETAILS = {
  tear: ['My part: concept, gesture, emotional journey and art direction.', 'Working prototype · Informal feedback-led iteration'],
  connectaid: ['My part: core design system and remote testing coordination.', '6 participants · 6 team refinements'],
  giggles: ['My part: electronics, game logic and the working prototype.', 'Best Project · Meraki'],
  'pixel-mania': ['My part: visual system, interface and interaction prototyping.', 'Tried by visitors at the college exhibition'],
  syringe: ['My part: concept development, Maya modelling and 3D printing with one teammate.', '3D-printed prototype'],
  'workplace-mode': ['My part: research, synthesis and the interaction concept.', '34 surveys · 13 interviews'],
};
const RELATED_PROJECTS = {
  tear: ['pixel-mania', 'giggles'],
  connectaid: ['giggles', 'pixel-mania'], giggles: ['syringe', 'connectaid'],
  'pixel-mania': ['connectaid', 'giggles'], syringe: ['giggles', 'workplace-mode'],
  'workplace-mode': ['connectaid', 'syringe'],
  'jan-aushadhi': ['connectaid', 'syringe'],
};

function node(tag, text, parent, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  parent?.append(element);
  return element;
}

async function start() {
  const [{PROJECTS: sharedProjects}, catalog, {PROJECT_ARTIFACTS: sharedArtifacts}] = await Promise.all([
    import('../bicycle-world/src/project-data.js'),
    import('../bicycle-world/src/project-catalog.js'),
    import('../bicycle-world/src/project-artifacts.js'),
  ]);
  const {PROJECT_FILTERS, normalizeProjectFilter, projectsForFilter} = catalog;
  // Normal-mode additions remain independent of the garden's audited catalogue.
  const PROJECTS = [...sharedProjects, ...NORMAL_PROJECTS];
  const PROJECT_ARTIFACTS = {...sharedArtifacts, ...NORMAL_PROJECT_ARTIFACTS};
  const contexts = {...CASE_CONTEXT, ...NORMAL_PROJECT_CONTEXT};
  const processes = {...PROJECT_PROCESS, ...NORMAL_PROJECT_PROCESS};
  const stories = {...CASE_STORIES, ...NORMAL_PROJECT_STORIES};
  const filterFromUrl = () => normalizeProjectFilter(new URL(location.href).searchParams.get('filter') || 'all');
  let active = filterFromUrl();
  let returnFocus = null;
  let returnScroll = 0;
  let currentProject = null;
  let disposeStory = null;
  const readingProgress = new Map();
  let previews = [];
  const artPath = (artifact, id) => NORMAL_PROJECT_ARTIFACTS[id]
    ? new URL(artifact.src, import.meta.url).href
    : new URL(artifact.src.replace(/^\.\//, ''), new URL('../bicycle-world/', import.meta.url)).href;

  function visibleProjects(filter) {
    if (filter === 'featured') return PROJECTS.filter(project => FEATURED_PROJECTS.has(project.id));
    const additions = NORMAL_PROJECTS.filter(project => filter === 'all'
      || NORMAL_PROJECT_CATEGORIES[project.id]?.includes(filter));
    return [...projectsForFilter(filter), ...additions];
  }

  function projectUrl(id) {
    const url = new URL(location.href);
    if (active === 'all') url.searchParams.delete('filter');
    else url.searchParams.set('filter', active);
    url.hash = `project-${id}`;
    return url.pathname + url.search + url.hash;
  }

  function render(filter, updateUrl = false, animate = false) {
    const before = motion.captureProjects(grid);
    for (const preview of previews) preview.dispose();
    previews = [];
    active = normalizeProjectFilter(filter);
    grid.dataset.filter = active;
    for (const button of filters.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.filter === active));
    }
    const projects = visibleProjects(active)
      .slice().sort((a, b) => PROJECT_ORDER.indexOf(a.id) - PROJECT_ORDER.indexOf(b.id));
    const fragment = document.createDocumentFragment();
    for (const sourceProject of projects) {
      const project = normalProject(sourceProject);
      const article = node('article', undefined, fragment, 'project-card');
      article.dataset.project = project.id;
      const link = node('a', undefined, article, 'project-link');
      link.href = projectUrl(project.id);
      link.setAttribute('aria-labelledby', `title-${project.id}`);
      const cover = PROJECT_COVERS[project.id];
      const artifact = cover || PROJECT_ARTIFACTS[project.id];
      if (artifact) {
        const figure = node('figure', undefined, link, `project-art art-${project.id}${cover ? ' is-project-cover' : ''}`);
        if (cover) figure.style.aspectRatio = `${cover.width} / ${cover.height}`;
        const image = node('img', undefined, figure);
        image.src = cover ? new URL(cover.src, import.meta.url).href : artPath(artifact, project.id);
        image.alt = artifact.alt;
        image.width = artifact.width;
        image.height = artifact.height;
        image.loading = ['connectaid', 'giggles'].includes(project.id) ? 'eager' : 'lazy';
        image.decoding = 'async';
        image.addEventListener('error', () => {
          figure.replaceChildren();
          node('p', 'Project image unavailable', figure);
        }, {once: true});
        if (project.id === 'giggles' && cover) mountGigglesCover(figure);
        if (['pixel-mania', 'syringe'].includes(project.id)) {
          const preview = optionalFeature(() => mountProjectPreview(link, figure, project.id));
          if (preview) previews.push(preview);
        }
        if (project.id === 'connectaid' && !cover) {
          image.src = new URL('./assets/cases/connectaid/home-en.png', import.meta.url).href;
          image.alt = 'ConnectAid home screen with consultations, medicines and lab tests.';
          image.width = 440; image.height = 850;
          const companion = node('img', undefined, figure, 'project-companion');
          companion.src = new URL('./assets/cases/connectaid/records.png', import.meta.url).href;
          companion.alt = 'ConnectAid health-records screen.';
          companion.width = 440; companion.height = 850;
          companion.loading = 'eager'; companion.decoding = 'async';
        }
      }
      const heading = node('div', undefined, link, 'project-heading');
      node('h3', project.title, heading).id = `title-${project.id}`;
      const copy = node('div', undefined, link, 'project-copy');
      node('p', CARD_CATEGORIES[project.id] || project.status, copy, 'project-meta');
      node('p', CARD_SUMMARIES[project.id] || project.summary, copy, 'project-summary');
      const details = CARD_DETAILS[project.id];
      if (details) {
        node('p', details[0], copy, 'project-contribution');
        node('p', project.id === 'giggles' ? 'Best Project · Meraki' : details[1], copy, 'project-proof');
      }
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        returnFocus = link;
        returnScroll = window.scrollY;
        history.pushState({normalPortfolioCase: true}, '', projectUrl(project.id));
        // A presentation cover and a source artifact are different images.
        // Keep the reader entrance, without flying a cover into unrelated evidence.
        const imageOrigin = cover ? (event.detail > 0 ? {pointer: true} : null) : caseMotion.capture(link, event);
        openProject(project.id, imageOrigin);
      });
    }
    grid.replaceChildren(fragment);
    motion.refreshProjects(grid, before, {animate});
    const label = PROJECT_FILTERS.find(filter => filter.id === active).label;
    count.textContent = `${projects.length} ${projects.length === 1 ? 'project' : 'projects'} · ${label}`;
    if (updateUrl) {
      const url = new URL(location.href);
      if (active === 'all') url.searchParams.delete('filter');
      else url.searchParams.set('filter', active);
      url.hash = 'work';
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }

  function openProject(id, imageOrigin = null) {
    const sourceProject = PROJECTS.find(item => item.id === id);
    if (!sourceProject) return false;
    const summaryURL = new URL(`../bicycle-world/dist/projects.html#project-${id}`, import.meta.url).href;
    if (typeof reader.showModal !== 'function') { location.assign(summaryURL); return true; }
    if (reader.open && currentProject === id) return true;
    for (const preview of previews) preview.pause();
    caseMotion.cancel();
    const project = normalProject(sourceProject);
    if (reader.open && currentProject) readingProgress.set(currentProject, reader.scrollTop);
    disposeStory?.();
    currentProject = project.id;
    const artifact = PROJECT_ARTIFACTS[id];
    try { disposeStory = renderCaseStudy({
      reader, content, project, context: contexts[id], process: processes[id],
      story: stories[id], artifact, artifactUrl: artPath(artifact, id),
      related: (RELATED_PROJECTS[id] || []).map(relatedId => {
        const related = PROJECTS.find(item => item.id === relatedId);
        return related ? {...related, cover: PROJECT_COVERS[relatedId], href: projectUrl(relatedId)} : null;
      }).filter(Boolean),
      onRelated(nextId) { readingProgress.delete(nextId); history.replaceState(history.state, '', projectUrl(nextId)); openProject(nextId); },
    }); } catch (error) {
      console.error('This case study could not render.', error);
      disposeStory = null;
      content.replaceChildren();
      const heading = node('h2', project.title, content); heading.id = 'case-title'; heading.tabIndex = -1;
      node('p', 'This case study could not open. You can read its project summary instead.', content);
      node('a', 'Read project summary', content).href = summaryURL;
    }
    document.querySelector('#reader-project-label').textContent = project.title;
    if (!reader.open) {
      try { reader.showModal(); }
      catch { disposeStory?.(); disposeStory = null; location.assign(summaryURL); return true; }
    }
    reader.scrollTop = readingProgress.get(id) || 0;
    content.querySelector('#case-title')?.focus({preventScroll: true});
    caseMotion.enter(imageOrigin);
    return true;
  }

  function restorePage() {
    if (!reader.open) return;
    caseMotion.cancel();
    if (currentProject) readingProgress.set(currentProject, reader.scrollTop);
    reader.close();
    disposeStory?.(); disposeStory = null;
    window.scrollTo({top: returnScroll, behavior: 'instant'});
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
    else {
      document.querySelector('#work-title').focus({preventScroll: true});
      document.querySelector('#work').scrollIntoView({block: 'start', behavior: 'instant'});
    }
  }

  function closeProject() {
    if (history.state?.normalPortfolioCase) {
      history.back();
    } else {
      const url = new URL(location.href);
      url.hash = 'work';
      history.replaceState(null, '', url.pathname + url.search + url.hash);
      restorePage();
    }
  }

  function route() {
    const nextFilter = filterFromUrl();
    if (nextFilter !== active) render(nextFilter);
    const id = location.hash.startsWith('#project-') ? location.hash.slice(9) : null;
    if (id && openProject(id)) return;
    restorePage();
  }

  for (const filter of PROJECT_FILTERS) {
    const button = node('button', undefined, filters);
    const shortLabel = {research: 'Research', interaction: 'Interaction', physical: 'Physical'}[filter.id];
    if (shortLabel) {
      button.setAttribute('aria-label', filter.label);
      node('span', filter.label, button, 'filter-label-full').setAttribute('aria-hidden', 'true');
      node('span', shortLabel, button, 'filter-label-short').setAttribute('aria-hidden', 'true');
    } else button.textContent = filter.label;
    button.type = 'button';
    button.dataset.filter = filter.id;
    button.setAttribute('aria-controls', 'project-grid');
    button.addEventListener('click', event => {
      if (active !== filter.id) render(filter.id, true, event.detail > 0);
    });
  }
  const boundSectionLinks = new WeakSet();
  const initialHash = location.hash;
  let initialSectionAligned = false;
  // Optional resume enrichment must not delay the work grid or direct case links.
  void fetch('./resume-content.json').then(response => {
    if (!response.ok) throw new Error('Resume content unavailable');
    return response.json();
  }).then(resume => {
    if (resume) {
      mountResumeProfile(resume);
      bindSectionLinks();
      void welcome.finished.then(alignInitialSection);
    }
  }).catch(() => null);
  optionalFeature(() => mountPixelBreak(document.querySelector('#pixel-break')));
  optionalFeature(() => mountPortfolioAssistant(document.querySelector('#portfolio-assistant'), {
    onOpenProject(id, launcher) {
      returnFocus = launcher; returnScroll = window.scrollY;
      history.pushState({normalPortfolioCase: true}, '', projectUrl(id)); openProject(id);
    },
  }));
  document.querySelector('#copy-case-link').addEventListener('click', async () => {
    const status = document.querySelector('#case-link-status');
    try { await navigator.clipboard.writeText(location.href); status.textContent = 'Project link copied.'; }
    catch { status.textContent = 'Copy the project link from your address bar.'; }
  });
  closeButton.addEventListener('click', closeProject);
  reader.addEventListener('cancel', event => { event.preventDefault(); closeProject(); });
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);
  render(active);
  document.querySelector('#load-error').hidden = true;
  filters.hidden = false;
  // The initial case or section must not stack another modal over its greeting.
  // In-page routes remain immediate and never replay the startup animation.
  bindSectionLinks();
  await welcome.finished;
  route();
  // Native fragment scrolling can occur before the asynchronous work grid exists.
  // Align an initial section link once the complete page has its final structure.
  function alignInitialSection() {
    if (initialSectionAligned || location.hash !== initialHash || reader.open) return;
    const initialSection = initialHash && !initialHash.startsWith('#project-')
      ? document.getElementById(initialHash.slice(1)) : null;
    if (!initialSection || performance.getEntriesByType('navigation')[0]?.type === 'back_forward') return;
    initialSectionAligned = true;
    requestAnimationFrame(() => {
      if (location.hash !== initialHash || reader.open) return;
      if (initialSection.id === 'top') window.scrollTo({top: 0, behavior: 'instant'});
      else initialSection.scrollIntoView({block: 'start', behavior: 'instant'});
    });
  }
  alignInitialSection();
  welcome.finished.then(({shown}) => { if (!shown) motion.intro(); });
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) && new URL(location.href).searchParams.get('motion-review') === '1') {
    import('./motion-review.js?v=20261104-personal-space').then(({mountMotionReview}) => mountMotionReview(motion, welcome)).catch(error => console.warn('Motion review is unavailable.', error));
  }

  function bindSectionLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      if (boundSectionLinks.has(link) || link.closest?.('#case-reader')) return;
      boundSectionLinks.add(link);
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        if (link.hash.startsWith('#project-')) {
          event.preventDefault(); returnFocus = link; returnScroll = window.scrollY;
          history.pushState({normalPortfolioCase: true}, '', projectUrl(link.hash.slice(9)));
          openProject(link.hash.slice(9)); return;
        }
        const legacySections = {approach: 'work', highlights: 'work', life: 'about', questions: 'contact'};
        const target = document.getElementById(legacySections[link.hash.slice(1)] || link.hash.slice(1));
        if (!target) return;
        event.preventDefault();
        history.replaceState(null, '', location.pathname + location.search + link.hash);
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
        // The introduction is sticky within Work, so its visual position is not the page top.
        if (target.id === 'top') window.scrollTo({top: 0, behavior});
        else target.scrollIntoView({block: 'start', behavior});
        const heading = target.matches('h1,h2') ? target : target.querySelector('h2');
        const focusTarget = heading || target;
        focusTarget.tabIndex = -1; focusTarget.focus({preventScroll: true});
      });
    });
  }
}

start().catch(error => {
  console.error('Portfolio proposal could not load its project collection.', error);
  count.textContent = 'Project collection unavailable';
  const fallback = document.querySelector('#load-error');
  fallback.hidden = false;
  fallback.querySelector('[data-collection-status]').textContent = 'The interactive collection could not load.';
});
