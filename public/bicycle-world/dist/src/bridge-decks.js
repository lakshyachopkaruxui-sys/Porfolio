import * as THREE from 'three';
import {BRIDGES,RIVER,terrainHeight} from './layout.js';
import {bridgeSeams} from './bridge-surface.js';

// Guard geometry is entirely outside the existing passable bridge width and
// inside the river interval. It explains an existing boundary; it adds none.
export const BRIDGE_GUARD = Object.freeze({
  outsideOffset:.16,
  railRadius:.075,
  postWidth:.16,
  bankInset:.4,
  height:.9,
  postCount:5,
});
export const DECK_SEAM = Object.freeze({width:.045,edgeInset:.18,lift:.042,columns:24});

/** Add surface joints and restrained edge structure to the existing raised deck. */
export function createBridgeDecks(scene,colors) {
  const root=new THREE.Group();root.name='Bridge deck details';
  const geometries=new Set();
  const seamMaterial=new THREE.MeshStandardMaterial({
    color:colors.ink,roughness:1,transparent:true,opacity:.32,
    depthWrite:false,side:THREE.DoubleSide,
  });
  const guardMaterial=new THREE.MeshStandardMaterial({color:colors.structure,roughness:1});
  const capMaterial=new THREE.MeshStandardMaterial({color:colors.edge,roughness:1});
  const postGeometry=new THREE.BoxGeometry(1,1,1);geometries.add(postGeometry);

  function seamGeometry(bridge) {
    const positions=[],indices=[];
    const left=bridge.x-bridge.width/2+DECK_SEAM.edgeInset;
    const width=bridge.width-DECK_SEAM.edgeInset*2;
    for(const z of bridgeSeams(bridge)) {
      const offset=positions.length/3;
      for(let column=0;column<=DECK_SEAM.columns;column++){
        const x=left+width*column/DECK_SEAM.columns;
        for(const side of [-1,1]){
          const seamZ=z+side*DECK_SEAM.width/2;
          positions.push(x,terrainHeight(seamZ,x)+DECK_SEAM.lift,seamZ);
        }
      }
      for(let column=0;column<DECK_SEAM.columns;column++){
        const a=offset+column*2;
        indices.push(a,a+1,a+2,a+1,a+3,a+2);
      }
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    geometries.add(geometry);return geometry;
  }

  for(const bridge of BRIDGES){
    const group=new THREE.Group();group.name=`Bridge: ${bridge.id}`;group.userData.bridge=bridge.id;root.add(group);
    const joints=new THREE.Mesh(seamGeometry(bridge),seamMaterial);
    joints.name=`${bridge.id} deck joints`;joints.userData.bridgePart='seams';joints.receiveShadow=true;group.add(joints);

    const start=RIVER.minZ+BRIDGE_GUARD.bankInset,end=RIVER.maxZ-BRIDGE_GUARD.bankInset;
    for(const side of [-1,1]){
      const x=bridge.x+side*(bridge.width/2+BRIDGE_GUARD.outsideOffset);
      const points=Array.from({length:25},(_,index)=>{
        const z=start+(end-start)*index/24;
        return new THREE.Vector3(x,terrainHeight(z,bridge.x)+BRIDGE_GUARD.height,z);
      });
      const railGeometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,BRIDGE_GUARD.railRadius,6,false);
      geometries.add(railGeometry);
      const rail=new THREE.Mesh(railGeometry,capMaterial);
      rail.name=`${bridge.id} ${side<0?'left':'right'} handrail`;rail.userData.bridgePart='guard';rail.castShadow=true;rail.receiveShadow=true;group.add(rail);

      for(let index=0;index<BRIDGE_GUARD.postCount;index++){
        const z=start+(end-start)*index/(BRIDGE_GUARD.postCount-1);
        const top=terrainHeight(z,bridge.x)+BRIDGE_GUARD.height,bottom=-.13;
        const post=new THREE.Mesh(postGeometry,guardMaterial);
        post.name=`${bridge.id} guard post`;post.userData.bridgePart='guard';
        post.position.set(x,(top+bottom)/2,z);
        post.scale.set(BRIDGE_GUARD.postWidth,top-bottom,BRIDGE_GUARD.postWidth);
        post.castShadow=true;post.receiveShadow=true;group.add(post);
      }
    }
  }
  scene.add(root);
  return {root,dispose(){root.removeFromParent();for(const geometry of geometries)geometry.dispose();seamMaterial.dispose();guardMaterial.dispose();capMaterial.dispose();}};
}
