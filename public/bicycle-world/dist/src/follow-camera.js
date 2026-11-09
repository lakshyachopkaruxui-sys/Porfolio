import * as THREE from 'three';
import {WORLD_BOUNDS,RIDER_HEADROOM,terrainHeight} from './layout.js';

/** A stable, horizon-level chase view. It owns no scene assets or renderer. */
export function createFollowCamera() {
  const camera=new THREE.PerspectiveCamera(54,1,.15,260);
  const aim=new THREE.Vector3(),eye=new THREE.Vector3(),wantedAim=new THREE.Vector3(),wantedEye=new THREE.Vector3();
  let initialized=false,heading=0,lift=0,boom=1;
  function clearBoom(state,obstacles,headY,ex,ez,span2,span,anticipate){
    if(span<1e-6)return 1;
    let limit=1;
    for(const obstacle of obstacles){
      const ox=state.x-obstacle.x,oz=state.z-obstacle.z,distance2=ox*ox+oz*oz;
      // The established road orbit already clears distant obstructions.
      // Restrict this fallback to wandering close to a canopy or structure.
      const neighbourhood=obstacle.radius+(anticipate?5.4:3);
      if(distance2>neighbourhood*neighbourhood)continue;
      const padding=anticipate?.55:.08,radius=obstacle.radius+padding;
      // A head enclosed by the conservative footprint cannot be exposed by
      // shortening this boom. Do not force a new orbit in that ambiguous case.
      if(distance2<=(obstacle.radius+.08)**2)continue;
      const dot=ox*ex+oz*ez,projection=-dot/span2;
      const lateral2=Math.max(0,distance2-dot*dot/span2);
      if(lateral2>radius*radius)continue;
      const halfChord=Math.sqrt((radius*radius-lateral2)/span2);
      const entry=Math.max(0,projection-halfChord),exit=projection+halfChord;
      if(entry>=1||exit<=0)continue;
      const top=terrainHeight(obstacle.z,obstacle.x)+(obstacle.height??6.5)+padding;
      if(!anticipate&&headY+(eye.y-headY)*entry>=top)continue;
      const fraction=Math.max(0,entry-.25/span);
      // Anticipate gently before the close safety envelope is reached. The
      // outer radius stays inside the original planted road clearance; the
      // player can feel the camera settle instead of hitting a zoom threshold.
      const blend=anticipate?1-THREE.MathUtils.smoothstep(Math.sqrt(distance2),obstacle.radius+2.8,neighbourhood):1;
      limit=Math.min(limit,1+(fraction-1)*blend);
    }
    return limit;
  }
  function update(state,obstacles=[],dt=0,{snap=false}={}) {
    const instant=snap||!initialized;
    if(instant)heading=state.heading;
    else heading+=Math.atan2(Math.sin(state.heading-heading),Math.cos(state.heading-heading))*(1-Math.exp(-3.8*Math.max(0,dt)));
    const sx=Math.sin(heading),sz=Math.cos(heading),ground=terrainHeight(state.z,state.x);
    wantedAim.set(state.x-sx*2.4,ground+3.1,state.z-sz*2.4);
    wantedEye.set(state.x+sx*11.5,ground+7.4,state.z+sz*11.5);
    // Conservative canopy/building cylinders protect the line of sight. These
    // are separate from the smaller trunk and wheel collision boundaries.
    const dx=wantedEye.x-wantedAim.x,dz=wantedEye.z-wantedAim.z,length2=dx*dx+dz*dz;
    let needed=0;
    for(const obstacle of obstacles){
      const radius=obstacle.radius+.65;
      const t=Math.max(0,Math.min(1,((obstacle.x-wantedAim.x)*dx+(obstacle.z-wantedAim.z)*dz)/length2));
      if(t<.2)continue;
      const lateral=Math.hypot(wantedAim.x+dx*t-obstacle.x,wantedAim.z+dz*t-obstacle.z);
      if(lateral>radius)continue;
      const entry=Math.max(.2,t-Math.sqrt(Math.max(0,radius*radius-lateral*lateral))/Math.sqrt(length2));
      const top=terrainHeight(obstacle.z,obstacle.x)+(obstacle.height??6.5)+.8;
      needed=Math.max(needed,(top-wantedAim.y)/entry+wantedAim.y-wantedEye.y);
    }
    const targetLift=Math.max(0,Math.min(17,needed));
    // Rise promptly to clear a foreground obstruction, settle more gently.
    lift=instant?targetLift:THREE.MathUtils.lerp(lift,targetLift,1-Math.exp(-(targetLift>lift?9:2.6)*Math.max(0,dt)));
    wantedEye.y=Math.max(wantedEye.y+lift,terrainHeight(wantedEye.z,wantedEye.x)+2.8);
    if(instant){aim.copy(wantedAim);eye.copy(wantedEye);}
    else{const ease=1-Math.exp(-6*Math.max(0,dt));aim.lerp(wantedAim,ease);eye.lerp(wantedEye,ease);}
    // Close grass exploration can put a canopy behind the rider after the
    // ordinary lift has reached its ceiling. Check the actual eased eye from
    // the rider's head, not only the point farther ahead used for composition.
    // Keep the full orbit intact so returning to open ground never accumulates
    // a shortened camera target. Only its rendered horizontal boom contracts.
    const headY=ground+RIDER_HEADROOM;
    const ex=eye.x-state.x,ez=eye.z-state.z,span2=ex*ex+ez*ez,span=Math.sqrt(span2);
    const safeBoom=clearBoom(state,obstacles,headY,ex,ez,span2,span,false);
    const targetBoom=Math.min(safeBoom,clearBoom(state,obstacles,headY,ex,ez,span2,span,true));
    boom=instant?targetBoom:Math.min(safeBoom,THREE.MathUtils.lerp(boom,targetBoom,1-Math.exp(-(targetBoom<boom?14:3)*Math.max(0,dt))));
    camera.position.set(state.x+ex*boom,eye.y,state.z+ez*boom);
    camera.up.set(0,1,0);camera.lookAt(aim);camera.updateMatrixWorld();initialized=true;
    return camera;
  }
  return {camera,update,reset(){initialized=false;},get target(){return aim;}};
}

export function ridingPickIsAllowed(point,player,{perspective=false}={}){
  return Number.isFinite(point.x)&&Number.isFinite(point.z)
    &&point.x>=WORLD_BOUNDS.minX&&point.x<=WORLD_BOUNDS.maxX
    &&point.z>=WORLD_BOUNDS.minZ&&point.z<=WORLD_BOUNDS.maxZ
    &&(!perspective||Math.hypot(point.x-player.x,point.z-player.z)<=65);
}

export function createCameraObstacles(world,garden,extraRoots=[]){
  const obstacles=[];
  for(const root of [...world.landmarks.roots.values(),...extraRoots]){
    const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    obstacles.push({x:center.x,z:center.z,radius:Math.max(size.x,size.z)/2,height:box.max.y});
  }
  for(const tree of garden?.nature.placements??[])if(tree.kind==='tree')obstacles.push({x:tree.x,z:tree.z,radius:tree.radius,height:tree.height});
  return obstacles;
}
