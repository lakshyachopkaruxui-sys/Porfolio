/**
 * Bone-based adaptation of the supplied TS3 Woody mesh to the existing bicycle.
 * Input contacts are in the bicycle lean rig's local coordinates. This module
 * owns imported bone transforms; movement, cadence and contact timing stay with
 * the rider controller. The GLB's original geometry and materials are retained.
 */
export function createWoodyRig(THREE, model) {
  const group=new THREE.Group();group.name='Woody character';
  const placement=new THREE.Group();placement.name='Woody fitted placement';group.add(placement);
  const MODEL_SCALE=1.10;
  placement.scale.setScalar(MODEL_SCALE);placement.rotation.y=Math.PI;placement.add(model);
  const allBones=[],rest=new Map(),meshes=[];
  model.traverse(object=>{
    if(object.isBone){allBones.push(object);rest.set(object,{position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone()});}
    if(object.isMesh){meshes.push(object);object.castShadow=true;object.receiveShadow=true;object.frustumCulled=false;}
  });
  const find=suffix=>{
    const bone=allBones.find(item=>item.name===`ValveBipedBip01_${suffix}_Woody_arm`);
    if(!bone)throw new Error(`Woody rig is missing ${suffix}`);
    return bone;
  };
  const pelvis=find('Pelvis'),spine=find('Spine'),head=find('Head1'),neck=find('Neck1');
  const chains=[[-1,'L'],[1,'R']].map(([side,prefix])=>({side,prefix,
    thigh:find(`${prefix}_Thigh`),calf:find(`${prefix}_Calf`),foot:find(`${prefix}_Foot`),toe:find(`${prefix}_Toe0`),
    clavicle:find(`${prefix}_Clavicle`),upperArm:find(`${prefix}_UpperArm`),forearm:find(`${prefix}_Forearm`),hand:find(`${prefix}_Hand`),
  }));
  const up=new THREE.Vector3(0,1,0),scratch=new THREE.Vector3(),worldQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion();
  const a=new THREE.Vector3(),b=new THREE.Vector3(),direction=new THREE.Vector3(),bend=new THREE.Vector3(),joint=new THREE.Vector3();
  const deltaQ=new THREE.Quaternion(),targetQ=new THREE.Quaternion(),groupQ=new THREE.Quaternion(),bodyInverse=new THREE.Quaternion();
  const goal=new THREE.Vector3(),pole=new THREE.Vector3(),targetLocal=new THREE.Vector3(),contactActual=new THREE.Vector3();
  const rotationAxis=new THREE.Vector3(),rotationDelta=new THREE.Quaternion();
  const supportAnkle=new THREE.Vector3(),supportHip=new THREE.Vector3();
  const desiredHips=new THREE.Vector3(),currentHips=new THREE.Vector3(),shift=new THREE.Vector3();
  group.updateMatrixWorld(true);
  const bonePosition=bone=>bone.getWorldPosition(new THREE.Vector3());
  // A neutral head removes the asset's pre-posed sideways glance. Its eyes are
  // children of this bone, so they travel with the same transform.
  const neutralHead=neck.getWorldQuaternion(new THREE.Quaternion());

  function worldToRig(vector){return group.worldToLocal(vector);}
  function rigToWorld(vector){return group.localToWorld(vector);}
  function setWorldRotation(bone,rotation){
    bone.parent.getWorldQuaternion(parentQ).invert();
    bone.quaternion.copy(parentQ).multiply(rotation).normalize();
    bone.updateWorldMatrix(false,true);
  }
  function alignChild(bone,child,target){
    bone.getWorldPosition(a);child.getWorldPosition(b);
    direction.copy(b).sub(a).normalize();bend.copy(target).sub(a).normalize();
    deltaQ.setFromUnitVectors(direction,bend);
    bone.getWorldQuaternion(worldQ);worldQ.premultiply(deltaQ);
    setWorldRotation(bone,worldQ);
  }
  function rotateInRig(bone,x,y,z,angle){
    rotationAxis.set(x,y,z).applyQuaternion(groupQ);
    rotationDelta.setFromAxisAngle(rotationAxis,angle);
    bone.getWorldQuaternion(worldQ).premultiply(rotationDelta);setWorldRotation(bone,worldQ);
  }
  function solveTwoBone(first,middle,end,target,bendDirection,lengths){
    first.getWorldPosition(a);direction.copy(target).sub(a);
    const requested=direction.length(),total=lengths[0]+lengths[1];
    if(requested<1e-8)direction.set(0,-1,0);else direction.divideScalar(requested);
    const distance=Math.min(Math.max(requested,Math.abs(lengths[0]-lengths[1])+1e-6),total-1e-6);
    const along=(lengths[0]**2-lengths[1]**2+distance**2)/(2*distance);
    const height=Math.sqrt(Math.max(0,lengths[0]**2-along**2));
    bend.copy(bendDirection).addScaledVector(direction,-bendDirection.dot(direction));
    if(bend.lengthSq()<1e-7)bend.set(1,0,0).addScaledVector(direction,-direction.x);
    bend.normalize();joint.copy(a).addScaledVector(direction,along).addScaledVector(bend,height);
    alignChild(first,middle,joint);alignChild(middle,end,target);
    return Math.max(0,requested-total,Math.abs(lengths[0]-lengths[1])-requested);
  }

  function calibrateSole(chain){
    const vertices=[];let lowest=Infinity;
    for(const mesh of meshes){
      if(!mesh.isSkinnedMesh)continue;
      mesh.skeleton.update();
      const positions=mesh.geometry.getAttribute('position'),weights=mesh.geometry.getAttribute('skinWeight'),indices=mesh.geometry.getAttribute('skinIndex');
      if(!weights||!indices)continue;
      for(let i=0;i<positions.count;i++){
        let influence=0;
        for(let channel=0;channel<4;channel++){
          const bone=mesh.skeleton.bones[indices.getComponent(i,channel)];
          if(bone===chain.foot||bone===chain.toe)influence+=weights.getComponent(i,channel);
        }
        if(influence<.65)continue;
        const vertex=new THREE.Vector3().fromBufferAttribute(positions,i);mesh.applyBoneTransform(i,vertex);mesh.localToWorld(vertex);
        vertices.push(vertex);lowest=Math.min(lowest,vertex.y);
      }
    }
    if(!vertices.length)throw new Error(`Woody ${chain.prefix} boot has no weighted sole vertices`);
    const soleBounds=new THREE.Box3();vertices.filter(point=>point.y<=lowest+.012).forEach(point=>soleBounds.expandByPoint(point));
    const contact=soleBounds.getCenter(new THREE.Vector3());contact.y=lowest;
    // Store a bone-local contact so its calibration follows scale and rotation.
    chain.soleOffset=chain.foot.worldToLocal(contact.clone());
    chain.neutralFoot=chain.foot.getWorldQuaternion(new THREE.Quaternion());
    chain.soleCalibration={minimumY:lowest,point:contact.toArray(),boneLocal:chain.soleOffset.toArray()};
  }

  for(const chain of chains){
    const p=bonePosition(chain.thigh),k=bonePosition(chain.calf),f=bonePosition(chain.foot),s=bonePosition(chain.upperArm),e=bonePosition(chain.forearm),w=bonePosition(chain.hand);
    chain.legLengths=[p.distanceTo(k),k.distanceTo(f)];chain.armLengths=[s.distanceTo(e),e.distanceTo(w)];
    calibrateSole(chain);
    chain.handContact=new THREE.Vector3(-chain.side*1.2,-.27,0);
    chain.neutralHand=new THREE.Quaternion().setFromAxisAngle(up,-chain.side*Math.PI/2);
    chain.fingers=allBones.filter(bone=>bone.name.startsWith(`ValveBipedBip01_${chain.prefix}_Finger`));
  }
  const measurements={modelScale:MODEL_SCALE,legLengths:chains.map(c=>({side:c.side,lengths:[...c.legLengths]})),armLengths:chains.map(c=>({side:c.side,lengths:[...c.armLengths]})),soleCalibration:chains.map(c=>({side:c.side,...c.soleCalibration})),handCalibration:chains.map(c=>({side:c.side,boneLocal:c.handContact.toArray()})),hands:[],feet:[],maxReachError:0,supportCrouch:0};

  function update(pose){
    if(!pose?.hips||!pose?.shoulders)return;
    for(const bone of allBones){const saved=rest.get(bone);bone.position.copy(saved.position);bone.quaternion.copy(saved.quaternion);bone.scale.copy(saved.scale);}
    placement.position.set(0,0,0);
    const bodyDirection=scratch.copy(pose.shoulders).sub(pose.hips);
    if(pose.bodyQuaternion)bodyDirection.applyQuaternion(bodyInverse.copy(pose.bodyQuaternion).invert());
    const pitch=Math.atan2(bodyDirection.z,bodyDirection.y);
    placement.quaternion.setFromEuler(new THREE.Euler(pitch,Math.PI,0,'XYZ'));
    if(pose.bodyQuaternion)placement.quaternion.premultiply(pose.bodyQuaternion);
    group.updateWorldMatrix(true,true);
    currentHips.copy(bonePosition(chains[0].thigh)).add(bonePosition(chains[1].thigh)).multiplyScalar(.5);worldToRig(currentHips);
    // Imported trouser geometry sits above its thigh origins. Lower the riding
    // pose slightly so the actual underside meets the saddle; release that fit
    // offset as the rider steps down, rather than adding to the controller's drop.
    desiredHips.copy(pose.hips);desiredHips.y-=.030*(1-(pose.plantProgress||0));
    shift.copy(desiredHips).sub(currentHips);placement.position.copy(shift);
    group.updateWorldMatrix(true,true);group.getWorldQuaternion(groupQ);
    // At a bridge edge the support surface can sit below the bicycle's wheels.
    // Lower the pelvis only as far as the imported leg needs, leaving a little
    // knee bend instead of stretching a bone or hovering above the ground.
    measurements.supportCrouch=0;
    for(const chain of chains){
      const foot=pose.feet?.find(item=>item.side===chain.side);
      if(!foot?.planted)continue;
      targetQ.copy(foot.rotation||new THREE.Quaternion()).multiply(chain.neutralFoot).premultiply(groupQ);
      chain.foot.getWorldScale(scratch);
      targetLocal.copy(chain.soleOffset).multiply(scratch).applyQuaternion(targetQ);
      supportAnkle.copy(foot.contact);rigToWorld(supportAnkle);supportAnkle.sub(targetLocal);worldToRig(supportAnkle);
      chain.thigh.getWorldPosition(supportHip);worldToRig(supportHip);
      const horizontal=(supportHip.x-supportAnkle.x)**2+(supportHip.z-supportAnkle.z)**2;
      const reach=chain.legLengths[0]+chain.legLengths[1]-.012;
      const availableHeight=Math.sqrt(Math.max(0,reach**2-horizontal));
      measurements.supportCrouch=Math.max(measurements.supportCrouch,supportHip.y-supportAnkle.y-availableHeight);
    }
    if(measurements.supportCrouch>0){placement.position.y-=measurements.supportCrouch;group.updateWorldMatrix(true,true);}
    // A rider reaches into a turn with their torso and shoulders; fixing the
    // chest while turning the bar would pull the far hand beyond its arm length.
    const gripRotation=pose.hands?.[0]?.rotation;
    const steering=gripRotation?2*Math.atan2(gripRotation.y,gripRotation.w):0;
    const turnAmount=Math.min(1.2,Math.abs(steering));
    // Recover most of the added turn lean as the rider stands over the frame,
    // keeping the face clear of the bar while the shoulders retain grip reach.
    rotateInRig(spine,1,0,0,-turnAmount*.55*(1-.8*(pose.plantProgress||0)));
    rotateInRig(spine,0,1,0,steering*.22);
    // Ease shoulder protraction as weight transfers to the standing foot. This
    // keeps the near hand outside the arm's minimum reach with a turned bar.
    for(const chain of chains)rotateInRig(chain.clavicle,0,1,0,chain.side*turnAmount*.45*(1-.4*(pose.plantProgress||0)));
    measurements.hands=[];measurements.feet=[];measurements.maxReachError=0;

    for(const chain of chains){
      const foot=pose.feet?.find(item=>item.side===chain.side),hand=pose.hands?.find(item=>item.side===chain.side);
      if(foot){
        targetQ.copy(foot.rotation||new THREE.Quaternion()).multiply(chain.neutralFoot).premultiply(groupQ);
        // Bone scale includes the GLB's authoring-unit conversion as well as our
        // fitted uniform scale. The contact offset was measured in bone units.
        chain.foot.getWorldScale(scratch);targetLocal.copy(chain.soleOffset).multiply(scratch).applyQuaternion(targetQ);
        goal.copy(foot.contact);rigToWorld(goal);goal.sub(targetLocal);
        pole.set(chain.side*.15,.05,-1).applyQuaternion(groupQ);
        const worldScale=group.getWorldScale(scratch).x;
        const reach=solveTwoBone(chain.thigh,chain.calf,chain.foot,goal,pole,chain.legLengths.map(length=>length*worldScale));
        setWorldRotation(chain.foot,targetQ);
        contactActual.copy(chain.soleOffset);chain.foot.localToWorld(contactActual);worldToRig(contactActual);
        const error=contactActual.distanceTo(foot.contact);
        measurements.feet.push({side:chain.side,error,contact:contactActual.toArray(),target:foot.contact.toArray(),planted:foot.planted||0,reachError:reach/worldScale});
        measurements.maxReachError=Math.max(measurements.maxReachError,reach/worldScale);
      }
      if(hand){
        targetQ.copy(hand.rotation||new THREE.Quaternion()).multiply(chain.neutralHand).premultiply(groupQ);
        chain.hand.getWorldScale(scratch);targetLocal.copy(chain.handContact).multiply(scratch).applyQuaternion(targetQ);
        goal.copy(hand.target);rigToWorld(goal);goal.sub(targetLocal);
        pole.set(chain.side*.65,-.15,.5).applyQuaternion(groupQ);
        const worldScale=group.getWorldScale(scratch).x;
        const reach=solveTwoBone(chain.upperArm,chain.forearm,chain.hand,goal,pole,chain.armLengths.map(length=>length*worldScale));
        setWorldRotation(chain.hand,targetQ);
        for(const finger of chain.fingers){
          const suffix=finger.name.split('Finger')[1].split('_')[0];
          const angle=suffix[0]==='0'?.4:suffix.length===1?.75:suffix.length===2?1.0:.65;
          finger.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),chain.side*angle);
        }
        contactActual.copy(chain.handContact);chain.hand.localToWorld(contactActual);worldToRig(contactActual);
        const error=contactActual.distanceTo(hand.target);
        measurements.hands.push({side:chain.side,error,contact:contactActual.toArray(),target:hand.target.toArray(),reachError:reach/worldScale});
        measurements.maxReachError=Math.max(measurements.maxReachError,reach/worldScale);
      }
    }
    targetQ.setFromAxisAngle(up,pose.headYaw||0).multiply(neutralHead).premultiply(groupQ);setWorldRotation(head,targetQ);
    // SkinnedMesh overrides updateMatrixWorld to refresh bindMatrixInverse.
    // updateWorldMatrix alone updates bones but leaves CPU vertex inspection stale.
    group.updateMatrixWorld(true);for(const mesh of meshes)if(mesh.isSkinnedMesh)mesh.skeleton.update();
  }
  function dispose(){
    const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
    for(const mesh of meshes){geometries.add(mesh.geometry);if(mesh.isSkinnedMesh)skeletons.add(mesh.skeleton);for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){materials.add(material);Object.values(material).forEach(value=>{if(value?.isTexture)textures.add(value);});}}
    geometries.forEach(item=>item.dispose());materials.forEach(item=>item.dispose());textures.forEach(item=>item.dispose());skeletons.forEach(item=>item.dispose());group.removeFromParent();
  }
  return {group,update,dispose,get metrics(){return measurements;},bones:{pelvis,head,chains}};
}
