import * as THREE from 'three';
import {WORLD_BOUNDS,PATHS,BRIDGES,RIVER,STOPS,START,ARRIVAL_SIGN,STOP_SIGNS,STRUCTURE_COLLIDERS,terrainHeight} from './layout.js';
import {createLandmarks} from './landmarks.js';
import {createStudioDisplays} from './studio-displays.js';
import {createBridgeDecks} from './bridge-decks.js';
import {GARDEN_PALETTE} from './garden-palette.js';
import {createWayfinding} from './wayfinding.js';

/** Shared route foundation plus the current architectural silhouette layer. */
export function createWorld(scene,{landmarkFactory=createLandmarks}={}){
  const colors={...GARDEN_PALETTE,edge:'#e9e7d9',structure:'#987858',ink:'#29433e',paper:'#fffaf0',accent:'#b57659'};
  const materials=new Map();
  const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:1}));return materials.get(color);};
  const boxGeometry=new THREE.BoxGeometry(1,1,1);
  function box(x,y,z,w,h,d,color){const mesh=new THREE.Mesh(boxGeometry,material(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
  function disc(x,z,r,color,y=.04){const mesh=new THREE.Mesh(new THREE.CircleGeometry(r,64),material(color));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);mesh.receiveShadow=true;scene.add(mesh);return mesh;}
  function label(text,x,y,z,width=6,height=.9,fontSize=64,fontScale=.55){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*height/width);
    const ctx=canvas.getContext('2d');ctx.fillStyle=colors.paper;ctx.fillRect(0,0,1024,canvas.height);ctx.fillStyle=colors.ink;
    let size=Math.min(fontSize,canvas.height*fontScale);ctx.font=`400 ${size}px "Mochiy Pop P One"`;
    const measured=ctx.measureText?.(text)?.width;
    if(measured>940){size*=940/measured;ctx.font=`400 ${size}px "Mochiy Pop P One"`;}
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,canvas.height/2);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}));mesh.position.set(x,y,z);mesh.rotation.y=.6;scene.add(mesh);return mesh;
  }
  function ribbon(points,width,color,y=.025){
    const positions=[],indices=[];
    points.forEach((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];const length=Math.hypot(b.x-a.x,b.z-a.z)||1;const nx=-(b.z-a.z)/length*width/2,nz=(b.x-a.x)/length*width/2;positions.push(p.x+nx,y,p.z+nz,p.x-nx,y,p.z-nz);if(i<points.length-1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}});
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide}));mesh.receiveShadow=true;scene.add(mesh);
  }
  const b=WORLD_BOUNDS,worldWidth=b.maxX-b.minX,worldDepth=b.maxZ-b.minZ,centerX=(b.minX+b.maxX)/2,centerZ=(b.minZ+b.maxZ)/2;
  const ground=box(centerX,-.18,centerZ,worldWidth,.3,worldDepth,colors.ground);ground.castShadow=false;
  const outer=new THREE.Mesh(new THREE.PlaneGeometry(500,500),material(colors.outer));outer.rotation.x=-Math.PI/2;outer.position.y=-.37;scene.add(outer);
  for(const x of[b.minX,b.maxX])box(x,.1,(b.minZ+b.maxZ)/2,.35,.25,b.maxZ-b.minZ,colors.edge);
  for(const z of[b.minZ,b.maxZ])box(centerX,.1,z,worldWidth,.25,.35,colors.edge);
  for(const path of PATHS){ribbon(path.points,path.width+.8,GARDEN_PALETTE.edge,.012);ribbon(path.points,path.width,colors.path,.022);}
  const riverSurface=box(centerX,-.055,(RIVER.minZ+RIVER.maxZ)/2,worldWidth,.1,RIVER.maxZ-RIVER.minZ,colors.water);riverSurface.castShadow=false;
  // Open water meets the lawns directly; no bank strip cuts through imported decks.
  function raisedSurface(x,startZ,endZ,width,color){
    const vertices=[],indices=[],columns=24,rows=60;
    for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++){const px=x-width/2+width*column/columns,pz=startZ+(endZ-startZ)*row/rows;vertices.push(px,terrainHeight(pz,px)+.025,pz);}
    for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){const a=row*(columns+1)+column,b=a+1,c=a+columns+1,d=c+1;indices.push(a,c,b,b,c,d);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material(color));mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
  }
  const bridgeSurfaces=[];
  for(const bridge of BRIDGES)bridgeSurfaces.push(raisedSurface(bridge.x,bridge.minZ,bridge.maxZ,bridge.width,'#d4c7ae'));
  // The continuous sand surface reads as a garden path; navigation supplies its own route cue.
  disc(START.x,START.z,5.2,colors.path);label('ARRIVAL',ARRIVAL_SIGN.x,1.3,ARRIVAL_SIGN.z,4.6,.8);box(ARRIVAL_SIGN.x,.4,ARRIVAL_SIGN.z,.25,.8,.25,colors.structure);
  for(const [id,stop]of Object.entries(STOPS)){
    disc(stop.focus.x,stop.focus.z,stop.size,colors.court);
    const ring=new THREE.Mesh(new THREE.RingGeometry(stop.size-.1,stop.size,64),new THREE.MeshBasicMaterial({color:'#acb5a3',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(stop.focus.x,.047,stop.focus.z);scene.add(ring);
    const sign=STOP_SIGNS[id];const board=label(sign.text??`${stop.number}  ${stop.title}`,sign.x,sign.y,sign.z,sign.width,sign.height??.75,sign.fontSize??58,sign.fontScale??.55);board.rotation.y=sign.yaw??0;
    if(id==='projects'&&!sign.attached)box(sign.x,.45,sign.z,.18,.9,.18,colors.structure);
  }
  const landmarks=landmarkFactory(scene,colors);
  const bridgeDecks=createBridgeDecks(scene,colors);
  const studioDisplays=createStudioDisplays(landmarks.studioRoots,colors);
  const wayfinding=createWayfinding(scene);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.25,.34,40),new THREE.MeshBasicMaterial({color:'#365e4f',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.visible=false;scene.add(ring);
  let routeLine=null;
  function setRoute(points){if(routeLine){scene.remove(routeLine);routeLine.geometry.dispose();routeLine.material.dispose();routeLine=null;}if(!points?.length)return;const linePoints=[];for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.5));for(let j=i?1:0;j<=steps;j++){const t=j/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;linePoints.push(new THREE.Vector3(x,terrainHeight(z,x)+.10,z));}}routeLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints),new THREE.LineDashedMaterial({color:GARDEN_PALETTE.route,dashSize:.7,gapSize:.45,transparent:true,opacity:.95}));routeLine.computeLineDistances();scene.add(routeLine);}
  return {ground,riverSurface,ring,landmarks,studioDisplays,bridgeDecks,bridgeSurfaces,wayfinding,colliders:[...STRUCTURE_COLLIDERS,...wayfinding.colliders],setRoute,update(time,reduced,dt=.016){studioDisplays.update(dt,reduced);}};
}
