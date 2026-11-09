import * as THREE from 'three';

export const CHARMANDER_ARM_MORPH_NAMES=Object.freeze([
  'Charmander left forward','Charmander left backward',
  'Charmander right forward','Charmander right backward',
]);
export const CHARMANDER_ARM_MORPH_AMPLITUDE=.027;

/** Bind independently owned, already-generated morph geometry to a new actor.
 * Only influence state is owned here; the caller owns the cloned geometry. */
export function reuseCharmanderArmMorphs(meshes,stats){
  const records=meshes.filter(mesh=>mesh.geometry.morphAttributes.position?.length===4);
  for(const mesh of records)mesh.updateMorphTargets();
  let disposed=false;
  function setSwing(left,right,{amount=1,reduced=false}={}){
    if(disposed)return;
    const weight=reduced?0:clamp(Number.isFinite(amount)?amount:0);
    for(const mesh of records)for(let side=0;side<2;side++){
      const input=side===0?left:right,value=Number.isFinite(input)?Math.max(-1,Math.min(1,input))*weight:0;
      mesh.morphTargetInfluences[side*2]=Math.max(0,value);mesh.morphTargetInfluences[side*2+1]=Math.max(0,-value);
    }
  }
  return {setSwing,reset(){setSwing(0,0);},stats,dispose(){if(disposed)return;setSwing(0,0);disposed=true;records.length=0;}};
}

const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=(value,low,high)=>{const t=clamp((value-low)/(high-low));return t*t*(3-2*t);};

/** Source-anatomical support, wide enough to avoid a pinned collar. The front
 * face, central torso, legs and tail remain outside this generated motion. */
export function charmanderArmMorphGate(point,centerX=0){
  return smooth(Math.abs(point.x-centerX),.105,.20)
    *smooth(point.y,.66,.735)*(1-smooth(point.y,.78,.845))
    *smooth(point.z,.05,.13)*(1-smooth(point.z,.27,.40));
}

/** Generate four relative GPU blend shapes on the already-owned runtime
 * geometry. sources contain the refined source positions/normals before the
 * static rest adaptation. restPoint must evaluate that same final rest map.
 * The caller continues to own geometry and its eventual GPU disposal. */
