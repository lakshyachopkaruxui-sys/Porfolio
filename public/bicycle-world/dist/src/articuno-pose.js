import * as THREE from 'three';

export const ARTICUNO_FLIGHT_PERIOD=9.4;
const BEAT=1.3,BEATS=3,ATTITUDE=.64;
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const finite=value=>Number.isFinite(value)?value:0;
// Preserve the pre-repair world's uniform size, independent of a new wing pose.
export const ARTICUNO_FIT_WIDTH=9.99810232144111;

/** Continuous-velocity folds and a faster power stroke, sampled in seconds. */
export function sampleArticunoStroke(time,target={},delay=0){
  const local=((finite(time)%ARTICUNO_FLIGHT_PERIOD)+ARTICUNO_FLIGHT_PERIOD)%ARTICUNO_FLIGHT_PERIOD-delay;
  const active=local>=0&&local<BEAT*BEATS;
  let phase=0,roll=0,fold=0,lift=0;
  if(active){
    phase=(local%BEAT)/BEAT;
    if(phase<.16)roll=.25*smooth(phase/.16);
    else if(phase<.48)roll=THREE.MathUtils.lerp(.25,-.38,smooth((phase-.16)/.32));
    else{
      const recovery=(phase-.48)/.52;
      roll=THREE.MathUtils.lerp(-.38,0,smooth(recovery));
      fold=Math.sin(Math.PI*smooth(recovery));
    }
    lift=Math.sin(Math.PI*smooth(phase));
  }
  target.phase=phase;target.roll=roll;target.fold=fold;target.lift=lift;
  target.active=active;target.glide=!active;return target;
}

/** Native Articuno skin, with a rigid hip-centred flight attitude instead of
 * extreme thigh/tail rotations. All borrowed transforms restore on disposal. */
export function createArticunoPose(model){
  model.updateWorldMatrix(true,true);
  const hips=model.getObjectByName('Hips_04');
  if(!hips?.isBone)return {supported:false,update(){},reset(){},dispose(){},get motionState(){return {style:'unsupported',glide:true,phase:0,effort:0};}};
  const anchor=model.worldToLocal(hips.getWorldPosition(new THREE.Vector3()));
  const inverse=model.getWorldQuaternion(new THREE.Quaternion()).invert();
  const rests=new Map(),delta=new THREE.Quaternion(),stroke={},elbowStroke={},tipStroke={};
  const rollAxis=[0,Math.sin(ATTITUDE),Math.cos(ATTITUDE)];
  const foldAxis=[0,Math.cos(ATTITUDE),-Math.sin(ATTITUDE)];
  const state={style:'native-feather-flight',glide:true,phase:0,effort:0};
  function joint(name,axis){
    const bone=model.getObjectByName(name);if(!bone?.isBone)return null;
    if(!rests.has(bone))rests.set(bone,bone.quaternion.clone());
    const relative=inverse.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
    return {bone,axis:new THREE.Vector3(...axis).applyQuaternion(relative.invert()).normalize()};
  }
  const wings=[['L',1,'065','067','069'],['R',-1,'081','083','085']].map(([side,sign,shoulder,elbow,wrist])=>({
    sign,shoulder:joint(`${side}Shoulder_${shoulder}`,rollAxis),
    elbow:joint(`${side}ForeArm1_${elbow}`,rollAxis),fold:joint(`${side}ForeArm1_${elbow}`,foldAxis),
    wrist:joint(`${side}Hand1_${wrist}`,rollAxis),
  }));
  const neck=joint('Neck_072',[1,0,0]),head=joint('Head_077',foldAxis);
  const legs=[['L','05','06','07'],['R','024','025','026']].map(([side,a,b,c])=>({
    thigh:joint(`${side}Thigh_${a}`,[1,0,0]),calf:joint(`${side}Leg_${b}`,[1,0,0]),foot:joint(`${side}Foot_${c}`,[1,0,0]),
  }));
  const tail=Array.from({length:19},(_,i)=>({
    pitch:joint(`Tail${i+1}_${String(44+i).padStart(3,'0')}`,[1,0,0]),
    yaw:joint(`Tail${i+1}_${String(44+i).padStart(3,'0')}`,foldAxis),
  }));
  const children=model.children.map(child=>({child,position:child.position.clone()}));
  const attitude=new THREE.Group();attitude.name='Articuno local flight attitude';attitude.position.copy(anchor);model.add(attitude);
  for(const {child}of children){attitude.add(child);child.position.sub(anchor);}
  const turn=(record,angle)=>{if(record)record.bone.quaternion.multiply(delta.setFromAxisAngle(record.axis,angle));};
  const restore=()=>{for(const [bone,q]of rests)bone.quaternion.copy(q);};
  let disposed=false;
  function reset(){
    restore();attitude.quaternion.identity();attitude.position.copy(anchor);
    state.glide=true;state.phase=0;state.effort=0;model.updateMatrixWorld(true);
  }
  return {
    supported:true,anchor:anchor.clone(),fitWidth:ARTICUNO_FIT_WIDTH,
    update({time=0,turnRate=0,reaction=0,reduced=false,lighter=false}={}){
      if(disposed)return;
      restore();const t=finite(time),quiet=reduced||lighter;
      const bend=quiet?0:clamp(finite(turnRate),-.8,.8),greet=quiet?0:clamp(finite(reaction));
      sampleArticunoStroke(quiet?6:t,stroke);
      sampleArticunoStroke(quiet?6:t,elbowStroke,.045);
      sampleArticunoStroke(quiet?6:t,tipStroke,.085);
      const flex=quiet?0:Math.sin(t*.65)*.008;
      const tipFlex=quiet?0:Math.sin(t*.72-.5)*.018;
      attitude.rotation.set(ATTITUDE+(quiet?0:stroke.lift*.016),0,0);
      attitude.position.copy(anchor);attitude.position.y+=quiet?0:stroke.lift*.085;
      turn(neck,-.08-(quiet?0:stroke.lift*.008));
      turn(head,(quiet?0:Math.sin(t*.47)*.012)+bend*.035+greet*.055);
      for(const wing of wings){
        turn(wing.shoulder,wing.sign*(-.30+stroke.roll+flex)+bend*.015);
        turn(wing.elbow,wing.sign*(elbowStroke.roll*.10-elbowStroke.fold*.055));
        turn(wing.fold,wing.sign*elbowStroke.fold*.13);
        turn(wing.wrist,wing.sign*(tipStroke.roll*.12-tipStroke.fold*.04+flex*.8+tipFlex));
      }
      // Fold at the knee/ankle instead of hauling thigh-weighted belly vertices
      // through the former 2-radian hip rotation. Toes trail behind the ankles.
      for(const leg of legs){turn(leg.thigh,.10);turn(leg.calf,-2.05);turn(leg.foot,-1.20);}
      for(let i=0;i<tail.length;i++){
        const weight=i===0?.15:1;
        turn(tail[i].pitch,quiet?0:Math.sin(t*.85-i*.24)*(.006+i*.0005)*weight);
        turn(tail[i].yaw,quiet?0:(Math.sin(t*.65-i*.22)*(.005+i*.0005)-bend*.01*(i/18))*weight);
      }
      state.glide=stroke.glide;state.phase=quiet?0:stroke.phase;state.effort=quiet?0:stroke.lift;
      model.updateMatrixWorld(true);
    },reset,
    dispose(){
      if(disposed)return;reset();disposed=true;
      for(const {child,position}of children){model.add(child);child.position.copy(position);}
      attitude.removeFromParent();model.updateMatrixWorld(true);
    },
    get motionState(){return {...state};},
  };
}
