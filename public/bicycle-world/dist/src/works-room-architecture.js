import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// An uninterrupted cover surface, with clearance above the cabinet and below
// its picture light. The artwork supplies its own edge/background colours.
export const WORKS_DISPLAY_APERTURE=Object.freeze({width:9.2,height:5.2});

/** Original, texture-free architecture. Static detail is merged by material. */
export function createWorksStudio(count, poseFor) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#aebdb0');
  scene.fog = new THREE.Fog('#aebdb0', 55, 135);
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 240);
  const geometries = new Set(), materials = new Set(), displaySlots = [];
  function material(color, extra = {}) {
    const value = new THREE.MeshStandardMaterial({color, roughness: .86, ...extra});
    materials.add(value); return value;
  }
  const shared = {
    plaster: material('#d9cdb7'),
    wood: material('#95653f'), edge: material('#c29b68'),
    stone: material('#b3ab96'), seam: material('#8b907b'),
    frame: material('#294638'), recess: material('#18382d'),
    leaf: material('#557c50'), leafLight: material('#7b9258'),
    brass: material('#b59b58', {metalness: .35, roughness: .54}),
    sky: material('#adc4ba'), glow: material('#fff0c3', {emissive: '#f9d990', emissiveIntensity: .38})
  };
  function mesh(root, geometry, mat, position = [0, 0, 0]) {
    geometries.add(geometry);
    const value = new THREE.Mesh(geometry, mat);
    value.position.fromArray(position); value.castShadow = true; value.receiveShadow = true;
    root.add(value); return value;
  }
  const box = (root, size, at, mat) => mesh(root, new THREE.BoxGeometry(...size), mat, at);
  function beam(root, a, b, width, depth, mat) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const value = box(root, [width, delta.length(), depth], start.clone().add(end).multiplyScalar(.5).toArray(), mat);
    value.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return value;
  }
  function batch(root) {
    root.updateMatrixWorld(true);
    const buckets = new Map();
    for (const item of [...root.children]) {
      if (!item.isMesh) continue;
      const geometry = item.geometry.index ? item.geometry.toNonIndexed() : item.geometry.clone();
      geometry.applyMatrix4(item.matrix);
      if (!buckets.has(item.material)) buckets.set(item.material, []);
      buckets.get(item.material).push(geometry); item.removeFromParent();
      geometries.delete(item.geometry); item.geometry.dispose();
    }
    for (const [mat, parts] of buckets) {
      const geometry = mergeGeometries(parts, false);
      parts.forEach(part => part.dispose());
      if (!geometry) throw new Error('Works studio architecture could not be merged.');
      mesh(root, geometry, mat);
    }
  }
  const architecture = new THREE.Group(); scene.add(architecture);
  const middle = poseFor((count - 1) / 2, count), radius = middle.radius;
  const half = Math.max(25, (count - 1) * 5.3 + 18);
  const span = Math.max(.9, (count - 1) * 10.6 / radius / 2 + .3);
  box(architecture, [half * 2, .35, 62], [0, -.2, 9], shared.stone);
  // A broad central runner and quiet stone joints ground the exhibit bays.
  box(architecture, [half * 2, .025, 8.6], [0, -.012, 4.1], shared.plaster);
  for (let x = -half; x <= half; x += 3.2) {
    box(architecture, [.025, .012, 57], [x, -.004, 8], shared.seam);
  }
  for (let z = -17; z < 39; z += 3.2) {
    box(architecture, [half * 2, .012, .025], [0, -.003, z], shared.seam);
  }
  const wallPositions = [], indices = [], segments = 48;
  for (let i = 0; i <= segments; i++) {
    const a = -span + i / segments * span * 2;
    for (const y of [0, 10.4]) wallPositions.push(Math.sin(a) * (radius + 8.9), y, radius - Math.cos(a) * (radius + 8.9) - 1.6);
    if (i < segments) {const b = i * 2; indices.push(b, b + 2, b + 1, b + 2, b + 3, b + 1);}
  }
  const wall = new THREE.BufferGeometry();
  wall.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3)); wall.setIndex(indices); wall.computeVertexNormals();
  mesh(architecture, wall, material('#456452', {side: THREE.DoubleSide}));
  // Clerestory rhythm and substantial frames establish the same language as the entrance.
  const ribs = Math.min(23, Math.max(11, count * 3));
  for (let i = 0; i < ribs; i++) {
    const a = -span + (i + .5) / ribs * span * 2;
    const root = new THREE.Group(); root.rotation.y = -a;
    root.position.set(Math.sin(a) * (radius + 8.4), 0, radius - Math.cos(a) * (radius + 8.4) - 1.6);
    box(root, [.32, 10.4, .38], [0, 5.2, 0], shared.frame);
    box(root, [3.2, 1.2, .12], [1.85, 8.9, .03], shared.sky);
    box(root, [3.6, .2, .4], [1.8, 8.15, .1], shared.wood);
    root.updateMatrix();
    for (const child of [...root.children]) {child.applyMatrix4(root.matrix); architecture.add(child);}
  }
  const canopyRibs = Math.min(15, Math.max(7, count * 2 + 1));
  for (let i = 0; i < canopyRibs; i++) {
    const a = -span + (i + .5) / canopyRibs * span * 2;
    const points = [];
    for (let step = 0; step <= 16; step++) {
      const t = step / 16, r = radius + 8.4 - t * 38.5;
      points.push(new THREE.Vector3(Math.sin(a) * r, 10.35 + Math.sin(t * Math.PI) * 3.6, radius - Math.cos(a) * r - 1.6));
    }
    mesh(architecture, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, .22, 5, false), shared.wood);
  }
  for (const [r, y] of [[radius + 8.4, 8.1], [radius + 8.4, 10.4], [radius - 8, 13.7], [radius - 28.5, 10.7]]) {
    const points = [];
    for (let i = 0; i <= 48; i++) {const a = -span + i / 48 * span * 2; points.push(new THREE.Vector3(Math.sin(a) * r, y, radius - Math.cos(a) * r - 1.6));}
    mesh(architecture, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, .15, 5, false), shared.frame);
  }
  batch(architecture);

  scene.add(new THREE.HemisphereLight('#fff3d9', '#48674f', 1.15));
  const sun = new THREE.DirectionalLight('#fff0d0', 2.15);
  sun.position.set(-9, 17, 13); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {left: -19, right: 19, top: 19, bottom: -19, near: 1, far: 60});
  sun.shadow.bias = -.0003; sun.shadow.normalBias = .025; scene.add(sun, sun.target);
  const focusLight = new THREE.PointLight('#ffe6b4', 5, 15, 2);
  focusLight.position.set(0, 7, 5); scene.add(focusLight);

  for (let i = 0; i < 3; i++) {
    const root = new THREE.Group(); root.visible = false; scene.add(root);
    const plaque = material('#c9ad68', {emissive: '#b78d45', emissiveIntensity: 0});
    // The wall bay and cabinet ground the exhibit; the cover has no added mat.
    box(root, [10.1, 8.6, .36], [0, -.1, -.75], shared.plaster);
    for (const x of [-5.05, 5.05]) {
      box(root, [.28, 9, .6], [x, .1, -.35], shared.frame);
      box(root, [.46, .3, .78], [x, -3.96, -.25], shared.edge);
    }
    box(root, [10.6, .34, .72], [0, 4.46, -.28], shared.wood);
    box(root, [10.6, .19, .9], [0, -4.06, -.13], shared.wood);
    // A shallow cabinet gives the display a grounded, human-scale base.
    box(root, [7.7, 1.2, 1.15], [0, -3.56, .08], shared.wood);
    box(root, [8.05, .18, 1.5], [0, -2.88, .17], shared.edge);
    for (const x of [-2.56, 0, 2.56]) {
      box(root, [2.43, .86, .06], [x, -3.56, .69], shared.frame);
      box(root, [.31, .055, .09], [x, -3.27, .76], shared.brass);
    }
    box(root, [.84, .11, .31], [0, -2.72, .31], plaque);
    // Small physical picture lights, with emissive strips rather than extra lights.
    box(root, [2.6, .1, .7], [0, 2.9, .27], shared.frame);
    box(root, [2.35, .035, .42], [0, 2.84, .44], shared.glow);
    for (const x of [-4.1, 4.1]) beam(root, [x, 2.68, -.08], [x, 2.68, .46], .09, .09, shared.brass);
    batch(root);
    const imageMaterial = new THREE.MeshBasicMaterial({color: '#e9e5d7', toneMapped: false}); materials.add(imageMaterial);
    const image = mesh(root, new THREE.PlaneGeometry(1, 1), imageMaterial, [0, 0, .063]);
    image.castShadow = false; image.receiveShadow = false;
    displaySlots.push({root, image, plaque, index: null});
  }

  const entrance = new THREE.Group(); entrance.visible = false; scene.add(entrance);
  const doorLeaves = [];
  for (const x of [-4.7, 4.7]) {
    box(entrance, [.6, 8.7, 1.1], [x, 4.35, 0], shared.frame);
    box(entrance, [.85, .35, 1.36], [x, .18, 0], shared.stone);
  }
  box(entrance, [10.05, .6, 1.1], [0, 8.35, 0], shared.frame);
  box(entrance, [10.4, .22, 1.4], [0, 8.73, 0], shared.edge);
  box(entrance, [10.25, .08, 2.8], [0, -.01, .35], shared.wood);
  batch(entrance);
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(side * 4.4, 0, 0); entrance.add(hinge);
    const center = -side * 2.2;
    box(hinge, [4.35, 7.9, .2], [center, 4, 0], shared.frame);
    box(hinge, [3.63, 5.65, .08], [center, 4.65, .13], shared.recess);
    for (const offset of [-1.72, 1.72]) box(hinge, [.1, 5.83, .14], [center + offset, 4.65, .2], shared.edge);
    for (const y of [1.79, 7.51]) box(hinge, [3.6, .1, .14], [center, y, .2], shared.edge);
    box(hinge, [.12, .75, .22], [-side * 3.85, 3.65, .24], shared.brass);
    batch(hinge); doorLeaves.push({hinge, side});
  }
  let disposed = false;
  return {
    scene, camera, slots: displaySlots, sun, focusLight,
    setEntrance(pose, openness, visible) {
      entrance.visible = visible;
      if (!visible) return;
      entrance.position.copy(pose.exhibit).addScaledVector(pose.normal, pose.distance + 3.3); entrance.position.y = 0;
      entrance.rotation.y = pose.rotationY;
      for (const {hinge, side} of doorLeaves) hinge.rotation.y = side * openness * 1.47;
      entrance.updateMatrixWorld(true);
    },
    dispose() {
      if (disposed) return; disposed = true;
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); sun.shadow.dispose(); scene.clear();
    },
    get resourceCounts() {return {slots: displaySlots.length, geometries: geometries.size, materials: materials.size};}
  };
}
