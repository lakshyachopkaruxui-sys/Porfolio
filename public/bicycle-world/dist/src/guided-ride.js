import {clamp,MAX_SPEED,BOOST_SPEED,steeringAngle,BICYCLE_WHEELBASE,stepMotion} from './motion.js';
import {positionIsClear,STRUCTURE_COLLIDERS} from './layout.js';
import {pointOnRoad,planRoute} from './navigation.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const MIN_GUIDED_RADIUS=2.2,MAX_GUIDED_YAW=.9,TURNAROUND_SPEED=2;
// A traced route needs a useful rolling pace through its joins. Its tracking
// budget is separate from the deliberately slower parking/turnaround budget.
const CRUISING_CORNER_YAW=1.2,CURVATURE_SPEED_FALLOFF=2.3;
const ROAD_CORNER_YAW=1,ROAD_CURVATURE_SPEED_FALLOFF=2.6;
function boundedTurn(angle,speed,yawLimit=MAX_GUIDED_YAW){
  const maxAngle=Math.min(Math.atan(BICYCLE_WHEELBASE/MIN_GUIDED_RADIUS),Math.atan(BICYCLE_WHEELBASE*yawLimit/Math.max(.1,Math.abs(speed))));
  return clamp(angle,-maxAngle,maxAngle)/steeringAngle(1,speed);
}

/** Find a short, clearance-checked parking correction instead of circling a
 * point inside the ordinary turning circle. Search stays deliberately small. */
function* closeCorrection(start,destination,colliders,preferPaths){
  let beam=[{state:{...start,contact:{...start.contact}},steps:[],yaw:0,switches:0}];
  for(let depth=0;depth<7;depth++){
    const next=[],solutions=[];
    for(const node of beam)for(const gear of[1,-1])for(const side of[-1,0,1]){
      yield;
      const previous=node.steps.at(-1)?.gear;
      const switches=node.switches+(previous&&previous!==gear?1:0);
      if(switches>2)continue;
      const trial={...node.state,contact:{...node.state.contact}};
      let clear=true;
      for(let frame=0;frame<90&&trial.speed*gear<-.025;frame++){
        stepMotion(trial,{brake:true,turn:0},1/60,colliders);
        if(trial.contact.blocked||(preferPaths&&!pointOnRoad(trial,.9))){clear=false;break;}
      }
      const initialDistance=trial.distance,initialHeading=trial.heading;
      for(let frame=0;clear&&frame<120&&trial.distance-initialDistance<1.2;frame++){
        stepMotion(trial,{forward:gear>0,reverse:gear<0,turn:boundedTurn(side,trial.speed),speedLimit:1.2},1/60,colliders);
        if(trial.contact.blocked||!positionIsClear(trial,colliders)||(preferPaths&&!pointOnRoad(trial,.9))){clear=false;break;}
        if(distance(trial,destination)<.68)break;
      }
      if(!clear)continue;
      const yaw=node.yaw+Math.abs(trial.heading-initialHeading);
      if(yaw>Math.PI*1.1)continue;
      const steps=[...node.steps,{gear,side,travel:trial.distance-initialDistance}];
      const candidate={state:trial,steps,yaw,switches,score:distance(trial,destination)+.2*(trial.distance-start.distance)+.3*yaw+.4*switches};
      next.push(candidate);if(distance(trial,destination)<.68)solutions.push(candidate);
    }
    if(solutions.length)return solutions.sort((a,b)=>a.score-b.score)[0].steps;
    beam=next.sort((a,b)=>a.score-b.score).slice(0,32);
    if(!beam.length)break;
  }
  return null;
}

