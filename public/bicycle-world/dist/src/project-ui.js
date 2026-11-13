import {PLAY_WORK_OVERVIEWS as PROJECTS,PLAY_WORK_COVERS} from './play-work-catalog.js';
import {getHorizontalNavigation,consumeNavigationKey} from './keyboard-navigation.js';
import {behanceCaseStudyURL} from './project-catalog.js';
import {localCaseStudyHash,configureCaseStudyLink,CASE_STUDY_LINK_NOTE} from './portfolio-route.js';
const PROGRESS_VERSION='garden-overviews-2';

/** The readable catalogue used by direct reading and non-3D fallback. */
export function createProjectUI({onOpen,onClose,onPortfolio,onContinue}) {
  const dialog=document.createElement('dialog');
  dialog.id='project-reader';dialog.className='place-reader';dialog.setAttribute('aria-labelledby','project-title');
  dialog.innerHTML=`<div class="reader-top"><span class="mode-switch" data-mode-switch id="projects-portfolio">Portfolio / Play</span><button class="close-button" id="projects-close">Return to ride <span aria-hidden="true">×</span></button></div>
    <article><div class="project-chooser"><label for="project-select">Explore a project</label><select id="project-select"></select><p>Seven project overviews and the story behind this portfolio. Riding is optional.</p><button type="button" class="text-button project-process-link" id="portfolio-process">How this portfolio was made</button></div><div id="project-content"></div><footer class="case-footer"><button class="text-button" id="next-project">Next project</button><button class="primary" id="projects-continue">Back on the bicycle</button></footer></article>`;
  document.body.append(dialog);
  const content=dialog.querySelector('#project-content'),select=dialog.querySelector('select');
  for(const project of PROJECTS){const option=document.createElement('option');option.value=project.id;option.textContent=project.secondary?`${project.title} · Portfolio process`:project.title;select.append(option);}
  let current=PROJECTS[0]?.id,source='play';
  let reportedProject=null;
  function reportOpen(){if(!dialog.open||current===reportedProject)return;reportedProject=current;try{document.dispatchEvent(new CustomEvent('portfolio:project-open',{detail:{id:current}}));}catch{/* Analytics is optional. */}}
  const hash=()=>source==='portfolio'?`#portfolio/project-${current}`:`#project-${current}`;
  const saved={};
  function node(tag,text,parent,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;parent.append(el);return el;}
  function remember(){if(!dialog.open||!current||!content.childNodes.length)return;saved[current]={scroll:dialog.scrollTop,sections:[...content.querySelectorAll('details[open]')].map(d=>d.dataset.section)};}
  function render(id,focus=false){
    const project=PROJECTS.find(p=>p.id===id)||PROJECTS[0];if(!project)return;
    current=project.id;select.value=current;content.replaceChildren();
    const header=node('header',undefined,content,'case-header');
    node('p',`${project.nativeProcess?'PORTFOLIO PROCESS':'PROJECT OVERVIEW'} · ${project.status}`,header,'eyebrow');
    const title=node('h1',project.title,header);title.id='project-title';title.tabIndex=-1;
    node('p',project.subtitle,header,'case-deck');
    node('p',project.overviewLead||project.summary,header,'project-summary');
    if(project.role){const role=node('p',undefined,header,'project-role');node('strong','My role: ',role);role.append(document.createTextNode(project.role));}
    if(project.contributionNote)node('p',project.contributionNote,header,'case-note project-contribution');
    if(project.timeline)node('p',`Duration: ${project.timeline}`,header,'project-timeline');
    if(!project.nativeProcess){
      const action=node('div',undefined,header,'project-case-action');
      const localHash=localCaseStudyHash(project),url=behanceCaseStudyURL(project.caseStudyUrl);
      if(localHash){
        const link=node('a','Read full case study',action,'primary project-local-case-link');
        configureCaseStudyLink(link,project,location.href);
        node('p',CASE_STUDY_LINK_NOTE,action,'place-caption');
      }else if(url){
        const link=node('a','View case study on Behance',action,'primary project-behance-link');
        link.href=url;link.target='_blank';link.rel='noopener noreferrer';
        link.setAttribute('aria-label',`View ${project.title} case study on Behance, opens in a new tab`);
      }else{
        const button=node('button','View case study on Behance',action,'primary project-behance-link');
        button.type='button';button.disabled=true;button.setAttribute('aria-describedby','project-link-status');
        const pending=node('p','Behance link coming soon.',action,'place-caption project-link-status');pending.id='project-link-status';
      }
    }
    const artifact=PLAY_WORK_COVERS[current];
    if(artifact){const figure=node('figure',undefined,content,'project-artifact');const image=node('img',undefined,figure);image.src=new URL('../'+artifact.src.replace(/^\.\//,''),import.meta.url).href;image.alt=project.coverAlt||artifact.alt;image.width=artifact.width;image.height=artifact.height;image.decoding='async';const caption=project.coverCaption??artifact.caption;if(caption)node('figcaption',caption,figure);}
    const nav=project.nativeProcess?node('nav',undefined,content,'case-sections'):null;nav?.setAttribute('aria-label','Portfolio process reading shortcuts');
    for(const section of project.nativeProcess?project.sections:[]){
      const button=node('button',section.title,nav,'text-button');button.type='button';
      button.addEventListener('click',()=>{const target=[...content.querySelectorAll('details')].find(d=>d.dataset.section===section.id);target.open=true;target.querySelector('summary').focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});});
    }
    const sections=node('section',undefined,content,project.nativeProcess?'project-sections':'project-overview-sections');sections.setAttribute('aria-label',project.nativeProcess?'Portfolio process':'Project overview');
    project.sections.forEach((section,index)=>{
      const details=node(project.nativeProcess?'details':'section',undefined,sections);details.dataset.section=section.id;
      if(project.nativeProcess){
        details.open=saved[current]?.sections?saved[current].sections.includes(section.id):index===0;
        const summary=node('summary',undefined,details);node('span',String(index+1).padStart(2,'0'),summary);summary.append(document.createTextNode(section.title));
      }else node('h2',section.title,details);
      section.body.forEach(paragraph=>node('p',paragraph,details));
      if(section.evidence)node('p',`Evidence: ${section.evidence}`,details,'decision-tradeoff');
      if(section.limitation)node('p',section.limitation,details,'case-note');
      if(section.links){const links=node('nav',undefined,details,'project-credit-links');links.setAttribute('aria-label','Asset credits');for(const item of section.links){const link=node('a',item.label,links);link.href=item.href;}}
    });
    if(project.nativeProcess&&project.sourceLabel)node('p',project.sourceLabel,content,'place-caption project-source');
    dialog.scrollTop=saved[current]?.scroll||0;
    if(dialog.open)history.replaceState(null,'',hash());
    if(focus){dialog.scrollTop=0;title.focus({preventScroll:true});}
    reportOpen();
  }
  function close(){if(!dialog.open)return;remember();dialog.close();reportedProject=null;history.replaceState(null,'',location.pathname+(source==='portfolio'?'#portfolio':''));onClose();}
  function open(id,options={}){source=['portfolio','studio'].includes(options.source)?options.source:'play';onOpen();render(id||current);dialog.querySelector('#projects-close').textContent=source==='portfolio'?'Back to projects ×':source==='studio'?'Back to exhibit ×':'Return to ride ×';dialog.querySelector('#projects-continue').textContent=source==='portfolio'?'Back to projects':'Back on the bicycle';if(!dialog.open)dialog.showModal();dialog.scrollTop=saved[current]?.scroll||0;dialog.querySelector('#projects-close').focus({preventScroll:true});history.replaceState(null,'',hash());reportOpen();}
  select.addEventListener('change',()=>{remember();render(select.value);dialog.scrollTop=0;});
  dialog.querySelector('#portfolio-process').addEventListener('click',()=>{remember();render('portfolio-world',true);});
  dialog.querySelector('#next-project').addEventListener('click',()=>{remember();render(PROJECTS[(PROJECTS.findIndex(p=>p.id===current)+1)%PROJECTS.length].id,true);});
  dialog.querySelector('#projects-close').addEventListener('click',close);
  dialog.querySelector('#projects-portfolio').addEventListener('click',onPortfolio);
  dialog.querySelector('#projects-continue').addEventListener('click',()=>{close();if(source!=='portfolio')onContinue();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  // Leave Home/End, Page Up/Down and vertical arrows available for reading.
  dialog.addEventListener('keydown',event=>{
    if(!dialog.open)return;
    const direction=getHorizontalNavigation(event);if(!direction)return;
    consumeNavigationKey(event);
    const index=PROJECTS.findIndex(project=>project.id===current),next=Math.max(0,Math.min(PROJECTS.length-1,index+direction));
    if(next===index)return;
    remember();render(PROJECTS[next].id,true);
  });
  const keyboardHint=document.createElement('p');keyboardHint.className='place-caption';keyboardHint.textContent='A/D or ←/→: browse projects · Tab: choose a control · Esc: return';dialog.querySelector('.project-chooser').append(keyboardHint);
  return {open,close,get isOpen(){return dialog.open;},get progress(){remember();return {version:PROGRESS_VERSION,current,projects:{...saved}};},restoreProgress(value){
    if(PROJECTS.some(p=>p.id===value?.current))current=value.current;
    // Detailed case readers had different heights; their numeric offsets must
    // not reopen the new concise overviews below their heading and main action.
    if(value?.version!==PROGRESS_VERSION)return;
    for(const project of PROJECTS){const item=value?.projects?.[project.id];if(!item||!Number.isFinite(item.scroll))continue;saved[project.id]={scroll:Math.max(0,item.scroll),sections:Array.isArray(item.sections)?item.sections.filter(id=>project.sections.some(section=>section.id===id)):[]};}
  }};
}
