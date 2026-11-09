import * as THREE from 'three';
import {STOPS, RIDER_HALF_WHEELBASE, RIDER_RADIUS, RIDER_HEADROOM} from './layout.js';

/** Shift the composition into the unobscured area without rotating the camera. */
export function frameBesidePanel(frame,width,height,panel,cameraOffset) {
  if(!panel)return frame;
  const bottomSheet=panel.left<40&&panel.width>width*.8;
  const availableWidth=bottomSheet?width:Math.max(180,panel.left-16);
  const availableHeight=bottomSheet?Math.max(140,panel.top-16):height;
  const forward=cameraOffset.clone().normalize();
  const right=new THREE.Vector3(forward.z,0,-forward.x).normalize();
  const up=new THREE.Vector3().crossVectors(forward,right).normalize();
  const fullHeight=frame.height*height/availableHeight;
  const target=frame.target.clone()
    .addScaledVector(right,(width-availableWidth)/2/height*fullHeight)
    .addScaledVector(up,(availableHeight-height)/2/height*fullHeight);
  return {target,height:fullHeight};
}

/** Fit one destination and the bicycle, never the entire map. */
export function createLandmarkFramer(roots, cameraOffset, {minHeight=24,minWidth=16,alwaysFit=false,localMinHeights={}}={}) {
  const forward = cameraOffset.clone().normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();
  const up = new THREE.Vector3().crossVectors(forward, right).normalize();
  const corner = new THREE.Vector3();
  const bounds = new Map();
  // Cache the actual silhouette, rather than projecting empty corners of a large
  // world-aligned box. That keeps the four studios legible on a narrow viewport.
  for(const [id,root] of roots){
    const extent={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
    root.updateWorldMatrix(true,true);
    root.traverse(object=>{
      const vertices=object.geometry?.attributes.position;if(!vertices)return;
      for(let i=0;i<vertices.count;i++){
        corner.fromBufferAttribute(vertices,i).applyMatrix4(object.matrixWorld);
        const x=corner.dot(right),y=corner.dot(up);
        extent.minX=Math.min(extent.minX,x);extent.maxX=Math.max(extent.maxX,x);
        extent.minY=Math.min(extent.minY,y);extent.maxY=Math.max(extent.maxY,y);
      }
    });
    bounds.set(id,extent);
  }
  const riderExtent = RIDER_HALF_WHEELBASE + RIDER_RADIUS;
  const smoothstep = value => value * value * (3 - 2 * value);

  return function frame(state, width, height, rideTarget) {
    const aspect = width / height, baseHeight = Math.max(minHeight, minWidth / aspect);
    let totalWeight=0,heightOffset=0;
    const targetOffset=new THREE.Vector3();
    for (const [id, stop] of Object.entries(STOPS)) {
      const distance = Math.hypot(state.x - stop.arrival.x, state.z - stop.arrival.z);
      const influence = alwaysFit?1:1 - smoothstep(Math.max(0, Math.min(1, (distance - 3) / 13)));
      if(!influence||!bounds.has(id))continue;
      let {minX,maxX,minY,maxY}=bounds.get(id);
      for(const x of [state.x-riderExtent,state.x+riderExtent]){
        for(const y of [0,RIDER_HEADROOM]){
          for(const z of [state.z-riderExtent,state.z+riderExtent]){
            corner.set(x,y,z);
            const sx=corner.dot(right),sy=corner.dot(up);
            minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);
            minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);
          }
        }
      }
      const center=right.clone().multiplyScalar((minX+maxX)/2).addScaledVector(up,(minY+maxY)/2);
      // Position along the view axis does not affect orthographic composition.
      center.addScaledVector(forward,(1.5-center.y)/forward.y);
      const localBaseHeight=Math.max(localMinHeights[id]??minHeight,minWidth/aspect);
      const fittedHeight=Math.max(localBaseHeight,(maxX-minX)/(aspect*.86),(maxY-minY)/.72);
      targetOffset.addScaledVector(center.sub(rideTarget),influence);
      heightOffset+=(fittedHeight-baseHeight)*influence;
      totalWeight+=influence;
    }
    // Blend overlapping approach zones continuously instead of switching the
    // selected landmark abruptly at the midpoint between two nearby stops.
    const normalizer=Math.max(1,totalWeight);
    return {
      target: rideTarget.clone().addScaledVector(targetOffset,1/normalizer),
      height: baseHeight+heightOffset/normalizer,
    };
  };
}
