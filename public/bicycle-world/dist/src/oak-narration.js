// Optional ordinary browser narration. No character imitation, network audio
// asset, autoplay or additional media player belongs to this controller.
export function createOakNarration({synthesis=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,onState=()=>{}}={}){
  let current=null,generation=0;
  const available=Boolean(synthesis&&typeof synthesis.speak==='function'&&typeof synthesis.cancel==='function'&&Utterance);
  function stop(){generation++;const owned=current;current=null;if(owned){owned.onend=null;owned.onerror=null;owned.onstart=null;synthesis.cancel();}onState(false);}
  function read(text){
    stop();if(!available||!text)return false;
    const token=generation,utterance=new Utterance(text);current=utterance;
    const voices=synthesis.getVoices?.()||[];
    const voice=voices.find(v=>v.localService&&/^en-IN/i.test(v.lang))||voices.find(v=>v.localService&&/^en/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));
    if(voice)utterance.voice=voice;utterance.lang=voice?.lang||'en-IN';utterance.rate=.98;utterance.pitch=1;utterance.volume=.9;
    const finish=error=>{if(generation!==token||current!==utterance)return;current=null;onState(false,error);};
    utterance.onend=()=>finish();utterance.onerror=()=>finish('Read aloud is unavailable here. You can keep reading the text.');
    onState(true);
    try{synthesis.speak(utterance);return true;}catch{finish('Read aloud is unavailable here. You can keep reading the text.');return false;}
  }
  return {available,read,stop,dispose:stop,get speaking(){return current!==null;}};
}
