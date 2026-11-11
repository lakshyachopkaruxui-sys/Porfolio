import { decorateModeSelectors, portfolioModeURLs } from './mode-selector.js?v=20261105';

decorateModeSelectors(document, { mode: 'portfolio', pageURL: location.href });

const playURL = portfolioModeURLs(location.href).play;
for (const link of document.querySelectorAll('[data-play-mode-link]')) {
  link.href = playURL;
}

const header = document.querySelector('.site-header');
const navigation = header?.querySelector(':scope > nav');
const selector = header?.querySelector(':scope > .header-preferences') || header?.querySelector(':scope > [data-mode-switch]');
if (navigation && selector) {
  const twoRowHeader = window.matchMedia('(max-width: 1100px)');
  // On phones the selector sits on the logo row, before the section links.
  // Keep tab order and focus consistent when the viewport crosses that boundary.
  function matchVisualOrder() {
    const next = twoRowHeader.matches ? navigation : null;
    if (selector.nextElementSibling === next) return;
    const focused = document.activeElement;
    header.insertBefore(selector, next);
    if (selector.contains(focused) && document.activeElement !== focused) {
      focused.focus({ preventScroll: true });
    }
  }
  matchVisualOrder();
  twoRowHeader.addEventListener('change', matchVisualOrder);
}
