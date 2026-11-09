import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {withinDeadline} from './loading.js';

/** Release the imported asset, including image bitmaps retained by GLTFLoader. */
export function disposeCharacterAsset(root){
  const geometries=new Set(),materials=new Set(),textures=new Set(),images=new Set(),skeletons=new Set();
  root?.traverse(object=>{
    if(object.geometry)geometries.add(object.geometry);
    if(object.skeleton)skeletons.add(object.skeleton);
    if(object.material)for(const material of Array.isArray(object.material)?object.material:[object.material]){
      materials.add(material);
      for(const value of Object.values(material))if(value?.isTexture){textures.add(value);if(value.source?.data)images.add(value.source.data);}
    }
  });
  root?.removeFromParent();
  skeletons.forEach(resource=>resource.dispose());geometries.forEach(resource=>resource.dispose());
  materials.forEach(resource=>resource.dispose());textures.forEach(resource=>resource.dispose());
  images.forEach(image=>image.close?.());
}

/** Woody is required for this version of the ride. Reading stays independent. */
export async function loadWoodyCharacter({signal}={}){
  if(signal?.aborted)throw new DOMException('Character loading cancelled','AbortError');
  let expired=false,disposed=false;
  const release=scene=>{if(!disposed){disposed=true;disposeCharacterAsset(scene);}};
  const work=new GLTFLoader().loadAsync(new URL('../assets/characters/woody.glb',import.meta.url).href);
  work.then(gltf=>{if(expired)release(gltf.scene);},()=>{});
  let cancel;
  const cancelled=new Promise((_,reject)=>{
    cancel=()=>{expired=true;reject(new DOMException('Character loading cancelled','AbortError'));};
    signal?.addEventListener('abort',cancel,{once:true});
  });
  try{
    const gltf=await withinDeadline(Promise.race([work,cancelled]),30000);
    if(signal?.aborted||expired){release(gltf.scene);throw new DOMException('Character loading cancelled','AbortError');}
    return gltf.scene;
  }
  catch(error){expired=true;if(error.name==='AbortError')throw error;throw new Error('The Woody character could not load. Retry the world or browse the projects.',{cause:error});}
  finally{signal?.removeEventListener('abort',cancel);}
}
