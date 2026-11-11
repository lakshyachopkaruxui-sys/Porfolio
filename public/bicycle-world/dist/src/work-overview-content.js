// Play-only editorial layer. Canonical case studies and media provenance remain
// in the Normal portfolio; factual mappings are recorded in
// docs/work-overview-copy-20261108.md.
// Cover alt text comes from the current canonical thumbnail metadata.
export const WORK_OVERVIEW_CONTENT = {
  tear: {
  "summary": "A course submission became a self-directed dream journey, refined through feedback and one-to-one work with ChatGPT.",
  "overviewLead": "TEAR began as my final Immersive Media Design course submission. After an original user session, I continued the work through self-directed study, one-to-one brainstorming with ChatGPT and detailed prototype review. A hand-opened doorway connects Ocean, Shadow and Forest before returning to a familiar room.",
  "role": "I designed the concept, gesture, emotional journey and art direction, directing AI-assisted prototyping and narrative iteration.",
  "status": "Immersive interaction · Working prototype",
  "sections": [
    {
      "id": "concept",
      "title": "Keep the gesture, deepen the experience",
      "body": [
        "The original grip-and-pull interaction gave the project its identity. Feedback helped me preserve its sense of choice while revisiting entry guidance and discoverable help."
      ]
    },
    {
      "id": "iteration",
      "title": "Make the next review specific",
      "body": [
        "I directed ChatGPT through focused revisions: a marked ground sample before a Forest rollout, mountain and lava shape corrections, and a dream voice selected after rejecting earlier directions. Actual course images and new live captures show the progression in the full case."
      ]
    }
  ],
  "coverCaption": ""
},
  connectaid: {
    summary: 'Booking care is one step. Keeping appointments, medicines, tests and records connected is the bigger design problem.',
    overviewLead: 'Booking an appointment is only part of getting care. ConnectAid brings consultations, medicines, lab tests and health records into one app prototype, so people can arrange care for themselves or family members and return to the information afterwards.',
    role: 'I co-designed the app, built its core Figma design system and coordinated remote usability testing.',
    status: 'Healthcare UX · Tested prototype',
    timeline: '8 weeks · Five-person team',
    sections: [
      {
        id: 'decisions', title: 'Keep the patient in view',
        body: ['The booking review brings the doctor, appointment, patient and fee together before confirmation. A dedicated Records section keeps prescriptions and reports within reach. Shared components helped our team keep these connected flows consistent.'],
      },
      {
        id: 'testing', title: 'Follow where people actually look',
        body: ['Six remote sessions across 11 tasks revealed overlooked navigation, difficult date entry and hard-to-find services. Nine findings led to six prototype refinements. The case follows those observations into specific changes to search, navigation and the cart.'],
      },
    ],
    coverCaption: '',
  },
  giggles: {
    summary: 'A board, answer cards and a phone: making room for the attempts and encouragement behind a correct answer.',
    overviewLead: 'What happens before a child gets the answer right? Giggles explores that question through a learning game for autistic children. A physical board, answer cards and shape buttons connect to questions on a phone, with another try, a hint and an answer reveal.',
    role: 'I built the electronics, game logic and working prototype. Teammates designed the screens; I helped review and direct them.',
    status: 'Physical–digital learning · Working prototype',
    timeline: '6-week course project · Later field testing',
    sections: [
      {
        id: 'interaction', title: 'Make the answer something to do',
        body: ['Players move around the board, tap a card or press a physical shape. I connected these inputs to the phone’s questions and feedback through an ESP32 and RFID reader, turning the proposed play loop into a working system.'],
      },
      {
        id: 'fieldwork', title: 'From the workbench to shared play',
        body: ['Teacher-supported sessions with four participants revealed where instructions, shared-screen visibility and turn-taking needed attention. Giggles also received Best Project at Meraki. The case shows the build, the classroom observations and the changes they prompted us to propose.'],
      },
    ],
    coverCaption: '',
  },
  'pixel-mania': {
    summary: 'One square. Five colours. A drawing board where visitors decide what the game becomes.',
    overviewLead: 'One click changes a square’s colour. Repeat it, and a blank grid can become a picture, a name or a game someone invents. Pixel Mania explores how a small interaction can support open-ended play without a score, timer or assigned drawing.',
    role: 'I designed the concept, visual system, artwork, screens, motion and Figma prototype, then directed and reviewed the browser exploration.',
    status: 'Design system · Playable exploration',
    timeline: '4 weeks',
    sections: [
      {
        id: 'system', title: 'Build a world from one component',
        body: ['The square carries the drawing rule and the visual language. Its five-colour cycle extends into controls, interface states and motion. A five-screen Figma flow and browser board let the same system work as both a design language and an activity.'],
      },
      {
        id: 'play', title: 'Let visitors change the brief',
        body: ['At an iPad exhibition, visitors made patterns, lettering and their own games. That freedom also exposed a tension: repeated clicking makes a large drawing slow. The case explores that trade-off and includes the playable board.'],
      },
    ],
    coverCaption: '',
  },
  syringe: {
    summary: 'Rethinking how a hand holds, pushes and reads a 20 cc syringe.',
    overviewLead: 'A syringe asks one hand to hold the barrel, reach the plunger and read the dose. Our redesign examined each point of contact, using practitioner research and hand dimensions to develop a physical prototype with revised grip, thumb support and markings.',
    role: 'I developed the selected concept. My teammate and I shared the research and 3D-printed prototype work; my teammate created the Maya model.',
    status: 'Ergonomics research · Physical redesign prototype',
    timeline: '4 weeks · Two-person team',
    sections: [
      {
        id: 'form', title: 'Trace the shape back to the hand',
        body: ['Butterfly finger flanges provide contact at several angles. A concave thumb rest and transparent barrel ridges explore a more secure hold while keeping the fluid visible. We compared component-level and whole-object concepts before selecting the form to build.'],
      },
      {
        id: 'pilot', title: 'A better grip is only part of the problem',
        body: ['Nurses tried the prototype and rated its feel. Grip impressions improved, but perceived effort stayed unchanged and dosage-accuracy ratings fell. Those mixed findings made the next design questions clearer. The case connects the sketches, dimensions and pilot feedback.'],
      },
    ],
    coverCaption: '',
  },
  'workplace-mode': {
    summary: 'A driver taps Next. The music has not changed yet. What should the screen say?',
    overviewLead: 'A driver described switching between music and navigation, then checking again when a song change lagged. Workplace Mode turns those accounts into an interaction question: how can the screen explain a delayed response while keeping the route in view?',
    role: 'I handled the questionnaire, recruitment, interviews, analysis, concept and prototype. The academic study has four co-authors.',
    status: 'HMI research · Desktop comparison prototype',
    timeline: 'Academic study · November 2026 continuation',
    sections: [
      {
        id: 'research', title: 'Start with the driver’s workaround',
        body: ['The academic study gathered 34 survey responses from private and commercial drivers. I revisited their accounts of searching for controls and uncertain feedback, then narrowed the broader work-interface concept to one music-and-navigation task.'],
      },
      {
        id: 'comparison', title: 'Separate a request from a result',
        body: ['Two desktop approaches explore how to show a pending song change: clear status feedback, or an explicit record of the requested action. The case traces the decision and lets you try the comparison, ready for the next round of driver evaluation.'],
      },
    ],
    coverCaption: '',
  },
  'jan-aushadhi': {
    summary: 'Affordable medicine is only part of the journey. Finding it, understanding the prescription and collecting it matter too.',
    overviewLead: 'A lower price matters only if people can get the medicine they need. Our Jan Aushadhi study followed patients, caregivers and pharmacy teams through prescription questions, uncertain stock and repeat visits, then explored services that could connect those gaps.',
    role: 'I helped guide research and concept discussions. Our four-person team shared the fieldwork, synthesis and concept development.',
    status: 'Service design · Research and concept exploration',
    timeline: '2025 team project · November 2026 interface explorations',
    sections: [
      {
        id: 'service', title: 'Look beyond the counter',
        body: ['Field visits, interviews and questionnaires connected the purchase experience to information, availability and trust. Journey and ecosystem maps helped us consider patients, caregivers and pharmacy staff together, rather than treating medicine access as a single transaction.'],
      },
      {
        id: 'concepts', title: 'Compare three routes to access',
        body: ['We developed a health card and app, a dispensing kiosk and RFID packaging, then took the card/app further. The case shows that choice and later interactive walkthroughs, including a separate kiosk exploration of stock checks, collection and getting help.'],
      },
    ],
    coverCaption: '',
  },
};

export function getWorkOverviewContent(id) {
  return WORK_OVERVIEW_CONTENT[id] ?? null;
}
