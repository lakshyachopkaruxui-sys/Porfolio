import * as THREE from 'three';
import {createCharizardColour} from './charizard-colour.js';
import {createArticunoPose,sampleArticunoStroke} from './articuno-pose.js';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const finite=value=>Number.isFinite(value)?value:0;
// The torso is pitched .84 radians in flight. Compensate the flap hinge so a
// power stroke moves vertically, rather than sweeping sideways around that pitch.
const dragonRollAxis=[0,Math.sin(.84),Math.cos(.84)];
const dragonFoldAxis=[0,Math.cos(1.26),-Math.sin(1.26)];
const dragonNeckPitch=[-.18,-.18,-.12];

/** Two different flight rhythms: short powered clusters and long held glides.
 * The faster downstroke and folded, slower return are intentionally unequal. */
export function sampleFlightStroke(id,time,target={}){
  if(id==='articuno')return sampleArticunoStroke(time,target);
  const bird=id==='articuno',period=bird?14:10.5,beatLength=bird?1.3:1.55,beats=bird?3:2;
  const local=((finite(time)%period)+period)%period,active=local<beatLength*beats;
  let roll=0,fold=0,phase=0;
  if(active){
    phase=(local%beatLength)/beatLength;
    if(phase<.16)roll=.33*smooth(phase/.16);
    else if(phase<.47)roll=THREE.MathUtils.lerp(.33,-.52,smooth((phase-.16)/.31));
    else{
      const recovery=(phase-.47)/.53;
      roll=THREE.MathUtils.lerp(-.52,0,smooth(recovery));
      fold=Math.sin(Math.PI*recovery);
    }
  }
  target.roll=roll;target.fold=fold;target.active=active;target.glide=!active;target.phase=phase;return target;
}

/** The hips are a stable flight pivot; a tail-tip bounding-box floor is not. */
export function getPokemonAnchor(id,model){
  if(id!=='articuno'&&id!=='charizard')return null;
  model.updateWorldMatrix(true,true);
  const hips=model.getObjectByName('Hips_04');
  return hips?model.worldToLocal(hips.getWorldPosition(new THREE.Vector3())):new THREE.Box3().setFromObject(model,true).getCenter(new THREE.Vector3());
}

/** Procedural motion preserves every rest transform and imported resource.
 * The two Charizard flame materials repair an exported shader omission: the
 * source tail textures are grayscale masks, but its GLB declares opaque PBR.
 * Reuse those original masks as alpha; never alter their bytes or source GLB. */
