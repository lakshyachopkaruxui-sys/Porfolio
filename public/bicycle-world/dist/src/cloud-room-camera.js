import * as THREE from 'three';

const clamp=value=>THREE.MathUtils.clamp(Number(value)||0,0,1);
const smooth=value=>value*value*(3-2*value);

/** Both chapters share one camera; their physical reels select the photographs. */
export const CLOUD_FOCUS_BOUNDS=Object.freeze([
  Object.freeze({min:Object.freeze([-7.1,.05,-6.5]),max:Object.freeze([7.1,8.25,-.7])}),
  Object.freeze({min:Object.freeze([-7.1,.05,-6.5]),max:Object.freeze([7.1,8.25,-.7])})
]);

/** World-space opening, not a painted screen or a solid lens. */
export const CLOUD_REEL_APERTURE=Object.freeze({
  center:Object.freeze([0,7.25,-4.25]),halfWidth:.95,halfHeight:.56,
  rearZ:-2.45,frontZ:-6.05,exitZ:-6.85
});

const normals=[new THREE.Vector3(.22,.10,1).normalize(),new THREE.Vector3(-.22,.10,1).normalize()];
const center=new THREE.Vector3(0,4.1,-3.5);
let viewportCache=null,poseCache=null;

function fitSubject(bounds,normal,{width,height}){
  const fov=39,aspect=width/height,points=[];
  for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])points.push(new THREE.Vector3(x,y,z));
  const camera=new THREE.PerspectiveCamera(fov,aspect,.1,220);
  const up=new THREE.Vector3(0,1,0).addScaledVector(normal,-normal.y).normalize();
  const top=112,bottom=Math.max(310,height-228),left=55,right=width-55,centerY=1-(top+bottom)/height;
  let distance=18,position,target;
  for(let pass=0;pass<100;pass++){
    target=center.clone();position=target.clone().addScaledVector(normal,distance);
    for(let correction=0;correction<3;correction++){
      camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);
      const projected=points.map(point=>point.clone().project(camera));
      const middle=(Math.min(...projected.map(point=>point.y))+Math.max(...projected.map(point=>point.y)))/2;
      const shift=(middle-centerY)*distance*Math.tan(THREE.MathUtils.degToRad(fov/2));position.addScaledVector(up,shift);target.addScaledVector(up,shift);
    }
    camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);
    if(points.every(point=>{const q=point.clone().project(camera),x=(q.x+1)*width/2,y=(1-q.y)*height/2;return x>=left&&x<=right&&y>=top&&y<=bottom;}))break;
    distance*=1.03;
  }
  return {position,target,normal,fov,aspect,distance};
}

export function cloudFocusBounds(index){
  index=clamp(index);const bounds=CLOUD_FOCUS_BOUNDS[Math.round(index)];
  return {min:[...bounds.min],max:[...bounds.max]};
}

/** Subtle left/right views keep the camera as the single recognisable entrance. */
export function cloudRoomView(index,{width=1280,height=720,pan=0}={}){
  width=Math.max(1,Number(width)||1280);height=Math.max(1,Number(height)||720);index=clamp(index);pan=THREE.MathUtils.clamp(Number(pan)||0,-1,1);
  if(!viewportCache||viewportCache.width!==width||viewportCache.height!==height){viewportCache={width,height};poseCache=normals.map((normal,i)=>fitSubject(CLOUD_FOCUS_BOUNDS[i],normal.clone(),viewportCache));}
  const t=smooth(index),from=poseCache[0],to=poseCache[1];
  const position=from.position.clone().lerp(to.position,t),target=from.target.clone().lerp(to.target,t);
  position.x+=pan*.45;target.x+=pan*.45;
  const normal=position.clone().sub(target).normalize();
  return {position,target,normal,fov:43,aspect:from.aspect,distance:position.distanceTo(target)};
}

/** A short open-air approach, with no door or opening/closing interaction. */
export function cloudEntrancePose(index,view,progress){
  const base=cloudRoomView(index,{...view,pan:0}),p=clamp(progress);
  const position=base.position.clone().addScaledVector(base.normal,(1-smooth(p))*6.5);
  return {...base,position,progress:p,openness:1,entrance:null};
}

/** Align with the hollow finder, then pass through it into the photograph reel. */
export function cloudReelPose(index,view={},progress=0){
  const base=cloudRoomView(index,view),p=clamp(progress);
  if(p===0)return {...base,progress:0};
  const align=smooth(clamp(p/.42)),travel=smooth(clamp((p-.42)/.58));
  const aligned=new THREE.Vector3(0,CLOUD_REEL_APERTURE.center[1],5.8);
  const exit=new THREE.Vector3(0,CLOUD_REEL_APERTURE.center[1],CLOUD_REEL_APERTURE.exitZ);
  const position=base.position.clone().lerp(aligned,align).lerp(exit,travel);
  const target=base.target.clone().lerp(new THREE.Vector3(0,CLOUD_REEL_APERTURE.center[1],-20),align);
  const normal=position.clone().sub(target).normalize(),fov=THREE.MathUtils.lerp(base.fov,37,smooth(p));
  return {position,target,normal,fov,aspect:base.aspect,distance:position.distanceTo(target),progress:p};
}
