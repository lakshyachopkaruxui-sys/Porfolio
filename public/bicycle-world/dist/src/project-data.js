// Public summaries are grounded in the local project sources listed in
// docs/project-source-audit.md. Research findings and prototype intentions are
// deliberately kept separate from measured outcomes and shipped products.
const SOURCE_PROJECTS = [
  {
    id: 'pixel-mania',
    title: 'Pixel Mania',
    subtitle: 'One pixel. An open-ended playground.',
    status: 'Design system · Playable exploration',
    summary: 'A reusable pixel component becomes a drawing board, a game interface, and a shared visual language.',
    role: 'Concept, visual system, UI, motion and Figma prototyping; AI-assisted vibe-coded browser exploration.',
    localCaseStudyUrl: '#project-pixel-mania',
    available: true,
    sourceLabel: 'Pixel Mania case study · Sections 02, 06, 12, 14 and 15',
    sections: [
      {
        id: 'problem',
        title: 'Give people a starting point, then room to play',
        body: [
          'Pixel Mania began as an exploration of pixel art, interface components and prototyping. The central question was how much structure a creative board needs before it starts telling people what to make.',
          'The board has no score, timer or assigned drawing. Visitors can make pictures, write letters or invent a game together.'
        ]
      },
      {
        id: 'decisions',
        title: 'Let one interaction carry the system',
        body: [
          'A reusable 32 px square repeats across the board. Each click advances a cell through a five-colour cycle. The visible legend teaches that rule without a separate colour-picker tool.',
          'The same component language carries buttons, input states and motion. In the coded exploration, Reset appears only after a cell changes, so an empty board starts with less clutter.'
        ],
        evidence: 'The case-study exports show the grid rule, component states and the change from an always-visible Reset control.'
      },
      {
        id: 'evidence',
        title: 'What happened at the exhibition',
        body: [
          'The documented foyer exhibition shows visitors using the board on an iPad. They created patterns and lettering; the case study also records people inventing their own two-player games.',
          'The delivered work includes a five-screen Figma flow, a browser exploration with a 28 × 18 board, and a Pixel Pedia mobile concept using the same design tokens.'
        ],
        limitation: 'Exhibition observations and written comments were informal feedback. They do not establish task-success rates, retention or a commercial launch.'
      },
      {
        id: 'reflection',
        title: 'The useful tension: simplicity versus pace',
        body: [
          'Filling a large board one click at a time can feel slow. A fill tool could speed it up, but would change the deliberately small interaction vocabulary.',
          'The documented next step is to test faster painting and saving an image while preserving the open-ended experience.'
        ]
      }
    ]
  },
  {
    id: 'syringe',
    title: 'Redesign 20 cc Syringe',
    subtitle: 'Designing the contact between a hand and a tool.',
    status: 'Ergonomics research · Redesign concept',
    summary: 'An anthropometric investigation of grip, reach and control in a frequently used medical instrument.',
    role: 'Collaborative research and redesign',
    available: true,
    sourceLabel: 'Anthropometric Redesign of the 20 cc Medical Syringe · Sections 3, 7–11',
    sections: [
      {
        id: 'problem',
        title: 'Separate holding the syringe from pushing it',
        body: [
          'The research examined whether the geometry of a standard syringe accommodates Indian healthcare practitioners. It combined a literature review, practitioner questionnaire, observational exposure assessment and a dimensional audit.',
          'Two problems emerged in the project analysis: keeping a secure grip and supplying the force needed to move the plunger. Changing the outer shape could not be assumed to solve both.'
        ]
      },
      {
        id: 'decisions',
        title: 'Trace the form back to the hand',
        body: [
          'The resolved concept combines butterfly-shaped finger flanges, a concave thumb rest, transparent ridges on the barrel and graduations around the barrel.',
          'The team retained the butterfly flange over a more complex wing concept. Transparent ridges addressed a trade-off in an earlier grip treatment: improving purchase without hiding the fluid.'
        ],
        evidence: 'The paper documents two concept tracks, their convergence and Maya views of the resulting geometry on pages 11–13.'
      },
      {
        id: 'evidence',
        title: 'A promising grip direction, with unresolved evidence',
        body: [
          'The paper reports a small comparative rating exercise: grip-related impressions improved, while force-related ratings did not show the same benefit. Some control and dosage-related ratings became worse.',
          'The paper itself leaves the number of raters and the form of the evaluated prototype unconfirmed. Those ratings therefore remain provisional in this portfolio.'
        ],
        limitation: 'This is a redesign concept, not a clinically validated device. No reduction in injury, required force or dosing error is claimed.'
      },
      {
        id: 'reflection',
        title: 'Keep the constraints visible',
        body: [
          'The audit identifies dimensions that still need revision and a working stroke that the concept did not shorten. A more comfortable-looking form cannot substitute for measuring force, posture and dose-setting accuracy.',
          'The next validation proposed in the paper compares the devices with instrumented tasks and participants spanning different hand sizes.'
        ]
      }
    ]
  },
  {
    id: 'connectaid',
    title: 'ConnectAid',
    subtitle: 'Keep the whole care journey connected.',
    status: 'Collaborative UX project · Tested prototype',
    summary: 'Consultations, medicines, lab tests and health records organised around one continuing care journey.',
    role: 'Research leadership, design-system ownership and usability-test coordination within a five-person team',
    available: true,
    sourceLabel: 'ConnectAid case study · Role & Scope, Product, Usability Test and Resolution',
    sections: [
      {
        id: 'problem',
        title: 'A booking is only one part of care',
        body: [
          'The project asked how telemedicine could become easier to navigate for people with different levels of technical confidence and different language needs.',
          'Research reframed the brief around continuity: consultation, tests, medicines and records needed to connect, rather than behave like unrelated services.'
        ]
      },
      {
        id: 'decisions',
        title: 'Make context visible before commitment',
        body: [
          'Home became the service hub, with records preserving the care history. Booking flows made the patient context explicit: a person could review whether the appointment was for themselves or a dependent before confirming.',
          'English and Hindi remained switchable beyond onboarding. Shared controls, cards and navigation patterns helped the five-person team keep the flows consistent.'
        ],
        evidence: 'The case-study PDF documents patient selection, a review step, language variants and the shared component system.'
      },
      {
        id: 'evidence',
        title: 'Follow where people actually look',
        body: [
          'Six moderated, in-person usability sessions covered eleven scenario tasks. The documented findings include overlooked bottom navigation, difficulty finding specialisations and tests, date-of-birth friction and cart placement.',
          'The case study records corresponding refinements to navigation emphasis, search routes, the date input, cart position and side-panel content.'
        ],
        limitation: 'The refined screens received informal review; a formal second usability round is still proposed. No conversion, adoption or clinical-impact improvement is claimed.'
      },
      {
        id: 'reflection',
        title: 'Test the next version against the first',
        body: [
          'The next meaningful check is whether the revised routes improve task success and time on task in a comparable study.',
          'Research, design-system work and test coordination are the documented individual contributions. Sprint decisions and prototype production were shared team work.'
        ]
      }
    ]
  },
  {
    id: 'giggles',
    title: 'Giggles',
    subtitle: 'Physical play, with a clearer view of learning.',
    status: 'Research · Physical–digital prototype',
    summary: 'A tangible learning-board concept for autistic children, connecting physical answers with supportive digital feedback.',
    role: null,
    available: true,
    sourceLabel: 'Final Giggles TID documentation · concept, working prototype and teacher-facilitated field testing',
    sections: [
      {
        id: 'problem',
        title: 'Look beyond the final right answer',
        body: [
          'The final documentation frames a gap between an eventual correct answer and the attempts, time and support needed to reach it.',
          'Giggles combines hands-on Communication, Emotion and Shape activities with a proposed way for educators to understand that process.'
        ]
      },
      {
        id: 'decisions',
        title: 'Keep the child’s interaction tangible',
        body: [
          'The documented play loop uses a physical board, a phone display, RFID answer cards and shape buttons. A child moves, receives a question and responds through a physical action.',
          'The feedback sequence offers another try, then a hint, then an answer reveal. Teacher-facing records are a separate part of the concept, keeping the child’s play space focused.'
        ],
        evidence: 'The final documentation distinguishes the working ESP32/RFID/local-phone loop from the unconnected teacher-record system.'
      },
      {
        id: 'evidence',
        title: 'What teacher-facilitated testing showed',
        body: [
          'At Vishwansh Foundation, one 24-year-old adult played individually and three children aged 8–10 played a group game. Participants could read independently; teachers introduced and supported play.',
          'The visit identified eight pain points and ten strengths. Onboarding, card categories, language, screen visibility, pawn/counting cues, the reader affordance and early finger-triggered inputs informed proposed next changes.'
        ],
        limitation: 'Four participants and one visit provide directional findings. Proposed fixes were not retested; learning gains, retention and real-world transfer were not measured. Teacher analytics and AI remain unconnected proposals.'
      },
      {
        id: 'reflection',
        title: 'An interaction record needs interpretation',
        body: [
          'Response speed and retries can describe a session, but they cannot establish a child’s ability or diagnosis on their own.',
          'The next version should clarify onboarding and shared turns, then be tested over several sessions. Persistent records, the Teacher App, language options and the complete physical shape set remain future work.'
        ]
      }
    ]
  },
  {
    id: 'workplace-mode',
    title: 'Workplace Mode',
    subtitle: 'HMI Research Case Study · Pune drivers',
    status: 'UX research · Concept awaiting validation',
    summary: 'A study of private and commercial drivers that turns attention management into an in-car interaction concept.',
    role: 'UX researcher: research planning, interviews, surveys, synthesis and concept design',
    available: true,
    sourceLabel: 'Workplace Mode case study · Investigation, Opportunities, Concept and Next Step',
    sections: [
      {
        id: 'problem',
        title: 'One screen, two very different driving contexts',
        body: [
          'The four-week Pune study compared private drivers with people who drive for work. It reports 34 surveys and 13 interviews, with commercial-driver interviews conducted in person and private-driver interviews by video.',
          'The research found different coping strategies: commercial drivers often relied on phones, while private drivers described continued screen use alongside wrong taps and interrupted tasks.'
        ],
        limitation: 'These are findings from a small, single-city, largely self-reported study. They are not population estimates or measured crash-risk results.'
      },
      {
        id: 'decisions',
        title: 'Make work wait for the road',
        body: [
          'Workplace Mode proposes a work layer for taxi and fleet drivers above shared navigation and attention rules. Navigation stays visible while ride information can be spoken, shown, queued or deferred.',
          'Four proposed states organise the experience: Parked, Calm, Busy and Critical. More demanding road conditions reduce the interactions offered to the driver.'
        ]
      },
      {
        id: 'evidence',
        title: 'Distinguish “pressed” from “completed”',
        body: [
          'Reports of lag informed a two-stage acknowledgement: first confirm that the press was registered, then confirm when the service completes the action.',
          'The concept also separates held work requests from lost ones. That distinction depends on a ride platform actually supporting deferral; without it, the interface must explain that a request may expire.'
        ],
        evidence: 'The source connects interview themes to the acknowledgement behaviour, attention states and ride-request scenario.',
        limitation: 'The source explicitly states that these screens have not been validated with drivers. Platform integration and request deferral are dependencies, not delivered capabilities.'
      },
      {
        id: 'reflection',
        title: 'A direction to test, not a safety result',
        body: [
          'The proposed next step is a clickable ride-request flow tested in a parked car, followed by evaluation of the shared rules with private drivers.',
          'The case study proposes comparing acceptance time and visual attention with the existing phone workflow. No improvement is claimed before that evaluation.'
        ]
      }
    ]
  }
];


