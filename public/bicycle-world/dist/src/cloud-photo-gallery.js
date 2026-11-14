import {CONTACT_SHEET_SIZE,PHOTO_SUBJECTS,photographySubjects,photographySelection,contactSheetPage} from './photography-browse.js';

/** A bounded photo catalogue and fitted detail. The parent owns the scene and return. */
export function createCloudPhotoGallery({host,photos=[],collections=[],onClose=()=>{},isReduced=()=>false}={}){
  if(!host?.ownerDocument&&!host?.document)throw new TypeError('A gallery host is required.');
  const doc=host.ownerDocument||host.document;
  const valid=items=>items.filter(photo=>photo&&typeof photo.src==='string'&&photo.src&&photo.width>0&&photo.height>0);
  const rolls=(collections.length?collections:[{id:'clouds',label:'Clouds',title:'The skies I stop for.',intro:'Cloud photographs I’ve taken when the sky made me pause.',photos}])
    .map(roll=>({...roll,photos:valid(roll.photos||[])})).filter(roll=>roll.photos.length);
  const root=doc.createElement('section');root.className='cloud-photo-gallery';root.hidden=true;root.tabIndex=-1;
  root.setAttribute('role','region');root.setAttribute('aria-label','Lakshya’s photographs');
  root.innerHTML=`<header class="cloud-gallery-header"><div><p class="cloud-gallery-eyebrow">THE VIEWFINDER <span data-cloud-total></span></p><h2 data-cloud-title></h2><p class="cloud-gallery-intro" data-cloud-intro></p><p class="cloud-gallery-position" data-cloud-count aria-live="polite"></p></div><div class="cloud-gallery-header-actions"><button type="button" data-cloud-back hidden>Back to photos</button><button type="button" data-cloud-close>Back to the Viewfinder</button></div></header>
    <nav class="cloud-gallery-rolls" aria-label="Choose a photography collection"></nav><nav class="cloud-gallery-subjects" aria-label="Filter photographs by subject"></nav>
    <section class="cloud-gallery-index" aria-label="Choose a photograph"></section>
    <figure class="cloud-gallery-stage" data-cloud-stage hidden><img data-cloud-photo alt="" decoding="async"><figcaption class="cloud-gallery-load" role="status" aria-live="polite"><span data-cloud-status></span><button type="button" data-cloud-retry hidden>Retry photograph</button></figcaption></figure>
    <footer class="cloud-gallery-footer"><nav class="cloud-gallery-pages" aria-label="Photo catalogue pages"><button type="button" data-cloud-sheet-prev>Previous page</button><p data-cloud-sheet-count role="status"></p><button type="button" data-cloud-sheet-next>Next page</button></nav><nav class="cloud-gallery-actions" aria-label="Browse complete photographs" hidden><button type="button" data-cloud-prev>Previous photo</button><p>Complete photograph · fitted to screen</p><button type="button" data-cloud-next>Next photo</button></nav><div class="cloud-gallery-bottom"><p data-cloud-hint>Choose a photograph to open it.</p><div class="cloud-gallery-tools"></div></div></footer>`;
  host.append(root);
  const q=selector=>root.querySelector(selector),indexView=q('.cloud-gallery-index'),image=q('[data-cloud-photo]');
  const rollNav=q('.cloud-gallery-rolls'),subjectNav=q('.cloud-gallery-subjects');
  const listeners=[],pending=new Map(),animations=new Map(),remembered=new Map(),rememberedSubjects=new Map();
  let opened=false,dead=false,rollIndex=0,subject='all',items=rolls[0]?.photos||[],selected=0,sheetPage=0,mode='index',generation=0,detailOrigin=null;
  const listen=(element,type,fn,options)=>{element.addEventListener(type,fn,options);listeners.push(()=>element.removeEventListener(type,fn,options));};
  const focus=element=>element?.focus({preventScroll:true});
  const resolve=photo=>new URL('../'+photo.src.replace(/^\.\//,''),import.meta.url).href;
  const memoryKey=()=>`${rollIndex}:${subject}`;
  const remember=()=>remembered.set(memoryKey(),{selected,sheetPage});
  function restorePosition(){
    items=photographySelection(rolls[rollIndex].photos,subject);
    const position=remembered.get(memoryKey());selected=Math.min(items.length-1,Math.max(0,position?.selected||0));
    sheetPage=contactSheetPage(items,position?.sheetPage??Math.floor(selected/CONTACT_SHEET_SIZE)).page;
  }
  rolls.forEach((roll,index)=>{const button=doc.createElement('button');button.type='button';button.dataset.cloudRoll=String(index);button.textContent=roll.label;rollNav.append(button);});
  function releaseImage(target){
    animations.get(target)?.cancel();animations.delete(target);
    pending.get(target)?.();pending.delete(target);target.removeAttribute('src');target.removeAttribute('srcset');target.dataset.loaded='false';
  }
  function releaseAll(){for(const target of root.querySelectorAll('img'))releaseImage(target);indexView.replaceChildren();}
  function loadImage(target,photo,{primary=false}={}){
    releaseImage(target);const token=generation;
    target.width=photo.width;target.height=photo.height;target.alt=photo.alt||photo.caption||'Photograph by Lakshya';
    const loaded=()=>{
      if(dead||!opened||token!==generation||target.dataset.loaded==='true')return;
      target.dataset.loaded='true';
      if(primary){q('[data-cloud-status]').textContent='';q('[data-cloud-retry]').hidden=true;root.dataset.loading='false';
        if(!isReduced()&&target.animate)animations.set(target,target.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-out'}));}
    };
    const failed=()=>{
      if(dead||!opened||token!==generation)return;target.dataset.loaded='error';
      if(primary){q('[data-cloud-status]').textContent='This photograph could not load.';q('[data-cloud-retry]').hidden=false;root.dataset.loading='false';}
    };
    target.addEventListener('load',loaded);target.addEventListener('error',failed);
    pending.set(target,()=>{target.removeEventListener('load',loaded);target.removeEventListener('error',failed);});target.src=resolve(photo);
    if(target.complete&&target.naturalWidth>0)loaded();
  }
  function renderSubjects(){
    subjectNav.replaceChildren();const subjects=photographySubjects(rolls[rollIndex].photos);
    subjectNav.hidden=mode==='full'||subjects.length<2;
    for(const [id,label]of [['all','All scenes'],...subjects]){const button=doc.createElement('button');button.type='button';button.dataset.cloudSubject=id;button.textContent=label;button.setAttribute('aria-pressed',String(id===subject));subjectNav.append(button);}
  }
  function render(){
    if(!opened||dead)return;generation++;releaseAll();const roll=rolls[rollIndex],full=mode==='full';
    root.dataset.mode=mode;root.dataset.roll=roll.id;root.dataset.subject=subject;root.dataset.reduced=String(Boolean(isReduced()));
    q('[data-cloud-total]').textContent=`${subject==='all'?roll.photos.length:items.length+' of '+roll.photos.length} photographs`;
    q('[data-cloud-title]').textContent=full?(items[selected]?.caption||'Photograph'):roll.title;
    q('[data-cloud-intro]').textContent=roll.intro;q('[data-cloud-intro]').hidden=full;
    q('[data-cloud-count]').textContent=full?`Photo ${selected+1} of ${items.length} · ${subject==='all'?roll.label:PHOTO_SUBJECTS[subject]}`:'';
    q('[data-cloud-count]').hidden=!full;q('[data-cloud-close]').hidden=full;q('[data-cloud-back]').hidden=!full;
    rollNav.hidden=full||rolls.length<2;for(const button of rollNav.querySelectorAll('button'))button.setAttribute('aria-pressed',String(Number(button.dataset.cloudRoll)===rollIndex));
    renderSubjects();indexView.hidden=full;q('[data-cloud-stage]').hidden=!full;
    q('.cloud-gallery-pages').hidden=full;q('.cloud-gallery-actions').hidden=!full;
    q('[data-cloud-hint]').textContent=full?'A / D or Left / Right: browse · Esc: back to photos':'Choose a photograph to open it. Page Up / Down: browse pages.';
    q('[data-cloud-status]').textContent='';q('[data-cloud-retry]').hidden=true;root.dataset.loading='false';
    q('[data-cloud-prev]').disabled=selected===0;q('[data-cloud-next]').disabled=selected===items.length-1;
    if(full){q('[data-cloud-status]').textContent='Loading photograph…';root.dataset.loading='true';loadImage(image,items[selected],{primary:true});return;}
    const page=contactSheetPage(items,sheetPage);sheetPage=page.page;
    q('[data-cloud-sheet-count]').textContent=`${page.start+1}–${page.end} of ${items.length} · Page ${page.page+1} of ${page.pages}`;
    q('[data-cloud-sheet-prev]').disabled=page.page===0;q('[data-cloud-sheet-next]').disabled=page.page===page.pages-1;
    page.photos.forEach((photo,offset)=>{
      const index=page.start+offset,button=doc.createElement('button');button.type='button';button.dataset.cloudPick=String(index);button.className='cloud-gallery-index-card';
      button.setAttribute('aria-label',`Open photograph ${index+1}: ${photo.caption}`);button.setAttribute('aria-pressed',String(index===selected));
      const thumbnail=doc.createElement('img');thumbnail.decoding='async';thumbnail.loading='lazy';
      const caption=doc.createElement('span');caption.textContent=`${String(index+1).padStart(2,'0')}  ${photo.caption}`;
      button.append(thumbnail,caption);indexView.append(button);loadImage(thumbnail,photo.thumb?{...photo,src:photo.thumb}:photo);
    });
  }
  function setSheetPage(value,{focusIndex}={}){
    if(!opened||mode!=='index')return false;sheetPage=contactSheetPage(items,value).page;remember();render();indexView.scrollTop=0;
    focus(indexView.querySelector(`[data-cloud-pick="${focusIndex??sheetPage*CONTACT_SHEET_SIZE}"]`)||indexView.querySelector('button'));return true;
  }
  function openPhoto(value){
    if(!opened||mode!=='index')return false;
    const index=Math.max(0,Math.min(items.length-1,Math.round(Number(value)||0)));
    detailOrigin={page:sheetPage,index,scrollTop:indexView.scrollTop};selected=index;mode='full';remember();render();focus(q('[data-cloud-back]'));return true;
  }
  function backToPhotos(){
    if(!opened||mode!=='full')return false;const origin=detailOrigin;detailOrigin=null;mode='index';
    sheetPage=contactSheetPage(items,origin?.page??Math.floor(selected/CONTACT_SHEET_SIZE)).page;remember();render();
    indexView.scrollTop=origin?.scrollTop||0;focus(indexView.querySelector(`[data-cloud-pick="${origin?.index??selected}"]`)||indexView.querySelector('button'));return true;
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
    if(!opened)return false;remember();opened=false;generation++;detailOrigin=null;root.hidden=true;releaseAll();q('[data-cloud-status]').textContent='';root.dataset.loading='false';
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
    if(key==='pagedown'||key==='pageup'){event.preventDefault();event.stopPropagation();setSheetPage(sheetPage+(key==='pagedown'?1:-1));return;}
    if(event.target?.closest?.('[data-cloud-roll],[data-cloud-subject]'))return;
    const current=Number(event.target?.closest?.('[data-cloud-pick]')?.dataset.cloudPick??sheetPage*CONTACT_SHEET_SIZE);
    const next=key==='a'||key==='arrowleft'?current-1:key==='d'||key==='arrowright'?current+1:key==='home'?0:key==='end'?items.length-1:null;
    if(next===null)return;event.preventDefault();event.stopPropagation();const bounded=Math.max(0,Math.min(items.length-1,next));
    if(Math.floor(bounded/CONTACT_SHEET_SIZE)!==sheetPage)setSheetPage(Math.floor(bounded/CONTACT_SHEET_SIZE),{focusIndex:bounded});
    else focus(indexView.querySelector(`[data-cloud-pick="${bounded}"]`));
  }
  listen(root,'keydown',onKey);
  listen(rollNav,'click',event=>{const button=event.target.closest?.('[data-cloud-roll]');if(button)setRoll(Number(button.dataset.cloudRoll));});
  listen(subjectNav,'click',event=>{const button=event.target.closest?.('[data-cloud-subject]');if(button)setSubject(button.dataset.cloudSubject);});
  listen(indexView,'click',event=>{const button=event.target.closest?.('[data-cloud-pick]');if(button?.parentElement===indexView)openPhoto(Number(button.dataset.cloudPick));});
  listen(q('[data-cloud-sheet-prev]'),'click',()=>setSheetPage(sheetPage-1));listen(q('[data-cloud-sheet-next]'),'click',()=>setSheetPage(sheetPage+1));
  listen(q('[data-cloud-prev]'),'click',()=>selectPhoto(selected-1));listen(q('[data-cloud-next]'),'click',()=>selectPhoto(selected+1));
  listen(q('[data-cloud-back]'),'click',backToPhotos);listen(q('[data-cloud-close]'),'click',()=>close());
  listen(q('[data-cloud-retry]'),'click',()=>{if(mode==='full'){render();focus(q('[data-cloud-back]'));}});
  return {
    open(index,{roll}={}){
      if(dead||!rolls.length)return false;remember();
      if(Number.isInteger(roll)&&rolls[roll]){rememberedSubjects.set(rollIndex,subject);rollIndex=roll;subject=rememberedSubjects.get(roll)||'all';}
      restorePosition();if(index!==undefined){selected=Math.max(0,Math.min(items.length-1,Math.round(Number(index)||0)));sheetPage=Math.floor(selected/CONTACT_SHEET_SIZE);}
      opened=true;mode='index';detailOrigin=null;root.hidden=false;render();
      focus(indexView.querySelector(`[data-cloud-pick="${selected}"]`)||indexView.querySelector('button'));return true;
    },
    close,cancel:goBack,
    dispose(){if(dead)return;close({notify:false});dead=true;generation++;releaseAll();listeners.splice(0).forEach(remove=>remove());root.remove();},
    get isOpen(){return opened;},get selectedIndex(){return selected;},get selectedRoll(){return rollIndex;}
  };
}
