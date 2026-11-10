import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {withinDeadline} from './loading.js';
import {disposeCharacterAsset} from './character-loader.js';
import {createGardenNature} from './garden-nature.js';
import {createGardenBridges} from './garden-bridge.js';
import {loadGardenPokeballs} from './garden-pokeballs.js';
import {createGardenRiver} from './garden-river.js';
import {createGardenAccents} from './garden-accents.js';

async function loadAsset(url,signal){
  if(signal?.aborted)throw new DOMException('Garden loading cancelled','AbortError');
  let expired=false,asset=null,released=false,cancel;
  const release=()=>{if(asset&&!released){released=true;disposeCharacterAsset(asset);}};
  const work=new GLTFLoader().loadAsync(url).then(gltf=>{asset=gltf.scene;if(expired)release();return asset;});
  const cancelled=new Promise((_,reject)=>{cancel=()=>{expired=true;release();reject(new DOMException('Garden loading cancelled','AbortError'));};signal?.addEventListener('abort',cancel,{once:true});});
  try{return await withinDeadline(Promise.race([work,cancelled]),30000);}
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
  // Optional static accents share their source resources. A failed decoration
  // request must never prevent the original garden from starting.
  try{
    pokeballs=await loadGardenPokeballs(scene,{signal,deadline:6000});
    world.colliders.push(...pokeballs.colliders);
  }catch(error){
    if(signal?.aborted){release();throw error;}
    console.warn('Garden ball displays could not load; the riding paths remain available.',error);
  }
  // Optional low garden planting must not block the essential riding world.
  try{
    const source=await loadAsset(new URL('../assets/garden/berry-bush.glb',import.meta.url).href,signal);
    sources.push(source);let floral;
    try{floral=await loadAsset(new URL('../assets/garden/floral-accents.glb',import.meta.url).href,signal);sources.push(floral);}
    catch(error){if(signal?.aborted)throw error;console.warn('Flower planting could not load; berries remain available.',error);}
    accents=createGardenAccents(source,nature.placements,floral);scene.add(accents.root);
  }catch(error){
    if(signal?.aborted){release();throw error;}
    console.warn('Berry planting could not load; the garden remains available.',error);
  }
  let disposed=false;
  return {nature,bridges,river,pokeballs,accents,update(options){nature.update(options);accents?.update(options);river.update(options);},dispose(){
    if(disposed)return;disposed=true;release();
  }};
}
