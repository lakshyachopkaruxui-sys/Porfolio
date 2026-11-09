// Normal-only additions. Evidence and image provenance live in
// docs/project-covers-task-20261104.md and assets/project-covers/SOURCE.json.
// Keep the shared garden catalogue independent.
import {enrichJanResearchStory} from './project-research-evidence.js?v=20261109-evidence-pass';
import {enrichJanConceptStory} from './jan-concept-data.js?v=20261109-evidence-pass';
export const NORMAL_PROJECTS = [{
  id: 'jan-aushadhi',
  title: 'Jan Aushadhi',
  status: 'Service design · Research and concept exploration',
  summary: 'A team exploration of medicine access through a health card and app, a dispensing kiosk and RFID packaging.',
  role: 'I helped guide research and concept discussions in our four-person team. We carried out the fieldwork, synthesis and concept development together.',
  available: true,
  sections: [],
}];

export const NORMAL_PROJECT_CATEGORIES = {'jan-aushadhi': ['research', 'interaction']};

export const NORMAL_PROJECT_CONTEXT = {
  'jan-aushadhi': {
    type: 'Academic service-design research and concept exploration',
    team: 'Four-person academic team · MIT Institute of Design',
    timeline: '2025 team project · November 2026 interface explorations',
    role: NORMAL_PROJECTS[0].role,
    methods: ['Contextual inquiry', 'Stakeholder interviews and questionnaires', 'Journey and ecosystem mapping', 'Concept exploration', 'Proposed service-flow mapping', 'New AI-assisted interface walkthroughs'],
    question: 'What makes buying affordable medicines difficult beyond their price?',
    artifactCaption: 'AI-generated high-fidelity concept mockup · November 2026. Card styling follows our original report design with demo fields. All three are concepts, not a deployed platform or built dispensing hardware.',
    overviewSections: [
      {id: 'context', title: 'Medicine access beyond the price', body: ['Our four-person team studied prescription information, medicine prices, stock uncertainty and repeated visits. We shared research and concept development; Lakshya helped guide the discussions.']},
      {id: 'direction', title: 'Three directions, one selected service concept', body: ['We developed a unified health card and app, a dispensing kiosk alternative, and RFID-enabled packaging. The report took the card/app further. New November 2026 interface walkthroughs explore collection and a separate kiosk-learning exercise.'], limitation: 'Service concept only; new walkthroughs use simulated data and have not been evaluated with participants. No live prescription, stock, payment or dispensing service is connected.'},
    ],
  },
};

export const NORMAL_PROJECT_PROCESS = {
  'jan-aushadhi': {
    steps: [
      ['Understand the purchase journey', 'Study the experience of patients, caregivers and the people supporting medicine access.'],
      ['Connect the service issues', 'Map prescription clarity, trust, stock uncertainty and the effort of returning for medicines.'],
      ['Explore and develop concepts', 'Generate fifteen ideas, develop three directions and take the unified health card and app further.'],
      ['Extend into interface walkthroughs', 'New November 2026 AI-assisted explorations make selected collection tasks and kiosk recovery reviewable.'],
      ['Evaluate with people', 'Review the service with pharmacy staff, then observe patients and caregivers. Participant evaluation is still ahead.', true],
    ],
    tools: [
      ['Research synthesis', 'The team report brings together contextual inquiry, interviews, questionnaires and recurring service issues.'],
      ['Journey and ecosystem maps', 'Mapping connects the purchase experience to caregivers, pharmacy teams and stock availability.'],
      ['Concept-flow exploration', 'A proposed card, prescription, selection and payment journey gives the next design phase a starting point.'],
      ['HTML, CSS and JavaScript · November 2026', 'New AI-assisted interface explorations use fictional data and controlled service states. Software checks are separate from participant evaluation.'],
    ],
  },
};

