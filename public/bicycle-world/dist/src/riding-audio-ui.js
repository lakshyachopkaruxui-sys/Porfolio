/** Touch activation is granted on release, unlike a mouse's pointerdown. */
export function isRidingAudioActivation(event){
  if(!event.isTrusted)return false;
  if(event.type==='pointerdown')return event.pointerType==='mouse';
  if(event.type==='pointerup')return event.pointerType!=='mouse';
  if(event.type==='keydown')return event.key!=='Escape'&&!event.metaKey&&!event.ctrlKey&&!event.altKey;
  return event.type==='click';
}

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
