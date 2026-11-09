import * as THREE from 'three';
import {DIRECTION_BOARDS,BOARD_WIDTH} from './wayfinding-config.js';

/** Static park signs: small local textures and one instanced post batch. */
export function createWayfinding(scene){
  const root=new THREE.Group();root.name='Garden direction boards';scene.add(root);
  const postGeometry=new THREE.CylinderGeometry(.11,.14,3.7,6);
  const postMaterial=new THREE.MeshStandardMaterial({color:'#6b7051',roughness:1});
  const posts=new THREE.InstancedMesh(postGeometry,postMaterial,DIRECTION_BOARDS.length);
  posts.castShadow=true;root.add(posts);
  const dummy=new THREE.Object3D();
  const colliders=[];
  const views=[];
  const shaftGeometry=new THREE.BoxGeometry(.18,.12,1),headGeometry=new THREE.ConeGeometry(.42,.8,3);
  const arrowMaterial=new THREE.MeshStandardMaterial({color:'#fff4d7',roughness:1});
  let following=false;
  for(const [index,board] of DIRECTION_BOARDS.entries()){
    const group=new THREE.Group();group.position.set(board.x,0,board.z);
    group.rotation.y=Math.atan2(12,17.5);root.add(group);
    // Mount planks on the front of the post, so the post cannot cross lettering.
    dummy.position.set(board.x-.565*.25,1.85,board.z-.825*.25);dummy.updateMatrix();posts.setMatrixAt(index,dummy.matrix);
    colliders.push({x:board.x,z:board.z,radius:.2,kind:'direction-board'});
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=212;
    const ctx=canvas.getContext('2d'),w=canvas.width;
    ctx.fillStyle='#294c3d';ctx.fillRect(0,0,w,212);
    // The main pointer is an bearing graphic aligned with the real landmark.
    // Keep labels horizontal and the next-stop preview visually non-directional.
    ctx.save();ctx.translate(65,63);ctx.rotate(board.angle);
    ctx.fillStyle='#fffaf0';ctx.beginPath();ctx.moveTo(30,0);ctx.lineTo(4,-24);
    ctx.lineTo(4,-9);ctx.lineTo(-27,-9);ctx.lineTo(-27,9);ctx.lineTo(4,9);
    ctx.lineTo(4,24);ctx.closePath();ctx.fill();ctx.restore();
    ctx.fillStyle='#fffaf0';ctx.textBaseline='middle';ctx.textAlign='left';
    ctx.font='400 43px "Mochiy Pop P One"';ctx.fillText(board.label,120,63);
    ctx.fillStyle='#ffffff30';ctx.fillRect(24,121,w-48,1);
    ctx.fillStyle='#fffaf0';ctx.font='400 29px "DM Sans"';
    ctx.fillText(board.nextLabel?`Next on the path: ${board.nextLabel}`:board.id==='arrival'?'Start here. Follow the garden path.':'Last stop. Wander at your own pace.',28,165);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(BOARD_WIDTH,BOARD_WIDTH*212/768),material);
    mesh.name=`Junction pointer: ${board.label}`;mesh.position.set(0,2.7,0);group.add(mesh);
    // The closer view uses a real world-bearing pointer, not an arrow baked
    // for a different projection. The readable upright plaque faces the rider.
    const arrow=new THREE.Group();arrow.position.set(board.x,3.7,board.z);
    arrow.rotation.y=Math.atan2(board.pointerTarget.x-board.x,board.pointerTarget.z-board.z);
    const shaft=new THREE.Mesh(shaftGeometry,arrowMaterial);shaft.position.z=-.15;
    const head=new THREE.Mesh(headGeometry,arrowMaterial);head.rotation.x=Math.PI/2;head.position.z=.7;
    arrow.add(shaft,head);arrow.visible=false;root.add(arrow);
    views.push({group,mesh,ctx,texture,angle:board.angle,arrow});
  }
  return {root,colliders,update(camera,{follow=false}={}){
    if(follow!==following){
      following=follow;
      for(const view of views){
        view.arrow.visible=follow;
        // The pole stays fixed. Move the facing plaque ahead of its complete
        // offset/radius envelope so an opposite-side view cannot cut letters.
        view.mesh.position.z=follow ? .45 : 0;
        view.ctx.fillStyle='#294c3d';view.ctx.fillRect(18,20,86,87);
        if(follow){view.ctx.fillStyle='#fffaf0';view.ctx.font='400 25px "DM Sans"';view.ctx.textAlign='center';view.ctx.fillText('TO',62,63);}
        else{view.ctx.save();view.ctx.translate(65,63);view.ctx.rotate(view.angle);view.ctx.fillStyle='#fffaf0';view.ctx.beginPath();view.ctx.moveTo(30,0);view.ctx.lineTo(4,-24);view.ctx.lineTo(4,-9);view.ctx.lineTo(-27,-9);view.ctx.lineTo(-27,9);view.ctx.lineTo(4,9);view.ctx.lineTo(4,24);view.ctx.closePath();view.ctx.fill();view.ctx.restore();}
        view.texture.needsUpdate=true;
      }
    }
    for(const view of views)view.group.rotation.y=follow?Math.atan2(camera.position.x-view.group.position.x,camera.position.z-view.group.position.z):Math.atan2(12,17.5);
  },dispose(){
    const geometries=new Set(),materials=new Set(),textures=new Set();
    root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])if(material){materials.add(material);if(material.map)textures.add(material.map);}});
    root.removeFromParent();posts.dispose();for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures)texture.dispose();
  }};
}
