import * as THREE from 'three';
import {HOP_SITES, worldPoint} from './river-hop/hop-sites.js';
import {HOP} from './river-hop/trajectory.js';

const W = 512, H = 192;
const rampLips = HOP_SITES.flatMap(site => [HOP.launch, HOP.land].map(z => worldPoint({x:HOP.x, z}, site)));

function makeMarker(label) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  // The cream enamel plaque and ochre pointer share the garden boards' palette.
  ctx.fillStyle = '#fff8df';
  ctx.strokeStyle = '#294c3d';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(30,5); ctx.lineTo(W-30,5);
  ctx.quadraticCurveTo(W-5,5,W-5,30); ctx.lineTo(W-5,63);
  ctx.quadraticCurveTo(W-5,88,W-30,88); ctx.lineTo(30,88);
  ctx.quadraticCurveTo(5,88,5,63); ctx.lineTo(5,30);
  ctx.quadraticCurveTo(5,5,30,5); ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#213f34';
  ctx.font = 'bold 45px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, W/2, 46, W-36);
  ctx.beginPath();
  for (const [i,[x,y]] of [[237,98],[275,98],[275,132],[299,132],[256,181],[213,132],[237,132]].entries()) {
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
  sprite.center.set(.5,0);
  sprite.visible = false;
  return sprite;
}

export function createRideObjectives(scene, guide) {
  const board = makeMarker('Open riding guide');
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
  let currentLip = null, boardRead = false, jumped = false;

  function place(sprite, point, height, distance, range, widthPx, camera, viewportHeight, time, dt, reduced) {
    if (!sprite) return;
    const alpha = 1 - THREE.MathUtils.smoothstep(distance, range-8, range);
    const mix = reduced ? 1 : 1-Math.exp(-10*dt);
    sprite.material.opacity += (alpha-sprite.material.opacity)*mix;
    sprite.visible = sprite.material.opacity > .015;
    if (!sprite.visible) return;
    sprite.position.set(point.x, height + (reduced ? 0 : .15*(1-Math.cos(time*2.8))), point.z);
    cameraPoint.copy(sprite.position).applyMatrix4(camera.matrixWorldInverse);
    const depth = camera.isPerspectiveCamera ? Math.max(camera.near,-cameraPoint.z) : 1;
    const width = THREE.MathUtils.clamp(2*depth*widthPx/(viewportHeight*camera.projectionMatrix.elements[5]), 1.0, 8.5);
    sprite.scale.set(width, width*H/W, 1);
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
      if (!boardRead) place(board,guide.position,4.79,distance(guide.position),35,168,camera,viewportHeight,time,dt,reduced);
      if (jumped) return;
      // Keep one bank selected at a time, including on the rotated return bridge.
      // The margin prevents alternating lips at the midpoint.
      for (const lip of rampLips) {
        if (!currentLip || distance(lip)+2 < distance(currentLip)) currentLip = lip;
      }
      place(ramp,currentLip,HOP.lip+.40,distance(currentLip),31,174,camera,viewportHeight,time,dt,reduced);
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
