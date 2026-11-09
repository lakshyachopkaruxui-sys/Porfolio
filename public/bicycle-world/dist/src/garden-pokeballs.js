import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {gardenClearance} from './garden-nature.js';
import {disposeCharacterAsset} from './character-loader.js';
import {withinDeadline} from './loading.js';

export const GARDEN_POKEBALL_URL = new URL('../assets/oak-lab/pokeballs-variety.glb', import.meta.url).href;
export const GARDEN_POKEBALL_VARIANTS = Object.freeze(['ClassicBall','UltraBall','MasterBall','GreatBall','HeavyBall','HealBall','LoveBall','DiveBall','LureBall','CherishBall']);

// Six open lawn pairs. Every supplied variant appears; larger silhouettes act
// as landmarks while the smaller companion balls keep a clear sense of scale.
// Positions preserve the original roads and avoid actual tree crown envelopes.
export const GARDEN_POKEBALL_PLACEMENTS = Object.freeze([
  {id:'arrival-ultra',variant:'UltraBall',x:27,z:14,height:3.7,yaw:-.19,kind:'monument'},
  {id:'arrival-classic',variant:'ClassicBall',x:30.5,z:15,height:1.15,yaw:.059,lean:.12,kind:'small'},
  {id:'south-love',variant:'LoveBall',x:-7,z:28,height:1.6,yaw:2.669,lean:-.1,kind:'medium'},
  {id:'south-heal',variant:'HealBall',x:-8.5,z:26.5,height:1.2,yaw:2.543,kind:'small'},
  {id:'west-master',variant:'MasterBall',x:-33,z:-31,height:3.8,yaw:-.163,kind:'monument'},
  {id:'west-great',variant:'GreatBall',x:-29.5,z:-31.5,height:1.35,yaw:3.01,lean:-.16,kind:'small'},
  {id:'north-heavy',variant:'HeavyBall',x:-34,z:-81,height:3.2,yaw:1.625,kind:'monument'},
  {id:'north-cherish',variant:'CherishBall',x:-37,z:-83,height:1.6,yaw:-2.771,kind:'medium'},
  {id:'lab-lure',variant:'LureBall',x:29,z:-75,height:1.9,yaw:.157,kind:'medium'},
  {id:'lab-love',variant:'LoveBall',x:32,z:-74,height:.9,yaw:-.021,lean:.14,kind:'small'},
  {id:'river-dive',variant:'DiveBall',x:20,z:-33,height:2,yaw:.939,kind:'medium'},
  {id:'river-heal',variant:'HealBall',x:23,z:-34,height:1.15,yaw:.875,lean:-.12,kind:'small'},
].map(Object.freeze));

function placedBounds(surfaces,placement){
  const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,placement.yaw,placement.lean||0,'YXZ'));
  const point=new THREE.Vector3();let radius=0,minY=Infinity,maxY=-Infinity;
  for(const surface of surfaces){const position=surface.geometry.attributes.position;
    for(let i=0;i<position.count;i++){
      point.fromBufferAttribute(position,i);point.y-=.5;point.applyQuaternion(rotation);
      radius=Math.max(radius,Math.hypot(point.x,point.z));minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);
    }
  }
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(placement.x,-minY*placement.height-.025,placement.z),rotation,new THREE.Vector3().setScalar(placement.height));
  matrix.multiply(new THREE.Matrix4().makeTranslation(0,-.5,0));
  return {...placement,radius:radius*placement.height+.08,top:(maxY-minY)*placement.height-.025,matrix};
}

