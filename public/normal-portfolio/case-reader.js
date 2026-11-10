import {mountCaseSectionNav} from './case-section-nav.js?v=20261108-recruiter-audit';
import {mountCaseHeroArt} from './case-hero-art.js?v=20261110-approved-covers';
import {mountGigglesCover} from './cover-artwork.js?v=20261108-care-mockups';
import {mountCaseImageViewer} from './case-image-viewer.js?v=20261105-native-captions';
import {mountCaseVideo} from './case-video.js?v=20261104-project-evidence';
import {mountPixelManiaSpecimen} from './pixel-mania-presentation.js?v=20261109-state-trace';

function node(tag, text, parent, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  parent?.append(item);
  return item;
}

// Evidence is authored locally, but a broken URL must neither stop a whole case
// nor create an executable or unexpected remote-media destination.
function contentURL(value, {asset = false} = {}) {
  if (typeof value !== 'string' || !value.trim() || /[\\\u0000-\u001f\u007f]/.test(value) || value.startsWith('//')) return null;
  try {
    const base = new URL(import.meta.url);
    const url = new URL(value, base);
    if (url.username || url.password) return null;
    if (!asset) {
      if (['http:', 'https:'].includes(url.protocol)) return url;
      // Relative paths also work in the isolated file-based renderer tests.
      return !/^[a-z][a-z\d+.-]*:/i.test(value) && url.protocol === base.protocol && url.origin === base.origin ? url : null;
    }
    if (/[\\\u0000-\u001f\u007f?#%]/.test(decodeURIComponent(value))) return null;
    if (decodeURIComponent(url.pathname).split('/').some(part => part === '.' || part === '..')) return null;
    const roots = ['./assets/', '../bicycle-world/assets/', '../bicycle-world/dist/assets/'].map(root => new URL(root, base));
    return roots.some(root => url.protocol === root.protocol && url.origin === root.origin && url.pathname.startsWith(root.pathname)) ? url : null;
  } catch { return null; }
}

function figure(parent, visual) {
  const frame = node('figure', undefined, parent, 'story-figure');
  const source = contentURL(visual?.src, {asset: true});
  if (!source) {
    node('p', 'This process image is unavailable.', frame);
    if (visual?.caption) node('figcaption', visual.caption, frame);
    return;
  }
  if (visual.phone) frame.classList.add('story-figure-phone');
  if (visual.kind || visual.personal) frame.classList.add('story-figure-photo');
  const link = node('a', undefined, frame);
  link.href = source.href;
  link.target = '_blank'; link.rel = 'noopener';
  link.setAttribute('aria-label', `Open full-size image: ${visual.alt}`);
  const image = node('img', undefined, link);
  image.src = contentURL(visual.previewSrc, {asset: true})?.href || link.href; image.alt = visual.alt;
  image.width = visual.width; image.height = visual.height;
  image.style.maxWidth = `min(100%, ${visual.width}px)`; image.style.marginInline = 'auto';
  image.loading = 'lazy'; image.decoding = 'async';
  image.addEventListener('error', () => {
    frame.replaceChildren(); node('p', 'This process image is unavailable.', frame);
    if (visual.caption) node('figcaption', visual.caption, frame);
  }, {once: true});
  if (visual.caption || visual.sourcePage) {
    const caption = node('figcaption', visual.caption, frame);
    if (visual.sourcePage) {
      const source = contentURL(visual.sourcePage);
      if (source && ['https:', 'http:'].includes(source.protocol)) {
        const credit = node('a', 'Source', caption, 'story-image-source');
        credit.href = source.href; credit.target = '_blank'; credit.rel = 'noopener';
        credit.setAttribute('aria-label', `Image source for ${visual.alt} (opens in a new tab)`);
      }
    }
  }
}

function evidenceBlocks(parent, blocks = [], {reader, cleanups} = {}) {
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (block.type === 'paragraph') node('p', block.text, parent, block.sourceNote ? 'story-body story-source-note' : 'story-body');
    else if (block.type === 'heading') node('h4', block.text, parent, 'story-block-heading');
    else if (block.type === 'details') {
      const disclosure = node('details', undefined, parent, 'story-disclosure');
      node('summary', block.title, disclosure);
      const body = node('div', undefined, disclosure, 'story-disclosure-body');
      evidenceBlocks(body, block.blocks, {reader, cleanups});
    }
    else if (block.type === 'list') {
      const list = node('ul', undefined, parent, 'story-block-list');
      block.items.forEach(text => node('li', text, list));
    } else if (block.type === 'points') {
      const points = node('div', undefined, parent, 'story-points');
      block.items.forEach((point, position) => {
        const row = node('div', undefined, points);
        node('span', String(position + 1).padStart(2, '0'), row, 'story-point-number');
        node('h4', point.title, row); node('p', point.body, row);
      });
    } else if (block.type === 'comparison') {
      const comparison = node('div', undefined, parent, 'story-comparison');
      const before = node('div', undefined, comparison);
      node('h4', block.beforeTitle || 'Earlier direction', before); node('p', block.before, before);
      const after = node('div', undefined, comparison);
      node('h4', block.afterTitle || 'What changed', after); node('p', block.after, after);
      if (block.note) node('p', block.note, parent, 'story-comparison-note');
    } else if (block.type === 'table') {
      if (block.caption) node('p', block.caption, parent, 'story-table-title').setAttribute('aria-hidden', 'true');
      const wrap = node('div', undefined, parent, 'story-table-scroll');
      wrap.tabIndex = 0; wrap.setAttribute('role', 'region');
      wrap.setAttribute('aria-label', block.caption || 'Project data table');
      const table = node('table', undefined, wrap, 'story-data-table');
      if (block.caption) node('caption', block.caption, table, 'visually-hidden');
      const head = node('tr', undefined, node('thead', undefined, table));
      (block.headers || block.columns || []).forEach(text => node('th', text, head).setAttribute('scope', 'col'));
      const body = node('tbody', undefined, table);
      (block.rows || []).forEach(row => {
        const tr = node('tr', undefined, body);
        row.forEach((text, column) => {
          const cell = node(column === 0 ? 'th' : 'td', text, tr);
          if (column === 0) cell.setAttribute('scope', 'row');
        });
      });
    } else if (block.type === 'sources') {
      const list = node('ul', undefined, parent, 'story-block-list story-sources');
      for (const item of block.items || []) {
        const href = contentURL(item.href);
        if (!href || !['https:', 'http:'].includes(href.protocol)) continue;
        const row = node('li', undefined, list);
        const link = node('a', item.title, row);
        link.href = href.href; link.target = '_blank'; link.rel = 'noopener';
        link.setAttribute('aria-label', `${item.title} (opens in a new tab)`);
        if (item.note) node('p', item.note, row);
      }
    } else if (block.type === 'video') {
      cleanups.push(mountCaseVideo({parent, reader, media: block}));
    } else if (block.type === 'pixel-specimen') {
      cleanups.push(mountPixelManiaSpecimen({parent, block}));
    } else if (block.type === 'gallery') {
      const layout = block.layout === 'photos' ? 'story-photo-grid' : block.layout === 'components' ? 'story-component-grid' : 'story-phone-spread';
      const group = node('div', undefined, parent, `story-media-group ${layout}`);
      block.visuals.forEach(visual => figure(group, visual));
    } else if (block.type === 'figure') {
      const visuals = [block.visual];
      if (block.visual.phone) {
        while (blocks[index + 1]?.type === 'figure' && blocks[index + 1].visual.phone) visuals.push(blocks[++index].visual);
      }
      const group = node('div', undefined, parent, visuals.length > 1 ? 'story-media-group story-phone-spread' : 'story-media-group');
      visuals.forEach(visual => figure(group, visual));
    }
  }
}

/** A full reading surface with semantic content and optional interactive views. */
export function renderCaseStudy({reader, content, project, context, process, story, artifact, artifactUrl, related, onRelated}) {
  const cleanups = [];
  const dispose = () => {
    for (const cleanup of cleanups.splice(0)) {
      try { cleanup(); } catch { /* A failed optional widget cannot retain other media or listeners. */ }
    }
  };
  try {
  content.replaceChildren();
  reader.dataset.project = project.id;
  const hero = node('header', undefined, content, 'story-hero');
  hero.id = 'case-top';
  const heroArt = node('figure', undefined, hero, 'story-hero-art case-hero-visual');
  const heroPresentation = mountCaseHeroArt(heroArt, {project, artifact, artifactUrl});
  const heroCaption = heroPresentation?.caption || context.artifactCaption || artifact.caption;
  if (heroCaption) node('figcaption', heroCaption, heroArt);
  const heroCopy = node('div', undefined, hero, 'story-hero-copy');
  node('p', project.status, heroCopy, 'story-status');
  const title = node('h2', project.title, heroCopy); title.id = 'case-title'; title.tabIndex = -1;
  node('p', project.summary, heroCopy, 'story-intro');
  if (story?.award || project.id === 'giggles') {
    const award = story?.award;
    node('p', `${award?.title || 'Best Project'} · ${award?.event || 'Meraki pre-grad show'}`, heroCopy, 'story-award');
  }
  const facts = node('dl', undefined, content, 'story-facts');
  for (const [label, value] of [['Project type', context.type || project.status], ['Duration', context.timeline], ['Team', context.team]]) {
    if (!value) continue;
    const group = node('div', undefined, facts, label === 'My contribution' ? 'story-role' : '');
    node('dt', label, group); node('dd', value, group);
  }
  const contribution = node('section', undefined, content, 'story-contribution');
  node('h3', 'My contribution', contribution);
  node('p', project.role, contribution);
  const layout = node('div', undefined, content, 'story-layout');
  const aside = node('aside', undefined, layout, 'story-index');
  node('p', 'Jump to', aside);
  const nav = node('nav', undefined, aside);
  nav.setAttribute('aria-label', 'Case-study sections');
  const main = node('div', undefined, layout, 'story-narrative');
  const entries = [];
  function section(id, title) {
    const section = node('section', undefined, main, 'story-section');
    section.id = `case-${id}`;
    const heading = node('h3', title, section); heading.tabIndex = -1;
    // One authored title names both the destination and its navigation link.
    const jump = node('a', title, nav);
    jump.href = location.href;
    jump.dataset.sectionTarget = section.id;
    entries.push({section, jump});
    return section;
  }
  const overview = section('overview', 'Overview');
  node('p', story?.intro || project.summary, overview, 'story-body story-overview-intro');
  const summary = story?.outcome || context?.outcome;
  if (summary?.text) {
    const outcome = node('div', undefined, overview, 'story-outcome');
    node('h4', summary.title || 'Current outcome', outcome);
    node('p', summary.text, outcome, 'story-body');
    const destination = story?.sections?.find(item => item.id === summary.target);
    if (destination) {
      const outcomeLink = node('a', `See ${destination.title.toLowerCase()}`, outcome, 'story-outcome-link');
      outcomeLink.href = location.href;
      const goToOutcome = event => {
        if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        entries.find(entry => entry.section.id === `case-${destination.id}`)?.jump.click();
      };
      outcomeLink.addEventListener('click', goToOutcome);
      cleanups.push(() => outcomeLink.removeEventListener('click', goToOutcome));
    }
  }
  const processSection = node('div', undefined, overview, 'story-process-summary');
  node('h4', 'Process at a glance', processSection);
  const sequence = node('ol', undefined, processSection, 'story-process');
  process.steps.forEach(([title, description, planned], index) => {
    const step = node('li', undefined, sequence, planned ? 'is-planned' : '');
    node('span', planned ? 'Next' : String(index + 1).padStart(2, '0'), step, 'story-step-number');
    const copy = node('div', undefined, step);
    node('h4', title, copy); node('p', description, copy);
    if (project.id === 'connectaid' && index < process.steps.length - 1) node('span', '→', step, 'story-phase-connector').setAttribute('aria-hidden', 'true');
  });
  // Project-specific context belongs with the overview, before the evidence chapters.
  if (story?.overviewBlocks?.length) evidenceBlocks(overview, story.overviewBlocks, {reader, cleanups});
  // Tools follow the story so project decisions and evidence appear first.
  const toolsFragment = document.createDocumentFragment();
  const toolSection = section('tools', 'Tools and methods');
  toolsFragment.append(toolSection);
  const toolEntry = entries.pop();
  const toolJump = toolEntry.jump;
  toolJump.remove();
  const tools = node('dl', undefined, toolSection, 'story-tools story-tools-visible');
  process.tools.forEach(([name, description]) => {
    const row = node('div', undefined, tools, 'story-tool-row');
    node('dt', name, row);
    node('dd', description, row);
  });
  const methodList = node('ul', undefined, toolSection, 'story-methods');
  context.methods.forEach(method => node('li', method, methodList));

  const sections = story?.sections || project.sections;
  for (const item of sections) {
    const panel = section(item.id, item.title);
    if (item.blocks?.length) evidenceBlocks(panel, item.blocks, {reader, cleanups});
    const personalReflection = item.figures?.some(visual => visual.personal);
    if (personalReflection) panel.classList.add('story-personal-reflection');
    const bodyParent = personalReflection ? node('div', undefined, panel, 'story-reflection-copy') : panel;
    for (const paragraph of item.body || []) node('p', paragraph, bodyParent, 'story-body');
    if (item.points?.length) {
      const points = node('div', undefined, panel, 'story-points');
      item.points.forEach((point, index) => {
        const row = node('div', undefined, points);
        node('span', String(index + 1).padStart(2, '0'), row, 'story-point-number');
        const copy = node('div', undefined, row);
        node('h4', point.title, copy); node('p', point.body, copy);
      });
    }
    if (item.flow) {
      if (item.flow.label) node('h4', item.flow.label, panel, 'story-flow-label');
      const flow = node('ol', undefined, panel, 'story-flow');
      item.flow.steps.forEach(step => {
        const row = node('li', undefined, flow);
        node('h4', step.title, row); node('p', step.body, row);
      });
    }
    if (item.states?.length) {
      const stateExplorer = node('div', undefined, panel, 'story-states');
      const controls = node('div', undefined, stateExplorer, 'story-state-controls');
      controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Explore interaction states');
      const stateView = node('div', undefined, stateExplorer, 'story-state-view');
      const stateTitle = node('h4', undefined, stateView);
      const stateContext = node('p', undefined, stateView);
      const stateResponse = node('p', undefined, stateView, 'story-state-response');
      const buttons = item.states.map((state, index) => {
        const button = node('button', state.name, controls); button.type = 'button';
        button.setAttribute('aria-pressed', String(index === 0));
        const show = () => { stateTitle.textContent = state.name; stateContext.textContent = state.context; stateResponse.textContent = state.response; };
        button.addEventListener('click', () => { buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button))); show(); });
        if (index === 0) show();
        return button;
      });
    }
    if (item.comparison) {
      const comparison = node('div', undefined, panel, 'story-comparison');
      const before = node('div', undefined, comparison); node('h4', 'Earlier direction', before); node('p', item.comparison.before, before);
      const after = node('div', undefined, comparison); node('h4', 'What changed', after); node('p', item.comparison.after, after);
      if (item.comparison.note) node('p', item.comparison.note, panel, 'story-comparison-note');
    }
    const versions = context.comparisons?.[item.id];
    if (versions?.length) {
      const comparison = node('div', undefined, panel, 'story-version-explorer');
      const controls = node('div', undefined, comparison, 'story-state-controls');
      controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Compare interface versions');
      const frame = node('figure', undefined, comparison, 'story-figure story-figure-phone');
      const link = node('a', undefined, frame); link.target = '_blank'; link.rel = 'noopener';
      const image = node('img', undefined, link); image.loading = 'lazy'; image.decoding = 'async';
      const caption = node('figcaption', undefined, frame);
      const buttons = versions.map((version, index) => {
        const button = node('button', version.label, controls); button.type = 'button';
        button.setAttribute('aria-pressed', String(index === 0));
        const show = () => {
          const source = contentURL(version.src, {asset: true});
          if (!source) {
            link.removeAttribute('href'); image.removeAttribute('src'); image.hidden = true;
            caption.textContent = 'This process image is unavailable.'; return;
          }
          image.hidden = false;
          link.href = source.href;
          link.setAttribute('aria-label', `Open full-size image: ${version.alt}`);
          image.src = link.href; image.alt = version.alt; image.width = version.width; image.height = version.height;
          caption.textContent = version.caption;
        };
        button.addEventListener('click', () => { buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button))); show(); });
        if (index === 0) show();
        return button;
      });
    }
    if (item.figures?.length) {
      const isPhoneSpread = item.figures.length > 1 && item.figures.every(visual => visual.phone);
      const media = node('div', undefined, panel, isPhoneSpread ? 'story-media-group story-phone-spread' : 'story-media-group');
      item.figures.forEach(visual => figure(media, visual));
    }
    if (item.evidence) node('p', item.evidence, panel, 'story-note');
    if (item.limitation) node('p', item.limitation, panel, 'story-note');
  }
  main.append(toolsFragment);
  nav.append(toolJump);
  entries.push(toolEntry);
  const topLink = node('a', 'Top', aside, 'story-top-link');
  node('span', '↑', topLink, 'story-top-arrow').setAttribute('aria-hidden', 'true');
  topLink.href = location.href;
  const goTop = event => {
    if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    title.focus({preventScroll: true});
    reader.scrollTo({top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  };
  topLink.addEventListener('click', goTop);
  cleanups.push(() => topLink.removeEventListener('click', goTop));
  const designTarget = story?.playable?.url ? 'overview'
    : {connectaid: 'flow', giggles: 'interaction', syringe: 'solution', 'pixel-mania': 'interaction', 'workplace-mode': 'states', 'jan-aushadhi': 'selected-service'}[project.id];
  const designEntry = entries.find(entry => entry.section.id === `case-${designTarget}`);
  const heroActions = node('div', undefined, heroCopy, 'story-hero-actions');
  if (contentURL(story?.playable?.url)) {
    const play = node('a', story.playable.label || 'Play the game', heroActions, 'case-design-jump case-play-link');
    play.href = story.playable.url;
    play.target = '_blank'; play.rel = 'noopener';
    play.setAttribute('aria-label', `${story.playable.label || 'Play the game'} (opens in a new tab)`);
  }
  if (designEntry) {
    const shortcutLabel = story?.playable?.url ? 'Read case study'
      : ['jan-aushadhi', 'workplace-mode'].includes(project.id) ? 'Explore the concept' : 'View the design';
    const shortcut = node('a', shortcutLabel, heroActions, story?.playable?.url ? 'case-prototype-link case-story-jump' : 'case-design-jump');
    shortcut.href = location.href;
    shortcut.addEventListener('click', event => {
      if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); designEntry.jump.click();
    });
  }
  if (contentURL(story?.prototype?.url)) {
    const prototype = node('a', story.prototype.label || 'Open prototype', heroActions, 'case-prototype-link');
    prototype.href = story.prototype.url;
    prototype.target = '_blank'; prototype.rel = 'noopener';
    prototype.setAttribute('aria-label', `${story.prototype.label || 'Open prototype'} (opens in a new tab)`);
  }
  const foot = node('footer', undefined, content, 'story-related');
  node('h3', 'Other projects', foot);
  const relatedGrid = node('div', undefined, foot, 'story-related-grid project-grid');
  for (const item of related) {
    if (!contentURL(item.href)) continue;
    const link = node('a', undefined, relatedGrid, 'story-related-card');
    link.href = item.href;
    const coverURL = contentURL(item.cover?.src, {asset: true});
    if (coverURL) {
      const frame = node('figure', undefined, link, `project-art art-${item.id} is-project-cover`);
      frame.style.aspectRatio = `${item.cover.width} / ${item.cover.height}`;
      const image = node('img', undefined, frame);
      image.src = coverURL.href;
      image.alt = item.cover.alt; image.width = item.cover.width; image.height = item.cover.height;
      image.loading = 'lazy'; image.decoding = 'async';
      if (item.id === 'giggles') mountGigglesCover(frame);
    }
    node('strong', item.title, link); node('span', item.status, link);
    link.addEventListener('click', event => {
      if (event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); onRelated(item.id);
    });
  }
  cleanups.push(mountCaseSectionNav({scroller: reader, nav, sections: entries.map(entry => entry.section)}));
  cleanups.push(mountCaseImageViewer({root: content, reader}));
  const progress = document.querySelector('#case-progress');
  const update = () => {
    const span = reader.scrollHeight - reader.clientHeight;
    if (progress) progress.value = span > 0 ? Math.round(reader.scrollTop / span * 100) : 100;
  };
  let frame = null;
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(() => { frame = null; update(); }); };
  reader.addEventListener('scroll', onScroll, {passive: true});
  cleanups.push(() => { reader.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); });
  update();
  frame = requestAnimationFrame(() => { frame = null; update(); });
  return dispose;
  } catch (error) {
    dispose();
    throw error;
  }
}
