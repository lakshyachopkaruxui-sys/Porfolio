/** One owner for navigation visibility and mutually exclusive riding prompts. */
export function hybridUIState({ready,inPortfolio,running,modalOpen,previewOpen,hasRoute,speed,nearStop,hintVisible,stopFocused,coarse=false,inputBlocked=false}) {
  const riding=Boolean(ready&&!inPortfolio&&running&&!modalOpen&&!previewOpen);
  const kind=!riding?null:hasRoute?'route':Math.abs(speed)>.05||stopFocused?'riding':nearStop?'nearby':hintVisible?'hint':null;
  return {controls:riding,touchControls:riding&&coarse&&!inputBlocked,intro:!inPortfolio&&!running&&!modalOpen&&!previewOpen,reading:!inPortfolio&&Boolean(modalOpen),status:['route','riding'].includes(kind),interact:kind==='nearby',hint:kind==='hint',kind};
}

/** Held native buttons share movement keys without losing another held source. */
export function createTouchRidingInput({buttons,keys,physicalKeys=new Set(),isActive,onStart,releaseTarget}) {
  const records=[...buttons].map(button=>({button,key:button.dataset.key,pointers:new Set(),keyboard:new Set()}));
  const ownedKeys=new Set(),listeners=[];
  let disposed=false;
  const listen=(target,type,handler)=>{
    target?.addEventListener(type,handler);
    listeners.push(()=>target?.removeEventListener(type,handler));
  };
  function sync(){
    const heldKeys=new Set();
    for(const record of records){
      const held=record.pointers.size>0||record.keyboard.size>0;
      if(held)heldKeys.add(record.key);
      record.button.classList.toggle('pressed',held);
      record.button.setAttribute('aria-pressed',String(held));
    }
    for(const key of ownedKeys)if(!heldKeys.has(key)){if(!physicalKeys.has(key))keys.delete(key);ownedKeys.delete(key);}
    for(const key of heldKeys){keys.add(key);ownedKeys.add(key);}
    for(const key of physicalKeys)keys.add(key);
  }
  function releasePointer(record,id){
    if(!record.pointers.delete(id))return;
    try{if(record.button.hasPointerCapture?.(id))record.button.releasePointerCapture(id);}catch{}
    sync();
  }
  function clear(){
    for(const record of records){
      const pointers=[...record.pointers];
      record.pointers.clear();record.keyboard.clear();
      for(const id of pointers)try{if(record.button.hasPointerCapture?.(id))record.button.releasePointerCapture(id);}catch{}
    }
    sync();
  }
  for(const record of records){
    const {button}=record;
    listen(button,'pointerdown',event=>{
      if(disposed||!isActive()||event.button!==0)return;
      event.preventDefault();
      if(record.pointers.has(event.pointerId))return;
      record.pointers.add(event.pointerId);
      try{button.setPointerCapture(event.pointerId);}catch{}
      onStart();sync();
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(button,type,event=>releasePointer(record,event.pointerId));
    listen(button,'keydown',event=>{
      if(!['Enter',' '].includes(event.key)||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;
      event.preventDefault();
      if(disposed||!isActive()||event.repeat||record.keyboard.has(event.key))return;
      record.keyboard.add(event.key);onStart();sync();
    });
    listen(button,'keyup',event=>{
      if(!['Enter',' '].includes(event.key))return;
      event.preventDefault();record.keyboard.delete(event.key);sync();
    });
    listen(button,'blur',()=>{record.keyboard.clear();sync();});
  }
  // Window-level release also covers a failed capture or release outside a button.
  for(const type of ['pointerup','pointercancel'])listen(releaseTarget,type,event=>{
    for(const record of records)releasePointer(record,event.pointerId);
  });
  listen(releaseTarget,'blur',clear);
  sync();
  return {clear,sync,dispose(){if(disposed)return;disposed=true;clear();for(const remove of listeners)remove();}};
}
