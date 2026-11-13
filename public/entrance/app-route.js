(() => {
  'use strict';

  if (['4186','4187'].includes(location.port) &&
      ['localhost','127.0.0.1','[::1]'].includes(location.hostname)) return;

  const route = () => location.pathname + location.search + location.hash;
  if (self === top) {
    // Preserve direct case links in a new tab, including noopener tabs and reloads.
    // The root restores this history state without a query string or hash.
    history.replaceState({portfolioShellRoute:route(),portfolioShellChildState:history.state}, '', '/');
    location.reload();
    return;
  }

  const replace = history.replaceState.bind(history);
  const stored = parent.history.state;
  if (stored?.portfolioShellRoute === route()) {
    replace(stored.portfolioShellChildState ?? null,'',location.href);
  }

  function notify(action = 'replace') {
    parent.postMessage({type:'lakshya:route',route:route(),state:history.state,action,title:document.title},location.origin);
  }
  // The outer document owns the single history entry. This also survives a
  // refresh, where the browser recreates the embedded browsing context.
  history.pushState = function (...args) { replace(...args); notify('push'); };
  history.replaceState = function (...args) { replace(...args); notify(); };
  window.portfolioShellNavigate = url => {
    parent.postMessage({type:'lakshya:navigate',route:new URL(url,location.href).href},location.origin);
  };
  addEventListener('message',event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'lakshya:restore') return;
    const next = new URL(event.data.route,location.href);
    if (next.origin !== location.origin || next.pathname !== location.pathname) return;
    replace(event.data.state ?? null,'',next.href);
    dispatchEvent(new PopStateEvent('popstate',{state:event.data.state ?? null}));
  });
  for (const event of ['popstate','hashchange','pageshow','DOMContentLoaded']) {
    addEventListener(event,() => notify());
  }
  if (document.querySelector('title')) {
    new MutationObserver(() => notify()).observe(document.querySelector('title'),{childList:true,subtree:true,characterData:true});
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    const url = new URL(link.href,location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === '/' && !url.search && !url.hash && event.button === 0 &&
        !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      parent.postMessage({type:'lakshya:entrance'},location.origin);
    } else if (link.target === '_top') {
      link.target = '_self';
    }
  },true);
  document.addEventListener('click',event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.download || link.target === '_blank') return;
    const next = new URL(link.href,location.href);
    if (next.origin !== location.origin ||
        !/^\/(normal-portfolio|bicycle-world\/dist)\//.test(next.pathname) ||
        /\.[^/]+$/.test(next.pathname) && !next.pathname.endsWith('.html') ||
        next.pathname === location.pathname) return;
    event.preventDefault();
    window.portfolioShellNavigate(next.href);
  });
  notify();
})();
