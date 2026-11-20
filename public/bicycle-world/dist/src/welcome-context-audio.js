/** Use the legitimate Play ticket's resumed Web Audio context after model loading.
 * Direct visits retain the native media path and its readable gesture fallback. */
export function sharedWelcomeContext(host=globalThis){
 try {const context=host.parent?.__portfolioNarrationContext;return context?.state==='running'?context:null;}catch{return null;}
}
export function createBufferedWelcomeAudio(context,{AudioClass=globalThis.Audio,fetchAudio=globalThis.fetch}={}){
 const audio=new AudioClass();let source=null,controller=null,revision=0,startedAt=0,offset=0,paused=true,ended=false,duration=0;
 const stop=()=>{
  revision++;controller?.abort();controller=null;context.removeEventListener?.('statechange',contextStateChanged);
  if(source){source.onended=null;try{source.stop();}catch{}source.disconnect();source=null;}
  paused=true;offset=0;if(audio.dataset)audio.dataset.bufferedState='stopped';
 };
 Object.defineProperties(audio,{
  currentTime:{get:()=>paused?offset:Math.max(0,context.currentTime-startedAt),set:value=>{offset=Number(value)||0;}},
  paused:{get:()=>paused},ended:{get:()=>ended},duration:{get:()=>duration},
 });
 function contextStateChanged(){
  if(!source)return;
  if(context.state==='closed')audio.onerror?.();
  else if(context.state==='running')audio.onplaying?.();
  else audio.onwaiting?.();
 }
 audio.pause=()=>{const wasPlaying=!paused;stop();if(wasPlaying)audio.onpause?.();};
 audio.load=()=>{stop();};
 audio.play=async()=>{
  stop();ended=false;const token=revision;
  if(context.state!=='running')throw new Error('The welcome audio context requires a user gesture.');
  controller=new AbortController();
  const response=await fetchAudio(audio.src,{signal:controller.signal});if(!response.ok)throw new Error('Welcome recording unavailable.');
  const buffer=await context.decodeAudioData(await response.arrayBuffer());
  if(token!==revision)return;
  if(context.state!=='running')throw new Error('Welcome audio paused before playback.');
  const voice=context.createBufferSource();voice.buffer=buffer;voice.connect(context.destination);source=voice;
  voice.onended=()=>{if(token!==revision||source!==voice)return;ended=true;paused=true;offset=buffer.duration;if(audio.dataset)audio.dataset.bufferedState='ended';voice.disconnect();source=null;audio.onended?.();};
  duration=buffer.duration;startedAt=context.currentTime;paused=false;
  if(audio.dataset){audio.dataset.playbackBackend='webaudio';audio.dataset.bufferedState='playing';audio.dataset.bufferedStartedAt=String(startedAt);audio.dataset.bufferedDuration=String(duration);}
  context.addEventListener?.('statechange',contextStateChanged);voice.start();audio.onplaying?.();
 };
 return audio;
}
export function createWelcomeAudioClass(host=globalThis){
 return class WelcomeAudio {
  constructor(){const context=sharedWelcomeContext(host);return context?createBufferedWelcomeAudio(context,{AudioClass:host.Audio,fetchAudio:host.fetch.bind(host)}):new host.Audio();}
 };
}
