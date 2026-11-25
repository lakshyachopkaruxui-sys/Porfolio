export function burst(host, destination, score, image) {
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
    artwork = image;
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

