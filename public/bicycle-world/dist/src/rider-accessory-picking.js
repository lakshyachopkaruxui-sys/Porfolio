import * as THREE from 'three';

/** Expanded hit discs can overlap even when the two physical controls do not.
 * Prefer the disc whose centre the pointer targets, then depth for exact ties.
 * The caller still resolves the chosen accessory against scene occlusion. */
export function nearestRiderAccessory(a,b){
  if(!a)return b;
  if(!b)return a;
  const aError=Number.isFinite(a.radialError)?a.radialError:Infinity;
  const bError=Number.isFinite(b.radialError)?b.radialError:Infinity;
  if(aError<bError)return a;
  if(bError<aError)return b;
  return a.distance<=b.distance?a:b;
}

/** An invisible camera-facing hit disc, measured in CSS pixels. The physical
 * accessory keeps its own size; this helper owns no rendered mesh or resource.
 * Results and scratch values are reused. The caller resolves scene occlusion. */
export function createRiderAccessoryPicking(anchor,object=anchor,{pixelRadius=22}={}){
  const center=new THREE.Vector3(),cameraSpace=new THREE.Vector3(),projected=new THREE.Vector3();
  const normal=new THREE.Vector3(),point=new THREE.Vector3(),plane=new THREE.Plane();
  const hit={object,point,distance:0,radialError:0};
  return function pick(ray,camera,viewportHeight){
    if(!Number.isFinite(viewportHeight)||viewportHeight<=0||!ray?.intersectPlane||!camera?.isCamera)return null;
    for(let parent=anchor;parent;parent=parent.parent)if(!parent.visible)return null;
    camera.updateWorldMatrix(true,false);anchor.getWorldPosition(center);
    cameraSpace.copy(center).applyMatrix4(camera.matrixWorldInverse);
    const depth=-cameraSpace.z;
    if(!Number.isFinite(depth)||depth<camera.near||depth>camera.far)return null;
    projected.copy(cameraSpace).applyMatrix4(camera.projectionMatrix);
    if(Math.abs(projected.x)>1||Math.abs(projected.y)>1)return null;
    const span=camera.isPerspectiveCamera?2*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/camera.zoom
      :camera.isOrthographicCamera?(camera.top-camera.bottom)/camera.zoom:0;
    const radius=span/viewportHeight*pixelRadius;
    if(!Number.isFinite(radius)||radius<=0)return null;
    camera.getWorldDirection(normal);plane.setFromNormalAndCoplanarPoint(normal,center);
    if(!ray.intersectPlane(plane,point))return null;
    const radialError=point.distanceToSquared(center)/(radius*radius);
    if(radialError>1)return null;
    hit.distance=ray.origin.distanceTo(point);hit.radialError=radialError;return hit;
  };
}
