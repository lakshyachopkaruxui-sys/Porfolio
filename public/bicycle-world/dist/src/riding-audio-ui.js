/** Keep the visible preference aligned with the latest asynchronous audio intent. */
export function mountRidingAudioControl(checkbox,audio,{onPreference,onUnavailable}={}){
  let intent=0,disposed=false;
  async function change(){
    const request=++intent,wanted=checkbox.checked;
    onPreference?.(wanted);
    try{await audio.setEnabled(wanted);if(!disposed&&request===intent)checkbox.checked=audio.enabled;}
    catch{if(!disposed&&request===intent){checkbox.checked=audio.enabled;onUnavailable?.();}}
  }
  checkbox.addEventListener('change',change);
  return {sync(){if(!disposed)checkbox.checked=audio.enabled;},dispose(){disposed=true;intent++;checkbox.removeEventListener('change',change);}};
}
