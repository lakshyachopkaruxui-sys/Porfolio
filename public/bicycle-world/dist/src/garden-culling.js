import * as THREE from 'three';

/** Compact static garden instances to the camera/shadow union.
 * Items arrive in the mesh's original instance order. Each sphere encloses an
 * item AFTER its instance matrix, in mesh-local coordinates (including sway).
 * Source matrices/spheres are retained as snapshots so culled items can return.
 * This helper owns no geometry, material, texture or renderer resources. */
export function createGardenCulling(batches){
  const viewFrustum=new THREE.Frustum(),projection=new THREE.Matrix4(),worldSphere=new THREE.Sphere();
  const states=batches.map(({mesh,items})=>{
    if(!mesh?.isInstancedMesh||items.length>mesh.instanceMatrix.count)throw new Error('Garden culling requires a sufficiently sized InstancedMesh.');
    if(mesh.instanceColor||mesh.morphTexture)throw new Error('Garden culling supports matrix-only static instances.');
    const entries=items.map(({matrix,sphere})=>({matrix:matrix.clone(),sphere:sphere.clone()}));
    const current=new Int32Array(entries.length),next=new Int32Array(entries.length);
    entries.forEach((_,index)=>{current[index]=index;});
    mesh.count=entries.length;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Keep the complete original envelope. Shrinking to the current subset
    // would let Three's mesh-level culling hide newly restored instances.
    if(!mesh.boundingSphere){
      mesh.boundingSphere=new THREE.Sphere().makeEmpty();
      for(const item of entries)mesh.boundingSphere.union(item.sphere);
    }
    return {mesh,entries,current,next,count:entries.length};
  });
  const total=states.reduce((count,state)=>count+state.entries.length,0);
  let visible=total,changedBatches=0;
  return {
    get summary(){return {total,visible,changedBatches};},
    update(camera,sun){
      camera.updateWorldMatrix(true,false);
      projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
      viewFrustum.setFromProjectionMatrix(projection,camera.coordinateSystem,camera.reversedDepth);
      let shadowFrustum=null;
      if(sun?.isDirectionalLight&&sun.castShadow&&sun.visible!==false){
        sun.updateWorldMatrix(true,false);sun.target.updateWorldMatrix(true,false);
        sun.shadow.updateMatrices(sun);shadowFrustum=sun.shadow.getFrustum();
      }
      visible=0;changedBatches=0;
      for(const state of states){
        const {mesh,entries,current,next}=state;
        mesh.updateWorldMatrix(true,false);
        let count=0,changed=false;
        for(let index=0;index<entries.length;index++){
          worldSphere.copy(entries[index].sphere).applyMatrix4(mesh.matrixWorld);
          if(viewFrustum.intersectsSphere(worldSphere)||(shadowFrustum&&mesh.castShadow&&shadowFrustum.intersectsSphere(worldSphere))){
            next[count]=index;if(current[count]!==index)changed=true;count++;
          }
        }
        changed ||= count!==state.count;
        visible+=count;
        if(!changed)continue;
        for(let index=0;index<count;index++){
          mesh.setMatrixAt(index,entries[next[index]].matrix);current[index]=next[index];
        }
        mesh.count=count;state.count=count;changedBatches++;
        if(count)mesh.instanceMatrix.needsUpdate=true;
      }
      return changedBatches>0;
    },
  };
}
