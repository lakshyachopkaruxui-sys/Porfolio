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

// Owner-approved landscape thumbnails supplied on 10 November 2026.
// Originals and deterministic derivative hashes live beside the cover files.
export const PROJECT_COVERS = {
  connectaid: {src: './assets/project-covers/approved-20261110/connectaid.webp', width: 1733, height: 907, alt: 'AI-generated ConnectAid cover: two phone mockups for Home and Health Records beside the headline Care beyond the booking, on a deep blue and cyan background.', caption: 'Owner-approved AI-generated presentation cover. Original interface screens, research and testing evidence remain in the case study.'},
  giggles: {src: './assets/project-covers/approved-20261110/giggles.webp', width: 1734, height: 907, alt: 'AI-generated Giggles cover: cream board, four blue shape buttons, landscape phone, communication cards and die beside Learning through play, on a coral background.', caption: 'Owner-approved AI-generated presentation cover based on the board, cards and interface designs. Actual build and testing photographs remain in the case study.'},
  'pixel-mania': {src: './assets/project-covers/approved-20261110/pixel-mania.webp', width: 1733, height: 907, alt: 'AI-generated Pixel Mania cover: an open pixel board with five click-state labels, neon geometric shapes and the headline Click. Colour. Create.', caption: 'Owner-approved AI-generated presentation cover illustrating the open drawing board and colour cycle. Original screens, live game and exhibition evidence remain in the case study.'},
  syringe: {src: './assets/project-covers/approved-20261110/syringe.webp', width: 1734, height: 907, alt: 'AI-generated syringe cover: transparent barrel, teal plunger and enlarged finger-flange detail beside A closer look at grip, on a dark teal background.', caption: 'Owner-approved AI-generated presentation cover of the 20 cc syringe redesign concept. It is not testing footage or evidence of clinical or ergonomic benefit.'},
  'workplace-mode': {src: './assets/project-covers/approved-20261110/workplace-mode.webp', width: 1734, height: 907, alt: 'AI-generated Workplace Mode cover: dark navigation and music display with an amber Pending state beside When a tap needs an answer.', caption: 'Owner-approved AI-generated high-fidelity concept presentation. Illustrative interface only; no Maruti firmware, Android Auto integration or live playback is shown.'},
  'jan-aushadhi': {src: './assets/project-covers/approved-20261110/jan-aushadhi.webp', width: 1732, height: 908, alt: 'AI-generated Jan Aushadhi cover: a demo unified health card and prescriptions app beside Connecting care, on blue and teal-lit plinths.', caption: 'Owner-approved AI-generated cover for the selected health card and app concept, with demo data. The project also explored a kiosk and RFID packaging. These are concepts, not a deployed platform or built dispensing hardware.'},
};

// Listing and case-opening covers share the approved composition; the original
// research, interface, build and test artifacts remain in the case-study body.
export const NORMAL_PROJECT_ARTIFACTS = {
  connectaid: PROJECT_COVERS.connectaid,
  giggles: PROJECT_COVERS.giggles,
  'pixel-mania': PROJECT_COVERS['pixel-mania'],
  syringe: PROJECT_COVERS.syringe,
  'workplace-mode': PROJECT_COVERS['workplace-mode'],
  'jan-aushadhi': PROJECT_COVERS['jan-aushadhi'],
};