export const NORMAL_PROJECT_STORIES = {
  'jan-aushadhi': {
    intro: 'In 2025, our four-person team studied how patients and caregivers buy medicines. We developed three directions: a unified health card and app, a dispensing kiosk and RFID packaging. The report took the card/app further. The November 2026 continuation adds interface walkthroughs; the kiosk is a separate learning exercise, not a replacement for the selected concept.',
    readingTime: 11,
    prototype: {url: './design/jan-kiosk-lab-20261108/card-app.html', label: 'Try the card/app walkthrough'},
    outcome: {title: 'Current outcome', text: 'We produced field research, service maps and three concept directions. The report developed a health card and app further. New November 2026 interface walkthroughs make collection and kiosk tasks reviewable. These are simulations; no participant evaluation, operational pilot, cost reduction or shorter wait has been demonstrated.', target: 'selected-service'},
    sections: [
      {
        id: 'context', title: 'User research',
        body: [
          'We visited Jan Aushadhi pharmacies and used observation, interviews and questionnaires to study medicine purchases. We included patients, caregivers and pharmacy teams, with questionnaires for users, non-users, pharmacy operators and doctors.',
          'Our research brought together confusion about prescription names, uncertain stock, repeat visits and trust in the service. These findings describe the purchase experience; they do not measure the effect of a new kiosk.',
        ],
        points: [
          {title: 'Prescription confusion → a clear review', body: 'Keep prescription, medicine and permitted quantity together so someone can check what they are collecting. Unclear information still needs pharmacy help.'},
          {title: 'Stock uncertainty → verified availability', body: 'Show a reliable stock result before payment and explain unavailable items. Checking before travel still needs a channel beyond the on-site kiosk.'},
          {title: 'Help already matters → retain a handoff', body: 'Keep staff help visible when someone cannot identify a medicine, sign in or complete collection. An unattended machine cannot replace that support.'},
        ],
      },
      {
        id: 'direction', title: 'Service concepts',
        body: [
          'We explored fifteen early ideas and developed three concept directions. The report selected a unified health card and app, while kiosk dispensing and RFID packaging remained alternatives.',
          'The later kiosk interface exercise was chosen to broaden my experience with an unfamiliar interface type, not because research had proved it better than the card/app concept.',
        ],
        limitation: 'The report contains proposed services and illustrative concept artwork. The later interface walkthroughs do not establish a deployed service or working dispensing hardware.',
      },
      {
        id: 'proposed-journey', title: 'Kiosk learning exploration',
        body: ['I chose a separate kiosk interface exercise because I had less experience designing for that format and wanted to broaden my design perspective. The new November 2026 AI-assisted prototype models a prepared account, prescription selection, stock review, simulated payment and collection or help. It is separate from our original team’s selected card/app concept.'],
        flow: {
          label: 'New interface simulation · November 2026',
          steps: [
            {title: 'Use the prepared account', body: 'The lab models card/PIN entry with a demo action. It never asks for a real card or PIN. Someone without access can request staff help.'},
            {title: 'Review the prepared items', body: 'Choose fictional items within fixed limits and check the simulated stock result before payment.'},
            {title: 'Review and simulate payment', body: 'Edit quantities without losing the selection. Pending or unknown payment keeps the same reference while the result is checked.'},
            {title: 'Collect or get help', body: 'A confirmed result can lead to collection. Missing stock, uncertain payment or failed collection has a staff-supported route; no machine actually dispenses anything.'},
          ],
        },
        limitation: 'Identity, prescriptions, items, stock, payment and collection are simulated. No real financial transaction, medical recommendation, wallet service or dispensing is connected.',
      },
      {
        id: 'next', title: 'Results and next steps',
        body: ['We produced field research, service maps and three concept directions, then developed the unified card/app further in our report. The later interface walkthroughs make a bounded part of the service reviewable. Next, pharmacy staff need to check the assumptions, followed by patient/caregiver sessions and revisions. No improvement in cost or waiting time has been measured.'],
        points: [
          {title: 'Review the concepts with pharmacy staff', body: 'Compare the card/app, kiosk and package-identity roles. Check stock ownership, staff handoffs, permitted collection and the reliability of each information source.'},
          {title: 'Evaluate the selected journey', body: 'Observe patients and caregivers using the prepared card/app collection task. Keep concept comprehension, interface usability and the separate kiosk learning tasks distinct.'},
          {title: 'Operational evaluation', body: 'A later pilot would need to examine stock accuracy, fulfilment, staff workload, purchase time and actual spending against a baseline.'},
          {title: 'What I learned', body: 'A cheaper medicine is only useful if someone can understand the options, find it in stock and get help when needed. Those service gaps need attention alongside the kiosk screen.'},
        ],
      },
    ],
  },
};

