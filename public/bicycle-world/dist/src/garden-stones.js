import * as THREE from 'three';

export const GARDEN_STONE_NAME='Stone_02_Material_0';

/** Both garden layers use the same supplied rock shape, UVs and atlas.
 * The caller owns the normalized geometry copy; the asset owns its material. */
export function createGardenStonePrototype(source){
  source?.updateMatrixWorld(true);
  const original=source?.getObjectByName(GARDEN_STONE_NAME);
  if(!original?.isMesh)throw new Error('The nature pack is missing its garden stone.');
  const geometry=original.geometry.clone().applyMatrix4(original.matrixWorld);
  geometry.computeBoundingBox();
  const box=geometry.boundingBox,center=box.getCenter(new THREE.Vector3());
  const height=box.max.y-box.min.y;
  geometry.translate(-center.x,-box.min.y,-center.z);
  const positions=geometry.attributes.position;
  let radius=0;
  for(let i=0;i<positions.count;i++)radius=Math.max(radius,Math.hypot(positions.getX(i),positions.getZ(i)));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return {geometry,material:original.material,height,radius};
}
