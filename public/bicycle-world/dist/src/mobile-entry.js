import {decorateModeSelectors} from './mode-selector.js';
import {normalPortfolioURL, bindPortfolioLinks, localCaseStudyHash} from './portfolio-route.js';
import {mobileEntryRoute} from './mobile-entry-policy.js';
import {NORMAL_WORK_ORDER, NORMAL_WORK_COVERS, NORMAL_WORK_METADATA} from './normal-work-source.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

/** Phones browse the same work without loading the desktop garden. */
export function mountMobileEntry() {
  const route = mobileEntryRoute(location.hash);
  if (route.kind !== 'notice') {
    const hash = route.kind === 'project' ? `#project-${route.id}`
      : route.kind === 'section' ? `#${route.id.replace('portfolio-', '')}` : '';
    // The portfolio's making-of remains a separate accessible Play story.
    const target = route.kind === 'project' && route.id === 'portfolio-world'
      ? new URL('./projects.html#project-portfolio-world', location.href).href
      : normalPortfolioURL(location.href, hash);
    location.replace(target);
    return null;
  }

  document.getElementById('game').hidden = true;
  document.body.classList.remove('hybrid-world', 'hybrid-intro', 'hybrid-reading', 'cloud-handoff');
  document.body.style.overflow = 'auto';
  const notice = document.createElement('main');
  notice.id = 'mobile-play-notice';
  notice.setAttribute('aria-labelledby', 'mobile-play-title');
  const projects = new Map(NORMAL_WORK_METADATA.map(project => [project.id, project]));
  const cards = NORMAL_WORK_ORDER.map((id, index) => {
    const project = projects.get(id), cover = NORMAL_WORK_COVERS[id];
    const titleId = `mobile-work-${id}-title`, summaryId = `mobile-work-${id}-summary`;
    const href = normalPortfolioURL(location.href, localCaseStudyHash(project));
    return `<li class="mobile-work-card" data-mobile-project="${escapeHTML(id)}">
      <a class="mobile-work-link" href="${escapeHTML(href)}" aria-labelledby="${titleId}" aria-describedby="${summaryId}">
        <img class="mobile-work-cover" src="${escapeHTML(new URL(cover.src, location.href).href)}" width="${cover.width}" height="${cover.height}" alt="${escapeHTML(cover.alt)}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async">
        <h2 id="${titleId}">${escapeHTML(project.title)}</h2>
        <p class="mobile-work-type">${escapeHTML(project.subtitle || project.status)}</p>
        <p class="mobile-work-summary" id="${summaryId}">${escapeHTML(project.summary)}</p>
        <span class="mobile-work-action">Read case study</span>
      </a>
    </li>`;
  }).join('');
  notice.innerHTML = `<header class="mobile-mode-bar">
    <span class="mode-switch" data-mode-switch>Portfolio / Play</span>
    </header>
    <div class="mobile-play-intro">
      <p class="mobile-play-eyebrow">LAKSHYA’S WORLD</p>
      <h1 id="mobile-play-title" tabindex="-1">The Works Room</h1>
      <p>Browse the projects. Open a case study for the full story.</p>
    </div>
    <ul class="mobile-work-grid" aria-label="Projects">${cards}</ul>
    <footer class="mobile-play-footer">
      <p>The 3D garden is best explored on a computer or laptop.</p>
      <a id="mobile-view-portfolio" data-normal-portfolio href="/normal-portfolio/">View portfolio</a>
    </footer>`;
  document.body.append(notice);
  bindPortfolioLinks(notice, location);
  decorateModeSelectors(notice,{mode:'play',pageURL:location.href});
  return {notice};
}