// Preserve the detailed source cases used by the separate normal portfolio.
// Garden readers use the concise, independently exported overviews below.
export const PROJECTS=SOURCE_PROJECTS.map(project=>{
  const shared={...project,caseStudyUrl:null};
  if(project.id==='connectaid'){
    shared.role=null;
    shared.contributionNote='Five-person collaborative project. Individual responsibilities are being confirmed.';
    shared.sections=project.sections.map(section=>{
      if(section.id==='evidence')return {...section,body:[
        'Six moderated, in-person usability sessions covered eleven scenario tasks. The documented findings include overlooked bottom navigation, difficulty finding specialisations and tests, date-of-birth friction and cart placement.',
        'The later case presentation shows refinements to these issues. The confirmed five-person group scope ends at usability testing; later small refinements are not attributed to that group here.'
      ]};
      if(section.id==='reflection')return {...section,body:[
        'A meaningful next check is whether revised routes improve task success and time on task in a comparable study.',
        'The five-person group worked through research, prototyping and usability testing. Later small refinements sit outside that confirmed group scope.'
      ]};
      return section;
    });
  }
  if(project.id==='giggles'){
    shared.role='Electronics, embedded/system logic and functional prototyping; interface review, selection and direction. UI screen design by teammates.';
    shared.timeline='6-week course project; later testing';
  }
  return shared;
});

