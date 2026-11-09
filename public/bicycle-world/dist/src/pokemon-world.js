import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {disposeCharacterAsset} from './character-loader.js';
import {withinDeadline} from './loading.js';
import {choosePokemonHabitats,pokemonMotion} from './pokemon-habitats.js';
import {createPokemonPose,getPokemonAnchor} from './pokemon-pose.js';
import {createPikachuGait} from './pikachu-gait.js';
import {createGroundPokemonGait} from './ground-pokemon-gait.js';
import {createReplacementCharacterPose} from './replacement-character-poses.js';
import {createSleepCues} from './pokemon-sleep-cues.js';

export function createCompanionPose(id,model,spec={}){
  if(id==='pikachu')return createPikachuGait(model);
  if(id==='bulbasaur')return createGroundPokemonGait(id,model);
  if(id==='charmander'||id==='snorlax')return createReplacementCharacterPose(id,model,spec);
  return createPokemonPose(id,model);
}

const loadClock=()=>globalThis.performance?.now?.()??Date.now();
function reportLoadTiming(observer,phase,startedAt,id,key=null){
  if(typeof observer!=='function')return;
  const endedAt=loadClock();
  // Diagnostics must never change whether an optional inhabitant can load.
  try{observer({phase,id,key,startedAtMs:startedAt,endedAtMs:endedAt,durationMs:Math.max(0,endedAt-startedAt)});}catch{}
}

export async function loadPokemonAsset(id,signal,{onLoadTiming}={}){
  let expired=false,asset,released=false;
  const requestController=new AbortController(),cancel=()=>requestController.abort();
  if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
  const release=()=>{if(asset&&!released){released=true;disposeCharacterAsset(asset);}};
  const url=new URL(`../assets/pokemon/${id}.glb`,import.meta.url);
  const fetchStart=onLoadTiming?loadClock():0;
  const work=fetch(url,{signal:requestController.signal}).then(response=>{
    if(!response.ok)throw new Error(`${id} could not load.`);return response.arrayBuffer();
  }).then(bytes=>{
    reportLoadTiming(onLoadTiming,'fetch-body',fetchStart,id);
    const parseStart=onLoadTiming?loadClock():0;
    return new GLTFLoader().parseAsync(bytes,new URL('./',url).href).then(gltf=>{
      reportLoadTiming(onLoadTiming,'gltf-parse-images',parseStart,id);return gltf;
    });
  }).then(gltf=>{
    asset=gltf.scene;if(expired||signal?.aborted)release();return asset;
  });
  try{
    const scene=await withinDeadline(work,15000);
    if(signal?.aborted)throw new DOMException('Companion loading cancelled','AbortError');return scene;
  }catch(error){expired=true;requestController.abort();release();throw error;}
  finally{signal?.removeEventListener('abort',cancel);}
}

