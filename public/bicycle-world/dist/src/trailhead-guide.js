import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {LOOP_POINTS,PATHS,STOPS} from './layout.js';

// A stationary trailhead object, separate from both the rider and road layout.
// The placement is clear of the original circuit and existing arrival signs.
export const TRAILHEAD_GUIDE_POSITION=Object.freeze({x:11,z:14});
export const TRAILHEAD_GUIDE_YAW=Math.atan2(12,17.5);

export function createTrailheadGuide(scene,{
  position=TRAILHEAD_GUIDE_POSITION,
  canvasFactory=()=>document.createElement('canvas')
}={}) {
  const canvas=canvasFactory();canvas.width=768;canvas.height=512;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('The garden guide drawing surface could not initialize.');
  let disposed=false;
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

  function paint() {
    ctx.fillStyle='#faf2df';ctx.fillRect(0,0,768,512);
    ctx.fillStyle='#d7ddbf';ctx.fillRect(0,0,768,15);
    ctx.fillStyle='#294c3d';ctx.textAlign='center';ctx.textBaseline='middle';
    // Leave a generous top inset: the timber cap occludes the upper face
    // from the elevated riding camera, especially in the night garden.
    ctx.font='400 72px "Mochiy Pop P One", sans-serif';
    ctx.fillText('Lakshya’s',384,94);ctx.fillText('garden',384,174);
    // The same winding circuit and spurs as the ride, not an invented flourish.
    // Preserve world proportions; the five dots sit at their real arrivals.
    const dots=Object.values(STOPS).map(stop=>stop.arrival);
    const all=[...LOOP_POINTS.map(([x,z])=>({x,z})),...dots,...PATHS.flatMap(path=>path.points)];
    const minX=Math.min(...all.map(p=>p.x)),maxX=Math.max(...all.map(p=>p.x));
    const minZ=Math.min(...all.map(p=>p.z)),maxZ=Math.max(...all.map(p=>p.z));
    const fit=Math.min(570/(maxX-minX),168/(maxZ-minZ));
    const project=p=>({x:384+(p.x-(minX+maxX)/2)*fit,y:306+(p.z-(minZ+maxZ)/2)*fit});
    ctx.strokeStyle='#a8b397';ctx.lineWidth=6;ctx.lineJoin='round';ctx.lineCap='round';
    for(const path of PATHS){
      ctx.beginPath();path.points.forEach((p,index)=>{const q=project(p);if(index===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});
      if(path.closed)ctx.closePath();ctx.stroke();
    }
    dots.forEach((p,index)=>{const q=project(p);ctx.fillStyle=index===0?'#294c3d':'#a67c55';ctx.beginPath();ctx.arc(q.x,q.y,9,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle='#294c3d';ctx.font='600 32px "DM Sans", sans-serif';ctx.fillText('First stop: Meet Lakshya',384,432);
    ctx.fillStyle='#4c6051';ctx.font='400 28px "DM Sans", sans-serif';ctx.fillText('Select for riding guide',384,477);
  }
  paint();

  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const fonts=canvas.ownerDocument?.fonts;
  if(fonts?.load)Promise.all([fonts.load('400 72px "Mochiy Pop P One"'),fonts.load('600 32px "DM Sans"'),fonts.load('400 28px "DM Sans"')]).then(()=>{
    if(disposed)return;
    paint();texture.needsUpdate=true;
  }).catch(()=>{});
  const faceGeometry=new THREE.PlaneGeometry(3.91,2.61);
  const faceMaterial=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
  const face=new THREE.Mesh(faceGeometry,faceMaterial);
  face.name='Garden guide — select to open riding controls';
  face.position.set(0,3.14,.132);root.add(face);
  for(const mesh of [frame,face])mesh.userData.gardenGuide=true;
  root.updateMatrixWorld(true);
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
