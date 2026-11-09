import {RIDER_SCALE} from './layout.js';
import {createWoodyRig} from './woody-rig.js';
import {createRiderAccessoryPicking} from './rider-accessory-picking.js';

/**
 * Small-world bicycle and rider contact controller. The bicycle faces local -Z.
 * Keep the returned root free for world position and heading; animation happens
 * inside its lean rig. The imported character follows the same contact targets.
 */
export function createRider(THREE) {
  const group = new THREE.Group();
  group.name = 'Lakshya bicycle rider';
  group.scale.setScalar(RIDER_SCALE);
  const rig = new THREE.Group();
  rig.name = 'Bicycle lean rig';
  // Keep the existing tire clearance after enlarging the complete assembly.
  // Scaling only the person would break the pedal and handlebar contacts.
  rig.position.y = 0.02 / RIDER_SCALE - 0.02;
  group.add(rig);

  const material = (color, options = {}) => new THREE.MeshStandardMaterial({
    color, roughness: 0.77, metalness: 0.02, ...options,
  });
  const m = {
    frame: material('#238f87'),
    frameLight: material('#70bcb0'),
    rubber: material('#253f43'),
    sidewall: material('#eee3c5'),
    metal: material('#cad5cf', { metalness: 0.35, roughness: 0.48 }),
    darkMetal: material('#40595a', { metalness: 0.25 }),
    saddle: material('#a16e45'),
    shirt: material('#df735b'),
    trousers: material('#294954'),
    skin: material('#b97951'),
    hair: material('#2c2726'),
    shoes: material('#f6eed8'),
    bag: material('#dba851'),
    strap: material('#74533a'),
    lens: material('#263d44', { metalness: 0.18, roughness: 0.3 }),
  };
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
  const sphereGeometry = new THREE.SphereGeometry(1, 12, 8);
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const scratchDirection = new THREE.Vector3();
  const scratchMidpoint = new THREE.Vector3();
  const point = (x, y, z) => new THREE.Vector3(x, y, z);

  function mesh(geometry, mat, parent = rig) {
    const result = new THREE.Mesh(geometry, mat);
    result.castShadow = true;
    result.receiveShadow = true;
    parent.add(result);
    return result;
  }

  function sphere(position, scale, mat, parent = rig) {
    const result = mesh(sphereGeometry, mat, parent);
    result.position.set(...position);
    result.scale.set(...scale);
    return result;
  }

  function box(position, scale, mat, parent = rig) {
    const result = mesh(boxGeometry, mat, parent);
    result.position.set(...position);
    result.scale.set(...scale);
    return result;
  }

  function placeTube(result, from, to, radius) {
    scratchDirection.subVectors(to, from);
    const length = scratchDirection.length();
    scratchMidpoint.addVectors(from, to).multiplyScalar(0.5);
    result.position.copy(scratchMidpoint);
    result.quaternion.setFromUnitVectors(yAxis, scratchDirection.normalize());
    result.scale.set(radius, length, radius);
  }

  function tube(from, to, radius, mat, parent = rig) {
    const result = mesh(cylinderGeometry, mat, parent);
    placeTube(result, from, to, radius);
    return result;
  }

  // Thin, open diamond frame. Both wheels retain an unobstructed silhouette.
  const rearAxle = point(0, 0.42, 0.58);
  const frontAxle = point(0, 0.42, -0.58);
  const crankCentre = point(0, 0.49, 0.035);
  const seatJoint = point(0, 0.91, 0.20);
  const headTop = point(0, 0.96, -0.41);
  const headBottom = point(0, 0.78, -0.45);
  tube(crankCentre, seatJoint, 0.028, m.frame);
  tube(seatJoint, headTop, 0.031, m.frame);
  tube(headBottom, crankCentre, 0.034, m.frame);
  tube(headTop, headBottom, 0.041, m.frameLight);
  for (const side of [-1, 1]) {
    const rearDropout = point(side * 0.075, 0.42, 0.58);
    tube(rearDropout, point(side * 0.045, 0.49, 0.035), 0.018, m.frame);
    tube(rearDropout, seatJoint, 0.017, m.frame);
  }
  tube(seatJoint, point(0, 1.035, 0.22), 0.018, m.metal);
  const saddle = sphere([0, 1.055, 0.21], [0.145, 0.045, 0.16], m.saddle);
  saddle.name = 'Bicycle saddle';
  saddle.rotation.x = -0.06;
  tube(point(-0.105, 0.42, 0.58), point(0.105, 0.42, 0.58), 0.027, m.darkMetal);

  // The front fork and controls turn as one assembly around the steering head.
  const steeringRig = new THREE.Group();
  steeringRig.position.copy(headTop);
  rig.add(steeringRig);
  const localFront = frontAxle.clone().sub(headTop);
  for (const side of [-1, 1]) {
    tube(point(side * 0.065, -0.13, -0.015),
      point(side * 0.075, localFront.y, localFront.z), 0.018, m.frame, steeringRig);
  }
  tube(point(0, 0, 0), point(0, 0.20, -0.045), 0.018, m.metal, steeringRig);
  tube(point(0, 0.20, -0.045), point(0, 0.23, -0.12), 0.018, m.metal, steeringRig);
  tube(point(-0.275, 0.23, -0.12), point(0.275, 0.23, -0.12), 0.018, m.metal, steeringRig);
  for (const side of [-1, 1]) {
    tube(point(side * 0.20, 0.23, -0.12), point(side * 0.29, 0.23, -0.10),
      0.026, m.rubber, steeringRig);
    tube(point(side * 0.22, 0.215, -0.15), point(side * 0.29, 0.21, -0.16),
      0.009, m.darkMetal, steeringRig);
  }
  // A real handlebar accessory, with a generous invisible target for selecting
  // it. It follows the fork and lean rather than floating beside the rider.
  const bellRoot=new THREE.Group();bellRoot.name='Bicycle bell';bellRoot.userData.bicycleBell=true;
  bellRoot.position.set(.14,.265,-.12);steeringRig.add(bellRoot);
  const bellDome=sphere([0,0,0],[.054,.026,.054],m.bag,bellRoot);
  bellDome.name='Bicycle bell dome';bellDome.userData.bicycleBell=true;
  const bellCollar=mesh(cylinderGeometry,m.darkMetal,bellRoot);
  bellCollar.name='Bicycle bell collar';bellCollar.position.y=-.025;bellCollar.scale.set(.029,.018,.029);bellCollar.castShadow=false;
  const bellStriker=new THREE.Group();bellStriker.name='Bicycle bell striker';bellStriker.position.set(.042,-.011,.015);bellRoot.add(bellStriker);
  const bellLever=box([.022,0,0],[.044,.012,.014],m.metal,bellStriker);
  bellLever.name='Bicycle bell lever';bellLever.castShadow=false;
  const bellThumb=box([.041,.003,0],[.018,.019,.024],m.darkMetal,bellStriker);
  bellThumb.name='Bicycle bell thumb pad';bellThumb.castShadow=false;
  let bellAge=Infinity,bellDisposed=false;
  const pickBell=createRiderAccessoryPicking(bellDome,bellDome);
  const bell={
    root:bellRoot,dome:bellDome,striker:bellStriker,
    ring({reduced=false}={}){if(bellDisposed)return false;bellAge=reduced?Infinity:0;bellStriker.rotation.y=0;return true;},
    pick(ray,camera,viewportHeight){return bellDisposed?null:pickBell(ray,camera,viewportHeight);},
    getWorldPosition(target){return bellDome.getWorldPosition(target);},
    get ringing(){return bellAge<.46;},
    dispose(){if(bellDisposed)return;bellDisposed=true;bellAge=Infinity;bellStriker.rotation.y=0;bellRoot.removeFromParent();},
  };
  // A small cycle computer sits on the stem between the hands. It is a
  // redundant world detail; essential navigation stays in readable HTML.
  tube(point(0, 0.21, -0.07), point(0, 0.25, -0.07), 0.010, m.darkMetal, steeringRig);
  const cycleComputer = new THREE.Group();
  cycleComputer.name = 'Bicycle cycle computer';
  cycleComputer.position.set(0, 0.265, -0.075);
  cycleComputer.rotation.x = 0.10;
  cycleComputer.userData.decorative = true;
  steeringRig.add(cycleComputer);
  box([0, 0, 0], [0.09, 0.025, 0.12], m.darkMetal, cycleComputer);
  box([0, 0.013, -0.002], [0.071, 0.003, 0.093], m.lens, cycleComputer);
  const routeCue = new THREE.Group();
  routeCue.name = 'Cycle computer route cue';
  cycleComputer.add(routeCue);
  tube(point(-0.015, 0.017, 0.013), point(0, 0.017, -0.012), 0.0035, m.sidewall, routeCue);
  tube(point(0, 0.017, -0.012), point(0.015, 0.017, 0.013), 0.0035, m.sidewall, routeCue);
  routeCue.visible = false;
  const frontLamp = sphere([0, 0.05, -0.13], [0.035, 0.035, 0.035], m.shoes, steeringRig);
  frontLamp.name = 'Bicycle headlight';

  const tireGeometry = new THREE.TorusGeometry(0.365, 0.035, 8, 32);
  const sidewallGeometry = new THREE.TorusGeometry(0.365, 0.022, 6, 32);
  const rimGeometry = new THREE.TorusGeometry(0.325, 0.010, 5, 32);
  function wheel(parent, position) {
    const result = new THREE.Group();
    result.position.copy(position);
    parent.add(result);
    const tire = mesh(tireGeometry, m.rubber, result);
    tire.rotation.y = Math.PI / 2;
    for (const side of [-1, 1]) {
      const wall = mesh(sidewallGeometry, m.sidewall, result);
      wall.rotation.y = Math.PI / 2;
      wall.position.x = side * 0.025;
      const rim = mesh(rimGeometry, m.metal, result);
      rim.rotation.y = Math.PI / 2;
      rim.position.x = side * 0.016;
    }
    tube(point(-0.065, 0, 0), point(0.065, 0, 0), 0.032, m.metal, result);
    for (let spoke = 0; spoke < 12; spoke++) {
      const angle = (spoke / 12) * Math.PI * 2;
      tube(point(spoke % 2 ? -0.023 : 0.023, 0, 0),
        point(0, Math.sin(angle) * 0.325, Math.cos(angle) * 0.325),
        0.004, m.metal, result);
    }
    return result;
  }
  const rearWheel = wheel(rig, rearAxle);
  const frontWheel = wheel(steeringRig, localFront);
  rearWheel.name = 'Rear wheel';
  frontWheel.name = 'Front wheel';

  // Functional crank, pedals, and a discreet chain path.
  const crank = new THREE.Group();
  crank.name = 'Pedal crank';
  crank.position.copy(crankCentre);
  rig.add(crank);
  const chainring = mesh(new THREE.TorusGeometry(0.105, 0.013, 6, 20), m.darkMetal);
  chainring.rotation.y = Math.PI / 2;
  chainring.position.copy(crankCentre).add(point(0.12, 0, 0));
  tube(point(0.12, 0.58, 0.035), point(0.12, 0.46, 0.58), 0.006, m.darkMetal);
  tube(point(0.12, 0.39, 0.035), point(0.12, 0.38, 0.58), 0.006, m.darkMetal);
  const pedals = [];
  for (const side of [-1, 1]) {
    tube(point(side * 0.13, 0, 0), point(side * 0.13, side * 0.165, 0),
      0.012, m.darkMetal, crank);
    tube(point(side * 0.13, side * 0.165, 0), point(side * 0.23, side * 0.165, 0),
      0.012, m.darkMetal, crank);
    const pedal = box([side * 0.21, 0, 0], [0.12, 0.028, 0.09], m.darkMetal);
    pedal.name = `Bicycle pedal ${side}`;
    pedals.push(pedal);
  }

  // A simple human silhouette provides personality even at the follow-camera scale.
  const human = new THREE.Group();
  human.name = 'Rider body';
  rig.add(human);
  const hips = point(0, 1.19, 0.18);
  const shoulders = point(0, 1.63, -0.045);
  const torso = mesh(new THREE.CylinderGeometry(0.205, 0.15, 1, 8), m.shirt, human);
  placeTube(torso, hips, shoulders, 1);
  torso.scale.x = 1;
  torso.scale.z = 0.67;
  sphere([0, 1.17, 0.18], [0.17, 0.11, 0.15], m.trousers, human);
  tube(point(0, 1.65, -0.06), point(0, 1.74, -0.07), 0.065, m.skin, human);
  const firstHeadPart = human.children.length;
  const head = sphere([0, 1.845, -0.095], [0.14, 0.175, 0.14], m.skin, human);
  head.rotation.x = -0.05;
  sphere([0, 1.925, -0.065], [0.145, 0.13, 0.13], m.hair, human);
  // Cream helmet is distinct from the coral torso and teal bicycle.
  sphere([0, 1.995, -0.085], [0.165, 0.09, 0.165], m.shoes, human);
  for (const x of [-0.066, 0, 0.066]) {
    const vent = box([x, 2.066, -0.095], [0.018, 0.007, 0.11], m.darkMetal, human);
    vent.rotation.x = -0.06;
  }
  sphere([0, 1.837, -0.233], [0.035, 0.041, 0.035], m.skin, human);
  for (const side of [-1, 1]) {
    sphere([side * 0.054, 1.872, -0.224], [0.011, 0.016, 0.009], m.hair, human);
    sphere([side * 0.137, 1.844, -0.082], [0.024, 0.039, 0.026], m.skin, human);
    tube(point(side * 0.145, 1.946, -0.08), point(side * 0.085, 1.72, -0.09),
      0.008, m.strap, human);
  }
  // Turn the complete face and helmet together around the neck. The neck and
  // shoulders remain attached to the torso rather than following the glance.
  const headParts = human.children.slice(firstHeadPart);
  const headPivot = new THREE.Group();
  headPivot.name = 'Rider head pivot';
  headPivot.position.set(0, 1.70, -0.07);
  human.add(headPivot);
  for (const part of headParts) {
    part.position.sub(headPivot.position);
    headPivot.add(part);
  }

  const arms = [];
  const legs = [];
  for (const side of [-1, 1]) {
    const shoulder = point(side * 0.17, 1.60, -0.03);
    const elbow = point(side * 0.235, 1.36, -0.19);
    const hand = point(side * 0.27, 1.19, -0.52);
    const sleeveEnd = shoulder.clone().lerp(elbow, 0.52);
    tube(shoulder, sleeveEnd, 0.078, m.shirt, human);
    const upperArm = tube(sleeveEnd, elbow, 0.045, m.skin, human);
    const forearm = tube(elbow, hand, 0.039, m.skin, human);
    const palm = sphere(hand.toArray(), [0.047, 0.042, 0.052], m.skin, human);
    arms.push({ side, shoulder, elbow, sleeveEnd, hand, upperArm, forearm, palm });
    const hip = point(side * 0.115, 1.19, 0.18);
    const upperLeg = mesh(cylinderGeometry, m.trousers, human);
    upperLeg.name = `Rider upper leg ${side}`;
    const lowerLeg = mesh(cylinderGeometry, m.trousers, human);
    lowerLeg.name = `Rider lower leg ${side}`;
    const kneeMesh = sphere([0, 0, 0], [0.065, 0.065, 0.065], m.trousers, human);
    const shoe = sphere([0, 0, 0], [0.068, 0.047, 0.13], m.shoes, human);
    shoe.name = `Rider shoe ${side}`;
    legs.push({ side, hip, upperLeg, lowerLeg, kneeMesh, shoe,
      ankle: new THREE.Vector3(), knee: new THREE.Vector3(), direction: new THREE.Vector3(),
      bend: new THREE.Vector3() });
  }

  // Small camera satchel nods to photography without adding bulky decoration.
  const bag = box([0.23, 1.22, 0.20], [0.14, 0.20, 0.22], m.bag, human);
  bag.rotation.z = -0.10;
  box([0.306, 1.245, 0.19], [0.016, 0.05, 0.08], m.strap, human);
  tube(point(-0.14, 1.61, 0.02), point(0.20, 1.24, 0.30), 0.012, m.strap, human);
  tube(point(-0.15, 1.61, -0.12), point(0.21, 1.24, 0.12), 0.012, m.strap, human);

  let phase = Math.PI * 0.15;
  let pedalRate = 0;
  let wheelPhase = 0;
  const handlePoint = new THREE.Vector3();
  const humanInverse = new THREE.Quaternion();
  const pole = new THREE.Vector3(0, 0, -1);
  let plantProgress = 0, stoppedTime = 0, departureRequested = false;
  let glanceTime = 1, glanceSide = 0, glanceStrength = 0, lastTurnSide = 0, neutralTime = 0;
  const plantedShoeWorld = new THREE.Vector3();
  const plantedAnkle = new THREE.Vector3();
  const plantedShoe = new THREE.Vector3();
  const groundOffset = new THREE.Vector3();
  const worldYaw = new THREE.Quaternion();
  const groundRotation = new THREE.Quaternion();
  const groundNormal = new THREE.Vector3();
  const plantedShoeRotation = new THREE.Quaternion();
  const pedalShoeRotation = new THREE.Quaternion();
  const plantedAnkleInHuman = new THREE.Vector3();
  const plantedShoeInHuman = new THREE.Vector3();
  const smooth = value => value * value * (3 - 2 * value);
  let character=null;
  const characterPose={
    hips:new THREE.Vector3(),shoulders:new THREE.Vector3(),bodyQuaternion:new THREE.Quaternion(),
    hands:arms.map(({side})=>({side,target:new THREE.Vector3(),rotation:new THREE.Quaternion()})),
    feet:legs.map(({side})=>({side,contact:new THREE.Vector3(),rotation:new THREE.Quaternion(),planted:0})),
    headYaw:0,plantProgress:0,speed:0,reduced:false,dt:0,
  };
  const plantedContact=new THREE.Vector3();
  const gripRotation=new THREE.Quaternion();
  function update({ speed = 0, steering = 0, wheelSteering, movingIntent = false, turnIntent = 0, groundHeight = () => 0, time = 0, dt = 1 / 60, pedaling = true, reduced = false, feedback = {}, navigationActive = false } = {}) {
    routeCue.visible = Boolean(navigationActive);
    // Match the world's bounded frame delta so wheel travel remains consistent
    // on a slower frame, while still limiting resumed-tab animation jumps.
    const delta = Math.min(Math.max(dt, 0), 0.12);
    if(reduced)bellAge=Infinity;
    else if(bellAge<.46)bellAge=Math.min(.46,bellAge+delta);
    bellStriker.rotation.y=bellAge<.46?-.32*Math.sin(Math.PI*bellAge/.105)*Math.exp(-bellAge*7):0;
    const isRolling = Math.abs(speed) >= 0.025;
    departureRequested = movingIntent;
    stoppedTime = !isRolling && !movingIntent ? stoppedTime + delta : 0;
    // Main controls hold the bicycle still while this short departure completes.
    // A caller that restores an already-moving state must never drag a foot.
    if (isRolling) plantProgress = 0;
    else if (movingIntent) plantProgress = Math.max(0, plantProgress - delta / 0.22);
    else if (stoppedTime >= 0.18) plantProgress = Math.min(1, plantProgress + delta / 0.34);
    const planted = smooth(plantProgress);

    const turn = Math.max(-1, Math.min(1, Number.isFinite(turnIntent) ? turnIntent : 0));
    const turnSide = Math.abs(turn) >= 0.18 ? Math.sign(turn) : 0;
    neutralTime = turnSide === 0 ? neutralTime + delta : 0;
    if (neutralTime >= 0.18) lastTurnSide = 0;
    if (reduced) {
      glanceTime = 1;
      lastTurnSide = turnSide;
    } else if (turnSide && turnSide !== lastTurnSide && (isRolling || movingIntent)) {
      glanceTime = 0;
      glanceSide = turnSide;
      glanceStrength = 0.18 + Math.abs(turn) * 0.20;
      lastTurnSide = turnSide;
    }
    glanceTime = Math.min(1, glanceTime + delta);
    const glanceEnvelope = glanceTime < 0.13 ? smooth(glanceTime / 0.13)
      : glanceTime < 0.28 ? 1 : 1 - smooth(Math.min(1, (glanceTime - 0.28) / 0.48));
    const desiredGlance = glanceSide * glanceStrength * glanceEnvelope;
    headPivot.rotation.y = reduced ? 0 : headPivot.rotation.y + (desiredGlance-headPivot.rotation.y)*(1-Math.exp(-delta*18));
    const motion = Math.min(Math.abs(speed) / 2.5, 1);
    wheelPhase -= speed * delta / (0.4 * RIDER_SCALE);
    // Wheel travel and rider effort are separate. Releasing the pedals lets the
    // crank settle while the freewheel keeps the bicycle rolling underneath.
    // Local forward is -Z. At the top of the stroke, a forward pedal must move
    // toward -Z, which is negative X rotation, matching the rolling wheels.
    const targetPedalRate = pedaling ? -speed * 2.2 / RIDER_SCALE : 0;
    const cadenceDecay = Math.exp(-delta * 10);
    phase += targetPedalRate * delta + (pedalRate - targetPedalRate) * (1 - cadenceDecay) / 10;
    pedalRate = targetPedalRate + (pedalRate - targetPedalRate) * cadenceDecay;
    const pedalMotion = Math.min(Math.abs(pedalRate) / 5.5, 1);
    rearWheel.rotation.x = wheelPhase;
    frontWheel.rotation.x = wheelPhase;
    crank.rotation.x = phase;
    const steeringAngle = Number.isFinite(wheelSteering) ? wheelSteering : steering * 0.38;
    steeringRig.rotation.y = steeringAngle;
    // Positive steering turns local -Z toward -X. Positive Z roll therefore
    // banks the rider into that curve. Banking remains restrained and optional.
    const leanTarget = Math.max(-0.15, Math.min(0.15,
      steeringAngle / 0.38 * Math.min(Math.abs(speed) * 0.035, 0.15)));
    rig.rotation.z = reduced ? 0 : rig.rotation.z + (leanTarget - rig.rotation.z) * (1 - Math.exp(-delta * 8));
    const contact=reduced?0:Math.max(0,Math.min(1,feedback.contactPulse||0));
    const brake=reduced?0:Math.max(0,Math.min(1,feedback.brakeWeight||0));
    const deck=reduced?0:Math.max(0,Math.min(.5,feedback.deckPulse||0));
    // A parked rider slides forward off the saddle and lowers their pelvis.
    // Sampling the actual world surface avoids a hovering foot on the bridges.
    rig.updateWorldMatrix(true, false);
    plantedShoeWorld.set(-0.31, 0, 0.12);
    rig.localToWorld(plantedShoeWorld);
    const surface = groundHeight(plantedShoeWorld.x, plantedShoeWorld.z);
    const groundY = Number.isFinite(surface) ? surface : group.position.y;
    const offset = 0.08;
    const gradientX = (groundHeight(plantedShoeWorld.x+offset,plantedShoeWorld.z)-groundHeight(plantedShoeWorld.x-offset,plantedShoeWorld.z))/(2*offset);
    const gradientZ = (groundHeight(plantedShoeWorld.x,plantedShoeWorld.z+offset)-groundHeight(plantedShoeWorld.x,plantedShoeWorld.z-offset))/(2*offset);
    groundNormal.set(Number.isFinite(gradientX)?-gradientX:0,1,Number.isFinite(gradientZ)?-gradientZ:0).normalize();
    plantedShoeWorld.y = groundY + 0.047 * RIDER_SCALE / groundNormal.y;
    worldYaw.setFromAxisAngle(yAxis, group.rotation.y);
    groundRotation.setFromUnitVectors(yAxis,groundNormal).multiply(worldYaw);
    groundOffset.set(0, 0.025 * RIDER_SCALE, 0.025 * RIDER_SCALE).applyQuaternion(groundRotation);
    plantedAnkle.copy(plantedShoeWorld).add(groundOffset);
    rig.worldToLocal(plantedAnkle);
    plantedShoe.copy(plantedShoeWorld);
    rig.worldToLocal(plantedShoe);
    const pelvisDrop = -0.29 + plantedAnkle.y - 0.072;
    // Weight settles through the rider. The wheel rig retains its exact contact
    // pose; this is not a second physics simulation or an airborne bounce.
    human.position.x = -0.035 * planted;
    human.position.y = (reduced ? 0 : Math.sin(phase * 2) * 0.008 * pedalMotion-contact*.022-deck*.018) * (1-planted) + pelvisDrop * planted;
    human.position.z = (reduced ? 0 : -brake*.018-contact*.025) * (1-planted) - 0.06 * planted;
    human.rotation.x = reduced ? 0 : -brake*.022-contact*.016;
    human.rotation.z = reduced ? 0 : Math.sin(phase) * 0.012 * pedalMotion;
    humanInverse.copy(human.quaternion).invert();
    plantedAnkleInHuman.copy(plantedAnkle).sub(human.position).applyQuaternion(humanInverse);
    plantedShoeInHuman.copy(plantedShoe).sub(human.position).applyQuaternion(humanInverse);
    human.updateWorldMatrix(true, false);
    human.getWorldQuaternion(plantedShoeRotation).invert().multiply(groundRotation);

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const pedalY = Math.cos(phase) * 0.165 * leg.side;
      const pedalZ = Math.sin(phase) * 0.165 * leg.side;
      pedals[i].position.set(leg.side * 0.21, 0.49 + pedalY, 0.035 + pedalZ);
      leg.ankle.copy(pedals[i].position).add(point(0, 0.062, 0.025)).sub(human.position).applyQuaternion(humanInverse);
      if (leg.side === -1) {
        leg.ankle.lerp(plantedAnkleInHuman, planted);
        // Clearance in the middle of the transfer prevents a low pedal from
        // scraping the surface while the foot moves sideways.
        leg.ankle.y += Math.sin(Math.PI * planted) * 0.06;
      }
      leg.direction.subVectors(leg.ankle, leg.hip);
      const distance = Math.min(leg.direction.length(), 0.91);
      leg.direction.normalize();
      const upperLength = 0.445;
      const lowerLength = 0.46;
      const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
      const bendDistance = Math.sqrt(Math.max(upperLength ** 2 - along ** 2, 0.001));
      leg.bend.copy(pole).addScaledVector(leg.direction, -pole.dot(leg.direction)).normalize();
      leg.knee.copy(leg.hip).addScaledVector(leg.direction, along).addScaledVector(leg.bend, bendDistance);
      placeTube(leg.upperLeg, leg.hip, leg.knee, 0.068);
      placeTube(leg.lowerLeg, leg.knee, leg.ankle, 0.047);
      leg.kneeMesh.position.copy(leg.knee);
      leg.shoe.position.copy(leg.ankle).add(point(0, -0.025, -0.025));
      leg.shoe.rotation.set(Math.sin(phase) * leg.side * 0.12,0,0);
      if (leg.side === -1 && planted > 0) {
        pedalShoeRotation.copy(leg.shoe.quaternion);
        leg.shoe.quaternion.copy(pedalShoeRotation).slerp(plantedShoeRotation, planted);
        // The final sole follows the ground normal independently of the bicycle
        // pitch. Blend the small shoe-to-ankle offset separately.
        groundOffset.copy(plantedShoeInHuman).sub(plantedAnkleInHuman);
        groundOffset.sub(point(0, -0.025, -0.025)).multiplyScalar(planted);
        leg.shoe.position.add(groundOffset);
      }
    }

    for (const arm of arms) {
      handlePoint.set(arm.side * 0.27, 0.23, -0.11)
        .applyAxisAngle(yAxis, steeringRig.rotation.y).add(headTop).sub(human.position).applyQuaternion(humanInverse);
      placeTube(arm.forearm, arm.elbow, handlePoint, 0.039);
      arm.palm.position.copy(handlePoint);
    }
    bag.rotation.z = -0.10 + (reduced ? 0 : Math.sin(time * 2.4) * 0.012 * motion);
    // The original motion controller supplies contact targets. The imported
    // skeleton owns its bone rotations; it never moves the bicycle root.
    human.updateMatrix();
    characterPose.hips.copy(hips).applyMatrix4(human.matrix);
    characterPose.shoulders.copy(shoulders).applyMatrix4(human.matrix);
    characterPose.bodyQuaternion.copy(human.quaternion);
    gripRotation.setFromAxisAngle(yAxis,steeringRig.rotation.y);
    plantedContact.copy(plantedShoeWorld);plantedContact.y=groundY;rig.worldToLocal(plantedContact);
    for(let i=0;i<arms.length;i++){
      characterPose.hands[i].target.copy(arms[i].palm.position).applyMatrix4(human.matrix);
      characterPose.hands[i].rotation.copy(gripRotation);
      const foot=characterPose.feet[i];
      foot.contact.copy(pedals[i].position);foot.contact.y+=.014;
      foot.rotation.copy(human.quaternion).multiply(legs[i].shoe.quaternion);
      foot.planted=legs[i].side===-1?planted:0;
      if(foot.planted){foot.contact.lerp(plantedContact,planted);foot.contact.y+=Math.sin(Math.PI*planted)*.06;}
    }
    characterPose.headYaw=headPivot.rotation.y;characterPose.plantProgress=planted;
    characterPose.speed=speed;characterPose.reduced=reduced;characterPose.dt=delta;
    character?.update(characterPose);
  }

  function attachCharacter(model){
    if(character)throw new Error('A character is already attached to this bicycle.');
    const candidate=createWoodyRig(THREE,model);
    rig.add(candidate.group);
    try{candidate.update(characterPose);}catch(error){candidate.group.removeFromParent();candidate.dispose?.();throw error;}
    character=candidate;human.visible=false;
    return character;
  }
  update({ speed: 0, steering: 0, time: 0, dt: 0 });
  return { group, update, attachCharacter, bell, wheels: [rearWheel, frontWheel],
    get characterMetrics(){return character?.metrics??null;},
    get characterPose(){return characterPose;},
    get readyToRide() { return plantProgress <= 0; },
    get gestureState() { return {plantProgress, glanceYaw: headPivot.rotation.y, state: plantProgress === 0 ? 'riding' : plantProgress === 1 ? 'parked' : departureRequested ? 'departing' : 'parking'}; },
  };
}
