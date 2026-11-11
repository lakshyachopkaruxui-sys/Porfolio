import * as THREE from 'three';
import {DIRECTION_BOARDS,BOARD_WIDTH} from './wayfinding-config.js';

const FACE='#e9eee6',INK='#243f37';
const TEXTURE_WIDTH=768,TEXTURE_HEIGHT=212,CORNER_RADIUS=18;

function lettering(ctx,text,x,y,size,weight,maxWidth){
  // Measure the current font, including its fallback before web fonts arrive.
  // Known destination names keep their natural letter proportions when fitted.
  ctx.font=`${weight} ${size}px "DM Sans", sans-serif`;
  const width=ctx.measureText(text).width;
  if(width>maxWidth){
    size=Math.max(12,Math.floor(size*maxWidth/width));
    ctx.font=`${weight} ${size}px "DM Sans", sans-serif`;
  }
  ctx.fillText(text,x,y);
}

function paintBoard(ctx,board,following){
  const w=TEXTURE_WIDTH,h=TEXTURE_HEIGHT,r=CORNER_RADIUS;
  ctx.clearRect(0,0,w,h);
  // Transparent corners cut the actual plaque silhouette, not just its artwork.
  ctx.fillStyle=FACE;ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(w-r,0);
  ctx.quadraticCurveTo(w,0,w,r);ctx.lineTo(w,h-r);ctx.quadraticCurveTo(w,h,w-r,h);
  ctx.lineTo(r,h);ctx.quadraticCurveTo(0,h,0,h-r);ctx.lineTo(0,r);
  ctx.quadraticCurveTo(0,0,r,0);ctx.closePath();ctx.fill();
  ctx.fillStyle=INK;ctx.textBaseline='middle';ctx.textAlign='left';
  // Keep the original icon origin and projected bearing aligned with the landmark.
  if(following){
    ctx.textAlign='center';ctx.font='500 25px "DM Sans", sans-serif';ctx.fillText('TO',65,63);
    ctx.textAlign='left';
  }else{
    ctx.save();ctx.translate(65,63);ctx.rotate(board.angle);ctx.beginPath();
    ctx.moveTo(30,0);ctx.lineTo(4,-24);ctx.lineTo(4,-9);ctx.lineTo(-27,-9);
    ctx.lineTo(-27,9);ctx.lineTo(4,9);ctx.lineTo(4,24);ctx.closePath();ctx.fill();ctx.restore();
  }
  lettering(ctx,board.label,120,63,43,600,w-120-36);
  const next=board.nextLabel?`Next: ${board.nextLabel}`:board.id==='arrival'?'Welcome to the garden.':'Explore at your own pace.';
  lettering(ctx,next,120,157,29,400,w-120-36);
}

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
  let following=false,disposed=false;
  for(const [index,board] of DIRECTION_BOARDS.entries()){
    const group=new THREE.Group();group.position.set(board.x,0,board.z);
    group.rotation.y=Math.atan2(12,17.5);root.add(group);
    // Mount planks on the front of the post, so the post cannot cross lettering.
    dummy.position.set(board.x-.565*.25,1.85,board.z-.825*.25);dummy.updateMatrix();posts.setMatrixAt(index,dummy.matrix);
    colliders.push({x:board.x,z:board.z,radius:.2,kind:'direction-board'});
    const canvas=document.createElement('canvas');canvas.width=TEXTURE_WIDTH;canvas.height=TEXTURE_HEIGHT;
    const ctx=canvas.getContext('2d');paintBoard(ctx,board,following);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false,alphaTest:.5});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(BOARD_WIDTH,BOARD_WIDTH*TEXTURE_HEIGHT/TEXTURE_WIDTH),material);
    mesh.name=`Junction pointer: ${board.label}`;mesh.position.set(0,2.7,0);group.add(mesh);
    // The closer view uses a real world-bearing pointer, not an arrow baked
    // for a different projection. The readable upright plaque faces the rider.
    const arrow=new THREE.Group();arrow.position.set(board.x,3.7,board.z);
    arrow.rotation.y=Math.atan2(board.pointerTarget.x-board.x,board.pointerTarget.z-board.z);
    const shaft=new THREE.Mesh(shaftGeometry,arrowMaterial);shaft.position.z=-.15;
    const head=new THREE.Mesh(headGeometry,arrowMaterial);head.rotation.x=Math.PI/2;head.position.z=.7;
    arrow.add(shaft,head);arrow.visible=false;root.add(arrow);
    views.push({group,mesh,ctx,texture,board,arrow});
  }
  // Canvas lettering does not update itself when its initially missing font loads.
  // Reuse each texture and ignore a late font completion after world teardown.
  const fonts=document.fonts;
  if(fonts?.load)Promise.all([fonts.load('600 43px "DM Sans"'),fonts.load('400 29px "DM Sans"')]).then(()=>{
    if(disposed)return;
    for(const view of views){paintBoard(view.ctx,view.board,following);view.texture.needsUpdate=true;}
  }).catch(()=>{});
  return {root,colliders,update(camera,{follow=false}={}){
    if(disposed)return;
    if(follow!==following){
      following=follow;
      for(const view of views){
        view.arrow.visible=follow;
        // The pole stays fixed. Move the facing plaque ahead of its complete
        // offset/radius envelope so an opposite-side view cannot cut letters.
        view.mesh.position.z=follow ? .45 : 0;
        paintBoard(view.ctx,view.board,following);
        view.texture.needsUpdate=true;
      }
    }
    for(const view of views)view.group.rotation.y=follow?Math.atan2(camera.position.x-view.group.position.x,camera.position.z-view.group.position.z):Math.atan2(12,17.5);
  },dispose(){
    if(disposed)return;disposed=true;
    const geometries=new Set(),materials=new Set(),textures=new Set();
    root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])if(material){materials.add(material);if(material.map)textures.add(material.map);}});
    root.removeFromParent();posts.dispose();for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures)texture.dispose();
  }};
}
