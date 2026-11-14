import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createHobbiesRoomScene} from './hobbies-room-architecture.js';
import {hobbiesRoomView,hobbiesEntrancePose} from './hobbies-room-camera.js';
import {personalRoomContent} from './personal-room-content.js';
import {renderAboutStory} from './about-story-reader.js';
import {renderHobbiesStory} from './hobbies-story-reader.js';
import {createAboutRoomScene} from './about-room-architecture.js';
import {aboutRoomView,aboutEntrancePose} from './about-room-camera.js';
import {createCloudRoomScene} from './cloud-room-architecture.js';
import {cloudRoomView,cloudEntrancePose,cloudReelPose} from './cloud-room-camera.js';
import {createListeningRoom} from './listening-room.js';
import {createGarbaRoom} from './garba-room.js';
import {createCloudPhotoGallery} from './cloud-photo-gallery.js';
import {PHOTOGRAPHY_ROLLS} from './photography-rolls.js';
import {getHorizontalNavigation,getBoundaryNavigation,isKeyboardShortcutBlocked,consumeNavigationKey} from './keyboard-navigation.js';

const KINDS=['about','work','music','cloud'];
const paper={about:'#f4f0e5',work:'#f5eedf',music:'#f5e9df',cloud:'#e8f1ef'};
const contentFor=kind=>personalRoomContent(kind==='work'?'memory':kind);
const viewSize=()=>({width:Math.max(1,globalThis.innerWidth||1280),height:Math.max(1,globalThis.innerHeight||720)});
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

/** Comfortable object envelopes remain invisible and add no draw calls. */
export function pickPersonalRoomTarget(room,raycaster){
  if(!room)return null;
  let nearest=null,distance=Infinity;
  const hit=new THREE.Vector3();
  for(const target of room.pickEnvelopes||[]){
    if(!raycaster.ray.intersectBox(target.bounds,hit))continue;
    const candidate=hit.distanceTo(raycaster.ray.origin);
    if(candidate<distance){nearest=target.root;distance=candidate;}
  }
  if(room.photoCamera){
    room.scene.updateMatrixWorld(true);
    const cameraHit=raycaster.intersectObject(room.photoCamera,true)[0];
    if(cameraHit&&cameraHit.distance<distance)return room.photoCamera;
  }
  if(nearest)return nearest;
  room.scene.updateMatrixWorld(true);
  let object=raycaster.intersectObjects(room.pickRoots,true)[0]?.object??null;
  while(object&&object.userData.personalChapter===undefined)object=object.parent;
  return object;
}

/** Stable compositions, with a distinct camera vocabulary for each place. */
export function personalRoomView(kind,index,{width=1280,height=720}={},pan=0,framing=0){
  if(kind==='about')return aboutRoomView(index,{width,height});
  if(kind==='work')return hobbiesRoomView(index,{width,height});
  if(kind==='cloud')return cloudRoomView(index,{width,height,pan,framing});
  index=clamp(Number(index)||0,0,2);const t=index-1;
  let focus,angle,distance,subjectHeight=5.7,lift=.55;
  if(kind==='about'){focus=new THREE.Vector3(t*.34,4.2,.15);angle=t*.14;distance=18;subjectHeight=6.1;}
  else if(kind==='work'){const positions=[[-2.8875,3.4,-1.1375],[0,3.65,-2.45],[2.8875,3.4,-1.1375]];const a=Math.floor(index),b=Math.min(2,a+1);focus=new THREE.Vector3(...positions[a]).lerp(new THREE.Vector3(...positions[b]),index-a);angle=t*.23;distance=11.4;subjectHeight=4.1;}
  else if(kind==='music'){focus=new THREE.Vector3(t*.55,3.2,-.4);angle=t*.25;distance=18.5;subjectHeight=6.0;lift=index>1?.9:.4;}
  else if(kind==='cloud'){focus=new THREE.Vector3(t*3+pan*2.6,4.4+Math.sin(index)*.7,-12);angle=t*.15+pan*.12;distance=23;subjectHeight=7.5;lift=-.4;}
  else throw new Error('Unknown personal room.');
  const top=110,bottom=height-295,available=Math.max(200,bottom-top),fov=39;
  if(kind!=='cloud')distance=Math.max(distance,subjectHeight*height/(2*Math.tan(THREE.MathUtils.degToRad(fov/2))*available));
  const frameHeight=2*distance*Math.tan(THREE.MathUtils.degToRad(fov/2));
  const target=focus.clone();if(kind!=='cloud')target.y-=(height/2-(top+bottom)/2)*frameHeight/height;
  const normal=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
  const position=target.clone().addScaledVector(normal,distance);position.y+=lift;
  return {position,target,normal,fov,aspect:Math.max(1,width)/Math.max(1,height),distance};
}

/** Geometry and lighting only. One room exists at a time; no renderer or RAF. */
export function createPersonalRoomScene(kind){
  if(!KINDS.includes(kind))throw new Error('Unknown personal room.');
  if(kind==='about')return createAboutRoomScene();
  if(kind==='work')return createHobbiesRoomScene();
  if(kind==='cloud')return createCloudRoomScene();
  const scene=new THREE.Scene();scene.background=new THREE.Color(paper[kind]);scene.fog=new THREE.Fog(paper[kind],35,90);
  const camera=new THREE.PerspectiveCamera(39,1,.1,160),geometries=new Set(),materials=new Set(),pickRoots=[],pickEnvelopes=[],animated=[],disposeExtra=[];
  const m=(color,options={})=>{const material=new THREE.MeshStandardMaterial({color,roughness:.88,...options});materials.add(material);return material;};
  const palette={paper:m(paper[kind]),wood:m('#ad7a51'),lightWood:m('#d1ae7e'),forest:m('#536e59'),dark:m('#294638'),stone:m('#ddd5bf'),clay:m('#c88d6a'),white:m('#fff7e7'),amber:m('#d9ad58')};
  function part(parent,geometry,material,position=[0,0,0]){geometries.add(geometry);const object=new THREE.Mesh(geometry,material);object.position.fromArray(position);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;}
  const box=(parent,size,position,material)=>part(parent,new THREE.BoxGeometry(...size),material,position);
  const cylinder=(parent,radius,height,position,material,segments=40)=>part(parent,new THREE.CylinderGeometry(radius,radius,height,segments),material,position);
  function tube(parent,points,radius,material,segments=36){return part(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),segments,radius,6,false),material);}
  function arch(parent,{radius=5,height=5,base=0,z=0,width=.12,material=palette.wood}={}){const points=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI;points.push(new THREE.Vector3(Math.cos(a)*radius,base+Math.sin(a)*height,z));}return tube(parent,points,width,material,48);}
  function batch(parent){parent.updateMatrixWorld(true);const buckets=new Map();for(const child of [...parent.children]){if(!child.isMesh)continue;const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();g.applyMatrix4(child.matrix);if(!buckets.has(child.material))buckets.set(child.material,[]);buckets.get(child.material).push(g);child.removeFromParent();}for(const [material,parts]of buckets){const g=mergeGeometries(parts,false);parts.forEach(item=>item.dispose());if(!g)throw new Error('Personal room geometry could not be batched.');part(parent,g,material);}}
  const architecture=new THREE.Group();scene.add(architecture);
  if(kind!=='cloud'){const floor=cylinder(architecture,30,.12,[0,-.08,0],palette.paper,64);floor.castShadow=false;}
  scene.add(new THREE.HemisphereLight('#fff8e9',kind==='cloud'?'#acc7c9':'#9cae96',2.5));
  const light=new THREE.DirectionalLight('#fff7e6',kind==='cloud'?2.4:3.1);light.position.set(-9,14,13);light.castShadow=kind!=='cloud';light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:50});light.shadow.bias=-.0003;light.shadow.normalBias=.025;scene.add(light,light.target);
  let portrait=null,mementos=null,disposed=false,selection=0;
  function selectRoot(root,index){root.userData.personalChapter=index;pickRoots.push(root);return root;}
  function envelope(root,min,max){pickEnvelopes.push({root,bounds:new THREE.Box3(new THREE.Vector3(...min),new THREE.Vector3(...max))});}
  if(kind==='music'){
    const platform=cylinder(architecture,6.9,.35,[0,.16,0],palette.wood,64);platform.scale.z=.72;cylinder(architecture,6.7,.04,[0,.355,0],palette.lightWood,64).scale.z=.72;
    for(let i=0;i<3;i++)arch(architecture,{radius:6.6-i*.65,height:6.6-i*.45,base:.35,z:-2.2-i*1.3,width:.19,material:i===1?palette.clay:palette.wood});
    const shell=new THREE.Shape();shell.moveTo(-5.4,.35);for(let i=0;i<=40;i++){const a=Math.PI-i/40*Math.PI;shell.lineTo(Math.cos(a)*5.4,.35+Math.sin(a)*5.8);}shell.closePath();part(architecture,new THREE.ShapeGeometry(shell),palette.clay,[0,0,-5]);
    const microphone=selectRoot(new THREE.Group(),0);scene.add(microphone);cylinder(microphone,.56,.12,[0,.46,0],palette.dark,32);cylinder(microphone,.055,3.6,[0,2.3,0],palette.dark,16);const boom=tube(microphone,[new THREE.Vector3(0,4.05,0),new THREE.Vector3(.17,4.12,-.14),new THREE.Vector3(.45,4.15,-.34)],.055,palette.dark,8);const mic=part(microphone,new THREE.CapsuleGeometry(.20,.45,5,14),palette.dark,[.58,4.15,-.43]);mic.rotation.z=-1.1;batch(microphone);
    const performance=selectRoot(new THREE.Group(),1);performance.position.set(-3.6,0,-1.2);scene.add(performance);cylinder(performance,.85,.4,[0,.6,0],palette.clay,32);const stand=box(performance,[1.45,.10,1.15],[0,1.6,0],palette.lightWood);stand.rotation.x=.28;box(performance,[.11,.9,.12],[0,1.1,0],palette.dark);batch(performance);
    const dance=selectRoot(new THREE.Group(),2);dance.position.set(3.65,.43,-1.0);scene.add(dance);for(const [r,mat]of [[1.1,palette.clay],[.72,palette.amber],[.34,palette.wood]]){const ring=part(dance,new THREE.TorusGeometry(r,.055,5,48),mat);ring.rotation.x=-Math.PI/2;}batch(dance);
    envelope(microphone,[-.65,.35,-.9],[1.0,4.6,.7]);envelope(performance,[-4.6,.35,-2.1],[-2.6,1.95,-.3]);envelope(dance,[2.4,.25,-2.25],[4.9,.8,.25]);
    for(let i=0;i<7;i++){const bar=box(scene,[.19,.8+Math.sin(i*1.1)**2*.8,.13],[-1.5+i*.5,2.5,-4.84],palette.dark);animated.push({root:bar,y:bar.position.y,scaleY:bar.scale.y});}
  }
  batch(architecture);
  return {scene,camera,pickRoots,pickEnvelopes,portrait,
    select(index){selection=clamp(index,0,2);if(mementos){mementos.select(selection);mementos.update(0,true,true);}if(kind==='about')animated.forEach((item,i)=>{item.root.position.y=item.y+(i===selection?.15:0);});},
    animateSound(time,active,reduced){if(kind!=='music')return false;for(let i=0;i<animated.length;i++)animated[i].root.scale.y=active&&!reduced?.65+Math.abs(Math.sin(time*7+i*.8))*.7:1;return active&&!reduced;},
    dispose(){if(disposed)return;disposed=true;disposeExtra.forEach(fn=>fn());geometries.forEach(g=>g.dispose());materials.forEach(mat=>mat.dispose());light.shadow.dispose();scene.clear();},
    get resourceCounts(){let meshes=0,triangles=0;scene.traverse(object=>{if(object.isMesh){meshes++;triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;}});return {meshes,triangles,ownedGeometries:geometries.size,materials:materials.size};}
  };
}

