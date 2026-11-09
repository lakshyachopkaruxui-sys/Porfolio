/** Shared two-destination navigation. The displayed page owns selection state. */
const SWITCH_DURATION = 180;
const selectorStates = new WeakMap();
const movingSelectors = new Set();
const lifecycleWindows = new WeakSet();

function cancelSwitch(state) {
  state.view.clearTimeout(state.timer);
  state.timer = null;
  movingSelectors.delete(state);
  state.host.dataset.visualMode = state.host.dataset.mode;
  delete state.host.dataset.modeMoving;
}

function bindWindowLifecycle(view) {
  if (!view?.addEventListener || lifecycleWindows.has(view)) return;
  lifecycleWindows.add(view);
  view.addEventListener('pagehide', () => {
    for (const state of movingSelectors) {
      if (state.view === view) cancelSwitch(state);
    }
  });
  view.addEventListener('pageshow', () => {
    for (const host of view.document.querySelectorAll('[data-mode-switch]')) {
      host.dataset.visualMode = host.dataset.mode;
      delete host.dataset.modeMoving;
      const state = selectorStates.get(host);
      if (state) state.committed = false;
    }
  });
}

function bindModeClick(host) {
  const view = host.ownerDocument?.defaultView;
  const state = {host, view, timer: null, replaying: false, committed: false, navigationHandled: false};
  selectorStates.set(host, state);
  bindWindowLifecycle(view);
  host.addEventListener('click', event => {
    const link = event.target.closest?.('[data-mode-link]');
    if (!link || link.parentElement !== host) {
      event.stopImmediatePropagation();
      return;
    }
    if (state.replaying) {
      if (state.navigationHandled) event.preventDefault();
      return;
    }
    if (link.dataset.modeLink === host.dataset.mode) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0;
    if (modified) {
      if (state.timer !== null) cancelSwitch(state);
      event.stopImmediatePropagation();
      return;
    }
    if (state.timer !== null || state.committed) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const reduced = view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      || host.ownerDocument?.documentElement?.classList.contains('reduce-motion');
    // Enter and reduced-motion navigation retain their immediate native response.
    if (event.detail === 0 || reduced || !view?.setTimeout || typeof link.click !== 'function') {
      if (state.navigationHandled) event.preventDefault();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const initialMode = host.dataset.mode;
    host.dataset.modeMoving = 'true';
    host.dataset.visualMode = link.dataset.modeLink;
    movingSelectors.add(state);
    state.timer = view.setTimeout(() => {
      state.timer = null;
      movingSelectors.delete(state);
      delete host.dataset.modeMoving;
      if (host.isConnected === false || host.dataset.mode !== initialMode) {
        host.dataset.visualMode = host.dataset.mode;
        return;
      }
      // A single native activation now reaches the original Play owner, which
      // saves the ride and releases audio/room resources before navigating.
      state.replaying = true;
      state.committed = true;
      try {
        link.click();
      } finally {
        state.replaying = false;
      }
    }, SWITCH_DURATION);
  }, true);
  return state;
}

export function portfolioModeURLs(pageURL) {
  const page = new URL(pageURL);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(page.hostname);
  if (local && ['4186', '4187'].includes(page.port)) {
    const portfolio = new URL('/normal-portfolio/', page);portfolio.port = '4187';
    const play = new URL('/dist/', page);play.port = '4186';
    return {portfolio: portfolio.href, play: play.href};
  }
  const marker = page.pathname.includes('/normal-portfolio/') ? '/normal-portfolio/' : '/bicycle-world/';
  const prefix = page.pathname.includes(marker) ? page.pathname.split(marker)[0] : '';
  const destination = pathname => {
    const target = new URL('/', page);
    // A pathname starting with // must not be interpreted as a new authority.
    target.pathname = pathname;
    target.search = ''; target.hash = '';
    return target.href;
  };
  return {
    portfolio: destination(`${prefix}/normal-portfolio/`),
    play: destination(`${prefix}/bicycle-world/dist/`),
  };
}

export function decorateModeSelectors(root, {mode = 'play', pageURL = globalThis.location?.href || import.meta.url, navigationHandled = false} = {}) {
  const urls = portfolioModeURLs(pageURL);
  const hosts = [...root.querySelectorAll('[data-mode-switch]')];
  for (const host of hosts) {
    host.classList.add('mode-selector');
    host.dataset.mode = mode;
    if (!host.dataset.modeMoving) host.dataset.visualMode = mode;
    host.setAttribute('role', 'group');host.setAttribute('aria-label', 'Portfolio version');
    host.removeAttribute('aria-checked');host.removeAttribute('type');
    if (host.dataset.modeReady !== 'true') {
      host.innerHTML = '<span class="mode-selector-plate" aria-hidden="true"></span><a data-mode-link="portfolio">Portfolio</a><a data-mode-link="play">Play</a>';
      host.dataset.modeReady = 'true';
    }
    const state = selectorStates.get(host) || bindModeClick(host);
    state.navigationHandled = navigationHandled;
    for (const link of host.querySelectorAll('[data-mode-link]')) {
      const selected = link.dataset.modeLink === mode;
      link.href = urls[link.dataset.modeLink];
      if (selected) link.setAttribute('aria-current', 'page');else link.removeAttribute('aria-current');
      link.setAttribute('aria-label', link.textContent);
      link.title = selected ? `Current version: ${link.textContent}` : `Switch to ${link.textContent}`;
    }
  }
  return hosts;
}
