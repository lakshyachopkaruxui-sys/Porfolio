import * as THREE from 'three';

const skinMaterials=new Set(['Material_12','Material_13','Material_14']);
const sourceSkin=new THREE.Color('#efaa61'),referenceSkin=new THREE.Color('#ed7906');
const scale=new THREE.Vector3(referenceSkin.r/sourceSkin.r,referenceSkin.g/sourceSkin.g,referenceSkin.b/sourceSkin.b);
const shaderHeader=`
uniform vec3 charizardOrangeScale;
uniform float charizardOrangeStrength;
float charizardOrangeMask(vec3 colour) {
  float red = max(colour.r, 0.00001);
  float greenRatio = colour.g / red;
  float blueRatio = colour.b / red;
  // Ratios are linear, matching decoded map_fragment colours. The native tan
  // skin occupies this band; cream, teal, white, pink and red lie outside it.
  return smoothstep(0.19, 0.30, greenRatio)
    * (1.0 - smoothstep(0.63, 0.75, greenRatio))
    * (1.0 - smoothstep(0.32, 0.44, blueRatio))
    * smoothstep(0.005, 0.025, colour.r);
}
`;
const shaderTreatment=`
#include <map_fragment>
float charizardSkin = charizardOrangeMask(diffuseColor.rgb) * charizardOrangeStrength;
diffuseColor.rgb *= mix(vec3(1.0), charizardOrangeScale, charizardSkin);
`;

/** Match native orange skin to the supplied Charmander's richer pigment.
 * The source textures include cream and teal regions in the same atlases, so
 * adjust only orange texels before lighting, preserving their original detail.
 * This adapter owns material clones only; all imported textures remain shared. */
export function createCharizardColour(model,{strength=1}={}){
  const amount=Number.isFinite(strength)?Math.max(0,Math.min(1,strength)):1;
  const materials=new Map(),bindings=[];
  let disposed=false,applied=false;
  function replacement(original){
    if(!original?.isMeshStandardMaterial||!skinMaterials.has(original.name))return original;
    if(materials.has(original))return materials.get(original);
    const material=original.clone(),previousCompile=original.onBeforeCompile,previousKey=original.customProgramCacheKey;
    material.name=original.name+' (Charizard orange)';
    material.onBeforeCompile=function(shader,renderer){
      previousCompile.call(this,shader,renderer);
      if(!shader.fragmentShader.includes('#include <map_fragment>'))throw new Error('Charizard colour treatment requires the standard map fragment.');
      shader.uniforms.charizardOrangeScale={value:scale};shader.uniforms.charizardOrangeStrength={value:amount};
      shader.fragmentShader=shaderHeader+shader.fragmentShader.replace('#include <map_fragment>',shaderTreatment);
    };
    material.customProgramCacheKey=()=>previousKey.call(original)+':charizard-orange-linear-v1';
    materials.set(original,material);return material;
  }
  model?.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.material)return;
    const original=mesh.material,source=Array.isArray(original)?original:[original],next=source.map(replacement);
    if(source.some((material,index)=>material!==next[index]))bindings.push({mesh,original,next:Array.isArray(original)?next:next[0]});
  });
  const api={
    apply(){if(disposed)return api;for(const binding of bindings)binding.mesh.material=binding.next;applied=true;return api;},
    reset(){if(disposed)return api;for(const binding of bindings)if(binding.mesh.material===binding.next)binding.mesh.material=binding.original;applied=false;return api;},
    dispose(){if(disposed)return;api.reset();disposed=true;for(const material of materials.values())material.dispose();},
    get diagnostics(){return {sourceSkin:'#efaa61',referenceSkin:'#ed7906',strength:amount,materials:[...materials.keys()].map(material=>material.name),materialCount:materials.size,meshBindings:bindings.length,applied,disposed};},
  };
  return api;
}
