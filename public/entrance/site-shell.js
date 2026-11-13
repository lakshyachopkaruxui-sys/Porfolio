(() => {
  'use strict';

  const stateKey = 'portfolioShellRoute';
  const childStateKey = 'portfolioShellChildState';
  const entranceTitle = document.title;
  const entrance = document.querySelector('main');
  let frame;
  let lastRoute;

  function routeFrom(value) {
    try {
      const url = new URL(value, location.origin);
      if (url.origin !== location.origin ||
          !/^\/(normal-portfolio|bicycle-world\/dist)\//.test(url.pathname) ||
          /\.[^/]+$/.test(url.pathname) && !url.pathname.endsWith('.html')) return null;
      return url.pathname + url.search + url.hash;
    } catch {
      return null;
    }
  }

  function record(route, childState = null, method = 'replaceState') {
    history[method]({...history.state, [stateKey]: route, [childStateKey]:childState}, '', '/');
  }

  function showEntrance() {
    frame?.remove();
    frame = undefined;
    entrance.hidden = false;
    document.documentElement.classList.remove('portfolio-app-open');
    document.title = entranceTitle;
    const selector = lastRoute?.startsWith('/bicycle-world/') ? 'a.play' : 'a.work';
    document.querySelector(selector)?.focus({preventScroll:true});
  }

  function showApp(route, childState = null) {
    lastRoute = route;
    if (frame) {
      const current = frame.contentWindow.location;
      const next = new URL(route,location.origin);
      if (current.pathname === next.pathname) {
        frame.contentWindow.postMessage({type:'lakshya:restore',route,state:childState},location.origin);
      } else {
        current.replace(route);
      }
      return;
    }
    document.querySelectorAll('video').forEach(video => video.pause());
    frame = document.createElement('iframe');
    frame.id = 'portfolio-app';
    frame.title = route.startsWith('/bicycle-world/') ? 'Lakshya’s bicycle garden' : 'Lakshya’s portfolio';
    frame.allow = 'autoplay; clipboard-write; fullscreen';
    frame.allowFullscreen = true;
    frame.src = route;
    frame.addEventListener('load', () => {
      if (!frame) return;
      const view = frame.contentWindow;
      if (view.location.origin !== location.origin) return;
      if (view.location.pathname === '/') {
        record(null);
        showEntrance();
        return;
      }
      const current = routeFrom(view.location.href);
      if (current) {
        record(current,view.history.state);
        lastRoute = current;
        frame.title = view.document.title;
        document.title = view.document.title;
        // Focus the browsing context so the existing keyboard controls receive input.
        frame.focus({preventScroll:true});
      }
    });
    entrance.hidden = true;
    document.documentElement.classList.add('portfolio-app-open');
    document.body.appendChild(frame);
  }

  document.addEventListener('click', event => {
    const link = event.target.closest?.('.stop > a');
    if (!link || event.defaultPrevented || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const route = routeFrom(link.href);
    if (!route) return;
    event.preventDefault();
    record(route, null, 'pushState');
    showApp(route);
  });

  addEventListener('message', event => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin) return;
    if (event.data?.type === 'lakshya:entrance') {
      record(null, null, 'pushState');
      showEntrance();
      return;
    }
    if (!['lakshya:route','lakshya:navigate'].includes(event.data?.type)) return;
    const route = routeFrom(event.data.route);
    if (!route) return;
    if (event.data.type === 'lakshya:navigate') {
      record(route,null,'pushState');
      showApp(route);
      return;
    }
    record(route,event.data.state,event.data.action === 'push' ? 'pushState' : 'replaceState');
    lastRoute = route;
    if (typeof event.data.title === 'string') {
      frame.title = event.data.title;
      document.title = event.data.title;
    }
  });

  addEventListener('popstate', () => {
    const route = routeFrom(history.state?.[stateKey]);
    if (!route) showEntrance();
    else showApp(route,history.state?.[childStateKey]);
  });

  const restored = routeFrom(history.state?.[stateKey]);
  if (restored) showApp(restored,history.state?.[childStateKey]);
})();