/** Explicitly a sound sketch, using the same notes as the existing Music reader. */
function createSoundSketch(onState){
  let context=null,voices=[],timer=null,request=0,playing=false;
  function stop(){request++;clearTimeout(timer);for(const voice of voices){try{voice.stop();}catch{}}voices=[];playing=false;onState(false);}
  return {async play(){stop();const token=request;try{context??=new(globalThis.AudioContext||globalThis.webkitAudioContext)();await context.resume();if(token!==request||context.state!=='running')return;playing=true;onState(true);const now=context.currentTime;for(const [i,note]of [0,1,2,1,0,2,1,0].entries()){const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.value=[261.63,329.63,392][note];gain.gain.setValueAtTime(0,now+i*.3);gain.gain.linearRampToValueAtTime(.07,now+i*.3+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.3+.65);oscillator.connect(gain);gain.connect(context.destination);oscillator.onended=()=>{gain.disconnect();oscillator.disconnect();};oscillator.start(now+i*.3);oscillator.stop(now+i*.3+.7);voices.push(oscillator);}timer=setTimeout(stop,2900);}catch{if(token!==request)return;stop();onState(false,'Sound is unavailable here. The story is still available.');}},stop,dispose(){stop();context?.close().catch(()=>{});context=null;},get playing(){return playing;}};
}

