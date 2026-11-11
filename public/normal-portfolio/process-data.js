// Project-specific reading sequences, based on case-content-map.md.
// These are not a claim that every activity followed one fixed framework.
export const PROJECT_PROCESS = {
  'pixel-mania': {
    steps: [
      ['Start with one square', 'Use pixel-game inspiration to define the grid and a five-colour click sequence.'],
      ['Design and prototype in Figma', 'Define tokens, components, motion and the complete five-scene journey.'],
      ['Explore a browser build', 'Use AI-assisted vibe coding, then review behaviour and timing against the design.'],
      ['Observe exhibition use', 'Document visitors’ creations and informal written feedback on the iPad experience.'],
      ['Identify the next iteration', 'Explore faster touch painting and saving a creation; these remain proposals.'],
    ],
    tools: [['Figma', 'Original visual-system rules, reusable components, illustration and animation assets, the five-scene prototype and Pixel Pedia concept.'], ['AI-assisted vibe coding', 'Co-create a browser exploration, review its states against the design and refine the loading interval.'], ['Exhibition observation', 'Observe iPad use and review informal written comments; no structured task-success study.']],
  },
  syringe: {
    steps: [
      ['Investigate use and fit', 'Combine literature, practitioner questionnaire and observational exposure assessment.'],
      ['Audit the dimensions', 'Separate hand-contact geometry from the force required to move the plunger.'],
      ['Compare form directions', 'Explore component changes alongside a more extensive palmar-wing concept.'],
      ['Choose the form', 'Select the butterfly flange, thumb rest, transparent ridges and dose markings.'],
      ['Compare pilot impressions', 'Compare nurses’ ratings of 21 attributes; force and task accuracy need further testing.'],
      ['Measure task performance', 'Measure force, posture and dose-setting across hand sizes.', true],
    ],
    tools: [['Dimensional audit', 'Measured geometry and anthropometric references inform the redesign.'], ['3D modelling by my teammate + shared 3D printing', 'My teammate created the Maya model from the selected concept. We worked on the printed prototype together.']],
  },
  connectaid: {
    steps: [
      ['Research and findings', 'Interviews, a survey, a four-app review and grouped notes established the care priorities.'],
      ['Adapted five-day sprint', 'Frame, sketch, storyboard, prototype and prepare for testing. The sprint was one part of the wider project.'],
      ['Design, test and refine', 'Build and review screens, run six remote usability sessions and make six prototype refinements.'],
    ],
    tools: [['Figma', 'I built the core design system: tokens, reusable components and interaction states used across shared screens.'], ['FigJam, Miro + Google Forms', 'Collecting, organising and synthesising the research with the team.'], ['Remote usability study', 'Six participants worked through eleven tasks; the team used their feedback to make six prototype changes.']],
    visuals: [
      {src:'assets/process/connectaid-storyboards.png',width:379,height:490,alt:'Original ConnectAid storyboard overview with sketched home, language, profile, lab, medicine and appointment flows.',caption:'Original storyboard overview. This small source is kept at its native display size.',note:'The team sketched connected service flows before presenting the high-fidelity interface.',compact:true},
      {src:'assets/process/connectaid-home.png',width:440,height:850,alt:'Pre-refinement ConnectAid home prototype with consultation, medicines and lab-test entry points.',caption:'Pre-refinement prototype: Home as the service hub. Sample offers are interface content, not a live service.',note:'Consultation, medicines and tests share one starting point. This version belongs to the documented pre-refinement scope.',phone:true},
      {src:'assets/process/connectaid-findings.png',width:1221,height:733,alt:'Original usability synthesis notes describe date input, overlooked bottom navigation, search, cart and lab-booking difficulties.',caption:'Original synthesis from the documented usability study. This is feedback, not measured improvement.',note:'The observations include difficult date entry, overlooked bottom navigation, search problems and repeated clicks while a side panel loaded.'},
    ],
  },
  giggles: {
    steps: [
      ['Define the learning activity', 'Pair hands-on practice with an educator’s need to understand the attempts and help behind an answer.'],
      ['Explore with SCAMPER', 'Compare emotion tokens, routine sequencing and situation–emotion–response play.'],
      ['Build the working game', 'Connect the controller, card reader, shape buttons, lights and phone interface.'],
      ['Try teacher-facilitated play', 'One adult played individually; three children aged 8–10 played a group game at Vishwansh Foundation.'],
      ['Use the findings', 'Document eight pain points, ten strengths and proposed changes for the next prototype.'],
      ['Evaluate the next version', 'Retest over several sessions, then connect persistent records and the proposed Teacher App.', true],
    ],
    note: 'The final documentation records a first teacher-facilitated field trial. The classroom fixes and connected teacher system remain proposed.',
    tools: [['SCAMPER', 'Explore tangible objects, familiar scenarios, progression and a simpler child-facing interaction.'], ['ESP32 + Arduino C++ + RFID', 'I built the electronics, embedded response logic and functional prototype.'], ['Physical controls and local phone feedback', 'RFID cards, shape buttons, LEDs and local Wi-Fi connect physical play with phone feedback. Teammates designed the UI screens.'], ['Teacher-facilitated field testing', 'Explain the activity to teachers first, then observe one individual and one three-player session with their support.']],
  },
  'workplace-mode': {
    steps: [
      ['Read the original study', 'Keep the paper, handoff and original affinity artifact distinct.'],
      ['Challenge with external evidence', 'Use original studies and official guidance to test easy assumptions.'],
      ['Make the reasoning traceable', 'Connect reported themes to interpretations, requirements and unanswered questions.'],
      ['Explore before selecting', 'Compare eight directions against evidence, resources and failure behaviour.'],
      ['Build a fair comparison', 'Two feedback approaches share the audio/navigation task, shortcuts and simulated response states.'],
      ['Evaluate with intended drivers', 'Inspect the real baseline, collect formative observations and revise; this has not been conducted.', true],
    ],
    tools: [['Google Forms · original study', 'Adapted questionnaires captured reported HMI experiences, agreement responses and open-ended material.'], ['Original affinity artifact', 'Preserved project synthesis. Its seven clusters and the paper’s four themes remain separately attributed.'], ['5W1H + branching Five Whys · new analysis', 'Narrow the task and stop causal chains at missing evidence.'], ['Job stories + provisional HTA · new analysis', 'Separate desired outcomes, task goals and conditional plans from unobserved click paths.'], ['Opportunity and assumption mapping · new analysis', 'Link each mechanism to a requirement and a test that could reject it.'], ['Concept selection + failure-mode review · new analysis', 'Apply hard gates before weighted trade-offs; examine unknown, stale and unintended states.'], ['HTML, CSS, JavaScript + editable SVG · new prototype', 'A deterministic desktop wireframe and source-grounded diagrams. No car, live navigation or provider is connected.']],
  },
};
