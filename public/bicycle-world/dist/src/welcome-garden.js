import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** A small, owned entrance set. Static parts share one vertex-colour draw call. */
export function createWelcomeGarden(THREE) {
  const pieces = [];
  const palette = {
    grass: '#a9c993', soil: '#b8936b', path: '#f9e4b0',
    leaf: '#507c68', lightLeaf: '#a8c480', shadeLeaf: '#397168',
    timber: '#aa8870', gate: '#f5ede0', stone: '#a6b2ac', water: '#96bfce',
  };
  const transform = new THREE.Matrix4();
  const color = new THREE.Color();
  const translation = new THREE.Vector3();
  const rotation = new THREE.Euler();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  function add(geometry, tint, position, size = [1, 1, 1], angles = [0, 0, 0]) {
    const prepared = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    prepared.deleteAttribute('uv');
    translation.fromArray(position);
    rotation.set(...angles);
    quaternion.setFromEuler(rotation);
    scale.fromArray(size);
    transform.compose(translation, quaternion, scale);
    prepared.applyMatrix4(transform);
    color.set(tint);
    const colors = new Float32Array(prepared.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b;
    }
    prepared.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    pieces.push(prepared);
  }
  function box(tint, position, size, angles) {
    add(new THREE.BoxGeometry(1, 1, 1), tint, position, size, angles);
  }
  function ribbon(points, width, tint) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    const positions = [], normal = new THREE.Vector3(), tangent = new THREE.Vector3();
    const samples = 36;
    for (let i = 0; i < samples; i++) {
      const pair = [];
      for (const t of [i / samples, (i + 1) / samples]) {
        const centre = curve.getPoint(t);
        curve.getTangent(t, tangent);
        normal.set(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2);
        pair.push(centre.clone().add(normal), centre.clone().sub(normal));
      }
      for (const index of [0, 2, 1, 1, 2, 3]) positions.push(...pair[index].toArray());
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    add(geometry, tint, [0, 0, 0]);
  }

  // The footprint is deliberately broad enough to continue beyond narrow slots.
  add(new THREE.CylinderGeometry(2.16, 2.10, .15, 14), palette.soil, [0, -.095, -.1], [1, 1, .70]);
  add(new THREE.CylinderGeometry(2.18, 2.18, .025, 14), palette.grass, [0, -.0125, -.1], [1, 1, .70]);
  ribbon([[.28, .004, 1.40], [.38, .004, .55], [.30, .004, -.18], [-.20, .004, -.72], [-1.2, .004, -1.35]], .46, palette.path);
  ribbon([[1.85, .005, .88], [1.66, .005, .32], [1.82, .005, -.36], [1.62, .005, -.89]], .17, palette.water);

  // The opening stays clear in front of Woody; its low rails make a human scale.
  for (const side of [-1, 1]) {
    const hingeX = side * .69;
    box(palette.gate, [hingeX, .43, -.43], [.08, .86, .08]);
    add(new THREE.SphereGeometry(.065, 6, 4), palette.gate, [hingeX, .89, -.43]);
    const outerX = side * 1.48;
    box(palette.gate, [outerX, .32, -.45], [.065, .64, .065]);
    for (const y of [.24, .53]) box(palette.gate, [side * 1.08, y, -.44], [.78, .065, .055]);
    const yaw = side * .72;
    const centreX = hingeX + side * .22;
    const centreZ = -.43 - .19;
    for (const y of [.22, .55]) box(palette.timber, [centreX, y, centreZ], [.52, .055, .045], [0, yaw, 0]);
    for (let i = -1; i <= 1; i++) {
      box(palette.timber, [centreX + i * .14 * Math.cos(yaw), .385, centreZ - i * .14 * Math.sin(yaw)], [.035, .34, .035]);
    }
  }

  // A parked bicycle introduces the activity before the visitor starts riding.
  // Its wheel bottoms and kickstand meet the same ground as Woody's boots.
  const bicycleYaw = .65;
  function bicyclePoint(x, y, z = 0) {
    return new THREE.Vector3(
      -.73 + x * Math.cos(bicycleYaw) + z * Math.sin(bicycleYaw),
      y,
      .28 - x * Math.sin(bicycleYaw) + z * Math.cos(bicycleYaw),
    );
  }
  function bicycleRod(tint, from, to, radius = .014) {
    const start = bicyclePoint(...from), end = bicyclePoint(...to);
    const centre = start.clone().add(end).multiplyScalar(.5);
    const direction = end.clone().sub(start);
    const orientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    const angles = new THREE.Euler().setFromQuaternion(orientation);
    add(new THREE.CylinderGeometry(radius, radius, direction.length(), 5), tint, centre.toArray(), [1, 1, 1], [angles.x, angles.y, angles.z]);
  }
  const bicycleInk = '#3b454a', bicycleFrame = '#c96145', bicycleSpoke = '#a6b2ac';
  for (const x of [-.30, .30]) {
    add(new THREE.TorusGeometry(.205, .025, 4, 16), bicycleInk, bicyclePoint(x, .23).toArray(), [1, 1, 1], [0, bicycleYaw, 0]);
    bicycleRod(bicycleSpoke, [x - .19, .23], [x + .19, .23], .006);
    bicycleRod(bicycleSpoke, [x, .04], [x, .42], .006);
  }
  const rear = [-.30, .23], crank = [0, .22], seat = [-.07, .60], headTube = [.25, .56], front = [.30, .23];
  for (const [from, to] of [[rear, seat], [seat, crank], [crank, rear], [crank, headTube], [headTube, seat], [headTube, front]]) {
    bicycleRod(bicycleFrame, from, to);
  }
  bicycleRod(bicycleInk, seat, [-.07, .66], .012);
  box('#26384b', bicyclePoint(-.09, .68).toArray(), [.17, .045, .105], [0, bicycleYaw, 0]);
  bicycleRod(bicycleInk, headTube, [.28, .70, .02], .012);
  bicycleRod(bicycleInk, [.28, .70, -.11], [.28, .70, .13], .012);
  bicycleRod(bicycleInk, [-.06, .22, .02], [-.13, .01, .18], .009);

  const trees = [
    [-1.38, -.84, 1.95, palette.leaf],
    [1.42, -.68, 2.15, palette.shadeLeaf],
    [.61, -1.18, 1.19, palette.lightLeaf],
    [-.64, -1.30, .91, palette.lightLeaf],
  ];
  for (const [x, z, height, tint] of trees) {
    add(new THREE.CylinderGeometry(.045, .065, height * .64, 5), palette.timber, [x, height * .32, z]);
    add(new THREE.IcosahedronGeometry(1, 0), tint, [x, height * .76, z], [height * .32, height * .44, height * .28]);
    add(new THREE.IcosahedronGeometry(1, 0), tint, [x - height * .16, height * .61, z + .03], [height * .27, height * .27, height * .24]);
    add(new THREE.IcosahedronGeometry(1, 0), tint, [x + height * .17, height * .64, z + .03], [height * .25, height * .30, height * .23]);
  }
  const tufts = [[-1.65,.10],[-1.40,.50],[-1.02,.71],[.97,.74],[1.31,.60],[1.59,.20],[-1.69,-.33],[1.08,-.98]];
  for (const [x, z] of tufts) {
    for (let i = -1; i <= 1; i++) {
      add(new THREE.ConeGeometry(.045, .19, 3), i ? palette.leaf : palette.lightLeaf, [x + i * .045, .075, z], [.7, 1, .7], [0, i, i * .22]);
    }
  }
  for (const [x, z, size] of [[1.63,.38,.10],[1.68,-.23,.08],[-1.68,.28,.12],[-1.43,.68,.08]]) {
    add(new THREE.IcosahedronGeometry(1, 1), palette.stone, [x, size * .30, z], [size, size * .58, size * .75]);
  }
  const geometry = mergeGeometries(pieces, false);
  pieces.forEach(piece => piece.dispose());
  geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, metalness: 0, flatShading: true});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Welcome garden entrance';
  mesh.frustumCulled = false;
  let disposed = false;
  return {
    group: mesh,
    get resourceCounts() { return {geometries: 1, materials: 1, drawCalls: 1, triangles: geometry.getAttribute('position').count / 3, disposed}; },
    dispose() {
      if (disposed) return;
      disposed = true;
      mesh.removeFromParent(); geometry.dispose(); material.dispose();
    },
  };
}
