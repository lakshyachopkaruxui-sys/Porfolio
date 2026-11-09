import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createWelcomeGarden} from './welcome-garden.js';

const ease=value=>{const x=Math.max(0,Math.min(1,value));return x*x*x*(x*(x*6-15)+10);};

/** Two relaxed sweeps, then a complete return to rest. Seconds, not frames. */
export function sampleWoodyGreeting(time){
  const t=Number.isFinite(time)?Math.max(0,time):0;
  const lift=ease((t-.12)/.5)*(1-ease((t-2.05)/.55));
  const progress=Math.max(0,Math.min(1,(t-.62)/1.25));
  const envelope=ease(progress/.12)*ease((1-progress)/.12);
  const sweep=envelope>0?Math.sin(progress*Math.PI*4)*envelope:0;
  return {lift,sweep,waveAngle:.50*sweep};
}

/** A separately posed host. Geometry, materials and textures remain source-owned. */
export function createWoodyWelcome(THREE,sourceModel){
  if(!sourceModel)throw new Error('The welcome host needs the loaded Woody model.');
  const scene=new THREE.Scene();scene.name='Woody welcome portrait';scene.background=new THREE.Color('#ffffff');
  const model=clone(sourceModel),placement=new THREE.Group();placement.name='Welcome host placement';placement.add(model);scene.add(placement);
  const bones=[],meshes=[],skeletons=new Set();
  model.traverse(object=>{
    if(object.isBone)bones.push(object);
    if(object.isMesh){meshes.push(object);object.frustumCulled=false;object.castShadow=false;object.receiveShadow=false;}
    if(object.skeleton)skeletons.add(object.skeleton);
  });
  // The source may already be fitted to the bicycle. Restore only cloned bones
  // from inverse bind matrices before creating the independent standing pose.
  skeletons.forEach(skeleton=>skeleton.pose());scene.updateMatrixWorld(true);
  const find=suffix=>{
    const bone=bones.find(item=>item.name===`ValveBipedBip01_${suffix}_Woody_arm`);
    if(!bone)throw new Error(`Woody welcome rig is missing ${suffix}`);
    return bone;
  };
  const pelvis=find('Pelvis'),head=find('Head1'),neck=find('Neck1');
  const rest=new Map(bones.map(bone=>[bone,{position:bone.position.clone(),quaternion:bone.quaternion.clone(),scale:bone.scale.clone()}]));
  const neutralHead=neck.getWorldQuaternion(new THREE.Quaternion());
  // The supplied eyeball objects have a baked sideways glance, independent of
  // the head bone. Keep their pivots/scale and correct only this host's clones.
  const eyes=[];
  head.traverse(object=>{
    if(!object.isMesh&&/^left_eye\d+$/.test(object.name))eyes.push({object,rest:object.quaternion.clone()});
  });
  const centre=pelvis.getWorldPosition(new THREE.Vector3());placement.position.set(-centre.x,0,-centre.z);scene.updateMatrixWorld(true);
  const arms=[[-1,'R'],[1,'L']].map(([side,prefix])=>{
    const upper=find(`${prefix}_UpperArm`),lower=find(`${prefix}_Forearm`),hand=find(`${prefix}_Hand`);
    const p=upper.getWorldPosition(new THREE.Vector3()),e=lower.getWorldPosition(new THREE.Vector3()),w=hand.getWorldPosition(new THREE.Vector3());
    return {side,prefix,upper,lower,hand,lengths:[p.distanceTo(e),e.distanceTo(w)],fingers:bones.filter(bone=>bone.name.startsWith(`ValveBipedBip01_${prefix}_Finger`))};
  });
  const a=new THREE.Vector3(),b=new THREE.Vector3(),direction=new THREE.Vector3(),bend=new THREE.Vector3(),joint=new THREE.Vector3(),goal=new THREE.Vector3();
  const delta=new THREE.Quaternion(),world=new THREE.Quaternion(),parent=new THREE.Quaternion(),handRotation=new THREE.Quaternion(),headRotation=new THREE.Quaternion();
  const zAxis=new THREE.Vector3(0,0,1),xAxis=new THREE.Vector3(1,0,0),yAxis=new THREE.Vector3(0,1,0),pole=new THREE.Vector3(),gaze=new THREE.Vector3();
  const portraitDirection=new THREE.Vector3(0,0,1);
  let gardenView=false;
  function setWorldRotation(bone,quaternion){
    bone.parent.getWorldQuaternion(parent).invert();bone.quaternion.copy(parent).multiply(quaternion).normalize();bone.updateWorldMatrix(false,true);
  }
  function aim(bone,child,target){
    bone.getWorldPosition(a);child.getWorldPosition(b);direction.copy(b).sub(a).normalize();bend.copy(target).sub(a).normalize();
    delta.setFromUnitVectors(direction,bend);bone.getWorldQuaternion(world).premultiply(delta);setWorldRotation(bone,world);
  }
  function armTo(arm,target,raised=0){
    arm.upper.getWorldPosition(a);direction.copy(target).sub(a);const requested=direction.length();direction.normalize();
    const [upper,lower]=arm.lengths,distance=THREE.MathUtils.clamp(requested,Math.abs(upper-lower)+1e-5,upper+lower-1e-5);
    const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
    // Let the elbow hang below the waving hand instead of lifting the whole
    // upper arm into a rigid salute. The resting pose retains its old pole.
    pole.set(arm.side*(1-.5*raised),.05-1.05*raised,-.2);bend.copy(pole).addScaledVector(direction,-pole.dot(direction)).normalize();
    joint.copy(a).addScaledVector(direction,along).addScaledVector(bend,height);aim(arm.upper,arm.lower,joint);aim(arm.lower,arm.hand,target);
    return Math.abs(distance-requested);
  }
  const smooth=value=>{const x=THREE.MathUtils.clamp(value,0,1);return x*x*(3-2*x);};
  let elapsed=0,currentPhase='welcome',disposed=false,lastReduced=false,lastWave=0,lastReach=0,lastSweep=0;
  function pose(phaseTime,reduced,phase,speaking){
    for(const bone of bones){const saved=rest.get(bone);bone.position.copy(saved.position);bone.quaternion.copy(saved.quaternion);bone.scale.copy(saved.scale);}
    scene.updateMatrixWorld(true);
    const gesture=sampleWoodyGreeting(phaseTime);
    const greeting=phase==='departure'
      ? .65*smooth(phaseTime/.25)*(1-.25*smooth((phaseTime-.65)/.3))
      : gesture.lift;
    const lift=reduced?0:greeting;
    const wave=reduced||phase==='departure'?0:gesture.waveAngle;
    lastWave=lift;lastSweep=reduced?0:gesture.sweep;lastReach=0;
    for(const arm of arms){
      const raised=arm.side===-1?lift:0;
      // Establish a relaxed raised pose with enough space outside the face
      // for the whole forearm/hand pair to sweep about the elbow.
      goal.set(arm.side*(.225+.225*raised),.745+.745*raised,.055+.085*raised);
      lastReach=Math.max(lastReach,armTo(arm,goal,raised));
      // The bind palm is edge-on to the camera. Turn it toward the visitor
      // before the shared sweep; there is no independent wrist oscillation.
      handRotation.setFromAxisAngle(zAxis,-arm.side*Math.PI/2);
      if(raised){
        world.setFromAxisAngle(zAxis,arm.side*Math.PI/2);
        world.premultiply(delta.setFromAxisAngle(yAxis,Math.PI/2));
        // Align the hand's longitudinal axis with elbow-to-wrist direction.
        // Sharing an oscillation alone would retain a visibly bent wrist.
        arm.hand.getWorldPosition(a);arm.lower.getWorldPosition(b);
        direction.copy(a).sub(b).normalize();bend.set(-1,0,0).applyQuaternion(world).normalize();
        world.premultiply(delta.setFromUnitVectors(bend,direction));
        handRotation.slerp(world,raised);
      }
      setWorldRotation(arm.hand,handRotation);
      for(const finger of arm.fingers){
        const digit=finger.name.split('Finger')[1].split('_')[0];
        const curl=(digit[0]==='0'?.16:.10)*(1-raised);
        delta.setFromAxisAngle(zAxis,-arm.side*curl);finger.quaternion.multiply(delta);
      }
      if(raised&&wave){
        // One world-space elbow rotation carries the forearm and all its
        // descendants together. The wrist keeps exactly the same local pose,
        // so hand and forearm share angle, direction, and timing.
        arm.lower.getWorldQuaternion(world);
        world.premultiply(delta.setFromAxisAngle(zAxis,wave*raised));
        setWorldRotation(arm.lower,world);
      }
    }
    const nod=!reduced&&speaking?Math.sin(phaseTime*3.2)*.018:0;
    headRotation.copy(neutralHead).premultiply(delta.setFromAxisAngle(xAxis,nod));
    if(gardenView)headRotation.premultiply(delta.setFromUnitVectors(zAxis,portraitDirection));
    if(!reduced&&phase==='welcome')headRotation.premultiply(delta.setFromAxisAngle(zAxis,-.025*lift));
    if(!reduced&&phase==='departure')headRotation.premultiply(delta.setFromAxisAngle(yAxis,-.06*smooth(phaseTime/.4)));
    setWorldRotation(head,headRotation);
    for(const eye of eyes){
      eye.object.quaternion.copy(eye.rest);eye.object.updateWorldMatrix(false,true);
      eye.object.getWorldQuaternion(world);
      // Iris centres are on local +Y in the supplied UV-mapped eyeball.
      // Orthographic portrait rays are parallel: look along +Z, not down at
      // the camera's full-body framing centre. Compensate the tiny head nod.
      gaze.copy(yAxis).applyQuaternion(world).normalize();
      delta.setFromUnitVectors(gaze,portraitDirection);world.premultiply(delta);
      setWorldRotation(eye.object,world);
    }
    scene.updateMatrixWorld(true);skeletons.forEach(skeleton=>skeleton.update());
  }
  // Establish grounded boots from the actual skinned geometry, not a guessed
  // pivot height. None of the greeting motions changes the leg transforms.
  pose(0,true,'welcome',false);
  const standingBounds=new THREE.Box3().setFromObject(model,true);
  placement.position.y-=standingBounds.min.y;scene.updateMatrixWorld(true);skeletons.forEach(skeleton=>skeleton.update());

  const shadowGeometry=new THREE.CircleGeometry(.31,48),shadowMaterial=new THREE.MeshBasicMaterial({color:'#d4d4d4',transparent:true,opacity:.23,depthWrite:false});
  const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.name='Welcome ground contact';shadow.rotation.x=-Math.PI/2;shadow.scale.set(1,.55,1);shadow.position.set(0,.001,.055);scene.add(shadow);
  const hemisphere=new THREE.HemisphereLight('#ffffff','#b5b5b5',1.9);scene.add(hemisphere);
  const key=new THREE.DirectionalLight('#fffaf5',2.1);key.position.set(-3,4,5);scene.add(key);
  const fill=new THREE.DirectionalLight('#f2f6ff',.65);fill.position.set(3,2,1);scene.add(fill);
  const camera=new THREE.OrthographicCamera(-.8,.8,1.1,-1.1,.1,12);camera.name='Welcome full-body camera';camera.position.set(0,1.01,5);camera.lookAt(0,1.01,0);
  let garden=null,gardenOffsetX=0;
  const pointerTarget=new THREE.Vector2(),pointerCurrent=new THREE.Vector2(),cameraAim=new THREE.Vector3(0,1,0);
  function applyGardenCamera(){
    camera.position.set(gardenOffsetX+.20+pointerCurrent.x*.15,cameraAim.y+1.05-pointerCurrent.y*.07,5);
    camera.lookAt(cameraAim);
    portraitDirection.copy(camera.position).sub(cameraAim).normalize();
  }
  function resize(width,height,{framing='full'}={}){
    const aspect=Math.max(.1,Math.min(10,Math.max(1,width)/Math.max(1,height)));
    const entrance=framing==='entrance';
    gardenView=framing==='garden'||entrance;
    if(gardenView&&!garden){garden=createWelcomeGarden(THREE);scene.add(garden.group);}
    if(garden)garden.group.visible=gardenView;
    hemisphere.intensity=gardenView?1.25:1.9;
    hemisphere.color.set(gardenView?'#e5f1fa':'#ffffff');
    hemisphere.groundColor.set(gardenView?'#a8b197':'#b5b5b5');
    key.intensity=gardenView?1.55:2.1;key.color.set(gardenView?'#fff2d9':'#fffaf5');
    fill.intensity=gardenView?.3:.65;
    shadowMaterial.color.set(gardenView?'#526a51':'#d4d4d4');shadowMaterial.opacity=gardenView?.18:.23;
    shadow.position.y=gardenView?.008:.001;
    if(gardenView){
      const viewHeight=Math.max(entrance?3.65:2.85,2.4/aspect),viewWidth=viewHeight*aspect;
      gardenOffsetX=entrance?-viewWidth*.22:0;
      cameraAim.set(gardenOffsetX,entrance?1.12:1,0);
      pointerCurrent.set(0,0);applyGardenCamera();
      camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();
      return;
    }
    portraitDirection.copy(zAxis);
    const poster=framing==='poster'||framing==='hero';
    const hero=framing==='hero';
    // The full wave is asymmetric: reserve its left-hand reach without
    // wasting the same empty width on the right. Frame the camera, not the rig.
    const viewHeight=Math.max(hero?1.00:poster?1.30:2.19,(hero?1.56:poster?1.18:1.56)/aspect),viewWidth=viewHeight*aspect;
    const centerX=hero?0:poster?-.23:0,centerY=poster?1.995-viewHeight/2:1.01;
    camera.position.set(centerX,centerY,5);camera.lookAt(centerX,centerY,0);
    camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();
  }
  function update({dt=0,reduced=false,phase='welcome',speaking=false}={}){
    if(disposed)return;
    if(phase!==currentPhase){currentPhase=phase;elapsed=0;}
    const step=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.12));
    elapsed+=step;lastReduced=Boolean(reduced);
    if(gardenView){
      if(lastReduced)pointerCurrent.set(0,0);
      else pointerCurrent.lerp(pointerTarget,1-Math.exp(-step*4));
      applyGardenCamera();
    }
    pose(elapsed,lastReduced,currentPhase,Boolean(speaking));
  }
  function dispose(){
    if(disposed)return;disposed=true;model.removeFromParent();skeletons.forEach(skeleton=>skeleton.dispose());garden?.dispose();shadowGeometry.dispose();shadowMaterial.dispose();scene.clear();
  }
  resize(420,580);
  function setPointer(x=0,y=0){pointerTarget.set(THREE.MathUtils.clamp(Number.isFinite(x)?x:0,-1,1),THREE.MathUtils.clamp(Number.isFinite(y)?y:0,-1,1));}
  function greet(){if(disposed||lastReduced||currentPhase!=='welcome'||elapsed<2.7)return false;elapsed=0;pose(0,false,'welcome',false);return true;}
  return {scene,camera,model,resize,update,dispose,setPointer,greet,
    get canGreet(){return !disposed&&!lastReduced&&currentPhase==='welcome'&&elapsed>=2.7;},
    get metrics(){
    const box=new THREE.Box3().setFromObject(model,true);
    return {phase:currentPhase,elapsed,reduced:lastReduced,wave:lastWave,sweep:lastSweep,maxReachError:lastReach,bounds:{min:box.min.toArray(),max:box.max.toArray()},boneCount:bones.length,meshCount:meshes.length,garden:garden?.resourceCounts||null,disposed};
  }};
}
