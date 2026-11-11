import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {withinDeadline} from './loading.js';
import {disposeCharacterAsset} from './character-loader.js';
import {createGardenNature} from './garden-nature.js';
import {createGardenBridges} from './garden-bridge.js';
import {loadGardenPokeballs} from './garden-pokeballs.js';
import {createGardenRiver} from './garden-river.js';
import {createGardenAccents} from './garden-accents.js';

async function loadAsset(url,signal,timeoutMs=30000){
  if(signal?.aborted)throw new DOMException('Garden loading cancelled','AbortError');
  let expired=false,asset=null,released=false,cancel;
  const release=()=>{if(asset&&!released){released=true;disposeCharacterAsset(asset);}};
  const work=new GLTFLoader().loadAsync(url).then(gltf=>{asset=gltf.scene;if(expired)release();return asset;});
  const cancelled=new Promise((_,reject)=>{cancel=()=>{expired=true;release();reject(new DOMException('Garden loading cancelled','AbortError'));};signal?.addEventListener('abort',cancel,{once:true});});
  try{
    const result=await withinDeadline(Promise.race([work,cancelled]),timeoutMs);
    if(signal?.aborted||expired){release();throw new DOMException('Garden loading cancelled','AbortError');}
    return result;
  }
  catch(error){expired=true;release();throw error;}
  finally{signal?.removeEventListener('abort',cancel);}
}

/** A single owner for source textures and derived/instanced garden geometry. */
export async function loadGarden(scene,world,{signal}={}){
  const results=await Promise.allSettled([
    loadAsset(new URL('../assets/garden/nature-pack-runtime.glb',import.meta.url).href,signal),
    loadAsset(new URL('../assets/garden/japanese-bridge-runtime.glb',import.meta.url).href,signal),
  ]);
  if(results.some(r=>r.status==='rejected')||signal?.aborted){
    results.forEach(r=>{if(r.status==='fulfilled')disposeCharacterAsset(r.value);});
    throw results.find(r=>r.status==='rejected')?.reason||new DOMException('Garden loading cancelled','AbortError');
  }
  const sources=results.map(r=>r.value);let nature,bridges,river,pokeballs,accents;
  function release(){
    const colliders=[...(nature?.colliders||[]),...(bridges?.colliders||[]),...(pokeballs?.colliders||[])];
    accents?.dispose();pokeballs?.dispose();nature?.dispose();bridges?.dispose();river?.dispose();sources.forEach(disposeCharacterAsset);
    world.riverSurface.visible=true;world.bridgeDecks.root.visible=true;world.bridgeSurfaces.forEach(mesh=>mesh.visible=true);
    for(const collider of colliders){const index=world.colliders.indexOf(collider);if(index>=0)world.colliders.splice(index,1);}
  }
  try{
    nature=createGardenNature(sources[0]);bridges=createGardenBridges(sources[1]);river=createGardenRiver(sources[0]);
    scene.add(nature.root,bridges.root,river.root);
    world.riverSurface.visible=false;
    world.bridgeDecks.root.visible=false;
    world.bridgeSurfaces.forEach(mesh=>mesh.visible=false);
    world.colliders.push(...nature.colliders,...bridges.colliders);
  }catch(error){release();throw error;}
  // All optional decorations share one short budget after the base garden is
  // ready. Sequential per-asset deadlines could exhaust the essential stage.
  // Cancelling this child signal leaves the startup signal and base ride intact.
  const decorationBudget=6000,decorationController=new AbortController();
  const cancelDecorations=()=>decorationController.abort();
  signal?.addEventListener('abort',cancelDecorations,{once:true});
  if(signal?.aborted)cancelDecorations();
  const decorationTimer=setTimeout(cancelDecorations,decorationBudget);
  let decorationResults;
  try{
    decorationResults=await Promise.allSettled([
      loadGardenPokeballs(scene,{signal:decorationController.signal,deadline:decorationBudget}),
      loadAsset(new URL('../assets/garden/berry-bush.glb',import.meta.url).href,decorationController.signal,decorationBudget),
      loadAsset(new URL('../assets/garden/floral-accents.glb',import.meta.url).href,decorationController.signal,decorationBudget),
    ]);
  }finally{
    clearTimeout(decorationTimer);signal?.removeEventListener('abort',cancelDecorations);
  }
  const [balls,berry,flowers]=decorationResults;
  if(signal?.aborted){
    if(balls.status==='fulfilled')balls.value.dispose();
    for(const result of [berry,flowers])if(result.status==='fulfilled')disposeCharacterAsset(result.value);
    release();throw new DOMException('Garden loading cancelled','AbortError');
  }
  if(balls.status==='fulfilled'){
    pokeballs=balls.value;world.colliders.push(...pokeballs.colliders);
  }else console.warn('Garden ball displays could not load; the riding paths remain available.',balls.reason);
  if(berry.status==='fulfilled'){
    const floral=flowers.status==='fulfilled'?flowers.value:undefined;
    try{
      accents=createGardenAccents(berry.value,nature.placements,floral);scene.add(accents.root);
      sources.push(berry.value);if(floral)sources.push(floral);
    }catch(error){
      accents?.dispose();accents=undefined;disposeCharacterAsset(berry.value);if(floral)disposeCharacterAsset(floral);
      console.warn('Berry planting could not load; the garden remains available.',error);
    }
    if(flowers.status==='rejected')console.warn('Flower planting could not load; berries remain available.',flowers.reason);
  }else{
    if(flowers.status==='fulfilled')disposeCharacterAsset(flowers.value);
    console.warn('Berry planting could not load; the garden remains available.',berry.reason);
  }
  const decorationStatus=Object.freeze({balls:!!pokeballs,berries:!!accents,flowers:!!accents&&flowers.status==='fulfilled'});
  let disposed=false;
  return {nature,bridges,river,pokeballs,accents,decorationStatus,update(options){nature.update(options);accents?.update(options);river.update(options);},dispose(){
    if(disposed)return;disposed=true;release();
  }};
}
