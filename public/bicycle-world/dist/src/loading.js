/** Execute real startup work in order; status never advances ahead of the work. */
export async function runLoadingStages(stages,{onStage=()=>{},yieldControl=()=>Promise.resolve(),signal,timeoutMs=60000,onTimeout=()=>{}}={}){
  for(const stage of stages){
    signal?.throwIfAborted();
    onStage(stage.id,'working',stage.label);
    try{
      await withinDeadline((async()=>{
        await yieldControl();signal?.throwIfAborted();
        await stage.run();signal?.throwIfAborted();
      })(),stage.timeoutMs??timeoutMs,{signal,onTimeout});
      onStage(stage.id,'complete',stage.label);
    }
    catch(error){onStage(stage.id,'failed',stage.label);throw error;}
  }
}

/** Missing optional artwork must not trap visitors at a loading screen. */
export function loadImage(src,{ImageClass=globalThis.Image,timeoutMs=8000}={}){
  return new Promise(resolve=>{
    let image;
    try{image=new ImageClass();}catch{resolve(null);return;}
    let settled=false;
    const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=null;image.onerror=null;resolve(ok?image:null);};
    const timer=setTimeout(()=>finish(false),timeoutMs);
    image.onload=()=>finish(true);image.onerror=()=>finish(false);
    try{image.src=src;}catch{finish(false);}
  });
}

export async function withinDeadline(work,timeoutMs=15000,{signal,onTimeout=()=>{}}={}){
  let timer,cancel;
  const interrupted=new Promise((_,reject)=>{
    cancel=()=>reject(signal.reason||new DOMException('Preparation cancelled','AbortError'));
    if(signal?.aborted){cancel();return;}
    signal?.addEventListener('abort',cancel,{once:true});
    timer=setTimeout(()=>{
      const error=new Error('Preparation timed out');
      reject(error);
      try{onTimeout(error);}catch{/* Recovery must still reject through its normal promise path. */}
    },timeoutMs);
  });
  try{return await Promise.race([work,interrupted]);}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
