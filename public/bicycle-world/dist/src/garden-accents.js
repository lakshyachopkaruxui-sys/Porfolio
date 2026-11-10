import * as THREE from 'three';
import {createGardenCulling} from './garden-culling.js';
import {gardenClearance} from './garden-nature.js';

/** Three small berry bushes; decoration only, with no navigation obstacles. */
export function createGardenAccents(source,naturePlacements=[],floralSource=null){
  source.updateMatrixWorld(true);
  const original=source.getObjectByName('BushBerries_4');
  if(!original?.isMesh)throw new Error('The approved berry bush mesh is missing.');
  const root=new THREE.Group();root.name='Garden berry accents';
  const geometry=original.geometry.clone().applyMatrix4(original.matrixWorld);
  geometry.computeBoundingBox();
  const bounds=geometry.boundingBox,centre=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
  geometry.translate(-centre.x,-bounds.min.y,-centre.z);
  let nativeRadius=0;const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++)nativeRadius=Math.max(nativeRadius,Math.hypot(positions.getX(i),positions.getZ(i)));
  const placements=[];
  const clear=(x,z,radius)=>gardenClearance(x,z,radius)&&[...naturePlacements,...placements].every(p=>{
    const otherRadius=p.kind==='tree'?Math.max(.32,p.height*.065):p.radius;
    return Math.hypot(x-p.x,z-p.z)>=radius+otherRadius+.3;
  });
  // Search near existing planting, without moving it or changing the map.
  for(const [group,[x,z,count]]of [[14,9,2],[-24,-7,1]].entries()){
    for(let attempt=0;attempt<64;attempt++){
      const angle=group*1.7+attempt*.73,distance=5.5+(attempt%7)*1.1;
      const cx=x+Math.cos(angle)*distance,cz=z+Math.sin(angle)*distance;
      const before=placements.length;
      for(let slot=0;slot<count;slot++){
        const height=group===1?1.05:slot===0?1.2:.9,scale=height/size.y,radius=nativeRadius*scale+.18;
        const px=cx+slot*2.2,pz=cz+slot*.6;
        if(clear(px,pz,radius))placements.push({name:'BushBerries_4',kind:'berry',group,x:px,z:pz,height,scale,radius,angle:angle+slot});
      }
      if(placements.length-before===count)break;
      placements.splice(before);
    }
  }
  const material=original.material.clone();
  // Preserve the source berry/leaf color ratio while keeping the small bush
  // readable beside the garden's brighter, vertex-colored planting.
  material.color.multiplyScalar(1.25);
  const batch=new THREE.InstancedMesh(geometry,material,placements.length);batch.name='BushBerries_4';
  const transform=new THREE.Object3D();
  placements.forEach((p,i)=>{transform.position.set(p.x,-.025,p.z);transform.rotation.set(0,p.angle,0);transform.scale.setScalar(p.scale);transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);});
  batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();batch.castShadow=true;batch.receiveShadow=true;root.add(batch);
  const floralResources=[];
  if(floralSource){
    floralSource.updateMatrixWorld(true);
    function plantFloral(name,kind,groups){
      const model=floralSource.getObjectByName(name);
      if(!model)throw new Error(`The approved floral mesh is missing: ${name}`);
      const bounds=new THREE.Box3().setFromObject(model,true),centre=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
      const prototypes=[];let nativeRadius=0;
      model.traverse(mesh=>{
        if(!mesh.isMesh)return;
        const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
        geometry.translate(-centre.x,-bounds.min.y,-centre.z);
        const positions=geometry.attributes.position;
        for(let i=0;i<positions.count;i++)nativeRadius=Math.max(nativeRadius,Math.hypot(positions.getX(i),positions.getZ(i)));
        const material=mesh.material.clone();
        if(kind==='flowering-bush'&&material.name==='Leaves_NormalTree'){
          // The source olive swatch is much darker than the established garden.
          // A restrained diffuse gain and ambient color floor reveal its leaves
          // in shade without changing the source texture, petals or alpha mask.
          material.color.setRGB(2.2,2,1);
          material.emissive.setRGB(.02,.055,.008);
          material.emissiveIntensity=1;
        }
        prototypes.push({geometry,material});
      });
      const items=[];
      for(const [group,[x,z,count,height]]of groups.entries()){
        for(let attempt=0;attempt<80;attempt++){
          const angle=group*1.7+attempt*.73,distance=5.5+(attempt%7)*1.1;
          const cx=x+Math.cos(angle)*distance,cz=z+Math.sin(angle)*distance,before=placements.length;
          for(let slot=0;slot<count;slot++){
            const targetHeight=height+slot*.05,scale=targetHeight/size.y,radius=nativeRadius*scale+.18;
            const px=cx+slot*1.35,pz=cz+(slot%2)*1.35;
            if(clear(px,pz,radius))placements.push({name,kind,group,x:px,z:pz,height:targetHeight,scale,radius,angle:angle+slot});
          }
          if(placements.length-before===count){items.push(...placements.slice(before));break;}
          placements.splice(before);
        }
      }
      for(const [index,p]of prototypes.entries()){
        const mesh=new THREE.InstancedMesh(p.geometry,p.material,items.length);mesh.name=`${name}:${index}`;
        items.forEach((item,i)=>{transform.position.set(item.x,-.025,item.z);transform.rotation.set(0,item.angle,0);transform.scale.setScalar(item.scale);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});
        mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
        floralResources.push({mesh,...p});
      }
    }
    plantFloral('Flower_3_Group','flower',[[28,35,3,.45],[-41,-32,3,.5]]);
    plantFloral('Bush_Common_Flowers','flowering-bush',[[6,34,1,1.15],[-28,-58,1,1.05]]);
  }
  // Retain complete instance transforms so off-screen groups can reappear
  // without rebuilding geometry. Include the shadow frustum, as with trees.
  const culling=createGardenCulling(root.children.filter(mesh=>mesh.isInstancedMesh).map(mesh=>{
    mesh.geometry.computeBoundingSphere();const items=[];
    for(let i=0;i<mesh.count;i++){
      const matrix=new THREE.Matrix4();mesh.getMatrixAt(i,matrix);
      items.push({matrix,sphere:mesh.geometry.boundingSphere.clone().applyMatrix4(matrix)});
    }
    return {mesh,items};
  }));
  let disposed=false;
  return {root,placements,culling,update({camera,sun}={}){if(!disposed&&camera)culling.update(camera,sun);},dispose(){if(disposed)return;disposed=true;root.removeFromParent();batch.dispose();geometry.dispose();material.dispose();for(const p of floralResources){p.mesh.dispose();p.geometry.dispose();p.material.dispose();}}};
}
