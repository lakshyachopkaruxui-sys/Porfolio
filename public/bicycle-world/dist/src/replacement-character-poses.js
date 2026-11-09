import * as THREE from 'three';
import {samplePokemonAttention} from './pokemon-attention.js';
import {CHARMANDER_ARM_REFINEMENT_PLAN} from './charmander-arm-refinement-plan.js';
import {createCharmanderArmMorphs,reuseCharmanderArmMorphs,charmanderArmMorphGate,CHARMANDER_ARM_MORPH_AMPLITUDE} from './charmander-arm-morphs.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(v,a,b)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);
// A CPU-only immutable template is weakly owned by the shared imported source.
// Every actor still receives its own geometry, skeleton and morph influences.
const charmanderGeometryCache=new WeakMap();

function relaxedCharmanderPoint(input,target,centerX,motion=0){
  const localX=input.x-centerX,side=localX<0?-1:1,x=Math.abs(localX),start=.125,length=.088,angle=1.42,curvature=angle/length;
  const gate=smooth(input.y,.70,.728)*(1-smooth(input.y,.82,.84))*smooth(input.z,.12,.15)*(1-smooth(input.z,.24,.27));
  target.copy(input);
  if(x>start&&gate>0){
  const s=x-start,arc=Math.min(s,length),theta=curvature*arc,remaining=Math.max(0,s-length),rawDy=input.y-.765;
  // Relax the outer shoulder crest locally; keep the distal forearm and hand
  // cross-section intact. This also avoids stretching the cap's short edges.
  const shoulderCap=.12*smooth(x,.125,.155)*(1-smooth(x,.19,.235))*smooth(input.y,.765,.80),dy=rawDy*(1-shoulderCap);
  const cx=Math.sin(theta)/curvature+remaining*Math.cos(theta),cy=(Math.cos(theta)-1)/curvature-remaining*Math.sin(theta);
  const bentX=centerX+side*(start+cx+Math.sin(theta)*dy)-side*.016*smooth(x,.14,.215);
  const bentY=.765+cy+Math.cos(theta)*dy-.006*smooth(x,.125,.17);
  target.set(THREE.MathUtils.lerp(input.x,bentX,gate),THREE.MathUtils.lerp(input.y,bentY,gate),input.z+.012*smooth(x,.195,.275)*gate);
  }
  // Lower the actual shoulder shelf, then tuck the whole arm with a broad
  // source-space ramp. Reaching a plateau before the vertical arc avoids
  // squeezing its cross-section. The central neck and front face stay clear.
  const radial=Math.abs(target.x-centerX),depth=smooth(target.z,.12,.15)*(1-smooth(target.z,.24,.27));
  const cap=smooth(radial,.085,.13)*(1-smooth(radial,.23,.28))*smooth(target.y,.70,.77)*(1-smooth(target.y,.82,.85))*depth;
  target.y-=.015*cap;
  const tuck=smooth(x,.085,.125)*smooth(input.y,.63,.735)*(1-smooth(input.y,.82,.85))*smooth(input.z,.05,.15)*(1-smooth(input.z,.27,.42));
  target.x-=side*.018*tuck;
  const forward=smooth(Math.abs(target.x-centerX),.155,.19)*smooth(target.y,.59,.65)*(1-smooth(target.y,.77,.84))*smooth(target.z,.05,.12)*(1-smooth(target.z,.28,.36));
  target.z+=.012*forward;
  if(motion)target.z+=motion*charmanderArmMorphGate(input,centerX);
  return target;
}

function relaxedCharmanderNormal(input,normal,target,centerX,motion=0){
  const epsilon=1e-5,columns=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],plus=new THREE.Vector3(),minus=new THREE.Vector3();
  for(let axis=0;axis<3;axis++){
    plus.copy(input);plus.setComponent(axis,plus.getComponent(axis)+epsilon);relaxedCharmanderPoint(plus,columns[axis],centerX,motion);
    minus.copy(input);minus.setComponent(axis,minus.getComponent(axis)-epsilon);relaxedCharmanderPoint(minus,plus,centerX,motion);columns[axis].sub(plus).multiplyScalar(1/(2*epsilon));
  }
  const matrix=new THREE.Matrix3().set(columns[0].x,columns[1].x,columns[2].x,columns[0].y,columns[1].y,columns[2].y,columns[0].z,columns[1].z,columns[2].z);
  return target.copy(normal).applyMatrix3(matrix.invert().transpose()).normalize();
}