const GARDEN_OVERVIEWS={
  "pixel-mania": {
    "sections": [
      {
        "id": "focus",
        "title": "The focus",
        "body": [
          "How much structure helps someone start creating without deciding what they should make? Pixel Mania explores that balance through one repeating component and a five-colour click cycle."
        ]
      },
      {
        "id": "direction",
        "title": "The direction",
        "body": [
          "A Figma flow and assisted browser exploration use the same component rules. The documented exhibition shows people drawing, writing and inventing games on the board."
        ],
        "limitation": "Exhibition feedback was informal. Commercial adoption and formal usability improvement have not been established."
      }
    ]
  },
  "syringe": {
    "sections": [
      {
        "id": "focus",
        "title": "The focus",
        "body": [
          "Understand how syringe geometry affects holding, thumb reach and plunger control. Grip and the force needed to push the plunger were treated as separate constraints."
        ]
      },
      {
        "id": "direction",
        "title": "The direction",
        "body": [
          "The concept combines butterfly finger flanges, a concave thumb rest and transparent barrel ridges, preserving visibility while exploring a more secure grip."
        ],
        "limitation": "This is a redesign concept. Clinical performance, force reduction and benefit across hand sizes remain unvalidated."
      }
    ]
  },
  "connectaid": {
    "sections": [
      {
        "id": "focus",
        "title": "The focus",
        "body": [
          "Make a connected healthcare service easier to navigate for people with different levels of technical confidence and different language needs."
        ]
      },
      {
        "id": "direction",
        "title": "The direction",
        "body": [
          "The prototype connects service discovery, patient context and health records. Six documented moderated sessions informed navigation, search and input recommendations."
        ],
        "limitation": "The confirmed group scope ends at usability testing. Later refined artwork is not attributed to that group; no clinical or business impact is claimed."
      }
    ],
    "contributionNote": "Five-person collaborative project. Individual responsibilities are being confirmed."
  },
  "giggles": {
    "sections": [
      {
        "id": "focus",
        "title": "The focus",
        "body": [
          "Make a child’s attempts and support needs visible alongside the final answer, while keeping the child-facing interaction tangible."
        ]
      },
      {
        "id": "direction",
        "title": "The direction",
        "body": [
          "The working prototype connects ESP32, RFID cards, Circle/Square controls and a local phone interface. Teacher-facilitated testing involved one adult aged 24 and three children aged 8–10, all independent readers. Eight pain points and ten strengths inform the proposed next version."
        ],
        "limitation": "One visit with four participants does not establish learning gains or retention. Classroom fixes remain proposed; persistent teacher records, analytics and AI were not connected to the prototype."
      }
    ],
    "timeline": "6-week course project; later testing"
  },
  "workplace-mode": {
    "sections": [
      {
        "id": "focus",
        "title": "The focus",
        "body": [
          "What changes when a car is also someone’s workplace? The documented Pune study combines 34 surveys and 13 interviews across private and commercial driving contexts."
        ]
      },
      {
        "id": "direction",
        "title": "The direction",
        "body": [
          "The concept keeps navigation visible and proposes Parked, Calm, Busy and Critical attention states. Ride information can be presented, queued or deferred according to context."
        ],
        "limitation": "The screens have not been validated with drivers. Platform integration and request deferral remain dependencies; no safety improvement is claimed."
      }
    ]
  }
};

