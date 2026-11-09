import * as THREE from 'three';
import {OAK_DIALOGUE,OAK_MAKING_STEPS,OAK_COLLECTION_COUNT} from './oak-lab-content.js';
import {createOakNarration} from './oak-narration.js';
import {createOakLabScene} from './oak-lab-scene.js';
import {createPokemonRoom} from './pokemon-room.js';
import {POKEMON_COLLECTION} from './pokemon-collection-data.js';
import {decorateModeSelectors} from './mode-selector.js';
import {getHorizontalNavigation,getBoundaryNavigation,isKeyboardShortcutBlocked,consumeNavigationKey} from './keyboard-navigation.js';

export {OAK_DIALOGUE} from './oak-lab-content.js';

const MAP_PLACES=[
  {id:'about',label:'About',text:'About is the first introduction: Lakshya’s personality, the way he connects with people and how he approaches design. It comes before the work so there’s a person behind the projects.'},
  {id:'work',label:'Work',text:'One Works Room holds every project. This keeps the map open as the portfolio grows. The garden offers an overview; a full case study opens in Portfolio mode in a new tab.'},
  {id:'hobbies',label:'Hobbies',text:'Singing and Garba share this stop. Each has its own space and real photographs; the Listening Room holds Lakshya’s recordings. The place reflects his energy and love of being around people.'},
  {id:'oak',label:'Oak’s lab',text:'This lab connects the Pokémon GO collection with the childhood memories behind the garden. Oak is the guide through those captures and the story of building the portfolio.'},
  {id:'cloud',label:'Clouds',text:'Cloud Lookout holds Lakshya’s own photographs of skies he stopped to notice. It gives the garden a quieter place, alongside the more energetic singing and Garba experiences.'}
];

