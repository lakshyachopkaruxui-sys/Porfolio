import {WORLD_BOUNDS} from './layout.js';

const centre={x:(WORLD_BOUNDS.minX+WORLD_BOUNDS.maxX)/2,z:(WORLD_BOUNDS.minZ+WORLD_BOUNDS.maxZ)/2};
const profiles={
  articuno:{seed:17.36,direction:1,phase:.25,speed:3.4,turnLimit:.32,bank:.15,height:[.4,.15],verticalPhase:.4},
  charizard:{seed:83.91,direction:-1,phase:2.45,speed:3,turnLimit:.44,bank:.24,height:[.3,.12],verticalPhase:2.1},
};
const routes=new Map();
const mod=(value,base)=>((value%base)+base)%base;
const hash=(index,seed)=>{const value=Math.sin(index*127.1+seed*311.7)*43758.5453123;return value-Math.floor(value);};
const choose6=[1,6,15,20,15,6,1],choose5=[1,5,10,10,5,1];
// Uniform quintic B-splines have C4 joins. Curvature-based cruise easing then
// retains continuous acceleration as well as position, tangent and bank.
const basis=Array.from({length:6},(_,index)=>{
  const offset=5-index,coefficients=new Float64Array(6);
  for(let k=0;k<=offset;k++)for(let power=0;power<=5;power++)coefficients[power]+=(k%2?-1:1)*choose6[k]*choose5[power]*(offset-k)**(5-power)/120;
  return coefficients;
});

/** A deterministic, unclosed itinerary: eight varying outer controls followed by
 * a central crossing. The next outer arc starts opposite the last, so crossings
 * remain flowing flyovers instead of a stop, reversal, or tight central orbit. */
function createRoute(profile){
  const points=new Map(),segments=new Map(),tables=new Map(),bins=32,tableLimit=128,baseStep=Math.PI/4,wave=Math.SQRT2,variation=baseStep*.1,sample={},integrationSample={};
  const radiusX=(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX)/2-10;
  const radiusZ=(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ)/2-9.1;
  let first=0,last=-1,minimum=0,maximum=0,previous=null;
  function control(index){
    if(points.has(index))return points.get(index);
    const block=Math.floor(index/9),slot=mod(index,9);
    let point;
    if(slot===8)point={x:(hash(block,profile.seed+3)-.5)*5,z:(hash(block,profile.seed+4)-.5)*5};
    else{
      // Closed-form sum also works for negative block indices. This keeps a
      // backward seek continuous without a restart or replaying random state.
      const waveSum=Math.sin(block*wave/2)*Math.sin(profile.seed+(block-1)*wave/2)/Math.sin(wave/2);
      const arcStart=block*(7*baseStep+Math.PI)+7*variation*waveSum;
      const step=baseStep+variation*Math.sin(block*wave+profile.seed);
      const angle=profile.phase+profile.direction*(arcStart+slot*step)+(hash(index,profile.seed+1)-.5)*.09;
      const radius=.91+.09*hash(index,profile.seed+2);
      point={x:Math.sin(angle)*radiusX*radius,z:Math.cos(angle)*radiusZ*radius};
    }
    points.set(index,point);if(points.size>256)points.delete(points.keys().next().value);return point;
  }
  function evaluate(segment,u,out={}){
    out.x=out.z=out.dx=out.dz=out.ax=out.az=out.jx=out.jz=0;
    for(let index=0;index<6;index++){
      const coefficients=basis[index],point=segment.points[index];let weight=coefficients[5],first=0,second=0,third=0;
      for(let power=4;power>=0;power--){third=third*u+3*second;second=second*u+2*first;first=first*u+weight;weight=weight*u+coefficients[power];}
      out.x+=point.x*weight;out.z+=point.z*weight;out.dx+=point.x*first;out.dz+=point.z*first;
      out.ax+=point.x*second;out.az+=point.z*second;out.jx+=point.x*third;out.jz+=point.z*third;
    }
    return out;
  }
  function travelDerivative(segment,u){
    const p=evaluate(segment,u,integrationSample),length=Math.hypot(p.dx,p.dz),curvature=(p.dz*p.ax-p.dx*p.az)/(length*length*length);
    return length/travelSpeed(curvature,profile);
  }
  function travelTime(segment,a,b){
    // Integrate seconds along the actual curve. Straight flyovers retain cruise
    // speed; tighter bends ease smoothly without a hover or a yaw clamp.
    const half=(b-a)/2,middle=(a+b)/2,offset=half*.7745966692414834;
    return half*(5/9*travelDerivative(segment,middle-offset)+8/9*travelDerivative(segment,middle)+5/9*travelDerivative(segment,middle+offset));
  }
  function build(index){
    const segment=segments.get(index)??{index};
    segment.points=Array.from({length:6},(_,offset)=>control(index-2+offset));segment.lengths=new Float64Array(bins+1);
    for(let i=1;i<=bins;i++)segment.lengths[i]=segment.lengths[i-1]+travelTime(segment,(i-1)/bins,i/bins);
    segment.length=segment.lengths[bins];segments.set(index,segment);tables.set(index,segment);
    // Retain only compact time boundaries for old legs. Rewinding rebuilds the
    // same deterministic table; hours of wandering cannot retain every array.
    if(tables.size>tableLimit){const oldest=tables.keys().next().value,retired=tables.get(oldest);retired.points=null;retired.lengths=null;tables.delete(oldest);}
    return segment;
  }
  function atTime(time){
    if(last<0){const segment=build(0);segment.start=0;maximum=segment.length;segment.end=maximum;last=0;}
    while(time>=maximum){const segment=build(++last);segment.start=maximum;maximum+=segment.length;segment.end=maximum;}
    while(time<minimum){const segment=build(--first);segment.end=minimum;minimum-=segment.length;segment.start=minimum;}
    let segment=previous??segments.get(0);
    while(time<segment.start)segment=segments.get(segment.index-1);
    while(time>=segment.end)segment=segments.get(segment.index+1);
    if(!segment.lengths)build(segment.index);else{tables.delete(segment.index);tables.set(segment.index,segment);}
    previous=segment;const local=time-segment.start;
    let low=0,high=bins;
    while(high-low>1){const middle=(low+high)>>1;if(segment.lengths[middle]<=local)low=middle;else high=middle;}
    const start=low/bins,end=high/bins;
    let u=start+(end-start)*(local-segment.lengths[low])/(segment.lengths[high]-segment.lengths[low]);
    for(let i=0;i<2;i++)u=Math.max(start,Math.min(end,u-(segment.lengths[low]+travelTime(segment,start,u)-local)/travelDerivative(segment,u)));
    return evaluate(segment,u,sample);
  }
  return {atTime,get diagnostics(){return {timelineLegs:segments.size,cachedTables:tables.size,tableLimit,lookupBytes:tables.size*(bins+1)*8,cachedPoints:points.size};}};
}