/** A few exported collar faces span almost an entire arm. Conforming midpoint
 * splits let their surface follow the bend instead of crossing it as one flat
 * chord. Shared geometric edges split in every UV/material copy, retaining all
 * original vertices and interpolating every added vertex's source attributes. */
function charmanderArmInputFingerprint(entries,centerX){
  // This is a deterministic geometry discriminator, not a security checksum.
  // Hash the actual transformed buffers, their typed layouts and mesh order.
  let first=0x811c9dc5,second=0x9e3779b9;
  function bytes(array){for(const byte of array){first=Math.imul(first^byte,0x01000193);second=Math.imul(second^byte,0x85ebca6b);second^=second>>>13;}}
  const encoder=new TextEncoder(),text=value=>bytes(encoder.encode(value));
  // A changed rest map, normal policy or refinement criterion must invalidate
  // the plan even when the same model is supplied. The current build copies
  // these modules verbatim; differently transformed source safely falls back.
  text(relaxedCharmanderPoint.toString());text(relaxedCharmanderNormal.toString());text(refineCharmanderArmEdges.toString());
  text(charmanderArmMorphGate.toString());bytes(new Uint8Array(new Float64Array([CHARMANDER_ARM_MORPH_AMPLITUDE]).buffer));
  bytes(new Uint8Array(new Float64Array([centerX]).buffer));
  for(const {original,geometry} of entries){
    text(original.name+'|');
    for(const name of Object.keys(geometry.attributes).sort()){
      const attribute=geometry.attributes[name],array=attribute.array;
      text(name+':'+array.constructor.name+':'+attribute.itemSize+':'+attribute.normalized+':'+attribute.count+'|');
      bytes(new Uint8Array(array.buffer,array.byteOffset,array.byteLength));
    }
    const index=geometry.index.array;text('index:'+index.constructor.name+':'+index.length+'|');bytes(new Uint8Array(index.buffer,index.byteOffset,index.byteLength));
  }
  return entries.length+':'+(first>>>0).toString(16).padStart(8,'0')+(second>>>0).toString(16).padStart(8,'0');
}

