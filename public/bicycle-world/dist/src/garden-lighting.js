import * as THREE from 'three';
import {GARDEN_PALETTE} from './garden-palette.js';

const MANUAL_SECONDS=4,MAX_STEP=.1;

const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const blendColour=(target,first,last,mix)=>mix===0?target.copy(first):mix===1?target.copy(last):target.lerpColors(first,last,mix);
const palette=(background,sky,ground,sun,hemisphereIntensity,sunIntensity)=>({
  background:new THREE.Color(background),sky:new THREE.Color(sky),ground:new THREE.Color(ground),
  sun:new THREE.Color(sun),hemisphereIntensity,sunIntensity,
});
// A quieter sky fill lets the existing sunlight describe roof, foliage and rider volume.
const DAY=palette(GARDEN_PALETTE.outer,'#fff6df','#a5b390','#fff1d5',1.45,2.35);
const DUSK=palette('#777e89','#e7bda6','#89936e','#f5ba91',1.2,1.9);
const NIGHT=palette('#273f57','#a8c0ec','#637d68','#9eafe7',.82,.85);
const FOLLOW_SKY=[new THREE.Color('#b8d9ee'),new THREE.Color('#c5aec0'),new THREE.Color('#203b5b')];



/** Small opaque lenses sit on the lamp faces declared by each exterior builder.
 * Keeping placement with the architecture prevents floating or buried lights
 * when a doorway moves. Oak retains its already-reviewed original placement.
 * One instanced box batch, one material, no textures or additional real lights. */
function createEntranceLenses(scene,world){
  const roots=world?.landmarks?.roots;
  if(!roots?.get)return null;
  const entries=[];
  const dummy=new THREE.Object3D(),point=new THREE.Vector3();
  for(const [id,root] of roots){
    root.updateWorldMatrix(true,false);
    const placements=root.userData.entranceLenses;
    if(Array.isArray(placements)){
      for(const placement of placements){
        dummy.position.fromArray(placement.position);
        dummy.rotation.set(0,placement.yaw||0,0);
        dummy.scale.fromArray(placement.size);
        dummy.updateMatrix();
        entries.push(new THREE.Matrix4().multiplyMatrices(root.matrixWorld,dummy.matrix));
      }
    }else if(id==='music'){
      // Preserve the approved Oak lamps' world size and attachment points.
      for(const position of [[-3.22,.68,1.26],[3.22,.68,1.26]]){
        root.localToWorld(point.fromArray(position));dummy.position.copy(point);
        dummy.rotation.set(0,root.rotation.y,0);dummy.scale.set(.12,.24,.055);
        dummy.updateMatrix();entries.push(dummy.matrix.clone());
      }
    }
  }
  if(!entries.length)return null;
  const geometry=new THREE.BoxGeometry(1,1,1);
  // Emissive is present from creation. Only its intensity changes at runtime;
  // no material define, transparency, shader hook or needsUpdate toggle changes.
  const material=new THREE.MeshStandardMaterial({color:'#dfb574',roughness:.75,emissive:'#ffc178',emissiveIntensity:0});
  material.name='Garden entrance lamp lenses';
  const mesh=new THREE.InstancedMesh(geometry,material,entries.length);
  mesh.name='Warm garden entrance lamp faces';mesh.castShadow=false;mesh.receiveShadow=false;
  entries.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
  mesh.userData.gardenLighting={instances:entries.length,triangles:entries.length*12,drawCalls:1,textures:0,additionalLights:0};
  scene.add(mesh);
  return {mesh,material,dispose(){mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();}};
}

/** Owns outdoor colour and the existing two lights only. Automatic time freezes
 * in rooms/readers, in reduced motion and on inactive frames supplied by caller.
 * A manual choice still finishes while automatic time is paused. */