function travelSpeed(curvature,profile){
  const ratio=profile.speed*curvature/profile.turnLimit;
  return profile.speed/Math.pow(1+ratio**4,.25);
}

/** Absolute-time, varied full-map flight. Returned heading and turning come
 * from the actual C4 spline derivatives, not a lagged target or rotating rig. */
export function flyingPokemonMotion(spec,time,target={}){
  const profile=profiles[spec.id];if(!profile)throw new RangeError('Unsupported flying companion: '+spec.id);
  let route=routes.get(spec.id);if(!route){route=createRoute(profile);routes.set(spec.id,route);}
  const t=Number.isFinite(time)?time:0,p=route.atTime(t),length=Math.hypot(p.dx,p.dz);
  const cross=p.dz*p.ax-p.dx*p.az,curvature=cross/(length*length*length),speed=travelSpeed(curvature,profile),turnRate=speed*curvature;
  const curvatureDerivative=(p.dz*p.jx-p.dx*p.jz)/(length**3)-3*cross*(p.dx*p.ax+p.dz*p.az)/(length**5);
  const ratio=profile.speed*curvature/profile.turnLimit;
  const acceleration=-profile.speed*(profile.speed/profile.turnLimit)*ratio**3/Math.pow(1+ratio**4,1.25)*curvatureDerivative*speed/length;
  const phase=t*.11+profile.verticalPhase,slow=t*.047+profile.verticalPhase*1.7;
  const dy=profile.height[0]*.11*Math.cos(phase)+profile.height[1]*.047*Math.cos(slow);
  target.x=centre.x+p.x-(spec.x??spec.anchor?.x??centre.x);target.z=centre.z+p.z-(spec.z??spec.anchor?.z??centre.z);
  target.y=profile.height[0]*Math.sin(phase)+profile.height[1]*Math.sin(slow);
  target.heading=Math.atan2(p.dx,p.dz);target.turnRate=turnRate;
  target.bank=-profile.bank*Math.tanh(speed*turnRate/(9.81*profile.bank));
  target.pitch=-Math.atan2(dy,speed);target.speed=speed;target.acceleration=acceleration;target.moving=1;target.hop=0;
  return target;
}

/** Read-only QA metrics; never queried by the render loop. */
export function flightRouteDiagnostics(){return Object.fromEntries([...routes].map(([id,route])=>[id,route.diagnostics]));}
