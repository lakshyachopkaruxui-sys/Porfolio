import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {withinDeadline} from './loading.js';
import {disposeCharacterAsset} from './character-loader.js';
import {createGardenNature} from './garden-nature.js';
import {createGardenBridges} from './garden-bridge.js';
import {GARDEN_POKEBALL_PLACEMENTS,loadGardenPokeballs} from './garden-pokeballs.js';
import {createGardenRiver} from './garden-river.js';

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
    loadAsset(new URL('../assets/garden/nature-pack-runtime.glb?v=e35521829b9b',import.meta.url).href,signal),
    loadAsset(new URL('../assets/garden/japanese-bridge-runtime.glb',import.meta.url).href,signal),
  ]);
  if(results.some(r=>r.status==='rejected')||signal?.aborted){
    results.forEach(r=>{if(r.status==='fulfilled')disposeCharacterAsset(r.value);});
    throw results.find(r=>r.status==='rejected')?.reason||new DOMException('Garden loading cancelled','AbortError');
  }
  const sources=results.map(r=>r.value);let nature,bridges,river,pokeballs;
  const footprints=GARDEN_POKEBALL_PLACEMENTS.map(({id,x,z,radius})=>({id,x,z,radius,kind:'pokeball'}));
  const decorationController=new AbortController();
  let disposed=false,decorationRequest=null;
  function removeFootprints(){
    for(const footprint of footprints){
      const index=world.colliders.indexOf(footprint);
      if(index>=0)world.colliders.splice(index,1);
    }
  }
  function release(){
    removeFootprints();
    const colliders=[...(nature?.colliders||[]),...(bridges?.colliders||[]),...(pokeballs?.colliders||[])];
    pokeballs?.dispose();nature?.dispose();bridges?.dispose();river?.dispose();sources.forEach(disposeCharacterAsset);
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
  world.colliders.push(...footprints);
  const cancelDecorations=()=>decorationController.abort();
  signal?.addEventListener('abort',cancelDecorations,{once:true});

  async function attachDecorations(){
    try{
      const display=await loadGardenPokeballs(scene,{
        signal:decorationController.signal,deadline:30000,naturePlacements:nature.placements,
      });
      if(disposed||signal?.aborted){display.dispose();return;}
      removeFootprints();
      pokeballs=display;
      world.colliders.push(...display.colliders);
    }catch(error){
      removeFootprints();
      if(!disposed&&!signal?.aborted)console.warn('Garden ball displays could not load.',error);
    }
  }
  return {
    nature,bridges,river,
    loadDecorations(){
      if(!disposed&&!signal?.aborted)decorationRequest??=attachDecorations();
      return decorationRequest;
    },
    update(options){nature.update(options);river.update(options);},
    dispose(){
      if(disposed)return;
      disposed=true;cancelDecorations();
      signal?.removeEventListener('abort',cancelDecorations);
      release();
    },
  };
}
