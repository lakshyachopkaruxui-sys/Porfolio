import * as THREE from 'three';

const CLUSTERS=24,PUFFS=5,FULL_COUNT=CLUSTERS*PUFFS,LIGHT_COUNT=12*PUFFS;
const TAU=Math.PI*2,DRIFT_PERIOD=600;
const DAY_CLOUD=new THREE.Color('#edf4fa'),NIGHT_CLOUD=new THREE.Color('#9aabc6');
// Individual puffs remain round. The outline comes from overlapping copies,
// never by stretching one cloud over the width of the viewport.
const LOBES=Object.freeze([
  Object.freeze([-.76,-.04,.02,.76]),Object.freeze([0,0,.08,1.02]),
  Object.freeze([.84,.04,-.05,.78]),Object.freeze([-.25,.58,-.08,.80]),
  Object.freeze([.48,.47,.13,.72]),
]);
const clamp=value=>Math.max(0,Math.min(1,value));

/** Distant cloud banks for the closer riding view. One geometry/material/batch;
 * no textures, shadow passes, new lights, background or renderer ownership. */
export function createFollowSky(scene){
  const root=new THREE.Group();root.name='Follow view cloud field';root.visible=false;scene.add(root);
  const geometry=new THREE.IcosahedronGeometry(1,1);
  // The main world's fog describes ground haze. Applying its finite range to
  // these distant banks would erase them into the horizon; static instance
  // tints and the existing sun/hemisphere supply their depth instead.
  const material=new THREE.MeshLambertMaterial({color:DAY_CLOUD,fog:false});
  material.name='Soft distant cloud light';
  const mesh=new THREE.InstancedMesh(geometry,material,FULL_COUNT);
  mesh.name='Drifting garden cloud puffs';mesh.castShadow=false;mesh.receiveShadow=false;
  // The field follows the visitor. A fixed cached instance bound would become
  // stale after drift; submitting this one small sky batch avoids recomputing it.
  mesh.frustumCulled=false;root.add(mesh);
  const dummy=new THREE.Object3D(),tint=new THREE.Color();
  const banks=[];
  for(let index=0;index<CLUSTERS;index++){
    const angle=index*2.399963229728653+.31;
    const distance=102+(index*31%43);
    banks.push({x:Math.sin(angle)*distance,z:Math.cos(angle)*distance,
      y:18+(index*7%9)*.72,scale:3.7+(index*13%9)*.15,
      angle:index*.71,phase:index*.83});
    for(let puff=0;puff<PUFFS;puff++){
      // Slightly cooler distant banks, with stable per-cloud tonal variation.
      const shade=.90+(144-distance)/420+(index%3)*.008;
      mesh.setColorAt(index*PUFFS+puff,tint.setRGB(shade,shade,1));
    }
  }
  mesh.instanceColor.needsUpdate=true;
  let disposed=false,activeBefore=false,lighterBefore=false,reducedBefore=false;
  let lastInputTime=null,motionTime=0,lastPaintTime=-Infinity,lastNight=-1;

  function paint(){
    const phase=(motionTime%DRIFT_PERIOD)/DRIFT_PERIOD*TAU;
    const count=mesh.count;
    for(let index=0;index<count/PUFFS;index++){
      const bank=banks[index],cos=Math.cos(bank.angle),sin=Math.sin(bank.angle);
      const driftX=(Math.sin(phase+bank.phase)-Math.sin(bank.phase))*7;
      const driftZ=(Math.cos(phase*2+bank.phase)-Math.cos(bank.phase))*3.5;
      const bob=(Math.sin(phase*3+bank.phase)-Math.sin(bank.phase))*.32;
      for(let puff=0;puff<PUFFS;puff++){
        const lobe=LOBES[puff],scale=bank.scale;
        dummy.position.set(bank.x+driftX+(lobe[0]*cos-lobe[2]*sin)*scale,
          bank.y+bob+lobe[1]*scale,bank.z+driftZ+(lobe[0]*sin+lobe[2]*cos)*scale);
        dummy.rotation.set(0,bank.angle,0);dummy.scale.setScalar(lobe[3]*scale);dummy.updateMatrix();
        mesh.setMatrixAt(index*PUFFS+puff,dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate=true;lastPaintTime=motionTime;
  }
  paint();
  root.userData.followSky={clusters:CLUSTERS,maxInstances:FULL_COUNT,drawCalls:1,
    maxTriangles:geometry.attributes.position.count/3*FULL_COUNT,textures:0,additionalLights:0};

  function update({focus,time=0,active=false,reduced=false,lighter=false,night=0}={}){
    if(disposed)return;
    const inputTime=Number.isFinite(time)?time:lastInputTime??0;
    const elapsed=lastInputTime===null?0:Math.max(0,Math.min(.12,inputTime-lastInputTime));
    lastInputTime=inputTime;
    root.visible=Boolean(active);
    if(!active){activeBefore=false;return;}
    if(Number.isFinite(focus?.x)&&Number.isFinite(focus?.z))root.position.set(focus.x,0,focus.z);
    if(reduced&&!reducedBefore)motionTime=lastPaintTime;
    if(!reduced)motionTime+=elapsed;
    const mix=Number.isFinite(night)?clamp(night):Math.max(0,lastNight);
    if(mix!==lastNight){
      material.color.lerpColors(DAY_CLOUD,NIGHT_CLOUD,mix);lastNight=mix;
    }
    const count=lighter?LIGHT_COUNT:FULL_COUNT;
    const force=!activeBefore||lighter!==lighterBefore||reduced!==reducedBefore;
    mesh.count=count;
    if(force||!reduced&&motionTime-lastPaintTime>=1/(lighter?12:30))paint();
    activeBefore=true;lighterBefore=lighter;reducedBefore=reduced;
  }
  function dispose(){
    if(disposed)return;disposed=true;root.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();
  }
  return {root,update,dispose};
}