// One small shared radial mesh grounds all displays without a shadow-map pass,
// texture download, animation or per-frame allocation.
function contactShadows(placements){
  const geometry=new THREE.CircleGeometry(1,24),colors=[];
  for(let i=0;i<geometry.attributes.position.count;i++)colors.push(1,1,1,i===0?.23:0);
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
  const material=new THREE.MeshBasicMaterial({color:'#183020',vertexColors:true,transparent:true,depthWrite:false});
  const mesh=new THREE.InstancedMesh(geometry,material,placements.length);mesh.name='Ball ground contacts';
  const transform=new THREE.Object3D();
  placements.forEach((p,i)=>{transform.position.set(p.x,-.023,p.z);transform.rotation.set(-Math.PI/2,0,0);transform.scale.set(p.radius*1.04,p.radius*.92,1);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.computeBoundingBox();
  return mesh;
}

/** Transfer ownership of this dedicated source scene into a static display.
 * Geometry, materials and textures remain shared across instances and are
 * released once by dispose(). Callers must not reuse source after that point. */
export function createGardenPokeballs(source) {
  const root = new THREE.Group(); root.name = 'Garden Pokeball displays';
  const colliders = [], placements = [], skipped = [], batches = [];
  let triangles = 0, disposed = false, contacts;
  source.updateMatrixWorld(true);
  try {
    for (const variant of GARDEN_POKEBALL_VARIANTS) {
      const prototype = source.getObjectByName(variant);
      if (!prototype) throw new Error('The selected ball asset is missing ' + variant);
      const surfaces = [];
      prototype.traverse(mesh => {
        if (!mesh.isMesh) return;
        if (Array.isArray(mesh.material)) throw new Error('Ball surfaces must have one material each.');
        surfaces.push(mesh);
      });
      if (!surfaces.length) throw new Error('Invalid ball prototype geometry.');
      const items = GARDEN_POKEBALL_PLACEMENTS.filter(p => p.variant === variant).map(p => placedBounds(surfaces,p));
      const accepted = items.filter(p => {
        if (gardenClearance(p.x, p.z, p.radius)) return true;
        skipped.push({id: p.id, reason: 'Layout clearance changed'}); return false;
      });
      if (!accepted.length) continue;
      placements.push(...accepted);
      colliders.push(...accepted.map(p => ({x: p.x, z: p.z, radius: p.radius, kind: 'pokeball', id: p.id})));
      for (const surface of surfaces) {
        const batch = new THREE.InstancedMesh(surface.geometry, surface.material, accepted.length);
        batch.name = variant + ' / ' + surface.name;
        batch.castShadow = false; batch.receiveShadow = true;
        accepted.forEach((p, i) => batch.setMatrixAt(i,p.matrix));
        batch.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        batch.instanceMatrix.needsUpdate = true; batch.computeBoundingSphere(); batch.computeBoundingBox();
        triangles += (surface.geometry.index?.count || surface.geometry.attributes.position.count) / 3 * accepted.length;
        batches.push(batch); root.add(batch);
      }
    }
    if(placements.length){contacts=contactShadows(placements);root.add(contacts);triangles+=24*placements.length;}
    root.updateMatrixWorld(true);
  } catch (error) {
    batches.forEach(batch => batch.dispose()); contacts?.dispose();contacts?.geometry.dispose();contacts?.material.dispose();root.clear(); disposeCharacterAsset(source); throw error;
  }
  const diagnostics = {assetURL: GARDEN_POKEBALL_URL, placements:placements.map(({matrix,...p})=>p), skipped, instances: placements.length, variants:GARDEN_POKEBALL_VARIANTS.length,drawCalls: batches.length+(contacts?1:0), triangles, animated: false, castsShadows: false};
  return {root, colliders, diagnostics, update() {}, dispose() {
    if (disposed) return; disposed = true;
    root.removeFromParent(); batches.forEach(batch => batch.dispose());contacts?.dispose();contacts?.geometry.dispose();contacts?.material.dispose(); root.clear();
    disposeCharacterAsset(source);
  }};
}

/** Optional garden dressing. Failure can be caught without blocking the ride.
 * No character file is requested here; Oak remains a lazy interior asset. */
export async function loadGardenPokeballs(scene, {signal,deadline=6000} = {}) {
  if (signal?.aborted) throw new DOMException('Ball loading cancelled', 'AbortError');
  let expired = false, source = null, released = false, cancel;
  const release = () => {if (source && !released) {released = true; disposeCharacterAsset(source);}};
  const work = new GLTFLoader().loadAsync(GARDEN_POKEBALL_URL).then(gltf => {
    source = gltf.scene; if (expired) release(); return source;
  });
  const cancelled = new Promise((_, reject) => {
    cancel = () => {expired = true; release(); reject(new DOMException('Ball loading cancelled', 'AbortError'));};
    signal?.addEventListener('abort', cancel, {once: true});
  });
  let display;
  try {
    source = await withinDeadline(Promise.race([work, cancelled]), deadline);
    if (signal?.aborted) throw new DOMException('Ball loading cancelled', 'AbortError');
    // createGardenPokeballs assumes ownership, including construction failure.
    released = true; display = createGardenPokeballs(source);
    scene.add(display.root); return display;
  } catch (error) {
    expired = true; display?.dispose(); release(); throw error;
  } finally {signal?.removeEventListener('abort', cancel);}
}
