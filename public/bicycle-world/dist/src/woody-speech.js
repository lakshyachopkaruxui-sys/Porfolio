import {SPEECH_ENVELOPES} from './woody-speech-envelope.js';

/** Modest syllabic jaw movement. No motion without an actively playing owner. */
export function sampleSpeechOpening(frame){
  if(!frame?.playing || !Number.isFinite(frame.time) || frame.time<0)return 0;
  const values=SPEECH_ENVELOPES[String(frame.kind||'').replaceAll(':','-')];
  if(!values)return 0;
  const index=frame.time/.04,i=Math.floor(index),u=index-i;
  if(i>=values.length)return 0;
  return ((values[i]||0)*(1-u)+(values[i+1]||0)*u)/255;
}
export function createSpeechJaw(THREE,bones,{maxAngle=.045,restAngle=0}={}){
  const jaw=bones.find(bone=>bone.name==='jaw_Woody_arm');
  const rest=jaw?.quaternion.clone(),rotation=new THREE.Quaternion(),axis=new THREE.Vector3(1,0,0);
  let opening=0;
  return {apply(value=0,dt=0,reduced=false,active=false){
    const target=reduced?0:Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
    opening=reduced||(!active&&target===0)?0:opening+(target-opening)*(1-Math.exp(-(target>opening?32:22)*Math.max(0,Math.min(.12,dt))));
    if(jaw){jaw.quaternion.copy(rest);const neutral=Math.max(-.04,Math.min(0,restAngle)),peak=Math.min(.16,Math.max(0,maxAngle));rotation.setFromAxisAngle(axis,neutral+(peak-neutral)*opening);jaw.quaternion.multiply(rotation);}
    return opening;
  },get available(){return Boolean(jaw);},get opening(){return opening;}};
}
