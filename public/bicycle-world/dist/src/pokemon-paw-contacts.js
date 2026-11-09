import * as THREE from 'three';

const clamp=value=>Math.max(0,Math.min(1,value));
const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};

/** Contact planning in an adapter's source units. The caller still owns bones
 * and IK. Grounded paws retain their world point through starting and stopping;
 * a swinging paw lands over time before becoming a supporting contact. */
export function createPawContacts(root,limbs,{stride,duty,landingTime=.18,lift=.06}={}){
  const inverse=new THREE.Matrix4(),worldRotation=new THREE.Quaternion(),inverseRotation=new THREE.Quaternion();
  const worldScale=new THREE.Vector3(),rootPosition=new THREE.Vector3(),lastRoot=new THREE.Vector3(),nominal=new THREE.Vector3(),end=new THREE.Vector3();
  let previousMoving=false,hasRoot=false,lastScale=0;
  for(const limb of limbs){
    Object.assign(limb,{contactWorld:new THREE.Vector3(),contactRotation:new THREE.Quaternion(),hasContact:false,world:new THREE.Vector3(),hasWorld:false,
      swingStart:new THREE.Vector3(),swingStartPhase:duty,swinging:false,landingStart:new THREE.Vector3(),landingEnd:new THREE.Vector3(),landingRotation:new THREE.Quaternion(),landingElapsed:0,landing:false,
      target:limb.target??new THREE.Vector3(),desiredRotation:limb.desiredRotation??new THREE.Quaternion(),stance:true});
  }
  function reset(){hasRoot=false;previousMoving=false;lastScale=0;for(const limb of limbs){limb.hasContact=false;limb.hasWorld=false;limb.swinging=false;limb.landing=false;limb.stance=true;}}
  function capture(limb,world){limb.contactWorld.copy(world);limb.contactRotation.copy(worldRotation).multiply(limb.footRotation);limb.hasContact=true;limb.swinging=false;limb.landing=false;}
  function contact(limb){limb.target.copy(limb.contactWorld).applyMatrix4(inverse);limb.world.copy(limb.contactWorld);limb.desiredRotation.copy(inverseRotation).multiply(limb.contactRotation);limb.stance=true;}
  function beginLanding(limb){
    limb.landingStart.copy(limb.world);nominal.copy(limb.world).applyMatrix4(inverse);nominal.y=limb.rest.y;
    limb.landingEnd.copy(nominal).applyMatrix4(root.matrixWorld);limb.landingRotation.copy(worldRotation).multiply(limb.footRotation);limb.landingElapsed=0;limb.landing=true;limb.swinging=false;
  }
  function land(limb,dt){
    limb.landingElapsed+=dt;const t=ease(limb.landingElapsed/landingTime);
    limb.world.copy(limb.landingStart).lerp(limb.landingEnd,t);limb.target.copy(limb.world).applyMatrix4(inverse);
    limb.desiredRotation.copy(limb.footRotation);limb.stance=false;
    if(t>=1){capture(limb,limb.landingEnd);contact(limb);}
  }
  return {reset,update({phase=0,dt=0,moving=false,quiet=false,amount=1}={}){
    root.updateWorldMatrix(true,false);inverse.copy(root.matrixWorld).invert();root.getWorldQuaternion(worldRotation);inverseRotation.copy(worldRotation).invert();root.getWorldScale(worldScale);root.getWorldPosition(rootPosition);
    const scale=Math.max(.0001,Math.abs(worldScale.y));
    if(hasRoot&&(Math.abs(scale-lastScale)>scale*.01||rootPosition.distanceTo(lastRoot)>scale))reset();
    lastRoot.copy(rootPosition);lastScale=scale;hasRoot=true;
    for(const limb of limbs){
      const p=((phase+limb.phaseOffset)%1+1)%1,stance=p<duty;
      nominal.copy(limb.rest);nominal.z+=stride*(.5-Math.min(p,duty)/duty);
      if(quiet){
        limb.target.copy(limb.rest);limb.desiredRotation.copy(limb.footRotation);limb.world.copy(limb.target).applyMatrix4(root.matrixWorld);limb.hasWorld=false;limb.hasContact=false;limb.swinging=false;limb.landing=false;limb.stance=true;continue;
      }
      if(!limb.hasWorld){
        limb.world.copy(moving&&stance?nominal:limb.rest).applyMatrix4(root.matrixWorld);limb.hasWorld=true;capture(limb,limb.world);
      }
      if(limb.landing){land(limb,dt);continue;}
      if(!moving){
        if(limb.hasContact)contact(limb);
        else{beginLanding(limb);land(limb,dt);}
        continue;
      }
      if(stance){
        if(!limb.hasContact){end.copy(nominal).applyMatrix4(root.matrixWorld);capture(limb,end);}
        contact(limb);
      }else{
        if(!limb.swinging){
          limb.swingStart.copy(limb.hasContact?limb.contactWorld:limb.world);limb.swingStartPhase=previousMoving?duty:p;limb.hasContact=false;limb.swinging=true;
        }
        const fraction=clamp((p-limb.swingStartPhase)/Math.max(.001,1-limb.swingStartPhase));
        end.copy(limb.rest);end.z+=stride*.5;end.applyMatrix4(root.matrixWorld);
        limb.world.copy(limb.swingStart).lerp(end,ease(fraction));limb.world.y+=Math.sin(Math.PI*fraction)*lift*(.45+.55*amount)*scale;
        limb.target.copy(limb.world).applyMatrix4(inverse);limb.desiredRotation.copy(limb.footRotation);limb.stance=false;
      }
    }
    previousMoving=moving&&!quiet;
  }};
}