/** Optional inhabitants: small, bounded habitats; never a condition of reading. */
export function createPokemonWorld({scene,obstacles=[],trees=[],loadAsset=loadPokemonAsset,poseFactory=createCompanionPose,onLoadTiming}={}){
  const habitats=choosePokemonHabitats(obstacles,trees);
  const root=new THREE.Group();root.name='Garden Pokémon';scene.add(root);
  const records=habitats.map((spec,index)=>({spec,index,status:'idle',model:null,pose:null,body:null,shadow:null,clock:index*2.7,reaction:0,heading:0,near:false,motionDistance:0,lastPosition:null}));
  // Stable, small snapshots let the audio scheduler follow moving inhabitants
  // without exposing their render objects or allocating on every frame.
  const audioSources=habitats.map(spec=>({key:spec.key,id:spec.id,kind:spec.kind,x:spec.x,y:spec.y,z:spec.z,ready:false}));
  const controller=new AbortController(),frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),sphere=new THREE.Sphere(),pickPoint=new THREE.Vector3();
  const shadowPixels=new Uint8Array(32*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const offset=(y*32+x)*4,falloff=Math.max(0,1-Math.hypot((x-15.5)/15.5,(y-15.5)/15.5));
    shadowPixels[offset]=shadowPixels[offset+1]=shadowPixels[offset+2]=255;shadowPixels[offset+3]=Math.round(falloff*falloff*255);
  }
  const shadowTexture=new THREE.DataTexture(shadowPixels,32,32);shadowTexture.magFilter=THREE.LinearFilter;shadowTexture.minFilter=THREE.LinearFilter;shadowTexture.needsUpdate=true;
  const shadowGeometry=new THREE.CircleGeometry(1,20),shadowMaterial=new THREE.MeshBasicMaterial({color:'#244a34',map:shadowTexture,transparent:true,opacity:.3,depthWrite:false});
  const sources=new Map();
  let disposed=false,loading=0,lastTime=null,latestPlayer={x:18,z:22};
  function releaseSource(entry){if(entry.source&&!entry.released){entry.released=true;disposeCharacterAsset(entry.source);}}
  function sourceFor(id){
    let entry=sources.get(id);if(entry)return entry.promise;
    entry={source:null,released:false,promise:null};sources.set(id,entry);
    const sourceStart=onLoadTiming?loadClock():0;
    entry.promise=Promise.resolve().then(()=>loadAsset(id,controller.signal,{onLoadTiming})).then(source=>{
      reportLoadTiming(onLoadTiming,'source-total',sourceStart,id);
      entry.source=source;if(disposed||controller.signal.aborted)releaseSource(entry);return source;
    });
    return entry.promise;
  }
  function releaseClone(model){
    if(!model)return;
    // Clones share source geometry/materials/textures but own native skeletons.
    const skeletons=new Set();model.traverse(o=>{if(o.skeleton)skeletons.add(o.skeleton);});
    skeletons.forEach(s=>s.dispose());model.removeFromParent();
  }
  function canInteract(){
    if(disposed)return false;
    for(let ancestor=root;ancestor;ancestor=ancestor.parent)if(!ancestor.visible)return false;
    return true;
  }
  function attach(record,model){
    let pose,body,shadow,cues;
    try{
    let stageStart=onLoadTiming?loadClock():0;
    pose=poseFactory(record.spec.id,model,record.spec);
    reportLoadTiming(onLoadTiming,'pose-create',stageStart,record.spec.id,record.spec.key);
    stageStart=onLoadTiming?loadClock():0;
    pose.update({time:0,dt:0,speed:0,distance:0,moving:0,reduced:true,lighter:false});
    reportLoadTiming(onLoadTiming,'pose-initialize',stageStart,record.spec.id,record.spec.key);
    stageStart=onLoadTiming?loadClock():0;
    model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model,true),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    reportLoadTiming(onLoadTiming,'precise-bounds',stageStart,record.spec.id,record.spec.key);
    stageStart=onLoadTiming?loadClock():0;
    if(![...box.min,...box.max,...size].every(Number.isFinite)||size.y<=0)throw new Error('Companion has invalid bounds.');
    // A pose adapter may preserve the previously fitted span while repairing
    // its quiet wing attitude. Do not make the body grow to fill that pose.
    const fitWidth=Number.isFinite(pose.fitWidth)&&pose.fitWidth>0?pose.fitWidth:size.x;
    const scale=record.spec.span?record.spec.span/fitWidth:record.spec.width?record.spec.width/Math.max(size.x,size.z):record.spec.height/size.y;
    const anchor=pose.anchor?.clone?.()||getPokemonAnchor(record.spec.id,model)||(record.spec.id==='pikachu'?new THREE.Vector3(0,box.min.y,0):new THREE.Vector3(center.x,box.min.y,center.z));
    if(!Number.isFinite(scale)||scale<=0||![...anchor].every(Number.isFinite))throw new Error('Companion has invalid scale or anchor.');
    model.scale.multiplyScalar(scale);model.position.addScaledVector(anchor,-scale);
    model.traverse(object=>{
      if(!object.isMesh)return;object.castShadow=false;object.receiveShadow=true;
      // The controller owns conservative animated bounds. Imported rest-pose
      // mesh spheres must not clip the new wing/tail poses near the viewport.
      if(object.isSkinnedMesh)object.frustumCulled=false;
    });
    body=new THREE.Group();body.name=record.spec.name;body.userData.pokemon=record.spec.key;body.userData.species=record.spec.id;body.add(model);root.add(body);
    body.visible=false;record.presented=false;
    if(record.spec.kind!=='fly'&&record.spec.kind!=='swim'){
      shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.name=`${record.spec.name} contact shadow`;shadow.rotation.x=-Math.PI/2;shadow.scale.set(record.spec.bodyRadius*.8,record.spec.bodyRadius*.65,1);shadow.visible=false;root.add(shadow);
    }
    if(record.spec.kind==='sleep'){cues=createSleepCues();cues.root.visible=false;root.add(cues.root);}
    pose.update({time:record.clock,dt:0,speed:0,distance:0,moving:0,reduced:true,lighter:false});
    record.model=model;record.body=body;record.pose=pose;record.shadow=shadow;record.cues=cues;record.status='ready';
    record.pendingFirstVisibleTiming=Boolean(onLoadTiming);
    reportLoadTiming(onLoadTiming,'attach-finish',stageStart,record.spec.id,record.spec.key);
    }catch(error){
      // Restore source meshes before the caller releases the imported asset.
      // Never publish a partially attached companion to the world controller.
      body?.removeFromParent();shadow?.removeFromParent();cues?.dispose();model.removeFromParent();pose?.dispose();
      throw error;
    }
  }
  function request(record){
    record.status='loading';loading++;
    record.promise=sourceFor(record.spec.id).then(source=>{
      if(disposed||controller.signal.aborted)return;
      let model;
      try{
        const cloneStart=onLoadTiming?loadClock():0;
        model=cloneSkeleton(source);
        reportLoadTiming(onLoadTiming,'clone',cloneStart,record.spec.id,record.spec.key);
        const attachStart=onLoadTiming?loadClock():0;
        attach(record,model);reportLoadTiming(onLoadTiming,'attach-total',attachStart,record.spec.id,record.spec.key);
      }catch(error){releaseClone(model);record.status='error';record.error=error.message;}
    },error=>{if(!disposed){record.status='error';record.error=error.message;}}).finally(()=>{loading--;});
    return record.promise;
  }
  async function prepareRiding({yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){
    // These three static source models require the costly custom ground rigs.
    // Prepare one existing actor of each during genuine loading, keeping their
    // duplicates and every other species under the ordinary proximity policy.
    const startedAt=onLoadTiming?loadClock():0;
    for(const id of ['pikachu','bulbasaur','charmander']){
      if(disposed||controller.signal.aborted)throw new DOMException('Companion preparation cancelled','AbortError');
      const record=records.find(item=>item.spec.id===id);
      if(!record||record.status==='ready'||record.status==='error')continue;
      while(record.status==='idle'&&loading>=2){
        const pending=records.find(item=>item.status==='loading'&&item.promise);
        if(!pending)break;await pending.promise;
        if(disposed||controller.signal.aborted)throw new DOMException('Companion preparation cancelled','AbortError');
      }
      await(record.status==='loading'?record.promise:request(record));
      if(disposed||controller.signal.aborted)throw new DOMException('Companion preparation cancelled','AbortError');
      await yieldControl();
    }
    reportLoadTiming(onLoadTiming,'prepare-riding',startedAt,null);
    return {prepared:records.filter(item=>['pikachu','bulbasaur','charmander'].includes(item.spec.id)&&item.status==='ready').length,errors:records.filter(item=>['pikachu','bulbasaur','charmander'].includes(item.spec.id)&&item.status==='error').map(item=>item.spec.key)};
  }
  function react(key){
    if(!canInteract())return null;
    const record=records.find(r=>r.spec.key===key&&r.status==='ready');
    if(!record)return null;record.reaction=1;return record.spec;
  }
  function nearest(player,maxDistance=13){
    if(!canInteract())return null;
    let result=null,distance=maxDistance;
    for(const record of records){if(record.status!=='ready'||!record.body?.visible)continue;
      const d=Math.hypot(record.body.position.x-player.x,record.body.position.z-player.z);
      if(d<distance){result=record;distance=d;}
    }return result;
  }
  return {
    root,habitats,prepareRiding,
    get audioSources(){
      for(let i=0;i<records.length;i++){
        const record=records[i],source=audioSources[i];
        source.ready=record.status==='ready'&&record.presented&&canInteract();
        if(record.body){source.x=record.body.position.x;source.y=record.body.position.y;source.z=record.body.position.z;}
      }
      return audioSources;
    },
    get summary(){return {loaded:records.filter(r=>r.status==='ready').length,loading,errors:records.filter(r=>r.status==='error').map(r=>r.spec.key),visible:records.filter(r=>r.body?.visible).length,total:records.length};},
    get pickRoots(){return canInteract()?records.filter(r=>r.body?.visible).map(r=>r.body):[];},
    pick(ray){
      if(!canInteract())return null;
      let hit=null,closest=Infinity;
      for(const record of records){
        if(!record.body?.visible)continue;
        sphere.center.copy(record.body.position);sphere.center.y+=record.spec.kind==='fly'?.55:record.spec.height*(record.spec.behavior==='stand-sleep'?.5:.4);
        sphere.radius=record.spec.kind==='fly'?1.8:record.spec.kind==='sleep'?(record.spec.behavior==='stand-sleep'?1.65:1.7):Math.max(.75,Math.min(1.1,record.spec.height*.55));
        if(ray.intersectSphere(sphere,pickPoint)){
          const distance=ray.origin.distanceTo(pickPoint);if(distance<closest){closest=distance;hit={object:record.body,distance};}
        }
      }return hit;
    },
    react,reactNearby(player=latestPlayer){const record=nearest(player);return record?react(record.spec.key):null;},
    update({time=0,reduced=false,lighter=false,camera,player=latestPlayer,active=true}={}){
      if(disposed)return;
      const dt=lastTime===null?0:Math.min(.1,Math.max(0,time-lastTime));lastTime=time;latestPlayer=player;
      if(camera){camera.updateMatrixWorld();matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);}
      if(active){
        while(loading<2){
          let next=null,nearestDistance=Infinity;
          for(const record of records){const distance=record.spec.kind==='fly'?55+record.index*.1:Math.hypot(record.spec.x-player.x,record.spec.z-player.z);
            if(record.status==='idle'&&(record.spec.kind==='fly'||distance<48)&&distance<nearestDistance){next=record;nearestDistance=distance;}
          }
          if(!next)break;request(next);
        }
      }
      for(const record of records){
        if(record.status!=='ready')continue;
        const {spec,body}=record,distance=Math.hypot(spec.x-player.x,spec.z-player.z);
        if(spec.kind==='fly'){
          // Flight time continues across the whole map, including when the bird
          // is offscreen. Culling tests its current position, never its old anchor.
          if(active){
            if(!reduced&&!lighter)record.clock+=dt;
            record.reaction=reduced||lighter?0:Math.max(0,record.reaction-dt*.8);
            const flight=pokemonMotion(spec,record.clock);
            body.position.set(spec.x+flight.x,spec.y+flight.y,spec.z+flight.z);
            // Yaw first, then pitch around the bird's local lateral axis. XYZ
            // pitched around world X and reversed climbs on opposite headings.
            body.rotation.set(flight.pitch||0,flight.heading,reduced||lighter?0:flight.bank,'YXZ');record.presented=true;
          }
          sphere.center.copy(body.position);sphere.radius=9;
          body.visible=record.presented&&(!camera||frustum.intersectsSphere(sphere));
          if(body.visible&&active){
            const visibleStart=record.pendingFirstVisibleTiming?loadClock():0;
            const flight=pokemonMotion(spec,record.clock);record.pose.update({time:record.clock,dt,reduced,lighter,moving:1,speed:flight.speed,turnRate:flight.turnRate,reaction:record.reaction});
            if(record.pendingFirstVisibleTiming){record.pendingFirstVisibleTiming=false;reportLoadTiming(onLoadTiming,'first-visible-update',visibleStart,spec.id,spec.key);}
          }
          continue;
        }
        sphere.center.set(spec.x,spec.y,spec.z);sphere.radius=spec.travel+spec.bodyRadius+2;
        const visible=distance<85&&(!camera||frustum.intersectsSphere(sphere));
        body.visible=visible&&(active||record.presented);if(record.shadow)record.shadow.visible=body.visible;if(record.cues)record.cues.root.visible=body.visible;
        if(!visible||!active)continue;
        const visibleStart=record.pendingFirstVisibleTiming?loadClock():0;
        record.presented=true;
        const animating=active&&!reduced&&!lighter&&distance<62;
        if(animating)record.clock+=dt;
        record.reaction=animating?Math.max(0,record.reaction-dt*.8):0;
        const motion=pokemonMotion(spec,record.clock);
        const px=spec.x+motion.x,pz=spec.z+motion.z,nearDistance=Math.hypot(px-player.x,pz-player.z);
        if(animating&&nearDistance<8&&!record.near)record.reaction=1;
        record.near=nearDistance<10;
        const previousHeading=record.heading;
        record.heading=motion.heading;
        const reaction=animating?Math.sin(record.reaction*Math.PI):0;
        const traveled=record.lastPosition?Math.hypot(px-record.lastPosition.x,pz-record.lastPosition.z):0;
        record.motionDistance+=traveled;record.lastPosition??={x:px,z:pz};record.lastPosition.x=px;record.lastPosition.z=pz;
        const speed=animating?(motion.speed??(dt>0?traveled/dt:0)):0,turnRate=animating?(motion.turnRate??(dt>0?Math.atan2(Math.sin(record.heading-previousHeading),Math.cos(record.heading-previousHeading))/dt:0)):0;
        body.position.set(px,spec.y+motion.y,pz);body.rotation.set(0,record.heading,0);
        if(spec.kind!=='fly'&&spec.kind!=='swim'){
          if(record.shadow)record.shadow.position.set(px,.027,pz);
        }
        record.pose.update({time:record.clock,dt,speed,distance:record.motionDistance,turnRate,acceleration:motion.acceleration??0,reduced:!animating,lighter,moving:motion.moving,reaction});
        if(record.cues)record.cues.update({anchor:record.pose.getSleepAnchor?.(pickPoint)??pickPoint.copy(body.position).addScaledVector(THREE.Object3D.DEFAULT_UP,1.7),time:record.clock,quiet:!animating,camera});
        if(record.pendingFirstVisibleTiming){record.pendingFirstVisibleTiming=false;reportLoadTiming(onLoadTiming,'first-visible-update',visibleStart,spec.id,spec.key);}
      }
    },
    dispose(){if(disposed)return;disposed=true;controller.abort();for(const r of records){r.cues?.dispose();r.pose?.dispose();releaseClone(r.model);}sources.forEach(releaseSource);root.removeFromParent();shadowGeometry.dispose();shadowMaterial.dispose();shadowTexture.dispose();},
  };
}