function refineCharmanderArmEdges(entries,centerX,{forceAdaptive=false,onRefinementPass}={}){
  // A vertex occurs in many triangle edges. Cache its identical rounded key
  // once per immutable refinement buffer instead of rebuilding it each time.
  const pointKeys=new WeakMap();
  const pointKey=(p,i)=>{
    let keys=pointKeys.get(p);if(!keys){keys=new Array(p.count);pointKeys.set(p,keys);}
    return keys[i]??(keys[i]=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(','));
  };
  const edgeKey=(p,a,b)=>{const ka=pointKey(p,a),kb=pointKey(p,b);return ka<kb?ka+'|'+kb:kb+'|'+ka;};
  const armPoint=(p,i)=>Math.abs(p.getX(i)-centerX)>.085&&p.getY(i)>.63&&p.getY(i)<.85&&p.getZ(i)>.05&&p.getZ(i)<.42;
  const fingerprint=charmanderArmInputFingerprint(entries,centerX);
  const plan=!forceAdaptive&&CHARMANDER_ARM_REFINEMENT_PLAN?.version===1&&CHARMANDER_ARM_REFINEMENT_PLAN.fingerprint===fingerprint?CHARMANDER_ARM_REFINEMENT_PLAN:null;
  let addedTriangles=0;
  for(let pass=0;pass<16;pass++){
    const edges=new Set(plan?.passes[pass]||[]);
    if(!plan)for(const {geometry} of entries){const p=geometry.attributes.position,idx=geometry.index.array;
      const points=Array.from({length:p.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(p,i));
      const normals=points.map((point,i)=>new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal,i));
      for(const motion of [0,-CHARMANDER_ARM_MORPH_AMPLITUDE,CHARMANDER_ARM_MORPH_AMPLITUDE]){
      const posed=points.map(point=>relaxedCharmanderPoint(point,new THREE.Vector3(),centerX,motion));
      const posedNormals=points.map((point,i)=>posed[i].distanceToSquared(point)<1e-20?normals[i].clone():relaxedCharmanderNormal(point,normals[i],new THREE.Vector3(),centerX,motion));
      for(let i=0;i<idx.length;i+=3){const triangle=[idx[i],idx[i+1],idx[i+2]];if(!triangle.some(v=>armPoint(p,v)))continue;
        if(pass===0){for(let k=0;k<3;k++){const a=triangle[k],b=triangle[(k+1)%3];if(points[a].distanceTo(points[b])>.045)edges.add(edgeKey(p,a,b));}continue;}
        const [a,b,c]=triangle,sourceNormal=points[b].clone().sub(points[a]).cross(points[c].clone().sub(points[a])),posedNormal=posed[b].clone().sub(posed[a]).cross(posed[c].clone().sub(posed[a]));
        const sourceArea=sourceNormal.length(),posedArea=posedNormal.length();if(sourceArea<1e-12)continue;
        const sourceDot=sourceNormal.normalize().dot(normals[a].clone().add(normals[b]).add(normals[c]).normalize());
        const posedDot=posedNormal.normalize().dot(posedNormals[a].clone().add(posedNormals[b]).add(posedNormals[c]).normalize());
        if(sourceDot>.2&&(posedDot<.12||posedArea/sourceArea<.2)){
          let longest=[a,b],length=0;for(let k=0;k<3;k++){const one=triangle[k],two=triangle[(k+1)%3],distance=points[one].distanceTo(points[two]);if(distance>length){length=distance;longest=[one,two];}}
          if(length>1e-5)edges.add(edgeKey(p,...longest));
        }
      }
      }
    }
    if(edges.size===0)break;
    onRefinementPass?.([...edges]);
    for(const entry of entries){
      const geometry=entry.geometry,p=geometry.attributes.position,idx=geometry.index.array,attributes=Object.entries(geometry.attributes),values=new Map(attributes.map(([name,attribute])=>[name,Array.from(attribute.array)])),midpoints=new Map(),triangles=[],midpointRecords=[...(geometry.userData.armRestMidpoints||[])];
      let vertices=p.count;
      function midpoint(a,b){
        if(!edges.has(edgeKey(p,a,b)))return null;
        const key=a<b?a+':'+b:b+':'+a;if(midpoints.has(key))return midpoints.get(key);
        const vertex=vertices++;midpoints.set(key,vertex);midpointRecords.push([vertex,a,b]);
        for(const [name,attribute] of attributes){const out=values.get(name),size=attribute.itemSize,start=out.length;for(let component=0;component<size;component++)out.push((attribute.array[a*size+component]+attribute.array[b*size+component])*.5);
          if(name==='normal'){const length=Math.hypot(out[start],out[start+1],out[start+2])||1;for(let component=0;component<3;component++)out[start+component]/=length;}
        }
        return vertex;
      }
      for(let i=0;i<idx.length;i+=3){
        const a=idx[i],b=idx[i+1],c=idx[i+2],ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a),mask=(ab===null?0:1)|(bc===null?0:2)|(ca===null?0:4);
        if(mask===0)triangles.push(a,b,c);
        else if(mask===1)triangles.push(a,ab,c,ab,b,c);
        else if(mask===2)triangles.push(b,bc,a,bc,c,a);
        else if(mask===4)triangles.push(c,ca,b,ca,a,b);
        else if(mask===3)triangles.push(b,bc,ab,a,ab,c,ab,bc,c);
        else if(mask===5)triangles.push(a,ab,ca,ab,b,c,ab,c,ca);
        else if(mask===6)triangles.push(c,ca,bc,a,b,ca,b,bc,ca);
        else triangles.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
      }
      if(midpoints.size===0)continue;
      const next=new THREE.BufferGeometry();for(const [name,attribute] of attributes)next.setAttribute(name,new THREE.BufferAttribute(new attribute.array.constructor(values.get(name)),attribute.itemSize,attribute.normalized));
      next.setIndex(triangles);next.userData.armRestMidpoints=midpointRecords;addedTriangles+=(triangles.length-idx.length)/3;geometry.dispose();entry.geometry=next;
    }
  }
  return {addedTriangles,fingerprint,mode:plan?'precomputed':'adaptive'};
}

