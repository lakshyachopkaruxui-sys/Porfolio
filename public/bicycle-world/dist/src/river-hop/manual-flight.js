import {HOP} from './trajectory.js';
export const MANUAL_STUNTS=Object.freeze(['backflip','superman','tabletop']);
export const MIN_LAUNCH_SPEED=4.2;
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
// Match the existing 1.7-scale bicycle axle spacing.
export const HALF=.58*1.7;
export function rampHeight(x,z){
 if(Math.abs(x-HOP.x)>HOP.width/2)return 0;
 if(z>=HOP.launchStart&&z<=HOP.launch)return HOP.lip*((z-HOP.launchStart)/(HOP.launch-HOP.launchStart))**3;
 if(z>=HOP.land&&z<=HOP.landingEnd)return HOP.lip*((HOP.landingEnd-z)/(HOP.landingEnd-HOP.land))**3;
 return 0;
}
export function wheelPose(state){
 const dx=Math.sin(state.heading)*HALF,dz=Math.cos(state.heading)*HALF;
 const front=rampHeight(state.x-dx,state.z-dz),rear=rampHeight(state.x+dx,state.z+dz);
 return {height:(front+rear)/2,pitch:Math.atan2(front-rear,2*HALF)};
}
/** Swept front-wheel crossing: proximity alone never starts a jump. */
export function edgeCrossing(previous,state){
 for(const direction of [-1,1]){
  const lip=direction===1?HOP.launch:HOP.land;
  const a=previous.z-Math.cos(previous.heading)*HALF,b=state.z-Math.cos(state.heading)*HALF;
  if((a-lip)*direction>0||(b-lip)*direction<0||(b-a)*direction<=0)continue;
  const u=(lip-a)/(b-a);
  const ax=previous.x-Math.sin(previous.heading)*HALF,bx=state.x-Math.sin(state.heading)*HALF;
  const wheelX=ax+(bx-ax)*u;
  if(Math.abs(wheelX-HOP.x)<=HOP.width/2-.12)return {direction};
 }
 return null;
}
export function launchCandidate(previous,state){
 if(state.speed<MIN_LAUNCH_SPEED||state.contact?.blocked)return null;
 const edge=edgeCrossing(previous,state);if(!edge)return null;
 // Accept a normal steered approach across the usable deck, not a precision lane.
 if(-Math.cos(state.heading)*edge.direction<Math.cos(Math.PI/4))return null;
 return edge;
}
/** Mild ramp lane help only after the player releases steering. Never changes
 * position or speed; A/D, braking and reverse always keep their normal authority. */
export function rampSteeringAssist(state,input){
 if(!input.forward||input.reverse||input.brake||Math.abs(input.turn??0)>.05||state.speed<.5)return input;
 const direction=state.z<=HOP.launch?1:state.z>=HOP.land?-1:0;
 if(!direction||Math.abs(state.x-HOP.x)>3.4||-Math.cos(state.heading)*direction<.7)return input;
 const lip=direction===1?HOP.launch:HOP.land,distance=(lip-state.z)*direction;
 if(distance<0||distance>11)return input;
 const lookAhead=Math.max(2.5,Math.min(5,distance));
 const wanted=Math.atan2(state.x-HOP.x,-direction*lookAhead);
 const error=Math.atan2(Math.sin(wanted-state.heading),Math.cos(wanted-state.heading));
 return {...input,turn:Math.max(-.6,Math.min(.6,error*2.1))};
}
function hermite(a,b,va,vb,u,T){return (2*u**3-3*u*u+1)*a+(u**3-2*u*u+u)*T*va+(-2*u**3+3*u*u)*b+(u**3-u*u)*T*vb;}
/** Controlled game trajectory: actual horizontal speed, constant gravity,
 * and a calculated takeoff impulse to meet the opposite deck. Not a full bike simulator. */
export function createManualFlight(state,direction,stunt='superman'){
 const originX=state.x,initialHeading=state.heading;
 const speed=state.speed,heading=direction===-1?0:Math.PI;
 const destination={x:HOP.x,z:direction===1?HOP.land+HALF:HOP.launch-HALF,heading};
 const start=wheelPose(state),end=wheelPose(destination),pitch0=start.pitch,pitch1=end.pitch;
 // Local pitch is always forward-up at takeoff, regardless of world bank.
 const startZ=state.z+Math.cos(initialHeading)*HOP.pivot*Math.sin(pitch0);
 const startX=originX+Math.sin(initialHeading)*HOP.pivot*Math.sin(pitch0);
 const endZ=destination.z+direction*-HOP.pivot*Math.sin(pitch1);
 const T=Math.abs(endZ-startZ)/Math.max(MIN_LAUNCH_SPEED,speed);
 const y0=start.height+HOP.pivot*Math.cos(pitch0),y1=end.height+HOP.pivot*Math.cos(pitch1),gravity=Math.min(12,24/(T*T));
 const vy=(y1-y0)/T+gravity*T/2;
 const vx=-Math.sin(state.heading)*speed;
 return {duration:T,speed,destination,sample(seconds,reduced=false){
  const u=clamp(seconds/T),t=u*T,blend=ease(u),extension=ease((u-.1)/.2)*(1-ease((u-.64)/.22));
  const pitch=pitch0+(pitch1-pitch0)*blend+(!reduced&&stunt==='backflip'?2*Math.PI*blend:0);
  const pivotZ=startZ+(endZ-startZ)*u;
  const yaw=initialHeading+Math.atan2(Math.sin(heading-initialHeading),Math.cos(heading-initialHeading))*blend;
  const pivotX=hermite(startX,HOP.x,vx,0,u,T),x=pivotX-Math.sin(yaw)*HOP.pivot*Math.sin(pitch);
  return {x,z:pivotZ-Math.cos(yaw)*HOP.pivot*Math.sin(pitch),pivotX,pivotZ,pivotY:y0+vy*t-gravity*t*t/2,pitch,roll:!reduced&&stunt==='tabletop'?1.25*extension:0,heading:yaw,speed,air:true,done:u===1,u,phase:stunt};
 }};
}