export function createPersonalRooms({renderer,onOpen=()=>{},onClose=()=>{},onPortfolio=()=>{},onWorks=()=>{},onOakLab=()=>{},onPlace=null,onSoundState=()=>{},isReduced=()=>false}={}){
  if(!renderer?.domElement)throw new Error('Personal rooms require the existing renderer.');
  const dialog=document.createElement('dialog');dialog.id='personal-experience';dialog.setAttribute('aria-labelledby','personal-room-title');
  dialog.innerHTML=`<div class="personal-shell"><div class="personal-canvas" tabindex="0" role="region" aria-label="Explore this place with the objects or the story buttons."></div><div class="about-object-prompts" hidden><button type="button" data-about-object="0">Pull up a chair</button><button type="button" data-about-object="1">Open the notebook</button><button type="button" data-about-object="2">Open the shutters</button></div><div class="personal-curtain" aria-hidden="true"></div><header class="personal-header"><div><p class="personal-eyebrow" data-personal-eyebrow></p><h1 id="personal-room-title"></h1></div><nav aria-label="Place navigation"><button type="button" data-personal-places>Other places</button><span class="mode-switch" data-mode-switch data-personal-portfolio>Portfolio / Play</span><button type="button" data-personal-back>Back to garden</button></nav></header><section class="personal-caption" aria-labelledby="personal-chapter-title"><p class="personal-number" data-personal-number></p><h2 id="personal-chapter-title"></h2><p data-personal-body></p><nav class="personal-chapters" aria-label="Explore the stories" data-personal-chapters></nav><div class="personal-actions"><button type="button" data-about-interact hidden>Pull up a chair</button><button type="button" data-personal-story>Read the story</button><button type="button" data-personal-media hidden>View photographs</button><button type="button" data-personal-recording hidden>Watch singing clip</button><button type="button" data-personal-works>Explore my work</button><span class="personal-sound-actions" hidden><button type="button" data-personal-play>Play sound sketch</button><button type="button" data-personal-stop disabled>Stop</button></span><span class="personal-sky-actions" hidden><button type="button" data-personal-pan="-1">Frame left</button><button type="button" data-personal-pan="1">Frame right</button><button type="button" data-personal-capture>Keep this view</button></span></div><p class="personal-scene-note" data-personal-scene-note></p></section><p class="personal-status" data-personal-status role="status" aria-live="polite"></p><button type="button" class="personal-retry" data-personal-retry hidden>Retry portrait</button><section class="personal-reading" aria-labelledby="personal-story-title" hidden><header><p class="personal-eyebrow">A LITTLE MORE OF THE STORY</p><button type="button" data-personal-story-close>Back to the room</button></header><article data-personal-article></article></section><section class="personal-media" aria-labelledby="personal-media-title" hidden><header><h2 id="personal-media-title"></h2><div><a data-personal-download hidden download="lakshya-illustrated-sky.png">Download view</a><button type="button" data-personal-zoom aria-pressed="false">Zoom photograph</button><button type="button" data-personal-media-close>Back to the room</button></div></header><figure><img data-personal-image alt=""><video data-personal-video controls preload="none" playsinline hidden aria-label="Lakshya’s singing recording" aria-describedby="personal-media-caption"></video><figcaption id="personal-media-caption" data-personal-media-caption></figcaption><p data-personal-recording-status role="status" hidden></p></figure><nav data-personal-media-nav aria-label="Choose photograph"></nav></section><section class="personal-places" aria-labelledby="personal-places-title" hidden><header><h2 id="personal-places-title">A different side of Lakshya.</h2><button type="button" data-personal-places-close>Back to the room</button></header><div data-personal-place-list></div></section></div>`;
  document.body.append(dialog);
  const q=selector=>dialog.querySelector(selector),host=q('.personal-canvas'),shell=q('.personal-shell'),curtain=q('.personal-curtain'),header=q('.personal-header'),caption=q('.personal-caption'),reading=q('.personal-reading'),mediaView=q('.personal-media'),places=q('.personal-places');
  const listeners=[];function listen(element,type,fn){element.addEventListener(type,fn);listeners.push(()=>element.removeEventListener(type,fn));}
  let curtainOpen=0;
  let kind='about',selected=0,currentIndex=0,pan=0,currentPan=0,phase='closed',room=null,dead=false,dirty=true,transition=null,previousFocus=null,previousHost=null,previousSibling=null,previousStyle='',savedRenderer=null,lastSubFocus=null,texture=null,imageController=null,imageGeneration=0,renderedFrames=0,elapsed=0,hover=null,pressed=null,soundError='',photoLoading=false,postcard=null,captureGeneration=0,capturePending=false,mediaKind='photograph';
  let aboutEntranceProgress=1,queuedAboutSelection=null,interactionMoving=false,mediaIndex=0,mediaReturn=null;
  let listeningRoom=null,garbaRoom=null,hobbySiblings=[],hobbyReaderReturn=null;
  let cloudGallery=null,cloudSiblings=[],photoEntryProgress=0,pendingPhotoEntry=false;
  function activeHobbyRoom(){return listeningRoom?.isOpen?listeningRoom:garbaRoom?.isOpen?garbaRoom:null;}
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),anchorProjection=new THREE.Vector3();
  const aboutPrompts=q('.about-object-prompts'),aboutAction=q('[data-about-interact]'),photoRetry=q('[data-personal-retry]'),recordingVideo=q('[data-personal-video]');
  const aboutLabels=[['Pull up a chair','Tuck the chair back'],['Open the notebook','Close the notebook'],['Open the shutters','Close the shutters']];
  const hobbiesLabels=[['Enter the listening room','Enter the listening room'],['Enter the Garba courtyard','Enter the Garba courtyard']];
  const cloudLabels=[['Open cloud reel','Open cloud reel'],['Open photography reel','Open photography reel']];
  function isSpatial(){return kind==='about'||kind==='work'||kind==='cloud';}
  function actionLabels(){return kind==='work'?hobbiesLabels:kind==='cloud'?cloudLabels:aboutLabels;}
  // The sketch uses Web Audio rather than an HTML media element. Publish its
  // state before starting any oscillator so the shared soundtrack can yield.
  const sound=createSoundSketch((playing,error)=>{onSoundState(playing);q('[data-personal-stop]').disabled=!playing;q('[data-personal-play]').textContent=playing?'Play again':'Play sound sketch';soundError=error||'';dirty=true;updateStatus();});
  let profile=null,profileTime=0;if(globalThis.location&&new URLSearchParams(globalThis.location.search).get('personalProfile')==='1'){profile=document.createElement('details');profile.className='personal-profile';profile.innerHTML='<summary>Place diagnostics</summary><pre></pre>';shell.append(profile);}
  function node(tag,text,parent,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;parent.append(el);return el;}
  function setPhase(value){
    phase=value;dialog.dataset.phase=value;
    aboutPrompts.hidden=kind==='work'||!isSpatial()||!['viewing','focusing'].includes(value);
    photoRetry.inert=['reading','media','places'].includes(value);
    const hobbyBusy=kind==='work'&&!['viewing','focusing'].includes(value);
    aboutAction.disabled=hobbyBusy;q('[data-personal-story]').disabled=hobbyBusy;
    syncCloudControls();
  }
  function syncCloudControls(){
    const framing=false;
    q('.personal-sky-actions').hidden=!framing;
    q('[data-personal-capture]').disabled=!framing||phase!=='viewing'||(room?.getViewFraming?.()||0)<.999||capturePending;
  }
  function updateStatus(){q('[data-personal-status]').textContent=soundError||(capturePending?'Preparing your illustrated view…':photoLoading?'Loading Lakshya’s portrait…':'');}
  function clearPhoto(){imageGeneration++;imageController?.abort();imageController=null;photoLoading=false;if(room?.portrait)room.portrait.material.map=null;texture?.dispose();texture=null;}
  function loadPortrait(){
    if(kind!=='about'||!room.portrait)return;photoRetry.hidden=true;const item=contentFor(kind).media.find(item=>item.type==='image');if(!item)return;
    const generation=++imageGeneration,controller=new AbortController();imageController=controller;photoLoading=true;updateStatus();const image=new Image();image.decoding='async';
    const abort=()=>{image.onload=null;image.onerror=null;image.src='';};controller.signal.addEventListener('abort',abort,{once:true});
    image.onload=()=>{controller.signal.removeEventListener('abort',abort);if(dead||controller.signal.aborted||generation!==imageGeneration||kind!=='about'||!room?.portrait)return;const next=new THREE.Texture(image);next.colorSpace=THREE.SRGBColorSpace;next.needsUpdate=true;next.anisotropy=Math.min(4,renderer.capabilities?.getMaxAnisotropy?.()||1);texture=next;room.portrait.material.map=next;room.portrait.material.color.set('#ffffff');room.portrait.material.needsUpdate=true;photoLoading=false;dirty=true;updateStatus();};
    image.onerror=()=>{if(generation!==imageGeneration)return;photoLoading=false;soundError='The portrait could not load. Lakshya’s story is still available.';photoRetry.hidden=false;updateStatus();};image.src=new URL('../'+item.src.replace(/^\.\//,''),import.meta.url).href;
  }
  function setContent(){
    if(kind==='cloud'&&room?.photoCamera)room.photoCamera.userData.personalChapter=selected;
    q('[data-personal-place-list]').querySelectorAll('[data-personal-destination]').forEach(button=>{
      const current=button.dataset.personalDestination===kind;
      button.textContent=(typeof onPlace==='function'&&!current?'Ride to ':'')+button.dataset.personalDestinationLabel;
      if(current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    const content=contentFor(kind),chapter=content.chapters[selected];dialog.dataset.kind=kind;dialog.style.setProperty('--personal-paper',paper[kind]);q('[data-personal-eyebrow]').textContent=content.eyebrow;q('#personal-room-title').textContent=content.title;q('#personal-chapter-title').textContent=chapter.title;q('[data-personal-body]').textContent=chapter.body;q('[data-personal-number]').textContent=`${String(selected+1).padStart(2,'0')} / ${String(content.chapters.length).padStart(2,'0')}`;
    const nav=q('[data-personal-chapters]');if(nav.dataset.kind!==kind){nav.replaceChildren();content.chapters.forEach((entry,index)=>{const button=node('button',entry.label,nav);button.type='button';button.dataset.personalChapter=String(index);});nav.dataset.kind=kind;}
    nav.querySelectorAll('button').forEach((button,index)=>button.setAttribute('aria-pressed',String(index===selected)));
    const media=content.media.filter(item=>item.type==='image');q('[data-personal-media]').hidden=kind==='work'||media.length===0;q('[data-personal-media]').textContent=kind==='cloud'?'Look through the camera':media.length===1?'View photograph':'View photographs';q('[data-personal-story]').textContent=kind==='work'?`About ${chapter.label}`:'Read the story';q('[data-personal-story]').hidden=kind==='cloud';q('[data-personal-recording]').hidden=true;q('[data-personal-recording]').textContent='Enter the listening room';q('[data-personal-works]').hidden=kind!=='about';q('.personal-sound-actions').hidden=kind!=='music';q('.personal-sky-actions').hidden=kind!=='cloud';
    q('[data-personal-scene-note]').textContent=kind==='cloud'?'Click the camera or press Enter · A / D chooses a reel · Esc returns to the garden':`A/D or Left/Right to explore · Enter to interact · Esc to return.${kind==='music'?' Sound sketch, not a recording of my voice.':''}`;
    host.setAttribute('aria-label',`${content.title}. A and D or Left and Right choose a story. Enter interacts with the selected object. Escape returns.`);host.setAttribute('aria-keyshortcuts','A D ArrowLeft ArrowRight Home End Enter Escape');aboutAction.classList.toggle('primary',kind==='work');aboutAction.hidden=!isSpatial()||kind==='cloud';aboutPrompts.hidden=kind==='work'||!isSpatial()||!['viewing','focusing'].includes(phase);syncAboutActions();updateStatus();dirty=true;
  }
  function syncAboutActions(){
    if(!isSpatial()||!room)return;
    const active=room.interactionState(selected);aboutAction.textContent=actionLabels()[selected][Number(active)];if(kind==='work'||kind==='cloud')aboutAction.removeAttribute('aria-pressed');else aboutAction.setAttribute('aria-pressed',String(active));
    aboutPrompts.querySelectorAll('button').forEach((button,index)=>{const labels=actionLabels()[index];button.hidden=!labels||index!==selected;if(!labels){button.textContent='';button.removeAttribute('aria-pressed');return;}button.textContent=labels[Number(room.interactionState(index))];if(kind==='work'||kind==='cloud')button.removeAttribute('aria-pressed');else button.setAttribute('aria-pressed',String(room.interactionState(index)));});
    syncCloudControls();
  }
  function restoreCloudHost(){
    shell.classList.remove('has-cloud-gallery');
    for(const [element,inert]of cloudSiblings)element.inert=inert;
    cloudSiblings=[];
    dialog.removeAttribute('aria-label');dialog.setAttribute('aria-labelledby','personal-room-title');
  }
  function releaseCloudGallery(){pendingPhotoEntry=false;cloudGallery?.close({notify:false});restoreCloudHost();}
  function applyPhotoEntry(progress){
    photoEntryProgress=clamp(progress,0,1);const view=cloudReelPose(selected,viewSize(),photoEntryProgress);
    room.camera.position.copy(view.position);room.camera.fov=view.fov;room.camera.aspect=view.aspect;room.camera.lookAt(view.target);room.camera.updateProjectionMatrix();room.camera.updateMatrixWorld(true);dirty=true;
  }
  function finishPhotoReturn(){
    photoEntryProgress=0;transition=null;setContent();settle();q('[data-personal-media]').focus({preventScroll:true});
  }
  function returnFromPhotos(info){
    restoreCloudHost();if(Number.isInteger(info?.roll))selected=info.roll;room.select(selected);currentIndex=selected;
    caption.hidden=true;setPhase('photo-return');transition={kind:'photo-return',elapsed:0,duration:isReduced()?0:.75,from:photoEntryProgress};
    if(isReduced()){finishPhotoReturn();return;}applyPhotoEntry(photoEntryProgress);host.focus({preventScroll:true});
  }
  function revealPhotoReel(){
    transition=null;
    cloudGallery??=createCloudPhotoGallery({host:shell,collections:PHOTOGRAPHY_ROLLS,isReduced,onClose:returnFromPhotos});
    cloudGallery.open(undefined,{roll:selected});
    cloudSiblings=[...shell.children].filter(element=>!element.classList.contains('cloud-photo-gallery')).map(element=>[element,element.inert]);
    for(const [element]of cloudSiblings)element.inert=true;
    shell.classList.add('has-cloud-gallery');
    dialog.removeAttribute('aria-labelledby');dialog.setAttribute('aria-label','Lakshya’s photography reels');
    setPhase('cloud-gallery');return true;
  }
  function enterCloudGallery(){
    if(kind!=='cloud'||!['viewing','focusing','reading'].includes(phase))return false;
    // Complete the current move before beginning the viewfinder approach.
    // Settling here would snap to the newly selected camera angle.
    if(phase==='focusing'){pendingPhotoEntry=true;return true;}
    pendingPhotoEntry=false;
    sound.stop();clearRecording();hideSubViews();settle();caption.hidden=true;photoEntryProgress=0;
    setPhase('photo-enter');host.focus({preventScroll:true});
    if(isReduced()){applyPhotoEntry(1);return revealPhotoReel();}
    transition={kind:'photo-enter',elapsed:0,duration:1.05};applyPhotoEntry(0);return true;
  }
  function restoreHobbyHost(){
    shell.classList.remove('has-hobby-room');
    for(const [element,inert]of hobbySiblings)element.inert=inert;
    hobbySiblings=[];
    dialog.removeAttribute('aria-label');
    dialog.setAttribute('aria-labelledby','personal-room-title');
  }
  function releaseHobbyRoom(){
    hobbyReaderReturn=null;
    listeningRoom?.close({immediate:true,notify:false});
    garbaRoom?.close({immediate:true,notify:false});
    restoreHobbyHost();
  }
  function enterListening(){return enterHobbyRoom('listening');}
  function enterHobbyRoom(destination){
    if(dead||activeHobbyRoom()||!['viewing','focusing'].includes(phase))return false;
    const isGarba=destination==='garba';
    if(!['listening','garba'].includes(destination)||kind!=='work'||selected!==(isGarba?1:0))return false;
    const returnFocus=document.activeElement;
    sound.stop();clearRecording();settle();
    try{
      const options={renderer,container:shell,isReduced,
        onClose(){
          restoreHobbyHost();setPhase('viewing');caption.hidden=false;resize();dirty=true;
          if(hobbyReaderReturn){const previous=hobbyReaderReturn;hobbyReaderReturn=null;reading.hidden=false;host.inert=true;header.inert=true;caption.inert=true;setPhase('reading');reading.scrollTop=previous.scroll;lastSubFocus=previous.roomFocus;}
        },
        onPortfolio(){close({immediate:true,notify:false});onPortfolio();}
      };
      const child=isGarba?(garbaRoom??=createGarbaRoom(options)):(listeningRoom??=createListeningRoom(options));
      const returnLabel=hobbyReaderReturn?`Back to ${contentFor(kind).chapters[selected].label} story`:'Back to Hobbies';
      child.open({returnFocus:returnFocus?.isConnected?returnFocus:aboutAction,returnLabel});
      const childId=isGarba?'garba-experience':'listening-experience';
      hobbySiblings=[...shell.children].filter(element=>element.id!==childId).map(element=>[element,element.inert]);
      for(const [element]of hobbySiblings)element.inert=true;
      shell.classList.add('has-hobby-room');
      dialog.removeAttribute('aria-labelledby');dialog.setAttribute('aria-label',isGarba?'Garba courtyard':'Listening Room');
      setPhase(destination);
      return true;
    }catch(error){
      releaseHobbyRoom();settle();soundError=`The ${isGarba?'Garba courtyard':'listening room'} couldn’t open. You can still read the story.`;updateStatus();
      aboutAction.focus({preventScroll:true});console.warn('Hobby destination entry failed.',error);return false;
    }
  }
  function interactAbout(index=selected){
    if(!isSpatial()||!['viewing','focusing'].includes(phase))return false;
    if(index!==selected){selectChapter(index);return true;}
    if(kind==='work'&&index===0)return enterListening();
    if(kind==='work'&&index===1)return enterHobbyRoom('garba');
    if(kind==='cloud')return enterCloudGallery();
    room.interact(index);syncAboutActions();dirty=true;return true;
  }
  function projectAboutPrompts(){
    if(!isSpatial()||!room?.anchors)return;
    const {width,height}=viewSize();
    aboutPrompts.querySelectorAll('button').forEach((button,index)=>{
      const anchor=room.anchors[index]?.position;if(!anchor){button.hidden=true;return;}
      anchorProjection.copy(anchor).project(room.camera);const x=(anchorProjection.x+1)*width/2,y=(1-anchorProjection.y)*height/2;
      button.hidden=index!==selected||phase!=='viewing'||anchorProjection.z>1||x<100||x>width-100||y<115||y>height-250;
      button.style.left=`${x}px`;button.style.top=`${y}px`;
    });
  }
  function applyAboutEntrance(progress){
    aboutEntranceProgress=clamp(progress,0,1);const view=(kind==='work'?hobbiesEntrancePose:kind==='cloud'?cloudEntrancePose:aboutEntrancePose)(0,viewSize(),aboutEntranceProgress);
    room.camera.fov=view.fov;room.camera.aspect=view.aspect;room.camera.position.copy(view.position);room.camera.lookAt(view.target);room.camera.updateProjectionMatrix();room.camera.updateMatrixWorld(true);room.setEntrance(aboutEntranceProgress,view);dirty=true;
  }
  function applyCamera(index,{approach=0,panValue=currentPan,travel=0}={}){
    if(isSpatial()){room.setEntrance(1);approach=0;travel=0;}
    const view=personalRoomView(kind,index,viewSize(),panValue,room.getViewFraming?.()||0);room.camera.fov=view.fov;room.camera.aspect=view.aspect;room.camera.position.copy(view.position).addScaledVector(view.normal,approach);room.camera.position.y+=Math.sin(travel*Math.PI)*.2;room.camera.lookAt(view.target);room.camera.updateProjectionMatrix();room.camera.updateMatrixWorld(true);dirty=true;
  }
  function revealCurtain(openness){
    curtainOpen=clamp(openness,0,1);
    curtain.style.setProperty('--room-reveal',String(curtainOpen));
  }
  function settle(){transition=null;currentIndex=selected;currentPan=pan;aboutEntranceProgress=1;applyCamera(selected);revealCurtain(1);setPhase('viewing');caption.hidden=false;if(isSpatial()&&queuedAboutSelection!==null){const next=queuedAboutSelection;queuedAboutSelection=null;if(next!==selected)selectChapter(next);}}
  function hideSubViews(){clearRecording();reading.hidden=true;mediaView.hidden=true;places.hidden=true;host.inert=false;header.inert=false;caption.inert=false;}
  function closeSubView(focus=true){
    if(!['reading','media','places'].includes(phase))return false;
    if(phase==='media'&&mediaReturn){
      const previous=mediaReturn;mediaReturn=null;hideSubViews();reading.hidden=false;
      host.inert=true;header.inert=true;caption.inert=true;setPhase('reading');
      reading.scrollTop=previous.scroll;lastSubFocus=previous.roomFocus;
      if(focus)(previous.focus?.isConnected&&!previous.focus.disabled&&!previous.focus.closest?.('[hidden],[inert]')?previous.focus:q('[data-personal-story-close]')).focus({preventScroll:true});
      return true;
    }
    mediaReturn=null;hideSubViews();settle();if(focus){const target=lastSubFocus?.isConnected&&!lastSubFocus.disabled&&!lastSubFocus.closest?.('[hidden],[inert]')?lastSubFocus:q('[data-personal-story]');target.focus({preventScroll:true});}return true;
  }
  function showSubView(next,element,focus){pendingPhotoEntry=false;lastSubFocus=document.activeElement;sound.stop();settle();hideSubViews();element.hidden=false;host.inert=true;header.inert=true;caption.inert=true;setPhase(next);focus.focus({preventScroll:true});}
  function selectChapter(value){
    if(phase==='closed'||phase==='returning'||phase==='photo-enter'||phase==='photo-return'||cloudGallery?.isOpen)return false;pendingPhotoEntry=false;if(isSpatial()&&phase==='entering'){queuedAboutSelection=clamp(Math.round(value),0,contentFor(kind).chapters.length-1);return true;}closeSubView(false);const next=clamp(Math.round(value),0,contentFor(kind).chapters.length-1);selected=next;pan=0;room.select(selected);if(isSpatial()&&!(kind==='cloud'&&selected===1)&&!room.interactionState(selected))room.interact(selected);setContent();
    if(isReduced()){settle();return true;}transition={kind:'focus',from:currentIndex,to:selected,fromPan:currentPan,toPan:pan,elapsed:0,duration:kind==='cloud'?.85+Math.abs(next-currentIndex)*.35:.85};setPhase('focusing');return true;
  }
  function frameSky(direction){if(kind!=='cloud'||!['viewing','focusing'].includes(phase))return;pan=clamp(pan+direction*.45,-1,1);if(isReduced()){settle();return;}transition={kind:'focus',from:currentIndex,to:selected,fromPan:currentPan,toPan:pan,elapsed:0,duration:.65};setPhase('focusing');}
  function readStory(){
    const content=contentFor(kind),chapter=content.chapters[selected],article=q('[data-personal-article]');
    article.replaceChildren();article.className='';
    if(kind==='about')renderAboutStory(article,content,selected);
    else if(kind==='work')renderHobbiesStory(article,content,selected);
    else{node('p',content.eyebrow,article,'personal-eyebrow');const title=node('h1',chapter.title,article);title.id='personal-story-title';if(isSpatial()){node('p',chapter.body,article,'personal-deck');node('p',chapter.detail,article);}else{node('p',content.intro,article,'personal-deck');node('p',chapter.body,article);node('p',chapter.detail,article);}if(content.mediaNote)node('p',content.mediaNote,article,'personal-media-note');}
    q('[data-personal-story-close]').textContent=kind==='work'?'Back to Hobbies':'Back to the room';
    showSubView('reading',reading,q('[data-personal-story-close]'));reading.scrollTop=0;
  }
  function readAboutChapter(index){
    const returnFocus=lastSubFocus;selectChapter(index);readStory();lastSubFocus=returnFocus;
    q(`[data-about-story="${selected}"]`)?.focus({preventScroll:true});
  }
  function readHobbyChapter(index){
    const returnFocus=lastSubFocus;selectChapter(index);readStory();lastSubFocus=returnFocus;
    q(`[data-hobby-story="${selected}"]`)?.focus({preventScroll:true});
  }
  function zoomPhoto(zoomed){mediaView.classList.toggle('is-zoomed',zoomed);q('[data-personal-zoom]').setAttribute('aria-pressed',String(zoomed));q('[data-personal-zoom]').textContent=(zoomed?'Fit ':'Zoom ')+mediaKind;mediaView.scrollTop=0;}
  function clearRecording(){
    // Removing the source and reloading releases a native media download and
    // prevents audio from continuing behind another room or the garden.
    if(recordingVideo.getAttribute('src')){recordingVideo.pause?.();recordingVideo.removeAttribute('src');recordingVideo.removeAttribute('poster');recordingVideo.load?.();}
    recordingVideo.hidden=true;q('[data-personal-recording-status]').hidden=true;
  }
  function showRecording(){
    const recording=contentFor(kind).recording;if(!recording||!['viewing','focusing'].includes(phase))return;
    showSubView('media',mediaView,q('[data-personal-media-close]'));
    mediaView.dataset.mediaCollection='video';mediaKind='recording';zoomPhoto(false);
    q('#personal-media-title').textContent=recording.caption||'A singing recording';
    q('[data-personal-image]').hidden=true;q('[data-personal-image]').removeAttribute('src');
    q('[data-personal-zoom]').hidden=true;q('[data-personal-download]').hidden=true;
    q('[data-personal-media-nav]').hidden=true;q('[data-personal-media-nav]').replaceChildren();
    q('[data-personal-media-caption]').textContent=recording.description||recording.caption||'';
    recordingVideo.width=recording.width;recordingVideo.height=recording.height;
    recordingVideo.setAttribute('poster',new URL('../'+recording.poster.replace(/^\.\//,''),import.meta.url).href);
    recordingVideo.setAttribute('src',new URL('../'+recording.src.replace(/^\.\//,''),import.meta.url).href);
    recordingVideo.setAttribute('aria-label',recording.caption||'Lakshya’s singing recording');
    recordingVideo.hidden=false;
    // The browser's Play control owns playback. Opening the viewer never starts sound.
  }
  function showMedia(index=0){
    if(kind==='cloud')return enterCloudGallery();
    const content=contentFor(kind);
    const items=content.media.filter(item=>item.type==='image'&&(kind!=='work'||content.chapters[selected].photoIds.includes(item.id)));
    index=clamp(index,0,items.length-1);const item=items[index];if(!item)return;mediaIndex=index;
    if((kind==='about'||kind==='work')&&phase==='reading')mediaReturn={scroll:reading.scrollTop,focus:document.activeElement,roomFocus:lastSubFocus};
    else if(phase!=='media')mediaReturn=null;
    q('[data-personal-media-close]').textContent=mediaReturn?(kind==='work'?`Back to ${content.chapters[selected].label} story`:'Back to the story'):(kind==='work'?'Back to Hobbies':'Back to the room');
    clearRecording();q('[data-personal-image]').hidden=false;q('[data-personal-zoom]').hidden=kind==='work';mediaView.dataset.mediaCollection=items.length>1?'photos':'single';
    mediaKind='photograph';q('[data-personal-download]').hidden=true;q('#personal-media-title').textContent=kind==='work'?`${content.chapters[selected].label} photographs`:content.title;const image=q('[data-personal-image]');image.src=new URL('../'+item.src.replace(/^\.\//,''),import.meta.url).href;image.width=item.width;image.height=item.height;image.alt=item.alt;image.style.setProperty('--personal-image-width',`${item.width}px`);q('[data-personal-media-caption]').textContent=item.caption;
    const nav=q('[data-personal-media-nav]'),navFocus=document.activeElement?.dataset?.aboutPhotoStep;nav.replaceChildren();nav.hidden=items.length<2;
    if(kind==='about'||kind==='work'){
      const previous=node('button','Previous photograph',nav);previous.type='button';previous.dataset.personalPhoto=String(Math.max(0,index-1));previous.dataset.aboutPhotoStep='previous';previous.disabled=index===0;
      const count=node('span',`${index+1} of ${items.length}`,nav);count.setAttribute('role','status');count.setAttribute('aria-live','polite');
      const next=node('button','Next photograph',nav);next.type='button';next.dataset.personalPhoto=String(Math.min(items.length-1,index+1));next.dataset.aboutPhotoStep='next';next.disabled=index===items.length-1;
    }else items.forEach((photo,i)=>{const button=node('button',photo.caption||`Photograph ${i+1}`,nav);button.type='button';button.dataset.personalPhoto=String(i);button.setAttribute('aria-pressed',String(i===index));});zoomPhoto(false);
    // Keep the original gallery trigger as the return target while browsing.
    // Rebuilt navigation buttons also need their keyboard focus restored.
    if(phase==='media'){
      if((kind==='about'||kind==='work')&&navFocus){const target=nav.querySelector(`[data-about-photo-step="${navFocus}"]`);(target?.disabled?q('[data-personal-media-close]'):target)?.focus({preventScroll:true});}
      else if(kind!=='about'&&kind!=='work')nav.querySelectorAll('button')[index]?.focus({preventScroll:true});
    }
    else showSubView('media',mediaView,q('[data-personal-media-close]'));
  }
  function clearPostcard(){
    captureGeneration++;capturePending=false;q('[data-personal-capture]').disabled=false;
    if(postcard){if(q('[data-personal-image]').getAttribute('src')===postcard.url)q('[data-personal-image]').removeAttribute('src');URL.revokeObjectURL(postcard.url);postcard=null;}
    q('[data-personal-download]').removeAttribute('href');q('[data-personal-download]').hidden=true;
  }
  function showPostcard(){
    if(!postcard)return;clearRecording();q('[data-personal-image]').hidden=false;q('[data-personal-zoom]').hidden=false;mediaView.dataset.mediaCollection='postcard';mediaKind='view';q('#personal-media-title').textContent='Your illustrated sky';
    const image=q('[data-personal-image]');image.src=postcard.url;image.width=postcard.width;image.height=postcard.height;image.alt='An illustrated cloudscape framed in Lakshya’s portfolio.';image.style.setProperty('--personal-image-width',`${postcard.width}px`);
    q('[data-personal-media-caption]').textContent='A view you framed in this illustrated sky. This is a procedural scene, not one of Lakshya’s personal cloud photographs.';
    const download=q('[data-personal-download]');download.href=postcard.url;download.hidden=false;q('[data-personal-media-nav]').replaceChildren();q('[data-personal-media-nav]').hidden=true;zoomPhoto(false);showSubView('media',mediaView,q('[data-personal-media-close]'));
    // Disabling the trigger while exporting can move native focus to the body.
    lastSubFocus=q('[data-personal-capture]');
  }
  function captureSky(){
    if(kind!=='cloud'||selected!==1||phase!=='viewing'||!room.interactionState(1)||room.getViewFraming()<.999||capturePending)return;
    const token=++captureGeneration;capturePending=true;soundError='';q('[data-personal-capture]').disabled=true;updateStatus();
    // Capture in the same task as this draw: the shared drawing buffer may be discarded afterward.
    const canvas=renderer.domElement,width=canvas.width,height=canvas.height;
    const fail=()=>{if(token!==captureGeneration)return;capturePending=false;q('[data-personal-capture]').disabled=false;soundError='This view could not be saved. You can still explore and frame the sky.';updateStatus();};
    try{
      renderer.render(room.scene,room.camera);renderedFrames++;dirty=false;
      canvas.toBlob(blob=>{
        if(dead||token!==captureGeneration||kind!=='cloud'||phase==='closed'||phase==='returning')return;
        if(!blob){fail();return;}
        let url;try{url=URL.createObjectURL(blob);}catch{fail();return;}
        if(postcard)URL.revokeObjectURL(postcard.url);postcard={url,width,height};capturePending=false;q('[data-personal-capture]').disabled=false;updateStatus();
        if(['viewing','focusing'].includes(phase))showPostcard();
      },'image/png');
    }catch{fail();}
  }
  function snapshotRenderer(){const canvas=renderer.domElement;previousHost=canvas.parentElement;previousSibling=canvas.nextSibling;previousStyle=canvas.getAttribute?.('style')||'';savedRenderer={size:renderer.getSize?.(new THREE.Vector2()),window:viewSize(),ratio:renderer.getPixelRatio?.(),target:renderer.getRenderTarget?.(),viewport:renderer.getViewport?.(new THREE.Vector4()),scissor:renderer.getScissor?.(new THREE.Vector4()),scissorTest:renderer.getScissorTest?.(),autoClear:renderer.autoClear};}
  function restoreRenderer(){
    const saved=savedRenderer;savedRenderer=null;if(previousHost){if(previousSibling?.parentElement===previousHost)previousHost.insertBefore(renderer.domElement,previousSibling);else previousHost.append(renderer.domElement);}else renderer.domElement.remove();renderer.domElement.setAttribute?.('style',previousStyle);
    if(saved){const view=viewSize(),changed=view.width!==saved.window.width||view.height!==saved.window.height;if(saved.ratio!==undefined)renderer.setPixelRatio?.(saved.ratio);if(changed)renderer.setSize?.(view.width,view.height,false);else if(saved.size)renderer.setSize?.(saved.size.x,saved.size.y,false);renderer.setRenderTarget?.(saved.target??null);if(changed){renderer.setViewport?.(0,0,view.width,view.height);renderer.setScissor?.(0,0,view.width,view.height);}else{if(saved.viewport)renderer.setViewport?.(saved.viewport);if(saved.scissor)renderer.setScissor?.(saved.scissor);}if(saved.scissorTest!==undefined)renderer.setScissorTest?.(saved.scissorTest);renderer.autoClear=saved.autoClear;}previousHost=null;previousSibling=null;
  }
  function removeRoom(){releaseCloudGallery();mediaReturn=null;q('[data-personal-article]').replaceChildren();q('[data-personal-image]').removeAttribute('src');releaseHobbyRoom();clearRecording();clearPostcard();clearPhoto();room?.dispose();room=null;}
  function beginKind(next){releaseCloudGallery();mediaReturn=null;q('[data-personal-article]').replaceChildren();q('[data-personal-image]').removeAttribute('src');releaseHobbyRoom();sound.stop();clearRecording();clearPostcard();clearPhoto();room?.dispose();kind=next;room=createPersonalRoomScene(kind);aboutEntranceProgress=isSpatial()?0:1;queuedAboutSelection=null;photoRetry.hidden=true;selected=0;currentIndex=0;pan=0;currentPan=0;soundError='';room.select(0);photoEntryProgress=0;hideSubViews();setContent();curtain.style.setProperty('--room-cover',paper[kind]);revealCurtain(0);setPhase('entering');transition={kind:'entry',elapsed:0,duration:isReduced()?0:isSpatial()?1.25:.8};caption.hidden=isSpatial()&&kind!=='work';loadPortrait();resize();if(isSpatial())applyAboutEntrance(0);else applyCamera(0,{approach:2.8});}
  function open(next='about'){
    if(dead||!KINDS.includes(next))return false;
    pendingPhotoEntry=false;
    if(cloudGallery?.isOpen){releaseCloudGallery();setPhase('viewing');caption.hidden=false;resize();}
    if(activeHobbyRoom()){
      releaseHobbyRoom();setPhase('viewing');caption.hidden=false;dirty=true;
      resize();aboutAction.focus({preventScroll:true});
    }
    if(phase!=='closed'){if(kind===next){closeSubView();return false;}try{onOpen(next);beginKind(next);host.focus({preventScroll:true});update(0);return true;}catch(error){close({immediate:true,notify:true});throw error;}}
    previousFocus=document.activeElement;
    try{onOpen(next);snapshotRenderer();host.append(renderer.domElement);renderer.setRenderTarget?.(null);renderer.setScissorTest?.(false);renderer.autoClear=true;if(savedRenderer.ratio!==undefined)renderer.setPixelRatio?.(Math.min(savedRenderer.ratio,1.5));beginKind(next);dialog.showModal();host.focus({preventScroll:true});update(0);return true;}
    catch(error){sound.stop();removeRoom();if(savedRenderer)restoreRenderer();if(dialog.open)dialog.close();setPhase('closed');onClose();throw error;}
  }
  function completeClose(notify=true){if(phase==='closed')return;sound.stop();transition=null;hideSubViews();removeRoom();restoreRenderer();setPhase('closed');if(dialog.open)dialog.close();hover=null;pressed=null;host.style.cursor='';if(notify){onClose();const containing=previousFocus?.closest?.('dialog');if(previousFocus?.isConnected&&!previousFocus.closest?.('[hidden],[inert]')&&(!containing||containing.open))previousFocus.focus({preventScroll:true});}previousFocus=null;}
  function close({immediate=false,notify=true}={}){pendingPhotoEntry=false;if(phase==='closed')return false;if(cloudGallery?.isOpen)releaseCloudGallery();if(activeHobbyRoom())releaseHobbyRoom();sound.stop();if(immediate||isReduced()){completeClose(notify);return true;}if(phase==='returning')return false;const wasEntering=phase==='entering';hideSubViews();caption.hidden=true;queuedAboutSelection=null;setPhase('returning');if(isSpatial()){const startProgress=wasEntering?aboutEntranceProgress:1;transition={kind:'exit',elapsed:0,duration:.9*Math.max(.08,startProgress),notify,startProgress,curtainFrom:curtainOpen,from:currentIndex,fromPan:currentPan,prelude:wasEntering||(currentIndex<.001&&Math.abs(currentPan)<.001)?0:kind==='cloud'?1.4:.55};}else transition={kind:'exit',elapsed:0,duration:.45,notify,curtainFrom:curtainOpen};return true;}
  function resize(){if(cloudGallery?.isOpen)return;if(activeHobbyRoom()){activeHobbyRoom().resize();return;}if(!room||phase==='closed')return;const view=viewSize();renderer.setSize?.(view.width,view.height,false);renderer.setViewport?.(0,0,view.width,view.height);renderer.setScissorTest?.(false);if(kind==='cloud'&&['photo-enter','photo-return'].includes(phase))applyPhotoEntry(photoEntryProgress);else if(isSpatial()&&(phase==='entering'||phase==='returning'&&aboutEntranceProgress<1))applyAboutEntrance(aboutEntranceProgress);else applyCamera(currentIndex);dirty=true;}
  function pick(event){if(!room)return null;const rect=host.getBoundingClientRect();if(!rect.width||!rect.height)return null;pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);raycaster.setFromCamera(pointer,room.camera);if(kind==='about'&&room.portrait){room.scene.updateMatrixWorld(true);const photo=raycaster.intersectObject(room.portrait)[0],prop=raycaster.intersectObjects(room.pickRoots,true)[0];if(photo&&(!prop||photo.distance<prop.distance))return room.portrait;}return pickPersonalRoomTarget(room,raycaster);}
  function navigateToPlace(destination){
    const next=destination==='memory'?'work':destination==='works'?'projects':destination==='oak'?'music':destination;
    if(phase==='closed'||!['about','projects','work','music','cloud'].includes(next))return false;
    if(next===kind){closeSubView();return false;}
    if(typeof onPlace==='function'){
      // The garden owns travel. Release media, sound and the shared renderer
      // before dispatching its canonical destination, without a second exit.
      close({immediate:true,notify:false});onPlace(next);return true;
    }
    // Standalone/legacy hosts retain their existing direct navigation contract.
    if(next==='projects'||next==='music'){close({immediate:true,notify:false});if(next==='projects')onWorks();else onOakLab();return true;}
    return open(next);
  }
  const placeList=q('[data-personal-place-list]');
  // Match the map's journey order without changing the geometry owners.
  for(const id of ['about','projects','work','oak','cloud']){
    const label=id==='projects'?'The Works Room':id==='oak'?'Professor Oak’s lab':contentFor(id).title;
    const button=node('button',label,placeList);button.type='button';button.dataset.personalDestination=id==='oak'?'music':id;button.dataset.personalDestinationLabel=label;
    if(id==='projects')button.dataset.personalPlaceWorks='';
    else if(id==='oak')button.dataset.personalPlaceOak='';
    else button.dataset.personalRoom=id;
    listen(button,'click',()=>navigateToPlace(id));
  }
  listen(aboutAction,'click',()=>interactAbout());
  for(const button of aboutPrompts.querySelectorAll('button'))listen(button,'click',()=>interactAbout(Number(button.dataset.aboutObject)));
  listen(photoRetry,'click',()=>{const restoreFocus=document.activeElement===photoRetry;soundError='';loadPortrait();if(restoreFocus)q('[data-personal-story]').focus({preventScroll:true});});
  listen(q('[data-personal-places]'),'click',()=>showSubView('places',places,q('[data-personal-places-close]')));
  listen(q('[data-personal-chapters]'),'click',event=>{const button=event.target.closest?.('[data-personal-chapter]');if(button)selectChapter(Number(button.dataset.personalChapter));});
  listen(q('[data-personal-media-nav]'),'click',event=>{const button=event.target.closest?.('[data-personal-photo]');if(button)showMedia(Number(button.dataset.personalPhoto));});
  listen(reading,'click',event=>{
    if(kind==='work'){
      const photo=event.target.closest?.('[data-hobby-photo]');if(photo){showMedia(Number(photo.dataset.hobbyPhoto));return;}
      const story=event.target.closest?.('[data-hobby-story]');if(story){readHobbyChapter(Number(story.dataset.hobbyStory));return;}
      const enter=event.target.closest?.('[data-hobby-enter]');if(enter){const previous={scroll:reading.scrollTop,roomFocus:lastSubFocus};closeSubView(false);hobbyReaderReturn=previous;if(!enterHobbyRoom(enter.dataset.hobbyEnter))hobbyReaderReturn=null;}
      return;
    }
    if(kind!=='about')return;
    const photo=event.target.closest?.('[data-about-photo]');if(photo){showMedia(Number(photo.dataset.aboutPhoto));return;}
    const story=event.target.closest?.('[data-about-story]');if(story){readAboutChapter(Number(story.dataset.aboutStory));return;}
    const destination=event.target.closest?.('[data-about-destination]')?.dataset.aboutDestination;if(!destination)return;
    if(destination.startsWith('story:')){readAboutChapter(Number(destination.split(':')[1]));return;}
    navigateToPlace(destination);
  });
  listen(q('[data-personal-back]'),'click',()=>close());listen(q('[data-personal-portfolio]'),'click',()=>{close({immediate:true,notify:false});onPortfolio();});listen(q('[data-personal-works]'),'click',()=>navigateToPlace('projects'));listen(q('[data-personal-story]'),'click',readStory);listen(q('[data-personal-media]'),'click',()=>showMedia());listen(q('[data-personal-zoom]'),'click',()=>zoomPhoto(q('[data-personal-zoom]').getAttribute('aria-pressed')!=='true'));listen(q('[data-personal-recording]'),'click',enterListening);
  for(const selector of ['[data-personal-story-close]','[data-personal-media-close]','[data-personal-places-close]'])listen(q(selector),'click',()=>closeSubView());
  listen(q('[data-personal-play]'),'click',()=>sound.play());listen(q('[data-personal-stop]'),'click',()=>{const restoreFocus=document.activeElement===q('[data-personal-stop]');sound.stop();if(restoreFocus)q('[data-personal-play]').focus({preventScroll:true});});q('.personal-sky-actions').querySelectorAll('[data-personal-pan]').forEach(button=>listen(button,'click',()=>frameSky(Number(button.dataset.personalPan))));listen(q('[data-personal-capture]'),'click',captureSky);
  listen(dialog,'cancel',event=>{event.preventDefault();if(cloudGallery?.isOpen){cloudGallery.cancel();return;}if(['photo-enter','photo-return'].includes(phase)){if(phase==='photo-enter')returnFromPhotos();return;}if(activeHobbyRoom()){activeHobbyRoom().cancel();return;}if(!closeSubView())close();});
  listen(recordingVideo,'error',()=>{if(!recordingVideo.getAttribute('src'))return;const status=q('[data-personal-recording-status]');status.textContent='This recording couldn’t play here. Return to the room and try again.';status.hidden=false;});
  // Consume one Escape before the native dialog close request can skip a reader level.
  // A native close still needs reconciliation (for example, a platform close request).
  listen(dialog,'close',()=>{if(!dialog.open&&phase!=='closed')completeClose(true);});
  listen(dialog,'keydown',event=>{
    if(activeHobbyRoom()||cloudGallery?.isOpen)return;
    if(['photo-enter','photo-return'].includes(phase)){if(event.key==='Escape'){consumeNavigationKey(event);if(!event.repeat&&phase==='photo-enter')returnFromPhotos();}return;}
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!event.repeat&&!closeSubView())close();return;}
    if(isKeyboardShortcutBlocked(event))return;
    const direction=getHorizontalNavigation(event),boundary=getBoundaryNavigation(event);
    if(kind==='about'&&phase==='reading'&&(direction||boundary&&event.target.closest?.('.about-story-navigation'))){
      consumeNavigationKey(event);const count=contentFor(kind).chapters.length;
      readAboutChapter(boundary==='first'?0:boundary==='last'?count-1:clamp(selected+direction,0,count-1));return;
    }
    if(kind==='work'&&phase==='reading'&&(direction||boundary&&event.target.closest?.('.hobby-story-navigation'))){
      consumeNavigationKey(event);const count=contentFor(kind).chapters.length;
      readHobbyChapter(boundary==='first'?0:boundary==='last'?count-1:clamp(selected+direction,0,count-1));return;
    }
    if(phase==='places'){
      const vertical=!event.repeat?(event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0):0,step=direction||vertical;
      if(step||boundary){
        const choices=[...q('[data-personal-place-list]').querySelectorAll('button')],current=choices.indexOf(document.activeElement);
        const next=boundary==='first'?0:boundary==='last'?choices.length-1:current<0?(step>0?0:choices.length-1):clamp(current+step,0,choices.length-1);
        if(choices[next]){consumeNavigationKey(event);choices[next].focus({preventScroll:true});}
      }return;
    }
    if(phase==='media'&&mediaKind==='photograph'&&mediaView.dataset.mediaCollection!=='postcard'&&(direction||boundary)){
      const count=contentFor(kind).media.filter(item=>item.type==='image').length;
      if(count>1){consumeNavigationKey(event);showMedia(boundary==='first'?0:boundary==='last'?count-1:clamp(mediaIndex+direction,0,count-1));}return;
    }
    if(!['viewing','focusing','entering'].includes(phase))return;
    if(direction||boundary){
      consumeNavigationKey(event);const count=contentFor(kind).chapters.length;
      const next=boundary==='first'?0:boundary==='last'?count-1:clamp((queuedAboutSelection??selected)+direction,0,count-1);
      selectChapter(next);
      // Keep focus and the selected story aligned when browsing its buttons.
      // From the scene or an action, retain that useful Enter target instead.
      if(event.target.closest?.('[data-personal-chapters]'))q(`[data-personal-chapter="${next}"]`)?.focus({preventScroll:true});
    }else if(event.key==='Enter'&&!event.repeat&&event.target===host){
      consumeNavigationKey(event);if(isSpatial()){if(phase!=='entering')interactAbout();}else readStory();
    }
  });
  listen(host,'pointermove',event=>{if(['viewing','focusing'].includes(phase))hover={clientX:event.clientX,clientY:event.clientY};});listen(host,'pointerleave',()=>{hover=null;host.style.cursor='';});listen(host,'pointerdown',event=>{if(event.button===0)pressed={x:event.clientX,y:event.clientY};});listen(host,'pointercancel',()=>{pressed=null;});listen(host,'click',event=>{const moved=pressed&&Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y)>8;pressed=null;if(moved||!['viewing','focusing'].includes(phase))return;const object=pick(event);if(object){if(kind==='about'&&object===room.portrait){showMedia();return;}const index=object.userData.personalChapter;if(isSpatial()&&index===selected)interactAbout(index);else selectChapter(index);}});
  listen(document,'visibilitychange',()=>{if(document.hidden){sound.stop();if(recordingVideo.getAttribute('src'))closeSubView(false);}dirty=true;});if(globalThis.window){listen(window,'blur',()=>{sound.stop();if(recordingVideo.getAttribute('src'))recordingVideo.pause?.();});listen(window,'pagehide',()=>{if(recordingVideo.getAttribute('src'))closeSubView(false);else clearRecording();});}listen(renderer.domElement,'webglcontextlost',()=>close({immediate:true,notify:true}));
  function update(dt){
    if(dead||phase==='closed'||!room)return;dt=clamp(Number(dt)||0,0,.1);profileTime+=dt;
    if(activeHobbyRoom()){
      const child=activeHobbyRoom();child.update(dt);
      if(profile&&profileTime>=.5){profileTime=0;profile.querySelector('pre').textContent=JSON.stringify({place:phase,child:child.diagnostics(),rendererResources:renderer.info?.memory||{}},null,2);}
      return;
    }
    if(profile&&(profileTime>=.5||renderedFrames===0)){profileTime=0;profile.querySelector('pre').textContent=`Place: ${kind} · ${phase}\nRendered frames: ${renderedFrames}\nLast draw: ${renderer.info?.render?.calls??'—'} calls / ${renderer.info?.render?.triangles??'—'} triangles\nPortrait textures: ${texture?1:0}\nScene: ${room.resourceCounts.meshes} meshes\nRenderer resources: ${renderer.info?.memory?.geometries??'—'} geometries / ${renderer.info?.memory?.textures??'—'} textures\n${transition||sound.playing||interactionMoving?'Interaction active':'Idle · render on change'}`;}
    if(document.hidden||['reading','media','places','cloud-gallery'].includes(phase))return;
    if(transition){const t=transition;t.elapsed+=dt;const p=isReduced()||!t.duration?1:Math.min(1,t.elapsed/t.duration),blend=ease(p);
      if(t.kind==='photo-enter'){applyPhotoEntry(blend);if(p===1){revealPhotoReel();return;}}
      else if(t.kind==='photo-return'){applyPhotoEntry(t.from*(1-blend));if(p===1)finishPhotoReturn();}
      else if(t.kind==='entry'){if(isSpatial())applyAboutEntrance(p);else applyCamera(selected,{approach:(1-blend)*2.8});revealCurtain(ease(Math.min(1,p*3)));if(p===1)settle();}
      else if(t.kind==='focus'){currentIndex=THREE.MathUtils.lerp(t.from,t.to,kind==='cloud'?p:blend);currentPan=THREE.MathUtils.lerp(t.fromPan,t.toPan,blend);applyCamera(currentIndex,{approach:Math.sin(p*Math.PI)*.45,panValue:currentPan,travel:p});if(p===1){settle();if(kind==='cloud'&&pendingPhotoEntry){pendingPhotoEntry=false;enterCloudGallery();return;}}}
      else if(isSpatial()){if(t.elapsed<t.prelude&&!isReduced()){currentIndex=THREE.MathUtils.lerp(t.from,0,kind==='cloud'?t.elapsed/t.prelude:ease(t.elapsed/t.prelude));currentPan=THREE.MathUtils.lerp(t.fromPan||0,0,ease(t.elapsed/t.prelude));applyCamera(currentIndex);revealCurtain(1);}else{currentIndex=0;currentPan=0;const exitP=isReduced()?1:clamp((t.elapsed-t.prelude)/t.duration,0,1);applyAboutEntrance(t.startProgress*(1-exitP));revealCurtain(t.curtainFrom*(1-ease(clamp((exitP-.7)/.3,0,1))));if(exitP===1){completeClose(t.notify);return;}}}
      else{applyCamera(currentIndex,{approach:blend*1.7});revealCurtain(t.curtainFrom*(1-blend));if(p===1){completeClose(t.notify);return;}}
    }
    if(hover){host.style.cursor=pick(hover)?'pointer':'';hover=null;}
    if(sound.playing&&!isReduced()){elapsed+=dt;room.animateSound(elapsed,true,false);dirty=true;}else if(dirty)room.animateSound(0,false,true);
    interactionMoving=Boolean(isSpatial()&&room.updateInteraction(dt,isReduced()));if(interactionMoving){if(kind==='cloud'&&['viewing','focusing'].includes(phase)){applyCamera(currentIndex);syncCloudControls();}dirty=true;}
    if(dirty){projectAboutPrompts();renderer.render(room.scene,room.camera);renderedFrames++;dirty=false;}
  }
  return {open,close,update,resize,dispose(){if(dead)return;close({immediate:true,notify:false});dead=true;cloudGallery?.dispose();cloudGallery=null;listeningRoom?.dispose();listeningRoom=null;garbaRoom?.dispose();garbaRoom=null;clearRecording();clearPhoto();sound.dispose();listeners.forEach(off=>off());dialog.remove();},get isOpen(){return phase!=='closed';},get phase(){return phase;},diagnostics(){return {phase,cloudGalleryOpen:Boolean(cloudGallery?.isOpen),cloudPhotoIndex:cloudGallery?.selectedIndex??0,photoEntryProgress,pendingPhotoEntry,photoRoll:cloudGallery?.selectedRoll??selected,listening:listeningRoom?.diagnostics()||null,garba:garbaRoom?.diagnostics()||null,currentKind:kind,currentChapter:selected,aboutEntranceProgress,interactionState:isSpatial()&&room?contentFor(kind).chapters.map((chapter,index)=>room.interactionState(index)):null,renderedFrames,portraitTextures:texture?1:0,photoLoading,postcardURLs:postcard?1:0,capturePending,soundPlaying:sound.playing,resources:room?.resourceCounts||null};}};
}



