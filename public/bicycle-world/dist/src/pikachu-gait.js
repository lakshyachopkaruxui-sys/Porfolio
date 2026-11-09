import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createPawContacts} from './pokemon-paw-contacts.js';
import {samplePokemonAttention} from './pokemon-attention.js';

const smooth=(a,b,v)=>THREE.MathUtils.smoothstep(v,a,b);
const point=(x,y,z)=>new THREE.Vector3(x,y,z);
const BOUND_DUTY=.36,BOUND_STRIDE=.144;

// Cache only unrendered CPU templates. Every rider owns a geometry clone and
// skeleton; disposing one cannot invalidate another or the imported source.
const preparedGeometryCache=new WeakMap();
const sourceSignature=inputs=>JSON.stringify(inputs.map(({mesh,relative})=>[
  mesh.geometry.uuid,mesh.name,relative.elements,
  mesh.geometry.index?.version??null,
  Object.entries(mesh.geometry.attributes).map(([name,attribute])=>[name,attribute.version,attribute.count,attribute.itemSize]),
]));

/** One low mouse-like bound: hind push, flight, fore landing, recovery flight.
 * The two paws in each pair share exactly the same timing. */
export function pikachuBoundPose(phase){
  const p=((phase%1)+1)%1,hind=p<BOUND_DUTY,fore=p>=.5&&p<.5+BOUND_DUTY;
  const airStart=p<.5?BOUND_DUTY:.5+BOUND_DUTY,airEnd=p<.5?.5:1;
  const airborne=!hind&&!fore,air=airborne?Math.sin(Math.PI*(p-airStart)/(airEnd-airStart))**2:0;
  const support=hind?p/BOUND_DUTY:fore?(p-.5)/BOUND_DUTY:0;
  return {phase:p,airborne,lift:air*(p<.5?.065:.048),compression:airborne?0:-.018*Math.sin(Math.PI*support)**2,
    pitch:-.075*Math.sin(p*Math.PI*2),stage:airborne?(p<.5?'hind-push flight':'recovery flight'):hind?'hind pair push':'fore pair landing'};
}
const SOURCE={
  torso:point(0,.28,0),head:point(0,.63,.095),tail:point(0,.24,-.12),
  fl:[point(-.16,.35,.08),point(-.23,.43,.20),point(-.265,.52,.30)],
  fr:[point(.16,.35,.08),point(.23,.43,.20),point(.265,.52,.30)],
  hl:[point(-.14,.16,0),point(-.16,.08,.025),point(-.16,.022,.065)],
  hr:[point(.14,.16,0),point(.16,.08,.025),point(.16,.022,.065)],
};

// One local tessellation pass gives the low-poly body enough vertices to bend
// through a shoulder/wrist curve. It adds no download or material resources.
function refineBody(input){
  const original=input.index?input.toNonIndexed():input.clone(),output=new THREE.BufferGeometry();
  const corners=[[0,3,5],[3,1,4],[5,4,2],[3,4,5]];
  for(const [name,attribute] of Object.entries(original.attributes)){
    const values=[];
    for(let i=0;i<attribute.count;i+=3){
      const a=Array.from(attribute.array.slice(i*attribute.itemSize,(i+1)*attribute.itemSize)),b=Array.from(attribute.array.slice((i+1)*attribute.itemSize,(i+2)*attribute.itemSize)),c=Array.from(attribute.array.slice((i+2)*attribute.itemSize,(i+3)*attribute.itemSize));
      const midpoint=(p,q)=>p.map((n,k)=>(n+q[k])*.5),points=[a,b,c,midpoint(a,b),midpoint(b,c),midpoint(c,a)];
      if(name==='normal')for(const p of points){const length=Math.hypot(...p)||1;for(let j=0;j<p.length;j++)p[j]/=length;}
      for(const triangle of corners)for(const index of triangle)values.push(...points[index]);
    }
    output.setAttribute(name,new THREE.Float32BufferAttribute(values,attribute.itemSize));
  }
  original.dispose();input.dispose();return output;
}

/** Custom quadruped adaptation of the supplied static Pikachu. Source UVs and
 * materials remain intact; a small GPU skin turns the hands into forepaws.
 * The parent owns translation. Stance paws retain actual world contact points. */
