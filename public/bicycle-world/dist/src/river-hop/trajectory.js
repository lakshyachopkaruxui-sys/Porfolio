export const HOP=Object.freeze({x:-20,width:3.6,start:-68,launchStart:-60,launch:-56,land:-46,landingEnd:-42,end:-34,lip:1.4,duration:6.7,pivot:1.7});
export const TIMES=Object.freeze({takeoff:1.6,air:2.25,landing:4.45,rollout:5.1,end:6.7});
const smooth=t=>t*t*(3-2*t),clamp=t=>Math.max(0,Math.min(1,t));
export function hopPose(seconds,{gentle=false}={}){
 const t=Math.max(0,Math.min(HOP.duration,seconds)),deckLength=HOP.launch-HOP.launchStart,rampSpeed=deckLength/(TIMES.air-TIMES.takeoff);let z,y,pitch,phase,speed;
 if(t<TIMES.takeoff){const T=TIMES.takeoff,u=t/T,D=HOP.launchStart-HOP.start,a=rampSpeed*T-2*D,b=3*D-rampSpeed*T;z=HOP.start+a*u**3+b*u*u;y=0;pitch=0;phase='Run-up';speed=(3*a*u*u+2*b*u)/T;}
 else if(t<TIMES.air){const u=(t-TIMES.takeoff)/(TIMES.air-TIMES.takeoff);z=HOP.launchStart+deckLength*u;y=HOP.lip*u**3;pitch=Math.atan(3*HOP.lip/deckLength*u*u);phase='Takeoff';speed=rampSpeed;}
 else if(t<TIMES.landing){const u=(t-TIMES.air)/(TIMES.landing-TIMES.air),a=Math.atan(3*HOP.lip/deckLength),p0=HOP.launch-HOP.pivot*Math.sin(a),p1=HOP.land+HOP.pivot*Math.sin(a);pitch=gentle?a*(1-2*smooth(u)):a+(2*Math.PI-2*a)*smooth(u);const pivotY=HOP.lip+HOP.pivot*Math.cos(a)+3.5*4*u*(1-u);return {x:HOP.x,z:p0+(p1-p0)*u,pivotY,pitch,phase:gentle?'River crossing':'Backflip',speed:(p1-p0)/(TIMES.landing-TIMES.air),air:true,done:false,t};}
 else if(t<TIMES.rollout){const u=(t-TIMES.landing)/(TIMES.rollout-TIMES.landing);z=HOP.land+deckLength*u;y=HOP.lip*(1-u)**3;pitch=2*Math.PI-Math.atan(3*HOP.lip/deckLength*(1-u)**2);phase='Landing';speed=rampSpeed;}
 else{const T=TIMES.end-TIMES.rollout,u=clamp((t-TIMES.rollout)/T),D=HOP.end-HOP.landingEnd,c=rampSpeed*T,b=3*D-2*c,a=c-2*D;z=HOP.landingEnd+a*u**3+b*u*u+c*u;y=0;pitch=2*Math.PI;phase=t===HOP.duration?'Landed - ready to ride':'Roll-out';speed=Math.max(0,(3*a*u*u+2*b*u+c)/T);}
 if(gentle)pitch=phase==='Takeoff'?pitch:phase==='Landing'?pitch-2*Math.PI:0;
 return {x:HOP.x,z:z-HOP.pivot*Math.sin(pitch),pivotY:y+HOP.pivot*Math.cos(pitch),pitch,phase,speed,air:false,done:t===HOP.duration,t};
}
export function advanceHop(time,dt){return Math.min(HOP.duration,time+Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0)));}
export function crossingPose(seconds,{northbound=true,gentle=false}={}){const p=hopPose(seconds,{gentle});return {...p,z:northbound?HOP.start+HOP.end-p.z:p.z,heading:northbound?0:Math.PI};}
export function orbitProgress(seconds){return smooth(clamp((seconds-TIMES.air)/(TIMES.landing-TIMES.air)));}
