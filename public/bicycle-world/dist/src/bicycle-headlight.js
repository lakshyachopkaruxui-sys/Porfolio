import * as THREE from 'three';
import {createRiderAccessoryPicking} from './rider-accessory-picking.js';

const FADE_SECONDS=.18,MAX_STEP=.12;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smooth=value=>value*value*(3-2*value);

/** One non-shadowing lamp, mounted to the existing steering assembly.
 * The light stays present at zero intensity when off, preserving shader counts.
 * The caller owns keyboard/HTML controls and scene visibility. */
export function createBicycleHeadlight(riderRoot,{enabled:initialEnabled=false}={}){
  const lamp=riderRoot?.getObjectByName?.('Bicycle headlight');
  if(!lamp?.isMesh||!lamp.parent||!lamp.material?.isMeshStandardMaterial)
    throw new TypeError('Bicycle headlight needs the rider’s existing lamp mesh.');
  const mount=lamp.parent,originalMaterial=lamp.material;
  const hadMarker=Object.hasOwn(lamp.userData,'bicycleLight'),originalMarker=lamp.userData.bicycleLight;
  const material=originalMaterial.clone();
  material.name='Bicycle headlight lens';
  material.emissive.set('#fff0c7');material.emissiveIntensity=0;
  lamp.material=material;lamp.userData.bicycleLight=true;

  const light=new THREE.SpotLight('#fff0c7',0,18,.38,.7,2);
  light.name='Bicycle headlight beam';light.castShadow=false;
  light.position.set(0,.05,-.174);
  const target=new THREE.Object3D();
  target.name='Bicycle headlight aim';target.position.set(0,-.96,-4.4);
  light.target=target;mount.add(light,target);
  const pickLamp=createRiderAccessoryPicking(lamp,lamp,{pixelRadius:22});
  let enabled=Boolean(initialEnabled),blend=enabled?1:0,night=0;
  let from=blend,elapsed=0,duration=0,disposed=false;

  function apply(){
    light.intensity=blend*(60+30*night);
    material.emissiveIntensity=blend*(.6+1.2*night);
  }
  function setEnabled(value,{immediate=false,reduced=false}={}){
    if(disposed)return false;
    const next=Boolean(value);
    if(next!==enabled){enabled=next;from=blend;elapsed=0;duration=FADE_SECONDS*Math.abs(Number(enabled)-blend);}
    if(immediate||reduced||duration<1e-8){blend=Number(enabled);duration=0;}
    apply();return enabled;
  }
  function update(dt,{night:nextNight=0,reduced=false}={}){
    if(disposed)return;
    if(Number.isFinite(nextNight))night=clamp(nextNight,0,1);
    if(reduced){blend=Number(enabled);duration=0;}
    else if(duration>0){
      const step=Number.isFinite(dt)?clamp(dt,0,MAX_STEP):0;
      elapsed=Math.min(duration,elapsed+step);
      blend=elapsed>=duration?Number(enabled):THREE.MathUtils.lerp(from,Number(enabled),smooth(elapsed/duration));
      if(elapsed>=duration)duration=0;
    }
    apply();
  }
  function dispose(){
    if(disposed)return;disposed=true;enabled=false;blend=0;duration=0;apply();
    light.removeFromParent();target.removeFromParent();light.dispose();
    if(lamp.material===material)lamp.material=originalMaterial;
    if(lamp.userData.bicycleLight===true){if(hadMarker)lamp.userData.bicycleLight=originalMarker;else delete lamp.userData.bicycleLight;}
    material.dispose();
  }
  apply();
  return {
    setEnabled,update,dispose,
    pick(ray,camera,viewportHeight){return disposed?null:pickLamp(ray,camera,viewportHeight);},
    get enabled(){return enabled;},
    // Physical spotlight intensity, not the animation's normalized blend.
    get output(){return light.intensity;},
    get diagnostics(){return Object.freeze({enabled,output:light.intensity,blend,night,disposed,castShadow:false,addedGeometry:0,addedTextures:0});},
  };
}
