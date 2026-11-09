import * as THREE from 'three';
import {RIDER_HALF_WHEELBASE,terrainHeight} from './layout.js';

/** A small ground cue anchors a blocked contact to the bicycle, not the camera. */
export function createContactMarker(scene,color){
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.RingGeometry(.56,.64,40),material);mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);
  let remaining=0;
  return {
    update(state,feedback,input,dt,reduced){
      if(feedback.contactEvent){const side=input.reverse?-1:1;const x=state.x-Math.sin(state.heading)*RIDER_HALF_WHEELBASE*side,z=state.z-Math.cos(state.heading)*RIDER_HALF_WHEELBASE*side;mesh.position.set(x,terrainHeight(z,x)+.045,z);remaining=.48;}
      else remaining=Math.max(0,remaining-dt);
      mesh.visible=remaining>0;material.opacity=.5*Math.min(1,remaining/.25);mesh.scale.setScalar(reduced?1:1+(.48-remaining)*.6);
    },
    reset(){remaining=0;mesh.visible=false;},
    dispose(){mesh.removeFromParent();mesh.geometry.dispose();material.dispose();}
  };
}
