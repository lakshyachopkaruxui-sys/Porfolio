import * as THREE from 'three';
import {createGardenCulling} from './garden-culling.js';
import {PATHS,STOPS,WORLD_BOUNDS,RIVER,BRIDGES,START,STOP_SIGNS,ARRIVAL_SIGN,STRUCTURE_COLLIDERS} from './layout.js';
import {DIRECTION_BOARDS} from './wayfinding-config.js';
import {createGardenStonePrototype,GARDEN_STONE_NAME} from './garden-stones.js';

// Small groves frame open lawns. Placement is deterministic and respects the
// entire canopy, not just a tree's trunk, around roads and destination courts.
const GROVES=[[14,9],[28,35],[-59,29],[-32,30],[-15,27],[6,34],[32,9],[60,4],
  [-63,-20],[-41,-32],[-24,-7],[-2,-12],[12,-35],[58,-38],
  [-59,-63],[-28,-58],[-10,-46],[11,-54],[28,-81],[51,-76],
  [-39,-101],[-20,-99],[6,-99],[28,-99],
  [-17,0],[5,-18],[18,-9],[4,-86],[-34,-76],[-53,-100],[-56,-34]];
const TREE_NAMES=['Tree_01_Material_0','Tree_02_Material_0','Tree_03_Material_0','Tree_04_Material_0','Tree_05_Material_0'];
// Mature trees should read clearly above the rider. Uniform scaling preserves
// the supplied models; the larger crowns participate in every clearance check.
const TREE_SCALE=1.4;
export function gardenClearance(x,z,radius){
  if(DIRECTION_BOARDS.some(b=>Math.hypot(x-b.x,z-b.z)<radius+5.3))return false;
  // Ground separation alone does not prevent a foreground canopy from hiding
  // a sign in the fixed oblique camera. Reserve a short reading corridor too.
  if(DIRECTION_BOARDS.some(b=>{
    const dx=x-b.x,dz=z-b.z,forward=dx*.565+dz*.825,lateral=dx*.825-dz*.565;
    return forward>0&&forward<16&&Math.abs(lateral)<radius+4.8;
  }))return false;
  const b=WORLD_BOUNDS;
  if(x-radius<b.minX+1||x+radius>b.maxX-1||z-radius<b.minZ+1||z+radius>b.maxZ-1)return false;
  if(z+radius>RIVER.minZ-1.8&&z-radius<RIVER.maxZ+1.8)return false;
  if(BRIDGES.some(b=>Math.abs(x-b.x)<b.width/2+radius+2&&z>b.minZ-radius-3&&z<b.maxZ+radius+3))return false;
  if(Math.hypot(x-START.x,z-START.z)<radius+9)return false;
  if(Object.values(STOPS).some(s=>Math.hypot(x-s.focus.x,z-s.focus.z)<s.size+radius+2.5))return false;
  if([...Object.values(STOP_SIGNS),ARRIVAL_SIGN].some(s=>Math.hypot(x-s.x,z-s.z)<radius+7))return false;
  if(STRUCTURE_COLLIDERS.some(c=>Math.hypot(x-c.x,z-c.z)<radius+c.radius+3))return false;
  for(const path of PATHS)for(let i=1;i<path.points.length;i++){
    const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    if(Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<path.width/2+radius+2)return false;
  }
  return true;
}

