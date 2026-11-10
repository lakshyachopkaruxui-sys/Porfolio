import {aboutJournalFallback} from './about-journal-fallback.js';
import {createSkyCamera} from './sky-camera.js';
import {personalRoomContent} from './personal-room-content.js';
const hobbies=personalRoomContent('memory');
const cloud=personalRoomContent('cloud');
const cloudFallback={title:cloud.title,eyebrow:'05 / THE VIEWFINDER',body:`<p class="place-intro">${cloud.intro}</p>${cloud.chapters.map(chapter=>`<section class="place-story"><h2>${chapter.title}</h2><p>${chapter.body}</p><p>${chapter.detail}</p></section>`).join('')}<p class="place-caption">${cloud.mediaNote}</p>`};

const stories={
  collection:{title:hobbies.title,eyebrow:'03 / HOBBIES',body:`<p class="place-intro">${hobbies.intro}</p>${hobbies.chapters.map(chapter=>`<section class="place-story"><h2>${chapter.title}</h2><p>${chapter.body}</p><p>${chapter.detail}</p></section>`).join('')}<p class="place-caption">${hobbies.mediaNote}</p>`},
  cloud:{title:'I collect quiet moments.',eyebrow:'05 / THE VIEWFINDER',body:`
    <p class="place-intro">I love photographing clouds. Looking up gives me a quiet moment, even on a busy day.</p>
    <div class="sky-viewfinder"><div id="sky-scene"></div><div class="viewfinder-corner top-left"></div><div class="viewfinder-corner bottom-right"></div><span class="viewfinder-label">VIRTUAL VIEWFINDER</span></div>
    <div class="postcard-caption-field"><label for="postcard-caption">Give your moment a caption <span>(optional)</span></label><input id="postcard-caption" type="text" maxlength="100" placeholder="A small moment, looking up." aria-describedby="postcard-caption-help"><small id="postcard-caption-help">Up to 100 characters. Your words appear on the downloaded postcard.</small></div>
    <div class="camera-controls"><div><button data-pan="-1" aria-label="Frame the sky to the left">←</button><button data-pan="1" aria-label="Frame the sky to the right">→</button></div><button class="primary" id="capture-postcard">Make a postcard <span aria-hidden="true">↗</span></button></div>
    <p class="place-caption">Frame a little of this illustrated sky. My own cloud photographs will have a home here later.</p>
    <p id="place-status" class="place-status" role="status" aria-live="polite"></p>
    <figure id="postcard-result" hidden><img id="postcard-image" alt="Your postcard of the illustrated sky in this world"><figcaption><span id="postcard-result-caption">Postcard from this world.</span><a id="download-postcard" download="a-moment-looking-up.png">Download image ↓</a></figcaption></figure>
    <section class="place-story"><p class="eyebrow">THE QUIETER SIDE</p><h2>A reason to pause.</h2><p>I’m usually the person moving around, meeting people, and starting conversations. Singing and cloud photography give that energy somewhere quieter to go.</p></section>`},
  music:{title:'Professor Oak’s lab',eyebrow:'04 / POKEMON · MEMORIES · MAKING',body:`
    <p class="place-intro">Pokemon and Toy Story were childhood favourites. This lab brings that part of Lakshya’s story together with his real Pokemon GO collection and the making of this garden.</p>
    <section class="place-story"><h2>A childhood wish, out in the world.</h2><p>As a child, Lakshya imagined meeting Pokemon for real. He played Pokemon GO when it arrived and still returns to it to unwind and explore.</p><p>Woody was his favourite Toy Story character. Those memories helped shape this personal world: a bicycle, a garden and places to discover his work and interests.</p></section>
    <section class="place-story"><h2>How this garden came to be.</h2><p>The garden offers another way to meet Lakshya. Each destination reveals a part of him, while the normal portfolio keeps projects directly accessible.</p><p>Roads, signs, riding movements and room transitions were refined through repeated building and visual checks. These are development iterations, not a claim of formal user research.</p></section><p class="place-caption">In the 3D lab, Professor Oak introduces the story through text bubbles and opens Lakshya’s own catch collection. No caught locations are added.</p>`},
  about:aboutJournalFallback()
};

