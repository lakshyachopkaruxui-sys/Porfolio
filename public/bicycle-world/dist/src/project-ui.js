import {PLAY_WORK_OVERVIEWS as PROJECTS,PLAY_WORK_COVERS} from './play-work-catalog.js';
import {getHorizontalNavigation,consumeNavigationKey} from './keyboard-navigation.js';
import {behanceCaseStudyURL} from './project-catalog.js';
import {localCaseStudyHash,configureCaseStudyLink,CASE_STUDY_LINK_NOTE} from './portfolio-route.js';
const CASE_PROJECTS=PROJECTS.filter(project=>!project.nativeProcess&&!project.secondary);
const PROGRESS_VERSION='garden-overviews-3';

/** The readable catalogue used by direct reading and non-3D fallback. */
export function createProjectUI({onOpen,onClose,onPortfolio,onContinue}) {
  const dialog=document.createElement('dialog');
  dialog.id='project-reader';dialog.className='place-reader';dialog.setAttribute('aria-labelledby','project-title');
  dialog.innerHTML=`<div class="reader-top"><span class="mode-switch" data-mode-switch id="projects-portfolio">Portfolio / Play</span><button class="close-button" id="projects-close">Back to garden</button></div>
    <article><div class="project-chooser"><label for="project-select">Project</label><select id="project-select"></select><p>Choose a project summary, or open its full case study in Portfolio.</p><button type="button" class="text-button project-process-link" id="portfolio-process">Portfolio making story</button></div><div id="project-content"></div><footer class="case-footer"><nav class="project-step-navigation" aria-label="Browse project summaries"><button type="button" id="previous-project">Previous project</button><p id="project-position" role="status" aria-live="polite"></p><button type="button" id="next-project">Next project</button></nav><button type="button" id="projects-continue">Back to garden</button></footer></article>`;
  document.body.append(dialog);
  const content=dialog.querySelector('#project-content'),select=dialog.querySelector('select');
  for(const project of PROJECTS){const option=document.createElement('option');option.value=project.id;option.textContent=project.nativeProcess?'Portfolio making story':project.title;if(project.nativeProcess){option.hidden=true;option.disabled=true;}select.append(option);}
  let current=PROJECTS[0]?.id,source='play';
  let reportedProject=null,returnFocus=null;
  const returnLabel=()=>source==='portfolio'?'Back to projects':source==='studio'?'Back to Works':'Back to garden';
  function reportOpen(){if(!dialog.open||current===reportedProject)return;reportedProject=current;try{document.dispatchEvent(new CustomEvent('portfolio:project-open',{detail:{id:current}}));}catch{/* Analytics is optional. */}}
  const hash=()=>source==='portfolio'?`#portfolio/project-${current}`:`#project-${current}`;
  const saved={};
  function node(tag,text,parent,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;parent.append(el);return el;}
  function remember(){if(!dialog.open||!current||!content.childNodes.length)return;saved[current]={scroll:dialog.scrollTop,sections:[]};}
  function render(id,focus=false){
    const project=PROJECTS.find(p=>p.id===id)||PROJECTS[0];if(!project)return;
    current=project.id;select.value=current;content.replaceChildren();
    const index=CASE_PROJECTS.findIndex(item=>item.id===current);
    dialog.querySelector('#previous-project').hidden=dialog.querySelector('#next-project').hidden=Boolean(project.nativeProcess);
    dialog.querySelector('#previous-project').disabled=index<=0;dialog.querySelector('#next-project').disabled=index<0||index>=CASE_PROJECTS.length-1;
    dialog.querySelector('#project-position').textContent=project.nativeProcess?'Portfolio making story':`Project ${index+1} of ${CASE_PROJECTS.length}`;
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
    const nav=project.nativeProcess?node('nav',undefined,content,'case-sections project-process-sections'):null;
    if(nav){
      nav.setAttribute('aria-label','Portfolio story sections');
      const label=node('label','Section',nav);label.htmlFor='project-process-section';
      const jump=node('select',undefined,nav);jump.id='project-process-section';
      for(const section of project.sections){const option=node('option',section.title,jump);option.value=section.id;}
      jump.addEventListener('change',()=>{const target=[...content.querySelectorAll('[data-section]')].find(item=>item.dataset.section===jump.value);const heading=target?.querySelector('h2');heading?.focus({preventScroll:true});target?.scrollIntoView({block:'start',behavior:'instant'});});
    }
    const sections=node('section',undefined,content,project.nativeProcess?'project-sections':'project-overview-sections');sections.setAttribute('aria-label',project.nativeProcess?'Portfolio process':'Project overview');
    project.sections.forEach((section,index)=>{
      const details=node('section',undefined,sections);details.dataset.section=section.id;
      const heading=node('h2',section.title,details);heading.tabIndex=-1;
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
  function close(){if(!dialog.open)return;remember();dialog.close();reportedProject=null;history.replaceState(null,'',location.pathname+(source==='portfolio'?'#portfolio':''));onClose();if(returnFocus?.isConnected&&!returnFocus.disabled&&!returnFocus.closest?.('[hidden],[inert]'))returnFocus.focus({preventScroll:true});returnFocus=null;}
  function open(id,options={}){
    source=['portfolio','studio'].includes(options.source)?options.source:'play';
    if(!dialog.open)returnFocus=document.activeElement;
    onOpen();render(id||current);
    dialog.querySelector('#projects-close').textContent=dialog.querySelector('#projects-continue').textContent=returnLabel();
    if(!dialog.open)dialog.showModal();dialog.scrollTop=saved[current]?.scroll||0;
    dialog.querySelector('#project-title').focus({preventScroll:true});history.replaceState(null,'',hash());reportOpen();
  }
  function stepProject(direction){
    const index=CASE_PROJECTS.findIndex(project=>project.id===current);if(index<0)return;
    const next=index+direction;if(next<0||next>=CASE_PROJECTS.length)return;
    remember();render(CASE_PROJECTS[next].id,true);
  }
  select.addEventListener('change',()=>{remember();render(select.value);dialog.scrollTop=0;});
  dialog.querySelector('#portfolio-process').addEventListener('click',()=>{remember();render('portfolio-world',true);});
  dialog.querySelector('#previous-project').addEventListener('click',()=>stepProject(-1));
  dialog.querySelector('#next-project').addEventListener('click',()=>stepProject(1));
  dialog.querySelector('#projects-close').addEventListener('click',close);
  dialog.querySelector('#projects-portfolio').addEventListener('click',onPortfolio);
  dialog.querySelector('#projects-continue').addEventListener('click',close);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  // Leave Home/End, Page Up/Down and vertical arrows available for reading.
  dialog.addEventListener('keydown',event=>{
    if(!dialog.open)return;
    const direction=getHorizontalNavigation(event);if(!direction)return;
    consumeNavigationKey(event);
    stepProject(direction);
  });
  const keyboardHint=document.createElement('p');keyboardHint.className='place-caption';keyboardHint.textContent='Previous / next project: A / D or Left / Right. Escape goes back.';dialog.querySelector('.project-chooser').append(keyboardHint);
  return {open,close,get isOpen(){return dialog.open;},get progress(){remember();return {version:PROGRESS_VERSION,current,projects:{...saved}};},restoreProgress(value){
    if(PROJECTS.some(p=>p.id===value?.current))current=value.current;
    // Detailed case readers had different heights; their numeric offsets must
    // not reopen the new concise overviews below their heading and main action.
    if(value?.version!==PROGRESS_VERSION)return;
    for(const project of PROJECTS){const item=value?.projects?.[project.id];if(!item||!Number.isFinite(item.scroll))continue;saved[project.id]={scroll:Math.max(0,item.scroll),sections:Array.isArray(item.sections)?item.sections.filter(id=>project.sections.some(section=>section.id===id)):[]};}
  }};
}
