function node(tag,text,parent,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;parent.append(el);return el;}

function photograph(parent,item,index,{lead=false}={}){
  const figure=node('figure',undefined,parent,'hobby-story-photo');
  const button=node('button',undefined,figure,'hobby-photo-open');button.type='button';button.dataset.hobbyPhoto=String(index);button.setAttribute('aria-label',`Open photograph: ${item.caption}`);
  const image=node('img',undefined,button);image.width=item.width;image.height=item.height;image.alt=item.alt;image.loading=lead?'eager':'lazy';image.decoding='async';image.src=new URL('../'+item.src.replace(/^\.\//,''),import.meta.url).href;
  const caption=node('figcaption',item.caption,figure);
  image.addEventListener('error',()=>{image.hidden=true;button.disabled=true;caption.textContent=`${item.caption}. Photograph unavailable; the story is still here.`;},{once:true});
}

export function renderHobbiesStory(article,content,selected){
  const chapter=content.chapters[selected],photos=content.media.filter(item=>item.type==='image'&&chapter.photoIds.includes(item.id));
  article.replaceChildren();article.className='hobby-story';
  const navigation=node('nav',undefined,article,'hobby-story-navigation');navigation.setAttribute('aria-label','About Singing and Garba');
  content.chapters.forEach((item,index)=>{const button=node('button',item.label,navigation);button.type='button';button.dataset.hobbyStory=String(index);button.setAttribute('aria-pressed',String(selected===index));});
  const hero=node('div',undefined,article,'hobby-story-hero'),intro=node('div',undefined,hero,'hobby-story-intro');
  node('p',content.eyebrow,intro,'personal-eyebrow');node('h1',chapter.title,intro).id='personal-story-title';node('p',chapter.reader.lead,intro,'personal-deck');
  const enter=node('button',selected===0?'Enter the listening room':'Enter the Garba courtyard',intro,'hobby-story-enter primary');enter.type='button';enter.dataset.hobbyEnter=selected===0?'listening':'garba';
  const index=photos.findIndex(item=>item.id===chapter.reader.photoId);if(index>=0)photograph(hero,photos[index],index,{lead:true});
  const details=node('div',undefined,article,'hobby-story-details');
  for(const section of chapter.reader.sections){const block=node('section',undefined,details);node('h2',section.title,block);node('p',section.body,block);}
  const remaining=chapter.photoIds.filter(id=>id!==chapter.reader.photoId);
  if(remaining.length){const gallery=node('div',undefined,article,'hobby-story-moments');for(const id of remaining){const index=photos.findIndex(item=>item.id===id);if(index>=0)photograph(gallery,photos[index],index);}}
  const footer=node('footer',undefined,article,'hobby-story-next');node('p',selected===0?'There’s another kind of music and movement next door.':'Stay for a song before heading back.',footer);
  const other=node('button',selected===0?'About Garba':'About Singing',footer);other.type='button';other.dataset.hobbyStory=String(selected===0?1:0);
}
