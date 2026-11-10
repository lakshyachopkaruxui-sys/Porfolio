let readerSerial=0;

/** A semantic notebook inside the About owner's dialog. It owns no 3D resources. */
export function createAboutJournalReader({host,content,photos=[],onClose=()=>{},onNavigate=()=>{},onPhotoState=()=>{},isReduced=()=>false}={}){
  if(!host?.ownerDocument&&!host?.document)throw new TypeError('A journal host is required.');
  const doc=host.ownerDocument||host.document,chapters=content?.chapters||[],photoById=new Map(photos.map(photo=>[photo.id,photo]));
  const id=`about-journal-${++readerSerial}`,root=doc.createElement('section');
  root.className='about-journal-reader';root.hidden=true;root.tabIndex=-1;
  root.setAttribute('role','region');root.setAttribute('aria-label',content?.title||'Lakshya’s notebook');
  root.innerHTML=`<nav class="journal-chapters" aria-label="Notebook chapters" role="tablist" data-journal-tabs></nav>
    <div class="journal-book-stage" data-journal-stage><div class="journal-book" data-journal-book role="tabpanel" id="${id}-spread">
      <article class="journal-page journal-page-left" data-journal-left tabindex="0"></article>
      <article class="journal-page journal-page-right" data-journal-right tabindex="0"></article>
    </div><div class="journal-binding" aria-hidden="true"></div></div>
    <footer class="journal-footer"><nav class="journal-page-navigation" aria-label="Turn notebook pages"><button type="button" data-journal-prev>Previous spread</button><div><p data-journal-count aria-live="polite"></p><p class="journal-key-hint">A / D or ← / → to turn · Esc to close</p></div><button type="button" data-journal-next>Next spread</button><button type="button" data-journal-close>Close notebook</button></nav></footer>
    <section id="about-journal-photo" class="journal-photo-viewer" data-journal-viewer role="region" aria-labelledby="${id}-photo-title" tabindex="-1" hidden>
      <header><div><p>FROM MY NOTEBOOK</p><h2 id="${id}-photo-title" data-journal-photo-title></h2></div><button type="button" data-journal-photo-close>Back to the notebook</button></header>
      <figure><img decoding="async" data-journal-full-photo alt=""><figcaption data-journal-photo-caption></figcaption></figure>
      <p class="journal-photo-status" data-journal-photo-status role="status" aria-live="polite"></p><button type="button" class="journal-photo-retry" data-journal-photo-retry hidden>Retry photograph</button>
      <footer><button type="button" data-journal-photo-prev>Previous photo</button><p data-journal-photo-count aria-live="polite"></p><button type="button" data-journal-photo-next>Next photo</button></footer>
    </section>`;
  host.append(root);
  const q=selector=>root.querySelector(selector),book=q('[data-journal-book]'),stage=q('[data-journal-stage]'),tabs=q('[data-journal-tabs]');
  const pages=[q('[data-journal-left]'),q('[data-journal-right]')],viewer=q('[data-journal-viewer]'),fullImage=q('[data-journal-full-photo]');
  const listeners=[],imageListeners=new Map(),motions=[];
  let opened=false,dead=false,selected=0,turnGeneration=0,turnLeaf=null,heldPage=null;
  let photoOpened=false,photoIndex=0,photoGeneration=0,photoFocus=null,inertSiblings=[];
  const listen=(element,type,handler,options)=>{element.addEventListener(type,handler,options);listeners.push(()=>element.removeEventListener(type,handler,options));};
  const focus=element=>element?.focus({preventScroll:true});
  const motionQuery=(doc.defaultView||globalThis.window)?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced=()=>Boolean(isReduced()||motionQuery?.matches);
  const resolve=photo=>new URL('../'+photo.src.replace(/^\.\//,''),import.meta.url).href;
  const node=(tag,text,parent,className)=>{const element=doc.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;parent?.append(element);return element;};

  chapters.forEach((chapter,index)=>{
    const button=node('button',chapter.label,tabs);button.type='button';button.id=`${id}-tab-${index}`;button.dataset.journalChapter=String(index);
    button.setAttribute('role','tab');button.setAttribute('aria-controls',`${id}-spread`);
  });

  function releaseImage(image){
    imageListeners.get(image)?.();imageListeners.delete(image);image.removeAttribute('src');image.removeAttribute('srcset');image.dataset.loaded='false';
  }
  function releasePages(){for(const page of pages)for(const image of page.querySelectorAll('img'))releaseImage(image);}
  function loadPagePhoto(image,photo,figure){
    releaseImage(image);image.width=photo.width;image.height=photo.height;image.alt=photo.alt||photo.caption||'Photograph of Lakshya';
    const loaded=()=>{if(!opened||dead||!image.isConnected)return;image.dataset.loaded='true';figure.dataset.loading='false';};
    const failed=()=>{if(!opened||dead||!image.isConnected)return;image.dataset.loaded='error';figure.dataset.loading='error';};
    image.addEventListener('load',loaded);image.addEventListener('error',failed);
    imageListeners.set(image,()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',failed);});
    image.src=resolve(photo);if(image.complete&&image.naturalWidth>0)loaded();
  }
  function photoBlock(block,parent){
    const photo=photoById.get(block.photoId);if(!photo?.src||!photo.width||!photo.height)return;
    const figure=node('figure',undefined,parent,'journal-photo');figure.dataset.loading='true';
    const button=node('button',undefined,figure,'journal-photo-button');button.type='button';button.dataset.journalPhoto=photo.id;
    button.setAttribute('aria-label',`View full photograph: ${block.caption||photo.caption}`);
    const image=node('img',undefined,button);image.decoding='async';image.loading='lazy';loadPagePhoto(image,photo,figure);
    node('figcaption',block.caption||photo.caption,figure);node('span','Open photograph',button,'journal-photo-affordance');
    node('p','This photograph could not load. Open it to try again.',figure,'journal-photo-error');
  }
  function renderBlock(block,parent){
    if(!block||typeof block!=='object')return;
    if(block.type==='photo'){photoBlock(block,parent);return;}
    if(block.type==='text'){
      const section=node('section',undefined,parent,'journal-text');if(block.title)node('h4',block.title,section);if(block.body)node('p',block.body,section);return;
    }
    if(block.type==='timeline'){
      const list=node('ol',undefined,parent,'journal-timeline');
      for(const entry of block.entries||[]){const item=node('li',undefined,list);if(entry.date)node('p',entry.date,item,'journal-date');node('h4',entry.title,item);if(entry.body)node('p',entry.body,item);}return;
    }
    if(block.type==='toolkit'){
      const list=node('div',undefined,parent,'journal-toolkit');
      for(const group of block.groups||[]){
        const section=node('section',undefined,list);node('h4',group.title,section);if(group.body)node('p',group.body,section);
        if(group.tools?.length){const tools=node('ul',undefined,section,'journal-tools');for(const tool of group.tools)node('li',tool,tools);}
      }return;
    }
    if(block.type==='decision'){
      const section=node('section',undefined,parent,'journal-decision');node('h4',block.title,section);
      const list=node('dl',undefined,section);
      for(const [field,label]of [['friction','What happened'],['decision','The decision'],['next','What comes next']])if(block[field]){node('dt',label,list);node('dd',block[field],list);}
      if(block.projectId){const button=node('button','Explore this project in Work',section,'journal-inline-link');button.type='button';button.dataset.journalNavigate='projects';button.dataset.journalProject=block.projectId;}return;
    }
    if(block.type==='links'){
      const nav=node('nav',undefined,parent,'journal-destinations');nav.setAttribute('aria-label','Explore more of Lakshya’s portfolio');
      for(const item of block.items||[])if(['projects','work','cloud','music'].includes(item.destination)){const button=node('button',item.label,nav);button.type='button';button.dataset.journalNavigate=item.destination;}
    }
  }
  function render(){
    releasePages();const chapter=chapters[selected];
    for(const [index,page]of pages.entries()){
      page.replaceChildren();page.scrollTop=0;page.setAttribute('aria-label',`${index===0?'Left':'Right'} page: ${chapter.pages?.[index]?.title||chapter.title}`);
      if(index===0){node('p',`${String(selected+1).padStart(2,'0')} / ${String(chapters.length).padStart(2,'0')} · ${chapter.label}`,page,'journal-kicker');const heading=node('h2',chapter.title,page,'journal-chapter-title');heading.id=`${id}-chapter-title`;if(chapter.lead)node('p',chapter.lead,page,'journal-lead');}
      const data=chapter.pages?.[index];if(data?.title)node('h3',data.title,page,'journal-page-title');
      for(const block of data?.blocks||[])renderBlock(block,page);
      node('p',String(selected*2+index+1).padStart(2,'0'),page,'journal-folio');
    }
    const buttons=[...tabs.querySelectorAll('button')];buttons.forEach((button,index)=>{button.setAttribute('aria-selected',String(index===selected));button.tabIndex=index===selected?0:-1;});
    book.setAttribute('aria-labelledby',`${id}-tab-${selected}`);
    q('[data-journal-count]').textContent=`Spread ${selected+1} of ${chapters.length} · Pages ${selected*2+1}–${selected*2+2}`;
    q('[data-journal-prev]').disabled=selected===0;q('[data-journal-next]').disabled=selected===chapters.length-1;
    root.dataset.chapter=chapter.id;root.dataset.reduced=String(reduced());
  }
  function clearTurn(){
    turnGeneration++;for(const motion of motions.splice(0)){motion.onfinish=null;motion.oncancel=null;motion.cancel();}
    turnLeaf?.remove();heldPage?.remove();turnLeaf=null;heldPage=null;root.dataset.turning='false';
  }
  function decorativeCopy(source){
    if(typeof source.cloneNode!=='function')return null;
    const clone=source.cloneNode(true);clone.setAttribute('aria-hidden','true');clone.inert=true;clone.tabIndex=-1;clone.removeAttribute('id');
    clone.dataset.journalScroll=String(source.scrollTop||0);
    for(const element of clone.querySelectorAll('[id]'))element.removeAttribute('id');
    for(const button of clone.querySelectorAll('button')){button.disabled=true;button.tabIndex=-1;}
    // Reuse an already requested image as a decorative cached background. A
    // turning leaf never introduces another image element or a new asset URL.
    const originals=[...source.querySelectorAll('img')],copies=[...clone.querySelectorAll('img')];
    copies.forEach((image,index)=>{
      const original=originals[index],placeholder=doc.createElement('span');placeholder.className='journal-leaf-image';
      const url=original?.currentSrc||original?.src;if(url)placeholder.style.backgroundImage=`url(${JSON.stringify(url)})`;
      placeholder.style.height=`${original?.clientHeight||Math.min(240,original?.height||180)}px`;
      image.removeAttribute('src');image.removeAttribute('srcset');image.parentNode?.insertBefore(placeholder,image);image.remove();
    });
    return clone;
  }
  function beginTurn(before,direction){
    if(!before||reduced()||typeof stage.animate!=='function')return;
    const token=turnGeneration,forward=direction>0,turnIndex=forward?1:0,heldIndex=1-turnIndex;
    const face=before[turnIndex],back=decorativeCopy(pages[heldIndex]);heldPage=before[heldIndex];
    if(!face||!back||!heldPage){heldPage?.remove();heldPage=null;return;}
    turnLeaf=node('div',undefined,stage,`journal-turn-leaf ${forward?'journal-turn-forward':'journal-turn-back'}`);turnLeaf.setAttribute('aria-hidden','true');turnLeaf.inert=true;
    const front=node('div',undefined,turnLeaf,'journal-leaf-face journal-leaf-front'),rear=node('div',undefined,turnLeaf,'journal-leaf-face journal-leaf-back');front.append(face);rear.append(back);
    heldPage.classList.add('journal-held-page',forward?'journal-held-left':'journal-held-right');heldPage.setAttribute('aria-hidden','true');heldPage.inert=true;stage.append(heldPage);
    for(const page of [face,back,heldPage])page.scrollTop=Number(page.dataset.journalScroll)||0;
    const sign=forward?-1:1,options={duration:460,easing:'cubic-bezier(.2,.65,.25,1)',fill:'both'};
    const turning=turnLeaf.animate([{transform:'rotateY(0deg)'},{transform:`rotateY(${sign*180}deg)`}],options);
    const holding=heldPage.animate([{opacity:1,offset:0},{opacity:1,offset:.46},{opacity:0,offset:.54},{opacity:0,offset:1}],{...options,easing:'linear'});
    motions.push(turning,holding);root.dataset.turning='true';
    turning.onfinish=()=>{if(token!==turnGeneration||!opened||dead)return;clearTurn();};
  }
  function setChapter(value){
    if(!opened||dead||!chapters.length)return false;
    const next=Math.max(0,Math.min(chapters.length-1,Math.round(Number(value)||0)));if(next===selected){if(reduced())clearTurn();return false;}
    closePhoto({restoreFocus:false});clearTurn();
    const origin=doc.activeElement,fromTab=Boolean(origin?.closest?.('[data-journal-chapter]')),fromPage=pages.some(page=>page===origin||page.contains?.(origin));
    const before=!reduced()&&typeof stage.animate==='function'?pages.map(decorativeCopy):null;
    const direction=next>selected?1:-1;selected=next;render();beginTurn(before,direction);
    if(fromTab){const target=tabs.querySelector(`[data-journal-chapter="${selected}"]`);focus(target);target?.scrollIntoView?.({block:'nearest',inline:'nearest'});}
    else if(fromPage||origin?.disabled||!origin?.isConnected)focus(pages[0]);
    return true;
  }
  function renderPhoto(){
    const photo=photos[photoIndex];if(!photo?.src)return;
    photoGeneration++;const token=photoGeneration;releaseImage(fullImage);
    q('[data-journal-photo-title]').textContent=photo.caption||'A photograph from my notebook';q('[data-journal-photo-caption]').textContent=photo.alt||photo.caption||'';
    q('[data-journal-photo-count]').textContent=`${photoIndex+1} / ${photos.length}`;
    q('[data-journal-photo-prev]').disabled=photoIndex===0;q('[data-journal-photo-next]').disabled=photoIndex===photos.length-1;
    q('[data-journal-photo-status]').textContent='Loading photograph…';q('[data-journal-photo-retry]').hidden=true;
    fullImage.width=photo.width;fullImage.height=photo.height;fullImage.alt=photo.alt||photo.caption||'Photograph of Lakshya';
    const loaded=()=>{if(!opened||!photoOpened||dead||token!==photoGeneration)return;fullImage.dataset.loaded='true';q('[data-journal-photo-status]').textContent='';};
    const failed=()=>{if(!opened||!photoOpened||dead||token!==photoGeneration)return;fullImage.dataset.loaded='error';q('[data-journal-photo-status]').textContent='This photograph could not load.';q('[data-journal-photo-retry]').hidden=false;};
    fullImage.addEventListener('load',loaded);fullImage.addEventListener('error',failed);imageListeners.set(fullImage,()=>{fullImage.removeEventListener('load',loaded);fullImage.removeEventListener('error',failed);});
    fullImage.src=resolve(photo);if(fullImage.complete&&fullImage.naturalWidth>0)loaded();
  }
  function openPhoto(photoId,trigger){
    const index=photos.findIndex(photo=>photo.id===photoId);if(!opened||index<0)return false;
    if(photoOpened)return selectPhoto(index);
    clearTurn();photoFocus=trigger||doc.activeElement;photoOpened=true;photoIndex=index;viewer.hidden=false;
    inertSiblings=[...root.children].filter(element=>element!==viewer).map(element=>[element,element.inert]);inertSiblings.forEach(([element])=>{element.inert=true;});
    renderPhoto();onPhotoState(true);focus(q('[data-journal-photo-close]'));return true;
  }
  function closePhoto({restoreFocus=true}={}){
    if(!photoOpened)return false;photoOpened=false;photoGeneration++;releaseImage(fullImage);viewer.hidden=true;
    inertSiblings.forEach(([element,inert])=>{element.inert=inert;});inertSiblings=[];q('[data-journal-photo-status]').textContent='';onPhotoState(false);
    const previous=photoFocus;photoFocus=null;if(restoreFocus)focus(previous?.isConnected?previous:pages[0]);return true;
  }
  function selectPhoto(value){
    if(!photoOpened)return false;const next=Math.max(0,Math.min(photos.length-1,Math.round(Number(value)||0)));if(next===photoIndex)return false;
    const origin=doc.activeElement;photoIndex=next;renderPhoto();if(origin?.disabled)focus(q('[data-journal-photo-close]'));return true;
  }
  function close({notify=true}={}){
    if(!opened)return false;closePhoto({restoreFocus:false});clearTurn();opened=false;root.hidden=true;releasePages();pages.forEach(page=>page.replaceChildren());if(notify)onClose();return true;
  }
  function cancel(){return photoOpened?closePhoto():close();}
  if(motionQuery?.addEventListener)listen(motionQuery,'change',()=>{if(reduced())clearTurn();});
  listen(root,'click',event=>{
    if(!opened||dead)return;
    const photo=event.target.closest?.('[data-journal-photo]');if(photo){openPhoto(photo.dataset.journalPhoto,photo);return;}
    const chapter=event.target.closest?.('[data-journal-chapter]');if(chapter){setChapter(Number(chapter.dataset.journalChapter));return;}
    const destination=event.target.closest?.('[data-journal-navigate]');if(destination&&!photoOpened)onNavigate(destination.dataset.journalProject?'project:'+destination.dataset.journalProject:destination.dataset.journalNavigate);
  });
  listen(q('[data-journal-prev]'),'click',()=>setChapter(selected-1));listen(q('[data-journal-next]'),'click',()=>setChapter(selected+1));listen(q('[data-journal-close]'),'click',()=>close());
  listen(q('[data-journal-photo-close]'),'click',()=>closePhoto());listen(q('[data-journal-photo-prev]'),'click',()=>selectPhoto(photoIndex-1));listen(q('[data-journal-photo-next]'),'click',()=>selectPhoto(photoIndex+1));listen(q('[data-journal-photo-retry]'),'click',renderPhoto);
  listen(root,'keydown',event=>{
    if(!opened||event.defaultPrevented||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
    if(event.target?.isContentEditable||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    const key=event.key?.toLowerCase(),direction=key==='a'||key==='arrowleft'?-1:key==='d'||key==='arrowright'?1:0;
    if(key!=='escape'&&!direction&&key!=='home'&&key!=='end')return;
    event.preventDefault();event.stopPropagation();if(event.repeat)return;
    if(key==='escape'){cancel();return;}
    if(photoOpened)selectPhoto(key==='home'?0:key==='end'?photos.length-1:photoIndex+direction);
    else setChapter(key==='home'?0:key==='end'?chapters.length-1:selected+direction);
  });
  return {
    open({chapter=0}={}){if(dead||opened||!chapters.length)return false;selected=Math.max(0,Math.min(chapters.length-1,Math.round(Number(chapter)||0)));opened=true;root.hidden=false;render();focus(pages[0]);return true;},
    close,cancel,setChapter,
    dispose(){if(dead)return;close({notify:false});clearTurn();releaseImage(fullImage);listeners.splice(0).forEach(remove=>remove());root.remove();dead=true;},
    get isOpen(){return opened;},get selectedChapter(){return selected;},get photoOpen(){return photoOpened;},
    diagnostics(){return {isOpen:opened,selectedChapter:selected,photoOpen:photoOpened,photoIndex,turning:Boolean(turnLeaf),turnLeaves:turnLeaf?1:0,pageImageSources:pages.reduce((sum,page)=>sum+[...page.querySelectorAll('img')].filter(image=>image.getAttribute('src')).length,0),viewerImageSources:fullImage.getAttribute('src')?1:0,activeAnimations:motions.length,totalPhotos:photos.length};}
  };
}
