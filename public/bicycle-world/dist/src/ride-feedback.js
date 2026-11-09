import {BRIDGES,bridgeAt,riderAxles} from './layout.js';
import {bridgeSeams} from './bridge-surface.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const notices={
  structure:'A solid edge. Reverse a little, then steer around it.',
  water:'The river edge. Follow the path to a bridge.',
  boundary:'The edge of the world. Reverse and turn back toward the track.',
};
const seams=BRIDGES.map(bridge=>({bridge,positions:bridgeSeams(bridge)}));

/** Convert observed movement into restrained feedback; never change physics. */
export function createRideFeedback(){
  let previous=null,latched=false,contactOrigin=null,contactAge=0,deckAge=1;
  let contactPulse=0,brakeWeight=0,deckPulse=0;
  const snapshot=state=>({x:state.x,z:state.z,heading:state.heading,distance:state.distance,speed:state.speed,axles:riderAxles(state)});
  function reset(state){
    previous=state?snapshot(state):null;latched=Boolean(state?.contact?.blocked);contactOrigin=state?{x:state.x,z:state.z}:null;
    contactAge=0;deckAge=1;contactPulse=0;brakeWeight=0;deckPulse=0;
  }
  function update({state,input={},dt=1/60,reduced=false}){
    const delta=Number.isFinite(dt)?clamp(dt,0,.12):0;
    const current=snapshot(state);
    const currentBridge=bridgeAt(current.axles.front.x,current.axles.front.z)||bridgeAt(current.axles.rear.x,current.axles.rear.z);
    const surface=currentBridge?'bridge':'ground';
    let notice=null,contactEvent=false,deckEvent=false;
    if(!previous||!Number.isFinite(dt)||dt>.25||Math.hypot(state.x-previous.x,state.z-previous.z)>8*delta+.5||state.distance<previous.distance){
      reset(state);
      return {contactPulse:0,brakeWeight:0,deckPulse:0,notice,contactEvent,deckEvent,surface};
    }
    contactAge+=delta;deckAge+=delta;
    contactPulse*=Math.exp(-delta*12);deckPulse*=Math.exp(-delta*20);
    // Releasing a held pedal at the same obstruction is not a fresh collision.
    if(latched&&!state.contact?.blocked&&contactAge>.4&&contactOrigin&&Math.hypot(state.x-contactOrigin.x,state.z-contactOrigin.z)>.55)latched=false;
    if(state.contact?.blocked&&!latched){
      latched=true;contactOrigin={x:state.x,z:state.z};contactAge=0;
      notice=notices[state.contact.kind]||notices.structure;
      contactEvent=true;
      contactPulse=clamp(state.contact.impactSpeed/7.8,.2,1);
    }
    const moved=Math.max(0,state.distance-previous.distance);
    if(moved>1e-5&&delta>0&&deckAge>=.09){
      outer:for(const axle of ['front','rear']){
        const a=previous.axles[axle],b=current.axles[axle],dz=b.z-a.z;
        if(Math.abs(dz)<1e-7)continue;
        for(const {bridge,positions} of seams)for(const z of positions){
          const fraction=(z-a.z)/dz;
          // Half-open segment counts a joint once, in either travel direction.
          if(fraction<=1e-7||fraction>1)continue;
          const x=a.x+(b.x-a.x)*fraction;
          if(Math.abs(x-bridge.x)>bridge.width/2-.06)continue;
          deckEvent=true;deckAge=0;deckPulse=clamp(Math.abs(state.speed)/7.8,.12,.5);break outer;
        }
      }
    }
    const targetBrake=input.brake?clamp(Math.max(Math.abs(previous.speed),Math.abs(state.speed))/5,0,1):0;
    brakeWeight+=(targetBrake-brakeWeight)*(1-Math.exp(-delta*(targetBrake>brakeWeight?14:9)));
    previous=current;
    return {contactPulse:reduced?0:contactPulse,brakeWeight:reduced?0:brakeWeight,deckPulse:reduced?0:deckPulse,notice,contactEvent,deckEvent,surface};
  }
  return {update,reset};
}