export function createPokemonPose(id,model){
  // Articuno is isolated here. Its legacy branches below are unreachable; the
  // pre-repair QA comparison imports a fixed snapshot, never this live module.
  if(id==='articuno')return createArticunoPose(model);
  model.updateWorldMatrix(true,true);
  const inverseModel=model.getWorldQuaternion(new THREE.Quaternion()).invert(),records=new Map();
  const delta=new THREE.Quaternion(),worldScale=new THREE.Vector3(),stroke={};
  let disposed=false,lastTime=null,swimDistance=0,colourEnabled=true;
  const colour=id==='charizard'?createCharizardColour(model):null;
  const motionState={style:id==='articuno'?'glide-and-flap':id==='charizard'?'powered-dragon-flight':'tail-driven-swim',glide:true,phase:0,effort:0};
  const flames=[];
  if(id==='charizard')model.traverse(mesh=>{
    if(!mesh.isMesh||Array.isArray(mesh.material))return;
    const core=mesh.name==='Object_9'&&mesh.material.name==='Material_15',shell=mesh.name==='Object_10'&&mesh.material.name==='Material_16';
    if(!core&&!shell)return;
    const original=mesh.material,material=new THREE.MeshBasicMaterial({name:core?'Charizard flame core repair':'Charizard flame envelope repair',color:core?'#fff1a0':'#ff8425',alphaMap:original.map,transparent:true,opacity:core?.98:.86,alphaTest:.06,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
    flames.push({mesh,original,material,core});
  });
  function joint(name,axis){
    const bone=model.getObjectByName(name);if(!bone?.isBone)return null;
    const key=name+':'+axis.join(',');if(records.has(key))return records.get(key);
    const relative=inverseModel.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
    const record={bone,rest:bone.quaternion.clone(),axis:new THREE.Vector3(...axis).applyQuaternion(relative.invert()).normalize()};
    records.set(key,record);return record;
  }
  const pose=(record,angle)=>{if(record)record.bone.quaternion.copy(record.rest).multiply(delta.setFromAxisAngle(record.axis,angle));};
  const append=(record,angle)=>{if(record)record.bone.quaternion.multiply(delta.setFromAxisAngle(record.axis,angle));};
  const parts=id==='articuno'?{
    chest:joint('Spine1_031',[1,0,0]),neck:joint('Neck_072',[1,0,0]),head:joint('Head_077',[0,1,0]),
    tail:Array.from({length:19},(_,i)=>joint('Tail'+(i+1)+'_'+String(44+i).padStart(3,'0'),[1,0,0])),
    tailSway:Array.from({length:18},(_,i)=>joint('Tail'+(i+2)+'_'+String(45+i).padStart(3,'0'),[0,1,0])),
    wings:[
      {side:1,shoulder:joint('LShoulder_065',[0,0,1]),elbow:joint('LForeArm1_067',[0,0,1]),fold:joint('LForeArm1_067',[0,1,0]),wrist:joint('LHand1_069',[0,0,1])},
      {side:-1,shoulder:joint('RShoulder_081',[0,0,1]),elbow:joint('RForeArm1_083',[0,0,1]),fold:joint('RForeArm1_083',[0,1,0]),wrist:joint('RHand1_085',[0,0,1])},
    ],legs:[
      {thigh:joint('LThigh_05',[1,0,0]),calf:joint('LLeg_06',[1,0,0]),foot:joint('LFoot_07',[1,0,0])},
      {thigh:joint('RThigh_024',[1,0,0]),calf:joint('RLeg_025',[1,0,0]),foot:joint('RFoot_026',[1,0,0])},
    ],
  }:id==='charizard'?{
    waist:joint('Waist_03',[1,0,0]),chest:joint('Spine1_030',[1,0,0]),
    neck:[joint('Neck1_060',[1,0,0]),joint('Neck2_061',[1,0,0]),joint('Neck3_062',[1,0,0])],head:joint('Head_063',[1,0,0]),headYaw:joint('Head_063',[0,1,0]),
    wings:[
      {side:1,pitch:joint('LFeeler1_032',[1,0,0]),roll:joint('LFeeler1_032',dragonRollAxis),fold:joint('LFeeler3_034',dragonFoldAxis),tip:joint('LFeeler5_036',dragonFoldAxis)},
      {side:-1,pitch:joint('RFeeler1_039',[1,0,0]),roll:joint('RFeeler1_039',dragonRollAxis),fold:joint('RFeeler3_041',dragonFoldAxis),tip:joint('RFeeler5_043',dragonFoldAxis)},
    ],arms:[
      {side:1,yaw:joint('LShoulder_047',[0,1,0]),roll:joint('LArm_048',[0,0,1]),elbow:joint('LForeArm_049',[1,0,0]),hand:joint('LHand_050',[1,0,0])},
      {side:-1,yaw:joint('RShoulder_068',[0,1,0]),roll:joint('RArm_069',[0,0,1]),elbow:joint('RForeArm_070',[1,0,0]),hand:joint('RHand_071',[1,0,0])},
    ],legs:[
      {thigh:joint('LThigh_05',[1,0,0]),calf:joint('LLeg_06',[1,0,0]),foot:joint('LFoot_07',[1,0,0])},
      {thigh:joint('RThigh_011',[1,0,0]),calf:joint('RLeg_012',[1,0,0]),foot:joint('RFoot_013',[1,0,0])},
    ],tail:Array.from({length:7},(_,i)=>joint('Tail'+(i+1)+'_'+String(17+i).padStart(3,'0'),[1,0,0])),
    tailSway:Array.from({length:7},(_,i)=>joint('Tail'+(i+1)+'_'+String(17+i).padStart(3,'0'),[0,1,0])),
  }:id==='vaporeon'?{
    roll:joint('Waist_03',[0,0,1]),spine:joint('Spine1_030',[0,1,0]),head:joint('Head_038',[0,1,0]),neck:joint('Neck_037',[1,0,0]),
    tail:Array.from({length:8},(_,i)=>joint('Tail'+(i+1)+'_'+String(17+i).padStart(3,'0'),[0,1,0])),
    fins:[joint('LTail_026',[0,1,0]),joint('RTail_028',[0,1,0])],ears:[joint('LEar1_043',[0,0,1]),joint('REar1_046',[0,0,1])],
    forelegs:[{upper:joint('LArm_033',[1,0,0]),lower:joint('LForeArm_034',[1,0,0]),hand:joint('LHand_035',[1,0,0])},{upper:joint('RArm_050',[1,0,0]),lower:joint('RForeArm_051',[1,0,0]),hand:joint('RHand_052',[1,0,0])}],
    hindlegs:[{upper:joint('LThigh_05',[1,0,0]),lower:joint('LLeg_06',[1,0,0]),foot:joint('LFoot_07',[1,0,0])},{upper:joint('RThigh_011',[1,0,0]),lower:joint('RLeg_012',[1,0,0]),foot:joint('RFoot_013',[1,0,0])}],
  }:null;
  const restore=()=>{for(const record of records.values())record.bone.quaternion.copy(record.rest);};
  const reset=()=>{restore();colour?.reset();for(const flame of flames)flame.mesh.material=flame.original;lastTime=null;swimDistance=0;motionState.phase=0;motionState.effort=0;motionState.glide=true;model.updateMatrixWorld(true);};
  return {update({time=0,dt,speed,distance,turnRate=0,reduced=false,lighter=false,moving=0,reaction=0}={}){
    if(disposed||!parts)return;
    if(colourEnabled)colour?.apply();else colour?.reset();
    restore();const t=finite(time),deltaTime=Number.isFinite(dt)?clamp(dt,0,.1):lastTime===null?0:clamp(t-lastTime,0,.1);lastTime=t;
    const quiet=reduced||lighter,motion=quiet?0:1,greet=quiet?0:clamp(finite(reaction)),turn=quiet?0:clamp(finite(turnRate),-.8,.8);
    for(const flame of flames){flame.mesh.material=flame.material;flame.material.opacity=(flame.core?.98:.86)+(quiet?0:Math.sin(t*5.1+(flame.core?0:.8))*.018);}
    if(id==='articuno'){
      sampleFlightStroke(id,t,stroke);if(quiet){stroke.roll=0;stroke.fold=0;stroke.glide=true;}
      motionState.glide=stroke.glide;motionState.phase=quiet?0:stroke.phase;
      pose(parts.chest,.35);pose(parts.neck,-.28);pose(parts.head,motion*Math.sin(t*.55)*.025+turn*.04+greet*.12);
      for(const wing of parts.wings){
        pose(wing.shoulder,wing.side*(-.32+stroke.roll)+turn*.025);
        pose(wing.elbow,-wing.side*stroke.fold*.05);append(wing.fold,wing.side*stroke.fold*.23);
        pose(wing.wrist,-wing.side*stroke.fold*.06);
      }
      pose(parts.tail[0],.72);
      for(let i=1;i<parts.tail.length;i++)pose(parts.tail[i],motion*Math.sin(t*.85-i*.24)*.009);
      for(let i=0;i<parts.tailSway.length;i++)append(parts.tailSway[i],motion*Math.sin(t*.65-i*.28)*.011-turn*.007);
      parts.legs.forEach(leg=>{pose(leg.thigh,2.0);pose(leg.calf,-2.6);pose(leg.foot,1.8);});
    }else if(id==='charizard'){
      sampleFlightStroke(id,t,stroke);if(quiet){stroke.roll=0;stroke.fold=0;stroke.glide=true;}
      motionState.glide=stroke.glide;motionState.phase=quiet?0:stroke.phase;
      pose(parts.waist,.8);pose(parts.chest,.04);
      parts.neck.forEach((neck,i)=>pose(neck,dragonNeckPitch[i]));pose(parts.head,-.36);append(parts.headYaw,turn*.055+greet*.1);
      for(const wing of parts.wings){
        pose(wing.roll,wing.side*stroke.roll+turn*.03);append(wing.pitch,.42);
        pose(wing.fold,wing.side*stroke.fold*.42);pose(wing.tip,wing.side*stroke.fold*.12);
      }
      parts.arms.forEach(arm=>{pose(arm.yaw,arm.side*.7);pose(arm.roll,-arm.side*.65);pose(arm.elbow,.7);pose(arm.hand,-.35);});
      parts.legs.forEach(leg=>{pose(leg.thigh,1.35);pose(leg.calf,-2.0);pose(leg.foot,.8);});
      for(let i=0;i<parts.tail.length;i++){
        pose(parts.tail[i],i===0?-.65:motion*Math.sin(t*.75-i*.5)*.018);
        append(parts.tailSway[i],motion*Math.sin(t*.6-i*.38)*.012-turn*.025*(1-i/8));
      }
    }else{
      model.getWorldScale(worldScale);const scale=Math.abs(worldScale.x)||1;
      const actualSpeed=Number.isFinite(speed)?Math.abs(speed):clamp(finite(moving))*.65*scale;
      const localSpeed=actualSpeed/scale,effort=quiet?0:clamp(localSpeed/1.15);
      if(!quiet){if(Number.isFinite(distance))swimDistance=Math.max(0,distance)/scale;else swimDistance+=localSpeed*deltaTime;}
      const phase=quiet?0:swimDistance/1.25*Math.PI*2;
      motionState.phase=phase;motionState.effort=effort;motionState.glide=effort<.08;
      pose(parts.roll,-turn*.1);pose(parts.spine,-Math.sin(phase)*effort*.025-turn*.025);
      pose(parts.head,motion*Math.sin(t*.55)*.025+turn*.055+greet*.15);pose(parts.neck,-.04-greet*.04);
      parts.tail.forEach((tail,i)=>pose(tail,Math.sin(phase-i*.52)*(.026+i*.0055)*effort-turn*.035));
      parts.fins.forEach((fin,i)=>pose(fin,(i?1:-1)*Math.sin(phase-3.8)*effort*.055));
      parts.ears.forEach((ear,i)=>pose(ear,(i?1:-1)*(motion*Math.sin(t*.7+i*.6)*.018+greet*.04)));
      parts.forelegs.forEach((leg,i)=>{
        const p=((phase/(Math.PI*2)+(i?.5:0))%1+1)%1;
        const power=p<.62,push=power?smooth(p/.62):1-smooth((p-.62)/.38),recovery=power?0:Math.sin(Math.PI*(p-.62)/.38);
        pose(leg.upper,.4+(push-.5)*effort*.7);pose(leg.lower,-.65-recovery*effort*.25);pose(leg.hand,.25+recovery*effort*.15);
      });
      parts.hindlegs.forEach((leg,i)=>{const paddle=Math.sin(phase+(i?Math.PI:0));pose(leg.upper,1.05+paddle*effort*.08);pose(leg.lower,-.5);pose(leg.foot,.2);});
    }
    model.updateMatrixWorld(true);
  },reset,setColourEnabled(enabled){colourEnabled=Boolean(enabled);if(!disposed){if(colourEnabled)colour?.apply();else colour?.reset();}},dispose(){if(disposed)return;reset();colour?.dispose();for(const flame of flames)flame.material.dispose();disposed=true;},get supported(){return Boolean(parts);},get motionState(){return {...motionState};}};
}
