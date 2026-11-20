import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {treeTransplantClearance} from './garden-nature.js';
import {disposeCharacterAsset} from './character-loader.js';
import {withinDeadline} from './loading.js';

export const GARDEN_POKEBALL_URL = new URL('../assets/oak-lab/pokeballs-variety.glb', import.meta.url).href;
export const GARDEN_POKEBALL_VARIANTS = Object.freeze(['ClassicBall','UltraBall','MasterBall','GreatBall','HeavyBall','HealBall','LoveBall','DiveBall','LureBall','CherishBall']);

// Contact height and radius were measured from the final rotated model vertices.
// Reserve these footprints before loading the optional meshes so routes stay clear.
// Irregular riverbank pockets leave both bridge approaches and stunt runways open.
// Original models rest at different angles; actual rotated vertices determine
// contact height and clearance. Blue landmarks lead, pink companions follow.
export const GARDEN_POKEBALL_PLACEMENTS = Object.freeze([
  {"id":"river-dive","radius":2.30063739977123,"centerY":2.1090757192807543,"top":4.193160313696179,"variant":"DiveBall","x":3,"z":-41,"height":4.2,"yaw":0.94,"pitch":0.38,"roll":-0.48,"kind":"monument"},
  {"id":"west-master","radius":2.1222098436701198,"centerY":1.974204264541704,"top":3.9806964691769475,"variant":"MasterBall","x":-55,"z":-41,"height":4,"yaw":-0.16,"pitch":-0.22,"roll":0.31,"kind":"monument"},
  {"id":"west-great","radius":1.9626278153140366,"centerY":1.7284873147842073,"top":3.5487384867560596,"variant":"GreatBall","x":62,"z":-61,"height":3.6,"yaw":2.5,"pitch":0.74,"roll":0.26,"kind":"monument"},
  {"id":"lab-lure","radius":1.7188046960152228,"centerY":1.5415900339196984,"top":3.1440556422985684,"variant":"LureBall","x":20,"z":-41,"height":3.2,"yaw":-0.4,"pitch":-0.42,"roll":1.03,"kind":"monument"},
  {"id":"north-heavy","radius":1.9154902312494075,"centerY":1.528561650969749,"top":3.3223592124220054,"variant":"HeavyBall","x":-64,"z":-61,"height":3.1,"yaw":1.62,"pitch":0.2,"roll":-0.62,"kind":"monument"},
  {"id":"south-love","radius":1.3677609205502372,"centerY":1.2034088261433717,"top":2.494115580296403,"variant":"LoveBall","x":-50.5,"z":-41,"height":2.5,"yaw":2.66,"pitch":-0.3,"roll":0.48,"kind":"medium"},
  {"id":"south-heal","radius":1.2776187014895966,"centerY":1.1457837982572838,"top":2.2859844859186103,"variant":"HealBall","x":7,"z":-39,"height":2.3,"yaw":1.4,"pitch":0.6,"roll":-0.27,"kind":"medium"},
  {"id":"lab-love","radius":1.1744776475246523,"centerY":1.0514852911186183,"top":2.0613872384348664,"variant":"LoveBall","x":60,"z":-65,"height":2.1,"yaw":-0.1,"pitch":1.08,"roll":0.2,"kind":"medium"},
  {"id":"river-heal","radius":1.1680947323413229,"centerY":1.0108718272216228,"top":2.094257124126051,"variant":"HealBall","x":17,"z":-37,"height":2.1,"yaw":0.87,"pitch":-0.51,"roll":-0.7,"kind":"medium"},
  {"id":"arrival-ultra","radius":0.9494122185225742,"centerY":0.8055150319274642,"top":1.6651393833260613,"variant":"UltraBall","x":-58,"z":-37,"height":1.7,"yaw":-0.19,"pitch":0.44,"roll":0.63,"kind":"small"},
  {"id":"north-cherish","radius":0.7703557451911514,"centerY":0.648484323219905,"top":1.327467664793708,"variant":"CherishBall","x":0,"z":-36.5,"height":1.35,"yaw":-2.77,"pitch":-0.24,"roll":1.22,"kind":"small"},
  {"id":"arrival-classic","radius":0.5604785026091643,"centerY":0.43579700737418503,"top":0.9156405081988206,"variant":"ClassicBall","x":-52,"z":-37,"height":0.95,"yaw":0.05,"pitch":0.8,"roll":-0.35,"kind":"small"},
].map(Object.freeze));

function placedBounds(placement){
  const {x,z,centerY,height,pitch,yaw,roll}=placement;
  const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,roll,'YXZ'));
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,centerY,z),rotation,new THREE.Vector3().setScalar(height));
  matrix.multiply(new THREE.Matrix4().makeTranslation(0,-.5,0));
  return {...placement,lean:roll,bottom:-.025,matrix};
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
export function createGardenPokeballs(source, {naturePlacements=[]} = {}) {
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
      const items = GARDEN_POKEBALL_PLACEMENTS.filter(p => p.variant === variant).map(placedBounds);
      const accepted = [];
      for (const p of items) {
        if (treeTransplantClearance(p.x, p.z, p.radius) &&
            !naturePlacements.some(prop => Math.hypot(p.x-prop.x,p.z-prop.z) < p.radius+prop.radius+.3) &&
            ![...placements,...accepted].some(other => Math.hypot(p.x-other.x,p.z-other.z) < p.radius+other.radius+.65)) {
          accepted.push(p);
        } else skipped.push({id: p.id, reason: 'Layout clearance changed'});
      }
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
export async function loadGardenPokeballs(scene, {signal,deadline=6000,naturePlacements=[]} = {}) {
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
    released = true; display = createGardenPokeballs(source, {naturePlacements});
    scene.add(display.root); return display;
  } catch (error) {
    expired = true; display?.dispose(); release(); throw error;
  } finally {signal?.removeEventListener('abort', cancel);}
}

