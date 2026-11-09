import {PROJECTS,GARDEN_PROJECTS} from './project-data.js';

// Categories describe the work in the audited project summaries. They are not
// claims about employment, deployment or independently verified outcomes.
export const PROJECT_FILTERS = Object.freeze([
  {id:'all', label:'All work'},
  {id:'featured', label:'Featured'},
  {id:'research', label:'UX research'},
  {id:'interaction', label:'Interaction & systems'},
  {id:'physical', label:'Physical products'},
].map(Object.freeze));

// This is a provisional editorial selection, not an owner-approved ranking.
export const FEATURED_PROJECT_IDS = Object.freeze(['connectaid','pixel-mania','workplace-mode']);

const categories = Object.freeze({
  'pixel-mania':Object.freeze(['interaction']),
  syringe:Object.freeze(['research','physical']),
  connectaid:Object.freeze(['research','interaction']),
  giggles:Object.freeze(['research','interaction','physical']),
  'workplace-mode':Object.freeze(['research','interaction']),
  'portfolio-world':Object.freeze(['interaction']),
});

/** Only owner-supplied public Behance gallery URLs can enable the case action. */
export function behanceCaseStudyURL(value) {
  if(typeof value!=='string'||!value.trim())return null;
  try{
    const url=new URL(value);
    if(url.protocol!=='https:'||!['behance.net','www.behance.net'].includes(url.hostname)||url.username||url.password||url.port)return null;
    if(!/^\/gallery\/\d+(?:\/|$)/.test(url.pathname))return null;
    return url.href;
  }catch{return null;}
}

export function normalizeProjectFilter(id) {
  return PROJECT_FILTERS.some(filter=>filter.id===id)?id:'all';
}

export function projectsForFilter(id) {
  return selectProjects(PROJECTS,id);
}

/** The garden adds its ongoing making-of without changing the separate site. */
export function gardenProjectsForFilter(id) {
  return selectProjects(GARDEN_PROJECTS,id);
}

function selectProjects(projects,id) {
  const filter=normalizeProjectFilter(id);
  if(filter==='featured')return FEATURED_PROJECT_IDS.map(projectId=>projects.find(project=>project.id===projectId)).filter(Boolean);
  if(filter==='all')return [...projects];
  return projects.filter(project=>categories[project.id]?.includes(filter));
}
