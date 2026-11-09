import {START,WORLD_BOUNDS,RIDER_RADIUS,RIDER_HALF_WHEELBASE,positionIsClear,terrainHeight,riderAxles} from './layout.js';

export {START};
export const MAX_SPEED=7.8;
export const BOOST_SPEED=11;
export const BICYCLE_WHEELBASE=RIDER_HALF_WHEELBASE*2;
/** Handlebar angle in radians; high-speed steering is deliberately less sharp. */
export function steeringAngle(steering,speed=0){
  const pace=Math.abs(speed);
  const sprintTaper=.12*clamp((pace-MAX_SPEED)/(BOOST_SPEED-MAX_SPEED),0,1);
  return clamp(steering,-1,1)*(1.15-.63*clamp(pace/MAX_SPEED,0,1)-sprintTaper);
}
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const damp=(current,target,rate,dt)=>current+(target-current)*(1-Math.exp(-rate*dt));
const MAX_FRAME=.12,MAX_STEP=1/120,SEPARATION_EPSILON=1e-7;

export function newState(){return {...START,speed:0,steering:0,distance:0,contact:{blocked:false,kind:null,impactSpeed:0}};}
const clearAt=(x,z,heading,colliders)=>positionIsClear({x,z,heading},colliders);

function contactKind(state){
  const {front,rear}=riderAxles(state);
  if([state,front,rear].some(p=>p.x<WORLD_BOUNDS.minX+RIDER_RADIUS||p.x>WORLD_BOUNDS.maxX-RIDER_RADIUS||p.z<WORLD_BOUNDS.minZ+RIDER_RADIUS||p.z>WORLD_BOUNDS.maxZ-RIDER_RADIUS))return 'boundary';
  return positionIsClear(state,[])?'structure':'water';
}

// Only used to recover an invalid/overlapping input position, never normal riding.
function recoverPosition(state,colliders){
  const originX=state.x,originZ=state.z;
  let nearest=null,nearestDistance=Infinity;
  function consider(x,z){const distance=Math.hypot(x-originX,z-originZ);if(distance<nearestDistance&&clearAt(x,z,state.heading,colliders)){nearest={x,z};nearestDistance=distance;}}
  for(const c of colliders){
    // Sample both side clearance and the full turning envelope. This recovery
    // path is only for a stale/invalid initial pose, never ordinary contact.
    for(const extra of[0,RIDER_HALF_WHEELBASE]){
      const radius=c.radius+RIDER_RADIUS+extra+SEPARATION_EPSILON;
      for(let i=0;i<48;i++){const angle=i*Math.PI/24;consider(c.x+Math.cos(angle)*radius,c.z+Math.sin(angle)*radius);}
    }
  }
  const extentX=Math.abs(Math.sin(state.heading))*RIDER_HALF_WHEELBASE+RIDER_RADIUS;
  const extentZ=Math.abs(Math.cos(state.heading))*RIDER_HALF_WHEELBASE+RIDER_RADIUS;
  consider(clamp(originX,WORLD_BOUNDS.minX+extentX,WORLD_BOUNDS.maxX-extentX),clamp(originZ,WORLD_BOUNDS.minZ+extentZ,WORLD_BOUNDS.maxZ-extentZ));
  if(!nearest){
    for(let radius=1;radius<=16&&!nearest;radius++)for(let i=0;i<32;i++){const angle=i*Math.PI/16;consider(originX+Math.cos(angle)*radius,originZ+Math.sin(angle)*radius);}
  }
  if(!nearest&&clearAt(START.x,START.z,state.heading,colliders))nearest=START;
  if(nearest){state.x=nearest.x;state.z=nearest.z;}
}

function constrainPosition(state,previousX,previousZ,previousHeading,colliders){
  if(clearAt(state.x,state.z,state.heading,colliders))return;
  const impactSpeed=Math.abs(state.speed);
  if(!state.contact.blocked||impactSpeed>state.contact.impactSpeed){state.contact.kind=contactKind(state);state.contact.impactSpeed=impactSpeed;}
  state.contact.blocked=true;
  state.speed=0;
  if(!clearAt(previousX,previousZ,previousHeading,colliders)){recoverPosition(state,colliders);return;}
  // Resolve the full bicycle pose, including a turn made while stationary.
  // Each bounded substep is short; retain the last safe fraction rather than
  // pushing the rider sideways or allowing either wheel through a plinth.
  const dx=state.x-previousX,dz=state.z-previousZ,dh=state.heading-previousHeading;
  let safe=0,blocked=1;
  for(let attempt=0;attempt<22;attempt++){
    const fraction=(safe+blocked)/2;
    if(clearAt(previousX+dx*fraction,previousZ+dz*fraction,previousHeading+dh*fraction,colliders))safe=fraction;
    else blocked=fraction;
  }
  state.x=previousX+dx*safe;state.z=previousZ+dz*safe;state.heading=previousHeading+dh*safe;
}

