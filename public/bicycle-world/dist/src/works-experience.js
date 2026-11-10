import * as THREE from 'three';
import {createWorksStudio,WORKS_DISPLAY_APERTURE} from './works-room-architecture.js';
import {drawWorkCoverFrame} from './work-cover-frame.js';
import {PLAY_WORK_PROJECTS,PLAY_WORK_OVERVIEWS,PLAY_WORK_COVERS} from './play-work-catalog.js';
import {configureCaseStudyLink,CASE_STUDY_LINK_NOTE} from './portfolio-route.js';
import {personalRoomContent} from './personal-room-content.js';
import {getHorizontalNavigation,getBoundaryNavigation,isKeyboardShortcutBlocked,consumeNavigationKey} from './keyboard-navigation.js';

const viewport=()=>({width:Math.max(1,globalThis.innerWidth||1280),height:Math.max(1,globalThis.innerHeight||720)});
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const bounded=(index,count)=>Math.max(0,Math.min(Math.max(0,count-1),Math.round(Number(index)||0)));

/** Fixed exhibition coordinates: adding projects expands the data arc, not buildings. */
export function worksProjectPose(index,count,view={width:1280,height:720}){
  count=Math.max(1,count);index=Math.max(0,Math.min(count-1,Number(index)||0));
  const radius=Math.max(40,(count-1)*10.6/1.2),angle=(index-(count-1)/2)*10.6/radius;
  const exhibit=new THREE.Vector3(Math.sin(angle)*radius,4.25,radius-Math.cos(angle)*radius-1.6);
  const normal=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle));
  // Keep the artwork in the region above the caption at short and narrow sizes.
  const width=Math.max(1,view.width),height=Math.max(1,view.height),fov=39;
  const top=height<760?100:115,bottom=height-(height<760?265:285),available=Math.max(200,bottom-top);
  const distance=Math.max(17.2,(WORKS_DISPLAY_APERTURE.height+.25)*height/(available*2*Math.tan(THREE.MathUtils.degToRad(fov/2))),(WORKS_DISPLAY_APERTURE.width+.4)*height/(Math.max(400,width*.66)*2*Math.tan(THREE.MathUtils.degToRad(fov/2))));
  const frameHeight=2*distance*Math.tan(THREE.MathUtils.degToRad(fov/2));
  const target=exhibit.clone();target.y-=(height/2-(top+bottom)/2)*frameHeight/height;
  const position=target.clone().addScaledVector(normal,distance);position.y+=.65;
  return {exhibit,normal,angle,rotationY:-angle,position,target,distance,fov,radius};
}

/** Bounded async ownership. Stale images cannot re-enter a newly selected window. */
export function createWorksTexturePool({load,dispose=value=>value?.dispose?.(),onChange=()=>{},max=3}){
  const cache=new Map(),pending=new Map();let wanted=new Set(),dead=false,peak=0;
  function drop(key){const value=cache.get(key);if(!value)return;cache.delete(key);onChange(key,null,'evicted');dispose(value);}
  function request(key){
    if(dead||cache.has(key)||pending.has(key))return;
    const controller=new AbortController(),token={controller};pending.set(key,token);
    Promise.resolve().then(()=>load(key,{signal:controller.signal})).then(value=>{
      if(pending.get(key)===token)pending.delete(key);
      if(!value){if(!dead&&wanted.has(key)&&!controller.signal.aborted)onChange(key,null,'error');return;}
      if(dead||!wanted.has(key)||controller.signal.aborted){dispose(value);return;}
      if(cache.has(key)){dispose(value);return;}
      cache.set(key,value);peak=Math.max(peak,cache.size);onChange(key,value,'loaded');
    }).catch(()=>{if(pending.get(key)===token)pending.delete(key);if(!dead&&wanted.has(key)&&!controller.signal.aborted)onChange(key,null,'error');});
  }
  return {
    select(keys){if(dead)return;wanted=new Set([...new Set(keys)].slice(0,max));for(const key of cache.keys())if(!wanted.has(key))drop(key);for(const [key,token]of pending)if(!wanted.has(key)){pending.delete(key);token.controller.abort();}for(const key of wanted)request(key);},
    get:key=>cache.get(key)||null,
    clear(){wanted=new Set();for(const {controller}of pending.values())controller.abort();pending.clear();for(const key of [...cache.keys()])drop(key);},
    dispose(){if(dead)return;this.clear();dead=true;},
    get stats(){return {cached:cache.size,pending:pending.size,wanted:wanted.size,peak,disposed:dead};}
  };
}