export function createGardenNature(source){
  source.updateMatrixWorld(true);
  const root=new THREE.Group();root.name='Garden groves';
  const geometries=[],placements=[],colliders=[],batches=new Map();
  const material=source.getObjectByName(TREE_NAMES[0])?.material;
  if(!material)throw new Error('The supplied nature pack is missing its tree material.');
  function prototype(name){
    if(batches.has(name))return batches.get(name);
    if(name===GARDEN_STONE_NAME){
      const value={...createGardenStonePrototype(source),placements:[]};
      geometries.push(value.geometry);batches.set(name,value);return value;
    }
    const original=source.getObjectByName(name);
    if(!original?.isMesh)throw new Error(`Nature prop is missing: ${name}`);
    const geometry=original.geometry.clone().applyMatrix4(original.matrixWorld);
    geometry.computeBoundingBox();const box=geometry.boundingBox,center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    geometry.translate(-center.x,-box.min.y,-center.z);
    const positions=geometry.attributes.position;let radius=0;
    const flex=[];
    for(let i=0;i<positions.count;i++){
      radius=Math.max(radius,Math.hypot(positions.getX(i),positions.getZ(i)));
      flex.push(Math.max(0,(positions.getY(i)/size.y-.22)/.78)**2);
    }
    geometry.setAttribute('gardenFlex',new THREE.Float32BufferAttribute(flex,1));
    const value={geometry,height:size.y,radius,placements:[]};
    geometries.push(geometry);batches.set(name,value);return value;
  }
  function place(name,x,z,height,angle,kind,grove){
    const p=prototype(name),scale=height/p.height,radius=p.radius*scale+.18;
    if(!gardenClearance(x,z,radius))return false;
    if(kind==='tree'&&placements.some(q=>q.kind==='tree'&&Math.hypot(x-q.x,z-q.z)<(radius+q.radius)*.82))return false;
    if(kind==='stone'&&placements.some(q=>q.kind==='stone'&&Math.hypot(x-q.x,z-q.z)<radius+q.radius+.1))return false;
    if(kind==='stone'&&placements.some(q=>q.kind==='tree'&&Math.hypot(x-q.x,z-q.z)<radius+Math.max(.32,q.height*.065)+.2))return false;
    if(kind==='mushroom'&&placements.some(q=>Math.hypot(x-q.x,z-q.z)<radius+(q.kind==='tree'?Math.max(.32,q.height*.065):q.radius)+.2))return false;
    const item={name,x,z,height,angle,scale,radius,kind,grove};
    p.placements.push(item);placements.push(item);
    // A low trunk obstacle leaves the canopy open; route planning and manual
    // motion share these exact colliders, including off-path wandering.
    if(kind!=='mushroom')colliders.push({x,z,radius:kind==='tree'?Math.max(.32,height*.065):kind==='stone'?radius-.18:Math.min(radius,.65),kind:'garden'});
    return true;
  }
  // Three unequal trees read as a grove. Search locally for clear planting
  // pockets rather than forcing a tree onto a road or shrinking it to fit.
  GROVES.forEach(([x,z],i)=>{
    for(let slot=0;slot<3;slot++){
      const height=TREE_SCALE*(slot===0?6.8+(i%3)*.65:slot===1?6.0+(i%3)*.45:5.4+(i%2)*.6);
      for(let attempt=0;attempt<16;attempt++){
        const angle=i*2.399+slot*2.1+attempt*1.618;
        const distance=attempt===0&&slot===0?0:3.8+(attempt%4)*1.3;
        if(place(TREE_NAMES[(i+slot*2)%5],x+Math.cos(angle)*distance,z+Math.sin(angle)*distance,height,i*.73+slot,'tree',i))break;
      }
    }
    if(i%3===0)place('Bush_01_Material_0',x-3.5,z-2.2,1.35,i*.8,'shrub',i);
  });
  // A few unequal stones at selected grove edges, never a carpet of props.
  for(let i=0;i<GROVES.length&&placements.filter(p=>p.kind==='stone').length<22;i+=2){
    const [x,z]=GROVES[i];
    for(let slot=0;slot<2;slot++){
      const height=slot===0?.65+(i%3)*.05:.4+(i%3)*.04;
      for(let attempt=0;attempt<16;attempt++){
        const angle=i*1.61+slot*.8+attempt*.64,distance=3.8+(attempt%5)*1.05;
        if(place(GARDEN_STONE_NAME,x+Math.cos(angle)*distance,z+Math.sin(angle)*distance,height,angle,'stone',i))break;
      }
    }
  }
  // Tiny, non-colliding dressing is added after all existing planting, so no
  // established tree, shrub, stone or navigation collider is displaced.
  for(const [group,grove]of [0,8,16].entries()){
    const [x,z]=GROVES[grove];
    let planted=false;
    for(let attempt=0;attempt<32&&!planted;attempt++){
      const angle=group*2.1+attempt*.73,distance=5.4+(attempt%5)*1.1;
      const cx=x+Math.cos(angle)*distance,cz=z+Math.sin(angle)*distance;
      const before=placements.length;
      for(const [slot,dx,dz]of [[0,0,0],[1,1.25,.15],[2,.4,1.25]]){
        place('Mushroom_01_Material_0',cx+dx,cz+dz,.35+slot*.15,angle+slot,'mushroom',group);
      }
      if(placements.length-before>=2)planted=true;
      else{
        // Retry the entire cluster rather than leaving isolated single props.
        const removed=placements.splice(before);
        const mushrooms=batches.get('Mushroom_01_Material_0');
        mushrooms.placements.splice(mushrooms.placements.length-removed.length,removed.length);
      }
    }
  }
  const wind={time:{value:0},strength:{value:0}};
  const foliage=material.clone();
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  function bend(shader){
    shader.uniforms.gardenTime=wind.time;shader.uniforms.gardenStrength=wind.strength;
    shader.vertexShader='attribute float gardenFlex; uniform float gardenTime; uniform float gardenStrength;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      if (gardenStrength > 0.0) {
      float phase = instanceMatrix[3].x * .19 + instanceMatrix[3].z * .12;
      float instanceScale = max(length(instanceMatrix[0].xyz), .001);
      float sway = sin(gardenTime * .75 + phase) * gardenStrength * gardenFlex / instanceScale;
      transformed.x += sway; transformed.z += sway * .35; }`);
  }
  foliage.onBeforeCompile=bend;depth.onBeforeCompile=bend;
  foliage.customProgramCacheKey=()=> 'garden-breeze-v1';depth.customProgramCacheKey=()=> 'garden-breeze-depth-v1';
  const dummy=new THREE.Object3D(),cullingBatches=[];
  for(const [name,p] of batches){
    if(!p.placements.length)continue;
    const isTree=name.startsWith('Tree_');
    const batch=new THREE.InstancedMesh(p.geometry,isTree?foliage:p.material||material,p.placements.length);
    if(isTree)batch.customDepthMaterial=depth;batch.name=name;
    const items=[];p.geometry.computeBoundingSphere();
    p.placements.forEach((item,i)=>{
      dummy.position.set(item.x,-.025,item.z);dummy.rotation.set(0,item.angle,0);dummy.scale.setScalar(item.scale);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
      const matrix=dummy.matrix.clone(),sphere=p.geometry.boundingSphere.clone().applyMatrix4(matrix);sphere.radius+=.18;items.push({matrix,sphere});
    });
    batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();batch.boundingSphere.radius+=.18;batch.castShadow=true;batch.receiveShadow=true;root.add(batch);cullingBatches.push({mesh:batch,items});
  }
  const culling=createGardenCulling(cullingBatches);
  return {root,placements,colliders,culling,update({time=0,reduced=false,lighter=false,camera,sun}={}){
    if(camera)culling.update(camera,sun);
    wind.time.value=time;wind.strength.value=reduced||lighter?0:.12;
  },dispose(){root.removeFromParent();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());foliage.dispose();depth.dispose();}};
}