const storyHashes={cloud:'#cloud-lookout',music:'#oak-lab',about:'#meet-lakshya',collection:'#hobbies'};
const musicStories={
  singing:{title:'A song for the moment.',body:'I sing when I’m happy, and singing also helps me slow down. It is both something I love sharing and something I return to for myself.'},
  junoon:{title:'A moment at Junoon.',body:'I performed at Junoon during my M.Des studies. Singing is one of the things I enjoy sharing with other people.'},
  garba:{title:'Room for Garba.',body:'I love Garba—the music, the movement, and being around people. That social energy is a big part of who I am.'}
};

function soundEngine(onStatus){
  let context=null,voices=[],timer=null,sequence=0;
  function stop(){sequence++;clearTimeout(timer);for(const voice of voices){try{voice.stop();}catch{}}voices=[];onStatus(false);}
  async function play(notes){
    stop();const request=sequence;
    try{
      context??=new(window.AudioContext||window.webkitAudioContext)();await context.resume();
      if(request!==sequence||context.state!=='running')return;
      const now=context.currentTime;
      for(const {note,at,duration=.75}of notes){
        const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.value=[261.63,329.63,392][note];
        gain.gain.setValueAtTime(0,now+at);gain.gain.linearRampToValueAtTime(.085,now+at+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+at+duration);oscillator.connect(gain);gain.connect(context.destination);oscillator.onended=()=>{gain.disconnect();oscillator.disconnect();};oscillator.start(now+at);oscillator.stop(now+at+duration+.04);voices.push(oscillator);
      }
      onStatus(true);const end=Math.max(...notes.map(n=>n.at+(n.duration||.75)));timer=setTimeout(()=>{voices=[];onStatus(false);},end*1000+80);
    }catch{onStatus(false,'Sound isn’t available here. The story is still yours to read.');}
  }
  return {play,stop,dispose(){stop();context?.close().catch(()=>{});context=null;}};
}