NORMAL_PROJECT_STORIES['jan-aushadhi'] = enrichJanResearchStory(NORMAL_PROJECT_STORIES['jan-aushadhi']);
NORMAL_PROJECT_STORIES['jan-aushadhi'] = enrichJanConceptStory(NORMAL_PROJECT_STORIES['jan-aushadhi']);

export const PROJECT_COVERS = {
  connectaid: {src: './assets/project-covers/connectaid-studio-v2.webp', width: 1402, height: 1122, alt: 'AI-generated ConnectAid presentation with two complete graphite phones showing the source-led Home and Health Records interfaces on an aqua studio plinth.', caption: 'AI-generated presentation mockup using our Home and Health Records designs as references. Original screens and testing evidence are in the full case study.'},
  giggles: {src: './assets/cases/giggles/presentation/giggles-studio-v2.webp', width: 1402, height: 1122, alt: 'AI-generated Giggles presentation: cream board, four blue shape buttons, colourful track, landscape phone, separate reader, phrase cards and die.', caption: 'AI-generated presentation mockup based on our board, cards and interface designs. Actual build photographs are in the full case study.'},
  'pixel-mania': {src: './assets/project-covers/pixel-highfi-v2.webp', width: 1402, height: 1122, alt: 'Pixel Mania high-fidelity presentation: the colourful original game board on a desktop display beside its introduction artwork.', caption: 'AI-generated presentation mockup using the original Figma game artwork as reference. Device and studio are illustrative; the original screens, live game and exhibition evidence follow below.'},
  syringe: {src: './assets/project-covers/syringe-v2.webp', width: 1536, height: 1024, alt: 'Rethinking the grip: a hand holding a syringe against one pale sage background.', caption: 'AI-assisted presentation edit of the existing cover, removing small captions and unifying the background. Original redesign evidence remains in the case study.'},
  'workplace-mode': {src: './assets/project-covers/workplace-highfi-v2.webp', width: 1402, height: 1122, alt: 'Workplace Mode high-fidelity concept display: cyan schematic route beside last-confirmed City morning and an amber Open coast request awaiting playback confirmation.', caption: 'AI-generated high-fidelity concept presentation of the audio/navigation task. New illustrative styling; no Maruti firmware, Android Auto integration or live playback is shown. Original prototype states remain in the case.'},
  'jan-aushadhi': {src: './assets/project-covers/jan-original-card-v2.webp', width: 1402, height: 1122, alt: 'Colourful high-fidelity Jan Aushadhi concept mockup: original-layout demo health card and app in the centre, medicine kiosk on the left, and RFID carton and blister packaging on the right.', caption: NORMAL_PROJECT_CONTEXT['jan-aushadhi'].artifactCaption},
};

export const NORMAL_PROJECT_ARTIFACTS = {
  connectaid: PROJECT_COVERS.connectaid,
  giggles: PROJECT_COVERS.giggles,
  'pixel-mania': PROJECT_COVERS['pixel-mania'],
  'jan-aushadhi': PROJECT_COVERS['jan-aushadhi'],
  'workplace-mode': PROJECT_COVERS['workplace-mode'],
};
