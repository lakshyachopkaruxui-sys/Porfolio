import {HOP,TIMES} from './trajectory.js';

/** A C2 runway handoff: actual arrival pose, rolling tangent, then ramp lip. */
export function runUpPose(time,start,northbound){
 const u=Math.max(0,Math.min(1,time/TIMES.takeoff)),v=1-u;
 const direction=northbound?-1:1,endZ=northbound?HOP.start+HOP.end-HOP.launchStart:HOP.launchStart;
 const distance=Math.hypot(HOP.x-start.x,endZ-start.z),rampSpeed=(HOP.launch-HOP.launchStart)/(TIMES.air-TIMES.takeoff);
 const tail=rampSpeed*TIMES.takeoff/5;
 const xs=[start.x,start.x,start.x-Math.sin(start.heading)*distance*.24,HOP.x,HOP.x,HOP.x];
 const zs=[start.z,start.z,start.z-Math.cos(start.heading)*distance*.24,endZ-direction*2*tail,endZ-direction*tail,endZ];
 const weights=[v**5,5*u*v**4,10*u*u*v**3,10*u**3*v*v,5*u**4*v,u**5];
 let x=0,z=0,dx=0,dz=0;
 for(let i=0;i<6;i++){x+=xs[i]*weights[i];z+=zs[i]*weights[i];}
 const tangent=[v**4,4*u*v**3,6*u*u*v*v,4*u**3*v,u**4];
 for(let i=0;i<5;i++){dx+=(xs[i+1]-xs[i])*tangent[i]*5/TIMES.takeoff;dz+=(zs[i+1]-zs[i])*tangent[i]*5/TIMES.takeoff;}
 const heading=Math.hypot(dx,dz)<1e-8?start.heading:Math.atan2(-dx,-dz);
 return {x,z,heading,speed:Math.hypot(dx,dz)};
}

export function rampEntry(state){const northbound=Math.abs(state.z-HOP.end)<Math.abs(state.z-HOP.start);return {x:HOP.x,z:northbound?HOP.end:HOP.start,heading:northbound?0:Math.PI,northbound};}
export function isNearRamp(state){
 if(state.z>HOP.launchStart&&state.z<HOP.landingEnd)return false;
 const gate=rampEntry(state),deck=gate.northbound?HOP.landingEnd:HOP.launchStart;
 const nearest=Math.max(Math.min(gate.z,deck),Math.min(Math.max(gate.z,deck),state.z));
 return Math.hypot(state.x-gate.x,state.z-nearest)<4;
}
