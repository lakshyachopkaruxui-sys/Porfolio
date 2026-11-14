import * as THREE from 'three';
import {PATHS} from '../layout.js';
import {GARDEN_PALETTE} from '../garden-palette.js';
import {HOP} from './trajectory.js';

export function approachPoints(){
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 // Feather both ends. A hard z threshold folded a segment back over itself.
 return PATHS[0].points.map(p=>{
  const south=smooth((p.z+48)/6)*(1-smooth((p.z+32)/6));
  const north=smooth((p.z+80)/12)*(1-smooth((p.z+62)/4));
  return {...p,z:p.z+1.6*(south-north)*Math.exp(-(((p.x-HOP.x)/7)**4))};
 });
}
function geometry(points,width,y){
 const positions=[],indices=[];
 points.forEach((p,i)=>{
  const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],length=Math.hypot(b.x-a.x,b.z-a.z)||1;
  const nx=-(b.z-a.z)/length*width/2,nz=(b.x-a.x)/length*width/2;
  positions.push(p.x+nx,y,p.z+nz,p.x-nx,y,p.z-nz);
  if(i<points.length-1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
 });
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function rampRoadClearance(points=approachPoints()){
 return Math.min(...points.map(p=>{
  const dx=Math.max(Math.abs(p.x-HOP.x)-HOP.width/2,0);
  return Math.min(...[[HOP.launchStart,HOP.launch],[HOP.land,HOP.landingEnd]].map(([a,b])=>Math.hypot(dx,Math.max(a-p.z,0,p.z-b))-PATHS[0].width/2-.4));
 }));
}
export function fitApproaches(scene){
 const points=approachPoints(),count=PATHS[0].points.length*2;
 const surfaces=scene.children.filter(o=>o.isMesh&&o.geometry.attributes.position?.count===count);
 if(surfaces.length!==2)throw new Error('Could not identify the two original circuit surfaces.');
 for(const mesh of surfaces){
  const border=mesh.material.color.equals(new THREE.Color(GARDEN_PALETTE.edge));
  const old=mesh.geometry;mesh.geometry=geometry(points,PATHS[0].width+(border?.8:0),border?.012:.022);old.dispose();
 }
 const root=new THREE.Group();root.name='Optional ramp approach branches';
 const meshes=[];
 for(const [from,to]of [[HOP.start,HOP.launchStart],[HOP.landingEnd,HOP.end]])for(const border of [true,false]){
  const g=geometry([{x:HOP.x,z:from},{x:HOP.x,z:to}],HOP.width+(border?.4:0),border?.013:.023);
  const m=new THREE.MeshStandardMaterial({color:border?GARDEN_PALETTE.edge:GARDEN_PALETTE.path,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:border?-2:-4});
  const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;root.add(mesh);meshes.push(mesh);
 }
 scene.add(root);
 return {clearance:rampRoadClearance(points),dispose(){root.removeFromParent();meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();});}};
}
