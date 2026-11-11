import {decorateModeSelectors} from './mode-selector.js';
import {normalPortfolioURL, bindPortfolioLinks} from './portfolio-route.js';
import {mobileEntryRoute} from './mobile-entry-policy.js';

/** Phones show a desktop notice, then use the separately maintained portfolio. */
export function mountMobileEntry() {
  const route = mobileEntryRoute(location.hash);
  if (route.kind !== 'notice') {
    const hash = route.kind === 'project' ? `#project-${route.id}`
      : route.kind === 'section' ? `#${route.id.replace('portfolio-', '')}` : '';
    // The portfolio's making-of remains an accessible Play story, not a sixth Normal case.
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
  notice.innerHTML = `<header class="mobile-mode-bar">
    <span class="mode-switch" data-mode-switch>Portfolio / Play</span>
    </header><div class="mobile-play-card">
    <svg class="mobile-play-device" viewBox="0 0 120 90" fill="none" aria-hidden="true"><rect x="19" y="10" width="82" height="55" rx="5"/><path d="M12 76h96M47 65l-3 11m29-11 3 11"/><path d="m53 25 19 12-19 12Z"/></svg>
    <h1 id="mobile-play-title" tabindex="-1">Explore the garden on a bigger screen.</h1>
    <p>For the best experience, explore the garden on a computer or laptop.</p>
    <p>You can browse Lakshya’s projects, experience and design process here on your phone.</p>
    <a id="mobile-view-portfolio" class="primary" data-normal-portfolio href="/normal-portfolio/">View portfolio</a></div>`;
  document.body.append(notice);
  bindPortfolioLinks(notice, location);
  decorateModeSelectors(notice,{mode:'play',pageURL:location.href});
  return {notice};
}