/** Source-specific motion for the user's replacement static models.
 * Charmander retains its authored upright torso with a relaxed arm rest pose.
 * Snorlax uses only whole-figure orientation and restrained breath: its arms,
 * hands, face and original mesh geometry are never deformed. */
export function createReplacementCharacterPose(id,model,spec={},options={}){
  if(id==='snorlax')return createSnorlaxSleep(model,spec.behavior==='stand-sleep');
  if(id!=='charmander')return {supported:false,update(){},reset(){},dispose(){}};
  return createCharmanderWalk(model,options);
}

function createSnorlaxSleep(model,standing){
  model.updateWorldMatrix(true,true);
  const inverse=model.matrixWorld.clone().invert(),sourceBox=new THREE.Box3().setFromObject(model,true).applyMatrix4(inverse);
  const entries=model.children.map((child,index)=>({child,index}));
  const orientation=new THREE.Group(),breath=new THREE.Group();
  orientation.name=standing?'Standing asleep Snorlax':'Lying asleep Snorlax';
  breath.name='Authored Snorlax silhouette';orientation.add(breath);model.add(orientation);
  for(const {child} of entries)breath.add(child);
  orientation.rotation.x=standing?0:-Math.PI/2;
  const pivot=standing?sourceBox.min.y:sourceBox.min.z;
  const ear=new THREE.Vector3(sourceBox.max.x*.34,sourceBox.max.y-.24,sourceBox.getCenter(new THREE.Vector3()).z);
  let disposed=false;
  function update({time=0,reduced=false,lighter=false}={}){
    if(disposed)return;
    const pulse=reduced||lighter?1:1+Math.sin((Number.isFinite(time)?time:0)*Math.PI*2/5.6)*.0035;
    breath.position.set(0,0,0);breath.scale.set(1,1,1);
    if(standing){breath.scale.y=pulse;breath.position.y=pivot*(1-pulse);}
    else{breath.scale.z=pulse;breath.position.z=pivot*(1-pulse);}
    model.updateMatrixWorld(true);
  }
  const reset=()=>update({reduced:true});reset();
  const restBounds=new THREE.Box3().setFromObject(model,true),center=restBounds.getCenter(new THREE.Vector3());
  const anchor=new THREE.Vector3(center.x,restBounds.min.y,center.z);
  return {supported:true,kind:'sleep',standing,anchor,restBounds,update,reset,
    getSleepAnchor(target=new THREE.Vector3()){model.updateWorldMatrix(true,true);return breath.localToWorld(target.copy(ear));},
    dispose(){if(disposed)return;disposed=true;orientation.removeFromParent();for(const {child} of entries)model.add(child);},
  };
}

