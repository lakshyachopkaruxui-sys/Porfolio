import {AUDIO_MIX} from './audio-mix.js';

/** One actual, finite bell recording. Nothing downloads until a manual ring;
 * the browser audio unlock is requested within that original user gesture. */
export function createGardenBell({
  contextFactory=()=>new(globalThis.AudioContext||globalThis.webkitAudioContext)(),
  fetcher=globalThis.fetch,
  src=new URL('../assets/bicycle-audio/bicycle-bell.ogg',import.meta.url).href,
  gain=AUDIO_MIX.bell,
  onState,
}={}){
  let context=null,disposed=false,generation=0,unlockIntent=0,playIntent=0,lastRing=-Infinity;
  let buffer=null,pending=null,download=null,status='idle',startedCount=0,lastPublished='';
  const volume=Number.isFinite(gain)?Math.max(0,Math.min(1,gain)):AUDIO_MIX.bell;
  const voices=new Set();
  const snapshot=()=>Object.freeze({status,activeVoices:voices.size,cachedBuffers:buffer?1:0,startedCount,src});
  function publish(next=status){
    status=next;if(typeof onState!=='function')return;
    const value=snapshot(),signature=JSON.stringify(value);if(signature===lastPublished)return;lastPublished=signature;
    try{onState(value);}catch{ /* Diagnostics cannot interrupt a manual ring. */ }
  }
  function release(voice){
    if(!voices.delete(voice))return;
    voice.source.onended=null;
    try{voice.source.stop();}catch{}
    voice.source.disconnect();voice.gain.disconnect();
    publish(voices.size?'playing':pending?'loading':status==='off'?'off':'idle');
  }
  function stop(){
    generation++;unlockIntent++;playIntent++;
    download?.abort();download=null;pending=null;
    for(const voice of voices)release(voice);
    publish('off');
  }
  function recording(){
    if(buffer)return Promise.resolve(buffer);if(pending)return pending;
    const controller=new AbortController();download=controller;
    const work=Promise.resolve().then(()=>{
      if(disposed||controller.signal.aborted)throw new DOMException('Bell recording cancelled','AbortError');
      return fetcher(src,{signal:controller.signal});
    }).then(response=>{
      if(!response.ok)throw new Error('Bell recording unavailable.');return response.arrayBuffer();
    }).then(bytes=>{
      if(disposed||controller.signal.aborted)throw new DOMException('Bell recording cancelled','AbortError');
      return context.decodeAudioData(bytes);
    }).then(decoded=>{
      if(disposed||controller.signal.aborted)throw new DOMException('Bell recording cancelled','AbortError');
      if(!Number.isFinite(decoded?.duration)||decoded.duration<=0||decoded.duration>8)throw new Error('Bell recording must be a short finite clip.');
      buffer=decoded;publish(voices.size?'playing':'loading');return decoded;
    }).finally(()=>{if(pending===work){pending=null;download=null;}});
    pending=work;return work;
  }
  async function play(){
    if(disposed||volume<=0||!src)return false;
    const request=generation,unlock=++unlockIntent;
    let source,gainNode,voice,accepted=null;
    try{
      context??=contextFactory();
      const unlocked=context.resume();
      await unlocked;
      if(disposed||request!==generation||unlock!==unlockIntent||context.state!=='running')return false;
      if(context.currentTime-lastRing<.45)return false;
      lastRing=context.currentTime;
      accepted=++playIntent;if(!buffer)publish('loading');
      const clip=await recording();
      if(disposed||request!==generation||accepted!==playIntent||context.state!=='running')return false;
      // A repeated press replaces the old ring through a short crossfade. The
      // two envelope weights sum to at most one bell, rather than two full rings.
      const now=context.currentTime,replaceFade=.012;
      for(const previous of [...voices])if(previous.retiringUntil!==undefined)release(previous);
      const replacing=voices.size>0;
      for(const previous of voices){
        const elapsed=Math.max(0,now-previous.started);
        const weight=elapsed<previous.attack?elapsed/previous.attack:elapsed>previous.duration-previous.tail?Math.max(0,(previous.duration-elapsed)/previous.tail):1;
        previous.gain.gain.cancelScheduledValues?.(now);
        previous.gain.gain.setValueAtTime(volume*weight,now);
        previous.gain.gain.linearRampToValueAtTime(0,now+replaceFade);
        previous.source.stop(now+replaceFade);previous.retiringUntil=now+replaceFade;
      }
      const attack=Math.min(replacing?replaceFade:.004,clip.duration*.1),tail=Math.min(.04,clip.duration*.2);
      source=context.createBufferSource();gainNode=context.createGain();voice={source,gain:gainNode,started:now,duration:clip.duration,attack,tail};voices.add(voice);
      source.buffer=clip;source.loop=false;
      gainNode.gain.setValueAtTime(0,now);gainNode.gain.linearRampToValueAtTime(volume,now+attack);
      gainNode.gain.setValueAtTime(volume,now+clip.duration-tail);gainNode.gain.linearRampToValueAtTime(0,now+clip.duration);
      source.connect(gainNode);gainNode.connect(context.destination);source.onended=()=>release(voice);
      source.start(now);source.stop(now+clip.duration+.01);startedCount++;publish('playing');return true;
    }catch{
      if(voice)release(voice);else{if(source){source.onended=null;try{source.stop();}catch{}source.disconnect();}gainNode?.disconnect();}
      if(!disposed&&request===generation&&(accepted===null?unlock===unlockIntent:accepted===playIntent))publish('unavailable');
      return false;
    }
  }
  return {play,stop,get diagnostics(){return snapshot();},dispose(){if(disposed)return;disposed=true;stop();buffer=null;const closing=context;context=null;try{closing?.close()?.catch?.(()=>{});}catch{}publish('off');}};
}