/** One independent room, three reusable exhibits, no additional renderer. */
export function createWorksRoomScene(count){return createWorksStudio(count,worksProjectPose);}

/** Reversible threshold trajectory in the selected exhibit's local coordinates. */
export function worksEntrancePose(index,count,view,progress){
  const pose=worksProjectPose(index,count,view),p=THREE.MathUtils.clamp(progress,0,1);
  // The door opens before the camera crosses its frame. The selected work stays ahead.
  const travel=ease(THREE.MathUtils.clamp((p-.12)/.88,0,1));
  const position=pose.position.clone().addScaledVector(pose.normal,(1-travel)*9.2);
  const target=pose.target.clone();
  position.y+=Math.sin(p*Math.PI)*.18;
  return {...pose,position,target,openness:ease(Math.min(1,p/.64)),progress:p};
}

export function createWorksExperience({renderer,onOpen=()=>{},onClose=()=>{},onPortfolio=()=>{},onPlace=()=>{},isReduced=()=>false}={}){
  if(!renderer?.domElement)throw new Error('Works Room requires the existing renderer.');
  const projects=PLAY_WORK_PROJECTS,dialog=document.createElement('dialog');dialog.id='works-experience';dialog.setAttribute('aria-labelledby','works-room-title');
  dialog.innerHTML=`<div class="works-shell"><div class="works-canvas" tabindex="0" role="region" aria-label="Works Room. A and D or Left and Right browse projects. Home and End jump to the first or last. Enter reads an overview."></div><div class="works-entry-curtain" aria-hidden="true"></div><header class="works-header"><div><p class="works-eyebrow">LAKSHYA’S WORLD</p><h1 id="works-room-title">The Works Room</h1></div><nav aria-label="Works Room navigation"><button type="button" data-works-places>Other places</button><span class="mode-switch" data-mode-switch data-works-portfolio>Portfolio / Play</span><button type="button" data-works-back>Back to garden</button></nav></header><section class="works-caption" aria-labelledby="works-selected-title"><p class="works-eyebrow" data-works-number></p><h2 id="works-selected-title"></h2><p data-works-summary></p><div class="works-actions"><button type="button" data-works-prev>Previous</button><button type="button" class="works-primary" data-works-read>Read overview</button><button type="button" data-works-next>Next</button></div><div class="works-detail-actions"><button type="button" data-works-index>Project index</button><button type="button" data-works-inspect>Look closer at the cover</button><span>A / D or Left / Right · Enter on scene to read</span></div></section><p class="works-status" role="status" aria-live="polite" data-works-status></p><button type="button" class="works-retry" data-works-retry hidden>Retry cover</button><section class="works-places" aria-labelledby="works-places-title" hidden><header><h2 id="works-places-title">A different side of Lakshya.</h2><button type="button" data-works-places-close>Back to the room</button></header><div data-works-place-list></div></section><section class="works-index" aria-labelledby="works-index-title" hidden><header><div><p class="works-eyebrow">THE PROJECT INDEX</p><h2 id="works-index-title">Follow your curiosity.</h2></div><button type="button" data-works-index-close>Back to the room</button></header><p data-works-count></p><div data-works-list></div></section><section class="works-reading" aria-labelledby="works-overview-title" hidden><header><p class="works-eyebrow" data-works-reading-kind>PROJECT OVERVIEW</p><button type="button" data-works-read-close>Back to the room</button></header><article data-works-article></article></section><section class="works-inspect" aria-labelledby="works-image-title" hidden><header><div><p class="works-eyebrow">PROJECT COVER</p><h2 id="works-image-title"></h2></div><div class="works-inspect-actions"><button type="button" data-works-zoom aria-pressed="false">Zoom cover</button><button type="button" data-works-inspect-close>Back to the room</button></div></header><figure><img data-works-image alt=""><figcaption data-works-image-caption></figcaption></figure></section></div>`;
  document.body.append(dialog);
  const q=s=>dialog.querySelector(s),host=q('.works-canvas'),curtain=q('.works-entry-curtain'),shell=q('.works-shell'),caption=q('.works-caption'),header=q('.works-header'),reading=q('.works-reading'),indexView=q('.works-index'),inspect=q('.works-inspect'),places=q('.works-places');
  const events=[];function listen(element,type,handler){element.addEventListener(type,handler);events.push(()=>element.removeEventListener(type,handler));}
  let curtainOpen=0;
  let room=null,dead=false,phase='closed',selected=0,queuedSelection=null,arcIndex=0,transition=null,thresholdProgress=1,dirty=true,previousFocus=null,previousHost=null,previousSibling=null,previousCanvasStyle='',rendererState=null,renderedFrames=0,lastSubFocus=null,hover=null,drag=null,errors=new Set();
  let profile=null,profileClock=0;
  if(globalThis.location&&new URLSearchParams(globalThis.location.search).get('worksProfile')==='1'){
    profile=document.createElement('details');profile.className='works-profile';profile.innerHTML='<summary>Works diagnostics</summary><pre></pre>';shell.append(profile);
  }
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const pool=createWorksTexturePool({
    load(index,{signal}){return new Promise(resolve=>{
      const artifact=PLAY_WORK_COVERS[projects[index]?.id];if(!artifact||signal.aborted){resolve(null);return;}
      const image=new Image();let settled=false;
      function finish(value){if(settled){value?.dispose();return;}settled=true;signal.removeEventListener('abort',abort);image.onload=null;image.onerror=null;resolve(value);}
      const abort=()=>{image.src='';finish(null);};signal.addEventListener('abort',abort,{once:true});image.decoding='async';
      image.onerror=()=>finish(null);image.onload=()=>{if(signal.aborted||dead){finish(null);return;}try{const canvas=document.createElement('canvas');drawWorkCoverFrame(canvas,image,WORKS_DISPLAY_APERTURE);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities?.getMaxAnisotropy?.()||1);finish(texture);}catch{finish(null);}};
      image.src=new URL('../'+artifact.src.replace(/^\.\//,''),import.meta.url).href;
    });},
    onChange(index,texture,reason){if(reason==='error')errors.add(index);else if(texture)errors.delete(index);if(room)for(const slot of room.slots)if(slot.index===index){slot.image.material.map=texture;slot.image.material.color.set(texture?'#ffffff':'#e9e5d7');slot.image.material.needsUpdate=true;}dirty=true;if(phase!=='closed')updateStatus();}
  });
  function node(tag,text,parent,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;parent.append(el);return el;}
  function ensureRoom(){if(!room)room=createWorksRoomScene(projects.length);return room;}
  function windowIndexes(){return [selected-1,selected,selected+1].filter(value=>value>=0&&value<projects.length);}
  function assignSlots(){
    const desired=windowIndexes(),available=room.slots.filter(slot=>!desired.includes(slot.index));
    for(const index of desired){let slot=room.slots.find(item=>item.index===index);if(!slot)slot=available.shift();slot.index=index;const pose=worksProjectPose(index,projects.length,viewport());slot.root.visible=true;slot.root.position.copy(pose.exhibit);slot.root.rotation.y=pose.rotationY;slot.root.userData.worksIndex=index;slot.image.userData.worksIndex=index;slot.image.scale.set(WORKS_DISPLAY_APERTURE.width,WORKS_DISPLAY_APERTURE.height,1);slot.image.material.map=pool.get(index);slot.image.material.color.set(pool.get(index)?'#ffffff':'#e9e5d7');slot.image.material.needsUpdate=true;slot.plaque.emissiveIntensity=index===selected?.3:0;}
    for(const slot of available){slot.root.visible=false;slot.index=null;slot.image.material.map=null;slot.image.material.needsUpdate=true;}
    pool.select(desired);dirty=true;
  }
  function updateStatus(){const project=projects[selected],artifact=PLAY_WORK_COVERS[project.id];let message='';if(!artifact)message='The project cover has not been added yet. The project overview is available.';else if(errors.has(selected))message='The project cover could not load. You can still read the overview.';else if(!pool.get(selected))message='Loading project cover…';q('[data-works-status]').textContent=message;q('[data-works-retry]').hidden=!errors.has(selected);}
  function setCaption(){
    const project=projects[selected],focused=document.activeElement;q('[data-works-number]').textContent=`${String(selected+1).padStart(2,'0')} / ${String(projects.length).padStart(2,'0')} SELECTED PROJECTS`;q('#works-selected-title').textContent=project.title;q('[data-works-summary]').textContent=project.summary||project.subtitle;q('[data-works-prev]').disabled=selected===0;q('[data-works-next]').disabled=selected===projects.length-1;q('[data-works-inspect]').disabled=!PLAY_WORK_COVERS[project.id];
    if(focused?.disabled&&focused.matches?.('[data-works-prev],[data-works-next]'))host.focus({preventScroll:true});
    dialog.querySelectorAll('[data-works-project]').forEach(button=>button.setAttribute('aria-current',button.dataset.worksProject===project.id?'true':'false'));updateStatus();
  }
  function applyView(index,{approach=0,arc=0}={}){
    const view=worksProjectPose(index,projects.length,viewport());room.camera.fov=view.fov;room.camera.aspect=viewport().width/viewport().height;room.camera.position.copy(view.position).addScaledVector(view.normal,approach);room.camera.position.y+=Math.sin(arc*Math.PI)*.14;room.camera.lookAt(view.target);room.camera.updateProjectionMatrix();room.camera.updateMatrixWorld(true);room.sun.position.copy(view.exhibit).add(new THREE.Vector3(-9,13,13));room.sun.target.position.copy(view.exhibit);room.focusLight.position.copy(view.exhibit).addScaledVector(view.normal,4.2);room.focusLight.position.y=7.4;room.setEntrance(view,1,false);dirty=true;
  }
  function applyEntrance(index,progress){
    const view=worksEntrancePose(index,projects.length,viewport(),progress);thresholdProgress=view.progress;
    room.camera.fov=view.fov;room.camera.aspect=viewport().width/viewport().height;room.camera.position.copy(view.position);room.camera.lookAt(view.target);room.camera.updateProjectionMatrix();room.camera.updateMatrixWorld(true);
    room.sun.position.copy(view.exhibit).add(new THREE.Vector3(-9,13,13));room.sun.target.position.copy(view.exhibit);room.focusLight.position.copy(view.exhibit).addScaledVector(view.normal,4.2);room.focusLight.position.y=7.4;
    room.setEntrance(view,view.openness,true);dirty=true;
  }
  function setPhase(value){phase=value;dialog.dataset.phase=value;}
  function revealCurtain(openness){
    curtainOpen=THREE.MathUtils.clamp(openness,0,1);
    curtain.style.setProperty('--room-reveal',String(curtainOpen));
  }
  function settleView(){transition=null;queuedSelection=null;thresholdProgress=1;arcIndex=selected;applyView(selected);revealCurtain(1);setPhase('viewing');shell.classList.remove('works-transitioning');caption.hidden=false;}
  function selectProject(value){
    if(dead||phase==='closed'||phase==='returning')return false;
    const index=typeof value==='string'?projects.findIndex(project=>project.id===value):bounded(value,projects.length);if(index<0)return false;
    if(phase==='entering'){queuedSelection=index;return true;}
    closeSubView(false);const from=arcIndex;selected=index;assignSlots();setCaption();
    if(isReduced()||Math.abs(from-index)<.001){settleView();return true;}
    transition={kind:'focus',from,to:index,elapsed:0,duration:Math.min(1.15,.68+Math.abs(index-from)*.1)};setPhase('focusing');return true;
  }
  function saveRenderer(){
    const canvas=renderer.domElement;previousHost=canvas.parentElement;previousSibling=canvas.nextSibling;previousCanvasStyle=canvas.getAttribute?.('style')||'';
    rendererState={size:renderer.getSize?.(new THREE.Vector2()),window:viewport(),ratio:renderer.getPixelRatio?.(),target:renderer.getRenderTarget?.(),viewport:renderer.getViewport?.(new THREE.Vector4()),scissor:renderer.getScissor?.(new THREE.Vector4()),scissorTest:renderer.getScissorTest?.(),autoClear:renderer.autoClear};
  }
  function restoreRenderer(){
    const saved=rendererState;rendererState=null;
    if(previousHost){if(previousSibling?.parentElement===previousHost)previousHost.insertBefore(renderer.domElement,previousSibling);else previousHost.append(renderer.domElement);}else renderer.domElement.remove();
    renderer.domElement.setAttribute?.('style',previousCanvasStyle);
    if(saved){
      const current=viewport(),changed=current.width!==saved.window.width||current.height!==saved.window.height;
      if(saved.ratio!==undefined)renderer.setPixelRatio?.(saved.ratio);
      if(changed)renderer.setSize?.(current.width,current.height,false);else if(saved.size)renderer.setSize?.(saved.size.x,saved.size.y,false);
      renderer.setRenderTarget?.(saved.target??null);
      if(changed){renderer.setViewport?.(0,0,current.width,current.height);renderer.setScissor?.(0,0,current.width,current.height);}else{if(saved.viewport)renderer.setViewport?.(saved.viewport);if(saved.scissor)renderer.setScissor?.(saved.scissor);}
      if(saved.scissorTest!==undefined)renderer.setScissorTest?.(saved.scissorTest);renderer.autoClear=saved.autoClear;
    }
    previousHost=null;previousSibling=null;
  }
  function hideSubViews(){reading.hidden=true;indexView.hidden=true;inspect.hidden=true;places.hidden=true;host.inert=false;header.inert=false;caption.inert=false;q('[data-works-retry]').inert=false;}
  function closeSubView(focus=true){if(!['reading','index','inspecting','places'].includes(phase))return false;hideSubViews();settleView();if(focus){const valid=lastSubFocus?.isConnected&&!lastSubFocus.disabled&&!lastSubFocus.closest?.('[hidden],[inert]');(valid?lastSubFocus:q('[data-works-read]')).focus({preventScroll:true});}return true;}
  function subView(kind,element,focusTarget){
    if(phase==='closed'||phase==='returning'||phase==='entering')return;lastSubFocus=document.activeElement;settleView();hideSubViews();element.hidden=false;host.inert=true;header.inert=true;caption.inert=true;q('[data-works-retry]').inert=true;setPhase(kind);focusTarget.focus({preventScroll:true});
  }
  function overview(id=projects[selected].id){
    const project=PLAY_WORK_OVERVIEWS.find(item=>item.id===id);if(!project)return;
    const article=q('[data-works-article]');article.replaceChildren();
    article.classList.toggle('works-project-overview',!project.nativeProcess);
    q('[data-works-reading-kind]').textContent=project.nativeProcess?'PORTFOLIO PROCESS':'PROJECT OVERVIEW';
    const hero=node('div',undefined,article,'works-overview-hero');
    const intro=node('div',undefined,hero,'works-overview-intro');
    node('p',project.status,intro,'works-meta works-project-status');
    const title=node('h1',project.title,intro);title.id='works-overview-title';
    node('p',project.overviewLead||project.summary,intro,'works-deck');
    if(!project.nativeProcess){
      const actions=node('div',undefined,intro,'works-case-action');
      const link=node('a','Read full case study',actions,'works-primary works-local-case-link');
      configureCaseStudyLink(link,project,location.href);
      node('p',CASE_STUDY_LINK_NOTE,actions,'works-meta');
    }
    const artifact=PLAY_WORK_COVERS[id];
    if(artifact){
      const figure=node('figure',undefined,hero,'works-overview-cover'),image=node('img',undefined,figure);
      image.src=new URL('../'+artifact.src.replace(/^\.\//,''),import.meta.url).href;
      image.width=artifact.width;image.height=artifact.height;image.alt=project.coverAlt||artifact.alt;image.decoding='async';
      const caption=project.coverCaption??artifact.caption;if(caption)node('figcaption',caption,figure);
    }
    const facts=node('dl',undefined,article,'works-overview-facts');
    if(project.role){const role=node('div',undefined,facts);node('dt','My contribution',role);node('dd',project.role,role);}
    if(project.timeline){const duration=node('div',undefined,facts);node('dt','Timeframe',duration);node('dd',project.timeline,duration);}
    if(project.contributionNote)node('p',project.contributionNote,article,'works-meta');
    const details=node('div',undefined,article,'works-overview-details');
    for(const section of project.sections){
      const block=node('section',undefined,details);node('h2',section.title,block);
      section.body.forEach(text=>node('p',text,block));
      if(project.nativeProcess&&section.limitation)node('p',section.limitation,block,'works-meta');
      for(const credit of section.links||[]){const link=node('a',credit.label,block,'works-credit');link.href=new URL('../'+credit.href.replace(/^\.\//,''),import.meta.url).href;}
    }
    subView('reading',reading,q('[data-works-read-close]'));reading.scrollTop=0;
  }
  function inspectArtwork(){
    const artifact=PLAY_WORK_COVERS[projects[selected].id];if(!artifact)return;q('#works-image-title').textContent=projects[selected].title;const image=q('[data-works-image]');image.src=new URL('../'+artifact.src.replace(/^\.\//,''),import.meta.url).href;image.width=artifact.width;image.height=artifact.height;image.alt=projects[selected].coverAlt||artifact.alt;image.style.setProperty('--works-image-width',`${artifact.width}px`);const caption=projects[selected].coverCaption??artifact.caption;q('[data-works-image-caption]').textContent=caption;q('[data-works-image-caption]').hidden=!caption;setImageZoom(false);subView('inspecting',inspect,q('[data-works-inspect-close]'));inspect.scrollTop=0;
  }
  function setImageZoom(zoomed){inspect.classList.toggle('is-zoomed',zoomed);const button=q('[data-works-zoom]');button.setAttribute('aria-pressed',String(zoomed));button.textContent=zoomed?'Fit cover':'Zoom cover';inspect.scrollTop=0;}
  const placeList=q('[data-works-place-list]');
  for(const id of ['about','projects','work','music','cloud']){
    const title=id==='projects'?'The Works Room':id==='music'?'Professor Oak’s lab':personalRoomContent(id==='work'?'memory':id).title;
    const button=node('button',id==='projects'?title:'Ride to '+title,placeList);button.type='button';button.dataset.worksPlace=id;
    if(id==='projects'){button.setAttribute('aria-current','page');listen(button,'click',()=>closeSubView());}
    else listen(button,'click',()=>{if(phase!=='places')return;close({immediate:true,notify:false});onPlace(id);});
  }
  const list=q('[data-works-list]');q('[data-works-count]').textContent=`${projects.length} projects. Choose your starting point.`;
  for(const [index,project]of projects.entries()){const button=node('button',undefined,list,'works-index-item');button.type='button';button.dataset.worksProject=project.id;node('span',String(index+1).padStart(2,'0'),button);const label=node('span',undefined,button);node('strong',project.title,label);node('small',project.subtitle,label);listen(button,'click',()=>{selectProject(index);q('[data-works-read]').focus({preventScroll:true});});}
  const process=node('button','How this portfolio was made',list,'works-process-link');process.type='button';listen(process,'click',()=>{close({immediate:true,notify:false});onPlace('music');});
  function completeClose(notify=true){
    if(phase==='closed')return;transition=null;queuedSelection=null;hideSubViews();setPhase('closed');restoreRenderer();if(dialog.open)dialog.close();pool.clear();errors.clear();hover=null;drag=null;host.style.cursor='';shell.classList.remove('works-transitioning');if(notify){onClose();const parentDialog=previousFocus?.closest?.('dialog');if(previousFocus?.isConnected&&!previousFocus.closest?.('[hidden],[inert]')&&(!parentDialog||parentDialog.open))previousFocus.focus({preventScroll:true});}previousFocus=null;
  }
  function close({immediate=false,notify=true}={}){
    if(phase==='closed')return false;if(immediate||isReduced()){completeClose(notify);return true;}if(phase==='returning')return false;const start=phase==='entering'?thresholdProgress:1;hideSubViews();caption.hidden=true;shell.classList.add('works-transitioning');transition={kind:'exit',elapsed:0,duration:.12+.92*start,from:arcIndex,start,notify,curtainFrom:curtainOpen};setPhase('returning');return true;
  }
  function resize(){if(!room||phase==='closed')return;const view=viewport();renderer.setSize?.(view.width,view.height,false);renderer.setViewport?.(0,0,view.width,view.height);renderer.setScissorTest?.(false);if(transition?.kind==='entry'||transition?.kind==='exit')applyEntrance(arcIndex,thresholdProgress);else applyView(arcIndex);dirty=true;}
  function open(id){
    if(dead)return false;if(phase!=='closed'){if(id)selectProject(id);return false;}
    previousFocus=document.activeElement;
    try{
    onOpen();ensureRoom();saveRenderer();host.append(renderer.domElement);renderer.setRenderTarget?.(null);renderer.setScissorTest?.(false);renderer.autoClear=true;
    if(rendererState.ratio!==undefined)renderer.setPixelRatio?.(Math.min(rendererState.ratio,1.5));
    const index=projects.findIndex(project=>project.id===id);if(index>=0)selected=index;queuedSelection=null;arcIndex=selected;thresholdProgress=0;errors.clear();assignSlots();setCaption();hideSubViews();caption.hidden=true;revealCurtain(0);dialog.showModal();setPhase('entering');shell.classList.add('works-transitioning');resize();applyEntrance(selected,0);
    transition={kind:'entry',elapsed:0,duration:isReduced()?0:1.42};host.focus({preventScroll:true});update(0);return true;
    }catch(error){transition=null;if(rendererState)restoreRenderer();if(dialog.open)dialog.close();setPhase('closed');pool.clear();onClose();throw error;}
  }
  function pick(event){const rect=host.getBoundingClientRect();if(!rect.width||!rect.height)return null;pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);raycaster.setFromCamera(pointer,room.camera);let object=raycaster.intersectObjects(room.slots.filter(slot=>slot.root.visible).map(slot=>slot.root),true)[0]?.object??null;while(object&&object.userData.worksIndex===undefined)object=object.parent;return object;}
  listen(q('[data-works-back]'),'click',()=>close());listen(q('[data-works-portfolio]'),'click',()=>{close({immediate:true,notify:false});onPortfolio();});listen(q('[data-works-prev]'),'click',()=>selectProject(selected-1));listen(q('[data-works-next]'),'click',()=>selectProject(selected+1));listen(q('[data-works-read]'),'click',()=>overview());listen(q('[data-works-inspect]'),'click',inspectArtwork);
  listen(q('[data-works-retry]'),'click',()=>{errors.delete(selected);pool.select(windowIndexes());updateStatus();host.focus({preventScroll:true});});
  listen(q('[data-works-places]'),'click',()=>subView('places',places,q('[data-works-places-close]')));
  listen(q('[data-works-index]'),'click',()=>subView('index',indexView,q('[data-works-index-close]')));
  listen(q('[data-works-zoom]'),'click',()=>setImageZoom(q('[data-works-zoom]').getAttribute('aria-pressed')!=='true'));
  for(const selector of ['[data-works-index-close]','[data-works-read-close]','[data-works-inspect-close]','[data-works-places-close]'])listen(q(selector),'click',()=>closeSubView());
  listen(dialog,'cancel',event=>{event.preventDefault();if(!closeSubView())close();});
  listen(dialog,'close',()=>{if(!dialog.open&&phase!=='closed')completeClose(true);});
  listen(dialog,'keydown',event=>{
    if(event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
    if(event.key==='Escape'){consumeNavigationKey(event);if(!event.repeat&&!closeSubView())close();return;}
    if(isKeyboardShortcutBlocked(event))return;
    const direction=getHorizontalNavigation(event),boundary=getBoundaryNavigation(event);
    if(phase==='index'||phase==='places'){
      if(!direction&&!boundary)return;const container=phase==='index'?q('[data-works-list]'):q('[data-works-place-list]'),buttons=[...container.querySelectorAll('button')].filter(button=>!button.disabled);if(!buttons.length)return;
      consumeNavigationKey(event);if(event.repeat)return;const current=buttons.indexOf(document.activeElement),next=boundary==='first'?0:boundary==='last'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,current<0?(direction>0?0:buttons.length-1):current+direction));buttons[next].focus({preventScroll:false});return;
    }
    if(!['viewing','focusing','entering'].includes(phase))return;
    if(direction||boundary){consumeNavigationKey(event);if(event.repeat)return;selectProject(boundary==='first'?0:boundary==='last'?projects.length-1:(queuedSelection??selected)+direction);}
    else if((event.key==='Enter'||event.key===' ')&&event.target===host){consumeNavigationKey(event);if(!event.repeat)overview();}
  });
  listen(host,'pointermove',event=>{if(!['viewing','focusing'].includes(phase))return;hover={clientX:event.clientX,clientY:event.clientY};});listen(host,'pointerleave',()=>{hover=null;host.style.cursor='';});
  listen(host,'pointerdown',event=>{if(event.button===0)drag={x:event.clientX,y:event.clientY};});listen(host,'pointercancel',()=>{drag=null;});
  listen(host,'click',event=>{if(!['viewing','focusing'].includes(phase))return;const moved=drag&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>8;drag=null;if(moved)return;const object=pick(event);if(!object)return;const index=object.userData.worksIndex;if(index===selected)inspectArtwork();else selectProject(index);});
  listen(renderer.domElement,'webglcontextlost',()=>close({immediate:true,notify:true}));
  function update(dt){
    if(dead||phase==='closed'||!room)return;
    profileClock+=Math.max(0,Number(dt)||0);
    if(profile&&(profileClock>=.5||renderedFrames===0)){
      profileClock=0;profile.querySelector('pre').textContent=`Phase: ${phase}\nRendered frames: ${renderedFrames}\nLast draw: ${renderer.info?.render?.calls??'—'} calls · ${renderer.info?.render?.triangles??'—'} triangles\nImage cache: ${pool.stats.cached}/3 · Loading: ${pool.stats.pending}\nRoom display slots: ${room.slots.length}\nRenderer resources: ${renderer.info?.memory?.geometries??'—'} geometries / ${renderer.info?.memory?.textures??'—'} textures\n${transition?'Camera moving':'Idle · render on change'}`;
    }
    if(['reading','index','inspecting','places'].includes(phase)||globalThis.document.hidden)return;
    dt=Math.max(0,Math.min(.1,Number(dt)||0));
    if(transition){const t=transition;t.elapsed+=dt;const p=isReduced()||t.duration===0?1:Math.min(1,t.elapsed/t.duration),blend=ease(p);
      if(t.kind==='entry'){applyEntrance(selected,p);revealCurtain(ease(Math.min(1,p*3)));if(p===1){const queued=queuedSelection;settleView();if(queued!==null&&queued!==selected)selectProject(queued);}}
      else if(t.kind==='focus'){arcIndex=THREE.MathUtils.lerp(t.from,t.to,blend);applyView(arcIndex,{approach:Math.sin(p*Math.PI)*.65,arc:p});if(p===1)settleView();}
      else{applyEntrance(t.from,t.start*(1-blend));revealCurtain(t.curtainFrom*(1-ease(THREE.MathUtils.clamp((p-.7)/.3,0,1))));if(p===1){completeClose(t.notify);return;}}
    }
    if(hover){const object=pick(hover);host.style.cursor=object?'pointer':'';hover=null;}
    if(dirty){renderer.render(room.scene,room.camera);renderedFrames++;dirty=false;}
  }
  return {open,close,update,resize,
    dispose(){if(dead)return;close({immediate:true,notify:false});dead=true;pool.dispose();events.forEach(off=>off());room?.dispose();room=null;dialog.remove();},
    get isOpen(){return phase!=='closed';},get phase(){return phase;},
    diagnostics(){return {phase,selected:projects[selected]?.id,thresholdProgress,renderedFrames,textures:pool.stats,resources:room?.resourceCounts||null,camera:room?{position:room.camera.position.toArray(),quaternion:room.camera.quaternion.toArray()}:null};}
  };
}
