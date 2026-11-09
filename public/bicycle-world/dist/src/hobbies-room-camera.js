import * as THREE from 'three';

const clamp=value=>THREE.MathUtils.clamp(Number(value)||0,0,1);
const smooth=value=>value*value*(3-2*value);

/** Story subjects, including their full open poses, clear the reading rail. */
export const HOBBIES_FOCUS_BOUNDS=Object.freeze([
  Object.freeze({min:[-12,.14,-7.5],max:[-3,6.85,.6]}),
  Object.freeze({min:[3.4,.08,-6.7],max:[11.7,5.4,1.9]})
]);
const normals=[new THREE.Vector3(.12,.18,1).normalize(),new THREE.Vector3(.28,.95,1).normalize()];
const centers=[[-7.5,3.3,-3.8],[7.55,1.55,-2.4]];
let viewportCache=null,poseCache=null;

function fit(index,{width,height}){
  const fov=43,aspect=width/height,normal=normals[index].clone();
  const points=[],bounds=HOBBIES_FOCUS_BOUNDS[index];
  for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])points.push(new THREE.Vector3(x,y,z));
  const camera=new THREE.PerspectiveCamera(fov,aspect,.1,180),base=new THREE.Vector3(...centers[index]);
  const up=new THREE.Vector3(0,1,0).addScaledVector(normal,-normal.y).normalize();
  const top=110,bottom=Math.max(310,height-228),left=32,right=width-32,centerY=1-(top+bottom)/height;
  let distance=16,position,target;
  for(let pass=0;pass<100;pass++){
    target=base.clone();position=target.clone().addScaledVector(normal,distance);
    for(let correction=0;correction<3;correction++){
      camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);
      const projected=points.map(p=>p.clone().project(camera));
      const middle=(Math.min(...projected.map(p=>p.y))+Math.max(...projected.map(p=>p.y)))/2;
      const shift=(middle-centerY)*distance*Math.tan(THREE.MathUtils.degToRad(fov/2));
      position.addScaledVector(up,shift);target.addScaledVector(up,shift);
    }
    camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);
    if(points.every(p=>{const q=p.clone().project(camera),x=(q.x+1)*width/2,y=(1-q.y)*height/2;return x>=left&&x<=right&&y>=top&&y<=bottom;}))break;
    distance*=1.035;
  }
  return {position,target,normal,fov,aspect,distance};
}

/** Two full-size subjects: an intimate stage and an elevated communal circle. */
export function hobbiesRoomView(index,{width=1280,height=720}={}){
  width=Math.max(1,width);height=Math.max(1,height);index=THREE.MathUtils.clamp(Number(index)||0,0,1);
  if(!viewportCache||viewportCache.width!==width||viewportCache.height!==height){viewportCache={width,height};poseCache=[0,1].map(i=>fit(i,viewportCache));}
  const a=Math.floor(index),b=Math.min(1,a+1),t=smooth(index-a),from=poseCache[a],to=poseCache[b];
  const position=from.position.clone().lerp(to.position,t),target=from.target.clone().lerp(to.target,t);
  const normal=position.clone().sub(target).normalize();
  position.addScaledVector(normal,-Math.sin(t*Math.PI)*.75);
  return {position,target,normal,fov:from.fov,aspect:from.aspect,distance:position.distanceTo(target)};
}

/** Walk through a low timber pavilion gate before the camera settles. */
export function hobbiesEntrancePose(index,view,progress){
  const base=hobbiesRoomView(index,view),p=clamp(progress),travel=smooth(clamp((p-.16)/.84));
  const position=base.position.clone().addScaledVector(base.normal,(1-travel)*8.5);
  const portal=base.position.clone().addScaledVector(base.normal,3.4);portal.y=base.position.y-4.2;
  const openness=smooth(clamp(p/.59));
  return {...base,position,progress:p,openness,entrance:{position:portal,rotationY:Math.atan2(base.normal.x,base.normal.z),visible:p<1,openness,width:10,height:9}};
}
