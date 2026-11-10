import * as THREE from 'three';

export const ABOUT_JOURNAL_BOOK_BOUNDS=Object.freeze({
  min:Object.freeze([-4.3,2.955,-1.875]),
  max:Object.freeze([4.3,3.425,2.675])
});

const clamp=value=>THREE.MathUtils.clamp(Number(value)||0,0,1);
const ease=value=>value*value*(3-2*value);
const corners=bounds=>[bounds.min[0],bounds.max[0]].flatMap(x=>[bounds.min[1],bounds.max[1]].flatMap(y=>[bounds.min[2],bounds.max[2]].map(z=>new THREE.Vector3(x,y,z))));
const bookPoints=corners(ABOUT_JOURNAL_BOOK_BOUNDS);
const studioPoints=corners({min:[-8.4,.03,-5.1],max:[6.3,8.5,4.4]});
let cached=null;

function projection(points,pose,width,height){
  const camera=new THREE.PerspectiveCamera(pose.fov,width/height,.1,100);
  camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld(true);
  const projected=points.map(point=>point.clone().project(camera));
  const left=(Math.min(...projected.map(point=>point.x))+1)*width/2;
  const right=(Math.max(...projected.map(point=>point.x))+1)*width/2;
  const top=(1-Math.max(...projected.map(point=>point.y)))*height/2;
  const bottom=(1-Math.min(...projected.map(point=>point.y)))*height/2;
  return {left,top,right,bottom,width:right-left,height:bottom-top};
}

function fit(points,{width,height,fov,normal,target,safe,minimumDistance}){
  const screenUp=new THREE.Vector3(0,1,0).addScaledVector(normal,-normal.y).normalize();
  let distance=minimumDistance,pose;
  const desiredY=(safe.top+safe.bottom)/2;
  for(let pass=0;pass<95;pass++){
    const at=target.clone(),position=at.clone().addScaledVector(normal,distance);
    for(let correction=0;correction<3;correction++){
      pose={target:at,position,fov};
      const rect=projection(points,pose,width,height);
      const pixelsPerUnit=height/(2*distance*Math.tan(THREE.MathUtils.degToRad(fov/2)));
      const shift=((rect.top+rect.bottom)/2-desiredY)/pixelsPerUnit;
      at.addScaledVector(screenUp,-shift);position.addScaledVector(screenUp,-shift);
    }
    pose={target:at,position,fov};
    const rect=projection(points,pose,width,height);
    if(rect.left>=safe.left&&rect.right<=safe.right&&rect.top>=safe.top&&rect.bottom<=safe.bottom)return {...pose,distance,normal:normal.clone()};
    distance*=1.028;
  }
  return {...pose,distance,normal:normal.clone()};
}

function fitted(width,height){
  if(cached?.width===width&&cached?.height===height)return cached;
  const side=Math.max(28,(width-1320)/2);
  const end=fit(bookPoints,{width,height,fov:35,normal:new THREE.Vector3(0,1,.045).normalize(),target:new THREE.Vector3(0,3.225,.4),safe:{left:side,right:width-side,top:140,bottom:height-74},minimumDistance:6.8});
  const start=fit(studioPoints,{width,height,fov:42,normal:new THREE.Vector3(.47,.32,1).normalize(),target:new THREE.Vector3(-1,3.7,-.15),safe:{left:28,right:width-28,top:112,bottom:height-70},minimumDistance:16});
  cached={width,height,start,end};return cached;
}

/** One reversible route from the portrait/desk composition into a broad sketchbook. */
export function getAboutJournalPose({width=1280,height=720,progress=0}={}){
  width=Math.max(320,Number(width)||1280);height=Math.max(360,Number(height)||720);
  const p=clamp(progress),t=ease(p),{start,end}=fitted(width,height);
  const position=start.position.clone().lerp(end.position,t);
  position.y+=Math.sin(Math.PI*t)*1.15;
  const target=start.target.clone().lerp(end.target,t),fov=THREE.MathUtils.lerp(start.fov,end.fov,t);
  const pose={position,target,normal:position.clone().sub(target).normalize(),fov,aspect:width/height,progress:p};
  pose.bookBounds=projection(bookPoints,pose,width,height);
  pose.distance=position.distanceTo(target);
  return pose;
}