export function createCharmanderArmMorphs(meshes,sources,restPoint,{centerX=0,amplitude=CHARMANDER_ARM_MORPH_AMPLITUDE}={}){
  if(!Array.isArray(meshes)||!Array.isArray(sources)||meshes.length!==sources.length)throw new TypeError('Arm morph meshes and source buffers must have matching entries.');
  if(typeof restPoint!=='function')throw new TypeError('Arm morphs require the final static rest-map callback.');
  if(!Number.isFinite(amplitude)||amplitude<=0||amplitude>.04)throw new RangeError('Arm morph amplitude must be positive and at most 0.04 source units.');
  const records=[],source=new THREE.Vector3(),normal=new THREE.Vector3(),rest=new THREE.Vector3(),posed=new THREE.Vector3();
  const plus=new THREE.Vector3(),minus=new THREE.Vector3(),columns=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],jacobian=new THREE.Matrix3(),normalMatrix=new THREE.Matrix3();
  let disposed=false,activeVertices=0,attributeBytes=0;
  function motionPoint(input,out,side,direction){
    restPoint(input,out);
    if((input.x-centerX<0?-1:1)===side)out.z+=direction*amplitude*charmanderArmMorphGate(input,centerX);
    return out;
  }
  function targetCofactor(input,sourceNormal,out,side,direction){
    const epsilon=1e-5;
    for(let axis=0;axis<3;axis++){
      plus.copy(input);minus.copy(input);plus.setComponent(axis,plus.getComponent(axis)+epsilon);minus.setComponent(axis,minus.getComponent(axis)-epsilon);
      motionPoint(plus,columns[axis],side,direction);motionPoint(minus,posed,side,direction);columns[axis].sub(posed).multiplyScalar(1/(2*epsilon));
    }
    jacobian.set(columns[0].x,columns[1].x,columns[2].x,columns[0].y,columns[1].y,columns[2].y,columns[0].z,columns[1].z,columns[2].z);
    const determinant=jacobian.determinant();
    if(!Number.isFinite(determinant)||determinant<=1e-10)throw new Error('Arm morph target encountered a folded or singular rest/motion Jacobian.');
    normalMatrix.copy(jacobian).invert().transpose();return out.copy(sourceNormal).applyMatrix3(normalMatrix).multiplyScalar(determinant);
  }
  try{
    for(let meshIndex=0;meshIndex<meshes.length;meshIndex++){
      const mesh=meshes[meshIndex],geometry=mesh.geometry,position=geometry?.attributes.position,baseNormal=geometry?.attributes.normal,input=sources[meshIndex];
      if(!position||!baseNormal||position.itemSize!==3||baseNormal.itemSize!==3||!input?.positions||!input?.normals||input.positions.length!==position.count*3||input.normals.length!==position.count*3)throw new TypeError('Arm morph source buffers must match each runtime position/normal buffer.');
      if(Object.values(geometry.morphAttributes).some(attributes=>attributes.length))throw new Error('Arm morph generation expects geometry without existing blend shapes.');
      const gates=new Float32Array(position.count),baseCofactorLengths=new Float64Array(position.count);let active=0;
      for(let vertex=0;vertex<position.count;vertex++){
        source.fromArray(input.positions,vertex*3);gates[vertex]=charmanderArmMorphGate(source,centerX);
        if(gates[vertex]>0){
          normal.fromArray(input.normals,vertex*3);targetCofactor(source,normal,rest,source.x-centerX<0?-1:1,0);baseCofactorLengths[vertex]=rest.length();
          if(baseCofactorLengths[vertex]<1e-10)throw new Error('Arm morph rest normal has zero cofactor length.');active++;
        }
      }
      if(!active)continue;
      const positions=[],normals=[];
      for(let target=0;target<4;target++){
        const side=target<2?-1:1,direction=target%2===0?1:-1,positionDelta=new Float32Array(position.count*3),normalDelta=new Float32Array(position.count*3);
        for(let vertex=0;vertex<position.count;vertex++){
          if(!gates[vertex])continue;source.fromArray(input.positions,vertex*3);if((source.x-centerX<0?-1:1)!==side)continue;
          // The full target shares its exact rest surface. Only its Z delta is
          // uploaded, so neither source positions nor the accepted rest move.
          positionDelta[vertex*3+2]=direction*amplitude*gates[vertex];
          // A Z-only displacement changes one Jacobian row. Its cofactor normal
          // is therefore linear in the signed amplitude. Retain its length
          // relative to the rest cofactor rather than normalizing each target:
          // the GPU blend is then exact at intermediate weights, and Three.js
          // normalizes the resulting normal later in the shader pipeline.
          normal.fromArray(input.normals,vertex*3);targetCofactor(source,normal,rest,side,direction).multiplyScalar(1/baseCofactorLengths[vertex]);
          normalDelta[vertex*3]=rest.x-baseNormal.getX(vertex);normalDelta[vertex*3+1]=rest.y-baseNormal.getY(vertex);normalDelta[vertex*3+2]=rest.z-baseNormal.getZ(vertex);
        }
        const p=new THREE.Float32BufferAttribute(positionDelta,3),n=new THREE.Float32BufferAttribute(normalDelta,3);p.name=n.name=CHARMANDER_ARM_MORPH_NAMES[target];positions.push(p);normals.push(n);attributeBytes+=positionDelta.byteLength+normalDelta.byteLength;
      }
      const record={mesh,geometry,previousAttributes:geometry.morphAttributes,previousRelative:geometry.morphTargetsRelative,previousInfluences:mesh.morphTargetInfluences,previousDictionary:mesh.morphTargetDictionary};
      records.push(record);geometry.morphAttributes={position:positions,normal:normals};geometry.morphTargetsRelative=true;mesh.updateMorphTargets();activeVertices+=active;
    }
  }catch(error){dispose();throw error;}
  function setSwing(left,right,{amount=1,reduced=false}={}){
    if(disposed)return;
    const weight=reduced?0:clamp(Number.isFinite(amount)?amount:0);
    for(const record of records){const influences=record.mesh.morphTargetInfluences;for(let side=0;side<2;side++){const input=side===0?left:right,value=Number.isFinite(input)?Math.max(-1,Math.min(1,input))*weight:0;influences[side*2]=Math.max(0,value);influences[side*2+1]=Math.max(0,-value);}}
  }
  function reset(){setSwing(0,0);}
  function dispose(){
    if(disposed)return;disposed=true;
    for(const record of records){record.geometry.morphAttributes=record.previousAttributes;record.geometry.morphTargetsRelative=record.previousRelative;if(record.mesh.geometry===record.geometry){record.mesh.morphTargetInfluences=record.previousInfluences;record.mesh.morphTargetDictionary=record.previousDictionary;}}
    records.length=0;
  }
  return {setSwing,reset,dispose,stats:Object.freeze({meshes:records.length,activeVertices,targetsPerMesh:4,attributeBytes,amplitude})};
}