/** Continuous path tracking. Waypoints shape a route; they are not stop signs. */
export function createGuidedRide(start,waypoints,colliders=STRUCTURE_COLLIDERS,{preferPaths=false}={}){
  let points=[{x:start.x,z:start.z},...waypoints.map(p=>({x:p.x,z:p.z}))];
  let lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+distance(points[i-1],points[i]));
  let total=lengths.at(-1);const destination=points.at(-1);
  let progress=0,done=false,blocked=false,gear=null,maneuver=null,turnCheck=0,contactTime=0;
  const first=points[1]||destination;
  const departureAngle=angleDifference(Math.atan2(start.x-first.x,start.z-first.z),start.heading);
  let initialBrake=Math.abs(start.speed)>.3&&(distance(start,destination)<Math.max(3.5,start.speed*start.speed/40+2.5)||Math.abs(departureAngle)>Math.PI*.30);
  let correction=null,correctionDistance=null,correctionAttempted=false,correctionSearch=null;
  function rebase(state){
    const route=planRoute(state,destination,colliders,{preferPaths});if(!route)return;
    points=[{x:state.x,z:state.z},...route];lengths=[0];
    for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+distance(points[i-1],points[i]));
    total=lengths.at(-1);progress=0;
  }
  function sample(at){
    at=clamp(at,0,total);
    let index=1;while(index<points.length-1&&lengths[index]<at)index++;
    const a=points[index-1],b=points[index],span=lengths[index]-lengths[index-1],t=span?(at-lengths[index-1])/span:0;
    return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
  }
  function project(state){
    let best=Infinity,next=progress;
    for(let i=1;i<points.length;i++){
      if(lengths[i]<progress-.5||lengths[i-1]>progress+10)continue;
      const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,span=lengths[i]-lengths[i-1];
      const t=span?clamp(((state.x-a.x)*dx+(state.z-a.z)*dz)/(span*span),0,1):0;
      const error=Math.hypot(state.x-a.x-dx*t,state.z-a.z-dz*t),at=lengths[i-1]+span*t;
      if(error<best&&at>=progress-.3){best=error;next=at;}
    }
    progress=Math.max(progress,next);
  }
  function update(state,dt=1/60,{boost=false}={}){
    if(done||blocked)return {brake:true,arrived:done,blocked};
    contactTime=state.contact?.blocked?contactTime+Math.min(Math.max(dt,0),.12):0;
    if(contactTime>1.2){blocked=true;return {brake:true,arrived:false,blocked:true};}
    if(!maneuver&&!correction)project(state);
    const remaining=distance(state,destination);
    if(total-progress<2&&remaining<=.9){
      done=Math.abs(state.speed)<.03;
      return {brake:true,arrived:done};
    }
    // A nearby click is a request to stop nearby, not to orbit an overshot
    // point. Settle cruising momentum before choosing the short correction.
    if(initialBrake){
      if(Math.abs(state.speed)>.025)return {brake:true,turn:0,arrived:false};
      initialBrake=false;gear=null;rebase(state);
    }
    if(correctionSearch){
      // Spread the bounded candidate search over frames. A close click should
      // never stall rendering while the bicycle is already safely stopped.
      for(let attempt=0;attempt<24;attempt++){
        const result=correctionSearch.next();
        if(!result.done)continue;
        correctionSearch=null;correction=result.value;
        if(!correction){blocked=true;return {brake:true,blocked:true,arrived:false};}
        break;
      }
      if(correctionSearch)return {brake:true,turn:0,arrived:false};
    }
    // Ground-click routes use sharper visibility-graph joins than road routes.
    // Look slightly farther along those joins during forward cruising, while
    // keeping the original close-arrival and manoeuvre target distances.
    const groundCruiseBlend=gear>0&&!maneuver&&!preferPaths?clamp((remaining-4)/4,0,1):0;
    const lookahead=clamp(1.8+Math.abs(state.speed)*(.20+.06*groundCruiseBlend),1.8,3.3+.9*groundCruiseBlend);
    const target=sample(progress+lookahead),dx=target.x-state.x,dz=target.z-state.z;
    const wanted=Math.atan2(-dx,-dz),angle=angleDifference(wanted,state.heading);
    if(!correctionAttempted&&!maneuver&&remaining<4&&Math.abs(angle)>Math.PI*.36){
      if(Math.abs(state.speed)>.025||Math.abs(state.steering)>.01)return {brake:true,turn:0,arrived:false};
      correctionAttempted=true;
      correctionSearch=closeCorrection(state,destination,colliders,preferPaths);
      return {brake:true,turn:0,arrived:false};
    }
    if(correction){
      const step=correction[0];
      if(!step){correction=null;rebase(state);gear=null;return {brake:true,arrived:false};}
      if(state.speed*step.gear<-.025){correctionDistance=null;return {brake:true,turn:0,arrived:false};}
      if(correctionDistance===null)correctionDistance=state.distance;
      if(state.distance-correctionDistance>=step.travel){correction.shift();correctionDistance=null;return update(state,0,{boost});}
      return {forward:step.gear>0,reverse:step.gear<0,turn:boundedTurn(step.side,state.speed),turnIntent:step.side,speedLimit:1.2,arrived:false};
    }
    if(gear===null){
      gear=Math.abs(angle)>Math.PI*.57?-1:1;
      if(gear>0&&Math.abs(angle)>Math.PI/3&&Math.abs(state.speed)<.03){
        const trial={...state,contact:{...state.contact}},initialDistance=state.distance;
        for(let frame=0;frame<120&&trial.distance-initialDistance<2;frame++){
          const a=angleDifference(Math.atan2(trial.x-target.x,trial.z-target.z),trial.heading);
          const steer=Math.atan(BICYCLE_WHEELBASE*2*Math.sin(a)/Math.max(1,distance(trial,target)));
          stepMotion(trial,{forward:true,turn:boundedTurn(steer,trial.speed),speedLimit:TURNAROUND_SPEED},1/60,colliders);
          if(trial.contact.blocked||(preferPaths&&!pointOnRoad(trial,.9))){gear=-1;break;}
        }
      }
    }
    // Reverse input is not an emergency brake. Stop the existing momentum
    // first when a click requests the opposite direction of travel.
    if(!maneuver&&state.speed*gear<-.025)return {brake:true,turn:state.steering,arrived:false};
    turnCheck-=dt;
    if(gear<0&&!maneuver&&remaining>6&&turnCheck<=0){
      turnCheck=.3;
      const candidates=[];
      // Validate the complete low-speed arc before leaving a narrow spur.
      // This is the same steering/clearance simulation used by the live ride.
      for(const side of[-1,1]){
        const trial={...state,contact:{...state.contact}};let clear=true,frames=0;
        // A new click can arrive at cruising speed. Include the real stopping
        // distance and residual steering before validating the rolling arc.
        for(let braking=0;braking<90&&Math.abs(trial.speed)>.025;braking++){
          stepMotion(trial,{brake:true,turn:state.steering},1/60,colliders);
          if(trial.contact.blocked||!positionIsClear(trial,colliders)||(preferPaths&&!pointOnRoad(trial,.9))){clear=false;break;}
        }
        if(!clear)continue;
        const needed=side>0?((wanted-trial.heading)%(Math.PI*2)+Math.PI*2)%(Math.PI*2):((trial.heading-wanted)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
        if(needed>Math.PI*1.25)continue;
        const finish=trial.heading+side*needed;
        for(;frames<600;frames++){
          stepMotion(trial,{forward:true,turn:boundedTurn(side,trial.speed),speedLimit:TURNAROUND_SPEED},1/60,colliders);
          if(trial.contact.blocked||!positionIsClear(trial,colliders)||(preferPaths&&!pointOnRoad(trial,.9))){clear=false;break;}
          if(side*(trial.heading-finish)>=-.035)break;
        }
        if(clear&&frames<600)candidates.push({side,finish,frames});
      }
      candidates.sort((a,b)=>a.frames-b.frames);
      if(candidates.length)maneuver={...candidates[0],phase:'brake'};
    }
    if(maneuver){
      if(maneuver.phase==='brake'){
        if(Math.abs(state.speed)>.025)return {brake:true,turn:state.steering,arrived:false};
        maneuver.phase='turn';
      }
      if(maneuver.side*(state.heading-maneuver.finish)<-.045)return {forward:true,turn:boundedTurn(maneuver.side,state.speed),turnIntent:maneuver.side,speedLimit:TURNAROUND_SPEED,arrived:false};
      maneuver=null;gear=1;rebase(state);
      return {forward:true,turn:0,speedLimit:TURNAROUND_SPEED,arrived:false};
    }
    const travelAngle=angleDifference(wanted,state.heading+(gear<0?Math.PI:0));
    const curvature=2*Math.sin(travelAngle)/Math.max(1,distance(state,target));
    const desiredSteer=Math.atan(BICYCLE_WHEELBASE*curvature)*(gear<0?-1:1);
    const turn=preferPaths?clamp(desiredSteer/steeringAngle(1,state.speed),-1,1):boundedTurn(desiredSteer,state.speed,gear>0?CRUISING_CORNER_YAW:MAX_GUIDED_YAW);
    const cornerYaw=gear>0?(preferPaths?ROAD_CORNER_YAW:CRUISING_CORNER_YAW):MAX_GUIDED_YAW;
    const curvatureFalloff=gear>0?(preferPaths?ROAD_CURVATURE_SPEED_FALLOFF:CURVATURE_SPEED_FALLOFF):4;
    // Shift extends clear forward stretches. Corner and arrival limits retain
    // their ordinary budgets, so boosting never skips a careful manoeuvre.
    const cruise=boost&&gear>0?BOOST_SPEED:MAX_SPEED;
    const speedLimit=Math.min(gear<0?1.8:cruise,Math.max(.65,Math.sqrt(Math.max(0,remaining-.65)*6)),Math.max(1.2,cornerYaw/Math.max(.01,Math.abs(curvature))),Math.max(1.2,cruise/(1+Math.abs(curvature)*curvatureFalloff)));
    // The rider can look toward the next bend before the wheel begins following
    // it. This cue does not alter speed, steering or the route itself.
    const ahead=sample(progress+lookahead+Math.max(1.2,Math.abs(state.speed)*.4));
    const tangentLength=distance(target,ahead);
    const tangent=tangentLength>.05?Math.atan2(target.x-ahead.x,target.z-ahead.z):wanted;
    const upcoming=clamp(angleDifference(tangent,state.heading)*1.8,-1,1);
    const turnIntent=gear>0&&Math.abs(upcoming)>.16?upcoming:turn;
    return {forward:gear>0,reverse:gear<0,boost:boost&&gear>0,turn,turnIntent,speedLimit,brake:false,arrived:false};
  }
  return {update,points:points.slice(1),get remaining(){return Math.max(0,total-progress);},get done(){return done;},get blocked(){return blocked;}};
}

