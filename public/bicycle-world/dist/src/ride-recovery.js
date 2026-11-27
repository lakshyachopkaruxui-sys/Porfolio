import {PATHS,positionIsClear} from './layout.js';

// Sample the marked track only when recovery is requested. Check the landing
// and the first bicycle length ahead so the rider can pedal away immediately.
export function findRecoveryPoint(state,colliders){
  let closest=null,best=Infinity;
  for(const path of PATHS){
    for(let i=1;i<path.points.length;i++){
      const a=path.points[i-1],b=path.points[i];
      const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
      if(length<.01)continue;
      const segments=Math.ceil(length);
      for(let j=0;j<=segments;j++){
        const x=a.x+dx*j/segments,z=a.z+dz*j/segments;
        const distance=Math.hypot(x-state.x,z-state.z);
        if(distance+.001>=best)continue;
        for(const direction of [1,-1]){
          const heading=Math.atan2(-dx*direction,-dz*direction);
          const score=distance+.35*(1-Math.cos(heading-state.heading));
          if(score>=best)continue;
          const point={x,z,heading};
          const ahead={x:x-2*Math.sin(heading),z:z-2*Math.cos(heading),heading};
          if(positionIsClear(point,colliders)&&positionIsClear(ahead,colliders)){
            closest=point;best=score;
          }
        }
      }
    }
  }
  return closest;
}
