const TAU=Math.PI*2;
const clamp=value=>Math.max(0,Math.min(1,value));

/** Local path timing, separate from a model's footfall/pose adapter. A creature
 * finishes each curved leg facing the tangent used for its next departure. */
export const GROUND_LOCOMOTION=Object.freeze({
  pikachu:Object.freeze({period:5.8,start:1,duration:2.1,steps:4,offset:.12,x:.70,z:.57,x2:.12,z2:-.05,burst:true}),
  bulbasaur:Object.freeze({period:8.8,start:1.2,duration:4.8,steps:4,offset:1.1,x:.69,z:.52,x2:.035,z2:.02,burst:false}),
  charmander:Object.freeze({period:7.2,start:1.1,duration:3.8,steps:4,offset:.6,x:.69,z:.56,x2:.04,z2:-.03,burst:false}),
});

function progress(q,burst){
  if(q<=0)return {position:0,velocity:0,acceleration:0,peak:burst?1.875:1.25};
  if(q>=1)return {position:1,velocity:0,acceleration:0,peak:burst?1.875:1.25};
  if(burst){
    // A quick scamper with zero speed and acceleration at both contacts.
    return {position:q*q*q*(10+q*(-15+6*q)),velocity:30*q*q*(1-q)*(1-q),acceleration:60*q*(1-q)*(1-2*q),peak:1.875};
  }
  // A longer measured walk: smooth acceleration, steady middle, smooth stop.
  const ramp=.2,area=1-ramp;
  if(q<ramp){
    const angle=Math.PI*q/ramp;
    return {position:(q-ramp/Math.PI*Math.sin(angle))/(2*area),velocity:(1-Math.cos(angle))/(2*area),acceleration:Math.PI*Math.sin(angle)/(2*ramp*area),peak:1/area};
  }
  if(q>1-ramp){
    const remaining=1-q,angle=Math.PI*remaining/ramp;
    return {position:1-(remaining-ramp/Math.PI*Math.sin(angle))/(2*area),velocity:(1-Math.cos(angle))/(2*area),acceleration:-Math.PI*Math.sin(angle)/(2*ramp*area),peak:1/area};
  }
  return {position:(q-ramp/2)/area,velocity:1/area,acceleration:0,peak:1/area};
}

/** Pure, frame-independent local movement. Curve hulls remain inside travel:
 * the main ellipse plus its small second harmonic has radius <= .82 travel.
 * New model behaviours should choose their own profile instead of inheriting
 * a species' footfall pattern from this path controller. */
export function groundPokemonMotion(spec,time){
  const profile=GROUND_LOCOMOTION[spec.id]??GROUND_LOCOMOTION.bulbasaur;
  const seconds=Number.isFinite(time)?time:0,travel=Number.isFinite(spec.travel)?Math.max(0,spec.travel):0;
  const lap=Math.floor(seconds/profile.period),local=seconds-lap*profile.period;
  const q=(local-profile.start)/profile.duration,ease=progress(q,profile.burst);
  const step=TAU/profile.steps,phase=profile.offset+(lap+ease.position)*step;
  const theta=((phase%TAU)+TAU)%TAU,sin=Math.sin(theta),cos=Math.cos(theta),sin2=Math.sin(2*theta),cos2=Math.cos(2*theta);
  const x=travel*(profile.x*cos+profile.x2*cos2),z=travel*(profile.z*sin+profile.z2*sin2);
  const dx=profile.x*-sin-2*profile.x2*sin2,dz=profile.z*cos+2*profile.z2*cos2;
  const ddx=profile.x*-cos-4*profile.x2*cos2,ddz=profile.z*-sin-4*profile.z2*sin2;
  const tangentLength=Math.hypot(dx,dz),rate=step*ease.velocity/profile.duration,rateChange=step*ease.acceleration/(profile.duration*profile.duration);
  const speed=travel*tangentLength*rate;
  const acceleration=rate||rateChange?travel*(tangentLength*rateChange+(dx*ddx+dz*ddz)/tangentLength*rate*rate):0;
  const turnRate=rate?(dz*ddx-dx*ddz)/(tangentLength*tangentLength)*rate:0;
  return {x,z,y:0,heading:Math.atan2(dx,dz),moving:travel?clamp(ease.velocity/ease.peak):0,hop:0,speed,acceleration,turnRate};
}
