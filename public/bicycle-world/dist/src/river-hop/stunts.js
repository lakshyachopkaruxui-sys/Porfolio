import * as THREE from 'three';
import {TIMES,HOP,crossingPose} from './trajectory.js';

export const STUNTS=Object.freeze(['backflip','no-footer','can-can','superman','tabletop']);
export const STUNT_LABELS=Object.freeze({'backflip':'Backflip','no-footer':'No-footer','can-can':'One-foot can-can','superman':'Superman','tabletop':'Tabletop'});
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
export function airProgress(time){return clamp((time-TIMES.air)/(TIMES.landing-TIMES.air));}
export function extensionWeight(time){
 if(time<=TIMES.air||time>=TIMES.landing)return 0;
 const u=airProgress(time);
 return ease((u-.12)/.24)*(1-ease((u-.64)/.22));
}
export function performanceRate(time){
 if(time<TIMES.air||time>=TIMES.landing)return 1.4;
 const u=airProgress(time),apex=ease(u/.38)*(1-ease((u-.62)/.38));
 return 1.4-.68*apex;
}
export function advancePerformance(time,dt){
 let remaining=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
 while(remaining>1e-9){const h=Math.min(1/120,remaining),rate=performanceRate(time);time=Math.min(HOP.duration,time+h*performanceRate(time+h*rate/2));remaining-=h;}
 return time;
}
export function createStuntPicker(random=Math.random){
 let bag=[],last=null;
 return ()=>{
  if(!bag.length){
   bag=[...STUNTS];for(let i=bag.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[bag[i],bag[j]]=[bag[j],bag[i]];}
   if(bag[0]===last)[bag[0],bag[1]]=[bag[1],bag[0]];
  }
  last=bag.shift();return last;
 };
}
export function stuntTrajectory(time,{northbound=true,stunt='backflip',reduced=false}={}){
 const p=crossingPose(time,{northbound,gentle:reduced||stunt!=='backflip'});
 return {...p,phase:p.air&&!reduced?STUNT_LABELS[stunt]:p.phase,roll:reduced?0:(stunt==='can-can'?-.12:stunt==='tabletop'?1.05:0)*extensionWeight(time)};
}

const supermanHips=new THREE.Vector3(0,1.30,.52),supermanShoulders=new THREE.Vector3(0,1.34,-.04),supermanFoot=new THREE.Vector3();
const rollAxis=new THREE.Vector3(0,0,1),bootRotation=new THREE.Quaternion();
export function applyStuntPose(pose,stunt,time){
 const preload=ease((time-(TIMES.takeoff-.45))/.35)*(1-ease((time-TIMES.takeoff)/.4));
 const landing=ease((time-TIMES.landing)/.12)*(1-ease((time-(TIMES.landing+.18))/.35));
 pose.hips.y-=.07*(preload+landing);pose.shoulders.y-=.025*(preload+landing);
 const w=extensionWeight(time);if(w===0||stunt==='backflip')return;
 if(stunt==='superman'){
  // Keep both grips fixed while the chest pitches forward and both legs
  // extend behind the saddle. Recovery uses the same smooth contact blend.
  pose.hips.lerp(supermanHips,w);
  pose.shoulders.lerp(supermanShoulders,w);
  for(const foot of pose.feet){
   foot.contact.lerp(supermanFoot.set(foot.side*.16,1.35,1.19),w);
   foot.planted=0;
  }
  return;
 }
 if(stunt==='tabletop'){
  pose.hips.y+=.12*w;pose.shoulders.z-=.04*w;
  return;
 }
 // Pelvis rises slightly; shoulders stay close to the grips instead of
 // dragging the arms beyond reach. Both hands remain on their contact targets.
 pose.hips.y+=.055*w;pose.shoulders.y+=.012*w;pose.shoulders.z-=.025*w;
 for(const foot of pose.feet){
  if(stunt==='can-can'&&foot.side!==-1)continue;
  const can=stunt==='can-can';
  if(can){
   // Lift on the original side first, clear the top tube, then extend across.
   // Recovery retraces this arc rather than cutting through the frame.
   const lift=ease(w/.35),cross=ease((w-.25)/.75);
   foot.contact.x=THREE.MathUtils.lerp(foot.contact.x,.68,cross);
   foot.contact.y=THREE.MathUtils.lerp(foot.contact.y,1.22,lift)-.22*cross;
   foot.contact.z=THREE.MathUtils.lerp(foot.contact.z,-.20,lift)+.24*cross;
  }else{
   foot.contact.x=THREE.MathUtils.lerp(foot.contact.x,foot.side*.67,w);
   foot.contact.y=THREE.MathUtils.lerp(foot.contact.y,.88,w)+Math.sin(Math.PI*w)*.10;
   foot.contact.z=THREE.MathUtils.lerp(foot.contact.z,.16,w);
  }
  bootRotation.setFromAxisAngle(rollAxis,(can?-.20:-foot.side*.22)*w);foot.rotation.multiply(bootRotation);foot.planted=0;
 }
}
