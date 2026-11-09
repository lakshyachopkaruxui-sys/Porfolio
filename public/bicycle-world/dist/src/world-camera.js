import * as THREE from 'three';

// An orthographic camera can move backwards along its viewing axis without
// changing composition. The original eye sat inside the flight envelope and
// its near plane sliced airborne characters in the middle of the viewport.
const originalOffset=new THREE.Vector3(12,17.5,17.5);
const extraDepth=originalOffset.length()*3;
export const WORLD_CAMERA_OFFSET=originalOffset.clone().multiplyScalar(4);
export const WORLD_CAMERA_NEAR=.1;
export const WORLD_CAMERA_FAR=180+extraDepth;
// Linear fog uses view-space depth. Translate its range by the same distance
// so this clipping repair does not wash out the existing garden presentation.
export const WORLD_FOG_NEAR=75+extraDepth;
export const WORLD_FOG_FAR=160+extraDepth;
