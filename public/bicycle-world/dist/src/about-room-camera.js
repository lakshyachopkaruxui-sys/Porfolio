import * as THREE from 'three';

const bounded=value=>THREE.MathUtils.clamp(Number(value)||0,0,1);
const ease=value=>value*value*(3-2*value);

/** Real content envelopes; they include furniture in its fully opened pose. */
export const ABOUT_FOCUS_BOUNDS=Object.freeze([
  Object.freeze({min:[-8.4,1.88,-3.66],max:[-4.2,7.42,-3.46]}),
  Object.freeze({min:[-3.65,.05,-2.1],max:[3.65,4.35,3.25]}),
  Object.freeze({min:[3.4,.65,-5.25],max:[10.5,8.1,1.15]})
]);
const normals=[new THREE.Vector3(.29,.16,1).normalize(),new THREE.Vector3(.20,.65,1).normalize(),new THREE.Vector3(.24,.18,1).normalize()];
const centerOverrides=[[-6.05,3.65,.05],[0,1.8,.4],[6.95,4.2,-2.5]];
const conversationFurniture=[[-9.3,.05,-.8],[-9.3,3.0,.2],[-7.2,.05,1.6],[-7.2,3.0,1.6],[-5.4,.05,4.0],[-5.4,2.8,4.0],[-2.8,.05,3.2],[-2.8,2.8,3.2]];
let fittedViewport=null,fittedPoses=null;

function fitChapter(index,{width,height}){
  const fov=43,aspect=width/height,normal=normals[index].clone();
  const top=102,bottom=height-228,left=34,right=width-34;
  const desiredCenter=1-(top+bottom)/height;
  const bounds=ABOUT_FOCUS_BOUNDS[index],points=[];
  for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])points.push(new THREE.Vector3(x,y,z));
  if(index===0)points.push(...conversationFurniture.map(point=>new THREE.Vector3(...point)));
  const base=new THREE.Vector3(...centerOverrides[index]),camera=new THREE.PerspectiveCamera(fov,aspect,.1,160);
  const up=new THREE.Vector3(0,1,0).addScaledVector(normal,-normal.y).normalize();
  let distance=index===1?16.2:18.2,target,position;
  for(let iteration=0;iteration<90;iteration++){
    target=base.clone();position=target.clone().addScaledVector(normal,distance);
    for(let correction=0;correction<3;correction++){
      camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);
      const projected=points.map(point=>point.clone().project(camera));
      const middle=(Math.min(...projected.map(p=>p.y))+Math.max(...projected.map(p=>p.y)))/2;
      const shift=(middle-desiredCenter)*distance*Math.tan(THREE.MathUtils.degToRad(fov/2));
      target.addScaledVector(up,shift);position.addScaledVector(up,shift);
    }
    camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);
    const projected=points.map(point=>point.clone().project(camera));
    const fits=projected.every(p=>(p.x+1)*width/2>=left&&(p.x+1)*width/2<=right&&(1-p.y)*height/2>=top&&(1-p.y)*height/2<=bottom);
    if(fits)break;
    distance*=1.035;
  }
  return {position,target,normal,fov,aspect,distance};
}

/** A conversation, an elevated working view, and an oblique open window. */
export function aboutRoomView(index,{width=1280,height=720}={}){
  width=Math.max(1,width);height=Math.max(1,height);index=THREE.MathUtils.clamp(Number(index)||0,0,2);
  // Fitting is viewport work, not frame work. Keep exactly three cached poses
  // and return fresh vectors so callers cannot mutate that shared solution.
  if(!fittedViewport||fittedViewport.width!==width||fittedViewport.height!==height){
    fittedViewport={width,height};fittedPoses=[0,1,2].map(chapter=>fitChapter(chapter,fittedViewport));
  }
  const a=Math.floor(index),b=Math.min(2,a+1),t=ease(index-a);
  const from=fittedPoses[a];
  if(a===b||!t)return {...from,position:from.position.clone(),target:from.target.clone(),normal:from.normal.clone()};
  const to=fittedPoses[b];
  const position=from.position.clone().lerp(to.position,t),target=from.target.clone().lerp(to.target,t);
  // A shallow forward bow makes the transition travel through the room rather
  // than sliding a flat camera along the back wall.
  const normal=position.clone().sub(target).normalize();
  position.addScaledVector(normal,-Math.sin(t*Math.PI)*.65);
  return {position,target,normal,fov:from.fov,aspect:from.aspect,distance:position.distanceTo(target)};
}

/** The timber threshold stays fixed while its shutters clear the camera path. */
export function aboutEntrancePose(index,view,progress){
  const pose=aboutRoomView(index,view),p=bounded(progress),travel=ease(bounded((p-.16)/.84));
  const position=pose.position.clone().addScaledVector(pose.normal,(1-travel)*8.5);
  const portal=pose.position.clone().addScaledVector(pose.normal,3.4);
  portal.y=pose.position.y-4.2;
  return {...pose,position,progress:p,openness:ease(bounded(p/.59)),entrance:{position:portal,rotationY:Math.atan2(pose.normal.x,pose.normal.z),visible:p<1,openness:ease(bounded(p/.59)),width:10.0,height:9.0}};
}
