import {AUDIO_MIX} from './audio-mix.js';

const ROLES=['rolling','pedaling','freewheel'];
const START_SPEED=.18,STOP_SPEED=.07,FADE_SECONDS=.12,MAX_LOOP_VOICES=3;
const bounded=(value,min,max,fallback)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;

/** One optional owner for real bicycle recordings and short contact cues.
 * Motion uses observed travel, so a blocked or parked bicycle stays quiet. */
export function createRidingAudio({
  contextFactory=()=>new(globalThis.AudioContext||globalThis.webkitAudioContext)(),
  fetcher=globalThis.fetch,recordings={},onState,
}={}){
  let context=null,enabled=false,disposed=false,intent=0,generation=0,moving=false,idleAge=0,error=null,lastState='',startedCount=0;
  let loopBus=null,cueBus=null,loopBusLevel=1,cueBusLevel=1;
  const cues=new Map(),loops=new Set(),buffers=new Map();
  const roles=ROLES.flatMap(role=>{
    const record=recordings[role],gain=bounded(record?.gain,0,AUDIO_MIX.bicycle,.024);
    return typeof record?.src==='string'&&record.src&&gain>0?[{role,src:record.src,gain,coastingScale:bounded(record.coastingScale,0,1,1),wanted:false,pending:false,token:0,voice:null,failed:false,level:gain,rate:1}]:[];
  });
  function snapshot(){
    const playingRoles=roles.filter(role=>role.voice&&!role.voice.stopping).map(role=>role.role),loadingRoles=roles.filter(role=>role.pending).map(role=>role.role);
    return Object.freeze({enabled,status:disposed?'disposed':!enabled?(error?'unavailable':'off'):playingRoles.length?'playing':loadingRoles.length?'loading':loops.size?'fading':error?'error':'idle',playingRoles,loadingRoles,failedRoles:roles.filter(role=>role.failed).map(role=>role.role),activeLoopCount:loops.size,cachedBuffers:[...buffers.values()].filter(entry=>entry.buffer).length,startedCount,error,created:Boolean(context)});
  }
  function emit(){
    if(typeof onState!=='function')return;
    const status=snapshot(),signature=JSON.stringify(status);if(signature===lastState)return;lastState=signature;
    try{onState(status);}catch{ /* Diagnostics never interrupt riding or sound. */ }
  }
  function outputBus(kind){
    const existing=kind==='loops'?loopBus:cueBus;if(existing)return existing;
    const bus=context.createGain();bus.gain.setValueAtTime(1,context.currentTime);bus.connect(context.destination);
    if(kind==='loops')loopBus=bus;else cueBus=bus;return bus;
  }
  function balanceLoops(){
    if(!loopBus)return;
    // Include stopping voices until onended releases them. Their individual
    // envelopes can only stay below these ceilings, including rapid restarts.
    const total=[...loops].reduce((sum,voice)=>sum+voice.ceiling,0);
    const level=total>0?Math.min(1,AUDIO_MIX.bicycle/total):1;
    if(Math.abs(level-loopBusLevel)>1e-8){loopBus.gain.setValueAtTime(level,context.currentTime);loopBusLevel=level;}
  }
  function balanceCues(){
    if(!cueBus)return;
    const total=[...cues.values()].reduce((sum,cue)=>sum+cue.ceiling,0);
    const level=total>0?Math.min(1,AUDIO_MIX.ridingCueCeiling/total):1;
    if(Math.abs(level-cueBusLevel)>1e-8){cueBus.gain.setValueAtTime(level,context.currentTime);cueBusLevel=level;}
  }
  function releaseLoop(voice,{stopSource=false}={}){
    if(!loops.delete(voice))return;
    voice.source.onended=null;if(stopSource)try{voice.source.stop();}catch{}
    voice.source.disconnect();voice.gain.disconnect();if(voice.role.voice===voice)voice.role.voice=null;balanceLoops();emit();
  }
  function releaseCue(oscillator,{stopSource=false}={}){
    const cue=cues.get(oscillator);if(!cue)return;cues.delete(oscillator);oscillator.onended=null;
    if(stopSource)try{oscillator.stop();}catch{}oscillator.disconnect();cue.gain.disconnect();balanceCues();
  }
  function stop(){
    generation++;moving=false;idleAge=0;
    for(const role of roles){role.wanted=false;role.pending=false;role.token++;}
    for(const [src,entry] of buffers)if(!entry.buffer){entry.controller.abort();buffers.delete(src);}
    for(const voice of [...loops])releaseLoop(voice,{stopSource:true});
    for(const oscillator of [...cues.keys()])releaseCue(oscillator,{stopSource:true});emit();
  }
  async function setEnabled(value){
    const request=++intent;
    if(!value||disposed){enabled=false;if(!value)error=null;stop();return false;}
    try{
      context??=contextFactory();await context.resume();if(request!==intent||disposed)return false;
      enabled=context.state==='running';error=enabled?null:'audio-suspended';for(const role of roles)role.failed=false;emit();return enabled;
    }catch{if(request===intent&&!disposed){enabled=false;error='audio-unavailable';stop();}return false;}
  }
  function tick(frequency,volume,duration){
    if(!enabled||disposed||context?.state!=='running'||cues.size>=4)return;
    const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
    oscillator.type='triangle';oscillator.frequency.setValueAtTime(frequency,now);oscillator.frequency.exponentialRampToValueAtTime(frequency*.65,now+duration);
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(volume,now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    oscillator.connect(gain);gain.connect(outputBus('cues'));cues.set(oscillator,{gain,ceiling:volume});balanceCues();
    oscillator.onended=()=>releaseCue(oscillator);oscillator.start(now);oscillator.stop(now+duration+.01);
  }
  function smoothParameter(parameter,value,now,seconds=.06){
    if(parameter.setTargetAtTime)parameter.setTargetAtTime(value,now,seconds);else parameter.linearRampToValueAtTime(value,now+seconds*2);
  }
  function fadeRole(role){
    const voice=role.voice;if(!voice||voice.stopping)return;role.voice=null;voice.stopping=true;
    const now=context.currentTime;voice.gain.gain.cancelScheduledValues?.(now);voice.gain.gain.setValueAtTime(voice.gain.gain.value??voice.level,now);
    voice.gain.gain.linearRampToValueAtTime(0,now+FADE_SECONDS);
    try{voice.source.stop(now+FADE_SECONDS+.01);}catch{releaseLoop(voice);}emit();
  }
  function loadBuffer(src){
    const cached=buffers.get(src);if(cached)return cached.promise;
    const entry={controller:new AbortController(),buffer:null,promise:null};buffers.set(src,entry);
    entry.promise=Promise.resolve().then(()=>{
      if(disposed||entry.controller.signal.aborted)throw new DOMException('Bicycle audio cancelled','AbortError');return fetcher(src,{signal:entry.controller.signal});
    }).then(response=>{
      if(!response.ok)throw new Error('Bicycle recording unavailable.');return response.arrayBuffer();
    }).then(bytes=>{
      if(disposed||entry.controller.signal.aborted)throw new DOMException('Bicycle audio cancelled','AbortError');return context.decodeAudioData(bytes);
    }).then(buffer=>{
      if(disposed||entry.controller.signal.aborted)throw new DOMException('Bicycle audio cancelled','AbortError');
      if(!Number.isFinite(buffer?.duration)||buffer.duration<=0)throw new Error('Bicycle recording is empty.');entry.buffer=buffer;return buffer;
    }).catch(cause=>{if(buffers.get(src)===entry)buffers.delete(src);throw cause;});return entry.promise;
  }
  function beginRole(role){
    if(role.pending||role.failed||role.voice||loops.size>=MAX_LOOP_VOICES)return;
    const request=generation,token=++role.token;role.pending=true;emit();
    loadBuffer(role.src).then(buffer=>{
      if(role.token!==token)return;role.pending=false;
      if(disposed||!enabled||request!==generation||!role.wanted||context?.state!=='running'||loops.size>=MAX_LOOP_VOICES){emit();return;}
      let source,gain,voice;
      try{
        source=context.createBufferSource();gain=context.createGain();
        const now=context.currentTime;voice={source,gain,role,stopping:false,level:role.level,rate:role.rate,ceiling:role.level};
        source.buffer=buffer;source.loop=true;source.playbackRate.setValueAtTime(role.rate,now);gain.gain.setValueAtTime(0,now);smoothParameter(gain.gain,role.level,now);
        source.connect(gain);gain.connect(outputBus('loops'));source.onended=()=>releaseLoop(voice);loops.add(voice);role.voice=voice;balanceLoops();source.start(now);startedCount++;error=null;
      }catch{if(voice&&loops.has(voice))releaseLoop(voice,{stopSource:true});else{if(source){source.onended=null;try{source.stop();}catch{}source.disconnect();}gain?.disconnect();}role.failed=true;error='recording-unavailable';}emit();
    },cause=>{
      if(role.token!==token)return;role.pending=false;
      if(!disposed&&request===generation&&cause?.name!=='AbortError'){role.failed=true;error='recording-unavailable';}emit();
    });
  }
  function update(feedback={},motion={}){
    if(!enabled||disposed||context?.state!=='running'){if(moving||loops.size||roles.some(role=>role.pending))stop();return;}
    if(feedback.contactEvent)tick(130,AUDIO_MIX.contact,.10);else if(feedback.deckEvent)tick(245,AUDIO_MIX.deck,.035);
    const speed=Math.abs(bounded(motion.speed,-20,20,0)),travel=bounded(motion.moved,0,10,0),dt=bounded(motion.dt,0,.12,1/60);
    const observed=travel>1e-5&&speed>STOP_SPEED,wasMoving=moving;idleAge=observed?0:idleAge+dt;
    if(!moving&&observed&&speed>=START_SPEED){moving=true;for(const role of roles)role.failed=false;error=null;}
    else if(moving&&(speed<=STOP_SPEED||idleAge>.08))moving=false;
    const drive=motion.pedaling?'pedaling':motion.braking?null:'freewheel';let rollingSource=null;
    for(const role of roles){
      role.wanted=moving&&(role.role==='rolling'||role.role===drive);
      if(role.wanted&&role.role==='rolling')rollingSource=role.src;
      if(role.wanted&&role.role!=='rolling'&&role.src===rollingSource)role.wanted=false;
      role.level=role.gain*(.2+.8*Math.min(1,speed/7.8))*(role.role==='rolling'&&!motion.pedaling?role.coastingScale:1);
      role.rate=bounded(.8+speed/7.8*.4,.8,1.35,1);
      if(!role.wanted){if(role.pending){role.token++;role.pending=false;emit();}fadeRole(role);continue;}
      if(!role.voice){beginRole(role);continue;}
      const now=context.currentTime,voice=role.voice;
      if(Math.abs(role.level-voice.level)>.0005){voice.ceiling=Math.max(voice.ceiling,role.level);balanceLoops();smoothParameter(voice.gain.gain,role.level,now);voice.level=role.level;}
      if(Math.abs(role.rate-voice.rate)>.005){smoothParameter(voice.source.playbackRate,role.rate,now,.09);voice.rate=role.rate;}
    }
    if(wasMoving!==moving)emit();
  }
  return {setEnabled,stop,update,get enabled(){return enabled;},get diagnostics(){return snapshot();},dispose(){
    if(disposed)return;disposed=true;intent++;enabled=false;stop();buffers.clear();const closing=context;context=null;
    loopBus?.disconnect();cueBus?.disconnect();loopBus=null;cueBus=null;
    try{closing?.close()?.catch?.(()=>{});}catch{}emit();
  }};
}