export function createDestinationUI({onOpen,onClose,onContinue,onPortfolio,onVisit,onRead=onVisit,onProject,isReduced,enableRichCloud=true}){
  const dialog=document.createElement('dialog');dialog.id='place-reader';dialog.className='place-reader';dialog.setAttribute('aria-labelledby','place-title');
  dialog.innerHTML='<div class="reader-top"><span class="mode-switch" data-mode-switch id="place-back">Portfolio / Play</span><button id="place-close" class="close-button">Return to ride <span aria-hidden="true">×</span></button></div><article id="place-article"></article>';
  document.body.append(dialog);
  const article=dialog.querySelector('article'),closeButton=dialog.querySelector('#place-close');
  let current=null,sky=null,sound=null,postcard=null,postcardCaption='',musicStory='singing';
  const aboutOpen=new Set(['ux']);
  const scrolls={cloud:0,music:0,about:0};
  // Store reading progress against content, so a postcard or viewport change cannot shift it.
  function progress(){const top=dialog.getBoundingClientRect().top;const anchors=[...article.querySelectorAll('[data-reading-anchor]')];const anchor=anchors.filter(el=>el.getBoundingClientRect().top-top<=120).at(-1);return anchor?{anchor:anchor.dataset.readingAnchor,offset:top+120-anchor.getBoundingClientRect().top}:dialog.scrollTop;}
  function restoreProgress(value){if(typeof value==='number'){dialog.scrollTop=value;return;}const anchor=[...article.querySelectorAll('[data-reading-anchor]')].find(el=>el.dataset.readingAnchor===value?.anchor);dialog.scrollTop=anchor?dialog.scrollTop+anchor.getBoundingClientRect().top-dialog.getBoundingClientRect().top-120+value.offset:0;}
  function cleanup(){sky?.dispose();sky=null;sound?.dispose();sound=null;}
  function close(){if(!dialog.open)return;if(current)scrolls[current]=progress();cleanup();dialog.close();current=null;history.replaceState(null,'',location.pathname);onClose();}
  function open(kind){
    if(!stories[kind])return false;
    if(current)scrolls[current]=progress();
    cleanup();onOpen();current=kind;const story=kind==='cloud'&&!enableRichCloud?cloudFallback:stories[kind];
    const next={about:{id:'projects',label:'Ride to the Works Room'},collection:{id:'music',label:'Ride to Oak’s lab'},music:{id:'cloud',label:'Ride to the Viewfinder'}}[kind]||null;
    article.innerHTML=`<header class="case-header"><p class="eyebrow">${story.eyebrow}</p><h1 id="place-title">${story.title}</h1></header>${story.body}<footer class="case-footer"><p>${kind==='about'?'Now, take a look at the work.':kind==='collection'?'Oak is looking after a different part of the story around the next bend.':kind==='music'?'A quieter moment is waiting at the Viewfinder.':'Stay a little, or return to the garden when you’re ready.'}</p><div class="place-footer-actions">${next&&onVisit?`<button class="primary" id="place-next">${next.label}</button>`:''}<button class="quiet-button" id="place-continue">Return to the bicycle</button></div></footer>`;
    article.querySelectorAll('.case-header,.place-intro,.sky-viewfinder,.music-playground,.place-story,.case-footer').forEach((el,i)=>el.dataset.readingAnchor=String(i));
    if(!dialog.open)dialog.showModal();closeButton.focus({preventScroll:true});history.replaceState(null,'',storyHashes[kind]);
    article.querySelector('#place-continue').addEventListener('click',()=>{close();onContinue();});
    article.querySelector('#place-next')?.addEventListener('click',()=>{close();onVisit(next.id);});
    if(kind==='cloud'&&enableRichCloud){
      const status=article.querySelector('#place-status'),capture=article.querySelector('#capture-postcard'),caption=article.querySelector('#postcard-caption');
      caption.value=postcardCaption;caption.addEventListener('input',()=>{postcardCaption=caption.value.slice(0,100);});
      try{sky=createSkyCamera(article.querySelector('#sky-scene'),isReduced);}catch{capture.disabled=true;article.querySelector('#sky-scene').classList.add('sky-fallback');status.textContent='The virtual camera isn’t available here. You can still read the story.';}
      article.querySelectorAll('[data-pan]').forEach(b=>b.addEventListener('click',()=>sky?.move(Number(b.dataset.pan))));
      function showPostcard(){const image=article.querySelector('#postcard-image');image.src=postcard.url;image.width=postcard.width;image.height=postcard.height;image.alt=`Illustrated sky postcard: ${postcard.caption}`;article.querySelector('#postcard-result-caption').textContent=postcard.caption;article.querySelector('#download-postcard').href=postcard.url;article.querySelector('#postcard-result').hidden=false;}
      if(postcard)showPostcard();
      capture.addEventListener('click',()=>{try{postcard=sky.capture(postcardCaption);showPostcard();status.textContent='Your virtual postcard is ready below. It includes your caption.';}catch{status.textContent='The postcard couldn’t be captured. Please try another view.';}});
    }else if(kind==='about'){
      article.querySelectorAll('[data-about-destination]').forEach(button=>button.addEventListener('click',()=>{close();onRead?.(button.dataset.aboutDestination);}));
      article.querySelectorAll('[data-about-project]').forEach(button=>{button.disabled=!onProject;button.addEventListener('click',()=>{close();onProject?.(button.dataset.aboutProject);});});
      article.querySelectorAll('[data-about-question]').forEach(detail=>{detail.open=aboutOpen.has(detail.dataset.aboutQuestion);detail.addEventListener('toggle',()=>{if(detail.open)aboutOpen.add(detail.dataset.aboutQuestion);else aboutOpen.delete(detail.dataset.aboutQuestion);});});
    }
    restoreProgress(scrolls[kind]);return true;
  }
  closeButton.addEventListener('click',close);dialog.querySelector('#place-back').addEventListener('click',onPortfolio);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)sound?.stop();});window.addEventListener('blur',()=>sound?.stop());
  return {open,close,get isOpen(){return dialog.open;},get scrolls(){return {...scrolls,...(current?{[current]:progress()}:{})};},restoreScrolls(saved){for(const key of Object.keys(scrolls)){const value=saved?.[key];if(Number.isFinite(value))scrolls[key]=Math.max(0,value);else if(typeof value?.anchor==='string'&&Number.isFinite(value.offset))scrolls[key]={anchor:value.anchor,offset:Math.max(0,value.offset)};}}};
}
