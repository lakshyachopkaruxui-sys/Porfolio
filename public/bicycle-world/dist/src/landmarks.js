import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {LANDMARKS,STOP_SIGNS} from './layout.js';
import {LANDMARK_SCALE} from './landmark-proportions.js';
import {buildWorksExterior} from './works-exterior.js';
import {buildAboutExterior} from './about-exterior.js';
import {buildHobbiesExterior} from './hobbies-exterior.js';
import {buildOakLabExterior} from './oak-lab-exterior.js';
import {buildCloudExterior} from './cloud-exterior.js';

/** Garden buildings occupy the original destination pockets.
 * Static details are merged per place/material; interiors own their project art. */
export function createLandmarks(scene, colors) {
  const geometries=new Set(),materials=new Set();
  const material = (color,name) => {const value=new THREE.MeshStandardMaterial({color,roughness:1});value.name=name;materials.add(value);return value;};
  const clay = material('#aeb09e','Garden limestone');
  const edge = material(colors.edge,'Pale stone trim');
  const timber = material('#98714e','Natural timber');
  const lightTimber = material('#c49c70','Light garden timber');
  const moss = material('#496d58','Garden roof');
  const recess = material(colors.ink,'Recess and hardware');
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 24);
  const roots = new Map();
  const studioRoots = new Map();

  function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, mat);
    geometries.add(geometry);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  function box(parent, x, y, z, width, height, depth, mat = clay) {
    const object = mesh(parent, unitBox, mat, x, y, z);
    object.scale.set(width, height, depth);
    return object;
  }

  function cylinder(parent, x, y, z, radius, height, mat = clay) {
    const object = mesh(parent, unitCylinder, mat, x, y, z);
    object.scale.set(radius, height, radius);
    return object;
  }

  function beam(parent, from, to, radius, mat = clay) {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start), midpoint = start.clone().add(end).multiplyScalar(.5);
    const object = cylinder(parent, midpoint.x, midpoint.y, midpoint.z, radius, direction.length(), mat);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return object;
  }

  function group(id, x = 0, z = 0) {
    const root = new THREE.Group();
    root.name = `Landmark: ${id}`;
    root.position.set(x, 0, z);
    root.userData.stop = id;
    roots.set(id, root);
    scene.add(root);
    return root;
  }

  function plinth(parent, radius, height = .32) {
    // A visible vertical face explains why this footprint is not rideable ground.
    const base = cylinder(parent, 0, height / 2, 0, radius, height, clay);
    base.name = 'Solid landmark plinth';
    base.userData.keepFootprint=true;
    cylinder(parent, 0, height + .025, 0, radius - .08, .05, edge);
  }

  // One exhibition house, kept inside the original court and collision base.
  const worksSpec=LANDMARKS.projects;
  const works=group('projects',worksSpec.x,worksSpec.z);
  works.rotation.y=worksSpec.yaw||0;
  plinth(works,worksSpec.radius/LANDMARK_SCALE.projects.xz,.24);
  buildWorksExterior({root:works,spec:worksSpec,mesh,box,beam,material});

  // A weather lookout occupies the unchanged eastern photography footprint.
  const skySpec = LANDMARKS.cloud;
  const sky = group('cloud', skySpec.x, skySpec.z);
  plinth(sky, skySpec.radius/LANDMARK_SCALE.cloud.xz);
  buildCloudExterior({root:sky,spec:skySpec,mesh,box,material});

  // Hobbies occupies the original collection footprint and approach.
  const workSpec = LANDMARKS.work;
  const collection = group('work', workSpec.x, workSpec.z);
  plinth(collection, workSpec.radius/LANDMARK_SCALE.work.xz);
  buildHobbiesExterior({root:collection,spec:workSpec,mesh,box,material});
  // Oak’s lab replaces the bandshell inside the same destination pocket.
  const musicSpec = LANDMARKS.music;
  const music = group('music', musicSpec.x, musicSpec.z);
  plinth(music, musicSpec.radius/LANDMARK_SCALE.music.xz, .48);
  buildOakLabExterior({root:music,spec:musicSpec,mesh,box,material});

  // The western gathering place introduces Lakshya before the Works stop.
  const aboutSpec = LANDMARKS.about;
  const pavilion = group('about', aboutSpec.x, aboutSpec.z);
  plinth(pavilion, aboutSpec.radius/LANDMARK_SCALE.about.xz, .30);
  buildAboutExterior({root:pavilion,spec:aboutSpec,mesh,box,beam,material});
  // A physical timber frame supports each independently sized label. Cancel
  // architectural scaling before turning the frame, preserving round posts
  // and the exact text aperture rather than skewing them with the building.
  for(const [id,root] of roots){
    const sign=STOP_SIGNS[id];if(!sign.framed)continue;
    const scale=LANDMARK_SCALE[id],anchor=new THREE.Group(),frame=new THREE.Group();
    anchor.position.set((sign.x-root.position.x)/scale.xz,sign.y/scale.y,(sign.z-root.position.z)/scale.xz);
    anchor.scale.set(1/scale.xz,1/scale.y,1/scale.xz);root.add(anchor);anchor.add(frame);frame.rotation.y=sign.yaw;
    const w=sign.width,h=sign.height;
    box(frame,0,0,-.10,w,h,.12,lightTimber);
    box(frame,0,h/2+.055,-.065,w+.22,.11,.12,timber);
    box(frame,0,-h/2-.055,-.065,w+.22,.11,.12,timber);
    for(const side of [-1,1]){
      box(frame,side*(w/2+.055),0,-.065,.11,h,.12,timber);
      const length=sign.y-h/2;
      box(frame,side*w*.34,-h/2-length/2,-.10,.12,length,.12,timber);
    }
  }
  // Submit static detail once per place/material. The physical bases stay
  // explicit for collision auditing; the Works interior owns its project art.
  // Bake the small architectural palette into vertex colours. Structure can
  // carry different timber/stone/glazing tones without a draw call per tone.
  const paletteMaterials=new Map();
  function paletteMaterial(side){
    if(!paletteMaterials.has(side)){
      const mat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,vertexColors:true,side});
      mat.name='Garden architecture palette';materials.add(mat);paletteMaterials.set(side,mat);
    }
    return paletteMaterials.get(side);
  }
  for(const root of roots.values()){
    root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map(),sources=[];
    root.traverse(object=>{
      if(!object.isMesh||object.userData.keepFootprint)return;
      let geometry=object.geometry.clone();
      if(geometry.index){const expanded=geometry.toNonIndexed();geometry.dispose();geometry=expanded;}
      geometry.deleteAttribute('uv');geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld));
      const color=object.material.color,vertexColors=new Float32Array(geometry.attributes.position.count*3);
      for(let i=0;i<vertexColors.length;i+=3){vertexColors[i]=color.r;vertexColors[i+1]=color.g;vertexColors[i+2]=color.b;}
      geometry.setAttribute('color',new THREE.BufferAttribute(vertexColors,3));
      const mat=paletteMaterial(object.material.side);
      if(!buckets.has(mat))buckets.set(mat,[]);buckets.get(mat).push(geometry);sources.push(object);
    });
    sources.forEach(object=>object.removeFromParent());
    for(const [mat,parts] of buckets){
      const geometry=mergeGeometries(parts,false);parts.forEach(part=>part.dispose());
      if(!geometry)throw new Error('Garden landmark geometry could not be batched.');
      geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const batch=mesh(root,geometry,mat);batch.name=`Garden architecture: ${mat.name}`;
    }
  }
  // Scale the complete architecture once, retaining batching and grounded bases.
  for(const [id,root] of roots){
    const scale=LANDMARK_SCALE[id];root.scale.set(scale.xz,scale.y,scale.xz);
    const entry=root.userData.entry;
    if(entry){entry.x=root.position.x+(entry.x-root.position.x)*scale.xz;entry.z=root.position.z+(entry.z-root.position.z)*scale.xz;entry.y*=scale.y;}
  }
  const used=new Set(),usedMaterials=new Set();for(const root of roots.values())root.traverse(object=>{if(object.isMesh){used.add(object.geometry);usedMaterials.add(object.material);}});
  for(const geometry of geometries)if(!used.has(geometry)){geometry.dispose();geometries.delete(geometry);}
  for(const mat of materials)if(!usedMaterials.has(mat)){mat.dispose();materials.delete(mat);}
  let disposed=false;
  return {roots,studioRoots,dispose(){if(disposed)return;disposed=true;for(const root of roots.values())root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
