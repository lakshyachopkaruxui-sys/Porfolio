import {roomMapButton} from './room-map-navigation.js';
import {PHOTO_SUBJECTS,photographySubjects,photographySelection} from './photography-browse.js';

/** A bounded photo catalogue and fitted detail. The parent owns the scene and return. */
export function createCloudPhotoGallery({host,photos=[],collections=[],onClose=()=>{},isReduced=()=>false}={}){
  if(!host?.ownerDocument&&!host?.document)throw new TypeError('A gallery host is required.');
  const doc=host.ownerDocument||host.document;
  const valid=items=>items.filter(photo=>photo&&typeof photo.src==='string'&&photo.src&&photo.width>0&&photo.height>0);
  const rolls=(collections.length?collections:[{id:'clouds',label:'Clouds',title:'The skies I stop for.',intro:'Cloud photographs I’ve taken when the sky made me pause.',photos}])
    .map(roll=>({...roll,photos:valid(roll.photos||[])})).filter(roll=>roll.photos.length);
  const root=doc.createElement('section');root.className='cloud-photo-gallery';root.hidden=true;root.tabIndex=-1;
  root.setAttribute('role','region');root.setAttribute('aria-label','Lakshya’s photographs');
  root.innerHTML=`<header class="cloud-gallery-header"><div><p class="cloud-gallery-eyebrow">THE VIEWFINDER <span data-cloud-total></span></p><h2 data-cloud-title></h2><p class="cloud-gallery-intro" data-cloud-intro></p><p class="cloud-gallery-position" data-cloud-count aria-live="polite"></p></div><div class="cloud-gallery-header-actions"><div class="cloud-gallery-tools"></div><button data-room-return type="button" data-cloud-back hidden>Back to photos</button>${roomMapButton}<button data-room-return type="button" data-cloud-close>Back to the Viewfinder</button></div></header>
    <details class="cloud-gallery-help"><summary>How to browse</summary><p data-cloud-hint></p></details>
    <nav class="cloud-gallery-rolls" aria-label="Choose a photography collection"></nav><nav class="cloud-gallery-subjects" aria-label="Filter photographs by subject"></nav>
    <section class="cloud-gallery-index" aria-label="Choose a photograph"></section>
    <figure class="cloud-gallery-stage" data-cloud-stage hidden><figcaption class="cloud-gallery-load" role="status" aria-live="polite"><span data-cloud-status></span><button type="button" data-cloud-retry hidden>Retry photograph</button></figcaption></figure>
    <footer class="cloud-gallery-footer gallery-strip"><div class="gallery-label"><span data-cloud-sheet-count role="status"></span><span data-cloud-caption></span></div><nav class="cloud-gallery-pages gallery-actions" aria-label="Move through the film reel"><button type="button" data-cloud-sheet-prev>Previous frame</button><button type="button" data-cloud-sheet-next>Next frame</button></nav><nav class="cloud-gallery-actions gallery-actions" aria-label="Browse complete photographs" hidden><button type="button" data-cloud-prev>Previous photo</button><button type="button" data-cloud-next>Next photo</button></nav></footer>`;
  host.append(root);
  const q=selector=>root.querySelector(selector),indexView=q('.cloud-gallery-index'),stage=q('[data-cloud-stage]');
  const rollNav=q('.cloud-gallery-rolls'),subjectNav=q('.cloud-gallery-subjects');
  const listeners=[],pending=new Map(),remembered=new Map(),rememberedSubjects=new Map();
  let opened=false,dead=false,rollIndex=0,subject='all',items=rolls[0]?.photos||[],selected=0,mode='index',generation=0;
  const listen=(element,type,fn,options)=>{element.addEventListener(type,fn,options);listeners.push(()=>element.removeEventListener(type,fn,options));};
  const focus=element=>element?.focus({preventScroll:true});
  const resolve=photo=>new URL('../'+photo.src.replace(/^\.\//,''),import.meta.url).href;
  const memoryKey=()=>`${rollIndex}:${subject}`;
  const remember=()=>remembered.set(memoryKey(),{selected});
  function restorePosition(){
    items=photographySelection(rolls[rollIndex].photos,subject);
    const position=remembered.get(memoryKey());selected=Math.min(items.length-1,Math.max(0,position?.selected||0));
  }
  rolls.forEach((roll,index)=>{const button=doc.createElement('button');button.type='button';button.dataset.cloudRoll=String(index);button.textContent=roll.label;rollNav.append(button);});
  let displayed=null, incoming=null, fade=null;
  function releaseImage(target){
    pending.get(target)?.();pending.delete(target);target.removeAttribute('src');target.removeAttribute('srcset');target.dataset.loaded='false';
  }
  function clearDetail(keepDisplayed=false){
    if(fade){fade.cancel();fade=null;}
    for(const layer of stage.querySelectorAll('img')){
      if(keepDisplayed&&layer===displayed)continue;
      releaseImage(layer);layer.remove();
    }
    incoming=null;if(!keepDisplayed)displayed=null;
  }
  function releaseAll(keepDisplayed=false){
    clearDetail(keepDisplayed);
    for(const target of indexView.querySelectorAll('img'))releaseImage(target);
    indexView.replaceChildren();
  }
  function loadImage(target,photo){
    releaseImage(target);const token=generation;
    target.width=photo.width;target.height=photo.height;target.alt=photo.alt||photo.caption||'Photograph by Lakshya';
    const settle=state=>{if(opened&&!dead&&token===generation)target.dataset.loaded=state;};
    const loaded=()=>settle('true'),failed=()=>settle('error');
    target.addEventListener('load',loaded);target.addEventListener('error',failed);
    pending.set(target,()=>{target.removeEventListener('load',loaded);target.removeEventListener('error',failed);});target.src=resolve(photo);
    if(target.complete&&target.naturalWidth>0)loaded();
  }
  function showDetail(photo){
    const frame=doc.createElement('img'),token=generation;
    incoming=frame;frame.dataset.cloudPhoto='';frame.alt=photo.alt||photo.caption||'Photograph by Lakshya';
    frame.width=photo.width;frame.height=photo.height;frame.decoding='async';frame.hidden=true;
    stage.insertBefore(frame,q('.cloud-gallery-load'));
    const current=()=>opened&&!dead&&token===generation&&incoming===frame;
    const show=()=>{
      if(!current())return;
      const previous=displayed;displayed=frame;incoming=null;
      if(previous)previous.setAttribute('aria-hidden','true');
      frame.hidden=false;frame.dataset.loaded='true';
      q('[data-cloud-status]').textContent='';root.dataset.loading='false';
      const removePrevious=()=>{if(previous){releaseImage(previous);previous.remove();}};
      if(!previous||isReduced()||doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches||!frame.animate){removePrevious();return;}
      const animation=frame.animate([{opacity:0},{opacity:1}],{duration:280,easing:'ease-in-out'});
      fade=animation;
      animation.finished.then(()=>{removePrevious();if(fade===animation)fade=null;},()=>{});
    };
    const failed=()=>{
      if(!current())return;
      frame.remove();releaseImage(frame);incoming=null;root.dataset.loading='false';
      q('[data-cloud-status]').textContent='This photograph could not load.';q('[data-cloud-retry]').hidden=false;
    };
    if(typeof frame.decode==='function'){
      frame.src=resolve(photo);frame.decode().then(show,failed);
    }else{
      frame.addEventListener('load',show,{once:true});frame.addEventListener('error',failed,{once:true});
      pending.set(frame,()=>{frame.removeEventListener('load',show);frame.removeEventListener('error',failed);});
      frame.src=resolve(photo);
    }
  }
  function renderSubjects(){
    subjectNav.replaceChildren();const subjects=photographySubjects(rolls[rollIndex].photos);
    subjectNav.hidden=mode==='full'||subjects.length<2;
    for(const [id,label]of [['all','All scenes'],...subjects]){const button=doc.createElement('button');button.type='button';button.dataset.cloudSubject=id;button.textContent=label;button.setAttribute('aria-pressed',String(id===subject));subjectNav.append(button);}
  }
  function render(){
    if(!opened||dead)return;generation++;const roll=rolls[rollIndex],full=mode==='full';releaseAll(full);
    root.dataset.mode=mode;root.dataset.roll=roll.id;root.dataset.subject=subject;root.dataset.reduced=String(Boolean(isReduced()));
    q('[data-cloud-total]').textContent=`${subject==='all'?roll.photos.length:items.length+' of '+roll.photos.length} photographs`;
    q('[data-cloud-title]').textContent=roll.title;
    const caption=q('[data-cloud-caption]');
    caption.textContent=full?(items[selected]?.caption||''):'';
    caption.hidden=!caption.textContent;
    q('[data-cloud-intro]').textContent=roll.intro;q('[data-cloud-intro]').hidden=full;
    q('[data-cloud-count]').textContent=full?`Photo ${selected+1} of ${items.length} · ${subject==='all'?roll.label:PHOTO_SUBJECTS[subject]}`:'';
    q('[data-cloud-count]').hidden=!full;q('[data-cloud-close]').hidden=full;q('[data-cloud-back]').hidden=!full;
    rollNav.hidden=full||rolls.length<2;for(const button of rollNav.querySelectorAll('button'))button.setAttribute('aria-pressed',String(Number(button.dataset.cloudRoll)===rollIndex));
    renderSubjects();indexView.hidden=full;q('[data-cloud-stage]').hidden=!full;
    q('.cloud-gallery-pages').hidden=full;q('.cloud-gallery-actions').hidden=!full;
    q('[data-cloud-hint]').textContent=full?'Use Left or Right to browse and Escape to return to photos.':'Swipe or use Left and Right to move the reel. Select the centre photo to open it.';
    if(full)q('[data-cloud-sheet-count]').textContent='Photo '+(selected+1)+' of '+items.length;
    q('[data-cloud-status]').textContent='';q('[data-cloud-retry]').hidden=true;root.dataset.loading='false';
    q('[data-cloud-prev]').disabled=selected===0;q('[data-cloud-next]').disabled=selected===items.length-1;
    if(full){q('[data-cloud-status]').textContent='Loading photograph…';root.dataset.loading='true';showDetail(items[selected]);return;}
    drawReel();
  }
  function drawReel(){
    const count=items.length;
    const frames=new Map([...indexView.children].map(card=>[Number(card.dataset.cloudPick),card]));
    const left=Math.min(2,Math.floor((count-1)/2)),right=Math.min(2,count-1-left);
    for(let slot=-left;slot<=right;slot++){
      const index=(selected+slot+count)%count,photo=items[index];
      let card=frames.get(index);
      if(!card){
        card=doc.createElement('button');card.type='button';card.className='cloud-gallery-index-card';
        card.dataset.cloudPick=String(index);
        const thumb=doc.createElement('img'),caption=doc.createElement('span');
        caption.textContent=photo.caption;card.append(thumb,caption);indexView.append(card);
        loadImage(thumb,slot===0?photo:{...photo,src:photo.thumb||photo.src});
      }else if(slot===0 && card.dataset.slot!=='0'){
        loadImage(card.firstElementChild,photo);
      }
      frames.delete(index);card.dataset.slot=String(slot);card.tabIndex=slot===0?0:-1;
      card.setAttribute('aria-pressed',String(slot===0));
      card.setAttribute('aria-label',(slot===0?'Open':'Centre')+' photograph '+(index+1)+': '+photo.caption);
    }
    for(const card of frames.values()){releaseImage(card.firstElementChild);card.remove();}
    q('[data-cloud-caption]').textContent=items[selected]?.caption||'';q('[data-cloud-caption]').hidden=false;
    q('[data-cloud-sheet-count]').textContent='Frame '+(selected+1)+' of '+count;
    q('[data-cloud-sheet-prev]').disabled=q('[data-cloud-sheet-next]').disabled=count<2;
  }
  function centre(value,moveFocus=false){
    selected=(value+items.length)%items.length;remember();drawReel();
    if(moveFocus)focus(indexView.querySelector('[data-slot="0"]'));
  }
  function openPhoto(value){
    if(!opened||mode!=='index')return false;
    const index=Math.max(0,Math.min(items.length-1,Math.round(Number(value)||0)));
    selected=index;mode='full';remember();render();focus(q('[data-cloud-back]'));return true;
  }
  function backToPhotos(){
    if(!opened||mode!=='full')return false;mode='index';remember();render();focus(indexView.querySelector('[data-slot="0"]'));return true;
  }
  function selectPhoto(value){
    if(!opened||mode!=='full')return false;const next=Math.max(0,Math.min(items.length-1,Math.round(Number(value)||0)));if(next===selected)return false;
    const active=doc.activeElement;selected=next;remember();render();
    if(active?.disabled)focus(q('[data-cloud-back]'));return true;
  }
  function setRoll(index){
    if(!opened||mode!=='index'||!rolls[index]||index===rollIndex)return false;
    remember();rememberedSubjects.set(rollIndex,subject);rollIndex=index;subject=rememberedSubjects.get(index)||'all';restorePosition();render();
    indexView.scrollTop=0;focus(q(`[data-cloud-roll="${index}"]`));return true;
  }
  function setSubject(value){
    if(!opened||mode!=='index'||value===subject)return false;
    if(value!=='all'&&!photographySubjects(rolls[rollIndex].photos).some(([id])=>id===value))return false;
    remember();subject=value;rememberedSubjects.set(rollIndex,subject);restorePosition();render();indexView.scrollTop=0;focus(q(`[data-cloud-subject="${subject}"]`));return true;
  }
  function close({notify=true}={}){
    if(!opened)return false;remember();opened=false;generation++;root.hidden=true;releaseAll();q('[data-cloud-status]').textContent='';root.dataset.loading='false';
    if(notify)onClose({roll:rollIndex,selectedIndex:selected});return true;
  }
  function goBack(){if(!opened)return false;return mode==='full'?backToPhotos():close();}
  function onKey(event){
    if(!opened||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.isComposing)return;
    if(event.target?.isContentEditable||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    const key=event.key?.toLowerCase();
    if(key==='escape'){event.preventDefault();event.stopPropagation();if(!event.repeat)goBack();return;}
    if(event.repeat)return;
    if(mode==='full'){
      const value=key==='a'||key==='arrowleft'?selected-1:key==='d'||key==='arrowright'?selected+1:key==='home'?0:key==='end'?items.length-1:null;
      if(value===null)return;event.preventDefault();event.stopPropagation();selectPhoto(value);return;
    }
    if(event.target?.closest?.('[data-cloud-roll],[data-cloud-subject]'))return;
    const next=['a','arrowleft','pageup'].includes(key)?selected-1:['d','arrowright','pagedown'].includes(key)?selected+1:key==='home'?0:key==='end'?items.length-1:null;
    if(next===null)return;
    event.preventDefault();event.stopPropagation();centre(next,true);
  }
  listen(root,'keydown',onKey);
  listen(rollNav,'click',event=>{const button=event.target.closest?.('[data-cloud-roll]');if(button)setRoll(Number(button.dataset.cloudRoll));});
  listen(subjectNav,'click',event=>{const button=event.target.closest?.('[data-cloud-subject]');if(button)setSubject(button.dataset.cloudSubject);});
  let drag=null,ignoreClickUntil=0;
  listen(indexView,'pointerdown',event=>{if(event.isPrimary&&event.button===0)drag={x:event.clientX,y:event.clientY};});
  listen(indexView,'pointercancel',()=>{drag=null;});
  listen(indexView,'pointerup',event=>{
    if(!drag)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag=null;
    if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)){ignoreClickUntil=performance.now()+350;centre(selected-Math.sign(dx),true);}
  });
  listen(indexView,'dragstart',event=>event.preventDefault());
  listen(indexView,'click',event=>{const button=event.target.closest?.('[data-cloud-pick]');if(button?.parentElement!==indexView||performance.now()<ignoreClickUntil)return;const index=Number(button.dataset.cloudPick);if(index===selected)openPhoto(index);else centre(index,true);});
  listen(q('[data-cloud-sheet-prev]'),'click',()=>centre(selected-1));listen(q('[data-cloud-sheet-next]'),'click',()=>centre(selected+1));
  listen(q('[data-cloud-prev]'),'click',()=>selectPhoto(selected-1));listen(q('[data-cloud-next]'),'click',()=>selectPhoto(selected+1));
  listen(q('[data-cloud-back]'),'click',backToPhotos);listen(q('[data-cloud-close]'),'click',()=>close());
  listen(q('[data-cloud-retry]'),'click',()=>{if(mode==='full'){render();focus(q('[data-cloud-back]'));}});
  return {
    open(index,{roll}={}){
      if(dead||!rolls.length)return false;remember();
      if(Number.isInteger(roll)&&rolls[roll]){rememberedSubjects.set(rollIndex,subject);rollIndex=roll;subject=rememberedSubjects.get(roll)||'all';}
      restorePosition();if(index!==undefined){selected=Math.max(0,Math.min(items.length-1,Math.round(Number(index)||0)));}
      opened=true;mode='index';root.hidden=false;render();
      focus(indexView.querySelector(`[data-cloud-pick="${selected}"]`)||indexView.querySelector('button'));return true;
    },
    close,cancel:goBack,
    dispose(){if(dead)return;close({notify:false});dead=true;generation++;releaseAll();listeners.splice(0).forEach(remove=>remove());root.remove();},
    get isOpen(){return opened;},get selectedIndex(){return selected;},get selectedRoll(){return rollIndex;}
  };
}
