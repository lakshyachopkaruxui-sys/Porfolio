import {GARDEN_PROJECTS} from './project-data.js';
import {NORMAL_WORK_ORDER,NORMAL_WORK_COVERS,NORMAL_WORK_METADATA} from './normal-work-source.js';
import {getWorkOverviewContent} from './work-overview-content.js';

// The small build-derived Normal manifest carries public card metadata only.
// Full case studies, evidence and the Normal reader stay in the other mode.
const metadata=new Map(NORMAL_WORK_METADATA.map(project=>[project.id,project]));
export const PLAY_WORK_COVERS=NORMAL_WORK_COVERS;
export const PLAY_WORK_PROJECTS=NORMAL_WORK_ORDER.map(id=>{
  const overview=GARDEN_PROJECTS.find(project=>project.id===id);
  const current=metadata.get(id);
  const editorial=getWorkOverviewContent(id);
  if(!current)throw new Error(`Normal project metadata is missing: ${id}`);
  return {
    ...overview,...current,...editorial,
    sections:editorial?.sections??current.sections??overview?.sections??[],
    contributionNote:current.contributionNote??(current.role?null:overview?.contributionNote),
    available:true,
    localCaseStudyUrl:`#project-${id}`,
  };
});
export const PLAY_WORK_OVERVIEWS=[...PLAY_WORK_PROJECTS,...GARDEN_PROJECTS.filter(project=>project.nativeProcess)];