function createCharmanderWalk(model,options){
  model.updateWorldMatrix(true,true);
  const inverseModel=model.matrixWorld.clone().invert(),sourceBox=new THREE.Box3().setFromObject(model,true).applyMatrix4(inverseModel);
  const rig=new THREE.Group();rig.name='Authored upright Charmander motion';model.add(rig);
  const bones=[],originals=[],owned=[],meshes=[];
  function bone(name,position,parent){
    const b=new THREE.Bone();b.name=name;b.userData.bind=new THREE.Vector3(...position);b.position.copy(b.userData.bind);
    if(parent){b.position.sub(parent.userData.bind);parent.add(b);}else rig.add(b);
    b.userData.local=b.position.clone();bones.push(b);return b;
  }
  const body=bone('Biped pelvis',[0,.565,.09]);
  const head=bone('Character head',[0,.85,.09],body),tail=bone('Balancing tail',[0,.56,-.065],body);
  // Actual source arms run sideways at y~.765, z~.194. The old y=.65/z=.07
  // control was below and behind that anatomy and only caught the hand tips.
  const arms=[-1,1].map(side=>{
    const upper=bone(`${side<0?'Left':'Right'} resting arm`,[side*.135,.766,.194],body);
    const elbow=bone(`${side<0?'Left':'Right'} arm elbow`,[side*.208,.765,.194],upper);
    const wrist=bone(`${side<0?'Left':'Right'} arm wrist`,[side*.258,.765,.196],elbow);
    return {side,upper,elbow,wrist};
  });
  const legs=[-1,1].map(side=>{
    const hip=[side*.115,.565,.13],knee=[side*.125,.49,.235],ankle=[side*.13,.44,.215];
    const upper=bone(`${side<0?'Left':'Right'} biped thigh`,hip,body),lower=bone(`${side<0?'Left':'Right'} biped calf`,knee,upper),foot=bone(`${side<0?'Left':'Right'} biped foot`,ankle,lower);
    return {side,upper,lower,foot,l1:lower.position.length(),l2:foot.position.length(),d1:lower.position.clone().normalize(),d2:foot.position.clone().normalize(),rest:new THREE.Vector3(...ankle),target:new THREE.Vector3(...ankle),last:new THREE.Vector3(...ankle),lock:new THREE.Vector3(),lockRotation:new THREE.Quaternion(),locked:false,stance:true,initialized:false,phaseOffset:side<0?0:.5};
  });
  const index=b=>bones.indexOf(b);
  function weights(x,y,z){
    const back=smooth(-z,.045,.17)*(1-smooth(y,.83,.92));
    const headWeight=smooth(y,.73,.82)*(1-back),tailWeight=back*(1-headWeight);
    const side=x<0?-1:1,arm=arms[side<0?0:1],leg=legs[side<0?0:1];
    // This bounded collar includes the real upper arm but excludes the lower
    // jaw, belly and tail. Hand vertices lie wholly inside the wrist region.
    const collarTop=smooth(y,.785,.82);
    const a=smooth(Math.abs(x),.125+collarTop*.045,.185+collarTop*.045)*smooth(y,.70,.728)*(1-smooth(y,.811,.835))*smooth(z,.12,.15)*(1-smooth(z,.24,.27));
    const h=headWeight*(1-a),t=tailWeight*(1-a);
    // The broad authored soles extend toward the centre line. Give their full
    // contact patch to the foot rather than blending heel vertices into pelvis.
    const contact=(1-smooth(y,.46,.485))*(1-smooth(-z,.015,.075));
    const l=Math.max((1-smooth(y,.49,.59))*smooth(Math.abs(x),.035,.09)*(1-smooth(-z,.015,.075)),contact)*(1-h-t-a);
    const distal=Math.max(1-smooth(y,.45,.52),contact),sole=Math.max(1-smooth(y,.445,.475),contact);
    const forearm=smooth(Math.abs(x),.192,.225),hand=smooth(Math.abs(x),.246,.266);
    const list=[[index(body),Math.max(0,1-h-t-a-l)],[index(head),h],[index(tail),t],[index(arm.upper),a*(1-forearm)],[index(arm.elbow),a*forearm*(1-hand)],[index(arm.wrist),a*forearm*hand],[index(leg.upper),l*(1-distal)],[index(leg.lower),l*distal*(1-sole)],[index(leg.foot),l*distal*sole]];
    return list.filter(([,w])=>w>0).sort((a,b)=>b[1]-a[1]).slice(0,4);
  }
  const inputs=[];model.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh)inputs.push(o);});
  const relativeMatrices=inputs.map(original=>new THREE.Matrix4().multiplyMatrices(inverseModel,original.matrixWorld));
  const cacheKey=inputs[0]?.geometry,cacheable=cacheKey&&!options.forceAdaptive&&!options.onRefinementPass;
  const signature=cacheable?inputs.map((mesh,i)=>[
    mesh.geometry.uuid,mesh.name,...relativeMatrices[i].elements,
    ...Object.entries(mesh.geometry.attributes).map(([name,attribute])=>`${name}:${attribute.version}:${attribute.count}:${attribute.itemSize}`),
    mesh.geometry.index?.version,mesh.geometry.index?.count,
  ].join('|')).join(';')+'|'+[...sourceBox.min,...sourceBox.max].join(','):null;
  const candidate=cacheable?charmanderGeometryCache.get(cacheKey):null,cached=candidate?.signature===signature?candidate:null;
  const prepared=inputs.map((original,i)=>({original,geometry:cached?cached.geometries[i].clone():original.geometry.clone().applyMatrix4(relativeMatrices[i])}));
  const refinement=cached?cached.refinement:refineCharmanderArmEdges(prepared,sourceBox.getCenter(new THREE.Vector3()).x,options),armRestTrianglesAdded=refinement.addedTriangles;
  for(const {original,geometry} of prepared){
    if(!cached){
    const p=geometry.attributes.position,si=new Uint16Array(p.count*4),sw=new Float32Array(p.count*4);
    for(let v=0;v<p.count;v++){const list=weights(p.getX(v),p.getY(v),p.getZ(v)),sum=list.reduce((n,[,w])=>n+w,0)||1;list.forEach(([i,w],slot)=>{si[v*4+slot]=i;sw[v*4+slot]=w/sum;});}
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));
    }
    const mesh=new THREE.SkinnedMesh(geometry,original.material);mesh.name=original.name+' replacement walk';mesh.frustumCulled=false;
    originals.push({mesh:original,parent:original.parent,at:original.parent.children.indexOf(original)});original.removeFromParent();rig.add(mesh);meshes.push(mesh);owned.push(geometry);
  }
  for(const [legIndex,leg] of legs.entries()){
    if(cached){leg.rest.copy(cached.footRests[legIndex]);leg.target.copy(leg.rest);leg.last.copy(leg.rest);continue;}
    let low=Infinity;const wanted=index(leg.foot);
    for(const geometry of owned){const p=geometry.attributes.position,si=geometry.attributes.skinIndex,sw=geometry.attributes.skinWeight;for(let v=0;v<p.count;v++)for(let k=0;k<4;k++)if(si.array[v*4+k]===wanted&&sw.array[v*4+k]>.99)low=Math.min(low,p.getY(v)-leg.foot.userData.bind.y);}
    if(Number.isFinite(low))leg.rest.y=sourceBox.min.y-low;
    leg.target.copy(leg.rest);leg.last.copy(leg.rest);
  }
  rig.updateWorldMatrix(true,true);const skeleton=new THREE.Skeleton(bones);for(const mesh of meshes)mesh.bind(skeleton);
  const worldScale=new THREE.Vector3(),rootRotation=new THREE.Quaternion(),inverse=new THREE.Quaternion(),q1=new THREE.Quaternion(),q2=new THREE.Quaternion(),desired=new THREE.Quaternion(),deltaQ=new THREE.Quaternion();
  const hip=new THREE.Vector3(),knee=new THREE.Vector3(),direction=new THREE.Vector3(),pole=new THREE.Vector3(),targetDirection=new THREE.Vector3(),scratch=new THREE.Vector3();
  const attention={};
  let phase=0,amount=0,lastTime=null,disposed=false,armMorphs=null;
  function solve(leg){
    hip.copy(leg.upper.position).applyQuaternion(body.quaternion).multiply(body.scale).add(body.position);
    direction.copy(leg.target).sub(hip);const distance=clamp(direction.length(),Math.abs(leg.l1-leg.l2)+1e-5,leg.l1+leg.l2-1e-5);direction.normalize();
    pole.set(leg.side*.10,0,1).addScaledVector(direction,-pole.dot(direction));if(pole.lengthSq()<1e-6)pole.set(0,0,1);pole.normalize();
    const along=(leg.l1**2+distance**2-leg.l2**2)/(2*distance),height=Math.sqrt(Math.max(0,leg.l1**2-along**2));
    knee.copy(hip).addScaledVector(direction,along).addScaledVector(pole,height);
    targetDirection.copy(knee).sub(hip).normalize().applyQuaternion(inverse.copy(body.quaternion).invert());leg.upper.quaternion.setFromUnitVectors(leg.d1,targetDirection);
    q1.copy(body.quaternion).multiply(leg.upper.quaternion);targetDirection.copy(leg.target).sub(knee).normalize().applyQuaternion(inverse.copy(q1).invert());leg.lower.quaternion.setFromUnitVectors(leg.d2,targetDirection);
    q2.copy(q1).multiply(leg.lower.quaternion);leg.foot.quaternion.copy(q2.invert()).multiply(desired);
  }
  function restBones(){for(const b of bones){b.position.copy(b.userData.local);b.quaternion.identity();b.scale.set(1,1,1);}}
  function update({time=0,dt,speed=0,distance,reduced=false,lighter=false,reaction=0,turnRate=0}={}){
    if(disposed)return;
    const step=Number.isFinite(dt)?clamp(dt,0,.1):lastTime===null?0:clamp(time-lastTime,0,.1);lastTime=time;restBones();
    const quiet=reduced||lighter;
    if(quiet){for(const leg of legs){leg.locked=false;leg.initialized=false;leg.stance=true;leg.target.copy(leg.foot.userData.bind);leg.last.copy(leg.target);}amount=0;}
    else{
      model.updateWorldMatrix(true,false);model.getWorldScale(worldScale);model.getWorldQuaternion(rootRotation);
      const scale=Math.abs(worldScale.x)||1,stride=.07,duty=.64,cycleDistance=stride/duty,moving=Math.abs(speed)>.008;
      amount=THREE.MathUtils.lerp(amount,moving?clamp(Math.abs(speed)/.24):0,1-Math.exp(-10*step));
      if(moving){if(Number.isFinite(distance))phase=distance/scale/cycleDistance;else phase+=Math.abs(speed)/scale*step/cycleDistance;}
      const beat=phase*Math.PI*2;
      body.position.y+=Math.sin(beat*2)*.001*amount;body.quaternion.setFromAxisAngle(Z,Math.sin(beat)*.008*amount);
      samplePokemonAttention('charmander',time,amount,turnRate,quiet,attention);
      head.quaternion.setFromAxisAngle(Y,attention.yaw+Math.sin(beat)*.012*amount+reaction*.06).multiply(deltaQ.setFromAxisAngle(X,attention.pitch));
      tail.quaternion.setFromAxisAngle(Y,-Math.sin(beat)*.055*amount+attention.tail);
      for(const leg of legs){
        const p=((phase+leg.phaseOffset)%1+1)%1,stance=p<duty,t=stance?p/duty:(p-duty)/(1-duty);desired.identity();
        if(!leg.initialized){leg.target.copy(leg.rest);leg.last.copy(leg.rest);leg.initialized=true;}
        if(!moving){
          leg.target.copy(leg.last);leg.target.y=THREE.MathUtils.lerp(leg.target.y,leg.rest.y,1-Math.exp(-16*step));leg.stance=leg.target.y-leg.rest.y<.001;
          if(leg.locked){leg.target.copy(model.worldToLocal(scratch.copy(leg.lock)));leg.target.y=leg.rest.y;desired.copy(inverse.copy(rootRotation).invert()).multiply(leg.lockRotation);}
        }else{
          leg.target.copy(leg.rest);leg.target.z+=(stance?stride*(.5-t):stride*(-.5+t*t*(3-2*t)))*amount;
          if(!stance)leg.target.y+=.026*Math.sin(Math.PI*t)*amount;leg.stance=stance;
          if(stance){if(!leg.locked){leg.lock.copy(model.localToWorld(scratch.copy(leg.target)));leg.lockRotation.copy(rootRotation);leg.locked=true;}leg.target.copy(model.worldToLocal(scratch.copy(leg.lock)));desired.copy(inverse.copy(rootRotation).invert()).multiply(leg.lockRotation);}
          else{leg.locked=false;leg.target.lerpVectors(leg.last,leg.target,1-Math.exp(-25*step));}
        }
        leg.last.copy(leg.target);solve(leg);
      }
    }
    // The generated GPU blend shapes follow actual foot travel, including the
    // longer planted phase. Keep the arm bones at rest so their old collar
    // blends cannot pinch when the hands travel farther forward and backward.
    if(armMorphs){
      const left=quiet?0:clamp((legs[0].target.z-legs[0].rest.z)/.035,-1,1);
      const right=quiet?0:clamp((legs[1].target.z-legs[1].rest.z)/.035,-1,1);
      armMorphs.setSwing(-left,-right,{amount,reduced:quiet});
    }
    model.updateMatrixWorld(true);skeleton.update();
  }
  function reset(){phase=0;amount=0;lastTime=null;update({reduced:true});}
  reset();
  // Bake a gradual, bounded-radius bend along each actual arm, rather than a
  // large linear skin blend at one shoulder seam. Arc length is retained along
  // the centre line; broad collar cross-sections rotate with that line. This is
  // a one-time geometry adaptation, not a per-frame vertex deformation.
  const sourceCenterX=sourceBox.getCenter(new THREE.Vector3()).x;
  const relaxedPoint=(input,target)=>relaxedCharmanderPoint(input,target,sourceCenterX);
  let armMorphSources=cached?null:meshes.map(mesh=>({positions:mesh.geometry.attributes.position.array.slice(),normals:mesh.geometry.attributes.normal.array.slice()}));
  const point=new THREE.Vector3(),normal=new THREE.Vector3(),plus=new THREE.Vector3(),minus=new THREE.Vector3(),sample=new THREE.Vector3(),jacobian=new THREE.Matrix3(),normalTransform=new THREE.Matrix3(),columns=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
  if(!cached)for(const mesh of meshes){
    const geometry=mesh.geometry,position=geometry.attributes.position,normals=geometry.attributes.normal;
    for(let v=0;v<position.count;v++){
      point.fromBufferAttribute(position,v);relaxedPoint(point,sample);if(sample.distanceToSquared(point)<1e-20)continue;
      const epsilon=1e-5;
      for(let axis=0;axis<3;axis++){
        plus.copy(point);plus.setComponent(axis,plus.getComponent(axis)+epsilon);relaxedPoint(plus,columns[axis]);
        minus.copy(point);minus.setComponent(axis,minus.getComponent(axis)-epsilon);relaxedPoint(minus,plus);columns[axis].sub(plus).multiplyScalar(1/(2*epsilon));
      }
      jacobian.set(columns[0].x,columns[1].x,columns[2].x,columns[0].y,columns[1].y,columns[2].y,columns[0].z,columns[1].z,columns[2].z);
      normalTransform.copy(jacobian).invert().transpose();
      if(normals){normal.fromBufferAttribute(normals,v).applyMatrix3(normalTransform).normalize();normals.setXYZ(v,normal.x,normal.y,normal.z);}
      position.setXYZ(v,sample.x,sample.y,sample.z);
    }
    position.needsUpdate=true;if(normals)normals.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();
  }
  // Joint centres follow the same curved arm and start at that lowered pose.
  for(const arm of arms)for(const joint of [arm.upper,arm.elbow,arm.wrist]){
    relaxedPoint(joint.userData.bind,point);joint.userData.bind.copy(point);joint.position.copy(point).sub(joint.parent.userData.bind);joint.userData.local.copy(joint.position);
  }
  model.updateMatrixWorld(true);
  skeleton.calculateInverses();skeleton.update();
  armMorphs=cached?reuseCharmanderArmMorphs(meshes,cached.morphStats):createCharmanderArmMorphs(meshes,armMorphSources,relaxedPoint,{centerX:sourceCenterX});
  armMorphSources=null;
  const restBounds=new THREE.Box3().setFromObject(model,true),center=sourceBox.getCenter(new THREE.Vector3());
  if(cacheable&&!cached)charmanderGeometryCache.set(cacheKey,{signature,geometries:meshes.map(mesh=>mesh.geometry.clone()),refinement:{...refinement},footRests:legs.map(leg=>leg.rest.clone()),morphStats:armMorphs.stats});
  // Keep the earlier normalization even though lowered arms narrow the box.
  const anchor=new THREE.Vector3(center.x,sourceBox.min.y,center.z);
  return {supported:true,kind:'biped',anchor,restBounds,recommendedHeight:1.8,armRestTrianglesAdded,armRestRefinementMode:refinement.mode,armRestInputFingerprint:refinement.fingerprint,update,reset,
    get armMotion(){return armMorphs.stats;},
    get feet(){return legs.map(l=>({name:l.foot.name,stance:l.stance,target:l.target.clone(),position:model.worldToLocal(l.foot.getWorldPosition(new THREE.Vector3())),world:l.foot.getWorldPosition(new THREE.Vector3())}));},
    dispose(){if(disposed)return;disposed=true;armMorphs.dispose();rig.removeFromParent();skeleton.dispose();owned.forEach(g=>g.dispose());for(const entry of originals){entry.parent.add(entry.mesh);const children=entry.parent.children;children.splice(children.indexOf(entry.mesh),1);children.splice(entry.at,0,entry.mesh);}},
  };
}
