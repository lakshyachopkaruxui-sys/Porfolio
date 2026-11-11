// Normal-mode editorial context. Shared garden data remains read-only.
// Provenance and unresolved conflicts are recorded in case-content-map.md.
export const CASE_CONTEXT = {
  'pixel-mania': {
    type: 'Design system and playable exploration',
    summary: 'An open drawing board where clicking a square changes its colour. Make a picture, a name or a game of your own.',
    timeline: '4 weeks',
    role: 'I designed the concept, visual system, original assets, screens, motion and Figma prototype. I co-created the browser exploration with AI-assisted coding and reviewed its behaviour against my design.',
    methods: ['Visual exploration and system rules', 'Component states and Figma prototyping', 'AI-assisted vibe coding and design review', 'Informal exhibition observation and written feedback'],
    question: 'How much structure helps people start creating without deciding what they should make?',
  },
  syringe: {
    type: 'Collaborative ergonomics research and redesign concept',
    summary: 'A 20 cc syringe redesign focused on a more secure grip, thumb support and readable dose markings.',
    timeline: '4 weeks',
    team: 'Two-person project',
    role: 'I developed the selected concept. My teammate and I shared the research and 3D-printed prototype work; my teammate created the Maya model.',
    methods: ['Literature review', 'Practitioner questionnaire', 'Observational exposure assessment', 'Dimensional audit and form exploration', 'Physical-prototype pilot ratings across 21 Kansei attributes'],
    question: 'How do grip geometry and plunger force create different constraints for the person using the syringe?',
  },
  connectaid: {
    type: 'Collaborative UX project and tested prototype',
    summary: 'A healthcare app prototype for booking care, finding medicines and tests, and returning to health records.',
    team: 'Five credited contributors',
    timeline: '8 weeks',
    role: 'I co-designed the app, built its core Figma design system and coordinated remote usability testing.',
    methods: ['Interviews and survey research', 'Design Sprint activities', 'Storyboarding and component-based prototyping', 'Six documented moderated usability sessions'],
    question: 'How can consultation, medicines, tests, and records feel like one continuing care journey?',
    artifactCaption: 'ConnectAid home-screen prototype, bringing consultations, medicines and lab tests into one service hub.',
    comparisons: {
      iteration: [
        {label: 'Earlier home', src: './assets/process/connectaid-home.png', width: 440, height: 850, alt: 'Earlier ConnectAid home prototype with service cards and bottom navigation.', caption: 'Earlier home-screen prototype. This interface artwork includes sample service content.'},
        {label: 'Refined home', src: '../bicycle-world/assets/projects/connectaid.png', width: 1320, height: 2550, alt: 'Refined ConnectAid home prototype with revised navigation emphasis, consultation options and service entry points.', caption: 'Refined home-screen artwork. These versions show design changes, not measured improvement from a second study.'},
      ],
    },
  },
  giggles: {
    type: 'Physical–digital learning prototype',
    summary: 'A learning game for autistic children that connects a physical board, answer cards and shape buttons to questions on a phone.',
    artifactCaption: 'Board-layout design for the physical prototype, with tangible shape answers and a phone-based question area.',
    timeline: '6-week course project; later testing',
    team: '5 designers',
    role: 'I built the electronics, programmed the game rules and made the working prototype. Teammates designed the interface screens; I helped review and direct them.',
    methods: ['Secondary research and problem framing', 'SCAMPER and tangible concept exploration', 'Embedded-system prototyping and troubleshooting', 'Retry, hint and reveal feedback logic', 'Teacher-facilitated field testing with four participants'],
    question: 'How can tangible play make a child’s attempts and support needs visible alongside an answer?',
  },
  'workplace-mode': {
    type: 'Academic HMI study and ongoing interaction refinement',
    summary: 'An in-car interaction study, narrowed to changing music and understanding playback response while keeping navigation context.',
    timeline: 'Original study · November 2026 continuation',
    team: 'Four-author academic study; current continuation shown separately',
    role: 'I handled the questionnaire, recruitment, interviews, analysis, concept and prototype. The academic paper has four co-authors. This continuation revisits the evidence and explores interaction alternatives.',
    methods: ['Original study: 34 surveys; 13 interviews reported separately in the handoff', 'November continuation: secondary research and evidence review', 'New synthesis: 5W1H, branching Five Whys, job stories and task analysis', 'Opportunity hypotheses, requirements and failure-mode review', 'Desktop comparison prototype; participant evaluation not yet conducted'],
    question: 'Which parts of an HMI task create unnecessary work?',
    outcome: {title: 'Current outcome', text: 'The study led me to focus on a delayed song change and build two ways to explain its status without losing navigation. Both approaches are ready to compare with drivers; their usefulness and any driving-safety benefit remain untested.', target: 'states'},
    overviewSections: [
      {id: 'focus', title: 'The research', body: ['The academic paper reports 34 survey responses. Earlier project records separately report 13 interviews; these are not 47 unique participants. Drivers described searching for functions, unclear feedback and workarounds.']},
      {id: 'direction', title: 'Current continuation', body: ['A specific song-change account led to an audio/navigation task. Two desktop approaches compare ordinary clear feedback with an explicit action receipt, while retaining existing shortcuts.'], limitation: 'The comparison prototype has no new participant results or vehicle integration. No driving-safety improvement is claimed.'},
    ],
  },
};

export function normalProject(project) {
  if (project.id !== 'connectaid') return {...project, role: CASE_CONTEXT[project.id]?.role ?? project.role,
    ...(CASE_CONTEXT[project.id]?.summary ? {summary: CASE_CONTEXT[project.id].summary} : {}),
  };
  return {
    ...project,
    role: CASE_CONTEXT.connectaid.role,
    summary: CASE_CONTEXT.connectaid.summary,
    sections: project.sections.map(section => {
      if (section.id === 'evidence') return {...section, body: [
        'Six remote usability sessions covered eleven scenario tasks. Findings included overlooked bottom navigation, difficulty finding specialisations and tests, date-of-birth friction and cart placement.',
        'The team recorded nine findings and made six prototype changes in response. A comparable second study is still needed to establish the effect of those changes.',
      ]};
      if (section.id === 'reflection') return {...section, body: [
        'A meaningful next check is whether revised routes improve task success and time on task in a comparable study.',
        'The five-person team worked through research, prototyping, remote usability testing and feedback-led refinements.',
      ]};
      return section;
    }),
  };
}
