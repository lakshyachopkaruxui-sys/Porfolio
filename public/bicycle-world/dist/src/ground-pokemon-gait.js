import * as THREE from 'three';
import {createPawContacts} from './pokemon-paw-contacts.js';
import {samplePokemonAttention} from './pokemon-attention.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(v,a,b)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const axisX=new THREE.Vector3(1,0,0),axisY=new THREE.Vector3(0,1,0),axisZ=new THREE.Vector3(0,0,1);
// Imported sources remain immutable. Cached templates never reach a renderer;
// each actor receives owned copies and keeps its own skeleton/contact state.
const preparedGeometryCache=new WeakMap();
const sourceSignature=inputs=>JSON.stringify(inputs.map(({mesh,relative})=>[
  mesh.geometry.uuid,relative.elements,mesh.geometry.index?.version??null,
  Object.entries(mesh.geometry.attributes).map(([name,attribute])=>[name,attribute.version,attribute.count,attribute.itemSize]),
]));

/** The supplied Bulbasaur static mesh receives a small GPU rig. Source colours,
 * materials and geometry remain owned by the import. This adapter owns only
 * cloned skin geometry and its skeleton. Other species need their own rig. */
export function createGroundPokemonGait(id,model){
  if(id!=='bulbasaur')return {supported:false,feet:[],update(){},reset(){},dispose(){}};
  const originals=[],ownedGeometries=[],bones=[];
  model.updateWorldMatrix(true,true);const inverseModel=model.matrixWorld.clone().invert();
  const rig=new THREE.Group();rig.name='Bulbasaur measured-walk rig';model.add(rig);
  function bone(name,position,parent=null){
    const value=new THREE.Bone();value.name=name;value.position.fromArray(position);
    if(parent){value.position.sub(parent.userData.bindPosition);parent.add(value);}else rig.add(value);
    value.userData.bindPosition=new THREE.Vector3(...position);value.userData.bindLocal=value.position.clone();bones.push(value);return value;
  }
  const torso=bone('Bulbasaur torso',[0,-.4,-.8]);
  const head=bone('Bulbasaur head',[0,-.28,-.18],torso);
  const bulb=bone('Bulbasaur bulb',[0,.1,-1.05],torso),legs=[];
  // Touchdowns proceed hind-left, fore-left, hind-right, fore-right. The long
  // duty factor keeps at least three paws supporting the heavy, low body.
  const offsets={hl:0,fl:.75,hr:.5,fr:.25};
  for(const front of [true,false])for(const side of [-1,1]){
    const id=(front?'f':'h')+(side<0?'l':'r');
    const hip=front?[side*.46,-.53,-.32]:[side*.49,-.56,-1.25];
    const knee=front?[side*.58,-.88,-.34]:[side*.63,-.87,-1.29];
    const paw=front?[side*.50,-1.08,-.32]:[side*.55,-1.08,-1.27];
    const upper=bone(`${front?'Fore':'Hind'} ${side<0?'left':'right'} upper`,hip,torso);
    const lower=bone(`${front?'Fore':'Hind'} ${side<0?'left':'right'} lower`,knee,upper);
    const foot=bone(`${front?'Fore':'Hind'} ${side<0?'left':'right'} paw`,paw,lower);
    legs.push({id,front,side,upper,lower,foot,rest:new THREE.Vector3(...paw),target:new THREE.Vector3(),desiredRotation:new THREE.Quaternion(),
      l1:lower.position.length(),l2:foot.position.length(),d1:lower.position.clone().normalize(),d2:foot.position.clone().normalize(),phaseOffset:offsets[id],footRotation:new THREE.Quaternion()});
  }
  const inputs=[];model.traverse(mesh=>{if(mesh.isMesh&&!mesh.isSkinnedMesh&&mesh.parent!==rig)inputs.push({mesh,relative:new THREE.Matrix4().multiplyMatrices(inverseModel,mesh.matrixWorld)});});
  const cacheKey=inputs[0]?.mesh.geometry,signature=sourceSignature(inputs),entry=cacheKey&&preparedGeometryCache.get(cacheKey);
  const cached=entry?.signature===signature?entry:null;
  function influences(x,y,z){
    const headWeight=smooth(z,-.48,-.2)*smooth(y,-.67,-.4),bulbWeight=smooth(y,.05,.3)*(1-smooth(z,-.7,-.25));
    const front=z>-.79,lateral=Math.max(smooth(Math.abs(x),.23,.42),(1-smooth(y,-1.03,-.95))*smooth(Math.abs(x),.12,.24));
    const soleMask=(1-smooth(y,-1.01,-.91))*smooth(Math.abs(x),.14,.30);
    // The low belly between the two thick legs is torso, not an elongated
    // calf. Restrict limb ownership to the real fore/hind source footprint.
    const longitudinal=1-smooth(Math.abs(z-(front?-.32:-1.27)),.20,.43);
    const legMask=Math.max(soleMask,(1-smooth(y,-.69,-.42))*lateral*longitudinal*(front?1-smooth(z,-.17,.05):1));
    const leg=legs.find(value=>value.front===front&&value.side===Math.sign(x));
    if(bulbWeight>.5&&bulbWeight>=headWeight)return [[0,1-bulbWeight],[2,bulbWeight]];
    if(headWeight>.02&&headWeight>=legMask)return [[0,1-headWeight],[1,headWeight]];
    if(leg&&legMask>.01){
      const amount=clamp((-.53-y)/.55),distal=smooth(amount,.25,.72),paw=1-smooth(y,-.94,-.84);
      return [[0,1-legMask],[bones.indexOf(leg.upper),legMask*(1-distal)],[bones.indexOf(leg.lower),legMask*distal*(1-paw)],[bones.indexOf(leg.foot),legMask*distal*paw]];
    }
    return [[0,1]];
  }
  for(const [inputIndex,{mesh:original,relative}] of inputs.entries()){
    const geometry=cached?cached.geometries[inputIndex].clone():original.geometry.clone().applyMatrix4(relative);ownedGeometries.push(geometry);
    if(!cached){
      const positions=geometry.attributes.position,indices=new Uint16Array(positions.count*4),weights=new Float32Array(positions.count*4);
      for(let i=0;i<positions.count;i++){
        const list=influences(positions.getX(i),positions.getY(i),positions.getZ(i));let sum=0;
        list.forEach(([index,weight],slot)=>{indices[i*4+slot]=index;weights[i*4+slot]=weight;sum+=weight;});
        for(let slot=0;slot<4;slot++)weights[i*4+slot]/=sum||1;
      }
      geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
    }
    const replacement=new THREE.SkinnedMesh(geometry,original.material);replacement.name=original.name+' measured walk';replacement.castShadow=original.castShadow;replacement.receiveShadow=original.receiveShadow;replacement.frustumCulled=false;
    originals.push({mesh:original,parent:original.parent,index:original.parent.children.indexOf(original)});original.removeFromParent();rig.add(replacement);
  }
  if(cached){legs.forEach((leg,index)=>{leg.rest.y=cached.footRestYs[index];});}
  else {
    const sourceFloor=Math.min(...ownedGeometries.map(geometry=>{geometry.computeBoundingBox();return geometry.boundingBox.min.y;}));
    for(const leg of legs){
      const footIndex=bones.indexOf(leg.foot);let lowest=Infinity;
      for(const geometry of ownedGeometries){const p=geometry.attributes.position,si=geometry.attributes.skinIndex,sw=geometry.attributes.skinWeight;
        for(let vertex=0;vertex<p.count;vertex++)for(let slot=0;slot<4;slot++)if(si.array[vertex*4+slot]===footIndex&&sw.array[vertex*4+slot]>.99)lowest=Math.min(lowest,p.getY(vertex)-leg.foot.userData.bindPosition.y);
      }
      if(Number.isFinite(lowest))leg.rest.y=sourceFloor-lowest;
    }
    if(cacheKey){
      preparedGeometryCache.set(cacheKey,{signature,geometries:ownedGeometries.map(geometry=>geometry.clone()),footRestYs:legs.map(leg=>leg.rest.y)});
      entry?.geometries.forEach(geometry=>geometry.dispose());
    }
  }
  const skeleton=new THREE.Skeleton(bones);rig.updateWorldMatrix(true,true);rig.traverse(mesh=>{if(mesh.isSkinnedMesh)mesh.bind(skeleton);});
  const direction=new THREE.Vector3(),pole=new THREE.Vector3(),hip=new THREE.Vector3(),knee=new THREE.Vector3(),q1=new THREE.Quaternion(),q2=new THREE.Quaternion(),inverse=new THREE.Quaternion(),targetDirection=new THREE.Vector3(),worldScale=new THREE.Vector3(),deltaRotation=new THREE.Quaternion();
  const stride=.24,duty=.8,contacts=createPawContacts(model,legs,{stride,duty,landingTime:.23,lift:.066}),torsoRest=torso.position.clone();
  const attention={};
  let phase=0,amount=0,lastTime=null,lastDistance=null,disposed=false;
  function solve(leg){
    hip.copy(leg.upper.position).applyQuaternion(torso.quaternion).add(torso.position);
    direction.copy(leg.target).sub(hip);const distance=clamp(direction.length(),Math.abs(leg.l1-leg.l2)+1e-5,leg.l1+leg.l2-1e-5);direction.normalize();
    pole.set(leg.side*.35,0,leg.front?-1:1);pole.addScaledVector(direction,-pole.dot(direction));if(pole.lengthSq()<1e-6)pole.set(0,0,1);pole.normalize();
    const along=(leg.l1*leg.l1+distance*distance-leg.l2*leg.l2)/(2*distance),height=Math.sqrt(Math.max(0,leg.l1*leg.l1-along*along));
    knee.copy(hip).addScaledVector(direction,along).addScaledVector(pole,height);
    targetDirection.copy(knee).sub(hip).normalize().applyQuaternion(inverse.copy(torso.quaternion).invert());leg.upper.quaternion.setFromUnitVectors(leg.d1,targetDirection);
    q1.copy(torso.quaternion).multiply(leg.upper.quaternion);targetDirection.copy(leg.target).sub(knee).normalize().applyQuaternion(inverse.copy(q1).invert());leg.lower.quaternion.setFromUnitVectors(leg.d2,targetDirection);
    q2.copy(q1).multiply(leg.lower.quaternion);leg.foot.quaternion.copy(q2.invert()).multiply(leg.desiredRotation);
  }
  function update({time=0,dt,speed=0,distance,turnRate=0,reduced=false,lighter=false,reaction=0}={}){
    if(disposed)return;
    const rewound=lastTime!==null&&time<lastTime;if(rewound){phase=0;lastDistance=null;contacts.reset();}
    const elapsed=rewound?0:Number.isFinite(dt)?clamp(dt,0,.1):lastTime===null?0:clamp(time-lastTime,0,.1);lastTime=time;
    model.updateWorldMatrix(true,false);model.getWorldScale(worldScale);const scale=Math.max(.0001,Math.abs(worldScale.x));
    const travel=Number.isFinite(distance)?lastDistance===null?0:Math.max(0,distance-lastDistance):Math.abs(speed)*elapsed,quiet=reduced||lighter;
    const moving=!quiet&&(Math.abs(speed)>.002||travel>1e-8);
    // On a tight garden turn the outer paws travel farther than the body
    // centre. Shorter turning steps prevent a planted leg exceeding its reach.
    if(!quiet)phase+=(travel/scale+Math.abs(turnRate)*elapsed*.55)/(stride/duty);
    if(Number.isFinite(distance))lastDistance=distance;
    amount=quiet?0:THREE.MathUtils.lerp(amount,moving?clamp(Math.abs(speed)/.18):0,1-Math.exp(-12*elapsed));
    const angle=phase*Math.PI*2,roll=Math.sin(angle)*.030*amount-clamp(turnRate*.035,-.025,.025)*amount,pitch=Math.sin(angle*2+.4)*.014*amount,heave=Math.cos(angle*2)*.012*amount;
    torso.position.copy(torsoRest);torso.position.x+=Math.sin(angle)*.012*amount;torso.position.y+=heave-.05*amount;torso.quaternion.setFromAxisAngle(axisX,pitch).multiply(deltaRotation.setFromAxisAngle(axisZ,roll));
    samplePokemonAttention('bulbasaur',time,amount,turnRate,quiet,attention);
    head.position.copy(head.userData.bindLocal);head.quaternion.setFromAxisAngle(axisX,-pitch*.6+attention.pitch).multiply(deltaRotation.setFromAxisAngle(axisZ,-roll*.6));
    if(!quiet)head.quaternion.multiply(deltaRotation.setFromAxisAngle(axisY,attention.yaw+reaction*.055));
    bulb.quaternion.setFromAxisAngle(axisX,-pitch*.65+Math.sin(angle*2-.55)*.009*amount).multiply(deltaRotation.setFromAxisAngle(axisZ,-roll*.55+Math.sin(angle-.65)*.013*amount));
    contacts.update({phase,dt:elapsed,moving,quiet,amount});for(const leg of legs){leg.upper.position.copy(leg.upper.userData.bindLocal);solve(leg);}
    model.updateMatrixWorld(true);skeleton.update();
  }
  function reset(){for(const value of bones){value.position.copy(value.userData.bindLocal);value.quaternion.identity();}contacts.reset();phase=0;amount=0;lastTime=null;lastDistance=null;model.updateMatrixWorld(true);skeleton.update();}
  update({time:0,reduced:true});
  const restBounds=new THREE.Box3().setFromObject(model,true);
  return {supported:true,metadata:{boneCount:15,canonicalStride:stride,duty,pattern:'four-beat measured walk'},recommendedHeight:1.65,recommendedBodyRadius:1.3,restBounds,
    update,reset,get phase(){return phase;},get cycleDistance(){model.updateWorldMatrix(true,false);model.getWorldScale(worldScale);return Math.abs(worldScale.x)*stride/duty;},
    get feet(){return legs.map(leg=>({id:leg.id,name:leg.foot.name,stance:leg.stance,landing:leg.landing,target:leg.target.clone(),position:model.worldToLocal(leg.foot.getWorldPosition(new THREE.Vector3())),world:leg.foot.getWorldPosition(new THREE.Vector3())}));},
    dispose(){if(disposed)return;reset();disposed=true;rig.removeFromParent();skeleton.dispose();ownedGeometries.forEach(geometry=>geometry.dispose());for(const entry of originals){entry.parent.add(entry.mesh);const children=entry.parent.children;children.splice(children.indexOf(entry.mesh),1);children.splice(entry.index,0,entry.mesh);}},
  };
}