export function stepMotion(state,input,dt,colliders=[]){
  state.contact??={};state.contact.blocked=false;state.contact.kind=null;state.contact.impactSpeed=0;
  // Equal 1/120s slices give the same handling at 10, 30, 60 and 120 rendered FPS.
  // A long background pause is intentionally not simulated in full.
  dt=Number.isFinite(dt)?clamp(dt,0,MAX_FRAME):0;
  const steps=Math.max(1,Math.ceil(dt/MAX_STEP-1e-9)),step=dt/steps;
  const forward=Boolean(input.forward)&&!input.reverse&&!input.brake;
  const reverse=Boolean(input.reverse)&&!input.forward&&!input.brake;
  const boosting=Boolean(input.boost)&&forward;
  const forwardLimit=boosting?BOOST_SPEED:MAX_SPEED;
  const acceleration=forward?(boosting?8.2:6.6):reverse?-3.8:0;
  // Faster travel still needs a short, deliberate stop near a reader or bridge.
  // Reverse keeps its existing limit so backing away remains easy to judge.
  const braking=input.brake?20:((forward||reverse)?.28:4.5);
  const steering=clamp(Number.isFinite(input.turn)?input.turn:0,-1,1);
  for(let i=0;i<steps;i++){
    const oldX=state.x,oldZ=state.z,oldHeading=state.heading;
    const speedLimit=Number.isFinite(input.speedLimit)?clamp(input.speedLimit,0,forwardLimit):forwardLimit;
    if(Math.abs(state.speed)>speedLimit){state.speed=Math.sign(state.speed)*Math.max(speedLimit,Math.abs(state.speed)-(input.brake?0:8)*step);}
    else state.speed=clamp(state.speed+acceleration*step,-Math.min(1.8,speedLimit),speedLimit);
    state.speed=Math.sign(state.speed)*Math.max(0,Math.abs(state.speed)-braking*step);
    state.steering=damp(state.steering,steering,11,step);
    // The rear/front axle relationship creates the turn. At rest only the
    // handlebars move; the bicycle never rotates around its centre in place.
    const yaw=state.speed*Math.tan(steeringAngle(state.steering,state.speed))/BICYCLE_WHEELBASE*step;
    const middleHeading=state.heading+yaw/2;
    state.heading+=yaw;
    state.x-=Math.sin(middleHeading)*state.speed*step;
    state.z-=Math.cos(middleHeading)*state.speed*step;
    constrainPosition(state,oldX,oldZ,oldHeading,colliders);
    state.distance+=Math.hypot(state.x-oldX,state.z-oldZ);
  }
  return state;
}

export function elevation(z,x=0){return terrainHeight(z,x);}
export function targetInput(state,target,arrivalRadius=1.05){
  const dx=target.x-state.x,dz=target.z-state.z,distance=Math.hypot(dx,dz);
  const wanted=Math.atan2(-dx,-dz);
  const angle=Math.atan2(Math.sin(wanted-state.heading),Math.cos(wanted-state.heading));
  const reverse=Math.abs(angle)>Math.PI/2;
  const travelAngle=reverse?Math.atan2(Math.sin(angle-Math.PI),Math.cos(angle-Math.PI)):angle;
  return {forward:distance>arrivalRadius&&!reverse,reverse:distance>arrivalRadius&&reverse,brake:distance<=arrivalRadius,turn:clamp(travelAngle*2.4*(reverse?-1:1),-1,1),arrived:distance<=arrivalRadius,speedLimit:guidedSpeedLimit(state,target)};
}

/** The guided ride uses the manual top speed only when its next target is clear
 * ahead. Approach and turning limits keep the enlarged bicycle controllable. */
export function guidedSpeedLimit(state,target){
  const dx=target.x-state.x,dz=target.z-state.z;
  const distance=Math.hypot(dx,dz);
  const wanted=Math.atan2(-dx,-dz);
  const angle=Math.abs(Math.atan2(Math.sin(wanted-state.heading),Math.cos(wanted-state.heading)));
  return Math.min(MAX_SPEED,Math.max(.7,distance*1.8),MAX_SPEED/(1+angle*2.2));
}
