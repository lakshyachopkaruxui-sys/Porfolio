import * as THREE from 'three';
import {BRIDGES, terrainHeight} from './layout.js';

// Only Cube005 is the bridge; the supplied garden also contains a plinth,
// water, trees and floating lanterns, which do not belong on the riding route.
const PARTS = [
  ['Cube005_Material003_0', [0.8, 0.0927933, 0.0802075], 'rails'],
  ['Cube005_Material002_0', [0.0444548, 0.0444548, 0.0444548], 'caps'],
  ['Cube005_Material007_0', [0.0800119, 0.0800119, 0.0800119], 'deck'],
];
const LIFT = 0.027;
const RAIL_VERTICAL_SCALE=1.9*1.35;

/** Fit the supplied Japanese bridge to the existing physical crossings.
 * Source meshes are untouched. This object owns only its new mesh resources. */
export function createGardenBridges(sourceScene) {
  sourceScene.updateMatrixWorld(true);
  const sources = PARTS.map(([name]) => {
    const mesh = sourceScene.getObjectByName(name);
    if (!mesh?.isMesh) throw new Error(`Japanese bridge part is missing: ${name}`);
    return mesh;
  });
  const deck = sources[2], deckBox = new THREE.Box3().setFromObject(deck, true);
  const railCenter = (0.7415 - 0.6662) / 2;
  let railHalfWidth = Infinity;
  for (const mesh of sources.slice(0, 2)) {
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      railHalfWidth = Math.min(railHalfWidth, Math.abs(v.z - railCenter));
    }
  }
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), profileCache = new Map();
  function sourceTop(x) {
    const clamped = THREE.MathUtils.clamp(x, deckBox.min.x + 0.0002, deckBox.max.x - 0.0002);
    const key = clamped.toFixed(6);
    if (profileCache.has(key)) return profileCache.get(key);
    ray.set(new THREE.Vector3(clamped, deckBox.max.y + 2, railCenter), down);
    const hits = ray.intersectObject(deck, false);
    if (!hits.length) throw new Error(`Cannot sample Japanese bridge deck at ${clamped}`);
    // Sample the continuous underside and add the original deck thickness.
    // Sampling the top instead would bake each recessed plank joint into the
    // deformation itself, making long rail faces fold at every joint.
    const height = hits[hits.length - 1].point.y + 0.1081;
    profileCache.set(key, height);
    return height;
  }
  const root = new THREE.Group(); root.name = 'Japanese garden bridges';
  const geometries = [], materials = [], colliders = [];
  try {
    for (const bridge of BRIDGES) {
      const group = new THREE.Group(); group.name = `Japanese bridge: ${bridge.id}`;
      group.userData.bridge = bridge.id; root.add(group);
      const lengthScale = (bridge.maxZ - bridge.minZ) / (deckBox.max.x - deckBox.min.x);
      const widthScale = (bridge.width / 2 + 0.16) / railHalfWidth;
      const map = (v, part) => {
        const z = bridge.minZ + (v.x - deckBox.min.x) * lengthScale;
        const x = bridge.x + (v.z - railCenter) * widthScale;
        // Keep the imported rails outside the passable corridor. Their arch
        // follows the crossing centre; the deck follows the actual wheel terrain.
        const floor = terrainHeight(THREE.MathUtils.clamp(z, bridge.minZ, bridge.maxZ), part === 'deck' ? x : bridge.x);
        return new THREE.Vector3(x, (v.y - sourceTop(v.x)) * (part === 'deck' ? 1.15 : RAIL_VERTICAL_SCALE) + floor + LIFT, z);
      };
      sources.forEach((mesh, partIndex) => {
        const part = PARTS[partIndex][2], input = mesh.geometry.attributes.position;
        const index = mesh.geometry.index, output = [], normals = [];
        const vertex = i => new THREE.Vector3().fromBufferAttribute(input, i).applyMatrix4(mesh.matrixWorld);
        function triangle(a, b, c, depth = 0, sourceNormal = null) {
          sourceNormal ??= new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
          const edgeLength = (p, q) => Math.hypot((p.x - q.x) * lengthScale, (p.z - q.z) * widthScale);
          const edges = [edgeLength(a, b), edgeLength(b, c), edgeLength(c, a)];
          const longest = Math.max(...edges);
          if (longest > 0.6 && depth < 9) {
            const edge = edges.indexOf(longest);
            if (edge === 0) { const m = a.clone().lerp(b, 0.5); triangle(a, m, c, depth + 1, sourceNormal); triangle(m, b, c, depth + 1, sourceNormal); }
            else if (edge === 1) { const m = b.clone().lerp(c, 0.5); triangle(a, b, m, depth + 1, sourceNormal); triangle(a, m, c, depth + 1, sourceNormal); }
            else { const m = c.clone().lerp(a, 0.5); triangle(a, b, m, depth + 1, sourceNormal); triangle(m, b, c, depth + 1, sourceNormal); }
            return;
          }
          // Swapping the source X/Z axes reverses handedness; reverse winding
          // so front faces and the transformed authored normals still agree.
          for (const v of [a, c, b]) {
            const p = map(v, part), e = 0.005, sy = part === 'deck' ? 1.15 : RAIL_VERTICAL_SCALE;
            output.push(...p.toArray());
            const profileSlope = (sourceTop(v.x + e) - sourceTop(v.x - e)) / (2 * e);
            const floorX = part === 'deck' ? p.x : bridge.x;
            const slopeZ = (terrainHeight(p.z + e, floorX) - terrainHeight(p.z - e, floorX)) / (2 * e);
            const slopeX = part === 'deck' ? (terrainHeight(p.z, p.x + e) - terrainHeight(p.z, p.x - e)) / (2 * e) : 0;
            // Inverse-transpose of the deformation Jacobian. This preserves
            // original hard faces without exposing tessellation diagonals.
            const ny = sourceNormal.y / sy;
            const normal = new THREE.Vector3(sourceNormal.z / widthScale - ny * slopeX,
              ny, sourceNormal.x / lengthScale + sourceNormal.y * profileSlope / lengthScale - ny * slopeZ).normalize();
            normals.push(...normal.toArray());
          }
        }
        const count = index?.count ?? input.count;
        for (let i = 0; i < count; i += 3) triangle(vertex(index ? index.getX(i) : i), vertex(index ? index.getX(i + 1) : i + 1), vertex(index ? index.getX(i + 2) : i + 2));
        const geometry = new THREE.BufferGeometry(); geometries.push(geometry);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(output, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.computeBoundingBox(); geometry.computeBoundingSphere();
        // The asset's deprecated specular/gloss extension contains these exact
        // linear diffuse values. Modern GLTFLoader otherwise defaults to white.
        const material = new THREE.MeshStandardMaterial({color: new THREE.Color().setRGB(...PARTS[partIndex][1]), roughness: 1, metalness: 0, side: THREE.DoubleSide});
        materials.push(material);
        const result = new THREE.Mesh(geometry, material); result.name = `${bridge.id} imported ${part}`;
        result.userData.bridgePart = part; result.castShadow = true; result.receiveShadow = true;
        group.add(result);
      });
      // The original river constraint covers only the water interval. Imported
      // rails also extend over both banks, so their complete footprint needs
      // solid collision geometry. Overlapping circles fit the existing physics
      // contract and stay entirely outside the passable bridge width.
      for (const side of [-1, 1]) {
        const bounds = new THREE.Box3();
        for (const mesh of group.children.filter(child => child.userData.bridgePart !== 'deck')) {
          const positions = mesh.geometry.attributes.position;
          for (let i = 0; i < positions.count; i++) {
            const p = new THREE.Vector3().fromBufferAttribute(positions, i);
            if (Math.sign(p.x - bridge.x) === side) bounds.expandByPoint(p);
          }
        }
        const radius = (bounds.max.x - bounds.min.x) / 2;
        const x = (bounds.min.x + bounds.max.x) / 2;
        const first = bounds.min.z + radius, last = bounds.max.z - radius;
        const segments = Math.max(1, Math.ceil((last - first) / (radius * 1.25)));
        for (let i = 0; i <= segments; i++) colliders.push({
          x, z: first + (last - first) * i / segments, radius,
          kind: 'bridge-guard', bridge: bridge.id,
        });
      }
    }
  } catch (error) { for (const g of geometries) g.dispose(); for (const m of materials) m.dispose(); throw error; }
  return {root, colliders, dispose() { root.removeFromParent(); for (const g of geometries) g.dispose(); for (const m of materials) m.dispose(); }};
}
