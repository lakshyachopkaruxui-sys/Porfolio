import { OAK_ENERGY } from './oak-voice-energy.js';

import { articulation } from './oak-articulation.js';

const clamp = value => Math.max(0, Math.min(1, value));
function ease(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function phrase(t, start, end, attack, release) {
  return ease((t - start) / attack) * ease((end - t) / release);
}

// Each entry describes the gesture target for one sentence of the recording.
const delivery = {
  'dialogue-childhood-wish': ['welcome', 'self', 'remember', 'invite'],
  'dialogue-pokemon-go-today': ['remember', 'affirm', 'invite'],
  'dialogue-woody-companion': ['show', 'remember', 'affirm'],
  'dialogue-real-collection': ['show', 'invite'],
  'dialogue-collection-connection': ['invite', 'show'],
  'dialogue-direction-and-tools': ['show', 'remember', 'explain'],
  'dialogue-build-in-layers': ['explain', 'show'],
  'dialogue-explore-or-read': ['invite', 'show'],
  'making-childhood': ['remember', 'invite'],
  'making-exploration': ['show', 'explain'],
  'making-structure': ['show', 'invite', 'self'],
  'making-layers': ['explain', 'affirm', 'self'],
  'making-details': ['show', 'affirm'],
  'making-access': ['invite', 'explain'],
  'place-about': ['invite'],
  'place-work': ['show', 'invite'],
  'place-hobbies': ['show', 'remember'],
  'place-oak': ['show', 'invite'],
  'place-cloud': ['show', 'invite'],
};

// Opening, lip rounding and lateral stretch. Closures on M/B/P override energy.
const mouthShapes = {
  _: [.045,0,0], C: [0,0,0], F: [.034,0,.22], T: [.10,0,.19],
  O: [.22,1,0], E: [.12,0,.88], A: [.275,.04,.20],
};
export function createOakPerformance(model, photo) {
  const bone = name => model.getObjectByName(name);
  const chest = bone('Chest'), head = bone('Head'), jaw = bone('Jaw');
  const right = ['Shoulder', 'Elbow', 'Wrist'].map(joint => bone('Right' + joint));
  const left = ['Shoulder', 'Elbow', 'Wrist'].map(joint => bone('Left' + joint));
  const hands = [], lips = [], eyes = new Set();
  model.traverse(part => {
    if (part.morphTargetDictionary?.RightCurl !== undefined) hands.push(part);
    if (part.morphTargetDictionary?.Smile !== undefined) lips.push(part);
    if (part.isMesh && ['Object_5', 'Object_27'].includes(part.name)) eyes.add(part.material.map);
  });
  // Flex each elbow around the axis across the arm. The baked arm slopes
  // outward, so its hinge is perpendicular to the elbow-to-wrist direction.
  const forward = head.position.clone().set(0, 0, 1);
  const hinge = [right, left].map(arm => arm[2].position.clone().cross(forward).normalize());
  const root = bone('OakRoot');
  const aim = forward.clone(), ray = forward.clone(), offset = forward.clone();
  const rotation = head.quaternion.clone(), base = rotation.clone();
  // Solve in the shoulder parent's coordinates after the body turn. The
  // pointing ray starts at the posed wrist, rather than the character origin.
  function aimHand(arm, direction, weight, target, sweep=0) {
    if (!weight) return;
    const shoulder = arm[0];
    base.copy(shoulder.quaternion);
    ray.copy(direction);
    if (target) ray.applyQuaternion(arm[2].quaternion);
    ray.applyQuaternion(arm[1].quaternion);
    for (let i=0;i<(target?3:1);i++) {
      if (target) {
        aim.copy(target); shoulder.parent.worldToLocal(aim).sub(shoulder.position);
        offset.copy(arm[2].position).applyQuaternion(arm[1].quaternion)
          .add(arm[1].position).applyQuaternion(shoulder.quaternion);
        aim.sub(offset).normalize();
      } else aim.set(-.18+.13*sweep,.97,.16).normalize();
      offset.copy(ray).applyQuaternion(shoulder.quaternion).normalize();
      shoulder.quaternion.premultiply(rotation.setFromUnitVectors(offset,aim));
    }
    shoulder.quaternion.slerp(base,1-weight);
  }
  const waveRay = forward.clone().set(-.66,-.75,.05).normalize();
  const pointRay = forward.clone().set(.65,-.74,.18).normalize();
  function arms(hello, self, show, invite, explain, wave, point=0) {
    const reach = .76*show + .68*invite + .42*explain;
    right[0].rotation.set(-.07-.29*hello-.22*self, .16*hello+.42*self,
      .29-.97*hello+.04*self);
    left[0].rotation.set(-.07-.22*reach, -.16*reach, -.29+.66*reach);
    right[1].quaternion.setFromAxisAngle(hinge[0], .15+1.64*hello+.75*self+.09*wave);
    left[1].quaternion.setFromAxisAngle(hinge[1], (.15+.49*reach)*(1-point)+.19*point);
    right[2].rotation.set(-.19*hello+.05*self,.17*hello,.28*wave);
    left[2].rotation.set(.07*reach*(1-point),-.09*reach,.055*explain);
    aimHand(right,waveRay,hello,null,wave);
    aimHand(left,pointRay,point,photo.position);
    for (const hand of hands) {
      const w=hand.morphTargetInfluences;
      w[0]=.14+.12*self-.095*hello+.045*wave;
      w[1]=(.14-.08*reach)*(1-point);
      w[2]=point*.93;
    }
  }
  const localEye = head.position.clone();
  let lastClip = null, samples = '', lastTime = -1, lastYaw = NaN, lastPitch = NaN;
  function face(smile, round, spread, blink, brow) {
    for (const part of lips) {
      const w = part.morphTargetInfluences;
      w[0] = smile; w[1] = round; w[2] = spread;
    }
    for (const texture of eyes) texture.offset.set(Math.round(5 * blink) / 6, Math.round(5 * brow) / 6);
  }
  function viewAngles(cameraPosition) {
    if (!cameraPosition) return [0, 0];
    localEye.copy(cameraPosition);
    head.parent.worldToLocal(localEye).sub(head.position);
    // Aim from the eyes, which sit above and forward of the neck pivot.
    localEye.y -= 17; localEye.z -= 11;
    return [Math.max(-.92, Math.min(.92, Math.atan2(localEye.x, localEye.z))),
      Math.max(-.24, Math.min(.20, -Math.atan2(localEye.y, Math.hypot(localEye.x, localEye.z))))];
  }
  return function pose(playback, cameraPosition) {
    const [yaw, pitch] = viewAngles(cameraPosition);
    const sameView = Math.abs(yaw-lastYaw)<.0001 && Math.abs(pitch-lastPitch)<.0001;
    lastYaw=yaw; lastPitch=pitch;
    if (!playback) {
      if (!lastClip && sameView) return false;
      root.rotation.y=0;
      chest.rotation.set(0,0,0); head.rotation.set(pitch,yaw,.015,'YXZ'); jaw.rotation.x=0;
      arms(0,0,0,0,0,0);
      face(.68,0,0,0,.52);
      lastClip = null;
      return true;
    }
    const { clip, time } = playback;
    if (lastClip === clip && time === lastTime && sameView) return false;
    if (clip !== lastClip) samples = atob(OAK_ENERGY[clip.id] || '');
    lastTime = time;
    lastClip = clip;
    const samplePosition = Math.max(0, time * 25 - .5);
    const index = Math.floor(samplePosition), mix = samplePosition - index;
    const amplitude = ((samples.charCodeAt(index) || 0) * (1 - mix)
                    + (samples.charCodeAt(index + 1) || 0) * mix) / 255;
    const keys = articulation[clip.id] || [];
    const centis = time * 100 + 2;
    const k = keys.findLastIndex(key => key[0] <= centis);
    const current = keys[k], previous = keys[k-1];
    const blend = current ? ease((centis-current[0]+1)/5) : 1;
    const mouth = (key, component) => mouthShapes[key?.[1] || '_'][component];
    const shape = component => mouth(previous,component)*(1-blend) + mouth(current,component)*blend;
    jaw.rotation.x = shape(0) * Math.sqrt(amplitude);

    const cueIndex = Math.max(0, clip.cues.findLastIndex(cue => cue.start <= time));
    const cue = clip.cues[cueIndex];
    const t = time - cue.start, duration = cue.end - cue.start;
    const intent = delivery[clip.id]?.[cueIndex] || 'explain';
    // One accent, hold and recovery per thought. A long sentence gets a second,
    // smaller nod, leaving the jaw free to articulate between accents.
    const accent = phrase(t, -.04, duration + .16, Math.min(.50, duration * .36), .48);
    const weight = accent * (1 - .38 * phrase(t, 1.25, duration * .70, .63, .55));
    const nod = phrase(t, .13, Math.min(duration, 1.04), .26, .44)
      + (duration > 3.3 ? .55 * phrase(t, duration * .63, duration * .63 + .8, .28, .46) : 0);
    // The invitation hand leads into the first pause, as a person would finish a wave.
    const hello = intent === 'welcome' ? phrase(t, 0, 1.50, .34, .39) : 0;
    const self = intent === 'self' ? weight : 0;
    const show = intent === 'show' ? weight : 0;
    const invite = intent === 'invite' ? weight : 0;
    const explain = intent === 'explain' ? weight : 0;
    const remember = intent === 'remember' ? weight : 0;
    const wave = hello * Math.sin((t - .31) * 12) * phrase(t, .30, 1.08, .20, .22);
    const collection = (clip.id==='dialogue-real-collection' && cueIndex===0)
      || (clip.id==='place-oak' && cueIndex===1)
      || (clip.id==='dialogue-collection-connection' && cueIndex===0);
    const end=Math.min(duration,4.3);
    const glance=collection?phrase(t,0,end,.46,.55):0;
    const point=collection?phrase(t,.16,end,.66,.62):0;
    root.rotation.y=.95*point;
    chest.rotation.set(.045 * hello + .035 * invite, .12 * show - .05 * self, .025 * remember - .023 * hello);
    head.rotation.set(pitch+.061*nod-.027*remember, yaw+.085*show-.033*remember,
      .012+.043*hello+.038*remember, 'YXZ');
    if (glance) {
      aim.copy(photo.position);head.parent.worldToLocal(aim).sub(head.position);
      const turn=Math.atan2(aim.x,aim.z);
      head.rotation.y+=(Math.min(1.25,turn)-head.rotation.y)*glance;
      head.rotation.x+=(-Math.atan2(aim.y-17,Math.hypot(aim.x,aim.z))-head.rotation.x)*glance;
    }
    const blink = Math.max(
      (cueIndex % 2 === 0 || duration > 3) ? phrase(t,duration-.11,duration+.12,.085,.13) : 0,
      duration>4 ? phrase(t,2.68,2.92,.09,.14) : 0);
    face(.61+.29*hello+.18*invite-.32*shape(1)*amplitude-.12*shape(0)*amplitude,
      shape(1)*amplitude, shape(2)*amplitude, blink,
      clamp(.48+.50*hello+.34*invite+.21*nod-.16*remember));
    arms(hello,self,show,invite,explain,wave,point);
    return true;
  };
}
