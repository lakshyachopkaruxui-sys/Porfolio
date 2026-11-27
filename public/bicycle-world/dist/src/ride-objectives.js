import * as THREE from 'three';
import {HOP_SITES, worldPoint} from './river-hop/hop-sites.js';
import {HOP} from './river-hop/trajectory.js';

const W = 512, H = 192;
const rampLips = HOP_SITES.flatMap(site => [HOP.launch, HOP.land].map(z => worldPoint({x:HOP.x, z}, site)));

function makeMarker(label, pointsLeft = false) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = pointsLeft ? 96 : H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  // The cream enamel plaque and ochre pointer share the garden boards' palette.
  ctx.fillStyle = '#fff8df';
  ctx.strokeStyle = '#294c3d';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  const left = pointsLeft ? 84 : 5;
  ctx.beginPath();
  ctx.moveTo(left + 25,5); ctx.lineTo(W-30,5);
  ctx.quadraticCurveTo(W-5,5,W-5,30); ctx.lineTo(W-5,63);
  ctx.quadraticCurveTo(W-5,88,W-30,88); ctx.lineTo(left + 25,88);
  ctx.quadraticCurveTo(left,88,left,63); ctx.lineTo(left,30);
  ctx.quadraticCurveTo(left,5,left + 25,5); ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#213f34';
  ctx.font = 'bold 45px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, (left + W-5)/2, 46, W-left-26);
  ctx.beginPath();
  const arrow = pointsLeft
    ? [[5,46],[39,15],[39,31],[72,31],[72,61],[39,61],[39,77]]
    : [[237,98],[275,98],[275,132],[299,132],[256,181],[213,132],[237,132]];
  for (const [i,[x,y]] of arrow.entries()) {
    if (i === 0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.fillStyle = '#f4bd5c';
  ctx.fill();
  ctx.stroke();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({map, transparent:true, depthWrite:false, toneMapped:false, opacity:0});
  const sprite = new THREE.Sprite(material);
  sprite.name = label;
  if (pointsLeft) sprite.center.set(0,.5);
  else sprite.center.set(.5,0);
  sprite.visible = false;
  return sprite;
}

export function createRideObjectives(scene, guide) {
  const board = makeMarker('Open riding guide', true);
  const ramp = makeMarker('Ride up to jump');
  for (const sprite of [board,ramp]) if (sprite) scene.add(sprite);
  if (board) {
    board.userData.gardenGuide = true;
    const hit = board.raycast.bind(board);
    board.raycast = (ray, hits) => {
      if (board.visible && board.material.opacity > .35) hit(ray, hits);
    };
    guide.hitMeshes.push(board);
  }
  const cameraPoint = new THREE.Vector3();
  const signCenter = new THREE.Vector3();
  const corner = new THREE.Vector3();
  const boardCorners = [];
  // Outer edges of the timber sign, including its supporting posts.
  for (const x of [-2.23,2.23]) for (const y of [0,4.66]) for (const z of [-.18,.44]) {
    boardCorners.push(new THREE.Vector3(x,y,z).applyMatrix4(guide.root.matrixWorld));
  }
  const entryTip = document.getElementById('ride-start-tip');
  let currentLip = null, boardRead = false, jumped = false;

  function updateVisibility(sprite, distance, range, dt, reduced) {
    if (!sprite) return false;
    const alpha = 1 - THREE.MathUtils.smoothstep(distance, range-8, range);
    const mix = reduced ? 1 : 1-Math.exp(-10*dt);
    sprite.material.opacity += (alpha-sprite.material.opacity)*mix;
    sprite.visible = sprite.material.opacity > .015;
    return sprite.visible;
  }

  function placeRamp(sprite, point, height, widthPx, camera, viewportHeight, time, reduced) {
    sprite.position.set(point.x, height + (reduced ? 0 : .15*(1-Math.cos(time*2.8))), point.z);
    cameraPoint.copy(sprite.position).applyMatrix4(camera.matrixWorldInverse);
    const depth = camera.isPerspectiveCamera ? Math.max(camera.near,-cameraPoint.z) : 1;
    const width = THREE.MathUtils.clamp(2*depth*widthPx/(viewportHeight*camera.projectionMatrix.elements[5]), 1.0, 8.5);
    sprite.scale.set(width, width*H/W, 1);
  }

  function placeBoard(camera, viewportHeight) {
    const viewportWidth = window.innerWidth;
    signCenter.set(0,3.15,.13).applyMatrix4(guide.root.matrixWorld).project(camera);
    if (signCenter.z < -1 || signCenter.z > 1) { board.visible = false; return; }
    let right = -Infinity, bottom = -Infinity;
    for (const point of boardCorners) {
      corner.copy(point).project(camera);
      right = Math.max(right,(corner.x+1)*viewportWidth/2);
      bottom = Math.max(bottom,(1-corner.y)*viewportHeight/2);
    }
    const x = right + 6;
    const width = Math.min(174,viewportWidth-x-8);
    const height = width * board.material.map.image.height/W;
    let y = (1-signCenter.y)*viewportHeight/2;
    if (width < 112 || x < 0) { board.visible = false; return; }
    if (entryTip && !entryTip.hidden) {
      const tip = entryTip.getBoundingClientRect();
      if (x < tip.right+8 && x+width > tip.left-8 && y+height/2 > tip.top-8)
        y = Math.max(y,tip.bottom+8+height/2);
    }
    // When the sign is leaving the screen, omit the callout rather than point away from it.
    if (y > bottom || y+height/2 > viewportHeight-4 || y-height/2 < 0) { board.visible = false; return; }
    board.position.set(2*x/viewportWidth-1,1-2*y/viewportHeight,signCenter.z).unproject(camera);
    cameraPoint.copy(board.position).applyMatrix4(camera.matrixWorldInverse);
    const unitsPerPixel = 2*(camera.isPerspectiveCamera ? -cameraPoint.z : 1)/(viewportHeight*camera.projectionMatrix.elements[5]);
    board.scale.set(width*unitsPerPixel,height*unitsPerPixel,1);
  }

  function hide(sprite) {
    if (sprite) { sprite.visible = false; sprite.material.opacity = 0; }
  }
  return {
    readBoard() { boardRead = true; hide(board); },
    landed() { jumped = true; hide(ramp); },
    hide() { hide(board); hide(ramp); },
    update(state, camera, viewportHeight, time, dt, reduced) {
      camera.updateMatrixWorld();
      const distance = p => Math.hypot(p.x-state.x,p.z-state.z);
      if (!boardRead && updateVisibility(board,distance(guide.position),35,dt,reduced)) placeBoard(camera,viewportHeight);
      if (jumped) return;
      // Keep one bank selected at a time, including on the rotated return bridge.
      // The margin prevents alternating lips at the midpoint.
      for (const lip of rampLips) {
        if (!currentLip || distance(lip)+2 < distance(currentLip)) currentLip = lip;
      }
      if (updateVisibility(ramp,distance(currentLip),31,dt,reduced)) {
        placeRamp(ramp,currentLip,HOP.lip+.40,174,camera,viewportHeight,time,reduced);
      }
    },
    dispose() {
      if (board) guide.hitMeshes.splice(guide.hitMeshes.indexOf(board),1);
      for (const sprite of [board,ramp]) {
        if (!sprite) continue;
        sprite.removeFromParent(); sprite.material.map.dispose(); sprite.material.dispose();
      }
    }
  };
}