export const GARDEN_PROJECTS=[...PROJECTS.map(project=>({...project,...GARDEN_OVERVIEWS[project.id]})),{
  "id": "portfolio-world",
  "title": "How this portfolio was made",
  "subtitle": "A personal garden, built one layer at a time.",
  "status": "Self-initiated project · In progress",
  "summary": "The decisions behind the bicycle garden: personal memories, two ways to explore, a winding route and readable work.",
  "role": "Portfolio concept, creative direction and design decisions by Lakshya; AI-assisted implementation and testing.",
  "available": true,
  "secondary": true,
  "nativeProcess": true,
  "caseStudyUrl": null,
  "sourceLabel": "Source: the working portfolio, Lakshya’s review direction and local implementation/test records. This is an ongoing project, not a published outcome study.",
  "sections": [
    {
      "id": "personal",
      "title": "Begin with something personal",
      "body": [
        "Lakshya wanted the play mode to reflect the person behind the work. Pokemon was a favourite childhood series; Toy Story was a favourite film, and Woody a character he especially liked. Cycling, singing, meeting people and photographing clouds give the garden its subjects.",
        "Pokemon GO kept that childhood wish alive, and Lakshya still plays. His own collection screenshots, cloud photographs, singing recordings and Garba photographs now give those interests a place in the garden."
      ]
    },
    {
      "id": "structure",
      "title": "Make room for exploration and reading",
      "body": [
        "Early ideas put too many destinations in one view. Lakshya’s feedback pushed the design toward a following camera, a winding route, larger rider proportions and breathing space between landmarks.",
        "The portfolio has two modes. Desktop visitors can explore the garden; the normal portfolio provides a direct reading route. Project stops contain concise overviews. Full case studies open the corresponding Normal portfolio page in a new tab, leaving the garden available to return to. For the best garden experience, use a computer or laptop."
      ],
      "evidence": "The original winding route, one expandable Works gallery, an independent project room, readable HTML overviews and the normal-mode switch are the working artifacts of this decision."
    },
    {
      "id": "movement",
      "title": "Refine what the visitor actually feels",
      "body": [
        "Movement was developed in layers: the map, bicycle proportions, bridge clearance, riding feedback, pedalling, foot-down stops and head glances. Mouse-click riding needed its own turn-speed correction after keyboard improvements did not solve the reported problem.",
        "Wayfinding follows actual destinations. The first stop introduces Lakshya. Works follows, then Hobbies, Professor Oak’s lab and The Viewfinder. Destinations change places within the original pockets; the road geometry stays intact. Visitors can also open any destination directly."
      ],
      "limitation": "These iterations respond to Lakshya’s reviews and local checks. They are not presented as a completed recruiter usability study."
    },
    {
      "id": "resources",
      "title": "Spend detail where it matters",
      "body": [
        "The scene reuses geometry, materials and model resources, loads optional inhabitants near the visitor and reduces distant animation work. Adaptive rendering limits pixel and shadow cost. Reading panels pause the ordinary world updates.",
        "The collection uses the existing garden and a controlled camera view. Personal stories remain readable HTML, while supplied media can load on demand. A larger collection does not require every entry to become an animated 3D model."
      ],
      "evidence": "A recorded local riding sample had a 17.0 ms p95 frame interval and a 66.6 ms maximum at 873 × 884, DPR 1, full graphics. That is a baseline observation, not a benchmark for every device or the finished collection.",
      "limitation": "Broader device testing and visitor feedback will guide further refinement."
    },
    {
      "id": "credits",
      "title": "Keep the authorship visible",
      "body": [
        "Lakshya directs the portfolio and reviews the design. He works with ChatGPT on implementation and code checks. Bruno Simon’s portfolio informed exploration through movement; the bicycle and personal interests shaped this world. Three.js renders the world; imported character, bridge and nature models retain their individual creator and licence records.",
        "The portfolio is still being developed. The remaining work includes real media, supplied external case-study links and further navigation/performance review."
      ],
      "links": [
        {
          "label": "Pokemon model credits",
          "href": "./pokemon-credits.html"
        },
        {
          "label": "Asset and implementation credits",
          "href": "./story.html#credits"
        }
      ]
    }
  ]
}];
export const PRIMARY_PROJECTS=GARDEN_PROJECTS.filter(project=>!project.secondary);
