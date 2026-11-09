/** Own one animation request, and stop before reporting a broken frame. */
export function createGuardedFrameLoop({step,onError,requestFrame=globalThis.requestAnimationFrame,cancelFrame=globalThis.cancelAnimationFrame}){
  let active=false,pending=null;
  function tick(now){
    pending=null;
    if(!active)return;
    try{step(now);}
    catch(error){active=false;onError(error);return;}
    if(active)pending=requestFrame(tick);
  }
  return {
    start(){if(active)return;active=true;pending=requestFrame(tick);},
    stop(){active=false;if(pending!==null)cancelFrame(pending);pending=null;},
    get running(){return active;},
  };
}
