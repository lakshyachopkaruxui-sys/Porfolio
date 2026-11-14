import * as THREE from 'three';
import {HOP,TIMES,orbitProgress} from './trajectory.js';
import {runUpPose,rampEntry,isNearRamp} from './run-up.js';
import {STUNTS,STUNT_LABELS,createStuntPicker,stuntTrajectory,advancePerformance,performanceRate,applyStuntPose} from './stunts.js';
import {createRampModel} from './ramp-model.js';
import {fitApproaches} from './approaches.js';
import {clearRampTree} from './planting.js';

export function createFullGardenHop({scene,world,garden,rider,state,notify,onFinish}){
 const model=createRampModel(scene),approaches=fitApproaches(scene),planting=clearRampTree(garden,world);
 // Remove the selected tree from camera/companion obstacle metadata as well.
 const index=garden.nature.placements.indexOf(planting.tree);if(index>=0)garden.nature.placements.splice(index,1);
 const oldUpdate=garden.nature.update;
 garden.nature.update=options=>{oldUpdate({...options,camera:undefined});if(options.camera)planting.culling.update(options.camera,options.sun);};
 const blockers=[{x:HOP.x,z:-58,radius:1.8,kind:'ramp'},{x:HOP.x,z:-44,radius:1.8,kind:'ramp'}];world.colliders.push(...blockers);
 const pivot=new THREE.Group();scene.add(pivot);
 let active=false,t=0,northbound=true,pose=null,reduced=false,returnBlend=0,inspectionPaused=false,traceCleared=false;
 const chooseStunt=createStuntPicker();let stunt='backflip';
 const aimOffset=new THREE.Vector3(),anchor=new THREE.Vector3(),normalEye=new THREE.Vector3(),orbitEye=new THREE.Vector3(),lastEye=new THREE.Vector3(),aim=new THREE.Vector3(),lastAim=new THREE.Vector3();
 let gate=null,departure=null;
 function entry(){return rampEntry(state);}
 function near(){return isNearRamp(state);}
 function detach(){scene.add(rider.group);pivot.rotation.set(0,0,0);}
 function start(calm=false,selected){
  if(active||!near())return false;
  reduced=calm;northbound=Math.abs(state.z-HOP.end)<Math.abs(state.z-HOP.start);
  departure={x:state.x,z:state.z,heading:state.heading};
  gate={x:state.x,z:state.z,heading:state.heading};
  stunt=STUNTS.includes(selected)?selected:chooseStunt();
  traceCleared=false;active=true;t=0;returnBlend=0;inspectionPaused=false;pivot.add(rider.group);
  notify(calm?'A steady river crossing. Escape returns to the ramp.':STUNT_LABELS[stunt]+'! Escape cancels; riding returns after landing.');return true;
 }
 function step(dt,calm=false){
  if(!active)return;
  if(calm&&!reduced){cancel();return;}
  t=advancePerformance(t,inspectionPaused?0:dt);
  pose=stuntTrajectory(t,{northbound,stunt,reduced});
  if(t<TIMES.takeoff&&departure)Object.assign(pose,runUpPose(t,departure,northbound));
  if(t>=TIMES.takeoff&&!traceCleared){world.setRoute(null);traceCleared=true;}
  Object.assign(state,{x:pose.x,z:pose.z,heading:pose.heading,speed:pose.speed*performanceRate(t),steering:0,contact:null});
  if(pose.done){active=false;detach();state.z=northbound?HOP.start:HOP.end;state.speed=0;returnBlend=reduced?0:.55;onFinish?.();notify('Landed. Keep riding, or turn around for another hop.');}
 }
 function prepareRider(){
  if(!active||!pose)return;
  // The shared contact solver expects a neutral parent. Flip only afterwards.
  pivot.position.set(pose.x,pose.pivotY,pose.z);pivot.rotation.set(0,0,0);
  rider.group.position.set(0,-HOP.pivot,0);rider.group.rotation.set(0,0,0);
 }
 function finishRider(){
  if(!active||!pose)return;
  pivot.rotation.set(0,pose.heading,0);pivot.rotateX(pose.pitch);pivot.rotateZ(pose.roll);pivot.updateMatrixWorld(true);
  rider.group.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
 }
 function updateCamera(camera,dt){
  if(active&&pose&&!reduced){
   normalEye.copy(camera.position);anchor.set(state.x,pose.pivotY,state.z);
   const base=Math.atan2(northbound&&stunt==='can-can'?-8:8,northbound?12:-12),angle=base+orbitProgress(t)*Math.PI*2;
   const radius=camera.aspect<1?15:12.8;
   orbitEye.set(state.x+Math.sin(angle)*radius,anchor.y+4.6,state.z+Math.cos(angle)*radius);
   const u=Math.min(1,t/TIMES.takeoff),weight=u*u*(3-2*u);
   camera.position.lerpVectors(normalEye,orbitEye,weight);aim.copy(anchor).add(aimOffset.set(0,1.3,northbound?-2:2));
   camera.up.set(0,1,0);camera.lookAt(aim);lastEye.copy(camera.position);lastAim.copy(aim);
  }else if(returnBlend>0){
   returnBlend=Math.max(0,returnBlend-dt);const w=returnBlend/.55;
   camera.getWorldDirection(aim);aim.multiplyScalar(12).add(camera.position);
   camera.position.lerp(lastEye,w*w);aim.lerp(lastAim,w*w);camera.lookAt(aim);
  }
 }
 function cancel(){if(!active)return;active=false;detach();Object.assign(state,gate,{speed:0,steering:0,contact:null});returnBlend=0;pose=null;world.setRoute(null);notify('Back at the ramp. The bridge route is always open.');onFinish?.();}
 return {get active(){return active;},get pose(){return pose;},get time(){return t;},get stunt(){return stunt;},get phase(){return active?pose?.phase||'Run-up':'riding';},near,entry,start,step,prepareRider,finishRider,updateCamera,cancel,
  modifyRiderPose(riderPose){if(active&&!reduced)applyStuntPose(riderPose,stunt,t);},
  dispose(){cancel();garden.nature.update=oldUpdate;model.dispose();approaches.dispose();pivot.removeFromParent();for(const b of blockers){const i=world.colliders.indexOf(b);if(i>=0)world.colliders.splice(i,1);}}};
}
