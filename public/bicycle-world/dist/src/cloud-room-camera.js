import * as THREE from 'three';

const clamp=value=>THREE.MathUtils.clamp(Number(value)||0,0,1);
const smooth=value=>value*value*(3-2*value);

/** The architecture makes scale legible while the open sky remains the subject. */
export const CLOUD_FOCUS_BOUNDS=Object.freeze([
  Object.freeze({min:[-13.1,.2,-6.2],max:[-2.9,9.2,-3.8]}),
  Object.freeze({min:[-3.2,.2,-5.8],max:[3.2,6.5,1.6]}),
  Object.freeze({min:[5.0,2.3,-21],max:[13.6,7.7,-15]})
]);
const normals=[new THREE.Vector3(.08,.06,1).normalize(),new THREE.Vector3(.09,.13,1).normalize(),new THREE.Vector3(.12,.10,1).normalize()];
const centers=[[-8,4.5,-5],[0,3.7,-3],[9.3,4.8,-18]];
export const CLOUD_VIEWFINDER_BOUNDS=Object.freeze({min:[-4.8,3.8,-20.1],max:[3.2,8.6,-16.1]});
let viewportCache=null,poseCache=null,lensCache=null;

function fitSubject(bounds,base,normal,{width,height},minimumDistance=17,sidePadding=55){
  // Fit the narrowest camera state, so a deliberate zoom never crops the subject.
  const fov=39,aspect=width/height,points=[];
  for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])points.push(new THREE.Vector3(x,y,z));
  const camera=new THREE.PerspectiveCamera(fov,aspect,.1,220);
  const up=new THREE.Vector3(0,1,0).addScaledVector(normal,-normal.y).normalize();
  const top=112,bottom=Math.max(310,height-228),left=sidePadding,right=width-sidePadding,centerY=1-(top+bottom)/height;
  let distance=minimumDistance,position,target;
  for(let pass=0;pass<100;pass++){
    target=base.clone();position=target.clone().addScaledVector(normal,distance);
    for(let correction=0;correction<3;correction++){
      camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);
      const projected=points.map(p=>p.clone().project(camera));
      const middle=(Math.min(...projected.map(p=>p.y))+Math.max(...projected.map(p=>p.y)))/2;
      const shift=(middle-centerY)*distance*Math.tan(THREE.MathUtils.degToRad(fov/2));position.addScaledVector(up,shift);target.addScaledVector(up,shift);
    }
    camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);
    if(points.every(p=>{const q=p.clone().project(camera),x=(q.x+1)*width/2,y=(1-q.y)*height/2;return x>=left&&x<=right&&y>=top&&y<=bottom;}))break;
    distance*=1.03;
  }
  return {position,target,normal,fov,aspect,distance};
}
const fit=(index,view)=>fitSubject(CLOUD_FOCUS_BOUNDS[index],new THREE.Vector3(...centers[index]),normals[index].clone(),view);

function fitLens({width,height}){
  const aspect=width/height,bounds=CLOUD_VIEWFINDER_BOUNDS,points=[];
  for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])points.push(new THREE.Vector3(x,y,z));
  const camera=new THREE.PerspectiveCamera(39,aspect,.1,220),top=112,bottom=Math.max(310,height-228),centerY=1-(top+bottom)/height;
  let fov=39,position,target;
  // The photographing viewpoint stays beyond the entire window. Responsive
  // framing changes its lens rather than backing into the open shutter leaves.
  for(let pass=0;pass<70;pass++){
    position=new THREE.Vector3(-.8,6.5,-6);target=new THREE.Vector3(-.8,5.5,-18.1);camera.fov=fov;camera.updateProjectionMatrix();
    for(let correction=0;correction<4;correction++){
      camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);const projected=points.map(p=>p.clone().project(camera));
      const middle=(Math.min(...projected.map(p=>p.y))+Math.max(...projected.map(p=>p.y)))/2;
      const shift=(middle-centerY)*position.distanceTo(target)*Math.tan(THREE.MathUtils.degToRad(fov/2));position.y+=shift;target.y+=shift;
    }
    camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);
    if(points.every(p=>{const q=p.clone().project(camera),x=(q.x+1)*width/2,y=(1-q.y)*height/2;return x>=90&&x<=width-90&&y>=top&&y<=bottom;}))break;
    fov+=.5;
  }
  return {position,target,normal:position.clone().sub(target).normalize(),fov,aspect,distance:position.distanceTo(target)};
}

/** The viewfinder changes the subject from the camera to the cloud beyond it. */
export function cloudFocusBounds(index,framing=0){
  index=THREE.MathUtils.clamp(Number(index)||0,0,2);const a=Math.floor(index),b=Math.min(2,a+1),t=smooth(index-a),weight=clamp(framing)*smooth(1-Math.abs(index-1));
  const blend=(key)=>CLOUD_FOCUS_BOUNDS[a][key].map((value,i)=>THREE.MathUtils.lerp(THREE.MathUtils.lerp(value,CLOUD_FOCUS_BOUNDS[b][key][i],t),CLOUD_VIEWFINDER_BOUNDS[key][i],weight));
  return {min:blend('min'),max:blend('max')};
}

/** Three gentle viewpoints along a real deck; framing changes the visible sky. */
export function cloudRoomView(index,{width=1280,height=720,pan=0,framing=0}={}){
  width=Math.max(1,width);height=Math.max(1,height);index=THREE.MathUtils.clamp(Number(index)||0,0,2);pan=THREE.MathUtils.clamp(Number(pan)||0,-1,1);framing=clamp(framing);
  if(!viewportCache||viewportCache.width!==width||viewportCache.height!==height){viewportCache={width,height};poseCache=[0,1,2].map(i=>fit(i,viewportCache));lensCache=fitLens(viewportCache);}
  const a=Math.floor(index),b=Math.min(2,a+1),t=smooth(index-a),from=poseCache[a],to=poseCache[b];
  const position=from.position.clone().lerp(to.position,t),target=from.target.clone().lerp(to.target,t);
  const framingWeight=framing*smooth(1-Math.abs(index-1));
  position.lerp(lensCache.position,framingWeight);target.lerp(lensCache.target,framingWeight);
  // A small lateral dolly reveals real parallax, rather than scrolling a sky image.
  position.x+=pan*.75;target.x+=pan*.75;
  const normal=position.clone().sub(target).normalize();position.addScaledVector(normal,-Math.sin(t*Math.PI)*.65);
  const fov=THREE.MathUtils.lerp(43,lensCache.fov,framingWeight);
  return {position,target,normal,fov,aspect:from.aspect,distance:position.distanceTo(target)};
}

export function cloudEntrancePose(index,view,progress){
  const base=cloudRoomView(index,{...view,pan:0}),p=clamp(progress),travel=smooth(clamp((p-.16)/.84));
  const position=base.position.clone().addScaledVector(base.normal,(1-travel)*8.5);
  const portal=base.position.clone().addScaledVector(base.normal,3.4);portal.y=base.position.y-4.2;
  const openness=smooth(clamp(p/.59));
  return {...base,position,progress:p,openness,entrance:{position:portal,rotationY:Math.atan2(base.normal.x,base.normal.z),visible:p<1,openness,width:10,height:9}};
}
