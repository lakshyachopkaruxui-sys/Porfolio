import {PIXEL_MANIA_STORY} from './pixel-mania-evidence.js?v=20261109-evidence-pass';
// Expanded normal-mode narratives. Original source locators, superseded claims
// and image provenance are recorded in case-expansion-audit.md and assets/cases/SOURCE.json.
// Reading times are editorial estimates, not measured reader behavior.
import {enrichConnectAidStory} from './connectaid-evidence.js?v=20261109-evidence-pass';
import {enrichSyringeStory} from './syringe-evidence.js?v=20261109-evidence-pass';
import {enrichGigglesStory} from './giggles-evidence.js?v=20261109-evidence-pass';
import {GIGGLES_BUILD_PHOTOS, GIGGLES_FIELD_VISIT} from './giggles-photo-data.js?v=20261105-final-documentation';
import {GIGGLES_COMPONENT_REFERENCES} from './assets/cases/giggles/components/component-data.js';
import {WORKPLACE_STORY} from './workplace-mode-evidence.js?v=20261109-evidence-pass';
const figure = (file, width, height, alt, caption, extra = {}) => ({
  src: `assets/cases/${file}`, width, height, alt, caption, ...extra,
});

export const CASE_STORIES = {
  'pixel-mania': PIXEL_MANIA_STORY,

  syringe: {
    intro: 'A human-factors redesign of the 20 cc syringe, developed through practitioner research, dimensional analysis and form exploration. I led the two-person concept work and worked on the printed prototype with my teammate, who created the Maya model.',
    readingTime: 7,
    sections: [
      {
        id: 'challenge', title: 'Grip, reach and scale readability',
        body: [
          'A syringe asks the hand to stabilize the barrel, reach the plunger and control its movement. The study examined how the geometry of a 20 cc syringe fits the hands and working conditions of Indian healthcare practitioners.',
          'The design question was specific: could the finger flange, thumb rest, barrel grip and scale offer more purchase and clearer reading? A more comfortable-looking shape would not be enough. Grip security, actuation effort and dose control needed to remain separate questions.',
          'The project compared several syringe sizes before focusing the form exploration on 20 cc. It remained a research and redesign project, rather than a clinically validated medical device.',
        ],
      },
      {
        id: 'research', title: 'Practitioner research and dimensional analysis',
        body: [
          'We combined literature review, a practitioner questionnaire, an observational exposure assessment, published anthropometric references and a digital-calliper audit. Each method addressed a different part of the problem: discomfort described by practitioners, posture during use, the range of hand dimensions and the geometry of existing devices.',
          'The dimensional analysis also required care about accommodation. A contact surface or clearance must include larger fingers, while a reach or span must remain usable for smaller hands. Revisiting those assumptions changed which dimensions still needed work.',
          'The exposure assessment was an exploratory team estimate, and the study did not measure primary actuation force. These methods helped frame constraints; they did not establish a reduction in injury or the effort needed to deliver fluid.',
        ],
        points: [
          {title: 'Practitioner experience', body: 'Separate slipping, pressure and effort complaints instead of treating discomfort as one issue.'},
          {title: 'Hand accommodation', body: 'Check contact area and reach against different ends of the hand-size range.'},
          {title: 'Dimensional audit', body: 'Compare the existing geometry with the requirements before choosing a form.'},
        ],
      },
      {
        id: 'alternatives', title: 'Flange, grip and scale alternatives',
        body: [
          'One track developed the individual interfaces: thumb-rest shape, finger-flange profile, grip texture and graduations. Another explored a broader whole-form direction, including a palm-support wing and a wrapped scale.',
          'The convergence kept the butterfly flange for contact around the barrel without taking on the larger wing’s complexity. Transparent ribs addressed a different trade-off: adding grip texture without concealing the fluid. The final concept combines decisions from these explorations rather than simply enlarging every part.',
        ],
        figures: [
          figure('syringe/component-alternatives.png', 1900, 698, 'Original sketches explore thumb rests, flange profiles and barrel-contact changes.', 'Component-level alternatives from the original research paper, Figure 4.'),
          figure('syringe/whole-form-alternatives.png', 1900, 793, 'Original whole-form sketches show a broad palm wing, transparent ribs, wrapped scale and concave flange.', 'Whole-form alternatives, Figure 5. The palm-wing direction informed the comparison but was not retained as the final form.'),
        ],
      },
      {
        id: 'decisions', title: 'Flange, thumb support, ribs and scale',
        body: [
          'The selected concept gives the finger and thumb distinct places to bear against the tool. It also considers what the practitioner needs to see while holding it. These are intended ergonomic responses, not a claim that the final dimensions already satisfy every requirement.',
        ],
        points: [
          {title: 'Butterfly flange', body: 'A lobed profile offers finger contact in several radial directions instead of requiring one exact barrel orientation.'},
          {title: 'Concave thumb support', body: 'An inward seat aims to distribute contact around the thumb pad rather than relying on a flat edge.'},
          {title: 'Transparent ribs', body: 'Texture adds a proposed grip aid while keeping the contents visible.'},
          {title: 'A readable scale', body: 'Full rings identify major scale marks, with shorter minor marks to create hierarchy without crowding.'},
        ],
        figures: [figure('syringe/final-sketch.png', 1280, 915, 'Final syringe concept sketch with a butterfly flange in top view and side-view thumb support.', 'The selected concept in side and top views, Figure 6. The drawing communicates form, not validated performance.')],
      },
      {
        id: 'prototype', title: 'Maya model and 3D-printed prototype',
        body: [
          'My teammate created the Maya model from the selected concept; we worked on the 3D-printed prototype together. The model made it possible to examine the relationship between the barrel, flange, thumb rest and scale as one object, rather than as separate sketches.',
          'The render views communicate the proposed contact surfaces and the visual hierarchy of the barrel. A printed form also gave us something physical to explain at Meraki. It does not, by itself, establish the force, posture or accuracy of use in a clinical task.',
        ],
        figures: [
          figure('syringe/maya-views.png', 1900, 649, 'Maya concept renders show the redesigned syringe barrel, flange and thumb support from several views.', 'Original digital-realisation views, Figure 7. These are concept renders; photographs of the print can be added separately.'),
          figure('syringe/contact-details.png', 1900, 557, 'Rendered detail views of the syringe’s thumb support and butterfly flange.', 'Contact-surface detail, Figure 8. The thumb rest and flange still need dimensional and task-based evaluation.'),
        ],
      },
      {
        id: 'tradeoffs', title: 'Unresolved dimensions and plunger effort',
        body: [
          'The audit left useful constraints unresolved. Some modeled finger-contact and rib dimensions fell short of revised accommodation requirements, the thumb rest still needed resizing, and the working stroke had not been shortened.',
          'That matters because better purchase does not automatically solve plunger effort. A passive change to the contact geometry cannot be treated as proof of a force reduction. It also introduces questions about finger clearance, rotation and reading the wrapped scale.',
        ],
        comparison: {before: 'The original geometry provided the baseline for grip, reach, scale reading and plunger movement.', after: 'The concept changes contact surfaces and scale hierarchy, while retaining unresolved reach, force and dimension requirements.', note: 'The comparison describes design intent and audit findings. It does not establish ergonomic compliance or clinical superiority.'},
      },
      {
        id: 'evaluation', title: 'Subjective ratings and their limits',
        body: [
          'Across 21 Kansei attributes, nurses rated the redesign 5.62/10 on average, compared with 4.14 for the existing syringe. Those are reported subjective impressions, not a measured reduction in risk or physical effort.',
          'Effort ratings were unchanged, and perceived dose accuracy scored lower. The aggregate score therefore cannot stand in for the questions that matter most during use. The rater count, rating order and the exact prototype form used in that exercise remain unspecified.',
          'The physical prototype shown at Meraki and the artifact used for the rating exercise should not be assumed to be the same without that link being documented.',
        ],
      },
      {
        id: 'reflection', title: 'Jury feedback and planned task evaluation',
        figures: [{src: '../bicycle-world/assets/personal/stories/syringe-redesign-at-meraki.webp', width: 1600, height: 1200, personal: true, alt: 'Lakshya beside his syringe redesign display at Meraki.', caption: 'Presenting the syringe redesign at Meraki. Photo from my project presentation.'}],
        body: [
          'We presented the project and 3D-printed prototype at Meraki. Jury feedback was positive about the depth of the work and our explanation of the design. That was presentation feedback, distinct from clinical or ergonomic validation.',
          'The redesign was also shortlisted after the first review round for research-paper presentation at HWWE 2026. The December 2026 event is still ahead at the time of this case update, and publication remains subject to jury review.',
          'The next evaluation should compare actuation force, posture, grip slip and dose-setting accuracy across hand sizes and viewing angles. The lower dose-accuracy impression makes scale reading especially important. I would revise the unresolved dimensions before using any overall preference score as a reason to progress the design.',
        ],
      },
    ],
  },

  connectaid: {
    intro: 'A patient-facing healthcare prototype connecting consultations, medicines, tests and records. In an eight-week, five-person project, I built the core Figma design system and coordinated remote usability testing while contributing to the team’s research and design work.',
    readingTime: 7,
    sections: [
      {
        id: 'challenge', title: 'Consultations, medicines, tests and records',
        body: [
          'The brief asked how telemedicine could become more comfortable for people with different levels of technical confidence and language needs. A consultation flow alone would not address the surrounding work: choosing care, arranging tests, obtaining medicines and returning with records.',
          'ConnectAid therefore treats care as a continuing journey. Online consultations sit alongside in-clinic and lab options, responding to concerns about relying entirely on virtual care. The result is an interactive prototype of a service experience, not a deployed healthcare provider.',
        ],
        flow: {label: 'The care journey used to frame the prototype', steps: [
          {title: 'Find care', body: 'Choose a service and a relevant practitioner.'},
          {title: 'Consult', body: 'Confirm the person, context and appointment.'},
          {title: 'Continue treatment', body: 'Find medicines and arrange recommended tests.'},
          {title: 'Bring the history forward', body: 'Keep records available for a later consultation.'},
        ]},
      },
      {
        id: 'research', title: 'Trust, family involvement and language',
        body: [
          'The team combined interviews, questionnaire responses, competitor review and synthesis. I documented five interviews. The inquiry considered how people seek help, decide whom to trust, involve family and manage healthcare tasks around the rest of their lives.',
          'The useful themes were broader than familiarity with an app. Known practitioners and recommendations mattered. People could be comfortable with a familiar remote-care arrangement without thinking of it as telemedicine. Language choice also needed to remain available throughout a journey, not disappear after onboarding.',
          'Personas and a journey map helped the team discuss these needs. They are synthesized design artifacts, not biographies of participants or a record of someone receiving care through ConnectAid.',
        ],
        points: [
          {title: 'Trust and choice', body: 'Keep practitioner and service context visible before the user commits.'},
          {title: 'Continuity', body: 'Connect appointments, tests, medicines and records rather than presenting unrelated transactions.'},
          {title: 'Language confidence', body: 'Let people return to a language choice after the first-run experience.'},
        ],
      },
      {
        id: 'alternatives', title: 'Team sketches and service-flow alternatives',
        body: [
          'HMW questions and feature comparisons helped narrow a broad healthcare brief. Crazy 8s, critique and storyboards then gave the group several routes to discuss, including Home, booking, language switching and lab-related tasks.',
          'The sketches and storyboards gave the team alternatives to discuss before refining the connected service flows. They do not establish that every alternative was built or comparatively tested.',
        ],
        figures: [figure('connectaid/crazy-eights.png', 660, 362, 'Selected team Crazy 8s sketches for home, booking, language, feedback and lab-related tasks.', 'Selected team sketch alternatives. The source overview is shown at its native scale rather than enlarged into a claim of detailed usability evidence.', {compact: true})],
      },
      {
        id: 'system', title: 'The shared Figma component system',
        body: [
          'I built the core Figma design system used by the team: design tokens, reusable components and interaction states. The aim was consistent behavior across screens being designed together, not simply a matching colour palette.',
          'Home became a hub for the connected services, while Records carried information forward. Shared controls and service patterns helped the team work across the prototype without treating each flow as a separate visual product.',
        ],
        figures: [
          figure('connectaid/home-en.png', 440, 850, 'English ConnectAid Home prototype with consultation, medicines, lab tests and bottom navigation.', 'Home as the service hub in the earlier prototype. Offers shown in the interface are sample content, not live services.', {phone: true}),
          figure('connectaid/home-hi.png', 440, 850, 'Hindi variant of the ConnectAid Home prototype, retaining the same service hierarchy.', 'A Hindi variant keeps the same service structure. This demonstrates designed language states, not independently verified coverage of every screen.', {phone: true}),
        ],
      },
      {
        id: 'flow', title: 'Patient selection and care records',
        body: [
          'Booking care for another person changes what a confirmation means. The consultation review makes the selected patient and relationship explicit before payment, rather than assuming the account holder is always the patient.',
          'Records gives the continuing journey a place to live. Its categories connect prescriptions, reports, medicines and consultation notes to the same care context. Together, these decisions make the prototype about an ongoing relationship with care rather than one isolated booking.',
        ],
        figures: [
          figure('connectaid/patient-selection.png', 360, 800, 'Consultation review showing a selected dependent, relationship, appointment and payment summary.', 'Patient context before confirmation. Names, practitioner profiles, ratings and prices are prototype content.', {phone: true}),
          figure('connectaid/records.png', 440, 850, 'ConnectAid Records prototype showing prescriptions, reports, medications and consultation-note categories.', 'Records preserves the care-history concept across services. This is interface artwork, not a connected medical-record system.', {phone: true}),
        ],
      },
      {
        id: 'testing', title: 'Remote testing: six participants, eleven tasks',
        body: [
          'I coordinated remote usability testing with six participants across eleven scenario tasks. The team recorded nine findings. The sessions examined routes through the prototype rather than asking people whether they liked the screens.',
          'Friction appeared around finding specialisations and tests, noticing bottom navigation, entering a date of birth, locating the cart and understanding side-panel loading. These details showed where the structure we had designed did not match the route a participant expected.',
          'The sample and task counts describe the study’s scope. They are not task-success percentages, and the project does not claim that every intended audience group was represented.',
        ],
        figures: [figure('connectaid/test-findings.png', 1221, 733, 'Original usability synthesis notes about date input, navigation, specialty search, cart location and lab-booking friction.', 'Original usability synthesis. The notes show observed problems; they are not measurements of improvement.')],
      },
      {
        id: 'iteration', title: 'Adding specialty search alongside categories',
        body: [
          'The team made six prototype changes from the feedback. One important example was specialty search: category browsing stayed in the design, while a search route was added after participants tried to find a specialist that way.',
          'Other refinements addressed navigation emphasis, test discovery, date input, cart placement and side-panel content. The point was to respond to a specific obstacle rather than treat every finding as a request to redesign the whole app.',
        ],
        comparison: {before: 'The prototype offered category browsing, but participants also tried to search by specialty.', after: 'The team retained category browsing and added specialty search as another route.', note: 'The refinements still need a comparable second usability round before claiming improved performance.'},
      },
      {
        id: 'reflection', title: 'Revised flows and the next usability round',
        body: [
          'The project produced a shared design system, connected high-fidelity flows, usability findings and team refinements. My contribution combined core system work with research participation and test coordination within the five-person team.',
          'The next meaningful check is a comparable study of the revised routes: can people find the service, keep the correct patient context and understand what happened after an action? Success, time and errors would need to be recorded consistently before claiming the revisions worked better.',
          'I would also examine the breadth of the service against the clarity of each step. Connecting more parts of care can be useful, but only if the interface makes those connections understandable. This prototype does not establish adoption, clinical impact, production accessibility or operational healthcare delivery.',
        ],
      },
    ],
  },

  // The final-document module owns Giggles. This separately verified photograph
  // supplies the award evidence without retaining a second, stale narrative.
  giggles: {
    sections: [{id: 'reflection', figures: [{
      src: '../bicycle-world/assets/personal/stories/giggles-best-project-meraki.webp',
      width: 1600, height: 1200, personal: true,
      alt: 'Lakshya holding the Giggles certificate and award in front of the Meraki project display.',
      caption: 'Giggles received Best Project at Meraki, our pre-grad show.',
    }]}],
  },
  'workplace-mode': WORKPLACE_STORY,
};

CASE_STORIES.connectaid = enrichConnectAidStory(CASE_STORIES.connectaid);
CASE_STORIES.syringe = enrichSyringeStory(CASE_STORIES.syringe);
CASE_STORIES.giggles = enrichGigglesStory(CASE_STORIES.giggles, {
  fieldVisit: GIGGLES_FIELD_VISIT,
  buildPhotos: GIGGLES_BUILD_PHOTOS,
  components: GIGGLES_COMPONENT_REFERENCES.map(item => ({...item.visual, sourcePage: item.sourcePage})),
});
