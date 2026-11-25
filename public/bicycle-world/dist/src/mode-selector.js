/** Shared two-destination navigation. The displayed page owns selection state. */
const SWITCH_DURATION = 2150;
const selectorStates = new WeakMap();
const movingSelectors = new Set();
const lifecycleWindows = new WeakSet();


let ac, noise;
function voice(at,duration,gain,freq,end,air=false){
 const src=air?ac.createBufferSource():ac.createOscillator(), env=ac.createGain();
 let filter;
 if(air){src.buffer=noise;filter=ac.createBiquadFilter();filter.type='bandpass';filter.Q.value=.8;filter.frequency.setValueAtTime(freq,at);filter.frequency.exponentialRampToValueAtTime(end,at+duration);src.connect(filter);filter.connect(env)}
 else{src.frequency.setValueAtTime(freq,at);src.frequency.exponentialRampToValueAtTime(end,at+duration);src.connect(env)}
 env.gain.setValueAtTime(.0001,at);env.gain.exponentialRampToValueAtTime(gain,at+(air?.012:.004));env.gain.exponentialRampToValueAtTime(.0001,at+duration);env.connect(ac.destination);src.start(at);src.stop(at+duration+.01);src.onended=()=>{src.disconnect();env.disconnect();filter?.disconnect()};
}
function score(balls,impacts){
 const wallStart = performance.now();
 const silentClock = () => (performance.now() - wallStart) / 1000;
 try {
   if (localStorage.getItem('lakshya-ambient-music-enabled') === '0' ||
       localStorage.getItem('lakshya-ambient-music-level') === '0') return silentClock;
   const Audio = window.AudioContext || window.webkitAudioContext;
   if (!Audio) return silentClock;
   ac ??= new Audio({latencyHint:'interactive'});
   if (ac.state !== 'running') void ac.resume().catch(() => {});
   if (!noise) {
     noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
     const samples = noise.getChannelData(0);
     for (let i=0; i<samples.length; i++) samples[i]=Math.random()*2-1;
   }
 const start=ac.currentTime+.055;
 if(balls){
 voice(start+.025,.115,.22,370,105);voice(start+.025,.075,.19,1900,620,true);
 let last=-1,count=0;
 for(const hit of impacts.sort((a,b)=>a.time-b.time)){
 if(hit.time-last<.11 || count>=4)continue;
 const f=235+hit.x*100;voice(start+hit.time,.085,.14*hit.strength,f,f*.62);voice(start+hit.time,.047,.12*hit.strength,1300,700,true);last=hit.time;count++;
 }
 }else{
 voice(start+.028,.28,.15,2300,4750,true);
 [.24,.395,.55].forEach((t,i)=>{const f=[1590,2100,1800][i],g=[.095,.061,.041][i];voice(start+t,.24,g,f,f*.998);voice(start+t,.11,g*.40,f*2.47,f*2.46);});
 }
 return ()=>{if(ac.state!=='running')return silentClock();const stamp=ac.getOutputTimestamp?.();const audible=stamp?.performanceTime?stamp.contextTime+(performance.now()-stamp.performanceTime)/1000:ac.currentTime-(ac.outputLatency||ac.baseLatency||0);return Math.max(0,audible-start)};
 } catch { return silentClock; }
}

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
  const count = balls ? ballCount : Math.min(144, Math.max(42, Math.round(view.innerWidth / 10)));
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
    artwork.width = artwork.height = 112;
    const brush = artwork.getContext('2d');
    if (!brush) { layer.remove(); return layer; }
    brush.translate(56, 56);

    // Bake the honey-colored bloom once. Every particle shares this small bitmap.
    const bloom = brush.createRadialGradient(0, 0, 0, 0, 0, 55);
    bloom.addColorStop(0, 'rgba(255,255,231,1)');
    bloom.addColorStop(.14, 'rgba(255,240,165,.45)');
    bloom.addColorStop(.32, 'rgba(255,207,98,.18)');
    bloom.addColorStop(.58, 'rgba(255,181,61,.055)');
    bloom.addColorStop(.82, 'rgba(255,177,54,.012)');
    bloom.addColorStop(1, 'rgba(255,177,54,0)');
    brush.fillStyle = bloom;
    brush.fillRect(-56, -56, 112, 112);

    const core = brush.createRadialGradient(0, 0, 0, 0, 0, 38);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(.22, '#fffde6');
    core.addColorStop(.53, '#ffe9a4');
    core.addColorStop(1, 'rgba(255,222,137,.48)');
    brush.fillStyle = core;
    brush.beginPath();
    brush.moveTo(0, -40);
    brush.bezierCurveTo(2, -10, 6, -3, 43, 0);
    brush.bezierCurveTo(7, 3, 2, 11, 0, 40);
    brush.bezierCurveTo(-2, 12, -6, 3, -43, 0);
    brush.bezierCurveTo(-7, -3, -2, -11, 0, -40);
    brush.closePath();
    brush.fill();
  }
  const particles = Array.from({length: count}, (_, i) => {
    const size = balls ? 12 + Math.random()*23 : 17 + 23*Math.pow(Math.random(), 1.45);
    const radius = size*.7;
    const delay=Math.random()*(balls ? .09 : .19);
    const accent=.24+(i%3)*.155;
    const phase=balls || i%4 ? Math.random()*Math.PI*2 : -(accent-delay)*7;
    const rate=balls || i%4 ? 5+1.2*Math.sin(phase) : 7;
    const gravity = height*(balls ? 3.8 : 3.3)*(1 + Math.random()*.2);
    const vy = height*(Math.random()*.72 - .43);
    const airTime = (Math.sqrt(vy*vy + 2*gravity*Math.max(1,height-radius-y)) - vy)/gravity;
    // Distribute landing lanes across the viewport. Some launch outward and bank off a wall.
    const lane = radius + (width-2*radius)*(i+Math.random())/count;
    const target = i%7 === 0 ? (x>width/2 ? 2*(width-radius)-lane : 2*radius-lane) : lane;
    const vx = (target-x)/airTime;
    return {x,y,vx,vy,gravity,radius,size,phase,rate,angle:phase,
      spin:(Math.random()-.5)*(balls ? 10 : 1.1), restitution:(balls ? .28 : .16)+Math.random()*.13,
      delay, age:0, grounded:false};
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
  // Run the same fixed-step collision solver ahead for prominent balls.
  const impacts=[];
  if(balls) for(const original of particles.filter(p=>p.size>25)){
    const p={...original};
    while(p.age<1.6 && impacts.length<particles.length*2){
      const previous=p.vy; advance(p,1/90);p.age+=1/90;
      if(previous>0 && p.vy<0 && p.y>=height-p.radius-.1){
        impacts.push({time:p.age+p.delay,strength:Math.min(1,previous/height),x:p.x/width}); 
        if(p.age>1.25)break;
      }
    }
  }
  const elapsed=score(balls,impacts);
  function paint() {
    const now=elapsed()*1000; const start=0;
    if (!layer.isConnected) return;
    ctx.clearRect(0,0,width,height);
    const tail = Math.max(0, Math.min(1, (2110 - (now - start)) / 610));
    const fade = tail * tail * (3 - 2 * tail);
    for (const p of particles) {
      const age=Math.max(0,Math.min(2.1,(now-start)/1000-p.delay));
      if (!age) continue;
      while (p.age<age) {
        const dt=Math.min(1/90,age-p.age);
        advance(p,dt);
        p.age+=dt;
      }
      const flash = balls ? 1 : (.5 + .5*Math.cos(p.phase + age*p.rate)) ** 2;
      const shimmer = balls ? .92 : .58 + .42*flash;
      const size=p.size*(.32+1.08*(1-Math.exp(-age*5)));
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle);
      if (!balls) { const pulse = .87 + .22*flash; ctx.scale(pulse, pulse); }
      ctx.globalAlpha=Math.min(1,age*10)*shimmer*fade;
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
