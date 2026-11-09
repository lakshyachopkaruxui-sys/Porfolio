/** A decorative handoff clock, advanced by the application's existing frame.
 * Covered state waits for the caller's actual readiness signal; there is no
 * timer, renderer, loading percentage, or minimum loading duration here. */
export function createCloudTransition({coverDuration=.5,revealDuration=1.15}={}){
  const duration=(value,fallback)=>Number.isFinite(value)&&value>0?Math.min(value,3):fallback;
  const coveringDuration=duration(coverDuration,.5),revealingDuration=duration(revealDuration,1.15);
  let phase='idle',elapsed=0;

  function snapshot(){
    return Object.freeze({
      phase,
      active:phase!=='idle',
      coverProgress:phase==='covering'?Math.min(1,elapsed/coveringDuration):phase==='covered'||phase==='revealing'?1:0,
      revealProgress:phase==='revealing'?Math.min(1,elapsed/revealingDuration):0,
    });
  }
  function cancel(){phase='idle';elapsed=0;return snapshot();}
  function cover({reduced=false}={}){
    if(reduced)return cancel();
    if(phase!=='idle')return snapshot();
    phase='covering';elapsed=0;return snapshot();
  }
  function reveal({reduced=false}={}){
    if(reduced)return cancel();
    if(phase==='idle'||phase==='revealing')return snapshot();
    // A readiness signal can arrive before the cover has completed. Begin
    // from opaque cover so a half-built scene never flashes through.
    phase='revealing';elapsed=0;return snapshot();
  }
  function advance(dt){
    if(!Number.isFinite(dt)||dt<=0||phase==='idle'||phase==='covered')return snapshot();
    const total=phase==='covering'?coveringDuration:revealingDuration;
    elapsed=Math.min(total,elapsed+dt);
    if(elapsed>=total-1e-10){
      if(phase==='covering'){phase='covered';elapsed=0;}
      else return cancel();
    }
    return snapshot();
  }
  return {get snapshot(){return snapshot();},cover,reveal,advance,cancel};
}
