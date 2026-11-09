// Additions to the existing six capability panels, sourced from resume-content.json.
// The core panel methods and logo rows stay in toolkit.js. Each selected panel
// exposes the complete merged list without another disclosure control.
// Capability coverage is self-reported; it does not attribute every item to every case.
export const RESUME_TOOLKIT_ADDITIONS = {
  research: {
    methods: [
      'User Interviews',
      'Contextual Inquiry',
      'Survey Design',
      'Research Synthesis',
      'Competitive Analysis',
      'Persona Creation',
      'Heuristic Evaluation',
      'NASA-TLX',
    ],
    tools: ['Google Forms'],
  },
  experience: {
    methods: [
      'User-Centered Design',
      'User Interface Design',
      'User Flows',
      'Design Iteration',
      'Data Portal Design',
      'Wireframing',
      'Interactive Prototypes',
      'High-Fidelity Screens',
      'Infographics',
      'Illustrations',
      'Animations',
    ],
    tools: ['ProtoPie', 'Illustrator', 'Photoshop', 'Figma Make'],
  },
  systems: {
    methods: ['Design Systems', 'Analytical Thinking'],
    tools: [],
  },
  collaboration: {
    methods: [
      'Cross-Functional Collaboration',
      'Stakeholder Communication',
      'Planning & Organising',
      'Leadership',
      'High-Pressure Resilience',
      'Design Handoff',
    ],
    tools: ['Maya', '3D printing', 'Arduino C++', 'ESP32', 'RFID (MFRC522)'],
    note: 'My electronics background also supports physical prototyping: electronics and game logic for Giggles, and joint modelling and 3D printing for the syringe project.',
  },
  code: {
    methods: [],
    tools: ['GitHub Copilot', 'Antigravity'],
    note: 'I use AI support to build and revise working prototypes, then review the behaviour against the design intent.',
  },
  ai: {
    methods: [],
    tools: [
      'Figma Make',
      'GitHub Copilot',
      'Midjourney',
      'Perplexity',
      'NotebookLM (Google)',
      'Antigravity',
      'Google Search (AI Mode)',
      'LLM Arena',
    ],
    note: 'Different tools support different tasks. I review their output; this list describes use, not a proficiency ranking.',
  },
};
