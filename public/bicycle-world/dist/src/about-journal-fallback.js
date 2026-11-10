import {ABOUT_JOURNAL} from './about-journal-content.js';
import {ABOUT_JOURNAL_PHOTOS} from './about-journal-photo-data.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function blockHTML(block){
  const title=block.title?`<h3>${escape(block.title)}</h3>`:'';
  if(block.type==='text')return title+`<p>${escape(block.body)}</p>`;
  if(block.type==='photo'){const photo=ABOUT_JOURNAL_PHOTOS.find(photo=>photo.id===block.photoId);return photo?`<figure class="about-fallback-photo"><img src="${escape(photo.src)}" width="${photo.width}" height="${photo.height}" alt="${escape(photo.alt)}" loading="lazy"><figcaption>${escape(block.caption||photo.caption)}</figcaption></figure>`:'';}
  if(block.type==='timeline')return `<ol class="about-fallback-timeline">${block.entries.map(item=>`<li><p>${escape(item.date)}</p><h3>${escape(item.title)}</h3><p>${escape(item.body)}</p></li>`).join('')}</ol>`;
  if(block.type==='toolkit')return block.groups.map(group=>`<section>${group.tools.length?`<p class="place-caption">${escape(group.tools.join(' · '))}</p>`:''}<h3>${escape(group.title)}</h3><p>${escape(group.body)}</p></section>`).join('');
  if(block.type==='decision')return `${title}<dl><dt>What happened</dt><dd>${escape(block.friction)}</dd><dt>The choice</dt><dd>${escape(block.decision)}</dd><dt>What comes next</dt><dd>${escape(block.next)}</dd></dl>${block.projectId?`<button type="button" class="quiet-button" data-about-project="${escape(block.projectId)}">Explore this project in Work</button>`:''}`;
  if(block.type==='links')return `<nav class="about-fallback-destinations" aria-label="Explore more of Lakshya’s portfolio">${block.items.filter(item=>['projects','work','cloud','music'].includes(item.destination)).map(item=>`<button type="button" class="quiet-button" data-about-destination="${escape(item.destination)}">${escape(item.label)}</button>`).join('')}</nav>`;
  return '';
}

/** The same biography remains readable if the optional studio cannot open. */
export function aboutJournalFallback(){return {title:'Meet Lakshya',eyebrow:'01 / MEET LAKSHYA',body:`<p class="place-intro">${escape(ABOUT_JOURNAL.role)}. ${escape(ABOUT_JOURNAL.intro)}</p>${ABOUT_JOURNAL.chapters.map((chapter,index)=>`<details class="place-story about-fallback-chapter" ${index===0?'open':''}><summary>${escape(chapter.label)}</summary><h2>${escape(chapter.title)}</h2><p>${escape(chapter.lead)}</p>${chapter.pages.map(page=>page.blocks.map(blockHTML).join('')).join('')}</details>`).join('')}`};}
