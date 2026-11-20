import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// An uninterrupted cover surface, with clearance above the cabinet and below
// its picture light. The artwork supplies its own edge/background colours.
export const WORKS_DISPLAY_APERTURE=Object.freeze({width:9.2,height:5.2});

/** Original, texture-free architecture. Static detail is merged by material. */
export function createWorksStudio(count, poseFor) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bad3d7');
  scene.fog = new THREE.Fog('#bad3d7', 55, 135);
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 240);
  const geometries = new Set(), materials = new Set(), displaySlots = [];
  function material(color, extra = {}) {
    const value = new THREE.MeshStandardMaterial({color, roughness: .86, ...extra});
    materials.add(value); return value;
  }
  const shared = {
    plaster: material('#e8ddc9'),
    wood: material('#a95333'), edge: material('#c29b68'),
    stone: material('#ae7963'), seam: material('#8b907b'),
    frame: material('#173f50'), recess: material('#19343c'),
    leaf: material('#557c50'), leafLight: material('#7b9258'),
    brass: material('#b59b58', {metalness: .35, roughness: .54}),
    sky: material('#c1e1e6'), glow: material('#fff0c3', {emissive: '#f9d990', emissiveIntensity: .38})
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
  const wallPositions = [], indices = [], segments = 48;
  for (let i = 0; i <= segments; i++) {
    const a = -span + i / segments * span * 2;
    for (const y of [-1, 35]) wallPositions.push(Math.sin(a) * (radius + 1.05), y, radius - Math.cos(a) * (radius + 1.05) - 1.6);
    if (i < segments) {const b = i * 2; indices.push(b, b + 2, b + 1, b + 2, b + 3, b + 1);}
  }
  const wall = new THREE.BufferGeometry();
  wall.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3)); wall.setIndex(indices); wall.computeVertexNormals();
  mesh(architecture, wall, material('#287f82', {side: THREE.DoubleSide}));
  // One continuous skirting follows the gallery arc beneath the suspended prints.
  const skirting=[];
  for(let i=0;i<=segments;i++){
    const a=-span+i/segments*span*2, inset=radius+.96;
    skirting.push(new THREE.Vector3(Math.sin(a)*inset,.12,radius-Math.cos(a)*inset-1.6));
  }
  mesh(architecture,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(skirting),segments,.065,6,false),shared.wood);
  // A pin-up board above a working oak flat file.
  box(architecture,[13.4,6.85,.24],[0,4.2,-2.49],shared.frame);
  for(const side of [-1,1]){
    for(let i=0;i<10;i++)box(architecture,[.095,7.25,.14],[side*(6.86+i*.25),3.9,-2.40],shared.wood);
    box(architecture,[.09,.54,.64],[side*3.6,7.01,-2.03],shared.brass);
  }
  box(architecture,[7.65,.16,.37],[0,7.23,-1.79],shared.brass);
  box(architecture,[7.46,.04,.25],[0,7.13,-1.78],shared.glow);
  box(architecture,[12.35,.18,1.94],[0,1.38,-1.25],shared.edge);
  box(architecture,[11.8,1.32,1.5],[0,.67,-1.36],shared.wood);
  for(const x of [-3.88,0,3.88]){
    for(const y of [.38,.96]){
      box(architecture,[3.80,.52,.08],[x,y,-.56],shared.wood);
      box(architecture,[.66,.07,.13],[x,y+.05,-.47],shared.brass);
    }
  }
  // An articulated task lamp sits beyond the left edge of the print.
  const enamel = material('#dc6241', {roughness:.38});
  const cylinder = (radiusTop,radiusBottom,height,at,finish) =>
    mesh(architecture,new THREE.CylinderGeometry(radiusTop,radiusBottom,height,16),finish,at);
  cylinder(.34,.4,.12,[-5.48,1.53,-.85],enamel);
  beam(architecture,[-5.48,1.58,-.85],[-5.83,2.45,-.92],.085,.09,shared.frame);
  beam(architecture,[-5.83,2.45,-.92],[-5.28,2.96,-.86],.085,.09,shared.frame);
  const shade=cylinder(.12,.34,.31,[-5.23,2.83,-.83],enamel);
  shade.rotation.z=.28;
  // A faceted ceramic pot and folded leaves balance the desk on the right.
  cylinder(.39,.27,.56,[5.48,1.75,-1.08],material('#c57542'));
  for(let i=0;i<7;i++){
    const angle=i*2.4;
    const leaf=mesh(architecture,new THREE.IcosahedronGeometry(1,0),i%2?shared.leaf:shared.leafLight,
      [5.48+.19*Math.cos(angle),2.19+.09*(i%3),-1.08+.19*Math.sin(angle)]);
    leaf.scale.set(.16,.39,.09);
    leaf.rotation.set(.48*Math.sin(angle),0,-.52*Math.cos(angle));
  }
  batch(architecture);

  scene.add(new THREE.HemisphereLight('#f5fcff', '#597087', 1.15));
  const sun = new THREE.DirectionalLight('#fffaf0', 2.15);
  sun.position.set(-9, 17, 13); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {left: -19, right: 19, top: 19, bottom: -19, near: 1, far: 60});
  sun.shadow.bias = -.0003; sun.shadow.normalBias = .025; scene.add(sun, sun.target);
  const focusLight = new THREE.PointLight('#ffe6b4', 5, 15, 2);
  focusLight.position.set(0, 7, 5); scene.add(focusLight);

  let disposed = false;
  for (let i=0;i<3;i++){
    const root=new THREE.Group();root.visible=false;scene.add(root);
    // A shallow oak stretcher gives the print a physical edge at oblique angles.
    box(root,[9.30,5.30,.16],[0,0,-.035],shared.wood);
    box(root,[8.94,4.95,.48],[0,0,-.33],shared.frame);
    batch(root);
    root.traverse(item=>{if(item.isMesh)item.castShadow=false;});
    const imageMaterial = new THREE.MeshBasicMaterial({color: '#e9e5d7', toneMapped: false}); materials.add(imageMaterial);
    const image = mesh(root, new THREE.PlaneGeometry(1, 1), imageMaterial, [0, 0, .063]);
    image.castShadow = false; image.receiveShadow = false;
    displaySlots.push({root,image,index:null});
  }

  // All prints share one mount. The contact shadow follows its physical dimensions.
  const mount=poseFor(0,count).exhibit;
  const contactMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    vertexShader:'varying vec2 point;void main(){point=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 point;
      void main(){
        vec2 d=abs(point)-vec2(4.65,2.65);
        float edge=length(max(d,0.0))+min(max(d.x,d.y),0.0);
        float softness=1.0-smoothstep(-0.05,0.32,edge);
        gl_FragColor=vec4(0.09,0.12,0.11,0.23*softness);
        #include <colorspace_fragment>
      }`
  });
  materials.add(contactMaterial);
  const contact=mesh(scene,new THREE.PlaneGeometry(10.4,6.55),contactMaterial);
  contact.position.copy(mount);contact.position.add(new THREE.Vector3(.07,-.10,-.75));
  contact.receiveShadow=false;contact.castShadow=false;contact.renderOrder=-1;
  const previousMaterial=new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,toneMapped:false});
  materials.add(previousMaterial);
  const previous=mesh(scene,new THREE.PlaneGeometry(WORKS_DISPLAY_APERTURE.width,WORKS_DISPLAY_APERTURE.height),previousMaterial);
  previous.position.copy(mount);previous.position.z+=.068;
  previous.castShadow=false;previous.receiveShadow=false;previous.visible=false;
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
  return {
    scene, camera, slots: displaySlots, previous, sun, focusLight,
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