export function createPikachuGait(model){
  model.updateWorldMatrix(true,true);
  const inverse=model.matrixWorld.clone().invert(),inputs=[];
  model.traverse(mesh=>{
    if(!mesh.isMesh||mesh.isSkinnedMesh)return;
    inputs.push({mesh,parent:mesh.parent,relative:new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld)});
  });
  const cacheKey=inputs[0]?.mesh.geometry,signature=sourceSignature(inputs),entry=cacheKey&&preparedGeometryCache.get(cacheKey);
  const cached=entry?.signature===signature?entry:null,bounds=cached?cached.bounds.clone():new THREE.Box3();
  const originals=inputs.map(({mesh,parent,relative},index)=>{
    const geometry=cached?cached.geometries[index].clone():mesh.geometry.clone().applyMatrix4(relative);
    if(!cached){geometry.computeBoundingBox();bounds.union(geometry.boundingBox);}
    return {mesh,parent,geometry};
  });
  const height=bounds.max.y-bounds.min.y;
  if(!originals.length||!Number.isFinite(height)||height<=0)throw new Error('Pikachu needs a finite static source mesh.');
  if(height<2){originals.forEach(r=>r.geometry.dispose());return {metadata:{ready:false,source:'large',reason:'The custom quadruped skin is calibrated to the round-headed small source.'},update(){},reset(){},dispose(){}};}
  const group=new THREE.Group();group.name='Pikachu quadruped skin';group.position.y=bounds.min.y;group.scale.setScalar(height);model.add(group);
  const boneRoot=new THREE.Bone();boneRoot.name='Pikachu gait root';group.add(boneRoot);
  const bones=[],jointIndex=new Map(),rest=new Map();
  function bone(name,position){const value=new THREE.Bone();value.name='Pikachu '+name;value.position.copy(position);boneRoot.add(value);jointIndex.set(name,bones.length);bones.push(value);rest.set(value,{position:position.clone(),quaternion:value.quaternion.clone()});return value;}
  const torso=bone('torso',SOURCE.torso),head=bone('head',SOURCE.head),tail=bone('tail',SOURCE.tail),limbs=[];
  const ears=[bone('left ear',point(-.18,.79,-.075)),bone('right ear',point(.18,.79,-.075))];
  const earOffsets=ears.map(ear=>ear.position.clone().sub(SOURCE.head));
  for(const [id,source] of Object.entries(SOURCE)){
    if(!Array.isArray(source))continue;
    limbs.push({id,source,upper:bone(id+' upper',source[0]),lower:bone(id+' lower',source[1]),paw:bone(id+' paw',source[2]),
      l1:source[0].distanceTo(source[1]),l2:source[1].distanceTo(source[2]),fore:id[0]==='f',side:id[1]==='l'?-1:1,
      planted:null,wasStance:false,foot:point(0,0,0),hip:point(0,0,0),target:point(0,0,0),
      sourceUpper:source[1].clone().sub(source[0]).normalize(),sourceLower:source[2].clone().sub(source[1]).normalize()});
  }
  group.updateWorldMatrix(true,true);const skeleton=new THREE.Skeleton(bones);skeleton.calculateInverses();
  for(const limb of limbs){const toe=limb.fore?limb.source[2].clone().sub(limb.source[1]):point(0,0,1);limb.pawQuaternion=new THREE.Quaternion().setFromUnitVectors(toe.normalize(),point(0,0,1));}
  const cloned=[];
  function weights(p,name){
    const result=[];
    const tailAmount=Math.max(smooth(.13,.27,-p.z)*(1-smooth(.52,.66,p.y)),smooth(.29,.43,-p.z));
    const armMask=smooth(.12,.23,Math.abs(p.x))*smooth(.12,.23,p.z)*smooth(.25,.34,p.y)*(1-smooth(.58,.63,p.y));
    let headAmount=smooth(.46,.57,p.y)*(1-tailAmount)*(1-armMask);
    if(name!=='Object_2'&&originals.length>1)headAmount=1;
    const earAmount=name==='Object_2'?smooth(.15,.235,Math.abs(p.x))*smooth(.765,.86,p.y)*(1-smooth(-.04,.02,p.z))*(1-tailAmount):0;
    headAmount*=1-earAmount;
    const foreAmount=armMask*(1-tailAmount);
    const rearAmount=(1-smooth(.105,.205,p.y))*smooth(.045,.13,Math.abs(p.x))*(1-tailAmount)*(1-headAmount);
    function limbWeights(limb,amount){
      if(amount<=0)return;
      const a=limb.source[0],b=limb.source[1],c=limb.source[2],length=a.distanceTo(b)+b.distanceTo(c);
      const projection=THREE.MathUtils.clamp(p.clone().sub(a).dot(c.clone().sub(a).normalize())/length,0,1);
      const rigidRear=!limb.fore&&p.y<.155&&p.z>.015;
      const rigidHand=limb.fore&&Math.abs(p.x)>.22&&p.z>.265&&p.y>.475;
      const paw=rigidRear||rigidHand?1:smooth(.58,.93,projection),upper=paw===1?0:1-smooth(.10,.64,projection),lower=Math.max(0,1-paw-upper);
      result.push([jointIndex.get(limb.id+' upper'),upper*amount],[jointIndex.get(limb.id+' lower'),lower*amount],[jointIndex.get(limb.id+' paw'),paw*amount]);
    }
    limbWeights(limbs.find(l=>l.id===(p.x<0?'fl':'fr')),foreAmount);limbWeights(limbs.find(l=>l.id===(p.x<0?'hl':'hr')),rearAmount);
    result.push([jointIndex.get('head'),headAmount],[jointIndex.get('tail'),tailAmount],[jointIndex.get(p.x<0?'left ear':'right ear'),earAmount],[jointIndex.get('torso'),Math.max(0,1-headAmount-tailAmount-foreAmount-rearAmount-earAmount)]);
    result.sort((a,b)=>b[1]-a[1]);const chosen=result.slice(0,4),sum=chosen.reduce((s,p)=>s+p[1],0)||1;
    while(chosen.length<4)chosen.push([0,0]);return {indices:chosen.map(p=>p[0]),weights:chosen.map(p=>p[1]/sum)};
  }
  for(const record of originals){
    const mesh=record.mesh;
    if(!cached){
      if(mesh.name==='Object_2')record.geometry=refineBody(record.geometry);
      let geometry=record.geometry;const positions=geometry.attributes.position,skinIndices=[],skinWeights=[];
      for(let i=0;i<positions.count;i++){
        const p=point(positions.getX(i)/height,(positions.getY(i)-bounds.min.y)/height,positions.getZ(i)/height);
        positions.setXYZ(i,p.x,p.y,p.z);const w=weights(p,mesh.name);skinIndices.push(...w.indices);skinWeights.push(...w.weights);
      }
      geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeights,4));geometry.computeBoundingBox();geometry.computeBoundingSphere();
      if(mesh.name==='Object_2'){
        const parts=[geometry];
        for(const limb of limbs.filter(l=>l.fore)){
          // The source has small closed hands. A rounded pad gives each adapted
          // forepaw a broad contact surface rather than a pointed fist tip.
          const sphereSource=new THREE.SphereGeometry(1,10,6),pad=sphereSource.toNonIndexed();sphereSource.dispose();
          const inversePaw=limb.pawQuaternion.clone().invert(),p=point(0,0,0),n=point(0,0,0),a=pad.attributes;
          let nearest=0,best=Infinity;for(let i=0;i<positions.count;i++){p.fromBufferAttribute(positions,i);const d=p.distanceToSquared(limb.source[2]);if(d<best){best=d;nearest=i;}}
          const u=geometry.attributes.uv.getX(nearest),v=geometry.attributes.uv.getY(nearest),indices=[],weights=[];
          for(let i=0;i<a.position.count;i++){
            p.fromBufferAttribute(a.position,i).multiply(point(.045,.032,.065)).applyQuaternion(inversePaw).add(limb.source[2]);a.position.setXYZ(i,p.x,p.y,p.z);
            n.fromBufferAttribute(a.normal,i).applyQuaternion(inversePaw);a.normal.setXYZ(i,n.x,n.y,n.z);a.uv.setXY(i,u,v);indices.push(jointIndex.get(limb.id+' paw'),0,0,0);weights.push(1,0,0,0);
          }
          pad.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));pad.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));parts.push(pad);
        }
        const combined=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!combined)throw new Error('Pikachu forepaw geometry could not be merged.');geometry=combined;record.geometry=combined;geometry.computeBoundingBox();geometry.computeBoundingSphere();
      }
    }
    const geometry=record.geometry;
    const skin=new THREE.SkinnedMesh(geometry,mesh.material);skin.name=mesh.name+' quadruped';skin.castShadow=mesh.castShadow;skin.receiveShadow=mesh.receiveShadow;skin.frustumCulled=false;group.add(skin);skin.bind(skeleton);cloned.push(skin);mesh.removeFromParent();
  }
  if(!cached){
    const next={signature,bounds:bounds.clone(),geometries:cloned.map(skin=>skin.geometry.clone())};
    preparedGeometryCache.set(cacheKey,next);
    // A source keeps one exact assembly variant. Replacing its CPU templates
    // does not touch the independent geometries already used by live actors.
    entry?.geometries.forEach(geometry=>geometry.dispose());
  }
  const axisX=point(1,0,0),axisY=point(0,1,0),axisZ=point(0,0,1),delta=new THREE.Quaternion(),direction=point(0,0,0),perpendicular=point(0,0,0),knee=point(0,0,0),scaleScratch=point(0,0,0),targetUpper=point(0,0,0),targetLower=point(0,0,0);
  const stride=BOUND_STRIDE,duty=BOUND_DUTY;
  for(const limb of limbs){
    limb.rest=point(limb.side*(limb.fore?.165:.155),limb.fore?.034:.024,limb.fore?.32:-.08);
    limb.phaseOffset=limb.fore?.5:0;limb.footRotation=limb.pawQuaternion;
  }
  const pawContacts=createPawContacts(group,limbs,{stride,duty,landingTime:.18,lift:.07});
  const attention={},feet=new Map();let phase=0,lastTime=null,lastDistance=null,amount=0,disposed=false;
  function solve(limb,foot,hip){
    direction.copy(foot).sub(hip);let length=direction.length();const max=limb.l1+limb.l2-.0001;
    if(length>max){const horizontal=Math.hypot(foot.x-hip.x,foot.z-hip.z);hip.y=foot.y+Math.sqrt(Math.max(.0001,max*max-horizontal*horizontal));direction.copy(foot).sub(hip);length=direction.length();}
    direction.normalize();const distance=THREE.MathUtils.clamp(length,.005,max),along=(limb.l1*limb.l1-limb.l2*limb.l2+distance*distance)/(2*distance),bend=Math.sqrt(Math.max(0,limb.l1*limb.l1-along*along));
    if(limb.fore)perpendicular.set(0,direction.z,-direction.y).normalize().negate();
    else{perpendicular.set(0,1,.65);perpendicular.addScaledVector(direction,-perpendicular.dot(direction)).normalize();}
    knee.copy(hip).addScaledVector(direction,along).addScaledVector(perpendicular,bend);
    limb.upper.position.copy(hip);limb.lower.position.copy(knee);limb.paw.position.copy(foot);
    limb.upper.quaternion.setFromUnitVectors(limb.sourceUpper,targetUpper.copy(knee).sub(hip).normalize());
    limb.lower.quaternion.setFromUnitVectors(limb.sourceLower,targetLower.copy(foot).sub(knee).normalize());limb.paw.quaternion.copy(limb.desiredRotation);
  }
  function reset(){for(const [value,state] of rest){value.position.copy(state.position);value.quaternion.copy(state.quaternion);}pawContacts.reset();phase=0;amount=0;lastTime=null;lastDistance=null;model.updateMatrixWorld(true);}
  return {
    metadata:{ready:true,source:height>2?'small':'large',boneCount:bones.length,triangles:cloned.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0),speedUnit:'world units per second',customAdaptation:true,canonicalStride:stride,duty,pattern:'paired mouse bound',aerialDuty:1-duty*2},
    get anchor(){return point(0,bounds.min.y,0);},
    get phase(){return phase;},
    get bound(){return pikachuBoundPose(phase);},
    get cycleDistance(){group.updateWorldMatrix(true,false);group.getWorldScale(scaleScratch);return Math.abs(scaleScratch.y)*stride/duty;},
    get footTargets(){return Object.fromEntries([...feet].map(([key,value])=>[key,value.clone()]));},
    get contacts(){return Object.fromEntries(limbs.map(l=>[l.id,{stance:l.stance,world:l.hasContact?l.contactWorld.clone():null,landing:l.landing}]));},
    update({time=0,dt,speed=0,distance,turnRate=0,reduced=false,lighter=false,reaction=0}={}){
      if(disposed)return;
      const rewound=lastTime!==null&&time<lastTime;
      if(rewound){phase=0;lastDistance=null;pawContacts.reset();}
      const elapsed=rewound?0:Math.max(0,Math.min(.12,Number.isFinite(dt)?dt:lastTime===null?0:time-lastTime));lastTime=time;
      group.updateWorldMatrix(true,false);group.getWorldScale(scaleScratch);const worldUnit=Math.max(.0001,Math.abs(scaleScratch.y)),canonicalSpeed=Math.abs(speed)/worldUnit;
      const travel=Number.isFinite(distance)?lastDistance===null?0:Math.max(0,distance-lastDistance):Math.abs(speed)*elapsed;
      const quiet=reduced||lighter,moving=!quiet&&(Math.abs(speed)>.004||travel>1e-8);
      // A planted outer paw travels farther than the body centre through a
      // bend. Shorten turning steps instead of stretching the hind legs.
      if(!quiet)phase+=(travel/worldUnit+Math.abs(turnRate)*elapsed*.24)/(stride/duty);
      if(Number.isFinite(distance))lastDistance=distance;
      amount=quiet?0:THREE.MathUtils.lerp(amount,moving?THREE.MathUtils.clamp(canonicalSpeed/.45,0,1):0,1-Math.exp(-14*elapsed));
      const angle=phase*Math.PI*2,bound=pikachuBoundPose(phase),heave=(bound.lift+bound.compression)*amount,pitch=bound.pitch*amount,roll=Math.sin(angle+.3)*.008*amount;
      torso.position.copy(SOURCE.torso);torso.position.y+=heave-.015;torso.quaternion.setFromAxisAngle(axisX,1.12+pitch).multiply(delta.setFromAxisAngle(axisZ,roll));
      head.position.set(0,.430+heave,.355+Math.sin(angle)*.006*amount);
      samplePokemonAttention('pikachu',time,amount,turnRate,quiet,attention);
      head.quaternion.setFromAxisAngle(axisX,quiet?0:-pitch*.35+attention.pitch);
      if(!quiet)head.quaternion.multiply(delta.setFromAxisAngle(axisY,attention.yaw+reaction*.08)).multiply(delta.setFromAxisAngle(axisZ,-roll*.4));
      tail.position.copy(SOURCE.tail);tail.position.y+=heave;tail.quaternion.setFromAxisAngle(axisX,-.10+Math.sin(angle-.7)*.04*amount);
      if(!quiet)tail.quaternion.multiply(delta.setFromAxisAngle(axisY,attention.tail+Math.sin(angle-.6)*.04*amount));
      for(let i=0;i<ears.length;i++){
        const ear=ears[i],side=i?1:-1,flick=quiet?0:Math.pow(Math.max(0,Math.sin(time*1.1+i*1.7)),18)*.11*(1-amount);
        ear.position.copy(earOffsets[i]).applyQuaternion(head.quaternion).add(head.position);
        ear.quaternion.copy(head.quaternion).multiply(delta.setFromAxisAngle(axisZ,side*(flick+Math.sin(angle-.5)*.025*amount)));
      }
      pawContacts.update({phase,dt:elapsed,moving,quiet,amount});
      for(const limb of limbs){
        // Add the shared flight arc only to free paws. A stopping paw retains
        // this actual elevated world point as the start of its landing.
        if(moving&&bound.airborne&&!limb.stance){limb.target.y+=bound.lift*amount;limb.world.copy(limb.target).applyMatrix4(group.matrixWorld);}
        const hip=limb.hip.set(limb.side*(limb.fore?.15:.14),(limb.fore?.235:.13)+heave+(limb.fore?-pitch*.08:pitch*.06),limb.fore?.21:-.055);
        solve(limb,limb.target,hip);feet.set(limb.id,limb.target);
      }
      model.updateMatrixWorld(true);skeleton.update();
    },reset,
    dispose(){if(disposed)return;disposed=true;reset();group.removeFromParent();cloned.forEach(skin=>skin.geometry.dispose());skeleton.dispose();originals.forEach(record=>record.parent.add(record.mesh));},
  };
}