export function createGardenLighting({scene,sun,hemisphere,world}={}){
  if(!scene?.add||!sun?.color?.isColor||!sun?.target?.position||!hemisphere?.groundColor?.isColor)
    throw new TypeError('Garden lighting needs the existing scene, sun and hemisphere light.');
  const original={
    background:scene.background,backgroundColor:scene.background?.isColor?scene.background.clone():null,
    fog:scene.fog,fogColor:scene.fog?.color?.clone(),
    sunColor:sun.color.clone(),sunIntensity:sun.intensity,sunPosition:sun.position.clone(),target:sun.target.position.clone(),
    sky:hemisphere.color.clone(),ground:hemisphere.groundColor.clone(),hemisphereIntensity:hemisphere.intensity,
  };
  const background=scene.background?.isColor?scene.background:new THREE.Color();scene.background=background;
  const lenses=createEntranceLenses(scene,world);
  let progress=0,target=0,automatic=false,from=0,elapsed=0,duration=0,disposed=false,lastApplied=-1;
  let focusX=0,focusZ=0,perspective=false,lastPerspective=false;

  const lightOffset = new THREE.Vector3(), axisX = new THREE.Vector3(), axisY = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  function apply(){
    if(progress!==lastApplied||perspective!==lastPerspective){
      const first=progress<.4?DAY:DUSK,last=progress<.4?DUSK:NIGHT;
      const mix=progress<.4?smooth(progress/.4):smooth((progress-.4)/.6);
      if(perspective)blendColour(background,FOLLOW_SKY[progress<.4?0:1],FOLLOW_SKY[progress<.4?1:2],mix);
      else blendColour(background,first.background,last.background,mix);
      if(scene.fog?.color)scene.fog.color.copy(background);
      blendColour(hemisphere.color,first.sky,last.sky,mix);
      blendColour(hemisphere.groundColor,first.ground,last.ground,mix);
      hemisphere.intensity=THREE.MathUtils.lerp(first.hemisphereIntensity,last.hemisphereIntensity,mix);
      blendColour(sun.color,first.sun,last.sun,mix);
      sun.intensity=THREE.MathUtils.lerp(first.sunIntensity,last.sunIntensity,mix);
      if(lenses)lenses.material.emissiveIntensity=1.25*smooth((progress-.2)/.6);
      lastApplied=progress;
      lastPerspective=perspective;
    }
    // Keep the existing shadow camera following the rider. A second owner must
    // not overwrite this offset after update; main owns when update is called.
    lightOffset.set(-12-progress*6,25-progress*4,14-progress*23);
    anchor.set(focusX,0,focusZ);
    // Snap only in the shadow camera's image plane. Sub-texel camera travel
    // otherwise slides the shadow pattern across walls and beam undersides.
    const shadow = sun.shadow;
    if (shadow?.mapSize.x && shadow?.mapSize.y) {
      axisX.crossVectors(sun.up,lightOffset).normalize();
      axisY.crossVectors(lightOffset,axisX).normalize();
      const texelX = (shadow.camera.right-shadow.camera.left)/shadow.mapSize.x;
      const texelY = (shadow.camera.top-shadow.camera.bottom)/shadow.mapSize.y;
      const x = anchor.dot(axisX), y = anchor.dot(axisY);
      anchor.addScaledVector(axisX,Math.round(x/texelX)*texelX-x);
      anchor.addScaledVector(axisY,Math.round(y/texelY)*texelY-y);
    }
    sun.target.position.copy(anchor);
    sun.position.copy(anchor).add(lightOffset);
  }
  function setNight(value,{immediate=false}={}){
    if(disposed)return;
    automatic=false;target=value?1:0;from=progress;elapsed=0;duration=MANUAL_SECONDS*Math.abs(target-from);
    if(immediate||duration<1e-8){progress=target;duration=0;apply();}
  }
  function setPerspective(value){if(disposed)return;perspective=Boolean(value);apply();}
  function setAutomatic(value){
    if(disposed)return;
    const next=Boolean(value);if(next===automatic)return;
    automatic=next;duration=0;
    if(automatic)target=progress>=.5?1:0;
    else target=progress>=.5?1:0;
  }
  function enterSection(id){
    if(!automatic || (id!=='projects' && id!=='cloud'))return;
    const next=id==='projects'?1:0;
    if(next===target && (duration>0 || progress===next))return;
    target=next;from=progress;elapsed=0;duration=MANUAL_SECONDS*Math.abs(target-from);
  }
  function update(dt,{paused=false,reduced=false,focus}={}){
    if(disposed)return;
    if(Number.isFinite(focus?.x)&&Number.isFinite(focus?.z)){focusX=focus.x;focusZ=focus.z;}
    const step=Number.isFinite(dt)?Math.max(0,Math.min(MAX_STEP,dt)):0;
    if(duration>0 && (!automatic || !paused)){
      if(reduced){progress=target;duration=0;}
      else{elapsed=Math.min(duration,elapsed+step);progress=elapsed>=duration?target:THREE.MathUtils.lerp(from,target,smooth(elapsed/duration));if(elapsed>=duration)duration=0;}
    }
    progress=clamp(progress);apply();
  }
  function dispose(){
    if(disposed)return;disposed=true;lenses?.dispose();
    // Restore borrowed state; never dispose scene materials or either light.
    if(scene.background===background){scene.background=original.background;if(original.backgroundColor)scene.background.copy(original.backgroundColor);}
    if(scene.fog===original.fog&&original.fogColor)scene.fog.color.copy(original.fogColor);
    sun.color.copy(original.sunColor);sun.intensity=original.sunIntensity;sun.position.copy(original.sunPosition);sun.target.position.copy(original.target);
    hemisphere.color.copy(original.sky);hemisphere.groundColor.copy(original.ground);hemisphere.intensity=original.hemisphereIntensity;
  }
  apply();
  return {update,enterSection,setNight,setAutomatic,setPerspective,get night(){return automatic?progress>=.5:target===1;},get targetNight(){return target===1;},get automatic(){return automatic;},get progress(){return progress;},dispose};
}
