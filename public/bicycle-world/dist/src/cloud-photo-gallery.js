/** A bounded, DOM-only photo gallery. The parent owns scene pause and return focus. */
export function createCloudPhotoGallery({host,photos=[],collections=[],onClose=()=>{},isReduced=()=>false}={}){
  if(!host?.ownerDocument&&!host?.document)throw new TypeError('A gallery host is required.');
  const doc=host.ownerDocument||host.document;
  const valid=photos=>photos.filter(photo=>photo&&typeof photo.src==='string'&&photo.src&&photo.width>0&&photo.height>0);
  const rolls=(collections.length?collections:[{id:'clouds',label:'Clouds',title:'The skies I stop for.',intro:'Cloud photographs I’ve taken when the sky made me pause.',photos}]).map(roll=>({...roll,photos:valid(roll.photos||[])})).filter(roll=>roll.photos.length);
  let rollIndex=0,items=rolls[0]?.photos||[];
  const remembered=new Map();
  const root=doc.createElement('section');root.className='cloud-photo-gallery';root.hidden=true;root.tabIndex=-1;
  root.setAttribute('role','region');root.setAttribute('aria-label','Lakshya’s photography reels');
  root.innerHTML=`<header class="cloud-gallery-header"><div><p class="cloud-gallery-eyebrow">THROUGH MY PHONE</p><h2 data-cloud-title>The skies I stop for.</h2><p class="cloud-gallery-intro">A few cloud photographs I’ve taken when the sky made me pause.</p></div><div class="cloud-gallery-header-actions"><button type="button" data-cloud-index>Contact sheet</button><button type="button" data-cloud-close>Back to the lookout</button></div></header><nav class="cloud-gallery-rolls" aria-label="Choose a photography reel"></nav><div class="cloud-gallery-stage" data-cloud-stage><button type="button" class="cloud-photo-card" data-cloud-slot="-1"><img alt="" decoding="async"><span class="cloud-photo-edge-caption"></span></button><button type="button" class="cloud-photo-card" data-cloud-slot="0"><img alt="" decoding="async"></button><button type="button" class="cloud-photo-card" data-cloud-slot="1"><img alt="" decoding="async"><span class="cloud-photo-edge-caption"></span></button><div class="cloud-gallery-load" role="status" aria-live="polite"><span data-cloud-status></span><button type="button" data-cloud-retry hidden>Retry photograph</button></div></div><section class="cloud-gallery-index" aria-label="Photograph contact sheet" hidden></section><footer class="cloud-gallery-footer"><div class="cloud-gallery-caption"><p data-cloud-count aria-live="polite"></p><h3 data-cloud-caption></h3></div><nav class="cloud-gallery-actions" aria-label="Browse the photo reel"><button type="button" data-cloud-prev>Previous photo</button><button type="button" class="cloud-gallery-primary" data-cloud-inspect>View full photograph</button><button type="button" data-cloud-zoom hidden>Zoom photograph</button><button type="button" data-cloud-next>Next photo</button></nav><div class="cloud-gallery-bottom"><p data-cloud-hint>Scroll or drag the reel · A / D to browse · Esc to go back</p><div class="cloud-gallery-tools"></div></div></footer>`;
  host.append(root);
  const q=selector=>root.querySelector(selector),stage=q('[data-cloud-stage]'),indexView=q('.cloud-gallery-index');
  const cards=[...root.querySelectorAll('[data-cloud-slot]')],listeners=[],pending=new Map(),animations=new Map();
  let dragOrigin=null,suppressClick=false,wheelDistance=0,lastWheel=0;
  let opened=false,dead=false,selected=0,mode='gallery',zoomed=false,generation=0;
  const listen=(element,type,fn,options)=>{element.addEventListener(type,fn,options);listeners.push(()=>element.removeEventListener(type,fn,options));};
  const focus=element=>element?.focus({preventScroll:true});
  const resolve=photo=>new URL('../'+photo.src.replace(/^\.\//,''),import.meta.url).href;
  const rollNav=q('.cloud-gallery-rolls');
  rolls.forEach((roll,index)=>{const button=doc.createElement('button');button.type='button';button.dataset.cloudRoll=String(index);button.textContent=roll.label;rollNav.append(button);});
  rollNav.hidden=rolls.length<2;
  function releaseImage(image){
    animations.get(image)?.cancel();animations.delete(image);
    const cleanup=pending.get(image);if(cleanup){cleanup();pending.delete(image);}
    image.removeAttribute('src');image.removeAttribute('srcset');image.dataset.loaded='false';
  }
  function loadImage(image,photo,{primary=false}={}){
    releaseImage(image);const token=generation;
    image.width=photo.width;image.height=photo.height;image.alt=photo.alt||photo.caption||'Photograph by Lakshya';
    const loaded=()=>{
      if(dead||!opened||token!==generation)return;
      if(image.dataset.loaded==='true')return;
      image.dataset.loaded='true';if(primary){q('[data-cloud-status]').textContent='';q('[data-cloud-retry]').hidden=true;root.dataset.loading='false';}
      if(primary&&!isReduced()&&image.animate)animations.set(image,image.animate([{opacity:0,transform:`translateX(${root.dataset.direction==='back'?-36:36}px)`},{opacity:1,transform:'translateX(0)'}],{duration:300,easing:'cubic-bezier(.2,.7,.2,1)'}));
    };
    const failed=()=>{
      if(dead||!opened||token!==generation)return;
      image.dataset.loaded='error';if(primary){q('[data-cloud-status]').textContent='This photograph could not load.';q('[data-cloud-retry]').hidden=false;root.dataset.loading='false';}
    };
    image.addEventListener('load',loaded);image.addEventListener('error',failed);
    pending.set(image,()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',failed);});
    image.src=resolve(photo);
    if(image.complete&&image.naturalWidth>0)loaded();
  }
  function releaseAll(){for(const image of root.querySelectorAll('img'))releaseImage(image);indexView.replaceChildren();}
  function setZoom(value){zoomed=Boolean(value&&mode==='full');root.dataset.zoomed=String(zoomed);q('[data-cloud-zoom]').textContent=zoomed?'Fit photograph':'Zoom photograph';q('[data-cloud-zoom]').setAttribute('aria-pressed',String(zoomed));stage.scrollTop=0;stage.scrollLeft=0;q('[data-cloud-hint]').textContent=zoomed?'Scroll to explore · Esc to fit the photograph':mode==='index'?'Tab to choose a photograph · Enter to open · Esc to go back':'Scroll or drag the reel · A / D to browse · Esc to go back';}
  function render(){
    if(!opened||dead)return;generation++;setZoom(false);
    const roll=rolls[rollIndex];root.dataset.roll=roll.id;
    q('[data-cloud-title]').textContent=roll.title;q('.cloud-gallery-intro').textContent=roll.intro;
    for(const button of rollNav.querySelectorAll('button'))button.setAttribute('aria-pressed',String(Number(button.dataset.cloudRoll)===rollIndex));
    root.dataset.mode=mode;root.dataset.reduced=String(Boolean(isReduced()));
    stage.hidden=mode==='index';indexView.hidden=mode!=='index';q('.cloud-gallery-caption').hidden=mode==='index';q('.cloud-gallery-actions').hidden=mode==='index';
    q('[data-cloud-index]').textContent=mode==='index'?'Back to reel':'Contact sheet';q('[data-cloud-index]').setAttribute('aria-expanded',String(mode==='index'));
    q('[data-cloud-inspect]').textContent=mode==='full'?'Back to reel':'View full photograph';q('[data-cloud-zoom]').hidden=mode!=='full';
    q('[data-cloud-prev]').disabled=selected===0;q('[data-cloud-next]').disabled=selected===items.length-1;
    q('[data-cloud-count]').textContent=`${String(selected+1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')} · ${roll.label}`;
    q('[data-cloud-caption]').textContent=items[selected]?.caption||'Photograph';
    q('[data-cloud-status]').textContent='';q('[data-cloud-retry]').hidden=true;root.dataset.loading='false';
    for(const image of indexView.querySelectorAll('img'))releaseImage(image);indexView.replaceChildren();
    for(const card of cards){
      const offset=Number(card.dataset.cloudSlot),index=selected+offset,photo=items[index],image=card.querySelector('img');
      const exposed=mode!=='index'&&photo&&(mode!=='full'||offset===0);card.hidden=!exposed;
      if(!exposed){releaseImage(image);continue;}
      card.dataset.index=String(index);card.style.setProperty('--cloud-photo-ratio',String(photo.width/photo.height));card.style.setProperty('--cloud-photo-width',`${photo.width}px`);
      card.setAttribute('aria-label',offset===0?(mode==='full'?'Zoom photograph':`View full photograph: ${photo.caption}`):`${offset<0?'Previous':'Next'} photograph: ${photo.caption}`);
      if(offset!==0)card.querySelector('.cloud-photo-edge-caption').textContent=photo.caption;
      else{q('[data-cloud-status]').textContent='Loading photograph…';root.dataset.loading='true';}
      loadImage(image,photo,{primary:offset===0});
    }
    if(mode==='index')items.forEach((photo,index)=>{
      const button=doc.createElement('button');button.type='button';button.dataset.cloudPick=String(index);button.className='cloud-gallery-index-card';
      button.setAttribute('aria-label',`Photograph ${index+1}: ${photo.caption}`);button.setAttribute('aria-pressed',String(index===selected));
      const image=doc.createElement('img');image.decoding='async';image.loading='lazy';const caption=doc.createElement('span');caption.textContent=`${String(index+1).padStart(2,'0')}  ${photo.caption}`;button.append(image,caption);indexView.append(button);loadImage(image,photo.thumb?{...photo,src:photo.thumb}:photo);
    });
    root.scrollTop=0;root.scrollLeft=0;
  }
  function select(value,{moveFocus=false}={}){
    if(!opened||!items.length)return false;const next=Math.max(0,Math.min(items.length-1,Math.round(Number(value)||0)));if(next===selected)return false;
    const origin=doc.activeElement,wasPrevious=origin===q('[data-cloud-prev]'),wasNext=origin===q('[data-cloud-next]');root.dataset.direction=next<selected?'back':'forward';selected=next;remembered.set(rollIndex,selected);render();
    if(moveFocus||(wasPrevious&&selected===0)||(wasNext&&selected===items.length-1))focus(q('[data-cloud-inspect]'));return true;
  }
  function setRoll(index){
    if(!opened||!rolls[index]||index===rollIndex)return false;
    remembered.set(rollIndex,selected);rollIndex=index;items=rolls[index].photos;selected=remembered.get(index)||0;mode='gallery';render();focus(q('[data-cloud-inspect]'));return true;
  }
  function setMode(value){if(!opened)return;mode=value;render();focus(value==='index'?indexView.querySelector(`[data-cloud-pick="${selected}"]`):q('[data-cloud-inspect]'));}
  function close({notify=true}={}){if(!opened)return false;remembered.set(rollIndex,selected);opened=false;generation++;dragOrigin=null;wheelDistance=0;root.hidden=true;releaseAll();q('[data-cloud-status]').textContent='';root.dataset.loading='false';if(notify)onClose({roll:rollIndex,selectedIndex:selected});return true;}
  function goBack(){if(!opened)return false;if(zoomed){setZoom(false);focus(q('[data-cloud-zoom]'));return true;}if(mode==='index'||mode==='full'){setMode('gallery');return true;}return close();}
  function onKey(event){
    if(!opened||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.isComposing)return;
    const target=event.target;if(target?.isContentEditable||target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    const key=event.key?.toLowerCase();if(key==='escape'){event.preventDefault();event.stopPropagation();if(!event.repeat)goBack();return;}
    if(event.repeat)return;
    if(mode==='index'||zoomed)return;
    let value;if(key==='a'||key==='arrowleft')value=selected-1;else if(key==='d'||key==='arrowright')value=selected+1;else if(key==='home')value=0;else if(key==='end')value=items.length-1;else return;
    event.preventDefault();event.stopPropagation();select(value);
  }
  listen(root,'keydown',onKey);
  listen(rollNav,'click',event=>{const button=event.target.closest?.('[data-cloud-roll]');if(button)setRoll(Number(button.dataset.cloudRoll));});
  listen(stage,'wheel',event=>{
    if(!opened||mode==='index'||zoomed||event.ctrlKey||event.metaKey)return;
    const delta=Math.abs(event.deltaX||0)>Math.abs(event.deltaY||0)?event.deltaX:event.deltaY;
    if(!delta)return;event.preventDefault();wheelDistance+=delta*(event.deltaMode===1?16:1);
    const now=event.timeStamp||Date.now();if(Math.abs(wheelDistance)<60||now-lastWheel<280)return;
    select(selected+Math.sign(wheelDistance));wheelDistance=0;lastWheel=now;
  },{passive:false});
  listen(stage,'pointerdown',event=>{if(event.button===0&&!zoomed){dragOrigin={x:event.clientX,y:event.clientY};suppressClick=false;}});
  listen(stage,'pointerup',event=>{if(!dragOrigin)return;const dx=event.clientX-dragOrigin.x,dy=event.clientY-dragOrigin.y;dragOrigin=null;if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)){suppressClick=true;select(selected-Math.sign(dx),{moveFocus:true});}});
  listen(stage,'pointercancel',()=>{dragOrigin=null;});
  listen(q('[data-cloud-close]'),'click',()=>close());
  listen(q('[data-cloud-prev]'),'click',()=>select(selected-1));listen(q('[data-cloud-next]'),'click',()=>select(selected+1));
  listen(q('[data-cloud-inspect]'),'click',()=>setMode(mode==='full'?'gallery':'full'));
  listen(q('[data-cloud-index]'),'click',()=>setMode(mode==='index'?'gallery':'index'));
  listen(q('[data-cloud-zoom]'),'click',()=>setZoom(!zoomed));
  listen(q('[data-cloud-retry]'),'click',()=>{render();focus(q('[data-cloud-inspect]'));});
  cards.forEach(card=>listen(card,'click',()=>{if(suppressClick){suppressClick=false;return;}const offset=Number(card.dataset.cloudSlot);if(offset===0){if(mode==='full')setZoom(!zoomed);else setMode('full');}else select(selected+offset,{moveFocus:true});}));
  listen(indexView,'click',event=>{const button=event.target.closest?.('[data-cloud-pick]');if(!button||button.parentElement!==indexView)return;selected=Number(button.dataset.cloudPick);setMode('gallery');});
  return {
    open(index,{roll}={}){if(dead||!rolls.length)return false;if(Number.isInteger(roll)&&rolls[roll]){remembered.set(rollIndex,selected);rollIndex=roll;items=rolls[rollIndex].photos;selected=remembered.get(rollIndex)||0;}if(index!==undefined)selected=Math.max(0,Math.min(items.length-1,Math.round(Number(index)||0)));opened=true;mode='gallery';root.hidden=false;render();focus(q('[data-cloud-inspect]'));return true;},
    close,cancel:goBack,
    dispose(){if(dead)return;close({notify:false});dead=true;generation++;releaseAll();listeners.splice(0).forEach(remove=>remove());root.remove();},
    get isOpen(){return opened;},get selectedIndex(){return selected;},get selectedRoll(){return rollIndex;}
  };
}
