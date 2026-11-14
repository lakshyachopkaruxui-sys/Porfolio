import * as THREE from 'three';
import {createGardenCulling} from '../garden-culling.js';

// Approved ramp-clearance removal. Rebuild the culling snapshots so the removed tree cannot
// reappear when the camera moves. Geometry and materials remain shared.
export function clearRampTree(garden,world){
 const nature=garden.nature;
 const trees=nature.placements.filter(p=>p.kind==='tree');
 const selected=trees.reduce((best,p)=>Math.hypot(p.x+27,p.z+64)<Math.hypot(best.x+27,best.z+64)?p:best);
 const batches=[],matrix=new THREE.Matrix4(),point=new THREE.Vector3();
 for(const mesh of nature.root.children){
  if(!mesh.isInstancedMesh)continue;
  mesh.geometry.computeBoundingSphere();const items=[];
  for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);
   if(mesh.name===selected.name&&Math.hypot(point.x-selected.x,point.z-selected.z)<.01)continue;
   const sphere=mesh.geometry.boundingSphere.clone().applyMatrix4(matrix);sphere.radius+=.18;
   items.push({matrix:matrix.clone(),sphere});
  }
  items.forEach((item,i)=>mesh.setMatrixAt(i,item.matrix));
  mesh.boundingSphere=new THREE.Sphere();items.forEach((item,i)=>i?mesh.boundingSphere.union(item.sphere):mesh.boundingSphere.copy(item.sphere));
  mesh.count=items.length;mesh.instanceMatrix.needsUpdate=true;batches.push({mesh,items});
 }
 const removed=world.colliders.filter(c=>c.kind==='garden'&&Math.hypot(c.x-selected.x,c.z-selected.z)<.01);
 for(const collider of removed)world.colliders.splice(world.colliders.indexOf(collider),1);
 return {tree:selected,culling:createGardenCulling(batches)};
}
