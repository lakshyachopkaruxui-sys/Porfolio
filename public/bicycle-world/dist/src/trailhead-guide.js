import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A stationary trailhead object, separate from both the rider and road layout.
// The placement is clear of the original circuit and existing arrival signs.
export const TRAILHEAD_GUIDE_POSITION=Object.freeze({x:11,z:14});
export const TRAILHEAD_GUIDE_YAW=.9;

export function createTrailheadGuide(scene,{
  position=TRAILHEAD_GUIDE_POSITION,
  canvasFactory=()=>document.createElement('canvas')
}={}) {
  const canvas=canvasFactory();canvas.width=768;canvas.height=512;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('The garden guide drawing surface could not initialize.');
  const root=new THREE.Group();
  root.name='Garden trailhead guide';
  root.position.set(position.x,0,position.z);
  root.rotation.y=TRAILHEAD_GUIDE_YAW;
  scene.add(root);
  const pieces=[];
  const matrix=new THREE.Matrix4(),tint=new THREE.Color();
  const vector=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  function timber(color,x,y,z,w,h,d) {
    const prototype=new THREE.BoxGeometry(1,1,1);
    const geometry=prototype.toNonIndexed();prototype.dispose();
    vector.set(x,y,z);scale.set(w,h,d);matrix.compose(vector,rotation,scale);
    geometry.applyMatrix4(matrix);geometry.deleteAttribute('uv');
    tint.set(color);
    const values=new Float32Array(geometry.attributes.position.count*3);
    for(let i=0;i<values.length;i+=3){values[i]=tint.r;values[i+1]=tint.g;values[i+2]=tint.b;}
    geometry.setAttribute('color',new THREE.BufferAttribute(values,3));
    pieces.push(geometry);
  }
  // Posts, inset backboard and a weather cap form one small shared mesh.
  timber('#7e684b',-1.55,2.08,0,.28,4.16,.32);
  timber('#7e684b',1.55,2.08,0,.28,4.16,.32);
  timber('#ae9270',0,3.14,.01,4.05,2.76,.22);
  timber('#8c7151',-2.05,3.14,.12,.16,2.9,.38);
  timber('#8c7151',2.05,3.14,.12,.16,2.9,.38);
  timber('#b99d76',0,4.57,.13,4.45,.18,.61);
  timber('#8c7151',0,1.72,.13,4.25,.16,.38);
  const geometry=mergeGeometries(pieces,false);
  for(const piece of pieces)piece.dispose();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
  const frame=new THREE.Mesh(geometry,material);
  frame.name='Trailhead timber frame';frame.castShadow=true;frame.receiveShadow=true;root.add(frame);

  ctx.fillStyle='#faf2df';ctx.fillRect(0,0,768,512);
  ctx.fillStyle='#d7ddbf';ctx.fillRect(0,0,768,15);
  ctx.fillStyle='#294c3d';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='400 49px "Mochiy Pop P One", sans-serif';ctx.fillText('Garden guide',384,69);
  ctx.fillStyle='#4c6051';ctx.font='400 27px "DM Sans", sans-serif';ctx.fillText('A little help for the ride',384,119);

  function key(label,x,y) {
    ctx.fillStyle='#dedfc8';ctx.fillRect(x,y+5,62,57);
    ctx.fillStyle='#fffaf0';ctx.fillRect(x,y,62,57);
    ctx.strokeStyle='#a6b59a';ctx.lineWidth=2;ctx.strokeRect(x,y,62,57);
    ctx.fillStyle='#294c3d';ctx.font='700 31px "DM Sans", sans-serif';ctx.fillText(label,x+31,y+29);
  }
  key('W',175,166);key('A',106,231);key('S',175,231);key('D',244,231);
  ctx.textAlign='left';ctx.font='600 32px "DM Sans", sans-serif';ctx.fillStyle='#294c3d';ctx.fillText('Pedal & steer',365,220);
  ctx.font='400 26px "DM Sans", sans-serif';ctx.fillStyle='#4c6051';ctx.fillText('WASD or arrow keys',365,261);
  ctx.textAlign='center';ctx.fillStyle='#294c3d';ctx.font='600 31px "DM Sans", sans-serif';ctx.fillText('Click a path to ride there',384,342);
  ctx.font='500 26px "DM Sans", sans-serif';ctx.fillText('Shift · faster       Space · brake',384,390);
  ctx.font='500 24px "DM Sans", sans-serif';ctx.fillText('R · bell       L · bicycle light',384,430);
  ctx.fillStyle='#4c6051';ctx.font='400 24px "DM Sans", sans-serif';ctx.fillText('Select this board for the full guide',384,463);

  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const faceGeometry=new THREE.PlaneGeometry(3.91,2.61);
  const faceMaterial=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
  const face=new THREE.Mesh(faceGeometry,faceMaterial);
  face.name='Garden guide — select to open riding controls';
  face.position.set(0,3.14,.132);root.add(face);
  for(const mesh of [frame,face])mesh.userData.gardenGuide=true;
  root.updateMatrixWorld(true);
  let disposed=false;
  return {
    root,
    title:'Garden guide',
    hitMeshes:[frame,face],
    position:Object.freeze({x:position.x,z:position.z}),
    colliders:[{x:position.x,z:position.z,radius:2.28,kind:'garden-guide'}],
    dispose() {
      if(disposed)return;
      disposed=true;root.removeFromParent();
      geometry.dispose();material.dispose();faceGeometry.dispose();faceMaterial.dispose();texture.dispose();
    }
  };
}
