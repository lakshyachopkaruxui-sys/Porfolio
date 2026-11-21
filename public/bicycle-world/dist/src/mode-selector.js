/** Shared two-destination navigation. The displayed page owns selection state. */
const SWITCH_DURATION = 2150;
const selectorStates = new WeakMap();
const movingSelectors = new Set();
const lifecycleWindows = new WeakSet();


// A small, short-lived overlay: no WebGL context, assets, or animation dependency.
function dropModeParticles(host, destination) {
  const doc = host.ownerDocument;
  const view = doc.defaultView;
  const rail = host.querySelector('.mode-selector-plate').getBoundingClientRect();
  const x = rail.left + rail.width / 2;
  const y = rail.top + rail.height / 2;
  const layer = doc.createElement('div');
  layer.className = 'mode-particle-layer';
  layer.setAttribute('aria-hidden', 'true');
  const balls = destination === 'play';
  const ballCount = view.innerWidth < 640 ? 80 : 108;
  const count = balls ? ballCount : ballCount * 3;
  const width = view.innerWidth, height = view.innerHeight;
  const canvas = doc.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return layer;
  const density = Math.min(view.devicePixelRatio || 1, 1.5, Math.sqrt(2_500_000 / Math.max(1, width * height)));
  canvas.width = Math.ceil(width * density);
  canvas.height = Math.ceil(height * density);
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  ctx.scale(density, density);
  layer.append(canvas);
  const dialog = host.closest('dialog[open]');
  (dialog || doc.body).append(layer);

  // Paint one reusable sprite for the whole shower.
  let artwork;
  if (balls) {
    artwork = new view.Image();
    artwork.src = '/entrance/49cdd3462d2e1fe2.webp';
  } else {
    artwork = doc.createElement('canvas');
    artwork.width = artwork.height = 40;
    const brush = artwork.getContext('2d');
    if (!brush) { layer.remove(); return layer; }
    for (const [color, radius, waist] of [['#ffbd27',20,5],['#fff6a6',16,3],['#ffffff',9,2]]) {
      brush.beginPath();
      for (let i = 0; i < 8; i++) {
        const theta = i * Math.PI / 4;
        const length = i % 2 ? waist : radius;
        brush.lineTo(20 + Math.cos(theta)*length, 20 + Math.sin(theta)*length);
      }
      brush.closePath(); brush.fillStyle = color; brush.fill();
    }
  }
  const particles = Array.from({length: count}, (_, i) => {
    const size = balls ? 12 + Math.random()*23 : 6 + Math.random()*22;
    const radius = size*.7;
    const phase = Math.random()*Math.PI*2;
    const gravity = height*(balls ? 3.8 : 3.3)*(1 + Math.random()*.2);
    const vy = height*(Math.random()*.72 - .43);
    const airTime = (Math.sqrt(vy*vy + 2*gravity*Math.max(1,height-radius-y)) - vy)/gravity;
    // Distribute landing lanes across the viewport. Some launch outward and bank off a wall.
    const lane = radius + (width-2*radius)*(i+Math.random())/count;
    const target = i%7 === 0 ? (x>width/2 ? 2*(width-radius)-lane : 2*radius-lane) : lane;
    const vx = (target-x)/airTime;
    return {x,y,vx,vy,gravity,radius,size,phase,angle:phase,
      spin:(Math.random()-.5)*10, restitution:(balls ? .28 : .16)+Math.random()*.13,
      delay:Math.random()*.09, age:0, grounded:false};
  });
  // Small, time-based steps keep gravity, wall contact and rolling independent of display refresh.
  function advance(p, dt) {
    if (!p.grounded) {
      p.vy += p.gravity*dt;
      p.y += p.vy*dt;
      if (p.y < p.radius && p.vy<0) {
        p.y=p.radius; p.vy *= -.55;
      }
      if (p.y >= height-p.radius && p.vy>0) {
        p.y=height-p.radius;
        p.vy *= -p.restitution;
        p.vx *= balls ? .77 : .52;
        p.spin += (.035*p.vx/p.radius - p.spin*.18);
        p.grounded=Math.abs(p.vy)<55;
      }
    } else {
      p.vx *= Math.exp(-(balls ? 3.8 : 5.8)*dt);
      p.spin += (p.vx/p.radius-p.spin)*(1-Math.exp(-9*dt));
    }
    const drift = balls || p.grounded ? 0 : 32*Math.sin(p.phase+p.age*7);
    p.x += (p.vx+drift)*dt;
    if (p.x<p.radius || p.x>width-p.radius) {
      p.x=Math.max(p.radius,Math.min(width-p.radius,p.x));
      p.vx *= -.85;
    }
    p.angle += p.spin*dt;
  }
  const start=view.performance.now();
  function paint(now) {
    if (!layer.isConnected) return;
    ctx.clearRect(0,0,width,height);
    for (const p of particles) {
      const age=Math.max(0,Math.min(2.1,(now-start)/1000-p.delay));
      if (!age) continue;
      while (p.age<age) {
        const dt=Math.min(1/90,age-p.age);
        advance(p,dt);
        p.age+=dt;
      }
      const shimmer=balls ? 1 : .82+.18*Math.cos(p.phase+age*8);
      const size=p.size*(.32+1.08*(1-Math.exp(-age*5)));
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle);
      if (!balls) ctx.scale(.65+.35*Math.abs(Math.cos(p.phase+age*5)),1);
      ctx.globalAlpha=Math.min(1,age*36)*shimmer;
      if (!balls || artwork.naturalWidth) ctx.drawImage(artwork,-size/2,-size/2,size,size);
      ctx.restore();
    }
    if(now-start<2110)view.requestAnimationFrame(paint);
  }
  view.requestAnimationFrame(paint);
  return layer;
}

function cancelSwitch(state) {
  state.particles?.remove();
  state.particles = null;
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
    // Reduced motion retains immediate native navigation.
    if (reduced || !view?.setTimeout || typeof link.click !== 'function') {
      if (state.navigationHandled) event.preventDefault();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const initialMode = host.dataset.mode;
    state.particles = dropModeParticles(host, link.dataset.modeLink);
    host.dataset.modeMoving = 'true';
    host.dataset.visualMode = link.dataset.modeLink;
    movingSelectors.add(state);
    state.timer = view.setTimeout(() => {
      state.particles?.remove();
      state.particles = null;
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