/** Owns one modal and its scene. The garden retains the renderer and loop. */
export function createOakLab({renderer,onOpen=()=>{},onClose=()=>{},onPortfolio=()=>{},onPlace=()=>{},isReduced=()=>false}={}){
  if(!renderer?.domElement)throw new Error('Oak’s lab requires the existing renderer.');
  const dialog=document.createElement('dialog');dialog.id='oak-lab';dialog.setAttribute('aria-labelledby','oak-lab-title');
  dialog.innerHTML=`<div class="oak-shell"><div class="oak-canvas" aria-hidden="true"></div><div class="oak-shade" aria-hidden="true"></div>
    <header class="oak-header"><div><p>CHILDHOOD MEMORIES. A WORLD OF HIS OWN.</p><h1 id="oak-lab-title">Professor Oak’s lab</h1></div><nav aria-label="Lab navigation"><button type="button" data-oak-places aria-expanded="false" aria-controls="oak-places">Other places</button><span class="mode-switch" data-oak-portfolio data-mode-switch>Portfolio / Play</span><button type="button" data-oak-close>Back to garden</button></nav></header>
    <nav class="oak-zones" aria-label="Explore the lab"><button type="button" data-oak-zone="welcome"><span>01</span> Meet Oak</button><button type="button" data-oak-zone="collection"><span>02</span> Pokémon collection</button><button type="button" data-oak-zone="making"><span>03</span> How this world was made</button></nav>
    <button class="oak-talk" type="button" data-oak-talk title="Oak can also respond when you select him.">Talk to Oak</button>
    <section class="oak-comic" aria-labelledby="oak-speech-title"><p class="oak-speaker">PROFESSOR OAK <span data-oak-count></span></p><h2 id="oak-speech-title"></h2><p class="oak-speech" data-oak-speech aria-live="polite" aria-atomic="true"></p>
      <div class="oak-collection" hidden><div class="oak-previews" aria-label="A few captures from the collection"></div><button type="button" data-oak-collection>Explore the collection</button></div>
      <nav class="oak-dialogue-nav" aria-label="Oak’s story"><button type="button" data-oak-prev>Back</button><button type="button" data-oak-next>Let’s begin</button></nav><p class="oak-key-hint">A / D or Left / Right · Enter to choose</p>
    </section>
    <nav class="oak-place-picks" aria-label="Places on the miniature garden" hidden></nav>
    <section class="oak-making" aria-labelledby="oak-making-title" hidden><p class="oak-build-eyebrow">THE BUILD TABLE <span data-oak-build-count></span></p><nav class="oak-build-steps" aria-label="Layers of this portfolio"></nav><div class="oak-build-copy" tabindex="0" role="region" aria-labelledby="oak-making-title"><h2 id="oak-making-title"></h2><p data-oak-build-body></p><p data-oak-build-detail></p></div><nav class="oak-build-actions" aria-label="Move through the build"><button type="button" data-oak-build-prev>Previous layer</button><button type="button" data-oak-build-next>Next layer</button></nav><p class="oak-key-hint">A / D or Left / Right: layers · Select a number to jump</p></section>
    <button class="oak-map-action" type="button" data-oak-map hidden>Explore the next layer of the map</button>
    <p class="oak-status" role="status" aria-live="polite"></p><button class="oak-retry" type="button" data-oak-retry hidden>Retry Oak model</button>
    <section id="oak-places" class="oak-places" aria-labelledby="oak-places-title" hidden><header><h2 id="oak-places-title">A different side of Lakshya.</h2><button type="button" data-oak-places-close>Back to the lab</button></header><div data-oak-destinations></div></section>
    <footer class="oak-tools"><a href="./pokemon-credits.html" target="_blank" rel="noopener">Model credits</a><div><button type="button" data-oak-read title="Read with your browser’s standard voice" aria-pressed="false">Read aloud</button><button type="button" data-oak-motion aria-pressed="true">Pause displays</button></div></footer><div class="oak-veil" aria-hidden="true"></div></div>`;
  document.body.append(dialog);
  decorateModeSelectors(dialog,{mode:'play',navigationHandled:true});
  const $=selector=>dialog.querySelector(selector),shell=$('.oak-shell'),host=$('.oak-canvas'),veil=$('.oak-veil');
  const listeners=[],query=window.matchMedia('(prefers-reduced-motion: reduce)'),reduced=()=>Boolean(isReduced()||query.matches);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  let buildIndex=0,ambientMotion=true,collectionVisited=false,placesOpen=false,placeSiblings=[];
  let room=null,child=null,saved=null,focus=null,phase='closed',dead=false,dirty=false,index=0,selectedZone='welcome',transition=null,renderedFrames=0,press=null,childSiblings=[],lastCollectionFocus=null;
  const listen=(element,type,fn,options)=>{element.addEventListener(type,fn,options);listeners.push(()=>element.removeEventListener(type,fn,options));};
  const destinations=$('.oak-places'),placesButton=$('[data-oak-places]');
  const destinationItems=[['about','Meet Lakshya'],['projects','The Works Room'],['work','The Hobbies Courtyard'],['music','Professor Oak’s lab'],['cloud','The Cloud Lookout']];
  function hidePlaces({restoreFocus=true}={}){
    if(!placesOpen)return false;
    placesOpen=false;destinations.hidden=true;
    placeSiblings.forEach(([element,inert])=>{element.inert=inert;});placeSiblings=[];
    placesButton.setAttribute('aria-expanded','false');dialog.setAttribute('aria-labelledby','oak-lab-title');dirty=true;
    if(restoreFocus)placesButton.focus({preventScroll:true});
    return true;
  }
  function showPlaces(){
    if(phase!=='viewing'||child?.isOpen||placesOpen)return false;
    narration.stop();press=null;placesOpen=true;destinations.hidden=false;destinations.scrollTop=0;
    placeSiblings=[...shell.children].filter(element=>element!==destinations).map(element=>[element,element.inert]);
    placeSiblings.forEach(([element])=>{element.inert=true;});
    placesButton.setAttribute('aria-expanded','true');dialog.setAttribute('aria-labelledby','oak-places-title');
    $('[data-oak-places-close]').focus({preventScroll:true});return true;
  }
  destinationItems.forEach(([id,title])=>{
    const button=document.createElement('button');button.type='button';button.dataset.oakDestination=id;button.textContent=title;
    if(id==='music')button.setAttribute('aria-current','page');
    $('[data-oak-destinations]').append(button);
    listen(button,'click',()=>{if(!placesOpen)return;if(id==='music'){hidePlaces();return;}close({immediate:true,notify:false});onPlace(id);});
  });
  listen(placesButton,'click',showPlaces);listen($('[data-oak-places-close]'),'click',()=>hidePlaces());
  function snapshot(){const canvas=renderer.domElement;return {parent:canvas.parentNode,sibling:canvas.nextSibling,style:canvas.getAttribute('style'),size:renderer.getSize(new THREE.Vector2()),ratio:renderer.getPixelRatio(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),target:renderer.getRenderTarget(),clearColor:renderer.getClearColor(new THREE.Color()),clearAlpha:renderer.getClearAlpha(),toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,output:renderer.outputColorSpace,autoClear:renderer.autoClear,autoClearColor:renderer.autoClearColor,autoClearDepth:renderer.autoClearDepth,autoClearStencil:renderer.autoClearStencil,shadowEnabled:renderer.shadowMap.enabled,shadowType:renderer.shadowMap.type,shadowAutoUpdate:renderer.shadowMap.autoUpdate,shadowNeedsUpdate:renderer.shadowMap.needsUpdate};}
  function borrow(){saved=snapshot();host.append(renderer.domElement);Object.assign(renderer.domElement.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',touchAction:'manipulation'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;renderer.autoClear=renderer.autoClearColor=renderer.autoClearDepth=renderer.autoClearStencil=true;renderer.shadowMap.enabled=false;renderer.setRenderTarget(null);renderer.setScissorTest(false);}
  function restore(){if(!saved)return;const s=saved,canvas=renderer.domElement;saved=null;if(s.parent){if(s.sibling?.parentNode===s.parent)s.parent.insertBefore(canvas,s.sibling);else s.parent.append(canvas);}else canvas.remove();renderer.setPixelRatio(s.ratio);renderer.setSize(s.size.x,s.size.y,false);renderer.setRenderTarget(s.target);renderer.setViewport(s.viewport);renderer.setScissor(s.scissor);renderer.setScissorTest(s.scissorTest);renderer.setClearColor(s.clearColor,s.clearAlpha);Object.assign(renderer,{toneMapping:s.toneMapping,toneMappingExposure:s.exposure,outputColorSpace:s.output,autoClear:s.autoClear,autoClearColor:s.autoClearColor,autoClearDepth:s.autoClearDepth,autoClearStencil:s.autoClearStencil});Object.assign(renderer.shadowMap,{enabled:s.shadowEnabled,type:s.shadowType,autoUpdate:s.shadowAutoUpdate,needsUpdate:s.shadowNeedsUpdate});if(s.style===null)canvas.removeAttribute('style');else canvas.setAttribute('style',s.style);}
  function setPhase(value){phase=value;dialog.dataset.phase=value;}
  const narration=createOakNarration({onState(active,error){dialog.dataset.narrating=String(active);$('[data-oak-read]').setAttribute('aria-pressed',String(active));$('[data-oak-read]').textContent=active?'Stop narration':'Read aloud';if(error)$('.oak-status').textContent=error;}});
  $('[data-oak-read]').hidden=!narration.available;
  const stageNav=$('.oak-build-steps');
  const shortStages=['Memories','Movement','The map','The build','Details','Access'];
  OAK_MAKING_STEPS.forEach((step,i)=>{const button=document.createElement('button');button.type='button';button.dataset.oakBuild=String(i);const number=document.createElement('span'),label=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');label.textContent=shortStages[i];button.append(number,label);button.title=step.title;button.setAttribute('aria-label',(i+1)+'. '+shortStages[i]+': '+step.title);stageNav.append(button);});
  const placeNav=$('.oak-place-picks');
  MAP_PLACES.forEach(place=>{const button=document.createElement('button');button.type='button';button.dataset.oakPlace=place.id;button.textContent=place.label;button.setAttribute('aria-pressed','false');placeNav.append(button);});
  function setBuildStep(value,{announce=true}={}){
    if(!['viewing','entering'].includes(phase))return false;
    narration.stop();buildIndex=THREE.MathUtils.clamp(Math.round(value),0,OAK_MAKING_STEPS.length-1);
    const step=OAK_MAKING_STEPS[buildIndex];room?.setBuildStage?.(step.mapFocus);shell.dataset.buildStage=step.id;
    $('#oak-making-title').textContent=step.title;$('[data-oak-build-body]').textContent=step.body;$('[data-oak-build-detail]').textContent=step.detail;
    $('[data-oak-build-count]').textContent=(buildIndex+1)+' / '+OAK_MAKING_STEPS.length;
    stageNav.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===buildIndex)));
    $('[data-oak-build-prev]').textContent=buildIndex===0?'Back to collection':'Previous layer';$('[data-oak-build-next]').textContent=step.nextLabel;
    $('[data-oak-map]').hidden=selectedZone!=='making'||buildIndex===OAK_MAKING_STEPS.length-1;
    placeNav.hidden=selectedZone!=='making'||buildIndex!==2;placeNav.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed','false'));
    $('.oak-build-copy').scrollTop=0;if(announce)$('.oak-build-copy').setAttribute('aria-label','Layer '+(buildIndex+1)+': '+step.title);dirty=true;
  }
  function inspectBuildPlace(id){
    const place=MAP_PLACES.find(item=>item.id===id);if(!place||selectedZone!=='making'||!['viewing','entering'].includes(phase))return false;
    setBuildStep(2);room?.setBuildStage?.(id);$('[data-oak-build-detail]').textContent=place.text;
    placeNav.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.oakPlace===id)));return true;
  }
  function content({animate=true}={}){
    narration.stop();const entry=OAK_DIALOGUE[index],previous=selectedZone;selectedZone=entry.zone;
    const beats=OAK_DIALOGUE.filter(beat=>beat.zone===selectedZone),zoneIndex=beats.indexOf(entry);
    $('#oak-speech-title').textContent=entry.title;$('[data-oak-speech]').textContent=entry.text;$('[data-oak-count]').textContent=(zoneIndex+1)+' / '+beats.length;
    $('[data-oak-prev]').disabled=index===0;$('[data-oak-next]').textContent=selectedZone==='collection'&&collectionVisited?'Next: How this was made':entry.nextLabel;
    $('[data-oak-talk]').textContent='Ask Oak';$('[data-oak-talk]').setAttribute('aria-label','Continue Oak’s story: '+entry.nextLabel);$('[data-oak-talk]').hidden=selectedZone!=='welcome';
    dialog.querySelectorAll('[data-oak-zone]').forEach(button=>{const selected=button.dataset.oakZone===selectedZone;button.setAttribute('aria-pressed',String(selected));if(selected)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    shell.dataset.zone=selectedZone;dialog.dataset.zone=selectedZone;dialog.dataset.collectionVisited=String(collectionVisited);
    if(selectedZone==='collection')$('.oak-previews').querySelectorAll('img').forEach(image=>{if(!image.getAttribute('src'))image.src=new URL('../'+image.dataset.oakSource.replace(/^\.\//,''),import.meta.url).href;});
    $('.oak-comic').hidden=selectedZone==='making';$('.oak-collection').hidden=selectedZone!=='collection';$('.oak-making').hidden=selectedZone!=='making';
    $('[data-oak-collection]').textContent=(collectionVisited?'Revisit ':'Explore ')+OAK_COLLECTION_COUNT+' screenshots';
    if(selectedZone==='making')setBuildStep(buildIndex,{announce:false});else{$('[data-oak-map]').hidden=true;placeNav.hidden=true;}
    if(previous!==selectedZone||!animate)resize(animate);dirty=true;
    const active=document.activeElement;
    if(active?.closest?.('[hidden],[inert]')||previous!==selectedZone&&!active?.closest?.('[data-oak-zone]')){
      const target=selectedZone==='making'?$('.oak-build-copy'):selectedZone==='collection'?$('[data-oak-collection]'):$('[data-oak-next]');target.focus({preventScroll:true});
    }
  }
  function advanceBuild(direction=1){if(selectedZone!=='making')return false;if(direction<0&&buildIndex===0)return selectZone('collection');if(direction>0&&buildIndex===OAK_MAKING_STEPS.length-1)return close();setBuildStep(buildIndex+direction);return true;}
  function advance(direction=1){
    if(!['viewing','entering'].includes(phase))return false;
    if(selectedZone==='making')return advanceBuild(direction);
    if(direction>0&&selectedZone==='collection'&&collectionVisited)return selectZone('making');
    index=THREE.MathUtils.clamp(index+direction,0,OAK_DIALOGUE.length-1);content();room?.react?.({reduced:reduced()||!ambientMotion});
    if(document.activeElement?.disabled)$('[data-oak-next]').focus({preventScroll:true});return true;
  }
  function selectZone(zone){
    if(!['welcome','collection','making'].includes(zone)||!['viewing','entering'].includes(phase))return false;
    index=OAK_DIALOGUE.findIndex(entry=>entry.zone===zone);content();room?.react?.({reduced:reduced()||!ambientMotion});return true;
  }
  function restoreChild(){childSiblings.forEach(([element,inert])=>{element.inert=inert;});childSiblings=[];shell.classList.remove('oak-has-collection');dialog.setAttribute('aria-labelledby','oak-lab-title');dialog.removeAttribute('aria-label');if(phase!=='closed'&&phase!=='returning'){setPhase('viewing');content({animate:false});resize();dirty=true;}}
  function openCollection(){
    if(!['viewing','entering'].includes(phase)||child?.isOpen)return false;narration.stop();transition=null;veil.style.opacity='0';lastCollectionFocus=document.activeElement;
    try{child??=createPokemonRoom({renderer,container:shell,isReduced,returnLabel:'Back to Oak’s lab',onClose:restoreChild,onPortfolio(){close({immediate:true,notify:false});onPortfolio();}});child.open({returnFocus:lastCollectionFocus,initialCollection:true});childSiblings=[...shell.children].filter(element=>element.id!=='pokemon-experience').map(element=>[element,element.inert]);childSiblings.forEach(([element])=>{element.inert=true;});shell.classList.add('oak-has-collection');dialog.removeAttribute('aria-labelledby');dialog.setAttribute('aria-label','Lakshya’s Pokémon GO collection');collectionVisited=true;dialog.dataset.collectionVisited='true';setPhase('collection');return true;}
    catch{restoreChild();$('.oak-status').textContent='The collection could not open. Please try again.';return false;}
  }
  function placeTalk(){if(!room||selectedZone!=='welcome')return;const point=room.headProjection(),rect=host.getBoundingClientRect(),base=shell.getBoundingClientRect(),x=(point.x+1)*rect.width/2+rect.left-base.left,y=(1-point.y)*rect.height/2+rect.top-base.top;$('[data-oak-talk]').style.left=`${x}px`;$('[data-oak-talk]').style.top=`${Math.max(164,y-13)}px`;const comic=$('.oak-comic').getBoundingClientRect();$('.oak-comic').style.setProperty('--oak-tail-x',`${Math.max(20,Math.min(comic.width-45,x-comic.left+base.left))}px`);}
  function resize(animate=false,entry=false){if(!room||phase==='closed')return;if(child?.isOpen){child.resize();return;}const rect=host.getBoundingClientRect(),width=Math.max(1,rect.width||window.innerWidth),height=Math.max(1,rect.height||window.innerHeight);renderer.setPixelRatio(Math.min(saved?.ratio||1,1.6));renderer.setSize(width,height,false);renderer.setViewport(0,0,width,height);renderer.setScissorTest(false);room.frame(selectedZone,width/height,window.innerWidth<=620,{animate:animate===true&&!reduced(),entry});placeTalk();dirty=true;}
  function open({returnFocus}={}){
    if(dead)throw new Error('Oak’s lab has been disposed.');if(phase!=='closed')return false;focus=returnFocus||document.activeElement;index=0;buildIndex=0;collectionVisited=false;renderedFrames=0;setPhase('entering');dirty=true;
    $('[data-oak-motion]').disabled=reduced();$('[data-oak-motion]').textContent=reduced()?'Displays still':ambientMotion?'Pause displays':'Resume displays';
    try{onOpen();dialog.showModal();borrow();room=createOakLabScene({onChange(){dirty=true;},onAssetState(state){$('.oak-status').textContent=state==='loading'?'Oak is arriving…':state==='error'?'Oak’s model could not load. His dialogue and the collection are still available.':'';$('[data-oak-retry]').hidden=state!=='error';}});room.setPreviews(POKEMON_COLLECTION);content({animate:false});resize(true,true);room.loadOak();veil.style.opacity=reduced()?'0':'1';transition=reduced()?null:{kind:'entry',elapsed:0,duration:.32};if(!transition)setPhase('viewing');$('[data-oak-next]').focus({preventScroll:true});return true;}catch(error){finishClose(false);throw error;}
  }
  function finishClose(notify){if(phase==='closed')return;hidePlaces({restoreFocus:false});narration.stop();child?.close({immediate:true,notify:false});restoreChild();room?.dispose();room=null;transition=null;setPhase('closed');dirty=false;restore();dialog.close();const previous=focus;focus=null;if(notify){try{onClose();}finally{if(previous?.isConnected&&!previous.disabled)previous.focus({preventScroll:true});}}}
  function close({immediate=false,notify=true}={}){if(phase==='closed')return false;narration.stop();hidePlaces({restoreFocus:false});if(phase==='returning'&&!immediate)return false;if(child?.isOpen){child.close({immediate:true,notify:false});restoreChild();}setPhase('returning');if(immediate||reduced()){finishClose(notify);return true;}room?.beginExit();transition={kind:'exit',elapsed:0,duration:.45,notify};dirty=true;return true;}
  function update(dt=0){if(phase==='closed'||document.hidden||placesOpen)return false;if(child?.isOpen)return child.update(dt);if(transition){const t=transition;const progress=reduced()?1:Math.min(1,(t.elapsed+=Math.max(0,Math.min(.1,Number(dt)||0)))/t.duration);veil.style.opacity=String(t.kind==='entry'?1-progress:Math.max(0,(progress-.35)/.65));dirty=true;if(progress===1){transition=null;if(t.kind==='exit'){finishClose(t.notify);return false;}setPhase('viewing');}}if(room?.update(dt,reduced(),{active:ambientMotion})){dirty=true;placeTalk();}if(!dirty||!room)return false;renderer.render(room.scene,room.camera);renderedFrames++;dirty=false;return true;}
  listen($('[data-oak-close]'),'click',()=>close());listen($('[data-oak-portfolio]'),'click',event=>{if(event.target.closest?.('[data-mode-link]')?.dataset.modeLink!=='portfolio')return;close({immediate:true,notify:false});onPortfolio();});listen($('[data-oak-prev]'),'click',()=>advance(-1));listen($('[data-oak-next]'),'click',()=>advance());listen($('[data-oak-talk]'),'click',()=>advance());listen($('[data-oak-collection]'),'click',openCollection);listen($('[data-oak-retry]'),'click',()=>room?.loadOak());dialog.querySelectorAll('[data-oak-zone]').forEach(button=>listen(button,'click',()=>selectZone(button.dataset.oakZone)));
  listen(dialog,'cancel',event=>{event.preventDefault();if(placesOpen)hidePlaces();else if(child?.isOpen)child.cancel({fromKeyboard:true});else close();});
  listen(dialog,'close',()=>{if(phase!=='closed'&&!dialog.open)finishClose(true);});
  listen(dialog,'keydown',event=>{
    if(event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
    if(event.key==='Escape'){consumeNavigationKey(event);if(event.repeat)return;if(placesOpen)hidePlaces();else if(child?.isOpen)child.cancel({fromKeyboard:true});else close();return;}
    if(placesOpen){
      if(isKeyboardShortcutBlocked(event))return;
      const key=event.key.toLowerCase(),direction=key==='arrowup'||key==='w'?-1:key==='arrowdown'||key==='s'?1:getHorizontalNavigation(event),boundary=getBoundaryNavigation(event);
      if(!direction&&!boundary)return;consumeNavigationKey(event);if(event.repeat)return;
      const buttons=[...destinations.querySelectorAll('[data-oak-destination]')],current=buttons.indexOf(document.activeElement);
      const next=boundary==='first'?0:boundary==='last'?buttons.length-1:THREE.MathUtils.clamp(current+direction,0,buttons.length-1);
      buttons[next]?.focus({preventScroll:true});buttons[next]?.scrollIntoView?.({block:'nearest'});return;
    }
    if(child?.isOpen||!['viewing','entering'].includes(phase)||isKeyboardShortcutBlocked(event))return;
    const direction=getHorizontalNavigation(event),boundary=event.target.closest?.('.oak-build-copy')?null:getBoundaryNavigation(event);if(!direction&&!boundary)return;
    consumeNavigationKey(event);if(event.repeat)return;
    const zoneButton=event.target.closest?.('[data-oak-zone]');
    if(zoneButton){const zones=['welcome','collection','making'],current=zones.indexOf(zoneButton.dataset.oakZone),next=boundary==='first'?0:boundary==='last'?zones.length-1:THREE.MathUtils.clamp(current+direction,0,zones.length-1);selectZone(zones[next]);$(`[data-oak-zone="${zones[next]}"]`).focus({preventScroll:true});}
    else if(event.target.closest?.('[data-oak-place]')){const current=MAP_PLACES.findIndex(place=>place.id===event.target.closest('[data-oak-place]').dataset.oakPlace),next=boundary==='first'?0:boundary==='last'?MAP_PLACES.length-1:THREE.MathUtils.clamp(current+direction,0,MAP_PLACES.length-1);inspectBuildPlace(MAP_PLACES[next].id);placeNav.querySelectorAll('button')[next]?.focus({preventScroll:true});}
    else if(selectedZone==='making'){if(boundary)setBuildStep(boundary==='first'?0:OAK_MAKING_STEPS.length-1);else advanceBuild(direction);if(event.target.closest?.('.oak-build-steps'))stageNav.querySelectorAll('button')[buildIndex]?.focus({preventScroll:true});}
    else{if(boundary){const indices=OAK_DIALOGUE.map((entry,i)=>entry.zone===selectedZone?i:-1).filter(i=>i>=0);index=boundary==='first'?indices[0]:indices.at(-1);content();}else advance(direction);if(document.activeElement?.disabled)$('[data-oak-next]').focus({preventScroll:true});}
  });
  listen(renderer.domElement,'pointerdown',event=>{if(!placesOpen&&phase!=='collection'&&event.button===0)press={x:event.clientX,y:event.clientY};});
  listen(renderer.domElement,'pointerup',event=>{const down=press;press=null;if(!down||placesOpen||event.button!==0||!room||phase==='collection'||Math.hypot(event.clientX-down.x,event.clientY-down.y)>7)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,room.camera);const place=selectedZone==='making'?room.pickBuildStop?.(raycaster.ray):null;if(place){inspectBuildPlace(place);return;}const zone=room.pick(raycaster.ray);if(zone==='welcome')advance();else if(zone==='collection'){selectZone(zone);openCollection();}else if(zone==='making'&&selectedZone==='making'){if(buildIndex<OAK_MAKING_STEPS.length-1)advanceBuild(1);}else if(zone)selectZone(zone);});
  listen(renderer.domElement,'pointercancel',()=>{press=null;});listen(window,'resize',resize);listen(document,'visibilitychange',()=>{if(document.hidden)narration.stop();else dirty=true;});listen(window,'pagehide',()=>narration.stop());listen(query,'change',()=>{if(reduced()&&transition){const t=transition;transition=null;veil.style.opacity=t.kind==='entry'?'0':'1';if(t.kind==='exit')finishClose(t.notify);else setPhase('viewing');}dirty=true;});
  listen($('[data-oak-read]'),'click',()=>{if(narration.speaking){narration.stop();return;}const text=selectedZone==='making'?$('[data-oak-build-body]').textContent+' '+$('[data-oak-build-detail]').textContent:OAK_DIALOGUE[index].text;narration.read(text);});
  listen($('[data-oak-motion]'),'click',()=>{ambientMotion=!ambientMotion;$('[data-oak-motion]').textContent=ambientMotion?'Pause displays':'Resume displays';$('[data-oak-motion]').setAttribute('aria-pressed',String(ambientMotion));dirty=true;});
  listen(placeNav,'click',event=>{const button=event.target.closest?.('[data-oak-place]');if(button)inspectBuildPlace(button.dataset.oakPlace);});
  listen(stageNav,'click',event=>{const button=event.target.closest?.('[data-oak-build]');if(button)setBuildStep(Number(button.dataset.oakBuild));});
  listen($('[data-oak-build-prev]'),'click',()=>advanceBuild(-1));listen($('[data-oak-build-next]'),'click',()=>advanceBuild());listen($('[data-oak-map]'),'click',()=>{if(buildIndex<OAK_MAKING_STEPS.length-1)advanceBuild();});
  const previewHost=$('.oak-previews');POKEMON_COLLECTION.slice(0,3).forEach(entry=>{const image=document.createElement('img');image.dataset.oakSource=entry.thumbnail;image.alt=entry.name;image.width=66;image.height=88;image.loading='lazy';previewHost.append(image);});$('[data-oak-collection]').textContent=`Browse ${POKEMON_COLLECTION.length} catches`;
  return {open,close,update,resize,openCollection,selectZone,advance,
    dispose(){if(dead)return;close({immediate:true,notify:false});child?.dispose();child=null;narration.dispose();listeners.splice(0).forEach(remove=>remove());dialog.remove();dead=true;},
    diagnostics(){return {phase,placesOpen,isOpen:phase!=='closed',dialogueIndex:index,zone:selectedZone,buildIndex,ambientMotion,narrating:narration.speaking,renderedFrames,resources:room?.stats||null,collection:child?.isOpen?child.diagnostics():null,ownsRenderer:false};},
    get isOpen(){return phase!=='closed';},get phase(){return phase;}
  };
}
